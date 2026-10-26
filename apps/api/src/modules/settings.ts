/**
 * Speluitleg per gebruiker: aan/uit en welke uitleg al gezien is. Bewaard op de server, zodat het ook op
 * een ander toestel klopt. Alleen korte, vaste id's; geen vrije tekst.
 */
import { requireUser } from '../auth.ts';
import { one, run } from '../db.ts';
import { badRequest, json, readJson, type Ctx } from '../http.ts';

const TIP_ID = /^[a-z0-9-]{1,32}$/;
const MAX_SEEN = 40;

async function load(db: D1Database, userId: string) {
  const row = await one<{ tips: number; tips_seen: string }>(db, 'SELECT tips, tips_seen FROM user_settings WHERE user_id = ?', userId);
  return { tips: row ? row.tips === 1 : true, tipsSeen: row ? (JSON.parse(row.tips_seen) as string[]) : [] };
}

export async function getSettings(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  return json({ settings: await load(ctx.env.DB, user.id) });
}

/** Werkt `tips` en/of `tipsSeen` bij; `tipsSeen` vervangt de lijst (de app stuurt de volledige lijst). */
export async function putSettings(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const body = await readJson(ctx.req);
  const current = await load(ctx.env.DB, user.id);
  let { tips, tipsSeen } = current;
  if (body.tips !== undefined) {
    if (typeof body.tips !== 'boolean') throw badRequest('tips moet true of false zijn.');
    tips = body.tips;
  }
  if (body.tipsSeen !== undefined) {
    const list = body.tipsSeen;
    if (!Array.isArray(list) || list.length > MAX_SEEN || !list.every((x) => typeof x === 'string' && TIP_ID.test(x))) {
      throw badRequest(`tipsSeen moet een lijst van maximaal ${MAX_SEEN} korte id's zijn.`);
    }
    tipsSeen = [...new Set(list as string[])];
  }
  await run(ctx.env.DB,
    `INSERT INTO user_settings (user_id, tips, tips_seen, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET tips = excluded.tips, tips_seen = excluded.tips_seen, updated_at = excluded.updated_at`,
    user.id, tips ? 1 : 0, JSON.stringify(tipsSeen), ctx.now);
  return json({ settings: { tips, tipsSeen } });
}
