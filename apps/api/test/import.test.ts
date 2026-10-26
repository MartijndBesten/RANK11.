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

  it('een al handmatig ingevoerd cijfer (zelfde vak, waarde, datum) geldt bij import als dubbel', async () => {
    const app = createApp();
    const u = await register(app, 'Mix', await platformCode(app));
    await app.api('POST', '/api/grades', { token: u.token, idem: idem(), body: { subjectId: 'wiskunde', testName: 'Proefwerk', value: 6.8, weight: 1, date: '2026-10-13' } });
    const rewards1 = rewardCount(app, u);
    const res = await importRows(app, u, [row()]); // andere toetsnaam, zelfde vak/waarde/datum
    expect(res.body).toMatchObject({ created: 0, duplicate: 1 });
    expect(allGrades(app, u)).toHaveLength(1);
    expect(rewardCount(app, u)).toBe(rewards1);
  });

  it('ongeldige rijen worden geweigerd zonder de geldige te blokkeren', async () => {
    const app = createApp();
    const u = await register(app, 'Deels', await platformCode(app));
    const res = await importRows(app, u, [row(), { subjectId: 'wiskunde', testName: 'Fout', value: 12, weight: 1, date: '2026-10-13' }, row({ testName: 'Leeg', value: 7, date: '2026-10-15' })]);
    expect(res.body).toMatchObject({ created: 2, invalid: 1 });
    expect(allGrades(app, u)).toHaveLength(2);
  });

  it('import is alleen voor jezelf en begrensd tot 100 rijen', async () => {
    const app = createApp();
    const u = await register(app, 'Grens', await platformCode(app));
    expect((await app.api('POST', '/api/grades/import', { token: u.token, idem: idem(), body: { rows: [] } })).status).toBe(400);
    expect((await app.api('POST', '/api/grades/import', { token: u.token, idem: idem(), body: { rows: Array.from({ length: 101 }, () => row()) } })).status).toBe(400);
    expect((await app.api('POST', '/api/grades/import', { idem: idem(), body: { rows: [row()] } })).status).toBe(401);
  });
});
