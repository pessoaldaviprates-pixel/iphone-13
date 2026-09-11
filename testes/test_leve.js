const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const out={}; const errs=[];

  /* 1. o jogo desce de nivel sozinho quando engasga */
  {
    const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
    const p=await c.newPage(); p.on('pageerror',e=>errs.push('auto: '+e.message));
    const cdp=await c.newCDPSession(p);
    await p.goto(JOGO + ''); await p.waitForTimeout(1100);
    await p.evaluate(()=>{ localStorage.removeItem('nn_qual'); localStorage.removeItem('nn_qual_fixo');
      ROOT.profiles['T']=defaultSave(); ROOT.current='T'; save=ROOT.profiles['T'];
      save.__name='T'; save.best=250; save.crystals=9e6; save.dificuldade='dificil'; calcStats(); goMenu();
      Q.travado=false; Q.subidas=0; qAplicar(2,'teste'); });
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:8});
    out.auto = await p.evaluate(async()=>{
      const antes = {nivel:Q.nivel, dpr:DPR};
      startGame(270); await new Promise(x=>setTimeout(x,600));
      S.toSpawn=0; enemies.length=0;
      for(let i=0;i<130;i++) spawnEnemy();
      for(let i=0;i<150;i++) enemyBullets.push({x:Math.random()*W,y:Math.random()*H,vx:0,vy:120,r:5,dano:1});
      const fps=[];
      for (let volta=0; volta<3; volta++) {
        let q=0; const t0=performance.now();
        await new Promise(res=>{const f=()=>{q++;if(performance.now()-t0<2600)requestAnimationFrame(f);else res();};requestAnimationFrame(f);});
        fps.push(Math.round(q/((performance.now()-t0)/1000)));
      }
      return {antes, depois:{nivel:Q.nivel, dpr:DPR, pixels:canvas.width+'x'+canvas.height},
              fpsPorTrecho:fps, desceu: Q.nivel < antes.nivel, guardou: localStorage.getItem('nn_qual')};
    });
    await c.close();
  }

  /* 2. nada do jogo sumiu no modo leve */
  {
    const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
    const p=await c.newPage(); p.on('pageerror',e=>errs.push('leve: '+e.message));
    await p.goto(JOGO + ''); await p.waitForTimeout(1100);
    await p.evaluate(()=>{ ROOT.profiles['T']=defaultSave(); ROOT.current='T'; save=ROOT.profiles['T'];
      save.__name='T'; save.best=250; save.crystals=9e6; save.ships=save.ships.concat([6,OMEGA]);
      save.pts=20; save.amulets=[{uid:1,type:'coroa',rar:3}]; save.equipped=[1];
      calcStats(); Q.travado=true; qAplicar(0,'teste'); goMenu(); });
    await p.waitForTimeout(500);
    out.tudoNoLugar = await p.evaluate(()=>{
      const conta = (sel)=>document.querySelectorAll(sel).length;
      return {
        atalhosDoMenu: conta('#screen-menu .tile'),
        classeNoBody: document.body.className,
        naves: SHIPS.length, fases: TOTAL_FASES,
        reliquias: AMULET_TYPES.length + AMULET_SPECIALS.length,
        melhorias: UPGRADES.length, pecas: PARTS.length,
        eventos: EVENTOS.length, boosts: BOOSTS.length, trolls: TROLLS.length,
        habilidadesOmega: HABILIDADES[OMEGA].length
      };
    });
    out.jogoNoLeve = await p.evaluate(async()=>{
      save.ship=OMEGA; calcStats(); startGame(60);
      await new Promise(x=>setTimeout(x,1200));
      let usadas=0;
      for (const h of HABILIDADES[OMEGA]) if(!h.combo){ habCd[h.id]=0; usarHabilidade(h); usadas++; }
      await new Promise(x=>setTimeout(x,2200));
      return {modo:S.mode, habilidades:usadas, apocalipse:S.apocalipse, aliados:aliados.length,
              vivo:player.alive, inimigos:enemies.length,
              habBotoes:document.querySelectorAll('#hab-bar .hab-btn').length};
    });
    await p.screenshot({path:'v42-leve.png'});
    // e a pausa mostra a escolha
    out.pausa = await p.evaluate(()=>{ togglePause();
      return {modo:S.mode, botoes:[...document.querySelectorAll('.qual-btn')].map(b=>b.textContent),
              marcado:[...document.querySelectorAll('.qual-btn.on')].map(b=>b.textContent)}; });
    await p.waitForTimeout(400);
    await p.screenshot({path:'v42-pausa.png'});
    await c.close();
  }

  /* 3. no capricho cheio continua identico ao de antes */
  {
    const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
    const p=await c.newPage(); p.on('pageerror',e=>errs.push('cheio: '+e.message));
    await p.goto(JOGO + ''); await p.waitForTimeout(1100);
    await p.evaluate(()=>{ ROOT.profiles['T']=defaultSave(); ROOT.current='T'; save=ROOT.profiles['T'];
      save.__name='T'; save.best=60; save.crystals=9e6; calcStats();
      Q.travado=true; qAplicar(2,'teste'); goMenu(); });
    await p.evaluate(async()=>{ startGame(30); await new Promise(x=>setTimeout(x,1600)); });
    await p.screenshot({path:'v42-cheio.png'});
    out.cheio = await p.evaluate(()=>({nivel:Q.nivel, dpr:DPR, figuras:FIGURAS.size, estrelas:stars.length}));
    await c.close();
  }
  out.errs=errs;
  console.log(JSON.stringify(out,null,1));
  await b.close();
})().catch(e=>{console.log('FATAL '+e.message.split('\n')[0]);process.exit(1)});
