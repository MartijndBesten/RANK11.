import test from 'node:test';
import assert from 'node:assert/strict';
import { checkCloudflarePilot, readPilotResources } from './cloudflare-pilot-preflight.mjs';

const toml = [
  'workers_dev = false',
  '[env.test]',
  'name = "rank11-api-test"',
  '[env.test.vars]',
  'PILOT_MODE = "true"',
  'REGISTRATION_ENABLED = "false"',
  '[[env.test.d1_databases]]',
  'database_name = "rank11-test"',
  'database_id = "c4fd7b8f-59b6-4fd6-a53d-36185e0300de"',
  '[[env.test.r2_buckets]]',
  'bucket_name = "rank11-test-web"',
].join('\n');
const accountId = 'a'.repeat(32);
const token = 'example-token-value-only-for-test';
function mockFetch(url) {
  let result;
  if (url.includes('/d1/database/')) {
    result = { uuid: 'c4fd7b8f-59b6-4fd6-a53d-36185e0300de', name: 'rank11-test', jurisdiction: 'eu' };
  } else if (url.endsWith('/domains/managed')) {
    result = { enabled: false };
  } else if (url.endsWith('/domains/custom')) {
    result = { domains: [] };
  } else {
    result = { name: 'rank11-test-web', jurisdiction: 'eu' };
  }
  return Promise.resolve(new Response(JSON.stringify({ success: true, result }), {
    status: 200, headers: { 'content-type': 'application/json' },
  }));
}
function opts(fetchImpl = mockFetch, config = toml) {
  return { toml: config, accountId, token, fetchImpl };
}
test('bindings zijn expliciet beperkt tot RANK11 test', () => {
  assert.equal(readPilotResources(toml).bucketName, 'rank11-test-web');
  assert.throws(() => readPilotResources(toml.replace('rank11-test-web', 'andere-bucket')), /geïsoleerde/);
  assert.throws(() => readPilotResources(toml.replace('workers_dev = false', 'workers_dev = true')), /workers.dev/);
  assert.equal(readPilotResources(toml.replace('REGISTRATION_ENABLED = "false"', 'REGISTRATION_ENABLED = "true"')).databaseName, 'rank11-test');
  assert.throws(() => readPilotResources(toml.replace('PILOT_MODE = "true"', 'PILOT_MODE = "false"')), /Basic-auth/);
  assert.throws(() => readPilotResources(toml.replace('REGISTRATION_ENABLED = "false"', 'REGISTRATION_ENABLED = "on"')), /true of false/);
});
test('EU-D1 en private R2 staan resourcecheck toe', async () => {
  const r = await checkCloudflarePilot(opts());
  assert.equal(r.jurisdiction, 'eu');
  assert.equal(r.publicR2, false);
});
test('regiohint WEUR zonder EU-jurisdictie is NO-GO', async () => {
  await assert.rejects(checkCloudflarePilot(opts(async (url) => {
    const response = await mockFetch(url);
    const body = await response.json();
    if (url.includes('/d1/database/')) { delete body.result.jurisdiction; body.result.running_in_region = 'WEUR'; }
    return new Response(JSON.stringify(body), { status: 200 });
  })), /EU-jurisdictie/);
});
test('elke publieke R2-toegang is NO-GO', async () => {
  await assert.rejects(checkCloudflarePilot(opts(async (url) => {
    const response = await mockFetch(url);
    const body = await response.json();
    if (url.endsWith('/domains/managed')) body.result.enabled = true;
    return new Response(JSON.stringify(body), { status: 200 });
  })), /r2.dev/);
  await assert.rejects(checkCloudflarePilot(opts(async (url) => {
    const response = await mockFetch(url);
    const body = await response.json();
    if (url.endsWith('/domains/custom')) body.result.domains = [{ domain: 'example.invalid', enabled: true }];
    return new Response(JSON.stringify(body), { status: 200 });
  })), /custom domain/);
});
test('ontbrekende toegang en Cloudflare-fouten zijn NO-GO', async () => {
  await assert.rejects(checkCloudflarePilot({ toml, accountId, token: '' }), /TOKEN/);
  await assert.rejects(checkCloudflarePilot(opts(async () => new Response('{}', { status: 403 }))), /HTTP 403/);
});
