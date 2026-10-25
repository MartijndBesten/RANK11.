# HANDOFF — RANK11.

**Status:** `wacht-op-review` — stap 1–3 afgerond, stap 4 (goedkeuring visuele richting) ligt bij Martijn
**Bijgewerkt:** 25-10-2026, ±20:35 (Claude Code, cloudsessie)
**Branch:** `main` (eerste import in een lege repository)
**Volgende actor:** Martijn
**Volgende stap:** de preview en `docs/review/` beoordelen en V-001 t/m V-008 in `VRAGEN.md` beantwoorden. Daarna start Claude met R1 (zie `docs/ARCHITECTUUR.md`).

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

## Bestanden

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

## Registratie en bibliotheek

- **Projectregister:** RANK11. staat nog niet in `PROJECTS.md` van de workbench. Volgens de werkwijze vult alleen ChatGPT dat aan; daarom heeft Claude het niet gewijzigd.
- **Bouwstenenbibliotheek:** beoordeeld, **geen wijziging nu**. Mogelijke nieuwe bouwstenen zijn:
  - transparante packkansen met een kansentabel per plek en "minstens één", reproduceerbaar met seed;
  - een draft met een garantieteller die aantoonbaar ingrijpt;
  - een beloningsengine met configuratieversie, ontdubbelen en correcties;
  - parametrische SVG-emblemen, vlaggen en portretten.

  Ze worden pas als KANDIDAAT aangemeld (via een aparte `bibliotheek/*`-PR) als de ontwerprichting is goedgekeurd en de modules server-side in gebruik zijn. Nu zijn ze nog prototypecode, dus niet "bewezen".
- **Werkwijze-lessen** (alleen bedoeld voor `werkwijze/LESSEN.md`, niet voor TRILUX): geen nieuwe TRILUX-lessen. Algemene lessen voor deze sessie staan in `docs/TESTRAPPORT.md` (F1–F10).

## Controle vóór commit

De diff is gescand op e-mailadressen, tokens en sleutels: niets gevonden. Er zijn geen klant- of werkgeversgegevens gebruikt. De spelers, clubs en cijfers zijn fictief.
