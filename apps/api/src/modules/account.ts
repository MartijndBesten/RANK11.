/**
 * AVG-rechten van de leerling: eigen gegevens inzien/exporteren (art. 15/20) en het account volledig verwijderen
 * (art. 17). Alleen voor jezelf. Nodig voor een besloten test met (minderjarige) gebruikers.
 */
import { requireUser } from '../auth.ts';
import { many, one, run, stmt } from '../db.ts';
import { SESSION_COOKIE } from '../auth.ts';
import { json, type Ctx } from '../http.ts';

const CLEAR_COOKIE = `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;

/** Alle eigen gegevens als JSON. Geen tokens, geen gegevens van anderen. */
export async function exportAccount(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const db = ctx.env.DB;
  const id = user.id;
  const club = await one(db, 'SELECT name, short, crest_json, updated_at FROM clubs WHERE user_id = ?', id);
  const grades = await many(db, 'SELECT subject_id, test_name, value, weight, date, status, source, external_ref, created_at, updated_at FROM grades WHERE user_id = ? AND deleted_at IS NULL ORDER BY date, created_at', id);
  const xp = await many(db, 'SELECT key, category, xp, label, date, source_kind, source_id, config_version FROM xp_ledger WHERE user_id = ? ORDER BY created_at', id);
  const collection = await many(db, 'SELECT card_def_id, acquired_via, acquired_at FROM card_instances WHERE user_id = ? ORDER BY acquired_at', id);
  const goals = await many(db, 'SELECT scope, subject_id, target, created_at FROM goals WHERE user_id = ?', id);
  const upcoming = await many(db, 'SELECT subject_id, name, date, weight FROM upcoming_tests WHERE user_id = ?', id);
  const wallet = await one(db, "SELECT COALESCE(SUM(CASE WHEN currency='coins' THEN delta END),0) AS coins, COALESCE(SUM(CASE WHEN currency='vouchers' THEN delta END),0) AS vouchers FROM wallet_ledger WHERE user_id = ?", id);
  const integrations = await many(db, 'SELECT provider, display_name, status, last_sync_at FROM integration_links WHERE user_id = ?', id);
  const settings = await one(db, 'SELECT tips, tips_seen FROM user_settings WHERE user_id = ?', id);
  return json({
    exportedAt: ctx.now,
    account: { username: user.username, role: user.role },
    club, wallet, grades, xp, collection, goals, upcoming,
    integrations, // zonder tokens
    settings,
  });
}

/**
 * Verwijdert het account en alle persoonlijke gegevens (cijfers, collectie, XP, koppelingen incl. tokens, sessies).
 * Gedeelde gegevens blijven overeind: een pool die de gebruiker aanmaakte, wordt overgedragen aan een ander lid;
 * is er geen ander lid, dan vervalt de pool. Wedstrijden en uitnodigingen van de gebruiker worden verwijderd.
 */
export async function deleteAccount(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const db = ctx.env.DB;
  const id = user.id;

  // Pools die deze gebruiker aanmaakte: overdragen aan het oudste andere lid, anders de pool verwijderen.
  const ownedPools = await many<{ id: string }>(db, 'SELECT id FROM pools WHERE created_by = ?', id);
  const pre: ReturnType<typeof stmt>[] = [];
  for (const p of ownedPools) {
    const heir = await one<{ user_id: string }>(db, 'SELECT user_id FROM pool_members WHERE pool_id = ? AND user_id != ? ORDER BY joined_at LIMIT 1', p.id, id);
    if (heir) {
      pre.push(stmt(db, 'UPDATE pools SET created_by = ? WHERE id = ?', heir.user_id, p.id));
      pre.push(stmt(db, "UPDATE pool_members SET role = 'admin' WHERE pool_id = ? AND user_id = ?", p.id, heir.user_id));
      pre.push(stmt(db, 'UPDATE competitions SET created_by = ? WHERE pool_id = ? AND created_by = ?', heir.user_id, p.id, id));
    } else {
      pre.push(stmt(db, 'DELETE FROM pools WHERE id = ?', p.id)); // cascade: leden, wedstrijden, competities, uitnodigingen
    }
  }

  await db.batch([
    ...pre,
    // Overige verwijzingen zonder cascade.
    stmt(db, 'DELETE FROM matches WHERE home_user_id = ? OR away_user_id = ? OR challenger_id = ?', id, id, id),
    stmt(db, 'DELETE FROM competition_fixtures WHERE home_user_id = ? OR away_user_id = ?', id, id),
    stmt(db, 'DELETE FROM competitions WHERE created_by = ?', id),
    stmt(db, 'DELETE FROM pool_invites WHERE created_by = ?', id),
    stmt(db, 'DELETE FROM idempotency_keys WHERE user_id = ?', id),
    // De gebruiker zelf: cascade wist alle persoonlijke tabellen (cijfers, collectie, XP, koppelingen, sessies, ...).
    stmt(db, 'DELETE FROM users WHERE id = ?', id),
  ]);
  return json({ deleted: true }, 200, { 'Set-Cookie': CLEAR_COOKIE });
}
