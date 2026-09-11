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
    save = ROOT.profiles['Davi']; save.__name = 'Davi'; save.best = 200; save.chefes = 30;
    save.vitorias = 30; save.tutorialFeito = true; save.desde = Date.now();
    calcStats(); persist(); nuvemEnviar(true); goMenu();
  });
  await p.waitForTimeout(1200);

  /* ---- dica na troca de fase ---- */
  out.carregando = await p.evaluate(() => {
    carregandoMostrar(37);
    const el = document.getElementById('carregando');
    return { visivel: el.className, temFase: el.textContent.indexOf('FASE 37') >= 0,
             temDica: el.textContent.indexOf('💡') >= 0, dicas: DICAS.length };
  });
  await p.screenshot({ path: 'v68-carregando.png' });

  /* ---- resumo animado ---- */
  out.resumo = await p.evaluate(async () => {
    vitoriaResumo({ segundos: 84, combo: 23, dano: 2, tiros: 500, acertos: 380 });
    await new Promise(r => setTimeout(r, 1400));
    const cx = document.getElementById('vic-resumo');
    return { linhas: cx.querySelectorAll('.vres-linha').length,
             tempo: (document.getElementById('vres-tempo') || {}).textContent,
             combo: (document.getElementById('vres-combo') || {}).textContent,
             precisao: (document.getElementById('vres-prec') || {}).textContent };
  });

  /* ---- molduras ---- */
  out.molduras = await p.evaluate(() => {
    moldurasRender();
    const total = document.querySelectorAll('.mold-cx').length;
    const travadas = document.querySelectorAll('.mold-cx.travada').length;
    const usou = molduraUsar('ouro');
    save.best = 1;
    const naoPode = molduraUsar('estrela');
    save.best = 200;
    return { total, travadas, usou, atual: molduraAtual(), naoPode };
  });

  /* ---- trilha que reage ---- */
  out.trilha = await p.evaluate(() => {
    let erro = null;
    try { musicaTensao(); } catch (e) { erro = e.message; }
    return { erro, temFuncao: typeof musicaTensao === 'function' };
  });

  /* ---- oferta do primeiro dia ---- */
  out.oferta = await p.evaluate(() => {
    save.desde = Date.now() - 3600000;  // 1h de conta
    save.ofertaUsada = false;
    const o = ofertaDoInicio();
    ofertaRender();
    const visivel = getComputedStyle(document.getElementById('loja-oferta')).display;
    save.desde = Date.now() - 48 * 3600000;   // conta velha
    const velha = ofertaDoInicio();
    return { tem: !!o, horas: o && o.horasQueFaltam, preco: o && o.preco,
             visivel, depoisDe24h: velha };
  });

  /* ---- aviso de VIP acabando ---- */
  out.vipAviso = await p.evaluate(() => {
    save.vipAte = Date.now() + 2 * 86400000;   // 2 dias
    vipAvisoRender();
    const perto = getComputedStyle(document.getElementById('vip-aviso')).display;
    save.vipAte = Date.now() + 20 * 86400000;  // 20 dias
    vipAvisoRender();
    const longe = getComputedStyle(document.getElementById('vip-aviso')).display;
    save.vipAte = 0;
    vipAvisoRender();
    return { perto, longe, semVip: getComputedStyle(document.getElementById('vip-aviso')).display };
  });

  /* ---- presentear um amigo ---- */
  const p2 = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true })).newPage();
  await p2.goto(JOGO + '?nuvem=http://127.0.0.1:8099');
  await p2.waitForTimeout(1200);
  await p2.evaluate(() => {
    ROOT.profiles['Amigao'] = defaultSave(); ROOT.current = 'Amigao';
    save = ROOT.profiles['Amigao']; save.__name = 'Amigao'; calcStats(); persist(); nuvemEnviar(true); goMenu();
  });
  await p2.waitForTimeout(1500);
  out.presente = await p.evaluate(async () => {
    presenteRender();
    const r = await presenteProcurar('Amigao');
    const marcou = PRESENTE_ALVO && PRESENTE_ALVO.nome;
    presentearNaLoja('vip:30', 'VIP 30 dias', 1.00, { dias: 30 });
    return { achou: r.ok, alvo: marcou, tela: S.mode,
             item: (document.getElementById('pagar-item') || {}).textContent,
             guardou: COMPRA.presentePara ? 'sim' : 'não' };
  });
  await p.evaluate(() => pagFechar());

  /* ---- comprovante e cancelar ---- */
  out.comprovante = await p.evaluate(() => {
    const t = comprovante({ chave: 'abc123', itemNome: 'VIP 30 dias', preco: 1, quando: Date.now(), estado: 'pago' });
    return { linhas: t.split('\n').length, temChave: t.indexOf('abc123') > 0, temValor: t.indexOf('R$') > 0 };
  });

  out.errs = errs;
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.log('FATAL ' + e.message.split('\n')[0]); process.exit(1); });
