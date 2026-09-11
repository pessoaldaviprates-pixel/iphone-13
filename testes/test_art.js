const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const c = await b.newContext({ viewport:{width:390,height:844}, isMobile:true, hasTouch:true });
  const p = await c.newPage(); const errs=[];
  p.on('pageerror', e=>errs.push(e.message));
  await p.addInitScript(()=>{ try{localStorage.clear();}catch(e){} });
  await p.goto('file:///tmp/claude-0/-home-user-iphone-13/b7a1aae1-35a1-5214-9848-2da99e219fb6/scratchpad/neon-nebula-artifact.html');
  await p.waitForTimeout(1500);
  const out = await p.evaluate(()=>({ versao: VERSAO, perfis: Object.keys(ROOT.profiles), modo: S.mode, naves: SHIPS.length }));
  await p.screenshot({ path:'art-login.png' });
  console.log(JSON.stringify({out, errs}));
  await b.close(); process.exit(errs.length?1:0);
})().catch(e=>{console.error('FATAL',e.message);process.exit(2);});
