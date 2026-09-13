/* =====================================================================
   A ESTAÇÃO — o bate-papo da comunidade dentro do jogo

   O que este teste cobra, na ordem do que foi pedido:
     1. identidade vem do jogo, sem cadastro nenhum
     2. um servidor fixo, três canais de texto, salas de voz preparadas
        e desligadas
     3. amigos, conversa reservada e grupos privados
     4. mandar, mencionar, paginar, ritmo, palavrão, bloquear, silenciar
        e denunciar
     5. abre por cima do jogo SEM pausar, com atalho de teclado e selo
        de não lidas

   E a regra que não está na lista mas manda em tudo: UM FLUXO DE CADA
   VEZ. Passar de seis conexões abertas já travou as gravações do jogo
   uma vez, e um bate-papo com um fluxo por canal chegaria lá sozinho.
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
  /* O PILOTO PRECISA EXISTIR NA NUVEM antes de alguém procurar por ele.
     Sem isto o teste pedia amizade para um nick que ainda não tinha
     subido, levava "não achei ninguém" e a culpa parecia ser do jogo. */
  await p.evaluate(() => nuvemEnviar(true));
  await p.waitForFunction(n => typeof AM !== 'undefined' && save.__name === n, nome, { timeout: 10000 });
  await p.waitForTimeout(700);
  return p;
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const out = {}; const errs = []; const problemas = [];
  const ctx = () => b.newContext({ viewport: { width: 1280, height: 800 } });

  const c1 = await ctx(), c2 = await ctx();
  const a = await piloto(c1, 'Ana');
  /* LIMPA A NUVEM FALSA ANTES DE COMEÇAR.
     Sem isto o teste herdava a rodada anterior: o #geral já vinha com
     mensagens, Ana e Tito já eram amigos, e as contas davam errado por
     motivo nenhum. Um teste que só passa na primeira vez não é teste. */
  await a.evaluate(async () => {
    for (const no of ['conversas', 'amigos', 'denuncias']) await nuvemSoltar(no, null, 'DELETE');
    await nuvemEnviar(true);
  });
  await a.waitForTimeout(600);
  const t = await piloto(c2, 'Tito');
  for (const [pg, nome] of [[a, 'ANA'], [t, 'TITO']]) {
    pg.on('pageerror', e => errs.push(nome + ': ' + e.message));
    pg.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_')) errs.push(nome + ': ' + m.text()); });
  }

  /* conta os fluxos abertos e fechados, para provar a regra do um-só */
  await a.evaluate(() => {
    window.__fluxos = { abertos: 0, fechados: 0 };
    const original = window.nuvemFluxo;
    window.nuvemFluxo = function (cam, ok, falhou, consulta) {
      window.__fluxos.abertos++;
      const parar = original(cam, ok, falhou, consulta);
      return function () { window.__fluxos.fechados++; return parar(); };
    };
  });

  /* ---- 1. ABRE PELA PORTA AMIGOS, E NÃO É UMA TELA DO JOGO ---- */
  await a.evaluate(() => { goMenu(); portaAbrir('online'); });
  await a.waitForTimeout(400);
  out.naPorta = await a.evaluate(() => {
    const l = document.querySelector('[data-ir="btn-estacao"]');
    return { existe: !!l, texto: l ? l.textContent.replace(/\s+/g, ' ').trim().slice(0, 30) : null,
             /* debaixo de AMIGOS, e a primeira da lista */
             primeira: [...document.querySelectorAll('#porta-corpo [data-ir]')][0] === l };
  });
  const modoAntes = await a.evaluate(() => S.mode);
  await a.evaluate(() => document.querySelector('[data-ir="btn-estacao"]').click());
  await a.waitForTimeout(2200);
  out.abriu = await a.evaluate(() => ({
    aberta: EST.aberta,
    naTela: document.getElementById('estacao').classList.contains('on'),
    destino: EST.destino && EST.destino.id
  }));
  out.naoMexeuNoJogo = { antes: modoAntes, depois: await a.evaluate(() => S.mode) };

  /* ---- 1b. IDENTIDADE VEM DO JOGO ---- */
  out.identidade = await a.evaluate(() => {
    const eu = estEu();
    return { id: !!eu.id, nick: eu.nick, tag: eu.tag,
             /* não pode existir campo de login nem de perfil aqui dentro */
             temLogin: !!document.querySelector('#estacao input[type="password"]'),
             bateComOJogo: eu.nick === save.__name };
  });

  /* ---- 2. SERVIDOR, CANAIS E VOZ ---- */
  out.estrutura = await a.evaluate(() => ({
    servidor: EST_SERVIDOR.nome,
    canais: EST_CANAIS.map(c => c.id),
    canaisNaTela: [...document.querySelectorAll('#est-lado [data-dest]')]
      .map(x => x.getAttribute('data-dest')).filter(x => x.indexOf('canal|') === 0),
    voz: EST_VOZ.length,
    vozNaTela: document.querySelectorAll('#est-lado [data-voz]').length,
    vozDesligada: [...document.querySelectorAll('#est-lado [data-voz]')]
      .every(x => x.classList.contains('voz')),
    /* o estado da voz já existe, mesmo sem a chamada */
    estadoDaVoz: typeof EST.voz === 'object' && 'sala' in EST.voz && 'mudo' in EST.voz
  }));
  await a.evaluate(() => document.querySelector('#est-lado [data-voz]').click());
  await a.waitForTimeout(300);
  out.vozAvisa = await a.evaluate(() =>
    document.getElementById('est-aviso').textContent);

  /* ---- 4a. MANDAR, MENCIONAR, HORA ---- */
  out.mandou = await a.evaluate(async () => {
    const antes = EST.msgs.length;
    await estEnviar('bom dia @Tito, tudo certo? 🚀');
    return { antes, n: EST.msgs.length,
             entrou: EST.msgs.some(m => /bom dia/.test(m.txt)),
             html: (document.querySelector('#est-msgs .est-txt') || {}).innerHTML || '',
             temHora: !!document.querySelector('#est-msgs .est-hora'),
             temDia: !!document.querySelector('#est-msgs .est-dia') };
  });
  /* o Tito abre o mesmo canal e tem que ver a mensagem da Ana */
  await t.evaluate(() => estacaoAbrir({ tipo: 'canal', id: 'geral', nome: 'geral' }));
  await t.waitForTimeout(2500);
  out.tempoReal = await t.evaluate(() => ({
    viu: EST.msgs.some(m => /bom dia/.test(m.txt)),
    /* o Tito foi chamado: a mensagem tem que acender para ele */
    acendeu: !!document.querySelector('#est-msgs .est-msg.chamou'),
    meuNome: !!document.querySelector('#est-msgs .est-mencao.eu')
  }));

  /* ---- 4b. RITMO (anti-enxurrada) ---- */
  out.ritmo = await a.evaluate(async () => {
    let bloqueou = 0, passou = 0;
    for (let i = 0; i < 10; i++) {
      const ok = await estEnviar('mensagem numero ' + i);
      if (ok) passou++; else bloqueou++;
    }
    return { passou, bloqueou, aviso: document.getElementById('est-aviso').textContent };
  });
  out.repetida = await a.evaluate(async () => {
    EST.ritmo = []; estUltimas = [];
    const r = [];
    for (let i = 0; i < 4; i++) {
      EST.ritmo = [];                       // só o teste da repetição
      r.push(await estEnviar('igualzinho'));
      await new Promise(x => setTimeout(x, 60));
    }
    return r;
  });

  /* ---- 4c. FILTRO DE PALAVRÃO, inclusive disfarçado ---- */
  out.filtro = await a.evaluate(() => ({
    simples: estFiltrar('seu merda'),
    disfarcado: estFiltrar('que p0rra e essa'),
    esticado: estFiltrar('caraaaalho'),
    /* e não pode comer palavra inocente */
    inocente: estFiltrar('abri a porta do porao e corri'),
    frase: estFiltrar('oi merda tudo bem')
  }));

  /* ---- 4d. BLOQUEAR, SILENCIAR, DENUNCIAR ---- */
  const idTito = await t.evaluate(() => estEu().id);
  await t.evaluate(() => estEnviar('aqui e o Tito falando'));
  await t.waitForTimeout(1200);
  await a.waitForTimeout(2500);
  out.moderacao = await a.evaluate(async id => {
    const antes = EST.msgs.filter(estMostraMensagem).length;
    estSilenciar(id, 'Tito');
    const calado = EST.msgs.filter(estMostraMensagem).length;
    const naTela = document.querySelectorAll('#est-msgs .est-msg').length;
    estSilenciar(id, 'Tito');                 // desfaz
    estBloquear(id, 'Tito');
    const bloqueado = EST.msgs.filter(estMostraMensagem).length;
    estBloquear(id, 'Tito');                  // desfaz
    return { antes, calado, naTela, bloqueado, volta: EST.msgs.filter(estMostraMensagem).length };
  }, idTito);
  out.denuncia = await a.evaluate(async () => {
    const m = EST.msgs.filter(x => /Tito falando/.test(x.txt))[0];
    if (!m) return { mandou: false };
    await estDenunciar(m);
    const d = await nuvemReq('denuncias');
    return { mandou: true, quantas: Object.keys(d || {}).length,
             aviso: document.getElementById('est-aviso').textContent };
  });

  /* ---- 4e. PAGINAÇÃO ---- */
  out.paginacao = await a.evaluate(async () => {
    /* enche o canal #ajuda com 70 mensagens, direto na nuvem */
    for (let i = 0; i < 70; i++) {
      const k = (Date.now() - (70 - i) * 1000).toString(36) + String(i).padStart(4, '0');
      await nuvemSoltar('conversas/canal__ajuda/' + k,
        { de: 'x', nome: 'Robo', txt: 'linha ' + i, quando: Date.now() - (70 - i) * 1000 });
    }
    await estAbrir({ tipo: 'canal', id: 'ajuda', nome: 'ajuda' });
    await new Promise(r => setTimeout(r, 1200));
    const primeira = EST.msgs.length;
    const temBotao = !!document.getElementById('est-mais-msg');
    await estMais();
    await new Promise(r => setTimeout(r, 900));
    return { primeira, temBotao, depois: EST.msgs.length, fim: EST.fim,
             /* e não pode duplicar nada ao juntar as duas levas */
             repetidas: EST.msgs.length - new Set(EST.msgs.map(m => m.k)).size };
  });

  /* ---- A REGRA DO UM FLUXO SÓ ---- */
  out.fluxos = await a.evaluate(async () => {
    const antes = Object.assign({}, window.__fluxos);
    await estAbrir({ tipo: 'canal', id: 'trocas', nome: 'trocas' });
    await new Promise(r => setTimeout(r, 900));
    await estAbrir({ tipo: 'canal', id: 'geral', nome: 'geral' });
    await new Promise(r => setTimeout(r, 900));
    return { antes, depois: Object.assign({}, window.__fluxos),
             vivos: window.__fluxos.abertos - window.__fluxos.fechados };
  });

  /* ---- 3. AMIGOS E CONVERSA RESERVADA ---- */
  out.amizade = await a.evaluate(async () => {
    const r = await amigoPedir('Tito');
    await amigosCarregar();
    return { ok: !!(r && r.ok), msg: r && r.msg };
  });
  await t.waitForTimeout(600);
  out.aceitou = await t.evaluate(async () => {
    await amigosCarregar();
    const ids = Object.keys(AM.pedidos);
    if (!ids.length) return { pedidos: 0 };
    await amigoAceitar(ids[0]);
    await amigosCarregar();
    return { pedidos: ids.length, amigos: Object.keys(AM.lista).length };
  });
  await a.evaluate(() => amigosCarregar().then(() => estPintar()));
  await a.waitForTimeout(900);
  out.dm = await a.evaluate(async id => {
    /* a conversa reservada usa a MESMA sala da tela de amigos: quem
       escreve aqui aparece lá, e o contrário */
    const meu = estEu().id;
    const cam = estCaminho({ tipo: 'dm', id });
    await estAbrir({ tipo: 'dm', id, nome: 'Tito' });
    await new Promise(r => setTimeout(r, 700));
    await estEnviar('oi, so nos dois aqui');
    await new Promise(r => setTimeout(r, 700));
    return { caminho: cam, mesmaSala: cam === 'conversas/' + salaDaConversa(meu, id),
             naLista: document.querySelectorAll('#est-lado [data-dest^="dm|"]').length,
             mandou: EST.msgs.some(m => /so nos dois/.test(m.txt)) };
  }, idTito);
  out.dmChegou = await t.evaluate(async id => {
    await conversaAbrir(id);
    await new Promise(r => setTimeout(r, 1200));
    return AM.mensagens.some(m => /so nos dois/.test(m.txt));
  }, await a.evaluate(() => estEu().id));

  /* ---- 3b. GRUPOS ---- */
  out.grupo = await a.evaluate(async id => {
    const gid = await estGrupoCriar('Esquadrão Alfa', [id]);
    if (!gid) return { criou: false };
    const g = EST.grupos[gid];
    /* conta AGORA: g.membros é o objeto vivo, e tirar alguém mais abaixo
       mudaria este número debaixo do teste */
    const membros = Object.keys(g.membros).length;
    await estAbrir({ tipo: 'grupo', id: gid, nome: g.nome });
    await new Promise(r => setTimeout(r, 700));
    await estEnviar('bem-vindos ao grupo');
    await new Promise(r => setTimeout(r, 600));
    const meuNivel = estMeuNivel(gid);
    await estGrupoRenomear(gid, 'Esquadrão Ômega');
    await estGrupoPromover(gid, id);
    const promovido = EST.grupos[gid].membros[id].nivel;
    await estGrupoRemover(gid, id);
    const depoisDeTirar = Object.keys(EST.grupos[gid].membros).length;
    return { criou: true, gid, membros,
             meuNivel, nome: EST.grupos[gid].nome, promovido, depoisDeTirar,
             mandou: EST.msgs.some(m => /bem-vindos/.test(m.txt)),
             naLista: document.querySelectorAll('#est-lado [data-dest^="grupo|"]').length };
  }, idTito);

  /* ---- NO CELULAR: a gaveta, e nada debaixo do ✕ ----
     O ✕ flutua por cima da estação inteira. O cabeçalho de um grupo tem
     três botões, e o último (SAIR) ficava DEBAIXO dele: o dedo mirava em
     sair do grupo e fechava a estação. Achado medindo, não olhando. */
  await a.setViewportSize({ width: 390, height: 844 });
  await a.waitForTimeout(600);
  out.celular = await a.evaluate(async () => {
    const gid = await estGrupoCriar('Grupo com nome bem comprido mesmo', []);
    if (gid) await estAbrir({ tipo: 'grupo', id: gid, nome: EST.grupos[gid].nome });
    await new Promise(r => setTimeout(r, 700));
    const x = document.getElementById('est-fechar').getBoundingClientRect();
    const colide = [...document.querySelectorAll('.est-cab-acoes .est-cab-b')].filter(e => {
      const q = e.getBoundingClientRect();
      return q.right > x.left - 2 && q.top < x.bottom && q.bottom > x.top;
    }).map(e => e.textContent);
    const est = document.getElementById('estacao');
    const fora = [...est.querySelectorAll('button,input')].filter(e => {
      const q = e.getBoundingClientRect();
      return q.width > 2 && q.height > 2 &&
             (q.right > innerWidth + 1 || q.left < -1 || q.bottom > innerHeight + 1);
    }).length;
    const pequenos = [...est.querySelectorAll('button')].filter(e => {
      const q = e.getBoundingClientRect(); return q.height > 2 && q.height < 30;
    }).length;
    const lado = document.getElementById('est-lado');
    const gavetaFechada = getComputedStyle(lado).display === 'none';
    document.getElementById('est-abrir-lado').click();
    const gavetaAbre = getComputedStyle(lado).display !== 'none';
    est.classList.remove('lado-aberto');
    return { colide, fora, pequenos, gavetaFechada, gavetaAbre,
             botaoDaGaveta: getComputedStyle(document.getElementById('est-abrir-lado')).display !== 'none' };
  });
  await a.setViewportSize({ width: 1280, height: 800 });
  await a.waitForTimeout(500);

  /* ---- 5. ATALHO DE TECLADO, SELO E FECHAR ---- */
  await a.evaluate(() => estacaoFechar());
  await a.waitForTimeout(400);
  out.fechou = await a.evaluate(() => ({
    aberta: EST.aberta,
    fluxoSolto: EST.fluxo === null,
    relogio: EST.relogio === null,
    vivos: window.__fluxos.abertos - window.__fluxos.fechados
  }));
  await a.keyboard.press('c');
  await a.waitForTimeout(900);
  out.tecla = await a.evaluate(() => EST.aberta);
  await a.keyboard.press('Escape');
  await a.waitForTimeout(400);
  out.escFecha = await a.evaluate(() => !EST.aberta);
  /* a tecla não pode roubar a letra de quem está escrevendo */
  out.teclaNoCampo = await a.evaluate(() => {
    estacaoAbrir();
    const campo = document.getElementById('est-campo');
    campo.focus();
    const antes = EST.aberta;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true }));
    return { antes, depois: EST.aberta };
  });
  out.selo = await a.evaluate(async () => {
    EST.visto = {};
    EST.ultimas = { 'canal:geral': Date.now() };
    const n = estSeloGeral();
    return { n, noBotao: document.getElementById('est-selo').textContent,
             aceso: document.getElementById('est-selo').classList.contains('on') };
  });

  /* ---- o resto do jogo continua inteiro ---- */
  await a.evaluate(() => { estacaoFechar(); goMenu(); });
  await a.waitForTimeout(500);
  out.jogoInteiro = {};
  for (const [nome, porta, texto] of [
    ['hangar', 'nave', 'Hangar'], ['mapa', 'progresso', 'Mapa'], ['amigos', 'online', 'Amigos']
  ]) {
    await a.evaluate(x => { goMenu(); portaAbrir(x); }, porta);
    await a.waitForTimeout(350);
    await a.evaluate(x => {
      const l = [...document.querySelectorAll('.porta-linha')].filter(e => e.textContent.indexOf(x) >= 0)[0];
      if (l) l.click();
    }, texto);
    await a.waitForTimeout(500);
    out.jogoInteiro[nome] = await a.evaluate(() => S.mode);
  }
  await a.evaluate(() => goMenu());
  await a.waitForTimeout(300);
  await a.evaluate(() => { S.mode = 'levels'; startGame(1); });
  await a.waitForTimeout(1500);
  out.jogando = await a.evaluate(() => ({ modo: S.mode, vivo: player.alive,
    botaoFlutuante: getComputedStyle(document.getElementById('est-flutua')).display !== 'none' }));
  /* e abrir a estação no meio da partida NÃO pausa o jogo */
  out.semPausar = await a.evaluate(async () => {
    const antes = S.mode;
    estacaoAbrir();
    await new Promise(r => setTimeout(r, 700));
    const depois = S.mode;
    estacaoFechar();
    return { antes, depois, vivo: player.alive };
  });

  await a.screenshot({ path: 'estacao.png' });
  await b.close();
  out.errs = errs;
  const erro = m => problemas.push(m);

  if (!out.naPorta.existe) erro('a ESTACAO nao aparece na porta AMIGOS');
  if (!out.naPorta.primeira) erro('a ESTACAO nao e a primeira linha de AMIGOS');
  if (!out.abriu.aberta || !out.abriu.naTela) erro('a estacao nao abriu');
  if (out.abriu.destino !== 'geral') erro('nao abriu no #geral');
  if (out.naoMexeuNoJogo.antes !== out.naoMexeuNoJogo.depois)
    erro('abrir a estacao mexeu no estado do jogo (' + out.naoMexeuNoJogo.antes +
         ' -> ' + out.naoMexeuNoJogo.depois + ')');
  if (!out.identidade.id || !out.identidade.bateComOJogo) erro('a identidade nao veio do jogo');
  if (out.identidade.temLogin) erro('a estacao tem campo de senha: ela nao pode ter login proprio');
  if (out.estrutura.canais.join() !== 'geral,trocas,ajuda') erro('os canais nao sao os tres pedidos');
  if (out.estrutura.canaisNaTela.length !== 3) erro('os tres canais nao aparecem na barra');
  if (!out.estrutura.vozNaTela) erro('as salas de voz nao aparecem');
  if (!out.estrutura.vozDesligada) erro('as salas de voz nao estao marcadas como desligadas');
  if (!out.estrutura.estadoDaVoz) erro('o estado da voz nao esta preparado');
  if (!/ainda nao|ainda não/i.test(out.vozAvisa)) erro('a sala de voz nao avisa que ainda nao abriu');
  if (!out.mandou.entrou || out.mandou.n !== out.mandou.antes + 1) erro('a mensagem nao entrou');
  if (out.mandou.html.indexOf('est-mencao') < 0) erro('a mencao @ nao virou destaque');
  if (!out.mandou.temHora) erro('a mensagem nao tem hora');
  if (!out.mandou.temDia) erro('falta a divisoria do dia');
  if (!out.tempoReal.viu) erro('a mensagem da Ana nao chegou no Tito');
  if (!out.tempoReal.acendeu) erro('ser chamado por @ nao acende a mensagem');
  if (!out.tempoReal.meuNome) erro('a mencao ao PROPRIO nome nao se destaca');
  if (!out.ritmo.bloqueou) erro('o ritmo nao segurou a enxurrada');
  if (out.ritmo.passou > 7) erro('o ritmo deixou passar ' + out.ritmo.passou + ' de 10');
  if (out.repetida.filter(Boolean).length > 2)
    erro('a mesma frase passou ' + out.repetida.filter(Boolean).length + ' vezes seguidas');
  if (out.filtro.simples.indexOf('merda') >= 0) erro('o palavrao simples passou');
  if (out.filtro.disfarcado.indexOf('p0rra') >= 0) erro('o palavrao disfarcado com numero passou');
  if (!/•/.test(out.filtro.esticado)) erro('o palavrao com letra esticada passou');
  if (out.filtro.inocente !== 'abri a porta do porao e corri')
    erro('o filtro comeu palavra inocente: "' + out.filtro.inocente + '"');
  if (out.filtro.frase.indexOf('tudo bem') < 0) erro('o filtro estragou o resto da frase');
  if (!(out.moderacao.calado < out.moderacao.antes)) erro('silenciar nao escondeu as mensagens');
  if (out.moderacao.naTela !== out.moderacao.calado) erro('silenciar escondeu na conta mas nao na tela');
  if (!(out.moderacao.bloqueado < out.moderacao.antes)) erro('bloquear nao escondeu as mensagens');
  if (out.moderacao.volta !== out.moderacao.antes) erro('desfazer nao trouxe a mensagem de volta');
  if (!out.denuncia.mandou || !out.denuncia.quantas) erro('a denuncia nao foi gravada');
  if (out.paginacao.primeira !== 40)
    erro('a primeira leva trouxe ' + out.paginacao.primeira + ' mensagens; devia ser 40');
  if (!out.paginacao.temBotao) erro('nao apareceu o botao de ver o que veio antes');
  if (out.paginacao.depois <= out.paginacao.primeira) erro('paginar nao trouxe mensagens mais antigas');
  if (out.paginacao.repetidas) erro('paginar repetiu ' + out.paginacao.repetidas + ' mensagens');
  if (out.fluxos.vivos > 1)
    erro('sobraram ' + out.fluxos.vivos + ' fluxos abertos: a regra e UM de cada vez');
  if (!out.amizade.ok) erro('nao deu para pedir amizade pela estacao: ' + out.amizade.msg);
  if (!out.aceitou.pedidos) erro('o pedido de amizade nao chegou no outro lado');
  if (!out.aceitou.amigos) erro('aceitar o pedido nao criou a amizade');
  if (!out.dm.mesmaSala) erro('a conversa reservada nao usa a mesma sala da tela de amigos');
  if (!out.dm.naLista) erro('o amigo nao aparece na barra de conversas');
  if (!out.dm.mandou) erro('a mensagem reservada nao entrou');
  if (!out.dmChegou) erro('a mensagem da estacao NAO aparece na tela de amigos: sao duas caixas separadas');
  if (!out.grupo.criou) erro('nao deu para criar o grupo');
  if (out.grupo.membros !== 2) erro('o grupo nasceu com ' + out.grupo.membros + ' membros');
  if (out.grupo.meuNivel !== 2) erro('quem criou o grupo nao virou dono');
  if (out.grupo.nome !== 'Esquadrão Ômega') erro('renomear o grupo nao pegou');
  if (out.grupo.promovido !== 1) erro('promover a moderador nao pegou');
  if (out.grupo.depoisDeTirar !== 1) erro('tirar do grupo nao pegou');
  if (!out.grupo.mandou) erro('nao deu para falar no grupo');
  if (!out.grupo.naLista) erro('o grupo nao aparece na barra');
  const C = out.celular;
  if (C.colide.length) erro('no celular, ' + C.colide.join(' e ') + ' fica(m) debaixo do X de fechar');
  if (C.fora) erro('no celular, ' + C.fora + ' botoes/campos fora da tela');
  if (C.pequenos) erro('no celular, ' + C.pequenos + ' botoes menores que o dedo alcanca');
  if (!C.gavetaFechada) erro('no celular a barra devia comecar fechada');
  if (!C.gavetaAbre) erro('no celular a gaveta nao abre');
  if (!C.botaoDaGaveta) erro('no celular falta o botao que abre a gaveta');
  if (out.fechou.aberta) erro('fechar nao fechou');
  if (!out.fechou.fluxoSolto) erro('fechar NAO soltou o fluxo: a conexao fica presa a toa');
  if (out.fechou.relogio !== true && out.fechou.relogio !== null) erro('fechar nao parou o relogio');
  if (out.fechou.vivos > 0) erro('depois de fechar sobraram ' + out.fechou.vivos + ' fluxos');
  if (!out.tecla) erro('a tecla C nao abriu a estacao');
  if (!out.escFecha) erro('o Esc nao fechou');
  if (out.teclaNoCampo.antes !== out.teclaNoCampo.depois)
    erro('a tecla C fechou a estacao enquanto a pessoa escrevia');
  if (!out.selo.n || !out.selo.aceso) erro('o selo de nao lidas nao acendeu');
  for (const k of ['hangar', 'mapa', 'amigos'])
    if (!out.jogoInteiro[k] || out.jogoInteiro[k] === 'menu') erro('QUEBROU o caminho para ' + k);
  if (out.jogando.modo !== 'playing') erro('QUEBROU o jogo 2D');
  if (!out.jogando.botaoFlutuante) erro('o botao flutuante nao aparece durante a partida');
  if (out.semPausar.antes !== out.semPausar.depois)
    erro('abrir a estacao PAUSOU a partida (' + out.semPausar.antes + ' -> ' + out.semPausar.depois + ')');
  if (errs.length) erro('erros de pagina: ' + errs.join(' | '));

  console.log(JSON.stringify(out, null, 1));
  if (problemas.length) { console.log('FALHOU: ' + problemas.join('; ')); process.exit(1); }
  console.log('OK: a estacao inteira -- canais, amigos, grupos, moderacao e um fluxo so');
})().catch(e => { console.log('FATAL ' + e.message.split('\n')[0]); process.exit(1); });
