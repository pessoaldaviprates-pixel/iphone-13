/* =====================================================================
   O ROBÔ — o avatar de quem ainda não pôs foto
   =====================================================================
   Antes, quem não tinha foto aparecia com a inicial do nome numa
   bolinha azul. Funciona, mas três pessoas com nome começando em "L"
   ficavam idênticas — e num bate-papo isso é exatamente o que atrapalha:
   você procura a mensagem "do L" e tem três.

   Agora cada conta ganha um robô CINZA em fundo BRANCO, desenhado a
   partir do próprio identificador. Não é sorteado: o mesmo piloto tem o
   mesmo robô hoje, amanhã e no celular do amigo. Sorteio daria um robô
   diferente a cada abertura, e aí ele não identificaria ninguém.

   POR QUE SVG DESENHADO NA HORA, E NÃO IMAGEM
   ---------------------------------------------------------------------
   Vinte robôs prontos seriam vinte imagens no arquivo do jogo, que já
   tem 4 MB e precisa abrir sem internet. Desenhado, cada robô custa umas
   quinhentas letras de texto e sai de uma conta — e dá para ter milhares
   de combinações em vez de vinte.

   CINZA E BRANCO DE PROPÓSITO
   ---------------------------------------------------------------------
   O robô é o "sem foto". Ele não pode competir com a foto de quem pôs
   uma, nem com o nome colorido de quem assina — por isso ele é neutro.
   Quem quiser cor, põe foto.
   ===================================================================== */

/* as peças, e quantas variações cada uma tem. O número de robôs
   diferentes é o produto de tudo: 5 × 5 × 4 × 5 × 3 = 1500 */
const ROBO_CABECAS = ["quadrada", "arredondada", "redonda", "pixel", "larga"];
const ROBO_OLHOS   = ["ponto", "visor", "monoculo", "sorriso", "led"];
const ROBO_ANTENAS = ["nenhuma", "uma", "duas", "haste"];
const ROBO_BOCAS   = ["linha", "grade", "sorriso", "nenhuma", "onda"];
const ROBO_DETALHE = ["nenhum", "parafusos", "placa"];

/* quatro cinzas: o fundo branco, o corpo, o traço e a luz do olho.
   Um cinza só deixaria o robô chapado; quatro dão volume sem cor. */
const ROBO_CORES = {
  fundo: "#FFFFFF", corpo: "#C9CDD4", traco: "#6B7280",
  escuro: "#3F4652", luz: "#9AA2AE"
};

/* O SORTEIO QUE NÃO SORTEIA: mesmo id, mesmo robô, sempre.

   CINCO CONTAS SEPARADAS, uma por peça, cada uma com um tempero
   diferente na frente do identificador. A primeira versão somava
   dígitos do MESMO hash para tirar as cinco peças, e o teste pegou o
   estrago: 300 contas davam só 30 robôs diferentes. Somar dígitos
   amassa a faixa (dois dígitos hex somam de 0 a 30) e, pior, deixa as
   peças correlacionadas — cabeça e olhos andavam juntos, e metade das
   combinações nunca aparecia.

   Com tempero por peça, cada uma vê um hash diferente do mesmo nome, e
   elas passam a ser independentes de verdade. */
/* ESPALHAR OS BITS ANTES DE DIVIDIR.
   O nuvemHash é um djb2: ele é rápido e serve para o que foi feito, mas
   para textos quase iguais ("piloto1", "piloto2") ele devolve números
   quase iguais. Tirar o resto da divisão disso faz as cinco peças
   andarem em fila indiana — e foi o que sobrou depois do primeiro
   conserto: 2000 contas ainda davam só 232 robôs, de 1500 possíveis.

   Este embaralhador (xor com deslocamento + multiplicação) espalha uma
   diferença de um bit por todos os 32. Depois dele, "piloto1" e
   "piloto2" não têm mais nada a ver um com o outro. */
function roboMisturar(n) {
  n = n >>> 0;
  n ^= n >>> 16; n = Math.imul(n, 0x7feb352d) >>> 0;
  n ^= n >>> 15; n = Math.imul(n, 0x846ca68b) >>> 0;
  n ^= n >>> 16;
  return n >>> 0;
}
function roboSemente(id) {
  const nome = String(id || "?");
  const conta = tempero =>
    roboMisturar(parseInt(nuvemHash(tempero + nome), 16) || 0);
  return {
    cabeca: conta("cb:"), olhos: conta("ol:"), antena: conta("an:"),
    boca: conta("bc:"), detalhe: conta("dt:")
  };
}

function roboDe(id) {
  const s = roboSemente(id);
  return {
    cabeca: ROBO_CABECAS[s.cabeca % ROBO_CABECAS.length],
    olhos:  ROBO_OLHOS[s.olhos % ROBO_OLHOS.length],
    antena: ROBO_ANTENAS[s.antena % ROBO_ANTENAS.length],
    boca:   ROBO_BOCAS[s.boca % ROBO_BOCAS.length],
    detalhe: ROBO_DETALHE[s.detalhe % ROBO_DETALHE.length]
  };
}

/* =====================================================================
   O DESENHO
   ---------------------------------------------------------------------
   Um SVG de 64×64, em viewBox, que estica para qualquer tamanho sem
   borrar. Tudo em caminho e retângulo: nada de fonte, nada de imagem,
   nada que dependa do que o aparelho tem instalado.
   ===================================================================== */
function roboSVG(id, tamanho) {
  const r = roboDe(id);
  const C = ROBO_CORES;
  const t = tamanho || 64;
  let h = '<svg class="robo" viewBox="0 0 64 64" width="' + t + '" height="' + t +
          '" aria-hidden="true">' +
          '<rect width="64" height="64" fill="' + C.fundo + '"/>';

  /* --- antena: vem primeiro porque sai por trás da cabeça --- */
  if (r.antena === "uma") {
    h += '<line x1="32" y1="16" x2="32" y2="7" stroke="' + C.traco + '" stroke-width="2.4"/>' +
         '<circle cx="32" cy="6" r="3" fill="' + C.traco + '"/>';
  } else if (r.antena === "duas") {
    h += '<line x1="21" y1="17" x2="17" y2="8" stroke="' + C.traco + '" stroke-width="2.2"/>' +
         '<circle cx="16.5" cy="7" r="2.6" fill="' + C.traco + '"/>' +
         '<line x1="43" y1="17" x2="47" y2="8" stroke="' + C.traco + '" stroke-width="2.2"/>' +
         '<circle cx="47.5" cy="7" r="2.6" fill="' + C.traco + '"/>';
  } else if (r.antena === "haste") {
    h += '<line x1="32" y1="16" x2="32" y2="9" stroke="' + C.traco + '" stroke-width="2.4"/>' +
         '<rect x="25" y="5" width="14" height="4" rx="2" fill="' + C.traco + '"/>';
  }

  /* --- a cabeça --- */
  if (r.cabeca === "quadrada") {
    h += '<rect x="13" y="15" width="38" height="36" rx="4" fill="' + C.corpo +
         '" stroke="' + C.traco + '" stroke-width="2.4"/>';
  } else if (r.cabeca === "arredondada") {
    h += '<rect x="13" y="15" width="38" height="36" rx="13" fill="' + C.corpo +
         '" stroke="' + C.traco + '" stroke-width="2.4"/>';
  } else if (r.cabeca === "redonda") {
    h += '<circle cx="32" cy="33" r="19" fill="' + C.corpo +
         '" stroke="' + C.traco + '" stroke-width="2.4"/>';
  } else if (r.cabeca === "pixel") {
    /* o pixel não tem canto redondo E não tem traço fino: é a soma dos
       dois que faz um desenho parecer "de jogo antigo" */
    h += '<rect x="13" y="15" width="38" height="36" fill="' + C.corpo +
         '" stroke="' + C.escuro + '" stroke-width="4"/>';
  } else {
    h += '<rect x="9" y="18" width="46" height="30" rx="6" fill="' + C.corpo +
         '" stroke="' + C.traco + '" stroke-width="2.4"/>';
  }

  /* --- orelhas: sempre, para a cabeça não flutuar --- */
  h += '<rect x="7" y="28" width="4" height="10" rx="2" fill="' + C.traco + '"/>' +
       '<rect x="53" y="28" width="4" height="10" rx="2" fill="' + C.traco + '"/>';

  /* --- os olhos --- */
  if (r.olhos === "ponto") {
    h += '<circle cx="24" cy="30" r="4" fill="' + C.escuro + '"/>' +
         '<circle cx="40" cy="30" r="4" fill="' + C.escuro + '"/>' +
         '<circle cx="25.4" cy="28.6" r="1.4" fill="' + C.fundo + '"/>' +
         '<circle cx="41.4" cy="28.6" r="1.4" fill="' + C.fundo + '"/>';
  } else if (r.olhos === "visor") {
    h += '<rect x="19" y="26" width="26" height="9" rx="4.5" fill="' + C.escuro + '"/>' +
         '<circle cx="39" cy="30.5" r="2" fill="' + C.luz + '"/>';
  } else if (r.olhos === "monoculo") {
    h += '<circle cx="24" cy="30" r="6.5" fill="none" stroke="' + C.escuro + '" stroke-width="2.4"/>' +
         '<circle cx="24" cy="30" r="3" fill="' + C.escuro + '"/>' +
         '<circle cx="41" cy="30" r="3.4" fill="' + C.escuro + '"/>';
  } else if (r.olhos === "sorriso") {
    h += '<path d="M19 32 q5 -6 10 0" fill="none" stroke="' + C.escuro +
         '" stroke-width="2.6" stroke-linecap="round"/>' +
         '<path d="M35 32 q5 -6 10 0" fill="none" stroke="' + C.escuro +
         '" stroke-width="2.6" stroke-linecap="round"/>';
  } else {
    h += '<rect x="19" y="27" width="10" height="6" rx="1.5" fill="' + C.escuro + '"/>' +
         '<rect x="35" y="27" width="10" height="6" rx="1.5" fill="' + C.escuro + '"/>' +
         '<rect x="21" y="29" width="6" height="2" fill="' + C.luz + '"/>' +
         '<rect x="37" y="29" width="6" height="2" fill="' + C.luz + '"/>';
  }

  /* --- a boca --- */
  if (r.boca === "linha") {
    h += '<rect x="25" y="41" width="14" height="3" rx="1.5" fill="' + C.traco + '"/>';
  } else if (r.boca === "grade") {
    h += '<rect x="23" y="39" width="18" height="7" rx="2" fill="none" stroke="' + C.traco +
         '" stroke-width="1.8"/>' +
         '<line x1="29" y1="39" x2="29" y2="46" stroke="' + C.traco + '" stroke-width="1.4"/>' +
         '<line x1="35" y1="39" x2="35" y2="46" stroke="' + C.traco + '" stroke-width="1.4"/>';
  } else if (r.boca === "sorriso") {
    h += '<path d="M24 40 q8 7 16 0" fill="none" stroke="' + C.traco +
         '" stroke-width="2.4" stroke-linecap="round"/>';
  } else if (r.boca === "onda") {
    h += '<path d="M24 42 q4 -4 8 0 q4 4 8 0" fill="none" stroke="' + C.traco +
         '" stroke-width="2.2" stroke-linecap="round"/>';
  }

  /* --- o detalhe --- */
  if (r.detalhe === "parafusos") {
    h += '<circle cx="18" cy="20" r="1.8" fill="' + C.traco + '"/>' +
         '<circle cx="46" cy="20" r="1.8" fill="' + C.traco + '"/>' +
         '<circle cx="18" cy="46" r="1.8" fill="' + C.traco + '"/>' +
         '<circle cx="46" cy="46" r="1.8" fill="' + C.traco + '"/>';
  } else if (r.detalhe === "placa") {
    h += '<rect x="26" y="49" width="12" height="4" rx="1" fill="' + C.traco + '"/>';
  }
  return h + "</svg>";
}

/* =====================================================================
   O AVATAR DE QUALQUER UM, NUM LUGAR SÓ
   ---------------------------------------------------------------------
   Foto se tiver; robô se não tiver. Todo lugar que desenha um avatar
   pergunta aqui — barra lateral, bate-papo, cartão de perfil, lista de
   amigos. Se cada tela fizesse a própria conta, um dia uma delas
   continuaria mostrando a inicial e as pessoas teriam duas caras.
   ===================================================================== */
function avatarConteudo(uid, nome) {
  const foto = FOTOS[uid];
  if (foto) return "";                       /* a foto vira fundo, não conteúdo */
  return roboSVG(uid || nome || "?");
}
function avatarEstilo(uid) {
  const foto = FOTOS[uid];
  return foto ? 'style="background-image:url(' + foto + ');background-size:cover"' : "";
}
/* a classe que diz "aqui tem robô", para o CSS tirar o fundo azul da
   bolinha: robô cinza em cima de degradê azul não é robô cinza */
function avatarClasse(uid) {
  return FOTOS[uid] ? " com-foto" : " com-robo";
}

/* =====================================================================
   AS FOTOS DE QUEM ESTÁ FALANDO
   ---------------------------------------------------------------------
   O bate-papo mostra a foto de quem falou, mas a foto não vem na ficha
   do piloto (ela pesaria na lista de todo mundo). Então: depois de
   pintar, olha quem está na tela, vê quem TEM foto pela marca da ficha,
   e busca só essas — uma vez cada, para sempre.

   É por isso que a marca existe. Sem ela, a única forma de saber quem
   tem foto seria tentar buscar a de todos e ver quais voltam vazias --
   ou seja, um pedido por pessoa, toda vez.
   ===================================================================== */
let fotosBuscando = false;
async function fotosDaConversa() {
  if (fotosBuscando || !EST.aberta) return;
  const faltam = [];
  for (const m of (EST.msgs || [])) {
    const uid = m && m.de;
    if (!uid || faltam.indexOf(uid) >= 0) continue;
    /* QUEM DECIDE É A MARCA, e não "já busquei uma vez". Antes a linha
       aqui era `FOTOS[uid] !== undefined`, ou seja: buscou uma vez,
       nunca mais. Quem trocasse de foto continuava com a antiga do lado
       das mensagens, e quem pusesse a primeira continuava com o robô,
       até a outra pessoa fechar e abrir o jogo.
       imagemPrecisaBuscar já sabe ler a ficha e comparar -- inclusive o
       caso "a ficha diz que não tem", que não vira pedido nenhum. */
    /* `true` = só de quem a ficha DIZ ter foto. Aqui é a conversa
       inteira, e um pedido por pessoa a cada conversa aberta é
       exatamente o que a marca existe para evitar. */
    if (imagemPrecisaBuscar(FOTOS, FOTOS_MARCA, uid, "foto", true)) faltam.push(uid);
  }
  if (!faltam.length) return;
  fotosBuscando = true;
  try {
    /* no máximo oito por vez: numa conversa cheia, quarenta pedidos de
       uma vez é justamente o tipo de rajada que trava o resto */
    for (const uid of faltam.slice(0, 8)) await fotoDe(uid);
  } finally { fotosBuscando = false; }
  try { estPintar(); } catch (e) {}
}
