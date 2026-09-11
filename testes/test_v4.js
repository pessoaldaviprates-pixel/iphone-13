const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_')) errors.push('CONSOLE: ' + m.text()); });
  const out = {};

  await page.goto(JOGO + '');
  await page.waitForTimeout(1200);

  // 1) login: cria piloto
  out.loginShown = await page.evaluate(() => document.getElementById('screen-login').classList.contains('show'));
  await page.fill('#new-name', 'Davi');
  await page.tap('#btn-new');
  await page.waitForTimeout(400);
  out.hello = await page.evaluate(() => document.getElementById('menu-hello').textContent);
  await page.screenshot({ path: 'v4-menu.png' });

  // 2) oficina 3D: pintura + armamento
  await page.evaluate(() => { save.crystals = 200000; persist(); });
  await page.tap('#btn-hangar');
  await page.waitForTimeout(500);
  await page.evaluate(() => { openOficina(); });
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'v4-oficina.png' });
  const dmg0 = await page.evaluate(() => ST.dmg);
  // compra uma pintura nova (2º swatch) e o plasma
  await page.evaluate(() => { document.querySelectorAll('#paint-row .swatch')[1].click(); });
  await page.waitForTimeout(200);
  out.paint = await page.evaluate(() => ({ hue: save.custom[0] && save.custom[0].hue, crystals: save.crystals }));
  await page.evaluate(() => {
    const cards = document.querySelectorAll('#weap-list .weap-card');
    cards[2].querySelector('.buy-btn').click(); // plasma
  });
  await page.waitForTimeout(200);
  out.plasma = await page.evaluate(() => ({ sel: curWeaponId(), dmgUp: ST.dmg > 1.5, style: ST.wStyle }));
  out.dmg0 = dmg0;
  await page.screenshot({ path: 'v4-oficina2.png' });

  // 3) cutscene
  await page.evaluate(() => playCutscene(0, 'hangar'));
  await page.waitForTimeout(2500);
  out.cutMode = await page.evaluate(() => S.mode);
  await page.screenshot({ path: 'v4-cutscene.png' });
  await page.tap('#cut-skip');
  await page.waitForTimeout(400);
  out.afterCut = await page.evaluate(() => S.mode);

  // 4) relíquias: baú + equipar + capa
  await page.evaluate(() => { goMenu(); });
  await page.tap('#btn-reliquias');
  await page.waitForTimeout(400);
  await page.tap('#btn-chest');
  await page.waitForTimeout(400);
  out.chest = await page.evaluate(() => ({ n: save.amulets.length, reveal: document.getElementById('amu-reveal').style.display }));
  await page.evaluate(() => {
    save.amulets.push({ uid: save.amuletSeq++, type: 'capa', rar: 3 });
    save.equipped = [save.amulets[save.amulets.length - 1].uid];
    persist(); calcStats(); renderReliquias();
  });
  out.cloakStat = await page.evaluate(() => ST.cloak);
  await page.screenshot({ path: 'v4-reliquias.png' });

  // 5) chefes: os 6 tipos
  const bosses = {};
  for (const fase of [5, 10, 15, 20, 25, 30]) {
    await page.evaluate(f => {
      save.best = Math.max(save.best, f - 1);
      startGame(f);
      S.waveIdx = S.nWaves;
      setupWave();
    }, fase);
    await page.waitForTimeout(2200);
    bosses[fase] = await page.evaluate(() => {
      if (boss && boss.entering) { boss.entering = false; boss.y = Math.max(120, H * 0.17); }
      return boss ? { kind: boss.kind, zones: bossZones().length, hp: bossHpLeft() } : null;
    });
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'v4-boss-' + fase + '.png' });
  }
  out.bosses = bosses;

  // 6) ultimate (nave 1 = Devastadora -> Fúria) e capa
  await page.evaluate(() => { startGame(3); S.ultCharge = 1; ultBtnSync(); });
  await page.waitForTimeout(300);
  await page.tap('#ult-btn');
  await page.waitForTimeout(200);
  out.ult = await page.evaluate(() => ({ fury: S.furyT > 0, charge: S.ultCharge }));
  out.cloakBtnVisible = await page.evaluate(() => getComputedStyle(document.getElementById('cloak-btn')).display !== 'none');
  await page.tap('#cloak-btn');
  await page.waitForTimeout(200);
  out.cloak = await page.evaluate(() => ({ invis: player.invis > 0, cd: player.cloakCd > 0 }));
  await page.screenshot({ path: 'v4-cloak.png' });

  // 7) vitória de chefe dá amuleto
  await page.evaluate(() => {
    save.best = 4;
    startGame(5);
    S.waveIdx = S.nWaves;
    setupWave();
  });
  await page.waitForTimeout(2200);
  const before = await page.evaluate(() => save.amulets.length);
  await page.evaluate(() => {
    if (boss && boss.entering) { boss.entering = false; boss.y = Math.max(120, H * 0.17); }
    let n = 0;
    while (boss && n++ < 500) damageBossAny(99999);
  });
  await page.waitForTimeout(2500);
  out.bossVictory = await page.evaluate(b => ({
    victory: document.getElementById('screen-victory').classList.contains('show'),
    amuletShown: document.getElementById('vic-amulet').style.display,
    gained: save.amulets.length - b
  }), before);
  await page.screenshot({ path: 'v4-victory.png' });

  // 8) painel ADM
  await page.evaluate(() => { goMenu(); });
  await page.tap('#btn-logout');
  await page.waitForTimeout(300);
  await page.tap('#btn-goto-adm');
  await page.waitForTimeout(300);
  await page.fill('#adm-pass', 'segredo123');
  await page.tap('#btn-adm-enter');
  await page.waitForTimeout(300);
  const gemsBefore = await page.evaluate(() => ROOT.profiles['Davi'].crystals);
  await page.evaluate(() => { document.querySelectorAll('#adm-players .profile-btn')[0].click(); });
  await page.tap('#adm-give-gems');
  await page.waitForTimeout(200);
  out.adm = await page.evaluate(gb => ({
    msg: document.getElementById('adm-msg').textContent,
    gained: ROOT.profiles['Davi'].crystals - gb,
    passSet: !!ROOT.adminPass
  }), gemsBefore);
  // senha errada bloqueia
  await page.tap('#btn-adm-back');
  await page.tap('#btn-goto-adm');
  await page.fill('#adm-pass', 'errada');
  await page.tap('#btn-adm-enter');
  await page.waitForTimeout(200);
  out.admWrong = await page.evaluate(() => document.getElementById('adm-panel').style.display === 'none');
  await page.screenshot({ path: 'v4-adm.png' });

  // 9) persistência
  await page.reload();
  await page.waitForTimeout(1200);
  out.persisted = await page.evaluate(() => ({
    profiles: Object.keys(ROOT.profiles),
    davi: ROOT.profiles['Davi'] ? { crystals: ROOT.profiles['Davi'].crystals, amulets: ROOT.profiles['Davi'].amulets.length } : null
  }));

  console.log(JSON.stringify({ out, errors }, null, 2));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
