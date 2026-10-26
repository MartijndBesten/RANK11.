# Besloten test op Cloudflare (fase 2)

De echte multiplayerbackend draait voor een besloten test op een eigen, geïsoleerde omgeving.
**Alleen synthetische accounts / familie & bekenden die Martijn zelf toelaat.** Geen echte
leerlingen (dat is fase 3 en vereist alsnog ouderlijke toestemming + DPIA).

- **URL:** https://rank11-test.martijndenbesten.com (frontend én `/api`, same-origin)
- **Worker:** `rank11-api-test` (`wrangler deploy --env test`)
- **D1:** `rank11-test` in regio **WEUR (EU)** — id in `wrangler.toml`
- **Durable Object:** `MatchDO` (async kaartbattles)
- **R2:** `rank11-test-web` (de online frontend-build)
- **Geen cron** (alleen `env.dev` heeft een cron-trigger; `env.test` niet)

## Beveiliging (fase 2, punt 3)

- **noindex overal:** `X-Robots-Tag: noindex, nofollow` op alle API- en frontend-responses,
  plus `/robots.txt` met `Disallow: /`. Besloten test, niet door zoekmachines indexeerbaar.
- **Rate limiting** op inloggen: per gebruikersnaam (`LOGIN_MAX_FAILURES`) en per IP
  (`LOGIN_MAX_FAILURES_IP`), 429 bij overschrijding (bestond al).
- **Secret:** `INTEGRATION_KEY` is een Worker-secret (`wrangler secret put INTEGRATION_KEY --env test`),
  niet in de repository. Sessies zijn willekeurige tokens (alleen de SHA-256 staat in D1).
- **CORS/cookies:** same-origin; `ALLOWED_ORIGINS` = de test-URL. Cookies HttpOnly, Secure, SameSite=Strict.
- Niet gedaan (bewust, besloten invite-only test): Turnstile/captcha. Registratie is al afgeschermd
  met uitnodigingscodes.

## (Her)uitrollen

```bash
# Backend:
cd apps/api
wrangler d1 migrations apply rank11-test --remote --env test   # eenmalig / bij nieuwe migraties
wrangler deploy --env test

# Frontend (online-build, zonder VITE_PUBLIC_DEMO):
npm run build -w apps/web                 # -> apps/web/dist
#   dist/* uploaden naar r2://rank11-test-web/<pad> met juiste Content-Type.
```

## Uitnodigingscode aanmaken

Een platform-admin maakt codes via `POST /api/admin/platform-invites`. De eerste code is
rechtstreeks in D1 gezet (`platform_invites`: `code_hash = sha256('invite:' + code)`,
`max_uses`, `expires_at`). Een geregistreerd account kan tot `platform_admin` worden verheven
met een D1-update op `users.role`.
