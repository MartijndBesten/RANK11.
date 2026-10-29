import test from 'node:test';
import assert from 'node:assert/strict';
import { isOnlineOnlyBuild } from './assert-online-build.mjs';

test('online release requires both server outage screen and invite-only access', () => {
  const ok = 'RANK11. is tijdelijk niet bereikbaar Toegang uitsluitend voor uitgenodigde accounts';
  assert.equal(isOnlineOnlyBuild(ok), true);
  assert.equal(isOnlineOnlyBuild('Demo zonder account'), false);
  assert.equal(isOnlineOnlyBuild('RANK11. is tijdelijk niet bereikbaar'), false);
});
