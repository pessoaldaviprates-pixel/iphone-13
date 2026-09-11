const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = []; const out = {};
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
                                   permissions: ['clipboard-read', 'clipboard-write'] });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_')) errs.push('CONSOLE: ' + m.text()); });
  await p.goto(JOGO + '?nuvem=http://127.0.0.1:8099');
  await p.waitForTimeout(1300);

  /* ---- nome e perigo das fases ---- */
  out.nomes = await p.evaluate(() => ({
    f1: faseNome(1), f37: faseNome(37), estavel: faseNome(37) === faseNome(37),
    perigo10: fasePerigo(10), perigo3: fasePerigo(3),
    diferentes: new Set([1,2,3,4,5,6,7,8,9,10,20,30,40,50].map(faseNome)).size
  }));

  /* ---- tutorial: jogador novo entra na fase 1 ---- */
  await p.evaluate(() => {
    ROOT.profiles['Novato'] = defaultSave(); ROOT.current = 'Novato';
    save = ROOT.profiles['Novato']; save.__name = 'Novato';
    calcStats(); persist(); goMenu(); startGame(1);
  });
  await p.waitForTimeout(1200);
  out.tutorial = await p.evaluate(() => ({
    ligado: TUTO.ligado, passo: TUTO.passo,
    caixa: document.getElementById('tuto-caixa').className,
    texto: document.getElementById('tuto-caixa').textContent.slice(0, 45),
    cartaoFase: document.getElementById('fase-cartao').textContent.slice(0, 30)
  }));
  await p.screenshot({ path: 'v61-tutorial.png' });
  // anda com o dedo: o passo 1 tem de fechar
  out.tutorialAnda = await p.evaluate(() => {
    for (let i = 0; i < 30; i++) { player.x += 12; tutoPassar(0.1); }
    return { passo: TUTO.passo, texto: document.getElementById('tuto-caixa').textContent.slice(0, 30) };
  });
  out.tutorialTermina = await p.evaluate(() => {
    for (let i = 0; i < 200; i++) tutoPassar(0.1);
    return { ligado: TUTO.ligado, feito: save.tutorialFeito };
  });
  // quem já jogou não vê de novo
  out.tutorialSoUmaVez = await p.evaluate(() => { save.best = 5; return tutoPrecisa(); });

  /* ---- contadores ---- */
  out.contadores = await p.evaluate(() => {
    const antes = { abates: save.abates || 0, tiros: save.tiros || 0 };
    playerShoot();
    killEnemy({ x: 10, y: 10, score: 5, type: 'grunt' });
    return { tiros: (save.tiros || 0) - antes.tiros, abates: (save.abates || 0) - antes.abates,
             partidas: save.partidas, temDesde: !!save.desde };
  });

  /* ---- conquistas ---- */
  out.conquistas = await p.evaluate(() => {
    save.best = 55; save.abates = 1200; save.chefes = 2; save.melhorCombo = 30;
    conqBadge(); conqRender();
    const prontas = conqProntas();
    const antes = save.crystals;
    conqPegar('fase50');
    return { total: CONQUISTAS.length, prontas, ganhou: save.crystals - antes,
             pegou: !!save.conquistas.fase50, naoPegaDuasVezes: (conqPegar('fase50'), save.crystals - antes),
             badge: document.getElementById('conq-badge').textContent };
  });
  await p.evaluate(() => conqAbrir());
  await p.waitForTimeout(600);
  await p.screenshot({ path: 'v61-conquistas.png' });

  /* ---- perfil ---- */
  await p.evaluate(() => perfilAbrir());
  await p.waitForTimeout(600);
  out.perfil = await p.evaluate(() => ({
    tela: S.mode,
    caixas: document.querySelectorAll('.perf-cx').length,
    linhas: document.querySelectorAll('.perf-linha').length,
    temNome: document.querySelector('.perf-nome').textContent.length > 0,
    precisao: document.querySelector('.perf-lista').textContent.indexOf('Precisão') >= 0
  }));
  await p.screenshot({ path: 'v61-perfil.png' });

  /* ---- convite ---- */
  // cria quem convida, na nuvem
  const p2 = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  await p2.goto(JOGO + '?nuvem=http://127.0.0.1:8099');
  await p2.waitForTimeout(1200);
  await p2.evaluate(() => {
    ROOT.profiles['Chamador'] = defaultSave(); ROOT.current = 'Chamador';
    save = ROOT.profiles['Chamador']; save.__name = 'Chamador'; save.tag = 'CHAMADOR';
    calcStats(); persist(); nuvemEnviar(true); goMenu();
  });
  await p2.waitForTimeout(1500);

  await p.evaluate(() => { save.best = 2; save.conviteUsado = null; convAbrir(); });
  await p.waitForTimeout(600);
  out.convite = await p.evaluate(() => ({
    meuCodigo: meuCodigo(),
    temCampo: !!document.getElementById('conv-campo')
  }));
  out.conviteUsa = await p.evaluate(async () => {
    const antes = save.crystals;
    const r = await conviteUsar('Chamador');
    return { ok: r.ok, msg: r.msg.slice(0, 60), ganhou: save.crystals - antes, de: save.conviteUsado };
  });
  out.conviteSoUmaVez = await p.evaluate(async () => (await conviteUsar('Chamador')).msg.slice(0, 40));
  out.conviteNaoEuMesmo = await p.evaluate(async () => (await conviteUsar('Novato')).msg.slice(0, 30));
  // quem convidou recebe pela caixa de presente
  await p2.evaluate(() => nuvemVerificarPresentes());
  await p2.waitForTimeout(1800);
  out.chamadorRecebeu = await p2.evaluate(() => ({
    cristais: save.crystals, recado: (recadoDoPresente || '').slice(0, 40)
  }));
  await p.screenshot({ path: 'v61-convite.png' });

  /* ---- foto da partida ---- */
  out.foto = await p.evaluate(() => {
    const url = fotoDaPartida('Fase 12 concluída', ['Corredor de Ferro', '★★☆ · 4.200 pontos', 'combo máximo x18']);
    return { tipo: url.slice(0, 22), tamanho: url.length > 20000 };
  });
  await p.evaluate(() => fotoMostrar('Fase 12 concluída', ['Corredor de Ferro', '★★☆ · 4.200 pontos']));
  await p.waitForTimeout(700);
  out.fotoNaTela = await p.evaluate(() => ({
    aberta: document.getElementById('foto-caixa').className,
    temImagem: !!document.querySelector('#foto-caixa img')
  }));
  await p.screenshot({ path: 'v61-foto.png' });

  out.errs = errs;
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.log('FATAL ' + e.message.split('\n')[0]); process.exit(1); });
