# RANK11. — privacy-voorbereiding (AVG) vóór echte leerlinggegevens

**Status:** de besloten gezinsproef draait **uitsluitend met fictieve testgegevens**. Dit document
bereidt het gebruik met echte (mogelijk minderjarige) gebruikers voor. Een geslaagde technische
uitrol is **geen** juridische goedkeuring. Vóór één echt cijfer of één echte leerling moet de
vrijgavecheck onderaan volledig "akkoord" zijn.

## 1. Wat de app nu al doet (ingebouwd)

- **Dataminimalisatie:** geen e-mailadres, geen geboortedatum, geen echte naam vereist. Een account is
  gebruikersnaam + wachtwoord (PBKDF2-SHA256, alleen de hash opgeslagen) + een uitnodigingscode.
  Gebruikers wordt gevraagd geen echte naam als gebruikersnaam te kiezen.
- **Opslag in de EU:** D1-database `rank11` is aangemaakt met **expliciete EU-jurisdictie**
  (`--jurisdiction eu`), niet alleen een regio-hint. Cloudflare is de verwerker.
- **Inzage en overdraagbaarheid (art. 15/20):** `GET /api/me/export` geeft alle eigen gegevens als JSON.
- **Verwijdering (art. 17):** `DELETE /api/me` verwijdert het account en de persoonlijke gegevens;
  pool-eigendom gaat over of de pool vervalt.
- **Beveiliging:** HTTPS, HttpOnly/Secure/SameSite=Strict-sessiecookies, rate limiting op inloggen,
  toegang tot de besloten omgeving achter HTTP Basic Auth, registratie alleen op uitnodiging,
  `noindex` zodat zoekmachines niets indexeren, isolatie tussen accounts (getest).
- **Feedback** bevat alleen de melding, de soort en de accountkoppeling; geen extra persoonsgegevens.

## 2. Nog af te ronden vóór echte leerlinggegevens

| Onderwerp | Wat nodig is | Status |
|---|---|---|
| Privacyverklaring | Begrijpelijke uitleg (ook voor kinderen/ouders): welke gegevens, waarom, hoe lang, rechten, contact | Nog opstellen |
| Ouderlijke toestemming | Voor gebruikers onder 16 (NL): aantoonbare toestemming van een ouder/voogd vóór verwerking | Nog inrichten |
| Rechtsgrond | Vastleggen: toestemming (art. 6 lid 1a + art. 8 AVG voor kinderen) | Nog vastleggen |
| Bewaartermijnen | Concreet beleid: hoe lang cijfers/accounts bewaard blijven, automatisch opschonen | Nog bepalen |
| Verwerkersovereenkomst | Met Cloudflare (verwerker) een DPA/verwerkersovereenkomst | Controleren/afsluiten |
| Verwerkers-/subverwerkersoverzicht | Cloudflare (Workers, D1 EU, R2); geen verdere doorgifte buiten de EU zonder grondslag | Opstellen |
| Doorgifte buiten de EU | Bevestigen dat opslag en verwerking in de EU blijven (D1 EU-jurisdictie; R2-regio controleren) | Controleren |
| DPIA-toets | Beoordelen of een DPIA wettelijk vereist is (kinderen = kwetsbare groep, systematische verwerking). Zo ja: uitvoeren | Nog uitvoeren |
| Datalek-/incidentprocedure | Wie, hoe melden, binnen 72 uur bij de AP indien vereist | Nog vastleggen |
| Beveiligingsreview | Externe blik op de API en toegang vóór echte data | Gedeeltelijk |

## 3. Expliciete vrijgavecheck (gate) — niet overslaan

Echte (minderjarige) gebruikers worden **pas** toegelaten als ALLE punten hieronder aantoonbaar akkoord zijn:

1. Privacyverklaring gepubliceerd en vindbaar in de app.
2. Werkende, aantoonbare ouderlijke-toestemmingsstroom voor onder-16.
3. Bewaartermijnen vastgelegd en technisch afdwingbaar.
4. Verwerkersovereenkomst met Cloudflare rond.
5. Verwerkersoverzicht compleet; geen ongedekte doorgifte buiten de EU.
6. DPIA-noodzaak beoordeeld en (indien nodig) uitgevoerd.
7. Datalekprocedure met contactpersoon vastgelegd.
8. Inzage- en verwijderfuncties getest met een echt scenario.
9. Besluit van Martijn op schrift: "vrijgave voor echte gegevens akkoord".

Tot dat moment: **alleen fictieve testgegevens.** De hoofdomgeving blijft achter Basic Auth en op
uitnodiging; de publieke, open toegang blijft uit.

> Dit document is een praktische voorbereiding, geen juridisch advies. Laat de definitieve teksten en
> de DPIA-afweging toetsen aan de actuele AVG en de richtlijnen van de Autoriteit Persoonsgegevens.
