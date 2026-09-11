const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
const fs = require('fs');
  'window.NN_CONFIG = { NUVEM_URL: "http://127.0.0.1:8099" };');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = []; const out = {};
  // JOGADOR (aparelho 1)
  const c1 = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const jog = await c1.newPage();
  jog.on('pageerror', e => errs.push('JOG: ' + e.message));
  await jog.goto(JOGO + '?nuvem=http://127.0.0.1:8099'); await jog.waitForTimeout(800);
  await jog.fill('#new-name', 'Vitima'); await jog.tap('#btn-new'); await jog.waitForTimeout(300);
  for (let i = 0; i < 2; i++) {
    await jog.evaluate(() => { senhaEstado.seq=[0,1,2,5]; senhaEstado.desenhando=true; senhaSoltar(); });
    await jog.waitForTimeout(250);
  }
  await jog.evaluate(() => { save.crystals = 1000; save.best = 30; persist(); nuvemEnviar(true); });
  await jog.waitForTimeout(1200);

  // ADMIN (aparelho 2) — o jogador NÃO vai abrir o jogo
  const c2 = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const adm = await c2.newPage();
  adm.on('pageerror', e => errs.push('ADM: ' + e.message));
  await adm.goto(JOGO + '?nuvem=http://127.0.0.1:8099'); await adm.waitForTimeout(800);
  await adm.tap('#btn-goto-adm'); await adm.waitForTimeout(300);
  await adm.fill('#adm-nick','Cr1cket'); await adm.fill('#adm-pass', 'neonadmin'); await adm.tap('#btn-adm-enter'); await adm.waitForTimeout(1500);
  out.viuJogador = await adm.evaluate(() => admNuvemLista.map(x => x.nome + ':' + x.cristais + ':f' + x.fase));

  const ler = async () => adm.evaluate(async () => {
    const n = await nuvemReq('pilotos');
    const id = Object.keys(n).find(k => n[k].nome === 'Vitima');
    return { cristais: n[id].cristais, fase: n[id].fase, rank: n[id].rank, naves: n[id].naves };
  });
  await adm.evaluate(() => admNuvemSelecionar(admNuvemLista.find(x => x.nome === 'Vitima')));
  await adm.waitForTimeout(400);

  await adm.evaluate(()=>{try{admIrPara('acoes','dar')}catch(e){}}); await adm.waitForTimeout(300);
  await adm.fill('#adm-nuvem-gem', '77777'); await adm.tap('#adm-nuvem-set'); await adm.waitForTimeout(300);
  await adm.evaluate(()=>{try{admIrPara('acoes','caixa')}catch(e){}}); await adm.waitForTimeout(300);
  await adm.tap('#caixa-enviar'); await adm.waitForTimeout(900);
  out.aposDar = await ler();
  await adm.evaluate(()=>{try{admIrPara('acoes','dar')}catch(e){}}); await adm.waitForTimeout(300);
  await adm.selectOption('#adm-nuvem-rank-sel', '6000');
  await adm.tap('#adm-nuvem-rank'); await adm.waitForTimeout(300);
  await adm.evaluate(()=>{try{admIrPara('acoes','caixa')}catch(e){}}); await adm.waitForTimeout(300);
  await adm.tap('#caixa-enviar'); await adm.waitForTimeout(900);
  out.aposRank = await ler();
  await adm.evaluate(()=>{try{admIrPara('acoes','tirar')}catch(e){}}); await adm.waitForTimeout(300);
  await adm.tap('#adm-nuvem-zerar'); await adm.waitForTimeout(300);
  await adm.tap('#adm-nuvem-zerar'); await adm.waitForTimeout(300);
  await adm.evaluate(()=>{try{admIrPara('acoes','caixa')}catch(e){}}); await adm.waitForTimeout(300);
  await adm.tap('#caixa-enviar'); await adm.waitForTimeout(900);
  out.aposZerar = await ler();
  out.listaFinal = await adm.evaluate(() => admNuvemLista.map(x => x.nome + ':' + x.cristais + ':f' + x.fase + ':r' + x.rank));

  console.log(JSON.stringify({ out, errs }, null, 1));
  await b.close();
  process.exit(errs.length ? 1 : 0);
})().catch(e => {
  console.error('FATAL', e.message.split('\n')[0]); process.exit(2);
});
