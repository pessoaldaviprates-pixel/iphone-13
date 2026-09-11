const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const p=await c.newPage(); const errs=[];
  p.on('pageerror',e=>errs.push(e.message));
  await p.goto(JOGO + ''); await p.waitForTimeout(900);
  await p.fill('#new-name','Crash'); await p.click('#btn-new'); await p.waitForTimeout(300);
  for(let i=0;i<2;i++){await p.evaluate(()=>{senhaEstado.seq=[0,1,2,5];senhaEstado.desenhando=true;senhaSoltar();});await p.waitForTimeout(280);}
  // exatamente o cenario do relato: B-2, fase 92, com Nova de Choque e Emergencia
  const r = await p.evaluate(async ()=>{
    save.ships=[0,MAVERICK,B2]; save.ship=B2;
    for (const br of BRANCHES) for (let t=1;t<=40;t++) save.skills[br.id+t]=1;  // res40 = Nova de Choque, def30 = Emergencia
    for (const u of UPGRADES) save.upgrades[u.id]=u.max;
    persist(); calcStats();
    const res = { novaLigada: ST.nova > 0, reviveLigado: ST.revive > 0, batidas: 0, erro: null };
    startGame(92);
    await new Promise(r2=>setTimeout(r2,600));
    // repete o caso que quebrava: muitas balas inimigas + levar dano no meio do laco
    for (let volta = 0; volta < 40; volta++) {
      enemyBullets.length = 0;
      for (let i=0;i<40;i++) {
        enemyBullets.push({ x: player.x + (i%7)-3, y: player.y + (i%5)-2,
                            vx: 0, vy: 10, r: 6, homing: i%4===0, life: 3 });
      }
      for (let i=0;i<12;i++) spawnEnemy("drone");
      for (const e of enemies) { e.x = player.x; e.y = player.y; }
      player.invuln = 0; player.invis = 0; player.lives = 1;
      try { update(0.016); draw(); res.batidas++; }
      catch (err) { res.erro = String(err && err.message); break; }
    }
    return res;
  });
  console.log(JSON.stringify({ r, errs }, null, 1));
  await b.close(); process.exit(errs.length||r.erro?1:0);
})().catch(e=>{console.error('FATAL',e.message);process.exit(2);});
