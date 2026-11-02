#!/usr/bin/env node
/**
 * RANK11 echte-spelers — stap 2 (v2): zet het sync-resultaat (tools/real-players/data/sync-<datum>.json,
 * gemaakt door sync.mjs) om naar de engine-catalogus en de bron-/licentieregisters.
 *
 *   node tools/real-players/finalize.mjs tools/real-players/data/sync-2026-11-02.json
 *
 * Schrijft:
 *  - packages/engine/src/real-players.generated.ts   (catalogus; alleen deze file leest de engine)
 *  - tools/real-players/BRONNEN.md                   (per speler: bron, controledatum, waarschuwingen)
 *  - tools/real-players/PORTRETTEN.md                (per foto: bron, maker, licentie, beoordeling)
 *  - tools/real-players/data/sync-rapport.json       (tellingen voor HANDOFF/eindrapport)
 *
 * Migratieregels (hard): een bestaand slot houdt zijn QID (gecontroleerd tegen de catalog-lock); de rating van
 * een bestaand slot verandert per sync met hooguit ±MAX_STEP, zodat elftallen niet ineens instorten.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const MAX_STEP = 5;
/**
 * Kalibratie (rank11-rating-v2.1): de ruwe formule-uitkomst wordt via percentielen van de HELE actieve pool
 * (alle beoordeelde spelers in de zeven competities, n=1265 op 2026-11-02) afgebeeld op een kaartenschaal met
 * genoeg brons en zilver. Tabel: [ruwe rating op percentiel p, kaartrating]. p: 0 · 10 · 20 · 30 · 40 · 50 · 60 ·
 * 70 · 80 · 90 · 95 · 97 · 99 · 99,5 · 100 %. Monotoon, lineair geïnterpoleerd.
 */
const CALIBRATION = [[65, 56], [71, 60], [73, 63], [74, 65], [75, 67], [76, 69], [78, 71], [79, 73], [80, 76], [82, 79], [84, 82], [85, 84], [87, 87], [88, 89], [91, 93]];
function calibrate(raw) {
  if (raw <= CALIBRATION[0][0]) return CALIBRATION[0][1];
  for (let i = 1; i < CALIBRATION.length; i++) {
    const [x0, y0] = CALIBRATION[i - 1], [x1, y1] = CALIBRATION[i];
    if (raw <= x1) return Math.round(y0 + ((raw - x0) / (x1 - x0)) * (y1 - y0));
  }
  return Math.min(95, CALIBRATION.at(-1)[1] + (raw - CALIBRATION.at(-1)[0]));
}
const ROOT = new URL('../../', import.meta.url);
const file = process.argv[2];
if (!file) { console.error('gebruik: finalize.mjs <sync.json>'); process.exit(1); }
const sync = JSON.parse(readFileSync(file, 'utf8'));
const today = sync.today;
const flags = JSON.parse(readFileSync(new URL('tools/real-players/flag-colors.json', ROOT), 'utf8'));

// Catalog-lock (bron van waarheid voor bestaande kaart-id's) en de vorige catalogus (voor inactieven).
const lockSrc = readFileSync(new URL('packages/engine/src/catalog-lock.generated.ts', ROOT), 'utf8');
const LOCK = {};
for (const m of lockSrc.matchAll(/'([^']+)': \{ slot: '([^']+)', qid: '([^']+)', rarity: '([^']+)', ratingAtLock: (\d+) \}/g)) LOCK[m[1]] = { slot: m[2], qid: m[3], rarity: m[4], rating: Number(m[5]) };
const prevSrc = readFileSync(new URL('packages/engine/src/real-players.generated.ts', ROOT), 'utf8');
const PREV = {};
for (const m of prevSrc.matchAll(/\{ id: '(p\d{4})'(.*?)\},?\n/g)) {
  const get = (k) => (m[2].match(new RegExp(`${k}: '((?:[^'\\\\]|\\\\.)*)'`)) || [])[1]?.replace(/\\'/g, "'");
  const num = (k) => Number((m[2].match(new RegExp(`${k}: (\\d+)`)) || [])[1]);
  PREV[m[1]] = { first: get('first'), last: get('last'), cardName: get('cardName'), nationName: get('nationName'), clubName: get('clubName'), position: get('position'), rating: num('rating'), age: num('age') };
}

const NAT_FIX = { 'Kingdom of the Netherlands': 'Netherlands', "People's Republic of China": 'China', 'Democratic Republic of the Congo': 'DR Congo', "Côte d'Ivoire": 'Ivory Coast', 'Czechia': 'Czech Republic', 'Türkiye': 'Turkey', 'United States of America': 'United States', 'Korea Republic': 'South Korea' };
const nationOf = (n) => NAT_FIX[n] || n || 'Onbekend';
const flagOf = (nat) => flags[nat] || flags[`${nat} `] || null;
const missingFlags = new Set();
const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const strip = (s) => String(s ?? '').replace(/\s*\([^)]*\)\s*$/, '').trim();

/** Weergavenaam = Engelse Wikipedia-titel (zonder toevoeging tussen haakjes): de gangbare naam, stabieler dan
 * Wikidata-labels. Kaartnaam = achternaam; bij "Júnior/Jr." of een enkele naam de herkenbare roepnaam. */
function names(label, prev) {
  const full = strip(label || prev?.last || '');
  const t = full.split(/\s+/).filter(Boolean);
  if (t.length <= 1) return { first: '', last: full, cardName: full.toUpperCase().slice(0, 16) };
  const first = t[0];
  const last = t.slice(1).join(' ');
  const card = /^(j[uú]nior|jr\.?|neto|filho)$/i.test(t.at(-1)) ? `${t[0]} ${t.at(-1)}` : last;
  return { first, last, cardName: card.toUpperCase().slice(0, 16) };
}

/** Een foto telt alleen als de naam van de speler in de bestandsnaam staat (accent-ongevoelig). Zo vallen
 * groepsfoto's of foto's van iemand anders (bijv. een trainer) af. */
const fold = (x) => String(x ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ø/g, 'o').replace(/ð/g, 'd').replace(/ß/g, 'ss').toLowerCase();
function nameInFile(file, name, wiki) {
  const f = fold(file).replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/ue/g, 'u');
  const tokens = [...new Set([...fold(name).split(/[\s-]+/), ...fold(strip(wiki || '')).split(/[\s-]+/)])].filter((t) => t.length >= 4 && !['junior', 'footballer'].includes(t));
  return tokens.some((t) => f.includes(t.replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/ue/g, 'u')));
}

/** Kortere, gangbare clubnaam voor op de kaart (bijv. "Real Madrid Club de Fútbol" → "Real Madrid"). */
function displayClub(name) {
  if (!name || name === 'Zonder club') return name;
  let n = name.replace(/\s+Club de Fútbol$/, '').replace(/\s+Balompié$/, '').replace(/\s+(F\.C\.|A\.F\.C\.|FC|CF|C\.F\.|S\.C\.)(\s+\d{4})?$/, '');
  n = n.replace(/^(FC|AFC|SSC|AS|SS|US|S\.L\.|RCD|RC|CD|UD|SV|TSG|VfB|VfL)\s+(?=[A-Z])/, (m) => (/^(VfB|VfL|SV|TSG)/.test(m) ? m : ''));
  n = n.replace(/\s+Calcio$/, '').replace(/^Paris Saint-Germain$/, 'Paris Saint-Germain');
  return n.trim() || name;
}

const rows = [];
const report = { today, total: 0, active: 0, inactive: 0, added: 0, clubConfirmed: 0, clubDeviating: 0, numbers: 0, numbersConfirmed: 0, sideGuessed: 0, ratingDamped: 0, positionChanged: 0, clubChanged: 0, photos: { withFile: 0, licenseOk: 0, personalityTag: 0, rejected: {} }, warnings: 0 };
const LICENSE_OK = /^(CC0|Public domain|PD|CC BY(-SA)? \d\.\d( [a-z]{2})?)$/i;

for (const e of sync.catalog.sort((a, b) => a.slot.localeCompare(b.slot))) {
  const lock = LOCK[e.slot];
  if (lock && lock.qid !== e.qid) throw new Error(`MIGRATIEFOUT: slot ${e.slot} hoort bij ${lock.qid}, sync zegt ${e.qid}`);
  const prev = PREV[e.slot];
  const active = e.status === 'actief';
  const nat = nationOf(e.nation || prev?.nationName);
  const f = flagOf(nat);
  if (!f) missingFlags.add(nat);
  const nm = names(e.name, prev);
  let rating = e.rating != null ? calibrate(e.rating) : prev?.rating ?? 60;
  const target = rating;
  if (lock && e.rating != null) {
    const damped = Math.max(lock.rating - MAX_STEP, Math.min(lock.rating + MAX_STEP, target));
    if (damped !== target) report.ratingDamped++;
    rating = damped;
  }
  const position = e.position || prev?.position || 'CM';
  if (prev && prev.position !== position) report.positionChanged++;
  const clubName = displayClub(e.club || (active ? prev?.clubName : null) || 'Zonder club');
  if (prev && prev.clubName !== clubName) report.clubChanged++;
  const lic = e.photo?.license || '';
  let photo = null;
  if (e.photo) {
    report.photos.withFile++;
    const licOk = LICENSE_OK.test(lic.trim()) && !e.photo.nonFree;
    const nameOk = nameInFile(e.photo.file, e.name, e.wiki);
    const ok = licOk && nameOk;
    if (licOk && !nameOk) report.photos.nameMismatch = [...(report.photos.nameMismatch || []), `${e.slot} ${e.name}: ${e.photo.file}`];
    if (ok) {
      report.photos.licenseOk++;
      const pt = /personality/i.test(e.photo.restrictions || '');
      if (pt) report.photos.personalityTag++;
      photo = { file: e.photo.file, page: e.photo.page || `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(e.photo.file.replace(/ /g, '_'))}`, license: lic, licenseUrl: e.photo.licenseUrl || null, artist: e.photo.artist || 'onbekend', personalityTag: pt, checked: today };
    } else if (!licOk) report.photos.rejected[lic || 'onbekend'] = (report.photos.rejected[lic || 'onbekend'] || 0) + 1;
  }
  if (!lock) report.added++;
  if (active) report.active++; else report.inactive++;
  if (e.clubCheck === 'bevestigd') report.clubConfirmed++; else if (e.clubCheck === 'afwijkend') report.clubDeviating++;
  if (e.number) { report.numbers++; if (e.numberCheck === 'bevestigd') report.numbersConfirmed++; }
  if ((e.warn || []).some((w) => /kant/.test(w))) report.sideGuessed++;
  if ((e.warn || []).length) report.warnings++;
  rows.push({
    id: e.slot, qid: e.qid, ...nm, nationName: nat, code3: f?.code || (nat.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() || 'INT'),
    flagColors: f?.colors || ['#5b6472', '#aeb6c2', '#2b3240'], clubName, clubColors: (e.clubColors || []).slice(0, 3), league: active ? e.league : null,
    position, altPositions: (e.alt || []).filter((a) => a !== position).slice(0, 1), rating, age: e.age ?? prev?.age ?? 26,
    number: active ? e.number ?? null : null, active, photo, src: e,
  });
}
report.total = rows.length;

// Nieuwe edities (Electric/Toetsweek/Seizoen) bovenop de best gerate NIEUWE spelers. Bestaande edities uit een
// vorige sync blijven altijd staan (vaste id's); er komen alleen edities bij voor spelers zonder editie.
const prevEditions = [...prevSrc.matchAll(/\{ id: '(p\d{4}-(?:special|exam|season))', slot: '(p\d{4})', rarity: '(\w+)' \}/g)].map((m) => ({ id: m[1], slot: m[2], rarity: m[3] }));
const editions = [...prevEditions];
const hasEdition = new Set([...editions.map((e) => e.slot), ...Object.entries(LOCK).filter(([id, l]) => id !== l.slot).map(([, l]) => l.slot)]);
const EDITION_CYCLE = ['special', 'exam', 'season'];
for (const r of rows.filter((x) => !LOCK[x.id] && x.active && !hasEdition.has(x.id)).sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id)).slice(0, Math.max(0, 24 - prevEditions.length))) {
  const rarity = EDITION_CYCLE[editions.length % 3];
  editions.push({ id: `${r.id}-${rarity}`, slot: r.id, rarity });
}
report.newEditions = editions.length;

const tsRows = rows.map((r) => {
  const ph = r.photo ? `, photo: { file: '${esc(r.photo.file)}', page: '${esc(r.photo.page)}', license: '${esc(r.photo.license)}', licenseUrl: ${r.photo.licenseUrl ? `'${esc(r.photo.licenseUrl)}'` : 'null'}, artist: '${esc(r.photo.artist)}', personalityTag: ${r.photo.personalityTag}, checked: '${today}' }` : '';
  return `  { id: '${r.id}', qid: '${r.qid}', first: '${esc(r.first)}', last: '${esc(r.last)}', cardName: '${esc(r.cardName)}', nationName: '${esc(r.nationName)}', code3: '${r.code3}', flagColors: ['${r.flagColors.join("','")}'], clubName: '${esc(r.clubName)}', clubColors: [${r.clubColors.map((c) => `'${c}'`).join(', ')}], league: ${r.league ? `'${esc(r.league)}'` : 'null'}, position: '${r.position}', altPositions: [${r.altPositions.map((a) => `'${a}'`).join(', ')}], rating: ${r.rating}, age: ${r.age}, number: ${r.number ?? 'null'}, active: ${r.active}${ph} },`;
});
writeFileSync(new URL('packages/engine/src/real-players.generated.ts', ROOT), `/* RANK11 — automatisch gegenereerde catalogus van ECHTE spelers (sync ${today}, tools/real-players).
 * Identiteit: Wikidata (CC0). Huidige club, rugnummer, positie en carrièrecijfers: Engelse Wikipedia-infobox
 * (CC BY-SA), club gecontroleerd tegen Wikidata. Rating = EIGEN formule (rank11-rating-v2.1, gekalibreerd), NIET uit EA FC/FIFA.
 * Slots (id) zijn vast gekoppeld aan een Wikidata-QID (catalog-lock); inactieve spelers blijven geldig in
 * collecties maar komen niet meer uit packs. Per speler bron + controledatum: tools/real-players/BRONNEN.md.
 * Portretfoto's: Commons, vrije licentie + spelersnaam in bestandsnaam; getoond achter de login als PLAYER_PHOTOS=true (PORTRETTEN.md).
 * Niet handmatig bewerken: regenereer via tools/real-players. */
import type { CommonsPhoto } from './catalog.ts';
export interface RealPlayer {
  id: string; qid: string; first: string; last: string; cardName: string;
  nationName: string; code3: string; flagColors: [string, string, string];
  clubName: string; clubColors: string[]; league: string | null;
  position: string; altPositions: string[]; rating: number; age: number;
  number: number | null; active: boolean; photo?: CommonsPhoto;
}
export const CATALOG_SYNC_DATE = '${today}';
export const REAL_PLAYERS: RealPlayer[] = [
${tsRows.join('\n')}
];
/** Edities bovenop nieuwe spelers (na de catalog-lock). Vaste id's: worden bij een volgende sync overgenomen. */
export const NEW_EDITIONS: { id: string; slot: string; rarity: string }[] = [
${editions.map((e) => `  { id: '${e.id}', slot: '${e.slot}', rarity: '${e.rarity}' },`).join('\n')}
];
`);

const md = (s) => String(s ?? '').replace(/\|/g, '\\|');
writeFileSync(new URL('tools/real-players/BRONNEN.md', ROOT), `# RANK11 — bronnen echte spelers (sync ${today})

Procedure: \`tools/real-players/sync.mjs\` → \`finalize.mjs\` (zie README). Per speler: Wikidata-QID (identiteit, CC0) en
Engelse Wikipedia-artikel (huidige club, rugnummer, positie, cijfers; CC BY-SA), beide geraadpleegd op ${today}.

- **Club**: *bevestigd* = Wikipedia-infobox en Wikidata noemen dezelfde huidige club; *afwijkend* = alleen Wikipedia (waarschuwing).
- **Rugnummer**: *bevestigd* = Wikipedia en Wikidata gelijk; *wikipedia* = alleen infobox; geen nummer = onbekend of conflict (niet getoond).
- **Status**: *inactief* = geen huidige profclub in de zeven competities (kaart blijft geldig, komt niet meer uit packs).
- Rating = eigen formule \`rank11-rating-v2.1\` (geen EA FC/FIFA), gekalibreerd op percentielen van de actieve pool. Bestaande kaarten wijzigen per sync hooguit ±${MAX_STEP}.

| Kaart | Speler | Club | Competitie | Club-check | Nr | Nr-check | Pos | Rating | Status | Bron | Waarschuwingen |
|---|---|---|---|---|---:|---|---|---:|---|---|---|
${rows.map((r) => `| ${r.id} | ${md(r.src.name)} | ${md(r.clubName)} | ${md(r.league ?? '—')} | ${r.src.clubCheck ?? '—'} | ${r.number ?? ''} | ${r.src.numberCheck ?? '—'} | ${r.position} | ${r.rating} | ${r.active ? 'actief' : 'inactief'} | Wikidata ${r.qid}; en.wikipedia "${md(r.src.wiki ?? '—')}" (rev. ${r.src.wpRev ?? '—'}) | ${md((r.src.warn || []).join('; '))} |`).join('\n')}
`);

writeFileSync(new URL('tools/real-players/PORTRETTEN.md', ROOT), `# RANK11 — portretfoto's: bron, maker, licentie (controle ${today})

**Status in de app: AAN, alleen achter de login** (\`PLAYER_PHOTOS=true\`, keuze Martijn 2026-11-02). Zie docs/BEELDRECHTEN.md voor de afweging.

Alleen foto's van Wikimedia Commons met een vrije licentie (CC0, publiek domein, CC BY, CC BY-SA) én met de spelersnaam in de bestandsnaam zijn geregistreerd (geen groepsfoto's/andere personen).
Een vrije **auteursrechtlicentie** regelt alleen het recht van de fotograaf. Het **portretrecht** van de speler
(art. 19–21 Auteurswet) en eventuele commerciële exploitatierechten (clubs, spelersvakbonden) zijn daarmee NIET
geregeld. Kolom *Commons-waarschuwing* = Commons markeert de foto expliciet met een persoonlijkheidsrechten-sjabloon.
Bij CC BY-SA geldt: naamsvermelding, licentievermelding, vermelden dat de foto is bijgesneden, en dezelfde licentie voor de uitsnede.

| Kaart | Speler | Bestand | Maker | Licentie | Commons-waarschuwing | Gecontroleerd |
|---|---|---|---|---|---|---|
${rows.filter((r) => r.photo).map((r) => `| ${r.id} | ${md(r.src.name)} | [${md(r.photo.file)}](${r.photo.page}) | ${md(r.photo.artist)} | ${r.photo.licenseUrl ? `[${md(r.photo.license)}](${r.photo.licenseUrl})` : md(r.photo.license)} | ${r.photo.personalityTag ? 'ja (personality)' : 'nee'} | ${today} |`).join('\n')}

Zonder bruikbare foto (alternatief RANK11-shirtportret): ${rows.filter((r) => !r.photo).length} kaarten.
`);

writeFileSync(new URL('tools/real-players/data/sync-rapport.json', ROOT), JSON.stringify({ ...report, missingFlags: [...missingFlags] }, null, 1) + '\n');
console.log(JSON.stringify({ ...report, missingFlags: [...missingFlags] }, null, 1));
