# Beeldrechten: spelersfoto's en clublogo's (ronde 15, 2 november 2026)

> Geen juridisch advies. Dit is een technische en praktische inventarisatie, zodat Martijn een bewuste keuze kan maken.

## Kort

| Onderdeel | Status in de app | Waarom |
|---|---|---|
| Spelersnamen, clubs, nationaliteit, positie, rugnummer | **Aan** | Feitelijke gegevens uit Wikidata (CC0) en Wikipedia (CC BY-SA), per speler bron + datum in `tools/real-players/BRONNEN.md`. |
| Portretfoto's (Wikimedia Commons) | **Aan, alleen achter de login** (`PLAYER_PHOTOS=true`, bewuste keuze Martijn, 2-11-2026) | Auteursrecht van de fotograaf is geregeld via een vrije licentie, het **portretrecht van de speler niet** — restrisico, zie hieronder. |
| Officiële clublogo's | **Niet gebruikt** | Logo's zijn auteursrechtelijk beschermd én merk van de club; Commons heeft ze meestal niet onder een vrije licentie (vaak 'fair use' op en.wikipedia, wat in NL niet bestaat). |
| AI-portretten | **Niet gebruikt** voor echte spelers | Een herkenbare AI-namaak van een echte speler kan juridisch óók een portret zijn (Hoge Raad 2022, lookalike). De oude AI-gezichten van fictieve spelers zijn losgekoppeld. |
| Alternatief | **RANK11-shirtportret** | Gezichtsloze speler in de officiële clubkleuren (Wikidata P6364), met het echte rugnummer en een vlagpatch. Eigen clubaanduiding: schild in clubkleuren met een eigen afkorting, geen logo. |

## Foto's: wat is er uitgezocht

Per speler is de Wikidata-afbeelding (P18) opgehaald en op Wikimedia Commons gecontroleerd: licentie, maker,
licentie-URL en of Commons de foto markeert met een persoonlijkheidsrechten-waarschuwing (`Restrictions: personality`).
Alleen CC0, publiek domein, CC BY en CC BY-SA komen in het register (`tools/real-players/PORTRETTEN.md`);
NC/ND, 'fair use' en onbekend zijn uitgesloten. De tellingen staan in `tools/real-players/data/sync-rapport.json`
en in de HANDOFF.

### Waarom dat niet genoeg is

1. **Auteursrecht ≠ portretrecht.** CC BY-SA geeft toestemming van de fotograaf. De afgebeelde speler kan zich op grond
   van art. 21 Auteurswet verzetten tegen openbaarmaking als hij een *redelijk belang* heeft. Bij bekende sporters is
   dat volgens vaste rechtspraak vaak een **commercieel ('verzilverbaar') populariteitsbelang**.
2. **Een verzamelkaartenspel is precies het klassieke voorbeeld van commerciële exploitatie** van spelersbeelden.
   Partijen als Panini/EA nemen daarvoor licenties via clubs en spelersvakbonden (o.a. FIFPRO). Ook zonder geld
   verdienen blijft het gebruik vergelijkbaar.
3. **Commons waarschuwt zelf** bij een deel van de foto's met het sjabloon 'personality rights'. Bij de rest staat het
   sjabloon er niet, maar het recht bestaat wél.

### Wat het risico verkleint (maar niet wegneemt)

- RANK11 is besloten (alleen op uitnodiging), zonder advertenties, aankopen of inkomsten.
- Foto's zouden alleen achter de login zichtbaar zijn (de proxy-route vereist een sessie), niet op de publieke startpagina.
- Naamsvermelding (maker, licentie, 'bijgesneden', link naar Commons) staat in het kaartdetail.
- De eigen proxy voorkomt dat browsers van kinderen rechtstreeks met Wikimedia praten.

### Besluit en voorwaarden

Martijn heeft op 2-11-2026 bewust gekozen voor foto's. Ingebouwde voorwaarden:

- alleen achter de login (de proxy-route `/api/portrait/:qid` vereist een sessie); de publieke startpagina toont shirtportretten;
- alleen vrije licenties (CC0, publiek domein, CC BY, CC BY-SA) én de spelersnaam in de bestandsnaam (groepsfoto's
  en foto's van anderen vallen af); de rest krijgt het shirtportret;
- naamsvermelding (maker, licentie, 'bijgesneden', link) in het kaartdetail en in de `X-Image-Credit`-header;
- direct uitzetten als een speler, club of rechthebbende bezwaar maakt: `PLAYER_PHOTOS = "false"` in
  `apps/api/wrangler.toml` + worker-deploy (de kaarten vallen dan automatisch terug op het shirtportret).

## Clublogo's

Niet gebruikt. Alternatief: `ClubBadge` (eigen schildvorm, officiële clubkleuren uit Wikidata, eigen afkorting).
Kleuren en clubnamen zijn feitelijke gegevens; er wordt geen logo nagetekend.

## Restrisico's die blijven

- **Naamgebruik** van echte spelers in een spel kan ook onder het portretrecht/persoonlijkheidsrecht vallen (zie R29 in de
  bouwstenenbibliotheek). Disclaimer in de app: "RANK11. is niet gelieerd aan spelers, clubs of bonden."
- **Clubnamen** zijn vaak merken; gebruik als feitelijke aanduiding is meestal toegestaan, maar niet als eigen merk.
- **Rugnummers en kleuren** zijn feiten; de combinatie (shirt in clubkleuren met nummer) is een eigen illustratie zonder logo.
