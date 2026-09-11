const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
const fs = require('fs');
  'window.NN_CONFIG = { NUVEM_URL: "http://127.0.0.1:8099" };');

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = []; const out = {};
  const URL = JOGO + '?nuvem=http://127.0.0.1:8099';

  // ---- amigo, com progresso ----
  const ctxA = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const amigo = await ctxA.newPage();
  amigo.on('pageerror', e => errs.push('AMIGO: ' + e.message));
  await amigo.goto(URL); await amigo.waitForTimeout(900);
  await amigo.fill('#new-name', 'Cheater'); await amigo.tap('#btn-new'); await amigo.waitForTimeout(1500);
  await amigo.evaluate(() => {
    admDesbloquearTudo(save);   // simula um jogador com tudo
    persist(); calcStats(); nuvemEnviar(true);
  });
  await amigo.waitForTimeout(1200);
  out.antes = await amigo.evaluate(() => ({
    cristais: save.crystals, fase: save.best, naves: save.ships.length,
    skills: Object.keys(save.skills).length, amuletos: save.amulets.length
  }));

  // ---- admin ----
  const ctxB = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const adm = await ctxB.newPage();
  adm.on('pageerror', e => errs.push('ADM: ' + e.message));
  await adm.goto(URL); await adm.waitForTimeout(900);
  await adm.tap('#btn-goto-adm'); await adm.waitForTimeout(300);
  await adm.fill('#adm-nick','Cr1cket'); await adm.fill('#adm-pass', 'neonadmin'); await adm.tap('#btn-adm-enter'); await adm.waitForTimeout(1500);
  await adm.evaluate(()=>{try{admIrPara('acoes','dar')}catch(e){}}); await adm.waitForTimeout(300);
  await adm.fill('#adm-nuvem-busca', 'cheat'); await adm.waitForTimeout(400);
  out.busca = await adm.evaluate(() =>
    Array.from(document.querySelectorAll('#adm-nuvem-lista .profile-name')).map(e => e.textContent.trim()));
  await adm.evaluate(() => {
    const p = admNuvemLista.find(x => x.nome === 'Cheater');
    admNuvemSelecionar(p);
  });
  await adm.waitForTimeout(900);
  out.stats = await adm.evaluate(() => document.getElementById('adm-nuvem-stats').textContent);
  await adm.screenshot({ path: 'adm-online.png', fullPage: true });

  // ZERAR JOGADOR precisa de dois toques
  await adm.tap('#adm-nuvem-zerar'); await adm.waitForTimeout(400);
  out.umToque = await adm.evaluate(async () => {
    const p = admNuvemLista.find(x => x.nome === 'Cheater');
    const g = await nuvemComandoPendente(p.id);
    return { msg: document.getElementById('adm-msg').textContent, pendente: g };
  });
  await adm.tap('#adm-nuvem-zerar'); await adm.waitForTimeout(900);
  out.doisToques = await adm.evaluate(async () => {
    const p = admNuvemLista.find(x => x.nome === 'Cheater');
    return { msg: document.getElementById('adm-msg').textContent, pendente: await nuvemComandoPendente(p.id) };
  });

  // ---- amigo abre o jogo e é zerado ----
  await amigo.reload(); await amigo.waitForTimeout(1000);
  await amigo.evaluate(() => document.querySelectorAll('#profile-list .profile-btn')[0].click());
  await amigo.waitForTimeout(2200);
  out.depoisDeZerar = await amigo.evaluate(() => ({
    cristais: save.crystals, fase: save.best, naves: save.ships.length,
    skills: Object.keys(save.skills).length, amuletos: save.amulets.length,
    aviso: document.getElementById('presente-aviso').textContent
  }));
  await amigo.screenshot({ path: 'amigo-zerado.png' });

  // ---- admin define cristais e fase exatos ----
  await adm.evaluate(() => admNuvemCarregar());
  await adm.waitForTimeout(1000);
  await adm.evaluate(() => {
    const p = admNuvemLista.find(x => x.nome === 'Cheater');
    admNuvemSelecionar(p);
  });
  await adm.waitForTimeout(600);
  await adm.fill('#adm-nuvem-gem', '4321'); await adm.tap('#adm-nuvem-set'); await adm.waitForTimeout(700);
  await adm.fill('#adm-nuvem-fase', '42'); await adm.tap('#adm-nuvem-fase-set'); await adm.waitForTimeout(700);
  await adm.tap('#adm-nuvem-god-on'); await adm.waitForTimeout(700);
  out.pendenteFinal = await adm.evaluate(() => document.getElementById('adm-nuvem-pendente').textContent);

  await amigo.reload(); await amigo.waitForTimeout(1000);
  await amigo.evaluate(() => document.querySelectorAll('#profile-list .profile-btn')[0].click());
  await amigo.waitForTimeout(2200);
  out.valoresExatos = await amigo.evaluate(() => ({
    cristais: save.crystals, fase: save.best, god: save.godMode,
    aviso: document.getElementById('presente-aviso').textContent
  }));

  // ---- apagar do ranking ----
  await adm.evaluate(() => admNuvemCarregar()); await adm.waitForTimeout(900);
  await adm.evaluate(() => {
    const p = admNuvemLista.find(x => x.nome === 'Cheater');
    admNuvemSelecionar(p);
  });
  await adm.waitForTimeout(500);
  await adm.tap('#adm-nuvem-remover'); await adm.waitForTimeout(300);
  await adm.tap('#adm-nuvem-remover'); await adm.waitForTimeout(1200);
  out.aposRemover = await adm.evaluate(() => admNuvemLista.map(p => p.nome));

  console.log(JSON.stringify({ out, errs }, null, 2));
  await b.close();
  process.exit(errs.length ? 1 : 0);
})().catch(e => {
  console.error('FATAL', e.message.split('\n')[0]); process.exit(2);
});
