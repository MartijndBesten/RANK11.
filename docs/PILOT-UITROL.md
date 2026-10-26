# Besloten synthetische pilot — uitrol

Deze voorbereiding is geen live omgeving. De Render-demo blijft apart en ongewijzigd.
Gebruik uitsluitend verzonnen accounts en cijfers; de fase-B-gates in issue #1 blijven open.

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
2. Maak D1 aan met `wrangler d1 create rank11-test --jurisdiction eu` en vul
   uitsluitend de nieuwe database-ID in onder `env.test` van `apps/api/wrangler.toml`.
3. Bouw vanuit de repositoryroot: `npm ci`, `npm test`, `npm run typecheck`,
   `npm run build`. Voer daarna `npm run deploy:dry -w apps/api` uit.
4. Zet de Worker-secrets `PILOT_ACCESS_USER`, `PILOT_ACCESS_PASSWORD` en
   `INTEGRATION_KEY` met `wrangler secret put <NAAM> --env test` vanuit `apps/api`.
   Maak de wachtwoorden/sleutel willekeurig; geen secret in git, vars of logs.
5. Voer `wrangler d1 migrations apply DB --remote --env test` uit en deploy
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

## Stoppen en terugdraaien

Onmiddellijk afsluiten: roteer het pilotwachtwoord in Worker secret storage.
Registratie blijft gesloten. Gebruik bij een coderegressie de vorige gecontroleerde
Worker-versie via `wrangler rollback <VERSION_ID> --env test`. Een rollback van
code draait D1 niet terug: deze voorbereiding voegt geen databasemigratie toe.
Verwijder alleen na afronding van de pilot en expliciet besluit de afzonderlijke
testresources. Raak de Render-demo en andere projecten niet aan.

## Uitgevoerde controles op deze voorbereiding

225 engine-tests en 77 API-tests geslaagd, waaronder drie nieuwe pilottests voor
afscherming, ontbrekende secrets, gesloten registratie, cookies en CSRF.
Typecheck, web-build, PII-controle en Worker dry-run geslaagd. Geen Cloudflare
resource aangemaakt, geen remote migratie/deploy gedaan, geen echt testaccount
aangemaakt en nog geen gehoste of iPhone-controle uitgevoerd.
