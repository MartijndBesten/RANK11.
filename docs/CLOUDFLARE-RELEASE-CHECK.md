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
2. Voeg beveiligde repository-secrets `CLOUDFLARE_ACCOUNT_ID` en `CLOUDFLARE_API_TOKEN` toe. Deel geen geheimen in een chat, commit, issue of log. Gebruik een beperkt token met alleen noodzakelijke leesrechten op D1 en R2, in het juiste account.
3. Open Actions → **RANK11 Cloudflare resourcecontrole** → Run workflow (main). Controleer of de output expliciet een EU-D1 en niet-publieke R2 bevestigt. Een 403 betekent geen verificatie en géén GO.
4. Controleer daarna de Worker-secrets `PILOT_ACCESS_USER`, `PILOT_ACCESS_PASSWORD` (willekeurig, minimaal 32 tekens), en `INTEGRATION_KEY` uitsluitend in Cloudflare secret storage.
5. Voer pas na een geslaagde resourcecontrole de bestaande procedure in [PILOT-UITROL.md](PILOT-UITROL.md) uit: remote migraties, web-build naar de private R2-bucket, Worker-deploy, registratie dicht en online rooktest met twee synthetische accounts.
6. Na de uitrol Actions → **RANK11 online beveiliging controleren** handmatig draaien, met de aparte GitHub-repository-secrets `RANK11_PILOT_ACCESS_USER` en `RANK11_PILOT_ACCESS_PASSWORD`. Test daarna de volledige account-, cijfer-, pack- en wedstrijdroute en de echte iPhone.

**Belangrijk:** de GitHub-repository is publiek; de gegevens van de daadwerkelijke tester of geheimen mogen nergens in bestanden of issue-comments terechtkomen. De Read-only-controle mag geen toegangstoken loggen. Het is niet mogelijk vanuit de bestaande Render-koppeling de Cloudflare D1/Durable Objects te beheren.

## Vrijgave

- **Synthetische pilot**: pas na gehoste controles van alle routes en de werkende app.
- **Echte gebruikers onder 16**: daarnaast alle Fase-B-gates uit issue #1 afronden en onafhankelijk juridisch en privacytechnisch beoordelen.
- Geen publieke registratie zolang toestemming, verificatie, privacybeleid, bewaartermijnen en incidentproces niet afgerond zijn.
