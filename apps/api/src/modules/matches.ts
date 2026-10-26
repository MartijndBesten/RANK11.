/**
 * Wedstrijden binnen een pool: uitdagen, accepteren/weigeren, zetten (REST of WebSocket) en
 * opgeven. De spelregels zitten in de engine; de wedstrijdstaat leeft in MatchDO (één per wedstrijd).
 */
import { requireUser } from '../auth.ts';
import { newId, randomSeed } from '../crypto.ts';
import { auditStmt, isConstraintError, many, one, run, stmt } from '../db.ts';
import { BATTLE_CONFIG_VERSION, createBattle, LIVE_MOVE_TIMEOUT_MS, type BattleTeam } from '../engine.ts';
import type { Env } from '../env.ts';
import { cardDef, toBattleCard } from '../game.ts';
import { ApiError, badRequest, conflict, forbidden, json, notFound, num, readJson, str, type Ctx } from '../http.ts';
import { asyncDeadlineHours } from './config.ts';
import type { MatchMeta } from '../match/room.ts';
import { LINEUP_SIZE } from './collection.ts';
import { requireMember } from './pools.ts';

interface MatchRow {
  id: string; pool_id: string; fixture_id: string | null; home_user_id: string; away_user_id: string; challenger_id: string;
  status: 'pending' | 'active' | 'finished' | 'declined'; timing: 'live' | 'async'; config_version: string; deadline_hours: number;
  home_goals: number | null; away_goals: number | null; winner_user_id: string | null; forfeit_by: string | null;
  decided_early: number | null; created_at: number; accepted_at: number | null; finished_at: number | null;
}

const MATCH_COLUMNS = `id, pool_id, fixture_id, home_user_id, away_user_id, challenger_id, status, timing, config_version, deadline_hours,
  home_goals, away_goals, winner_user_id, forfeit_by, decided_early, created_at, accepted_at, finished_at`;

/** Een open uitdaging verloopt na de deadline (afgeleid, niet opgeslagen). */
const isExpired = (r: Pick<MatchRow, 'status' | 'created_at' | 'deadline_hours'>, now: number) => r.status === 'pending' && now >= r.created_at + r.deadline_hours * 3600_000;

export function matchView(r: MatchRow, now = Date.now()) {
  return {
    id: r.id, poolId: r.pool_id, fixtureId: r.fixture_id, homeUserId: r.home_user_id, awayUserId: r.away_user_id,
    challengerId: r.challenger_id, status: isExpired(r, now) ? 'expired' : r.status, timing: r.timing, configVersion: r.config_version,
    deadlineHours: r.deadline_hours, acceptBefore: r.status === 'pending' ? r.created_at + r.deadline_hours * 3600_000 : null,
    result: r.status === 'finished'
      ? { homeGoals: r.home_goals, awayGoals: r.away_goals, winnerUserId: r.winner_user_id, forfeitBy: r.forfeit_by, decidedEarly: r.decided_early === 1 }
      : null,
    createdAt: r.created_at, acceptedAt: r.accepted_at, finishedAt: r.finished_at,
  };
}

function matchStub(env: Env, matchId: string): DurableObjectStub {
  return env.MATCH.get(env.MATCH.idFromName(matchId));
}

/** Roept de MatchDO aan en zet een foutantwoord om in een ApiError. */
async function callDO(env: Env, matchId: string, path: string, init: { method?: string; userId?: string; body?: unknown } = {}): Promise<unknown> {
  const headers: Record<string, string> = {};
  if (init.userId) headers['X-User-Id'] = init.userId;
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await matchStub(env, matchId).fetch(`https://match.internal${path}`, {
    method: init.method ?? 'GET', headers, body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const data = await res.json() as { error?: { code: string; message: string } };
  if (!res.ok) {
    const e = data.error ?? { code: 'internal', message: 'Er ging iets mis.' };
    throw new ApiError(res.status >= 500 ? 500 : res.status, e.code, res.status >= 500 ? 'Er ging iets mis.' : e.message);
  }
  return data;
}

interface LineupCard { instanceId: string; cardDefId: string }

/** Het vastgezette elftal: de 11 opgestelde kaarten op dit moment (GDD §4.7). */
async function lineupSnapshot(db: D1Database, userId: string, who: string): Promise<LineupCard[]> {
  const row = await one<{ card_ids_json: string }>(db, 'SELECT card_ids_json FROM lineups WHERE user_id = ?', userId);
  const ids = row ? (JSON.parse(row.card_ids_json) as string[]) : [];
  if (ids.length !== LINEUP_SIZE) throw conflict('no_lineup', `${who} heeft nog geen volledig elftal opgesteld.`);
  const placeholders = ids.map(() => '?').join(', ');
  const owned = await many<{ id: string; card_def_id: string }>(db, `SELECT id, card_def_id FROM card_instances WHERE user_id = ? AND id IN (${placeholders})`, userId, ...ids);
  if (owned.length !== LINEUP_SIZE) throw conflict('no_lineup', `${who} heeft kaarten opgesteld die niet (meer) in de collectie zitten.`);
  const byId = new Map(owned.map((o) => [o.id, o.card_def_id]));
  return ids.map((id) => ({ instanceId: id, cardDefId: byId.get(id) as string }));
}

function toTeam(userId: string, cards: LineupCard[]): BattleTeam {
  return {
    playerId: userId,
    cards: cards.map((c) => {
      const def = cardDef(c.cardDefId);
      if (!def) throw new ApiError(500, 'internal', 'Er ging iets mis.');
      return toBattleCard(c.instanceId, def);
    }),
  };
}

async function loadMatch(ctx: Ctx, userId: string): Promise<MatchRow> {
  const row = await one<MatchRow>(ctx.env.DB, `SELECT ${MATCH_COLUMNS} FROM matches WHERE id = ?`, ctx.params.matchId);
  if (!row) throw notFound();
  await requireMember(ctx.env.DB, row.pool_id, userId); // niet-lid: 404
  return row;
}

export async function challenge(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const poolId = ctx.params.poolId as string;
  const db = ctx.env.DB;
  await requireMember(db, poolId, user.id);
  const body = await readJson(ctx.req);
  const opponentId = str(body, 'opponentId', { max: 60 });
  if (opponentId === user.id) throw badRequest('Je kunt jezelf niet uitdagen.');
  const opponent = await one(db, 'SELECT 1 AS x FROM pool_members WHERE pool_id = ? AND user_id = ?', poolId, opponentId);
  if (!opponent) throw notFound();
  const timing = body.timing === 'live' ? 'live' : 'async';
  // Asynchroon is de standaard; deadline per zet en voor accepteren is instelbaar (1-168 uur, standaard uit de omgeving: 48).
  const deadlineHours = num(body, 'deadlineHours', { min: 1, max: 168, integer: true, optional: true }) ?? asyncDeadlineHours(ctx.env);

  let home = user.id;
  let away = opponentId;
  let fixtureId: string | null = null;
  if (body.fixtureId !== undefined) {
    fixtureId = str(body, 'fixtureId', { max: 60 });
    const fx = await one<{ home_user_id: string; away_user_id: string; deadline: number }>(db,
      `SELECT f.home_user_id, f.away_user_id, f.deadline FROM competition_fixtures f JOIN competitions c ON c.id = f.competition_id
       WHERE f.id = ? AND c.pool_id = ?`, fixtureId, poolId);
    if (!fx) throw notFound();
    const pair = new Set([fx.home_user_id, fx.away_user_id]);
    if (!pair.has(user.id) || !pair.has(opponentId)) throw badRequest('Deze wedstrijd hoort niet bij jullie tweeën.');
    if (ctx.now >= fx.deadline) throw conflict('deadline_passed', 'De deadline van deze speelronde is verstreken.');
    home = fx.home_user_id;
    away = fx.away_user_id;
  }
  // Het eigen elftal wordt nu vastgezet; dat van de tegenstander bij het accepteren.
  const mine = await lineupSnapshot(db, user.id, 'Je');
  const id = newId('match');
  try {
    await db.batch([
      stmt(db, `INSERT INTO matches (id, pool_id, fixture_id, home_user_id, away_user_id, challenger_id, status, timing, config_version, deadline_hours,
                ${home === user.id ? 'home_lineup_json' : 'away_lineup_json'}, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
        id, poolId, fixtureId, home, away, user.id, timing, BATTLE_CONFIG_VERSION, deadlineHours, JSON.stringify(mine), ctx.now),
      auditStmt(db, user.id, 'match.challenge', id, { poolId, opponentId, fixtureId, timing, deadlineHours }, ctx.now),
    ]);
  } catch (err) {
    if (isConstraintError(err)) throw conflict('fixture_taken', 'Voor deze wedstrijd loopt al een uitdaging.');
    throw err;
  }
  const row = await one<MatchRow>(db, `SELECT ${MATCH_COLUMNS} FROM matches WHERE id = ?`, id);
  return json({ match: matchView(row as MatchRow, ctx.now) }, 201);
}

export async function accept(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const db = ctx.env.DB;
  const match = await loadMatch(ctx, user.id);
  const opponentId = match.challenger_id === match.home_user_id ? match.away_user_id : match.home_user_id;
  if (user.id !== opponentId) throw forbidden('Alleen de uitgedaagde speler kan accepteren.');
  if (match.status !== 'pending') throw conflict('not_pending', 'Deze uitdaging is niet meer open.');
  if (isExpired(match, ctx.now)) throw conflict('expired', 'Deze uitdaging is verlopen.');
  const challengerSide = match.challenger_id === match.home_user_id ? 'home' : 'away';
  const challengerRow = await one<{ home_lineup_json: string | null; away_lineup_json: string | null }>(db,
    'SELECT home_lineup_json, away_lineup_json FROM matches WHERE id = ?', match.id);
  const challengerCards = JSON.parse((challengerSide === 'home' ? challengerRow?.home_lineup_json : challengerRow?.away_lineup_json) ?? '[]') as LineupCard[];
  const mine = await lineupSnapshot(db, user.id, 'Je');
  const homeCards = challengerSide === 'home' ? challengerCards : mine;
  const awayCards = challengerSide === 'home' ? mine : challengerCards;

  const seed = randomSeed();
  const created = createBattle({
    matchId: match.id, seed, at: ctx.now,
    home: toTeam(match.home_user_id, homeCards),
    away: toTeam(match.away_user_id, awayCards),
    config: { moveTimeoutMs: match.timing === 'live' ? LIVE_MOVE_TIMEOUT_MS : match.deadline_hours * 3600_000 },
  });
  // Eerst claimen (pending → active), dan de DO starten; bij een fout terugdraaien.
  const claimed = await run(db,
    `UPDATE matches SET status = 'active', accepted_at = ?, config_version = ?, home_lineup_json = ?, away_lineup_json = ? WHERE id = ? AND status = 'pending'`,
    ctx.now, created.config.configVersion, JSON.stringify(homeCards), JSON.stringify(awayCards), match.id);
  if (claimed === 0) throw conflict('not_pending', 'Deze uitdaging is niet meer open.');
  const meta: MatchMeta = { matchId: match.id, poolId: match.pool_id, homeUserId: match.home_user_id, awayUserId: match.away_user_id };
  let view: unknown;
  try {
    view = await callDO(ctx.env, match.id, '/init', { method: 'POST', body: { meta, created } });
  } catch (err) {
    await run(db, `UPDATE matches SET status = 'pending', accepted_at = NULL WHERE id = ? AND status = 'active'`, match.id);
    throw err;
  }
  await auditStmt(db, user.id, 'match.accept', match.id, { seed, configVersion: created.config.configVersion }, ctx.now).run();
  const row = await one<MatchRow>(db, `SELECT ${MATCH_COLUMNS} FROM matches WHERE id = ?`, match.id);
  return json({ match: matchView(row as MatchRow, ctx.now), battle: view });
}

export async function decline(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const match = await loadMatch(ctx, user.id);
  if (user.id !== match.home_user_id && user.id !== match.away_user_id) throw forbidden('Je speelt niet mee in deze wedstrijd.');
  const changed = await run(ctx.env.DB, `UPDATE matches SET status = 'declined' WHERE id = ? AND status = 'pending'`, match.id);
  if (changed === 0) throw conflict('not_pending', 'Deze uitdaging is niet meer open.');
  return json({ match: { ...matchView(match, ctx.now), status: 'declined' } });
}

export async function getMatch(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const match = await loadMatch(ctx, user.id);
  const battle = match.status === 'active' || match.status === 'finished' ? await callDO(ctx.env, match.id, '/state') : null;
  // De DO kan de wedstrijd net hebben afgerond (time-out); lees de metadata opnieuw.
  const fresh = battle ? await one<MatchRow>(ctx.env.DB, `SELECT ${MATCH_COLUMNS} FROM matches WHERE id = ?`, match.id) : match;
  return json({ match: matchView(fresh ?? match, ctx.now), battle });
}

export async function getMatchEvents(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const match = await loadMatch(ctx, user.id);
  if (match.status !== 'active' && match.status !== 'finished') throw conflict('not_started', 'Deze wedstrijd is nog niet begonnen.');
  return json(await callDO(ctx.env, match.id, '/events'));
}

async function participant(ctx: Ctx): Promise<{ userId: string; match: MatchRow }> {
  const user = requireUser(ctx);
  const match = await loadMatch(ctx, user.id);
  if (user.id !== match.home_user_id && user.id !== match.away_user_id) throw forbidden('Je speelt niet mee in deze wedstrijd.');
  if (match.status === 'pending' || match.status === 'declined') throw conflict('not_started', 'Deze wedstrijd is nog niet begonnen.');
  return { userId: user.id, match };
}

export async function move(ctx: Ctx): Promise<Response> {
  const { userId, match } = await participant(ctx);
  const body = await readJson(ctx.req);
  const cardId = str(body, 'cardId', { max: 60 });
  return json(await callDO(ctx.env, match.id, '/move', { method: 'POST', userId, body: { cardId } }));
}

export async function resignMatch(ctx: Ctx): Promise<Response> {
  const { userId, match } = await participant(ctx);
  return json(await callDO(ctx.env, match.id, '/resign', { method: 'POST', userId, body: {} }));
}

/** WebSocket naar de MatchDO (live spelen). Authenticatie via cookie of Bearer gebeurt in de Worker. */
export async function matchSocket(ctx: Ctx): Promise<Response> {
  const { userId, match } = await participant(ctx);
  if (ctx.req.headers.get('Upgrade')?.toLowerCase() !== 'websocket') throw new ApiError(426, 'upgrade_required', 'Verwacht een WebSocket-verbinding.');
  const headers = new Headers(ctx.req.headers);
  headers.set('X-User-Id', userId);
  return matchStub(ctx.env, match.id).fetch(new Request('https://match.internal/ws', { method: 'GET', headers }));
}

export async function listPoolMatches(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const poolId = ctx.params.poolId as string;
  await requireMember(ctx.env.DB, poolId, user.id);
  const rows = await many<MatchRow>(ctx.env.DB, `SELECT ${MATCH_COLUMNS} FROM matches WHERE pool_id = ? ORDER BY created_at DESC LIMIT 200`, poolId);
  return json({ matches: rows.map((r) => matchView(r, ctx.now)) });
}
