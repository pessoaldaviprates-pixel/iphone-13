/* =====================================================================
   EXPLORAÇÃO ESPACIAL — o modo funciona E o resto do jogo continua

   A segunda metade é tão importante quanto a primeira: este modo é um
   motor 3D inteiro morando no mesmo arquivo do jogo 2D. O risco não é
   ele não funcionar -- é ele estragar o que já funcionava.
   ===================================================================== */
const path = require('path');
const { chromium } = require('playwright');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const out = {}; const errs = []; const problemas = [];
  /* paisagem: é como o modo pede para ser jogado */
  const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
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

  out.antes = await p.evaluate(() => ({ montada: EXPL_PRONTA, ligada: explLigada }));

  /* ---- entra pelo caminho do dedo ---- */
  await p.evaluate(() => { portaAbrir('nave'); });
  await p.waitForTimeout(400);
  out.linha = await p.evaluate(() => {
    const l = document.querySelector('[data-ir="btn-cabine"]');
    return l ? l.textContent.replace(/\s+/g, ' ').trim().slice(0, 40) : null;
  });
  await p.evaluate(() => document.querySelector('[data-ir="btn-cabine"]').click());
  await p.waitForTimeout(2500);

  out.dentro = await p.evaluate(() => ({
    modo: S.mode, ligada: explLigada,
    semWebgl: getComputedStyle(document.getElementById('c3-erro')).display !== 'none',
    controles: document.querySelectorAll('#screen-cabine [data-ctrl]').length,
    sistema: document.getElementById('c3-sistema').textContent
  }));
  if (out.dentro.semWebgl) { problemas.push('o WebGL nao abriu no navegador de teste'); }

  /* ---- a sequência de ligar: fora de ordem tem que EXPLICAR ---- */
  out.foraDeOrdem = await p.evaluate(() => {
    explAPI.apertar('motores');
    const a = explAPI.N.avisos[0];
    return { ligou: !!explAPI.N.ligado.motores, disse: a ? a.texto : null, tipo: a ? a.tipo : null };
  });
  out.ligando = await p.evaluate(() => {
    for (const id of ['bateria','energia','computadores','navegacao','combustivel',
                      'bombas','comunicacao','motores','estabilizadores','controles']) {
      explAPI.apertar(id);
    }
    return { ligados: Object.keys(explAPI.N.ligado).filter(k => explAPI.N.ligado[k]).length,
             podeVoar: !!(explAPI.N.ligado.controles && explAPI.N.ligado.motores) };
  });

  /* ---- voar de verdade ---- */
  const antesPos = await p.evaluate(() => explAPI.N.pos.slice());
  await p.evaluate(() => { explAPI.N.potencia = 0.8; });
  await p.mouse.move(200, 200); await p.mouse.down();
  await p.mouse.move(260, 160, { steps: 8 });
  await p.waitForTimeout(2000);
  out.voando = await p.evaluate(a => {
    const n = explAPI.N;
    return { andou: Math.round(Math.hypot(n.pos[0]-a[0], n.pos[1]-a[1], n.pos[2]-a[2])),
             virou: Math.abs(n.giroY) > 0.03, vel: Math.round(n.velocidade) };
  }, antesPos);
  await p.mouse.up();

  /* ---- combustível: normal gasta, infinito não ---- */
  out.combustivel = await p.evaluate(async () => {
    explAPI.N.combustivel = 80; explAPI.N.combustivelInfinito = false;
    const a = explAPI.N.combustivel;
    for (let i = 0; i < 60; i++) explAPI.passo(0.05);
    const b2 = explAPI.N.combustivel;
    explAPI.N.combustivelInfinito = true;
    for (let i = 0; i < 60; i++) explAPI.passo(0.05);
    const c = explAPI.N.combustivel;
    return { normalGastou: +(a - b2).toFixed(2), infinitoGastou: +(b2 - c).toFixed(2) };
  });

  /* ---- radar, scanner, mapa, salto, dano, reparo ---- */
  out.radar = await p.evaluate(() => {
    explAPI.apertar('radar');
    explPintarRadar();
    return { ligado: !!explAPI.ligadosCtrl.radar,
             pontos: document.querySelectorAll('#c3-radar i').length };
  });
  out.scanner = await p.evaluate(() => {
    explAPI.apertar('scanner'); explAPI.apertar('sensores');
    const pl = explAPI.sistema().planetas[0];
    explAPI.N.alvo = { tipo:'planeta', nome:pl.nome, x:pl.x, y:pl.y, z:pl.z, raio:pl.raio, ref:pl };
    explAPI.apertar('escanear');
    return { escaneando: explAPI.N.escaneando > 0 };
  });
  await p.waitForTimeout(2600);
  out.escaneou = await p.evaluate(() => explAPI.sistema().planetas[0].escaneado);

  out.mapa = await p.evaluate(() => {
    explAPI.apertar('mapa');
    const aberto = getComputedStyle(document.getElementById('c3-mapa')).display !== 'none';
    const sis = document.querySelectorAll('#c3-mapa [data-sis]').length;
    document.getElementById('c3-mapa-x').click();
    return { aberto, sistemas: sis };
  });

  out.salto = await p.evaluate(async () => {
    const de = explAPI.N.sistemaAtual;
    explAPI.N.destino = (de + 1) % explAPI.SISTEMAS.length;
    /* o teste anterior deixou o infinito ligado: sem desligar aqui, o
       salto nao teria como gastar nada e a falha seria do teste */
    explAPI.N.combustivelInfinito = false;
    explAPI.N.combustivel = 100;
    explAPI.apertar('hiper');
    const comecou = !!explAPI.N.salto;
    const etapas = [];
    for (let i = 0; i < 400; i++) {
      explAPI.passo(0.05);
      if (explAPI.N.salto) { const e = explAPI.N.salto.etapa; if (etapas[etapas.length-1] !== e) etapas.push(e); }
      if (!explAPI.N.salto && explAPI.N.sistemaAtual !== de) break;
    }
    return { comecou, etapas: etapas.length, chegou: explAPI.N.sistemaAtual !== de,
             gastou: Math.round(100 - explAPI.N.combustivel) };
  });

  out.danoEReparo = await p.evaluate(() => {
    explAPI.N.dano.motor = 40;
    explAPI.N.energia = 100;
    explAPI.apertar('reparo');
    return { depois: Math.round(explAPI.N.dano.motor) };
  });

  out.camera = await p.evaluate(() => {
    const a = explAPI.N.camera; explAPI.apertar('camera');
    return { de: a, para: explAPI.N.camera };
  });

  /* ---- o aviso de paisagem ---- */
  out.retrato = await p.evaluate(() => {
    const av = document.getElementById('c3-girar');
    return { emPaisagem: av.classList.contains('on') };
  });
  await p.setViewportSize({ width: 390, height: 844 });
  await p.waitForTimeout(700);
  out.emPe = await p.evaluate(() => document.getElementById('c3-girar').classList.contains('on'));
  await p.setViewportSize({ width: 844, height: 390 });
  await p.waitForTimeout(700);
  out.deitadoDeNovo = await p.evaluate(() => document.getElementById('c3-girar').classList.contains('on'));
  await p.screenshot({ path: 'exploracao.png' });

  /* ---- sair e conferir que o JOGO continua inteiro ---- */
  await p.evaluate(() => explSair());
  await p.waitForTimeout(900);
  out.saiu = await p.evaluate(() => ({
    modo: S.mode, ligada: explLigada, quadro: explQuadro,
    menu: getComputedStyle(document.getElementById('screen-menu')).display !== 'none'
  }));

  out.jogoInteiro = {};
  for (const [nome, porta, texto] of [
    ['hangar','nave','Hangar'], ['habilidades','nave','Habilidades'],
    ['mapa','progresso','Mapa'], ['amigos','online','Amigos'], ['loja','loja',null]
  ]) {
    await p.evaluate(x => { goMenu(); portaAbrir(x); }, porta);
    await p.waitForTimeout(350);
    if (texto) {
      await p.evaluate(t => {
        const l = [...document.querySelectorAll('.porta-linha')].filter(e => e.textContent.indexOf(t) >= 0)[0];
        if (l) l.click();
      }, texto);
      await p.waitForTimeout(500);
    }
    out.jogoInteiro[nome] = await p.evaluate(() => S.mode);
  }
  await p.evaluate(() => goMenu());
  await p.waitForTimeout(300);
  await p.tap('#btn-play');
  await p.waitForTimeout(1200);
  out.jogo2d = await p.evaluate(() => ({ modo: S.mode, fase: S.fase }));
  await p.evaluate(() => { startGame(1); });
  await p.waitForTimeout(1500);
  out.jogando = await p.evaluate(() => ({ modo: S.mode, vivo: player.alive }));

  await b.close();
  out.errs = errs;

  const erro = m => problemas.push(m);
  if (out.antes.montada) erro('o 3D nasceu antes de alguem entrar');
  if (!out.linha || !/Explora/i.test(out.linha)) erro('a linha do modo nao diz Exploracao: ' + out.linha);
  if (out.dentro.modo !== 'cabine') erro('o botao nao levou ao modo');
  if (out.dentro.controles < 40) erro('so ' + out.dentro.controles + ' controles (o pedido era 40+)');
  if (out.foraDeOrdem.ligou) erro('ligou os motores fora de ordem');
  if (out.foraDeOrdem.tipo !== 'erro') erro('ligar fora de ordem nao explicou o problema');
  if (out.ligando.ligados !== 10) erro('a sequencia de ligar tem ' + out.ligando.ligados + ' de 10');
  if (!out.ligando.podeVoar) erro('depois de ligar tudo a nave nao pode voar');
  if (out.voando.andou < 20) erro('a nave nao andou');
  if (!out.voando.virou) erro('o manche nao virou a nave');
  if (out.combustivel.normalGastou <= 0) erro('o combustivel normal nao gastou');
  if (out.combustivel.infinitoGastou !== 0) erro('o combustivel INFINITO gastou ' + out.combustivel.infinitoGastou);
  if (!out.radar.ligado || out.radar.pontos < 2) erro('o radar nao mostrou objetos');
  if (!out.escaneou) erro('o scanner nao marcou o planeta como escaneado');
  if (!out.mapa.aberto || out.mapa.sistemas < 4) erro('o mapa estelar nao abriu com os sistemas');
  if (!out.salto.comecou || !out.salto.chegou) erro('a hiperpropulsao nao levou a outro sistema');
  if (out.salto.etapas < 5) erro('o salto passou por so ' + out.salto.etapas + ' etapas');
  if (out.salto.gastou <= 0) erro('o salto nao gastou combustivel');
  if (out.danoEReparo.depois <= 40) erro('o reparo nao consertou nada');
  if (out.camera.de === out.camera.para) erro('a camera nao mudou');
  if (out.retrato.emPaisagem) erro('o aviso de girar aparece em paisagem');
  if (!out.emPe) erro('o aviso de girar NAO aparece em retrato');
  if (out.deitadoDeNovo) erro('o aviso de girar nao sumiu ao voltar para paisagem');
  if (out.saiu.ligada || out.saiu.quadro !== 0) erro('sobrou laco rodando depois de sair');
  if (!out.saiu.menu) erro('nao voltou para o menu');
  for (const k of ['hangar','habilidades','mapa','amigos','loja'])
    if (!out.jogoInteiro[k] || out.jogoInteiro[k] === 'menu') erro('QUEBROU o caminho para ' + k);
  if (out.jogo2d.modo !== 'levels') erro('QUEBROU a tela de fases');
  if (out.jogando.modo !== 'playing') erro('QUEBROU o jogo 2D');
  if (errs.length) erro('erros de pagina: ' + errs.join(' | '));

  console.log(JSON.stringify(out, null, 1));
  if (problemas.length) { console.log('FALHOU: ' + problemas.join('; ')); process.exit(1); }
  console.log('OK: exploracao inteira funcionando e o resto do jogo intacto');
})().catch(e => { console.log('FATAL ' + e.message.split('\n')[0]); process.exit(1); });
