const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errs = []; const out = {};
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await p.goto(JOGO + '');
  await p.waitForTimeout(900);
  await p.fill('#new-name', 'T'); await p.tap('#btn-new'); await p.waitForTimeout(300);
  for (let i=0;i<2;i++){ await p.evaluate(()=>{senhaEstado.seq=[0,1,2,5];senhaEstado.desenhando=true;senhaSoltar();}); await p.waitForTimeout(230); }
  await p.waitForTimeout(500);

  // 1) save quebrado (nave inexistente) agora é consertado
  out.saveQuebrado = await p.evaluate(() => {
    const bruto = { ship: 999, ships: [0, 999, -5, 'x'], crystals: 10 };
    const s = mergeSave(bruto);
    return { ship: s.ship, ships: s.ships };
  });

  // 2) dano com índice inválido não derruba mais
  out.danoIndiceInvalido = await p.evaluate(() => {
    try {
      save.ship = 999; calcStats();
      startGame(5);
      player.invuln = 0; player.shield = 0;
      hitPlayer();
      return { ok: true, hp: Math.round(player.hp), maxHp: ST.maxHp };
    } catch (e) { return { ok: false, erro: e.message }; }
  });
  await p.evaluate(() => { save.ship = 0; calcStats(); });

  // 3) hp corrompido (NaN) se recupera
  out.hpNaN = await p.evaluate(() => {
    startGame(5);
    player.hp = NaN; player.invuln = 0; player.shield = 0;
    hitPlayer();
    return { hp: Math.round(player.hp), vidas: player.lives, finito: isFinite(player.hp) };
  });

  // 4) a tela de erro aparece quando algo quebra de verdade
  out.telaDeErro = await p.evaluate(() => {
    mostrarErro("Teste: algo deu errado", "teste.js:1");
    const box = document.getElementById('erro-box');
    return { visivel: box.classList.contains('on'), texto: document.getElementById('erro-msg').textContent.split('\n')[0],
             temContexto: document.getElementById('erro-msg').textContent.includes('versão') };
  });
  await p.screenshot({ path: 'erro.png' });

  // 5) erro dentro do laço não derruba a partida
  out.laco = await p.evaluate(() => new Promise(res => {
    document.getElementById('erro-fechar').click();
    startGame(5);
    const orig = draw;
    let disparou = false;
    window.draw = function () { if (!disparou) { disparou = true; throw new Error('falha proposital no desenho'); } return orig.apply(this, arguments); };
    setTimeout(() => {
      window.draw = orig;
      res({ jogoVivo: S.mode === 'playing' || S.mode === 'paused',
            caixaApareceu: document.getElementById('erro-box').classList.contains('on') });
    }, 900);
  }));

  console.log(JSON.stringify({ out, errs }, null, 1));
  await b.close();
})();
