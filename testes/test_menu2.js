const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = []; const out = {};
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_')) errs.push('CONSOLE: ' + m.text()); });
  await p.goto(JOGO + '?nuvem=http://127.0.0.1:8099');
  await p.waitForTimeout(1500);
  await p.evaluate(() => { const el = document.getElementById('abertura'); if (el) { el.className = ''; el.innerHTML = ''; } });
  await p.evaluate(() => {
    ROOT.profiles['Davi'] = defaultSave(); ROOT.current = 'Davi';
    save = ROOT.profiles['Davi']; save.__name = 'Davi'; save.best = 40; save.crystals = 5000;
    save.pts = 7; save.tutorialFeito = true; calcStats(); persist(); goMenu();
  });
  await p.waitForTimeout(1000);
  /* o idioma segue o navegador; o teste procura os nomes em português */
  await p.evaluate(() => idiomaUsar('pt'));
  await p.waitForTimeout(400);

  /* ---- quantos botões o jogador VÊ agora ---- */
  out.menu = await p.evaluate(() => {
    const visivel = el => {
      const r = el.getBoundingClientRect();
      return r.width > 4 && r.height > 4 && getComputedStyle(el).display !== 'none';
    };
    const tela = document.getElementById('screen-menu');
    const botoes = [...tela.querySelectorAll('button')].filter(visivel);
    return {
      botoesVisiveis: botoes.length,
      nomes: botoes.map(b => (b.textContent || '').trim().slice(0, 22)),
      portas: tela.querySelectorAll('.porta').length,
      alturaTotal: Math.round(tela.scrollHeight)
    };
  });
  await p.screenshot({ path: 'menu2-menu.png' });

  /* ---- cada porta abre e lista o que tem dentro ---- */
  out.portas = {};
  for (const id of ['nave', 'online', 'progresso']) {
    await p.evaluate(x => { goMenu(); portaAbrir(x); }, id);
    await p.waitForTimeout(500);
    out.portas[id] = await p.evaluate(() => ({
      tela: S.mode,
      titulo: (document.getElementById('porta-titulo') || {}).textContent,
      linhas: document.querySelectorAll('.porta-linha').length,
      nomes: [...document.querySelectorAll('.porta-linha strong')].map(e => e.textContent)
    }));
    await p.screenshot({ path: 'menu2-' + id + '.png' });
  }

  /* ---- a loja abre direto, sem porta ---- */
  await p.evaluate(() => { goMenu(); portaAbrir('loja'); });
  await p.waitForTimeout(700);
  out.loja = await p.evaluate(() => S.mode);

  /* ---- tocar numa linha leva para a tela certa ---- */
  const vaiPara = async (porta, texto) => {
    await p.evaluate(x => { goMenu(); portaAbrir(x); }, porta);
    await p.waitForTimeout(400);
    await p.evaluate(t => {
      const l = [...document.querySelectorAll('.porta-linha')]
        .filter(e => e.textContent.indexOf(t) >= 0)[0];
      if (l) l.click();
    }, texto);
    await p.waitForTimeout(700);
    return p.evaluate(() => S.mode);
  };
  out.navegacao = {
    hangar: await vaiPara('nave', 'Hangar'),
    habilidades: await vaiPara('nave', 'Habilidades'),
    reliquias: await vaiPara('nave', 'Relíquias'),
    comparar: await vaiPara('nave', 'Comparar'),
    amigos: await vaiPara('online', 'Amigos'),
    ranqueada: await vaiPara('online', 'Ranqueada'),
    arena: await vaiPara('online', 'Arena'),
    mapa: await vaiPara('progresso', 'Mapa'),
    missoes: await vaiPara('progresso', 'Missões'),
    conquistas: await vaiPara('progresso', 'Conquistas'),
    perfil: await vaiPara('progresso', 'perfil')
  };

  /* ---- o selo de quantos itens pedem atenção ---- */
  out.selos = await p.evaluate(() => {
    goMenu();
    save.pts = 5;
    portaRender();
    const pips = [...document.querySelectorAll('.porta-pip')].map(e => e.textContent);
    return { quantos: pips.length, valores: pips };
  });

  /* ---- o "hoje" junta missões e o que falta pouco ---- */
  out.hoje = await p.evaluate(() => {
    hojeRender();
    const cx = document.getElementById('menu-hoje');
    return { visivel: cx.style.display, linhas: cx.querySelectorAll('.hoje-linha').length,
             texto: cx.textContent.slice(0, 50) };
  });

  /* ---- JOGAR continua funcionando ---- */
  await p.evaluate(() => { goMenu(); });
  await p.waitForTimeout(400);
  await p.tap('#btn-play');
  await p.waitForTimeout(1500);
  out.jogar = await p.evaluate(() => ({ modo: S.mode, fase: S.fase }));

  out.errs = errs;
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.log('FATAL ' + e.message.split('\n')[0]); process.exit(1); });
