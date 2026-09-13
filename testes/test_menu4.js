/* =====================================================================
   v8.2 — O MENU SINCRONIZADO

   A v7.0 comprimiu 19 botões em quatro portas. Arrumou a tela e criou
   outro problema: tem gente que não ACHA as coisas. Este teste cobra as
   duas metades do conserto:

   1. tudo com a mesma cara e no lugar que a pessoa imagina — JOGAR reúne
      todos os jeitos de entrar numa partida;
   2. uma busca, porque menu comprimido sem busca é só esconder melhor.

   E cobra o que nenhuma reorganização pode quebrar: NENHUM destino pode
   ficar inalcançável. Organizar não é sumir.
   ===================================================================== */
const path = require('path');
const { chromium } = require('playwright');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const out = {}; const errs = []; const problemas = [];
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_')) errs.push('CONSOLE: ' + m.text()); });
  await p.goto(JOGO + '?nuvem=http://127.0.0.1:8099');
  await p.waitForTimeout(1500);
  await p.evaluate(() => { const el = document.getElementById('abertura'); if (el) { el.className = ''; el.innerHTML = ''; } });
  await p.evaluate(() => {
    ROOT.profiles['Davi'] = defaultSave(); ROOT.current = 'Davi';
    save = ROOT.profiles['Davi']; save.__name = 'Davi'; save.best = 40;
    save.crystals = 5000; save.tutorialFeito = true;
    calcStats(); persist(); goMenu();
  });
  await p.waitForTimeout(900);
  await p.evaluate(() => idiomaUsar('pt'));

  /* ---- JOGAR abre a porta com TODOS os jeitos de jogar ---- */
  await p.tap('#btn-play');
  await p.waitForTimeout(500);
  out.jogar = await p.evaluate(() => ({
    modo: S.mode,
    titulo: document.getElementById('porta-titulo').textContent,
    linhas: [...document.querySelectorAll('#porta-corpo [data-ir]')].map(e => e.getAttribute('data-ir')),
    nomes: [...document.querySelectorAll('#porta-corpo .porta-txt strong')].map(e => e.textContent)
  }));

  /* ---- a JORNADA continua entrando nas fases ---- */
  await p.evaluate(() => document.querySelector('[data-ir="btn-jornada"]').click());
  await p.waitForTimeout(900);
  out.jornada = await p.evaluate(() => ({ modo: S.mode, fases: document.querySelectorAll('.fase-btn').length }));

  /* ---- NADA pode ficar inalcançável ----
     Passeia por todas as portas e junta o que apareceu. O que o jogo
     esconde de propósito (a exploração guardada, a loja desligada) não
     conta; o resto tem que estar em alguma porta. */
  await p.evaluate(() => goMenu());
  await p.waitForTimeout(400);
  out.cobertura = await p.evaluate(async () => {
    const achados = new Set(), esperados = [], porPorta = {};
    for (const porta of PORTAS) {
      if (porta.id === 'loja' && !lojaDeDinheiroLigada()) continue;
      if (porta.direto) { esperados.push(porta.direto); achados.add(porta.direto); continue; }
      for (const it of porta.itens) if (portaItemVisivel(it)) esperados.push(it.botao);
      portaAbrir(porta.id);
      await new Promise(r => setTimeout(r, 60));
      const vistos = [...document.querySelectorAll('#porta-corpo [data-ir]')].map(e => e.getAttribute('data-ir'));
      porPorta[porta.id] = vistos.length;
      vistos.forEach(x => achados.add(x));
    }
    goMenu();
    return { esperados: esperados.length, achados: achados.size, porPorta,
             faltando: esperados.filter(x => !achados.has(x)) };
  });

  /* ---- as portas do menu ---- */
  out.portasNoMenu = await p.evaluate(() => ({
    quantas: document.querySelectorAll('#menu-portas [data-porta]').length,
    quais: [...document.querySelectorAll('#menu-portas [data-porta]')].map(e => e.getAttribute('data-porta')),
    /* JOGAR não se repete na fileira: ela já é o botão grande do topo */
    jogarRepetida: !!document.querySelector('#menu-portas [data-porta="jogar"]')
  }));

  /* ---- A BUSCA ---- */
  const buscar = termo => p.evaluate(t => {
    const c = document.getElementById('menu-busca');
    c.value = t; c.dispatchEvent(new Event('input'));
    return {
      achados: [...document.querySelectorAll('#menu-achados [data-ir]')].map(e => e.getAttribute('data-ir')),
      /* enquanto procura, as portas saem da frente */
      portasVisiveis: getComputedStyle(document.getElementById('menu-portas')).display !== 'none',
      /* a linha diz em que porta a coisa mora: leva E ensina o caminho */
      dizOnde: [...document.querySelectorAll('#menu-achados .porta-txt em')].map(e => e.textContent)
    };
  }, termo);

  out.busca = {};
  out.busca.peloNome   = await buscar('arena');
  out.busca.pelaFrase  = await buscar('duelo');      // mora na frase do "jogar com amigo"
  out.busca.semAcento  = await buscar('habilidade'); // a linha é "Habilidades"
  out.busca.maiuscula  = await buscar('CHEFE');
  out.busca.semNada    = await buscar('xyzabc');
  out.busca.limpa      = await p.evaluate(() => {
    document.getElementById('menu-busca-x').click();
    return {
      campo: document.getElementById('menu-busca').value,
      portasVisiveis: getComputedStyle(document.getElementById('menu-portas')).display !== 'none',
      achadosVisiveis: getComputedStyle(document.getElementById('menu-achados')).display !== 'none'
    };
  });

  /* ---- a busca LEVA mesmo ---- */
  await buscar('arena');
  await p.waitForTimeout(200);
  await p.evaluate(() => document.querySelector('#menu-achados [data-ir]').click());
  await p.waitForTimeout(900);
  out.buscaLeva = await p.evaluate(() => S.mode);

  /* ---- voltando ao menu a busca começa limpa ---- */
  await p.evaluate(() => { goMenu(); });
  await p.waitForTimeout(500);
  out.voltou = await p.evaluate(() => ({
    campo: document.getElementById('menu-busca').value,
    portas: document.querySelectorAll('#menu-portas [data-porta]').length
  }));

  /* ---- o menu ainda CABE ----
     O botão de AJUSTES já sumiu uma vez por o menu estourar a tela. A
     busca custa altura, então isto não é zelo: é a mesma falha de novo
     esperando acontecer. Mede a borda de baixo do último elemento, que é
     o que o dedo alcança -- o scrollHeight da .screen mente. */
  out.cabe = await p.evaluate(() => {
    const tela = document.getElementById('screen-menu');
    const chips = tela.querySelector('.menu-chips:not(.escondida)');
    const aj = document.getElementById('btn-ajustes');
    const r = aj.getBoundingClientRect();
    return { fundoChips: Math.round(chips.getBoundingClientRect().bottom),
             ajustes: Math.round(r.bottom), altura: Math.round(r.height),
             tela: innerHeight, rola: tela.classList.contains('menu-rola') };
  });

  /* ---- tela pequena: o menu tem que se virar ---- */
  await p.setViewportSize({ width: 360, height: 640 });
  await p.evaluate(() => { goMenu(); refreshMenu(); showScreen('menu'); });
  await p.waitForTimeout(700);
  out.telinha = await p.evaluate(() => {
    const aj = document.getElementById('btn-ajustes');
    const r = aj.getBoundingClientRect();
    const tela = document.getElementById('screen-menu');
    return { ajustesEmbaixo: Math.round(r.bottom), tela: innerHeight,
             rola: tela.classList.contains('menu-rola'),
             buscaVisivel: getComputedStyle(document.querySelector('.menu-busca-cx')).display !== 'none' };
  });
  await p.setViewportSize({ width: 390, height: 844 });
  await p.waitForTimeout(400);
  await p.screenshot({ path: 'menu4.png' });

  await b.close();
  out.errs = errs;
  const erro = m => problemas.push(m);

  if (out.jogar.modo !== 'porta') erro('JOGAR nao abriu a porta dos jeitos de jogar');
  if (out.jogar.titulo !== 'JOGAR') erro('o titulo da porta e "' + out.jogar.titulo + '"');
  for (const id of ['btn-jornada','btn-multi','btn-ranked','btn-arena','btn-bossrush','btn-treino'])
    if (out.jogar.linhas.indexOf(id) < 0) erro(id + ' NAO esta dentro de JOGAR');
  if (out.jogar.linhas[0] !== 'btn-jornada') erro('a jornada nao e a primeira linha de JOGAR');
  if (out.jornada.modo !== 'levels') erro('a JORNADA nao entrou nas fases');
  if (out.jornada.fases < 100) erro('a tela de fases veio com ' + out.jornada.fases + ' fases');
  if (out.cobertura.faltando.length)
    erro('destinos inalcancaveis por nenhuma porta: ' + out.cobertura.faltando.join(', '));
  if (out.cobertura.achados < out.cobertura.esperados)
    erro('as portas mostram ' + out.cobertura.achados + ' de ' + out.cobertura.esperados + ' destinos');
  if (out.portasNoMenu.jogarRepetida) erro('JOGAR aparece duas vezes: botao grande E porta');
  if (out.portasNoMenu.quantas < 3) erro('so ' + out.portasNoMenu.quantas + ' portas no menu');
  if (out.busca.peloNome.achados.indexOf('btn-arena') < 0) erro('a busca nao acha a arena pelo nome');
  if (out.busca.pelaFrase.achados.indexOf('btn-multi') < 0) erro('a busca nao acha "duelo" pela frase');
  if (out.busca.semAcento.achados.indexOf('btn-tree') < 0) erro('a busca nao acha "habilidade" sem acento');
  if (out.busca.maiuscula.achados.indexOf('btn-bossrush') < 0) erro('a busca nao acha em MAIUSCULA');
  if (out.busca.peloNome.portasVisiveis) erro('as portas nao saem da frente durante a busca');
  if (!out.busca.peloNome.dizOnde.some(t => /em /.test(t))) erro('o achado nao diz em que porta a coisa mora');
  if (out.busca.semNada.achados.length) erro('busca sem resultado devolveu linhas');
  if (out.busca.limpa.campo !== '') erro('o X nao limpou a busca');
  if (!out.busca.limpa.portasVisiveis) erro('limpar a busca nao devolveu as portas');
  if (out.busca.limpa.achadosVisiveis) erro('limpar a busca deixou a lista de achados na tela');
  if (out.buscaLeva !== 'arena') erro('a busca nao LEVOU para a arena (foi para ' + out.buscaLeva + ')');
  if (out.voltou.campo !== '') erro('voltando ao menu a busca continua escrita');
  if (!out.voltou.portas) erro('voltando ao menu as portas nao voltaram');
  if (out.cabe.ajustes > out.cabe.tela) erro('AJUSTES esta ' + (out.cabe.ajustes - out.cabe.tela) + 'px fora da tela');
  if (out.cabe.altura < 30) erro('AJUSTES tem so ' + out.cabe.altura + 'px de altura');
  if (out.telinha.ajustesEmbaixo > out.telinha.tela && !out.telinha.rola)
    erro('em tela pequena o AJUSTES fica fora e o menu nem rola');
  if (!out.telinha.buscaVisivel) erro('em tela pequena a busca sumiu');
  if (errs.length) erro('erros de pagina: ' + errs.join(' | '));

  console.log(JSON.stringify(out, null, 1));
  if (problemas.length) { console.log('FALHOU: ' + problemas.join('; ')); process.exit(1); }
  console.log('OK: menu sincronizado, nada inalcancavel e a busca acha');
})().catch(e => { console.log('FATAL ' + e.message.split('\n')[0]); process.exit(1); });
