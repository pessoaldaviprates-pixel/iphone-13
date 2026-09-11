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
const esperar = async (pg, fn, ms=12000) => {
  const t0=Date.now();
  while(Date.now()-t0<ms){ if(await pg.evaluate(fn)) return Math.round(Date.now()-t0); await pg.waitForTimeout(150); }
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
  await novo(A,'Ana',[0,1,2,5]);
  await novo(B,'Bruno',[0,3,6,7]);

  out.abas = await A.evaluate(()=>{
    abrirMulti('ranked');
    return { abas:[...document.querySelectorAll('#multi-abas .aba')].map(x=>x.textContent.trim()),
             rankedVisivel: document.getElementById('multi-ranked').style.display,
             brasao: document.getElementById('mrk-nome').textContent,
             degraus: document.querySelectorAll('#mrk-escada .rk-degrau').length,
             coopLigado: COOP_LIGADO, rankedLigado: RANKED_LIGADO };
  });

  /* --- sala cooperativa --- */
  await A.evaluate(()=>{ abrirMulti('coop'); });
  await A.click('#coop-criar'); await A.waitForTimeout(1500);
  const codigo = await A.evaluate(()=>MP.sala);
  out.sala = { codigo, host: await A.evaluate(()=>MP.host) };
  await B.evaluate(c=>{ abrirMulti('coop'); mpEntrarSala(c,'coop'); }, codigo);
  await B.waitForTimeout(2500);

  /* --- ligação direta --- */
  const tA = await esperar(A, ()=>p2pAberto(), 15000);
  const tB = await esperar(B, ()=>p2pAberto(), 15000);
  out.p2p = { ligouA_ms: tA, ligouB_ms: tB,
              estadoA: await A.evaluate(()=>({ligado:P2P.ligado, papel:P2P.papel, tentando:P2P.tentando})),
              estadoB: await B.evaluate(()=>({ligado:P2P.ligado, papel:P2P.papel, tentando:P2P.tentando})) };

  if (tA < 0 || tB < 0) {
    out.diag = { A: await A.evaluate(()=>({ pc:P2P.pc?P2P.pc.connectionState:'sem pc',
                                            ice:P2P.pc?P2P.pc.iceConnectionState:'-',
                                            sig:P2P.pc?P2P.pc.signalingState:'-', parceiro:P2P.parceiro })),
                 B: await B.evaluate(()=>({ pc:P2P.pc?P2P.pc.connectionState:'sem pc',
                                            ice:P2P.pc?P2P.pc.iceConnectionState:'-',
                                            sig:P2P.pc?P2P.pc.signalingState:'-', parceiro:P2P.parceiro })) };
  }

  /* --- começar a partida --- */
  await A.evaluate(()=>mpComecar());
  await A.waitForTimeout(2500);
  out.partida = { A: await A.evaluate(()=>S.mode), B: await B.evaluate(()=>S.mode) };

  /* --- ping medido --- */
  await A.waitForTimeout(2500);
  out.ping = { A: await A.evaluate(()=>P2P.ping), B: await B.evaluate(()=>P2P.ping),
               selo: await A.evaluate(()=>document.getElementById('mp-conexao').textContent) };

  /* --- o outro aparece e anda --- */
  out.veOOutro = {
    A: await A.evaluate(()=>{ const o=mpOutroPrincipal(); return o?{nome:o.nome,x:Math.round(o.x||0),passos:(o.buf||[]).length}:null; }),
    B: await B.evaluate(()=>{ const o=mpOutroPrincipal(); return o?{nome:o.nome,x:Math.round(o.x||0),passos:(o.buf||[]).length}:null; })
  };

  /* --- abate na mesma hora --- */
  const abate = await A.evaluate(async()=>{
    enemies.length=0; for(let i=0;i<8;i++) spawnEnemy("drone");
    const sid = enemies[0].sid;
    return { sid, antes: enemies.length };
  });
  await B.evaluate(()=>{ enemies.length=0; for(let i=0;i<8;i++) spawnEnemy("drone"); });
  await B.waitForTimeout(200);
  const sidB = await B.evaluate(()=>enemies.length?enemies[0].sid:null);
  const t0 = Date.now();
  await A.evaluate(s=>{ const e=enemies.find(x=>x.sid===s); if(e) mpAvisarAbate(e); }, sidB);
  const chegou = await esperar(B, s=>!enemies.some(x=>x.sid===s), 4000);
  out.abate = { sidUsado: sidB, chegouEm_ms: chegou,
                recebidosB: await B.evaluate(()=>P2P.recebidos) };

  /* --- mesma onda --- */
  const ondaAntes = await B.evaluate(()=>S.waveIdx);
  await A.evaluate(()=>{ S.waveIdx = (S.waveIdx||0) + 3; setupWave(); });
  const ondaOk = await esperar(B, o=>S.waveIdx !== o, 5000, ondaAntes);
  out.onda = { antesB: ondaAntes, depoisB: await B.evaluate(()=>S.waveIdx),
               depoisA: await A.evaluate(()=>S.waveIdx),
               sincronizouEm_ms: await (async()=>{
                 const t=Date.now();
                 while(Date.now()-t<5000){
                   const a=await A.evaluate(()=>S.waveIdx), bb=await B.evaluate(()=>S.waveIdx);
                   if(a===bb) return Math.round(Date.now()-t);
                   await B.waitForTimeout(120);
                 } return -1; })() };

  /* --- quantos pacotes por segundo --- */
  const p1 = await B.evaluate(()=>P2P.recebidos);
  await B.waitForTimeout(1000);
  const p2 = await B.evaluate(()=>P2P.recebidos);
  out.pacotesPorSegundo = p2 - p1;

  await A.evaluate(()=>mpSair(true));
  await B.evaluate(()=>mpSair(true));
  await A.waitForTimeout(500);
  out.erros = errs;
  console.log(JSON.stringify(out,null,1));
  await b.close(); fim(errs.length?1:0);
})().catch(e=>{console.error('FATAL',e.message);fim(1);});
