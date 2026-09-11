const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
const fs = require('fs');
const URL = JOGO + '?nuvem=http://127.0.0.1:8099';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = []; const out = {};

  // ---- CELULAR 1: cria a conta ----
  const c1 = await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const p1 = await c1.newPage();
  p1.on('pageerror', e => errs.push('P1: ' + e.message));
  await p1.goto(URL); await p1.waitForTimeout(900);
  out.telaLogin = await p1.evaluate(() => ({
    temCampoNome: !!document.getElementById('login-nome'),
    temBotaoEntrar: !!document.getElementById('btn-entrar'),
    temCriar: !!document.getElementById('btn-new'),
    aviso: document.getElementById('login-aviso').textContent
  }));
  await p1.screenshot({ path: 'login-novo.png', fullPage: true });

  await p1.fill('#new-name', 'Davi'); await p1.tap('#btn-new'); await p1.waitForTimeout(350);
  for (let i=0;i<2;i++){ await p1.evaluate(()=>{senhaEstado.seq=[0,4,8,7];senhaEstado.desenhando=true;senhaSoltar();}); await p1.waitForTimeout(250); }
  await p1.waitForTimeout(600);
  await p1.evaluate(() => { save.crystals = 4200; save.best = 33; persist(); nuvemEnviar(true); });
  await p1.waitForTimeout(1500);
  out.contaNaNuvem = await p1.evaluate(async () => {
    const c = await contaBuscar('Davi');
    return c ? { nome: c.nome, temSenha: !!c.senha, cristais: c.save.crystals, fase: c.save.best } : null;
  });

  // ---- CELULAR 2: entra pelo NOME + SENHA, sem ter nada salvo ----
  const c2 = await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const p2 = await c2.newPage();
  p2.on('pageerror', e => errs.push('P2: ' + e.message));
  await p2.goto(URL); await p2.waitForTimeout(900);
  out.celular2Vazio = await p2.evaluate(() => Object.keys(ROOT.profiles));

  // nome errado
  await p2.fill('#login-nome', 'Fulano'); await p2.tap('#btn-entrar'); await p2.waitForTimeout(1200);
  out.nomeErrado = await p2.evaluate(() => document.getElementById('login-aviso').textContent);

  // nome certo, senha errada
  await p2.fill('#login-nome', 'Davi'); await p2.tap('#btn-entrar'); await p2.waitForTimeout(1400);
  out.achouConta = await p2.evaluate(() => ({ aviso: document.getElementById('login-aviso').textContent, modo: S.mode }));
  await p2.evaluate(()=>{senhaEstado.seq=[0,1,2,5];senhaEstado.desenhando=true;senhaSoltar();});
  await p2.waitForTimeout(400);
  out.senhaErrada = await p2.evaluate(() => ({ modo: S.mode, dica: document.getElementById('senha-dica').textContent }));

  // senha certa -> baixa o progresso
  await p2.evaluate(()=>{senhaEstado.seq=[0,4,8,7];senhaEstado.desenhando=true;senhaSoltar();});
  await p2.waitForTimeout(900);
  out.entrouNoOutroCelular = await p2.evaluate(() => ({
    modo: S.mode, conta: ROOT.current,
    cristais: save.crystals, fase: save.best
  }));
  await p2.screenshot({ path: 'login-outro-celular.png' });

  console.log(JSON.stringify({ out, errs }, null, 1));
  await b.close();
  process.exit(errs.length ? 1 : 0);
})().catch(e => {
  console.error('FATAL', e.message.split('\n')[0]); process.exit(2);
});
