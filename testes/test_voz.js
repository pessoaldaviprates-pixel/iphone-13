/* =====================================================================
   A VOZ — duas pessoas de verdade, ligadas de verdade

   O Chromium sabe fingir um microfone (--use-fake-device-for-media-stream)
   e sabe dizer "sim" sozinho para o pedido de permissão. Com isso dá
   para provar a coisa inteira sem ninguém falar nada:

     1. entrar numa sala pede o microfone e escreve quem está lá
     2. os dois se acham e a ligação FECHA (connectionState = connected)
     3. o áudio de um chega no outro (tem faixa de som recebida)
     4. mudo fecha a faixa; surdo cala o alto-falante E o microfone
     5. sair solta o microfone -- a faixa acaba, e não fica gravando
     6. sair apaga a pessoa da sala para quem ficou
     7. ligar para alguém faz o telefone tocar na conversa dos dois
     8. e, a regra de sempre: a voz NÃO abre fluxo (SSE) nenhum

   O item 8 é o que mais importa. O fluxo é um só e é da conversa; uma
   sala de voz com fluxo próprio comeria a conexão que falta e travaria
   as gravações do jogo, que é um bug que já aconteceu.
   ===================================================================== */
const path = require('path');
const { chromium } = require('playwright');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const URL = JOGO + '?nuvem=http://127.0.0.1:8099';

async function piloto(ctx, nome) {
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.waitForTimeout(1200);
  await p.evaluate(() => { const el = document.getElementById('abertura'); if (el) { el.className = ''; el.innerHTML = ''; } });
  await p.evaluate(n => {
    ROOT.profiles[n] = defaultSave(); ROOT.current = n; save = ROOT.profiles[n];
    save.__name = n; save.best = 30; save.crystals = 4000; save.tutorialFeito = true;
    calcStats(); persist(); goMenu();
  }, nome);
  await p.evaluate(() => idiomaUsar('pt'));
  await p.evaluate(() => nuvemEnviar(true));
  await p.waitForFunction(n => typeof VOZ !== 'undefined' && save.__name === n, nome, { timeout: 10000 });
  await p.waitForTimeout(500);
  return p;
}
async function ate(pg, fn, arg, ms) {
  try { await pg.waitForFunction(fn, arg, { timeout: ms || 25000 }); return true; }
  catch (e) { return false; }
}

(async () => {
  /* o microfone de mentira: sem ele o navegador pergunta, ninguém
     responde, e o teste fica esperando para sempre */
  const b = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream',
           '--autoplay-policy=no-user-gesture-required']
  });
  const out = {}; const errs = []; const problemas = [];
  const ctx = () => b.newContext({ viewport: { width: 1280, height: 800 },
                                   permissions: ['microphone'] });

  const c1 = await ctx(), c2 = await ctx();
  const a = await piloto(c1, 'Ana');
  await a.evaluate(async () => { await nuvemSoltar('conversas', null, 'DELETE'); await nuvemEnviar(true); });
  await a.waitForTimeout(400);
  const t = await piloto(c2, 'Tito');
  for (const [pg, nome] of [[a, 'ANA'], [t, 'TITO']]) {
    pg.on('pageerror', e => errs.push(nome + ': ' + e.message));
    pg.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_')) errs.push(nome + ': ' + m.text()); });
  }
  /* conta os fluxos: a voz não pode abrir nenhum */
  for (const pg of [a, t]) await pg.evaluate(() => {
    /* guarda O CAMINHO de cada fluxo: abrir uma conversa abre um fluxo,
       e isso é certo. O que não pode existir é fluxo de voz. */
    window.__fluxos = { abertos: 0, fechados: 0, caminhos: [] };
    const original = window.nuvemFluxo;
    window.nuvemFluxo = function (cam, ok, falhou, consulta) {
      window.__fluxos.abertos++;
      window.__fluxos.caminhos.push(cam);
      const parar = original(cam, ok, falhou, consulta);
      return function () { window.__fluxos.fechados++; return parar(); };
    };
  });

  /* ---- 1. ENTRAR ---- */
  out.entrou = await a.evaluate(async () => {
    const ok = await vozEntrar('ponte');
    return { ok, sala: VOZ.sala, nome: VOZ.nome,
             /* o microfone tem que estar ABERTO e ligado */
             faixas: VOZ.meu ? VOZ.meu.getAudioTracks().length : 0,
             ligada: VOZ.meu ? VOZ.meu.getAudioTracks()[0].enabled : false,
             barra: !!document.querySelector('#est-voz-barra.on') };
  });
  /* a estação tem que saber que estou lá, mesmo com a lateral repintada */
  await a.evaluate(() => { estacaoAbrir(); });
  await a.waitForTimeout(500);
  out.naLateral = await a.evaluate(() => ({
    barra: !!document.querySelector('#est-voz-barra.on'),
    salaAcesa: !!document.querySelector('[data-voz="ponte"].on'),
    temSair: !!document.getElementById('voz-sair')
  }));

  out.euNaNuvem = await a.evaluate(async () => {
    const d = await nuvemReq('conversas/voz__ponte/dentro');
    return { quantos: Object.keys(d || {}).length, nomes: Object.values(d || {}).map(x => x.nome) };
  });

  /* ---- 2. O OUTRO ENTRA E OS DOIS SE ACHAM ---- */
  await t.evaluate(async () => { await vozEntrar('ponte'); });
  out.ligou = await ate(a, () => {
    const ids = Object.keys(VOZ.pares);
    return ids.length === 1 && VOZ.pares[ids[0]].pc.connectionState === 'connected';
  }, null, 30000);
  out.ligouDoOutroLado = await ate(t, () => {
    const ids = Object.keys(VOZ.pares);
    return ids.length === 1 && VOZ.pares[ids[0]].pc.connectionState === 'connected';
  }, null, 30000);

  out.ponte = await a.evaluate(() => {
    const uid = Object.keys(VOZ.pares)[0];
    const p = VOZ.pares[uid];
    return { estado: p ? p.pc.connectionState : 'nenhum',
             /* o som do outro tem que estar chegando de verdade */
             recebendo: p && p.stream ? p.stream.getAudioTracks().length : 0,
             temAudio: !!(p && p.audio && p.audio.srcObject),
             naSala: Object.keys(VOZ.dentro).length };
  });

  /* ---- 3. MUDO E SURDO ---- */
  out.mudo = await a.evaluate(() => {
    vozMudo();
    const fechada = !VOZ.meu.getAudioTracks()[0].enabled;
    vozMudo();
    return { fechada, voltou: VOZ.meu.getAudioTracks()[0].enabled };
  });
  out.surdo = await a.evaluate(() => {
    vozSurdo();
    const uid = Object.keys(VOZ.pares)[0];
    const r = { alto: VOZ.pares[uid].audio.muted,
                /* surdo também cala: quem não ouve ninguém não sabe se
                   está atrapalhando */
                tambemCalou: !VOZ.meu.getAudioTracks()[0].enabled };
    vozSurdo();
    r.voltou = !VOZ.pares[uid].audio.muted && VOZ.meu.getAudioTracks()[0].enabled;
    return r;
  });

  /* ---- 4. O OUTRO ME VÊ NA SALA ---- */
  out.listaDoOutro = await t.evaluate(() => ({
    quantos: Object.keys(VOZ.dentro).length,
    nomes: Object.keys(VOZ.dentro).map(u => VOZ.dentro[u].nome).sort()
  }));

  /* ---- 5. SAIR SOLTA O MICROFONE ---- */
  out.saiu = await a.evaluate(async () => {
    const faixa = VOZ.meu ? VOZ.meu.getAudioTracks()[0] : null;
    await vozSair();
    return { sala: VOZ.sala, pares: Object.keys(VOZ.pares).length,
             /* "ended" é a prova de que o microfone foi solto mesmo: sem
                isso a bolinha vermelha do navegador fica acesa e a
                pessoa acha, com razão, que o jogo continua ouvindo */
             microfoneSolto: faixa ? faixa.readyState === 'ended' : false,
             semMeu: VOZ.meu === null,
             barra: !!document.querySelector('#est-voz-barra.on') };
  });
  out.sumiuParaOOutro = await ate(t, () => Object.keys(VOZ.pares).length === 0, null, 20000);

  /* ---- 6. LIGAR PARA UMA PESSOA ---- */
  const idDaAna = await a.evaluate(() => estEu().id);
  const idDoTito = await t.evaluate(() => estEu().id);
  out.ligacao = await a.evaluate(async id => {
    const ok = await vozLigar(id, 'Tito');
    return { ok, sala: VOZ.sala, ehChamada: String(VOZ.sala).indexOf('dm__') === 0 };
  }, idDoTito);
  /* o telefone toca: uma mensagem na conversa dos dois, com ATENDER */
  out.tocou = await t.evaluate(async id => {
    /* ABRIR A ESTAÇÃO, não só o destino: estPintar() não desenha nada
       com a estação fechada, e o teste procurava na tela um botão que
       ninguém tinha mandado desenhar */
    estacaoAbrir({ tipo: 'dm', id, nome: 'Ana' });
    await new Promise(r => setTimeout(r, 1500));
    const m = EST.msgs.filter(x => x.tipo === 'chamada')[0];
    return { achou: !!m, temSala: !!(m && m.cham && m.cham.sala),
             botao: !!document.querySelector('[data-atender]'),
             mesmaSala: m && m.cham ? m.cham.sala : '' };
  }, idDaAna);
  out.atendeu = out.tocou.botao && await t.evaluate(async () => {
    document.querySelector('[data-atender]').click();
    await new Promise(r => setTimeout(r, 1200));
    return VOZ.sala;
  });
  out.chamadaLigou = await ate(a, () => {
    const ids = Object.keys(VOZ.pares);
    return ids.length === 1 && VOZ.pares[ids[0]].pc.connectionState === 'connected';
  }, null, 30000);

  for (const pg of [a, t]) await pg.evaluate(() => vozSair());
  await a.waitForTimeout(600);

  /* ---- 7. NENHUM FLUXO A MAIS ---- */
  out.fluxos = {};
  for (const [pg, nome] of [[a, 'ana'], [t, 'tito']])
    out.fluxos[nome] = await pg.evaluate(() => ({
      vivos: window.__fluxos.abertos - window.__fluxos.fechados,
      caminhos: window.__fluxos.caminhos,
      deVoz: window.__fluxos.caminhos.filter(c => String(c).indexOf('voz__') >= 0).length
    }));

  /* ---- 8. sem microfone, o jogo DIZ o que fazer ---- */
  out.semMicrofone = await a.evaluate(async () => {
    const real = navigator.mediaDevices.getUserMedia;
    navigator.mediaDevices.getUserMedia = () => {
      const e = new Error('no'); e.name = 'NotAllowedError'; return Promise.reject(e);
    };
    const ok = await vozEntrar('hangar');
    const aviso = document.getElementById('est-aviso').textContent;
    navigator.mediaDevices.getUserMedia = real;
    return { ok, aviso, semSala: VOZ.sala === null };
  });

  await b.close();

  const erro = m => problemas.push(m);
  if (!out.entrou.ok) erro('nao deu para entrar na sala de voz');
  if (out.entrou.sala !== 'ponte') erro('entrou na sala errada: ' + out.entrou.sala);
  if (out.entrou.faixas !== 1) erro('o microfone nao veio: ' + out.entrou.faixas + ' faixas');
  if (!out.entrou.ligada) erro('o microfone veio fechado');
  if (!out.naLateral.barra) erro('a barra da voz nao apareceu na lateral');
  if (!out.naLateral.salaAcesa) erro('a sala em que estou nao fica acesa na lateral');
  if (!out.naLateral.temSair) erro('falta o botao de SAIR da voz -- ficar preso na sala e o pior que tem');
  if (out.euNaNuvem.quantos !== 1) erro('a nuvem ficou com ' + out.euNaNuvem.quantos + ' pessoas na sala');
  if (out.euNaNuvem.nomes[0] !== 'Ana') erro('quem entrou na sala nao foi escrito direito');
  if (!out.ligou) erro('a ligacao NAO fechou do lado da Ana');
  if (!out.ligouDoOutroLado) erro('a ligacao NAO fechou do lado do Tito');
  if (out.ponte.estado !== 'connected') erro('a ponte ficou em "' + out.ponte.estado + '"');
  if (out.ponte.recebendo !== 1) erro('o som do outro nao esta chegando');
  if (!out.ponte.temAudio) erro('nao tem alto-falante ligado no som do outro');
  if (out.ponte.naSala !== 2) erro('a sala ficou com ' + out.ponte.naSala + ' pessoas em vez de 2');
  if (!out.mudo.fechada) erro('o mudo nao fechou o microfone');
  if (!out.mudo.voltou) erro('sair do mudo nao reabriu o microfone');
  if (!out.surdo.alto) erro('o surdo nao calou o alto-falante');
  if (!out.surdo.tambemCalou) erro('o surdo devia calar o microfone tambem');
  if (!out.surdo.voltou) erro('sair do surdo nao voltou ao normal');
  if (out.listaDoOutro.quantos !== 2) erro('o outro lado viu ' + out.listaDoOutro.quantos + ' na sala');
  if (String(out.listaDoOutro.nomes) !== 'Ana,Tito') erro('a lista da sala saiu errada: ' + out.listaDoOutro.nomes);
  if (out.saiu.sala !== null) erro('sair nao saiu');
  if (out.saiu.pares !== 0) erro('sobrou ' + out.saiu.pares + ' ponte aberta depois de sair');
  if (!out.saiu.microfoneSolto) erro('SAIR NAO SOLTOU O MICROFONE: o navegador continua gravando');
  if (!out.saiu.semMeu) erro('o fluxo do microfone ficou guardado depois de sair');
  if (out.saiu.barra) erro('a barra da voz continuou na tela depois de sair');
  if (!out.sumiuParaOOutro) erro('para quem ficou, quem saiu continuou na sala');
  if (!out.ligacao.ok) erro('nao deu para ligar para uma pessoa');
  if (!out.ligacao.ehChamada) erro('a ligacao nao virou sala de chamada: ' + out.ligacao.sala);
  if (!out.tocou.achou) erro('o telefone nao tocou: nao chegou cartao de chamada na conversa');
  if (!out.tocou.botao) erro('o cartao da chamada veio sem o botao ATENDER');
  if (out.tocou.mesmaSala !== out.ligacao.sala) erro('o ATENDER aponta para outra sala');
  if (out.atendeu !== out.ligacao.sala) erro('atender nao entrou na mesma sala');
  if (!out.chamadaLigou) erro('a chamada de dois nao fechou a ligacao');
  for (const nome of ['ana', 'tito']) {
    if (out.fluxos[nome].deVoz)
      erro('a voz abriu ' + out.fluxos[nome].deVoz + ' fluxo(s) em ' + nome +
           ': ela tem que caber em pedidos curtos, nao em conexao aberta');
    if (out.fluxos[nome].vivos > 1)
      erro('sobraram ' + out.fluxos[nome].vivos + ' fluxos abertos em ' + nome);
  }
  if (out.semMicrofone.ok) erro('sem permissao de microfone o jogo achou que entrou');
  if (!out.semMicrofone.semSala) erro('sem microfone o jogo ficou com uma sala pela metade');
  if (!/permitir o microfone/i.test(out.semMicrofone.aviso))
    erro('sem permissao o jogo nao diz o que fazer: "' + out.semMicrofone.aviso + '"');
  if (errs.length) erro('erros de pagina: ' + errs.join(' | '));

  console.log(JSON.stringify(out, null, 1));
  if (problemas.length) { console.log('FALHOU: ' + problemas.join('; ')); process.exit(1); }
  console.log('OK: a voz -- sala, ligacao de verdade, mudo, surdo, chamada e nenhum fluxo a mais');
})().catch(e => { console.log('FATAL ' + e.message.split('\n')[0]); process.exit(1); });
