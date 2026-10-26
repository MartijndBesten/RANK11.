# HANDOFF — RANK11.

**Status:** `wacht-op-review`. Ronde 3 (nachtronde) is klaar: de 7 verbeterpunten, het cijferdashboard, de motivatie-engine, het competitiesysteem, de Academy-voorbereiding en de lokale multiplayerserver.
**Bijgewerkt:** 26-10-2026, nacht (Claude Code, cloudsessie).
**Branch:** `main` (gepusht)
**Volgende actor:** Martijn
**Volgende stap:** preview v4 bekijken (https://claude.ai/artifact/L5dsftxHszJFRNqb35xBa9) en `docs/review/v3/`. Daarna V-011 t/m V-016 beantwoorden. V-005 en V-006 blijven nodig vóór iets online kan.

## Ronde 3 (nacht 25 op 26 oktober 2026)

Wat echt werkt en wat demo is: `docs/PROJECT-STATUS.md`. Testresultaten: `docs/TEST-REPORT.md` (188 engine-tests en 44 API-tests groen; overflow-audit 17 routes × 8 schermmaten).

| Verbeterpunt / opdracht | Status |
|---|---|
| 1. Gezichten consistent fotorealistisch | KLAAR: alle 209 portretten (200 spelers, 8 legends, S01), lokaal met FLUX.2 [klein], €0. De app staat op alleen fotoportretten (`PHOTOS_ONLY`); geen getekende koppen meer. Contactbladen visueel gecontroleerd op kwaliteit en anatomie. Onderzoek echte data: `docs/onderzoek/ECHTE_DATA_V2.md`. Echte spelers, clubs en foto's blijven NO-GO zonder licenties. |
| 2. Onderscheidende series | Brons, Zilver, Goud, Rare, Toetsweek Special, Legendary (+ Electric/Seizoen); de demo-collectie bevat ze allemaal; serie-strip in Collectie. |
| 3. Informatieve Home | Gemiddelde met verloop en verandering door de laatste toets, clubniveau met XP per categorie, kluisbalk, volgende beloning (persoonlijke drempel), stijgers/dalers, inzichten, doelen, aankomende toetsen. |
| 4. Navigatie | Home · Club · Competitie · Cijfers · Academy (verborgen als uitgeschakeld), elk met subnavigatie; oude ankers blijven werken. |
| 5. Collectie | Zoeken, filters (serie, positie, elftal, dubbel), sorteren, detailsheet met statistieken, licentieregel en snel verkopen (bevestiging in de pagina). |
| 6. Elftal op kleine telefoons | Hoger veld en kleinere kaarten onder 480 px; geen overlap meer op 320 px. |
| 7. Eén visuele identiteit | Gedeelde bouwstenen in `styles/ui.css` (subnav, panelen, tegels, lijsten, formulieren, labels) in het materiaal van Draft en Kluis. |
| Cijferdashboard en statistieken (P1) | GEBOUWD + OFFLINE GETEST: invoeren (zelf, zonder ouderverificatie), corrigeren, verwijderen, geschiedenis, grafiek per vak, verdeling, records, wat-als met scenario's, "wat moet ik halen", doelen, geplande toetsen, inzichten. |
| Motivatie-engine (P2) | GEBOUWD + OFFLINE GETEST: Prestatie-, Vooruitgangs- en Academy-XP met dag/weekplafonds, idempotente sleutels, achievements zonder streaks. |
| Competitie (P3) | Engine GEBOUWD + OFFLINE GETEST (battle, ranglijst, schema's, toernooi, Grade League). App: demo-pool met computertegenstanders en speelbare kaartbattle. |
| Academy-voorbereiding (P4) | Provider-interface, eventschema, HMAC-verificatie, accountkoppeling, beloningsregels; interne oefenmodule werkt echt. Leeromgeving alleen gelezen, niet gewijzigd; koppeling staat uit (V-012). |
| Multiplayer/backend (P6) | `apps/api` GEBOUWD + OFFLINE GETEST (en `wrangler dev --local`): accounts, pools, battles via Durable Object, competities, cijfers met XP uit de motivatie-engine, grootboek, packs. **Niet uitgerold**, geen account/database aangemaakt, app nog niet gekoppeld. |
| Draftbalans | 10.000-draft-simulatie: de getoonde kansen weken af. Opgelost en de gemeten kansen worden getoond (`docs/SIMULATIES.md`). |
| Transfermarkt | Engine met tests (alleen coins, prijsband, escrow, afkoelperiode, limieten); nog geen scherm (V-015). |
| Meldingen | Instellingen met stille uren, één melding per wachtende beloning; geen pushmeldingen. |

**Niet gedaan of niet gelukt:**
- Niets gepubliceerd naar productie. Geen nieuwe diensten aangemaakt.
- Geen ouderaccount/toestemmingsflow: blokkeert productie (V-005, V-007).
- Gelijkeniscontrole van portretten alleen visueel (V-010).
- **Incident:** de onderzoeksagent heeft bij zes verzoeken naar Wikimedia Commons per vergissing het e-mailadres van Martijn in de User-Agent-header meegestuurd. Daarna is dat gestopt. Er is niets anders gelekt en het adres staat niet in de repository.

**Bestanden ronde 3 (belangrijkste):**
- Engine: `packages/engine/src/{stats,gradebook,goals,insights,motivation,achievements,academy,gradeLeague,market,simulate}.ts`, `competition/*`, tests in `packages/engine/test/`
- Web: `apps/web/src/App.tsx`, `state/{store.tsx,school.ts,gradeData.ts}`, `screens/grades/*`, `screens/{Hub,CollectionScreen,CompetitionScreen,BattleView,AcademyScreen,SettingsSheet}.tsx`, `competition/demoPool.ts`, `academy/demoProvider.ts`, `components/{charts,SubNav}.tsx`, `styles/ui.css`, `portraits/{registry.ts,manifest.json}`, `public/portraits/*.webp`
- Server: `apps/api/**` (README met endpoints, datamodel en uitrolstappen)
- Tools: `tools/portretten/{export-jobs.ts,batch.py,manifest.mjs,catalogus-jobs.json}`, `tools/sim/balans.ts`, `tools/preview.py`
- Docs: `README.md`, `docs/{PROJECT-STATUS,ARCHITECTURE,GAME-DESIGN,DESIGN-SYSTEM,GRADE-ENGINE,GRADE-INSIGHTS,MOTIVATION-ENGINE,ACADEMY-INTEGRATION,COMPETITION-SYSTEM,MULTIPLAYER,REWARD-ECONOMY,SECURITY,TEST-REPORT,SIMULATIES,ROADMAP,OPEN-ISSUES}.md`, `docs/onderzoek/{LEEROMGEVING,VERGELIJKBARE-APPS,ECHTE_DATA_V2}.md`
- `VRAGEN.md`: V-001, V-002, V-004 en V-009 verwerkt; nieuw V-011 t/m V-016.

**Open vragen:** V-003, V-005, V-006, V-007, V-008, V-010, V-011, V-012, V-013, V-014, V-015, V-016.

**Bouwstenenbibliotheek (ronde 3):** beoordeeld, nog geen PR. Kandidaten zodra ze server-side in gebruik zijn: (1) cijferboek als eventlog met XP-ledger en plafonds, (2) balanssimulatie die getoonde kansen controleert, (3) MatchDO-kern met opslagadapter, (4) grootboek met trigger tegen negatief saldo, (5) lokale AI-portretpijplijn. Aanmelden via een aparte `bibliotheek/*`-PR in de workbench.

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
