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
  await pg.waitForTimeout(600);
}
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const errs=[],out={};
  const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  const p=await c.newPage();
  p.on('pageerror',e=>errs.push('P: '+e.message));
  await novo(p,'Alien',[0,1,2,5]);

  /* os nove modelos existem e são diferentes entre si */
  out.modelos = await p.evaluate(()=>{
    const assinaturas = {}, r = {};
    for (const tipo of ["drone","striker","asteroide"]) {
      r[tipo] = [];
      for (let m=0;m<3;m++){
        const cv=document.createElement('canvas'); cv.width=cv.height=90;
        const g=cv.getContext('2d'); g.setTransform(1,0,0,1,45,45);
        try { 
          const raio = tipo==="asteroide"?24:15;
          // desenha direto o conteúdo da figura para medir
          const f = figuraInimigo(tipo, raio, false, m);
          g.drawImage(f.cv, -f.mx, -f.my, f.mx*2, f.my*2);
        } catch(e){ r[tipo].push('ERRO: '+e.message); continue; }
        const d=g.getImageData(0,0,90,90).data;
        let pintou=0, soma=0;
        for(let i=3;i<d.length;i+=4) if(d[i]>25){ pintou++; soma += d[i-3]*3+d[i-2]*5+d[i-1]*7+i%97; }
        const chave = pintou+':'+(soma%100000);
        r[tipo].push({ pixels: pintou, repetido: !!assinaturas[chave] });
        assinaturas[chave]=1;
      }
    }
    return r;
  });

  /* inimigos nascem sorteando modelo */
  await p.evaluate(()=>{ startGame(12); });
  await p.waitForTimeout(1200);
  out.naOnda = await p.evaluate(()=>{
    enemies.length=0;
    for(let i=0;i<40;i++) spawnEnemy();
    const c={0:0,1:0,2:0};
    for(const e of enemies) c[e.modelo===undefined?'x':e.modelo]=(c[e.modelo]||0)+1;
    return { total: enemies.length, porModelo: c,
             todosTemModelo: enemies.every(e=>e.modelo>=0&&e.modelo<=2) };
  });

  /* chefe: mais vida e fúria abaixo de 35% */
  out.chefe = await p.evaluate(async()=>{
    S.fase = 20; enemies.length=0; boss=null;
    spawnBoss();
    const vidaNova = boss.maxHp;
    const vidaAntiga = 60 + 20*15;
    boss.entering = false; boss.y = 200;
    const antesFuria = !!boss.furia;
    boss.hp = Math.round(boss.maxHp*0.30);
    if (boss.kind==="colosso"){ boss.coreHp = Math.round(boss.maxHp*0.30); boss.pods=[]; }
    updateBoss(0.016);
    await new Promise(r=>setTimeout(r,80));
    return { tipo: boss.kind, vidaNova, vidaAntiga,
             maisDura: Math.round((vidaNova/vidaAntiga-1)*100)+'%',
             antesFuria, depoisFuria: !!boss.furia,
             aviso: S.banner ? S.banner.text : null };
  });

  /* a fúria acelera de verdade */
  out.aceleracao = await p.evaluate(()=>{
    boss.hp = boss.maxHp; if (boss.kind==='colosso'){boss.coreHp=boss.maxHp;}
    boss.furia = false;
    const t0 = boss.t; updateBoss(0.1);
    const semFuria = boss.t - t0;
    boss.furia = true;
    const t1 = boss.t; updateBoss(0.1);
    const comFuria = boss.t - t1;
    return { semFuria: +semFuria.toFixed(3), comFuria: +comFuria.toFixed(3),
             maisRapido: Math.round((comFuria/semFuria-1)*100)+'%' };
  });

  /* uma cena de verdade para olhar */
  await p.evaluate(()=>{
    S.fase = 20; startGame(20);
  });
  await p.waitForTimeout(900);
  await p.evaluate(()=>{
    enemies.length=0; boss=null;
    const tipos=["drone","striker","asteroide"];
    for(let t=0;t<3;t++) for(let m=0;m<3;m++){
      const e=spawnEnemy(tipos[t]);
      e.modelo=m; e.x=70+m*120; e.y=180+t*110; e.speed=0; e.amp=0;
    }
    S.waveState="fighting";
  });
  await p.waitForTimeout(700);
  await p.screenshot({path:'/tmp/claude-0/-home-user-iphone-13/b7a1aae1-35a1-5214-9848-2da99e219fb6/scratchpad/aliens.png'});
  await p.evaluate(()=>{
    enemies.length=0; S.fase=25; spawnBoss();
    boss.entering=false; boss.y=H*0.3; boss.furia=true;
  });
  await p.waitForTimeout(700);
  await p.screenshot({path:'/tmp/claude-0/-home-user-iphone-13/b7a1aae1-35a1-5214-9848-2da99e219fb6/scratchpad/chefe-furia.png'});
  out.erros = errs;
  console.log(JSON.stringify(out,null,1));
  await b.close(); fim(errs.length?1:0);
})().catch(e=>{console.error('FATAL',e.message);fim(1);});
