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
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',
    args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
  const errs=[],out={};
  const mk=()=>b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const c1=await mk(); const jog=await c1.newPage();
  jog.on('pageerror',e=>errs.push('JOG: '+e.message));
  await novo(jog,'Jogador',[0,1,2,5]);
  await jog.evaluate(()=>{ startGame(20); }); await jog.waitForTimeout(1000);
  const base = await jog.evaluate(()=>({dmg:+ST.dmg.toFixed(3), hp:ST.maxHp,
    cris:+ST.crystalMult.toFixed(3), tiro:+ST.fireInterval.toFixed(4)}));

  const c2=await mk(); const adm=await c2.newPage();
  adm.on('pageerror',e=>errs.push('ADM: '+e.message));
  await adm.goto(URL); await adm.waitForTimeout(800);
  await adm.click('#btn-goto-adm'); await adm.waitForTimeout(300);
  await adm.fill('#adm-nick','Cr1cket'); await adm.fill('#adm-pass','neonadmin'); await adm.click('#btn-adm-enter'); await adm.waitForTimeout(2000);
  out.painel = await adm.evaluate(()=>({
    eventos: document.querySelectorAll('#lista-eventos .mundo-op').length,
    boosts: document.querySelectorAll('#lista-boosts .mundo-op').length,
    trolls: document.querySelectorAll('#lista-trolls .mundo-op').length,
    recadosProntos: document.querySelectorAll('#msg-rapidas .msg-rapida').length,
    cartoes: [...document.querySelectorAll('#adm-panel .adm-card')].filter(c=>c.style.display!=='none').length
  }));

  /* --- 1. recado global --- */
  await adm.evaluate(()=>{try{admIrPara('mundo')}catch(e){}}); await adm.waitForTimeout(300);
  await adm.fill('#msg-texto','Bom jogo a todos, pessoal!');
  await adm.selectOption('#msg-tipo','festa');
  await adm.fill('#msg-tempo','120');
  await adm.click('#msg-enviar'); await adm.waitForTimeout(1500);
  out.recado = await jog.evaluate(()=>({
    visivel: document.getElementById('aviso-global').classList.contains('on'),
    texto: document.getElementById('aviso-global').textContent,
    classe: document.getElementById('aviso-global').className
  }));
  await jog.screenshot({path:'v33-recado.png'});

  /* --- 2. boosts com multiplicador e horas --- */
  await adm.evaluate(()=>{ document.getElementById('bo-mult-cristais').value='7';
                           document.getElementById('bo-hora-cristais').value='3'; });
  await adm.evaluate(()=>{ const d=[...document.querySelectorAll('#lista-boosts .mundo-op')]
    .find(e=>e.textContent.includes('CRISTAIS')); d.querySelector('.adm-btn').click(); });
  await adm.waitForTimeout(1500);
  await adm.evaluate(()=>{ document.getElementById('bo-mult-dano').value='4';
                           document.getElementById('bo-hora-dano').value='1'; });
  await adm.evaluate(()=>{ const d=[...document.querySelectorAll('#lista-boosts .mundo-op')]
    .find(e=>e.textContent.includes('DANO')); d.querySelector('.adm-btn').click(); });
  await adm.waitForTimeout(1500);
  out.boost = await jog.evaluate(()=>({
    multCris: mundoMult('cristais'), multDano: mundoMult('dano'),
    dmg:+ST.dmg.toFixed(3), cris:+ST.crystalMult.toFixed(3),
    selo: document.getElementById('evento-selo').classList.contains('on'),
    seloTxt: document.getElementById('evento-selo').textContent
  }));
  out.boostConfere = { danoSubiu: out.boost.dmg > base.dmg*3.9 && out.boost.dmg < base.dmg*4.1,
                       crisSubiu: out.boost.cris > base.cris*6.9 && out.boost.cris < base.cris*7.1 };

  /* --- 3. evento com musica e decoracao --- */
  await adm.fill('#ev-tempo','15'); await adm.selectOption('#ev-un','60');
  await adm.evaluate(()=>{ [...document.querySelectorAll('#lista-eventos .mundo-op')]
    .find(e=>e.textContent.includes('NATAL')).click(); });
  await adm.waitForTimeout(1600);
  out.evento = await jog.evaluate(()=>({
    id: eventoAtual()?eventoAtual().id:null,
    decoracao: decoP.length,
    musicaDoEvento: Musica.plano?Musica.plano.bpm:null,
    selo: document.getElementById('evento-selo').textContent
  }));
  await jog.waitForTimeout(1200);
  await jog.screenshot({path:'v33-natal.png'});
  // troca para APOCALIPSE
  await adm.evaluate(()=>{ [...document.querySelectorAll('#lista-eventos .mundo-op')]
    .find(e=>e.textContent.includes('APOCALIPSE')).click(); });
  await adm.waitForTimeout(1800);
  await jog.waitForTimeout(1200);
  out.evento2 = await jog.evaluate(()=>eventoAtual()?eventoAtual().id:null);
  await jog.screenshot({path:'v33-apocalipse.png'});

  /* --- 4. travessuras --- */
  await adm.fill('#tr-tempo','90'); await adm.selectOption('#tr-un','1');
  for (const nome of ['ESPELHO','APAGÃO','INIMIGOS GIGANTES','CONTROLE INVERTIDO']) {
    await adm.evaluate(n=>{ [...document.querySelectorAll('#lista-trolls .mundo-op')]
      .find(e=>e.textContent.includes(n)).click(); }, nome);
    await adm.waitForTimeout(700);
  }
  await jog.waitForTimeout(1200);
  out.trolls = await jog.evaluate(()=>({
    espelho: !!mundoAtivo('espelho'), escuro: !!mundoAtivo('escuro'),
    gigante: !!mundoAtivo('gigante'), invertido: !!mundoAtivo('invertido'),
    ritmo: mundoRitmo(), sinal: mundoSinalControle()
  }));
  await jog.evaluate(()=>{ enemies.length=0; for(let i=0;i<6;i++) spawnEnemy('drone'); });
  await jog.waitForTimeout(300);
  out.inimigosGigantes = await jog.evaluate(()=>Math.round(enemies[0].r));
  await jog.screenshot({path:'v33-trolls.png'});

  /* --- 5. o que esta valendo + desligar --- */
  out.agora = await adm.evaluate(()=>document.querySelectorAll('#mundo-agora .mundo-item').length);
  await adm.evaluate(()=>document.getElementById('adm-agora').scrollIntoView({block:'center'}));
  await adm.waitForTimeout(400);
  await adm.screenshot({path:'v33-painel.png'});
  await adm.click('#tr-parar'); await adm.waitForTimeout(1200);
  await adm.click('#boost-parar'); await adm.waitForTimeout(1200);
  await adm.click('#ev-parar'); await adm.waitForTimeout(1200);
  await jog.waitForTimeout(1200);
  out.tudoDesligado = await jog.evaluate(()=>({
    efeitos: Object.keys(MUNDO.efeitos).length, evento: eventoAtual(),
    dmg:+ST.dmg.toFixed(3)
  }));
  out.voltouAoNormal = out.tudoDesligado.dmg === base.dmg;

  /* --- 6. modo caos e ligar tudo --- */
  await adm.click('#boost-tudo'); await adm.waitForTimeout(1500);
  await jog.waitForTimeout(1000);
  out.ligarTudo = await jog.evaluate(()=>BOOSTS.map(b=>mundoMult(b.id)));
  await adm.click('#tr-caos'); await adm.waitForTimeout(1800);
  await jog.waitForTimeout(1000);
  out.caos = await jog.evaluate(()=>Object.keys(MUNDO.efeitos).length);

  console.log(JSON.stringify({out,errs},null,1));
  await b.close(); fim(errs.length?1:0);
})().catch(e=>{console.error('FATAL',String(e).split('\n').slice(0,3).join(' | '));fim(2);});
