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
             /* a marca virou um NUMERO QUE MUDA a cada troca (era um 1 fixo, e um
   1 fixo nunca avisava ninguem de que a foto tinha trocado). O que o
   teste cobra e ela existir e nao ser a foto -- o valor e problema de
   quem compara, nao de quem guarda. */
             marcaNaFicha: !!save.perfil.foto && typeof save.perfil.foto === 'number',
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

  /* =====================================================================
     8b. ATMOSFERA (v9.1): banner de imagem, vidro, partículas, bordas,
     cor dos títulos, ícone de estado e o gradiente que segue a hora
     ===================================================================== */
  out.banner = await chefe.evaluate(async () => {
    /* uma imagem larga de mentira, para provar que ela é RECORTADA na
       proporção do banner e não achatada */
    const c = document.createElement('canvas');
    c.width = 1600; c.height = 400;
    const x = c.getContext('2d');
    x.fillStyle = '#20304a'; x.fillRect(0, 0, 1600, 400);
    x.fillStyle = '#C34DFF'; x.fillRect(600, 0, 400, 400);
    const blob = await new Promise(r => c.toBlob(r, 'image/png'));
    const arq = new File([blob], 'fundo.png', { type: 'image/png' });
    const original = blob.size;
    const ok = await bannerGuardar(arq);
    const guardado = BANNERS[estEu().id] || '';
    /* e o que foi para a ficha? Só a marca, nunca a imagem. */
    const naFicha = JSON.stringify(save.perfil);
    return { ok, original, encolhido: guardado.length,
             ehImagem: /^data:image\/(webp|jpeg|png);base64,/.test(guardado),
             marcaNaFicha: !!save.perfil.banner && typeof save.perfil.banner === 'number',
             imagemNaFicha: naFicha.indexOf('data:image') >= 0,
             /* escolher a imagem já é usar a imagem */
             usando: save.perfil.fundo === 'foto',
             noCSS: /url\(data:image/.test(perfilFundoCSS()) };
  });
  out.bannerNaLista = await zeca.evaluate(async () => {
    const pilotos = await nuvemReq('pilotos');
    return { temImagem: JSON.stringify(pilotos || {}).indexOf('data:image') >= 0 };
  });
  out.bannerFora = await chefe.evaluate(async () => {
    await bannerApagar();
    return { marca: save.perfil.banner, voltou: save.perfil.fundo };
  });

  out.atmosfera = await chefe.evaluate(() => {
    const r = {
      particulas: NEO_PARTICULAS.length,
      bordas: NEO_BORDAS.length,
      estados: NEO_ESTADOS.length,
      horas: HORAS_DO_DIA.length,
      /* as partículas são CSS, e não canvas: nada de mais um laço de
         desenho rodando junto com a partida num celular fraco */
      semCanvas: !/canvas/i.test(particulasHTML('chuva')),
      quantas: (particulasHTML('chuva').match(/<i /g) || []).length,
      vazia: particulasHTML('nenhuma')
    };
    /* o vidro fica preso na faixa: um desfoque de 900px vindo da nuvem
       travaria a tela de quem abrisse o perfil */
    perfilSalvar({ desfoque: 999, opacidade: 5 });
    r.vidroPreso = vidroDe();
    perfilSalvar({ desfoque: 14, opacidade: 66 });
    r.vidroVale = vidroDe();
    /* o gradiente muda com a hora, mas continua sendo as MINHAS cores */
    perfilSalvar({ fundo: 'meu', c1h: 200, c1l: 30, c2h: 280, c2l: 24, horaDoDia: 0 });
    const parado = perfilFundoCSS();
    perfilSalvar({ horaDoDia: 1 });
    const comHora = perfilFundoCSS();
    r.horaMuda = parado !== comHora;
    r.horaAindaHSL = /hsl\(/.test(comHora);
    perfilSalvar({ horaDoDia: 0 });
    return r;
  });
  out.atmosferaNoCartao = await chefe.evaluate(async () => {
    perfilSalvar({ particula: 'chuva', borda: 'neon', corTitulo: 'cyan',
                   estadoIc: 'jogo', desfoque: 12, opacidade: 70 });
    estAbrirPerfil(estEu().id);
    await new Promise(r => setTimeout(r, 500));
    const cartao = document.querySelector('.pf-cartao');
    const bl = document.querySelector('.pf-cartao .pf-bl');
    const s = bl ? getComputedStyle(bl) : {};
    return {
      temParticulas: document.querySelectorAll('.pf-banner .pf-part i').length,
      /* as partículas ficam DENTRO do banner: chuva escorrendo pela
         janela inteira é enfeite virando defeito */
      presasNoBanner: getComputedStyle(document.querySelector('.pf-banner')).overflow === 'hidden',
      bordaNeon: /pf-borda-neon/.test(cartao.className),
      temVidro: /blur/.test(s.backdropFilter || s.webkitBackdropFilter || ''),
      temIconeEstado: !!document.querySelector('.est-luz.ic'),
      /* e a variável do título chegou no bloco */
      corTitulo: getComputedStyle(document.querySelector('.pf-cartao .pf-bl h4')).color
    };
  });
  /* uma pessoa de fora não consegue enfiar CSS pelo perfil */
  out.perfilDeEstranho = await chefe.evaluate(() => {
    const falso = { neo: 'ouro', perfil: {
      fundo: 'meu', c1h: 'red;position:fixed;width:9999px', c1l: 'x',
      c2h: 999, c2l: -99, desfoque: 900, opacidade: 1,
      particula: 'nao-existe', borda: 'javascript:alert(1)', estadoIc: 'hack',
      corTitulo: 'url(http://mau)'
    } };
    const v = perfilComExtras(falso, 'ninguem');
    return { fundo: v.fundoCSS, particula: v.particula, borda: v.borda,
             estado: v.estadoIc.id, corTitulo: v.corTitulo, vidro: v.vidro,
             /* lixo no campo tem que virar uma COR, e não "hsl(NaN...)",
                que o navegador descarta inteiro -- o perfil ficaria preto
                sem erro e sem pista nenhuma */
             temNaN: /NaN|undefined|null/.test(v.fundoCSS) };
  });
  await chefe.evaluate(() => estFecharJanela());

  /* =====================================================================
     8c. AS TRÊS CORREÇÕES DE INTERFACE (v9.1)
       1. o degradê de 2 cores vai para o MIOLO, separado do banner
       2. mini-avatar em toda mensagem do bate-papo
       3. quem não tem foto ganha um robô cinza, único por conta
     ===================================================================== */
  out.miolo = await chefe.evaluate(async () => {
    perfilSalvar({ fundo: 'nebulosa', c1h: 285, c1l: 32, c2h: 196, c2l: 22,
                   angulo: 150, textura: 'pontos', formato: 'linear' });
    estFecharJanela();
    estAbrirPerfil(estEu().id);
    await new Promise(r => setTimeout(r, 500));
    const mio = document.querySelector('.pf-miolo');
    const ban = document.querySelector('.pf-banner');
    if (!mio) return { tem: false };
    const gm = getComputedStyle(mio).backgroundImage;
    const gb = getComputedStyle(ban).backgroundImage;
    return {
      tem: true,
      /* o degradê das duas cores está no MIOLO */
      mioloTemGradiente: /gradient/.test(gm),
      /* e o banner é OUTRA coisa: se os dois fossem iguais, o pedido
         de separar não teria sido atendido */
      bannerDiferente: gm !== gb,
      /* a bio e os emblemas moram DENTRO do miolo */
      bioDentro: !!mio.querySelector('.pf-bio'),
      emblemasDentro: !!mio.querySelector('.pf-emb'),
      temTextura: /pf-tex-pontos/.test(mio.className),
      /* a borda do miolo sai da cor de baixo do degradê */
      temBorda: getComputedStyle(mio).borderTopWidth !== '0px'
    };
  });
  out.gradControles = await chefe.evaluate(() => {
    const r = {};
    perfilSalvar({ angulo: 30, formato: 'linear' });
    r.reto = gradienteDe(perfilMeu(), neoNivel());
    perfilSalvar({ formato: 'radial' });
    r.circulo = gradienteDe(perfilMeu(), neoNivel());
    perfilSalvar({ formato: 'linear', angulo: 300 });
    r.outroAngulo = gradienteDe(perfilMeu(), neoNivel());
    /* ângulo fora da faixa é preso, não aceito */
    perfilSalvar({ angulo: 9999 });
    r.anguloPreso = perfilMeu().angulo;
    perfilSalvar({ angulo: 150 });
    r.prontos = NEO_PRONTOS.length;
    r.formatos = NEO_FORMATOS.length;
    r.texturas = NEO_TEXTURAS.length;
    return r;
  });

  out.roboNoChat = await chefe.evaluate(async () => {
    await nuvemSoltar('conversas/canal__geral', null, 'DELETE');
    const t = Date.now();
    for (const [k, de, nome, txt] of [
      ['r1', 'pAAA1', 'Lucas', 'oi'], ['r2', 'pBBB2', 'Bia', 'salve'],
      ['r3', 'pCCC3', 'Marvin', 'e ai'], ['r4', 'pDDD4', 'Ana', 'bora']
    ]) await nuvemSoltar('conversas/canal__geral/' + k, { de, nome, txt, quando: t });
    estFecharJanela();
    await estAbrir({ tipo: 'canal', id: 'geral', nome: 'geral' });
    await new Promise(r => setTimeout(r, 900));
    estPintar(true);
    const avs = [...document.querySelectorAll('#est-msgs .est-av')];
    const comRobo = avs.filter(a => a.querySelector('svg.robo'));
    return {
      mensagens: document.querySelectorAll('#est-msgs .est-msg').length,
      avatares: avs.length,
      comRobo: comRobo.length,
      /* nenhum avatar pode ter voltado a ser a inicial do nome */
      comInicial: avs.filter(a => !a.querySelector('svg') &&
                                  !/background-image/.test(a.getAttribute('style') || '')).length,
      /* o robô é cinza em fundo branco, e não a bolinha azul de antes */
      fundoBranco: comRobo.length
        ? getComputedStyle(comRobo[0]).backgroundColor : ''
    };
  });

  out.robo = await chefe.evaluate(() => {
    /* MESMO ID, MESMO ROBÔ: sorteado a cada abertura ele não
       identificaria ninguém, que é justamente para o que ele serve */
    const a1 = roboDe('piloto-abc'), a2 = roboDe('piloto-abc');
    const igual = JSON.stringify(a1) === JSON.stringify(a2);
    /* e ids diferentes dão robôs diferentes na maioria das vezes */
    /* 300 contas sobre 1500 combinações: espalhado de verdade, dá uns
       270 robôs distintos. Muito abaixo disso quer dizer que as peças
       voltaram a andar em fila — foi assim que a primeira versão passou
       despercebida com 30. */
    const vistos = {};
    for (let i = 0; i < 300; i++) vistos[JSON.stringify(roboDe('piloto' + i))] = 1;
    const svg = roboSVG('piloto-abc');
    return {
      igualParaOMesmo: igual,
      /* COMPARAR UM PAR SÓ É FRÁGIL: com 1500 combinações, dois ids
         quaisquer batem uma vez em 1500 -- e uma colisão dessas não é
         bug, é aritmética. Quem prova que ids diferentes dão robôs
         diferentes é o espalhamento sobre um conjunto, logo abaixo. */
      distintosEm20: (() => {
        const v = {};
        for (let i = 0; i < 20; i++) v[JSON.stringify(roboDe('zeca' + i))] = 1;
        return Object.keys(v).length;
      })(),
      variacoesEm300: Object.keys(vistos).length,
      combinacoesPossiveis: ROBO_CABECAS.length * ROBO_OLHOS.length *
                            ROBO_ANTENAS.length * ROBO_BOCAS.length * ROBO_DETALHE.length,
      ehSVG: /^<svg /.test(svg),
      /* nada de imagem nem de fonte: o jogo abre sem internet */
      semImagem: !/<image|url\(/.test(svg),
      /* cinza e branco: ele é o "sem foto" e não pode competir com a
         foto de quem pôs uma */
      temBranco: /#FFFFFF/.test(svg),
      semCor: !/#4DE8FF|#FF4D8F|#FFC145|#C34DFF/.test(svg),
      tamanho: svg.length
    };
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

  if (out.editor.abas !== 6) erro('o editor abriu com ' + out.editor.abas + ' abas');
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

  const BN = out.banner;
  if (!BN.ok) erro('nao deu para trocar o banner');
  if (!BN.ehImagem) erro('o banner guardado nao e uma imagem');
  if (BN.encolhido >= BN.original)
    erro('o banner NAO foi encolhido: ' + BN.original + ' -> ' + BN.encolhido);
  if (BN.encolhido > 90000) erro('o banner ficou com ' + BN.encolhido + ' bytes, e o teto e 90 KB');
  if (!BN.marcaNaFicha) erro('a ficha nao ficou com a marca de "tem banner"');
  if (BN.imagemNaFicha) erro('O BANNER FOI PARAR NA FICHA DO PILOTO: a lista de todo mundo vai pesar');
  if (!BN.usando) erro('escolher a imagem nao passou a usar a imagem');
  if (!BN.noCSS) erro('a imagem escolhida nao virou o fundo do perfil');
  if (out.bannerNaLista.temImagem) erro('a lista de pilotos esta carregando imagem de banner');
  if (out.bannerFora.marca !== 0) erro('tirar o banner nao tirou a marca');
  if (out.bannerFora.voltou === 'foto') erro('tirar o banner deixou o fundo apontando para nada');

  const AT = out.atmosfera;
  if (AT.particulas < 4) erro('so ' + AT.particulas + ' tipos de particula');
  if (AT.bordas < 4) erro('so ' + AT.bordas + ' molduras de secao');
  if (AT.estados < 4) erro('so ' + AT.estados + ' icones de estado');
  if (AT.horas !== 4) erro('as horas do dia nao cobrem o dia inteiro');
  if (!AT.semCanvas) erro('as particulas usam canvas: e mais um laco de desenho no celular fraco');
  if (AT.quantas < 8) erro('so ' + AT.quantas + ' particulas: nao se ve');
  if (AT.vazia !== '') erro('"nenhuma particula" desenhou alguma coisa');
  if (AT.vidroPreso.desfoque > 24 || AT.vidroPreso.opacidade < 35)
    erro('o vidro aceitou valor fora da faixa: ' + JSON.stringify(AT.vidroPreso));
  if (AT.vidroVale.desfoque !== 14 || AT.vidroVale.opacidade !== 66)
    erro('o vidro nao guardou o que foi escolhido');
  if (!AT.horaMuda) erro('a hora do dia nao muda o gradiente');
  if (!AT.horaAindaHSL) erro('o gradiente da hora deixou de ser hsl()');

  const AC = out.atmosferaNoCartao;
  if (AC.temParticulas < 8) erro('as particulas nao chegaram no cartao');
  if (!AC.presasNoBanner) erro('as particulas escapam do banner e chovem na janela inteira');
  if (!AC.bordaNeon) erro('a moldura escolhida nao chegou no cartao');
  if (!AC.temVidro) erro('o vidro fosco nao chegou nos blocos');
  if (!AC.temIconeEstado) erro('o icone de estado nao substituiu a bolinha');

  const PE = out.perfilDeEstranho;
  if (/position|fixed|9999|url\(http/.test(PE.fundo))
    erro('DA PARA ENFIAR CSS pelo perfil de outra pessoa: ' + PE.fundo);
  if (!/hsl\(/.test(PE.fundo)) erro('o fundo de estranho nao saiu em hsl()');
  if (PE.temNaN) erro('lixo no campo virou CSS invalido e o fundo some: ' + PE.fundo);
  if (PE.particula !== 'nenhuma') erro('particula inventada passou: ' + PE.particula);
  if (PE.borda !== 'nenhuma') erro('borda inventada passou: ' + PE.borda);
  if (PE.estado !== 'bolinha') erro('icone de estado inventado passou: ' + PE.estado);
  if (PE.corTitulo) erro('cor de titulo inventada passou: ' + PE.corTitulo);
  if (PE.vidro.desfoque > 24 || PE.vidro.opacidade < 35)
    erro('o vidro de um estranho nao foi preso na faixa: ' + JSON.stringify(PE.vidro));

  const MI = out.miolo;
  if (!MI.tem) erro('o cartao nao tem o miolo com o degrade das duas cores');
  else {
    if (!MI.mioloTemGradiente) erro('o degrade de 2 cores nao foi para o miolo do perfil');
    if (!MI.bannerDiferente) erro('o miolo e o banner ficaram iguais: o pedido era separar os dois');
    if (!MI.bioDentro) erro('a bio nao esta dentro do miolo');
    if (!MI.emblemasDentro) erro('os emblemas nao estao dentro do miolo');
    if (!MI.temTextura) erro('a textura escolhida nao chegou no miolo');
    if (!MI.temBorda) erro('o miolo ficou sem a borda da cor secundaria');
  }
  const GC = out.gradControles;
  if (!/linear-gradient\(30deg/.test(GC.reto)) erro('o angulo do degrade nao pegou: ' + GC.reto);
  if (!/radial-gradient/.test(GC.circulo)) erro('o formato circulo nao pegou: ' + GC.circulo);
  if (GC.reto === GC.outroAngulo) erro('mudar o angulo nao mudou nada');
  if (GC.anguloPreso > 359) erro('angulo fora da faixa foi aceito: ' + GC.anguloPreso);
  if (GC.prontos < 6) erro('so ' + GC.prontos + ' combinacoes prontas');
  if (GC.formatos < 2) erro('so ' + GC.formatos + ' formatos de degrade');
  if (GC.texturas < 3) erro('so ' + GC.texturas + ' texturas');

  const RC = out.roboNoChat;
  if (RC.mensagens < 4) erro('as mensagens de teste nao chegaram');
  if (RC.avatares < 4) erro('faltou avatar em mensagem do bate-papo');
  if (RC.comRobo < 4) erro('MINI-AVATAR: so ' + RC.comRobo + ' de ' + RC.avatares +
                           ' mensagens tem robo');
  if (RC.comInicial) erro(RC.comInicial + ' avatares voltaram a ser a inicial do nome');
  if (!/255, 255, 255/.test(RC.fundoBranco))
    erro('o robo nao esta em fundo branco: ' + RC.fundoBranco);

  const RB = out.robo;
  if (!RB.igualParaOMesmo) erro('O ROBO MUDA A CADA ABERTURA: ele nao identifica ninguem');
  if (RB.distintosEm20 < 17)
    erro('so ' + RB.distintosEm20 + ' robos diferentes em 20 contas seguidas');
  if (RB.variacoesEm300 < 200)
    erro('so ' + RB.variacoesEm300 + ' robos diferentes em 300 contas (o esperado e ~270): ' +
         'as pecas do robo voltaram a andar em fila');
  if (RB.combinacoesPossiveis < 500)
    erro('so ' + RB.combinacoesPossiveis + ' combinacoes possiveis de robo');
  if (!RB.ehSVG) erro('o robo nao e um SVG');
  if (!RB.semImagem) erro('o robo depende de imagem de fora: o jogo tem que abrir sem internet');
  if (!RB.temBranco) erro('o robo nao esta em fundo branco');
  if (!RB.semCor) erro('o robo saiu colorido: ele e o "sem foto" e tem que ser neutro');
  if (RB.tamanho > 2500) erro('o robo ficou com ' + RB.tamanho + ' letras: pesado demais');

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
