const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
  });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  await page.goto(JOGO + '');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'shot-menu.png' });

  // começa o jogo
  await page.tap('#btn-start');
  await page.waitForTimeout(2000);

  // arrasta a nave via touch
  const cdp = await page.context().newCDPSession(page);
  async function drag(x1, y1, x2, y2, steps) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x1, y: y1 }] });
    for (let i = 1; i <= steps; i++) {
      const x = x1 + (x2 - x1) * i / steps, y = y1 + (y2 - y1) * i / steps;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
      await page.waitForTimeout(30);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  await drag(200, 600, 80, 500, 10);
  await page.waitForTimeout(1500);
  await drag(80, 500, 320, 650, 10);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'shot-play.png' });

  // pausa e continua
  await page.tap('#btn-pause');
  await page.waitForTimeout(400);
  const paused = await page.evaluate(() => document.getElementById('screen-pause').classList.contains('show'));
  await page.screenshot({ path: 'shot-pause.png' });
  await page.tap('#btn-resume');
  await page.waitForTimeout(400);

  // avança direto para a onda do chefe para testá-lo
  await page.evaluate(() => { S.wave = 5; enemies = []; setupWave(); updateHud(); });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: 'shot-boss.png' });

  // força fim de jogo
  await page.evaluate(() => { player.invuln = 0; player.shield = 0; player.lives = 1; hitPlayer(); });
  await page.waitForTimeout(2500);
  const over = await page.evaluate(() => document.getElementById('screen-over').classList.contains('show'));
  await page.screenshot({ path: 'shot-over.png' });

  // recomeça
  await page.tap('#btn-retry');
  await page.waitForTimeout(1000);
  const playing = await page.evaluate(() => S.mode);

  const state = await page.evaluate(() => ({ score: S.score, hi: S.hi, wave: S.wave, lives: player.lives }));
  console.log(JSON.stringify({ paused, over, playing, state, errors }, null, 2));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
