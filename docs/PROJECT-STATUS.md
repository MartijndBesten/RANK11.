# Projectstatus — wat echt werkt en wat demo is

Stand: 26 oktober 2026, ochtend. De actuele projectstatus en de volgende actor staan altijd in `HANDOFF.md`.

**Echt werkend** = de logica draait en is getest; het resultaat is echt, ook al wordt het lokaal opgeslagen.
**Demo** = werkt alleen met verzonnen gegevens of tegen de computer.
**Niet online** = gebouwd en lokaal getest, maar niet uitgerold.

## In de app (preview)

| Onderdeel | Status | Toelichting |
|---|---|---|
| Cijfers invoeren, corrigeren, verwijderen, geschiedenis | Echt werkend | Eventlog met dubbele-invoercontrole; status "zelf ingevoerd". Opslag alleen op dit toestel |
| Cijferdashboard, vakpagina's met grafiek, verdeling, records | Echt werkend | Alles berekend door de engine uit jouw ingevoerde cijfers |
| Inzichten | Echt werkend | Regels met vaste drempels; geen gokwerk of AI |
| Doelen, geplande toetsen, "wat moet ik halen", wat-als met scenario's | Echt werkend | |
| XP in drie categorieën met plafonds, niveaus, prestaties | Echt werkend | De start-XP komt uit de demo-cijfers |
| Cijferkluis met beloning (coins, packs, vouchers, spelerskeuze) | Echt werkend | Beloningsconfiguratie met versie en limieten |
| Packs openen, kansentabel, walkout | Echt werkend | Fictieve spelers |
| Draft met garanties en gemeten kansen | Echt werkend | Kansen gemeten in 10.000 simulaties |
| Elftal, formaties, chemie | Echt werkend | |
| Collectie met zoeken, filters, sorteren, details, snel verkopen | Echt werkend | |
| Academy-oefenmodule (wiskunde, Frans, Engels) | Echt werkend | Interne module; levert echte leerevents met tijdcontrole en herkansingen |
| Koppeling met leren.martijndenbesten.com | Niet gebouwd | Ontwerp klaar, staat uit; de site is niet gewijzigd (V-012) |
| RANK League met kaartbattles | Demo | Echte engine, maar tegen 7 computertegenstanders |
| Grade League | Demo | Echte berekening, maar de andere deelnemers zijn verzonnen |
| Academy League | Concept | Niet actief |
| Pools, uitnodigen, online tegen klasgenoten | Niet online | Server gebouwd, niet uitgerold, app niet gekoppeld |
| Transfermarkt | Alleen engine | Regels en tests klaar, geen scherm (V-015) |
| Meldingen | Alleen in de app | Instelbaar, met stille uren; geen pushmeldingen buiten de app |
| Portretten | Deels | Fotorealistische AI-portretten van fictieve spelers; de batch voor de volledige catalogus loopt. Zolang die niet (bijna) klaar is, staan er nog getekende koppen tussen |

## Server (`apps/api`)

| Onderdeel | Status |
|---|---|
| Accounts, sessies, pools met uitnodigingscodes | Niet online, lokaal getest |
| Battles via Durable Object (live en asynchroon, time-outs, reconnect) | Niet online, lokaal getest (ook met `wrangler dev --local`) |
| Competities met speelschema en ranglijst | Niet online, lokaal getest |
| Cijfers, XP (motivatie-engine), grootboek, packs | Niet online, lokaal getest |
| Ouderaccount en toestemming | Niet gebouwd; blokkeert productie |

## Niet gedaan, en bewust niet

- Niets gepubliceerd naar productie. Geen Cloudflare-account, database of Worker aangemaakt.
- Geen echte voetballers, clubs of foto's: juridisch NO-GO zonder licenties (`docs/onderzoek/ECHTE_SPELERS.md`, `ECHTE_DATA_V2.md`).
- Geen Magister- of Somtoday-koppeling. Een partnerroute is nu niet haalbaar; zelf invoeren is het uitgangspunt.
- De leeromgeving is alleen gelezen, niet aangepast.
- Geen betalingen en geen echt geld; coins zijn niet te koop.
