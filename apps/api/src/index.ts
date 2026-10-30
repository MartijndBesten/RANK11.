/**
 * RANK11. API — Cloudflare Worker. Server-authoritative: clients sturen intenties,
 * de spelregels komen uit @rank11/engine.
 */
import { adminCreatePlatformInvite, adminListPlatformInvites, adminRevokePlatformInvite, authenticate, login, logout, me, register } from './auth.ts';
import type { Env } from './env.ts';
import { servePilot } from './pilot.ts';
import { ApiError, errorResponse, finalize, preflight, Router, type Ctx } from './http.ts';
import { idempotent } from './idempotency.ts';
import { getClub, putClub } from './modules/clubs.ts';
import { buyPack, claimStarter, getCollection, getLineup, getWallet, listPacks, openPackGrant, putLineup, sellCards } from './modules/collection.ts';
import { createCompetition, getCompetition, listCompetitions, poolGradeLeague, poolStandings } from './modules/competitions.ts';
import { correctGrade, createGrade, deleteGrade, gradeHistory, importGrades, listGrades, listXp } from './modules/grades.ts';
import { accept, challenge, decline, getMatch, getMatchEvents, listPoolMatches, matchSocket, move, resignMatch } from './modules/matches.ts';
import { academyOverview, createSession, submitSession } from './modules/academy.ts';
import { getConfig } from './modules/config.ts';
import { getSettings, putSettings } from './modules/settings.ts';
import { connectIntegration, disconnectIntegration, getIntegration, listIntegrations, syncIntegration } from './modules/integrations/routes.ts';
import { adminDeleteUser, deleteAccount, exportAccount } from './modules/account.ts';
import { adminListFeedback, adminUpdateFeedback, createFeedback } from './modules/feedback.ts';
import { adminApprovalLink, adminBlockUser, adminListConsents, consentStatus, decideConsent, requestRevoke, resendConsent, revokeConsent } from './modules/consent.ts';
import { runScheduledSync } from './modules/integrations/sync.ts';
import { draftStatus, pickInDraft, startDraft } from './modules/drafts.ts';
import { createGoal, createUpcoming, deleteGoal, deleteUpcoming, getPlanning } from './modules/planning.ts';
import { claimPick, listVault, markSeen } from './modules/vault.ts';
import { createInvite, createPool, getPool, joinPool, listMembers, listPools, setMemberRole } from './modules/pools.ts';

export { MatchDO } from './match/MatchDO.ts';

const opt = { required: false };
const req = { required: true };

export const router = new Router()
  .add('GET', '/api/health', async () => new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } }))
  .add('GET', '/api/config', getConfig)
  .add('GET', '/api/settings', getSettings)
  .add('PUT', '/api/settings', putSettings)
  // koppelingen (externe cijferbronnen)
  .add('GET', '/api/integrations', listIntegrations)
  .add('GET', '/api/integrations/:provider', getIntegration)
  .add('POST', '/api/integrations/:provider/connect', idempotent(connectIntegration, req))
  .add('POST', '/api/integrations/:provider/sync', idempotent(syncIntegration, req))
  .add('DELETE', '/api/integrations/:provider', disconnectIntegration)
  // accounts
  .add('POST', '/api/auth/register', register)
  .add('POST', '/api/auth/login', login)
  .add('POST', '/api/auth/logout', logout)
  .add('GET', '/api/me', me)
  .add('GET', '/api/me/export', exportAccount)
  .add('DELETE', '/api/me', deleteAccount)
  // feedback van testgebruikers
  .add('POST', '/api/feedback', createFeedback)
  .add('GET', '/api/admin/feedback', adminListFeedback)
  .add('POST', '/api/admin/feedback/:id/status', adminUpdateFeedback)
  .add('GET', '/api/admin/platform-invites', adminListPlatformInvites)
  .add('POST', '/api/admin/platform-invites', adminCreatePlatformInvite)
  .add('POST', '/api/admin/platform-invites/:id/revoke', adminRevokePlatformInvite)
  // ouderlijke toestemming (publiek, token-gebaseerd)
  .add('POST', '/api/consent/decide', decideConsent)
  .add('POST', '/api/consent/revoke', revokeConsent)
  .add('POST', '/api/consent/request-revoke', requestRevoke)
  .add('GET', '/api/consent/status', consentStatus)
  .add('POST', '/api/consent/resend', resendConsent)
  // beheer: toestemmingen, blokkeren, verwijderen
  .add('GET', '/api/admin/consents', adminListConsents)
  .add('POST', '/api/admin/consents/:userId/link', adminApprovalLink)
  .add('POST', '/api/admin/users/:userId/block', adminBlockUser)
  .add('POST', '/api/admin/users/:userId/delete', adminDeleteUser)
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
  .add('GET', '/api/pools/:poolId/grade-league', poolGradeLeague)
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
  .add('POST', '/api/grades/import', idempotent(importGrades, req))
  .add('PUT', '/api/grades/:gradeId', idempotent(correctGrade, req))
  .add('DELETE', '/api/grades/:gradeId', idempotent(deleteGrade, req))
  .add('GET', '/api/grades/:gradeId/history', gradeHistory)
  .add('GET', '/api/xp', listXp)
  // doelen en geplande toetsen
  .add('GET', '/api/planning', getPlanning)
  .add('POST', '/api/goals', idempotent(createGoal, opt))
  .add('DELETE', '/api/goals/:goalId', idempotent(deleteGoal, opt))
  .add('POST', '/api/upcoming', idempotent(createUpcoming, opt))
  .add('DELETE', '/api/upcoming/:testId', idempotent(deleteUpcoming, opt))
  // cijferkluis
  .add('GET', '/api/vault', listVault)
  .add('POST', '/api/vault/:grantId/seen', idempotent(markSeen, opt))
  .add('POST', '/api/vault/:grantId/pick', idempotent(claimPick, req))
  // academy (interne oefenmodule)
  .add('GET', '/api/academy', academyOverview)
  .add('POST', '/api/academy/sessions', idempotent(createSession, opt))
  .add('POST', '/api/academy/sessions/:sessionId/submit', idempotent(submitSession, opt))
  // draft
  .add('GET', '/api/draft', draftStatus)
  .add('POST', '/api/draft', idempotent(startDraft, req))
  .add('POST', '/api/draft/:draftId/pick', idempotent(pickInDraft, opt))
  // collectie, elftal, wallet, packs
  .add('GET', '/api/collection', getCollection)
  .add('POST', '/api/collection/starter', idempotent(claimStarter, opt))
  .add('POST', '/api/collection/sell', idempotent(sellCards, req))
  .add('GET', '/api/lineup', getLineup)
  .add('PUT', '/api/lineup', idempotent(putLineup, opt))
  .add('GET', '/api/wallet', getWallet)
  .add('GET', '/api/packs', listPacks)
  .add('POST', '/api/packs/buy', idempotent(buyPack, req))
  .add('POST', '/api/packs/:grantId/open', idempotent(openPackGrant, req));

const PUBLIC = new Set(['/api/health', '/api/config', '/api/auth/register', '/api/auth/login',
  '/api/consent/decide', '/api/consent/revoke', '/api/consent/request-revoke']);

// Wachtende (ouderlijke toestemming) of geblokkeerde accounts hebben geen toegang tot het spel:
// alleen hun status bekijken, de mail opnieuw laten sturen, uitloggen of hun account verwijderen.
const PENDING_ALLOWED = new Set(['/api/me', '/api/config', '/api/consent/status', '/api/consent/resend', '/api/auth/logout']);

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
    // Geen spel-toegang zolang een account wacht op ouderlijke toestemming of geblokkeerd is.
    const selfDelete = request.method === 'DELETE' && url.pathname === '/api/me';
    if (auth.user && auth.user.status && auth.user.status !== 'active' && !PENDING_ALLOWED.has(url.pathname) && !selfDelete) {
      throw new ApiError(403, 'account_not_active', auth.user.status === 'blocked' ? 'Dit account heeft geen toegang.' : 'Wacht op toestemming van je ouder.');
    }
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

/**
 * Periodieke synchronisatie van cijferkoppelingen (cron). Nu alleen zinvol voor de voorbeeldbron; een echte,
 * geautoriseerde bron haakt hier vanzelf op aan. `waitUntil` houdt de run levend tot hij klaar is.
 */
export async function scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
  ctx.waitUntil(runScheduledSync(env, Date.now()).then(
    (reports) => { for (const r of reports) console.log(`sync ${r.provider}: ${r.users} gebruikers, ${r.created} nieuw, ${r.duplicate} al aanwezig, ${r.failed} mislukt`); },
    (err) => console.error('Geplande sync mislukt', err),
  ));
}

export default {
  fetch: (request: Request, env: Env): Promise<Response> => servePilot(request, env, handle),
  scheduled,
};
