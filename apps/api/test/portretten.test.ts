/** Ronde 15: spelersfoto's via de eigen proxy — alleen met PLAYER_PHOTOS=true, alleen ingelogd, alleen geregistreerde bestanden. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { REAL_PLAYERS } from '../src/engine.ts';
import { createApp, platformCode, register } from './helpers.ts';

const withPhoto = REAL_PLAYERS.find((p) => p.photo)!;
const withoutPhoto = REAL_PLAYERS.find((p) => !p.photo)!;

describe('portret-proxy', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('uit (standaard): 404, ook ingelogd', async () => {
    const app = createApp();
    const u = await register(app, 'Kijker', await platformCode(app));
    expect((await app.api('GET', `/api/portrait/${withPhoto.qid}`, { token: u.token })).status).toBe(404);
    expect((await app.api('GET', '/api/config')).body.playerPhotos).toBe(false);
  });

  it('aan: zonder sessie 401; alleen spelers uit het register; haalt exact het geregistreerde bestand op', async () => {
    const app = createApp({ PLAYER_PHOTOS: 'true' });
    expect((await app.api('GET', '/api/config')).body.playerPhotos).toBe(true);
    expect((await app.api('GET', `/api/portrait/${withPhoto.qid}`)).status).toBe(401);
    const u = await register(app, 'Kijker2', await platformCode(app));
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([0xff, 0xd8, 0xff]), { headers: { 'Content-Type': 'image/jpeg' } }));
    vi.stubGlobal('fetch', fetchMock);
    const ok = await app.api('GET', `/api/portrait/${withPhoto.qid}`, { token: u.token }).catch(() => null);
    // De test-helper parseert JSON; voor een afbeelding controleren we de aanroep naar Commons.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = String((fetchMock.mock.calls[0] as unknown[])[0]);
    expect(url.startsWith('https://commons.wikimedia.org/wiki/Special:FilePath/')).toBe(true);
    expect(decodeURIComponent(url)).toContain(withPhoto.photo!.file.replace(/ /g, '_'));
    void ok;
    expect((await app.api('GET', `/api/portrait/${withoutPhoto.qid}`, { token: u.token })).status).toBe(404);
    expect((await app.api('GET', '/api/portrait/https%3A%2F%2Fevil.example', { token: u.token })).status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(1); // geen open proxy
  });
});
