const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
const fs = require('fs');
const URL=JOGO + '?nuvem=http://127.0.0.1:8099';
const fim=c=>{process.exit(c);};
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const errs=[],out={};
  const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const p=await c.newPage();
  p.on('pageerror',e=>errs.push('P: '+e.message));
  await p.goto(URL); await p.waitForTimeout(900);
  await p.fill('#new-name','Fraco'); await p.click('#btn-new'); await p.waitForTimeout(300);
  for(let i=0;i<2;i++){await p.evaluate(x=>{senhaEstado.seq=x.slice();senhaEstado.desenhando=true;senhaSoltar();},[0,1,2,5]);await p.waitForTimeout(280);}
  await p.waitForTimeout(800);

  /* 1) o botão novo existe e leva ao multijogador */
  /* Desde a v8.2 ele mora dentro de JOGAR, junto dos outros jeitos de
     entrar numa partida. Ate a v8.1 ficava numa porta chamada COM
     AMIGOS, do lado de "conversar com amigos" -- dois assuntos
     diferentes com o mesmo nome, e por isso ninguem achava. O teste
     entra pelo mesmo caminho que o dedo do jogador faz. */
  await p.tap('#btn-play'); await p.waitForTimeout(500);
  out.botao = await p.evaluate(()=>{
    const l = document.querySelector('[data-ir="btn-multi"]');
    return { existe: !!l, texto: l ? l.textContent.replace(/\s+/g,' ').trim() : null,
             visivel: l ? getComputedStyle(l).display !== 'none' : false };
  });
  await p.tap('[data-ir="btn-multi"]'); await p.waitForTimeout(700);
  out.abriu = await p.evaluate(()=>({
    tela: S.mode,
    abaLigada: (document.querySelector('#multi-abas .aba.on')||{textContent:''}).textContent.trim(),
    jornadaVisivel: document.getElementById('multi-jornada').style.display,
    abas: [...document.querySelectorAll('#multi-abas .aba')].map(x=>x.textContent.trim())
  }));
  /* a aba do cooperativo abre */
  out.coop = await p.evaluate(()=>{
    trocarAbaMulti('coop');
    return { visivel: document.getElementById('multi-coop').style.display,
             criar: !!document.getElementById('coop-criar'),
             botaoVisivel: getComputedStyle(document.getElementById('coop-criar')).display !== 'none' };
  });

  /* 2) no menu o jogo fica parado */
  await p.evaluate(()=>{ goMenu(); window.__d=0; const o=window.draw; window.draw=function(){window.__d++;return o.apply(this,arguments);} });
  await p.waitForTimeout(1500);
  out.menuParado = await p.evaluate(()=>({ desenhos: window.__d, modo: S.mode }));

  /* quadros por segundo no menu */
  out.fpsMenu = await p.evaluate(()=>new Promise(res=>{
    let n=0; const t0=performance.now();
    (function volta(){ n++; if(performance.now()-t0<1200) requestAnimationFrame(volta);
      else res(Math.round(n/((performance.now()-t0)/1000))); })();
  }));

  /* 3) jogando volta a desenhar */
  await p.evaluate(()=>{ window.__d=0; startGame(3); });
  await p.waitForTimeout(1200);
  out.jogando = await p.evaluate(()=>({ desenhos: window.__d, modo: S.mode }));

  /* 4) voltar ao menu para de novo */
  await p.evaluate(()=>{ window.__d=0; goMenu(); });
  await p.waitForTimeout(1200);
  out.voltouAoMenu = await p.evaluate(()=>({ desenhos: window.__d, modo: S.mode }));

  /* 5) no modo leve o menu perde os enfeites caros */
  out.leve = await p.evaluate(()=>{
    qAplicar(0,'teste'); Q.travado = true;
    const est = getComputedStyle(document.getElementById('screen-menu'), '::before');
    const play = document.getElementById('btn-play');
    return { classe: document.body.className.trim(),
             ceuAnimado: est.animationName,
             playBrilho: getComputedStyle(play, '::after').display };
  });
  out.erros = errs;
  console.log(JSON.stringify(out,null,1));
  await b.close(); fim(errs.length?1:0);
})().catch(e=>{console.error('FATAL',e.message);fim(1);});
