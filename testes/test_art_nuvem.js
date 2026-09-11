const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const p=await c.newPage(); const errs=[];
  p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ try{localStorage.clear();}catch(e){} });
  await p.goto('file:///tmp/claude-0/-home-user-iphone-13/b7a1aae1-35a1-5214-9848-2da99e219fb6/scratchpad/artifact-teste.html');
  await p.waitForTimeout(1500);
  const out = { nuvemLigada: await p.evaluate(()=>nuvemAtiva()),
                url: await p.evaluate(()=>NUVEM_URL) };
  await p.click('#btn-goto-adm'); await p.waitForTimeout(300);
  await p.fill('#adm-nick','Cr1cket'); await p.fill('#adm-pass','neonadmin'); await p.click('#btn-adm-enter'); await p.waitForTimeout(2200); await p.evaluate(()=>admIrPara('mundo')); await p.waitForTimeout(500);
  out.cartoesDoMundo = await p.evaluate(()=>['adm-mundo','adm-eventos','adm-boosts','adm-trolls','adm-nuvem','adm-vivo']
    .filter(i=>getComputedStyle(document.getElementById(i)).display!=='none').length);
  await p.evaluate(()=>{try{admIrPara('sistema')}catch(e){}}); await p.waitForTimeout(300);
  await p.click('#diag-testar'); await p.waitForTimeout(3000);
  out.diag = { ruins: await p.evaluate(()=>document.querySelectorAll('#diag-lista .diag-item.ruim').length),
               ok: await p.evaluate(()=>document.querySelectorAll('#diag-lista .diag-item.ok').length) };
  await p.evaluate(()=>{try{admIrPara('mundo')}catch(e){}}); await p.waitForTimeout(300);
  await p.fill('#msg-texto','recado do artifact'); await p.click('#msg-enviar'); await p.waitForTimeout(1500);
  out.recado = await p.evaluate(()=>MUNDO.aviso ? MUNDO.aviso.texto : null);
  await p.evaluate(()=>{ [...document.querySelectorAll('#lista-eventos .mundo-op')]
    .find(e=>e.textContent.includes('FESTA')).click(); });
  await p.waitForTimeout(1800);
  out.evento = await p.evaluate(()=>eventoAtual()?eventoAtual().id:null);
  console.log(JSON.stringify({out,errs},null,1));
  await b.close(); process.exit(errs.length?1:0);
})().catch(e=>{console.error('FATAL',e.message);process.exit(2);});
