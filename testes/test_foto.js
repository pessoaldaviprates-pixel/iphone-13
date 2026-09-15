/* =====================================================================
   A FOTO DO PERFIL — trocar, e ELA APARECER

   Isto nasceu de uma queixa direta: "quando eu troco a imagem ele não
   aparece nem no perfil nem quando está no chat, e a imagem do meu pai
   também não apareceu".

   São duas coisas diferentes e o teste cobra as duas:

     A MINHA foto, na hora. Troquei, tem que aparecer no editor, no
     cartão do meu perfil e do lado das minhas mensagens — sem recarregar
     a página.

     A foto DO OUTRO, depois. Este é o caso do pai: eu abro o perfil
     dele ANTES de ele ter foto, ele põe uma, e eu tenho que passar a
     ver. Um cache que guarda "essa pessoa não tem foto" para sempre faz
     exatamente o que ele descreveu — e é por isso que o teste olha o
     perfil antes de a foto existir, de propósito.
   ===================================================================== */
const path = require('path');
const { chromium } = require('playwright');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const URL = JOGO + '?nuvem=http://127.0.0.1:8099';

/* um PNG 2x2 de verdade, pequeno o bastante para caber aqui dentro.
   Tem que ser uma imagem que decodifica: o encolhedor usa um <img>, e
   um arquivo falso morreria no onerror e o teste passaria a testar o
   caminho do erro sem perceber. */
const PNG_2x2 = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4' +
                'AWP8z8AARIQBIz0UAgArfwX/eBwqNQAAAABJRU5ErkJggg==';

async function piloto(ctx, nome) {
  const p = await ctx.newPage();
  await p.goto(URL);
  await p.waitForTimeout(1300);
  await p.evaluate(() => {
    const el = document.getElementById('abertura');
    if (el) { el.className = ''; el.innerHTML = ''; }
  });
  await p.evaluate(n => {
    ROOT.profiles[n] = defaultSave(); ROOT.current = n; save = ROOT.profiles[n];
    save.__name = n; save.best = 60; save.crystals = 900; save.tutorialFeito = true;
    calcStats(); persist(); goMenu();
  }, nome);
  await p.evaluate(() => idiomaUsar('pt'));
  await p.evaluate(() => nuvemEnviar(true));
  await p.waitForFunction(n => typeof FOTOS !== 'undefined' && save.__name === n, nome,
                          { timeout: 10000 });
  await p.waitForTimeout(500);
  return p;
}

/* põe a foto pelo mesmo caminho que o dedo do jogador percorre: o
   <input type=file> do editor. Um teste que chamasse fotoGuardar()
   direto pularia justamente a parte que pode estar quebrada. */
async function porFoto(p) {
  await p.evaluate(() => { estacaoAbrir(); estEditarPerfil(); });
  await p.waitForTimeout(700);
  const arq = await p.$('#pf-arq');
  if (!arq) return 'o editor abriu sem o campo de escolher imagem';
  await arq.setInputFiles({ name: 'eu.png', mimeType: 'image/png',
                            buffer: Buffer.from(PNG_2x2, 'base64') });
  await p.waitForTimeout(1500);
  return '';
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
/* UM NAVEGADOR POR PESSOA, e não duas abas no mesmo.
   Duas páginas dentro do mesmo `newContext` dividem a mesma fila de
   conexões. A Estação segura UM fluxo (SSE) aberto por página, e duas
   dessas mais as leituras normais secavam a fila para o endereço do
   Firebase falso: o `estEnviar` ficava esperando um socket que nunca
   vinha, para sempre, e o teste pendurava sem erro nenhum.

   Custou um bom tempo de caça porque o mesmo código funciona sozinho e
   funciona no jogo de verdade -- lá cada pessoa tem o seu navegador,
   que é exatamente o que um contexto separado imita. */
  const janela = () => b.newContext({ viewport: { width: 420, height: 880 } });
  const errs = [];
  const problemas = [];
  const erro = m => problemas.push(m);

  const pai = await piloto(await janela(), 'Pai');
  const filho = await piloto(await janela(), 'Filho');
  pai.on('pageerror', e => errs.push('Pai: ' + e.message.split('\n')[0]));
  filho.on('pageerror', e => errs.push('Filho: ' + e.message.split('\n')[0]));

  const idDoPai = await pai.evaluate(() => estEu().id);

  /* limpa a nuvem falsa: sem isto o teste herda a foto da rodada
     anterior e passa sem ter provado nada */
  await pai.evaluate(async () => {
    for (const no of ['conversas', 'amigos']) await nuvemSoltar(no, null, 'DELETE');
  });
  await pai.waitForTimeout(400);
  await pai.evaluate(() => nuvemEnviar(true));
  await filho.evaluate(() => nuvemEnviar(true));
  await pai.waitForTimeout(600);

  /* --- 1. o filho olha o perfil do pai ANTES de existir foto --- */
  await filho.evaluate(async id => {
    estacaoAbrir();
    await estAbrir({ tipo: 'canal', id: 'geral', nome: 'geral' });
    estAbrirPerfil(id);
  }, idDoPai);
  await filho.waitForTimeout(1200);
  const antes = await filho.evaluate(id => ({
    guardado: FOTOS[id],
    temNaTela: !!document.querySelector('.pf-capa .com-foto, .pf-foto-previa.com-foto')
  }), idDoPai);
  await filho.evaluate(() => estFecharJanela());

  /* --- 2. o pai põe a foto --- */
  const falhou = await porFoto(pai);
  if (falhou) erro(falhou);

  const doPai = await pai.evaluate(() => {
    const eu = estEu();
    return {
      naMemoria: (FOTOS[eu.id] || '').slice(0, 22),
      marcaNaFicha: perfilMeu().foto,
      previaNoEditor: !!document.querySelector('.pf-foto-previa.com-foto'),
      estiloDaPrevia: (document.querySelector('.pf-foto-previa') || {}).outerHTML
        ? (document.querySelector('.pf-foto-previa').getAttribute('style') || '').slice(0, 40) : ''
    };
  });

  /* o pai manda uma mensagem, para a foto ter onde aparecer no chat */
  await pai.evaluate(async () => {
    estFecharJanela();
    await estAbrir({ tipo: 'canal', id: 'geral', nome: 'geral' });
    const campo = document.getElementById('est-campo');
    if (campo) { campo.value = 'oi, pus uma foto'; }
    await estEnviar('oi, pus uma foto');
  });
  await pai.waitForTimeout(1500);

  const noChatDoPai = await pai.evaluate(() => ({
    mensagens: document.querySelectorAll('.est-msg').length,
    comFoto: document.querySelectorAll('.est-msg .est-av.com-foto').length,
    comRobo: document.querySelectorAll('.est-msg .est-av.com-robo').length
  }));

  /* --- 3. o filho, na MESMA sessão, tem que passar a ver ---
     A batida que relê as fichas roda de vinte em vinte segundos. Esperar
     vinte segundos de verdade aqui seria trocar um teste por uma soneca,
     então o teste dá a batida na mão -- é a mesma função, chamada no
     mesmo lugar, só que agora. */
  await filho.evaluate(async () => {
    await estAbrir({ tipo: 'canal', id: 'geral', nome: 'geral' });
    await estOlharNovidades();
  });
  await filho.waitForTimeout(2500);
  const noChatDoFilho = await filho.evaluate(id => ({
    guardado: (FOTOS[id] || '').slice(0, 22),
    mensagens: document.querySelectorAll('.est-msg').length,
    comFoto: document.querySelectorAll('.est-msg .est-av.com-foto').length
  }), idDoPai);

  await filho.evaluate(id => estAbrirPerfil(id), idDoPai);
  await filho.waitForTimeout(1500);
  const perfilDoPai = await filho.evaluate(() => ({
    temFoto: !!document.querySelector('.pf-capa .com-foto, .pf-av.com-foto, .pf-foto-previa.com-foto'),
    html: (document.querySelector('.pf-av, .pf-capa') || { outerHTML: '' }).outerHTML.slice(0, 120)
  }));

  await b.close();

  /* ---------------- o que tem que ser verdade ---------------- */
  if (antes.temNaTela) erro('o pai apareceu com foto ANTES de por foto nenhuma');

  if (!doPai.naMemoria) erro('trocar a imagem nao guardou foto nenhuma na memoria do pai');
  else if (doPai.naMemoria.indexOf('data:image/') !== 0)
    erro('o que foi guardado nao e uma imagem: ' + doPai.naMemoria);
  if (!doPai.marcaNaFicha)
    erro('a marca "tem foto" nao entrou na ficha: os outros nunca vao pedir a foto');
  if (!doPai.previaNoEditor)
    erro('o editor continuou mostrando o robo depois de escolher a imagem');

  if (!noChatDoPai.mensagens) erro('a mensagem do pai nao chegou na tela dele');
  else if (!noChatDoPai.comFoto)
    erro('no chat do proprio pai a mensagem dele saiu com robo, e nao com a foto' +
         ' (robos: ' + noChatDoPai.comRobo + ')');

  /* ESTE É O CASO DO PAI. Se ele falhar, é o cache de "nao tem foto"
     guardado para sempre: o filho olhou antes e nunca mais pergunta. */
  if (!noChatDoFilho.guardado)
    erro('o filho olhou o perfil do pai antes da foto e NUNCA MAIS buscou: ' +
         'a foto nova nao chega em quem ja tinha olhado');
  else if (!noChatDoFilho.comFoto)
    erro('o filho tem a foto do pai na memoria mas o chat dele nao usou');
  if (!perfilDoPai.temFoto)
    erro('o cartao de perfil do pai, visto pelo filho, continuou sem foto: ' + perfilDoPai.html);

  if (errs.length) erro('erros de pagina: ' + errs.join(' | '));

  console.log(JSON.stringify({ antes, doPai, noChatDoPai, noChatDoFilho, perfilDoPai }, null, 1));
  if (problemas.length) { console.log('FALHOU: ' + problemas.join('; ')); process.exit(1); }
  console.log('OK: a foto aparece na hora para quem trocou e chega em quem ja tinha olhado');
})().catch(e => { console.log('FATAL ' + e.message.split('\n')[0]); process.exit(1); });
