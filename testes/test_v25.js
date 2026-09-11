const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
const fs = require('fs');
const URL=JOGO + '?nuvem=http://127.0.0.1:8099';
const fim=c=>{process.exit(c);};
async function novo(pg,nome,pad){
  await pg.goto(URL); await pg.waitForTimeout(800);
  await pg.fill('#new-name',nome); await pg.click('#btn-new'); await pg.waitForTimeout(300);
  for(let i=0;i<2;i++){await pg.evaluate(p=>{senhaEstado.seq=p.slice();senhaEstado.desenhando=true;senhaSoltar();},pad);await pg.waitForTimeout(280);}
  await pg.waitForTimeout(400);
}
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',
    args:['--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']});
  const errs=[],out={};
  const mk=()=>b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const c1=await mk(),c2=await mk();
  const p1=await c1.newPage(),p2=await c2.newPage();
  p1.on('pageerror',e=>errs.push('P1: '+e.message)); p2.on('pageerror',e=>errs.push('P2: '+e.message));
  await novo(p1,'Alfa',[0,1,2,5]); await novo(p2,'Beta',[0,3,6,7]);

  /* ---- 1. ARENA: os dois entram, mesmas ondas, contadores somam ---- */
  await p1.tap('#btn-arena'); await p1.waitForTimeout(900);
  out.arenaTela = await p1.evaluate(()=>({modo:S.mode, onda:ARENA.onda}));
  await p1.tap('#arena-entrar'); await p1.waitForTimeout(1600);
  await p2.tap('#btn-arena'); await p2.waitForTimeout(700);
  await p2.tap('#arena-entrar'); await p2.waitForTimeout(1800);
  out.arenaJogando = {
    p1: await p1.evaluate(()=>({modo:S.mode,fase:S.fase,mp:MP.modo,inimigos:enemies.length})),
    p2: await p2.evaluate(()=>({modo:S.mode,fase:S.fase,mp:MP.modo,inimigos:enemies.length}))
  };
  // os inimigos tem que ser IGUAIS nos dois
  const cap = pg => pg.evaluate(()=>enemies.slice(0,5).map(e=>e.type+':'+Math.round(e.x)));
  const a1=await cap(p1), a2=await cap(p2);
  out.inimigosIguais = { iguais: JSON.stringify(a1)===JSON.stringify(a2), amostra:a1 };
  // se veem
  await p1.waitForTimeout(1200);
  out.seVeem = { p1: await p1.evaluate(()=>Object.keys(MP.outros).length),
                 p2: await p2.evaluate(()=>Object.keys(MP.outros).length) };
  // abates somam no total global
  await p1.evaluate(()=>{ for(let i=0;i<7;i++) arenaContar(false); arenaSalvarPlacar(true); });
  await p2.evaluate(()=>{ for(let i=0;i<3;i++) arenaContar(false); arenaContar(true); arenaSalvarPlacar(true); });
  await p1.waitForTimeout(1600);
  out.totais = await p1.evaluate(()=>ARENA.totais);
  // avanca a onda: o outro tem que ir junto
  await p1.evaluate(()=>{ arenaProximaOnda(); });
  await p1.waitForTimeout(1500);
  out.ondaSincronizada = { p1: await p1.evaluate(()=>S.fase), p2: await p2.evaluate(()=>S.fase),
                           nuvem: await p1.evaluate(()=>ARENA.onda) };
  await p1.screenshot({path:'v25-arena.png'});
  // sair e voltar: continua de onde parou
  await p1.evaluate(()=>goMenu()); await p1.waitForTimeout(700);
  await p1.tap('#btn-arena'); await p1.waitForTimeout(1200);
  out.arenaSalva = await p1.evaluate(()=>ARENA.onda);
  await p1.screenshot({path:'v25-arena-tela.png'});
  await p2.evaluate(()=>goMenu()); await p2.waitForTimeout(500);
  await p1.evaluate(()=>goMenu()); await p1.waitForTimeout(500);

  /* ---- 2. RANQUEADA: desligada nesta versao (RANKED_LIGADO=false) ---- */
  out.rankedDesligada = await p1.evaluate(()=>({ flag: RANKED_LIGADO,
    escondida: getComputedStyle(document.getElementById('btn-ranked')).display,
    codigoGuardado: typeof abrirRanked==='function' && typeof rkProcurar==='function' }));
  await p1.evaluate(()=>goMenu()); await p2.evaluate(()=>goMenu());
  await p1.waitForTimeout(500);

  /* ---- 3. VER A TELA ---- */
  await p2.evaluate(()=>{ if(S.mode!=='playing') startGame(3); });
  await p2.waitForTimeout(1500);
  out.cenaNaNuvem = await p1.evaluate(async()=>{
    const c = await nuvemReq('cenas');
    const k = c?Object.keys(c):[];
    return { quantos:k.length, tamanho: k.length? String(c[k[0]].q).length : 0 };
  });
  await p1.evaluate(async()=>{
    const lista = await nuvemListar();
    const alvo = lista.find(x=>x.nome==='Beta');
    if (alvo) assistirJogador(alvo);
  });
  await p1.waitForTimeout(2000);
  out.assistindo = await p1.evaluate(()=>({
    aberto: document.getElementById('assistir').classList.contains('on'),
    temCena: !!AS.cena,
    inimigos: AS.cena?AS.cena.inimigos.length:0,
    hud: document.getElementById('as-hud').textContent.slice(0,60)
  }));
  await p1.screenshot({path:'v25-assistir.png'});
  await p1.evaluate(()=>fecharAssistir());

  /* ---- 4. PAINEL AO VIVO ---- */
  const c3=await mk(); const adm=await c3.newPage();
  adm.on('pageerror',e=>errs.push('ADM: '+e.message));
  await adm.goto(URL); await adm.waitForTimeout(800);
  await adm.tap('#btn-goto-adm'); await adm.waitForTimeout(300);
  await adm.fill('#adm-nick','Cr1cket'); await adm.fill('#adm-pass','neonadmin'); await adm.tap('#btn-adm-enter'); await adm.waitForTimeout(2200);
  out.aoVivo = await adm.evaluate(()=>({
    linhas: document.querySelectorAll('#vivo-lista .vivo-row').length,
    cont: document.getElementById('vivo-cont').textContent,
    primeiro: (document.querySelector('#vivo-lista .vivo-row')||{textContent:''}).textContent.replace(/\s+/g,' ').slice(0,110)
  }));
  await adm.evaluate(()=>document.getElementById('adm-vivo').scrollIntoView({block:'start'}));
  await adm.waitForTimeout(400);
  await adm.screenshot({path:'v25-aovivo.png'});

  /* ---- 5. PC: teclas e mouse ---- */
  const c4 = await b.newContext({viewport:{width:1280,height:800}});
  const pc = await c4.newPage();
  pc.on('pageerror',e=>errs.push('PC: '+e.message));
  await novo(pc,'Piloto',[0,1,2,5]);
  out.modoPC = await pc.evaluate(()=>modoPC);
  await pc.evaluate(()=>{ save.ships=[MAVERICK]; save.ship=MAVERICK; persist(); calcStats(); startGame(1); });
  await pc.waitForTimeout(900);
  await pc.mouse.move(400,300); await pc.waitForTimeout(500);
  out.seguiuMouse = await pc.evaluate(()=>({tx:Math.round(player.tx), ty:Math.round(player.ty)}));
  out.teclasNaTela = await pc.evaluate(()=>[...document.querySelectorAll('.hab-tecla')].map(e=>e.textContent));
  const cdAntes = await pc.evaluate(()=>JSON.stringify(habCd));
  await pc.keyboard.press('q'); await pc.waitForTimeout(300);
  out.teclaQFuncionou = (await pc.evaluate(()=>JSON.stringify(habCd))) !== cdAntes;
  out.dicaPC = await pc.evaluate(()=>getComputedStyle(document.getElementById('pc-dica')).display);
  await pc.screenshot({path:'v25-pc.png'});

  console.log(JSON.stringify({out,errs},null,1));
  await b.close(); fim(errs.length?1:0);
})().catch(e=>{console.error('FATAL',String(e).split('\n').slice(0,3).join(' | '));fim(2);});
