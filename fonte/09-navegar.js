/* =====================================================================
   A BARRA DE TRÊS — jogo, estação e ajustes
   =====================================================================
   O pedido foi este: "no menu vai ter também três ícones, o primeiro
   para ir para o Menu você inventa o ícone, o segundo para ir para o
   chat, e o terceiro para ir para ajustes. Os três ícones inicialmente
   serão para celular, para computador faça tipo essa imagem só que
   adaptada para o nosso jogo."

   A imagem de referência é um aplicativo de conversa no computador: uma
   fileira estreita de ícones colada na esquerda, a lista de conversas do
   lado, o assunto no meio e quem está online na direita.

   Então são os MESMOS três botões nos dois lugares, e não duas barras
   diferentes para manter:

     no celular  — barra deitada, colada embaixo, onde o polegar alcança
     no computador — fileira em pé, colada na esquerda, como na imagem

   Só o CSS muda. O HTML, o clique e a marca de "onde estou" são um só —
   duas barras seriam duas chances de discordarem sobre qual está aceso.

   POR QUE SVG E NÃO EMOJI. Emoji é desenhado pelo sistema: o mesmo 🚀 é
   uma coisa no iPhone, outra no Android e outra no Windows, sempre
   colorido e sempre com o tamanho que ele quiser. Estes três são
   traçados que herdam a cor do tema (currentColor) — acendem junto com
   o resto quando estão escolhidos, e no tema claro ficam escuros
   sozinhos. Um emoji ficaria colorido igual nos dez temas.
   ===================================================================== */

/* Os três desenhos. Traço e não preenchimento: em 24px um ícone
   preenchido vira uma mancha, e a barra fica pesada. */
const NAV_ICONES = {
  /* JOGO: uma nave vista de cima, que é a nave do jogo. Inventar um
     ícone para "menu" daria um hambúrguer ou uma casinha -- os dois
     querem dizer "algum lugar", e este quer dizer "o Neon Nebula". */
  jogo: '<path d="M12 2.5c2.6 2.2 4 5.4 4 9v4.2l2.6 2v2.3l-4.1-1.4a6.8 6.8 0 0 1-5 0L5.4 20v-2.3l2.6-2V11.5c0-3.6 1.4-6.8 4-9Z"/>' +
        '<circle cx="12" cy="10" r="1.9"/>',
  /* ESTAÇÃO: um balão de fala. É o desenho que todo mundo já lê como
     conversa, e aqui não é hora de ser criativo. */
  chat: '<path d="M4 5.5h16a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-7.2L8 20.5V16.5H4A1.5 1.5 0 0 1 2.5 15V7A1.5 1.5 0 0 1 4 5.5Z"/>' +
        '<path d="M7 10.5h10M7 13h6"/>',
  /* AJUSTES: a engrenagem de sempre, com o dente marcado por fora para
     não virar uma flor em tamanho pequeno. */
  ajustes: '<circle cx="12" cy="12" r="3.2"/>' +
           '<path d="M12 2.6v2.6M12 18.8v2.6M21.4 12h-2.6M5.2 12H2.6' +
           'M18.6 5.4l-1.8 1.8M7.2 16.8l-1.8 1.8M18.6 18.6l-1.8-1.8M7.2 7.2 5.4 5.4"/>'
};

function navSVG(id) {
  return '<svg class="nav-ic" viewBox="0 0 24 24" aria-hidden="true" width="24" height="24" ' +
    'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" ' +
    'stroke-linejoin="round">' + (NAV_ICONES[id] || "") + "</svg>";
}

const NAV_ITENS = [
  { id: "jogo",    nome: "Jogo",    dica: "Voltar para o menu do jogo" },
  { id: "chat",    nome: "Estação", dica: "Conversar" },
  { id: "ajustes", nome: "Ajustes", dica: "Som, idioma, conta e aparência" }
];

/* =====================================================================
   CELULAR OU COMPUTADOR — uma pergunta, respondida num lugar só
   ---------------------------------------------------------------------
   "Em questão da interface de PC e celular, tente identificar também."

   Largura NÃO basta: um computador com a janela estreita não vira
   celular (continua tendo mouse e teclado), e um tablet deitado é largo
   e continua sendo dedo. Quem decide de verdade é o PONTEIRO: `pointer:
   coarse` quer dizer dedo, `pointer: fine` quer dizer mouse. A largura
   entra só para o caso do computador com a janela espremida, onde a
   fileira da esquerda não caberia de qualquer jeito.

   O resultado vira uma classe no <body>, e daí para baixo é tudo CSS.
   Assim existe UM lugar no jogo inteiro que responde esta pergunta.
   ===================================================================== */
function ehDedo() {
  try {
    if (window.matchMedia && matchMedia("(pointer: coarse)").matches) return true;
    if (navigator.maxTouchPoints > 0 && !matchMedia("(pointer: fine)").matches) return true;
  } catch (e) {}
  return false;
}
function ehTelaEstreita() {
  try { return matchMedia("(max-width: 900px)").matches; } catch (e) { return false; }
}
/* "celular" aqui quer dizer "barra embaixo, uma coluna só" -- não quer
   dizer que o aparelho é um telefone */
function modoCelular() { return ehDedo() || ehTelaEstreita(); }

function navMarcarAparelho() {
  try {
    const cel = modoCelular();
    document.body.classList.toggle("no-celular", cel);
    document.body.classList.toggle("no-pc", !cel);
    /* o dedo também decide coisas que não são largura: passar o mouse
       não existe, e um efeito preso ao hover some para sempre */
    document.body.classList.toggle("com-dedo", ehDedo());
  } catch (e) {}
}

/* =====================================================================
   A BARRA
   ===================================================================== */
let navOnde = "jogo";

function navHTML() {
  return NAV_ITENS.map(it =>
    '<button class="nav-b" data-nav="' + it.id + '" title="' + escaparTexto(it.dica) + '" ' +
    'aria-label="' + escaparTexto(it.nome) + '">' +
    navSVG(it.id) + '<em>' + escaparTexto(it.nome) + "</em>" +
    '<i class="nav-selo" id="nav-selo-' + it.id + '"></i>' +
    "</button>").join("");
}

function navMontar() {
  if ($("nav-barra")) return;
  const barra = document.createElement("nav");
  barra.className = "nav-barra";
  barra.id = "nav-barra";
  barra.innerHTML = navHTML();
  document.body.appendChild(barra);
  barra.querySelectorAll("[data-nav]").forEach(b =>
    b.addEventListener("click", () => navIr(b.getAttribute("data-nav"))));
  navMarcarAparelho();
  navAtualizar();
}

function navIr(id) {
  try { AudioSys.resume(); } catch (e) {}
  if (id === "chat") {
    /* a estação abre por cima e não mexe no S.mode: quem estava jogando
       continua jogando atrás. Tocar de novo fecha. */
    if (EST.aberta) estacaoFechar(); else estacaoAbrir();
  } else {
    /* sair da estação ANTES de trocar de tela: deixá-la aberta por cima
       do menu faria os dois primeiros botões parecerem quebrados */
    if (EST.aberta) { try { estacaoFechar(); } catch (e) {} }
    if (id === "ajustes") ajAbrir();
    else goMenu();
  }
  navAtualizar();
}

/* onde a pessoa está AGORA, perguntando ao jogo em vez de decorar.
   Decorar dá o bug clássico: a pessoa sai por outro caminho (o ✕ da
   estação, o voltar do Android) e a barra continua acesa no lugar
   errado. */
function navOndeEstou() {
  try {
    if (typeof EST !== "undefined" && EST.aberta) return "chat";
    if (S && S.mode === "ajustes") return "ajustes";
  } catch (e) {}
  return "jogo";
}

function navAtualizar() {
  const barra = $("nav-barra");
  if (!barra) return;
  navOnde = navOndeEstou();
  barra.querySelectorAll("[data-nav]").forEach(b =>
    b.classList.toggle("on", b.getAttribute("data-nav") === navOnde));

  /* A BARRA SOME DURANTE A PARTIDA. Três botões fixos por cima do jogo
     seriam três jeitos de perder a fase sem querer -- e no celular eles
     ficariam exatamente onde o polegar pilota. */
  let jogando = false;
  try { jogando = S && (S.mode === "playing" || S.mode === "cutscene"); } catch (e) {}
  /* na tela de entrada também não: não existe "meu perfil" antes de
     existir um piloto, e os três levariam a lugar nenhum */
  let antesDeEntrar = false;
  try { antesDeEntrar = S && (S.mode === "login" || S.mode === "senha"); } catch (e) {}
  barra.classList.toggle("sumiu", !!(jogando || antesDeEntrar));

  /* o selo de não lidas vai no ícone da estação, que é onde a pessoa
     procura por ele */
  try {
    const selo = $("nav-selo-chat");
    if (selo) {
      const n = estContarNaoLidas();
      selo.textContent = n > 99 ? "99+" : (n || "");
      selo.classList.toggle("on", n > 0);
    }
  } catch (e) {}
}

/* a estação já sabia somar as não lidas para o selo do menu; aqui só
   pegamos o mesmo número, sem uma segunda conta que um dia discordaria */
function estContarNaoLidas() {
  try {
    const el = $("est-selo");
    const n = parseInt((el && el.textContent) || "0", 10);
    return isNaN(n) ? 0 : n;
  } catch (e) { return 0; }
}

/* =====================================================================
   QUEM ESTÁ ONLINE — a coluna da direita do computador
   ---------------------------------------------------------------------
   Na imagem de referência ela se chama "Ativo agora" e mostra quem está
   em call. A nossa mostra quem está jogando e o quê, que é a informação
   que o jogo já tem e a que interessa aqui: dá para ver que o amigo está
   na fase 12 e chamar para jogar junto.

   Só no computador. No celular ela viraria uma terceira coluna num lugar
   que mal tem uma — lá esta mesma lista já mora na gaveta.
   ===================================================================== */
const ONLINE_MOSTRA = 12;

function onlineAgora() {
  const eu = estEu();
  const fora = [];
  const todos = (typeof EST !== "undefined" && EST.pilotos) || {};
  const agora = Date.now();
  for (const id in todos) {
    if (eu && id === eu.id) continue;
    const p = todos[id] || {};
    /* dois minutos sem bater o ponto já não é "agora". O invisível manda
       um relógio velho de propósito, então ele cai fora por aqui sem
       precisar de nenhuma regra a mais. */
    if (!p.atualizado || agora - p.atualizado > 120000) continue;
    fora.push({ id: id, nome: p.tag || p.nome || "Piloto", onde: p.onde || "No jogo",
                aparelho: p.aparelho || "", quando: p.atualizado });
  }
  fora.sort((a, b) => b.quando - a.quando);
  return fora.slice(0, ONLINE_MOSTRA);
}

function onlinePintar() {
  const cx = $("est-direita");
  if (!cx) return;
  const lista = onlineAgora();
  cx.innerHTML =
    '<div class="est-dir-h">Jogando agora</div>' +
    (lista.length
      ? lista.map(p =>
          '<button class="est-dir-l" data-perfil="' + p.id + '">' +
          '<span class="est-av' + avatarClasse(p.id) + '" ' + avatarEstilo(p.id) + ">" +
          avatarConteudo(p.id, p.nome) + "</span>" +
          '<span class="est-dir-t"><b>' + escaparTexto(p.nome) + "</b>" +
          "<em>" + escaparLongo(p.onde) + "</em></span>" +
          (p.aparelho === "celular" ? '<i class="est-dir-ap" title="No celular">▯</i>' : "") +
          "</button>").join("")
      : '<p class="est-nota">Ninguém jogando agora. Quando alguém entrar, aparece aqui.</p>');
  cx.querySelectorAll("[data-perfil]").forEach(b =>
    b.addEventListener("click", () => estAbrirPerfil(b.getAttribute("data-perfil"))));
}

/* =====================================================================
   LIGAR
   ===================================================================== */
function navLigar() {
  navMontar();
  cliqueLigar();
  /* a barra acompanha a troca de tela sem ninguém precisar avisar: em vez
     de sair chamando navAtualizar() de dentro de cada goMenu, ajAbrir e
     estacaoFechar espalhados pelo jogo, ela olha sozinha. Uma vez por
     segundo é de graça e não tem como esquecer de chamar. */
  setInterval(() => { try { navAtualizar(); } catch (e) {} }, 1000);
  /* girar o celular troca a largura, e o tablet deitado passa a caber a
     fileira da esquerda */
  window.addEventListener("resize", () => { try { navMarcarAparelho(); } catch (e) {} });
  try {
    if (window.matchMedia) {
      const m = matchMedia("(pointer: coarse)");
      /* Safari antigo só tem addListener; sem este try o jogo inteiro
         morreria aqui em aparelho velho, que é justamente o alvo */
      if (m.addEventListener) m.addEventListener("change", navMarcarAparelho);
      else if (m.addListener) m.addListener(navMarcarAparelho);
    }
  } catch (e) {}
}


/* =====================================================================
   O EFEITO DE CLIQUE — por que ele "não funcionava muito bem"
   =====================================================================
   Os quatro efeitos (afunda, onda, brilha, solta faísca) eram CSS preso
   ao `:active`, ou seja: só existiam ENQUANTO o dedo estava encostado.

   No computador isso quase passa. No celular não passa de jeito nenhum:
   um toque dura uns 80ms, o navegador ainda segura o `:active` uns
   instantes para decidir se é rolagem, e o que a pessoa vê é um pisca
   que some antes de ela olhar. Pior: "onda" e "faísca" são efeitos que,
   pelo nome, acontecem DEPOIS de soltar — uma onda que se espalha, uma
   faísca que salta. Presos ao `:active` eles viravam uma borda parada.

   Agora o toque MARCA o botão e a marca dura o tempo da animação, solta
   do dedo. A onda nasce onde o dedo encostou (e não no meio do botão,
   que é o detalhe que faz parecer de verdade).

   Três cuidados que valem mais que o efeito:
     - um só por vez por botão: tirar e repor a classe reinicia a
       animação, senão o segundo toque rápido não mostra nada
     - nada disso com "movimento reduzido" ligado
     - e o ouvinte é UM, na página inteira, em vez de um por botão: a
       Estação cria e destrói botões o tempo todo, e um ouvinte por botão
       viraria centenas deles pendurados numa conversa longa
   ===================================================================== */
const CLIQUE_MS = 460;

function cliqueLigar() {
  try {
    if (matchMedia("(prefers-reduced-motion:reduce)").matches) return;
  } catch (e) {}
  document.addEventListener("pointerdown", e => {
    let efeito = "nenhum";
    try { efeito = perfilClique().id; } catch (err) { return; }
    if (efeito === "nenhum") return;
    /* quem recebe o toque pode ser o <svg> ou o <em> de dentro do botão:
       é o botão que interessa */
    const bt = e.target && e.target.closest ? e.target.closest("button, .est-dest, .nav-b") : null;
    if (!bt) return;
    if (efeito === "onda" || efeito === "faisca") {
      const r = bt.getBoundingClientRect();
      /* a onda nasce ONDE O DEDO ENCOSTOU. Nascendo sempre no meio, ela
         parece um brilho ligando e desligando, e não uma onda. */
      bt.style.setProperty("--toque-x", ((e.clientX - r.left) / r.width * 100) + "%");
      bt.style.setProperty("--toque-y", ((e.clientY - r.top) / r.height * 100) + "%");
    }
    bt.classList.remove("clicou");
    void bt.offsetWidth;            /* reinicia a animação */
    bt.classList.add("clicou");
    setTimeout(() => { try { bt.classList.remove("clicou"); } catch (err) {} }, CLIQUE_MS);
  }, { passive: true });
}
