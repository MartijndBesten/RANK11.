# RANK11. — Beloningseconomie

**Stand:** 26-10-2026 · **Code:** `packages/engine/src/rewards.ts`, `economy.ts`, `starter.ts`, `packs.ts`, `draft.ts`, `market.ts`, `simulate.ts`; snel verkopen in `apps/web/src/state/store.tsx` · **Simulaties:** `docs/SIMULATIES.md` (`node --experimental-transform-types tools/sim/balans.ts`)

> **Economie v3 "positief en haalbaar" (ronde 5, 26-10-2026):** zie §10. App en server gebruiken `CURRENT_REWARD_CONFIG` = `ACHIEVABLE_REWARD_CONFIG` (`2026.10-haalbaar.1`) en `CURRENT_PROGRESS_CONFIG` = `ACHIEVABLE_PROGRESS_CONFIG` (`2026.10-voortgang.2`), met motivatie `2026.10-motivatie.4`. Economie v2 (§9) en de oude configuratie (§2) staan nog in de engine ter vergelijking in de simulaties; bestaande toekenningen behouden hun configuratieversie.

## 1. Spelregels voor de economie

- **Geen echt geld.** Coins zijn spelvaluta en zijn niet te koop. Er bestaan geen betaalde packs, boosts of abonnementen.
- **Kansen zijn zichtbaar** bij iedere pack en iedere draft, inclusief de gemeten kansen voor de draft.
- **XP staat los van de kaarteconomie.** XP komt uit de motivatie-engine (`MOTIVATION-ENGINE.md`). Coins, packs, vouchers en spelerskeuzes komen uit de beloningsconfiguratie hieronder.
- **Niets verloopt en niets gaat verloren** door wegblijven. Er zijn geen tijdgebonden aanbiedingen.

## 2. Beloning per cijfer (`DEFAULT_REWARD_CONFIG`, versie `2026.10-proto.1`) — vervangen door §9

| Tier | Vanaf | Coins | Pack | Extra | (XP in config*) |
|---|---|---:|---|---|---:|
| Herstelkans | 1,0 | 0 | — | herstelchallenge (alleen tekst in de UI) | 15 |
| Voldoende | 5,5 | 150 | Starterspack | | 50 |
| Goed | 6,5 | 250 | Goudpack | | 90 |
| Sterk | 7,5 | 400 | Toetsweekpack | 1 draft-voucher | 140 |
| Uitstekend | 8,5 | 600 | Elitepack | 1 draft-voucher | 200 |
| Legendarisch | 9,5 | 900 | — | spelerskeuze 1 uit 3 (rating 90+), 1 draft-voucher | 300 |

\* De web-app gebruikt deze XP niet meer, maar die van de motivatie-engine. De lokale API gebruikt ze nog wel (open punt).

Overige regels:
- **Grote verbetering:** stijgt het vakgemiddelde door dit cijfer ≥ 0,25, dan +200 coins (en +60 XP in de config).
- **Weging:** +20 XP (config) per wegingspunt boven 1, alleen bij een voldoende. `tierBumpFromWeight` staat uit (`null`).
- **Limieten:** maximaal 4 beloonde cijfers per dag en 12 per week. Daarboven: status `capped`; het cijfer telt wel mee in het gemiddelde.
- **Correcties:** `topup`. Bij een correctie naar een hogere tier wordt alleen het verschil bijgeschreven; een gelijke of lagere tier levert niets op (`duplicate`).
- **Onvoldoende:** status `support`. Geen pack en geen vouchers; wel de herstelchallenge-tekst.
- `unverifiedMaxTierId` staat op `null`: zelf ingevoerde cijfers krijgen dezelfde tiers als bevestigde.
- **Doel bereikt** (motivatie-engine): extra Goudpack.

## 3. Packs (`PACKS`)

| Pack | Inhoud | Prijs in coins |
|---|---|---:|
| Starterspack | 3 kaarten; per kaart Brons 60 / Zilver 36 / Goud 4 | 750 |
| Goudpack | 4× goudbasis + topkaart (Goud 80-84: 78 · Goud 85+: 19 · speciaal: 3) | 5000 |
| Toetsweekpack | 4× goudbasis + toetsweekkaart (Rare of goud 84+: 70 · Toetsweek-editie: 20 · Electric: 8 · Legendary: 2) | niet te koop |
| Elitepack | 2× (Goud 85+: 80 · speciaal 85+: 20) + elitekaart (speciaal 88+: 74 · Topper 90+: 20 · Legendary: 6) | niet te koop |

Goudbasis per kaart: Goud 75-79: 68 · Goud 80-84: 24 · Goud 85+: 7 · speciaal: 1. In één pack zit nooit twee keer dezelfde speler. `oddsTable` geeft per categorie de kans per kaartplek en de kans op minstens één; die tabel staat in de app.

Gemeten in 10.000 packs per soort (`SIMULATIES.md`): de gemeten kansen liggen binnen enkele tienden van een procentpunt van de getoonde kansen. Een test bewaakt dat het verschil voor het Goudpack kleiner blijft dan 3 procentpunt.

## 4. Draft (Toetsweek Draft I)

- 1 draft-voucher per draft, formatie 4-3-3, 5 kaarten per positie (55 per draft), alle draftkaarten tijdelijk.
- Groepen en kans per kaart: A (drie vaste sterspelers) 0,03 · B (Legends en speciale kaarten 90+) 0,35 · C (85+) 10 · D (80-84) 40 · E (60-79) 49,62.
- Garanties: uiterlijk bij de 10e draft minstens één kaart uit B of beter, bij de 50e uit A.
- Er wordt alleen geloot tussen groepen die op die positie nog een kandidaat hebben (gewichten herschaald).

**Gemeten (10.000 drafts, catalogus van 245 kaarten):**

| Groep | Getoond per kaart | Gemeten per kaart | Draft met deze groep of beter |
|---|---:|---:|---:|
| A | 0,03% | 0,04% | 2,3% |
| B | 0,35% | 0,45% | 24,2% |
| C | 10,0% | 12,2% | 100% |
| D | 40,0% | 26,1% | 100% |
| E | 49,6% | 61,3% | 100% |

De langste reeks zonder B was 9 drafts, zonder A 49: de garanties werken. Groep D wordt minder vaak getoond dan ingesteld, omdat er per positie maar weinig spelers van 80-84 in de catalogus zitten. Daarom toont de app naast de ingestelde kans ook de gemeten kans (`apps/web/src/data/draft-odds.json`). Dat bestand moet opnieuw worden gegenereerd zodra de catalogus verandert (bijv. als `PHOTOS_ONLY` aan gaat).

Gemiddelde teamrating als de speler steeds de hoogste rating kiest: 88,4 (p10 86, p90 91).

## 5. Snel verkopen

`quickSellValue`: rating ≥ 85 → 2500, ≥ 80 → 900, ≥ 75 → 400, ≥ 65 → 150, anders 60 coins. Legendary ×10, Electric/Toetsweek/Seizoen ×3. Kaarten in het elftal kunnen niet verkocht worden. De UI vraagt bevestiging in de pagina zelf.

## 6. Transfermarkt (`market.ts`, versie `2026.10-markt.1`) — alleen engine

| Regel | Waarde |
|---|---|
| Valuta | alleen coins |
| Binnen | dezelfde pool |
| Prijsband | 0,8× – 1,5× de basiswaarde, afgerond op 10 coins |
| Basiswaarde | 90+: 9000 · 85+: 4000 · 80+: 1600 · 75+: 700 · 65+: 300 · lager: 120; Legendary ×6, Seizoen en hoger ×2,5, Rare ×1,4 |
| Belasting bij verkoop | 5% (naar boven afgerond), verdwijnt uit het spel |
| Advertentie geldig | 48 uur, daarna automatisch terug |
| Max. tegelijk te koop | 5 per speler |
| Max. aankopen / verkopen per dag | 5 / 5 |
| Afkoelperiode na aankoop | 72 uur voordat je de kaart weer mag verkopen |
| Niet verhandelbaar | draftkaarten, kaarten in het elftal, een kaart die al te koop staat |
| Niet mogelijk | bieden, ruilen, chat, je eigen kaart kopen |

Kopen is één atomaire overgang. `marketInvariants` controleert dat coins alleen via de belasting verdwijnen, dat er geen negatief saldo ontstaat en dat iedere kaart één eigenaar heeft. De markt heeft nog geen API-module en geen scherm.

## 7. Economie per week (simulatie)

2000 gesimuleerde weken per profiel, cijfers normaal verdeeld, weging willekeurig 1-3:

| Profiel | Coins | Vouchers | Spelerskeuzes | Packs per week |
|---|---:|---:|---:|---|
| Gemiddeld 6,8 · 3 cijfers/week | 773 | 0,90 | 0,04 | Goud 0,94 · Toetsweek 0,64 · Starter 0,76 · Elite 0,22 |
| Sterk 8,0 · 3 cijfers/week | 1296 | 2,19 | 0,16 | Toetsweek 1,27 · Goud 0,67 · Elite 0,76 · Starter 0,13 |
| Moeite 5,6 · 3 cijfers/week | 335 | 0,13 | 0,00 | Starter 0,99 · Goud 0,52 · Toetsweek 0,12 · Elite 0,01 |
| Toetsweek 7,0 · 8 cijfers/week | 2284 | 2,85 | 0,17 | Elite 0,76 · Toetsweek 1,92 · Goud 2,57 · Starter 1,77 |

**Bevinding (oude configuratie):** een leerling die moeite heeft, verdiende ongeveer 17× minder draft-vouchers dan een sterke leerling (0,13 tegen 2,19 per week) en vrijwel nooit een Elitepack. Besluit Martijn (V-011): beloningen aanzienlijk eerlijker maken. Uitwerking in §9.

## 8. Te controleren voordat de economie live gaat

- Coin-inflatie op langere termijn: de belasting op de markt is nu de enige afvoer naast packs kopen.
- De lokale API en de web-app moeten dezelfde XP-bron gebruiken.
- Iedere configuratiewijziging opnieuw door `tools/sim/balans.ts` halen en `draft-odds.json` bijwerken.

## 9. Economie v2: eerlijker (V-011)

**Besluit Martijn:** goede cijfers moeten voordeel blijven geven, maar persoonlijke verbetering, doelen en Academy-oefeningen moeten ook een serieuze route vormen naar sterke spelers en draft-vouchers. Simuleer verschillende leerlingprofielen over een volledig schooljaar en voorkom extreme verschillen.

### 9.1 Cijferbeloning per toets (`FAIR_REWARD_CONFIG`, `2026.10-eerlijk.1`)

| Tier | Vanaf | Coins | Pack | Voucher | Verschil met oud |
|---|---:|---:|---|---:|---|
| Herstelkans | 1 | 100 | – | – | was 0 coins |
| Voldoende | 5,5 | 200 | Starterspack | – | was 150 coins |
| Goed | 6,5 | 250 | Goudpack | – | gelijk |
| Sterk | 7,5 | 300 | Goudpack | – | was Toetsweekpack + voucher |
| Uitstekend | 8,5 | 400 | Toetsweekpack | 1 | was Elitepack |
| Legendarisch | 9,5 | 600 | Elitepack | 1 | was spelerskeuze 90+ |

XP-bedragen, weging, limieten (4 per dag, 12 per week) en correctieregels zijn ongewijzigd.

### 9.2 Voortgangsbeloningen (`progressRewards`, `DEFAULT_PROGRESS_CONFIG`, `2026.10-voortgang.1`)

De server roept `progressRewards(config, { grades, goals, ledger, grants, periods, today })` aan na ieder cijfer en ieder leerevent. Hij krijgt alleen nieuwe toekenningen terug: iedere toekenning heeft een vaste sleutel en eerder toegekende sleutels komen nooit terug.

| Soort | Wanneer | Beloning | Sleutel |
|---|---|---|---|
| Doel bereikt | Persoonlijk doel na het instellen bereikt (niet als het al gehaald was) | 1 voucher + 300 coins (het doelpack komt al uit de motivatie-engine) | `pr-doel:<doel>` |
| Vooruitgang | Periodegemiddelde van een vak ≥ 0,6 boven je eigen gemiddelde van daarvoor, minstens 3 cijfers in de periode | Goudpack + 1 voucher + 200 coins, één keer per vak per periode | `pr-vooruit:<periode>:<vak>` |
| Persoonlijk topcijfer | Cijfer ≥ 1,0 boven je eigen vakgemiddelde (minstens 2 eerdere cijfers) en voldoende | 1 voucher + 100 coins, één keer per vak per periode | `pr-top:<periode>:<vak>` |
| Herstel | Voldoende direct na een onvoldoende, ≥ 1,0 hoger | Goudpack + 150 coins, één keer per vak per periode | `pr-herstel:<periode>:<vak>` |
| Academy-mijlpaal | Iedere 150 Academy-XP | Goudpack (max. 2 per week; de rest schuift door) | `pr-acad-pack:<n>` |
| Academy-mijlpaal | Iedere 400 Academy-XP | 1 voucher (schuift door als de weeklimiet vol is) | `pr-acad-voucher:<n>` |

**Weeklimiet:** hooguit 2 vouchers per week uit voortgang, alle soorten samen. Wordt een toekenning daardoor afgekapt, dan blijven pack en coins staan en staat het aantal in `cappedVouchers`. Academy-vouchermijlpalen gaan niet verloren maar schuiven door naar een volgende week.

Het persoonlijk topcijfer werkt voor ieder niveau: een 6,6 bij een eigen gemiddelde van 5,2 telt net zo goed als een 9,2 bij een gemiddelde van 8,0.

### 9.3 Startelftal (V-013, `starterSquad`)

Iedere nieuwe speler krijgt 18 verschillende kaarten: 11 basisspelers die precies op een 4-3-3 passen en 7 reserves (keeper, centrale verdediger, back, twee middenvelders, vleugel, spits). De kaarten zijn vooral brons en zilver in de band 61-72, met hooguit 2 goudkaarten van maximaal 77. Er zitten geen speciale, tijdelijke of legendarische kaarten bij. Het startelftal is deterministisch per seed, zodat de server de seed in de audit kan vastleggen. Over 8 seeds verschilt de teamrating hooguit 6 punten.

### 9.4 Resultaat over een volledig schooljaar

`simulateSchoolYear` speelt 40 schoolweken (4 periodes) per profiel, met cijfertrend, doelgedrag en Academy-sessies. Het gebruikt `computeReward`, `gradeXp`, `progressRewards` en `academyReward`, opent alle packs en bepaalt het beste 4-3-3-elftal. De actuele tabel staat in `SIMULATIES.md`. Kerncijfers (4 seeds):

| Profiel | Vouchers per jaar oud → nieuw | Teamrating oud → nieuw | Spelers 85+ oud → nieuw |
|---|---:|---:|---:|
| Sterk (≈8,1) | 96,5 → 54,0 | 98,0 → 96,8 | 43 → 37 |
| Gemiddeld (≈6,8) | 30,3 → 28,5 | 96,3 → 95,3 | 34 → 30 |
| Moeite, gemotiveerd (≈5,4) | 3,8 → 39,0 | 92,5 → 94,8 | 16 → 27 |
| Stijger (5,5 → 7,0) | 11,0 → 41,3 | 95,3 → 95,3 | 27 → 29 |
| Oefenaar Academy (≈6,6) | 27,8 → 46,8 | 96,3 → 95,8 | 31 → 30 |

- De verhouding vouchers tussen het hoogste en laagste gemotiveerde profiel daalt van **25,7×** naar **1,9×** (doel ≤ 2,5×).
- De sterke leerling houdt de meeste vouchers, het beste elftal en de meeste 85+-spelers.
- Wie niet actief meedoet (geen doelen, niet oefenen, weinig cijfers invoeren), verdient minder. Dat is de bedoeling.
- De tests in `packages/engine/test/economy.test.ts` bewaken deze grenzen: sterk heeft het maximum, de verhouding blijft ≤ 2,5× en het teamverschil ≤ 5 punten.

**Kanttekening:** in beide economieën komen er veel packs per jaar binnen (honderd of meer). Ieder actief profiel eindigt daardoor rond een teamrating van 95. Het onderscheid zit in het aantal 85+- en speciale kaarten. Of het totale aantal packs omlaag moet, is een aparte afweging.


## 10. Economie v3: positief en haalbaar (ronde 5)

**Opdracht (Martijn):** ook cijfers rond 5,5-7,5 moeten een leuke, zinvolle spelervaring geven. Beloon inzet, verbetering, herstel, doelen en oefenen. Hoge cijfers mogen bijzonder zijn, maar geen voorwaarde voor goede spelers of een competitief elftal. Geen eindeloze stroom gratis topkaarten.

**Wat de simulatie van v2 liet zien:**
- 35 tot 105 Goudpacks per jaar per actieve leerling, en een elftal van ±93 al na tien weken. Dat is een eindeloze stroom.
- Battles zijn erg gevoelig voor kleine verschillen. Met 1-2 punten teamrating minder zakt je winkans duidelijk, dus kleine voorsprongen in de economie beslissen de competitie.

### 10.1 Bronnen van topkaarten

| Bron | Beloning | Waarom |
|---|---|---|
| **Clubniveau omhoog** (alle XP: cijfers invoeren, vooruitgang, doelen, oefenen) | Goudpack per niveau (`pr-niveau:<n>`) | Hoofdbron. Ieder niveau kost meer XP (×1,18), dus wie meer XP heeft, loopt maar weinig verder uit |
| Persoonlijk doel bereikt | Goudpack (motivatie-engine) + 1 voucher + 300 coins | Doelen stel je zelf, op je eigen niveau |
| Coins | Goudpack voor 5.000 coins in de winkel | Iedere toets levert coins op (150-500) |
| 9,5 of hoger | Goudpack + 1 voucher | Extra bijzonder, en zeldzaam |

### 10.2 Per cijfer (`2026.10-haalbaar.1`)

| Cijfer | Beloning |
|---|---|
| < 5,5 | 150 coins + XP (invoeren loont altijd) |
| 5,5 – 6,4 | Starterspack + 200 coins |
| 6,5 – 7,4 | Starterspack + 250 coins |
| 7,5 – 8,4 | Starterspack + 300 coins |
| 8,5 – 9,4 | Starterspack + 350 coins + 1 voucher |
| ≥ 9,5 | Goudpack + 500 coins + 1 voucher |

Vouchers zijn voor drafts: tijdelijke teams voor een event. Ze maken hoge cijfers bijzonder zonder het vaste elftal sterker te maken.

### 10.3 Voortgang (`2026.10-voortgang.2`)

| Soort | Beloning |
|---|---|
| Vooruitgang (vakgemiddelde ≥ 0,6 boven je eigen basis) | Starterspack + 300 coins + 1 voucher |
| Herstel na een onvoldoende (≥ 1,0 hoger, voldoende) | Starterspack + 300 coins (+ 80 Vooruitgangs-XP uit de motivatie-engine) |
| Persoonlijk topcijfer (≥ 1,0 boven je eigen gemiddelde) | 150 coins + 1 voucher |
| Academy-mijlpaal | 1 voucher per 400 Academy-XP (oefen-XP telt al voor het clubniveau) |
| Weeklimiet vouchers uit voortgang | 1 |

**XP voor hoge cijfers** (motivatie `2026.10-motivatie.4`): 50 per cijfer, bonus +20 (≥ 7), +40 (≥ 8), +60 (≥ 9). Was +30/+60/+100. Zo groeit het clubniveau minder hard alleen door hoge cijfers.

**Clubniveau voor bestaande accounts:** zonder eerdere niveaubeloning telt alleen het huidige niveau (één Goudpack), daarna ieder volgend niveau. Er is geen inhaalslag.

### 10.4 Resultaat (16 schooljaren per profiel, zie `SIMULATIES.md`)

- **Goudpacks per jaar:** 13-24 voor actieve profielen (v2: 43-106). Dat is ongeveer één per twee à drie weken. Daarnaast is er een Starterspack per voldoende.
- **Winkans tegen het veld** voor actieve profielen ligt tussen 47% en 60% (v2: 37%-80%). Leerlingen rond 5,5-6,5 die doelen stellen of oefenen, zitten rond 50%.
- **Het elftal groeit het hele jaar door:** ±86 na tien weken, ±91 aan het eind (v2: ±93 na tien weken).
- **Hoge cijfers** geven meer vouchers (sterk ±40 tegenover gemiddeld ±18) en af en toe een extra Goudpack (9,5+), maar geen grote voorsprong in teamsterkte.
- **Wie alleen cijfers invoert** (geen doelen, geen Academy), haalt ±46-58%. Het verschil tussen hoge en lage cijfers is binnen die groep klein.
- **Weinig cijfers invoeren** blijft achter (±17%). Dat is bedoeld: inzet telt.

`packages/engine/test/economy.test.ts` bewaakt de grenzen:
- hooguit 30 Goudpacks per jaar;
- elk actief profiel minstens 35% winkans tegen het veld;
- teamverschil tussen actieve profielen hooguit 3 punten;
- minder dan de helft van de v2-stroom.

**Meetkanttekeningen:**
- De computerzet in de simulatie is eenvoudig, en echte spelers maken fouten. Echte winkansen liggen daardoor waarschijnlijk dichter bij 50%.
- De meetruis per profiel is ongeveer ±5 procentpunt.
