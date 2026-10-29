import test from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { contentType, listAssets, R2_BUCKET } from './upload-pilot-assets.mjs';

test('de R2-bucket is vast de geïsoleerde testbucket', () => {
  assert.equal(R2_BUCKET, 'rank11-test-web');
});
test('MIME-types zijn geschikt voor frontendassets', () => {
  assert.match(contentType('index.html'), /text\/html/);
  assert.match(contentType('assets/app.js'), /javascript/);
  assert.match(contentType('assets/font.woff2'), /font\/woff2/);
  assert.throws(() => contentType('token.unknown'), /Onbekend/);
});
test('index.html wordt als laatste geüpload', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'rank11-assets-'));
  try {
    await mkdir(join(dir, 'assets'));
    await writeFile(join(dir, 'index.html'), '<html></html>');
    await writeFile(join(dir, 'assets', 'app.js'), 'console.log("synthetic");');
    await writeFile(join(dir, 'assets', 'style.css'), 'body{}');
    const found = await listAssets(dir);
    assert.deepEqual(found.map((x) => x.key), ['assets/app.js', 'assets/style.css', 'index.html']);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
test('geen index of symlinks in upload', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'rank11-assets-'));
  t.after(async () => rm(dir, { recursive: true, force: true }));
  await writeFile(join(dir, 'app.js'), 'x');
  await assert.rejects(listAssets(dir), /zonder index.html/);
  await writeFile(join(dir, 'index.html'), 'x');
  await symlink(join(dir, 'index.html'), join(dir, 'alias.html'));
  await assert.rejects(listAssets(dir), /Symlink/);
});
