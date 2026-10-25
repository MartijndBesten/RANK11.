# RANK11. — Architectuur en ontwikkelplan

**Versie:** 0.1 (25-10-2026)

## Gekozen stack (voorstel)

| Laag | Keuze | Waarom |
|---|---|---|
| Taal | TypeScript, strikt | Eén taal voor engine, client en server |
| Game-engine | `packages/engine`: pure functies, geen I/O, deterministische RNG (sfc32) met seeds | Draait ongewijzigd op client (preview) en server (gezag); volledig testbaar |
| Frontend | React 19 + Vite, eigen CSS (container queries, geen UI-kit), SVG voor kaarten/emblemen/portretten, canvas alleen voor deeltjes | Premium uitstraling, lichtgewicht, geen afhankelijkheid van beschermde assets |
| PWA | Manifest + serviceworker netwerk-eerst (bouwsteen B43) + installatieadvies (B44) | Bewezen in OKKIE.; updates zonder dataverlies |
| API | Cloudflare Workers (bouwsteen B57: CORS-allowlist, security headers, rate limiting, D1-migraties, D1-testshim op `node:sqlite`) | Bestaande, geteste opzet in eigen projecten |
| Realtime/consistentie | Durable Objects (SQLite-backed): `MatchDO` per battle, `PoolDO` per pool (ranglijst, events), `MarketDO` per pool-markt, `WalletDO` per speler | Single-threaded, atomair, WebSocket-hibernation, EU-jurisdictie |
| Database | D1 (jurisdictie `eu`) voor accounts, catalogus, cijfers, collecties, config-versies, audit | Relationeel, migraties, gratis tier |
| Opslag | R2 (alleen indien nodig, bijv. geëxporteerde gegevens) | — |
| Auth | Ouder: magic link (B29-patroon); kind: passkey + apparaatcode (B56-patroon); Turnstile bij registratie | Geen contactgegevens van kinderen |
| Groepen/toestemming | Bouwsteen B55 (besloten groepen, gehashte uitnodigingen, oudertoestemming per kind én per groep) | Bestaat al, 20 tests; minderjarigendeel staat daar bewust uit tot DPIA |
| Push | Web Push/VAPID (B80), alleen door gebruiker uitgelokte meldingen | Gratis, privacyvriendelijk |
| Tests | Vitest (engine/API), Playwright (e2e, meerdere accounts) | — |

## Modules (server)

`auth` · `guardians/consent` · `players` · `clubs` (embleem/tenues als JSON-parameters) · `grades` + `grade-sources` (adapter: manual/confirmed/magister) · `rewards` · `catalog` · `collection` · `packs` · `draft` · `battles` (MatchDO) · `pools` (PoolDO) · `competitions/tournaments` · `exam-weeks` · `market` (MarketDO) · `notifications` · `admin` · `audit`.

Elke module: eigen routes, eigen D1-tabellen/migraties, gebruikt `@rank11/engine` voor regels. Geen module leest tabellen van een andere module rechtstreeks; communicatie via functies/DO-calls.

## Server-authoritative principes

1. Client stuurt **intenties** (`openPack(packId, idempotencyKey)`), nooit uitkomsten.
2. Server trekt de seed (crypto), roept de engine aan, schrijft resultaat + seed + config-versie in één atomaire stap, retourneert het resultaat.
3. Herhaalde aanvraag met dezelfde idempotentiesleutel → hetzelfde antwoord, geen tweede opening.
4. Saldi = som van grootboekregels; elke mutatie is een regel met referentie.
5. Battles: MatchDO valideert beurt, eigendom, beschikbaarheid (geschorst/verbruikt), timers; eventlog is de waarheid.

## Omgevingen

| Omgeving | Doel | Data |
|---|---|---|
| `dev` | lokaal (`wrangler dev`, D1-shim) | synthetisch |
| `test` | Cloudflare (aparte Worker/D1/DO-namespace) | synthetisch, e2e met meerdere testaccounts |
| `prod` | pas na expliciete goedkeuring Martijn + DPIA | echt |

## Releaseplan (na goedkeuring visuele richting)

| Release | Inhoud | Klaar als (aantoonbaar) |
|---|---|---|
| R1 | API-basis (B57), accounts ouder/kind, toestemming, club creator, cijfercentrum + kluis via server | e2e: ouder maakt kind aan, kind voert cijfer in, onthult, beloning in grootboek; ontdubbel- en fraudetests |
| R2 | Collectie, packs en elftal server-side; winkel met coins | idempotentie- en concurrencytests (dubbel openen onmogelijk) |
| R3 | Pools: aanmaken, uitnodigen, rollen, isolatie, ranglijsten (Grade/Ultimate) | isolatietests (niet-lid = 404), 3+ accounts e2e |
| R4 | Open kaartbattles (MatchDO): live + asynchroon, timers, reconnect, historie | twee aparte browsers spelen een volledige wedstrijd; tie/early-win/time-outtests |
| R5 | Draft server-side + draft-toernooien | knock-out met 4/8 spelers e2e |
| R6 | Toetsweken, events, kaartstraffen (standaard uit), traktaties | config-versietests |
| R7 | Transfermarkt (MarketDO) | concurrente koop/verkoop zonder duplicatie of negatief saldo |
| R8 | Beheer platform + pool, auditlog, export/verwijdering, productiechecklist | DPIA af, securityreview, performance op instapapparaat |

## Kosten (schatting, te verifiëren bij activatie)

- Prototype/test: Cloudflare Free (Workers, D1, Durable Objects SQLite). Bij overschrijden: fout, geen rekening.
- Groei/productie: Workers Paid ca. $5/maand + gebruik. Domein: ca. €10–15/jaar (optioneel).
- Geen andere betaalde diensten nodig. Juridische toets/DPIA-ondersteuning: buiten scope van de code.

## Bekende beperkingen cloudsessie (B99)

Vanuit deze Claude Code-cloudsessie kan Worker-code via de proxy worden uitgerold, maar uploads van statische assets falen (401). Een PWA-uitrol naar Cloudflare gebeurt daarom vanaf de laptop of met een eigen token — pas bij een publicatieopdracht.
