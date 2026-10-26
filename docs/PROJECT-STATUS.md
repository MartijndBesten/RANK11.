# Projectstatus — wat echt werkt en wat demo is

Stand: 26 oktober 2026 (ronde 4). De actuele projectstatus en de volgende actor staan altijd in `HANDOFF.md`.

De app heeft twee modi:

- **Demo zonder account**: alles op het toestel, tegenstanders zijn de computer. Dit is wat de preview toont (daar is geen server).
- **Account (lokaal online)**: met `node tools/dev-online.mjs` + `npm run dev` praat de app met de echte server (Worker, D1, Durable Objects) die **lokaal** draait. Meerdere testaccounts kunnen elkaar uitnodigen en tegen elkaar spelen.

**Er staat niets online.** Geen Cloudflare-account, database of Worker aangemaakt; alleen synthetische testaccounts. "Lokaal online" is dus géén werkende online multiplayer voor gebruikers.

Legenda: **Server** = berekend en opgeslagen door de server, getest met meerdere accounts · **Lokaal** = op het toestel · **Niet gebouwd**.

## Per onderdeel

| Onderdeel | Met account (lokaal online) | Demo | Toelichting |
|---|---|---|---|
| Account, inloggen, uitloggen, standaardclub | Server | — | Platformuitnodigingscode verplicht; sessie in httpOnly-cookie |
| Startelftal 11 + 7 reserves (V-013) | Server | Lokaal | Bij registratie, 4-3-3 |
| Cijfers invoeren, corrigeren, verwijderen, geschiedenis | Server | Lokaal | Dubbele-invoercontrole; status "zelf ingevoerd" |
| Cijferdashboard, vakpagina's, inzichten | In de app berekend uit servercijfers | Lokaal | Zelfde engine |
| Doelen en geplande toetsen | Server | Lokaal | |
| XP (prestatie, vooruitgang, Academy) met plafonds | Server | Lokaal | Motivatieconfig `2026.10-motivatie.3` |
| Cijferkluis, beloningen, voortgangsbeloningen (V-011) | Server | Lokaal | `2026.10-eerlijk.1` + `2026.10-voortgang.1` |
| Packs openen, kansentabel | Server | Lokaal | Fictieve spelers |
| Draft met garantieteller | Server | Lokaal | Keuzes op de server gegenereerd |
| Elftal, formatie, bank | Server | Lokaal | |
| Collectie, snel verkopen | Server | Lokaal | Minimaal 11 kaarten blijven; elftal en bank zijn beschermd |
| Academy-oefenmodule (herhaling van fouten, voortgang per onderwerp) | Server (nakijken op de server, antwoorden niet in de app) | Lokaal | XP alleen voor echte voortgang (V-016) |
| Pools en uitnodigingscodes | Server | — | |
| Asynchrone kaartbattle tussen twee accounts (V-014) | Server | Tegen de computer | Deadline per zet, standaard 48 u (24/48/72 in de app; API 1–168) |
| RANK League-ranglijst | Server | Lokaal tegen 7 computertegenstanders | |
| Grade League | Server | Verzonnen deelnemers | Anderen zien alleen plaats en totaalscore |
| Academy League | Concept | Concept | Niet actief |
| Live battle (30 s per zet, WebSocket) | API gebouwd en getest | — | De app gebruikt nu alleen asynchroon |
| Transfermarkt (V-015) | Uit via feature flag | Uit | Engine en regels klaar |
| Koppeling leren.martijndenbesten.com (V-012) | Voorbereid, staat uit | — | Site niet gewijzigd |
| Meldingen | Alleen in de app | Alleen in de app | Geen pushmeldingen |
| Ouderaccount en toestemming | Niet gebouwd | — | Blokkeert een test met echte gebruikers (`docs/BESLOTEN-TEST.md`) |

## Getest

Zie `docs/TEST-REPORT.md`. Kort: engine 211 tests, API 58 tests (waaronder isolatie tussen accounts), E2E met twee testaccounts tegen de lokale stack (20 controles), Academy-E2E (demo en online), demo-regressie, lay-out op 17 schermen × 8 maten in beide modi.

## Niet gedaan, en bewust niet

- Niets gepubliceerd. Geen Cloudflare-account, database of Worker aangemaakt.
- Geen echte voetballers, clubs of foto's: juridisch NO-GO zonder licenties (`docs/onderzoek/ECHTE_SPELERS.md`, `ECHTE_DATA_V2.md`).
- Geen Magister- of Somtoday-koppeling; zelf invoeren is het uitgangspunt.
- De leeromgeving is alleen gelezen, niet aangepast.
- Geen betalingen en geen echt geld; coins zijn niet te koop.
- Alleen synthetische testgegevens.
