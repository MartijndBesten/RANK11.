/**
 * Publieke spelconfiguratie en feature flags. Flags komen uit de omgeving (wrangler.toml), zodat een
 * functie per omgeving aan of uit kan zonder codewijziging. Standaard staat de transfermarkt UIT (V-015).
 */
import { DEFAULT_MOTIVATION_CONFIG, DEFAULT_PROGRESS_CONFIG, FAIR_REWARD_CONFIG } from '../engine.ts';
import { intVar, type Env } from '../env.ts';
import { ApiError, json, type Ctx } from '../http.ts';

export interface Flags { market: boolean; academy: boolean }

export function flags(env: Env): Flags {
  return { market: env.FEATURE_MARKET === 'true', academy: env.FEATURE_ACADEMY !== 'false' };
}

/** Deadline voor asynchrone wedstrijden in uren (per zet en voor het accepteren); standaard 48 (V-014). */
export function asyncDeadlineHours(env: Env): number {
  return Math.min(24 * 7, intVar(env.ASYNC_DEADLINE_HOURS, 48));
}

export function requireFlag(env: Env, flag: keyof Flags): void {
  if (!flags(env)[flag]) throw new ApiError(404, 'not_found', 'Niet gevonden.');
}

export async function getConfig(ctx: Ctx): Promise<Response> {
  return json({
    flags: flags(ctx.env),
    asyncDeadlineHours: asyncDeadlineHours(ctx.env),
    versions: { rewards: FAIR_REWARD_CONFIG.version, progress: DEFAULT_PROGRESS_CONFIG.version, motivation: DEFAULT_MOTIVATION_CONFIG.version },
  });
}
