/**
 * Cijferkluis op de server: toegekende beloningen die de leerling nog niet heeft geopend, met de
 * bijbehorende XP-regels en (bij Legendarisch) de spelerskeuze. Openen en kiezen zijn idempotent.
 */
import { requireUser } from '../auth.ts';
import { newId } from '../crypto.ts';
import { auditStmt, isConstraintError, many, one, run, stmt } from '../db.ts';
import { CATALOG_VERSION, cardDef, cardView } from '../game.ts';
import { badRequest, conflict, json, notFound, readJson, str, type Ctx } from '../http.ts';

interface GrantRow {
  id: string; grade_id: string; kind: string; status: string; tier_id: string | null; coins: number; vouchers: number; pack_id: string | null;
  result_json: string; created_at: number; seen_at: number | null;
}

async function grantXp(db: D1Database, userId: string, gradeId: string) {
  return many<{ key: string; category: string; xp: number; label: string; capped_by: number | null; pack_id: string | null }>(db,
    'SELECT key, category, xp, label, capped_by, pack_id FROM xp_ledger WHERE user_id = ? AND source_id = ? ORDER BY created_at, rowid', userId, gradeId);
}

async function grantView(db: D1Database, userId: string, g: GrantRow) {
  const result = JSON.parse(g.result_json) as { pickOptions?: string[]; bonuses?: unknown[]; tier?: { label: string; tone: string } | null; pick?: { options: number; minRating: number } };
  const grade = await one<{ id: string; subject_id: string; test_name: string; value: number; weight: number; date: string }>(db,
    'SELECT id, subject_id, test_name, value, weight, date FROM grades WHERE id = ? AND user_id = ?', g.grade_id, userId);
  const claimed = await one<{ id: string; card_def_id: string }>(db,
    `SELECT id, card_def_id FROM card_instances WHERE user_id = ? AND acquired_via = 'reward' AND source_ref = ?`, userId, `pick:${g.id}`);
  const xp = await grantXp(db, userId, g.grade_id);
  return {
    grantId: g.id, kind: g.kind, status: g.status, tierId: g.tier_id, tier: result.tier ?? null, coins: g.coins, vouchers: g.vouchers, packId: g.pack_id,
    bonuses: result.bonuses ?? [], createdAt: g.created_at, seenAt: g.seen_at,
    grade: grade ? { id: grade.id, subjectId: grade.subject_id, testName: grade.test_name, value: grade.value, weight: grade.weight, date: grade.date } : null,
    xp: xp.map((e) => ({ key: e.key, category: e.category, xp: e.xp, label: e.label, cappedBy: e.capped_by ?? 0, packId: e.pack_id })),
    pick: result.pick && result.pickOptions
      ? {
        minRating: result.pick.minRating,
        options: result.pickOptions.map((id) => cardDef(id)).filter((d) => !!d).map((d) => ({ cardDefId: d!.id, name: d!.cardName, rating: d!.rating, position: d!.position, rarity: d!.rarity })),
        claimedCardDefId: claimed?.card_def_id ?? null,
      }
      : null,
  };
}

/** Nog niet geopende beloningen (nieuwste laatst). */
export async function listVault(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const rows = await many<GrantRow>(ctx.env.DB,
    `SELECT id, grade_id, kind, status, tier_id, coins, vouchers, pack_id, result_json, created_at, seen_at FROM reward_grants
     WHERE user_id = ? AND seen_at IS NULL ORDER BY created_at, rowid LIMIT 50`, user.id);
  return json({ items: await Promise.all(rows.map((r) => grantView(ctx.env.DB, user.id, r))) });
}

export async function markSeen(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const g = await one<GrantRow>(ctx.env.DB,
    'SELECT id, grade_id, kind, status, tier_id, coins, vouchers, pack_id, result_json, created_at, seen_at FROM reward_grants WHERE id = ? AND user_id = ?',
    ctx.params.grantId, user.id);
  if (!g) throw notFound();
  if (g.seen_at === null) await run(ctx.env.DB, 'UPDATE reward_grants SET seen_at = ? WHERE id = ? AND user_id = ? AND seen_at IS NULL', ctx.now, g.id, user.id);
  return json({ item: await grantView(ctx.env.DB, user.id, { ...g, seen_at: g.seen_at ?? ctx.now }) });
}

/** Kies 1 speler uit de aangeboden opties van een Legendarisch-beloning (precies één keer). */
export async function claimPick(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const db = ctx.env.DB;
  const g = await one<{ id: string; result_json: string }>(db, 'SELECT id, result_json FROM reward_grants WHERE id = ? AND user_id = ?', ctx.params.grantId, user.id);
  if (!g) throw notFound();
  const options = (JSON.parse(g.result_json) as { pickOptions?: string[] }).pickOptions ?? [];
  const body = await readJson(ctx.req);
  const cardDefId = str(body, 'cardDefId', { max: 40 });
  if (!options.includes(cardDefId)) throw badRequest('Deze speler hoort niet bij de keuze.');
  const def = cardDef(cardDefId);
  if (!def) throw notFound();
  const id = newId('card');
  try {
    await db.batch([
      stmt(db, `INSERT INTO card_instances (id, user_id, card_def_id, catalog_version, acquired_via, source_ref, acquired_at) VALUES (?, ?, ?, ?, 'reward', ?, ?)`,
        id, user.id, def.id, CATALOG_VERSION, `pick:${g.id}`, ctx.now),
      auditStmt(db, user.id, 'reward.pick', g.id, { cardDefId }, ctx.now),
    ]);
  } catch (err) {
    if (isConstraintError(err)) throw conflict('already_claimed', 'Je hebt al een speler gekozen voor deze beloning.');
    throw err;
  }
  return json({ card: cardView(id, def) }, 201);
}
