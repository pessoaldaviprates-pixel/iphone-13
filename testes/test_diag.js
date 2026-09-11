const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
const fs = require('fs');
const URL=JOGO + '?nuvem=http://127.0.0.1:8099';
const fim=c=>{process.exit(c);};
async function abrirPainel(pg){
  await pg.goto(URL); await pg.waitForTimeout(900);
  await pg.click('#btn-goto-adm'); await pg.waitForTimeout(300);
  await pg.fill('#adm-nick','Cr1cket'); await pg.fill('#adm-pass','neonadmin'); await pg.click('#btn-adm-enter'); await pg.waitForTimeout(2200); await pg.evaluate(()=>admIrPara('sistema')); await pg.waitForTimeout(500);
}
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const errs=[],out={};
  const mk=()=>b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});

  /* --- 1. sem nuvem nenhuma (o caso do Artifact antigo) --- */
  let c=await mk(); let p=await c.newPage(); p.on('pageerror',e=>errs.push('SEM: '+e.message));
  await abrirPainel(p);
  out.semNuvem = {
    cartoesVisiveis: await p.evaluate(()=>['adm-mundo','adm-eventos','adm-boosts','adm-trolls']
      .filter(i=>getComputedStyle(document.getElementById(i)).display!=='none').length),
    diagnostico: await p.evaluate(()=>document.getElementById('diag-lista').textContent.replace(/\s+/g,' ').slice(0,150))
  };
  // tenta enviar um recado: tem de avisar
  await p.evaluate(()=>{try{admIrPara('mundo')}catch(e){}}); await p.waitForTimeout(300);
  await p.fill('#msg-texto','oi'); await p.click('#msg-enviar'); await p.waitForTimeout(600);
  out.semNuvem.avisoAoTentar = await p.evaluate(()=>document.getElementById('adm-msg').textContent.slice(0,90));
  await p.screenshot({path:'v34-sem-nuvem.png'});
  await c.close();

  /* --- 2. nuvem ligada mas o galho "mundo" bloqueado (regras velhas) --- */
  c=await mk(); p=await c.newPage(); p.on('pageerror',e=>errs.push('BLOQ: '+e.message));
  await c.route('**/127.0.0.1:8099/mundo**', route =>
    route.request().method()==='GET' ? route.continue()
      : route.fulfill({status:401, body:'{"error":"Permission denied"}'}));
  await abrirPainel(p);
  await p.evaluate(()=>{try{admIrPara('sistema')}catch(e){}}); await p.waitForTimeout(300);
  await p.click('#diag-testar'); await p.waitForTimeout(2500);
  out.bloqueado = {
    itens: await p.evaluate(()=>document.querySelectorAll('#diag-lista .diag-item').length),
    ruins: await p.evaluate(()=>document.querySelectorAll('#diag-lista .diag-item.ruim').length),
    apontouMundo: await p.evaluate(()=>document.getElementById('diag-lista').textContent.includes('mundo')),
    temRegras: await p.evaluate(()=>!!document.querySelector('.diag-regras')),
    regrasValidas: await p.evaluate(()=>{ try { JSON.parse(document.querySelector('.diag-regras').textContent); return true; } catch(e){ return false; } })
  };
  await p.evaluate(()=>{try{admIrPara('mundo')}catch(e){}}); await p.waitForTimeout(300);
  await p.fill('#msg-texto','teste'); await p.click('#msg-enviar'); await p.waitForTimeout(800);
  out.bloqueado.avisoAoTentar = await p.evaluate(()=>document.getElementById('adm-msg').textContent.slice(0,110));
  await p.evaluate(()=>document.getElementById('adm-diag').scrollIntoView({block:'start'}));
  await p.waitForTimeout(400);
  await p.screenshot({path:'v34-bloqueado.png'});
  await c.close();

  /* --- 3. tudo certo --- */
  c=await mk(); p=await c.newPage(); p.on('pageerror',e=>errs.push('OK: '+e.message));
  await abrirPainel(p);
  await p.evaluate(()=>{try{admIrPara('sistema')}catch(e){}}); await p.waitForTimeout(300);
  await p.click('#diag-testar'); await p.waitForTimeout(3000);
  out.tudoCerto = {
    ruins: await p.evaluate(()=>document.querySelectorAll('#diag-lista .diag-item.ruim').length),
    ok: await p.evaluate(()=>document.querySelectorAll('#diag-lista .diag-item.ok').length),
    texto: await p.evaluate(()=>document.getElementById('diag-lista').textContent.includes('Está tudo certo'))
  };
  await p.evaluate(()=>{try{admIrPara('mundo')}catch(e){}}); await p.waitForTimeout(300);
  await p.fill('#msg-texto','funcionando!'); await p.click('#msg-enviar'); await p.waitForTimeout(1200);
  out.tudoCerto.recadoNoAr = await p.evaluate(()=>!!(MUNDO.aviso && MUNDO.aviso.texto));
  await p.evaluate(()=>document.getElementById('adm-diag').scrollIntoView({block:'start'}));
  await p.waitForTimeout(400);
  await p.screenshot({path:'v34-ok.png'});

  console.log(JSON.stringify({out,errs},null,1));
  await b.close(); fim(errs.length?1:0);
})().catch(e=>{console.error('FATAL',String(e).split('\n').slice(0,3).join(' | '));fim(2);});
