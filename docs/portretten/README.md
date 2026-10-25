# Spelersportretten

**Status (25-10-2026):** er zijn twee voorbeeldkaarten met een fotorealistisch portret gemaakt:
- S01 Jesse Hoekstra, Gold;
- L01 Marco Steenhuis, Legend.

De rest van de catalogus heeft nog het oude, getekende portret. De volledige catalogus wordt pas vervangen na goedkeuring van Martijn (V-009).

## Pijplijn

| Stap | Hulpmiddel | Licentie | Opmerking |
|---|---|---|---|
| Genereren | FLUX.2 [klein] 4B, lokaal op CPU (`tools/portretten/gen.py`) | Apache-2.0: commercieel gebruik toegestaan, geen extra voorwaarden | 4 stappen, guidance 1,0. Ca. 80 s per portret van 768×960 op 4 kernen (AMX-BF16). Geen externe dienst, €0. |
| Achtergrond weg | rembg met BiRefNet-portrait (`tools/portretten/cutout.py`) | MIT (model), MIT (rembg) | Ca. 30–60 s per portret. Wordt bijgesneden tot het onderwerp. |
| Opslaan | WebP met transparantie, 640 px breed, kwaliteit 86 | — | Ca. 70 KB per speler |
| Koppelen | `apps/web/src/portraits/registry.ts` → `generateCatalog({ photos })` | — | Kaarten, packs en draft lezen alleen `player.photo` |

Promptlog met seeds en gekozen kandidaten: [PROMPTS.md](PROMPTS.md).

**Regels voor prompts:**
- Altijd "fictional", nooit de naam of beschrijving van een bestaande speler.
- Shirts zonder logo's, tekst, badges, sponsor of rugnummer.
- Neutrale donkere studioachtergrond, zodat het uitsnijden goed lukt.
- Stijlreferentie: professionele sportportretfotografie (85 mm, sleutellicht plus tegenlicht).

## Controles per portret (verplicht vóór gebruik)

1. **Geen gelijkenis met een bekende persoon.** Visuele controle tegen bekende spelers. Twijfel betekent: niet gebruiken en opnieuw genereren met een andere seed. Achtergrond: Hoge Raad 2022 (Verstappen/Picnic) oordeelde dat ook een lookalike een portret kan zijn.
2. **Geen logo's, tekst of merkachtige elementen** in het beeld.
3. **Geen fouten in anatomie of uitsnede**: vooral handen, oren en haarrand.
4. **AI-vermelding:**
   - op de kaart een klein "AI"-label;
   - in het register `aiGenerated: true` met een credittekst.

## Vervangen door gelicentieerde foto's van echte spelers

Dit gebeurt alleen als er getekende licenties zijn (zie `docs/onderzoek/ECHTE_SPELERS.md`).

1. **Uitsnede:** dezelfde vorm, dus een transparante WebP of PNG, bijgesneden tot de bovenkant van het hoofd, ca. 640 px breed.
2. **Registratie:** in het register of de serverbron per speler `src`, `kind: 'licensed-photo'`, `license`, `credit` en `aiGenerated: false`.
3. **Geen codewijziging nodig** in de kaarten, de walkout, de draft of het elftal.

Later komt de catalogus van de server en verwijst `photo.src` naar opslag (R2/CDN). Het register in de frontend vervalt dan.

## Volledige catalogus: plan en schatting

- **Aantal:** ca. 400 spelers, dus 400 portretten. Speciale edities delen het portret van hun basisspeler.
- **Tijd:** 400 × (80 s + 40 s) ≈ 13 uur rekentijd op deze CPU. Dat kan in batches op de achtergrond.
- **Variatie:** vanuit de catalogus vastgelegd per speler:
  - leeftijd 18–36;
  - huidskleur passend bij de herkomst, maar gevarieerd;
  - kapsel, baard en bouw;
  - pose (armen over elkaar, handen in de zij, vuist, zijwaarts);
  - shirtkleuren uit de fictieve club.
- **Omvang:** ca. 400 × 70 KB ≈ 28 MB.
  - In de app: via lazy loading vanaf de server of CDN.
  - De preview van één HTML-bestand (maximaal 16 MB) kan dan niet meer alles bevatten.

## Waarom niet via Cloudflare Workers AI

Workers AI zou hetzelfde model aanbieden binnen het gratis dagtegoed. De sessiesleutel heeft echter geen Workers AI-recht. Een tijdelijke generator-Worker op het Cloudflare-account werd door de permissiecontrole van deze sessie geweigerd (wijziging aan een gedeelde omgeving). Lokaal genereren geeft hetzelfde model en dezelfde licentie, zonder account of kosten.
