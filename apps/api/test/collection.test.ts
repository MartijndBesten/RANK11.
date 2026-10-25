import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRng, openPack, PACKS } from '../src/engine.ts';
import { getCatalog, starterSquad } from '../src/game.ts';
import { createApp, idem, platformCode, register, type TestApp, type TestUser } from './helpers.ts';

afterEach(() => { vi.useRealTimers(); });

const cardCount = (app: TestApp, user: TestUser) => (app.db.db.prepare('SELECT COUNT(*) AS n FROM card_instances WHERE user_id = ?').get(user.id) as { n: number }).n;
const coins = (app: TestApp, user: TestUser) => (app.db.db.prepare(`SELECT COALESCE(SUM(delta), 0) AS s FROM wallet_ledger WHERE user_id = ? AND currency = 'coins'`).get(user.id) as { s: number }).s;

async function earnCoins(app: TestApp, user: TestUser, grades: number) {
  for (let i = 0; i < grades; i++) {
    const r = await app.api('POST', '/api/grades', { token: user.token, idem: idem(), body: { subjectId: 'ak', testName: `Toets ${i}`, value: 7, weight: 1, date: '2026-10-20' } });
    expect(r.body.reward.coins).toBe(250);
  }
}

describe('startelftal, collectie en elftal', () => {
  it('startelftal: eenmalig, 11 kaarten, opgesteld, seed in de audit en reproduceerbaar', async () => {
    const app = createApp();
    const u = await register(app, 'Starter', await platformCode(app));
    const res = await app.api('POST', '/api/collection/starter', { token: u.token });
    expect(res.status).toBe(201);
    expect(res.body.cards).toHaveLength(11);
    expect(res.body.cards.every((c: { rarity: string }) => c.rarity === 'bronze' || c.rarity === 'silver')).toBe(true);
    expect(starterSquad(res.body.seed).map((p) => p.id)).toEqual(res.body.cards.map((c: { cardDefId: string }) => c.cardDefId));
    const audit = app.db.db.prepare(`SELECT detail_json FROM audit_log WHERE action = 'collection.starter'`).get() as { detail_json: string };
    expect(JSON.parse(audit.detail_json).seed).toBe(res.body.seed);
    expect((await app.api('POST', '/api/collection/starter', { token: u.token })).status).toBe(409);
    expect(cardCount(app, u)).toBe(11);
    const lineup = await app.api('GET', '/api/lineup', { token: u.token });
    expect(lineup.body.cardIds).toEqual(res.body.lineup);
    const col = await app.api('GET', '/api/collection', { token: u.token });
    expect(col.body.cards).toHaveLength(11);
  });

  it('elftal: precies 11 eigen, unieke kaarten', async () => {
    const app = createApp();
    const a = await register(app, 'Eigenaar', await platformCode(app));
    const b = await register(app, 'Ander', await platformCode(app));
    const mine = (await app.api('POST', '/api/collection/starter', { token: a.token })).body.lineup as string[];
    const theirs = (await app.api('POST', '/api/collection/starter', { token: b.token })).body.lineup as string[];
    expect((await app.api('PUT', '/api/lineup', { token: a.token, body: { cardIds: mine.slice(0, 10) } })).status).toBe(400);
    expect((await app.api('PUT', '/api/lineup', { token: a.token, body: { cardIds: [...mine.slice(0, 10), mine[0]] } })).status).toBe(400);
    expect((await app.api('PUT', '/api/lineup', { token: a.token, body: { cardIds: [...mine.slice(0, 10), theirs[0]] } })).status).toBe(400);
    expect((await app.api('PUT', '/api/lineup', { token: a.token, body: { cardIds: [...mine].reverse() } })).status).toBe(200);
  });

  it('club: naam, afkorting en embleem als JSON-parameters', async () => {
    const app = createApp();
    const u = await register(app, 'Clubbaas', await platformCode(app));
    expect((await app.api('GET', '/api/club', { token: u.token })).status).toBe(404);
    const crest = { shape: 'shield', symbol: 'lion', pattern: 'stripes', primary: '#0F2C6B', secondary: '#ffffff', accent: '#e8b33a' };
    const put = await app.api('PUT', '/api/club', { token: u.token, body: { name: 'FC Zuidwijk', short: 'fcz', crest } });
    expect(put.status).toBe(200);
    expect(put.body.club).toMatchObject({ name: 'FC Zuidwijk', short: 'FCZ', crest: { primary: '#0f2c6b' } });
    expect((await app.api('GET', '/api/club', { token: u.token })).body.club.name).toBe('FC Zuidwijk');
    expect((await app.api('PUT', '/api/club', { token: u.token, body: { name: 'X', short: 'FC', crest } })).status).toBe(400);
    expect((await app.api('PUT', '/api/club', { token: u.token, body: { name: 'FC Y', short: 'FC', crest: { ...crest, logoUrl: 'https://x' } } })).status).toBe(400);
    expect((await app.api('PUT', '/api/club', { token: u.token, body: { name: 'FC Y', short: 'FC', crest: { ...crest, primary: 'red' } } })).status).toBe(400);
  });
});

describe('wallet en packs', () => {
  it('geen negatief saldo: kopen zonder genoeg coins faalt; gelijktijdig kopen kan maar één keer', async () => {
    const app = createApp();
    const u = await register(app, 'Koper', await platformCode(app));
    const broke = await app.api('POST', '/api/packs/buy', { token: u.token, idem: idem(), body: { packId: 'starter' } });
    expect(broke.status).toBe(409);
    expect(broke.body.error.code).toBe('insufficient_funds');
    expect(coins(app, u)).toBe(0);
    expect((await app.api('POST', '/api/packs/buy', { token: u.token, idem: idem(), body: { packId: 'elite' } })).status).toBe(404); // niet te koop

    await earnCoins(app, u, 3); // 3 × 250 = 750 = prijs starterspack
    expect(coins(app, u)).toBe(750);
    const [x, y] = await Promise.all([
      app.api('POST', '/api/packs/buy', { token: u.token, idem: idem(), body: { packId: 'starter' } }),
      app.api('POST', '/api/packs/buy', { token: u.token, idem: idem(), body: { packId: 'starter' } }),
    ]);
    expect([x.status, y.status].sort()).toEqual([201, 409]);
    expect(coins(app, u)).toBe(0);
    const minimum = app.db.db.prepare(`SELECT MIN(running) AS m FROM (SELECT SUM(delta) OVER (ORDER BY created_at, rowid) AS running FROM wallet_ledger WHERE user_id = ? AND currency = 'coins')`).get(u.id) as { m: number };
    expect(minimum.m).toBeGreaterThanOrEqual(0);
    const wallet = await app.api('GET', '/api/wallet', { token: u.token });
    expect(wallet.body.balances.coins).toBe(0);
    expect(wallet.body.ledger.some((l: { reason: string; delta: number }) => l.reason === 'pack.buy' && l.delta === -750)).toBe(true);
    const list = await app.api('GET', '/api/packs', { token: u.token });
    expect(list.body.unopened.map((p: { packId: string }) => p.packId).sort()).toEqual(['gold', 'gold', 'gold', 'starter']);
    expect(list.body.shop.find((p: { id: string }) => p.id === 'gold').odds.length).toBeGreaterThan(0);
  });

  it('pack openen is idempotent: zelfde sleutel = zelfde resultaat, geen dubbele kaarten; seed reproduceert de opening', async () => {
    const app = createApp();
    const u = await register(app, 'Opener', await platformCode(app));
    await earnCoins(app, u, 1); // levert een goudpack op
    const grantId = (await app.api('GET', '/api/packs', { token: u.token })).body.unopened[0].grantId;
    const key = idem('open');
    const first = await app.api('POST', `/api/packs/${grantId}/open`, { token: u.token, idem: key });
    expect(first.status).toBe(201);
    expect(first.body.open.cards).toHaveLength(5);
    expect(cardCount(app, u)).toBe(5);
    const replay = await app.api('POST', `/api/packs/${grantId}/open`, { token: u.token, idem: key });
    expect(replay.status).toBe(201);
    expect(replay.headers.get('Idempotent-Replay')).toBe('true');
    expect(replay.body).toEqual(first.body);
    expect(cardCount(app, u)).toBe(5);
    const otherKey = await app.api('POST', `/api/packs/${grantId}/open`, { token: u.token, idem: idem('open') });
    expect(otherKey.status).toBe(409);
    expect(otherKey.body.error.code).toBe('already_opened');
    expect(cardCount(app, u)).toBe(5);
    expect((await app.api('POST', `/api/packs/${grantId}/open`, { token: u.token })).status).toBe(400); // sleutel verplicht

    const row = app.db.db.prepare('SELECT seed, pack_id, results_json FROM pack_opens WHERE grant_id = ?').get(grantId) as { seed: string; pack_id: string; results_json: string };
    expect(row.seed).toBe(first.body.open.seed);
    const again = openPack(PACKS[row.pack_id]!, getCatalog(), createRng(row.seed));
    expect(again.pulls.map((p) => p.card.id)).toEqual(first.body.open.cards.map((c: { cardDefId: string }) => c.cardDefId));
    const audit = app.db.db.prepare(`SELECT detail_json FROM audit_log WHERE action = 'pack.open'`).get() as { detail_json: string };
    expect(JSON.parse(audit.detail_json)).toMatchObject({ grantId, seed: row.seed });
  });

  it('gelijktijdig openen met verschillende sleutels: precies één opening; andermans pack: 404', async () => {
    const app = createApp();
    const u = await register(app, 'Snel', await platformCode(app));
    const other = await register(app, 'Dief', await platformCode(app));
    await earnCoins(app, u, 1);
    const grantId = (await app.api('GET', '/api/packs', { token: u.token })).body.unopened[0].grantId;
    expect((await app.api('POST', `/api/packs/${grantId}/open`, { token: other.token, idem: idem() })).status).toBe(404);
    const results = await Promise.all([1, 2, 3].map(() => app.api('POST', `/api/packs/${grantId}/open`, { token: u.token, idem: idem() })));
    expect(results.map((r) => r.status).sort()).toEqual([201, 409, 409]);
    expect(cardCount(app, u)).toBe(5);
    expect((await app.api('GET', '/api/packs', { token: u.token })).body.unopened).toEqual([]);
  });
});
