/* =====================================================================
   ENQUETES, CHAMAR TODO MUNDO E EVENTOS

   O que este teste cobra:
     1. criar uma enquete e ela virar cartão na conversa
     2. votar de dois lados e a conta bater nos DOIS
     3. o resultado só aparecer depois de eu votar
     4. voto único troca; voto múltiplo soma; clicar de novo tira
     5. a enquete fechar no prazo e no botão
     6. @everyone e @here acenderem para quem não pode ser chamado por
        nome, e serem RECUSADOS para quem não tem permissão
     7. marcar evento, dizer "eu vou", ver a agenda e cancelar
     8. e a regra de sempre: nada disso pode abrir um segundo fluxo

   O teste usa dois navegadores de verdade — um voto que só funciona na
   tela de quem votou não é um voto, é um desenho.
   ===================================================================== */
const path = require('path');
const { chromium } = require('playwright');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const URL = JOGO + '?nuvem=http://127.0.0.1:8099';

async function piloto(ctx, nome) {
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.waitForTimeout(1200);
  await p.evaluate(() => { const el = document.getElementById('abertura'); if (el) { el.className = ''; el.innerHTML = ''; } });
  await p.evaluate(n => {
    ROOT.profiles[n] = defaultSave(); ROOT.current = n; save = ROOT.profiles[n];
    save.__name = n; save.best = 30; save.crystals = 4000; save.tutorialFeito = true;
    calcStats(); persist(); goMenu();
  }, nome);
  await p.evaluate(() => idiomaUsar('pt'));
  await p.evaluate(() => nuvemEnviar(true));
  await p.waitForFunction(n => typeof EST !== 'undefined' && save.__name === n, nome, { timeout: 10000 });
  await p.waitForTimeout(600);
  return p;
}
/* espera a condição, não o relógio: 800ms fixos passam num dia bom e
   falham num dia ruim, e aí ninguém sabe se o bug é do jogo */
async function ate(pg, fn, arg, ms) {
  try { await pg.waitForFunction(fn, arg, { timeout: ms || 8000 }); return true; }
  catch (e) { return false; }
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const out = {}; const errs = []; const problemas = [];
  const ctx = () => b.newContext({ viewport: { width: 1280, height: 800 } });

  const c1 = await ctx(), c2 = await ctx();
  const a = await piloto(c1, 'Ana');
  await a.evaluate(async () => {
    for (const no of ['conversas', 'amigos']) await nuvemSoltar(no, null, 'DELETE');
    await nuvemEnviar(true);
  });
  await a.waitForTimeout(500);
  const t = await piloto(c2, 'Tito');
  for (const [pg, nome] of [[a, 'ANA'], [t, 'TITO']]) {
    pg.on('pageerror', e => errs.push(nome + ': ' + e.message));
    pg.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_')) errs.push(nome + ': ' + m.text()); });
  }

  await a.evaluate(() => {
    window.__fluxos = { abertos: 0, fechados: 0 };
    const original = window.nuvemFluxo;
    window.nuvemFluxo = function (cam, ok, falhou, consulta) {
      window.__fluxos.abertos++;
      const parar = original(cam, ok, falhou, consulta);
      return function () { window.__fluxos.fechados++; return parar(); };
    };
  });

  /* os dois entram no #geral */
  for (const pg of [a, t]) {
    await pg.evaluate(() => estacaoAbrir({ tipo: 'canal', id: 'geral', nome: 'geral' }));
  }
  await a.waitForTimeout(900);

  /* ---- 1. CRIAR A ENQUETE ---- */
  out.criou = await a.evaluate(async () => {
    const antes = EST.msgs.length;
    const ok = await enqCriar('Qual a melhor nave?', ['Falcão', 'Serpente', 'Bisão'], 0, 0);
    const m = EST.msgs[EST.msgs.length - 1];
    return { ok, cresceu: EST.msgs.length - antes, tipo: m && m.tipo,
             /* o txt existe para quem estiver numa versao velha: sem ele
                a conversa ficaria com um buraco no meio */
             temTexto: !!(m && m.txt && m.txt.indexOf('Qual a melhor nave') >= 0),
             opcoes: m && m.enq ? m.enq.o.length : 0,
             k: m && m.k };
  });
  const K = out.criou.k;

  /* ---- 2. O CARTÃO NA TELA, E O RESULTADO ESCONDIDO ANTES DE VOTAR ---- */
  await a.waitForTimeout(300);
  out.cartao = await a.evaluate(k => {
    const cx = document.querySelector('[data-enq="' + k + '"]');
    if (!cx) return { achou: false };
    const bs = [...cx.querySelectorAll('[data-voto]')];
    return { achou: true, botoes: bs.length,
             perg: cx.querySelector('.enq-perg').textContent,
             /* antes de votar, nenhuma porcentagem: ver o resultado
                antes muda o voto de quem esta em duvida */
             mostraNumero: !!cx.querySelector('.enq-num') };
  }, K);

  /* ---- 3. VOTAR DOS DOIS LADOS ---- */
  await ate(t, k => EST.msgs.some(m => m.k === k), K);
  out.votou = await a.evaluate(async k => {
    await enqVotar(k, 1);
    const m = EST.msgs.filter(x => x.k === k)[0];
    return { meu: enqMeuVoto(m), conta: enqContar(m).n };
  }, K);
  /* Tito vota noutra: a conta tem que fechar nos dois navegadores */
  out.doOutro = await t.evaluate(async k => {
    await enqVotar(k, 0);
    const m = EST.msgs.filter(x => x.k === k)[0];
    return { meu: enqMeuVoto(m), conta: enqContar(m).n, gente: enqContar(m).gente };
  }, K);
  /* e o lado da Ana tem que ENXERGAR o voto do Tito sem ninguém falar
     nada: voto não é mensagem nova, e foi exatamente esse o bug */
  out.chegouSozinho = await ate(a, k => {
    const m = EST.msgs.filter(x => x.k === k)[0];
    return m && enqContar(m).gente === 2;
  }, K, 9000);
  out.contaFinal = await a.evaluate(k => {
    const m = EST.msgs.filter(x => x.k === k)[0];
    const cx = document.querySelector('[data-enq="' + k + '"]');
    return { conta: enqContar(m).n, gente: enqContar(m).gente,
             /* agora que votei, o resultado aparece */
             mostraNumero: !!(cx && cx.querySelector('.enq-num')) };
  }, K);

  /* ---- 4. TROCAR O VOTO, E TIRAR ---- */
  out.trocou = await a.evaluate(async k => {
    await enqVotar(k, 2);                       // de 1 para 2: e escolha unica
    const m = EST.msgs.filter(x => x.k === k)[0];
    const depois = enqMeuVoto(m).slice();
    await enqVotar(k, 2);                       // de novo na mesma: tira
    return { depois, tirou: enqMeuVoto(EST.msgs.filter(x => x.k === k)[0]) };
  }, K);

  /* ---- 4b. JUNTAR SEM PERDER ----
     A releitura do canal traz só as últimas 40 mensagens. Juntar isso
     com o que já está na tela é uma REGRA, e regra dá para testar sem
     reproduzir corrida nenhuma -- que foi o erro da primeira versão
     deste teste: ela forçava uma corrida que pegava outro caminho, e
     por isso passava mesmo com o bug no lugar.

     O caso 3 é o que estava quebrado: a leitura sai antes da minha
     gravação e volta depois dela. Nessa janela a minha mensagem já não
     é "a caminho" e ainda não está na resposta -- e era jogada fora. */
  out.juntar = await a.evaluate(() => {
    const m = (k, extra) => Object.assign({ k, txt: k, quando: 1 }, extra || {});
    /* 1. o que já foi rolado para cima não pode sumir */
    const comVelhas = estJuntarMensagens([m('a1'), m('a2'), m('b1')], [m('b1'), m('b2')]);
    /* 2. o que está a caminho não pode sumir */
    const comIndo = estJuntarMensagens([m('b1'), m('zz', { indo: true })], [m('b1'), m('b2')]);
    /* 3. o que é mais novo que a resposta não pode sumir */
    const comNova = estJuntarMensagens([m('b1'), m('zz')], [m('b1'), m('b2')]);
    /* e o que a nuvem ATUALIZOU vale mais que a cópia velha da tela */
    const atualizada = estJuntarMensagens([m('b1', { votos: { x: '0' } })],
                                          [m('b1', { votos: { x: '1' } })]);
    return {
      velhas: comVelhas.map(x => x.k),
      indo: comIndo.map(x => x.k),
      nova: comNova.map(x => x.k),
      voto: (atualizada[0].votos || {}).x,
      /* e nada pode aparecer duas vezes */
      semRepetido: comNova.length === new Set(comNova.map(x => x.k)).size
    };
  });

  /* ---- 5. MARCAR MAIS DE UMA ---- */
  out.multi = await a.evaluate(async () => {
    await enqCriar('Que dias você joga?', ['Sexta', 'Sábado', 'Domingo'], 1, 0);
    const m = EST.msgs[EST.msgs.length - 1];
    await enqVotar(m.k, 0);
    await enqVotar(m.k, 2);
    const v = enqMeuVoto(EST.msgs.filter(x => x.k === m.k)[0]);
    return { marcados: v.length, tem0: v.indexOf(0) >= 0, tem2: v.indexOf(2) >= 0 };
  });

  /* ---- 6. FECHAR: no botão e pelo prazo ---- */
  out.fechou = await a.evaluate(async k => {
    await enqFechar(k);
    const m = EST.msgs.filter(x => x.k === k)[0];
    const cx = document.querySelector('[data-enq="' + k + '"]');
    const antes = enqContar(m).gente;
    const deu = await enqVotar(k, 0);           // fechada nao aceita voto
    return { acabou: enqAcabou(m), deu,
             igual: enqContar(EST.msgs.filter(x => x.k === k)[0]).gente === antes,
             botoesTravados: cx ? [...cx.querySelectorAll('[data-voto]')].every(x => x.disabled) : false };
  }, K);
  out.prazo = await a.evaluate(() => {
    const m = { enq: { p: 'x', o: ['a', 'b'], ate: Date.now() - 1000 } };
    const viva = { enq: { p: 'x', o: ['a', 'b'], ate: Date.now() + 60000 } };
    return { passada: enqAcabou(m), viva: enqAcabou(viva) };
  });

  /* ---- 7. CHAMAR TODO MUNDO ---- */
  out.chamado = await a.evaluate(() => ({
    everyone: socialChamadoNoTexto('oi @everyone vem'),
    here: socialChamadoNoTexto('@here alguem ai'),
    todos: socialChamadoNoTexto('@todos bora'),
    aqui: socialChamadoNoTexto('@aqui bora'),
    nenhum: socialChamadoNoTexto('oi @ana tudo bem'),
    /* "@everyonezinho" nao e chamado: o \b existe para isso */
    coladoNaoVale: socialChamadoNoTexto('@everyonezinho')
  }));
  /* nos canais da estação quem chama é a equipe do painel. Ana não
     entrou no painel, então não pode -- e a mensagem TEM que ser
     recusada, não enviada sem o chamado. */
  /* O JOGO SEGURA QUEM MANDA RÁPIDO DEMAIS, e criar enquete conta como
     mandar. Sem esta espera o teste levava "calma, respira" e a culpa
     parecia ser do @everyone. */
  await a.waitForTimeout(1100);
  out.semPermissao = await a.evaluate(async () => {
    const antes = EST.msgs.length;
    const ok = await estEnviar('@everyone alguem ai?');
    return { pode: socialPodeChamar(EST.destino), ok, cresceu: EST.msgs.length - antes };
  });
  await a.waitForTimeout(900);
  out.comPermissao = await a.evaluate(async () => {
    PERM.entrou = true; PERM.dono = true;       // como se tivesse entrado no painel
    const antes = EST.msgs.length;
    const ok = await estEnviar('@everyone treino agora');
    const m = EST.msgs[EST.msgs.length - 1];
    return { pode: socialPodeChamar(EST.destino), ok, cresceu: EST.msgs.length - antes,
             marcado: /est-mencao eu todos/.test(estTextoComMencoes(m.txt, estEu())),
             /* @everyone dentro do <b> nao pode ser marcado DUAS vezes */
             umaVezSo: (estTextoComMencoes('@everyone', estEu()).match(/est-mencao/g) || []).length };
  });
  /* e o chamado tem que acender na tela de QUEM NAO FOI CHAMADO PELO NOME */
  out.acendeuNoOutro = await ate(t, () =>
    EST.msgs.some(m => /treino agora/.test(m.txt || '')), null, 9000);
  out.chamouTito = await t.evaluate(() => {
    const m = EST.msgs.filter(x => /treino agora/.test(x.txt || ''))[0];
    return { chamou: estMeChamou(m, estEu()),
             /* e o @here so acorda quem esta online */
             hereOnline: socialChamouMim({ de: 'x', txt: '@here vem' }, estEu()) };
  });

  /* ---- 8. EVENTOS ---- */
  out.evento = await a.evaluate(async () => {
    const quando = Date.now() + 7200000;
    const ok = await evCriar('Treino de arena', 'a gente treina antes da ranqueada', quando, 'voz');
    const daqui = evDaqui();
    const e = daqui[0];
    return { ok, quantos: daqui.length, nome: e && e.nome,
             /* quem marca, vai: sem isso o evento nasce com zero pessoas
                e parece que ninguem quer */
             donoVai: e ? evVou(e) : false, gente: e ? evQuantos(e) : 0,
             cartao: !!document.querySelector('[data-ev]'),
             eid: e && e.eid };
  });
  const EID = out.evento.eid;
  out.outroVai = await ate(t, () => { evCarregar(true); return true; }) &&
    await t.evaluate(async eid => {
      await evCarregar(true);
      await evMarcar(eid);
      return { vou: evVou(EV.lista[eid]), gente: evQuantos(EV.lista[eid]) };
    }, EID);
  out.agenda = await a.evaluate(async () => {
    await evCarregar(true);
    evAbrirAgenda();
    await new Promise(r => setTimeout(r, 700));
    const cx = document.getElementById('est-janela');
    return { aberta: cx.classList.contains('on'),
             itens: cx.querySelectorAll('.ev-item').length,
             temBotaoVou: !!cx.querySelector('[data-evvou]'),
             temNovo: !!document.getElementById('ev-novo') };
  });
  out.cancelou = await a.evaluate(async eid => {
    await evCancelar(eid);
    await evCarregar(true);
    return { sumiu: !EV.lista[eid], naAgenda: evDaqui().length };
  }, EID);
  await a.evaluate(() => estFecharJanela());

  /* ---- 9. quem não pode, não vê o botão ---- */
  out.menuMais = await a.evaluate(() => {
    socialAbrirMais();
    const cx = document.getElementById('est-janela');
    const bs = [...cx.querySelectorAll('[data-mais]')].map(x => x.getAttribute('data-mais'));
    estFecharJanela();
    return bs;
  });

  /* ---- 10. NADA DISSO ABRIU UM SEGUNDO FLUXO ---- */
  out.fluxos = await a.evaluate(() => ({
    vivos: window.__fluxos.abertos - window.__fluxos.fechados,
    abertos: window.__fluxos.abertos
  }));

  /* ---- 11. o jogo continua inteiro ---- */
  await a.evaluate(() => { estacaoFechar(); goMenu(); });
  await a.waitForTimeout(300);
  await a.evaluate(() => showScreen('hangar'));
  await a.waitForTimeout(400);
  /* quem está na tela é quem tem "show" -- e o hangar é uma .page, não
     uma .screen, então a busca é pelo id, não pela classe do tipo */
  out.jogoInteiro = await a.evaluate(() =>
    [...document.querySelectorAll('.show')].map(x => x.id).filter(Boolean).join(','));
  await a.evaluate(() => goMenu());
  /* FECHA O NAVEGADOR ANTES DE CONFERIR. Sem isto o teste passava e
     ficava pendurado para sempre: o processo do Chromium segurava o
     node acordado, e na bateria isso é um travamento, não um teste. */
  await b.close();

  const erro = m => problemas.push(m);
  if (!out.criou.ok) erro('nao deu para criar a enquete');
  if (out.criou.tipo !== 'enquete') erro('a enquete nao virou mensagem do tipo enquete');
  if (!out.criou.temTexto) erro('a enquete foi sem txt: numa versao velha viraria buraco');
  if (out.criou.opcoes !== 3) erro('a enquete nasceu com ' + out.criou.opcoes + ' respostas');
  if (!out.cartao.achou) erro('o cartao da enquete nao apareceu na conversa');
  if (out.cartao.botoes !== 3) erro('o cartao tem ' + out.cartao.botoes + ' botoes de voto');
  if (out.cartao.mostraNumero) erro('a porcentagem apareceu ANTES de eu votar');
  if (String(out.votou.meu) !== '1') erro('o meu voto nao ficou marcado');
  if (out.votou.conta[1] !== 1) erro('o voto nao entrou na conta');
  if (!out.chegouSozinho)
    erro('o voto do outro NAO chegou sozinho: voto nao e mensagem nova e a tela ficou parada');
  if (out.contaFinal.gente !== 2) erro('a conta final deu ' + out.contaFinal.gente + ' em vez de 2');
  if (out.contaFinal.conta[0] !== 1 || out.contaFinal.conta[1] !== 1)
    erro('os votos nao bateram: ' + JSON.stringify(out.contaFinal.conta));
  if (!out.contaFinal.mostraNumero) erro('depois de votar a porcentagem devia aparecer');
  if (String(out.trocou.depois) !== '2') erro('trocar o voto nao trocou');
  if (out.trocou.tirou.length) erro('clicar de novo na mesma nao tirou o voto');
  const J = out.juntar;
  if (String(J.velhas) !== 'a1,a2,b1,b2')
    erro('juntar perdeu o que ja tinha sido rolado para cima: ' + J.velhas);
  if (J.indo.indexOf('zz') < 0)
    erro('juntar apagou a mensagem que ainda estava a caminho: ' + J.indo);
  if (J.nova.indexOf('zz') < 0)
    erro('JUNTAR APAGOU A MENSAGEM MAIS NOVA QUE A RESPOSTA: e ela some da tela sozinha');
  if (J.voto !== '1') erro('juntar ficou com a copia velha da mensagem em vez da atualizada');
  if (!J.semRepetido) erro('juntar deixou mensagem repetida');
  if (out.multi.marcados !== 2 || !out.multi.tem0 || !out.multi.tem2)
    erro('marcar mais de uma nao funcionou: ' + JSON.stringify(out.multi));
  if (!out.fechou.acabou) erro('fechar a enquete nao fechou');
  if (out.fechou.deu) erro('a enquete fechada aceitou voto');
  if (!out.fechou.igual) erro('a enquete fechada mudou de numero');
  if (!out.fechou.botoesTravados) erro('a enquete fechada continua com botao clicavel');
  if (!out.prazo.passada || out.prazo.viva) erro('o prazo da enquete nao vale');
  if (out.chamado.everyone !== 'everyone') erro('@everyone nao foi reconhecido');
  if (out.chamado.here !== 'here') erro('@here nao foi reconhecido');
  if (out.chamado.todos !== 'everyone') erro('@todos devia valer por @everyone');
  if (out.chamado.aqui !== 'here') erro('@aqui devia valer por @here');
  if (out.chamado.nenhum) erro('uma mencao normal virou chamado a todos');
  if (out.chamado.coladoNaoVale) erro('@everyonezinho passou por chamado');
  if (out.semPermissao.pode) erro('quem nao e da equipe pode chamar todo mundo no canal da estacao');
  if (out.semPermissao.ok) erro('o @everyone sem permissao FOI ENVIADO');
  if (out.semPermissao.cresceu) erro('o @everyone recusado apareceu na tela mesmo assim');
  if (!out.comPermissao.pode) erro('a equipe do painel nao consegue chamar todo mundo');
  if (!out.comPermissao.ok) erro('o @everyone com permissao nao foi');
  if (!out.comPermissao.marcado) erro('o @everyone nao acendeu no texto');
  if (out.comPermissao.umaVezSo !== 1)
    erro('o @everyone foi marcado ' + out.comPermissao.umaVezSo + ' vezes: a marca caiu em cima da marca');
  if (!out.acendeuNoOutro) erro('a mensagem com @everyone nao chegou no outro piloto');
  if (!out.chamouTito.chamou) erro('o @everyone NAO acendeu para quem nao foi chamado pelo nome');
  if (!out.chamouTito.hereOnline) erro('o @here nao acordou quem esta online');
  if (!out.evento.ok) erro('nao deu para marcar o evento');
  if (out.evento.quantos !== 1) erro('o evento nao entrou na agenda do canal');
  if (!out.evento.donoVai) erro('quem marcou o evento nao entrou na lista de quem vai');
  if (!out.evento.cartao) erro('o evento nao virou cartao na conversa');
  if (!out.outroVai || !out.outroVai.vou) erro('o outro piloto nao conseguiu dizer que vai');
  if (!out.outroVai || out.outroVai.gente !== 2)
    erro('o evento ficou com ' + (out.outroVai || {}).gente + ' pessoas em vez de 2');
  if (!out.agenda.aberta) erro('a agenda nao abriu');
  if (out.agenda.itens !== 1) erro('a agenda mostrou ' + out.agenda.itens + ' eventos');
  if (!out.agenda.temBotaoVou) erro('a agenda nao tem o botao EU VOU');
  if (!out.cancelou.sumiu) erro('cancelar o evento nao apagou');
  if (out.cancelou.naAgenda) erro('o evento cancelado continua na agenda');
  if (out.menuMais.indexOf('enquete') < 0) erro('o + nao oferece enquete');
  if (out.menuMais.indexOf('evento') < 0) erro('o + nao oferece evento');
  if (out.menuMais.indexOf('agenda') < 0) erro('o + nao oferece ver o que esta marcado');
  if (out.fluxos.vivos > 1)
    erro('sobraram ' + out.fluxos.vivos + ' fluxos: enquete e evento tem que caber no que ja existe');
  if (!/hangar/.test(out.jogoInteiro)) erro('QUEBROU o caminho para o hangar: na tela ficou "' + out.jogoInteiro + '"');
  if (errs.length) erro('erros de pagina: ' + errs.join(' | '));

  console.log(JSON.stringify(out, null, 1));
  if (problemas.length) { console.log('FALHOU: ' + problemas.join('; ')); process.exit(1); }
  console.log('OK: enquetes, @everyone/@here e eventos -- sem gastar um fluxo a mais');
})().catch(e => { console.log('FATAL ' + e.message.split('\n')[0]); process.exit(1); });
