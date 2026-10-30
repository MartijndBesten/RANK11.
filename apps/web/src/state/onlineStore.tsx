/**
 * Online-store: dezelfde Store-interface als de lokale demo, maar met de server (apps/api) als bron.
 * Account, club, cijfers (met geschiedenis), XP, beloningen (kluis), collectie, elftal, packs, draft,
 * doelen en geplande toetsen staan op de server. Alleen voorkeuren (geluid, meldingen) en wat-als-scenario's
 * blijven op dit toestel. Na iedere actie wordt de serverstand opnieuw geladen: de server is leidend.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  checkNewGrade, compareCardValue, FORMATIONS, PACKS, subjectAverages, weightedAverage,
  type DraftSession, type Grade, type PackResult, type ProgressGrant, type PublicPracticeSession, type Player, type RewardResult, type XpEntry,
} from '@rank11/engine';
import { api, ApiError, type ApiCard, type ApiGrade, type ApiHistory, type ApiVaultItem, type ApiXpEntry } from '../api/client';
import { PORTRAITS } from '../portraits/registry';
import type { CrestData } from '../components/Crest';
import { CARD_BY_ID, StoreCtx, type ActionResult, type GameState, type GradeInput, type ImportOutcome, type IntegrationProvider, type NotifySettings, type RevealOutcome, type Store } from './store';
import { todayIso } from './school';
import type { AcademyOverview, PracticeResult } from '../academy/types';

interface Loaded {
  user: { id: string; username: string; role?: string };
  club: { name: string; short: string; crest: Omit<CrestData, 'short' | 'stars'> };
  balances: { coins: number; vouchers: number };
  cards: ApiCard[];
  lineup: { cardIds: string[]; formationId: string; bench: string[] } | null;
  unopened: { grantId: string; packId: string }[];
  grades: ApiGrade[];
  history: ApiHistory[];
  xp: { summary: Store['xp'] & { configVersion: string }; ledger: ApiXpEntry[] };
  vault: ApiVaultItem[];
  planning: { goals: GameState['goals']; upcoming: GameState['upcoming'] };
  draft: { pity: Record<string, number>; active: { id: string; session: DraftSession } | null };
  settings: { tips: boolean; tipsSeen: string[] };
}

interface Prefs { settings: GameState['settings']; notified: string[]; scenarios: GameState['scenarios'] }
const PREFS_KEY = 'rank11-online-prefs';
const defaultPrefs = (): Prefs => ({
  settings: { sound: true, reducedMotion: false, academy: true, notify: { rewards: true, goals: true, competition: true, quietFrom: '21:30', quietTo: '07:30' } },
  notified: [], scenarios: [],
});
function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return { ...defaultPrefs(), ...(JSON.parse(raw) as Partial<Prefs>) };
  } catch { /* geen opslag beschikbaar */ }
  return defaultPrefs();
}
const savePrefs = (p: Prefs) => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* niet fataal */ } };

const toGrade = (g: ApiGrade): Grade => ({ id: g.id, subjectId: g.subjectId, testName: g.testName, value: g.value, weight: g.weight, date: g.date, status: g.status === 'confirmed' ? 'verified' : 'registered', source: (g.source as Grade['source']) ?? 'manual' });
const toXp = (e: ApiXpEntry): XpEntry => ({ ...e, source: { kind: e.source.kind as XpEntry['source']['kind'], id: e.source.id } });

/** Fotoportret toevoegen aan een kaart van de server (de server kent alleen kaartdefinities). */
function withPhoto<T extends Player>(p: T): T {
  const photo = PORTRAITS[p.baseId];
  return photo && !p.photo ? { ...p, photo } : p;
}

async function loadAll(): Promise<Loaded> {
  const [me, club, wallet, collection, lineup, packs, grades, xp, vault, planning, draft, settings] = await Promise.all([
    api<{ user: Loaded['user'] }>('GET', '/me'),
    api<{ club: Loaded['club'] }>('GET', '/club'),
    api<{ balances: Loaded['balances'] }>('GET', '/wallet'),
    api<{ cards: ApiCard[] }>('GET', '/collection'),
    api<Loaded['lineup']>('GET', '/lineup').catch((e) => { if (e instanceof ApiError && e.status === 404) return null; throw e; }),
    api<{ unopened: Loaded['unopened'] }>('GET', '/packs'),
    api<{ grades: ApiGrade[]; history: ApiHistory[] }>('GET', '/grades?history=1'),
    api<Loaded['xp']>('GET', '/xp'),
    api<{ items: ApiVaultItem[] }>('GET', '/vault'),
    api<Loaded['planning']>('GET', '/planning'),
    api<Loaded['draft']>('GET', '/draft'),
    api<{ settings: Loaded['settings'] }>('GET', '/settings'),
  ]);
  return {
    user: me.user, club: club.club, balances: wallet.balances, cards: collection.cards, lineup, unopened: packs.unopened,
    grades: grades.grades, history: grades.history ?? [], xp, vault: vault.items, planning, draft, settings: settings.settings,
  };
}

const fail = (e: unknown): ActionResult => ({ ok: false, error: e instanceof ApiError ? e.message : 'Er ging iets mis.' });

export function OnlineStoreProvider({ children, onLoggedOut }: { children: ReactNode; onLoggedOut: () => void }) {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  // Speluitleg staat per gebruiker op de server; lokaal direct bijwerken, op de achtergrond opslaan.
  const [tips, setTips] = useState<GameState['tips'] | null>(null);
  useEffect(() => { if (data) setTips({ on: data.settings.tips, seen: data.settings.tipsSeen }); }, [data]);
  const updateTips = useCallback((fn: (t: GameState['tips']) => GameState['tips']) => {
    setTips((prev) => {
      const base = prev ?? { on: true, seen: [] };
      const next = fn(base);
      if (next !== base) void api('PUT', '/settings', { tips: next.on, tipsSeen: next.seen }).catch(() => undefined);
      return next;
    });
  }, []);
  const refreshing = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    const run = loadAll().then((d) => { setData(d); setError(null); }, (e) => {
      if (e instanceof ApiError && e.status === 401) onLoggedOut();
      else setError(e instanceof ApiError ? e.message : 'Kan de server niet bereiken.');
    });
    refreshing.current = run;
    await run;
  }, [onLoggedOut]);

  useEffect(() => { void refresh(); }, [refresh]);

  const updatePrefs = useCallback((fn: (p: Prefs) => Prefs) => setPrefs((p) => { const n = fn(p); savePrefs(n); return n; }), []);

  const derived = useMemo(() => {
    if (!data) return null;
    const instancesByDef = new Map<string, string[]>();
    for (const c of data.cards) instancesByDef.set(c.cardDefId, [...(instancesByDef.get(c.cardDefId) ?? []), c.id]);
    const defByInstance = new Map(data.cards.map((c) => [c.id, c.cardDefId]));
    const grades = data.grades.map(toGrade);
    const history = new Map<string, { at: string; type: 'add' | 'correct' | 'delete'; before?: Grade; after?: Grade }[]>();
    for (const h of data.history) {
      const type = h.action === 'create' ? 'add' : h.action;
      history.set(h.gradeId, [...(history.get(h.gradeId) ?? []), {
        at: new Date(h.at).toISOString(), type, ...(h.before ? { before: toGrade(h.before) } : {}), ...(h.after ? { after: toGrade(h.after) } : {}),
      }]);
    }
    const active = new Set(grades.map((g) => g.id));
    const vault = data.vault.filter((v) => v.grade && active.has(v.grade.id));
    const pending = vault.map((v) => ({ grade: grades.find((g) => g.id === v.grade!.id)!, arrivedAt: new Date(v.createdAt).toISOString() }));
    const formation = FORMATIONS[data.lineup?.formationId ?? '4-3-3'] ?? FORMATIONS['4-3-3']!;
    const lineup: Record<string, string> = {};
    formation.slots.forEach((slot, i) => { const def = defByInstance.get(data.lineup?.cardIds[i] ?? ''); if (def) lineup[slot.id] = def; });
    (data.lineup?.bench ?? []).forEach((id, i) => { const def = defByInstance.get(id); if (def) lineup[`bench${i}`] = def; });
    const packs: Record<string, number> = {};
    for (const p of data.unopened) packs[p.packId] = (packs[p.packId] ?? 0) + 1;
    const state: GameState = {
      version: 3,
      club: { name: data.club.name, crest: { ...data.club.crest, short: data.club.short, stars: 0 } as CrestData },
      coins: data.balances.coins, vouchers: data.balances.vouchers, packs,
      collection: data.cards.map((c) => c.cardDefId).filter((id) => CARD_BY_ID.has(id)),
      formationId: formation.id, lineup, pity: data.draft.pity,
      gradeEvents: [], pendingIds: pending.map((p) => p.grade.id), xpLedger: [...data.xp.ledger].reverse().map(toXp),
      rewards: {}, rewardLog: [], goals: data.planning.goals, upcoming: data.planning.upcoming, scenarios: prefs.scenarios,
      academy: { links: [], events: [], decisions: [], wrong: [], items: [] },
      progressGrants: [],
      competition: { results: [], battles: {} },
      notified: prefs.notified, settings: prefs.settings,
      tips: tips ?? { on: data.settings.tips, seen: data.settings.tipsSeen },
    };
    const owned = state.collection.map((id) => CARD_BY_ID.get(id)).filter((p): p is Player => !!p);
    return { state, owned, grades, history, pending, vault, instancesByDef, formation };
  }, [data, prefs, tips]);

  const value = useMemo<Store | null>(() => {
    if (!data || !derived) return null;
    const { state, owned, grades, history, pending, vault, instancesByDef } = derived;
    const act = async <T,>(fn: () => Promise<T>): Promise<T> => { try { return await fn(); } finally { await refresh(); } };

    const instanceFor = (defId: string, used: Set<string>) => (instancesByDef.get(defId) ?? []).find((i) => !used.has(i));

    const store: Store = {
      mode: 'online',
      user: data.user,
      state, owned, grades, pending,
      history: history as Store['history'],
      xp: { total: data.xp.summary.total, byCategory: data.xp.summary.byCategory, level: data.xp.summary.level },
      can: { quickSell: true, demoCompetition: false, academy: true, exit: true },

      openPackFromInventory: (packId) => act(async () => {
        const grant = data.unopened.find((g) => g.packId === packId);
        if (!grant || !PACKS[packId]) return null;
        const res = await api<{ open: { cards: (ApiCard & { slot: number; bucketId: string })[]; revealOrder: string[] } }>('POST', `/packs/${grant.grantId}/open`);
        const pulls = res.open.cards.map((c) => ({ card: CARD_BY_ID.get(c.cardDefId), slot: c.slot, bucketId: c.bucketId })).filter((p): p is { card: Player; slot: number; bucketId: string } => !!p.card);
        if (!pulls.length) return null;
        const revealOrder = pulls.map((p) => p.card).sort((a, b) => -compareCardValue(a, b));
        return { packId, pulls, revealOrder, best: revealOrder[revealOrder.length - 1]! } satisfies PackResult;
      }),
      buyPack: (packId) => act(async () => { try { await api('POST', '/packs/buy', { packId }); return true; } catch { return false; } }),
      startDraft: () => act(async () => {
        try {
          const res = await api<{ draft: { id: string; session: DraftSession } }>('POST', '/draft');
          draftIdRef.current = res.draft.id;
          return { ...res.draft.session, slots: res.draft.session.slots.map((s) => ({ ...s, offers: s.offers.map(withPhoto) })) };
        } catch { return null; }
      }),
      draftPick: async (slotId, playerId) => {
        const id = draftIdRef.current ?? data.draft.active?.id;
        if (!id) return;
        await api('POST', `/draft/${id}/pick`, { slotId, playerId }).catch(() => undefined);
      },

      addGrade: (input: GradeInput) => act(async () => {
        const g: Grade = { id: 'nieuw', subjectId: input.subjectId, testName: input.testName.trim(), value: Math.round(input.value * 100) / 100, weight: input.weight, date: input.date, status: 'registered', source: 'manual' };
        const check = checkNewGrade({ grades, history: new Map() }, g, undefined, todayIso());
        if (!check.ok) return { ok: false, error: check.error ?? 'Ongeldig cijfer.' } as ActionResult;
        try {
          const res = await api<{ grade: ApiGrade }>('POST', '/grades', { subjectId: g.subjectId, testName: g.testName, value: g.value, weight: g.weight, date: g.date });
          return { ok: true, id: res.grade.id } as ActionResult;
        } catch (e) { return fail(e); }
      }),
      integrations: {
        list: () => api<{ providers: IntegrationProvider[] }>('GET', '/integrations').then((r) => r.providers).catch(() => []),
        connect: (id: string) => act(async () => { await api('POST', `/integrations/${id}/connect`, {}); }),
        sync: (id: string) => act(async () => {
          try { return (await api<{ result: ImportOutcome }>('POST', `/integrations/${id}/sync`, {})).result; }
          catch { return { created: 0, duplicate: 0, invalid: 0 }; }
        }),
        disconnect: (id: string) => act(async () => { await api('DELETE', `/integrations/${id}`); }),
      },
      importGrades: (rows: GradeInput[]) => act(async () => {
        try {
          const res = await api<{ created: number; duplicate: number; invalid: number }>('POST', '/grades/import', {
            rows: rows.map((r) => ({ subjectId: r.subjectId, testName: r.testName.trim(), value: Math.round(r.value * 100) / 100, weight: r.weight, date: r.date })),
          });
          return { created: res.created, duplicate: res.duplicate, invalid: res.invalid };
        } catch { return { created: 0, duplicate: 0, invalid: rows.length }; }
      }),
      correctGrade: (gradeId, changes) => act(async () => {
        try { await api('PUT', `/grades/${gradeId}`, changes); return { ok: true } as ActionResult; } catch (e) { return fail(e); }
      }),
      deleteGrade: (gradeId) => act(async () => {
        try { await api('DELETE', `/grades/${gradeId}`); return { ok: true } as ActionResult; } catch (e) { return fail(e); }
      }),
      revealGrade: (gradeId) => {
        const item = vault.find((v) => v.grade?.id === gradeId);
        const g = grades.find((x) => x.id === gradeId);
        if (!item || !g) return null;
        const others = grades.filter((x) => x.id !== gradeId);
        const subj = others.filter((x) => x.subjectId === g.subjectId);
        const overall = (list: Grade[]) => { const v = [...subjectAverages(list).values()]; return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
        const xpEntries: XpEntry[] = item.xp.map((e) => ({ key: e.key, category: e.category, xp: e.xp, label: e.label, date: todayIso(), source: { kind: 'grade', id: gradeId }, configVersion: '', ...(e.cappedBy ? { cappedBy: e.cappedBy } : {}), ...(e.packId ? { packId: e.packId } : {}) }));
        const reward: RewardResult = {
          status: item.status as RewardResult['status'], key: item.grantId, configVersion: '', tier: item.tier as RewardResult['tier'],
          xp: xpEntries.reduce((s, e) => s + e.xp, 0), coins: item.coins, vouchers: item.vouchers, bonuses: item.bonuses ?? [],
          ...(item.packId ? { packId: item.packId } : {}), ...(item.tier?.pick && item.pick ? { pick: item.tier.pick } : {}),
        };
        const outcome: RevealOutcome = {
          grade: g, subjectBefore: weightedAverage(subj), subjectAfter: weightedAverage([...subj, g]),
          overallBefore: overall(others), overallAfter: overall([...others, g]), reward, xpEntries, grantId: item.grantId,
          progress: (item.progress ?? []).map((p) => ({ key: p.key, kind: p.kind as ProgressGrant['kind'], label: p.label, vouchers: p.vouchers, coins: p.coins, date: todayIso(), configVersion: '', ...(p.packId ? { packId: p.packId } : {}) })),
          ...(item.pick && !item.pick.claimedCardDefId ? { pickOptions: item.pick.options.map((o) => CARD_BY_ID.get(o.cardDefId)).filter((p): p is Player => !!p) } : {}),
        };
        // De beloning staat al op de server; hier alleen markeren als geopend.
        void api('POST', `/vault/${item.grantId}/seen`).then(() => refresh(), () => undefined);
        return outcome;
      },
      claimPick: (cardId, grantId) => act(async () => {
        if (!grantId) return;
        await api('POST', `/vault/${grantId}/pick`, { cardDefId: cardId }).catch(() => undefined);
      }),
      addGoal: (goal) => act(async () => { await api('POST', '/goals', goal); }),
      removeGoal: (goalId) => act(async () => { await api('DELETE', `/goals/${goalId}`); }),
      addUpcoming: (test) => act(async () => {
        try { await api('POST', '/upcoming', test); return { ok: true } as ActionResult; } catch (e) { return fail(e); }
      }),
      removeUpcoming: (testId) => act(async () => { await api('DELETE', `/upcoming/${testId}`); }),
      saveScenario: (scenario) => updatePrefs((p) => ({ ...p, scenarios: [...p.scenarios, { ...scenario, id: `sc-${Date.now().toString(36)}` }].slice(-6) })),
      removeScenario: (id) => updatePrefs((p) => ({ ...p, scenarios: p.scenarios.filter((s) => s.id !== id) })),
      submitLearningEvent: () => ({ status: 'disabled', entries: [], reason: 'Online loopt de Academy via de server (practice).', score: 0 }),
      // Oefenmodule op de server: de server maakt de vragenset, bewaart de antwoorden en kijkt na.
      practice: {
        kind: 'server',
        overview: () => api<AcademyOverview>('GET', '/academy'),
        start: async (subjectId, topic) => (await api<{ session: PublicPracticeSession }>('POST', '/academy/sessions', { subjectId, topic })).session,
        submit: async (sessionId, answers, abandoned = false) => {
          const res = await api<PracticeResult>('POST', `/academy/sessions/${sessionId}/submit`, { answers, abandoned });
          void refresh(); // XP, coins en packs in de topbalk bijwerken
          return res;
        },
      },
      recordWrongAnswers: () => undefined,
      saveBattle: () => undefined,
      setLineup: (formationId, lineup) => act(async () => {
        const formation = FORMATIONS[formationId] ?? FORMATIONS['4-3-3']!;
        const used = new Set<string>();
        const take = (defId: string | undefined) => { if (!defId) return undefined; const i = instanceFor(defId, used); if (i) used.add(i); return i; };
        const cardIds = formation.slots.map((s) => take(lineup[s.id]));
        if (cardIds.some((x) => !x)) return; // onvolledig elftal wordt niet opgeslagen
        const bench = Object.keys(lineup).filter((k) => k.startsWith('bench')).sort().map((k) => take(lineup[k])).filter((x): x is string => !!x);
        await api('PUT', '/lineup', { cardIds, formationId, bench }).catch(() => undefined);
      }),
      quickSell: (cardIds) => act(async () => {
        // De app werkt met kaartdefinities; de server met instanties: kies vrije instanties (niet in elftal of op de bank).
        const locked = new Set([...(data.lineup?.cardIds ?? []), ...(data.lineup?.bench ?? [])]);
        const used = new Set<string>();
        const ids = cardIds.map((def) => (instancesByDef.get(def) ?? []).find((i) => !locked.has(i) && !used.has(i) && (used.add(i), true))).filter((x): x is string => !!x);
        if (!ids.length) return 0;
        try { return (await api<{ coins: number }>('POST', '/collection/sell', { cardIds: ids })).coins; } catch { return 0; }
      }),
      setSetting: (key, v) => updatePrefs((p) => ({ ...p, settings: { ...p.settings, [key]: v } })),
      setNotify: (changes: Partial<NotifySettings>) => updatePrefs((p) => ({ ...p, settings: { ...p.settings, notify: { ...p.settings.notify, ...changes } } })),
      setTipsOn: (on) => updateTips((t) => (t.on === on ? t : { ...t, on })),
      markTipSeen: (id) => updateTips((t) => (t.seen.includes(id) ? t : { ...t, seen: [...t.seen, id] })),
      markNotified: (ids) => updatePrefs((p) => ({ ...p, notified: [...new Set([...p.notified, ...ids])] })),
      reset: () => undefined,
      logout: async () => { await api('POST', '/auth/logout').catch(() => undefined); onLoggedOut(); },
    };
    return store;
  }, [data, derived, refresh, updatePrefs, onLoggedOut, updateTips]);

  const draftIdRef = useRef<string | null>(null);

  if (!value) {
    return (
      <div className="boot">
        <div className="stadium" />
        <div className="boot-card">{error ? <><b>Kan de server niet bereiken</b><span>{error}</span><button className="btn small" onClick={() => void refresh()}>Opnieuw</button></> : <span>Je club wordt geladen…</span>}</div>
      </div>
    );
  }
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}
