/* =====================================================================
   A cópia que vira app das lojas não pode vender nada por dinheiro.

   A Apple (3.1.1) e o Google (Payments) exigem que compra de coisa do
   jogo passe pelo pagamento deles. A nossa é por Pix — no navegador
   tudo bem, dentro do app é recusa na revisão.

   Este teste abre a cópia de empacotar/www/ (a mesma que o Xcode e o
   Android Studio empacotam) e procura QUALQUER porta de entrada que
   ainda leve a comprar. E confere que o resto do jogo continua inteiro.
   ===================================================================== */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const WWW = path.join(__dirname, '..', 'empacotar', 'www', 'index.html');
const JOGO = 'file://' + WWW;

(async () => {
  /* Refaz a cópia antes de olhar. Sem isto o teste poderia aprovar um
     empacotamento velho enquanto o jogo já tinha mudado — e passar
     verde é pior do que não ter teste. */
  try {
    require('child_process').execFileSync(
      process.execPath, [path.join(__dirname, '..', 'empacotar', 'preparar.js')],
      { stdio: 'pipe' });
  } catch (e) {
    console.log('FATAL preparar.js falhou: ' + String(e.message).split('\n')[0]);
    process.exit(1);
  }
  if (!fs.existsSync(WWW)) {
    console.log('FALHOU: empacotar/www/index.html não foi gerado');
    process.exit(1);
  }
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = []; const out = {};
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  await p.goto(JOGO + '?nuvem=http://127.0.0.1:8099');
  await p.waitForTimeout(1500);
  await p.evaluate(() => { const el = document.getElementById('abertura'); if (el) { el.className = ''; el.innerHTML = ''; } });
  await p.evaluate(() => {
    ROOT.profiles['Davi'] = defaultSave(); ROOT.current = 'Davi';
    save = ROOT.profiles['Davi']; save.__name = 'Davi'; save.best = 40;
    save.crystals = 5000; save.pts = 3; save.tutorialFeito = true;
    calcStats(); persist(); goMenu();
  });
  await p.waitForTimeout(900);
  await p.evaluate(() => idiomaUsar('pt'));
  await p.waitForTimeout(400);

  out.marcado = await p.evaluate(() => window.NN_EMPACOTADO === true);
  out.lojaDesligada = await p.evaluate(() => lojaDeDinheiroLigada() === false);

  /* nenhum caminho visível leva à loja */
  out.menu = await p.evaluate(() => {
    const visivel = el => {
      const r = el.getBoundingClientRect();
      return r.width > 4 && r.height > 4 && getComputedStyle(el).display !== 'none';
    };
    const tela = document.getElementById('screen-menu');
    return {
      portaLoja: !!document.querySelector('[data-porta="loja"]'),
      botaoLoja: visivel(document.getElementById('btn-loja')),
      botoes: [...tela.querySelectorAll('button')].filter(visivel)
                .map(b => (b.textContent || '').trim().slice(0, 18))
    };
  });

  /* nem forçando por dentro */
  out.forcando = await p.evaluate(() => {
    try { document.getElementById('btn-loja').click(); } catch (e) {}
    try { portaAbrir('loja'); } catch (e) {}
    return { modo: S.mode,
             telaLoja: getComputedStyle(document.getElementById('screen-loja')).display };
  });

  /* nenhum preço em dinheiro aparece em tela nenhuma do menu */
  out.precoNaTela = await p.evaluate(() => {
    const t = document.getElementById('screen-menu').textContent;
    return /R\$\s*\d/.test(t);
  });

  /* o aviso de renovar VIP também não empurra compra */
  out.vipAviso = await p.evaluate(() => {
    save.vipAte = Date.now() + 2 * 24 * 60 * 60 * 1000;   // VIP acabando
    vipAvisoRender();
    return getComputedStyle(document.getElementById('vip-aviso')).display;
  });

  /* --- e o jogo continua inteiro --- */
  await p.evaluate(() => { save.vipAte = 0; goMenu(); });
  await p.waitForTimeout(300);
  out.jogoInteiro = {};
  for (const [nome, porta, texto] of [
    ['hangar', 'nave', 'Hangar'], ['habilidades', 'nave', 'Habilidades'],
    ['mapa', 'progresso', 'Mapa'], ['amigos', 'online', 'Amigos']
  ]) {
    await p.evaluate(x => { goMenu(); portaAbrir(x); }, porta);
    await p.waitForTimeout(350);
    await p.evaluate(t => {
      const l = [...document.querySelectorAll('.porta-linha')].filter(e => e.textContent.indexOf(t) >= 0)[0];
      if (l) l.click();
    }, texto);
    await p.waitForTimeout(600);
    out.jogoInteiro[nome] = await p.evaluate(() => S.mode);
  }
  await p.evaluate(() => goMenu());
  await p.waitForTimeout(300);
  await p.tap('#btn-play');
  await p.waitForTimeout(1200);
  out.jogar = await p.evaluate(() => S.mode);
  await p.screenshot({ path: 'app-menu.png' });

  out.errs = errs;
  await b.close();

  const problemas = [];
  if (!out.marcado) problemas.push('a copia nao veio marcada como app');
  if (!out.lojaDesligada) problemas.push('a loja de dinheiro continua ligada');
  if (out.menu.portaLoja) problemas.push('a porta LOJA ainda aparece no menu');
  if (out.menu.botaoLoja) problemas.push('o botao da loja ainda esta visivel');
  if (out.forcando.modo === 'loja' || out.forcando.telaLoja !== 'none')
    problemas.push('deu para abrir a loja forcando por dentro');
  if (out.precoNaTela) problemas.push('ainda aparece preco em R$ no menu');
  if (out.vipAviso !== 'none') problemas.push('o aviso de renovar VIP ainda empurra compra');
  for (const k of ['hangar', 'habilidades', 'mapa', 'amigos'])
    if (!out.jogoInteiro[k] || out.jogoInteiro[k] === 'menu')
      problemas.push('quebrou o caminho para ' + k);
  if (out.jogar !== 'levels') problemas.push('JOGAR parou de funcionar');
  if (errs.length) problemas.push('erros de pagina: ' + errs.join(' | '));

  console.log(JSON.stringify(out, null, 1));
  if (problemas.length) { console.log('FALHOU: ' + problemas.join('; ')); process.exit(1); }
  console.log('OK: app sem venda por dinheiro, jogo inteiro');
})().catch(e => { console.log('FATAL ' + e.message.split('\n')[0]); process.exit(1); });
