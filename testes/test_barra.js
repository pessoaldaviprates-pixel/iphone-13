const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = []; const out = {};
  // usa o servidor de teste COM barra no final, como o usuário mandou
    'window.NN_CONFIG = { NUVEM_URL: "http://127.0.0.1:8099/" };');
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  p.on('pageerror', e => errs.push(e.message));
  const urls = [];
  p.on('request', r => { if (r.url().includes('8099')) urls.push(r.method() + ' ' + r.url()); });
  await p.goto(JOGO + '?nuvem=http://127.0.0.1:8099');
  await p.waitForTimeout(900);
  await p.fill('#new-name', 'ComBarra'); await p.tap('#btn-new');
  await p.waitForTimeout(2500);
  out.status = await p.evaluate(() => ({ texto: document.getElementById('nuvem-status').textContent, s: nuvemStatus }));
  out.chamadas = urls.slice(0, 4);
  await p.tap('#btn-rank'); await p.waitForTimeout(1500);
  out.ranking = await p.evaluate(() => Array.from(document.querySelectorAll('.rank-nome')).map(e => e.textContent.trim()));
  await p.close();
  console.log(JSON.stringify({ out, errs }, null, 2));
  await b.close();
  process.exit(errs.length ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
