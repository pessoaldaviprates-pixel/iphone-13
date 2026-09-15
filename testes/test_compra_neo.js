/* =====================================================================
   COMPRAR NEONEBULA E ELE FUNCIONAR

   A queixa: "quando uma pessoa compra o NeoNebula ele chega, mas não
   funciona".

   Era verdade, e o caminho do bug explica por que ninguém percebeu:

     o pedido montava   presente.compra = { neo: {...} }   (aninhado)
     a entrega copiava  presente.vipDias / passes / naves  (soltos)

   Ou seja, a entregarCompra() copiava campo por campo e nunca olhava
   para dentro de `presente.compra`. O NeoNebula era montado certinho,
   sumia no caminho, e o jogador recebia uma caixa VAZIA. VIP, passe e
   nave funcionavam — porque os três eram campos soltos. Só o NeoNebula
   tinha sido escrito de outro jeito, e foi só ele que quebrou.

   Este teste segue o dinheiro até o fim: pede, entrega, e depois olha se
   a pessoa REALMENTE ganhou o nível — e se ela consegue usar uma coisa
   que só o nível dela abre. "Chegou" não é o mesmo que "funciona", que
   é exatamente o que a queixa dizia.
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
  await p.evaluate(() => nuvemEnviar(true));
  await p.waitForFunction(() => typeof entregarCompra === 'function', null, { timeout: 10000 });
  await p.waitForTimeout(500);
  return p;
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = [];
  const problemas = [];
  const erro = m => problemas.push(m);
  /* um navegador por pessoa: duas paginas no mesmo contexto secam a fila
     de conexoes e o teste pendura (ver testes/README.md) */
  const janela = () => b.newContext({ viewport: { width: 420, height: 880 } });

  passo('abrindo o comprador');
  /* Zeca e um piloto COMUM de proposito: o dono do jogo tem tudo de
     graca (neoDe devolve "ilimitado" para quem esta em DONOS), entao ele
     nao serve para provar que uma compra funciona -- ja funcionaria sem
     comprar nada. Esta armadilha esta no CLAUDE.md. */
  const zeca = await piloto(await janela(), 'Zeca');
  zeca.on('pageerror', e => errs.push('Zeca: ' + e.message.split('\n')[0]));

  const idZeca = await zeca.evaluate(() => nuvemId(save.__name));

  passo('antes de comprar');
  const antes = await zeca.evaluate(() => ({
    nivel: neoNivel(),
    ehPremium: ehPremium(),
    /* uma fonte de Ouro: coisa que SO o nivel abre. E isto que separa
       "chegou" de "funciona". */
    fonteDeOuro: (() => {
      perfilSalvar({ fonte: 'manuscrita' });      // NEO_FONTES, nivel ouro
      return perfilMeu().fonte;
    })()
  }));

  passo('o pedido vira presente e e entregue');
  /* percorre o MESMO caminho do painel: admEntregarPedido monta o
     presente a partir do pedido e chama a entregarCompra. Chamar a
     entregarCompra direto com um objeto montado a mao pularia
     exatamente o pedaco que estava quebrado. */
  const entrega = await zeca.evaluate(async id => {
    const pedido = {
      de: id, nome: 'Zeca',
      item: 'neo_ouro', itemNome: 'NeoNebula Ouro',
      neo: { nivel: 'ouro', dias: 30 }
    };
    /* o admEntregarPedido mexe no painel (botao, lista de pedidos), que
       nao esta montado aqui; o que interessa e o presente que ele monta,
       entao repetimos as duas linhas dele e entregamos. */
    const presente = { cristais: 0 };
    if (String(pedido.item).indexOf('neo_') === 0) {
      const n = pedido.neo || { nivel: String(pedido.item).slice(4), dias: 30 };
      presente.neo = { nivel: n.nivel, dias: n.dias || 30 };
    }
    const ok = await entregarCompra(id, presente, 'NeoNebula Ouro');
    const naNuvem = await nuvemReq('presentes/' + id);
    return { ok, motivo: typeof entregaMotivo !== 'undefined' ? entregaMotivo : '',
             caixa: naNuvem && naNuvem.compra ? naNuvem.compra : null };
  }, idZeca);

  passo('o jogador recebe');
  await zeca.evaluate(() => nuvemVerificarPresentes());
  await zeca.waitForTimeout(1500);

  const depois = await zeca.evaluate(() => {
    const nivel = neoNivel();
    /* agora a fonte de Ouro tem que PEGAR. Se o nivel nao valeu de
       verdade, o perfilSalvar recusa e o campo fica no padrao -- que e
       exatamente a cara de "chegou mas nao funciona". */
    perfilSalvar({ fonte: 'manuscrita' });
    return {
      nivel, ehPremium: ehPremium(),
      fonteDeOuro: perfilMeu().fonte,
      dias: neoDiasQueFaltam(),
      /* e a porta Premium tem que existir para ele */
      temPorta: !!premiumBotaoHTML()
    };
  });

  /* ---- e a caixa vazia? um pedido que nao vira nada tem que RECUSAR,
     em vez de "entregar" um embrulho sem nada dentro ---- */
  passo('caixa vazia e recusada');
  const vazia = await zeca.evaluate(async id => {
    const ok = await entregarCompra(id, { cristais: 0 }, 'nada');
    return { ok, motivo: typeof entregaMotivo !== 'undefined' ? entregaMotivo : '' };
  }, idZeca);

  /* ---- e um campo que a entrega nao conhece tem que RECUSAR e dizer
     o nome dele, em vez de sumir com ele calado ---- */
  passo('campo desconhecido e recusado');
  const estranho = await zeca.evaluate(async id => {
    const ok = await entregarCompra(id, { amuletoNovo: 7 }, 'coisa nova');
    return { ok, motivo: typeof entregaMotivo !== 'undefined' ? entregaMotivo : '' };
  }, idZeca);

  passo('fechando');
  await b.close();
  clearTimeout(RELOGIO);

  if (antes.nivel !== 'nenhum') erro('o Zeca ja comecou com NeoNebula: o teste nao prova nada');
  if (antes.ehPremium) erro('o Zeca ja era premium antes de comprar');
  if (antes.fonteDeOuro === 'manuscrita')
    erro('a fonte de Ouro pegou SEM comprar: a trava do nivel nao esta travando, ' +
         'e entao este teste nao consegue provar que a compra funcionou');

  if (!entrega.ok) erro('a entrega falhou: ' + entrega.motivo);
  if (!entrega.caixa) erro('nao foi escrita caixa nenhuma na nuvem');
  else if (!entrega.caixa.neo)
    erro('A CAIXA FOI PARA A NUVEM SEM O NEONEBULA DENTRO. Era este o bug: ' +
         'o pedido montava certo e a entrega copiava campo por campo, sem o neo. ' +
         'caixa: ' + JSON.stringify(entrega.caixa));
  else if (entrega.caixa.neo.nivel !== 'ouro')
    erro('a caixa foi com o nivel errado: ' + JSON.stringify(entrega.caixa.neo));

  if (depois.nivel !== 'ouro')
    erro('depois de receber, o nivel continua "' + depois.nivel + '" e nao "ouro"');
  if (!depois.ehPremium) erro('depois de comprar, o jogo ainda nao o considera premium');
  if (depois.fonteDeOuro !== 'manuscrita')
    erro('O NEONEBULA CHEGOU E NAO FUNCIONA: a fonte de Ouro continua recusada ' +
         '(ficou "' + depois.fonteDeOuro + '"). E exatamente a queixa.');
  if (!(depois.dias > 0 && depois.dias <= 31))
    erro('os dias restantes vieram estranhos: ' + depois.dias);
  if (!depois.temPorta) erro('quem comprou nao ganhou a porta Premium na Estacao');

  if (vazia.ok) erro('uma caixa VAZIA foi entregue como se fosse compra');
  else if (!/vazia/i.test(vazia.motivo)) erro('a caixa vazia foi recusada sem dizer que estava vazia');

  if (estranho.ok) erro('um presente com campo desconhecido foi "entregue" -- o campo sumiu calado');
  else if (!/amuletoNovo/.test(estranho.motivo))
    erro('a recusa nao disse QUAL campo a entrega nao sabe levar: ' + estranho.motivo);

  if (errs.length) erro('erros de pagina: ' + errs.join(' | '));

  console.log(JSON.stringify({ antes, entrega, depois, vazia, estranho }, null, 1));
  if (problemas.length) { console.log('FALHOU: ' + problemas.join('; ')); process.exit(1); }
  console.log('OK: o NeoNebula comprado chega E funciona, e caixa vazia nao sai');
})().catch(e => { console.log('FATAL em "' + etapa + '": ' + e.message.split('\n')[0]); process.exit(1); });
