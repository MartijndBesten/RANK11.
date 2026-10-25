# Testrapport — designprototype (stap 3)

**Datum:** 25-10-2026 · **Commit:** zie `HANDOFF.md` · **Omgeving:** Claude Code-cloudsessie, Node 22, Chromium (Playwright)

## 1. Automatische tests engine (`npm test`)

**65 van 65 geslaagd** (Vitest 5, 4 testbestanden, gedraaid 25-10-2026).

| Gebied | Wat wordt bewezen |
|---|---|
| Gewogen gemiddelden | Schoolweging, simulaties tellen niet mee, gemiddelde van vakgemiddelden, lege lijst |
| Wat-als en doelcijfer | "8,5 die 3× telt" exact, dalende trend, ongeldige invoer geweigerd, benodigd cijfer en haalbaarheid |
| Validatie | Grenzen 1–10, maximaal twee decimalen (zonder afrondingsfout bij 8,55), weging, geen datum in de toekomst, verplichte velden |
| Ontdubbelen | Dezelfde toets ondanks hoofdletters en leestekens; externe bronsleutel |
| Beloningen | Alle tiers, onvoldoende (alleen steun-XP), spelerskeuze bij 9,5+, vouchers, simulatie = 0, bonussen voor weging en verbetering, dubbele invoer, correctie omhoog (alleen het verschil), correctie omlaag, limieten per dag en week, plafond voor niet-geverifieerde cijfers, optionele tier-verhoging |
| Catalogus | Deterministisch, ratingschaal, unieke ID's, alle benodigde zeldzaamheden aanwezig |
| Packs | Geldig tegen de catalogus, reproduceerbaar met seed, geen dubbele speler, beste kaart als laatste, 80+-garantie in het Goudpack (300 openingen), waargenomen Legend-kans 1,5–2,5% bij een getoonde 2% (20.000 openingen), kansentabel per plek en "minstens één", lege categorie geweigerd |
| Elftal | Positiefit en strafpunten, beste elftal met unieke spelers en een echte keeper, teamrating, chemie, kandidatenlijst, formatiewissel zonder spelersverlies |
| Draft | 11×5 unieke tijdelijke kaarten, keepers alleen op keeperplek, kiezen alleen uit het aanbod en één keer per positie, garantie B binnen 10 en A binnen 50 drafts (600 drafts, garantie grijpt aantoonbaar in), kans B+ per draft tussen 8% en 35%, reproduceerbaar |

Typecheck (`npm run typecheck`, TypeScript strict): geslaagd voor engine en web.

## 2. Doorloop als gebruiker (Playwright, klikken zoals een gebruiker)

Script: een volledige doorloop op **telefoon (390×844)** en **tablet landscape (1180×820)**. Bij elke run: **0 consolefouten**.

1. Kluis: nieuw cijfer, deur ingedrukt houden, vak, weging, rolteller, gemiddelde, beloning.
2. Pack openen, walkout (vlag, positie, club, silhouet, kaart), alle kaarten bekijken.
3. Cijfer 9,6: overslaan, spelerskeuze, walkout, collectie.
4. Cijfer 4,8: volledige animatie, Herstelkans en herstelchallenge.
5. Draft: start (voucher −1), 11 keuzes, resultaat.
6. Elftal: wisselen, vergelijken, plaatsen, beste elftal.

**Eindstand na de doorloop, nagerekend tegen de regels:**
- coins 12.450 → 14.150;
- XP 2.340 → 2.955;
- vouchers 2 → 3;
- collectie 35 → 41 (5 uit de pack, 1 spelerskeuze);
- 3 cijfers verwerkt, 0 open.

### Gevonden en opgeloste fouten

| # | Fout | Oplossing |
|---|---|---|
| F1 | Draftgarantie was zinloos (Groep B kwam vrijwel altijd voorbij) | Groepen herzien, plus een test dat de garantie echt ingrijpt |
| F2 | Draft te traag (catalogus per kaart opnieuw gefilterd) | Groepsindex per draft |
| F3 | Dichte kaart toonde de gespiegelde voorkant (`filter` maakte het 3D-element plat) | Schaduw losgekoppeld |
| F4 | Volledig-schermonthulling was doorzichtig (CSS-specificiteit) | Selector aangepast |
| F5 | Gemiddelde verscheen vóór het cijfer (rolteller duurde ±8 s) | Volgende stap pas na het landen; rol ±2 s |
| F6 | Walkout na spelerskeuze ingesloten in een kader (fixed binnen getransformeerde ouder) | Portal naar `body` |
| F7 | Demo-collectie zonder keeper (veldspeler stond op doel) | Startfilter plus controle |
| F8 | Veld liep buiten beeld op telefoon | `minmax(0, 1fr)` en `min-width: 0` |
| F9 | Reservebank leeg bij de start | Bank gevuld met de 7 beste reserves |
| F10 | `confirm()` werkt niet in de preview-viewer | Bevestiging op de pagina zelf |

## 3. Niet getest (eerlijk)

- **Echte toestellen.** iPhone Safari, Android Chrome en een echte iPad zijn niet getest; alleen Chromium-emulatie. Geluid op iOS is niet beluisterd.
- **Menselijke praktijktest.** Is het leuk? Begrijpen 12–16-jarigen het? Dit is een kernvraag voor Martijn en testers.
- **Toegankelijkheid.** Er is geen audit gedaan (screenreader, contrastmeting). Wel gebouwd: knoppen met labels, toetsenbordbediening van de kluis, systeeminstelling voor verminderde beweging plus een eigen schakelaar, en overslaan overal.
- **Prestaties** op een instapapparaat, en het gedrag zonder netwerk (er is nog geen serviceworker).
- **Alles wat met de server te maken heeft.** Multiplayer, accounts, pools, battles, transfermarkt en beheer zijn nog niet gebouwd; dat volgt in fase 5. In het prototype draait de beloningslogica in de browser (lokale demo), zonder server-gezag.


## Ronde 2: voorbeeldkaarten en bugfixes (25-10-2026, avond)

- **Engine:** 67 van 67 tests geslaagd. Nieuw: een foto per baseId gaat mee naar alle edities; voorbeeldspeler S01.
- **Typecheck:** engine en web geslaagd.
- **Overloopcontrole (Playwright):**
  - schermen: home, kluis, draft, packs en elftal;
  - schermmaten: 360×740, 375×667, 390×844, 430×932, 844×390, 740×360, 820×1180 en 1180×820;
  - resultaat: **geen horizontale overloop en geen paginafouten**.
  - Vóór de fix liep het elftalscherm op alle telefoonbreedtes over (490 px inhoud door de reservebank). Daarnaast liepen de topbalk en de kluisbanner op 360 en 430 px over.
- **Melding:** drie laadbeurten in nieuwe sessies met dezelfde opslag gaven 1, 0 en 0 meldingen (eerst gaf de testopzet zelf een race; die is gecorrigeerd).
- **Functionele doorloop** op 390×844 en 360×740: kluis, pack en walkout, spelerskeuze, onvoldoende, draft (11 keuzes) en elftal. Geen consolefouten. De eindstand is nagerekend: coins 14.150, XP 2.955, vouchers 3, collectie 43 (35 + 2 voorbeeldkaarten + 5 + 1).
- **Walkout met foto:** de volgorde licht, vlag, positie, club, silhouet, speler licht op, kaart is met screenshots op vaste tijdstippen bevestigd.
- **Niet getest:**
  - echte toestellen;
  - een geautomatiseerde gelijkeniscontrole van de AI-gezichten (alleen visueel gecontroleerd);
  - prestaties bij ±400 fotoportretten (verwachting: lazy loading vanaf CDN is nodig).
