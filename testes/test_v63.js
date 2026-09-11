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
  await p.waitForTimeout(1300);
  await p.evaluate(() => {
    ROOT.profiles['Davi'] = defaultSave(); ROOT.current = 'Davi';
    save = ROOT.profiles['Davi']; save.__name = 'Davi'; save.best = 40; save.crystals = 50000;
    save.tutorialFeito = true; save.pts = 20; save.ships = [0, 1, 2, 3, 4, 5];
    calcStats(); persist(); goMenu();
  });
  await p.waitForTimeout(900);

  /* ---- fundir relíquias ---- */
  out.fundir = await p.evaluate(() => {
    save.amulets = []; save.equipped = []; save.amuletSeq = 1;
    for (let i = 0; i < 4; i++) save.amulets.push({ uid: save.amuletSeq++, type: 'dano', rar: 0 });
    save.amulets.push({ uid: save.amuletSeq++, type: 'vida', rar: 0 });
    const grupos = fundirGrupos();
    const novo = fundir('dano:0');
    return { gruposProntos: grupos.length, chave: grupos[0] && grupos[0].chave,
             saiu: novo && novo.rar, sobraram: save.amulets.filter(a => a.type === 'dano').length,
             total: save.amulets.length };
  });
  out.fundirNaoUsaEquipado = await p.evaluate(() => {
    save.amulets = []; save.amuletSeq = 1;
    for (let i = 0; i < 3; i++) save.amulets.push({ uid: save.amuletSeq++, type: 'sorte', rar: 1 });
    save.equipped = [save.amulets[0].uid];
    return fundirGrupos().length;
  });

  /* ---- histórico do baú ---- */
  out.bau = await p.evaluate(() => {
    save.bauHist = [];
    rollAmulet(); rollAmulet();
    return { anotou: (save.bauHist || []).length, temNome: !!(save.bauHist[0] || {}).nome };
  });
  await p.evaluate(() => { showScreen('reliquias'); renderReliquias(); });
  await p.waitForTimeout(600);
  out.telaReliquias = await p.evaluate(() => ({
    historico: getComputedStyle(document.getElementById('rel-historico')).display,
    fundir: getComputedStyle(document.getElementById('rel-fundir')).display
  }));
  await p.screenshot({ path: 'v63-reliquias.png' });

  /* ---- conjuntos ---- */
  out.conjuntos = await p.evaluate(() => {
    save.ship = 3; save.equipped = [];
    showScreen('hangar'); renderHangar();
    conjuntoSalvar(0);
    save.ship = 1;
    conjuntoUsar(0);
    return { salvou: !!save.conjuntos[0], voltouPara: save.ship,
             caixas: document.querySelectorAll('.conj-cx').length };
  });

  /* ---- comparar naves ---- */
  await p.evaluate(() => navesAbrir());
  await p.waitForTimeout(700);
  out.comparar = await p.evaluate(() => {
    const linhas = document.querySelectorAll('.comp-tab tbody tr').length;
    const eu = document.querySelectorAll('.comp-tab tr.eu').length;
    document.querySelector('[data-ord="vida"]').click();
    const primeira = document.querySelector('.comp-tab tbody tr td').textContent;
    return { linhas, eu, ordenou: navesOrdem, primeira: primeira.slice(0, 20) };
  });
  await p.screenshot({ path: 'v63-comparar.png' });

  /* ---- falta pouco ---- */
  out.falta = await p.evaluate(() => {
    save.crystals = 100;
    const l = faltaPouco();
    goMenu();
    return { itens: l.length, primeiro: (l[0] || {}).txt,
             naTela: getComputedStyle(document.getElementById('falta-pouco')).display };
  });

  /* ---- refazer a árvore ---- */
  out.arvore = await p.evaluate(() => {
    save.crystals = 50000; save.skills = { atk1: true, atk2: true, def1: true };
    const custo = arvoreCustoZerar();
    const antes = save.crystals;
    const r = arvoreZerar();
    return { custo, ok: r.ok, gastou: antes - save.crystals, sobrou: Object.keys(save.skills).length };
  });

  /* ---- pular a fase ---- */
  out.pular = await p.evaluate(() => {
    S.fase = 12; S.derrotasSeguidas = 4;
    const antes = podePular();
    S.derrotasSeguidas = 5;
    const depois = podePular();
    save.crystals = 50000; save.best = 11;
    const foi = pularFase();
    return { antesDe5: antes, depoisDe5: depois, pulou: foi, best: save.best };
  });

  /* ---- prestígio ---- */
  out.prestigio = await p.evaluate(() => {
    save.best = 10;
    const cedo = prestigioFazer();
    save.best = TOTAL_FASES;
    const antes = save.crystals;
    const r = prestigioFazer();
    return { recusaCedo: !cedo.ok, fez: r.ok, nivel: save.prestigio, bonus: prestigioBonus(),
             voltouFase: save.best, ganhou: save.crystals - antes };
  });
  await p.evaluate(() => perfilAbrir());
  await p.waitForTimeout(600);
  out.prestigioNaTela = await p.evaluate(() =>
    getComputedStyle(document.getElementById('perf-prestigio')).display);
  await p.screenshot({ path: 'v63-perfil.png' });

  /* ---- o bônus do prestígio vale de verdade ---- */
  out.prestigioVale = await p.evaluate(() => {
    save.prestigio = 0; calcStats();
    const antes = { dano: ST.dmg, cristal: ST.crystalMult };
    save.prestigio = 2; calcStats();
    return { dano: Math.round(ST.dmg / antes.dano * 100) / 100,
             cristal: Math.round(ST.crystalMult / antes.cristal * 100) / 100 };
  });

  out.errs = errs;
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.log('FATAL ' + e.message.split('\n')[0]); process.exit(1); });
