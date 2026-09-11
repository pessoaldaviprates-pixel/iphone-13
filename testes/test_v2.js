const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true, hasTouch: true
  });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => {
    if (m.type() === 'error' && !m.text().includes('ERR_')) errors.push('CONSOLE: ' + m.text());
  });
  const out = {};

  await page.goto(JOGO + '');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'v2-menu.png' });

  // 1) tela de fases: 120 botões, só a fase 1 liberada
  await page.tap('#btn-play');
  await page.waitForTimeout(500);
  out.faseButtons = await page.evaluate(() => document.querySelectorAll('.fase-btn').length);
  out.unlocked = await page.evaluate(() => document.querySelectorAll('.fase-btn.next').length);
  out.locked = await page.evaluate(() => document.querySelectorAll('.fase-btn.locked').length);
  await page.screenshot({ path: 'v2-levels.png' });

  // 2) joga a fase 1 e vence (acelera matando ondas via console)
  await page.tap('.fase-btn.next');
  await page.waitForTimeout(1500);
  out.playing = await page.evaluate(() => S.mode);
  // vence a fase rapidamente: zera spawns e inimigos
  await page.evaluate(() => {
    S.score = 430; S.runGems = 12;
    S.toSpawn = 0; enemies = []; enemyBullets = [];
    S.waveIdx = S.nWaves; S.waveState = 'fighting';
  });
  await page.waitForTimeout(2500);
  out.victoryShown = await page.evaluate(() => document.getElementById('screen-victory').classList.contains('show'));
  out.afterWin = await page.evaluate(() => ({ best: save.best, pts: save.pts, crystals: save.crystals }));
  await page.screenshot({ path: 'v2-victory.png' });

  // 3) próxima fase liberada
  await page.tap('#btn-vic-menu');
  await page.waitForTimeout(300);
  await page.tap('#btn-play');
  await page.waitForTimeout(400);
  out.fase2Unlocked = await page.evaluate(() => {
    const next = document.querySelector('.fase-btn.next');
    return next ? next.textContent : null;
  });
  out.fase1Done = await page.evaluate(() => document.querySelectorAll('.fase-btn.done').length);

  // 4) loja: dá cristais e compra
  await page.evaluate(() => { save.crystals = 500; persist(); });
  await page.evaluate(() => { goMenu(); });
  await page.tap('#btn-shop');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'v2-shop.png' });
  const before = await page.evaluate(() => ({ c: save.crystals, dmg: save.upgrades.dmg }));
  await page.tap('.shop-card .buy-btn');
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => ({ c: save.crystals, dmg: save.upgrades.dmg, st: ST.dmg }));
  out.shopBuy = { before, after };

  // 5) árvore: dá pontos e desbloqueia 2 nós em sequência
  await page.evaluate(() => { save.pts = 12; persist(); goMenu(); });
  await page.tap('#btn-tree');
  await page.waitForTimeout(400);
  out.treeNodes = await page.evaluate(() => document.querySelectorAll('.node').length);
  await page.evaluate(() => selectNode('atk', 1));
  await page.tap('#td-buy');
  await page.waitForTimeout(200);
  await page.evaluate(() => selectNode('atk', 2));
  await page.tap('#td-buy');
  await page.waitForTimeout(200);
  // tenta pular pré-requisito (deve falhar)
  await page.evaluate(() => selectNode('def', 5));
  const jumpBtn = await page.evaluate(() => ({ txt: document.getElementById('td-buy').textContent, dis: document.getElementById('td-buy').disabled }));
  out.tree = await page.evaluate(() => ({ owned: Object.keys(save.skills), avail: ptsAvailable(), dmgStat: ST.dmg }));
  out.jumpBlocked = jumpBtn;
  await page.screenshot({ path: 'v2-tree.png' });

  // 6) habilidades marco funcionam em jogo (dá tudo e joga)
  await page.evaluate(() => {
    save.pts = 200;
    for (const b of ['atk','def','res']) for (let t=1;t<=40;t++) save.skills[b+t]=true;
    persist(); calcStats(); goMenu();
  });
  out.fullStats = await page.evaluate(() => ({
    side: ST.sideShot, missiles: ST.missiles, pierce: ST.pierce, crit: ST.critChance,
    startShield: ST.startShield, revive: ST.revive, magnet: ST.magnet, nova: ST.nova,
    maxLives: ST.maxLives
  }));
  await page.evaluate(() => startGame(5)); // fase de chefe
  await page.waitForTimeout(4000);
  out.bossFase = await page.evaluate(() => ({ mode: S.mode, boss: !!boss, shield: player.shield > 0, missiles: missilesArr.length >= 0 }));
  await page.screenshot({ path: 'v2-boss.png' });

  // 7) derrota devolve metade dos cristais
  await page.evaluate(() => { S.runGems = 20; player.invuln = 0; player.shield = 0; player.reviveUsed = true; player.lives = 1; hitPlayer(); });
  await page.waitForTimeout(2500);
  out.overShown = await page.evaluate(() => document.getElementById('screen-over').classList.contains('show'));
  await page.screenshot({ path: 'v2-over.png' });

  // 8) persistência: recarrega a página
  await page.reload();
  await page.waitForTimeout(1000);
  out.persisted = await page.evaluate(() => ({ best: save.best, crystals: save.crystals, skills: Object.keys(save.skills).length, upgDmg: save.upgrades.dmg }));

  console.log(JSON.stringify({ out, errors }, null, 2));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
