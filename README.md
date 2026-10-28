> **Actualisatie 28-10-2026:** onderstaande historische status kan achterhaald zijn. De actuele synthetische pilotprocedure en resterende uitrolblokkades staan in [docs/PILOT-UITROL.md](docs/PILOT-UITROL.md). Accountexport/verwijderen en importfixes staan in de code; gehoste beveiliging en Cloudflare-resourceconfiguratie zijn nog niet geverifieerd. Geen vrijgave voor echte leerlinggegevens.

# RANK11.

**Your grades. Your squad.** Een multiplayer voetbalkaartgame waarin schoolcijfers je spelers, packs en beloningen opleveren. Mobile-first PWA voor iPhone, Android, tablet en desktop.

> **Status (26-10-2026, ronde 4):** de app is gekoppeld aan de server, maar die draait alleen **lokaal**. Met een testaccount lopen cijfers, beloningen, collectie, Academy, pools, asynchrone battles en ranglijsten via de server; zonder account is er een demo op het toestel. **Er staat niets online**, alleen synthetische testgegevens. Zie [docs/PROJECT-STATUS.md](docs/PROJECT-STATUS.md) en [HANDOFF.md](HANDOFF.md).

## Navigatie

Home · Club (Elftal, Collectie, Packs, Draft) · Competitie (Overzicht, Grade League, RANK League, Pools) · Cijfers (Overzicht, Vakken, Invoeren, Doelen, Wat als, Kluis) · Academy (Overzicht, Oefenen; alleen zichtbaar als ingeschakeld).

## Structuur

```
packages/engine   spelregels in pure TypeScript: cijfers, statistieken, inzichten, motivatie/XP, achievements,
                  Academy, Grade League, beloningen, packs, draft, elftal, transfermarkt, competitie, simulaties
apps/web          React + Vite PWA (demo-store op het toestel, online-store via de API)
apps/api          Cloudflare Worker + D1 + Durable Objects (lokaal, niet uitgerold)
tools/            portretpijplijn (FLUX.2 [klein], lokaal), balanssimulaties, previewbouw
docs/             zie hieronder
```

## Documentatie

[PROJECT-STATUS](docs/PROJECT-STATUS.md) · [ARCHITECTURE](docs/ARCHITECTURE.md) · [GAME-DESIGN](docs/GAME-DESIGN.md) · [DESIGN-SYSTEM](docs/DESIGN-SYSTEM.md) · [GRADE-ENGINE](docs/GRADE-ENGINE.md) · [GRADE-INSIGHTS](docs/GRADE-INSIGHTS.md) · [MOTIVATION-ENGINE](docs/MOTIVATION-ENGINE.md) · [ACADEMY-INTEGRATION](docs/ACADEMY-INTEGRATION.md) · [COMPETITION-SYSTEM](docs/COMPETITION-SYSTEM.md) · [MULTIPLAYER](docs/MULTIPLAYER.md) · [REWARD-ECONOMY](docs/REWARD-ECONOMY.md) · [SECURITY](docs/SECURITY.md) · [TEST-REPORT](docs/TEST-REPORT.md) · [SIMULATIES](docs/SIMULATIES.md) · [ROADMAP](docs/ROADMAP.md) · [OPEN-ISSUES](docs/OPEN-ISSUES.md) · onderzoek in [docs/onderzoek/](docs/onderzoek/)

## Ontwikkelen

```bash
npm install
npm test                 # engine + api + PII-controle
npm run typecheck
npm run dev              # http://localhost:5173  (#kaarten = kaartengalerij)
node tools/dev-online.mjs   # lokale server op :8787 + uitnodigingscode (apps/api/.wrangler/dev-invite.txt)
node tools/e2e/online.cjs   # E2E met twee testaccounts (ook: academy.cjs, demo.cjs, overflow.cjs demo|online)
npm run build:single     # één HTML-bestand; daarna: python3 tools/preview.py apps/web/dist-single/index.html <uit.html>
node tools/portretten/manifest.mjs                                   # na nieuwe portretten
node --experimental-transform-types tools/sim/balans.ts > docs/SIMULATIES.md   # balansrapport + gemeten draftkansen
```

## Cijfers koppelen en importeren

- **Bestandsimport (werkt nu):** Cijfers → Importeren. Plak een lijst of kies een `.csv`/`.txt`-bestand; je ziet een controleoverzicht en al aanwezige cijfers worden overgeslagen (geen dubbele beloningen).
- **Koppelingen (Instellingen → Cijfers koppelen):** een provider-onafhankelijke opzet. De **voorbeeldbron** werkt volledig (koppelen → synchroniseren → ontkoppelen). **Magister** staat op "nog niet beschikbaar": een koppeling per leerling vraagt een officieel toegestane route via de school of een geautoriseerde partner. We benaderen de interne Magister-API niet en vragen nooit om een Magister-wachtwoord. Zie [docs/onderzoek/MAGISTER.md](docs/onderzoek/MAGISTER.md).

Endpoints (server): `POST /api/grades/import`, `GET /api/integrations`, `POST /api/integrations/:provider/connect|sync`, `DELETE /api/integrations/:provider`. Tokens worden versleuteld opgeslagen (`INTEGRATION_KEY`) en gaan nooit naar de app.

## Uitgangspunten

- Geen echt geld.
- Alle spelers en clubs zijn fictief. Gelijkenis met bestaande personen is toeval.
- Schoolcijfers zijn alleen zichtbaar voor de leerling zelf.
- Geen kopie van beschermde vormgeving, logo's of assets van commerciële voetbalgames.
