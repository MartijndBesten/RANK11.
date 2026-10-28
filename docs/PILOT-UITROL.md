# Besloten synthetische pilot — uitrol

Deze voorbereiding is geen live omgeving. De Render-demo blijft apart en ongewijzigd.
Gebruik uitsluitend verzonnen accounts en cijfers; de fase-B-gates in issue #1 blijven open.

## Actualisatie 28 oktober 2026

De pilotwijzigingen zijn samengebracht met main, inclusief account-export/verwijderen,
importdeduplicatie, begrensde bulkbeloningen en de UI-verbeteringen. R2 blijft de assetbron:
DEMO-DEPLOY beschrijft een eerdere asset-uploadbeperking. Geen dubbele ASSETS-binding.
Workers.dev blijft uit; de custom domain is de enige geconfigureerde testorigin.
Ook zonder PILOT_MODE blijft ENVIRONMENT=test afgeschermd; registratie vereist expliciet true.

Een externe GET naar https://rank11-test.martijndenbesten.com/api/health gaf zonder credentials
200 en {ok:true}. Dat bevestigt bereikbaarheid, niet veilige pilotwerking of D1-status.
Cloudflare API-accountcontrole gaf 403 (ontbrekende authenticatie); geen beheersessie gevonden.
Geen remote wijzigingen uitgevoerd. De bestaande database-ID en resources eerst inventariseren.

## Voorbereide beveiliging

De test-Worker bedient de web-build en `/api` op één HTTPS-origin. Alle routes,
inclusief afbeeldingen, health, registratie en API, vereisen HTTP Basic Auth.
Het pilotwachtwoord is een willekeurig ASCII-secret van minimaal 32 tekens; geef
dit alleen aan beheerder en de ene tester. De eigen accountsessie blijft in het
bestaande Secure/HttpOnly/SameSite=Strict-cookie. Bearer-authenticatie kan niet
tegelijk met Basic Auth in dezelfde Authorization-header: gebruik cookies.

Zonder secrets of assetbinding antwoordt de pilot met 503. Antwoorden krijgen
`noindex, nofollow, noarchive` en `no-store`. Dit zijn aanvullende maatregelen;
de toegang wordt afgeschermd door authenticatie. Registratie staat standaard uit.
De vaste test-integratiesleutel is uit de configuratie verwijderd. Geen test-cron.

## Benodigde toegang

Cloudflare-account met rechten op Workers, D1 en Durable Objects. De deployment
vereist `CLOUDFLARE_API_TOKEN` en `CLOUDFLARE_ACCOUNT_ID` via secret storage of
een geautoriseerde Wrangler-login. Die toegang is op het moment van schrijven
niet beschikbaar in deze werkomgeving. De Render-koppeling kan geen D1 of
Cloudflare Durable Objects uitvoeren; daarvoor is geen migratie gebouwd.

## Uitvoeren zodra toegang beschikbaar is

1. Controleer het geselecteerde Cloudflare-account, plan/kosten, bestaande namen
   en limieten. Wijzig geen andere projecten. Gebruik alleen `rank11-api-test`
   en `rank11-test`; hergebruik een bestaande database alleen na verificatie.
2. Controleer eerst de bestaande D1-ID, eigendom, inhoud en EU-jurisdictie. WEUR is geen bewijs van EU-jurisdictie. Alleen indien nodig: maak een afzonderlijke EU-database aan met `wrangler d1 create rank11-test --jurisdiction eu` en vul
   uitsluitend de nieuwe database-ID in onder `env.test` van `apps/api/wrangler.toml`.
3. Bouw vanuit de repositoryroot: `npm ci`, `npm test`, `npm run typecheck`,
   `npm run build`. Voer daarna `npm run deploy:dry -w apps/api` uit.
4. Zet de Worker-secrets `PILOT_ACCESS_USER`, `PILOT_ACCESS_PASSWORD` en
   `INTEGRATION_KEY` met `wrangler secret put <NAAM> --env test` vanuit `apps/api`.
   Maak de wachtwoorden/sleutel willekeurig; geen secret in git, vars of logs.
5. Controleer dat R2-bucket `rank11-test-web` niet publiek toegankelijk is (geen r2.dev/custom-domain toegang). Upload de online web-build zonder VITE_PUBLIC_DEMO met correcte Content-Type naar de private bucket; behoud oude gehashte assets tot de nieuwe versie is gecontroleerd en vervang index.html als laatste. Voer `wrangler d1 migrations apply DB --remote --env test` uit en deploy
   met `wrangler deploy --env test`. Noteer de gerapporteerde HTTPS-origin.
   `ALLOWED_ORIGINS` moet exact die origin bevatten; deploy na deze instelling
   opnieuw. Houd `REGISTRATION_ENABLED=false`.
6. Controleer van buitenaf: zonder Basic Auth moeten `/`, een echt assetpad en
   `/api/health` 401 geven. Met toegang moet health JSON `{ok:true}` geven en
   de app laden. Controleer noindex/no-store op succesvolle en foutantwoorden.
7. Maak twee synthetische accounts: één beheer-tegenstander en één tester. Gebruik
   per account een eenmalige platformcode (`node scripts/platform-invite.mjs 1 1`)
   en sla alleen de gegenereerde hash-SQL op in deze testdatabase. Open registratie
   tijdelijk achter de pilotafscherming (`REGISTRATION_ENABLED=true`), registreer
   beide accounts met verzonnen gebruikersnamen en sluit registratie direct weer
   met `false` en een nieuwe deploy. Bevestig daarna dat ook een nieuwe geldige
   uitnodiging geen extra account kan registreren (403). Deel geen codes in issues.
8. Doe gehoste controles met cookies: login/logout/herlogin, sessieherstel,
   cijferinvoer/correctie/verwijdering, kluis/packs/elftal, import zonder dubbele
   beloning, Academy en een volledige battle tussen de twee fictieve accounts.
   Controleer dat de accounts elkaars cijfers niet kunnen lezen of veranderen en
   dat mutaties met een verkeerde Origin worden geweigerd. Gebruik de testkaart
   in `EERSTE-TESTER.md`. Test Safari/PWA op een echte iPhone wanneer beschikbaar;
   schrijf een ontbrekende toesteltest expliciet op.
9. Geef pas na geslaagde gehoste controles de URL, pilottoegang en testerlogin
   veilig aan de eigenaar. Meld deploy-commit en Worker-versie-ID. Geen extra
   testers of echte cijfers.

## Gehoste rooktest met gesloten registratie

`scripts/smoke.mjs` ondersteunt twee bestaande synthetische accounts met omgevingsvariabelen
`SMOKE_USER_A`, `SMOKE_PASSWORD_A`, `SMOKE_USER_B`, `SMOKE_PASSWORD_B`, plus
`PILOT_ACCESS_USER` en `PILOT_ACCESS_PASSWORD`. Geef alleen de basis-URL als argument.
Met pilottoegang gebruikt de test Basic Auth + sessiecookies + Origin en een volledige REST-battle. De pilotrooktest controleert WebSocket niet; de app gebruikt asynchrone battles.
Geen secrets als shellargument of in logs. Deze test schrijft fictieve data en is niet
uitgevoerd tegen de gehoste omgeving. Gebruik uitsluitend de aparte testdatabase.

## Stoppen en terugdraaien

Onmiddellijk afsluiten: roteer het pilotwachtwoord in Worker secret storage.
Registratie blijft gesloten. Gebruik bij een coderegressie de vorige gecontroleerde
Worker-versie via `wrangler rollback <VERSION_ID> --env test`. Een rollback van
code draait D1 niet terug: deze voorbereiding voegt geen databasemigratie toe.
Verwijder alleen na afronding van de pilot en expliciet besluit de afzonderlijke
testresources. Raak de Render-demo en andere projecten niet aan.

## Oorspronkelijke controles op PR-commit ccd6ae1

225 engine-tests en 77 API-tests geslaagd, waaronder drie nieuwe pilottests voor
afscherming, ontbrekende secrets, gesloten registratie, cookies en CSRF.
Typecheck, web-build, PII-controle en Worker dry-run geslaagd. Geen Cloudflare
resource aangemaakt, geen remote migratie/deploy gedaan, geen echt testaccount
aangemaakt en nog geen gehoste of iPhone-controle uitgevoerd.

## Validatie samengebrachte code (28 oktober 2026)

225 engine-tests, 84 API-tests, PII-controle, typecheck, web-build en Wrangler dry-run geslaagd.
Dit zijn lokale resultaten. Geen gehoste account-/battle-/iPhone-test uitgevoerd.
