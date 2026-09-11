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
  await pg.waitForTimeout(500);
}
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',
    args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
  const errs=[],out={};
  const mk=()=>b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const c1=await mk(); const p1=await c1.newPage();
  p1.on('pageerror',e=>errs.push('P1: '+e.message));
  await novo(p1,'Alvo',[0,1,2,5]);

  /* ---- 1. transmissao fora do menu ---- */
  out.semBotaoTransmissao = await p1.evaluate(()=>!document.getElementById('btn-transmitir'));
  out.chipsDoMenu = await p1.evaluate(()=>[...document.querySelectorAll('.menu-chips .chip')].map(e=>e.textContent.trim()));

  /* ---- 2. tela travada ---- */
  out.tela = await p1.evaluate(()=>{
    const b2=getComputedStyle(document.body);
    return { pos:b2.position, overflow:b2.overflow, touch:b2.touchAction,
             scrollTop:document.scrollingElement.scrollTop };
  });
  await p1.evaluate(()=>startGame(3)); await p1.waitForTimeout(1200);
  // tenta arrastar a pagina durante a partida
  await p1.touchscreen.tap(195,400);
  await p1.evaluate(()=>{ window.scrollTo(0,300); });
  await p1.waitForTimeout(300);
  out.naoArrastou = await p1.evaluate(()=>document.scrollingElement.scrollTop === 0 && window.scrollY === 0);
  await p1.evaluate(()=>goMenu()); await p1.waitForTimeout(400);

  /* ---- 3. cooperativo escondido ---- */
  // o botao do menu virou a aba AMIGOS: a tela do cooperativo abre por dentro
  await p1.evaluate(()=>abrirMulti('coop')); await p1.waitForTimeout(600);
  out.coop = {
    ligado: await p1.evaluate(()=>COOP_LIGADO),
    abaVisivel: await p1.evaluate(()=>getComputedStyle(document.getElementById('aba-coop')).display),
    abaAberta: await p1.evaluate(()=>document.querySelector('#multi-abas .aba.on').dataset.modo),
    codigoAindaExiste: await p1.evaluate(()=>typeof mpCriarSala === 'function' && typeof mpSincronizarCoop === 'function')
  };
  await p1.screenshot({path:'v30-multi.png'});
  await p1.evaluate(()=>goMenu()); await p1.waitForTimeout(400);

  /* ---- 4. tabelas da arena ---- */
  await p1.evaluate(()=>{ save.arenaOnda=42; save.arenaMortos=1380; save.arenaChefes=7;
    save.best=50; persist(); nuvemEnviar(true); });
  await p1.waitForTimeout(1200);
  const c2=await mk(); const p2=await c2.newPage();
  p2.on('pageerror',e=>errs.push('P2: '+e.message));
  await novo(p2,'Outro',[0,3,6,7]);
  await p2.evaluate(()=>{ save.arenaOnda=61; save.arenaMortos=520; save.arenaChefes=12;
    save.best=30; persist(); nuvemEnviar(true); });
  await p2.waitForTimeout(1200);
  await p1.click('#btn-rank'); await p1.waitForTimeout(1800);
  out.abasDaTabela = await p1.evaluate(()=>[...document.querySelectorAll('#rank-abas .aba')].map(e=>e.textContent));
  for (const a of ['arena','abates']) {
    await p1.evaluate(x=>{ abaRanking=x; renderRanking(false); }, a);
    await p1.waitForTimeout(500);
    out['tabela_'+a] = await p1.evaluate(()=>[...document.querySelectorAll('#rank-list .rank-row')]
      .map(r=>r.querySelector('.rank-nome').textContent.replace(' (você)','') + ' → ' +
              r.querySelector('.rank-fase').textContent));
  }
  await p1.screenshot({path:'v30-tabela.png'});

  /* ---- 5. inventario: tirar na hora ---- */
  await p1.evaluate(()=>{ save.ships=[0,1,2,3,4]; save.amulets=[{uid:1,type:'vida',rar:2},{uid:2,type:'dano',rar:3}];
    save.skills={atk10:1,atk20:1}; save.upgrades.dmg=12; save.crystals=50000;
    persist(); contaEnviar(true); nuvemEnviar(true); });
  await p1.waitForTimeout(1500);
  const c3=await mk(); const adm=await c3.newPage();
  adm.on('pageerror',e=>errs.push('ADM: '+e.message));
  await adm.goto(URL); await adm.waitForTimeout(800);
  await adm.click('#btn-goto-adm'); await adm.waitForTimeout(300);
  await adm.fill('#adm-nick','Cr1cket'); await adm.fill('#adm-pass','neonadmin'); await adm.click('#btn-adm-enter'); await adm.waitForTimeout(2000); await adm.evaluate(()=>admIrPara('acoes','inv')); await adm.waitForTimeout(500);
  await adm.evaluate(()=>admNuvemSelecionar(admNuvemLista.find(x=>x.nome==='Alvo')));
  await adm.waitForTimeout(400);
  await adm.evaluate(()=>{try{admIrPara('acoes','inv')}catch(e){}}); await adm.waitForTimeout(300);
  await adm.click('#inv-abrir'); await adm.waitForTimeout(1500);
  out.invAntes = await adm.evaluate(()=>({naves:(invConta.save.ships||[]).length,
    amuletos:(invConta.save.amulets||[]).length, cris:invConta.save.crystals}));
  out.botaoTirar = await adm.evaluate(()=>{
    const bs=[...document.querySelectorAll('#inv-box .adm-btn')].map(e=>e.textContent.trim());
    return bs; });
  // marca duas naves e clica TIRAR AGORA
  await adm.evaluate(()=>{ invAba='naves'; invRender(); invMarcado.naves[3]=1; invMarcado.naves[4]=1; invRender(); });
  await adm.waitForTimeout(300);
  out.botaoComMarcados = await adm.evaluate(()=>
    [...document.querySelectorAll('#inv-box .adm-btn')].map(e=>e.textContent.trim())[0]);
  await adm.evaluate(()=>invTirarAgora()); await adm.waitForTimeout(2500);
  out.invDepois = await adm.evaluate(()=>({naves:(invConta.save.ships||[]).length,
    listaNaves:(invConta.save.ships||[]).slice()}));
  out.telaAtualizou = await adm.evaluate(()=>document.querySelectorAll('#inv-box .inv-item').length);
  await adm.screenshot({path:'v30-inv.png'});
  // e o jogador tambem perde
  await p1.evaluate(()=>nuvemVerificarPresentes()); await p1.waitForTimeout(1500);
  out.jogadorPerdeu = await p1.evaluate(()=>save.ships.slice());

  console.log(JSON.stringify({out,errs},null,1));
  await b.close(); fim(errs.length?1:0);
})().catch(e=>{console.error('FATAL',String(e).split('\n').slice(0,3).join(' | '));fim(2);});
