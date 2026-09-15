/* =====================================================================
   PREMIUM — o botão de quem já pagou
   =====================================================================
   O pedido: "Está muito confuso de usar o NeoNebula premium, tente fazer
   algo que identifique se o usuário é premium ou não e se ele for
   premium faça um botão em cima do amigos dentro do chat chamado
   premium, poderá ajustar TUDO fundo de tela, perfil, etc. Tudo
   separadinho."

   POR QUE ESTAVA CONFUSO. Tudo o que a assinatura dá morava dentro de um
   editor de perfil com seis abas — e as abas misturavam o que é de graça
   com o que é pago, cada item com um cadeadinho. Quem pagou tinha que
   caçar as coisas pelas quais pagou no meio das que já tinha antes.
   Pior: nada dizia "isto aqui é o que você comprou".

   O QUE MUDA. Quem tem NeoNebula ganha uma porta própria, acima de
   AMIGOS, com o que ele comprou separado por assunto. Um assunto por
   cartão, cada cartão dizendo quantas coisas tem dentro e quantas estão
   liberadas no nível dele. Nada de cadeado no meio do caminho: o que o
   nível dele não alcança aparece no fim, junto, com o preço.

   POR QUE NÃO SUBSTITUI O EDITOR. O editor continua sendo o lugar de
   editar. Esta porta é um ÍNDICE: ela leva direto à aba certa. Duas
   telas que editam a mesma coisa acabam discordando sobre o que foi
   salvo — e é o tipo de bug que só aparece semanas depois.
   ===================================================================== */

/* =====================================================================
   1. É PREMIUM OU NÃO?
   ---------------------------------------------------------------------
   Uma pergunta, um lugar. `neoNivel()` já devolvia o nível, mas o resto
   do código perguntava de jeitos diferentes em cada tela ("tem bronze?",
   "o nível é diferente de nenhum?", "temVip()?"), e era daí que vinha a
   confusão: três respostas para a mesma pergunta.
   ===================================================================== */
function ehPremium(p) {
  try { return neoDe(p || save) !== "nenhum"; } catch (e) { return false; }
}

/* o que mostrar ao lado do nome de quem é premium, em qualquer tela */
function premiumSelo(p) {
  try {
    const nv = neoDe(p || save);
    const info = neoInfo(nv);
    return (info && info.selo) || "";
  } catch (e) { return ""; }
}

/* =====================================================================
   2. O QUE A ASSINATURA DÁ, SEPARADO POR ASSUNTO
   ---------------------------------------------------------------------
   Cada cartão aponta para uma aba do editor que já existe. A conta de
   "quantos estão liberados" é feita na hora a partir das MESMAS listas
   que o editor usa — se alguém acrescentar uma fonte nova, o número aqui
   sobe sozinho. Um número escrito à mão aqui envelheceria na primeira
   versão seguinte, e um "12 fontes" mentindo sobre 9 é pior que não ter
   número nenhum.
   ===================================================================== */
function premiumAssuntos() {
  const listas = l => (typeof l === "undefined" ? [] : l);
  return [
    { id: "nome", ic: "✎", nome: "O seu nome",
      sobre: "fonte, cor e efeito de como o seu nome aparece para os outros",
      aba: "nome",
      itens: [].concat(listas(typeof NEO_FONTES !== "undefined" && NEO_FONTES),
                       listas(typeof NEO_CORES !== "undefined" && NEO_CORES),
                       listas(typeof NEO_EFEITOS !== "undefined" && NEO_EFEITOS)) },
    { id: "fundo", ic: "🎨", nome: "Fundo do perfil",
      sobre: "as suas duas cores, o ângulo, o formato e a imagem de capa",
      aba: "fundo",
      itens: [].concat(listas(typeof NEO_FUNDOS !== "undefined" && NEO_FUNDOS),
                       listas(typeof NEO_FORMATOS !== "undefined" && NEO_FORMATOS),
                       listas(typeof NEO_TEXTURAS !== "undefined" && NEO_TEXTURAS)) },
    { id: "ar", ic: "✨", nome: "Atmosfera",
      sobre: "partículas, vidro fosco, molduras e o ícone de estado",
      aba: "ar",
      itens: [].concat(listas(typeof NEO_PARTICULAS !== "undefined" && NEO_PARTICULAS),
                       listas(typeof NEO_BORDAS !== "undefined" && NEO_BORDAS),
                       listas(typeof NEO_ESTADOS !== "undefined" && NEO_ESTADOS)) },
    { id: "tema", ic: "🌗", nome: "Tema do jogo inteiro",
      sobre: "muda o fundo, os cartões e as letras de TODAS as telas",
      aba: "jogo",
      itens: listas(typeof NEO_TEMAS_10 !== "undefined" && NEO_TEMAS_10) },
    { id: "jogo", ic: "🎮", nome: "Rastro, som e toque",
      sobre: "o rastro da sua nave, o som de aviso e o efeito de clique",
      aba: "jogo",
      itens: [].concat(listas(typeof NEO_ANIMACOES !== "undefined" && NEO_ANIMACOES),
                       listas(typeof NEO_TOQUES !== "undefined" && NEO_TOQUES),
                       listas(typeof NEO_CLIQUES !== "undefined" && NEO_CLIQUES),
                       listas(typeof NEO_BRILHOS !== "undefined" && NEO_BRILHOS)) },
    { id: "escrever", ic: "💬", nome: "Escrever mais",
      sobre: "bio e mensagens mais compridas",
      aba: "quem", medida: true }
  ];
}

/* quantos itens de um assunto o nível atual alcança */
function premiumConta(assunto) {
  const itens = assunto.itens || [];
  let livres = 0;
  for (const it of itens) {
    try { if (neoLiberado(it)) livres++; } catch (e) {}
  }
  return { livres: livres, total: itens.length };
}

/* =====================================================================
   3. A PORTA
   ===================================================================== */
function premiumHTML() {
  const nv = neoNivel();
  const info = neoInfo(nv);
  const dias = neoDiasQueFaltam();
  const assuntos = premiumAssuntos();

  let h = '<div class="pm-topo">' +
    '<b class="pm-selo">' + ((info && info.selo) || "✦") + "</b>" +
    "<div><strong>" + escaparTexto((info && info.nome) || "NeoNebula") + "</strong>" +
    "<em>" + (nv === "ilimitado" ? "Sem prazo"
             : dias + (dias === 1 ? " dia restante" : " dias restantes")) + "</em></div>" +
    "</div>" +
    '<p class="est-nota">Tudo o que a sua assinatura abriu, separado por assunto. ' +
    "Toque para ir direto.</p>";

  h += '<div class="pm-grade">';
  for (const a of assuntos) {
    const c = premiumConta(a);
    h += '<button class="pm-cartao" data-pm="' + a.aba + '">' +
      '<b class="pm-ic">' + a.ic + "</b>" +
      '<span class="pm-txt"><strong>' + escaparTexto(a.nome) + "</strong>" +
      "<em>" + escaparLongo(a.sobre) + "</em></span>" +
      (a.medida
        ? '<i class="pm-conta">' + perfilLimiteBio() + " letras</i>"
        : '<i class="pm-conta">' + c.livres + " de " + c.total + "</i>") +
      "</button>";
  }
  h += "</div>";

  /* O QUE AINDA FALTA, junto e no fim -- e não espalhado em cadeadinhos
     no meio das coisas que a pessoa já tem. Quem está no Bronze quer
     saber, de uma vez, o que o Ouro traria. */
  if (nv !== "ilimitado" && nv !== "ouro") {
    let presos = 0;
    for (const a of assuntos) {
      const c = premiumConta(a);
      presos += (c.total - c.livres);
    }
    if (presos) {
      h += '<button class="est-bt pm-subir" id="pm-subir">Faltam ' + presos +
        " coisas nos níveis de cima — ver preços</button>";
    }
  }
  return h;
}

function premiumAbrir() {
  estJanela("Premium", premiumHTML(), () => {
    document.querySelectorAll("[data-pm]").forEach(b =>
      b.addEventListener("click", () => {
        /* leva direto à aba certa do editor: a porta é um índice, e quem
           edita continua sendo o editor */
        const aba = b.getAttribute("data-pm");
        estFecharJanela();
        estEditarPerfil();
        pfAba = aba;
        estPintarEditor();
      }));
    const s = $("pm-subir");
    if (s) s.addEventListener("click", () => { estFecharJanela(); estAbrirNeo(); });
  }, true);   /* larga: são seis cartões, não uma pergunta de uma linha */
}

/* o botão da barra, acima de AMIGOS. Só existe para quem assina: para
   quem não assina, o cartão de venda que já estava ali continua sendo o
   certo -- dois botões dizendo "NeoNebula" na mesma coluna seria a
   confusão de novo, com um nome diferente. */
function premiumBotaoHTML() {
  if (!ehPremium()) return "";
  const info = neoInfo(neoNivel());
  return '<button class="est-dest pm-porta" id="est-premium-b">' +
    '<b class="est-dest-ic">' + ((info && info.selo) || "✦") + "</b>" +
    '<span class="est-dest-txt"><strong>Premium</strong>' +
    "<em>o que a sua assinatura abriu</em></span>" +
    '<i class="est-neo-seta">›</i></button>';
}
