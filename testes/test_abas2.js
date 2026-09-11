const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const c=await b.newContext({viewport:{width:360,height:780},isMobile:true,hasTouch:true});
  const p=await c.newPage(); const errs=[];
  p.on('pageerror',e=>errs.push(e.message));
  await p.goto(JOGO + ''); await p.waitForTimeout(1300);
  await p.evaluate(()=>{ ROOT.profiles['T']=defaultSave(); ROOT.current='T'; save=ROOT.profiles['T'];
    save.__name='T'; save.best=60; save.crystals=9e6; calcStats(); goMenu(); });
  await p.waitForTimeout(500);
  const testar=async(nome, prep, sel)=>{
    await p.evaluate(prep); await p.waitForTimeout(700);
    return await p.evaluate((sel)=>{
      const el=document.querySelector(sel);
      if(!el) return {achou:false};
      const st=getComputedStyle(el);
      const rolavel = el.scrollWidth > el.clientWidth+2;
      const antes = el.scrollLeft;
      el.scrollLeft = 200;
      const moveu = el.scrollLeft > antes;
      el.scrollLeft = antes;
      return {achou:true, touchAction:st.touchAction, overflowX:st.overflowX,
              largura:el.scrollWidth+' de '+el.clientWidth, precisaRolar:rolavel, rolou:moveu};
    }, sel);
  };
  const out={};
  out.loja = await testar('loja', ()=>{ S.mode='loja'; renderLoja(); showScreen('loja'); }, '#loja-abas');
  out.amigos = await testar('amigos', ()=>{ S.mode='amigos'; amigosRender(); showScreen('amigos'); }, '#am-abas');
  out.hangar = await testar('hangar', ()=>{ S.mode='hangar'; renderHangar(); showScreen('hangar'); }, '#hangar-filtros');
  out.ranking = await testar('rank', ()=>{ S.mode='rank'; showScreen('rank'); renderRanking(true); }, '#rank-abas');
  out.painel = await testar('adm', ()=>{ S.mode='adm'; showScreen('adm');
    PERM.entrou=true; PERM.dono=true; PERM.nick='Cr1cket'; renderAbasAdm(); }, '#adm-abas');
  out.errs=errs;
  console.log(JSON.stringify(out,null,1));
  await b.close();
})().catch(e=>{console.log('FATAL '+e.message.split('\n')[0]);process.exit(1)});
