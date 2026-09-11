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
    save = ROOT.profiles['Davi']; save.__name = 'Davi'; save.best = 30; save.crystals = 3000;
    save.tutorialFeito = true; calcStats(); persist(); goMenu();
  });
  await p.waitForTimeout(900);

  /* ---- a tabela existe e está coerente ---- */
  out.tabela = await p.evaluate(() => ({
    frases: FRASES.length,
    semIngles: FRASES.filter(f => !f[1]).length,
    semEspanhol: FRASES.filter(f => !f[2]).length,
    repetidas: FRASES.length - new Set(FRASES.map(f => f[0])).size,
    idiomas: IDIOMAS.map(x => x.id)
  }));

  /* ---- T() devolve a frase certa ---- */
  out.funcaoT = await p.evaluate(() => {
    IDIOMA = 'pt'; const pt = T('AMIGOS');
    IDIOMA = 'en'; const en = T('AMIGOS');
    IDIOMA = 'es'; const es = T('AMIGOS');
    const naoTraduzida = T('uma frase que não existe na tabela');
    IDIOMA = 'pt';
    return { pt, en, es, naoTraduzida };
  });

  /* ---- o menu inteiro muda de idioma ---- */
  const menuEm = async () => p.evaluate(() => ({
    jogar: (document.getElementById('btn-play') || {}).textContent,
    hangar: (document.querySelector('#btn-hangar span') || {}).textContent,
    loja: (document.querySelector('#btn-loja span') || {}).textContent,
    amigos: (document.querySelector('#btn-amigos span') || {}).textContent,
    ajustes: (document.getElementById('btn-ajustes') || {}).textContent
  }));
  out.menuPT = await menuEm();
  await p.evaluate(() => idiomaUsar('en'));
  await p.waitForTimeout(500);
  out.menuEN = await menuEm();
  await p.screenshot({ path: 'idioma-en.png' });
  await p.evaluate(() => idiomaUsar('es'));
  await p.waitForTimeout(500);
  out.menuES = await menuEm();
  await p.screenshot({ path: 'idioma-es.png' });

  /* ---- tela montada na hora também traduz (o observador) ---- */
  await p.evaluate(() => { idiomaUsar('en'); misAbrir(); });
  await p.waitForTimeout(700);
  out.telaNova = await p.evaluate(() => ({
    titulo: (document.querySelector('#screen-missoes .page-title') || {}).textContent,
    andamento: document.getElementById('mis-corpo').textContent.indexOf('in progress') >= 0
  }));
  await p.evaluate(() => { goMenu(); ajAbrir(); });
  await p.waitForTimeout(700);
  out.ajustesEN = await p.evaluate(() => ({
    som: document.getElementById('aj-corpo').textContent.indexOf('SOUND') >= 0,
    vibra: document.getElementById('aj-corpo').textContent.indexOf('Vibration') >= 0,
    temIdioma: !!document.querySelector('[data-idi="es"]')
  }));

  /* ---- voltar para o português devolve tudo ---- */
  await p.evaluate(() => { idiomaUsar('pt'); goMenu(); });
  await p.waitForTimeout(600);
  out.voltouPT = await menuEm();

  /* ---- o idioma fica guardado ---- */
  await p.evaluate(() => idiomaUsar('es'));
  await p.reload();
  await p.waitForTimeout(1500);
  out.guardou = await p.evaluate(() => ({
    idioma: IDIOMA,
    jogar: (document.getElementById('btn-play') || {}).textContent
  }));

  /* ---- moldes com número ---- */
  out.moldes = await p.evaluate(() => {
    IDIOMA = 'en';
    const r = {
      fase: T('Fase 30 de 270 · 11%'),
      onda: T('ONDA 2/3'),
      missao: T('Derrube 250 inimigos'),
      passe: T('Passe 1 fase'),
      passes: T('Passe 3 fases'),
      arvore: T('árvore'),
      nenhuma: T('nenhuma')
    };
    IDIOMA = 'es';
    r.faseES = T('Fase 30 de 270 · 11%');
    r.chefeES = T('Derrote 2 chefes');
    IDIOMA = 'pt';
    return r;
  });

  /* ---- o jogo continua funcionando em outro idioma ---- */
  await p.evaluate(() => {
    ROOT.current = 'Davi'; save = ROOT.profiles['Davi']; save.__name = 'Davi';
    calcStats(); goMenu(); startGame(3);
  });
  await p.waitForTimeout(2000);
  out.jogando = await p.evaluate(() => ({ modo: S.mode, vivo: player.alive, inimigos: enemies.length }));
  await p.screenshot({ path: 'idioma-jogo.png' });

  out.errs = errs;
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.log('FATAL ' + e.message.split('\n')[0]); process.exit(1); });
