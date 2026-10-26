/** Bestandsimport van cijfers: per rij aangemaakt/dubbel/ongeldig; geen dubbele beloningen bij opnieuw importeren. */
import { describe, expect, it } from 'vitest';
import { createApp, idem, platformCode, register, type TestApp, type TestUser } from './helpers.ts';

const row = (extra: Record<string, unknown> = {}) => ({ subjectId: 'wiskunde', testName: 'SO H1', value: 6.8, weight: 2, date: '2026-10-13', ...extra });
const importRows = (app: TestApp, u: TestUser, rows: unknown[]) => app.api('POST', '/api/grades/import', { token: u.token, idem: idem(), body: { rows } });
const allGrades = (app: TestApp, u: TestUser) => (app.db.db.prepare('SELECT subject_id, value, source, status FROM grades WHERE user_id = ? AND deleted_at IS NULL').all(u.id)) as { subject_id: string; value: number; source: string; status: string }[];
const rewardCount = (app: TestApp, u: TestUser) => (app.db.db.prepare("SELECT COUNT(*) AS n FROM reward_grants WHERE user_id = ? AND kind = 'initial'").get(u.id) as { n: number }).n;
const packCount = (app: TestApp, u: TestUser) => (app.db.db.prepare('SELECT COUNT(*) AS n FROM pack_grants WHERE user_id = ?').get(u.id) as { n: number }).n;
const xpTotal = (app: TestApp, u: TestUser) => (app.db.db.prepare('SELECT COALESCE(SUM(xp),0) AS t FROM xp_ledger WHERE user_id = ?').get(u.id) as { t: number }).t;

describe('cijferimport op de server', () => {
  it('maakt cijfers aan met herkomst import en status self (niet geverifieerd)', async () => {
    const app = createApp();
    const u = await register(app, 'Importeur', await platformCode(app));
    const res = await importRows(app, u, [row(), row({ subjectId: 'en', testName: 'Reading', value: 8.1, date: '2026-10-14' })]);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ created: 2, duplicate: 0, invalid: 0 });
    const g = allGrades(app, u);
    expect(g.every((x) => x.source === 'import' && x.status === 'self')).toBe(true);
  });

  it('opnieuw importeren levert geen tweede cijfer en geen dubbele beloning op', async () => {
    const app = createApp();
    const u = await register(app, 'Dubbel', await platformCode(app));
    await importRows(app, u, [row()]);
    const rewards1 = rewardCount(app, u), packs1 = packCount(app, u), xp1 = xpTotal(app, u);
    const again = await importRows(app, u, [row()]);
    expect(again.body).toMatchObject({ created: 0, duplicate: 1 });
    expect(allGrades(app, u)).toHaveLength(1);
    expect(rewardCount(app, u)).toBe(rewards1);
    expect(packCount(app, u)).toBe(packs1);
    expect(xpTotal(app, u)).toBe(xp1);
  });

  it('dedup op toets-identiteit: zelfde toets = dubbel, een andere toets met hetzelfde cijfer/datum blijft behouden (P1)', async () => {
    const app = createApp();
    const u = await register(app, 'Mix', await platformCode(app));
    // Handmatig 'Proefwerk' 6,8 op 13-10.
    await app.api('POST', '/api/grades', { token: u.token, idem: idem(), body: { subjectId: 'wiskunde', testName: 'Proefwerk', value: 6.8, weight: 1, date: '2026-10-13' } });
    // Dezelfde toets opnieuw importeren (zelfde naam+datum) = dubbel.
    const same = await importRows(app, u, [{ subjectId: 'wiskunde', testName: 'Proefwerk', value: 6.8, weight: 1, date: '2026-10-13' }]);
    expect(same.body).toMatchObject({ created: 0, duplicate: 1 });
    // Een ÁNDERE toets met toevallig hetzelfde cijfer op dezelfde datum blijft behouden (mag niet verdwijnen).
    const other = await importRows(app, u, [{ subjectId: 'wiskunde', testName: 'SO deel 2', value: 6.8, weight: 1, date: '2026-10-13' }]);
    expect(other.body).toMatchObject({ created: 1, duplicate: 0 });
    expect(allGrades(app, u)).toHaveLength(2);
  });

  it('twee verschillende toetsen met hetzelfde cijfer op dezelfde datum in één import blijven allebei behouden (P1)', async () => {
    const app = createApp();
    const u = await register(app, 'Twee', await platformCode(app));
    const res = await importRows(app, u, [
      { subjectId: 'wiskunde', testName: 'SO deel 1', value: 7.0, weight: 1, date: '2026-10-13' },
      { subjectId: 'wiskunde', testName: 'SO deel 2', value: 7.0, weight: 1, date: '2026-10-13' },
    ]);
    expect(res.body).toMatchObject({ created: 2, duplicate: 0, invalid: 0 });
    expect(allGrades(app, u)).toHaveLength(2);
  });

  it('ongeldige rijen worden geweigerd zonder de geldige te blokkeren', async () => {
    const app = createApp();
    const u = await register(app, 'Deels', await platformCode(app));
    const res = await importRows(app, u, [row(), { subjectId: 'wiskunde', testName: 'Fout', value: 12, weight: 1, date: '2026-10-13' }, row({ testName: 'Leeg', value: 7, date: '2026-10-15' })]);
    expect(res.body).toMatchObject({ created: 2, invalid: 1 });
    expect(allGrades(app, u)).toHaveLength(2);
  });

  it('importeren, corrigeren en opnieuw importeren geeft nooit dubbele XP, coins, packs of vouchers', async () => {
    const app = createApp();
    const u = await register(app, 'GeenDubbel', await platformCode(app));
    // Import een 9,6 (Goudpack + voucher) en een 7,0.
    await importRows(app, u, [row({ subjectId: 'wiskunde', testName: 'Toetsweek', value: 9.6, date: '2026-10-10' }), row({ subjectId: 'en', testName: 'Reading', value: 7.0, date: '2026-10-11' })]);
    const gradeId = (app.db.db.prepare("SELECT id FROM grades WHERE user_id = ? AND value = 9.6").get(u.id) as { id: string }).id;
    const snapshot = () => ({
      grades: (app.db.db.prepare('SELECT COUNT(*) AS n FROM grades WHERE user_id = ? AND deleted_at IS NULL').get(u.id) as { n: number }).n,
      rewards: rewardCount(app, u), packs: packCount(app, u),
      coins: (app.db.db.prepare("SELECT COALESCE(SUM(delta),0) AS t FROM wallet_ledger WHERE user_id = ? AND currency = 'coins'").get(u.id) as { t: number }).t,
      vouchers: (app.db.db.prepare("SELECT COALESCE(SUM(delta),0) AS t FROM wallet_ledger WHERE user_id = ? AND currency = 'vouchers'").get(u.id) as { t: number }).t,
      xp: xpTotal(app, u),
    });
    const before = snapshot();
    // Opnieuw dezelfde import: niets verandert.
    await importRows(app, u, [row({ subjectId: 'wiskunde', testName: 'Toetsweek', value: 9.6, date: '2026-10-10' }), row({ subjectId: 'en', testName: 'Reading', value: 7.0, date: '2026-10-11' })]);
    expect(snapshot()).toEqual(before);
    // Corrigeren omlaag: geen nieuwe beloning (correctie 'topup' alleen omhoog), daarna opnieuw importeren = dubbel.
    await app.api('PUT', `/api/grades/${gradeId}`, { token: u.token, idem: idem(), body: { value: 8.0 } });
    const afterCorrect = snapshot();
    await importRows(app, u, [row({ subjectId: 'wiskunde', testName: 'Toetsweek', value: 9.6, date: '2026-10-10' })]);
    // Zelfde toets (vak+naam+datum) → dubbel, geen extra beloning bovenop de correctie.
    const afterReimport = snapshot();
    expect(afterReimport.rewards).toBe(afterCorrect.rewards);
    expect(afterReimport.packs).toBe(afterCorrect.packs);
    expect(afterReimport.vouchers).toBe(afterCorrect.vouchers);
    expect(afterReimport.grades).toBe(afterCorrect.grades);
  });

  it('import is alleen voor jezelf en begrensd tot 100 rijen', async () => {
    const app = createApp();
    const u = await register(app, 'Grens', await platformCode(app));
    expect((await app.api('POST', '/api/grades/import', { token: u.token, idem: idem(), body: { rows: [] } })).status).toBe(400);
    expect((await app.api('POST', '/api/grades/import', { token: u.token, idem: idem(), body: { rows: Array.from({ length: 101 }, () => row()) } })).status).toBe(400);
    expect((await app.api('POST', '/api/grades/import', { idem: idem(), body: { rows: [row()] } })).status).toBe(401);
  });
});
