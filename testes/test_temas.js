/* =====================================================================
   OS DEZ TEMAS

   Um tema é fácil de fazer bonito na telinha de escolha e ilegível na
   conversa. Este teste existe para que "ilegível" seja um NÚMERO e não
   uma opinião — e para que o tema claro, que é o mais arriscado dos
   dez, tenha que provar que funciona antes de sair.

   O que ele cobra:
     1. são dez, e cada um traz a paleta INTEIRA (17 variáveis)
     2. a conta de contraste da W3C aprova cada paleta no papel
     3. trocar o tema muda a tela de verdade: o fundo e a letra do body
     4. a cor de destaque escolhida sobrevive à troca de tema
     5. o nível tranca: quem não paga escolhe um tema de Ouro e continua
        no tema de graça — o de sempre, não uma tela quebrada
     6. e a prova de fogo: com o tema CLARO ligado, nenhum texto visível
        na tela fica com contraste abaixo de 3

   O item 6 é o que não dá para trapacear. A conta do item 2 olha a
   tabela; a do item 6 olha a TELA — ou seja, pega a cor que alguém
   escreveu na mão na folha de estilo sem pensar em fundo claro. É
   exatamente esse o jeito de um tema claro sair pela metade.
   ===================================================================== */
const path = require('path');
const { chromium } = require('playwright');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const URL = JOGO + '?nuvem=http://127.0.0.1:8099';

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 420, height: 880 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message.split('\n')[0]));

  await p.goto(URL);
  await p.waitForTimeout(1300);
  await p.evaluate(() => {
    const el = document.getElementById('abertura');
    if (el) { el.className = ''; el.innerHTML = ''; }
  });
  await p.evaluate(() => {
    ROOT.profiles['Zeca'] = defaultSave(); ROOT.current = 'Zeca';
    save = ROOT.profiles['Zeca']; save.__name = 'Zeca';
    save.best = 90; save.crystals = 500; save.tutorialFeito = true;
    calcStats(); persist(); goMenu();
  });
  await p.evaluate(() => idiomaUsar('pt'));
  /* a ficha tem que subir para a nuvem falsa antes: sem ela a Estação não
     abre, e a medição do tema claro perde justamente a tela onde o
     jogador passa mais tempo */
  await p.evaluate(() => nuvemEnviar(true));
  await p.waitForFunction(() => typeof NEO_TEMAS_10 !== 'undefined' && typeof EST !== 'undefined',
                          null, { timeout: 10000 });
  await p.waitForTimeout(600);

  const out = await p.evaluate(() => {
    const CHAVES = ['bg', 'bg2', 'sup1', 'sup2', 'sup3', 'vidro', 'ink', 'ink2',
                    'dim', 'fraco', 'cyan', 'magenta', 'amber', 'violet', 'verde',
                    'line', 'line2'];
    const r = { quantos: NEO_TEMAS_10.length, faltando: [], contraste: [], ids: [] };

    /* UM rgba() NÃO É A COR QUE O OLHO VÊ. Medir "preto a 58%" como
       preto puro aprovaria um --dim que na prática some. Aqui a cor é
       achatada em cima do fundo do próprio tema antes de medir. */
    const achatar = (frente, fundo) => {
      const f = corParaRGB(frente), b = corParaRGB(fundo);
      const m = /rgba\(([^)]+)\)/.exec(String(frente));
      const partes = m ? m[1].split(',') : null;
      const a = partes && partes.length > 3 ? parseFloat(partes[3]) : 1;
      return 'rgb(' + f.map((v, i) => Math.round(v * a + b[i] * (1 - a))).join(',') + ')';
    };

    for (const t of NEO_TEMAS_10) {
      r.ids.push(t.id);
      if (t.doUsuario) continue;
      const faltam = CHAVES.filter(k => !t.v[k]);
      if (faltam.length) r.faltando.push(t.id + ': ' + faltam.join(','));
      const pares = [
        ['ink/bg', t.v.ink, t.v.bg, 4.5],
        ['ink/sup1', t.v.ink, t.v.sup1, 4.5],
        ['ink2/sup1', t.v.ink2, t.v.sup1, 4.5],
        ['dim/sup1', t.v.dim, t.v.sup1, 3],
        ['cyan/bg', t.v.cyan, t.v.bg, 3],
        ['cyan/sup1', t.v.cyan, t.v.sup1, 3],
        ['verde/sup1', t.v.verde, t.v.sup1, 3],
        ['magenta/sup1', t.v.magenta, t.v.sup1, 3],
        ['amber/sup1', t.v.amber, t.v.sup1, 3]
      ];
      for (const [nome, tinta, fundo, minimo] of pares) {
        const razao = contraste(achatar(tinta, t.v.bg), achatar(fundo, t.v.bg));
        if (razao < minimo)
          r.contraste.push(t.id + ' ' + nome + '=' + razao.toFixed(2) + ' (precisa ' + minimo + ')');
      }
    }
    return r;
  });

  /* ---- trocar de tema muda a tela ---- */
  const troca = await p.evaluate(() => {
    const leitura = () => {
      const s = getComputedStyle(document.body);
      const raiz = getComputedStyle(document.documentElement);
      return { fundo: s.backgroundColor, letra: s.color,
               cyan: raiz.getPropertyValue('--cyan').trim(),
               claro: document.body.classList.contains('tema-claro'),
               marca: document.body.getAttribute('data-tema') };
    };
    const r = {};
    save.neo = { nivel: 'ouro', ate: Date.now() + 9e8 };   // para nada ficar travado
    perfilSalvar({ tema10: 'nebula', tema: 'padrao' }); r.escuro = leitura();
    perfilSalvar({ tema10: 'claro' });                  r.claro = leitura();
    perfilSalvar({ tema10: 'cyber', tema: 'rosa' });    r.cyberRosa = leitura();
    return r;
  });

  /* ---- a prova de fogo: o tema claro na tela de verdade ----
     ESPERAR ANTES DE MEDIR não é frescura. Os botões têm transição de
     cor de 160ms; medindo na hora, o que volta é a cor de ANTES, no
     meio do caminho. A primeira versão deste teste reprovou um botão
     que estava certo, e eu passei um tempo bom procurando um bug de
     estilo que não existia. */
  await p.evaluate(() => { perfilSalvar({ tema10: 'claro', tema: 'padrao' }); });
  await p.waitForTimeout(500);

  /* MEDIR SÓ O MENU NÃO PROVA NADA. O menu é a tela mais cuidada do jogo
     e a que menos tem cor escrita na mão. O tema claro quebra onde
     ninguém olha -- a barra de cima de uma página, o balão da conversa.
     Por isso a medição passa por quatro telas e junta o resultado. */
  const medirTela = () => p.evaluate(() => {
    const razao = (a, b) => contraste(a, b);
    /* O FUNDO DE VERDADE de um elemento é o primeiro pai que tenha fundo
       opaco -- quem tem "transparent" está mostrando o de cima.
       E ele tem que olhar o background-IMAGE também: a barra de cima das
       páginas pintava um azul escuro por degradê, com backgroundColor
       transparente. Uma primeira versão deste teste só lia a cor, achava
       o fundo claro do body e aprovava letra escura em cima de barra
       escura. Olhar só metade da pintura é não olhar. */
    const primeiraCorDe = txt => {
      const m = /rgba?\([^)]+\)|#[0-9a-f]{3,8}/i.exec(String(txt || ''));
      return m ? m[0] : null;
    };
    const opaca = c => {
      const m = /rgba\(([^)]+)\)/.exec(String(c));
      return !m || (parseFloat(m[1].split(',')[3]) || 0) > 0.55;
    };
    const fundoReal = el => {
      let n = el;
      while (n && n !== document.documentElement) {
        const s = getComputedStyle(n);
        const img = s.backgroundImage;
        if (img && img !== 'none') {
          const c = primeiraCorDe(img);
          if (c && opaca(c)) return c;
        }
        const c = primeiraCorDe(s.backgroundColor);
        if (c && opaca(c)) return c;
        n = n.parentElement;
      }
      return getComputedStyle(document.body).backgroundColor;
    };
    const ruins = [];
    let olhados = 0;
    const capa = document.querySelector('.estacao.on');
    const onde = capa || document;
    onde.querySelectorAll('button, a, h1, h2, h3, p, label, b, span, em, div').forEach(el => {
      if (ruins.length > 24) return;
      const texto = Array.from(el.childNodes)
        .filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
      if (texto.length < 2) return;                    // só quem realmente mostra letra
      const cx = el.getBoundingClientRect();
      if (cx.width < 8 || cx.height < 6) return;
      const s = getComputedStyle(el);
      if (s.visibility === 'hidden' || s.display === 'none') return;
      if (parseFloat(s.opacity) < 0.35) return;        // já está apagado de propósito
      olhados++;
      const fundo = fundoReal(el);
      const r = razao(s.color, fundo);
      /* a queixa diz as DUAS cores: "sumiu" não conserta nada, "letra
         branca em cima de cartão branco" conserta */
      if (r < 3) ruins.push(texto.slice(0, 22) + ' = ' + r.toFixed(2) +
        ' [letra ' + s.color + ' em ' + fundo + ' | ' +
        el.tagName.toLowerCase() + '.' + String(el.className || '').split(' ')[0] + ']');
    });
    return { olhados, ruins };
  });

  const naTela = { olhados: 0, ruins: [] };
  const telas = [
    ['menu', () => p.evaluate(() => { goMenu(); refreshMenu(); showScreen('menu'); })],
    ['ajustes', () => p.evaluate(() => ajAbrir())],
    ['loja', () => p.evaluate(() => { S.mode = 'shop'; renderShop(); showScreen('shop'); })],
    ['hangar', () => p.evaluate(() => { S.mode = 'hangar'; renderHangar(true); showScreen('hangar'); })],
    /* quem ABRE a capa é estacaoAbrir(); estAbrir() só troca de destino
       dentro de uma estação que já está aberta. Chamar a segunda sem a
       primeira não abre nada, e foi por isso que esta linha mediu o
       hangar duas vezes na primeira versão. */
    ['estacao', async () => {
      await p.evaluate(() => estacaoAbrir({ tipo: 'canal', id: 'geral', nome: 'geral' }));
      await p.waitForTimeout(700);
      await p.evaluate(() => estAbrir({ tipo: 'canal', id: 'geral', nome: 'geral' }));
    }]
  ];
  /* CONFERIR QUE A TELA TROCOU MESMO. Na primeira versão a Estação não
     abria e a medição repetia o hangar palavra por palavra -- dois nomes
     no relatório, uma tela só medida. Um teste que mede a mesma coisa
     duas vezes está dizendo que cobriu o dobro do que cobriu. */
  const qualTela = () => p.evaluate(() => {
    /* a Estação não é .screen nem .page: é uma capa por cima de tudo
       (.estacao.on). Esquecê-la fazia o teste medir o hangar duas vezes
       e chamar a segunda de "estacao". */
    const v = document.querySelector('.estacao.on') ||
              document.querySelector('.screen.show, .page.show');
    return v ? v.id : '(nenhuma)';
  });
  const vistas = {};
  for (const [nome, ir] of telas) {
    try { await ir(); } catch (e) { naTela.ruins.push(nome + ' nao abriu: ' + e.message.split('\n')[0]); continue; }
    await p.waitForTimeout(600);
    const id = await qualTela();
    if (vistas[id]) naTela.ruins.push(nome + ' nao abriu: continuou em ' + id);
    vistas[id] = 1;
    const r = await medirTela();
    naTela.olhados += r.olhados;
    for (const m of r.ruins) naTela.ruins.push(nome + ': ' + m);
  }

  /* ---- o nível tranca ---- */
  const trava = await p.evaluate(() => {
    save.neo = null;                                   // piloto comum, sem NeoNebula
    perfilSalvar({ tema10: 'solar' });                 // Solar Gold é de Ouro
    return { guardado: perfilMeu().tema10, valendo: temaDoPerfil().id };
  });

  await b.close();

  const problemas = [];
  const erro = m => problemas.push(m);

  if (out.quantos !== 10) erro('sao ' + out.quantos + ' temas, e nao 10: ' + out.ids.join(','));
  if (out.faltando.length) erro('tema com paleta incompleta: ' + out.faltando.join(' | '));
  if (out.contraste.length)
    erro('paleta ilegivel no papel: ' + out.contraste.join(' | '));

  if (troca.escuro.fundo === troca.claro.fundo)
    erro('trocar para o tema claro nao mudou o fundo da tela: ' + troca.claro.fundo);
  if (troca.escuro.letra === troca.claro.letra)
    erro('trocar para o tema claro nao mudou a cor da letra');
  if (!troca.claro.claro) erro('o tema claro nao marcou o body com tema-claro');
  if (troca.escuro.claro) erro('o tema escuro marcou o body como claro');
  if (troca.cyberRosa.marca !== 'cyber')
    erro('a marca data-tema nao acompanhou: ' + troca.cyberRosa.marca);
  /* a cor de destaque entra DEPOIS do tema: se o tema a apagasse, quem
     escolheu Carmim veria ciano toda vez que trocasse de tema */
  /* a variável guarda o que foi escrito nela, ou seja o hexa da tabela —
     e não o "rgb(...)" que o getComputedStyle de um elemento devolveria */
  if (!/^#FF4D8F$/i.test(troca.cyberRosa.cyan))
    erro('o tema apagou a cor de destaque escolhida: --cyan ficou ' + troca.cyberRosa.cyan);

  if (naTela.olhados < 10)
    erro('so ' + naTela.olhados + ' textos visiveis foram medidos: o teste nao olhou a tela');
  if (naTela.ruins.length)
    erro('com o tema claro ligado, ' + naTela.ruins.length + ' texto(s) sumiram no fundo: ' +
         naTela.ruins.join(' | '));

  if (trava.guardado === 'solar')
    erro('um piloto sem NeoNebula conseguiu GRAVAR um tema de Ouro');
  if (trava.valendo !== 'nebula')
    erro('o tema travado nao caiu no de graça: ficou valendo ' + trava.valendo);

  if (errs.length) erro('erros de pagina: ' + errs.join(' | '));

  console.log(JSON.stringify({ out, troca, naTela, trava }, null, 1));
  if (problemas.length) { console.log('FALHOU: ' + problemas.join('; ')); process.exit(1); }
  console.log('OK: os dez temas -- paleta inteira, contraste medido e o claro legivel na tela');
})().catch(e => { console.log('FATAL ' + e.message.split('\n')[0]); process.exit(1); });
