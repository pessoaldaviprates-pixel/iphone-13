const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
setTimeout(()=>{console.error('TEMPO ESGOTADO');process.exit(3);}, 180000).unref&&0;
const fs = require('fs');
const URL=JOGO + '?nuvem=http://127.0.0.1:8099';
const fim=c=>{process.exit(c);};
async function novo(pg,nome,pad){
  await pg.goto(URL); await pg.waitForTimeout(900);
  await pg.fill('#new-name',nome); await pg.click('#btn-new'); await pg.waitForTimeout(300);
  for(let i=0;i<2;i++){await pg.evaluate(p=>{senhaEstado.seq=p.slice();senhaEstado.desenhando=true;senhaSoltar();},pad);await pg.waitForTimeout(280);}
  await pg.waitForTimeout(600);
  await pg.evaluate(()=>nuvemEnviar(true));
  await pg.waitForTimeout(800);
}
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

  /* com os galhos novos BLOQUEADOS (regras antigas), o pedido tem de funcionar */
  console.error('P1 pilotos criados');
  out.pedido = await A.evaluate(async()=>{
    const r = await amigoPedir('bruno');
    return { ok: r.ok, msg: r.msg, compat: NUVEM_COMPAT };
  });
  await B.evaluate(()=>amigosCarregar());
  await B.waitForTimeout(1000);
  console.error('P2 pedido feito');
  out.chegouPedido = await B.evaluate(()=>({
    pedidos: Object.keys(AM.pedidos).length,
    de: Object.values(AM.pedidos).map(x=>x.nome),
    compat: NUVEM_COMPAT
  }));
  out.aceitou = await B.evaluate(async()=>{
    const ids = Object.keys(AM.pedidos);
    if (!ids.length) return { ok:false };
    await amigoAceitar(ids[0]);
    return { ok:true, amigos: Object.keys(AM.lista).length };
  });
  await A.evaluate(()=>amigosCarregar());
  await A.waitForTimeout(1000);
  out.amigosDeA = await A.evaluate(()=>({ n: Object.keys(AM.lista).length,
                                          nomes: Object.values(AM.lista).map(x=>x.nome) }));

  /* chat entre amigos */
  console.error('P3 amizade ok');
  out.chat = await A.evaluate(async()=>{
    const id = Object.keys(AM.lista)[0];
    if (!id) return { ok:false, motivo:'sem amigo' };
    await conversaAbrir(id);
    const ok = await conversaEnviar('oi bruno, testando');
    return { ok, mensagens: AM.mensagens.length };
  });
  await B.waitForTimeout(800);
  out.chatChegou = await B.evaluate(async()=>{
    const id = Object.keys(AM.lista)[0];
    if (!id) return { ok:false };
    await conversaAbrir(id);
    await new Promise(r=>setTimeout(r,900));
    return { mensagens: AM.mensagens.length,
             texto: AM.mensagens.length ? AM.mensagens[AM.mensagens.length-1].txt : null };
  });

  /* chat com o desenvolvedor */
  console.error('P4 chat ok');
  await A.evaluate(()=>{ suporteAbrir(); });   // sem await: o fluxo fica aberto
  await A.waitForTimeout(1200);
  console.error('P4b suporte aberto');
  out.suporte = await A.evaluate(async()=>{
    const ok = await suporteEnviar('preciso de ajuda com a loja');
    return { enviou: ok, mensagens: SUP.msgs.length,
             texto: SUP.msgs.length ? SUP.msgs[SUP.msgs.length-1].txt : null };
  });
  /* a mensagem ficou guardada onde as regras antigas deixam */
  console.error('P5 suporte ok');
  out.ondeFicou = await A.evaluate(async()=>{
    const eu = meuIdNuvem();
    const p = await nuvemReq("pilotos/" + eu);
    return { temSup: !!(p && p._sup && p._sup.msgs),
             temAm: !!(p && p._am),
             compat: NUVEM_COMPAT };
  });
  out.erros = errs;
  console.log(JSON.stringify(out,null,1));
  await b.close(); fim(errs.length?1:0);
})().catch(e=>{console.error('FATAL',e.message);fim(1);});
