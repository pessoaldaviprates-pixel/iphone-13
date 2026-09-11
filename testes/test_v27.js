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
  await novo(p1,'Filho',[0,1,2,5]); await novo(p2,'Mae',[0,3,6,7]);

  /* ---- 1. CONTEUDO: 100 formatos, 12x30 pecas ---- */
  out.conteudo = await p1.evaluate(()=>({
    formatos: FORMATOS.length,
    familias: [...new Set(FORMATOS.map(f=>f.familia))],
    encaixes: ENCAIXES.length,
    pecasPorEncaixe: ENCAIXES.map(e=>PECAS[e.id].length),
    totalPecas: ENCAIXES.reduce((a,e)=>a+PECAS[e.id].length,0),
    formatosUnicos: new Set(FORMATOS.map(f=>JSON.stringify(f.pts))).size,
    nomesUnicos: new Set(FORMATOS.map(f=>f.nome)).size
  }));

  /* ---- 2. CONSTRUIR UMA NAVE ---- */
  await p1.evaluate(()=>{ save.crystals=400000; persist(); });
  await p1.click('#btn-hangar'); await p1.waitForTimeout(500);
  // a oficina esta guardada (CRIAR_NAVE_LIGADO=false): abre por dentro
  await p1.evaluate(()=>abrirConstrutor()); await p1.waitForTimeout(500);
  out.construtorAberto = await p1.evaluate(()=>S.mode);
  await p1.screenshot({path:'v27-formatos.png'});
  // escolhe um formato exotico
  await p1.evaluate(()=>{ CN.familia=4; cnFormatos(); CN.def.formato=85; cnRender(); });
  await p1.waitForTimeout(300);
  await p1.click('#cn-proximo'); await p1.waitForTimeout(500);
  // poe uma peca em cada encaixe
  await p1.evaluate(()=>{ for(const e of ENCAIXES) CN.def.pecas[e.id]=20+ (e.id.length%8); cnPecas(); });
  await p1.waitForTimeout(400);
  await p1.screenshot({path:'v27-pecas.png'});
  out.previaStats = await p1.evaluate(()=>{
    const d = naveCriadaDef(CN.def);
    return { dano:d.baseDmg, vida:d.baseHp, agi:d.baseAgi, cad:d.bonusCad, gem:d.bonusGem,
             custo:custoDaNave(CN.def), ult:d.power, pecas:navePecas(CN.def).length };
  });
  await p1.click('#cn-proximo'); await p1.waitForTimeout(400);
  await p1.fill('#cn-nome','Vingadora'); await p1.waitForTimeout(150);
  await p1.evaluate(()=>{ CN.def.hue=300; cnFinal(); });
  await p1.waitForTimeout(300);
  await p1.screenshot({path:'v27-final.png'});
  const antes = await p1.evaluate(()=>save.crystals);
  await p1.click('#cn-proximo'); await p1.waitForTimeout(900);
  out.construida = await p1.evaluate(()=>({
    modo:S.mode, naves:SHIPS.length, base:NAVES_BASE, criadas:save.criadas.length,
    usando:save.ship, nome:SHIPS[save.ship].name, dano:ST.dmg.toFixed(2), vida:ST.maxHp,
    gastou: 0
  }));
  out.construida.gastou = antes - (await p1.evaluate(()=>save.crystals));
  await p1.screenshot({path:'v27-hangar.png'});
  // joga com ela
  await p1.evaluate(()=>startGame(3)); await p1.waitForTimeout(1500);
  out.jogandoComACriada = await p1.evaluate(()=>({modo:S.mode, nave:SHIPS[save.ship].name, vivo:player.alive}));
  await p1.screenshot({path:'v27-jogo.png'});
  // sai e volta: a nave continua
  await p1.evaluate(()=>{ goMenu(); }); await p1.waitForTimeout(400);
  await p1.evaluate(()=>{ const n=ROOT.current; loginAs(n); }); await p1.waitForTimeout(400);
  out.persistiu = await p1.evaluate(()=>({criadas:save.criadas.length, naves:SHIPS.length, nome:SHIPS[save.ship]?SHIPS[save.ship].name:'?'}));

  /* ---- 3. DIFICULDADE ---- */
  out.dificuldades = await p1.evaluate(()=>{
    const r={};
    for (const d of DIFICULDADES) {
      save.dificuldade = d.id;
      r[d.id] = { ondasNaFase50: faseWaves(50), ondasNaFase200: faseWaves(200) };
    }
    save.dificuldade='medio';
    return r;
  });
  out.inimigosPorOnda = await p1.evaluate(()=>{
    const r={};
    for (const d of DIFICULDADES) {
      save.dificuldade=d.id;
      for (const fase of [1,50,120,270]) {
        S.fase=fase; S.waveIdx=1; enemies=[]; boss=null; setupWave();
        r[d.id+'_f'+fase]=S.toSpawn;
      }
    }
    save.dificuldade='medio'; return r;
  });
  await p1.evaluate(()=>{ goMenu(); }); await p1.waitForTimeout(300);
  await p1.click('#btn-play'); await p1.waitForTimeout(600);
  await p1.screenshot({path:'v27-dificuldade.png'});
  await p1.evaluate(()=>goMenu()); await p1.waitForTimeout(300);

  /* ---- 4. COOPERATIVO: abate e tiro compartilhados ---- */
  const coopOn = await p1.evaluate(()=>typeof COOP_LIGADO==='undefined'||COOP_LIGADO);
  if (!coopOn) { out.coop = 'guardado (COOP_LIGADO=false)'; }
  else { await coopTeste(); }
  async function coopTeste(){
  await p1.click('#btn-multi'); await p1.waitForTimeout(500);
  await p1.click('#coop-criar'); await p1.waitForTimeout(1200);
  const cod = await p1.evaluate(()=>MP.sala);
  await p2.click('#btn-multi'); await p2.waitForTimeout(400);
  await p2.fill('#coop-codigo',cod); await p2.click('#coop-entrar'); await p2.waitForTimeout(1400);
  await p1.click('#sala-comecar'); await p1.waitForTimeout(2500);
  out.coopModo = { p1: await p1.evaluate(()=>S.mode), p2: await p2.evaluate(()=>S.mode) };
  // conta inimigos dos dois
  const conta = pg=>pg.evaluate(()=>enemies.length);
  await p1.waitForTimeout(1500);
  out.antesDoAbate = { p1: await conta(p1), p2: await conta(p2) };
  // p1 mata TODOS os inimigos dele
  const sidsMortos = await p1.evaluate(()=>{
    S.toSpawn = 0;   // para de nascer gente nova, para a conta ficar limpa
    const mortos = [];
    for (let i=enemies.length-1;i>=0;i--) { mortos.push(enemies[i].sid); damageEnemy(enemies[i], i, 99999, false); }
    MP.ultimoEnvio = 0;
    return mortos;
  });
  await p2.evaluate(()=>{ S.toSpawn = 0; });
  await p1.waitForTimeout(700);
  out.abate = { matados: sidsMortos.length,
                sobrouP1: await conta(p1), sobrouP2: await conta(p2),
                p2Recebeu: await p2.evaluate(()=>mpAbatesRecebidos),
                p2NoNo: await p2.evaluate(async()=>{ const m = await nuvemReq(mpCaminho()+'/m'); return m?JSON.stringify(m):null; }) };
  out.depoisDoAbate = { p1: await conta(p1), p2: await conta(p2) };
  // p2 ve os tiros de p1?
  await p1.evaluate(()=>{ for(let i=0;i<6;i++) bullets.push({x:100+i*10,y:400,vx:0,vy:-600,r:3}); MP.ultimoEnvio=0; });
  await p1.waitForTimeout(1500);
  out.tirosVistos = await p2.evaluate(()=>{
    const id=Object.keys(MP.outros)[0];
    return id && MP.outros[id].tiros ? MP.outros[id].tiros.length : 0;
  });
  await p2.screenshot({path:'v27-coop.png'});
  await p1.evaluate(()=>{ mpSair(true); }); await p1.waitForTimeout(600);
  }

  /* ---- 5. ADM: inventario ---- */
  await p1.evaluate(()=>{ save.amulets=[{uid:1,type:'vida',rar:2},{uid:2,type:'dano',rar:3}];
    save.skills={atk10:1,def10:1}; save.upgrades.dmg=9; save.parts[0]={cannon:3};
    save.crystals=54321; persist(); nuvemEnviar(true); contaEnviar(true); });
  await p1.waitForTimeout(1500);
  const c3=await mk(); const adm=await c3.newPage();
  adm.on('pageerror',e=>errs.push('ADM: '+e.message));
  await adm.goto(URL); await adm.waitForTimeout(800);
  await adm.click('#btn-goto-adm'); await adm.waitForTimeout(300);
  await adm.fill('#adm-nick','Cr1cket'); await adm.fill('#adm-pass','neonadmin'); await adm.click('#btn-adm-enter'); await adm.waitForTimeout(2000); await adm.evaluate(()=>admIrPara('acoes','inv')); await adm.waitForTimeout(500);
  await adm.evaluate(()=>admNuvemSelecionar(admNuvemLista.find(x=>x.nome==='Filho')));
  await adm.waitForTimeout(500);
  await adm.evaluate(()=>{try{admIrPara('acoes','inv')}catch(e){}}); await adm.waitForTimeout(300);
  await adm.click('#inv-abrir'); await adm.waitForTimeout(1500);
  out.inventario = await adm.evaluate(()=>({
    carregou: !!invConta,
    resumo: document.querySelector('.inv-resumo') ? document.querySelector('.inv-resumo').textContent.replace(/\s+/g,' ').trim() : null,
    naves: document.querySelectorAll('#inv-box .inv-item').length
  }));
  await adm.evaluate(()=>document.getElementById('inv-box').scrollIntoView({block:'center'}));
  await adm.waitForTimeout(300);
  await adm.screenshot({path:'v27-inv.png'});
  // marca um amuleto e uma nave, manda para a caixa
  await adm.evaluate(()=>{ invAba='amuletos'; invRender(); });
  await adm.waitForTimeout(400);
  await adm.evaluate(()=>{ invMarcado.amuletos[1]=1; invRender(); invMandarParaCaixa(); });
  await adm.waitForTimeout(400);
  out.caixaComRemocao = await adm.evaluate(()=>JSON.parse(JSON.stringify(caixaAdm)));
  await adm.evaluate(()=>{try{admIrPara('acoes','caixa')}catch(e){}}); await adm.waitForTimeout(300);
  await adm.click('#caixa-enviar'); await adm.waitForTimeout(1500);
  // o jogador recebe e perde o amuleto
  await p1.evaluate(()=>nuvemVerificarPresentes()); await p1.waitForTimeout(1500);
  out.amuletoRemovido = await p1.evaluate(()=>save.amulets.map(a=>a.uid));

  console.log(JSON.stringify({out,errs},null,1));
  await b.close(); fim(errs.length?1:0);
})().catch(e=>{console.error('FATAL',String(e).split('\n').slice(0,3).join(' | '));fim(2);});
