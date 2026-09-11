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
const esperar = async (pg, fn, ms=15000) => {
  const t0=Date.now();
  while(Date.now()-t0<ms){ if(await pg.evaluate(fn)) return Math.round(Date.now()-t0); await pg.waitForTimeout(200); }
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
  await novo(A,'RankA',[0,1,2,5]);
  await novo(B,'RankB',[0,3,6,7]);

  /* a aba especial existe e mostra tudo */
  out.aba = await A.evaluate(()=>{
    save.rank = 780; save.vitorias = 9; save.derrotas = 3; persist();
    abrirMulti('ranked');
    return {
      visivel: document.getElementById('multi-ranked').style.display,
      brasao: document.getElementById('mrk-sim').textContent,
      nome: document.getElementById('mrk-nome').textContent,
      pontos: document.getElementById('mrk-pts').textContent,
      prox: document.getElementById('mrk-prox').textContent,
      barra: document.getElementById('mrk-barra').style.width,
      vit: document.getElementById('mrk-vit').textContent,
      der: document.getElementById('mrk-der').textContent,
      taxa: document.getElementById('mrk-taxa').textContent,
      degraus: document.querySelectorAll('#mrk-escada .rk-degrau').length,
      degrauAtual: (document.querySelector('#mrk-escada .rk-degrau.aqui')||{textContent:'-'}).textContent
    };
  });

  /* procurar pela aba nova casa os dois e abre o duelo */
  await A.evaluate(()=>{ abrirMulti('ranked'); });
  await A.click('#mrk-procurar'); await A.waitForTimeout(900);
  out.buscando = await A.evaluate(()=>({
    painel: document.getElementById('mrk-busca').classList.contains('on'),
    botao: document.getElementById('mrk-procurar').style.display,
    txt: document.getElementById('mrk-busca-txt').textContent
  }));
  await B.evaluate(()=>{ abrirMulti('ranked'); });
  await B.click('#mrk-procurar');
  const casou = await esperar(A, ()=>!!MP.sala, 20000);
  out.casamento = { achouEm_ms: casou,
    salaA: await A.evaluate(()=>MP.sala), salaB: await B.evaluate(()=>MP.sala),
    modoA: await A.evaluate(()=>MP.modo) };
  if (casou > 0) {
    out.ligacaoDireta = { A: await esperar(A, ()=>p2pAberto(), 15000),
                          B: await esperar(B, ()=>p2pAberto(), 15000) };
  }
  await A.evaluate(()=>{ rkPararBusca(true); mpSair(true); });
  await B.evaluate(()=>{ rkPararBusca(true); mpSair(true); });
  out.erros = errs;
  console.log(JSON.stringify(out,null,1));
  await b.close(); fim(errs.length?1:0);
})().catch(e=>{console.error('FATAL',e.message);fim(1);});
