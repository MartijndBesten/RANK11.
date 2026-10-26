// E2E speluitleg: eerste keer vanzelf, overslaan, definitief uitzetten, terugroepen via "Hoe werkt dit?",
// onthouden per gebruiker (demo: op het toestel; online: op de server, ook op een ander toestel).
// Gebruik: node tools/e2e/uitleg.cjs   (vereist npm run dev en node tools/dev-online.mjs; alleen synthetische testaccounts)
const { chromium } = require('playwright');
const { readFileSync, mkdirSync } = require('node:fs');
const path = require('node:path');

const U = process.env.RANK11_URL || 'http://localhost:5173/';
const OUT = process.argv[2] || path.join(__dirname, '../../docs/review/v5');
const CODE = readFileSync(path.join(__dirname, '../../apps/api/.wrangler/dev-invite.txt'), 'utf8').trim();
mkdirSync(OUT, { recursive: true });
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? '✓' : '✗'} ${msg}`); if (!ok) failures++; };
const shot = (p, name) => p.screenshot({ path: path.join(OUT, `${name}.jpg`), type: 'jpeg', quality: 78 });
const go = async (p, r) => { await p.goto(U + '#' + r); await p.waitForTimeout(900); };
const card = (p) => p.locator('.help-card');

async function register(b, name) {
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
  await p.goto(U); await p.waitForTimeout(1200);
  await p.click('button[role=tab]:has-text("Account maken")');
  await p.fill('input[autocomplete=username]', name); await p.fill('input[type=password]', 'testwachtwoord-1'); await p.fill('input[placeholder="ABCDE-FGHJK"]', CODE);
  await p.click('form button[type=submit]'); await p.waitForTimeout(2200);
  return p;
}

(async () => {
  const b = await chromium.launch();
  const errs = [];

  // Demo
  const dctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await dctx.addInitScript(() => { try { localStorage.setItem('rank11-mode', 'demo'); } catch { /* */ } });
  const d = await dctx.newPage(); d.on('pageerror', (e) => errs.push('demo: ' + e));
  await d.goto(U + '#home'); await d.evaluate(() => localStorage.removeItem('rank11-proto-v3')); await d.reload(); await d.waitForTimeout(900);
  check(await card(d).count() === 1 && (await card(d).textContent()).includes('Zo werkt RANK11.'), 'demo: startuitleg verschijnt de eerste keer');
  await shot(d, 'uitleg-01-start');
  await card(d).locator('button:has-text("Begrepen")').click(); await d.waitForTimeout(300);
  check(await card(d).count() === 0 && await d.isVisible('.help-q'), 'demo: na "Begrepen" weg, "Hoe werkt dit?" blijft');
  await d.reload(); await d.waitForTimeout(900);
  check(await card(d).count() === 0, 'demo: na herladen niet opnieuw');
  await go(d, 'cijfers-kluis');
  check(await card(d).count() === 1, 'demo: uitleg bij de kluis de eerste keer');
  await shot(d, 'uitleg-02-kluis');
  await card(d).locator('button:has-text("Geen uitleg meer tonen")').click(); await d.waitForTimeout(300);
  await go(d, 'club-packs');
  check(await card(d).count() === 0, 'demo: uitgezet → bij packs niet vanzelf');
  await d.click('.help-q'); await d.waitForTimeout(300);
  check(await card(d).count() === 1 && await card(d).locator('button:has-text("Sluiten")').count() === 1, 'demo: via "Hoe werkt dit?" altijd terug te lezen');
  await shot(d, 'uitleg-03-terugroepen');
  await d.click('button[aria-label=Instellingen]'); await d.waitForTimeout(400);
  check(await d.getAttribute('button.switch[aria-label="Speluitleg"]', 'aria-checked') === 'false', 'demo: schakelaar Speluitleg staat uit');
  await shot(d, 'uitleg-04-instellingen');
  await d.click('button.switch[aria-label="Speluitleg"]'); await d.waitForTimeout(200);
  await d.keyboard.press('Escape'); await d.waitForTimeout(300);
  await go(d, 'club-elftal');
  check(await card(d).count() === 1, 'demo: weer aan → nog niet geziene uitleg (elftal) verschijnt');

  // Online: per gebruiker op de server
  const sfx = Math.random().toString(36).slice(2, 6);
  const a = await register(b, `uitleg_a_${sfx}`); a.on('pageerror', (e) => errs.push('A: ' + e));
  check(await card(a).count() === 1, 'online A: startuitleg de eerste keer');
  await card(a).locator('button:has-text("Begrepen")').click(); await a.waitForTimeout(400);
  await go(a, 'competitie');
  check(await card(a).count() === 1, 'online A: uitleg bij de competitie');
  await card(a).locator('button:has-text("Geen uitleg meer tonen")').click(); await a.waitForTimeout(800);
  // Ander toestel, zelfde account
  const a2 = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await a2.goto(U); await a2.waitForTimeout(1200);
  await a2.fill('input[autocomplete=username]', `uitleg_a_${sfx}`); await a2.fill('input[type=password]', 'testwachtwoord-1');
  await a2.click('form button[type=submit]'); await a2.waitForTimeout(2000);
  check(await card(a2).count() === 0, 'online A, ander toestel: startuitleg niet opnieuw');
  await go(a2, 'academy');
  check(await card(a2).count() === 0 && await a2.isVisible('.help-q'), 'online A, ander toestel: uitleg staat uit (bewaard op de server)');
  const bb = await register(b, `uitleg_b_${sfx}`);
  check(await card(bb).count() === 1, 'online B: eigen instellingen, ziet de startuitleg wel');

  check(errs.length === 0, `geen paginafouten${errs.length ? ` (${errs[0]})` : ''}`);
  await b.close();
  console.log(failures ? `${failures} controle(s) mislukt` : 'alle controles geslaagd');
  process.exit(failures ? 1 : 0);
})();
