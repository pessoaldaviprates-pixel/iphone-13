const { chromium } = require('playwright');
const path = 'file://' + process.cwd() + '/nuvem_test.html';
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errors = [];
  const out = {};

  // ---- aparelho do AMIGO ----
  const ctxA = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const amigo = await ctxA.newPage();
  amigo.on('pageerror', e => errors.push('AMIGO: ' + e.message));
  await amigo.goto(path);
  await amigo.waitForTimeout(1000);
  await amigo.fill('#new-name', 'Joao');
  await amigo.tap('#btn-new');
  await amigo.waitForTimeout(1200);
  out.amigoCriou = await amigo.evaluate(() => save.__name);
  // joga uma fase para subir de nível
  await amigo.evaluate(() => { startGame(1); S.score = 900; S.runGems = 40; S.toSpawn = 0; enemies = []; S.waveIdx = S.nWaves; S.waveState = 'fighting'; });
  await amigo.waitForTimeout(2600);
  out.amigoVenceu = await amigo.evaluate(() => ({ fase: save.best, cristais: save.crystals }));
  await amigo.waitForTimeout(800);

  // ---- meu aparelho (outro contexto = outro localStorage) ----
  const ctxB = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const eu = await ctxB.newPage();
  eu.on('pageerror', e => errors.push('EU: ' + e.message));
  await eu.goto(path);
  await eu.waitForTimeout(1000);
  await eu.fill('#new-name', 'Davi');
  await eu.tap('#btn-new');
  await eu.waitForTimeout(1200);

  // o amigo aparece no ranking?
  await eu.tap('#btn-rank');
  await eu.waitForTimeout(1500);
  out.ranking = await eu.evaluate(() => Array.from(document.querySelectorAll('.rank-nome')).map(e => e.textContent.trim()));
  await eu.screenshot({ path: 'nuvem-rank.png' });

  // o amigo aparece no painel ADM?
  await eu.evaluate(() => { goMenu(); });
  await eu.tap('#btn-logout'); await eu.waitForTimeout(300);
  await eu.tap('#btn-goto-adm'); await eu.waitForTimeout(300);
  await eu.fill('#adm-nick','Cr1cket'); await eu.fill('#adm-pass', 'neonadmin');
  await eu.tap('#btn-adm-enter');
  await eu.waitForTimeout(1500);
  out.admOnline = await eu.evaluate(() => ({
    visivel: document.getElementById('adm-nuvem').style.display,
    jogadores: Array.from(document.querySelectorAll('#adm-nuvem-lista .profile-name')).map(e => e.textContent.trim())
  }));
  // busca pelo nome do amigo
  await eu.fill('#adm-nuvem-busca', 'joa'); await eu.waitForTimeout(300);
  out.buscaOnline = await eu.evaluate(() => Array.from(document.querySelectorAll('#adm-nuvem-lista .profile-name')).map(e => e.textContent.trim()));

  // envia presente para o amigo
  await eu.evaluate(() => {
    const alvo = admNuvemLista.find(p => p.nome === 'Joao');
    admNuvemAlvo = alvo;
    document.getElementById('adm-nuvem-sel').style.display = 'block';
  });
  await eu.fill('#adm-nuvem-gem', '55000');
  await eu.tap('#adm-nuvem-dar'); await eu.waitForTimeout(800);
  await eu.tap('#adm-nuvem-lend'); await eu.waitForTimeout(800);
  out.envio = await eu.evaluate(() => document.getElementById('adm-msg').textContent);
  await eu.screenshot({ path: 'nuvem-adm.png', fullPage: true });

  // ---- o amigo recebe ao voltar ao jogo ----
  const antes = await amigo.evaluate(() => ({ cristais: save.crystals, amuletos: save.amulets.length }));
  await amigo.reload();
  await amigo.waitForTimeout(1200);
  await amigo.evaluate(() => { document.querySelectorAll('#profile-list .profile-btn')[0].click(); });
  await amigo.waitForTimeout(2000);
  const depois = await amigo.evaluate(() => ({
    cristais: save.crystals, amuletos: save.amulets.length,
    aviso: document.getElementById('presente-aviso').textContent,
    avisoVisivel: getComputedStyle(document.getElementById('presente-aviso')).display
  }));
  out.presente = { antes, depois };
  await amigo.screenshot({ path: 'nuvem-presente.png' });

  // o presente não é entregue duas vezes
  await amigo.reload(); await amigo.waitForTimeout(1000);
  await amigo.evaluate(() => { document.querySelectorAll('#profile-list .profile-btn')[0].click(); });
  await amigo.waitForTimeout(1800);
  out.naoRepete = await amigo.evaluate(() => save.crystals);

  console.log(JSON.stringify({ out, errors }, null, 2));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
