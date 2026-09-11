const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
const fs = require('fs');
  'window.NN_CONFIG = { NUVEM_URL: "http://127.0.0.1:8099" };');
const URL = JOGO + '?nuvem=http://127.0.0.1:8099';

async function criarPiloto(page, nome, padrao) {
  await page.goto(URL);
  await page.waitForTimeout(900);
  await page.fill('#new-name', nome);
  await page.tap('#btn-new');
  await page.waitForTimeout(400);
  // desenha a senha duas vezes via API interna (o traço já foi testado à parte)
  for (let i = 0; i < 2; i++) {
    await page.evaluate(pts => { senhaEstado.seq = pts.slice(); senhaEstado.desenhando = true; senhaSoltar(); }, padrao);
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(600);
  return page.evaluate(() => ({ modo: S.mode, nome: save.__name }));
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = []; const out = {};
  const ctxA = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const ctxB = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p1 = await ctxA.newPage(), p2 = await ctxB.newPage();
  p1.on('pageerror', e => errs.push('P1: ' + e.message));
  p2.on('pageerror', e => errs.push('P2: ' + e.message));

  out.login1 = await criarPiloto(p1, 'Davi', [0,1,2,5]);
  out.login2 = await criarPiloto(p2, 'Amigo', [0,3,6,7]);

  // ambos com naves boas
  for (const p of [p1, p2]) {
    await p.evaluate(() => { save.ships.push(30); save.ship = 30; save.best = 12; persist(); calcStats(); goMenu(); });
  }

  // 1) COOPERATIVO: cria sala e o outro entra pelo código
  await p1.evaluate(()=>abrirMulti('coop')); await p1.waitForTimeout(500);
  await p1.tap('#coop-criar'); await p1.waitForTimeout(1200);
  const codigo = await p1.evaluate(() => MP.sala);
  out.sala = { codigo, modo: await p1.evaluate(() => MP.modo), host: await p1.evaluate(() => MP.host) };

  await p2.evaluate(()=>abrirMulti('coop')); await p2.waitForTimeout(400);
  await p2.fill('#coop-codigo', codigo);
  await p2.tap('#coop-entrar'); await p2.waitForTimeout(1400);
  out.entrou = await p2.evaluate(() => ({ modo: S.mode, sala: MP.sala, host: MP.host }));
  await p1.waitForTimeout(900);
  out.lobby = await p1.evaluate(() => ({
    jogadores: document.querySelectorAll('#sala-jogadores .jog-row').length,
    dica: document.getElementById('sala-dica').textContent
  }));
  await p1.screenshot({ path: 'sala.png', fullPage: true });

  // 2) anfitrião começa; os dois entram na partida
  await p1.tap('#sala-comecar'); await p1.waitForTimeout(1600);
  out.p1Jogando = await p1.evaluate(() => ({ modo: S.mode, duelo: !!S.duelo, fase: S.fase }));
  await p2.waitForTimeout(1400);
  out.p2Jogando = await p2.evaluate(() => ({ modo: S.mode, fase: S.fase }));

  // 3) um vê o outro
  await p1.evaluate(() => { player.tx = player.x = 100; player.ty = player.y = 600; });
  await p2.evaluate(() => { player.tx = player.x = 300; player.ty = player.y = 500; });
  await p1.waitForTimeout(1800);
  out.vejoOutro = await p1.evaluate(() => {
    const ids = Object.keys(MP.outros);
    const o = ids.length ? MP.outros[ids[0]] : null;
    return o ? { nome: o.nome, x: o.x, y: o.y, hp: o.hp, placar: getComputedStyle(document.getElementById('mp-placar')).display } : null;
  });
  await p1.screenshot({ path: 'coop.png' });

  // sai do cooperativo
  await p1.evaluate(() => mpSair(true)); await p1.waitForTimeout(600);
  await p2.evaluate(() => mpSair(true)); await p2.waitForTimeout(600);

  // 4) COMPETITIVO: duelo
  await p1.evaluate(()=>abrirMulti('pvp')); await p1.waitForTimeout(400);
  await p1.evaluate(() => trocarAbaMulti('pvp')); await p1.waitForTimeout(300);
  out.cartaoPvp = await p1.evaluate(() => ({
    rank: document.getElementById('pvp-meu-rank').textContent,
    pontos: document.getElementById('pvp-meus-pontos').textContent
  }));
  await p1.tap('#pvp-criar'); await p1.waitForTimeout(1200);
  const cod2 = await p1.evaluate(() => MP.sala);
  await p2.evaluate(()=>abrirMulti('pvp')); await p2.waitForTimeout(300);
  await p2.evaluate(() => trocarAbaMulti('pvp')); await p2.waitForTimeout(200);
  await p2.fill('#pvp-codigo', cod2);
  await p2.tap('#pvp-entrar'); await p2.waitForTimeout(1400);
  await p1.tap('#sala-comecar'); await p1.waitForTimeout(1600);
  await p2.waitForTimeout(1200);
  out.duelo = {
    p1: await p1.evaluate(() => ({ modo: S.mode, duelo: !!S.duelo, inimigos: enemies.length })),
    p2: await p2.evaluate(() => ({ modo: S.mode, duelo: !!S.duelo }))
  };
  await p1.screenshot({ path: 'duelo.png' });

  // 5) p2 "perde" -> p1 vence e ganha rank
  const rankAntes = await p1.evaluate(() => save.rank || 0);
  await p2.evaluate(() => { player.hp = 0; player.alive = false; });
  await p2.waitForTimeout(700);
  await p1.waitForTimeout(4000);
  out.fimDuelo = await p1.evaluate(rk => ({
    modo: S.mode, titulo: document.getElementById('go-title').textContent,
    msg: document.getElementById('go-gems').textContent,
    rankAntes: rk, rankDepois: save.rank, vitorias: save.vitorias
  }), rankAntes);
  await p1.screenshot({ path: 'duelo-fim.png' });

  // 6) amigos
  await p1.evaluate(() => { goMenu(); abrirMulti('amigos'); });
  await p1.waitForTimeout(1500);
  out.amigos = await p1.evaluate(() => ({
    online: document.querySelectorAll('#online-lista .profile-btn').length,
    nomes: Array.from(document.querySelectorAll('#online-lista .profile-name')).map(e => e.textContent)
  }));
  await p1.evaluate(() => {
    const b = Array.from(document.querySelectorAll('#online-lista .profile-btn'))
      .find(x => x.textContent.includes('Amigo'));
    if (b) b.click();
  });
  await p1.waitForTimeout(1200);
  out.aposAdicionar = await p1.evaluate(() => ({ amigos: save.amigos, na_lista: document.querySelectorAll('#amigos-lista .profile-btn').length }));
  await p1.screenshot({ path: 'amigos.png', fullPage: true });

  // 7) tabelas
  await p1.evaluate(() => { goMenu(); S.mode='rank'; renderRanking(true); showScreen('rank'); });
  await p1.waitForTimeout(1600);
  out.tabelas = await p1.evaluate(() => ({
    abas: Array.from(document.querySelectorAll('#rank-abas .aba')).map(a => a.textContent),
    linhas: document.querySelectorAll('.rank-row').length
  }));
  await p1.evaluate(() => { abaRanking = 'horas'; renderRanking(false); });
  await p1.waitForTimeout(500);
  out.abaHoras = await p1.evaluate(() => ({
    rotulo: document.querySelector('.rank-fase span') ? document.querySelector('.rank-fase span').textContent : null,
    valor: document.querySelector('.rank-fase') ? document.querySelector('.rank-fase').textContent : null
  }));
  await p1.screenshot({ path: 'tabelas.png', fullPage: true });

  console.log(JSON.stringify({ out, errs }, null, 2));
  await b.close();
  process.exit(errs.length ? 1 : 0);
})().catch(e => {
  console.error('FATAL', e.message.split('\n')[0]); process.exit(2);
});
