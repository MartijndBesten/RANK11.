> **Actualisatie 30-10-2026 (ronde 9 — zelfregistratie + ouderlijke toestemming):** nieuwe registratie met leeftijdsvraag; 16+ speelt meteen, onder 16 komt in `pending_parent_approval` tot een ouder via e-maillink goedkeurt (eenmalige tokens, 48u, bewuste POST, server-rendered ouderpagina's, intrekken mogelijk). Wachtende/geblokkeerde accounts hebben geen spel-toegang; beheer kan blokkeren/verwijderen. Open registratie zonder uitnodigingscode (`OPEN_REGISTRATION`), achter Basic Auth tot de privacy-vrijgave. Code live op test én prod; volledige flow live getest (test 15/15). **Nog nodig voor echt versturen:** een e-mailprovider (Resend) + DNS door de beheerder — zie [docs/EMAIL-SETUP.md](docs/EMAIL-SETUP.md). Privacyteksten in [docs/PRIVACY-UITLEG.md](docs/PRIVACY-UITLEG.md). Publieke opening (Basic Auth eraf) pas na de vrijgavecheck in [docs/PRIVACY-VOORBEREIDING.md](docs/PRIVACY-VOORBEREIDING.md).
>
> **Actualisatie 30-10-2026 (ronde 8 — productie):** RANK11. draait nu op de hoofd-URL **https://rank11.martijndenbesten.com** (worker `rank11-api`), met een aparte **D1 met expliciete EU-jurisdictie** (`rank11`, `--jurisdiction eu`), eigen R2 `rank11-web` en Durable Object — los van de testomgeving zodat testdeploys de hoofdapp niet raken. De bestaande gegevens zijn met een volledige back-up gemigreerd en geverifieerd (tellingen identiek; bestaande accounts behouden club, kaarten, cijfers, coins, rol — geen lege club). Volledige multiplayer-E2E op productie (incl. onderbreken/hervatten) 15/15 groen. Nieuw: feedbackfunctie (melden + beheerderslijst). Nog achter Basic Auth + invite; echte leerlinggegevens pas na de vrijgavecheck in [docs/PRIVACY-VOORBEREIDING.md](docs/PRIVACY-VOORBEREIDING.md). De in chat gedeelde toegang is geroteerd. De testomgeving (`rank11-test`) en de publieke demo blijven bestaan.
>
> **Actualisatie 30-10-2026 (ronde 7):** nieuwste code (t/m PR #10) staat live op https://rank11-test.martijndenbesten.com en is op de uitgerolde server geverifieerd: volledige multiplayer-E2E met twee accounts (registreren, pool, uitnodigen, uitdagen, volledige wedstrijd 20 zetten 3–6, ranglijst, isolatie, sessie-persistentie), Basic Auth op alles (401 zonder login), registratie dubbel afgeschermd (Basic Auth + invite). De in chat gedeelde toegang is **ingetrokken en geroteerd** (nieuwe secrets alleen in Cloudflare secret storage). Nieuw: beheerdersroute voor uitnodigingen (aanmaken/intrekken) in Instellingen voor platform_admin; UI-fixes (toast overlapt subtabs niet meer, lege ranglijst, verouderde copy). Mobiel: geen overflow op 390/360px (Chromium; echte iPhone/Safari-test niet uitvoerbaar in deze omgeving). Hoofdadres `rank11.martijndenbesten.com` is vrij en haalbaar, bewust nog niet opengezet. Nog open: strikt EU-**jurisdictie** i.p.v. plaatsing, en — vóór echte leerlingen — ouderlijke toestemming + DPIA. Geen vrijgave voor echte leerlinggegevens.
>
> **Actualisatie 30-10-2026:** de gehardde online-only pilot (PR #9) is uitgerold en geverifieerd. Details in [apps/api/TEST-DEPLOY.md](apps/api/TEST-DEPLOY.md). De publieke demo staat los op https://rank11-demo.martijndenbesten.com.
>
> **Actualisatie 28-10-2026:** onderstaande historische status kan achterhaald zijn. De actuele synthetische pilotprocedure en resterende uitrolblokkades staan in [docs/PILOT-UITROL.md](docs/PILOT-UITROL.md). Accountexport/verwijderen en importfixes staan in de code; gehoste beveiliging en Cloudflare-resourceconfiguratie zijn nog niet geverifieerd. Geen vrijgave voor echte leerlinggegevens.

# HANDOFF — RANK11.

**Status:** `wacht-op-review`. Ronde 6 is klaar en gepusht: cijferimport + snellere invoer, de koppelarchitectuur (voorbeeldbron werkt; Magister geregistreerd maar niet geactiveerd), en V-018 (vorm van de dag in battles).
**Bijgewerkt:** 26-10-2026 (Claude Code, cloudsessie).
**Branch:** `main` (gepusht)
**Volgende actor:** Martijn
**Volgende stap:** om de echte Magister-synchronisatie te activeren is een officieel toegestane route nodig (Magister-partner of een schoolroute met verwerkersovereenkomst) plus ouderlijke toestemming; zie `docs/onderzoek/MAGISTER.md` (addendum ronde 6). De bestandsimport werkt vandaag al.

## Ronde 6 (26 oktober 2026)

| Opdracht | Status |
|---|---|
| 1. Snellere handmatige invoer + bestandsimport | KLAAR: vak+weging onthouden bij "Nog een invoeren"; importscherm (plak/CSV) met controleoverzicht, Nederlandse komma's, dedup. `POST /api/grades/import` via gedeelde `insertGrade`. |
| 2. Structuur klaar voor officiële Magister-koppeling | KLAAR: provider-architectuur, mapping, sync, versleutelde tokens, ontkoppelen, koppelscherm. Magister geregistreerd als "nog niet beschikbaar"; geen ongeautoriseerde API, geen M6LOAPP, nooit om wachtwoord gevraagd. |
| 3. V-018 begrensde geluksfactor in battles | KLAAR: vorm van de dag 0..3 per kaart per duel, deterministisch, zichtbaar. Getest over ratingverschillen. |
| 4. Geen dubbele beloningen bij import/sync/correctie | KLAAR: dedup op externe sleutel én vak+waarde+datum; gecombineerde test (import → hersync → correctie → herimport) bewaakt dit. |
| 5. Speluitleg behouden | Ongewijzigd; uit te zetten en terug te lezen. Nieuwe tip bij importeren. |

**Herkomst vs verificatie (opdracht 6):** `source` = herkomst (`manual`/`import`/`magister`), `status` = verificatie (`self` = zelf ingevoerd/geïmporteerd, `confirmed` = uit een geautoriseerde bron). Bestandsimport en de voorbeeldbron zijn `self`; een geautoriseerde Magister-sync zou `confirmed` worden.

**Nog nodig om de echte Magister-sync te activeren (externe toestemming/toegang):**
1. Officieel toegestane route: toelating als Magister-partner (Sanoma Schoologica) óf een schoolroute met verwerkersovereenkomst waarbij de school de koppeling aanzet.
2. Van die partij: hoe cijfers uitgelezen mogen worden (endpoint/standaard, scopes) en de bijbehorende geautoriseerde authenticatie.
3. Ouderlijke toestemming (onder 16) en een DPIA.
Daarna hoeft alleen `PROVIDERS.magister` een `fetchGrades` te krijgen; mapping, sync, dedup, tokenopslag en UI staan klaar.

**Nieuwe endpoints:** `POST /api/grades/import`; `GET /api/integrations`, `GET/POST /api/integrations/:provider`, `/connect`, `/sync`, `DELETE /api/integrations/:provider`.

**Tests:** engine 225 en API 73 groen, typecheck schoon, PII schoon. E2E: online 20/20, import 11/11, koppelingen 13/13, uitleg 14/14, Academy 8/8, demo 9/9; lay-out 18 schermen × 8 maten (demo en online). Alles op mobiel formaat (390×844) getest.

**Commits ronde 6:** `090c4ab` (V-018), `7970af7` (import), `4c9c0a1` (koppelarchitectuur), en de documentatiecommit met deze HANDOFF.

**Bestanden (belangrijkste):**
- Engine: `packages/engine/src/{import,competition/battle,simulate}.ts`, `grades.ts` (source 'import')
- Server: `apps/api/migrations/0006_integrations.sql`, `src/modules/integrations/*`, `src/modules/grades.ts` (`insertGrade`, `importGrades`)
- Web: `apps/web/src/screens/{grades/ImportScreen,Koppelingen,SettingsSheet}.tsx`, `state/{store,onlineStore}.tsx`, battle-UI met "vorm +N"
- Tools: `tools/e2e/{import,koppelingen}.cjs`, `overflow.cjs` (+importroute)
- Docs: `README.md`, `docs/{PROJECT-STATUS,TEST-REPORT,OPEN-ISSUES,COMPETITION-SYSTEM}.md`, `docs/onderzoek/MAGISTER.md` (addendum)

**Niet gedaan, bewust:** geen interne Magister-API, geen M6LOAPP, geen wachtwoordopslag; geen publieke uitrol; geen andere Cloudflare-projecten aangeraakt. Periodieke (cron) sync is nog niet aangezet (I12) — pas zinvol met een echte bron.

**Open vragen:** V-003, V-005, V-006, V-007, V-008, V-010, V-017.

## Ronde 5 (26 oktober 2026)

| Opdracht | Status |
|---|---|
| Uiterlijk behouden | Geen redesign. Alleen een klein uitlegblok in dezelfde stijl erbij |
| Beloningen positief en haalbaar | KLAAR: economie v3 (`docs/REWARD-ECONOMY.md` §10). Goudpacks komen vooral uit het clubniveau; iedere voldoende geeft een Starterspack; 8,5+ geeft een voucher, 9,5+ een Goudpack. In de simulatie (12 profielen, 16 jaren) zitten actieve profielen op 47-60% winkans tegen het veld (was 37-80%), met 13-24 Goudpacks per jaar (was 43-106) |
| Magister per speler | Onderzocht: er is geen officiële route per leerling, alleen via school en partnerprogramma (`docs/onderzoek/MAGISTER.md`). Martijn vraagt nu een koppeling via de interne API; het plan wacht op akkoord |
| Speluitleg | KLAAR: uitleg bij start, kluis, packs, elftal, competitie en Academy. Te sluiten of definitief uit te zetten, terug te lezen via 'Hoe werkt dit?', schakelaar in Instellingen, gezien-status per gebruiker (server) |

**Tests:**
- engine 215 en API 61 groen, typecheck schoon, PII schoon;
- E2E: online 20/20, uitleg 14/14, Academy 8/8, demo 9/9;
- lay-out 17 schermen × 8 maten zonder overloop (demo en online).

**Commits:** `4e86c9f` (economie v3), `533e8f7` (speluitleg) en de documentatiecommit met deze HANDOFF.

**Bestanden (belangrijkste):**
- Engine: `packages/engine/src/{economy,motivation,simulate}.ts`
- Server: `apps/api/migrations/0005_haalbaar_uitleg.sql`, `src/modules/settings.ts`
- Web: `apps/web/src/components/Help.tsx`, `state/{store,onlineStore}.tsx`, `screens/SettingsSheet.tsx`
- Tools: `tools/sim/balans.ts`, `tools/e2e/uitleg.cjs`
- Docs: `docs/{REWARD-ECONOMY,SIMULATIES,MOTIVATION-ENGINE,PROJECT-STATUS,TEST-REPORT,OPEN-ISSUES}.md`, `docs/onderzoek/MAGISTER.md`, `docs/review/v5/`

**Open vragen:** V-003, V-005, V-006, V-007, V-008, V-010, V-017, V-018 (geluksfactor in battles, nieuw).

**Bouwstenenbibliotheek:** beoordeeld, geen PR. Nieuwe kandidaat: schooljaarsimulatie met winkans tegen het veld, als patroon om een spel-economie te toetsen.

## Ronde 4 (26 oktober 2026)

Wat echt werkt en wat demo is: `docs/PROJECT-STATUS.md`. Testresultaten: `docs/TEST-REPORT.md`. Lokaal draaien: `docs/MULTIPLAYER.md`.

| Prioriteit / besluit | Status |
|---|---|
| 1. Frontend gekoppeld aan de backend | KLAAR (lokaal): startscherm met inloggen, account maken (uitnodigingscode) of demo; online store via `/api` (Vite-proxy, httpOnly-cookie). Getest met `tools/e2e/online.cjs`. |
| 2. Persistente accounts, clubs, cijfers, collecties, beloningen | KLAAR (lokaal): alles in D1; blijft na herladen en opnieuw inloggen (E2E). |
| 3. Privé pools met uitnodigingen tussen testaccounts | KLAAR (lokaal): pool maken, code delen, lid worden (E2E met twee accounts). |
| 4. Online/async kaartbattle tussen twee accounts | KLAAR (lokaal): uitdagen, accepteren, zetten om de beurt, verversen elke 3 s; deadline per zet 24/48/72 uur (V-014). Live WebSocket bestaat in de API maar wordt in de app niet gebruikt. |
| 5. RANK League door de server berekend | KLAAR (lokaal), plus Grade League van de server (anderen zien alleen plaats en totaalscore). |
| 6. Cijferstatistieken en persoonlijke doelen | Doelen en geplande toetsen op de server; voortgangsbeloningen bij doel, verbetering, persoonlijk record en herstel; kluisoverzicht met gemiddelden ook online. |
| 7. Academy-oefenmodule | KLAAR: meer stof (wiskunde, Frans, Engels per onderwerp), herhaling van fouten (1/3/7/14 dagen), "verbeterd" pas in een latere sessie, voortgang per onderwerp; nakijken op de server, antwoorden niet in de app. Afrond-XP pas vanaf 50% goed. |
| 8. Testen met meerdere accounts, isolatie | KLAAR: `apps/api/test/isolatie.test.ts` (15 directe pogingen op andermans id's: altijd 404/403) en E2E (B ziet niets van A). |
| V-011 eerlijkere beloningen | Verwerkt: schooljaarsimulatie, verhouding vouchers sterkste/zwakste gemotiveerde profiel 25,7× → 1,9× (`docs/SIMULATIES.md`). |
| V-012 leeromgeving | Voorbereid (ondertekende events, providermodel); site niet gewijzigd. |
| V-013 startelftal | Verwerkt: 11 + 7 reserves bij registratie. |
| V-014 async met deadline | Verwerkt: standaard 48 uur, instelbaar. |
| V-015 transfermarkt uit | Verwerkt: feature flag `FEATURE_MARKET=false`. |
| V-016 geen minimumtijd | Verwerkt: geen tijdregel; anti-farmen via vragenset-sleutel, dagelijkse afronding, 50%-drempel en plafonds. |
| Incident e-mailheader | Vastgelegd in `docs/INCIDENT-2026-10-25-user-agent.md`: 6 GET-verzoeken naar Wikimedia Commons met het adres in de User-Agent, alleen zoektermen (namen van legends); het adres staat niet in de code of de geschiedenis, er waren dus geen headers uit de code te verwijderen. Herhaling voorkomen: regel in `docs/SECURITY.md` §11 en `tools/check-pii.mjs` in `npm test`. Inschatting: laag risico, niet meldplichtig (geen juridisch advies). |
| Besloten test met echte gebruikers | Overzicht juridisch en technisch, los van de ontwikkeling: `docs/BESLOTEN-TEST.md`. |

**Testresultaten:** engine 211 en API 58 tests groen, typecheck schoon, PII-controle schoon; E2E online 20/20, Academy 8/8, demo 9/9; lay-out 17 schermen × 8 maten zonder overloop in demo en online.

**Commits ronde 4:** `017efff`, `b9eb796`, `c2e0982`, `cb8c7eb` en de documentatiecommit met deze HANDOFF.

**Niet gedaan of niet gelukt:**
- Niets online gezet: geen Cloudflare-account, database of Worker. De preview is alleen de demo.
- Geen ouderaccount, toestemmingsflow, Turnstile, rate-limits of gegevensexport: blokkeert een test met echte gebruikers.
- Live battle (WebSocket) niet in de app; vaste speelschema's niet in de app.
- Niet getest op echte toestellen.

**Bestanden ronde 4 (belangrijkste):**
- Engine: `packages/engine/src/{economy,starter,practice,periods,sell}.ts`, `academy.ts`, `motivation.ts`, `simulate.ts`; tests `economy`, `practice`, `starter`, `motivation-academy`
- Server: `apps/api/migrations/{0003_ronde4,0004_economie_academy}.sql`, `src/modules/{planning,vault,drafts,config,academy,collection,matches,competitions,grades}.ts`, `src/progress.ts`, `src/auth.ts`, tests `ronde4.test.ts`, `isolatie.test.ts`
- Web: `apps/web/src/{Root,main}.tsx`, `api/client.ts`, `state/{onlineStore,store}.tsx`, `screens/{OnlineCompetition,OnlineBattle,CompetitionScreen,AcademyScreen,RevealScreen,SettingsSheet}.tsx`, `academy/types.ts`, `vite.config.ts`
- Tools: `tools/dev-online.mjs`, `tools/check-pii.mjs`, `tools/e2e/{online,academy,demo,overflow}.cjs`
- Docs: `README.md`, `docs/{PROJECT-STATUS,TEST-REPORT,MULTIPLAYER,COMPETITION-SYSTEM,REWARD-ECONOMY,MOTIVATION-ENGINE,ACADEMY-INTEGRATION,OPEN-ISSUES,SIMULATIES,SECURITY,BESLOTEN-TEST,INCIDENT-2026-10-25-user-agent}.md`, `docs/review/v4/`
- `VRAGEN.md`: V-011 t/m V-016 verwerkt; nieuw V-017.

**Open vragen:** V-003, V-005, V-006, V-007, V-008, V-010, V-017.

**Bouwstenenbibliotheek (ronde 4):** beoordeeld, nog geen PR. De kandidaten uit ronde 3 zijn nu server-side in gebruik; nieuw erbij: (6) isolatietest-patroon (B probeert iedere route op A's id's, verwacht 404/403), (7) lokale online-stack met wrangler dev + Vite-proxy + uitnodigingscode, (8) herhaling met groeiende intervallen en "verbeterd pas in een latere sessie". Aanmelden via een aparte `bibliotheek/*`-PR in de workbench zodra Martijn dat wil.

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
