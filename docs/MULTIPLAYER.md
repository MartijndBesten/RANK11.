# Multiplayer en backend

**Status 26-10-2026 (ronde 4):** de app is **gekoppeld aan de server**, maar alleen **lokaal**. Met `node tools/dev-online.mjs` en `npm run dev` draait een volledige online-stack op de eigen machine: Worker, D1 en Durable Objects in miniflare. Meerdere echte (test)accounts kunnen daar elkaar uitnodigen en tegen elkaar spelen. Er staat **niets online**: geen Cloudflare-account, database of Worker aangemaakt, en er zijn alleen synthetische testgegevens gebruikt. Dit is dus geen werkende online multiplayer voor gebruikers, maar een lokaal geteste.

## Lokaal draaien

```bash
npm install
node tools/dev-online.mjs          # API op :8787 + platformcode voor testaccounts (apps/api/.wrangler/dev-invite.txt)
npm run dev                        # app op :5173; /api gaat via de Vite-proxy naar de API (zelfde origin, cookie werkt)
```

Op het startscherm kies je **Account maken** (gebruikersnaam, wachtwoord, uitnodigingscode) of **Demo zonder account** (lokale demo, zoals in de preview). De statische preview heeft geen server en start altijd in de demo.

## Wat er via de server loopt

| Onderdeel | Endpoints | Getest |
|---|---|---|
| Account, sessie (httpOnly-cookie) | `/api/auth/register`, `/login`, `/logout`, `/api/me` | API-tests, E2E |
| Club (standaardclub bij registratie) | `/api/club` | API-tests |
| Startelftal: 11 basisspelers + 7 reserves (V-013) | bij registratie, `/api/lineup` (formatie en bank) | API-tests, E2E |
| Cijfers met geschiedenis, XP (motivatie-engine) | `/api/grades`, `/api/grades?history=1`, `/api/xp` | API-tests, E2E |
| Beloningen: kluis, voortgangsbeloningen (V-011) | `/api/vault`, `/api/vault/:id/seen`, `/api/vault/:id/pick` | API-tests, E2E |
| Doelen en geplande toetsen | `/api/planning`, `/api/goals`, `/api/upcoming` | API-tests |
| Collectie, packs, snel verkopen | `/api/collection`, `/api/packs`, `/api/packs/:id/open`, `/api/collection/sell` | API-tests |
| Draft (voucher, garantieteller, keuzes) | `/api/draft`, `/api/draft/:id/pick` | API-tests |
| Academy-oefenmodule (nakijken op de server) | `/api/academy`, `/api/academy/sessions`, `/api/academy/sessions/:id/submit` | API-tests |
| Pools en uitnodigen | `/api/pools`, `/api/pools/join`, `/api/pools/:id/invites`, `/members` | API-tests, E2E |
| Asynchrone battle (deadline per zet, standaard 48 u, instelbaar 1-168 u; V-014) | `/api/pools/:id/matches`, `/api/matches/:id`, `/accept`, `/decline`, `/moves`, `/resign` | API-tests, E2E (twee accounts) |
| RANK League (server) | `/api/pools/:id/standings` | API-tests, E2E |
| Grade League (server; anderen zien alleen plaats en totaalscore) | `/api/pools/:id/grade-league` | API-tests |
| Configuratie en feature flags (transfermarkt uit; V-015) | `/api/config` | API-tests |

Wat op het toestel blijft: voorkeuren (geluid, meldingen, stille uren) en wat-als-scenario's. Dat zijn simulaties, geen voortgang.

## Spelverloop online

- **Uitdagen**: in een pool kies je een tegenstander en de bedenktijd per zet (24, 48 of 72 uur; standaard 48). De uitgedaagde heeft dezelfde tijd om te accepteren. Daarna vervalt de uitdaging (status `expired`).
- **Spelen**: wie aan zet is, kiest een kaart. Wie niet aan zet is, ververst elke 3 seconden (alleen als het tabblad zichtbaar is) en direct bij terugkeren. Na de deadline speelt de server automatisch de laagste kaart; na 3 keer achter elkaar te laat volgt reglementair verlies. Live wedstrijden (30 seconden per zet, WebSocket) bestaan in de API, maar de app gebruikt nu alleen asynchroon.
- **Ranglijst**: de server berekent de RANK League uit alle afgeronde wedstrijden in de pool.

## Beveiliging en isolatie

- Iedere vraag naar andermans gegevens geeft 404 (bestaan lekt niet) of 403 (wel lid, geen deelnemer). Zonder sessie geldt 401. Zie `apps/api/test/isolatie.test.ts`.
- Cijfers zijn nooit zichtbaar voor anderen. In de Grade League zien anderen alleen plaats en totaalscore, niet de deelscores (de prestatiescore zou terug te rekenen zijn naar een gemiddelde).
- Oefenvragen gaan zonder antwoorden naar de app; de server kijkt na.
- Wachtwoorden: PBKDF2-SHA256 (100.000 iteraties). Sessietokens alleen als hash. Cookie `HttpOnly; Secure; SameSite=Strict` met CSRF-controle op origin. Idempotentiesleutel op alle muterende verzoeken.

## Vóór iets online kan

Zie `docs/BESLOTEN-TEST.md` voor het volledige overzicht, los van de ontwikkeling. Kort:

1. Privacy en toestemming: ouder-/voogdaccount, juridische toets, DPIA (V-005, V-007).
2. Een Cloudflare-testomgeving (V-006): toestemming nodig, het is een nieuwe dienst.
3. Turnstile, rate-limit-bindings, retentietaak, export/verwijderen van accountgegevens.
4. Een productiebuild van de app achter dezelfde origin als de Worker (route), of CORS met de juiste origin.
