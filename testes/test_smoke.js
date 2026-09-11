const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
const fs = require('fs');
const SC = '/tmp/claude-0/-home-user-iphone-13/b7a1aae1-35a1-5214-9848-2da99e219fb6/scratchpad/';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
    args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await c.newPage();
  const errs = []; const out = {};
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto(JOGO + ''); await p.waitForTimeout(900);

  await p.fill('#new-name', 'Piloto'); await p.tap('#btn-new'); await p.waitForTimeout(300);
  for (let i = 0; i < 2; i++) {
    await p.evaluate(() => { senhaEstado.seq = [0,1,2,5]; senhaEstado.desenhando = true; senhaSoltar(); });
    await p.waitForTimeout(300);
  }
  out.menu = await p.evaluate(() => S.mode);

  // navega pelas telas principais
  const telas = [['btn-hangar','hangar'], ['btn-shop','shop'], ['btn-levels','levels'],
                 ['btn-tree','tree'], ['btn-relics','relics'], ['btn-rank','rank']];
  out.telas = {};
  for (const [id, nome] of telas) {
    const existe = await p.evaluate(i => !!document.getElementById(i), id);
    if (!existe) { out.telas[nome] = 'sem botao'; continue; }
    await p.tap('#' + id); await p.waitForTimeout(500);
    out.telas[nome] = await p.evaluate(() => S.mode);
    await p.evaluate(() => goMenu()); await p.waitForTimeout(300);
  }

  // joga a fase 1
  await p.evaluate(() => { save.crystals = 5000; persist(); });
  await p.evaluate(() => startGame(1)); await p.waitForTimeout(1200);
  out.jogando = await p.evaluate(() => S.mode);
  await p.mouse.move(195, 600); await p.mouse.down();
  for (let i = 0; i < 40; i++) { await p.mouse.move(195 + Math.sin(i/3)*90, 600); await p.waitForTimeout(120); }
  await p.mouse.up();
  out.depoisDeJogar = await p.evaluate(() => ({ modo: S.mode, vida: player && player.hp, fase: S.fase, inimigos: enemies.length }));
  await p.screenshot({ path: SC + 'smoke-jogo.png' });

  await p.evaluate(() => { if (S.mode === 'playing') togglePause(); });
  await p.waitForTimeout(400);
  await p.evaluate(() => { const b = document.getElementById('btn-quit'); if (b) b.click(); });
  await p.waitForTimeout(800);
  out.voltouMenu = await p.evaluate(() => S.mode);
  out.naveOk = await p.evaluate(() => naveValida(save.ship) === save.ship);
  await p.screenshot({ path: SC + 'smoke-menu.png' });

  console.log(JSON.stringify({ out, errs }, null, 1));
  await b.close();
  process.exit(errs.length ? 1 : 0);
})().catch(e => { console.error('FATAL', String(e).split('\n').slice(0,4).join(' | ')); process.exit(2); });
