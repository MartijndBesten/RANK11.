/**
 * Feedback van testgebruikers: "werkt niet", "onduidelijk" of "idee". Minimale gegevens: de melding,
 * de soort, de koppeling naar het account en een korte context (bijv. het scherm). Een beheerder leest
 * en handelt de meldingen af. Geen extra persoonsgegevens.
 */
import { newId } from '../crypto.ts';
import { many, run } from '../db.ts';
import { requireUser } from '../auth.ts';
import { ApiError, json, readJson, type Ctx, type User } from '../http.ts';

const KINDS = new Set(['werkt-niet', 'onduidelijk', 'idee']);
const STATUSES = new Set(['nieuw', 'bekeken', 'afgehandeld']);

export async function createFeedback(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const body = await readJson(ctx.req);
  const kind = typeof body.kind === 'string' && KINDS.has(body.kind) ? body.kind : null;
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 1000) : '';
  if (!kind) throw new ApiError(400, 'bad_request', 'Kies een soort melding.');
  if (message.length < 2) throw new ApiError(400, 'bad_request', 'Schrijf een korte melding.');
  const context = typeof body.context === 'string' ? body.context.slice(0, 120) : null;
  const id = newId('fb');
  await run(ctx.env.DB, 'INSERT INTO feedback (id, user_id, kind, message, status, context, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    id, user.id, kind, message, 'nieuw', context, ctx.now);
  return json({ id, ok: true }, 201);
}

function requireAdmin(ctx: Ctx): User {
  const user = requireUser(ctx);
  if (user.role !== 'platform_admin') throw new ApiError(404, 'not_found', 'Niet gevonden.');
  return user;
}

export async function adminListFeedback(ctx: Ctx): Promise<Response> {
  requireAdmin(ctx);
  const rows = await many(ctx.env.DB,
    `SELECT f.id, f.kind, f.message, f.status, f.context, f.created_at, u.username
     FROM feedback f LEFT JOIN users u ON u.id = f.user_id ORDER BY f.created_at DESC LIMIT 200`);
  return json({ feedback: rows });
}

export async function adminUpdateFeedback(ctx: Ctx): Promise<Response> {
  requireAdmin(ctx);
  const body = await readJson(ctx.req);
  const status = typeof body.status === 'string' && STATUSES.has(body.status) ? body.status : null;
  if (!status) throw new ApiError(400, 'bad_request', 'Onbekende status.');
  await run(ctx.env.DB, 'UPDATE feedback SET status = ? WHERE id = ?', status, ctx.params.id as string);
  return json({ id: ctx.params.id, status });
}
