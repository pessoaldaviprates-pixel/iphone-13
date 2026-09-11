const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errs = []; const out = {};
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  p.on('console', m => { if (m.type()==='error' && !m.text().includes('ERR_')) errs.push('C: ' + m.text()); });
  await p.goto(JOGO + '');
  await p.waitForTimeout(900);
  await p.fill('#new-name', 'T'); await p.tap('#btn-new'); await p.waitForTimeout(300);
  for (let i=0;i<2;i++){ await p.evaluate(()=>{senhaEstado.seq=[0,1,2,5];senhaEstado.desenhando=true;senhaSoltar();}); await p.waitForTimeout(230); }
  await p.waitForTimeout(500);

  // bateria de cenários de dano
  out.cenarios = await p.evaluate(() => {
    const res = {};
    const teste = (nome, prep) => {
      try {
        startGame(5);
        prep && prep();
        player.invuln = 0; player.invis = 0;
        hitPlayer();
        res[nome] = 'ok hp=' + Math.round(player.hp) + ' vidas=' + player.lives;
      } catch (e) { res[nome] = 'CRASH: ' + e.message; }
    };
    teste('simples');
    teste('comEscudo', () => { player.shield = 5; });
    teste('semVida', () => { player.hp = 1; });
    teste('ultimaVida', () => { player.hp = 1; player.lives = 1; });
    teste('comNova', () => { ST.nova = true; });
    teste('comRevive', () => { ST.revive = 1; player.hp = 1; player.lives = 1; });
    teste('godMode', () => { save.godMode = true; });
    save.godMode = false;
    teste('naveMaverick', () => { save.ships.push(MAVERICK); save.ship = MAVERICK; calcStats(); });
    teste('naveB2', () => { save.ship = B2; calcStats(); });
    save.ship = 0; calcStats();
    return res;
  });

  // save de versão ANTIGA (índices antigos das naves) — como o do amigo
  out.saveAntigo = await p.evaluate(() => {
    const res = {};
    try {
      // simula alguém que tinha a Maverick quando ela era o índice 50
      save.ships = [0, 50, 51];
      save.ship = 50;
      calcStats();
      startGame(5);
      player.invuln = 0; player.shield = 0;
      hitPlayer();
      res.indice50 = 'ok, nave = ' + SHIPS[50].name;
    } catch (e) { res.indice50 = 'CRASH: ' + e.message; }
    try {
      save.ship = 999;            // índice inexistente
      calcStats();
      startGame(5);
      player.invuln = 0; player.shield = 0;
      hitPlayer();
      res.indiceInvalido = 'ok';
    } catch (e) { res.indiceInvalido = 'CRASH: ' + e.message; }
    save.ship = 0; calcStats();
    return res;
  });

  // dano por bala inimiga de verdade, em partida real
  await p.evaluate(() => { startGame(8); });
  await p.waitForTimeout(1500);
  out.balaReal = await p.evaluate(() => {
    try {
      player.invuln = 0; player.shield = 0;
      enemyBullets.push({ x: player.x, y: player.y, vx: 0, vy: 0, r: 5 });
      return 'bala criada';
    } catch (e) { return 'CRASH: ' + e.message; }
  });
  await p.waitForTimeout(1200);
  out.aposBala = await p.evaluate(() => ({ modo: S.mode, hp: Math.round(player.hp), vidas: player.lives }));

  // colisão com inimigo
  out.colisao = await p.evaluate(() => {
    try {
      startGame(8);
      player.invuln = 0; player.shield = 0;
      const e = spawnEnemy('drone');
      e.x = player.x; e.y = player.y;
      return 'inimigo posicionado';
    } catch (e) { return 'CRASH: ' + e.message; }
  });
  await p.waitForTimeout(1200);
  out.aposColisao = await p.evaluate(() => ({ modo: S.mode, hp: Math.round(player.hp) }));

  console.log(JSON.stringify({ out, errs }, null, 1));
  await b.close();
  process.exit(errs.length ? 1 : 0);
})().catch(e => { console.error('FATAL', e.message.split('\n')[0]); process.exit(2); });
