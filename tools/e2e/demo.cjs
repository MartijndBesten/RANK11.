// Regressie van de lokale demo (zonder server-account): cijfer invoeren, validatie, kluis openen, battle tegen de computer.
// Gebruik: node tools/e2e/demo.cjs   (vereist npm run dev)
const { chromium } = require('playwright');

const U = process.env.RANK11_URL || 'http://localhost:5173/';
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? '✓' : '✗'} ${msg}`); if (!ok) failures++; };

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('rank11-mode', 'demo'); } catch { /* */ } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(U + '#home'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(800);
  check(!(await p.isVisible('button[role=tab]:has-text("Inloggen")')), 'demo start zonder inlogscherm');

  await p.goto(U + '#cijfers'); await p.goto(U + '#cijfers-invoeren'); await p.waitForTimeout(500);
  await p.selectOption('.form select', 'bi');
  await p.fill('input[placeholder^="Bijv. Toets"]', 'SO Ecologie'); await p.fill('.grade-input', '8,6');
  await p.click('button:has-text("Opslaan")'); await p.waitForTimeout(400);
  check(await p.isVisible('text=Opgeslagen'), 'cijfer opgeslagen');
  await p.click('text=Nog een invoeren'); await p.selectOption('.form select', 'bi');
  await p.fill('input[placeholder^="Bijv. Toets"]', 'SO  ecologie'); await p.fill('.grade-input', '7');
  await p.click('button:has-text("Opslaan")'); await p.waitForTimeout(300);
  check(await p.locator('.form-error').count() > 0, 'dubbele toets geweigerd');
  await p.fill('input[placeholder^="Bijv. Toets"]', 'Iets anders'); await p.fill('.grade-input', '11');
  await p.click('button:has-text("Opslaan")'); await p.waitForTimeout(300);
  check(await p.locator('.form-error').count() > 0, 'ongeldig cijfer geweigerd');

  await p.goto(U + '#cijfers-kluis'); await p.waitForTimeout(500);
  check(await p.locator('.sealed').count() >= 1, 'beloning in de kluis');
  await p.locator('.sealed-main').last().click(); await p.waitForTimeout(400);
  await p.mouse.move(195, 395); await p.mouse.down(); await p.waitForTimeout(2600); await p.mouse.up();
  for (let i = 0; i < 12; i++) { const s = p.locator('.skip-btn:has-text("Overslaan")'); if (await s.count()) { await s.click(); break; } await p.waitForTimeout(500); }
  await p.waitForTimeout(800);
  check(await p.locator('.reveal, .rv-grade, .reward').count() > 0, 'cijfer onthuld met beloning');

  await p.goto(U + '#competitie-rankleague'); await p.waitForTimeout(600);
  await p.click('button:has-text("Spelen")'); await p.waitForTimeout(600);
  for (let i = 0; i < 60; i++) {
    if (await p.isVisible('.battle-end')) break;
    const btn = p.locator('.bh-card:not([disabled])');
    if (await btn.count()) await btn.nth(Math.floor((await btn.count()) / 2)).click();
    await p.waitForTimeout(1000);
  }
  check(await p.isVisible('.battle-end'), 'battle tegen de computer afgerond');
  await p.click('.battle-end .btn'); await p.waitForTimeout(500);
  check(await p.locator('tr[data-me]').count() === 1, 'eigen rij in de (lokale) ranglijst');

  check(errs.length === 0, `geen paginafouten${errs.length ? ` (${errs[0]})` : ''}`);
  await b.close();
  console.log(failures ? `${failures} controle(s) mislukt` : 'alle controles geslaagd');
  process.exit(failures ? 1 : 0);
})();
