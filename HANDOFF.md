> **Actualisatie 03-11-2026 (vakken + openstaand: foto-kwaliteit en logo-verzoek):** Op verzoek van Senn ("meerdere vakken") is de vakkenlijst uitgebreid van 8 → **18** gangbare VO-vakken (Duits, Spaans, Scheikunde, Economie, Maatschappijleer, Levensbeschouwing, Informatica, LO, Kunst/CKV, Muziek erbij; bestaande id's intact). Live als bundle `index-BI-e8nrD.js`, commit `c44e5e2`. **Keuzes Martijn verwerkt:** (1) **Foto-kwaliteit** — nette fallback geïmplementeerd: te kleine (<300px hoog) of liggende Commons-foto's vallen bij het laden terug op het gezichtsloze shirtportret in clubkleuren (`PlayerCard` `onLoad`), scherpe staande foto's blijven. Live als bundle `index-BtOmBJK3.js`, commit `ed6888c`. Niet live geverifieerd (foto's achter login, registratie op uitnodiging) — Martijn/Senn checkt visueel. (2) **Echte clublogo's:** bewust NIET gedaan — merk-/auteursrechtelijk beschermd, geen vrije bron; Martijn koos (na duidelijke waarschuwing) voor het **compliant clubschild + afkorting in clubkleuren** behouden. Echte logo's alleen mogelijk met licentie + aangeleverde bestanden. Afweging bij `docs/BEELDRECHTEN.md`.
>
> **Actualisatie 03-11-2026 (ronde 15 UITGEROLD):** Martijn gaf akkoord; ronde 15 staat **live op prod**. Testgate opnieuw gedraaid en groen (engine 260, API 114, PII schoon, typecheck ok). Uitrol: frontend-assets naar `rank11-web` (bundle `index-M2gv4tGu.js`), daarna prod-worker **`436319bf-9b71-4219-8b4e-fc7cdb4db16d`** (was `995039c1`). **Live geverifieerd** (`/api/config`, cache-bust): `rewards 2026.11-ladder.1`, `progress 2026.11-voortgang.4`, `playerPhotos true`, `catalog rank11-catalog-v1:real-2026-11-02`, `openRegistration false`, homepage 200. **Herstelpunt (vorige live staat = ronde 14):** `wrangler rollback 995039c1-3287-404f-9b99-15fbfd018836 --env prod`, D1-bookmark `00000028-00000000-00005118-c4ca03e83cd5e42626a24326c7b653af` (geen DB-migratie; catalog-lock houdt de 245 kaart-id's stabiel). **Clubnamen (Senn):** ronde 15 toont de club via clubschild+afkorting plus de clubnaam; op verzoek van Martijn is de **volledige clubnaam nu ook op de kleine pitch-/bank-/collectiekaarten (`sm`)** gezet naast het rugnummer (kleiner lettertype + ellipsis; `.size-sm .pc-club > span` zichtbaar), commit `7b011f1`, live als bundle `index-B4A0K2lR.js`. `xs` (mini-kaartjes) blijft zonder clubnaam. **Nog niet live door-geklikt** (geen inloggegevens in deze sessie): ingelogde eindcheck (foto's achter login, 7,5→goud, collectie 245/0 intact). **Demo** (`rank11-demo`) blijft uitgefaseerd; teardown van die worker/DNS staat nog open in het Cloudflare-dashboard (zie ronde 14b). **Portretrecht-restrisico** staat met deze uitrol scherper (echte foto's i.p.v. silhouetten); afweging in `docs/BEELDRECHTEN.md`, 146 van de 337 foto's dragen een Commons-persoonlijkheidsrechten-waarschuwing — juridisch te laten toetsen.
>
> **Actualisatie 02-11-2026 (ronde 15 — echte spelers v2, cijferladder 7,5 = goud, registratie op uitnodiging, foto's) — branch `ronde15/echte-spelers-ladder-uitnodiging`, NIET uitgerold, wacht op akkoord Martijn.**
> **Status vooraf (geverifieerd):** main = live (ronde 14b, `0c3c063`); PR #11 gemerged; 200 slots/245 kaarten; silhouetten; goud vanaf 8,0; `OPEN_REGISTRATION=true` op prod. Bevindingen: (a) de oude selectie koos per club alfabetisch → sterspelers ontbraken; **59 van de 200 spelers waren niet (meer) actief** in de zeven competities (gestopt, trainer, andere competitie); (b) **bug:** walkout en kaartdetail toonden bij echte spelers nog het **AI-gezicht van een fictieve speler** en een **fictieve club** ("Havenstad FC"); (c) **bug:** na herladen met een wachtende beloning liep de app in een render-lus ("Maximum update depth exceeded", `markNotified`).
> **Catalogus (sync 2-11-2026, `tools/real-players/sync.mjs` → `finalize.mjs`):** Wikidata + Engelse Wikipedia-infobox + Commons, per speler bron/controledatum/waarschuwingen in `tools/real-players/BRONNEN.md`. **439 spelers** (200 bestaande slots + **239 nieuwe**: Mbappé, Haaland, Kane, Yamal, Pedri, Van Dijk, Wirtz, Saliba, Vinícius …), **380 actief, 59 inactief** (blijven geldig in collecties, label "Niet meer actief", niet meer uit packs/startelftal/draft). 508 kaarten (+24 nieuwe edities op nieuwe toppers). Club bevestigd door 2 bronnen: 371; afwijkend (waarschuwing): 40. Rugnummers: 406 (Wikipedia-infobox; conflict = niet getoond). Eigen rating `rank11-rating-v2.1` (clubniveau, output, interlands, bekendheid, ervaring; gekalibreerd op percentielen van de actieve pool) — geen EA FC. Salah ontbreekt bewust (volgens Wikipedia nu Trabzonspor).
> **Identiteit/migratie (harde eis):** `packages/engine/src/catalog-lock.generated.ts` legt de **245 eerder uitgegeven kaart-id's** vast op Wikidata-QID + editie; slots worden nooit hergebruikt; `finalize` breekt af bij een QID-mismatch. Bestaande kaarten: rating max ±5 per sync (gem. −3,8), **zeldzaamheid zakt nooit** (gouden kaart blijft goud). Stats per kaart-id (geen volgorde-afhankelijke RNG meer). **Geen DB-migratie nodig** (card_instances verwijzen naar dezelfde id's); getest in `catalog-lock.test.ts` en `apps/api/test/catalogus-migratie.test.ts`. "200 vs 245": 200 basisspelers + 36 edities + 8 Legends + S01.
> **Cijferladder `2026.11-ladder.1` + `voortgang.4`:** <5,5 geen cijferpack (herstelkans; groei 4,8→5,4 = Bronspack + coins); 5,5 Brons · 6,0 Zilver · 7,0 Verbeterd Zilver · **7,5 Goud** · 8,0 Goud + voucher · 9,0 Goud + voucher + keuze (basiskaart 82+). Gelijkmaker: clubniveau en herstel → **Inzetpack** (gegarandeerde 85+). Limieten 3/dag, 8/week, **14 per 28 dagen**. Simulatie 40 weken (`docs/SIMULATIES.md`, `tools/sim/ladder.ts`): goud 12 (5,5) → 68 (8,0) per jaar; teamsterkte wk 40 88,2–89,2; elk actief 5,5–7,5-profiel 37–63% winkans tegen het veld (met vorm van de dag); oefenen/groei helpt (5,5+oefenen 48%); extreem veel invoeren begrensd.
> **Registratie alleen op uitnodiging:** `OPEN_REGISTRATION=false` (test/prod/dev); per-IP-rem nu ook mét code; uitnodigingslink `/?uitnodiging=CODE` (code direct uit de adresbalk), beheer: notitie per uitnodiging + "Kopieer uitnodigingslink"; verlopen/intrekken bestond al. Onder-16 blijft wachten op ouder; geen zelfgoedkeuring (test `uitnodiging.test.ts`).
> **Beeld:** RANK11-**shirtportret** (gezichtsloos, officiële clubkleuren, echt rugnummer, vlagpatch) + eigen clubschild met afkorting; **geen clublogo's**. **Foto's AAN op verzoek van Martijn** (`PLAYER_PHOTOS=true`), alleen achter login, via eigen proxy `/api/portrait/:qid` (geen open proxy, geen hotlink), alleen vrije licentie + naam in bestandsnaam: **337 kaarten met foto, 102 met shirtportret**; 146 van de 337 foto's hebben op Commons een persoonlijkheidsrechten-waarschuwing. Register: `tools/real-players/PORTRETTEN.md`; afweging: `docs/BEELDRECHTEN.md`. Startpagina toont nooit foto's.
> **Tests:** engine **260** + API **114** + PII groen, typecheck schoon, web-build OK, nieuwe browser-E2E `tools/e2e/ronde15.cjs` **19/19** op 390 en 360 px (screenshots `docs/review/v15/`). Niet getest: echte iPhone/Safari; foto-proxy tegen echte Commons vanaf Cloudflare (lokaal geblokkeerd; foto's wel visueel gecontroleerd in Chrome).
> **Uitrol (pas na akkoord):** 1) herstelpunt: `wrangler deployments list --env prod` (noteer huidige versie) + D1-bookmark `wrangler d1 time-travel info rank11 --env prod`; 2) frontend-assets eerst (nieuwe pack-thema's/packs `silver_plus`, `effort`), dan worker; 3) live-check `/api/config` → `rewards 2026.11-ladder.1`, `playerPhotos true`, `catalog …real-2026-11-02`. Geen D1-migratie.
> **Open:** zie `docs/OPEN-PUNTEN-RANK11.md` (R15-1 … R15-7), o.a. akkoord uitrol, portretrecht-restrisico, ongebruikte AI-portretten verwijderen (`apps/web/public/portraits/`), collectiecontrole op prod (deze sessie had geen D1-toegang).

> **Actualisatie 02-11-2026 (ronde 14b — demo verwijderd):** Senn zag op `rank11-demo.martijndenbesten.com` nog de **oude nepspelers**: die losse demo (aparte worker `rank11-demo` + R2-bucket `rank11-demo`) draaide een build van vóór ronde 13 en werd nooit meegedeployd (hij update niet automatisch mee). Op verzoek van Martijn ("demo mag weg, alles live definitief maken") is de demo uitgefaseerd: de **"Probeer de demo"-knop is van de landingspagina gehaald** en de demo-infra uit de repo verwijderd (`apps/web/wrangler.demo.toml`, `demo-worker.js`, `DEMO-DEPLOY.md`, `.github/workflows/demo-pages.yml`). Prod-frontend opnieuw gebouwd + uitgerold naar `rank11-web` (nieuwe bundle `index-CbD1Iz71.js`, homepage 200 zonder demo-knop; worker ongewijzigd). Commits `fb3332e` (+ HANDOFF) op `main`. **Demo-worker:** ik kon de worker niet hard verwijderen (de proxy-token mist KV/User-rechten voor `wrangler delete`) en geen nette redirect binden (de custom-domain-route valt onder de DNS-gate). Ik heb de worker-code vervangen door een redirect, maar zonder route-binding ("No targets deployed", versie `cf4374b3`), waardoor `rank11-demo.martijndenbesten.com` nu een **502/foutpagina** geeft — dus géén nepspelers meer, maar ook geen nette pagina. **Nog te doen door Martijn (Cloudflare-dashboard):** verwijder de Worker `rank11-demo` en het bijbehorende DNS-record `rank11-demo` volledig (of geef akkoord voor een DNS-wijziging, dan bind ik een nette 301-redirect naar rank11). De **in-app** demo-code (offline store, `demoPool.ts`) blijft bestaan maar is in de online-only prod-build uitgeschakeld (geen gebruikersimpact). "Meerdere vakken" (Senn): de app heeft 8 vaste vakken; de kapotte vak-keuze die hij zag zat in de oude demo. Of hij méér/eigen vakken wil, staat open.
>
> **Actualisatie 02-11-2026 (ronde 14 — speeltest zoon: clubnamen + brons/zilver/goud, goud bij 8):** twee stukken feedback van de zoon verwerkt. (1) **Clubnamen op de kaart**: echte spelers tonen hun clubnaam onder de naam (`PlayerCard` → `pc-club`, verborgen op xs/sm; alle 245 echte spelers hebben een clubnaam). (2) **Zichtbare brons → zilver → goud-ladder met "goud mag bij 8"**: nieuwe **Zilverpack** (zilver, goede kans op goud; `PackTheme`/`PackArt` uitgebreid). Cijferladder (`ACHIEVABLE_REWARD_CONFIG` → `2026.11-haalbaar.2`): onvoldoende = herstelkans; **5,5–6,4 brons** (Starterspack); **6,5–7,9 zilver**; **8,0+ goud**; 8,5+/9,5+ goud + draft-voucher. Zo zit de actie in de echte cijferzone 5,5–7,5 en is een 8 al goud (8,5 niet langer de drempel). **Balans bewaakt met simulatie** (`tools/sim/balans.ts`, meerdere seeds): clubniveau blijft de grade-agnostische gelijkmaker (goud), en **herstel na een onvoldoende geeft nu ook goud** (`2026.11-voortgang.3`), zodat de worstelende-maar-knokkende leerling niet achterblijft naast de nieuwe goud-uit-cijfers-route. Resultaat: teamsterkte dicht bijeen (spreiding ~0,75–1,0 rating) en **elk actief 5,5–7,5-profiel ≥ 35% winkans** tegen het veld (deterministisch geverifieerd op de testseeds). **Bewuste afweging (ter attentie):** "goud bij 8" geeft structurele hoogscoorders meer goud (bijv. een 8,1-profiel ~65 goudpacks/jaar t.o.v. ~20–30 in de kern-doelgroep); dat is begrensd doordat de teamsterkte verzadigt (iedereen eindigt ±87) en het zwakste actieve profiel blijft ≥35%. Tests bijgewerkt op het nieuwe ontwerp: **engine 225 + API 105 + PII groen, typecheck schoon, build-guard GO**. Commit **`4919141`** op `main` (gepusht). Balansrapport (`docs/SIMULATIES.md`) en `apps/web/src/data/draft-odds.json` opnieuw gegenereerd met de echte catalogus (draft-odds was sinds ronde 13 verouderd); voorbeeld-afzender in `docs/OPEN-PUNTEN-RANK11.md` niet langer als letterlijk e-mailadres (PII-check). **Deploy-status:** **test én prod uitgerold** (Martijn gaf akkoord voor de prod-deploy, die eerst door de omgevings-gate was geblokkeerd). **Test:** frontend-assets naar `rank11-test-web`, worker **`b112bef3-0cf1-475f-a5a9-ee050b451945`** (bereikbaar, 401 door Basic Auth). **Prod:** frontend-assets naar `rank11-web` (gewijzigde assets + `index.html` als laatste; `portraits/` ongewijzigd, overgeslagen), worker **`995039c1-3287-404f-9b99-15fbfd018836`**. **Live geverifieerd:** homepage 200, `index.html` verwijst naar de nieuwe bundle (`index-98cbXFGA.js`), en `/api/config` meldt (met cache-bust) de nieuwe versies `rewards 2026.11-haalbaar.2` + `progress 2026.11-voortgang.3`. Reward-/pack-gedrag (7→zilver, 8→goud) is bewezen door de 105 API-tests die exact het worker-codepad draaien; de catalogus is niet gewijzigd, dus bestaande collecties blijven intact (geen migratie). **Nog niet live gedaan (geen inloggegevens in deze sessie):** een ingelogde eindcontrole (7→Zilverpack, 8→Goudpack, clubnaam op de kaart, collectie 18/0) — aan te raden bij de volgende sessie of door Martijn zelf. **Herstelpunt (vorige live staat):** worker-rollback `wrangler rollback 0795b71f-c6ec-4338-8e3b-28db9bd5f824 --env prod`, D1-bookmark `00000015-00000000-00005117-687ad1c138f35589571d7fde8c4feb67` (geen DB-migratie in deze wijziging). Belangrijke volgorde bij een herhaalde uitrol: eerst frontend-assets naar de bucket, dán de worker (een oude frontend kent `PackArt`-thema `silver` niet en zou crashen op een zilver-pack).
>
> **Actualisatie 02-11-2026 (ronde 13 — echte spelers i.p.v. fictieve):** de spelerscatalogus bestaat nu uit **echte, actieve spelers** uit de zeven grote competities, met een **eigen, gedocumenteerde ratingformule** (clubniveau + output + ervaring; NIET uit EA FC/FIFA). Identiteit uit **Wikidata** (CC0, preferred rank = huidige club); prestatiecijfers uit de **Engelse Wikipedia**-infobox; per speler bron + raadpleegdatum in `tools/real-players/BRONNEN.md`; onverifieerbare spelers weggelaten. **Geen foto's, geen clublogo's**: kaarten tonen een generiek silhouet in vlagkleuren (`apps/web/src/components/Silhouette.tsx`). **Disclaimer** in de app (startpagina, instellingen) + privacypagina: "RANK11. is niet gelieerd aan spelers, clubs of bonden; ratings zijn eigen berekeningen." **Migratieveilig**: zelfde id-slots `p0001..p0200`, dus bestaande collecties blijven geldig — live bevestigd op test **én** prod (18 kaarten, 0 missing, nu echte spelers). `CATALOG_VERSION` opgehoogd; clubchemie via een stabiele club-id uit de clubnaam. **Herstelpunt** voor de deploy: worker-rollback `wrangler rollback 9cbd91b4-60d1-4605-94f7-7e10525152ee --env prod`, D1-bookmark `00000011-00000000-00005117-c7a0389458086ef92c981bdf53b175fc` (geen DB-migratie nodig). **PR #11 is gemerged naar `main`** (merge-commit `8a5e7dd`), dus **main is gelijk aan wat live draait**: de live prod worker `0795b71f` serveert `CATALOG_VERSION = rank11-catalog-v1:real-2026-11`, exact de code op main — geen redeploy nodig, geen divergentie meer (een volgende uitrol vanaf main zet dus géén nepspelers terug). Na de merge geverifieerd: tests engine 225 + API 105 + PII groen, typecheck schoon; live prod-collectie 18 kaarten, 0 missing. **Open punt:** de e-maildienst (Resend-account + geverifieerd afzenderdomein) wacht nog op Martijn; tot die er is verloopt oudergoedkeuring voor onder-16 via de beheerder-route (koppelcode). **Restrisico (ter attentie, geen juridisch oordeel):** naamgebruik van echte spelers kan raken aan portretrecht en collectieve licenties via spelersvakbonden (bijv. FIFPRO); er zijn geen foto's/logo's gebruikt en er is een disclaimer toegevoegd, maar naamgebruik is juridisch te laten toetsen. **Bouwstenenbibliotheek bijgewerkt** (workbench PR #111, versie 38): B55 aangevuld (koppelcode ≠ zelfgoedkeuring), nieuw B106 (publieke voordeur/route-split) en B107 (echte-entiteiten-catalogus uit openbare bronnen), nieuw risico R29 (naamgebruik).
>
> **Actualisatie 02-11-2026 (ronde 12 — open zelfregistratie AAN, Fase B):** op uitdrukkelijke keuze van Martijn (via Claude in Chrome, bekend dat e-mail en Turnstile nog ontbreken) staat **open zelfregistratie nu live** op https://rank11.martijndenbesten.com: `OPEN_REGISTRATION=true` (prod worker-versie `9cbd91b4`). Iedereen met de link kan zonder uitnodigingscode een account maken. **16+ speelt meteen; onder 16 komt in wachtstatus zonder enige spel-data en zonder toegang** tot een ouder goedkeurt. Goedkeuren kan **alleen** via de ouder-e-maillink (zodra e-mail aanstaat) of de ingelogde **beheerder-route** met de koppelcode — een kind kan zichzelf nooit goedkeuren. **Misbruikrem: `REG_MAX_PER_IP` = 15 registraties per IP per uur** (instelbaar). Vóór de flip een **herstelpunt** gemaakt: worker-rollback `wrangler rollback 66f12fcb-ae1a-4a29-b7ad-61e4d89a4982 --env prod`, D1-restore `wrangler d1 time-travel restore rank11 --bookmark=0000000e-00000000-00005117-64b62bc7ee03deeb5952ed7a4e76250e --env prod`, plus een verse SQL-export. Bewezen met tests (API 105, incl. onder-16 open-registratie veilig) én live op prod: **18/18** (open registratie 16+ werkt, onder-16 pending/geen data/403/geen zelfgoedkeuring maar beheerder keurt wel goed, `/api/me|/grades|/club|/wallet|/admin/*` → 401 zonder sessie, testomgeving nog achter Basic Auth 401). Synthetische testaccounts opgeruimd; tellingen terug op baseline (u=9,c=8,g=2,ci=144,pc=1). **Open punten vóór een volwaardige publieke lancering voor minderjarigen:** (1) **E-maildienst** (Resend) nog niet actief — nodig zodat onder-16 zichzelf via de ouder-e-mail kan laten goedkeuren; vereist domeinverificatie, zie hieronder. (2) **Turnstile** (botbescherming) nog niet geconfigureerd — nu alleen de IP-limiet. (3) **DPIA / privacy-vrijgave** voor echte gegevens van minderjarigen nog niet afgerond (`docs/PRIVACY-VOORBEREIDING.md`). (4) **Contactadres** op de site/privacypagina nog niet ingevuld (nu verwijzing naar "de beheerder"); Martijn levert een concreet adres aan. **E-mail/DNS let op:** `martijndenbesten.com` heeft sinds 02-11-2026 **SPF `-all`** en **DMARC `p=reject; sp=reject; adkim=s; aspf=s`** (geldt ook voor subdomeinen). Het exacte afzenderdomein (bijv. `rank11.martijndenbesten.com`) moet in Resend geverifieerd worden met **eigen SPF én DKIM** en strikte alignment, anders wordt elke mail geweigerd — details in [docs/EMAIL-SETUP.md](docs/EMAIL-SETUP.md).
>
> **Actualisatie 30-10-2026 (ronde 11 — publieke startpagina + open voordeur, Fase A):** **https://rank11.martijndenbesten.com is nu publiek** — geen Basic Auth-venster meer. Nieuwe publieke **startpagina** (logo/huisstijl, uitleg, echte voorbeeldkaarten, "zo werkt het", uitleg voor ouders, privacy + contact; knoppen Account maken / Inloggen / Probeer de demo) die de bestaande game/demo hergebruikt. **Route-split:** `servePilot` serveert in publieke modus zonder Basic Auth met basis-securityheaders; persoonlijke én beheerdersroutes blijven via de sessie beveiligd (`handle()`). **Beveiligingsfix (belangrijk):** de publieke `/api/consent/decide` accepteert nu UITSLUITEND de e-mailtoken — een koppelcode (die het kind kent) kan niet meer via de publieke API het eigen account goedkeuren; dat kan alleen via de ingelogde beheerder-route. Ouderpagina is token-only. **Eerlijke e-mail-UI:** het wachtscherm beweert niet dat er een e-mail is verstuurd als er geen provider is (`emailConfigured` in `/consent/status`) en wijst dan naar de beheerder-route. **Misbruikrem:** basis per-IP registratielimiet bij open registratie. **Fase A-config prod:** `PILOT_MODE=false`, `ENVIRONMENT=prod`, `OPEN_REGISTRATION=false` (account maken vereist nog een uitnodigingscode; **open zelfregistratie = Fase B**, één flip na e-mail + Turnstile + privacy-vrijgave). **Testomgeving blijft volledig achter Basic Auth** (geverifieerd 401). Live cookieloos geverifieerd op prod: **19/19** (homepage open, assets/demo/privacy/ouderpagina publiek, `/api/me` `/grades` `/club` `/wallet` `/collection` `/admin/*` → 401, registratie zonder code geweigerd). Bestaande data behouden (prod u=9,c=8,g=2,ci=144,pc=1; `beheerder` kan inloggen). Tests: engine (225) + API (104) + PII groen, typecheck schoon, build-guard GO, **CI run 33 success**. Commit `7a52063` op `main`.
>
> **Actualisatie 30-10-2026 (ronde 10 — oudergoedkeuring via drie routes):** oudertoestemming voor onder-16 werkt nu via **drie** routes, met één centraal systeem en serverafdwinging: (1) **e-mail** (beveiligde link, standaard), (2) **ouder/beheerder met koppelcode** — goedkeuren kan alleen MET de koppelcode die het kind toont (aantoonbare koppeling; bewust géén blanco knop, de oude `adminApprovalLink` is verwijderd), (3) **QR/koppelcode** — het kind toont code + QR, de ouder scant of typt die op dezelfde beveiligde pagina. Statusvocabulaire: `pending_parent_approval`/`approved`/`rejected`/`revoked`/`expired`; de gebruikte methode en (indien ingelogd) de voogd worden vastgelegd. Nieuw endpoint `POST /api/consent/claim-code` (verse koppelcode zonder e-mail). Frontend: wachtscherm toont koppelcode + QR ("Ouder zit naast je? Toon code"); beheerdersonderdeel "Ouderlijke goedkeuringen" (lijst + goedkeuren met koppelcode + voogdvinkje). **Migratie 0010** (kolommen `method`/`claim_code_hash`/`guardian_user_id` + status-rename granted→approved/declined→rejected) toegepast op **test én prod** na controleerbare back-up; tellingen vóór/na identiek (prod u=9,c=8,g=2,ci=144,pc=1; test u=10,c=8,ci=144,pc=3 — geen dataverlies). Beide workers + frontends live; live getest op test **en** prod (alle drie routes, statusafdwinging 403, ouderpagina, beheerderslijst). Synthetische testaccounts na afloop weer verwijderd. Tests: engine + 99 API + PII groen, typecheck schoon, build-guard GO. Commit `c41c167` op `main`. **Basic Auth blijft op beide omgevingen** tot de privacy-vrijgave. E-mail echt versturen vereist nog een provider + DNS (zie [docs/EMAIL-SETUP.md](docs/EMAIL-SETUP.md)); de beheerder- en QR-route werken zónder provider.
>
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
