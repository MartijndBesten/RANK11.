// Controle op persoonsgegevens in de repository: e-mailadressen en Nederlandse telefoonnummers
// in alle getrackte tekstbestanden. Exit 1 bij een vondst. Draait mee met `npm test`.
// Aanleiding: docs/INCIDENT-2026-10-25-user-agent.md.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const BINARY = /\.(webp|png|jpe?g|gif|ico|pdf|woff2?|ttf|otf|zip|gz|mp3|mp4|wasm)$/i;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE = /(?:\+31|0031|\b0)[\s-]?(?:6[\s-]?\d{8}|[1-9]\d[\s-]?\d{7})\b/g;
const ALLOW_EMAIL = [/^noreply@anthropic\.com$/i, /@example\.(com|org|net|nl)$/i, /@localhost$/i];
// Bestanden waarvan regels bewust patronen bevatten (deze controle zelf).
const SKIP = new Set(['tools/check-pii.mjs']);

const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter((f) => f && !BINARY.test(f) && !SKIP.has(f));
const hits = [];
for (const file of files) {
  let text;
  try { text = readFileSync(file, 'utf8'); } catch { continue; }
  text.split('\n').forEach((line, i) => {
    for (const m of line.matchAll(EMAIL)) {
      // npm-pakketnamen met scope (bijv. @rank11/engine) en versies zijn geen e-mailadressen.
      if (ALLOW_EMAIL.some((re) => re.test(m[0]))) continue;
      hits.push(`${file}:${i + 1}: e-mailadres`);
    }
    for (const _ of line.matchAll(PHONE)) hits.push(`${file}:${i + 1}: telefoonnummer`);
  });
}
if (hits.length) {
  console.error(`Mogelijke persoonsgegevens gevonden (${hits.length}):\n${hits.slice(0, 50).join('\n')}`);
  process.exit(1);
}
console.log(`check:pii — ${files.length} bestanden gecontroleerd, geen e-mailadressen of telefoonnummers gevonden.`);
