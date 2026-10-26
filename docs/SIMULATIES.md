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
## Volledig schooljaar per leerlingprofiel (V-011)

40 schoolweken, 4 periodes, 4 seeds gemiddeld. Cijferbeloning `2026.10-eerlijk.1` + voortgang `2026.10-voortgang.1`, vergeleken met de oude configuratie `2026.10-proto.1` zonder voortgangsbeloningen. Teamrating = beste 4-3-3 uit startelftal + alle packs (coins aan het eind omgezet in goudpacks).

| Profiel | Gem. cijfer | Vouchers oud → nieuw | waarvan voortgang | Teamrating oud → nieuw | Spelers 85+ oud → nieuw | Packs nieuw |
|---|---:|---:|---:|---:|---:|---|
| Sterk en stabiel (≈8,1) | 8,14 | 96,5 → **54,0** | 13,5 | 98,0 → 96,8 | 43 → 37 | Goudpack 100, Toetsweekpack 34, Elitepack 7, Starterspack 2 |
| Gemiddeld (≈6,8) | 6,79 | 30,3 → **28,5** | 24,3 | 96,3 → 95,3 | 34 → 30 | Goudpack 103, Starterspack 36, Toetsweekpack 4, Elitepack 0 |
| Moeite, wel gemotiveerd (≈5,4) | 5,57 | 3,8 → **39,0** | 38,8 | 92,5 → 94,8 | 16 → 27 | Goudpack 97, Starterspack 38, Toetsweekpack 0 |
| Stijger (5,5 → 7,0) | 6,17 | 11,0 → **41,3** | 40,0 | 95,3 → 95,3 | 27 → 29 | Goudpack 103, Starterspack 41, Toetsweekpack 1 |
| Oefenaar Academy (≈6,6) | 6,69 | 27,8 → **46,8** | 41,8 | 96,3 → 95,8 | 31 → 30 | Goudpack 149, Starterspack 35, Toetsweekpack 4, Elitepack 1 |
| Daler (7,2 → 6,0), geen doelen ¹ | 6,54 | 22,8 → **14,3** | 10,0 | 96,3 → 95,5 | 30 → 27 | Goudpack 77, Starterspack 35, Toetsweekpack 4, Elitepack 0 |
| Weinig cijfers ingevoerd (≈7,0) ¹ | 7,02 | 11,5 → **7,3** | 4,3 | 95,5 → 93,5 | 21 → 17 | Goudpack 30, Starterspack 9, Toetsweekpack 3, Elitepack 0 |

¹ Niet actief meedoend (geen doelen, geen oefening); valt buiten de eerlijkheidsgrens.

Verhouding vouchers tussen het hoogste en laagste gemotiveerde profiel: oud **25,7×**, nieuw **1,9×** (doel ≤ 2,5×).


## Conclusies

1. **Draftkansen per kaart wijken af van de ingestelde kansen** zodra een groep op een positie weinig spelers heeft (vooral Groep D, 80-84). De engine loot daarom alleen tussen groepen met kandidaten, en de app toont naast de ingestelde kans ook de gemeten kans. Structurele oplossing: grotere catalogus of groepen per positie herijken.
2. **Garanties werken**: de langste reeks zonder Groep B of beter blijft onder de garantiegrens.
3. **Packkansen kloppen** met de getoonde kansentabel (verschillen binnen de meetruis).
4. **Oude economie was scheef** (zie de weektabel en het schooljaar): wie moeite had, kreeg nauwelijks vouchers. De nieuwe economie (V-011) houdt goede cijfers voorop, maar geeft vooruitgang, doelen, topcijfers ten opzichte van je eigen niveau en Academy-oefening een eigen route naar packs en vouchers.
5. **Veel packs per jaar**: in beide economieën bouwt iedere actieve leerling binnen een jaar een elftal van rond de 94-97. Het verschil zit vooral in het aantal 85+-spelers en speciale kaarten. Het totale aantal packs verlagen is een aparte afweging.
