const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
const fs = require('fs');
const URL = JOGO + '?nuvem=http://127.0.0.1:8099';
async function novo(page, nome, padrao) {
  await page.goto(URL); await page.waitForTimeout(800);
  await page.fill('#new-name', nome); await page.tap('#btn-new'); await page.waitForTimeout(300);
  for (let i=0;i<2;i++){ await page.evaluate(pts=>{senhaEstado.seq=pts.slice();senhaEstado.desenhando=true;senhaSoltar();}, padrao); await page.waitForTimeout(250); }
  await page.waitForTimeout(300);
}
(async () => {
  const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium',
    args:['--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding'] });
  const errs=[], out={};
  const c1 = await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const c2 = await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const p1 = await c1.newPage(), p2 = await c2.newPage();
  p1.on('pageerror',e=>errs.push('P1: '+e.message)); p2.on('pageerror',e=>errs.push('P2: '+e.message));
  await novo(p1,'Alfa',[0,1,2,5]); await novo(p2,'Beta',[0,3,6,7]);
  await p1.tap('#btn-multi'); await p1.waitForTimeout(400);
  await p1.tap('#coop-criar'); await p1.waitForTimeout(1200);
  const cod = await p1.evaluate(()=>MP.sala);
  await p2.tap('#btn-multi'); await p2.waitForTimeout(300);
  await p2.fill('#coop-codigo',cod); await p2.tap('#coop-entrar'); await p2.waitForTimeout(1200);
  await p1.tap('#sala-comecar'); await p1.waitForTimeout(2500);
  out.fluindo = { p1: await p1.evaluate(()=>MP.fluindo), p2: await p2.evaluate(()=>MP.fluindo) };
  out.modo = { p1: await p1.evaluate(()=>S.mode), p2: await p2.evaluate(()=>S.mode) };

  // taxa: quantas posicoes novas de p2 o p1 recebe em 3s
  const taxa = pg => pg.evaluate(()=>new Promise(res=>{
    let n=0, ult=null; const t0 = MP.ticks||0;
    const t=setInterval(()=>{ const id=Object.keys(MP.outros)[0]; const o=id?MP.outros[id]:null;
      if(o&&o.ts!==ult){n++;ult=o.ts;} },20);
    setTimeout(()=>{clearInterval(t);res({novas:n, ticks:(MP.ticks||0)-t0});},3000);
  }));
  out.taxa3s = await taxa(p1);

  // atraso: p2 teleporta, quanto tempo p1 leva para ver
  out.atrasoMs = await (async () => {
    const alvo = 111;
    await p2.evaluate(a => { player.x = a; player.tx = a; MP.ultimoEnvio = 0; }, alvo);
    const t0 = Date.now();
    const ok = await p1.evaluate(a => new Promise(res => {
      const ini = Date.now();
      const t = setInterval(() => {
        const id = Object.keys(MP.outros)[0];
        const o = id ? MP.outros[id] : null;
        if (o && Math.abs((o.x||0) - a) < 3) { clearInterval(t); res(Date.now()-ini); }
        if (Date.now()-ini > 4000) { clearInterval(t); res(-1); }
      }, 10);
    }), alvo);
    return ok;
  })();
  out.pesoDoPacote = await p1.evaluate(()=>mpEmpacotar().length);
  console.log(JSON.stringify({out,errs},null,1));
  await b.close(); process.exit(errs.length?1:0);
})().catch(e=>{console.error('FATAL',String(e).split('\n')[0]);process.exit(2);});
