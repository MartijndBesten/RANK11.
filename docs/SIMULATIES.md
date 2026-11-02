# Balanssimulaties

Gegenereerd met `tools/sim/balans.ts` op 2026-11-02. Catalogus: 245 kaarten (alleen spelers met portret).

## Draft: Toetsweek Draft I (10.000 drafts)

Teamrating bij steeds de hoogste rating kiezen: gemiddeld **85,6**, p10 84, mediaan 86, p90 87 (min 82, max 89).

| Groep | Kans per kaart (getoond) | Gemeten per kaart | Draft met deze groep of beter | Garantie ingegrepen | Langste reeks zonder |
|---|---:|---:|---:|---:|---:|
| A | 0,03% | 0,04% | 2,3% | 171× | 49 drafts |
| B | 0,35% | 0,32% | 18,4% | 375× | 9 drafts |
| C | 10,0% | 9,0% | 99,5% | 0× | 1 drafts |
| D | 40,0% | 36,4% | 100,0% | 0× | 0 drafts |
| E | 49,6% | 54,2% | 100,0% | 0× | 0 drafts |

Verschil tussen getoond en gemeten komt door terugval (geen kandidaat op die positie in de gerolde groep) en door garanties. Zie de conclusies onderaan.

## Pack: Starterspack (10.000 packs)

Gemiddelde rating per kaart 65,9 · walkout in 0,72% van de packs.

| Categorie | Minstens één (getoond) | Minstens één (gemeten) |
|---|---:|---:|
| Brons | 93,6% | 93,6% |
| Zilver | 73,8% | 73,8% |
| Goud | 11,5% | 10,9% |

## Pack: Zilverpack (10.000 packs)

Gemiddelde rating per kaart 74,2 · walkout in 15,3% van de packs.

| Categorie | Minstens één (getoond) | Minstens één (gemeten) |
|---|---:|---:|
| Zilver | 94,5% | 94,9% |
| Goud | 68,6% | 68,1% |
| Goud 82+ | 16,9% | 17,0% |

## Pack: Goudpack (10.000 packs)

Gemiddelde rating per kaart 79,6 · walkout in 80,8% van de packs.

| Categorie | Minstens één (getoond) | Minstens één (gemeten) |
|---|---:|---:|
| Goud 75-79 | 99,0% | 98,8% |
| Goud 80-84 | 92,7% | 92,6% |
| Goud 85+ | 39,4% | 39,8% |
| Speciale kaart | 6,8% | 6,8% |

## Pack: Toetsweekpack (10.000 packs)

Gemiddelde rating per kaart 80,3 · walkout in 90,7% van de packs.

| Categorie | Minstens één (getoond) | Minstens één (gemeten) |
|---|---:|---:|
| Goud 75-79 | 99,0% | 98,9% |
| Goud 80-84 | 66,6% | 66,8% |
| Goud 85+ | 25,2% | 25,3% |
| Speciale kaart | 11,6% | 11,7% |
| Rare of goud 84+ | 70,0% | 69,8% |
| Toetsweek-editie | 20,0% | 20,3% |
| Legendary | 2,0% | 1,9% |

## Pack: Elitepack (10.000 packs)

Gemiddelde rating per kaart 88,1 · walkout in 100,0% van de packs.

| Categorie | Minstens één (getoond) | Minstens één (gemeten) |
|---|---:|---:|
| Goud 85+ | 96,0% | 96,0% |
| Speciale kaart 85+ | 83,4% | 83,6% |
| Topper 90+ | 20,0% | 20,2% |
| Legendary | 6,0% | 5,7% |

## Kaarteconomie per week (beloningsconfiguratie)

| Profiel | XP | Coins | Vouchers | Spelerskeuzes | Packs | Geweigerd door limiet |
|---|---:|---:|---:|---:|---:|---:|
| Gemiddeld 6,8 · 3 cijfers/week | 316 | 773 | 0,90 | 0,04 | Goudpack 0,94, Toetsweekpack 0,64, Starterspack 0,76, Elitepack 0,22 | 0,00% |
| Sterk 8,0 · 3 cijfers/week | 492 | 1296 | 2,19 | 0,16 | Toetsweekpack 1,27, Goudpack 0,67, Elitepack 0,76, Starterspack 0,13 | 0,00% |
| Moeite 5,6 · 3 cijfers/week | 162 | 335 | 0,13 | 0,00 | Starterspack 0,99, Goudpack 0,52, Toetsweekpack 0,12, Elitepack 0,01 | 0,00% |
| Toetsweek 7,0 · 8 cijfers/week | 916 | 2284 | 2,85 | 0,17 | Elitepack 0,76, Toetsweekpack 1,92, Goudpack 2,57, Starterspack 1,77 | 0,37% |

_XP in deze tabel komt uit de oude beloningsconfiguratie; in de app komt XP uit de motivatie-engine (zie MOTIVATION-ENGINE.md). Coins, packs, vouchers en keuzes komen wel uit deze configuratie._
## Volledig schooljaar per leerlingprofiel (economie v3, ronde 5)

40 schoolweken, 4 periodes, 2 cijfers per week (1 bij "weinig"), 16 seeds gemiddeld. Huidige economie: cijferbeloning `2026.11-haalbaar.2` + voortgang `2026.11-voortgang.3` + motivatie `2026.10-motivatie.4`; ter vergelijking v2 (`2026.10-eerlijk.1` + `2026.10-voortgang.1`). Kaarten komen binnen zodra een pack verdiend is; coins gaan direct naar een Goudpack zodra er genoeg zijn. Teamrating = beste 4-3-3.

**Winkans tegen het veld** = gemiddelde uitslag (winst 1, gelijk ½) van het eindelftal van dit profiel tegen de eindelftallen van álle profielen, met de battle-engine en een eenvoudige computerzet, 240 wedstrijden. 50% = gemiddeld. Meetruis ongeveer ±5 procentpunt.

| Profiel | Gem. cijfer | Teamrating week 10 / 20 / 30 / 40 | Goudpacks+ per jaar (v2) | waarvan uit | Spelers 85+ (v2) | Vouchers | Winkans tegen het veld (v2) |
|---|---:|---|---:|---|---:|---:|---:|
| Sterk en stabiel (≈8,1) | 8,16 | 86,2 / 87,3 / 87,7 / 87,9 | **68** (100) | 9,5+ 79, clubniveau 12, coins 6, doel 3 | 14 (22) | 39,8 | **64,2%** (84,0%) |
| Ruim voldoende (≈7,3) | 7,28 | 85,8 / 86,9 / 87,1 / 87,4 | **38** (89) | 9,5+ 66, clubniveau 11, coins 5, doel 3, herstel 1 | 11 (16) | 21,8 | **56,0%** (58,1%) |
| Gemiddeld (≈6,6) | 6,64 | 85,3 / 86,6 / 87,1 / 87,3 | **31** (74) | 9,5+ 46, clubniveau 11, herstel 5, coins 5, doel 3 | 11 (14) | 18,1 | **50,0%** (51,7%) |
| Net voldoende (≈6,0) | 5,98 | 84,4 / 86,4 / 86,6 / 86,8 | **31** (59) | 9,5+ 27, clubniveau 11, herstel 10, coins 4, doel 3 | 10 (12) | 16,6 | **40,8%** (33,1%) |
| Wisselvallig (≈6,3, van 4 tot 8) | 6,30 | 85,2 / 86,4 / 87,1 / 87,5 | **44** (72) | 9,5+ 36, herstel 11, clubniveau 11, coins 5, doel 4 | 12 (17) | 26,7 | **52,1%** (62,1%) |
| Moeite, wel gemotiveerd (≈5,5) | 5,49 | 84,8 / 86,1 / 86,7 / 87,1 | **32** (61) | 9,5+ 14, clubniveau 12, herstel 11, coins 4, doel 4 | 11 (13) | 21,6 | **42,1%** (28,1%) |
| Stijger (5,5 → 7,0) | 6,34 | 85,1 / 86,3 / 86,8 / 87,1 | **34** (85) | 9,5+ 37, clubniveau 12, herstel 8, doel 5, coins 5 | 11 (15) | 25,6 | **37,7%** (45,6%) |
| Oefenaar Academy (≈6,5) | 6,54 | 85,6 / 86,6 / 87,1 / 87,6 | **34** (106) | 9,5+ 42, clubniveau 14, herstel 6, coins 5, doel 3 | 12 (16) | 30,1 | **52,3%** (50,6%) |
| Alleen invoeren, hoog (≈8,0) ¹ | 7,97 | 86,3 / 87,3 / 87,8 / 88,0 | **57** (84) | 9,5+ 76, clubniveau 10, coins 5 | 13 (20) | 32,4 | **66,9%** (83,5%) |
| Alleen invoeren, midden (≈6,5) ¹ | 6,44 | 84,6 / 85,9 / 86,7 / 86,9 | **25** (53) | 9,5+ 40, clubniveau 9, herstel 7, coins 4 | 10 (13) | 10,9 | **39,6%** (35,4%) |
| Alleen invoeren, laag (≈5,8) ¹ | 5,88 | 84,2 / 86,0 / 86,6 / 87,0 | **26** (43) | 9,5+ 25, herstel 11, clubniveau 9, coins 4 | 10 (12) | 12,3 | **46,5%** (28,3%) |
| Weinig cijfers ingevoerd (≈7,0) ¹ | 7,00 | 82,8 / 85,1 / 85,9 / 86,4 | **16** (32) | 9,5+ 28, clubniveau 6, coins 2, herstel 1 | 8 (11) | 7,3 | **24,2%** (26,3%) |

¹ Voert alleen cijfers in (geen doelen, geen Academy), of weinig cijfers.

Winkans van actief meedoende profielen tegen het veld: v3 **37,7% – 64,2%**, v2 28,1% – 84,0%. Starterspacks (brons/zilver) komen er per voldoende bij: 3–33 per jaar.

Oude configuratie `2026.10-proto.1` (zonder voortgang), ter vergelijking: Goudpacks+ per jaar 20–85, teamrating eind 86,5–91,8.


## Conclusies

1. **Draftkansen per kaart wijken af van de ingestelde kansen** zodra een groep op een positie weinig spelers heeft (vooral Groep D, 80-84). De engine loot daarom alleen tussen groepen met kandidaten, en de app toont naast de ingestelde kans ook de gemeten kans.
2. **Garanties werken**: de langste reeks zonder Groep B of beter blijft onder de garantiegrens.
3. **Packkansen kloppen** met de getoonde kansentabel (verschillen binnen de meetruis).
4. **Battles zijn gevoelig voor kleine verschillen**: 1-2 punten teamrating geeft al een duidelijk lagere winkans. Daarom moet de economie actieve leerlingen dicht bij elkaar houden; packgeluk alleen zorgt al voor zo'n verschil.
5. **Economie v3**: Goudpacks komen vooral uit het clubniveau (alle XP: inzet, vooruitgang, oefenen). Omdat ieder niveau duurder wordt, lopen leerlingen niet ver uit elkaar. Een voldoende geeft een Starterspack, een 8,5+ een voucher, een 9,5+ een Goudpack: bijzonder, maar geen voorwaarde.
6. **Geen eindeloze stroom**: ongeveer een Goudpack per twee à drie weken in plaats van twee à drie per week (v2). Het elftal groeit het hele jaar door.
7. **Wie alleen cijfers invoert**, krijgt minder dan wie doelen stelt of oefent; dat is bedoeld (inzet telt), maar het verschil tussen hoge en lage cijfers blijft binnen die groep klein.
