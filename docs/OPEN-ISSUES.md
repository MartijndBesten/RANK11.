# Open punten

Stand: nacht 25 op 26 oktober 2026. Besluiten die Martijn moet nemen, staan als vraag in `VRAGEN.md`. Dit bestand bevat de technische en inhoudelijke punten.

## Blokkerend voor productie

| # | Punt | Waarom | Wat nodig is |
|---|---|---|---|
| P1 | Privacy en toestemming voor minderjarigen | Doelgroep 10-16 jaar; er is geen ouderaccount of toestemmingsflow | Juridische toets, DPIA, ouder-/voogdaccount, verwerkersrol (V-005, V-007) |
| P2 | Server niet uitgerold | Geen Cloudflare-testomgeving | Toestemming en account (V-006); daarna uitrolstappen in `apps/api/README.md` |
| P3 | Web-app niet gekoppeld aan de server | De app gebruikt lokale opslag | De store vervangen door API-aanroepen; inloggen, pools en battles via de server |
| P4 | Turnstile, rate-limit-bindings en retentietaak ontbreken | Misbruik en bewaartermijnen | Bouwen vóór openstelling |

## Inhoudelijk

| # | Punt | Toelichting |
|---|---|---|
| I1 | Economie bevoordeelt hoge cijfers | Zie `docs/SIMULATIES.md`: bij een 5,6 krijg je ongeveer 0,13 vouchers per week, bij een 8,0 ongeveer 2,19 (V-011) |
| I2 | Draftkansen bij kleine catalogus | Groep D (80-84) heeft te weinig spelers per positie. De app toont daarom naast de ingestelde kans ook de gemeten kans. De structurele oplossing is een grotere catalogus of groepen per positie |
| I3 | Volgende beloning op Home is eentonig | `nextRewards` toont per toets de tier vanaf 7,5. Variatie of een persoonlijke drempel (bijv. eigen gemiddelde + 0,5) is te overwegen |
| I4 | Academy: XP voor verbeterde fouten zonder interval | Het onderzoek (VERGELIJKBARE-APPS, C4) adviseert pas te belonen bij een latere juiste herhaling, niet direct in dezelfde sessie |
| I5 | Demo-teamrating hoog (≈94) | De demo-collectie bevat bewust veel speciale series om ze te laten zien; voor echte spelers start je lager |
| I6 | Lookalike-controle van portretten | Alleen visueel gecontroleerd op anatomie en kwaliteit. Een systematische gelijkeniscontrole (V-010) is niet gedaan |
| I7 | Periode-indeling is een voorbeeld | `apps/web/src/state/school.ts`; scholen verschillen. Moet in de poolinstellingen komen |

## Technisch

| # | Punt | Toelichting |
|---|---|---|
| T1 | XP op de server | De server kende XP eerst toe via de oude beloningsconfiguratie. Gelijktrekken met de motivatie-engine is in deze ronde opgepakt (zie HANDOFF.md voor de stand). Doelen bestaan nog niet in de API, dus doel-XP kan de server nog niet geven |
| T2 | Verwijderen op de server | De server draaide bij verwijderen de beloning niet terug, de app wel (XP). Packs en coins blijven in beide van de speler |
| T3 | Toernooi-endpoints, toetsweken, kaartstraffen, chemiebonus in battles, battlebeloningen | Engine deels klaar, API nog niet |
| T4 | `npm audit` meldt undici in wrangler | Alleen lokaal gereedschap, niet in de Worker-bundel |
| T5 | Preview zonder server | De reviewpreview is één statische pagina met lokale opslag per bezoeker |
| T6 | Portretbatch op CPU | Ongeveer 50-80 seconden per portret. Hervatbaar: `tools/portretten/batch.py` slaat bestaande portretten over |
| T8 | Volgorde bij gelijke toetsdatum | Bij twee toetsen op dezelfde dag bepaalt het id de volgorde. Op de server zijn id's willekeurig, dus "herstel na een onvoldoende" op dezelfde dag is niet eenduidig. Voorstel: bij gelijke datum op invoermoment sorteren |
| T7 | Bundlegrootte | De web-bundel is groter geworden door alle schermen. Code-splitting per tab is nog niet gedaan |

## Opgelost in deze ronde

- Getoonde draftkansen weken ongemerkt af van de werkelijkheid. Nu wordt geloot tussen beschikbare groepen, is Groep E verbreed en worden de gemeten kansen getoond.
- Academy: te snelle of afgebroken pogingen telden als eerdere poging, waardoor de eerste echte poging geen afrond-XP meer kreeg.
- Kluisbeloning toonde XP-bonussen uit de oude configuratie; nu de XP-regels uit de motivatie-engine.
- Elftal op 320 px: de keeper overlapte de centrale verdedigers.
