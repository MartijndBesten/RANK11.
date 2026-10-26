# RANK11. — Veiligheid en privacy

**Stand:** 25-10-2026 · **Doelgroep:** 10–16 jaar · **Zie ook:** `docs/HAALBAARHEID.md` (#4, #7, #8, #11, #13), `docs/onderzoek/BRONNENONDERZOEK.md`, `docs/onderzoek/ECHTE_DATA_V2.md`, `apps/api/README.md`

> Dit is geen juridisch advies. **Voordat echte persoonsgegevens van minderjarigen online worden verwerkt, moeten de toepasselijke privacy- en toestemmingsvereisten zijn beoordeeld** (DPIA, verwerkingsverantwoordelijke, ouderlijke toestemming onder 16 jaar, bewaartermijnen, verwerkersafspraken). Dat is een voorwaarde voor productie, niet voor verder bouwen.

## 1. Huidige situatie

| Onderdeel | Waar staan gegevens | Wie ziet ze |
|---|---|---|
| Web-prototype (preview) | Alleen in `localStorage` van het toestel (`rank11-proto-v3`) | Alleen wie dat toestel gebruikt |
| Lokale API | Lokale SQLite van wrangler / testshim, alleen synthetische testgegevens | Niemand buiten de ontwikkelomgeving |
| Productie | Bestaat niet | — |

Er is geen Cloudflare-account, geen database en geen Worker aangemaakt voor RANK11. Er draaien geen analytics, trackers of advertenties.

## 2. Schoolgegevens en de AVG

- **Geen Magister-scraping, geen opgeslagen wachtwoorden.** Magister verbiedt API-gebruik door niet-geautoriseerde partijen; een partnerroute vraagt een KvK-inschrijving, een verwerkersovereenkomst en een relatie met de school (NO-GO nu). Inloggegevens van kinderen worden nooit gevraagd of bewaard.
- **Somtoday:** alleen via de school (NO-GO nu, mogelijk later met een pilotschool).
- **Leerling-CSV uit Magister:** niet gevonden voor leerlingen; dataportabiliteit (art. 20 AVG) dekt cijfers niet. Een eigen CSV-sjabloon dat de leerling zelf invult kan wel (GO), maar is nog niet gebouwd.
- **Cijfers zijn alleen voor de leerling zelf.** Pools zien spelresultaten en, in de Grade League, alleen genormaliseerde componentscores (0–100), nooit cijfers.
- **Dataminimalisatie:**
  - de API kent geen e-mail en geen geboortedatum, alleen een gebruikersnaam;
  - Academy-events bevatten alleen totalen (aantal vragen, goed, herstelde fouten, tijden), geen antwoorden, vraagteksten of namen;
  - `externalUserId` is een pseudoniem, nooit het URL-token van de leeromgeving.
- Schoolprestaties van leerlingen staan op de AP-lijst van verwerkingen waarvoor een DPIA verplicht is (HAALBAARHEID #8).

## 3. Zelf ingevoerde cijfers en eerlijkheid

Besluit Martijn (beurt 3): leerlingen voeren zelf in, zonder controle door ouder of school. Het systeem kan dus niet weten of een cijfer klopt. Maatregelen om valsspelen weinig op te laten leveren:

- Het label "zelf ingevoerd" staat overal; de status blijft `registered`.
- Dubbele invoer van dezelfde toets wordt geweigerd (`gradeKey`). XP voor een toets wordt hooguit één keer toegekend, ook na verwijderen en opnieuw invoeren (`perf:<gradeKey>` blijft in de ledger).
- Een correctie naar een hoger cijfer levert alleen het verschil op. Verwijderen draait de XP terug.
- Iedere wijziging blijft in de geschiedenis staan, met tijd en reden.
- Plafonds: kaartbeloning maximaal 4 cijfers per dag en 12 per week; XP-plafonds per dag en week per soort.
- Er is geen ranglijst op ruwe cijfers. De Grade League rekent met gemiddelden en vooruitgang ten opzichte van jezelf, zodat meer toetsen invoeren niet automatisch wint.
- Cijfers in de toekomst worden geweigerd.

**Restrisico:** een speler kan verzonnen cijfers invoeren. In de lokale preview kan een speler ook `localStorage` aanpassen. Dat is pas tegen te gaan als de server de bron van waarheid is (§4). In een besloten vriendengroep is dit een sociaal risico, geen technisch op te lossen probleem.

## 4. Server-authoritative (lokale API)

- Clients sturen intenties; uitkomsten (packs, beloningen, battle-uitslagen) worden server-side berekend met `@rank11/engine`, met seed en configuratieversie opgeslagen.
- Muterende endpoints accepteren `Idempotency-Key`. Bij cijfers en packs is die verplicht. Zelfde sleutel + zelfde verzoek geeft het opgeslagen antwoord; zelfde sleutel + ander verzoek geeft 422.
- Wedstrijden: één Durable Object per wedstrijd valideert beurt, eigendom en deadlines; de eventlog is de waarheid.
- Wallet als grootboek (`wallet_ledger`), auditlog (`audit_log`) voor accountacties.

## 5. Accounts en sessies (lokale API)

- Registratie alleen met een pool- of platformuitnodigingscode. Codes worden alleen gehasht opgeslagen; de leesbare code wordt één keer getoond.
- Wachtwoorden: PBKDF2-SHA256 met een salt per gebruiker, standaard 100.000 iteraties (het maximum dat Workers toestaat; minimum 1.000), formaat `pbkdf2-sha256$<iteraties>$<salt>$<hash>`.
- Sessietokens: willekeurig; in de database staat alleen de SHA-256. Geldig 30 dagen (instelbaar). Via `Authorization: Bearer` of een optionele httpOnly-cookie `rank11_session`.
- Rate limiting op inloggen: na 5 mislukte pogingen per account of 30 per IP binnen 15 minuten wordt het geblokkeerd. Algemene foutmeldingen ("Gebruikersnaam of wachtwoord onjuist."), en een dummy-hash tegen timing-verschillen bij onbekende gebruikers.
- Gebruikersnaam 3–20 tekens, alleen letters, cijfers en `_`.
- Beveiligingsheaders: `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`; CORS alleen voor de origins in `ALLOWED_ORIGINS`.
- Er is **geen ouderaccount en geen ouderlijke toestemmingsflow**. Dat is nodig vóór productie (AVG art. 8 / UAVG art. 5 onder 16 jaar).

## 6. Academy-koppeling

- Alleen server-to-server met HMAC-SHA256 over `${timestamp}.${body}`, tijdvenster 300 seconden, vergelijking in constante tijd, meerdere geheimen voor rotatie.
- Events van onbekende of ontkoppelde gebruikers leveren nooit een beloning op.
- Minimale duur per vraag, plafonds en ontdubbeling op `eventId` tegen farmen.
- De koppeling staat uit. De leeromgeving is niet aangepast. Het onderzoek is alleen-lezen gedaan, zonder inloggegevens.
- Risico bij de bron: de leeromgeving gebruikt token-URL's. Iedereen met de link kan oefenen namens het kind. Daarom zijn er plafonds en wordt alleen afgeronde activiteit beloond.

## 7. Geld en kansspelen

- Geen echt geld, geen betaalde packs, geen abonnementen. Coins zijn niet te koop en niet om te zetten in iets buiten het spel.
- Kansen worden getoond bij iedere pack en draft. Bij de draft staat ook de gemeten kans, omdat die afwijkt van de ingestelde.
- Transfermarkt (alleen engine): alleen coins, prijsband, binnen de pool, geen chat, biedingen of ruil. Dat voorkomt afzetterij en verkapt "geld geven".
- Geen streaks, loginbeloningen of verlies bij wegblijven (KIDS Act-voorstel art. 9, onderzoek C8). Geen tijdgebonden aanbiedingen (onderzoek C18).

## 8. Echte spelers, clubs en portretten

- Geen echte spelers, clubs, logo's of tenues zonder schriftelijke licentie. Ook overleden legendes niet: het portretrecht loopt via nabestaanden door, en namen zijn vaak merken (`ECHTE_DATA_V2.md`).
- Portretten zijn AI-gegenereerde fictieve personen (FLUX.2 [klein] 4B, Apache-2.0), met AI-label op de kaart. Een gelijkeniscontrole door een mens blijft nodig vóór publicatie: het systeem zelf kan geen echte personen herkennen.

## 9. Geheimen

- Er staan geen geheimen in de repository. `wrangler.toml` bevat bewust geen account- of database-id's (alleen nul-placeholders voor lokaal gebruik).
- Productiegeheimen (HMAC-sleutels, eventuele API-tokens) horen in Cloudflare-secrets, niet in code of variabelen.
- Elke commit wordt vooraf gecontroleerd op geheimen en klantgegevens (werkwijze workbench).

## 10. Vóór productie (checklist)

1. DPIA en besluit over wie verwerkingsverantwoordelijke is.
2. Ouderlijke toestemming en ouderaccount (onder 16 jaar), inclusief inzage, export en verwijdering.
3. Bewaartermijnen voor cijfers, events en logs; EU-jurisdictie voor D1/Durable Objects en controle van Cloudflare-logbeleid.
4. Securityreview van de API (authenticatie, isolatie tussen pools, rate limits, idempotentie).
5. Gelijkeniscontrole van alle portretten door een mens; merkcheck van verzonnen club- en spelersnamen.
6. Moderatiebeleid voor pools (gebruikersnamen, clubnamen) en een meldknop.
7. Expliciete goedkeuring van Martijn voor de uitrol.

## 11. Agenten en externe verzoeken

Aanleiding: [INCIDENT-2026-10-25-user-agent.md](INCIDENT-2026-10-25-user-agent.md).

- Stuur nooit persoonsgegevens (e-mailadres, naam, telefoonnummer, tokens, sessiegegevens) mee in headers, query's, formulieren of zoektermen naar derden, tenzij Martijn dat voor die dienst expliciet heeft gevraagd.
- Vraagt een dienst contactinformatie in de User-Agent (zoals Wikimedia), gebruik dan een generieke waarde, bijvoorbeeld `RANK11-research/1.0 (contact via repository)`, nooit een persoonlijk adres.
- Onderzoeksopdrachten aan agenten vermelden deze regel expliciet.
- `npm run check:pii` (onderdeel van `npm test`) controleert alle getrackte tekstbestanden op e-mailadressen en telefoonnummers. Een vondst laat de tests falen.
