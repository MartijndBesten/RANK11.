# RANK11. — Vergelijkbare apps: patronen en ontwerpconclusies

- **Datum:** 26-10-2026. Alle bronnen zijn op die datum geraadpleegd via WebSearch/WebFetch.
- **Doel:** functies en UX-patronen van leer- en voetbal-/kaartgames vergelijken en vertalen naar ontwerpkeuzes voor RANK11. RANK11. is een gratis, besloten voetbalkaartgame voor jongens van 10–16 jaar. Schoolcijfers, persoonlijke verbetering en oefenen in een gekoppelde leeromgeving leveren daarin beloningen op.
- **Methode:** desk research. We beschrijven patronen; er is geen content, vormgeving of tekst overgenomen.
- **Betrouwbaarheid:** elke bron heeft een label. **[O]** officieel (uitgever, helpcenter, patch notes), **[W]** wetenschappelijk, **[S]** secundair (pers, gids, wiki), **[A]** anekdotisch of opinie.
  - Een aantal officiële helppagina's gaf HTTP 403: Quizlet, Blooket-prijzen en Kahootopia Leagues. Voor die apps zijn zoekresultaat-samenvattingen gebruikt; dat staat erbij.
  - Het KIDS Act-voorstel is niet opnieuw gelezen. De artikelverwijzingen komen uit `docs/onderzoek/BRONNENONDERZOEK.md` §3–4.
- **Afbakening:** dit document is géén besluit. Overgenomen conclusies gaan via Martijn (`VRAGEN.md`) naar `docs/GDD.md`.

---

## 1. Patronen per app

### 1a. Motivatie, progressie, beloning en competitie

| App | Waarom jongeren spelen | Progressie | Beloningen verdienen | Competitie-opzet |
|---|---|---|---|---|
| **EA SPORTS FC Mobile** (nu FC Mobile 27, live sinds 24-09-2026) [S13][S15] | Echte voetbalfantasie, eigen team verzamelen en verbeteren, korte wedstrijden (VS Attack: asynchroon, alleen aanvalsfases) [S13] | Divisies via sterren, met "Star Shields" tegen degradatie na een verlies; geen seizoensreset van de squad [S12][S13][S15] | Dagelijkse en wekelijkse opdrachten, events, divisiebeloningen, bonus voor dagelijkse winst; League Pass [S12][S14] | Division Rivals reset elke 28 dagen [S13]; wekelijkse ranglijsten [S12]; clubs ("Leagues") in groepen van max. 20 met top-3 promotie en bottom-3 degradatie [S14] |
| **Duolingo** | Korte lessen, mascotte, zichtbare streak, wekelijks "spannend" klassement [S1][S3] | 10 leagues (Brons→Diamant), elke week één tier stijgen; promotiekans daalt per tier (67% → 0%) [S1][S2] | XP per oefening; XP-boosts; badges; Friends Quest-beloningen [S5][S10] | Groepen van ~30, gematcht op studiegedrag en tijdzone; week sluit op zondag; Diamond-toernooi voor de top 10 [S1][S2] |
| **Kahoot!** | Live klasmoment, snelheid, muziek, podium | Kahootopia: gedeeld klaseiland dat groeit; streak-prestaties in zelfstudie [S18][S19] | Punten per goed antwoord; standaard snelheidsbonus; in **Accuracy mode** 1 punt per goed antwoord zonder snelheidsbonus [S16][S17] | Kahootopia Leagues: klassen in groepen van 20, 2 maanden, trofeeën = basis + nauwkeurigheidsbonus; eigen leagues via tag [S18] |
| **Quizlet** | Snel kaartensets maken of vinden voor een toets | Learn-modus: rondes per set tot de stof "beheerst" is [S20] | Geen gamebeloning; voortgang is de beloning | Match (getimed); Quizlet Live in teams: één fout zet de teamvoortgang terug (alleen [S]-bronnen, niet officieel bevestigd) |
| **Anki** | Bewezen effectief voor wie veel moet onthouden; geen franje | Per kaart een interval; FSRS-planner met instelbare doelretentie (standaard 90%) [S22] | Geen | Geen |
| **Blooket** | Spelmodi met thema's (Gold Quest, Tower Defense, Café), "blooks" sparen met zeldzaamheden [S25] | Voortgang binnen de spelmodus; blooks kopen met munten in een markt [S25] | Goede antwoorden leveren spelvoordeel op, bijvoorbeeld goud of torens [S25] | Live klasspellen, waarin stelen van goud het klassement kan omgooien [S25] |
| **Gimkit** | "Geld" verdienen en investeren in power-ups, dus tactiek bovenop de quiz [S24] | Upgrades per spel (meer per vraag, streakbonus, verzekering) [S24] | In-game geld per goed antwoord; fout kan geld kosten [S24] | Live spellen en opdrachten; KitCollab: leerlingen leveren zelf vragen aan [S24] |
| **Clash Royale** | Korte 1-op-1-duels, kaartdecks, clan | Trophy Road tot 10.000; Ranked per seizoen; zachte reset naar 10.000–12.000 op basis van de vorige eindstand [S26] | Mijlpalen in Trophy Road en events; keuze-fragmenten in plaats van willekeurige Hero-unlocks (2026) [S26][S27] | Seizoenen; Clan Wars (River Race, wekelijks, 4 strijddagen) [S29]; Mega Draft met levelcap 11 als experiment in 2023 [S28] |
| **Kickbase** | Fantasyvoetbal met échte vrienden; transfermarkt met biedingen [S30] | Seizoenspunten of head-to-head per speelronde [S30b] | Punten op basis van echte wedstrijdprestaties; captain telt dubbel [S30b] | Privéleagues alleen via uitnodiging, max. 18 managers; H2H 3/1/0 of seizoenspunten (eventueel alleen de 5 beste speelrondes) [S30][S30b] |
| **Seneca** (kort) | Gratis cursussen voor examenstof (VK) | Modules met herhaling | — | — [S31] |
| **Brainly** (kort) | Snel huiswerkantwoord | Punten en rangen voor wie antwoorden geeft ("beginner"→"genius") [S32] | Punten voor antwoorden en dagelijkse login (oudere bron) [S32] | — |

*Sorare is bewust niet uitgewerkt. De gevonden bronnen zijn verouderd en het model draait om verhandelbare kaarten met geldwaarde, wat voor RANK11. uitgesloten is.*

### 1b. Samen spelen, herhaling, zichtbaarheid en gratis gebruik

| App | Groeps- of vriendenuitdagingen | Herhaling van leerstof | Vooruitgang zichtbaar | Gratis zonder abonnement |
|---|---|---|---|---|
| FC Mobile | Clubdoelen: gezamenlijke opdrachten tellen voor de clubdivisie; "Activity Points" per lid; club-tegen-clubtoernooien [S14] | n.v.t. | OVR, divisie, collectie | Hele game gratis; aankopen versnellen alleen |
| Duolingo | **Friend Streak** (met max. 5 vrienden; +22% kans op dagelijkse les volgens Duolingo) [S4]; **Friends Quest**: wekelijks duo met gezamenlijk doel, 5 dagen, beide krijgen een beloning [S5] | Spaced repetition plus nauwkeurigheid kiest de oefenstof; fouten komen aan het eind van de les terug; Practice-tab met "Mistakes" [S6][S7] | Pad, streak, league, XP | Lessen en Practice-tab zijn gratis (sinds 2026) [S6]. Energie beperkt het aantal oefeningen per dag; dat leverde in 2025 veel kritiek op [S10b] |
| Kahoot! | Klaseiland groeit door samen te spelen; klassen-leagues [S18] | Test Mode toont fouten na afloop [S19] | Podium, rapport, eiland | Hosten, offline zelfstudie en één study buddy zijn gratis; Test Mode is betaald [S19] |
| Quizlet | Quizlet Live (teams) | Learn vraagt foute termen opnieuw [S20] | Voortgang per set | Learn is beperkt tot een aantal rondes per set; AI-tutor is betaald [S20] |
| Anki | — | FSRS: "Again" leidt tot herleren en een kort interval; vaak vergeten kaarten worden als "leech" gemarkeerd [S22] | Statistieken, werkelijke retentie | Desktop en web gratis |
| Blooket | Klasspel | Opdrachten in eigen tempo [S25] | Blookcollectie | Kern gratis; Plus geeft rapporten en grotere spellen [S25] |
| Gimkit | KitCollab | **Smart Repetition**: na de eerste ronde krijgen eerder fout beantwoorde vragen meer "loten"; altijd aan, per leerling [S23] | Geld, rapport | Gratis tot 5 spelers per spel bij Pro-modi; Pro ca. $60 per jaar [S24] |
| Clash Royale | Clan, Clan Wars, vriendenranglijst [S26][S29] | n.v.t. | Trofeeën, badges | Gratis; Free Pass met gegarandeerde fragmenten [S27] |
| Kickbase | De hele game draait om privéleagues [S30b] | n.v.t. | Tabel, marktwaarde (dagelijks bijgewerkt op basis van vraag en aanbod) [S30] | Basis gratis; Pro-functies betaald |
| Seneca | — | Herhaling en toetsing van herinnering volgens een review [S31] | Voortgang per module | Basis gratis; "cram mode" is sinds 2025 betaald [S31] |
| Brainly | Q&A-community | — | Rang | Gratis met puntenlimiet; Plus betaald [S32] |

### 1c. Wat goed werkt tegen "punten boven leren", en waar het misgaat

| App | Wat werkt | Waar het misgaat (bekritiseerd) |
|---|---|---|
| Duolingo | Matching op vergelijkbaar tempo [S1]; Streak Freeze als "slack": +0,38% dagelijks actieve leerlingen, onderbouwd met onderzoek dat wat speelruimte motiverender is dan starre regels [S3]; ranglijst uit te zetten [S1]; frauduleuze XP wordt verwijderd [S1] | **XP-grinding**: makkelijke oefeningen herhalen, boosts timen, last-minute "sniping" (een rivaal haalde 1.300 XP in de laatste uren) en scripts [S8]. **Streak- en leaguedruk**: een gebruiker stopte met nieuwe stof en deed alleen de foutensessie omdat die de makkelijkste XP gaf, met "nul voortgang" als gevolg [S9]. **Boosts met "nu gebruiken of verlopen"** [S10]. **Energie** beperkt gratis leren [S10b] |
| Kahoot! | Accuracy mode: geen snelheidsbonus, minder stress, eerlijker voor jongere en neurodivergente leerlingen [S16] | De standaardmodus beloont snelheid boven nadenken; dat was precies de reden voor Accuracy mode [S16] |
| Gimkit | Smart Repetition dwingt herhaling van fouten af [S23] | Power-ups maken het spel "willekeuriger" [S24]; het geld wordt het doel |
| Blooket | Werkt goed voor herhaling, niet voor nieuwe stof [S25] | Stelen en geluk bepalen de winnaar; bots overspoelen spellen [S25] |
| Clash Royale | Levelcap of draft maakt het eerlijker tussen spelers met verschillende collecties [S28]; keuze in plaats van toeval (2026) [S27] | Draft als *enige* rankedmodus (2023) stuitte op verzet en werd teruggedraaid (secundair, Sportskeeda) |
| FC Mobile | Star Shields beperken frustratie [S12] | Collectie- en OVR-verschil bepaalt kansen (VS Attack-moeilijkheid hangt af van OVR) [S13] |
| Quizlet en Seneca | Fouten herhalen | Leerfuncties achter een betaalmuur [S20][S31] |
| Brainly | Punten voor hulp | Punten voor login en "antwoord geven" belonen kwantiteit, niet begrip [S32] |

---

## 2. Ontwerpconclusies voor RANK11.

Elke conclusie heeft de vorm **Doen / Niet doen → waarom**, met een bron. "Pool" betekent de privégroep vrienden uit GDD §4.8.

| # | Conclusie | Waarom | Bron |
|---|---|---|---|
| C1 | **Doen:** weekleague *binnen* de pool, met groepen van 4–18 en divisies met promotie en degradatie per seizoen (bijvoorbeeld top 2 omhoog, onderste 2 omlaag). | Kleine, vergelijkbare groepen voelen winbaar. Kickbase en de FC Mobile-clubs laten zien dat het formaat met vrienden werkt. | [S2][S14][S30b] |
| C2 | **Doen:** degradatie zacht maken: een "schild" na een slechte week, nooit verlies van kaarten, coins of collectie. **Niet doen:** verlies als drukmiddel. | Star Shields bestaan om frustratie te dempen. Demotie als verliesaversie is juist het bekritiseerde mechanisme. | [S12][S2][S9] |
| C3 | **Doen:** leaguepunten uit *battleresultaat plus leerkwaliteit*, met een **wekelijks plafond** op oefenpunten. **Niet doen:** ranken op ruwe oefen-XP of oefentijd. | Ongelimiteerde XP leidt tot grinding, sniping en scripts. Met een plafond wint wie slim en regelmatig oefent, niet wie het langst doorgaat. | [S8][S9] |
| C4 | **Doen:** herhaling van fouten levert meer op dan herhaling van goed beantwoorde vragen. De bonus volgt pas bij **een later goed antwoord op een eerder foute vraag**, na een interval. **Niet doen:** belonen voor het openen van een foutensessie. | Herhaling en toetsing van herinnering met spreiding werken het best voor onthouden. Gimkit en Duolingo leggen nadruk op fouten. Maar als de foutensessie de makkelijkste XP is, wordt hij gefarmd. | [S7][S23][S35][S36][S9] |
| C5 | **Doen:** volle weekbeloning alleen bij een **mix van nieuwe stof en herhaling**, bijvoorbeeld minimaal 1 nieuw onderwerp. | Voorkomt dat je alleen bekende, makkelijke stof herhaalt en niets nieuws leert. | [S9] |
| C6 | **Doen:** in leervragen geen snelheidsbonus; punten op juistheid. Snelheid alleen in de voetbalgame zelf. | Een snelheidsbonus beloont gokken en geeft stress. Kahoot! voerde Accuracy mode daarom in. | [S16][S17] |
| C7 | **Doen:** **inputs** zwaarder belonen (oefenen, herhalen, verbetering ten opzichte van jezelf) dan **absolute cijfers**. **Niet doen:** het hoogste cijfer als enige weg naar de beste kaarten. | In grote gerandomiseerde proeven werkten beloningen voor inputs; beloningen voor outputs (toetsscores) werkten niet. Leerlingen weten vaak niet hoe ze een beloning in een beter cijfer omzetten. Het sluit ook aan bij de Grade League op verbetering (GDD §7). | [S34] |
| C8 | **Niet doen:** streaks, streakstraf of beloning voor dagelijkse login. **Doen:** als ritme gewenst is, een *weekdoel met speling* (bijvoorbeeld 3 van 7 dagen) zonder verlies bij missen. | Duolingo's eigen bronnen laten zien dat speling motiveert. Streakdruk wordt breed bekritiseerd. Straf of verlies bij wegblijven valt onder KIDS Act-voorstel art. 9 lid 2 sub d (via art. 15). Sluit aan bij GDD K-08. | [S3][S9][S10][S37] |
| C9 | **Doen:** een coöperatieve **poolquest** naast de ranglijst, bijvoorbeeld "samen 200 foute vragen alsnog goed" voor een gezamenlijke beloning. | Gezamenlijke doelen (FC Mobile-clubquests, Kahootopia-eiland, Duolingo Friends Quest) motiveren zonder verliezers. Alleen competitie kan de motivatie juist verlagen. | [S5][S14][S18][S33][S38] |
| C10 | **Doen:** een wekelijks **duo-doel** met één poolgenoot (een Friends Quest zonder streak). Beiden krijgen de beloning, geen van beiden een straf. | Samen oefenen verhoogt de kans dat je oefent (Duolingo: +22%). Het duo-format werkt zonder verlies. | [S4][S5] |
| C11 | **Doen:** bijdrage aan poolquests tonen als *positieve* totalen. **Niet doen:** wie niets bijdroeg bij naam tonen of leden laten selecteren op activiteit. | FC Mobile-clubs gebruiken Activity Points en ledenfilters. Bij 10–16-jarigen in een vriendengroep wordt dat al snel uitsluiting. | [S14] |
| C12 | **Doen:** seizoenen laten samenvallen met de vier toetsweken, met een **zachte reset** (deels terug op basis van de eindstand) en een jaarfinale. | Clash Royale (gedeeltelijke reset) en FC Mobile (divisies van 28 dagen, squad blijft behouden) houden het spannend zonder dat je alles kwijtraakt. | [S26][S13][S15] |
| C13 | **Doen:** toetsweektoernooien standaard in **draft** of met een **ratingplafond**, zodat collectieverschil (en dus indirect cijferverschil) niet beslist. **Niet doen:** draft de enige competitieve modus maken. | Normalisatie maakt het eerlijker; een opgelegde draft als enige ranked-modus stuitte bij Clash Royale op verzet. | [S28][S26] |
| C14 | **Doen:** toeval alleen in packs (met zichtbare kansen) en nooit in de uitslag van leervragen. **Niet doen:** stelen of omgooien van punten op basis van geluk (zoals Gold Quest). | Bij Blooket en Gimkit kan geluk kennis overstemmen. Kennis moet zichtbaar lonen. | [S24][S25] |
| C15 | **Doen:** in de leeromgeving een FSRS-achtige planning met een doelretentie van ongeveer 90%. Vragen die steeds fout gaan ("leech") leiden tot uitleg of hulp in plaats van eindeloze herhaling. | Anki's planner is open en gedocumenteerd. Hogere retentie geeft sterk meer herhalingen. Leech-detectie voorkomt frustratie. | [S22] |
| C16 | **Doen:** fouten aan het einde van een oefensessie én enkele dagen later opnieuw aanbieden. | Spreiding van herhaling (onthouden over langere tijd vraagt langere intervallen) en terugkeer aan het eind van de les. | [S7][S35] |
| C17 | **Doen:** een privé **beheersingsmeter** per vak of onderwerp ("je onthoudt ~80% van H3"), alleen zichtbaar voor de speler (en eventueel de ouder). **Niet doen:** beheersing of cijfers op een ranglijst. | Persoonlijke vooruitgang motiveert zonder sociale vergelijking. Sluit aan bij de privacyregels in BRONNENONDERZOEK §3. | [S22][S33] |
| C18 | **Niet doen:** tijdelijke boosts die verlopen ("nu gebruiken of kwijt") en tijdgebonden aanbiedingen. | Dat zorgt voor FOMO en druk. PEGI geeft tijd- of aantalbeperkte aanbiedingen minimaal PEGI 12. | [S10][S39] |
| C19 | **Niet doen:** notificaties die niet door de speler zelf zijn uitgelokt ("kom terug!"). **Doen:** alleen meldingen bij een gebeurtenis die de speler zelf startte, zoals "je bod is geaccepteerd" of "jouw battle is klaar". | KIDS Act-voorstel art. 9 lid 2 sub b. | [S37] |
| C20 | **Niet doen:** leren beperken met energie of levens. **Doen:** onbeperkt oefenen, maar *beloningen* per dag of week afvlakken (dalend rendement). | De energie van Duolingo werd gezien als rem op gratis leren. Afvlakken voorkomt grinding zonder het oefenen te blokkeren. | [S10b][S8] |
| C21 | **Doen:** alle leer- en competitiefuncties gratis en gelijk voor iedereen. | Bij Quizlet (Learn-limiet) en Seneca (cram mode) leidden betaalmuren rond leerfuncties tot kritiek. RANK11. is gratis en heeft geen echt geld (PROJECT.md). | [S20][S31] |
| C22 | **Doen:** server-authoritative scoring, plausibiliteitscontroles (maximaal aantal punten per uur of dag) en verwijderen van onrechtmatige punten. Het klassement wordt pas aan het eind van de week definitief. | Duolingo-leagues worden geteisterd door scripts en sniping. Duolingo verwijdert frauduleuze XP. | [S1][S8] |
| C23 | **Doen:** uit de ranglijst kunnen stappen (privémodus) en standaard alleen de top plus je eigen positie tonen, nooit een openbare "laatste plaats". | Duolingo laat ranglijsten uitzetten. Sociale vergelijking via leaderboards kan motivatie en prestatie schaden. | [S1][S33] |
| C24 | **Doen:** kaartwaarde in de transfermarkt via vraag en aanbod *binnen de pool*, met een vaste dagelijkse update. **Niet doen:** enige koppeling aan echte waarde. | Kickbase laat zien dat een vriendenmarkt boeiend is. Echte waarde is uitgesloten (Sorare-contrast; kansspelrisico in BRONNENONDERZOEK §4). | [S30] |
| C25 | **Doen:** beloningen *kiezen* in plaats van puur toeval waar dat kan, bijvoorbeeld "1 uit 3" of fragmenten richting een gekozen kaart. | Clash Royale verving willekeurige Hero-unlocks in 2026 door keuze, na frustratie van spelers. Keuze geeft autonomie. | [S27] |

---

## 3. Risico's en hoe RANK11. ze vermijdt

| Risico | Waar gezien | Maatregel in RANK11. | Verwijzing |
|---|---|---|---|
| **Streak- en terugkeerdruk** | Duolingo-streaks, XP-boosts [S9][S10] | Geen streaks, geen loginbeloningen, geen straf bij wegblijven, weekdoel met speling (C8) | KIDS Act-voorstel art. 9 lid 2 sub d via art. 15; GDD K-08 |
| **Pushmeldingen om terug te komen** | Duolingo (maandagceremonie met push) [S2] | Alleen door de speler uitgelokte meldingen (C19); ouder stelt stille uren in | KIDS Act-voorstel art. 9 lid 2 sub b; art. 20 (ouderlijke tools; onder 13 alleen via die tools) |
| **Verliesaversie via degradatie** | Duolingo-leagues [S2] | Zachte degradatie, schild, nooit materiaalverlies (C2) | Code voor Kinderrechten: geen manipulatief ontwerp (BRONNENONDERZOEK §3) |
| **XP-grinding en farming** | Duolingo [S8][S9] | Plafond op oefenpunten, dalend rendement, bonus alleen voor fout→later goed, mix van nieuw en herhaling (C3–C5, C20) | — |
| **Fraude en scripts, sniping** | Duolingo [S8], Blooket-bots [S25] | Server-authoritative, plausibiliteitscontroles, besloten pools via uitnodiging (C22) | Architectuur K-03 |
| **Cijfers vervalsen** (zelf ingevoerd) | Algemeen risico van outputbeloning [S34] | Zwaartepunt op controleerbare inputs uit de leeromgeving (C7); poolbeheerder kan cijfers laten bevestigen (GDD §8) | BRONNENONDERZOEK §3, pedagogisch risico |
| **Sociale vergelijking en schaamte** | Leaderboards [S33]; activiteitsfilters bij FC Mobile [S14] | Geen absolute cijfers zichtbaar, Grade League alleen op verbetering, privémodus, geen openbare laatste plaats (C11, C17, C23) | GDD §7; K-07 |
| **Geluk boven kennis** | Blooket, Gimkit [S24][S25] | Toeval alleen in packs met kansen; leervragen deterministisch (C14) | GDD K-05 |
| **Ongelijkheid door collectie** ("pay/grade-to-win") | FC Mobile OVR [S13] | Toetsweektoernooien in draft of met ratingplafond (C13) | — |
| **Variabele beloningen (packs)** | FC/Ultimate Team-modellen | Geen echt geld, kansen tonen, niet verhandelbaar, keuzebeloningen waar mogelijk (C25) | Het KIDS Act-voorstel verbiedt variabele beloningssystemen in art. 13 alleen voor sociale netwerken en videoplatforms. Overweging 40 vraagt voor games "dezelfde bescherming" via gedragscodes (zoals PEGI). Ook de Digital Fairness Act (verwacht november 2026) kan dit raken. Behandel packs daarom als aandachtspunt. |
| **FOMO door tijdsdruk** | XP-boosts [S10] | Geen verlopende boosts of tijdgebonden aanbiedingen (C18) | PEGI: tijdgebonden aanbiedingen minimaal PEGI 12 [S39] |
| **Eindeloos spelen** | Zonder limiet (Duolingo Super, volgens [S9]) | Beloningen vlakken af; ouderdashboard met speeltijdlimiet (BRONNENONDERZOEK §3, maatregel 8) | KIDS Act-voorstel art. 20 |
| **Betaalmuur rond leren** | Quizlet, Seneca, Duolingo-energie [S20][S31][S10b] | Alles gratis, geen energie (C20, C21) | PROJECT.md: geen echt geld |

**Status KIDS Act:** COM(2026) 681 final van 17-09-2026 is een *voorstel*, nog geen wet. Of het van toepassing is op een gratis privégame is **onzeker** (BRONNENONDERZOEK §3, open vraag 1). RANK11. kiest ervoor zich er toch naar te richten.

---

## 4. Bronnen

Alle bronnen zijn geraadpleegd op 26-10-2026. De datum is de publicatie- of bijwerkdatum, voor zover vermeld.

**Duolingo**
- [S1] [O] Duolingo Blog, "Duolingo Leaderboards and Leagues", 03-05-2023. https://blog.duolingo.com/duolingo-leagues-leaderboards/
- [S2] [S] Deconstructor of Fun, Duolingo-analyse "Leagues" (geen datum; positief-analytisch, geen kritiek). https://duolingo.deconstructoroffun.com/mechanics/leagues
- [S3] [O] Duolingo Blog, O. Mansur, "The habit-building research behind your Duolingo streak", 31-01-2022. https://blog.duolingo.com/how-duolingo-streak-builds-habit
- [S4] [O] Duolingo Blog, J. Shuttleworth, "5 product lessons we learned from building Friend Streak", 20-09-2024. https://blog.duolingo.com/product-lessons-friend-streak/
- [S5] [O] Duolingo Blog, "Friends Quests" (geen datum; via zoekresultaat). Zie ook PiunikaWeb over bugs en A/B-tests, 05-11-2025. https://blog.duolingo.com/friends-quests/ · https://piunikaweb.com/2025/11/05/duolingo-friend-quest-bugged/
- [S6] [O] Duolingo Blog, gids Practice-tab, 18-02-2026. https://blog.duolingo.com/guide-to-duolingo-practice-hub/
- [S7] [O] Duolingo Blog, E. Onstwedder, spaced repetition, 26-12-2023. https://blog.duolingo.com/spaced-repetition-for-learning
- [S8] [S] Kotaku, R. Guthrie, cheating en XP-farming in leagues, 05-06-2023. https://kotaku.com/duolingo-app-cheats-hacks-leagues-xp-why-duohacker-1850506482
- [S9] [A] PCWorld, D. Parrack, "Duolingo got easier when I paid for it. That's the problem", 20-05-2026. https://www.pcworld.com/article/2924235/why-i-fell-out-of-love-with-duolingo.html
- [S10] [A] Android Authority, XP Boost als UX-val (datum niet te verifiëren; pagina gaf 403, inhoud via zoekresultaat). https://androidauthority.com/duolingo-xp-boost-ux-trap-3674572
- [S10b] [A/S] Android Authority, stoppen vanwege het energiesysteem (2025). https://androidauthority.com/quitting-duolingo-energy-system-3599842 · Change.org-petitie "Hearts, Not Energy". https://www.change.org/p/duolingo-hearts-not-energy

**EA SPORTS FC Mobile**
- [S12] [O] EA, "FC Mobile – Rivals Update – Patch Notes", 11-06-2025. https://www.ea.com/games/ea-sports-fc/fc-mobile/news/rivals-update-patch-notes
- [S13] [S] Wikipedia, "EA Sports FC Mobile" (laatst bewerkt 25-10-2026; pagina leunt op primaire bronnen). https://en.wikipedia.org/wiki/EA_Sports_FC_Mobile
- [S14] [S] Carry1st, "FC Mobile Leagues Update 2025" (over de update van januari 2025; geen datum). https://carry1st.com/blog/fc-mobile-leagues-update-2025-everything-you-need-to-know
- [S15] [S] TalkAndroid, FC Mobile 27-update (Game Plans, Gauntlet, geen reset), september 2026. https://www.talkandroid.com/532016-ea-sports-fc-27-fc-mobile-27-update/

**Kahoot!**
- [S16] [O] Kahoot! Blog, H. Harris, "Teacher takeover: Accuracy mode", 06-05-2025. https://kahoot.com/blog/2025/05/06/teacher-takeover-accuracy-mode/
- [S17] [O] Kahoot! Support, "Accuracy experience" en "How points work" (via zoekresultaat). https://support.kahoot.com/hc/articles/39818967108627 · https://support.kahoot.com/hc/articles/115002303908
- [S18] [O] Kahoot! Support, "What is Kahootopia! Leagues" (403; inhoud via zoekresultaat). https://support.kahoot.com/hc/en-us/articles/42650236377107
- [S19] [O] Kahoot! Blog, A. Remen, AI-zelfstudiefuncties, 19-09-2025. https://kahoot.com/blog/2025/09/19/new-ai-self-study-features/

**Quizlet, Anki, Gimkit, Blooket**
- [S20] [O/S] Quizlet Help, Learn (403; inhoud via zoekresultaat). https://help.quizlet.com/hc/articles/360030986971 · Nibble, "Quizlet Cost in 2026" [S]. https://nibble-app.com/blog/quizlet-cost
- [S22] [O] Anki Manual, Deck Options / FSRS (doorlopend bijgewerkt). https://docs.ankiweb.net/deck-options.html · Anki-forum 26.05, FSRS-parameters 17→19→21. https://forums.ankiweb.net/t/bug-fsrs-desired-retention-simulator-expects-21-parameters-but-decks-support-less-than-that-leading-to-silent-failure/70285
- [S23] [O] Gimkit Help, "Smart Repetition", bijgewerkt 25-01-2023. https://help.gimkit.com/en/article/smart-repetition-ordsp8/
- [S24] [S] Tech & Learning, "What is Gimkit" (prijzen en power-ups). https://www.techlearning.com/how-to/what-is-gimkit-and-how-can-it-be-used-for-teaching-tips-and-tricks
- [S25] [S] Designbeep, "Blooket: The Complete Guide", 09-06-2026. https://designbeep.com/2026/06/09/blooket-the-complete-guide-to-the-game-based-learning-platform/ (blooket.com/plans gaf 403)

**Clash Royale, Kickbase, Seneca, Brainly**
- [S26] [O] Supercell, "June Update 2025" (Trophy Road, Ranked, reset). https://supercell.com/en/games/clashroyale/blog/release-notes/june-update-2025/
- [S27] [O] Supercell, "Upcoming changes to Clash Royale", 20-02-2026. https://supercell.com/en/games/clashroyale/blog/news/upcoming-changes-to-clash-royale
- [S28] [O] Supercell, "Mega Draft in Path of Legends", 31-03-2023. https://supercell.com/en/games/clashroyale/blog/news/mega-draft-in-path-of-legends · Terugdraaiing na kritiek [S]: https://www.sportskeeda.com/esports/clash-royale-path-legends-all-changes-explored-rewards
- [S29] [O] Clash Royale Support, "About Clan Wars" (via zoekresultaat). https://support.clashroyale.com/hc/en-us/articles/49484904148891-About-Clan-Wars
- [S30] [O] Kickbase Help, marktwaarde, bijgewerkt 24-10-2025. https://en.help.kickbase.com/help/how-is-a-players-market-value-calculated-in-kickbase
- [S30b] [O] Kickbase Help (VS), Arena/seizoensmodi, privéleagues en H2H (geen datum). https://mls.help.kickbase.com/help/seasonal
- [S31] [S/A] Seneca: Trustpilot-reviews met Seneca-reactie over cram mode (begin 2025). https://ie.trustpilot.com/review/senecalearning.com?page=10 · Common Sense Education-review (reviews worden sinds februari 2026 verwijderd). https://www.commonsense.org/education/reviews/seneca-learning
- [S32] [S] Harvard Digital Innovation, "Brainly – Leveraging the wisdom of the crowds" (ouder). https://d3.harvard.edu/platform-digit/submission/brainly-leveraging-the-wisdom-of-the-crowds-to-do-your-homework/ · Headway, Brainly-review (2026). https://makeheadway.com/blog/brainly-review/

**Wetenschap en regelgeving**
- [S33] [W] Hanus & Fox (2015), *Computers & Education* 80, 152–161. Leaderboard en badges gingen samen met lagere intrinsieke motivatie en lagere examenscores; één studie, 80 studenten. Besproken in: https://pmc.ncbi.nlm.nih.gov/articles/PMC8916940
- [S34] [W] Fryer (2011), "Financial Incentives and Student Achievement: Evidence from Randomized Trials", *QJE*; NBER WP 15898. https://www.nber.org/system/files/working_papers/w15898/w15898.pdf
- [S35] [W] Cepeda e.a. (2006), "Distributed practice in verbal recall tasks", *Psychological Bulletin* 132, 354–380. https://pubmed.ncbi.nlm.nih.gov/16719566/
- [S36] [W] Karpicke & Roediger (2008), "The critical importance of retrieval for learning", *Science*. https://www.brucehayes.org/Teaching/papers/2008_Roediger_Karpicke_Science.pdf
- [S37] [O] EU KIDS Act-voorstel COM(2026) 681 final, 17-09-2026 (art. 9, 13, 15, 20, overw. 40; nagelezen in BRONNENONDERZOEK). https://ec.europa.eu/newsroom/repository/document/2026-38/Proposal_for_EU_KIDS_Act__EU_Keeping_Internet_Digital_Spaces_Accountable_and_Trustworthy_wh7RxWPSibRG6UlfmCMgsZvcEgc_132530.pdf
- [S38] [W] Kim & Castelli (2021), meta-analyse gamification in het onderwijs, *IJERPH* 18, 3550. https://pmc.ncbi.nlm.nih.gov/articles/PMC8037535
- [S39] [O] PEGI-criteria 2026 (via BRONNENONDERZOEK §4; pegi.info, 12-03-2026).

**Niet geverifieerd en open:**
- exacte promotiepercentages van Duolingo (alleen [S2]);
- Quizlet Live-regels en de huidige Learn-limiet;
- de huidige Blooket Plus-functies;
- het huidige Sorare-model.

Er is geen onafhankelijk onderzoek gevonden naar Duolingo-leagues of Streak Freezes zelf; alleen bedrijfscijfers.
