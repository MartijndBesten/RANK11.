/**
 * RANK Oefenmodule: interne demo-Learning Provider met echte oefenvragen.
 * Levert dezelfde LearningEvents als een externe leeromgeving later via een ondertekende webhook zou doen;
 * hier lopen ze lokaal door dezelfde engine-regels (academyReward: idempotentie, minimale duur, plafonds).
 * Oefenscores worden nooit als schoolcijfer opgeslagen.
 */
import { createRng, type ActivityType, type LearningEvent, type Rng } from '@rank11/engine';
import { DEMO_PROVIDER } from '../state/store';

export type AcademySubject = 'wis' | 'fa' | 'en';

export interface Question {
  id: string;
  subjectId: AcademySubject;
  prompt: string;
  /** Uitleg boven de vraag (bijv. "Vertaal naar het Frans"). */
  instruction: string;
  kind: 'number' | 'fraction' | 'choice';
  answer: string;
  options?: string[];
}

export interface Bank { id: AcademySubject; name: string; topic: string; topicLabel: string; description: string }

export const BANKS: Bank[] = [
  { id: 'wis', name: 'Wiskunde', topic: 'rekenvaardigheid', topicLabel: 'Procenten, breuken en vergelijkingen', description: 'Typ zelf het antwoord. Breuken als 3/4.' },
  { id: 'fa', name: 'Frans', topic: 'woordenschat', topicLabel: 'Woordenschat (NL → FR)', description: 'Kies de juiste Franse vertaling.' },
  { id: 'en', name: 'Engels', topic: 'irregular-verbs', topicLabel: 'Irregular verbs (past simple)', description: 'Kies de juiste verleden-tijdsvorm.' },
];

export const QUESTIONS_PER_SESSION = 6;

/* ———————————— Woordenlijsten ———————————— */

const FR: [string, string][] = [
  ['het huis', 'la maison'], ['de school', "l'école"], ['het boek', 'le livre'], ['de hond', 'le chien'],
  ['de kat', 'le chat'], ['het water', "l'eau"], ['de vriend', "l'ami"], ['de stad', 'la ville'],
  ['de auto', 'la voiture'], ['het brood', 'le pain'], ['de zon', 'le soleil'], ['de zee', 'la mer'],
  ['de deur', 'la porte'], ['het raam', 'la fenêtre'], ['de tafel', 'la table'], ['de stoel', 'la chaise'],
  ['de appel', 'la pomme'], ['de fiets', 'le vélo'], ['de week', 'la semaine'], ['de vader', 'le père'],
  ['de moeder', 'la mère'], ['de bal', 'le ballon'], ['het voetbal', 'le football'], ['de leraar', 'le professeur'],
];

const EN: [string, string][] = [
  ['go', 'went'], ['see', 'saw'], ['eat', 'ate'], ['write', 'wrote'], ['take', 'took'], ['give', 'gave'],
  ['come', 'came'], ['run', 'ran'], ['buy', 'bought'], ['think', 'thought'], ['bring', 'brought'], ['catch', 'caught'],
  ['teach', 'taught'], ['find', 'found'], ['speak', 'spoke'], ['drink', 'drank'], ['swim', 'swam'], ['begin', 'began'],
  ['choose', 'chose'], ['fly', 'flew'], ['know', 'knew'], ['throw', 'threw'], ['break', 'broke'], ['win', 'won'],
];

/** Veelgemaakte foute vormen als extra afleiders, zodat de keuze echt nadenken vraagt. */
const EN_WRONG: Record<string, string[]> = {
  go: ['goed', 'gone'], see: ['seed', 'seen'], eat: ['eated', 'eaten'], write: ['writed', 'written'], take: ['taked', 'taken'],
  give: ['gived', 'given'], come: ['comed'], run: ['runned'], buy: ['buyed', 'brought'], think: ['thinked', 'taught'],
  bring: ['bringed', 'bought'], catch: ['catched'], teach: ['teached', 'thought'], find: ['finded'], speak: ['speaked', 'spoken'],
  drink: ['drinked', 'drunk'], swim: ['swimmed', 'swum'], begin: ['beginned', 'begun'], choose: ['choosed', 'chosen'],
  fly: ['flied', 'flown'], know: ['knowed', 'known'], throw: ['throwed', 'thrown'], break: ['breaked', 'broken'], win: ['winned'],
};

/* ———————————— Vragen opbouwen (deterministisch uit een id) ———————————— */

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

function mathQuestion(id: string): Question | null {
  const [, kind, ...p] = id.split('-');
  const n = p.map(Number);
  if (n.some((x) => !Number.isFinite(x))) return null;
  if (kind === 'pct' && n.length === 2) {
    const [pct, base] = n as [number, number];
    return { id, subjectId: 'wis', kind: 'number', instruction: 'Procenten', prompt: `Hoeveel is ${pct}% van ${base}?`, answer: String((pct * base) / 100) };
  }
  if (kind === 'br' && n.length === 2) {
    const [a, b] = n as [number, number];
    const g = gcd(a, b);
    return { id, subjectId: 'wis', kind: 'fraction', instruction: 'Vereenvoudig de breuk zo ver mogelijk', prompt: `${a}/${b}`, answer: `${a / g}/${b / g}` };
  }
  if (kind === 'vgl' && n.length === 3) {
    const [a, b, c] = n as [number, number, number];
    const sign = b < 0 ? '−' : '+';
    return { id, subjectId: 'wis', kind: 'number', instruction: 'Los op: wat is x?', prompt: `${a}x ${sign} ${Math.abs(b)} = ${c}`, answer: String((c - b) / a) };
  }
  return null;
}

function newMathId(rng: Rng): string {
  const t = rng.int(0, 2);
  if (t === 0) {
    const pct = rng.pick([5, 10, 15, 20, 25, 30, 40, 50, 75]);
    const step = pct % 20 === 0 ? 5 : pct % 10 === 0 ? 10 : pct === 25 || pct === 75 ? 4 : 20;
    return `wi-pct-${pct}-${step * rng.int(2, 30)}`;
  }
  if (t === 1) {
    const d = rng.int(3, 12);
    const num = rng.int(1, d - 1);
    const f = rng.int(2, 9);
    return `wi-br-${num * f}-${d * f}`;
  }
  const a = rng.int(2, 9);
  const x = rng.int(-6, 12);
  const b = rng.int(-15, 20) || 4;
  return `wi-vgl-${a}-${b}-${a * x + b}`;
}

function choiceQuestion(id: string, rng: Rng): Question | null {
  const [prefix, , idxText] = id.split('-');
  const idx = Number(idxText);
  if (prefix === 'fa') {
    const item = FR[idx];
    if (!item) return null;
    const others = rng.shuffle(FR.filter((_, i) => i !== idx)).slice(0, 3).map(([, fr]) => fr);
    return { id, subjectId: 'fa', kind: 'choice', instruction: 'Vertaal naar het Frans', prompt: item[0], answer: item[1], options: rng.shuffle([item[1], ...others]) };
  }
  if (prefix === 'en') {
    const item = EN[idx];
    if (!item) return null;
    const wrong = EN_WRONG[item[0]] ?? [];
    const pool = [...wrong, ...rng.shuffle(EN.filter((_, i) => i !== idx)).map(([, past]) => past)].filter((v, i, a) => v !== item[1] && a.indexOf(v) === i);
    return { id, subjectId: 'en', kind: 'choice', instruction: 'Past simple van', prompt: `to ${item[0]}`, answer: item[1], options: rng.shuffle([item[1], ...pool.slice(0, 3)]) };
  }
  return null;
}

export function questionFromId(id: string, rng: Rng = createRng(id)): Question | null {
  return id.startsWith('wi-') ? mathQuestion(id) : choiceQuestion(id, rng);
}

export interface Session {
  bank: Bank;
  questions: (Question & { retry: boolean })[];
  activityType: ActivityType;
}

/** 6 vragen: eerder fout beantwoorde vragen van dit vak eerst (herkansing), daarna nieuwe. */
export function buildSession(subjectId: AcademySubject, previouslyWrong: readonly string[], seed: string): Session {
  const bank = BANKS.find((b) => b.id === subjectId)!;
  const rng = createRng(seed);
  const prefix = subjectId === 'wis' ? 'wi-' : `${subjectId}-`;
  const retries = previouslyWrong.filter((id) => id.startsWith(prefix)).slice(0, QUESTIONS_PER_SESSION)
    .map((id) => questionFromId(id, rng)).filter((q): q is Question => !!q).map((q) => ({ ...q, retry: true }));
  const used = new Set(retries.map((q) => q.id));
  const fresh: (Question & { retry: boolean })[] = [];
  const list = subjectId === 'fa' ? FR : EN;
  const order = subjectId === 'wis' ? [] : rng.shuffle(list.map((_, i) => i));
  for (let i = 0; fresh.length + retries.length < QUESTIONS_PER_SESSION && i < 200; i++) {
    const id = subjectId === 'wis' ? newMathId(rng) : `${subjectId}-v-${String(order[i % order.length]).padStart(3, '0')}`;
    if (used.has(id)) continue;
    const q = questionFromId(id, rng);
    if (!q) continue;
    used.add(id);
    fresh.push({ ...q, retry: false });
  }
  const questions = [...retries, ...fresh];
  return { bank, questions, activityType: retries.length * 2 >= questions.length ? 'mistakes' : 'practice' };
}

/* ———————————— Nakijken ———————————— */

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[’‘`]/g, "'").replace('−', '-');

export function checkAnswer(q: Question, given: string): boolean {
  const g = norm(given);
  if (!g) return false;
  if (q.kind === 'choice') return g === norm(q.answer);
  if (q.kind === 'fraction') {
    const m = g.replace(/\s/g, '').match(/^(-?\d+)\/(\d+)$/);
    return !!m && `${Number(m[1])}/${Number(m[2])}` === q.answer;
  }
  const v = Number(g.replace(',', '.'));
  return Number.isFinite(v) && Math.abs(v - Number(q.answer)) < 1e-9;
}

export const formatAnswer = (q: Question) => (q.kind === 'number' ? q.answer.replace('.', ',') : q.answer);

/* ———————————— Event ———————————— */

export function newEventId(): string {
  const a = new Uint32Array(4);
  crypto.getRandomValues(a);
  return `oef-${[...a].map((x) => x.toString(16).padStart(8, '0')).join('')}`;
}

export function buildEvent(session: Session, input: {
  startedAt: string; completedAt: string; correct: number; answered: number; mistakesFixed: number; status: 'completed' | 'abandoned';
}): LearningEvent {
  return {
    schemaVersion: 1,
    eventId: newEventId(),
    providerId: DEMO_PROVIDER,
    externalUserId: 'leerling-1',
    activityId: `${session.bank.id}-${session.bank.topic}`,
    subjectId: session.bank.id,
    topic: session.bank.topicLabel,
    activityType: session.activityType,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    // Bij afbreken telt alleen wat beantwoord is (minimaal 1, anders weigert de validatie terecht).
    questionCount: input.status === 'completed' ? session.questions.length : Math.max(1, input.answered),
    correctCount: input.correct,
    mistakesFixed: input.mistakesFixed,
    status: input.status,
  };
}
