// Lay-outcontrole: geen horizontale overloop en geen paginafouten op alle schermen en 8 schermmaten.
// Gebruik: node tools/e2e/overflow.cjs [demo|online]   (online vereist node tools/dev-online.mjs; alleen synthetische testaccounts)
const { chromium } = require('playwright');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const U = process.env.RANK11_URL || 'http://localhost:5173/';
const MODE = process.argv[2] === 'online' ? 'online' : 'demo';
const SIZES = [[360, 740], [375, 667], [390, 844], [430, 932], [844, 390], [740, 360], [820, 1180], [1180, 820]];
const SCREENS = ['home', 'club-elftal', 'club-collectie', 'club-packs', 'club-draft', 'competitie', 'competitie-gradeleague', 'competitie-rankleague', 'competitie-pools',
  'cijfers', 'cijfers-vakken', 'cijfers-invoeren', 'cijfers-importeren', 'cijfers-doelen', 'cijfers-watals', 'cijfers-kluis', 'academy', 'academy-oefenen'];
// Bewust horizontaal scrollende stroken.
const SCROLLERS = '[style*="overflow"], .bench-row, .formations, .draft-events, .dp-offers, .filters, .subnav-track, .subject-picker, .lt-scroll, .cl-series, .hub-event-cards';

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext();
  if (MODE === 'demo') await ctx.addInitScript(() => { try { localStorage.setItem('rank11-mode', 'demo'); } catch { /* */ } });
  else {
    const code = readFileSync(path.join(__dirname, '../../apps/api/.wrangler/dev-invite.txt'), 'utf8').trim();
    const p = await ctx.newPage();
    await p.goto(U); await p.waitForTimeout(1200);
    await p.click('button[role=tab]:has-text("Account maken")');
    await p.fill('input[autocomplete=username]', 'lay_' + Math.random().toString(36).slice(2, 7));
    await p.fill('input[type=password]', 'testwachtwoord-1'); await p.fill('input[placeholder="ABCDE-FGHJK"]', code);
    await p.click('form button[type=submit]'); await p.waitForTimeout(2200);
    await p.close();
  }
  let bad = 0;
  for (const [w, h] of SIZES) {
    const p = await ctx.newPage();
    await p.setViewportSize({ width: w, height: h });
    const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    for (const s of SCREENS) {
      await p.goto(`${U}#${s}`, { waitUntil: 'networkidle' }); await p.waitForTimeout(250);
      const r = await p.evaluate((scrollers) => {
        const vw = innerWidth; const main = document.querySelector('.main');
        if (!main) return { missing: true };
        const wide = [...document.querySelectorAll('.main *')].filter((e) => {
          const box = e.getBoundingClientRect();
          return box.right > vw + 1 && getComputedStyle(e).position !== 'fixed' && !e.closest(scrollers);
        }).slice(0, 2).map((e) => e.className.toString().slice(0, 40));
        return { doc: document.scrollingElement.scrollWidth, vw, mainSW: main.scrollWidth, mainCW: main.clientWidth, wide };
      }, SCROLLERS);
      const over = r.missing || r.doc > r.vw || r.mainSW > r.mainCW;
      if (over || errs.length) { bad++; console.log(`${w}x${h} #${s} PROBLEEM`, JSON.stringify(r), errs.splice(0).join(';')); }
    }
    await p.close();
  }
  console.log(`${MODE}: ${SCREENS.length} schermen × ${SIZES.length} maten — ${bad ? `${bad} problemen` : 'geen horizontale overloop, geen paginafouten'}`);
  await b.close();
  process.exit(bad ? 1 : 0);
})();
