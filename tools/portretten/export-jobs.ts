/**
 * Maakt per speler (baseId) een portretopdracht voor gen.py.
 * Gebruik: node --experimental-strip-types tools/portretten/export-jobs.ts > jobs.json
 * Alle personen zijn fictief; prompts noemen nooit een bestaande persoon.
 */
import { CLUBS, generateCatalog, NATIONS, type Player } from '../../packages/engine/src/index.ts';

const SKIN = ['fair skin', 'light skin', 'olive skin', 'tan skin', 'brown skin', 'dark brown skin'];
const HAIR: Record<string, string> = {
  buzz: 'a buzz cut', short: 'short textured hair', curly: 'short curly hair', fade: 'a skin fade haircut with a short textured top',
  long: 'shoulder-length hair tied back', bun: 'hair tied in a small bun', bald: 'a shaved head', afro: 'a short afro', mohawk: 'a short faded mohawk',
};
const HAIR_COLOR: Record<string, string> = {
  '#141414': 'black', '#2b1d14': 'dark brown', '#4a2f1d': 'brown', '#7a5230': 'light brown', '#b88a4a': 'dark blond', '#d9c08c': 'blond', '#8a2f16': 'ginger',
};
const BEARD = ['clean-shaven', 'light stubble', 'a short full beard'];
const BUILD = ['lean athletic build', 'athletic build', 'muscular broad-shouldered build'];
const POSES = [
  'arms crossed', 'hands on hips', 'arms relaxed at his sides', 'one fist pressed to his chest',
  'body slightly turned, looking over his shoulder at the camera', 'arms crossed, chin slightly raised', 'hands clasped in front of him',
];
const EXPRESSIONS = ['confident expression', 'focused determined expression', 'slight confident smile', 'calm intense gaze', 'proud expression'];
const DEMONYM: Record<string, string> = {
  NL: 'Dutch', BE: 'Belgian', DE: 'German', FR: 'French', ES: 'Spanish', PT: 'Portuguese', IT: 'Italian', EN: 'English',
  BR: 'Brazilian', AR: 'Argentine', MA: 'Moroccan', SN: 'Senegalese', NG: 'Nigerian', GH: 'Ghanaian', JP: 'Japanese',
  DK: 'Danish', NO: 'Norwegian', SE: 'Swedish', PL: 'Polish', HR: 'Croatian', TR: 'Turkish', CO: 'Colombian', UY: 'Uruguayan', AT: 'Austrian',
};
const NAMED: [string, number, number, number][] = [
  ['black', 15, 15, 18], ['white', 245, 245, 245], ['navy blue', 15, 40, 100], ['royal blue', 30, 80, 170], ['sky blue', 120, 180, 230],
  ['red', 200, 20, 40], ['maroon', 110, 30, 45], ['green', 15, 125, 70], ['teal', 10, 125, 140], ['yellow', 242, 200, 0],
  ['orange', 255, 105, 20], ['purple', 90, 40, 135], ['gold', 210, 170, 60], ['cream', 245, 240, 230], ['pink', 255, 80, 155],
];
function colorName(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return NAMED.reduce((best, c) => {
    const d = (c[1] - r) ** 2 + (c[2] - g) ** 2 + (c[3] - b) ** 2;
    return d < best.d ? { name: c[0], d } : best;
  }, { name: 'black', d: Infinity }).name;
}
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function kit(p: Player): string {
  const club = CLUBS.find((c) => c.id === p.clubId)!;
  const a = colorName(club.primary);
  const b = colorName(club.secondary);
  if (p.clubId === 'leg') return 'a plain classic black football shirt with an ivory and gold collar';
  if (p.position === 'GK') return `a plain ${colorName(club.accent) === a ? 'lime green' : colorName(club.accent)} long-sleeved goalkeeper jersey, wearing goalkeeper gloves`;
  switch (club.pattern) {
    case 'stripes': return `a plain ${a} and ${b} vertically striped football shirt`;
    case 'halves': return `a plain football shirt split in ${a} and ${b} halves`;
    case 'sash': return `a plain ${a} football shirt with a diagonal ${b} sash`;
    case 'chevron': return `a plain ${a} football shirt with a ${b} chevron across the chest`;
    case 'quarters': return `a plain ${a} and ${b} quartered football shirt`;
    default: return `a plain ${a} football shirt with ${b} trim`;
  }
}

export function promptFor(p: Player): string {
  const h = hash(p.baseId);
  const legend = p.rarity === 'legend';
  const who = legend ? 'a fictional male football icon at the peak of his career' : `a fictional male professional ${p.position === 'GK' ? 'goalkeeper' : 'football player'}`;
  // Kapsel passend bij het uiterlijk houden (de parametrische catalogus kiest kapsel en huid los van elkaar).
  const hair = (p.portrait.hair === 'afro' && p.portrait.skin < 3) ? 'curly' : p.portrait.hair;
  const look = `${p.age} years old, ${DEMONYM[p.nation] ?? ''} appearance, ${SKIN[p.portrait.skin]}, ${HAIR[hair]}${hair === 'bald' ? '' : ` (${HAIR_COLOR[p.portrait.hairColor] ?? 'dark brown'})`}, ${BEARD[p.portrait.beard]}, ${BUILD[p.portrait.build]}`;
  return [
    `Professional sports photography portrait of ${who}`,
    look,
    `wearing ${kit(p)}, no logos, no text, no badges, no sponsor, no numbers`,
    `upper body from the waist up, ${POSES[h % POSES.length]}, slight three-quarter angle, ${EXPRESSIONS[(h >> 3) % EXPRESSIONS.length]}, looking at the camera`,
    `${legend ? 'warm golden' : 'dramatic stadium floodlight'} rim lighting from behind, soft key light on the face, plain dark charcoal studio background`,
    'sharp focus, natural skin texture, 85mm lens, photorealistic, magazine cover quality',
  ].join(', ');
}

const all = generateCatalog();
const bases = new Map<string, Player>();
for (const p of all) if (!bases.has(p.baseId)) bases.set(p.baseId, p);
// Volgorde: legends en spelers met speciale edities eerst, daarna op rating.
const special = new Set(all.filter((p) => p.id !== p.baseId).map((p) => p.baseId));
const ordered = [...bases.values()].sort((a, b) =>
  Number(b.rarity === 'legend') - Number(a.rarity === 'legend') || Number(special.has(b.baseId)) - Number(special.has(a.baseId)) || b.rating - a.rating);
const DONE = new Set(['S01', 'L01']); // al handmatig gemaakt en goedgekeurd als voorbeeld
const jobs = ordered.filter((p) => !DONE.has(p.baseId)).map((p) => ({ id: p.baseId, seed: hash(`seed:${p.baseId}`) % 100000, width: 640, height: 800, prompt: promptFor(p) }));
void NATIONS;
process.stdout.write(JSON.stringify(jobs, null, 1));
