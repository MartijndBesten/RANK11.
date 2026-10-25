/**
 * Idempotentiesleutels (header `Idempotency-Key`) op muterende endpoints.
 * - Zelfde sleutel + zelfde verzoek → het opgeslagen antwoord (header `Idempotent-Replay: true`).
 * - Zelfde sleutel + ander verzoek → 422.
 * - Verzoek met deze sleutel nog bezig → 409.
 * Alleen geslaagde antwoorden (2xx) worden bewaard; bij een fout vervalt de sleutel, zodat
 * opnieuw proberen kan. De onderliggende operaties zijn daarnaast zelf beschermd met unieke sleutels.
 */
import { sha256Hex } from './crypto.ts';
import { one, run } from './db.ts';
import { ApiError, badRequest, type Ctx, type Handler } from './http.ts';

const KEY_PATTERN = /^[A-Za-z0-9_:.-]{8,100}$/;

export function idempotent(handler: Handler, options: { required: boolean }): Handler {
  return async (ctx: Ctx) => {
    const key = ctx.req.headers.get('Idempotency-Key');
    if (!key) {
      if (options.required) throw badRequest('Header Idempotency-Key ontbreekt (8–100 tekens).');
      return handler(ctx);
    }
    if (!KEY_PATTERN.test(key)) throw badRequest('Ongeldige Idempotency-Key (8–100 tekens: letters, cijfers, _ : . -).');
    if (!ctx.user) throw new ApiError(401, 'unauthorized', 'Log eerst in.');
    const userId = ctx.user.id;
    const bodyText = await ctx.req.clone().text();
    const requestHash = await sha256Hex(`${ctx.req.method} ${ctx.url.pathname}\n${bodyText}`);
    const db = ctx.env.DB;

    const replay = async (): Promise<Response | null> => {
      const row = await one<{ request_hash: string; state: string; response_status: number | null; response_body: string | null }>(db,
        'SELECT request_hash, state, response_status, response_body FROM idempotency_keys WHERE user_id = ? AND key = ?', userId, key);
      if (!row) return null;
      if (row.request_hash !== requestHash) throw new ApiError(422, 'idempotency_mismatch', 'Deze Idempotency-Key is al gebruikt voor een ander verzoek.');
      if (row.state !== 'done') throw new ApiError(409, 'idempotency_in_progress', 'Dit verzoek wordt al verwerkt.');
      return new Response(row.response_body, {
        status: row.response_status ?? 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Idempotent-Replay': 'true' },
      });
    };

    const existing = await replay();
    if (existing) return existing;
    const inserted = await run(db,
      `INSERT INTO idempotency_keys (user_id, key, request_hash, state, created_at) VALUES (?, ?, ?, 'pending', ?)
       ON CONFLICT(user_id, key) DO NOTHING`, userId, key, requestHash, ctx.now);
    if (inserted === 0) {
      const again = await replay();
      if (again) return again;
      throw new ApiError(409, 'idempotency_in_progress', 'Dit verzoek wordt al verwerkt.');
    }

    let res: Response;
    try {
      res = await handler(ctx);
    } catch (err) {
      await run(db, 'DELETE FROM idempotency_keys WHERE user_id = ? AND key = ?', userId, key);
      throw err;
    }
    if (res.status >= 200 && res.status < 300) {
      const body = await res.clone().text();
      await run(db, `UPDATE idempotency_keys SET state = 'done', response_status = ?, response_body = ? WHERE user_id = ? AND key = ?`,
        res.status, body, userId, key);
    } else {
      await run(db, 'DELETE FROM idempotency_keys WHERE user_id = ? AND key = ?', userId, key);
    }
    return res;
  };
}
