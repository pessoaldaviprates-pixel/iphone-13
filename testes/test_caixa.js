const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
const fs = require('fs');
  'window.NN_CONFIG = { NUVEM_URL: "http://127.0.0.1:8099" };');
const fim = (code) => { process.exit(code); };

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
    args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
  const errs = []; const out = {};
  const ctx = () => b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  /* ---- 1. jogador cria conta e sai do jogo ---- */
  const c1 = await ctx();
  const jog = await c1.newPage();
  jog.on('pageerror', e => errs.push('JOG: ' + e.message));
  await jog.goto(JOGO + '?nuvem=http://127.0.0.1:8099'); await jog.waitForTimeout(900);
  await jog.fill('#new-name', 'Davi'); await jog.tap('#btn-new'); await jog.waitForTimeout(400);
  for (let i = 0; i < 2; i++) {
    await jog.evaluate(() => { senhaEstado.seq = [0,1,2,5]; senhaEstado.desenhando = true; senhaSoltar(); });
    await jog.waitForTimeout(300);
  }
  out.entrouNoMenu = await jog.evaluate(() => S.mode);
  await jog.evaluate(() => { save.crystals = 500; save.best = 12; persist(); nuvemEnviar(true); });
  await jog.waitForTimeout(1000);
  await c1.close();

  /* ---- 2. admin monta a caixa com VÁRIOS itens ---- */
  const c2 = await ctx();
  const adm = await c2.newPage();
  adm.on('pageerror', e => errs.push('ADM: ' + e.message));
  await adm.goto(JOGO + '?nuvem=http://127.0.0.1:8099'); await adm.waitForTimeout(900);
  await adm.tap('#btn-goto-adm'); await adm.waitForTimeout(300);
  await adm.fill('#adm-nick','Cr1cket'); await adm.fill('#adm-pass', 'neonadmin'); await adm.tap('#btn-adm-enter'); await adm.waitForTimeout(1600);
  await adm.evaluate(() => admNuvemSelecionar(admNuvemLista.find(x => x.nome === 'Davi')));
  await adm.waitForTimeout(400);

  await adm.evaluate(()=>{try{admIrPara('acoes','dar')}catch(e){}}); await adm.waitForTimeout(300);
  await adm.fill('#adm-nuvem-gem', '2500'); await adm.tap('#adm-nuvem-set'); await adm.waitForTimeout(200);
  await adm.tap('#adm-nuvem-naves');    await adm.waitForTimeout(200);
  await adm.tap('#adm-nuvem-lend');     await adm.waitForTimeout(200);
  await adm.tap('#adm-nuvem-maverick'); await adm.waitForTimeout(200);
  await adm.tap('#adm-nuvem-b2');       await adm.waitForTimeout(200);
  await adm.selectOption('#adm-nuvem-rank-sel', '6000');
  await adm.tap('#adm-nuvem-rank');     await adm.waitForTimeout(200);
  await adm.fill('#adm-nuvem-gem', '1000'); await adm.tap('#adm-nuvem-dar');      await adm.waitForTimeout(300);

  out.caixaMontada = await adm.evaluate(() => JSON.parse(JSON.stringify(caixaAdm)));
  out.itensNaTela  = await adm.evaluate(() => $("caixa-itens").children.length);
  out.botaoEnviar  = await adm.evaluate(() => $("caixa-enviar").textContent);

  /* nada deve ter sido enviado ainda */
  out.antesDeEnviar = await adm.evaluate(async () => {
    const g = await nuvemReq('presentes'); return g ? Object.keys(g) : [];
  });

  await adm.evaluate(()=>{try{admIrPara('acoes','caixa')}catch(e){}}); await adm.waitForTimeout(300);
  await adm.tap('#caixa-enviar'); await adm.waitForTimeout(1200);
  out.pacoteNaNuvem = await adm.evaluate(async () => {
    const g = await nuvemReq('presentes'); return g ? g[Object.keys(g)[0]] : null;
  });
  out.caixaLimpa = await adm.evaluate(() => Object.keys(caixaAdm).length);
  await c2.close();

  /* ---- 3. jogador volta: login → menu, caixa NÃO pode aparecer no login ---- */
  const c3 = await ctx();
  const jog2 = await c3.newPage();
  jog2.on('pageerror', e => errs.push('JOG2: ' + e.message));
  await jog2.goto(JOGO + '?nuvem=http://127.0.0.1:8099'); await jog2.waitForTimeout(900);

  // outro aparelho: entra pelo login por nome + senha desenho
  out.telaLogin = await jog2.evaluate(() => S.mode);
  {
    await jog2.fill('#login-nome', 'Davi');
    await jog2.tap('#btn-entrar'); await jog2.waitForTimeout(1800);
    // tela de senha aparece — espera 2.5s e confere que a caixa NÃO está visível
    out.modoAntesDaSenha = await jog2.evaluate(() => S.mode);
    await jog2.waitForTimeout(2000);
    out.caixaVisivelNoLogin = await jog2.evaluate(() =>
      $("caixa-presente").classList.contains("on"));
    out.avisoVisivelNoLogin = await jog2.evaluate(() => {
      const e = $("presente-aviso"); return !!e && e.style.display === "block";
    });
    await jog2.evaluate(() => { senhaEstado.seq = [0,1,2,5]; senhaEstado.desenhando = true; senhaSoltar(); });
    await jog2.waitForTimeout(2000);
  }
  out.modoDepois = await jog2.evaluate(() => S.mode);
  await jog2.waitForTimeout(1500);

  /* ---- 4. no menu: presente JÁ aplicado + caixa aberta ---- */
  out.saveAplicado = await jog2.evaluate(() => ({
    cristais: save.crystals, rank: save.rank,
    naves: save.ships.length, maverick: save.ships.includes(MAVERICK), b2: save.ships.includes(B2),
    amuletos: (save.amulets || []).length
  }));
  out.caixaAberta = await jog2.evaluate(() => $("caixa-presente").classList.contains("on"));
  await jog2.screenshot({ path: '/tmp/claude-0/-home-user-iphone-13/b7a1aae1-35a1-5214-9848-2da99e219fb6/scratchpad/caixa-1.png' });

  if (out.caixaAberta) {
    await jog2.tap('#cp-caixa'); await jog2.waitForTimeout(1600);
    out.itensMostrados = await jog2.evaluate(() =>
      [...$("cp-itens").children].map(e => e.textContent));
    await jog2.screenshot({ path: '/tmp/claude-0/-home-user-iphone-13/b7a1aae1-35a1-5214-9848-2da99e219fb6/scratchpad/caixa-2.png' });
    await jog2.tap('#cp-ok'); await jog2.waitForTimeout(600);
    out.caixaFechou = !(await jog2.evaluate(() => $("caixa-presente").classList.contains("on")));
  }
  out.presenteConsumido = await jog2.evaluate(async () => {
    const g = await nuvemReq('presentes'); return g ? Object.keys(g).length : 0;
  });

  console.log(JSON.stringify({ out, errs }, null, 1));
  await b.close();
  fim(errs.length ? 1 : 0);
})().catch(e => { console.error('FATAL', e.message.split('\n').slice(0,3).join(' | ')); fim(2); });
