const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
const fs = require('fs');
const URL=JOGO + '?nuvem=http://127.0.0.1:8099';
const fim=c=>{process.exit(c);};
async function painel(pg, nick, chave, lembrar){
  await pg.goto(URL); await pg.waitForTimeout(1000);
  await pg.click('#btn-goto-adm'); await pg.waitForTimeout(400);
  if (await pg.evaluate(()=>PERM.entrou)) return;   // entrou sozinho
  await pg.fill('#adm-nick', nick); await pg.fill('#adm-pass', chave);
  if (lembrar === false) await pg.uncheck('#adm-lembrar');
  await pg.click('#btn-adm-enter'); await pg.waitForTimeout(2500);
}
const abas = pg => pg.evaluate(()=>[...document.querySelectorAll('.adm-aba')].map(e=>e.textContent.trim()));
const visiveis = pg => pg.evaluate(()=>[...document.querySelectorAll('#adm-panel > .adm-card')]
  .filter(c=>getComputedStyle(c).display!=='none').map(c=>c.id));
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const errs=[],out={};
  const mk=()=>b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const c1=await mk(); const dono=await c1.newPage();
  dono.on('pageerror',e=>errs.push('DONO: '+e.message));
  await painel(dono,'Cr1cket','neonadmin');

  /* --- 1. abas de topo --- */
  out.abas = await abas(dono);
  out.primeiraAba = await dono.evaluate(()=>abaAdm);
  out.cartoesVisiveis = await visiveis(dono);
  await dono.screenshot({path:'v39-abas.png'});

  /* --- 2. cada aba mostra só o seu --- */
  out.porAba = {};
  for (const nome of ['👤 JOGADORES','⚡ AÇÕES','🌍 MUNDO','💡 SUGESTÕES','👥 EQUIPE','🔧 SISTEMA']) {
    await dono.evaluate(n=>{ [...document.querySelectorAll('.adm-aba')].find(e=>e.textContent.includes(n.split(' ')[1])).click(); }, nome);
    await dono.waitForTimeout(500);
    out.porAba[nome] = await visiveis(dono);
  }
  await dono.evaluate(()=>{ [...document.querySelectorAll('.adm-aba')].find(e=>e.textContent.includes('MUNDO')).click(); });
  await dono.waitForTimeout(400);
  await dono.screenshot({path:'v39-mundo.png'});

  /* --- 3. abinhas das ações --- */
  const c2=await mk(); const j=await c2.newPage();
  j.on('pageerror',e=>errs.push('J: '+e.message));
  await j.goto(URL); await j.waitForTimeout(900);
  await j.fill('#new-name','Davi'); await j.click('#btn-new'); await j.waitForTimeout(300);
  for(let i=0;i<2;i++){await j.evaluate(()=>{senhaEstado.seq=[0,1,2,5];senhaEstado.desenhando=true;senhaSoltar();});await j.waitForTimeout(300);}
  await j.evaluate(()=>{ save.crystals=500; persist(); nuvemEnviar(true); contaEnviar(true); });
  await j.waitForTimeout(1200);
  await dono.evaluate(()=>{ [...document.querySelectorAll('.adm-aba')].find(e=>e.textContent.includes('AÇÕES')).click(); });
  await dono.waitForTimeout(600);
  await dono.evaluate(()=>admNuvemCarregar()); await dono.waitForTimeout(1200);
  await dono.evaluate(()=>admNuvemSelecionar(admNuvemLista.find(x=>x.nome==='Davi')));
  await dono.waitForTimeout(700);
  out.subAbas = await dono.evaluate(()=>[...document.querySelectorAll('.sub-aba')].map(e=>e.textContent.trim()));
  out.paneVisivel = await dono.evaluate(()=>['pane-dar','pane-tirar','pane-inv','pane-caixa']
    .filter(i=>getComputedStyle(document.getElementById(i)).display!=='none'));
  await dono.screenshot({path:'v39-acoes-dar.png'});
  for (const [nome, pane] of [['TIRAR','pane-tirar'],['INVENTÁRIO','pane-inv'],['CAIXA','pane-caixa']]) {
    await dono.evaluate(n=>{ [...document.querySelectorAll('.sub-aba')].find(e=>e.textContent.includes(n)).click(); }, nome);
    await dono.waitForTimeout(400);
    out['pane_'+nome] = await dono.evaluate(p=>getComputedStyle(document.getElementById(p)).display, pane);
  }
  await dono.screenshot({path:'v39-acoes-caixa.png'});
  // dar algo e ver o contador na abinha
  await dono.evaluate(()=>{ [...document.querySelectorAll('.sub-aba')].find(e=>e.textContent.includes('DAR')).click(); });
  await dono.waitForTimeout(300);
  await dono.evaluate(()=>{try{admIrPara('acoes','dar')}catch(e){}}); await dono.waitForTimeout(300);
  await dono.fill('#adm-nuvem-gem','1000'); await dono.click('#adm-nuvem-dar'); await dono.waitForTimeout(400);
  out.contadorCaixa = await dono.evaluate(()=>
    [...document.querySelectorAll('.sub-aba')].find(e=>e.textContent.includes('CAIXA')).textContent.trim());

  /* --- 4. equipe: tirar de vez --- */
  await dono.evaluate(()=>{ [...document.querySelectorAll('.adm-aba')].find(e=>e.textContent.includes('EQUIPE')).click(); });
  await dono.waitForTimeout(600);
  await dono.fill('#eq-nick','skibidiADM'); await dono.click('#eq-add'); await dono.waitForTimeout(1800);
  out.criou = await dono.evaluate(async()=>{ const d=await nuvemReq('equipe'); return d?Object.keys(d).length:0; });
  await dono.evaluate(()=>{ const m=[...document.querySelectorAll('.eq-membro')][0];
    [...m.querySelectorAll('.eq-acoes button')].find(b=>b.textContent.includes('TIRAR DO ADM')).click(); });
  await dono.waitForTimeout(500);
  out.pediuConfirma = await dono.evaluate(()=>{ const m=[...document.querySelectorAll('.eq-membro')][0];
    return [...m.querySelectorAll('.eq-acoes button')].some(b=>b.textContent.includes('TOQUE DE NOVO')); });
  await dono.evaluate(()=>{ const m=[...document.querySelectorAll('.eq-membro')][0];
    [...m.querySelectorAll('.eq-acoes button')].find(b=>b.textContent.includes('TOQUE DE NOVO')).click(); });
  await dono.waitForTimeout(1800);
  out.tirouDeVez = await dono.evaluate(async()=>{ const d=await nuvemReq('equipe'); return d?Object.keys(d).length:0; });

  /* --- 5. continuar conectado no painel --- */
  await dono.reload(); await dono.waitForTimeout(1200);
  await dono.click('#btn-goto-adm'); await dono.waitForTimeout(2500);
  out.painelLembrou = await dono.evaluate(()=>({entrou:PERM.entrou, nick:PERM.nick}));
  await dono.evaluate(()=>document.getElementById('quem-sair').click());
  await dono.waitForTimeout(400);
  await dono.reload(); await dono.waitForTimeout(1000);
  await dono.click('#btn-goto-adm'); await dono.waitForTimeout(1500);
  out.depoisDeSair = await dono.evaluate(()=>PERM.entrou);

  /* --- 6. continuar conectado no jogo --- */
  out.jogoAntes = await j.evaluate(()=>({modo:S.mode, lembrado:pilotoLembrado()}));
  await j.reload(); await j.waitForTimeout(2000);
  out.jogoDepoisDeRecarregar = await j.evaluate(()=>({modo:S.mode, piloto:ROOT.current}));
  await j.evaluate(()=>{ goMenu(); document.getElementById('btn-logout').click(); });
  await j.waitForTimeout(600);
  await j.reload(); await j.waitForTimeout(1500);
  out.depoisDeTrocarPiloto = await j.evaluate(()=>({modo:S.mode, lembrado:pilotoLembrado()}));

  console.log(JSON.stringify({out,errs},null,1));
  await b.close(); fim(errs.length?1:0);
})().catch(e=>{console.error('FATAL',String(e).split('\n').slice(0,3).join(' | '));fim(2);});
