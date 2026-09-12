/* =====================================================================
   EXPLORAÇÃO ESPACIAL — o modo funciona E o resto do jogo continua

   A segunda metade é tão importante quanto a primeira: este modo é um
   motor 3D inteiro morando no mesmo arquivo do jogo 2D. O risco não é
   ele não funcionar -- é ele estragar o que já funcionava.
   ===================================================================== */
const path = require('path');
const { chromium } = require('playwright');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
    args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const out = {}; const errs = []; const problemas = [];
  /* paisagem: é como o modo pede para ser jogado */
  const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_')) errs.push('CONSOLE: ' + m.text()); });
  await p.goto(JOGO + '?nuvem=http://127.0.0.1:8099');
  await p.waitForTimeout(1500);
  await p.evaluate(() => { const el = document.getElementById('abertura'); if (el) { el.className = ''; el.innerHTML = ''; } });
  await p.evaluate(() => {
    ROOT.profiles['Davi'] = defaultSave(); ROOT.current = 'Davi';
    save = ROOT.profiles['Davi']; save.__name = 'Davi'; save.best = 40;
    save.crystals = 5000; save.tutorialFeito = true;
    calcStats(); persist(); goMenu();
  });
  await p.waitForTimeout(900);
  await p.evaluate(() => idiomaUsar('pt'));

  out.antes = await p.evaluate(() => ({ montada: EXPL_PRONTA, ligada: explLigada }));

  /* ---- entra pelo caminho do dedo ---- */
  await p.evaluate(() => { portaAbrir('nave'); });
  await p.waitForTimeout(400);
  out.linha = await p.evaluate(() => {
    const l = document.querySelector('[data-ir="btn-cabine"]');
    return l ? l.textContent.replace(/\s+/g, ' ').trim().slice(0, 40) : null;
  });
  await p.evaluate(() => document.querySelector('[data-ir="btn-cabine"]').click());
  await p.waitForTimeout(2500);

  out.dentro = await p.evaluate(() => ({
    modo: S.mode, ligada: explLigada,
    semWebgl: getComputedStyle(document.getElementById('c3-erro')).display !== 'none',
    total: explAPI.CONTROLES.length,
    visiveis: document.querySelectorAll('#screen-cabine [data-ctrl]').length,
    sistema: document.getElementById('c3-sistema').textContent
  }));

  /* ---- as abas: mostrar menos de cada vez é o pedido, mas NENHUM
     controle pode ficar inalcançável. O teste passeia por todas as abas
     de todos os painéis e junta o que apareceu; no fim tem que dar a
     lista inteira. É a diferença entre "organizado" e "escondido". ---- */
  out.abas = await p.evaluate(async () => {
    const vistos = new Set();
    const paineis = Object.keys(explAPI.ABAS);
    const contas = {};
    for (const g of paineis) {
      contas[g] = [];
      const sel = g === 'sis' ? '#c3-pesq' : g === 'voo' ? '#c3-pcen' : '#c3-pdir';
      for (let k = 0; k < explAPI.ABAS[g].length; k++) {
        explAPI.trocarAba(g, k);
        /* dentro da aba ainda há PÁGINAS: o passador ‹ 1/3 › diz quantas.
           Andar só pelas abas deixaria de fora tudo o que está na página
           2 em diante -- e foi exatamente o que aconteceu na primeira
           versão deste teste. */
        const pager = document.querySelector(sel + ' .ex-pag u');
        const quantas = pager ? parseInt(pager.textContent.split('/')[1], 10) : 1;
        for (let pg = 0; pg < quantas; pg++) {
          [...document.querySelectorAll(sel + ' [data-ctrl]')]
            .forEach(b => vistos.add(b.getAttribute('data-ctrl')));
          contas[g].push(document.querySelectorAll(sel + ' [data-ctrl]').length);
          if (quantas > 1) document.querySelectorAll(sel + ' .ex-pag-b')[1].click();
        }
      }
      explAPI.trocarAba(g, 0);
    }
    const faltando = explAPI.CONTROLES.map(c => c.id).filter(id => !vistos.has(id));
    return { alcancados: vistos.size, faltando, porAba: contas };
  });

  /* ---- nenhum botão encostando, cortado ou fora da tela ---- */
  out.layout = await p.evaluate(() => {
    /* só os que o dedo alcança: botão de painel escondido mede zero e
       entraria na conta como "pequeno demais" sem ser problema nenhum */
    const bts = [...document.querySelectorAll('#screen-cabine [data-ctrl]')]
      .filter(e => e.getBoundingClientRect().height > 1);
    const rs = bts.map(b => b.getBoundingClientRect());
    let encostando = 0, forinhas = 0, pequenos = 0, cortados = 0;
    for (let i = 0; i < rs.length; i++) {
      const r = rs[i];
      if (r.right > innerWidth + 1 || r.left < -1 || r.bottom > innerHeight + 1 || r.top < -1) forinhas++;
      if (r.height < 34 || r.width < 34) pequenos++;
      const t = bts[i].querySelector('span');
      if (t && t.scrollWidth > t.clientWidth + 1) cortados++;
      for (let j = i+1; j < rs.length; j++) {
        const q = rs[j];
        const juntos = !(r.right <= q.left || q.right <= r.left || r.bottom <= q.top || q.bottom <= r.top);
        if (juntos) encostando++;
      }
    }
    /* os painéis não podem se tocar nem colar na borda */
    const pr = ['#c3-pesq','#c3-pcen','#c3-pdir'].map(s2 =>
      document.querySelector(s2).closest('.ex-painel').getBoundingClientRect());
    const vao1 = Math.round(pr[1].left - pr[0].right);
    const vao2 = Math.round(pr[2].left - pr[1].right);
    const bordaE = Math.round(pr[0].left), bordaD = Math.round(innerWidth - pr[2].right);
    return { encostando, forinhas, pequenos, cortados, vao1, vao2, bordaE, bordaD,
             alturaPaineis: Math.round(innerHeight - pr[1].top) };
  });
  if (out.dentro.semWebgl) { problemas.push('o WebGL nao abriu no navegador de teste'); }

  /* ---- LIGAR A NAVE VIROU UM TOQUE ----
     A primeira versão pedia dez chaves na ordem certa e recusava com um
     "antes de MOTORES, ligue BOMBAS" a cada erro. O jogador disse que
     estava complicado demais, e estava: dez recusas antes de voar.

     Agora o teste cobra o contrário do que cobrava antes -- que a nave
     JÁ entre ligada, que PARTIDA desligue e religue tudo, e que apertar
     um passo solto acenda sozinho o que ele precisa. */
  out.jaLigada = await p.evaluate(() => ({
    ligados: Object.keys(explAPI.N.ligado).filter(k => explAPI.N.ligado[k]).length,
    podeVoar: !!(explAPI.N.ligado.controles && explAPI.N.ligado.motores)
  }));
  out.partida = await p.evaluate(() => {
    explAPI.N.avisos.length = 0;
    explAPI.apertar('ignicao');                       // liga tudo -> desliga tudo
    const desligados = Object.keys(explAPI.N.ligado).filter(k => explAPI.N.ligado[k]).length;
    const avisosAoDesligar = explAPI.N.avisos.length;
    explAPI.N.avisos.length = 0;
    explAPI.apertar('ignicao');                       // e religa
    return { desligados,
             religados: Object.keys(explAPI.N.ligado).filter(k => explAPI.N.ligado[k]).length,
             /* dez passos, UM recado: dez seguidos ninguém lê */
             avisos: Math.max(avisosAoDesligar, explAPI.N.avisos.length) };
  });
  /* apertar um passo do meio, com a nave morta, tem que acender a
     corrente inteira -- e sem mandar recado de erro */
  out.correnteSozinha = await p.evaluate(() => {
    explAPI.apertar('ignicao');                       // desliga tudo
    explAPI.N.avisos.length = 0;
    explAPI.apertar('motores');
    const n = explAPI.N.ligado;
    return { motores: !!n.motores, bombas: !!n.bombas, combustivel: !!n.combustivel,
             computadores: !!n.computadores, energia: !!n.energia, bateria: !!n.bateria,
             reclamou: explAPI.N.avisos.filter(a => a.tipo === 'erro').length };
  });
  out.ligando = await p.evaluate(() => {
    explAPI.ligarTudo();
    if (!Object.keys(explAPI.N.ligado).filter(k => explAPI.N.ligado[k]).length) explAPI.ligarTudo();
    return { ligados: Object.keys(explAPI.N.ligado).filter(k => explAPI.N.ligado[k]).length,
             podeVoar: !!(explAPI.N.ligado.controles && explAPI.N.ligado.motores) };
  });

  /* ---- OS AVISOS SOMEM ----
     Ficavam cinco na tela para sempre, e a maioria era "RADAR ligado" --
     coisa que o LED do botão já diz. Agora: no máximo três, cinco
     segundos cada. */
  out.avisos = await p.evaluate(() => {
    explAPI.N.avisos.length = 0;
    for (let i = 0; i < 9; i++) explAPI.N.avisos.unshift({ texto: 'teste ' + i, tipo: 'aviso', t: explAPI.N.tempo });
    while (explAPI.N.avisos.length > 3) explAPI.N.avisos.pop();
    const guardados = explAPI.N.avisos.length;
    /* seis segundos de jogo depois, nenhum pode ter sobrado */
    for (let i = 0; i < 140; i++) explAPI.passo(0.05);
    return { guardados, depoisDe6s: explAPI.N.avisos.length,
             naTela: document.querySelectorAll('#c3-avisos .ex-aviso').length };
  });
  /* enfeite não fala: trocar a câmera ou uma chave não gera recado */
  out.avisoDeEnfeite = await p.evaluate(() => {
    explAPI.N.avisos.length = 0;
    explAPI.apertar('camFrente'); explAPI.apertar('luz'); explAPI.apertar('freio');
    return explAPI.N.avisos.length;
  });

  /* ---- AS SETINHAS ESCONDEM OS PAINÉIS ----
     A cabine em 3D é o que este modo tem de bonito; painel que não se
     pode fechar é cortina pregada na janela. */
  out.setinhas = await p.evaluate(() => {
    const conta = () => [...document.querySelectorAll('#screen-cabine [data-ctrl]')]
      .filter(e => e.getBoundingClientRect().height > 1).length;
    const setas = document.querySelectorAll('#screen-cabine [data-fecha]').length;
    const antes = conta();
    document.querySelectorAll('#screen-cabine [data-fecha]').forEach(b => b.click());
    const fechados = [...document.querySelectorAll('.ex-painel')].filter(e => e.classList.contains('fechado')).length;
    const comFechado = conta();
    /* com tudo fechado as barrinhas continuam pequenas: é o que devolve
       a janela para o jogador */
    const alturas = [...document.querySelectorAll('.ex-painel')].map(e => Math.round(e.getBoundingClientRect().height));
    document.querySelectorAll('#screen-cabine [data-fecha]').forEach(b => b.click());
    return { setas, antes, fechados, comFechado, reabriu: conta(), alturas };
  });

  /* ---- voar de verdade ---- */
  const antesPos = await p.evaluate(() => explAPI.N.pos.slice());
  await p.evaluate(() => { explAPI.N.potencia = 0.8; });
  await p.mouse.move(200, 200); await p.mouse.down();
  await p.mouse.move(260, 160, { steps: 8 });
  await p.waitForTimeout(2000);
  out.voando = await p.evaluate(a => {
    const n = explAPI.N;
    return { andou: Math.round(Math.hypot(n.pos[0]-a[0], n.pos[1]-a[1], n.pos[2]-a[2])),
             virou: Math.abs(n.giroY) > 0.03, vel: Math.round(n.velocidade) };
  }, antesPos);
  await p.mouse.up();

  /* ---- combustível: normal gasta, infinito não ---- */
  out.combustivel = await p.evaluate(async () => {
    explAPI.N.combustivel = 80; explAPI.N.combustivelInfinito = false;
    const a = explAPI.N.combustivel;
    for (let i = 0; i < 60; i++) explAPI.passo(0.05);
    const b2 = explAPI.N.combustivel;
    explAPI.N.combustivelInfinito = true;
    for (let i = 0; i < 60; i++) explAPI.passo(0.05);
    const c = explAPI.N.combustivel;
    return { normalGastou: +(a - b2).toFixed(2), infinitoGastou: +(b2 - c).toFixed(2) };
  });

  /* ---- radar, scanner, mapa, salto, dano, reparo ---- */
  out.radar = await p.evaluate(() => {
    /* a nave entra com o radar ligado: alternar aqui DESLIGARIA. O teste
       garante o estado, nao aperta às cegas. */
    if (!explAPI.ligadosCtrl.radar) explAPI.apertar('radar');
    explPintarRadar();
    return { ligado: !!explAPI.ligadosCtrl.radar,
             pontos: document.querySelectorAll('#c3-radar i').length };
  });
  out.scanner = await p.evaluate(() => {
    explAPI.apertar('scanner'); explAPI.apertar('sensores');
    const pl = explAPI.sistema().planetas[0];
    explAPI.N.alvo = { tipo:'planeta', nome:pl.nome, x:pl.x, y:pl.y, z:pl.z, raio:pl.raio, ref:pl };
    explAPI.apertar('escanear');
    return { escaneando: explAPI.N.escaneando > 0 };
  });
  await p.waitForTimeout(2600);
  out.escaneou = await p.evaluate(() => explAPI.sistema().planetas[0].escaneado);

  out.mapa = await p.evaluate(() => {
    explAPI.apertar('mapa');
    const aberto = getComputedStyle(document.getElementById('c3-mapa')).display !== 'none';
    const sis = document.querySelectorAll('#c3-mapa [data-sis]').length;
    document.getElementById('c3-mapa-x').click();
    return { aberto, sistemas: sis };
  });

  out.salto = await p.evaluate(async () => {
    const de = explAPI.N.sistemaAtual;
    explAPI.N.destino = (de + 1) % explAPI.SISTEMAS.length;
    /* o teste anterior deixou o infinito ligado: sem desligar aqui, o
       salto nao teria como gastar nada e a falha seria do teste */
    explAPI.N.combustivelInfinito = false;
    explAPI.N.combustivel = 100;
    explAPI.apertar('hiper');
    const comecou = !!explAPI.N.salto;
    const etapas = [];
    for (let i = 0; i < 400; i++) {
      explAPI.passo(0.05);
      if (explAPI.N.salto) { const e = explAPI.N.salto.etapa; if (etapas[etapas.length-1] !== e) etapas.push(e); }
      if (!explAPI.N.salto && explAPI.N.sistemaAtual !== de) break;
    }
    return { comecou, etapas: etapas.length, chegou: explAPI.N.sistemaAtual !== de,
             gastou: Math.round(100 - explAPI.N.combustivel) };
  });

  out.danoEReparo = await p.evaluate(() => {
    explAPI.N.dano.motor = 40;
    explAPI.N.energia = 100;
    explAPI.apertar('reparo');
    return { depois: Math.round(explAPI.N.dano.motor) };
  });

  out.camera = await p.evaluate(() => {
    const a = explAPI.N.camera; explAPI.apertar('camera');
    return { de: a, para: explAPI.N.camera };
  });

  /* ---- O BOTÃO DE AÇÕES RÁPIDAS ----
     Canhão, míssil e mega boost no canto de cima à direita: no meio de
     uma briga o dedo não procura em aba de painel. */
  out.rapido = await p.evaluate(() => {
    const bt = document.getElementById('c3-rapido-b');
    const fechado = document.querySelectorAll('#c3-rapido-cx [data-ctrl]').length;
    bt.click();
    const bts = [...document.querySelectorAll('#c3-rapido-cx [data-ctrl]')];
    const r = document.getElementById('c3-rapido').getBoundingClientRect();
    let peq = 0, fora = 0;
    for (const x of bts) {
      const q = x.getBoundingClientRect();
      if (q.height < 34) peq++;
      if (q.right > innerWidth+1 || q.bottom > innerHeight+1 || q.top < -1) fora++;
    }
    return { fechado, aberto: bts.length,
             quais: bts.map(x => x.getAttribute('data-ctrl')),
             noCantoDireito: r.right > innerWidth * 0.8 && r.top < innerHeight * 0.25,
             largura: Math.round(r.width), peq, fora };
  });

  /* ---- dá para abater as naves ----
     Os piratas atiravam desde a primeira versão e não havia resposta:
     dava para fugir e nada mais. Isso não é tensão, é impotência. */
  out.combate = await p.evaluate(() => {
    explAPI.ligarTudo();
    if (!explAPI.N.ligado.energia) explAPI.ligarTudo();
    const N = explAPI.N;
    N.energia = 100; N.abatidas = 0;
    /* põe uma nave exatamente na mira, a 300 km */
    const f = [-N.ori[8], -N.ori[9], -N.ori[10]];
    const alvo = { nome:'Cobaia', jeito:'pirata', cor:[1,0,0], fala:'', resposta:'',
                   hostil:true, giro:0, recarga:99, falou:true, vida:100,
                   x:N.pos[0]+f[0]*300, y:N.pos[1]+f[1]*300, z:N.pos[2]+f[2]*300 };
    explAPI.ALIENS.push(alvo);
    const quantasAntes = explAPI.ALIENS.length;
    explAPI.atirar(false);
    const depoisDeUm = alvo.vida;
    const recarregando = N.recargaTiro > 0;
    explAPI.atirar(false);                 // esfriando: não pode valer
    const naRecarga = alvo.vida;
    const riscos = N.tiros.length;
    /* agora sem pressa, até derrubar */
    for (let i = 0; i < 30 && explAPI.ALIENS.indexOf(alvo) >= 0; i++) {
      N.recargaTiro = 0; N.energia = 100;
      explAPI.atirar(false);
    }
    return { quantasAntes, depoisDeUm, naRecarga, recarregando, riscos,
             sumiu: explAPI.ALIENS.indexOf(alvo) < 0, abatidas: N.abatidas,
             noHud: document.getElementById('c3-abates').textContent };
  });
  /* a mira tem que acender quando o tiro VAI acertar, e apagar quando não */
  out.mira = await p.evaluate(() => {
    const N = explAPI.N;
    for (const a of explAPI.ALIENS.slice()) explAPI.ALIENS.splice(explAPI.ALIENS.indexOf(a), 1);
    explPintarPainel();
    const vazia = document.getElementById('c3-mira').classList.contains('travada');
    const f = [-N.ori[8], -N.ori[9], -N.ori[10]];
    explAPI.ALIENS.push({ nome:'Mira', jeito:'pirata', cor:[1,0,0], fala:'', resposta:'',
      hostil:true, giro:0, recarga:99, falou:true, vida:100,
      x:N.pos[0]+f[0]*250, y:N.pos[1]+f[1]*250, z:N.pos[2]+f[2]*250 });
    explPintarPainel();
    const cheia = document.getElementById('c3-mira').classList.contains('travada');
    explAPI.ALIENS.length = 0;
    return { vazia, cheia };
  });
  out.missilEMega = await p.evaluate(() => {
    const N = explAPI.N;
    N.energia = 100; N.combustivel = 100; N.combustivelInfinito = false;
    const f = [-N.ori[8], -N.ori[9], -N.ori[10]];
    /* o míssil perdoa mira torta: nave um pouco fora do eixo */
    const d = [N.ori[0], N.ori[1], N.ori[2]];
    const alvo = { nome:'Cobaia2', jeito:'pirata', cor:[1,0,0], fala:'', resposta:'',
                   hostil:true, giro:0, recarga:99, falou:true, vida:100,
                   x:N.pos[0]+f[0]*400+d[0]*90, y:N.pos[1]+f[1]*400+d[1]*90,
                   z:N.pos[2]+f[2]*400+d[2]*90 };
    explAPI.ALIENS.push(alvo);
    explAPI.N.recargaMissil = 0;
    explAPI.atirar(true);
    const misseis = 100 - alvo.vida;
    const combAntes = N.combustivel;
    explAPI.megaBoost();
    const mega = { gastou: Math.round(combAntes - N.combustivel), potencia: N.potencia,
                   dura: Math.round(N.mega - N.tempo) };
    explAPI.ALIENS.splice(explAPI.ALIENS.indexOf(alvo), 1);
    return { misseis, mega };
  });
  /* tocar num botão não pode mexer no acelerador: CANHÃO fica na metade
     direita da tela, que é a zona do acelerador */
  out.botaoNaoAcelera = await p.evaluate(async () => {
    explAPI.N.potencia = 0.2;
    const bt = [...document.querySelectorAll('#c3-rapido-cx [data-ctrl]')][0];
    const r = bt.getBoundingClientRect();
    const ev = (t, y) => bt.dispatchEvent(new MouseEvent(t, { clientX: r.left + r.width/2,
      clientY: y, bubbles: true }));
    ev('mousedown', r.top + 5); ev('mousemove', r.top - 60); ev('mouseup', r.top - 60);
    return Math.round(explAPI.N.potencia * 100);
  });

  /* ---- o aviso de paisagem ---- */
  out.retrato = await p.evaluate(() => {
    const av = document.getElementById('c3-girar');
    return { emPaisagem: av.classList.contains('on') };
  });
  await p.setViewportSize({ width: 390, height: 844 });
  await p.waitForTimeout(700);
  out.emPe = await p.evaluate(() => document.getElementById('c3-girar').classList.contains('on'));
  /* ---- o aviso não pode ser uma parede ----
     Quem está com a rotação travada (ou num iPhone, onde página nenhuma
     vira a tela) ficaria trancado do lado de fora de um modo inteiro.
     Depois de alguns segundos aparece a explicação e a saída. */
  await p.waitForTimeout(4200);
  out.saidaDoRetrato = await p.evaluate(() => ({
    apareceu: document.getElementById('c3-girar-saida').classList.contains('on')
  }));
  out.emPeMesmoAssim = await p.evaluate(() => {
    document.getElementById('c3-ficar').click();
    const t = document.getElementById('screen-cabine');
    const vis = [...document.querySelectorAll('.ex-painel')]
      .filter(e => getComputedStyle(e).display !== 'none');
    const bts = [...document.querySelectorAll('#screen-cabine [data-ctrl]')]
      .filter(e => e.getBoundingClientRect().height > 1);
    let fora = 0, peq = 0;
    for (const x of bts) {
      const q = x.getBoundingClientRect();
      if (q.right > innerWidth+1 || q.bottom > innerHeight+1 || q.left < -1 || q.top < -1) fora++;
      if (q.height < 34 || q.width < 34) peq++;
    }
    return { avisoSumiu: !document.getElementById('c3-girar').classList.contains('on'),
             modoRetrato: t.classList.contains('retrato'),
             paineisAbertos: vis.length,
             seletor: getComputedStyle(document.getElementById('c3-sel')).display,
             botoes: bts.length, fora, peq };
  });

  await p.setViewportSize({ width: 844, height: 390 });
  await p.waitForTimeout(700);
  out.deitadoDeNovo = await p.evaluate(() => document.getElementById('c3-girar').classList.contains('on'));
  out.voltouDeitado = await p.evaluate(() =>
    !document.getElementById('screen-cabine').classList.contains('retrato'));
  await p.screenshot({ path: 'exploracao.png' });

  /* ---- sair e VOLTAR: a nave continua ligada ----
     A nave guarda o estado entre visitas. Se a entrada usasse o mesmo
     "alterna" do botão PARTIDA, voltar ao modo DESLIGARIA tudo. */
  await p.evaluate(() => explSair());
  await p.waitForTimeout(500);
  await p.evaluate(() => exploracaoEntrar());
  await p.waitForTimeout(900);
  out.voltando = await p.evaluate(() => ({
    ligados: Object.keys(explAPI.N.ligado).filter(k => explAPI.N.ligado[k]).length,
    podeVoar: !!(explAPI.N.ligado.controles && explAPI.N.ligado.motores)
  }));

  /* ---- sair e conferir que o JOGO continua inteiro ---- */
  await p.evaluate(() => explSair());
  await p.waitForTimeout(900);
  out.saiu = await p.evaluate(() => ({
    modo: S.mode, ligada: explLigada, quadro: explQuadro,
    menu: getComputedStyle(document.getElementById('screen-menu')).display !== 'none'
  }));

  out.jogoInteiro = {};
  for (const [nome, porta, texto] of [
    ['hangar','nave','Hangar'], ['habilidades','nave','Habilidades'],
    ['mapa','progresso','Mapa'], ['amigos','online','Amigos'], ['loja','loja',null]
  ]) {
    await p.evaluate(x => { goMenu(); portaAbrir(x); }, porta);
    await p.waitForTimeout(350);
    if (texto) {
      await p.evaluate(t => {
        const l = [...document.querySelectorAll('.porta-linha')].filter(e => e.textContent.indexOf(t) >= 0)[0];
        if (l) l.click();
      }, texto);
      await p.waitForTimeout(500);
    }
    out.jogoInteiro[nome] = await p.evaluate(() => S.mode);
  }
  await p.evaluate(() => goMenu());
  await p.waitForTimeout(300);
  await p.tap('#btn-play');
  await p.waitForTimeout(1200);
  out.jogo2d = await p.evaluate(() => ({ modo: S.mode, fase: S.fase }));
  await p.evaluate(() => { startGame(1); });
  await p.waitForTimeout(1500);
  out.jogando = await p.evaluate(() => ({ modo: S.mode, vivo: player.alive }));

  await b.close();
  out.errs = errs;

  const erro = m => problemas.push(m);
  const innerHeightEsperado = 390;   // a viewport deitada deste teste
  if (out.antes.montada) erro('o 3D nasceu antes de alguem entrar');
  if (!out.linha || !/Explora/i.test(out.linha)) erro('a linha do modo nao diz Exploracao: ' + out.linha);
  if (out.dentro.modo !== 'cabine') erro('o botao nao levou ao modo');
  if (out.dentro.total < 40) erro('so ' + out.dentro.total + ' controles no total (o pedido era 40+)');
  if (out.abas.faltando.length) erro('controles inalcancaveis por nenhuma aba: ' + out.abas.faltando.join(', '));
  if (out.abas.alcancados < out.dentro.total) erro('nem todo controle aparece em alguma aba');
  const L = out.layout;
  if (L.encostando) erro(L.encostando + ' pares de botoes encostando');
  if (L.forinhas) erro(L.forinhas + ' botoes fora da tela');
  if (L.pequenos) erro(L.pequenos + ' botoes menores que 34px (alvo de toque)');
  if (L.cortados) erro(L.cortados + ' rotulos de botao cortados');
  if (L.vao1 < 10 || L.vao2 < 10) erro('os paineis quase se encostam (vaos ' + L.vao1 + ' e ' + L.vao2 + 'px)');
  if (L.bordaE < 8 || L.bordaD < 8) erro('os paineis estao colados na borda da tela');
  if (L.alturaPaineis > innerHeightEsperado * 0.46)
    erro('os paineis comem ' + L.alturaPaineis + 'px da tela: sobra pouco para a cabine');
  if (out.jaLigada.ligados !== 10) erro('a nave NAO entrou ligada (' + out.jaLigada.ligados + ' de 10)');
  if (!out.jaLigada.podeVoar) erro('a nave entrou ligada mas nao pode voar');
  if (out.partida.desligados !== 0) erro('PARTIDA nao desligou tudo (sobraram ' + out.partida.desligados + ')');
  if (out.partida.religados !== 10) erro('PARTIDA nao religou os 10 (' + out.partida.religados + ')');
  if (out.partida.avisos > 1) erro('PARTIDA mandou ' + out.partida.avisos + ' avisos; devia ser um');
  const C = out.correnteSozinha;
  for (const k of ['motores','bombas','combustivel','computadores','energia','bateria'])
    if (!C[k]) erro('apertar MOTORES nao acendeu ' + k + ' sozinho');
  if (C.reclamou) erro('a nave ainda reclama em vez de ligar o que falta');
  if (out.ligando.ligados !== 10) erro('a sequencia de ligar tem ' + out.ligando.ligados + ' de 10');
  if (!out.ligando.podeVoar) erro('depois de ligar tudo a nave nao pode voar');
  if (out.avisos.guardados > 3) erro('mais de 3 avisos guardados');
  if (out.avisos.depoisDe6s !== 0) erro('aviso nao venceu: ' + out.avisos.depoisDe6s + ' sobraram depois de 6s');
  if (out.avisos.naTela !== 0) erro('aviso vencido continua na tela');
  if (out.avisoDeEnfeite !== 0) erro('camera/chave/freio ainda mandam ' + out.avisoDeEnfeite + ' recados');
  const SE = out.setinhas;
  if (SE.setas !== 3) erro('sao ' + SE.setas + ' setinhas; devia ser uma por painel');
  if (SE.fechados !== 3) erro('as setinhas nao fecharam os 3 paineis');
  if (SE.comFechado !== 0) erro('painel fechado ainda mostra ' + SE.comFechado + ' botoes');
  if (SE.alturas.some(h => h > 46)) erro('painel fechado continua alto: ' + SE.alturas.join('/') + 'px');
  if (SE.reabriu !== SE.antes) erro('a setinha nao devolveu os botoes (' + SE.reabriu + ' de ' + SE.antes + ')');
  const RP = out.rapido;
  if (RP.fechado !== 0) erro('o botao rapido ja nasce aberto');
  if (RP.aberto < 6) erro('o botao rapido abriu com so ' + RP.aberto + ' acoes');
  for (const id of ['tiro','missil','mega','turbo'])
    if (RP.quais.indexOf(id) < 0) erro(id + ' nao esta nas acoes rapidas');
  if (!RP.noCantoDireito) erro('as acoes rapidas nao estao no canto de cima a direita');
  if (RP.largura > 140) erro('o botao rapido esta grande demais (' + RP.largura + 'px)');
  if (RP.peq) erro(RP.peq + ' acoes rapidas menores que o dedo alcanca');
  if (RP.fora) erro(RP.fora + ' acoes rapidas fora da tela');
  const CB = out.combate;
  if (CB.depoisDeUm >= 100) erro('o canhao nao machucou a nave inimiga');
  if (!CB.recarregando) erro('o canhao nao tem recarga: daria para varrer tudo num toque');
  if (CB.naRecarga !== CB.depoisDeUm) erro('o tiro valeu durante a recarga');
  if (!CB.riscos) erro('o tiro nao aparece na tela');
  if (!CB.sumiu) erro('a nave inimiga nao foi abatida');
  if (CB.abatidas !== 1) erro('a conta de abates deu ' + CB.abatidas);
  if (out.mira.vazia) erro('a mira acende com nada na frente');
  if (!out.mira.cheia) erro('a mira NAO acende com a nave inimiga na mira');
  if (out.missilEMega.misseis < 40) erro('o missil so tirou ' + out.missilEMega.misseis + ' de vida');
  if (out.missilEMega.mega.gastou <= 0) erro('o mega boost nao cobrou combustivel');
  if (out.missilEMega.mega.potencia < 0.99) erro('o mega boost nao pos a potencia no maximo');
  if (out.missilEMega.mega.dura < 5) erro('o mega boost dura so ' + out.missilEMega.mega.dura + 's');
  if (out.botaoNaoAcelera !== 20) erro('apertar um botao mexeu no acelerador (potencia ' + out.botaoNaoAcelera + '%)');
  if (out.voando.andou < 20) erro('a nave nao andou');
  if (!out.voando.virou) erro('o manche nao virou a nave');
  if (out.combustivel.normalGastou <= 0) erro('o combustivel normal nao gastou');
  if (out.combustivel.infinitoGastou !== 0) erro('o combustivel INFINITO gastou ' + out.combustivel.infinitoGastou);
  if (!out.radar.ligado || out.radar.pontos < 2) erro('o radar nao mostrou objetos');
  if (!out.escaneou) erro('o scanner nao marcou o planeta como escaneado');
  if (!out.mapa.aberto || out.mapa.sistemas < 4) erro('o mapa estelar nao abriu com os sistemas');
  if (!out.salto.comecou || !out.salto.chegou) erro('a hiperpropulsao nao levou a outro sistema');
  if (out.salto.etapas < 5) erro('o salto passou por so ' + out.salto.etapas + ' etapas');
  if (out.salto.gastou <= 0) erro('o salto nao gastou combustivel');
  if (out.danoEReparo.depois <= 40) erro('o reparo nao consertou nada');
  if (out.camera.de === out.camera.para) erro('a camera nao mudou');
  if (out.retrato.emPaisagem) erro('o aviso de girar aparece em paisagem');
  if (!out.emPe) erro('o aviso de girar NAO aparece em retrato');
  if (out.deitadoDeNovo) erro('o aviso de girar nao sumiu ao voltar para paisagem');
  if (!out.saidaDoRetrato.apareceu) erro('o aviso virou parede: a saida nao apareceu');
  const R = out.emPeMesmoAssim;
  if (!R.avisoSumiu) erro('continuar em pe nao tirou o aviso');
  if (!R.modoRetrato) erro('nao entrou no arranjo de retrato');
  if (R.paineisAbertos !== 1) erro('em pe deviam aparecer 1 painel de cada vez, apareceram ' + R.paineisAbertos);
  if (R.seletor === 'none') erro('o seletor de painel nao aparece em pe');
  if (R.fora) erro('em pe, ' + R.fora + ' botoes fora da tela');
  if (R.peq) erro('em pe, ' + R.peq + ' botoes menores que o dedo alcanca');
  if (!out.voltouDeitado) erro('ao deitar de novo nao voltou ao arranjo de tres paineis');
  if (out.voltando.ligados !== 10) erro('voltar ao modo DESLIGOU a nave (' + out.voltando.ligados + ' de 10)');
  if (!out.voltando.podeVoar) erro('depois de voltar ao modo a nave nao pode voar');
  if (out.saiu.ligada || out.saiu.quadro !== 0) erro('sobrou laco rodando depois de sair');
  if (!out.saiu.menu) erro('nao voltou para o menu');
  for (const k of ['hangar','habilidades','mapa','amigos','loja'])
    if (!out.jogoInteiro[k] || out.jogoInteiro[k] === 'menu') erro('QUEBROU o caminho para ' + k);
  if (out.jogo2d.modo !== 'levels') erro('QUEBROU a tela de fases');
  if (out.jogando.modo !== 'playing') erro('QUEBROU o jogo 2D');
  if (errs.length) erro('erros de pagina: ' + errs.join(' | '));

  console.log(JSON.stringify(out, null, 1));
  if (problemas.length) { console.log('FALHOU: ' + problemas.join('; ')); process.exit(1); }
  console.log('OK: exploracao inteira funcionando e o resto do jogo intacto');
})().catch(e => { console.log('FATAL ' + e.message.split('\n')[0]); process.exit(1); });
