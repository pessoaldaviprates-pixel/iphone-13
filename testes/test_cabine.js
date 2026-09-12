/* =====================================================================
   A CABINE ENTRA E SAI SEM LEVAR O JOGO JUNTO

   O modo 3D e um motor inteiro dentro do mesmo arquivo do jogo 2D. O
   risco nao e ele funcionar -- e ele estragar o resto: agarrar o arrasto
   do menu, deixar um laco de animacao solto queimando bateria, ou
   quebrar uma tela que nao tem nada a ver.

   Entao o teste entra pela porta MINHA NAVE como o dedo entra, voa,
   volta, e confere que o 2D continua inteiro.
   ===================================================================== */
const path = require('path');
const { chromium } = require('playwright');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const out = {}; const errs = []; const problemas = [];
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_')) errs.push('CONSOLE: ' + m.text()); });
  await p.goto(JOGO + '?nuvem=http://127.0.0.1:8099');
  await p.waitForTimeout(1500);
  await p.evaluate(() => { const el = document.getElementById('abertura'); if (el) { el.className = ''; el.innerHTML = ''; } });
  await p.evaluate(() => {
    ROOT.profiles['Davi'] = defaultSave(); ROOT.current = 'Davi';
    save = ROOT.profiles['Davi']; save.__name = 'Davi'; save.best = 40;
    save.crystals = 5000; save.tutorialFeito = true;
    calcStats(); persist(); goMenu();
  });
  await p.waitForTimeout(900);
  await p.evaluate(() => idiomaUsar('pt'));
  await p.waitForTimeout(400);

  /* nada do 3D pode ter nascido antes de alguem entrar */
  out.antesDeEntrar = await p.evaluate(() => ({ montada: CABINE_PRONTA, ligada: cabineLigada }));

  /* o caminho do dedo: porta MINHA NAVE -> a linha da cabine */
  await p.evaluate(() => portaAbrir('nave'));
  await p.waitForTimeout(500);
  out.linhaExiste = await p.evaluate(() =>
    !!document.querySelector('[data-ir="btn-cabine"]'));
  await p.evaluate(() => {
    const l = document.querySelector('[data-ir="btn-cabine"]');
    if (l) l.click();
  });
  await p.waitForTimeout(2500);

  out.dentro = await p.evaluate(() => ({
    modo: S.mode,
    telaVisivel: getComputedStyle(document.getElementById('screen-cabine')).display !== 'none',
    montada: CABINE_PRONTA,
    ligada: cabineLigada,
    semWebgl: getComputedStyle(document.getElementById('c3-erro')).display !== 'none'
  }));

  if (out.dentro.semWebgl) {
    problemas.push('nao abriu o WebGL no navegador de teste');
  } else {
    /* voar: arrasta o manche e confere que a nave se mexeu */
    const antes = await p.evaluate(() => cabineAPI.estado.pos.slice());
    await p.mouse.move(195, 520); await p.mouse.down();
    await p.mouse.move(250, 470, { steps: 10 });
    await p.waitForTimeout(1500);
    out.voando = await p.evaluate(a => {
      const e = cabineAPI.estado;
      const andou = Math.hypot(e.pos[0]-a[0], e.pos[1]-a[1], e.pos[2]-a[2]);
      return { andou: Math.round(andou), virou: Math.abs(e.giroY) > 0.05, manche: cabineAPI.manche.ativo };
    }, antes);
    await p.mouse.up();
    await p.waitForTimeout(400);
    await p.screenshot({ path: 'cabine-jogo.png' });
  }

  /* sair: o laço tem que parar de verdade, senão come bateria em silêncio */
  await p.evaluate(() => cabineSair());
  await p.waitForTimeout(900);
  out.depoisDeSair = await p.evaluate(() => ({
    modo: S.mode,
    ligada: cabineLigada,
    quadro: cabineQuadro,
    menuVisivel: getComputedStyle(document.getElementById('screen-menu')).display !== 'none'
  }));

  /* o arrasto no menu não pode ter virado manche */
  await p.mouse.move(195, 400); await p.mouse.down();
  await p.mouse.move(260, 340, { steps: 8 }); await p.mouse.up();
  await p.waitForTimeout(400);
  out.menuLimpo = await p.evaluate(() => ({
    mancheAtivo: !!(cabineAPI && cabineAPI.manche.ativo), modo: S.mode }));

  /* e o jogo 2D continua jogando */
  await p.tap('#btn-play');
  await p.waitForTimeout(1400);
  out.jogo2d = await p.evaluate(() => ({ modo: S.mode, fase: S.fase }));

  await b.close();
  out.errs = errs;

  if (out.antesDeEntrar.montada) problemas.push('o 3D nasceu antes de alguem entrar');
  if (!out.linhaExiste) problemas.push('a linha da cabine nao aparece na porta MINHA NAVE');
  if (out.dentro.modo !== 'cabine') problemas.push('o botao nao levou para a cabine');
  if (!out.dentro.telaVisivel) problemas.push('a tela da cabine nao apareceu');
  if (!out.dentro.semWebgl) {
    if (!out.voando || out.voando.andou < 10) problemas.push('a nave nao andou');
    if (!out.voando.virou) problemas.push('o manche nao virou a nave');
  }
  if (out.depoisDeSair.ligada) problemas.push('a cabine continuou ligada depois de sair');
  if (out.depoisDeSair.quadro !== 0) problemas.push('sobrou laco de animacao rodando apos sair');
  if (!out.depoisDeSair.menuVisivel) problemas.push('nao voltou para o menu');
  if (out.menuLimpo.mancheAtivo) problemas.push('o arrasto no menu virou manche');
  if (out.jogo2d.modo !== 'levels') problemas.push('o jogo 2D parou de funcionar depois da cabine');
  if (errs.length) problemas.push('erros de pagina: ' + errs.join(' | '));

  console.log(JSON.stringify(out, null, 1));
  if (problemas.length) { console.log('FALHOU: ' + problemas.join('; ')); process.exit(1); }
  console.log('OK: a cabine entra, voa, sai limpa e nao atrapalha o jogo');
})().catch(e => { console.log('FATAL ' + e.message.split('\n')[0]); process.exit(1); });
