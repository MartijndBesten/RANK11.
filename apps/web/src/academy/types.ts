/**
 * Academy-oefenmodule in de app: één interface voor de lokale demo (engine in de browser) en de server
 * (apps/api, nakijken op de server). Vormen gelijk aan de API-antwoorden van /api/academy.
 */
import type { AcademyDecisionStatus, PracticeSubjectId, PublicPracticeSession, TopicProgressRow } from '@rank11/engine';

export interface AcademyOverview {
  subjects: { id: PracticeSubjectId; name: string; topics: { id: string; label: string; description: string }[] }[];
  progress: TopicProgressRow[];
  xp: { total: number; today: number; week: number; dailyCap: number; weeklyCap: number };
  recent: { eventId: string; subjectId: string; topic: string; questionCount: number; correctCount: number; mistakesFixed: number; decision: string; xp: number; at: number }[];
}

export interface PracticeResult {
  results: { id: string; correct: boolean; given: string; answer: string; reason: 'fix' | 'review' | 'new' | 'extra'; fixed: boolean; masteredNow: boolean }[];
  summary: { questionCount: number; correctCount: number; mistakesFixed: number; newlyMastered: string[] };
  decision: { status: AcademyDecisionStatus | string; reason: string; xp: number; entries: { key: string; xp: number; label: string; cappedBy: number }[] };
  progress: { key: string; kind: string; label: string; packId: string | null; vouchers: number; coins: number; cappedVouchers: number }[];
  topicProgress: TopicProgressRow[];
}

export interface PracticeBackend {
  /** 'lokaal' = in de browser nagekeken (demo); 'server' = de server kijkt na. */
  kind: 'lokaal' | 'server';
  overview: () => Promise<AcademyOverview>;
  start: (subjectId: PracticeSubjectId, topic: string | null) => Promise<PublicPracticeSession>;
  submit: (sessionId: string, answers: Record<string, string>, abandoned?: boolean) => Promise<PracticeResult>;
}
