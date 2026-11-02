/**
 * Ronde 15: registratie ALLEEN op uitnodiging (gezin + enkele vrienden). De productieconfiguratie wordt hier
 * nagebootst (ENVIRONMENT=prod, PILOT_MODE=false, OPEN_REGISTRATION=false) en we controleren:
 *  - zonder of met een ongeldige/verlopen/ingetrokken code: geen account;
 *  - /api/config meldt openRegistration=false (frontend toont "Ik heb een uitnodiging");
 *  - codes raden wordt per IP afgeremd (ook met codes);
 *  - onder-16 met een geldige uitnodiging blijft wachten op ouderlijke toestemming en kan zichzelf niet goedkeuren;
 *  - de wrangler-configuratie van test en prod staat op uitnodiging.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createApp, idem, platformCode } from './helpers.ts';

const PROD = { ENVIRONMENT: 'prod', PILOT_MODE: 'false', REGISTRATION_ENABLED: 'true', OPEN_REGISTRATION: 'false' } as const;
const reg = (app: ReturnType<typeof createApp>, body: Record<string, unknown>, ip?: string) =>
  app.api('POST', '/api/auth/register', { idem: idem(), ip, body: { password: 'geheim-wachtwoord-1', under16: false, ...body } });

describe('registratie alleen op uitnodiging', () => {
  it('wrangler.toml: test én prod staan op OPEN_REGISTRATION=false', () => {
    const toml = readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8');
    const values = [...toml.matchAll(/^OPEN_REGISTRATION\s*=\s*"(\w+)"/gm)].map((m) => m[1]);
    expect(values.length).toBeGreaterThanOrEqual(2);
    expect(values.every((v) => v === 'false')).toBe(true);
  });

  it('config meldt besloten registratie; zonder code of met een verzonnen code geen account', async () => {
    const app = createApp({ ...PROD });
    const cfg = await app.api('GET', '/api/config');
    expect(cfg.body.openRegistration).toBe(false);
    expect((await reg(app, { username: 'ZonderCode' })).status).toBe(400);
    expect((await reg(app, { username: 'Verzonnen', inviteCode: 'ABCDE-FGHJK' })).status).toBe(400);
    const n = app.db.db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
    expect(n.n).toBe(0);
  });

  it('een geldige uitnodiging werkt; verlopen of opgebruikt niet meer', async () => {
    const app = createApp({ ...PROD });
    const code = await platformCode(app, { maxUses: 1, expiresInMs: 3600_000 });
    expect((await reg(app, { username: 'Welkom', inviteCode: code })).status).toBe(201);
    expect((await reg(app, { username: 'Tweede', inviteCode: code })).status).toBe(400); // maxUses = 1
    const later = await platformCode(app, { maxUses: 5, expiresInMs: 60_000 });
    app.advance(61_000);
    expect((await reg(app, { username: 'TeLaat', inviteCode: later })).status).toBe(400); // verlopen
  });

  it('codes raden wordt per IP afgeremd, ook bij registratie met code', async () => {
    const app = createApp({ ...PROD, REG_MAX_PER_IP: '3' });
    const ip = '198.51.100.9';
    for (let i = 0; i < 3; i++) expect((await reg(app, { username: `Raden${i}`, inviteCode: `XXXXX-0000${i}` }, ip)).status).toBe(400);
    const code = await platformCode(app);
    expect((await reg(app, { username: 'Geblokt', inviteCode: code }, ip)).status).toBe(429);
    // Een ander netwerk heeft er geen last van.
    expect((await reg(app, { username: 'AnderNet', inviteCode: code }, '198.51.100.10')).status).toBe(201);
  });

  it('onder 16 met uitnodiging: wachtstatus, geen spel-data, geen zelfgoedkeuring', async () => {
    const app = createApp({ ...PROD });
    const code = await platformCode(app);
    const r = await reg(app, { username: 'Jongere', inviteCode: code, under16: true, parentEmail: 'ouder@example.org' });
    expect(r.status).toBe(201);
    expect(r.body.pending).toBe(true);
    const token = r.body.token as string;
    expect((await app.api('GET', '/api/grades', { token })).status).toBe(403);
    expect((await app.api('GET', '/api/collection', { token })).status).toBe(403);
    // De koppelcode (die het kind kent) keurt via de publieke route niets goed.
    const claim = await app.api('POST', '/api/consent/claim-code', { token, idem: idem() });
    const decide = await app.api('POST', '/api/consent/decide', { idem: idem(), body: { token: claim.body.claimCode, decision: 'approve' } });
    expect(decide.status).not.toBe(200);
    const u = app.db.db.prepare("SELECT status FROM users WHERE username = 'Jongere'").get() as { status: string };
    expect(u.status).toBe('pending_parent_approval');
  });
});
