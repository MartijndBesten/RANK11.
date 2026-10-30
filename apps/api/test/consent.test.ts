/** Zelfregistratie met ouderlijke toestemming: wachtstatus, goedkeuren/afwijzen, intrekken, blokkeren. */
import { describe, expect, it } from 'vitest';
import { createApp, idem, platformCode, register, type TestApp } from './helpers.ts';

const reg = (app: TestApp, body: Record<string, unknown>) => app.api('POST', '/api/auth/register', { idem: idem(), body });
const clubs = (app: TestApp, userId: string) => (app.db.db.prepare('SELECT COUNT(*) AS n FROM clubs WHERE user_id = ?').get(userId) as { n: number }).n;
const userStatus = (app: TestApp, userId: string) => (app.db.db.prepare('SELECT status FROM users WHERE id = ?').get(userId) as { status: string } | undefined)?.status;

async function makeAdmin(app: TestApp, name: string) {
  const u = await register(app, name, await platformCode(app));
  app.db.db.prepare("UPDATE users SET role = 'platform_admin' WHERE id = ?").run(u.id);
  return u;
}
/** Verse goedkeuringslink via de beheerder; geeft de token terug. */
async function approvalToken(app: TestApp, adminToken: string, userId: string): Promise<string> {
  const r = await app.api('POST', `/api/admin/consents/${userId}/link`, { token: adminToken, idem: idem() });
  expect(r.status).toBe(200);
  return new URL(r.body.url).searchParams.get('token')!;
}

describe('ouderlijke toestemming', () => {
  it('16+ registreert normaal en kan meteen spelen', async () => {
    const app = createApp();
    const code = await platformCode(app);
    const r = await reg(app, { username: 'Volwassen', password: 'geheim-wachtwoord-1', inviteCode: code, under16: false });
    expect(r.status).toBe(201);
    expect(clubs(app, r.body.user.id)).toBe(1);
    expect(r.body.user.status ?? 'active').toBe('active');
  });

  it('kind onder 16 komt in wachtstatus, zonder club en zonder spel-toegang', async () => {
    const app = createApp();
    const r = await reg(app, { username: 'KindA', password: 'geheim-wachtwoord-1', inviteCode: await platformCode(app), under16: true, parentEmail: 'ouder@voorbeeld.nl' });
    expect(r.status).toBe(201);
    expect(r.body.pending).toBe(true);
    expect(userStatus(app, r.body.user.id)).toBe('pending_parent_approval');
    expect(clubs(app, r.body.user.id)).toBe(0); // nog geen spelgegevens
    // Geen toegang tot cijfers/collectie zolang het wacht.
    expect((await app.api('GET', '/api/grades', { token: r.body.token })).status).toBe(403);
    expect((await app.api('GET', '/api/collection', { token: r.body.token })).status).toBe(403);
    // Wel de eigen status kunnen zien.
    expect((await app.api('GET', '/api/consent/status', { token: r.body.token })).status).toBe(200);
  });

  it('zonder ouder-e-mail mislukt de registratie van een kind', async () => {
    const app = createApp();
    const r = await reg(app, { username: 'KindGeenMail', password: 'geheim-wachtwoord-1', inviteCode: await platformCode(app), under16: true });
    expect(r.status).toBe(400);
  });

  it('ouder keurt goed: kind krijgt club en kan spelen', async () => {
    const app = createApp();
    const admin = await makeAdmin(app, 'Toezicht');
    const r = await reg(app, { username: 'KindB', password: 'geheim-wachtwoord-1', inviteCode: await platformCode(app), under16: true, parentEmail: 'ma@voorbeeld.nl' });
    const token = await approvalToken(app, admin.token, r.body.user.id);
    const dec = await app.api('POST', '/api/consent/decide', { idem: idem(), body: { token, decision: 'approve' } });
    expect(dec.status).toBe(200);
    expect(userStatus(app, r.body.user.id)).toBe('active');
    expect(clubs(app, r.body.user.id)).toBe(1);
    expect((await app.api('GET', '/api/grades', { token: r.body.token })).status).toBe(200);
  });

  it('ouder wijst af: kind kan niet spelen (geblokkeerd)', async () => {
    const app = createApp();
    const admin = await makeAdmin(app, 'Toezicht2');
    const r = await reg(app, { username: 'KindC', password: 'geheim-wachtwoord-1', inviteCode: await platformCode(app), under16: true, parentEmail: 'pa@voorbeeld.nl' });
    const token = await approvalToken(app, admin.token, r.body.user.id);
    const dec = await app.api('POST', '/api/consent/decide', { idem: idem(), body: { token, decision: 'decline' } });
    expect(dec.status).toBe(200);
    expect(userStatus(app, r.body.user.id)).toBe('blocked');
    // sessie ongeldig: geen status meer opvraagbaar.
    expect((await app.api('GET', '/api/consent/status', { token: r.body.token })).status).toBe(401);
  });

  it('een gebruikte of ongeldige token werkt niet meer', async () => {
    const app = createApp();
    const admin = await makeAdmin(app, 'Toezicht3');
    const r = await reg(app, { username: 'KindD', password: 'geheim-wachtwoord-1', inviteCode: await platformCode(app), under16: true, parentEmail: 'x@voorbeeld.nl' });
    const token = await approvalToken(app, admin.token, r.body.user.id);
    expect((await app.api('POST', '/api/consent/decide', { idem: idem(), body: { token, decision: 'approve' } })).status).toBe(200);
    // Tweede keer dezelfde token: ongeldig.
    expect((await app.api('POST', '/api/consent/decide', { idem: idem(), body: { token, decision: 'approve' } })).status).toBe(400);
    expect((await app.api('POST', '/api/consent/decide', { idem: idem(), body: { token: 'onzin-token-123', decision: 'approve' } })).status).toBe(400);
  });

  it('één ouder kan meerdere kinderen goedkeuren', async () => {
    const app = createApp();
    const admin = await makeAdmin(app, 'Toezicht4');
    const mail = 'gezin@voorbeeld.nl';
    const k1 = await reg(app, { username: 'ZusjeE', password: 'geheim-wachtwoord-1', inviteCode: await platformCode(app), under16: true, parentEmail: mail });
    const k2 = await reg(app, { username: 'BroertjeF', password: 'geheim-wachtwoord-1', inviteCode: await platformCode(app), under16: true, parentEmail: mail });
    for (const k of [k1, k2]) {
      const t = await approvalToken(app, admin.token, k.body.user.id);
      expect((await app.api('POST', '/api/consent/decide', { idem: idem(), body: { token: t, decision: 'approve' } })).status).toBe(200);
      expect(userStatus(app, k.body.user.id)).toBe('active');
    }
  });

  it('beheerder kan een account blokkeren; niet-admin niet', async () => {
    const app = createApp();
    const admin = await makeAdmin(app, 'Toezicht5');
    const speler = await register(app, 'Speler', await platformCode(app));
    expect((await app.api('POST', `/api/admin/users/${speler.id}/block`, { token: speler.token, idem: idem() })).status).toBe(404);
    expect((await app.api('POST', `/api/admin/users/${speler.id}/block`, { token: admin.token, idem: idem() })).status).toBe(200);
    expect(userStatus(app, speler.id)).toBe('blocked');
    expect((await app.api('GET', '/api/grades', { token: speler.token })).status).toBe(401); // sessie weg
  });
});
