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
  await p.waitForTimeout(1300);
  await p.evaluate(() => {
    ROOT.profiles['Davi'] = defaultSave(); ROOT.current = 'Davi';
    save = ROOT.profiles['Davi']; save.__name = 'Davi'; save.best = 30; save.tutorialFeito = true;
    calcStats(); persist(); nuvemEnviar(true); goMenu();
  });
  await p.waitForTimeout(900);

  /* ---- convite por link ---- */
  out.link = await p.evaluate(() => ({
    link: linkDaSala('ABC123', 'coop').indexOf('sala=ABC123') > 0,
    modo: linkDaSala('ABC123', 'coop').indexOf('modo=coop') > 0,
    leDoLink: salaDoLink()
  }));

  /* ---- emotes ---- */
  await p.evaluate(() => startGame(3));
  await p.waitForTimeout(1200);
  out.emotes = await p.evaluate(() => {
    MP.sala = 'TESTE'; MP.modo = 'coop'; MP.eu = 'eu';
    emotesVisiveis(true);
    emotesRender();
    const botoes = document.querySelectorAll('.emote-b').length;
    emoteMandar('ok');
    const minhas = document.querySelectorAll('.emote-bolha.meu').length;
    emoteRecebido('boa');
    const todas = document.querySelectorAll('.emote-bolha').length;
    return { quantos: EMOTES.length, botoes, minhas, todas,
             caixa: document.getElementById('emote-caixa').className };
  });
  await p.screenshot({ path: 'v65-emotes.png' });

  /* ---- ping ---- */
  out.ping = await p.evaluate(() => {
    MP.outros = { p2p: { x: 100, y: 100, ts: Date.now() - 80, vivo: true } };
    pingRender();
    const el = document.getElementById('mp-ping');
    const bom = el.className;
    MP.outros.p2p.ts = Date.now() - 900;
    pingRender();
    return { valor: pingDoParceiro() !== null, classeBoa: bom, classeRuim: el.className,
             texto: el.textContent };
  });

  /* ---- reviver o parceiro ---- */
  out.reviver = await p.evaluate(() => {
    MP.modo = 'coop';
    MP.outros = { amigo: { x: player.x + 20, y: player.y, vivo: false, caiuEm: Date.now() } };
    player.alive = true;
    S.revivendo = 0;
    reviverPassar(0.1);
    const apareceu = document.getElementById('reviver-aviso').className;
    for (let i = 0; i < 30; i++) reviverPassar(0.1);   // 3s segurando
    return { caido: !!parceiroCaido(), aviso: apareceu,
             levantou: MP.outros.amigo.vivo === true };
  });
  out.reviverLonge = await p.evaluate(() => {
    MP.outros = { amigo: { x: 10, y: 10, vivo: false, caiuEm: Date.now() } };
    player.x = 350; player.y = 700;
    S.revivendo = 0;
    reviverPassar(0.1);
    return document.getElementById('reviver-aviso').className;
  });
  out.fuiRevivido = await p.evaluate(() => {
    player.alive = false; player.lives = 0; player.hp = 0;
    fuiRevivido();
    return { vivo: player.alive, vidas: player.lives, hp: Math.round(player.hp) };
  });

  /* ---- reconectar ---- */
  out.recon = await p.evaluate(() => {
    MP.sala = 'TESTE'; MP.ultimoOk = Date.now() - 9000;
    const caiu = conexaoCaiu();
    reconConferir();
    const tentando = RECON.tentando;
    const faixa = document.getElementById('recon-faixa').className;
    reconParar(); reconMostrar(null);
    MP.ultimoOk = Date.now();
    return { caiu, tentando, faixa, agoraOk: !conexaoCaiu() };
  });
  await p.evaluate(() => { MP.ultimoOk = Date.now() - 9000; reconConferir(); });
  await p.waitForTimeout(300);
  await p.screenshot({ path: 'v65-recon.png' });
  await p.evaluate(() => { reconParar(); reconMostrar(null); MP.sala = null; });

  /* ---- últimos parceiros ---- */
  out.ultimos = await p.evaluate(() => {
    save.ultimos = [];
    anotarParceiro('Maverick', 'MavPro');
    anotarParceiro('Ana', 'AninhaX');
    anotarParceiro('Maverick', 'MavPro');     // não duplica
    ultimosRender();
    return { guardados: save.ultimos.length, primeiro: save.ultimos[0].nome,
             linhas: document.querySelectorAll('.ult-linha').length };
  });

  /* ---- revanche ---- */
  out.revanche = await p.evaluate(() => {
    revancheRender('ABC123', 'pvp');
    const el = document.getElementById('revanche-caixa');
    return { visivel: el ? el.className : 'sem elemento', temBotao: !!document.getElementById('revanche-ir') };
  });

  out.errs = errs;
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.log('FATAL ' + e.message.split('\n')[0]); process.exit(1); });
