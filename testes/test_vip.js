/* =====================================================================
   O VIP E A MOLDURA PRECISAM APARECER — INCLUSIVE PARA OS OUTROS

   Dois defeitos que ficaram escondidos porque cada metade parecia certa
   sozinha:

   1. O ranking JA sabia desenhar o nome dourado com coroa para quem tem
      VIP (`p.vip ? " vip" : ""`), mas nuvemEnviar() nunca mandava o
      campo vip. O desenho esperava um dado que ninguem enviava, entao
      quem pagou VIP nunca ficava dourado para ninguem.

   2. A moldura do apelido era escolhida, salva e... so. molduraAtual()
      era usada unicamente dentro do proprio seletor, para marcar qual
      estava escolhida. O jogador escolhia e nada acontecia em lugar
      nenhum: nem no menu, nem no perfil, nem no ranking.

   O teste usa DOIS navegadores contra o mesmo Firebase falso: o pai
   compra VIP e escolhe moldura; o filho abre o ranking e tem que ver.
   ===================================================================== */
const path = require('path');
const { chromium } = require('playwright');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html') + '?nuvem=http://127.0.0.1:8099';

const abrir = async (b, nome) => {
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errs = [];
  p.on('pageerror', e => errs.push(nome + ': ' + e.message));
  await p.goto(JOGO);
  await p.waitForTimeout(1500);
  await p.evaluate(() => { const el = document.getElementById('abertura'); if (el) { el.className = ''; el.innerHTML = ''; } });
  return { p, errs };
};

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const out = {}; const problemas = []; let errs = [];

  /* ---------- o pai: compra VIP e escolhe a moldura de ouro ---------- */
  const pai = await abrir(b, 'pai'); errs = errs.concat(pai.errs);
  await pai.p.evaluate(() => {
    ROOT.profiles['PaiDoDavi'] = defaultSave(); ROOT.current = 'PaiDoDavi';
    save = ROOT.profiles['PaiDoDavi']; save.__name = 'PaiDoDavi'; save.senha = 'x';
    save.best = 160;                         // libera a moldura de Ouro (>= 150)
    save.vipAte = Date.now() + 30 * 24 * 60 * 60 * 1000;
    calcStats(); persist(); goMenu();
  });
  await pai.p.waitForTimeout(700);
  out.pai = await pai.p.evaluate(() => ({ temVip: temVip(), molduraAntes: molduraAtual() }));

  /* escolhe a moldura pelo caminho do jogador: a tela do perfil */
  await pai.p.evaluate(() => { perfilRender(); moldurasRender(); });
  await pai.p.waitForTimeout(400);
  out.escolheu = await pai.p.evaluate(() => {
    const b2 = document.querySelector('[data-mold="ouro"]');
    if (!b2) return { achou: false };
    if (b2.disabled) return { achou: true, travada: true };
    b2.click();
    return { achou: true, travada: false, agora: molduraAtual() };
  });
  await pai.p.waitForTimeout(600);

  /* a moldura tem que estar VESTIDA no nome dele, nao so salva */
  out.noProprioJogo = await pai.p.evaluate(() => {
    goMenu();
    const h = document.getElementById('menu-hello');
    perfilRender();
    const pn = document.querySelector('.perf-nome');
    const cor = el => el ? getComputedStyle(el).color : null;
    return {
      menuClasses: h ? h.className : null,
      menuCor: cor(h),
      perfilClasses: pn ? pn.className : null
    };
  });
  await pai.p.evaluate(() => nuvemEnviar(true));
  await pai.p.waitForTimeout(1200);

  /* ---------- o filho: abre o ranking e tem que ver ---------- */
  const filho = await abrir(b, 'filho'); errs = errs.concat(filho.errs);
  await filho.p.evaluate(() => {
    ROOT.profiles['Davi'] = defaultSave(); ROOT.current = 'Davi';
    save = ROOT.profiles['Davi']; save.__name = 'Davi'; save.best = 40;
    calcStats(); persist(); goMenu();
  });
  await filho.p.waitForTimeout(700);
  await filho.p.evaluate(() => { S.mode = 'rank'; showScreen('rank'); renderRanking(true); });
  await filho.p.waitForTimeout(2500);

  out.noRanking = await filho.p.evaluate(() => {
    const linhas = [...document.querySelectorAll('#rank-list .rank-row')];
    const achar = n => linhas.filter(l => l.textContent.indexOf(n) >= 0)[0];
    const l = achar('PaiDoDavi');
    if (!l) return { achou: false, quantos: linhas.length,
                     nomes: linhas.map(x => x.textContent.slice(0, 20)) };
    const nome = l.querySelector('.rank-nome');
    return {
      achou: true,
      classes: nome.className,
      temCoroa: nome.textContent.indexOf('👑') >= 0,
      cor: getComputedStyle(nome).color
    };
  });
  await filho.p.screenshot({ path: 'vip-ranking.png' });

  out.ouroDoJogo = await filho.p.evaluate(() => {
    const sonda = document.createElement('span');
    sonda.style.color = 'var(--amber)';
    document.body.appendChild(sonda);
    const c = getComputedStyle(sonda).color;
    sonda.remove();
    return c;
  });

  /* ---------- moldura inventada por um estranho nao vira classe ---------- */
  out.seguranca = await filho.p.evaluate(() => ({
    inventada: classeDaMoldura('" onload="alert(1)'),
    inexistente: classeDaMoldura('coisa-que-nao-existe'),
    nenhuma: classeDaMoldura('nenhuma'),
    valida: classeDaMoldura('ouro')
  }));

  /* a cor certa e a que o proprio jogo chama de --amber: escrever o rgb
     na mao aqui significaria o teste quebrar toda vez que a paleta mudar,
     acusando um defeito que nao existe */
  const OURO = out.ouroDoJogo;

  await b.close();
  out.errs = errs;
  if (!out.pai.temVip) problemas.push('o pai nao ficou com VIP no teste');
  if (!out.escolheu.achou) problemas.push('o botao da moldura de ouro nao existe no perfil');
  if (out.escolheu.travada) problemas.push('a moldura de ouro ficou travada com fase 160');
  if (out.escolheu.agora !== 'ouro') problemas.push('escolher a moldura nao guardou');
  if (!/mold-ouro/.test(out.noProprioJogo.menuClasses || '')) problemas.push('a moldura nao foi vestida no nome do menu');
  if (out.noProprioJogo.menuCor !== OURO) problemas.push('o nome do menu nao ficou dourado (cor: ' + out.noProprioJogo.menuCor + ')');
  if (!/mold-ouro/.test(out.noProprioJogo.perfilClasses || '')) problemas.push('a moldura nao aparece no perfil');
  if (!out.noRanking.achou) problemas.push('o pai nao apareceu no ranking do filho');
  else {
    if (!/\bvip\b/.test(out.noRanking.classes)) problemas.push('o ranking nao marcou o pai como VIP');
    if (!out.noRanking.temCoroa) problemas.push('faltou a coroa no nome do pai');
    if (!/mold-ouro/.test(out.noRanking.classes)) problemas.push('a moldura do pai nao chegou no ranking do filho');
    if (out.noRanking.cor !== OURO) problemas.push('o nome do pai nao ficou dourado no ranking (cor: ' + out.noRanking.cor + ')');
  }
  if (out.seguranca.inventada !== '') problemas.push('moldura inventada virou classe: ' + out.seguranca.inventada);
  if (out.seguranca.inexistente !== '') problemas.push('moldura inexistente virou classe');
  if (out.seguranca.nenhuma !== '') problemas.push('"nenhuma" nao devia virar classe');
  if (out.seguranca.valida !== ' mold-ouro') problemas.push('moldura valida nao virou classe');
  if (errs.length) problemas.push('erros de pagina: ' + errs.join(' | '));

  console.log(JSON.stringify(out, null, 1));
  if (problemas.length) { console.log('FALHOU: ' + problemas.join('; ')); process.exit(1); }
  console.log('OK: VIP dourado com coroa e moldura chegam ate o ranking dos outros');
})().catch(e => { console.log('FATAL ' + e.message.split('\n')[0]); process.exit(1); });
