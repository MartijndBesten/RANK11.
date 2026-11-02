# RANK11. — open punten: voorbereide stappenplannen

Voorbereid, **nog niet uitgevoerd**. Account aanmaken, betalen, juridische toetsing en de keuze van het
contactadres liggen bij Martijn. Zie ook [EMAIL-SETUP.md](EMAIL-SETUP.md) en
[PRIVACY-VOORBEREIDING.md](PRIVACY-VOORBEREIDING.md).

---

## 1. E-mail via Resend (met DMARC `p=reject` + strikte alignment)

`martijndenbesten.com` heeft **SPF `-all`** en **DMARC `p=reject; sp=reject; adkim=s; aspf=s`**. Door de
**strikte alignment** moet het afzenderdomein exact kloppen, anders weigert de ontvanger de mail.

**Aanpak (betrouwbaar via DKIM):**
1. Maak een **Resend-account** (gratis laag: ~3.000 mails/maand, 100/dag — ruim genoeg voor een gezin/
   groepje; **geen betaald abonnement nodig**). → *vraag aan Martijn hieronder.*
2. Verifieer in Resend een **eigen afzender-subdomein**, bijv. `rank11.martijndenbesten.com` (voorstel).
   Een subdomein houdt de strenge apex-SPF (`-all`) en apex-DMARC ongemoeid en geeft schone alignment.
3. Zet de **door Resend opgegeven DNS-records** op dat subdomein in het Cloudflare-dashboard
   (het sessietoken hier heeft geen DNS-rechten, dus Martijn doet dit):
   - **DKIM** (TXT/CNAME met selector): hiermee is `d=` = het afzenderdomein → **DKIM strict alignment**
     slaagt onder `adkim=s`. Dit is de route die DMARC laat slagen.
   - **SPF** (TXT op het subdomein) met de `include` van Resend — **géén tweede SPF-record op de apex**,
     alleen op het subdomein.
   - **MAIL FROM / Return-Path**-record als Resend dat vraagt (voor SPF-alignment onder `aspf=s`).
4. Stel `EMAIL_FROM` in op een afzender op **exact dat geverifieerde (sub)domein**, bijv. een
   `geen-antwoord`-postbus op `rank11.martijndenbesten.com` (weergegeven als `RANK11 <geen-antwoord@…>`) —
   zo matcht de `From:` met `d=` (DKIM strict).
5. Config in de code (na verificatie):
   - in `apps/api/wrangler.toml` onder `[env.prod.vars]`: `EMAIL_PROVIDER = "resend"` en `EMAIL_FROM = "…"`;
   - secret: `wrangler secret put RESEND_API_KEY --env prod` (plak de Resend-sleutel; **niet** in git/logs);
   - opnieuw deployen: `wrangler deploy --env prod`.
6. **Test met een echte ouder-mailbox** vóór je ervan afhankelijk bent (DMARC-rapport = pass op DKIM).

Daarna verloopt oudergoedkeuring voor onder-16 vanzelf via de e-maillink; de beheerder-route blijft bestaan.

---

## 2. Cloudflare Turnstile (gratis botbescherming)

1. Cloudflare-dashboard → **Turnstile** → **Add widget**.
2. Instellingen:
   - **Name:** RANK11 (vrij te kiezen).
   - **Hostnames:** `rank11.martijndenbesten.com` (voeg `rank11-test.martijndenbesten.com` toe als je ook
     in de testomgeving wilt testen).
   - **Widget mode:** **Managed** (aanbevolen: toont alleen een uitdaging bij verdacht verkeer; minste
     wrijving voor kinderen). "Invisible"/"Non-interactive" kan ook.
   - **Pre-clearance:** uit (niet nodig).
3. Opslaan → je krijgt een **Site Key** (publiek) en een **Secret Key** (geheim).
4. Config in de code:
   - `TURNSTILE_SITE_KEY = "<site key>"` in `apps/api/wrangler.toml` onder `[env.prod.vars]` (mag zichtbaar);
   - `wrangler secret put TURNSTILE_SECRET --env prod` (plak de Secret Key);
   - opnieuw deployen. De frontend toont dan automatisch de widget bij registreren en de server controleert
     de token (al ingebouwd). De IP-limiet (`REG_MAX_PER_IP`) blijft als extra rem bestaan.

Gratis; geen betaald abonnement nodig.

---

## 3. Korte DPIA-checklist (kinderen onder 16)

Bondige checklist om door te lopen (de volledige vrijgavecheck staat in
[PRIVACY-VOORBEREIDING.md](PRIVACY-VOORBEREIDING.md)). Leg per punt kort vast "akkoord" + datum.

- [ ] **Doel & rechtsgrond:** spel met zelf-ingevoerde cijfers; grond = **toestemming** (AVG art. 6 lid 1a),
      voor onder 16 **ouderlijke toestemming** (art. 8). Aantoonbaar vastgelegd (methode + datum).
- [ ] **Dataminimalisatie:** alleen gebruikersnaam (verzonnen mag), hash van wachtwoord, zelf-ingevoerde
      cijfers, spelvoortgang, en bij onder 16 het ouder-e-mailadres + toestemmingsbewijs. **Geen** echte
      naam/geboortedatum/school/adres/kind-e-mail verplicht.
- [ ] **Bijzondere categorieën:** geen (schoolcijfers zijn zelf-ingevoerd, niet officieel, privé).
- [ ] **Ontvangers/subverwerkers:** Cloudflare (EU-jurisdictie) en — zodra e-mail aan — Resend;
      **verwerkersovereenkomst (DPA)** van beide bewaren.
- [ ] **Opslag & doorgifte:** binnen de EU (D1 `--jurisdiction eu`); geen doorgifte buiten de EU beoogd.
- [ ] **Bewaartermijn:** wachtende accounts worden automatisch opgeruimd; actieve accounts tot verwijdering/
      intrekken. Termijn concreet vastleggen.
- [ ] **Rechten:** inzage/export (`GET /api/me/export`), verwijderen (`DELETE /api/me`), toestemming
      intrekken (beheerder/ouder). Werkend en getest.
- [ ] **Beveiliging:** PBKDF2, gehashte sessietokens, SameSite=Strict, CSRF-origin-check, rate limiting,
      accountisolatie (getest).
- [ ] **Kinderen specifiek:** leeftijdsvraag bij registratie; geen spel-toegang vóór goedkeuring (server
      afgedwongen); geen reclameprofielen, geen openbare cijferlijsten.
- [ ] **Risico's & maatregelen:** incl. **naamgebruik echte spelers** (portretrecht/collectieve licenties,
      bijv. FIFPRO) — geen foto's/logo's, disclaimer aanwezig, juridisch te toetsen (restrisico R29).
- [ ] **Verantwoordelijke & contact:** vermeld op de site/privacypagina. → *contactadres: vraag hieronder.*

---

## 4. Instructie: een kind onder 16 goedkeuren (beheerder-route)

Zolang e-mail nog niet aanstaat, keurt een **beheerder** een kind onder 16 goed nadat de ouder is gevraagd:

1. Het kind maakt een account en kiest **"jonger dan 16"** → komt op het scherm **"we wachten op je ouder"**.
2. Het kind tikt op **"Toon koppelcode voor beheerder"** → er verschijnt een korte code.
3. Jij, ingelogd als **beheerder** (het account `beheerder`): **Instellingen → Ouderlijke goedkeuringen**.
4. Voer de **koppelcode** in, zet het **vinkje** (je bent/handelt namens de ouder), klik
   **"Goedkeuren met koppelcode"**.
5. Het kind kan nu spelen.

16+ hoeft dit niet; die spelen meteen. Een kind kan zichzelf **niet** goedkeuren met de code — dat kan alleen
een ingelogde beheerder (of straks de ouder via de e-maillink).

---

## Ronde 15 (2-11-2026) — nieuwe open punten

| # | Punt | Wie | Toelichting |
|---|---|---|---|
| R15-1 | **Akkoord op uitrol** van PR "Ronde 15" naar test en daarna prod | Martijn | Volgorde: herstelpunt → frontend-assets → worker. Zie HANDOFF ronde 15. |
| R15-2 | **Portretrecht spelersfoto's** | Martijn | Foto's staan aan (keuze Martijn), alleen achter login. Vrije licentie ≠ toestemming van de speler. Bij bezwaar: `PLAYER_PHOTOS = "false"` + worker-deploy. Zie [BEELDRECHTEN.md](BEELDRECHTEN.md). |
| R15-3 | **Ongebruikte AI-portretten verwijderen** | volgende sessie met push-rechten | `apps/web/public/portraits/*.webp` (209 bestanden, fictieve personen) worden niet meer gebruikt. Via de GitHub-webinterface niet in één keer te verwijderen. |
| R15-4 | **Live eindcontrole** na uitrol | Martijn / volgende sessie | Inloggen, 7,5 invoeren → Goudpack; kaart van een oude speler (bijv. p0008 Adrián) toont "Niet meer actief" en blijft in de collectie; foto's laden. |
| R15-5 | **Collectiecontrole op prod** | volgende sessie met D1-toegang | `SELECT card_def_id, COUNT(*) FROM card_instances GROUP BY 1` — alle id's moeten in de catalog-lock of de nieuwe catalogus staan (verwacht: 0 onbekend). Deze sessie had geen D1-toegang. |
| R15-6 | **Periodieke catalogus-sync** | later | `tools/real-players/sync.mjs` opnieuw draaien (bijv. na de transferperiode). Bestaande kaarten veranderen nooit van speler; ratings max. ±5 per sync. |
| R15-7 | **Demo-worker** `rank11-demo` + DNS-record verwijderen | Martijn | Ongewijzigd openstaand uit ronde 14b. |
