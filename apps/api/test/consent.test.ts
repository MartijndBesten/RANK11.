/** Zelfregistratie met ouderlijke toestemming via drie routes (e-mail/QR-koppelcode, ouder-beheerder). */
import { describe, expect, it } from 'vitest';
import { createApp, idem, platformCode, register, type TestApp } from './helpers.ts';

const reg = (app: TestApp, body: Record<string, unknown>) => app.api('POST', '/api/auth/register', { idem: idem(), body });
const clubs = (app: TestApp, userId: string) => (app.db.db.prepare('SELECT COUNT(*) AS n FROM clubs WHERE user_id = ?').get(userId) as { n: number }).n;
const userStatus = (app: TestApp, userId: string) => (app.db.db.prepare('SELECT status FROM users WHERE id = ?').get(userId) as { status: string } | undefined)?.status;
const consentOf = (app: TestApp, userId: string) => app.db.db.prepare("SELECT status, method, guardian_user_id FROM parent_consents WHERE user_id = ? AND purpose = 'approval' ORDER BY created_at DESC LIMIT 1").get(userId) as { status: string; method: string | null; guardian_user_id: string | null } | undefined;

async function makeAdmin(app: TestApp, name: string) {
  const u = await register(app, name, await platformCode(app));
  app.db.db.prepare("UPDATE users SET role = 'platform_admin' WHERE id = ?").run(u.id);
  return u;
}
const mkKid = async (app: TestApp, name: string) => reg(app, { username: name, password: 'geheim-wachtwoord-1', inviteCode: await platformCode(app), under16: true, parentEmail: 'ouder@example.nl' });

describe('ouderlijke toestemming (drie routes)', () => {
  it('16+ speelt meteen; onder-16 komt in wachtstatus zonder toegang', async () => {
    const app = createApp();
    const a = await reg(app, { username: 'Volwassen', password: 'geheim-wachtwoord-1', inviteCode: await platformCode(app), under16: false });
    expect(a.status).toBe(201); expect(clubs(app, a.body.user.id)).toBe(1);
    const k = await mkKid(app, 'KindA');
    expect(k.body.pending).toBe(true); expect(typeof k.body.claimCode).toBe('string');
    expect(userStatus(app, k.body.user.id)).toBe('pending_parent_approval');
    expect(clubs(app, k.body.user.id)).toBe(0);
    expect((await app.api('GET', '/api/grades', { token: k.body.token })).status).toBe(403);
  });

  it('zonder ouder-e-mail mislukt de registratie van een kind', async () => {
    const app = createApp();
    expect((await reg(app, { username: 'GeenMail', password: 'geheim-wachtwoord-1', inviteCode: await platformCode(app), under16: true })).status).toBe(400);
  });

  it('QR/koppelcode-route: ouder keurt goed met de koppelcode (geen login)', async () => {
    const app = createApp();
    const k = await mkKid(app, 'KindQR');
    // Zonder bevestiging: geweigerd.
    expect((await app.api('POST', '/api/consent/decide', { idem: idem(), body: { claimCode: k.body.claimCode, decision: 'approve' } })).status).toBe(400);
    const ok = await app.api('POST', '/api/consent/decide', { idem: idem(), body: { claimCode: k.body.claimCode, decision: 'approve', guardianConfirmed: true } });
    expect(ok.status).toBe(200);
    expect(userStatus(app, k.body.user.id)).toBe('active');
    expect(clubs(app, k.body.user.id)).toBe(1);
    expect(consentOf(app, k.body.user.id)).toMatchObject({ status: 'approved', method: 'qr' });
    // Gebruikte code werkt niet meer.
    expect((await app.api('POST', '/api/consent/decide', { idem: idem(), body: { claimCode: k.body.claimCode, decision: 'approve', guardianConfirmed: true } })).status).toBe(400);
  });

  it('ouder/beheerder-route: een beheerder keurt goed MET de koppelcode; zonder code lukt het niet', async () => {
    const app = createApp();
    const admin = await makeAdmin(app, 'OuderBeheer');
    const k = await mkKid(app, 'KindBeheer');
    // Blanco goedkeuren zonder (geldige) koppelcode: geweigerd — geen algemene knop.
    expect((await app.api('POST', '/api/admin/consents/approve', { token: admin.token, idem: idem(), body: { claimCode: 'FOUTCODE', decision: 'approve', guardianConfirmed: true } })).status).toBe(400);
    // Met de juiste koppelcode + bevestiging: goedgekeurd, voogd vastgelegd.
    const ok = await app.api('POST', '/api/admin/consents/approve', { token: admin.token, idem: idem(), body: { claimCode: k.body.claimCode, decision: 'approve', guardianConfirmed: true } });
    expect(ok.status).toBe(200);
    expect(userStatus(app, k.body.user.id)).toBe('active');
    expect(consentOf(app, k.body.user.id)).toMatchObject({ status: 'approved', method: 'admin', guardian_user_id: admin.id });
  });

  it('een niet-beheerder kan de beheerder-route niet gebruiken', async () => {
    const app = createApp();
    const speler = await register(app, 'Gewoon', await platformCode(app));
    const k = await mkKid(app, 'KindX');
    expect((await app.api('POST', '/api/admin/consents/approve', { token: speler.token, idem: idem(), body: { claimCode: k.body.claimCode, decision: 'approve', guardianConfirmed: true } })).status).toBe(404);
  });

  it('wachtend kind krijgt een verse koppelcode (zonder e-mail) die werkt voor QR-goedkeuring', async () => {
    const app = createApp();
    const k = await mkKid(app, 'KindCode');
    const r = await app.api('POST', '/api/consent/claim-code', { token: k.body.token, idem: idem() });
    expect(r.status).toBe(200);
    expect(typeof r.body.claimCode).toBe('string');
    // De oude registratiecode is vervangen en werkt niet meer.
    expect((await app.api('POST', '/api/consent/decide', { idem: idem(), body: { claimCode: k.body.claimCode, decision: 'approve', guardianConfirmed: true } })).status).toBe(400);
    // De nieuwe code keurt wel goed.
    const ok = await app.api('POST', '/api/consent/decide', { idem: idem(), body: { claimCode: r.body.claimCode, decision: 'approve', guardianConfirmed: true } });
    expect(ok.status).toBe(200);
    expect(userStatus(app, k.body.user.id)).toBe('active');
  });

  it('een actief account kan geen koppelcode opvragen', async () => {
    const app = createApp();
    const a = await reg(app, { username: 'ActiefLid', password: 'geheim-wachtwoord-1', inviteCode: await platformCode(app), under16: false });
    expect((await app.api('POST', '/api/consent/claim-code', { token: a.body.token, idem: idem() })).status).toBe(409);
  });

  it('afwijzen blokkeert het account', async () => {
    const app = createApp();
    const k = await mkKid(app, 'KindAf');
    const r = await app.api('POST', '/api/consent/decide', { idem: idem(), body: { claimCode: k.body.claimCode, decision: 'decline' } });
    expect(r.status).toBe(200);
    expect(userStatus(app, k.body.user.id)).toBe('blocked');
    expect(consentOf(app, k.body.user.id)?.status).toBe('rejected');
    expect((await app.api('GET', '/api/consent/status', { token: k.body.token })).status).toBe(401);
  });

  it('één ouder/beheerder kan meerdere kinderen goedkeuren', async () => {
    const app = createApp();
    const admin = await makeAdmin(app, 'OuderMulti');
    for (const naam of ['ZusM', 'BroerM']) {
      const k = await mkKid(app, naam);
      const ok = await app.api('POST', '/api/admin/consents/approve', { token: admin.token, idem: idem(), body: { claimCode: k.body.claimCode, decision: 'approve', guardianConfirmed: true } });
      expect(ok.status).toBe(200);
      expect(userStatus(app, k.body.user.id)).toBe('active');
    }
  });

  it('beheerder kan blokkeren; niet-beheerder niet', async () => {
    const app = createApp();
    const admin = await makeAdmin(app, 'Blok');
    const speler = await register(app, 'Doelwit', await platformCode(app));
    expect((await app.api('POST', `/api/admin/users/${speler.id}/block`, { token: speler.token, idem: idem() })).status).toBe(404);
    expect((await app.api('POST', `/api/admin/users/${speler.id}/block`, { token: admin.token, idem: idem() })).status).toBe(200);
    expect(userStatus(app, speler.id)).toBe('blocked');
  });
});
