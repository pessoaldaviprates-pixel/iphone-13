const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const errs=[]; const out={};
  const abrir=async(nome)=>{
    const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    const p=await c.newPage();
    p.on('pageerror',e=>errs.push(nome+': '+e.message));
    await p.goto(JOGO + '?nuvem=http://127.0.0.1:8099'); await p.waitForTimeout(1200);
    return {c,p};
  };

  // JOGADOR
  const J=await abrir('jogador');
  await J.p.evaluate(()=>{ ROOT.profiles['Maverick']=defaultSave(); ROOT.current='Maverick';
    save=ROOT.profiles['Maverick']; save.__name='Maverick'; save.tag='MavPro'; save.best=31;
    calcStats(); persist(); nuvemEnviar(true); goMenu(); });
  await J.p.waitForTimeout(800);
  await J.p.evaluate(()=>pagAplicar({chave:'123.456.789-09',tipo:'CPF',nome:'Teste Do Jogo',cidade:'SAO PAULO'}));
  await J.p.tap('#btn-loja'); await J.p.waitForTimeout(800);
  out.precos = await J.p.evaluate(()=>({
    planos:[...document.querySelectorAll('.plano')].map(e=>
      e.querySelector('.plano-dias').textContent+' '+e.querySelector('.plano-preco').textContent),
    comoComprar:!!document.querySelector('.loja-como'),
    botaoAdm:!!document.getElementById('loja-adm'),
    abas:[...document.querySelectorAll('#loja-abas .aba')].map(x=>x.textContent)
  }));
  await J.p.screenshot({path:'compra-vip.png'});

  // pede o VIP de 10 dias
  await J.p.evaluate(()=>{ document.querySelectorAll('.plano')[0].querySelector('.buy-btn').click(); });
  await J.p.waitForTimeout(1200);
  out.telaPix = await J.p.evaluate(()=>({
    tela:S.screen, item:(document.getElementById('pagar-item')||{}).textContent,
    valor:(document.getElementById('pagar-valor')||{}).textContent,
    temChave:(document.getElementById('screen-pagar')||{textContent:''}).textContent.indexOf('123.•••.•••-09')>=0
  }));
  await J.p.tap('#pag-paguei');
  await J.p.waitForTimeout(2000);
  out.esperando = await J.p.evaluate(()=>({
    estado:COMPRA.estado,
    texto:(document.getElementById('pagar-corpo')||{textContent:''}).textContent.slice(0,60)
  }));
  await J.p.evaluate(()=>pagFechar());
  await J.p.waitForTimeout(800);
  out.pedido = await J.p.evaluate(()=>({
    meus:(save.pedidos||[]).map(x=>x.itemNome+' '+x.preco),
    aviso:document.getElementById('loja-aviso').textContent
  }));
  await J.p.screenshot({path:'compra-pedido.png'});

  // fala com o adm pelo botao redondo
  await J.p.tap('#loja-adm'); await J.p.waitForTimeout(1500);
  await J.p.fill('#sup-campo','Oi! Como faço o pix?');
  await J.p.tap('#sup-enviar'); await J.p.waitForTimeout(1500);
  out.mandouMsg = await J.p.evaluate(()=>({modo:S.mode, msgs:SUP.msgs.map(m=>m.de+': '+m.txt)}));
  await J.p.screenshot({path:'compra-chat.png'});

  // ADMIN
  const A=await abrir('adm');
  await A.p.evaluate(()=>{ S.mode='adm'; showScreen('adm'); });
  await A.p.waitForTimeout(500);
  await A.p.fill('#adm-nick','Cr1cket'); await A.p.fill('#adm-pass','neonadmin');
  await A.p.tap('#btn-adm-enter'); await A.p.waitForTimeout(2000);
  await A.p.evaluate(()=>admIrPara('loja')); await A.p.waitForTimeout(2200);
  out.painel = await A.p.evaluate(()=>({
    abas:[...document.querySelectorAll('.adm-aba')].map(x=>x.textContent),
    pedidos:document.querySelectorAll('#adm-loja-lista .pd-linha').length,
    conversas:document.querySelectorAll('#adm-sup-lista .sup-linha').length,
    primeiro:(document.querySelector('.pd-item')||{}).textContent,
    preco:(document.querySelector('.pd-preco')||{}).textContent
  }));
  await A.p.screenshot({path:'compra-painel.png'});

  // responde e entrega
  await A.p.evaluate(()=>{ document.querySelector('#adm-sup-lista .sup-linha').click(); });
  await A.p.waitForTimeout(1500);
  await A.p.evaluate(()=>{ const i=document.querySelector('.adm-resp input');
    i.value='Manda pro pix 11999... que eu libero!'; document.querySelector('.adm-resp .adm-btn').click(); });
  await A.p.waitForTimeout(1400);
  await A.p.evaluate(()=>{ [...document.querySelectorAll('#adm-loja-lista .adm-btn')]
    .find(b=>b.textContent==='ENTREGAR').click(); });
  await A.p.waitForTimeout(2500);
  out.entregou = await A.p.evaluate(()=>{
    const l=[...document.querySelectorAll('#adm-loja-lista .pd-linha')];
    return {linhas:l.length, feitos:l.filter(e=>e.classList.contains('feito')).length};
  });

  // jogador recebe
  await J.p.evaluate(()=>{ suporteDesligar(); goMenu(); });
  await J.p.waitForTimeout(600);
  await J.p.evaluate(()=>nuvemVerificarPresentes());
  await J.p.waitForTimeout(2000);
  out.recebeu = await J.p.evaluate(()=>({
    vip:temVip(), dias:vipDiasQueFaltam(), espacos:espacosDeReliquia(),
    caixa:document.getElementById('caixa-presente').classList.contains('on'),
    recado:recadoDoPresente
  }));
  await J.p.evaluate(()=>{ if(presenteGuardado) abrirCaixaPresente(); });
  await J.p.waitForTimeout(900);
  await J.p.screenshot({path:'compra-recebeu.png'});
  // e a resposta chegou no chat dele
  await J.p.evaluate(()=>suporteAbrir()); await J.p.waitForTimeout(1800);
  out.respostaChegou = await J.p.evaluate(()=>SUP.msgs.map(m=>m.de+': '+m.txt));

  out.errs=errs;
  console.log(JSON.stringify(out,null,1));
  await b.close();
})().catch(async e=>{
  console.log('FATAL '+e.message.split('\n')[0]);process.exit(1)});
