# RANK11. — Roadmap

**Stand:** 25-10-2026 · **Vervangt:** het releaseplan R1–R8 in `docs/ARCHITECTUUR.md` (de volgorde is aangepast aan wat inmiddels gebouwd is).

Uitgangspunten: geen productiepublicatie, betaalde diensten of nieuwe productieomgeving zonder toestemming van Martijn. Vóór echte gegevens van minderjarigen online: privacy- en toestemmingsbeoordeling (`SECURITY.md` §10).

## Waar we nu staan

| Onderdeel | Status |
|---|---|
| Cijferengine, statistieken, inzichten, doelen, wat-als | Gebouwd en getest; scherm in de app |
| Motivatie-engine (3 XP-soorten, plafonds), achievements | Gebouwd en getest; in de app |
| Kaarten, packs, draft (met gemeten kansen), elftal, collectie | Gebouwd en getest; in de app (lokaal) |
| Academy: regels, handtekening, interne oefenmodule | Gebouwd en getest; externe koppeling ontworpen, staat uit |
| Grade League | Engine gebouwd en getest |
| Competitie (battle, league, schema, toernooi) | Engine gebouwd en getest; zie `COMPETITION-SYSTEM.md` |
| API (accounts, pools, cijfers, collectie, wedstrijden) | Lokaal gebouwd en getest; niet uitgerold |
| Transfermarkt | Alleen engine en tests |
| Portretten | Batch loopt; tot ≥ 150 portretten blijven getekende koppen zichtbaar |

## Fase A — Prototype afmaken (zonder externe afhankelijkheden)

1. Portretbatch afronden, gelijkeniscontrole door een mens, `PHOTOS_ONLY` aan, `draft-odds.json` opnieuw genereren.
2. Competitieschermen koppelen aan de engine (Grade League-tabel, RANK League, pools), duidelijk gemarkeerd als demo zolang er geen server is.
3. Transfermarktscherm op de engine (lokaal, met demo-tegenspelers) — alleen als Martijn de markt wil in de eerste versie.
4. XP-bron gelijktrekken: API `grades` moet de motivatie-engine gebruiken in plaats van `computeReward`-XP.
5. Economie bijstellen na besluit over de voucherkloof (`REWARD-ECONOMY.md` §7) en opnieuw simuleren.
6. CSV-sjabloon voor zelf invoeren (meerdere cijfers tegelijk), met dezelfde validatie en ontdubbeling.

**Afhankelijk van:** besluiten van Martijn over economie, markt en werktitels.

## Fase B — Web-app op de lokale API

1. Store omzetten naar een dunne API-client: cijfers, kluis, collectie, packs, elftal.
2. Ontbrekende API-modules: doelen, geplande toetsen, scenario's, XP-ledger, achievements-uitlezing, Academy-events-endpoint met HMAC.
3. End-to-endtests met twee of drie accounts (Playwright) tegen `wrangler dev --local`.
4. Offline-gedrag en foutmeldingen in de app.

**Afhankelijk van:** fase A4.

## Fase C — Testomgeving bij Cloudflare (alleen synthetische gegevens)

1. Cloudflare-account en `env.test` (Worker, D1, Durable Objects) — **toestemming Martijn nodig**; Free-plan, geen kosten verwacht.
2. Uitrol via de officiële CLI, smoketest, testaccounts.
3. PWA-uitrol van de web-app naar een testadres.

**Afhankelijk van:** fase B, expliciete goedkeuring.

## Fase D — Voorwaarden voor echte gebruikers

1. DPIA, verwerkingsverantwoordelijke, bewaartermijnen, EU-jurisdictie.
2. Ouderaccount en ouderlijke toestemming (onder 16 jaar), inzage, export en verwijdering.
3. Securityreview; moderatie van gebruikers- en clubnamen.
4. Merkcheck van verzonnen namen (handmatig, TMview/BOIP).

**Afhankelijk van:** juridische en organisatorische besluiten buiten de code.

## Fase E — Uitbreidingen

| Uitbreiding | Voorwaarde |
|---|---|
| Koppeling leren.martijndenbesten.com | Besluit en opdracht om de leeromgeving uit te breiden (L1–L9); open vragen in `ACADEMY-INTEGRATION.md` §9 |
| Academy League | Werkende koppeling |
| Toetsweektoernooien, seizoenen met zachte reset, poolquests | Fase B; ontwerp in `VERGELIJKBARE-APPS.md` (C9, C12, C13) |
| Club creator (embleem, tenues) | Ontwerp in `GDD.md` |
| Web Push-meldingen (alleen door de gebruiker gekozen, met stille uren) | Fase C |
| Magister of Somtoday | Alleen via een officiële partner- of schoolroute; nu NO-GO (`ECHTE_DATA_V2.md`) |
| Echte spelers of clubs | Alleen met schriftelijke licentie; nu NO-GO |

## Wat bewust niet op de roadmap staat

Betaalde onderdelen, advertenties, publieke ranglijsten, chat met onbekenden, streaks en loginbeloningen.
