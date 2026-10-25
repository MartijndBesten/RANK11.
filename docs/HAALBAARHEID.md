# RANK11. — Haalbaarheid (stap 1)

**Datum:** 25 oktober 2026 · **Status:** onderzoek afgerond, besluiten open (zie `VRAGEN.md`)
**Onderbouwing:** [onderzoek/BRONNENONDERZOEK.md](onderzoek/BRONNENONDERZOEK.md) (bronnen met URL en datum, labels VASTGESTELD / WAARSCHIJNLIJK / ONZEKER).
**Zelf nagecontroleerd (25-10-2026):** het API-verbod in de Magister-voorwaarden (letterlijk op magister.nl/voorwaarden) en het bestaan van het EU KIDS Act-voorstel van 17-09-2026 (meerdere onafhankelijke nieuwsbronnen). De overige claims komen uit het bronnenonderzoek en zijn niet allemaal opnieuw gecontroleerd.

> Dit is geen juridisch advies. Waar het om minderjarigen, persoonsgegevens en merken gaat, is een toets door een jurist vóór livegang verstandig.

## Overzicht

| # | Onderdeel | Advies | Kern |
|---|---|---|---|
| 1 | Game zonder Magister (handmatige invoer) | **GO** | Volledig te bouwen; de cijferbron is verwisselbaar opgezet. |
| 2 | Invoer met bevestiging door een gemachtigde (ouder) | **GO** | Bevestigde cijfers krijgen status `verified`; beleid per pool. |
| 3 | Officiële Magister-koppeling | **NO-GO (nu)** | Magister verbiedt API-gebruik door niet-geautoriseerde partijen. Het partnerprogramma vraagt een KvK-inschrijving, een verwerkersovereenkomst en een relatie met de school. Dat past niet bij een privéproject. |
| 4 | Onofficiële koppeling of scraping | **NO-GO** | Strijdig met de voorwaarden, en er zouden wachtwoorden van kinderen bewaard moeten worden. |
| 5 | Echte voetballers (namen, foto's, ratings), echte clubs en logo's | **NO-GO zonder licentie** (verdiept in [onderzoek/ECHTE_SPELERS.md](onderzoek/ECHTE_SPELERS.md), 25-10-2026) | Portretrecht: herkenbaarheid volstaat al (Davids/Riot, 2017). Clublogo's zijn merken. Ratings van EA of Transfermarkt overnemen raakt databank- en auteursrecht. |
| 6 | Fictieve spelers en clubs | **GO** | Zo is het prototype gebouwd. De catalogus is verwisselbaar voor een latere licentie. Fotorealistische AI-portretten: **CONDITIONELE GO** (Apache-2.0-model, gelijkeniscontrole, AI-vermelding; zie [portretten/README.md](portretten/README.md)). |
| 7 | Packs, coins en transfermarkt zonder echt geld | **CONDITIONELE GO** | Nooit echt geld, geen prijzen uit de echte wereld, geen handel buiten het spel, kansen tonen. Geen streaks en geen straf bij wegblijven (KIDS Act-voorstel art. 9). |
| 8 | AVG/UAVG minderjarigen | **CONDITIONELE GO** | Onder 16 jaar is toestemming van een ouder nodig. Een DPIA is in de praktijk vereist (AP-lijst nr. 15 noemt "prestaties van leerlingen"). Wie verwerkingsverantwoordelijke is, moet nog besloten worden. |
| 9 | Server-authoritative realtime battles | **GO (technisch)** | Cloudflare Durable Objects: één object per wedstrijd, WebSockets met hibernation, atomaire opslag. |
| 10 | Atomaire economie (transfermarkt, packs) | **GO (technisch)** | Durable Object per speler of markt (single-threaded, `transactionSync`), plus D1-batches die als geheel slagen of falen. |
| 11 | Hosting in de EU | **CONDITIONELE GO** | D1, Durable Objects en R2 kunnen met jurisdictie `eu` draaien. Logs en het verwerkersbeleid van Cloudflare moeten nog worden nagelopen voor de DPIA. |
| 12 | Kosten | **GO** | Prototype en kleine pools passen in het Free-plan (limieten geven een fout, geen rekening). Workers Paid (ca. $5 per maand) pas bij groei; vooraf toestemming nodig. |
| 13 | Inloggen zonder contactgegevens van kinderen | **GO** | Ouder-account met magic link. Het kind krijgt een profiel met bijnaam, koppelt een apparaat via een code en logt in met een passkey (terugval: pincode met rate limiting). |
| 14 | PWA op iPhone | **CONDITIONELE GO** | Installeerbaar via "Zet op beginscherm". Web Push werkt op iOS alleen na installatie (iOS 16.4+). Geluid start pas na een tik. Safari wist lokale opslag na 7 dagen zonder bezoek, dus alles wat ertoe doet hoort op de server. |
| 15 | Merknamen "Ultimate Team", "Ballon d'Or", "ICON", "FC" | **Risico** | Dit zijn merken of herkenbare productnamen van derden. Het prototype gebruikt "Ultimate Team" en "Ultimate Draft" nog als werktitels; voorstel om dat te vervangen staat in V-008. |

## Wat dit betekent voor de bouw

- **Cijferbron als adapter** (`manual` → `confirmed` → later `magister`). Iedere toets krijgt een ontdubbelsleutel, zodat een latere koppeling nooit dubbele beloningen geeft. Dat staat al in de engine (`gradeKey`).
- **Fictieve catalogus** met verwisselbare bron. Er staan geen echte namen, foto's, clubs of logo's in de repository.
- **Privacy by design:**
  - schoolcijfers zijn alleen zichtbaar voor de leerling zelf (en eventueel de ouder);
  - pools zien alleen spelresultaten en, als de pool dat instelt, verbetering in procenten;
  - geen chat met onbekenden, alleen privépools via een uitnodigingscode;
  - vaste bewaartermijnen, plus export en verwijdering.
- **Beloningen zijn deterministisch en versioned** (de engine is klaar). Er worden geen betaalde items gebouwd.
- **Realtime later, niet in het prototype.** De battles worden gebouwd op Durable Objects in fase 5.

## Belangrijkste onzekerheden

1. Is een gratis privégame een "dienst van de informatiemaatschappij"? Dat bepaalt of de DSA, de KIDS Act en art. 8 AVG van toepassing zijn. Ouderlijke toestemming onder 16 jaar blijft via art. 5 UAVG sowieso nodig.
2. Mogen namen van echte spelers zonder foto's gebruikt worden? Er is geen Nederlandse rechtspraak gevonden voor gratis hobbygames. Advies: niet doen zonder licentie.
3. Hoe werkt de extensie "Magister Ultimate Team" technisch, en valt uitlezen in de eigen browser onder het API-verbod? Dat is niet vastgesteld en daarom ook geen route voor RANK11.
4. Toekomstige regels voor gratis variabele beloningen: de Digital Fairness Act (verwacht november 2026) en de gedragscodes onder de KIDS Act.
5. De details van het Cloudflare Free-plan voor Durable Objects en EU-residentie van logs.
