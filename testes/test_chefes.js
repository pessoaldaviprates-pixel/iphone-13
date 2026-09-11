const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');

/* Derrota o chefe do jeito que o jogo derrota: tirando a vida dele pelo
   caminho normal de dano, não mexendo em variável na marra. Assim o
   teste passa por tudo que a vitória de verdade passa. */
const MATAR_CHEFE = `(() => {
  if (!boss) return 'sem chefe';
  boss.entering = false;
  for (let i = 0; i < 400 && boss; i++) {
    const z = (typeof bossZones === 'function' ? bossZones() : []);
    if (z && z.length) { damageBossZone(z[0], 99999); }
    else if (typeof damageBoss === 'function') { damageBoss(99999); }
    else if (boss) { boss.hp = 0; }
    if (!boss || boss.hp <= 0) break;
  }
  return 'ok';
})()`;

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = []; const out = {};
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_')) errs.push('CONSOLE: ' + m.text()); });
  await p.goto(JOGO + '?nuvem=http://127.0.0.1:8099');
  await p.waitForTimeout(1500);
  await p.evaluate(() => { const el = document.getElementById('abertura'); if (el) { el.className = ''; el.innerHTML = ''; } });
  await p.evaluate(() => {
    ROOT.profiles['Davi'] = defaultSave(); ROOT.current = 'Davi';
    save = ROOT.profiles['Davi']; save.__name = 'Davi'; save.best = 120; save.crystals = 9000;
    save.tutorialFeito = true; save.godMode = true;   // não morrer atrapalhando o teste
    calcStats(); persist(); goMenu();
  });
  await p.waitForTimeout(800);

  /* ---------- 1. chefe normal, fora da maratona ---------- */
  await p.evaluate(() => startGame(10));
  await p.waitForTimeout(1200);
  await p.evaluate(() => { enemies.length = 0; S.waveIdx = S.nWaves; setupWave(); });
  await p.waitForTimeout(6500);                      // o chefe desce
  out.chefeNormalEntrou = await p.evaluate(() => ({ temChefe: !!boss, entrando: boss && boss.entering }));
  await p.evaluate(MATAR_CHEFE);
  await p.waitForTimeout(2500);
  out.chefeNormal = await p.evaluate(() => ({
    modo: S.mode,
    telaVisivel: [...document.querySelectorAll('.screen,.page')]
      .filter(e => getComputedStyle(e).display !== 'none').map(e => e.id),
    titulo: (document.getElementById('vic-title') || {}).textContent
  }));
  await p.screenshot({ path: 'chefes-normal.png' });

  /* ---------- 2. maratona: derrota o primeiro chefe ---------- */
  await p.evaluate(() => { goMenu(); bossRushComecar(); });
  await p.waitForTimeout(7000);
  out.maratonaEntrou = await p.evaluate(() => ({
    ligou: !!S.bossRush, n: S.bossRush && S.bossRush.n, temChefe: !!boss, modo: S.mode
  }));
  await p.evaluate(MATAR_CHEFE);
  await p.waitForTimeout(2000);
  out.depoisDoPrimeiro = await p.evaluate(() => ({
    modo: S.mode,
    n: S.bossRush && S.bossRush.n,
    fase: S.fase,
    vivo: player.alive,
    /* o pecado antigo: nenhuma tela aberta E o jogo fora de "playing" */
    telaVisivel: [...document.querySelectorAll('.screen,.page')]
      .filter(e => getComputedStyle(e).display !== 'none').map(e => e.id),
    hudVisivel: getComputedStyle(document.getElementById('hud')).display,
    banner: S.banner && S.banner.text
  }));
  await p.screenshot({ path: 'chefes-maratona.png' });

  /* o jogo continua andando de verdade depois disso */
  const t1 = await p.evaluate(() => S.time);
  await p.waitForTimeout(1200);
  out.continuaAndando = await p.evaluate(t => S.time > t, t1);

  /* ---------- 3. maratona até o fim ---------- */
  out.ateOFim = await p.evaluate(async () => {
    const passos = [];
    for (let i = 0; i < 6 && S.bossRush; i++) {
      /* pula o chefe na marra, só para chegar ao fim da maratona */
      S.score += 500;
      bossRushProximo();
      passos.push({ n: S.bossRush ? S.bossRush.n : 'fim', modo: S.mode });
    }
    return { passos, acabou: !S.bossRush, modo: S.mode,
             titulo: (document.getElementById('vic-title') || {}).textContent,
             telaVisivel: [...document.querySelectorAll('.screen,.page')]
               .filter(e => getComputedStyle(e).display !== 'none').map(e => e.id),
             recorde: save.bossRushRec };
  });
  await p.waitForTimeout(600);
  await p.screenshot({ path: 'chefes-fim.png' });

  /* dá para voltar ao menu e jogar de novo */
  await p.evaluate(() => goMenu());
  await p.waitForTimeout(700);
  out.voltaAoMenu = await p.evaluate(() => ({
    modo: S.mode,
    menuVisivel: getComputedStyle(document.getElementById('screen-menu')).display !== 'none'
  }));

  /* ---------- 4. os outros tipos de chefe ---------- */
  out.outrosChefes = [];
  for (const fase of [20, 40, 80, 120]) {
    await p.evaluate(f => { goMenu(); startGame(f); }, fase);
    await p.waitForTimeout(1000);
    await p.evaluate(() => { enemies.length = 0; S.waveIdx = S.nWaves; setupWave(); });
    await p.waitForTimeout(6500);
    const tipo = await p.evaluate(() => boss && boss.kind);
    await p.evaluate(MATAR_CHEFE);
    await p.waitForTimeout(2200);
    const r = await p.evaluate(() => ({
      modo: S.mode,
      telas: [...document.querySelectorAll('.screen,.page')]
        .filter(e => getComputedStyle(e).display !== 'none').map(e => e.id)
    }));
    out.outrosChefes.push({ fase, tipo, modo: r.modo, telas: r.telas.join(",") });
  }

  out.errs = errs;
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.log('FATAL ' + e.message.split('\n')[0]); process.exit(1); });
