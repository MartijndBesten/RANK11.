# RANK11. — RANK Academy en koppeling met een leeromgeving

**Stand:** 25-10-2026 · **Code:** `packages/engine/src/academy.ts`, `apps/web/src/academy/demoProvider.ts`, `apps/web/src/screens/AcademyScreen.tsx` · **Onderzoek:** `docs/onderzoek/LEEROMGEVING.md`

> **Status in één zin:** de beloningsregels, de eventvalidatie en de handtekeningcontrole zijn gebouwd en getest; in de app werkt alleen de **interne oefenmodule**. Een koppeling met leren.martijndenbesten.com is **ontworpen maar niet gebouwd en staat uit**. Aan de leeromgeving is niets gewijzigd.

## 1. Wat RANK Academy is

Een optioneel onderdeel dat XP geeft voor aantoonbare leeractiviteit: oefentoetsen, herhaling, eerder foute vragen alsnog goed. Oefenscores worden **nooit** als schoolcijfer opgeslagen en tellen niet mee in gemiddelden. De tab is uit te zetten in Instellingen; dan verdwijnt hij uit de navigatie en levert een event status `disabled` op.

## 2. Learning Provider-interface

```ts
interface LearningProvider {
  id: string;
  name: string;
  /** Verifieert een binnenkomend verzoek (handtekening, tijdvenster) en geeft de events terug. */
  receive(body: string, headers: Record<string, string | undefined>): Promise<LearningEvent[]>;
}
```

Iedere bron (de interne module, later een echte leeromgeving) levert hetzelfde eventformaat. De beloning hangt nooit af van welke bron het is.

## 3. Eventschema (versie 1)

```ts
interface LearningEvent {
  schemaVersion: 1;
  eventId: string;          // uniek per afgeronde poging
  providerId: string;
  externalUserId: string;   // pseudoniem bij de bron, nooit een naam of URL-token
  activityId: string;       // stabiel per oefening
  subjectId: string;
  topic: string;
  activityType: 'practice' | 'mock-test' | 'flashcards' | 'quiz' | 'review' | 'mistakes' | 'chapter-test' | 'exam-training';
  startedAt: string;        // ISO 8601
  completedAt: string;
  questionCount: number;
  correctCount: number;
  mistakesFixed: number;    // eerder fout, nu goed
  status: 'completed' | 'abandoned';
}
```

`validateEvent` weigert (met `AcademyEventError`):
- onbekende `schemaVersion`;
- lege tekstvelden of tekstvelden langer dan 200 tekens;
- onbekend `activityType`;
- aantallen die geen gehele getallen ≥ 0 zijn;
- `correctCount > questionCount` of `mistakesFixed > correctCount`;
- `questionCount` gelijk aan 0 of groter dan 500;
- ongeldige tijden, of afronding vóór start;
- een onbekende `status`.

## 4. Transport en handtekening (`signedProvider`)

- Alleen **server-to-server**. Events uit de browser van het kind worden nooit vertrouwd.
- Body: JSON `{ "events": [ … ] }`, maximaal 100 events per verzoek; elk event moet hetzelfde `providerId` hebben als de provider.
- Headers: `x-rank-timestamp` (unix-seconden) en `x-rank-signature` = hex van HMAC-SHA256 over `${timestamp}.${rauwe body}`.
- Tijdvenster: maximaal 300 seconden verschil met de serverklok.
- Vergelijking in constante tijd (`safeEqual`).
- **Sleutelrotatie:** `verifySignature` accepteert een lijst geheimen; tijdens een wissel staan de oude en de nieuwe sleutel er allebei in.
- Fout → "Handtekening ongeldig of verlopen."

Het onderzoeksvoorstel (`LEEROMGEVING.md` §3.5) noemde andere headernamen (`X-Leren-*`) en één event per verzoek. De engine volgt het algemenere `x-rank-*`-schema met batches; bij een echte koppeling moet één van beide definitief worden vastgelegd.

## 5. Accountkoppeling

- In de engine: `AccountLink { providerId, externalUserId, playerId, linkedAt, revokedAt? }` en `resolvePlayer`. Een event voor een onbekende of ontkoppelde gebruiker levert **nooit** een beloning op (`not-linked`).
- In de demo is er één vaste koppeling: `rank-demo` / `leerling-1` → de lokale speler.
- **Ontwerp voor een echte koppeling** (`LEEROMGEVING.md` §3.3, niet gebouwd):
  1. op de ouderpagina van de leeromgeving maakt de ouder een eenmalige code van 8 tekens (10 minuten geldig; alleen de SHA-256 wordt bewaard);
  2. de code wordt in RANK11 ingevoerd;
  3. RANK11 wisselt de code server-to-server in voor een pseudoniem `externalUserId`;
  4. er volgt een bevestigingsstap met een hint (kleur of initiaal, geen naam);
  5. één leerprofiel hoort bij precies één speler.
- **Afhankelijkheid:** RANK11 heeft nu geen ouderaccount (de lokale API kent alleen spelersaccounts met uitnodigingscode). Wie de code mag invoeren, moet dus nog worden bepaald.

## 6. Beloningsregels (`academyReward`)

De beslissing heeft altijd een status, een reden en de (eventueel afgekapte) XP-regels. Volgorde van controles:

| Status | Wanneer |
|---|---|
| `disabled` | Academy staat uit |
| `not-linked` | geen actieve koppeling voor deze leerling |
| `duplicate` | `eventId` eerder verwerkt (in de geschiedenis of in de ledger) |
| `abandoned` | niet afgerond |
| `too-fast` | duur < 8 s × aantal vragen ("Te kort om betrouwbaar te belonen.") |
| `no-learning-value` | herhaling zonder verbetering en zonder herstelde fouten |
| `capped` | alles valt weg door het dag- (150) of weekplafond (600) |
| `rewarded` | anders |

XP-regels:
- **Eerste keer een `activityId` afgerond:** 20 XP, plus 30 XP bij ≥ 80% goed.
- **Herhaling:** alleen als er ≥ 20 uur zit tussen deze en de vorige poging **en** de score minstens 10 procentpunt hoger is dan de beste eerdere score: 15 XP. Komt de score daarmee voor het eerst op ≥ 80%, dan ook de 30 XP.
- **Herstelde fouten:** 25 XP per eerder foute vraag die nu goed is, maximaal 4 per activiteit. Dit geldt ook bij een herhaling.
- Alles gaat door `applyCaps` (zie `MOTIVATION-ENGINE.md`).

In de web-app tellen alleen pogingen met status `rewarded`, `capped` of `no-learning-value` als eerdere poging. Een te snelle of afgebroken poging blokkeert dus niet de 20 XP voor de eerste echte afronding.

`academySubjectSummary` geeft per vak: aantal afgeronde activiteiten, gemiddelde score, moeilijkste onderwerp (vanaf twee onderwerpen) en verdiende Academy-XP.

## 7. De interne oefenmodule ("RANK Oefenmodule", demo)

- **Echte oefenvragen, geen nepdata:**
  - Wiskunde: gegenereerde vragen (procenten, breuken vereenvoudigen, lineaire vergelijkingen), deterministisch opnieuw op te bouwen uit het vraag-id. Het antwoord typt de leerling zelf.
  - Frans: 24 woorden NL → FR, meerkeuze.
  - Engels: 24 onregelmatige werkwoorden (past simple), meerkeuze met veelgemaakte foute vormen als afleiders.
- 6 vragen per sessie. Eerder foute vragen komen eerst terug als herkansing. Is minstens de helft herkansing, dan is het `activityType` `mistakes`, anders `practice`.
- Directe feedback per vraag, geen zichtbare timer.
- Aan het eind maakt de module een `LearningEvent` met echte start- en eindtijd en een uniek `eventId`. Dat event gaat door `submitLearningEvent` → `validateEvent` → `resolvePlayer` → `academyReward`. Afbreken levert een event met status `abandoned`.
- De uitkomst wordt eerlijk getoond: status, XP-regels, afgekapte XP en reden (bijvoorbeeld "te snel").
- Alles gebeurt lokaal in de browser. Er is geen handtekening, want er is geen netwerkverkeer. De module laat de regels zien; ze is geen beveiligde bron.

## 8. leren.martijndenbesten.com

Uit het leesonderzoek (`LEEROMGEVING.md`, niets gewijzigd, geen inloggegevens gebruikt):

- Cloudflare Worker met D1 en R2.
- Er zijn geen accounts: toegang loopt via een persoonlijke token-URL (`/k/<token>/`) en een ouderpagina met sleutel in de URL.
- Er is **geen publieke of server-to-server API en geen webhook gevonden**.
- Het eventformaat en de stabiliteit van toets-id's zijn onbekend.
- Het URL-token is identiteit en geheim tegelijk en daarom ongeschikt als `externalUserId`.

**Gevolg:** een koppeling kan alleen als de leeromgeving zelf wordt uitgebreid (stabiele `activityId`, pseudoniem per gebruiker, koppelcodes, outbox met ondertekende webhook; voorstel L1–L9). Dat is een wijziging aan een ander project en gebeurt niet zonder opdracht van Martijn. De integratie in RANK11 blijft tot die tijd uit.

## 9. Open vragen voor Martijn

Deze vragen moeten in `VRAGEN.md` worden genummerd:

1. Wil je de koppeling, en mag de leeromgeving daarvoor worden uitgebreid (L1–L9 uit het onderzoek)?
2. Push (webhook vanuit de leeromgeving, voorkeur) of pull (RANK11 haalt op)?
3. Blijft een oefentoets een aparte bron (alleen Academy-XP), of mag hij ooit als cijfer tellen? Huidige keuze in de code: nooit als cijfer.
4. Welke pogingen worden beloond: eerste, beste of elke? En welke activiteitstypen? Tellen zelfbeoordeelde punten mee?
5. Wat gebeurt er met eerder toegekende Academy-XP na ontkoppelen of intrekken van een event?
6. Bewaartermijn van gekoppelde events, en opname in de DPIA.
7. Wie voert de koppelcode in, nu RANK11 geen ouderaccount heeft?
8. Komt de ouderpagina eerst achter extra beveiliging (bijv. Cloudflare Access), voordat daar een koppelknop komt?
9. Mag de broncode van de leeromgeving (alleen lezen) worden bekeken om de onbekende punten vast te stellen?
