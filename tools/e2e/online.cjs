// E2E tegen de lokale online-stack (node tools/dev-online.mjs + npm run dev). Alleen synthetische testaccounts.
// Gebruik: node tools/e2e/online.cjs [screenshotmap]
// Controleert: registreren, cijfers + kluis, doel, pack openen, Academy, herladen/uitloggen/inloggen (persistent),
// isolatie (B ziet niets van A), pool + uitnodiging + asynchrone battle tussen twee accounts, serverranglijst.
const { chromium } = require('playwright');
const { readFileSync, mkdirSync } = require('node:fs');
const path = require('node:path');

const U = process.env.RANK11_URL || 'http://localhost:5173/';
const OUT = process.argv[2] || path.join(__dirname, '../../docs/review/v4');
const CODE = readFileSync(path.join(__dirname, '../../apps/api/.wrangler/dev-invite.txt'), 'utf8').trim();
mkdirSync(OUT, { recursive: true });
const PASS = 'testwachtwoord-1';
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? '✓' : '✗'} ${msg}`); if (!ok) failures++; };
const shot = (p, name) => p.screenshot({ path: path.join(OUT, `${name}.jpg`), type: 'jpeg', quality: 78 });

async function newUser(b, name) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  p.errors = [];
  p.on('pageerror', (e) => p.errors.push(String(e)));
  await p.goto(U); await p.waitForTimeout(1200);
  await p.click('button[role=tab]:has-text("Account maken")');
  await p.fill('input[autocomplete=username]', name); await p.fill('input[type=password]', PASS); await p.fill('input[placeholder="ABCDE-FGHJK"]', CODE);
  await p.click('form button[type=submit]'); await p.waitForTimeout(2200);
  return p;
}
async function go(p, route) { await p.goto(U + '#' + route); await p.waitForTimeout(1300); }
async function enterGrade(p, subject, name, value, date) {
  await go(p, 'cijfers');
  await go(p, 'cijfers-invoeren');
  await p.selectOption('.form select', subject);
  await p.fill('input[placeholder^="Bijv. Toets"]', name);
  await p.fill('.grade-input', value);
  if (date) await p.fill('.form input[type=date]', date);
  await p.click('button:has-text("Opslaan")'); await p.waitForTimeout(1200);
  return p.isVisible('text=Opgeslagen');
}

(async () => {
  const b = await chromium.launch();
  const sfx = Math.random().toString(36).slice(2, 6);
  const nameA = `anna_${sfx}`;
  const a = await newUser(b, nameA);
  check((await a.textContent('.topbar')).includes(`FC ${nameA}`), 'A: account en standaardclub aangemaakt');
  await go(a, 'club-elftal');
  check((await a.locator('.pitch .pc-wrap').count()) === 11, 'A: startelftal van 11 opgesteld');
  check((await a.locator('.bench-row .pc-wrap, .bench .pc-wrap').count()) >= 7, 'A: 7 reserves op de bank');
  await shot(a, 'online-01-elftal');

  // Cijfers: onvoldoende, daarna herstel; doel instellen.
  check(await enterGrade(a, 'fa', 'Vocabulaire H1', '4,8', '2026-10-13'), 'A: onvoldoende ingevoerd');
  await go(a, 'cijfers-doelen');
  await a.fill('input[inputmode=decimal]', '6,0'); await a.selectOption('.form select', 'fa');
  await a.click('button:has-text("Doel opslaan")'); await a.waitForTimeout(1000);
  check(await enterGrade(a, 'fa', 'Grammaire H2', '7,4', '2026-10-20'), 'A: herstelcijfer ingevoerd');
  check(await enterGrade(a, 'en', 'Reading U3', '8,9', '2026-10-21'), 'A: hoog cijfer ingevoerd');
  await go(a, 'cijfers-kluis');
  const items = await a.locator('.sealed').count();
  check(items === 3, `A: 3 beloningen in de kluis (${items})`);
  await shot(a, 'online-02-kluis');
  await a.locator('.sealed-main').nth(1).click(); await a.waitForTimeout(500);
  await a.mouse.move(195, 395); await a.mouse.down(); await a.waitForTimeout(2600); await a.mouse.up();
  for (let i = 0; i < 12; i++) { const s = a.locator('.skip-btn:has-text("Overslaan")'); if (await s.count()) { await s.click(); break; } await a.waitForTimeout(500); }
  await a.waitForTimeout(1500);
  await shot(a, 'online-03-beloning');
  check((await a.locator('.rv-progress .bonus.progress').count()) > 0, 'A: voortgangsbeloning (herstel/doel) zichtbaar bij het herstelcijfer');

  // Pack openen
  await go(a, 'club-packs');
  const packBtn = a.locator('button:has-text("Openen")').first();
  if (await packBtn.count()) {
    await packBtn.click(); await a.waitForTimeout(1500);
    for (let i = 0; i < 10; i++) { const skip = a.locator('.skip-btn'); if (await skip.count()) await skip.first().click().catch(() => {}); await a.waitForTimeout(400); }
  }
  await go(a, 'club-collectie');
  const countText = await a.textContent('.page-head');
  check(/(\d+) kaarten/.test(countText) && Number(countText.match(/(\d+) kaarten/)[1]) > 18, `A: collectie gegroeid na pack (${countText.match(/(\d+) kaarten/)?.[1]})`);

  // Academy
  await go(a, 'academy-oefenen');
  await shot(a, 'online-04-academy');

  // Persistent: herladen, uitloggen, opnieuw inloggen.
  await a.reload(); await a.waitForTimeout(1500);
  await go(a, 'cijfers');
  const kpis = await a.textContent('.kpis');
  check(/3 cijfers|van 3 cijfers/.test(kpis), 'A: 3 cijfers na herladen');
  await a.click('button[aria-label=Instellingen]'); await a.waitForTimeout(400);
  await a.click('button:has-text("Uitloggen")'); await a.waitForTimeout(1200);
  check(await a.isVisible('button[role=tab]:has-text("Inloggen")'), 'A: uitgelogd, terug op het startscherm');
  await a.fill('input[autocomplete=username]', nameA); await a.fill('input[type=password]', PASS);
  await a.click('form button[type=submit]'); await a.waitForTimeout(2000);
  await go(a, 'cijfers');
  check(/van 3 cijfers/.test(await a.textContent('.kpis')), 'A: na opnieuw inloggen staan de cijfers er nog');
  await shot(a, 'online-05-dashboard');

  // B: eigen account, ziet niets van A.
  const bb = await newUser(b, `bram_${sfx}`);
  await go(bb, 'cijfers');
  check(await bb.isVisible('text=Nog geen cijfers'), 'B: geen cijfers van A zichtbaar');
  await go(bb, 'cijfers-kluis');
  check((await bb.locator('.sealed').count()) === 0, 'B: lege kluis');
  const leak = await bb.evaluate(async () => (await fetch('/api/grades')).json());
  check(Array.isArray(leak.grades) && leak.grades.length === 0, 'B: /api/grades geeft alleen eigen (lege) lijst');

  // Pool + uitnodiging + battle
  await go(a, 'competitie-pools');
  await a.fill('input[placeholder="Bijv. Klas 2B"]', `Testklas ${sfx}`); await a.click('button:has-text("Pool maken")'); await a.waitForTimeout(1500);
  await go(a, 'competitie-pools');
  await a.click('button:has-text("Uitnodigen")'); await a.waitForTimeout(1000);
  const poolCode = (await a.textContent('.invite-code')).trim();
  await go(bb, 'competitie-pools');
  await bb.fill('form input[placeholder="ABCDE-FGHJK"]', poolCode); await bb.click('button:has-text("Lid worden")'); await bb.waitForTimeout(1500);
  check((await bb.textContent('.page')).includes(`Testklas ${sfx}`), 'B: lid van de pool via de code');
  await go(a, 'competitie-rankleague');
  await a.click('button:has-text("Uitdagen")'); await a.waitForTimeout(1200);
  await go(bb, 'competitie');
  await shot(bb, 'online-06-uitdaging');
  await bb.click('button:has-text("Accepteren")'); await bb.waitForTimeout(1500);
  await go(a, 'competitie');
  await a.click('button:has-text("Spelen")'); await a.waitForTimeout(1500);
  let shotTaken = false;
  for (let i = 0; i < 80; i++) {
    let moved = false;
    for (const p of [a, bb]) {
      const btn = p.locator('.bh-card:not([disabled])');
      if (await btn.count()) { await btn.nth(Math.floor((await btn.count()) / 2)).click(); moved = true; await p.waitForTimeout(700); if (!shotTaken && i > 3) { await shot(p, 'online-07-battle'); shotTaken = true; } }
    }
    if ((await a.locator('.battle-end').count()) && (await bb.locator('.battle-end').count())) break;
    if (!moved) await a.waitForTimeout(1500);
  }
  const endA = await a.locator('.battle-end h2').textContent().catch(() => null);
  const endB = await bb.locator('.battle-end h2').textContent().catch(() => null);
  check(!!endA && !!endB, `battle afgerond bij beide spelers (A: ${endA}, B: ${endB})`);
  await go(a, 'competitie-rankleague');
  const rows = await a.locator('table.standings tbody tr').count();
  check(rows === 2, 'RANK League (server) toont beide spelers');
  await shot(a, 'online-08-ranglijst');
  await go(a, 'competitie-gradeleague');
  await shot(a, 'online-09-gradeleague');

  for (const [n, p] of [['A', a], ['B', bb]]) check(p.errors.length === 0, `${n}: geen paginafouten${p.errors.length ? ` (${p.errors[0]})` : ''}`);
  await b.close();
  console.log(failures ? `${failures} controle(s) mislukt` : 'alle controles geslaagd');
  process.exit(failures ? 1 : 0);
})();
