const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const errs=[]; const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errs.push(e.message));
  await p.goto(JOGO + '?nuvem=http://127.0.0.1:8099');
  await p.waitForTimeout(1300);
  await p.evaluate(()=>{ ROOT.profiles['D']=defaultSave(); ROOT.current='D'; save=ROOT.profiles['D'];
    save.__name='D'; save.best=30; save.tutorialFeito=true; calcStats(); persist(); goMenu(); startGame(10); });
  await p.waitForTimeout(1500);
  // pula direto para o chefe
  const r = await p.evaluate(()=>{ enemies.length=0; S.onda = faseWaves(S.fase); spawnBoss && spawnBoss(); return !!boss; });
  await p.waitForTimeout(8000);
  const out = await p.evaluate(()=>({
    temChefe:!!boss, vida: boss?Math.round(boss.hp/boss.maxHp*100):null,
    avisosNaTela: AVISOS.length
  }));
  await p.screenshot({path:'v62-chefe.png'});
  // espera os avisos aparecerem
  await p.waitForTimeout(4000);
  out.avisosDepois = await p.evaluate(()=>AVISOS.length);
  out.spawn = r; out.errs = errs;
  console.log(JSON.stringify(out,null,1));
  await b.close();
})().catch(e=>{console.log('FATAL '+e.message.split('\n')[0]);process.exit(1)});
