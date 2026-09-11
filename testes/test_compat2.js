const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
const URL=JOGO + '?nuvem=http://127.0.0.1:8099';
const fim=c=>process.exit(c);
async function novo(pg,nome,pad){
  await pg.goto(URL); await pg.waitForTimeout(900);
  await pg.fill('#new-name',nome); await pg.click('#btn-new'); await pg.waitForTimeout(300);
  for(let i=0;i<2;i++){await pg.evaluate(p=>{senhaEstado.seq=p.slice();senhaEstado.desenhando=true;senhaSoltar();},pad);await pg.waitForTimeout(280);}
  await pg.waitForTimeout(700);
}
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const errs=[],out={};
  const mk=()=>b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  /* jogador comum: nao ve recado tecnico nenhum */
  const c1=await mk(); const p1=await c1.newPage();
  p1.on('pageerror',e=>errs.push('P1: '+e.message));
  await novo(p1,'Zezinho',[0,1,2,5]);
  out.jogadorComum = await p1.evaluate(()=>{
    NUVEM_COMPAT = true; nuvemStatus='ok'; nuvemMostrarStatus();
    const el=document.getElementById('nuvem-status');
    return { visivel: el.style.display, texto: el.textContent.slice(0,40) };
  });
  /* dono: ve o aviso e o botao de reconferir */
  const c2=await mk(); const p2=await c2.newPage();
  p2.on('pageerror',e=>errs.push('P2: '+e.message));
  await novo(p2,'Cr1cket',[0,3,6,7]);
  out.dono = await p2.evaluate(()=>{
    NUVEM_COMPAT = true; nuvemStatus='ok'; nuvemMostrarStatus();
    const el=document.getElementById('nuvem-status');
    return { visivel: el.style.display,
             temCopiar: !!document.getElementById('nuvem-copiar'),
             temConferir: !!document.getElementById('nuvem-reconferir'),
             texto: el.textContent.slice(0,60) };
  });
  /* colou as regras: o modo compativel se desliga sozinho */
  out.desligou = await p2.evaluate(async()=>{
    NUVEM_COMPAT = true; storageSet('nn_compat','1');
    const ok = await compatConferir(true);
    return { conferiu: ok, compatAgora: NUVEM_COMPAT,
             guardado: storageGet('nn_compat','?') };
  });
  await p2.waitForTimeout(400);
  out.avisoSumiu = await p2.evaluate(()=>{
    nuvemMostrarStatus();
    const el=document.getElementById('nuvem-status');
    return { texto: el.textContent.slice(0,40) };
  });
  out.erros = errs;
  console.log(JSON.stringify(out,null,1));
  await b.close(); fim(errs.length?1:0);
})().catch(e=>{console.error('FATAL',e.message);fim(1);});
