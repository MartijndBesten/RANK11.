# Eerste tester — startinstructie en actuele blokkades

Stand: 26 oktober 2026. Alleen verzonnen accounts en cijfers. De pilotvoorwaarden in issue #1 blijven gelden.

## Gecontroleerde status

- Branch `main`, laatste gecontroleerde commit: `264ef574599c003d2f908a66b5fb1ac8ed2d9835`. Geen andere branches of pull requests gevonden tijdens deze controle.
- GitHub Actions-run https://github.com/MartijndBesten/RANK11./actions/runs/40299269504: dependencies, tests/privacycheck, typecheck en web-build geslaagd.
- Publicatie MISLUKT: `Configureer Pages` geeft `Resource not accessible by integration` bij het aanmaken van de Pages-site. Upload overgeslagen; deploy overgeslagen. Een Pages-workflow in de repository is geen bewijs van een live demo.
- Geen bereikbare testomgeving bevestigd. Geen testeraccount of uitnodiging aangemaakt.
- De huidige werkomgeving heeft geen geconfigureerde Cloudflare-credentials. Database-ID in `apps/api/wrangler.toml` is een placeholder; test-origin is leeg; test-integratiesleutel staat nog als vaste waarde in de configuratie. Gebruik bij uitrol secret storage en verwijder de vaste testwaarde.

## Wat eerst moet gebeuren

Voor alleen de bestaande statische demo: repositorybeheerder schakelt GitHub Pages in via Settings → Pages → Source: GitHub Actions. Daarna de mislukte workflow opnieuw uitvoeren en de werkelijk door de deploy-job gerapporteerde URL controleren. Dit is een publieke statische demo en voldoet niet aan de besloten serverpilot van issue #1. Alleen gebruiken als demonstratie met verzonnen gegevens.

Voor de besloten serverpilot: configureer toegang tot het bedoelde Cloudflare-account via secret storage (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`). Controleer plan, kosten, bestaande resources en triggerlimieten. Maak uitsluitend afzonderlijke RANK11-testresources, met D1 in EU-jurisdictie, geen extra cron. Stel toegang voor beheerder/tester, noindex, eigen origin en secrets in; voer migraties, deploy en gehoste smoke/e2e-tests uit. Publiceer pas daarna exacte URL, deploy-commit en rollback-instructie. Raadpleeg issue #1 voor alle acceptatievoorwaarden.

## Testkaart (na geverifieerde beschikbaarheid)

Gebruik uitsluitend fictieve gegevens; geen schoolnaam, leerlingnaam, Magister-login of echte cijferexport. Voor de statische demo kies je de demomodus; een online account en multiplayer zijn daarin niet beschikbaar.

1. Open op telefoon, noteer browser en schermformaat. Controleer Home, navigatie en uitleg; sluit uitleg en lees die opnieuw via ‘Hoe werkt dit?’.
2. Voer een verzonnen cijfer in, bijvoorbeeld Wiskunde, ‘Proeftoets A’, 7,5, weging 1, datum van vandaag. Controleer overzicht, gemiddelde en beloning/kluis.
3. Corrigeer dit cijfer en controleer dat de beloning alleen volgens de correctieregels verandert; verwijder het cijfer en controleer XP.
4. Plak/importeer verzonnen cijfers en herhaal dezelfde import. Controleer dat bestaande cijfers en beloningen niet verdubbelen. Twee werkelijk verschillende toetsen op dezelfde datum met hetzelfde vak en cijfer zijn een apart open controlepunt; niet aannemen dat dit al correct werkt.
5. Open een beschikbaar pack, bekijk de nieuwe kaart in Collectie en wijzig het elftal. Controleer kaarten en opstelling na herladen.
6. Oefen in Academy; controleer resultaat en voortgang. Magister moet ‘nog niet beschikbaar’ blijven.
7. Alleen in de gehoste serverpilot: gebruik de ene door beheerder verstrekte testuitnodiging. Test inloggen, uitloggen, opnieuw inloggen en sessieherstel. Controleer opslag na herladen. Voor een battle is een tweede synthetisch beheeraccount nodig; nodig geen extra testers uit.
8. Op echte iPhone indien beschikbaar: Safari, toevoegen aan beginscherm en opnieuw openen. Noteer afzonderlijk wat daadwerkelijk op een toestel is getest.

## Feedback vastleggen

Noteer per probleem: scherm, stappen, verwacht gedrag, werkelijk gedrag, browser/toestel en eventueel een screenshot zonder persoonsgegevens. Geen wachtwoorden, tokens of uitnodigingscodes in issues of logs. Gebruik de bestaande pilotissue: https://github.com/MartijndBesten/RANK11./issues/1.

## Startcriterium

De eerste tester kan pas de besloten serverpilot starten als de omgeving bereikbaar, afgeschermd en gehost getest is en de eenmalige uitnodiging veilig is verstrekt. Voor echte leerlinggegevens moeten bovendien alle fase-B-gates uit issue #1 zijn afgetekend. Deze controle heeft geen uitrol of echte leerlingtest opgeleverd.
