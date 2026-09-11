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
    save = ROOT.profiles['Davi']; save.__name = 'Davi'; save.best = 30; save.tutorialFeito = true;
    calcStats(); persist(); goMenu(); startGame(10);   // fase 10 = chefe
  });
  await p.waitForTimeout(2500);

  /* ---- pré-aviso dos ataques ---- */
  out.avisos = await p.evaluate(() => {
    AVISOS.length = 0;
    avisarAtaque(100, 200, 'linha', 0.5);
    avisarAtaque(200, 300, 'coluna', 0.5);
    const antes = AVISOS.length;
    drawAvisos();
    avisosPassar(0.6);
    return { criados: antes, depoisDoTempo: AVISOS.length };
  });

  /* ---- destroços ---- */
  out.destrocos = await p.evaluate(() => {
    particles.length = 0;
    destrocos(100, 100, '#FF7AA8', 8);
    const n = particles.length;
    const antesY = particles[0].vy;
    pedacosPassar(0.2);
    return { criados: n, giram: particles[0].ang !== undefined,
             caem: particles[0].vy > antesY, temPedaco: !!particles[0].pedaco };
  });

  /* ---- borda de dano e tremida ---- */
  out.dano = await p.evaluate(() => {
    S.doeuT = 0; S.shake = 0; player.invuln = 0; player.shield = 0; save.godMode = false;
    const vidas = player.lives;
    hitPlayer();
    return { doeu: S.doeuT > 0, tremeu: S.shake >= 9, perdeu: player.lives < vidas || player.hp < ST.maxHp };
  });
  await p.evaluate(() => { S.doeuT = 0.45; update(0.016); });
  await p.waitForTimeout(100);
  out.bordaVisivel = await p.evaluate(() => parseFloat(document.getElementById('doeu').style.opacity) > 0);

  /* ---- câmera lenta ---- */
  out.camLenta = await p.evaluate(() => {
    S.lentoT = 0; camLenta(0.8);
    return { ligou: S.lentoT, naoDiminui: (camLenta(0.2), S.lentoT) };
  });

  /* ---- som por inimigo (não pode explodir) ---- */
  out.sons = await p.evaluate(() => {
    let erro = null;
    try {
      somDoInimigo({ type: 'tank' }); somDoInimigo({ type: 'zig' });
      somDoInimigo({ type: 'shooter' }); somDoInimigo({});
    } catch (e) { erro = e.message; }
    return { erro, temHabPronta: typeof AudioSys.habPronta === 'function' };
  });

  /* ---- barra do chefe em 3 partes ---- */
  out.chefe = await p.evaluate(() => {
    let erro = null;
    try { if (boss) drawBoss(); } catch (e) { erro = e.message; }
    return { temChefe: !!boss, erro };
  });
  await p.screenshot({ path: 'v62-chefe.png' });

  /* ---- o jogo continua rodando depois de tudo isso ---- */
  await p.waitForTimeout(1500);
  out.segue = await p.evaluate(() => ({ modo: S.mode, vivo: player.alive, tempo: Math.round(S.time) }));

  out.errs = errs;
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.log('FATAL ' + e.message.split('\n')[0]); process.exit(1); });
