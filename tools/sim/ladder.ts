// Balansrapport cijferladder (ronde 15): node --experimental-transform-types tools/sim/ladder.ts [--md]
// 40 schoolweken, leerlingprofielen met gemiddelden 5,5–8,0 plus varianten (oefenen, alleen invoeren,
// extreem veel invoeren, groeier). Dezelfde engine als het spel; deterministisch per seed.
import {
  CURRENT_PROGRESS_CONFIG, CURRENT_REWARD_CONFIG, generateCatalog, LADDER_PROFILES, matchupWinRate, simulateSchoolYear,
  type SchoolYearRow,
} from '../../packages/engine/src/index.ts';

export function runLadder(seeds: readonly string[] = ['s1', 's2', 's3', 's4', 's5', 's6']) {
  const catalog = generateCatalog();
  const rows = simulateSchoolYear(LADDER_PROFILES, { seeds, catalog });
  const field = rows.filter((r) => r.motivated).flatMap((r) => r.teams);
  const win = rows.map((r) => matchupWinRate(r.teams, field, 240, `ladder:${r.profileId}`));
  // Met de 'vorm van de dag' (0..3) zoals in de live wedstrijden.
  const winLive = rows.map((r) => matchupWinRate(r.teams, field, 240, `ladder-live:${r.profileId}`, 3));
  return { rows, win, winLive, catalog };
}

const n = (x: number, d = 1) => x.toFixed(d).replace('.', ',');
const pct = (x: number) => `${Math.round(x * 100)}%`;
export function ladderMarkdown({ rows, win, winLive }: { rows: SchoolYearRow[]; win: number[]; winLive: number[] }): string {
  const out: string[] = [];
  out.push(`### Cijferladder \`${CURRENT_REWARD_CONFIG.version}\` + voortgang \`${CURRENT_PROGRESS_CONFIG.version}\` — 40 schoolweken`, '');
  out.push('| Profiel | Gem. cijfer | Brons | Zilver | Zilver+ | Goud | Inzet | Spelers 85+ | Vouchers | Teamrating wk 10 / 20 / 30 / 40 | Winkans vs veld (zonder / met vorm) |', '|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|');
  rows.forEach((r, i) => {
    const p = r.packs;
    out.push(`| ${r.label} | ${n(r.gradeAverage, 2)} | ${Math.round(p.starter ?? 0)} | ${Math.round(p.silver ?? 0)} | ${Math.round(p.silver_plus ?? 0)} | ${Math.round(p.gold ?? 0)} | ${Math.round(p.effort ?? 0)} | ${Math.round(r.cards85)} | ${n(r.vouchers)} | ${[10, 20, 30, 40].map((w) => n(r.ratingByWeek[w] ?? 0)).join(' / ')} | **${pct(win[i]!)}** / ${pct(winLive[i]!)} |`);
  });
  return out.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const res = runLadder();
  if (process.argv.includes('--md')) console.log(ladderMarkdown(res));
  else res.rows.forEach((r, i) => console.log(r.profileId.padEnd(6), n(r.gradeAverage, 2), JSON.stringify(Object.fromEntries(Object.entries(r.packs).map(([k, v]) => [k, Math.round(v)]))), 'top', Math.round(r.topPacks), '85+', Math.round(r.cards85), 'v', n(r.vouchers), 'rating', [10, 20, 30, 40].map((w) => n(r.ratingByWeek[w] ?? 0)).join('/'), 'win', pct(res.win[i]!), JSON.stringify(Object.fromEntries(Object.entries(r.topSources).map(([k, v]) => [k, Math.round(v)])))));
}
