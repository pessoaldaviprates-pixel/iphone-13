/* =====================================================================
   OS CANAIS SÃO DO DONO

   O pedido: "As permissões para editar os canais etc é só para o
   cr1cket e o Cr1cket."

   Duas metades, e o teste cobra as duas — porque só a primeira é fácil:

     1. O DONO MANDA. O ⚙ aparece para ele, o painel abre, e o que ele
        muda (nome, aviso fixado, tranca, modo devagar) chega em quem
        está do outro lado.

     2. QUEM NÃO É DONO OBEDECE. O ⚙ não aparece, o painel recusa, e o
        canal trancado realmente barra a mensagem. Testar só a metade de
        cima é testar que o botão existe, não que ele manda.

   E "Cr1cket" com maiúscula é a mesma pessoa que "cr1cket" — estava
   escrito no pedido e está testado aqui embaixo.

   O QUE ESTE TESTE NÃO PROVA, e nenhum teste daqui provaria: isto tudo
   roda no navegador de quem joga. Quem abrir o console e chamar a
   função na mão passa por cima. A tranca de verdade são as regras do
   Firebase (ITCH.md). O teste cobre o que é nosso: a tela e a decisão.
   ===================================================================== */
const path = require('path');
const { chromium } = require('playwright');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const URL = JOGO + '?nuvem=http://127.0.0.1:8099';

let etapa = 'inicio';
const passo = n => { etapa = n; if (process.env.VERBOSO) console.log('  .. ' + n); };
const RELOGIO = setTimeout(() => {
  console.log('FALHOU: o teste travou em "' + etapa + '"');
  process.exit(1);
}, 90000);

async function piloto(ctx, nome) {
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.waitForTimeout(1300);
  await p.evaluate(() => {
    const el = document.getElementById('abertura');
    if (el) { el.className = ''; el.innerHTML = ''; }
  });
  await p.evaluate(n => {
    ROOT.profiles[n] = defaultSave(); ROOT.current = n; save = ROOT.profiles[n];
    save.__name = n; save.best = 40; save.crystals = 500; save.tutorialFeito = true;
    calcStats(); persist();
  }, nome);
  await p.evaluate(n => entrarNoMenu(n), nome);
  await p.evaluate(() => idiomaUsar('pt'));
  await p.evaluate(() => nuvemEnviar(true));
  await p.waitForFunction(() => typeof canalSouDono === 'function', null, { timeout: 10000 });
  await p.waitForTimeout(500);
  return p;
}

async function entrarNoGeral(p) {
  await p.evaluate(() => { estacaoAbrir(); });
  await p.waitForTimeout(800);
  await p.evaluate(() => estAbrir({ tipo: 'canal', id: 'geral', nome: 'geral' }));
  await p.waitForTimeout(1000);
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  const problemas = [];
  const erro = m => problemas.push(m);
  /* um navegador por pessoa (ver testes/README.md) */
  const janela = () => b.newContext({ viewport: { width: 420, height: 880 } });

  /* "Cr1cket" com C maiusculo: o pedido dizia os dois, e e o mesmo dono */
  passo('abrindo o dono (Cr1cket, com maiuscula)');
  const dono = await piloto(await janela(), 'Cr1cket');
  passo('abrindo um jogador comum');
  const zeca = await piloto(await janela(), 'Zeca');
  dono.on('pageerror', e => errs.push('dono: ' + e.message.split('\n')[0]));
  zeca.on('pageerror', e => errs.push('Zeca: ' + e.message.split('\n')[0]));

  await dono.evaluate(async () => {
    for (const no of ['conversas', 'amigos']) await nuvemSoltar(no, null, 'DELETE');
  });
  await dono.waitForTimeout(400);
  await dono.evaluate(() => nuvemEnviar(true));
  await zeca.evaluate(() => nuvemEnviar(true));
  await dono.waitForTimeout(500);

  passo('quem e dono');
  const quem = await dono.evaluate(() => ({ eu: canalSouDono(), nick: save.__name }));
  const quemZeca = await zeca.evaluate(() => ({ eu: canalSouDono(), nick: save.__name }));

  passo('o dono entra no #geral');
  await entrarNoGeral(dono);
  const cabDono = await dono.evaluate(() => ({
    temEngrenagem: !!document.querySelector('[data-acao="canal"]')
  }));

  passo('o Zeca entra no #geral');
  await entrarNoGeral(zeca);
  const cabZeca = await zeca.evaluate(() => ({
    temEngrenagem: !!document.querySelector('[data-acao="canal"]')
  }));

  passo('o dono muda o canal');
  const mudou = await dono.evaluate(() => canalGuardar('geral', {
    titulo: 'trocas-gerais', sobre: 'agora com regra',
    fixado: 'Nada de link de fora aqui.', trancado: false, devagar: 0
  }));
  await dono.waitForTimeout(600);
  const noDono = await dono.evaluate(() => ({
    titulo: canalTitulo('geral'),
    fixadoNaTela: !!document.querySelector('.cn-fixado')
  }));

  passo('o Zeca ve a mudanca');
  await zeca.evaluate(() => canalCarregar('geral').then(() => estPintar()));
  await zeca.waitForTimeout(900);
  const noZeca = await zeca.evaluate(() => ({
    titulo: canalTitulo('geral'),
    sobre: canalSobre('geral'),
    fixadoNaTela: !!document.querySelector('.cn-fixado'),
    textoFixado: (document.querySelector('.cn-fixado') || {}).textContent || ''
  }));

  passo('o Zeca tenta mandar no canal');
  const zecaTentou = await zeca.evaluate(async () => {
    const antes = JSON.stringify(canalDe('geral'));
    const ok = await canalGuardar('geral', { titulo: 'canal-do-zeca', fixado: 'eu mando aqui' });
    return { ok, mudouLocal: JSON.stringify(canalDe('geral')) !== antes };
  });
  /* e a nuvem nao pode ter aceitado a mudanca dele */
  await dono.evaluate(() => canalCarregar('geral'));
  await dono.waitForTimeout(600);
  const depoisDaTentativa = await dono.evaluate(() => canalTitulo('geral'));

  passo('trancar o canal');
  await dono.evaluate(() => canalGuardar('geral', { trancado: true }));
  await dono.waitForTimeout(500);
  await zeca.evaluate(() => canalCarregar('geral'));
  await zeca.waitForTimeout(600);
  const trancado = await zeca.evaluate(() => {
    const v = canalPodeFalar({ tipo: 'canal', id: 'geral' });
    return { podeFalar: v.ok, motivo: v.motivo || '' };
  });
  const donoNoTrancado = await dono.evaluate(() =>
    canalPodeFalar({ tipo: 'canal', id: 'geral' }).ok);

  passo('modo devagar');
  await dono.evaluate(() => canalGuardar('geral', { trancado: false, devagar: 60 }));
  await dono.waitForTimeout(500);
  await zeca.evaluate(() => canalCarregar('geral'));
  await zeca.waitForTimeout(600);
  const devagar = await zeca.evaluate(() => {
    const primeira = canalPodeFalar({ tipo: 'canal', id: 'geral' }).ok;
    canalMarcarFala({ tipo: 'canal', id: 'geral' });
    const segunda = canalPodeFalar({ tipo: 'canal', id: 'geral' });
    return { primeira, segunda: segunda.ok, motivo: segunda.motivo || '' };
  });

  passo('quem pode apagar');
  const apagar = await dono.evaluate(() => ({
    donoApagaDeOutro: canalPodeApagar({ k: 'x', de: 'outra-pessoa' }),
    donoApagaAPropria: canalPodeApagar({ k: 'y', de: estEu().id })
  }));
  const apagarZeca = await zeca.evaluate(() => ({
    comumApagaDeOutro: canalPodeApagar({ k: 'x', de: 'outra-pessoa' }),
    comumApagaAPropria: canalPodeApagar({ k: 'y', de: estEu().id })
  }));

  passo('fechando');
  await b.close();
  clearTimeout(RELOGIO);

  if (!quem.eu) erro('"Cr1cket" com C maiusculo NAO foi reconhecido como dono');
  if (quemZeca.eu) erro('um piloto comum foi reconhecido como dono');

  if (!cabDono.temEngrenagem) erro('o dono nao ganhou o botao de canal no cabecalho');
  if (cabZeca.temEngrenagem) erro('o botao de canal apareceu para quem NAO e dono');

  if (!mudou) erro('o dono nao conseguiu salvar o canal');
  if (noDono.titulo !== 'trocas-gerais') erro('o nome novo nao valeu nem para o dono');
  if (!noDono.fixadoNaTela) erro('o aviso fixado nao apareceu na tela do dono');

  if (noZeca.titulo !== 'trocas-gerais')
    erro('a mudanca do dono nao chegou no outro jogador: ' + noZeca.titulo);
  if (!noZeca.fixadoNaTela) erro('o aviso fixado nao apareceu para o outro jogador');
  else if (!/link de fora/.test(noZeca.textoFixado))
    erro('o aviso que apareceu nao e o que o dono escreveu: ' + noZeca.textoFixado);

  if (zecaTentou.ok) erro('um jogador comum CONSEGUIU salvar a configuracao do canal');
  if (zecaTentou.mudouLocal) erro('a tentativa do jogador comum mudou o canal na tela dele');
  if (depoisDaTentativa !== 'trocas-gerais')
    erro('a tentativa do jogador comum chegou na nuvem: ' + depoisDaTentativa);

  if (trancado.podeFalar) erro('canal TRANCADO e o jogador comum ainda pode falar');
  else if (!/trancado/i.test(trancado.motivo))
    erro('o canal trancado barrou sem dizer que estava trancado: ' + trancado.motivo);
  if (!donoNoTrancado) erro('o dono nao consegue falar no canal que ele mesmo trancou');

  if (!devagar.primeira) erro('o modo devagar barrou a PRIMEIRA mensagem');
  if (devagar.segunda) erro('o modo devagar nao barrou a segunda mensagem seguida');
  else if (!/devagar/i.test(devagar.motivo))
    erro('o modo devagar barrou sem explicar: ' + devagar.motivo);

  if (!apagar.donoApagaDeOutro) erro('o dono nao pode apagar mensagem de outra pessoa');
  if (!apagar.donoApagaAPropria) erro('o dono nao pode apagar a propria mensagem');
  if (apagarZeca.comumApagaDeOutro)
    erro('um jogador comum pode apagar mensagem DOS OUTROS');
  if (!apagarZeca.comumApagaAPropria)
    erro('um jogador comum nao pode apagar a PROPRIA mensagem (arrependimento nao e moderacao)');

  if (errs.length) erro('erros de pagina: ' + errs.join(' | '));

  console.log(JSON.stringify({ quem, quemZeca, cabDono, cabZeca, noDono, noZeca,
                               zecaTentou, depoisDaTentativa, trancado, donoNoTrancado,
                               devagar, apagar, apagarZeca }, null, 1));
  if (problemas.length) { console.log('FALHOU: ' + problemas.join('; ')); process.exit(1); }
  console.log('OK: os canais sao do dono, e quem nao e dono obedece');
})().catch(e => { console.log('FATAL em "' + etapa + '": ' + e.message.split('\n')[0]); process.exit(1); });
