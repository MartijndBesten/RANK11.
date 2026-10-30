/** Beheer van platformuitnodigingen via de API: aanmaken, lijst, intrekken. Alleen voor platform_admin. */
import { describe, expect, it } from 'vitest';
import { createApp, idem, platformCode, register } from './helpers.ts';

async function makeAdmin(app: ReturnType<typeof createApp>, name: string) {
  const u = await register(app, name, await platformCode(app));
  app.db.db.prepare("UPDATE users SET role = 'platform_admin' WHERE id = ?").run(u.id);
  return u;
}

describe('beheer van platformuitnodigingen', () => {
  it('alleen een platform_admin kan uitnodigingen beheren (anders 404)', async () => {
    const app = createApp();
    const speler = await register(app, 'GewoneSpeler', await platformCode(app));
    expect((await app.api('GET', '/api/admin/platform-invites', { token: speler.token })).status).toBe(404);
    expect((await app.api('POST', '/api/admin/platform-invites', { token: speler.token, idem: idem(), body: { maxUses: 3 } })).status).toBe(404);
  });

  it('admin maakt een code aan, die werkt voor registratie, en kan hem intrekken', async () => {
    const app = createApp();
    const admin = await makeAdmin(app, 'Beheerder');

    const created = await app.api('POST', '/api/admin/platform-invites', { token: admin.token, idem: idem(), body: { maxUses: 2, expiresInHours: 48, note: 'familie' } });
    expect(created.status).toBe(201);
    const code = created.body.code as string;
    expect(code).toBeTruthy();

    // De code werkt voor registratie.
    const nieuw = await register(app, 'FamilieLid', code);
    expect(nieuw.id).toBeTruthy();

    // De lijst toont de uitnodiging (zonder de code) met 1 gebruik.
    const list = await app.api('GET', '/api/admin/platform-invites', { token: admin.token });
    expect(list.status).toBe(200);
    const row = (list.body.invites as any[]).find((i) => i.note === 'familie');
    expect(row).toBeTruthy();
    expect(row.uses).toBe(1);
    expect(row.active).toBe(true);
    expect(JSON.stringify(list.body)).not.toContain(code); // code nooit teruggegeven in de lijst

    // Intrekken: daarna kan de code niet meer registreren.
    const rev = await app.api('POST', `/api/admin/platform-invites/${row.id}/revoke`, { token: admin.token, idem: idem() });
    expect(rev.status).toBe(200);
    const geweigerd = await app.api('POST', '/api/auth/register', { idem: idem(), body: { username: 'MagNiet', password: 'geheim-wachtwoord-1', inviteCode: code } });
    expect(geweigerd.status).toBe(400);

    const list2 = await app.api('GET', '/api/admin/platform-invites', { token: admin.token });
    const row2 = (list2.body.invites as any[]).find((i) => i.id === row.id);
    expect(row2.active).toBe(false);
    expect(row2.revokedAt).toBeTruthy();
  });
});
