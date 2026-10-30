/**
 * Accounts voor een besloten groep: registratie alleen met een pool- of platformuitnodigingscode,
 * gebruikersnaam + wachtwoord (PBKDF2-SHA256), sessietokens waarvan alleen de SHA-256 wordt
 * opgeslagen, Bearer-header of optioneel een httpOnly-cookie, rate limiting op inloggen.
 * Geen e-mail en geen geboortedatum.
 */
import {
  hashInviteCode, hashPassword, newId, randomInviteCode, randomToken, safeEqual, sha256Hex, verifyPassword,
  MAX_PBKDF2_ITERATIONS,
} from './crypto.ts';
import { auditStmt, isConstraintError, many, one, run, stmt } from './db.ts';
import { intVar, type Env } from './env.ts';
import { starterStatements } from './modules/collection.ts';
import { allowedOrigins, ApiError, badRequest, conflict, json, readJson, str, type Ctx, type User } from './http.ts';

export const SESSION_COOKIE = 'rank11_session';
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const GENERIC_LOGIN_ERROR = 'Gebruikersnaam of wachtwoord onjuist.';
const GENERIC_REGISTER_ERROR = 'Registratie mislukt. Controleer je gegevens en uitnodigingscode.';

const iterations = (env: Env) => Math.min(MAX_PBKDF2_ITERATIONS, intVar(env.PBKDF2_ITERATIONS, MAX_PBKDF2_ITERATIONS));
const sessionTtlMs = (env: Env) => intVar(env.SESSION_TTL_DAYS, 30) * 24 * 60 * 60 * 1000;

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function validateCredentials(body: Record<string, unknown>): { username: string; password: string } {
  const username = str(body, 'username', { min: 3, max: 20 });
  if (!/^[A-Za-z0-9_]+$/.test(username)) throw badRequest('Gebruikersnaam mag alleen letters, cijfers en _ bevatten.');
  const raw = body.password;
  if (typeof raw !== 'string' || raw.length < 8) throw badRequest('Wachtwoord moet minimaal 8 tekens hebben.');
  if (raw.length > 200) throw badRequest('Wachtwoord is te lang.');
  return { username, password: raw };
}

async function newSession(env: Env, userId: string, now: number): Promise<{ token: string; statement: D1PreparedStatement; expiresAt: number }> {
  const token = randomToken(32);
  const expiresAt = now + sessionTtlMs(env);
  const statement = stmt(env.DB, 'INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)', await sha256Hex(token), userId, now, expiresAt);
  return { token, statement, expiresAt };
}

function sessionCookie(token: string, maxAgeSeconds: number): string {
  return `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAgeSeconds}`;
}

function authResponse(user: User, token: string, expiresAt: number, now: number, withCookie: boolean, status = 200): Response {
  const headers: Record<string, string> = {};
  if (withCookie) headers['Set-Cookie'] = sessionCookie(token, Math.floor((expiresAt - now) / 1000));
  return json({ token, expiresAt, user }, status, headers);
}

interface InviteRow { id: string; kind: 'pool' | 'platform'; pool_id: string | null; expires_at: number; max_uses: number; uses: number }

async function findUsableInvite(env: Env, code: string, now: number): Promise<InviteRow | null> {
  if (!code) return null;
  const hash = await hashInviteCode(code);
  const pool = await one<InviteRow>(env.DB,
    `SELECT id, 'pool' AS kind, pool_id, expires_at, max_uses, uses FROM pool_invites WHERE code_hash = ? AND revoked_at IS NULL`, hash);
  const invite = pool ?? await one<InviteRow>(env.DB,
    `SELECT id, 'platform' AS kind, NULL AS pool_id, expires_at, max_uses, uses FROM platform_invites WHERE code_hash = ? AND revoked_at IS NULL`, hash);
  if (!invite || invite.expires_at <= now || invite.uses >= invite.max_uses) return null;
  return invite;
}

export async function register(ctx: Ctx): Promise<Response> {
  if (ctx.env.REGISTRATION_ENABLED === 'false' ||
      ((ctx.env.PILOT_MODE === 'true' || ctx.env.ENVIRONMENT === 'test') && ctx.env.REGISTRATION_ENABLED !== 'true')) {
    throw new ApiError(403, 'registration_closed', 'Registratie is gesloten.');
  }
  const body = await readJson(ctx.req);
  const { username, password } = validateCredentials(body);
  const inviteCode = typeof body.inviteCode === 'string' ? body.inviteCode : '';
  const invite = await findUsableInvite(ctx.env, inviteCode, ctx.now);
  if (!invite) throw new ApiError(400, 'registration_failed', GENERIC_REGISTER_ERROR);
  const norm = normalizeUsername(username);
  if (await one(ctx.env.DB, 'SELECT 1 AS x FROM users WHERE username_norm = ?', norm)) {
    throw conflict('username_taken', 'Deze gebruikersnaam is niet beschikbaar.');
  }
  const userId = newId('usr');
  const passwordHash = await hashPassword(password, iterations(ctx.env));
  const session = await newSession(ctx.env, userId, ctx.now);
  const db = ctx.env.DB;
  const statements = [
    invite.kind === 'pool'
      ? stmt(db, 'UPDATE pool_invites SET uses = uses + 1 WHERE id = ?', invite.id)
      : stmt(db, 'UPDATE platform_invites SET uses = uses + 1 WHERE id = ?', invite.id),
    stmt(db, 'INSERT INTO users (id, username, username_norm, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)', userId, username, norm, passwordHash, 'player', ctx.now),
  ];
  if (invite.kind === 'pool') {
    statements.push(stmt(db, 'INSERT INTO pool_members (pool_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)', invite.pool_id, userId, 'member', ctx.now));
  }
  // Standaardclub op naam van de speler (later aan te passen via PUT /api/club).
  const short = username.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase().padEnd(3, 'X');
  statements.push(stmt(db, 'INSERT INTO clubs (user_id, name, short, crest_json, updated_at) VALUES (?, ?, ?, ?, ?)', userId, `FC ${username}`.slice(0, 24), short,
    JSON.stringify({ shape: 'shield', symbol: 'star', pattern: 'sash', primary: '#0b1f4d', secondary: '#1f6bff', accent: '#f2cf73' }), ctx.now));
  // V-013: iedereen begint met een compleet startelftal met reserves (in dezelfde transactie als het account).
  statements.push(...starterStatements(db, userId, ctx.now).statements);
  statements.push(session.statement, auditStmt(db, userId, 'account.register', userId, { via: invite.kind, inviteId: invite.id }, ctx.now));
  try {
    await db.batch(statements);
  } catch (err) {
    if (isConstraintError(err, 'pool_full')) throw conflict('pool_full', 'Deze pool is vol.');
    if (isConstraintError(err, 'username_norm')) throw conflict('username_taken', 'Deze gebruikersnaam is niet beschikbaar.');
    if (isConstraintError(err)) throw new ApiError(400, 'registration_failed', GENERIC_REGISTER_ERROR);
    throw err;
  }
  const user: User = { id: userId, username, role: 'player' };
  return authResponse(user, session.token, session.expiresAt, ctx.now, body.cookie === true, 201);
}

let dummyHash: Promise<string> | null = null;

async function bucketKeys(username: string, ip: string): Promise<string[]> {
  return [`u:${await sha256Hex(normalizeUsername(username))}`, `ip:${await sha256Hex(ip)}`];
}

async function isRateLimited(env: Env, keys: string[], now: number): Promise<boolean> {
  const limits = [intVar(env.LOGIN_MAX_FAILURES, 5), intVar(env.LOGIN_MAX_FAILURES_IP, 30)];
  for (let i = 0; i < keys.length; i++) {
    const row = await one<{ window_start: number; failures: number }>(env.DB, 'SELECT window_start, failures FROM login_attempts WHERE bucket = ?', keys[i]);
    if (row && row.window_start > now - LOGIN_WINDOW_MS && row.failures >= (limits[i] as number)) return true;
  }
  return false;
}

async function recordFailure(env: Env, keys: string[], now: number): Promise<void> {
  const cutoff = now - LOGIN_WINDOW_MS;
  await env.DB.batch(keys.map((k) => stmt(env.DB,
    `INSERT INTO login_attempts (bucket, window_start, failures) VALUES (?, ?, 1)
     ON CONFLICT(bucket) DO UPDATE SET
       failures = CASE WHEN window_start <= ? THEN 1 ELSE failures + 1 END,
       window_start = CASE WHEN window_start <= ? THEN excluded.window_start ELSE window_start END`,
    k, now, cutoff, cutoff)));
}

export async function login(ctx: Ctx): Promise<Response> {
  const body = await readJson(ctx.req);
  const username = typeof body.username === 'string' ? body.username : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!username || !password || username.length > 20 || password.length > 200) throw new ApiError(401, 'invalid_credentials', GENERIC_LOGIN_ERROR);
  const keys = await bucketKeys(username, ctx.ip);
  if (await isRateLimited(ctx.env, keys, ctx.now)) {
    throw new ApiError(429, 'rate_limited', 'Te veel pogingen. Probeer het over een kwartier opnieuw.');
  }
  const row = await one<{ id: string; username: string; role: User['role']; password_hash: string }>(ctx.env.DB,
    'SELECT id, username, role, password_hash FROM users WHERE username_norm = ?', normalizeUsername(username));
  // Ook zonder gebruiker een hash berekenen, zodat de responstijd niet verraadt of een naam bestaat.
  dummyHash ??= hashPassword('rank11-dummy-wachtwoord', iterations(ctx.env));
  const ok = await verifyPassword(password, row?.password_hash ?? await dummyHash);
  if (!row || !ok) {
    await recordFailure(ctx.env, keys, ctx.now);
    throw new ApiError(401, 'invalid_credentials', GENERIC_LOGIN_ERROR);
  }
  const session = await newSession(ctx.env, row.id, ctx.now);
  await ctx.env.DB.batch([
    session.statement,
    stmt(ctx.env.DB, 'DELETE FROM login_attempts WHERE bucket = ?', keys[0]),
    stmt(ctx.env.DB, 'DELETE FROM sessions WHERE user_id = ? AND expires_at <= ?', row.id, ctx.now),
  ]);
  return authResponse({ id: row.id, username: row.username, role: row.role }, session.token, session.expiresAt, ctx.now, body.cookie === true);
}

export async function logout(ctx: Ctx): Promise<Response> {
  if (ctx.sessionToken) await run(ctx.env.DB, 'DELETE FROM sessions WHERE token_hash = ?', await sha256Hex(ctx.sessionToken));
  return json({ ok: true }, 200, { 'Set-Cookie': `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0` });
}

function tokenFrom(req: Request): { token: string | null; viaCookie: boolean } {
  const header = req.headers.get('Authorization');
  if (header?.startsWith('Bearer ')) return { token: header.slice(7).trim() || null, viaCookie: false };
  const cookie = req.headers.get('Cookie') ?? '';
  const match = cookie.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  const value = match?.slice(SESSION_COOKIE.length + 1);
  return { token: value || null, viaCookie: Boolean(value) };
}

/** Zoekt de sessie bij het verzoek. Bij cookie-authenticatie op muterende verzoeken moet de Origin op de allowlist staan (CSRF). */
export async function authenticate(req: Request, env: Env, now: number): Promise<{ user: User | null; token: string | null }> {
  const { token, viaCookie } = tokenFrom(req);
  if (!token || token.length > 200) return { user: null, token: null };
  if (viaCookie && !['GET', 'HEAD'].includes(req.method)) {
    const origin = req.headers.get('Origin');
    if (!origin || !allowedOrigins(env).includes(origin)) return { user: null, token: null };
  }
  const hash = await sha256Hex(token);
  const row = await one<{ token_hash: string; id: string; username: string; role: User['role'] }>(env.DB,
    `SELECT s.token_hash, u.id, u.username, u.role FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ?`, hash, now);
  if (!row || !safeEqual(row.token_hash, hash)) return { user: null, token: null };
  return { user: { id: row.id, username: row.username, role: row.role }, token };
}

export function requireUser(ctx: Ctx): User {
  if (!ctx.user) throw new ApiError(401, 'unauthorized', 'Log eerst in.');
  return ctx.user;
}

export async function me(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  return json({ user });
}

/** Maakt een platformuitnodiging; de leesbare code wordt alleen hier teruggegeven. */
export async function createPlatformInvite(db: D1Database, opts: { now: number; expiresAt: number; maxUses: number; note?: string; actorId?: string | null }): Promise<{ id: string; code: string }> {
  const code = randomInviteCode();
  const id = newId('pin');
  await db.batch([
    stmt(db, 'INSERT INTO platform_invites (id, code_hash, expires_at, max_uses, uses, note, created_at) VALUES (?, ?, ?, ?, 0, ?, ?)',
      id, await hashInviteCode(code), opts.expiresAt, opts.maxUses, opts.note ?? null, opts.now),
    auditStmt(db, opts.actorId ?? null, 'platform_invite.create', id, { maxUses: opts.maxUses, expiresAt: opts.expiresAt }, opts.now),
  ]);
  return { id, code };
}

export async function adminCreatePlatformInvite(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  if (user.role !== 'platform_admin') throw new ApiError(404, 'not_found', 'Niet gevonden.');
  const body = await readJson(ctx.req);
  const maxUses = typeof body.maxUses === 'number' && Number.isInteger(body.maxUses) && body.maxUses > 0 && body.maxUses <= 100 ? body.maxUses : 1;
  const hours = typeof body.expiresInHours === 'number' && body.expiresInHours > 0 && body.expiresInHours <= 24 * 30 ? body.expiresInHours : 72;
  const invite = await createPlatformInvite(ctx.env.DB, { now: ctx.now, expiresAt: ctx.now + hours * 3600_000, maxUses, note: typeof body.note === 'string' ? body.note.slice(0, 80) : undefined, actorId: user.id });
  return json({ ...invite, maxUses, expiresAt: ctx.now + hours * 3600_000 }, 201);
}

function requirePlatformAdmin(ctx: Ctx): User {
  const user = requireUser(ctx);
  if (user.role !== 'platform_admin') throw new ApiError(404, 'not_found', 'Niet gevonden.');
  return user;
}

interface InviteAdminRow { id: string; note: string | null; max_uses: number; uses: number; expires_at: number; revoked_at: number | null; created_at: number }

/** Overzicht van platformuitnodigingen voor de beheerder. De leesbare code staat er bewust NIET bij
 * (die is alleen bij aanmaken zichtbaar); wel of een code nog bruikbaar is. */
export async function adminListPlatformInvites(ctx: Ctx): Promise<Response> {
  requirePlatformAdmin(ctx);
  const rows = await many<InviteAdminRow>(ctx.env.DB,
    'SELECT id, note, max_uses, uses, expires_at, revoked_at, created_at FROM platform_invites ORDER BY created_at DESC LIMIT 100');
  const invites = rows.map((r) => ({
    id: r.id, note: r.note, maxUses: r.max_uses, uses: r.uses, expiresAt: r.expires_at,
    revokedAt: r.revoked_at, createdAt: r.created_at,
    active: r.revoked_at === null && r.expires_at > ctx.now && r.uses < r.max_uses,
  }));
  return json({ invites });
}

/** Trekt een uitnodiging in: direct onbruikbaar om te registreren. */
export async function adminRevokePlatformInvite(ctx: Ctx): Promise<Response> {
  const user = requirePlatformAdmin(ctx);
  const id = ctx.params.id as string;
  const row = await one<{ id: string }>(ctx.env.DB, 'SELECT id FROM platform_invites WHERE id = ?', id);
  if (!row) throw new ApiError(404, 'not_found', 'Niet gevonden.');
  await ctx.env.DB.batch([
    stmt(ctx.env.DB, 'UPDATE platform_invites SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL', ctx.now, id),
    auditStmt(ctx.env.DB, user.id, 'platform_invite.revoke', id, {}, ctx.now),
  ]);
  return json({ id, revokedAt: ctx.now });
}
