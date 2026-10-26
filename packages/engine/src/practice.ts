/**
 * RANK Oefenmodule (interne Learning Provider) als gedeelde engine: vraagbanken, sessies met herhaling
 * van fouten (spaced repetition), nakijken en voortgang per onderwerp.
 *
 * Veiligheid: de server maakt de sessie en bewaart de juiste antwoorden; de app krijgt `publicSession()`
 * zonder antwoorden en stuurt alleen de gegeven antwoorden terug. Nakijken gebeurt met `gradePracticeSession`.
 *
 * Herhaling:
 *  - fout beantwoord → de vraag komt na minstens 1 dag terug ("herkansing");
 *  - goed in een LATERE sessie na een fout = een echte verbeterde fout (`mistakesFixed`);
 *  - opeenvolgend goed bij herhaling: intervallen 1, 3, 7, 14 dagen; na 3 keer gespreid goed = beheerst;
 *  - vragen die nog niet aan de beurt zijn, tellen als "extra": goed daar schuift het schema niet op.
 * Oefenscores zijn nooit schoolcijfers.
 */
import type { ActivityType, LearningEvent } from './academy.ts';
import { createRng, type Rng } from './rng.ts';

export type PracticeSubjectId = 'wis' | 'fa' | 'en';
export interface PracticeTopic { id: string; subjectId: PracticeSubjectId; label: string; description: string }
export interface PracticeSubject { id: PracticeSubjectId; name: string; topics: PracticeTopic[] }

export const PRACTICE_SUBJECTS: PracticeSubject[] = [
  { id: 'wis', name: 'Wiskunde', topics: [
    { id: 'procenten', subjectId: 'wis', label: 'Procenten', description: 'Typ zelf het antwoord.' },
    { id: 'breuken', subjectId: 'wis', label: 'Breuken vereenvoudigen', description: 'Typ de breuk als 3/4.' },
    { id: 'vergelijkingen', subjectId: 'wis', label: 'Vergelijkingen', description: 'Los op: wat is x?' },
  ] },
  { id: 'fa', name: 'Frans', topics: [{ id: 'woordenschat', subjectId: 'fa', label: 'Woordenschat (NL → FR)', description: 'Kies de juiste Franse vertaling.' }] },
  { id: 'en', name: 'Engels', topics: [{ id: 'irregular-verbs', subjectId: 'en', label: 'Irregular verbs (past simple)', description: 'Kies de juiste verleden-tijdsvorm.' }] },
];

export const PRACTICE_SESSION_SIZE = 6;
const ITEMS_PER_MATH_TOPIC = 24;
const DAY = 864e5;
const INTERVALS_DAYS = [1, 3, 7, 14];
const MASTERED_AFTER = 3;

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

/** Veelgemaakte foute vormen als afleiders, zodat de keuze echt nadenken vraagt. */
const EN_WRONG: Record<string, string[]> = {
  go: ['goed', 'gone'], see: ['seed', 'seen'], eat: ['eated', 'eaten'], write: ['writed', 'written'], take: ['taked', 'taken'],
  give: ['gived', 'given'], come: ['comed'], run: ['runned'], buy: ['buyed', 'brought'], think: ['thinked', 'taught'],
  bring: ['bringed', 'bought'], catch: ['catched'], teach: ['teached', 'thought'], find: ['finded'], speak: ['speaked', 'spoken'],
  drink: ['drinked', 'drunk'], swim: ['swimmed', 'swum'], begin: ['beginned', 'begun'], choose: ['choosed', 'chosen'],
  fly: ['flied', 'flown'], know: ['knowed', 'known'], throw: ['throwed', 'thrown'], break: ['breaked', 'broken'], win: ['winned'],
};

/* ———————————— Vragen (deterministisch uit een id) ———————————— */

export interface PracticeQuestion {
  id: string;
  subjectId: PracticeSubjectId;
  topic: string;
  prompt: string;
  instruction: string;
  kind: 'number' | 'fraction' | 'choice';
  answer: string;
  options?: string[];
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

export function topicOfItem(id: string): { subjectId: PracticeSubjectId; topic: string } | null {
  if (id.startsWith('wi-pct-')) return { subjectId: 'wis', topic: 'procenten' };
  if (id.startsWith('wi-br-')) return { subjectId: 'wis', topic: 'breuken' };
  if (id.startsWith('wi-vgl-')) return { subjectId: 'wis', topic: 'vergelijkingen' };
  if (id.startsWith('fa-v-')) return { subjectId: 'fa', topic: 'woordenschat' };
  if (id.startsWith('en-v-')) return { subjectId: 'en', topic: 'irregular-verbs' };
  return null;
}

/** Id's van rekenvragen: wi-<soort>-<getallen>, met 'n' als minteken (bijv. wi-vgl-3-n4-11), zodat '-' scheidt. */
const enc = (v: number) => (v < 0 ? `n${-v}` : String(v));

function mathQuestion(id: string): PracticeQuestion | null {
  const m = id.match(/^wi-(pct|br|vgl)-(n?\d+(?:-n?\d+)*)$/);
  if (!m) return null;
  const kind = m[1];
  const n = (m[2] as string).split('-').map((x) => (x.startsWith('n') ? -Number(x.slice(1)) : Number(x)));
  if (kind === 'pct' && n.length === 2) {
    const [pct, base] = n as [number, number];
    return { id, subjectId: 'wis', topic: 'procenten', kind: 'number', instruction: 'Procenten', prompt: `Hoeveel is ${pct}% van ${base}?`, answer: String((pct * base) / 100) };
  }
  if (kind === 'br' && n.length === 2) {
    const [a, b] = n as [number, number];
    if (b === 0) return null;
    const g = gcd(a, b);
    return { id, subjectId: 'wis', topic: 'breuken', kind: 'fraction', instruction: 'Vereenvoudig de breuk zo ver mogelijk', prompt: `${a}/${b}`, answer: `${a / g}/${b / g}` };
  }
  if (kind === 'vgl' && n.length === 3) {
    const [a, b, c] = n as [number, number, number];
    if (a === 0) return null;
    const sign = b < 0 ? '−' : '+';
    return { id, subjectId: 'wis', topic: 'vergelijkingen', kind: 'number', instruction: 'Los op: wat is x?', prompt: `${a}x ${sign} ${Math.abs(b)} = ${c}`, answer: String((c - b) / a) };
  }
  return null;
}

function choiceQuestion(id: string): PracticeQuestion | null {
  const [prefix, , idxText] = id.split('-');
  const idx = Number(idxText);
  const rng = createRng(`opties:${id}`);
  if (prefix === 'fa') {
    const item = FR[idx];
    if (!item) return null;
    const others = rng.shuffle(FR.filter((_, i) => i !== idx)).slice(0, 3).map(([, fr]) => fr);
    return { id, subjectId: 'fa', topic: 'woordenschat', kind: 'choice', instruction: 'Vertaal naar het Frans', prompt: item[0], answer: item[1], options: rng.shuffle([item[1], ...others]) };
  }
  if (prefix === 'en') {
    const item = EN[idx];
    if (!item) return null;
    const wrong = EN_WRONG[item[0]] ?? [];
    const pool = [...wrong, ...rng.shuffle(EN.filter((_, i) => i !== idx)).map(([, past]) => past)].filter((v, i, a) => v !== item[1] && a.indexOf(v) === i);
    return { id, subjectId: 'en', topic: 'irregular-verbs', kind: 'choice', instruction: 'Past simple van', prompt: `to ${item[0]}`, answer: item[1], options: rng.shuffle([item[1], ...pool.slice(0, 3)]) };
  }
  return null;
}

/** Vraag uit een stabiel id; dezelfde id geeft altijd dezelfde vraag en antwoordopties (server én app). */
export function practiceQuestion(id: string): PracticeQuestion | null {
  if (id.length > 40) return null;
  return id.startsWith('wi-') ? mathQuestion(id) : choiceQuestion(id);
}

function newMathId(rng: Rng, topic: string): string {
  if (topic === 'procenten') {
    const pct = rng.pick([5, 10, 15, 20, 25, 30, 40, 50, 75]);
    const step = pct % 20 === 0 ? 5 : pct % 10 === 0 ? 10 : pct === 25 || pct === 75 ? 4 : 20;
    return `wi-pct-${pct}-${step * rng.int(2, 30)}`;
  }
  if (topic === 'breuken') {
    const d = rng.int(3, 12);
    const num = rng.int(1, d - 1);
    const f = rng.int(2, 9);
    return `wi-br-${num * f}-${d * f}`;
  }
  const a = rng.int(2, 9);
  const x = rng.int(-6, 12);
  const b = rng.int(-15, 20) || 4;
  return `wi-vgl-${a}-${enc(b)}-${enc(a * x + b)}`;
}

const topicCache = new Map<string, string[]>();
/** Vaste, eindige itempool per onderwerp, zodat voortgang in procenten betekenis heeft. */
export function topicItems(subjectId: PracticeSubjectId, topic: string): string[] {
  const cacheKey = `${subjectId}:${topic}`;
  const cached = topicCache.get(cacheKey);
  if (cached) return cached;
  let ids: string[] = [];
  if (subjectId === 'fa') ids = FR.map((_, i) => `fa-v-${String(i).padStart(3, '0')}`);
  else if (subjectId === 'en') ids = EN.map((_, i) => `en-v-${String(i).padStart(3, '0')}`);
  else {
    const rng = createRng(`bank:wis:${topic}`);
    const set = new Set<string>();
    for (let i = 0; set.size < ITEMS_PER_MATH_TOPIC && i < 2000; i++) {
      const id = newMathId(rng, topic);
      if (practiceQuestion(id)) set.add(id);
    }
    ids = [...set];
  }
  topicCache.set(cacheKey, ids);
  return ids;
}

/* ———————————— Nakijken van één antwoord ———————————— */

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[’‘`]/g, "'").replace('−', '-');

export function checkPracticeAnswer(q: PracticeQuestion, given: string): boolean {
  const g = norm(given ?? '');
  if (!g) return false;
  if (q.kind === 'choice') return g === norm(q.answer);
  if (q.kind === 'fraction') {
    const m = g.replace(/\s/g, '').match(/^(-?\d+)\/(\d+)$/);
    return !!m && `${Number(m[1])}/${Number(m[2])}` === q.answer;
  }
  const v = Number(g.replace(',', '.'));
  return Number.isFinite(v) && Math.abs(v - Number(q.answer)) < 1e-9;
}

/* ———————————— Sessies en herhaling ———————————— */

export interface ItemState {
  id: string;
  subjectId: PracticeSubjectId;
  topic: string;
  seen: number;
  correct: number;
  /** Aantal keer achter elkaar goed bij een herhaling die aan de beurt was. */
  correctStreak: number;
  /** Fout beantwoord en nog niet in een latere sessie goed gedaan. */
  wrongOpen: boolean;
  lastWrongSessionId?: string;
  lastSessionId?: string;
  lastSeenAt?: string;
  /** Vanaf dit moment komt de vraag weer aan de beurt. */
  dueAt: string;
  mastered: boolean;
  /** Aantal echte verbeterde fouten (goed in een latere sessie na fout). */
  fixes: number;
}

export type ItemReason = 'fix' | 'review' | 'new' | 'extra';
export interface PracticeItem extends PracticeQuestion { reason: ItemReason }

export interface PracticeSession {
  id: string;
  subjectId: PracticeSubjectId;
  /** Onderwerp, of null voor een mix van alle onderwerpen van het vak. */
  topic: string | null;
  createdAt: string;
  items: PracticeItem[];
  /** Momentopname van de itemstatus bij het maken (alleen op de server; nodig om na te kijken). */
  priorStates: ItemState[];
}

export type PublicPracticeItem = Omit<PracticeItem, 'answer'>;
export interface PublicPracticeSession { id: string; subjectId: PracticeSubjectId; topic: string | null; createdAt: string; items: PublicPracticeItem[] }

/** Wat de app te zien krijgt: geen antwoorden, geen itemstatus. */
export function publicSession(s: PracticeSession): PublicPracticeSession {
  return { id: s.id, subjectId: s.subjectId, topic: s.topic, createdAt: s.createdAt, items: s.items.map(({ answer: _answer, ...rest }) => rest) };
}

export interface CreateSessionInput {
  subjectId: PracticeSubjectId;
  topic?: string | null;
  seed: string;
  itemStates: readonly ItemState[];
  /** ISO-tijdstip. */
  now: string;
  size?: number;
  sessionId?: string;
}

export function createPracticeSession(input: CreateSessionInput): PracticeSession {
  const { subjectId, seed, itemStates, now } = input;
  const size = input.size ?? PRACTICE_SESSION_SIZE;
  const subject = PRACTICE_SUBJECTS.find((s) => s.id === subjectId);
  if (!subject) throw new Error('Onbekend oefenvak.');
  const topic = input.topic ?? null;
  if (topic && !subject.topics.some((t) => t.id === topic)) throw new Error('Onbekend onderwerp.');
  const topics = topic ? [topic] : subject.topics.map((t) => t.id);
  const pool = new Set(topics.flatMap((t) => topicItems(subjectId, t)));
  const states = new Map(itemStates.filter((s) => pool.has(s.id)).map((s) => [s.id, s]));
  const rng = createRng(`sessie:${seed}`);
  const t = Date.parse(now);
  const due = (s: ItemState) => Date.parse(s.dueAt) <= t;

  const byDue = (a: ItemState, b: ItemState) => a.dueAt.localeCompare(b.dueAt) || a.id.localeCompare(b.id);
  const fix = [...states.values()].filter((s) => s.wrongOpen && due(s)).sort(byDue);
  const review = [...states.values()].filter((s) => !s.wrongOpen && due(s)).sort(byDue);
  const fresh = rng.shuffle([...pool].filter((id) => !states.has(id)));
  const extra = [...states.values()].filter((s) => !s.wrongOpen && !due(s)).sort(byDue);

  const picked: { id: string; reason: ItemReason }[] = [];
  const take = (ids: string[], reason: ItemReason, max: number) => {
    for (const id of ids) {
      if (picked.length >= max) break;
      if (!picked.some((p) => p.id === id)) picked.push({ id, reason });
    }
  };
  // Herhaling eerst, maar houd (als het kan) twee plekken vrij voor nieuwe stof.
  const reserveNew = Math.min(2, fresh.length, Math.floor(size / 3));
  take(fix.map((s) => s.id), 'fix', size - reserveNew);
  take(review.map((s) => s.id), 'review', size - reserveNew);
  take(fresh, 'new', size);
  take(review.map((s) => s.id), 'review', size);
  take(extra.map((s) => s.id), 'extra', size);

  const items = picked.map(({ id, reason }) => ({ ...(practiceQuestion(id) as PracticeQuestion), reason }));
  return {
    id: input.sessionId ?? `ps-${seed}`,
    subjectId,
    topic,
    createdAt: now,
    items: rng.shuffle(items),
    priorStates: [...states.values()].filter((s) => picked.some((p) => p.id === s.id)),
  };
}

export interface GradedItem { id: string; correct: boolean; given: string; answer: string; reason: ItemReason; fixed: boolean; masteredNow: boolean }
export interface GradedSession {
  sessionId: string;
  results: GradedItem[];
  /** Bijgewerkte status van de items uit deze sessie (de server overschrijft alleen deze). */
  states: ItemState[];
  questionCount: number;
  correctCount: number;
  answeredCount: number;
  mistakesFixed: number;
  newlyMastered: string[];
  activityType: ActivityType;
  /** Zelfde vragenset = zelfde sleutel; een identieke sessie levert geen XP op. */
  contentKey: string;
}

function fnv(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function gradePracticeSession(session: PracticeSession, answers: Readonly<Record<string, string>>, now: string): GradedSession {
  const prior = new Map(session.priorStates.map((s) => [s.id, s]));
  const t = Date.parse(now);
  const results: GradedItem[] = [];
  const states: ItemState[] = [];
  for (const item of session.items) {
    const given = typeof answers[item.id] === 'string' ? (answers[item.id] as string).slice(0, 40) : '';
    const correct = checkPracticeAnswer(item, given);
    const prev = prior.get(item.id);
    const base: ItemState = prev ?? { id: item.id, subjectId: item.subjectId, topic: item.topic, seen: 0, correct: 0, correctStreak: 0, wrongOpen: false, dueAt: now, mastered: false, fixes: 0 };
    let next: ItemState;
    let fixed = false;
    let masteredNow = false;
    if (!correct) {
      next = { ...base, seen: base.seen + 1, correctStreak: 0, wrongOpen: true, lastWrongSessionId: session.id, mastered: false, dueAt: new Date(t + DAY).toISOString() };
    } else if (item.reason === 'extra') {
      // Goed op een vraag die nog niet aan de beurt was: wel geoefend, schema schuift niet op.
      next = { ...base, seen: base.seen + 1, correct: base.correct + 1 };
    } else {
      fixed = !!prev?.wrongOpen && prev.lastWrongSessionId !== session.id && Date.parse(prev.dueAt) <= t;
      const streak = base.correctStreak + 1;
      const interval = INTERVALS_DAYS[Math.min(streak - 1, INTERVALS_DAYS.length - 1)] as number;
      const mastered = streak >= MASTERED_AFTER;
      masteredNow = mastered && !base.mastered;
      next = { ...base, seen: base.seen + 1, correct: base.correct + 1, correctStreak: streak, wrongOpen: false, mastered, fixes: base.fixes + (fixed ? 1 : 0), dueAt: new Date(t + interval * DAY).toISOString() };
    }
    next = { ...next, lastSessionId: session.id, lastSeenAt: now };
    states.push(next);
    results.push({ id: item.id, correct, given, answer: item.answer, reason: item.reason, fixed, masteredNow });
  }
  const mistakesFixed = results.filter((r) => r.fixed).length;
  const ids = session.items.map((i) => i.id).sort();
  return {
    sessionId: session.id,
    results,
    states,
    questionCount: results.length,
    correctCount: results.filter((r) => r.correct).length,
    answeredCount: results.filter((r) => r.given !== '').length,
    mistakesFixed,
    newlyMastered: results.filter((r) => r.masteredNow).map((r) => r.id),
    activityType: results.filter((r) => r.reason === 'fix').length * 2 >= results.length ? 'mistakes' : 'practice',
    contentKey: `ck-${session.subjectId}-${fnv(ids.join(','))}`,
  };
}

/** LearningEvent voor de beloningsregels (academyReward), met de vragenset als `contentKey`. */
export function practiceEvent(
  session: PracticeSession,
  graded: GradedSession,
  meta: { eventId: string; providerId: string; externalUserId: string; startedAt?: string; completedAt: string; status?: 'completed' | 'abandoned' },
): LearningEvent {
  const subject = PRACTICE_SUBJECTS.find((s) => s.id === session.subjectId)!;
  const topicLabel = session.topic ? subject.topics.find((x) => x.id === session.topic)!.label : `${subject.name} (mix)`;
  const status = meta.status ?? 'completed';
  return {
    schemaVersion: 1,
    eventId: meta.eventId,
    providerId: meta.providerId,
    externalUserId: meta.externalUserId,
    activityId: `${session.subjectId}-${session.topic ?? 'mix'}`,
    subjectId: session.subjectId,
    topic: topicLabel,
    activityType: graded.activityType,
    startedAt: meta.startedAt ?? session.createdAt,
    completedAt: meta.completedAt,
    questionCount: status === 'completed' ? graded.questionCount : Math.max(1, graded.answeredCount),
    correctCount: graded.correctCount,
    mistakesFixed: graded.mistakesFixed,
    status,
    contentKey: graded.contentKey,
  };
}

export interface TopicProgressRow {
  subjectId: PracticeSubjectId;
  topic: string;
  label: string;
  total: number;
  mastered: number;
  learning: number;
  /** Nu aan de beurt (herhaling of herkansing). */
  due: number;
  /** Nog niet geoefend. */
  fresh: number;
  /** Aandeel beheerst (0-1). */
  pct: number;
}

/** Voortgang per onderwerp: beheerst, aan het leren, aan de beurt en nieuw. */
export function topicProgress(itemStates: readonly ItemState[], subjects: readonly PracticeSubject[] = PRACTICE_SUBJECTS, now?: string): TopicProgressRow[] {
  const t = now ? Date.parse(now) : Number.POSITIVE_INFINITY;
  const states = new Map(itemStates.map((s) => [s.id, s]));
  return subjects.flatMap((subject) => subject.topics.map((topic) => {
    const ids = topicItems(subject.id, topic.id);
    const list = ids.map((id) => states.get(id)).filter((s): s is ItemState => !!s);
    const mastered = list.filter((s) => s.mastered).length;
    const due = now ? list.filter((s) => Date.parse(s.dueAt) <= t).length : 0;
    return {
      subjectId: subject.id, topic: topic.id, label: topic.label, total: ids.length,
      mastered, learning: list.length - mastered, due, fresh: ids.length - list.length,
      pct: ids.length ? mastered / ids.length : 0,
    };
  }));
}
