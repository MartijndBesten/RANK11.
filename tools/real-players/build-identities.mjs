#!/usr/bin/env node
/** RANK11 echte-spelers — stap 1: identiteiten uit Wikidata (CC0). Per competitie de HUIDIGE selecties
 * (P54 met preferred rank = actuele club), met sportnationaliteit (P1532, val terug op P27), posities
 * (P413), geboortejaar (P569) en de Engelse Wikipedia-titel. Bron per speler = Wikidata-QID + raadpleegdatum. */
import { readFileSync, writeFileSync } from 'node:fs';
import { ProxyAgent, setGlobalDispatcher } from '/home/user/RANK11./node_modules/undici/index.js';
setGlobalDispatcher(new ProxyAgent({ uri: process.env.HTTPS_PROXY, requestTls: { ca: readFileSync('/root/.ccr/ca-bundle.crt') } }));
const OUT = '/tmp/claude-0/-home-user/2b34d53d-9e81-5528-af23-ec67682e97dd/scratchpad/rp';
const today = new Date().toISOString().slice(0, 10);

const LEAGUES = [
  ['Premier League', 'Q9448'], ['La Liga', 'Q324867'], ['Serie A', 'Q15804'],
  ['Bundesliga', 'Q82595'], ['Ligue 1', 'Q13394'], ['Eredivisie', 'Q167541'], ['Primeira Liga', 'Q182994'],
];

const sparql = async (q) => {
  const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(q)}`;
  const r = await fetch(url, { headers: { Accept: 'application/sparql-results+json', 'User-Agent': 'RANK11-research/1.0 (rank11 app research)' } });
  if (!r.ok) throw new Error(`SPARQL ${r.status}`);
  return (await r.json()).results.bindings;
};

const query = (leagueQid) => `
SELECT ?player ?playerLabel ?club ?clubLabel ?nat ?natLabel ?p27 ?p27Label ?posLabel (YEAR(?dob) AS ?birth) ?article WHERE {
  ?club wdt:P118 wd:${leagueQid} .
  ?player p:P54 ?st . ?st ps:P54 ?club . ?st wikibase:rank wikibase:PreferredRank .
  FILTER NOT EXISTS { ?player wdt:P570 ?d }
  OPTIONAL { ?player wdt:P1532 ?nat }
  OPTIONAL { ?player wdt:P27 ?p27 }
  OPTIONAL { ?player wdt:P413 ?pos }
  OPTIONAL { ?player wdt:P569 ?dob }
  OPTIONAL { ?article schema:about ?player ; schema:isPartOf <https://en.wikipedia.org/> }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`;

const players = new Map(); // qid -> record
for (const [name, qid] of LEAGUES) {
  try {
    const rows = await sparql(query(qid));
    let n = 0;
    for (const r of rows) {
      const g = (k) => r[k]?.value || '';
      const pq = g('player').split('/').pop();
      if (!pq) continue;
      if (!players.has(pq)) {
        players.set(pq, {
          qid: pq, name: g('playerLabel'), league: name,
          clubQid: g('club').split('/').pop(), club: g('clubLabel'),
          natSport: g('natLabel'), natCitizen: g('p27Label'),
          positions: new Set(), birth: g('birth') ? Number(g('birth')) : null,
          enwiki: g('article') ? decodeURIComponent(g('article').split('/wiki/').pop()) : null,
          source: `Wikidata ${pq} (geraadpleegd ${today})`,
        });
        n++;
      }
      const rec = players.get(pq);
      if (g('posLabel')) rec.positions.add(g('posLabel'));
      if (!rec.natSport && g('natLabel')) rec.natSport = g('natLabel');
      if (!rec.enwiki && g('article')) rec.enwiki = decodeURIComponent(g('article').split('/wiki/').pop());
    }
    console.log(`${name}: ${rows.length} rijen, +${n} nieuwe spelers (totaal ${players.size})`);
  } catch (e) { console.log(`${name}: FOUT ${e.message}`); }
}
const out = [...players.values()].map((p) => ({ ...p, positions: [...p.positions] }));
writeFileSync(`${OUT}/identities.json`, JSON.stringify(out, null, 1));
console.log(`\nTotaal ${out.length} unieke spelers -> identities.json`);
console.log('Met Wikipedia-artikel:', out.filter((p) => p.enwiki).length, '| met geboortejaar:', out.filter((p) => p.birth).length, '| met positie:', out.filter((p) => p.positions.length).length);
