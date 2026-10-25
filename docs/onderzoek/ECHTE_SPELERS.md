# RANK11. — Echte spelers, foto's, clubs en AI-portretten: verdiepend rechtenonderzoek

- **Datum onderzoek:** 25 oktober 2026. Alle bronnen zijn op die datum geraadpleegd, tenzij anders vermeld.
- **Vertrekpunt:** `BRONNENONDERZOEK.md` §2. Dit document herhaalt dat niet, maar verdiept en verifieert het, met primaire bronnen waar die bereikbaar waren.
- **Methode:** deskresearch met zoekmachine, wetteksten, open data van de Rechtspraak, licentieteksten en voorwaardenpagina's. Er is geen contact geweest met licentiegevers of leveranciers.
- **Status:** dit is **géén juridisch advies**. Waar een vraag niet met een bron te beantwoorden is, staat dat er expliciet bij.
- **Kernregel opdrachtgever:** onduidelijke of onbewezen rechten tellen niet als toestemming. **GO** betekent dat er een aantoonbare rechtsgrond of licentie is.
- **Labels:**
  - **VASTGESTELD** — staat zo in een genoemde primaire bron.
  - **WAARSCHIJNLIJK** — redelijke afleiding of een secundaire bron.
  - **ONZEKER** — geen bron, tegenstrijdige bronnen of een open rechtsvraag.

---

## 1. Samenvatting

1. **Echte spelers vragen altijd een recht naast de data zelf.** Het portretrecht (art. 21 Aw) beschermt ook getekende of gegenereerde gelijkenissen. Dat volgt uit Davids/Riot (2017) en Verstappen/Picnic (HR 2022).
   - Profvoetballers hebben "verzilverbare populariteit": commerciële exploitatie zonder vergoeding hoeven ze niet te dulden (HR Cruijff 2013, r.o. 3.6.3).
   - Of naamgebruik zónder beeld onrechtmatig is (art. 6:162 BW), is in Nederland niet uitgeprocedeerd (**ONZEKER**). Er is dus ook geen bewezen recht om het wel te doen.
2. **Geen enkele data-API of fotolicentie draagt naam- of portretrechten over.** Dat staat letterlijk in de voorwaarden van Sportmonks, TheSportsDB, API-Sports, Getty Images (§9.3) en ANP (art. 22.10). API-Sports noemt fantasy-platforms zelfs expliciet als gebruik waarvoor "additional licenses" nodig kunnen zijn.
3. **Persbureaufoto's zijn ongeschikt.**
   - Een editorial licentie verbiedt gebruik voor "gaming" en "merchandising" (Getty §3.7, **VASTGESTELD**).
   - Ook een commerciële licentie dekt alleen het auteursrecht van de fotograaf, niet de toestemming van de speler.
4. **Ook Wikimedia Commons is ongeschikt voor portretten van echte spelers.**
   - CC-licenties sluiten publiciteits- en persoonlijkheidsrechten uitdrukkelijk uit (CC BY-SA 4.0 §2(b)(1)).
   - Commons waarschuwt daar zelf voor met het sjabloon "Personality rights".
5. **Echte spelers kunnen alleen via collectieve licenties.**
   - Spelers: FIFPRO Commercial Enterprises en mogelijk VVCS/ProProf.
   - Competitie en clubs: Eredivisie CV.
   - Er zijn geen publieke tarieven. De Eredivisie heeft met Sorare een exclusieve partner voor "blockchain sports gaming and trading cards" tot en met 2026/27.
   - Voor een particulier of eenmanszaak met een gratis game is dit **WAARSCHIJNLIJK niet haalbaar**.
6. **De haalbare route is fictieve spelers.** Twee varianten:
   - **AI-portretten** van een model met een aantoonbaar commerciële licentie: FLUX.1 [schnell] of FLUX.2 [klein] 4B, beide Apache-2.0 en beide op Workers AI. Dit is een conditionele GO, met een lookalike-controle.
   - **Eigen fotoshoot** met een schriftelijke model release en een schriftelijke auteursrechtregeling met de fotograaf. Dit is een GO.

---

## 2. GO/NO-GO-tabel per optie

| # | Optie | Advies | Rechtsgrond aanwezig? | Kern van de onderbouwing |
|---|---|---|---|---|
| A | Echte namen (en posities, nationaliteit, club) **zonder licentie** | **NO-GO** | Nee | Geen aantoonbaar recht. Naamgebruik in verzamelbare kaarten is een open risico (6:162 BW). Een herkenbare avatar valt onder art. 21 Aw. Bij bulkovername van data speelt het databankrecht. |
| B | Echte namen **met FIFPRO- én competitie/clublicentie** | **CONDITIONELE GO**: juridisch alleen met getekende licenties; nu praktisch **NO-GO** | Ja, als het contract er is | FIFPRO licentieert NIL van spelers, maar geen clubs of logo's. Eredivisiespelers zijn collectief gebonden via de cao (art. 22 cao 2017–2021). Kosten zijn niet publiek. Sorare is exclusief partner. |
| C | Data-API **zonder beeld** (alleen data) | **NO-GO** als route naar echte spelers. **GO** alleen voor eigen of fictieve data | Alleen een datalicentie, geen naam- of portretrecht | De API-voorwaarden dragen geen rechten op spelers of competities over. API-Sports: "does not grant any commercial rights on such competitions". |
| D | Data-API **met foto's/logo's** | **NO-GO** | Nee | Sportmonks: "All logos and profile photos are copyrighted by their legal owner". TheSportsDB: "does not relicense third-party photographs, logos". |
| E | Persbureaufoto's, **editorial** licentie | **NO-GO** | Nee | Getty §3.7 verbiedt "gambling/betting/gaming uses" en "merchandising". ANP art. 22.3: niet bewerken. ANP art. 22.10: geen portretrechten. |
| F | Persbureaufoto's, **commerciële** licentie | **NO-GO** zonder toestemming van spelers en clubs | Alleen voor het auteursrecht | Getty §3.7/9.3 en ANP art. 22.10: toestemming van de geportretteerde regelt de gebruiker zelf. Op shirts staan ook clubmerken en sponsorlogo's. |
| G | Wikimedia Commons-foto's van echte spelers | **NO-GO** | Alleen voor het auteursrecht, met attributie (en share-alike bij een bewerking) | CC BY-SA §2(b)(1): "publicity, privacy, and/or other similar personality rights" zijn niet gelicentieerd. Commons-sjabloon "Personality rights". |
| H | Echte clubnamen en clublogo's | **NO-GO** zonder licentie van club of competitie | Nee | Clubnamen en logo's zijn merken (en logo's vaak ook auteursrechtelijk beschermd). Data-API's leveren logo's alleen "for identification". |
| I | Fictieve spelers met **AI-portretten** | **CONDITIONELE GO** | Ja, via Apache-2.0 bij FLUX.1 [schnell] of FLUX.2 [klein] 4B | Voorwaarden: modelkeuze, een lookalike-check (Davids, Verstappen/Picnic), geen prompts met namen van echte personen en een AI-vermelding. FLUX.2 [dev] en Leonardo zijn ONZEKER: niet gebruiken. |
| J | Fictieve spelers met **eigen fotoshoot** en model release | **GO** | Ja, via model release en schriftelijke licentie of overdracht van de fotograaf | Toestemming van de geportretteerde (bij minderjarigen ook van de ouders), plus een schriftelijke regeling van het auteursrecht. Vermijd lookalikes van bekende spelers. |
| K | (ter vergelijking) Fictieve clubs, logo's en ratings uit het eigen spelmodel | **GO** | Ja, eigen werk | Geen rechten van derden. Controleer wel dat namen en logo's niet verwarrend lijken op bestaande merken. |

### Per optie: voorwaarden, kosten, risico en advies

**A. Echte namen zonder licentie — NO-GO**
- **Rechtsgrond:** geen.
  - Wikidata-data is CC0 (VASTGESTELD). Dat regelt alleen de rechten van Wikidata, niet die van de speler.
  - Het databankrecht geldt ook bij gratis gebruik. De uitzondering voor privégebruik in art. 5 Databankenwet geldt alleen voor niet-elektronische databanken (VASTGESTELD).
- **Risico:**
  - Een claim van speler, vakbond of club op grond van 6:162 BW. Bij een herkenbare afbeelding komt art. 21 Aw erbij.
  - Een naam koppelen aan een "rating" of "kaartwaarde" kan ook raken aan de AVG: het gaat om persoonsgegevens van een identificeerbare persoon (**WAARSCHIJNLIJK**).
- **Kosten:** €0 vooraf, maar het claimrisico is onbekend. Ter indicatie: ANP rekent bij ongelicentieerd fotogebruik minimaal €250 per beeld (art. 22.9 AV ANP). Dat is een ander recht, maar het geeft een indicatie van de handhavingspraktijk.
- **Advies:** niet doen.

**B. Echte namen met licenties — CONDITIONELE GO, praktisch NO-GO**
- **Wat er nodig is (WAARSCHIJNLIJK):**
  - (1) Een spelerslicentie via FIFPRO Commercial Enterprises.
  - (2) Bij Eredivisiespelers: afstemming met Eredivisie CV of de clubs, omdat de collectieve commerciële rechten via de cao lopen.
  - (3) Aparte merklicenties voor clubnamen en logo's.
- **Voorwaarden:**
  - Er zijn geen publieke tarieven of standaardvoorwaarden (ONZEKER).
  - Gangbare elementen in licenties zijn royalty's, minimumgaranties en een vast bedrag (WAARSCHIJNLIJK, secundaire bron). Daarbij komen goedkeuringsrondes.
  - Of lootbox- of pack-mechaniek in licentievoorwaarden wordt beperkt, is niet gevonden (**ONZEKER**).
- **Kosten:** onbekend.
  - Kickbase (Bundesliga) noemt de kosten van "official licenses for real player names and images" als reden voor betaalde functies (VASTGESTELD). De gratis versie toont geen spelersfoto's (WAARSCHIJNLIJK, secundaire bron).
- **Risico:** exclusiviteit. Sorare is exclusief Eredivisie-partner voor "blockchain sports gaming and trading cards" t/m 2026/27 (VASTGESTELD). Of een niet-blockchainkaartgame onder die categorie valt, is **ONZEKER**.
- **Advies:** pas overwegen bij een rechtspersoon, een budget en een verdienmodel. Nu niet.

**C. Data-API zonder beeld — NO-GO voor echte spelers**
- **Rechtsgrond:** alleen een contractuele datalicentie.
- **Wat de voorwaarden zeggen:**
  - API-Sports (via de zoekindex van de primaire pagina; de pagina zelf gaf 403) zegt dat het "does not license publication of the data on your apps or sites". Het gebruik voor "fantasy sports platforms … may require additional licenses from the relevant rights holders" (WAARSCHIJNLIJK).
  - Sportmonks staat bouwen op de data toe ("start earning money from your creation"), maar verbiedt doorverkoop van de data (VASTGESTELD).
- **Kosten** (VASTGESTELD, tenzij anders vermeld):
  - **football-data.org:** Free €0, inclusief Eredivisie maar zonder squads. Squads vanaf "Free + Deep Data" à €29 p/m.
  - **Sportmonks:** €29–249 p/m. Het gratis plan dekt alleen de Deense en Schotse competitie (WAARSCHIJNLIJK, secundaire bron).
  - **API-Football:** gratis 100 requests per dag, Pro $19 p/m (WAARSCHIJNLIJK, eigen blog en derden).
  - **TheSportsDB:** $9 p/m. Dat is verplicht voor publicatie in een app store.
- **Advies:** niet gebruiken om echte spelers in de game te zetten. Een API lost het naamrecht niet op.

**D. Data-API met foto's/logo's — NO-GO**
- Alle onderzochte aanbieders wijzen de rechten op beeld expliciet af (zie §5). Advies: niet doen.

**E/F. Persbureaufoto's — NO-GO (editorial én commercieel)**
- **Editorial:** het verbod op gaming en merchandising is VASTGESTELD (Getty). ANP licenseert alleen "eenmalig gebruik" voor een overeengekomen doel en medium (art. 22.2). Bewerken mag niet zonder toestemming (art. 22.3).
- **Commercieel:** de rechten van de geportretteerde blijven bij de gebruiker (Getty §3.7/9.3, ANP 22.10). Ook Imago (blog, secundair) noemt model releases en merkrechten bij niet-editorial gebruik.
- **Kosten:** per beeld en op aanvraag. Geen publieke tarieven gevonden (ONZEKER).
- **Advies:** niet doen.

**G. Wikimedia Commons — NO-GO voor spelersportretten**
- **Licentie:** de licentie per bestand regelt het auteursrecht. De verplichtingen:
  - attributie: maker, licentie, link en vermelding van wijzigingen;
  - bij een bewerking van een BY-SA-bestand: share-alike op die bewerking.
- **Portretrecht:** niet geregeld. Zie §6.
- **Advies:** niet gebruiken voor echte spelers. Wel bruikbaar voor neutrale beelden zonder personen of merken (bijv. graszodentextuur, CC0-iconen), mits de attributie klopt.

**H. Echte clubnamen en logo's — NO-GO**
- Een licentie van club of competitie is nodig.
- Ook "alleen de naam" van een club is in een kaartgame **WAARSCHIJNLIJK** merkgebruik. Of een gratis privéproject buiten "het economisch verkeer" valt, is **ONZEKER**. Zodra het via Denckh loopt, valt dat argument waarschijnlijk weg.

**I. Fictieve spelers met AI-portretten — CONDITIONELE GO**
- **Rechtsgrond:**
  - FLUX.1 [schnell]: Apache-2.0, "personal, scientific, and commercial purposes".
  - FLUX.2 [klein] 4B: Apache-2.0, commercieel gebruik toegestaan.
  - Cloudflare: "you retain all applicable intellectual property or other proprietary rights in Inputs and Outputs". Je bent wel "solely responsible for all Outputs".
  - Alles VASTGESTELD.
- **Voorwaarden:**
  - (1) Gebruik alleen die twee modellen.
  - (2) Geen prompts met namen, rugnummers, clubkleuren of kenmerken van bestaande personen.
  - (3) Controleer elk portret handmatig op gelijkenis met bekende spelers. Neem kenmerkcombinaties à la Davids op in de checklist: kapsel, bril, huidskleur, postuur, tenue.
  - (4) Zet een AI-vermelding in de credits. Zie §8 voor art. 50 AI Act.
  - (5) Er is geen exclusief auteursrecht op de portretten: anderen mogen ze waarschijnlijk kopiëren (WAARSCHIJNLIJK).
- **Kosten:** Workers AI-tarieven (zie het eerdere rapport). Dat valt binnen het Free-plan als het volume beperkt blijft (ONZEKER, afhankelijk van het aantal kaarten).
- **Risico:** toevallige gelijkenis met een echte persoon. Dat risico is laag bij controle, maar niet nul.
- **Advies:** GO onder deze voorwaarden.

**J. Eigen fotoshoot met model release — GO**
- **Rechtsgrond:**
  - **Model release:** schriftelijke toestemming van de geportretteerde voor openbaarmaking in de game, bewerking en onbepaalde duur. Bij minderjarigen tekent ook een ouder of voogd.
  - **Fotograaf:** een schriftelijke licentie of akte van overdracht. Overdracht vereist een akte; de kantonrechter Gelderland wees in 2026 een ANP-vordering af omdat die ontbrak (WAARSCHIJNLIJK, nieuwsbericht).
- **AVG:** een portret is een persoonsgegeven. Toestemming moet intrekbaar zijn; leg vast wat er dan met kaarten gebeurt (WAARSCHIJNLIJK).
- **Kosten:** honorarium van modellen en fotograaf, of zelf fotograferen met vrijwilligers. Geen licentiekosten.
- **Advies:** GO. Dit is de juridisch zuiverste fotorealistische optie, maar wel bewerkelijk.

---

## 3. Onderbouwing: portretrecht, naam en persoonlijkheidsrecht

**Wettekst (VASTGESTELD)**
- **Art. 20 Aw:** bij een portret in opdracht mag de auteursrechthebbende niet openbaar maken zonder toestemming van de geportretteerde.
- **Art. 21 Aw:** bij een portret zonder opdracht is openbaarmaking "niet geoorloofd" voor zover "een redelijk belang van den geportretteerde" zich ertegen verzet.
- Gelezen op wetten.overheid.nl, BWBR0001886: versie geldig 01-10-2022 t/m 03-02-2025 en versie van 04-02-2025.

**HR 14-06-2013, ECLI:NL:HR:2013:CA2788 (Cruijff/Tirion) — VASTGESTELD**
- **r.o. 3.6.2:** privacybelangen wegen in de regel zwaar. Bij foto's van beroepsuitoefening van bekende personen weegt nieuwswaarde zwaar.
- **r.o. 3.6.3:** "Juist bij de personen die door hun beroepsuitoefening bekendheid genieten, kunnen commerciële belangen gemoeid zijn bij de openbaarmaking van hun portret."
  - Bij "verzilverbare populariteit" kan een redelijke vergoeding een belangrijke rol spelen.
  - Die vergoeding moet passen bij "de waarde van het exploitatiebelang van de geportretteerde in het economisch verkeer".

**Rb. Amsterdam 09-08-2017, ECLI:NL:RBAMS:2017:5415 (Davids/Riot) — VASTGESTELD**
Gelezen via data.rechtspraak.nl en AMI 2018/1.
- **r.o. 4.7:** "Een foto, een schilderij of een digitale weergave, ook als virtueel karakter in een computerspel, kan een portret zijn."
- **r.o. 4.10–4.11:** de combinatie van kenmerken (donkere huidskleur, sportief postuur, agressieve speelstijl, zwarte dreadlocks, sportbril, voetbaluniform) maakt de skin tot een portret. De context en de bedoeling tellen mee, ook al zijn de gelaatstrekken anders en het tenue fictief.
- **r.o. 4.13–4.15:**
  - Delen in de opbrengst is een redelijk belang.
  - Riot "profiteert … door de skin … tegen betaling" ter beschikking te stellen.
  - Het art. 10 EVRM-belang van Riot was vooral commercieel.
- **Vervolg:** Rb. Amsterdam 06-12-2017, ECLI:NL:RBAMS:2017:8990 (vervolgvonnis, AMI 2018/1).
  - **Hoger beroep:** het vonnis liet tussentijds hoger beroep toe. Er is **geen** uitspraak in hoger beroep gevonden; nieuwsbronnen spreken alleen over de eerste aanleg (**ONZEKER** of er hoger beroep of een schikking was).
  - De opdracht noemt "Rb. Amsterdam 2017 en hoger beroep". Het hoger beroep kon ik dus niet verifiëren.

**HR 22-04-2022, ECLI:NL:HR:2022:621 (Verstappen/Picnic) — VASTGESTELD**
- Ook een **lookalike** kan een portret zijn.
- Dat het publiek ziet dat het niet de persoon zelf is, sluit een portret niet uit. Het oordeel van het Hof Amsterdam (ECLI:NL:GHAMS:2020:1410) is vernietigd.
- **Relevant voor AI-gezichten:** het gaat om herkenbaarheid, versterkt door uiterlijk, kleding en context.

**Collectieve rechten van Eredivisiespelers — VASTGESTELD (persbericht Rechtspraak, okt. 2020)**
- De kantonrechter Noord-Holland vond het gebruik door Albert Heijn toegestaan op grond van art. 22 cao contractspelers 2017–2021: exploitatie van "collectieve commerciële rechten van de Eredivisieclubs en hun spelers".
- Volgens VVCS loopt de huidige cao tot 30-06-2027 (WAARSCHIJNLIJK). De actuele bepaling over portretrecht is niet nagelezen (**ONZEKER**).
- **Gevolg:** voor Eredivisiespelers loopt een deel van de rechten via clubs en competitie, niet alleen via FIFPRO.

**Alleen namen, zonder beeld**
- Art. 21 Aw ziet op een "portret". Een naam alleen is geen portret (WAARSCHIJNLIJK).
- Onrechtmatige daad (6:162 BW) wegens het profiteren van de bekendheid blijft mogelijk.
- Specifieke Nederlandse rechtspraak over fantasy- of kaartspellen met alleen namen is **niet gevonden** (**ONZEKER**).
- **Context VS** (niet toepasselijk): *C.B.C. v. MLBAM* (8th Cir. 16-10-2007, cert. denied 02-06-2008). Daar woog de First Amendment zwaarder dan het publiciteitsrecht bij fantasy-baseball met namen en statistieken (WAARSCHIJNLIJK, secundaire bronnen). Nederland kent geen equivalent. Het Nederlandse kader is de belangenafweging van art. 8/10 EVRM (Cruijff).

**Maakt "gratis" of "zonder reclame" verschil?**
- **Portretrecht:** misschien wel.
  - De commerciële exploitatie, en dus "verzilverbare populariteit", weegt minder als er geen enkele opbrengst is.
  - Maar Davids r.o. 4.15 noemt het gebruik "een optionele verfraaiing" zonder informatiewaarde, en een kaartgame benut juist de populariteit als verzamelobject.
  - Loopt het via Denckh, dan is promotie van de onderneming waarschijnlijk commercieel.
  - **ONZEKER**: er is geen rechtspraak over gratis hobbygames gevonden.
- **Databankrecht:** nee. Art. 2 Databankenwet kent geen uitzondering voor niet-commercieel gebruik, en art. 5 privégebruik geldt alleen voor niet-elektronische databanken (VASTGESTELD).
- **Merkrecht:** mogelijk wel, via het vereiste "gebruik in het economisch verkeer" (vgl. HvJ C-206/01 Arsenal/Reed; niet nagelezen, EUR-Lex en Curia waren niet leesbaar). **ONZEKER** voor een gratis game. Via een eenmanszaak waarschijnlijk wel economisch verkeer.
- **CC-licenties en licenties van data-API's:** het verschil tussen gratis en betaald is daar contractueel geregeld, niet wettelijk (zie §5–6).

---

## 4. Onderbouwing: databankenrecht en ratings

- **Databankenwet, BWBR0010591** (geldend vanaf 21-11-2025) — VASTGESTELD:
  - **Art. 1 lid 1 sub a:** een databank is "een verzameling van werken, gegevens of andere zelfstandige elementen die systematisch of methodisch geordend" zijn (plus een substantiële investering).
  - **Art. 2 lid 1 sub a:** de producent beslist over het "opvragen of hergebruiken van het geheel of een in kwalitatief of kwantitatief opzicht substantieel deel".
- **EU-rechtspraak** (BHB/William Hill C-203/02; Football Dataco/Yahoo C-604/10): investeringen in het *creëren* van data tellen niet. Losse feiten zijn niet beschermd, maar een substantiële set uit één bron overnemen wel (WAARSCHIJNLIJK; arresten niet opnieuw nagelezen).
- **Ratings en marktwaarden** (EA FC, Transfermarkt, SofaScore): het zijn eigen waarderingen. Overname is een databank-, auteurs- of contractrisico (WAARSCHIJNLIJK).
  - SofaScore zegt dat het data niet als API kan delen "due to agreements with our data providers" (VASTGESTELD, helpcentrum, 06-11-2025).
  - De voorwaarden van Transfermarkt konden niet worden opgehaald (fetch geblokkeerd).
- **Advies:** eigen ratings uit het eigen spelmodel. Geen ratings van derden overnemen, ook niet "ter inspiratie" in bulk.

---

## 5. Onderbouwing: data-aanbieders (wat leveren ze, wat mag)

| Aanbieder | Levert | Licentie / voorwaarden | Foto's en logo's | Prijs | Label |
|---|---|---|---|---|---|
| **Wikidata** | Namen, geboortedatum, nationaliteit, positie, club (door de community bijgehouden) | Gestructureerde data valt onder CC0. Tekst in andere namespaces valt onder CC BY-SA 4.0 (pagina bijgewerkt 24-09-2026) | Commons-bestanden hebben een eigen licentie per bestand (zie §6) | Gratis | VASTGESTELD |
| **football-data.org** | Wedstrijden en standen. Squads pas vanaf een betaald plan | Geen voorwaardenpagina gevonden (/terms gaf 404; geen link op de homepage). "Access … is free. Forever." | Levert crest-URL's (`crests.football-data.org`), zonder gebruiksregels | Free €0 (12 competities, waaronder Eredivisie, geen squads). Squads vanaf €29 p/m. Standard €49, Advanced €99, Pro €199 | Prijzen VASTGESTELD; voorwaarden ONZEKER |
| **Sportmonks** | Spelers, squads, wedstrijden, statistieken | Bouwen en verdienen toegestaan. Doorverkoop van data niet. Data per domein. Account persoonlijk | "All logos and profile photos are copyrighted by their legal owner … you have to arrange proof of intellectual property yourself" | Starter €29, Growth €99, Pro €249 p/m. Free: 2 competities | VASTGESTELD (ToS zonder datum, © 2026) |
| **API-Football / API-Sports** | Spelers met foto-URL, teams, logo's, statistieken | "does not license publication of the data … must be requested … from the competent authorities". Fantasy "may require additional licenses". "does not grant any commercial rights on such competitions" | Logo's en afbeeldingen alleen "for identification and descriptive purposes". Geen IE-rechten van de aanbieder | Free 100 req/dag. Pro $19, Ultra $29, Mega $39 p/m | WAARSCHIJNLIJK: tekst via zoekindex, directe fetch gaf 403 |
| **TheSportsDB** | Teams, spelers en community-artwork | Data mag gekopieerd en bewerkt worden. Publicatie in een app store alleen als betaald supporter. Bronvermelding verplicht (ToS 17-09-2026) | Eigen artwork onder CC. "does not relicense third-party photographs, logos". "A Creative Commons flag does not clear third-party trademark, privacy or publicity rights" | $9 p/m (supporter) | VASTGESTELD |
| **Opta / Stats Perform** | Officiële eventdata en spelersdata | Maatwerklicenties, gericht op organisaties | Niet onderzocht (pagina's gaven 403) | Op aanvraag | WAARSCHIJNLIJK (secundair) |
| **SofaScore** | Livescores en ratings | Geen publieke API, vanwege overeenkomsten met dataleveranciers | n.v.t. | n.v.t. | VASTGESTELD |
| **Transfermarkt** | Marktwaarden en transfers | Voorwaarden niet leesbaar (geblokkeerd). Commerciële scrapers zeggen niets over rechtmatigheid | n.v.t. | n.v.t. | ONZEKER |

**Cruciaal punt (VASTGESTELD).** Een data-API levert hooguit een licentie op de *dataset van de aanbieder*. Uitdrukkelijk **niet** inbegrepen zijn:
- naamrechten en portretrechten van spelers;
- rechten op competities;
- merkrechten op clubs.

Dat staat letterlijk bij Sportmonks, TheSportsDB en API-Sports.

---

## 6. Onderbouwing: Wikimedia Commons

**CC BY-SA 4.0 legal code — VASTGESTELD**
- **§1 "Adapted Material":** materiaal dat is "translated, altered, arranged, transformed, or otherwise modified in a manner requiring permission".
- **§2(b)(1):** "Moral rights … are not licensed under this Public License, nor are publicity, privacy, and/or other similar personality rights". De licentiegever ziet alleen af van *zijn eigen* rechten.
- **§3(a):** naam van de maker, copyrightvermelding, licentie, disclaimer, link en vermelding van wijzigingen, "in any reasonable manner based on the medium".
- **§3(b):** wie een bewerking deelt, moet die onder dezelfde of een compatibele BY-SA-licentie aanbieden.

**CC FAQ — VASTGESTELD**
- Een adaptatie is er alleen bij voldoende nieuwe creativiteit. Formaatwijzigingen zijn geen adaptatie. Bijsnijden moet je vermelden.
- Een verzameling hoeft niet onder SA: "CC licenses do not require the collection or the compilation itself to be made available under an SA license."
- Rechten van derden: "a reuser must seek permission for relevant uses".

**Wat betekent dat voor een kaart?**
- Een foto in een standaard kaartframe naast eigen tekst is **WAARSCHIJNLIJK** een verzameling. SA geldt dan voor de foto, niet voor het frame.
- Een cutout met stilering, filters of compositing kan wel een adaptatie zijn. SA geldt dan voor dat beeld (**ONZEKER**, afhankelijk van creativiteit en nationaal recht).

**Commons zelf — VASTGESTELD**
- Het sjabloon {{Personality rights}} waarschuwt: "the person(s) shown may have rights that legally restrict certain re-uses unless those depicted consent to such uses".
- Hergebruikpagina: de Wikimedia Foundation "does not provide any warranty regarding the copyright status or correctness of licensing terms". Ook genoemd: "trademarks, … personality rights, moral rights, privacy rights".

**Advies:** de Commons-licentie regelt alleen het auteursrecht van de fotograaf. De speler moet nog steeds toestemming geven (art. 21 Aw, Cruijff, Davids). De licentiestatus is bovendien niet gegarandeerd.
- Daarom **NO-GO** voor spelersportretten.
- Bruikbaar voor beelden zonder personen of merken, met correcte attributie in een credits-scherm.

---

## 7. Onderbouwing: persbureaus

**Getty Images Content License Agreement ("LAST UPDATED: April 2026") — VASTGESTELD**
- **§3.7:** editorial content mag niet gebruikt worden "for any commercial, promotional, advertorial, endorsement, advertising, gambling/betting/gaming uses, or merchandising purpose", tenzij een factuur of licentie dat expliciet toestaat. De gebruiker moet toestemming van afgebeelde personen en organisatoren zelf regelen.
- **§3.2:** alleen technische bewerking. "you may not otherwise alter the content". Een kaartcutout is dus niet toegestaan.
- **§9.3:** "does not grant any right or make any warranty with regard to the use of names, people, trademarks". Voor editorial worden doorgaans geen releases verkregen.
- **§9.2:** de garantie op privacy en publiciteit geldt niet voor editorial.

**ANP Algemene Voorwaarden (per november 2023), deel III ANP Foto — VASTGESTELD**
- **Art. 22.2:** een niet-exclusieve licentie "tot eenmalig gebruik … ten behoeve van het overeengekomen doel en medium".
- **Art. 22.3:** niet wijzigen of bewerken zonder toestemming.
- **Art. 22.6:** niet herpubliceren, sublicentiëren of gebruiken in downloadbaar formaat.
- **Art. 22.9:** bij ongeoorloofd gebruik ten minste driemaal het gebruikelijke tarief, minimaal €250 per beeld.
- **Art. 22.10:** de licentie ziet "uitsluitend" op het auteursrecht, "en niet op rechten die rusten op … merken van derden of op de rechten van geportretteerden".

**Imago — WAARSCHIJNLIJK (eigen blog, niet de bindende voorwaarden)**
- "Images are licensed for editorial use; non‑editorial use requires a corresponding license". Daarnaast zijn model releases en merkrechten nodig.

**Pro Shots en Orange Pictures — ONZEKER:** de voorwaarden zijn niet gevonden.

**Kosten:** nergens publieke tarieven voor gaming of merchandising gevonden. Het gaat altijd om maatwerk op aanvraag.

---

## 8. Onderbouwing: AI-portretten van fictieve personen

**Auteursrecht op de output — WAARSCHIJNLIJK**
- EU-maatstaf: een "eigen intellectuele schepping" met vrije, creatieve keuzes van een mens (Infopaq-lijn).
- Alleen een prompt geven is volgens de literatuur onvoldoende. Er is geen Nederlandse uitspraak gevonden; in Tsjechië en Duitsland werd bescherming afgewezen.
- **Gevolg:** RANK11. heeft waarschijnlijk geen exclusief recht op de portretten. Dat is geen inbreukrisico, wel een kopieerrisico.

**Portretrisico — VASTGESTELD (maatstaf) / ONZEKER (toepassing)**
- Davids en Verstappen/Picnic laten zien dat herkenbaarheid via kenmerken en context genoeg kan zijn.
- Een gegenereerd gezicht dat toevallig op een bekende speler lijkt, in een voetbalcontext, kan een portret zijn.
- **Maatregelen:**
  - geen referenties aan echte personen in prompts;
  - een review vóór publicatie;
  - een meldknop met verwijderprocedure.
- BFL-voorwaarden §1.2c: voor output over "real, identifiable individuals" is toestemming nodig. De FLUX [dev]-licentie art. 4a verbiedt inbreuk op "rights of publicity or 'digital replica' rights" (VASTGESTELD).

**EU AI Act art. 50 — VASTGESTELD (tekst) / WAARSCHIJNLIJK (toepassing)**
- **Art. 50 lid 2** (aanbieders van generatieve systemen): machineleesbare markering. Dat ligt bij Black Forest Labs of Cloudflare, niet bij RANK11.
  - Voor systemen die vóór 02-08-2026 al op de markt waren, is volgens secundaire bronnen uitstel verleend tot 02-12-2026 via de Digital Omnibus (WAARSCHIJNLIJK; Publicatieblad niet nagelezen).
- **Art. 50 lid 4** (gebruiksverantwoordelijken): melden dat het om een deepfake gaat.
  - **Art. 3(60):** een deepfake is content die "resembles existing persons, objects, places … and would falsely appear to a person to be authentic or truthful".
  - Fictieve personen in een duidelijk fictieve game vallen daar **WAARSCHIJNLIJK niet** onder.
  - Ook als dat wel zo was: bij een "evidently artistic, creative, … fictional" werk is de plicht beperkt tot het passend melden dat er gegenereerde inhoud in zit.
- Art. 50 is van toepassing vanaf 02-08-2026.
- **Advies:** een vaste AI-vermelding in de credits en bij de kaartinfo. Dat kost weinig en voldoet ook aan art. 2e van de FLUX [dev]-licentie ("AI-vermelding waar de wet dat vereist"). Het voorkomt ook strijd met het verbod in de BFL-voorwaarden §1.3m om output als "entirely human-generated" voor te stellen.

**Modellen op Cloudflare Workers AI** (modellijst op developers.cloudflare.com bevat 10 text-to-image-modellen)

| Model | Licentie | Commercieel gebruik van output | Advies | Label |
|---|---|---|---|---|
| FLUX.1 [schnell] | Apache-2.0 (modelkaart HF). Cloudflare linkt naar BFL ToS (rev. 01-08-2026) | Ja: "personal, scientific, and commercial purposes" | **Bruikbaar** | VASTGESTELD |
| FLUX.2 [klein] 4B | Apache-2.0 | Ja | **Bruikbaar** | VASTGESTELD |
| FLUX.2 [dev] | FLUX [dev] Non-Commercial License v2.0 (rev. 25-11-2025). Cloudflare zegt "the licensed version" te hosten | De licentie zegt: "You may use Output for any purpose (including for commercial purposes)". Maar het model zelf in een product met eindgebruikers is geen "Non-Commercial Purpose". Wat de Cloudflare–BFL-licentie voor klanten regelt, is niet publiek | **Niet gebruiken** (onduidelijk recht) | ONZEKER |
| FLUX.2 [klein] 9B | Non-commercial | Zie [dev] | Niet gebruiken | WAARSCHIJNLIJK |
| Leonardo Phoenix 1.0 / Lucid Origin | Cloudflare linkt naar leonardo.ai/terms-of-service (fetch gaf 403). Het helpcentrum (25-08-2026) zegt "you can indeed use your images for commercial purposes", maar regelt eigendom per abonnement en zegt niets over API of partners | Onduidelijk via Cloudflare | **Niet gebruiken** | ONZEKER |

- **Cloudflare-voorwaarden** (Developer Platform, "Last updated: September 28, 2026") — VASTGESTELD:
  - Modellen van derden zijn "Third-Party Products" onder hun eigen voorwaarden.
  - Cloudflare biedt geen vrijwaring.
  - Outputs zijn Customer Content; de klant houdt de rechten.

---

## 9. Kosten en haalbaarheid voor een particulier of eenmanszaak

| Route | Indicatie kosten | Voorwaarden | Haalbaar? |
|---|---|---|---|
| FIFPRO-spelerslicentie | Niet publiek. Gangbaar: royalty's, minimumgarantie, vast bedrag (secundair) | Aanvraag via fifpro.org. Pagina gaf bij elke poging 503; de zoekindex toont: "if you are looking to feature real-world football players in your products – from video games and apps … get in touch" | **WAARSCHIJNLIJK niet** voor een gratis hobbyproject |
| Eredivisie CV / clubs | Niet publiek | Exclusiviteit Sorare (blockchain gaming en trading cards) t/m 2026/27. Geen openbaar licentieprogramma voor games gevonden | **WAARSCHIJNLIJK niet** |
| Persbureau (commercieel) | Op aanvraag, per beeld | Plus toestemming van spelers en clubs | Nee |
| Data-API | €0–€249 p/m | Lost het naamrecht niet op | Technisch wel, juridisch zinloos voor echte spelers |
| AI-portretten (Apache-2.0-modellen) | Workers AI-gebruik, beperkt | Lookalike-controle, AI-vermelding | **Ja** |
| Eigen fotoshoot | Honorarium of vrijwilligers | Model release (en ouders bij minderjarigen), akte met fotograaf | **Ja** |

**Lootbox-clausules:** in geen enkele publieke bron gevonden of licentievoorwaarden packs of lootboxes beperken. Licenties zijn maatwerk (**ONZEKER**). Dat RANK11. zelf geen echt geld gebruikt (eerder rapport §4), staat hier los van.

---

## 10. Onzekerheden

1. **Naamgebruik zonder beeld.** Er is geen Nederlandse rechtspraak over gratis fantasy- of kaartspellen met alleen echte namen. De rechtsgrond om het wel te doen ontbreekt dus. Het werkelijke claimrisico is niet te kwantificeren.
2. **Wat "gratis" en "zonder reclame" wegen.** Dat speelt bij de belangenafweging van art. 21 Aw en bij het merkrechtelijke vereiste "economisch verkeer". Via Denckh valt het argument waarschijnlijk weg.
3. **De Nederlandse rechtenketen.** Welke rechten liggen bij FIFPRO/VVCS en welke bij clubs en Eredivisie CV via de huidige cao? Hoe ver reikt de Sorare-exclusiviteit? Alleen een schriftelijk antwoord van die partijen geeft zekerheid.
4. **Licenties voor AI-output via Cloudflare.** Bij FLUX.2 [dev] en Leonardo is onduidelijk wat Cloudflare-klanten precies mogen. Daarom alleen Apache-2.0-modellen gebruiken. Ook het restrisico van een toevallige lookalike is niet uit te sluiten, alleen te beperken.
5. **Niet gelezen primaire bronnen** (geblokkeerd of niet gevonden):
   - de voorwaarden van API-Sports (403; alleen via de zoekindex), Transfermarkt, Opta/Stats Perform, Leonardo, Pro Shots, Orange Pictures en Imago (bindende tekst);
   - de FIFPRO-pagina (503);
   - de BVIE-tekst en het Arsenal-arrest (EUR-Lex en Curia niet leesbaar);
   - de actuele cao-bepaling over het portretrecht;
   - een eventueel hoger beroep in Davids/Riot.

---

## 11. Bronnenlijst

Alle bronnen zijn geraadpleegd op 25-10-2026. Tussen haakjes staat de datum van de bron zelf, voor zover bekend.

**Wetgeving en verdragen**
- Auteurswet, art. 19–21: https://wetten.overheid.nl/BWBR0001886/2022-10-01 (versie 01-10-2022 t/m 03-02-2025) en https://wetten.overheid.nl/BWBR0001886/2025-02-04 (art. 21 gecontroleerd)
- Databankenwet: https://wetten.overheid.nl/BWBR0010591/ (geldend vanaf 21-11-2025)
- EU AI Act, art. 50 en 3(60) (secundaire weergave): https://artificialintelligenceact.eu/article/50/
- Status van art. 50 en de Digital Omnibus (secundair): https://labs.cloudsecurityalliance.org/research/csa-research-note-eu-ai-act-article50-watermarking-deadline/ (21-09-2026) en https://www.mccannfitzgerald.com/knowledge/data-privacy-and-cyber-risk/ai-act-round-up-recent-developments (2026)
- Niet leesbaar: BVIE-consolidatie BOIP (https://www.boip.int/system/files/document/2019-02/BVIE_01062018.pdf gaf HTML) en HvJ C-206/01 (EUR-Lex/Curia)

**Rechtspraak**
- HR 14-06-2013, ECLI:NL:HR:2013:CA2788 (Cruijff/Tirion): https://data.rechtspraak.nl/uitspraken/content?id=ECLI:NL:HR:2013:CA2788
- Rb. Amsterdam 09-08-2017, ECLI:NL:RBAMS:2017:5415 (Davids/Riot): https://data.rechtspraak.nl/uitspraken/content?id=ECLI:NL:RBAMS:2017:5415
- Rb. Amsterdam 06-12-2017, ECLI:NL:RBAMS:2017:8990, en annotatie Dommering, AMI 2018/1: https://www.ivir.nl/publicaties/download/Annotatie_AMI_2018_1.pdf (2018)
- HR 22-04-2022, ECLI:NL:HR:2022:621 (Verstappen/Picnic): https://data.rechtspraak.nl/uitspraken/content?id=ECLI:NL:HR:2022:621 ; Hof Amsterdam ECLI:NL:GHAMS:2020:1410 ; conclusie ECLI:NL:PHR:2021:953
- Kantonrechter Noord-Holland, AH-voetbalplaatjes (persbericht): https://www.rechtspraak.nl/organisatie-en-contact/organisatie/rechtbanken/rechtbank-noord-holland/nieuws/2020/10/voetbalplaatjes-speler-ado-den-haag-in-het-ongelijk (okt. 2020)
- Rb. Gelderland, ANP-claim afgewezen wegens ontbrekende akte (nieuws): https://www.dutchitchannel.nl/news/729475/rechtbank-gelderland-wijst-fotoclaim-anp-af (13-04-2026)
- C.B.C. v. MLBAM (VS, secundair): https://www.quimbee.com/cases/c-b-c-distribution-and-marketing-inc-v-major-league-baseball-advanced-media-l-p
- Davids/Riot, nieuws over de eerste aanleg: https://www.bright.nl/nieuws/1082459/edgar-davids-wint-zaak-om-dubbelganger-league-legends.html

**Licentiegevers en marktpraktijk**
- FIFPRO commercial: https://www.fifpro.org/who-we-are/commercial (503; inhoud via zoekindex)
- Soccerverse–FIFPRO (persbericht): https://decrypt.co/351814/soccerverse-secures-fifpro-license-to-bring-real-world-authenticity-to-on-chain-football-game (10-12-2025)
- FIFPRO-model en geldstromen (secundair): https://technologyquotient.freshfields.com/post/102gpgj/foul-play-ibrahimovic-and-the-role-of-digital-likeness-in-sports-video-games
- Eredivisie–Sorare t/m 2026/27: https://eredivisie.com/news/eredivisie-and-sorare-extend-exclusive-global-partnership-through-2027/ (11-09-2025)
- Kickbase, licenties: https://en.help.kickbase.com/en/help/why-are-not-all-features-free-in-kickbase (24-10-2025)
- ESPN Fantasy als officieel Eredivisie-spel (secundair): https://pouletips.nl/eredivisie/poule/espn-fantasy-voetbal/
- FIFA–Fanatics/Topps, exclusieve collectibles vanaf 2031: https://www.insideworldfootball.com/2026/05/08/fifa-swaps-panini-topps-long-term-deal-starting-2031/ (08-05-2026)
- VVCS, cao t/m 30-06-2027: https://www.vvcs.nl/en/services/collective-advocacy/

**Persbureaus**
- Getty Images Content License Agreement: https://www.gettyimages.com/eula (april 2026)
- ANP Algemene Voorwaarden, deel III ANP Foto: https://www.anp.nl/download/algemene-voorwaarden-anp-cf365.pdf (per november 2023)
- Imago, licentiegids (blog): https://blog.imago-images.com/en/how-to-license-sports-images-a-complete-guide-by-imago
- Niet gevonden: voorwaarden van Pro Shots en Orange Pictures

**Data-aanbieders**
- Wikidata-licentie: https://www.wikidata.org/wiki/Wikidata:Licensing (bijgewerkt 24-09-2026)
- football-data.org: https://www.football-data.org/pricing en https://www.football-data.org/coverage (© 2014–2026; /terms gaf 404)
- Sportmonks: https://www.sportmonks.com/terms-of-service/ (geen datum, © 2026) en https://www.sportmonks.com/football-api/plans-pricing
- API-Football/API-Sports: https://www.api-football.com/terms en https://api-sports.io/terms (403; tekst via zoekindex). Prijzen: https://www.api-football.com/news/post/how-to-get-started-with-api-football-the-complete-beginners-guide
- TheSportsDB: https://www.thesportsdb.com/docs_terms_of_use.php (17-09-2026) en https://www.thesportsdb.com/free_sports_api
- SofaScore: https://sofascore.helpscoutdocs.com/article/129-sports-data-api-availability (06-11-2025)
- Stats Perform (secundair): https://www.statsperform.com/faqs/stats-perform-faqs-pricing-licensing/ (403)
- Transfermarkt: https://www.transfermarkt.com/intern/anb (geblokkeerd)

**Wikimedia en Creative Commons**
- CC BY-SA 4.0 legal code: https://creativecommons.org/licenses/by-sa/4.0/legalcode.en
- CC FAQ: https://creativecommons.org/faq/
- Commons, sjabloon Personality rights: https://commons.wikimedia.org/wiki/Template:Personality_rights
- Commons, hergebruik buiten Wikimedia: https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia

**AI-modellen en voorwaarden**
- Workers AI-modellijst: https://developers.cloudflare.com/workers-ai/models/
- Modelpagina's: https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/ , …/flux-2-dev/ , …/phoenix-1.0/ , …/lucid-origin/
- FLUX.1 [schnell], modelkaart: https://huggingface.co/black-forest-labs/FLUX.1-schnell
- FLUX.2 [klein] 4B, modelkaart: https://huggingface.co/black-forest-labs/FLUX.2-klein-4B
- FLUX.2 [dev], modelkaart: https://huggingface.co/black-forest-labs/FLUX.2-dev
- FLUX [dev] Non-Commercial License v2.0: https://bfl.ai/legal/non-commercial-license-terms (25-11-2025)
- BFL Terms of Service: https://bfl.ai/legal/terms-of-service (01-08-2026)
- Cloudflare-blog, FLUX.2 [dev]: https://blog.cloudflare.com/flux-2-workers-ai (25-11-2025)
- Cloudflare Developer Platform Service-Specific Terms: https://www.cloudflare.com/service-specific-terms-developer-platform/ (28-09-2026)
- Leonardo, commercieel gebruik: https://intercom.help/leonardo-ai/en/articles/8044018-commercial-usage (25-08-2026). De ToS (https://leonardo.ai/terms-of-service/) gaven 403.
- AI-output en auteursrecht (literatuur): https://scholarlypublications.universiteitleiden.nl/access/item%3A4292176/download en https://www.vlaio.be/nl/nieuws/ai-en-auteursrecht-hoe-zit-dat-vandaag
