/**
 * Persoonlijke doelen en geplande toetsen (alleen voor de leerling zelf). Doelen tellen mee voor
 * Vooruitgangs-XP en het doelpack bij het invoeren van een cijfer (zie grades.ts).
 */
import { requireUser } from '../auth.ts';
import { newId } from '../crypto.ts';
import { many, run, stmt } from '../db.ts';
import type { Goal, UpcomingTest } from '../engine.ts';
import { badRequest, json, notFound, num, readJson, str, type Ctx } from '../http.ts';

interface GoalRow { id: string; scope: 'subject' | 'overall'; subject_id: string | null; target: number; created_at: number }
interface TestRow { id: string; subject_id: string; name: string; date: string; weight: number }

export const toGoal = (r: GoalRow): Goal => ({
  id: r.id, scope: r.scope, ...(r.subject_id ? { subjectId: r.subject_id } : {}), target: r.target, createdAt: new Date(r.created_at).toISOString(),
});
const toTest = (r: TestRow): UpcomingTest => ({ id: r.id, subjectId: r.subject_id, name: r.name, date: r.date, weight: r.weight });

export async function activeGoals(db: D1Database, userId: string): Promise<Goal[]> {
  const rows = await many<GoalRow>(db, 'SELECT id, scope, subject_id, target, created_at FROM goals WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at', userId);
  return rows.map(toGoal);
}

async function upcoming(db: D1Database, userId: string): Promise<UpcomingTest[]> {
  const rows = await many<TestRow>(db, 'SELECT id, subject_id, name, date, weight FROM upcoming_tests WHERE user_id = ? AND deleted_at IS NULL ORDER BY date, created_at', userId);
  return rows.map(toTest);
}

export async function getPlanning(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  return json({ goals: await activeGoals(ctx.env.DB, user.id), upcoming: await upcoming(ctx.env.DB, user.id) });
}

/** Nieuw doel; een bestaand doel voor hetzelfde vak (of algemeen) wordt vervangen. */
export async function createGoal(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const body = await readJson(ctx.req);
  const scope = body.scope === 'overall' ? 'overall' : 'subject';
  const subjectId = scope === 'subject' ? str(body, 'subjectId', { max: 40 }) : null;
  const target = Math.round((num(body, 'target', { min: 1, max: 10 }) as number) * 10) / 10;
  const id = newId('goal');
  const db = ctx.env.DB;
  await db.batch([
    stmt(db, `UPDATE goals SET deleted_at = ? WHERE user_id = ? AND deleted_at IS NULL AND scope = ? AND COALESCE(subject_id, '') = ?`,
      ctx.now, user.id, scope, subjectId ?? ''),
    stmt(db, 'INSERT INTO goals (id, user_id, scope, subject_id, target, created_at) VALUES (?, ?, ?, ?, ?, ?)', id, user.id, scope, subjectId, target, ctx.now),
  ]);
  return json({ goal: toGoal({ id, scope, subject_id: subjectId, target, created_at: ctx.now }) }, 201);
}

export async function deleteGoal(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const changed = await run(ctx.env.DB, 'UPDATE goals SET deleted_at = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL', ctx.now, ctx.params.goalId, user.id);
  if (changed === 0) throw notFound();
  return json({ deleted: true });
}

export async function createUpcoming(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const body = await readJson(ctx.req);
  const subjectId = str(body, 'subjectId', { max: 40 });
  const name = str(body, 'name', { max: 80 });
  const date = str(body, 'date', { max: 10 });
  const weight = num(body, 'weight', { min: 0.1, max: 10 }) as number;
  const today = new Date(ctx.now).toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < today) throw badRequest('Kies een datum vanaf vandaag.');
  const id = newId('tst');
  await run(ctx.env.DB, 'INSERT INTO upcoming_tests (id, user_id, subject_id, name, date, weight, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    id, user.id, subjectId, name, date, weight, ctx.now);
  return json({ test: toTest({ id, subject_id: subjectId, name, date, weight }) }, 201);
}

export async function deleteUpcoming(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const changed = await run(ctx.env.DB, 'UPDATE upcoming_tests SET deleted_at = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL', ctx.now, ctx.params.testId, user.id);
  if (changed === 0) throw notFound();
  return json({ deleted: true });
}
