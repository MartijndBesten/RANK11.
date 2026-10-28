/**
 * Publieke RANK11.-demo: serveert de statische demo-build uit een R2-bucket.
 * Geen servercode-logica, geen D1, geen cron. SPA-fallback naar index.html voor onbekende paden.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let key = decodeURIComponent(url.pathname.slice(1));
    if (key === '' || key.endsWith('/')) key += 'index.html';

    let obj = await env.ASSETS.get(key);
    // Onbekend pad zonder bestandsextensie: single-page app, dus geef index.html terug.
    if (!obj && !key.split('/').pop().includes('.')) obj = await env.ASSETS.get('index.html');
    if (!obj) return new Response('Niet gevonden', { status: 404 });

    const headers = new Headers();
    obj.writeHttpMetadata(headers); // content-type uit de bij upload opgeslagen metadata
    headers.set('etag', obj.httpEtag);
    headers.set('cache-control', key === 'index.html' ? 'no-cache' : 'public, max-age=86400');
    return new Response(obj.body, { headers });
  },
};
