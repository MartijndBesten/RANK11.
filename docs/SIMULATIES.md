# Balanssimulaties

Gegenereerd met `tools/sim/balans.ts` op 2026-10-26. Catalogus: 245 kaarten (alleen spelers met portret).

## Draft: Toetsweek Draft I (10.000 drafts)

Teamrating bij steeds de hoogste rating kiezen: gemiddeld **88,4**, p10 86, mediaan 88, p90 91 (min 82, max 94).

| Groep | Kans per kaart (getoond) | Gemeten per kaart | Draft met deze groep of beter | Garantie ingegrepen | Langste reeks zonder |
|---|---:|---:|---:|---:|---:|
| A | 0,03% | 0,04% | 2,3% | 179× | 49 drafts |
| B | 0,35% | 0,45% | 24,2% | 191× | 9 drafts |
| C | 10,0% | 12,2% | 100,0% | 0× | 1 drafts |
| D | 40,0% | 26,1% | 100,0% | 0× | 0 drafts |
| E | 49,6% | 61,3% | 100,0% | 0× | 0 drafts |

Verschil tussen getoond en gemeten komt door terugval (geen kandidaat op die positie in de gerolde groep) en door garanties. Zie de conclusies onderaan.

## Pack: Starterspack (10.000 packs)

Gemiddelde rating per kaart 61,6 · walkout in 4,3% van de packs.

| Categorie | Minstens één (getoond) | Minstens één (gemeten) |
|---|---:|---:|
| Brons | 93,6% | 93,6% |
| Zilver | 73,8% | 73,8% |
| Goud | 11,5% | 10,9% |

## Pack: Goudpack (10.000 packs)

Gemiddelde rating per kaart 80,1 · walkout in 75,3% van de packs.

| Categorie | Minstens één (getoond) | Minstens één (gemeten) |
|---|---:|---:|
| Goud 75-79 | 99,0% | 98,8% |
| Goud 80-84 | 92,7% | 92,6% |
| Goud 85+ | 39,4% | 39,8% |
| Speciale kaart | 6,8% | 6,8% |

## Pack: Toetsweekpack (10.000 packs)

Gemiddelde rating per kaart 81,6 · walkout in 98,1% van de packs.

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

Gemiddelde rating per kaart 91,9 · walkout in 100,0% van de packs.

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

40 schoolweken, 4 periodes, 2 cijfers per week (1 bij "weinig"), 16 seeds gemiddeld. Huidige economie: cijferbeloning `2026.10-haalbaar.1` + voortgang `2026.10-voortgang.2` + motivatie `2026.10-motivatie.4`; ter vergelijking v2 (`2026.10-eerlijk.1` + `2026.10-voortgang.1`). Kaarten komen binnen zodra een pack verdiend is; coins gaan direct naar een Goudpack zodra er genoeg zijn. Teamrating = beste 4-3-3.

**Winkans tegen het veld** = gemiddelde uitslag (winst 1, gelijk ½) van het eindelftal van dit profiel tegen de eindelftallen van álle profielen, met de battle-engine en een eenvoudige computerzet, 240 wedstrijden. 50% = gemiddeld. Meetruis ongeveer ±5 procentpunt.

| Profiel | Gem. cijfer | Teamrating week 10 / 20 / 30 / 40 | Goudpacks+ per jaar (v2) | waarvan uit | Spelers 85+ (v2) | Vouchers | Winkans tegen het veld (v2) |
|---|---:|---|---:|---|---:|---:|---:|
| Sterk en stabiel (≈8,1) | 8,16 | 86,9 / 89,6 / 90,4 / 91,1 | **24** (100) | clubniveau 12, coins 5, 9,5+ 4, doel 3 | 12 (33) | 39,8 | **51,0%** (80,4%) |
| Ruim voldoende (≈7,3) | 7,28 | 86,8 / 88,8 / 90,5 / 91,3 | **19** (89) | clubniveau 11, coins 5, doel 3, 9,5+ 1 | 11 (28) | 21,8 | **59,6%** (63,7%) |
| Gemiddeld (≈6,6) | 6,64 | 85,6 / 89,1 / 90,5 / 90,9 | **18** (74) | clubniveau 11, coins 5, doel 3 | 12 (25) | 18,1 | **46,7%** (41,7%) |
| Net voldoende (≈6,0) | 5,98 | 84,9 / 87,8 / 89,8 / 90,5 | **18** (59) | clubniveau 11, coins 4, doel 3 | 11 (21) | 16,6 | **48,1%** (40,0%) |
| Wisselvallig (≈6,3, van 4 tot 8) | 6,30 | 86,2 / 88,9 / 90,3 / 91,0 | **22** (72) | clubniveau 11, coins 5, doel 4, 9,5+ 1 | 12 (26) | 26,7 | **51,9%** (51,0%) |
| Moeite, wel gemotiveerd (≈5,5) | 5,49 | 86,2 / 88,7 / 90,3 / 90,9 | **21** (61) | clubniveau 12, coins 4, doel 4 | 11 (22) | 21,6 | **52,1%** (36,9%) |
| Stijger (5,5 → 7,0) | 6,34 | 87,8 / 90,5 / 91,6 / 91,9 | **22** (85) | clubniveau 12, doel 5, coins 5 | 12 (27) | 25,6 | **56,0%** (41,9%) |
| Oefenaar Academy (≈6,5) | 6,54 | 87,5 / 89,8 / 90,8 / 91,6 | **22** (106) | clubniveau 14, coins 5, doel 3 | 13 (28) | 30,1 | **53,3%** (56,0%) |
| Alleen invoeren, hoog (≈8,0) ¹ | 7,97 | 86,0 / 89,3 / 90,4 / 91,4 | **19** (84) | clubniveau 10, coins 5, 9,5+ 4 | 11 (32) | 32,4 | **57,9%** (77,1%) |
| Alleen invoeren, midden (≈6,5) ¹ | 6,44 | 85,4 / 88,0 / 89,6 / 90,6 | **13** (53) | clubniveau 9, coins 4 | 10 (21) | 10,9 | **45,8%** (32,1%) |
| Alleen invoeren, laag (≈5,8) ¹ | 5,88 | 85,1 / 88,6 / 89,7 / 90,5 | **13** (43) | clubniveau 9, coins 4 | 9 (18) | 12,3 | **48,5%** (30,2%) |
| Weinig cijfers ingevoerd (≈7,0) ¹ | 7,00 | 80,9 / 85,1 / 87,1 / 88,2 | **9** (32) | clubniveau 6, coins 2 | 6 (16) | 7,3 | **16,7%** (20,4%) |

¹ Voert alleen cijfers in (geen doelen, geen Academy), of weinig cijfers.

Winkans van actief meedoende profielen tegen het veld: v3 **46,7% – 59,6%**, v2 36,9% – 80,4%. Starterspacks (brons/zilver) komen er per voldoende bij: 40–81 per jaar.

Oude configuratie `2026.10-proto.1` (zonder voortgang), ter vergelijking: Goudpacks+ per jaar 20–85, teamrating eind 91,3–97,5.


## Conclusies

1. **Draftkansen per kaart wijken af van de ingestelde kansen** zodra een groep op een positie weinig spelers heeft (vooral Groep D, 80-84). De engine loot daarom alleen tussen groepen met kandidaten, en de app toont naast de ingestelde kans ook de gemeten kans.
2. **Garanties werken**: de langste reeks zonder Groep B of beter blijft onder de garantiegrens.
3. **Packkansen kloppen** met de getoonde kansentabel (verschillen binnen de meetruis).
4. **Battles zijn gevoelig voor kleine verschillen**: 1-2 punten teamrating geeft al een duidelijk lagere winkans. Daarom moet de economie actieve leerlingen dicht bij elkaar houden; packgeluk alleen zorgt al voor zo'n verschil.
5. **Economie v3**: Goudpacks komen vooral uit het clubniveau (alle XP: inzet, vooruitgang, oefenen). Omdat ieder niveau duurder wordt, lopen leerlingen niet ver uit elkaar. Een voldoende geeft een Starterspack, een 8,5+ een voucher, een 9,5+ een Goudpack: bijzonder, maar geen voorwaarde.
6. **Geen eindeloze stroom**: ongeveer een Goudpack per twee à drie weken in plaats van twee à drie per week (v2). Het elftal groeit het hele jaar door.
7. **Wie alleen cijfers invoert**, krijgt minder dan wie doelen stelt of oefent; dat is bedoeld (inzet telt), maar het verschil tussen hoge en lage cijfers blijft binnen die groep klein.
