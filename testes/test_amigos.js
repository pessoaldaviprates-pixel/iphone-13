const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
const fs=require('fs');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const errs=[]; const out={};
  const novo=async(nome)=>{
    const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    const p=await c.newPage();
    p.on('pageerror',e=>errs.push(nome+': '+e.message));
    await p.goto(JOGO + '?nuvem=http://127.0.0.1:8099'); await p.waitForTimeout(1100);
    await p.evaluate((n)=>{ ROOT.profiles[n]=defaultSave(); ROOT.current=n; save=ROOT.profiles[n];
      save.__name=n; save.best=30; save.crystals=5000; calcStats(); persist();
      nuvemEnviar(true); goMenu(); }, nome);
    await p.waitForTimeout(900);
    return {c,p};
  };
  const A=await novo('Davi');
  const B=await novo('Maverick');

  // 1. Davi chama o Maverick
  await A.p.tap('#btn-amigos'); await A.p.waitForTimeout(700);
  out.abaAberta = await A.p.evaluate(()=>({modo:S.mode, abas:[...document.querySelectorAll('#am-abas .aba')].map(x=>x.textContent)}));
  await A.p.evaluate(()=>{ amAba='achar'; amigosRender(); }); await A.p.waitForTimeout(300);
  await A.p.fill('#am-nick','Maverick');
  await A.p.tap('#am-chamar'); await A.p.waitForTimeout(1500);
  out.pedidoEnviado = await A.p.evaluate(()=>document.getElementById('am-aviso').textContent);

  // 2. Maverick recebe e aceita
  await B.p.evaluate(()=>amigosCarregar()); await B.p.waitForTimeout(1200);
  await B.p.tap('#btn-amigos'); await B.p.waitForTimeout(600);
  await B.p.evaluate(()=>{ amAba='pedidos'; amigosRender(); }); await B.p.waitForTimeout(400);
  out.pedidoRecebido = await B.p.evaluate(()=>({
    pedidos:Object.keys(AM.pedidos).length,
    texto:(document.querySelector('#am-corpo .am-nome')||{}).textContent
  }));
  await B.p.evaluate(()=>{ const id=Object.keys(AM.pedidos)[0]; amigoAceitar(id); });
  await B.p.waitForTimeout(1400);
  out.aceitou = await B.p.evaluate(()=>Object.keys(AM.lista).length);
  await A.p.evaluate(()=>amigosCarregar()); await A.p.waitForTimeout(1200);
  out.davAmigos = await A.p.evaluate(()=>Object.keys(AM.lista).length);
  await B.p.screenshot({path:'am-lista.png'});

  // 3. conversa nos dois sentidos
  await A.p.evaluate(()=>{ amAba='lista'; amigosRender(); }); await A.p.waitForTimeout(400);
  await A.p.evaluate(()=>{ const id=Object.keys(AM.lista)[0]; abrirChat(id); });
  await A.p.waitForTimeout(1500);
  await A.p.fill('#chat-campo','Oi mãe, bora jogar?');
  await A.p.tap('#chat-enviar'); await A.p.waitForTimeout(1500);
  await B.p.evaluate(()=>{ const id=Object.keys(AM.lista)[0]; abrirChat(id); });
  await B.p.waitForTimeout(2000);
  out.mavRecebeu = await B.p.evaluate(()=>AM.mensagens.map(m=>m.nome+': '+m.txt));
  await B.p.fill('#chat-campo','Bora! Estou na fase 30');
  await B.p.tap('#chat-enviar'); await B.p.waitForTimeout(2200);
  out.daviRecebeu = await A.p.evaluate(()=>AM.mensagens.map(m=>m.nome+': '+m.txt));
  await A.p.screenshot({path:'am-chat.png'});

  // 4. gametag: troca e trava por um dia
  await A.p.evaluate(()=>{ S.mode='amigos'; amAba='tag'; amigosRender(); showScreen('amigos'); });
  await A.p.waitForTimeout(400);
  await A.p.fill('#tag-campo','Cr1cket');
  await A.p.tap('#tag-salvar'); await A.p.waitForTimeout(1400);
  out.tag = await A.p.evaluate(()=>({tag:save.tag, quando:save.tagQuando>0, pode:podeTrocarTag()}));
  await A.p.evaluate(()=>{ amAba='tag'; amigosRender(); }); await A.p.waitForTimeout(400);
  out.tagTravada = await A.p.evaluate(()=>({
    botao:document.getElementById('tag-salvar').textContent.slice(0,20),
    desativado:document.getElementById('tag-salvar').disabled
  }));
  await A.p.screenshot({path:'am-tag.png'});
  // o amigo ve a tag nova
  await B.p.evaluate(()=>amigosCarregar()); await B.p.waitForTimeout(1200);
  out.amigoVeATag = await B.p.evaluate(()=>Object.values(AM.lista).map(a=>a.tag));

  out.errs=errs;
  console.log(JSON.stringify(out,null,1));
  await b.close();
  console.log('FATAL '+e.message.split('\n')[0]);process.exit(1)});
