const fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.addInitScript(() => {
    window.__published = null;
    window.claude = { use: async n => n === 'artifact' ? { publish: async h => { window.__published = h; } } : null };
  });
  await page.goto('file://' + process.cwd() + '/neon-nebula-artifact.html');
  await page.waitForTimeout(1500);
  const visible = await page.evaluate(() => getComputedStyle(document.getElementById('cloud-btn')).display !== 'none');
  // cria piloto com progresso e salva na nuvem
  await page.fill('#new-name', 'Piloto Nuvem');
  await page.tap('#btn-new');
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    save.crystals = 4242; save.best = 17;
    save.amulets.push({ uid: save.amuletSeq++, type: 'capa', rar: 3 });
    ROOT.adminPass = btoa('senha');
    persist();
  });
  await page.tap('#cloud-btn');
  await page.waitForTimeout(1000);
  const pub = await page.evaluate(() => window.__published);
  const res = { visible, published: !!pub };
  if (pub) {
    fs.writeFileSync('published4.html', pub);
    res.hasSave = pub.includes('"crystals":4242') && pub.includes('Piloto Nuvem');
    res.size = pub.length;
  }
  await browser.close();

  // abre a versão publicada num "aparelho limpo"
  const b2 = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p2 = await b2.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  p2.on('pageerror', e => errors.push('PUB PAGEERROR: ' + e.message));
  await p2.addInitScript(() => {
    window.__published = null;
    window.claude = { use: async n => n === 'artifact' ? { publish: async h => { window.__published = h; } } : null };
    try { localStorage.clear(); indexedDB.deleteDatabase('neon-nebula-db'); } catch (e) {}
  });
  await p2.goto('file://' + process.cwd() + '/published4.html');
  await p2.waitForTimeout(1500);
  res.adopted = await p2.evaluate(() => ({
    profiles: Object.keys(ROOT.profiles),
    crystals: ROOT.profiles['Piloto Nuvem'] ? ROOT.profiles['Piloto Nuvem'].crystals : null,
    best: ROOT.profiles['Piloto Nuvem'] ? ROOT.profiles['Piloto Nuvem'].best : null,
    admPass: !!ROOT.adminPass
  }));
  // republica (ponto fixo)
  await p2.evaluate(() => { loginAs('Piloto Nuvem'); save.crystals = 9999; persist(); S.mode='menu'; refreshMenu(); showScreen('menu'); });
  await p2.tap('#cloud-btn');
  await p2.waitForTimeout(1000);
  const pub2 = await p2.evaluate(() => window.__published);
  if (pub2) {
    fs.writeFileSync('published4b.html', pub2);
    const src = f => (fs.readFileSync(f, 'utf8').match(/id="page-src">([A-Za-z0-9+/=]+)/) || [])[1] || '';
    res.fixedPoint = src('published4.html') === src('published4b.html');
    res.hasSave2 = pub2.includes('"crystals":9999');
  }
  await b2.close();
  console.log(JSON.stringify({ res, errors }, null, 2));
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
