const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const p=await c.newPage(); const errs=[];
  p.on('pageerror',e=>errs.push(e.message));
  await p.goto(JOGO + ''); await p.waitForTimeout(1100);
  await p.evaluate(()=>{ ROOT.profiles['T']=defaultSave(); ROOT.current='T'; save=ROOT.profiles['T'];
    save.__name='T'; save.best=100; save.crystals=9e6; calcStats(); goMenu(); });
  const out={};

  /* 1. a grade acha exatamente os mesmos alvos que a busca simples */
  out.mesmoResultado = await p.evaluate(()=>{
    startGame(50); S.toSpawn=0; enemies.length=0;
    let sem=7; const r=()=>{sem=(sem*1103515245+12345)&0x7fffffff; return sem/0x7fffffff;};
    for(let i=0;i<120;i++){ const e=spawnEnemy(); e.x=r()*W; e.y=r()*H; }
    gradeMontar();
    const simples=(x,y,raio)=>{
      for(let j=enemies.length-1;j>=0;j--){ const e=enemies[j];
        const rr=raio+e.r; if(dist2(x,y,e.x,e.y)<rr*rr) return e; }
      return null;
    };
    let iguais=0, diferentes=0, acertos=0;
    for(let k=0;k<4000;k++){
      const x=r()*W, y=r()*H, raio=2+r()*6;
      const a=inimigoEm(x,y,raio), bb=simples(x,y,raio);
      // os dois podem escolher inimigos diferentes se houver sobreposicao;
      // o que importa e "achou ou nao achou"
      if(!!a === !!bb) iguais++; else diferentes++;
      if(a) acertos++;
    }
    return {testes:4000, concordaram:iguais, discordaram:diferentes, acertos};
  });

  /* 2. destruir inimigos com a grade continua funcionando */
  out.abate = await p.evaluate(async()=>{
    startGame(20); S.toSpawn=0; enemies.length=0;
    for(let i=0;i<40;i++){ const e=spawnEnemy(); e.hp=1; e.x=W/2; e.y=H/2; }
    const antes=enemies.length;
    // dispara balas exatamente em cima deles
    for(let i=0;i<40;i++) bullets.push({x:W/2,y:H/2,vx:0,vy:-1,r:4,pierce:0,fix:999});
    await new Promise(r=>setTimeout(r,700));
    return {antes, depois:enemies.length, pontos:S.score>0};
  });

  /* 3. o painel continua atualizando */
  out.hud = await p.evaluate(async()=>{
    startGame(20);
    await new Promise(r=>setTimeout(r,600));
    S.score=12345; S.runGems=678; player.hp=Math.round(ST.maxHp*0.3); updateHud();
    await new Promise(r=>setTimeout(r,120));
    const noJogo={pontos:document.getElementById('hud-score').textContent,
                  cristais:document.getElementById('hud-gems').textContent,
                  vida:document.getElementById('hud-hp-txt').textContent,
                  baixo:document.getElementById('hud-hp-fill').classList.contains('baixo')};
    goMenu();
    S.score=999; updateHud();   // fora da partida escreve na hora
    return {noJogo, foraDaPartida:document.getElementById('hud-score').textContent};
  });

  /* 4. partida longa de verdade, sem travar */
  out.partidaLonga = await p.evaluate(async()=>{
    save.dificuldade='dificil'; calcStats(); startGame(150);
    const t0=performance.now(); let q=0;
    await new Promise(res=>{const f=()=>{q++;if(performance.now()-t0<8000)requestAnimationFrame(f);else res();};requestAnimationFrame(f);});
    return {segundos:8, quadros:q, fps:Math.round(q/8), modo:S.mode,
            onda:S.waveIdx+'/'+S.nWaves, vivo:player.alive, pontos:S.score>0};
  });
  out.errs=errs;
  console.log(JSON.stringify(out,null,1));
  await b.close();
})().catch(e=>{console.log('FATAL '+e.message.split('\n')[0]);process.exit(1)});
