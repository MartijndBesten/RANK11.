/**
 * Testomgeving zonder Cloudflare-account: D1-shim op node:sqlite, een nep-Durable-Object-namespace
 * die de echte MatchDO-klasse draait met een in-memory opslagadapter, en een nepklok via vi.setSystemTime.
 */
import { vi } from 'vitest';
import { createPlatformInvite } from '../src/auth.ts';
import type { Env } from '../src/env.ts';
import { handle } from '../src/index.ts';
import { MatchDO, type MatchDOState } from '../src/match/MatchDO.ts';
import type { RoomStorage } from '../src/match/room.ts';
import { createTestDb, type D1Shim } from './d1-shim.ts';

export class MemoryStorage implements RoomStorage {
  data = new Map<string, unknown>();
  alarmAt: number | null = null;
  async get<T>(key: string): Promise<T | undefined> {
    const v = this.data.get(key);
    return v === undefined ? undefined : (structuredClone(v) as T);
  }
  async put<T>(key: string, value: T): Promise<void> {
    this.data.set(key, structuredClone(value));
  }
  async setAlarm(at: number): Promise<void> {
    this.alarmAt = at;
  }
  async deleteAlarm(): Promise<void> {
    this.alarmAt = null;
  }
}

/** Nep-WebSocket: verzamelt verzonden berichten. */
export class FakeSocket {
  sent: unknown[] = [];
  closed: number | null = null;
  private attachment: unknown = null;
  send(text: string): void {
    this.sent.push(JSON.parse(text));
  }
  close(code: number): void {
    this.closed = code;
  }
  serializeAttachment(v: unknown): void {
    this.attachment = structuredClone(v);
  }
  deserializeAttachment(): unknown {
    return this.attachment;
  }
}

interface DOEntry { storage: MemoryStorage; sockets: FakeSocket[]; instance: MatchDO }

export class FakeDONamespace {
  entries = new Map<string, DOEntry>();
  env!: Env;

  idFromName(name: string) {
    return { name, toString: () => name, equals: (o: { name: string }) => o.name === name };
  }

  private entry(name: string): DOEntry {
    let e = this.entries.get(name);
    if (!e) {
      const storage = new MemoryStorage();
      const sockets: FakeSocket[] = [];
      e = { storage, sockets, instance: this.instantiate(storage, sockets) };
      this.entries.set(name, e);
    }
    return e;
  }

  private instantiate(storage: MemoryStorage, sockets: FakeSocket[]): MatchDO {
    const state: MatchDOState = {
      storage,
      acceptWebSocket: (ws) => { sockets.push(ws as unknown as FakeSocket); },
      getWebSockets: () => sockets as unknown as WebSocket[],
    };
    return new MatchDO(state, this.env);
  }

  get(id: { name: string }) {
    return {
      fetch: (input: RequestInfo, init?: RequestInit) => {
        const req = input instanceof Request ? input : new Request(String(input), init);
        return this.entry(id.name).instance.fetch(req);
      },
    };
  }

  /** Simuleert dat de DO uit het geheugen is gehaald (hibernation/eviction): nieuwe instantie, zelfde opslag. */
  evict(name: string): void {
    const e = this.entries.get(name);
    if (e) e.instance = this.instantiate(e.storage, e.sockets);
  }

  /** Laat de DO-alarmen afgaan die op of vóór `now` staan. */
  async runAlarms(now: number): Promise<number> {
    let fired = 0;
    for (const e of this.entries.values()) {
      if (e.storage.alarmAt !== null && e.storage.alarmAt <= now) {
        e.storage.alarmAt = null;
        await e.instance.alarm();
        fired++;
      }
    }
    return fired;
  }

  socket(name: string): { instance: MatchDO; connect: (userId: string) => FakeSocket } {
    const e = this.entry(name);
    return {
      instance: e.instance,
      connect: (userId: string) => {
        const ws = new FakeSocket();
        ws.serializeAttachment({ userId });
        e.sockets.push(ws);
        return ws;
      },
    };
  }
}

export const T0 = Date.UTC(2026, 9, 26, 10, 0, 0); // maandag 26-10-2026 10:00 UTC

export interface TestApp {
  env: Env;
  db: D1Shim;
  dos: FakeDONamespace;
  now(): number;
  setTime(ms: number): void;
  advance(ms: number): void;
  api<T = any>(method: string, path: string, opts?: { token?: string; body?: unknown; headers?: Record<string, string>; idem?: string; ip?: string }): Promise<{ status: number; body: T; headers: Headers }>;
}

export function createApp(overrides: Partial<Env> = {}): TestApp {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(T0);
  const db = createTestDb();
  const dos = new FakeDONamespace();
  const env: Env = {
    DB: db as unknown as D1Database,
    MATCH: dos as unknown as DurableObjectNamespace,
    ALLOWED_ORIGINS: 'https://app.rank11.test',
    PBKDF2_ITERATIONS: '1000', // snel in tests; standaard (productie) 100.000
    INTEGRATION_KEY: 'test-integratie-sleutel',
    ...overrides,
  };
  dos.env = env;
  return {
    env, db, dos,
    now: () => Date.now(),
    setTime: (ms) => vi.setSystemTime(ms),
    advance: (ms) => vi.setSystemTime(Date.now() + ms),
    async api(method, path, opts = {}) {
      const headers: Record<string, string> = { 'CF-Connecting-IP': opts.ip ?? '203.0.113.7', ...opts.headers };
      if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
      if (opts.idem) headers['Idempotency-Key'] = opts.idem;
      let body: string | undefined;
      if (opts.body !== undefined) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(opts.body);
      }
      const res = await handle(new Request(`https://api.rank11.test${path}`, { method, headers, body }), env);
      const text = await res.text();
      return { status: res.status, body: text ? JSON.parse(text) : null, headers: res.headers };
    },
  };
}

export async function platformCode(app: TestApp, opts: { maxUses?: number; expiresInMs?: number } = {}): Promise<string> {
  const { code } = await createPlatformInvite(app.env.DB, { now: app.now(), expiresAt: app.now() + (opts.expiresInMs ?? 3600_000), maxUses: opts.maxUses ?? 50 });
  return code;
}

export interface TestUser { id: string; username: string; token: string }

export async function register(app: TestApp, username: string, inviteCode: string, password = 'geheim-wachtwoord-1'): Promise<TestUser> {
  const res = await app.api('POST', '/api/auth/register', { body: { username, password, inviteCode } });
  if (res.status !== 201) throw new Error(`registratie ${username} mislukt: ${res.status} ${JSON.stringify(res.body)}`);
  return { id: res.body.user.id, username, token: res.body.token };
}

/** Pool met een beheerder en extra leden die via de poolcode registreren. */
export async function poolWith(app: TestApp, names: string[], opts: { maxMembers?: number } = {}): Promise<{ poolId: string; users: TestUser[] }> {
  const [first, ...rest] = names;
  const admin = await register(app, first as string, await platformCode(app));
  const pool = await app.api('POST', '/api/pools', { token: admin.token, body: { name: `Pool van ${first}`, maxMembers: opts.maxMembers } });
  const poolId = pool.body.pool.id as string;
  const users = [admin];
  if (rest.length) {
    const inv = await app.api('POST', `/api/pools/${poolId}/invites`, { token: admin.token, body: { maxUses: 50 } });
    for (const n of rest) users.push(await register(app, n, inv.body.invite.code));
  }
  return { poolId, users };
}

let idemCounter = 0;
export const idem = (label = 'k') => `test-${label}-${++idemCounter}-${Math.random().toString(36).slice(2, 8)}`;
