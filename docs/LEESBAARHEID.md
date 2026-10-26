# Leesbaarheid en rust — 26 oktober 2026

## Bevindingen op de testsite

Home, Mijn cijfers, Competitie en Academy bekeken in de verbonden desktopbrowser.
Veel kleine labels en navigatie gebruikten Barlow Condensed met hoofdletters en
ruime letterafstand. Inactieve navigatie was donker. Home herhaalde cijfers,
voortgang, doelen, toetsen en beloningen; het cijferdashboard toonde daarnaast
alle statistieken, de XP-geschiedenis en prestaties tegelijk.

## Aanpassing

- Systeemletter voor gewone tekst, bediening, paginatitels en paneelkoppen;
  sportletter behouden voor kaarten en grote spelcijfers.
- Lopende tekst 16 px / 1,5; secundaire tekst 14 px; labels in gewone schrijfwijze.
- Lichter contrast voor inactieve navigatie en grotere bedieningsvlakken.
- Home: snelle acties, packs, elftal en eerstvolgende toets zichtbaar;
  aanvullende voortgang en beloningen onder een native details-element.
- Cijfers: drie kerncijfers, vakken en één inzicht zichtbaar; overige inzichten,
  verdeling, records, XP en prestaties opvraagbaar. Toetsweging en rekenuitleg behouden.
- Academy: oefenen blijft centraal, uitleg, historie en koppelingen ingeklapt.
- Verouderde tekst over een nog niet gehoste server vervangen door een korte
  uitleg van demomodus. De Home-voettekst onderscheidt demo van accountopslag.
- De nieuwe oefenknop volgt de bestaande Academy-instelling. Uitklappen werkt
  standaard met toetsenbord en schermlezers; Home-tegels ondersteunen ook spatie.

## Controle en publicatie

Webbuild, workspace-typecheck en privacycheck geslaagd; git diff --check schoon.
De bestaande lokale Playwright-layouttest kon niet starten: Chromium ontbreekt
in deze omgeving, en de officiële browserdownload leverde een onbruikbaar archief.
De viewport-instelling van de verbonden browser bleef feitelijk 1920 × 889;
geen geslaagde mobiele controle claimen. Visuele controle van de nieuwe build,
kleine schermen en 200%-zoom zijn dus nog nodig vóór publicatie.

Dit document en de codewijzigingen vormen een reviewbare wijziging. Een push of
pull request publiceert de R2-frontend niet. Het bijwerken van de testfrontend
volgt apps/api/TEST-DEPLOY.md; er zijn geen account- of spelgegevens gewijzigd.
