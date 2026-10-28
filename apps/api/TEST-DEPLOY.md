# Besloten synthetische testpilot

De actuele procedure staat in [PILOT-UITROL](../../docs/PILOT-UITROL.md).
De code gebruikt één Worker met D1, Durable Objects en een private R2-bucket voor de frontend.
Frontend én API vereisen Basic Auth; accountauthenticatie gebruikt daarnaast sessiecookies.
Registratie is standaard gesloten. Geen test-cron, geen echte leerlinggegevens.

De eerdere claim dat de backend en eerste uitnodiging al waren ingericht is niet onafhankelijk
geverifieerd. Op 28 oktober 2026 antwoordde de bestaande test-health-URL zonder Basic Auth.
De beveiligingswijziging moet nog worden uitgerold en gehost gecontroleerd.
Een database-ID in wrangler.toml bewijst geen EU-jurisdictie of toegepaste migraties.
