# Besloten synthetische testpilot

De actuele procedure staat in [PILOT-UITROL](../../docs/PILOT-UITROL.md).
De code gebruikt één Worker met D1, Durable Objects en een private R2-bucket voor de frontend.
Frontend én API vereisen Basic Auth; accountauthenticatie gebruikt daarnaast sessiecookies.
Registratie is standaard gesloten. Geen test-cron, geen echte leerlinggegevens.

## Uitgerold en geverifieerd — 30 oktober 2026 (Claude Code, cloudsessie met Cloudflare-toegang)

De gehardde online-only pilot (PR #9) staat nu live op https://rank11-test.martijndenbesten.com
en is van buitenaf gecontroleerd:

- Zonder Basic Auth geven `/`, assets, `/portraits/*` en `/api/health` allemaal **401**
  (`WWW-Authenticate: Basic realm="RANK11 pilot"`), met `noindex, nofollow, noarchive` en `no-store`.
- Met Basic Auth: `/api/health` → `{ok:true}`, de online-only app laadt (geen demo-terugval,
  geen demo-knop, geen registratietab; storingsscherm bij serveruitval).
- Registratie open maar dubbel afgeschermd: `POST /api/auth/register` lukt alleen mét Basic Auth
  én geldige uitnodigingscode (201); zonder invite 400, zonder Basic Auth 401. Volledig publiek
  (Basic Auth eraf) pas na oudertoestemming + DPIA.
- Bestaande synthetische accounts kunnen inloggen (200) en spelen; echte serverdata, geen demo-cijfers.
- Secrets gezet: `INTEGRATION_KEY`, `PILOT_ACCESS_USER`, `PILOT_ACCESS_PASSWORD`. Geen test-cron.
- D1 `rank11-test` draait in regio **WEUR** met alle 6 migraties toegepast. Let op: WEUR is een
  plaatsing, geen bewijs van EU-**jurisdictie**; voor strikt juridische EU-jurisdictie is
  `wrangler d1 create ... --jurisdiction eu` nodig (nieuwe lege DB).

Nieuwe accounts toevoegen: zet tijdelijk `REGISTRATION_ENABLED=true` + deploy, registreer achter
de Basic Auth, zet daarna direct terug op `false` + deploy (zie PILOT-UITROL stap 7).
