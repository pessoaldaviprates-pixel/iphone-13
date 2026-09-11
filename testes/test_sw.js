const { chromium } = require('playwright');
const fs = require('fs');
const BASE = 'http://127.0.0.1:8100/';
const IDX = '/home/user/iphone-13/index.html';
const SW = '/home/user/iphone-13/sw.js';

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  const out = {};

  // 1) primeira visita
  await p.goto(BASE);
  await p.waitForTimeout(3000);
  out.versaoInicial = await p.evaluate(() => document.getElementById('versao').textContent);
  out.sw = await p.evaluate(async () => {
    const r = await navigator.serviceWorker.getRegistration();
    return {
      registrado: !!r,
      controlando: !!navigator.serviceWorker.controller,
      estado: r && r.active ? r.active.state : null
    };
  });
  out.cacheado = await p.evaluate(async () => {
    const nomes = await caches.keys();
    if (!nomes.length) return { caches: [], itens: 0 };
    const c = await caches.open(nomes[0]);
    const ks = await c.keys();
    return { caches: nomes, itens: ks.length, exemplos: ks.slice(0, 3).map(k => k.url.split('/').pop() || '/') };
  });

  // 2) publico uma versão nova (index + sw)
  const origIdx = fs.readFileSync(IDX, 'utf8');
  const origSw = fs.readFileSync(SW, 'utf8');
  fs.writeFileSync(IDX, origIdx.replace('const VERSAO = "1.6"', 'const VERSAO = "9.9-TESTE"'));
  fs.writeFileSync(SW, origSw.replace('neon-nebula-v6', 'neon-nebula-v7'));

  await p.reload();
  await p.waitForTimeout(5000);
  try {
    await p.waitForSelector('#versao', { timeout: 10000 });
    out.aposAtualizar = await p.evaluate(() => document.getElementById('versao').textContent);
  } catch (e) { out.aposAtualizar = 'ERRO: ' + e.message.split('\n')[0]; }
  out.cacheDepois = await p.evaluate(async () => (await caches.keys()));

  // 3) offline com a versão nova já em cache
  let offline;
  try {
    await ctx.setOffline(true);
    await p.reload({ timeout: 15000 });
    await p.waitForTimeout(1500);
    await p.waitForSelector('#versao', { timeout: 10000 });
    offline = await p.evaluate(() => ({
      carregou: !!document.getElementById('screen-login'),
      versao: document.getElementById('versao').textContent
    }));
  } catch (e) {
    offline = { erro: e.message.split('\n')[0] };
  }
  await ctx.setOffline(false);
  out.offline = offline;

  fs.writeFileSync(IDX, origIdx);
  fs.writeFileSync(SW, origSw);

  console.log(JSON.stringify({ out, errs }, null, 2));
  await b.close();
})().catch(e => {
  try {
    const fs2 = require('fs');
    console.error('FATAL', e.message.split('\n')[0]);
  } catch (x) {}
  process.exit(2);
});
