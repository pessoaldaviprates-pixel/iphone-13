const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
const fs = require('fs');
const URL=JOGO + '?nuvem=http://127.0.0.1:8099';
const fim=c=>{process.exit(c);};
async function novo(pg,nome,pad){
  await pg.goto(URL); await pg.waitForTimeout(900);
  await pg.fill('#new-name',nome); await pg.click('#btn-new'); await pg.waitForTimeout(300);
  for(let i=0;i<2;i++){await pg.evaluate(p=>{senhaEstado.seq=p.slice();senhaEstado.desenhando=true;senhaSoltar();},pad);await pg.waitForTimeout(280);}
  await pg.waitForTimeout(600);
  await pg.evaluate(()=>nuvemEnviar(true));
  await pg.waitForTimeout(700);
}
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const errs=[],out={};
  const mk=()=>b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const cJ=await mk(); const J=await cJ.newPage();
  J.on('pageerror',e=>errs.push('J: '+e.message));
  await novo(J,'Atrasado',[0,1,2,5]);

  /* finge que este jogador está numa versão velha */
  out.antes = await J.evaluate(()=>({ versao: VERSAO, num: versaoNumero(VERSAO) }));

  /* --- painel: manda todo mundo atualizar --- */
  const cA=await mk(); const A=await cA.newPage();
  A.on('pageerror',e=>errs.push('ADM: '+e.message));
  await A.goto(URL); await A.waitForTimeout(800);
  await A.click('#btn-goto-adm'); await A.waitForTimeout(300);
  await A.fill('#adm-nick','Cr1cket'); await A.fill('#adm-pass','neonadmin');
  await A.click('#btn-adm-enter'); await A.waitForTimeout(2200);
  out.entrou = await A.evaluate(()=>({ entrou: PERM.entrou, dono: PERM.dono }));

  /* sair da tela e voltar NÃO pode pedir senha de novo */
  await A.evaluate(()=>{ S.mode='login'; showScreen('login'); });
  await A.waitForTimeout(400);
  await A.evaluate(()=>admOpen());
  await A.waitForTimeout(600);
  out.voltouSemSenha = await A.evaluate(()=>({
    painelAberto: document.getElementById('adm-panel').style.display,
    senhaVisivel: document.getElementById('adm-pass-row').style.display,
    quem: document.getElementById('quem-nome').textContent
  }));
  out.guardado = await A.evaluate(()=>({ noRoot: !!(ROOT.adm && ROOT.adm.nick),
                                         noLocal: !!storageGet('nn_adm','') }));
  /* mesmo apagando o localStorage, o acesso continua guardado */
  out.sobrevive = await A.evaluate(()=>{ storageSet('nn_adm',''); const d = admGuardado();
                                         return { achou: !!d, nick: d ? d.nick : null }; });

  await A.evaluate(()=>admIrPara('mundo'));
  await A.waitForTimeout(1200);
  out.cartao = await A.evaluate(()=>({
    visivel: document.getElementById('adm-atualiza').style.display,
    versao: document.getElementById('att-versao').textContent,
    linhas: document.querySelectorAll('#att-lista .att-linha').length,
    estado: document.getElementById('att-estado').textContent
  }));

  /* o jogador finge estar atrasado e recebe a ordem */
  await J.evaluate(()=>{ window.__recarregou = 0;
    window.limparTudoERecarregar = function(){ window.__recarregou++; };
    Object.defineProperty(window, 'VERSAO_TESTE', { value: 1 });
  });
  await A.click('#att-todos'); await A.waitForTimeout(2500);
  out.ordem = await A.evaluate(async()=>await nuvemReq('mundo/att'));
  /* como o jogador está na MESMA versão, ele não deve fazer nada */
  out.mesmaVersao = await J.evaluate(()=>window.__recarregou);
  /* agora uma ordem de versão MAIOR: o jogador tem de obedecer sozinho,
     pelo fluxo do mundo, sem ninguém tocar nele */
  await A.evaluate(async()=>{
    await nuvemSoltar('mundo/att', { versao: '9.9', quando: Date.now(),
                                     nota: 'teste de atualização' });
  });
  await J.waitForTimeout(2500);
  out.obedeceu = await J.evaluate(()=>({
    portao: document.getElementById('update-gate').classList.contains('on'),
    texto: document.getElementById('ug-ver').textContent,
    recarregou: window.__recarregou,
    marca: storageGet('nn_att_feita','')
  }));
  /* e não obedece duas vezes à mesma ordem */
  await J.evaluate(()=>{ window.__recarregou = 0; });
  await J.evaluate(async()=>{ obedecerOrdemDeAtualizar(await nuvemReq('mundo/att')); });
  await J.waitForTimeout(1500);
  out.naoRepete = await J.evaluate(()=>window.__recarregou);

  /* ordem individual, pela caixa de presente */
  out.individual = await J.evaluate(async()=>{
    window.__recarregou = 0;
    aplicarPresente(save, { atualizar: '9.9', recado: 'atualiza aí' });
    await new Promise(r=>setTimeout(r,5000));
    return { recarregou: window.__recarregou };
  });
  /* limpa a ordem direto no servidor (as páginas já recarregaram sozinhas,
     que é justamente o que a ordem manda fazer) */
  await fetch('http://127.0.0.1:8099/mundo/att.json', { method: 'DELETE' });
  const conf = await (await fetch('http://127.0.0.1:8099/mundo/att.json')).text();
  out.limpou = conf.trim();
  out.erros = errs;
  console.log(JSON.stringify(out,null,1));
  await b.close(); fim(errs.length?1:0);
})().catch(e=>{console.error('FATAL',e.message);fim(1);});
