# RANK11. — Bronnenonderzoek haalbaarheid

- **Datum onderzoek:** 25 oktober 2026 (alle bronnen op deze datum geraadpleegd, tenzij anders vermeld)
- **Methode:** desk research (zoekmachine, officiële documentatie, wetteksten, uitspraken). Geen contact met leveranciers of toezichthouders.
- **Status:** dit is géén juridisch advies. Waar een juridische vraag niet met een primaire bron te beantwoorden is, staat dat er expliciet bij.
- **Labels:**
  - **VASTGESTELD**: staat zo in een genoemde (bij voorkeur primaire) bron.
  - **WAARSCHIJNLIJK**: redelijke afleiding uit bronnen, niet letterlijk bevestigd.
  - **ONZEKER**: bronnen ontbreken, spreken elkaar tegen of het is een open rechtsvraag.

## Samenvatting adviezen

| # | Onderwerp | Advies |
|---|---|---|
| 1 | Cijfers ophalen uit Magister/Somtoday | **NO-GO** voor een automatische koppeling (officieel en onofficieel). **GO** voor cijfers die de leerling zelf invoert. |
| 2 | Echte voetballers, clubs en ratings | **NO-GO** voor echte foto's, logo's en namen zonder licentie. **CONDITIONELE GO** voor fictieve spelers en clubs (eventueel feitelijke CC0-data, zie §2). |
| 3 | AVG/UAVG voor minderjarigen | **CONDITIONELE GO**: met toestemming van een ouder onder 16, een DPIA vóór livegang, dataminimalisatie en geen zichtbare cijfers. |
| 4 | Packs/lootbox-mechaniek | **CONDITIONELE GO**: nooit echt geld en geen prijzen uit de echte wereld, kansen tonen, geen streaks of herinneringen om terug te komen. |
| 5 | Cloudflare als backend | **CONDITIONELE GO**: op het Free-plan met jurisdictie `eu` en een kostenplafond van €0. Een prototype eerst. |
| 6 | Inloggen zonder contactgegevens van kinderen | **GO** voor een passkey met een herstelcode of koppeling via de ouder, plus magic-link op het e-mailadres van de ouder. |

---

## 1. Magister en Somtoday: officiële koppeling of niet?

### Bevindingen

**Magister**
- **VASTGESTELD.** De voorwaardenpagina van Magister zegt: *"Het gebruik van de Magister API is voorbehouden aan Schoologica B.V. en wordt gebruikt ten behoeve van dienstverlening binnen Magister. Het gebruik van de API door overige, niet-geautoriseerde partijen is verboden."* Ongeoorloofd gebruik wordt gezien als *"inbreuk op de rechten van Schoologica B.V."* De pagina noemt geen versie en geen datum (footer © 2026). In oktober 2023 citeerde een forumgebruiker dezelfde tekst, toen nog met "Iddink Digital B.V." als rechthebbende.
- **VASTGESTELD.** Magister heeft een **partnerprogramma** voor *leveranciers*. De checklist vraagt:
  - deelname aan Privacyconvenant 3.0, óf aansluiting bij Edu-V met vermelding in het keurmerkregister;
  - een verwerkersovereenkomst (convenantmodel of Edu-V VWO 4.0);
  - *"een legale relatie met de schoolorganisatie (en leerling)"* en een duidelijke doelbinding;
  - een inschrijving bij de **KvK**.
  
  De koppelstandaarden zijn Edustandaard SCIM (IAM), 1EdTech (resultaten terugschrijven) en Magister JOIN (aanmelden). Voor andere wensen "gaan we in gesprek" over de Magister API. De pagina noemt geen kosten en noemt geen consumentenapps voor leerlingen.
- **VASTGESTELD.** Volgens Magister Service worden SCIM-clients met scopes beperkt tot het doel uit de aanvraag.
- **VASTGESTELD.** In februari 2020 schreef Iddink aan een gebruiker dat Magister *"geaccrediteerde aansluitingen"* kent, dat scholen bepalen welke apps zijn toegestaan, en dat *"de school is de eigenaar van de data, en niet de scholier"*. De Homey-app voor Magister verloor zijn API-sleutel en werd uit de app store gehaald. Volgens de ontwikkelaar kreeg hij geen reactie op zijn verzoek om accreditatie (Homey-forum, 2020–2021).
- **VASTGESTELD.** Een Studyspace-pagina zegt dat sinds 18-12-2018 iedere partij die de Magister Public API gebruikt geaccrediteerd moet zijn. Dit is een secundaire en mogelijk verouderde bron.
- **VASTGESTELD.** Er bestaan onofficiële libraries: `magister.js` (npm, Magister 6) en `idiidk/magister-api`, een PHP-variant waarvan de laatste release uit 2018 komt, en een onofficiële MCP-server. De README van magister.js zegt zelf dat Iddink accreditatie van alle API-gebruikers eist.

**Somtoday**
- **VASTGESTELD.** Somtoday heeft een **partnerprogramma via Somtoday Connect**, het API-koppelplatform. *"De school bepaalt zelf welke data er wordt uitgewisseld en met wie."* Het traject is oriëntatie → partnervoorstel → testomgeving en API-documentatie → livegang. Je gaat akkoord met de algemene voorwaarden. Kosten en leerlingapps worden niet genoemd. Volgens de servicedesk stelt de applicatiebeheerder van de school per vestiging en leerling in wat een koppelpartner ziet.
- **VASTGESTELD.** De AVG-module van Somtoday verwacht dat educatieve aanbieders zijn aangesloten bij het privacyconvenant.
- **VASTGESTELD.** De onofficiële documentatie `elisaado/somtoday-api-docs` beschrijft authenticatie *"by mimicking the SOMToday app/webapp"*, oftewel het OAuth-token van de officiële app nabootsen (topic "reverse-engineering").
- **VASTGESTELD.** Er bestaat de browserextensie "Somtoday Mod" (Chrome, Edge, Firefox). Die past de Somtoday-website aan, bijvoorbeeld met grafieken op de cijferpagina, en heeft hosttoegang tot somtoday.nl en som.today. Een product met de naam "Somtoday Plus" of "Somtoday Studiewijzer" vond ik niet. **ONZEKER** of zoiets bestaat.

**Sectorkader**
- **VASTGESTELD.** Stichting Edu-V is opgericht in mei 2025 (Dutch IT Channel, 19-05-2025). Na een overgangsperiode vervangt Edu-V het Privacyconvenant Onderwijs (2022, versie 4.0). Inhoudelijk is de Edu-V model-verwerkersovereenkomst 4.1 gelijk aan versie 4.0. Op edu-v.org staan nieuwsberichten over de uitrol van Edu-V-standaarden in PO/VO in 2026-2027 (05-05-2026) en over een *model-verwerkersovereenkomst 5.0 in ontwikkeling* (01-10-2026).
- **ONZEKER.** De precieze verhouding tussen Edu-K en Edu-V. Edu-V "bouwt verder op de uitkomsten van Edu-K". Een fusie vond ik niet bevestigd. ECK iD heb ik niet apart onderzocht; het hoort bij leermiddelentoegang via de school en is niet relevant voor een consumentenapp.

**"Magister Ultimate Team" (Chrome-extensie)**
- **VASTGESTELD.** Chrome Web Store-pagina, geraadpleegd op 25-10-2026:
  - ca. 2.000 gebruikers, 4,2 sterren uit 22 beoordelingen, versie 6.8.3, laatst bijgewerkt 25-10-2026;
  - alleen in het Nederlands, 171 MiB, aangeduid als "non-trader" (geen handelaar);
  - de ontwikkelaar is alleen een privé-e-mailadres; dat neem ik hier bewust niet over;
  - beschrijving: maakt van Magister- en Somtoday-cijfers een kaartspel met packs, team, statistieken en een online markt;
  - volgens de eigen privacyverklaring verwerkt de extensie *persoonsgegevens, authenticatie-informatie, gebruikersactiviteit en website-inhoud*.
- **VASTGESTELD.** Volgens TikTok-video's van de makers (@magisterultimateteam) werkt de extensie ook voor Osiris en Somtoday. Dat is een eigen claim van de makers.
- **WAARSCHIJNLIJK.** De extensie leest cijfers uit de pagina of sessie waarop de leerling in de browser is ingelogd: de rubriek "website-inhoud" plus "authenticatie-informatie", en de werking op drie verschillende systemen. Hoe het precies werkt, staat niet op de pagina. Ik heb de broncode niet onderzocht. **ONZEKER** of er inloggegevens of tokens naar een server van de maker gaan.
- **VASTGESTELD.** Ik vond geen publieke reactie van Magister of Somtoday op deze extensie. Een vergelijkbaar geval: in juni 2026 waarschuwde het Belgische Smartschool gebruikers en scholen voor de onofficiële extensie "Smartschool Radar". Die las op de achtergrond gegevens uit van de ingelogde gebruiker, zoals resultaten en berichten (VRT NWS, 18-06-2026).

### Risico's
- **Contractueel/IE.** Elke automatische route buiten het partnerprogramma om, zoals onofficiële API's, een nagebootste app-client of scraping met een sessietoken, botst met de voorwaarden van Magister ("verboden", "inbreuk"). Voor Somtoday geldt waarschijnlijk hetzelfde. **ONZEKER** of het uitlezen van de eigen pagina in de eigen browser, zonder API-aanroepen, onder het API-verbod valt. Dat is niet getoetst.
- **Beveiliging/AVG.** Wie sessietokens of wachtwoorden van leerlingen opslaat of doorstuurt, verwerkt authenticatiegegevens van minderjarigen. Dat is een groot risico bij een lek en vergroot de DPIA-last.
- **Toegang ontbreekt.** Voor het partnerprogramma zijn een KvK-inschrijving, deelname aan het convenant of Edu-V, een verwerkersovereenkomst met elke school en een *legale relatie met de school* nodig. Een privéproject zonder bedrijf voldoet daar niet aan (**VASTGESTELD**: het KvK-vereiste). De school is verwerkingsverantwoordelijke voor de cijfers. RANK11. zou dan *verwerker* van de school zijn, en dat past niet bij een privégame.
- **Afhankelijkheid.** Onofficiële koppelingen kunnen zonder waarschuwing stoppen, zoals bij Homey.
- **Reputatie.** Als RANK11. op "Magister/Somtoday Ultimate Team" lijkt, is er verwarring en concurrentie met een bestaande extensie. Gebruik de merknamen Magister en Somtoday niet in de naam of in marketing (merkenrecht, **WAARSCHIJNLIJK** risico).

### Advies: NO-GO voor automatisch ophalen; GO voor zelf invoeren
- **Rechtmatig en realistisch:** de leerling voert zijn eigen cijfer handmatig in (vak, cijfer, weging, datum). Optioneel bevestigt een ouder het cijfer. Er is dan geen koppeling, geen inloggegevens van derden en geen afhankelijkheid.
- Bouw anti-fraudemaatregelen in het spelontwerp in, in plaats van verificatie bij de bron:
  - een maximum aantal beloonde cijfers per week;
  - beloning afvlakken (geen extreme beloning voor een 10);
  - optioneel een "ouder bevestigt".
- Neem pas contact op met het partnerprogramma van Magister of Somtoday als er later een rechtspersoon en een schoolpartner zijn. Dat is buiten scope en kost waarschijnlijk geld (**ONZEKER**).

---

## 2. Echte voetballers, clubs en ratings

### Bevindingen
- **VASTGESTELD (wet).** Portretrecht art. 21 Auteurswet: openbaarmaking van een niet in opdracht gemaakt portret mag niet als de geportretteerde een *redelijk belang* heeft om zich ertegen te verzetten.
- **VASTGESTELD (rechtspraak, via secundaire bronnen).**
  - **Cruijff/Tirion (HR 2013).** Art. 21 is geen absoluut verbodsrecht. Er volgt een belangenafweging, waarin een redelijke vergoeding een rol kan spelen.
  - **Commerciële belangen.** Een sporter met "verzilverbare populariteit" hoeft commerciële uitbating zonder vergoeding niet te dulden.
  - **Davids/Riot Games (Rb. Amsterdam 2017).** Een herkenbaar gamepersonage ("Striker Lucian") was inbreuk op het portretrecht van Edgar Davids. Een portret vereist dus niet per se een foto; ook herkenbaarheid via kenmerken telt.
  - **Albert Heijn-voetbalplaatjes (Ktr. Noord-Holland, okt. 2020).** Collectief gebruik van een spelersportret was toegestaan op grond van art. 22 cao contractspelers betaald voetbal 2017–2021. Collectieve rechten van Eredivisiespelers lopen dus via cao, club en competitie.
- **VASTGESTELD.** FIFPRO Commercial Enterprises licentieert collectieve NIL-rechten (naam, beeld, gelijkenis) van profvoetballers en nodigt "game developers, apps" uit om contact op te nemen. Voorbeeld: Soccerverse kreeg in december 2025 een FIFPRO-licentie voor namen en beelden van ruim 65.000 spelers van 70+ bonden (persbericht). FIFPRO-rechten verschillen per land en zijn soms niet-exclusief. Clubnamen, -logo's en competities vallen er **niet** onder; die moeten apart worden geregeld. **ONZEKER:** de voorwaarden en kosten. Er is geen publieke tarieflijst; **WAARSCHIJNLIJK** een minimumgarantie of royalty en een rechtspersoon.
- **VASTGESTELD.** Sorare heeft een licentie van de Eredivisie (sinds januari 2021, verlengd tot 2025). Of die daarna is verlengd, heb ik niet nagegaan. Officiële fantasygames werken dus met licenties van competitie, clubs en spelersbonden.
- **WAARSCHIJNLIJK (vaste EU-rechtspraak, niet opnieuw nagelezen).**
  - Club- en competitielogo's zijn merken en vaak ook auteursrechtelijk beschermd. Merkgebruik op virtuele goederen vraagt toestemming (vgl. HvJ EU C-206/01 Arsenal/Reed).
  - Databankrecht (sui generis) beschermt substantiële investeringen in het *verkrijgen* van data; het *creëren* van data valt er niet onder (HvJ C-203/02 BHB/William Hill; C-604/10 Football Dataco/Yahoo, wedstrijdschema's).
  - Ratings van EA FC, Transfermarkt-marktwaarden en Sofascore-ratings zijn eigen redactionele of algoritmische output van die partijen. Het overnemen van (substantiële delen van) zo'n set is **juridisch riskant** (auteurs- of databankrecht en voorwaarden).
- **Databronnen.**
  - **Wikidata.** **VASTGESTELD:** gestructureerde data valt onder **CC0**. Feitelijke gegevens als naam, geboortedatum, nationaliteit, positie en club mogen technisch worden hergebruikt. Let op: CC0 regelt alleen het auteurs- en databankrecht van Wikidata, **niet** het portretrecht of de persoonlijkheidsrechten van de speler. Foto's op Wikimedia Commons hebben per bestand een eigen licentie (vaak CC BY-SA); dat staat los van het portretrecht.
  - **API-Football (api-sports).** **ONZEKER:** de voorwaardenpagina gaf 403. Op het Apple-forum citeert een ontwikkelaar uit de voorwaarden dat logo's en afbeeldingen auteursrechtelijk van hun eigenaars zijn en dat de dienst "only provides the sources". De licentie op beeldmateriaal hoort dus niet bij de API (**WAARSCHIJNLIJK**).
  - **Sportmonks, football-data.org.** **ONZEKER:** de voorwaardenpagina's waren niet bereikbaar (403/404). Derden noemen voor de free tier van football-data.org 10 verzoeken per minuut, 12 competities en geen spelersstatistieken. Clublogo's ("crests") zijn volgens rechthebbenden (o.a. Football DataCo, VK) merk- en licentiemateriaal van clubs en competities.
  - **Transfermarkt.** **ONZEKER:** de voorwaarden konden niet worden opgehaald (fetch geblokkeerd). Scraping wordt commercieel aangeboden, maar dat zegt niets over de rechtmatigheid. Gebruik Transfermarkt niet als bron zonder schriftelijke toestemming.

### Risico's
- Echte namen, foto's of herkenbare gelijkenis in een kaartspel geven een **reëel claimrisico** (portretrecht of onrechtmatige daad, merkenrecht), ook bij een gratis privégame. Het gaat om commerciële waarde als "verzamelobject". **ONZEKER** hoe een rechter weegt dat er geen verdienmodel is. Rechtspraak over gratis hobbyprojecten vond ik niet.
- Alleen namen zonder foto's valt formeel niet onder art. 21 Aw (geen portret). Het kan wel onrechtmatig zijn (art. 6:162 BW, naam- of persoonlijkheidsrecht), zeker in een verzamelbare en verhandelbare vorm. **ONZEKER.**
- Ratings overnemen van EA, Sofascore of Transfermarkt: databank-, auteurs- of contractrisico.
- Een FIFPRO-licentie kost waarschijnlijk geld en vraagt een rechtspersoon. Dat strijdt met de randvoorwaarde "geen kosten".

### Advies: NO-GO voor echt; CONDITIONELE GO voor fictief
- **Aanbevolen:** fictieve spelers met gegenereerde namen en avatars, fictieve clubs en logo's, en eigen ratings uit het eigen spelmodel. Dit is volledig rechtenvrij.
- **Variant met restrisico:** alleen echte *feitelijke* data uit Wikidata (CC0), zonder foto's, logo's of officiële clubnamen en met eigen ratings. Dit vermijdt het databank- en auteursrecht, maar **niet** het naam- en persoonlijkheidsrisico van spelers. Niet doen zonder bevestiging van een jurist.
- Echte spelers alleen met een schriftelijke licentie: FIFPRO voor spelers, en clubs of competitie voor logo's en namen.

---

## 3. AVG/UAVG voor minderjarigen

### Bevindingen
- **VASTGESTELD (wet).** Art. 8 AVG (diensten van de informatiemaatschappij die rechtstreeks aan kinderen worden aangeboden, met toestemming als grondslag): onder de 16 jaar is toestemming nodig van de ouder of verzorger. De verwerkingsverantwoordelijke moet redelijke inspanningen leveren om dat te verifiëren (art. 8 lid 2).
- **VASTGESTELD (wet).** Art. 5 UAVG (versie geldig vanaf 01-09-2026, wetten.overheid.nl): waar art. 8 AVG niet van toepassing is, is voor betrokkenen onder 16 jaar *"de toestemming van zijn wettelijk vertegenwoordiger vereist"*. De ouder kan altijd intrekken (lid 3). Bij betrokkenen onder 16 worden de rechten uit hoofdstuk III AVG uitgeoefend door de wettelijk vertegenwoordiger (lid 4). De uitzondering geldt alleen voor gratis hulp- en adviesdiensten (lid 5), en die is hier niet van toepassing.
  - **Gevolg:** ook als RANK11. géén "dienst van de informatiemaatschappij" is (gratis en niet "normaal tegen vergoeding", zie hieronder), geldt via art. 5 UAVG toch ouderlijke toestemming onder 16, zodra toestemming de grondslag is.
- **Grondslag (WAARSCHIJNLIJK).**
  - Toestemming (art. 6 lid 1 sub a) is de meest passende en transparante grondslag voor een vrijwillige game voor 10–16-jarigen.
  - "Uitvoering overeenkomst" (sub b) is wankel bij minderjarigen, omdat zij beperkt handelingsbekwaam zijn.
  - Gerechtvaardigd belang (sub f) is moeilijk, gezien de extra bescherming van kinderen (overweging 38 AVG).
  - Dit is geen juridisch advies; het is de gangbare lijn.
- **Huishoudelijke exceptie (WAARSCHIJNLIJK niet van toepassing).** Art. 2 lid 2 sub c AVG geldt alleen voor zuiver persoonlijke of huishoudelijke activiteiten. Een game die voor klasgenoten en anderen wordt opengesteld valt daar waarschijnlijk buiten (vgl. HvJ Lindqvist, C-101/01). De eigenaar is dus **verwerkingsverantwoordelijke** met alle plichten, ook als privépersoon.
- **Schoolcijfers.** **VASTGESTELD:** geen bijzondere persoonsgegevens in de zin van art. 9 AVG; die lijst is limitatief en noemt geen onderwijsprestaties. Wel gevoelig, en de AP noemt ze expliciet (zie DPIA).
- **DPIA.**
  - **VASTGESTELD:** de AP-lijst met verplichte DPIA's (Stcrt. 2019, 64418, gepubliceerd 27-11-2019) noemt bij nr. 15 *Profilering*: *"Systematische en uitgebreide beoordeling van persoonlijke aspecten van natuurlijke personen gebaseerd op geautomatiseerde verwerking (profilering), zoals bijvoorbeeld beoordeling van … prestaties van leerlingen …"*. Nr. 16 noemt grootschalige *observatie en beïnvloeding van gedrag*.
  - **WAARSCHIJNLIJK:** het automatisch omzetten van cijfers in beloningen en een rangschikking ("RANK") komt dicht bij nr. 15. Daarnaast zijn meerdere EDPB-criteria geraakt (kwetsbare betrokkenen, evaluatie/scoring, innovatieve toepassing). **Advies: voer een DPIA uit**, ook als het aantal gebruikers klein is. Het kost niets behalve tijd.
  - **VASTGESTELD:** in 2026 liep een AP-consultatie over een lijst van *uitzonderingen* op de DPIA-plicht (Privacy First-reactie, 06-08-2026). De status is **ONZEKER**.
- **Code voor Kinderrechten.** **VASTGESTELD:** tien beginselen, opgesteld door Universiteit Leiden (eLaw) en Waag in opdracht van BZK (2021). Ze zijn niet zelfstandig afdwingbaar, maar gebaseerd op het IVRK en de AVG. Voorbeelden: belang van het kind voorop, kinderen betrekken, dataminimalisatie, geen manipulatief of verslavend ontwerp, privacy by default. Ik vond geen actualisatie na 2022 (**ONZEKER**).
- **Bewaartermijnen.** De AVG kent geen vaste termijn; wel opslagbeperking (art. 5 lid 1 sub e). Bewaartermijnen moeten zelf worden vastgesteld en gemotiveerd.
- **Rechten van betrokkenen.** Art. 12–22 AVG (inzage, rectificatie, wissen, beperking, overdraagbaarheid, bezwaar). Bij een kind onder 16 oefent de ouder de rechten uit (art. 5 lid 4 UAVG). Daarnaast gelden het register van verwerkingen (art. 30), meldplicht datalekken (art. 33/34), beveiliging (art. 32) en verwerkersovereenkomsten met hosting- en mailproviders (art. 28).
- **DSA art. 28.**
  - **VASTGESTELD:** art. 19 DSA sluit de afdeling "aanvullende bepalingen voor onlineplatforms" uit voor micro- en kleine ondernemingen. Daaronder valt **WAARSCHIJNLIJK** ook art. 28; de artikelnummering heb ik niet in EUR-Lex kunnen nalezen, omdat EUR-Lex geblokkeerd werd.
  - **VASTGESTELD:** de richtsnoeren bij art. 28 van de Commissie (definitief 14-07-2025) zijn niet bindend en sluiten micro- en kleine ondernemingen uit (Taylor Wessing/Inside Privacy, juli 2025).
  - **ONZEKER/WAARSCHIJNLIJK niet van toepassing:** een gratis privégame zonder vergoeding is mogelijk niet eens een "dienst van de informatiemaatschappij" (die wordt "normaal tegen vergoeding" verricht). Een besloten groep is mogelijk geen "verspreiding onder het publiek", wat voor een onlineplatform vereist is. De richtsnoeren zijn wel een bruikbare checklist.
- **Nieuw: EU KIDS Act-voorstel.** **VASTGESTELD:** COM(2026) 681 final, 17-09-2026. Dit is een voorstel, **nog geen wet**; het Parlement had op 15-10-2026 nog geen commissie toegewezen.
  - Het voorstel geldt voor "online games" die toegankelijk zijn voor minderjarigen, gratis of betaald (art. 2 lid 1 sub d, overw. 12).
  - Er is géén uitzondering voor micro- en kleine ondernemingen (toelichting).
  - Art. 15 verplicht games onder meer tot:
    - geen ontwerp dat dwangmatig gebruik aanmoedigt, via art. 9 lid 2 sub b (*notificaties die niet zijn uitgelokt door de activiteit van de minderjarige*) en sub d (*belonen van regelmatig of vaker terugkomen, straf of verlies bij wegblijven*);
    - hoge privacy-standaardinstellingen;
    - veilige contacten tussen gebruikers;
    - **verplichte ouderlijke tools (art. 20)**, en voor kinderen **onder 13** toegang alleen via die tools.
  - Art. 2 lid 4 sluit alleen o.a. educatieve diensten van onderwijsinstellingen uit, niet hobbyprojecten.
  - "Video game" is gedefinieerd als *dienst van de informatiemaatschappij*. Daardoor geldt dezelfde **ONZEKERHEID** over gratis privéprojecten.
  - Als het wordt aangenomen, geldt de verordening 6 maanden na inwerkingtreding. Toepassing **WAARSCHIJNLIJK** niet vóór 2028. Het voorstel kan nog wijzigen.

### Risico's
- Zonder geldige ouderlijke toestemming is de verwerking van gegevens van kinderen onder 16 onrechtmatig.
- Cijfers die zichtbaar worden voor anderen, bijvoorbeeld via een kaartrating die 1-op-1 het cijfer weerspiegelt, een ranglijst of een gedeeld team. Dat is een privacyrisico en een risico voor het welzijn van kinderen (sociale vergelijking, druk).
- Pedagogisch risico: prikkel om cijfers te vervalsen, extrinsieke motivatie, druk op zwakkere leerlingen. Dit is geen juridische plicht, maar raakt aan beginsel "belang van het kind".
- Als privépersoon draagt de eigenaar zelf de aansprakelijkheid; er is geen rechtspersoon die die afschermt.

### Advies: CONDITIONELE GO, met minimale maatregelen
1. Ouder-account vóór kind-account voor alle gebruikers onder 16. Expliciete, gedocumenteerde toestemming van de ouder met uitleg per verwerking, intrekbaar via het ouder-account.
2. DPIA vóór livegang (AP-model), plus register van verwerkingen, privacyverklaring in kindertaal en een versie voor ouders.
3. Dataminimalisatie:
   - geen naam, e-mail, telefoon, school of klas van het kind verplicht;
   - een bijnaam die door de ouder is goedgekeurd of uit een vaste woordenlijst komt;
   - per cijfer alleen vak (optioneel), waarde en datum;
   - na verwerking naar beloning het ruwe cijfer zo snel mogelijk verwijderen of aggregeren.
4. Cijfers nooit zichtbaar voor anderen:
   - kaartratings niet 1-op-1 herleidbaar maken tot een cijfer (beloning bepaalt de *kans* of het aantal packs, niet de rating);
   - geen ranglijst op cijfers, alleen op spelresultaat.
5. Vaste bewaartermijnen. Voorstel ter besluitvorming: ruwe cijfers maximaal 30 dagen, account verwijderen na 12 maanden inactiviteit, logs maximaal 30 dagen.
6. Hosting in de EU (zie §5), verwerkersovereenkomsten/DPA's met de leveranciers, geen trackers en geen analytics van derden, geen advertenties.
7. Contact tussen kinderen standaard uit: geen vrije chat, alleen vooraf gedefinieerde reacties en handel zonder berichten.
8. Anticipeer op de KIDS Act en de Code voor Kinderrechten:
   - geen streaks of dagelijkse login-beloningen;
   - geen notificaties om terug te komen;
   - ouderdashboard met speeltijdlimiet en stille uren.
9. Voorleggen aan een privacyjurist of het Juridisch Loket vóór openstelling buiten de vriendengroep. **ONZEKER** of dit kosteloos kan.

---

## 4. Packs en lootboxes

### Bevindingen
- **VASTGESTELD (primaire bron).** ABRvS 9 maart 2022, ECLI:NL:RVS:2022:690 (zaaknr. 202005769/1/A3). De last onder dwangsom van de Ksa aan EA is herroepen.
  - De Afdeling volgt EA: de FUT-modus is *"een gemengd behendigheidsspel. De packs voegen een kanselement toe aan het spel."*
  - De packs zijn geen apart kansspel, omdat *"de grote meerderheid van de packs [wordt] verkregen door en gebruikt voor speldeelname"* (EA: 92% via spelbetrokkenheid).
  - *"De verhandelbaarheid van de packs op de zwarte markt is betrekkelijk."*
  - De Afdeling heeft **niet** beslist of packs een "prijs" met economische waarde zijn; daar ging het niet om.
- **VASTGESTELD.** Motie-Bontenbal c.s. (Kamerstuk 26643 nr. 881, gewijzigd tot nr. 890, juli 2022) vraagt een verbod op lootboxes te onderzoeken en de wet zo nodig aan te passen. In december 2024 deelde minister Beljaarts de opvatting dat een UNICEF-onderzoek de noodzaak van een verbod onderstreept. Een tijdpad vond ik niet. **ONZEKER:** de stand in 2026. Ik vond geen Nederlands wetsvoorstel. Secundaire bronnen zeggen dat het kabinet inzet op een EU-aanpak.
- **VASTGESTELD.** Digital Fairness Act: op 25-10-2026 is er nog geen voorstel gepubliceerd. Het werkprogramma noemt Q4 2026; een indicatieve agenda noemt 11-11-2026. Het Europees Parlement vroeg in november 2025 om een verbod op lootboxes in games die toegankelijk zijn voor minderjarigen. Dat is niet bindend. De inhoud van de DFA is **ONZEKER**.
- **VASTGESTELD.** KIDS Act-voorstel (zie §3): het bindende verbod op *"variable reward systems"* staat in art. 13 en geldt voor sociale netwerken en videoplatforms. Art. 15 (games) verwijst **niet** naar art. 13. Overweging 40 wil voor games "dezelfde bescherming" via gedragscodes, zoals PEGI. Het verbod op login-beloningen en straffen bij wegblijven geldt via art. 9 lid 2 sub d **wel** voor games.
- **VASTGESTELD.** PEGI (pegi.info, 12-03-2026). Voor games die vanaf juni 2026 worden ingediend:
  - *betaalde* random items → standaard **PEGI 16**, soms 18;
  - tijd- of aantal-beperkte aanbiedingen → PEGI 12;
  - dagelijkse opdrachten → PEGI 7, en PEGI 12 als wegblijven wordt bestraft;
  - NFT/blockchain → PEGI 18.
  
  Sinds oktober 2026 wordt een deel van de bestaande digitale games met betaalde random items herbeoordeeld naar PEGI 16. Random items die *niet* betaald worden, noemt PEGI niet. De PEGI-gedragscode vraagt dat aankoopbare random items worden vermeld en dat de kansen transparant zijn.
- **WAARSCHIJNLIJK.** PEGI is zelfregulering voor uitgevers en winkels (consoles, app stores via IARC). Een PWA buiten app stores om heeft geen PEGI-classificatie nodig.
- **WAARSCHIJNLIJK.** Wet op de kansspelen art. 1 sub a: het element "prijzen of premiën" vereist economische waarde. Packs zonder inleg van geld, die niet verhandelbaar zijn voor geld en zonder prijzen in de echte wereld, zijn dan geen kansspel. Ik heb de wettekst niet opnieuw nagelezen.

### Risico's
- Echt geld (kopen van packs of munten), verhandelbaarheid buiten het spel (account- of kaartverkoop) of echte prijzen (cadeaubon voor de beste speler) kunnen het spel richting een kansspel duwen. Bij echte prijzen gaat het dan om promotionele kansspelen met eigen regels.
- **Reputatie- en welzijnsrisico.** Het mechaniek is precies wat politiek en EU onder vuur nemen: kinderen, willekeurige beloning, verzamelen. Toekomstige regels (DFA, KIDS Act-gedragscodes) kunnen ook gratis variabele beloningen raken. **ONZEKER.**
- Een koppeling met cijfers maakt kansmechaniek "pedagogisch" geladen. Ouders en scholen kunnen dat als gokachtig ervaren.

### Advies: CONDITIONELE GO
- **Harde voorwaarden:**
  - nooit echt geld: geen aankopen, geen betaalde munten, geen donaties die voordeel geven;
  - geen prijzen uit de echte wereld;
  - geen overdracht van accounts of kaarten buiten het spel;
  - in-game munten alleen te verdienen, niet in te wisselen.
- **Kansen tonen: wenselijk.** Wettelijk niet verplicht voor gratis packs (**WAARSCHIJNLIJK**), maar in lijn met de PEGI-code en de Code voor Kinderrechten. Toon per packtype de kans per zeldzaamheid.
- **Ontwerp met de minste kans-prikkel:**
  - een goed cijfer geeft een gegarandeerde basisbeloning plus beperkte variatie;
  - een "pity"/garantie na N packs;
  - geen bijna-winst-animaties, geen tijdsdruk;
  - optie in het ouderdashboard om packs te vervangen door directe keuze ("kies 1 van 3").
- Geen streaks of dagelijkse login-beloningen, en geen bestraffing bij wegblijven (KIDS Act art. 9 lid 2 sub d, PEGI 12-criterium).

---

## 5. Cloudflare als backend

### Bevindingen (prijzen en limieten volgens officiële docs)

| Onderdeel | Free | Paid ($5 per maand minimum) | Bron (laatst bijgewerkt) |
|---|---|---|---|
| Workers-verzoeken | 100.000 per dag | 10 mln per maand incl., daarna $0,30 per mln | workers/pricing (02-10-2026) |
| Workers-CPU | 10 ms per aanroep | 30 mln CPU-ms incl. | idem |
| Durable Objects: verzoeken | 100.000 per dag | 1 mln per maand incl., daarna $0,15 per mln | durable-objects/pricing (18-10-2026) |
| DO-duur | 13.000 GB-s per dag | 400.000 GB-s incl., daarna $12,50 per mln GB-s | idem |
| DO SQLite: gelezen / geschreven rijen | 5 mln / 100.000 per dag | 25 mld / 50 mln per maand incl. | idem |
| DO-opslag | 5 GB totaal | 5 GB-maand incl., daarna $0,20 per GB-maand | idem |
| D1: gelezen / geschreven rijen | 5 mln / 100.000 per dag | 25 mld / 50 mln per maand | workers/pricing |
| D1: grootte | 500 MB per DB, 10 DB's, 5 GB per account | 10 GB per DB (harde limiet), 1 TB | d1/limits (24-10-2026) |
| D1: queries per aanroep | 50 | 1.000 (een batch telt als 1) | idem |
| Queues | 10.000 operaties per dag | 1 mln per maand incl., daarna $0,40 per mln | workers/pricing |
| R2 | 10 GB-maand, 1 mln Class A, 10 mln Class B, egress gratis | $0,015 per GB-maand | r2/pricing (01-10-2026) |
| Turnstile | gratis, onbeperkt aantal challenges, 20 widgets | — | turnstile/plans (14-08-2026) |

- **VASTGESTELD.** Op Free zijn **alleen SQLite-backed Durable Objects** beschikbaar.
  - Bij overschrijding van een daglimiet falen de operaties met een fout; er komt geen rekening (reset om 00:00 UTC). Dat is gunstig voor de randvoorwaarde "geen kosten".
  - Websocket-berichten worden gefactureerd in een verhouding 20:1. Uitgaande berichten zijn gratis.
  - Een DO in hibernation (WebSocket Hibernation API) rekent geen duur.
  - Andere limieten: soft limit 1.000 verzoeken per seconde per object; 30 s CPU per verzoek (configureerbaar tot 5 min).
  - Opslag per object: de limietpagina noemt 10 GB, terwijl een FAQ op dezelfde site 1 GB voor Free noemt. **ONZEKER**; ruim voldoende voor een match of pool.
- **VASTGESTELD (atomiciteit).**
  - **DO:** elke reeks writes zonder tussenliggende `await` wordt atomair weggeschreven. `transactionSync()` rolt terug bij een exceptie. `BEGIN TRANSACTION` via `sql.exec` is niet toegestaan. Input/output gates voorkomen interleaving. Eén object is single-threaded.
  - **D1:** `batch()` is een SQL-transactie; als één statement faalt, wordt *"the entire sequence"* teruggedraaid. Interactieve transacties met logica tussen statements zijn niet gedocumenteerd.
- **VASTGESTELD (dataresidentie).**
  - **DO:** jurisdictie `eu` via `env.NS.jurisdiction("eu")`. Het object draait en bewaart data alleen in de EU, maar het DO-ID wordt buiten de jurisdictie gelogd (billing/debug). Workers zelf kunnen overal draaien.
  - **D1:** `--jurisdiction=eu` alleen bij aanmaken, later niet te wijzigen. Read-replica's blijven binnen de jurisdictie.
  - **R2:** heeft ook een EU-jurisdictie (**WAARSCHIJNLIJK**, niet apart nagelezen).
  - "Regional Services" voor afhandeling in een regio is een aparte (betaalde, **WAARSCHIJNLIJK** Enterprise) dienst.
- **Web Push.** **VASTGESTELD:**
  - Workers-compatibele libraries met Web Crypto bestaan (`web-push-neo`, `@pushforge/builder`). De Node-library `web-push` werkt niet op Workers.
  - iOS ondersteunt Web Push alleen voor een PWA die op het beginscherm is gezet (iOS/iPadOS 16.4+), na een gebruikersactie. Dit staat in communitybronnen; Apple-docs niet nagelezen.

### Geschiktheid
- **Realtime kaartbattles (server-authoritative):** **WAARSCHIJNLIJK goed geschikt.** Eén DO per match of matchmaking-pool:
  - de DO houdt de autoritatieve state en valideert zetten;
  - websockets met hibernation;
  - alarms voor timeouts.
  
  Een beurtgebaseerde kaartgame is licht qua CPU en berichten. De Free-limieten (100.000 DO-verzoeken per dag, websockets 20:1) passen ruim bij tientallen tot enkele honderden dagelijkse spelers (**WAARSCHIJNLIJK**, nog niet gemeten).
- **Atomische economie/transfermarkt:** **WAARSCHIJNLIJK goed geschikt** als je de schrijfautoriteit per domein in één DO bundelt. Voorbeelden: één "Market"-DO per markt, of één DO per speler-portemonnee plus een idempotentiesleutel per transactie. D1 is alleen geschikt met `batch()` en voorwaardelijke `UPDATE … WHERE` (optimistic checks).
  - Let op: transacties *over* meerdere DO's heen zijn niet atomair. Ontwerp met één eigenaar per asset, of met een saga/escrow-patroon plus idempotente operaties.
- **Web Push:** haalbaar. Maar de KIDS Act-richting en de Code voor Kinderrechten pleiten voor alleen door de gebruiker uitgelokte meldingen, zoals "je bod is geaccepteerd".

### Alternatieven (kort)

| | Kosten bij start | AVG/EU | Complexiteit | Opmerking |
|---|---|---|---|---|
| **Cloudflare Workers + DO + D1** | €0 (Free, harde limieten) | jurisdictie `eu` voor DO, D1 en R2; Amerikaanse aanbieder | middel: DO-model is nieuw, vendor-specifiek | beste match voor realtime plus €0 |
| **Supabase** (Postgres + Realtime) | €0. Free: 500 MB DB, 200 realtime-verbindingen, 2 mln berichten per maand, **pauze na 1 week inactiviteit**, 2 projecten. Pro vanaf $25 per maand | EU-regio's beschikbaar (**WAARSCHIJNLIJK**, niet op de prijspagina) | laag tot middel; echte SQL-transacties; server-authoritative game-logica moet in Edge Functions of een eigen server | pauze is hinderlijk voor een live game |
| **Firebase** (Spark) | €0. Firestore 50.000 reads / 20.000 writes per dag; RTDB 100 verbindingen; **Cloud Functions niet op Spark** | EU-locaties beschikbaar (**WAARSCHIJNLIJK**) | laag voor de client, maar server-authoritative logica zonder Functions is lastig | betaalplan (Blaze) nodig voor serverlogica |
| **Colyseus op een VPS** | VPS kost geld (**WAARSCHIJNLIJK** enkele euro's per maand) | EU-hoster naar keuze | hoog: beheer, updates, beveiliging en back-ups zelf | strijdt met "geen kosten" en vraagt beheer |

### Risico's
- Cloudflare is een Amerikaanse aanbieder. De DPA van Cloudflare en de doorgifte (EU-US Data Privacy Framework) moeten in de DPIA worden beoordeeld. **WAARSCHIJNLIJK** is Cloudflare DPF-gecertificeerd; niet nagelezen.
- Logs en metadata, en het DO-ID, kunnen buiten de EU worden verwerkt.
- Vendor lock-in door het DO-model.
- De Workers Free-limiet van 10 ms CPU per aanroep kan krap zijn voor zware validatie in de Worker zelf. Leg zware logica in de DO.
- De D1 Free-limiet van 100.000 geschreven rijen per dag is ruim voor een kleine groep, maar overschrijding betekent uitval, geen kosten.
- Prijzen en limieten wijzigen regelmatig (pagina's bijgewerkt in juni–oktober 2026).

### Advies: CONDITIONELE GO
- **Voorwaarden:**
  - Free-plan zonder betaalmethode; als dat niet kan, budgetwaarschuwingen op €0. Of een creditcard nodig is, is **ONZEKER**.
  - Alle DO-namespaces via `jurisdiction("eu")`, D1 en R2 aangemaakt met `eu`.
  - Persoonsgegevens alleen in EU-gebonden opslag; geen persoonsgegevens in Workers-logs.
  - Cloudflare-DPA meenemen in de DPIA.
  - Eén DO per match en één autoritatieve DO per economisch domein, met idempotentiesleutels.
- Eerst een prototype met loadtest, en meet het verbruik tegen de Free-limieten vóór livegang.

---

## 6. Inloggen zonder e-mail of telefoon van kinderen

### Bevindingen
- **Passkeys/WebAuthn.** **WAARSCHIJNLIJK geschikt:** er is geen contactgegeven nodig. Passkeys synchroniseren via iCloud-sleutelhanger of het Google-wachtwoordbeheer, zijn gebonden aan één persoon en zijn niet deelbaar (secundaire bronnen). **ONZEKER:** ondersteuning en beperkingen bij kinderaccounts (Family Link, Apple-kindaccount) en op gedeelde of schoolapparaten; daar vond ik geen officiële bron. Er is altijd een herstelroute nodig.
- **Magic link naar het e-mailadres van de ouder:** **WAARSCHIJNLIJK geschikt.** Je verwerkt alleen gegevens van de ouder, en dat sluit aan op de toestemmingsflow (art. 8 AVG / art. 5 UAVG). Het e-mailadres van de ouder is wel een persoonsgegeven, en verzending loopt via een mailprovider (verwerker, DPA).
- **Gebruikersnaam + pincode die de ouder uitgeeft:** eenvoudig, en werkt op elk apparaat. Een pincode is zwak; nodig zijn rate limiting, lockout, Turnstile en hashing met een sterke KDF. Herstel loopt via de ouder.
- **Cloudflare Turnstile.** **VASTGESTELD:** gratis, onbeperkt aantal challenges. Volgens de Turnstile-privacyverklaring (bijgewerkt 18-06-2025) verwerkt Turnstile signalen als IP-adres, TLS-fingerprint en User-Agent, uitsluitend voor botdetectie, *"not used to identify, profile or target"*. De bewaartermijn staat niet in de verklaring (**ONZEKER**).
- **KIDS Act-voorstel (indicatief):** voor kinderen onder 13 alleen toegang via ouderlijke tools.

### Advies: GO
1. De ouder maakt een account aan met e-mail plus magic link (en optioneel een passkey) en geeft toestemming.
2. De ouder maakt een kindprofiel aan met een bijnaam en zonder contactgegevens.
3. Het kind koppelt een apparaat via een eenmalige koppelcode of QR uit het ouder-account. Daarna logt het in met een passkey op dat apparaat. Fallback: een pincode van 6 cijfers plus rate limiting.
4. Turnstile bij registratie en bij herhaald mislukte pogingen.
5. Herstel en verwijderen loopt alleen via het ouder-account.

---

## Belangrijkste onzekerheden (top 5)
1. **Toepasselijkheid van DSA/KIDS Act en art. 8 AVG op een gratis privégame.** Is het een "dienst van de informatiemaatschappij" (normaal tegen vergoeding)? Daarvan hangt veel af. De KIDS Act is bovendien nog een voorstel dat kan wijzigen. Via art. 5 UAVG blijft ouderlijke toestemming onder 16 hoe dan ook nodig als toestemming de grondslag is.
2. **Naamgebruik van echte spelers zonder foto's**, eventueel met CC0-feitendata uit Wikidata. Er is geen Nederlandse rechtspraak voor gratis hobbygames gevonden. Het risico is reëel maar niet te kwantificeren.
3. **Hoe "Magister Ultimate Team" technisch werkt** (DOM-uitlezing of tokens/API) en of Magister of Somtoday dat tolereert. Er is geen publieke reactie gevonden. Of het uitlezen in de eigen browser onder het API-verbod valt, is juridisch ongetoetst.
4. **Toekomstige regels voor gratis variabele beloningen.** De DFA is nog niet gepubliceerd (verwacht ~11-11-2026). De KIDS Act laat de regels voor games via gedragscodes lopen. Er is geen Nederlands wetsvoorstel gevonden.
5. **Exacte Free-plan-details en EU-dataresidentie bij Cloudflare.** Bijvoorbeeld: opslag per DO (1 vs 10 GB), of er een creditcard nodig is, logs buiten de EU en de DPF-status. Niet alles is in primaire bronnen geverifieerd.

---

## Bronnenlijst

Alle bronnen zijn geraadpleegd op 25-10-2026. Waar bekend staat de datum van de bron zelf tussen haakjes.

**Onderwerp 1**
- Magister voorwaarden: https://magister.nl/voorwaarden (geen datum, © 2026)
- Magister partnerprogramma: https://magister.nl/partners (geen datum, © 2026)
- Magister SCIM API: https://service.magister.nl/support/solutions/articles/101000509051-scim-api-voor-identity-management (datum onbekend)
- Home Assistant-forum, citaat uit de API-voorwaarden: https://community.home-assistant.io/t/magister-integration/560070 (post 13-10-2023)
- Homey-forum, reactie Iddink: https://community.homey.app/t/hoe-gebruik-jij-de-magister-app/604?page=4 (posts 20-01-2020 t/m 24-12-2021)
- Studyspace koppelpartners: https://www.studyspace.nl/koppelingen/ (datum onbekend; noemt 18-12-2018)
- magister.js: https://www.npmjs.com/package/magister.js ; magister-api: https://github.com/idiidk/magister-api (datum onbekend)
- Somtoday partnerprogramma: https://som.today/partnerprogramma/ (geen datum)
- Somtoday Connect: https://som.today/nieuwsartikel/somtoday-connect-grip-op-privacy-en-data/ (datum onbekend)
- Somtoday servicedesk, toegang Connect: https://somtoday-servicedesk.zendesk.com/hc/nl/articles/4418773590289-Toegang-geven-tot-Somtoday-Connect (datum onbekend)
- Somtoday AVG-module: https://som.today/avg-module/ (datum onbekend)
- Onofficiële Somtoday API-documentatie: https://github.com/elisaado/somtoday-api-docs (datum laatste commit onbekend)
- Somtoday Mod: https://addons.mozilla.org/firefox/addon/somtoday-mod/ (datum onbekend)
- Edu-V: https://www.edu-v.org/ (nieuwsberichten 05-05-2026, 01-10-2026)
- Oprichting Edu-V: https://www.dutchitchannel.nl/news/631231/onderwijssector-bundelt-krachten-voor-veiliger-delen-leerlingdata-met-nieuw-keurmerk-edu-v (19-05-2025)
- Chrome Web Store, Magister Ultimate Team: https://chromewebstore.google.com/detail/magister-ultimate-team/pjmedifangackgpgacmngocmjoimjbpj (versie bijgewerkt 25-10-2026)
- TikTok @magisterultimateteam: https://www.tiktok.com/@magisterultimateteam (2026, eigen claims van de makers)
- VRT NWS over Smartschool Radar: https://www.vrt.be/vrtnws/nl/2026/06/18/smartschool-radar-geen-officiele-extensie/ (18-06-2026)

**Onderwerp 2**
- FIFPRO commercieel: https://www.fifpro.org/who-we-are/commercial (datum onbekend)
- Soccerverse/FIFPRO: https://decrypt.co/351814/soccerverse-secures-fifpro-license-to-bring-real-world-authenticity-to-on-chain-football-game (10-12-2025, persbericht)
- Rechtspraak, AH-voetbalplaatjes: https://www.rechtspraak.nl/organisatie-en-contact/organisatie/rechtbanken/rechtbank-noord-holland/nieuws/2020/10/voetbalplaatjes-speler-ado-den-haag-in-het-ongelijk (okt. 2020)
- IViR, annotatie Davids/Riot (AMI 2018/1): https://www.ivir.nl/publicaties/download/Annotatie_AMI_2018_1.pdf (2018)
- CMS, eSports and image rights: https://cms.law/en/NLD/Publication/eSports-and-image-rights (datum onbekend)
- Eredivisie–Sorare: https://eredivisie.nl/nieuws/eredivisie-en-sorare-slaan-handen-ineen-voor-uitbreiding-van-wereldwijde-samenwerking/ (verlenging tot 2025)
- Wikidata-licentie: https://www.wikidata.org/wiki/Wikidata:Licensing (CC0)
- Apple-forum, API-Football-voorwaarden (secundair): https://developer.apple.com/forums/thread/718427 (datum onbekend)
- Journalism.co.uk over FootyTweets/Football DataCo: https://www.journalism.co.uk/footytweets-use-of-fixtures-info-breached-copyright-says-firm-representing-uk-professional-football-leagues (ouder)
- Niet bereikbaar (403/404/geblokkeerd): voorwaarden van api-football.com, sportmonks.com, football-data.org en transfermarkt.com

**Onderwerp 3**
- UAVG art. 5: https://wetten.overheid.nl/BWBR0040940/ (geldend vanaf 01-09-2026)
- AP-lijst verplichte DPIA, Stcrt. 2019, 64418: https://zoek.officielebekendmakingen.nl/stcrt-2019-64418.html (gepubliceerd 27-11-2019)
- Privacy First, consultatie DPIA-uitzonderingen: https://privacyfirst.nl/wp-content/uploads/2026-08-06_PrivacyFirst_consultatiebijdrage_DPIA_def.pdf (06-08-2026)
- Code voor Kinderrechten: https://codevoorkinderrechten.waag.org/wp-content/uploads/2021/10/Code-voor-kinderrechten-NL.pdf (2021)
- DSA art. 19: https://www.eu-digital-services-act.com/Digital_Services_Act_Article_19.html (secundaire weergave; EUR-Lex niet bereikbaar)
- Richtsnoeren art. 28 DSA: https://www.taylorwessing.com/en/insights-and-events/insights/2025/07/rd-european-commission-guidelines-on-protection-of-minors-under-the-digital-services-act (juli 2025) en https://dsa-observatory.eu/2025/07/30/do-the-dsa-guidelines-on-protecting-minors-online-strike-the-right-balance/ (30-07-2025)
- EU KIDS Act-voorstel COM(2026) 681 final: https://ec.europa.eu/newsroom/repository/document/2026-38/Proposal_for_EU_KIDS_Act__EU_Keeping_Internet_Digital_Spaces_Accountable_and_Trustworthy_wh7RxWPSibRG6UlfmCMgsZvcEgc_132530.pdf (17-09-2026; art. 2, 3, 9, 11, 13, 15, 20 nagelezen)
- Commissie, nieuwsbericht: https://commission.europa.eu/news-and-media/news/eu-kids-act-helping-children-navigate-safer-online-world-2026-09-17_en (17-09-2026)
- Duiding: https://www.williamfry.com/knowledge/eu-kids-act-grown-up-rules-for-online-providers/ (24-09-2026), https://www.dwt.com/blogs/privacy--security-law-blog/2026/09/eu-kids-act-online-child-safety-proposal (30-09-2026), https://vgtimes.com/articles/172316-eu-gaming-law-plans.html (na 15-10-2026)

**Onderwerp 4**
- ABRvS 9-3-2022, ECLI:NL:RVS:2022:690, via open data: https://data.rechtspraak.nl/uitspraken/content?id=ECLI:NL:RVS:2022:690 (9-3-2022; r.o. 8.4–8.6 en 12 nagelezen)
- Motie-Bontenbal: https://zoek.officielebekendmakingen.nl/kst-26643-881.pdf en https://zoek.officielebekendmakingen.nl/kst-26643-890.pdf (2022)
- PEGI, nieuwe criteria: https://pegi.info/news/pegi-expands-age-rating-criteria-interactive-risk-categories (12-03-2026)
- PEGI, herbeoordeling bestaande games: https://pegi.info/news/pegi-updates-age-ratings-existing-games-paid-random-items (okt. 2026)
- PEGI-gedragscode: https://pegi.info/pegi-code-of-conduct (datum onbekend)
- Europees Parlement over minderjarigen online: https://www.europarl.europa.eu/news/en/press-room/20251013IPR30892/new-eu-measures-needed-to-make-online-services-safer-for-minors (13-10-2025)
- Status DFA: https://en.politis.com.cy/life/tech/1046104/new-eu-legislation-planned-to-protect-consumers-in-the-digital-environment (okt. 2026) en https://www.freshfields.com/en/our-thinking/blogs/technology-quotient/the-eus-proposed-digital-fairness-act-a-game-developers-guide-to-potential-imp (2025/2026)

**Onderwerp 5**
- Workers-prijzen: https://developers.cloudflare.com/workers/platform/pricing/ (02-10-2026)
- DO-prijzen: https://developers.cloudflare.com/durable-objects/platform/pricing/ (18-10-2026)
- DO-limieten: https://developers.cloudflare.com/durable-objects/platform/limits/ (01-06-2026)
- DO-dataresidentie: https://developers.cloudflare.com/durable-objects/reference/data-location/ (26-06-2026)
- DO Storage API: https://developers.cloudflare.com/durable-objects/api/storage-api/ (datum onbekend)
- D1-limieten: https://developers.cloudflare.com/d1/platform/limits/ (24-10-2026)
- D1-dataresidentie: https://developers.cloudflare.com/d1/configuration/data-location/ (02-10-2026)
- D1 Worker API (batch): https://developers.cloudflare.com/d1/worker-api/d1-database/ (datum onbekend)
- R2-prijzen: https://developers.cloudflare.com/r2/pricing/ (01-10-2026)
- Supabase-prijzen: https://supabase.com/pricing (geraadpleegd 25-10-2026)
- Firebase-prijzen: https://firebase.google.com/pricing (geraadpleegd 25-10-2026)
- Web Push op Workers: https://github.com/ryoppippi/web-push-neo en https://github.com/draphy/pushforge (datum onbekend)

**Onderwerp 6**
- Turnstile-plannen: https://developers.cloudflare.com/turnstile/plans/ (14-08-2026)
- Turnstile-privacyverklaring: https://www.cloudflare.com/turnstile-privacy-policy/ (18-06-2025)
- Passkeys, synchronisatie en beperkingen (secundair): https://www.descope.com/blog/post/manage-passkeys-apple-google-microsoft (datum onbekend)
