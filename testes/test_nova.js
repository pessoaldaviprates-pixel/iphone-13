const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errs = []; const out = {};
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(JOGO + '');
  await p.waitForTimeout(900);
  await p.fill('#new-name', 'Nova'); await p.tap('#btn-new'); await p.waitForTimeout(400);
  await p.evaluate(() => {
    save.ships.push(B2); save.ship = B2; persist(); calcStats();
    startGame(25); S.waveIdx = S.nWaves; setupWave();   // fase de chefe
  });
  await p.waitForTimeout(2200);
  out.antes = await p.evaluate(() => {
    if (boss && boss.entering) { boss.entering = false; boss.y = Math.max(120, H * 0.17); }
    S.toSpawn = 0;                       // para de nascer inimigo, para medir direito
    enemies.length = 0;
    for (let i = 0; i < 9; i++) { const e = spawnEnemy('drone'); e.y = 200 + i * 40; e.x = 60 + i * 30; }
    buracos.push({ x: W/2 - 45, y: 300, r: 30, t: 7, pulso: 0 });
    buracos.push({ x: W/2 + 45, y: 300, r: 30, t: 7, pulso: 0 });
    return { inimigos: enemies.length, buracos: buracos.length, bossHp: bossHpLeft(), chefe: boss.bname };
  });
  // mede logo depois da colisão
  await p.waitForTimeout(900);
  out.durante = await p.evaluate(() => ({
    inimigos: enemies.length, buracos: buracos.length,
    clarao: Math.round(S.superNova * 100) / 100,
    bossHp: bossHpLeft(),
    textos: texts.map(t => t.str)
  }));
  await p.screenshot({ path: 'supernova-flash.png' });
  await p.waitForTimeout(2000);
  out.depois = await p.evaluate(() => ({
    modo: S.mode, vivo: player.alive, clarao: S.superNova,
    inimigos: enemies.length, jogoOk: !!document.getElementById('hab-bar')
  }));
  console.log(JSON.stringify({ out, errs }, null, 2));
  await b.close();
  process.exit(errs.length ? 1 : 0);
})().catch(e => { console.error('FATAL', e.message.split('\n')[0]); process.exit(2); });
