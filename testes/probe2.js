const path = require('path');
const JOGO = 'file://' + path.join('/home/user/iphone-13', 'index.html');
const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const p=await b.newPage({viewport:{width:390,height:844},isMobile:true});
  p.on('pageerror',e=>console.log('PAGEERROR: '+e.message));
  p.on('console',m=>{ if(m.type()==='error') console.log('CONSOLE: '+m.text().slice(0,200)); });
  await p.goto(JOGO+'?nuvem=http://127.0.0.1:8099');
  await p.waitForTimeout(2000);
  const r = await p.evaluate(()=>({
    temT: typeof T, temFrases: typeof FRASES, temIdioma: typeof IDIOMA,
    temConq: typeof CONQUISTAS, temRegras: typeof REGRAS
  }));
  console.log(JSON.stringify(r));
  await b.close();
})();
