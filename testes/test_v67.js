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
    save = ROOT.profiles['Davi']; save.__name = 'Davi'; save.best = 30; save.tutorialFeito = true;
    calcStats(); persist(); nuvemEnviar(true); goMenu();
  });
  await p.waitForTimeout(1200);

  /* ---- código de recuperação ---- */
  out.resgate = await p.evaluate(() => {
    save.resgate = null;
    const c1 = meuCodigoDeResgate();
    const c2 = meuCodigoDeResgate();
    return { formato: /^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(c1), estavel: c1 === c2, codigo: c1 };
  });
  out.resgatar = await p.evaluate(async () => {
    ROOT.profiles['Perdido'] = defaultSave();
    ROOT.profiles['Perdido'].resgate = 'ABCD-2345';
    ROOT.profiles['Perdido'].senha = 'desenho-antigo';
    const errado = await resgatarConta('Perdido', 'ZZZZ-9999');
    const certo = await resgatarConta('Perdido', 'abcd-2345');   // minúsculo também vale
    return { recusaErrado: !errado.ok, aceitaCerto: certo.ok,
             apagouSenha: ROOT.profiles['Perdido'].senha === null, msg: certo.msg.slice(0, 30) };
  });
  await p.evaluate(() => ajAbrir());
  await p.waitForTimeout(600);
  out.resgateNaTela = await p.evaluate(() =>
    document.getElementById('aj-resgate').textContent.indexOf('RECUPERAÇÃO') >= 0);

  /* ---- erro sobe para a nuvem ---- */
  out.erro = await p.evaluate(async () => {
    await mandarErroParaONuvem('Erro de teste: x is not defined', 'teste.js:42');
    await new Promise(r => setTimeout(r, 600));
    const e = await nuvemReq('erros');
    const chaves = e ? Object.keys(e) : [];
    return { subiu: chaves.length, msg: chaves.length ? e[chaves[0]].msg.slice(0, 20) : null,
             temVersao: chaves.length ? !!e[chaves[0]].versao : false };
  });
  out.errosNoPainel = await p.evaluate(async () => {
    await admErrosCarregar();
    return { linhas: document.querySelectorAll('#adm-erros-lista .err-linha').length };
  });

  /* ---- números do jogo ---- */
  out.numeros = await p.evaluate(async () => {
    const n = await admNumeros();
    admNumerosRender(n);
    return { total: n.total >= 1, temFaixas: Object.keys(n.faixas).length,
             temVersoes: Object.keys(n.versoes).length >= 1,
             caixas: document.querySelectorAll('#adm-numeros-corpo .perf-cx').length,
             barras: document.querySelectorAll('#adm-numeros-corpo .num-barra').length };
  });

  /* ---- denúncias no painel ---- */
  out.denuncias = await p.evaluate(async () => {
    await denunciar('pXYZ', 'Suspeito', 'trapaça no duelo');
    await anotarSuspeita('pABC', 'Outro', ['pontos rápidos demais'], { pontos: 999999, segundos: 3 });
    await new Promise(r => setTimeout(r, 500));
    await admDenunciasRender();
    return { linhas: document.querySelectorAll('#adm-denuncias-lista .err-linha').length,
             temDenuncia: document.querySelectorAll('.err-linha.denuncia').length,
             temSuspeita: document.querySelectorAll('.err-linha.suspeita').length };
  });

  /* ---- manutenção ---- */
  out.manutencao = await p.evaluate(async () => {
    const ok = await manutencaoLigar(true, 'Voltamos já');
    manutencaoAplicar({ ligado: true, recado: 'Voltamos já' });
    const paraJogador = document.getElementById('manut-tela').className;
    // o dono não é travado
    save.__name = 'Cr1cket';
    manutencaoAplicar({ ligado: true, recado: 'Voltamos já' });
    const paraDono = document.getElementById('manut-tela').className;
    save.__name = 'Davi';
    manutencaoAplicar({ ligado: false });
    const desligado = document.getElementById('manut-tela').className;
    return { gravou: ok, paraJogador, paraDono, desligado };
  });
  await p.evaluate(() => manutencaoAplicar({ ligado: true, recado: 'Estamos arrumando o multijogador' }));
  await p.waitForTimeout(400);
  await p.screenshot({ path: 'v67-manutencao.png' });
  await p.evaluate(() => manutencaoAplicar({ ligado: false }));

  /* ---- registro da equipe ---- */
  out.registro = await p.evaluate(async () => {
    await admRegistrar('deu 5000 cristais para o Fulano');
    await new Promise(r => setTimeout(r, 400));
    await admRegistroRender();
    return { linhas: document.querySelectorAll('#adm-registro-lista .reg-linha').length,
             texto: (document.querySelector('.reg-linha') || {}).textContent };
  });

  out.errs = errs;
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.log('FATAL ' + e.message.split('\n')[0]); process.exit(1); });
