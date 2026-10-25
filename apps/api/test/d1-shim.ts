/**
 * D1-testshim op `node:sqlite` (patroon bouwsteen B57): voert alle migraties uit en biedt de
 * D1-methoden die de API gebruikt (prepare/bind/first/all/run/raw, batch als transactie, exec).
 */
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

type Value = string | number | null | bigint | Uint8Array;

function toSql(v: unknown): Value {
  if (v === undefined) throw new Error('D1_TYPE_ERROR: undefined kan niet gebonden worden');
  if (typeof v === 'boolean') return v ? 1 : 0;
  return v as Value;
}

class ShimStatement {
  constructor(private db: DatabaseSync, readonly sql: string, private params: Value[] = []) {}
  bind(...values: unknown[]): ShimStatement {
    return new ShimStatement(this.db, this.sql, values.map(toSql));
  }
  async first<T = Record<string, unknown>>(column?: string): Promise<T | null> {
    const row = this.db.prepare(this.sql).get(...this.params) as Record<string, unknown> | undefined;
    if (!row) return null;
    return (column ? row[column] : { ...row }) as T;
  }
  async all<T = Record<string, unknown>>(): Promise<{ results: T[]; success: true; meta: Record<string, unknown> }> {
    const rows = this.db.prepare(this.sql).all(...this.params) as T[];
    return { results: rows.map((r) => ({ ...r })), success: true, meta: {} };
  }
  async raw<T = unknown[]>(): Promise<T[]> {
    const stmt = this.db.prepare(this.sql);
    stmt.setReturnArrays?.(true);
    return stmt.all(...this.params) as T[];
  }
  async run(): Promise<{ success: true; results: []; meta: { changes: number; last_row_id: number } }> {
    return this.execRun();
  }
  execRun(): { success: true; results: []; meta: { changes: number; last_row_id: number } } {
    const r = this.db.prepare(this.sql).run(...this.params);
    return { success: true, results: [], meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
  }
}

export class D1Shim {
  readonly db: DatabaseSync;
  constructor() {
    this.db = new DatabaseSync(':memory:');
    this.db.exec('PRAGMA foreign_keys = ON;');
  }
  prepare(sql: string): ShimStatement {
    return new ShimStatement(this.db, sql);
  }
  async batch(statements: ShimStatement[]): Promise<unknown[]> {
    this.db.exec('BEGIN');
    try {
      // De API gebruikt batch() alleen voor schrijfacties.
      const out = statements.map((s) => s.execRun());
      this.db.exec('COMMIT');
      return out;
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }
  async exec(sql: string): Promise<{ count: number }> {
    this.db.exec(sql);
    return { count: 1 };
  }
}

export function createTestDb(): D1Shim {
  const shim = new D1Shim();
  const dir = join(import.meta.dirname, '..', 'migrations');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    shim.db.exec(readFileSync(join(dir, file), 'utf8'));
  }
  return shim;
}
