# RANK11. — Game design

**Stand:** 25-10-2026 · **Vervangt deels:** `docs/GDD.md` (versie 0.1). Het GDD blijft de bron voor nog niet gebouwde onderdelen (club creator, battles in detail, gele/rode kaarten, traktaties, beheer). Waar dit document afwijkt van het GDD, geldt dit document. Concrete getallen staan in `REWARD-ECONOMY.md`, `MOTIVATION-ENGINE.md` en `COMPETITION-SYSTEM.md`.

**Tagline:** *Your grades. Your squad.* — een voetbalkaartgame voor 10–16 jaar waarin schoolcijfers, verbetering en oefenen kaarten en packs opleveren.

Statuslabels: **[GEBOUWD]** werkt in de app en heeft tests · **[ENGINE]** regels gebouwd en getest, nog geen scherm · **[LOKAAL]** alleen in de lokale API · **[ONTWERP]** nog niet gebouwd.

## 1. Pijlers

1. **Voelt als een echte voetbalgame**, met een eigen vormgeving en zonder beschermde assets, echte spelers of echte clubs (zie `docs/onderzoek/ECHTE_SPELERS.md` en `ECHTE_DATA_V2.md`: zonder licentie NO-GO).
2. **Cijfers zijn de motor, niet het podium.** Cijfers zijn alleen voor de leerling zichtbaar. In competities tellen spelresultaten en genormaliseerde scores, nooit ruwe cijfers.
3. **Verbetering loont.** Vooruitgang en herstel na een tegenvaller worden apart beloond.
4. **Geen dark patterns.** Geen streaks, geen loginbeloningen, geen verlies bij wegblijven, geen tijdgebonden aanbiedingen, geen echt geld, kansen altijd zichtbaar.
5. **Samen met vrienden** in besloten pools.

## 2. Kernloop

```
Cijfer invoeren ─▶ Kluis openen ─▶ XP (motivatie) + coins/pack/voucher (kaarteconomie)
      ▲                                              │
      │                                              ▼
Doelen & toetsen ◀── Competitie in de pool ◀── Elftal, draft, collectie
```

- **Minuten:** kluis openen, pack openen, elftal verbeteren, een oefensessie in de Academy.
- **Week:** nieuwe cijfers, doelen, toetsweek-draft.
- **Schooljaar:** perioden, toetsweken, seizoenen in de pool [ONTWERP].

## 3. Navigatie [GEBOUWD]

| Tab | Subnavigatie |
|---|---|
| Home | — (gemiddelde met verloop, clubniveau en XP per soort, kluis, volgende beloning, stijgers/dalers, inzichten, doelen, aankomende toetsen, draft-event, packs, elftal) |
| Club | Elftal · Collectie · Packs · Draft |
| Competitie | Overzicht · Grade League · RANK League · Pools |
| Cijfers | Overzicht · Vakken · Invoeren · Doelen · Wat als · Kluis |
| Academy | Overzicht · Oefenen (alleen als Academy aan staat) |

Instellingen (tandwiel): geluid, animaties, Academy aan/uit, meldingen per soort, stille uren, demo opnieuw beginnen.

## 4. Cijfers [GEBOUWD]

- De leerling voert zelf in: vak, toets, cijfer, weging, datum. Er is geen ouder- of schoolcontrole; het label "zelf ingevoerd" staat overal waar cijfers staan.
- Dubbele invoer van dezelfde toets wordt geweigerd. Corrigeren en verwijderen kan altijd; iedere wijziging blijft in de geschiedenis.
- Na invoer wacht de beloning in de **Cijferkluis**: een korte, spannende onthulling met tier, XP per soort, coins, pack en eventueel een spelerskeuze. Een onvoldoende krijgt een respectvolle presentatie met een herstelchallenge.
- Dashboard, vakpagina's met grafiek, doelen, wat-als en inzichten: zie `GRADE-ENGINE.md` en `GRADE-INSIGHTS.md`.

## 5. Kaarten [GEBOUWD]

**Catalogus:** deterministisch gegenereerd en volledig fictief (namen, clubs en landen-namenlijsten). 200 gewone spelers, 36 speciale edities van toppers (rating ≥ 78), 1 uitgelichte speler (S01) en 8 Legends (L01–L08, rating 94–97) = 245 kaarten. Clubs zijn verzonnen (bijv. Havenstad FC, Sporting Lumen); er is een eigen club "RANK11. Legends".

**Series** (`RARITY_LABEL`):

| Serie | Hoe | Uiterlijk (zie `DESIGN-SYSTEM.md`) |
|---|---|---|
| Brons | rating < 65 | koperbruin metaal |
| Zilver | 65–74 | koel zilver |
| Goud | 75+ | warm goud |
| Rare (`rare_gold`) | rating ≥ 80, kans 40% | zwart-goud met scherven-motief |
| Toetsweek Special (`exam`) | speciale editie, +5 rating | paars met lime circuitlijnen |
| Electric (`special`) | speciale editie, +6 | elektrisch blauw met circuit |
| Seizoen (`season`) | speciale editie, +4 | turquoise |
| Legendary (`legend`) | vaste Legends | ivoor met goud, stralen en lauwerkrans |
| Kampioen (`champion`) | bestaat in het type, nog niet in de catalogus | zwart met goud |

Elke kaart heeft zes stats (SNE, AAN, PAS, TEC, VER, FYS), een hoofdpositie en soms een tweede positie, een leeftijd, land en club. Portretten: fotorealistische AI-portretten van fictieve personen met AI-label op de kaart; zolang de portretbatch niet klaar is, hebben nog niet alle spelers een foto (zie `ARCHITECTURE.md` §7).

Collectie: zoeken (naam, club, land; ongevoelig voor hoofdletters en accenten), filteren op serie, positiegroep, "in elftal" en "dubbel", sorteren, detailsheet met stats en snel verkopen.

## 6. Packs en draft [GEBOUWD]

- Vier packs (Starter, Goud, Toetsweek, Elite) met een kansentabel per pack. Alleen Starter en Goud zijn te koop met coins.
- **Ultimate Draft** (werktitel): met een voucher krijg je per positie 5 tijdelijke kaarten en kies je er 1. Spelersgroepen A–E met kansen en garanties. De app toont naast de ingestelde kans ook de gemeten kans uit 10.000 simulaties, omdat die door de beperkte catalogus afwijkt (zie `REWARD-ECONOMY.md` §4).

## 7. Elftal en chemie [GEBOUWD]

- Formaties 4-3-3, 4-4-2, 4-2-3-1 en 3-5-2, plus 7 wissels.
- Effectieve rating per plek: exacte of tweede positie zonder aftrek, verwante positie −3, verkeerde positie −12; een veldspeler op doel (of keeper in het veld) −35.
- Teamrating: gemiddelde van de effectieve ratings plus een bonus voor uitschieters boven het gemiddelde, maximaal 99.
- Chemie 0–3 per speler (max. 33): +1 juiste positie, +1 bij ≥ 2 spelers van dezelfde club, +1 bij ≥ 3 van hetzelfde land. Legends tellen voor iedere club als link. Verkeerde positie = 0.
- "Beste elftal" kiest automatisch per plek de hoogste effectieve rating, iedere speler één keer.

## 8. Drie competities

| Competitie | Wat telt | Status |
|---|---|---|
| **RANK League** | Kaartbattles in de pool: 11 duels op rating, 3/1/0 punten, ranglijst met vorm. Live (30 s per zet) of asynchroon (24 uur). | [ENGINE] + [LOKAAL]; zie `COMPETITION-SYSTEM.md` |
| **Grade League** | Genormaliseerde schoolscore per periode (hieronder) | [ENGINE] |
| **Academy League** | Oefenen in de leeromgeving, met plafonds | [ONTWERP] — alleen concept; hangt af van een echte koppeling |

### Grade League-regels (`gradeLeague.ts`, versie `2026.10-gradeleague.1`)

- Meedoen vanaf **2 cijfers in de periode**. Minder: geen plek in de ranglijst, met de uitleg "Nog niet genoeg cijfers deze periode (minimaal 2). Je verliest niets."
- **Prestatie (35%)**: gemiddelde (gewogen) van de cijfers in de periode, omgerekend naar 0–100 waarbij 4 = 0 en 9 = 100. Het is een gemiddelde, dus meer toetsen leveren niet automatisch meer op.
- **Vooruitgang (45%)**: per vak het gemiddelde deze periode min het gemiddelde vóór de periode; 50 = gelijk gebleven, ±25 punten per heel punt verschil, begrensd op 0–100. Zonder eerdere cijfers telt vooruitgang neutraal (50).
- **Doelen (20%)**: aandeel van de actieve doelen dat in deze periode bereikt is. Zonder doelen telt dit onderdeel niet mee (de gewichten worden herschaald), zodat geen doelen instellen geen straf is.
- **Herstelbonus**: +5 per herstel (onvoldoende → voldoende met ≥ 1,5 sprong) in de periode, maximaal +10.
- Score 0–110, gedeelde plaats bij gelijke score. Iedere rij heeft een uitleg in gewone taal. De uitkomst bevat alleen componentscores, nooit cijfers.

## 9. Pools [LOKAAL]

Besloten groepen met een uitnodigingscode (alleen gehasht opgeslagen), rollen, maximaal aantal leden. Er is geen chat. Zie `MULTIPLAYER.md`.

## 10. Wat bewust níet in het spel zit

- Streaks, dagelijkse loginbeloningen, "kom terug"-meldingen, verlopende boosts.
- Snelheidsbonussen bij leervragen (alleen juistheid telt).
- Openbare cijfers of ranglijsten op ruwe cijfers.
- Echt geld, ruilen buiten het spel, biedingen of chat op de transfermarkt.
- Echte spelers, clubs, logo's of tenues.
- Meldingen in stille uren (standaard 21:30–07:30).

## 11. Werktitels

"Ultimate Draft" en vergelijkbare namen zijn werktitels; vervanging is een open vraag in `VRAGEN.md` (V-008).
