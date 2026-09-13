const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
const fs = require('fs');
const URL=JOGO + '?nuvem=http://127.0.0.1:8099';
const fim=c=>{process.exit(c);};
async function novo(pg,nome,pad){
  await pg.goto(URL); await pg.waitForTimeout(900);
  await pg.fill('#new-name',nome); await pg.click('#btn-new'); await pg.waitForTimeout(300);
  for(let i=0;i<2;i++){await pg.evaluate(p=>{senhaEstado.seq=p.slice();senhaEstado.desenhando=true;senhaSoltar();},pad);await pg.waitForTimeout(280);}
  await pg.waitForTimeout(600);
}
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const errs=[],out={};
  const mk=()=>b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const c1=await mk(), c2=await mk();
  const j1=await c1.newPage(), j2=await c2.newPage();
  j1.on('pageerror',e=>errs.push('J1: '+e.message)); j2.on('pageerror',e=>errs.push('J2: '+e.message));
  await novo(j1,'Ana',[0,1,2,5]);
  await novo(j2,'Bruno',[0,3,6,7]);
  const antes = { ana: await j1.evaluate(()=>save.crystals), bruno: await j2.evaluate(()=>save.crystals) };

  const c3=await mk(); const adm=await c3.newPage();
  adm.on('pageerror',e=>errs.push('ADM: '+e.message));
  await adm.goto(URL); await adm.waitForTimeout(800);
  await adm.click('#btn-goto-adm'); await adm.waitForTimeout(300);
  await adm.fill('#adm-nick','Cr1cket'); await adm.fill('#adm-pass','neonadmin'); await adm.click('#btn-adm-enter');
  /* ESPERA A LISTA, NAO O RELOGIO.
     Antes eram 2200ms fixos, e isso e uma aposta: Ana e Bruno acabaram
     de entrar e ainda estao escrevendo o proprio registro na nuvem. Nos
     dias em que demoravam um pouco mais, o teste selecionava um piloto
     de uma lista vazia e morria 30s depois num campo que nunca apareceu
     -- uma falha que nao dizia nada sobre o jogo. */
  await adm.waitForFunction(() => typeof admNuvemLista !== 'undefined' && admNuvemLista.length >= 2,
                            null, { timeout: 20000 });
  await adm.evaluate(()=>admIrPara('acoes','dar')); await adm.waitForTimeout(500);

  /* --- 1. recado num presente para UMA pessoa --- */
  await adm.evaluate(()=>admNuvemSelecionar(admNuvemLista.find(x=>x.nome==='Ana')));
  await adm.waitForTimeout(400);
  await adm.evaluate(()=>{try{admIrPara('acoes','dar')}catch(e){}}); await adm.waitForTimeout(300);
  await adm.evaluate(()=>admIrPara('acoes','dar')); await adm.fill('#adm-nuvem-gem','500'); await adm.click('#adm-nuvem-dar'); await adm.waitForTimeout(300);
  await adm.evaluate(()=>{try{admIrPara('acoes','caixa')}catch(e){}}); await adm.waitForTimeout(300);
  await adm.evaluate(()=>admIrPara('acoes','caixa')); await adm.waitForTimeout(400); await adm.fill('#caixa-msg','Parabens Ana, voce mereceu!');
  out.recadosProntos = await adm.evaluate(()=>document.querySelectorAll('#caixa-prontos .cx-pronto').length);
  await adm.click('#caixa-enviar'); await adm.waitForTimeout(1500);
  await j1.evaluate(()=>nuvemVerificarPresentes()); await j1.waitForTimeout(1200);
  out.umSo = await j1.evaluate(()=>({
    cristais: save.crystals, recado: recadoDoPresente,
    caixaAberta: document.getElementById('caixa-presente').classList.contains('on'),
    msgVisivel: document.getElementById('cp-msg').classList.contains('on'),
    msgTexto: document.getElementById('cp-msg').textContent
  }));
  await j1.screenshot({path:'v36-um-so.png'});
  await j1.evaluate(()=>fecharCaixaPresente()); await j1.waitForTimeout(300);

  /* --- 2. presente para TODO MUNDO --- */
  await adm.evaluate(()=>{try{admIrPara('acoes','dar')}catch(e){}}); await adm.waitForTimeout(300);
  await adm.evaluate(()=>admIrPara('acoes','dar')); await adm.fill('#adm-nuvem-gem','3000'); await adm.click('#adm-nuvem-dar'); await adm.waitForTimeout(250);
  await adm.evaluate(()=>admIrPara('acoes','dar')); await adm.click('#adm-nuvem-lend'); await adm.waitForTimeout(250);
  await adm.evaluate(()=>{try{admIrPara('acoes','caixa')}catch(e){}}); await adm.waitForTimeout(300);
  await adm.evaluate(()=>admIrPara('acoes','caixa')); await adm.waitForTimeout(400); await adm.fill('#caixa-msg','Presente de Natal para todos! Obrigado por jogarem 🎄');
  await adm.fill('#caixa-geral-dias','5');
  await adm.click('#caixa-todos'); await adm.waitForTimeout(600);
  out.pediuConfirmacao = await adm.evaluate(()=>document.getElementById('caixa-todos').textContent.includes('CONFIRMAR'));
  await adm.click('#caixa-todos'); await adm.waitForTimeout(1800);
  out.geralNaNuvem = await adm.evaluate(async()=>{
    const g = await nuvemReq('mundo/geral');
    return g ? { cristais:g.cristais, lendarios:g.lendarios, msg:g.msg, dias:Math.round((g.ate-g.quando)/86400000) } : null;
  });
  out.painelMostra = await adm.evaluate(()=>document.getElementById('cx-geral').textContent.slice(0,110));
  await adm.evaluate(()=>document.getElementById('cx-geral').scrollIntoView({block:'center'}));
  await adm.waitForTimeout(400);
  await adm.screenshot({path:'v36-painel.png'});

  // os dois jogadores recebem, cada um uma vez só
  await j1.waitForTimeout(2500); await j2.waitForTimeout(2500);
  out.receberam = {
    ana: await j1.evaluate(()=>({cristais:save.crystals, amuletos:save.amulets.length, recado:recadoDoPresente})),
    bruno: await j2.evaluate(()=>({cristais:save.crystals, amuletos:save.amulets.length, recado:recadoDoPresente}))
  };
  await j2.screenshot({path:'v36-todos.png'});
  // não pode pegar duas vezes
  await j1.evaluate(async()=>{ mundoAplicar(await nuvemReq('mundo')); });
  await j1.waitForTimeout(800);
  out.naoRepetiu = await j1.evaluate(()=>save.crystals) === out.receberam.ana.cristais;

  /* --- 3. quem cria conta depois também pega --- */
  const c4=await mk(); const j3=await c4.newPage();
  j3.on('pageerror',e=>errs.push('J3: '+e.message));
  await novo(j3,'Carla',[0,4,8,7]);
  await j3.waitForTimeout(2500);
  out.contaNova = await j3.evaluate(()=>({cristais:save.crystals, amuletos:save.amulets.length, recado:recadoDoPresente}));

  console.log(JSON.stringify({antes,out,errs},null,1));
  await b.close(); fim(errs.length?1:0);
})().catch(e=>{console.error('FATAL',String(e).split('\n').slice(0,3).join(' | '));fim(2);});
