// E2E ronde 15 tegen de lokale online-stack (node tools/dev-online.mjs + VITE_ONLINE_ONLY=1 npx vite).
// Gebruik: node tools/e2e/ronde15.cjs [screenshotmap]
// Controleert: publieke startpagina (besloten, geen foto's), uitnodigingslink → registratie met ingevulde code
// en opgeschoonde URL, registratie zonder geldige code faalt, collectie met echte spelers (shirtportret, club,
// rugnummer, geen fictieve club/AI-gezicht), cijferladder (7,5 → Goudpack), pack openen + walkout, kaartdetail
// met bronvermelding, geen horizontale overloop op 390/360 px, geen consolefouten.
const { chromium } = require('playwright');
const { readFileSync, mkdirSync } = require('node:fs');
const path = require('node:path');

const U = process.env.RANK11_URL || 'http://127.0.0.1:5173/';
const OUT = process.argv[2] || path.join(__dirname, '../../docs/review/v15');
const CODE = readFileSync(path.join(__dirname, '../../apps/api/.wrangler/dev-invite.txt'), 'utf8').trim();
mkdirSync(OUT, { recursive: true });
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? '✓' : '✗'} ${msg}`); if (!ok) failures++; };
const shot = (p, name) => p.screenshot({ path: path.join(OUT, `${name}.jpg`), type: 'jpeg', quality: 80 });
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  p.on('console', (m) => { if (m.type() === 'error' && !/portrait|Failed to load resource/.test(m.text())) { errors.push(m.text()); if (process.env.DEBUG) console.log('CONSOLE', m.text().slice(0, 1500)); } });

  // 1. Publieke startpagina
  await p.goto(U); await p.waitForTimeout(1500);
  check(await p.locator('text=Ik heb een uitnodiging').count() === 1, 'startpagina: knop "Ik heb een uitnodiging" (besloten)');
  check(await p.locator('.landing .pc-commons').count() === 0, 'startpagina: geen spelersfoto’s publiek');
  check(await p.locator('.landing .pc-kit').count() >= 3, 'startpagina: voorbeeldkaarten met shirtportret');
  check(await overflow(p) <= 0, 'startpagina: geen horizontale overloop op 390 px');
  await shot(p, '01-startpagina');

  // 2. Zonder geldige code geen account
  await p.click('text=Ik heb een uitnodiging'); await p.waitForTimeout(600);
  await p.fill('input[autocomplete=username]', 'Proef15x'); await p.fill('input[type=password]', 'testwachtwoord-15');
  await p.click('button[role=radio]:has-text("Nee")');
  await p.fill('input[placeholder="ABCDE-FGHJK"]', 'ABCDE-FGHJK');
  await p.click('form button[type=submit]'); await p.waitForTimeout(1200);
  check(await p.locator('.form-error').count() === 1, 'registratie met verzonnen code geweigerd');

  // 3. Uitnodigingslink vult de code in en verdwijnt uit de adresbalk
  await p.goto(`${U}?uitnodiging=${encodeURIComponent(CODE)}`); await p.waitForTimeout(1500);
  check(!p.url().includes('uitnodiging='), 'uitnodigingslink: code uit de adresbalk gehaald');
  check((await p.inputValue('input[placeholder="ABCDE-FGHJK"]')) === CODE, 'uitnodigingslink: code ingevuld op het registratiescherm');
  await shot(p, '02-uitnodiging');
  const name = `Speler${Date.now() % 100000}`;
  await p.fill('input[autocomplete=username]', name); await p.fill('input[type=password]', 'testwachtwoord-15');
  await p.click('button[role=radio]:has-text("Nee")');
  await p.click('form button[type=submit]'); await p.waitForTimeout(2500);
  check(await p.locator('.auth').count() === 0, 'registratie met uitnodiging gelukt (16+)');

  // 4. Collectie: echte spelers
  await p.goto(U + '#club-collectie'); await p.waitForTimeout(1800);
  const cards = p.locator('button.pc-wrap:visible');
  check(await cards.count() >= 11, `collectie toont het startelftal (${await cards.count()} kaarten)`);
  const html = await p.content();
  check(!/Havenstad|Atlético Brisa|Sporting Lumen/.test(html), 'geen fictieve clubs meer zichtbaar');
  check(await p.locator('.pc-kit, .pc-commons').count() >= 11, 'kaarten tonen shirtportret of licentiefoto');
  check(await overflow(p) <= 0, 'collectie: geen overloop op 390 px');
  await shot(p, '03-collectie');
  await cards.first().click(); await p.waitForTimeout(900);
  const detail = await p.locator('.cd-credit').innerText().catch(() => '');
  check(/Wikidata|Wikimedia/.test(detail), 'kaartdetail: bronvermelding aanwezig');
  check(!/fictieve speler/.test(detail), 'kaartdetail: geen AI-tekst bij echte speler');
  await shot(p, '04-kaartdetail');
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);

  // 5. Cijfer 7,5 → Goudpack (cijferladder) via de API van deze sessie
  const res = await p.evaluate(async () => {
    const r = await fetch('/api/grades', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `e2e-${Date.now()}` }, credentials: 'include', body: JSON.stringify({ subjectId: 'wiskunde', testName: 'E2E 7,5', value: 7.5, weight: 1, date: new Date().toISOString().slice(0, 10) }) });
    return r.json();
  });
  check(res.reward && res.reward.packId === 'gold' && res.reward.tierId === 'gold', `7,5 levert een Goudpack (tier ${res.reward && res.reward.tierId})`);
  const r2 = await p.evaluate(async () => {
    const r = await fetch('/api/grades', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `e2e2-${Date.now()}` }, credentials: 'include', body: JSON.stringify({ subjectId: 'engels', testName: 'E2E 6,2', value: 6.2, weight: 1, date: new Date().toISOString().slice(0, 10) }) });
    return r.json();
  });
  check(r2.reward && r2.reward.packId === 'silver', `6,2 levert een Zilverpack (${r2.reward && r2.reward.packId})`);

  // 6. Pack openen met walkout
  await p.goto(U + '#club-packs'); await p.reload(); await p.waitForTimeout(2200);
  await shot(p, '05-packs');
  const openBtn = p.locator('button:has-text("Openen")').first();
  if (await openBtn.count()) {
    await openBtn.click(); await p.waitForTimeout(800);
    for (let i = 0; i < 12; i++) { await p.mouse.click(195, 420); await p.waitForTimeout(450); }
    await shot(p, '06-pack-open');
    check(!/Havenstad/.test(await p.content()), 'walkout/pack: geen fictieve club');
  } else check(false, 'pack-knop gevonden');

  // 7. Smalle telefoon
  await p.setViewportSize({ width: 360, height: 740 });
  await p.goto(U + '#club-collectie'); await p.waitForTimeout(1400);
  check(await overflow(p) <= 0, 'collectie: geen overloop op 360 px');
  await shot(p, '07-collectie-360');

  check(errors.length === 0, `geen consolefouten${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
  await b.close();
  console.log(failures ? `\n${failures} controle(s) mislukt` : '\nAlle controles geslaagd');
  process.exit(failures ? 1 : 0);
})();
