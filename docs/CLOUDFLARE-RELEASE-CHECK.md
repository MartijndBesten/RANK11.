# RANK11 — Cloudflare-resourcecontrole vóór een besloten pilot

Status 29 oktober 2026: **voorbereid in GitHub, niet uitgevoerd tegen Cloudflare**. Deze handleiding is uitsluitend voor de afzonderlijke, synthetische testomgeving. Geen echte cijfers of persoonsgegevens invoeren.

## Waarom eerst controleren?

De bestaande `apps/api/wrangler.toml` bevat een D1-database-ID en R2-bucketnaam. Een ingevuld ID is geen bewijs van eigendom of EU-jurisdictie. Volgens het vorige online onderzoek antwoordde de test-API zonder toegang met HTTP 200: de online beveiliging is dus **niet bewezen**.

`scripts/cloudflare-pilot-preflight.mjs` voert alleen GET-verzoeken uit naar de officiële Cloudflare-API en blokkeert bij:
- verkeerde account-ID, onjuiste database-ID of andere database-/bucketnaam;
- D1 zonder expliciete `jurisdiction: eu` (WEUR als regiohint is niet genoeg);
- ontbrekende R2-bucket of ingeschakelde publieke `r2.dev`-/custom-domain-toegang;
- verlopen/onvoldoende Cloudflare API-rechten of ontbrekende configuratie.

Er worden **geen** resources aangemaakt, secrets gewijzigd, migraties toegepast of deployments uitgevoerd. Een groene resourcecontrole zegt **niets** over accounts, software of iPhone-werking.

## Exacte volgende handeling (alleen door accountbeheerder)

1. Open GitHub-repository `MartijndBesten/RANK11.` → Settings → Secrets and variables → Actions.
2. Voeg beveiligde repository-secrets `CLOUDFLARE_ACCOUNT_ID` en `CLOUDFLARE_API_TOKEN` toe. Deel geen geheimen in een chat, commit, issue of log. Gebruik een beperkt token voor het juiste account: de resourcecontrole heeft D1/R2-leesrechten nodig; de handmatige uitrol vereist aanvullend de passende schrijfrechten voor uitsluitend RANK11 D1, R2 en Workers.
3. Open Actions → **RANK11 Cloudflare resourcecontrole** → Run workflow (main). Controleer of de output expliciet een EU-D1 en niet-publieke R2 bevestigt. Een 403 betekent geen verificatie en géén GO.
4. Controleer daarna de Worker-secrets `PILOT_ACCESS_USER`, `PILOT_ACCESS_PASSWORD` (willekeurig, minimaal 32 tekens), en `INTEGRATION_KEY` uitsluitend in Cloudflare secret storage.
5. Voer pas na een geslaagde resourcecontrole de bestaande procedure in [PILOT-UITROL.md](PILOT-UITROL.md) uit: remote migraties, web-build naar de private R2-bucket, Worker-deploy, registratie dicht en online rooktest met twee synthetische accounts.
6. Na de uitrol Actions → **RANK11 online beveiliging controleren** handmatig draaien, met de aparte GitHub-repository-secrets `RANK11_PILOT_ACCESS_USER` en `RANK11_PILOT_ACCESS_PASSWORD`. Test daarna de volledige account-, cijfer-, pack- en wedstrijdroute en de echte iPhone.

**Belangrijk:** de GitHub-repository is publiek; de gegevens van de daadwerkelijke tester of geheimen mogen nergens in bestanden of issue-comments terechtkomen. De Read-only-controle mag geen toegangstoken loggen. Het is niet mogelijk vanuit de bestaande Render-koppeling de Cloudflare D1/Durable Objects te beheren.

## Voorbereide één-klikuitrol (alleen synthetisch)

De handmatige GitHub Action **RANK11 besloten testpilot uitrollen** is voorbereid. Er is nog **geen** Cloudflare-uitrol uitgevoerd. Deze workflow voert achtereenvolgens codecontroles, Cloudflare-preflight, een beveiligde Worker-deploy, drie Worker-secrets, afzonderlijke D1-testmigraties, private R2-assets (index.html als laatste), de eind-deploy en een online toegangscheck uit.

Benodigde GitHub Actions repository-secrets (nooit in chat of code delen):

- `CLOUDFLARE_ACCOUNT_ID` — juiste Cloudflare-account-ID.
- `CLOUDFLARE_API_TOKEN` — beperkt Cloudflare-token met benodigde D1-, R2- en Workers-/domeinrechten.
- `RANK11_PILOT_ACCESS_USER` — willekeurige pilot-login voor HTTP Basic Auth.
- `RANK11_PILOT_ACCESS_PASSWORD` — sterk willekeurig wachtwoord van minimaal 32 tekens.
- `RANK11_INTEGRATION_KEY` — willekeurige integratiesleutel van minimaal 32 tekens.

De workflow kan alleen vanaf `main` starten met exact `SYNTHETIC-ONLY`. Zonder groene resourcecontrole of secrets wordt hij gestopt. Hij beperkt wijzigingen tot `rank11-api-test`, D1 `rank11-test` en R2 `rank11-test-web`; overige Denckh.-services en Render worden niet gewijzigd. De testdatabase kan remote migraties ontvangen; laat eerst controleren dat er alleen fictieve testgegevens in staan. GitHub Actions heeft geen auditbewijs van bestaande data als er geen toegang bestaat.

Bij falen na de eerste deploy kan een gedeeltelijk uitgerolde en afgeschermde (503) pilot overblijven. Dat is veiliger dan de site openbaar maken; herstel met de gecontroleerde Cloudflare Worker-versie. Maak geen echte gebruikers aan voordat alle gehoste checks én fase-B privacychecks zijn geslaagd.

## Gehoste eindtest met twee fictieve accounts

Na de veilige Worker-publicatie moeten twee reeds bestaande accounts, met uitsluitend fictieve namen en cijfers, zijn aangemaakt. Alleen de beheerder beheert deze testgegevens; sluit registratie direct na aanmaak. Daarna kunnen deze vier aanvullende GitHub Secrets worden ingesteld:

- `RANK11_SMOKE_USER_A` en `RANK11_SMOKE_PASSWORD_A`
- `RANK11_SMOKE_USER_B` en `RANK11_SMOKE_PASSWORD_B`

Start handmatig via GitHub Actions → **RANK11 gehoste synthetische speltest** → `main`, met invoer `SYNTHETIC-ONLY`. De workflow controleert eerst dat de volledige omgeving alleen achter Basic Auth bereikbaar is. Daarna schrijft de bestaande rooktest uitsluitend nieuwe fictieve pool-, battle- en cijferrecords in de gehoste testdatabase en controleert zij de hele gameflow.

**Let op:** deze rooktest is bewust muterend en laat testrecords achter. Hij mag niet tegen een productieomgeving of echte leerlingaccounts worden uitgevoerd. Ook een groene uitkomst vervangt geen iPhone-Safari/PWA-test of AVG- en oudertoestemmingcontroles. Als de extra secrets ontbreken, slaat de workflow niet stilzwijgend over maar stopt hij met een fout.

## Vrijgave

- **Synthetische pilot**: pas na gehoste controles van alle routes en de werkende app.
- **Echte gebruikers onder 16**: daarnaast alle Fase-B-gates uit issue #1 afronden en onafhankelijk juridisch en privacytechnisch beoordelen.
- Geen publieke registratie zolang toestemming, verificatie, privacybeleid, bewaartermijnen en incidentproces niet afgerond zijn.
