/**
 * RANK Academy: interne oefenmodule op de server. De server maakt de vragenset (met herhaling van eerdere
 * fouten), bewaart de antwoorden zelf en kijkt na; de app krijgt nooit de antwoorden vooraf.
 * XP via academyReward (geen minimumtijd per vraag; wel eenmalige afrond-XP per dag, geen XP voor een
 * identieke vragenset, verbeterde fouten alleen bij een latere sessie, plafonds) en mijlpalen via progressRewards.
 * Oefenscores worden nooit als schoolcijfer bewaard.
 */
import { requireUser } from '../auth.ts';
import { newId, randomSeed } from '../crypto.ts';
import { auditStmt, many, one, run, stmt } from '../db.ts';
import {
  academyReward, createPracticeSession, gradePracticeSession, practiceEvent, PRACTICE_SUBJECTS, publicSession, topicProgress, weekStart,
  type ItemState, type LearningEvent, type PracticeSession, type PracticeSubjectId,
} from '../engine.ts';
import { badRequest, conflict, json, notFound, readJson, str, type Ctx } from '../http.ts';
import { progressStatements, progressView } from '../progress.ts';
import { requireFlag } from './config.ts';
import { activeGrades, loadXpLedger, MOTIVATION_CONFIG, toEngine, xpStatements } from './grades.ts';
import { activeGoals } from './planning.ts';

export const INTERNAL_PROVIDER = 'rank-intern';
/** Events die als echte eerdere poging tellen (te snel/afgebroken/niet gekoppeld niet). */
const COUNTED = ['rewarded', 'capped', 'no-learning-value'];

async function itemStates(db: D1Database, userId: string): Promise<ItemState[]> {
  const rows = await many<{ state_json: string }>(db, 'SELECT state_json FROM practice_items WHERE user_id = ?', userId);
  return rows.map((r) => JSON.parse(r.state_json) as ItemState);
}

async function history(db: D1Database, userId: string): Promise<{ event: LearningEvent; decision: string; xp: number; at: number }[]> {
  const rows = await many<{ event_json: string; decision: string; xp: number; created_at: number }>(db,
    'SELECT event_json, decision, xp, created_at FROM academy_events WHERE user_id = ? ORDER BY created_at, rowid', userId);
  return rows.map((r) => ({ event: JSON.parse(r.event_json) as LearningEvent, decision: r.decision, xp: r.xp, at: r.created_at }));
}

const iso = (ms: number) => new Date(ms).toISOString();

export async function academyOverview(ctx: Ctx): Promise<Response> {
  requireFlag(ctx.env, 'academy');
  const user = requireUser(ctx);
  const db = ctx.env.DB;
  const ledger = (await loadXpLedger(db, user.id)).filter((e) => e.category === 'academy');
  const today = iso(ctx.now).slice(0, 10);
  const sum = (pred: (d: string) => boolean) => ledger.filter((e) => e.xp > 0 && pred(e.date)).reduce((s, e) => s + e.xp, 0);
  const events = await history(db, user.id);
  return json({
    subjects: PRACTICE_SUBJECTS.map((s) => ({ id: s.id, name: s.name, topics: s.topics.map((t) => ({ id: t.id, label: t.label, description: t.description })) })),
    progress: topicProgress(await itemStates(db, user.id), PRACTICE_SUBJECTS, iso(ctx.now)),
    xp: {
      total: ledger.reduce((s, e) => s + e.xp, 0),
      today: sum((d) => d === today),
      week: sum((d) => weekStart(d) === weekStart(today)),
      dailyCap: MOTIVATION_CONFIG.academy.dailyCap,
      weeklyCap: MOTIVATION_CONFIG.academy.weeklyCap,
    },
    recent: events.slice(-20).reverse().map((h) => ({
      eventId: h.event.eventId, subjectId: h.event.subjectId, topic: h.event.topic, questionCount: h.event.questionCount,
      correctCount: h.event.correctCount, mistakesFixed: h.event.mistakesFixed, decision: h.decision, xp: h.xp, at: h.at,
    })),
  });
}

/** Nieuwe oefensessie; een nog openstaande sessie vervalt (afgebroken, zonder beloning). */
export async function createSession(ctx: Ctx): Promise<Response> {
  requireFlag(ctx.env, 'academy');
  const user = requireUser(ctx);
  const db = ctx.env.DB;
  const body = await readJson(ctx.req);
  const subjectId = str(body, 'subjectId', { max: 10 }) as PracticeSubjectId;
  const subject = PRACTICE_SUBJECTS.find((s) => s.id === subjectId);
  if (!subject) throw badRequest('Onbekend vak.');
  const topic = body.topic === undefined || body.topic === null ? null : str(body, 'topic', { max: 40 });
  if (topic && !subject.topics.some((t) => t.id === topic)) throw badRequest('Onbekend onderwerp.');
  const id = newId('ps');
  const session = createPracticeSession({ subjectId, topic, seed: randomSeed(), itemStates: await itemStates(db, user.id), now: iso(ctx.now), sessionId: id });
  await db.batch([
    stmt(db, `UPDATE practice_sessions SET status = 'abandoned' WHERE user_id = ? AND status = 'open'`, user.id),
    stmt(db, `INSERT INTO practice_sessions (id, user_id, subject_id, topic, session_json, status, created_at) VALUES (?, ?, ?, ?, ?, 'open', ?)`,
      id, user.id, subjectId, topic, JSON.stringify(session), ctx.now),
  ]);
  return json({ session: publicSession(session) }, 201);
}

export async function submitSession(ctx: Ctx): Promise<Response> {
  requireFlag(ctx.env, 'academy');
  const user = requireUser(ctx);
  const db = ctx.env.DB;
  const row = await one<{ id: string; session_json: string; status: string; created_at: number }>(db,
    'SELECT id, session_json, status, created_at FROM practice_sessions WHERE id = ? AND user_id = ?', ctx.params.sessionId, user.id);
  if (!row) throw notFound();
  if (row.status !== 'open') throw conflict('session_closed', 'Deze oefening is al ingeleverd of vervallen.');
  const body = await readJson(ctx.req);
  const raw = body.answers;
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) throw badRequest('Antwoorden ontbreken.');
  const answers: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) if (typeof v === 'string') answers[k.slice(0, 80)] = v.slice(0, 40);
  const abandoned = body.abandoned === true;
  const session = JSON.parse(row.session_json) as PracticeSession;
  const nowIso = iso(ctx.now);
  const graded = gradePracticeSession(session, answers, nowIso);
  const event = practiceEvent(session, graded, {
    eventId: newId('ev'), providerId: INTERNAL_PROVIDER, externalUserId: user.id, startedAt: iso(row.created_at), completedAt: nowIso,
    status: abandoned ? 'abandoned' : 'completed',
  });
  const past = await history(db, user.id);
  const ledger = await loadXpLedger(db, user.id);
  const decision = academyReward(MOTIVATION_CONFIG, event, {
    enabled: true, playerId: user.id, history: past.filter((h) => COUNTED.includes(h.decision)).map((h) => h.event), ledger,
  });
  const xpTotal = decision.entries.reduce((s, e) => s + e.xp, 0);
  const progress = await progressStatements(db, user.id, {
    grades: (await activeGrades(db, user.id)).map(toEngine), goals: await activeGoals(db, user.id), ledger: [...ledger, ...decision.entries], today: nowIso.slice(0, 10),
  }, { kind: 'practice', id: row.id }, ctx.now);
  // Alleen bijwerken wat echt geoefend is: bij afbreken tellen beantwoorde vragen wel mee voor de herhaling.
  const states = abandoned ? graded.states.filter((s) => answers[s.id] !== undefined) : graded.states;
  const claimed = await run(db, `UPDATE practice_sessions SET status = ?, submitted_at = ? WHERE id = ? AND status = 'open'`, abandoned ? 'abandoned' : 'submitted', ctx.now, row.id);
  if (claimed === 0) throw conflict('session_closed', 'Deze oefening is al ingeleverd of vervallen.');
  await db.batch([
    ...states.map((s) => stmt(db, `INSERT INTO practice_items (user_id, item_id, state_json, updated_at) VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, item_id) DO UPDATE SET state_json = excluded.state_json, updated_at = excluded.updated_at`, user.id, s.id, JSON.stringify(s), ctx.now)),
    stmt(db, 'INSERT INTO academy_events (id, user_id, provider_id, event_id, event_json, decision, xp, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      newId('ae'), user.id, INTERNAL_PROVIDER, event.eventId, JSON.stringify(event), decision.status, xpTotal, ctx.now),
    ...xpStatements(db, user.id, decision.entries, ctx.now),
    ...progress.statements,
    auditStmt(db, user.id, 'academy.submit', row.id, { eventId: event.eventId, decision: decision.status, xp: xpTotal }, ctx.now),
  ]);
  return json({
    results: graded.results.map((r) => ({ id: r.id, correct: r.correct, given: r.given, answer: r.answer, reason: r.reason, fixed: r.fixed, masteredNow: r.masteredNow })),
    summary: { questionCount: graded.questionCount, correctCount: graded.correctCount, mistakesFixed: graded.mistakesFixed, newlyMastered: graded.newlyMastered },
    decision: { status: decision.status, reason: decision.reason, xp: xpTotal, entries: decision.entries.map((e) => ({ key: e.key, xp: e.xp, label: e.label, cappedBy: e.cappedBy ?? 0 })) },
    progress: progress.grants.map(progressView),
    topicProgress: topicProgress(await itemStates(db, user.id), PRACTICE_SUBJECTS, nowIso).filter((t) => t.subjectId === session.subjectId),
  });
}
