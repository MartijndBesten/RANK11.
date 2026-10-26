# Open punten

Stand: 26 oktober 2026 (ronde 6). Besluiten die Martijn moet nemen, staan als vraag in `VRAGEN.md`. Dit bestand bevat de technische en inhoudelijke punten.

## Blokkerend voor een test met echte gebruikers

Volledig overzicht, los van de ontwikkeling: `docs/BESLOTEN-TEST.md`.

| # | Punt | Waarom | Wat nodig is |
|---|---|---|---|
| P1 | Privacy en toestemming voor minderjarigen | Doelgroep 10-16 jaar; er is geen ouderaccount of toestemmingsflow | Juridische toets, DPIA, ouder-/voogdaccount, verwerkersrol (V-005, V-007) |
| P2 | Server niet uitgerold | Geen Cloudflare-testomgeving | Toestemming en account (V-006); daarna uitrolstappen in `apps/api/README.md` |
| P4 | Turnstile, rate-limit-bindings en retentietaak ontbreken | Misbruik en bewaartermijnen | Bouwen vóór openstelling |
| P5 | Export en verwijderen van accountgegevens | AVG-rechten van de leerling en ouder | Endpoints en een scherm |

## Inhoudelijk

| # | Punt | Toelichting |
|---|---|---|
| I2 | Draftkansen bij kleine catalogus | Groep D (80-84) heeft te weinig spelers per positie. De app toont daarom naast de ingestelde kans ook de gemeten kans |
| I5 | Demo-teamrating hoog (≈94) | De demo-collectie bevat bewust veel speciale series. Echte accounts starten met het startelftal (≈67) |
| I6 | Lookalike-controle van portretten | Alleen visueel gecontroleerd. Een systematische gelijkeniscontrole (V-010) is niet gedaan |
| I7 | Periode-indeling is een voorbeeld | `packages/engine/src/periods.ts`; scholen verschillen. Moet in de poolinstellingen komen |
| I8 | Doel telt alleen voor cijfers na het instellen | Een doel dat je instelt na een cijfer dat het al haalt, levert pas iets op bij het volgende cijfer. Bewust (geen beloning achteraf), maar de app legt dat nog niet uit |
| I9 | Economie v3 bijstellen na echte data | Alles staat in configuratieversies (`economy.ts`, `motivation.ts`); de simulatie (`tools/sim/balans.ts`) en de tests bewaken de grenzen. Echte speeldata kan andere keuzes vragen |
| I10 | Battles gevoelig voor kleine verschillen | Opgelost met de vorm van de dag (V-018): kleine, zichtbare, begrensde geluksfactor. Grote verschillen blijven beslissend |
| I11 | Magister alleen via de school | Koppelarchitectuur is gebouwd en getest (voorbeeldbron); de Magister-provider is niet geactiveerd. Activeren vraagt een toegestane route + ouderlijke toestemming. Zie `docs/onderzoek/MAGISTER.md` |
| I12 | Periodieke sync nog niet aangezet | De sync-engine en `linkedUsers` staan klaar; een cron/scheduled handler die periodiek synchroniseert is nog niet toegevoegd (pas zinvol met een echte, geautoriseerde bron) |

## Technisch

| # | Punt | Toelichting |
|---|---|---|
| T3 | Toernooi-endpoints, toetsweken, kaartstraffen, chemiebonus in battles, battlebeloningen | Engine deels klaar, API nog niet |
| T4 | `npm audit` meldt undici in wrangler | Alleen lokaal gereedschap, niet in de Worker-bundel |
| T5 | Preview zonder server | De reviewpreview is één statische pagina in demomodus |
| T6 | Portretbatch op CPU | Ongeveer 55 seconden per portret, hervatbaar in blokken |
| T7 | Bundlegrootte | Code-splitting per tab is nog niet gedaan |
| T9 | Live battle niet in de app | De API heeft live wedstrijden via WebSocket (30 s per zet); de app gebruikt alleen asynchroon met verversen elke 3 s |
| T10 | Online store herlaadt alles na iedere actie | Eenvoudig en consistent, maar ±11 verzoeken per actie. Voor een test met een klas prima; later gericht verversen |
| T11 | Demo en server lopen via twee codepaden | Zelfde engine, maar de demo-store en de serverroutes zijn apart. De E2E-scripts dekken beide; wijzigingen in de regels moeten in beide getest worden |

## Opgelost in ronde 6

- V-018 vorm van de dag in battles (kleine geluksfactor).
- Cijferimport uit bestand + snellere handmatige invoer.
- Koppelarchitectuur met versleutelde tokens; herkomst los van verificatie.

## Opgelost in ronde 5

- Eindeloze stroom topkaarten (v2: 43-106 Goudpacks per jaar): nu 13-24, met een elftal dat het hele jaar groeit.
- Speluitleg: kort, uit te zetten en terug te lezen, per gebruiker onthouden.

## Opgelost in ronde 4

- I1: economie bevoordeelde hoge cijfers (V-011). Nu eerlijke beloningsconfiguratie plus voortgangsbeloningen voor verbetering, doelen, herstel en Academy, met een weekplafond.
- I4: verbeterde fout telde in dezelfde sessie. Nu pas in een latere sessie, met herhaling op 1/3/7/14 dagen.
- T1: XP en doelen op de server gelijk aan de motivatie-engine; doelen bestaan nu in de API.
- T2: verwijderen draait op de server de XP terug, net als in de app; packs en coins blijven van de speler.
- T8: bij gelijke toetsdatum sorteert de server op invoermoment.
- P3: de web-app is gekoppeld aan de (lokale) server.
- Academy gaf afrond-XP bij 0 van 6 goed; nu vanaf 50% goed.
