# Incident: e-mailadres in User-Agent bij onderzoeksverzoeken (25-10-2026)

**Status:** afgehandeld. Vastgelegd op 26-10-2026 op basis van het transcript van de onderzoeksagent. Dit is een feitelijke reconstructie, geen juridisch advies.

## Wat er gebeurde

Tijdens het onderzoek naar rechtenvrije foto's van oud-voetballers (`docs/onderzoek/ECHTE_DATA_V2.md`) stuurde een onderzoeksagent in **één** shellcommando zes zoekverzoeken naar de openbare API van Wikimedia Commons. Daarbij gebruikte de agent een User-Agent-header met het e-mailadres van Martijn erin.

| Gegeven | Waarde |
|---|---|
| Tijdstip | 25-10-2026, 21:36:00 UTC (één commando, zes verzoeken achter elkaar) |
| Aantal verzoeken met het adres | 6 (alle zes kwamen succesvol terug) |
| Ontvanger | `commons.wikimedia.org`, endpoint `/w/api.php` (Wikimedia Foundation) |
| Methode en parameters | `GET`, `action=query&list=search&srnamespace=6&srlimit=4&format=json` |
| Zoektermen | `Abe Lenstra Bestanddeelnr`, `Faas Wilkes Bestanddeelnr`, `Coen Moulijn Bestanddeelnr`, `Rinus Michels Bestanddeelnr`, `Kees Rijvers Bestanddeelnr`, `Puskas Bestanddeelnr` |
| Header | `User-Agent: RANK11-research/0.1 (m.d…@live.nl)`; het volledige adres van de accounthouder stond tussen de haakjes |
| Overige inhoud | Geen. Geen naam, wachtwoord, token of cookie, en geen gegevens van kinderen of klanten |
| Daarna | Vanaf het volgende verzoek (21:36:25 UTC) gebruikte de agent `RANK11-research/0.1` zonder adres. Latere verzoeken naar andere sites gebruikten `Mozilla/5.0` of `RANK11-deskresearch/0.1` |

Gecontroleerd en niet gevonden:
- **Andere transcripten van deze sessie:** het adres komt nergens anders voor in een verzoek naar buiten. Bij de andere treffers op "denbesten" gaat het om de domeinnaam `leren.martijndenbesten.com` of om interne opdrachtteksten.
- **Repository en git-geschiedenis:** `git log -p --all | grep -c` op het adres geeft 0. Het adres staat niet in `tools/`, scripts of `docs/`.
- **Code:** er is geen code in de repository die een User-Agent of andere header met persoonsgegevens zet. Er hoefde dus niets verwijderd te worden.

## Context: waarom het gebeurde

De User-Agent-richtlijn van Wikimedia vraagt scripts om contactinformatie in de User-Agent mee te sturen, zoals een e-mailadres, website of gebruikersnaam, anders kunnen ze geblokkeerd worden ([bron](https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy), geverifieerd 26-10-2026). De agent volgde die richtlijn, maar gebruikte daarvoor een persoonlijk adres zonder dat daar toestemming voor was. Dat had niet gemogen: persoonsgegevens van de gebruiker horen niet in verzoeken aan derden zonder opdracht.

## Wat de ontvanger ermee doet

Volgens het privacybeleid van de Wikimedia Foundation geldt user-agentinformatie als persoonsgegeven. Persoonsgegevens worden "in most instances" na 90 dagen verwijderd, geaggregeerd of geanonimiseerd ([bron](https://foundation.wikimedia.org/wiki/Policy:Privacy_policy), geverifieerd 26-10-2026). De aparte bewaarrichtlijnen voor ruwe logbestanden zijn niet gecontroleerd.

## Risico-inschatting

**Laag.** Het gaat om één zakelijk/persoonlijk e-mailadres van de accounthouder zelf. Het is verstuurd naar een bekende, publieke en betrouwbare dienst, in technische serverlogs, samen met onschuldige zoektermen. Er zijn geen bijzondere persoonsgegevens, geen gegevens van minderjarigen en geen inloggegevens gelekt. Het adres is niet gepubliceerd. Het ergste realistische gevolg: de Wikimedia Foundation weet tijdelijk dat dit adres hoort bij een script dat naar oude voetbalfoto's zocht.

## Datalek in de zin van de AVG? (inschatting, geen juridisch advies)

- Formeel kan dit een inbreuk op de beveiliging zijn: een persoonsgegeven is zonder grondslag aan een derde verstrekt (art. 4 lid 12 AVG).
- Melden aan de Autoriteit Persoonsgegevens is alleen verplicht als de inbreuk waarschijnlijk een risico oplevert voor de betrokkene (art. 33 lid 1 AVG). Gezien de feiten hierboven is dat onwaarschijnlijk. Inschatting: **niet meldplichtig**.
- De AVG vraagt wel om het incident intern vast te leggen (art. 33 lid 5). Dat gebeurt met dit document.
- De betrokkene (Martijn) is op 26-10-2026 geïnformeerd via de projectoverdracht.
- Onzeker: of RANK11 hier formeel "verwerkingsverantwoordelijke" is. In de praktijk gaat het om het eigen adres van de opdrachtgever in een ontwikkelomgeving.

## Genomen maatregelen

1. Direct na het incident (21:36:25 UTC) zijn geen verzoeken meer met het adres verstuurd.
2. Repository, git-geschiedenis en code gecontroleerd: het adres staat nergens en er is geen code met zo'n header.
3. Nieuwe controle `tools/check-pii.mjs`: zoekt e-mailadressen en Nederlandse telefoonnummers in alle getrackte tekstbestanden. Hij draait mee met `npm test` (`npm run check:pii`) en faalt bij een vondst.
4. Vaste regel toegevoegd aan `docs/SECURITY.md` (§11, "Agenten en externe verzoeken").

## Voorkomen

- Nooit persoonsgegevens (e-mailadres, naam, telefoonnummer, tokens) in headers, query's of formulieren naar derden, tenzij Martijn dat voor die dienst expliciet vraagt.
- Waar een dienst contactinformatie in de User-Agent vraagt: een generieke User-Agent zoals `RANK11-research/1.0 (contact via repository)` met een verwijzing naar de projectpagina, geen persoonlijk adres.
- Onderzoeksopdrachten aan agenten vermelden deze regel.
