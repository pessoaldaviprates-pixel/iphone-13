const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  const out = {};
  async function cenario(nome, url, espera) {
      'window.NN_CONFIG = { NUVEM_URL: "' + url + '" };');
    const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    p.on('pageerror', e => errs.push(nome + ': ' + e.message));
    await p.goto(JOGO + '?nuvem=http://127.0.0.1:8099');
    await p.waitForTimeout(900);
    await p.fill('#new-name', 'P' + espera); await p.tap('#btn-new');
    await p.waitForTimeout(2500);
    out[nome] = await p.evaluate(() => {
      const el = document.getElementById('nuvem-status');
      return { texto: el.textContent, classe: el.className,
               visivel: getComputedStyle(el).display, status: nuvemStatus };
    });
    if (nome === 'erro') await p.screenshot({ path: 'nuvem-erro.png' });
    if (nome === 'ok') await p.screenshot({ path: 'nuvem-ok.png' });
    await p.close();
  }
  await cenario('ok', 'http://127.0.0.1:8099', 1);
  await cenario('erro', 'https://endereco-que-nao-existe-xyz123.firebaseio.com', 2);
  console.log(JSON.stringify({ out, errs }, null, 2));
  await b.close();
  process.exit(errs.length ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
