// Schrijft apps/web/src/portraits/manifest.json: welke spelers een portret in public/portraits hebben.
// Draai na iedere (deel)batch: node tools/portretten/manifest.mjs
import { readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../apps/web/', import.meta.url));
const ids = readdirSync(`${root}public/portraits`).filter((f) => f.endsWith('.webp')).map((f) => f.slice(0, -5)).sort();
writeFileSync(`${root}src/portraits/manifest.json`, `${JSON.stringify(ids)}\n`);
console.log(`${ids.length} portretten in manifest`);
