#!/usr/bin/env node
/**
 * Rooktest tegen een draaiende API (bijv. `wrangler dev --local`): twee accounts, pool, startelftallen,
 * een volledige battle via REST, een zet via WebSocket, ranglijst en een cijfer met beloning.
 *
 * Gebruik: node scripts/smoke.mjs <basis-url> <platformuitnodigingscode>
 * Voorbeeld: node scripts/smoke.mjs http://127.0.0.1:8787 ABCDE-FGHJK
 * Alleen gebruiken tegen lokale of testomgevingen met synthetische gegevens.
 */
const [base, inviteCode] = process.argv.slice(2);
const existing = process.env.SMOKE_USER_A && process.env.SMOKE_USER_B;
const pilotUser = process.env.PILOT_ACCESS_USER;
const pilotPassword = process.env.PILOT_ACCESS_PASSWORD;
const basic = pilotUser && pilotPassword ? `Basic ${Buffer.from(`${pilotUser}:${pilotPassword}`).toString('base64')}` : null;
if (!base || (!inviteCode && !existing)) {
  console.error('Gebruik: node scripts/smoke.mjs <basis-url> <platformuitnodigingscode>');
  process.exit(2);
}
const suffix = Math.random().toString(36).slice(2, 7);
let step = 0;
const log = (msg) => console.log(`${String(++step).padStart(2, '0')}. ${msg}`);

async function api(method, path, { token, body, idem } = {}) {
  const headers = {};
  if (basic) {
    headers.Authorization = basic;
    if (token) headers.Cookie = `rank11_session=${token}`;
    headers.Origin = new URL(base).origin;
  } else if (token) headers.Authorization = `Bearer ${token}`;
  if (idem) headers['Idempotency-Key'] = idem;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text}`);
  return data;
}

const a = existing ? await api('POST', '/api/auth/login', { body: { username: process.env.SMOKE_USER_A, password: process.env.SMOKE_PASSWORD_A, cookie: true } }) : await api('POST', '/api/auth/register', { body: { username: `smoke_a_${suffix}`, password: 'smoke-wachtwoord-1', inviteCode } });
log(`account A beschikbaar (${a.user.username})`);
const pool = await api('POST', '/api/pools', { token: a.token, body: { name: `Smoke ${suffix}` } });
const invite = await api('POST', `/api/pools/${pool.pool.id}/invites`, { token: a.token, body: { maxUses: 1 } });
log('pool + uitnodiging aangemaakt');
const b = existing ? await api('POST', '/api/auth/login', { body: { username: process.env.SMOKE_USER_B, password: process.env.SMOKE_PASSWORD_B, cookie: true } }) : await api('POST', '/api/auth/register', { body: { username: `smoke_b_${suffix}`, password: 'smoke-wachtwoord-2', inviteCode: invite.invite.code } });
if (existing) await api('POST', '/api/pools/join', { token: b.token, body: { code: invite.invite.code } });
log(`account B beschikbaar (${b.user.username})`);
const loginB = await api('POST', '/api/auth/login', { body: { username: b.user.username, password: existing ? process.env.SMOKE_PASSWORD_B : 'smoke-wachtwoord-2', cookie: true } });
log('account B ingelogd (nieuwe sessie)');

await api('POST', '/api/collection/starter', { token: a.token });
await api('POST', '/api/collection/starter', { token: loginB.token });
log('startelftallen uitgereikt');

const ch = await api('POST', `/api/pools/${pool.pool.id}/matches`, { token: a.token, body: { opponentId: b.user.id } });
const acc = await api('POST', `/api/matches/${ch.match.id}/accept`, { token: loginB.token });
log(`uitdaging geaccepteerd; toss: ${acc.battle.state.tossWinner} begint`);

const tokens = { [a.user.id]: a.token, [b.user.id]: loginB.token };
let state = acc.battle.state;

// Pilot gebruikt de asynchrone REST-route van de app. De legacy WebSocket-proef is alleen lokaal.
if (!basic) {
const wsUrl = `${base.replace(/^http/, 'ws')}/api/matches/${ch.match.id}/ws`;
const mover = state.players[state.toMove];
const ws = new WebSocket(wsUrl, { headers: basic ? { Authorization: basic, Cookie: `rank11_session=${tokens[mover]}`, Origin: new URL(base).origin } : { Authorization: `Bearer ${tokens[mover]}` } });
const wsResult = await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('WebSocket: geen antwoord binnen 10 s')), 10_000);
  let synced = false;
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(String(ev.data));
    if (msg.type === 'sync' && !synced) {
      synced = true;
      ws.send(JSON.stringify({ type: 'move', cardId: msg.view.state.available[msg.view.state.toMove][0], requestId: 'smoke' }));
    } else if (msg.type === 'events') {
      clearTimeout(timer);
      resolve(msg);
    } else if (msg.type === 'error') {
      clearTimeout(timer);
      reject(new Error(`WebSocket-fout: ${msg.code} ${msg.message}`));
    }
  });
  ws.addEventListener('error', () => { clearTimeout(timer); reject(new Error('WebSocket-verbinding mislukt')); });
});
ws.close();
log(`zet via WebSocket verwerkt en gebroadcast (fase nu: ${wsResult.view.state.phase})`);
} else {
  log('pilot: volledige battle via REST; WebSocket niet getest');
}

for (let i = 0; i < 30; i++) {
  const view = await api('GET', `/api/matches/${ch.match.id}`, { token: a.token });
  state = view.battle.state;
  if (state.status === 'finished') break;
  const side = state.toMove;
  await api('POST', `/api/matches/${ch.match.id}/moves`, { token: tokens[state.players[side]], body: { cardId: state.available[side][0] } });
}
const final = await api('GET', `/api/matches/${ch.match.id}`, { token: a.token });
log(`wedstrijd afgelopen: ${final.battle.state.result.homeGoals}-${final.battle.state.result.awayGoals} (voortijdig: ${final.battle.state.result.decidedEarly}), D1-status: ${final.match.status}`);
const events = await api('GET', `/api/matches/${ch.match.id}/events`, { token: loginB.token });
log(`eventlog opgehaald (reconnect): ${events.events.length} events`);

const table = await api('GET', `/api/pools/${pool.pool.id}/standings`, { token: a.token });
log(`ranglijst: ${table.standings.map((s) => `${s.username} ${s.points}pt`).join(', ')}`);

const today = new Date().toISOString().slice(0, 10);
const g = await api('POST', '/api/grades', { token: a.token, idem: `smoke-${suffix}-g1`, body: { subjectId: 'wis', testName: 'Smoke', value: 7.5, weight: 1, date: today } });
const g2 = await api('POST', '/api/grades', { token: a.token, idem: `smoke-${suffix}-g1`, body: { subjectId: 'wis', testName: 'Smoke', value: 7.5, weight: 1, date: today } });
const wallet = await api('GET', '/api/wallet', { token: a.token });
log(`cijfer: beloning ${g.reward.status} (${g.reward.coins} coins), herhaling idempotent: ${JSON.stringify(g2) === JSON.stringify(g)}; saldo ${wallet.balances.coins} coins`);
console.log('ROOKTEST GESLAAGD');
