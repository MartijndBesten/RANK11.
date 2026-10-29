import test from 'node:test';
import assert from 'node:assert/strict';
import { checkPilotAccess, validateOrigin } from './check-pilot-access.mjs';

const origin = 'https://rank11-test.martijndenbesten.com';
const password = 'x'.repeat(32);
function fakeFetch(url, init) {
  const authed = !!init.headers.Authorization;
  const path = new URL(url).pathname;
  const headers = {
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow',
    ...(authed ? { 'Content-Type': path === '/' ? 'text/html' : 'application/json' }
              : { 'WWW-Authenticate': 'Basic realm="RANK11 pilot"' }),
  };
  return Promise.resolve(new Response(authed ? (path === '/' ? '<html></html>' : '{"ok":true}') : 'private',
    { status: authed ? 200 : 401, headers }));
}

test('de check staat uitsluitend de vaste test-URL toe', () => {
  assert.equal(validateOrigin(origin + '/'), origin);
  for (const input of ['http://rank11-test.martijndenbesten.com',
    'https://rank11-demo.martijndenbesten.com',
    origin + '/api/health',
    origin + '?unexpected=query']) {
    assert.throws(() => validateOrigin(input));
  }
});
test('vier anonieme routes zijn alleen geslaagd als ze allemaal 401 geven', async () => {
  const result = await checkPilotAccess(origin, { fetchImpl: fakeFetch });
  assert.equal(result.publicRoutesProtected, 4);
  assert.equal(result.authenticated, false);
});
test('een publiek bereikbare healthroute faalt gesloten', async () => {
  await assert.rejects(checkPilotAccess(origin, {
    fetchImpl: (url, init) => url.endsWith('/api/health')
      ? Promise.resolve(new Response('{"ok":true}', { status: 200 }))
      : fakeFetch(url, init),
  }), /ONVEILIG/);
});
test('authenticatie controleert ook website en API-health', async () => {
  const result = await checkPilotAccess(origin, {
    user: 'pilot', password, requireAuth: true, fetchImpl: fakeFetch,
  });
  assert.equal(result.authenticated, true);
});
test('ontbrekende pilotsecrets zijn geen geslaagde release', async () => {
  await assert.rejects(checkPilotAccess(origin, {
    requireAuth: true, fetchImpl: fakeFetch,
  }), /secrets ontbreken/);
});
