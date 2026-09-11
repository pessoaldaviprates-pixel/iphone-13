const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => {
    window.claude = { use: async n => n === 'artifact' ? { publish: async h => { window.__pub = h; } } : null };
    try { localStorage.clear(); indexedDB.deleteDatabase('neon-nebula-db'); } catch (e) {}
  });
  await p.goto('file://' + process.cwd() + '/neon-nebula-artifact.html');
  await p.waitForTimeout(1600);
  const r = {};
  r.pilotos = await p.evaluate(() => Object.keys(ROOT.profiles));
  r.adm = await p.evaluate(() => {
    const x = ROOT.profiles['Adm'];
    return { cristais: x.crystals, naves: x.ships.length, amuletos: x.amulets.length };
  });
  // o painel novo funciona nessa versão?
  await p.tap('#btn-goto-adm'); await p.waitForTimeout(300);
  await p.fill('#adm-nick','Cr1cket'); await p.fill('#adm-pass', 'neonadmin'); await p.tap('#btn-adm-enter'); await p.waitForTimeout(400);
  r.painelAbriu = await p.evaluate(() => document.getElementById('adm-panel').style.display === 'block');
  await p.evaluate(() => admSelect('Adm')); await p.waitForTimeout(300);
  await p.fill('#adm-gem-val', '250000'); await p.tap('#adm-gem-add'); await p.waitForTimeout(300);
  r.aposDar = await p.evaluate(() => ROOT.profiles['Adm'].crystals);
  console.log(JSON.stringify(r, null, 2), 'erros:', errs.length ? errs : 'nenhum');
  await b.close();
  process.exit(errs.length ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
