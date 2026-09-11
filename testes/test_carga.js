const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const c = await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const p = await c.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(JOGO + ''); await p.waitForTimeout(1200);
  await p.evaluate(()=>{ ROOT.profiles['T']=defaultSave(); ROOT.current='T'; save=ROOT.profiles['T'];
    save.__name='T'; save.best=200; save.crystals=9e6; calcStats(); goMenu(); });
  await p.waitForTimeout(400);
  const out = {};
  const medir = async (quantos, fase) => await p.evaluate(async ({quantos, fase}) => {
    save.dificuldade='dificil'; calcStats(); startGame(fase);
    await new Promise(r=>setTimeout(r,600));
    S.toSpawn = 0;
    enemies.length = 0;
    for (let i=0;i<quantos;i++) spawnEnemy();
    let quadros = 0; const t0 = performance.now();
    await new Promise(res => {
      const cont = () => { quadros++;
        if (performance.now() - t0 < 3000) requestAnimationFrame(cont); else res(); };
      requestAnimationFrame(cont);
    });
    const seg = (performance.now()-t0)/1000;
    return {fase, inimigos: enemies.length, balasInimigas: enemyBullets.length,
            fps: Math.round(quadros/seg), vivo: player.alive};
  }, {quantos, fase});
  out.c60 = await medir(60, 90);
  out.c120 = await medir(120, 180);
  out.c200 = await medir(200, 270);
  out.c320 = await medir(320, 270);
  out.errs = errs;
  console.log(JSON.stringify(out,null,1));
  await b.close();
})().catch(e=>{console.log('FATAL '+e.message.split('\n')[0]);process.exit(1)});
