# Eerste tester — startinstructie en actuele blokkades

Stand: 26 oktober 2026. Alleen verzonnen accounts en cijfers. De pilotvoorwaarden in issue #1 blijven gelden.

## Demo nu live (26 oktober 2026)

**Publieke statische demo:** https://rank11-demo.onrender.com — nieuwe geïsoleerde Render Static Site `rank11-demo` in de bestaande workspace. Initiële deployment `dep-dbfig98ae00c7387lsr0` van commit `85d4a0e` door Render bevestigd als **live** (build en deploy geslaagd). Auto-deploy staat bewust **uit**; nieuwe GitHub-commits wijzigen de demo niet automatisch. Dit is geen Cloudflare-testomgeving.

De demo draait **zonder server en zonder account**. Gebruik **uitsluitend verzonnen cijfers**; geen naam, school, Magister-gegevens of echte cijfers invoeren. Voortgang in de demo wordt lokaal op het toestel bewaard; dit is niet hetzelfde als een account waarmee gegevens tussen toestellen synchroniseren. Live werking op iOS/Android en externe HTTP-check zijn nog niet afzonderlijk bevestigd. De GitHub Pages-publicatie blijft geblokkeerd door ontbrekende rechten; de Render-demo omzeilt die blokkade zonder de andere projecten te veranderen.

**Senn kan de demo met fictieve testgegevens starten.** De afzonderlijke besloten serverpilot met een echt account blijft geblokkeerd totdat een beveiligde backendomgeving en de bijbehorende controles operationeel zijn. Echte leerlingcijfers blijven buiten deze demo.

## Gecontroleerde status

- Branch `main`, laatste gecontroleerde commit: `264ef574599c003d2f908a66b5fb1ac8ed2d9835`. Geen andere branches of pull requests gevonden tijdens deze controle.
- GitHub Actions-run https://github.com/MartijndBesten/RANK11./actions/runs/40299269504: dependencies, tests/privacycheck, typecheck en web-build geslaagd.
- Publicatie MISLUKT: `Configureer Pages` geeft `Resource not accessible by integration` bij het aanmaken van de Pages-site. Upload overgeslagen; deploy overgeslagen. Een Pages-workflow in de repository is geen bewijs van een live demo.
- Er is nu een Render-demo-URL (zie hierboven), maar nog **geen besloten server-testomgeving** of testeraccount/uitnodiging.
- De huidige werkomgeving heeft geen geconfigureerde Cloudflare-credentials. Database-ID in `apps/api/wrangler.toml` is een placeholder; test-origin is leeg; test-integratiesleutel staat nog als vaste waarde in de configuratie. Gebruik bij uitrol secret storage en verwijder de vaste testwaarde.

## Wat eerst moet gebeuren

Voor de bestaande statische demo: deze is intussen op Render gepubliceerd en in het dashboard als live bevestigd. GitHub Pages hoeft niet meer te worden ingeschakeld om de demo te openen. Alleen gebruiken met verzonnen gegevens; deze publieke demo voldoet niet aan de besloten serverpilot van issue #1.

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

Senn kan de publieke demo met verzonnen cijfers gebruiken. Hij kan pas de **besloten serverpilot met een account** starten als de omgeving bereikbaar, afgeschermd en gehost getest is en de eenmalige uitnodiging veilig is verstrekt. Voor echte leerlinggegevens moeten bovendien alle fase-B-gates uit issue #1 zijn afgetekend. Deze controle heeft geen uitrol of echte leerlingtest opgeleverd.
