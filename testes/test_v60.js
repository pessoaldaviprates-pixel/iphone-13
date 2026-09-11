const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = []; const out = {};
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_')) errs.push('CONSOLE: ' + m.text()); });
  await p.goto(JOGO + '?nuvem=http://127.0.0.1:8099');
  await p.waitForTimeout(1200);
  await p.evaluate(() => {
    ROOT.profiles['Davi'] = defaultSave(); ROOT.current = 'Davi';
    save = ROOT.profiles['Davi']; save.__name = 'Davi'; save.best = 12; save.crystals = 1000;
    calcStats(); persist(); goMenu();
  });
  await p.waitForTimeout(900);

  /* ---- presente do dia ---- */
  out.diaria = await p.evaluate(() => ({
    aparece: getComputedStyle(document.getElementById('diaria-cartao')).display,
    temBotao: !!document.getElementById('diaria-pegar'),
    texto: document.getElementById('diaria-cartao').textContent.slice(0, 40)
  }));
  await p.click('#diaria-pegar');
  await p.waitForTimeout(600);
  out.diariaPegou = await p.evaluate(() => ({
    cristais: save.crystals,
    dia: save.diaria.dia,
    seq: save.diaria.seq,
    naoRepete: !document.getElementById('diaria-pegar'),
    texto: document.getElementById('diaria-cartao').textContent.slice(0, 30)
  }));

  /* ---- missões ---- */
  out.missoes = await p.evaluate(() => {
    const e = misEstado();
    return { dia: e.dia, quantas: e.itens.length, tipos: e.itens.map(i => i.tipo),
             rotulos: e.itens.map(i => misRotulo(i)),
             resumoVisivel: getComputedStyle(document.getElementById('missoes-resumo')).display };
  });
  out.missoesEstaveis = await p.evaluate(() => {
    const a = JSON.stringify(misEstado().itens.map(i => i.tipo + i.alvo));
    misEstado();
    const c = JSON.stringify(misEstado().itens.map(i => i.tipo + i.alvo));
    return a === c;
  });
  // completa a primeira missão na marra e pega o prêmio
  out.missaoPremio = await p.evaluate(() => {
    const e = misEstado();
    const antes = save.crystals;
    e.itens[0].feito = e.itens[0].alvo;
    misBadge(); misRender();
    const temBotao = !!document.querySelector('[data-mis="0"]');
    misPegar(0);
    return { temBotao, ganhou: save.crystals - antes, premio: e.itens[0].premio, pego: e.itens[0].pego };
  });
  await p.evaluate(() => misAbrir());
  await p.waitForTimeout(500);
  await p.screenshot({ path: 'v60-missoes.png' });

  /* ---- ajustes ---- */
  await p.evaluate(() => { goMenu(); });
  await p.waitForTimeout(400);
  await p.click('#btn-ajustes');
  await p.waitForTimeout(600);
  await p.screenshot({ path: 'v60-ajustes.png' });
  out.ajustes = await p.evaluate(() => ({
    tela: S.mode,
    barras: document.querySelectorAll('.aj-range').length,
    chaves: document.querySelectorAll('.aj-chave').length
  }));
  // mexe no volume e no daltônico
  out.ajusteMexe = await p.evaluate(() => {
    const el = document.getElementById('aj-efe');
    el.value = 20; el.dispatchEvent(new Event('input'));
    document.getElementById('aj-dalt').click();
    document.getElementById('aj-fps').click();
    return { volEfe: AJ.volEfe, daltonico: AJ.daltonico, fps: AJ.fps,
             corTiro: corTiroInimigo({ homing: false }),
             classe: document.body.className.indexOf('daltonico') >= 0,
             fpsVisivel: getComputedStyle(document.getElementById('fps-conta')).display };
  });
  // recarrega para ver se os ajustes ficaram guardados
  await p.reload();
  await p.waitForTimeout(1400);
  out.ajusteGuardou = await p.evaluate(() => ({ volEfe: AJ.volEfe, daltonico: AJ.daltonico }));

  /* ---- combo e estrelas, dentro da partida ---- */
  await p.evaluate(() => {
    ROOT.current = 'Davi'; save = ROOT.profiles['Davi']; save.__name = 'Davi';
    calcStats(); goMenu(); startGame(3);
  });
  await p.waitForTimeout(1200);
  out.combo = await p.evaluate(() => {
    const antes = S.score;
    for (let i = 0; i < 12; i++) {
      const e = enemies[0] || { x: 100, y: 100, score: 10, type: 'grunt', hp: 0 };
      killEnemy(e);
    }
    return { combo: S.combo, mult: Math.round(comboMult() * 100) / 100,
             hud: document.getElementById('combo-hud').textContent,
             visivel: document.getElementById('combo-hud').className,
             pontuou: S.score > antes };
  });
  await p.screenshot({ path: 'v60-combo.png' });
  out.comboEsfria = await p.evaluate(() => { comboPassar(9); return S.combo; });

  /* ---- estrelas: sem dano e rápido = 3 ---- */
  out.estrelas = await p.evaluate(() => {
    save.estrelas = {};
    const tres = estrelasDaFase(3, 20, true);
    const antes = save.crystals;
    const denovo = estrelasDaFase(3, 20, true);   // repetir não paga de novo
    return { tres, denovo, pagouDeNovo: save.crystals - antes,
             uma: estrelasDaFase(4, 400, false),
             total: estrelasTotal() };
  });

  /* ---- a tela de vitória mostra as estrelas ---- */
  await p.evaluate(() => { S.estrelasAgora = { fase: 3, estrelas: 3, novas: 1 }; vitoriaEstrelas(); });
  await p.waitForTimeout(1200);
  out.vitoria = await p.evaluate(() => ({
    acesas: document.querySelectorAll('#vic-estrelas i.on').length,
    nota: document.getElementById('vic-estrelas-nota').textContent
  }));

  /* ---- a lista de fases mostra as estrelas ---- */
  await p.evaluate(() => { goMenu(); save.estrelas = { 1: 3, 2: 1 }; showScreen('levels'); renderLevels(); });
  await p.waitForTimeout(700);
  out.lista = await p.evaluate(() => {
    const b1 = document.querySelectorAll('.fase-btn.done')[0];
    return { primeira: b1 ? b1.textContent : null,
             temTotal: document.querySelector('.fase-resumo').textContent.indexOf('ESTRELAS') >= 0 };
  });
  await p.screenshot({ path: 'v60-fases.png' });

  out.errs = errs;
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.log('FATAL ' + e.message.split('\n')[0]); process.exit(1); });
