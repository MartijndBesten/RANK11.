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

status: open
gesteld_door: claude
datum: 2026-10-25

**Vraag**

Keur je de visuele richting van de vier prototypeschermen goed? Het gaat om de Cijferkluis-onthulling, de pack-opening met walkout, de Ultimate Draft en de elftalbouwer. Zie de preview en `docs/review/`. Mag ik op basis daarvan aan stap 5 beginnen (backend en functionele releases R1–R8)? Of wil je eerst aanpassingen? Noem dan wat je anders wilt.

**Waarom nodig**

De masteropdracht zegt dat ik pas na jouw goedkeuring de volledige backend en alle gamefuncties bouw.

**Antwoord**

Nog niet beantwoord.

**Verwerkt in**

Nog niet verwerkt.

### V-002 — Portretstijl van de spelers

status: open
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

Nog niet beantwoord.

**Verwerkt in**

Nog niet verwerkt.

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

status: open
gesteld_door: claude
datum: 2026-10-25

**Vraag**

Ga je akkoord dat versie 1 werkt met handmatige invoer door de leerling, met optionele bevestiging door een ouder, en zonder Magister-koppeling? Magister verbiedt API-gebruik door niet-geautoriseerde partijen. Het partnerprogramma vraagt een KvK-inschrijving, een verwerkersovereenkomst en een relatie met de school. Wil je dat partnertraject later toch verkennen, bijvoorbeeld via Denckh?

**Waarom nodig**

Een onofficiële koppeling valt af. Dit legt de bron voor beloningen en het verificatiebeleid vast.

**Antwoord**

Nog niet beantwoord.

**Verwerkt in**

Nog niet verwerkt.

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

status: open
gesteld_door: claude
datum: 2026-10-25

**Vraag**

Keur je de twee voorbeeldkaarten goed: Jesse Hoekstra (Gold) en Marco Steenhuis (Legend)? Je ziet ze in de draft-lobby, de collectie, het elftal en de walkout (preview en `docs/review/v2/`). Zo ja, dan maak ik op dezelfde manier portretten voor de hele catalogus, ongeveer 400 spelers en ca. 13 uur rekentijd in batches. Wil je eerst iets anders zien, bijvoorbeeld andere poses, meer variatie of een andere belichting?

**Waarom nodig**

Martijn wil de twee voorbeeldkaarten eerst zien voordat de volledige catalogus wordt vervangen.

**Antwoord**

Nog niet beantwoord.

**Verwerkt in**

Nog niet verwerkt.

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
