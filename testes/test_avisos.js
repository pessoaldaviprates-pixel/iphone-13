/* =====================================================================
   O QUE A PESSOA ESCOLHE TEM QUE ACONTECER

   Três queixas na mesma frase: "ícone de estado não funciona, efeito de
   clique e toque de aviso não funcionam muito bem, e o Arrumar está
   muito confuso".

   As três tinham a mesma forma de bug, que é a pior de todas: a escolha
   EXISTE, a tela de escolher funciona, o valor é salvo — e nada acontece
   depois. Nenhum erro, nenhuma pista. A pessoa acha que escolheu errado.

     ÍCONE DE ESTADO — só desenhava dentro do cartão de perfil aberto.
     Escolher 🎮 e não ver o 🎮 em lugar nenhum onde o seu nome aparece é
     exatamente "não funciona".

     TOQUE DE AVISO — a única coisa que chamava `toqueTocar()` era a
     prévia da tela de escolha. O som tocava ao ser escolhido e nunca
     mais, inclusive quando chegava mensagem.

     EFEITO DE CLIQUE — era CSS preso ao `:active`, ou seja, só existia
     com o dedo encostado. No celular isso é um piscar que some antes de
     alguém olhar.

   O teste espia o gerador de som e o DOM em vez de confiar na aparência:
   "ouvir" e "ver brilhar" não dá para automatizar, mas "a função de som
   foi chamada" e "a classe entrou no botão" dá.
   ===================================================================== */
const path = require('path');
const { chromium } = require('playwright');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const URL = JOGO + '?nuvem=http://127.0.0.1:8099';

async function piloto(ctx, nome, nivel) {
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.waitForTimeout(1300);
  await p.evaluate(() => {
    const el = document.getElementById('abertura');
    if (el) { el.className = ''; el.innerHTML = ''; }
  });
  await p.evaluate(a => {
    ROOT.profiles[a.n] = defaultSave(); ROOT.current = a.n; save = ROOT.profiles[a.n];
    save.__name = a.n; save.best = 60; save.crystals = 900; save.tutorialFeito = true;
    if (a.nv) save.neo = { nivel: a.nv, ate: Date.now() + 9 * 864e5 };
    calcStats(); persist();
  }, { n: nome, nv: nivel || null });
  await p.evaluate(n => entrarNoMenu(n), nome);
  await p.evaluate(() => idiomaUsar('pt'));
  await p.evaluate(() => nuvemEnviar(true));
  await p.waitForFunction(() => typeof NEO_ESTADOS !== 'undefined', null, { timeout: 10000 });
  await p.waitForTimeout(600);
  return p;
}

/* ONDE TRAVOU. Um teste que fica pendurado para sempre é
   indistinguível de um teste que está pensando -- e a bateria inteira
   para junto. O marcador diz a última etapa que passou, e o relógio
   abaixo derruba tudo em vez de pendurar. */
let etapa = 'inicio';
const passo = n => { etapa = n; if (process.env.VERBOSO) console.log('  .. ' + n); };
const RELOGIO = setTimeout(() => {
  console.log('FALHOU: o teste travou em "' + etapa + '"');
  process.exit(1);
}, 90000);

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
/* UM NAVEGADOR POR PESSOA, e não duas abas no mesmo.
   Duas páginas dentro do mesmo `newContext` dividem a mesma fila de
   conexões. A Estação segura UM fluxo (SSE) aberto por página, e duas
   dessas mais as leituras normais secavam a fila para o endereço do
   Firebase falso: o `estEnviar` ficava esperando um socket que nunca
   vinha, para sempre, e o teste pendurava sem erro nenhum.

   Custou um bom tempo de caça porque o mesmo código funciona sozinho e
   funciona no jogo de verdade -- lá cada pessoa tem o seu navegador,
   que é exatamente o que um contexto separado imita. */
  const janela = () => b.newContext({ viewport: { width: 420, height: 880 } });
  const errs = [];
  const problemas = [];
  const erro = m => problemas.push(m);

  passo('abrindo o Zeca');
  const eu = await piloto(await janela(), 'Zeca', 'ouro');
  passo('abrindo a Bia');
  const outro = await piloto(await janela(), 'Bia', 'ouro');
  eu.on('pageerror', e => errs.push('Zeca: ' + e.message.split('\n')[0]));
  outro.on('pageerror', e => errs.push('Bia: ' + e.message.split('\n')[0]));

  await eu.evaluate(async () => {
    for (const no of ['conversas', 'amigos']) await nuvemSoltar(no, null, 'DELETE');
  });
  await eu.waitForTimeout(400);
  await eu.evaluate(() => nuvemEnviar(true));
  await outro.evaluate(() => nuvemEnviar(true));
  await eu.waitForTimeout(500);

  passo('1: icone de estado');
  /* ---- 1. o ícone de estado aparece FORA do cartão de perfil ---- */
  await eu.evaluate(() => { perfilSalvar({ estadoIc: 'jogo' }); estacaoAbrir(); });
  await eu.waitForTimeout(800);
  await eu.evaluate(() => estAbrir({ tipo: 'canal', id: 'geral', nome: 'geral' }));
  await eu.waitForTimeout(900);
  const estado = await eu.evaluate(() => {
    const meu = document.querySelector('.est-eu, .est-lado');
    return {
      guardado: perfilMeu().estadoIc,
      /* na barra lateral, no cartãozinho do próprio piloto -- que é onde
         o nome da pessoa aparece o tempo todo */
      naBarra: !!(meu && /🎮/.test(meu.textContent || '')),
      comClasseIc: document.querySelectorAll('.est-luz.ic').length
    };
  });

  passo('2: espiando o som');
  /* ---- 2. o toque de aviso toca quando CHEGA mensagem ---- */
  const som = await eu.evaluate(() => {
    perfilSalvar({ toque: 'curto' });
    /* ESPIA A DECISÃO, E NÃO O ALTO-FALANTE.
       A primeira versão espiava AudioSys.tone e falhava sempre: num
       Chromium sem janela não existe AudioContext até alguém CLICAR de
       verdade, então toqueTocar() saía na primeira linha e nenhuma nota
       nascia. Isso não diz nada sobre o jogo -- diz que o teste estava
       medindo a política de autoplay do navegador.
       O que é nosso, e o que quebrou, é a DECISÃO de avisar: o jogo
       chamou o toque quando a mensagem chegou? Isso dá para medir. */
    window.__avisos = [];
    const antes = window.toqueTocar;
    window.toqueTocar = function () {
      window.__avisos.push(Date.now());
      try { return antes.apply(this, arguments); } catch (e) {}
    };
    AudioSys.muted = false;
    return { espiando: typeof antes === 'function', antes: window.__avisos.length };
  });

  /* TRÊS PASSOS, TRÊS CHAMADAS. Juntar abrir a estação, entrar no canal
     e mandar a mensagem num `evaluate` só pendurava o teste para sempre:
     `estacaoAbrir()` dispara leituras que ninguém espera, e o `estEnviar`
     chamado no mesmo instante ficava esperando um destino que ainda não
     tinha terminado de nascer. Com uma pausa entre eles, o mesmo código
     responde na hora -- que é como o dedo de uma pessoa usa o jogo. */
  passo('2b: a Bia abre a estacao');
  await outro.evaluate(() => { estacaoAbrir(); });
  await outro.waitForTimeout(800);
  passo('2b: a Bia entra no canal');
  await outro.evaluate(() => estAbrir({ tipo: 'canal', id: 'geral', nome: 'geral' }));
  await outro.waitForTimeout(800);
  passo('2b: a Bia manda mensagem');
  await outro.evaluate(() => estEnviar('chegou mensagem nova'));
  await eu.waitForTimeout(3000);

  const tocou = await eu.evaluate(() => ({
    notas: (window.__avisos || []).length,
    mensagens: document.querySelectorAll('.est-msg').length
  }));

  /* a minha própria mensagem NÃO pode tocar: seria o jogo respondendo ao
     meu próprio dedo */
  passo('2c: eu mando mensagem');
  const antesDeMim = await eu.evaluate(() => (window.__avisos || []).length);
  await eu.evaluate(() => estEnviar('escrevi eu mesmo'));
  await eu.waitForTimeout(2000);
  const depoisDeMim = await eu.evaluate(a => ({
    antes: a, depois: (window.__avisos || []).length
  }), antesDeMim);

  passo('3: efeito de clique');
  /* ---- 3. o efeito de clique marca o botão, solto do dedo ---- */
  const clique = await eu.evaluate(() => {
    perfilSalvar({ clique: 'onda' });
    const bt = document.querySelector('.est-dest') || document.querySelector('button');
    if (!bt) return { achou: false };
    const r = bt.getBoundingClientRect();
    bt.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2
    }));
    const marcou = bt.classList.contains('clicou');
    /* e a onda tem que nascer onde o dedo encostou, e não sempre no meio */
    const x = bt.style.getPropertyValue('--toque-x');
    return { achou: true, marcou, temPonto: !!x, marca: document.body.getAttribute('data-clique') };
  });

  passo('4: a aba de blocos');
  /* ---- 4. a aba de blocos: UMA lista, com interruptor ---- */
  await eu.evaluate(() => {
    estFecharJanela(); estEditarPerfil(); pfAba = 'ordem'; estPintarEditor();
  });
  await eu.waitForTimeout(600);
  const arrumar = await eu.evaluate(() => {
    const antes = document.querySelectorAll('.pf-ord-l').length;
    const sw = document.querySelector('.pf-ord-sw:not(:disabled)');
    const nome = sw ? sw.getAttribute('data-liga') : '';
    if (sw) sw.click();
    return {
      linhas: antes,
      interruptores: document.querySelectorAll('.pf-ord-sw').length,
      /* a segunda lista ("Guardados") sumiu: era ela que confundia */
      listaDeGuardados: document.querySelectorAll('[data-poe]').length,
      desligou: String(estRascunho.blocos || '').split(',').indexOf(nome) < 0,
      /* e a linha CONTINUA na tela, apagada, no mesmo lugar */
      continuaNaTela: document.querySelectorAll('.pf-ord-l').length === antes,
      apagada: document.querySelectorAll('.pf-ord-l.desligado').length
    };
  });

  passo('fechando');
  await b.close();
  clearTimeout(RELOGIO);

  if (estado.guardado !== 'jogo') erro('o icone de estado nao ficou salvo: ' + estado.guardado);
  if (!estado.naBarra)
    erro('escolhi o icone 🎮 e ele nao aparece na barra lateral, so no cartao de perfil ' +
         '(era exatamente a queixa de "icone de estado nao funciona")');
  if (!estado.comClasseIc) erro('nenhuma luzinha virou icone escolhido');

  if (!som.espiando) erro('nao achei a funcao do toque de aviso para espiar');
  if (!tocou.mensagens) erro('a mensagem da Bia nao chegou: o teste do som nao provou nada');
  else if (!tocou.notas)
    erro('chegou mensagem de outra pessoa e o toque de aviso NAO tocou ' +
         '(so a previa da tela de escolha chamava toqueTocar)');
  if (depoisDeMim.depois > depoisDeMim.antes)
    erro('o toque tocou com a MINHA propria mensagem: o jogo apitando para o proprio dedo');

  if (!clique.achou) erro('nenhum botao para testar o efeito de clique');
  else {
    if (clique.marca !== 'onda') erro('o efeito escolhido nao chegou no body: ' + clique.marca);
    if (!clique.marcou)
      erro('tocar no botao nao marcou ele: o efeito continua preso ao :active, ' +
           'que no celular some antes de alguem ver');
    if (!clique.temPonto) erro('a onda nao sabe onde o dedo encostou: ela nasceria sempre no meio');
  }

  if (!arrumar.linhas) erro('a aba de blocos abriu vazia');
  if (arrumar.interruptores < arrumar.linhas)
    erro('tem linha sem interruptor: ' + arrumar.interruptores + ' para ' + arrumar.linhas);
  if (arrumar.listaDeGuardados)
    erro('a segunda lista ("Guardados") voltou: era ela que fazia o bloco sumir de ' +
         'um lugar e reaparecer noutro com outro nome');
  if (!arrumar.desligou) erro('o interruptor nao desligou o bloco');
  if (!arrumar.continuaNaTela)
    erro('desligar fez a linha sumir da lista: a pessoa perde onde achar de volta');
  if (!arrumar.apagada) erro('o bloco desligado nao ficou apagado, entao nada indica que esta off');

  if (errs.length) erro('erros de pagina: ' + errs.join(' | '));

  console.log(JSON.stringify({ estado, tocou, depoisDeMim, clique, arrumar }, null, 1));
  if (problemas.length) { console.log('FALHOU: ' + problemas.join('; ')); process.exit(1); }
  console.log('OK: icone de estado, toque de aviso, efeito de clique e a aba de blocos');
})().catch(e => { console.log('FATAL em "' + etapa + '": ' + e.message.split('\n')[0]); process.exit(1); });
