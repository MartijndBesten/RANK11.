// Balansrapport: node --experimental-transform-types tools/sim/balans.ts > docs/SIMULATIES.md
// Draait dezelfde engine als het spel; deterministisch per seed.
import { CURRENT_PROGRESS_CONFIG, CURRENT_REWARD_CONFIG, DEFAULT_MOTIVATION_CONFIG, DEFAULT_PROGRESS_CONFIG, DEFAULT_REWARD_CONFIG, DRAFT_EVENTS, FAIR_REWARD_CONFIG, generateCatalog, matchupWinRate, PACKS, simulateDrafts, simulateEconomy, simulatePacks, simulateSchoolYear, STUDENT_PROFILES, type SchoolYearRow } from '../../packages/engine/src/index.ts';
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
// Volledig schooljaar per leerlingprofiel: huidige economie (v3) tegenover v2 (V-011) en de oude configuratie.
const yearSeeds = 'abcdefghijklmnop'.split('').map((x) => `j-${x}`);
const newYear = simulateSchoolYear(STUDENT_PROFILES, { seeds: yearSeeds, catalog });
const v2Year = simulateSchoolYear(STUDENT_PROFILES, { seeds: yearSeeds, catalog, rewards: FAIR_REWARD_CONFIG, progress: DEFAULT_PROGRESS_CONFIG });
const oldYear = simulateSchoolYear(STUDENT_PROFILES, { seeds: yearSeeds.slice(0, 4), catalog, rewards: DEFAULT_REWARD_CONFIG, progress: null });
const field = (rows: SchoolYearRow[]) => rows.flatMap((r) => r.teams);
const winVsField = (rows: SchoolYearRow[]) => rows.map((r) => matchupWinRate(r.teams, field(rows), 240, `veld:${r.profileId}`));
const winNew = winVsField(newYear), winV2 = winVsField(v2Year);
const SOURCE: Record<string, string> = { level: 'clubniveau', goal: 'doel', coins: 'coins', cijfer: '9,5+', improvement: 'vooruitgang', recovery: 'herstel', academy: 'Academy' };
const sourceText = (r: SchoolYearRow) => Object.entries(r.topSources).sort(([, a], [, b]) => b - a).filter(([, v]) => v >= 0.5).map(([k, v]) => `${SOURCE[k] ?? k} ${Math.round(v)}`).join(', ');
out.push('## Volledig schooljaar per leerlingprofiel (economie v3, ronde 5)', '',
  `40 schoolweken, 4 periodes, 2 cijfers per week (1 bij "weinig"), ${yearSeeds.length} seeds gemiddeld. Huidige economie: cijferbeloning \`${CURRENT_REWARD_CONFIG.version}\` + voortgang \`${CURRENT_PROGRESS_CONFIG.version}\` + motivatie \`${DEFAULT_MOTIVATION_CONFIG.version}\`; ter vergelijking v2 (\`${FAIR_REWARD_CONFIG.version}\` + \`${DEFAULT_PROGRESS_CONFIG.version}\`). Kaarten komen binnen zodra een pack verdiend is; coins gaan direct naar een Goudpack zodra er genoeg zijn. Teamrating = beste 4-3-3.`, '',
  '**Winkans tegen het veld** = gemiddelde uitslag (winst 1, gelijk ½) van het eindelftal van dit profiel tegen de eindelftallen van álle profielen, met de battle-engine en een eenvoudige computerzet, 240 wedstrijden. 50% = gemiddeld. Meetruis ongeveer ±5 procentpunt.', '',
  '| Profiel | Gem. cijfer | Teamrating week 10 / 20 / 30 / 40 | Goudpacks+ per jaar (v2) | waarvan uit | Spelers 85+ (v2) | Vouchers | Winkans tegen het veld (v2) |', '|---|---:|---|---:|---|---:|---:|---:|');
newYear.forEach((r, i) => {
  const o = v2Year[i]!;
  const wk = [10, 20, 30, 40].map((w) => n(r.ratingByWeek[w] ?? 0)).join(' / ');
  out.push(`| ${r.label}${r.motivated ? '' : ' ¹'} | ${n(r.gradeAverage, 2)} | ${wk} | **${Math.round(r.topPacks)}** (${Math.round(o.topPacks)}) | ${sourceText(r)} | ${Math.round(r.cards85)} (${Math.round(o.cards85)}) | ${n(r.vouchers)} | **${p(winNew[i]!)}** (${p(winV2[i]!)}) |`);
});
const range = (xs: number[]) => `${p(Math.min(...xs))} – ${p(Math.max(...xs))}`;
const mot = (rows: SchoolYearRow[], w: number[]) => w.filter((_, i) => rows[i]!.motivated);
out.push('', '¹ Voert alleen cijfers in (geen doelen, geen Academy), of weinig cijfers.', '',
  `Winkans van actief meedoende profielen tegen het veld: v3 **${range(mot(newYear, winNew))}**, v2 ${range(mot(v2Year, winV2))}. Starterspacks (brons/zilver) komen er per voldoende bij: ${Math.round(Math.min(...newYear.map((r) => r.packs.starter ?? 0)))}–${Math.round(Math.max(...newYear.map((r) => r.packs.starter ?? 0)))} per jaar.`, '',
  `Oude configuratie \`${DEFAULT_REWARD_CONFIG.version}\` (zonder voortgang), ter vergelijking: Goudpacks+ per jaar ${Math.round(Math.min(...oldYear.map((r) => r.topPacks)))}–${Math.round(Math.max(...oldYear.map((r) => r.topPacks)))}, teamrating eind ${n(Math.min(...oldYear.map((r) => r.teamRating)))}–${n(Math.max(...oldYear.map((r) => r.teamRating)))}.`, '');

out.push('', '## Conclusies', '',
  '1. **Draftkansen per kaart wijken af van de ingestelde kansen** zodra een groep op een positie weinig spelers heeft (vooral Groep D, 80-84). De engine loot daarom alleen tussen groepen met kandidaten, en de app toont naast de ingestelde kans ook de gemeten kans.',
  '2. **Garanties werken**: de langste reeks zonder Groep B of beter blijft onder de garantiegrens.',
  '3. **Packkansen kloppen** met de getoonde kansentabel (verschillen binnen de meetruis).',
  '4. **Battles zijn gevoelig voor kleine verschillen**: 1-2 punten teamrating geeft al een duidelijk lagere winkans. Daarom moet de economie actieve leerlingen dicht bij elkaar houden; packgeluk alleen zorgt al voor zo\'n verschil.',
  '5. **Economie v3**: Goudpacks komen vooral uit het clubniveau (alle XP: inzet, vooruitgang, oefenen). Omdat ieder niveau duurder wordt, lopen leerlingen niet ver uit elkaar. Een voldoende geeft een Starterspack, een 8,5+ een voucher, een 9,5+ een Goudpack: bijzonder, maar geen voorwaarde.',
  '6. **Geen eindeloze stroom**: ongeveer een Goudpack per twee à drie weken in plaats van twee à drie per week (v2). Het elftal groeit het hele jaar door.',
  '7. **Wie alleen cijfers invoert**, krijgt minder dan wie doelen stelt of oefent; dat is bedoeld (inzet telt), maar het verschil tussen hoge en lage cijfers blijft binnen die groep klein.');
console.log(out.join('\n'));
