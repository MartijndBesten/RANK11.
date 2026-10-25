# RANK11. — Game Design Document

**Versie:** 0.1 (25-10-2026) · **Status:** concept ter goedkeuring · **Eigenaar:** Martijn
**Tagline:** *Your grades. Your squad.*

Statuslabels in dit document:
- **[GEBOUWD]** werkt in het prototype én heeft geautomatiseerde tests;
- **[PROTO]** werkt in het prototype maar draait nog lokaal, zonder server;
- **[ONTWERP]** is vastgelegd maar nog niet gebouwd;
- **[OPEN]** wacht op een besluit (zie `VRAGEN.md`).

---

## 1. Pijlers

1. **Voelt als een echte voetbalgame.** Grote kaarten, stadionlicht, walkouts en spanning, maar met een eigen vormgeving: geen beschermde assets, logo's of kaartvormen.
2. **Cijfers zijn de motor, niet het podium.**
   - Betere cijfers en verbetering leveren betere beloningen op.
   - Cijfers zelf worden nooit aan anderen getoond.
3. **Strategie boven geluk.** Packs geven spanning, maar winnen doe je met teambeheer en slimme keuzes in de battle.
4. **Samen met vrienden.** Privépools, toetsweektoernooien, ranglijsten en traktatiechallenges.
5. **Veilig voor 10–16 jaar.**
   - Geen echt geld, geen chat met onbekenden, geen publieke cijfers.
   - Een onvoldoende krijgt een respectvolle presentatie.
   - Geen streaks of straf bij wegblijven.

## 2. Kernloop

```
Cijfer binnen ─▶ Cijferkluis-onthulling ─▶ Beloning (XP, coins, pack, voucher, spelerskeuze)
      ▲                                                     │
      │                                                     ▼
 Toetsweek-events ◀── Ranglijsten/pools ◀── Battles & Draft ◀── Elftal bouwen / transfermarkt
```

- **Korte lus (minuten):** pack openen, elftal verbeteren, een battle spelen.
- **Middellange lus (week):** nieuwe cijfers, draft-vouchers, poolranking.
- **Lange lus (schooljaar):**
  - vier toetsweektoernooien en een jaarfinale;
  - seizoensgeschiedenis en prijzenkast.

## 3. Schermen

| Scherm | Telefoon (portret) | Tablet/desktop (landscape) | Status |
|---|---|---|---|
| Home (club, kluis, event, packs, elftal) | Gestapeld | Raster van twee kolommen | [PROTO] |
| Cijferkluis: lijst en gemiddelden | Gestapeld | Twee kolommen | [PROTO] |
| Cijferonthulling (volledig scherm) | Ja | Ja | [PROTO] |
| Pack-overzicht en winkel (alleen coins) | Ja | Ja | [PROTO] |
| Pack-opening en walkout (volledig scherm) | Ja | Ja | [PROTO] |
| Draft-lobby | Events als horizontale tabs | Event-rail links | [PROTO] |
| Draft kiezen (veld + 5 kaarten) | Veld boven, kaarten scrollen eronder | Veld links, kaarten rechts | [PROTO] |
| Elftalbouwer (veld, bank, wisselen, vergelijken, collectie) | Ja | Veld links, bank rechts | [PROTO] |
| Club Creator (logo, tenues, stadion) | — | — | [ONTWERP] |
| Cijfercentrum (invoer, vakken, grafieken, wat-als, doelen) | — | — | [ONTWERP]; engine [GEBOUWD] |
| Battle-lobby en battle | — | Landscape heeft de voorkeur | [ONTWERP] |
| Pools (aanmaken, uitnodigen, ranglijsten, seizoenen) | — | — | [ONTWERP] |
| Toetsweek-eventdashboard | — | — | [ONTWERP] |
| Transfermarkt | — | — | [ONTWERP] |
| Ouderomgeving (toestemming, bevestigen, export, verwijderen) | — | — | [ONTWERP] |
| Beheer: platform en pool | — | Desktop | [ONTWERP] |

**Landscape heeft meerwaarde** voor de draft (veld en keuzes naast elkaar), de battle (twee teams tegenover elkaar), de elftalbouwer en het beheer. Elke functie blijft ook in portret volledig bruikbaar.

## 4. Belangrijkste flows

### 4.1 Start en account [ONTWERP]

1. Een ouder maakt een account aan (e-mail met magic link) en geeft toestemming per kind, in lijn met het voorgestelde ouder-eerst-model.
2. De ouder maakt een kindprofiel aan met een bijnaam en een leeftijdsgroep. Er wordt geen geboortedatum gevraagd.
3. Het kind koppelt zijn apparaat met een eenmalige code en stelt een passkey in (terugval: pincode met rate limiting).
4. Het kind volgt de onboarding:
   - club maken (Club Creator);
   - startpack openen (gegarandeerd speelbaar elftal);
   - eerste cijfers invoeren.
5. Optioneel lid worden van een pool via een uitnodigingscode.

### 4.2 Cijfer invoeren [ONTWERP; engine GEBOUWD]

- **Velden:** vak, toets, cijfer (1,0–10,0, maximaal twee decimalen), weging en datum (niet in de toekomst).
- **Statussen:**
  - `registered`: zelf ingevoerd;
  - `verified`: bevestigd door een gemachtigde;
  - `simulated`: wat-als, telt nooit mee.
- **Ontdubbelsleutel:** vak + genormaliseerde toetsnaam + datum, of de externe sleutel van de bron. Dezelfde toets wordt nooit twee keer beloond.
- **Correcties:** een correctie naar een hogere tier schrijft alleen het verschil bij. Een correctie naar beneden neemt niets terug en geeft niets extra.
- **Limieten tegen fraude:** maximaal 4 beloonde cijfers per dag en 12 per week, instelbaar per pool. Een pool kan ook instellen dat niet-geverifieerde cijfers maximaal tier X opleveren.
- **Nieuwe cijfers worden verzegeld:** het cijfer wordt opgeslagen en verschijnt in de Cijferkluis als verrassing.

### 4.3 Cijferkluis-onthulling [PROTO]

1. Een melding: "Je hebt een nieuw cijfer binnen!". In-app, één keer per sessie. Pushmeldingen alleen als ze door de gebruiker zelf zijn uitgelokt.
2. Kluis openen: ingedrukt houden (ongeveer 0,85 s, met een voortgangsring) of op het toetsenbord Enter.
3. Vak en toets verschijnen, daarna de weging ("Telt 3× mee").
4. Een rolteller stopt op het cijfer.
   - ≥ 8,5: goud met vonken.
   - ≥ 6,5: helder.
   - 5,5–6,4: neutraal.
   - < 5,5: rustig, grijsblauw, zonder rood en zonder harde effecten.
5. Het oude en nieuwe vakgemiddelde, met een groene of rode pijl en het verschil. Ook het algemene gemiddelde.
6. De beloning: tier, XP, coins en voucher, bonussen (weging, verbetering), een pack ("Nu openen" of "Bewaren") of een spelerskeuze (1 uit 3, met walkout).
7. Alles wordt opgeslagen in de collectie en de inventaris.

**Toegankelijkheid en respect:**
- Overslaan kan altijd.
- "Direct bekijken zonder animatie" verwerkt het cijfer meteen. Echte cijfers zijn dus altijd direct toegankelijk.
- Het overzicht "Mijn gemiddelden" is altijd zichtbaar.
- Geluid staat standaard aan en is uit te zetten.
- Er is een instelling voor korte animaties, en de systeeminstelling voor verminderde beweging wordt gerespecteerd.

### 4.4 Pack-opening [PROTO]

1. De pack zweeft. De gloed verraadt subtiel hoe zeldzaam de beste kaart is (een "tell").
2. Tik, de pack scheurt open met een lichtflits.
3. Bij een bijzondere kaart (zeldzaam goud of hoger, of 85+) volgt een walkout:
   - lichtbundels;
   - vlag en land;
   - positie;
   - club;
   - silhouet met randlicht;
   - flits, de kaart draait om en er spuiten vonkfonteinen.
4. Alle kaarten draaien een voor een om, de beste als laatste. Kaarten die je al had worden gemarkeerd; dubbele kaarten kun je met één knop snel verkopen.
5. Op elke stap zit een knop "Overslaan". Tikken versnelt naar de volgende stap.

### 4.5 Ultimate Draft [PROTO]

1. **Lobby:**
   - uitgelichte sterspelers en een countdown;
   - garantietellers: "Groep B of hoger gegarandeerd over N drafts" en "Groep A gegarandeerd over N drafts";
   - kansentabel en de knop "Start draft" (1 voucher).
2. **Kiezen:** per positie 5 kaarten. Ze draaien om, de topgroep als laatste. Je selecteert een kaart en bevestigt met "Kies". Teamrating en chemie zijn live zichtbaar.
3. **Resultaat:** teamrating (optellend in beeld), het veld met je XI, en de knop "Draft-toernooi" (volgt in fase 5).
4. **Draftkaarten zijn altijd tijdelijk** (`temporary`). Ze komen nooit in de collectie.

### 4.6 Elftalbouwer [PROTO]

- **Formaties:** 4-3-3, 4-4-2, 4-2-3-1, 3-5-2. Bij een formatiewissel worden de spelers opnieuw verdeeld; niemand raakt kwijt.
- **Wisselen:** tik op een positie voor de kandidatenlijst, gesorteerd op effectieve rating. Elke kandidaat toont zijn positiefit (positie / alternatief / verwant −3 / uit positie −12, keeper −35). Tik nog eens om stat voor stat te vergelijken (met verschillen) en kies dan "Plaatsen".
- **Beste elftal:** automatisch, met unieke spelers en de beste effectieve rating.
- **Reservebank** met 7 plekken. Tik op een reserve om hem in te brengen voor een gekozen basisspeler.
- **Collectie** met filter op zeldzaamheid.

### 4.7 Open kaartbattle [ONTWERP — hoofdspelmodus, fase 5]

**Opzet:**
- Twee spelers, ieder met een vastgezet elftal: de 11 basisspelers op het moment van de uitnodiging. Geschorste spelers vallen af (zie §5.6).
- De server bepaalt alles: welke kaarten beschikbaar zijn, of een zet geldig is, de duelwaarde, de score en de uitslag. Clients sturen alleen intenties.

**Verloop per ronde (maximaal 11):**
1. De aanvaller van deze ronde legt een kaart open.
2. De verdediger ziet die kaart en legt zijn tegenkaart.
3. De server vergelijkt de **duelwaarde**:
   - standaard: algemene rating, plus een chemiebonus van 0–3 als de pool die aanzet, minus de positiestraf als de pool positiestraf aanzet;
   - in latere modi: snelheid, verdediging, techniek of positieduels (de stat per ronde wordt vooraf door de server getoond).
4. De hoogste waarde wint het duel en scoort een **doelpunt**. Bij gelijke waarde volgt standaard geen doelpunt; per pool instelbaar: `geen`, `allebei`, `hoogste chemie`, `aanvaller` of `verdediger`.
5. Beide kaarten zijn voor deze wedstrijd verbruikt.
6. De aanvaller wisselt per ronde. Wie in ronde 1 begint, bepaalt de server met een gelogde seed (toss).

**Eerlijkheid:**
- De verdediger heeft informatievoordeel, de aanvaller kiest het tempo. Door de rol elke ronde te wisselen heeft ieder 5 of 6 keer elk voordeel.
- Bij 11 rondes begint de toss-winnaar 6 keer. Zijn tegenstander krijgt daarom het eerste verdedigingsvoordeel in de **laatste** ronde (beslissend moment).
- Dit is een [OPEN]-balansvraag die we in playtests valideren.

**Voortijdig beslist:**
- Zodra de voorsprong groter is dan het aantal resterende duels, stopt de server de wedstrijd met de huidige score (instelling `stopWhenDecided`, standaard aan).
- Staat de instelling uit, dan wordt alleen voor het doelsaldo doorgespeeld.

**Timers:**
- Live: 30 s per zet.
- Asynchroon: 24 uur per zet.
- Bij een time-out speelt de server automatisch de **laagste** beschikbare kaart, nooit de beste.
- Drie time-outs op rij: reglementair verlies (0–3, instelbaar).

**Herverbinden:**
- De wedstrijdstaat staat in een Durable Object.
- Na een reconnect haalt de client de eventlog op (`status = f(gebeurtenissen)`, zie bouwsteen B51).

**Uitslag en punten:**
- Uitslag: winst, gelijk of verlies, plus doelsaldo.
- Competitiepunten: 3 / 1 / 0, instelbaar.
- Wedstrijdhistorie per pool.

### 4.8 Pools [ONTWERP]

- **Aanmaken:** naam, beheerder, uitnodigingscode (alleen gehasht opgeslagen, met verloopdatum en een gebruikslimiet; zie bouwsteen B55).
- **Leden:** standaard maximaal 20 deelnemers (technisch geen vaste grens). Een speler kan lid zijn van meerdere pools.
- **Per pool instelbaar:**
  - spelregels, vakken en gamewegingen;
  - beloningsregels, kaartstraffen en toetsweekdatums;
  - challenges en traktaties;
  - verificatiebeleid.
- **Isolatie:** elke query is gescoped op `pool_id`. Een niet-lid krijgt 404, niet 403, zodat het bestaan van een pool niet uitlekt.

### 4.9 Toetsweektoernooien [ONTWERP]

- Vier per schooljaar, met datums per pool en een template vanuit het platform.
- **Tijdens een toetsweek:**
  - extra challenges;
  - Toetsweekpacks en tijdelijke Toetsweek-kaarten;
  - extra XP (×1,5, instelbaar);
  - een draft-toernooi (knock-out, 4/8/16 deelnemers, eventueel met byes);
  - een toetsweekranking.
- **Dashboard:** countdown, voortgang, beloningen en de eindwinnaar.
- **Na toetsweek 4:** jaarfinale tussen de vier toetsweekwinnaars plus de nummer één van de Ultimate League.

## 5. Spelregels in detail

### 5.1 Beloningstabel (standaardconfiguratie `2026.10-proto.1`) [GEBOUWD]

| Tier | Vanaf | XP | Coins | Pack | Extra |
|---|---|---|---|---|---|
| Herstelkans | 1,0 | 15 | 0 | — | Herstelchallenge |
| Voldoende | 5,5 | 50 | 150 | Starterspack | — |
| Goed | 6,5 | 90 | 250 | Goudpack | — |
| Sterk | 7,5 | 140 | 400 | Toetsweekpack | 1 draft-voucher |
| Uitstekend | 8,5 | 200 | 600 | Elitepack | 1 draft-voucher |
| Legendarisch | 9,5 | 300 | 900 | — | Spelerskeuze 1 uit 3 (90+), 1 voucher |

**Bonussen:**
- Weging: +20 XP per wegingspunt boven 1.
- Verbetering: vakgemiddelde stijgt met ≥ 0,25 → +60 XP en +200 coins.
- Optioneel: één tier hoger vanaf weging X (standaard uit).

**Vaste regels:**
- Simulaties leveren nooit iets op.
- Elke toegekende beloning bewaart haar configuratieversie.

### 5.2 Kaarten [GEBOUWD]

- **Rating:** schaal 50–99 (configureerbaar).
- **Stats:** Snelheid, Aanvallen, Passing, Techniek, Verdedigen, Fysiek. Bovenin de schaal gecomprimeerd, zodat niet alles op 99 staat.
- **Zeldzaamheden** (oplopend):
  - Brons (< 65), Zilver (65–74), Goud (75+), Zeldzaam goud;
  - Seizoen, Toetsweek, Electric, Kampioen, Legend.
- **Eigen kaartvorm:** afgeschuind silhouet met metalen rand. Elke serie heeft een eigen materiaal: goud, parelmoer/marmer voor Legend, violet met limoen voor Toetsweek, elektrisch blauw voor Electric.
- **Portretten:** parametrische SVG-buste (huid, kapsel, baard, bouw, shirt in clubkleuren). De portretstijl is een [OPEN]-ontwerpkeuze (V-002).

### 5.3 Packs [GEBOUWD]

- **Kansen per kaartplek** en "kans op minstens één in de pack". Beide worden in de app getoond.
- **Geen dubbele speler** binnen één pack.
- **Reproduceerbaar:** de seed per opening komt uit een cryptografische bron en wordt op de server in de auditlog opgeslagen.
- **Standaardpacks:**
  - Starterspack: 3 kaarten, brons en zilver, 750 coins.
  - Goudpack: 5 kaarten, 1× 80+ gegarandeerd, 5.000 coins.
  - Toetsweekpack: alleen via beloning; laatste plek met 20% Toetsweek, 8% Electric, 2% Legend.
  - Elitepack: alleen via beloning; 3× 85+, laatste plek met 6% Legend.

### 5.4 Elftalrating en chemie [GEBOUWD]

- **Teamrating:** gemiddelde effectieve rating, plus een bonus voor spelers boven het gemiddelde. Maximaal 99.
- **Chemie (0–3 per speler, maximaal 33):**
  - +1 als de speler op zijn eigen of alternatieve positie staat;
  - +1 bij ≥ 2 clubgenoten in het elftal;
  - +1 bij ≥ 3 landgenoten;
  - een speler uit positie krijgt 0;
  - Legends tellen voor iedere club als link.

### 5.5 Draftgroepen en garanties [GEBOUWD]

| Groep | Inhoud | Gewicht per aangeboden kaart |
|---|---|---|
| A | Uitgelichte sterspelers van het event | 0,03% |
| B | Legends en specials 90+ | 0,35% |
| C | 85+ | 10% |
| D | 80–84 | 40% |
| E | 70–79 | 49,62% |

- **Garanties:** Groep B of hoger uiterlijk bij de 10e draft, Groep A bij de 50e.
- De teller gaat terug naar nul zodra je zo'n kaart te zien krijgt.
- **Getest:** de garantie grijpt in de praktijk echt in. De kans op B+ per draft ligt tussen 8% en 35%, anders zou de teller niets betekenen.

### 5.6 Gele en rode kaarten [ONTWERP, standaard UIT]

- **Instelbaar per pool:**
  - drempel (bijv. < 5,5 → waarschuwing; tweede onvoldoende binnen 4 weken → geel; < 4,0 → rood);
  - gevolg (een kaartduel missen, of een speler 1 week geschorst);
  - herstelchallenge om de straf op te heffen.
- **Nooit publiek:**
  - de ranglijst toont geen reden;
  - alleen de speler zelf ziet waarom er een kaart is gegeven;
  - anderen zien alleen "1 speler niet beschikbaar".

### 5.7 Traktatiechallenges [ONTWERP]

- Na een toetsweek, vrijwillig per pool: winnaar trakteert, verliezer trakteert, verliezer trakteert de pool, of alleen digitale beloningen.
- Geen betalingen of inzet in de app. Het is een afspraak die alleen getoond wordt, met een disclaimer.

### 5.8 Transfermarkt [ONTWERP]

- **Alleen spelcoins.**
- **Functies:**
  - kopen en verkopen met een vaste prijs binnen een bandbreedte per kaart (geen vrije biedingen, zo blijft misbruik beperkt);
  - snel verkopen aan de bank;
  - ruilen tussen poolleden als de pool dat toestaat.
- **Transferperiodes** per pool.
- **Transacties zijn atomair** in een Durable Object per markt:
  - een idempotentiesleutel per opdracht;
  - geen negatieve saldi en geen kaartduplicatie;
  - een volledig transactielogboek.
- **Marktfilters:** positie, zeldzaamheid, rating, prijs en nationaliteit.

## 6. Economie

| Valuta | Bronnen | Uitgaven | Grens |
|---|---|---|---|
| XP | Cijfers, battles, challenges | — (niveau) | — |
| Coins | Cijfers, battles, snel verkopen, events | Packs in de winkel, transfermarkt | Nooit inwisselbaar voor echt geld |
| Draft-vouchers | Cijfers ≥ 7,5, events | Drafts | Maximaal 5 in voorraad (instelbaar) |
| Packs | Cijfers, events, winkel (coins) | Openen | — |

- **Inflatiebewaking:** de waarde van snel verkopen hangt af van rating en zeldzaamheid. De winkelprijzen en de verdiensten per week worden in het beheer gemonitord (geld in versus geld uit per poolweek).
- **Fraudebewaking:**
  - limieten per dag en week;
  - ontdubbelen;
  - een plafond voor niet-geverifieerde cijfers;
  - een signaal bij ongebruikelijke patronen (veel 10'en, invoer achteraf);
  - de poolbeheerder kan cijfers laten bevestigen.

## 7. Ranglijsten en seizoenen [ONTWERP]

- **Ultimate League:** battles, toernooien en teamprestaties.
- **Grade League:** alleen verbetering volgens de poolinstellingen (bijv. relatieve verbetering van het gemiddelde of het aantal behaalde doelen). Nooit absolute cijfers of gemiddelden van anderen.
- Verder: toetsweekrankings, draftrankings, clubrecords, kampioenschappen, seizoensgeschiedenis en een prijzenkast.
- **Badges en records worden afgeleid uit gegevens, niet opgeslagen** (bouwsteen B50).

## 8. Beheerinstellingen

**Platformbeheer:**
- gebruikers en moderatie;
- spelerscatalogus en kaartontwerpen;
- ratingschaal;
- packs en kansen (met validatie: geen lege categorieën, zie `validatePack`);
- beloningstabellen;
- events en toetsweektemplates;
- gamebalans;
- feature flags (die alleen bij exact `"true"` opengaan);
- integraties en auditlog.

**Poolbeheer:**
- naam, uitnodigingen en leden;
- vakken aan/uit en gameweging per vak;
- koppeling van vakken aan vaardigheden (optioneel, geen vaste koppeling in de code);
- beloningsregels, kaartstraffen en toetsweekdatums;
- rankings, challenges en traktaties;
- verificatiebeleid.

**Versionering:**
- Elke configuratie is een onveranderlijke versie (`config_versions`).
- Wedstrijden, beloningen en packs verwijzen naar de versie waaronder ze zijn ontstaan.
- Een wijziging geldt alleen voor nieuwe gebeurtenissen.

## 9. Database-entiteiten (eerste versie)

| Entiteit | Belangrijkste velden |
|---|---|
| `guardian` | id, e-mail (gehasht voor opzoeken), toestemmingsversie, aangemaakt |
| `player` (kind) | id, bijnaam, leeftijdsgroep, guardian_id, status, passkey-credentials |
| `consent` | player_id, guardian_id, scope, gegeven/ingetrokken, versie |
| `club` | player_id, naam, afkorting, embleem (JSON-parameters), tenues, stadion, slogan |
| `subject` / `period` / `school_year` | Per speler; vakken per pool te koppelen |
| `grade` | id, player_id, subject_id, toets, waarde, weging, datum, status, bron, external_ref, dedupe_key (uniek per speler) |
| `grade_source` | type (manual/confirmed/magister), configuratie |
| `reward_grant` | id, player_id, dedupe_key, tier, xp, coins, pack, voucher, config_version, seed |
| `card_def` | catalogus-id, base_id, naam, nationaliteit, club, positie(s), rating, stats, zeldzaamheid, portret, bron/licentie |
| `card_instance` | id, player_id, card_def_id, verkregen_via, tijd, vergrendeld (in elftal/markt) |
| `pack_def` / `pack_open` | Definitie per versie / opening met seed, resultaten |
| `lineup` | player_id, formatie, slots (JSON), versie |
| `draft_event` / `draft_session` | Event-config / sessie met aanbod, keuzes, pity-teller |
| `pool` / `pool_member` / `pool_settings` | Pool, rol (beheerder/lid), instellingen per versie |
| `invite` | pool_id, code-hash, verloopt, max_gebruik, gebruikt |
| `match` / `match_event` | Battle (pool, spelers, modus, config_version, status) / eventlog (zetten, timers) |
| `tournament` / `tournament_round` | Knock-out of competitie per toetsweek |
| `exam_week` | pool_id, nummer, begin, eind, template |
| `card_penalty` | pool_id, player_id, type, reden (privé), geldig_tot, opgeheven_door |
| `market_listing` / `market_tx` | Aanbod / transactie met idempotentiesleutel |
| `wallet_ledger` | player_id, delta coins/xp/vouchers, reden, referentie (saldo = som, nooit los opgeslagen) |
| `config_version` | type, versie, inhoud (JSON), actief vanaf |
| `audit_log` | actor, actie, object, tijd, ip-hash (beperkte bewaartermijn) |

## 10. Vastgelegde ontwerpkeuzes

| # | Keuze | Reden |
|---|---|---|
| K-01 | Fictieve spelers en clubs, verwisselbare catalogus | Juridisch (portret-, merk- en databankrecht) |
| K-02 | Cijferbron als adapter; handmatige invoer is de basis | Magister-API niet toegestaan |
| K-03 | Pure, deterministische engine in TypeScript, gedeeld door client en server | Server-authoritative, testbaar, reproduceerbaar |
| K-04 | Saldi als grootboek (`wallet_ledger`), status afgeleid uit gebeurtenissen | Geen inconsistentie of dubbele boekingen |
| K-05 | Kansen altijd tonen, geen echt geld | Transparantie en regelgeving |
| K-06 | Eigen kaartvorm en eigen vormgeving | Geen beschermde vormgeving kopiëren |
| K-07 | Onvoldoende = herstelkans, nooit publiek | Welzijn en het voorkomen van vernedering |
| K-08 | Geen streaks of dagelijkse loginbeloningen | Welzijn en het KIDS Act-voorstel |
