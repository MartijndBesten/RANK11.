#!/usr/bin/env node
/**
 * Read-only Cloudflare resource gate for the isolated RANK11 synthetic pilot.
 * No resource creation, mutations, migrations or deploys. Never print tokens.
 */
import { readFile } from 'node:fs/promises';

const ACCOUNT_RE = /^[a-f0-9]{32}$/i;
const UUID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const ENDPOINT = 'https://api.cloudflare.com/client/v4/accounts';

function insist(ok, message) {
  if (!ok) throw new Error(message);
}
function block(config, heading) {
  const header = '[[env.test.' + heading + ']]';
  const start = config.indexOf(header);
  insist(start !== -1, 'De env.test-binding ' + heading + ' ontbreekt.');
  return config.slice(start + header.length).split(/\r?\n(?=\[)/)[0];
}
function field(section, name) {
  const line = section.split(/\r?\n/).find((part) => part.trimStart().startsWith(name + ' ='));
  const match = line?.match(/^[^\n]*=\s*"([^"]+)"/);
  insist(!!match, 'Het veld ' + name + ' ontbreekt of is ongeldig.');
  return match[1];
}
export function readPilotResources(toml) {
  const d1 = block(toml, 'd1_databases');
  const r2 = block(toml, 'r2_buckets');
  const databaseId = field(d1, 'database_id');
  const databaseName = field(d1, 'database_name');
  const bucketName = field(r2, 'bucket_name');
  insist(UUID_RE.test(databaseId) && !/^00000000-/.test(databaseId), 'Ongeldig of placeholder D1-ID.');
  insist(databaseName === 'rank11-test' && bucketName === 'rank11-test-web',
    'De bindings verwijzen niet naar de geïsoleerde RANK11-testresources.');
  const vars = toml.split('[env.test.vars]')[1]?.split(/\r?\n(?=\[)/)[0] ?? '';
  insist(/^\[env\.test\]/m.test(toml), 'Testomgeving ontbreekt.');
  insist(field(vars, 'PILOT_MODE') === 'true', 'De besloten pilot mag nooit de Basic-auth-afscherming overslaan.');
  const registration = field(vars, 'REGISTRATION_ENABLED');
  insist(registration === 'true' || registration === 'false',
    'Registratie moet expliciet true of false zijn, uitsluitend achter de pilottoegang.');
  insist(/workers_dev\s*=\s*false/.test(toml), 'workers.dev moet uitgeschakeld blijven.');
  return { databaseId, databaseName, bucketName };
}
export async function checkCloudflarePilot({ toml, accountId, token, fetchImpl = fetch } = {}) {
  insist(ACCOUNT_RE.test(accountId || ''), 'CLOUDFLARE_ACCOUNT_ID ontbreekt of is ongeldig.');
  insist(typeof token === 'string' && token.length > 15, 'CLOUDFLARE_API_TOKEN ontbreekt.');
  const { databaseId, databaseName, bucketName } = readPilotResources(toml);
  const root = ENDPOINT + '/' + accountId;
  async function get(path) {
    let response;
    try {
      response = await fetchImpl(root + path, {
        headers: { Authorization: 'Bearer ' + token },
        redirect: 'error',
        signal: AbortSignal.timeout(12000),
      });
    } catch {
      throw new Error('Cloudflare-API niet bereikbaar; vrijgave geweigerd.');
    }
    insist(response.ok, 'Cloudflare-API geeft HTTP ' + response.status + ' voor resourcecontrole.');
    const body = await response.json();
    insist(body?.success === true && body.result != null, 'Cloudflare-API bevestigt resource niet.');
    return body.result;
  }
  const db = await get('/d1/database/' + databaseId);
  insist(db.uuid === databaseId && db.name === databaseName,
    'D1-ID, databasenaam of eigendom is anders dan verwacht.');
  insist(db.jurisdiction === 'eu', 'D1 heeft geen aantoonbare EU-jurisdictie. WEUR is onvoldoende.');
  const bucket = await get('/r2/buckets/' + bucketName);
  insist(bucket.name === bucketName, 'De bedoelde R2-bucket is niet aantoonbaar aanwezig.');
  const managed = await get('/r2/buckets/' + bucketName + '/domains/managed');
  insist(managed.enabled === false, 'R2-bucket is publiek bereikbaar via r2.dev.');
  const custom = await get('/r2/buckets/' + bucketName + '/domains/custom');
  insist(Array.isArray(custom.domains), 'De lijst met R2-customdomains is niet te controleren.');
  insist(custom.domains.every((item) => item.enabled === false),
    'R2-bucket is publiek bereikbaar via een custom domain.');
  return { d1: databaseName, jurisdiction: db.jurisdiction,
    bucket: bucketName, bucketJurisdiction: bucket.jurisdiction || 'onbekend',
    publicR2: false };
}
if (process.argv[1]?.endsWith('cloudflare-pilot-preflight.mjs')) {
  const toml = await readFile(new URL('../apps/api/wrangler.toml', import.meta.url), 'utf8');
  try {
    const result = await checkCloudflarePilot({
      toml, accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
      token: process.env.CLOUDFLARE_API_TOKEN,
    });
    console.log('RANK11 PRE-FLIGHT GO (uitsluitend resourcecontrole):', JSON.stringify(result));
    console.log('GEEN deployment, databasemigratie of gehoste applicatietest uitgevoerd.');
  } catch (error) {
    console.error('RANK11 PRE-FLIGHT NO-GO:', error.message);
    process.exitCode = 1;
  }
}
