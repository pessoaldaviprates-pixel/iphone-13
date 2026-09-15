/* ⚠ ESTE ARQUIVO AINDA NÃO ESTÁ NO JOGO.
   Ele NÃO está em `fonte/ordem.txt`, ou seja: não entra no index.html e
   não roda. É rascunho dos itens que faltavam da lista de 100 (bio com
   negrito e citação, relógio do fuso, mural de recados, código de cores,
   rastro do cursor, vibração, histórico de nomes).

   Está guardado aqui em vez de jogado fora porque o trabalho existe, mas
   entrar assim seria pior que não entrar: nenhuma linha daqui foi
   exercitada por teste nenhum. Para ligar: pôr o nome em `ordem.txt`
   ANTES do 07-extras-2.js, chamar `bioBlocoHTML` no lugar do bloco
   "sobre" de `pfBlocoHTML`, e escrever o teste de cada peça -- em
   especial o de `bioRica()`, que mexe em texto escrito por outra pessoa
   e por isso é o único aqui que, se estiver errado, é um buraco de
   segurança e não um enfeite que falta.
   ===================================================================== */

/* =====================================================================
   O QUE FALTAVA DA LISTA DE 100
   =====================================================================
   Estes são os dezoito itens que ficaram na coluna "dá para fazer, e
   ainda não foi feito" do fonte/PERSONALIZACAO.md. Cada um traz aqui o
   número que tinha na lista, para que a conta continue possível de
   conferir — foi contando errado uma vez que eu disse ter feito cem.

   O critério não mudou: entra o que funciona sem servidor novo, sem
   arquivo grande e sem derrubar celular fraco.
   ===================================================================== */

/* =====================================================================
   33 e 35 — NEGRITO, ITÁLICO, LISTAS E CITAÇÃO NA BIO
   ---------------------------------------------------------------------
   A bio é texto escrito por OUTRA PESSOA. A ordem das duas operações é
   a coisa mais importante deste arquivo:

     1. escapa (some todo HTML que veio de fora)
     2. SÓ DEPOIS aplica as marcas

   Invertido, um `<img onerror=...>` na bio de um estranho viraria HTML
   de verdade na minha tela. Do jeito certo, o que ele escreveu já virou
   texto morto antes de qualquer tag nascer, e as únicas tags que
   existem são as que esta função escreveu.

   E é UMA passada só para as marcas de dentro da linha, pelo mesmo
   motivo do @everyone: numa segunda passada a regra de `_itálico_`
   enxergaria o "_" que a primeira já usou.
   ===================================================================== */

/* as marcas de dentro da linha, numa alternância só.
   O `(^|[^\w*])` na frente existe para que perfil_do_zeca não vire
   perfil<i>do</i>zeca: o travessão baixo dentro de palavra não marca
   nada. (Um lookbehind resolveria em uma linha, mas celular velho não
   tem lookbehind — então o caractere de antes é capturado e devolvido.) */
const BIO_MARCAS = /(^|[^\w*])\*([^*\n]{1,140})\*|(^|[^\w_])_([^_\n]{1,140})_|(^|[^\w~])~([^~\n]{1,140})~/g;

function bioInline(linha) {
  return linha.replace(BIO_MARCAS, (m, a1, neg, a2, ita, a3, ris) => {
    if (neg !== undefined) return a1 + "<b>" + neg + "</b>";
    if (ita !== undefined) return a2 + "<i>" + ita + "</i>";
    return a3 + "<s>" + ris + "</s>";
  });
}

function bioRica(txt) {
  const seguro = escaparLongo(txt);          /* passo 1: nada de fora sobrevive */
  const linhas = seguro.split(/\r?\n/);
  const saida = [];
  let lista = null;                          /* os "-" seguidos viram uma lista só */
  const fecharLista = () => {
    if (lista) { saida.push("<ul class=\"bio-lista\">" + lista.join("") + "</ul>"); lista = null; }
  };
  for (const bruta of linhas) {
    const l = bruta.trim();
    if (!l) { fecharLista(); continue; }
    if (/^(-|•|\*\s)/.test(l) && !/^\*[^*]+\*$/.test(l)) {
      lista = lista || [];
      lista.push("<li>" + bioInline(l.replace(/^(-|•|\*)\s*/, "")) + "</li>");
      continue;
    }
    fecharLista();
    if (l[0] === "&" && l.slice(0, 4) === "&gt;") {
      /* CITAÇÃO. O "&gt;" e não o ">" porque o escapador já passou aqui:
         procurar pelo ">" cru nunca acharia nada. */
      saida.push('<blockquote class="bio-cit">' + bioInline(l.slice(4).trim()) + "</blockquote>");
      continue;
    }
    saida.push("<p>" + bioInline(l) + "</p>");
  }
  fecharLista();
  return saida.join("") || "";
}

/* quanto texto cabe antes de valer a pena esconder o resto */
const BIO_CORTE = 210;

/* 8 e 39 — a bio ganha brilho ao passar o cursor (CSS) e se recolhe
   quando é longa demais. Recolher vem com o botão junto: esconder sem
   dar como abrir seria esconder de verdade. */
function bioBlocoHTML(v, souEu) {
  const txt = String(v.bio || "");
  if (!txt.trim()) {
    return '<div class="pf-bl"><h4>Sobre mim</h4><p class="pf-bio vazia">' +
      (souEu ? "Você ainda não escreveu nada sobre você."
             : "Esta pessoa ainda não escreveu nada.") + "</p></div>";
  }
  const longa = txt.length > BIO_CORTE;
  return '<div class="pf-bl"><h4>Sobre mim</h4>' +
    '<div class="pf-bio rica' + (longa ? " cortada" : "") + '" id="pf-bio-txt">' +
    bioRica(txt) + "</div>" +
    (longa ? '<button class="pf-vermais" id="pf-vermais">Ver mais</button>' : "") +
    "</div>";
}

function bioVerMaisLigar() {
  const bt = $("pf-vermais"), cx = $("pf-bio-txt");
  if (!bt || !cx) return;
  bt.addEventListener("click", () => {
    const aberta = cx.classList.toggle("aberta");
    cx.classList.toggle("cortada", !aberta);
    bt.textContent = aberta ? "Ver menos" : "Ver mais";
  });
}

/* =====================================================================
   37 — O RELÓGIO DA PESSOA
   ---------------------------------------------------------------------
   Serve para uma coisa só, e é uma coisa útil: saber que são três da
   manhã para quem você ia chamar para jogar.

   O que vai para a nuvem é a DIFERENÇA em minutos, não a hora. Hora
   guardada envelhece a cada minuto; a diferença só muda quando a pessoa
   viaja. E o sinal é o do getTimezoneOffset invertido, porque ele conta
   ao contrário do que todo mundo espera (Brasília, UTC-3, dá +180).
   ===================================================================== */
function fusoMeu() { return -new Date().getTimezoneOffset(); }

function fusoTexto(v) {
  const f = v && v.fuso;
  if (f === undefined || f === null || isNaN(f)) return "";
  const meu = fusoMeu();
  const agora = new Date(Date.now() + (Number(f) - meu) * 60000);
  const h = String(agora.getHours()).padStart(2, "0");
  const m = String(agora.getMinutes()).padStart(2, "0");
  const dif = Math.round((Number(f) - meu) / 60);
  const quanto = dif === 0 ? "a mesma hora que você"
    : (Math.abs(dif) + (Math.abs(dif) === 1 ? " hora " : " horas ") +
       (dif > 0 ? "à frente" : "atrás"));
  return '<span class="pf-relogio" title="' + escaparTexto(quanto) + '">🕑 ' +
    h + ":" + m + ' <em>' + escaparTexto(quanto) + "</em></span>";
}

/* =====================================================================
   92, 98 e 99 — DESDE QUANDO, COMO SE CHAMAVA, E O QUE GANHOU
   ===================================================================== */

/* 92 — desde quando tem NeoNebula. Sai do que o save já guarda. */
function assinaturaTexto(ficha) {
  const neo = ficha && ficha.neo;
  if (!neo || !neo.desde) return "";
  const d = new Date(Number(neo.desde));
  if (isNaN(d.getTime())) return "";
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun",
                 "jul", "ago", "set", "out", "nov", "dez"];
  return "assinante desde " + meses[d.getMonth()] + "/" + d.getFullYear();
}

/* 98 — HISTÓRICO DE NOMES.
   Guarda os três últimos, e não todos: a ficha do piloto é lida inteira
   de vinte em vinte segundos para saber quem está online, e uma lista
   que só cresce vira peso para a comunidade toda. Três já responde a
   pergunta que essa lista existe para responder ("é o mesmo cara?"). */
const NOMES_GUARDADOS = 3;

function nomeAnotarTroca(antigo, novo) {
  if (!antigo || antigo === novo) return;
  const p = perfilMeu();
  const lista = String(p.nomes || "").split("|").filter(Boolean);
  if (lista[lista.length - 1] === antigo) return;
  lista.push(antigo);
  p.nomes = lista.slice(-NOMES_GUARDADOS).join("|");
  try { persist(); } catch (e) {}
}

function nomesAntigos(v) {
  return String((v && v.nomes) || "").split("|").filter(Boolean).slice(-NOMES_GUARDADOS);
}

/* 99 — O PAINEL DE PRESENTES.
   Presente aqui quer dizer o que o dono do jogo deu de mão beijada:
   NeoNebula, cristais, uma nave. Não existe "comprar para um amigo" e
   este painel não finge que existe -- ele mostra o que a pessoa
   REALMENTE recebeu, que é o que o save já registra. */
function presentesDe(ficha) {
  const g = (ficha && ficha.presentes) || {};
  const saida = [];
  if (g.neo) saida.push({ ic: "👑", txt: "NeoNebula " + escaparTexto(g.neo) });
  if (g.cristais) saida.push({ ic: "◆", txt: fmt(g.cristais) + " cristais" });
  if (g.nave) saida.push({ ic: "🛸", txt: escaparTexto(g.nave) });
  return saida;
}

/* =====================================================================
   100 — LEVAR A COMBINAÇÃO DE CORES PARA UM AMIGO
   ---------------------------------------------------------------------
   O código é só NÚMERO, e de propósito. A regra de sempre: cor escolhida
   por outra pessoa nunca vira CSS. Aqui ela nem chega perto de CSS —
   são seis números presos na faixa, e quem lê refaz o hsl() sozinho.
   Assim o pior que um código torto pode fazer é pintar feio.
   ===================================================================== */
function corCodigo(p) {
  p = p || perfilMeu();
  const n = v => Math.max(0, Math.min(999, parseInt(v, 10) || 0));
  const partes = [n(p.c1h), n(p.c1l), n(p.c2h), n(p.c2l), n(p.angulo),
                  NEO_FORMATOS.map(f => f.id).indexOf(p.formato) + 1];
  return "NN" + partes.map(x => x.toString(36).toUpperCase()).join("-");
}

function corCodigoLer(txt) {
  const s = String(txt || "").trim().toUpperCase();
  if (s.slice(0, 2) !== "NN") return null;
  const partes = s.slice(2).split("-").filter(x => x !== "");
  if (partes.length < 4) return null;
  const n = i => parseInt(partes[i], 36);
  const preso = (v, min, max, reserva) =>
    (isNaN(v) ? reserva : Math.max(min, Math.min(max, v)));
  const fi = n(5) - 1;
  return {
    c1h: preso(n(0), 0, 359, 205), c1l: preso(n(1), 12, 72, 30),
    c2h: preso(n(2), 0, 359, 275), c2l: preso(n(3), 12, 72, 22),
    angulo: preso(n(4), 0, 359, 150),
    formato: (NEO_FORMATOS[fi] || NEO_FORMATOS[0]).id
  };
}

function corCodigoAbrir() {
  const meu = corCodigo();
  estJanela("Levar as suas cores",
    '<p class="est-nota">Este é o código do seu degradê. Mande para um amigo e ' +
    "ele fica com as mesmas cores. São só números: ninguém escreve nada na sua tela por aqui.</p>" +
    '<div class="pf-codigo"><input id="pf-cod" value="' + escaparTexto(meu) + '" readonly></div>' +
    '<button class="est-bt" id="pf-cod-copiar">Copiar</button>' +
    '<p class="est-nota" style="margin-top:14px">Recebeu um código? Cole aqui:</p>' +
    '<div class="pf-codigo"><input id="pf-cod-in" placeholder="NN-..." maxlength="40"></div>' +
    '<button class="est-bt" id="pf-cod-usar">Usar estas cores</button>',
    () => {
      const c = $("pf-cod-copiar");
      if (c) c.addEventListener("click", () => {
        const campo = $("pf-cod");
        if (!campo) return;
        campo.select();
        try { navigator.clipboard.writeText(campo.value); } catch (e) {
          try { document.execCommand("copy"); } catch (e2) {}
        }
        estAvisar("Código copiado.");
      });
      const u = $("pf-cod-usar");
      if (u) u.addEventListener("click", () => {
        const campo = $("pf-cod-in");
        const lido = corCodigoLer(campo && campo.value);
        if (!lido) { estAvisar("Esse código não parece certo."); return; }
        perfilSalvar(lido);
        estAvisar("Pronto: as cores são suas agora.");
        estFecharJanela();
      });
    });
}

/* =====================================================================
   81, 85 e 87 — SOM AO ABRIR, SOM AO PASSAR, E VIBRAÇÃO
   ---------------------------------------------------------------------
   Os três são a mesma decisão tomada três vezes: um retorninho quando o
   dedo faz alguma coisa. E os três vêm DESLIGADOS. Som que a pessoa não
   pediu é som que ela vai querer desligar no primeiro minuto, e a
   vibração some a bateria de quem mais precisa dela.
   ===================================================================== */
function perfilSomAbrir() {
  try {
    if (!perfilMeu().somPerfil || AudioSys.muted || !AudioSys.ctx) return;
    AudioSys.tone(520, 0.05, "sine", 0.07);
    setTimeout(() => { try { AudioSys.tone(780, 0.06, "sine", 0.06); } catch (e) {} }, 70);
  } catch (e) {}
}
function perfilSomPassar() {
  try {
    if (!perfilMeu().somPerfil || AudioSys.muted || !AudioSys.ctx) return;
    AudioSys.tone(1180, 0.025, "sine", 0.03);
  } catch (e) {}
}
function perfilVibrar(ms) {
  try {
    if (!perfilMeu().vibra) return;
    if (navigator.vibrate) navigator.vibrate(ms || 12);
  } catch (e) {}
}

/* =====================================================================
   65 — O RASTRO DO CURSOR
   ---------------------------------------------------------------------
   Três coisas o seguram para não virar peso:
     - só no computador (ponteiro fino). No celular não existe cursor
       parado: o rastro sairia debaixo do dedo, tapando o que ele toca
     - só enquanto o cartão do perfil está aberto
     - no máximo RASTRO_MAX pontinhos, reaproveitados em roda. Criar e
       jogar fora um elemento por movimento de mouse é exatamente o tipo
       de coisa que engasga celular fraco
   ===================================================================== */
const RASTRO_MAX = 14;
let rastroPontos = null, rastroVez = 0, rastroOuvindo = null;

function rastroLigar(cx) {
  rastroDesligar();
  try {
    if (!perfilMeu().rastro) return;
    if (!window.matchMedia || !matchMedia("(pointer:fine)").matches) return;
    if (matchMedia("(prefers-reduced-motion:reduce)").matches) return;
  } catch (e) { return; }
  if (!cx) return;
  const capa = document.createElement("div");
  capa.className = "pf-rastro-capa";
  cx.appendChild(capa);
  rastroPontos = [];
  for (let i = 0; i < RASTRO_MAX; i++) {
    const d = document.createElement("i");
    d.className = "pf-rastro-p";
    capa.appendChild(d);
    rastroPontos.push(d);
  }
  const mover = e => {
    const r = cx.getBoundingClientRect();
    const d = rastroPontos[rastroVez++ % RASTRO_MAX];
    d.style.left = (e.clientX - r.left) + "px";
    d.style.top = (e.clientY - r.top) + "px";
    /* tirar e repor a classe reinicia a animação: sem isso o pontinho
       só apaga uma vez e depois fica parado */
    d.classList.remove("vivo");
    void d.offsetWidth;
    d.classList.add("vivo");
  };
  cx.addEventListener("pointermove", mover);
  rastroOuvindo = { cx, mover, capa };
}

function rastroDesligar() {
  if (!rastroOuvindo) return;
  try {
    rastroOuvindo.cx.removeEventListener("pointermove", rastroOuvindo.mover);
    rastroOuvindo.capa.remove();
  } catch (e) {}
  rastroOuvindo = null; rastroPontos = null; rastroVez = 0;
}

/* =====================================================================
   86 — O MURAL DE RECADOS
   ---------------------------------------------------------------------
   Um lugar para os outros escreverem no seu perfil.

   Mora em `conversas/__mural/<uid>`, e não num galho novo: `conversas/`
   é o galho que as regras antigas do Firebase já liberam desde a
   primeira versão de amigos. Um `mural/` no primeiro nível seria
   recusado calado nas contas antigas, e o recado sumiria sem erro --
   foi exatamente isso que matou o CRIAR SERVIDOR.

   Guarda os MURAL_MAX últimos. Mural que cresce para sempre é uma
   leitura que cresce para sempre.
   ===================================================================== */
const MURAL_MAX = 20;
const MURAL_LETRAS = 120;
const MURAL = { de: {}, carregando: {} };

async function muralCarregar(uid) {
  if (!uid || MURAL.carregando[uid]) return MURAL.de[uid] || [];
  MURAL.carregando[uid] = 1;
  try {
    const d = await nuvemPegar("conversas/__mural/" + uid);
    const lista = [];
    for (const k in (d || {})) lista.push(Object.assign({ k }, d[k]));
    lista.sort((a, b) => (a.t || 0) - (b.t || 0));
    MURAL.de[uid] = lista.slice(-MURAL_MAX);
  } catch (e) { MURAL.de[uid] = MURAL.de[uid] || []; }
  MURAL.carregando[uid] = 0;
  return MURAL.de[uid];
}

async function muralEscrever(uid, texto) {
  const eu = estEu();
  if (!eu || !uid) return false;
  const t = String(texto || "").trim().slice(0, MURAL_LETRAS);
  if (!t) return false;
  if (!estPodeFalar(t)) return false;
  const k = String(Date.now()) + "_" + eu.id;
  const recado = { de: eu.id, nome: eu.tag || eu.nome, txt: t, t: Date.now() };
  /* desenha na hora e guarda depois: o mural é meu e a rede é lenta */
  MURAL.de[uid] = (MURAL.de[uid] || []).concat([Object.assign({ k }, recado)]).slice(-MURAL_MAX);
  try { await nuvemSoltar("conversas/__mural/" + uid + "/" + k, recado); } catch (e) {}
  return true;
}

async function muralApagar(uid, k) {
  MURAL.de[uid] = (MURAL.de[uid] || []).filter(m => m.k !== k);
  try { await nuvemSoltar("conversas/__mural/" + uid + "/" + k, null, "DELETE"); } catch (e) {}
}

function muralBlocoHTML(uid, souEu) {
  const lista = MURAL.de[uid] || [];
  const linhas = lista.slice().reverse().map(m =>
    '<div class="pf-rec"><span class="pf-rec-de">' + escaparTexto(m.nome || "?") + "</span>" +
    '<span class="pf-rec-txt">' + escaparLongo(m.txt) + "</span>" +
    /* o dono do mural apaga o que quiser do próprio mural: recado que
       não dá para tirar é uma pichação com o meu nome embaixo */
    (souEu ? '<button class="pf-rec-x" data-rec="' + m.k + '" aria-label="Apagar">✕</button>' : "") +
    "</div>").join("");
  return '<div class="pf-bl"><h4>Mural <i>' + lista.length + "</i></h4>" +
    (linhas || '<p class="pf-bio vazia">' +
      (souEu ? "Ninguém deixou recado ainda." : "Seja o primeiro a deixar um recado.") + "</p>") +
    (souEu ? "" :
      '<div class="pf-rec-novo"><input id="pf-rec-in" maxlength="' + MURAL_LETRAS +
      '" placeholder="Deixe um recado"><button class="est-bt" id="pf-rec-ok">Enviar</button></div>') +
    "</div>";
}
