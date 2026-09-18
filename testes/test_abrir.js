/* =====================================================================
   O JOGO TEM QUE ABRIR — e, quando não abrir, tem que ter saída

   A queixa: "tive que tirar da tela de início e colocar de novo, porque
   a tela ficava branca e não entrava".

   Duas coisas diferentes, e as duas estão testadas aqui:

   1. O SERVICE WORKER NÃO PODE ENTREGAR RESPOSTA RUIM.
      A linha era `return resp` solta: se a rede respondesse 404, 503 ou
      aquela página de wi-fi de hotel, o service worker entregava ISSO
      para a página. Resposta vazia numa navegação é tela branca. E como
      a estratégia é rede-primeiro, repetia a cada abertura -- a cópia
      boa estava no cache, do lado, e nunca era usada, porque o
      `.catch()` só pega rede que FALHA, não rede que responde errado.

   2. QUANDO NADA ABRIR, TEM QUE HAVER UM BOTÃO.
      O conserto ("BAIXAR TUDO DE NOVO") morava dentro do jogo que não
      abria. Por isso a única saída era apagar o atalho. Agora existe
      uma saída de emergência no <head>, escrita sem depender de nada do
      jogo -- se ela dependesse, morreria junto com o que socorre.

   Isto roda num servidor HTTP de verdade, e não em file://, porque
   service worker não existe em file://. Um teste que não pudesse ligar o
   service worker não testaria nada do que quebrou.
   ===================================================================== */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const RAIZ = path.join(__dirname, '..');
const PORTA = 8123;

let etapa = 'inicio';
const passo = n => { etapa = n; if (process.env.VERBOSO) console.log('  .. ' + n); };
const RELOGIO = setTimeout(() => {
  console.log('FALHOU: o teste travou em "' + etapa + '"');
  process.exit(1);
}, 120000);

/* o servidorzinho tem um interruptor: `quebrado` faz ele responder 503
   com corpo vazio, que é exatamente a forma da tela branca */
let quebrado = false;
const TIPOS = { '.html': 'text/html', '.js': 'application/javascript',
                '.json': 'application/json', '.png': 'image/png',
                '.svg': 'image/svg+xml' };

const servidor = http.createServer((req, res) => {
  const limpo = decodeURIComponent(req.url.split('?')[0]);
  const rel = limpo === '/' ? '/index.html' : limpo;
  if (quebrado) { res.writeHead(503); res.end(); return; }
  const arq = path.join(RAIZ, rel);
  if (!arq.startsWith(RAIZ) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) {
    res.writeHead(404); res.end('nao achei'); return;
  }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(arq)] || 'text/plain',
                       'Service-Worker-Allowed': '/' });
  res.end(fs.readFileSync(arq));
});

const problemas = [];
const erro = m => problemas.push(m);

(async () => {
  await new Promise(r => servidor.listen(PORTA, '127.0.0.1', r));
  const URL = 'http://127.0.0.1:' + PORTA + '/index.html';
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  /* UM contexto só do começo ao fim: o service worker e o cache vivem no
     contexto, e trocar de contexto no meio jogaria fora justamente o que
     este teste quer olhar */
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message.split('\n')[0]));

  passo('1: abrir com a rede boa');
  await p.goto(URL);
  await p.waitForTimeout(3500);
  const primeira = await p.evaluate(() => ({
    tela: (document.querySelector('.screen.show, .page.show') || {}).id || '(nenhuma)',
    socorro: !!document.getElementById('nn-socorro-b'),
    sw: !!(navigator.serviceWorker && navigator.serviceWorker.controller)
  }));

  /* espera o service worker assumir: na PRIMEIRA visita ele instala e só
     controla a página seguinte */
  passo('2: esperar o service worker assumir');
  await p.reload();
  await p.waitForTimeout(3000);
  const comSW = await p.evaluate(() => ({
    tela: (document.querySelector('.screen.show, .page.show') || {}).id || '(nenhuma)',
    sw: !!(navigator.serviceWorker && navigator.serviceWorker.controller)
  }));

  /* ---- 3. A REDE PASSA A RESPONDER MAL ---- */
  passo('3: rede respondendo 503');
  quebrado = true;
  /* A RECARGA PODE MORRER, e morrer É o bug.
     Sem o conserto no sw.js, o 503 vai direto para a navegacao e o
     Playwright estoura com ERR_HTTP_RESPONSE_CODE_FAILURE -- que no
     celular da pessoa e a tela branca. Deixar isso virar um FATAL
     generico esconderia justamente o que o teste veio medir, entao ele
     e apanhado aqui e vira a queixa por extenso, la embaixo. */
  let recargaMorreu = "";
  try { await p.reload(); }
  catch (e) { recargaMorreu = e.message.split('\n')[0]; }
  await p.waitForTimeout(6000);
  const comRedeRuim = await p.evaluate(() => ({
    tela: (document.querySelector('.screen.show, .page.show') || {}).id || '(nenhuma)',
    temCampo: !!document.getElementById('new-name'),
    socorro: !!document.getElementById('nn-socorro-b'),
    corpoVazio: (document.body.textContent || '').trim().length < 20
  }));

  /* ---- 4. A SAÍDA DE EMERGÊNCIA, quando nem o cache salva ---- */
  passo('4: pagina que nao abre de jeito nenhum');
  const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p2 = await ctx2.newPage();
  p2.on('pageerror', () => {});
  /* uma copia do jogo com o miolo quebrado de proposito: e a unica forma
     honesta de ver a saida de emergencia aparecer */
  await p2.route('**/index.html', async rota => {
    const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
    /* SABOTAGEM DE VERDADE: fica o <head> (onde mora o socorro) e o
       corpo do jogo some inteiro. A primeira tentativa so injetava um
       `throw` antes do </head> -- e nao adiantou nada, porque um script
       que estoura NAO impede os seguintes de rodar: o jogo abria normal
       e o teste passava sem ter testado. Isto aqui e a tela branca de
       verdade: a pagina carrega, e nada aparece. */
    const cabeca = html.slice(0, html.indexOf('</head>'));
    await rota.fulfill({ status: 200, contentType: 'text/html',
      body: cabeca +
            '<script>throw new Error("quebrei de proposito")<\/script>' +
            '</head><body></body></html>' });
  });
  await p2.goto(URL);
  await p2.waitForTimeout(7000);
  const quebrada = await p2.evaluate(() => {
    const b = document.getElementById('nn-socorro-b');
    return { socorro: !!b, texto: b ? (b.textContent || '').trim() : '',
             explica: /progresso/i.test(document.body.textContent || ''),
             mostraErro: /quebrei de proposito/.test(document.body.textContent || ''),
             tela: (document.querySelector('.screen.show, .page.show') || {}).id || '(nenhuma)' };
  });

  passo('fechando');
  await b.close();
  servidor.close();
  clearTimeout(RELOGIO);

  if (primeira.tela === '(nenhuma)') erro('o jogo nao abriu nem com a rede boa: ' + primeira.tela);
  if (primeira.socorro) erro('a saida de emergencia apareceu com o jogo funcionando');
  if (!comSW.sw) erro('o service worker nao assumiu depois de recarregar — o teste nao prova nada');
  if (comSW.tela === '(nenhuma)') erro('o jogo parou de abrir depois do service worker assumir');

  /* ESTE É O BUG. Com a rede respondendo 503 e uma copia boa no cache,
     o jogo TEM que abrir. Antes do conserto, a resposta vazia do 503 ia
     direto para a pagina: tela branca. */
  if (recargaMorreu)
    erro('TELA BRANCA: com a rede respondendo 503 a pagina nem carregou (' +
         recargaMorreu + '). O service worker entregou a resposta ruim em vez ' +
         'de usar a copia guardada no cache. Era isto que obrigava a apagar o ' +
         'atalho da tela de inicio e por de novo.');
  if (comRedeRuim.corpoVazio)
    erro('TELA BRANCA: a rede respondeu 503 e o service worker entregou a resposta ' +
         'ruim em vez de usar a copia guardada. Era isto que obrigava a apagar o atalho.');
  if (comRedeRuim.tela === '(nenhuma)')
    erro('com a rede ruim o jogo nao abriu, mesmo tendo copia no cache');
  if (!comRedeRuim.temCampo)
    erro('com a rede ruim a tela de entrada veio sem o campo de nome');

  if (!quebrada.socorro)
    erro('a pagina nao abriu e NAO apareceu saida nenhuma: a unica saida continua ' +
         'sendo apagar o atalho da tela de inicio');
  else {
    if (!/BAIXAR TUDO DE NOVO/i.test(quebrada.texto))
      erro('o botao de socorro nao diz o que faz: "' + quebrada.texto + '"');
    if (!quebrada.explica)
      erro('a tela de socorro nao diz que o progresso nao se perde — e a primeira ' +
           'coisa que a pessoa pensa antes de apertar');
    if (!quebrada.mostraErro)
      erro('a tela de socorro nao mostra o erro: sem ele a pessoa so tem "nao abriu" para contar');
  }

  console.log(JSON.stringify({ primeira, comSW, comRedeRuim, quebrada,
                               errosDePagina: errs.slice(0, 3) }, null, 1));
  if (problemas.length) { console.log('FALHOU: ' + problemas.join('; ')); process.exit(1); }
  console.log('OK: abre com rede ruim, e quando nao abre tem botao de socorro');
})().catch(e => {
  try { servidor.close(); } catch (x) {}
  console.log('FATAL em "' + etapa + '": ' + e.message.split('\n')[0]);
  process.exit(1);
});
