const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errs = []; const out = {};
  p.on('pageerror', e => errs.push('ERRO: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_')) errs.push('CONSOLE: ' + m.text()); });

  await p.goto(JOGO + '');
  await p.waitForTimeout(1000);
  await p.fill('#new-name', 'Davi'); await p.tap('#btn-new'); await p.waitForTimeout(500);

  // 1) as exclusivas existem e não são compráveis
  out.naves = await p.evaluate(() => ({
    total: SHIPS.length,
    maverick: SHIPS[MAVERICK].name, b2: SHIPS[B2].name,
    habMaverick: HABILIDADES[MAVERICK].length,
    habB2: HABILIDADES[B2].length,
    ultM: ULTS[SHIPS[MAVERICK].ultId].name, ultB: ULTS[SHIPS[B2].ultId].name
  }));
  await p.evaluate(() => { save.crystals = 99999999; persist(); S.mode='hangar'; renderHangar(false); showScreen('hangar'); });
  await p.waitForTimeout(500);
  out.hangarBloqueado = await p.evaluate(() => {
    const cards = document.querySelectorAll('.ship-card');
    const c = cards[MAVERICK];
    return { texto: c.querySelector('.ship-tag').textContent,
             botao: c.querySelector('.buy-btn').textContent,
             desabilitado: c.querySelector('.buy-btn').disabled };
  });
  // desbloquear tudo NÃO dá as exclusivas
  await p.evaluate(() => { admDesbloquearTudo(save); persist(); });
  out.tudoNaoDaExclusivas = await p.evaluate(() => ({
    naves: save.ships.length,
    temMaverick: save.ships.includes(MAVERICK), temB2: save.ships.includes(B2)
  }));

  // 2) ADM entrega o Maverick
  await p.evaluate(() => { goMenu(); });
  await p.tap('#btn-logout'); await p.waitForTimeout(200);
  await p.tap('#btn-goto-adm'); await p.waitForTimeout(200);
  await p.fill('#adm-nick','Cr1cket'); await p.fill('#adm-pass', 'neonadmin'); await p.tap('#btn-adm-enter'); await p.waitForTimeout(500);
  await p.evaluate(() => admSelect('Davi')); await p.waitForTimeout(300);
  await p.tap('#adm-maverick'); await p.waitForTimeout(400);
  await p.tap('#adm-b2'); await p.waitForTimeout(400);
  out.admEntregou = await p.evaluate(() => ({
    naves: ROOT.profiles['Davi'].ships.slice(-2),
    usando: ROOT.profiles['Davi'].ship
  }));

  // 3) Maverick em jogo: 5 botões e cada habilidade funciona
  await p.evaluate(() => { loginAs('Davi'); save.ship = MAVERICK; persist(); calcStats(); startGame(12); });
  await p.waitForTimeout(1500);
  out.maverickJogo = await p.evaluate(() => ({
    botoes: document.querySelectorAll('#hab-bar .hab-btn').length,
    visivel: getComputedStyle(document.getElementById('hab-bar')).display,
    dano: Math.round(ST.dmg * 100) / 100
  }));
  const testarHab = async (id) => p.evaluate((hid) => {
    const antes = { mis: missilesArr.length, bombas: bombas.length, buracos: buracos.length,
                    fogo: fogo.length, balas: enemyBullets.length, invis: player.invis,
                    escudo: player.shield, hive: S.hiveT, vulcan: S.vulcanT, turbo: S.turboT,
                    rasante: !!rasante };
    // garante inimigos e balas na tela para medir efeito
    for (let i = 0; i < 6; i++) { const e = spawnEnemy('drone'); e.y = 120 + i * 60; e.x = 60 + i * 45; }
    for (let i = 0; i < 8; i++) enemyBullets.push({ x: 100 + i * 25, y: 300, vx: 0, vy: 100, r: 5 });
    const h = habilidadesDaNave().find(x => x.id === hid);
    habCd[hid] = 0;
    usarHabilidade(h);
    return { antes, depois: { mis: missilesArr.length, bombas: bombas.length, buracos: buracos.length,
             fogo: fogo.length, balas: enemyBullets.length, invis: player.invis,
             escudo: player.shield, hive: S.hiveT, vulcan: S.vulcanT, turbo: S.turboT,
             rasante: !!rasante }, cd: habCd[hid] };
  }, id);
  out.habMaverick = {};
  for (const id of ['sidewinder', 'vulcan', 'posComb', 'flares', 'rasante']) {
    out.habMaverick[id] = await testarHab(id);
    await p.waitForTimeout(250);
  }
  await p.screenshot({ path: 'maverick.png' });

  // 4) B-2: 10 habilidades
  await p.evaluate(() => { save.ship = B2; persist(); calcStats(); startGame(20); });
  await p.waitForTimeout(1500);
  out.b2Jogo = await p.evaluate(() => ({
    botoes: document.querySelectorAll('#hab-bar .hab-btn').length,
    combo: document.querySelectorAll('#hab-bar .hab-btn.combo').length
  }));
  out.habB2 = {};
  for (const id of ['bombardeio', 'buraco', 'furtivo', 'cruzador', 'emp', 'napalm', 'titanio', 'escolta', 'contra']) {
    out.habB2[id] = await testarHab(id);
    await p.waitForTimeout(220);
  }
  await p.screenshot({ path: 'b2.png' });

  // 5) SUPER NOVA: dois buracos negros colidindo
  out.superNova = await p.evaluate(async () => {
    startGame(20);
    await new Promise(r => setTimeout(r, 400));
    for (let i = 0; i < 8; i++) { const e = spawnEnemy('drone'); e.y = 150 + i * 50; e.x = 80 + i * 30; }
    const inimigosAntes = enemies.length;
    const bossAntes = boss ? bossHpLeft() : null;
    // cria dois buracos negros próximos
    buracos.push({ x: W/2 - 40, y: 260, r: 30, t: 7, pulso: 0 });
    buracos.push({ x: W/2 + 40, y: 260, r: 30, t: 7, pulso: 0 });
    return { inimigosAntes, bossAntes, buracos: buracos.length };
  });
  await p.waitForTimeout(2500);
  out.superNovaDepois = await p.evaluate(() => ({
    inimigos: enemies.length, buracos: buracos.length,
    clarao: S.superNova > 0,
    jogoRodando: S.mode === 'playing',
    texto: texts.map(t => t.str).join(',')
  }));
  await p.screenshot({ path: 'supernova.png' });

  // 6) as ultimates novas
  out.ults = await p.evaluate(async () => {
    const r = {};
    save.ship = MAVERICK; calcStats(); startGame(10);
    await new Promise(x => setTimeout(x, 300));
    S.ultCharge = 1; activateUlt();
    r.maverick = { rasante: !!rasante, tipo: ST.ultType };
    save.ship = B2; calcStats(); startGame(10);
    await new Promise(x => setTimeout(x, 300));
    S.ultCharge = 1; activateUlt();
    r.b2 = { chuva: S.chuvaFogo > 0, tipo: ST.ultType };
    return r;
  });
  await p.waitForTimeout(1200);
  out.chuvaCaindo = await p.evaluate(() => bombas.length > 0);

  // 7) o jogo continua vivo depois de tudo
  await p.waitForTimeout(1500);
  out.fim = await p.evaluate(() => ({ modo: S.mode, vivo: player.alive }));

  console.log(JSON.stringify({ out, errs }, null, 2));
  await b.close();
  process.exit(errs.length ? 1 : 0);
})().catch(e => { console.error('FATAL', e.message.split('\n')[0]); process.exit(2); });
