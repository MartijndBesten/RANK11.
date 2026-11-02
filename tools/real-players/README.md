# RANK11 — echte spelers: bron, methode en ratingformule

Deze map genereert de spelerscatalogus van RANK11 uit **echte, actieve spelers** op basis van **openbare
bronnen**, met per speler een vastgelegde bron + raadpleegdatum ([BRONNEN.md](BRONNEN.md)). Er worden
**geen** ratings uit EA FC/FIFA of andere commerciële systemen overgenomen, en **geen** spelersfoto's gebruikt.

## Bronnen

- **Identiteit** (naam, huidige club, nationaliteit, positie, geboortejaar): **Wikidata** (licentie CC0).
  - Huidige club = `P54` (lid van sportteam) met **preferred rank** — zo markeert Wikidata de actuele club.
  - Nationaliteit = `P1532` (land voor sport), terugval op `P27` (nationaliteit).
  - Positie = `P413`, geboortejaar = `P569`. Overleden spelers (`P570`) worden uitgesloten.
- **Prestatiecijfers** (senior club-wedstrijden en -doelpunten): de **Engelse Wikipedia**, infobox
  *football biography* (som van `caps`/`goals`, of `totalcaps`/`totalgoals`). Licentie CC BY-SA.

Alleen de zeven grote competities worden doorzocht (Premier League, La Liga, Serie A, Bundesliga, Ligue 1,
Eredivisie, Primeira Liga). Spelers zonder bruikbaar Wikipedia-artikel of zonder parseerbare cijfers worden
**weggelaten** en gelogd (`dropped.json`) — er wordt niets verzonnen.

## Ratingformule (eigen, gedocumenteerd)

De rating (ongeveer **52–92**) is een gewogen samenstelling van drie signalen uit uitsluitend openbare data:

| Signaal | Betekenis | Berekening |
|---|---|---|
| **clubniveau** | speelniveau van de huidige club (sterkste publieke kwaliteitssignaal) | tier-tabel: elite 1,00 · sterk 0,82 · degelijk 0,62 · bescheiden 0,46 |
| **output** | doelpunten per wedstrijd, per positiegroep genormaliseerd | `clamp((goals/wedstrijden) / ref[groep], 0, 1)`, ref GK 0,03 · DEF 0,16 · MID 0,36 · FWD 0,58 |
| **ervaring** | totaal senior club-wedstrijden (afnemend, als bodem) | `clamp(wedstrijden / 280, 0, 1)` |

Weging per positiegroep (som = 1):

| Groep | clubniveau | output | ervaring |
|---|---|---|---|
| GK | 0,60 | 0,00 | 0,40 |
| DEF | 0,52 | 0,12 | 0,36 |
| MID | 0,48 | 0,30 | 0,22 |
| FWD | 0,44 | 0,42 | 0,14 |

Daarna een lichte leeftijdscurve (piek 24–30; jonger of ouder licht lager) en afbeelding op 52–92:
`rating = round(52 + 40 × composiet)`.

De **clubniveau-tabel** (elite/sterk/bescheiden) staat in `enrich-rate.mjs` en berust op algemeen bekende,
openbare informatie over het speelniveau van clubs; overige profclubs uit de grote competities krijgen het
degelijke basisniveau.

## Bekende beperkingen (zie ook het eindrapport)

- Wikidata's *preferred rank*-club kan **achterlopen op zeer recente transfers**; de waarde is citeerbaar met
  raadpleegdatum maar niet gegarandeerd up-to-date.
- De rating meet **niveau + output + ervaring**, geen puntoordeel; een enkele veteraan of productieve speler
  bij een kleinere club kan daardoor hoog uitkomen.
- Interlandcaps zijn **niet** gebruikt: de veldnaamgeving in Wikipedia-infoboxen is te wisselend om dit
  eerlijk en betrouwbaar te parsen.

## Regenereren

```bash
export NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt
node tools/real-players/build-identities.mjs   # Wikidata-identiteiten -> identities.json
node tools/real-players/enrich-rate.mjs         # Wikipedia-cijfers + rating -> rated.json (+ cache)
node tools/real-players/finalize.mjs            # selectie 200 + posities + vlagkleuren -> real-players.generated.ts, BRONNEN.md
```

De scripts schrijven naar de scratchpad; kopieer `real-players.generated.ts` naar
`packages/engine/src/` en `BRONNEN.md` naar deze map. De vlagkleuren staan in `flag-colors.json`
(feitelijke dominante vlagkleuren; geen logo's).
