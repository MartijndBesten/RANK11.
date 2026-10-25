/** Bindings en instellingen van de Worker (zie wrangler.toml). Geen secrets in deze repository. */
export interface Env {
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
}

export function intVar(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}
