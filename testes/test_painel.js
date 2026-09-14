/* =====================================================================
   O PAINEL DO ADMINISTRADOR — v8.3

   Três coisas que o dono pediu, e uma que ele não pediu mas é a razão
   de tudo funcionar:

   1. UMA lista de jogadores, não duas. Eram dois cartões lendo o MESMO
      lugar da nuvem, cada um com metade da informação.
   2. DAR num toque. Antes tudo ia para uma caixa e você tinha que ir a
      outra abinha, escrever um recado e enviar: três telas para dar
      cristais.
   3. TIRAR na hora, nunca como presente. Chegava embrulhado, com som de
      baú: a pessoa abria a caixinha para descobrir que tinha perdido as
      naves.
   4. E o catálogo: dar QUALQUER coisa, item a item, por categoria.
   ===================================================================== */
const path = require('path');
const { chromium } = require('playwright');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const out = {}; const errs = []; const problemas = [];
  /* tela de computador: é para ela que este painel foi desenhado */
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_')) errs.push('CONSOLE: ' + m.text()); });
  await p.goto(JOGO + '?nuvem=http://127.0.0.1:8099');
  await p.waitForTimeout(1400);
  await p.evaluate(() => { const el = document.getElementById('abertura'); if (el) { el.className = ''; el.innerHTML = ''; } });
  await p.evaluate(() => {
    ROOT.profiles['Davi'] = defaultSave(); ROOT.current = 'Davi'; save = ROOT.profiles['Davi'];
    save.__name = 'Davi'; save.best = 40; save.crystals = 5000; save.tutorialFeito = true;
    calcStats(); persist(); goMenu();
  });
  await p.evaluate(() => idiomaUsar('pt'));
  await p.waitForTimeout(600);
  await p.evaluate(() => showScreen('adm'));
  await p.waitForTimeout(300);
  await p.fill('#adm-nick', 'Cr1cket');
  await p.fill('#adm-pass', 'neonadmin');
  await p.click('#btn-adm-enter');
  await p.waitForTimeout(900);

  /* ---- o layout de computador ---- */
  out.layout = await p.evaluate(() => {
    const abas = document.getElementById('adm-abas').getBoundingClientRect();
    const panel = document.getElementById('adm-panel');
    const r = panel.getBoundingClientRect();
    return { display: getComputedStyle(panel).display,
             menuNaEsquerda: abas.left < r.left,
             menuLargura: Math.round(abas.width),
             marca: !!document.querySelector('.adm-marca'),
             /* o menu não pode rolar de lado no computador: cabe inteiro */
             menuRola: document.getElementById('adm-abas').scrollWidth >
                       document.getElementById('adm-abas').clientWidth + 1,
             abasVisiveis: document.querySelectorAll('#adm-abas .adm-aba').length };
  });

  /* ---- jogadores falsos, como se tivessem aberto o jogo ----

     ANTES DE INVENTAR A LISTA, DESLIGA QUEM A REESCREVE. A janela AO
     VIVO é alimentada por um fluxo da nuvem e por uma segunda olhada
     que chega 1,5s depois. Se qualquer um dos dois chegar no meio do
     teste, os seis nomes de mentira somem e a linha 2 deixa de ser o
     Lucas -- o teste passava sozinho e falhava na bateria, que é o
     pior tipo de teste que existe. */
  await p.evaluate(() => {
    const nomes = ['Davi', 'Lucas', 'Bia', 'Pedro', 'Ana', 'Kauan'];
    vivoDesligar();
    admRetentou = true;
    admNuvemCarregar = async () => {};
    vivoDados = {};
    nomes.forEach((n, i) => {
      vivoDados['id' + i] = { nome: n, fase: 10 + i * 17, cristais: 1200 * (i + 1),
        naves: 3 + i, versao: i % 3 === 0 ? '7.9' : VERSAO, onde: 'Menu',
        atualizado: Date.now() - (i < 4 ? 2000 : 600000), entrou: Date.now() - i * 300000 };
    });
    vivoRender();
  });
  await p.waitForTimeout(400);

  /* ---- UMA lista só ---- */
  out.umaLista = await p.evaluate(() => ({
    linhas: document.querySelectorAll('#vivo-lista .vivo-row').length,
    /* a lista antiga tem que estar vazia: duas listas da mesma coisa era
       o problema, não a solução */
    listaAntiga: document.querySelectorAll('#adm-nuvem-lista .profile-btn').length,
    /* e admNuvemLista, que o resto do painel consulta, sai da mesma fonte */
    admLista: admNuvemLista.length,
    numeros: { agora: document.getElementById('num-agora').textContent,
               pilotos: document.getElementById('num-pilotos').textContent,
               velha: document.getElementById('num-velha').textContent },
    barras: document.querySelectorAll('#num-barras i').length
  }));

  /* ---- a busca da lista ---- */
  out.buscaLista = await p.evaluate(() => {
    const c = document.getElementById('adm-nuvem-busca');
    c.value = 'bia'; c.dispatchEvent(new Event('input'));
    const n = document.querySelectorAll('#vivo-lista .vivo-row').length;
    c.value = ''; c.dispatchEvent(new Event('input'));
    return { achou: n, voltou: document.querySelectorAll('#vivo-lista .vivo-row').length };
  });

  /* ---- escolher um jogador e ver as ações na mesma tela ---- */
  await p.evaluate(() => { abaAdm = 'acoes'; renderAbasAdm(); });
  await p.waitForTimeout(300);
  /* escolhe pelo NOME, não pela posição: a lista se ordena por quem
     está online, e uma ordem diferente não é motivo para falhar */
  await p.evaluate(() => {
    const linhas = [...document.querySelectorAll('#vivo-lista .vivo-row')];
    const alvo = linhas.find(l => l.querySelector('.vivo-nome').textContent.trim() === 'Lucas');
    (alvo || linhas[1]).click();
  });
  await p.waitForTimeout(500);
  out.escolheu = await p.evaluate(() => {
    const sel = document.getElementById('adm-nuvem-sel');
    const lista = document.getElementById('adm-vivo').getBoundingClientRect();
    const acoes = document.getElementById('adm-nuvem').getBoundingClientRect();
    return { alvo: admNuvemAlvo && admNuvemAlvo.nome,
             acoesAbertas: getComputedStyle(sel).display !== 'none',
             /* lado a lado: escolher à esquerda, agir à direita */
             ladoALado: acoes.left >= lista.right - 2 };
  });

  /* ---- DAR NUM TOQUE: o normal é na hora ---- */
  out.modo = await p.evaluate(() => ({
    padrao: admModo,
    botaoAceso: (document.querySelector('.adm-modo-b.on') || {}).getAttribute('data-modo')
  }));
  out.darNaHora = await p.evaluate(async () => {
    admModo = 'agora'; admModoRender();
    caixaAdm = {};
    const antes = Object.keys(caixaAdm).length;
    document.getElementById('adm-nuvem-gem').value = '7777';
    document.getElementById('adm-nuvem-dar').click();
    await new Promise(r => setTimeout(r, 700));
    return { caixaAntes: antes, caixaDepois: Object.keys(caixaAdm).length,
             recado: document.getElementById('adm-msg').textContent };
  });
  out.darNoPacote = await p.evaluate(async () => {
    admModo = 'caixa'; admModoRender();
    caixaAdm = {};
    document.getElementById('adm-nuvem-gem').value = '1234';
    document.getElementById('adm-nuvem-dar').click();
    await new Promise(r => setTimeout(r, 300));
    const n = Object.keys(caixaAdm).length;
    caixaAdm = {}; admModo = 'agora'; admModoRender(); renderCaixaAdm();
    return n;
  });

  /* ---- TIRAR É NA HORA, E NUNCA VIRA PRESENTE ---- */
  out.tirarNaoVaiNaCaixa = await p.evaluate(() => {
    caixaAdm = {};
    /* mesmo pedindo de propósito, a caixa recusa: a regra mora num lugar
       só, senão um dia um botão escapa */
    porNaCaixa({ zerarFases: true }, 'Fases zeradas');
    porNaCaixa({ tirarNaves: true }, 'Naves');
    porNaCaixa({ setCristais: 0 }, 'Zerar cristais');
    return Object.keys(caixaAdm).length;
  });
  out.tirarPedeDoisToques = await p.evaluate(async () => {
    admNuvemConfirmar = null;
    document.getElementById('adm-nuvem-fases-zero').click();
    const primeiro = document.getElementById('adm-msg').textContent;
    await new Promise(r => setTimeout(r, 200));
    document.getElementById('adm-nuvem-fases-zero').click();
    await new Promise(r => setTimeout(r, 700));
    return { primeiro, segundo: document.getElementById('adm-msg').textContent,
             naCaixa: Object.keys(caixaAdm).length };
  });

  /* ---- e no JOGO do jogador, tirar não chega embrulhado ---- */
  out.noJogo = await p.evaluate(() => {
    const sv = defaultSave();
    sv.ships = [0, 1, 2, 3]; sv.crystals = 9000; sv.best = 50;
    /* um presente de verdade */
    const bom = aplicarPresente(sv, { cristais: 500, darNaves: [5] });
    /* e uma retirada */
    const ruim = aplicarPresente(sv, { tirarNaves: true, zerarFases: true });
    return { ganhouItens: bom.itens.length, ganhouTirados: bom.tirados.length,
             perdeuItens: ruim.itens.length, perdeuTirados: ruim.tirados.length,
             perdeuMarcado: ruim.tirou };
  });
  out.avisoSeco = await p.evaluate(() => {
    avisarRetirada([{ icone: '⚠', texto: 'Suas naves foram removidas', ruim: true }]);
    const av = document.getElementById('retirada-aviso');
    const cp = document.getElementById('caixa-presente');
    const r = { avisoAberto: av.classList.contains('on'),
                itens: document.querySelectorAll('#retirada-itens .retirada-item').length,
                /* e a caixa de presente NÃO pode ter aberto junto */
                presenteAberto: cp ? cp.classList.contains('on') : false };
    document.getElementById('retirada-ok').click();
    r.fechou = !av.classList.contains('on');
    return r;
  });

  /* ---- O CATÁLOGO: dar qualquer coisa, por categoria ---- */
  await p.evaluate(() => { subAcao = 'catalogo'; renderSubAcoes(); });
  await p.waitForTimeout(400);
  out.catalogo = await p.evaluate(() => {
    const porCat = {};
    for (const c of CATEGORIAS) { try { porCat[c.id] = c.itens().length; } catch (e) { porCat[c.id] = 'ERRO'; } }
    return { categorias: document.querySelectorAll('#cat-abas [data-cat]').length,
             itensNaTela: document.querySelectorAll('#cat-grade [data-i]').length, porCat };
  });
  out.catBusca = await p.evaluate(() => {
    const c = document.getElementById('cat-busca');
    c.value = SHIPS[7].name; c.dispatchEvent(new Event('input'));
    const n = document.querySelectorAll('#cat-grade [data-i]').length;
    c.value = ''; c.dispatchEvent(new Event('input'));
    return n;
  });

  /* cada categoria tem que ENTREGAR de verdade: o teste aplica o
     presente de um item de cada uma numa conta de mentira e confere que
     a conta mudou. Um botão que não muda nada é pior que um botão que
     não existe. */
  out.entrega = await p.evaluate(() => {
    const r = {};
    for (const c of CATEGORIAS) {
      let itens = [];
      try { itens = c.itens(); } catch (e) { r[c.id] = 'ERRO ' + e.message; continue; }
      if (!itens.length) { r[c.id] = 'VAZIA'; continue; }
      const it = itens[itens.length - 1];
      const sv = defaultSave();
      const antes = JSON.stringify(sv);
      let res;
      try { res = aplicarPresente(sv, it.dar); } catch (e) { r[c.id] = 'ESTOUROU ' + e.message; continue; }
      const mudou = JSON.stringify(sv) !== antes;
      r[c.id] = { mudou, anotou: res.itens.length > 0, item: it.nome };
    }
    return r;
  });

  await p.screenshot({ path: 'painel.png' });

  /* =====================================================================
     E AGORA O CELULAR
     ---------------------------------------------------------------------
     O painel foi desenhado para o computador, mas o dono abre ele do
     telefone -- é de lá que ele vê que alguém entrou. Três coisas
     precisam valer aqui:

     1. a marca "▲NEON PAINEL" e o resumo do rodapé, que são da coluna
        fixa da esquerda, NÃO podem aparecer no meio da tira de abas:
        eles empurravam a primeira aba para fora da tela
     2. a tira de abas gruda no topo, senão quem rola a lista de
        jogadores perde de vista como se troca de aba
     3. nada de alvo de mouse: tudo o que se toca tem altura de dedo
     ===================================================================== */
  const cel = await b.newPage({ viewport: { width: 390, height: 844 },
                                isMobile: true, hasTouch: true });
  cel.on('pageerror', e => errs.push('CEL PAGEERROR: ' + e.message));
  await cel.goto(JOGO + '?nuvem=http://127.0.0.1:8099');
  await cel.waitForTimeout(1400);
  await cel.evaluate(() => { const el = document.getElementById('abertura'); if (el) { el.className = ''; el.innerHTML = ''; } });
  await cel.evaluate(() => {
    ROOT.profiles['Davi'] = defaultSave(); ROOT.current = 'Davi'; save = ROOT.profiles['Davi'];
    save.__name = 'Davi'; save.best = 40; save.crystals = 5000; save.tutorialFeito = true;
    calcStats(); persist(); goMenu();
  });
  await cel.evaluate(() => idiomaUsar('pt'));
  await cel.evaluate(() => showScreen('adm'));
  await cel.waitForTimeout(300);
  await cel.fill('#adm-nick', 'Cr1cket');
  await cel.fill('#adm-pass', 'neonadmin');
  await cel.click('#btn-adm-enter');
  await cel.waitForTimeout(1000);
  await cel.evaluate(() => {
    vivoDesligar(); admRetentou = true; admNuvemCarregar = async () => {};
    vivoDados = {};
    ['Davi', 'Lucas', 'Bia'].forEach((n, i) => {
      vivoDados['id' + i] = { nome: n, fase: 10 + i, cristais: 1200, naves: 3,
        versao: VERSAO, onde: 'Menu', atualizado: Date.now() - 2000, entrou: Date.now() };
    });
    vivoRender();
  });
  await cel.waitForTimeout(400);
  out.celular = await cel.evaluate(() => {
    const larg = innerWidth;
    const vis = el => el && getComputedStyle(el).display !== 'none';
    const abas = document.getElementById('adm-abas');
    const pequenos = [], fora = [];
    /* mede só o que está DENTRO da tela: a tira de abas rola de lado de
       propósito, e cobrar dela caber inteira seria cobrar o contrário
       do que ela foi feita para fazer */
    document.querySelectorAll('#screen-adm button, #screen-adm input').forEach(el => {
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden') return;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const nome = el.id || String(el.className).split(' ')[0] || el.tagName;
      if (abas.contains(el)) { if (r.height < 36) pequenos.push(nome + ' h=' + Math.round(r.height)); return; }
      if (r.right > larg + 1 || r.left < -1) fora.push(nome);
      if (r.height < 36) pequenos.push(nome + ' h=' + Math.round(r.height));
    });
    const primeira = abas.querySelector('.adm-aba');
    return {
      marcaEscondida: !vis(document.querySelector('.adm-marca')),
      rodapeEscondido: !vis(document.querySelector('.adm-lado-pe')),
      /* a primeira aba tem que começar no começo, e não empurrada */
      primeiraNoComeco: primeira
        ? primeira.getBoundingClientRect().left - abas.getBoundingClientRect().left < 20 : false,
      abasGrudadas: getComputedStyle(abas).position === 'sticky',
      pequenos: [...new Set(pequenos)],
      fora: [...new Set(fora)],
      /* uma coluna só, e nada saindo pela lateral */
      umaColuna: getComputedStyle(document.getElementById('adm-panel')).gridTemplateColumns === 'none' ||
                 document.getElementById('adm-panel').getBoundingClientRect().width <= larg,
      rolaDeLado: document.documentElement.scrollWidth > larg + 1
    };
  });
  /* e escolher um jogador tem que abrir as ações também no celular */
  await cel.evaluate(() => { abaAdm = 'acoes'; renderAbasAdm(); });
  await cel.waitForTimeout(300);
  await cel.evaluate(() => {
    const l = [...document.querySelectorAll('#vivo-lista .vivo-row')];
    (l.find(x => x.querySelector('.vivo-nome').textContent.trim() === 'Lucas') || l[0]).click();
  });
  await cel.waitForTimeout(500);
  out.celularEscolhe = await cel.evaluate(() => ({
    alvo: admNuvemAlvo && admNuvemAlvo.nome,
    abriu: getComputedStyle(document.getElementById('adm-nuvem-sel')).display !== 'none'
  }));
  await cel.screenshot({ path: 'painel-celular.png' });
  await b.close();
  out.errs = errs;
  const erro = m => problemas.push(m);

  const L = out.layout;
  if (L.display !== 'grid') erro('no computador o painel nao virou grade (display ' + L.display + ')');
  if (!L.menuNaEsquerda) erro('o menu nao esta a esquerda do conteudo');
  if (L.menuLargura < 150) erro('o menu lateral tem so ' + L.menuLargura + 'px');
  if (!L.marca) erro('o menu lateral nao tem a marca no topo');
  if (L.menuRola) erro('o menu lateral rola de lado no computador: devia caber inteiro');
  if (L.abasVisiveis < 5) erro('so ' + L.abasVisiveis + ' abas no menu');
  if (out.umaLista.linhas !== 6) erro('a lista mostrou ' + out.umaLista.linhas + ' de 6 jogadores');
  if (out.umaLista.listaAntiga) erro('a lista ANTIGA ainda desenha: voltaram as duas listas');
  if (out.umaLista.admLista !== 6) erro('admNuvemLista nao saiu da mesma fonte da tabela');
  if (out.umaLista.numeros.agora !== '4') erro('o topo diz ' + out.umaLista.numeros.agora + ' jogando, eram 4');
  if (out.umaLista.numeros.velha !== '2') erro('o topo diz ' + out.umaLista.numeros.velha + ' na versao velha, eram 2');
  if (out.umaLista.barras !== 12) erro('o grafico tem ' + out.umaLista.barras + ' barras');
  if (out.buscaLista.achou !== 1) erro('a busca da lista achou ' + out.buscaLista.achou + ' em vez de 1');
  if (out.buscaLista.voltou !== 6) erro('limpar a busca nao devolveu a lista');
  if (out.escolheu.alvo !== 'Lucas') erro('tocar na linha nao escolheu o jogador');
  if (!out.escolheu.acoesAbertas) erro('escolher um jogador nao abriu as acoes');
  if (!out.escolheu.ladoALado) erro('lista e acoes nao ficam lado a lado no computador');
  if (out.modo.padrao !== 'agora') erro('o padrao de entrega nao e NA HORA');
  if (out.modo.botaoAceso !== 'agora') erro('o botao aceso nao e o NA HORA');
  if (out.darNaHora.caixaDepois !== 0) erro('DAR no modo NA HORA ainda encheu a caixa');
  if (out.darNoPacote !== 1) erro('o modo pacote nao pos na caixa');
  if (out.tirarNaoVaiNaCaixa !== 0)
    erro('a caixa aceitou ' + out.tirarNaoVaiNaCaixa + ' retirada(s): tirar viraria presente');
  if (!/de novo/i.test(out.tirarPedeDoisToques.primeiro)) erro('tirar nao pediu confirmacao');
  if (!/AGORA/i.test(out.tirarPedeDoisToques.primeiro)) erro('a confirmacao nao avisa que e AGORA');
  if (out.tirarPedeDoisToques.naCaixa) erro('tirar confirmado foi parar na caixa');
  const J = out.noJogo;
  if (!J.ganhouItens) erro('um presente de verdade nao gerou itens de caixa');
  if (J.ganhouTirados) erro('um presente gerou aviso de retirada');
  if (J.perdeuItens) erro('uma RETIRADA gerou ' + J.perdeuItens + ' item(ns) de presente: chegaria embrulhada');
  if (!J.perdeuTirados) erro('a retirada nao gerou aviso nenhum: o jogador nao saberia');
  if (!J.perdeuMarcado) erro('a retirada nao foi marcada como retirada');
  if (!out.avisoSeco.avisoAberto) erro('o aviso de retirada nao abriu');
  if (!out.avisoSeco.itens) erro('o aviso de retirada abriu vazio');
  if (out.avisoSeco.presenteAberto) erro('a caixa de PRESENTE abriu junto com a retirada');
  if (!out.avisoSeco.fechou) erro('o aviso de retirada nao fecha');
  if (out.catalogo.categorias < 10) erro('so ' + out.catalogo.categorias + ' categorias no catalogo');
  for (const k of ['naves','exclusivas','amuletos','habilidades','melhorias','pecas',
                   'passes','vip','molduras','ranks','emotes','cristais'])
    if (!out.catalogo.porCat[k]) erro('a categoria ' + k + ' esta vazia ou quebrada');
  if (out.catalogo.porCat.naves < 100) erro('so ' + out.catalogo.porCat.naves + ' naves no catalogo');
  if (out.catBusca < 1) erro('a busca do catalogo nao achou uma nave pelo nome');
  for (const k in out.entrega) {
    const e = out.entrega[k];
    if (typeof e === 'string') { erro('categoria ' + k + ': ' + e); continue; }
    if (!e.mudou) erro('dar "' + e.item + '" (' + k + ') NAO mudou nada na conta');
    if (!e.anotou) erro('dar "' + e.item + '" (' + k + ') nao avisa o jogador do que ganhou');
  }
  const C = out.celular;
  if (!C.marcaEscondida)
    erro('no celular a marca "NEON PAINEL" aparece dentro da tira de abas e empurra a primeira para fora');
  if (!C.rodapeEscondido) erro('no celular o resumo do rodape do menu aparece no meio das abas');
  if (!C.primeiraNoComeco) erro('no celular a primeira aba nao comeca no comeco da tira');
  if (!C.abasGrudadas) erro('no celular a tira de abas nao gruda no topo: quem rola perde as abas de vista');
  if (C.pequenos.length) erro('no celular, alvo de mouse em vez de dedo: ' + C.pequenos.join(', '));
  if (C.fora.length) erro('no celular, fora da tela: ' + C.fora.join(', '));
  if (C.rolaDeLado) erro('no celular a tela inteira rola de lado');
  if (out.celularEscolhe.alvo !== 'Lucas') erro('no celular, tocar na linha nao escolheu o jogador');
  if (!out.celularEscolhe.abriu) erro('no celular, escolher um jogador nao abriu as acoes');
  if (errs.length) erro('erros de pagina: ' + errs.join(' | '));

  console.log(JSON.stringify(out, null, 1));
  if (problemas.length) { console.log('FALHOU: ' + problemas.join('; ')); process.exit(1); }
  console.log('OK: painel no computador e no celular, uma lista, dar num toque e tirar na hora');
})().catch(e => { console.log('FATAL ' + e.message.split('\n')[0]); process.exit(1); });
