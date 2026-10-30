/** Feedback van testgebruikers: aanmaken door een speler, bekijken/afhandelen door een beheerder. */
import { describe, expect, it } from 'vitest';
import { createApp, idem, platformCode, register } from './helpers.ts';

async function makeAdmin(app: ReturnType<typeof createApp>, name: string) {
  const u = await register(app, name, await platformCode(app));
  app.db.db.prepare("UPDATE users SET role = 'platform_admin' WHERE id = ?").run(u.id);
  return u;
}

describe('feedback', () => {
  it('een speler kan feedback sturen; een ongeldige soort wordt geweigerd', async () => {
    const app = createApp();
    const u = await register(app, 'Tester', await platformCode(app));
    expect((await app.api('POST', '/api/feedback', { token: u.token, idem: idem(), body: { kind: 'idee', message: 'Leuk idee: donkere modus' } })).status).toBe(201);
    expect((await app.api('POST', '/api/feedback', { token: u.token, idem: idem(), body: { kind: 'onzin', message: 'x' } })).status).toBe(400);
    expect((await app.api('POST', '/api/feedback', { token: u.token, idem: idem(), body: { kind: 'idee', message: '' } })).status).toBe(400);
  });

  it('alleen een beheerder leest en handelt meldingen af', async () => {
    const app = createApp();
    const admin = await makeAdmin(app, 'Baas');
    const speler = await register(app, 'Melder', await platformCode(app));
    await app.api('POST', '/api/feedback', { token: speler.token, idem: idem(), body: { kind: 'werkt-niet', message: 'Knop reageert niet' } });

    expect((await app.api('GET', '/api/admin/feedback', { token: speler.token })).status).toBe(404);
    const list = await app.api('GET', '/api/admin/feedback', { token: admin.token });
    expect(list.status).toBe(200);
    const row = (list.body.feedback as any[])[0];
    expect(row.message).toBe('Knop reageert niet');
    expect(row.status).toBe('nieuw');

    const upd = await app.api('POST', `/api/admin/feedback/${row.id}/status`, { token: admin.token, idem: idem(), body: { status: 'afgehandeld' } });
    expect(upd.status).toBe(200);
    const list2 = await app.api('GET', '/api/admin/feedback', { token: admin.token });
    expect((list2.body.feedback as any[])[0].status).toBe('afgehandeld');
  });
});
