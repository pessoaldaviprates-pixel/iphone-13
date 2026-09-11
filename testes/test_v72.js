const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = []; const out = {};
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_')) errs.push('CONSOLE: ' + m.text()); });
  await p.goto(JOGO + '?nuvem=http://127.0.0.1:8099');
  await p.waitForTimeout(1600);

  /* ---- abertura: aparece uma vez só ---- */
  out.abertura = await p.evaluate(() => ({
    apareceu: document.getElementById('abertura').className,
    jaMarcou: storageGet('nn_abertura', '') === '1',
    naoPrecisaMais: !aberturaPrecisa()
  }));
  await p.screenshot({ path: 'v72-abertura.png' });
  await p.evaluate(() => { const el = document.getElementById('abertura'); el.className = ''; el.innerHTML = ''; });

  await p.evaluate(() => {
    ROOT.profiles['Davi'] = defaultSave(); ROOT.current = 'Davi';
    save = ROOT.profiles['Davi']; save.__name = 'Davi'; save.best = 100; save.ships = [0,1,2,3,4,5,6,7,8];
    save.tutorialFeito = true; calcStats(); persist(); goMenu();
  });
  await p.waitForTimeout(900);

  /* ---- biomas ---- */
  out.biomas = await p.evaluate(() => ({
    quantos: BIOMAS.length,
    f10: biomaDaFase(10).nome, f50: biomaDaFase(50).nome,
    f100: biomaDaFase(100).nome, f270: biomaDaFase(270).nome,
    andamentoDiferente: biomaDaFase(10).andamento !== biomaDaFase(100).andamento
  }));

  /* ---- fundo com profundidade ---- */
  out.nebulas = await p.evaluate(() => {
    nebulasMontar();
    const n = NEBULAS.length;
    const y0 = NEBULAS[0].y;
    nebulasPassar(1);
    let erro = null;
    try { drawNebulas(); } catch (e) { erro = e.message; }
    return { quantas: n, andou: NEBULAS[0].y !== y0, erro,
             planosDiferentes: new Set(NEBULAS.map(x => x.z)).size > 1 };
  });

  /* ---- passiva de cada nave ---- */
  out.passivas = await p.evaluate(() => {
    const lista = [0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => passivaDaNave(i).nome);
    save.ship = 2;
    const minha = passivaDaNave(2);
    const valeCristal = (() => {
      save.ship = 2; calcStats();
      const a = ST.crystalMult;
      // acha a nave cuja passiva é a de cristal
      let alvo = 0;
      for (let i = 0; i < 8; i++) if (passivaDaNave(i).id === 'cristal') alvo = i;
      save.ship = alvo; calcStats();
      return ST.crystalMult > a || passivaDaNave(2).id === 'cristal';
    })();
    save.ship = 0; calcStats();
    return { quantas: PASSIVAS.length, nomes: lista.slice(0, 4),
             minha: minha.nome, temDesc: !!minha.desc, valeCristal };
  });
  await p.evaluate(() => { showScreen('hangar'); renderHangarAtual(); });
  await p.waitForTimeout(500);
  out.passivaNaTela = await p.evaluate(() =>
    (document.getElementById('hangar-passiva') || {}).textContent);

  /* ---- placar ao vivo da arena ---- */
  out.placar = await p.evaluate(() => {
    S.mode = 'playing';
    arenaPlacarRender([
      { nome: 'Ana', abates: 90 }, { nome: 'Davi', abates: 55, eu: true }, { nome: 'Bia', abates: 12 }
    ]);
    const el = document.getElementById('arena-placar');
    return { aberto: el.className, linhas: el.querySelectorAll('.ap-linha').length,
             marcaVoce: el.querySelectorAll('.ap-linha.eu').length };
  });

  /* ---- evento de fim de semana ---- */
  out.evento = await p.evaluate(() => {
    const e = eventoDaArena();
    const hoje = new Date().getDay();
    return { dia: hoje, temEvento: !!e, nome: e && e.nome,
             quantos: EVENTOS_ARENA.length,
             soNoFimDeSemana: (hoje === 0 || hoje === 6) ? !!e : !e };
  });

  /* ---- sala de espera ---- */
  out.sala = await p.evaluate(() => {
    MP.sala = 'ABC'; MP.outros = { x: { nome: 'Ana', tela: 'hangar' }, y: { nome: 'Bia', pronto: true } };
    salaEsperaRender();
    const el = document.getElementById('sala-estado');
    return { visivel: el.style.display, linhas: el.querySelectorAll('.sala-linha').length,
             texto: el.textContent.slice(0, 40) };
  });
  out.salaTextos = await p.evaluate(() => ({
    hangar: salaEstadoTexto({ tela: 'hangar' }),
    pronto: salaEstadoTexto({ pronto: true }),
    vazio: salaEstadoTexto(null)
  }));

  /* ---- chefe de dupla ---- */
  out.chefeDupla = await p.evaluate(() => {
    const antes = chefeDeDuplaPrecisa(40);
    MP.modo = 'coop'; MP.sala = 'ABC';
    const emCoop = chefeDeDuplaPrecisa(40);
    const naoNa39 = chefeDeDuplaPrecisa(39);
    MP.modo = null; MP.sala = null;
    return { soloNao: !antes, coopSim: emCoop, so40em40: !naoNa39 };
  });

  /* ---- reembolso ---- */
  out.reembolso = await p.evaluate(async () => {
    save.__name = 'Cr1cket';
    const ok = await reembolsar('ped1', { de: 'pX', nome: 'Fulano', itemNome: 'VIP 30 dias', preco: 1 },
                                'pediu sem querer');
    await new Promise(r => setTimeout(r, 500));
    await reembolsosRender();
    const cx = document.getElementById('adm-reembolsos-lista');
    return { gravou: ok, linhas: cx.querySelectorAll('.reg-linha').length,
             mostraTotal: cx.textContent.indexOf('R$') >= 0 };
  });

  /* ---- a 3ª estrela é possível em todas as fases ---- */
  out.estrelaPossivel = await p.evaluate(() => {
    const ruins = [];
    for (let f = 1; f <= 270; f++) {
      const duracao = faseWaves(f) * 14;      // tempo médio de uma fase
      if (duracao > tempoAlvo(f)) ruins.push(f);
    }
    return { fasesImpossiveis: ruins.length, primeiras: ruins.slice(0, 5),
             alvo25: tempoAlvo(25), alvo270: tempoAlvo(270) };
  });

  out.errs = errs;
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.log('FATAL ' + e.message.split('\n')[0]); process.exit(1); });
