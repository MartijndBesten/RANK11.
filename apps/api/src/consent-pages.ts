/**
 * Door de Worker gerenderde pagina's buiten de app: de goedkeurings- en intrekpagina voor ouders
 * (bereikt via een e-maillink) en een beknopte privacypagina. De ouder klikt bewust op een knop (POST),
 * openen van de link (GET) keurt niets goed. Mobielvriendelijk.
 */
import { sha256Hex } from './crypto.ts';
import type { Env } from './env.ts';

const page = (title: string, body: string) => new Response(
  `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><title>${title} · RANK11.</title>
<style>:root{color-scheme:light dark}*{box-sizing:border-box}body{margin:0;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#eef0f4;color:#13223d;line-height:1.5}
.wrap{max-width:460px;margin:0 auto;padding:24px 16px}
.card{background:#fff;border-radius:18px;box-shadow:0 8px 30px rgba(0,0,0,.08);overflow:hidden}
.hd{background:#0b1f4d;color:#fff;padding:16px 22px;font-weight:800;font-size:20px;letter-spacing:.04em}
.bd{padding:22px}
h1{font-size:19px;margin:0 0 12px}p{margin:0 0 12px}ul{margin:0 0 12px;padding-left:20px}li{margin:4px 0}
.btn{display:block;width:100%;text-align:center;border:0;border-radius:12px;padding:14px;font-size:16px;font-weight:700;cursor:pointer;margin:8px 0;color:#fff}
.ok{background:#1f8a4c}.no{background:#b23b3b}.muted{color:#56607a;font-size:13px}
a{color:#1f6bff}.note{background:#f4f6fb;border-radius:12px;padding:12px;font-size:14px}
@media(prefers-color-scheme:dark){body{background:#0b1220;color:#e7ecf6}.card{background:#131d33}.note{background:#0f1830}.muted{color:#9fb0cf}}
</style></head><body><div class="wrap"><div class="card"><div class="hd">RANK11.</div><div class="bd">${body}</div></div>
<p class="muted" style="text-align:center;margin-top:14px">RANK11. · schoolcijfers blijven privé</p></div></body></html>`,
  { headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' } });

async function lookupField(env: Env, field: 'token_hash' | 'claim_code_hash', hash: string, purpose: string, now: number): Promise<{ username: string } | null> {
  if (!env.DB) return null;
  const row = await env.DB.prepare(
    `SELECT u.username AS username FROM parent_consents pc JOIN users u ON u.id = pc.user_id WHERE pc.${field} = ? AND pc.purpose = ? AND pc.status = 'pending' AND pc.expires_at > ?`)
    .bind(hash, purpose, now).first<{ username: string }>();
  return row ?? null;
}
const lookupToken = (env: Env, token: string | null, purpose: string, now: number) =>
  (!token || token.length < 10 || token.length > 200) ? Promise.resolve(null) : sha256Hex(token).then((h) => lookupField(env, 'token_hash', h, purpose, now));
const lookupClaim = (env: Env, claim: string | null, now: number) =>
  (!claim || claim.length < 4 || claim.length > 40) ? Promise.resolve(null) : sha256Hex(`claim:${claim.toUpperCase().replace(/[^A-Z0-9]/g, '')}`).then((h) => lookupField(env, 'claim_code_hash', h, 'approval', now));

const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]!));

// credKey is 'token' of 'claimCode'; op goedkeuren wordt guardianConfirmed meegestuurd (knop staat pas aan na de vinkbevestiging).
const decideScript = (credKey: string, credVal: string, endpoint: string, approveOnly = false) => `<script>
function go(decision){
  var btns=document.querySelectorAll('button');btns.forEach(function(b){b.disabled=true});
  var body = ${approveOnly ? `{${credKey}:'${credVal}'}` : `{${credKey}:'${credVal}',decision:decision,guardianConfirmed:true}`};
  fetch('${endpoint}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
   .then(function(r){return r.json().then(function(j){return {ok:r.ok,j:j}})})
   .then(function(res){document.getElementById('result').innerHTML = res.ok
     ? '<div class="note">'+(${approveOnly ? "'Je toestemming is ingetrokken.'" : "(decision==='approve'?'Gelukt! Je kind kan nu RANK11 spelen. Je kunt dit venster sluiten.':'Oké, er is geen toestemming gegeven. Je kind kan niet spelen.')"})+'</div>'
     : '<div class="note">'+(res.j&&res.j.error&&res.j.error.message||'Er ging iets mis.')+'</div>';
     document.getElementById('actions').style.display='none';})
   .catch(function(){document.getElementById('result').innerHTML='<div class="note">Er ging iets mis. Probeer het later opnieuw.</div>';btns.forEach(function(b){b.disabled=false})});
}
</script>`;

/** Handelt /ouder/toestemming, /ouder/intrekken en /privacy af. Geeft null voor andere paden. */
export async function servePages(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  const now = Date.now();
  if (request.method !== 'GET') return null;

  if (url.pathname === '/ouder/toestemming') {
    const token = url.searchParams.get('token');
    const claim = url.searchParams.get('claim');
    const found = token ? await lookupToken(env, token, 'approval', now) : await lookupClaim(env, claim, now);
    const credKey = token ? 'token' : 'claimCode';
    const credVal = esc((token ?? claim ?? '').trim());
    if (!found) return page('Toestemming', `<h1>Link of code ongeldig of verlopen</h1><p>Dit werkt niet meer. Vraag je kind om een nieuwe e-mail of een nieuwe koppelcode vanuit RANK11.</p>`);
    return page('Toestemming geven', `
<h1>Toestemming voor RANK11.</h1>
<p>Je kind <b>${esc(found.username)}</b> wil graag RANK11 spelen.</p>
<p>RANK11 is een voetbalspel waarin kinderen hun eigen schoolcijfers invoeren om punten, kaarten en beloningen te verdienen. Ze kunnen tegen vrienden spelen.</p>
<div class="note">Wat we bewaren: de gebruikersnaam, een versleuteld wachtwoord, de zelf-ingevoerde cijfers en spelvoortgang, en jouw e-mailadres voor deze toestemming. <b>Cijfers zijn privé</b> en niet zichtbaar voor andere spelers. Geen reclameprofielen. Opslag in de EU. Je kunt toestemming later intrekken en het account laten verwijderen. <a href="/privacy">Lees de privacyverklaring</a>.</div>
<p style="margin-top:12px"><label><input type="checkbox" id="confirm" onchange="document.getElementById('ok').disabled=!this.checked"> Ik ben de ouder of wettelijk vertegenwoordiger van dit kind en geef toestemming voor het beschreven gebruik van RANK11.</label></p>
<div id="actions">
  <button class="btn ok" id="ok" disabled onclick="go('approve')">Goedkeuren</button>
  <button class="btn no" onclick="go('decline')">Geen toestemming</button>
</div>
<div id="result"></div>
${decideScript(credKey, credVal, '/api/consent/decide')}`);
  }

  if (url.pathname === '/ouder/intrekken') {
    const token = url.searchParams.get('token');
    const found = await lookupToken(env, token, 'revoke', now);
    if (!found) return page('Intrekken', `<h1>Link ongeldig of verlopen</h1><p>Deze link werkt niet meer. Vraag zo nodig een nieuwe intreklink aan.</p>`);
    return page('Toestemming intrekken', `
<h1>Toestemming intrekken</h1>
<p>Je staat op het punt je toestemming voor <b>${esc(found.username)}</b> in te trekken. Daarna kan dit account niet meer spelen en worden de sessies beëindigd.</p>
<div id="actions"><button class="btn no" onclick="go()">Toestemming intrekken</button></div>
<div id="result"></div>
${decideScript('token', esc(token!), '/api/consent/revoke', true)}`);
  }

  if (url.pathname === '/privacy') {
    return page('Privacy', `
<h1>Privacy bij RANK11.</h1>
<p><b>Voor kinderen:</b> je voert je cijfers zelf in. Het is geen officieel cijfersysteem en je school ziet het niet. <b>Andere spelers zien je cijfers nooit</b> — alleen je clubnaam en wedstrijduitslagen. Er zijn geen openbare cijferlijsten en geen reclame.</p>
<p><b>Voor ouders:</b> we bewaren alleen wat nodig is: gebruikersnaam (verzonnen naam mag), versleuteld wachtwoord, zelf-ingevoerde cijfers, spelvoortgang, en bij kinderen onder 16 jouw e-mailadres plus bewijs van toestemming. Geen e-mailadres van het kind, geen geboortedatum, geen school, geen adres. Opslag binnen de EU (Cloudflare). Geen reclameprofielen, geen verkoop van gegevens.</p>
<ul><li>Rechtsgrond: toestemming (AVG art. 6 lid 1a; voor kinderen onder 16 ook art. 8).</li>
<li>Rechten: inzage, correctie en verwijdering; het account kan in de app worden verwijderd.</li>
<li>Toestemming kan later worden ingetrokken via een beveiligde e-maillink.</li>
<li>Niet-goedgekeurde accounts worden na een korte periode opgeruimd.</li></ul>
<p class="muted">Vragen? Neem contact op met de beheerder.</p>`);
  }
  return null;
}
