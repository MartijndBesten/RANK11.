# Testrapport — ronde 4 (26 oktober 2026)

Het oudere `TESTRAPPORT.md` beschrijft ronde 1 en 2. Dit bestand geeft de actuele stand.

Statusladder: GEBOUWD → OFFLINE GETEST → PRAKTIJKGETEST → LIVE GECONTROLEERD. Alles hieronder is **offline getest** (lokaal). Niets is praktijkgetest op echte toestellen of live gecontroleerd, want er staat niets online.

## Geautomatiseerde tests

`npm test` in de root draait engine, API en de PII-controle. Laatste run: **211 engine-tests en 58 API-tests groen; PII-controle schoon.** Typecheck (engine, web, api): geen fouten.

| Testbestand | Tests | Wat |
|---|---:|---|
| engine `grades`, `stats-goals` | 45 | gemiddelden, validatie, wat-als, statistieken, doelen, inzichten |
| engine `motivation-academy` | 24 | XP-categorieën, plafonds, idempotentie, Academy-regels (o.a. geen afrond-XP onder 50% goed), Grade League |
| engine `rewards`, `economy` | 30 | beloningstiers, eerlijke configuratie, voortgangsbeloningen, schooljaarsimulatie |
| engine `practice` | 9 | herhaling met intervallen 1/3/7/14 dagen, "verbeterd" pas in een latere sessie, beheerst na 3× gespreid goed |
| engine `starter` | 3 | 11 basisspelers op 4-3-3 + 7 reserves, deterministisch per seed |
| engine `catalog-packs`, `squad-draft`, `market`, `simulate` | 31 | catalogus, packs, draft, transfermarkt, simulaties |
| engine `competition/*` | 69 | battle (26), ranglijst (11), schema's (24), toernooi (8) |
| api (9 bestanden) | 58 | auth, pools, wedstrijden, competities, cijfers, collectie/packs, MatchDO, ronde 4 (config, doelen, kluis, draft, deadline, Academy, Grade League, verkopen), **isolatie** |

### Isolatie tussen accounts (`apps/api/test/isolatie.test.ts`)

- Speler B leest alleen eigen (lege) lijsten: cijfers, kluis, planning, XP, collectie.
- B probeert 15 directe acties op A's id's (cijfer lezen/wijzigen/verwijderen, doel en toets verwijderen, kluis openen, pack openen, draftkeuze, oefensessie inleveren, pool/leden/stand/Grade League/wedstrijden lezen, uitnodiging maken): altijd 404 of 403, nooit 200. Een opstelling met A's kaarten geeft 400. A's gegevens zijn daarna onveranderd.
- Zonder sessie: 401 op alle accountroutes.
- Een poollid dat geen deelnemer is, mag meekijken maar niet zetten of accepteren (403); een buitenstaander ziet de wedstrijd niet (404).

## Doorlopen in de browser (Playwright, Chromium)

Scripts staan in `tools/e2e/`. Online-scripts draaien tegen `node tools/dev-online.mjs` + `npm run dev`.

| Script | Wat | Resultaat |
|---|---|---|
| `online.cjs` | Twee nieuwe testaccounts: registreren, startelftal (11 + 7), onvoldoende → doel → herstelcijfer → hoog cijfer, kluis met 3 beloningen, voortgangsbeloning zichtbaar, pack openen, herladen, uitloggen, inloggen (cijfers blijven), B ziet niets van A (ook niet via `/api/grades`), pool maken + code + lid worden, uitdagen + accepteren, asynchrone battle tot het einde, serverranglijst met beide spelers, Grade League | **20/20 geslaagd**, geen paginafouten |
| `academy.cjs` | Oefening in demo en online; online: sessie bevat geen antwoorden, XP en voortgang per onderwerp op de server, blijft na herladen | **8/8 geslaagd** |
| `demo.cjs` | Demo zonder account: cijfer, dubbele invoer geweigerd, ongeldig cijfer geweigerd, kluis, onthulling, battle tegen de computer, ranglijst | **9/9 geslaagd** |
| `overflow.cjs demo` / `online` | 17 schermen × 8 maten (360×740 t/m 1180×820) | Geen horizontale overloop, geen paginafouten, in beide modi |

Screenshots: `docs/review/v4/` (online-stack met twee testaccounts, Academy demo en online).

## Bevindingen deze ronde (opgelost)

- Academy gaf 20 XP voor een afgeronde oefening met 0 van 6 goed (wegklikken). Nu pas vanaf 50% goed, met een eigen status en uitleg.
- Het XP-label in het Academy-resultaat werd afgekapt; nu loopt het door op een volgende regel.
- Kluisoverzicht "Mijn gemiddelden" was leeg in de online modus.
- De spelerskeuze stuurde online geen beloning-id mee.
- De E2E-invoer bleef op een oud formulier staan bij navigeren naar dezelfde hash.

## Niet getest

- Echte toestellen (iOS Safari, Android Chrome), schermlezers, installeren als PWA.
- De server in een echte Cloudflare-omgeving; alleen lokaal (`wrangler dev --local` en een D1-shim op node:sqlite).
- Lasttest en veel gelijktijdige gebruikers.
- De live battle (WebSocket) vanuit de app; die gebruikt de app niet.
