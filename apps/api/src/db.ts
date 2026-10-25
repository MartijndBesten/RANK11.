/** Kleine D1-helpers en de auditlog. */
import { newId } from './crypto.ts';

export async function one<T>(db: D1Database, sql: string, ...params: unknown[]): Promise<T | null> {
  return (await db.prepare(sql).bind(...params).first<T>()) ?? null;
}

export async function many<T>(db: D1Database, sql: string, ...params: unknown[]): Promise<T[]> {
  const res = await db.prepare(sql).bind(...params).all<T>();
  return res.results ?? [];
}

export async function run(db: D1Database, sql: string, ...params: unknown[]): Promise<number> {
  const res = await db.prepare(sql).bind(...params).run();
  return Number(res.meta?.changes ?? 0);
}

export function stmt(db: D1Database, sql: string, ...params: unknown[]): D1PreparedStatement {
  return db.prepare(sql).bind(...params);
}

export function auditStmt(db: D1Database, actorId: string | null, action: string, object: string | null, detail: unknown, at: number): D1PreparedStatement {
  return db
    .prepare('INSERT INTO audit_log (id, actor_id, action, object, detail_json, at) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(newId('aud'), actorId, action, object, detail === undefined ? null : JSON.stringify(detail), at);
}

export function isConstraintError(err: unknown, needle?: string): boolean {
  const msg = err instanceof Error ? `${err.message} ${String((err as { cause?: unknown }).cause ?? '')}` : String(err);
  if (needle) return msg.includes(needle);
  // Alleen unieke sleutels en CHECK-regels zijn 'verwachte' conflicten; NOT NULL/FK zijn programmeerfouten (500).
  return /UNIQUE constraint failed|CHECK constraint failed/i.test(msg);
}
