const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = []; const out = {};
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_')) errs.push('CONSOLE: ' + m.text()); });
  await p.goto(JOGO + '?nuvem=http://127.0.0.1:8099');
  await p.waitForTimeout(1400);
  await p.evaluate(() => {
    ROOT.profiles['Davi'] = defaultSave(); ROOT.current = 'Davi';
    save = ROOT.profiles['Davi']; save.__name = 'Davi'; save.best = 40; save.crystals = 5000;
    save.tutorialFeito = true; calcStats(); persist(); goMenu();
  });
  await p.waitForTimeout(900);

  /* ---- qual save é o melhor ---- */
  out.melhorSave = await p.evaluate(() => {
    const velho = { best: 100, crystals: 5000, ships: [0, 1], pts: 20, savedAt: 999999999999 };
    const novoFraco = { best: 3, crystals: 10, ships: [0], pts: 1, savedAt: Date.now() };
    const ganhou = melhorSave(velho, novoFraco);
    return { escolheuOMaior: ganhou === velho,
             pesoMaior: pesoDoSave(velho) > pesoDoSave(novoFraco),
             semSave: pesoDoSave(null) };
  });

  /* ---- cópia no banco do aparelho ---- */
  out.copia = await p.evaluate(async () => {
    save.best = 77; persist();
    copiaSegura();
    await new Promise(r => setTimeout(r, 900));
    const lido = await lerCopiaSegura();
    return { guardou: !!lido, temPerfil: !!(lido && lido.profiles && lido.profiles['Davi']),
             fase: lido && lido.profiles && lido.profiles['Davi'] && lido.profiles['Davi'].best };
  });
  /* apaga o armazenamento do site e vê se a cópia devolve */
  out.recuperou = await p.evaluate(async () => {
    ROOT.profiles['Davi'].best = 1;          // finge que o save foi limpo
    persist();
    const r = await conferirCopia();
    return { usou: r.usou, faseDeVolta: ROOT.profiles['Davi'].best };
  });

  /* ---- economia de bateria ---- */
  out.bateria = await p.evaluate(async () => {
    let erro = null;
    try { await bateriaCuidar(); } catch (e) { erro = e.message; }
    return { erro, temObjeto: typeof BATERIA === 'object' };
  });

  /* ---- fila de pedidos avisa o dono ---- */
  out.pedidoAviso = await p.evaluate(async () => {
    save.__name = 'Cr1cket';
    pedidosVistos = {};
    await nuvemSoltar('loja_pedidos/teste1', { de: 'x', estado: 'pago', itemNome: 'VIP 30', preco: 1 });
    await new Promise(r => setTimeout(r, 400));
    await pedidosOlhar();
    const faixa = document.getElementById('pedido-faixa').className;
    const texto = document.getElementById('pedido-faixa').textContent;
    await pedidosOlhar();                     // segunda vez não repete
    return { faixa, texto: texto.slice(0, 30), naoRepete: Object.keys(pedidosVistos).length };
  });
  await p.screenshot({ path: 'v69-pedido.png' });

  /* ---- teste fechado ---- */
  out.teste = await p.evaluate(async () => {
    const ok = await testeFechadoLigar('6.7', 'multijogador novo', 'Amigao, Maverick');
    const t = await nuvemReq('mundo/teste');
    save.__name = 'Cr1cket';
    testeAplicar(t);
    const paraDono = document.getElementById('teste-faixa').className;
    save.__name = 'Amigao';
    testeAplicar(t);
    const paraTestador = document.getElementById('teste-faixa').className;
    save.__name = 'Zezinho';
    testeAplicar(t);
    const paraOutro = document.getElementById('teste-faixa').className;
    save.__name = 'Davi';
    return { gravou: ok, quem: (t && t.quem) || [], paraDono, paraTestador, paraOutro };
  });

  out.errs = errs;
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.log('FATAL ' + e.message.split('\n')[0]); process.exit(1); });
