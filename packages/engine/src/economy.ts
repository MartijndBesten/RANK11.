/**
 * Eerlijke economie (V-011): goede cijfers blijven voordeel geven, maar vooruitgang, doelen en oefenen
 * vormen een serieuze tweede route naar packs en draft-vouchers.
 *
 * Twee lagen:
 *  1. Cijferbeloning per toets (`FAIR_REWARD_CONFIG`, zelfde vorm als `RewardConfig`): de voucher zit niet
 *     meer bij een 7,5 maar pas bij 8,5+, zodat hoge cijfers minder extreem stapelen.
 *  2. Voortgangsbeloningen (`progressRewards`): doel bereikt, vakgemiddelde verbeterd t.o.v. je eigen basis,
 *     persoonlijk topcijfer (ver boven je eigen niveau), herstel na een onvoldoende en Academy-mijlpalen. Idempotent (vaste sleutels), begrensd per week en
 *     altijd met configuratieversie. De server roept `progressRewards` aan na ieder cijfer of leerevent en
 *     slaat alleen nieuwe sleutels op.
 *
 * Onderbouwing en simulatie over een volledig schooljaar: docs/REWARD-ECONOMY.md en docs/SIMULATIES.md.
 */
import { DUTCH_SCALE, weightedAverage, type Grade } from './grades.ts';
import { goalReachedBy, type Goal } from './goals.ts';
import { clubLevel, weekStart, type XpEntry } from './motivation.ts';
import { DEFAULT_REWARD_CONFIG, type RewardConfig } from './rewards.ts';
import { chronological, type Period } from './stats.ts';

/** Cijferbeloningen economie v2: zelfde drempels, voucher pas vanaf 8,5, kleine troostbeloning bij een onvoldoende. */
export const FAIR_REWARD_CONFIG: RewardConfig = {
  ...DEFAULT_REWARD_CONFIG,
  version: '2026.10-eerlijk.1',
  tiers: [
    { id: 'support', label: 'Herstelkans', minGrade: 1, tone: 'support', xp: 15, coins: 100 },
    { id: 'pass', label: 'Voldoende', minGrade: 5.5, tone: 'pass', xp: 50, coins: 200, packId: 'starter' },
    { id: 'good', label: 'Goed', minGrade: 6.5, tone: 'good', xp: 90, coins: 250, packId: 'gold' },
    { id: 'great', label: 'Sterk', minGrade: 7.5, tone: 'great', xp: 140, coins: 300, packId: 'gold' },
    { id: 'elite', label: 'Uitstekend', minGrade: 8.5, tone: 'elite', xp: 200, coins: 400, packId: 'exam', vouchers: 1 },
    { id: 'legendary', label: 'Legendarisch', minGrade: 9.5, tone: 'legendary', xp: 300, coins: 600, packId: 'elite', vouchers: 1 },
  ],
};

export interface ProgressRewardConfig {
  version: string;
  /** Doel bereikt. Het doelpack zelf komt uit de motivatie-engine (`progress.goalPackId`); hier de voucher. */
  goal: { vouchers: number; coins: number };
  /** Periodegemiddelde van een vak minstens `minDelta` boven je eigen gemiddelde van daarvoor (één keer per vak per periode). */
  improvement: { minDelta: number; minGradesInPeriod: number; packId: string; vouchers: number; coins: number };
  /** Voldoende na een onvoldoende, minstens `minJump` hoger (één keer per vak per periode). */
  recovery: { minJump: number; packId: string; vouchers: number; coins: number };
  /** Persoonlijk topcijfer: minstens `minAboveAverage` boven je eigen vakgemiddelde van daarvoor (één keer per vak per periode). */
  personalBest: { minAboveAverage: number; minPriorGrades: number; vouchers: number; coins: number };
  /** Academy-mijlpalen op basis van totale Academy-XP. */
  academy: { packEveryXp: number; packId: string; voucherEveryXp: number; maxPacksPerWeek: number };
  /** Bovengrens voor vouchers uit voortgang per week (alle soorten samen). */
  maxVouchersPerWeek: number;
  /**
   * Clubniveau omhoog (alle XP samen: inzet, vooruitgang en oefenen). Optioneel; sinds `voortgang.2`.
   * Niveaus worden steeds duurder, dus verschillen tussen leerlingen worden hier vanzelf kleiner.
   */
  level?: { packId: string; coins: number };
}

export const DEFAULT_PROGRESS_CONFIG: ProgressRewardConfig = {
  version: '2026.10-voortgang.1',
  goal: { vouchers: 1, coins: 300 },
  improvement: { minDelta: 0.6, minGradesInPeriod: 3, packId: 'gold', vouchers: 1, coins: 200 },
  recovery: { minJump: 1.0, packId: 'gold', vouchers: 0, coins: 150 },
  personalBest: { minAboveAverage: 1.0, minPriorGrades: 2, vouchers: 1, coins: 100 },
  academy: { packEveryXp: 150, packId: 'gold', voucherEveryXp: 400, maxPacksPerWeek: 2 },
  maxVouchersPerWeek: 2,
};

export type ProgressKind = 'goal' | 'improvement' | 'recovery' | 'personalBest' | 'academy' | 'level';

export interface ProgressGrant {
  /** Idempotente sleutel: een sleutel wordt nooit twee keer toegekend. */
  key: string;
  kind: ProgressKind;
  label: string;
  packId?: string;
  vouchers: number;
  coins: number;
  /** Datum (JJJJ-MM-DD) waarop de beloning telt voor de weeklimiet. */
  date: string;
  configVersion: string;
  /** Vouchers die door de weeklimiet niet zijn toegekend. */
  cappedVouchers?: number;
  subjectId?: string;
}

export interface ProgressInput {
  /** Alle actuele, echte cijfers (inclusief het zojuist ingevoerde). */
  grades: readonly Grade[];
  goals: readonly Goal[];
  /** XP-ledger inclusief de nieuwste toekenningen (voor Academy-mijlpalen). */
  ledger: readonly XpEntry[];
  /** Eerder toegekende voortgangsbeloningen. */
  grants: readonly ProgressGrant[];
  periods: readonly Period[];
  today: string;
}

const fmt = (v: number) => v.toFixed(1).replace('.', ',');

/**
 * Nieuwe voortgangsbeloningen sinds de vorige aanroep. Pure functie: dezelfde invoer geeft dezelfde uitvoer,
 * en eerder toegekende sleutels komen nooit terug.
 */
export function progressRewards(config: ProgressRewardConfig, input: ProgressInput): ProgressGrant[] {
  const { grades, goals, ledger, grants, periods, today } = input;
  const real = grades.filter((g) => g.status !== 'simulated');
  const have = new Set(grants.map((g) => g.key));
  const base = { date: today, configVersion: config.version };
  const out: ProgressGrant[] = [];
  const add = (g: ProgressGrant) => { if (!have.has(g.key)) { have.add(g.key); out.push(g); } };

  // 1. Doelen: eenmalig, alleen als het doel na het instellen is bereikt.
  for (const goal of goals) {
    if (goalReachedBy(real, goal)) {
      add({ ...base, key: `pr-doel:${goal.id}`, kind: 'goal', label: 'Persoonlijk doel bereikt', vouchers: config.goal.vouchers, coins: config.goal.coins, subjectId: goal.subjectId });
    }
  }

  const period = periods.find((p) => today >= p.start && today <= p.end);
  if (period) {
    const subjects = [...new Set(real.map((g) => g.subjectId))];
    for (const s of subjects) {
      const list = real.filter((g) => g.subjectId === s && g.date <= today);
      // 2. Verbetering t.o.v. je eigen gemiddelde vóór deze periode.
      const before = list.filter((g) => g.date < period.start);
      const inP = list.filter((g) => g.date >= period.start && g.date <= period.end);
      const b = weightedAverage(before);
      const a = weightedAverage(inP);
      if (b !== null && a !== null && inP.length >= config.improvement.minGradesInPeriod && a - b >= config.improvement.minDelta) {
        add({ ...base, key: `pr-vooruit:${period.id}:${s}`, kind: 'improvement', label: `Vooruitgang: van ${fmt(b)} naar ${fmt(a)}`, packId: config.improvement.packId, vouchers: config.improvement.vouchers, coins: config.improvement.coins, subjectId: s });
      }
      // 3. Persoonlijk topcijfer: ver boven je eigen niveau in dit vak, ongeacht of dat niveau een 5 of een 8 is.
      const chronAll = chronological(list);
      for (let i = config.personalBest.minPriorGrades; i < chronAll.length; i++) {
        const cur = chronAll[i] as Grade;
        if (cur.date < period.start || cur.date > period.end) continue;
        const own = weightedAverage(chronAll.slice(0, i));
        if (own !== null && cur.value - own >= config.personalBest.minAboveAverage && cur.value >= DUTCH_SCALE.pass) {
          add({ ...base, key: `pr-top:${period.id}:${s}`, kind: 'personalBest', label: `Topcijfer: ${fmt(cur.value)} (jouw gemiddelde ${fmt(own)})`, vouchers: config.personalBest.vouchers, coins: config.personalBest.coins, subjectId: s });
          break;
        }
      }
      // 4. Herstel: eerste voldoende in deze periode direct na een onvoldoende, minstens `minJump` hoger.
      const chron = chronological(list);
      for (let i = 1; i < chron.length; i++) {
        const cur = chron[i] as Grade;
        const prev = chron[i - 1] as Grade;
        if (cur.date < period.start || cur.date > period.end) continue;
        if (prev.value < DUTCH_SCALE.pass && cur.value >= DUTCH_SCALE.pass && cur.value - prev.value >= config.recovery.minJump) {
          add({ ...base, key: `pr-herstel:${period.id}:${s}`, kind: 'recovery', label: `Herstel: van ${fmt(prev.value)} naar ${fmt(cur.value)}`, packId: config.recovery.packId, vouchers: config.recovery.vouchers, coins: config.recovery.coins, subjectId: s });
          break;
        }
      }
    }
  }

  // 5. Academy-mijlpalen: iedere `packEveryXp` een pack, iedere `voucherEveryXp` een voucher (packs max per week).
  const academyXp = ledger.filter((e) => e.category === 'academy').reduce((sum, e) => sum + e.xp, 0);
  const week = weekStart(today);
  const thisWeek = (kind: ProgressKind, pred: (g: ProgressGrant) => boolean) =>
    [...grants, ...out].filter((g) => g.kind === kind && weekStart(g.date) === week && pred(g)).length;
  for (let n = 1; config.academy.packEveryXp > 0 && n * config.academy.packEveryXp <= academyXp; n++) {
    const key = `pr-acad-pack:${n}`;
    if (have.has(key)) continue;
    if (thisWeek('academy', (g) => !!g.packId) >= config.academy.maxPacksPerWeek) break;
    add({ ...base, key, kind: 'academy', label: `Academy-mijlpaal: ${n * config.academy.packEveryXp} XP`, packId: config.academy.packId, vouchers: 0, coins: 0 });
  }
  // Voucher-mijlpalen schuiven door naar een volgende week als de weeklimiet al vol is (gaan niet verloren).
  const vouchersThisWeek = () => [...grants, ...out].filter((g) => weekStart(g.date) === week).reduce((sum, g) => sum + g.vouchers, 0);
  for (let n = 1; config.academy.voucherEveryXp > 0 && n * config.academy.voucherEveryXp <= academyXp; n++) {
    if (have.has(`pr-acad-voucher:${n}`)) continue;
    if (vouchersThisWeek() >= config.maxVouchersPerWeek) break;
    add({ ...base, key: `pr-acad-voucher:${n}`, kind: 'academy', label: `Academy-mijlpaal: ${n * config.academy.voucherEveryXp} XP`, vouchers: 1, coins: 0 });
  }

  // 6. Clubniveau omhoog. Zonder eerdere niveaubeloning telt alleen het huidige niveau (geen inhaalslag voor
  //    bestaande accounts); daarna ieder volgend niveau.
  if (config.level) {
    const { level } = clubLevel(ledger.reduce((sum, e) => sum + e.xp, 0));
    const granted = grants.filter((g) => g.kind === 'level').map((g) => Number(g.key.split(':')[1]) || 0);
    const from = granted.length ? Math.max(...granted) + 1 : Math.max(2, level);
    for (let n = from; n <= level; n++) {
      add({ ...base, key: `pr-niveau:${n}`, kind: 'level', label: `Clubniveau ${n} bereikt`, packId: config.level.packId, vouchers: 0, coins: config.level.coins });
    }
  }

  // Weeklimiet voor vouchers uit voortgang: de rest van de beloning (pack, coins) blijft staan.
  let used = grants.filter((g) => weekStart(g.date) === week).reduce((sum, g) => sum + g.vouchers, 0);
  return out.map((g) => {
    if (g.vouchers <= 0) return g;
    const room = Math.max(0, config.maxVouchersPerWeek - used);
    const vouchers = Math.min(g.vouchers, room);
    used += vouchers;
    return vouchers < g.vouchers ? { ...g, vouchers, cappedVouchers: g.vouchers - vouchers } : g;
  });
}

/* ———————————— Economie v3: positief en haalbaar (ronde 5) ———————————— */

/**
 * Cijferbeloning v3: ieder ingevoerd cijfer levert iets op (ook een onvoldoende), een voldoende geeft een
 * Starterspack en coins. Goudpacks komen vooral uit inzet en groei (clubniveau, doelen, verbetering, herstel,
 * oefenen); een 8,5+ en 9,5+ blijven extra bijzonder. Zo is een sterk elftal haalbaar zonder achten en negens,
 * en komt er geen eindeloze stroom topkaarten.
 */
export const ACHIEVABLE_REWARD_CONFIG: RewardConfig = {
  ...DEFAULT_REWARD_CONFIG,
  version: '2026.10-haalbaar.1',
  tiers: [
    { id: 'support', label: 'Herstelkans', minGrade: 1, tone: 'support', xp: 15, coins: 150 },
    { id: 'pass', label: 'Voldoende', minGrade: 5.5, tone: 'pass', xp: 50, coins: 200, packId: 'starter' },
    { id: 'good', label: 'Goed', minGrade: 6.5, tone: 'good', xp: 90, coins: 250, packId: 'starter' },
    { id: 'great', label: 'Sterk', minGrade: 7.5, tone: 'great', xp: 140, coins: 300, packId: 'starter' },
    { id: 'elite', label: 'Uitstekend', minGrade: 8.5, tone: 'elite', xp: 200, coins: 350, packId: 'starter', vouchers: 1 },
    { id: 'legendary', label: 'Legendarisch', minGrade: 9.5, tone: 'legendary', xp: 300, coins: 500, packId: 'gold', vouchers: 1 },
  ],
};

export const ACHIEVABLE_PROGRESS_CONFIG: ProgressRewardConfig = {
  version: '2026.10-voortgang.2',
  goal: { vouchers: 1, coins: 300 },
  improvement: { minDelta: 0.6, minGradesInPeriod: 3, packId: 'starter', vouchers: 1, coins: 300 },
  recovery: { minJump: 1.0, packId: 'starter', vouchers: 0, coins: 300 },
  personalBest: { minAboveAverage: 1.0, minPriorGrades: 2, vouchers: 1, coins: 150 },
  // Oefenen telt al mee voor je clubniveau (Academy-XP); de mijlpalen geven daarom vouchers, geen extra packs.
  academy: { packEveryXp: 0, packId: 'gold', voucherEveryXp: 400, maxPacksPerWeek: 0 },
  maxVouchersPerWeek: 1,
  level: { packId: 'gold', coins: 0 },
};

/** De economie die app en server nu gebruiken. Wisselen gebeurt alleen hier; oude toekenningen houden hun versie. */
export const CURRENT_REWARD_CONFIG = ACHIEVABLE_REWARD_CONFIG;
export const CURRENT_PROGRESS_CONFIG = ACHIEVABLE_PROGRESS_CONFIG;
