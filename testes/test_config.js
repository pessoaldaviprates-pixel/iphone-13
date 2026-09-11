const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  const out = {};

  // 1) config vazio -> jogo offline, sem botão de ranking
  const p1 = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  p1.on('pageerror', e => errs.push('VAZIO: ' + e.message));
  await p1.goto(JOGO + '?nuvem=http://127.0.0.1:8099');
  await p1.waitForTimeout(1000);
  await p1.fill('#new-name', 'Teste'); await p1.tap('#btn-new'); await p1.waitForTimeout(700);
  out.semConfig = await p1.evaluate(() => ({
    url: NUVEM_URL, ativa: nuvemAtiva(),
    botaoRanking: getComputedStyle(document.getElementById('btn-rank')).display
  }));
  await p1.close();

  // 2) config preenchido -> modo online liga
  
    'window.NN_CONFIG = { NUVEM_URL: "http://127.0.0.1:8099" };');
  const p2 = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  p2.on('pageerror', e => errs.push('CONFIG: ' + e.message));
  await p2.goto(JOGO + '?nuvem=http://127.0.0.1:8099');
  await p2.waitForTimeout(1000);
  await p2.fill('#new-name', 'ComNuvem'); await p2.tap('#btn-new'); await p2.waitForTimeout(1600);
  out.comConfig = await p2.evaluate(() => ({
    url: NUVEM_URL, ativa: nuvemAtiva(),
    botaoRanking: getComputedStyle(document.getElementById('btn-rank')).display
  }));
  await p2.tap('#btn-rank'); await p2.waitForTimeout(1600);
  out.rankingCarregou = await p2.evaluate(() =>
    Array.from(document.querySelectorAll('.rank-nome')).map(e => e.textContent.trim()));
  await p2.close();
  

  // 3) artifact de arquivo único: sem config.js, sem erro
  const p3 = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  p3.on('pageerror', e => errs.push('ARTIFACT: ' + e.message));
  const falhas = [];
  p3.on('requestfailed', r => falhas.push(r.url()));
  await p3.goto('file://' + process.cwd() + '/neon-nebula-artifact.html');
  await p3.waitForTimeout(1500);
  out.artifact = await p3.evaluate(() => ({
    pilotos: Object.keys(ROOT.profiles), ativa: nuvemAtiva(),
    temTagConfig: !!document.querySelector('script[src="config.js"]')
  }));
  out.pedidosFalhos = falhas.filter(u => u.indexOf('config.js') >= 0);
  await p3.close();

  console.log(JSON.stringify({ out, errs }, null, 2));
  await b.close();
  process.exit(errs.length ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
