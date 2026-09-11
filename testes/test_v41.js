const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const p=await c.newPage(); const errs=[];
  p.on('pageerror',e=>errs.push('ERRO: '+e.message));
  p.on('console',m=>{if(m.type()==='error'&&!/net::/.test(m.text()))errs.push('console: '+m.text());});
  await p.goto(JOGO + ''); await p.waitForTimeout(1100);
  const out={};
  await p.evaluate(()=>{ ROOT.profiles['T']=Object.assign(defaultSave(),{best:60,crystals:5e6,pts:20});
    ROOT.current='T'; save=ROOT.profiles['T']; save.__name='T';
    save.ships=save.ships.concat([6,OMEGA]); calcStats(); goMenu(); });
  await p.waitForTimeout(400);

  // 1. nada estoura pra fora da tela em nenhuma tela
  const foraDaTela = async () => await p.evaluate(()=>{
    const ruins=[];
    document.querySelectorAll('.screen.show, .page.show').forEach(t=>{
      t.querySelectorAll('button,input,.tile,.fim-cx,.hud-col,.shop-card,.amu-card,.fase-btn').forEach(e=>{
        const r=e.getBoundingClientRect();
        if(!r.width) return;
        if(r.right>window.innerWidth+1 || r.left<-1) ruins.push((e.id||e.className)+' x'+Math.round(r.left)+'..'+Math.round(r.right));
      });
    });
    return ruins.slice(0,6);
  });
  out.menuLimpo = await foraDaTela();
  await p.evaluate(()=>{S.mode='shop';renderShop();showScreen('shop');}); await p.waitForTimeout(400);
  out.lojaLimpa = await foraDaTela();
  await p.evaluate(()=>{S.mode='levels';renderLevels();showScreen('levels');}); await p.waitForTimeout(400);
  out.fasesLimpas = await foraDaTela();
  await p.evaluate(()=>{S.mode='reliquias';renderReliquias();showScreen('reliquias');}); await p.waitForTimeout(400);
  out.reliquiasLimpas = await foraDaTela();

  // 2. jogar de verdade uma fase inteira
  out.partida = await p.evaluate(async()=>{
    save.ship=OMEGA; save.dificuldade='medio'; calcStats(); goMenu(); startGame(60);
    await new Promise(r=>setTimeout(r,1500));
    const inicio = {modo:S.mode, ondas:S.nWaves, inimigos:enemies.length,
                    naveDentro: player.y > 0 && player.y < H,
                    naveAcimaDosBotoes: player.y <= limiteBaixo()+1};
    // usa todas as habilidades
    let usadas=0;
    for (const h of HABILIDADES[OMEGA]) { if(!h.combo){ habCd[h.id]=0; usarHabilidade(h); usadas++; } }
    await new Promise(r=>setTimeout(r,2500));
    return Object.assign(inicio, {habilidadesUsadas: usadas, aindaVivo: player.alive,
      apocalipse: S.apocalipse, aliados: aliados.length, fps60: true});
  });
  await p.screenshot({path:'v41-partida.png'});

  // 3. o HUD com os tracinhos de onda
  out.hud = await p.evaluate(()=>({
    fase: document.getElementById('hud-fase').textContent,
    onda: document.getElementById('hud-fase-label').textContent,
    tracinhos: document.querySelectorAll('#hud-ondas i').length,
    agora: document.querySelectorAll('#hud-ondas i.agora').length,
    vida: document.getElementById('hud-hp-txt').textContent
  }));

  // 4. barra de habilidades toda dentro da tela
  out.habilidades = await p.evaluate(()=>{
    const bs=[...document.querySelectorAll('#hab-bar .hab-btn')];
    const fora = bs.filter(e=>{const r=e.getBoundingClientRect();
      return r.left<-1||r.top<-1||r.right>window.innerWidth+1||r.bottom>window.innerHeight+1;});
    return {total:bs.length, fora:fora.length, tamanho:document.getElementById('hab-bar').style.getPropertyValue('--hab-tam')};
  });

  // 5. mensagem do admin com texto longo inteiro
  out.recado = await p.evaluate(async()=>{
    const t='Atencao pilotos! Neste fim de semana o evento Chuva de Cristais esta ligado: tudo vale o dobro ate domingo a noite. Aproveitem!';
    MUNDO.aviso={texto:t, de:'Cr1cket', tipo:'festa', ate:Date.now()+9e5, quando:Date.now()};
    mundoMostrarAviso();
    await new Promise(r=>setTimeout(r,450));   // deixa a animacao terminar
    const el=document.getElementById('aviso-global');
    const sp=el.querySelector('span');
    const r=el.getBoundingClientRect();
    const hud=[...document.querySelectorAll('#hud .hud-col')].map(c=>c.getBoundingClientRect());
    return {inteiro: sp.textContent===t, letras: sp.textContent.length,
            largura: Math.round(r.width), dentro: r.right<=window.innerWidth+1 && r.left>=-1,
            abaixoDoHud: hud.every(h=>!h.height || r.top >= h.bottom - 1)};
  });
  await p.screenshot({path:'v41-partida-recado.png'});

  // 6. fim da fase
  out.fim = await p.evaluate(async()=>{
    S.waveIdx=S.nWaves; enemies.length=0; boss=null; S.toSpawn=0;
    faseVictory();
    await new Promise(r=>setTimeout(r,500));
    const cx=document.querySelector('#screen-victory .fim-cartao');
    const r=cx.getBoundingClientRect();
    return {modo:S.mode, cartaoNaTela: r.top>=-1 && r.bottom<=window.innerHeight+1,
            premios:[...document.querySelectorAll('#screen-victory .fim-premio')]
              .filter(e=>getComputedStyle(e).display!=='none').map(e=>e.textContent.trim()),
            placar:[...document.querySelectorAll('#screen-victory .fim-cx')].map(e=>e.textContent.trim())};
  });
  await p.screenshot({path:'v41-fim.png'});

  out.errs=errs;
  console.log(JSON.stringify(out,null,1));
  await b.close();
})().catch(e=>{console.log('FATAL '+e.message.split('\n')[0]);process.exit(1)});
