import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp, idem, platformCode, register, type TestApp, type TestUser } from './helpers.ts';

afterEach(() => { vi.useRealTimers(); });

const grade = (extra: Record<string, unknown> = {}) => ({ subjectId: 'wiskunde', testName: 'Hoofdstuk 3', value: 7, weight: 1, date: '2026-10-20', ...extra });

function ledger(app: TestApp, user: TestUser) {
  const rows = app.db.db.prepare('SELECT currency, SUM(delta) AS total, COUNT(*) AS n FROM wallet_ledger WHERE user_id = ? GROUP BY currency').all(user.id) as { currency: string; total: number; n: number }[];
  return Object.fromEntries(rows.map((r) => [r.currency, r.total]));
}
const ledgerRows = (app: TestApp, user: TestUser) => (app.db.db.prepare('SELECT COUNT(*) AS n FROM wallet_ledger WHERE user_id = ?').get(user.id) as { n: number }).n;
const packs = (app: TestApp, user: TestUser) => (app.db.db.prepare('SELECT pack_id FROM pack_grants WHERE user_id = ? ORDER BY created_at, rowid').all(user.id) as { pack_id: string }[]).map((r) => r.pack_id);

async function setup() {
  const app = createApp();
  const user = await register(app, 'Leerling', await platformCode(app));
  return { app, user };
}

describe('cijfers en beloningen', () => {
  it('invoer levert een beloning via de engine op, met configVersion in grant en grootboek', async () => {
    const { app, user } = await setup();
    const res = await app.api('POST', '/api/grades', { token: user.token, idem: idem(), body: grade() });
    expect(res.status).toBe(201);
    expect(res.body.grade).toMatchObject({ status: 'self', value: 7, subjectId: 'wiskunde' });
    expect(res.body.reward).toMatchObject({ status: 'rewarded', tierId: 'good', xp: 90, coins: 250, packId: 'gold', configVersion: '2026.10-proto.1' });
    expect(ledger(app, user)).toEqual({ xp: 90, coins: 250 });
    expect(packs(app, user)).toEqual(['gold']);
    const grant = app.db.db.prepare('SELECT config_version, kind, dedupe_key FROM reward_grants').get() as Record<string, string>;
    expect(grant).toEqual({ config_version: '2026.10-proto.1', kind: 'initial', dedupe_key: 'toets:wiskunde:hoofdstuk 3:2026-10-20' });
    const wallet = await app.api('GET', '/api/wallet', { token: user.token });
    expect(wallet.body.balances).toEqual({ coins: 250, xp: 90, vouchers: 0 });
  });

  it('dubbele invoer van dezelfde toets: 409 en geen dubbele beloning', async () => {
    const { app, user } = await setup();
    await app.api('POST', '/api/grades', { token: user.token, idem: idem(), body: grade() });
    const before = ledgerRows(app, user);
    const dup = await app.api('POST', '/api/grades', { token: user.token, idem: idem(), body: grade({ testName: '  HOOFDSTUK   3 ', value: 9 }) });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('duplicate_grade');
    expect(ledgerRows(app, user)).toBe(before);
    expect(packs(app, user)).toEqual(['gold']);
  });

  it('idempotentiesleutel: zelfde sleutel = zelfde antwoord, ander verzoek = 422, sleutel verplicht', async () => {
    const { app, user } = await setup();
    const key = idem('grade');
    const first = await app.api('POST', '/api/grades', { token: user.token, idem: key, body: grade() });
    const again = await app.api('POST', '/api/grades', { token: user.token, idem: key, body: grade() });
    expect(again.status).toBe(201);
    expect(again.headers.get('Idempotent-Replay')).toBe('true');
    expect(again.body).toEqual(first.body);
    expect(ledger(app, user)).toEqual({ xp: 90, coins: 250 });
    expect((await app.api('POST', '/api/grades', { token: user.token, idem: key, body: grade({ value: 8 }) })).status).toBe(422);
    expect((await app.api('POST', '/api/grades', { token: user.token, body: grade({ testName: 'Ander' }) })).status).toBe(400);
  });

  it('correctie naar boven: alleen het verschil; naar beneden: niets terug; verwijderen en opnieuw invoeren: geen nieuwe beloning', async () => {
    const { app, user } = await setup();
    const created = await app.api('POST', '/api/grades', { token: user.token, idem: idem(), body: grade({ value: 7 }) });
    const id = created.body.grade.id;

    const up = await app.api('PUT', `/api/grades/${id}`, { token: user.token, idem: idem(), body: { value: 8 } });
    expect(up.status).toBe(200);
    expect(up.body.reward).toMatchObject({ status: 'correction', tierId: 'great', xp: 50, coins: 150, vouchers: 1, packId: 'exam' });
    expect(ledger(app, user)).toEqual({ xp: 140, coins: 400, vouchers: 1 });
    expect(packs(app, user)).toEqual(['gold', 'exam']);

    const down = await app.api('PUT', `/api/grades/${id}`, { token: user.token, idem: idem(), body: { value: 6 } });
    expect(down.body.reward).toMatchObject({ status: 'duplicate', xp: 0, coins: 0 });
    expect(ledger(app, user)).toEqual({ xp: 140, coins: 400, vouchers: 1 });

    const back = await app.api('PUT', `/api/grades/${id}`, { token: user.token, idem: idem(), body: { value: 8 } });
    expect(back.body.reward.status).toBe('duplicate'); // tier 'great' was al toegekend
    expect(ledger(app, user)).toEqual({ xp: 140, coins: 400, vouchers: 1 });

    expect((await app.api('DELETE', `/api/grades/${id}`, { token: user.token, idem: idem() })).status).toBe(200);
    expect((await app.api('GET', '/api/grades', { token: user.token })).body.grades).toHaveLength(0);
    const history = await app.api('GET', `/api/grades/${id}/history`, { token: user.token });
    expect(history.body.history.map((h: { action: string }) => h.action)).toEqual(['create', 'correct', 'correct', 'correct', 'delete']);
    expect(history.body.history[1].before.value).toBe(7);
    expect(history.body.history[1].after.value).toBe(8);

    const reentry = await app.api('POST', '/api/grades', { token: user.token, idem: idem(), body: grade({ value: 8 }) });
    expect(reentry.status).toBe(201);
    expect(reentry.body.reward.status).toBe('duplicate');
    expect(ledger(app, user)).toEqual({ xp: 140, coins: 400, vouchers: 1 });
  });

  it('onvoldoende = herstelkans (XP, geen pack); dagelijkse limiet; cijfers alleen voor jezelf', async () => {
    const { app, user } = await setup();
    const low = await app.api('POST', '/api/grades', { token: user.token, idem: idem(), body: grade({ value: 4.2, testName: 'SO 1' }) });
    expect(low.body.reward).toMatchObject({ status: 'support', xp: 15, coins: 0, packId: null });
    for (let i = 2; i <= 4; i++) {
      const r = await app.api('POST', '/api/grades', { token: user.token, idem: idem(), body: grade({ testName: `SO ${i}` }) });
      expect(r.body.reward.status).toBe('rewarded');
    }
    const capped = await app.api('POST', '/api/grades', { token: user.token, idem: idem(), body: grade({ testName: 'SO 5' }) });
    expect(capped.body.reward).toMatchObject({ status: 'capped', xp: 0, coins: 0 });
    app.advance(24 * 3600_000);
    const nextDay = await app.api('POST', '/api/grades', { token: user.token, idem: idem(), body: grade({ testName: 'SO 6' }) });
    expect(nextDay.body.reward.status).toBe('rewarded');

    const list = await app.api('GET', '/api/grades', { token: user.token });
    expect(list.body.grades).toHaveLength(6);
    expect(list.body.averages.subjects.wiskunde).toBeCloseTo((4.2 + 7 * 5) / 6, 10);

    const other = await register(app, 'Nieuwsgierig', await platformCode(app));
    expect((await app.api('GET', '/api/grades', { token: other.token })).body.grades).toEqual([]);
    const id = low.body.grade.id;
    expect((await app.api('PUT', `/api/grades/${id}`, { token: other.token, idem: idem(), body: { value: 10 } })).status).toBe(404);
    expect((await app.api('DELETE', `/api/grades/${id}`, { token: other.token, idem: idem() })).status).toBe(404);
    expect((await app.api('GET', `/api/grades/${id}/history`, { token: other.token })).status).toBe(404);
  });

  it('validatie via de engine', async () => {
    const { app, user } = await setup();
    const future = await app.api('POST', '/api/grades', { token: user.token, idem: idem(), body: grade({ date: '2026-12-01' }) });
    expect(future.status).toBe(400);
    expect(future.body.error.message).toMatch(/toekomst/);
    expect((await app.api('POST', '/api/grades', { token: user.token, idem: idem(), body: grade({ value: 11 }) })).status).toBe(400);
    expect((await app.api('POST', '/api/grades', { token: user.token, idem: idem(), body: grade({ weight: 0 }) })).status).toBe(400);
    expect((await app.api('POST', '/api/grades', { token: user.token, idem: idem(), body: grade({ value: '7' }) })).status).toBe(400);
    expect(ledgerRows(app, user)).toBe(0);
  });
});
