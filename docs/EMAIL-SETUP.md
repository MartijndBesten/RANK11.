# E-mail voor oudertoestemming — instellen

De oudertoestemming is volledig gebouwd en werkt, **behalve het daadwerkelijk versturen van de e-mail**.
Zolang er geen e-mailprovider is ingesteld, wordt er geen mail verzonden (`emailSent: false`) en verloopt
toestemming via de **beheerder-route**: het kind toont een koppelcode (Instellingen → wachtscherm), die een
ingelogde beheerder invoert bij *Ouderlijke goedkeuringen* (API `POST /api/admin/consents/approve`). Een
koppelcode leidt nooit tot zelfgoedkeuring en de interface beweert nooit dat er een e-mail is verstuurd.

## Waarom een externe provider?

Cloudflare Workers kan niet zelf vrij e-mail versturen naar willekeurige ouderadressen. Daarvoor is een
transactionele e-maildienst nodig. De code gebruikt **Resend** (ruime gratislaag) via een eenvoudige
HTTPS-API; een andere provider is later in `apps/api/src/modules/email.ts` eenvoudig toe te voegen.

## Eenmalig instellen (handeling van de accountbeheerder)

1. Maak een account op https://resend.com (gratis laag volstaat voor een gezin/kleine groep).
2. Verifieer het **exacte afzenderdomein** in Resend en zet de opgegeven **DNS-records** (SPF/DKIM) klaar.
   *Let op:* het sessietoken in deze omgeving heeft geen DNS-schrijfrecht, dus deze records zet de beheerder
   zelf in het Cloudflare-dashboard.

   > ⚠️ **Belangrijk (DNS-strengheid sinds 02-11-2026).** `martijndenbesten.com` heeft nu **SPF `-all`**
   > (hardfail) en **DMARC `p=reject; sp=reject; adkim=s; aspf=s`** — dit geldt óók voor subdomeinen (`sp`,
   > strikte alignment). Gevolg: elke mail van een niet-geverifieerd/niet-uitgelijnd afzenderadres wordt
   > **geweigerd**. Verifieer daarom in Resend het **precieze** afzenderdomein dat je in `EMAIL_FROM` gebruikt
   > (bijvoorbeeld een subdomein als `rank11.martijndenbesten.com`) met een **eigen SPF-record en eigen
   > DKIM-sleutel** op dat (sub)domein. Door de strikte DMARC-alignment (`adkim=s`, `aspf=s`) moet het
   > DKIM-`d=`-domein én het SPF-/envelope-domein exact overeenkomen met het afzenderdomein; anders faalt
   > DMARC en wordt de toestemmingsmail door ontvangers verworpen. Test met een echte ouder-mailbox vóór
   > de publieke afhankelijkheid van e-mail.
3. Maak in Resend een **API-sleutel** aan.
4. Zet de Worker-variabelen en -secret (per omgeving: `--env test` en/of `--env prod`), vanuit `apps/api`:
   ```bash
   # EMAIL_PROVIDER en EMAIL_FROM zijn gewone vars; zet ze in wrangler.toml of als secret.
   wrangler secret put RESEND_API_KEY --env prod      # plak de Resend-sleutel
   ```
   En in `wrangler.toml` onder de betreffende `[env.*.vars]`:
   ```toml
   EMAIL_PROVIDER = "resend"
   EMAIL_FROM = "RANK11 <geen-antwoord@example.nl>"  # vervang door je eigen (geverifieerde) domein
   ```
5. Deploy opnieuw: `wrangler deploy --env prod`.

Daarna verstuurt RANK11 de toestemmingsmail automatisch zodra een kind onder 16 zich registreert, en de
intrekmail wanneer een ouder daarom vraagt. Geen sleutel in git, logs of rapporten.

## Bot-bescherming (optioneel, aanbevolen vóór publieke opening)

Voor Cloudflare Turnstile op registratie:
1. Maak een Turnstile-widget aan in het Cloudflare-dashboard (sitekey + secret).
2. Zet `TURNSTILE_SITE_KEY` (publiek, in `[env.*.vars]`) en `TURNSTILE_SECRET` (via `wrangler secret put`).
3. De frontend toont dan automatisch de widget bij registreren en de server controleert de token.
