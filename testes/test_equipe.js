const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
const fs = require('fs');
const URL=JOGO + '?nuvem=http://127.0.0.1:8099';
const fim=c=>{process.exit(c);};
async function entrarPainel(pg, nick, chave){
  await pg.goto(URL); await pg.waitForTimeout(900);
  await pg.click('#btn-goto-adm'); await pg.waitForTimeout(300);
  await pg.fill('#adm-nick', nick);
  await pg.fill('#adm-pass', chave);
  await pg.click('#btn-adm-enter'); await pg.waitForTimeout(2500); await pg.evaluate(()=>admIrPara('equipe')); await pg.waitForTimeout(500);
}
const visiveis = pg => pg.evaluate(()=>[...document.querySelectorAll('#adm-panel > .adm-card')]
  .filter(c=>getComputedStyle(c).display!=='none')
  .map(c=>{ const h=c.querySelector('.adm-h'); return h?h.textContent.replace(/\s+/g,' ').trim().slice(0,34):c.id; }));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const errs=[],out={};
  const mk=()=>b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});

  /* --- 1. o dono entra e ve tudo --- */
  const c1=await mk(); const dono=await c1.newPage();
  dono.on('pageerror',e=>errs.push('DONO: '+e.message));
  await entrarPainel(dono, 'Cr1cket', 'neonadmin');
  out.dono = { entrou: await dono.evaluate(()=>PERM.entrou && PERM.dono),
               quem: await dono.evaluate(()=>document.getElementById('quem-cargo').textContent),
               cartoes: (await visiveis(dono)).length };
  out.donoCartoes = await visiveis(dono);
  await dono.evaluate(()=>document.getElementById('adm-equipe').scrollIntoView({block:'start'}));
  await dono.waitForTimeout(400);
  await dono.screenshot({path:'v37-dono-equipe.png'});

  /* --- 2. adiciona o skibidiADM como DESENVOLVEDOR --- */
  await dono.fill('#eq-nick','skibidiADM');
  await dono.evaluate(()=>{ [...document.querySelectorAll('.eq-cargo')].find(e=>e.textContent.includes('DESENVOLVEDOR')).click(); });
  await dono.waitForTimeout(300);
  await dono.click('#eq-add'); await dono.waitForTimeout(1800);
  out.adicionado = await dono.evaluate(async()=>{
    const d = await nuvemReq('equipe');
    const k = Object.keys(d||{})[0];
    return d ? { nome:d[k].nome, cargo:d[k].cargo, perms:Object.keys(d[k].permissoes||{}), chave:d[k].chaveVisivel } : null;
  });
  await dono.evaluate(()=>document.getElementById('adm-equipe').scrollIntoView({block:'start'}));
  await dono.waitForTimeout(500);
  await dono.screenshot({path:'v37-membro.png'});

  /* --- 3. o skibidiADM entra e ve SO o que foi liberado --- */
  const chave = out.adicionado.chave;
  const c2=await mk(); const dev=await c2.newPage();
  dev.on('pageerror',e=>errs.push('DEV: '+e.message));
  await entrarPainel(dev, 'skibidiADM', chave);
  out.dev = { entrou: await dev.evaluate(()=>PERM.entrou), dono: await dev.evaluate(()=>PERM.dono),
              cargo: await dev.evaluate(()=>PERM.cargo),
              cartoes: await visiveis(dev),
              podeSug: await dev.evaluate(()=>pode('sugVer')),
              podeZerar: await dev.evaluate(()=>pode('zerar')),
              podeEquipe: await dev.evaluate(()=>pode('equipe')),
              podeVerLista: await dev.evaluate(()=>pode('verLista')) };
  await dev.screenshot({path:'v37-dev.png'});

  /* --- 4. chave errada nao entra --- */
  const c3=await mk(); const falso=await c3.newPage();
  falso.on('pageerror',e=>errs.push('FALSO: '+e.message));
  await entrarPainel(falso, 'skibidiADM', 'XXXXXX');
  out.chaveErrada = { entrou: await falso.evaluate(()=>PERM.entrou),
                      aviso: await falso.evaluate(()=>document.getElementById('adm-pass-note').textContent) };
  await entrarPainel(falso, 'Hacker', 'neonadmin');
  out.nickDesconhecido = { entrou: await falso.evaluate(()=>PERM.entrou),
                           aviso: await falso.evaluate(()=>document.getElementById('adm-pass-note').textContent) };

  /* --- 5. o dono muda o cargo e o dev ve diferente --- */
  await dono.evaluate(()=>{ const m=[...document.querySelectorAll('.eq-membro')][0];
    [...m.querySelectorAll('.eq-acoes button')].find(b=>b.textContent==='🛡').click(); });
  await dono.waitForTimeout(1800);
  const c4=await mk(); const dev2=await c4.newPage();
  dev2.on('pageerror',e=>errs.push('DEV2: '+e.message));
  await entrarPainel(dev2, 'skibidiADM', chave);
  out.viraModerador = { cargo: await dev2.evaluate(()=>PERM.cargo),
                        cartoes: await visiveis(dev2),
                        podeVerLista: await dev2.evaluate(()=>pode('verLista')),
                        podeAssistir: await dev2.evaluate(()=>pode('assistir')),
                        podeZerar: await dev2.evaluate(()=>pode('zerar')) };
  await dev2.screenshot({path:'v37-mod.png'});

  /* --- 6. pausar corta o acesso --- */
  await dono.evaluate(()=>{ const m=[...document.querySelectorAll('.eq-membro')][0];
    [...m.querySelectorAll('.eq-acoes button')].find(b=>b.textContent==='PAUSAR').click(); });
  await dono.waitForTimeout(1500);
  const c5=await mk(); const dev3=await c5.newPage();
  dev3.on('pageerror',e=>errs.push('DEV3: '+e.message));
  await entrarPainel(dev3, 'skibidiADM', chave);
  out.pausado = { entrou: await dev3.evaluate(()=>PERM.entrou),
                  aviso: await dev3.evaluate(()=>document.getElementById('adm-pass-note').textContent) };

  console.log(JSON.stringify({out,errs},null,1));
  await b.close(); fim(errs.length?1:0);
})().catch(e=>{console.error('FATAL',String(e).split('\n').slice(0,3).join(' | '));fim(2);});
