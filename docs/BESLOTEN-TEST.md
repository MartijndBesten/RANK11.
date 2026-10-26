# Besloten online test met echte gebruikers: wat is nodig?

**Stand:** 26-10-2026. **Doel:** in één overzicht wat juridisch, technisch en organisatorisch geregeld moet zijn vóór een kleine, besloten online test met echte kinderen van 10 tot 16 jaar.

> **Geen juridisch advies.** Dit is een inventarisatie op basis van openbare bronnen. Bij elke juridische uitspraak staat de bron en of die op 26-10-2026 is nagelezen. Laat de conclusies toetsen door een privacyjurist voordat echte gebruikers meedoen.

Dit overzicht staat los van de ontwikkeling. Lokaal bouwen en testen met synthetische accounts kan gewoon doorgaan (zie §5).

---

## 1. Minimale juridische voorwaarden

| # | Voorwaarde | Waarom | Bron | Nagelezen |
|---|---|---|---|---|
| J1 | **Toestemming van ouder/voogd voor kinderen onder 16** als de verwerking op toestemming steunt | Art. 8 AVG: bij een online dienst die rechtstreeks aan kinderen wordt aangeboden is onder 16 jaar toestemming van de ouder nodig. Lidstaten mogen naar 13 jaar zakken; Nederland heeft 16 gehouden. Art. 5 lid 1 UAVG vraagt de toestemming van de wettelijk vertegenwoordiger onder 16 jaar (versie geldig vanaf 1-9-2026). Vanaf 12 jaar kan het kind de toestemming zelf intrekken (lid 3) | [AVG art. 8](https://gdpr-text.com/nl/read/article-8/), [UAVG](https://wetten.overheid.nl/BWBR0040940) | Ja (UAVG-tekst gelezen; nieuwste wijzigingshistorie niet vergeleken) |
| J2 | **Redelijke controle dat het echt de ouder is** | Art. 8 lid 2 AVG: de aanbieder doet redelijke inspanningen om te verifiëren dat de toestemming van de ouder komt | [AVG art. 8](https://gdpr-text.com/nl/read/article-8/) | Ja |
| J3 | **Wie is verwerkingsverantwoordelijke?** (Martijn als persoon, Denckh of een school) | Bepaalt wie de plichten draagt: privacyverklaring, rechten van betrokkenen, datalekken | AVG art. 4 lid 7 en art. 24 | Algemeen bekend; niet apart nagelezen |
| J4 | **Grondslag per verwerking vastleggen** (toestemming ouder; mogelijk "uitvoering overeenkomst" voor het account zelf) | Zonder grondslag is verwerken onrechtmatig. Cijfers van kinderen zijn geen bijzondere persoonsgegevens, maar wel gevoelig | AVG art. 6 | Algemeen bekend |
| J5 | **DPIA uitvoeren** (gegevensbeschermingseffectbeoordeling) | Kinderen als kwetsbare groep plus gedragsbeïnvloeding (XP, beloningen) en ranglijsten maken een hoog risico aannemelijk. De AP-lijst met verplichte DPIA's noemt onder meer profilering en het observeren en beïnvloeden van gedrag. Een DPIA voor een kleine test is ook zonder verplichting verstandig | AVG art. 35; [AP-lijst (via samenvatting)](https://www.dirkzwager.nl/kennis/artikelen/definitieve-nederlandse-lijst-verwerkingen-waarbij-dpia-gegevensbeschermingseffectbeoordeling-verplicht-is-gepubliceerd) | Gedeeltelijk: alleen secundaire bron gelezen, de Staatscourant-tekst niet |
| J6 | **Verwerkersovereenkomst met de hostingpartij** (Cloudflare) | Cloudflare verwerkt de gegevens namens de verantwoordelijke. Cloudflare's DPA (v6.4, 3-4-2026) zegt van toepassing te zijn op Enterprise- en Self-Serve-overeenkomsten. Hoe dat bij het gratis plan precies wordt aanvaard, is niet vastgesteld | AVG art. 28; [Cloudflare DPA](https://www.cloudflare.com/cloudflare-customer-dpa/) | Gedeeltelijk |
| J7 | **Privacyverklaring in begrijpelijke taal**, voor kinderen én ouders | Art. 12 AVG: informatie moet beknopt en begrijpelijk zijn, zeker voor kinderen | AVG art. 12–13 | Algemeen bekend |
| J8 | **Rechten van betrokkenen werkend maken**: inzage, correctie, verwijderen, export | Art. 15–20 AVG. Voor kinderen van 12–16 kunnen zij zelf of de ouder deze rechten uitoefenen (UAVG art. 5 lid 4) | AVG art. 15–20, [UAVG](https://wetten.overheid.nl/BWBR0040940) | Ja (UAVG) |
| J9 | **Datalekprocedure** | Art. 33–34 AVG: binnen 72 uur melden bij de AP als er waarschijnlijk risico is, en alle incidenten intern registreren | AVG art. 33–34 | Algemeen bekend |
| J10 | **AI-label op portretten** | AI Act art. 50 geldt sinds 2-8-2026. De labelplicht voor deepfakes gaat over realistische weergaven van *bestaande* personen. Onze portretten zijn fictief, dus waarschijnlijk geen deepfake, maar een korte AI-vermelding is laagdrempelig en sluit aan bij de transparantielijn. Het "AI"-label op kaarten bestaat al | [ICTRecht](https://www.ictrecht.nl/en/blog/let-op-ai-act-transparantieverplichtingen-zijn-nu-écht-in-werking), [Opsio](https://opsiocloud.com/nl/knowledge-base/ai-act-artikel-50-transparantie/) | Gedeeltelijk: secundaire bronnen, de verordening zelf niet |
| J11 | **Geen kansspel en geen echt geld** | Packs zijn alleen met verdiende spelcoins te openen, coins zijn niet te koop en de kansen zijn zichtbaar. Zo houden, en geen betaalfuncties toevoegen | `docs/HAALBAARHEID.md`, `docs/onderzoek/BRONNENONDERZOEK.md` | Eerder onderzocht (ronde 1) |
| J12 | **Code voor Kinderrechten als ontwerpkader** | Geen wet, maar gebaseerd op het VN-Kinderrechtenverdrag en de AVG; de ACM onderschrijft de code. Tien principes, onder meer het belang van het kind voorop, privacy by design en geen economische uitbuiting | [Universiteit Leiden](https://www.universiteitleiden.nl/nieuws/2021/03/code-voor-kinderrechten-ontwerpen-in-het-belang-van-het-kind), [NJB](https://www.njb.nl/nieuws/code-voor-kinderrechten-apps-en-games-ontwikkelen-in-het-belang-van-het-kind) | Gedeeltelijk: de code zelf (codevoorkinderrechten.nl) niet nagelezen |
| J13 | **Algemene voorwaarden en spelregels voor de test** | Consumentenrecht geldt ook bij een gratis dienst met minderjarigen. Een korte testovereenkomst met de ouders voorkomt misverstanden (testfase, gegevens worden gewist, geen garantie) | Algemeen | Niet nagelezen |

**Belangrijke nuance:** ook voor een besloten test van een paar weken met bekende kinderen gelden de AVG-plichten volledig. De omvang verlaagt het risico, niet de plicht.

---

## 2. Technische voorwaarden

| # | Voorwaarde | Stand in `apps/api` |
|---|---|---|
| T1 | **Ouderaccount en toestemmingsflow**: de ouder maakt het account of keurt het goed, bijvoorbeeld via een link per e-mail. Dat is de enige plek waar een e-mailadres nodig is, en dan van de ouder | Niet gebouwd. Het account bestaat nu uit gebruikersnaam en wachtwoord met een uitnodigingscode |
| T2 | **Dataminimalisatie**: geen e-mail of geboortedatum van het kind; alleen gebruikersnaam, clubnaam, cijfers en spelgegevens | Gedeeltelijk: het kind geeft geen e-mail of geboortedatum op. Toetsnamen zijn vrije tekst en kunnen namen van docenten of school bevatten (lengte begrenzen, waarschuwing tonen) |
| T3 | **Verwijderen en exporteren** van alle gegevens van een account (cijfers, collectie, wedstrijden, audit) | Niet gebouwd |
| T4 | **Bewaartermijnen** plus een opschoontaak (cron) voor sessies, auditlog, idempotentiesleutels en verlopen uitnodigingen | Niet gebouwd. Termijnen moeten nog worden bepaald |
| T5 | **EU-jurisdictie voor D1**: database aanmaken met `--jurisdiction eu`. Dat kan alleen bij het aanmaken. Let op: dit bepaalt alleen waar de data staat, niet van waar Workers erbij kunnen | Voorbereid in `apps/api/README.md`, nog niet aangemaakt. [Cloudflare D1 data location](https://developers.cloudflare.com/d1/configuration/data-location/) |
| T6 | **Bot- en misbruikbescherming**: Turnstile bij registreren en inloggen. Turnstile verwerkt volgens Cloudflare alleen gegevens die strikt nodig zijn | Niet gebouwd. [Turnstile](https://developers.cloudflare.com/turnstile/) |
| T7 | **Rate limiting** op inloggen, registreren, cijfers en uitdagingen | Gedeeltelijk: alleen een D1-teller op inloggen |
| T8 | **Logging zonder persoonsgegevens**: geen cijfers, tokens of IP-adressen in logs; IP's alleen gehasht voor rate limiting | Gedeeltelijk: IP en gebruikersnaam worden gehasht in de rate-limit-tabellen. De Workers-logs van Cloudflare zelf zijn niet beoordeeld |
| T9 | **Isolatie tussen accounts en pools** aantoonbaar getest: niemand ziet of wijzigt andermans cijfers of collectie | Gedeeltelijk: getest voor pools (niet-lid krijgt 404) en voor eigen cijfers. Brede tests met meerdere accounts volgen in deze ronde |
| T10 | **Incidentprocedure** met contactpersoon, registratie (zoals `docs/INCIDENT-2026-10-25-user-agent.md`) en de 72-uurstermijn | Werkwijze bestaat; contactpersoon nog niet vastgelegd |
| T11 | **Back-ups en herstel**: D1 Time Travel / point-in-time restore testen, en een plan voor als de test stopt (alles wissen) | Niet gedaan |
| T12 | **Beveiligingsreview** van de API vóór openstelling: authenticatie, CSRF, sessies, idempotentie, invoervalidatie | Basis staat (PBKDF2, gehashte sessies, CSRF-check, foutmeldingen zonder details). Er is nog geen onafhankelijke review gedaan |
| T13 | **Moderatie**: filter op gebruikers-, club- en poolnamen, plus een meldknop | Niet gebouwd |
| T14 | **Transfermarkt uit**: staat al uit via een feature flag (V-015) | Wordt in deze ronde gebouwd |

---

## 3. Organisatorisch

- **Verwerkingsverantwoordelijke:** kiezen tussen Martijn als privépersoon, Denckh of de school, en dat vastleggen (V-005).
- **Contactpunt** voor ouders en kinderen: één adres of telefoonnummer, vermeld in de privacyverklaring. Niet in de code.
- **Privacyverklaring** in twee versies: een voor kinderen (korte zinnen, met voorbeelden) en een voor ouders.
- **Testgroepafspraken:**
  - kleine groep (bijvoorbeeld 4–8 kinderen) met bekende ouders;
  - vaste looptijd;
  - aan het eind worden alle gegevens gewist;
  - kinderen kunnen op elk moment stoppen;
  - het spel zet geen druk (geen streaks, stille uren).
- **Minimumleeftijd** bepalen (V-007).
- **Wie mag uitnodigen:** alleen de beheerder maakt pool- en platformcodes.

---

## 4. Checklist

| # | Taak | Eigenaar | Status |
|---|---|---|---|
| 1 | Verwerkingsverantwoordelijke kiezen (V-005) | Martijn | nog niet gedaan |
| 2 | Minimumleeftijd en testgroep bepalen (V-007) | Martijn | nog niet gedaan |
| 3 | DPIA opstellen (met sjabloon), laten toetsen | Martijn + ontwikkeling | nog niet gedaan |
| 4 | Cloudflare-account en testomgeving (V-006), DPA nagaan | Martijn | nog niet gedaan |
| 5 | Ouderaccount + toestemmingsflow + verificatie | ontwikkeling | nog niet gedaan |
| 6 | Privacyverklaring (kind + ouder), testafspraken, voorwaarden | Martijn (ontwikkeling levert concept) | nog niet gedaan |
| 7 | Verwijderen en exporteren per account | ontwikkeling | nog niet gedaan |
| 8 | Bewaartermijnen + opschoontaak | Martijn (termijnen) + ontwikkeling | nog niet gedaan |
| 9 | Turnstile + rate limiting op alle gevoelige endpoints | ontwikkeling | gedeeltelijk |
| 10 | Isolatietests met meerdere accounts | ontwikkeling | gedeeltelijk (deze ronde) |
| 11 | D1 met EU-jurisdictie aanmaken | ontwikkeling (na 4) | nog niet gedaan |
| 12 | Back-up/herstel en "alles wissen" getest | ontwikkeling | nog niet gedaan |
| 13 | Beveiligingsreview van de API | ontwikkeling + externe blik | gedeeltelijk |
| 14 | Moderatie van namen + meldknop | ontwikkeling | nog niet gedaan |
| 15 | Incidentprocedure met contactpersoon | Martijn | gedeeltelijk |
| 16 | Gelijkeniscontrole portretten en merkcheck namen (V-010) | Martijn | nog niet gedaan |
| 17 | Expliciete goedkeuring voor uitrol | Martijn | nog niet gedaan |

---

## 5. Niet nodig voor lokale ontwikkeling

Dit hoeft niet af te zijn om lokaal door te bouwen en te testen. Voorwaarde is dat er alleen **synthetische testaccounts en verzonnen cijfers** worden gebruikt:

- geen DPIA, toestemmingsflow, privacyverklaring of verwerkersovereenkomst;
- geen Cloudflare-account: de backend draait volledig lokaal met `wrangler dev --local` (miniflare) en een lokale SQLite;
- geen Turnstile of productie-rate-limits;
- meerdere testaccounts, pools en battles tussen accounts kunnen lokaal met Playwright worden getest;
- de statische reviewpreview blijft een demo zonder server.

Zodra er één echte leerling of één echt cijfer in het systeem komt, gelden §1 tot en met §4 volledig.
