/**
 * Ultimate Draft op de server: voucher afschrijven, aanbiedingen trekken (seed + garantieteller) en
 * keuzes vastleggen in één bewaarde sessie. Draftkaarten zijn tijdelijk en komen nooit in de collectie.
 */
import { requireUser } from '../auth.ts';
import { newId, randomSeed } from '../crypto.ts';
import { auditStmt, isConstraintError, one, run, stmt } from '../db.ts';
import {
  chemistry, createDraft, createRng, DRAFT_EVENTS, draftFormation, draftLineup, nextOpenSlot, pickDraft, pityRemaining, teamRating,
  type DraftSession, type PityState,
} from '../engine.ts';
import { getCatalog } from '../game.ts';
import { ApiError, badRequest, conflict, json, notFound, readJson, str, type Ctx } from '../http.ts';

interface DraftRow { id: string; event_id: string; session_json: string; status: 'active' | 'finished'; created_at: number; finished_at: number | null }

function summary(session: DraftSession) {
  const formation = draftFormation(session);
  const lineup = draftLineup(session);
  return { rating: teamRating(formation, lineup), chemistry: chemistry(formation, lineup).total, complete: !nextOpenSlot(session) };
}

const view = (r: DraftRow) => {
  const session = JSON.parse(r.session_json) as DraftSession;
  return { id: r.id, eventId: r.event_id, status: r.status, session, ...summary(session), createdAt: r.created_at, finishedAt: r.finished_at };
};

async function pity(db: D1Database, userId: string, eventId: string): Promise<PityState> {
  const row = await one<{ pity_json: string }>(db, 'SELECT pity_json FROM draft_pity WHERE user_id = ? AND event_id = ?', userId, eventId);
  return row ? (JSON.parse(row.pity_json) as PityState) : {};
}

export async function draftStatus(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const event = DRAFT_EVENTS.toetsweek1!;
  const active = await one<DraftRow>(ctx.env.DB, `SELECT id, event_id, session_json, status, created_at, finished_at FROM draft_sessions WHERE user_id = ? AND status = 'active'`, user.id);
  const current = await pity(ctx.env.DB, user.id, event.id);
  return json({ eventId: event.id, voucherCost: event.voucherCost, pity: current, pityRemaining: pityRemaining(event, current), active: active ? view(active) : null });
}

export async function startDraft(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const db = ctx.env.DB;
  const event = DRAFT_EVENTS.toetsweek1!;
  if (await one(db, `SELECT 1 AS x FROM draft_sessions WHERE user_id = ? AND status = 'active'`, user.id)) throw conflict('draft_active', 'Maak eerst je huidige draft af.');
  const seed = randomSeed();
  const before = await pity(db, user.id, event.id);
  const { session, pity: next } = createDraft(event, getCatalog(), createRng(seed), before);
  const id = newId('draft');
  try {
    await db.batch([
      stmt(db, `INSERT INTO wallet_ledger (id, user_id, currency, delta, reason, ref, created_at) VALUES (?, ?, 'vouchers', ?, 'draft.start', ?, ?)`,
        newId('led'), user.id, -event.voucherCost, `draft:${id}`, ctx.now),
      stmt(db, `INSERT INTO draft_sessions (id, user_id, event_id, seed, session_json, status, created_at) VALUES (?, ?, ?, ?, ?, 'active', ?)`,
        id, user.id, event.id, seed, JSON.stringify(session), ctx.now),
      stmt(db, `INSERT INTO draft_pity (user_id, event_id, pity_json) VALUES (?, ?, ?)
                ON CONFLICT(user_id, event_id) DO UPDATE SET pity_json = excluded.pity_json`, user.id, event.id, JSON.stringify(next)),
      auditStmt(db, user.id, 'draft.start', id, { seed, eventId: event.id, guaranteed: session.guaranteed }, ctx.now),
    ]);
  } catch (err) {
    if (isConstraintError(err, 'insufficient_funds')) throw conflict('insufficient_funds', 'Je hebt geen draft-voucher.');
    if (isConstraintError(err)) throw conflict('draft_active', 'Maak eerst je huidige draft af.');
    throw err;
  }
  const row = await one<DraftRow>(db, 'SELECT id, event_id, session_json, status, created_at, finished_at FROM draft_sessions WHERE id = ?', id);
  return json({ draft: view(row as DraftRow) }, 201);
}

export async function pickInDraft(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const db = ctx.env.DB;
  const row = await one<DraftRow>(db, 'SELECT id, event_id, session_json, status, created_at, finished_at FROM draft_sessions WHERE id = ? AND user_id = ?', ctx.params.draftId, user.id);
  if (!row) throw notFound();
  if (row.status !== 'active') throw conflict('draft_finished', 'Deze draft is al afgerond.');
  const body = await readJson(ctx.req);
  const slotId = str(body, 'slotId', { max: 20 });
  const playerId = str(body, 'playerId', { max: 60 });
  let session: DraftSession;
  try {
    session = pickDraft(JSON.parse(row.session_json) as DraftSession, slotId, playerId);
  } catch (err) {
    throw badRequest(err instanceof Error ? err.message : 'Ongeldige keuze.');
  }
  const done = !nextOpenSlot(session);
  // Optimistische vergrendeling: alleen bijwerken als de sessie niet intussen veranderde.
  const changed = await run(db, `UPDATE draft_sessions SET session_json = ?, status = ?, finished_at = ? WHERE id = ? AND session_json = ? AND status = 'active'`,
    JSON.stringify(session), done ? 'finished' : 'active', done ? ctx.now : null, row.id, row.session_json);
  if (changed === 0) throw new ApiError(409, 'stale', 'De draft is intussen gewijzigd; laad opnieuw.');
  return json({ draft: view({ ...row, session_json: JSON.stringify(session), status: done ? 'finished' : 'active', finished_at: done ? ctx.now : null }) });
}
