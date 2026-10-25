/**
 * Cijfers (zelf ingevoerd, status 'self') met mutatiegeschiedenis, ontdubbeling via engine
 * `gradeKey` en beloning via engine `computeReward` (configuratieversie wordt opgeslagen).
 * Cijfers zijn alleen zichtbaar voor de leerling zelf; geen enkele pool-query leest deze tabellen.
 */
import { requireUser } from '../auth.ts';
import { newId } from '../crypto.ts';
import { auditStmt, isConstraintError, many, one, stmt } from '../db.ts';
import {
  computeReward, DEFAULT_REWARD_CONFIG, gradeKey, GradeValidationError, overallAverage, sortedTiers, subjectAverages,
  validateGrade, weightedAverage, type Grade, type RewardConfig, type RewardResult,
} from '../engine.ts';
import { badRequest, conflict, json, notFound, readJson, type Ctx } from '../http.ts';

export const REWARD_CONFIG: RewardConfig = DEFAULT_REWARD_CONFIG;

interface GradeRow {
  id: string; subject_id: string; test_name: string; value: number; weight: number; date: string;
  status: 'self' | 'confirmed'; source: string; external_ref: string | null; dedupe_key: string;
  created_at: number; updated_at: number;
}

const GRADE_COLUMNS = 'id, subject_id, test_name, value, weight, date, status, source, external_ref, dedupe_key, created_at, updated_at';

/** DB-status → engine-status: 'self' telt als geregistreerd (niet geverifieerd). */
function toEngine(r: Pick<GradeRow, 'id' | 'subject_id' | 'test_name' | 'value' | 'weight' | 'date' | 'status' | 'external_ref'>): Grade {
  return {
    id: r.id, subjectId: r.subject_id, testName: r.test_name, value: r.value, weight: r.weight, date: r.date,
    status: r.status === 'confirmed' ? 'verified' : 'registered', source: 'manual', externalRef: r.external_ref ?? undefined,
  };
}

const view = (r: GradeRow) => ({
  id: r.id, subjectId: r.subject_id, testName: r.test_name, value: r.value, weight: r.weight, date: r.date,
  status: r.status, source: r.source, externalRef: r.external_ref, createdAt: r.created_at, updatedAt: r.updated_at,
});

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const startOfUtcDay = (ms: number) => Math.floor(ms / 86_400_000) * 86_400_000;
function startOfUtcWeek(ms: number): number {
  const day = startOfUtcDay(ms);
  const weekday = (new Date(day).getUTCDay() + 6) % 7; // maandag = 0
  return day - weekday * 86_400_000;
}

interface GradeInput { subjectId: string; testName: string; value: number; weight: number; date: string; externalRef?: string }

function parseInput(body: Record<string, unknown>, base?: GradeInput): GradeInput {
  const pick = <T>(key: string, type: 'string' | 'number'): T | undefined => {
    const v = body[key];
    if (v === undefined || v === null) return undefined;
    if (typeof v !== type) throw badRequest(`Veld "${key}" heeft een ongeldig type.`);
    return (type === 'string' ? (v as string).trim() : v) as T;
  };
  const input: GradeInput = {
    subjectId: pick<string>('subjectId', 'string') ?? base?.subjectId ?? '',
    testName: pick<string>('testName', 'string') ?? base?.testName ?? '',
    value: pick<number>('value', 'number') ?? base?.value ?? Number.NaN,
    weight: pick<number>('weight', 'number') ?? base?.weight ?? 1,
    date: pick<string>('date', 'string') ?? base?.date ?? '',
    externalRef: pick<string>('externalRef', 'string') ?? base?.externalRef,
  };
  if (input.subjectId.length > 40 || input.testName.length > 80 || (input.externalRef?.length ?? 0) > 80) throw badRequest('Tekstveld te lang.');
  return input;
}

function validate(input: GradeInput, now: number): void {
  try {
    validateGrade(input, REWARD_CONFIG.scale, isoDay(now));
  } catch (err) {
    if (err instanceof GradeValidationError) throw badRequest(err.message);
    throw err;
  }
}

/** Eerder toegekende beloning (hoogste tier) voor deze toets of dit cijfer; 'capped' telt niet mee. */
async function effectivePrevious(db: D1Database, userId: string, key: string, gradeId: string | null): Promise<RewardResult | undefined> {
  const rows = await many<{ tier_id: string | null }>(db,
    `SELECT tier_id FROM reward_grants WHERE user_id = ? AND (dedupe_key = ? OR grade_id = ?) AND status NOT IN ('capped', 'simulated', 'duplicate')`,
    userId, key, gradeId ?? '');
  const tiers = sortedTiers(REWARD_CONFIG);
  let best = -1;
  for (const r of rows) best = Math.max(best, tiers.findIndex((t) => t.id === r.tier_id));
  if (rows.length === 0) return undefined;
  const tier = best >= 0 ? tiers[best] ?? null : null;
  return { status: 'rewarded', key, configVersion: REWARD_CONFIG.version, tier, xp: tier?.xp ?? 0, coins: tier?.coins ?? 0, vouchers: tier?.vouchers ?? 0, bonuses: [] };
}

/** Schrijfopdrachten voor een beloning: grant-regel, grootboekregels en eventueel een pack. */
function rewardStatements(db: D1Database, userId: string, gradeId: string, result: RewardResult, previous: RewardResult | undefined, now: number): { grantId: string | null; statements: D1PreparedStatement[] } {
  if (result.status === 'duplicate' || result.status === 'simulated') return { grantId: null, statements: [] };
  const grantId = newId('rw');
  const kind = result.status === 'correction' ? 'correction' : 'initial';
  const statements: D1PreparedStatement[] = [
    stmt(db, `INSERT INTO reward_grants (id, user_id, dedupe_key, grade_id, kind, status, tier_id, xp, coins, vouchers, pack_id, result_json, config_version, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      grantId, userId, result.key, gradeId, kind, result.status, result.tier?.id ?? null, result.xp, result.coins, result.vouchers,
      result.packId ?? null, JSON.stringify(result), result.configVersion, now),
  ];
  for (const [currency, amount] of [['xp', result.xp], ['coins', result.coins], ['vouchers', result.vouchers]] as const) {
    if (amount > 0) {
      statements.push(stmt(db, 'INSERT INTO wallet_ledger (id, user_id, currency, delta, reason, ref, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        newId('led'), userId, currency, amount, `grade.${result.status}`, `reward:${grantId}`, now));
    }
  }
  const packChanged = result.packId && (result.status !== 'correction' || result.packId !== previous?.tier?.packId);
  if (packChanged && (result.status === 'rewarded' || result.status === 'correction')) {
    statements.push(stmt(db, `INSERT INTO pack_grants (id, user_id, pack_id, source, source_ref, created_at) VALUES (?, ?, ?, 'reward', ?, ?)`,
      newId('pg'), userId, result.packId, grantId, now));
  }
  return { grantId, statements };
}

async function activeGrades(db: D1Database, userId: string): Promise<GradeRow[]> {
  return many<GradeRow>(db, `SELECT ${GRADE_COLUMNS} FROM grades WHERE user_id = ? AND deleted_at IS NULL ORDER BY date, created_at`, userId);
}

function rewardView(result: RewardResult, grantId: string | null) {
  return {
    grantId, status: result.status, tierId: result.tier?.id ?? null, xp: result.xp, coins: result.coins, vouchers: result.vouchers,
    packId: result.packId ?? null, configVersion: result.configVersion, reason: result.reason ?? null, bonuses: result.bonuses,
  };
}

export async function createGrade(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const db = ctx.env.DB;
  const input = parseInput(await readJson(ctx.req));
  validate(input, ctx.now);
  const key = gradeKey({ ...input, source: 'manual' });
  const dupe = await one<{ id: string }>(db, 'SELECT id FROM grades WHERE user_id = ? AND dedupe_key = ? AND deleted_at IS NULL', user.id, key);
  if (dupe) throw conflict('duplicate_grade', 'Dit cijfer staat er al. Pas het bestaande cijfer aan als het niet klopt.', { gradeId: dupe.id });

  const id = newId('grd');
  const row: GradeRow = {
    id, subject_id: input.subjectId, test_name: input.testName, value: input.value, weight: input.weight, date: input.date,
    status: 'self', source: 'manual', external_ref: input.externalRef ?? null, dedupe_key: key, created_at: ctx.now, updated_at: ctx.now,
  };
  const existing = await activeGrades(db, user.id);
  const subject = existing.filter((g) => g.subject_id === input.subjectId).map(toEngine);
  const counts = await one<{ today: number; week: number }>(db,
    `SELECT SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS today, COUNT(*) AS week
     FROM reward_grants WHERE user_id = ? AND kind = 'initial' AND status IN ('rewarded', 'support') AND created_at >= ?`,
    startOfUtcDay(ctx.now), user.id, startOfUtcWeek(ctx.now));
  const previous = await effectivePrevious(db, user.id, key, null);
  const result = computeReward(REWARD_CONFIG, {
    grade: toEngine(row),
    subjectAvgBefore: weightedAverage(subject),
    subjectAvgAfter: weightedAverage([...subject, toEngine(row)]),
    rewardedToday: Number(counts?.today ?? 0),
    rewardedThisWeek: Number(counts?.week ?? 0),
    previous,
  });
  const reward = rewardStatements(db, user.id, id, result, previous, ctx.now);
  try {
    await db.batch([
      stmt(db, `INSERT INTO grades (${GRADE_COLUMNS}, user_id, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
        row.id, row.subject_id, row.test_name, row.value, row.weight, row.date, row.status, row.source, row.external_ref, row.dedupe_key, row.created_at, row.updated_at, user.id),
      stmt(db, 'INSERT INTO grade_history (id, grade_id, user_id, action, before_json, after_json, at) VALUES (?, ?, ?, ?, NULL, ?, ?)',
        newId('gh'), id, user.id, 'create', JSON.stringify(view(row)), ctx.now),
      ...reward.statements,
    ]);
  } catch (err) {
    if (isConstraintError(err)) throw conflict('duplicate_grade', 'Dit cijfer staat er al.');
    throw err;
  }
  return json({ grade: view(row), reward: rewardView(result, reward.grantId) }, 201);
}

async function ownedGrade(db: D1Database, userId: string, id: string): Promise<GradeRow> {
  const row = await one<GradeRow>(db, `SELECT ${GRADE_COLUMNS} FROM grades WHERE id = ? AND user_id = ? AND deleted_at IS NULL`, id, userId);
  if (!row) throw notFound();
  return row;
}

export async function correctGrade(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const db = ctx.env.DB;
  const before = await ownedGrade(db, user.id, ctx.params.gradeId as string);
  const input = parseInput(await readJson(ctx.req), {
    subjectId: before.subject_id, testName: before.test_name, value: before.value, weight: before.weight, date: before.date,
    externalRef: before.external_ref ?? undefined,
  });
  validate(input, ctx.now);
  const key = gradeKey({ ...input, source: 'manual' });
  if (key !== before.dedupe_key) {
    const clash = await one<{ id: string }>(db, 'SELECT id FROM grades WHERE user_id = ? AND dedupe_key = ? AND deleted_at IS NULL', user.id, key);
    if (clash) throw conflict('duplicate_grade', 'Er staat al een cijfer voor deze toets.', { gradeId: clash.id });
  }
  const after: GradeRow = {
    ...before, subject_id: input.subjectId, test_name: input.testName, value: input.value, weight: input.weight, date: input.date,
    external_ref: input.externalRef ?? null, dedupe_key: key, updated_at: ctx.now,
  };
  // Beloning t.o.v. wat voor dit cijfer of deze toets al is toegekend: alleen het verschil, nooit terugboeken.
  const previous = await effectivePrevious(db, user.id, key, before.id) ?? await effectivePrevious(db, user.id, before.dedupe_key, before.id);
  // Zonder eerdere beloning (bijv. limiet bereikt) levert een correctie niets op.
  const result = previous
    ? computeReward(REWARD_CONFIG, { grade: toEngine(after), subjectAvgBefore: null, subjectAvgAfter: null, rewardedToday: 0, rewardedThisWeek: 0, previous })
    : null;
  const reward = result ? rewardStatements(db, user.id, before.id, result, previous, ctx.now) : { grantId: null, statements: [] };
  try {
    await db.batch([
      stmt(db, 'UPDATE grades SET subject_id = ?, test_name = ?, value = ?, weight = ?, date = ?, external_ref = ?, dedupe_key = ?, updated_at = ? WHERE id = ? AND user_id = ?',
        after.subject_id, after.test_name, after.value, after.weight, after.date, after.external_ref, after.dedupe_key, after.updated_at, before.id, user.id),
      stmt(db, 'INSERT INTO grade_history (id, grade_id, user_id, action, before_json, after_json, at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        newId('gh'), before.id, user.id, 'correct', JSON.stringify(view(before)), JSON.stringify(view(after)), ctx.now),
      ...reward.statements,
    ]);
  } catch (err) {
    if (isConstraintError(err)) throw conflict('duplicate_grade', 'Er staat al een cijfer voor deze toets.');
    throw err;
  }
  return json({ grade: view(after), reward: result ? rewardView(result, reward.grantId) : null });
}

export async function deleteGrade(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const db = ctx.env.DB;
  const before = await ownedGrade(db, user.id, ctx.params.gradeId as string);
  await db.batch([
    stmt(db, 'UPDATE grades SET deleted_at = ?, updated_at = ? WHERE id = ? AND user_id = ?', ctx.now, ctx.now, before.id, user.id),
    stmt(db, 'INSERT INTO grade_history (id, grade_id, user_id, action, before_json, after_json, at) VALUES (?, ?, ?, ?, ?, NULL, ?)',
      newId('gh'), before.id, user.id, 'delete', JSON.stringify(view(before)), ctx.now),
    auditStmt(db, user.id, 'grade.delete', before.id, null, ctx.now),
  ]);
  return json({ deleted: true, gradeId: before.id });
}

export async function listGrades(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const rows = await activeGrades(ctx.env.DB, user.id);
  const engine = rows.map(toEngine);
  return json({
    grades: rows.map(view),
    averages: { overall: overallAverage(engine), subjects: Object.fromEntries(subjectAverages(engine)) },
  });
}

export async function gradeHistory(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const rows = await many<{ id: string; action: string; before_json: string | null; after_json: string | null; at: number }>(ctx.env.DB,
    'SELECT id, action, before_json, after_json, at FROM grade_history WHERE grade_id = ? AND user_id = ? ORDER BY at, rowid', ctx.params.gradeId, user.id);
  if (rows.length === 0) throw notFound();
  return json({
    history: rows.map((r) => ({ id: r.id, action: r.action, before: r.before_json ? JSON.parse(r.before_json) : null, after: r.after_json ? JSON.parse(r.after_json) : null, at: r.at })),
  });
}

