const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const errs=[]; const out={};
  const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  p.on('pageerror',e=>errs.push(e.message));
  await p.goto(JOGO + '?nuvem=http://127.0.0.1:8099');
  await p.waitForTimeout(1200);
  const notch=()=>p.evaluate(()=>document.documentElement.style.setProperty('--safe-top','47px'));
  await notch();
  // tela de entrada
  out.login = await p.evaluate(()=>{
    const e=document.querySelector('#screen-login .brand'); const r=e.getBoundingClientRect();
    return {topo:Math.round(r.top)};
  });
  await p.screenshot({path:'topo-login.png'});
  await p.evaluate(()=>{ ROOT.profiles['Davi']=defaultSave(); ROOT.current='Davi';
    save=ROOT.profiles['Davi']; save.__name='Davi'; calcStats(); persist(); goMenu(); });
  await p.waitForTimeout(700); await notch();
  const topoDe = async (nome,fn)=>{
    await p.evaluate(fn); await p.waitForTimeout(700); await notch(); await p.waitForTimeout(200);
    const r = await p.evaluate(()=>{
      const vis=[...document.querySelectorAll('.page,.screen')].filter(e=>getComputedStyle(e).display!=='none');
      const alvo=vis[vis.length-1];
      const cab=alvo.querySelector('.page-head');
      const seta=alvo.querySelector('.back-btn'), tit=alvo.querySelector('.page-title');
      const abas=alvo.querySelector('.abas,.aba-linha,[id$="-abas"]');
      const t=e=>e?Math.round(e.getBoundingClientRect().top):null;
      return { id:alvo.id, seta:t(seta), titulo:t(tit), abas:t(abas), cabAlt:cab?Math.round(cab.getBoundingClientRect().height):null };
    });
    out[nome]=r;
  };
  await topoDe('hangar', ()=>document.getElementById('btn-hangar').click());
  await topoDe('ranking', ()=>{goMenu(); document.getElementById('btn-rank').click();});
  await topoDe('novidades', ()=>{goMenu(); document.getElementById('btn-novidades').click();});
  await topoDe('painel', ()=>{ S.mode='adm'; showScreen('adm'); });
  await p.screenshot({path:'topo-painel.png'});
  out.errs=errs;
  console.log(JSON.stringify(out,null,1));
  await b.close();
})().catch(e=>{console.log('FATAL '+e.message.split('\n')[0]);process.exit(1)});
