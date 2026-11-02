# RANK11 — echte spelers: bronnen, synchronisatie, rating en identiteit

Deze map onderhoudt de spelerscatalogus van RANK11: **echte, actieve spelers** uit de zeven competities
(Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Eredivisie, Primeira Liga), met per speler bron en
controledatum. Geen ratings van EA FC/FIFA; geen officiële clublogo's.

## Procedure (v2, sinds 2-11-2026)

```
sync.mjs  ──►  data/sync-<datum>.json  ──►  finalize.mjs  ──►  packages/engine/src/real-players.generated.ts
(browser of Node)                                             tools/real-players/BRONNEN.md
                                                              tools/real-players/PORTRETTEN.md
                                                              tools/real-players/data/sync-rapport.json
```

1. **`sync.mjs`** haalt openbare gegevens op en beoordeelt elke speler:
   - **Wikidata** (CC0): identiteit, open clubverklaringen (P54) met rugnummer (P1618), positie, nationaliteit,
     geboortedatum, overlijden, afbeelding (P18), aantal Wikipedia-taalversies (bekendheid), competitie van de club (P118),
     officiële clubkleuren (P6364/P465).
   - **Engelse Wikipedia** (CC BY-SA), infobox: `currentclub` (link-doel), `clubnumber`, `position`, senior
     club-wedstrijden/-doelpunten en senior interlands.
   - **Wikimedia Commons**: licentie, maker, licentie-URL en de waarschuwing `Restrictions: personality`.
   - Club **bevestigd** = Wikipedia en Wikidata noemen dezelfde huidige club; anders **afwijkend** (waarschuwing).
   - **Inactief** = geen huidige profclub in de zeven competities (gestopt, trainer, clubloos, andere competitie).
   - In de bouwomgeving was Wikimedia geblokkeerd; de run van 2-11-2026 is daarom als geplakt script in een
     browser op wikidata.org gedaan en compact geëxporteerd (`data/sync-2026-11-02.jsonl`, kolommen in
     `jsonl-to-sync.mjs`). In Node 22 kan `runSync({ fetch, lock, today })` rechtstreeks worden aangeroepen.
2. **`jsonl-to-sync.mjs`** zet die compacte export om naar `data/sync-<datum>.json`.
3. **`finalize.mjs`** schrijft de engine-catalogus en de registers, met deze harde regels:
   - een bestaand **slot** (p0001…) blijft aan dezelfde Wikidata-QID gekoppeld — anders breekt de run af
     (`MIGRATIEFOUT`); slots worden nooit hergebruikt; nieuwe spelers krijgen nieuwe slots;
   - bestaande edities (Electric/Toetsweek/Seizoen/Legend/S01) staan in `packages/engine/src/catalog-lock.generated.ts`
     (245 kaarten, de live catalogus van vóór ronde 15) en nieuwe edities in `NEW_EDITIONS` — beide blijven altijd staan;
   - de rating van een bestaand slot verandert per sync met hooguit **±5**;
   - foto's alleen met een vrije licentie (CC0, publiek domein, CC BY, CC BY-SA) **én** de spelersnaam in de
     bestandsnaam (groepsfoto's en foto's van anderen vallen af).

```bash
node tools/real-players/jsonl-to-sync.mjs tools/real-players/data/sync-2026-11-02.jsonl tools/real-players/data/sync-2026-11-02.json
node tools/real-players/finalize.mjs tools/real-players/data/sync-2026-11-02.json
npm test   # o.a. catalog-lock.test.ts en catalogus-migratie.test.ts bewaken de identiteiten
```

## Ratingformule `rank11-rating-v2.1` (eigen, gedocumenteerd)

Signalen 0..1, gewogen per positiegroep (zie `RATING` in `sync.mjs`):

| Signaal | Berekening |
|---|---|
| clubniveau | elite 1,00 · sterk 0,80 · overig 0,58 (tabel in `sync.mjs`) |
| output | doelpunten per wedstrijd / referentie per groep (GK 0,03 · DEF 0,14 · MID 0,30 · FWD 0,55) |
| interlands | senior caps / 60, × 0,65 buiten de sterkste voetballanden |
| bekendheid | log(aantal Wikipedia-taalversies), 8 → 0 en 140 → 1 |
| ervaring | senior club-wedstrijden / 250 |

Leeftijd: < 20 −0,01; 32–33 −0,03; 34+ −0,07. Ruwe rating = 55 + 42,5 × composiet. Daarna **kalibratie** op
percentielen van de hele actieve pool (n = 1.265 op 2-11-2026), zodat er genoeg brons en zilver bestaat
(tabel `CALIBRATION` in `finalize.mjs`). Zeldzaamheid: < 65 brons, 65–74 zilver, 75+ goud, 'Rare' per kaart-id vastgelegd.

## Bekende beperkingen

- Wikipedia/Wikidata kunnen achterlopen op zeer recente transfers; een afwijking staat als waarschuwing in BRONNEN.md.
- Rugnummers komen vrijwel altijd alleen uit de Wikipedia-infobox (Wikidata heeft ze zelden); bij een conflict wordt geen nummer getoond.
- Links/rechts bij vleugelspelers en backs staat niet altijd in de bronnen; dan is de kant afgeleid (waarschuwing "kant").
- De oude scripts `build-identities.mjs` en `enrich-rate.mjs` (ronde 13) zijn vervangen door `sync.mjs`; ze blijven
  alleen ter documentatie staan.
