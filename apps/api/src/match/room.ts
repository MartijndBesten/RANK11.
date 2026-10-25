/**
 * Kern van een wedstrijd-Durable Object, los van de Cloudflare-runtime zodat hij met een
 * in-memory opslagadapter te testen is. De eventlog is de enige waarheid; de status wordt telkens
 * met de engine afgeleid (`battleState`). Verlopen deadlines worden verwerkt bij elk verzoek én
 * via het DO-alarm, zodat live en asynchroon spelen hetzelfde gedrag hebben.
 */
import {
  battleCards, battleState, playCard, resign, sideOf, timeoutEvents, BattleError,
  type BattleCard, type BattleErrorCode, type BattleEvent, type BattleState, type Side,
} from '../engine.ts';

export interface RoomStorage {
  get<T>(key: string): Promise<T | undefined>;
  put<T>(key: string, value: T): Promise<void>;
  setAlarm(scheduledTime: number): Promise<void>;
  deleteAlarm(): Promise<void>;
}

export interface MatchMeta {
  matchId: string;
  poolId: string;
  homeUserId: string;
  awayUserId: string;
}

export interface RoomHooks {
  now(): number;
  broadcast(message: unknown): void;
  /** Schrijft de uitslag weg (D1). Moet idempotent zijn; bij een fout volgt een nieuwe poging. */
  reportResult(meta: MatchMeta, state: BattleState): Promise<void>;
}

export class RoomError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
    this.name = 'RoomError';
  }
}

const STATUS_BY_CODE: Record<BattleErrorCode, number> = {
  INVALID_LINEUP: 400, INVALID_CONFIG: 400, INVALID_LOG: 500, NOT_YOUR_TURN: 409, CARD_NOT_OWNED: 400,
  CARD_USED: 409, CARD_SUSPENDED: 409, MATCH_FINISHED: 409, INVALID_TIME: 409,
};

export interface MatchView {
  matchId: string;
  eventCount: number;
  state: Omit<BattleState, 'config'> & { config: BattleState['config'] };
  cards: Record<Side, BattleCard[]>;
}

export function viewOf(events: readonly BattleEvent[]): MatchView {
  const state = battleState(events);
  return { matchId: state.matchId, eventCount: events.length, state, cards: battleCards(events) };
}

export class MatchRoom {
  private events: BattleEvent[] | null = null;
  private meta: MatchMeta | null = null;
  private loaded = false;

  constructor(private readonly storage: RoomStorage, private readonly hooks: RoomHooks) {}

  private async load(): Promise<void> {
    if (this.loaded) return;
    this.events = (await this.storage.get<BattleEvent[]>('events')) ?? null;
    this.meta = (await this.storage.get<MatchMeta>('meta')) ?? null;
    this.loaded = true;
  }

  private require(): { events: BattleEvent[]; meta: MatchMeta } {
    if (!this.events || !this.meta) throw new RoomError(404, 'not_found', 'Wedstrijd niet gevonden.');
    return { events: this.events, meta: this.meta };
  }

  async init(meta: MatchMeta, created: BattleEvent): Promise<MatchView> {
    await this.load();
    if (this.events) throw new RoomError(409, 'already_initialized', 'Deze wedstrijd is al gestart.');
    if (created.type !== 'created' || created.matchId !== meta.matchId) throw new RoomError(400, 'invalid_init', 'Ongeldig startevent.');
    if (created.home.playerId !== meta.homeUserId || created.away.playerId !== meta.awayUserId) throw new RoomError(400, 'invalid_init', 'Spelers komen niet overeen.');
    battleState([created]); // valideert
    this.meta = meta;
    this.events = [created];
    await this.storage.put('meta', meta);
    await this.storage.put('events', this.events);
    await this.afterChange();
    return viewOf(this.events);
  }

  private async append(newEvents: BattleEvent[]): Promise<void> {
    const { events } = this.require();
    this.events = [...events, ...newEvents];
    await this.storage.put('events', this.events);
    this.hooks.broadcast({ type: 'events', events: newEvents, view: viewOf(this.events) });
    await this.afterChange();
  }

  private async afterChange(): Promise<void> {
    const { events, meta } = this.require();
    const state = battleState(events);
    if (state.status === 'finished') {
      await this.storage.deleteAlarm();
      if (!(await this.storage.get<boolean>('reported'))) {
        await this.hooks.reportResult(meta, state);
        await this.storage.put('reported', true);
      }
    } else if (state.deadline !== null) {
      await this.storage.setAlarm(state.deadline);
    }
  }

  /** Verwerkt verlopen deadlines (automatische zetten / forfait) en geeft de actuele weergave. */
  async sync(): Promise<MatchView> {
    await this.load();
    const { events } = this.require();
    const due = timeoutEvents(events, this.hooks.now());
    if (due.length) await this.append(due);
    else if (battleState(events).status === 'finished' && !(await this.storage.get<boolean>('reported'))) await this.afterChange();
    return viewOf(this.require().events);
  }

  async getEvents(): Promise<{ events: BattleEvent[]; view: MatchView }> {
    const view = await this.sync();
    return { events: this.require().events, view };
  }

  private sideFor(userId: string): Side {
    const { events } = this.require();
    const side = sideOf(battleState(events), userId);
    if (!side) throw new RoomError(403, 'not_participant', 'Je speelt niet mee in deze wedstrijd.');
    return side;
  }

  async move(userId: string, cardId: string): Promise<MatchView> {
    await this.sync();
    const side = this.sideFor(userId);
    const { events } = this.require();
    const at = Math.max(this.hooks.now(), battleState(events).lastEventAt);
    let event: BattleEvent;
    try {
      event = playCard(events, { side, cardId, at });
    } catch (err) {
      if (err instanceof BattleError) throw new RoomError(STATUS_BY_CODE[err.code], err.code.toLowerCase(), err.message);
      throw err;
    }
    await this.append([event]);
    return viewOf(this.require().events);
  }

  async resign(userId: string): Promise<MatchView> {
    await this.sync();
    const side = this.sideFor(userId);
    const { events } = this.require();
    const at = Math.max(this.hooks.now(), battleState(events).lastEventAt);
    let event: BattleEvent;
    try {
      event = resign(events, side, at);
    } catch (err) {
      if (err instanceof BattleError) throw new RoomError(STATUS_BY_CODE[err.code], err.code.toLowerCase(), err.message);
      throw err;
    }
    await this.append([event]);
    return viewOf(this.require().events);
  }

  /** DO-alarm: deadline verstreken. */
  async alarm(): Promise<void> {
    await this.load();
    if (!this.events) return;
    await this.sync();
  }
}
