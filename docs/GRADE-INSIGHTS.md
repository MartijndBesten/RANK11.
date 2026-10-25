# RANK11. — Cijferinzichten

**Stand:** 25-10-2026 · **Code:** `packages/engine/src/insights.ts` (`generateInsights`) · **Getoond op:** Home (top 3) en Cijfers › Overzicht (top 6)

## Uitgangspunten

- **Regels, geen voorspellingen.** Ieder inzicht volgt rechtstreeks uit de ingevoerde cijfers, doelen en geplande toetsen. Er is geen model en geen gokwerk; daarom staat er in de app "regels, geen gokwerk".
- **Alleen bij genoeg gegevens.** Elke regel heeft een minimum. Te weinig cijfers betekent geen inzicht, niet een gok.
- **Toon en woordkeus.** Positief waar het kan, concreet waar het moet (welk cijfer, welke toets). Een onvoldoende krijgt altijd een herstelpad als er een toets gepland is.
- **Prioriteit.** Elk inzicht heeft een `priority`; de lijst wordt aflopend gesorteerd. Toon: `positive`, `info` of `attention` (in de UI: groen, blauw of oranje stip).
- **Vaknamen in een zin.** Talen houden hun hoofdletter (Engels, Nederlands, Frans, Duits, Spaans, Latijn, Grieks, Arabisch, Turks, Chinees); andere vakken worden met kleine letter geschreven ("je gemiddelde voor wiskunde").
- Getallen worden met één decimaal en komma getoond (`formatGrade`).

## De regels

| # | Regel (`rule`) | Voorwaarde | Toon | Prioriteit |
|---|---|---|---|---|
| 1 | `period-change` | Vandaag ligt in een periode die een vorige periode heeft; het vak heeft in **beide** perioden minstens 2 cijfers; verschil van de gewogen gemiddelden ≥ 0,3 | positief bij stijging, aandacht bij daling | 60 (stijging) / 70 (daling) |
| 2 | `heavy-test` | Geplande toets vanaf vandaag in een vak met al cijfers, met weging ≥ 3 **of** ≥ 30% van de totale vakweging (inclusief deze toets) | info | 80 |
| 3 | `goal-achieved` | Doel met een huidig gemiddelde ≥ doel | positief | 50 |
| 4 | `goal-near` | Doel nog niet gehaald, gat ≤ 0,2 | positief | 75 |
| 5 | `goal-required` | Vakdoel nog niet gehaald en er is een geplande toets voor dat vak | info; aandacht als onhaalbaar | 85 |
| 6 | `trend-up` | Vak met minstens 3 cijfers, `trend` omhoog en delta ≥ 0,15 | positief | 55 |
| 7 | `below-pass` | Vakgemiddelde < 5,5 | aandacht | 90 |
| 8 | `comeback` | Laatste cijfer van een vak ≥ 5,5 en minstens 1,5 hoger dan een eerdere onvoldoende in dat vak | positief | 65 |
| 9 | `best-subject` | Minstens 2 vakken met elk ≥ 2 cijfers; het hoogste vakgemiddelde | positief | 30 |

Een dalende trend is bewust geen apart inzicht: dalingen verschijnen via `period-change` (alleen bij voldoende gegevens) en `below-pass` (alleen onder de voldoendegrens, met herstelpad). Op Home staan stijgers en dalers wel in het blok "In vorm", op basis van `trend`.

## Zinnen

Letterlijke sjablonen uit de code. `{…}` wordt ingevuld.

1. **Periodeverandering**
   "Je staat deze periode voor {vak} gemiddeld {nu}. Dat is {verschil} {hoger|lager} dan vorige periode."
2. **Zware toets**
   "Je volgende toets {vak} ({toets}) telt {één keer|twee keer|drie keer|vier keer|n keer} mee en heeft daarom veel invloed: met een 8 kom je op {gem. na 8}, met een 5 op {gem. na 5}."
   De twee scenario's worden berekend met `whatIfMany`.
3. **Doel gehaald**
   "Doel gehaald: {vak|je algemene gemiddelde} staat op {nu} (doel {doel})."
4. **Doel bijna**
   "Je hebt voor {vak} je persoonlijke doel bijna bereikt: nog {gat} te gaan."
5. **Benodigd cijfer voor een doel** (op basis van `requiredForTarget` met alleen de eerstvolgende toets)
   - haalbaar: "Voor je doel van {doel} heb je bij de volgende toets {vak} met weging {w} minimaal een {benodigd} nodig."
   - al binnen: "Je doel van {doel} voor {vak} blijft staan, wat je ook haalt voor de volgende toets."
   - onhaalbaar: "Je doel van {doel} voor {vak} is met alleen de volgende toets (weging {w}) niet haalbaar. Na nog een paar goede toetsen wel."
6. **Stijgende trend**
   "Je gemiddelde voor {vak} is gestegen na je laatste {toets|n toetsen} (+{delta})."
7. **Onder de voldoendegrens**
   - zonder geplande toets: "{Vak} staat op {gem}. Dat kun je nog ophalen."
   - met geplande toets, en een voldoende is met één toets bereikbaar: "{Vak} staat op {gem}. Met een {benodigd} voor {toets} (weging {w}) kom je weer op een voldoende."
   Het benodigde cijfer wordt naar boven afgerond op één decimaal en is minimaal 1. Is het hoger dan 10, dan blijft de eerste zin staan.
8. **Herstel**
   "Sterk herstel bij {vak}: van een {onvoldoende} naar een {laatste}."
9. **Sterkste vak**
   "Je sterkste vak is nu {vak} met een {gem}."

## Voorbeeld uit de demo-data

Met de demo-startset (Frans 5,9 met doel 6,0; geplande toets Frans weging 2; Engelse toets weging 2) toont Home onder meer:

- "Voor je doel van 6,0 heb je bij de volgende toets Frans met weging 2 minimaal een 6,2 nodig."
- "Je volgende toets Engels (Grammar test Unit 4) telt twee keer mee en heeft daarom veel invloed: met een 8 kom je op 8,1, met een 5 op 7,1."

(Waarden afhankelijk van de datum: de demo plant toetsen relatief aan vandaag.)

## Grenzen en bekende beperkingen

- Inzichten gebruiken **alle** echte cijfers, ook die waarvan de beloning nog in de kluis wacht (ze zijn ingevoerd en tellen dus mee).
- `period-change` werkt alleen met de voorbeeldindeling in `state/school.ts`; zonder vorige periode verschijnt dit inzicht niet.
- Er is geen ontdubbeling tussen inzichten over hetzelfde vak (bijv. `goal-near` en `goal-required` kunnen samen verschijnen). Bewust: ze zeggen iets anders.
- Teksten zijn alleen Nederlands.
- Er zijn geen inzichten op basis van Academy-gegevens; `academySubjectSummary` bestaat wel in de engine (zie `ACADEMY-INTEGRATION.md`).
