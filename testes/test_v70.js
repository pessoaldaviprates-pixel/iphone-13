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
  await p.waitForTimeout(1400);
  await p.evaluate(() => {
    ROOT.profiles['Davi'] = defaultSave(); ROOT.current = 'Davi';
    save = ROOT.profiles['Davi']; save.__name = 'Davi'; save.best = 80; save.tutorialFeito = true;
    save.estrelas = { 1: 3, 2: 2 }; calcStats(); persist(); nuvemEnviar(true); goMenu();
  });
  await p.waitForTimeout(1200);

  /* ---- que fase é de quê ---- */
  out.tipos = await p.evaluate(() => ({
    f13: tipoDaFase(13).id, f17: tipoDaFase(17).id, f20: tipoDaFase(20).id,
    f25: tipoDaFase(25).id, f12: tipoDaFase(12).id,
    fuga13: faseDePerseguicao(13), fuga3: faseDePerseguicao(3),
    resgate27: faseDeResgate(27), resgate7: faseDeResgate(7)
  }));

  /* ---- fase de fuga ---- */
  await p.evaluate(() => startGame(23));
  await p.waitForTimeout(2000);
  out.fuga = await p.evaluate(() => ({
    ligou: !!S.fuga, semInimigos: S.toSpawn === 0,
    barra: document.getElementById('fuga-barra').className,
    pedras: ASTEROIDES.length
  }));
  await p.screenshot({ path: 'v70-fuga.png' });
  out.fugaAcaba = await p.evaluate(() => {
    S.fuga.t = 41.9;
    perseguicaoPassar(0.2);
    return { acabou: !S.fuga, modo: S.mode, limpou: ASTEROIDES.length };
  });

  /* ---- fase de resgate ---- */
  await p.evaluate(() => { goMenu(); startGame(27); });
  await p.waitForTimeout(2200);
  out.resgate = await p.evaluate(() => ({
    ligou: !!S.resgate, hp: S.resgate && S.resgate.hp,
    barra: document.getElementById('resgate-barra').className
  }));
  await p.screenshot({ path: 'v70-resgate.png' });
  out.resgateApanha = await p.evaluate(() => {
    const r = S.resgate;
    enemyBullets.push({ x: r.x, y: r.y, r: 4, vx: 0, vy: 0 });
    resgatePassar(0.016);
    return { hp: S.resgate && S.resgate.hp, tirouTiro: enemyBullets.length };
  });
  out.resgateChega = await p.evaluate(() => {
    S.resgate.y = S.resgate.alvoY + 1;
    const antes = save.crystals;
    resgatePassar(0.016);
    return { salvou: !S.resgate, ganhou: save.crystals - antes, modo: S.mode };
  });
  out.resgateCai = await p.evaluate(() => {
    goMenu(); startGame(27);
    return true;
  });
  await p.waitForTimeout(1800);
  out.resgateMorre = await p.evaluate(() => {
    if (!S.resgate) return { semResgate: true };
    S.resgate.hp = 0;
    resgatePassar(0.016);
    return { acabou: !S.resgate, modo: S.mode };
  });

  /* ---- mapa da jornada ---- */
  await p.evaluate(() => { goMenu(); mapaAbrir(); });
  await p.waitForTimeout(800);
  out.mapa = await p.evaluate(() => ({
    tela: S.mode,
    blocos: document.querySelectorAll('.mapa-bloco').length,
    fases: document.querySelectorAll('.mapa-f').length,
    chefes: document.querySelectorAll('.mapa-f.chefe').length,
    fugas: document.querySelectorAll('.mapa-f.fuga').length,
    resgates: document.querySelectorAll('.mapa-f.resgate').length,
    regras: document.querySelectorAll('.mapa-f.regra').length,
    feitas: document.querySelectorAll('.mapa-f.feita').length,
    agora: document.querySelectorAll('.mapa-f.agora').length
  }));
  await p.screenshot({ path: 'v70-mapa.png' });
  out.mapaJoga = await p.evaluate(() => {
    document.querySelector('[data-fase="5"]').click();
    return { modo: S.mode, fase: S.fase };
  });
  await p.waitForTimeout(800);

  /* ---- esquadrão ---- */
  await p.evaluate(() => { goMenu(); claAbrir(); });
  await p.waitForTimeout(700);
  out.claVazio = await p.evaluate(() => ({
    temCriar: !!document.getElementById('cla-criar'),
    temEntrar: !!document.getElementById('cla-entrar')
  }));
  out.claCria = await p.evaluate(async () => {
    const r = await claCriar('Os Cometas');
    return { ok: r.ok, msg: r.msg.slice(0, 40), codigo: r.codigo, guardou: save.cla };
  });
  await p.evaluate(() => claRender());
  await p.waitForTimeout(1200);
  out.claTela = await p.evaluate(() => ({
    linhas: document.querySelectorAll('.cla-linha').length,
    temCapa: !!document.querySelector('.cla-capa'),
    texto: (document.querySelector('.cla-capa b') || {}).textContent
  }));
  await p.screenshot({ path: 'v70-cla.png' });
  /* um segundo piloto entra pelo código */
  const p2 = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })).newPage();
  await p2.goto(JOGO + '?nuvem=http://127.0.0.1:8099');
  await p2.waitForTimeout(1300);
  out.claEntra = await p2.evaluate(async cod => {
    ROOT.profiles['Amigo2'] = defaultSave(); ROOT.current = 'Amigo2';
    save = ROOT.profiles['Amigo2']; save.__name = 'Amigo2'; save.best = 40;
    calcStats(); persist(); await nuvemEnviar(true);
    const r = await claEntrar(cod);
    return { ok: r.ok, msg: r.msg.slice(0, 40), cla: save.cla };
  }, out.claCria.codigo);
  await p.evaluate(() => claRender());
  await p.waitForTimeout(1400);
  out.claDois = await p.evaluate(() => document.querySelectorAll('.cla-linha').length);
  out.claSai = await p.evaluate(async () => { await claSair(); return save.cla; });

  out.errs = errs;
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.log('FATAL ' + e.message.split('\n')[0]); process.exit(1); });
