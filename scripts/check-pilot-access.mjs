/** Read-only release gate: nooit accounts of leerlingdata aanmaken. */
const PILOT_HOST = 'rank11-test.martijndenbesten.com';
const PATHS = ['/', '/api/health', '/assets/__rank11_access_probe__.js', '/robots.txt'];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function validateOrigin(input) {
  const url = new URL(input);
  assert(url.protocol === 'https:' && url.hostname === PILOT_HOST
    && !url.port && !url.username && !url.password
    && (url.pathname === '/' || url.pathname === '')
    && !url.search && !url.hash,
  'Alleen de vaste HTTPS-testorigin is toegestaan.');
  return url.origin;
}

export async function checkPilotAccess(origin, {
  user = '', password = '', requireAuth = false, fetchImpl = fetch,
} = {}) {
  const base = validateOrigin(origin);
  const query = async (path, headers = {}) => fetchImpl(base + path, {
    method: 'GET', headers, redirect: 'manual', signal: AbortSignal.timeout(12000),
  });

  // De complete website, ook missende assets en /api/health, moet afgeschermd zijn.
  for (const path of PATHS) {
    const response = await query(path);
    assert(response.status === 401,
      `ONVEILIG: ${path} gaf HTTP ${response.status} zonder pilottoegang (verwacht 401).`);
    assert((response.headers.get('www-authenticate') || '').toLowerCase().startsWith('basic '),
      `Geen Basic-auth-challenge op ${path}.`);
    assert((response.headers.get('cache-control') || '').includes('no-store'),
      `Cache-Control no-store ontbreekt op ${path}.`);
    assert((response.headers.get('x-robots-tag') || '').includes('noindex'),
      `X-Robots-Tag noindex ontbreekt op ${path}.`);
  }

  if (requireAuth || user || password) {
    assert(user.length > 0 && password.length >= 32,
      'Pilot-secrets ontbreken of het wachtwoord is te kort.');
    const authorization = 'Basic ' + Buffer.from(user + ':' + password).toString('base64');
    const headers = { Authorization: authorization };
    for (const path of ['/', '/api/health']) {
      const response = await query(path, headers);
      assert(response.status === 200, `Met pilottoegang gaf ${path} HTTP ${response.status}.`);
      assert((response.headers.get('cache-control') || '').includes('no-store'),
        `Cache-Control no-store ontbreekt op ${path}.`);
      assert((response.headers.get('x-robots-tag') || '').includes('noindex'),
        `X-Robots-Tag noindex ontbreekt op ${path}.`);
      if (path === '/api/health') {
        const data = await response.json();
        assert(data && data.ok === true, 'De API-health heeft geen geldige {ok:true}-respons.');
      } else {
        assert((response.headers.get('content-type') || '').includes('text/html'),
          'De geauthenticeerde startpagina is geen HTML.');
      }
    }
  }

  return { origin: base, publicRoutesProtected: PATHS.length, authenticated: !!(user && password) };
}

if (process.argv[1]?.endsWith('check-pilot-access.mjs')) {
  checkPilotAccess(process.env.PILOT_URL || 'https://' + PILOT_HOST, {
    user: process.env.PILOT_ACCESS_USER || '',
    password: process.env.PILOT_ACCESS_PASSWORD || '',
    requireAuth: process.env.PILOT_REQUIRE_AUTH === '1',
  }).then((result) => {
    console.log(`GESLAAGD: ${result.origin}, ${result.publicRoutesProtected} anonieme routes beschermd; geauthenticeerde controle: ${result.authenticated ? 'ja' : 'nee'}.`);
  }).catch((error) => {
    console.error('RANK11 PILOT NIET VRIJGEGEVEN:', error.message);
    process.exitCode = 1;
  });
}
