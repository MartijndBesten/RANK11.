/**
 * Lokale spelstatus voor het prototype. Alle spelregels komen uit @rank11/engine;
 * in de functionele fase verhuist precies deze logica naar de server (apps/api, server-authoritative)
 * en wordt dit bestand een dunne API-client. Opslag: localStorage, alleen op dit toestel.
 *
 * Cijfers: eventlog (toevoegen, corrigeren, verwijderen) met volledige geschiedenis; zelf ingevoerd,
 * zonder goedkeuringsstap. XP: ledger met idempotente sleutels, drie categorieën en plafonds.
 */
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  academyReward, applyGradeEvents, autoBestLineup, categoryTotals, checkNewGrade, clubLevel, compareAverages, computeReward,
  correctionXp, createDraft, createRng, DEFAULT_MOTIVATION_CONFIG, CURRENT_PROGRESS_CONFIG, CURRENT_REWARD_CONFIG, deletionXp, progressRewards, quickSellValue, DRAFT_EVENTS, FORMATIONS,
  generateCatalog, gradeKey, gradeXp, openPack, PACKS, resolvePlayer, subjectAverages, validateEvent, weightedAverage,
  type AcademyDecision, type AccountLink, type BattleEvent, type DraftSession, type LeagueResult, type Goal, type Grade, type GradeEvent, type LearningEvent,
  type PackResult, type Player, type ProgressGrant, type PityState, type RewardResult, type Scenario, type UpcomingTest, type XpEntry,
} from '@rank11/engine';
import {
  createPracticeSession, gradePracticeSession, practiceEvent, PRACTICE_SUBJECTS, publicSession, topicProgress, weekStart,
  type ItemState, type PracticeSession,
} from '@rank11/engine';
import type { AcademyOverview, PracticeBackend } from '../academy/types';
import type { CrestData } from '../components/Crest';
import { PHOTOS_ONLY, PORTRAITS } from '../portraits/registry';
import { DEMO_GRADES, DEMO_PENDING, demoGoals, demoUpcoming, PERIODS, subjectById, SUBJECTS, todayIso, type Subject } from './school';

export const CATALOG: Player[] = generateCatalog({ photos: PORTRAITS, photosOnly: PHOTOS_ONLY });
export const CARD_BY_ID = new Map(CATALOG.map((p) => [p.id, p]));
export { SUBJECTS, subjectById, type Subject };

export interface PendingGrade { grade: Grade; arrivedAt: string }

export interface NotifySettings {
  /** Melding bij beloningen die in de kluis wachten. */
  rewards: boolean;
  goals: boolean;
  competition: boolean;
  /** Stille uren (HH:MM); in de app geen meldingen tussen deze tijden. */
  quietFrom: string;
  quietTo: string;
}

/** Logregel van een Academy-beslissing, met de kern van het event voor het overzicht. */
export interface AcademyDecisionLog {
  eventId: string; status: AcademyDecision['status']; xp: number; reason: string;
  subjectId?: string; topic?: string; questionCount?: number; correctCount?: number; mistakesFixed?: number; at?: number;
}

export interface TipsState { on: boolean; seen: string[] }

export interface GameState {
  version: 3;
  club: { name: string; crest: CrestData };
  coins: number;
  vouchers: number;
  packs: Record<string, number>;
  collection: string[];
  formationId: string;
  lineup: Record<string, string>;
  pity: PityState;
  gradeEvents: GradeEvent[];
  /** Ingevoerde cijfers waarvan de beloning nog in de kluis wacht. */
  pendingIds: string[];
  xpLedger: XpEntry[];
  rewards: Record<string, RewardResult>;
  rewardLog: { key: string; date: string }[];
  goals: Goal[];
  upcoming: UpcomingTest[];
  scenarios: Scenario[];
  academy: {
    links: AccountLink[];
    events: LearningEvent[];
    decisions: AcademyDecisionLog[];
    wrong: string[];
    /** Leerstatus per oefenvraag (herhaling met groeiende tussenpozen). */
    items: ItemState[];
  };
  /** Voortgangsbeloningen (V-011): doel, vooruitgang, herstel, topcijfer, Academy-mijlpaal. */
  progressGrants: ProgressGrant[];
  /** Lokale demo-competitie: eigen uitslagen en lopende/afgeronde battles (eventlogs). */
  competition: { results: LeagueResult[]; battles: Record<string, BattleEvent[]> };
  /** Kluisbeloningen waarvoor de melding al getoond is (precies één keer per cijfer). */
  notified: string[];
  /** Speluitleg: automatisch tonen aan/uit en welke uitleg al gezien is (via het vraagteken altijd terug te lezen). */
  tips: TipsState;
  settings: { sound: boolean; reducedMotion: boolean; academy: boolean; notify: NotifySettings };
}

const STORAGE_KEY = 'rank11-proto-v3';
const today = todayIso;
const MC = DEFAULT_MOTIVATION_CONFIG;
export const ME = 'speler-demo';
export const DEMO_PROVIDER = 'rank-demo';

function initialState(): GameState {
  const rng = createRng('rank11-demo-start-v3');
  const pool = (filter: (p: Player) => boolean, n: number) => rng.shuffle(CATALOG.filter(filter)).slice(0, n).map((p) => p.id);
  const gk = pool((p) => p.position === 'GK' && p.rating >= 68 && p.rating < 82 && !p.id.includes('-'), 2);
  const collection = [...new Set([
    ...gk,
    ...pool((p) => p.rarity === 'bronze', 6),
    ...pool((p) => p.rarity === 'silver', 8),
    ...pool((p) => p.rarity === 'gold' && p.rating < 80, 9),
    ...pool((p) => p.rarity === 'rare_gold', 4),
    ...pool((p) => p.rarity === 'exam', 2),
    ...pool((p) => p.rarity === 'special' || p.rarity === 'season', 2),
    ...pool((p) => p.rarity === 'legend' && p.id !== 'L01', 1),
    ...['S01', 'L01'].filter((id) => CARD_BY_ID.has(id)),
  ])];
  // Iedere positie van de 4-4-2 minstens één keer (goud/zilver), zodat het demo-elftal klopt.
  for (const pos of ['LB', 'RB', 'CB', 'CB', 'LM', 'RM', 'CM', 'CM', 'ST', 'ST'] as const) {
    const have = collection.filter((id) => CARD_BY_ID.get(id)?.position === pos).length;
    const need = pos === 'CB' || pos === 'CM' || pos === 'ST' ? 2 : 1;
    if (have >= need) continue;
    const extra = rng.shuffle(CATALOG.filter((p) => p.position === pos && (p.rarity === 'gold' || p.rarity === 'silver') && !collection.includes(p.id))).at(0);
    if (extra) collection.push(extra.id);
  }
  const owned = collection.map((id) => CARD_BY_ID.get(id)).filter((p): p is Player => !!p);
  const formation = FORMATIONS['4-4-2']!;
  const best = autoBestLineup(formation, owned);
  const lineup: Record<string, string> = {};
  for (const [slot, p] of Object.entries(best)) if (p) lineup[slot] = p.id;
  const used = new Set(Object.values(best).map((p) => p?.baseId));
  owned
    .filter((p) => !used.has(p.baseId) && (used.add(p.baseId), true))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 7)
    .forEach((p, i) => { lineup[`bench${i}`] = p.id; });

  const goals = demoGoals();
  // XP-ledger opbouwen door de eerder ingevoerde cijfers chronologisch door de motivatie-engine te halen.
  let ledger: XpEntry[] = [];
  const done: Grade[] = [];
  for (const grade of [...DEMO_GRADES].sort((a, b) => a.date.localeCompare(b.date))) {
    ledger = [...ledger, ...gradeXp(MC, { grade, before: done, goals, ledger, enteredOn: grade.date })];
    done.push(grade);
  }
  const at = (d: string) => `${d}T17:00:00Z`;
  const gradeEvents: GradeEvent[] = [...DEMO_GRADES, ...DEMO_PENDING].map((grade) => ({ type: 'add', at: at(grade.date), grade }));

  return {
    version: 3,
    club: {
      name: 'FC Noorderlicht',
      crest: { shape: 'shield', symbol: 'star', pattern: 'sash', primary: '#0b1f4d', secondary: '#1f6bff', accent: '#f2cf73', short: 'FCN', stars: 1 },
    },
    coins: 12450,
    vouchers: 2,
    packs: { gold: 1, exam: 1 },
    collection,
    formationId: '4-4-2',
    lineup,
    pity: { B: 1, A: 2 },
    gradeEvents,
    pendingIds: DEMO_PENDING.map((p) => p.id),
    xpLedger: ledger,
    rewards: {},
    rewardLog: [],
    goals,
    upcoming: demoUpcoming(today()),
    scenarios: [],
    academy: { links: [{ providerId: DEMO_PROVIDER, externalUserId: 'leerling-1', playerId: ME, linkedAt: '2026-10-01T12:00:00Z' }], events: [], decisions: [], wrong: [], items: [] },
    progressGrants: [],
    competition: { results: [], battles: {} },
    notified: [],
    tips: { on: true, seen: [] },
    settings: { sound: true, reducedMotion: false, academy: true, notify: { rewards: true, goals: true, competition: true, quietFrom: '21:30', quietTo: '07:30' } },
  };
}

function load(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as GameState;
      // Alleen bewaarde kaarten die nog in de catalogus bestaan (catalogus kan krimpen tot spelers met portret).
      if (parsed.version === 3) return { ...parsed, academy: { ...parsed.academy, items: parsed.academy.items ?? [] }, competition: parsed.competition ?? { results: [], battles: {} }, progressGrants: parsed.progressGrants ?? [], tips: parsed.tips ?? { on: true, seen: [] }, collection: parsed.collection.filter((id) => CARD_BY_ID.has(id)) };
    }
  } catch {
    /* privémodus of geblokkeerde opslag: gewoon met demo-data starten */
  }
  return initialState();
}

function save(state: GameState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* niet fataal */
  }
}

/** Seed per actie uit een cryptografische bron; op de server gaat deze seed mee in de auditlog. */
function freshSeed(): string {
  const a = new Uint32Array(2);
  crypto.getRandomValues(a);
  return `${a[0]}-${a[1]}`;
}

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${freshSeed().split('-')[0]}`;

export interface RevealOutcome {
  grade: Grade;
  subjectBefore: number | null;
  subjectAfter: number | null;
  overallBefore: number | null;
  overallAfter: number | null;
  reward: RewardResult;
  xpEntries: XpEntry[];
  pickOptions?: Player[];
  /** Online: de toekenning op de server (voor de spelerskeuze). */
  grantId?: string;
  /** Extra voortgangsbeloningen die met dit cijfer zijn verdiend. */
  progress?: ProgressGrant[];
}

export interface GradeInput { subjectId: string; testName: string; value: number; weight: number; date: string }
export interface ImportOutcome { created: number; duplicate: number; invalid: number }
export interface IntegrationProvider {
  id: string; name: string; school: string | null; available: boolean; note: string | null;
  link: { linked: boolean; status?: string; displayName?: string | null; lastSyncAt?: number | null; lastError?: string | null };
}
export interface Integrations {
  list: () => MaybePromise<IntegrationProvider[]>;
  connect: (id: string) => MaybePromise<void>;
  sync: (id: string) => MaybePromise<ImportOutcome>;
  disconnect: (id: string) => MaybePromise<void>;
}
export type ActionResult = { ok: true; id?: string } | { ok: false; error: string; duplicateOf?: string };

type MaybePromise<T> = T | Promise<T>;

/** Gedeelde store-interface: lokale demo (localStorage) of online (server). Muterende acties kunnen async zijn. */
export interface Store {
  mode: 'demo' | 'online';
  /** Ingelogde speler (alleen online). */
  user?: { id: string; username: string; role?: string } | null;
  state: GameState;
  owned: Player[];
  /** Alle actuele cijfers (afgeleid uit de eventlog), inclusief cijfers waarvan de beloning nog wacht. */
  grades: Grade[];
  pending: PendingGrade[];
  history: Map<string, { at: string; type: GradeEvent['type']; before?: Grade; after?: Grade; reason?: string }[]>;
  xp: { total: number; byCategory: Record<'performance' | 'progress' | 'academy', number>; level: ReturnType<typeof clubLevel> };
  /** Wat deze modus kan (bijv. snel verkopen of de demo-competitie). */
  can: { quickSell: boolean; demoCompetition: boolean; academy: boolean; exit: boolean };
  openPackFromInventory: (packId: string) => MaybePromise<PackResult | null>;
  buyPack: (packId: string) => MaybePromise<boolean>;
  startDraft: () => MaybePromise<DraftSession | null>;
  /** Online: keuze in de draft vastleggen op de server (lokaal geen effect). */
  draftPick: (slotId: string, playerId: string) => MaybePromise<void>;
  addGrade: (input: GradeInput) => MaybePromise<ActionResult>;
  /** Meerdere cijfers tegelijk uit een bestandsimport. Herkomst 'import'; dedup voorkomt dubbele beloningen. */
  importGrades: (rows: GradeInput[]) => MaybePromise<ImportOutcome>;
  /** Externe cijferkoppelingen (demo: lokaal voorbeeld; online: via de server). */
  integrations: Integrations;
  correctGrade: (gradeId: string, changes: Partial<GradeInput>, reason?: string) => MaybePromise<ActionResult>;
  deleteGrade: (gradeId: string, reason?: string) => MaybePromise<ActionResult>;
  revealGrade: (gradeId: string) => RevealOutcome | null;
  claimPick: (cardId: string, grantId?: string) => MaybePromise<void>;
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt'>) => MaybePromise<void>;
  removeGoal: (goalId: string) => MaybePromise<void>;
  addUpcoming: (test: Omit<UpcomingTest, 'id'>) => MaybePromise<ActionResult>;
  removeUpcoming: (testId: string) => MaybePromise<void>;
  saveScenario: (scenario: Omit<Scenario, 'id'>) => void;
  removeScenario: (id: string) => void;
  submitLearningEvent: (event: LearningEvent) => AcademyDecision;
  /** Oefenmodule: lokaal (demo, in de browser nagekeken) of op de server. */
  practice: PracticeBackend;
  recordWrongAnswers: (wrong: string[], fixed: string[]) => void;
  saveBattle: (matchId: string, events: BattleEvent[], result?: LeagueResult) => void;
  setLineup: (formationId: string, lineup: Record<string, string>) => MaybePromise<void>;
  quickSell: (cardIds: string[]) => MaybePromise<number>;
  setSetting: (key: 'sound' | 'reducedMotion' | 'academy', value: boolean) => void;
  setNotify: (changes: Partial<NotifySettings>) => void;
  /** Speluitleg automatisch tonen (aan/uit). Uitleg blijft via het vraagteken terug te lezen. */
  setTipsOn: (on: boolean) => void;
  /** Uitleg gezien of overgeslagen: niet meer vanzelf tonen. */
  markTipSeen: (id: string) => void;
  markNotified: (gradeIds: string[]) => void;
  reset: () => void;
  /** Online: uitloggen. Demo: terug naar het startscherm. */
  logout: () => MaybePromise<void>;
}

export const StoreCtx = createContext<Store | null>(null);
const Ctx = StoreCtx;

export { quickSellValue };

/** Voortgangsbeloningen toepassen op de speltoestand (coins, vouchers, packs); idempotent per sleutel. */
function withProgress(s: GameState, grades: Grade[], ledger: XpEntry[]): { next: GameState; grants: ProgressGrant[] } {
  const grants = progressRewards(CURRENT_PROGRESS_CONFIG, { grades, goals: s.goals, ledger, grants: s.progressGrants, periods: PERIODS, today: todayIso() });
  if (!grants.length) return { next: s, grants };
  const packs = { ...s.packs };
  for (const g of grants) if (g.packId) packs[g.packId] = (packs[g.packId] ?? 0) + 1;
  return {
    next: { ...s, packs, coins: s.coins + grants.reduce((a, g) => a + g.coins, 0), vouchers: s.vouchers + grants.reduce((a, g) => a + g.vouchers, 0), progressGrants: [...s.progressGrants, ...grants] },
    grants,
  };
}

const overallOf = (list: Grade[]) => {
  const vals = [...subjectAverages(list).values()];
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
};

function decisionLog(event: LearningEvent, decision: AcademyDecision): AcademyDecisionLog {
  return {
    eventId: event.eventId, status: decision.status, xp: decision.entries.reduce((a, e) => a + e.xp, 0), reason: decision.reason,
    subjectId: event.subjectId, topic: event.topic, questionCount: event.questionCount, correctCount: event.correctCount,
    mistakesFixed: event.mistakesFixed, at: Date.parse(event.completedAt),
  };
}

/** Overzicht van de oefenmodule uit de lokale stand (zelfde vorm als GET /api/academy). */
function localOverview(s: GameState): AcademyOverview {
  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const ledger = s.xpLedger.filter((e) => e.category === 'academy');
  const sum = (pred: (d: string) => boolean) => ledger.filter((e) => e.xp > 0 && pred(e.date)).reduce((a, e) => a + e.xp, 0);
  return {
    subjects: PRACTICE_SUBJECTS.map((x) => ({ id: x.id, name: x.name, topics: x.topics.map((t) => ({ id: t.id, label: t.label, description: t.description })) })),
    progress: topicProgress(s.academy.items, PRACTICE_SUBJECTS, now),
    xp: { total: ledger.reduce((a, e) => a + e.xp, 0), today: sum((d) => d === today), week: sum((d) => weekStart(d) === weekStart(today)), dailyCap: MC.academy.dailyCap, weeklyCap: MC.academy.weeklyCap },
    recent: [...s.academy.decisions].reverse().slice(0, 20).map((d) => ({
      eventId: d.eventId, subjectId: d.subjectId ?? '', topic: d.topic ?? 'Oefening', questionCount: d.questionCount ?? 0, correctCount: d.correctCount ?? 0,
      mistakesFixed: d.mistakesFixed ?? 0, decision: d.status, xp: d.xp, at: d.at ?? 0,
    })),
  };
}

export function StoreProvider({ children, onExit }: { children: ReactNode; onExit?: () => void }) {
  const [state, setState] = useState<GameState>(load);

  const update = useCallback((fn: (s: GameState) => GameState) => {
    setState((prev) => {
      const next = fn(prev);
      save(next);
      return next;
    });
  }, []);

  const owned = useMemo(() => state.collection.map((id) => CARD_BY_ID.get(id)).filter((p): p is Player => !!p), [state.collection]);
  const book = useMemo(() => applyGradeEvents(state.gradeEvents), [state.gradeEvents]);
  const pending = useMemo(
    () => state.pendingIds.map((id) => book.grades.find((g) => g.id === id)).filter((g): g is Grade => !!g)
      .map((grade) => ({ grade, arrivedAt: [...state.gradeEvents].reverse().find((e) => e.type === 'add' && e.grade.id === grade.id)?.at ?? '' })),
    [book, state.pendingIds, state.gradeEvents],
  );
  const xp = useMemo(() => {
    const byCategory = categoryTotals(state.xpLedger);
    const total = Math.max(0, byCategory.performance + byCategory.progress + byCategory.academy);
    return { total, byCategory, level: clubLevel(total) };
  }, [state.xpLedger]);

  const openPackFromInventory = useCallback((packId: string) => {
    const def = PACKS[packId];
    if (!def || (state.packs[packId] ?? 0) < 1) return null;
    const result = openPack(def, CATALOG, createRng(freshSeed()));
    update((s) => ({
      ...s,
      packs: { ...s.packs, [packId]: Math.max(0, (s.packs[packId] ?? 0) - 1) },
      collection: [...s.collection, ...result.pulls.map((p) => p.card.id)],
    }));
    return result;
  }, [state.packs, update]);

  const buyPack = useCallback((packId: string) => {
    const price = PACKS[packId]?.coinPrice;
    if (!price || state.coins < price) return false;
    update((s) => (s.coins < price ? s : { ...s, coins: s.coins - price, packs: { ...s.packs, [packId]: (s.packs[packId] ?? 0) + 1 } }));
    return true;
  }, [state.coins, update]);

  const startDraft = useCallback(() => {
    const event = DRAFT_EVENTS.toetsweek1!;
    if (state.vouchers < event.voucherCost) return null;
    const { session, pity } = createDraft(event, CATALOG, createRng(freshSeed()), state.pity);
    update((s) => ({ ...s, vouchers: s.vouchers - event.voucherCost, pity }));
    return session;
  }, [state.vouchers, state.pity, update]);

  const addGrade = useCallback((input: GradeInput): ActionResult => {
    const grade: Grade = { id: uid('c'), subjectId: input.subjectId, testName: input.testName.trim(), value: Math.round(input.value * 100) / 100, weight: input.weight, date: input.date, status: 'registered', source: 'manual' };
    const check = checkNewGrade(book, grade, undefined, today());
    if (!check.ok) return { ok: false, error: check.error ?? 'Ongeldig cijfer.', duplicateOf: check.duplicateOf };
    update((s) => ({ ...s, gradeEvents: [...s.gradeEvents, { type: 'add', at: new Date().toISOString(), grade }], pendingIds: [...s.pendingIds, grade.id] }));
    return { ok: true, id: grade.id };
  }, [book, update]);

  const importGrades = useCallback((rows: GradeInput[]): ImportOutcome => {
    let duplicate = 0, invalid = 0;
    const running = [...book.grades];
    const toAdd: Grade[] = [];
    for (const input of rows) {
      const grade: Grade = { id: uid('c'), subjectId: input.subjectId, testName: input.testName.trim(), value: Math.round(input.value * 100) / 100, weight: input.weight, date: input.date, status: 'registered', source: 'import' };
      // Dedup op toets-identiteit (vak + toetsnaam + datum, via checkNewGrade). Twee verschillende toetsen met
      // toevallig hetzelfde cijfer op dezelfde datum blijven allebei behouden.
      const check = checkNewGrade({ ...book, grades: running }, grade, undefined, today());
      if (!check.ok) { if (check.duplicateOf) duplicate++; else invalid++; continue; }
      running.push(grade); toAdd.push(grade);
    }
    if (toAdd.length) update((s) => ({
      ...s,
      gradeEvents: [...s.gradeEvents, ...toAdd.map((grade) => ({ type: 'add' as const, at: new Date().toISOString(), grade }))],
      pendingIds: [...s.pendingIds, ...toAdd.map((g) => g.id)],
    }));
    return { created: toAdd.length, duplicate, invalid };
  }, [book, update]);

  // Demo-koppeling: een lokaal voorbeeld met synthetische cijfers, zodat de preview de koppeling toont zonder server.
  const SAMPLE_ROWS: GradeInput[] = [
    { subjectId: 'wis', testName: 'SO Hoofdstuk 1', value: 6.8, weight: 2, date: '2026-09-15' },
    { subjectId: 'ne', testName: 'Leesvaardigheid', value: 7.5, weight: 1, date: '2026-09-22' },
    { subjectId: 'en', testName: 'Reading Unit 2', value: 8.1, weight: 2, date: '2026-10-02' },
    { subjectId: 'fa', testName: 'Vocabulaire', value: 5.4, weight: 1, date: '2026-10-09' },
    { subjectId: 'bi', testName: 'Toets Cellen', value: 7.0, weight: 2, date: '2026-10-16' },
  ];
  const DEMO_LINK_KEY = 'rank11-demo-link-sample';
  const demoLinked = () => { try { return localStorage.getItem(DEMO_LINK_KEY) === '1'; } catch { return false; } };
  const integrations = useMemo<Integrations>(() => ({
    list: () => [
      { id: 'sample', name: 'Voorbeeldkoppeling', school: null, available: true, note: 'Synthetische voorbeeldcijfers om de koppeling te proberen. Geen echte schoolgegevens.', link: { linked: demoLinked() } },
      { id: 'magister', name: 'Magister', school: 'De Passie', available: false, note: 'Nog niet beschikbaar: een koppeling per leerling vraagt een officieel toegestane route via de school of een geautoriseerde partner.', link: { linked: false } },
    ],
    connect: (id) => { if (id === 'sample') { try { localStorage.setItem(DEMO_LINK_KEY, '1'); } catch { /* */ } importGrades(SAMPLE_ROWS); } },
    sync: (id) => (id === 'sample' ? importGrades(SAMPLE_ROWS) : { created: 0, duplicate: 0, invalid: 0 }),
    disconnect: (id) => { if (id === 'sample') { try { localStorage.removeItem(DEMO_LINK_KEY); } catch { /* */ } } },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [importGrades]);

  const correctGrade = useCallback((gradeId: string, changes: Partial<GradeInput>, reason?: string): ActionResult => {
    const before = book.grades.find((g) => g.id === gradeId);
    if (!before) return { ok: false, error: 'Dit cijfer bestaat niet (meer).' };
    const after: Grade = { ...before, ...changes, testName: (changes.testName ?? before.testName).trim() };
    const others = { ...book, grades: book.grades.filter((g) => g.id !== gradeId) };
    const check = checkNewGrade(others, after, undefined, today());
    if (!check.ok) return { ok: false, error: check.error ?? 'Ongeldige correctie.' };
    const isPending = state.pendingIds.includes(gradeId);
    update((s) => ({
      ...s,
      gradeEvents: [...s.gradeEvents, { type: 'correct', at: new Date().toISOString(), gradeId, changes, reason }],
      xpLedger: isPending ? s.xpLedger : [...s.xpLedger, ...correctionXp(MC, s.xpLedger, before, after, today())],
    }));
    return { ok: true };
  }, [book, state.pendingIds, update]);

  const deleteGrade = useCallback((gradeId: string, reason?: string): ActionResult => {
    const grade = book.grades.find((g) => g.id === gradeId);
    if (!grade) return { ok: false, error: 'Dit cijfer bestaat niet (meer).' };
    const isPending = state.pendingIds.includes(gradeId);
    update((s) => ({
      ...s,
      gradeEvents: [...s.gradeEvents, { type: 'delete', at: new Date().toISOString(), gradeId, reason }],
      pendingIds: s.pendingIds.filter((id) => id !== gradeId),
      xpLedger: isPending ? s.xpLedger : [...s.xpLedger, ...deletionXp(MC, s.xpLedger, grade, today())],
    }));
    return { ok: true };
  }, [book, state.pendingIds, update]);

  const revealGrade = useCallback((gradeId: string): RevealOutcome | null => {
    const g = book.grades.find((x) => x.id === gradeId);
    if (!g || !state.pendingIds.includes(gradeId)) return null;
    const revealed = book.grades.filter((x) => !state.pendingIds.includes(x.id));
    const subjectList = revealed.filter((x) => x.subjectId === g.subjectId);
    const subjectBefore = weightedAverage(subjectList);
    const subjectAfter = weightedAverage([...subjectList, g]);
    const day = today();
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
    const key = gradeKey(g);
    const cards = computeReward(CURRENT_REWARD_CONFIG, {
      grade: g,
      subjectAvgBefore: subjectBefore,
      subjectAvgAfter: subjectAfter,
      rewardedToday: state.rewardLog.filter((r) => r.date === day).length,
      rewardedThisWeek: state.rewardLog.filter((r) => r.date >= weekAgo).length,
      previous: state.rewards[key],
    });
    // XP komt uit de motivatie-engine (categorieën, plafonds); coins, packs en vouchers uit de beloningsconfig.
    const xpEntries = gradeXp(MC, { grade: g, before: revealed, goals: state.goals, ledger: state.xpLedger, enteredOn: day });
    const goalPacks = xpEntries.filter((e) => e.packId).map((e) => e.packId as string);
    const reward: RewardResult = { ...cards, xp: xpEntries.reduce((s, e) => s + e.xp, 0) };
    let pickOptions: Player[] | undefined;
    if (reward.pick) {
      const rng = createRng(freshSeed());
      pickOptions = rng.shuffle(CATALOG.filter((p) => p.rating >= reward.pick!.minRating && !p.temporary)).slice(0, reward.pick.options);
    }
    const counts = reward.status === 'rewarded' || reward.status === 'correction';
    const progress = withProgress(state, [...revealed, g], [...state.xpLedger, ...xpEntries]).grants;
    update((s) => {
      const packs = { ...s.packs };
      for (const id of [...(reward.packId ? [reward.packId] : []), ...goalPacks]) packs[id] = (packs[id] ?? 0) + 1;
      const base: GameState = {
        ...s,
        pendingIds: s.pendingIds.filter((id) => id !== gradeId),
        xpLedger: [...s.xpLedger, ...xpEntries],
        coins: s.coins + reward.coins,
        packs,
        vouchers: s.vouchers + reward.vouchers,
        rewards: reward.tier ? { ...s.rewards, [key]: reward } : s.rewards,
        rewardLog: counts ? [...s.rewardLog, { key, date: day }] : s.rewardLog,
      };
      return withProgress(base, [...revealed, g], base.xpLedger).next;
    });
    return { grade: g, subjectBefore, subjectAfter, overallBefore: overallOf(revealed), overallAfter: overallOf([...revealed, g]), reward, xpEntries, pickOptions, progress };
  }, [book, state, update]);

  const claimPick = useCallback((cardId: string) => {
    update((s) => ({ ...s, collection: [...s.collection, cardId] }));
  }, [update]);

  const addGoal = useCallback((goal: Omit<Goal, 'id' | 'createdAt'>) => {
    update((s) => ({
      ...s,
      goals: [...s.goals.filter((x) => !(x.scope === goal.scope && x.subjectId === goal.subjectId)), { ...goal, id: uid('doel'), createdAt: new Date().toISOString() }],
    }));
  }, [update]);
  const removeGoal = useCallback((goalId: string) => update((s) => ({ ...s, goals: s.goals.filter((x) => x.id !== goalId) })), [update]);

  const addUpcoming = useCallback((test: Omit<UpcomingTest, 'id'>): ActionResult => {
    if (!test.name.trim()) return { ok: false, error: 'Geef de toets een naam.' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(test.date) || test.date < today()) return { ok: false, error: 'Kies een datum vanaf vandaag.' };
    if (!(test.weight > 0 && test.weight <= 10)) return { ok: false, error: 'Weging moet tussen 0 en 10 liggen.' };
    update((s) => ({ ...s, upcoming: [...s.upcoming, { ...test, name: test.name.trim(), id: uid('t') }] }));
    return { ok: true };
  }, [update]);
  const removeUpcoming = useCallback((testId: string) => update((s) => ({ ...s, upcoming: s.upcoming.filter((t) => t.id !== testId) })), [update]);

  const saveScenario = useCallback((scenario: Omit<Scenario, 'id'>) => {
    update((s) => ({ ...s, scenarios: [...s.scenarios, { ...scenario, id: uid('sc') }].slice(-6) }));
  }, [update]);
  const removeScenario = useCallback((id: string) => update((s) => ({ ...s, scenarios: s.scenarios.filter((x) => x.id !== id) })), [update]);

  const submitLearningEvent = useCallback((raw: LearningEvent): AcademyDecision => {
    const event = validateEvent(raw);
    const playerId = resolvePlayer(state.academy.links, event);
    const decision = academyReward(MC, event, { enabled: state.settings.academy, playerId, history: state.academy.events, ledger: state.xpLedger });
    update((s) => ({
      ...s,
      academy: {
        ...s.academy,
        // Alleen echte, afgeronde pogingen tellen als eerdere poging (te snel, afgebroken of niet gekoppeld niet).
        events: ['rewarded', 'capped', 'no-learning-value'].includes(decision.status) ? [...s.academy.events, event] : s.academy.events,
        decisions: [...s.academy.decisions, decisionLog(event, decision)].slice(-50),
      },
      xpLedger: [...s.xpLedger, ...decision.entries],
    }));
    return decision;
  }, [state.academy, state.settings.academy, state.xpLedger, update]);

  const recordWrongAnswers = useCallback((wrong: string[], fixed: string[]) => {
    update((s) => ({ ...s, academy: { ...s.academy, wrong: [...new Set([...s.academy.wrong.filter((id) => !fixed.includes(id)), ...wrong])] } }));
  }, [update]);

  // Oefenmodule (demo): de engine maakt en kijkt na in de browser; antwoorden blijven in het geheugen van deze pagina.
  const stateRef = useRef(state);
  stateRef.current = state;
  const sessionsRef = useRef(new Map<string, PracticeSession>());
  const practice = useMemo<PracticeBackend>(() => ({
    kind: 'lokaal',
    overview: async () => localOverview(stateRef.current),
    start: async (subjectId, topic) => {
      const session = createPracticeSession({ subjectId, topic, seed: freshSeed(), itemStates: stateRef.current.academy.items, now: new Date().toISOString(), sessionId: uid('ps') });
      sessionsRef.current.set(session.id, session);
      return publicSession(session);
    },
    submit: async (sessionId, answers, abandoned = false) => {
      const session = sessionsRef.current.get(sessionId);
      if (!session) throw new Error('Deze oefening is niet meer beschikbaar. Start een nieuwe.');
      sessionsRef.current.delete(sessionId);
      const now = new Date().toISOString();
      const graded = gradePracticeSession(session, answers, now);
      const event = validateEvent(practiceEvent(session, graded, {
        eventId: uid('ev'), providerId: DEMO_PROVIDER, externalUserId: 'leerling-1', completedAt: now, status: abandoned ? 'abandoned' : 'completed',
      }));
      const s0 = stateRef.current;
      const decision = academyReward(MC, event, { enabled: s0.settings.academy, playerId: resolvePlayer(s0.academy.links, event), history: s0.academy.events, ledger: s0.xpLedger });
      // Bij afbreken tellen alleen de beantwoorde vragen mee voor de herhaling.
      const states = abandoned ? graded.states.filter((x) => answers[x.id] !== undefined) : graded.states;
      const items = [...s0.academy.items.filter((x) => !states.some((n) => n.id === x.id)), ...states];
      const revealedGrades = applyGradeEvents(s0.gradeEvents).grades.filter((x) => !s0.pendingIds.includes(x.id));
      const progress = withProgress(s0, revealedGrades, [...s0.xpLedger, ...decision.entries]).grants;
      update((s) => withProgress({
        ...s,
        academy: {
          ...s.academy,
          items: [...s.academy.items.filter((x) => !states.some((n) => n.id === x.id)), ...states],
          events: ['rewarded', 'capped', 'no-learning-value'].includes(decision.status) ? [...s.academy.events, event] : s.academy.events,
          decisions: [...s.academy.decisions, decisionLog(event, decision)].slice(-50),
        },
        xpLedger: [...s.xpLedger, ...decision.entries],
      }, revealedGrades, [...s.xpLedger, ...decision.entries]).next);
      return {
        results: graded.results.map((r) => ({ id: r.id, correct: r.correct, given: r.given, answer: r.answer, reason: r.reason, fixed: r.fixed, masteredNow: r.masteredNow })),
        summary: { questionCount: graded.questionCount, correctCount: graded.correctCount, mistakesFixed: graded.mistakesFixed, newlyMastered: graded.newlyMastered },
        decision: { status: decision.status, reason: decision.reason, xp: decision.entries.reduce((a, e) => a + e.xp, 0), entries: decision.entries.map((e) => ({ key: e.key, xp: e.xp, label: e.label, cappedBy: e.cappedBy ?? 0 })) },
        progress: progress.map((g) => ({ key: g.key, kind: g.kind, label: g.label, packId: g.packId ?? null, vouchers: g.vouchers, coins: g.coins, cappedVouchers: g.cappedVouchers ?? 0 })),
        topicProgress: topicProgress(items, PRACTICE_SUBJECTS, now).filter((t) => t.subjectId === session.subjectId),
      };
    },
  }), [update]);

  const saveBattle = useCallback((matchId: string, events: BattleEvent[], result?: LeagueResult) => {
    update((s) => ({
      ...s,
      competition: {
        battles: { ...s.competition.battles, [matchId]: events },
        results: result && !s.competition.results.some((r) => r.id === result.id) ? [...s.competition.results, result] : s.competition.results,
      },
    }));
  }, [update]);

  const setLineup = useCallback((formationId: string, lineup: Record<string, string>) => {
    update((s) => ({ ...s, formationId, lineup }));
  }, [update]);

  const quickSell = useCallback((cardIds: string[]) => {
    let total = 0;
    update((s) => {
      const collection = [...s.collection];
      const inLineup = new Set(Object.values(s.lineup));
      total = 0;
      for (const id of cardIds) {
        if (inLineup.has(id)) continue;
        const idx = collection.lastIndexOf(id);
        if (idx >= 0) {
          collection.splice(idx, 1);
          total += quickSellValue(CARD_BY_ID.get(id)!);
        }
      }
      return { ...s, collection, coins: s.coins + total };
    });
    return total;
  }, [update]);

  const setSetting = useCallback((key: 'sound' | 'reducedMotion' | 'academy', value: boolean) => {
    update((s) => ({ ...s, settings: { ...s.settings, [key]: value } }));
  }, [update]);
  const setNotify = useCallback((changes: Partial<NotifySettings>) => {
    update((s) => ({ ...s, settings: { ...s.settings, notify: { ...s.settings.notify, ...changes } } }));
  }, [update]);

  const setTipsOn = useCallback((on: boolean) => {
    update((s) => ({ ...s, tips: { ...s.tips, on } }));
  }, [update]);
  const markTipSeen = useCallback((id: string) => {
    update((s) => (s.tips.seen.includes(id) ? s : { ...s, tips: { ...s.tips, seen: [...s.tips.seen, id] } }));
  }, [update]);

  const markNotified = useCallback((gradeIds: string[]) => {
    update((s) => ({ ...s, notified: [...new Set([...s.notified, ...gradeIds])] }));
  }, [update]);

  const reset = useCallback(() => {
    const fresh = initialState();
    save(fresh);
    setState(fresh);
  }, []);

  const value = useMemo<Store>(
    () => ({
      mode: 'demo' as const, user: null, can: { quickSell: true, demoCompetition: true, academy: true, exit: !!onExit }, draftPick: () => undefined, logout: () => onExit?.(),
      state, owned, grades: book.grades, pending, history: book.history, xp, openPackFromInventory, buyPack, startDraft,
      addGrade, importGrades, integrations, correctGrade, deleteGrade, revealGrade, claimPick, addGoal, removeGoal, addUpcoming, removeUpcoming,
      saveScenario, removeScenario, submitLearningEvent, practice, recordWrongAnswers, saveBattle, setLineup, quickSell, setSetting, setNotify, setTipsOn, markTipSeen, markNotified, reset,
    }),
    [state, owned, book, pending, xp, openPackFromInventory, buyPack, startDraft, addGrade, importGrades, integrations, correctGrade, deleteGrade, revealGrade, claimPick,
      addGoal, removeGoal, addUpcoming, removeUpcoming, saveScenario, removeScenario, submitLearningEvent, practice, recordWrongAnswers, saveBattle, setLineup,
      quickSell, setSetting, setNotify, setTipsOn, markTipSeen, markNotified, reset, onExit],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore buiten StoreProvider');
  return s;
}

/** In stille uren geen meldingen (geen dark patterns: niets dat 's avonds laat terugroept). */
export function inQuietHours(n: NotifySettings, now = new Date()): boolean {
  const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return n.quietFrom <= n.quietTo ? hm >= n.quietFrom && hm < n.quietTo : hm >= n.quietFrom || hm < n.quietTo;
}

export { compareAverages };
