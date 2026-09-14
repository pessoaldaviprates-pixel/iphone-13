/* =====================================================================
   TODO BOTÃO DA ESTAÇÃO FAZ ALGUMA COISA

   Foi um pedido direto: "ajuste todos os bugs de botões". A forma
   honesta de responder a isso não é sair clicando na mão e jurar que
   olhou tudo -- é um teste que aperta CADA botão visível e cobra três
   coisas de cada um:

     1. não estoura (nenhum erro de página, nenhum erro de console)
     2. faz alguma coisa: ou muda a tela, ou abre uma janela, ou escreve
        um aviso. Botão que não faz nada é o pior tipo de bug, porque
        parece que o jogo travou e a pessoa clica mais três vezes
     3. dá para voltar: depois de apertar, a estação continua de pé e o
        próximo botão ainda dá para apertar

   E cobre também o que foi guardado: com os servidores desligados, o +
   de criar servidor NÃO pode estar na tela. Botão que abre uma janela
   para gravar num galho que o banco recusa é exatamente o bug que o
   dono relatou ("não está dando para criar servidores").
   ===================================================================== */
const path = require('path');
const { chromium } = require('playwright');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const URL = JOGO + '?nuvem=http://127.0.0.1:8099';

/* botões que a gente NÃO aperta, e por quê */
const NAO_APERTAR = [
  'est-fechar',      // fecha a estação: o teste acabaria no primeiro
  'est-lado-x',      // fecha a gaveta
  'est-flutua',
  'voz-sair'         // sair da voz é testado em test_voz.js
];

(async () => {
  const b = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream']
  });
  const out = {}; const errs = []; const problemas = [];
  const p = await b.newPage({ viewport: { width: 1280, height: 800 },
                              permissions: ['microphone'] });
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  p.on('console', m => {
    if (m.type() === 'error' && !m.text().includes('ERR_') && !m.text().includes('net::'))
      errs.push('CONSOLE: ' + m.text());
  });
  /* prompt() e confirm() travam a página parada para sempre num teste:
     respondem sozinhos, senão o primeiro botão que pergunta alguma coisa
     seria o último botão do teste */
  p.on('dialog', d => d.dismiss().catch(() => {}));

  await p.goto(URL);
  await p.waitForTimeout(1400);
  await p.evaluate(() => { const el = document.getElementById('abertura'); if (el) { el.className = ''; el.innerHTML = ''; } });
  await p.evaluate(() => {
    ROOT.profiles['Cr1cket'] = defaultSave(); ROOT.current = 'Cr1cket'; save = ROOT.profiles['Cr1cket'];
    save.__name = 'Cr1cket'; save.best = 40; save.crystals = 5000; save.tutorialFeito = true;
    calcStats(); persist(); goMenu();
  });
  await p.evaluate(() => idiomaUsar('pt'));
  await p.evaluate(() => nuvemEnviar(true));
  await p.waitForFunction(() => typeof EST !== 'undefined' && save.__name === 'Cr1cket', null, { timeout: 10000 });
  await p.waitForTimeout(600);

  /* LIMPA A NUVEM FALSA. Sem isto o teste herda o #geral da rodada
     anterior, e a lista do @ oferece gente de outro teste -- passava ou
     falhava conforme o que tinha rodado antes, que é o pior tipo de
     teste que existe. */
  await p.evaluate(async () => {
    for (const no of ['conversas', 'amigos']) await nuvemSoltar(no, null, 'DELETE');
    await nuvemEnviar(true);
  });
  await p.waitForTimeout(400);

  /* ---- 1. O QUE FOI GUARDADO NÃO PODE ESTAR NA TELA ---- */
  await p.evaluate(() => estacaoAbrir({ tipo: 'canal', id: 'geral', nome: 'geral' }));
  await p.waitForTimeout(900);
  out.guardado = await p.evaluate(() => ({
    servidoresLigados: SERVIDORES_LIGADOS,
    gruposLigados: GRUPOS_LIGADOS,
    /* nem o +, nem o título da seção: um título sem nada embaixo faz a
       pessoa procurar o botão que sumiu */
    temCriarServidor: !!document.getElementById('est-novo-srv'),
    temCriarGrupo: !!document.getElementById('est-novo-grupo'),
    falaEmServidor: /SERVIDORES/.test(document.getElementById('est-lado').textContent),
    /* e o que continua: canais, voz, amigos, conversas */
    temCanais: document.querySelectorAll('#est-lado [data-dest^="canal|"]').length,
    temVoz: document.querySelectorAll('#est-lado [data-voz]').length,
    temAmigos: !!document.querySelector('#est-lado [data-dest="amigos|tudo"]'),
    temDMs: !!document.querySelector('#est-lado [data-dest="dms|tudo"]')
  }));

  /* ---- 2. A BARRA DO PERFIL NÃO PODE SER TRANSPARENTE ---- */
  out.perfilOpaco = await p.evaluate(() => {
    const el = document.querySelector('.est-eu');
    if (!el) return { achou: false };
    const s = getComputedStyle(el);
    const fundo = s.backgroundColor + ' ' + s.backgroundImage;
    /* "transparent" ou rgba com alfa baixo deixa a lista passar POR
       BAIXO da barra, que é sticky -- e o cartão parece sujo */
    const m = /rgba?\(([^)]+)\)/.exec(s.backgroundColor);
    const alfa = m ? parseFloat((m[1].split(',')[3] || '1')) : 1;
    return { achou: true, fundo, alfa, temGradiente: s.backgroundImage !== 'none',
             gruda: s.position === 'sticky' };
  });

  /* ---- 3. A BUSCA DA BARRA ---- */
  out.busca = await p.evaluate(async () => {
    const c = document.getElementById('est-busca');
    if (!c) return { achou: false };
    const antes = document.querySelectorAll('#est-lado [data-dest],#est-lado [data-voz]').length;
    c.value = 'trocas'; c.dispatchEvent(new Event('input'));
    await new Promise(r => setTimeout(r, 200));
    const achou = document.querySelectorAll('#est-lado [data-dest],#est-lado [data-voz]').length;
    /* e a busca não pode roubar o foco de si mesma a cada letra */
    const focoFicou = document.activeElement && document.activeElement.id === 'est-busca';
    const c2 = document.getElementById('est-busca');
    c2.value = 'zzzznadaaqui'; c2.dispatchEvent(new Event('input'));
    await new Promise(r => setTimeout(r, 200));
    const vazio = document.getElementById('est-lado').textContent.indexOf('Nada com') >= 0;
    const c3 = document.getElementById('est-busca');
    c3.value = ''; c3.dispatchEvent(new Event('input'));
    await new Promise(r => setTimeout(r, 200));
    const voltou = document.querySelectorAll('#est-lado [data-dest],#est-lado [data-voz]').length;
    return { achou: true, antes, filtrou: achou, focoFicou, dizVazio: vazio, voltou };
  });

  /* ---- 4. O @ ABRE A LISTA ---- */
  /* AS MENSAGENS VÃO PARA A NUVEM, e não só para a tela: a releitura do
     canal troca EST.msgs pelo que está gravado, então mensagem injetada
     só na memória sumiria antes de o teste olhar. */
  await p.evaluate(async () => {
    const agora = Date.now();
    await nuvemSoltar('conversas/canal__geral/aa1',
      { de: 'outro1', nome: 'Lucas', txt: 'e ai galera', quando: agora - 2000 });
    await nuvemSoltar('conversas/canal__geral/aa2',
      { de: 'outro2', nome: 'Bia', txt: 'salve', quando: agora - 1000 });
    await estAbrir({ tipo: 'canal', id: 'geral', nome: 'geral' });
  });
  await p.waitForTimeout(900);
  out.arroba = await p.evaluate(async () => {
    const campo = document.getElementById('est-campo');
    campo.focus();
    campo.value = 'fala @';
    campo.setSelectionRange(6, 6);
    campo.dispatchEvent(new Event('input'));
    await new Promise(r => setTimeout(r, 200));
    const cx = document.getElementById('est-arroba');
    const r = { abriu: cx.classList.contains('on'),
                quantos: cx.querySelectorAll('[data-arroba]').length,
                nomes: [...cx.querySelectorAll('[data-arroba] strong')].map(x => x.textContent) };
    /* digitar filtra */
    campo.value = 'fala @lu';
    campo.setSelectionRange(8, 8);
    campo.dispatchEvent(new Event('input'));
    await new Promise(r2 => setTimeout(r2, 200));
    r.filtrou = [...document.querySelectorAll('#est-arroba [data-arroba] strong')].map(x => x.textContent);
    /* escolher completa o nome e fecha */
    arrobaEscolher(0);
    await new Promise(r2 => setTimeout(r2, 150));
    r.virou = document.getElementById('est-campo').value;
    r.fechou = !document.getElementById('est-arroba').classList.contains('on');
    /* sem @ nenhum, a lista não abre */
    const c2 = document.getElementById('est-campo');
    c2.value = 'sem arroba aqui';
    c2.setSelectionRange(15, 15);
    c2.dispatchEvent(new Event('input'));
    await new Promise(r2 => setTimeout(r2, 150));
    r.semArroba = document.getElementById('est-arroba').classList.contains('on');
    c2.value = '';
    return r;
  });

  /* ---- 4b. A MENSAGEM CHEGA INTEIRA ----
     escaparTexto() corta em 40 letras, porque foi escrita para apelido.
     A Estação usava ela no corpo da mensagem, e toda frase com mais de
     40 letras chegava do outro lado pela metade -- sem reticências, sem
     aviso, desde sempre. Este teste é o que impede a volta disso. */
  out.mensagemInteira = await p.evaluate(async () => {
    const txt = 'esta e uma mensagem bem comprida de proposito, com mais de ' +
                'cem letras, para provar que ela chega inteira do outro lado';
    await nuvemSoltar('conversas/canal__geral/zz9',
      { de: 'o9', nome: 'Marvin', txt, quando: Date.now() });
    await estAbrir({ tipo: 'canal', id: 'geral', nome: 'geral' });
    await new Promise(r => setTimeout(r, 700));
    estPintar(true);
    const el = [...document.querySelectorAll('#est-msgs .est-txt')]
      .filter(x => /esta e uma mensagem/.test(x.textContent))[0];
    return { mandei: txt.length, naTela: el ? el.textContent.length : 0,
             igual: !!el && el.textContent === txt };
  });

  /* ---- 5. A VOZ: eu sou dono de todas ---- */
  out.voz = await p.evaluate(async () => {
    const ok = await vozEntrar('ponte');
    return { entrou: ok, dono: vozSouDono(), donoDoJogo: vozSouDonoDoJogo(),
             /* o dono do jogo é dono mesmo em sala que ele não abriu */
             donoNaOutra: vozSouDono('hangar'),
             poderes: VOZ_PODERES.length,
             familias: VOZ_FAMILIAS.length,
             semRepetido: new Set(VOZ_PODERES.map(x => x.id)).size === VOZ_PODERES.length,
             porFamilia: VOZ_FAMILIAS.map(f => VOZ_PODERES.filter(x => x.g === f.id).length),
             /* todo poder tem que morar numa família que existe */
             todosEmFamilia: VOZ_PODERES.every(x => VOZ_FAMILIAS.some(f => f.id === x.g)),
             temEngrenagem: !!document.getElementById('voz-eng') };
  });
  out.painelVoz = await p.evaluate(async () => {
    vozAbrirPainel();
    await new Promise(r => setTimeout(r, 300));
    const cx = document.getElementById('est-janela');
    const r = { abriu: cx.classList.contains('on'),
                abas: cx.querySelectorAll('[data-vaba]').length,
                linhas: cx.querySelectorAll('.voz-poder').length };
    /* passeia pelas quatro famílias e conta que todas desenham */
    r.porAba = {};
    for (const f of VOZ_FAMILIAS) {
      vozAba = f.id; vozPintarPainel();
      r.porAba[f.id] = document.querySelectorAll('#voz-painel .voz-poder').length;
    }
    return r;
  });
  /* uma regra ligada tem que virar regra de verdade, não só tela */
  out.regra = await p.evaluate(async () => {
    await vozRegraDefinir('trancada', 1);
    const naNuvem = await nuvemReq('conversas/voz__ponte/regras/trancada');
    await vozRegraDefinir('limite', 4);
    const lim = vozRegra('limite');
    await vozRegraDefinir('trancada', 0);
    return { naNuvem, lim, voltou: vozRegra('trancada') };
  });
  /* e o porteiro tem que recusar de verdade quem não é dono */
  out.porteiro = await p.evaluate(async () => {
    await nuvemSoltar('conversas/voz__hangar/regras', { trancada: 1, dono: 'outro' });
    const eraDono = save.__name;
    save.__name = 'Zezinho';                     // deixa de ser o dono do jogo
    const motivo = await vozPorteiro('hangar');
    save.__name = eraDono;
    const comoDono = await vozPorteiro('hangar');
    await nuvemSoltar('conversas/voz__hangar/regras', null, 'DELETE');
    return { barrou: motivo, donoPassa: comoDono };
  });
  await p.evaluate(() => { estFecharJanela(); return vozSair(); });
  await p.waitForTimeout(500);

  /* =====================================================================
     6. AGORA O QUE INTERESSA: APERTA TUDO
     ===================================================================== */
  const ondeIr = [
    ['canal', () => estacaoAbrir({ tipo: 'canal', id: 'geral', nome: 'geral' })],
    ['amigos', () => estAbrir({ tipo: 'amigos', id: 'tudo', nome: 'Amigos' })],
    ['dms', () => estAbrir({ tipo: 'dms', id: 'tudo', nome: 'Mensagens diretas' })]
  ];
  out.apertou = {};
  for (const [nome] of ondeIr) out.apertou[nome] = { total: 0, mudos: [], estourou: [] };

  for (const [nome] of ondeIr) {
    await p.evaluate(n => {
      if (n === 'canal') estacaoAbrir({ tipo: 'canal', id: 'geral', nome: 'geral' });
      else estAbrir({ tipo: n, id: 'tudo', nome: n });
    }, nome);
    await p.waitForTimeout(700);

    const quantos = await p.evaluate(() =>
      [...document.querySelectorAll('#estacao button')]
        .filter(el => {
          const s = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
        }).length);

    for (let i = 0; i < quantos; i++) {
      const r = await p.evaluate(async ({ idx, proibidos }) => {
        const vis = [...document.querySelectorAll('#estacao button')].filter(el => {
          const s = getComputedStyle(el);
          const rc = el.getBoundingClientRect();
          return s.display !== 'none' && s.visibility !== 'hidden' && rc.width > 0 && rc.height > 0;
        });
        const el = vis[idx];
        if (!el) return null;
        const quem = el.id || el.getAttribute('aria-label') ||
                     (el.className || '').split(' ')[0] || 'sem-nome';
        if (proibidos.indexOf(el.id) >= 0) return { quem, pulou: true };
        /* TOCAR NO DESTINO ONDE VOCÊ JÁ ESTÁ é o único silêncio certo:
           a tela não muda porque não tem para onde ir. Não é bug, e
           cobrar barulho dele faria o teste pedir o errado. */
        if (el.classList.contains('on') &&
            (el.hasAttribute('data-dest') || el.hasAttribute('data-voz')))
          return { quem, pulou: true };
        const antesHTML = document.getElementById('estacao').innerHTML.length;
        const antesAviso = document.getElementById('est-aviso').textContent;
        const antesJanela = document.getElementById('est-janela').classList.contains('on');
        try { el.click(); } catch (e) { return { quem, estourou: e.message }; }
        await new Promise(x => setTimeout(x, 220));
        const depoisHTML = document.getElementById('estacao').innerHTML.length;
        const depoisAviso = document.getElementById('est-aviso').textContent;
        const depoisJanela = document.getElementById('est-janela').classList.contains('on');
        /* fez alguma coisa? mudou a tela, abriu janela, ou falou */
        const fez = depoisHTML !== antesHTML || depoisAviso !== antesAviso ||
                    depoisJanela !== antesJanela;
        /* volta para o mesmo lugar: janela aberta esconde os próximos */
        if (depoisJanela) estFecharJanela();
        return { quem, fez, aberta: !!document.getElementById('estacao').classList.contains('on') };
      }, { idx: i, proibidos: NAO_APERTAR });
      if (!r || r.pulou) continue;
      out.apertou[nome].total++;
      if (r.estourou) out.apertou[nome].estourou.push(r.quem + ': ' + r.estourou);
      else if (!r.fez) out.apertou[nome].mudos.push(r.quem);
      if (r && r.aberta === false) {
        await p.evaluate(() => estacaoAbrir());
        await p.waitForTimeout(300);
      }
    }
  }

  /* ---- 7. e a estação continua de pé depois de tudo isso ---- */
  out.depoisDeTudo = await p.evaluate(() => ({
    aberta: EST.aberta,
    barraLateral: document.querySelectorAll('#est-lado [data-dest],#est-lado [data-voz]').length,
    campo: !!document.getElementById('est-campo')
  }));
  await p.evaluate(() => estacaoFechar());
  await p.waitForTimeout(300);
  out.fechou = await p.evaluate(() => ({ aberta: EST.aberta, fluxo: EST.fluxo === null }));

  await b.close();
  const erro = m => problemas.push(m);

  const G = out.guardado;
  if (G.servidoresLigados) erro('SERVIDORES_LIGADOS devia estar desligado');
  if (G.gruposLigados) erro('GRUPOS_LIGADOS devia estar desligado');
  if (G.temCriarServidor)
    erro('o + de CRIAR SERVIDOR continua na tela: era esse o botao que nao fazia nada');
  if (G.temCriarGrupo) erro('o + de CRIAR GRUPO continua na tela');
  if (G.falaEmServidor) erro('a barra ainda tem a secao MEUS SERVIDORES');
  if (G.temCanais < 3) erro('sumiram canais de texto: sobraram ' + G.temCanais);
  if (!G.temVoz) erro('sumiram as salas de voz');
  if (!G.temAmigos) erro('sumiu o botao AMIGOS');
  if (!G.temDMs) erro('sumiu o botao MENSAGENS DIRETAS');

  const P = out.perfilOpaco;
  if (!P.achou) erro('nao achei a barra do proprio perfil');
  else {
    if (!P.gruda) erro('a barra do perfil devia ficar grudada embaixo');
    if (!P.temGradiente && P.alfa < 0.9)
      erro('a barra do perfil continua transparente (alfa ' + P.alfa + ')');
  }

  const B = out.busca;
  if (!B.achou) erro('nao tem busca na barra lateral');
  else {
    if (B.filtrou >= B.antes) erro('a busca nao filtrou nada (' + B.antes + ' -> ' + B.filtrou + ')');
    if (!B.filtrou) erro('a busca por "trocas" nao achou o canal de trocas');
    if (!B.focoFicou) erro('a busca perde o foco a cada letra: a segunda letra some');
    if (!B.dizVazio) erro('busca sem resultado nao avisa que nao achou nada');
    if (B.voltou !== B.antes) erro('limpar a busca nao devolveu a lista inteira');
  }

  const A = out.arroba;
  if (!A.abriu) erro('digitar @ NAO abriu a lista de quem da para marcar');
  if (!A.quantos) erro('a lista do @ abriu vazia');
  if (A.nomes.indexOf('@Lucas') < 0 && A.nomes.indexOf('@Bia') < 0)
    erro('a lista do @ nao oferece quem falou no canal: ' + A.nomes.join(','));
  if (A.filtrou.length && A.filtrou.some(n => !/lu/i.test(n)))
    erro('digitar "@lu" nao filtrou: veio ' + A.filtrou.join(','));
  if (!/@\w/.test(A.virou)) erro('escolher na lista nao escreveu o nome: "' + A.virou + '"');
  if (!A.fechou) erro('escolher na lista nao fechou a lista');
  if (A.semArroba) erro('a lista do @ abriu sem ter @ nenhum');

  const MI = out.mensagemInteira;
  if (!MI.naTela) erro('a mensagem comprida nao apareceu na tela');
  else if (!MI.igual)
    erro('a mensagem chegou CORTADA: mandei ' + MI.mandei + ' letras e apareceram ' + MI.naTela);

  const V = out.voz;
  if (!V.entrou) erro('nao deu para entrar na sala de voz');
  if (!V.donoDoJogo) erro('o Cr1cket nao foi reconhecido como dono do jogo');
  if (!V.dono) erro('o dono do jogo nao e dono da sala em que entrou');
  if (!V.donoNaOutra) erro('o dono do jogo devia ser dono de TODAS as salas');
  if (V.poderes !== 40) erro('sao ' + V.poderes + ' poderes, e o combinado eram 40');
  if (!V.semRepetido) erro('tem poder repetido na lista');
  if (!V.todosEmFamilia) erro('tem poder numa familia que nao existe');
  if (V.porFamilia.some(n => n !== 10))
    erro('as familias nao tem 10 cada: ' + V.porFamilia.join(','));
  if (!V.temEngrenagem) erro('o dono nao tem o botao de mandar na sala');

  const PV = out.painelVoz;
  if (!PV.abriu) erro('o painel do dono da sala nao abriu');
  if (PV.abas !== 4) erro('o painel abriu com ' + PV.abas + ' abas');
  for (const f in PV.porAba)
    if (PV.porAba[f] !== 10) erro('a aba ' + f + ' desenhou ' + PV.porAba[f] + ' poderes');

  if (out.regra.naNuvem !== 1) erro('ligar uma regra nao gravou na nuvem');
  if (out.regra.lim !== 4) erro('mudar um numero nao pegou');
  if (out.regra.voltou !== 0) erro('desligar a regra nao desligou');
  if (!out.porteiro.barrou) erro('a sala trancada deixou entrar quem nao e dono');
  if (out.porteiro.donoPassa) erro('a sala trancada barrou o DONO DO JOGO, que entra em tudo');

  for (const onde in out.apertou) {
    const r = out.apertou[onde];
    if (!r.total) erro('em ' + onde + ' nao achei botao nenhum para apertar');
    if (r.estourou.length) erro('em ' + onde + ', botao que ESTOUROU: ' + r.estourou.join(' | '));
    if (r.mudos.length) erro('em ' + onde + ', botao que nao faz nada: ' + r.mudos.join(', '));
  }

  if (!out.depoisDeTudo.aberta) erro('a estacao nao sobreviveu a apertar tudo');
  if (!out.depoisDeTudo.barraLateral) erro('a barra lateral ficou vazia depois de apertar tudo');
  if (!out.depoisDeTudo.campo) erro('sumiu o campo de escrever');
  if (out.fechou.aberta) erro('fechar nao fechou');
  if (!out.fechou.fluxo) erro('fechar nao soltou o fluxo');
  if (errs.length) erro('erros de pagina: ' + errs.join(' | '));

  console.log(JSON.stringify(out, null, 1));
  if (problemas.length) { console.log('FALHOU: ' + problemas.join('; ')); process.exit(1); }
  console.log('OK: todo botao da estacao faz alguma coisa, e o que foi guardado sumiu direito');
})().catch(e => { console.log('FATAL ' + e.message.split('\n')[0]); process.exit(1); });
