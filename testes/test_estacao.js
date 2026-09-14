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

  /* =====================================================================
     NEONEBULA E O PERFIL
     A assinatura só vale se ela (1) chegar sozinha quando o pagamento
     cai, (2) travar de verdade o que não foi pago, e (3) voltar ao
     normal quando o prazo acaba. Sem as três, é enfeite.
     ===================================================================== */
  out.neo = await a.evaluate(() => {
    const r = {};
    save.neo = { nivel: 'nenhum', ate: 0 };
    r.comeca = neoNivel();
    /* 1) entrega automática: o mesmo cano de todo o resto */
    const res = aplicarPresente(save, { compra: { neo: { nivel: 'ouro', dias: 30 } } });
    r.entregou = { nivel: neoNivel(), dias: neoDiasQueFaltam(), avisou: res.itens.length > 0 };
    /* 2) trava: com Bronze não dá para salvar coisa de Ouro nem mexendo aqui */
    save.neo = { nivel: 'bronze', ate: Date.now() + 86400000 };
    perfilSalvar({ cor: 'branco', efeito: 'glitch', fundo: 'prisma' });
    r.recusouOPago = { cor: perfilMeu().cor, efeito: perfilMeu().efeito, fundo: perfilMeu().fundo };
    perfilSalvar({ cor: 'verde' });
    r.aceitouODoNivel = perfilMeu().cor;
    /* 3) prazo vencido: o nome volta ao normal, mas a ESCOLHA fica guardada
       para voltar sozinha se a pessoa renovar */
    save.neo = { nivel: 'ouro', ate: Date.now() + 86400000 };
    perfilSalvar({ cor: 'branco', efeito: 'glitch' });
    r.valendo = { cor: perfilCorDoNome(), efeito: perfilEfeitoDoNome() };
    save.neo.ate = Date.now() - 1000;
    r.vencido = { cor: perfilCorDoNome(), efeito: perfilEfeitoDoNome(),
                  guardado: perfilMeu().cor, nivel: neoNivel() };
    /* 4) o perfil de um estranho vem da nuvem: nada dele entra na tela sem
       passar por uma lista conhecida */
    const v = perfilDaNuvem({ neo: 'ouro',
      perfil: { cor: '<img src=x onerror=alert(1)>', efeito: 'inventado', fundo: 'nao-existe' } });
    r.estranho = { cor: v.cor, efeito: v.efeito, fundo: v.fundo.id };
    /* 5) e quem diz ser Ouro sem ser não ganha o efeito de Ouro */
    const w = perfilDaNuvem({ neo: 'bronze', perfil: { cor: 'branco', efeito: 'glitch' } });
    r.mentiroso = { cor: w.cor, efeito: w.efeito };
    /* 6) o dono tem ilimitado sem comprar nada */
    r.niveis = NEO_NIVEIS.map(n => n.id);
    r.precos = NEO_NIVEIS.filter(n => !n.oculto).map(n => n.preco);
    return r;
  });

  /* ---- o perfil abre de qualquer lugar, e SALVA ---- */
  out.perfil = await a.evaluate(async () => {
    save.neo = { nivel: 'ouro', ate: Date.now() + 30 * 86400000 };
    perfilSalvar({ cor: 'ambar', efeito: 'neon', fundo: 'prisma',
                   bio: 'piloto de teste', pronomes: 'ele/dele' });
    await estAbrir({ tipo: 'canal', id: 'geral', nome: 'geral' });
    await new Promise(r => setTimeout(r, 400));
    await estEnviar('mensagem para clicar no perfil');
    await new Promise(r => setTimeout(r, 700));
    const nome = document.querySelector('#est-msgs b[data-perfil]');
    const r = {
      nomePintado: nome ? nome.getAttribute('style') : null,
      temEfeito: nome ? /neo-neon/.test(nome.className) : false,
      temSelo: !!document.querySelector('#est-msgs .est-selo-neo'),
      clicavel: !!nome
    };
    nome.click();
    await new Promise(x => setTimeout(x, 300));
    r.cartao = { abriu: document.getElementById('est-janela').classList.contains('on'),
                 bio: (document.querySelector('.pf-bio') || {}).textContent,
                 pronomes: (document.querySelector('.pf-pron') || {}).textContent,
                 temEditar: !!document.querySelector('[data-p="editar"]') };
    document.querySelector('[data-p="editar"]').click();
    await new Promise(x => setTimeout(x, 300));
    r.editor = { opcoes: document.querySelectorAll('.pf-op').length,
                 temSalvar: !!document.getElementById('pf-salvar'),
                 temBio: !!document.getElementById('pf-bio'),
                 temPronomes: !!document.getElementById('pf-pron') };
    /* mexer NÃO pode aplicar: só o SALVAR grava */
    const antes = perfilMeu().fundo;
    document.querySelector('[data-campo="fundo"][data-id="aurora"]').click();
    await new Promise(x => setTimeout(x, 200));
    r.soMexeuNaoSalvou = perfilMeu().fundo === antes;
    document.getElementById('pf-salvar').click();
    await new Promise(x => setTimeout(x, 300));
    r.salvou = perfilMeu().fundo;
    return r;
  });

  /* =====================================================================
     PRESENÇA: estar aqui, estar fora, e não querer ser incomodado
     ===================================================================== */
  out.presenca = await a.evaluate(async () => {
    const r = { estados: PRESENCAS.map(x => x.id) };
    presencaTrocar('online');
    /* AUSENTE entra sozinho: ninguém lembra de marcar */
    presencaUltimoToque = Date.now() - 6 * 60000;
    r.parado = presencaAgora();
    presencaAcordar();
    r.voltou = presencaAgora();
    /* NÃO PERTURBE cala o número vermelho, que é a interrupção de verdade */
    EST.visto = {}; EST.ultimas = { 'canal:geral': Date.now() };
    r.seloNormal = estSeloGeral();
    presencaTrocar('ocupado');
    r.seloOcupado = estSeloGeral();
    r.deixaIncomodar = podeIncomodar('canal:geral');
    presencaTrocar('online');
    /* SILENCIAR um canal some com o aviso dele, e só dele */
    EST.visto = {}; EST.ultimas = { 'canal:geral': Date.now(), 'canal:trocas': Date.now() };
    r.antesDeCalar = estSeloGeral();
    silenciar('canal:geral', '1h');
    r.depoisDeCalar = estSeloGeral();
    r.ficouMudo = silenciado('canal:geral');
    silenciar('canal:geral', null);
    r.religou = estSeloGeral();
    /* INVISÍVEL: a nuvem tem que receber um relógio velho, senão qualquer
       um lendo o banco vê a pessoa ali */
    presencaTrocar('invisivel');
    await nuvemEnviar(true);
    await new Promise(x => setTimeout(x, 600));
    const ficha = await nuvemReq('pilotos/' + meuIdNuvem());
    r.invisivel = { atrasoSegundos: Math.round((Date.now() - (ficha.atualizado || 0)) / 1000),
                    pareceForaDoAr: (Date.now() - (ficha.atualizado || 0)) > 70000 };
    presencaTrocar('online');
    /* RECADO com prazo */
    recadoDefinir('jogando a maratona', '1h', '🔥');
    const rec = recadoMeu();
    r.recado = { txt: rec.txt, emoji: rec.emoji, valePrazo: rec.ate > Date.now() };
    save.recado.ate = Date.now() - 1000;
    r.recadoVenceu = recadoMeu() === null;
    recadoDefinir('na arena', '0', '🚀');
    estPintar();
    r.barra = { existe: !!document.querySelector('.est-eu'),
                estado: (document.querySelector('.est-eu-txt em') || {}).textContent };
    document.getElementById('est-eu-status').click();
    await new Promise(x => setTimeout(x, 250));
    r.seletor = { opcoes: document.querySelectorAll('[data-pres]').length,
                  prazos: document.querySelectorAll('[data-prazo]').length };
    estFecharJanela();
    recadoDefinir('');
    return r;
  });

  /* ---- MENSAGENS DIRETAS têm lugar próprio ---- */
  out.dms = await a.evaluate(async () => {
    await estAbrir({ tipo: 'dms', id: 'tudo' });
    await new Promise(r => setTimeout(r, 900));
    return { naBarra: !!document.querySelector('[data-dest="dms|tudo"]'),
             linhas: document.querySelectorAll('#est-msgs .est-dm').length,
             previa: (document.querySelector('.est-dm-txt em') || {}).textContent,
             semBarra: getComputedStyle(document.querySelector('.est-barra')).display === 'none',
             semFluxo: EST.fluxo === null };
  });

  /* ---- A TELA DE AMIGOS ---- */
  out.telaAmigos = await a.evaluate(async () => {
    await estAbrir({ tipo: 'amigos', id: 'tudo' });
    await new Promise(r => setTimeout(r, 500));
    const abas = [...document.querySelectorAll('[data-abam]')].map(x => x.getAttribute('data-abam'));
    const semBarra = getComputedStyle(document.querySelector('.est-barra')).display === 'none';
    estAbaAmigos = 'tudo'; estPintar();
    const linhas = document.querySelectorAll('#est-msgs .est-amigo').length;
    const acoes = [...document.querySelectorAll('.est-amigo-acoes .est-ac')].length;
    estAbaAmigos = 'adicionar'; estPintar();
    const temCampo = !!document.getElementById('est-add-nome');
    estAbaAmigos = 'bloqueados'; estPintar();
    const bloqueados = document.querySelectorAll('#est-msgs .est-amigo').length;
    estAbaAmigos = 'online'; estPintar();
    return { abas, semBarra, linhas, acoes, temCampo, bloqueados,
             /* a tela de amigos não é conversa: não pode gastar o fluxo */
             semFluxo: EST.fluxo === null };
  });

  /* =====================================================================
     SERVIDORES: cargos, permissões, moderação, impulsos e registro
     ===================================================================== */
  out.servidores = await a.evaluate(async id => {
    const r = { perms: PERMS.length,
                familias: PERM_FAMILIAS.map(f => PERMS.filter(p => p.g === f.id).length) };
    const sid = await srvCriar('Esquadrao de Teste', 'jogo', false);
    if (!sid) return Object.assign(r, { criou: false });
    r.criou = true; r.sid = sid;
    await srvCarregarMeus();
    await srvAbrir(sid);
    r.nasceu = { canais: Object.keys(SRV.canais).length,
                 cargos: Object.keys(SRV.cargos).length,
                 membros: Object.keys(SRV.membros).length,
                 souDono: SRV.aberto.dono === estEu().id };
    /* o cargo BASE vale para todo mundo sem estar na ficha de ninguém:
       sem isto o servidor nasce mudo, porque membro novo não tem cargo */
    r.membroNovoFala = srvPode('falar', estEu().id);
    r.convite = await srvCriarConvite(sid, Object.keys(SRV.canais)[0], '1d', '0');
    return r;
  }, idTito);

  out.servidores2 = await t.evaluate(async cod => {
    const r = await srvEntrarPorConvite(cod);
    if (!r.ok) return { entrou: false, msg: r.msg };
    await srvCarregarMeus();
    await srvAbrir(r.sid);
    return { entrou: true, membros: Object.keys(SRV.membros).length,
             /* quem acabou de entrar já pode conversar */
             podeFalar: srvPode('falar'), podeBanir: srvPode('banir') };
  }, out.servidores.convite);

  out.servidores3 = await a.evaluate(async sid => {
    await srvAbrir(sid);
    const tito = Object.keys(SRV.membros).filter(u => SRV.membros[u].nome === 'Tito')[0];
    const rid = await srvCargoCriar(sid, 'moderador', '#FF4D8F', '🛡');
    SRV.cargos[rid].perms = { expulsar: true, castigar: true };
    SRV.cargos[rid].ordem = 5;
    await srvCargoSalvar(sid, rid);
    await srvDarCargo(sid, tito, rid, true);
    const r = {
      /* o cargo dá SÓ o que foi marcado */
      titoExpulsa: srvPode('expulsar', tito), titoBane: srvPode('banir', tito),
      /* castigo cala mas não cega */
      falavaAntes: srvPode('falar', tito)
    };
    await srvCastigar(sid, tito, 'Tito', '1h');
    r.calado = !srvPode('falar', tito);
    r.continuaVendo = srvPode('verCanal', tito);
    await srvCastigar(sid, tito, 'Tito', null);
    r.voltouAFalar = srvPode('falar', tito);
    /* impulsos: Ouro dá 3, e 2 já sobem o servidor para o nível 1 */
    save.neo = { nivel: 'ouro', ate: Date.now() + 30 * 86400000 };
    save.impulsos = {};
    r.meusImpulsos = impulsosQueTenho().total;
    await srvImpulsionar(sid, true);
    await srvImpulsionar(sid, true);
    await srvAbrir(sid);
    r.nivelCom2 = nivelDoServidor(SRV.aberto).nivel;
    r.emojisCom2 = espacosDeEmoji(SRV.aberto);
    /* a tag custa 3 impulsos: com 2 tem que recusar */
    r.tagCom2 = await srvDefinirTag(sid, 'NEON');
    await srvImpulsionar(sid, true);
    await srvAbrir(sid);
    r.tagCom3 = await srvDefinirTag(sid, 'ne on!x');   // só letras, 5 no máximo
    r.tag = SRV.aberto.tag;
    /* banir tira e impede de voltar, e tudo fica no registro */
    await srvBanir(sid, tito, 'Tito', 'teste');
    const ban = await nuvemReq('servidores/' + sid + '/banidos');
    const aud = await nuvemReq('servidores/' + sid + '/auditoria');
    r.banidos = Object.keys(ban || {}).length;
    r.registros = Object.keys(aud || {}).length;
    r.registroTemBanir = Object.keys(aud || {}).some(k => aud[k].acao === 'baniu');
    return r;
  }, out.servidores.sid);

  out.servidores4 = await t.evaluate(async arg => {
    const r = await srvEntrarPorConvite(arg.cod);
    return { recusou: !r.ok, msg: r.msg };
  }, { cod: out.servidores.convite });

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
    /* A GAVETA ABRE POR CIMA DO PRÓPRIO ☰, então o segundo toque nunca
       chegava nele: abria e não fechava mais. Três saídas agora, e o
       teste cobra as três. */
    document.getElementById('est-lado-x').click();
    const fechaNoX = getComputedStyle(lado).display === 'none';
    document.getElementById('est-abrir-lado').click();
    document.getElementById('est-veu').click();
    const fechaTocandoFora = getComputedStyle(lado).display === 'none';
    document.getElementById('est-abrir-lado').click();
    document.querySelector('#est-lado [data-dest]').click();
    const fechaAoEscolher = getComputedStyle(lado).display === 'none';
    est.classList.remove('lado-aberto');
    return { colide, fora, pequenos, gavetaFechada, gavetaAbre,
             fechaNoX, fechaTocandoFora, fechaAoEscolher,
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
  /* a tecla não pode roubar a letra de quem está escrevendo.
     Num CANAL, de propósito: na tela de amigos a barra de escrever nem
     existe, e focar um campo escondido não foca nada -- o teste passaria
     a medir outra coisa sem ninguém perceber. */
  out.teclaNoCampo = await a.evaluate(async () => {
    estacaoAbrir();
    await estAbrir({ tipo: 'canal', id: 'geral', nome: 'geral' });
    await new Promise(r => setTimeout(r, 500));
    const campo = document.getElementById('est-campo');
    campo.focus();
    const focado = document.activeElement === campo;
    const antes = EST.aberta;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true }));
    return { focado, antes, depois: EST.aberta };
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
  const N = out.neo;
  if (N.comeca !== 'nenhum') erro('a conta nova ja nasce com NeoNebula');
  if (N.entregou.nivel !== 'ouro') erro('a entrega automatica nao deu o nivel');
  if (N.entregou.dias < 29) erro('a entrega deu ' + N.entregou.dias + ' dias em vez de 30');
  if (!N.entregou.avisou) erro('a entrega nao avisa o jogador do que ele ganhou');
  if (N.recusouOPago.cor || N.recusouOPago.efeito !== 'nenhum' || N.recusouOPago.fundo !== 'vazio')
    erro('com Bronze deu para salvar coisa de Ouro: ' + JSON.stringify(N.recusouOPago));
  if (N.aceitouODoNivel !== 'verde') erro('nem o que o nivel permite foi aceito');
  if (!N.valendo.cor || !N.valendo.efeito) erro('com Ouro a cor e o efeito nao valeram');
  if (N.vencido.cor || N.vencido.efeito) erro('a assinatura venceu e o nome continuou enfeitado');
  if (N.vencido.guardado !== 'branco') erro('vencer apagou a ESCOLHA: renovar nao traria de volta');
  if (N.vencido.nivel !== 'nenhum') erro('o nivel nao caiu ao vencer');
  if (N.estranho.cor || N.estranho.efeito) erro('perfil inventado de estranho passou para a tela');
  if (N.estranho.fundo !== 'vazio') erro('fundo inexistente de estranho nao caiu no padrao');
  if (N.mentiroso.cor || N.mentiroso.efeito)
    erro('quem diz ser Ouro sem ser ganhou o enfeite de Ouro');
  if (N.niveis.join() !== 'bronze,prata,ouro,ilimitado') erro('os niveis sao ' + N.niveis.join());
  if (N.precos.join() !== '0.5,1,3') erro('os precos sao ' + N.precos.join());
  const P = out.perfil;
  if (!P.clicavel) erro('o nome no bate-papo nao abre o perfil');
  if (!/color:/.test(P.nomePintado || '')) erro('a cor do NeoNebula nao pintou o nome');
  if (!P.temEfeito) erro('o efeito do nome nao chegou ao bate-papo');
  if (!P.temSelo) erro('falta o selo do NeoNebula do lado do nome');
  if (!P.cartao.abriu) erro('o cartao de perfil nao abriu');
  if (!/piloto de teste/.test(P.cartao.bio || '')) erro('a bio nao aparece no cartao');
  if (!/ele\/dele/.test(P.cartao.pronomes || '')) erro('os pronomes nao aparecem');
  if (!P.cartao.temEditar) erro('no MEU perfil falta o botao de editar');
  if (P.editor.opcoes < 30) erro('o editor tem so ' + P.editor.opcoes + ' opcoes');
  if (!P.editor.temSalvar || !P.editor.temBio || !P.editor.temPronomes)
    erro('falta campo no editor de perfil');
  if (!P.soMexeuNaoSalvou) erro('mexer no editor ja aplicou: tinha que esperar o SALVAR');
  if (P.salvou !== 'aurora') erro('o SALVAR nao gravou a escolha');
  const PR = out.presenca;
  if (PR.estados.join() !== 'online,ausente,ocupado,invisivel')
    erro('os estados de presenca sao ' + PR.estados.join());
  if (PR.parado !== 'ausente') erro('cinco minutos parado nao virou AUSENTE sozinho');
  if (PR.voltou !== 'online') erro('tocar na tela nao tirou o AUSENTE');
  if (!PR.seloNormal) erro('o teste nao conseguiu gerar um aviso para medir');
  if (PR.seloOcupado) erro('NAO PERTURBE nao calou o numero de nao lidas');
  if (PR.deixaIncomodar !== false && PR.deixaIncomodar !== true)
    erro('podeIncomodar nao respondeu');
  if (PR.depoisDeCalar >= PR.antesDeCalar) erro('silenciar o canal nao tirou o aviso dele');
  if (!PR.ficouMudo) erro('o canal nao ficou silenciado');
  if (PR.religou !== PR.antesDeCalar) erro('religar nao devolveu o aviso');
  if (!PR.invisivel.pareceForaDoAr)
    erro('INVISIVEL mandou relogio de agora: qualquer um lendo o banco veria a pessoa online');
  if (PR.invisivel.atrasoSegundos < 70) erro('o relogio do invisivel atrasou so ' +
      PR.invisivel.atrasoSegundos + 's; o jogo considera online ate 70s');
  if (PR.recado.txt !== 'jogando a maratona' || PR.recado.emoji !== '🔥')
    erro('o recado nao guardou o texto e o emoji');
  if (!PR.recado.valePrazo) erro('o recado de 1 hora nasceu sem prazo');
  if (!PR.recadoVenceu) erro('o recado nao some quando o prazo acaba');
  if (!PR.barra.existe) erro('falta a barra do proprio piloto na lista');
  if (!/na arena/.test(PR.barra.estado || '')) erro('o recado nao aparece na barra do piloto');
  if (PR.seletor.opcoes !== 4) erro('o seletor tem ' + PR.seletor.opcoes + ' estados');
  if (PR.seletor.prazos < 4) erro('faltam prazos de recado no seletor');
  const D = out.dms;
  if (!D.naBarra) erro('MENSAGENS DIRETAS nao aparece na barra');
  if (!D.linhas) erro('a area de mensagens diretas nao lista as conversas');
  if (!D.semBarra) erro('a barra de escrever aparece na lista de conversas');
  if (!D.semFluxo) erro('a lista de conversas gastou o fluxo');
  const S1 = out.servidores, S2 = out.servidores2, S3 = out.servidores3, S4 = out.servidores4;
  if (S1.perms !== 50) erro('sao ' + S1.perms + ' permissoes; o pedido era 50');
  if (S1.familias.join() !== '10,10,10,10,10')
    erro('as familias de permissao tem ' + S1.familias.join() + ' em vez de 10 cada');
  if (!S1.criou) erro('nao deu para criar o servidor');
  if (S1.nasceu.canais < 3) erro('o servidor nasceu com ' + S1.nasceu.canais + ' canais');
  if (!S1.nasceu.souDono) erro('quem criou nao ficou dono');
  if (!S1.membroNovoFala) erro('o servidor nasce MUDO: o cargo base nao vale para todo mundo');
  if (!S1.convite) erro('nao deu para criar convite');
  if (!S2.entrou) erro('nao deu para entrar pelo convite: ' + S2.msg);
  if (S2.membros !== 2) erro('o servidor ficou com ' + S2.membros + ' membros');
  if (!S2.podeFalar) erro('quem entrou nao pode nem conversar');
  if (S2.podeBanir) erro('quem acabou de entrar ja pode BANIR');
  if (!S3.titoExpulsa) erro('o cargo nao deu a permissao marcada');
  if (S3.titoBane) erro('o cargo deu uma permissao que NAO foi marcada');
  if (!S3.falavaAntes) erro('o membro com cargo perdeu o direito de falar');
  if (!S3.calado) erro('castigo nao calou');
  if (!S3.continuaVendo) erro('castigo cegou a pessoa: castigo e ficar de fora da conversa');
  if (!S3.voltouAFalar) erro('tirar o castigo nao devolveu a fala');
  if (S3.meusImpulsos !== 3) erro('Ouro deu ' + S3.meusImpulsos + ' impulsos em vez de 3');
  if (S3.nivelCom2 !== 1) erro('2 impulsos deviam dar nivel 1, deram ' + S3.nivelCom2);
  if (S3.emojisCom2 !== 70) erro('nivel 1 devia abrir 70 espacos de emoji');
  if (S3.tagCom2) erro('a tag saiu com 2 impulsos; ela custa 3');
  if (!S3.tagCom3) erro('a tag nao saiu nem com 3 impulsos');
  if (S3.tag !== 'NEONX') erro('a tag virou "' + S3.tag + '"; devia limpar e cortar em 5');
  if (S3.banidos !== 1) erro('o banimento nao entrou na lista');
  if (!S3.registroTemBanir) erro('banir nao foi para o registro de auditoria');
  if (S3.registros < 5) erro('o registro tem so ' + S3.registros + ' linhas');
  if (!S4.recusou) erro('quem foi BANIDO conseguiu voltar pelo convite');
  const TA = out.telaAmigos;
  if (TA.abas.join() !== 'online,tudo,pendentes,bloqueados,adicionar')
    erro('as abas da tela de amigos sao ' + TA.abas.join());
  if (!TA.semBarra) erro('a barra de escrever aparece na tela de amigos, onde nao ha para quem');
  if (!TA.linhas) erro('a tela de amigos nao lista o amigo');
  if (TA.acoes < 3) erro('faltam acoes (conversar, ligar, mais) na linha do amigo');
  if (!TA.temCampo) erro('a aba ADICIONAR nao tem campo para o nick');
  if (!TA.semFluxo) erro('a tela de amigos gastou o fluxo, que e o unico que temos');
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
  if (!C.fechaNoX) erro('a gaveta nao fecha no X: abre e nao volta mais');
  if (!C.fechaTocandoFora) erro('tocar fora nao fecha a gaveta');
  if (!C.fechaAoEscolher) erro('escolher um canal nao fecha a gaveta');
  if (!C.botaoDaGaveta) erro('no celular falta o botao que abre a gaveta');
  if (out.fechou.aberta) erro('fechar nao fechou');
  if (!out.fechou.fluxoSolto) erro('fechar NAO soltou o fluxo: a conexao fica presa a toa');
  if (out.fechou.relogio !== true && out.fechou.relogio !== null) erro('fechar nao parou o relogio');
  if (out.fechou.vivos > 0) erro('depois de fechar sobraram ' + out.fechou.vivos + ' fluxos');
  if (!out.tecla) erro('a tecla C nao abriu a estacao');
  if (!out.escFecha) erro('o Esc nao fechou');
  if (!out.teclaNoCampo.focado) erro('o teste nao conseguiu focar o campo de escrever');
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
