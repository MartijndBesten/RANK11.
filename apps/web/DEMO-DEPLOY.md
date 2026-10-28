# Publieke demo op Cloudflare (fase 1)

De publieke, speelbare demo draait op een eigen, geïsoleerde Cloudflare-omgeving:

- **URL:** https://rank11-demo.martijndenbesten.com
- **Worker:** `rank11-demo` (serveert statische bestanden uit R2; geen servercode, geen D1, geen cron)
- **R2-bucket:** `rank11-demo` (de demo-build)
- **Config:** `wrangler.demo.toml` + `demo-worker.js`

Alleen fictieve cijfers/testgegevens, geen accounts, geen backend. Multiplayer is in de demo
gesimuleerd (computertegenstanders); dat staat zichtbaar op het competitiescherm.

## Waarom geen Pages en geen Workers Static Assets

Het Cloudflare-token in de ontwikkelomgeving heeft **geen Pages- en geen KV-recht**, en de
egressproxy vervangt elke `Authorization`-header door het account-token. Daardoor faalt de
asset-upload-JWT van Pages én Workers Static Assets (HTTP 401). R2-upload gebruikt het
account-token rechtstreeks en werkt wél. Vandaar: statische bestanden in R2, geserveerd door
een kleine Worker.

## Demo-build

De demo-vlag `VITE_PUBLIC_DEMO=1` slaat de serverdetectie over: meteen de lokale demo, geen
inlog-/accountscherm, snellere start.

```bash
VITE_PUBLIC_DEMO=1 npm run build -w apps/web      # -> apps/web/dist
```

## Uitrollen / bijwerken

Vereist een token met Workers Scripts-edit, Zone-read, Workers custom domains en R2-edit.
In deze omgeving injecteert de proxy de auth; lokaal zet je `CLOUDFLARE_API_TOKEN` en
`CLOUDFLARE_ACCOUNT_ID` zelf.

```bash
# 1. Build (zie boven).
# 2. Bestanden naar R2 (met juiste content-type). Eenmalig de bucket aanmaken:
#    wrangler r2 bucket create rank11-demo
#    Daarna elk bestand uit dist/ PUT-ten naar r2://rank11-demo/<pad> met Content-Type.
# 3. Worker (her)deployen:
cd apps/web
wrangler deploy --config wrangler.demo.toml
```

De worker geeft `index.html` terug voor onbekende paden (single-page-app-fallback).
