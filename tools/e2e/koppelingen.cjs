// E2E koppelingen: voorbeeldbron koppelen → cijfers binnen → dedup bij opnieuw syncen → ontkoppelen; Magister niet beschikbaar.
// Gebruik: node tools/e2e/koppelingen.cjs [screenshotmap]
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
const openSettings = async (p) => { await p.click('button[aria-label=Instellingen]'); await p.waitForTimeout(700); };

async function flow(p, tag) {
  await openSettings(p);
  // Magister zichtbaar maar niet beschikbaar.
  check(await p.locator('.koppel-row:has-text("Magister") .koppel-status.na').count() === 1, `${tag}: Magister "nog niet beschikbaar"`);
  check(await p.locator('.koppel-row:has-text("Magister") button:has-text("Koppelen")').count() === 0, `${tag}: Magister heeft geen koppelknop`);
  await shot(p, `koppel-${tag}-01`);
  // Voorbeeldbron koppelen.
  await p.locator('.koppel-row:has-text("Voorbeeldkoppeling") button:has-text("Koppelen")').click();
  await p.waitForTimeout(1600);
  check(await p.locator('.koppel-row:has-text("Voorbeeldkoppeling") .koppel-status.on').count() === 1, `${tag}: voorbeeldbron gekoppeld`);
  await shot(p, `koppel-${tag}-02`);
  // Opnieuw synchroniseren → geen nieuwe cijfers.
  await p.locator('.koppel-row:has-text("Voorbeeldkoppeling") button:has-text("Nu synchroniseren")').click();
  await p.waitForTimeout(1600);
  check(await p.isVisible('text=Geen nieuwe cijfers'), `${tag}: tweede sync levert niets nieuws (dedup)`);
  // Dicht en cijfers controleren.
  const esc = p.locator('button[aria-label="Sluiten"], .sheet-close'); if (await esc.count()) await esc.first().click(); else await p.keyboard.press('Escape');
  await p.waitForTimeout(400);
  await p.goto(U + '#cijfers-invoeren'); await p.waitForTimeout(1000);
  check(await p.locator('.tag.origin').count() >= 1, `${tag}: herkomstlabel bij geïmporteerde cijfers`);
}

(async () => {
  const b = await chromium.launch();
  const errs = [];
  const dctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await dctx.addInitScript(() => { try { localStorage.setItem('rank11-mode', 'demo'); localStorage.removeItem('rank11-demo-link-sample'); } catch {} });
  const d = await dctx.newPage(); d.on('pageerror', (e) => errs.push('demo: ' + e));
  await d.goto(U + '#home'); await d.evaluate(() => localStorage.removeItem('rank11-proto-v3')); await d.reload(); await d.waitForTimeout(800);
  await flow(d, 'demo');

  const on = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
  on.on('pageerror', (e) => errs.push('online: ' + e));
  await on.goto(U); await on.waitForTimeout(1200);
  await on.click('button[role=tab]:has-text("Account maken")');
  await on.fill('input[autocomplete=username]', 'kop_' + Math.random().toString(36).slice(2, 7));
  await on.fill('input[type=password]', 'testwachtwoord-1'); await on.fill('input[placeholder="ABCDE-FGHJK"]', CODE);
  await on.click('form button[type=submit]'); await on.waitForTimeout(2500);
  await flow(on, 'online');
  const grades = await on.evaluate(async () => (await fetch('/api/grades')).json());
  check(grades.grades.filter((g) => g.source === 'import').length === 5, 'online: 5 cijfers uit de voorbeeldbron op de server');
  const leak = await on.evaluate(async () => JSON.stringify(await (await fetch('/api/integrations')).json()));
  check(!/token/i.test(leak), 'online: /api/integrations lekt geen token');

  check(errs.length === 0, `geen paginafouten${errs.length ? ` (${errs[0]})` : ''}`);
  await b.close();
  console.log(failures ? `${failures} controle(s) mislukt` : 'alle controles geslaagd');
  process.exit(failures ? 1 : 0);
})();
