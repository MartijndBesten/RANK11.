/**
 * Achievements worden afgeleid uit de gegevens, nooit los opgeslagen (geen inconsistentie, geen migratie).
 * Bewust geen achievements voor dagelijks inloggen of reeksen dagen: alleen voor echte prestaties en vooruitgang.
 */
import { DUTCH_SCALE, subjectAverages, type Grade } from './grades.ts';
import { goalReachedBy, type Goal } from './goals.ts';
import { chronological } from './stats.ts';

export interface AchievementState {
  id: string;
  title: string;
  description: string;
  group: 'cijfers' | 'vooruitgang' | 'doelen' | 'academy';
  achieved: boolean;
  /** 0-1 */
  progress: number;
  achievedOn?: string;
}

export interface AchievementInput {
  grades: readonly Grade[];
  goals: readonly Goal[];
  academyCompleted?: number;
  academyMistakesFixed?: number;
}

const p = (value: number, target: number) => Math.max(0, Math.min(1, value / target));

export function achievements(input: AchievementInput): AchievementState[] {
  const grades = chronological(input.grades);
  const out: AchievementState[] = [];
  const add = (a: Omit<AchievementState, 'achieved'> & { achieved?: boolean }) => out.push({ achieved: a.progress >= 1, ...a });

  add({ id: 'eerste-cijfer', title: 'Aftrap', description: 'Voer je eerste cijfer in.', group: 'cijfers', progress: p(grades.length, 1), achievedOn: grades[0]?.date });
  add({ id: 'tien-cijfers', title: 'Basisspeler', description: 'Voer tien cijfers in.', group: 'cijfers', progress: p(grades.length, 10), achievedOn: grades[9]?.date });
  const nine = grades.find((g) => g.value >= 9);
  add({ id: 'negen', title: 'Wereldgoal', description: 'Haal een 9 of hoger.', group: 'cijfers', progress: nine ? 1 : 0, achievedOn: nine?.date });

  const avgs = [...subjectAverages(grades).values()];
  const allPass = avgs.length >= 3 && avgs.every((a) => a >= DUTCH_SCALE.pass);
  add({ id: 'alles-voldoende', title: 'Clean sheet', description: 'Sta voor minstens drie vakken voldoende, zonder onvoldoende vak.', group: 'cijfers', progress: allPass ? 1 : avgs.length ? p(avgs.filter((a) => a >= DUTCH_SCALE.pass).length, Math.max(3, avgs.length)) : 0 });

  // Herstel: binnen een vak een onvoldoende, later een cijfer ≥ 1,5 hoger en voldoende.
  let comeback: Grade | undefined;
  const bySubject = new Map<string, Grade[]>();
  for (const g of grades) bySubject.set(g.subjectId, [...(bySubject.get(g.subjectId) ?? []), g]);
  for (const list of bySubject.values()) {
    for (let i = 1; i < list.length && !comeback; i++) {
      const prevFail = list.slice(0, i).reverse().find((g) => g.value < DUTCH_SCALE.pass);
      const cur = list[i] as Grade;
      if (prevFail && cur.value >= DUTCH_SCALE.pass && cur.value - prevFail.value >= 1.5) comeback = cur;
    }
  }
  add({ id: 'comeback', title: 'Comeback', description: 'Haal na een onvoldoende een voldoende die minstens 1,5 hoger is.', group: 'vooruitgang', progress: comeback ? 1 : 0, achievedOn: comeback?.date });

  // Drie keer op rij een hoger cijfer binnen een vak.
  let climber: Grade | undefined;
  let best = 0;
  for (const list of bySubject.values()) {
    let run = 0;
    for (let i = 1; i < list.length; i++) {
      run = (list[i] as Grade).value > (list[i - 1] as Grade).value ? run + 1 : 0;
      best = Math.max(best, run);
      if (run >= 3 && !climber) climber = list[i];
    }
  }
  add({ id: 'klimmer', title: 'Klimmer', description: 'Haal binnen een vak drie keer op rij een hoger cijfer.', group: 'vooruitgang', progress: p(best, 3), achievedOn: climber?.date });

  const reached = input.goals.map((goal) => goalReachedBy(grades, goal)).filter((g): g is Grade => !!g).sort((a, b) => a.date.localeCompare(b.date));
  add({ id: 'eerste-doel', title: 'Doelpunt', description: 'Bereik een persoonlijk doel.', group: 'doelen', progress: p(reached.length, 1), achievedOn: reached[0]?.date });
  add({ id: 'hattrick', title: 'Hattrick', description: 'Bereik drie persoonlijke doelen.', group: 'doelen', progress: p(reached.length, 3), achievedOn: reached[2]?.date });

  add({ id: 'academy-eerste', title: 'Trainingskamp', description: 'Rond een oefentoets af.', group: 'academy', progress: p(input.academyCompleted ?? 0, 1) });
  add({ id: 'academy-fouten', title: 'Analist', description: 'Verbeter tien eerder foute antwoorden.', group: 'academy', progress: p(input.academyMistakesFixed ?? 0, 10) });
  return out;
}
