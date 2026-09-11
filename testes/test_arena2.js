const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
const fs = require('fs');
const URL=JOGO + '?nuvem=http://127.0.0.1:8099';
async function novo(pg,nome,pad){
  await pg.goto(URL); await pg.waitForTimeout(800);
  await pg.fill('#new-name',nome); await pg.click('#btn-new'); await pg.waitForTimeout(300);
  for(let i=0;i<2;i++){await pg.evaluate(p=>{senhaEstado.seq=p.slice();senhaEstado.desenhando=true;senhaSoltar();},pad);await pg.waitForTimeout(280);}
  await pg.waitForTimeout(400);
}
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',
    args:['--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']});
  const errs=[],out={};
  const mk=()=>b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const c1=await mk(),c2=await mk();
  const p1=await c1.newPage(),p2=await c2.newPage();
  p1.on('pageerror',e=>errs.push('P1: '+e.message)); p2.on('pageerror',e=>errs.push('P2: '+e.message));
  await novo(p1,'Um',[0,1,2,5]); await novo(p2,'Dois',[0,3,6,7]);
  await p1.click('#btn-arena'); await p1.waitForTimeout(800);
  await p1.click('#arena-entrar'); await p1.waitForTimeout(1200);
  await p2.click('#btn-arena'); await p2.waitForTimeout(700);
  await p2.click('#arena-entrar'); await p2.waitForTimeout(1200);
  // congela os dois na MESMA onda e sorteia do zero nos dois ao mesmo tempo
  const rec = pg => pg.evaluate(()=>{
    S.fase = 7; S.waveIdx = 1; S.nWaves = 1;
    enemies = []; boss = null; S.toSpawn = 0;
    setupWave();
    const lista = [];
    let guarda = 0;
    while (S.toSpawn > 0 && guarda++ < 200) { spawnEnemy(); S.toSpawn--; }
    for (const e of enemies) lista.push(e.type + ':' + Math.round(e.x) + ':' + Math.round(e.hp));
    return lista;
  });
  const a = await rec(p1), c = await rec(p2);
  out.qtd = { p1: a.length, p2: c.length };
  out.iguais = JSON.stringify(a) === JSON.stringify(c);
  out.amostra = a.slice(0,6);
  // chefe da onda 10 tem que ser o mesmo
  const chefe = pg => pg.evaluate(()=>{
    S.fase = 10; S.waveIdx = 1; S.nWaves = 1; enemies=[]; boss=null;
    setupWave();
    return boss ? { nome: boss.bname, kind: boss.kind, max: boss.maxHp } : null;
  });
  out.chefe = { p1: await chefe(p1), p2: await chefe(p2) };
  console.log(JSON.stringify({out,errs},null,1));
  await b.close(); process.exit(errs.length?1:0);
})().catch(e=>{console.error('FATAL',String(e).split('\n')[0]);process.exit(2);});
