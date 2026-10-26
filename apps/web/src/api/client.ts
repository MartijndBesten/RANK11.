/**
 * API-client voor de RANK11.-server (apps/api). Zelfde origin (/api, via de Vite-proxy of de Worker-route),
 * sessie in een httpOnly-cookie: de app bewaart zelf geen token. Muterende verzoeken krijgen een
 * idempotentiesleutel, zodat een dubbele klik of herhaalde poging geen dubbele beloning geeft.
 */
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: Record<string, unknown>) {
    super(message);
  }
}

const base = '/api';

function idemKey(): string {
  const a = new Uint32Array(3);
  crypto.getRandomValues(a);
  return `web-${Date.now().toString(36)}-${[...a].map((n) => n.toString(36)).join('')}`;
}

export async function api<T = unknown>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') headers['Idempotency-Key'] = idemKey();
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, { method, headers, credentials: 'same-origin', body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, 'offline', 'Geen verbinding met de server.');
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const e = (data as { error?: { code: string; message: string; details?: Record<string, unknown> } }).error;
    throw new ApiError(res.status, e?.code ?? 'error', e?.message ?? 'Er ging iets mis.', e?.details);
  }
  return data as T;
}

/** Is er een server bereikbaar? Kort wachten: in de statische preview is er geen server. */
export async function serverAvailable(timeoutMs = 1500): Promise<boolean> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}/health`, { signal: ctrl.signal, credentials: 'same-origin' });
    return res.ok && ((await res.json()) as { ok?: boolean }).ok === true;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

export interface ApiUser { id: string; username: string; role: string }
export interface ApiCard { id: string; cardDefId: string; name: string; position: string; rating: number; rarity: string; acquiredVia?: string; acquiredAt?: number }
export interface ApiGrade { id: string; subjectId: string; testName: string; value: number; weight: number; date: string; status: string; source?: string; createdAt: number; updatedAt: number }
export interface ApiHistory { gradeId: string; action: 'create' | 'correct' | 'delete'; before: ApiGrade | null; after: ApiGrade | null; at: number }
export interface ApiXpEntry { key: string; category: 'performance' | 'progress' | 'academy'; xp: number; label: string; date: string; source: { kind: string; id: string }; configVersion: string; cappedBy?: number; packId?: string }
export interface ApiVaultItem {
  grantId: string; kind: string; status: string; tierId: string | null; tier: { id: string; label: string; tone: string; minGrade: number; xp: number; coins: number; packId?: string; vouchers?: number; pick?: { options: number; minRating: number } } | null;
  coins: number; vouchers: number; packId: string | null; bonuses: { label: string; xp: number; coins: number }[]; createdAt: number;
  grade: { id: string; subjectId: string; testName: string; value: number; weight: number; date: string } | null;
  xp: { key: string; category: 'performance' | 'progress' | 'academy'; xp: number; label: string; cappedBy: number; packId: string | null }[];
  pick: { minRating: number; options: { cardDefId: string }[]; claimedCardDefId: string | null } | null;
  progress?: { key: string; kind: string; label: string; packId: string | null; vouchers: number; coins: number }[];
}
export interface ApiPool { id: string; name: string; role: string; memberCount?: number; maxMembers?: number }
