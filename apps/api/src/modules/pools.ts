/**
 * Pools (GDD §4.8, patroon bouwsteen B55): besloten groepen, uitnodigingscodes alleen gehasht met
 * verloopdatum en gebruikslimiet, rollen beheerder/lid, maximaal aantal leden (standaard 20).
 * Isolatie: iedere query is gescoped op pool_id + lidmaatschap; een niet-lid krijgt 404.
 */
import { requireUser } from '../auth.ts';
import { hashInviteCode, newId, randomInviteCode } from '../crypto.ts';
import { auditStmt, isConstraintError, many, one, stmt } from '../db.ts';
import { intVar } from '../env.ts';
import { ApiError, badRequest, conflict, forbidden, json, notFound, num, readJson, str, type Ctx } from '../http.ts';

export type PoolRole = 'admin' | 'member';

/** Lidmaatschap of 404 (bestaan van de pool lekt niet). */
export async function requireMember(db: D1Database, poolId: string, userId: string): Promise<{ role: PoolRole }> {
  const row = await one<{ role: PoolRole }>(db, 'SELECT role FROM pool_members WHERE pool_id = ? AND user_id = ?', poolId, userId);
  if (!row) throw notFound();
  return row;
}

export async function requireAdmin(db: D1Database, poolId: string, userId: string): Promise<void> {
  const m = await requireMember(db, poolId, userId);
  if (m.role !== 'admin') throw forbidden('Alleen een poolbeheerder kan dit doen.');
}

export async function createPool(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const body = await readJson(ctx.req);
  const name = str(body, 'name', { min: 2, max: 40 });
  const maxMembers = num(body, 'maxMembers', { min: 2, max: 100, integer: true, optional: true }) ?? intVar(ctx.env.POOL_MAX_MEMBERS_DEFAULT, 20);
  const id = newId('pool');
  const db = ctx.env.DB;
  await db.batch([
    stmt(db, 'INSERT INTO pools (id, name, max_members, created_by, created_at) VALUES (?, ?, ?, ?, ?)', id, name, maxMembers, user.id, ctx.now),
    stmt(db, 'INSERT INTO pool_members (pool_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)', id, user.id, 'admin', ctx.now),
    auditStmt(db, user.id, 'pool.create', id, { maxMembers }, ctx.now),
  ]);
  return json({ pool: { id, name, maxMembers, role: 'admin', memberCount: 1 } }, 201);
}

interface PoolRow { id: string; name: string; max_members: number; role: PoolRole; member_count: number; created_at: number }
const poolView = (r: PoolRow) => ({ id: r.id, name: r.name, maxMembers: r.max_members, role: r.role, memberCount: r.member_count, createdAt: r.created_at });

const POOL_SELECT = `SELECT p.id, p.name, p.max_members, p.created_at, m.role,
  (SELECT COUNT(*) FROM pool_members x WHERE x.pool_id = p.id) AS member_count
  FROM pools p JOIN pool_members m ON m.pool_id = p.id AND m.user_id = ?`;

export async function listPools(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const rows = await many<PoolRow>(ctx.env.DB, `${POOL_SELECT} ORDER BY p.created_at`, user.id);
  return json({ pools: rows.map(poolView) });
}

export async function getPool(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const row = await one<PoolRow>(ctx.env.DB, `${POOL_SELECT} WHERE p.id = ?`, user.id, ctx.params.poolId);
  if (!row) throw notFound();
  return json({ pool: poolView(row) });
}

export async function listMembers(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const poolId = ctx.params.poolId as string;
  await requireMember(ctx.env.DB, poolId, user.id);
  const rows = await many<{ user_id: string; username: string; role: PoolRole; joined_at: number; club_name: string | null; club_short: string | null }>(ctx.env.DB,
    `SELECT m.user_id, u.username, m.role, m.joined_at, c.name AS club_name, c.short AS club_short
     FROM pool_members m JOIN users u ON u.id = m.user_id LEFT JOIN clubs c ON c.user_id = m.user_id
     WHERE m.pool_id = ? ORDER BY m.joined_at, u.username`, poolId);
  return json({
    members: rows.map((r) => ({ userId: r.user_id, username: r.username, role: r.role, joinedAt: r.joined_at, club: r.club_name ? { name: r.club_name, short: r.club_short } : null })),
  });
}

export async function createInvite(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const poolId = ctx.params.poolId as string;
  await requireAdmin(ctx.env.DB, poolId, user.id);
  const body = await readJson(ctx.req);
  const hours = num(body, 'expiresInHours', { min: 1, max: 24 * 30, optional: true }) ?? 72;
  const maxUses = num(body, 'maxUses', { min: 1, max: 100, integer: true, optional: true }) ?? 10;
  const code = randomInviteCode();
  const id = newId('inv');
  const expiresAt = ctx.now + hours * 3600_000;
  const db = ctx.env.DB;
  await db.batch([
    stmt(db, 'INSERT INTO pool_invites (id, pool_id, code_hash, expires_at, max_uses, uses, created_by, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)',
      id, poolId, await hashInviteCode(code), expiresAt, maxUses, user.id, ctx.now),
    auditStmt(db, user.id, 'pool.invite.create', poolId, { inviteId: id, maxUses, expiresAt }, ctx.now),
  ]);
  // De leesbare code wordt alleen nu getoond; opgeslagen is alleen de hash.
  return json({ invite: { id, code, expiresAt, maxUses } }, 201);
}

const INVALID_CODE = 'Deze code is ongeldig of verlopen.';

export async function joinPool(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const body = await readJson(ctx.req);
  const code = str(body, 'code', { min: 4, max: 40 });
  const db = ctx.env.DB;
  const invite = await one<{ id: string; pool_id: string; expires_at: number; max_uses: number; uses: number }>(db,
    'SELECT id, pool_id, expires_at, max_uses, uses FROM pool_invites WHERE code_hash = ? AND revoked_at IS NULL', await hashInviteCode(code));
  if (!invite || invite.expires_at <= ctx.now || invite.uses >= invite.max_uses) throw new ApiError(400, 'invalid_code', INVALID_CODE);
  if (await one(db, 'SELECT 1 AS x FROM pool_members WHERE pool_id = ? AND user_id = ?', invite.pool_id, user.id)) {
    throw conflict('already_member', 'Je bent al lid van deze pool.');
  }
  try {
    await db.batch([
      stmt(db, 'UPDATE pool_invites SET uses = uses + 1 WHERE id = ?', invite.id),
      stmt(db, 'INSERT INTO pool_members (pool_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)', invite.pool_id, user.id, 'member', ctx.now),
      auditStmt(db, user.id, 'pool.join', invite.pool_id, { inviteId: invite.id }, ctx.now),
    ]);
  } catch (err) {
    if (isConstraintError(err, 'pool_full')) throw conflict('pool_full', 'Deze pool is vol.');
    if (isConstraintError(err)) throw new ApiError(400, 'invalid_code', INVALID_CODE);
    throw err;
  }
  const row = await one<PoolRow>(db, `${POOL_SELECT} WHERE p.id = ?`, user.id, invite.pool_id);
  return json({ pool: row ? poolView(row) : { id: invite.pool_id } }, 201);
}

export async function setMemberRole(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const poolId = ctx.params.poolId as string;
  const targetId = ctx.params.userId as string;
  const db = ctx.env.DB;
  await requireAdmin(db, poolId, user.id);
  const body = await readJson(ctx.req);
  const role = body.role;
  if (role !== 'admin' && role !== 'member') throw badRequest('Rol moet "admin" of "member" zijn.');
  const target = await one<{ role: PoolRole }>(db, 'SELECT role FROM pool_members WHERE pool_id = ? AND user_id = ?', poolId, targetId);
  if (!target) throw notFound();
  if (target.role === 'admin' && role === 'member') {
    const admins = await one<{ n: number }>(db, `SELECT COUNT(*) AS n FROM pool_members WHERE pool_id = ? AND role = 'admin'`, poolId);
    if ((admins?.n ?? 0) <= 1) throw conflict('last_admin', 'Een pool heeft minimaal één beheerder nodig.');
  }
  await db.batch([
    stmt(db, 'UPDATE pool_members SET role = ? WHERE pool_id = ? AND user_id = ?', role, poolId, targetId),
    auditStmt(db, user.id, 'pool.role', poolId, { userId: targetId, role }, ctx.now),
  ]);
  return json({ member: { userId: targetId, role } });
}
