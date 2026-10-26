/** Ronde 5: economie v3 (clubniveau als bron van Goudpacks) en speluitleg per gebruiker. */
import { describe, expect, it } from 'vitest';
import { createApp, idem, platformCode, register } from './helpers.ts';

const grade = (i: number, value = 9) => ({ subjectId: `vak${i}`, testName: `Toets ${i}`, value, weight: 1, date: '2026-10-20' });

describe('economie v3 op de server', () => {
  it('clubniveau 2 geeft één Goudpack (voortgangsbeloning), zichtbaar in de kluis en als ongeopende pack', async () => {
    const app = createApp();
    const u = await register(app, 'Niveau', await platformCode(app));
    // Een 9 = 110 XP; na de derde (330 XP) is niveau 2 (250 XP) bereikt.
    for (let i = 1; i <= 3; i++) await app.api('POST', '/api/grades', { token: u.token, idem: idem(), body: grade(i) });
    const rows = app.db.db.prepare(`SELECT key, kind, pack_id FROM progress_grants WHERE user_id = ? AND kind = 'level'`).all(u.id);
    expect(rows).toEqual([{ key: 'pr-niveau:2', kind: 'level', pack_id: 'gold' }]);
    const packs = await app.api('GET', '/api/packs', { token: u.token });
    expect(packs.body.unopened.filter((p: { packId: string; source: string }) => p.packId === 'gold' && p.source === 'progress')).toHaveLength(1);
    const vault = await app.api('GET', '/api/vault', { token: u.token });
    expect(vault.body.items.flatMap((x: { progress: { kind: string }[] }) => x.progress).filter((p: { kind: string }) => p.kind === 'level')).toHaveLength(1);
    // Nog een cijfer: geen tweede niveaubeloning voor hetzelfde niveau.
    await app.api('POST', '/api/grades', { token: u.token, idem: idem(), body: grade(4, 6) });
    expect(app.db.db.prepare(`SELECT COUNT(*) AS n FROM progress_grants WHERE user_id = ? AND kind = 'level'`).get(u.id)).toEqual({ n: 1 });
  });

  it('/api/config meldt de actuele economieversies', async () => {
    const res = await createApp().api('GET', '/api/config');
    expect(res.body.versions).toMatchObject({ rewards: '2026.10-haalbaar.1', progress: '2026.10-voortgang.2', motivation: '2026.10-motivatie.4' });
  });
});

describe('speluitleg per gebruiker', () => {
  it('standaard aan en niets gezien; bijwerken, valideren en alleen voor jezelf', async () => {
    const app = createApp();
    const code = await platformCode(app, { maxUses: 5 });
    const a = await register(app, 'Uitleg', code);
    const b = await register(app, 'Ander', code);
    expect((await app.api('GET', '/api/settings', { token: a.token })).body.settings).toEqual({ tips: true, tipsSeen: [] });
    const put = await app.api('PUT', '/api/settings', { token: a.token, idem: idem(), body: { tipsSeen: ['kluis', 'packs', 'kluis'] } });
    expect(put.body.settings).toEqual({ tips: true, tipsSeen: ['kluis', 'packs'] });
    await app.api('PUT', '/api/settings', { token: a.token, idem: idem(), body: { tips: false } });
    expect((await app.api('GET', '/api/settings', { token: a.token })).body.settings).toEqual({ tips: false, tipsSeen: ['kluis', 'packs'] });
    // B heeft eigen instellingen.
    expect((await app.api('GET', '/api/settings', { token: b.token })).body.settings).toEqual({ tips: true, tipsSeen: [] });
    // Ongeldige invoer.
    for (const body of [{ tips: 'ja' }, { tipsSeen: 'kluis' }, { tipsSeen: ['<script>'] }, { tipsSeen: Array.from({ length: 41 }, (_, i) => `t${i}`) }]) {
      expect((await app.api('PUT', '/api/settings', { token: a.token, idem: idem(), body })).status).toBe(400);
    }
    expect((await app.api('GET', '/api/settings')).status).toBe(401);
  });
});
