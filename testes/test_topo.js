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
  await p.evaluate(()=>{ ROOT.profiles['Davi']=defaultSave(); ROOT.current='Davi';
    save=ROOT.profiles['Davi']; save.__name='Davi'; save.best=40; calcStats(); persist(); goMenu(); });
  await p.waitForTimeout(900);

  const medir = async (nome) => p.evaluate((n)=>{
    const st=getComputedStyle(document.documentElement);
    const topo=parseFloat(st.getPropertyValue('--safe-top'))||0;
    const vis=[...document.querySelectorAll('.screen,.page')].filter(e=>getComputedStyle(e).display!=='none');
    const alvo=vis[vis.length-1];
    const filhos=[...alvo.querySelectorAll('*')].filter(e=>{
      const r=e.getBoundingClientRect(); const c=getComputedStyle(e);
      return r.width>4&&r.height>4&&c.visibility!=='hidden'&&c.display!=='none'&&c.position!=='fixed';
    });
    const abas=[...document.querySelectorAll('.abas,.aba-linha,#loja-abas')].find(e=>e.getBoundingClientRect().height>4);
    let min=9999, quem='';
    for(const e of filhos){ const r=e.getBoundingClientRect(); if(r.top<min){min=r.top;quem=(e.id||e.className||e.tagName)+'';} }
    const seta=[...document.querySelectorAll('.back-btn')].find(e=>e.getBoundingClientRect().height>4);
    const sr=seta?seta.getBoundingClientRect():null;
    return { tela:n, safeTop:topo, primeiroTopo:Math.round(min), quem:String(quem).slice(0,40),
             seta: sr?{top:Math.round(sr.top),h:Math.round(sr.height)}:null,
             abasTopo: abas?Math.round(abas.getBoundingClientRect().top):null,
             alturaConteudo: Math.round(alvo.scrollHeight) };
  }, nome);

  out.menu = await medir('menu');
  await p.screenshot({path:'topo-menu.png'});
  await p.tap('#btn-loja');
  await p.waitForTimeout(900);
  out.loja = await medir('loja');
  await p.screenshot({path:'topo-loja.png'});

  // agora simulando um iPhone com notch (env = 47px)
  await p.evaluate(()=>document.documentElement.style.setProperty('--safe-top','47px'));
  await p.waitForTimeout(400);
  out.lojaNotch = await medir('loja com notch');
  await p.screenshot({path:'topo-loja-notch.png'});
  await p.evaluate(()=>goMenu()); await p.waitForTimeout(700);
  out.menuNotch = await medir('menu com notch');
  await p.screenshot({path:'topo-menu-notch.png'});

  out.errs=errs;
  console.log(JSON.stringify(out,null,1));
  await b.close();
})().catch(e=>{console.log('FATAL '+e.message.split('\n')[0]);process.exit(1)});
