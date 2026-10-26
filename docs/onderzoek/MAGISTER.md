# Magister-koppeling per speler: onderzoek en ontwerp

Peildatum: 26-10-2026. Alleen gelezen en gezocht: niets gebouwd, nergens ingelogd, geen persoonsgegevens in verzoeken. Juridische punten zijn een inschatting, geen juridisch advies.

## Conclusie

**Een koppeling per speler via een officiële route is nu niet haalbaar.** Magister biedt geen route waarmee een leerling of ouder zelf een app van derden toestemming geeft om cijfers te lezen. De enige officiële route loopt via de school: Magister-partnerprogramma, verwerkersovereenkomst met de school, en de school zet de koppeling aan. RANK11. heeft een eigen doel (spelbeloningen) en wordt door de leerling zelf gekozen. Dat past slecht in dat model.

Gevolg voor de app:
- geen Magister-knop of "binnenkort"-melding, dus geen schijnkoppeling;
- handmatig invoeren blijft de volwaardige standaard;
- het datamodel is al voorbereid op een officiële bron (zie §4), zonder extra code.

## 1. Feiten

| Vraag | Antwoord | Zekerheid |
|---|---|---|
| Leverancier | Magister is van Sanoma Schoologica B.V. (Sanoma Learning). Sanoma kocht Iddink Group in 2018 | Zeker |
| Openbare API voor derden? | Nee. De voorwaarden op magister.nl zeggen dat de API is voorbehouden aan Schoologica en dat gebruik door niet-geautoriseerde partijen verboden is. Wachtwoorden mogen niet in apps van derden worden ingevoerd | Zeker (letterlijk op magister.nl/voorwaarden) |
| Partnerprogramma | Voor aanbieders van leermiddelen en applicaties. Voorwaarden: KvK, Privacyconvenant of Edu-V-keurmerk, verwerkersovereenkomst, een "legale relatie met de schoolorganisatie (en leerling)" en doelbinding | Zeker (magister.nl/partners) |
| Wie zet een koppeling aan? | De school, in de Privacy Manager, na een verwerkersovereenkomst | Zeker voor Magister Join |
| Cijfers uit Magister naar een externe app | Geen gedocumenteerde route gevonden. Bekende koppelingen sturen resultaten juist naar Magister toe | Onzeker, niet bevestigd |
| Toestemming door leerling of ouder zelf (OAuth) | Niet gevonden | Niet gevonden |
| Onofficiële apps | Magister adviseert leerlingen: bij gebruik van niet-officiële apps wachtwoord wijzigen en stoppen | Zeker (Magister Service, 13-03-2026) |

Ter vergelijking: Somtoday (Connect-partnerprogramma) en Zermelo (API-token dat de schoolbeheerder per partner aanmaakt) werken ook via de school, niet via de leerling.

## 2. Wat níet mag (en niet gebouwd wordt)

- Inloggen met het Magister-wachtwoord van de leerling, of dat wachtwoord opslaan.
- Scraping of onofficiële libraries en API's.
- Een browserextensie die Magister uitleest.

Risico's: contractbreuk met Schoologica, mogelijk computervredebreuk (art. 138ab Sr) en verwerking zonder grondslag onder de AVG, met wachtwoorden van minderjarigen.

## 3. Routes

| Route | Officieel? | Wie moet akkoord geven | Haalbaar nu? |
|---|---|---|---|
| Magister-partner (Edu-V/API), per school aangezet | Ja | Schoologica en het schoolbestuur (verwerkersovereenkomst, Privacy Manager) | Nee: uitgaande cijfers niet bevestigd, en een eigen speldoel botst met het verwerkersmodel |
| Toestemming per leerling/ouder (OAuth) | Bestaat niet | – | Nee |
| UWLR / OSO / ECK iD | Ja, maar voor andere doelen | School | Nee |
| Leerling vraagt een kopie (inzagerecht art. 15 AVG) en voert zelf in | Ja | Leerling (vanaf 12) of ouder; onder 16 ouderlijke toestemming voor RANK11. | Alleen handmatig |
| Wachtwoord, scraping, onofficiële libraries | Nee, verboden | – | Nee |
| Handmatig invoeren (huidig) | n.v.t. | Ouder (onder 16) | **Ja** |

## 4. Technische route als het later wél kan

Voorwaarde: een school wil RANK11. inzetten voor een eigen schooldoel en sluit een verwerkersovereenkomst, en Schoologica laat RANK11. als partner toe met een route om cijfers te lezen.

1. **Partneraanvraag** bij Magister: KvK, Edu-V-keurmerk of Privacyconvenant, doelbinding.
2. **Afstemmen** of cijfers via Edu-V of de Magister API naar buiten mogen, en met welke velden (alleen vak, toetsnaam, cijfer, weging, datum).
3. **Per school** een verwerkersovereenkomst (Edu-V 4.0/4.1); de school zet de koppeling aan.
4. **In RANK11. per speler**: de leerling (en onder 16 de ouder) zet de koppeling zelf aan en kan hem altijd weer uitzetten. Tokens alleen op de server, versleuteld (Worker-secret plus versleutelde kolom), nooit in de app. Intrekking door de school volgen.
5. **Datamodel (al aanwezig):** `Grade.source` kent `'magister'`, `Grade.status` kent `'verified'`, en `Grade.externalRef` bewaart het toets-ID uit de bron. Dankzij de ontdubbelsleutel (`gradeKey`) geeft een cijfer dat eerst handmatig is ingevoerd en later uit Magister komt, nooit een dubbele beloning.
6. **Beloningen** blijven gelijk voor handmatige en gekoppelde cijfers, zodat wie handmatig invoert niet achterblijft.

Nu wordt hiervoor niets extra gebouwd.

## 5. Minderjarigen

- Onder 16 jaar is voor een dienst op basis van toestemming de toestemming van de ouder of voogd nodig (art. 8 AVG, art. 5 UAVG). Bij een doelgroep van 10-16 jaar betekent dat: verifieerbare ouderlijke toestemming en een DPIA. Dat geldt al voor RANK11. zelf, los van Magister (`docs/BESLOTEN-TEST.md`).
- Cijfers zijn gevoelige gegevens over een kind. Ook met een koppeling blijven ze alleen zichtbaar voor de leerling zelf.

## Bronnen

- magister.nl/voorwaarden en magister.nl/partners (© 2026, geraadpleegd 26-10-2026)
- Magister Service: "Slimmer koppelen met Magister Join" (21-07-2025), "Accountactiviteit controleren" (13-03-2026)
- sanomalearning.com: Schoologica; persbericht overname Iddink (11-12-2018)
- vo-raad.nl: vernieuwd privacyconvenant (14-06-2022); privacyconvenant.nl, veelgestelde vragen
- edustandaard.nl: UWLR
- som.today/partnerprogramma; docs.zportal.nl (Zermelo-authenticatie); support.zermelo.nl release 26.04 (13-04-2026)
- wetten.overheid.nl: UAVG (BWBR0040940) art. 5; Wetboek van Strafrecht art. 138ab
- AVG (EU 2016/679) art. 8, 15 en 20

## Addendum ronde 6 (26-10-2026): voorbereiding gebouwd, koppeling niet geactiveerd

Op verzoek is de volledige koppelarchitectuur gebouwd, los van externe toestemming. **De echte Magister-synchronisatie is bewust niet geactiveerd**: er wordt geen interne Magister-API benaderd, het mobiele-app-client-id `M6LOAPP` wordt niet gebruikt, en er wordt nooit om een Magister-wachtwoord gevraagd.

**Wat is gebouwd en getest (werkt nu):**
- Een provider-onafhankelijke opzet (`apps/api/src/modules/integrations/`): `providers.ts`, `mapping.ts`, `sync.ts`, `crypto.ts`, `routes.ts`.
- Een werkende **voorbeeldbron** (`sample`) met synthetische cijfers: koppelen → synchroniseren → ontkoppelen, volledig getest. Dit bewijst de hele keten.
- **Mapping** van externe cijfers (Nederlandse komma, vakherkenning, niet-numeriek overslaan) naar het cijfermodel.
- **Synchronisatie** via dezelfde cijferinvoer als handmatig (`insertGrade`), met **deduplicatie** op externe sleutel én op vak+waarde+datum: opnieuw synchroniseren geeft nooit dubbele XP, coins, packs of vouchers.
- **Versleutelde tokenopslag** (AES-GCM, sleutel uit `INTEGRATION_KEY`); tokens gaan nooit naar de app of in logs.
- **Herkomst** (`source`: manual/import/magister) staat los van **verificatie** (`status`: self/confirmed).
- **Koppelscherm** in Instellingen met status, Nu synchroniseren en Ontkoppelen; Magister staat er als "nog niet beschikbaar".
- Bestandsimport (plakken/CSV) als werkende, toegestane route die vandaag al cijfers binnenhaalt.

**Wat `magister` als provider nog mist om te activeren (jouw actie):**
1. Een **officieel toegestane route**: toelating als Magister-partner (Sanoma Schoologica) óf een schoolroute met verwerkersovereenkomst, waarbij de school de koppeling aanzet. Zonder dat blijft de interne API verboden terrein.
2. Van die partij: hoe cijfers **uitgelezen** mogen worden (endpoint/standaard, scopes), en de authenticatie die daarbij hoort.
3. **Ouderlijke toestemming** (onder 16) en een DPIA, omdat het om schoolgegevens van een minderjarige gaat.

Zodra 1–3 geregeld zijn, hoeft alleen `PROVIDERS.magister` een `fetchGrades` (en de bijbehorende, geautoriseerde authenticatie) te krijgen; de rest van de keten — mapping, sync, dedup, tokenopslag, UI — staat klaar. Voor een geautoriseerde bron zet de sync de cijfers als `status: 'confirmed'` (geverifieerd) weg.
