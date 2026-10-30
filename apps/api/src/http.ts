/**
 * HTTP-basis: JSON-antwoorden, getypeerde fouten, beveiligingsheaders, CORS-allowlist en een
 * kleine router. Patroon uit bouwsteen B57 (vaste headers, interne fouten lekken niet).
 */
import type { Env } from './env.ts';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const notFound = (): ApiError => new ApiError(404, 'not_found', 'Niet gevonden.');
export const badRequest = (message: string, details?: Record<string, unknown>): ApiError => new ApiError(400, 'bad_request', message, details);
export const forbidden = (message = 'Dit mag je niet doen.'): ApiError => new ApiError(403, 'forbidden', message);
export const conflict = (code: string, message: string, details?: Record<string, unknown>): ApiError => new ApiError(409, code, message, details);

export const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'no-store',
  'Cross-Origin-Resource-Policy': 'same-site',
  // Besloten test: nergens door zoekmachines laten indexeren.
  'X-Robots-Tag': 'noindex, nofollow',
};

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

export function errorResponse(err: ApiError): Response {
  return json({ error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } }, err.status);
}

export function allowedOrigins(env: Env): string[] {
  return (env.ALLOWED_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean);
}

/** Voegt beveiligings- en CORS-headers toe. CORS alleen voor origins op de allowlist. */
export function finalize(res: Response, req: Request, env: Env): Response {
  if (res.status === 101) return res; // WebSocket-upgrade: headers niet aanpassen
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) out.headers.set(k, v);
  const origin = req.headers.get('Origin');
  if (origin && allowedOrigins(env).includes(origin)) {
    out.headers.set('Access-Control-Allow-Origin', origin);
    out.headers.set('Access-Control-Allow-Credentials', 'true');
    out.headers.append('Vary', 'Origin');
  }
  return out;
}

export function preflight(req: Request, env: Env): Response {
  const origin = req.headers.get('Origin');
  if (!origin || !allowedOrigins(env).includes(origin)) return new Response(null, { status: 403 });
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, Idempotency-Key',
      'Access-Control-Max-Age': '600',
      Vary: 'Origin',
    },
  });
}

export const MAX_BODY_BYTES = 16 * 1024;

/** Leest een JSON-object uit de body (maximaal 16 kB, verplicht application/json). */
export async function readJson(req: Request): Promise<Record<string, unknown>> {
  const type = req.headers.get('Content-Type') ?? '';
  if (!type.toLowerCase().startsWith('application/json')) throw new ApiError(415, 'unsupported_media_type', 'Stuur JSON (Content-Type: application/json).');
  const text = await req.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) throw new ApiError(413, 'payload_too_large', 'Verzoek is te groot.');
  if (!text) return {};
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw badRequest('Ongeldige JSON.');
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw badRequest('Verwacht een JSON-object.');
  return data as Record<string, unknown>;
}

// --- Kleine validatiehelpers -------------------------------------------------------------

export function str(body: Record<string, unknown>, key: string, opts: { min?: number; max?: number; optional?: boolean } = {}): string {
  const v = body[key];
  if (v === undefined || v === null || v === '') {
    if (opts.optional) return '';
    throw badRequest(`Veld "${key}" ontbreekt.`);
  }
  if (typeof v !== 'string') throw badRequest(`Veld "${key}" moet tekst zijn.`);
  const t = v.trim();
  if (opts.min !== undefined && t.length < opts.min) throw badRequest(`Veld "${key}" is te kort (minimaal ${opts.min}).`);
  if (opts.max !== undefined && t.length > opts.max) throw badRequest(`Veld "${key}" is te lang (maximaal ${opts.max}).`);
  return t;
}

export function num(body: Record<string, unknown>, key: string, opts: { min?: number; max?: number; integer?: boolean; optional?: boolean } = {}): number | undefined {
  const v = body[key];
  if (v === undefined || v === null) {
    if (opts.optional) return undefined;
    throw badRequest(`Veld "${key}" ontbreekt.`);
  }
  if (typeof v !== 'number' || !Number.isFinite(v)) throw badRequest(`Veld "${key}" moet een getal zijn.`);
  if (opts.integer && !Number.isInteger(v)) throw badRequest(`Veld "${key}" moet een geheel getal zijn.`);
  if (opts.min !== undefined && v < opts.min) throw badRequest(`Veld "${key}" moet minimaal ${opts.min} zijn.`);
  if (opts.max !== undefined && v > opts.max) throw badRequest(`Veld "${key}" mag hooguit ${opts.max} zijn.`);
  return v;
}

// --- Router ------------------------------------------------------------------------------

export interface User {
  id: string;
  username: string;
  role: 'player' | 'platform_admin';
  status?: 'active' | 'pending_parent_approval' | 'blocked';
}

export interface Ctx {
  req: Request;
  env: Env;
  url: URL;
  params: Record<string, string>;
  now: number;
  ip: string;
  user: User | null;
  /** Ruwe sessietoken (alleen beschikbaar binnen dit verzoek, nooit opgeslagen). */
  sessionToken: string | null;
}

export interface AuthedCtx extends Ctx {
  user: User;
}

export type Handler = (ctx: Ctx) => Promise<Response>;

interface Route {
  method: string;
  regex: RegExp;
  keys: string[];
  handler: Handler;
}

export class Router {
  private routes: Route[] = [];

  add(method: string, pattern: string, handler: Handler): this {
    const keys: string[] = [];
    const regex = new RegExp(
      '^' + pattern.replace(/\/:([a-zA-Z]+)/g, (_, key: string) => { keys.push(key); return '/([^/]+)'; }) + '/?$',
    );
    this.routes.push({ method, regex, keys, handler });
    return this;
  }

  match(method: string, path: string): { handler: Handler; params: Record<string, string> } | 'method_not_allowed' | null {
    let pathMatched = false;
    for (const r of this.routes) {
      const m = r.regex.exec(path);
      if (!m) continue;
      pathMatched = true;
      if (r.method !== method) continue;
      const params: Record<string, string> = {};
      r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1] ?? ''); });
      return { handler: r.handler, params };
    }
    return pathMatched ? 'method_not_allowed' : null;
  }
}
