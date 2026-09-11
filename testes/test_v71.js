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
  await p.waitForTimeout(1400);
  await p.evaluate(() => {
    ROOT.profiles['Davi'] = defaultSave(); ROOT.current = 'Davi';
    save = ROOT.profiles['Davi']; save.__name = 'Davi'; save.best = 60; save.rank = 500;
    save.tutorialFeito = true; calcStats(); persist(); goMenu();
  });
  await p.waitForTimeout(900);

  /* ---- sala de treino ---- */
  await p.evaluate(() => treinoComecar());
  await p.waitForTimeout(1800);
  out.treino = await p.evaluate(() => ({
    ligado: !!S.treino, alvos: enemies.length, parados: enemies.every(e => e.vx === 0),
    invencivel: save.godMode, barra: document.getElementById('treino-barra').className
  }));
  await p.screenshot({ path: 'v71-treino.png' });
  out.treinoRepoe = await p.evaluate(() => {
    enemies.length = 0;
    S.treino.repor = 0;
    treinoPassar(0.1);
    return enemies.length;
  });
  out.treinoSai = await p.evaluate(() => {
    treinoSair();
    return { fechou: !S.treino, godDesligado: !save.godMode, modo: S.mode };
  });

  /* ---- testar a nave antes de comprar ---- */
  out.testarNave = await p.evaluate(() => {
    save.ship = 0;
    treinoComecar(7);
    const usando = save.ship;
    treinoSair();
    return { testouCom: usando, voltouPara: save.ship };
  });

  /* ---- combinações de habilidades ---- */
  out.combos = await p.evaluate(() => {
    save.combosVistos = {};
    const quantos = COMBOS_HAB.length;
    ultimaHab = { id: null, quando: 0 };
    const nada = comboHabTentar('escudo');
    const achou = comboHabTentar('explosao');
    // muito tempo depois não vale
    ultimaHab = { id: 'cura', quando: Date.now() - 5000 };
    const tarde = comboHabTentar('escudo');
    return { quantos, primeiraNaoFaz: !nada, segundaFaz: !!achou,
             nome: achou && achou.nome, tarde: !tarde,
             guardou: Object.keys(save.combosVistos).length };
  });
  await p.evaluate(() => { goMenu(); perfilAbrir(); });
  await p.waitForTimeout(700);
  out.combosNaTela = await p.evaluate(() => ({
    linhas: document.querySelectorAll('.combo-linha').length,
    achados: document.querySelectorAll('.combo-linha.achou').length,
    escondidos: document.body.textContent.indexOf('? ? ?') >= 0
  }));

  /* ---- inimigos que desviam ---- */
  await p.evaluate(() => { goMenu(); startGame(100); });
  await p.waitForTimeout(2200);
  out.desvio = await p.evaluate(() => {
    if (!enemies.length) return { semInimigos: true };
    const e = enemies[0];
    e.x = 200; e.y = 200; e.treino = false;
    bullets.length = 0;
    bullets.push({ x: 200, y: 350, vx: 0, vy: -500, r: 4 });
    const antes = e.x;
    for (let i = 0; i < 10; i++) inimigosDesviar(0.05);
    return { saiuDaMira: Math.abs(e.x - antes) > 5, antes, depois: Math.round(e.x) };
  });
  out.desvioFaseBaixa = await p.evaluate(() => {
    S.fase = 2;
    if (!enemies.length) return true;
    const e = enemies[0];
    e.x = 200;
    bullets.length = 0;
    bullets.push({ x: 200, y: 350, vx: 0, vy: -500, r: 4 });
    for (let i = 0; i < 10; i++) inimigosDesviar(0.05);
    return Math.abs(e.x - 200) < 3;      // na fase 2 quase não desvia
  });

  /* ---- retrato do chefe ---- */
  out.chefe = await p.evaluate(() => {
    chefeApresentar('Ceifador Carmesim', fraseDoChefe(10));
    const el = document.getElementById('chefe-cartao');
    return { aberto: el.className, nome: el.textContent.indexOf('Ceifador') >= 0,
             temFrase: el.textContent.indexOf('“') >= 0,
             estavel: fraseDoChefe(10) === fraseDoChefe(10) };
  });
  await p.waitForTimeout(400);
  await p.screenshot({ path: 'v71-chefe.png' });

  /* ---- sair no meio do duelo tem preço ---- */
  out.abandono = await p.evaluate(() => {
    save.rank = 500; save.abandonos = 0; save.filaTravadaAte = 0;
    const r = abandonoRegistrar();
    return { perdeu: r.perda, rankDepois: save.rank, minutos: r.minutos,
             travada: filaTravada() };
  });
  out.abandonoSoma = await p.evaluate(() => {
    const r = abandonoRegistrar();
    return { perdaMaior: r.perda, abandonos: save.abandonos };
  });
  out.filaLiberaDepois = await p.evaluate(() => {
    save.filaTravadaAte = Date.now() - 1000;
    return filaTravada();
  });

  out.errs = errs;
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.log('FATAL ' + e.message.split('\n')[0]); process.exit(1); });
