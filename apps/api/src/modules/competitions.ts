/**
 * Competities binnen een pool: round-robin-schema via de engine, deadlines per speelronde,
 * forfaitregel bij niet spelen en ranglijsten. Ranglijst en forfaits worden bij elke aanvraag
 * afgeleid uit wedstrijden en deadlines (niets opgeslagen).
 */
import { requireUser } from '../auth.ts';
import { newId } from '../crypto.ts';
import { auditStmt, many, one, stmt } from '../db.ts';
import {
  computeStandings, DEFAULT_LEAGUE_CONFIG, resolveUnplayed, roundRobin, withDeadlines,
  type LeagueConfig, type LeagueResult, type UnplayedRule,
} from '../engine.ts';
import { badRequest, json, notFound, num, readJson, str, type Ctx } from '../http.ts';
import { requireAdmin, requireMember } from './pools.ts';

interface FinishedMatch {
  id: string; fixture_id: string | null; home_user_id: string; away_user_id: string;
  home_goals: number; away_goals: number; forfeit_by: string | null; finished_at: number;
}

export function toLeagueResult(m: FinishedMatch): LeagueResult {
  const forfeit = m.forfeit_by === m.home_user_id ? 'home' : m.forfeit_by === m.away_user_id ? 'away' : null;
  return { id: m.id, home: m.home_user_id, away: m.away_user_id, homeGoals: m.home_goals, awayGoals: m.away_goals, forfeit, playedAt: m.finished_at };
}

async function usernames(db: D1Database, ids: string[]): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  const rows = await many<{ id: string; username: string }>(db, `SELECT id, username FROM users WHERE id IN (${ids.map(() => '?').join(', ')})`, ...ids);
  return Object.fromEntries(rows.map((r) => [r.id, r.username]));
}

export async function createCompetition(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const poolId = ctx.params.poolId as string;
  const db = ctx.env.DB;
  await requireAdmin(db, poolId, user.id);
  const body = await readJson(ctx.req);
  const name = str(body, 'name', { min: 2, max: 40 });
  const double = body.double === true;
  const roundHours = num(body, 'roundHours', { min: 1, max: 24 * 60, optional: true }) ?? 24 * 7;
  const startAt = num(body, 'startAt', { min: 0, optional: true }) ?? ctx.now;
  const unplayedRule: UnplayedRule = body.unplayedRule === 'void' ? 'void' : 'double-forfeit';
  const members = await many<{ user_id: string }>(db, 'SELECT user_id FROM pool_members WHERE pool_id = ? ORDER BY joined_at, user_id', poolId);
  const participants = members.map((m) => m.user_id);
  if (participants.length < 2) throw badRequest('Een competitie heeft minimaal 2 deelnemers nodig.');
  const rounds = withDeadlines(roundRobin(participants, { double }), { startAt, roundDurationMs: roundHours * 3600_000 });
  const id = newId('comp');
  const league: LeagueConfig = DEFAULT_LEAGUE_CONFIG;
  const fixtures = rounds.flatMap((rd) => rd.fixtures.map((f) => ({ id: newId('fx'), round: rd.round, home: f.home, away: f.away, opensAt: rd.opensAt, deadline: rd.deadline })));
  await db.batch([
    stmt(db, `INSERT INTO competitions (id, pool_id, name, format, double_round, unplayed_rule, participants_json, league_config_json, created_by, created_at)
              VALUES (?, ?, ?, 'round_robin', ?, ?, ?, ?, ?, ?)`,
      id, poolId, name, double ? 1 : 0, unplayedRule, JSON.stringify(participants), JSON.stringify(league), user.id, ctx.now),
    ...fixtures.map((f) => stmt(db,
      'INSERT INTO competition_fixtures (id, competition_id, round, home_user_id, away_user_id, opens_at, deadline) VALUES (?, ?, ?, ?, ?, ?, ?)',
      f.id, id, f.round, f.home, f.away, f.opensAt, f.deadline)),
    auditStmt(db, user.id, 'competition.create', id, { poolId, participants: participants.length, double, roundHours }, ctx.now),
  ]);
  return json({ competition: { id, name, double, unplayedRule, participants, rounds: rounds.length, fixtures: fixtures.length } }, 201);
}

export async function listCompetitions(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const poolId = ctx.params.poolId as string;
  await requireMember(ctx.env.DB, poolId, user.id);
  const rows = await many<{ id: string; name: string; double_round: number; created_at: number }>(ctx.env.DB,
    'SELECT id, name, double_round, created_at FROM competitions WHERE pool_id = ? ORDER BY created_at DESC', poolId);
  return json({ competitions: rows.map((r) => ({ id: r.id, name: r.name, double: r.double_round === 1, createdAt: r.created_at })) });
}

export async function getCompetition(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const poolId = ctx.params.poolId as string;
  const db = ctx.env.DB;
  await requireMember(db, poolId, user.id);
  const comp = await one<{ id: string; name: string; double_round: number; unplayed_rule: UnplayedRule; participants_json: string; league_config_json: string }>(db,
    'SELECT id, name, double_round, unplayed_rule, participants_json, league_config_json FROM competitions WHERE id = ? AND pool_id = ?', ctx.params.competitionId, poolId);
  if (!comp) throw notFound();
  const participants = JSON.parse(comp.participants_json) as string[];
  const fixtures = await many<{ id: string; round: number; home_user_id: string; away_user_id: string; opens_at: number; deadline: number }>(db,
    'SELECT id, round, home_user_id, away_user_id, opens_at, deadline FROM competition_fixtures WHERE competition_id = ? ORDER BY round, id', comp.id);
  const matches = await many<FinishedMatch & { status: string; challenger_id: string }>(db,
    `SELECT m.id, m.fixture_id, m.home_user_id, m.away_user_id, m.home_goals, m.away_goals, m.forfeit_by, m.finished_at, m.status, m.challenger_id
     FROM matches m JOIN competition_fixtures f ON f.id = m.fixture_id
     WHERE f.competition_id = ? AND m.status IN ('pending', 'active', 'finished')`, comp.id);
  const byFixture = new Map(matches.map((m) => [m.fixture_id as string, m]));

  const results: LeagueResult[] = [];
  const fixtureViews = fixtures.map((f) => {
    const m = byFixture.get(f.id);
    if (m?.status === 'finished') {
      const r = toLeagueResult(m);
      results.push(r);
      return { ...fixtureBase(f), status: 'played', matchId: m.id, result: r };
    }
    // Forfaitregel na de deadline (engine): wie zijn deel niet deed, verliest reglementair.
    const ready = {
      home: m ? m.status === 'active' || m.challenger_id === f.home_user_id : false,
      away: m ? m.status === 'active' || m.challenger_id === f.away_user_id : false,
    };
    const outcome = resolveUnplayed({ id: f.id, home: f.home_user_id, away: f.away_user_id, deadline: f.deadline }, ctx.now, ready, comp.unplayed_rule);
    if (outcome.kind === 'forfeit') {
      results.push(outcome.result);
      return { ...fixtureBase(f), status: 'forfeit', matchId: m?.id ?? null, result: outcome.result };
    }
    return { ...fixtureBase(f), status: outcome.kind === 'open' ? (m ? m.status : 'open') : outcome.kind, matchId: m?.id ?? null, result: null };
  });
  const names = await usernames(db, participants);
  const standings = computeStandings(participants, results, { config: JSON.parse(comp.league_config_json) as LeagueConfig, names });
  return json({
    competition: { id: comp.id, name: comp.name, double: comp.double_round === 1, unplayedRule: comp.unplayed_rule },
    fixtures: fixtureViews,
    standings: standings.map((s) => ({ ...s, username: names[s.participant] ?? null })),
  });
}

function fixtureBase(f: { id: string; round: number; home_user_id: string; away_user_id: string; opens_at: number; deadline: number }) {
  return { id: f.id, round: f.round, homeUserId: f.home_user_id, awayUserId: f.away_user_id, opensAt: f.opens_at, deadline: f.deadline };
}

/** Ultimate League van de pool: alle afgeronde battles (competitie én vriendschappelijk). */
export async function poolStandings(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const poolId = ctx.params.poolId as string;
  const db = ctx.env.DB;
  await requireMember(db, poolId, user.id);
  const members = await many<{ user_id: string }>(db, 'SELECT user_id FROM pool_members WHERE pool_id = ?', poolId);
  const finished = await many<FinishedMatch>(db,
    `SELECT id, fixture_id, home_user_id, away_user_id, home_goals, away_goals, forfeit_by, finished_at FROM matches WHERE pool_id = ? AND status = 'finished'`, poolId);
  const participants = [...new Set([...members.map((m) => m.user_id), ...finished.flatMap((m) => [m.home_user_id, m.away_user_id])])];
  const names = await usernames(db, participants);
  const standings = computeStandings(participants, finished.map(toLeagueResult), { names });
  return json({ standings: standings.map((s) => ({ ...s, username: names[s.participant] ?? null })) });
}
