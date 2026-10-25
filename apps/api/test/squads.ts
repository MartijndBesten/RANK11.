/** Testopzet voor battles: vaste elftallen uit de catalogus en een wedstrijd uitspelen via de REST-API. */
import { expect } from 'vitest';
import { getCatalog } from '../src/game.ts';
import type { TestApp, TestUser } from './helpers.ts';

const byRating = () => [...getCatalog()].sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id));
export const STRONG = () => byRating().slice(0, 11);
export const MEDIUM = () => byRating().slice(100, 111);
export const WEAK = () => byRating().slice(-11);

/** Testopzet: zet bepaalde kaarten in de collectie van een gebruiker en stel ze op. */
export async function giveSquad(app: TestApp, user: TestUser, defs: { id: string }[]): Promise<string[]> {
  const ids = defs.map((d, i) => `card_${user.username}_${i}`);
  defs.forEach((d, i) => {
    app.db.db.prepare(`INSERT INTO card_instances (id, user_id, card_def_id, catalog_version, acquired_via, source_ref, acquired_at) VALUES (?, ?, ?, 'test', 'starter', 'test', ?)`)
      .run(ids[i] as string, user.id, d.id, app.now());
  });
  const res = await app.api('PUT', '/api/lineup', { token: user.token, body: { cardIds: ids } });
  if (res.status !== 200) throw new Error(`opstelling mislukt: ${JSON.stringify(res.body)}`);
  return ids;
}

/** Speelt een wedstrijd via de REST-API uit; iedere speler legt zijn eerste beschikbare kaart. */
export async function playOut(app: TestApp, matchId: string, users: TestUser[]): Promise<any> {
  for (let i = 0; i < 30; i++) {
    const res = await app.api('GET', `/api/matches/${matchId}`, { token: users[0]?.token });
    const state = res.body.battle.state;
    if (state.status === 'finished') return res.body;
    const side = state.toMove as 'home' | 'away';
    const userId = state.players[side];
    const user = users.find((u) => u.id === userId)!;
    const mv = await app.api('POST', `/api/matches/${matchId}/moves`, { token: user.token, body: { cardId: state.available[side][0] } });
    if (mv.status !== 200) throw new Error(`zet mislukt: ${JSON.stringify(mv.body)}`);
  }
  throw new Error('wedstrijd eindigt niet');
}

export async function startMatch(app: TestApp, poolId: string, challenger: TestUser, opponent: TestUser, extra: Record<string, unknown> = {}) {
  const ch = await app.api('POST', `/api/pools/${poolId}/matches`, { token: challenger.token, body: { opponentId: opponent.id, ...extra } });
  expect(ch.status).toBe(201);
  const acc = await app.api('POST', `/api/matches/${ch.body.match.id}/accept`, { token: opponent.token });
  expect(acc.status).toBe(200);
  return { matchId: ch.body.match.id as string, accepted: acc.body };
}

