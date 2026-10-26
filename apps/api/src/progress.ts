/**
 * Voortgangsbeloningen op de server (V-011): doel bereikt, vooruitgang, herstel, persoonlijk topcijfer en
 * Academy-mijlpalen. Pure regels uit de engine (`progressRewards`); hier alleen laden en wegschrijven.
 * Idempotent: UNIQUE(user_id, key) en INSERT OR IGNORE, dus nooit twee keer dezelfde beloning.
 */
import { newId } from './crypto.ts';
import { many, stmt } from './db.ts';
import { DEFAULT_PERIODS, DEFAULT_PROGRESS_CONFIG, progressRewards, type Goal, type Grade, type ProgressGrant, type XpEntry } from './engine.ts';

export const PROGRESS_CONFIG = DEFAULT_PROGRESS_CONFIG;

export async function loadProgressGrants(db: D1Database, userId: string): Promise<ProgressGrant[]> {
  const rows = await many<{ key: string; kind: ProgressGrant['kind']; label: string; pack_id: string | null; vouchers: number; coins: number; capped_vouchers: number; date: string; subject_id: string | null; config_version: string }>(db,
    'SELECT key, kind, label, pack_id, vouchers, coins, capped_vouchers, date, subject_id, config_version FROM progress_grants WHERE user_id = ? ORDER BY created_at, rowid', userId);
  return rows.map((r) => ({
    key: r.key, kind: r.kind, label: r.label, vouchers: r.vouchers, coins: r.coins, date: r.date, configVersion: r.config_version,
    ...(r.pack_id ? { packId: r.pack_id } : {}), ...(r.capped_vouchers ? { cappedVouchers: r.capped_vouchers } : {}), ...(r.subject_id ? { subjectId: r.subject_id } : {}),
  }));
}

/** Nieuwe voortgangsbeloningen en de bijbehorende schrijfopdrachten (zelfde batch als de aanleiding). */
export async function progressStatements(
  db: D1Database, userId: string,
  input: { grades: readonly Grade[]; goals: readonly Goal[]; ledger: readonly XpEntry[]; today: string },
  source: { kind: 'grade' | 'practice'; id: string }, now: number,
): Promise<{ grants: ProgressGrant[]; statements: D1PreparedStatement[] }> {
  const grants = progressRewards(PROGRESS_CONFIG, { ...input, grants: await loadProgressGrants(db, userId), periods: DEFAULT_PERIODS });
  const statements: D1PreparedStatement[] = [];
  for (const g of grants) {
    const id = newId('prg');
    statements.push(stmt(db, `INSERT INTO progress_grants (id, user_id, key, kind, label, pack_id, vouchers, coins, capped_vouchers, date, subject_id, config_version, source_kind, source_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id, userId, g.key, g.kind, g.label, g.packId ?? null, g.vouchers, g.coins, g.cappedVouchers ?? 0, g.date, g.subjectId ?? null, g.configVersion, source.kind, source.id, now));
    for (const [currency, amount] of [['coins', g.coins], ['vouchers', g.vouchers]] as const) {
      if (amount > 0) statements.push(stmt(db, 'INSERT INTO wallet_ledger (id, user_id, currency, delta, reason, ref, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        newId('led'), userId, currency, amount, `progress.${g.kind}`, `progress:${g.key}`, now));
    }
    if (g.packId) statements.push(stmt(db, `INSERT OR IGNORE INTO pack_grants (id, user_id, pack_id, source, source_ref, created_at) VALUES (?, ?, ?, 'progress', ?, ?)`,
      newId('pg'), userId, g.packId, g.key, now));
  }
  return { grants, statements };
}

export const progressView = (g: ProgressGrant) => ({ key: g.key, kind: g.kind, label: g.label, packId: g.packId ?? null, vouchers: g.vouchers, coins: g.coins, cappedVouchers: g.cappedVouchers ?? 0 });
