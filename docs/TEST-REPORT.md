# Testrapport — ronde 3 (nacht 25 op 26 oktober 2026)

Het oudere `TESTRAPPORT.md` beschrijft ronde 1 en 2. Dit bestand geeft de actuele stand.

Statusladder: GEBOUWD → OFFLINE GETEST → PRAKTIJKGETEST → LIVE GECONTROLEERD. Niets in dit rapport is praktijkgetest op echte toestellen of live gecontroleerd.

## Geautomatiseerde tests

`npm test` in de root draait de engine en de API. Laatste run: **188 engine-tests en 44 API-tests, alles groen.**

| Testbestand | Tests | Wat |
|---|---:|---|
| engine `grades.test.ts` | 22 | gewogen gemiddelden, validatie, wat-als, benodigd cijfer, gradeKey |
| engine `stats-goals.test.ts` | 23 | statistieken, trend met minimum, perioden, records, doelen, cijferboek, inzichten |
| engine `motivation-academy.test.ts` | 23 | XP-categorieën, plafonds, idempotentie, correctie/verwijdering, achievements, HMAC, Academy-regels, Grade League |
| engine `rewards.test.ts` | 20 | beloningstiers, limieten, correcties, configuratieversie |
| engine `catalog-packs.test.ts` | 13 | catalogus, packkansen, seeds |
| engine `squad-draft.test.ts` | 12 | chemie, teamrating, draft, garanties |
| engine `market.test.ts` | 3 | transfermarkt: atomaire koop, invarianten, prijsband, afkoelperiode |
| engine `simulate.test.ts` | 3 | garantie houdt stand, packkansen kloppen, economieprofielen |
| engine `competition/*` | 69 | battle (26), ranglijst (11), schema's (24), toernooi (8) |
| api (7 bestanden) | 44 | auth 13, pools 6, wedstrijden 5, competities 3, cijfers 8, collectie/packs 6, MatchDO-kern 3 |

**Flaky test gevonden en opgelost:** een API-test faalde ongeveer 1 op 4 keer. Bij twee toetsen op dezelfde datum hangt de volgorde af van willekeurige id's, waardoor "herstel na onvoldoende" soms wel en soms niet gold. De test gebruikt nu verschillende datums: 8 van 8 runs groen. Het onderliggende punt staat als T8 in `OPEN-ISSUES.md`.

Typecheck: engine, web en api zonder fouten.

## Doorlopen in de browser (Playwright, Chromium)

| Doorloop | Resultaat |
|---|---|
| Cijfer invoeren → dubbel invoeren → ongeldig cijfer → kluis openen (ingedrukt houden) → beloning → corrigeren → geschiedenis → verwijderen | Geslaagd, geen paginafouten. XP-ledger nagerekend: 8,6 met weging 2 gaf +110 Prestatie en +40 Vooruitgang; correctie naar 9,1 gaf +40 (alleen het verschil); verwijderen gaf −150 en −40. |
| Academy: te snel, normaal tempo, herkansing goed beantwoord | Geslaagd met nagebootste klok: te snel = 0 XP, normaal = +20, verbeterde fout = +25. |
| RANK League: battle volledig uitspelen tegen de computer | Geslaagd; uitslag verschijnt in de stand, battle te hervatten. |
| Overflow-audit: 17 routes × 8 schermmaten (360×740, 375×667, 390×844, 430×932, 844×390, 740×360, 820×1180, 1180×820) | Geen horizontale overloop, geen paginafouten. |
| Gebouwde reviewpreview (single-file plus portretbestanden) lokaal geserveerd | Geen paginafouten, geen mislukte verzoeken. |
| Elftal op 320 px | Na aanpassing geen overlap meer tussen keeper en verdedigers. |

## Balanssimulaties

Zie `docs/SIMULATIES.md`: 10.000 drafts, 10.000 packs per packtype en economieprofielen. Daaruit volgden twee bevindingen:

- de getoonde draftkansen weken af van de werkelijkheid; dit is aangepast en wordt nu transparant getoond;
- de kaarteconomie is scheef ten nadele van leerlingen die moeite hebben (V-011).

## Niet getest

- Echte toestellen (iOS Safari, Android Chrome), schermlezers en het installeren als PWA.
- De server tegen een echte Cloudflare-omgeving; er is alleen lokaal getest met `wrangler dev --local` en een D1-shim.
- De web-app tegen de server (nog niet gekoppeld).
- Lasttest en meerdere gelijktijdige gebruikers.
