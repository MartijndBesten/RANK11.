# RANK11. — Onderzoek koppeling met de leeromgeving (leren.martijndenbesten.com)

- **Status:** voorbereidend onderzoek, alleen gelezen. Er is niets gewijzigd aan de leeromgeving, aan de repo `Overig` of aan andere repo's. Er is niet ingelogd en er zijn geen formulieren verstuurd. Niet-publieke paden (`/k/…`, `/ouder…`) zijn niet aangeroepen.
- **Opdrachtdatum:** 26-10-2026. De website is geraadpleegd op 25-10-2026 om 21:32 UTC (`date`-header van de server).
- **Labels:** **VASTGESTELD** (staat zo in de genoemde bron), **AFGELEID** (redelijke conclusie, niet letterlijk bevestigd), **ONBEKEND** (niet vast te stellen zonder de broncode of een besluit van de eigenaar).
- **Gegevensbeleid:** dit document bevat geen namen, tokens, sleutels of andere persoonsgegevens.

## 1. Bronnen

| # | Bron | Versie/datum |
|---|---|---|
| S1 | Workbench `bibliotheek/BOUWSTENEN.md`, kaart **B103** (oefen- en toetsengine) | `origin/main`, versie 37 (24-10-2026). Kaart verwijst naar `Overig` commit `24b7bb7` |
| S2 | Idem, kaart **B104** (persoonlijke app-links, Worker + D1 + R2) | idem |
| S3 | Idem, kaart **B105** (werkwijze boekfoto's → leerpakket) | idem |
| S4 | Idem, kaart **B99**, aanvulling 24-10-2026 (leerplatform, cloudsessie) | idem |
| S5 | Workbench `REPOSITORIES.md` (regel Overig) en `audit/BOUWSTENEN_RISICOREGISTER.md` (**R22**) | `origin/main` |
| S6 | Publieke pagina `https://leren.martijndenbesten.com/` (HTML en responseheaders) en `/robots.txt` | 25-10-2026 21:32 UTC |
| S7 | RANK11. `packages/engine/src/grades.ts` (`GradeSource`, `gradeKey`), `docs/ARCHITECTUUR.md` | werkkopie 26-10-2026 |

De broncode zelf (repo `MartijndBesten/Overig`, branch `claude/linkedin-header-trilux-deegh-denckh-i55t2s`, map `leerplatform/`) is **niet** gelezen. Dat viel buiten de opdracht. Alles over de interne werking komt daarom uit de bouwsteenkaarten. Die kaarten zijn samenvattingen en geen specificaties.

## 2. Bevindingen

### 2.1 Techniek

| Onderwerp | Bevinding | Label | Bron |
|---|---|---|---|
| Hosting | Cloudflare Worker. De responseheader is `server: cloudflare`. De kaart noemt `leerplatform/worker/index.js` met routes, ouderpagina en upload | VASTGESTELD | S2, S6 |
| Database | Cloudflare D1, binding `DB`, schema in `worker/schema.sql` | VASTGESTELD | S2 |
| Bestanden | Cloudflare R2, binding `FILES`. Daarin staan `pdf/<gebruiker>/…` (PDF's per gebruiker) en `uploads/<batch>/…` (boekfoto's) | VASTGESTELD | S2 |
| Geheimen | `PARENT_KEY` is een Cloudflare-secret (`secret_text`, behouden met `keep_bindings`) | VASTGESTELD | S2, S4 |
| KV / Queues / Durable Objects / cron | Worden niet genoemd. Het is onbekend of de Worker een cron trigger heeft | ONBEKEND | — |
| Uitrol | `scripts/deploy.sh` via de Cloudflare-API. Het eigen domein is via het dashboard gekoppeld | VASTGESTELD | S2, S4 |
| Inhoud in de Worker | De app (`app.html`) serveert per gebruiker "alleen de eigen inhoud ingebed". Iconen en de makersignatuur staan als base64 in de Worker (`build.py`) | VASTGESTELD | S2 |
| Testsuite | Er is geen geautomatiseerde testsuite. Op 24-10-2026 is live gecontroleerd met Playwright | VASTGESTELD | S1, S2 |

### 2.2 Accounts en identiteit per gezinslid

- **VASTGESTELD (S2):** er zijn geen accounts en geen wachtwoorden. Per gebruiker is er een D1-rij met naam, kleur en een willekeurig token van minimaal 12 tekens (`secrets.token_urlsafe`). De app staat op `/k/<token>/`, met een manifest en serviceworker per gebruiker onder hetzelfde pad. Een ander token krijgt 404.
- **VASTGESTELD (S2):** beheer verloopt via `/ouder?key=…` met de secret `PARENT_KEY`. Een verkeerde of ontbrekende sleutel geeft 403. Op de ouderpagina staan per gebruiker de link en QR-code, de voortgang, de fouten, de PDF's, naam en klas wijzigen, hoofdstuk verbergen en foto-upload.
- **VASTGESTELD (S5, R22, middel):** de sleutels staan in de URL. Ze blijven in de browsergeschiedenis en kunnen worden doorgestuurd. De database bevat voornamen en antwoorden van minderjarigen. Nog open: `/ouder*` achter Cloudflare Access (B58), de sleutel periodiek vernieuwen en een bewaartermijn instellen. Besluit van de eigenaar op 24-10-2026: akkoord om door te werken. Dat vervangt geen AVG-plicht.
- **AFGELEID:** het token is tegelijk identiteit en geheim. Het is daarom ongeschikt als `externalUserId` richting RANK11.

### 2.3 Opslag van toetsresultaten en foutenlogboek

- **VASTGESTELD (S2):** "Resultaten gaan als events naar D1 met de gebruiker uit het token, nooit uit de client."
- **VASTGESTELD (S1):** er is een toetsuitslag per paragraaf met advies onder 70%. Het tabblad *Mijn fouten* toont fouten per skill, terugkerende foutpatronen en "eerder fout, nu goed". De ouderpagina toont fouten met bronverwijzing (boekpagina of opdracht).
- **ONBEKEND:** de tabel- en kolomnamen, het eventformaat (per vraag of per toets) en of er een poging-ID is. Ook onbekend is of een event een tijdstempel voor start en einde heeft, en of een herkansing een nieuw event of een overschrijving is. Er is geen bewaartermijn vastgesteld (S5).

### 2.4 Inhoudsformaat en ID's

- **VASTGESTELD (S1):** per hoofdstuk is er één `hoofdstuk.json` in `leerplatform/hoofdstukken/<kind>/<hoofdstuk>/`, volgens het schema `docs/hoofdstuk-schema.md`. `controleer.js` controleert onder meer **ids**, punten, skills, figuren en verwijzingen.
- **VASTGESTELD (S1):** de vraagtypen zijn `mc`, `multi`, `tf`, `match`, `num` en `open`. Bij `open` beoordeelt de leerling zichzelf, met aanpasbare punten. Elke vraag hoort bij een *skill* met boekpagina's. Elk hoofdstuk heeft twee oefentoetsen met correctiemodel (PDF). Alleen natuurkunde is getest.
- **AFGELEID:** vragen hebben ID's binnen een hoofdstuk. Het mappad bevat een gebruikersaanduiding (`<kind>`). Een activity-ID dat van dat pad is afgeleid, zou dus een persoonsaanduiding bevatten. Dat moet vermeden worden.
- **ONBEKEND:** of toetsen (toets 1 en 2) en hoofdstukken een eigen, stabiel ID hebben dat niet verandert bij herschrijven. Ook onbekend is of er een inhoudsversie of hash is, en of hetzelfde hoofdstuk voor meerdere kinderen één ID deelt.

### 2.5 Publieke website (S6)

- **VASTGESTELD:** `/` geeft een statische pagina van 1,5 kB met de titel "Leren" en de tekst "Open de persoonlijke link die je van je ouder hebt gekregen. Daar staan jouw hoofdstukken, samenvattingen en oefentoetsen." Er staat een makercredit "Gemaakt door denckh." (link naar denckh.nl). Er zijn geen scripts, formulieren, links naar vakken of toetsen, en geen API-paden in de HTML. Externe bron: alleen Google Fonts.
- **VASTGESTELD:** de headers zijn `x-robots-tag: noindex`, `referrer-policy: no-referrer`, `cache-control: no-store`, `x-frame-options: DENY` en `x-content-type-options: nosniff`.
- **VASTGESTELD:** `/robots.txt` bevat alleen commentaar (de standaardtekst van Cloudflare over content signals). Er staan geen `Disallow`-regels en geen actieve `Content-Signal`-regel in.
- **VASTGESTELD:** er is geen login. Toegang gaat alleen via de persoonlijke link. Vakken, onderwerpen en toetsen zijn **publiek niet zichtbaar**.
- **ONBEKEND:** hoe de URL van een oefentoets eruitziet. Het is onbekend of er een deeplink per toets bestaat of dat de toets binnen de single-page-app op `/k/<token>/` draait. Er zijn geen publieke API-paden gevonden.

### 2.6 Bestaande API's en webhooks

- **VASTGESTELD:** de kaarten noemen alleen de routes `/k/<token>/` (app, manifest, serviceworker, inhoud, PDF's), `/ouder?key=…` en een upload-`POST` vanaf de ouderpagina naar de Worker (S2).
- **ONBEKEND / niet aangetroffen:** een publieke of server-to-server API, een uitgaande webhook, een exportfunctie of een koppeling met andere systemen.

### 2.7 Aansluiting op RANK11. (S7)

- `GradeSource = 'manual' | 'confirmed' | 'magister'`. `gradeKey()` gebruikt `ext:<source>:<externalRef>` zodra er een externe referentie is. Een bron `leren` past daarom in het bestaande adapterpatroon, zonder dubbele beloningen.
- De RANK11-API is gepland op Cloudflare Workers + D1 (B57). Dat is dezelfde techniek als de leeromgeving, en B23 (`hmac`, `safeEqual`, `signPayload`/`verifyPayload`) en B56 (koppelcode) zijn aan beide kanten bruikbaar.
- **Inhoudelijk verschil:** de leeromgeving levert **oefentoetsen** met punten (deels zelfbeoordeeld). Dat zijn geen schoolcijfers. Ze mogen niet als `Grade` meetellen in gemiddelden zonder besluit (zie V-L3).

## 3. Koppelingsvoorstel (ontwerp, niet gebouwd)

### 3.1 Uitgangspunten

1. **Server-to-server, push vanuit de leeromgeving.** Er is geen code in de browser van het kind en het URL-token gaat nooit naar RANK11.
2. **Minimale gegevens:** alleen totalen per afgeronde activiteit. Geen antwoorden, vraagteksten, foutdetails, namen, klas of boekfoto's.
3. **Expliciete koppeling door de ouder.** Er wordt nooit automatisch gematcht op naam.
4. **Idempotent aan beide kanten.** Opnieuw versturen mag altijd en levert nooit dubbele beloningen op.
5. **Ontkoppelen kan aan beide kanten.** Daarna worden geen events meer geaccepteerd.

### 3.2 Minimale toevoegingen aan de leeromgeving

| # | Toevoeging | Waarom |
|---|---|---|
| L1 | Stabiel `activityId` per oefentoets (en optioneel per hoofdstuk) in `hoofdstuk.json`, zonder kindnaam, bijvoorbeeld `nat-h3-toets1` of een UUID. `controleer.js` controleert dat het uniek is en blijft (vergelijken met de vorige versie) | Ontdubbeling en zinvolle beloning per toets. §2.4 laat zien dat dit ONBEKEND is |
| L2 | `contentVersion` (hash van de toetsvragen) in elk event | Een herschreven toets is te herkennen zonder dat het ID verandert |
| L3 | Kolom `external_id` per gebruiker: een willekeurig pseudoniem (`u_` + 128 bit), los van het URL-token en roteerbaar | `externalUserId` zonder geheim en zonder naam |
| L4 | Tabellen `koppelcodes` (hash, gebruiker, verloopt, gebruikt_op) en `koppelingen` (provider, gebruiker, status, gekoppeld_op, ontkoppeld_op) | Accountkoppeling via een eenmalige code (B56-patroon) |
| L5 | Knoppen op de ouderpagina: "Koppel met RANK11" (toont een code van 8 tekens, 10 minuten geldig) en "Ontkoppelen" | De ouder beslist, niet het kind |
| L6 | Tabel `outbox` (event_id, payload, pogingen, volgende_poging, status). Een rij wordt geschreven in dezelfde D1-batch als het resultaat-event, alleen als er een actieve koppeling is | Geen verlies bij een storing van RANK11, en geen dubbel versturen |
| L7 | Versturen via een Worker-cron (bijvoorbeeld elke 5 minuten) of `ctx.waitUntil` direct na afronden, met cron als vangnet. Backoff tot 24 uur, daarna status `mislukt`, zichtbaar op de ouderpagina | Betrouwbare aflevering zonder Queues (betaald). Het bestaan van een cron is ONBEKEND |
| L8 | Secret `RANK11_WEBHOOK_SECRET` (`secret_text`) en de doel-URL als configuratie | HMAC-ondertekening |
| L9 | Eén server-to-server-endpoint `POST /api/koppel/inwisselen` (ondertekend, rate-limited) | RANK11 wisselt de code in voor `externalUserId` |

### 3.3 Accountkoppeling (eenmalige koppelcode)

1. De ouder opent op de ouderpagina "Koppel met RANK11" bij het juiste kind. De leeromgeving maakt een code van 8 tekens zonder verwarrende tekens, slaat alleen de SHA-256 op, en de code is 10 minuten en één keer geldig.
2. De ouder logt in RANK11 in op het **ouderaccount** (magic link, zie `HAALBAARHEID.md` #13), kiest het kindprofiel en voert de code in.
3. De RANK11-backend roept L9 aan met de ondertekende body `{code, rank11ProfileRef}`. Het antwoord is `{externalUserId, displayHint}`. `displayHint` is alleen de profielkleur of een initiaal, geen naam.
4. RANK11 toont ter bevestiging "Koppelen aan leerprofiel [kleur/initiaal] → RANK11-speler [bijnaam]?". Pas na bevestiging volgt een tweede ondertekende call `bevestig`. De leeromgeving zet de koppeling dan op actief en stuurt vanaf dat moment events.
5. Database-eisen in RANK11: `UNIQUE(providerId, externalUserId)` en `UNIQUE(profileId, providerId)`. Daarmee hoort één leerprofiel bij precies één speler en omgekeerd.

**Verkeerde koppelingen voorkomen:** de code wordt alleen op de ouderpagina gemaakt en alleen in het ouderaccount ingevoerd. De code is kort geldig, eenmalig en rate-limited (bijvoorbeeld 5 pogingen per uur per ouderaccount). Er is een bevestigingsstap met een zichtbare hint. Er geldt een 1-op-1-uniekheid. Een event voor een onbekende of ontkoppelde `externalUserId` wordt geweigerd (`410 Gone`, niet opnieuw proberen) en gelogd zonder inhoud. Bij ontkoppelen worden reeds toegekende beloningen niet teruggedraaid (besluit V-L6).

### 3.4 Eventmodel (v1)

```json
{
  "schemaVersion": 1,
  "eventId": "8f0c…-uuid-v4",
  "providerId": "leren.martijndenbesten.com",
  "externalUserId": "u_3k9…",
  "activityId": "nat-h3-toets1",
  "contentVersion": "sha256:ab12…",
  "attemptNo": 2,
  "subject": "natuurkunde",
  "topic": "H3 Elektriciteit",
  "activityType": "oefentoets",
  "startedAt": "2026-10-26T15:02:11Z",
  "completedAt": "2026-10-26T15:31:40Z",
  "questionCount": 18,
  "correctCount": 14,
  "selfAssessedCount": 2,
  "pointsEarned": 31,
  "pointsMax": 40,
  "score": 0.775,
  "status": "completed",
  "sentAt": "2026-10-26T15:31:42Z"
}
```

- `activityType`: `oefentoets` | `oefenen` | `paragraaf` (de lijst stelt de eigenaar vast).
- `status`: `completed` | `abandoned` | `voided`. `voided` trekt een eerder event in via `voidsEventId`.
- `score = pointsEarned / pointsMax` (0–1). `correctCount` telt alleen de automatisch nagekeken vragen die volledig goed zijn. Zelfbeoordeelde vragen tellen apart in `selfAssessedCount`.
- `subject`/`topic` zijn weergavetekst. RANK11 koppelt `subject` aan een eigen `subjectId` via een vaste mapping.
- Tijden in UTC (ISO 8601). Een `completedAt` die meer dan 7 dagen oud is of in de toekomst ligt, wordt geweigerd of gemarkeerd.

### 3.5 Transport en handtekening

- `POST https://<rank11-api>/v1/providers/leren/events`, `Content-Type: application/json`, maximaal 16 kB, één event per request (eenvoudig en idempotent).
- Headers: `X-Leren-Timestamp: <unix-seconden>`, `X-Leren-Event-Id: <eventId>` en `X-Leren-Signature: v1=<hex(HMAC-SHA256(secret, timestamp + "." + rawBody))>`.
- RANK11 controleert de handtekening over de **ruwe body**, met `safeEqual` (B23, constant-time; vgl. R20). Het tijdvenster is ±300 s. Daarna volgen schemavalidatie (onbekende velden negeren, verplichte velden afdwingen) en de controle dat de `externalUserId` actief gekoppeld is.
- Antwoorden: `200` verwerkt, `200 {"duplicate":true}` al bekend, `400` ongeldig (niet opnieuw proberen), `401` handtekening of tijd fout, `410` niet of niet meer gekoppeld, `429`/`5xx` later opnieuw proberen.
- Secret-rotatie: RANK11 accepteert tijdelijk twee secrets (`v1=` met de huidige of de vorige sleutel).
- Alternatief (minder voorkeur): RANK11 haalt events op via `GET /api/events?since=<cursor>` met een bearer-token. Dat is eenvoudiger bij de bron, maar vraagt polling en een tweede geheim in RANK11.

### 3.6 Dubbele events voorkomen

1. **Transportniveau:** `UNIQUE(providerId, eventId)` in een RANK11-tabel `provider_events`. Een herhaling geeft 200 zonder effect.
2. **Inhoudsniveau:** `UNIQUE(providerId, externalUserId, activityId, attemptNo)`. Dit vangt een bron die bij een fout een nieuw `eventId` maakt voor dezelfde poging.
3. **Beloningsniveau:** `gradeKey`-achtige sleutel `ext:leren:<externalUserId>:<activityId>`. Of per activiteit alleen de eerste, de beste of elke poging beloond wordt, is besluit V-L4. Het event wordt altijd opgeslagen, de beloning hooguit één keer volgens die regel.
4. **Bron:** de outbox-rij wordt atomair met het resultaat geschreven. Na `200` of een duplicate gaat de status op `afgeleverd`.

### 3.7 Misbruik en privacy

- Het URL-token (R22) betekent dat iedereen met de link toetsen kan maken namens het kind. Beperk beloningen per dag en per activiteit, beloon niet voor `abandoned`, en overweeg alleen `oefentoets` te belonen (V-L5).
- RANK11 slaat alleen de velden van §3.4 op, met een bewaartermijn die gelijk loopt met de cijfers (V-L7). Er worden geen vrije teksten uit de leeromgeving getoond aan andere spelers. De gedeelde zichtbaarheid volgt de RANK11-regels voor cijfers (alleen de leerling en de ouder).
- Beide systemen verwerken schoolprestaties van minderjarigen. De koppeling hoort in de DPIA en het verwerkingsregister van RANK11 (zie `HAALBAARHEID.md` #8).

### 3.8 Benodigd aan de RANK11-kant (later, na goedkeuring)

`GradeSource` of een aparte bron `leren` (V-L3), de tabellen `provider_links` en `provider_events`, het endpoint uit §3.5, het koppelscherm in het ouderaccount, tests (handtekening, tijdvenster, duplicaat, 1-op-1, ontkoppeld, onbekend veld) en een D1-testshim (B57).

## 4. Wat ONBEKEND is (vastleggen vóór bouw)

1. Het huidige eventformaat en schema in D1 (tabellen, kolommen, per vraag of per toets, poging-ID, tijdstempels).
2. Of toetsen en hoofdstukken nu al stabiele ID's hebben die niet afhangen van het pad `hoofdstukken/<kind>/…`.
3. De URL-structuur van een oefentoets binnen `/k/<token>/` (deeplink of single-page-app-staat).
4. Of de Worker een cron trigger, Queues of KV gebruikt.
5. Hoe herkansingen en wijzigingen in een toets nu worden opgeslagen.
6. Welke vakken er naast natuurkunde actief zijn. Publiek is dit niet zichtbaar.
7. Of het eigen domein `martijndenbesten.com` automatisch verlengd wordt (open punt bij R22).

## 5. Open vragen voor de eigenaar

| # | Vraag | Waarom nodig |
|---|---|---|
| V-L1 | Wil je deze koppeling, en mag de leeromgeving daarvoor worden uitgebreid met L1–L9? | Zonder uitbreiding is er geen veilige bron: er is geen API, en scraping of het URL-token gebruiken valt af |
| V-L2 | Push (webhook, voorkeur) of pull (RANK11 haalt op)? | Bepaalt welke kant het geheim, de cron en de retry-logica beheert |
| V-L3 | Telt een oefentoets als "cijfer" (`Grade`) of als een aparte beloningsbron (alleen XP/coins, niet in gemiddelden)? | De RANK11-economie is gebouwd op schoolcijfers. Een oefentoets is zelfgekozen en deels zelfbeoordeeld |
| V-L4 | Wordt per toets de eerste, de beste of elke poging beloond, met welk maximum per dag? | Ontdubbelregel en voorkomen dat beloningen worden opgeblazen |
| V-L5 | Welke `activityType`'s leveren iets op (oefentoets, oefenen, paragraaf)? Tellen zelfbeoordeelde punten mee? | Eerlijkheid en misbruik (R22) |
| V-L6 | Wat gebeurt er met eerder toegekende beloningen na ontkoppelen of `voided`? | Consistente economie en duidelijke uitleg aan het kind |
| V-L7 | Bewaartermijn van gekoppelde events in RANK11, en past de koppeling binnen de DPIA? | AVG voor minderjarigen (R22, `HAALBAARHEID.md` #8) |
| V-L8 | Mag ik de broncode in `Overig/leerplatform` (alleen lezen) bekijken om de punten in §4 vast te stellen? | De kaarten zijn samenvattingen. Het schema en de ID's zijn nu ONBEKEND |
| V-L9 | Komt `/ouder*` eerst achter Cloudflare Access (B58), voordat de koppelknop daar wordt geplaatst? | De koppelcode wordt op de ouderpagina gemaakt. Wie de `PARENT_KEY`-URL heeft, kan nu koppelen |
