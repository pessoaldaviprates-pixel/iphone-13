/* =====================================================================
   A VERSÃO WEB NUNCA PODE PERDER A LOJA DE DINHEIRO

   O app das lojas sai sem a loja por Pix, porque a Apple e o Google
   exigem que compra dentro do app passe pelo pagamento deles. Isso é
   feito por um interruptor (window.NN_EMPACOTADO) que o empacotador
   escreve só na cópia que vira app.

   Se esse interruptor um dia vazar para o que vai ao ar na web — um
   descuido no montar.py, alguém invertendo a condição, o marcador indo
   parar no fonte/ — a loja do dono some e ninguém fica sabendo até
   alguém tentar comprar. Este teste existe para isso não acontecer
   calado: ele serve os arquivos igual ao GitHub Pages e confere que a
   loja está lá, abre, e mostra preço em dinheiro.

   O par deste teste é o test_app.js, que confere exatamente o oposto na
   cópia empacotada. Os dois juntos prendem o interruptor nos dois lados.
   ===================================================================== */
const path = require('path');
const http = require('http');
const fs = require('fs');
const { chromium } = require('playwright');

const RAIZ = path.join(__dirname, '..');
const TIPO = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml'
};

/* serve a raiz do repositório do mesmo jeito que o GitHub Pages serve */
const servidor = http.createServer((req, res) => {
  let u = req.url.split('?')[0];
  if (u === '/') u = '/index.html';
  const f = path.join(RAIZ, u);
  if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    res.writeHead(404); return res.end('nao');
  }
  res.writeHead(200, { 'Content-Type': TIPO[path.extname(f)] || 'text/plain' });
  res.end(fs.readFileSync(f));
});

(async () => {
  await new Promise(r => servidor.listen(8131, '127.0.0.1', r));
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = []; const out = {};
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await p.goto('http://127.0.0.1:8131/?nuvem=http://127.0.0.1:8099');
  await p.waitForTimeout(1600);
  await p.evaluate(() => {
    const el = document.getElementById('abertura'); if (el) { el.className = ''; el.innerHTML = ''; }
    ROOT.profiles['Davi'] = defaultSave(); ROOT.current = 'Davi';
    save = ROOT.profiles['Davi']; save.__name = 'Davi'; save.best = 40;
    save.crystals = 5000; save.tutorialFeito = true;
    calcStats(); persist(); goMenu();
  });
  await p.waitForTimeout(900);
  await p.evaluate(() => idiomaUsar('pt'));
  await p.waitForTimeout(400);

  out.marcadoComoApp = await p.evaluate(() => window.NN_EMPACOTADO === true);
  out.lojaLigada = await p.evaluate(() => lojaDeDinheiroLigada());
  out.portaLoja = await p.evaluate(() => !!document.querySelector('[data-porta="loja"]'));

  /* o jogador toca na porta dourada e a loja abre direto */
  await p.tap('[data-porta="loja"]');
  await p.waitForTimeout(900);
  out.telaLoja = await p.evaluate(() => S.mode);
  out.precos = await p.evaluate(() =>
    [...document.querySelectorAll('.plano-preco')].map(e => e.textContent));
  out.temComoComprar = await p.evaluate(() => !!document.querySelector('.loja-como'));
  out.temReal = out.precos.some(t => /R\$/.test(t));
  await p.screenshot({ path: 'web-loja.png' });

  /* o service worker e o versao.json existem aqui (no artifact não existiam) */
  out.servidor = await p.evaluate(async () => {
    const r = {};
    try { r.versaoJson = (await (await fetch('versao.json?t=' + Date.now())).json()).versao; }
    catch (e) { r.versaoJson = null; }
    try { r.sw = (await fetch('sw.js', { method: 'HEAD' })).ok; } catch (e) { r.sw = false; }
    return r;
  });
  out.rodando = await p.evaluate(() => VERSAO);

  out.errs = errs;
  await b.close();
  servidor.close();

  const problemas = [];
  if (out.marcadoComoApp) problemas.push('o marcador de APP vazou para a versao web');
  if (!out.lojaLigada) problemas.push('a loja de dinheiro esta desligada na web');
  if (!out.portaLoja) problemas.push('a porta LOJA sumiu do menu');
  if (out.telaLoja !== 'loja') problemas.push('a porta LOJA nao abre a loja');
  if (!out.temReal) problemas.push('a loja nao mostra preco em R$');
  if (!out.temComoComprar) problemas.push('sumiu a parte de como pagar (Pix)');
  if (out.servidor.versaoJson !== out.rodando)
    problemas.push('versao.json (' + out.servidor.versaoJson + ') nao bate com o jogo (' + out.rodando + ')');
  if (!out.servidor.sw) problemas.push('o sw.js nao esta sendo servido: jogo nao abre offline');
  if (errs.length) problemas.push('erros de pagina: ' + errs.join(' | '));

  console.log(JSON.stringify(out, null, 1));
  if (problemas.length) { console.log('FALHOU: ' + problemas.join('; ')); process.exit(1); }
  console.log('OK: web com loja, Pix, versao.json e service worker');
})().catch(e => { console.log('FATAL ' + e.message.split('\n')[0]); process.exit(1); });
