# PROJECT — RANK11.

**Tagline:** Your grades. Your squad.
**Eigenaar:** Martijn (enige die ontwerpkeuzes en productiepublicatie goedkeurt)
**Repository:** `MartijndBesten/RANK11.`
**Gestart:** 25-10-2026

## Doel

RANK11. wordt een installeerbare, mobile-first multiplayer-PWA: een voetbalkaartgame voor jongeren van ongeveer 10–16 jaar. Schoolcijfers leveren spelerskaarten, packs, coins en XP op.

Wat de speler kan doen:
- een club maken en spelers verzamelen;
- een elftal bouwen;
- open kaartbattles en drafts spelen met vrienden in privépools;
- meedoen aan toetsweektoernooien.

Succescriterium: "Dit lijkt echt op een voetbalgame!" en nieuwsgierigheid naar de speler die een nieuw cijfer oplevert.

## Scope

Volledige opdracht: zie de masterprompt van Martijn (25-10-2026). Samengevat zijn dat de onderdelen 1–24, opgeleverd in stappen 1–7.

| Stap | Inhoud | Status |
|---|---|---|
| 1 | Haalbaarheid | Afgerond (`docs/HAALBAARHEID.md`) |
| 2 | Game Design Document | Concept (`docs/GDD.md`) |
| 3 | Premium designprototype, vier schermen | Gebouwd (`apps/web`) |
| 4 | Review en goedkeuring visuele richting | **Wacht op Martijn (V-001)** |
| 5 | Backend en gamefuncties in releases R1–R8 | Na goedkeuring (`docs/ARCHITECTUUR.md`) |
| 6 | Integraties | Na toestemming en rechten |
| 7 | Productiegereed maken en livegang | Alleen met expliciete toestemming |

## Scope-gate

**Bevestigd.** De opdracht en scope staan expliciet in de masterprompt van Martijn van 25-10-2026 ("Begin nu met de haalbaarheidsanalyse en ga daarna door met het eerste werkende premium designprototype"). Dit is geen TRILUX-project; de TRILUX-ontwerpregels zijn niet van toepassing.

## Randvoorwaarden (vast, uit de opdracht)

- Geen nepfunctionaliteit. Prototypestatus wordt eerlijk gelabeld.
- Geen externe accounts aanmaken, niets betalen en geen productie wijzigen zonder toestemming.
- Niet naar productie publiceren zonder expliciete goedkeuring.
- Geen beschermde vormgeving, assets, logo's, animaties of code van EA SPORTS FC kopiëren.
- Geen scraping van Magister en geen opgeslagen wachtwoorden.
- Geen echt geld: geen betaalde lootboxes en geen valuta die in echt geld is in te wisselen.
- Privacy en veiligheid van minderjarigen vanaf het begin: geen openbare cijfers, geen chat met onbekenden.

## Vaste besluiten

Zie ook GDD §10.

| # | Besluit | Bron |
|---|---|---|
| B-1 | TypeScript-stack; pure gedeelde engine (`packages/engine`) | Voorkeur Martijn + architectuurkeuze (K-03) |
| B-2 | Fictieve catalogus in het prototype | Haalbaarheid NO-GO voor echte spelers; definitief via V-003 |
| B-3 | Handmatige cijferinvoer als basis, cijferbron verwisselbaar | Opdracht §7 + haalbaarheid; definitief via V-004 |
| B-4 | Beloningskeuzes A/B/B/B (cijfers geven toegang; packs/coins/markt; tactiek; verrassing) | Opdracht §9 |
| B-5 | Open kaartbattles als hoofdmodus, server-authoritative | Opdracht §11 |

## Hergebruikte bouwstenen

Bron: `bibliotheek/BOUWSTENEN.md` op `main` van de workbench, versie 37.

| Bouwsteen | Gebruik in RANK11. | Status |
|---|---|---|
| B51 Spelregels als pure toestandsfunctie | Engine-opzet; battle-eventlog in fase 5 | Patroon toegepast |
| B50 Badges, records en ranglijsten afleiden | Ranglijsten en prijzenkast (fase 5) | Gepland |
| B57 Worker-API met beveiligingslagen en D1-testshim | API-basis R1 | Gepland, eerst bron en tests controleren (⚠ R20: niet-constant-time-vergelijking → `safeEqual` uit B23) |
| B55 Besloten groepen, uitnodigingen, oudertoestemming | Pools en toestemming | Gepland (⚠ R21; minderjarigendeel pas na DPIA) |
| B56 Koppelcode tussen toestellen | Apparaat van het kind koppelen | Gepland |
| B43/B44 Serviceworker en installatieadvies | PWA | Gepland |
| B80 Web Push/VAPID | Alleen door de gebruiker uitgelokte meldingen | Gepland |
| B38 Visuele controle | Screenshots en consolecontrole (hier met een eigen Playwright-script gedaan) | Toegepast als werkwijze |
| B99 Cloudsessie-grenzen | Uitrolroute: assets niet vanuit de cloud | Meegenomen |

**Niet hergebruikt:** B49 (grafieken). Het cijfercentrum met grafieken is nog niet gebouwd; B49 is de eerste kandidaat zodra dat gebeurt.

## Belangrijke documenten

- `HANDOFF.md`: actuele status en volgende stap (enige statusbron)
- `VRAGEN.md`: open besluiten
- `docs/HAALBAARHEID.md` en `docs/onderzoek/BRONNENONDERZOEK.md`
- `docs/GDD.md`
- `docs/ARCHITECTUUR.md`
- `docs/TESTRAPPORT.md`
- `docs/review/`: screenshots op telefoon- en tabletformaat
