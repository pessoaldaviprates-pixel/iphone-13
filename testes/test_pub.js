const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    window.__published = null;
    window.claude = { use: async (n) => n === 'artifact' ? { publish: async (h) => { window.__published = h; } } : null };
    // simula outro aparelho: sem save local
    try { localStorage.clear(); indexedDB.deleteDatabase('neon-nebula-db'); } catch (e) {}
  });
  await page.goto('file://' + process.cwd() + '/published.html');
  await page.waitForTimeout(1500);
  const adopted = await page.evaluate(() => ({ crystals: save.crystals, best: save.best, fromCloud: save.savedAt > 0 }));
  // salva de novo (segunda geração do quine)
  await page.evaluate(() => { save.crystals = 1234; persist(); });
  await page.tap('#cloud-btn');
  await page.waitForTimeout(800);
  const pub2 = await page.evaluate(() => window.__published);
  const gen2 = {
    published: !!pub2,
    hasSave: pub2 ? pub2.includes('"crystals":1234') : false,
    sameSize: pub2 ? Math.abs(pub2.length - require('fs').statSync('published.html').size) < 200 : false
  };
  console.log(JSON.stringify({ adopted, gen2, errors }, null, 2));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
