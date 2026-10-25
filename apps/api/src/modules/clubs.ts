/** Club per account: naam, afkorting en embleem als JSON-parameters (geen afbeeldingen). */
import { requireUser } from '../auth.ts';
import { one, run } from '../db.ts';
import { badRequest, json, notFound, readJson, str, type Ctx } from '../http.ts';

const SHAPES = ['shield', 'round', 'hex', 'diamond', 'classic'];
const SYMBOLS = ['star', 'lion', 'ball', 'crown', 'bolt', 'tower', 'wing', 'anchor', 'none'];
const PATTERNS = ['plain', 'stripes', 'halves', 'sash', 'chevron', 'quarters'];
const HEX = /^#[0-9a-fA-F]{6}$/;

export interface Crest { shape: string; symbol: string; pattern: string; primary: string; secondary: string; accent: string }

export function validateCrest(input: unknown): Crest {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw badRequest('Embleem moet een object zijn.');
  const c = input as Record<string, unknown>;
  const allowed = ['shape', 'symbol', 'pattern', 'primary', 'secondary', 'accent'];
  const extra = Object.keys(c).filter((k) => !allowed.includes(k));
  if (extra.length) throw badRequest(`Onbekende embleemvelden: ${extra.join(', ')}.`);
  const pick = (key: string, list: string[]) => {
    const v = c[key];
    if (typeof v !== 'string' || !list.includes(v)) throw badRequest(`Embleem: ongeldige waarde voor ${key}.`);
    return v;
  };
  const color = (key: string) => {
    const v = c[key];
    if (typeof v !== 'string' || !HEX.test(v)) throw badRequest(`Embleem: ${key} moet een kleur als #RRGGBB zijn.`);
    return v.toLowerCase();
  };
  return { shape: pick('shape', SHAPES), symbol: pick('symbol', SYMBOLS), pattern: pick('pattern', PATTERNS), primary: color('primary'), secondary: color('secondary'), accent: color('accent') };
}

interface ClubRow { name: string; short: string; crest_json: string; updated_at: number }
const view = (r: ClubRow) => ({ name: r.name, short: r.short, crest: JSON.parse(r.crest_json) as Crest, updatedAt: r.updated_at });

export async function getClub(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const row = await one<ClubRow>(ctx.env.DB, 'SELECT name, short, crest_json, updated_at FROM clubs WHERE user_id = ?', user.id);
  if (!row) throw notFound();
  return json({ club: view(row) });
}

export async function putClub(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const body = await readJson(ctx.req);
  const name = str(body, 'name', { min: 2, max: 30 });
  const short = str(body, 'short', { min: 2, max: 4 }).toUpperCase();
  if (!/^[A-Z0-9]+$/.test(short)) throw badRequest('Afkorting mag alleen letters en cijfers bevatten.');
  const crest = validateCrest(body.crest);
  await run(ctx.env.DB,
    `INSERT INTO clubs (user_id, name, short, crest_json, updated_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET name = excluded.name, short = excluded.short, crest_json = excluded.crest_json, updated_at = excluded.updated_at`,
    user.id, name, short, JSON.stringify(crest), ctx.now);
  return json({ club: { name, short, crest, updatedAt: ctx.now } });
}
