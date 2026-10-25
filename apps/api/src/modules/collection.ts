/**
 * Collectie (kaartinstanties), elftal, grootboek (wallet) en packs.
 * Server-authoritative: de server trekt de seed (crypto), roept de engine aan en schrijft resultaat,
 * seed en catalogusversie in één batch (= één transactie in D1).
 */
import { requireUser } from '../auth.ts';
import { newId, randomSeed } from '../crypto.ts';
import { auditStmt, isConstraintError, many, one, stmt } from '../db.ts';
import { createRng, oddsTable, openPack, PACKS } from '../engine.ts';
import { CATALOG_VERSION, cardDef, cardView, getCatalog, starterSquad } from '../game.ts';
import { badRequest, conflict, json, notFound, readJson, str, type Ctx } from '../http.ts';

export const LINEUP_SIZE = 11;

interface CardRow { id: string; card_def_id: string; acquired_via: string; acquired_at: number }

export async function userCards(db: D1Database, userId: string): Promise<CardRow[]> {
  return many<CardRow>(db, 'SELECT id, card_def_id, acquired_via, acquired_at FROM card_instances WHERE user_id = ? ORDER BY acquired_at, id', userId);
}

function viewCard(row: CardRow) {
  const def = cardDef(row.card_def_id);
  if (!def) return { id: row.id, cardDefId: row.card_def_id, missing: true };
  return { ...cardView(row.id, def), acquiredVia: row.acquired_via, acquiredAt: row.acquired_at };
}

export async function getCollection(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const rows = await userCards(ctx.env.DB, user.id);
  return json({ catalogVersion: CATALOG_VERSION, cards: rows.map(viewCard) });
}

export async function claimStarter(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const db = ctx.env.DB;
  if (await one(db, 'SELECT 1 AS x FROM starter_grants WHERE user_id = ?', user.id)) throw conflict('already_claimed', 'Je startelftal is al uitgereikt.');
  const seed = randomSeed();
  const squad = starterSquad(seed);
  const instances = squad.map((def) => ({ id: newId('card'), def }));
  try {
    await db.batch([
      stmt(db, 'INSERT INTO starter_grants (user_id, seed, catalog_version, created_at) VALUES (?, ?, ?, ?)', user.id, seed, CATALOG_VERSION, ctx.now),
      ...instances.map((c) => stmt(db,
        `INSERT INTO card_instances (id, user_id, card_def_id, catalog_version, acquired_via, source_ref, acquired_at) VALUES (?, ?, ?, ?, 'starter', ?, ?)`,
        c.id, user.id, c.def.id, CATALOG_VERSION, `starter:${user.id}`, ctx.now)),
      stmt(db, `INSERT INTO lineups (user_id, card_ids_json, updated_at) VALUES (?, ?, ?)
                ON CONFLICT(user_id) DO UPDATE SET card_ids_json = excluded.card_ids_json, updated_at = excluded.updated_at`,
        user.id, JSON.stringify(instances.map((c) => c.id)), ctx.now),
      auditStmt(db, user.id, 'collection.starter', user.id, { seed, catalogVersion: CATALOG_VERSION, cards: squad.map((p) => p.id) }, ctx.now),
    ]);
  } catch (err) {
    if (isConstraintError(err)) throw conflict('already_claimed', 'Je startelftal is al uitgereikt.');
    throw err;
  }
  return json({ seed, cards: instances.map((c) => cardView(c.id, c.def)), lineup: instances.map((c) => c.id) }, 201);
}

export async function getLineup(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const row = await one<{ card_ids_json: string; updated_at: number }>(ctx.env.DB, 'SELECT card_ids_json, updated_at FROM lineups WHERE user_id = ?', user.id);
  if (!row) throw notFound();
  return json({ cardIds: JSON.parse(row.card_ids_json) as string[], updatedAt: row.updated_at });
}

export async function putLineup(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const body = await readJson(ctx.req);
  const ids = body.cardIds;
  if (!Array.isArray(ids) || ids.length !== LINEUP_SIZE || ids.some((i) => typeof i !== 'string')) {
    throw badRequest(`Een elftal bestaat uit precies ${LINEUP_SIZE} kaarten.`);
  }
  if (new Set(ids).size !== ids.length) throw badRequest('Een kaart kan maar één keer in het elftal staan.');
  const owned = new Set((await userCards(ctx.env.DB, user.id)).map((c) => c.id));
  if (ids.some((id) => !owned.has(id as string))) throw badRequest('Je kunt alleen eigen kaarten opstellen.');
  await ctx.env.DB.prepare(`INSERT INTO lineups (user_id, card_ids_json, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET card_ids_json = excluded.card_ids_json, updated_at = excluded.updated_at`)
    .bind(user.id, JSON.stringify(ids), ctx.now).run();
  return json({ cardIds: ids, updatedAt: ctx.now });
}

// --- Wallet (grootboek) -----------------------------------------------------------------

export async function balances(db: D1Database, userId: string): Promise<{ coins: number; xp: number; vouchers: number }> {
  const rows = await many<{ currency: 'coins' | 'xp' | 'vouchers'; total: number }>(db,
    'SELECT currency, COALESCE(SUM(delta), 0) AS total FROM wallet_ledger WHERE user_id = ? GROUP BY currency', userId);
  const out = { coins: 0, xp: 0, vouchers: 0 };
  for (const r of rows) out[r.currency] = Number(r.total);
  return out;
}

export async function getWallet(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const ledger = await many<{ id: string; currency: string; delta: number; reason: string; ref: string; created_at: number }>(ctx.env.DB,
    'SELECT id, currency, delta, reason, ref, created_at FROM wallet_ledger WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 100', user.id);
  return json({
    balances: await balances(ctx.env.DB, user.id),
    ledger: ledger.map((l) => ({ id: l.id, currency: l.currency, delta: l.delta, reason: l.reason, ref: l.ref, createdAt: l.created_at })),
  });
}

// --- Packs ------------------------------------------------------------------------------

export async function listPacks(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const unopened = await many<{ id: string; pack_id: string; source: string; created_at: number }>(ctx.env.DB,
    `SELECT g.id, g.pack_id, g.source, g.created_at FROM pack_grants g
     WHERE g.user_id = ? AND NOT EXISTS (SELECT 1 FROM pack_opens o WHERE o.grant_id = g.id) ORDER BY g.created_at`, user.id);
  const shop = Object.values(PACKS).filter((p) => p.coinPrice !== undefined).map((p) => ({
    id: p.id, name: p.name, tagline: p.tagline, coinPrice: p.coinPrice, odds: oddsTable(p),
  }));
  return json({ unopened: unopened.map((g) => ({ grantId: g.id, packId: g.pack_id, source: g.source, createdAt: g.created_at })), shop });
}

export async function buyPack(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const body = await readJson(ctx.req);
  const packId = str(body, 'packId', { max: 40 });
  const def = PACKS[packId];
  if (!def || def.coinPrice === undefined) throw notFound();
  const grantId = newId('pg');
  const db = ctx.env.DB;
  try {
    await db.batch([
      stmt(db, `INSERT INTO wallet_ledger (id, user_id, currency, delta, reason, ref, created_at) VALUES (?, ?, 'coins', ?, 'pack.buy', ?, ?)`,
        newId('led'), user.id, -def.coinPrice, `shop:${grantId}`, ctx.now),
      stmt(db, `INSERT INTO pack_grants (id, user_id, pack_id, source, source_ref, created_at) VALUES (?, ?, ?, 'shop', ?, ?)`, grantId, user.id, packId, grantId, ctx.now),
      auditStmt(db, user.id, 'pack.buy', grantId, { packId, price: def.coinPrice }, ctx.now),
    ]);
  } catch (err) {
    if (isConstraintError(err, 'insufficient_funds')) throw conflict('insufficient_funds', 'Je hebt niet genoeg coins.');
    throw err;
  }
  return json({ grantId, packId, price: def.coinPrice, balances: await balances(db, user.id) }, 201);
}

export async function openPackGrant(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const db = ctx.env.DB;
  const grant = await one<{ id: string; pack_id: string }>(db, 'SELECT id, pack_id FROM pack_grants WHERE id = ? AND user_id = ?', ctx.params.grantId, user.id);
  if (!grant) throw notFound();
  if (await one(db, 'SELECT 1 AS x FROM pack_opens WHERE grant_id = ?', grant.id)) throw conflict('already_opened', 'Deze pack is al geopend.');
  const def = PACKS[grant.pack_id];
  if (!def) throw notFound();
  const seed = randomSeed();
  const result = openPack(def, getCatalog(), createRng(seed));
  const openId = newId('po');
  const cards = result.pulls.map((p) => ({ id: newId('card'), def: p.card, slot: p.slot, bucketId: p.bucketId }));
  try {
    await db.batch([
      // UNIQUE(grant_id): een tweede opening breekt de hele batch af, dus nooit dubbele kaarten.
      stmt(db, 'INSERT INTO pack_opens (id, grant_id, user_id, pack_id, seed, catalog_version, results_json, opened_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        openId, grant.id, user.id, def.id, seed, CATALOG_VERSION, JSON.stringify(cards.map((c) => ({ instanceId: c.id, cardDefId: c.def.id, slot: c.slot, bucketId: c.bucketId }))), ctx.now),
      ...cards.map((c) => stmt(db,
        `INSERT INTO card_instances (id, user_id, card_def_id, catalog_version, acquired_via, source_ref, acquired_at) VALUES (?, ?, ?, ?, 'pack', ?, ?)`,
        c.id, user.id, c.def.id, CATALOG_VERSION, openId, ctx.now)),
      auditStmt(db, user.id, 'pack.open', openId, { grantId: grant.id, packId: def.id, seed, catalogVersion: CATALOG_VERSION }, ctx.now),
    ]);
  } catch (err) {
    if (isConstraintError(err)) throw conflict('already_opened', 'Deze pack is al geopend.');
    throw err;
  }
  return json({
    open: {
      id: openId, grantId: grant.id, packId: def.id, seed, catalogVersion: CATALOG_VERSION,
      cards: cards.map((c) => ({ ...cardView(c.id, c.def), slot: c.slot, bucketId: c.bucketId })),
      revealOrder: result.revealOrder.map((p) => cards.find((c) => c.def === p)?.id),
    },
  }, 201);
}
