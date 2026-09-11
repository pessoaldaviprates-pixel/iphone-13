const { chromium } = require('playwright');
const fs = require('fs');
const V = '/home/user/iphone-13/versao.json';
const orig = fs.readFileSync(V, 'utf8');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errs = []; const out = {};
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8100/');
  await p.waitForTimeout(3000);
  out.semAtualizacao = await p.evaluate(() => ({
    versao: VERSAO,
    faixa: document.getElementById('atualiza-box').classList.contains('on')
  }));

  // "publico" uma versão nova
  fs.writeFileSync(V, JSON.stringify({ versao: '9.9', nota: 'teste de atualização' }));
  await p.evaluate(() => checarVersao(false));
  await p.waitForTimeout(1200);
  out.detectou = await p.evaluate(() => ({
    faixa: document.getElementById('atualiza-box').classList.contains('on'),
    texto: document.getElementById('atualiza-txt').textContent
  }));
  await p.screenshot({ path: 'atualiza.png' });

  // o botão limpa o cache e recarrega
  const urlAntes = p.url();
  await p.tap('#atualiza-btn');
  await p.waitForTimeout(3000);
  out.aposAtualizar = {
    urlMudou: p.url() !== urlAntes,
    url: p.url().split('/').pop(),
    caches: await p.evaluate(async () => (await caches.keys()).length),
    carregou: await p.evaluate(() => !!document.getElementById('screen-login'))
  };

  // atualização sozinha, sem tocar em nada
  fs.writeFileSync(V, JSON.stringify({ versao: '9.9', nota: 'auto' }));
  await p.goto('http://127.0.0.1:8100/');
  await p.waitForTimeout(7000);
  out.automatica = { url: p.url().includes('v='), carregou: await p.evaluate(() => !!document.getElementById('screen-login')) };

  fs.writeFileSync(V, orig);
  console.log(JSON.stringify({ out, errs }, null, 1));
  await b.close();
})();
