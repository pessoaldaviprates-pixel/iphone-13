const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errs = []; const out = {};
  p.on('pageerror', e => errs.push('ERRO: ' + e.message));
  await p.goto(JOGO + '');
  await p.waitForTimeout(900);

  // desenha um padrão no canvas (coordenadas de tela)
  async function desenhar(pontos) {
    const cx = await p.evaluate(() => {
      const r = document.getElementById('senha-canvas').getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    });
    const pos = i => ({
      x: cx.x + (120 + (i % 3) * 180) * (cx.w / 600),
      y: cx.y + (120 + Math.floor(i / 3) * 180) * (cx.h / 600)
    });
    const a = pos(pontos[0]);
    await p.mouse.move(a.x, a.y);
    await p.mouse.down();
    for (const i of pontos.slice(1)) {
      const q = pos(i);
      await p.mouse.move(q.x, q.y, { steps: 6 });
      await p.waitForTimeout(60);
    }
    await p.mouse.up();
    await p.waitForTimeout(350);
  }

  // 1) criar piloto pede senha (criar + confirmar)
  await p.fill('#new-name', 'Davi'); await p.tap('#btn-new'); await p.waitForTimeout(500);
  out.telaSenha = await p.evaluate(() => ({
    visivel: document.getElementById('screen-senha').classList.contains('show'),
    titulo: document.getElementById('senha-titulo').textContent, modo: senhaEstado.modo
  }));
  await desenhar([0, 1, 2, 5]);
  out.aposPrimeira = await p.evaluate(() => ({ modo: senhaEstado.modo, titulo: document.getElementById('senha-titulo').textContent }));
  // erra a confirmação de propósito
  await desenhar([0, 3, 6, 7]);
  out.confirmacaoErrada = await p.evaluate(() => ({ modo: senhaEstado.modo, dica: document.getElementById('senha-dica').textContent }));
  // agora faz certo
  await desenhar([0, 1, 2, 5]);
  await p.waitForTimeout(200);
  await desenhar([0, 1, 2, 5]);
  out.criou = await p.evaluate(() => ({
    modo: S.mode, temSenha: !!ROOT.profiles['Davi'].senha, perfil: ROOT.current
  }));

  // 2) sair e entrar: senha errada bloqueia, certa entra
  await p.tap('#btn-logout'); await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelectorAll('#profile-list .profile-btn')[0].click());
  await p.waitForTimeout(400);
  out.pedeSenha = await p.evaluate(() => ({ modo: S.mode, verif: senhaEstado.modo }));
  await desenhar([2, 5, 8, 7]);   // errada
  out.senhaErrada = await p.evaluate(() => ({ modo: S.mode, dica: document.getElementById('senha-dica').textContent }));
  await desenhar([0, 1, 2, 5]);   // certa
  out.entrou = await p.evaluate(() => ({ modo: S.mode, perfil: ROOT.current }));
  await p.screenshot({ path: 'senha.png' });

  // 3) conta antiga (sem senha) é obrigada a criar
  await p.evaluate(() => {
    ROOT.profiles['Antigo'] = defaultSave();
    ROOT.profiles['Antigo'].senha = null;
    ROOT.profiles['Antigo'].crystals = 500;
    persist();
    S.mode = 'login'; renderLogin(); showScreen('login');
  });
  await p.waitForTimeout(300);
  await p.evaluate(() => {
    const bs = Array.from(document.querySelectorAll('#profile-list .profile-btn'));
    bs.find(b => b.textContent.includes('Antigo')).click();
  });
  await p.waitForTimeout(400);
  out.contaAntiga = await p.evaluate(() => ({
    modo: S.mode, modoSenha: senhaEstado.modo, dica: document.getElementById('senha-dica').textContent
  }));
  await desenhar([6, 7, 8, 5]);
  await p.waitForTimeout(200);
  await desenhar([6, 7, 8, 5]);
  out.antigoMigrado = await p.evaluate(() => ({
    modo: S.mode, temSenha: !!ROOT.profiles['Antigo'].senha, cristais: ROOT.profiles['Antigo'].crystals
  }));

  // 4) vida por nave
  out.vida = await p.evaluate(() => {
    const r = {};
    save.ship = 0; calcStats(); r.naveInicial = ST.maxHp;
    save.upgrades.hull = 5; calcStats(); r.comCasco = ST.maxHp;
    save.ships.push(B2); save.ship = B2; calcStats(); r.b2 = ST.maxHp;
    save.upgrades.hull = 0; save.ship = 0; calcStats();
    return r;
  });
  await p.evaluate(() => startGame(5));
  await p.waitForTimeout(1200);
  out.hpEmJogo = await p.evaluate(() => {
    const antes = player.hp;
    player.invuln = 0; player.shield = 0;
    hitPlayer();
    return { antes, depois: Math.round(player.hp), vidas: player.lives,
             barra: document.getElementById('hud-hp-fill').style.width,
             texto: document.getElementById('hud-hp-txt').textContent };
  });
  await p.screenshot({ path: 'hp.png' });

  console.log(JSON.stringify({ out, errs }, null, 2));
  await b.close();
  process.exit(errs.length ? 1 : 0);
})().catch(e => { console.error('FATAL', e.message.split('\n')[0]); process.exit(2); });
