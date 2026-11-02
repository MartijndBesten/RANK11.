/**
 * Spelersportretten (Wikimedia Commons) via een eigen proxy-route — alleen als beheer `PLAYER_PHOTOS=true`
 * zet. Standaard UIT: een vrije auteursrechtlicentie regelt niet het portretrecht van de speler
 * (zie docs/BEELDRECHTEN.md).
 *
 * Waarom een proxy en geen directe link naar upload.wikimedia.org:
 *  - de browsers van kinderen praten niet met een derde partij (geen IP-adressen/Referer naar Wikimedia);
 *  - alleen bestanden uit het licentieregister (catalogus, per speler één bestand) kunnen worden opgehaald —
 *    de route is geen open proxy;
 *  - resultaten worden in de Cloudflare-cache bewaard (Wikimedia wordt niet steeds opnieuw belast).
 * Alleen ingelogde accounts (route staat niet in PUBLIC).
 */
import { REAL_PLAYERS } from '../engine.ts';
import type { Env } from '../env.ts';
import { ApiError, type Ctx } from '../http.ts';

const UA = 'RANK11-portrait-proxy/1.0 (besloten gezinsapp; https://rank11.martijndenbesten.com)';
const byQid = new Map(REAL_PLAYERS.filter((p) => p.photo).map((p) => [p.qid, p.photo!]));

export function photosEnabled(env: Env): boolean {
  return env.PLAYER_PHOTOS === 'true';
}

/** Commons-URL voor een 480 px brede versie van het geregistreerde bestand. */
export function commonsThumbUrl(file: string): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file.replace(/ /g, '_'))}?width=480`;
}

export async function getPortrait(ctx: Ctx): Promise<Response> {
  if (!photosEnabled(ctx.env)) throw new ApiError(404, 'not_found', 'Niet gevonden.');
  const qid = String(ctx.params.qid ?? '');
  const photo = /^Q\d{1,12}$/.test(qid) ? byQid.get(qid) : undefined;
  if (!photo) throw new ApiError(404, 'not_found', 'Niet gevonden.');
  const upstream = commonsThumbUrl(photo.file);
  const cache = (globalThis as { caches?: { default?: Cache } }).caches?.default;
  const key = new Request(upstream);
  const hit = cache ? await cache.match(key) : undefined;
  const res = hit ?? await fetch(upstream, { headers: { 'User-Agent': UA }, redirect: 'follow' });
  const type = res.headers.get('Content-Type') ?? '';
  if (!res.ok || !/^image\/(jpeg|png|webp)$/.test(type.split(';')[0]!.trim())) throw new ApiError(404, 'not_found', 'Niet gevonden.');
  if (!hit && cache) await cache.put(key, new Response(res.clone().body, { headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=2592000' } }));
  return new Response(res.body, {
    headers: {
      'Content-Type': type,
      'Cache-Control': 'private, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
      // Naamsvermelding (CC BY/BY-SA): ook in de header, naast de vermelding in de app.
      'X-Image-Credit': encodeURIComponent(`${photo.artist} — ${photo.license} — ${photo.page}`).slice(0, 400),
    },
  });
}
