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
    save = ROOT.profiles['Davi']; save.__name = 'Davi'; save.best = 60; save.crystals = 9000;
    save.tutorialFeito = true; calcStats(); persist(); goMenu();
  });
  await p.waitForTimeout(900);

  /* ---- as regras são estáveis e só nas fases terminadas em 5 ---- */
  out.regras = await p.evaluate(() => ({
    fase4: regraDaFase(4), fase5: regraDaFase(5),
    fase18: (regraDaFase(18) || {}).id, fase28: (regraDaFase(28) || {}).id,
    estavel: (regraDaFase(38) || {}).id === (regraDaFase(38) || {}).id,
    quantas: REGRAS.length,
    variedade: new Set([8,18,28,38,48,58,68,78,88,98,108,118].map(f => (regraDaFase(f)||{}).id)).size
  }));

  /* ---- entrar numa fase com regra aplica ela ---- */
  await p.evaluate(() => startGame(18));
  await p.waitForTimeout(1500);
  out.faseComRegra = await p.evaluate(() => ({
    regra: S.regra && S.regra.id, nome: S.regra && S.regra.nome,
    premio: regraPremio(), banner: S.banner && S.banner.text
  }));
  await p.screenshot({ path: 'v64-regra.png' });

  /* ---- asteroides ---- */
  out.asteroides = await p.evaluate(() => {
    ASTEROIDES.length = 0;
    asteroideNovo(); asteroideNovo();
    const n = ASTEROIDES.length;
    const y0 = ASTEROIDES[0].y;
    asteroidesPassar(0.5);
    const desceu = ASTEROIDES.length ? ASTEROIDES[0].y > y0 : true;
    // tiro quebra
    ASTEROIDES.length = 0;
    asteroideNovo();
    const a = ASTEROIDES[0];
    a.x = 200; a.y = 300; a.hp = 1;
    player.x = -500; player.y = -500;          // longe, para não ser colisão da nave
    bullets.length = 0;
    bullets.push({ x: 200, y: 300, vx: 0, vy: 0, r: 4 });
    asteroidesPassar(0.016);
    const quebrou = ASTEROIDES.indexOf(a) < 0;
    let erro = null;
    try { drawAsteroides(); } catch (e) { erro = e.message; }
    return { criados: n, desceu, quebrou, erro };
  });

  /* ---- regra VIDRO mata em um toque ---- */
  out.vidro = await p.evaluate(() => {
    S.regra = REGRAS.filter(r => r.id === 'fragil')[0];
    player.lives = 3; player.hp = ST.maxHp; player.invuln = 0; player.shield = 0; save.godMode = false;
    hitPlayer();
    return { vidas: player.lives, hp: Math.round(player.hp) };
  });

  /* ---- TURBO acelera o relógio ---- */
  out.turbo = await p.evaluate(() => {
    S.regra = REGRAS.filter(r => r.id === 'turbo')[0];
    const antes = S.time;
    update(0.1);
    const comTurbo = S.time - antes;
    S.regra = null;
    const antes2 = S.time;
    update(0.1);
    return { comTurbo: Math.round(comTurbo * 1000) / 1000, sem: Math.round((S.time - antes2) * 1000) / 1000 };
  });

  /* ---- portal e sala secreta ---- */
  out.secreta = await p.evaluate(() => {
    player.alive = true; player.lives = 3; player.hp = ST.maxHp;
    player.x = W / 2; player.y = H / 2;
    S.portal = null; S.naSecreta = false;
    S.portal = { x: player.x, y: player.y, t: 0, vivo: 9 };
    portalPassar(0.016);                       // a nave está em cima: entra
    const entrou = S.naSecreta;
    const gemas = powerups.filter(x => x.type === 'gem').length;
    S.secretaT = 0.01;
    secretaPassar(0.02);
    return { entrou, gemas, saiu: !S.naSecreta };
  });

  /* ---- maratona de chefes ---- */
  await p.evaluate(() => { goMenu(); });
  await p.waitForTimeout(500);
  await p.evaluate(() => bossRushComecar());
  await p.waitForTimeout(2000);
  out.maratona = await p.evaluate(() => ({
    ligou: !!S.bossRush, total: S.bossRush && S.bossRush.total,
    fases: (S.bossRushFases || []).length, soChefe: S.soChefe,
    ondaEhChefe: S.waveIdx === S.nWaves, modo: S.mode
  }));
  await p.screenshot({ path: 'v64-maratona.png' });
  out.maratonaAnda = await p.evaluate(() => {
    const antes = S.fase;
    S.score = 500;
    const seguiu = bossRushProximo();
    return { seguiu, n: S.bossRush && S.bossRush.n, mudouFase: S.fase !== antes, pontos: S.bossRush && S.bossRush.pontos };
  });
  out.maratonaTermina = await p.evaluate(() => {
    const antes = save.crystals;
    for (let i = 0; i < 5; i++) { S.score = 200; bossRushProximo(); }
    return { acabou: !S.bossRush, ganhou: save.crystals - antes, recorde: save.bossRushRec };
  });

  /* ---- o botão no menu existe ---- */
  await p.evaluate(() => goMenu());
  await p.waitForTimeout(800);
  out.botao = await p.evaluate(() => !!document.getElementById('btn-bossrush'));

  out.errs = errs;
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.log('FATAL ' + e.message.split('\n')[0]); process.exit(1); });
