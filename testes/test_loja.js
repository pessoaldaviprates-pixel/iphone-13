const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const p=await c.newPage(); const errs=[];
  p.on('pageerror',e=>errs.push(e.message));
  await p.goto(JOGO + ''); await p.waitForTimeout(1200);
  await p.evaluate(()=>{ ROOT.profiles['T']=defaultSave(); ROOT.current='T'; save=ROOT.profiles['T'];
    save.__name='T'; save.best=60; save.crystals=3e6; save.hi=40000; calcStats(); goMenu(); });
  const out={};

  /* 1. A REGRA MAIS IMPORTANTE: nenhuma nave da loja passa da Omega */
  out.tetoRespeitado = await p.evaluate(()=>{
    const o=SHIPS[OMEGA];
    return {falhas:conferirTeto(),
      omega:{dano:o.baseDmg,casco:o.baseHp,agil:o.baseAgi},
      loja:SHIPS.slice(NAVES_LOJA_DE,NAVES_LOJA_ATE).map(n=>
        n.name+': dano '+n.baseDmg.toFixed(2)+' casco '+n.baseHp+' agil '+n.baseAgi.toFixed(2))};
  });

  await p.tap('[data-porta="loja"]'); await p.waitForTimeout(800);
  out.abriu = await p.evaluate(()=>({modo:S.mode,
    abas:[...document.querySelectorAll('#loja-abas .aba')].map(x=>x.textContent)}));

  /* 2. tudo em dinheiro de verdade, nada em cristais */
  out.precos = await p.evaluate(()=>{
    const r={};
    r.vip=[...document.querySelectorAll('.plano')].map(e=>
      e.querySelector('.plano-dias').textContent+' = '+e.querySelector('.plano-preco').textContent);
    lojaAba='passes'; renderLoja();
    r.passes=[...document.querySelectorAll('#loja-corpo .buy-btn')].map(e=>e.textContent).slice(0,4);
    lojaAba='naves'; renderLoja();
    r.naves=[...document.querySelectorAll('#loja-corpo .buy-btn')].map(e=>e.textContent);
    return r;
  });

  /* 3. nenhum preço em cristais sobrou nas abas de compra */
  out.semCristais = await p.evaluate(()=>{
    const achou=[];
    for (const a of ['vip','passes','naves']) {
      lojaAba=a; renderLoja();
      const t=document.getElementById('loja-corpo').textContent;
      if (/◆\s*\d/.test(t)) achou.push(a);
    }
    return {abasComCristal:achou};
  });

  /* 4. o botao redondo de chamar o adm existe e abre a conversa */
  out.botaoAdm = await p.evaluate(()=>{
    const bt=document.getElementById('loja-adm');
    const q=bt.getBoundingClientRect();
    return {existe:!!bt, redondo:getComputedStyle(bt).borderRadius,
            noCanto: q.right>window.innerWidth-90 && q.bottom>window.innerHeight-110};
  });
  await p.tap('#loja-adm'); await p.waitForTimeout(900);
  out.conversaAbriu = await p.evaluate(()=>S.mode);
  await p.tap('#sup-voltar'); await p.waitForTimeout(600);

  /* 5. trocas continuam em cristais (nao e compra) */
  out.trocas = await p.evaluate(()=>{
    lojaAba='trocas'; renderLoja();
    return {cartoes:document.querySelectorAll('#loja-corpo .loja-card').length,
            temCristal:/◆/.test(document.getElementById('loja-corpo').textContent)};
  });

  /* 6. VIP entregue pela caixa de presente funciona de ponta a ponta */
  out.vipPeloPresente = await p.evaluate(()=>{
    const antes={vip:temVip(), espacos:espacosDeReliquia(), bau:precoDoBau()};
    aplicarPresente(save, {compra:{vipDias:10, passes:['ima','escudo'], naves:[NAVES_LOJA_DE]}});
    calcStats();
    return {antes, depois:{vip:temVip(), dias:vipDiasQueFaltam(),
            espacos:espacosDeReliquia(), bau:precoDoBau(),
            passes:Object.keys(save.passes||{}), ima:ST.magnetR>9000, escudo:ST.startShield,
            nave:SHIPS[save.ship].name}};
  });

  /* 7. jogar com a nave comprada */
  out.jogando = await p.evaluate(async()=>{
    goMenu(); calcStats(); startGame(40);
    await new Promise(r=>setTimeout(r,1400));
    return {modo:S.mode, vivo:player.alive, nave:SHIPS[save.ship].name, dano:+ST.dmg.toFixed(2)};
  });

  out.errs=errs;
  console.log(JSON.stringify(out,null,1));
  await b.close();
})().catch(e=>{console.log('FATAL '+e.message.split('\n')[0]);process.exit(1)});
