/**
 * Synchronisatie-engine: haalt cijfers bij een provider op, mapt ze en zet ze door via dezelfde cijferinvoer
 * als handmatig (insertGrade). Idempotent: een al geïmporteerd cijfer (externe sleutel, of zelfde vak+waarde+datum)
 * levert nooit een tweede cijfer of dubbele beloning op. Alleen voor beschikbare providers.
 */
import { many, one, run } from '../../db.ts';
import type { Env } from '../../env.ts';
import type { Ctx } from '../../http.ts';
import type { SubjectAlias } from '../../engine.ts';
import { insertGrade } from '../grades.ts';
import { mapExternalGrade } from './mapping.ts';
import { getProvider, PROVIDERS, type LinkRow } from './providers.ts';

/** Vakherkenning voor de server (zelfde vakcodes als de app). */
const SUBJECTS: SubjectAlias[] = [
  { id: 'wis', aliases: ['WI', 'wiskunde', 'wiskunde a', 'wiskunde b'] },
  { id: 'ne', aliases: ['NE', 'nederlands'] },
  { id: 'en', aliases: ['EN', 'engels'] },
  { id: 'fa', aliases: ['FA', 'frans'] },
  { id: 'bi', aliases: ['BI', 'biologie'] },
  { id: 'gs', aliases: ['GS', 'geschiedenis'] },
  { id: 'nask', aliases: ['NA', 'nask', 'natuurkunde'] },
  { id: 'ak', aliases: ['AK', 'aardrijkskunde'] },
];

export interface SyncResult { created: number; duplicate: number; invalid: number }

export async function loadLink(ctx: Ctx, userId: string, provider: string): Promise<LinkRow | null> {
  return one<LinkRow>(ctx.env.DB,
    'SELECT user_id, provider, external_id, display_name, status, token_enc, last_sync_at, last_error FROM integration_links WHERE user_id = ? AND provider = ?',
    userId, provider);
}

/** Synchroniseert één provider voor één gebruiker. Werkt de koppelstatus en eventuele foutmelding bij. */
export async function syncProvider(ctx: Ctx, userId: string, providerId: string): Promise<SyncResult> {
  const provider = getProvider(providerId);
  const link = await loadLink(ctx, userId, providerId);
  if (!provider || !provider.available || !provider.fetchGrades) throw new Error('Deze bron kan nog niet synchroniseren.');
  if (!link) throw new Error('Niet gekoppeld.');

  const today = new Date(ctx.now).toISOString().slice(0, 10);
  let result: SyncResult = { created: 0, duplicate: 0, invalid: 0 };
  try {
    const raw = await provider.fetchGrades(ctx, link);
    for (const ext of raw) {
      const mapped = mapExternalGrade(ext, SUBJECTS, today);
      if (!mapped.ok) { result.invalid++; continue; }
      const g = mapped.grade;
      const res = await insertGrade(ctx, userId, { subjectId: g.subjectId, testName: g.testName, value: g.value, weight: g.weight, date: g.date }, {
        source: providerId === 'magister' ? 'magister' : 'import',
        status: g.verified ? 'confirmed' : 'self',
        externalRef: `${providerId}:${g.externalRef}`,
      });
      if (res.outcome === 'created') result.created++; else result.duplicate++;
    }
    await run(ctx.env.DB, 'UPDATE integration_links SET status = ?, last_sync_at = ?, last_error = NULL, updated_at = ? WHERE user_id = ? AND provider = ?',
      'linked', ctx.now, ctx.now, userId, providerId);
  } catch (err) {
    const msg = err instanceof Error ? err.message.slice(0, 200) : 'Synchronisatie mislukt.';
    await run(ctx.env.DB, 'UPDATE integration_links SET status = ?, last_error = ?, updated_at = ? WHERE user_id = ? AND provider = ?',
      'error', msg, ctx.now, userId, providerId);
    throw err;
  }
  return result;
}

/** Alle gekoppelde gebruikers van een provider (voor een periodieke sync via een cron/scheduled handler). */
export async function linkedUsers(ctx: Ctx, providerId: string): Promise<string[]> {
  const rows = await many<{ user_id: string }>(ctx.env.DB, 'SELECT user_id FROM integration_links WHERE provider = ? AND status != ?', providerId, 'reauth');
  return rows.map((r) => r.user_id);
}

/** Minimale context voor een geplande run (geen HTTP-request): de sync gebruikt alleen env en now. */
function scheduledCtx(env: Env, now: number): Ctx {
  return {
    req: new Request('https://scheduled.local'), env, url: new URL('https://scheduled.local'),
    params: {}, now, ip: 'scheduled', user: null, sessionToken: null,
  };
}

export interface ScheduledSyncReport { provider: string; users: number; created: number; duplicate: number; invalid: number; failed: number }

/**
 * Periodieke synchronisatie van alle beschikbare providers voor alle gekoppelde gebruikers. Bedoeld voor een
 * Cloudflare scheduled handler (cron). Idempotent: al geïmporteerde cijfers leveren niets dubbels op. Een fout bij
 * één gebruiker stopt de rest niet; die koppeling krijgt status 'error'.
 */
export async function runScheduledSync(env: Env, now: number): Promise<ScheduledSyncReport[]> {
  const ctx = scheduledCtx(env, now);
  const reports: ScheduledSyncReport[] = [];
  for (const provider of Object.values(PROVIDERS)) {
    if (!provider.available || !provider.fetchGrades) continue;
    const users = await linkedUsers(ctx, provider.id);
    const r: ScheduledSyncReport = { provider: provider.id, users: users.length, created: 0, duplicate: 0, invalid: 0, failed: 0 };
    for (const userId of users) {
      try { const res = await syncProvider(ctx, userId, provider.id); r.created += res.created; r.duplicate += res.duplicate; r.invalid += res.invalid; }
      catch { r.failed++; }
    }
    reports.push(r);
  }
  return reports;
}
