/**
 * RANK11. API — Cloudflare Worker. Server-authoritative: clients sturen intenties,
 * de spelregels komen uit @rank11/engine.
 */
import { adminCreatePlatformInvite, authenticate, login, logout, me, register } from './auth.ts';
import type { Env } from './env.ts';
import { ApiError, errorResponse, finalize, preflight, Router, type Ctx } from './http.ts';
import { idempotent } from './idempotency.ts';
import { getClub, putClub } from './modules/clubs.ts';
import { buyPack, claimStarter, getCollection, getLineup, getWallet, listPacks, openPackGrant, putLineup } from './modules/collection.ts';
import { createCompetition, getCompetition, listCompetitions, poolStandings } from './modules/competitions.ts';
import { correctGrade, createGrade, deleteGrade, gradeHistory, listGrades } from './modules/grades.ts';
import { accept, challenge, decline, getMatch, getMatchEvents, listPoolMatches, matchSocket, move, resignMatch } from './modules/matches.ts';
import { createInvite, createPool, getPool, joinPool, listMembers, listPools, setMemberRole } from './modules/pools.ts';

export { MatchDO } from './match/MatchDO.ts';

const opt = { required: false };
const req = { required: true };

export const router = new Router()
  .add('GET', '/api/health', async () => new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } }))
  // accounts
  .add('POST', '/api/auth/register', register)
  .add('POST', '/api/auth/login', login)
  .add('POST', '/api/auth/logout', logout)
  .add('GET', '/api/me', me)
  .add('POST', '/api/admin/platform-invites', adminCreatePlatformInvite)
  // club
  .add('GET', '/api/club', getClub)
  .add('PUT', '/api/club', idempotent(putClub, opt))
  // pools
  .add('GET', '/api/pools', listPools)
  .add('POST', '/api/pools', idempotent(createPool, opt))
  .add('POST', '/api/pools/join', idempotent(joinPool, opt))
  .add('GET', '/api/pools/:poolId', getPool)
  .add('GET', '/api/pools/:poolId/members', listMembers)
  .add('PATCH', '/api/pools/:poolId/members/:userId', idempotent(setMemberRole, opt))
  .add('POST', '/api/pools/:poolId/invites', idempotent(createInvite, opt))
  .add('GET', '/api/pools/:poolId/standings', poolStandings)
  // competities
  .add('GET', '/api/pools/:poolId/competitions', listCompetitions)
  .add('POST', '/api/pools/:poolId/competitions', idempotent(createCompetition, opt))
  .add('GET', '/api/pools/:poolId/competitions/:competitionId', getCompetition)
  // wedstrijden
  .add('GET', '/api/pools/:poolId/matches', listPoolMatches)
  .add('POST', '/api/pools/:poolId/matches', idempotent(challenge, opt))
  .add('GET', '/api/matches/:matchId', getMatch)
  .add('GET', '/api/matches/:matchId/events', getMatchEvents)
  .add('GET', '/api/matches/:matchId/ws', matchSocket)
  .add('POST', '/api/matches/:matchId/accept', idempotent(accept, opt))
  .add('POST', '/api/matches/:matchId/decline', idempotent(decline, opt))
  .add('POST', '/api/matches/:matchId/moves', idempotent(move, opt))
  .add('POST', '/api/matches/:matchId/resign', idempotent(resignMatch, opt))
  // cijfers
  .add('GET', '/api/grades', listGrades)
  .add('POST', '/api/grades', idempotent(createGrade, req))
  .add('PUT', '/api/grades/:gradeId', idempotent(correctGrade, req))
  .add('DELETE', '/api/grades/:gradeId', idempotent(deleteGrade, req))
  .add('GET', '/api/grades/:gradeId/history', gradeHistory)
  // collectie, elftal, wallet, packs
  .add('GET', '/api/collection', getCollection)
  .add('POST', '/api/collection/starter', idempotent(claimStarter, opt))
  .add('GET', '/api/lineup', getLineup)
  .add('PUT', '/api/lineup', idempotent(putLineup, opt))
  .add('GET', '/api/wallet', getWallet)
  .add('GET', '/api/packs', listPacks)
  .add('POST', '/api/packs/buy', idempotent(buyPack, req))
  .add('POST', '/api/packs/:grantId/open', idempotent(openPackGrant, req));

const PUBLIC = new Set(['/api/health', '/api/auth/register', '/api/auth/login']);

export async function handle(request: Request, env: Env): Promise<Response> {
  if (request.method === 'OPTIONS') return preflight(request, env);
  const url = new URL(request.url);
  try {
    const match = router.match(request.method, url.pathname);
    if (match === null) throw new ApiError(404, 'not_found', 'Niet gevonden.');
    if (match === 'method_not_allowed') throw new ApiError(405, 'method_not_allowed', 'Methode niet toegestaan.');
    const now = Date.now();
    const auth = PUBLIC.has(url.pathname) ? { user: null, token: null } : await authenticate(request, env, now);
    if (!PUBLIC.has(url.pathname) && !auth.user) throw new ApiError(401, 'unauthorized', 'Log eerst in.');
    const ctx: Ctx = {
      req: request, env, url, params: match.params, now,
      ip: request.headers.get('CF-Connecting-IP') ?? 'onbekend',
      user: auth.user, sessionToken: auth.token,
    };
    return finalize(await match.handler(ctx), request, env);
  } catch (err) {
    if (err instanceof ApiError) return finalize(errorResponse(err), request, env);
    console.error('Onverwachte fout', err);
    return finalize(errorResponse(new ApiError(500, 'internal', 'Er ging iets mis.')), request, env);
  }
}

export default {
  fetch: (request: Request, env: Env): Promise<Response> => handle(request, env),
};
