/* =====================================================================
   O MENU CABE NA TELA — SEM ROLAGEM, EM QUALQUER APARELHO

   Antes o menu rolava: 1050px de conteúdo numa tela de 568px, e ainda
   um espaçador morto de 25vh no fim. Em celular pequeno o jogador via
   metade e tinha que arrastar para achar o resto dos botões.

   Este teste abre o menu em cinco tamanhos de tela e confere três
   coisas em cada um:
     1. nada fica abaixo da borda de baixo (o dedo alcança tudo)
     2. nenhum bloco está espremido escondendo conteúdo
     3. a tela não rola
   E mais uma quarta, que é o motivo de tudo: as quatro portas continuam
   grandes o bastante para o dedo (44px é o mínimo da Apple).

   CUIDADO ao mexer no menu: o scrollHeight da .screen MENTE. A nebulosa
   de fundo (.screen::before) tem inset:-25%, entra na conta e nunca
   rolou nada — ela é recortada. Por isso aqui a medida é a borda de
   baixo do último elemento visível, não o scrollHeight.
   ===================================================================== */
const path = require('path');
const { chromium } = require('playwright');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');

const TELAS = [
  [320, 568, 'iPhone SE antigo'],
  [360, 640, 'Android comum'],
  [390, 844, 'iPhone 13'],
  [430, 932, 'iPhone Pro Max'],
  [844, 390, 'celular deitado']
];

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const out = {}; const problemas = []; const errs = [];

  for (const [w, h, nome] of TELAS) {
    const p = await b.newPage({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true });
    p.on('pageerror', e => errs.push(nome + ': ' + e.message));
    await p.goto(JOGO + '?nuvem=http://127.0.0.1:8099');
    await p.waitForTimeout(1400);
    await p.evaluate(() => {
      const el = document.getElementById('abertura'); if (el) { el.className = ''; el.innerHTML = ''; }
      ROOT.profiles['Davi'] = defaultSave(); ROOT.current = 'Davi';
      save = ROOT.profiles['Davi']; save.__name = 'Davi'; save.best = 40;
      save.crystals = 5000; save.pts = 3; save.tutorialFeito = true;
      calcStats(); persist(); goMenu();
    });
    await p.waitForTimeout(800);
    await p.evaluate(() => idiomaUsar('pt'));
    await p.waitForTimeout(300);

    const r = await p.evaluate(() => {
      const t = document.getElementById('screen-menu');
      const visivel = e => {
        const s = getComputedStyle(e);
        return e.getBoundingClientRect().height > 3 && s.display !== 'none' && s.position !== 'fixed';
      };
      const vis = [...t.querySelectorAll('*')].filter(visivel);
      const btns = t.querySelector('.menu-btns');
      const portas = [...t.querySelectorAll('.porta')];
      return {
        fundo: Math.round(Math.max(...vis.map(e => e.getBoundingClientRect().bottom))),
        tela: window.innerHeight,
        espremido: btns ? btns.scrollHeight - btns.clientHeight : 0,
        rola: t.scrollHeight > t.clientHeight && getComputedStyle(t).overflowY !== 'hidden',
        quantasPortas: portas.length,
        menorPorta: portas.length ? Math.round(Math.min(...portas.map(e => e.getBoundingClientRect().height))) : 0,
        jogarVisivel: (() => { const e = document.getElementById('btn-play'); return !!e && visivel(e); })()
      };
    });
    r.corta = r.fundo - r.tela;
    out[nome + ' ' + w + 'x' + h] = r;
    await p.screenshot({ path: 'menu3-' + w + 'x' + h + '.png' });
    await p.close();

    const onde = nome + ' (' + w + 'x' + h + ')';
    if (r.corta > 0) problemas.push(onde + ': corta ' + r.corta + 'px embaixo');
    if (r.espremido > 0) problemas.push(onde + ': menu-btns espremido em ' + r.espremido + 'px');
    if (r.rola) problemas.push(onde + ': o menu ainda rola');
    if (r.quantasPortas !== 4) problemas.push(onde + ': ' + r.quantasPortas + ' portas em vez de 4');
    if (r.menorPorta < 44) problemas.push(onde + ': porta de ' + r.menorPorta + 'px, menor que o dedo alcanca');
    if (!r.jogarVisivel) problemas.push(onde + ': o botao JOGAR sumiu');
  }

  await b.close();
  out.errs = errs;
  if (errs.length) problemas.push('erros de pagina: ' + errs.join(' | '));
  console.log(JSON.stringify(out, null, 1));
  if (problemas.length) { console.log('FALHOU: ' + problemas.join('; ')); process.exit(1); }
  console.log('OK: o menu cabe inteiro nas ' + TELAS.length + ' telas, sem rolagem');
})().catch(e => { console.log('FATAL ' + e.message.split('\n')[0]); process.exit(1); });
