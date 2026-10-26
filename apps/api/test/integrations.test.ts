/** Koppelarchitectuur: provider-lijst, voorbeeldbron koppelen/synchroniseren/ontkoppelen, dedup, isolatie, Magister pending. */
import { describe, expect, it } from 'vitest';
import { createApp, idem, platformCode, register, type TestApp, type TestUser } from './helpers.ts';
import { encryptToken, decryptToken } from '../src/modules/integrations/crypto.ts';
import { mapExternalGrade } from '../src/modules/integrations/mapping.ts';
import type { SubjectAlias } from '../src/engine.ts';

const subjects: SubjectAlias[] = [{ id: 'wis', aliases: ['WI', 'wiskunde'] }, { id: 'en', aliases: ['EN', 'engels'] }];
const grades = (app: TestApp, u: TestUser) => (app.db.db.prepare('SELECT subject_id, value, source, status, external_ref FROM grades WHERE user_id = ? AND deleted_at IS NULL').all(u.id)) as { subject_id: string; value: number; source: string; status: string; external_ref: string | null }[];
const rewardCount = (app: TestApp, u: TestUser) => (app.db.db.prepare("SELECT COUNT(*) AS n FROM reward_grants WHERE user_id = ? AND kind = 'initial'").get(u.id) as { n: number }).n;

describe('token-encryptie', () => {
  it('encrypt → decrypt geeft hetzelfde token; de versleutelde vorm bevat het token niet', async () => {
    const key = 'geheime-sleutel';
    const blob = await encryptToken(key, 'refresh-abc-123');
    expect(blob).not.toContain('refresh-abc-123');
    expect(await decryptToken(key, blob)).toBe('refresh-abc-123');
    await expect(decryptToken('andere-sleutel', blob)).rejects.toBeDefined();
  });
});

describe('mapping van een extern cijfer', () => {
  it('zet komma-waarde en vak om; markeert niet-numeriek en onbekend vak', () => {
    const base = { externalRef: 'x', subjectRaw: 'Wiskunde', value: '6,8', weight: 2, date: '2026-10-10', verified: false };
    const ok = mapExternalGrade(base, subjects, '2026-10-26');
    expect(ok).toEqual({ ok: true, grade: { subjectId: 'wis', value: 6.8, weight: 2, date: '2026-10-10', testName: 'Cijfer 2026-10-10', externalRef: 'x', verified: false } });
    expect(mapExternalGrade({ ...base, value: 'V' }, subjects, '2026-10-26').ok).toBe(false);
    expect(mapExternalGrade({ ...base, subjectRaw: 'Grieks' }, subjects, '2026-10-26').ok).toBe(false);
    // Geverifieerde bron blijft geverifieerd in de mapping.
    expect((mapExternalGrade({ ...base, verified: true }, subjects, '2026-10-26') as { grade: { verified: boolean } }).grade.verified).toBe(true);
  });
});

describe('koppelingen-endpoints', () => {
  it('lijst toont de voorbeeldbron (beschikbaar) en Magister (nog niet beschikbaar)', async () => {
    const app = createApp();
    const u = await register(app, 'Koppel', await platformCode(app));
    const res = await app.api('GET', '/api/integrations', { token: u.token });
    const byId = Object.fromEntries(res.body.providers.map((p: { id: string }) => [p.id, p]));
    expect(byId.sample).toMatchObject({ available: true, link: { linked: false } });
    expect(byId.magister).toMatchObject({ available: false, link: { linked: false } });
    expect(byId.magister.note).toMatch(/officieel|toegestane|school|partner/i);
  });

  it('Magister koppelen of synchroniseren kan niet (409 requires_authorization)', async () => {
    const app = createApp();
    const u = await register(app, 'MagPoging', await platformCode(app));
    const c = await app.api('POST', '/api/integrations/magister/connect', { token: u.token, idem: idem() });
    expect(c.status).toBe(409);
    expect(c.body.error.code).toBe('requires_authorization');
    expect((await app.api('POST', '/api/integrations/magister/sync', { token: u.token, idem: idem() })).status).toBe(409);
  });

  it('voorbeeldbron: koppelen, synchroniseren (cijfers komen binnen), status, ontkoppelen', async () => {
    const app = createApp();
    const u = await register(app, 'Sample', await platformCode(app));
    // Koppelen haalt de cijfers meteen op (één keer koppelen, daarna bijwerken).
    const connect = await app.api('POST', '/api/integrations/sample/connect', { token: u.token, idem: idem() });
    expect(connect.status).toBe(201);
    expect(connect.body.result).toMatchObject({ created: 5, duplicate: 0, invalid: 0 });
    // Token staat versleuteld in de DB en wordt nooit teruggegeven.
    const stored = app.db.db.prepare('SELECT token_enc FROM integration_links WHERE user_id = ?').get(u.id) as { token_enc: string };
    expect(stored.token_enc).toContain(':');
    const status = await app.api('GET', '/api/integrations/sample', { token: u.token });
    expect(JSON.stringify(status.body)).not.toContain(stored.token_enc);
    const g = grades(app, u);
    expect(g).toHaveLength(5);
    expect(g.every((x) => x.source === 'import' && x.status === 'self' && x.external_ref?.startsWith('sample:'))).toBe(true);

    // Opnieuw synchroniseren: alles al aanwezig, geen tweede cijfer en geen dubbele beloning.
    const rewards1 = rewardCount(app, u);
    const again = await app.api('POST', '/api/integrations/sample/sync', { token: u.token, idem: idem() });
    expect(again.body.result).toMatchObject({ created: 0, duplicate: 5 });
    expect(grades(app, u)).toHaveLength(5);
    expect(rewardCount(app, u)).toBe(rewards1);

    // Ontkoppelen wist de koppeling en het token; cijfers blijven.
    expect((await app.api('DELETE', '/api/integrations/sample', { token: u.token })).status).toBe(200);
    expect(app.db.db.prepare('SELECT COUNT(*) AS n FROM integration_links WHERE user_id = ?').get(u.id)).toEqual({ n: 0 });
    expect(grades(app, u)).toHaveLength(5);
  });

  it('isolatie: zonder sessie 401; een ander account ziet of raakt jouw koppeling niet', async () => {
    const app = createApp();
    const code = await platformCode(app, { maxUses: 5 });
    const a = await register(app, 'Aiso', code);
    const b = await register(app, 'Biso', code);
    await app.api('POST', '/api/integrations/sample/connect', { token: a.token, idem: idem() });
    expect((await app.api('GET', '/api/integrations')).status).toBe(401);
    // B ziet zijn eigen (lege) koppeling, niet die van A.
    expect((await app.api('GET', '/api/integrations/sample', { token: b.token })).body.link).toEqual({ linked: false });
    // B ontkoppelen raakt A niet.
    await app.api('DELETE', '/api/integrations/sample', { token: b.token });
    expect((await app.api('GET', '/api/integrations/sample', { token: a.token })).body.link.linked).toBe(true);
  });
});
