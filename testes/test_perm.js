const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
const fs = require('fs');
const URL=JOGO + '?nuvem=http://127.0.0.1:8099';
const fim=c=>{process.exit(c);};
async function painel(pg, nick, chave){
  await pg.goto(URL); await pg.waitForTimeout(900);
  await pg.click('#btn-goto-adm'); await pg.waitForTimeout(300);
  await pg.fill('#adm-nick', nick); await pg.fill('#adm-pass', chave);
  await pg.click('#btn-adm-enter'); await pg.waitForTimeout(2500); await pg.evaluate(()=>admIrPara('equipe')); await pg.waitForTimeout(500);
}
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const errs=[],out={};
  const mk=()=>b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});

  /* --- 1. as caixinhas aparecem ANTES de adicionar --- */
  const c1=await mk(); const dono=await c1.newPage();
  dono.on('pageerror',e=>errs.push('DONO: '+e.message));
  await painel(dono,'Cr1cket','neonadmin');
  out.antesDeAdicionar = await dono.evaluate(()=>({
    caixinhas: document.querySelectorAll('#eq-novo-perms .eq-p').length,
    marcadas: document.querySelectorAll('#eq-novo-perms .eq-p.on').length,
    cabecalho: document.querySelector('.eq-novo-cab span').textContent,
    grupos: [...document.querySelectorAll('#eq-novo-perms .eq-grupo')].map(e=>e.textContent)
  }));
  await dono.evaluate(()=>document.getElementById('adm-equipe').scrollIntoView({block:'start'}));
  await dono.waitForTimeout(400);
  await dono.screenshot({path:'v38-antes.png'});

  /* --- 2. marcar coisas personalizadas muda o cargo para PERSONALIZADO --- */
  await dono.evaluate(()=>{
    const acha = t => [...document.querySelectorAll('#eq-novo-perms .eq-p')].find(e=>e.textContent.includes(t));
    acha('Ver os jogadores').click();
  });
  await dono.waitForTimeout(300);
  await dono.evaluate(()=>{
    const acha = t => [...document.querySelectorAll('#eq-novo-perms .eq-p')].find(e=>e.textContent.includes(t));
    acha('Assistir a tela').click();
  });
  await dono.waitForTimeout(300);
  out.personalizou = await dono.evaluate(()=>({
    cargo: eqCargoNovo, perms: Object.keys(eqPermsNovo).sort(),
    cargoMarcado: (document.querySelector('.eq-cargo.on')||{}).textContent,
    contagem: document.querySelector('.eq-novo-cab span').textContent
  }));
  await dono.screenshot({path:'v38-personalizado.png'});

  /* --- 3. adiciona com exatamente essas permissões --- */
  await dono.fill('#eq-nick','skibidiADM');
  await dono.click('#eq-add'); await dono.waitForTimeout(1800);
  out.gravado = await dono.evaluate(async()=>{
    const d = await nuvemReq('equipe'); const k=Object.keys(d||{})[0];
    return d ? { nome:d[k].nome, cargo:d[k].cargo, perms:Object.keys(d[k].permissoes||{}).sort(), chave:d[k].chaveVisivel } : null;
  });

  /* --- 4. o dev entra e ve só isso --- */
  const c2=await mk(); const dev=await c2.newPage();
  dev.on('pageerror',e=>errs.push('DEV: '+e.message));
  await painel(dev,'skibidiADM',out.gravado.chave);
  out.dev = { cargo: await dev.evaluate(()=>PERM.cargo),
    cartoes: await dev.evaluate(()=>[...document.querySelectorAll('#adm-panel > .adm-card')]
      .filter(c=>getComputedStyle(c).display!=='none')
      .map(c=>{const h=c.querySelector('.adm-h');return h?h.textContent.replace(/\s+/g,' ').trim().slice(0,30):c.id;})),
    podeAssistir: await dev.evaluate(()=>pode('assistir')),
    podeZerar: await dev.evaluate(()=>pode('zerar')) };
  await dev.screenshot({path:'v38-dev.png'});

  /* --- 5. o dono muda as caixinhas do membro já criado --- */
  await dono.evaluate(()=>{
    const m=[...document.querySelectorAll('.eq-membro')][0];
    [...m.querySelectorAll('.eq-p')].find(e=>e.textContent.includes('Dar coisas')).click();
  });
  await dono.waitForTimeout(1500);
  out.mexeuDepois = await dono.evaluate(async()=>{
    const d = await nuvemReq('equipe'); const k=Object.keys(d||{})[0];
    return Object.keys(d[k].permissoes||{}).sort();
  });

  /* --- 6. com a regra bloqueada, avisa em vez de mentir --- */
  const c3=await mk(); const bloq=await c3.newPage();
  bloq.on('pageerror',e=>errs.push('BLOQ: '+e.message));
  await c3.route('**/127.0.0.1:8099/equipe**', route =>
    route.request().method()==='GET' ? route.continue()
      : route.fulfill({status:401, body:'{"error":"Permission denied"}'}));
  await painel(bloq,'Cr1cket','neonadmin');
  out.bloqueado = { listaAvisa: await bloq.evaluate(()=>document.getElementById('eq-lista').textContent.replace(/\s+/g,' ').slice(0,80)) };
  await bloq.fill('#eq-nick','Fulano');
  await bloq.click('#eq-add'); await bloq.waitForTimeout(1500);
  out.bloqueado.aoAdicionar = await bloq.evaluate(()=>document.getElementById('adm-msg').textContent.slice(0,110));
  await bloq.screenshot({path:'v38-bloqueado.png'});

  console.log(JSON.stringify({out,errs},null,1));
  await b.close(); fim(errs.length?1:0);
})().catch(e=>{console.error('FATAL',String(e).split('\n').slice(0,3).join(' | '));fim(2);});
