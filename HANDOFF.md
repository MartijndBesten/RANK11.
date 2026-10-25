# HANDOFF — RANK11.

**Status:** `wacht-op-review`. Ronde 2 is klaar: onderzoek naar echte spelers, twee voorbeeldkaarten met fotoportret en twee bugs opgelost.
**Bijgewerkt:** 25-10-2026, ±22:00 (Claude Code, cloudsessie)
**Branch:** `main`
**Volgende actor:** Martijn
**Volgende stap:** de twee voorbeeldkaarten beoordelen (preview en `docs/review/v2/`) en V-009 en V-010 beantwoorden. Na akkoord vervangt Claude de portretten van de volledige catalogus (zie `docs/portretten/README.md`). V-001 t/m V-008 staan ook nog open.

## Ronde 2 (25-10-2026, avond)

| Onderdeel | Status |
|---|---|
| Onderzoek echte spelers, foto's, licenties, data-API's, Wikimedia Commons, kosten | Afgerond: `docs/onderzoek/ECHTE_SPELERS.md`, met GO/NO-GO per optie. Twee kernclaims zelf nagecontroleerd (Getty-licentie sluit gaming en merchandise uit; Hoge Raad 2022: een lookalike kan een portret zijn). |
| Fotorealistische portretten van fictieve spelers | GEBOUWD: S01 Jesse Hoekstra (Gold) en L01 Marco Steenhuis (Legend). Lokaal gegenereerd met FLUX.2 [klein] 4B (Apache-2.0), uitgesneden met BiRefNet-portrait (MIT), €0. Werkwijze: `docs/portretten/`, scripts in `tools/portretten/`. |
| Nieuw kaartframe | GEBOUWD: eigen silhouet met inkeping, metalen rand, gegraveerde SVG-binnenrand, groot portret, naamplaat. Gold, Rare (zwart-goud), Electric en Legend (parelmoer met goud) verschillen sterk. AI-label op fotokaarten. |
| Vervangbare portretten | GEBOUWD: `Player.photo` (bron, soort, licentie, credit, aiGenerated) plus `apps/web/src/portraits/registry.ts`. Gelicentieerde foto's vervangen alleen dit register. |
| Voorbeeldkaarten in draft, collectie en elftal | Gedaan: draft-lobby (uitgelicht), collectie (bovenaan), elftal (4-4-2 met beide spitsen). |
| Walkout | Uitgebreid: echt fotosilhouet met randlicht, daarna licht de speler op en volgt de kaart. |
| Bug: overlopend veld in de elftalbouwer | Opgelost: de reservebank rekte het raster op; liggende telefoons hebben een eigen indeling. Getest op 8 schermmaten × 5 schermen, geen horizontale overloop. |
| Bug: melding bij elke laadbeurt | Opgelost: de melding verschijnt één keer per nieuw cijfer, opgeslagen in de speltoestand (de preview start elke keer een nieuwe sessie, dus sessionStorage werkte niet). Getest: laadbeurten 1/2/3 geven 1/0/0 meldingen. |
| Bestaande functionaliteit | Volledige doorloop op 390×844 en 360×740 zonder fouten; eindstand nagerekend. Engine 67/67 tests. |

**Niet gelukt of niet gedaan:**
- Een tijdelijke generator-Worker op het Cloudflare-account is door de permissiecontrole geweigerd (wijziging aan een gedeelde omgeving). Daarom is lokaal gegenereerd, met hetzelfde model en dezelfde licentie.
- De volledige catalogus is bewust nog niet vervangen; dat wacht op V-009.
- Er is geen gelijkeniscontrole met software gedaan, alleen een visuele controle.

## Huidige opdracht

Masterprompt RANK11. (25-10-2026): stap 1 haalbaarheid, stap 2 GDD, stap 3 vier premium prototypeschermen, stap 4 review. Stoppen voor goedkeuring van de visuele richting.

## Wat er gedaan is

Statusladder: BESLOTEN → GEBOUWD → OFFLINE GETEST → PRAKTIJKGETEST → LIVE GECONTROLEERD.

| Onderdeel | Status |
|---|---|
| Haalbaarheidsonderzoek en GO/NO-GO per onderdeel | Afgerond; twee kernclaims zelf nagecontroleerd |
| Game Design Document (concept) | Geschreven |
| Architectuur en releaseplan R1–R8 | Geschreven |
| Engine: cijfers, beloningen, catalogus, packs, draft, elftal | GEBOUWD + OFFLINE GETEST (65/65 tests) |
| Prototype: home, Cijferkluis-onthulling, pack-opening met walkout, Ultimate Draft, elftalbouwer | GEBOUWD + OFFLINE GETEST (Playwright-doorloop op telefoon en tablet, 0 consolefouten); **niet** PRAKTIJKGETEST op echte toestellen |
| Reviewpreview (privé Artifact, één HTML-bestand) | Gepubliceerd: https://claude.ai/artifact/L5dsftxHszJFRNqb35xBa9 — dit is een privé reviewpagina, geen productie |

**Belangrijk:** het prototype draait volledig in de browser, met lokale demo-data en fictieve spelers. Er is nog geen server, geen account en geen multiplayer; dat is fase 5.

## Bestanden (ronde 2 aanvullend)

- `docs/onderzoek/ECHTE_SPELERS.md`, `docs/portretten/README.md`, `docs/portretten/PROMPTS.md`, `docs/review/v2/*.jpg`
- `tools/portretten/{gen.py,cutout.py,requirements.txt,voorbeeld-jobs.json}`
- `packages/engine/src/catalog.ts` (PortraitAsset, `photos`-optie, voorbeeldspeler S01), `packages/engine/src/draft.ts` (uitgelicht)
- `apps/web/src/components/{PlayerCard.tsx,CardFrame.tsx,card.css,Walkout.tsx,walkout.css}`, `apps/web/src/portraits/*`, `apps/web/src/state/store.tsx`, `apps/web/src/App.tsx`, CSS van schermen

## Bestanden (ronde 1)

- **Project:** `PROJECT.md`, `HANDOFF.md`, `VRAGEN.md`, `README.md`
- **Documentatie:**
  - `docs/HAALBAARHEID.md`
  - `docs/onderzoek/BRONNENONDERZOEK.md`
  - `docs/GDD.md`
  - `docs/ARCHITECTUUR.md`
  - `docs/TESTRAPPORT.md`
  - `docs/review/*.jpg` (16 telefoon, 8 tablet)
- **Engine:** `packages/engine/src/{rng,grades,catalog,packs,squad,draft,rewards,index}.ts` en `packages/engine/test/*.test.ts`
- **Web:**
  - `apps/web/src/App.tsx`
  - `apps/web/src/state/store.tsx`
  - `apps/web/src/screens/*` (Hub, RevealScreen, PackScreen, PackOpening, DraftScreen, SquadScreen)
  - `apps/web/src/components/*` (PlayerCard, Portrait, Flag, Crest, PackArt, Walkout, Pitch, Sparks, Sheet, PackOdds, Icons, Countdown)
  - `apps/web/src/lib/{sound,motion}.ts`

## Draaien

```bash
npm install
npm test              # engine-tests
npm run typecheck
npm run dev           # http://localhost:5173  (?gallery = kaartengalerij)
npm run build:single  # één HTML-bestand in apps/web/dist-single
```

## Blokkades en open vragen

- **V-001:** goedkeuring van de visuele richting. Blokkeert stap 5.
- **V-002:** portretstijl.
- **V-003:** fictieve catalogus.
- **V-004:** cijferbron zonder Magister.
- **V-005:** verwerkingsverantwoordelijke en DPIA. Blokkeert productie met echte kinderen.
- **V-006:** Cloudflare-testomgeving aanmaken. Blokkeert de multiplayer-e2e in fase 5.
- **V-007:** minimumleeftijd.
- **V-008:** namen van spelmodi (merkrisico).
- **V-009:** voorbeeldkaarten goedgekeurd → volledige catalogus vervangen?
- **V-010:** AI-portretten en de plek van de AI-vermelding.

## Registratie en bibliotheek

- **Projectregister:** RANK11. staat nog niet in `PROJECTS.md` van de workbench. Volgens de werkwijze vult alleen ChatGPT dat aan; daarom heeft Claude het niet gewijzigd.
- **Bouwstenenbibliotheek (ronde 2):** nieuwe kandidaat: lokale, kosteloze pijplijn voor fotorealistische AI-portretten met een Apache-2.0-model en uitsnede (`tools/portretten/`). Die wordt aangemeld als KANDIDAAT via een aparte `bibliotheek/*`-PR, zodra het gebruik voor de volledige catalogus bewezen is. Nu nog niet toegevoegd.
- **Bouwstenenbibliotheek (ronde 1):** beoordeeld, **geen wijziging nu**. Mogelijke nieuwe bouwstenen zijn:
  - transparante packkansen met een kansentabel per plek en "minstens één", reproduceerbaar met seed;
  - een draft met een garantieteller die aantoonbaar ingrijpt;
  - een beloningsengine met configuratieversie, ontdubbelen en correcties;
  - parametrische SVG-emblemen, vlaggen en portretten.

  Ze worden pas als KANDIDAAT aangemeld (via een aparte `bibliotheek/*`-PR) als de ontwerprichting is goedgekeurd en de modules server-side in gebruik zijn. Nu zijn ze nog prototypecode, dus niet "bewezen".
- **Werkwijze-lessen** (alleen bedoeld voor `werkwijze/LESSEN.md`, niet voor TRILUX): geen nieuwe TRILUX-lessen. Algemene lessen voor deze sessie staan in `docs/TESTRAPPORT.md` (F1–F10).

## Controle vóór commit

De diff is gescand op e-mailadressen, tokens en sleutels: niets gevonden. Er zijn geen klant- of werkgeversgegevens gebruikt. De spelers, clubs en cijfers zijn fictief.
