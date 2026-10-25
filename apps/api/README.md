# @rank11/api — multiplayer-backend

Cloudflare Worker + D1 + Durable Objects, in TypeScript. **Server-authoritative:** clients sturen
alleen intenties. Alle spelregels (battle, ranglijst, schema, beloningen, packs, cijfers) komen uit
`@rank11/engine`.

> **Status (25-10-2026):** GEBOUWD + OFFLINE GETEST (Vitest, D1-shim) + lokaal gecontroleerd met
> `wrangler dev --local` (miniflare/workerd). **Niet uitgerold.** Er is geen Cloudflare-account,
> database of Worker aangemaakt. Alleen synthetische testgegevens.

## Draaien en testen

```bash
npm install                      # in de root (npm workspaces)
npm test -w apps/api             # Vitest: D1-shim op node:sqlite + in-memory Durable Objects
npm run typecheck -w apps/api    # src (workers-types) én tests (workers-types + node)
```

Lokaal draaien met miniflare (geen account nodig):

```bash
cd apps/api
npx wrangler d1 migrations apply DB --local --env dev    # lokale SQLite in .wrangler/ (gitignored)
node scripts/platform-invite.mjs 5 72                    # print een code + SQL (alleen de hash wordt opgeslagen)
npx wrangler d1 execute DB --local --env dev --command "<SQL uit de vorige stap>"
npx wrangler dev --local --env dev                       # http://127.0.0.1:8787
node scripts/smoke.mjs http://127.0.0.1:8787 <CODE>      # rooktest met twee accounts
```

**Rooktest 25-10-2026 (gedraaid, geslaagd)** tegen `wrangler dev --local` (wrangler 4.152.0, workerd
1.20261019.1), met PBKDF2 op 100.000 iteraties:
registratie A (platformcode) → pool + uitnodiging → registratie B (poolcode) → login B →
startelftallen → uitdaging + accepteren → één zet via **WebSocket** (broadcast ontvangen) → rest via
REST → uitslag in D1 → eventlog opgehaald (23 events) → ranglijst → cijfer met beloning +
idempotente herhaling. Daarnaast: een live-wedstrijd zonder zetten werd na 150 s (5 × 30 s) door
**DO-alarmen alleen** afgerond met reglementair verlies (gecontroleerd via een endpoint dat alleen D1 leest).

## Endpoints (REST, JSON)

Authenticatie: `Authorization: Bearer <token>` of het httpOnly-cookie `rank11_session` (optioneel:
`"cookie": true` bij registreren/inloggen). Muterende verzoeken met cookie moeten van een origin op
`ALLOWED_ORIGINS` komen (CSRF). Muterende endpoints accepteren `Idempotency-Key`; **verplicht** waar
aangegeven (✱).

| Methode | Pad | Wat |
|---|---|---|
| GET | `/api/health` | Status |
| POST | `/api/auth/register` | `{username, password, inviteCode, cookie?}` — poolcode (direct lid) of platformcode |
| POST | `/api/auth/login` | `{username, password, cookie?}` — generieke fout, rate limit |
| POST | `/api/auth/logout` | Sessie verwijderen |
| GET | `/api/me` | Eigen account |
| POST | `/api/admin/platform-invites` | Alleen `platform_admin` (anderen 404) |
| GET/PUT | `/api/club` | `{name, short, crest:{shape,symbol,pattern,primary,secondary,accent}}` |
| GET/POST | `/api/pools` | Eigen pools / aanmaken `{name, maxMembers?}` (standaard 20) |
| POST | `/api/pools/join` | `{code}` |
| GET | `/api/pools/:poolId` | Niet-lid: 404 |
| GET | `/api/pools/:poolId/members` | Leden met rol en club |
| PATCH | `/api/pools/:poolId/members/:userId` | `{role: admin\|member}` (beheerder; laatste beheerder blijft) |
| POST | `/api/pools/:poolId/invites` | `{expiresInHours?, maxUses?}` → code éénmalig getoond |
| GET | `/api/pools/:poolId/standings` | Ultimate League: alle afgeronde battles in de pool |
| GET/POST | `/api/pools/:poolId/competitions` | Lijst / aanmaken `{name, double?, roundHours?, startAt?, unplayedRule?}` (beheerder) |
| GET | `/api/pools/:poolId/competitions/:competitionId` | Fixtures (met afgeleide status/forfaits) + ranglijst |
| GET/POST | `/api/pools/:poolId/matches` | Lijst / uitdagen `{opponentId, fixtureId?, timing?: live\|async}` |
| GET | `/api/matches/:matchId` | Metadata + battlestatus (verwerkt verlopen deadlines) |
| GET | `/api/matches/:matchId/events` | Volledige eventlog (reconnect) |
| GET | `/api/matches/:matchId/ws` | WebSocket (live): `{type:"move",cardId}`, `{type:"resign"}`, `{type:"sync"}` |
| POST | `/api/matches/:matchId/accept` · `/decline` · `/moves` `{cardId}` · `/resign` | |
| GET | `/api/grades` | Eigen cijfers + gemiddelden (engine) + `xp`: totaal, per categorie, clubniveau |
| POST ✱ | `/api/grades` | `{subjectId, testName, value, weight, date, externalRef?}` → cijfer + beloning + `xp` (toegekende regels) |
| PUT ✱ / DELETE ✱ | `/api/grades/:gradeId` | Correctie (alleen het verschil) / verwijderen (soft, XP gaat eraf); beide met `xp` |
| GET | `/api/grades/:gradeId/history` | Mutatiegeschiedenis |
| GET | `/api/collection` | Kaartinstanties |
| POST | `/api/collection/starter` | Eenmalig startelftal (11 kaarten, zie aannames) |
| GET/PUT | `/api/lineup` | `{cardIds: [11 eigen kaarten]}` |
| GET | `/api/wallet` | Saldi (= som grootboek) + laatste regels |
| GET | `/api/packs` | Ongeopende packs + winkel met kansentabel |
| POST ✱ | `/api/packs/buy` | `{packId}` — alleen spelcoins, nooit negatief saldo |
| POST ✱ | `/api/packs/:grantId/open` | Server-seed (crypto), resultaat + seed in één transactie |

Foutformaat: `{ "error": { "code": "...", "message": "Nederlandse melding" } }`. Interne fouten geven
alleen "Er ging iets mis." (details alleen in de serverlog).

## Datamodel (`migrations/0001_init.sql`, `0002_xp_ledger.sql`)

| Tabel | Inhoud / regels |
|---|---|
| `users` | gebruikersnaam (+ genormaliseerd, uniek), PBKDF2-hash met eigen salt, rol. **Geen e-mail, geen geboortedatum.** |
| `sessions` | alleen SHA-256 van het token, verloopdatum |
| `login_attempts` | rate-limit-emmers per gehashte gebruikersnaam en gehasht IP (15 min) |
| `platform_invites`, `pool_invites` | alleen codehash; verloopdatum; `CHECK (uses <= max_uses)` |
| `clubs` | naam, afkorting, embleem-JSON |
| `pools`, `pool_members` | rollen admin/member; trigger `pool_members_limit` dwingt het maximum af |
| `competitions`, `competition_fixtures` | schema uit engine `roundRobin` + `withDeadlines` |
| `matches` | metadata, vastgezette elftallen (snapshot), configVersion, uitslag. Eén open/gespeelde wedstrijd per fixture (partiële unieke index) |
| `grades`, `grade_history` | status `self`; uniek actief per `dedupe_key` (engine `gradeKey`); soft delete; geschiedenis van create/correct/delete |
| `reward_grants` | per toets één eerste toekenning (partiële unieke index), correcties apart, `config_version` + volledige engine-uitkomst |
| `xp_ledger` | XP van de motivatie-engine (Prestatie/Vooruitgang/Academy); `UNIQUE(user, key)` = idempotent; negatieve regels bij verwijderen |
| `wallet_ledger` | grootboek coins/vouchers; trigger `wallet_no_negative` breekt elke afschrijving onder 0 af; `UNIQUE(user, currency, ref)` |
| `card_instances`, `lineups`, `starter_grants` | kaarten verwijzen naar `card_def_id` + catalogusversie |
| `pack_grants`, `pack_opens` | `UNIQUE(grant_id)` op openingen: nooit twee keer openen; seed bewaard |
| `idempotency_keys` | per gebruiker + sleutel: requesthash en opgeslagen antwoord |
| `audit_log` | registratie, poolacties, startelftal-seed, pack-seed, wedstrijdseed |

De **eventlog van een battle** staat in de Durable Object `MatchDO` (persistente DO-opslag); D1 krijgt
bij afloop de uitslag. Status wordt nooit opgeslagen maar afgeleid (`battleState(events)`).

## Architectuur in het kort

- `src/index.ts` — router, authenticatie, beveiligingsheaders/CORS, foutafhandeling; exporteert `MatchDO`.
- `src/match/room.ts` — wedstrijdkern los van de runtime (opslagadapter-interface), getest met in-memory opslag.
- `src/match/MatchDO.ts` — DO: REST-fallback (`/state`, `/events`, `/move`, `/resign`), WebSocket-hibernation
  (`acceptWebSocket`, `webSocketMessage`), deadlines via `alarm()`; verlopen deadlines worden óók bij elk verzoek verwerkt.
- `src/engine.ts` — één importpunt voor `@rank11/engine` (+ tijdelijk het competitiepad, zie onder).
- `test/d1-shim.ts` — D1-shim op `node:sqlite` die alle migraties toepast; `test/helpers.ts` — nep-DO-namespace die de echte `MatchDO` draait, nepklok.

**Hergebruikte bouwstenen (alleen patronen gelezen, niets gekopieerd):** B23 (Web-Crypto-primitieven,
constant-time vergelijking `safeEqual`), B55 (besloten groepen, gehashte uitnodigingen met limieten,
niet-lid = 404), B57 (vaste beveiligingsheaders, CORS-allowlist, interne fouten lekken niet, D1-migraties,
D1-testshim op `node:sqlite`), B51 (status = f(gebeurtenissen)).

## Wat wel en niet gebouwd is

**Gebouwd en getest:** accounts (registratie met pool-/platformcode, PBKDF2-SHA256 100k, sessies, cookie-optie,
uitloggen, rate limiting in D1), clubs, pools (rollen, ledenlimiet, gehashte codes, isolatie), competities
(round-robin enkel/dubbel, deadlines, forfaitregel, ranglijst), battles via MatchDO (REST + WebSocket, time-outs
via alarm en lazy, 3× time-out = reglementair verlies, opgeven, reconnect via eventlog), cijfers (CRUD, historie,
ontdubbeling, beloning met configVersion, correctie = alleen verschil), grootboek, collectie, startelftal,
elftal, packs kopen/openen (idempotent, geen dubbele kaarten, geen negatief saldo), idempotentiesleutels.

**Niet gebouwd** (bewust; nodig vóór productie of later):
- Ouder-/voogdaccount en **oudertoestemming** (B55-minderjarigendeel, GDD §4.1). De doelgroep is 10–16 jaar:
  **niet in productie nemen** zonder toestemmingsflow, juridische toets en DPIA.
- Turnstile bij registratie, Cloudflare-rate-limit-bindings (nu alleen D1-emmers op login), retentie-cron voor
  sessies/audit/idempotentiesleutels.
- Toernooien (knock-out) via de API: de engine (`knockoutState`) is er, endpoints niet.
- Toetsweken, kaartstraffen (`card_penalty`; daardoor nu nooit geschorste kaarten), chemiebonus/positiestraf in
  battles (config `applyChemBonus` staat uit), battlebeloningen (XP/coins voor winst), Grade League, transfermarkt,
  beheerinstellingen per pool/config-versies in D1, export/verwijdering van accountgegevens.
- Beloning "keuze uit 3" (`pick` bij Legendarisch) wordt opgeslagen in de grant, maar niet uitgereikt; maximum van
  5 draft-vouchers wordt niet afgedwongen.
- Een frontend-koppeling (apps/web gebruikt de API nog niet).

**Aannames (nog te bevestigen door Martijn):**
1. *Startelftal:* nieuwe accounts krijgen eenmalig 11 brons/zilver-kaarten (één per plek van een 4-3-3) zodat
   ze kunnen battlen. Dit staat niet in het GDD.
2. *Verwijderen van een cijfer* draait de beloning niet terug; opnieuw invoeren van dezelfde toets levert geen
   nieuwe beloning (alleen een eventueel hoger verschil).
3. *Correctie van een cijfer dat door de dag-/weeklimiet geen beloning kreeg* levert niets op.
4. *Uitgedaagde speler* krijgt bij een competitie-fixture forfait als hij niet accepteert vóór de deadline; doet
   niemand iets, dan dubbel forfait (instelbaar: `unplayedRule: "void"`).
5. Wedstrijden zijn standaard asynchroon (24 uur per zet); `timing: "live"` = 30 s per zet.

## Uitrol (NIET gedaan — wat ervoor nodig is)

1. Cloudflare-account met Workers (gratis plan volstaat voor test; DO's zijn SQLite-backed).
2. `npx wrangler login` of `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` als omgevingsvariabelen
   (niet in deze repository).
3. Database aanmaken: `npx wrangler d1 create rank11-test --jurisdiction eu` en het `database_id` invullen in
   `wrangler.toml` onder `[env.test]` (nu een placeholder met nullen).
4. `ALLOWED_ORIGINS` voor de testfrontend invullen.
5. Migraties: `npx wrangler d1 migrations apply DB --remote --env test`.
6. Controle zonder uploaden: `npm run deploy:dry -w apps/api` (bundelt; 25-10-2026 geslaagd, 142 KiB).
7. Uitrollen: `npx wrangler deploy --env test` — **pas na een expliciete publicatieopdracht.**
8. Eerste platformcode: `node scripts/platform-invite.mjs` en de SQL met `--remote --env test` uitvoeren.

## Engine-competitiemodule

`src/engine.ts` importeert de competitiemodule nu via `@rank11/engine/src/competition/index.ts`, omdat de barrel
van de engine (nog) niet is aangepast. Na het toevoegen van
`export * from './competition/index.ts';` aan `packages/engine/src/index.ts` kan de tweede regel in
`src/engine.ts` vervallen (beide tegelijk werkt ook).

## XP: motivatie-engine (gelijk aan de web-app)

- XP wordt niet meer via `computeReward` en `wallet_ledger` toegekend, maar via `gradeXp`, `correctionXp` en `deletionXp`
  uit `@rank11/engine` (`DEFAULT_MOTIVATION_CONFIG`), in dezelfde D1-batch als het cijfer (alles of niets).
- Coins, vouchers en packs komen nog steeds uit `computeReward` (beloningsconfiguratie, eigen dag-/weeklimiet).
  Het veld `reward.xp` in de antwoorden bevat nu het XP-totaal uit de motivatie-engine.
- Verwijderen draait alle XP van dat cijfer terug; coins, vouchers en packs blijven. Dezelfde toets opnieuw invoeren
  levert geen nieuwe XP op (sleutel `perf:<gradeKey>` bestaat al).
- Doelen kent de API nog niet: `goals: []`, dus geen doel-XP of doelpack via de server.
- Oude regels met `currency = 'xp'` in `wallet_ledger` (van vóór migratie 0002) blijven leesbaar via `/api/wallet`,
  maar tellen niet mee in het XP-totaal van `/api/grades`.

## Bekende punten

- `npm audit` meldt kwetsbaarheden in `undici` binnen de dev-afhankelijkheid `wrangler` (alleen lokaal gereedschap,
  niet in de Worker-bundel).
- Tests gebruiken 1.000 PBKDF2-iteraties voor snelheid (`PBKDF2_ITERATIONS`); de standaard en `wrangler.toml`
  gebruiken 100.000 (maximum op Workers). De rooktest draaide met 100.000.
