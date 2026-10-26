// E2E cijferimport in demo en online. Alleen synthetische testgegevens.
// Gebruik: node tools/e2e/import.cjs [screenshotmap]   (vereist npm run dev + node tools/dev-online.mjs)
const { chromium } = require('playwright');
const { readFileSync, mkdirSync } = require('node:fs');
const path = require('node:path');
const U = process.env.RANK11_URL || 'http://localhost:5173/';
const OUT = process.argv[2] || path.join(__dirname, '../../docs/review/v6');
const CODE = readFileSync(path.join(__dirname, '../../apps/api/.wrangler/dev-invite.txt'), 'utf8').trim();
mkdirSync(OUT, { recursive: true });
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? '✓' : '✗'} ${msg}`); if (!ok) failures++; };
const shot = (p, n) => p.screenshot({ path: path.join(OUT, `${n}.jpg`), type: 'jpeg', quality: 78 });
const BLOCK = 'Wiskunde; 6,8; 2; 13-10-2026; SO H3\nFrans; 7,4; Grammaire; 20-10-2026\nEngels; 8,1; Reading\nDuits; 7,0\nWiskunde; waarde';

async function flow(p, tag) {
  await p.goto(U + '#cijfers-importeren'); await p.waitForTimeout(900);
  await p.fill('.import-text', BLOCK); await p.waitForTimeout(500);
  const okRows = await p.locator(".import-rows li[data-ok='true']").count();
  const badRows = await p.locator(".import-rows li[data-ok='false']").count();
  check(okRows === 3 && badRows === 2, `${tag}: controleoverzicht 3 goed / 2 fout (${okRows}/${badRows})`);
  await shot(p, `import-${tag}-01-overzicht`);
  await p.click('button:has-text("Importeer 3")'); await p.waitForTimeout(1500);
  check(await p.isVisible('text=3 toegevoegd'), `${tag}: 3 toegevoegd`);
  await shot(p, `import-${tag}-02-klaar`);
  // Opnieuw dezelfde import → alle 3 al aanwezig, geen dubbele.
  await p.click('button:has-text("Nog een import")'); await p.waitForTimeout(400);
  await p.fill('.import-text', BLOCK); await p.waitForTimeout(400);
  await p.click('button:has-text("Importeer 3")'); await p.waitForTimeout(1500);
  check(await p.isVisible('text=0 toegevoegd'), `${tag}: tweede keer 0 toegevoegd (dedup)`);
  const tally = (await p.textContent('.import-tally')).replace(/\s+/g, ' ');
  check(/3 al aanwezig/.test(tally), `${tag}: 3 als al aanwezig gemeld`);
}

(async () => {
  const b = await chromium.launch();
  const errs = [];
  const dctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await dctx.addInitScript(() => { try { localStorage.setItem('rank11-mode', 'demo'); } catch {} });
  const d = await dctx.newPage(); d.on('pageerror', (e) => errs.push('demo: ' + e));
  await d.goto(U + '#home'); await d.evaluate(() => localStorage.removeItem('rank11-proto-v3')); await d.reload(); await d.waitForTimeout(800);
  await flow(d, 'demo');

  const on = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
  on.on('pageerror', (e) => errs.push('online: ' + e));
  await on.goto(U); await on.waitForTimeout(1200);
  await on.click('button[role=tab]:has-text("Account maken")');
  await on.fill('input[autocomplete=username]', 'imp_' + Math.random().toString(36).slice(2, 7));
  await on.fill('input[type=password]', 'testwachtwoord-1'); await on.fill('input[placeholder="ABCDE-FGHJK"]', CODE);
  await on.click('form button[type=submit]'); await on.waitForTimeout(2500);
  await flow(on, 'online');
  // Herkomstlabel en geen dubbele cijfers op de server.
  await on.goto(U + '#cijfers-invoeren'); await on.waitForTimeout(1000);
  check(await on.locator('.tag.origin:has-text("uit bestand")').count() >= 1, 'online: label "uit bestand" zichtbaar');
  const grades = await on.evaluate(async () => (await fetch('/api/grades')).json());
  check(grades.grades.filter((g) => g.source === 'import').length === 3, 'online: precies 3 geïmporteerde cijfers op de server');

  check(errs.length === 0, `geen paginafouten${errs.length ? ` (${errs[0]})` : ''}`);
  await b.close();
  console.log(failures ? `${failures} controle(s) mislukt` : 'alle controles geslaagd');
  process.exit(failures ? 1 : 0);
})();
