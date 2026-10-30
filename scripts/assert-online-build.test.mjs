import test from 'node:test';
import assert from 'node:assert/strict';
import { isOnlineOnlyBuild } from './assert-online-build.mjs';

test('online release requires the server-outage screen (online-only marker)', () => {
  const ok = 'RANK11. is tijdelijk niet bereikbaar — De online server reageert niet';
  assert.equal(isOnlineOnlyBuild(ok), true);
  assert.equal(isOnlineOnlyBuild('Demo zonder account'), false);
  assert.equal(isOnlineOnlyBuild('RANK11. is tijdelijk niet bereikbaar'), false);
});
