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
  await pg.evaluate(()=>{ nuvemEnviar(true); });
  await pg.waitForTimeout(900);
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
  const cA=await mk(), cB=await mk(), cC=await mk();
  const A=await cA.newPage(), B=await cB.newPage(), C=await cC.newPage();
  A.on('pageerror',e=>errs.push('A: '+e.message));
  B.on('pageerror',e=>errs.push('B: '+e.message));
  C.on('pageerror',e=>errs.push('C: '+e.message));
  await novo(A,'Ana',[0,1,2,5]);
  await novo(B,'Bruno Kid',[0,3,6,7]);
  await novo(C,'Carla',[1,4,7,8]);

  /* --- 1. achar amigo escrevendo errado --- */
  out.busca = await A.evaluate(async()=>{
    const r = {};
    r.minusculo   = (await acharPiloto('bruno kid'))  ? 'achou' : 'não achou';
    r.semEspaco   = (await acharPiloto('brunokid'))   ? 'achou' : 'não achou';
    r.comEspacos  = (await acharPiloto('  Bruno Kid ')) ? 'achou' : 'não achou';
    r.soComeco    = (await acharPiloto('bru'))        ? 'achou' : 'não achou';
    r.maiusculo   = (await acharPiloto('BRUNO KID'))  ? 'achou' : 'não achou';
    r.inexistente = (await acharPiloto('Zeziinho99')) ? 'achou' : 'não achou';
    return r;
  });
  out.pedido = await A.evaluate(async()=>{ const r = await amigoPedir('bruno kid'); return r; });
  await B.evaluate(()=>amigosCarregar && amigosCarregar());
  await B.waitForTimeout(1200);
  out.aceitou = await B.evaluate(async()=>{
    const ids = Object.keys(AM.pedidos);
    if (!ids.length) return { pedidos: 0 };
    await amigoAceitar(ids[0]);
    return { pedidos: 1, agoraAmigos: Object.keys(AM.lista).length };
  });
  await A.evaluate(()=>amigosCarregar && amigosCarregar());
  await A.waitForTimeout(1200);

  /* --- 2. aba jornada --- */
  out.aba = await A.evaluate(()=>{
    abrirMulti('jornada');
    return { abas: [...document.querySelectorAll('#multi-abas .aba')].map(x=>x.textContent.trim()),
             cartoes: document.querySelectorAll('#jor-lista .jor-cartao').length,
             texto: (document.querySelector('#jor-lista .jor-txt')||{textContent:''}).textContent.trim() };
  });

  /* --- 3. abrir a jornada com o Bruno, comprar melhoria --- */
  out.jornadaBruno = await A.evaluate(()=>{
    save.crystals = 500000; persist();
    abrirJornada('Bruno Kid');
    const j = jornadaDe('Bruno Kid', true);
    const antes = { fase: j.fase, maior: j.maior, dano: ST.dmg };
    const btn = document.querySelector('#jor-ups .part-row .buy-btn');
    const rotulo = btn.textContent.trim();
    btn.click(); btn.click();  // dois níveis de dano
    calcStats();
    return { antes, rotulo, nivelDano: jornadaNivel(jornadaDe('Bruno Kid',true),'dano'),
             chave: JOR.chave, sala: codigoDaDupla(JOR.chave),
             fases: document.querySelectorAll('#jor-fases .fase-btn').length,
             capa: document.getElementById('jor-capa').textContent.replace(/\s+/g,' ').trim() };
  });

  /* --- 4. a jornada com a Carla é OUTRA --- */
  out.jornadaCarla = await A.evaluate(()=>{
    save.amigos = save.amigos || []; save.amigos.push('Carla'); persist();
    abrirJornada('Carla');
    const j = jornadaDe('Carla', true);
    return { fase: j.fase, maior: j.maior, nivelDano: jornadaNivel(j,'dano'),
             chaveDiferente: chaveDupla('Ana','Carla') !== chaveDupla('Ana','Bruno Kid'),
             salaDiferente: codigoDaDupla(chaveDupla('Ana','Carla')) !== codigoDaDupla(chaveDupla('Ana','Bruno Kid')) };
  });

  /* --- 5. os dois caem na mesma sala sem digitar código --- */
  await A.evaluate(async()=>{ abrirJornada('Bruno Kid'); await jornadaJogar(); });
  await A.waitForTimeout(1800);
  await B.evaluate(async()=>{
    save.amigos = save.amigos || []; if(save.amigos.indexOf('Ana')<0) save.amigos.push('Ana');
    abrirJornada('Ana'); await jornadaJogar();
  });
  await B.waitForTimeout(2500);
  out.sala = { A: await A.evaluate(()=>MP.sala), B: await B.evaluate(()=>MP.sala),
               mesmaSala: (await A.evaluate(()=>MP.sala)) === (await B.evaluate(()=>MP.sala)),
               hostA: await A.evaluate(()=>MP.host), hostB: await B.evaluate(()=>MP.host),
               jornadaA: await A.evaluate(()=>MP.jornadaChave),
               jornadaB: await B.evaluate(()=>MP.jornadaChave) };
  out.direto = { A: await esperar(A, ()=>p2pAberto(), 15000),
                 B: await esperar(B, ()=>p2pAberto(), 15000) };

  /* --- 6. as melhorias da dupla valem na partida --- */
  await A.evaluate(()=>mpComecar());
  await A.waitForTimeout(2000);
  out.partida = await A.evaluate(()=>{
    const comDupla = ST.dmg;
    const guarda = MP.jornadaChave; MP.jornadaChave = null; calcStats();
    const semDupla = ST.dmg;
    MP.jornadaChave = guarda; calcStats();
    return { fase: S.fase, modo: S.mode,
             danoComMelhoria: +comDupla.toFixed(3), danoSem: +semDupla.toFixed(3),
             ganho: Math.round((comDupla/semDupla-1)*100)+'%' };
  });

  /* --- 7. vencer a fase adianta SÓ a jornada do Bruno --- */
  out.vitoria = await A.evaluate(()=>{
    S.fase = 1; faseVictory();
    const jb = jornadaDe('Bruno Kid', true), jc = jornadaDe('Carla', true);
    return { bruno: { fase: jb.fase, maior: jb.maior },
             carla: { fase: jc.fase, maior: jc.maior } };
  });

  await A.evaluate(()=>mpSair(true));
  await B.evaluate(()=>mpSair(true));
  out.erros = errs;
  console.log(JSON.stringify(out,null,1));
  await b.close(); fim(errs.length?1:0);
})().catch(e=>{console.error('FATAL',e.message);fim(1);});
