const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const errs=[]; const out={};
  const abrir=async(nome)=>{
    const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    const p=await c.newPage();
    p.on('pageerror',e=>errs.push(nome+': '+e.message));
    await p.goto(JOGO + '?nuvem=http://127.0.0.1:8099'); await p.waitForTimeout(1200);
    return {c,p};
  };

  /* 1. CRIAR a conta 7anoS: entra sem desenhar nada */
  const A=await abrir('criar');
  await A.p.fill('#new-name','7anoS');
  await A.p.tap('#btn-new'); await A.p.waitForTimeout(1200);
  out.criar = await A.p.evaluate(()=>({modo:S.mode, piloto:ROOT.current,
    temSenha:!!(ROOT.profiles['7anoS']||{}).senha}));
  // joga um pouco e salva na nuvem
  await A.p.evaluate(async()=>{ save.best=12; save.crystals=7700; persist();
    await contaEnviar(true); await new Promise(r=>setTimeout(r,600)); });
  await A.p.waitForTimeout(900);

  /* 2. SAIR e voltar: nao pede senha */
  await A.p.tap('#btn-logout'); await A.p.waitForTimeout(700);
  out.voltouAoLogin = await A.p.evaluate(()=>S.mode);
  await A.p.evaluate(()=>{ const b=[...document.querySelectorAll('.profile-btn')]
    .find(x=>x.textContent.indexOf('7anoS')>=0); if(b) b.click(); });
  await A.p.waitForTimeout(1200);
  out.entrouDaLista = await A.p.evaluate(()=>({modo:S.mode, piloto:ROOT.current}));

  /* 3. escrever o nome na caixa tambem entra direto */
  await A.p.evaluate(()=>{ esquecerPiloto(); S.mode='login'; renderLogin(); showScreen('login'); });
  await A.p.waitForTimeout(500);
  await A.p.fill('#login-nome','7anoS');
  await A.p.tap('#btn-entrar'); await A.p.waitForTimeout(1400);
  out.entrouPeloNome = await A.p.evaluate(()=>({modo:S.mode, piloto:ROOT.current}));

  /* 4. OUTRO APARELHO: puxa da nuvem sem senha */
  const B=await abrir('outro');
  await B.p.fill('#login-nome','7anoS');
  await B.p.tap('#btn-entrar'); await B.p.waitForTimeout(2200);
  out.outroAparelho = await B.p.evaluate(()=>({modo:S.mode, piloto:ROOT.current,
    fase:save.best, cristais:save.crystals}));
  await B.p.screenshot({path:'semsenha.png'});

  /* 5. minusculo tambem vale */
  await B.p.evaluate(()=>({a:1}));
  out.naoImportaMaiuscula = await B.p.evaluate(()=>
    [contaSemSenha('7anos'), contaSemSenha('7ANOS'), contaSemSenha('7anoS'),
     contaSemSenha('Davi'), contaSemSenha('')]);

  /* 6. as OUTRAS contas continuam pedindo senha */
  const C=await abrir('normal');
  await C.p.fill('#new-name','Davi');
  await C.p.tap('#btn-new'); await C.p.waitForTimeout(1000);
  out.contaNormal = await C.p.evaluate(()=>({modo:S.mode,
    pedeSenha:S.mode==='senha',
    titulo:(document.getElementById('senha-titulo')||{}).textContent}));

  out.errs=errs;
  console.log(JSON.stringify(out,null,1));
  await b.close();
  console.log('FATAL '+e.message.split('\n')[0]);process.exit(1)});
