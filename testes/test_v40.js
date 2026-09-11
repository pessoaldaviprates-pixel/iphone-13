const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const mk = async () => await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const c = await mk(); const p = await c.newPage(); const errs = [];
  p.on('pageerror', e => errs.push('ERRO: ' + e.message));
  p.on('console', m => { if (m.type()==='error' && !/net::/.test(m.text())) errs.push('console: '+m.text()); });
  await p.goto(JOGO + '');
  await p.waitForTimeout(1200);
  const out = {};

  await p.fill('#new-name','Piloto'); await p.tap('#btn-new'); await p.waitForTimeout(500);
  // desenha a senha
  await p.evaluate(()=>{ senhaAtual=[0,1,2,3]; });
  await p.waitForTimeout(200);
  const box = await p.$('#senha-canvas');
  if (box) {
    const r = await box.boundingBox();
    await p.mouse.move(r.x+r.width*0.2, r.y+r.height*0.2); await p.mouse.down();
    await p.mouse.move(r.x+r.width*0.5, r.y+r.height*0.2, {steps:6});
    await p.mouse.move(r.x+r.width*0.8, r.y+r.height*0.2, {steps:6});
    await p.mouse.move(r.x+r.width*0.8, r.y+r.height*0.5, {steps:6});
    await p.mouse.up(); await p.waitForTimeout(700);
    // confirma
    await p.mouse.move(r.x+r.width*0.2, r.y+r.height*0.2); await p.mouse.down();
    await p.mouse.move(r.x+r.width*0.5, r.y+r.height*0.2, {steps:6});
    await p.mouse.move(r.x+r.width*0.8, r.y+r.height*0.2, {steps:6});
    await p.mouse.move(r.x+r.width*0.8, r.y+r.height*0.5, {steps:6});
    await p.mouse.up(); await p.waitForTimeout(900);
  }
  out.modo = await p.evaluate(()=>S.mode);

  /* ---- 1. ARENA MAIOR ---- */
  out.arena = await p.evaluate(()=>({
    zoom: +ZOOM.toFixed(3),
    telaCss: window.innerWidth + 'x' + window.innerHeight,
    arenaLogica: Math.round(W) + 'x' + Math.round(H),
    ganhoDeArea: +(((W*H)/(window.innerWidth*window.innerHeight)-1)*100).toFixed(1) + '%'
  }));

  /* ---- 2. MAIS INIMIGOS ---- */
  out.inimigos = await p.evaluate(()=>{
    const r = {};
    const antes = save.dificuldade;
    for (const d of ['facil','medio','dificil']) {
      save.dificuldade = d;
      for (const f of [1, 30, 90, 200, 270]) {
        // usa o codigo de verdade: setupWave decide quantos nascem
        S.fase = f; S.waveIdx = 1; S.nWaves = faseWaves(f);
        S.duelo = false; enemies.length = 0; boss = null;
        setupWave();
        r[d+'_f'+f] = S.toSpawn;
      }
    }
    save.dificuldade = antes;
    return r;
  });

  /* ---- 3. RELIQUIAS NOVAS ---- */
  out.reliquias = await p.evaluate(()=>({
    tipos: AMULET_TYPES.length,
    lendarias: AMULET_SPECIALS.length,
    total: AMULET_TYPES.length + AMULET_SPECIALS.length,
    todasTemEfeito: AMULET_TYPES.every(t => typeof t.fx === 'function' && t.vals.length === 4)
  }));
  out.reliquiasFuncionam = await p.evaluate(()=>{
    save.amulets = [
      {uid:900,type:'prisma',rar:3},{uid:901,type:'coroa',rar:3},{uid:902,type:'perfura',rar:3}
    ];
    save.equipped = [900,901,902];
    calcStats();
    const a = {dano: +ST.dmg.toFixed(2), pierce: ST.pierce, vidas: ST.maxLives};
    save.amulets = []; save.equipped = []; calcStats();
    const base = {dano: +ST.dmg.toFixed(2), pierce: ST.pierce, vidas: ST.maxLives};
    return {comReliquias: a, semReliquias: base,
            danoSubiu: a.dano > base.dano, perfuraSubiu: a.pierce > base.pierce, vidaSubiu: a.vidas > base.vidas};
  });

  /* ---- 4. MELHORIAS NOVAS ---- */
  out.melhorias = await p.evaluate(()=>({
    quantas: UPGRADES.length,
    pecasPorNave: PARTS.length,
    ids: UPGRADES.map(u=>u.id).join(',')
  }));
  out.melhoriasFuncionam = await p.evaluate(()=>{
    calcStats(); const b = {vel: ST.balaVel, crit: ST.critChance, blast: ST.blast, ult: ST.ultRate, rep: ST.reparoOnda};
    for (const u of UPGRADES) save.upgrades[u.id] = u.max;
    calcStats(); const a = {vel: ST.balaVel, crit: ST.critChance, blast: ST.blast, ult: ST.ultRate, rep: ST.reparoOnda};
    for (const u of UPGRADES) save.upgrades[u.id] = 0;
    calcStats();
    return {base: b, cheio: a,
            todasSubiram: a.vel>b.vel && a.crit>b.crit && a.blast>b.blast && a.ult>b.ult && a.rep>b.rep};
  });

  /* ---- 5. TELA DE FASES ---- */
  await p.evaluate(()=>{ save.best = 47; persist(); });
  await p.tap('#btn-play'); await p.waitForTimeout(700);
  out.fases = await p.evaluate(()=>({
    modo: S.mode,
    resumo: [...document.querySelectorAll('.fase-res-cx')].map(e=>e.textContent).join(' | '),
    setores: document.querySelectorAll('.setor-bloco').length,
    barrasComProgresso: [...document.querySelectorAll('.setor-barra i')].filter(e=>e.style.width!=='0%').length,
    proxima: (document.querySelector('.fase-btn.next')||{}).textContent,
    chefesMarcados: document.querySelectorAll('.fase-btn.boss').length
  }));
  await p.screenshot({path:'v40-fases.png'});
  await p.evaluate(()=>goMenu()); await p.waitForTimeout(400);

  /* ---- 6. HANGAR ---- */
  await p.tap('#btn-hangar'); await p.waitForTimeout(700);
  out.hangar = await p.evaluate(()=>({
    modo: S.mode,
    atual: ($('hangar-atual').textContent||'').replace(/\s+/g,' ').trim().slice(0,60),
    barrasDoAtual: document.querySelectorAll('#hangar-atual .ha-b').length,
    filtros: [...document.querySelectorAll('.hf-btn')].map(e=>e.textContent).join('/'),
    navesListadas: document.querySelectorAll('.ship-card').length,
    barrinhas: document.querySelectorAll('.ship-mini').length
  }));
  // testa o filtro
  await p.evaluate(()=>{ [...document.querySelectorAll('.hf-btn')].find(b=>b.textContent==='NO HANGAR').click(); });
  await p.waitForTimeout(400);
  out.hangarFiltrado = await p.evaluate(()=>({
    filtro: hangarFiltro, naves: document.querySelectorAll('.ship-card').length
  }));
  await p.screenshot({path:'v40-hangar.png'});
  await p.evaluate(()=>{ hangarFiltro='todas'; goMenu(); }); await p.waitForTimeout(400);

  /* ---- 7. RELIQUIAS: colecao ---- */
  await p.tap('#btn-reliquias'); await p.waitForTimeout(600);
  out.telaReliquias = await p.evaluate(()=>({
    colecao: ($('rel-colecao').querySelector('.rel-col-n')||{}).textContent,
    icones: document.querySelectorAll('.rel-col-ic').length
  }));
  await p.screenshot({path:'v40-reliquias.png'});
  await p.evaluate(()=>goMenu()); await p.waitForTimeout(400);

  /* ---- 8. MENU: pontos de atencao ---- */
  out.menu = await p.evaluate(()=>{
    save.crystals = 900000; save.pts = 12; save.skills = {};
    save.amulets=[{uid:1,type:'dano',rar:1}]; save.equipped=[];
    refreshMenu();
    return {
      comPonto: ['btn-shop','btn-hangar','btn-tree','btn-reliquias'].filter(i=>$(i).classList.contains('tem')),
      amuBadge: $('menu-amu-badge').textContent
    };
  });
  await p.screenshot({path:'v40-menu.png'});

  /* ---- 9. NAVE NUCLEAR: apocalipse ---- */
  out.omega = await p.evaluate(()=>{
    const habs = HABILIDADES[OMEGA];
    const ap = habs.find(h=>h.id==='apocalipse');
    return {quantasHabilidades: habs.length, temApocalipse: !!ap,
            recarga: ap?ap.cd:null, supremo: ap?!!ap.supremo:false};
  });
  out.apocalipse = await p.evaluate(async()=>{
    save.ships = save.ships.concat([OMEGA]); save.ship = OMEGA;
    calcStats(); startGame(20);
    await new Promise(r=>setTimeout(r,900));
    const antes = {aliados: aliados.length, obuses: obuses.length, inimigos: enemies.length};
    usarHabilidade(HABILIDADES[OMEGA].find(h=>h.id==='apocalipse'));
    await new Promise(r=>setTimeout(r,4500));
    const dep = {ligado: S.apocalipse, passos: S.apocPasso, aliados: aliados.length,
                 obuses: obuses.length, orbital: !!laserOrbital,
                 tanques: aliados.filter(a=>a.tipo==='tanque').length,
                 soldados: aliados.filter(a=>a.tipo==='soldado').length,
                 helis: aliados.filter(a=>a.tipo==='heli').length,
                 avioes: aliados.filter(a=>a.tipo==='aviao').length,
                 vidaCheia: player.hp === ST.maxHp, invencivel: player.invuln > 0};
    return {antes, depois: dep};
  });
  await p.screenshot({path:'v40-apocalipse.png'});
  // continua rolando sozinho?
  await p.waitForTimeout(4000);
  out.apocalipseSegue = await p.evaluate(()=>({
    aindaLigado: S.apocalipse, passos: S.apocPasso, fps: Math.round(1/Math.max(0.001,S.ultDt||0.016)),
    aliadosVivos: aliados.length
  }));
  // muda de fase: tem que desligar
  out.apocalipseAcaba = await p.evaluate(()=>{ startGame(21); return {ligado: S.apocalipse, passos: S.apocPasso}; });

  /* ---- 10. PORTAO DE ATUALIZACAO ---- */
  await p.evaluate(()=>goMenu()); await p.waitForTimeout(400);
  out.portao = await p.evaluate(async()=>{
    versaoNova = {versao:'9.9', nota:'teste de atualizacao'};
    mostrarPortaoAtualizacao();
    await new Promise(r=>setTimeout(r,300));
    const g = $('update-gate');
    const r = g.getBoundingClientRect();
    // o portao cobre a tela toda?
    const noMeio = document.elementFromPoint(window.innerWidth/2, window.innerHeight/2);
    return {aberto: g.classList.contains('on'),
            versao: $('ug-ver').textContent, nota: $('ug-nota').textContent,
            cobreTudo: r.width>=window.innerWidth-1 && r.height>=window.innerHeight-1,
            oQueEstaNaFrente: noMeio ? (noMeio.id || noMeio.className) : null,
            temBotao: !!$('ug-btn')};
  });
  await p.screenshot({path:'v40-portao.png'});
  // durante a partida NAO aparece
  out.portaoNaPartida = await p.evaluate(async()=>{
    $('update-gate').classList.remove('on');
    startGame(5);
    mostrarPortaoAtualizacao();
    await new Promise(r=>setTimeout(r,200));
    const r = {durante: $('update-gate').classList.contains('on')};
    goMenu();
    mostrarPortaoAtualizacao();
    r.depois = $('update-gate').classList.contains('on');
    versaoNova = null; $('update-gate').classList.remove('on');
    return r;
  });

  /* ---- 11. JOGO RODANDO COM TUDO ---- */
  out.jogo = await p.evaluate(async()=>{
    save.dificuldade='dificil'; save.ship=0; calcStats(); startGame(120);
    await new Promise(r=>setTimeout(r,6000));
    return {modo:S.mode, inimigosNaTela: enemies.length, aSpawnar: S.toSpawn,
            vivo: player.alive, balas: bullets.length};
  });
  await p.screenshot({path:'v40-jogo.png'});

  out.errs = errs;
  console.log(JSON.stringify(out, null, 1));
  await b.close();
})().catch(e => { console.log('FATAL ' + e.message.split('\n')[0]); process.exit(1); });
