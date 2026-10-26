# RANK11.

**Your grades. Your squad.** Een multiplayer voetbalkaartgame waarin schoolcijfers je spelers, packs en beloningen opleveren. Mobile-first PWA voor iPhone, Android, tablet en desktop.

> **Status (26-10-2026):** prototype met lokale opslag. Cijfers, statistieken, doelen, XP, packs, draft, elftal, collectie en de Academy-oefenmodule werken echt. De competitie speelt tegen computertegenstanders. De multiplayerserver is gebouwd en lokaal getest, maar staat niet online. Zie [docs/PROJECT-STATUS.md](docs/PROJECT-STATUS.md) en [HANDOFF.md](HANDOFF.md).

## Navigatie

Home · Club (Elftal, Collectie, Packs, Draft) · Competitie (Overzicht, Grade League, RANK League, Pools) · Cijfers (Overzicht, Vakken, Invoeren, Doelen, Wat als, Kluis) · Academy (Overzicht, Oefenen; alleen zichtbaar als ingeschakeld).

## Structuur

```
packages/engine   spelregels in pure TypeScript: cijfers, statistieken, inzichten, motivatie/XP, achievements,
                  Academy, Grade League, beloningen, packs, draft, elftal, transfermarkt, competitie, simulaties
apps/web          React + Vite PWA (lokale store = toekomstige API-client)
apps/api          Cloudflare Worker + D1 + Durable Objects (lokaal, niet uitgerold)
tools/            portretpijplijn (FLUX.2 [klein], lokaal), balanssimulaties, previewbouw
docs/             zie hieronder
```

## Documentatie

[PROJECT-STATUS](docs/PROJECT-STATUS.md) · [ARCHITECTURE](docs/ARCHITECTURE.md) · [GAME-DESIGN](docs/GAME-DESIGN.md) · [DESIGN-SYSTEM](docs/DESIGN-SYSTEM.md) · [GRADE-ENGINE](docs/GRADE-ENGINE.md) · [GRADE-INSIGHTS](docs/GRADE-INSIGHTS.md) · [MOTIVATION-ENGINE](docs/MOTIVATION-ENGINE.md) · [ACADEMY-INTEGRATION](docs/ACADEMY-INTEGRATION.md) · [COMPETITION-SYSTEM](docs/COMPETITION-SYSTEM.md) · [MULTIPLAYER](docs/MULTIPLAYER.md) · [REWARD-ECONOMY](docs/REWARD-ECONOMY.md) · [SECURITY](docs/SECURITY.md) · [TEST-REPORT](docs/TEST-REPORT.md) · [SIMULATIES](docs/SIMULATIES.md) · [ROADMAP](docs/ROADMAP.md) · [OPEN-ISSUES](docs/OPEN-ISSUES.md) · onderzoek in [docs/onderzoek/](docs/onderzoek/)

## Ontwikkelen

```bash
npm install
npm test                 # engine + api
npm run typecheck
npm run dev              # http://localhost:5173  (#kaarten = kaartengalerij)
npm run build:single     # één HTML-bestand; daarna: python3 tools/preview.py apps/web/dist-single/index.html <uit.html>
node tools/portretten/manifest.mjs                                   # na nieuwe portretten
node --experimental-transform-types tools/sim/balans.ts > docs/SIMULATIES.md   # balansrapport + gemeten draftkansen
```

## Uitgangspunten

- Geen echt geld.
- Alle spelers en clubs zijn fictief. Gelijkenis met bestaande personen is toeval.
- Schoolcijfers zijn alleen zichtbaar voor de leerling zelf.
- Geen kopie van beschermde vormgeving, logo's of assets van commerciële voetbalgames.
