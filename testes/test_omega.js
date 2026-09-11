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
  const c1=await mk(); const p1=await c1.newPage();
  p1.on('pageerror',e=>errs.push('P1: '+e.message));
  await novo(p1,'Cr1cket',[0,1,2,5]);
  await p1.evaluate(()=>{ save.crystals=99999; persist(); nuvemEnviar(true); contaEnviar(true); });
  await p1.waitForTimeout(1200);

  out.nave = await p1.evaluate(()=>({
    indice: OMEGA, total: SHIPS.length, base: NAVES_BASE,
    nome: SHIPS[OMEGA].name, exclusiva: naveExclusiva(OMEGA), suprema: naveSuprema(OMEGA),
    dano: SHIPS[OMEGA].baseDmg, vida: SHIPS[OMEGA].baseHp,
    habilidades: HABILIDADES[OMEGA].length,
    ultimate: ULTS[SHIPS[OMEGA].ultId].name,
    naoDaParaComprar: !shipOwned(OMEGA)
  }));
  out.todosOsEfeitosExistem = await p1.evaluate(()=>
    HABILIDADES[OMEGA].filter(h=>!h.combo).every(h=>typeof EFEITOS[h.id]==='function'));

  /* --- só o administrador entrega --- */
  const c2=await mk(); const adm=await c2.newPage();
  adm.on('pageerror',e=>errs.push('ADM: '+e.message));
  await adm.goto(URL); await adm.waitForTimeout(800);
  await adm.click('#btn-goto-adm'); await adm.waitForTimeout(300);
  await adm.fill('#adm-nick','Cr1cket'); await adm.fill('#adm-pass','neonadmin'); await adm.click('#btn-adm-enter'); await adm.waitForTimeout(2000); await adm.evaluate(()=>admIrPara('acoes','dar')); await adm.waitForTimeout(500);
  await adm.evaluate(()=>admNuvemSelecionar(admNuvemLista.find(x=>x.nome==='Cr1cket')));
  await adm.waitForTimeout(400);
  await adm.evaluate(()=>{try{admIrPara('acoes','dar')}catch(e){}}); await adm.waitForTimeout(300);
  await adm.click('#adm-nuvem-omega'); await adm.waitForTimeout(400);
  out.caixaAdm = await adm.evaluate(()=>JSON.parse(JSON.stringify(caixaAdm)));
  await adm.evaluate(()=>{try{admIrPara('acoes','caixa')}catch(e){}}); await adm.waitForTimeout(300);
  await adm.click('#caixa-enviar'); await adm.waitForTimeout(1500);
  await p1.evaluate(()=>nuvemVerificarPresentes()); await p1.waitForTimeout(1500);
  out.recebeu = await p1.evaluate(()=>({ tem: save.ships.includes(OMEGA), usando: save.ship===OMEGA }));

  /* --- as habilidades funcionam --- */
  await p1.evaluate(()=>{ save.ship=OMEGA; persist(); calcStats(); startGame(60); });
  await p1.waitForTimeout(1500);
  out.habNaTela = await p1.evaluate(()=>document.querySelectorAll('#hab-bar .hab-btn').length);

  // ogiva nuclear: acaba com a onda
  out.nuclear = await p1.evaluate(async()=>{
    enemies.length=0; for(let i=0;i<25;i++) spawnEnemy("drone");
    const antes = enemies.length;
    habCd={}; usarHabilidade(HABILIDADES[OMEGA][0]);
    await new Promise(r=>setTimeout(r,120));
    return { antes, depois: enemies.length, recarga: HABILIDADES[OMEGA][0].cd };
  });
  // tropas
  out.tropas = await p1.evaluate(async()=>{
    aliados.length=0;
    habCd={}; usarHabilidade(HABILIDADES[OMEGA].find(h=>h.id==='tanques'));
    habCd={}; usarHabilidade(HABILIDADES[OMEGA].find(h=>h.id==='fuzileiros'));
    habCd={}; usarHabilidade(HABILIDADES[OMEGA].find(h=>h.id==='helicoptero'));
    habCd={}; usarHabilidade(HABILIDADES[OMEGA].find(h=>h.id==='esquadrao'));
    await new Promise(r=>setTimeout(r,100));
    const conta = t=>aliados.filter(a=>a.tipo===t).length;
    return { tanques:conta('tanque'), soldados:conta('soldado'),
             helis:conta('heli'), avioes:conta('aviao'), total:aliados.length };
  });
  // as tropas atiram sozinhas e matam
  out.tropasAtiram = await p1.evaluate(async()=>{
    enemies.length=0; bullets.length=0;
    for(let i=0;i<10;i++){ const e=spawnEnemy("drone"); e.x=W/2; e.y=H*0.4; e.hp=1; }
    const antes = enemies.length;
    for (let k=0;k<90;k++) update(0.016);
    return { antes, depois: enemies.length, tirosDeAliado: bullets.filter(b=>b&&b.aliado).length };
  });
  // artilharia e canhao orbital
  out.artilharia = await p1.evaluate(async()=>{
    obuses.length=0; enemies.length=0;
    for(let i=0;i<12;i++){ const e=spawnEnemy("drone"); e.x=W/2; e.y=H*0.35; }
    habCd={}; usarHabilidade(HABILIDADES[OMEGA].find(h=>h.id==='artilharia'));
    const marcados = obuses.length;
    for (let k=0;k<200;k++) update(0.016);
    return { marcados, sobraram: obuses.length, inimigos: enemies.length };
  });
  out.orbital = await p1.evaluate(async()=>{
    habCd={}; usarHabilidade(HABILIDADES[OMEGA].find(h=>h.id==='orbital'));
    const ligou = !!laserOrbital;
    for (let k=0;k<60;k++) update(0.016);
    return { ligou, aindaVarrendo: !!laserOrbital };
  });
  // sem limite: dez nucleares seguidas
  out.dezNucleares = await p1.evaluate(async()=>{
    let ok=0;
    for (let n=0;n<10;n++){
      enemies.length=0; for(let i=0;i<12;i++) spawnEnemy("drone");
      habCd={}; usarHabilidade(HABILIDADES[OMEGA][0]);
      if (enemies.length===0) ok++;
      for (let k=0;k<5;k++) update(0.016);
    }
    return ok;
  });
  // operação completa + desenho
  out.operacao = await p1.evaluate(async()=>{
    aliados.length=0; obuses.length=0; enemies.length=0;
    for(let i=0;i<20;i++) spawnEnemy("drone");
    habCd={}; usarHabilidade(HABILIDADES[OMEGA].find(h=>h.id==='operacao'));
    let erro=null;
    try { for(let k=0;k<120;k++){ update(0.016); draw(); } } catch(e){ erro=String(e.message); }
    return { aliados: aliados.length, inimigos: enemies.length, erro };
  });
  await p1.evaluate(()=>{ enemies.length=0; for(let i=0;i<6;i++) spawnEnemy("drone");
    aliados.length=0; habCd={};
    usarHabilidade(HABILIDADES[OMEGA].find(h=>h.id==='tanques'));
    habCd={}; usarHabilidade(HABILIDADES[OMEGA].find(h=>h.id==='fuzileiros'));
    habCd={}; usarHabilidade(HABILIDADES[OMEGA].find(h=>h.id==='helicoptero'));
    habCd={}; usarHabilidade(HABILIDADES[OMEGA].find(h=>h.id==='artilharia'));
    habCd={}; usarHabilidade(HABILIDADES[OMEGA].find(h=>h.id==='orbital'));
  });
  await p1.waitForTimeout(800);
  await p1.screenshot({path:'v31-omega.png'});
  await p1.evaluate(()=>{ goMenu(); }); await p1.waitForTimeout(700);
  await p1.evaluate(()=>{ S.mode='hangar'; renderHangar(true); showScreen('hangar'); });
  await p1.waitForTimeout(900);
  await p1.evaluate(()=>{ const c=[...document.querySelectorAll('.ship-card')].pop();
    if(c) c.scrollIntoView({block:'center'}); });
  await p1.waitForTimeout(400);
  await p1.screenshot({path:'v31-hangar.png'});

  console.log(JSON.stringify({out,errs},null,1));
  await b.close(); fim(errs.length?1:0);
})().catch(e=>{console.error('FATAL',String(e).split('\n').slice(0,3).join(' | '));fim(2);});
