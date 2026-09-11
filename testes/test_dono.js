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
  const c0=await mk(); const p0=await c0.newPage();
  p0.on('pageerror',e=>errs.push('P0: '+e.message));
  const c=await mk(); const p=await c.newPage();
  p.on('pageerror',e=>errs.push('P: '+e.message));

  /* --- 1. um jogador comum NÃO ganha nada --- */
  await novo(p0,'Zezinho',[0,1,2,5]);
  out.comum = await p0.evaluate(()=>({
    naves: save.ships.length, cristais: save.crystals,
    temPrivada: save.ships.includes(PRIVADA), vip: temVip(),
    niveisHab: Object.keys(save.habNv||{}).length
  }));

  /* --- 2. o dono ganha tudo --- */
  await novo(p,'Cr1cket',[0,3,6,7]);
  out.dono = await p.evaluate(()=>({
    naves: save.ships.length, deveriaTer: NAVES_BASE,
    temTodas: save.ships.length === NAVES_BASE,
    temMaverick: save.ships.includes(MAVERICK),
    temB2: save.ships.includes(B2),
    temOmega: save.ships.includes(OMEGA),
    temPrivada: save.ships.includes(PRIVADA),
    cristais: save.crystals,
    fase: save.best + '/' + TOTAL_FASES,
    arvore: Object.keys(save.skills).length,
    melhorias: UPGRADES.every(u=>save.upgrades[u.id]===u.max),
    pecasMax: PARTS.every(x=>save.parts[OMEGA][x.id]===PART_MAX),
    vip: temVip(), passes: PASSES.every(x=>!!save.passes[x.id]),
    amuletos: save.amulets.length,
    habTodasNoMax: [MAVERICK,B2,OMEGA,PRIVADA,0,50].every(i=>
      habsUpgrade(i).every(h=>habNivel(i,h.id)===HAB_MAX)),
    forcaHabMax: Math.round(habForca(HABILIDADES[PRIVADA][0].id)*100)/100
  }));

  /* entrar de novo não duplica os amuletos */
  const antes = await p.evaluate(()=>save.amulets.length);
  await p.evaluate(()=>{ loginAs('Cr1cket'); loginAs('Cr1cket'); });
  out.semDuplicar = { antes, depois: await p.evaluate(()=>save.amulets.length) };

  /* --- 3. novidades em dia --- */
  out.novidades = await p.evaluate(()=>{
    abrirNovidades();
    const itens=[...document.querySelectorAll('#nov-lista .nov-item b')].map(x=>x.textContent.trim());
    return { versaoNoTopo: itens[0], selo: document.getElementById('nov-versao').textContent,
             versaoDoJogo: 'v'+VERSAO, quantas: itens.length,
             bate: itens[0].indexOf(VERSAO)>=0 };
  });

  /* --- 4. o portão de atualização não prende ninguém --- */
  out.portao = await p.evaluate(()=>{
    versaoNova = { versao: "9.9", nota: "teste" };
    S.mode = "menu";
    mostrarPortaoAtualizacao();
    const g=document.getElementById('update-gate');
    const primeira = { aberto: g.classList.contains('on'), saida: g.classList.contains('travado') };
    // depois de duas tentativas frustradas a saída aparece
    anotarTentativa("9.9"); anotarTentativa("9.9");
    g.classList.remove('on');
    mostrarPortaoAtualizacao();
    const depois = { aberto: g.classList.contains('on'), saida: g.classList.contains('travado') };
    document.getElementById('ug-pular').click();
    return { primeira, depois, fechouComOBotao: !g.classList.contains('on') };
  });

  /* --- 5. jogando com a privada e habilidade no nível 10 --- */
  await p.evaluate(()=>{ save.ship=PRIVADA; persist(); calcStats(); startGame(30); });
  await p.waitForTimeout(1200);
  out.jogo = await p.evaluate(async()=>{
    const h = HABILIDADES[PRIVADA][0];
    habCd={}; usarHabilidade(h);
    await new Promise(r=>setTimeout(r,200));
    return { botoes: document.querySelectorAll('#hab-bar .hab-btn').length,
             selinhos: document.querySelectorAll('#hab-bar .hab-nv').length,
             recargaComNivel10: Math.round((habCd[h.id]||0)*10)/10,
             recargaSemNivel: h.cd, modo: S.mode };
  });
  out.erros = errs;
  console.log(JSON.stringify(out,null,1));
  await b.close(); fim(errs.length?1:0);
})().catch(e=>{console.error('FATAL',e.message);fim(1);});
