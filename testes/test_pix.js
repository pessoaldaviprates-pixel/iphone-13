const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
const URL=JOGO + '?nuvem=http://127.0.0.1:8099';
const fim=c=>process.exit(c);
async function novo(pg,nome,pad){
  await pg.goto(URL); await pg.waitForTimeout(900);
  await pg.fill('#new-name',nome); await pg.click('#btn-new'); await pg.waitForTimeout(300);
  for(let i=0;i<2;i++){await pg.evaluate(p=>{senhaEstado.seq=p.slice();senhaEstado.desenhando=true;senhaSoltar();},pad);await pg.waitForTimeout(280);}
  await pg.waitForTimeout(700);
  await pg.evaluate(()=>nuvemEnviar(true));
  await pg.waitForTimeout(700);
}
const esperar = async (pg, fn, ms=15000) => {
  const t0=Date.now();
  while(Date.now()-t0<ms){ if(await pg.evaluate(fn)) return Math.round(Date.now()-t0); await pg.waitForTimeout(200); }
  return -1;
};
(async()=>{
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const errs=[],out={};
  const mk=()=>b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,permissions:['clipboard-read','clipboard-write']});
  const cJ=await mk(); const J=await cJ.newPage();
  J.on('pageerror',e=>errs.push('J: '+e.message));
  await novo(J,'Comprador',[0,1,2,5]);

  /* 0) sem chave configurada NÃO dá para pagar (nada de dado no código) */
  out.semChave = await J.evaluate(()=>{
    abrirPagamento('vip:30','VIP 30 dias',1.00,{dias:30});
    const t = document.getElementById('pagar-corpo').textContent;
    return { chavePadrao: PAG.chave, aviso: t.indexOf('Pagamento indisponível')>=0,
             mandaFalar: !!document.getElementById('pag-falar2'),
             temPaguei: !!document.getElementById('pag-paguei') };
  });
  /* o dono liga o Pix pelo painel; os dados ficam só na nuvem */
  await J.evaluate(()=>{ pagAplicar({chave:'123.456.789-09',tipo:'CPF',nome:'Teste Do Jogo',cidade:'SAO PAULO'});
    pagFechar(); });
  await J.waitForTimeout(300);

  /* 1) o CRC do Pix está certo (teste conhecido do padrão CRC-16/CCITT-FALSE) */
  out.crc = await J.evaluate(()=>({
    de123456789: pixCRC('123456789'),   // tem de dar 29B1
    esperado: '29B1'
  }));

  /* 2) o código Pix sai com a estrutura certa */
  out.codigo = await J.evaluate(()=>{
    const c = pixCodigo(1.00, 'NEONTESTE');
    const campos = {};
    let i = 0;
    while (i < c.length - 4) {
      const id = c.slice(i,i+2), tam = parseInt(c.slice(i+2,i+4),10);
      campos[id] = c.slice(i+4, i+4+tam);
      i += 4 + tam;
    }
    return { comeca: c.slice(0,6), chaveDentro: (campos['26']||'').indexOf('123.456.789-09') >= 0,
             temPix: (campos['26']||'').indexOf('br.gov.bcb.pix') >= 0,
             moeda: campos['53'], valor: campos['54'], pais: campos['58'],
             nome: campos['59'], cidade: campos['60'],
             crcConfere: c.slice(-4) === pixCRC(c.slice(0,-4)),
             tamanho: c.length };
  });

  /* 3) a tela de pagamento abre com tudo */
  out.tela = await J.evaluate(()=>{
    abrirPagamento('vip:30', 'VIP 30 dias', 1.00, { dias: 30 });
    return { modo: S.mode,
             item: document.getElementById('pagar-item').textContent,
             valor: document.getElementById('pagar-valor').textContent,
             chave: document.getElementById('pag-chave-txt').textContent,
             temCopiarChave: !!document.getElementById('pag-copiar-chave'),
             temCopiarCodigo: !!document.getElementById('pag-copiar-codigo'),
             temPaguei: !!document.getElementById('pag-paguei'),
             nomeNaTela: document.querySelector('.pag-linha b').textContent,
             temMostrar: !!document.getElementById('pag-ver-chave'),
             codigoNaTela: document.getElementById('pag-codigo').value };
  });
  /* a chave só aparece inteira depois de tocar em MOSTRAR */
  await J.click('#pag-ver-chave'); await J.waitForTimeout(300);
  out.mostrou = await J.evaluate(()=>({
    chave: document.getElementById('pag-chave-txt').textContent,
    codigoInteiro: document.getElementById('pag-codigo').value.indexOf('123.456.789-09') >= 0
  }));

  /* 4) JÁ PAGUEI cria o pedido e mostra a espera */
  await J.click('#pag-paguei');
  await J.waitForTimeout(2000);
  out.pagou = await J.evaluate(()=>({
    estado: COMPRA.estado,
    texto: document.querySelector('.pag-espera b') ? document.querySelector('.pag-espera b').textContent : null,
    aviso: document.querySelector('.pag-espera span') ? document.querySelector('.pag-espera span').textContent.slice(0,70) : null,
    chave: COMPRA.chave
  }));

  /* 5) o painel vê o pedido com o nome da conta e o selo JÁ PAGOU */
  const cA=await mk(); const A=await cA.newPage();
  A.on('pageerror',e=>errs.push('ADM: '+e.message));
  await A.goto(URL); await A.waitForTimeout(900);
  await A.click('#btn-goto-adm'); await A.waitForTimeout(300);
  await A.fill('#adm-nick','Cr1cket'); await A.fill('#adm-pass','neonadmin');
  await A.click('#btn-adm-enter'); await A.waitForTimeout(2200);
  await A.evaluate(()=>admIrPara('loja'));
  await A.waitForTimeout(2000);
  out.painel = await A.evaluate(()=>{
    const l = document.querySelector('#adm-loja-lista .pd-linha');
    return { temLinha: !!l,
             pago: l ? l.classList.contains('pago') : false,
             texto: l ? l.textContent.replace(/\s+/g,' ').trim().slice(0,70) : null,
             temEnviarPass: getComputedStyle(document.getElementById('adm-enviar')).display,
             temPagamento: getComputedStyle(document.getElementById('adm-pagamento')).display,
             botoesVip: document.querySelectorAll('#env-vip .adm-btn').length,
             botoesPasses: document.querySelectorAll('#env-passes .adm-btn').length,
             botoesNaves: document.querySelectorAll('#env-naves .adm-btn').length };
  });

  /* 6) ENTREGAR entrega de verdade e o comprador vê sozinho */
  await A.evaluate(()=>{
    const chaves = Object.keys(admLojaPedidos);
    const k = chaves[0];
    return admEntregarPedido(k, admLojaPedidos[k], null);
  });
  await A.waitForTimeout(1500);
  const viu = await esperar(J, ()=>COMPRA.estado === 'entregue', 20000);
  out.entrega = { compradorViuEm_ms: viu,
                  estado: await J.evaluate(()=>COMPRA.estado),
                  texto: await J.evaluate(()=>{
                    const e=document.querySelector('.pag-espera b'); return e?e.textContent:null; }) };
  await J.evaluate(()=>nuvemVerificarPresentes());
  await J.waitForTimeout(1800);
  out.recebeu = await J.evaluate(()=>({ vip: temVip(), dias: vipDiasQueFaltam() }));

  /* 7) ENVIAR PASS manda direto */
  out.enviarPass = await A.evaluate(async()=>{
    document.getElementById('env-quem').value = 'comprador';
    await envProcurar();
    if (!envAlvo) return { achou:false };
    await envMandar({ passes:['ima'] }, 'Passe do Ímã', null);
    return { achou:true, alvo: envAlvo.nome };
  });
  await J.waitForTimeout(800);
  await J.evaluate(()=>nuvemVerificarPresentes());
  await J.waitForTimeout(1800);
  out.recebeuPasse = await J.evaluate(()=>({ ima: !!(save.passes && save.passes.ima) }));
  out.erros = errs;
  console.log(JSON.stringify(out,null,1));
  await b.close(); fim(errs.length?1:0);
})().catch(e=>{console.error('FATAL',e.message);fim(1);});
