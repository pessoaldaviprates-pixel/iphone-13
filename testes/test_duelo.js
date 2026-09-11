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
const esperar = async (pg, fn, arg, ms=10000) => {
  const t0=Date.now();
  while(Date.now()-t0<ms){ if(await pg.evaluate(fn,arg)) return Math.round(Date.now()-t0); await pg.waitForTimeout(120); }
  return -1;
};
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',
    args:['--disable-features=WebRtcHideLocalIpsWithMdns','--allow-loopback-in-peer-connection']});
  const errs=[],out={};
  const mk=()=>b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const cA=await mk(), cB=await mk();
  const A=await cA.newPage(), B=await cB.newPage();
  A.on('pageerror',e=>errs.push('A: '+e.message));
  B.on('pageerror',e=>errs.push('B: '+e.message));
  await novo(A,'Duelista',[0,1,2,5]);
  await novo(B,'Rival',[0,3,6,7]);

  await A.evaluate(()=>{ abrirMulti('pvp'); });
  await A.click('#pvp-criar'); await A.waitForTimeout(1500);
  const codigo = await A.evaluate(()=>MP.sala);
  await B.evaluate(c=>mpEntrarSala(c,'pvp'), codigo);
  await B.waitForTimeout(2500);
  out.ligou = { A: await esperar(A, ()=>p2pAberto(), null, 15000),
                B: await esperar(B, ()=>p2pAberto(), null, 15000) };
  out.salaNet = await A.evaluate(()=>document.getElementById('sala-net').textContent.trim());

  await A.evaluate(()=>mpComecar());
  await A.waitForTimeout(2500);
  out.modo = { A: await A.evaluate(()=>S.mode), B: await B.evaluate(()=>S.mode),
               duelo: await A.evaluate(()=>!!S.duelo) };

  /* A atira: B tem de ver os tiros chegando */
  await A.evaluate(()=>{ for(let k=0;k<6;k++) playerShoot(); });
  const viuTiros = await esperar(B, ()=>{
    const o = mpOutroPrincipal();
    return o && o.sim && o.sim.length > 0;
  }, null, 4000);
  out.tirosDoOutro = { viuEm_ms: viuTiros,
    quantos: await B.evaluate(()=>{const o=mpOutroPrincipal();return o&&o.sim?o.sim.length:0;}) };

  /* vida do adversário aparece no placar */
  await A.evaluate(()=>{ player.hp = Math.round(ST.maxHp*0.4); });
  const viuVida = await esperar(B, ()=>{
    const o = mpOutroPrincipal();
    return o && o.hp && o.hp < o.hpMax * 0.6;
  }, null, 4000);
  out.vidaDoOutro = { atualizouEm_ms: viuVida,
    placar: await B.evaluate(()=>document.getElementById('mp-hp-txt').textContent) };

  out.selo = await B.evaluate(()=>document.getElementById('mp-conexao').textContent);
  out.pacotes = { A: await A.evaluate(()=>P2P.enviados), B: await B.evaluate(()=>P2P.recebidos) };

  await A.evaluate(()=>mpSair(true));
  await B.evaluate(()=>mpSair(true));
  await A.waitForTimeout(400);
  out.limpou = { A: await A.evaluate(()=>({sala:MP.sala, p2p:P2P.ligado})),
                 B: await B.evaluate(()=>({sala:MP.sala, p2p:P2P.ligado})) };
  out.erros = errs;
  console.log(JSON.stringify(out,null,1));
  await b.close(); fim(errs.length?1:0);
})().catch(e=>{console.error('FATAL',e.message);fim(1);});
