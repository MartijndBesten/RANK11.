// E2E Academy-oefenmodule, in de demo en tegen de lokale online-stack. Alleen synthetische testaccounts.
// Gebruik: node tools/e2e/academy.cjs [screenshotmap]   (vereist: node tools/dev-online.mjs + npm run dev)
// Controleert: oefening doorlopen, resultaat met XP, voortgang per onderwerp (online via /api/academy),
// en dat de server de antwoorden niet meestuurt naar de app.
const { chromium } = require('playwright');
const { readFileSync, mkdirSync } = require('node:fs');
const path = require('node:path');

const U = process.env.RANK11_URL || 'http://localhost:5173/';
const OUT = process.argv[2] || path.join(__dirname, '../../docs/review/v4');
const CODE = readFileSync(path.join(__dirname, '../../apps/api/.wrangler/dev-invite.txt'), 'utf8').trim();
mkdirSync(OUT, { recursive: true });
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? '✓' : '✗'} ${msg}`); if (!ok) failures++; };
const shot = (p, name, full = false) => p.screenshot({ path: path.join(OUT, `${name}.jpg`), type: 'jpeg', quality: 78, fullPage: full });

async function practise(p, tag) {
  await p.goto(U + '#academy'); await p.waitForTimeout(1500);
  await shot(p, `academy-${tag}-01-overzicht`);
  await p.goto(U + '#academy-oefenen'); await p.waitForTimeout(1000);
  await p.click('.acad-bank:has-text("Frans")'); await p.waitForTimeout(1000);
  let shotTaken = false;
  for (let i = 0; i < 10; i++) {
    if (await p.isVisible('.acad-result')) break;
    const opts = p.locator('.quiz-option');
    if (await opts.count()) await opts.nth(i % 2).click();
    else { const inp = p.locator('.quiz-card input'); if (await inp.count()) await inp.fill('3'); }
    if (!shotTaken) { await shot(p, `academy-${tag}-02-vraag`); shotTaken = true; }
    await p.click('.quiz-card button[type=submit]'); await p.waitForTimeout(500);
  }
  await p.waitForTimeout(800);
  const visible = await p.isVisible('.acad-result');
  check(visible, `${tag}: oefening afgerond, resultaat zichtbaar`);
  if (visible) await shot(p, `academy-${tag}-03-resultaat`, true);
  return visible ? (await p.textContent('.acad-result')).replace(/\s+/g, ' ') : '';
}

(async () => {
  const b = await chromium.launch();
  const errs = [];

  const demo = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
  demo.on('pageerror', (e) => errs.push('demo: ' + e));
  await demo.goto(U); await demo.waitForTimeout(1200);
  await demo.click('text=Demo zonder account'); await demo.waitForTimeout(800);
  const dRes = await practise(demo, 'demo');
  check(/Academy XP/.test(dRes), 'demo: XP-overzicht in het resultaat');

  const on = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
  on.on('pageerror', (e) => errs.push('online: ' + e));
  await on.goto(U); await on.waitForTimeout(1200);
  await on.click('button[role=tab]:has-text("Account maken")');
  await on.fill('input[autocomplete=username]', 'acad_' + Math.random().toString(36).slice(2, 7));
  await on.fill('input[type=password]', 'testwachtwoord-1'); await on.fill('input[placeholder="ABCDE-FGHJK"]', CODE);
  await on.click('form button[type=submit]'); await on.waitForTimeout(2500);

  // De sessie die de app ophaalt, bevat geen antwoorden.
  const leak = await on.evaluate(async () => {
    const r = await fetch('/api/academy/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': 'e2e-' + Date.now() }, body: JSON.stringify({ subjectId: 'fa' }) });
    return JSON.stringify(await r.json());
  });
  check(!/"(answer|answers|correct|accepted)"\s*:/.test(leak), 'online: oefensessie bevat geen antwoorden');

  const oRes = await practise(on, 'online');
  check(/Academy XP/.test(oRes), 'online: XP-overzicht in het resultaat (server)');
  const acad = await on.evaluate(async () => (await fetch('/api/academy')).json());
  const attempts = JSON.stringify(acad.progress ?? {});
  check(acad.xp && typeof acad.xp.total === 'number', `online: XP-totaal van de server (${acad.xp?.total})`);
  check(attempts.length > 2 && attempts !== '{}' && attempts !== '[]', 'online: voortgang per onderwerp bewaard op de server');
  await on.reload(); await on.waitForTimeout(1500);
  await on.goto(U + '#academy'); await on.waitForTimeout(1200);
  await shot(on, 'academy-online-04-na-herladen');

  check(errs.length === 0, `geen paginafouten${errs.length ? ` (${errs[0]})` : ''}`);
  await b.close();
  console.log(failures ? `${failures} controle(s) mislukt` : 'alle controles geslaagd');
  process.exit(failures ? 1 : 0);
})();
