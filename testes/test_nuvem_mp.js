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
  await pg.waitForTimeout(700);
}
const esperar = async (pg, fn, arg, ms=12000) => {
  const t0=Date.now();
  while(Date.now()-t0<ms){ if(await pg.evaluate(fn,arg)) return Math.round(Date.now()-t0); await pg.waitForTimeout(100); }
  return -1;
};
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const errs=[],out={};
  const mk=()=>b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const cA=await mk(), cB=await mk();
  const A=await cA.newPage(), B=await cB.newPage();
  A.on('pageerror',e=>errs.push('A: '+e.message));
  B.on('pageerror',e=>errs.push('B: '+e.message));
  await novo(A,'Ana',[0,1,2,5]);
  await novo(B,'Bruno',[0,3,6,7]);
  // desliga a ligação direta nos dois: simula rede que não deixa P2P
  for (const p of [A,B]) await p.evaluate(()=>{ window.RTCPeerConnection = undefined; P2P.desistiu = true; });

  /* ---- COOPERATIVO pela nuvem: o abate tem de valer para os dois ---- */
  await A.evaluate(()=>{ abrirMulti('coop'); });
  await A.click('#coop-criar'); await A.waitForTimeout(1500);
  const codigo = await A.evaluate(()=>MP.sala);
  await B.evaluate(c=>mpEntrarSala(c,'coop'), codigo);
  await B.waitForTimeout(2000);
  await A.evaluate(()=>mpComecar());
  await A.waitForTimeout(2500);
  out.coop = { A: await A.evaluate(()=>S.mode), B: await B.evaluate(()=>S.mode),
               p2pA: await A.evaluate(()=>p2pAberto()), fluindo: await A.evaluate(()=>!!MP.fluindo) };

  // os dois montam a mesma onda: pega um sid que existe nos dois
  await A.evaluate(()=>{ enemies.length=0; for(let i=0;i<10;i++) spawnEnemy("drone"); });
  await B.evaluate(()=>{ enemies.length=0; for(let i=0;i<10;i++) spawnEnemy("drone"); });
  await A.waitForTimeout(300);
  const sid = await B.evaluate(()=>enemies.length?enemies[3].sid:null);
  const t0 = Date.now();
  await A.evaluate(s=>{ const e=enemies.find(x=>x.sid===s); if(e) mpAvisarAbate(e); }, sid);
  const chegou = await esperar(B, s=>!enemies.some(x=>x.sid===s), sid, 6000);
  out.abatePelaNuvem = { sid, chegouEm_ms: chegou, restaramB: await B.evaluate(()=>enemies.length) };

  // segundo abate, para conferir que não é sorte
  const sid2 = await B.evaluate(()=>enemies.length?enemies[0].sid:null);
  const t1 = Date.now();
  await A.evaluate(s=>{ const e=enemies.find(x=>x.sid===s); if(e) mpAvisarAbate(e); }, sid2);
  out.segundoAbate = { chegouEm_ms: await esperar(B, s=>!enemies.some(x=>x.sid===s), sid2, 6000) };

  await A.evaluate(()=>mpSair(true)); await B.evaluate(()=>mpSair(true));
  await A.waitForTimeout(700);

  /* ---- DUELO pela nuvem: quem mata TEM de ver a vitória ---- */
  await A.evaluate(()=>{ abrirMulti('pvp'); });
  await A.click('#pvp-criar'); await A.waitForTimeout(1500);
  const cod2 = await A.evaluate(()=>MP.sala);
  await B.evaluate(c=>mpEntrarSala(c,'pvp'), cod2);
  await B.waitForTimeout(2000);
  await A.evaluate(()=>mpComecar());
  await A.waitForTimeout(2500);
  out.duelo = { A: await A.evaluate(()=>S.mode), B: await B.evaluate(()=>S.mode) };

  // B morre
  const t2 = Date.now();
  await B.evaluate(()=>{ player.invuln = 0; player.invis = 0; player.shield = 0; player.lives = 1; player.hp = 1; hitPlayer(); });
  await B.waitForTimeout(500);
  out.perdedor = await B.evaluate(()=>({ modo: S.mode, fim: MP.fim,
    titulo: document.getElementById('go-title').textContent }));
  const venceu = await esperar(A, ()=>S.mode === 'gameover' && MP.fim, null, 15000);
  out.vencedor = { terminouEm_ms: venceu, modo: await A.evaluate(()=>S.mode),
    fim: await A.evaluate(()=>MP.fim),
    titulo: await A.evaluate(()=>document.getElementById('go-title').textContent) };

  out.erros = errs;
  console.log(JSON.stringify(out,null,1));
  await b.close(); fim(errs.length?1:0);
})().catch(e=>{console.error('FATAL',e.message);fim(1);});
