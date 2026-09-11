const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
const fs = require('fs');
const URL=JOGO + '?nuvem=http://127.0.0.1:8099';
const fim=c=>{process.exit(c);};
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const errs=[],out={};
  const mk=()=>b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const c1=await mk(); const p1=await c1.newPage();
  p1.on('pageerror',e=>errs.push('P1: '+e.message));
  await p1.goto(URL); await p1.waitForTimeout(800);
  await p1.fill('#new-name','Alvo'); await p1.click('#btn-new'); await p1.waitForTimeout(300);
  for(let i=0;i<2;i++){await p1.evaluate(()=>{senhaEstado.seq=[0,1,2,5];senhaEstado.desenhando=true;senhaSoltar();});await p1.waitForTimeout(280);}
  await p1.waitForTimeout(400);
  await p1.evaluate(()=>{
    save.ships=[0,1,2,3,4,5];
    save.amulets=[{uid:1,type:'vida',rar:2},{uid:2,type:'dano',rar:3},{uid:3,type:'escudo',rar:1}];
    save.equipped=[1,2];
    save.skills={atk10:1,atk20:1,def10:1,res10:1};
    save.upgrades={dmg:12,rate:8,hull:4,shield:3,speed:6,luck:9};
    save.parts={0:{cannon:4,turbine:3},2:{armor:5}};
    save.crystals=77000;
    persist(); nuvemEnviar(true); contaEnviar(true);
  });
  await p1.waitForTimeout(1500);
  out.antes = await p1.evaluate(()=>({naves:save.ships.slice(),amuletos:save.amulets.map(a=>a.uid),
    hab:Object.keys(save.skills),up:JSON.parse(JSON.stringify(save.upgrades)),
    pecas:Object.keys(save.parts),cris:save.crystals}));

  const c2=await mk(); const adm=await c2.newPage();
  adm.on('pageerror',e=>errs.push('ADM: '+e.message));
  await adm.goto(URL); await adm.waitForTimeout(800);
  await adm.click('#btn-goto-adm'); await adm.waitForTimeout(300);
  await adm.fill('#adm-nick','Cr1cket'); await adm.fill('#adm-pass','neonadmin'); await adm.click('#btn-adm-enter'); await adm.waitForTimeout(2000); await adm.evaluate(()=>admIrPara('acoes','inv')); await adm.waitForTimeout(500);
  await adm.evaluate(()=>admNuvemSelecionar(admNuvemLista.find(x=>x.nome==='Alvo')));
  await adm.waitForTimeout(400);
  await adm.evaluate(()=>{try{admIrPara('acoes','inv')}catch(e){}}); await adm.waitForTimeout(300);
  await adm.click('#inv-abrir'); await adm.waitForTimeout(1500);
  out.invCarregou = await adm.evaluate(()=>!!invConta);
  // conta itens em cada aba
  out.abas = {};
  for (const a of ['naves','amuletos','hab','melhorias','pecas']) {
    await adm.evaluate(x=>{ invAba=x; invRender(); }, a);
    await adm.waitForTimeout(250);
    out.abas[a] = await adm.evaluate(()=>document.querySelectorAll('#inv-box .inv-item').length);
  }
  // marca UM de cada tipo
  await adm.evaluate(()=>{
    invAba='naves'; invRender();
    invMarcado.naves[3]=1; invMarcado.naves[4]=1;
    invMarcado.amuletos[2]=1;
    invMarcado.hab['atk20']=1;
    invMarcado.pecas[0]=1;
    invNiveis.dmg=2;
    invMandarParaCaixa();
  });
  await adm.waitForTimeout(500);
  out.caixa = await adm.evaluate(()=>JSON.parse(JSON.stringify(caixaAdm)));
  await adm.evaluate(()=>{try{admIrPara('acoes','caixa')}catch(e){}}); await adm.waitForTimeout(300);
  out.caixaNaTela = await adm.evaluate(()=>[...document.querySelectorAll('#caixa-itens .caixa-item')].map(e=>e.textContent.replace('✕','').trim()));
  await adm.click('#caixa-enviar'); await adm.waitForTimeout(1500);
  out.pacoteNaNuvem = await adm.evaluate(async()=>{ const g=await nuvemReq('presentes');
    return g?g[Object.keys(g)[0]]:null; });

  // o jogador recebe
  await p1.evaluate(()=>nuvemVerificarPresentes()); await p1.waitForTimeout(1500);
  out.depois = await p1.evaluate(()=>({naves:save.ships.slice(),amuletos:save.amulets.map(a=>a.uid),
    equipados:save.equipped.slice(),hab:Object.keys(save.skills),
    up:JSON.parse(JSON.stringify(save.upgrades)),pecas:Object.keys(save.parts),cris:save.crystals}));
  console.log(JSON.stringify({out,errs},null,1));
  await b.close(); fim(errs.length?1:0);
})().catch(e=>{console.error('FATAL',String(e).split('\n').slice(0,3).join(' | '));fim(2);});
