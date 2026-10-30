# E-mail voor oudertoestemming — instellen

De oudertoestemming is volledig gebouwd en werkt, **behalve het daadwerkelijk versturen van de e-mail**.
Zolang er geen e-mailprovider is ingesteld, wordt er geen mail verzonden (`emailSent: false`) en kan de
toestemmingslink alleen via de beheerder worden opgehaald (Instellingen → beheer, of de API
`POST /api/admin/consents/:userId/link`). Dat is bewust: er wordt nooit stilzwijgend geactiveerd.

## Waarom een externe provider?

Cloudflare Workers kan niet zelf vrij e-mail versturen naar willekeurige ouderadressen. Daarvoor is een
transactionele e-maildienst nodig. De code gebruikt **Resend** (ruime gratislaag) via een eenvoudige
HTTPS-API; een andere provider is later in `apps/api/src/modules/email.ts` eenvoudig toe te voegen.

## Eenmalig instellen (handeling van de accountbeheerder)

1. Maak een account op https://resend.com (gratis laag volstaat voor een gezin/kleine groep).
2. Voeg het domein `martijndenbesten.com` toe en zet de door Resend opgegeven **DNS-records** klaar
   (SPF/DKIM, en DMARC aanbevolen). *Let op:* het sessietoken in deze omgeving heeft geen DNS-schrijfrecht,
   dus deze DNS-records zet de beheerder zelf in het Cloudflare-dashboard.
3. Maak in Resend een **API-sleutel** aan.
4. Zet de Worker-variabelen en -secret (per omgeving: `--env test` en/of `--env prod`), vanuit `apps/api`:
   ```bash
   # EMAIL_PROVIDER en EMAIL_FROM zijn gewone vars; zet ze in wrangler.toml of als secret.
   wrangler secret put RESEND_API_KEY --env prod      # plak de Resend-sleutel
   ```
   En in `wrangler.toml` onder de betreffende `[env.*.vars]`:
   ```toml
   EMAIL_PROVIDER = "resend"
   EMAIL_FROM = "RANK11 <geen-antwoord@martijndenbesten.com>"
   ```
5. Deploy opnieuw: `wrangler deploy --env prod`.

Daarna verstuurt RANK11 de toestemmingsmail automatisch zodra een kind onder 16 zich registreert, en de
intrekmail wanneer een ouder daarom vraagt. Geen sleutel in git, logs of rapporten.

## Bot-bescherming (optioneel, aanbevolen vóór publieke opening)

Voor Cloudflare Turnstile op registratie:
1. Maak een Turnstile-widget aan in het Cloudflare-dashboard (sitekey + secret).
2. Zet `TURNSTILE_SITE_KEY` (publiek, in `[env.*.vars]`) en `TURNSTILE_SECRET` (via `wrangler secret put`).
3. De frontend toont dan automatisch de widget bij registreren en de server controleert de token.
