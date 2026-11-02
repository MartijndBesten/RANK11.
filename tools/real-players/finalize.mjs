#!/usr/bin/env node
/** RANK11 echte-spelers — stap 3: selecteer 200, wijs speelbare RANK11-posities toe, koppel vlagkleuren,
 * en genereer het engine-datafile (real-players.generated.ts) + een bronnenlijst (BRONNEN.md). */
import { readFileSync, writeFileSync } from 'node:fs';
const DIR = '/tmp/claude-0/-home-user/2b34d53d-9e81-5528-af23-ec67682e97dd/scratchpad/rp';
const today = new Date().toISOString().slice(0, 10);
const rated = JSON.parse(readFileSync(`${DIR}/rated.json`, 'utf8'));
const flags = JSON.parse(readFileSync(`${DIR}/flag-colors.json`, 'utf8'));

const GROUP = (pos) => ({ GK: 'GK', CB: 'DEF', RB: 'DEF', LB: 'DEF', CDM: 'MID', CM: 'MID', CAM: 'MID', RM: 'MID', LM: 'MID', RW: 'FWD', LW: 'FWD', ST: 'FWD' }[pos]);
// Doelaantallen per RANK11-positie (≈ bestaande POSITION_WEIGHTS, geschaald naar 200).
const TARGET = { GK: 16, CB: 31, RB: 14, LB: 14, CDM: 16, CM: 24, CAM: 16, RM: 10, LM: 10, RW: 14, LW: 14, ST: 21 };
const GROUP_POS = { GK: ['GK'], DEF: ['CB', 'RB', 'LB'], MID: ['CDM', 'CM', 'CAM', 'RM', 'LM'], FWD: ['RW', 'LW', 'ST'] };
const RELATED = { GK: [], CB: ['CDM'], RB: ['RM', 'CB'], LB: ['LM', 'CB'], CDM: ['CM', 'CB'], CM: ['CDM', 'CAM'], CAM: ['CM', 'ST'], RM: ['RW', 'RB'], LM: ['LW', 'LB'], RW: ['RM', 'ST'], LW: ['LM', 'ST'], ST: ['CAM', 'RW', 'LW'] };

// 1) Per groep de best-gerate spelers kiezen, met cap per club, tot de groepsdoelen.
const groupTarget = { GK: 16, DEF: 59, MID: 76, FWD: 49 };
const byRating = [...rated].sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name));
const picked = []; const perClub = {}; const perGroup = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
for (const cap of [2, 3, 5]) { // ruim cap stapsgewijs op tot we 200 hebben
  for (const p of byRating) {
    if (picked.includes(p)) continue;
    const g = GROUP(p.position);
    if (perGroup[g] >= groupTarget[g]) continue;
    if ((perClub[p.club] || 0) >= cap) continue;
    picked.push(p); perClub[p.club] = (perClub[p.club] || 0) + 1; perGroup[g]++;
  }
  if (picked.length >= 200) break;
}
const sel = picked.slice(0, 200).sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name));
console.log('geselecteerd:', sel.length, '| groepen:', perGroup);

// 2) Binnen elke groep RANK11-posities toewijzen tot de doelaantallen (speelbare formaties).
const assignCount = Object.fromEntries(Object.keys(TARGET).map((k) => [k, 0]));
for (const p of sel) {
  const g = GROUP(p.position);
  const slots = GROUP_POS[g];
  // voorkeur: behoud de natuurlijke positie als er nog ruimte is, anders de minst gevulde slot in de groep.
  let pos = slots.includes(p.position) && assignCount[p.position] < TARGET[p.position] ? p.position : null;
  if (!pos) pos = slots.filter((s) => assignCount[s] < TARGET[s]).sort((a, b) => assignCount[a] - assignCount[b])[0] || slots.sort((a, b) => assignCount[a] - assignCount[b])[0];
  p.rk11 = pos; assignCount[pos]++;
}
console.log('positieverdeling:', assignCount);

// 3) Vlagkleuren + helpers.
const flagOf = (nat) => flags[nat] || flags[nat?.trim()] || { code: (nat || 'INT').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'INT', colors: ['#5b6472', '#aeb6c2', '#2b3240'] };
const splitName = (full) => { const t = full.trim().split(/\s+/); return { first: t[0], last: t.slice(1).join(' ') || t[0] }; };
const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

// 4) Engine-datafile genereren.
const rows = sel.map((p, i) => {
  const id = `p${String(i + 1).padStart(4, '0')}`;
  const { first, last } = splitName(p.name);
  const f = flagOf(p.nation);
  return {
    id, first, last, cardName: (last || first).toUpperCase().slice(0, 16), nationName: p.nation, code3: f.code,
    flagColors: f.colors, clubName: p.club, position: p.rk11, altPositions: (RELATED[p.rk11] || []).slice(0, 1),
    rating: p.rating, age: 2026 - (p.birth || 2000), source: p.source, enwiki: p.enwiki, qid: p.qid,
  };
});
const ts = `/* RANK11 — automatisch gegenereerde catalogus van ECHTE, actieve spelers (${today}).
 * Identiteit (naam, club, nationaliteit, positie, geboortejaar) uit Wikidata (CC0, preferred rank = huidige club).
 * Prestatiecijfers (senior club-wedstrijden/doelpunten) uit de Engelse Wikipedia-infobox. De rating is een
 * EIGEN, gedocumenteerde berekening (zie tools/real-players/README) uit clubniveau + output + ervaring —
 * NIET overgenomen uit EA FC/FIFA. Per speler is de bron + raadpleegdatum vastgelegd in BRONNEN.md.
 * Niet handmatig bewerken: regenereer via tools/real-players. */
export interface RealPlayer {
  id: string; first: string; last: string; cardName: string;
  nationName: string; code3: string; flagColors: [string, string, string];
  clubName: string; position: string; altPositions: string[]; rating: number; age: number;
}
export const REAL_PLAYERS: RealPlayer[] = [
${rows.map((r) => `  { id: '${r.id}', first: '${esc(r.first)}', last: '${esc(r.last)}', cardName: '${esc(r.cardName)}', nationName: '${esc(r.nationName)}', code3: '${r.code3}', flagColors: ['${r.flagColors[0]}','${r.flagColors[1]}','${r.flagColors[2]}'], clubName: '${esc(r.clubName)}', position: '${r.position}', altPositions: [${r.altPositions.map((a) => `'${a}'`).join(', ')}], rating: ${r.rating}, age: ${r.age} },`).join('\n')}
];
`;
writeFileSync(`${DIR}/real-players.generated.ts`, ts);

// 5) BRONNEN.md
const bronnen = `# RANK11 — bronnen echte spelers (gegenereerd ${today})\n\n` +
  `Identiteit uit **Wikidata** (CC0): huidige club = P54 met *preferred rank*, sportnationaliteit (P1532/P27), positie (P413), geboortejaar (P569).\n` +
  `Prestatiecijfers uit de **Engelse Wikipedia** (infobox 'football biography': som van senior club-wedstrijden en -doelpunten).\n` +
  `Rating = eigen berekening uit clubniveau + output + ervaring (zie README). Geen EA FC/FIFA.\n\n` +
  `| Kaart | Speler | Club | Nat. | Pos | Rating | Bron |\n|---|---|---|---|---|---|---|\n` +
  rows.map((r, i) => `| ${r.id} | ${sel[i].name} | ${r.clubName} | ${r.nationName} | ${r.position} | ${r.rating} | ${sel[i].source} |`).join('\n') + '\n';
writeFileSync(`${DIR}/BRONNEN.md`, bronnen);

const dropped = JSON.parse(readFileSync(`${DIR}/dropped.json`, 'utf8'));
console.log(`\nGeschreven: real-players.generated.ts (${rows.length}), BRONNEN.md`);
console.log('Weggelaten (onverifieerbaar):', dropped.length);
const bands = {}; for (const r of rows) { const k = Math.floor(r.rating / 5) * 5; bands[k] = (bands[k] || 0) + 1; }
console.log('ratingbanden:', bands);
console.log('voorbeeld:', rows[0], rows[100]);
