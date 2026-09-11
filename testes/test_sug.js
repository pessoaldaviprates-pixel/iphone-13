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
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const errs=[],out={};
  const mk=()=>b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const c1=await mk(); const p=await c1.newPage();
  p.on('pageerror',e=>errs.push('P: '+e.message));
  await novo(p,'Davi',[0,1,2,5]);

  /* --- 1. ranqueada e criar nave sumiram --- */
  out.desligados = await p.evaluate(()=>({
    ranked: getComputedStyle(document.getElementById('btn-ranked')).display,
    rankedFlag: RANKED_LIGADO, criarFlag: CRIAR_NAVE_LIGADO,
    codigoGuardado: typeof abrirRanked==='function' && typeof abrirConstrutor==='function'
  }));
  await p.evaluate(()=>{ S.mode='hangar'; renderHangar(); showScreen('hangar'); });
  await p.waitForTimeout(500);
  out.desligados.botaoCriarNave = await p.evaluate(()=>
    getComputedStyle(document.querySelector('.hangar-topo')).display);
  await p.evaluate(()=>goMenu()); await p.waitForTimeout(300);
  await p.screenshot({path:'v35-menu.png'});

  /* --- 2. caixa de sugestao na vitoria --- */
  await p.evaluate(()=>{ startGame(8); }); await p.waitForTimeout(900);
  await p.evaluate(()=>{ S.waveIdx=S.nWaves; enemies.length=0; boss=null; faseVictory(); });
  await p.waitForTimeout(900);
  out.vitoria = await p.evaluate(()=>({
    modo: S.mode,
    botoes: [...document.querySelectorAll('#screen-victory button')].map(e=>e.textContent.trim())
  }));
  await p.screenshot({path:'v35-vitoria.png'});
  await p.click('#btn-vic-sug'); await p.waitForTimeout(700);
  out.caixaAberta = await p.evaluate(()=>({
    aberta: document.getElementById('sugestao-box').classList.contains('on'),
    tipos: document.querySelectorAll('#sg-tipos .sg-tipo').length
  }));
  await p.fill('#sg-texto','Queria uma nave que solta escudo pros amigos e uma fase no espaço com meteoro');
  await p.evaluate(()=>{ [...document.querySelectorAll('.sg-tipo')].find(e=>e.textContent.includes('NAVE')).click(); });
  await p.waitForTimeout(300);
  await p.screenshot({path:'v35-sugestao.png'});
  await p.click('#sg-enviar'); await p.waitForTimeout(1800);
  out.enviou = await p.evaluate(()=>({
    aviso: document.getElementById('sg-aviso').textContent,
    fechou: !document.getElementById('sugestao-box').classList.contains('on'),
    minhas: (save.sugestoes||[]).length
  }));
  out.naNuvem = await p.evaluate(async()=>{
    const d = await nuvemReq('sugestoes');
    if (!d) return null;
    const k = Object.keys(d)[0];
    return { quantas: Object.keys(d).length, nome: d[k].nome, tipo: d[k].tipo,
             fase: d[k].fase, versao: d[k].versao, texto: d[k].texto.slice(0,40) };
  });
  // segunda sugestao pela tela de derrota
  await p.evaluate(()=>{ startGame(12); }); await p.waitForTimeout(700);
  await p.evaluate(()=>{ player.lives=0; player.revivesUsed=99; gameOver(); });
  await p.waitForTimeout(700);
  out.derrotaTemBotao = await p.evaluate(()=>
    [...document.querySelectorAll('#screen-over button')].some(e=>e.textContent.includes('SUGESTÃO')));
  await p.click('#btn-go-sug'); await p.waitForTimeout(500);
  await p.fill('#sg-texto','O chefe da fase 12 tá muito difícil, quase impossível');
  await p.evaluate(()=>{ [...document.querySelectorAll('.sg-tipo')].find(e=>e.textContent.includes('DIFICULDADE')).click(); });
  await p.click('#sg-enviar'); await p.waitForTimeout(1800);

  /* --- 3. painel le tudo --- */
  const c2=await mk(); const adm=await c2.newPage();
  adm.on('pageerror',e=>errs.push('ADM: '+e.message));
  await adm.goto(URL); await adm.waitForTimeout(800);
  await adm.click('#btn-goto-adm'); await adm.waitForTimeout(300);
  await adm.fill('#adm-nick','Cr1cket'); await adm.fill('#adm-pass','neonadmin'); await adm.click('#btn-adm-enter'); await adm.waitForTimeout(2500); await adm.evaluate(()=>admIrPara('sugestoes')); await adm.waitForTimeout(500);
  out.painel = await adm.evaluate(()=>({
    itens: document.querySelectorAll('#sug-lista .sug-item').length,
    novas: document.querySelectorAll('#sug-lista .sug-item.nova').length,
    cont: document.getElementById('sug-cont').textContent,
    copia: sugTextoParaCopiar().slice(0,120)
  }));
  await adm.evaluate(()=>document.getElementById('adm-sug').scrollIntoView({block:'start'}));
  await adm.waitForTimeout(400);
  await adm.screenshot({path:'v35-painel-sug.png'});
  await adm.click('#sug-marcar'); await adm.waitForTimeout(1200);
  out.marcadas = await adm.evaluate(()=>document.querySelectorAll('#sug-lista .sug-item.nova').length);
  out.regrasTemSugestoes = await adm.evaluate(()=>admRegrasJSON().includes('sugestoes'));

  console.log(JSON.stringify({out,errs},null,1));
  await b.close(); fim(errs.length?1:0);
})().catch(e=>{console.error('FATAL',String(e).split('\n').slice(0,3).join(' | '));fim(2);});
