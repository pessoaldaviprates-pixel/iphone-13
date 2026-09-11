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
    args:['--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding','--autoplay-policy=no-user-gesture-required']});
  const errs=[],out={};
  const mk=()=>b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const c1=await mk(),c2=await mk();
  const p1=await c1.newPage(),p2=await c2.newPage();
  p1.on('pageerror',e=>errs.push('P1: '+e.message)); p2.on('pageerror',e=>errs.push('P2: '+e.message));

  /* ---- 1. LIMPEZA DAS NAVES CRIADAS ---- */
  await novo(p1,'Filho',[0,1,2,5]);
  await p1.evaluate(()=>{
    save.limpezaNaves = 0;
    save.crystals = 1000;
    save.criadas = [{formato:79,pecas:Object.fromEntries(ENCAIXES.map(e=>[e.id,29])),nome:'Quebrada',hue:0}];
    reconstruirNavesCriadas();
    save.ship = NAVES_BASE;
    persist();
  });
  await p1.waitForTimeout(300);
  const antes = await p1.evaluate(()=>({criadas:save.criadas.length, naves:SHIPS.length, cris:save.crystals, ship:save.ship}));
  await p1.evaluate(()=>{ const n=ROOT.current; loginAs(n); });
  await p1.waitForTimeout(400);
  out.limpeza = { antes, depois: await p1.evaluate(()=>({criadas:save.criadas.length, naves:SHIPS.length, cris:save.crystals, ship:save.ship, flag:save.limpezaNaves})) };

  /* ---- 2. EQUILIBRIO ---- */
  out.equilibrio = await p1.evaluate(()=>{
    const medir = ()=>{ calcStats(); return { tps:+(1/ST.fireInterval).toFixed(1), dps:+(ST.dmg/ST.fireInterval).toFixed(0), vida:ST.maxHp }; };
    save.upgrades={}; for(const u of UPGRADES) save.upgrades[u.id]=u.max;
    save.skills={}; for(const br of BRANCHES) for(let t=1;t<=40;t++) save.skills[br.id+t]=1;
    save.parts={};
    save.ship=B2; save.parts[B2]={}; for(const pt of PARTS) save.parts[B2][pt.id]=PART_MAX;
    const b2 = medir();
    save.criadas=[{formato:79,pecas:Object.fromEntries(ENCAIXES.map(e=>[e.id,29])),nome:'M',hue:0}];
    reconstruirNavesCriadas(); save.ship=NAVES_BASE;
    save.parts[NAVES_BASE]={}; for(const pt of PARTS) save.parts[NAVES_BASE][pt.id]=PART_MAX;
    const cri = medir();
    save.criadas=[]; reconstruirNavesCriadas(); save.ship=0; calcStats();
    return { b2Maximo:b2, criadaMaxima:cri };
  });

  /* ---- 3. MUSICA ---- */
  await p1.evaluate(()=>{ save.crystals=9999; persist(); startGame(7); });
  await p1.waitForTimeout(1500);
  out.musica = await p1.evaluate(()=>({
    ligada: Musica.ligada, tocando: Musica.tocando, fase: S.fase,
    bpm: Musica.plano?Musica.plano.bpm:null,
    notas: Musica.plano?Musica.plano.melodia.filter(x=>x!==null).length:0,
    timbre: Musica.plano?Musica.plano.timbre:null,
    passos: Musica.passo
  }));
  // cada fase tem trilha diferente
  out.trilhasDiferentes = await p1.evaluate(()=>{
    const assinaturas = new Set();
    for (let f=1; f<=60; f++) {
      const p = Musica.montar(f, false);
      assinaturas.add(p.bpm+'|'+p.timbre+'|'+p.melodia.join(',')+'|'+p.raiz.toFixed(1));
    }
    return { de60fases: assinaturas.size };
  });
  await p1.evaluate(()=>{ goMenu(); });
  await p1.waitForTimeout(400);
  out.musicaParouNoMenu = await p1.evaluate(()=>Musica.tocando);

  /* ---- 4. REDE: quantas requisicoes por segundo no cooperativo ---- */
  await novo(p2,'Mae',[0,3,6,7]);
  let reqs = 0;
  const contarP1 = r => { if (/127\.0\.0\.1:8099/.test(r.url()) && r.method()!=='GET') reqs++; };
  await p1.click('#btn-multi'); await p1.waitForTimeout(500);
  await p1.click('#coop-criar'); await p1.waitForTimeout(1200);
  const cod = await p1.evaluate(()=>MP.sala);
  await p2.click('#btn-multi'); await p2.waitForTimeout(400);
  await p2.fill('#coop-codigo',cod); await p2.click('#coop-entrar'); await p2.waitForTimeout(1400);
  await p1.click('#sala-comecar'); await p1.waitForTimeout(2500);
  p1.on('request', contarP1);
  await p1.waitForTimeout(4000);
  p1.off('request', contarP1);
  out.rede = { escritasPorSegundo: +(reqs/4).toFixed(1),
               intervalo: await p1.evaluate(()=>REDE.intervalo),
               ida: await p1.evaluate(()=>Math.round(REDE.ida)) };
  // abate compartilhado continua
  const sids = await p1.evaluate(()=>{ S.toSpawn=0; const m=[];
    for(let i=enemies.length-1;i>=0;i--){m.push(enemies[i].sid);damageEnemy(enemies[i],i,99999,false);} MP.ultimoEnvio=0; return m; });
  await p2.evaluate(()=>{ S.toSpawn=0; });
  await p1.waitForTimeout(900);
  out.abateCompartilhado = { matou: sids.length, p2Recebeu: await p2.evaluate(()=>mpAbatesRecebidos) };
  out.tirosVistos = await p2.evaluate(()=>{ const id=Object.keys(MP.outros)[0];
    return id&&MP.outros[id].tiros?MP.outros[id].tiros.length:0; });
  await p1.evaluate(()=>mpSair(true)); await p2.evaluate(()=>mpSair(true));
  await p1.waitForTimeout(800);

  /* ---- 5. RANQUEADA: fila continua rodando no menu ---- */
  await p1.click('#btn-ranked'); await p1.waitForTimeout(600);
  await p1.click('#rk-procurar'); await p1.waitForTimeout(1500);
  await p1.evaluate(()=>goMenu()); await p1.waitForTimeout(1500);
  out.filaSegueNoMenu = await p1.evaluate(()=>({
    procurando: FILA.procurando, modo: S.mode,
    faixa: document.getElementById('fila-faixa').classList.contains('on'),
    texto: document.getElementById('fila-faixa').textContent.slice(0,42)
  }));
  await p1.screenshot({path:'v29-fila.png'});
  // agora a Mae procura, e o duelo tem de comecar sozinho nos dois
  await p2.click('#btn-ranked'); await p2.waitForTimeout(500);
  await p2.click('#rk-procurar');
  await p1.waitForTimeout(7000);
  out.duelo = {
    p1: await p1.evaluate(()=>({modo:S.mode, sala:MP.sala, mp:MP.modo})),
    p2: await p2.evaluate(()=>({modo:S.mode, sala:MP.sala, mp:MP.modo}))
  };
  await p1.screenshot({path:'v29-duelo.png'});

  console.log(JSON.stringify({out,errs},null,1));
  await b.close(); fim(errs.length?1:0);
})().catch(e=>{console.error('FATAL',String(e).split('\n').slice(0,3).join(' | '));fim(2);});
