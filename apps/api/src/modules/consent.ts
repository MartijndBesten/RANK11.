/**
 * Ouderlijke toestemming voor spelers onder 16. Een kind registreert met status
 * 'pending_parent_approval' en ontvangt pas toegang (en pas dan een club + startelftal) nadat een ouder
 * via een e-maillink bewust op "Goedkeuren" klikt. Tokens zijn eenmalig, cryptografisch, verlopen na 48 u
 * en worden alleen als hash bewaard. Goedkeuren/afwijzen/intrekken gaat via POST (niet via het openen van
 * een GET-link). Geen tokens of geheimen in logs.
 */
import { newId, randomToken, sha256Hex } from '../crypto.ts';
import { auditStmt, many, one, run, stmt } from '../db.ts';
import type { Env } from '../env.ts';
import { ApiError, json, readJson, type Ctx } from '../http.ts';
import { starterStatements } from './collection.ts';
import { buildConsentEmail, buildRevokeEmail, sendEmail, type SendResult } from './email.ts';

export const CONSENT_INFO_VERSION = '2026.10-1';
const TOKEN_TTL_MS = 48 * 3600_000;         // goedkeuringslink verloopt na 48 uur
const RESEND_MIN_INTERVAL_MS = 2 * 60_000;  // minstens 2 minuten tussen e-mails
const RESEND_MAX = 5;                        // hooguit 5 e-mails per toestemmingsverzoek

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isValidEmail = (e: unknown): e is string => typeof e === 'string' && e.length <= 254 && EMAIL_RE.test(e);

const baseUrl = (ctx: Ctx) => (ctx.env.PUBLIC_BASE_URL || new URL(ctx.req.url).origin).replace(/\/$/, '');
const approvalUrl = (ctx: Ctx, token: string) => `${baseUrl(ctx)}/ouder/toestemming?token=${token}`;
const revokeUrl = (ctx: Ctx, token: string) => `${baseUrl(ctx)}/ouder/intrekken?token=${token}`;
const privacyUrl = (ctx: Ctx) => `${baseUrl(ctx)}/privacy`;

/** Club + startelftal: aangemaakt bij een actief account (16+), of bij een kind zodra de ouder goedkeurt. */
export function onboardingStatements(db: D1Database, userId: string, username: string, now: number) {
  const short = username.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase().padEnd(3, 'X');
  const club = stmt(db, 'INSERT INTO clubs (user_id, name, short, crest_json, updated_at) VALUES (?, ?, ?, ?, ?)',
    userId, `FC ${username}`.slice(0, 24), short,
    JSON.stringify({ shape: 'shield', symbol: 'star', pattern: 'sash', primary: '#0b1f4d', secondary: '#1f6bff', accent: '#f2cf73' }), now);
  return [club, ...starterStatements(db, userId, now).statements];
}

const PENDING_RETENTION_MS = 7 * 24 * 3600_000; // niet-goedgekeurde accounts na een korte periode opruimen

/** Opruimen van niet-goedgekeurde accounts (dataminimalisatie). Wachtende accounts hebben geen spelgegevens,
 * dus een directe cascade-verwijdering is veilig. Begrensd; opportunistisch aangeroepen. */
export async function cleanupExpiredPending(env: Env, now: number): Promise<void> {
  const stale = await many<{ id: string }>(env.DB,
    "SELECT id FROM users WHERE status = 'pending_parent_approval' AND created_at < ? LIMIT 20", now - PENDING_RETENTION_MS);
  if (!stale.length) return;
  await env.DB.batch(stale.map((u) => env.DB.prepare('DELETE FROM users WHERE id = ?').bind(u.id)));
}

/** Maakt een toestemmingsverzoek aan (token + rij) en verstuurt de e-mail. Retourneert of de e-mail is verzonden. */
export async function startParentConsent(ctx: Ctx, userId: string, username: string, parentEmail: string): Promise<{ consentId: string; send: SendResult }> {
  const token = randomToken(32);
  const id = newId('pc');
  const now = ctx.now;
  await run(ctx.env.DB,
    `INSERT INTO parent_consents (id, user_id, parent_email, token_hash, purpose, status, info_version, email_sends, last_sent_at, expires_at, created_at)
     VALUES (?, ?, ?, ?, 'approval', 'pending', ?, 1, ?, ?, ?)`,
    id, userId, parentEmail, await sha256Hex(token), CONSENT_INFO_VERSION, now, now + TOKEN_TTL_MS, now);
  const mail = buildConsentEmail(username, approvalUrl(ctx, token), privacyUrl(ctx));
  const send = await sendEmail(ctx.env, { to: parentEmail, subject: mail.subject, html: mail.html, text: mail.text });
  return { consentId: id, send };
}

interface ConsentRow { id: string; user_id: string; parent_email: string; status: string; purpose: string; info_version: string; email_sends: number; last_sent_at: number | null; expires_at: number }

/** GET /api/consent/status — de ingelogde (wachtende) speler ziet de status van zijn toestemming. */
export async function consentStatus(ctx: Ctx): Promise<Response> {
  const user = ctx.user;
  if (!user) throw new ApiError(401, 'unauthorized', 'Log eerst in.');
  const row = await one<{ status: string; parent_email: string }>(ctx.env.DB,
    "SELECT status, parent_email FROM parent_consents WHERE user_id = ? AND purpose = 'approval' ORDER BY created_at DESC LIMIT 1", user.id);
  const mask = (e: string) => e.replace(/^(.).*(@.*)$/, (_, a, b) => `${a}•••${b}`);
  return json({ accountStatus: user.status ?? 'active', consent: row ? { status: row.status, parentEmailMasked: mask(row.parent_email) } : null });
}

/** POST /api/consent/resend — stuurt de toestemmingsmail opnieuw (begrensd tegen misbruik). */
export async function resendConsent(ctx: Ctx): Promise<Response> {
  const user = ctx.user;
  if (!user) throw new ApiError(401, 'unauthorized', 'Log eerst in.');
  if (user.status !== 'pending_parent_approval') throw new ApiError(409, 'not_pending', 'Er staat geen toestemming open.');
  const row = await one<ConsentRow>(ctx.env.DB,
    "SELECT id, user_id, parent_email, status, purpose, info_version, email_sends, last_sent_at, expires_at FROM parent_consents WHERE user_id = ? AND purpose = 'approval' ORDER BY created_at DESC LIMIT 1", user.id);
  if (!row || row.status !== 'pending') throw new ApiError(409, 'not_pending', 'Er staat geen toestemming open.');
  if (row.email_sends >= RESEND_MAX) throw new ApiError(429, 'rate_limited', 'Te vaak opnieuw verstuurd. Probeer het later.');
  if (row.last_sent_at && ctx.now - row.last_sent_at < RESEND_MIN_INTERVAL_MS) throw new ApiError(429, 'rate_limited', 'Net al verstuurd. Wacht even.');
  const token = randomToken(32);
  await run(ctx.env.DB, 'UPDATE parent_consents SET token_hash = ?, expires_at = ?, email_sends = email_sends + 1, last_sent_at = ? WHERE id = ?',
    await sha256Hex(token), ctx.now + TOKEN_TTL_MS, ctx.now, row.id);
  const mail = buildConsentEmail(user.username, approvalUrl(ctx, token), privacyUrl(ctx));
  const send = await sendEmail(ctx.env, { to: row.parent_email, subject: mail.subject, html: mail.html, text: mail.text });
  return json({ ok: true, emailSent: send.sent });
}

async function lookupByToken(ctx: Ctx, token: unknown, purpose: string): Promise<ConsentRow | null> {
  if (typeof token !== 'string' || token.length < 10 || token.length > 200) return null;
  const row = await one<ConsentRow>(ctx.env.DB,
    "SELECT id, user_id, parent_email, status, purpose, info_version, email_sends, last_sent_at, expires_at FROM parent_consents WHERE token_hash = ? AND purpose = ? AND status = 'pending'",
    await sha256Hex(token), purpose);
  if (!row || row.expires_at <= ctx.now) return null;
  return row;
}

/** POST /api/consent/decide — ouder keurt goed of af. Eenmalig; token wordt gewist. */
export async function decideConsent(ctx: Ctx): Promise<Response> {
  const body = await readJson(ctx.req);
  const decision = body.decision === 'approve' ? 'approve' : body.decision === 'decline' ? 'decline' : null;
  if (!decision) throw new ApiError(400, 'bad_request', 'Onbekende keuze.');
  const row = await lookupByToken(ctx, body.token, 'approval');
  if (!row) throw new ApiError(400, 'invalid_token', 'Deze link is ongeldig of verlopen.');
  const u = await one<{ username: string; status: string }>(ctx.env.DB, 'SELECT username, status FROM users WHERE id = ?', row.user_id);
  if (!u) throw new ApiError(400, 'invalid_token', 'Deze link is ongeldig of verlopen.');
  const ip = ctx.ip;
  if (decision === 'approve') {
    const stmts = [
      stmt(ctx.env.DB, "UPDATE parent_consents SET status = 'granted', token_hash = NULL, decided_at = ?, decided_ip = ? WHERE id = ?", ctx.now, ip, row.id),
      stmt(ctx.env.DB, "UPDATE users SET status = 'active' WHERE id = ?", row.user_id),
      auditStmt(ctx.env.DB, null, 'consent.granted', row.user_id, { consentId: row.id, version: row.info_version }, ctx.now),
    ];
    // Club + startelftal pas nu aanmaken (niet eerder opgeslagen).
    const hasClub = await one(ctx.env.DB, 'SELECT 1 AS x FROM clubs WHERE user_id = ?', row.user_id);
    if (!hasClub) stmts.push(...onboardingStatements(ctx.env.DB, row.user_id, u.username, ctx.now));
    await ctx.env.DB.batch(stmts);
    return json({ ok: true, decision: 'approve', username: u.username });
  }
  await ctx.env.DB.batch([
    stmt(ctx.env.DB, "UPDATE parent_consents SET status = 'declined', token_hash = NULL, decided_at = ?, decided_ip = ? WHERE id = ?", ctx.now, ip, row.id),
    stmt(ctx.env.DB, "UPDATE users SET status = 'blocked' WHERE id = ?", row.user_id),
    stmt(ctx.env.DB, 'DELETE FROM sessions WHERE user_id = ?', row.user_id),
    auditStmt(ctx.env.DB, null, 'consent.declined', row.user_id, { consentId: row.id }, ctx.now),
  ]);
  return json({ ok: true, decision: 'decline', username: u.username });
}

/** POST /api/consent/request-revoke — ouder vraagt per e-mail een intreklink aan. */
export async function requestRevoke(ctx: Ctx): Promise<Response> {
  const body = await readJson(ctx.req);
  const email = isValidEmail(body.parentEmail) ? body.parentEmail : null;
  // Altijd hetzelfde antwoord (geen e-mailadres-enumeratie).
  const neutral = json({ ok: true });
  if (!email) return neutral;
  const granted = await one<{ user_id: string }>(ctx.env.DB,
    "SELECT user_id FROM parent_consents WHERE parent_email = ? AND status = 'granted' ORDER BY created_at DESC LIMIT 1", email);
  if (!granted) return neutral;
  const recent = await one<{ n: number }>(ctx.env.DB,
    "SELECT COUNT(*) AS n FROM parent_consents WHERE parent_email = ? AND purpose = 'revoke' AND created_at > ?", email, ctx.now - 3600_000);
  if (recent && recent.n >= 3) return neutral; // begrenzing
  const token = randomToken(32);
  await run(ctx.env.DB,
    `INSERT INTO parent_consents (id, user_id, parent_email, token_hash, purpose, status, info_version, email_sends, last_sent_at, expires_at, created_at)
     VALUES (?, ?, ?, ?, 'revoke', 'pending', ?, 1, ?, ?, ?)`,
    newId('pc'), granted.user_id, email, await sha256Hex(token), CONSENT_INFO_VERSION, ctx.now, ctx.now + TOKEN_TTL_MS, ctx.now);
  const mail = buildRevokeEmail(revokeUrl(ctx, token));
  await sendEmail(ctx.env, { to: email, subject: mail.subject, html: mail.html, text: mail.text });
  return neutral;
}

/** POST /api/consent/revoke — ouder trekt toestemming in; account geblokkeerd, sessies ongeldig. */
export async function revokeConsent(ctx: Ctx): Promise<Response> {
  const body = await readJson(ctx.req);
  const row = await lookupByToken(ctx, body.token, 'revoke');
  if (!row) throw new ApiError(400, 'invalid_token', 'Deze link is ongeldig of verlopen.');
  await ctx.env.DB.batch([
    stmt(ctx.env.DB, "UPDATE parent_consents SET status = 'revoked', token_hash = NULL, decided_at = ?, decided_ip = ? WHERE id = ?", ctx.now, ctx.ip, row.id),
    stmt(ctx.env.DB, "UPDATE parent_consents SET status = 'revoked' WHERE user_id = ? AND purpose = 'approval' AND status = 'granted'", row.user_id),
    stmt(ctx.env.DB, "UPDATE users SET status = 'blocked' WHERE id = ?", row.user_id),
    stmt(ctx.env.DB, 'DELETE FROM sessions WHERE user_id = ?', row.user_id),
    auditStmt(ctx.env.DB, null, 'consent.revoked', row.user_id, { consentId: row.id }, ctx.now),
  ]);
  return json({ ok: true });
}

// ---- Beheer ----

function requireAdmin(ctx: Ctx) {
  const user = ctx.user;
  if (!user) throw new ApiError(401, 'unauthorized', 'Log eerst in.');
  if (user.role !== 'platform_admin') throw new ApiError(404, 'not_found', 'Niet gevonden.');
  return user;
}

/** GET /api/admin/consents — overzicht van wachtende/afgehandelde toestemmingen. */
export async function adminListConsents(ctx: Ctx): Promise<Response> {
  requireAdmin(ctx);
  const rows = await many(ctx.env.DB,
    `SELECT pc.id, pc.user_id, pc.parent_email, pc.status, pc.purpose, pc.created_at, pc.decided_at, u.username, u.status AS account_status
     FROM parent_consents pc LEFT JOIN users u ON u.id = pc.user_id WHERE pc.purpose = 'approval' ORDER BY pc.created_at DESC LIMIT 200`);
  return json({ consents: rows });
}

/** POST /api/admin/consents/:userId/link — verse goedkeuringslink (operator-hulp als de ouder de mail mist; ook testhaak). */
export async function adminApprovalLink(ctx: Ctx): Promise<Response> {
  requireAdmin(ctx);
  const userId = ctx.params.userId as string;
  const row = await one<ConsentRow>(ctx.env.DB,
    "SELECT id, parent_email, status, email_sends FROM parent_consents WHERE user_id = ? AND purpose = 'approval' ORDER BY created_at DESC LIMIT 1", userId);
  if (!row || row.status !== 'pending') throw new ApiError(404, 'not_found', 'Geen openstaand verzoek.');
  const token = randomToken(32);
  await run(ctx.env.DB, 'UPDATE parent_consents SET token_hash = ?, expires_at = ? WHERE id = ?', await sha256Hex(token), ctx.now + TOKEN_TTL_MS, row.id);
  return json({ url: approvalUrl(ctx, token) });
}

/** POST /api/admin/users/:userId/block — account blokkeren; sessies ongeldig. */
export async function adminBlockUser(ctx: Ctx): Promise<Response> {
  const admin = requireAdmin(ctx);
  const userId = ctx.params.userId as string;
  if (userId === admin.id) throw new ApiError(400, 'bad_request', 'Je kunt jezelf niet blokkeren.');
  await ctx.env.DB.batch([
    stmt(ctx.env.DB, "UPDATE users SET status = 'blocked' WHERE id = ?", userId),
    stmt(ctx.env.DB, 'DELETE FROM sessions WHERE user_id = ?', userId),
    auditStmt(ctx.env.DB, admin.id, 'admin.block_user', userId, {}, ctx.now),
  ]);
  return json({ ok: true, status: 'blocked' });
}
