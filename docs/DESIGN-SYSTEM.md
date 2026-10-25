# RANK11. — Designsysteem

**Stand:** 25-10-2026 · **Code:** `apps/web/src/styles/base.css` (tokens, schil, knoppen, sheets), `styles/ui.css` (gedeelde bouwstenen), `components/card.css` + `CardFrame.tsx` (kaarten), `components/charts.tsx`/`charts.css` (grafieken), `fonts.ts`

**Kwaliteitsreferentie:** het Draft-scherm (door Martijn aangewezen). Elk scherm gebruikt hetzelfde materiaal: diep marineblauw glas, goud als accent, Barlow Condensed voor koppen en getallen.

## 1. Identiteit

- **Altijd donker.** "Het is een stadion, geen kantoor" (`base.css`). `color-scheme: dark`; er is bewust geen licht thema.
- **Stadionachtergrond** (`.stadium`): radiale lichtvlekken van boven, conische lichtbundels van de masten, een groene gloed onderaan (het veld) en een fijne korrel tegen banding.
- **Eigen vormen.** Kaartsilhouet, emblemen, packs en portretkaders zijn eigen ontwerp; er zijn geen EA-assets of kaartvormen overgenomen.

## 2. Tokens (`:root` in `base.css`)

| Groep | Tokens |
|---|---|
| Ondergrond | `--bg-0` #03050a · `--bg-1` #070b14 · `--bg-2` #0d1322 · `--bg-3` #141c30 |
| Lijnen | `--line` wit 8% · `--line-strong` wit 16% |
| Tekst | `--text` #eef2f8 · `--text-dim` #9aa6bc · `--text-faint` #5f6b82 |
| Goud | `--gold-1` #fff1c4 · `--gold-2` #f2cf73 · `--gold-3` #c9972f · `--gold-4` #7d5b17 |
| Accent | `--electric` #3aa8ff · `--electric-hot` #7ff0ff · `--exam` #7c3aed · `--exam-lime` #b8ff3c |
| Status | `--up` #2fe39a · `--down` #ff5a6a · `--warn` #ffb547 |
| Vorm | `--radius` 14px |
| Maten | `--nav-h` 64px · `--top-h` 58px · `--rail-w` 88px; safe-area via `--safe-t`/`--safe-b` |
| Beweging | `--ease-out` cubic-bezier(0.16, 1, 0.3, 1) · `--ease-spring` cubic-bezier(0.34, 1.56, 0.64, 1) |

Cijferkleuren (`ui.css`): `.grade-low` (onder 5,5) zacht rood #ff8b97 · `.grade-ok` gewone tekst · `.grade-high` (8+) goud. Vakken hebben een eigen kleur in `state/school.ts`; die kleur draagt alleen identiteit (bolletje met afkorting), nooit betekenis.

## 3. Typografie

- **Display:** Barlow Condensed 600/700/800 (`--font-display`), hoofdletters, licht gespatieerd. Voor koppen, getallen, knoppen, tabs en labels (`.display`, `.eyebrow`, `.kpi-value`, `.big-num`, `.row-grade`).
- **UI:** Barlow 400–700 (`--font-ui`), 15px basis, regelafstand 1,4.
- Lettertypen komen lokaal mee via `@fontsource` (geen externe fontserver).
- Getallen altijd met `font-variant-numeric: tabular-nums`, decimalen met een komma (`fmt`, `formatGrade`).
- `.eyebrow`: 13px, letterafstand 0,18em, hoofdletters, gedimd — het label boven iedere kop.

## 4. Schil en navigatie

- **Telefoon:** topbalk (club, wallet, instellingen) · inhoud · onderbalk met 5 tabs. Tablabels worden afgekapt als het niet past; onder 380px kleiner (10,5px) zodat 5 tabs ook op 320px passen.
- **Tablet/desktop** (`min-width: 900px` en liggend, of liggend met hoogte ≤ 600px): navigatie wordt een rail links (88px) met logo; de actieve tab krijgt een gouden streep.
- **Subnavigatie** (`.subnav`): kleeft bovenaan de inhoud, horizontaal scrollbaar, de actieve tab schuift altijd in beeld, gouden onderstreep, badges voor kluis en packs.
- **Immersief:** onthulling, pack-opening en walkout verbergen topbalk en navigatie.
- Wallet-chip XP verdwijnt onder 480px; het clubniveau onder 420px.

## 5. Bouwstenen (`ui.css`)

| Klasse | Gebruik |
|---|---|
| `.page`, `.page-cols` (`.even`), `.stack`, `.page-head` | Paginaraster; vanaf 900px twee kolommen (1,25 : 1 of gelijk) |
| `.panel` (+ `.flush`, `.gold`, `.electric`, `.exam`, `.clickable`) | Glaspaneel; varianten voor beloning (goud), inzicht/Academy (blauw), toetsweek (paars) |
| `.panel-head` | Koptekst met actie rechts |
| `.kpis`, `.kpi`, `.kpi-label`, `.kpi-value`, `.kpi-note` | Kerncijfers als tegels, automatisch in kolommen |
| `.delta.up/.down/.flat` | Verandering met pijl, altijd met getal (niet alleen kleur) |
| `.rows`, `.row`, `.row-main`, `.row-title`, `.row-sub`, `.row-grade` | Lijsten; titels kappen af met ellips |
| `.tag` (+ `.self`, `.wait`, `.demo`, `.live`, `.gold`, `.lime`) | Labels: "zelf ingevoerd", "beloning wacht", "demo" (gestippeld oranje), "actief" |
| `.demo-note` | Gestippeld oranje kader: legt uit wat demo is |
| `.bar` (+ `.electric`, `.lime`, `.up`) | Voortgangsbalk |
| `.form`, `.form-row`, `.field`, `.input`, `.select`, `.grade-input`, `.form-error`, `.hint` | Formulieren; invoer 46px hoog, cijferinvoer 58px groot |
| `.seg`, `.chips`/`.chip-btn` | Keuzeknoppen (`aria-pressed`) |
| `.toggle-row`, `.switch` | Aan/uit (`role="switch"`, `aria-checked`) |
| `.icon-action` (+ `.danger`) | Kleine actieknoppen (aanpassen, geschiedenis, verwijderen) |
| `.empty` | Lege toestand met uitleg en actie |
| `.btn` (+ `.ghost`, `.electric`, `.small`) in `base.css` | Goudknop met afgeschuinde hoeken en lichtsweep |
| `.sheet` | Onderblad op telefoon, zwevend venster vanaf 900px; sluit met Escape |

Bevestigingen gebeuren altijd in de pagina zelf (`.confirm-inline`), nooit met `confirm()`.

## 6. Kaartsysteem

- Silhouet met afgeschuinde hoeken en een inkeping bovenaan (`--clip`), verhouding 5:7. Alle maten in `cqw` (container query units), zodat de kaart op iedere grootte gelijk blijft.
- Maten: `xs` 62px · `sm` 64–96px · `md` 120–168px · `lg` 190–250px · `xl` 240–340px. Op `xs`/`sm` verdwijnen stats, vlag, embleem en editielabel; de speler blijft groot.
- Lagen: frame-metaal → vulling → patroon → spotlicht → frame-motief (SVG) → portret → naamplaat → gegraveerde binnenrand (SVG) → rating/positie/vlag/embleem → naam en stats → folie en lichtsweep.
- **Materiaal per serie** (CSS-variabelen `--frame`, `--fill`, `--pattern`, `--spot`, `--plate`, `--ink`):
  - Brons: koperbruin.
  - Zilver: koel staal.
  - Goud: warm goud (standaard).
  - Rare: zwart met goud en scherven-motief, gouden tekst.
  - Electric: diepblauw met cyaan circuit.
  - Toetsweek Special: paars met lime raster en circuit.
  - Seizoen: turquoise.
  - Kampioen: zwart met goud.
  - Legendary: ivoor en goud met stralenkrans en lauwerkrans, gouden binnenrand.
- Editielabel verticaal langs de rechterrand (RARE, ELECTRIC, TOETSWEEK, SEIZOEN, KAMPIOEN, LEGEND).
- Rare, Legendary, Electric en Toetsweek Special krijgen een periodieke lichtsweep; met kantelen volgt een folie-reflectie de vinger of muis.
- Fotoportretten tonen een klein "AI"-label met de bron als tooltip. Zonder foto valt de kaart terug op een getekend SVG-portret in clubkleuren.

## 7. Grafieken (`charts.tsx`)

- Eigen SVG, geen bibliotheek. Eén reeks per grafiek, dunne lijnen (2px), terughoudend raster.
- **Vakgrafiek:** punten = toetsen (groter = zwaardere weging; onvoldoende in rood), gouden lijn = gemiddelde na iedere toets, stippellijn = voldoendegrens 5,5. Tooltip met toets, datum, weging, cijfer en gemiddelde daarna bij aanwijzen of aanraken. Legenda onder de grafiek.
- **Sparkline** van het lopende gemiddelde naast het grote getal (decoratief; het getal is het tekstalternatief).
- **GradeBar:** balk 1–10 met streep op 5,5 en blauw blokje op het doel.
- **Verdeling:** zes kolommen met het aantal erboven.
- Kleur komt nooit alleen: getallen en labels staan er altijd bij.

## 8. Beweging

- Animaties ondersteunen spanning (kluis, pack, walkout) en worden overgeslagen waar ze in de weg zitten ("Overslaan" op elke volledig-schermreeks).
- `prefers-reduced-motion` én de instelling "Volledige animaties" uit (`.reduce-motion`) brengen alle animaties en overgangen terug tot ~0 ms.
- Geluid pas na een tik, en uit te zetten.

## 9. Toegankelijkheid

- Focusring: 2px `--electric-hot` met offset.
- Klikbare panelen hebben `role="button"`, `tabIndex` en Enter-afhandeling; tabs gebruiken `aria-current="page"`; keuzeknoppen `aria-pressed`; schakelaars `role="switch"`.
- Kaarten hebben een volledige `aria-label` (naam, serie, rating, positie).
- Formulierfouten in `role="alert"`.
- Doel: geen horizontale scroll op 320–430px breed; controleren met de Playwright-overloopcontrole (zie `TEST-REPORT.md`).

## 10. Regels voor nieuwe schermen

1. Begin met `.page` + `.page-head` (eyebrow, display-kop, één zin uitleg).
2. Gebruik bestaande bouwstenen; nieuwe kleuren alleen als token.
3. Maak demo-onderdelen zichtbaar met `.tag.demo` of `.demo-note`.
4. Getallen in de displayfont met komma; cijfers met `gradeClass`.
5. Test op 320, 360, 390, 430 en 820 px breed, en liggend 844×390.
