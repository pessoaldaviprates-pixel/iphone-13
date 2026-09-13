/* =====================================================================
   AS FILAS DE ABAS NO COMPUTADOR

   O jogo é feito para celular, e as filas de abas rolam de lado com o
   dedo. No computador isso não funcionava: a barra de rolagem está
   escondida de propósito, a roda do mouse rola a PÁGINA, e o Tab levava
   o foco para abas fora da vista. A aba que não coubesse na largura
   simplesmente não existia para quem joga no computador — sem erro
   nenhum, só sumida.

   Este teste varre o jogo inteiro, acha TODA fila que rola de lado, e
   cobra das três: roda do mouse, setas do teclado e foco visível.
   ===================================================================== */
const path = require('path');
const { chromium } = require('playwright');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const out = {}; const errs = []; const problemas = [];
  /* janela de computador, e SEM hasTouch: é o caso que estava quebrado */
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_')) errs.push('CONSOLE: ' + m.text()); });
  await p.goto(JOGO + '?nuvem=http://127.0.0.1:8099');
  await p.waitForTimeout(1400);
  await p.evaluate(() => { const el = document.getElementById('abertura'); if (el) { el.className = ''; el.innerHTML = ''; } });
  await p.evaluate(() => {
    ROOT.profiles['Davi'] = defaultSave(); ROOT.current = 'Davi'; save = ROOT.profiles['Davi'];
    save.__name = 'Davi'; save.best = 120; save.crystals = 500000; save.tutorialFeito = true;
    save.ships = []; for (let i = 0; i < 40; i++) save.ships.push(i);
    calcStats(); persist(); goMenu();
  });
  await p.evaluate(() => idiomaUsar('pt'));
  await p.waitForTimeout(700);

  /* ---- a fila mais estreita de propósito: o catálogo do painel ----
     doze categorias numa coluna de 440px não cabem de jeito nenhum, então
     é a prova mais honesta que existe no jogo. */
  await p.evaluate(() => showScreen('adm'));
  await p.waitForTimeout(300);
  await p.fill('#adm-nick', 'Cr1cket');
  await p.fill('#adm-pass', 'neonadmin');
  await p.click('#btn-adm-enter');
  await p.waitForTimeout(800);
  await p.evaluate(() => {
    vivoDados = { a1: { nome: 'Lucas', fase: 20, cristais: 900, versao: VERSAO,
                        onde: 'Menu', atualizado: Date.now(), entrou: Date.now() } };
    vivoRender();
    abaAdm = 'acoes'; renderAbasAdm();
    admNuvemSelecionar(Object.assign({ id: 'a1' }, vivoDados.a1));
    subAcao = 'catalogo'; renderSubAcoes();
  });
  await p.waitForTimeout(600);

  const medir = sel => p.evaluate(s => {
    const f = document.querySelector(s);
    if (!f) return null;
    return { existe: true, rola: f.scrollWidth > f.clientWidth + 1,
             scrollLeft: f.scrollLeft, largura: Math.round(f.clientWidth),
             conteudo: Math.round(f.scrollWidth) };
  }, sel);

  out.catalogoAntes = await medir('#cat-abas');

  /* ---- 1) A RODA DO MOUSE ---- */
  const rodar = async sel => {
    const cx = await p.evaluate(s => {
      const f = document.querySelector(s); const r = f.getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    }, sel);
    await p.mouse.move(cx.x, cx.y);
    await p.mouse.wheel(0, 240);
    await p.waitForTimeout(220);
    return p.evaluate(s => document.querySelector(s).scrollLeft, sel);
  };
  out.rodaDoMouse = await rodar('#cat-abas');

  /* ---- 2) AS SETAS DO TECLADO ---- */
  out.teclado = await p.evaluate(async () => {
    const f = document.getElementById('cat-abas');
    const bts = [...f.querySelectorAll('button')];
    bts[0].focus();
    const de = document.activeElement.textContent.trim();
    return { de, total: bts.length, primeiroFocado: document.activeElement === bts[0] };
  });
  await p.keyboard.press('ArrowRight');
  await p.keyboard.press('ArrowRight');
  await p.waitForTimeout(200);
  out.teclado.depoisDeDuasSetas = await p.evaluate(() =>
    document.activeElement.textContent.trim());
  await p.keyboard.press('End');
  await p.waitForTimeout(250);
  out.teclado.noFim = await p.evaluate(() => ({
    aba: document.activeElement.textContent.trim(),
    /* e a última aba tem que estar DENTRO da vista */
    dentroDaVista: (() => {
      const f = document.getElementById('cat-abas');
      const r = document.activeElement.getBoundingClientRect();
      const rf = f.getBoundingClientRect();
      return r.left >= rf.left - 2 && r.right <= rf.right + 2;
    })(),
    focoVisivel: getComputedStyle(document.activeElement).outlineStyle !== 'none'
  }));

  /* ---- 3) a roda NÃO pode roubar a rolagem de uma fila que já cabe ---- */
  out.filaQueCabe = await p.evaluate(() => {
    /* .sub-abas quebra linha em vez de rolar: a roda ali tem que
       continuar sendo da página */
    const f = document.querySelector('.sub-abas');
    return f ? { rola: f.scrollWidth > f.clientWidth + 1 } : null;
  });

  /* ---- 4) TODAS as filas do jogo, tela por tela ----
     Abre cada tela, acha as filas que rolam e confere que a roda funciona
     em cada uma. É o que impede de consertar o catálogo e esquecer o
     hangar. */
  const TELAS = [
    ['menu', () => goMenu()],
    ['hangar', () => { goMenu(); portaAbrir('nave'); document.querySelector('[data-ir="btn-hangar"]').click(); }],
    ['ranking', () => { goMenu(); portaAbrir('online'); document.querySelector('[data-ir="btn-rank"]').click(); }],
    ['mapa', () => { goMenu(); portaAbrir('progresso'); document.querySelector('[data-ir="btn-mapa"]').click(); }],
    ['loja', () => { goMenu(); portaAbrir('loja'); }]
  ];
  out.telas = {};
  for (const [nome, ir] of TELAS) {
    try { await p.evaluate(f => eval('(' + f + ')()'), ir.toString()); } catch (e) {}
    await p.waitForTimeout(600);
    const filas = await p.evaluate(sel => {
      const vis = e => { const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4; };
      return [...document.querySelectorAll(sel)].filter(vis)
        .filter(f => f.scrollWidth > f.clientWidth + 1)
        .map(f => ({ classe: f.className.split(' ')[0], id: f.id || '',
                     largura: Math.round(f.clientWidth), conteudo: Math.round(f.scrollWidth) }));
    }, ".abas,.adm-abas,.cn-filtros,.hangar-filtros,.areas,.dif-linha,.comp-abas,.cat-abas,.msg-rapidas,.sub-abas");
    out.telas[nome] = { filas };
    /* e cada uma tem que rolar na roda */
    for (let i = 0; i < filas.length; i++) {
      const antes = await p.evaluate(arg => {
        const vis = e => { const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4; };
        const f = [...document.querySelectorAll(arg.sel)].filter(vis)
          .filter(x => x.scrollWidth > x.clientWidth + 1)[arg.k];
        const r = f.getBoundingClientRect();
        window.__fila = f;
        return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2),
                 scrollLeft: f.scrollLeft };
      }, { sel: ".abas,.adm-abas,.cn-filtros,.hangar-filtros,.areas,.dif-linha,.comp-abas,.cat-abas,.msg-rapidas,.sub-abas", k: i });
      await p.mouse.move(antes.x, antes.y);
      await p.mouse.wheel(0, 200);
      await p.waitForTimeout(180);
      const depois = await p.evaluate(() => window.__fila.scrollLeft);
      filas[i].rolouComARoda = depois > antes.scrollLeft;
      await p.evaluate(() => { window.__fila.scrollLeft = 0; });
    }
  }

  await p.screenshot({ path: 'filas.png' });
  await b.close();
  out.errs = errs;
  const erro = m => problemas.push(m);

  if (!out.catalogoAntes || !out.catalogoAntes.existe) erro('nao achei a fila do catalogo');
  else if (!out.catalogoAntes.rola)
    erro('a fila do catalogo nem rola: o teste perdeu o sentido (largura ' +
         out.catalogoAntes.largura + ', conteudo ' + out.catalogoAntes.conteudo + ')');
  if (!(out.rodaDoMouse > 0)) erro('a RODA DO MOUSE nao rolou a fila de abas (scrollLeft ' + out.rodaDoMouse + ')');
  if (!out.teclado.primeiroFocado) erro('nao deu para focar a primeira aba');
  if (out.teclado.depoisDeDuasSetas === out.teclado.de)
    erro('as SETAS do teclado nao andaram entre as abas');
  if (!out.teclado.noFim.dentroDaVista)
    erro('a aba focada com End ficou FORA da vista: o foco sumiu da tela');
  if (!out.teclado.noFim.focoVisivel) erro('a aba com foco de teclado nao se ve');
  if (out.filaQueCabe && out.filaQueCabe.rola)
    erro('as abinhas deviam quebrar linha em vez de rolar');
  for (const tela in out.telas) {
    for (const f of out.telas[tela].filas) {
      if (!f.rolouComARoda)
        erro('em ' + tela + ', a fila .' + f.classe + (f.id ? '#' + f.id : '') +
             ' nao rola com a roda do mouse');
    }
  }
  if (errs.length) erro('erros de pagina: ' + errs.join(' | '));

  console.log(JSON.stringify(out, null, 1));
  if (problemas.length) { console.log('FALHOU: ' + problemas.join('; ')); process.exit(1); }
  console.log('OK: as filas de abas rolam com roda, teclado e foco em todo o jogo');
})().catch(e => { console.log('FATAL ' + e.message.split('\n')[0]); process.exit(1); });
