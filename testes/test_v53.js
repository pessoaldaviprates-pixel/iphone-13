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
const esperar = async (pg, fn, ms=12000) => {
  const t0=Date.now();
  while(Date.now()-t0<ms){ if(await pg.evaluate(fn)) return Math.round(Date.now()-t0); await pg.waitForTimeout(150); }
  return -1;
};
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',
    args:['--disable-features=WebRtcHideLocalIpsWithMdns','--allow-loopback-in-peer-connection']});
  const errs=[],out={};
  const mk=()=>b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const cA=await mk(), cB=await mk();
  const A=await cA.newPage(), B=await cB.newPage();
  A.on('pageerror',e=>errs.push('A: '+e.message));
  B.on('pageerror',e=>errs.push('B: '+e.message));
  await novo(A,'Ana',[0,1,2,5]);
  await novo(B,'Bruno',[0,3,6,7]);

  /* --- A/B: arena maior e botões menores --- */
  out.arena = await A.evaluate(async()=>{
    save.ships.push(OMEGA); save.ship=OMEGA; save.crystals=999999; persist(); calcStats();
    startGame(10);
    const fase = { zoom: +ZOOM.toFixed(3), largura: Math.round(W), altura: Math.round(H) };
    await new Promise(r=>setTimeout(r,400));
    const tamFase = getComputedStyle(document.getElementById('hab-bar')).getPropertyValue('--hab-tam').trim();
    MP.modo = 'arena'; MP.sala = 'arena';
    ajustarParaArena(); renderHabBar(true);
    await new Promise(r=>setTimeout(r,400));
    const are = { zoom: +ZOOM.toFixed(3), largura: Math.round(W), altura: Math.round(H),
                  classe: document.body.classList.contains('na-arena'),
                  escala: getComputedStyle(document.documentElement).getPropertyValue('--ui-escala').trim(),
                  botao: getComputedStyle(document.getElementById('hab-bar')).getPropertyValue('--hab-tam').trim() };
    MP.modo = null; MP.sala = null; ajustarParaArena(); renderHabBar(true);
    return { fase, botaoNaFase: tamFase, arena: are,
             areaMaior: Math.round((are.largura*are.altura)/(fase.largura*fase.altura)*100)+'%' };
  });

  /* --- D: poderes do chefe --- */
  out.chefe = await A.evaluate(async()=>{
    startGame(25);
    await new Promise(r=>setTimeout(r,600));
    enemies.length=0; boss=null; spawnBoss(); boss.entering=false; boss.y=200;
    const usados = {};
    for (let i=0;i<40;i++){
      boss.poderT = 0; boss.aviso = 0;
      bossPoderes(0.016);
      if (boss.poderAtual) usados[boss.poderAtual] = (usados[boss.poderAtual]||0)+1;
      if (boss.aviso > 0) { boss.aviso = 0.001; bossPoderes(0.016); }
      await new Promise(r=>setTimeout(r,10));
    }
    return { poderesDisponiveis: BOSS_PODERES.length, sorteados: Object.keys(usados).length,
             quais: Object.keys(usados), casca: !!boss.casca, semErro: true };
  });

  /* --- F: efeitos das habilidades --- */
  out.efeitos = await A.evaluate(async()=>{
    save.ship = OMEGA; calcStats(); startGame(12);
    await new Promise(r=>setTimeout(r,500));
    const r = {};
    for (const h of HABILIDADES[OMEGA]) {
      EFX.length = 0; habCd = {};
      try { usarHabilidade(h); } catch(e){ r[h.id]='ERRO '+e.message; continue; }
      r[h.id] = EFX.map(e=>e.tipo).join('+') || 'sem efeito';
    }
    return r;
  });
  out.efeitosPrivada = await A.evaluate(async()=>{
    save.ships.push(PRIVADA); save.ship = PRIVADA; calcStats(); startGame(12);
    await new Promise(r=>setTimeout(r,500));
    const r = {};
    for (const h of HABILIDADES[PRIVADA]) {
      EFX.length = 0; habCd = {};
      try { usarHabilidade(h); } catch(e){ r[h.id]='ERRO '+e.message; continue; }
      r[h.id] = EFX.map(e=>e.tipo).join('+') || 'sem efeito';
    }
    return r;
  });

  /* --- E: velocidade --- */
  out.velocidade = await A.evaluate(()=>{
    save.ship=0; calcStats();
    return { speedK: +ST.speedK.toFixed(3), antes: +(1.15/1.06*ST.speedK).toFixed(3) };
  });

  /* --- I: trocar qualidade reaplica --- */
  out.qualidade = await A.evaluate(async()=>{
    qAplicar(0,'teste'); Q.travado = true;
    const antes = Q.nivel;
    let refez = 0;
    const orig = window.fundoRefazer;
    window.fundoRefazer = function(){ refez++; return orig.apply(this, arguments); };
    qAplicar(0,'mesmo nivel');       // antes isso não fazia NADA
    const depoisMesmo = refez;
    startGame(7);                     // a fase nova reaplica sozinha
    await new Promise(r=>setTimeout(r,300));
    window.fundoRefazer = orig;
    return { nivel: antes, refezAoClicarMesmo: depoisMesmo >= 1, refezTotal: refez,
             travado: Q.travado };
  });

  /* --- G/H: duelo espelhado e poderes visíveis --- */
  await A.evaluate(()=>{ abrirMulti('pvp'); });
  await A.click('#pvp-criar'); await A.waitForTimeout(1500);
  const codigo = await A.evaluate(()=>MP.sala);
  await B.evaluate(c=>mpEntrarSala(c,'pvp'), codigo);
  await B.waitForTimeout(2200);
  await esperar(A, ()=>p2pAberto(), 15000);
  await A.evaluate(()=>mpComecar());
  await A.waitForTimeout(2200);
  await A.evaluate(()=>{ player.x = 60; player.y = H - 90; player.tx=60; player.ty=H-90; });
  await A.waitForTimeout(1200);
  out.espelho = await B.evaluate(()=>{
    const o = mpOutroPrincipal();
    if (!o) return null;
    const suave = mpPosicaoSuave(o) || { x:o.x, y:o.y };
    return { eleMandou: { x: Math.round(o.x), y: Math.round(o.y) },
             euDesenho: { x: Math.round(W - suave.x), y: Math.round(H - suave.y) },
             larguraArena: Math.round(W), alturaArena: Math.round(H),
             espelhado: (W - suave.x) > W/2 && (H - suave.y) < H/2 };
  });
  await A.evaluate(()=>{ S.ultCharge = 1; activateUlt(); });
  const viuPoder = await esperar(B, ()=>{
    const o = mpOutroPrincipal();
    return o && o.poder && o.poder.t > 0;
  }, 5000);
  out.poderDoOutro = { viuEm_ms: viuPoder,
    nome: await B.evaluate(()=>{const o=mpOutroPrincipal();return o&&o.poder?o.poder.nome:null;}),
    tipo: await B.evaluate(()=>{const o=mpOutroPrincipal();return o&&o.poder?o.poder.tipo:null;}) };
  await A.evaluate(()=>mpSair(true));
  await B.evaluate(()=>mpSair(true));
  out.erros = errs;
  console.log(JSON.stringify(out,null,1));
  await b.close(); fim(errs.length?1:0);
})().catch(e=>{console.error('FATAL',e.message);fim(1);});
