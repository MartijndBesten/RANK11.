# Multiplayer en backend

**Status 25-10-2026:** de server (`apps/api`) is gebouwd en lokaal getest: 42 tests, een rooktest met `wrangler dev --local` en een bundelcontrole (`wrangler deploy --dry-run`). Hij is **niet uitgerold**: er is geen Cloudflare-account, database of Worker aangemaakt, en de web-app gebruikt de server nog niet. Volledige endpointlijst, datamodel en uitrolstappen staan in [`apps/api/README.md`](../apps/api/README.md).

## Architectuur

- **Cloudflare Worker** voor REST (router, authenticatie, CORS en beveiligingsheaders).
- **D1 (SQLite)** voor accounts, pools, competities, cijfers, grootboek, kaarten en audit.
- **Durable Object `MatchDO`** per wedstrijd: eventlog, WebSocket met hibernation en deadlines via `alarm()`. Verlopen deadlines worden ook bij elk verzoek verwerkt.
- Alle spelregels komen uit `@rank11/engine`. De server is leidend: clients sturen alleen intenties (zet, cijfer, pack openen) en de server berekent de uitkomst.

## Accounts en pools

- Registratie alleen met een uitnodigingscode (poolcode of platformcode). Codes worden alleen als hash opgeslagen, kunnen verlopen en hebben een gebruikslimiet.
- Wachtwoorden met PBKDF2-SHA256 (100.000 iteraties) en een eigen salt. Sessietokens worden alleen als SHA-256 opgeslagen. Er is een optioneel httpOnly-cookie met CSRF-controle op origin, en rate limiting op inloggen.
- Er worden geen e-mailadres en geen geboortedatum opgeslagen.
- Niet-leden krijgen overal 404, zodat zelfs het bestaan van een pool niet uitlekt. De database bewaakt het maximumaantal leden met een trigger.

## Wedstrijden

- Uitdagen binnen de pool, live (30 s per zet) of asynchroon (24 uur per zet).
- Bij reconnect haalt de client de volledige eventlog op en leidt de status opnieuw af.
- Een competitie-fixture waarbij de uitgedaagde niet op tijd accepteert, eindigt in forfait. Dit is een aanname die Martijn nog moet bevestigen.

## Economie op de server

- Een grootboek (`wallet_ledger`) met een trigger die een negatief saldo onmogelijk maakt.
- Packs openen is idempotent: een opening is uniek per grant en de seed wordt bewaard in de audit.
- Muterende verzoeken accepteren een `Idempotency-Key`; bij cijfers en packs is die verplicht.
- Cijfers: dubbele invoer geeft 409 zonder beloning; een correctie geeft alleen het verschil.
- XP: de server wordt gelijkgetrokken met de motivatie-engine van de app. Zie HANDOFF.md voor de actuele stand.

## Vóór iets online kan

1. **Privacy en toestemming:** een ouder-/voogdaccount met toestemmingsflow, een juridische toets en een DPIA. De doelgroep is 10-16 jaar. Zonder dit geen productie.
2. Een Cloudflare-account en een testomgeving. Dat vraagt toestemming van Martijn, omdat het een nieuwe (gratis) dienst is.
3. Turnstile bij registratie, rate-limit-bindings en een retentietaak voor sessies, audit en idempotentiesleutels.
4. De web-app koppelen. De store (`apps/web/src/state/store.tsx`) is daar al op voorbereid: dezelfde acties worden dan API-aanroepen.
5. Export en verwijdering van accountgegevens (AVG).
