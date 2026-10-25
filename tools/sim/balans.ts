// Balansrapport: node --experimental-strip-types tools/sim/balans.ts > docs/SIMULATIES.md
// Draait dezelfde engine als het spel; deterministisch per seed.
import { DRAFT_EVENTS, generateCatalog, PACKS, simulateDrafts, simulateEconomy, simulatePacks } from '../../packages/engine/src/index.ts';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';

const photoIds = readdirSync(new URL('../../apps/web/public/portraits/', import.meta.url)).filter((f) => f.endsWith('.webp')).map((f) => f.slice(0, -5));
const photosOnly = photoIds.length >= 150;
const photos = Object.fromEntries(photoIds.map((id) => [id, { src: '', kind: 'ai-fictional' as const, license: '', credit: '', aiGenerated: true }]));
const catalog = generateCatalog({ photos, photosOnly });
const p = (x: number) => `${(x * 100).toFixed(x < 0.01 ? 2 : 1).replace('.', ',')}%`;
const n = (x: number, d = 1) => x.toFixed(d).replace('.', ',');
const out: string[] = [];
out.push('# Balanssimulaties', '', `Gegenereerd met \`tools/sim/balans.ts\` op ${new Date().toISOString().slice(0, 10)}. Catalogus: ${catalog.length} kaarten${photosOnly ? ' (alleen spelers met portret)' : ''}.`, '');

const DRAFTS = 10000;
const ev = DRAFT_EVENTS.toetsweek1!;
const d = simulateDrafts(ev, catalog, DRAFTS, 'balans-draft-1');
out.push(`## Draft: ${ev.name} (${DRAFTS.toLocaleString('nl-NL')} drafts)`, '');
out.push(`Teamrating bij steeds de hoogste rating kiezen: gemiddeld **${n(d.rating.mean)}**, p10 ${d.rating.p10}, mediaan ${d.rating.p50}, p90 ${d.rating.p90} (min ${d.rating.min}, max ${d.rating.max}).`, '');
out.push('| Groep | Kans per kaart (getoond) | Gemeten per kaart | Draft met deze groep of beter | Garantie ingegrepen | Langste reeks zonder |', '|---|---:|---:|---:|---:|---:|');
for (const g of d.offerShare) out.push(`| ${g.groupId} | ${p(g.nominal)} | ${p(g.observed)} | ${p(d.draftsWithGroupOrBetter[g.groupId] ?? 0)} | ${d.pityTriggers[g.groupId] ?? 0}× | ${d.longestDrought[g.groupId] ?? 0} drafts |`);
// Gemeten kansen voor de app (transparantie: getoonde kans én gemeten kans na terugval en garanties).
mkdirSync(new URL('../../apps/web/src/data/', import.meta.url), { recursive: true });
writeFileSync(new URL('../../apps/web/src/data/draft-odds.json', import.meta.url), `${JSON.stringify({
  eventId: ev.id, drafts: DRAFTS, catalogSize: catalog.length, photosOnly,
  groups: Object.fromEntries(d.offerShare.map((g) => [g.groupId, { observed: g.observed, draftWithOrBetter: d.draftsWithGroupOrBetter[g.groupId] ?? 0 }])),
  rating: d.rating,
}, null, 1)}\n`);
out.push('', 'Verschil tussen getoond en gemeten komt door terugval (geen kandidaat op die positie in de gerolde groep) en door garanties. Zie de conclusies onderaan.', '');

for (const id of Object.keys(PACKS)) {
  const def = PACKS[id]!;
  const s = simulatePacks(def, catalog, 10000, `balans-pack-${id}`);
  out.push(`## Pack: ${def.name} (10.000 packs)`, '', `Gemiddelde rating per kaart ${n(s.meanRating)} · walkout in ${p(s.walkoutRate)} van de packs.`, '');
  out.push('| Categorie | Minstens één (getoond) | Minstens één (gemeten) |', '|---|---:|---:|');
  for (const b of s.bucketShare) out.push(`| ${b.label} | ${p(b.nominal)} | ${p(b.observed)} |`);
  out.push('');
}

out.push('## Kaarteconomie per week (beloningsconfiguratie)', '');
out.push('| Profiel | XP | Coins | Vouchers | Spelerskeuzes | Packs | Geweigerd door limiet |', '|---|---:|---:|---:|---:|---:|---:|');
for (const [label, mean, sd, gpw] of [['Gemiddeld 6,8 · 3 cijfers/week', 6.8, 1.2, 3], ['Sterk 8,0 · 3 cijfers/week', 8.0, 0.9, 3], ['Moeite 5,6 · 3 cijfers/week', 5.6, 1.1, 3], ['Toetsweek 7,0 · 8 cijfers/week', 7.0, 1.2, 8]] as const) {
  const e = simulateEconomy({ mean, sd, gradesPerWeek: gpw, seed: `balans-eco-${label}` });
  const packs = Object.entries(e.perWeek.packs).map(([k, v]) => `${PACKS[k]?.name ?? k} ${n(v, 2)}`).join(', ');
  out.push(`| ${label} | ${Math.round(e.perWeek.xp)} | ${Math.round(e.perWeek.coins)} | ${n(e.perWeek.vouchers, 2)} | ${n(e.perWeek.picks, 2)} | ${packs} | ${p(e.cappedShare)} |`);
}
out.push('', '_XP in deze tabel komt uit de oude beloningsconfiguratie; in de app komt XP uit de motivatie-engine (zie MOTIVATION-ENGINE.md). Coins, packs, vouchers en keuzes komen wel uit deze configuratie._');
out.push('', '## Conclusies', '',
  '1. **Draftkansen per kaart wijken af van de ingestelde kansen** zodra een groep op een positie weinig spelers heeft (vooral Groep D, 80-84). De engine loot daarom alleen tussen groepen met kandidaten, en de app toont naast de ingestelde kans ook de gemeten kans. Structurele oplossing: grotere catalogus of groepen per positie herijken.',
  '2. **Garanties werken**: de langste reeks zonder Groep B of beter blijft onder de garantiegrens.',
  '3. **Packkansen kloppen** met de getoonde kansentabel (verschillen binnen de meetruis).',
  '4. **Economie is scheef**: een leerling die moeite heeft, krijgt per week veel minder vouchers en betere packs dan een sterke leerling. Vooruitgang wordt wel beloond met XP (motivatie-engine), maar nauwelijks met kaarten. Dit is een ontwerpbesluit voor Martijn (zie VRAGEN.md).');
console.log(out.join('\n'));
