/** Zelfregistratie met ouderlijke toestemming. Twee routes: e-mail (publiek, token-only) en de ingelogde
 * beheerder-route met koppelcode. BEVEILIGING: een koppelcode (getoond aan het kind) mag NOOIT via de
 * publieke API het eigen account goedkeuren. */
import { describe, expect, it } from 'vitest';
import { createApp, idem, platformCode, register, type TestApp } from './helpers.ts';
import { sha256Hex } from '../src/crypto.ts';

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

// Zet een bekende e-mailtoken op het openstaande verzoek van een kind (de echte token gaat alleen naar de
// mailbox van de ouder; voor de test kennen we hem via de DB). Simuleert dus "de ouder opent de e-maillink".
async function seedEmailToken(app: TestApp, userId: string, token: string) {
  const h = await sha256Hex(token);
  app.db.db.prepare("UPDATE parent_consents SET token_hash = ? WHERE user_id = ? AND purpose = 'approval' AND status = 'pending'").run(h, userId);
}

describe('ouderlijke toestemming (e-mail + beheerder)', () => {
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

  it('BEVEILIGING: een koppelcode keurt NOOIT via de publieke /consent/decide goed', async () => {
    const app = createApp();
    const k = await mkKid(app, 'KindQR');
    // Zelfs met bevestiging mag de koppelcode (die het kind zelf kent) niet publiek goedkeuren.
    const r = await app.api('POST', '/api/consent/decide', { idem: idem(), body: { claimCode: k.body.claimCode, decision: 'approve', guardianConfirmed: true } });
    expect(r.status).toBe(400);
    expect(userStatus(app, k.body.user.id)).toBe('pending_parent_approval');
    // Ook een verse koppelcode uit /claim-code werkt niet publiek.
    const fresh = await app.api('POST', '/api/consent/claim-code', { token: k.body.token, idem: idem() });
    expect(fresh.status).toBe(200);
    expect((await app.api('POST', '/api/consent/decide', { idem: idem(), body: { claimCode: fresh.body.claimCode, decision: 'approve', guardianConfirmed: true } })).status).toBe(400);
    expect(userStatus(app, k.body.user.id)).toBe('pending_parent_approval');
  });

  it('e-mailroute: met de e-mailtoken + bevestiging keurt de ouder goed; zonder bevestiging niet', async () => {
    const app = createApp();
    const k = await mkKid(app, 'KindMail');
    const token = 'e'.repeat(48);
    await seedEmailToken(app, k.body.user.id, token);
    // Zonder bevestiging: geweigerd.
    expect((await app.api('POST', '/api/consent/decide', { idem: idem(), body: { token, decision: 'approve' } })).status).toBe(400);
    // Met bevestiging: goedgekeurd, methode 'email', club aangemaakt.
    const ok = await app.api('POST', '/api/consent/decide', { idem: idem(), body: { token, decision: 'approve', guardianConfirmed: true } });
    expect(ok.status).toBe(200);
    expect(userStatus(app, k.body.user.id)).toBe('active');
    expect(clubs(app, k.body.user.id)).toBe(1);
    expect(consentOf(app, k.body.user.id)).toMatchObject({ status: 'approved', method: 'email' });
    // Gebruikte token werkt niet meer.
    expect((await app.api('POST', '/api/consent/decide', { idem: idem(), body: { token, decision: 'approve', guardianConfirmed: true } })).status).toBe(400);
  });

  it('e-mailroute: afwijzen blokkeert het account', async () => {
    const app = createApp();
    const k = await mkKid(app, 'KindAf');
    const token = 'd'.repeat(48);
    await seedEmailToken(app, k.body.user.id, token);
    const r = await app.api('POST', '/api/consent/decide', { idem: idem(), body: { token, decision: 'decline' } });
    expect(r.status).toBe(200);
    expect(userStatus(app, k.body.user.id)).toBe('blocked');
    expect(consentOf(app, k.body.user.id)?.status).toBe('rejected');
    expect((await app.api('GET', '/api/consent/status', { token: k.body.token })).status).toBe(401);
  });

  it('beheerder-route: een beheerder keurt goed MET de koppelcode; zonder (geldige) code lukt het niet', async () => {
    const app = createApp();
    const admin = await makeAdmin(app, 'OuderBeheer');
    const k = await mkKid(app, 'KindBeheer');
    expect((await app.api('POST', '/api/admin/consents/approve', { token: admin.token, idem: idem(), body: { claimCode: 'FOUTCODE', decision: 'approve', guardianConfirmed: true } })).status).toBe(400);
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

  it('wachtend kind kan een verse koppelcode opvragen; een actief account niet', async () => {
    const app = createApp();
    const admin = await makeAdmin(app, 'OuderVers');
    const k = await mkKid(app, 'KindCode');
    const r = await app.api('POST', '/api/consent/claim-code', { token: k.body.token, idem: idem() });
    expect(r.status).toBe(200);
    expect(typeof r.body.claimCode).toBe('string');
    // De verse code werkt via de beheerder-route (niet publiek).
    const ok = await app.api('POST', '/api/admin/consents/approve', { token: admin.token, idem: idem(), body: { claimCode: r.body.claimCode, decision: 'approve', guardianConfirmed: true } });
    expect(ok.status).toBe(200);
    expect(userStatus(app, k.body.user.id)).toBe('active');
    // Actief account kan geen koppelcode meer opvragen.
    const a = await reg(app, { username: 'ActiefLid', password: 'geheim-wachtwoord-1', inviteCode: await platformCode(app), under16: false });
    expect((await app.api('POST', '/api/consent/claim-code', { token: a.body.token, idem: idem() })).status).toBe(409);
  });

  it('één beheerder kan meerdere kinderen goedkeuren', async () => {
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
