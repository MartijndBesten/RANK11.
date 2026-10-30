/**
 * Ouderlijke toestemming voor spelers onder 16 — één centraal systeem voor drie routes:
 *  1. E-mail: ouder krijgt een link en keurt op het eigen apparaat goed (standaard).
 *  2. Ouder/beheerder: een ingelogde ouder/voogd keurt het eigen kind goed met de KOPPELCODE die het
 *     kind toont (aantoonbare koppeling; geen blanco knop om willekeurige kinderen goed te keuren).
 *  3. QR: het kind toont een QR met dezelfde koppelcode; de ouder scant met het eigen apparaat.
 * Statusvocabulaire: pending | approved | rejected | revoked | expired. De gebruikte verificatiemethode en
 * (indien ingelogd) de ouder/voogd worden vastgelegd. Tokens/koppelcodes zijn eenmalig, verlopen na 48 u en
 * worden alleen als hash bewaard. Goedkeuren is altijd een bewuste POST. Geen tokens of geheimen in logs.
 */
import { newId, randomToken, sha256Hex } from '../crypto.ts';
import { auditStmt, many, one, run, stmt } from '../db.ts';
import type { Env } from '../env.ts';
import { ApiError, json, readJson, type Ctx, type User } from '../http.ts';
import { starterStatements } from './collection.ts';
import { buildConsentEmail, buildRevokeEmail, sendEmail, type SendResult } from './email.ts';

export const CONSENT_INFO_VERSION = '2026.10-2';
const TOKEN_TTL_MS = 48 * 3600_000;
const RESEND_MIN_INTERVAL_MS = 2 * 60_000;
const RESEND_MAX = 5;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isValidEmail = (e: unknown): e is string => typeof e === 'string' && e.length <= 254 && EMAIL_RE.test(e);

// Koppelcode: korte, goed leesbare code (zonder makkelijk te verwarren tekens) die het kind toont.
const CLAIM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newClaimCode(): string {
  let out = '';
  for (const b of crypto.getRandomValues(new Uint8Array(8))) out += CLAIM_ALPHABET[b % CLAIM_ALPHABET.length];
  return out;
}
const normalizeClaim = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, '');
const hashClaim = (c: string) => sha256Hex(`claim:${normalizeClaim(c)}`);

const baseUrl = (ctx: Ctx) => (ctx.env.PUBLIC_BASE_URL || new URL(ctx.req.url).origin).replace(/\/$/, '');
const approvalUrl = (ctx: Ctx, token: string) => `${baseUrl(ctx)}/ouder/toestemming?token=${token}`;
const claimUrl = (ctx: Ctx, code: string) => `${baseUrl(ctx)}/ouder/toestemming?claim=${code}`;
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

const PENDING_RETENTION_MS = 7 * 24 * 3600_000;

/** Opruimen van niet-goedgekeurde accounts (dataminimalisatie). Markeert verlopen verzoeken en verwijdert
 * oude wachtende accounts (die hebben geen spelgegevens, dus cascade is veilig). Begrensd, opportunistisch. */
export async function cleanupExpiredPending(env: Env, now: number): Promise<void> {
  await run(env.DB, "UPDATE parent_consents SET status = 'expired', token_hash = NULL, claim_code_hash = NULL WHERE status = 'pending' AND expires_at <= ?", now);
  const stale = await many<{ id: string }>(env.DB,
    "SELECT id FROM users WHERE status = 'pending_parent_approval' AND created_at < ? LIMIT 20", now - PENDING_RETENTION_MS);
  if (stale.length) await env.DB.batch(stale.map((u) => env.DB.prepare('DELETE FROM users WHERE id = ?').bind(u.id)));
}

/** Maakt een toestemmingsverzoek aan (e-mailtoken + koppelcode) en verstuurt de e-mail (indien provider). */
export async function startParentConsent(ctx: Ctx, userId: string, username: string, parentEmail: string): Promise<{ consentId: string; send: SendResult; claimCode: string }> {
  const token = randomToken(32);
  const claimCode = newClaimCode();
  const id = newId('pc');
  const now = ctx.now;
  await run(ctx.env.DB,
    `INSERT INTO parent_consents (id, user_id, parent_email, token_hash, claim_code_hash, purpose, status, info_version, email_sends, last_sent_at, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, 'approval', 'pending', ?, 1, ?, ?, ?)`,
    id, userId, parentEmail, await sha256Hex(token), await hashClaim(claimCode), CONSENT_INFO_VERSION, now, now + TOKEN_TTL_MS, now);
  const mail = buildConsentEmail(username, approvalUrl(ctx, token), privacyUrl(ctx));
  const send = await sendEmail(ctx.env, { to: parentEmail, subject: mail.subject, html: mail.html, text: mail.text });
  return { consentId: id, send, claimCode };
}

interface ConsentRow { id: string; user_id: string; parent_email: string; status: string; info_version: string; email_sends: number; last_sent_at: number | null; expires_at: number }
const CONSENT_COLS = 'id, user_id, parent_email, status, info_version, email_sends, last_sent_at, expires_at';

/** GET /api/consent/status — de ingelogde (wachtende) speler ziet de status + eigen koppelcode (voor QR/beheerder). */
export async function consentStatus(ctx: Ctx): Promise<Response> {
  const user = ctx.user;
  if (!user) throw new ApiError(401, 'unauthorized', 'Log eerst in.');
  const row = await one<{ status: string; parent_email: string; claim_code_hash: string | null }>(ctx.env.DB,
    "SELECT status, parent_email, claim_code_hash FROM parent_consents WHERE user_id = ? AND purpose = 'approval' ORDER BY created_at DESC LIMIT 1", user.id);
  const mask = (e: string) => e.replace(/^(.).*(@.*)$/, (_, a, b) => `${a}•••${b}`);
  // De koppelcode staat alleen in het geheugen bij aanmaken; na herladen tonen we hem niet opnieuw (alleen hash bewaard).
  return json({ accountStatus: user.status ?? 'active', consent: row ? { status: row.status, parentEmailMasked: mask(row.parent_email) } : null });
}

/** POST /api/consent/resend — stuurt de toestemmingsmail opnieuw en geeft een verse koppelcode (begrensd). */
export async function resendConsent(ctx: Ctx): Promise<Response> {
  const user = ctx.user;
  if (!user) throw new ApiError(401, 'unauthorized', 'Log eerst in.');
  if (user.status !== 'pending_parent_approval') throw new ApiError(409, 'not_pending', 'Er staat geen toestemming open.');
  const row = await one<ConsentRow>(ctx.env.DB, `SELECT ${CONSENT_COLS} FROM parent_consents WHERE user_id = ? AND purpose = 'approval' ORDER BY created_at DESC LIMIT 1`, user.id);
  if (!row || row.status !== 'pending') throw new ApiError(409, 'not_pending', 'Er staat geen toestemming open.');
  if (row.email_sends >= RESEND_MAX) throw new ApiError(429, 'rate_limited', 'Te vaak opnieuw verstuurd. Probeer het later.');
  if (row.last_sent_at && ctx.now - row.last_sent_at < RESEND_MIN_INTERVAL_MS) throw new ApiError(429, 'rate_limited', 'Net al verstuurd. Wacht even.');
  const token = randomToken(32);
  const claimCode = newClaimCode();
  await run(ctx.env.DB, 'UPDATE parent_consents SET token_hash = ?, claim_code_hash = ?, expires_at = ?, email_sends = email_sends + 1, last_sent_at = ? WHERE id = ?',
    await sha256Hex(token), await hashClaim(claimCode), ctx.now + TOKEN_TTL_MS, ctx.now, row.id);
  const mail = buildConsentEmail(user.username, approvalUrl(ctx, token), privacyUrl(ctx));
  const send = await sendEmail(ctx.env, { to: row.parent_email, subject: mail.subject, html: mail.html, text: mail.text });
  return json({ ok: true, emailSent: send.sent, claimCode, claimUrl: claimUrl(ctx, claimCode) });
}

/** POST /api/consent/claim-code — verse koppelcode voor QR/beheerder, ZONDER e-mail.
 * Zo kan het wachtende kind de QR/koppelcode opnieuw tonen (bijv. na herladen) zonder mails te stoken.
 * Vereist een geldige wachtende sessie; roteren is goedkoop en ongevaarlijk, dus geen aparte begrenzing.
 * De e-mailteller (last_sent_at) wordt bewust niet aangeraakt. */
export async function rotateClaimCode(ctx: Ctx): Promise<Response> {
  const user = ctx.user;
  if (!user) throw new ApiError(401, 'unauthorized', 'Log eerst in.');
  if (user.status !== 'pending_parent_approval') throw new ApiError(409, 'not_pending', 'Er staat geen toestemming open.');
  const row = await one<ConsentRow>(ctx.env.DB, `SELECT ${CONSENT_COLS} FROM parent_consents WHERE user_id = ? AND purpose = 'approval' ORDER BY created_at DESC LIMIT 1`, user.id);
  if (!row || row.status !== 'pending') throw new ApiError(409, 'not_pending', 'Er staat geen toestemming open.');
  const claimCode = newClaimCode();
  await run(ctx.env.DB, 'UPDATE parent_consents SET claim_code_hash = ?, expires_at = ? WHERE id = ?',
    await hashClaim(claimCode), Math.max(row.expires_at, ctx.now + TOKEN_TTL_MS), row.id);
  return json({ ok: true, claimCode, claimUrl: claimUrl(ctx, claimCode) });
}

/** Zoekt een openstaand goedkeuringsverzoek op via de e-mailtoken of de koppelcode. */
async function lookupApproval(ctx: Ctx, by: { token?: unknown; claim?: unknown }): Promise<ConsentRow | null> {
  let hash: string | null = null;
  let field = 'token_hash';
  if (typeof by.token === 'string' && by.token.length >= 10 && by.token.length <= 200) hash = await sha256Hex(by.token);
  else if (typeof by.claim === 'string' && by.claim.length >= 4 && by.claim.length <= 40) { hash = await hashClaim(by.claim); field = 'claim_code_hash'; }
  if (!hash) return null;
  const row = await one<ConsentRow>(ctx.env.DB,
    `SELECT ${CONSENT_COLS} FROM parent_consents WHERE ${field} = ? AND purpose = 'approval' AND status = 'pending'`, hash);
  if (!row || row.expires_at <= ctx.now) return null;
  return row;
}

/** Past een beslissing toe (goedkeuren of afwijzen) en legt methode + ouder/voogd vast. Eenmalig. */
async function applyDecision(ctx: Ctx, row: ConsentRow, decision: 'approve' | 'decline', method: 'email' | 'admin' | 'qr', guardianId: string | null): Promise<Response> {
  const u = await one<{ username: string }>(ctx.env.DB, 'SELECT username FROM users WHERE id = ?', row.user_id);
  if (!u) throw new ApiError(400, 'invalid_token', 'Dit verzoek is ongeldig of verlopen.');
  if (decision === 'approve') {
    const stmts = [
      stmt(ctx.env.DB, "UPDATE parent_consents SET status = 'approved', token_hash = NULL, claim_code_hash = NULL, method = ?, guardian_user_id = ?, decided_at = ?, decided_ip = ? WHERE id = ?", method, guardianId, ctx.now, ctx.ip, row.id),
      stmt(ctx.env.DB, "UPDATE users SET status = 'active' WHERE id = ?", row.user_id),
      auditStmt(ctx.env.DB, guardianId, 'consent.approved', row.user_id, { consentId: row.id, method, version: row.info_version }, ctx.now),
    ];
    const hasClub = await one(ctx.env.DB, 'SELECT 1 AS x FROM clubs WHERE user_id = ?', row.user_id);
    if (!hasClub) stmts.push(...onboardingStatements(ctx.env.DB, row.user_id, u.username, ctx.now));
    await ctx.env.DB.batch(stmts);
    return json({ ok: true, decision: 'approve', username: u.username });
  }
  await ctx.env.DB.batch([
    stmt(ctx.env.DB, "UPDATE parent_consents SET status = 'rejected', token_hash = NULL, claim_code_hash = NULL, method = ?, guardian_user_id = ?, decided_at = ?, decided_ip = ? WHERE id = ?", method, guardianId, ctx.now, ctx.ip, row.id),
    stmt(ctx.env.DB, "UPDATE users SET status = 'blocked' WHERE id = ?", row.user_id),
    stmt(ctx.env.DB, 'DELETE FROM sessions WHERE user_id = ?', row.user_id),
    auditStmt(ctx.env.DB, guardianId, 'consent.rejected', row.user_id, { consentId: row.id, method }, ctx.now),
  ]);
  return json({ ok: true, decision: 'decline', username: u.username });
}

/** POST /api/consent/decide — e-mailtoken of QR-koppelcode (geen login). Ouder bevestigt bewust. */
export async function decideConsent(ctx: Ctx): Promise<Response> {
  const body = await readJson(ctx.req);
  const decision = body.decision === 'approve' ? 'approve' : body.decision === 'decline' ? 'decline' : null;
  if (!decision) throw new ApiError(400, 'bad_request', 'Onbekende keuze.');
  if (decision === 'approve' && body.guardianConfirmed !== true) throw new ApiError(400, 'confirm_required', 'Bevestig dat je de ouder of wettelijk vertegenwoordiger bent.');
  const viaToken = typeof body.token === 'string';
  const row = await lookupApproval(ctx, { token: body.token, claim: body.claimCode });
  if (!row) throw new ApiError(400, 'invalid_token', 'Deze link of code is ongeldig of verlopen.');
  return applyDecision(ctx, row, decision, viaToken ? 'email' : 'qr', null);
}

/** POST /api/admin/consents/approve — een ingelogde ouder/voogd keurt het eigen kind goed met de koppelcode.
 * Geen blanco knop: zonder de door het kind getoonde koppelcode lukt het niet. Legt de voogd vast. */
export async function adminApproveByCode(ctx: Ctx): Promise<Response> {
  const admin = requireAdmin(ctx);
  const body = await readJson(ctx.req);
  const decision = body.decision === 'decline' ? 'decline' : 'approve';
  if (decision === 'approve' && body.guardianConfirmed !== true) throw new ApiError(400, 'confirm_required', 'Bevestig dat je de ouder of wettelijk vertegenwoordiger van dit kind bent.');
  const row = await lookupApproval(ctx, { claim: body.claimCode });
  if (!row) throw new ApiError(400, 'invalid_code', 'Onbekende of verlopen koppelcode.');
  return applyDecision(ctx, row, decision, 'admin', admin.id);
}

/** POST /api/consent/request-revoke — ouder vraagt per e-mail een intreklink aan. */
export async function requestRevoke(ctx: Ctx): Promise<Response> {
  const body = await readJson(ctx.req);
  const email = isValidEmail(body.parentEmail) ? body.parentEmail : null;
  const neutral = json({ ok: true });
  if (!email) return neutral;
  const approved = await one<{ user_id: string }>(ctx.env.DB,
    "SELECT user_id FROM parent_consents WHERE parent_email = ? AND status = 'approved' ORDER BY created_at DESC LIMIT 1", email);
  if (!approved) return neutral;
  const recent = await one<{ n: number }>(ctx.env.DB,
    "SELECT COUNT(*) AS n FROM parent_consents WHERE parent_email = ? AND purpose = 'revoke' AND created_at > ?", email, ctx.now - 3600_000);
  if (recent && recent.n >= 3) return neutral;
  const token = randomToken(32);
  await run(ctx.env.DB,
    `INSERT INTO parent_consents (id, user_id, parent_email, token_hash, purpose, status, info_version, email_sends, last_sent_at, expires_at, created_at)
     VALUES (?, ?, ?, ?, 'revoke', 'pending', ?, 1, ?, ?, ?)`,
    newId('pc'), approved.user_id, email, await sha256Hex(token), CONSENT_INFO_VERSION, ctx.now, ctx.now + TOKEN_TTL_MS, ctx.now);
  const mail = buildRevokeEmail(revokeUrl(ctx, token));
  await sendEmail(ctx.env, { to: email, subject: mail.subject, html: mail.html, text: mail.text });
  return neutral;
}

/** POST /api/consent/revoke — ouder trekt toestemming in; account geblokkeerd, sessies ongeldig. */
export async function revokeConsent(ctx: Ctx): Promise<Response> {
  const body = await readJson(ctx.req);
  const row = await (async () => {
    if (typeof body.token !== 'string' || body.token.length < 10 || body.token.length > 200) return null;
    const r = await one<ConsentRow>(ctx.env.DB, `SELECT ${CONSENT_COLS} FROM parent_consents WHERE token_hash = ? AND purpose = 'revoke' AND status = 'pending'`, await sha256Hex(body.token));
    return r && r.expires_at > ctx.now ? r : null;
  })();
  if (!row) throw new ApiError(400, 'invalid_token', 'Deze link is ongeldig of verlopen.');
  await ctx.env.DB.batch([
    stmt(ctx.env.DB, "UPDATE parent_consents SET status = 'revoked', token_hash = NULL, decided_at = ?, decided_ip = ? WHERE id = ?", ctx.now, ctx.ip, row.id),
    stmt(ctx.env.DB, "UPDATE parent_consents SET status = 'revoked' WHERE user_id = ? AND purpose = 'approval' AND status = 'approved'", row.user_id),
    stmt(ctx.env.DB, "UPDATE users SET status = 'blocked' WHERE id = ?", row.user_id),
    stmt(ctx.env.DB, 'DELETE FROM sessions WHERE user_id = ?', row.user_id),
    auditStmt(ctx.env.DB, null, 'consent.revoked', row.user_id, { consentId: row.id }, ctx.now),
  ]);
  return json({ ok: true });
}

// ---- Beheer ----

function requireAdmin(ctx: Ctx): User {
  const user = ctx.user;
  if (!user) throw new ApiError(401, 'unauthorized', 'Log eerst in.');
  if (user.role !== 'platform_admin') throw new ApiError(404, 'not_found', 'Niet gevonden.');
  return user;
}

/** GET /api/admin/consents — overzicht van toestemmingen (status, datum, methode, voogd). Geen codes. */
export async function adminListConsents(ctx: Ctx): Promise<Response> {
  requireAdmin(ctx);
  const rows = await many(ctx.env.DB,
    `SELECT pc.id, pc.user_id, pc.status, pc.method, pc.created_at, pc.decided_at, pc.guardian_user_id,
            u.username, u.status AS account_status, g.username AS guardian_username
     FROM parent_consents pc LEFT JOIN users u ON u.id = pc.user_id LEFT JOIN users g ON g.id = pc.guardian_user_id
     WHERE pc.purpose = 'approval' ORDER BY pc.created_at DESC LIMIT 200`);
  return json({ consents: rows });
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
