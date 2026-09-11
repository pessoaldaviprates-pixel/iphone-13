const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
const fs = require('fs');
const URL=JOGO + '?nuvem=http://127.0.0.1:8099';
const fim=c=>{process.exit(c);};
async function novo(pg,nome,pad){
  await pg.goto(URL); await pg.waitForTimeout(800);
  await pg.fill('#new-name',nome); await pg.click('#btn-new'); await pg.waitForTimeout(300);
  for(let i=0;i<2;i++){await pg.evaluate(p=>{senhaEstado.seq=p.slice();senhaEstado.desenhando=true;senhaSoltar();},pad);await pg.waitForTimeout(280);}
  await pg.waitForTimeout(400);
}
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',
    args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']});
  const errs=[],out={};
  const mk=()=>b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const c1=await mk(); const p1=await c1.newPage();
  p1.on('pageerror',e=>errs.push('P1: '+e.message));
  await novo(p1,'Cr1cket',[0,1,2,5]);
  await p1.evaluate(()=>{ save.best=270; save.crystals=999999; save.hi=999999; persist(); nuvemEnviar(true); });
  await p1.waitForTimeout(1000);

  const c2=await mk(); const p2=await c2.newPage();
  p2.on('pageerror',e=>errs.push('P2: '+e.message));
  await novo(p2,'Mae',[0,3,6,7]);
  await p2.evaluate(()=>{ save.best=40; save.crystals=5000; save.hi=9000; persist(); nuvemEnviar(true); });
  await p2.waitForTimeout(1000);

  const c3=await mk(); const p3=await c3.newPage();
  p3.on('pageerror',e=>errs.push('P3: '+e.message));
  await novo(p3,'Administrador',[0,4,8,7]);
  await p3.evaluate(()=>{ save.best=270; save.crystals=888888; persist(); nuvemEnviar(true); });
  await p3.waitForTimeout(1200);

  /* ---- 1. as contas do adm nao aparecem nas tabelas ---- */
  await p2.click('#btn-rank'); await p2.waitForTimeout(1800);
  out.tabelas = {};
  for (const aba of ['fase','horas','naves']) {
    await p2.evaluate(a=>{ abaRanking=a; renderRanking(false); }, aba);
    await p2.waitForTimeout(500);
    out.tabelas[aba] = await p2.evaluate(()=>
      [...document.querySelectorAll('#rank-list .rank-nome')].map(e=>e.textContent.replace(' (você)','')));
  }
  out.contagem = await p2.evaluate(()=>document.getElementById('rank-count').textContent);
  await p2.screenshot({path:'v28-ranking.png'});
  // continuam existindo na nuvem e na lista online
  out.naNuvem = await p2.evaluate(async()=>(await nuvemListar()).map(x=>x.nome).sort());

  /* ---- 2. o painel ainda ve todo mundo, e da para esconder outros ---- */
  const c4=await mk(); const adm=await c4.newPage();
  adm.on('pageerror',e=>errs.push('ADM: '+e.message));
  await adm.goto(URL); await adm.waitForTimeout(800);
  await adm.click('#btn-goto-adm'); await adm.waitForTimeout(300);
  await adm.fill('#adm-nick','Cr1cket'); await adm.fill('#adm-pass','neonadmin'); await adm.click('#btn-adm-enter'); await adm.waitForTimeout(2000); await adm.evaluate(()=>admIrPara('acoes','dar')); await adm.waitForTimeout(500);
  out.admVeTodos = await adm.evaluate(()=>admNuvemLista.map(x=>x.nome).sort());
  await adm.evaluate(()=>admNuvemSelecionar(admNuvemLista.find(x=>x.nome==='Cr1cket')));
  await adm.waitForTimeout(400);
  await adm.evaluate(()=>admIrPara('acoes','tirar')); await adm.waitForTimeout(300);
  out.botaoParaCricket = await adm.evaluate(()=>document.getElementById('adm-nuvem-ocultar').textContent.trim());
  await adm.evaluate(()=>admNuvemSelecionar(admNuvemLista.find(x=>x.nome==='Mae')));
  await adm.waitForTimeout(400);
  await adm.evaluate(()=>admIrPara('acoes','tirar')); await adm.waitForTimeout(300);
  out.botaoParaMae = await adm.evaluate(()=>document.getElementById('adm-nuvem-ocultar').textContent.trim());
  await adm.evaluate(()=>{try{admIrPara('acoes','dar')}catch(e){}}); await adm.waitForTimeout(300);
  await adm.evaluate(()=>admIrPara('acoes','tirar')); await adm.waitForTimeout(300); await adm.click('#adm-nuvem-ocultar'); await adm.waitForTimeout(1200);
  out.maeEscondida = await adm.evaluate(()=>document.getElementById('adm-nuvem-ocultar').textContent.trim());
  // agora a Mae tambem sumiu da tabela
  await p2.evaluate(()=>{ cacheRanking=null; renderRanking(true); }); await p2.waitForTimeout(1500);
  out.tabelaSemMae = await p2.evaluate(()=>
    [...document.querySelectorAll('#rank-list .rank-nome')].map(e=>e.textContent.replace(' (você)','')));
  await adm.evaluate(()=>admIrPara('acoes','tirar')); await adm.waitForTimeout(300); await adm.click('#adm-nuvem-ocultar'); await adm.waitForTimeout(1200);
  await p2.evaluate(()=>{ cacheRanking=null; renderRanking(true); }); await p2.waitForTimeout(1500);
  out.tabelaComMaeDeVolta = await p2.evaluate(()=>
    [...document.querySelectorAll('#rank-list .rank-nome')].map(e=>e.textContent.replace(' (você)','')));

  /* ---- 3. equilibrio da nave criada ---- */
  out.equilibrio = await p2.evaluate(()=>{
    const mk2=(fmt,pecas)=>{ const d=naveCriadaDef({formato:fmt,pecas,hue:0});
      return {vida:d.baseHp,dano:d.baseDmg,agi:d.baseAgi,peso:d.peso}; };
    const todas = Object.fromEntries(ENCAIXES.map(e=>[e.id,29]));
    const fab = SHIPS.slice(0,NAVES_BASE);
    return {
      maxCriada: mk2(79,todas),
      melhorFabrica: { vida: Math.max(...fab.map(s=>s.baseHp||0)),
                       dano: Math.max(...fab.map(s=>s.baseDmg||0)),
                       agi: Math.round(Math.max(...fab.map(s=>s.baseAgi||0))*100)/100 },
      tanque: mk2(79,{teto:29,baixo:29,escudo:29,dir:29,esq:29}),
      veloz:  mk2(25,{motor:29,tras:29})
    };
  });

  /* ---- 4. editar cobra a diferenca ---- */
  await p2.evaluate(()=>{ save.crystals=60000; persist(); goMenu(); }); await p2.waitForTimeout(400);
  // a oficina esta guardada (CRIAR_NAVE_LIGADO=false): abre por dentro
  await p2.evaluate(()=>{ S.mode='hangar'; renderHangar(); showScreen('hangar'); });
  await p2.waitForTimeout(300);
  await p2.evaluate(()=>abrirConstrutor()); await p2.waitForTimeout(400);
  await p2.evaluate(()=>{ CN.def={formato:0,pecas:{motor:3},nome:'Simples',hue:200}; CN.passo=2; cnRender(); });
  await p2.waitForTimeout(300);
  const c0 = await p2.evaluate(()=>save.crystals);
  await p2.click('#cn-proximo'); await p2.waitForTimeout(900);
  const c1v = await p2.evaluate(()=>save.crystals);
  out.criacao = { gastou: c0-c1v, criadas: await p2.evaluate(()=>save.criadas.length) };
  // agora edita para a versao cara
  await p2.evaluate(()=>{ abrirConstrutor(0); CN.def.pecas=Object.fromEntries(ENCAIXES.map(e=>[e.id,29]));
                          CN.def.formato=79; CN.passo=2; cnRender(); });
  await p2.waitForTimeout(400);
  out.textoBotaoEditar = await p2.evaluate(()=>document.getElementById('cn-proximo').textContent);
  await p2.click('#cn-proximo'); await p2.waitForTimeout(900);
  const c2v = await p2.evaluate(()=>save.crystals);
  out.edicao = { cobrou: c1v-c2v, aindaNoConstrutor: await p2.evaluate(()=>S.mode) };

  console.log(JSON.stringify({out,errs},null,1));
  await b.close(); fim(errs.length?1:0);
})().catch(e=>{console.error('FATAL',String(e).split('\n').slice(0,3).join(' | '));fim(2);});
