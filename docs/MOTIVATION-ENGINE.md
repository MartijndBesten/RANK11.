# RANK11. — Motivatie-engine

**Stand:** 25-10-2026 · **Code:** `packages/engine/src/motivation.ts`, `achievements.ts`, `academy.ts` (Academy-XP) · **Config:** `DEFAULT_MOTIVATION_CONFIG`, versie `2026.10-motivatie.1` · **Tests:** `packages/engine/test/motivation-academy.test.ts`

## 1. Doel

Belonen wat leren bevordert — verbetering, herstel na een tegenvaller, doelen halen en oefenen — en niet alleen hoge cijfers. Zonder streaks, loginbeloningen of verliesangst. De onderbouwing staat in `docs/onderzoek/VERGELIJKBARE-APPS.md` (o.a. C2 zacht degraderen, C3 plafond op oefenpunten, C4 fouten herstellen, C6 geen snelheidsbonus, C7 inputs zwaarder dan absolute cijfers, C8 geen streaks).

## 2. Drie XP-soorten

Elke soort wordt apart berekend en apart begrensd. Het totaal (som) bepaalt het clubniveau.

| Soort | Waarvoor | Bron |
|---|---|---|
| **Prestatie-XP** (`performance`) | een behaald schoolcijfer | `gradeXp` |
| **Vooruitgang-XP** (`progress`) | hoger vakgemiddelde, herstel na een onvoldoende, bereikt doel | `gradeXp` |
| **Academy-XP** (`academy`) | afgeronde oefenactiviteit met leerwaarde | `academyReward` |

## 3. Configuratie (exacte waarden, versie `2026.10-motivatie.2`)

**Prestatie**

| Instelling | Waarde |
|---|---|
| Per cijfer | 50 XP |
| Bonus (alleen de hoogste die geldt) | ≥ 7: +30 · ≥ 8: +60 · ≥ 9: +100 |
| Plafond per dag / per week | 450 / 1500 XP |

Een 6,4 levert dus 50 XP, een 7,0 80 XP, een 8,6 110 XP en een 9,6 150 XP. Ook een onvoldoende levert 50 XP: invoeren loont altijd, zodat er geen reden is om een slecht cijfer weg te laten.

**Vooruitgang**

| Instelling | Waarde |
|---|---|
| Vakgemiddelde stijgt ≥ 0,2 door dit cijfer | 40 XP |
| Herstel: vorig cijfer in het vak < 5,5, dit cijfer ≥ 5,5 én ≥ 1,5 hoger | 80 XP |
| Persoonlijk doel bereikt | 100 XP + pack `gold` (Goudpack) |
| Plafond per dag / per week | geen dagplafond / 700 XP |

**Academy** (zie `ACADEMY-INTEGRATION.md` voor de beslisregels)

| Instelling | Waarde |
|---|---|
| Eerste keer afgerond | 20 XP |
| Score ≥ 80% | +30 XP |
| Eerder foute vraag nu goed | 25 XP per vraag, max. 4 per activiteit |
| Herhaling met ≥ 10 procentpunt beter dan ooit | 15 XP (na ≥ 20 uur sinds de vorige poging) |
| Minimale duur | geen (sinds `2026.10-motivatie.2`, V-016); het veld `minSecondsPerQuestion` blijft bestaan en staat op 0 |
| Afronding met vragenset-sleutel (`contentKey`) | één keer per activiteit per dag; een identieke vragenset levert niets op |
| Plafond per dag / per week | 150 / 600 XP |

**Levels:** niveau 1 → 2 kost 250 XP; ieder volgend niveau ×1,18 (afgerond). `clubLevel(totaal)` geeft niveau, XP in het huidige niveau en de benodigde XP.

## 4. De XP-ledger

```ts
interface XpEntry {
  key: string;            // idempotente sleutel
  category: 'performance' | 'progress' | 'academy';
  xp: number;             // kan negatief zijn (correctie)
  label: string;          // bijv. "Cijfer 8,6", "Herstel na onvoldoende"
  date: string;           // telt voor dag-/weekplafond (JJJJ-MM-DD)
  source: { kind: 'grade' | 'goal' | 'academy' | 'correction' | 'deletion'; id: string };
  configVersion: string;
  cappedBy?: number;      // hoeveel XP door een plafond niet is toegekend
  packId?: string;        // bijv. doelpack
}
```

Sleutels:

| Toekenning | Sleutel |
|---|---|
| Cijfer | `perf:<gradeKey>` |
| Gemiddelde omhoog | `prog-impr:<gradeKey>` |
| Herstel | `prog-herstel:<gradeKey>` |
| Doel bereikt | `doel:<goalId>` |
| Correctie (bijschrijving) | `perf-corr:<gradeKey>:<nieuwe waarde>` |
| Verwijdering | `del:<gradeKey>` (en `del:<gradeKey>:<categorie>` voor de tweede categorie) |
| Academy | `acad:<eventId>:af` / `:score` / `:beter` / `:fouten` |

### Plafonds (`applyCaps`)

- Een sleutel die al in de ledger staat, wordt overgeslagen (idempotent).
- Positieve regels worden afgekapt op de resterende ruimte: `min(dagplafond − al vandaag, weekplafond − al deze week)`. De week begint op maandag (`weekStart`). De rest staat in `cappedBy`, zodat de UI kan uitleggen waarom.
- Negatieve regels (correcties) gaan altijd door.

### Bijzondere gevallen

- **Dezelfde toets opnieuw invoeren** levert niets op: bestaat `perf:<gradeKey>` al (ook als het cijfer daarna verwijderd is), dan geeft `gradeXp` een lege lijst. Het cijferboek weigert de dubbele invoer bovendien al.
- **Correctie** (`correctionXp`): alleen als het nieuwe Prestatie-bedrag hoger is dan wat er voor deze toets al is toegekend, wordt het verschil bijgeschreven. Een lagere correctie kost geen XP. Vooruitgang-XP wordt bij een correctie niet opnieuw berekend.
- **Verwijdering** (`deletionXp`): alle XP die aan dat cijfer hing (behalve doel-XP) wordt teruggedraaid met negatieve regels per categorie. Packs die al zijn gegeven of geopend, blijven van de speler.
- **Simulaties** (`status: 'simulated'`) leveren nooit XP op.

In de web-app worden XP alleen toegekend bij het openen van de kluis; zolang een cijfer daar wacht, hebben correctie en verwijdering geen XP-effect.

## 5. Volgende beloningen (`nextRewards`)

Voor de eerstvolgende maximaal 4 geplande toetsen: "Haal een {drempel} of hoger" → het pack van de eerste beloningstier met een pack of spelerskeuze en een drempel ≥ 7,5 (in de huidige config: 7,5 → Toetsweekpack + draft-voucher). Voor vakdoelen met een geplande toets: het benodigde cijfer en "Goudpack + 100 Progress XP". Onhaalbare doelen worden niet getoond. Home toont de eerste drie.

## 6. Achievements (`achievements.ts`)

Afgeleid uit de gegevens, nooit los opgeslagen (geen inconsistentie, geen migratie). Bewust **geen** achievements voor inloggen of reeksen dagen.

| Id | Titel | Voorwaarde |
|---|---|---|
| `eerste-cijfer` | Aftrap | eerste cijfer ingevoerd |
| `tien-cijfers` | Basisspeler | tien cijfers |
| `negen` | Wereldgoal | een 9 of hoger |
| `alles-voldoende` | Clean sheet | ≥ 3 vakken en alle vakgemiddelden ≥ 5,5 |
| `comeback` | Comeback | na een onvoldoende een voldoende die ≥ 1,5 hoger is (binnen een vak) |
| `klimmer` | Klimmer | drie keer op rij een hoger cijfer binnen een vak |
| `eerste-doel` | Doelpunt | een persoonlijk doel bereikt |
| `hattrick` | Hattrick | drie doelen bereikt |
| `academy-eerste` | Trainingskamp | een oefentoets afgerond |
| `academy-fouten` | Analist | tien eerder foute antwoorden verbeterd |

Academy-achievements worden in de app alleen getoond als Academy aan staat.

## 7. Verhouding tot de kaarteconomie

XP is los van coins, packs en vouchers. Die laatste komen uit de beloningsconfiguratie (`rewards.ts`, zie `REWARD-ECONOMY.md`). In de web-app wordt de XP uit `computeReward` genegeerd en vervangen door de motivatie-XP. **Let op:** de lokale API (`apps/api/src/modules/grades.ts`) kent nog XP toe via `computeReward`; dat moet worden gelijkgetrokken.

## 8. Bekende punten

- Prestatie-XP beloont nog steeds hoge cijfers sterker (50 vs 150 XP). Vooruitgang-XP compenseert deels, maar alleen voor wie al eerdere cijfers in het vak heeft.
- Academy: herkansingsvragen leveren XP op zodra ze goed zijn, ook direct in de volgende sessie. Het onderzoek (C4) adviseert een interval; dat zit nog niet in de engine (alleen de score-verbeterbonus heeft een wachttijd van 20 uur).
- In de demo-oefenmodule heeft iedere sessie van een vak dezelfde `activityId`; de 20 XP voor "eerste keer afgerond" komt dus één keer per vak.

## 9. Wijziging 26-10-2026 (V-016 en V-011)

- **Geen verplichte minimumtijd per vraag.** Echte voortgang wordt beloond en herhaald farmen wordt voorkomen. Afronding telt met een vragenset-sleutel één keer per activiteit per dag. Een identieke vragenset levert niets op. Een betere score levert alleen XP op boven je beste score ooit, met een wachttijd van 20 uur. XP voor een verbeterde fout krijg je alleen voor een echte herkansing in een latere sessie (zie `practice.ts`). De plafonds per dag en per week blijven gelden.
- **Kaarten voor vooruitgang:** de motivatie-engine geeft XP. De voortgangslaag `progressRewards` (`economy.ts`) geeft voor dezelfde soorten prestaties ook packs en vouchers. Zie `REWARD-ECONOMY.md` §9.
