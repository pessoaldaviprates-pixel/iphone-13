const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_')) errors.push('CONSOLE: ' + m.text()); });
  const out = {};
  // o painel agora tem abas: para o teste, mostra todos os cartões
  const tudoVisivel = () => page.evaluate(() => {
    document.querySelectorAll('#adm-panel .adm-card, #adm-panel .adm-pane, #adm-panel .sub-pane')
      .forEach(e => e.style.display = 'block');
  });
  await page.goto(JOGO + '');
  await page.waitForTimeout(1000);

  // cria dois pilotos (sem passar pela senha de desenho)
  await page.evaluate(() => {
    ROOT.profiles['Davi'] = defaultSave(); ROOT.profiles['Amigo'] = defaultSave();
    ROOT.current = null; persist(); showScreen('login'); renderLogin();
  });
  await page.waitForTimeout(400);

  // senha errada é bloqueada
  await page.tap('#btn-goto-adm'); await page.waitForTimeout(300);
  await tudoVisivel();
  await page.fill('#adm-pass', 'qualquercoisa'); await page.tap('#btn-adm-enter'); await page.waitForTimeout(200);
  out.senhaErrada = await page.evaluate(() => ({
    painelOculto: document.getElementById('adm-panel').style.display === 'none',
    aviso: document.getElementById('adm-pass-note').textContent
  }));
  // senha certa entra
  await tudoVisivel();
  await page.fill('#adm-nick','Cr1cket'); await page.fill('#adm-pass', 'neonadmin'); await page.tap('#btn-adm-enter'); await page.waitForTimeout(400);
  out.entrou = await page.evaluate(() => document.getElementById('adm-panel').style.display === 'block');
  out.qtdPilotos = await page.evaluate(() => document.querySelectorAll('#adm-players .profile-btn').length);

  // busca filtra
  await tudoVisivel();
  await page.fill('#adm-search', 'dav'); await page.waitForTimeout(250);
  out.busca = await page.evaluate(() => Array.from(document.querySelectorAll('#adm-players .profile-name')).map(e => e.textContent));
  await tudoVisivel();
  await page.fill('#adm-search', ''); await page.waitForTimeout(250);

  // seleciona Davi
  await page.evaluate(() => admSelect('Davi')); await page.waitForTimeout(300);
  await page.screenshot({ path: 'adm-1.png', fullPage: true });

  // cristais: valor livre + botão rápido + definir
  await tudoVisivel();
  await page.fill('#adm-gem-val', '75000'); await page.tap('#adm-gem-add'); await page.waitForTimeout(200);
  await page.evaluate(() => document.querySelector('[data-gem="1000000"]').click()); await page.waitForTimeout(200);
  out.cristais = await page.evaluate(() => ROOT.profiles['Davi'].crystals);
  await tudoVisivel();
  await page.fill('#adm-gem-val', '500'); await page.tap('#adm-gem-set'); await page.waitForTimeout(200);
  out.cristaisDefinido = await page.evaluate(() => ROOT.profiles['Davi'].crystals);

  // progresso
  await tudoVisivel();
  await page.fill('#adm-fase-val', '77'); await page.tap('#adm-fase-set'); await page.waitForTimeout(200);
  await tudoVisivel();
  await page.fill('#adm-pts-val', '90'); await page.tap('#adm-pts-set'); await page.waitForTimeout(200);
  out.progresso = await page.evaluate(() => ({ best: ROOT.profiles['Davi'].best, pts: ROOT.profiles['Davi'].pts }));

  // nave específica + tudo no máximo
  await tudoVisivel();
  await page.selectOption('#adm-ship-sel', '30'); await page.tap('#adm-ship-give'); await page.waitForTimeout(200);
  await tudoVisivel();
  await page.tap('#adm-parts-max'); await page.waitForTimeout(200);
  await tudoVisivel();
  await page.tap('#adm-shop-max'); await page.waitForTimeout(200);
  out.naves = await page.evaluate(() => ({
    tem30: ROOT.profiles['Davi'].ships.includes(30),
    usando: ROOT.profiles['Davi'].ship,
    pecas: ROOT.profiles['Davi'].parts[30],
    upg: ROOT.profiles['Davi'].upgrades.dmg
  }));

  // amuleto específico
  await tudoVisivel();
  await page.selectOption('#adm-amu-tipo', 'dano');
  await tudoVisivel();
  await page.selectOption('#adm-amu-rar', '3');
  await tudoVisivel();
  await page.tap('#adm-amu-give'); await page.waitForTimeout(200);
  await tudoVisivel();
  await page.tap('#adm-amu-lend'); await page.waitForTimeout(200);
  out.amuletos = await page.evaluate(() => ROOT.profiles['Davi'].amulets.map(a => a.type + ':' + a.rar));

  // modo invencível
  await tudoVisivel();
  await page.tap('#adm-god'); await page.waitForTimeout(200);
  out.god = await page.evaluate(() => ROOT.profiles['Davi'].godMode);

  // desbloquear tudo
  await tudoVisivel();
  await page.tap('#adm-tudo'); await page.waitForTimeout(400);
  out.tudo = await page.evaluate(() => {
    const p = ROOT.profiles['Davi'];
    return { naves: p.ships.length, skills: Object.keys(p.skills).length, fase: p.best,
             cristais: p.crystals, amuletos: p.amulets.length, equipados: p.equipped.length };
  });
  await page.screenshot({ path: 'adm-2.png', fullPage: true });

  // exportar / importar
  await tudoVisivel();
  await page.tap('#adm-export'); await page.waitForTimeout(200);
  const json = await page.evaluate(() => document.getElementById('adm-json').value);
  out.export = { tamanho: json.length, temNome: json.includes('"Davi"') };
  await tudoVisivel();
  await page.tap('#adm-import'); await page.waitForTimeout(300);
  out.import = await page.evaluate(() => Object.keys(ROOT.profiles));

  // renomear e duplicar
  await page.evaluate(() => admSelect('Amigo')); await page.waitForTimeout(200);
  await tudoVisivel();
  await page.fill('#adm-rename', 'Amigo2'); await page.tap('#adm-rename-go'); await page.waitForTimeout(300);
  out.renomeado = await page.evaluate(() => Object.keys(ROOT.profiles));

  // cristais para todos
  await tudoVisivel();
  await page.tap('#adm-gem-todos'); await page.waitForTimeout(300);
  out.todos = await page.evaluate(() => Object.keys(ROOT.profiles).map(n => ROOT.profiles[n].crystals));

  // criar piloto pelo painel
  await tudoVisivel();
  await page.fill('#adm-novo', 'Teste'); await page.tap('#adm-novo-go'); await page.waitForTimeout(300);
  out.criado = await page.evaluate(() => !!ROOT.profiles['Teste']);

  // god mode em jogo
  await page.evaluate(() => { loginAs('Davi'); startGame(10); });
  await page.waitForTimeout(800);
  out.emJogo = await page.evaluate(() => {
    const antes = player.lives;
    player.invuln = 0; player.shield = 0;
    hitPlayer();
    return { antes, depois: player.lives, badge: getComputedStyle(document.getElementById('god-badge')).display };
  });

  // apagar piloto (dois toques)
  await page.evaluate(() => { S.mode = 'adm'; showScreen('adm'); admSelect('Teste'); });
  await page.waitForTimeout(200);
  await tudoVisivel();
  await page.tap('#adm-del'); await page.waitForTimeout(200);
  const meio = await page.evaluate(() => !!ROOT.profiles['Teste']);
  await tudoVisivel();
  await page.tap('#adm-del'); await page.waitForTimeout(300);
  out.apagar = { aposUmToque: meio, aposDois: await page.evaluate(() => !!ROOT.profiles['Teste']) };

  // persistência
  await page.reload(); await page.waitForTimeout(1200);
  out.persistiu = await page.evaluate(() => ({
    pilotos: Object.keys(ROOT.profiles),
    daviCristais: ROOT.profiles['Davi'].crystals,
    god: ROOT.profiles['Davi'].godMode
  }));

  console.log(JSON.stringify({ out, errors }, null, 2));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
