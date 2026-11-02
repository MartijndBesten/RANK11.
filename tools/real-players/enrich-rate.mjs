#!/usr/bin/env node
/** RANK11 echte-spelers — stap 2: verrijk identiteiten met publieke prestatiecijfers uit de Engelse Wikipedia
 * (infobox 'football biography': som van senior club-wedstrijden/doelpunten en interlandcaps) en bereken een
 * EIGEN, gedocumenteerde rating. GEEN ratings uit EA FC/FIFA. Onverifieerbare spelers worden weggelaten + gelogd. */
import { readFileSync, writeFileSync } from 'node:fs';
import { ProxyAgent, setGlobalDispatcher } from '/home/user/RANK11./node_modules/undici/index.js';
setGlobalDispatcher(new ProxyAgent({ uri: process.env.HTTPS_PROXY, requestTls: { ca: readFileSync('/root/.ccr/ca-bundle.crt') } }));
const DIR = '/tmp/claude-0/-home-user/2b34d53d-9e81-5528-af23-ec67682e97dd/scratchpad/rp';
const today = new Date().toISOString().slice(0, 10);
const YEAR_NOW = 2026;

// --- nationaliteit normaliseren ---
const NAT_FIX = { 'Kingdom of the Netherlands': 'Netherlands', 'England': 'England', 'DR Congo': 'DR Congo' };
const nat = (p) => NAT_FIX[p.natSport] || p.natSport || NAT_FIX[p.natCitizen] || p.natCitizen || 'Onbekend';

// --- positie mappen naar RANK11 posities ---
const POSGROUP = (labels) => {
  const s = labels.join(' ').toLowerCase();
  if (s.includes('goalkeeper')) return 'GK';
  if (s.includes('forward') || s.includes('winger') || s.includes('striker') || s.includes('attacker') || s.includes('inside forward')) return 'FWD';
  if (s.includes('back') || s.includes('defender') || s.includes('stopper') || s.includes('centerhalf') || s.includes('centre-half')) return 'DEF';
  if (s.includes('midfield') || s.includes('wing half')) return 'MID';
  return 'MID';
};
function rank11Position(labels, idx) {
  const s = labels.join(' ').toLowerCase();
  if (s.includes('goalkeeper')) return 'GK';
  if (s.includes('attacking midfield')) return 'CAM';
  if (s.includes('defensive midfield')) return 'CDM';
  if (s.includes('left winger') || s.includes('left midfield')) return 'LW';
  if (s.includes('right winger') || s.includes('right midfield')) return 'RW';
  if (s.includes('winger')) return idx % 2 ? 'LW' : 'RW';
  if (s.includes('centre-forward') || s.includes('striker') || s.includes('inside forward') || (s.includes('forward') && !s.includes('wing'))) return 'ST';
  if (s.includes('attacker')) return 'ST';
  if (s.includes('wing-back') || s.includes('wing half') || s.includes('full-back')) return idx % 2 ? 'LB' : 'RB';
  if (s.includes('centre-back') || s.includes('centerhalf') || s.includes('centre-half') || s.includes('stopper')) return 'CB';
  if (s.includes('defender')) return 'CB';
  if (s.includes('central midfield') || s.includes('midfielder')) return 'CM';
  return 'CM';
}

// --- Wikipedia infobox parser ---
function parseInfobox(wikitext) {
  const i = wikitext.search(/\{\{\s*Infobox football biography/i);
  if (i < 0) return null;
  // balanceer accolades
  let depth = 0, end = -1;
  for (let k = i; k < wikitext.length - 1; k++) {
    if (wikitext[k] === '{' && wikitext[k + 1] === '{') { depth++; k++; }
    else if (wikitext[k] === '}' && wikitext[k + 1] === '}') { depth--; k++; if (depth === 0) { end = k + 1; break; } }
  }
  const box = wikitext.slice(i, end > 0 ? end : undefined);
  const intval = (v) => { const m = String(v).replace(/\{\{0\}\}/g, '0').match(/-?\d[\d,]*/); return m ? Number(m[0].replace(/,/g, '')) : null; };
  const sumField = (re) => { let t = 0, any = false; let m; const r = new RegExp(re, 'gi'); while ((m = r.exec(box))) { const n = intval(m[2]); if (n !== null) { t += n; any = true; } } return any ? t : null; };
  const totalcaps = (() => { const m = box.match(/\|\s*totalcaps\s*=\s*([^\n|]+)/i); return m ? intval(m[1]) : null; })();
  const totalgoals = (() => { const m = box.match(/\|\s*totalgoals\s*=\s*([^\n|]+)/i); return m ? intval(m[1]) : null; })();
  const clubApps = totalcaps ?? sumField('\\|\\s*caps(\\d+)\\s*=\\s*([^\\n|]+)');
  const clubGoals = totalgoals ?? sumField('\\|\\s*goals(\\d+)\\s*=\\s*([^\\n|]+)');
  const intCaps = sumField('\\|\\s*nationalcaps(\\d+)\\s*=\\s*([^\\n|]+)');
  const intGoals = sumField('\\|\\s*nationalgoals(\\d+)\\s*=\\s*([^\\n|]+)');
  const upd = (box.match(/\|\s*(pcupdate|update)\s*=\s*([^\n|]+)/i) || [])[2];
  return { clubApps, clubGoals, intCaps, intGoals, asof: upd ? upd.replace(/<!--.*?-->/g, '').trim().slice(0, 40) : null };
}

// --- EIGEN ratingformule (gedocumenteerd) ---
// Signalen (0..1), uit uitsluitend OPENBARE gegevens:
//  - clubniveau (tier): speelniveau van de HUIDIGE club (sterkste publieke kwaliteitssignaal). Tabel hieronder.
//  - output: doelpunten per wedstrijd, per positiegroep genormaliseerd (uit Wikipedia-carrièrecijfers).
//  - ervaring: totaal senior club-wedstrijden (afnemend), als bodem.
// Per positiegroep anders gewogen + lichte leeftijdscurve (piek 24-30). Afgebeeld op 52..92.
// Interlandcaps zijn bewust NIET gebruikt (veldnaamgeving te wisselend in Wikipedia → oneerlijk/onbetrouwbaar).
// Dit is NIET overgenomen uit EA FC/FIFA of andere commerciële ratingsystemen.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const GPA_REF = { GK: 0.03, DEF: 0.16, MID: 0.36, FWD: 0.58 };
const WEIGHTS = { GK: { tier: 0.60, out: 0.00, exp: 0.40 }, DEF: { tier: 0.52, out: 0.12, exp: 0.36 }, MID: { tier: 0.48, out: 0.30, exp: 0.22 }, FWD: { tier: 0.44, out: 0.42, exp: 0.14 } };
const has = (name, list) => list.some((c) => name.includes(c));
const ELITE = ['Manchester City', 'Real Madrid', 'Barcelona', 'Bayern', 'Liverpool', 'Arsenal', 'Inter Milan', 'Paris Saint-Germain'];
const STRONG = ['Atlético Madrid', 'Juventus', 'AC Milan', 'Napoli', 'Chelsea', 'Manchester United', 'Tottenham', 'Dortmund', 'Leverkusen', 'Newcastle', 'Aston Villa', 'Leipzig', 'Atalanta', 'AS Roma', 'Lazio', 'Benfica', 'Porto', 'Sporting', 'PSV', 'Feyenoord', 'Ajax', 'Villarreal', 'Real Sociedad', 'Athletic', 'Betis', 'Eintracht Frankfurt', 'Fiorentina', 'Bologna', 'Brighton', 'Crystal Palace'];
const MODEST = ['Coventry', 'Go Ahead Eagles', 'Hull City', 'Excelsior', 'Arouca', 'Penafiel', 'Tondela', 'Nacional', 'Santa Clara', 'Estrela', 'Marítimo', 'Aves', 'Moreirense', 'Volendam', 'Den Haag', 'Fortuna Sittard', 'Frosinone', 'Groningen', 'Estoril', 'Vizela', 'Farense', 'Gil Vicente', 'Boavista', 'Rio Ave', 'Casa Pia'];
function clubTier(club) {
  if (has(club, ELITE)) return 1.00;
  if (has(club, STRONG)) return 0.82;
  if (has(club, MODEST)) return 0.46;
  return 0.62; // overige profclubs uit de grote competities
}
function computeRating(group, club, apps, goals, birth) {
  const tier = clubTier(club);
  const exp = clamp((apps ?? 0) / 280, 0, 1);
  const gpa = (apps && apps > 0) ? (goals ?? 0) / apps : 0;
  const out = clamp(gpa / GPA_REF[group], 0, 1);
  const w = WEIGHTS[group];
  let comp = w.tier * tier + w.out * out + w.exp * exp;
  const age = birth ? YEAR_NOW - birth : 26;
  const ageAdj = age < 20 ? -0.04 : age <= 30 ? 0 : age <= 33 ? -0.03 : -0.07;
  comp = clamp(comp + ageAdj, 0, 1);
  return Math.round(52 + 40 * comp); // 52..92
}

// --- selectie ---
const all = JSON.parse(readFileSync(`${DIR}/identities.json`, 'utf8'));
const usable = all.filter((p) => p.enwiki && p.positions.length && p.birth);
// cap per club voor spreiding
const perClub = {}; const candidates = [];
for (const p of usable.sort((a, b) => a.name.localeCompare(b.name))) {
  perClub[p.club] = (perClub[p.club] || 0) + 1;
  if (perClub[p.club] <= 4) candidates.push(p);
}
console.log(`kandidaten: ${candidates.length} (cap 4/club) uit ${usable.length} bruikbaar`);

// --- Wikipedia batch-fetch wikitext (throttled, Retry-After gerespecteerd) ---
const UA = 'RANK11-research/1.0 (https://rank11.martijndenbesten.com; contact beheerder; eenmalig catalogusonderzoek)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function fetchBatch(titles) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&format=json&formatversion=2&titles=${titles.map(encodeURIComponent).join('|')}`;
  for (let attempt = 0; attempt < 6; attempt++) {
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (r.status === 429) { const ra = Number(r.headers.get('retry-after')) || 20; await r.text(); console.log(`\n  429, wacht ${ra + 2}s…`); await sleep((ra + 2) * 1000); continue; }
    if (!r.ok) { await r.text(); throw new Error(`wiki ${r.status}`); }
    const d = await r.json();
    const out = {};
    for (const pg of d.query?.pages || []) out[pg.title] = pg.revisions?.[0]?.slots?.main?.content || '';
    return out;
  }
  throw new Error('wiki 429 na meerdere pogingen');
}
const titleOf = (p) => p.enwiki.replace(/_/g, ' ');
const rated = []; const dropped = [];
const BATCH = 50;
const CACHE = `${DIR}/wtcache.json`;
let cache = {}; try { cache = JSON.parse(readFileSync(CACHE, 'utf8')); } catch { /* geen cache */ }
for (let b = 0; b < candidates.length; b += BATCH) {
  const batch = candidates.slice(b, b + BATCH);
  const need = batch.map(titleOf).filter((t) => !(t in cache));
  if (need.length) {
    try { const got = await fetchBatch(need); for (const t of need) cache[t] = got[t] || ''; writeFileSync(CACHE, JSON.stringify(cache)); }
    catch (e) { console.log('batch fout', e.message); }
    await sleep(4000); // vriendelijk throttlen tussen batches
  }
  for (let k = 0; k < batch.length; k++) {
    const p = batch[k]; const wt = cache[titleOf(p)] || '';
    const info = wt ? parseInfobox(wt) : null;
    if (!info || !info.clubApps || info.clubApps < 5) { dropped.push({ name: p.name, reden: !wt ? 'geen-wikitext' : !info ? 'geen-infobox' : 'te-weinig-wedstrijden' }); continue; }
    const group = POSGROUP(p.positions);
    const pos = rank11Position(p.positions, rated.length);
    const rating = computeRating(group, p.club, info.clubApps, info.clubGoals, p.birth);
    rated.push({
      qid: p.qid, name: p.name, club: p.club, clubQid: p.clubQid, nation: nat(p), league: p.league,
      group, position: pos, birth: p.birth, apps: info.clubApps, goals: info.clubGoals ?? 0,
      intCaps: info.intCaps ?? 0, intGoals: info.intGoals ?? 0, rating,
      enwiki: `https://en.wikipedia.org/wiki/${p.enwiki}`,
      source: `${p.source}; Engelse Wikipedia "${titleOf(p)}" (geraadpleegd ${today}${info.asof ? `, cijfers bijgewerkt ${info.asof}` : ''})`,
    });
  }
  process.stdout.write(`\rverwerkt ${Math.min(b + 40, candidates.length)}/${candidates.length}, gerate ${rated.length}, weggelaten ${dropped.length}`);
}
console.log();
rated.sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name));
writeFileSync(`${DIR}/rated.json`, JSON.stringify(rated, null, 1));
writeFileSync(`${DIR}/dropped.json`, JSON.stringify(dropped, null, 1));
const bands = {}; for (const r of rated) { const k = Math.floor(r.rating / 5) * 5; bands[k] = (bands[k] || 0) + 1; }
console.log(`\ngerate: ${rated.length}, weggelaten: ${dropped.length}`);
console.log('ratingverdeling (per 5):', bands);
console.log('top 8:', rated.slice(0, 8).map((r) => `${r.name}(${r.rating},${r.position})`).join(', '));
console.log('onderaan 5:', rated.slice(-5).map((r) => `${r.name}(${r.rating})`).join(', '));
