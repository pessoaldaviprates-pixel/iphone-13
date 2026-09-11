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
  const mk=()=>b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});

  /* --- dono: infinito em toda tela --- */
  const c=await mk(); const p=await c.newPage();
  p.on('pageerror',e=>errs.push('DONO: '+e.message));
  await novo(p,'Cr1cket',[0,3,6,7]);
  out.dono = await p.evaluate(()=>{
    const r={};
    refreshMenu();
    r.menu = document.getElementById('menu-gems').textContent;
    r.menuMarcado = document.getElementById('menu-gems').classList.contains('infinito');
    renderHangar(false); r.hangar = document.getElementById('hangar-gems').textContent;
    renderShop(); r.melhorias = document.getElementById('shop-gems').textContent;
    renderTree(); r.arvore = document.getElementById('tree-gems').textContent;
    renderReliquias(); r.relicarios = document.getElementById('rel-gems').textContent;
    renderLevels(); r.fases = document.getElementById('levels-gems').textContent;
    renderLoja(); r.loja = document.getElementById('loja-gems').textContent;
    return r;
  });

  /* --- comprar não tira nada --- */
  out.compra = await p.evaluate(()=>{
    const antes = save.crystals;
    // sobe uma habilidade cara na mão e grava
    save.habNv = {}; calcStats();
    const h = habsUpgrade(save.ship)[0];
    save.crystals -= custoHab(0);
    persist();
    return { antes, depoisDeGastar: save.crystals, voltouAoTeto: save.crystals === CRISTAIS_DONO,
             textoNaTela: (refreshMenu(), document.getElementById('menu-gems').textContent) };
  });

  /* --- botão de compra no hangar continua funcionando --- */
  out.hangarCompra = await p.evaluate(()=>{
    save.habNv = {}; save.ship = PRIVADA; persist(); calcStats(); renderHangar(false);
    const btn = document.querySelector('.ship-card.sel .hab-up .hab-linha .buy-btn');
    const rotulo = btn.textContent.trim();
    btn.click();
    return { rotulo, nivelDepois: habNivel(PRIVADA, HABILIDADES[PRIVADA][0].id),
             saldo: save.crystals, tela: document.getElementById('hangar-gems').textContent };
  });

  /* --- jogador comum continua vendo número --- */
  const c2=await mk(); const p2=await c2.newPage();
  p2.on('pageerror',e=>errs.push('COMUM: '+e.message));
  await novo(p2,'Zezinho',[0,1,2,5]);
  out.comum = await p2.evaluate(()=>{
    save.crystals = 1234; persist(); refreshMenu(); renderHangar(false);
    return { menu: document.getElementById('menu-gems').textContent,
             marcado: document.getElementById('menu-gems').classList.contains('infinito'),
             hangar: document.getElementById('hangar-gems').textContent };
  });
  out.erros = errs;
  console.log(JSON.stringify(out,null,1));
  await b.close(); fim(errs.length?1:0);
})().catch(e=>{console.error('FATAL',e.message);fim(1);});
