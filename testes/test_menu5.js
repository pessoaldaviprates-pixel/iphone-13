/* =====================================================================
   O MENU ROLA — E CONTINUA ROLADO

   A queixa: "a tela do lobby onde tem os botões está muito comprida e
   não dá para rolar, e fica cortando o perfil".

   Eram três coisas, e as três estão medidas aqui:

   1. A ROLAGEM VOLTAVA SOZINHA PARA O COMEÇO.
      O `menuCaber()` tira a classe `menu-rola` para medir do zero. Tirar
      a rolagem de um elemento faz o navegador ZERAR o `scrollTop` -- não
      há mais para onde rolar. Repor a classe no fim não traz a posição
      de volta: ela já se perdeu.
      E essa função roda o tempo todo: a cada mudança da tela (o aviso de
      nuvem, o selo de não lidas, o contador de quem está online) pelo
      MutationObserver, e uma vez por segundo pela barra de três. Ou
      seja: qualquer arrastão era desfeito antes de a pessoa soltar o
      dedo. Para quem joga, isso é "não dá para rolar" -- e está certo.

   2. O MIOLO SE ENCOLHIA EM VEZ DE ROLAR.
      A `.menu-btns` é `flex:1 1 auto`. Mesmo com a rolagem ligada ela
      continua fazendo o que flex faz: espreme até caber na caixa, e o
      conteúdo transborda para FORA dela (é `overflow:visible`). O que
      transborda assim não vira altura de rolagem -- quem manda é a
      caixa, que "cabe". Rolando, a altura passa a ser a natural.

   3. 171px DE NEBULOSA VAZIA.
      O `.screen::before` tem `inset:-25%` e entrava na conta da rolagem:
      num 320x568 dava 171px para arrastar quando só 39px eram conteúdo.
      A pessoa arrastava para o nada. (É a mesma armadilha que o
      CLAUDE.md anota para o `scrollHeight`, vista do outro lado.)

   O TESTE ESPERA DE PROPÓSITO. Medir logo depois de rolar passava com o
   bug no lugar: o `menuCaber()` ainda não tinha rodado. O que quebrava
   era o segundo seguinte, e é ele que este teste mede.
   ===================================================================== */
const path = require('path');
const { chromium } = require('playwright');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');

/* tamanhos onde o menu não cabe e precisa rolar, e tamanhos onde cabe */
const TELAS = [
  [320, 480, 'telinha'],
  [320, 568, 'iPhone SE antigo'],
  [360, 640, 'Android comum'],
  [375, 667, 'iPhone SE'],
  [390, 844, 'iPhone 13'],
  [430, 932, 'iPhone Pro Max']
];

let etapa = 'inicio';
const passo = n => { etapa = n; if (process.env.VERBOSO) console.log('  .. ' + n); };
const RELOGIO = setTimeout(() => {
  console.log('FALHOU: o teste travou em "' + etapa + '"');
  process.exit(1);
}, 180000);

const problemas = [];
const erro = m => problemas.push(m);

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const out = {};

  for (const [w, h, nome] of TELAS) {
    passo(nome);
    const p = await b.newPage({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true });
    const errs = [];
    p.on('pageerror', e => errs.push(e.message.split('\n')[0]));
    await p.goto(JOGO + '?nuvem=http://127.0.0.1:8099');
    await p.waitForTimeout(1500);

    /* ENTRA PELO CAMINHO DE VERDADE, e não pelo goMenu() que os outros
       testes usam: só o `entrarNoMenu()` monta a barra de três. Medindo
       pelo atalho, mede-se um menu sem a barra -- ou seja, um menu que
       o jogador nunca vê, com 63px a mais de espaço que ele não tem. */
    await p.evaluate(() => {
      const el = document.getElementById('abertura'); if (el) { el.className = ''; el.innerHTML = ''; }
      ROOT.profiles['Davi'] = defaultSave();
      Object.assign(ROOT.profiles['Davi'],
        { best: 40, crystals: 5000, pts: 3, tutorialFeito: true });
      entrarNoMenu('Davi');
    });
    await p.waitForTimeout(2200);
    await p.evaluate(() => { try { idiomaUsar('pt'); } catch (e) {} });
    await p.waitForTimeout(400);

    const r = await p.evaluate(async () => {
      const t = document.getElementById('screen-menu');
      const btns = t.querySelector('.menu-btns');
      const nav = document.getElementById('nav-barra');
      const barraVisivel = nav && !nav.classList.contains('sumiu') &&
                           getComputedStyle(nav).display !== 'none';
      const navTopo = barraVisivel ? nav.getBoundingClientRect().top : innerHeight;

      const rola = t.className.includes('menu-rola');
      const alcance = t.scrollHeight - t.clientHeight;
      const estoura = btns ? btns.scrollHeight - btns.clientHeight : 0;

      /* QUANTO FALTA DE VERDADE, medido no começo da rolagem: a borda de
         baixo do último elemento visível, menos onde a barra começa. É
         com este número que o arrasto é comparado -- um arrasto muito
         maior que ele é nebulosa, não conteúdo. */
      let precisa = 0;
      for (const el of t.querySelectorAll('*')) {
        const q = getComputedStyle(el);
        if (q.display === 'none' || q.visibility === 'hidden') continue;
        if (q.position === 'absolute' || q.position === 'fixed') continue;
        const c = el.getBoundingClientRect();
        if (c.height < 2 || c.width < 2) continue;
        if (c.bottom - navTopo > precisa) precisa = Math.round(c.bottom - navTopo);
      }

      /* rola até o fim, como o dedo faria */
      t.scrollTop = t.scrollHeight;
      await new Promise(r => setTimeout(r, 300));
      const logoDepois = Math.round(t.scrollTop);

      /* ESPERA. É aqui que o bug vivia: o menuCaber() roda de novo
         (observador + a batida de 1s da barra) e levava a rolagem de
         volta para o começo. */
      await new Promise(r => setTimeout(r, 2600));
      const maisTarde = Math.round(t.scrollTop);

      /* no fim da rolagem, nenhum botão pode estar debaixo da barra */
      const escondidos = [];
      let maisBaixo = 0;
      for (const el of t.querySelectorAll('*')) {
        const q = getComputedStyle(el);
        if (q.display === 'none' || q.visibility === 'hidden') continue;
        if (q.position === 'absolute' || q.position === 'fixed') continue;
        const c = el.getBoundingClientRect();
        if (c.height < 2 || c.width < 2) continue;
        if (c.bottom > maisBaixo) maisBaixo = c.bottom;
        if (el.tagName === 'BUTTON' && c.bottom > navTopo + 1)
          escondidos.push((el.id || String(el.className).split(' ')[0]) +
                          ' base=' + Math.round(c.bottom));
      }
      return {
        barraVisivel, rola, alcance, estoura, precisa,
        logoDepois, maisTarde,
        escondidosNoFim: escondidos,
        sobraNoFim: Math.round(navTopo - maisBaixo)
      };
    });
    out[nome] = r;

    if (!r.barraVisivel)
      erro(nome + ': a barra de três não apareceu — o teste não mede nada sem ela');

    /* 1. a rolagem fica onde a pessoa deixou */
    if (r.rola) {
      if (r.logoDepois <= 0)
        erro(nome + ': o menu diz que rola e o dedo não conseguiu rolar nada');
      else if (r.maisTarde <= 0)
        erro(nome + ': ROLAGEM VOLTOU SOZINHA — rolou até ' + r.logoDepois +
             ' e dois segundos depois estava de novo em 0. É o menuCaber() ' +
             'tirando a classe menu-rola para medir e o navegador zerando o ' +
             'scrollTop junto. Para quem joga, isto é "não dá para rolar".');
      else if (r.maisTarde < r.logoDepois - 2)
        erro(nome + ': a rolagem escorregou sozinha de ' + r.logoDepois +
             ' para ' + r.maisTarde);
    }

    /* 2. o miolo não pode transbordar para fora da própria caixa:
          o que transborda assim não vira rolagem, vira conteúdo
          escondido embaixo da barra */
    if (r.rola && r.estoura > 1)
      erro(nome + ': a .menu-btns transborda ' + r.estoura + 'px para fora da ' +
           'própria caixa em vez de virar rolagem (ela continua flex:1 1 auto)');

    /* 3. A ROLAGEM É DE CONTEÚDO, NÃO DE NEBULOSA.
          Com o céu entrando na conta, um 320x568 dava 171px de arrasto
          para 39px que faltavam de verdade: a pessoa arrastava quatro
          vezes mais do que precisava, e o resto era fundo vazio.
          A comparação é contra o que falta (medido acima), e não contra
          a altura da tela -- numa telinha de 480px faltam 113px de
          conteúdo real, e isso não é fantasma nenhum.
          A folga de 40px cobre o respiro de baixo (a barra mede 63px e
          a folga pedida é +10px) e o arredondamento. */
    if (r.rola && r.alcance > r.precisa + 40)
      erro(nome + ': dá para arrastar ' + r.alcance + 'px, mas só faltavam ' +
           r.precisa + 'px de conteúdo — o resto é a nebulosa de fundo ' +
           '(inset:-25%) entrando na conta da rolagem');

    /* 4. o que importa de verdade: no fim, o dedo alcança tudo */
    if (r.escondidosNoFim.length)
      erro(nome + ': mesmo rolando até o fim, botão debaixo da barra: ' +
           r.escondidosNoFim.join(', '));

    if (errs.length) erro(nome + ': erro de página — ' + errs[0]);
    await p.close();
  }

  await b.close();
  clearTimeout(RELOGIO);
  console.log(JSON.stringify(out, null, 1));
  if (problemas.length) { console.log('FALHOU: ' + problemas.join('; ')); process.exit(1); }
  console.log('OK: o menu rola, fica rolado, e no fim o dedo alcança tudo');
})().catch(e => {
  console.log('FATAL em "' + etapa + '": ' + e.message.split('\n')[0]);
  process.exit(1);
});
