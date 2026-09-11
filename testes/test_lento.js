const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
const fs = require('fs');
const URL=JOGO + '?nuvem=http://127.0.0.1:8099';
async function novo(pg,nome,pad){
  await pg.goto(URL); await pg.waitForTimeout(900);
  await pg.fill('#new-name',nome); await pg.click('#btn-new'); await pg.waitForTimeout(300);
  for(let i=0;i<2;i++){await pg.evaluate(p=>{senhaEstado.seq=p.slice();senhaEstado.desenhando=true;senhaSoltar();},pad);await pg.waitForTimeout(280);}
  await pg.waitForTimeout(400);
}
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',
    args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
  const errs=[],out={};
  const mk=()=>b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const c1=await mk(),c2=await mk();
  const p1=await c1.newPage(),p2=await c2.newPage();
  p1.on('pageerror',e=>errs.push('P1: '+e.message));
  // celular ruim: 260ms de atraso em cada escrita
  await c1.route('**/127.0.0.1:8099/**', async route => {
    if (route.request().method() === 'GET') return route.continue();
    await new Promise(r=>setTimeout(r,260));
    return route.continue();
  });
  await novo(p1,'Lento',[0,1,2,5]); await novo(p2,'Rapido',[0,3,6,7]);
  await p1.click('#btn-multi'); await p1.waitForTimeout(500);
  await p1.click('#coop-criar'); await p1.waitForTimeout(1800);
  const cod = await p1.evaluate(()=>MP.sala);
  await p2.click('#btn-multi'); await p2.waitForTimeout(400);
  await p2.fill('#coop-codigo',cod); await p2.click('#coop-entrar'); await p2.waitForTimeout(1500);
  await p1.click('#sala-comecar'); await p1.waitForTimeout(3500);
  let reqs=0;
  const cont = r => { if (/127\.0\.0\.1:8099/.test(r.url()) && r.method()!=='GET') reqs++; };
  p1.on('request', cont);
  // mede se o jogo continua rodando liso mesmo com a rede ruim
  const fps = await p1.evaluate(()=>new Promise(res=>{
    let n=0; const t0=performance.now();
    const laco=()=>{ n++; if(performance.now()-t0<4000) requestAnimationFrame(laco);
      else res(Math.round(n/((performance.now()-t0)/1000))); };
    requestAnimationFrame(laco);
  }));
  p1.off('request', cont);
  out.comRedeRuim = { fps, escritasPorSegundo:+(reqs/4).toFixed(1),
    intervaloAdaptado: await p1.evaluate(()=>REDE.intervalo),
    idaMedida: await p1.evaluate(()=>Math.round(REDE.ida)),
    modo: await p1.evaluate(()=>S.mode),
    veOOutro: await p1.evaluate(()=>Object.keys(MP.outros).length) };
  console.log(JSON.stringify({out,errs},null,1));
  await b.close(); process.exit(errs.length?1:0);
})().catch(e=>{console.error('FATAL',String(e).split('\n')[0]);process.exit(2);});
