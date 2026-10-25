# RANK11.

**Your grades. Your squad.** Een multiplayer voetbalkaartgame waarin schoolcijfers je spelers, packs en beloningen opleveren. Mobile-first PWA voor iPhone, Android, tablet en desktop.

> **Status (25-10-2026):** designprototype ter review, met lokale demo-data en fictieve spelers. Nog geen server of multiplayer. Zie [HANDOFF.md](HANDOFF.md).

## Wat er nu werkt

- **Cijferkluis:** een nieuw cijfer als verrassing. Je ziet de kluisdeur, het vak, de weging en de rolteller. Daarna het gemiddelde voor en na, en je beloning. Een onvoldoende krijgt een respectvolle presentatie als "herstelkans".
- **Pack-opening** met walkout (vlag, positie, club, silhouet, kaart). De kansen zijn transparant.
- **Ultimate Draft** (werktitel): kies per positie 1 uit 5 kaarten. Garantietellers laten zien wanneer je een topkaart krijgt.
- **Elftalbouwer:** formaties, wisselen met vergelijking, beste elftal, reservebank en collectie.
- **Game-engine** in pure TypeScript: gewogen gemiddelden, wat-als, beloningen, packs, draft en chemie. 65 tests.

## Structuur

```
packages/engine   gedeelde spelregels (pure functies, deterministische RNG), Vitest
apps/web          React + Vite PWA-frontend
docs/             haalbaarheid, GDD, architectuur, testrapport, reviewscreenshots
```

## Ontwikkelen

```bash
npm install
npm test
npm run typecheck
npm run dev            # http://localhost:5173
npm run build:single   # één HTML-bestand (reviewpreview)
```

## Uitgangspunten

- Geen echt geld.
- Alle spelers en clubs zijn fictief. Gelijkenis met bestaande personen is toeval.
- Schoolcijfers zijn alleen zichtbaar voor de leerling zelf.
- Geen kopie van beschermde vormgeving, logo's of assets van commerciële voetbalgames.
