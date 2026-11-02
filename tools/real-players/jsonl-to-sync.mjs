#!/usr/bin/env node
/**
 * Zet de compacte export uit de browser-run (één JSON-array per regel, zie kolommen hieronder) om naar het
 * sync-formaat dat finalize.mjs leest. Kolommen:
 *  0 slot · 1 qid · 2 naam (en.wikipedia-titel) · 3 nationaliteit · 4 leeftijd · 5 actief(1/0) · 6 club · 7 competitie
 *  8 club-check (b=bevestigd, a=afwijkend, o=onbekend) · 9 positie · 10 alt-positie · 11 rugnummer
 *  12 nummer-check (b/w/c/g) · 13 rating · 14 wiki-titel ('=' = gelijk aan naam) · 15 waarschuwingen ('KANT' = kant afgeleid)
 *  16 Commons-bestand · 17 licentie · 18 maker · 19 Commons-personality-waarschuwing(1/0) · 20 non-free(1/0) · 21 clubkleuren
 */
import { readFileSync, writeFileSync } from 'node:fs';
const [, , input, output, today = '2026-11-02'] = process.argv;
const CHECK = { b: 'bevestigd', a: 'afwijkend', o: 'onbekend' };
const NUM = { b: 'bevestigd', w: 'wikipedia', c: 'conflict', g: 'geen' };
const LIC_URL = (l) => {
  const m = l.match(/^CC (BY(?:-SA)?) (\d\.\d)(?: ([a-z]{2}))?$/i);
  if (m) return `https://creativecommons.org/licenses/${m[1].toLowerCase()}/${m[2]}/${m[3] ? `${m[3]}/` : ''}`;
  if (/^CC0$/i.test(l)) return 'https://creativecommons.org/publicdomain/zero/1.0/';
  return null;
};
const rows = readFileSync(input, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const catalog = rows.map((r) => ({
  slot: r[0], qid: r[1], name: r[2], nation: r[3], age: r[4] === '' ? null : r[4], status: r[5] ? 'actief' : 'inactief',
  club: r[6] || null, league: r[7] || null, clubCheck: CHECK[r[8]] ?? 'onbekend', position: r[9], alt: r[10] ? [r[10]] : [],
  number: r[11] === '' ? null : r[11], numberCheck: NUM[r[12]] ?? 'geen', rating: r[13] === '' ? null : r[13],
  wiki: r[14] === '=' ? r[2] : r[14] || null,
  warn: r[15] ? r[15].split('; ').map((w) => (w === 'KANT' ? 'kant (links/rechts) niet in bronnen; afgeleid' : w)) : [],
  photo: r[16] ? { file: r[16], page: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(r[16].replace(/ /g, '_'))}`, license: r[17], licenseUrl: LIC_URL(r[17]), artist: r[18], restrictions: r[19] ? 'personality' : '', nonFree: !!r[20] } : null,
  clubColors: r[21] ? r[21].split(' ') : [],
}));
writeFileSync(output, JSON.stringify({ today, source: 'browser-run sync.mjs (Wikidata/Wikipedia/Commons)', catalog }, null, 1) + '\n');
console.log(`${catalog.length} spelers -> ${output}`);
