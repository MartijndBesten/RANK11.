/**
 * Ranglijst uit uitslagen (GDD §4.7 "Uitslag en punten", §7 Ultimate League).
 * Pure functie: de ranglijst wordt nooit opgeslagen, maar telkens uit de uitslagen afgeleid.
 */

export interface LeagueResult {
  /** Optioneel id, alleen voor herleidbaarheid. */
  id?: string;
  home: string;
  away: string;
  homeGoals: number;
  awayGoals: number;
  /**
   * Reglementair verlies: wie niet (correct) gespeeld heeft. Bij 'both' krijgen beide deelnemers
   * een nederlaag zonder doelpunten (dubbel forfait).
   */
  forfeit?: 'home' | 'away' | 'both' | null;
  /** Tijdstip voor de volgorde van de vorm; zonder tijdstip geldt de volgorde in de lijst. */
  playedAt?: number;
}

export type FormLetter = 'W' | 'G' | 'V';

export interface LeagueConfig {
  configVersion: string;
  points: { win: number; draw: number; loss: number };
  /** Extra punten voor wie reglementair verliest (bijv. 0 of -1). */
  forfeitLossPoints: number;
  /** Doelpunten bij een reglementaire uitslag (winnaar–verliezer). */
  forfeitScore: { winner: number; loser: number };
  formLength: number;
}

export const DEFAULT_LEAGUE_CONFIG: LeagueConfig = {
  configVersion: 'league.2026.10-1',
  points: { win: 3, draw: 1, loss: 0 },
  forfeitLossPoints: 0,
  forfeitScore: { winner: 3, loser: 0 },
  formLength: 5,
};

export interface StandingRow {
  rank: number;
  participant: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  forfeits: number;
  /** Laatste resultaten, oudste eerst. */
  form: FormLetter[];
}

export class LeagueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LeagueError';
  }
}

interface Normalized {
  home: string;
  away: string;
  homeGoals: number;
  awayGoals: number;
  homeOutcome: FormLetter;
  awayOutcome: FormLetter;
  homeForfeit: boolean;
  awayForfeit: boolean;
}

function normalize(r: LeagueResult, config: LeagueConfig): Normalized {
  if (r.home === r.away) throw new LeagueError('Een deelnemer kan niet tegen zichzelf spelen.');
  const { winner, loser } = config.forfeitScore;
  if (r.forfeit === 'both') {
    return { home: r.home, away: r.away, homeGoals: 0, awayGoals: 0, homeOutcome: 'V', awayOutcome: 'V', homeForfeit: true, awayForfeit: true };
  }
  if (r.forfeit === 'home' || r.forfeit === 'away') {
    const homeLost = r.forfeit === 'home';
    return {
      home: r.home, away: r.away,
      homeGoals: homeLost ? loser : winner,
      awayGoals: homeLost ? winner : loser,
      homeOutcome: homeLost ? 'V' : 'W',
      awayOutcome: homeLost ? 'W' : 'V',
      homeForfeit: homeLost,
      awayForfeit: !homeLost,
    };
  }
  for (const g of [r.homeGoals, r.awayGoals]) {
    if (!Number.isInteger(g) || g < 0) throw new LeagueError('Doelpunten moeten gehele getallen ≥ 0 zijn.');
  }
  const outcome = (a: number, b: number): FormLetter => (a > b ? 'W' : a < b ? 'V' : 'G');
  return {
    home: r.home, away: r.away, homeGoals: r.homeGoals, awayGoals: r.awayGoals,
    homeOutcome: outcome(r.homeGoals, r.awayGoals), awayOutcome: outcome(r.awayGoals, r.homeGoals),
    homeForfeit: false, awayForfeit: false,
  };
}

interface Tally {
  played: number; won: number; drawn: number; lost: number;
  goalsFor: number; goalsAgainst: number; points: number; forfeits: number; form: FormLetter[];
}

const emptyTally = (): Tally => ({ played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0, forfeits: 0, form: [] });

function tally(participants: readonly string[], results: readonly Normalized[], config: LeagueConfig): Map<string, Tally> {
  const table = new Map(participants.map((p) => [p, emptyTally()]));
  const apply = (id: string, gf: number, ga: number, outcome: FormLetter, forfeit: boolean) => {
    const t = table.get(id);
    if (!t) return;
    t.played++;
    t.goalsFor += gf;
    t.goalsAgainst += ga;
    if (outcome === 'W') { t.won++; t.points += config.points.win; }
    else if (outcome === 'G') { t.drawn++; t.points += config.points.draw; }
    else { t.lost++; t.points += forfeit ? config.forfeitLossPoints : config.points.loss; }
    if (forfeit) t.forfeits++;
    t.form.push(outcome);
  };
  for (const r of results) {
    apply(r.home, r.homeGoals, r.awayGoals, r.homeOutcome, r.homeForfeit);
    apply(r.away, r.awayGoals, r.homeGoals, r.awayOutcome, r.awayForfeit);
  }
  return table;
}

/**
 * Berekent de ranglijst. Tie-breakers in volgorde: punten, doelsaldo, doelpunten voor,
 * onderling resultaat (punten, saldo, gescoord in de onderlinge duels van de gelijk staande groep),
 * daarna alfabetisch op naam (indien gegeven) en ten slotte op id.
 */
export function computeStandings(
  participants: readonly string[],
  results: readonly LeagueResult[],
  options: { config?: Partial<LeagueConfig>; names?: Record<string, string> } = {},
): StandingRow[] {
  const config: LeagueConfig = { ...DEFAULT_LEAGUE_CONFIG, ...options.config };
  if (new Set(participants).size !== participants.length) throw new LeagueError('Dubbele deelnemer in de ranglijst.');
  const known = new Set(participants);
  const ordered = results
    .map((r, i) => ({ r, i }))
    .sort((a, b) => (a.r.playedAt ?? 0) - (b.r.playedAt ?? 0) || a.i - b.i)
    .map(({ r }) => {
      if (!known.has(r.home) || !known.has(r.away)) throw new LeagueError('Uitslag met onbekende deelnemer.');
      return normalize(r, config);
    });
  const table = tally(participants, ordered, config);
  const t = (id: string) => table.get(id) as Tally;
  const name = (id: string) => options.names?.[id] ?? id;

  const primary = (a: string, b: string) => {
    const x = t(a), y = t(b);
    return y.points - x.points || (y.goalsFor - y.goalsAgainst) - (x.goalsFor - x.goalsAgainst) || y.goalsFor - x.goalsFor;
  };
  const fallback = (a: string, b: string) =>
    name(a).localeCompare(name(b), 'nl') || (a < b ? -1 : a > b ? 1 : 0);

  const sorted = [...participants].sort((a, b) => primary(a, b) || fallback(a, b));

  // Onderling resultaat binnen groepen die op de primaire criteria gelijk staan.
  const final: string[] = [];
  for (let i = 0; i < sorted.length;) {
    let j = i + 1;
    while (j < sorted.length && primary(sorted[i] as string, sorted[j] as string) === 0) j++;
    const group = sorted.slice(i, j);
    if (group.length > 1) {
      const members = new Set(group);
      const mini = tally(group, ordered.filter((r) => members.has(r.home) && members.has(r.away)), config);
      const m = (id: string) => mini.get(id) as Tally;
      group.sort((a, b) => {
        const x = m(a), y = m(b);
        return y.points - x.points || (y.goalsFor - y.goalsAgainst) - (x.goalsFor - x.goalsAgainst) || y.goalsFor - x.goalsFor || fallback(a, b);
      });
    }
    final.push(...group);
    i = j;
  }

  return final.map((participant, idx) => {
    const x = t(participant);
    return {
      rank: idx + 1,
      participant,
      played: x.played,
      won: x.won,
      drawn: x.drawn,
      lost: x.lost,
      goalsFor: x.goalsFor,
      goalsAgainst: x.goalsAgainst,
      goalDifference: x.goalsFor - x.goalsAgainst,
      points: x.points,
      forfeits: x.forfeits,
      form: x.form.slice(-config.formLength),
    };
  });
}
