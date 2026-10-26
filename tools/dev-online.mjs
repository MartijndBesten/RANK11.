#!/usr/bin/env node
/**
 * Lokale online-stack: API (wrangler dev --local, D1 + Durable Objects in miniflare) op :8787.
 * De web-app (npm run dev) praat via de Vite-proxy /api met deze server.
 *
 *   node tools/dev-online.mjs            # hergebruikt de lokale database in .wrangler/online
 *   node tools/dev-online.mjs --fresh    # nieuwe, lege database (nieuwe map; oude blijft staan)
 *
 * Maakt een platformuitnodigingscode (50 accounts, 30 dagen) en print die. Alleen synthetische testaccounts.
 */
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const api = fileURLToPath(new URL('../apps/api/', import.meta.url));
const fresh = process.argv.includes('--fresh');
const persist = fresh ? `.wrangler/online-${Date.now()}` : '.wrangler/online';
const wrangler = (...args) => execFileSync('npx', ['wrangler', ...args, '--env', 'dev', '--persist-to', persist], { cwd: api, stdio: ['ignore', 'pipe', 'inherit'] }).toString();

wrangler('d1', 'migrations', 'apply', 'DB', '--local');
const invite = JSON.parse(execFileSync('node', ['scripts/platform-invite.mjs', '50', String(24 * 30), '--json'], { cwd: api }).toString());
wrangler('d1', 'execute', 'DB', '--local', '--command', invite.sql);
writeFileSync(new URL('../apps/api/.wrangler/dev-invite.txt', import.meta.url), `${invite.code}\n`);
console.log(`\nPlatformcode voor testaccounts: ${invite.code}  (ook in apps/api/.wrangler/dev-invite.txt)\nDatabase: apps/api/${persist}${existsSync(api + persist) ? '' : ' (nieuw)'}\n`);
const child = spawn('npx', ['wrangler', 'dev', '--local', '--env', 'dev', '--persist-to', persist, '--port', '8787', '--ip', '127.0.0.1'], { cwd: api, stdio: 'inherit' });
process.on('SIGINT', () => child.kill('SIGINT'));
