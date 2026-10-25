# RANK11. — Cijferengine

**Stand:** 25-10-2026 · **Code:** `packages/engine/src/grades.ts`, `stats.ts`, `gradebook.ts`, `goals.ts` · **Tests:** `packages/engine/test/grades*.test.ts`, `stats-goals.test.ts`

Alle functies zijn puur: ze krijgen een lijst cijfers en geven een uitkomst terug. Niets wordt opgeslagen. Dezelfde code draait in de web-app en in de API.

## 1. Het cijfer

```ts
interface Grade {
  id: string; subjectId: string; periodId?: string;
  testName: string; value: number; weight: number;
  date: string;            // JJJJ-MM-DD, datum van de toets
  status: 'registered' | 'verified' | 'simulated';
  source: 'manual' | 'confirmed' | 'magister';
  externalRef?: string;    // stabiele sleutel uit een externe bron
}
```

- **Schaal:** `DUTCH_SCALE = { min: 1, max: 10, pass: 5.5, maxWeight: 10 }`.
- **Zelf ingevoerd:** in de app krijgt ieder cijfer `status: 'registered'`, `source: 'manual'`. Er is bewust geen goedkeuringsstap (besluit Martijn, beurt 3). De UI toont het label "zelf ingevoerd". `verified` en `confirmed` bestaan in het type voor een eventuele latere bron, maar worden nu niet gebruikt.
- **Gesimuleerd:** `status: 'simulated'` telt nergens mee. Alle statistiekfuncties filteren die cijfers eruit.

### Validatie (`validateGrade`)

Een cijfer wordt geweigerd als:

| Regel | Melding |
|---|---|
| `value` buiten 1–10 of geen getal | "Cijfer moet tussen 1 en 10 liggen." |
| meer dan twee decimalen | "Cijfer mag maximaal twee decimalen hebben." |
| `weight` ≤ 0 of > 10 | "Weging moet groter dan 0 en hooguit 10 zijn." |
| datum niet `JJJJ-MM-DD` | "Datum ontbreekt of is ongeldig." |
| datum na vandaag | "Een cijfer kan niet in de toekomst liggen." |
| vak of toetsnaam leeg | "Vak ontbreekt." / "Toetsnaam ontbreekt." |

### Ontdubbelsleutel (`gradeKey`)

- Met externe referentie: `ext:<source>:<externalRef>`.
- Anders: `toets:<subjectId>:<genormaliseerde toetsnaam>:<datum>`. Normaliseren = kleine letters, accenten weg (NFKD), alles behalve `a-z0-9` wordt een spatie, trimmen.
- "SO Ecologie" en "so  ecologie" op dezelfde dag en hetzelfde vak geven dus dezelfde sleutel.

De sleutel wordt gebruikt voor dubbele invoer (cijferboek), voor de kaartbeloning (`computeReward.previous`) en voor XP (`perf:<gradeKey>`).

## 2. Cijferboek als eventlog (`gradebook.ts`)

```ts
type GradeEvent =
  | { type: 'add'; at; grade }
  | { type: 'correct'; at; gradeId; changes: Partial<value|weight|testName|date|subjectId>; reason? }
  | { type: 'delete'; at; gradeId; reason? };
```

- `applyGradeEvents(events)` speelt alle events af en geeft `{ grades, history }`. De huidige cijferlijst wordt nooit los opgeslagen.
- `history` per cijfer: `add` (na), `correct` (voor en na, reden), `delete` (voor, reden). Een verwijderd cijfer verdwijnt uit `grades`, maar blijft in `history`.
- `GradebookError` bij een tweede `add` met hetzelfde id, of bij `correct`/`delete` van een cijfer dat niet (meer) bestaat.
- `checkNewGrade(book, grade)` = `validateGrade` + zoeken naar een bestaand cijfer met dezelfde `gradeKey`. Bij een dubbel: "Deze toets staat al in je cijferlijst. Pas hem aan in plaats van hem opnieuw in te voeren."
- Een correctie wordt in de web-app gecontroleerd met hetzelfde `checkNewGrade`, maar dan tegen de lijst zonder het cijfer zelf.

## 3. Gemiddelden (`grades.ts`)

| Functie | Formule |
|---|---|
| `weightedAverage(list)` | Σ(cijfer × weging) / Σ weging; `null` bij geen cijfers |
| `subjectAverages(list)` | `weightedAverage` per vak |
| `overallAverage(list, subjects?)` | gemiddelde van de **vakgemiddelden** (ieder vak telt even zwaar) |
| `compareAverages(a, b, ε = 0,005)` | verschil en richting `up` / `down` / `flat` |
| `unweightedAverage(list)` (`stats.ts`) | gewoon gemiddelde van de cijfers |

## 4. Statistieken (`stats.ts`)

| Functie | Wat | Details |
|---|---|---|
| `chronological` | Echte cijfers op toetsdatum | Bij gelijke datum op id (deterministisch) |
| `runningAverages` | Gewogen gemiddelde na iedere toets | Basis voor grafieken en trends |
| `movingAverage(list, window = 3)` | Ongewogen gemiddelde over de laatste `window` cijfers | |
| `gradeImpacts` | Verandering van het vakgemiddelde per toets | Eerste toets: `before = null`, `delta = 0` |
| `inPeriod`, `periodAverages(list, periods)` | Per periode: aantal, algemeen gemiddelde, vakgemiddelden | |
| `extremes` | Hoogste en laagste cijfer | |
| `distribution` | Aantal per klasse | onder 5 · 5,0–5,4 · 5,5–6,4 · 6,5–7,4 · 7,5–8,4 · 8,5–10 |
| `passRate` | Aandeel cijfers ≥ 5,5 | `null` bij geen cijfers |
| `countPerSubject` | Aantal per vak | |
| `heavyTestInfluence(list, drempel = 3)` | Aandeel zware toetsen in de totale weging, gemiddelde met en zonder | |
| `trend(list, { recent = 2, minTotal = 3, epsilon = 0,1 })` | Gemiddelde nu min gemiddelde vóór de laatste `recent` toetsen | Minder dan `minTotal` cijfers → `insufficient` met reden "Minimaal 3 cijfers nodig." in plaats van een misleidende pijl. `|delta| < 0,1` → `flat` |
| `examWeekResults(list, weeks)` | Per toetsweek: aantal, gewogen gemiddelde, voldoendes | |
| `personalRecords` | Hoogste cijfer, beste vakgemiddelde, grootste sprong (grootste positieve `gradeImpact`), langste reeks voldoendes op rij | Afgeleid, nooit opgeslagen |

## 5. Wat-als en benodigd cijfer

- `whatIf(list, { subjectId, value, weight })` (`grades.ts`): één gesimuleerde toets; vak- en algemeen gemiddelde voor en na.
- `whatIfMany(list, future[])` (`stats.ts`): meerdere toekomstige cijfers tegelijk, ook over verschillende vakken. Gesimuleerde cijfers krijgen tijdelijk een id `__sim<i>` en tellen alleen binnen deze berekening.
- `compareScenarios(list, scenarios)`: dezelfde berekening per opgeslagen scenario. De app bewaart maximaal 6 scenario's.
- `requiredForTarget(list, vak, doel, wegingen[])`:
  - `raw = (doel × (Σw + Σtoekomst) − Σ(cijfer × w)) / Σtoekomst` — één gelijk cijfer op alle opgegeven toetsen;
  - status `unreachable` als `raw > 10`, `secured` als `raw ≤ 1`, anders `reachable`;
  - **afronding naar boven** op één decimaal: `ceil(raw × 10 − 1e-9) / 10`. Een benodigde 7,76 wordt dus 7,8, nooit 7,7.
  - Zonder toekomstige weging: fout "Minstens één toekomstige toets met weging nodig."
- `requiredGrade` (`grades.ts`) is de oudere variant met één toets, zonder afronding.

Voorbeelden uit `stats-goals.test.ts` (vak met Σ(cijfer × w) = 20 en Σw = 3):
- doel 8,5 met twee toetsen van weging 3 → (8,5 × 9 − 20) / 6 = 9,42 → **9,5** (`reachable`);
- doel 9 met dezelfde toetsen → (81 − 20) / 6 = 10,2 → `unreachable`;
- doel 7,1 met één toets van weging 1 → benodigd **8,4** (naar boven afgerond).

## 6. Doelen en aankomende toetsen (`goals.ts`)

```ts
interface Goal { id; scope: 'subject' | 'overall'; subjectId?; target; createdAt }
interface UpcomingTest { id; subjectId; name; date; weight }
```

- `goalCurrent`: vakgemiddelde of algemeen gemiddelde.
- `goalProgress`: huidig, gat tot doel, bereikt (met tolerantie 1e-9), voortgang 0–1 ten opzichte van het gemiddelde bij het aanmaken. Voor een vakdoel met een geplande toets ook het benodigde cijfer voor die eerstvolgende toets.
- `goalReachedBy`: het eerste cijfer na `createdAt` waarna het gemiddelde ≥ doel is. **Was het doel bij het aanmaken al gehaald, dan `null`**: zo levert het instellen van een doel dat je al haalt geen beloning op.
- In de app vervangt een nieuw doel voor hetzelfde vak (of algemeen) het oude. Geplande toetsen moeten vanaf vandaag liggen, een naam hebben en een weging tussen 0 en 10.

## 7. Perioden

`apps/web/src/state/school.ts` bevat een **voorbeeldindeling** (scholen verschillen):

| Periode | Van | Tot |
|---|---|---|
| Periode 1 | 2026-08-24 | 2026-10-09 |
| Periode 2 | 2026-10-12 | 2026-12-18 |
| Periode 3 | 2027-01-04 | 2027-03-26 |
| Periode 4 | 2027-03-29 | 2027-07-09 |

`currentPeriod(vandaag)` valt terug op de laatst begonnen periode als vandaag in een vakantie valt. In de functionele fase hoort de indeling bij de poolinstellingen.

## 8. Wat de cijferengine níet doet

- Geen afronding van gemiddelden in opslag; afronden gebeurt alleen bij weergave (`formatGrade`, `fmt`).
- Geen schoolspecifieke regels (herkansingen die een cijfer vervangen, cijfers die niet meetellen, SE/PTA-weging). Een herkansing voer je nu in als correctie of als een eigen toets.
- Geen controle of een ingevoerd cijfer echt klopt. Eerlijkheid rust op: geen ranglijst op ruwe cijfers, plafonds, geschiedenis van iedere wijziging en de Grade League op gemiddelde en vooruitgang (zie `GAME-DESIGN.md`).
