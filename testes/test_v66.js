const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = []; const out = {};
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_')) errs.push('CONSOLE: ' + m.text()); });
  await p.goto(JOGO + '?nuvem=http://127.0.0.1:8099');
  await p.waitForTimeout(1300);
  await p.evaluate(() => {
    ROOT.profiles['Davi'] = defaultSave(); ROOT.current = 'Davi';
    save = ROOT.profiles['Davi']; save.__name = 'Davi'; save.best = 30; save.rank = 700;
    save.tutorialFeito = true; calcStats(); persist(); goMenu();
  });
  await p.waitForTimeout(900);

  /* ---- temporadas ---- */
  out.temporada = await p.evaluate(() => {
    save.temporada = 0;
    temporadaConferir();                              // primeira vez: só marca
    const marcou = save.temporada === temporadaAtual();
    save.temporada = temporadaAtual() - 1;            // finge que virou o mês
    save.rank = 1200; save.vitorias = 9; save.derrotas = 3;
    const antes = save.crystals;
    const r = temporadaConferir();
    return { marcou, virou: !!r, premio: r && r.premio, eloDepois: save.rank,
             ganhou: save.crystals - antes, zerouVitorias: save.vitorias === 0,
             guardou: (save.historicoTemporadas || []).length,
             nome: temporadaNome(), dias: diasQueFaltamNaTemporada() };
  });
  await p.evaluate(() => abrirRanked());
  await p.waitForTimeout(700);
  out.telaTemporada = await p.evaluate(() =>
    document.getElementById('rk-temporada').textContent.indexOf('TEMPORADA') >= 0);
  await p.screenshot({ path: 'v66-ranqueada.png' });

  /* ---- janela de elo que alarga ---- */
  out.janela = await p.evaluate(() => ({
    s0: janelaDeElo(0), s20: janelaDeElo(20), s50: janelaDeElo(50), s80: janelaDeElo(80)
  }));

  /* ---- anti-trapaça ---- */
  out.antiTrapaca = await p.evaluate(() => ({
    normal: partidaSuspeita({ pontos: 4000, segundos: 90, abates: 120, elo: 25 }),
    pontos: partidaSuspeita({ pontos: 900000, segundos: 30, abates: 50, elo: 25 }),
    rapida: partidaSuspeita({ pontos: 100, segundos: 2, abates: 1, elo: 25, fase: 4 }),
    elo: partidaSuspeita({ pontos: 100, segundos: 90, abates: 10, elo: 900 }),
    valida: duelaValido({ pontos: 100, segundos: 90 }, { pontos: 999999, segundos: 5 }).ok
  }));

  /* ---- filtro de nome ---- */
  out.nomes = await p.evaluate(() => ({
    normal: nomePermitido('Maverick').ok,
    admin: nomePermitido('Admin_Oficial').ok,
    adminMsg: (nomePermitido('administrador').msg || '').slice(0, 30),
    palavrao: nomePermitido('otario123').ok,
    acento: nomePermitido('otário').ok,
    curto: nomePermitido('a').ok,
    dono: nomePermitido('Cr1cket').ok
  }));
  out.chat = await p.evaluate(() => ({
    limpo: limparTexto('oi, tudo bem?'),
    sujo: limparTexto('seu otario, que merda'),
  }));

  /* ---- denunciar e bloquear ---- */
  out.moderacao = await p.evaluate(async () => {
    const d = await denunciar('p123', 'Trapaceiro', 'trapaça');
    bloquear('p123', 'Trapaceiro');
    const bloqueado = estaBloqueado('p123');
    bloqueadosRender();
    const linhas = document.querySelectorAll('#amigos-bloqueados .ult-linha').length;
    desbloquear('p123');
    return { denunciou: d.ok, msg: d.msg.slice(0, 30), bloqueado, linhas,
             desbloqueou: !estaBloqueado('p123'), listaDenuncias: (save.denunciei || []).length };
  });

  /* ---- histórico de partidas ---- */
  out.historico = await p.evaluate(() => {
    save.historico = [];
    anotarPartida({ contra: 'Ana', resultado: 'vitoria', elo: 25, pontos: 4000 });
    anotarPartida({ contra: 'Bia', resultado: 'derrota', elo: -12, pontos: 2000 });
    historicoRender();
    return { guardadas: save.historico.length,
             linhas: document.querySelectorAll('.hist-linha').length,
             visivel: getComputedStyle(document.getElementById('rk-historico')).display,
             resumo: document.querySelector('.hist-resumo').textContent };
  });

  /* ---- a denúncia chegou na nuvem ---- */
  out.naNuvem = await p.evaluate(async () => {
    const d = await nuvemReq('denuncias/p123');
    return d ? Object.keys(d).length : 0;
  });

  out.errs = errs;
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.log('FATAL ' + e.message.split('\n')[0]); process.exit(1); });
