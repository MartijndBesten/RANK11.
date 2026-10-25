#!/usr/bin/env node
/**
 * Maakt een platformuitnodigingscode en print de SQL om alleen de HASH op te slaan.
 * De code zelf wordt nergens bewaard: geef hem direct aan de uitgenodigde.
 *
 * Gebruik:
 *   node scripts/platform-invite.mjs [maxGebruik=1] [geldigUren=72]
 *   # lokaal:   npx wrangler d1 execute DB --local --env dev --command "<SQL>"
 *   # test:     npx wrangler d1 execute DB --remote --env test --command "<SQL>"   (pas na uitrol)
 */
import { createHash, randomBytes, randomUUID } from 'node:crypto';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const maxUses = Math.max(1, Math.min(100, Number(process.argv[2] ?? 1) || 1));
const hours = Math.max(1, Math.min(24 * 30, Number(process.argv[3] ?? 72) || 72));

let raw = '';
while (raw.length < 10) {
  const b = randomBytes(1)[0];
  if (b >= 256 - (256 % ALPHABET.length)) continue;
  raw += ALPHABET[b % ALPHABET.length];
}
const code = `${raw.slice(0, 5)}-${raw.slice(5)}`;
// Zelfde hash als src/crypto.ts: sha256("invite:" + genormaliseerde code), hex.
const hash = createHash('sha256').update(`invite:${raw}`).digest('hex');
const now = Date.now();
const id = `pin_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
const sql = `INSERT INTO platform_invites (id, code_hash, expires_at, max_uses, uses, note, created_at) VALUES ('${id}', '${hash}', ${now + hours * 3600_000}, ${maxUses}, 0, 'cli', ${now});`;

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ code, sql }));
} else {
  console.log(`Code (alleen nu zichtbaar): ${code}`);
  console.log(`Geldig: ${hours} uur, maximaal ${maxUses}× te gebruiken.`);
  console.log('SQL:');
  console.log(sql);
}
