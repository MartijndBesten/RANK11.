/**
 * Lokale spelstatus voor het designprototype. Alle spelregels komen uit @rank11/engine;
 * in de functionele fase verhuist precies deze logica naar de server (server-authoritative)
 * en wordt dit bestand een dunne API-client. Opslag: localStorage, alleen op dit toestel.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  autoBestLineup, compareAverages, computeReward, createDraft, createRng, DEFAULT_REWARD_CONFIG, DRAFT_EVENTS,
  FORMATIONS, generateCatalog, gradeKey, openPack, PACKS, subjectAverages, weightedAverage,
  type DraftSession, type Grade, type PackResult, type Player, type PityState, type RewardResult,
} from '@rank11/engine';
import type { CrestData } from '../components/Crest';

export const CATALOG: Player[] = generateCatalog();
export const CARD_BY_ID = new Map(CATALOG.map((p) => [p.id, p]));

export interface Subject { id: string; name: string; short: string; color: string }
export const SUBJECTS: Subject[] = [
  { id: 'wis', name: 'Wiskunde', short: 'WI', color: '#3aa8ff' },
  { id: 'ne', name: 'Nederlands', short: 'NE', color: '#ff8a3d' },
  { id: 'en', name: 'Engels', short: 'EN', color: '#e84a5f' },
  { id: 'fa', name: 'Frans', short: 'FA', color: '#5b6cff' },
  { id: 'bi', name: 'Biologie', short: 'BI', color: '#2fe39a' },
  { id: 'gs', name: 'Geschiedenis', short: 'GS', color: '#d9a441' },
  { id: 'nask', name: 'Natuurkunde', short: 'NA', color: '#9b6bff' },
  { id: 'ak', name: 'Aardrijkskunde', short: 'AK', color: '#20c3c3' },
];
export const subjectById = (id: string) => SUBJECTS.find((s) => s.id === id) ?? { id, name: id, short: id.slice(0, 2).toUpperCase(), color: '#888' };

export interface PendingGrade { grade: Grade; arrivedAt: string }

export interface GameState {
  version: 1;
  club: { name: string; crest: CrestData };
  coins: number;
  xp: number;
  vouchers: number;
  packs: Record<string, number>;
  collection: string[];
  formationId: string;
  lineup: Record<string, string>;
  pity: PityState;
  grades: Grade[];
  pending: PendingGrade[];
  rewards: Record<string, RewardResult>;
  rewardLog: { key: string; date: string }[];
  settings: { sound: boolean; reducedMotion: boolean };
}

const STORAGE_KEY = 'rank11-proto-v1';
const today = () => new Date().toISOString().slice(0, 10);

function grade(id: string, subjectId: string, testName: string, value: number, weight: number, date: string): Grade {
  return { id, subjectId, testName, value, weight, date, status: 'registered', source: 'manual' };
}

function initialState(): GameState {
  const rng = createRng('rank11-demo-start');
  const pool = (filter: (p: Player) => boolean, n: number) => rng.shuffle(CATALOG.filter(filter)).slice(0, n).map((p) => p.id);
  const collection = [
    ...pool((p) => p.rarity === 'bronze', 6),
    ...pool((p) => p.rarity === 'silver', 10),
    ...pool((p) => p.rarity === 'gold' && p.rating < 80, 14),
    ...pool((p) => p.rarity === 'gold' && p.rating >= 80 && p.rating < 84, 3),
    ...pool((p) => p.position === 'GK' && (p.rarity === 'gold' || p.rarity === 'silver') && p.rating >= 70 && p.rating < 80, 2),
  ];
  if (!collection.some((id) => CARD_BY_ID.get(id)?.position === 'GK')) throw new Error('Demo-collectie zonder keeper');
  const owned = collection.map((id) => CARD_BY_ID.get(id)!).filter(Boolean);
  const formation = FORMATIONS['4-3-3']!;
  const best = autoBestLineup(formation, owned);
  const lineup: Record<string, string> = {};
  for (const [slot, p] of Object.entries(best)) if (p) lineup[slot] = p.id;
  // Reservebank: de 7 beste overige spelers (unieke spelers).
  const used = new Set(Object.values(best).map((p) => p?.baseId));
  owned
    .filter((p) => !used.has(p.baseId) && (used.add(p.baseId), true))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 7)
    .forEach((p, i) => { lineup[`bench${i}`] = p.id; });

  const grades: Grade[] = [
    grade('g1', 'wis', 'Toets H2 · Breuken', 6.8, 2, '2026-09-18'),
    grade('g2', 'wis', 'SO Kwadraten', 7.4, 1, '2026-10-02'),
    grade('g3', 'ne', 'Leesvaardigheid', 7.1, 2, '2026-09-24'),
    grade('g4', 'ne', 'Spelling SO', 6.2, 1, '2026-10-08'),
    grade('g5', 'en', 'Vocabulary U1', 8.0, 1, '2026-09-20'),
    grade('g6', 'en', 'Grammar test', 7.6, 2, '2026-10-06'),
    grade('g7', 'fa', 'Vocabulaire Ch.1', 5.9, 1, '2026-09-26'),
    grade('g8', 'fa', 'Grammaire', 6.3, 2, '2026-10-09'),
    grade('g9', 'bi', 'De cel', 7.8, 2, '2026-10-01'),
    grade('g10', 'gs', 'Romeinen', 6.9, 2, '2026-10-03'),
    grade('g11', 'nask', 'Krachten', 7.2, 2, '2026-10-07'),
    grade('g12', 'ak', 'Klimaatzones', 7.5, 1, '2026-10-10'),
  ];
  const pending: PendingGrade[] = [
    { grade: grade('n1', 'wis', 'Toets H4 · Lineaire verbanden', 8.4, 3, '2026-10-21'), arrivedAt: '2026-10-25T07:42:00Z' },
    { grade: grade('n2', 'en', 'Reading test Unit 3', 9.6, 1, '2026-10-22'), arrivedAt: '2026-10-25T07:43:00Z' },
    { grade: grade('n3', 'fa', 'Toets Chapitre 2', 4.8, 2, '2026-10-23'), arrivedAt: '2026-10-25T07:44:00Z' },
  ];

  return {
    version: 1,
    club: {
      name: 'FC Noorderlicht',
      crest: { shape: 'shield', symbol: 'star', pattern: 'sash', primary: '#0b1f4d', secondary: '#1f6bff', accent: '#f2cf73', short: 'FCN', stars: 1 },
    },
    coins: 12450,
    xp: 2340,
    vouchers: 2,
    packs: { gold: 1, exam: 1 },
    collection,
    formationId: '4-3-3',
    lineup,
    pity: { B: 1, A: 2 },
    grades,
    pending,
    rewards: {},
    rewardLog: [],
    settings: { sound: true, reducedMotion: false },
  };
}

function load(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as GameState;
      if (parsed.version === 1) return parsed;
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

export function levelFor(xp: number): { level: number; into: number; span: number } {
  let level = 1;
  let need = 250;
  let rest = xp;
  while (rest >= need) {
    rest -= need;
    level++;
    need = Math.round(need * 1.18);
  }
  return { level, into: rest, span: need };
}

export interface RevealOutcome {
  grade: Grade;
  subjectBefore: number | null;
  subjectAfter: number | null;
  overallBefore: number | null;
  overallAfter: number | null;
  reward: RewardResult;
  pickOptions?: Player[];
}

interface Store {
  state: GameState;
  owned: Player[];
  openPackFromInventory: (packId: string) => PackResult | null;
  buyPack: (packId: string) => boolean;
  startDraft: () => DraftSession | null;
  revealGrade: (gradeId: string) => RevealOutcome | null;
  claimPick: (cardId: string) => void;
  setLineup: (formationId: string, lineup: Record<string, string>) => void;
  quickSell: (cardIds: string[]) => number;
  setSetting: (key: keyof GameState['settings'], value: boolean) => void;
  reset: () => void;
}

const Ctx = createContext<Store | null>(null);

export function quickSellValue(p: Player): number {
  const base = p.rating >= 85 ? 2500 : p.rating >= 80 ? 900 : p.rating >= 75 ? 400 : p.rating >= 65 ? 150 : 60;
  return p.rarity === 'legend' ? base * 10 : ['special', 'exam', 'season'].includes(p.rarity) ? base * 3 : base;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(load);

  const update = useCallback((fn: (s: GameState) => GameState) => {
    setState((prev) => {
      const next = fn(prev);
      save(next);
      return next;
    });
  }, []);

  const owned = useMemo(() => state.collection.map((id) => CARD_BY_ID.get(id)).filter((p): p is Player => !!p), [state.collection]);

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

  const revealGrade = useCallback((gradeId: string): RevealOutcome | null => {
    const item = state.pending.find((p) => p.grade.id === gradeId);
    if (!item) return null;
    const g = item.grade;
    const subjectBefore = weightedAverage(state.grades.filter((x) => x.subjectId === g.subjectId));
    const subjectAfter = weightedAverage([...state.grades.filter((x) => x.subjectId === g.subjectId), g]);
    const avgs = (list: Grade[]) => {
      const m = subjectAverages(list);
      const vals = [...m.values()];
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };
    const day = today();
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
    const key = gradeKey(g);
    const reward = computeReward(DEFAULT_REWARD_CONFIG, {
      grade: g,
      subjectAvgBefore: subjectBefore,
      subjectAvgAfter: subjectAfter,
      rewardedToday: state.rewardLog.filter((r) => r.date === day).length,
      rewardedThisWeek: state.rewardLog.filter((r) => r.date >= weekAgo).length,
      previous: state.rewards[key],
    });
    let pickOptions: Player[] | undefined;
    if (reward.pick) {
      const rng = createRng(freshSeed());
      pickOptions = rng.shuffle(CATALOG.filter((p) => p.rating >= reward.pick!.minRating && !p.temporary)).slice(0, reward.pick.options);
    }
    const counts = reward.status === 'rewarded' || reward.status === 'correction';
    update((s) => ({
      ...s,
      grades: [...s.grades, g],
      pending: s.pending.filter((p) => p.grade.id !== gradeId),
      xp: s.xp + reward.xp,
      coins: s.coins + reward.coins,
      packs: reward.packId ? { ...s.packs, [reward.packId]: (s.packs[reward.packId] ?? 0) + 1 } : s.packs,
      vouchers: s.vouchers + reward.vouchers,
      rewards: reward.tier ? { ...s.rewards, [key]: reward } : s.rewards,
      rewardLog: counts ? [...s.rewardLog, { key, date: day }] : s.rewardLog,
    }));
    return {
      grade: g,
      subjectBefore,
      subjectAfter,
      overallBefore: avgs(state.grades),
      overallAfter: avgs([...state.grades, g]),
      reward,
      pickOptions,
    };
  }, [state, update]);

  const claimPick = useCallback((cardId: string) => {
    update((s) => ({ ...s, collection: [...s.collection, cardId] }));
  }, [update]);

  const setLineup = useCallback((formationId: string, lineup: Record<string, string>) => {
    update((s) => ({ ...s, formationId, lineup }));
  }, [update]);

  const quickSell = useCallback((cardIds: string[]) => {
    let total = 0;
    update((s) => {
      const collection = [...s.collection];
      const inLineup = new Set(Object.values(s.lineup));
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

  const setSetting = useCallback((key: keyof GameState['settings'], value: boolean) => {
    update((s) => ({ ...s, settings: { ...s.settings, [key]: value } }));
  }, [update]);

  const reset = useCallback(() => {
    const fresh = initialState();
    save(fresh);
    setState(fresh);
  }, []);

  const value = useMemo<Store>(
    () => ({ state, owned, openPackFromInventory, buyPack, startDraft, revealGrade, claimPick, setLineup, quickSell, setSetting, reset }),
    [state, owned, openPackFromInventory, buyPack, startDraft, revealGrade, claimPick, setLineup, quickSell, setSetting, reset],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore buiten StoreProvider');
  return s;
}

export { compareAverages };
