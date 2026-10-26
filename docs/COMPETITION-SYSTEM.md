# Competitiesysteem

Status 26-10-2026 (ronde 4): **engine gebouwd en getest**. Met een account speelt de app via de **lokaal draaiende server**: pools met uitnodigingscodes, asynchrone kaartbattles tussen twee accounts (deadline standaard 48 uur, V-014), RANK League en Grade League berekend door de server. In de demo speelt de app een lokale pool met computertegenstanders. Er draait niets online; zie `docs/MULTIPLAYER.md`.

## Onderdelen

| Onderdeel | Waar | Status |
|---|---|---|
| Kaartbattle (regels, beurten, time-outs, forfait) | `packages/engine/src/competition/battle.ts` | gebouwd, 26 tests |
| Ranglijst met tie-breakers | `competition/league.ts` | gebouwd, 11 tests |
| Speelschema's: round-robin, knock-out, poules, deadlines, onbespeelde wedstrijden | `competition/schedule.ts` | gebouwd, 24 tests |
| Toernooi (knock-out-status, extra duel, toss) | `competition/tournament.ts` | gebouwd, 8 tests; nog geen API-endpoints |
| Grade League (cijfercompetitie) | `packages/engine/src/gradeLeague.ts` | gebouwd en getest; niet in de API |
| Academy League | – | alleen concept (zie onder) |
| Pools, uitdagingen, wedstrijden via de server | `apps/api` (MatchDO, D1), app: `screens/OnlineCompetition.tsx`, `OnlineBattle.tsx` | lokaal gekoppeld en getest met twee accounts (`tools/e2e/online.cjs`), niet uitgerold |
| Demo-pool in de app | `apps/web/src/competition/demoPool.ts` | werkt lokaal; tegenstanders zijn verzonnen |

## Kaartbattle

- Status wordt nooit opgeslagen: `battleState(events)` leidt alles af uit de eventlog (`created`, `played`, `forfeit`).
- Toss met de gelogde seed bepaalt wie in ronde 1 aanvalt; daarna wisselt de aanval.
- Per ronde: de aanvaller legt open, de verdediger reageert. Hogere duelwaarde wint; gelijk volgens `tieRule` (standaard: geen doelpunt).
- **Vorm van de dag (V-018):** elke kaart krijgt per duel 0..3 extra, deterministisch uit de wedstrijdseed en zichtbaar in het duel. Sterkere kaarten winnen meestal; een klein verschil geeft de onderdog meer kans zonder dat een wedstrijd willekeurig aanvoelt.
- Duelmodus: standaard `rating`. De demo-league wisselt per ronde tussen rating, snelheid, techniek en verdedigen (`roundModes`), zodat meer dan alleen de hoogste rating telt.
- `stopWhenDecided`: de wedstrijd stopt zodra de achterstand niet meer in te halen is.
- Bedenktijd: live 30 s, asynchroon 24 uur. Bij een verlopen deadline speelt de server de laagste kaart; drie keer achter elkaar te laat betekent reglementair verlies (3-0).
- Een zet wordt alleen geaccepteerd via `playCard()`: verkeerde beurt, al gespeelde of geschorste kaart, of een kaart van de ander geeft een getypeerde fout. Een gemanipuleerde log wordt geweigerd.

## Ranglijst

Punten 3/1/0. Tie-breakers: punten, doelsaldo, doelpunten voor, onderling resultaat, naam, id. Forfaits tellen als 3-0 (instelbaar). De ranglijst wordt altijd uit uitslagen berekend, nooit bewaard.

## Drie leagues

1. **RANK League**: kaartbattles in een pool (round-robin per seizoen of periode). Met account: tegen andere accounts in de pool, ranglijst van de server. In de demo: tegen computertegenstanders, lokaal bewaard.
2. **Grade League**: vergelijkt cijferontwikkeling zonder cijfers te tonen. Score 0-100 uit prestatie 35% (gemiddelde, niet het aantal toetsen; 4 = 0, 9 = 100), vooruitgang 45% (per vak tegenover je eigen eerdere gemiddelde; gelijk = 50, +25 per punt) en doelen 20%. Herstelbonus +5 per comeback (max +10). Minder dan 2 cijfers in de periode: geen plek, wel uitleg, geen straf. Meer toetsen invoeren levert niets extra op omdat alles op gemiddelden is gebaseerd.
3. **Academy League**: concept. Rangschikt op Academy XP (oefenen, fouten verbeteren) met dezelfde dag- en weekplafonds. Pas zinvol als een echte leeromgeving gekoppeld is en de pool het aanzet.

## Demo-pool in de app

- Zeven fictieve teamgenoten (namen en clubs verzonnen) met een vast elftal rond een sterkte en een cijferprofiel (stijger, constant, moeite, weinig cijfers, sterk).
- De eerste drie speelrondes tussen computers worden met de echte engine gesimuleerd; jouw wedstrijden speel je zelf in `BattleView`.
- Computerzet: als aanvaller een sterke maar niet de sterkste kaart; als verdediger de zwakste kaart die de aanval stopt, anders de zwakste kaart.
- Iedere battle wordt als eventlog in de lokale opslag bewaard en is te hervatten.

## Nog niet gebouwd

- Toernooi-endpoints in de API (engine bestaat).
- Toetsweken met eigen toernooien, kaartstraffen (gele/rode kaart), chemiebonus in battles, beloningen voor gewonnen battles.
- Grade League en Academy League in de API.
- Seizoensovergang (promotie/degradatie, archief).
