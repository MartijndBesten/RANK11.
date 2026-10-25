/**
 * Durable Object per wedstrijd. Alleen bereikbaar via de Worker (die authenticeert en het
 * lidmaatschap controleert en de gebruiker meegeeft in `X-User-Id`).
 *
 * - REST-fallback (asynchroon spelen): /state, /events, /move, /resign.
 * - Live: /ws met WebSocket-hibernation (`ctx.acceptWebSocket`); berichten `{type:"move", cardId}`,
 *   `{type:"resign"}` en `{type:"sync"}`. Na een reconnect stuurt de server de volledige eventlog.
 * - Deadlines via het DO-alarm; de eventlog staat persistent in de DO-opslag.
 */
import type { Env } from '../env.ts';
import { MatchRoom, RoomError, type MatchMeta, type RoomStorage } from './room.ts';
import type { BattleEvent, BattleState } from '../engine.ts';

/** Het deel van DurableObjectState dat deze klasse gebruikt (ook door de testadapter geïmplementeerd). */
export interface MatchDOState {
  storage: RoomStorage;
  acceptWebSocket(ws: WebSocket, tags?: string[]): void;
  getWebSockets(tag?: string): WebSocket[];
}

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

export async function reportResultToD1(db: D1Database, meta: MatchMeta, state: BattleState, now: number): Promise<void> {
  const r = state.result;
  if (!r) return;
  const winner = r.winner === 'home' ? meta.homeUserId : r.winner === 'away' ? meta.awayUserId : null;
  const forfeitBy = r.forfeitedBy === 'home' ? meta.homeUserId : r.forfeitedBy === 'away' ? meta.awayUserId : null;
  await db.prepare(
    `UPDATE matches SET status = 'finished', home_goals = ?, away_goals = ?, winner_user_id = ?, forfeit_by = ?, decided_early = ?, finished_at = ?
     WHERE id = ? AND status = 'active'`,
  ).bind(r.homeGoals, r.awayGoals, winner, forfeitBy, r.decidedEarly ? 1 : 0, now, meta.matchId).run();
}

export class MatchDO {
  private readonly room: MatchRoom;

  constructor(private readonly state: MatchDOState, private readonly env: Env) {
    this.room = new MatchRoom(state.storage, {
      now: () => Date.now(),
      broadcast: (message) => this.broadcast(message),
      reportResult: (meta, s) => reportResultToD1(this.env.DB, meta, s, Date.now()),
    });
  }

  private broadcast(message: unknown): void {
    const text = JSON.stringify(message);
    for (const ws of this.state.getWebSockets()) {
      try {
        ws.send(text);
      } catch {
        // verbinding al dicht; de client haalt bij reconnect de eventlog op
      }
    }
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const userId = req.headers.get('X-User-Id') ?? '';
    try {
      switch (`${req.method} ${url.pathname}`) {
        case 'POST /init': {
          const body = await req.json() as { meta: MatchMeta; created: BattleEvent };
          return jsonResponse(await this.room.init(body.meta, body.created), 201);
        }
        case 'GET /state':
          return jsonResponse(await this.room.sync());
        case 'GET /events':
          return jsonResponse(await this.room.getEvents());
        case 'POST /move': {
          const body = await req.json() as { cardId?: unknown };
          if (typeof body.cardId !== 'string') throw new RoomError(400, 'bad_request', 'cardId ontbreekt.');
          return jsonResponse(await this.room.move(userId, body.cardId));
        }
        case 'POST /resign':
          return jsonResponse(await this.room.resign(userId));
        case 'GET /ws':
          return await this.upgrade(req, userId);
        default:
          return jsonResponse({ error: { code: 'not_found', message: 'Niet gevonden.' } }, 404);
      }
    } catch (err) {
      if (err instanceof RoomError) return jsonResponse({ error: { code: err.code, message: err.message } }, err.status);
      console.error('MatchDO-fout', err);
      return jsonResponse({ error: { code: 'internal', message: 'Er ging iets mis.' } }, 500);
    }
  }

  private async upgrade(req: Request, userId: string): Promise<Response> {
    if (req.headers.get('Upgrade')?.toLowerCase() !== 'websocket') throw new RoomError(426, 'upgrade_required', 'Verwacht een WebSocket-verbinding.');
    if (!userId) throw new RoomError(401, 'unauthorized', 'Log eerst in.');
    const { events, view } = await this.room.getEvents();
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.state.acceptWebSocket(server, [userId]);
    server.serializeAttachment({ userId });
    server.send(JSON.stringify({ type: 'sync', events, view }));
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const { userId } = (ws.deserializeAttachment() ?? {}) as { userId?: string };
    let data: { type?: unknown; cardId?: unknown; requestId?: unknown };
    try {
      data = JSON.parse(typeof message === 'string' ? message : new TextDecoder().decode(message));
    } catch {
      ws.send(JSON.stringify({ type: 'error', code: 'bad_request', message: 'Ongeldig bericht.' }));
      return;
    }
    const requestId = typeof data.requestId === 'string' ? data.requestId : undefined;
    try {
      if (!userId) throw new RoomError(401, 'unauthorized', 'Log eerst in.');
      if (data.type === 'move') {
        if (typeof data.cardId !== 'string') throw new RoomError(400, 'bad_request', 'cardId ontbreekt.');
        await this.room.move(userId, data.cardId); // resultaat gaat via broadcast naar alle verbindingen
        ws.send(JSON.stringify({ type: 'ack', requestId }));
      } else if (data.type === 'resign') {
        await this.room.resign(userId);
        ws.send(JSON.stringify({ type: 'ack', requestId }));
      } else if (data.type === 'sync') {
        const { events, view } = await this.room.getEvents();
        ws.send(JSON.stringify({ type: 'sync', requestId, events, view }));
      } else {
        throw new RoomError(400, 'bad_request', 'Onbekend berichttype.');
      }
    } catch (err) {
      const e = err instanceof RoomError ? err : new RoomError(500, 'internal', 'Er ging iets mis.');
      ws.send(JSON.stringify({ type: 'error', requestId, code: e.code, message: e.message }));
    }
  }

  async webSocketClose(ws: WebSocket, code: number): Promise<void> {
    try {
      ws.close(code === 1000 || (code >= 3000 && code <= 4999) ? code : 1000, 'gesloten');
    } catch {
      // al gesloten
    }
  }

  async alarm(): Promise<void> {
    await this.room.alarm();
  }
}
