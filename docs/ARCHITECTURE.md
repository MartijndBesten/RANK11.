# RANK11. — Architectuur

**Stand:** 25-10-2026 · **Vervangt:** `docs/ARCHITECTUUR.md` (versie 0.1, 25-10-2026). Dat document beschrijft het oorspronkelijke voorstel en het releaseplan; waar het afwijkt van wat er nu staat (zie §9), geldt dit document.

> Kern: de spelregels zitten in één pure TypeScript-engine. De web-app gebruikt die engine nu lokaal (alles in de browser van één toestel). De API gebruikt dezelfde engine server-side, maar draait alleen lokaal en is **niet uitgerold**.

## 1. Monorepo

npm-workspaces in één repository:

| Pakket | Pad | Rol | Status |
|---|---|---|---|
| `@rank11/engine` | `packages/engine` | Pure functies, geen I/O, deterministische RNG (`createRng`, sfc32). Alle spelregels. | Gebouwd, Vitest-tests in `packages/engine/test` |
| `@rank11/web` | `apps/web` | React 19 + Vite 8, eigen CSS (container queries, geen UI-kit). PWA-prototype. | Gebouwd; draait lokaal met demo-data |
| `@rank11/api` | `apps/api` | Cloudflare Worker + D1 + Durable Objects. Server-authoritative. | Gebouwd en offline getest (D1-shim op `node:sqlite`), lokaal met `wrangler dev --local`. Geen account, geen database, geen uitrol |
| tools | `tools/portretten`, `tools/sim` | Portretbatch, manifest, balansrapport | Lokale scripts |

Importconventie in de engine: relatieve imports met `.ts`-extensie, zodat Node (`--experimental-strip-types`), Vite en Workers dezelfde bron draaien.

## 2. Engine (`packages/engine/src`)

| Module | Inhoud |
|---|---|
| `rng.ts` | Seedbare RNG; dezelfde seed geeft dezelfde uitkomst (reproduceerbaar voor audit en simulatie) |
| `grades.ts` | `Grade`, validatie, gewogen gemiddelden, `gradeKey` (ontdubbelsleutel), `whatIf`, `requiredGrade` |
| `stats.ts` | Statistieken, trends, perioden, wat-als met meerdere cijfers, benodigd cijfer, scenario's — zie `GRADE-ENGINE.md` |
| `gradebook.ts` | Cijferboek als eventlog (`add` / `correct` / `delete`) met geschiedenis |
| `goals.ts` | Doelen, aankomende toetsen, voortgang, `goalReachedBy` |
| `insights.ts` | Regelgebaseerde inzichten — zie `GRADE-INSIGHTS.md` |
| `motivation.ts` | XP in drie categorieën met plafonds, levels, volgende beloningen — zie `MOTIVATION-ENGINE.md` |
| `achievements.ts` | Afgeleide prestaties (nooit los opgeslagen) |
| `academy.ts` | Learning Provider-interface, eventvalidatie, HMAC, Academy-beloning — zie `ACADEMY-INTEGRATION.md` |
| `gradeLeague.ts` | Genormaliseerde schoolcompetitie |
| `rewards.ts` | Beloningstiers voor de kaarteconomie (coins, packs, vouchers, spelerskeuze) |
| `catalog.ts`, `packs.ts`, `draft.ts`, `squad.ts` | Fictieve catalogus, packs met kansentabel, Ultimate Draft, elftal en chemie |
| `market.ts` | Transfermarkt als pure toestandsovergangen |
| `competition/` | Battle, league, schema, toernooi (gebouwd door een parallelle sessie; zie `COMPETITION-SYSTEM.md`) |
| `simulate.ts` | Balanssimulaties (drafts, packs, economie) |

Uitgangspunten die overal terugkomen:

- **Versieerbare configuratie.** Iedere regelset heeft een `version` (bijv. `2026.10-motivatie.1`, `2026.10-proto.1`, `2026.10-gradeleague.1`, `2026.10-markt.1`, `battle.2026.10-1`). Een toekenning bewaart de versie waarmee ze is berekend, zodat latere wijzigingen oude beloningen niet veranderen.
- **Afleiden in plaats van opslaan.** Huidige cijferlijst, achievements, records en inzichten worden steeds uit de bron berekend.
- **Idempotente sleutels.** Cijfers via `gradeKey`, XP via sleutels als `perf:<gradeKey>`, Academy via `eventId`.

## 3. Web-app (`apps/web/src`)

- `App.tsx`: vijf tabs — Home, Club, Competitie, Cijfers, Academy (Academy alleen zichtbaar als die in de instellingen aan staat) — elk met subnavigatie. Routes zijn hash-ankers van de vorm `tab-sub` (bijv. `#cijfers-kluis`); oude ankers (`#vault`, `#draft`, `#squad`, `#packs`) worden omgezet.
- `state/store.tsx`: de lokale speltoestand (`GameState`, versie 3, `localStorage`-sleutel `rank11-proto-v3`). Bevat alleen *events en saldi*; alle regels komen uit de engine. Dit bestand is bedoeld om later een dunne API-client te worden.
- `state/school.ts`: vakken, voorbeeldperiode-indeling (aanpasbaar), demo-startset.
- `state/gradeData.ts`: één hook (`useGradeData`) die Home en Cijfers dezelfde afgeleide cijfergegevens geeft.
- `academy/demoProvider.ts`: interne oefenmodule die echte `LearningEvent`s maakt.

## 4. Gegevensstroom: cijfer → kluis → beloning

1. **Invoeren.** `addGrade` bouwt een `Grade` (status `registered`, bron `manual`), controleert met `checkNewGrade` (validatie + dubbele toets) en schrijft een `add`-event. Het cijfer telt direct mee in gemiddelden; het id komt in `pendingIds` (beloning wacht).
2. **Onthullen.** `revealGrade` berekent twee dingen los van elkaar:
   - kaarteconomie via `computeReward` (coins, pack, vouchers, spelerskeuze; dag-/weeklimiet);
   - XP via `gradeXp` uit de motivatie-engine (Prestatie- en Vooruitgang-XP met plafonds, doelen).
   De XP uit `computeReward` wordt overschreven door de som van de XP-regels. Een bereikt doel voegt het doelpack toe.
3. **Corrigeren.** `correct`-event; is de beloning al opgehaald, dan schrijft `correctionXp` alleen een positief verschil bij.
4. **Verwijderen.** `delete`-event; is de beloning al opgehaald, dan draait `deletionXp` alle XP van dat cijfer terug met negatieve regels. Packs blijven.

Saldi in de lokale store: `coins`, `vouchers` en `packs` als getallen; XP als ledger (`xpLedger`), totaal = som. Op de server wordt ook de wallet een grootboek (zie §5).

## 5. API (`apps/api`) — lokaal, niet uitgerold

- Router in `src/index.ts`, modules in `src/modules/` (clubs, collection, competitions, grades, matches, pools), `MatchDO` per wedstrijd in `src/match/`.
- Database: één migratie `migrations/0001_init.sql` met o.a. `users`, `sessions`, `login_attempts`, `platform_invites`, `pools`, `pool_members`, `pool_invites`, `competitions`, `competition_fixtures`, `matches`, `grades`, `grade_history`, `reward_grants`, `wallet_ledger`, `card_instances`, `lineups`, `pack_grants`, `pack_opens`, `idempotency_keys`, `audit_log`.
- Accounts: registratie alleen met een uitnodigingscode, gebruikersnaam + wachtwoord (PBKDF2-SHA256), sessietokens waarvan alleen de SHA-256 wordt opgeslagen. Geen e-mail, geen geboortedatum.
- Muterende endpoints accepteren een `Idempotency-Key`-header (verplicht bij cijfers en packs).
- Wedstrijden: REST voor asynchroon spelen, WebSocket met hibernation voor live, deadlines via DO-alarmen.
- `wrangler.toml` bevat bewust geen account- of database-id's; alleen `env.dev` (lokaal) en `env.test` zijn gedefinieerd. Productie bestaat niet.

Details: `MULTIPLAYER.md` en `apps/api/README.md`.

## 6. Server-authoritative principe

1. De client stuurt intenties (`open pack X`, `zet kaart Y`), nooit uitkomsten.
2. De server trekt de seed, roept de engine aan en schrijft resultaat + seed + configuratieversie in één atomaire stap.
3. Dezelfde idempotentiesleutel geeft hetzelfde antwoord.
4. In het huidige web-prototype gebeurt dit allemaal in de browser. Dat is voor een demo prima, maar fraude-gevoelig: een speler kan `localStorage` aanpassen. Pas met de API worden beloningen afdwingbaar.

## 7. Portretpijplijn

- Fictieve spelers krijgen een fotorealistisch AI-portret, lokaal gegenereerd met FLUX.2 [klein] 4B (Apache-2.0) op CPU. Prompts worden uit spelerskenmerken opgebouwd (`tools/portretten/export-jobs.ts` → `catalogus-jobs.json`).
- `tools/portretten/batch.py` is hervatbaar: genereert, verwijdert de achtergrond (rembg IS-Net; S01/L01 met BiRefNet-portrait) en schrijft `apps/web/public/portraits/<baseId>.webp`.
- `tools/portretten/manifest.mjs` schrijft `apps/web/src/portraits/manifest.json`; `portraits/registry.ts` maakt daar `PortraitAsset`s van (`kind: 'ai-fictional'`, licentie, AI-vermelding).
- `PHOTOS_ONLY` wordt `true` zodra er ≥ 150 portretten zijn: dan bevat de catalogus alleen spelers met een portret, zodat getekende en fotorealistische gezichten nooit door elkaar staan. Onder die grens blijft de volledige catalogus met getekende SVG-portretten actief.
- Vervangen door gelicentieerde foto's = alleen het register of de bron wijzigen; kaarten, packs en draft lezen uitsluitend `player.photo`.

## 8. Lokaal versus later op de server

| Onderdeel | Nu | Later |
|---|---|---|
| Cijfers, doelen, toetsen, scenario's | `localStorage`, één toestel | API `grades` (bestaat al lokaal) + nog te bouwen doelen/toetsen |
| XP-ledger | `localStorage` | Server-ledger; de API gebruikt nu nog `computeReward`-XP (zie §9) |
| Collectie, packs, coins | `localStorage` | `card_instances`, `pack_grants`, `wallet_ledger` (lokaal gebouwd) |
| Academy | Interne oefenmodule in de browser | Ondertekende webhook naar de API; koppeling met een echte leeromgeving staat uit |
| Competitie/battles | Zie `COMPETITION-SYSTEM.md` | `MatchDO`, competitie-endpoints (lokaal gebouwd) |
| Transfermarkt | Alleen engine + tests | Nog geen API-module |

## 9. Afwijkingen ten opzichte van `ARCHITECTUUR.md` v0.1

- **Accounts:** het oude plan noemde een ouderaccount met magic link en passkeys voor kinderen. De gebouwde API gebruikt gebruikersnaam + wachtwoord met uitnodigingscodes, zonder e-mail. Ouderaccounts bestaan niet.
- **Cijferbevestiging:** het oude plan had bevestiging door een ouder (`verified`). Besluit Martijn (beurt 3): leerlingen voeren zelf in, zonder ouderverificatie. Status blijft `registered`; de UI toont "zelf ingevoerd".
- **Durable Objects:** alleen `MatchDO` bestaat. `PoolDO`, `MarketDO` en `WalletDO` zijn niet gebouwd; de wallet is een D1-grootboek.
- **XP in de API:** `apps/api/src/modules/grades.ts` kent XP toe via `computeReward` (beloningsconfig). De web-app gebruikt de motivatie-engine. Dit moet gelijkgetrokken worden voordat de web-app op de API overgaat.
