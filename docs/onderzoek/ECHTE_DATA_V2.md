# RANK11. — Echte data v2: wat kan wél rechtmatig?

- **Datum onderzoek:** 26 oktober 2026. Bronnen zijn geraadpleegd op 25–26 oktober 2026, tenzij anders vermeld.
- **Vertrekpunt:** `ECHTE_SPELERS.md` (verder: ES) en `BRONNENONDERZOEK.md` §1 (verder: BO). Dit document herhaalt die niet. Het zoekt actief naar ruimte voor echte voetballers, clubs, portretten en cijferkoppelingen.
- **Status:** dit is **géén juridisch advies**. Waar een bron ontbreekt, staat dat erbij.
- **Kernregel:** onduidelijke of onbewezen rechten tellen niet als toestemming. **GO** betekent dat er een aantoonbare rechtsgrond of toestemming is.
- **Labels:**
  - **VASTGESTELD**: staat zo in een primaire bron (wet, uitspraak, register of officiële pagina).
  - **WAARSCHIJNLIJK**: redelijke afleiding of een secundaire bron.
  - **ONZEKER**: geen bron, tegenstrijdige bronnen of een open rechtsvraag.
- **Beperking:** de merkenregisters van BOIP, EUIPO (eSearch), TMview, WIPO Global Brand Database en UKIPO waren niet automatisch te raadplegen. Ze zitten achter een captcha of anti-botcontrole, of de verbinding werd geweigerd. Die controles heb ik niet omzeild. Alleen het USPTO-register was leesbaar. Een handmatige controle in TMview (https://www.tmdn.org/tmview) blijft daarom nodig: zie §6.

---

## 1. Samenvatting

**Kern:** er is weinig ruimte voor echte bekende voetballers, ook niet als ze overleden zijn. Wel kan het volgende:
- feitelijke CC0-data **zonder personen**;
- fictieve clubs naar het model "Piemonte Calcio";
- echte namen en portretten **met schriftelijke toestemming** van de rechthebbenden, bijvoorbeeld een amateurclub of de nabestaanden;
- voor cijfers: een eigen import-sjabloon dat de leerling zelf invult.

### GO/NO-GO-tabel

| # | Optie | Advies | Kern |
|---|---|---|---|
| 1 | **Overleden legendes met CC0-foto** (Anefo/Nationaal Archief) | **NO-GO** zonder schriftelijke toestemming van de nabestaanden. **CONDITIONELE GO** met die toestemming | CC0 regelt alleen het auteursrecht. Het portretrecht loopt na het overlijden door via de nabestaanden (art. 21 jo. 25a Aw), zonder termijn. Nabestaanden kunnen daarbij een commercieel belang inroepen (Rb. Amsterdam 2018, Cruijff-nabestaanden). |
| 2 | **Overleden legendes, alleen naam** (geen beeld) | **NO-GO** (ONZEKER, dus geen bewezen recht) | Er is geen portret, dus art. 21 Aw speelt niet. Maar namen zijn vaak merk, bijv. CRUYFF voor "video game software", en worden door erven gelicentieerd (Puskás, Best, Maradona). Een vordering op grond van 6:162 BW is niet uitgeprocedeerd. |
| 3 | **Levende spelers via Wikidata (CC0)** | **NO-GO** | CC0 regelt alleen de rechten van Wikidata. Naam- en portretrecht en de AVG blijven van toepassing (zie ES optie A). |
| 4 | **Echte clubnamen zonder logo** (profclubs) | **NO-GO** | Clubnamen zijn merken. Eredivisie CV staat logo's alleen redactioneel toe. Man United dwong Football Manager in 2021 via een schikking tot "Manchester UFC". Het verweer van referentieel gebruik (art. 2.23 BVIE / 14 UMVo) past slecht bij een spel. |
| 4b | **Amateurclubnaam met schriftelijke toestemming van de vereniging** | **CONDITIONELE GO** | Toestemming is een rechtsgrond. Zonder toestemming is het ONZEKER (merk of handelsnaam niet uit te sluiten zonder registercheck). |
| 5 | **Fictieve namen "geïnspireerd op" echte clubs** | **CONDITIONELE GO** | Marktpraktijk: "Piemonte Calcio" (EA FC, 2019) met een eigen badge en tenue. Voorwaarden: geen clubnaam, afkorting, bijnaam, logo of tenue-replica, en geen verwarrende gelijkenis (art. 2.20 lid 2 sub b–d BVIE). Zie §3.6. |
| 6 | **Magister-partnerroute** | **NO-GO nu.** Later alleen met school, KvK en Edu-V | De checklist vraagt KvK, Edu-V/convenant, een verwerkersovereenkomst en een "legale relatie met de schoolorganisatie". Edu-V is voor leveranciers van onderwijs- en leermiddelen. Er is geen route waarbij een leerling zelf toegang geeft. |
| 7 | **Magister-export (CSV/Excel) door leerling** | **NO-GO als route** (niet gevonden) | Export naar CSV, Excel of PDF bestaat voor **docenten en medewerkers** (VASTGESTELD). Voor leerlingen of ouders is geen exportfunctie gevonden. Art. 20 AVG (dataportabiliteit) geldt niet voor cijfers. |
| 7b | **Eigen CSV-sjabloon dat de leerling zelf invult** | **GO** | Er is geen koppeling en geen voorwaarden van derden. Dit is gelijk aan "zelf invoeren" (BO §1), maar dan in bulk. |
| 8 | **Somtoday** (Connect-partner of export) | **NO-GO nu.** **CONDITIONELE GO** later via een school | Somtoday Connect is "er voor scholen en koppelpartners" en "de school bepaalt" (pagina gewijzigd 08-01-2026). Een exportfunctie voor leerlingen is niet gevonden. |

---

## 2. A — Historische legendes die zijn overleden

### 2.1 Portretrecht na het overlijden: wettekst (VASTGESTELD)

Bron: Auteurswet, wetten.overheid.nl (BWBR0001886, versie 04-02-2025).

- **Art. 21 Aw:** openbaarmaking van een portret dat zonder opdracht is gemaakt, is "niet geoorloofd, voor zover een redelijk belang van den geportretteerde **of, na zijn overlijden, van een zijner nabestaanden** zich tegen de openbaarmaking verzet".
  - Anders dan bij art. 19 lid 2 en art. 20 ("gedurende tien jaren na diens overlijden") noemt art. 21 **geen termijn**.
- **Art. 25a lid 1 Aw:** "In deze paragraaf worden onder nabestaanden verstaan de ouders, de echtgenoot of de geregistreerde partner en de kinderen." Verder: "De aan de nabestaanden toekomende bevoegdheden kunnen zelfstandig door ieder van hen worden uitgeoefend." En: "Bij verschil van mening kan de rechter een voor hen bindende beslissing geven."
- **Gevolgen:**
  - Kleinkinderen, broers en zussen, erven en stichtingen zijn **geen** nabestaanden in de zin van art. 21 (VASTGESTELD, wettekst). Zij kunnen het recht wel via een licentie van nabestaanden uitoefenen. Dat deed Interclarion S.L. voor de familie Cruijff (§2.2).
  - Leeft geen enkele ouder, echtgenoot, partner of kind meer, dan kan **niemand** zich nog op art. 21 beroepen (WAARSCHIJNLIJK, rechtstreekse lezing van de wet; geen rechtspraak gevonden).
  - Elke nabestaande kan zelfstandig optreden. Toestemming van één kind beschermt dus **WAARSCHIJNLIJK niet** tegen bezwaar van een ander kind. Vraag daarom alle nabestaanden om toestemming, of een gemachtigde partij.
- **Art. 21 geldt ook voor tekeningen en AI-gelijkenissen.** Davids/Riot en Verstappen/Picnic (ES §3) maken van een herkenbare tekening, avatar of lookalike een portret. Een AI-portret "in de stijl van" een legende helpt dus niet.

### 2.2 Rechtspraak: commercieel belang van nabestaanden (VASTGESTELD)

**Rb. Amsterdam (vzr.) 02-05-2018, ECLI:NL:RBAMS:2018:2983** (kort geding)
- **Partijen:** een zoon van Johan Cruijff en Interclarion S.L. tegen Xander Uitgevers. In het vonnis zijn de namen gepseudonimiseerd, maar de persoon is herleidbaar uit r.o. 2.1 (1947–2016, Ajax en Barcelona) en r.o. 4.13 ("aan Cruijff gelieerde stichtingen").
- **r.o. 2.2:** de nabestaanden hebben Interclarion "de exclusieve rechten verleend voor de exploitatie en handhaving in en buiten rechte van het portretrecht".
- **r.o. 4.8:** "Geportretteerden (of zoals in dit geval hun nabestaanden) behoeven niet toe te laten dat hun in de uitoefening van hun beroep verworven populariteit commercieel wordt geëxploiteerd … zonder dat zij daarvoor een vergoeding ontvangen". Ook: "Het meedelen in de voordelen van deze exploitatie is een redelijk belang in de zin van artikel 21 Aw."
- **r.o. 4.13:** de nabestaanden hebben belang bij eigen exploitatie, onder meer "ten behoeve van ondernemingen die computerspellen fabriceren". Dat geeft echter geen exclusief recht.
- **Uitkomst:** geen publicatieverbod voor de biografie, omdat die nieuwswaarde heeft (r.o. 4.10). Wel is "in beginsel" een redelijke vergoeding verschuldigd (r.o. 4.11).

**Rb. Amsterdam 19-12-2018, ECLI:NL:RBAMS:2018:9089** (bodemzaak, tussenvonnis, andere biografie)
- Dezelfde maatstaf (r.o. 4.5).
- Een citaatrecht naar analogie werd afgewezen, omdat de omslagfoto "versiering die kooplustopwekkend is bedoeld" is (r.o. 4.2).
- De beslissing over de vergoeding werd aangehouden. De einduitspraak heb ik niet gevonden (ONZEKER).

**Betekenis voor RANK11. (WAARSCHIJNLIJK):**
- Een kaartgame heeft minder informatiewaarde dan een biografie. Davids r.o. 4.15 noemt de skin "een optionele verfraaiing".
- Bij kaarten van legendes weegt het commerciële belang van de nabestaanden daarom **zwaarder** dan bij een boek.
- Dat de game gratis is, maakt de exploitatie kleiner, maar haalt het verzilverbare belang niet weg. Er is geen uitspraak over gratis games gevonden (ONZEKER).

**Overige rechtspraak**
- **"Van den Hurk" (Rb. Amsterdam 2012):** volgens secundaire bronnen moet de nabestaande een **eigen** redelijk belang hebben. Het vonnis zelf heb ik niet gevonden (ONZEKER).
- Er zijn tegenstrijdige secundaire bronnen. Sommige advocatensites stellen dat nabestaanden geen portretrecht hebben. Dat is in strijd met de wettekst en de vonnissen van 2018.

### 2.3 Naam- en persoonlijkheidsrecht van overledenen; AVG

- **AVG, overweging 27:** "This Regulation does not apply to the personal data of deceased persons." (VASTGESTELD, gdpr-info.eu). Voor overleden legendes speelt de AVG dus **niet**. Dat is een echt verschil met levende spelers.
  - Uitzondering: gegevens die óók over levende nabestaanden gaan.
  - Een Nederlandse aanvullende regeling voor overledenen heb ik niet gevonden (WAARSCHIJNLIJK: die is er niet).
- **Naam zonder beeld:**
  - Er is geen Nederlandse rechtspraak gevonden over commercieel gebruik van de naam van een overledene in een spel of op merchandise (ONZEKER).
  - Een vordering van nabestaanden of erven op grond van 6:162 BW (profiteren van bekendheid) is niet uitgesloten.
  - Ter vergelijking (niet toepasselijk):
    - **Duitsland:** het BGH (Kinski, 2006) begrenst de vermogensrechtelijke bescherming van de naam na overlijden tot 10 jaar (WAARSCHIJNLIJK, secundair).
    - **New York:** postmortaal publiciteitsrecht van 40 jaar.
  - Nederland kent zo'n regel niet.
- **Conclusie:** het naamgebruik zelf kent geen bewezen verbod, maar ook geen bewezen recht. Onder de kernregel van de opdrachtgever is dat dus geen GO. Daarnaast spelen merkrechten (§2.4).

### 2.4 Merkregistraties op namen van legendes

| Naam | Bevinding | Label |
|---|---|---|
| **Cruijff / Cruyff** | Woordmerk **CRUYFF**, USPTO reg. 3302680 (internationale registratie 0864508, prioriteit 10-02-2005). Houder Inter B.V. (Nederland). **LIVE.** Klasse 9: "computer game programs; video game software", plus klasse 25 (klasse 28 doorgehaald). Daarnaast reg. 3366221 (klasse 25, IR 0927710). Dat het om een Madrid-registratie van een Nederlandse houder gaat, wijst op een basismerk in de Benelux of de EU | Merk VASTGESTELD (USPTO); Benelux/EU-dekking WAARSCHIJNLIJK, niet gecontroleerd |
| Cruijff (portret) | De nabestaanden hebben de exploitatie exclusief aan Interclarion S.L. gelicentieerd | VASTGESTELD (ECLI:NL:RBAMS:2018:2983) |
| **Puskás** | Weduwe en dochter lieten de naam "Puskás Ferenc" in 2007 als merk beschermen. Het naamgebruiksrecht ligt bij puskas.com Kft. | WAARSCHIJNLIJK (444.hu, 12-06-2022) |
| **George Best** | IMG is licentieagent van de "George Best Estate". Er zijn deals voor kleding, een hotel en een plek "in EA's FIFA video game" | WAARSCHIJNLIJK (zoekindex van licenseglobal.com; de pagina gaf 403) |
| **Bobby Moore** | Er bestaan meerdere geregistreerde Britse "Bobby Moore"-merken | WAARSCHIJNLIJK (blog, 04-08-2016) |
| Maradona (ter vergelijking) | De erven procederen in de EU en het VK over merken op zijn naam. Het UKIPO weigerde aanvragen van derden wegens kwade trouw | WAARSCHIJNLIJK (nieuws) |
| Abe Lenstra, Faas Wilkes, Coen Moulijn, Rinus Michels, Eusébio, Lev Yashin | **Niet gecontroleerd**: registers niet bereikbaar. Geen nieuws over merken of licenties gevonden. Dat bewijst niets | ONZEKER |

**Juridisch kader:** gebruik van een merknaam als kaartnaam in een game raakt aan art. 2.20 lid 2 sub a–d BVIE en art. 9 lid 2 UMVo, zie §3.1. Klasse 9 "video game software" bij CRUYFF betekent mogelijk "gelijke waren". De uitzondering voor het gebruik van een naam (art. 2.23 lid 1 sub a BVIE / 14 lid 1 sub a UMVo) geldt alleen voor de **eigen** naam van de gebruiker: "the name … of the third party, where that third party is a natural person" (VASTGESTELD, art. 14 UMVo).

### 2.5 Foto's in het publieke domein of onder CC0

**Nationaal Archief: dataset en Anefo (VASTGESTELD)**
- Het Nationaal Archief heeft de rechten op "circa 430.000" van zijn afbeeldingen. Daarvan gaat "het merendeel … met een CC0 waiver", ouder materiaal als Public Domain.
- De belangrijkste bronnen zijn de fotocollecties Eerste Wereldoorlog, Van de Poll en **Anefo**.
- Bron: data.overheid.nl, dataset "Nationaal Archief foto's", gewijzigd 07-04-2022.

**Licentie per foto**
- In 2012 werden 140.000 Anefo-foto's eerst onder **CC BY-SA** vrijgegeven (WAARSCHIJNLIJK, Wikipedia).
- Alle hieronder gecontroleerde Commons-bestanden staan nu onder **CC0 1.0**, met "Auteursrechthebbende: Nationaal Archief" (VASTGESTELD, per bestandspagina).
- Commons waarschuwt dat het sjabloon {{Nationaal Archief}} "does not indicate the copyright status". **Controleer daarom elke foto afzonderlijk** in de metagegevens van het Nationaal Archief, via de handle-link.

**CC0 regelt het portretrecht niet (VASTGESTELD, CC0 1.0 legal code):**
- Sectie 1 noemt "publicity and privacy rights pertaining to a person's image or likeness". Die rechten worden alleen opgegeven voor zover ze bij de afstandsdoener zelf liggen.
- Sectie 4(c): de afstandsdoener "disclaims responsibility for clearing rights of other persons" en "for obtaining any necessary consents".
- Het Nationaal Archief kan dus geen afstand doen van het art. 21-recht van nabestaanden.

**Auteursrecht zonder CC0 (WAARSCHIJNLIJK; art. 37–38 Aw niet opnieuw nagelezen):** het auteursrecht duurt 70 jaar na de dood van de fotograaf. Bij een anonieme foto is dat 70 jaar na de openbaarmaking. Foto's van vóór circa 1955 met een onbekende maker zijn dus mogelijk publiek domein. Dat blijft ONZEKER per foto en is hier niet nodig, omdat Anefo onder CC0 staat.

**Overige aandachtspunten**
- Een foto in clubtenue kan clublogo's tonen (merk, en voor logo's ook auteursrecht). Kies "kop"-portretten of snijd bij.
- Andere personen op een groepsfoto hebben een eigen portretrecht. Snijd ook die weg.

### 2.6 Conclusie A en voorbeeldlijst

**Is er een categorie die "met redelijke zekerheid" bruikbaar is?**
- **In theorie wel:** een legende (1) van wie alle nabestaanden in de zin van art. 25a (ouders, echtgenoot of partner, kinderen) zijn overleden, (2) zonder merkregistratie op de naam en (3) met een CC0- of publiek-domeinfoto zonder logo's.
- **In de praktijk niet verantwoord:**
  - (a) Voor criterium 1 is genealogisch onderzoek naar privépersonen nodig. Dat is bewerkelijk en zelf privacygevoelig, en een fout is moeilijk te herstellen.
  - (b) Voor criterium 2 is een registercheck nodig die hier niet mogelijk was.
  - (c) Legendes die scholieren van 10–16 kennen, zijn juist de legendes met actieve nabestaanden of licentiehouders (Cruijff, Puskás, Best).
  - (d) Het enige vonnis over nabestaanden (2018) bevestigt hun commerciële aanspraak, en noemt computerspellen daarbij uitdrukkelijk.
- Wie zo oud is dat er geen nabestaanden meer leven (spelers van vóór de oorlog), is voor de doelgroep onbekend. Daarvan is ook weinig CC0-portretmateriaal te vinden: Anefo begint in 1945 (WAARSCHIJNLIJK).

**Wat wél kan: een toestemmingsroute (CONDITIONELE GO)**
- Vraag schriftelijke, kosteloze toestemming aan **alle** nabestaanden of aan hun gevolmachtigde, bijvoorbeeld een stichting of licentiehouder. Laat die toestemming dekken:
  - naam en portret;
  - bewerking (kaartframe, uitsnede);
  - gebruik in een gratis, besloten schoolgame;
  - de looptijd;
  - intrekking.
- Combineer dat met een Anefo-CC0-foto. Kosten: tijd en eventueel een vergoeding (ONZEKER).

**Voorbeeldlijst** (sterfdata: Wikidata via SPARQL, 26-10-2026; foto's: Commons-bestandspagina's, 26-10-2026)

| Legende | Overleden | CC0-foto (bestanddeelnr., datum, maker) | Merk / rechthebbende | Oordeel |
|---|---|---|---|---|
| Johan Cruijff | 24-03-2016 | niet gecontroleerd | CRUYFF klasse 9 (video game software); portretlicentie bij Interclarion | **NO-GO** |
| Ferenc Puskás | 17-11-2006 | 924-5181, 04-05-1971, onbekend/Anefo | Merk sinds 2007, puskas.com Kft. (W.) | **NO-GO** |
| George Best | 25-11-2005 | niet gecontroleerd | Estate via IMG, o.a. EA FIFA (W.) | **NO-GO** |
| Bobby Moore | 24-02-1993 | 922-9422, 05-11-1969, Eric Koch/Anefo (met P. Bonetti) | Britse merken (W.) | **NO-GO** |
| Abe Lenstra | 02-09-1985 | 907-8102 ("Kop"), 06-06-1956, Joop van Bilsen/Anefo | niet gecontroleerd | NO-GO zonder toestemming; toestemmingsroute mogelijk |
| Faas Wilkes | 15-08-2006 | 907-8103 ("Kop"), 06-06-1956, Joop van Bilsen/Anefo | niet gecontroleerd | idem |
| Coen Moulijn | 04-01-2011 | 923-4847, 30-04-1970, onbekend/Anefo (wedstrijd, clubtenue) | niet gecontroleerd | idem |
| Rinus Michels | 03-03-2005 | 926-9879, 06-02-1974, onbekend/Anefo | niet gecontroleerd | idem |
| Lev Yashin | 20-03-1990 | 912-1799, 06-03-1961, Henk Lindeboom/Anefo (met I. Netto) | niet gecontroleerd | idem |
| Eusébio | 05-01-2014 | niet gecontroleerd | niet gevonden | idem |

"Toestemmingsroute mogelijk" betekent niet dat ik nabestaanden heb vastgesteld. Of en welke nabestaanden er leven, is bewust niet onderzocht (privacy). Ga ervan uit dat ze er zijn.

---

## 3. B — Echte clubnamen zonder logo

### 3.1 Wettekst

**UMVo 2017/1001 (VASTGESTELD, legislation.gov.uk, versie "as adopted")**
- Art. 9 lid 2 sub a: identiek teken voor identieke waren.
- Art. 9 lid 2 sub b: verwarringsgevaar, "includes the likelihood of association".
- Art. 9 lid 2 sub c: bekend merk, gebruik "without due cause takes unfair advantage of, or is detrimental to, the distinctive character or the repute".
- Art. 9 lid 3 sub a–f: voorbeelden van verboden handelingen.

**Uitzonderingen (art. 14 UMVo)**
- Lid 1 sub a: de eigen naam van een natuurlijk persoon.
- Lid 1 sub b: beschrijvende aanduidingen.
- Lid 1 sub c: gebruik "for the purpose of identifying or referring to goods or services as those of the proprietor".
- Lid 2: alleen "in accordance with honest practices in industrial or commercial matters".

**BVIE (VASTGESTELD, implementatietabel bij Richtlijn 2015/2436, officielebekendmakingen blg-839468)**
- Art. 2.20 BVIE volgt art. 10 van de Richtlijn. Art. 2.23 lid 1–2 volgt art. 14.
- Art. 2.20 lid 2 sub d (gebruik "anders dan ter onderscheiding van waren of diensten", zonder geldige reden, met ongerechtvaardigd voordeel of afbreuk) "bestond reeds in het BVIE".
- **Benelux-specifiek:** ook niet-merkmatig gebruik, zoals een clubnaam als label in een game, kan dus inbreuk zijn als de clubnaam bekend is.
- De actuele geconsolideerde BVIE-tekst (BOIP) zat achter een captcha. Ik heb de tekst dus via de richtlijnconcordantie gelezen.

### 3.2 "Gebruik in het economisch verkeer"

- Arsenal/Reed (HvJ C-206/01, 12-11-2002): de merkhouder kan optreden als gebruik "in the course of trade" de herkomstfunctie kan aantasten. Het is "immaterial" dat het teken als "badge of support" wordt gezien (WAARSCHIJNLIJK; Wikipedia en Curia-persbericht).
- De gangbare formule "commercial activity with a view to economic advantage and not as a private matter" heb ik niet in de arresttekst kunnen nalezen (EUR-Lex en Curia blokkeerden).
- **Toepassing (ONZEKER):**
  - Een gratis, besloten game van een particulier zonder reclame valt mogelijk buiten het economisch verkeer.
  - Een openbaar aangeboden app voor veel gebruikers, of een app die Denckh promoot, valt er **WAARSCHIJNLIJK** wel onder.
  - Bouw niet op dit argument.

### 3.3 Rechtspraak en praktijk bij games en replica's

- **Opel/Autec (HvJ C-48/05, 2007):** het Opel-logo op een schaalmodel is pas inbreuk als het gebruik de functies van het merk kan aantasten. De Duitse rechter vond dat het publiek het logo zag als onderdeel van een getrouwe replica, niet als herkomstaanduiding (WAARSCHIJNLIJK, Mishcon 06-11-2020 en Appleyard Lees). Dit is het sterkste argument vóór clubnamen in games. Maar het blijft een analogie.
- **Manchester United/Sports Interactive (Football Manager), VK:**
  - De club procedeerde in 2020.
  - In augustus 2021 volgde een schikking, "on a no admissions basis". Sindsdien heet de club "Manchester UFC" in FM22.
  - SI zei geen licentie nodig te hebben (WAARSCHIJNLIJK, Sky Sports en Techdirt).
  - **Betekenis:** er is geen uitspraak, maar een topclub handhaaft zelfs bij alleen de naam, en de ontwikkelaar gaf toe.
- **Juventus / "Piemonte Calcio":**
  - Konami kreeg in 2019 exclusief de "team name, crest, and official kits" in "console football video games".
  - EA maakte er "Piemonte Calcio … with a custom badge and kit" van. De spelers bleven, via FIFPRO (WAARSCHIJNLIJK; GameSpot en VGC, 2019).
  - **Betekenis:** clubnamen worden exclusief gelicentieerd. Zelfs de grootste uitgever gebruikt zonder licentie geen naam.
- **Eredivisie CV:** "Het is enkel toegestaan om de logo's te gebruiken voor redactionele doeleinden." Voor commercieel gebruik: contact met Eredivisie CV of de clubs (VASTGESTELD, eredivisie.nl/meer/merk, © 2026, geen datum). Over namen zegt de pagina niets.
- **Nederlandse rechtspraak over clubnamen in games:** niet gevonden (ONZEKER).

### 3.4 Referentieel gebruik (art. 2.23 lid 1 sub c BVIE / 14 lid 1 sub c UMVo)

- De uitzondering is bedoeld om waren of diensten **van de merkhouder** aan te duiden, bijv. "geschikt voor". Een clubnaam als speelbaar team in een spel duidt geen waar van de club aan. Het teken maakt dan deel uit van het eigen product (WAARSCHIJNLIJK).
- Ook "honest practices" is onzeker als het spel de reputatie benut zonder vergoeding, terwijl clubs dat gebruik juist licentiëren.
- **Conclusie:** geen betrouwbaar verweer.

### 3.5 Amateurclubs

- Of een amateurclub een merk heeft, is per club in TMview te controleren. Dat kon hier niet (zie Beperking bovenaan).
- **Zonder merk:**
  - De Handelsnaamwet beschermt tegen het *voeren* van een verwarrende handelsnaam. RANK11. voert de clubnaam niet als eigen naam (WAARSCHIJNLIJK geen handelsnaaminbreuk).
  - Een vordering op grond van 6:162 BW is denkbaar maar onwaarschijnlijk. Er is geen rechtspraak gevonden (ONZEKER).
- **Extra risico:** amateurclubs bestaan uit herkenbare, vaak minderjarige leden. Fictieve "spelers" met ratings bij een echte lokale club kunnen als een echt persoon worden opgevat (portret- of AVG-vragen) of tot pesten leiden (WAARSCHIJNLIJK).
- **Advies:** alleen met schriftelijke toestemming van het bestuur van de vereniging (CONDITIONELE GO). Leg in de toestemming vast: naam, eventueel logo, duur, intrekking, en dat er geen echte leden worden afgebeeld.

### 3.6 Fictieve namen "geïnspireerd op" echte clubs: criteria (CONDITIONELE GO)

Op basis van art. 2.20 lid 2 sub b–d BVIE en de praktijk van EA (WAARSCHIJNLIJK):

1. Geen officiële naam, afkorting of bijnaam, en geen merkachtig deel daarvan. Dus niet "Ajax", "PSV", "Feyenoord", "Godenzonen", "Boeren", "Ajacieden".
2. Een plaats- of regionaam is beschrijvend (art. 2.23 lid 1 sub b BVIE) en mag, mits er geen clubspecifiek element bij komt. Bijvoorbeeld "FC Amstelstad" of "Maasstad United".
   - Maar: plaatsnaam + kenmerkende clubkleuren + oprichtingsjaar samen kan de bekende club oproepen (sub c/d) (ONZEKER).
   - Kies daarom kleuren en jaartallen zelf.
3. Eigen logo en tenue, die niet lijken op het clublogo of het iconische shirtontwerp.
4. Geen mapping in de code of marketing als "dit is Ajax". Ook geen hint-teksten of community-patches die de echte namen terugzetten.
   - Man United probeerde in 2020 ook fan-patches in de zaak te betrekken. Dat verzoek werd afgewezen (WAARSCHIJNLIJK, WIPR en RPC).
5. Een korte merkcheck per fictieve naam in TMview, zodat de naam niet toevallig een bestaand merk is (zie ES optie K).

---

## 4. C — Feitelijke data via Wikidata

- **CC0 bevestigd (VASTGESTELD):** "All data in Wikidata has a CC0 license." (Wikidata:Licensing, bewerkt 24-09-2026). Daarmee is het databank- en auteursrecht van Wikidata geregeld.
- **Geen regeling voor naam- of persoonlijkheidsrecht of AVG (VASTGESTELD):**
  - De licentiepagina zegt er niets over. De footer meldt "additional terms may apply".
  - CC0 §4(c) verklaart dat de afstandsdoener geen verantwoordelijkheid neemt voor "rights of other persons" en "consents". Datzelfde mechanisme beschrijft ES §6 voor Commons.
- **Wikidata-beleid "Living people" (VASTGESTELD, beleid, bewerkt 17-04-2026):**
  - "we value the dignity of living people";
  - gegevens alleen als ze "widespread public knowledge" zijn.
  - Het beleid noemt geen plichten voor hergebruikers. Die volgen uit de wet.
- **AVG:** voor levende spelers zijn naam, geboortedatum, club en een eigen rating persoonsgegevens. De AVG geldt los van de CC0-licentie (WAARSCHIJNLIJK; zie ES optie A). Voor overleden personen geldt de AVG niet (overweging 27).
- **Conclusie:** de stelling "databankrecht geregeld, naam- en persoonlijkheidsrecht van levende spelers niet" is **bevestigd**.
  - Bruikbaar wél: Wikidata-feiten zonder personen, bijv. landen, stadions als geografische plekken en competitiestructuren. Let bij stadions op merknamen van sponsors.
  - Ook bruikbaar: feiten over **overleden** legendes, maar alleen naast een toestemmingsroute (§2.6), want de naam blijft het probleem.

---

## 5. D — Magister en Somtoday: geautoriseerde koppeling en alternatieven

### 5.1 Magister: officiële route anno 2026 (VASTGESTELD, magister.nl/partners, geen datum, © 2026, geraadpleegd 26-10-2026)

**Koppelopties**
- **Edu-V:** "Magister maakt gebruik van de EDU-V standaarden". Dat omvat leermiddelen, leerling-, klas- en vakgegevens en toetsinformatie, plus een "checklist voor aansluiten op Magister via Edu-V".
- **SCIM** (Edustandaard), voor IAM-leveranciers.
- **1EdTech grades**, voor internationale toetsleveranciers.
- **JOIN Aanmelden.**
- **Magister API:** "neem dan contact op … we gaan in gesprek".

**Checklist voor partners**
- deelname aan Privacyconvenant 3.0, óf Edu-V met vermelding in het keurmerkregister;
- verwerkersovereenkomst: convenantmodel of Edu-V VWO 4.0;
- "een legale relatie met de schoolorganisatie (en leerling)" en doelbinding;
- inschrijving bij de KvK.

**Wie besluit:** scholen vinden geaccrediteerde leveranciers in de "Privacy Manager". Een school kan ook een nieuwe leverancier aanmelden.

**Verbod buiten de partnerroute:** het API-gebruik door "niet-geautoriseerde partijen is verboden" (Magister-voorwaarden, zie BO §1).

**Kosten en doorlooptijd**
- Magister noemt geen kosten en geen doorlooptijd (ONZEKER).
- Edu-V werkt met releases in voor- en najaar, met een "maximum aantal leveranciers" per release (VASTGESTELD, edu-v.org/word-deelnemer, gewijzigd 18-06-2026).
- Het traject loopt via drie stappen (VASTGESTELD, edu-v.org "Hoe krijg je het keurmerk?", gewijzigd 05-03-2026):
  - een IBP-kwalificatie (formele toets door SIVON op de modelverwerkersovereenkomst; later een materiële toets);
  - een eerste gekwalificeerde gegevensdienst;
  - kwalificatie van alle gegevensdiensten.
- De tegemoetkoming van OCW is op: "geen geld meer beschikbaar voor leveranciers die willen toetreden" (VASTGESTELD, Edu-V Q&A).
- **Scope van Edu-V:** "leveranciers van digitale onderwijs- en leermiddelen" in po, vo en mbo. Of iets binnen scope valt, blijkt uit een intakegesprek (VASTGESTELD). Of een motivatiegame die de school niet zelf inkoopt daarbinnen valt, is ONZEKER, en WAARSCHIJNLIJK niet zonder school als klant.
- **Model-verwerkersovereenkomst 5.0** is "in ontwikkeling" (edu-v.org, 01-10-2026).
- **Uitrol in het vo** in schooljaar 2026–2027 is "beperkt en gecontroleerd", via SEM/Start Schooljaar (edu-v.org, 05-05-2026).

### 5.2 Somtoday (VASTGESTELD, som.today/partnerprogramma, gewijzigd 08-01-2026)

- "Somtoday Connect is het API koppelplatform … De school bepaalt zelf welke data er wordt uitgewisseld en met wie. Denk bijvoorbeeld aan cijfers".
- "Somtoday Connect is er voor scholen en koppelpartners." Daarnaast: "scholen [kunnen] via Connect hun zelf ontwikkelde applicaties aansluiten op hun Somtoday omgeving."
- Het traject: oriëntatie → partnervoorstel → bouwen (testomgeving en API-documentatie pas **na akkoord**) → livegang. Er zijn geen kosten genoemd.
- Een **mogelijke latere route (WAARSCHIJNLIJK):** een pilotschool die RANK11. als eigen gekozen applicatie aansluit, met de school als verwerkingsverantwoordelijke en RANK11./Denckh als verwerker met een verwerkersovereenkomst. Dat vereist een rechtspersoon of eenmanszaak met KvK, een DPIA en een privacyconvenant- of Edu-V-traject (ONZEKER).

### 5.3 Overige standaarden en identiteit (wat ze wél en niet zijn)

| Standaard | Wat | Relevant voor RANK11.? | Label |
|---|---|---|---|
| **Edu-V** | Afsprakenstelsel en keurmerk (opgevolgd uit het privacyconvenant). Standaarden voor gegevensdiensten in po, vo en mbo | Alleen via een school en als leverancier in scope | VASTGESTELD |
| **Edustandaard SCIM** | Provisioning van identiteiten (IAM) | Nee, alleen voor IAM-leveranciers | VASTGESTELD (Magister) |
| **1EdTech grades** | Toetsresultaten **naar** Magister schrijven | Nee, de richting is omgekeerd | VASTGESTELD (Magister) |
| **OOAPI** (Open Onderwijs API, SURF/SURFeduhub) | Onderwijsdata van **hbo, wo en mbo** | Nee, niet voor vo | WAARSCHIJNLIJK (GitHub-specificatie, SURF-wiki) |
| **ECK iD** | Ketenpseudoniem voor leerlingen in de leermiddelenketen (bestellen, toegang, resultaten), uitgegeven via de Nummervoorziening van Kennisnet | Alleen voor partijen in de leermiddelenketen | WAARSCHIJNLIJK (Kennisnet-bijlage, concept 2018) |
| **Entree Federatie** (Kennisnet) | Federatieve login (school als identity provider, dienst als service provider) | Alleen met aansluitvoorwaarden en school-IdP. Geen bron voor cijfers | WAARSCHIJNLIJK (KPMG 2025; actuele voorwaarden niet gevonden) |
| OAuth/SAML | De techniek achter Entree en Connect | Pas relevant na een partnerakkoord | WAARSCHIJNLIJK |

### 5.4 Datamodel (wat zou er binnenkomen?)

- **Magister-begrippen** (VASTGESTELD, Magister Service "Cijfers", docentartikel, gewijzigd 31-01-2023):
  - cijferkolommen (docent-, herkansings-, PTA- en cijfertekstkolom, berekende kolom);
  - "weegfactor";
  - "cijferperiode(n)";
  - gemiddelde kolom;
  - toets met "afnamedatum";
  - "cijferkolomverzameling";
  - publiceren: cijfers zijn pas daarna zichtbaar voor leerling en ouder;
  - vlaggen voor telt mee, inhalen en vrijstelling.
- De velden van de Magister-API, Somtoday Connect of Edu-V-toetsresultaten zijn pas na een akkoord beschikbaar (VASTGESTELD voor Somtoday; ONZEKER voor Magister). Een eigen import moet deze begrippen dus zelf modelleren: vak, cijfer, weging, periode, datum en eventueel een toetsnaam.

### 5.5 Kan een leerling zelf (zonder school) toegang geven?

**Nee** (VASTGESTELD voor het beleid van de leveranciers):
- Magister vraagt een relatie met de schoolorganisatie en verbiedt niet-geautoriseerd API-gebruik.
- Somtoday: "De school bepaalt".
- Iddink schreef in 2020: "de school is de eigenaar van de data, en niet de scholier" (BO §1).
- Inloggegevens of tokens van de leerling gebruiken valt daarbuiten (BO §1).

### 5.6 Export door leerling of ouder, en AVG-rechten

- **Magister:** de export naar CSV, Excel en PDF zit in Cijferinvoer en Cijferoverzicht voor **docenten** (VASTGESTELD). Het cijferoverzicht is "per rol" in te stellen door de school (Magister 6-handleiding, 2020, WAARSCHIJNLIJK).
- In de Magister-onboarding voor brugklassers 2026–2027 (leerling en ouder) staat alleen "Bekijk je laatste en al je cijfers" en meldingen. Er staat **geen export** in (VASTGESTELD, comm.magister.nl, PDF 2026). Of een school een exportrol voor leerlingen kan aanzetten, is ONZEKER.
- **Somtoday:** geen exportfunctie voor leerling of ouder gevonden in handleidingen en de app-beschrijving (ONZEKER, oude bronnen).
- **Art. 20 AVG (dataportabiliteit)** geldt alleen bij toestemming of overeenkomst, en niet bij een "task carried out in the public interest" (VASTGESTELD, AVG-tekst). Kennisnet (Handreiking rechten betrokkene po-vo v2.0, 28-10-2019):
  - "Cijfers, rapporten, beoordelingen … toets- en examenresultaten vallen buiten het recht van dataportabiliteit";
  - scholen verwerken op grond van een wettelijke plicht of een publieke taak (VASTGESTELD).
- **Art. 15 AVG (inzage en kopie)** geldt wel. Onder de 16 jaar oefent de ouder het recht uit (art. 5 lid 4 UAVG, zie BO §3). Een kopie hoeft niet machineleesbaar te zijn (WAARSCHIJNLIJK). Dit is ook geen schaalbare route voor een game.
- **Printen of opslaan als PDF via de browser** van de eigen cijferpagina is technisch mogelijk. Het automatisch uitlezen (OCR of parsen) van zo'n PDF of screenshot raakt niet aan de API.
  - Of het onder de voorwaarden van Magister of Somtoday valt, is ONZEKER.
  - Het brengt bovendien overbodige gegevens binnen, zoals namen van docenten en andere vakken (dataminimalisatie).
  - Advies: niet bouwen.
- **Rechtmatig alternatief (GO):**
  - een eigen CSV- of formuliersjabloon van RANK11. (vak, cijfer, weging, datum), dat de leerling zelf vult;
  - de bestaande anti-fraudemaatregelen uit BO §1;
  - geen namen van Magister of Somtoday in de UI of marketing (merk).

---

## 6. Onzekerheden

1. **Merkregisters niet gecontroleerd** (behalve CRUYFF via USPTO). Handmatig in TMview na te lopen:
   - voor elke legendenaam;
   - voor elke amateurclub met toestemming;
   - voor elke fictieve clubnaam.
   - Kies de Nice-klassen 9, 28 en 41 en de kantoren BX, EM en WO.
2. **Duur en omvang van het portretrecht na overlijden.** Art. 21 kent geen termijn. Niet zeker is:
   - of een eigen belang van de nabestaande vereist is (Van den Hurk, niet gelezen);
   - of de toestemming van één nabestaande volstaat;
   - hoe een rechter "gratis game" weegt.
   - Er zijn twee Amsterdamse vonnissen uit 2018, geen hoger beroep of HR.
3. **Naamgebruik zonder beeld (levend of overleden)** via 6:162 BW. Er is geen Nederlandse rechtspraak. Niet zeker is ook of een gratis, besloten game "economisch verkeer" is (merkrecht). Via Denckh WAARSCHIJNLIJK wel.
4. **Clubnamen in games.** Er is geen EU- of Nederlandse uitspraak. Opel/Autec pleit voor, de FM-schikking en de exclusiviteitspraktijk pleiten tegen. Bij fictieve "geïnspireerd op"-namen is de grens voor oproepen van de reputatie (art. 2.20 lid 2 sub c/d) niet scherp.
5. **Magister en Somtoday.** Onbekend zijn:
   - kosten en doorlooptijd;
   - of een motivatiegame binnen de Edu-V-scope valt;
   - of een school een exportrol voor leerlingen kan aanzetten;
   - de actuele aansluitvoorwaarden van Entree en ECK iD.
   - Alleen een intake bij Edu-V of Magister of Somtoday geeft zekerheid.
6. **Niet gelezen primaire bronnen:**
   - EUR-Lex/Curia (Arsenal C-206/01, Opel C-48/05);
   - de geconsolideerde BVIE-tekst van BOIP (captcha);
   - het "Van den Hurk"-vonnis;
   - de einduitspraak in de Cruijff/Xander-bodemzaak;
   - licenseglobal.com (403);
   - een school-handleiding Magister voor leerlingen (503).

---

## 7. Bronnen

Alle bronnen zijn geraadpleegd op 25–26-10-2026. Tussen haakjes staat de datum van de bron zelf, voor zover bekend.

**Wetgeving**
- Auteurswet, art. 19–21 en 25a: https://wetten.overheid.nl/BWBR0001886/2025-02-04 (versie 04-02-2025 t/m 30-06-2025, artikelen ongewijzigd nagelezen)
- UMVo 2017/1001, art. 9 en 14 ("as adopted"): https://www.legislation.gov.uk/eur/2017/1001/article/9/adopted en https://www.legislation.gov.uk/eur/2017/1001/article/14/adopted
- Implementatietabel Richtlijn 2015/2436 naar BVIE: https://zoek.officielebekendmakingen.nl/blg-839468.pdf
- AVG, art. 20: https://gdpr-info.eu/art-20-gdpr/ ; overweging 27: https://gdpr-info.eu/recitals/no-27/
- CC0 1.0 legal code: https://creativecommons.org/publicdomain/zero/1.0/legalcode.en

**Rechtspraak**
- Rb. Amsterdam (vzr.) 02-05-2018, ECLI:NL:RBAMS:2018:2983: https://data.rechtspraak.nl/uitspraken/content?id=ECLI:NL:RBAMS:2018:2983
- Rb. Amsterdam 19-12-2018, ECLI:NL:RBAMS:2018:9089 (tussenvonnis): https://data.rechtspraak.nl/uitspraken/content?id=ECLI:NL:RBAMS:2018:9089
- "Van den Hurk" (secundair, niet geverifieerd): https://www.boek9.nl/boek9-berichten/het-portretrecht-van-een-overledene (403) en https://www.banning.nl/publication/leven-na-de-dood-het-portretrecht-van-een-overledene/
- Arsenal/Reed (secundair): https://en.wikipedia.org/wiki/Arsenal_Football_Club_v_Reed ; Curia-persbericht: https://curia.europa.eu/en/actu/communiques/cp02/aff/cp0253en.htm
- Opel/Autec en games (secundair): https://www.mishcon.com/news/brands-in-sports-video-games-whyfootball-managermight-be-the-exception (06-11-2020) ; https://www.appleyardlees.com/trade-marks-can-they-be-infringed-by-a-toy/
- Man United/Football Manager: https://www.skysports.com/football/news/11667/12374507/manchester-united-to-be-renamed-on-football-manager-following-trademark-settlement (08-2021) ; https://www.rpclegal.com/thinking/ip/segas-early-win-against-man-utd-in-football-manager-trade-mark-case/ ; https://www.worldipreview.com/news/judge-rejects-man-utd-s-football-manager-fan-site-claims-19746
- Postmortaal recht DE/NY (secundair): https://ipkitten.blogspot.com/2009/04/post-mortem-publicity-rights-can-you.html ; https://www.herrick.com/publications/new-york-enacts-new-post-mortem-publicity-rights-law-with-significant-implications-for-commercial-advertising-and-marketing-uses/

**Merken en licenties van namen**
- USPTO, CRUYFF reg. 3302680: https://tsdr.uspto.gov/statusview/rn3302680 ; reg. 3366221: https://tsdr.uspto.gov/statusview/sn79039878
- Puskás-merk 2007: https://444.hu/2022/06/12/jobban-keres-szollosi-gyorgy-puskas-ferenc-hagyatekan-mint-a-focista-sajat-csaladja (12-06-2022)
- George Best Estate/IMG: https://www.licenseglobal.com/football-soccer/legendary-footballer-george-best-gets-hotel (403; via zoekindex)
- Bobby Moore-merken: https://brianconroy.com/2016/08/04/trademarks-uk-bobby-moore/ (04-08-2016)
- Maradona-erven: https://thebarristergroup.co.uk/blog/maradonas-children-win-landmark-uk-legal-battle-over-image-rights ; https://breakingnews.ie/world/diego-maradonas-heirs-win-legal-battle-over-use-of-trademark-1548997.html
- Juventus/Piemonte Calcio: https://www.gamespot.com/articles/fifa-20-loses-juventus-after-pes-2020-announces-ex/1100-6468449 ; https://www.videogameschronicle.com/news/konami-signs-juventus-fc-exclusively-for-efootball-pes (2019)
- Eredivisie, merk en logo's: https://eredivisie.nl/meer/merk/ (© 2026)
- Registers (handmatig te gebruiken; automatisch niet bereikbaar): https://www.tmdn.org/tmview , https://euipo.europa.eu/eSearch/ , https://www.boip.int , https://branddb.wipo.int

**Foto's en open data**
- Nationaal Archief, open data foto's: https://data.overheid.nl/en/dataset/nationaal-archief-foto-s (07-04-2022)
- Anefo (achtergrond, CC BY-SA 2012): https://en.wikipedia.org/wiki/Anefo
- Commons-bestanden (CC0, auteursrechthebbende Nationaal Archief):
  - https://commons.wikimedia.org/wiki/File:Kop_Abe_Lenstra,_Bestanddeelnr_907-8102.jpg
  - https://commons.wikimedia.org/wiki/File:Kop_Faas_Wilkes,_Bestanddeelnr_907-8103.jpg
  - https://commons.wikimedia.org/wiki/File:Coen_Moulijn_in_aktie,_Bestanddeelnr_923-4847.jpg
  - https://commons.wikimedia.org/wiki/File:Rinus_Michels,_Bestanddeelnr_926-9879.jpg
  - https://commons.wikimedia.org/wiki/File:Puskás,_Bestanddeelnr_924-5181.jpg
  - https://commons.wikimedia.org/wiki/File:Aankomst_Russische_voetballers_op_Schiphol._Lev_Yashin_(rechts)_en_Igor_Netto_in,_Bestanddeelnr_912-1799.jpg
  - https://commons.wikimedia.org/wiki/File:Anefo_922-9422_Peter_Bonetti,_Bobby_Moore,_Amsterdam_05.11.1969.jpg
- Wikidata, licentie: https://www.wikidata.org/wiki/Wikidata:Licensing (24-09-2026) ; Living people: https://www.wikidata.org/wiki/Wikidata:Living_people (17-04-2026) ; sterfdata via https://query.wikidata.org/

**Magister, Somtoday en sectorstandaarden**
- Magister Partnerprogramma: https://magister.nl/partners (© 2026)
- Magister Service, Cijfers (docent): https://service.magister.nl/support/solutions/articles/101000454201-cijfers (31-01-2023)
- Magister-onboarding brugklassers 2026–2027: https://comm.magister.nl/hubfs/Campagnes/Onboarden%20brugklassers/Schooljaar%202026%20-%202027/Magister%20-%20Onboarding%20brugklassers%202026-2027.pdf
- Somtoday partnerprogramma / Connect: https://som.today/partnerprogramma/ (08-01-2026)
- Edu-V:
  - https://www.edu-v.org/voor-leveranciers/hoe-krijg-je-het-keurmerk/ (05-03-2026)
  - https://www.edu-v.org/voor-leveranciers/voor-wie-is-het-keurmerk-bedoeld/ (12-08-2025)
  - https://www.edu-v.org/voor-leveranciers/word-deelnemer/ (18-06-2026)
  - https://www.edu-v.org/qas-tegemoetkomingsregeling-leveranciers/
  - https://www.edu-v.org/qa/
  - https://www.edu-v.org/nieuws/uitrol-edu-v-standaarden-in-po-en-vo-schooljaar-2026-2027/ (05-05-2026)
- Kennisnet, Handreiking rechten betrokkene po-vo v2.0: https://normenkaderibp.kennisnet.nl/app/uploads/Handreiking-rechten-betrokkene-po-vo-pdf.pdf (28-10-2019)
- ECK iD / Nummervoorziening: https://www.kennisnet.nl/app/uploads/Bijlage_bij_Aansluitvoorwaarden_-_Dienst_Nummervoorziening.pdf (concept 2018)
- Entree Federatie (secundair): https://kpmg.com/nl/nl/home/insights/2025/01/wat-is-een-federatief-authenticatieplatform.html (01-2025)
- OOAPI: https://github.com/open-education-api/specification ; https://wiki.surfnet.nl/display/SURFeduhub/SURFeduhub
