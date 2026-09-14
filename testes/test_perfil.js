/* =====================================================================
   O PERFIL — foto, fonte, duas cores, blocos e castigo

   O que este teste cobra, na ordem em que foi pedido:
     1. dá para trocar a foto (e ela é encolhida aqui, não subida inteira)
     2. a foto NÃO vai na ficha do piloto -- só uma marca de "tem foto"
     3. as fontes de nome existem, e o nível tranca as de cima
     4. o fundo de duas cores vira degradê, e o que é guardado são
        NÚMEROS: cor de outra pessoa nunca vira CSS
     5. as duas rodas aparecem uma em cima e outra embaixo
     6. o cartão de quem se olha é montado por blocos, na ordem escolhida
     7. a setinha de castigo só existe para o dono do jogo
     8. e o castigo FAZ EFEITO: de castigo não se fala e não se entra na voz
     9. o NeoNebula fica exposto no topo da barra

   O item 8 é o que mais importa. Castigo que só aparece na tela de quem
   aplicou não é castigo, é enfeite.
   ===================================================================== */
const path = require('path');
const { chromium } = require('playwright');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const URL = JOGO + '?nuvem=http://127.0.0.1:8099';

async function piloto(ctx, nome) {
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.waitForTimeout(1300);
  await p.evaluate(() => { const el = document.getElementById('abertura'); if (el) { el.className = ''; el.innerHTML = ''; } });
  await p.evaluate(n => {
    ROOT.profiles[n] = defaultSave(); ROOT.current = n; save = ROOT.profiles[n];
    save.__name = n; save.best = 140; save.crystals = 9000; save.abates = 23400;
    save.chefes = 31; save.vitorias = 28; save.tutorialFeito = true;
    save.conquistas = { primeiro: 1, fase10: 1, fase50: 1 };
    calcStats(); persist(); goMenu();
  }, nome);
  await p.evaluate(() => idiomaUsar('pt'));
  await p.evaluate(() => nuvemEnviar(true));
  await p.waitForFunction(n => typeof NEO_FONTES !== 'undefined' && save.__name === n, nome,
                          { timeout: 10000 });
  await p.waitForTimeout(500);
  return p;
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const out = {}; const errs = []; const problemas = [];
  const ctx = () => b.newContext({ viewport: { width: 1280, height: 860 } });

  const c1 = await ctx(), c2 = await ctx();
  /* Cr1cket é o dono do jogo: é ele que ganha a setinha */
  const chefe = await piloto(c1, 'Cr1cket');
  await chefe.evaluate(async () => {
    for (const no of ['conversas', 'amigos']) await nuvemSoltar(no, null, 'DELETE');
    await nuvemEnviar(true);
  });
  await chefe.waitForTimeout(400);
  const zeca = await piloto(c2, 'Zeca');
  for (const [pg, nome] of [[chefe, 'CHEFE'], [zeca, 'ZECA']]) {
    pg.on('pageerror', e => errs.push(nome + ': ' + e.message));
    pg.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_')) errs.push(nome + ': ' + m.text()); });
  }
  for (const pg of [chefe, zeca]) {
    await pg.evaluate(() => estacaoAbrir({ tipo: 'canal', id: 'geral', nome: 'geral' }));
  }
  await chefe.waitForTimeout(800);

  /* ---- 1. AS FONTES ---- */
  out.fontes = await chefe.evaluate(() => ({
    quantas: NEO_FONTES.length,
    /* duas de graça, como o resto das coisas do jogo */
    gratis: NEO_FONTES.filter(f => f.nivel === 'nenhum').length,
    /* nenhuma pode baixar nada: o jogo abre sem internet */
    nenhumaBaixa: NEO_FONTES.every(f => !/https?:/.test(f.css)),
    semRepetido: new Set(NEO_FONTES.map(f => f.id)).size === NEO_FONTES.length
  }));
  /* QUEM TESTA A TRAVA É O ZECA, e não o Cr1cket: o dono do jogo tem
     ILIMITADO de graça por desenho (ver neoDe), então ele nunca fica
     sem assinatura e não serve para provar que a trava trava. */
  out.fonteTrava = await zeca.evaluate(() => {
    save.neo = null;                              // sem assinatura nenhuma
    perfilSalvar({ fonte: 'manuscrita' });        // essa é de Ouro
    const semNeo = perfilFonteDoNome().id;
    save.neo = { nivel: 'ouro', ate: Date.now() + 30 * 86400000 };
    perfilSalvar({ fonte: 'manuscrita' });
    const comNeo = perfilFonteDoNome().id;
    save.neo = null;
    perfilSalvar({ fonte: 'padrao' });
    return { semNeo, comNeo, ehDono: souOChefe() };
  });

  /* ---- 2. A FOTO ---- */
  out.foto = await chefe.evaluate(async () => {
    /* uma imagem grande de mentira, feita no próprio navegador */
    const c = document.createElement('canvas');
    c.width = c.height = 600;
    const x = c.getContext('2d');
    x.fillStyle = '#4DE8FF'; x.fillRect(0, 0, 600, 600);
    x.fillStyle = '#FF4D8F'; x.fillRect(0, 0, 300, 300);
    const blob = await new Promise(r => c.toBlob(r, 'image/png'));
    const arq = new File([blob], 'eu.png', { type: 'image/png' });
    const tamanhoOriginal = blob.size;
    const ok = await fotoGuardar(arq);
    const guardada = FOTOS[estEu().id] || '';
    /* e o que foi para a ficha do piloto? Só a marca, nunca a foto. */
    const naFicha = JSON.stringify(save.perfil);
    return { ok, tamanhoOriginal, encolhida: guardada.length,
             ehImagem: /^data:image\/(webp|jpeg|png);base64,/.test(guardada),
             marcaNaFicha: save.perfil.foto === 1,
             fotoNaFicha: naFicha.indexOf('data:image') >= 0 };
  });
  /* o outro piloto consegue ver a foto, e ela NÃO vem junto da lista de pilotos */
  out.fotoDoOutro = await zeca.evaluate(async id => {
    const pilotos = await nuvemReq('pilotos');
    const pesoDaLista = JSON.stringify(pilotos || {}).length;
    const temFotoNaLista = JSON.stringify(pilotos || {}).indexOf('data:image') >= 0;
    const f = await fotoDe(id);
    return { pesoDaLista, temFotoNaLista, achou: !!f, ehImagem: /^data:image\//.test(f) };
  }, await chefe.evaluate(() => estEu().id));

  /* ---- 3. O FUNDO DE DUAS CORES ---- */
  out.duasCores = await chefe.evaluate(() => {
    perfilSalvar({ fundo: 'meu', c1h: 280, c1l: 30, c2h: 190, c2l: 25 });
    const css = perfilFundoCSS();
    /* o que fica GUARDADO são números, e não texto de cor: assim não
       existe jeito de escrever CSS dentro do campo */
    const p = perfilMeu();
    const soNumero = typeof p.c1h === 'number' && typeof p.c2l === 'number';
    /* e um valor fora da faixa é preso, não aceito */
    perfilSalvar({ c1h: 9999, c1l: -50 });
    const preso = perfilMeu().c1h <= 359 && perfilMeu().c1l >= 12;
    /* texto no lugar do número não entra */
    perfilSalvar({ c2h: 'red;background:url(x)' });
    const semTexto = typeof perfilMeu().c2h === 'number';
    perfilSalvar({ c1h: 280, c1l: 30 });
    return { css, temGradiente: /linear-gradient/.test(css), temHSL: /hsl\(/.test(css),
             soNumero, preso, semTexto };
  });

  /* ---- 4. AS DUAS RODAS, UMA EM CIMA E OUTRA EMBAIXO ---- */
  out.rodas = await chefe.evaluate(async () => {
    estEditarPerfil();
    await new Promise(r => setTimeout(r, 200));
    pfAba = 'fundo'; estPintarEditor();
    await new Promise(r => setTimeout(r, 300));
    const rs = [...document.querySelectorAll('.pf-roda')];
    if (rs.length < 2) return { quantas: rs.length };
    const a = rs[0].getBoundingClientRect(), z = rs[1].getBoundingClientRect();
    const banner = document.querySelector('.pf-previa .pf-banner').getBoundingClientRect();
    return {
      quantas: rs.length,
      /* uma em cima da outra, e não lado a lado */
      umaEmCimaDaOutra: z.top >= a.bottom - 4,
      /* nenhuma encosta no banner da prévia */
      foraDoBanner: a.top >= banner.bottom - 2,
      temFaixa: !!document.getElementById('pf-faixa'),
      temTom: document.querySelectorAll('.pf-tom').length
    };
  });
  /* mexer na roda muda a prévia na hora */
  out.rodaMexe = await chefe.evaluate(async () => {
    const roda = document.getElementById('roda-c1');
    const r = roda.getBoundingClientRect();
    const antes = estRascunho.c1h;
    const ev = (t, x, y) => roda.dispatchEvent(new PointerEvent(t,
      { clientX: x, clientY: y, bubbles: true, pointerId: 1 }));
    ev('pointerdown', r.left + r.width - 4, r.top + r.height / 2);   // lado direito = ~90°
    ev('pointerup', r.left + r.width - 4, r.top + r.height / 2);
    await new Promise(x => setTimeout(x, 150));
    return { antes, depois: estRascunho.c1h, mudou: estRascunho.c1h !== antes };
  });
  await chefe.evaluate(() => { estRascunho = null; estFecharJanela(); });

  /* ---- 5. O EDITOR TEM AS ABAS TODAS ---- */
  out.editor = await chefe.evaluate(async () => {
    estEditarPerfil();
    await new Promise(r => setTimeout(r, 250));
    const r = { abas: document.querySelectorAll('[data-pfaba]').length, porAba: {} };
    for (const a of PF_ABAS) {
      pfAba = a.id; estPintarEditor();
      r.porAba[a.id] = document.querySelectorAll('.pf-corpo .pf-campo').length;
    }
    r.temFoto = (pfAba = 'quem', estPintarEditor(), !!document.getElementById('pf-foto'));
    estRascunho = null; estFecharJanela();
    return r;
  });

  /* ---- 6. O CARTÃO POR BLOCOS ---- */
  out.cartao = await chefe.evaluate(async () => {
    perfilSalvar({ bio: 'Piloto desde a primeira nebulosa.', pronomes: 'ele/dele',
                   interesses: 'campanha,ranque', blocos: 'sobre,emblemas,interesses,atividade' });
    estAbrirPerfil(estEu().id);
    await new Promise(r => setTimeout(r, 500));
    const titulos = [...document.querySelectorAll('.pf-bl h4')].map(x => x.textContent.trim());
    return { blocos: titulos, temBio: !!document.querySelector('.pf-bio'),
             temEmblemas: !!document.querySelector('.pf-emb'),
             temInteresses: !!document.querySelector('.pf-int'),
             temAtividade: !!document.querySelector('.pf-ativ-l'),
             /* no MEU perfil não existe setinha de castigo */
             temSetinha: !!document.querySelector('.pf-castigo') };
  });
  /* e a ordem escolhida é obedecida */
  out.ordem = await chefe.evaluate(async () => {
    perfilSalvar({ blocos: 'interesses,sobre,emblemas' });
    estFecharJanela();
    estAbrirPerfil(estEu().id);
    await new Promise(r => setTimeout(r, 400));
    /* o título aparece em CAIXA ALTA por causa do CSS, mas o texto de
       verdade não é maiúsculo: comparar com "INTERESSES" reprovaria uma
       ordem que está certa */
    return [...document.querySelectorAll('.pf-bl h4')]
      .map(x => x.textContent.trim().split(' ')[0].toLowerCase());
  });
  await chefe.evaluate(() => estFecharJanela());

  /* ---- 7. A SETINHA SÓ PARA O DONO ---- */
  const idZeca = await zeca.evaluate(() => estEu().id);
  const idChefe = await chefe.evaluate(() => estEu().id);
  await chefe.evaluate(() => estOlharNovidades());
  await chefe.waitForTimeout(900);
  out.setinha = await chefe.evaluate(async id => {
    estAbrirPerfil(id);
    await new Promise(r => setTimeout(r, 600));
    return { souOChefe: souOChefe(), tem: !!document.querySelector('.pf-castigo') };
  }, idZeca);
  out.setinhaDoZeca = await zeca.evaluate(async id => {
    estOlharNovidades();
    await new Promise(r => setTimeout(r, 900));
    estAbrirPerfil(id);
    await new Promise(r => setTimeout(r, 600));
    const r = { souOChefe: souOChefe(), tem: !!document.querySelector('.pf-castigo') };
    estFecharJanela();
    return r;
  }, idChefe);

  /* ---- 8. O CASTIGO FAZ EFEITO ---- */
  out.deuCastigo = await chefe.evaluate(async id => {
    const ok = await castigoDar(id, 'Zeca', 30, 'm', 'tudo', 'teste');
    const naNuvem = await nuvemReq('conversas/__castigos/' + id);
    estFecharJanela();
    return { ok, temNaNuvem: !!naNuvem, tipo: naNuvem && naNuvem.tipo,
             /* 30 minutos: entre 29 e 31 minutos no futuro */
             prazoOk: naNuvem && naNuvem.ate - Date.now() > 29 * 60000 &&
                      naNuvem.ate - Date.now() < 31 * 60000 };
  }, idZeca);
  out.zecaCastigado = await zeca.evaluate(async () => {
    await castigoOlhar(estEu().id);
    const antes = EST.msgs.length;
    const mandou = await estEnviar('deixa eu falar');
    const barraVoz = castigoBarraVoz();
    return { temCastigo: !!castigoMeu(), mandou, cresceu: EST.msgs.length - antes,
             aviso: document.getElementById('est-aviso').textContent,
             barraVoz: !!barraVoz };
  });
  /* e perdoar devolve a fala */
  out.perdoado = await chefe.evaluate(id => castigoTirar(id, 'Zeca'), idZeca);
  out.zecaSolto = await zeca.evaluate(async () => {
    await castigoOlhar(estEu().id);
    await new Promise(r => setTimeout(r, 900));
    const mandou = await estEnviar('voltei');
    return { semCastigo: !castigoMeu(), mandou };
  });

  /* ---- 9. O NEONEBULA EXPOSTO NO TOPO ---- */
  out.neoNaBarra = await chefe.evaluate(() => {
    const cx = document.getElementById('est-neo-cartao');
    if (!cx) return { tem: false };
    const lado = document.getElementById('est-lado');
    const amigos = document.querySelector('[data-dest="amigos|tudo"]');
    return { tem: true, texto: cx.textContent,
             /* tem que estar ACIMA do botão de amigos */
             acimaDeAmigos: amigos
               ? cx.getBoundingClientRect().top < amigos.getBoundingClientRect().top : false,
             falaDosPrecos: /0,50|Bronze|ILIMITADO|Ouro|Prata/i.test(cx.textContent) };
  });

  /* ---- 10. as letras começam com maiúscula ---- */
  out.maiusculas = await chefe.evaluate(async () => {
    estAbrirPerfil(estEu().id);
    await new Promise(r => setTimeout(r, 400));
    const bts = [...document.querySelectorAll('.pf-cartao .est-jan-ok')]
      .map(b => b.textContent.trim()).filter(Boolean);
    estFecharJanela();
    /* nada de GRITAR em caixa alta, e nada começando minúsculo */
    return { bts, tudoMaiusculo: bts.filter(t => t === t.toUpperCase() && t.length > 3),
             comecaMinusculo: bts.filter(t => /^[a-zà-ÿ]/.test(t)) };
  });

  await b.close();
  const erro = m => problemas.push(m);

  const F = out.fontes;
  if (F.quantas < 6) erro('so ' + F.quantas + ' fontes de nome');
  if (!F.gratis) erro('nenhuma fonte de graca: tem que ter alguma para quem nao assina');
  if (!F.nenhumaBaixa) erro('alguma fonte baixa de fora: o jogo tem que abrir sem internet');
  if (!F.semRepetido) erro('tem fonte repetida');
  if (out.fonteTrava.ehDono) erro('o teste da trava usou o dono do jogo, que tem tudo de graca');
  if (out.fonteTrava.semNeo === 'manuscrita') erro('a fonte de Ouro passou sem assinatura');
  if (out.fonteTrava.comNeo !== 'manuscrita') erro('a fonte de Ouro nao valeu com Ouro');

  const FO = out.foto;
  if (!FO.ok) erro('nao deu para trocar a foto');
  if (!FO.ehImagem) erro('o que foi guardado nao e uma imagem');
  if (FO.encolhida >= FO.tamanhoOriginal)
    erro('a foto NAO foi encolhida: ' + FO.tamanhoOriginal + ' -> ' + FO.encolhida);
  if (FO.encolhida > 40000) erro('a foto ficou com ' + FO.encolhida + ' bytes, e o teto e 40 KB');
  if (!FO.marcaNaFicha) erro('a ficha nao ficou com a marca de "tem foto"');
  if (FO.fotoNaFicha) erro('A FOTO FOI PARAR NA FICHA DO PILOTO: a lista de todo mundo vai pesar');
  if (out.fotoDoOutro.temFotoNaLista)
    erro('a lista de pilotos esta carregando foto: ' + out.fotoDoOutro.pesoDaLista + ' bytes');
  if (!out.fotoDoOutro.achou) erro('o outro piloto nao consegue ver a foto');
  if (!out.fotoDoOutro.ehImagem) erro('a foto que chega no outro nao e imagem');

  const DC = out.duasCores;
  if (!DC.temGradiente) erro('o fundo de duas cores nao virou degrade');
  if (!DC.temHSL) erro('o fundo de duas cores nao saiu em hsl()');
  if (!DC.soNumero) erro('as cores do fundo foram guardadas como texto, e nao como numero');
  if (!DC.preso) erro('um valor fora da faixa foi aceito');
  if (!DC.semTexto) erro('TEXTO ENTROU no lugar do numero da cor: da para escrever CSS ali');

  const R = out.rodas;
  if (R.quantas !== 2) erro('sao ' + R.quantas + ' rodas de cor, e o combinado eram 2');
  else {
    if (!R.umaEmCimaDaOutra) erro('as rodas ficaram lado a lado: era uma em cima e outra embaixo');
    if (!R.foraDoBanner) erro('a roda de cima esta invadindo o banner');
    if (!R.temFaixa) erro('falta a faixa que mostra o degrade das duas cores');
    if (R.temTom !== 2) erro('sao ' + R.temTom + ' barrinhas de tonalidade, e tem que ter 2');
  }
  if (!out.rodaMexe.mudou)
    erro('girar a roda nao mudou a cor (' + out.rodaMexe.antes + ' -> ' + out.rodaMexe.depois + ')');

  if (out.editor.abas !== 5) erro('o editor abriu com ' + out.editor.abas + ' abas');
  for (const a in out.editor.porAba)
    if (!out.editor.porAba[a]) erro('a aba ' + a + ' do editor esta vazia');
  if (!out.editor.temFoto) erro('nao tem botao de trocar a foto no editor');

  const C = out.cartao;
  if (!C.temBio) erro('o cartao nao mostra a bio');
  if (!C.temEmblemas) erro('o cartao nao mostra os emblemas');
  if (!C.temInteresses) erro('o cartao nao mostra os interesses');
  if (!C.temAtividade) erro('o cartao nao mostra a atividade recente');
  if (C.temSetinha) erro('a setinha de castigo apareceu no MEU proprio perfil');
  if (out.ordem[0] !== 'interesses')
    erro('a ordem escolhida dos blocos nao foi obedecida: ' + out.ordem.join(' > '));

  if (!out.setinha.souOChefe) erro('o Cr1cket nao foi reconhecido como dono do jogo');
  if (!out.setinha.tem) erro('o dono do jogo NAO tem a setinha de castigo no perfil dos outros');
  if (out.setinhaDoZeca.souOChefe) erro('o Zeca foi reconhecido como dono do jogo');
  if (out.setinhaDoZeca.tem) erro('QUALQUER UM tem a setinha de castigo');

  if (!out.deuCastigo.ok) erro('nao deu para aplicar o castigo');
  if (!out.deuCastigo.temNaNuvem) erro('o castigo nao foi gravado');
  if (out.deuCastigo.tipo !== 'tudo') erro('o tipo do castigo saiu errado');
  if (!out.deuCastigo.prazoOk) erro('30 minutos nao viraram 30 minutos');
  if (!out.zecaCastigado.temCastigo) erro('o castigado nao soube que estava de castigo');
  if (out.zecaCastigado.mandou) erro('DE CASTIGO E FALOU: o castigo nao faz efeito nenhum');
  if (out.zecaCastigado.cresceu) erro('a mensagem do castigado apareceu na tela mesmo assim');
  if (!/castigo/i.test(out.zecaCastigado.aviso))
    erro('o aviso nao explica que e castigo: "' + out.zecaCastigado.aviso + '"');
  if (!out.zecaCastigado.barraVoz) erro('o castigo "tudo" nao barrou a voz');
  if (!out.perdoado) erro('nao deu para perdoar');
  if (!out.zecaSolto.semCastigo) erro('perdoar nao tirou o castigo');
  if (!out.zecaSolto.mandou) erro('perdoado e ainda nao fala');

  if (!out.neoNaBarra.tem) erro('o NeoNebula nao esta exposto na barra');
  else {
    if (!out.neoNaBarra.acimaDeAmigos) erro('o cartao do NeoNebula nao esta acima de AMIGOS');
    if (!out.neoNaBarra.falaDosPrecos) erro('o cartao nao diz nivel nem preco nenhum');
  }
  if (out.maiusculas.tudoMaiusculo.length)
    erro('botao GRITANDO em caixa alta: ' + out.maiusculas.tudoMaiusculo.join(', '));
  if (out.maiusculas.comecaMinusculo.length)
    erro('botao comecando com letra minuscula: ' + out.maiusculas.comecaMinusculo.join(', '));
  if (errs.length) erro('erros de pagina: ' + errs.join(' | '));

  console.log(JSON.stringify(out, null, 1));
  if (problemas.length) { console.log('FALHOU: ' + problemas.join('; ')); process.exit(1); }
  console.log('OK: perfil -- foto, fontes, duas cores, blocos, castigo e o NeoNebula exposto');
})().catch(e => { console.log('FATAL ' + e.message.split('\n')[0]); process.exit(1); });
