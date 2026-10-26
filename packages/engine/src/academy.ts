/**
 * RANK Academy: optionele beloningen voor aantoonbare leeractiviteit.
 * - Een Learning Provider levert voltooiingsevents (bijv. leren.martijndenbesten.com, of de interne demo).
 * - Events komen alleen server-to-server binnen met een HMAC-SHA256-handtekening; nooit uit de browser vertrouwen.
 * - Idempotent op eventId; herhaling levert alleen opnieuw XP bij aantoonbare leerwaarde (betere score,
 *   eerder foute vragen nu goed), met cooldown, minimale sessieduur en dag-/weekplafonds.
 * - Oefenscores worden nooit als schoolcijfer opgeslagen.
 * De koppeling met een echte leeromgeving staat standaard UIT (zie docs/ACADEMY-INTEGRATION.md).
 */
import { applyCaps, type MotivationConfig, type XpEntry } from './motivation.ts';

export type ActivityType = 'practice' | 'mock-test' | 'flashcards' | 'quiz' | 'review' | 'mistakes' | 'chapter-test' | 'exam-training';

export interface LearningEvent {
  schemaVersion: 1;
  eventId: string;
  providerId: string;
  externalUserId: string;
  activityId: string;
  subjectId: string;
  topic: string;
  activityType: ActivityType;
  startedAt: string;
  completedAt: string;
  questionCount: number;
  correctCount: number;
  /** Aantal vragen dat eerder fout was en nu goed beantwoord is. */
  mistakesFixed: number;
  status: 'completed' | 'abandoned';
  /**
   * Optioneel: sleutel van de vragenset (bijv. hash van de vraag-id's). Met een sleutel telt "eerste afronding"
   * per dag per activiteit en levert een identieke sessie niets op; zonder sleutel (vaste oefentoets van een externe
   * leeromgeving) telt de eerste afronding één keer en daarna alleen een betere score.
   */
  contentKey?: string;
}

export interface LearningProvider {
  id: string;
  name: string;
  /** Verifieert een binnenkomend verzoek (handtekening, tijdvenster) en geeft de events terug. */
  receive(body: string, headers: Record<string, string | undefined>): Promise<LearningEvent[]>;
}

export class AcademyEventError extends Error {}

const TYPES: ActivityType[] = ['practice', 'mock-test', 'flashcards', 'quiz', 'review', 'mistakes', 'chapter-test', 'exam-training'];

export function validateEvent(e: unknown): LearningEvent {
  const x = e as Partial<LearningEvent>;
  const str = (v: unknown, name: string) => {
    if (typeof v !== 'string' || !v.trim() || v.length > 200) throw new AcademyEventError(`Ongeldig veld ${name}.`);
  };
  if (!x || x.schemaVersion !== 1) throw new AcademyEventError('Onbekende schemaversie.');
  for (const k of ['eventId', 'providerId', 'externalUserId', 'activityId', 'subjectId', 'topic', 'startedAt', 'completedAt'] as const) str(x[k], k);
  if (!TYPES.includes(x.activityType as ActivityType)) throw new AcademyEventError('Onbekend activiteittype.');
  const ints = [x.questionCount, x.correctCount, x.mistakesFixed];
  if (ints.some((n) => !Number.isInteger(n) || (n as number) < 0)) throw new AcademyEventError('Aantallen moeten gehele getallen ≥ 0 zijn.');
  if ((x.correctCount as number) > (x.questionCount as number) || (x.mistakesFixed as number) > (x.correctCount as number)) throw new AcademyEventError('Aantallen kloppen niet.');
  if ((x.questionCount as number) === 0 || (x.questionCount as number) > 500) throw new AcademyEventError('Aantal vragen buiten bereik.');
  if (Number.isNaN(Date.parse(x.startedAt as string)) || Number.isNaN(Date.parse(x.completedAt as string))) throw new AcademyEventError('Ongeldige tijden.');
  if (Date.parse(x.completedAt as string) < Date.parse(x.startedAt as string)) throw new AcademyEventError('Afronding vóór start.');
  if (x.status !== 'completed' && x.status !== 'abandoned') throw new AcademyEventError('Ongeldige status.');
  if (x.contentKey !== undefined) str(x.contentKey, 'contentKey');
  return x as LearningEvent;
}

/* ———————————— Handtekening (server-to-server) ———————————— */

const enc = new TextEncoder();
const toHex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');

export async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toHex(await crypto.subtle.sign('HMAC', key, enc.encode(message)));
}

/** Constant-time vergelijking van twee hex-strings. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Handtekening over `${timestamp}.${body}`; maximaal `toleranceSec` oud; meerdere geheimen voor sleutelrotatie. */
export async function verifySignature(
  body: string, timestamp: string, signature: string, secrets: readonly string[], nowMs: number, toleranceSec = 300,
): Promise<boolean> {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowMs / 1000 - ts) > toleranceSec) return false;
  for (const s of secrets) {
    if (safeEqual(await hmacHex(s, `${timestamp}.${body}`), signature)) return true;
  }
  return false;
}

/** Provider die ondertekende JSON-batches ontvangt ({events: [...]}) met headers x-rank-timestamp en x-rank-signature. */
export function signedProvider(id: string, name: string, secrets: () => readonly string[], now: () => number = Date.now): LearningProvider {
  return {
    id,
    name,
    async receive(body, headers) {
      const ok = await verifySignature(body, headers['x-rank-timestamp'] ?? '', headers['x-rank-signature'] ?? '', secrets(), now());
      if (!ok) throw new AcademyEventError('Handtekening ongeldig of verlopen.');
      const parsed = JSON.parse(body) as { events?: unknown[] };
      if (!Array.isArray(parsed.events) || parsed.events.length > 100) throw new AcademyEventError('Ongeldige batch.');
      return parsed.events.map(validateEvent).map((e) => {
        if (e.providerId !== id) throw new AcademyEventError('Event hoort bij een andere provider.');
        return e;
      });
    },
  };
}

/* ———————————— Accountkoppeling ———————————— */

export interface AccountLink { providerId: string; externalUserId: string; playerId: string; linkedAt: string; revokedAt?: string }

/** Zoekt de speler bij een event; ontkoppelde of onbekende gebruikers leveren nooit een beloning op. */
export function resolvePlayer(links: readonly AccountLink[], e: Pick<LearningEvent, 'providerId' | 'externalUserId'>): string | null {
  const link = links.find((l) => l.providerId === e.providerId && l.externalUserId === e.externalUserId && !l.revokedAt);
  return link?.playerId ?? null;
}

/* ———————————— Beloning ———————————— */

export type AcademyDecisionStatus = 'rewarded' | 'duplicate' | 'not-linked' | 'abandoned' | 'too-fast' | 'no-learning-value' | 'capped' | 'disabled';

export interface AcademyDecision {
  status: AcademyDecisionStatus;
  entries: XpEntry[];
  reason: string;
  score: number;
}

export interface AcademyContext {
  enabled: boolean;
  playerId: string | null;
  /** Eerder geaccepteerde events van deze speler (voor herhaling en eerdere scores). */
  history: readonly LearningEvent[];
  ledger: readonly XpEntry[];
}

export const scoreOf = (e: Pick<LearningEvent, 'correctCount' | 'questionCount'>) => e.correctCount / e.questionCount;

export function academyReward(config: MotivationConfig, e: LearningEvent, ctx: AcademyContext): AcademyDecision {
  const score = scoreOf(e);
  const none = (status: AcademyDecisionStatus, reason: string): AcademyDecision => ({ status, entries: [], reason, score });
  const a = config.academy;
  if (!ctx.enabled) return none('disabled', 'Academy staat uit voor deze pool.');
  if (!ctx.playerId) return none('not-linked', 'Geen gekoppeld account voor deze leerling.');
  if (ctx.history.some((h) => h.eventId === e.eventId) || ctx.ledger.some((l) => l.source.kind === 'academy' && l.source.id === e.eventId)) {
    return none('duplicate', 'Dit event is al verwerkt.');
  }
  if (e.status !== 'completed') return none('abandoned', 'Niet afgerond.');
  // Geen verplichte minimumtijd meer (V-016); alleen als een configuratie er expliciet een instelt.
  const seconds = (Date.parse(e.completedAt) - Date.parse(e.startedAt)) / 1000;
  if (a.minSecondsPerQuestion > 0 && seconds < e.questionCount * a.minSecondsPerQuestion) return none('too-fast', 'Te kort om betrouwbaar te belonen.');

  const date = e.completedAt.slice(0, 10);
  const base = { category: 'academy' as const, date, source: { kind: 'academy' as const, id: e.eventId }, configVersion: config.version };
  const prior = ctx.history.filter((h) => h.activityId === e.activityId && h.status === 'completed');
  const entries: XpEntry[] = [];
  // Een identieke vragenset nog een keer maken levert niets op (geen farmen door herhalen).
  if (e.contentKey && prior.some((h) => h.contentKey === e.contentKey)) {
    return none('no-learning-value', 'Deze oefening heb je al precies zo gemaakt.');
  }
  const firstEver = prior.length === 0;
  const bestBefore = firstEver ? 0 : Math.max(...prior.map(scoreOf));
  // Afronding: met vragenset-sleutel één keer per activiteit per dag, zonder sleutel één keer in totaal.
  // Alleen met minstens de helft goed (completeMinScore): wegklikken of gokken is geen leeractiviteit.
  const freshCompletion = score >= a.completeMinScore && (e.contentKey ? !prior.some((h) => h.completedAt.slice(0, 10) === date) : firstEver);
  if (freshCompletion) entries.push({ ...base, key: `acad:${e.eventId}:af`, xp: a.completeXp, label: `Oefening ${e.topic} afgerond` });
  if (!firstEver) {
    // Herhaling: alleen XP voor aantoonbare leerwaarde (hoger dan ooit eerder), met cooldown.
    const last = prior.reduce((x, h) => (h.completedAt > x.completedAt ? h : x));
    const hours = (Date.parse(e.completedAt) - Date.parse(last.completedAt)) / 3.6e6;
    if (hours >= a.repeatCooldownHours && score - bestBefore >= a.improvedScoreMinDelta) {
      entries.push({ ...base, key: `acad:${e.eventId}:beter`, xp: a.improvedScoreXp, label: `Score verbeterd naar ${Math.round(score * 100)}%` });
    }
  }
  // Hoge score: alleen de eerste keer dat je die drempel voor deze activiteit haalt.
  if (score >= a.highScoreMin && bestBefore < a.highScoreMin && (firstEver || entries.length > 0)) {
    entries.push({ ...base, key: `acad:${e.eventId}:score`, xp: a.highScoreXp, label: `${Math.round(score * 100)}% goed` });
  }
  const fixed = Math.min(e.mistakesFixed, a.mistakeFixedMaxPerActivity);
  if (fixed > 0) entries.push({ ...base, key: `acad:${e.eventId}:fouten`, xp: fixed * a.mistakeFixedXp, label: `${fixed} eerdere fout${fixed === 1 ? '' : 'en'} verbeterd` });

  if (!entries.length) return none('no-learning-value', 'Herhaling zonder verbetering levert geen XP op.');
  const capped = applyCaps(config, ctx.ledger, entries);
  const total = capped.reduce((s, x) => s + x.xp, 0);
  if (total === 0) return { status: 'capped', entries: capped, reason: 'Dag- of weekplafond voor Academy XP bereikt.', score };
  return { status: 'rewarded', entries: capped, reason: 'Beloond.', score };
}

/** Samenvatting per vak voor het cijferdashboard (los van schoolcijfers). */
export function academySubjectSummary(events: readonly LearningEvent[], ledger: readonly XpEntry[], subjectId: string) {
  const list = events.filter((e) => e.subjectId === subjectId && e.status === 'completed');
  const ids = new Set(list.map((e) => e.eventId));
  const byTopic = new Map<string, number[]>();
  for (const e of list) byTopic.set(e.topic, [...(byTopic.get(e.topic) ?? []), scoreOf(e)]);
  let hardest: { topic: string; score: number } | null = null;
  for (const [topic, scores] of byTopic) {
    const avg = scores.reduce((s, x) => s + x, 0) / scores.length;
    if (!hardest || avg < hardest.score) hardest = { topic, score: avg };
  }
  return {
    count: list.length,
    averageScore: list.length ? list.reduce((s, e) => s + scoreOf(e), 0) / list.length : null,
    hardestTopic: byTopic.size >= 2 ? hardest : null,
    xp: ledger.filter((l) => l.category === 'academy' && ids.has(l.source.id)).reduce((s, l) => s + l.xp, 0),
  };
}
