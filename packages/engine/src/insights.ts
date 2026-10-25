/**
 * Regelgebaseerde inzichten ("RANK Coach"). Iedere regel controleert eerst of de gegevens
 * de uitspraak dragen; anders levert hij niets op. Teksten zijn eenvoudig Nederlands voor
 * ongeveer twaalfjarigen, zonder statistiekjargon. Geen vergelijking met anderen.
 */
import { DUTCH_SCALE, formatGrade, subjectAverages, weightedAverage, type Grade } from './grades.ts';
import { goalProgress, upcomingFor, type Goal, type UpcomingTest } from './goals.ts';
import { chronological, inPeriod, trend, whatIfMany, type Period } from './stats.ts';

export type InsightTone = 'positive' | 'info' | 'attention';

export interface Insight {
  id: string;
  rule: string;
  tone: InsightTone;
  subjectId?: string;
  text: string;
  /** Hoe belangrijk (hoger = eerder tonen). */
  priority: number;
}

export interface InsightInput {
  grades: readonly Grade[];
  goals: readonly Goal[];
  upcoming: readonly UpcomingTest[];
  periods: readonly Period[];
  subjectName: (id: string) => string;
  today: string;
}

const g1 = (v: number) => formatGrade(v, 1);
const timesWord = (w: number) => (w === 1 ? 'één keer' : w === 2 ? 'twee keer' : w === 3 ? 'drie keer' : w === 4 ? 'vier keer' : `${String(w).replace('.', ',')} keer`);
const LANGUAGES = ['Engels', 'Nederlands', 'Frans', 'Duits', 'Spaans', 'Latijn', 'Grieks', 'Arabisch', 'Turks', 'Chinees'];
/** Vaknaam midden in een zin: talen houden een hoofdletter, andere vakken niet. */
export const inSentence = (s: string) => (LANGUAGES.includes(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));
const lower = inSentence;

export function generateInsights(input: InsightInput): Insight[] {
  const { grades, goals, upcoming, periods, subjectName, today } = input;
  const out: Insight[] = [];
  const subjects = [...new Set(grades.map((g) => g.subjectId))];
  const avg = subjectAverages(grades);

  // 1. Verandering t.o.v. vorige periode (beide perioden minstens 2 cijfers).
  const sortedPeriods = [...periods].sort((a, b) => a.start.localeCompare(b.start));
  const currentIdx = sortedPeriods.findIndex((p) => today >= p.start && today <= p.end);
  if (currentIdx > 0) {
    const cur = sortedPeriods[currentIdx] as Period;
    const prev = sortedPeriods[currentIdx - 1] as Period;
    for (const s of subjects) {
      const a = grades.filter((g) => g.subjectId === s && inPeriod(g, cur));
      const b = grades.filter((g) => g.subjectId === s && inPeriod(g, prev));
      if (a.length < 2 || b.length < 2) continue;
      const ca = weightedAverage(a) as number;
      const cb = weightedAverage(b) as number;
      const d = ca - cb;
      if (Math.abs(d) >= 0.3) {
        out.push({
          id: `period:${s}`, rule: 'period-change', tone: d > 0 ? 'positive' : 'attention', subjectId: s, priority: d > 0 ? 60 : 70,
          text: `Je staat deze periode voor ${lower(subjectName(s))} gemiddeld ${g1(ca)}. Dat is ${g1(Math.abs(d))} ${d > 0 ? 'hoger' : 'lager'} dan vorige periode.`,
        });
      }
    }
  }

  // 2. Zware aankomende toets: weging ≥ 3 of ≥ 30% van de totale vakweging.
  for (const t of upcoming.filter((x) => x.date >= today)) {
    const list = grades.filter((g) => g.subjectId === t.subjectId);
    const total = list.reduce((s, g) => s + g.weight, 0);
    if (!list.length || (t.weight < 3 && t.weight / (total + t.weight) < 0.3)) continue;
    const high = whatIfMany(grades, [{ subjectId: t.subjectId, value: 8, weight: t.weight }]).subjects[0]?.after as number;
    const low = whatIfMany(grades, [{ subjectId: t.subjectId, value: 5, weight: t.weight }]).subjects[0]?.after as number;
    out.push({
      id: `heavy:${t.id}`, rule: 'heavy-test', tone: 'info', subjectId: t.subjectId, priority: 80,
      text: `Je volgende toets ${lower(subjectName(t.subjectId))} (${t.name}) telt ${timesWord(t.weight)} mee en heeft daarom veel invloed: met een 8 kom je op ${g1(high)}, met een 5 op ${g1(low)}.`,
    });
  }

  // 3/5. Doelen: bijna bereikt, benodigd cijfer, bereikt.
  for (const goal of goals) {
    const p = goalProgress(grades, goal, upcoming, today);
    if (p.current === null) continue;
    const name = goal.scope === 'subject' && goal.subjectId ? lower(subjectName(goal.subjectId)) : 'je algemene gemiddelde';
    if (p.achieved) {
      out.push({ id: `goal-done:${goal.id}`, rule: 'goal-achieved', tone: 'positive', subjectId: goal.subjectId, priority: 50,
        text: `Doel gehaald: ${name} staat op ${g1(p.current)} (doel ${g1(goal.target)}).` });
      continue;
    }
    if (p.gap !== null && p.gap <= 0.2) {
      out.push({ id: `goal-near:${goal.id}`, rule: 'goal-near', tone: 'positive', subjectId: goal.subjectId, priority: 75,
        text: `Je hebt voor ${name} je persoonlijke doel bijna bereikt: nog ${g1(p.gap)} te gaan.` });
    }
    if (p.nextTest) {
      const { result, test } = p.nextTest;
      const text = result.status === 'unreachable'
        ? `Je doel van ${g1(goal.target)} voor ${name} is met alleen de volgende toets (weging ${test.weight}) niet haalbaar. Na nog een paar goede toetsen wel.`
        : result.status === 'secured'
          ? `Je doel van ${g1(goal.target)} voor ${name} blijft staan, wat je ook haalt voor de volgende toets.`
          : `Voor je doel van ${g1(goal.target)} heb je bij de volgende toets ${lower(subjectName(test.subjectId))} met weging ${test.weight} minimaal een ${g1(result.required)} nodig.`;
      out.push({ id: `goal-need:${goal.id}`, rule: 'goal-required', tone: result.status === 'unreachable' ? 'attention' : 'info', subjectId: goal.subjectId, priority: 85, text });
    }
  }

  // 4. Trend na de laatste twee toetsen (minstens 3 cijfers).
  for (const s of subjects) {
    const t = trend(grades.filter((g) => g.subjectId === s));
    if (t.direction === 'up' && t.delta >= 0.15) {
      out.push({ id: `trend:${s}`, rule: 'trend-up', tone: 'positive', subjectId: s, priority: 55,
        text: `Je gemiddelde voor ${lower(subjectName(s))} is gestegen na je laatste ${t.recentCount === 1 ? 'toets' : `${t.recentCount} toetsen`} (+${g1(t.delta)}).` });
    }
  }

  // 6. Onder de voldoendegrens, met een concreet herstelpad als er een toets gepland is.
  for (const s of subjects) {
    const a = avg.get(s);
    if (a === undefined || a >= DUTCH_SCALE.pass) continue;
    const next = upcomingFor(upcoming, s, today)[0];
    let text = `${subjectName(s)} staat op ${g1(a)}. Dat kun je nog ophalen.`;
    if (next) {
      const sum = grades.filter((g) => g.subjectId === s).reduce((x, g) => x + g.value * g.weight, 0);
      const w = grades.filter((g) => g.subjectId === s).reduce((x, g) => x + g.weight, 0);
      const need = Math.ceil(((DUTCH_SCALE.pass * (w + next.weight) - sum) / next.weight) * 10 - 1e-9) / 10;
      if (need <= DUTCH_SCALE.max) text = `${subjectName(s)} staat op ${g1(a)}. Met een ${g1(Math.max(1, need))} voor ${next.name} (weging ${next.weight}) kom je weer op een voldoende.`;
    }
    out.push({ id: `below:${s}`, rule: 'below-pass', tone: 'attention', subjectId: s, priority: 90, text });
  }

  // 7. Herstel: laatste cijfer van een vak ≥ 1,5 hoger dan een eerdere onvoldoende.
  for (const s of subjects) {
    const list = chronological(grades.filter((g) => g.subjectId === s));
    const last = list[list.length - 1];
    const prevFail = list.slice(0, -1).reverse().find((g) => g.value < DUTCH_SCALE.pass);
    if (last && prevFail && last.value >= DUTCH_SCALE.pass && last.value - prevFail.value >= 1.5) {
      out.push({ id: `comeback:${s}`, rule: 'comeback', tone: 'positive', subjectId: s, priority: 65,
        text: `Sterk herstel bij ${lower(subjectName(s))}: van een ${g1(prevFail.value)} naar een ${g1(last.value)}.` });
    }
  }

  // 8. Beste vak (minstens 2 vakken met ≥ 2 cijfers).
  const eligible = [...avg.entries()].filter(([s]) => grades.filter((g) => g.subjectId === s).length >= 2);
  if (eligible.length >= 2) {
    const [best, value] = eligible.reduce((a, b) => (b[1] > a[1] ? b : a));
    out.push({ id: `best:${best}`, rule: 'best-subject', tone: 'positive', subjectId: best, priority: 30, text: `Je sterkste vak is nu ${lower(subjectName(best))} met een ${g1(value)}.` });
  }

  return out.sort((a, b) => b.priority - a.priority);
}
