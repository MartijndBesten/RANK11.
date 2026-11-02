/**
 * RANK11 — catalogus-synchronisatie echte spelers (v2, 2026-11).
 *
 * Isomorf: draait in Node 22 (`node tools/real-players/sync-node.mjs`) én als geplakt script in een browser-
 * console op wikidata.org (zo is de run van 2026-11-02 gedaan, omdat de bouwomgeving Wikimedia niet kon
 * bereiken). Het script haalt uitsluitend OPENBARE gegevens op:
 *  - Wikidata (CC0): identiteit, huidige club(s) met rugnummer-kwalificatie, positie, nationaliteit,
 *    geboortedatum, overlijden, afbeelding (P18), aantal Wikipedia-taalversies (bekendheid), club-competitie.
 *  - Engelse Wikipedia (CC BY-SA): infobox 'football biography' → huidige club (tweede bron), rugnummer,
 *    positie, senior club-wedstrijden/-doelpunten, senior interlands.
 *  - Wikimedia Commons: licentie, maker en beperkingen (o.a. 'personality') van de portretfoto.
 *
 * Regels:
 *  1. Bestaande kaart-slots (p0001…) blijven ALTIJD aan dezelfde Wikidata-QID gekoppeld (lock). Een speler
 *     die niet meer actief is in de zeven competities wordt 'inactief' (niet meer in packs/startelftal) maar
 *     blijft geldig in collecties. Een slot wordt nooit hergebruikt.
 *  2. Huidige club = infobox `currentclub` (link-doel) — bevestigd als Wikidata een open P54-verklaring voor
 *     dezelfde club heeft; anders 'afwijkend' (waarschuwing). Leeg/coach/clubloos → inactief.
 *  3. Rugnummer = infobox `clubnumber`, alleen getoond als Wikidata niet een ánder nummer bij dezelfde club noemt.
 *  4. Rating = eigen formule (geen EA FC/FIFA), zie RATING hieronder en README.
 */

export const LEAGUES = [
  ['Premier League', 'Q9448'], ['La Liga', 'Q324867'], ['Serie A', 'Q15804'], ['Bundesliga', 'Q82595'],
  ['Ligue 1', 'Q13394'], ['Eredivisie', 'Q167541'], ['Primeira Liga', 'Q182994'],
];

const ELITE = ['Manchester City', 'Real Madrid', 'FC Barcelona', 'Bayern Munich', 'Liverpool F.C.', 'Arsenal F.C.', 'Inter Milan', 'Paris Saint-Germain'];
const STRONG = ['Atlético Madrid', 'Juventus', 'AC Milan', 'SSC Napoli', 'Chelsea F.C.', 'Manchester United', 'Tottenham Hotspur', 'Borussia Dortmund', 'Bayer 04 Leverkusen', 'Newcastle United', 'Aston Villa', 'RB Leipzig', 'Atalanta', 'AS Roma', 'SS Lazio', 'S.L. Benfica', 'FC Porto', 'Sporting CP', 'PSV Eindhoven', 'Feyenoord', 'AFC Ajax', 'Villarreal', 'Real Sociedad', 'Athletic Bilbao', 'Real Betis', 'Eintracht Frankfurt', 'ACF Fiorentina', 'Bologna', 'Brighton & Hove Albion', 'Crystal Palace', 'Olympique de Marseille', 'AS Monaco', 'Lille OSC', 'Como 1907', 'VfB Stuttgart', 'Nottingham Forest'];
const STRONG_NATIONS = ['Argentina', 'France', 'Spain', 'England', 'Brazil', 'Portugal', 'Netherlands', 'Belgium', 'Germany', 'Italy', 'Croatia', 'Uruguay', 'Colombia', 'Morocco', 'United States', 'Mexico', 'Japan', 'Switzerland', 'Denmark', 'Senegal', 'Austria', 'Norway', 'Turkey', 'Ecuador', 'Ukraine', 'Poland', 'Serbia', 'Sweden'];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const has = (name, list) => list.some((c) => name.toLowerCase().includes(c.toLowerCase()));
export function clubTier(club) { return has(club, ELITE) ? 1 : has(club, STRONG) ? 0.8 : 0.58; }

/** Eigen ratingformule v2. Signalen 0..1; gewichten per positiegroep (som 1). */
export const RATING = {
  version: 'rank11-rating-v2',
  gpaRef: { GK: 0.03, DEF: 0.14, MID: 0.3, FWD: 0.55 },
  weights: {
    GK: { tier: 0.42, out: 0, intl: 0.18, fame: 0.2, exp: 0.2 },
    DEF: { tier: 0.36, out: 0.05, intl: 0.18, fame: 0.24, exp: 0.17 },
    MID: { tier: 0.32, out: 0.12, intl: 0.16, fame: 0.26, exp: 0.14 },
    FWD: { tier: 0.3, out: 0.2, intl: 0.14, fame: 0.26, exp: 0.1 },
  },
};
export function computeRating({ group, club, apps, goals, intCaps, nation, sitelinks, age }) {
  const w = RATING.weights[group];
  const tier = clubTier(club);
  const out = apps > 0 ? clamp((goals || 0) / apps / RATING.gpaRef[group], 0, 1) : 0;
  const intl = clamp((intCaps || 0) / 60, 0, 1) * (STRONG_NATIONS.includes(nation) ? 1 : 0.65);
  const fame = clamp((Math.log(Math.max(1, sitelinks || 1)) - Math.log(8)) / (Math.log(140) - Math.log(8)), 0, 1);
  const exp = clamp((apps || 0) / 250, 0, 1);
  let comp = w.tier * tier + w.out * out + w.intl * intl + w.fame * fame + w.exp * exp;
  comp += age < 20 ? -0.01 : age <= 31 ? 0 : age <= 33 ? -0.03 : -0.07;
  return Math.round(55 + 42.5 * clamp(comp, 0, 1)); // 55..97
}

const POS_MAP = [
  [/goalkeeper/i, 'GK'], [/left[- ]back|left wing[- ]back/i, 'LB'], [/right[- ]back|right wing[- ]back/i, 'RB'],
  [/centre[- ]back|center[- ]back|central defender|sweeper/i, 'CB'], [/defensive midfield/i, 'CDM'],
  [/attacking midfield/i, 'CAM'], [/left winger|left midfield|left wing\b/i, 'LW'], [/right winger|right midfield|right wing\b/i, 'RW'],
  [/centre[- ]forward|center[- ]forward|striker/i, 'ST'], [/central midfield|centre midfield|box-to-box/i, 'CM'],
  [/full[- ]back|wing[- ]back/i, 'FB'], [/winger|wide midfield/i, 'W'], [/forward|attacker/i, 'ST'], [/midfield/i, 'CM'], [/defender/i, 'CB'],
];
const GROUP = { GK: 'GK', CB: 'DEF', RB: 'DEF', LB: 'DEF', CDM: 'MID', CM: 'MID', CAM: 'MID', RM: 'MID', LM: 'MID', RW: 'FWD', LW: 'FWD', ST: 'FWD' };
const hashSide = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 2;
/** Infobox-positietekst → [primair, alternatief] in RANK11-posities, plus of de kant (links/rechts) zeker is. */
export function mapPositions(text, wdLabels, qid) {
  const parts = String(text || '').split(/,|\/| and |;|\n/).map((s) => s.trim()).filter(Boolean);
  const src = parts.length ? parts : wdLabels;
  const out = []; let sideGuessed = false;
  const side = (l, r) => { const lab = (wdLabels || []).join(' ').toLowerCase(); if (/left/.test(lab)) return l; if (/right/.test(lab)) return r; sideGuessed = true; return hashSide(qid) ? l : r; };
  for (const p of src) {
    const hit = POS_MAP.find(([re]) => re.test(p)); if (!hit) continue;
    let pos = hit[1];
    if (pos === 'FB') pos = side('LB', 'RB');
    if (pos === 'W') pos = side('LW', 'RW');
    if (!out.includes(pos)) out.push(pos);
  }
  if (!out.length) out.push('CM');
  return { position: out[0], alt: out.slice(1, 2), group: GROUP[out[0]], sideGuessed };
}

const linkTarget = (s) => { const m = String(s || '').match(/\[\[([^\]|#]+)/); return m ? m[1].trim().replace(/_/g, ' ') : null; };
const stripWiki = (s) => String(s || '').replace(/<ref[\s\S]*?(<\/ref>|\/>)/g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').replace(/\{\{[^}]*\}\}/g, '').replace(/<[^>]+>/g, '').replace(/'''?/g, '').trim();

/** Infobox 'football biography' uit wikitext. Alleen velden die we nodig hebben. */
export function parseInfobox(wt) {
  const i = wt.search(/\{\{\s*Infobox football biography/i);
  if (i < 0) return null;
  let depth = 0, end = -1;
  for (let k = i; k < wt.length - 1; k++) {
    if (wt[k] === '{' && wt[k + 1] === '{') { depth++; k++; } else if (wt[k] === '}' && wt[k + 1] === '}') { depth--; k++; if (depth === 0) { end = k + 1; break; } }
  }
  const box = wt.slice(i, end > 0 ? end : undefined);
  // velden splitsen op '|' aan het begin van een regel (top-level)
  const fields = {};
  for (const m of box.matchAll(/\n\s*\|\s*([a-z_0-9]+)\s*=([^\n]*)/gi)) fields[m[1].toLowerCase()] = m[2].trim();
  const int = (v) => { const m = String(v ?? '').replace(/\{\{0\}\}/g, '').replace(/<[^>]+>|\{\{[^}]*\}\}/g, '').match(/\d[\d,]*/); return m ? Number(m[0].replace(/,/g, '')) : null; };
  let apps = int(fields.totalcaps), goals = int(fields.totalgoals);
  if (apps === null) { apps = 0; goals = 0; for (const [k, v] of Object.entries(fields)) { if (/^caps\d+$/.test(k)) apps += int(v) || 0; if (/^goals\d+$/.test(k)) goals += int(v) || 0; } }
  let intCaps = 0;
  for (const [k, v] of Object.entries(fields)) {
    const n = k.match(/^nationalcaps(\d+)$/); if (!n) continue;
    const team = stripWiki(fields[`nationalteam${n[1]}`] || '');
    if (/U-?\d|under[- ]\d|olympic|\bB\b|amateur|youth/i.test(team)) continue; // alleen het A-elftal
    intCaps = Math.max(intCaps, int(v) || 0);
  }
  const cc = fields.currentclub ?? fields.current_club ?? '';
  return {
    currentclubRaw: stripWiki(cc), currentclubLink: linkTarget(cc),
    clubnumber: (stripWiki(fields.clubnumber ?? fields.club_number ?? '').match(/^\d{1,2}$/) || [null])[0],
    position: stripWiki(fields.position ?? ''), apps, goals, intCaps,
    asof: stripWiki(fields.pcupdate ?? fields.club_update ?? '').slice(0, 40),
  };
}

/** Hoofdroutine. `env.fetch` = fetch-implementatie; `env.lock` = { slots: { p0001: 'Q…' } }. */
export async function runSync(env) {
  const { lock, today, log = () => {}, targetActive = 380 } = env;
  // Maximum aantal spelers per club in de catalogus: topclubs leveren meer bekende spelers.
  const maxPerClub = (club) => (clubTier(club) >= 1 ? 8 : clubTier(club) >= 0.8 ? 5 : 3);
  const f = env.fetch;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const getJson = async (url) => { let last; for (let a = 0; a < 6; a++) { try { const r = await f(url); if (r.status === 429 || r.status >= 500) { last = 'status ' + r.status; await sleep(4000 * (a + 1)); continue; } return await r.json(); } catch (err) { last = err.message; await sleep(4000 * (a + 1)); } } throw new Error('fetch faalde (' + last + '): ' + url.slice(0, 120)); };
  const sparql = async (q) => (await getJson('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(q))).results.bindings;
  const qid = (u) => String(u).split('/').pop();
  const P = new Map();
  const lockedBySlot = lock.slots; const slotByQid = Object.fromEntries(Object.entries(lockedBySlot).map(([s, q]) => [q, s]));
  const rec = (q) => { if (!P.has(q)) P.set(q, { qid: q, clubsWd: [], pos: new Set(), nat: null, cit: null }); return P.get(q); };

  // A. Kandidaten per competitie: open P54 naar een club met P118 = competitie.
  const clubInfo = new Map();
  for (const [lname, lq] of LEAGUES) {
    const rows = await sparql(`SELECT ?p ?club ?clubLabel ?num ?wiki WHERE { ?club wdt:P118 wd:${lq} . ?p p:P54 ?st . ?st ps:P54 ?club . FILTER NOT EXISTS { ?st pq:P582 ?e } FILTER NOT EXISTS { ?p wdt:P570 ?d } ?p wdt:P106 wd:Q937857 . ?p wikibase:sitelinks ?psl . FILTER(?psl >= 12) OPTIONAL { ?st pq:P1618 ?num } OPTIONAL { ?wiki schema:about ?club ; schema:isPartOf <https://en.wikipedia.org/> } SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`);
    for (const b of rows) {
      const c = qid(b.club.value);
      if (!clubInfo.has(c)) clubInfo.set(c, { qid: c, name: b.clubLabel.value, league: lname, wiki: b.wiki ? decodeURIComponent(b.wiki.value.split('/wiki/').pop()).replace(/_/g, ' ') : null });
      rec(qid(b.p.value)).clubsWd.push({ club: c, num: b.num?.value || null });
    }
    log(`A ${lname}: ${rows.length} rijen`);
  }
  for (const q of Object.values(lockedBySlot)) rec(q);

  // B. Basisgegevens in blokken van 200.
  const all = [...P.keys()];
  for (let i = 0; i < all.length; i += 250) {
    const V = all.slice(i, i + 250).map((q) => 'wd:' + q).join(' ');
    const rows = await sparql(`SELECT ?p ?pLabel ?natLabel ?citLabel ?posLabel ?img ?dob ?dod ?sl ?article WHERE { VALUES ?p { ${V} } OPTIONAL { ?p wdt:P1532 ?nat } OPTIONAL { ?p wdt:P27 ?cit } OPTIONAL { ?p wdt:P413 ?pos } OPTIONAL { ?p wdt:P18 ?img } OPTIONAL { ?p wdt:P569 ?dob } OPTIONAL { ?p wdt:P570 ?dod } OPTIONAL { ?p wikibase:sitelinks ?sl } OPTIONAL { ?article schema:about ?p ; schema:isPartOf <https://en.wikipedia.org/> } SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`);
    for (const b of rows) {
      const r = rec(qid(b.p.value));
      r.name = b.pLabel.value; r.dob ??= b.dob?.value?.slice(0, 10); r.dod ??= b.dod?.value?.slice(0, 10); r.sitelinks = Number(b.sl?.value || 0);
      r.nat ??= b.natLabel?.value; r.cit ??= b.citLabel?.value; if (b.posLabel) r.pos.add(b.posLabel.value);
      r.img ??= b.img ? decodeURIComponent(b.img.value.split('/').pop()).replace(/_/g, ' ') : null;
      r.wiki ??= b.article ? decodeURIComponent(b.article.value.split('/wiki/').pop()).replace(/_/g, ' ') : null;
    }
    // open club-verklaringen (incl. rugnummer) van gelockte spelers buiten de 7 competities
    const crow = await sparql(`SELECT ?p ?club ?clubLabel ?num ?wiki WHERE { VALUES ?p { ${V} } ?p p:P54 ?st . ?st ps:P54 ?club . FILTER NOT EXISTS { ?st pq:P582 ?e } OPTIONAL { ?st pq:P1618 ?num } OPTIONAL { ?wiki schema:about ?club ; schema:isPartOf <https://en.wikipedia.org/> } SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`);
    for (const b of crow) {
      const r = rec(qid(b.p.value)); const c = qid(b.club.value);
      if (!r.clubsWd.some((x) => x.club === c)) r.clubsWd.push({ club: c, num: b.num?.value || null });
      if (!clubInfo.has(c)) clubInfo.set(c, { qid: c, name: b.clubLabel.value, league: null, wiki: b.wiki ? decodeURIComponent(b.wiki.value.split('/wiki/').pop()).replace(/_/g, ' ') : null });
    }
    log(`B ${Math.min(i + 250, all.length)}/${all.length}`);
  }

  // C. Wikipedia-infoboxen (50 titels per verzoek). Alleen kandidaten met artikel, geen overlijden,
  //    en (voor nieuwe spelers) minimaal 12 taalversies — anders zijn ze voor kinderen onbekend.
  const cands = [...P.values()].filter((r) => r.wiki && !r.dod && (slotByQid[r.qid] || (r.sitelinks || 0) >= 12));
  const byTitle = new Map(cands.map((r) => [r.wiki, r]));
  const titles = [...byTitle.keys()];
  // Kleine blokken: volledige artikelen zijn groot (rvsection kan alleen per pagina).
  const CH = 12;
  const fetchChunk = async (i) => {
    const chunk = titles.slice(i, i + CH);
    let j;
    try { j = await getJson(`https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content|timestamp&rvslots=main&format=json&formatversion=2&redirects=1&origin=*&titles=${encodeURIComponent(chunk.join('|'))}`); }
    catch (err) { log(`C blok ${i} overgeslagen: ${err.message}`); return; }
    const redir = Object.fromEntries([...(j.query.normalized || []), ...(j.query.redirects || [])].map((x) => [x.to, x.from]));
    for (const pg of j.query.pages || []) {
      let t = pg.title; while (!byTitle.has(t) && redir[t]) t = redir[t];
      const r = byTitle.get(t); if (!r) continue;
      const rev = pg.revisions?.[0]; r.wpRev = rev?.timestamp?.slice(0, 10);
      r.ib = rev ? parseInfobox(rev.slots.main.content) : null;
    }
  };
  for (let i = 0; i < titles.length; i += CH * 3) {
    await Promise.all([0, 1, 2].map((k) => (i + k * CH < titles.length ? fetchChunk(i + k * CH) : null)));
    log(`C ${Math.min(i + CH * 3, titles.length)}/${titles.length}`);
  }

  // D. Infobox-club → Wikidata-QID (via pageprops), en competitie van onbekende clubs.
  const clubByWiki = new Map([...clubInfo.values()].filter((c) => c.wiki).map((c) => [c.wiki, c]));
  const unknown = [...new Set(cands.map((r) => r.ib?.currentclubLink).filter((t) => t && !clubByWiki.has(t)))];
  for (let i = 0; i < unknown.length; i += 50) {
    const chunk = unknown.slice(i, i + 50);
    const j = await getJson(`https://en.wikipedia.org/w/api.php?action=query&prop=pageprops&ppprop=wikibase_item&redirects=1&format=json&formatversion=2&origin=*&titles=${encodeURIComponent(chunk.join('|'))}`);
    const redir = Object.fromEntries([...(j.query.normalized || []), ...(j.query.redirects || [])].map((x) => [x.to, x.from]));
    const found = [];
    for (const pg of j.query.pages || []) {
      const q = pg.pageprops?.wikibase_item; if (!q) continue;
      let t = pg.title; const aliases = [t]; while (redir[t]) { t = redir[t]; aliases.push(t); }
      const c = clubInfo.get(q) || { qid: q, name: pg.title, league: null, wiki: pg.title };
      clubInfo.set(q, c); for (const a of aliases) clubByWiki.set(a, c); found.push(q);
    }
    if (found.length) {
      const rows = await sparql(`SELECT ?c ?l WHERE { VALUES ?c { ${found.map((q) => 'wd:' + q).join(' ')} } ?c wdt:P118 ?l }`);
      const leagueByQ = Object.fromEntries(LEAGUES.map(([n, q]) => [q, n]));
      for (const b of rows) { const c = clubInfo.get(qid(b.c.value)); const ln = leagueByQ[qid(b.l.value)]; if (c && ln) c.league = ln; }
    }
  }
  // Competitie van clubs uit stap B zonder competitie.
  const noLeague = [...clubInfo.values()].filter((c) => !c.league).map((c) => c.qid);
  for (let i = 0; i < noLeague.length; i += 300) {
    const rows = await sparql(`SELECT ?c ?l WHERE { VALUES ?c { ${noLeague.slice(i, i + 300).map((q) => 'wd:' + q).join(' ')} } ?c wdt:P118 ?l }`);
    const leagueByQ = Object.fromEntries(LEAGUES.map(([n, q]) => [q, n]));
    for (const b of rows) { const c = clubInfo.get(qid(b.c.value)); const ln = leagueByQ[qid(b.l.value)]; if (c && ln) c.league = ln; }
  }

  // E. Beoordelen per speler.
  const year = Number(today.slice(0, 4));
  const evald = [];
  for (const r of cands) {
    const warn = [];
    const ib = r.ib;
    let status = 'actief', club = null, clubCheck = 'onbekend';
    if (!ib) { status = 'inactief'; warn.push('geen infobox'); }
    else {
      const raw = ib.currentclubRaw || '';
      if (!ib.currentclubLink || /coach|manager|retired|free agent|unattached|director|assistant/i.test(raw)) { status = 'inactief'; warn.push(`geen huidige profclub (infobox: "${raw.slice(0, 40)}")`); }
      else {
        club = clubByWiki.get(ib.currentclubLink) || null;
        if (!club) { status = 'inactief'; warn.push(`club onbekend: ${ib.currentclubLink}`); }
        else {
          clubCheck = r.clubsWd.some((x) => x.club === club.qid) ? 'bevestigd' : 'afwijkend';
          if (clubCheck === 'afwijkend') warn.push(`Wikidata noemt andere club (${r.clubsWd.map((x) => clubInfo.get(x.club)?.name).filter(Boolean).join(', ') || 'geen'})`);
          if (!club.league) { status = 'inactief'; warn.push(`club buiten de 7 competities: ${club.name}`); }
        }
      }
    }
    const age = r.dob ? year - Number(r.dob.slice(0, 4)) - (today.slice(5) < r.dob.slice(5) ? 1 : 0) : null;
    const pos = mapPositions(ib?.position, [...r.pos], r.qid);
    if (pos.sideGuessed) warn.push('kant (links/rechts) niet in bronnen; afgeleid');
    let number = null, numberCheck = 'geen';
    if (club && ib?.clubnumber) {
      const wdNum = r.clubsWd.find((x) => x.club === club.qid)?.num;
      if (wdNum && wdNum !== ib.clubnumber) { numberCheck = 'conflict'; warn.push(`rugnummer conflict (Wikipedia ${ib.clubnumber}, Wikidata ${wdNum})`); }
      else { number = Number(ib.clubnumber); numberCheck = wdNum ? 'bevestigd' : 'wikipedia'; }
    }
    const nation = r.nat || r.cit || 'Onbekend';
    const rating = ib && ib.apps >= 5 && age !== null
      ? computeRating({ group: pos.group, club: club?.name || '', apps: ib.apps, goals: ib.goals, intCaps: ib.intCaps, nation, sitelinks: r.sitelinks, age })
      : null;
    if (rating === null && status === 'actief') { status = 'inactief'; warn.push('te weinig gegevens voor rating'); }
    const displayName = r.wiki ? r.wiki.replace(/\s*\([^)]*\)\s*$/, '') : r.name;
    evald.push({ qid: r.qid, slot: slotByQid[r.qid] || null, name: displayName, wdLabel: r.name, nation, dob: r.dob, age, sitelinks: r.sitelinks, wiki: r.wiki, wpRev: r.wpRev,
      status, club: club?.name || null, clubQid: club?.qid || null, league: club?.league || null, clubCheck,
      position: pos.position, alt: pos.alt, number, numberCheck, apps: ib?.apps ?? null, goals: ib?.goals ?? null, intCaps: ib?.intCaps ?? null,
      rating, img: r.img || null, warn });
  }
  // Gelockte spelers zonder artikel/overleden alsnog meenemen als inactief.
  for (const [slot, q] of Object.entries(lockedBySlot)) if (!evald.some((e) => e.qid === q)) { const r = P.get(q) || {}; evald.push({ qid: q, slot, name: r.name || q, status: 'inactief', warn: [r.dod ? 'overleden' : 'geen Engels Wikipedia-artikel'] }); }

  if (env.stash) env.stash.evald = evald;
  return selectAndEnrich(evald, env);
}

/**
 * Stap F–H, los aanroepbaar op een eerder verzameld `evald` (dan hoeven Wikidata/Wikipedia niet opnieuw).
 * De rating wordt hier (opnieuw) berekend uit de opgeslagen invoer, zodat een formulewijziging geen nieuwe
 * download vraagt.
 */
export async function selectAndEnrich(evald, env) {
  const { lock, today, log = () => {}, targetActive = 380 } = env;
  const f = env.fetch;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const getJson = async (url) => { let last; for (let a = 0; a < 6; a++) { try { const r = await f(url); if (r.status === 429 || r.status >= 500) { last = 'status ' + r.status; await sleep(4000 * (a + 1)); continue; } return await r.json(); } catch (err) { last = err.message; await sleep(4000 * (a + 1)); } } throw new Error('fetch faalde (' + last + '): ' + url.slice(0, 120)); };
  const sparql = async (q) => (await getJson('https://query.wikidata.org/sparql?format=json&query=' + encodeURIComponent(q))).results.bindings;
  const qid = (u) => String(u).split('/').pop();
  const lockedBySlot = lock.slots;
  const slotByQid = Object.fromEntries(Object.entries(lockedBySlot).map(([s, q]) => [q, s]));
  const maxPerClub = (club) => (clubTier(club) >= 1 ? 10 : clubTier(club) >= 0.8 ? 6 : 3);
  for (const e of evald) {
    e.slot = slotByQid[e.qid] || null;
    if (e.apps != null && e.age != null && e.apps >= 5 && e.position) e.rating = computeRating({ group: GROUP[e.position], club: e.club || '', apps: e.apps, goals: e.goals, intCaps: e.intCaps, nation: e.nation, sitelinks: e.sitelinks, age: e.age });
  }
  // F. Selectie: gelockte slots blijven; aanvullen met nieuwe actieve spelers (hoogste rating, bekendheid),
  //    met een maximum per club en evenwicht per positiegroep.
  const active = evald.filter((e) => e.status === 'actief');
  const perClub = {}; const perGroup = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  const G = (p) => GROUP[p];
  for (const e of active.filter((e) => e.slot)) { perClub[e.club] = (perClub[e.club] || 0) + 1; perGroup[G(e.position)]++; }
  const share = { GK: 0.09, DEF: 0.31, MID: 0.33, FWD: 0.27 };
  const firstNew = Math.max(...Object.keys(lockedBySlot).map((s) => Number(s.slice(1)))) + 1;
  let next = firstNew;
  const additions = [];
  // Volgorde van toevoegen: bekendheid (taalversies) én rating — kinderen moeten de spelers herkennen.
  const fameN = (e) => clamp((Math.log(Math.max(1, e.sitelinks || 1)) - Math.log(12)) / (Math.log(160) - Math.log(12)), 0, 1);
  const prio = (e) => 0.6 * fameN(e) + 0.4 * clamp((e.rating - 60) / 35, 0, 1);
  const pool = active.filter((e) => !e.slot).sort((a, b) => prio(b) - prio(a) || a.qid.localeCompare(b.qid));
  let total = active.filter((e) => e.slot).length;
  for (const e of pool) {
    if (total >= targetActive) break;
    const g = G(e.position);
    if ((perClub[e.club] || 0) >= maxPerClub(e.club)) continue;
    if (perGroup[g] >= Math.ceil(targetActive * share[g])) continue;
    e.slot = 'p' + String(next++).padStart(4, '0');
    perClub[e.club] = (perClub[e.club] || 0) + 1; perGroup[g]++; total++; additions.push(e);
  }
  // Nieuwe slots in volgorde van rating (mooier overzicht); bestaande slots veranderen nooit.
  additions.sort((a, b) => b.rating - a.rating || a.qid.localeCompare(b.qid)).forEach((e, i) => { e.slot = 'p' + String(firstNew + i).padStart(4, '0'); });
  const catalog = evald.filter((e) => e.slot).sort((a, b) => a.slot.localeCompare(b.slot));

  // G. Commons-metadata voor de portretten van de catalogus.
  const files = [...new Set(catalog.map((e) => e.img).filter(Boolean))];
  const meta = new Map();
  const strip = (s) => String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  for (let i = 0; i < files.length; i += 40) {
    const j = await getJson(`https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url|size|extmetadata|mime&iiurlwidth=480&format=json&formatversion=2&origin=*&titles=${encodeURIComponent(files.slice(i, i + 40).map((x) => 'File:' + x).join('|'))}`);
    const back = Object.fromEntries((j.query.normalized || []).map((x) => [x.to, x.from]));
    for (const pg of j.query.pages || []) {
      const ii = pg.imageinfo?.[0]; if (!ii) continue; const em = ii.extmetadata || {};
      const key = (back[pg.title] || pg.title).replace(/^File:/, '');
      meta.set(key, { file: pg.title.replace(/^File:/, ''), page: ii.descriptionurl, w: ii.width, h: ii.height, mime: ii.mime,
        license: em.LicenseShortName?.value || null, licenseUrl: em.LicenseUrl?.value || null, artist: strip(em.Artist?.value).slice(0, 90),
        attribution: em.AttributionRequired?.value === 'true', restrictions: em.Restrictions?.value || '', nonFree: em.NonFree?.value === 'true' });
    }
  }
  for (const e of catalog) e.photo = e.img ? meta.get(e.img) || null : null;

  // H. Clubkleuren (P6364 → P465) voor de eigen clubaanduiding (geen logo's).
  const cq = [...new Set(catalog.map((e) => e.clubQid).filter(Boolean))];
  const colors = {};
  for (let i = 0; i < cq.length; i += 200) {
    const rows = await sparql(`SELECT ?c ?hex WHERE { VALUES ?c { ${cq.slice(i, i + 200).map((q) => 'wd:' + q).join(' ')} } ?c p:P6364 ?s . ?s ps:P6364 ?col . ?col wdt:P465 ?hex . }`);
    for (const b of rows) { const c = qid(b.c.value); (colors[c] ??= []).includes('#' + b.hex.value) || colors[c].push('#' + b.hex.value); }
  }
  for (const e of catalog) e.clubColors = e.clubQid ? (colors[e.clubQid] || []).slice(0, 3) : [];

  const summary = { today, evaluated: evald.length, locked: Object.keys(lockedBySlot).length,
    lockedActive: catalog.filter((e) => e.slot && lockedBySlot[e.slot] && e.status === 'actief').length, additions: additions.length, catalog: catalog.length,
    clubConfirmed: catalog.filter((e) => e.clubCheck === 'bevestigd').length, numbers: catalog.filter((e) => e.number).length };
  log('klaar ' + JSON.stringify(summary));
  return { summary, catalog };
}
