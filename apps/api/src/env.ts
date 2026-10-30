/** Bindings en instellingen van de Worker (zie wrangler.toml). Geen secrets in deze repository. */
export interface Env {
  /** Alleen de besloten synthetische pilot: website en API achter HTTP Basic Auth. */
  PILOT_MODE?: string;
  PILOT_ACCESS_USER?: string;
  PILOT_ACCESS_PASSWORD?: string;
  REGISTRATION_ENABLED?: string;
  DB: D1Database;
  MATCH: DurableObjectNamespace;
  /** Komma-gescheiden lijst van toegestane origins voor CORS. */
  ALLOWED_ORIGINS?: string;
  /** PBKDF2-iteraties (maximaal 100000 op Workers; tests gebruiken minder voor snelheid). */
  PBKDF2_ITERATIONS?: string;
  SESSION_TTL_DAYS?: string;
  /** Standaard maximaal aantal leden per pool (GDD §4.8: 20). */
  POOL_MAX_MEMBERS_DEFAULT?: string;
  /** Mislukte inlogpogingen per gebruikersnaam per kwartier. */
  LOGIN_MAX_FAILURES?: string;
  /** Mislukte inlogpogingen per IP per kwartier. */
  LOGIN_MAX_FAILURES_IP?: string;
  ENVIRONMENT?: string;
  /** Feature flags: 'true'/'false'. Transfermarkt staat standaard uit (V-015). */
  FEATURE_MARKET?: string;
  FEATURE_ACADEMY?: string;
  /** Deadline in uren voor asynchrone wedstrijden (per zet en voor accepteren); standaard 48 (V-014). */
  ASYNC_DEADLINE_HOURS?: string;
  /** Secret voor het versleutelen van koppelingstokens (AES-GCM). Dev gebruikt een niet-geheime placeholder. */
  INTEGRATION_KEY?: string;
  /** Statische frontend-build (same-origin). Alleen gebonden in omgevingen die de frontend meeserveren. */
  ASSETS?: R2Bucket;
  /** Open registratie (zelfregistratie zonder uitnodigingscode). 'true' schakelt de nieuwe flow in. */
  OPEN_REGISTRATION?: string;
  /** Maximaal aantal open registraties per IP per uur (basis-misbruikrem naast Turnstile). Standaard 15. */
  REG_MAX_PER_IP?: string;
  /** Canonieke publieke URL voor e-maillinks (bijv. https://rank11.martijndenbesten.com). */
  PUBLIC_BASE_URL?: string;
  /** E-mailprovider voor oudertoestemming: 'resend' of leeg (dan wordt er niets verzonden). */
  EMAIL_PROVIDER?: string;
  EMAIL_FROM?: string;
  RESEND_API_KEY?: string;
  /** Cloudflare Turnstile secret voor bot-bescherming op registratie/e-mail. Leeg = check uit. */
  TURNSTILE_SECRET?: string;
  /** Publieke Turnstile-sitekey voor de frontend-widget (mag zichtbaar zijn). */
  TURNSTILE_SITE_KEY?: string;
}

export function intVar(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}
