const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const out={}; const errs=[];
  for (const [nome, vp] of [['iphone13',{width:390,height:844}],['pequeno',{width:320,height:568}],
                            ['grande',{width:430,height:932}],['deitado',{width:844,height:390}]]) {
    const c=await b.newContext({viewport:vp,isMobile:true,hasTouch:true});
    const p=await c.newPage();
    p.on('pageerror',e=>errs.push(nome+': '+e.message));
    await p.goto(JOGO + ''); await p.waitForTimeout(1000);
    await p.evaluate(()=>{ ROOT.profiles['T']=defaultSave(); ROOT.current='T'; save=ROOT.profiles['T'];
      save.__name='T'; save.best=100; save.crystals=9e6; save.ships=save.ships.concat([OMEGA]);
      save.ship=OMEGA; calcStats(); goMenu(); });
    await p.evaluate(()=>{ startGame(20); }); await p.waitForTimeout(900);
    out[nome] = await p.evaluate(()=>{
      const bar = document.getElementById('hab-bar');
      const bs = [...bar.querySelectorAll('.hab-btn')];
      const r = bar.getBoundingClientRect();
      const fora = bs.filter(b=>{ const q=b.getBoundingClientRect();
        return q.left < -1 || q.top < -1 || q.right > window.innerWidth+1 || q.bottom > window.innerHeight+1; });
      const ult = document.getElementById('ult-btn').getBoundingClientRect();
      const encosta = bs.filter(b=>{ const q=b.getBoundingClientRect();
        return q.bottom > ult.top+2 && q.right > ult.left-2 && q.left < ult.right+2; });
      return {
        tela: window.innerWidth+'x'+window.innerHeight,
        botoes: bs.length,
        tamanho: bar.style.getPropertyValue('--hab-tam'),
        barra: Math.round(r.width)+'x'+Math.round(r.height)+' em y '+Math.round(r.top)+'..'+Math.round(r.bottom),
        foraDaTela: fora.length,
        sobreOUlt: encosta.length,
        naveY: Math.round(player.y), limiteBaixo: Math.round(limiteBaixo()), arenaH: Math.round(H),
        naveVisivel: player.y * ZOOM < window.innerHeight - alturaConsole() + 20
      };
    });
    await p.screenshot({path:'v41-hab-'+nome+'.png'});
    await c.close();
  }
  out.errs=errs;
  console.log(JSON.stringify(out,null,1));
  await b.close();
})().catch(e=>{console.log('FATAL '+e.message.split('\n')[0]);process.exit(1)});
