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
import { cleanupExpiredPending, isValidEmail, onboardingStatements, startParentConsent } from './modules/consent.ts';
import { allowedOrigins, ApiError, badRequest, conflict, json, readJson, str, type Ctx, type User } from './http.ts';

/** Lichte moderatie van gebruikersnamen: geen gereserveerde of beledigende namen. */
const RESERVED = new Set(['admin', 'administrator', 'beheerder', 'moderator', 'rank11', 'root', 'support', 'staff']);
const BANNED = ['kanker', 'hoer', 'nazi', 'neger', 'fuck', 'shit', 'bitch', 'slet', 'kut', 'lul'];
function moderateUsername(username: string): void {
  const low = username.toLowerCase();
  if (RESERVED.has(low)) throw badRequest('Deze gebruikersnaam is niet toegestaan.');
  if (BANNED.some((w) => low.includes(w))) throw badRequest('Kies een nette gebruikersnaam.');
}

/** Cloudflare Turnstile-verificatie (bot-bescherming). Alleen actief als TURNSTILE_SECRET is gezet. */
async function verifyTurnstile(secret: string, token: unknown, ip: string): Promise<boolean> {
  if (typeof token !== 'string' || !token || token.length > 2048) return false;
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token, remoteip: ip }),
    });
    const data = await res.json() as { success?: boolean };
    return data.success === true;
  } catch { return false; }
}

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
  moderateUsername(username);
  if (Math.random() < 0.1) await cleanupExpiredPending(ctx.env, ctx.now).catch(() => {}); // opruimen (bewaartermijn)

  // Bot-bescherming (indien geconfigureerd).
  if (ctx.env.TURNSTILE_SECRET && !(await verifyTurnstile(ctx.env.TURNSTILE_SECRET, body.turnstileToken, ctx.ip))) {
    throw new ApiError(400, 'captcha_failed', 'Beveiligingscontrole mislukt. Probeer het opnieuw.');
  }

  // Open registratie (zelfregistratie) heeft geen uitnodigingscode nodig; anders wel.
  const openReg = ctx.env.OPEN_REGISTRATION === 'true';
  const invite = openReg ? null : await findUsableInvite(ctx.env, typeof body.inviteCode === 'string' ? body.inviteCode : '', ctx.now);
  if (!openReg && !invite) throw new ApiError(400, 'registration_failed', GENERIC_REGISTER_ERROR);

  // Leeftijd: onder 16 vereist ouderlijke toestemming per e-mail vóór toegang.
  const under16 = body.under16 === true;
  const parentEmail = under16 && isValidEmail(body.parentEmail) ? body.parentEmail : null;
  if (under16 && !parentEmail) throw badRequest('Vul het e-mailadres van je ouder of verzorger in.');

  const norm = normalizeUsername(username);
  if (await one(ctx.env.DB, 'SELECT 1 AS x FROM users WHERE username_norm = ?', norm)) {
    throw conflict('username_taken', 'Deze gebruikersnaam is niet beschikbaar.');
  }
  const userId = newId('usr');
  const passwordHash = await hashPassword(password, iterations(ctx.env));
  const session = await newSession(ctx.env, userId, ctx.now);
  const db = ctx.env.DB;
  const status = under16 ? 'pending_parent_approval' : 'active';
  const inviteUse = invite
    ? [invite.kind === 'pool'
        ? stmt(db, 'UPDATE pool_invites SET uses = uses + 1 WHERE id = ?', invite.id)
        : stmt(db, 'UPDATE platform_invites SET uses = uses + 1 WHERE id = ?', invite.id)]
    : [];
  const statements = [
    ...inviteUse,
    stmt(db, 'INSERT INTO users (id, username, username_norm, password_hash, role, status, is_minor, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      userId, username, norm, passwordHash, 'player', status, under16 ? 1 : 0, ctx.now),
  ];
  if (invite && invite.kind === 'pool') {
    statements.push(stmt(db, 'INSERT INTO pool_members (pool_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)', invite.pool_id, userId, 'member', ctx.now));
  }
  // Een actief account (16+) krijgt meteen een club + startelftal; een wachtend account nog niet (dataminimalisatie).
  if (!under16) statements.push(...onboardingStatements(db, userId, username, ctx.now));
  statements.push(session.statement, auditStmt(db, userId, 'account.register', userId, { via: invite ? invite.kind : 'open', minor: under16 }, ctx.now));
  try {
    await db.batch(statements);
  } catch (err) {
    if (isConstraintError(err, 'pool_full')) throw conflict('pool_full', 'Deze pool is vol.');
    if (isConstraintError(err, 'username_norm')) throw conflict('username_taken', 'Deze gebruikersnaam is niet beschikbaar.');
    if (isConstraintError(err)) throw new ApiError(400, 'registration_failed', GENERIC_REGISTER_ERROR);
    throw err;
  }

  const user: User = { id: userId, username, role: 'player', status };
  if (under16) {
    const { send } = await startParentConsent(ctx, userId, username, parentEmail!);
    const headers: Record<string, string> = {};
    if (body.cookie === true) headers['Set-Cookie'] = sessionCookie(session.token, Math.floor((session.expiresAt - ctx.now) / 1000));
    return json({ token: session.token, expiresAt: session.expiresAt, user, pending: true, emailSent: send.sent }, 201, headers);
  }
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
  const row = await one<{ token_hash: string; id: string; username: string; role: User['role']; status: User['status'] }>(env.DB,
    `SELECT s.token_hash, u.id, u.username, u.role, u.status FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ?`, hash, now);
  if (!row || !safeEqual(row.token_hash, hash)) return { user: null, token: null };
  return { user: { id: row.id, username: row.username, role: row.role, status: row.status ?? 'active' }, token };
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
