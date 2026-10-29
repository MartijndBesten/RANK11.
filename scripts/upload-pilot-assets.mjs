#!/usr/bin/env node
/**
 * Upload only the RANK11 test web build to a private R2 bucket.
 * Existing hashed assets are preserved; index.html is uploaded last.
 * Run only after Cloudflare preflight and with the isolated test Worker secured.
 */
import { readdir, lstat } from 'node:fs/promises';
import { resolve, relative, join, sep } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const R2_BUCKET = 'rank11-test-web';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml',
  '.map': 'application/json',
};
export function contentType(key) {
  const match = key.match(/\.[a-z0-9]+$/i);
  const type = TYPES[match?.[0]?.toLowerCase() || ''];
  if (!type) throw new Error('Onbekend bestandstype in pilotbuild: ' + key);
  return type;
}
export async function listAssets(dir) {
  const root = resolve(dir);
  const out = [];
  async function walk(folder) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const file = join(folder, entry.name);
      const stat = await lstat(file);
      if (stat.isSymbolicLink()) throw new Error('Symlink in pilotbuild geweigerd.');
      if (stat.isDirectory()) await walk(file);
      else if (stat.isFile()) {
        const key = relative(root, file).split(sep).join('/');
        if (!key || key.startsWith('../') || key.includes('\\') || key.startsWith('/')) {
          throw new Error('Ongeldig R2-bestandspad.');
        }
        contentType(key);
        out.push({ key, file });
      }
    }
  }
  await walk(root);
  if (!out.some((x) => x.key === 'index.html')) throw new Error('Online webbuild zonder index.html.');
  return out.sort((a, b) => {
    if (a.key === 'index.html') return 1;
    if (b.key === 'index.html') return -1;
    return a.key.localeCompare(b.key);
  });
}
function put(objectPath, filepath, type, cwd) {
  return new Promise((resolvePut, rejectPut) => {
    const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx',
      ['wrangler', 'r2', 'object', 'put', objectPath, '--file', filepath,
        '--content-type', type, '--remote', '--cwd', 'apps/api'],
      { cwd, env: process.env, stdio: 'inherit' });
    child.once('error', rejectPut);
    child.once('close', (code) => code === 0 ? resolvePut() : rejectPut(
      new Error('R2-upload mislukt (exitcode ' + code + '). index.html mogelijk niet vervangen.')));
  });
}
export async function uploadPilotAssets(root = fileURLToPath(new URL('../', import.meta.url))) {
  const assets = await listAssets(join(root, 'apps/web/dist'));
  if (!process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_ACCOUNT_ID) {
    throw new Error('Cloudflare-credentials ontbreken; geen uploads.');
  }
  console.log('RANK11 synthetische pilot: ' + assets.length + ' bestanden; index.html altijd als laatste.');
  for (const asset of assets) {
    await put(R2_BUCKET + '/' + asset.key, asset.file, contentType(asset.key), root);
  }
  console.log('Private R2-upload gereed; online verificatie is nog verplicht.');
}
if (process.argv[1]?.endsWith('upload-pilot-assets.mjs')) {
  uploadPilotAssets().catch((error) => {
    console.error('RANK11 asset-upload gestopt:', error.message);
    process.exitCode = 1;
  });
}
