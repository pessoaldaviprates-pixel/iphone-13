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
  const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const p=await c.newPage();
  p.on('pageerror',e=>errs.push('P: '+e.message));
  await novo(p,'Trono1',[0,1,2,5]);

  out.nave = await p.evaluate(()=>({
    nome: SHIPS[PRIVADA].name, exclusiva: naveExclusiva(PRIVADA),
    habs: HABILIDADES[PRIVADA].length,
    ult: ULTS[SHIPS[PRIVADA].ultId].name,
    maisFracaQueOmega: SHIPS[PRIVADA].baseDmg < SHIPS[OMEGA].baseDmg &&
                       SHIPS[PRIVADA].baseHp < SHIPS[OMEGA].baseHp,
    efeitosTodos: HABILIDADES[PRIVADA].every(h=>typeof EFEITOS[h.id]==='function')
  }));

  /* desenho da nave não quebra */
  out.desenho = await p.evaluate(()=>{
    const cv=document.createElement('canvas'); cv.width=cv.height=120;
    const g=cv.getContext('2d'); g.setTransform(2,0,0,2,60,60);
    try{ drawShipSprite(g,PRIVADA,16); }catch(e){ return 'ERRO: '+e.message; }
    const d=g.getImageData(0,0,120,120).data;
    let pintou=0; for(let i=3;i<d.length;i+=4) if(d[i]>30) pintou++;
    return pintou>800 ? 'ok ('+pintou+' pixels)' : 'quase vazio ('+pintou+')';
  });

  /* melhoria de habilidades: nave comum tem poder + ult */
  out.painelComum = await p.evaluate(()=>{
    save.crystals=5000000; save.ship=0; persist(); calcStats();
    renderHangar(false);
    return habsUpgrade(0).map(h=>h.id);
  });

  /* subir níveis custa cristal e muda a força */
  out.upar = await p.evaluate(()=>{
    save.ships.push(PRIVADA); save.ship=PRIVADA; save.crystals=5000000;
    persist(); calcStats();
    const antesDmg = ST.dmg, antesCristais = save.crystais;
    const custo1 = custoHab(0), custo9 = custoHab(9);
    const h = HABILIDADES[PRIVADA][0];
    const gastoAntes = save.crystals;
    save.habNv[chaveHab(PRIVADA,h.id)] = 3;
    calcStats();
    return {
      custoNivel1: custo1, custoNivel10: custo9,
      recargaBase: h.cd,
      recargaNv3: Math.round(habRecarga(h.cd,h.id)*100)/100,
      forcaNv3: Math.round(habForca(h.id)*100)/100,
      danoSubiu: ST.dmg > antesDmg,
      max: HAB_MAX
    };
  });

  /* painel no hangar aparece com as 8 habilidades e botões de cristal */
  out.painelHangar = await p.evaluate(()=>{
    save.habNv={}; persist(); calcStats();
    renderHangar(false);
    const box=document.querySelector('.ship-card.sel .hab-up');
    if(!box) return 'sem painel';
    const linhas=[...box.querySelectorAll('.hab-linha')];
    return { linhas: linhas.length,
             primeiro: linhas[0].querySelector('.buy-btn').textContent.trim(),
             temNivel: !!linhas[0].querySelector('.nv') };
  });

  /* comprar um nível pelo botão */
  out.compra = await p.evaluate(()=>{
    const btn=document.querySelector('.ship-card.sel .hab-up .hab-linha .buy-btn');
    const antes=save.crystals;
    btn.click();
    return { gastou: antes-save.crystals, nivel: habNivel(PRIVADA, HABILIDADES[PRIVADA][0].id) };
  });

  /* dentro do jogo: todas as habilidades rodam sem erro */
  await p.evaluate(()=>{ save.ship=PRIVADA; persist(); calcStats(); startGame(30); });
  await p.waitForTimeout(1200);
  out.botoesNaTela = await p.evaluate(()=>document.querySelectorAll('#hab-bar .hab-btn').length);
  out.efeitos = await p.evaluate(async()=>{
    const r={};
    for (const h of HABILIDADES[PRIVADA]) {
      enemies.length=0; for(let i=0;i<14;i++) spawnEnemy("drone");
      const vivos=enemies.length;
      habCd={};
      try { usarHabilidade(h); } catch(e){ r[h.id]='ERRO: '+e.message; continue; }
      await new Promise(x=>setTimeout(x,450));
      r[h.id]={ recarga: Math.round((habCd[h.id]||0)*10)/10, inimigos: vivos+'→'+enemies.length };
    }
    return r;
  });
  await p.waitForTimeout(800);
  out.aindaRodando = await p.evaluate(()=>S.mode);
  out.erros = errs;
  console.log(JSON.stringify(out,null,1));
  await b.close(); fim(errs.length?1:0);
})().catch(e=>{console.error(e);fim(1);});
