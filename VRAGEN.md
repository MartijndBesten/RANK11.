# VRAGEN

Dit bestand is het vaste vraag-en-antwoordkanaal tussen Martijn, ChatGPT/Codex en Claude Code.

## Werkwijze

- Voeg alleen vragen toe die een beslissing, ontbrekende bron of bevestiging van Martijn nodig hebben.
- Eén vraag per item met een uniek nummer: `V-001`, `V-002`, enzovoort.
- Gebruik status `open`, `beantwoord` of `verwerkt`.
- Claude zet nieuwe vragen op `open`.
- ChatGPT/Codex of Martijn vult het antwoord in en zet de status op `beantwoord`.
- Claude verwerkt het antwoord in het project, noteert waar dat is gedaan en zet de status op `verwerkt`.
- Verwijder oude vragen niet; ze vormen samen een beknopt beslisspoor.
- Algemene voortgang en volgende actor blijven uitsluitend in `HANDOFF.md`.

## Open vragen

### V-001 — Goedkeuring visuele richting (stap 4)

status: verwerkt
gesteld_door: claude
datum: 2026-10-25

**Vraag**

Keur je de visuele richting van de vier prototypeschermen goed? Het gaat om de Cijferkluis-onthulling, de pack-opening met walkout, de Ultimate Draft en de elftalbouwer. Zie de preview en `docs/review/`. Mag ik op basis daarvan aan stap 5 beginnen (backend en functionele releases R1–R8)? Of wil je eerst aanpassingen? Noem dan wat je anders wilt.

**Waarom nodig**

De masteropdracht zegt dat ik pas na jouw goedkeuring de volledige backend en alle gamefuncties bouw.

**Antwoord**

Martijn (25-10-2026, ronde 3): voorwaardelijk akkoord; Draft-scherm is de kwaliteitsreferentie. Eerst 7 verbeterpunten (consistente fotorealistische gezichten, onderscheidende series, informatieve Home, volledige navigatie, collectie met zoeken/filteren, elftal op kleine telefoons, één visuele identiteit). Daarna door met cijferdashboard, statistieken, doelen en multiplayerbackend.

**Verwerkt in**

Ronde 3 (nacht 25-10-2026): alle 7 punten uitgewerkt, zie HANDOFF.md. Stap 5 (backend) gestart; lokaal gebouwd, niet uitgerold.

### V-002 — Portretstijl van de spelers

status: verwerkt
gesteld_door: claude
datum: 2026-10-25

**Vraag**

Welke portretstijl kies je?

- **A.** De huidige gestileerde SVG-buste. Gratis, schaalbaar en per speler te genereren, maar zichtbaar "getekend".
- **B.** Een illustrator of AI-beeldpakket per speler, met vastgelegde rechten. Mooier, maar kost geld of tijd en vraagt een licentiecheck.
- **C.** Later gelicentieerde foto's (alleen samen met een licentie voor echte spelers, zie V-003).

Mijn advies: A voor versie 1, en B onderzoeken zodra het spel speelbaar is.

**Waarom nodig**

Het portret is het zwakste visuele onderdeel. De keuze bepaalt het werk aan de catalogus en mogelijk kosten.

**Update 25-10-2026 (avond):** op verzoek van Martijn uitgewerkt als fotorealistische AI-portretten van fictieve spelers (lokaal, FLUX.2 [klein] 4B, Apache-2.0). Twee voorbeeldkaarten gemaakt; besluit over de volledige catalogus in V-009.

**Antwoord**

Martijn (ronde 3): alle gezichten consistent fotorealistisch, geen getekende koppen tussendoor.

**Verwerkt in**

Volledige catalogus wordt lokaal gegenereerd (tools/portretten/batch.py); de app toont alleen spelers met portret zodra de catalogus (bijna) klaar is (PHOTOS_ONLY in apps/web/src/portraits/registry.ts).

### V-003 — Echte voetballers of fictieve catalogus

status: open
gesteld_door: claude
datum: 2026-10-25

**Vraag**

Ga je akkoord met een fictieve spelers- en clubcatalogus voor versie 1? Het onderzoek geeft een NO-GO voor echte namen, foto's, clubs en logo's zonder licentie (portretrecht, merkrecht, databankrecht). De catalogus is zo gebouwd dat een gelicentieerde bron later in te pluggen is.

**Waarom nodig**

Het bepaalt de catalogusbron en het juridische risico.

**Update 25-10-2026 (avond):** verdiept in `docs/onderzoek/ECHTE_SPELERS.md`. Alle routes met echte spelers, foto's of clubs zijn NO-GO zonder getekende licenties (ook Wikimedia Commons en data-API's). Fictief met AI-portretten is CONDITIONELE GO.

**Antwoord**

Nog niet beantwoord.

**Verwerkt in**

Nog niet verwerkt.

### V-004 — Cijferbron zonder Magister

status: verwerkt
gesteld_door: claude
datum: 2026-10-25

**Vraag**

Ga je akkoord dat versie 1 werkt met handmatige invoer door de leerling, met optionele bevestiging door een ouder, en zonder Magister-koppeling? Magister verbiedt API-gebruik door niet-geautoriseerde partijen. Het partnerprogramma vraagt een KvK-inschrijving, een verwerkersovereenkomst en een relatie met de school. Wil je dat partnertraject later toch verkennen, bijvoorbeeld via Denckh?

**Waarom nodig**

Een onofficiële koppeling valt af. Dit legt de bron voor beloningen en het verificatiebeleid vast.

**Antwoord**

Martijn (ronde 3): de jongens voeren hun cijfers zelf in, zonder ouderverificatie. Magister is voorlopig niet nodig; wel blijven onderzoeken voor een toekomstige geautoriseerde koppeling.

**Verwerkt in**

Cijfers › Invoeren met eventlog (correcties, verwijderingen, geschiedenis), status "zelf ingevoerd", dubbele-invoercontrole. Onderzoek Magister/Somtoday: docs/onderzoek/ECHTE_DATA_V2.md (partnerroute nu NO-GO; eigen CSV-sjabloon GO).

### V-005 — Verwerkingsverantwoordelijke en DPIA

status: open
gesteld_door: claude
datum: 2026-10-25

**Vraag**

Wie wordt verwerkingsverantwoordelijke voor de persoonsgegevens: jij privé, Denckh, of een andere partij? En ga je akkoord dat er vóór elke livegang met echte kinderen een DPIA en een juridische check komen?

**Waarom nodig**

Kinderen onder 16, schoolprestaties en scoring: de AP-lijst noemt "prestaties van leerlingen" letterlijk als DPIA-plichtig. Zonder verantwoordelijke en DPIA geen productie.

**Antwoord**

Nog niet beantwoord.

**Verwerkt in**

Nog niet verwerkt.

### V-006 — Cloudflare-omgeving voor test en productie

status: open
gesteld_door: claude
datum: 2026-10-25

**Vraag**

Mag ik in fase 5 op jouw bestaande Cloudflare-account een aparte testomgeving aanmaken? Het gaat om een Worker, een D1-database en Durable Objects, met jurisdictie `eu` en op het Free-plan, dus €0. Workers Paid (ca. $5 per maand) vraag ik pas als het nodig is.

**Waarom nodig**

Multiplayer moet echt met meerdere accounts getest worden. Nieuwe resources aanmaken op je account wil ik niet zonder akkoord doen.

**Antwoord**

Nog niet beantwoord.

**Verwerkt in**

Nog niet verwerkt.

### V-007 — Minimumleeftijd

status: open
gesteld_door: claude
datum: 2026-10-25

**Vraag**

Laten we kinderen van 10–12 jaar toe, alleen via een ouder-account? Of begint versie 1 bij 13 jaar?

**Waarom nodig**

Dit bepaalt de inrichting van toestemming en ouderfuncties. Het KIDS Act-voorstel wil voor kinderen onder 13 extra ouderlijke controle.

**Antwoord**

Nog niet beantwoord.

**Verwerkt in**

Nog niet verwerkt.

### V-008 — Namen van spelmodi (merkrisico)

status: open
gesteld_door: claude
datum: 2026-10-25

**Vraag**

Het prototype gebruikt de werktitels "Ultimate Team" en "Ultimate Draft". Deze termen liggen dicht bij de productnamen van EA (FC Ultimate Team). Ook "Ballon d'Or" en "ICON" zijn merken van derden. Mijn voorstel voor eigen namen: **"Mijn Elftal"** of **"RANK Squad"**, **"RANK Draft"**, en **"Legend"** in plaats van ICON (Legend gebruik ik al). Akkoord, of heb je andere namen?

**Waarom nodig**

Om merkconflicten te voorkomen voordat de namen in het ontwerp vastliggen.

**Antwoord**

Nog niet beantwoord.

**Verwerkt in**

Nog niet verwerkt.

### V-009 — Voorbeeldkaarten goedgekeurd: volledige catalogus vervangen?

status: verwerkt
gesteld_door: claude
datum: 2026-10-25

**Vraag**

Keur je de twee voorbeeldkaarten goed: Jesse Hoekstra (Gold) en Marco Steenhuis (Legend)? Je ziet ze in de draft-lobby, de collectie, het elftal en de walkout (preview en `docs/review/v2/`). Zo ja, dan maak ik op dezelfde manier portretten voor de hele catalogus, ongeveer 400 spelers en ca. 13 uur rekentijd in batches. Wil je eerst iets anders zien, bijvoorbeeld andere poses, meer variatie of een andere belichting?

**Waarom nodig**

Martijn wil de twee voorbeeldkaarten eerst zien voordat de volledige catalogus wordt vervangen.

**Antwoord**

Martijn (ronde 3): ja, alle gezichten consistent fotorealistisch.

**Verwerkt in**

Batch voor de hele vaste catalogus (200 spelers + 8 legends + S01) loopt; zie HANDOFF.md voor de stand.

### V-010 — AI-portretten en AI-vermelding

status: open
gesteld_door: claude
datum: 2026-10-25

**Vraag**

Ga je akkoord met AI-gegenereerde portretten van fictieve personen onder deze voorwaarden?

1. Alleen modellen onder Apache 2.0, nu FLUX.2 [klein] 4B.
2. Een gelijkeniscontrole per portret.
3. Een klein "AI"-label op de kaart.

Wil je het label zichtbaar houden, of alleen vermelden in de kaartdetails en de voorwaarden?

**Waarom nodig**

AI-output is juridisch het minst riskante pad naar fotorealisme. Een vermelding is goedkoop en sluit aan bij de transparantielijn van de AI Act en het KIDS Act-voorstel. Waar het label staat, is een ontwerpkeuze.

**Antwoord**

Nog niet beantwoord.

**Verwerkt in**

Nog niet verwerkt.

### V-011 — Kaartbeloningen voor leerlingen die moeite hebben

status: open
gesteld_door: claude
datum: 2026-10-26

**Vraag**

De economiesimulatie (`docs/SIMULATIES.md`) laat zien dat een leerling die rond een 5,6 staat ongeveer 0,13 draft-vouchers per week krijgt, tegenover 2,19 voor een leerling rond de 8,0. XP voor vooruitgang werkt wel, maar de kaartbeloningen zijn sterk gekoppeld aan hoge cijfers. Kies een richting:

- (A) laten zoals het is;
- (B) een vaste kaartbeloning voor vooruitgang, bijvoorbeeld een Goudpack bij +0,5 op een vakgemiddelde;
- (C) vouchers ook voor bereikte persoonlijke doelen en herstel na een onvoldoende.

**Waarom nodig**

Dit is een ontwerpkeuze over eerlijkheid en motivatie, geen technische keuze. Het raakt de hele economie.

**Antwoord**

Nog niet beantwoord.

**Verwerkt in**

Nog niet verwerkt.

### V-012 — Koppeling met de leeromgeving (RANK Academy)

status: open
gesteld_door: claude
datum: 2026-10-26

**Vraag**

Wil je de koppeling met leren.martijndenbesten.com? Zo ja, beantwoord dan de deelvragen V-L1 t/m V-L9 uit `docs/onderzoek/LEEROMGEVING.md`, §"Open vragen". Daar staan onder meer: de leeromgeving uitbreiden met een ondertekende webhook, of een oefentoets als cijfer telt, welke pogingen beloond worden, de bewaartermijn, en of ik de broncode mag inzien.

**Waarom nodig**

De leeromgeving heeft geen API. Zonder uitbreiding aan die kant is er geen veilige bron. Ik heb de site alleen gelezen en niets gewijzigd. De Academy werkt nu alleen met de interne oefenmodule.

**Antwoord**

Nog niet beantwoord.

**Verwerkt in**

Nog niet verwerkt.

### V-013 — Startelftal voor nieuwe accounts

status: open
gesteld_door: claude
datum: 2026-10-26

**Vraag**

Mag een nieuw account eenmalig 11 brons- en zilverkaarten krijgen (één per plek), zodat het meteen kan battlen? Dit staat niet in het GDD. De server doet het nu zo.

**Waarom nodig**

Zonder startkaarten kan een nieuwe speler pas meedoen aan de competitie als hij een aantal cijfers heeft ingevoerd.

**Antwoord**

Nog niet beantwoord.

**Verwerkt in**

Nog niet verwerkt.

### V-014 — Niet reageren op een uitdaging

status: open
gesteld_door: claude
datum: 2026-10-26

**Vraag**

Een competitiewedstrijd die de uitgedaagde niet vóór de deadline accepteert, telt nu als reglementair verlies (3-0). Doet niemand iets, dan verliezen beiden. Is dat goed? Het alternatief is dat de wedstrijd vervalt en niet meetelt.

**Waarom nodig**

Het gaat om strengheid tegenover kinderen die een paar dagen niet in de app kijken. De keuze is instelbaar per competitie (`unplayedRule`), maar er moet een standaard zijn.

**Antwoord**

Nog niet beantwoord.

**Verwerkt in**

Nog niet verwerkt.

### V-015 — Transfermarkt aan of uit

status: open
gesteld_door: claude
datum: 2026-10-26

**Vraag**

De transfermarkt-engine is klaar en veilig opgezet: alleen spelcoins, vaste prijsband, geen chat of ruil, afkoelperiode en daglimieten. Moet de markt per pool standaard **uit** staan, zodat de beheerder hem bewust aanzet? Of standaard aan?

**Waarom nodig**

Handelen tussen kinderen kan sociale druk geven ("geef mij die kaart"). Dit is een pedagogische keuze.

**Antwoord**

Nog niet beantwoord.

**Verwerkt in**

Nog niet verwerkt.

### V-016 — Minimale oefentijd in de Academy

status: open
gesteld_door: claude
datum: 2026-10-26

**Vraag**

Een oefening levert alleen XP op als er minstens 8 seconden per vraag is besteed. Voor eenvoudige vragen (woordjes, tafels) kan dat te streng zijn. Wil je 8 seconden houden, verlagen naar bijvoorbeeld 4, of laten afhangen van het soort vraag?

**Waarom nodig**

Te streng ontmoedigt; te soepel maakt doorklikken voor XP mogelijk. De instelling staat in `DEFAULT_MOTIVATION_CONFIG.academy.minSecondsPerQuestion`.

**Antwoord**

Nog niet beantwoord.

**Verwerkt in**

Nog niet verwerkt.
