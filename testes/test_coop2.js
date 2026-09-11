const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
const fs = require('fs');
  'window.NN_CONFIG = { NUVEM_URL: "http://127.0.0.1:8099" };');
const URL = JOGO + '?nuvem=http://127.0.0.1:8099';
async function novoPiloto(page, nome, padrao) {
  await page.goto(URL); await page.waitForTimeout(800);
  await page.fill('#new-name', nome); await page.tap('#btn-new'); await page.waitForTimeout(300);
  for (let i = 0; i < 2; i++) {
    await page.evaluate(pts => { senhaEstado.seq = pts.slice(); senhaEstado.desenhando = true; senhaSoltar(); }, padrao);
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(400);
}
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
    args: ['--disable-background-timer-throttling','--disable-backgrounding-occluded-windows',
           '--disable-renderer-backgrounding'] });
  const errs = []; const out = {};
  const c1 = await b.newContext({ viewport:{width:390,height:844}, isMobile:true, hasTouch:true });
  const c2 = await b.newContext({ viewport:{width:390,height:844}, isMobile:true, hasTouch:true });
  const p1 = await c1.newPage(), p2 = await c2.newPage();
  p1.on('pageerror', e => errs.push('P1: ' + e.message));
  p2.on('pageerror', e => errs.push('P2: ' + e.message));
  await novoPiloto(p1, 'Pai', [0,1,2,5]);
  await novoPiloto(p2, 'Filho', [0,3,6,7]);

  // 270 fases e novidades
  out.geral = await p1.evaluate(() => ({
    fases: TOTAL_FASES, setores: SECTOR_NAMES.length,
    novidadesTela: !!document.getElementById('screen-novidades'),
    itensNovidades: document.querySelectorAll('#nov-lista .nov-item').length,
    versao: document.getElementById('nov-versao').textContent
  }));
  await p1.screenshot({ path: 'novidades.png' });

  // cooperativo
  await p1.evaluate(() => { save.coopBest = 3; persist(); });
  await p1.tap('#btn-multi'); await p1.waitForTimeout(400);
  await p1.tap('#coop-criar'); await p1.waitForTimeout(1200);
  const cod = await p1.evaluate(() => MP.sala);
  await p2.tap('#btn-multi'); await p2.waitForTimeout(300);
  await p2.fill('#coop-codigo', cod); await p2.tap('#coop-entrar'); await p2.waitForTimeout(1400);
  await p1.tap('#sala-comecar'); await p1.waitForTimeout(2000);
  await p2.waitForTimeout(1500);

  // INIMIGOS IGUAIS?
  const inimigos = async (pg) => pg.evaluate(() => enemies.map(e => e.type + ':' + Math.round(e.amp) + ':' + Math.round(e.speed)).sort());
  await p1.waitForTimeout(2500);
  const e1 = await inimigos(p1), e2 = await inimigos(p2);
  out.inimigosIguais = { p1: e1.length, p2: e2.length, iguais: JSON.stringify(e1) === JSON.stringify(e2), amostra: e1.slice(0,4) };

  // CHEFE COMPARTILHADO
  await p1.evaluate(() => { S.waveIdx = S.nWaves; S.fase = 4; enemies = []; setupWave(); });
  await p2.waitForTimeout(2500);
  await p1.waitForTimeout(1500);
  out.chefe = {
    p1: await p1.evaluate(() => boss ? { nome: boss.bname, max: boss.maxHp } : null),
    p2: await p2.evaluate(() => boss ? { nome: boss.bname, max: boss.maxHp } : null)
  };
  // p1 dá dano; p2 tem que ver a vida do chefe cair
  await p1.evaluate(() => {
    if (boss && boss.entering) { boss.entering = false; boss.y = 150; }
    const zs = bossZones();
    for (let i = 0; i < 30; i++) damageBossZone(zs[zs.length-1], 5);
  });
  await p1.waitForTimeout(1400);
  await p2.waitForTimeout(1400);
  out.danoCompartilhado = {
    danoP1: await p1.evaluate(() => Math.round(MP.meuDano)),
    totalVistoPorP2: await p2.evaluate(() => Math.round(MP.danoTotal)),
    vidaVistaP2: await p2.evaluate(() => boss ? Math.round(boss.maxHp - MP.danoTotal) : null)
  };

  // suavidade: quantas atualizações de posição chegam em 3s
  const contar = async (pg) => pg.evaluate(() => new Promise(res => {
    const t0 = MP.ticks || 0;
    let mudancas = 0, ult = null;
    const t = setInterval(() => {
      const id = Object.keys(MP.outros)[0];
      const o = id ? MP.outros[id] : null;
      if (o && o.ts !== ult) { mudancas++; ult = o.ts; }
    }, 25);
    setTimeout(() => {
      clearInterval(t);
      res({ leiturasDaSala: (MP.ticks || 0) - t0, posicoesNovas: mudancas,
            temSuavizacao: (() => { const id = Object.keys(MP.outros)[0];
              return id ? (MP.outros[id].dx !== undefined) : false; })() });
    }, 3000);
  }));
  out.diag = { p1: await p1.evaluate(() => ({ fluindo: MP.fluindo, modo: S.mode, sala: MP.sala, outros: Object.keys(MP.outros).length, ticks: MP.ticks })),
               p2: await p2.evaluate(() => ({ fluindo: MP.fluindo, modo: S.mode, sala: MP.sala, outros: Object.keys(MP.outros).length, ticks: MP.ticks })) };
  // volta os dois para uma partida, para medir o fluxo em jogo
  await p1.evaluate(() => { S.mode = 'playing'; }); await p2.evaluate(() => { S.mode = 'playing'; });
  await p1.waitForTimeout(400);
  out.em3s = await contar(p1);

  console.log(JSON.stringify({ out, errs }, null, 1));
  await b.close();
  process.exit(errs.length ? 1 : 0);
})().catch(e => {
  console.error('FATAL', e.message.split('\n')[0]); process.exit(2);
});
