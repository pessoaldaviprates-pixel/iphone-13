/* =====================================================================
   O jogo percebe sozinho que saiu versão nova?

   O caso real é este: o celular guardou a página de uma versão antiga e
   o servidor já tem a nova. O servidor deste teste faz exatamente isso —
   no GET normal ele entrega a página VELHA (a que o aparelho teria em
   cache) e no pedido de pedaço ele entrega o rabo da NOVA.

   E o versao.json responde 404 de propósito: assim o que passar no teste
   só pode ter passado pelo caminho novo.
   ===================================================================== */
const path = require('path');
const fs = require('fs');
const http = require('http');
const { chromium } = require('playwright');

const RAIZ = path.join(__dirname, '..');
const NOVO = fs.readFileSync(path.join(RAIZ, 'index.html'));
const VNOVA = (/const VERSAO = "([0-9.]+)"/.exec(NOVO.toString()) || [])[1];
const VELHO = Buffer.from(NOVO.toString().replace(
  'const VERSAO = "' + VNOVA + '"', 'const VERSAO = "6.5"'), 'utf-8');

function servidor(tailDoNovo) {
  return http.createServer((req, res) => {
    const u = req.url.split('?')[0];
    if (u === '/config.js') {
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      return res.end(fs.readFileSync(path.join(RAIZ, 'config.js')));
    }
    /* de propósito: no artifact estes dois não existem */
    if (u === '/versao.json' || u === '/sw.js') { res.writeHead(404); return res.end('nao'); }
    if (u !== '/' && u !== '/index.html') { res.writeHead(404); return res.end('nao'); }

    const corpo = tailDoNovo ? NOVO : VELHO;
    if (req.headers.range) {
      const fonte = tailDoNovo ? NOVO : NOVO;   // o servidor SEMPRE tem a nova
      const pedaco = fonte.slice(Math.max(0, fonte.length - 40000));
      res.writeHead(206, {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Range': 'bytes ' + (fonte.length - pedaco.length) + '-' +
                         (fonte.length - 1) + '/' + fonte.length
      });
      return res.end(pedaco);
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(corpo);
  });
}

const espera = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const out = { versaoNova: VNOVA };
  const errs = [];
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

  /* ---------- 1. página velha no aparelho, nova no servidor ---------- */
  const s1 = servidor(false);
  await new Promise(r => s1.listen(8123, '127.0.0.1', r));
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await p.goto('http://127.0.0.1:8123/?nuvem=http://127.0.0.1:8099');
  await p.waitForTimeout(1200);
  await p.evaluate(() => { const el = document.getElementById('abertura'); if (el) { el.className = ''; el.innerHTML = ''; } });
  out.rodando = await p.evaluate(() => VERSAO);
  out.leuDoServidor = await p.evaluate(() => versaoNoServidor());
  await p.evaluate(() => checarVersao(true));
  await p.waitForTimeout(1200);
  out.atrasado = await p.evaluate(() => ({
    achou: versaoNova && versaoNova.versao,
    portaoAberto: document.getElementById('update-gate').classList.contains('on'),
    texto: (document.getElementById('ug-ver') || {}).textContent
  }));
  await p.screenshot({ path: 'versao-atrasado.png' });
  await p.close();
  await new Promise(r => s1.close(r));

  /* ---------- 2. em dia: não pode aparecer portão nenhum ---------- */
  const s2 = servidor(true);
  await new Promise(r => s2.listen(8124, '127.0.0.1', r));
  const p2 = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  p2.on('pageerror', e => errs.push('PAGEERROR2: ' + e.message));
  await p2.goto('http://127.0.0.1:8124/?nuvem=http://127.0.0.1:8099');
  await p2.waitForTimeout(1200);
  await p2.evaluate(() => { const el = document.getElementById('abertura'); if (el) { el.className = ''; el.innerHTML = ''; } });
  await p2.evaluate(() => checarVersao(true));
  await p2.waitForTimeout(1200);
  out.emDia = await p2.evaluate(() => ({
    rodando: VERSAO,
    achou: versaoNova && versaoNova.versao,
    portaoAberto: document.getElementById('update-gate').classList.contains('on')
  }));
  await p2.close();
  await new Promise(r => s2.close(r));

  await b.close();
  out.errs = errs;

  /* ---------- o que faz o teste passar ou falhar ---------- */
  const problemas = [];
  if (out.rodando !== '6.5') problemas.push('a pagina velha nao carregou como 6.5');
  if (out.leuDoServidor !== VNOVA) problemas.push('nao leu a versao do servidor pelo pedaco');
  if (out.atrasado.achou !== VNOVA) problemas.push('nao percebeu que estava atrasado');
  if (!out.atrasado.portaoAberto) problemas.push('nao abriu o portao de atualizar');
  if (out.emDia.achou) problemas.push('avisou atualizacao estando em dia');
  if (out.emDia.portaoAberto) problemas.push('abriu portao estando em dia');
  if (errs.length) problemas.push('erros de pagina: ' + errs.join(' | '));

  console.log(JSON.stringify(out, null, 1));
  if (problemas.length) { console.log('FALHOU: ' + problemas.join('; ')); process.exit(1); }
  console.log('OK: percebe atraso e fica quieto quando esta em dia');
})().catch(e => { console.log('FATAL ' + e.message.split('\n')[0]); process.exit(1); });
