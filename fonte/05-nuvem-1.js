
"use strict";
/* ---------- Controles ----------
   Celular: arrastar o dedo (a nave acompanha o movimento).
   Computador: a nave SEGUE O CURSOR sozinha, sem clicar nem segurar, e as
   habilidades saem por teclas vizinhas (mão esquerda no teclado, direita
   no mouse).                                                                */
let dragging = false, dragId = null;
let dragStartX = 0, dragStartY = 0, shipStartX = 0, shipStartY = 0;

/* teclas coladas umas nas outras, na ordem em que as habilidades aparecem */
const TECLAS_HAB = ["q", "w", "e", "r", "t", "a", "s", "d", "f", "g"];
const ROTULOS_TECLA = { " ": "ESPAÇO", "shift": "SHIFT" };
function nomeDaTecla(t) { return ROTULOS_TECLA[t] || t.toUpperCase(); }

function ehComputador() {
  if (save && save.controle === "pc") return true;
  if (save && save.controle === "toque") return false;
  try {
    return window.matchMedia("(pointer: fine)").matches &&
           !window.matchMedia("(any-pointer: coarse)").matches;
  } catch (e) { return false; }
}
let modoPC = false;
function atualizarModoPC() {
  modoPC = ehComputador();
  document.body.classList.toggle("pc", modoPC);
  const d = $("pc-dica");
  if (d) d.style.display = modoPC ? "block" : "none";
  renderHabBar(true);
}

canvas.addEventListener("pointerdown", e => {
  e.preventDefault();
  AudioSys.resume();
  if (S.mode === "cutscene") return;
  if (S.mode !== "playing" || !player.alive) return;
  if (modoPC && e.pointerType === "mouse") return;   // no PC não precisa clicar
  dragging = true;
  dragId = e.pointerId;
  dragStartX = e.clientX; dragStartY = e.clientY;
  shipStartX = player.tx; shipStartY = player.ty;
  try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
});
canvas.addEventListener("pointermove", e => {
  if (modoPC && e.pointerType === "mouse") {
    if (S.mode !== "playing" || !player.alive) return;
    const mx = pxX(e.clientX), my = pxY(e.clientY);
    if (mundoAtivo("invertido")) {
      player.tx = clamp(W - mx, player.r, W - player.r);
      player.ty = clamp(H - my, player.r, limiteBaixo());
      return;
    }
    // segue o cursor direto: onde o mouse está, a nave vai
    player.tx = clamp(mx, player.r, W - player.r);
    player.ty = clamp(my, player.r, limiteBaixo());
    return;
  }
  if (!dragging || e.pointerId !== dragId) return;
  e.preventDefault();
  const k = ST.speedK * mundoSinalControle() * ajVol("sens");
  player.tx = clamp(shipStartX + pxX(e.clientX - dragStartX) * k, player.r, W - player.r);
  player.ty = clamp(shipStartY + pxY(e.clientY - dragStartY) * k, player.r, limiteBaixo());
});
function endDrag(e) { if (e.pointerId === dragId) { dragging = false; dragId = null; } }
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);
canvas.addEventListener("contextmenu", e => e.preventDefault());
/* durante a partida nada mais rola: o dedo é só para pilotar */
/* A tela do jogo fica parada: nada de arrastar a página. Mas o que
   ROLA DE VERDADE tem de rolar — e antes isso era uma lista de nomes de
   classe escrita à mão, então toda fila nova (as abas, os filtros do
   hangar, a conversa) nascia travada. Agora a regra é geral: se algum
   pai do que você tocou pode rolar para aquele lado, deixa rolar. */
function podeRolar(el, horizontal) {
  const st = getComputedStyle(el);
  const fluxo = horizontal ? st.overflowX : st.overflowY;
  if (fluxo !== "auto" && fluxo !== "scroll") return false;
  return horizontal ? el.scrollWidth > el.clientWidth + 2
                    : el.scrollHeight > el.clientHeight + 2;
}
let toqueX = 0, toqueY = 0;
document.addEventListener("touchstart", e => {
  const t = e.touches && e.touches[0];
  if (t) { toqueX = t.clientX; toqueY = t.clientY; }
}, { passive: true });

document.addEventListener("touchmove", e => {
  if (e.target === canvas || e.target === of3d) { e.preventDefault(); return; }
  if (S.mode === "playing" || S.mode === "cutscene") { e.preventDefault(); return; }
  const t = e.touches && e.touches[0];
  const horizontal = t ? Math.abs(t.clientX - toqueX) > Math.abs(t.clientY - toqueY) : false;
  let n = e.target;
  while (n && n !== document.body && n.nodeType === 1) {
    try { if (podeRolar(n, horizontal)) return; } catch (err) {}
    n = n.parentNode;
  }
  e.preventDefault();
}, { passive: false });
/* o gesto de puxar para recarregar também fica de fora */
document.addEventListener("gesturestart", e => e.preventDefault(), { passive: false });
document.addEventListener("dblclick", e => {
  if (S.mode === "playing") e.preventDefault();
}, { passive: false });

const keys = {};
window.addEventListener("keydown", e => {
  if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" ||
                   e.target.tagName === "TEXTAREA")) return;
  keys[e.key] = true;
  const t = String(e.key).toLowerCase();
  if ((t === "p" || e.key === "Escape") && (S.mode === "playing" || S.mode === "paused")) togglePause();
  if (S.mode !== "playing") return;
  if (t === "x" || e.key === " ") { e.preventDefault(); tryUlt(); return; }
  if (t === "c" || e.key === "Shift") { tryCloak(); return; }
  const i = TECLAS_HAB.indexOf(t);
  if (i >= 0) {
    const lista = habilidadesDaNave().filter(h => !h.combo);
    if (lista[i]) { e.preventDefault(); usarHabilidade(lista[i]); }
  }
});
window.addEventListener("keyup", e => { keys[e.key] = false; });
try {
  window.matchMedia("(pointer: fine)").addEventListener("change", atualizarModoPC);
} catch (e) {}

/* ---------- Navegação ---------- */
/* A JORNADA. Quem entra nas fases é este botão, escondido no HTML: o
   JOGAR grande do topo abre a porta que reúne TODOS os jeitos de jogar
   (jornada, com amigo, ranqueada, arena, maratona, treino), e a primeira
   linha de lá aperta este. Antes "jogar com amigo" morava numa porta
   chamada COM AMIGOS, junto de "conversar com amigos": duas coisas
   diferentes com o mesmo nome, e ninguém achava. */
$("btn-jornada").addEventListener("click", () => { AudioSys.resume(); S.mode = "levels"; renderLevels(); showScreen("levels"); });
$("btn-play").addEventListener("click", () => { AudioSys.resume(); portaAbrir("jogar"); });
$("btn-shop").addEventListener("click", () => { AudioSys.resume(); S.mode = "shop"; renderShop(); showScreen("shop"); });
$("btn-hangar").addEventListener("click", () => { AudioSys.resume(); S.mode = "hangar"; renderHangar(true); showScreen("hangar"); });
$("btn-reliquias").addEventListener("click", () => { AudioSys.resume(); S.mode = "reliquias"; renderReliquias(); showScreen("reliquias"); });
$("btn-tree").addEventListener("click", () => { AudioSys.resume(); S.mode = "tree"; renderTree(); showScreen("tree"); });
$("btn-novidades").addEventListener("click", () => { AudioSys.resume(); abrirNovidades(); });
$("btn-rank").addEventListener("click", () => {
  AudioSys.resume();
  S.mode = "rank";
  renderRanking(true);
  showScreen("rank");
});

const TABELAS = [
  { id: "fase",  nome: "FASES",
    ordena: (a, b) => (b.fase || 0) - (a.fase || 0) || (b.recorde || 0) - (a.recorde || 0),
    valor: p => (p.fase || 0), rotulo: "FASE",
    meta: p => "◆ " + fmt(p.cristais || 0) + " · " + (p.naves || 1) + " naves" },
  { id: "horas", nome: "HORAS JOGADAS",
    ordena: (a, b) => (b.horas || 0) - (a.horas || 0),
    valor: p => (p.horas || 0).toFixed(1).replace(".", ",") + "h", rotulo: "TEMPO",
    meta: p => "fase " + (p.fase || 0) + " · ◆ " + fmt(p.cristais || 0) },
  { id: "tempo", nome: "FASES MAIS RÁPIDAS",
    filtra: p => p.melhorTempo && p.melhorTempo.s > 0,
    ordena: (a, b) => a.melhorTempo.s - b.melhorTempo.s,
    valor: p => p.melhorTempo.s.toFixed(1).replace(".", ",") + "s", rotulo: "RECORDE",
    meta: p => "na fase " + p.melhorTempo.fase },
  { id: "naves", nome: "MAIS AVIÕES",
    ordena: (a, b) => (b.naves || 1) - (a.naves || 1),
    valor: p => (p.naves || 1), rotulo: "NAVES",
    meta: p => "fase " + (p.fase || 0) + " · " + (p.amuletos || 0) + " amuletos" },
  { id: "arena", nome: "ARENA — ONDAS",
    filtra: p => (p.arenaOnda || 0) > 0,
    ordena: (a, b) => (b.arenaOnda || 0) - (a.arenaOnda || 0) ||
                      (b.arenaMortos || 0) - (a.arenaMortos || 0),
    valor: p => (p.arenaOnda || 0), rotulo: "ONDA",
    meta: p => "☠ " + fmt(p.arenaMortos || 0) + " abatidos · 👑 " + fmt(p.arenaChefes || 0) + " chefes" },
  { id: "abates", nome: "ARENA — ABATES",
    filtra: p => (p.arenaMortos || 0) + (p.arenaChefes || 0) > 0,
    ordena: (a, b) => ((b.arenaMortos || 0) + (b.arenaChefes || 0) * 25) -
                      ((a.arenaMortos || 0) + (a.arenaChefes || 0) * 25),
    valor: p => fmt(p.arenaMortos || 0), rotulo: "ABATIDOS",
    meta: p => "👑 " + fmt(p.arenaChefes || 0) + " chefes · onda " + (p.arenaOnda || 0) },
  { id: "pvp",   nome: "COMPETITIVO",
    filtra: p => (p.vitorias || 0) + (p.derrotas || 0) > 0,
    ordena: (a, b) => (b.rank || 0) - (a.rank || 0) || (b.vitorias || 0) - (a.vitorias || 0),
    valor: p => simboloDoRank(p.rank || 0) + " " + (p.rank || 0), rotulo: "PONTOS",
    meta: p => nomeDoRank(p.rank || 0) + " · " + (p.vitorias || 0) + "V / " + (p.derrotas || 0) + "D" }
];
let abaRanking = "fase";
let cacheRanking = null;

const RANKS = [
  { min: 0,    nome: "BRONZE",       cor: "#C77B3F", sim: "▲" },
  { min: 250,  nome: "PRATA",        cor: "#C8D4E8", sim: "◆" },
  { min: 600,  nome: "OURO",         cor: "#FFC145", sim: "★" },
  { min: 1000, nome: "PLATINA",      cor: "#7CF7C0", sim: "✦" },
  { min: 1500, nome: "DIAMANTE",     cor: "#4DE8FF", sim: "❖" },
  { min: 2100, nome: "MESTRE",       cor: "#C34DFF", sim: "✹" },
  { min: 2800, nome: "GRÃO-MESTRE",  cor: "#FF7B4D", sim: "✵" },
  { min: 3600, nome: "ÁS",           cor: "#FF4D8F", sim: "✈" },
  { min: 4600, nome: "LENDÁRIO",     cor: "#FFE066", sim: "☄" },
  { min: 6000, nome: "PILOT SPIRIT", cor: "#FFFFFF", sim: "☀" }
];
function rankDe(pts) {
  let r = RANKS[0];
  for (const x of RANKS) if (pts >= x.min) r = x;
  return r;
}
function nomeDoRank(pts) { return rankDe(pts).nome; }
function corDoRank(pts) { return rankDe(pts).cor; }
function simboloDoRank(pts) { return rankDe(pts).sim; }
function proximoRank(pts) {
  for (const x of RANKS) if (pts < x.min) return x;
  return null;
}

async function renderRanking(recarregar) {
  const lista = $("rank-list");
  const abas = $("rank-abas");
  abas.innerHTML = "";
  for (const t of TABELAS) {
    const b = document.createElement("button");
    b.className = "aba" + (abaRanking === t.id ? " on" : "");
    b.textContent = t.nome;
    b.addEventListener("click", () => { abaRanking = t.id; renderRanking(false); });
    abas.appendChild(b);
  }
  if (recarregar !== false || !cacheRanking) {
    lista.innerHTML = '<div class="vazio"><b>☁</b><strong>CARREGANDO…</strong>' +
      "<span>Buscando os pilotos na nuvem.</span></div>";
    $("rank-count").textContent = "";
    cacheRanking = await nuvemListar();
  }
  const tab = TABELAS.find(t => t.id === abaRanking) || TABELAS[0];
  let pilotos = cacheRanking.filter(p => !ficaDeForaDoRanking(p));
  if (tab.filtra) pilotos = pilotos.filter(tab.filtra);
  pilotos.sort(tab.ordena);
  lista.innerHTML = "";
  if (!pilotos.length) {
    lista.innerHTML = '<div class="vazio"><b>🏆</b><strong>TABELA VAZIA</strong>' +
      "<span>Ninguém entrou nesta tabela ainda. Jogue uma fase e o seu nome aparece aqui.</span></div>";
    $("rank-count").textContent = "";
    return;
  }
  $("rank-count").textContent = pilotos.length + " piloto" + (pilotos.length === 1 ? "" : "s");
  const meuId = save.__name ? nuvemId(save.__name) : null;
  pilotos.slice(0, 100).forEach((p, i) => {
    const row = document.createElement("div");
    row.className = "rank-row" + (p.id === meuId ? " eu" : "");
    const cor = tab.id === "pvp" ? corDoRank(p.rank || 0) : "var(--amber)";
    row.innerHTML =
      '<div class="rank-pos">' + (i + 1) + "</div>" +
      '<div class="rank-info"><div class="rank-nome moldurado' + (p.vip ? " vip" : "") +
        classeDaMoldura(p.moldura) + '">' +
        escaparTexto(p.tag || p.nome) + (p.vip ? " 👑" : "") +
        (p.id === meuId ? " (você)" : "") + "</div>" +
      '<div class="rank-meta">' + tab.meta(p) + "</div></div>" +
      '<div class="rank-fase" style="color:' + cor + '">' + tab.valor(p) +
        "<span>" + tab.rotulo + "</span></div>";
    lista.appendChild(row);
  });
}

/* nomes vêm de outros jogadores: trate sempre como texto, nunca como HTML.
   O corte em 40 serve para apelido; recado, sugestão e mensagem de
   presente usam escaparLongo, que segura até 500 letras.                */
function escaparHtml(t) {
  return String(t == null ? "" : t)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
/* APELIDO. O corte em 40 é a regra do nick, e não um detalhe do
   escapador -- quem usar isto num texto de gente vai CORTAR o texto, sem
   reticências e sem aviso. Foi o que aconteceu com a Estação inteira: as
   mensagens do bate-papo passavam por aqui, e toda frase com mais de 40
   letras chegava ao outro lado pela metade. Ninguém percebeu porque
   mensagem curta cabia. */
function escaparTexto(t) { return escaparHtml(t).slice(0, 40); }
/* FALA. Recado, sugestão, bio, mensagem, pergunta de enquete: tudo o que
   uma pessoa escreve para outra ler passa por aqui. */
function escaparLongo(t) { return escaparHtml(String(t == null ? "" : t).slice(0, 500)); }
/* =====================================================================
   v6.0 — AJUSTES, PRESENTE DO DIA, MISSÕES, COMBO E ESTRELAS
   Tudo o que está aqui é do jogador: nada depende da nuvem para
   funcionar (a nuvem só recebe o save depois, como sempre).
   ===================================================================== */

/* ---------------------- ajustes do jogador ---------------------- */
const AJ_PADRAO = {
  volMus: 60,        // volume da música, 0 a 100
  volEfe: 70,        // volume dos efeitos
  vibrar: true,      // vibração do celular
  sens: 100,         // sensibilidade do arrasto, 50 a 200
  fps: false,        // mostrar os quadros por segundo
  daltonico: false,  // cor alternativa nos tiros inimigos
  menosLuz: false,   // menos flashes e brilhos
  canhoto: false     // botões grandes do lado esquerdo
};
let AJ = Object.assign({}, AJ_PADRAO);
/* devolve o multiplicador (0 a 2) de um ajuste numérico */
function ajVol(qual) {
  try {
    const v = AJ && AJ[qual];
    if (typeof v !== "number") return 1;
    return Math.max(0, Math.min(200, v)) / 100;
  } catch (e) { return 1; }
}
function ajCarregar() {
  try {
    const t = storageGet("nn_ajustes", "");
    if (t) AJ = Object.assign({}, AJ_PADRAO, JSON.parse(t));
  } catch (e) { AJ = Object.assign({}, AJ_PADRAO); }
}
function ajSalvar() {
  try { storageSet("nn_ajustes", JSON.stringify(AJ)); } catch (e) {}
}
function ajAplicar() {
  try {
    if (AudioSys.master) AudioSys.master.gain.value = AudioSys.muted ? 0 : 0.5 * ajVol("volEfe");
  } catch (e) {}
  try { if (Musica.ganho) Musica.ganho.gain.value = 0.16 * ajVol("volMus"); } catch (e) {}
  document.body.classList.toggle("daltonico", !!AJ.daltonico);
  document.body.classList.toggle("menos-luz", !!AJ.menosLuz);
  document.body.classList.toggle("canhoto", !!AJ.canhoto);
  const f = $("fps-conta");
  if (f) f.style.display = AJ.fps ? "block" : "none";
}
/* cor dos tiros do inimigo: no modo daltônico eles ficam âmbar/branco,
   que não se confunde com o azul dos seus tiros nem com o roxo do fundo */
function corTiroInimigo(b) {
  if (AJ && AJ.daltonico) return b.homing ? "#FFE14D" : "#FFFFFF";
  return b.homing ? "#FF5252" : "#FF87B3";
}

/* uma linha de ajuste com barrinha */
function ajBarra(id, rot, val, min, max, sufixo) {
  return '<div class="aj-linha">' +
    '<div class="aj-rot"><span>' + rot + "</span><b id=\"" + id + "-v\">" +
      val + (sufixo || "") + "</b></div>" +
    '<input type="range" class="aj-range" id="' + id + '" min="' + min +
      '" max="' + max + '" value="' + val + '">' +
  "</div>";
}
/* uma linha de ajuste com chavinha liga/desliga */
function ajChave(id, rot, ligado, nota) {
  return '<button class="aj-chave' + (ligado ? " on" : "") + '" id="' + id + '">' +
    "<span>" + rot + (nota ? '<i>' + nota + "</i>" : "") + "</span>" +
    '<em class="aj-bolha"></em></button>';
}
function ajRender() {
  const cx = $("aj-corpo");
  if (!cx) return;
  cx.innerHTML =
    '<div class="card aj-grupo"><div class="aj-titulo">🔊 SOM</div>' +
      ajBarra("aj-mus", "Música", AJ.volMus, 0, 100, "%") +
      ajBarra("aj-efe", "Efeitos (tiros, explosões)", AJ.volEfe, 0, 100, "%") +
    "</div>" +
    '<div class="card aj-grupo"><div class="aj-titulo">🎮 CONTROLE</div>' +
      ajBarra("aj-sens", "Sensibilidade do dedo", AJ.sens, 50, 200, "%") +
      ajChave("aj-vibrar", "Vibração", AJ.vibrar, "no acerto e no chefe") +
      ajChave("aj-canhoto", "Modo canhoto", AJ.canhoto, "botões grandes à esquerda") +
    "</div>" +
    '<div class="card aj-grupo"><div class="aj-titulo">👁 VER MELHOR</div>' +
      ajChave("aj-dalt", "Modo daltônico", AJ.daltonico, "tiro inimigo em âmbar e branco") +
      ajChave("aj-luz", "Menos flashes", AJ.menosLuz, "para quem se incomoda com luz piscando") +
      ajChave("aj-fps", "Mostrar quadros por segundo", AJ.fps, "para saber se o celular aguenta") +
    "</div>" +
    '<div class="card aj-grupo" id="aj-idioma"></div>' +
    '<div class="card aj-grupo" id="aj-resgate"></div>' +
    '<div class="card aj-grupo"><div class="aj-titulo">📱 DESEMPENHO</div>' +
      '<p class="adm-note">A qualidade do gráfico continua no botão da tela de fases ' +
      "(automático, leve ou bonito). Se o jogo travar, ligue os quadros por segundo aqui " +
      "em cima e veja quanto dá durante a partida.</p>" +
    "</div>" +
    /* Quando o jogo está num atalho da tela inicial, o celular guarda a
       página e pode ficar entregando a mesma cópia por semanas. Este
       cartão existe para o jogador não precisar apagar o atalho: ele vê
       em que versão está e tem um botão que joga o guardado fora. */
    '<div class="card aj-grupo"><div class="aj-titulo">🔄 VERSÃO</div>' +
      '<p class="adm-note">Você está jogando a <b>v' + VERSAO + "</b>.</p>" +
      '<div id="aj-ver-estado" class="adm-note" style="margin-top:6px"></div>' +
      '<button class="ghost-btn" id="aj-ver-buscar" style="width:100%;margin-top:8px">' +
      "PROCURAR ATUALIZAÇÃO</button>" +
      '<button class="ghost-btn" id="aj-ver-forcar" style="width:100%;margin-top:6px">' +
      "BAIXAR TUDO DE NOVO</button>" +
      '<p class="adm-note" style="margin-top:8px">“Baixar tudo de novo” joga fora a ' +
      "cópia guardada no aparelho e pega a página do zero. O seu progresso não está " +
      "nessa cópia — ele fica na sua conta e na nuvem, então não se perde.</p>" +
    "</div>" +
    '<button class="ghost-btn" id="aj-padrao" style="width:100%;margin-top:6px">VOLTAR AO PADRÃO</button>';

  const barra = (id, campo, sufixo) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener("input", () => {
      AJ[campo] = parseInt(el.value, 10);
      const v = $(id + "-v");
      if (v) v.textContent = AJ[campo] + (sufixo || "");
      ajAplicar();
    });
    el.addEventListener("change", () => { ajSalvar(); AudioSys.gem(); });
  };
  try { idiomaRender(); resgateRender(); } catch (e) {}
  ajVersaoLigar();
  barra("aj-mus", "volMus", "%");
  barra("aj-efe", "volEfe", "%");
  barra("aj-sens", "sens", "%");

  const chave = (id, campo) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener("click", () => {
      AJ[campo] = !AJ[campo];
      ajSalvar(); ajAplicar(); ajRender();
      AudioSys.gem(); vibrate(20);
    });
  };
  chave("aj-vibrar", "vibrar");
  chave("aj-canhoto", "canhoto");
  chave("aj-dalt", "daltonico");
  chave("aj-luz", "menosLuz");
  chave("aj-fps", "fps");

  $("aj-padrao").addEventListener("click", () => {
    AJ = Object.assign({}, AJ_PADRAO);
    ajSalvar(); ajAplicar(); ajRender();
    AudioSys.buy();
  });
}
function ajAbrir() {
  S.mode = "ajustes";
  showScreen("ajustes");
  ajRender();
}

/* ---------------------- contador de quadros ---------------------- */
/* Os dois botões do cartão de versão. Ficam aqui embaixo para o
   ajRender não crescer mais do que já cresceu. */
function ajVersaoLigar() {
  const estado = $("aj-ver-estado");
  const buscar = $("aj-ver-buscar");
  const forcar = $("aj-ver-forcar");
  if (!buscar || !forcar) return;

  buscar.addEventListener("click", async () => {
    buscar.disabled = true;
    const antes = buscar.textContent;
    buscar.textContent = "PROCURANDO…";
    if (estado) estado.textContent = "";
    let achou = null;
    try { achou = await versaoNoServidor(); } catch (e) {}
    buscar.disabled = false;
    buscar.textContent = antes;
    if (!estado) return;
    if (!achou) {
      estado.textContent = "Não deu para perguntar ao servidor agora. " +
        "Se você acha que está atrasado, use o botão de baixar tudo de novo.";
      return;
    }
    if (versaoNumero(achou) > versaoNumero(VERSAO)) {
      estado.textContent = "Saiu a v" + achou + ". Atualizando…";
      try { checarVersao(false); } catch (e) {}
    } else {
      estado.textContent = "Você já está na versão mais nova (v" + achou + ").";
    }
  });

  forcar.addEventListener("click", () => {
    if (estado) estado.textContent = "Limpando o que estava guardado…";
    try { limparTudoERecarregar(); } catch (e) {
      /* se algo der errado, pelo menos recarrega furando o cache */
      const u = new URL(location.href);
      u.searchParams.set("v", Date.now().toString(36));
      location.replace(u.toString());
    }
  });
}

let fpsQuadros = 0, fpsMarca = 0;
function fpsContar() {
  if (!AJ.fps) return;
  fpsQuadros++;
  const agora = Date.now();
  if (!fpsMarca) fpsMarca = agora;
  if (agora - fpsMarca >= 500) {
    const v = Math.round(fpsQuadros * 1000 / (agora - fpsMarca));
    const el = $("fps-conta");
    if (el) {
      el.textContent = v + " fps";
      el.className = v >= 50 ? "bom" : v >= 30 ? "meio" : "ruim";
    }
    fpsQuadros = 0; fpsMarca = agora;
  }
}

/* ---------------------- combo de abates ---------------------- */
function comboMais() {
  S.combo = (S.combo || 0) + 1;
  S.comboT = 2.6;
  if (S.combo > (S.comboMax || 0)) S.comboMax = S.combo;
  if (S.combo === 10 || S.combo === 25 || S.combo === 50 || S.combo === 100) {
    AudioSys.power();
    addText(player.x, player.y - 44, "COMBO x" + S.combo + "!", "#FFC145");
    vibrate(25);
  }
  comboMostrar();
}
function comboZera() {
  if ((S.combo || 0) >= 10) addText(player.x, player.y - 30, "combo perdido", "#FF87B3");
  S.combo = 0; S.comboT = 0;
  comboMostrar();
}
/* de 1.00 até 2.00: cada abate seguido vale 2% a mais, até 50 */
function comboMult() {
  return 1 + Math.min(S.combo || 0, 50) * 0.02;
}
function comboPassar(dt) {
  if (!S.comboT) return;
  S.comboT -= dt;
  if (S.comboT <= 0) { S.combo = 0; S.comboT = 0; comboMostrar(); }
}
function comboMostrar() {
  const el = $("combo-hud");
  if (!el) return;
  const c = S.combo || 0;
  if (c < 3) { el.className = ""; el.textContent = ""; return; }
  el.textContent = "x" + c + "  ·  " + Math.round(comboMult() * 100) + "%";
  el.className = "on" + (c >= 25 ? " quente" : "");
}

/* ---------------------- estrelas de cada fase ----------------------
   1ª estrela: passou. 2ª: passou sem levar dano. 3ª: passou rápido
   (abaixo do tempo alvo, que cresce com a fase).                     */
/* Alvo da 3ª estrela.
   A conta antiga (55s + 5s a cada 10 fases) não acompanhava o tamanho
   da fase: da fase 25 em diante a fase já durava mais que o alvo, e a
   terceira estrela virava impossível — não difícil, impossível. Foi o
   testes/curvas.py que mostrou isso numa tabela.
   Agora o alvo nasce do número de ondas: sobra exigir jogar rápido,
   sem exigir o que não existe.                                       */
function tempoAlvo(fase) {
  let ondas = 3;
  try { ondas = faseWaves(fase); } catch (e) {}
  return Math.round(ondas * 16 + 20);
}
function estrelasDaFase(fase, dur, semDano) {
  let e = 1;
  if (semDano) e++;
  if (dur > 0 && dur <= tempoAlvo(fase)) e++;
  save.estrelas = save.estrelas || {};
  const antes = save.estrelas[fase] || 0;
  if (e > antes) {
    save.estrelas[fase] = e;
    const ganhou = e - antes;
    save.crystals += ganhou * 40;
    S.estrelasAgora = { fase: fase, estrelas: e, novas: ganhou };
  } else {
    S.estrelasAgora = { fase: fase, estrelas: antes, novas: 0 };
  }
  return e;
}
/* mostra as estrelas na tela de vitória, uma aparecendo depois da outra */
function vitoriaEstrelas() {
  const cx = $("vic-estrelas");
  const nota = $("vic-estrelas-nota");
  if (!cx) return;
  const info = S.estrelasAgora || { estrelas: 1, novas: 0, fase: S.fase };
  cx.innerHTML = "<i>★</i><i>★</i><i>★</i>";
  const its = cx.querySelectorAll("i");
  for (let i = 0; i < 3; i++) {
    if (i < info.estrelas) {
      setTimeout(() => {
        its[i].className = "on";
        try { AudioSys.gem(); } catch (e) {}
      }, 260 + i * 260);
    }
  }
  if (nota) {
    const alvo = tempoAlvo(info.fase || S.fase);
    nota.innerHTML = info.novas
      ? "<b>+" + (info.novas * 40) + " cristais</b> pelas estrelas novas"
      : info.estrelas >= 3
        ? "As três estrelas desta fase são suas"
        : "Sem levar dano = 2ª estrela · em menos de " + alvo + "s = 3ª";
  }
  if (info.novas) misProgresso("estrela", info.novas);
}
function estrelasTotal() {
  let n = 0;
  const m = save.estrelas || {};
  for (const k in m) n += m[k] || 0;
  return n;
}

/* ---------------------- presente do dia ---------------------- */
function hojeTxt() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") +
         "-" + String(d.getDate()).padStart(2, "0");
}
function ontemTxt() {
  const d = new Date(Date.now() - 86400000);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") +
         "-" + String(d.getDate()).padStart(2, "0");
}
const DIARIA_PREMIOS = [
  { cristais: 120,  texto: "120 cristais" },
  { cristais: 200,  texto: "200 cristais" },
  { cristais: 320,  texto: "320 cristais" },
  { cristais: 500,  texto: "500 cristais" },
  { cristais: 700,  texto: "700 cristais" },
  { cristais: 1000, texto: "1.000 cristais" },
  { cristais: 1800, amuleto: true, texto: "1.800 cristais + um amuleto" }
];
function diariaEstado() {
  save.diaria = save.diaria || { dia: "", seq: 0 };
  return save.diaria;
}
function diariaPodePegar() { return diariaEstado().dia !== hojeTxt(); }
function diariaDiaAtual() {
  const d = diariaEstado();
  /* se faltou ontem, a sequência recomeça */
  const seguiu = d.dia === ontemTxt();
  return seguiu ? Math.min(d.seq, 6) : 0;
}
function diariaPegar() {
  if (!diariaPodePegar()) return null;
  const d = diariaEstado();
  const i = diariaDiaAtual();
  const p = DIARIA_PREMIOS[i];
  save.crystals += p.cristais;
  let extra = "";
  if (p.amuleto) {
    try {
      const a = rollAmulet();
      extra = " e um " + amuletDef(a).name;
    } catch (e) {}
  }
  d.dia = hojeTxt();
  d.seq = (d.dia === hojeTxt() && i + 1 <= 7) ? i + 1 : 1;
  if (i + 1 > (save.maiorSeq || 0)) save.maiorSeq = i + 1;
  if (d.seq > 7) d.seq = 0;
  persist();
  try { nuvemEnviar(true); } catch (e) {}
  AudioSys.buy(); vibrate([30, 40, 60]);
  diariaRender();
  refreshMenu();
  return p.texto + extra;
}
function diariaRender() {
  const cx = $("diaria-cartao");
  if (!cx) return;
  if (!diariaPodePegar()) {
    const i = Math.min(diariaEstado().seq, 7);
    cx.style.display = "block";
    cx.className = "diaria pego";
    cx.innerHTML = '<div class="diaria-txt"><b>Presente de hoje pego ✓</b>' +
      "<span>Volte amanhã: dia " + Math.min(i + 1, 7) + " de 7</span></div>";
    return;
  }
  const i = diariaDiaAtual();
  cx.style.display = "block";
  cx.className = "diaria";
  cx.innerHTML =
    '<div class="diaria-txt"><b>🎁 PRESENTE DO DIA ' + (i + 1) + "</b>" +
      "<span>" + DIARIA_PREMIOS[i].texto + "</span></div>" +
    '<div class="diaria-bolhas">' +
      DIARIA_PREMIOS.map((p, j) =>
        '<i class="' + (j < i ? "ok" : j === i ? "agora" : "") + '">' + (j + 1) + "</i>"
      ).join("") +
    "</div>" +
    '<button class="big-btn" id="diaria-pegar">PEGAR</button>';
  const b = $("diaria-pegar");
  if (b) b.addEventListener("click", () => {
    const txt = diariaPegar();
    if (txt) {
      const c = $("diaria-cartao");
      if (c) c.insertAdjacentHTML("beforeend",
        '<div class="diaria-ok">Você ganhou ' + escaparTexto(txt) + "</div>");
    }
  });
}

/* ---------------------- missões do dia ----------------------
   Três por dia, sorteadas a partir da data: todo mundo que joga no
   mesmo dia pega as mesmas, e elas não mudam se você fechar o jogo. */
const MISSOES_POSSIVEIS = [
  { tipo: "matar",  rot: n => "Derrube " + n + " inimigos",         alvos: [150, 250, 400], premio: 260 },
  { tipo: "fase",   rot: n => "Passe " + n + (n > 1 ? " fases" : " fase"), alvos: [2, 3, 5], premio: 320 },
  { tipo: "chefe",  rot: n => "Derrote " + n + (n > 1 ? " chefes" : " chefe"), alvos: [1, 2], premio: 420 },
  { tipo: "tanque", rot: n => "Destrua " + n + " naves pesadas",     alvos: [12, 20, 30], premio: 300 },
  { tipo: "amigo",  rot: n => "Jogue " + n + (n > 1 ? " fases" : " fase") + " no cooperativo", alvos: [1, 2], premio: 500 },
  { tipo: "combo",  rot: n => "Faça um combo de " + n + " abates",   alvos: [15, 25, 40], premio: 340 },
  { tipo: "estrela", rot: n => "Ganhe " + n + (n > 1 ? " estrelas" : " estrela") + " nas fases", alvos: [2, 3], premio: 380 }
];
function misEstado() {
  save.missoes = save.missoes || { dia: "", itens: [] };
  if (save.missoes.dia !== hojeTxt()) misSortear();
  return save.missoes;
}
function misSortear() {
  const dia = hojeTxt();
  /* semente a partir da data: mesma lista o dia todo */
  let semente = 0;
  for (let i = 0; i < dia.length; i++) semente = (semente * 31 + dia.charCodeAt(i)) >>> 0;
  const r = rngDe(semente || 7);
  const pool = MISSOES_POSSIVEIS.slice();
  const itens = [];
  for (let i = 0; i < 3 && pool.length; i++) {
    const j = Math.floor(r() * pool.length);
    const m = pool.splice(j, 1)[0];
    const alvo = m.alvos[Math.floor(r() * m.alvos.length)];
    itens.push({ tipo: m.tipo, alvo: alvo, feito: 0, pego: false, premio: m.premio });
  }
  save.missoes = { dia: dia, itens: itens };
  persist();
}
function misRotulo(it) {
  const def = MISSOES_POSSIVEIS.filter(m => m.tipo === it.tipo)[0];
  return def ? def.rot(it.alvo) : it.tipo;
}
/* chamada pelo jogo quando alguma coisa acontece */
function misProgresso(tipo, quanto) {
  try {
    const e = misEstado();
    let mudou = false;
    for (const it of e.itens) {
      if (it.tipo !== tipo || it.feito >= it.alvo) continue;
      it.feito = Math.min(it.alvo, it.feito + quanto);
      mudou = true;
      if (it.feito >= it.alvo) {
        AudioSys.power();
        try { addText(player.x, player.y - 58, "MISSÃO COMPLETA!", "#63F5B5"); } catch (er) {}
      }
    }
    /* combo é "o maior que você fez", não uma soma */
    if (tipo === "combo") {
      for (const it of e.itens) {
        if (it.tipo === "combo") it.feito = Math.max(it.feito, quanto);
      }
    }
    if (mudou) misBadge();
  } catch (er) {}
}
function misPegar(i) {
  const e = misEstado();
  const it = e.itens[i];
  if (!it || it.pego || it.feito < it.alvo) return;
  it.pego = true;
  contar("missoesFeitas");
  save.crystals += it.premio;
  persist();
  try { nuvemEnviar(true); } catch (er) {}
  AudioSys.buy(); vibrate([30, 40, 60]);
  misRender(); misBadge(); refreshMenu();
}
function misProntas() {
  try {
    return misEstado().itens.filter(it => it.feito >= it.alvo && !it.pego).length;
  } catch (e) { return 0; }
}
function misBadge() {
  const n = misProntas();
  const b = $("mis-badge");
  if (b) { b.textContent = n; b.className = n ? "on" : ""; }
  misResumo();
}
function misResumo() {
  const cx = $("missoes-resumo");
  if (!cx) return;
  let e;
  try { e = misEstado(); } catch (er) { return; }
  const feitas = e.itens.filter(it => it.feito >= it.alvo).length;
  cx.style.display = "block";
  cx.className = "mis-resumo" + (misProntas() ? " tem" : "");
  cx.innerHTML = '<b>🎯 MISSÕES DO DIA</b><span>' + feitas + " de " + e.itens.length +
    (misProntas() ? " — tem prêmio para pegar!" : " concluídas") + "</span>";
  cx.onclick = () => misAbrir();
}
function misRender() {
  const cx = $("mis-corpo");
  if (!cx) return;
  const e = misEstado();
  $("mis-gems").textContent = fmt(save.crystals);
  cx.innerHTML =
    '<p class="adm-note" style="margin-bottom:12px">Trocam todo dia à meia-noite. ' +
    "O que você já fez fica guardado mesmo se fechar o jogo.</p>" +
    e.itens.map((it, i) => {
      const pronto = it.feito >= it.alvo;
      const pc = Math.min(100, Math.round(it.feito / it.alvo * 100));
      return '<div class="mis-linha' + (it.pego ? " pego" : pronto ? " pronto" : "") + '">' +
        '<div class="mis-topo"><b>' + escaparTexto(misRotulo(it)) + "</b>" +
          '<em class="gem">' + fmt(it.premio) + "</em></div>" +
        '<div class="mis-barra"><i style="width:' + pc + '%"></i></div>' +
        '<div class="mis-pe"><span>' + it.feito + " / " + it.alvo + "</span>" +
          (it.pego ? "<em>✓ pego</em>"
           : pronto ? '<button class="mis-btn" data-mis="' + i + '">PEGAR ◆' + fmt(it.premio) + "</button>"
           : "<em>em andamento</em>") +
        "</div></div>";
    }).join("");
  cx.querySelectorAll("[data-mis]").forEach(b =>
    b.addEventListener("click", () => misPegar(parseInt(b.getAttribute("data-mis"), 10))));
}
function misAbrir() {
  S.mode = "missoes";
  showScreen("missoes");
  misRender();
}

/* ---------------------- ligação com o menu ---------------------- */
$("btn-ajustes").addEventListener("click", () => { AudioSys.gem(); ajAbrir(); });
$("btn-missoes").addEventListener("click", () => { AudioSys.gem(); misAbrir(); });

ajCarregar();
ajAplicar();
/* --- coisas que rodam quando o jogo abre --- */
setTimeout(() => {
  try { conferirCopia(); } catch (e) {}
  try { bateriaCuidar(); } catch (e) {}
  try { entrarPeloLink(); } catch (e) {}
  try {
    const c = conviteDoLink();
    if (c) alertaMenu("Você foi convidado com o código " + c + " — use em CONVIDAR.");
  } catch (e) {}
}, 1500);
/* o dono é avisado quando alguém paga */
setInterval(() => { try { pedidosOlhar(); } catch (e) {} }, 45000);


/* =====================================================================
   v6.1 — TUTORIAL, CONQUISTAS, PERFIL, NOME DAS FASES, CONVITE E FOTO
   ===================================================================== */

/* ---------------------- números do piloto ----------------------
   Contadores que faltavam para o perfil e para as conquistas.     */
function contar(campo, quanto) {
  try {
    if (!save) return;
    save[campo] = (save[campo] || 0) + (quanto === undefined ? 1 : quanto);
  } catch (e) {}
}
function precisao() {
  const t = save.tiros || 0;
  if (t < 20) return null;
  return Math.round((save.acertos || 0) / t * 100);
}

/* ---------------------- nome de cada fase ----------------------
   Sempre o mesmo nome para a mesma fase, sem guardar lista nenhuma. */
const FASE_ADJ = ["Corredor", "Campo", "Cerco", "Garganta", "Órbita", "Fenda",
  "Ninho", "Muralha", "Enxame", "Silêncio", "Rastro", "Portal", "Colmeia",
  "Trincheira", "Abismo", "Vigília", "Ruína", "Espiral"];
const FASE_DE = ["de Ferro", "de Vidro", "Carmesim", "de Cinzas", "de Plasma",
  "Esquecido", "de Prata", "Faminto", "de Sal", "Sem Nome", "de Âmbar",
  "Profundo", "de Ossos", "Gelado", "em Chamas", "de Névoa"];
function faseNome(fase) {
  const r = rngDe(((fase * 2246822519) ^ 0x5bf03635) >>> 0);
  const a = FASE_ADJ[Math.floor(r() * FASE_ADJ.length)];
  const b = FASE_DE[Math.floor(r() * FASE_DE.length)];
  return a + " " + b;
}
/* uma linha dizendo por que ESTA fase é diferente */
function fasePerigo(fase) {
  if (isBossFase(fase)) return "Chefe no fim. Guarde a ultimate para a segunda metade.";
  const w = faseWaves(fase);
  if (fase <= 5) return "Fase de aquecimento: aprenda a desviar sem pressa.";
  if (fase % 10 === 9) return "Última fase antes do chefe: os inimigos vêm em bloco.";
  if (w >= 6) return w + " ondas seguidas — a resistência importa mais que o dano.";
  if (fase % 7 === 0) return "Muitas naves pesadas: mire nelas primeiro.";
  if (fase % 5 === 0) return "Tiros teleguiados: não fique parado no meio da tela.";
  return w + " ondas. Combo alto aqui rende cristal fácil.";
}
/* cartão que aparece por 2 segundos no começo da fase */
function faseCartao(fase) {
  const el = $("fase-cartao");
  if (!el) return;
  let bioma = "";
  try { bioma = biomaDaFase(fase).nome; } catch (e) {}
  el.innerHTML = '<b>FASE ' + fase + (bioma ? " · " + escaparTexto(bioma) : "") + "</b>" +
                 "<span>" + escaparTexto(faseNome(fase)) + "</span>" +
                 "<i>" + escaparTexto(fasePerigo(fase)) + "</i>";
  el.className = "on";
  clearTimeout(faseCartao._t);
  faseCartao._t = setTimeout(() => { el.className = ""; }, 2600);
}

/* ---------------------- tutorial da primeira fase ---------------------- */
const TUTO_PASSOS = [
  { txt: "Arraste o dedo em qualquer lugar da tela para pilotar",
    dica: "não precisa tocar na nave", fim: "mover" },
  { txt: "A nave atira sozinha — você só desvia e mira com o corpo dela",
    dica: "", fim: "tempo", seg: 3.5 },
  { txt: "Os tiros rosa são do inimigo. Encostar neles tira uma vida",
    dica: "passe entre eles, o espaço é maior do que parece", fim: "tempo", seg: 4.5 },
  { txt: "Quando o botão ULT acender, toque para soltar o ataque especial",
    dica: "ele limpa a tela quando aperta", fim: "tempo", seg: 4.5 }
];
const TUTO = { ligado: false, passo: 0, t: 0, andou: 0, x0: 0, y0: 0 };
function tutoPrecisa() {
  return !save.tutorialFeito && (save.best || 0) <= 0;
}
function tutoComecar() {
  TUTO.ligado = true; TUTO.passo = 0; TUTO.t = 0; TUTO.andou = 0;
  TUTO.x0 = player.x; TUTO.y0 = player.y;
  tutoMostrar();
}
function tutoMostrar() {
  const el = $("tuto-caixa");
  if (!el) return;
  if (!TUTO.ligado || TUTO.passo >= TUTO_PASSOS.length) {
    el.className = "";
    return;
  }
  const p = TUTO_PASSOS[TUTO.passo];
  el.innerHTML = '<div class="tuto-n">' + (TUTO.passo + 1) + " de " + TUTO_PASSOS.length + "</div>" +
    "<b>" + escaparTexto(p.txt) + "</b>" +
    (p.dica ? "<span>" + escaparTexto(p.dica) + "</span>" : "") +
    '<button class="tuto-pular" id="tuto-pular">PULAR</button>';
  el.className = "on";
  const b = $("tuto-pular");
  if (b) b.addEventListener("click", ev => { ev.stopPropagation(); tutoTerminar(); });
}
function tutoPassar(dt) {
  if (!TUTO.ligado) return;
  const p = TUTO_PASSOS[TUTO.passo];
  if (!p) { tutoTerminar(); return; }
  TUTO.t += dt;
  let pronto = false;
  if (p.fim === "mover") {
    TUTO.andou += Math.abs(player.x - TUTO.x0) + Math.abs(player.y - TUTO.y0);
    TUTO.x0 = player.x; TUTO.y0 = player.y;
    pronto = TUTO.andou > 220;
  } else {
    pronto = TUTO.t >= (p.seg || 3);
  }
  if (pronto) {
    TUTO.passo++; TUTO.t = 0;
    try { AudioSys.gem(); } catch (e) {}
    if (TUTO.passo >= TUTO_PASSOS.length) tutoTerminar();
    else tutoMostrar();
  }
}
function tutoTerminar() {
  TUTO.ligado = false;
  save.tutorialFeito = true;
  persist();
  const el = $("tuto-caixa");
  if (el) {
    el.innerHTML = "<b>Pronto. Agora é com você 🚀</b>";
    el.className = "on fim";
    setTimeout(() => { el.className = ""; }, 2200);
  }
}

/* ---------------------- conquistas ---------------------- */
const CONQUISTAS = [
  { id: "primeiro",  nome: "Primeiro voo",        desc: "Passe a fase 1",                 premio: 100,  valor: () => save.best || 0, alvo: 1 },
  { id: "fase10",    nome: "Dez de dez",          desc: "Chegue à fase 10",               premio: 200,  valor: () => save.best || 0, alvo: 10 },
  { id: "fase50",    nome: "Meio caminho",        desc: "Chegue à fase 50",               premio: 800,  valor: () => save.best || 0, alvo: 50 },
  { id: "fase120",   nome: "Veterano",            desc: "Chegue à fase 120",              premio: 2000, valor: () => save.best || 0, alvo: 120 },
  { id: "fase270",   nome: "Fim da nebulosa",     desc: "Passe as 270 fases",             premio: 9000, valor: () => save.best || 0, alvo: 270 },
  { id: "abate100",  nome: "Faxina",              desc: "Derrube 100 inimigos",           premio: 120,  valor: () => save.abates || 0, alvo: 100 },
  { id: "abate1k",   nome: "Mil caídos",          desc: "Derrube 1.000 inimigos",         premio: 500,  valor: () => save.abates || 0, alvo: 1000 },
  { id: "abate10k",  nome: "Praga da galáxia",    desc: "Derrube 10.000 inimigos",        premio: 3000, valor: () => save.abates || 0, alvo: 10000 },
  { id: "chefe1",    nome: "Caçador",             desc: "Derrote o primeiro chefe",       premio: 250,  valor: () => save.chefes || 0, alvo: 1 },
  { id: "chefe25",   nome: "Matador de titãs",    desc: "Derrote 25 chefes",              premio: 1500, valor: () => save.chefes || 0, alvo: 25 },
  { id: "combo25",   nome: "Sequência",           desc: "Faça um combo de 25",            premio: 300,  valor: () => save.melhorCombo || 0, alvo: 25 },
  { id: "combo50",   nome: "Sem respirar",        desc: "Faça um combo de 50",            premio: 900,  valor: () => save.melhorCombo || 0, alvo: 50 },
  { id: "estrela10", nome: "Constelação",         desc: "Junte 10 estrelas",              premio: 400,  valor: () => estrelasTotal(), alvo: 10 },
  { id: "estrela100",nome: "Céu inteiro",         desc: "Junte 100 estrelas",             premio: 2500, valor: () => estrelasTotal(), alvo: 100 },
  { id: "perfeita",  nome: "Sem um arranhão",     desc: "Passe uma fase sem levar dano",  premio: 300,  valor: () => save.fasesPerfeitas || 0, alvo: 1 },
  { id: "perfeita20",nome: "Intocável",           desc: "Passe 20 fases sem levar dano",  premio: 1800, valor: () => save.fasesPerfeitas || 0, alvo: 20 },
  { id: "naves5",    nome: "Hangar cheio",        desc: "Tenha 5 naves",                  premio: 300,  valor: () => (save.ships || []).length, alvo: 5 },
  { id: "naves20",   nome: "Frota",              desc: "Tenha 20 naves",                 premio: 1500, valor: () => (save.ships || []).length, alvo: 20 },
  { id: "amigo1",    nome: "Não voo sozinho",     desc: "Faça um amigo no jogo",          premio: 250,  valor: () => (save.amigos || []).length, alvo: 1 },
  { id: "coop10",    nome: "Dupla",              desc: "Passe 10 fases no cooperativo",  premio: 700,  valor: () => save.coopFases || 0, alvo: 10 },
  { id: "vitoria1",  nome: "Primeiro duelo",      desc: "Ganhe uma ranqueada",            premio: 300,  valor: () => save.vitorias || 0, alvo: 1 },
  { id: "vitoria25", nome: "Terror da arena",     desc: "Ganhe 25 ranqueadas",            premio: 2000, valor: () => save.vitorias || 0, alvo: 25 },
  { id: "arena50",   nome: "Sem fim",            desc: "Chegue à onda 50 da arena",      premio: 1200, valor: () => save.arenaOnda || 0, alvo: 50 },
  { id: "missao10",  nome: "Cumpridor",          desc: "Complete 10 missões do dia",     premio: 600,  valor: () => save.missoesFeitas || 0, alvo: 10 },
  { id: "dia7",      nome: "Todo dia",           desc: "Pegue o presente 7 dias seguidos", premio: 1500, valor: () => save.maiorSeq || 0, alvo: 7 }
];
function conqEstado(c) {
  const v = c.valor();
  return { valor: v, pronto: v >= c.alvo, pego: !!(save.conquistas || {})[c.id] };
}
function conqProntas() {
  let n = 0;
  for (const c of CONQUISTAS) {
    const e = conqEstado(c);
    if (e.pronto && !e.pego) n++;
  }
  return n;
}
function conqPegar(id) {
  const c = CONQUISTAS.filter(x => x.id === id)[0];
  if (!c) return;
  const e = conqEstado(c);
  if (!e.pronto || e.pego) return;
  save.conquistas = save.conquistas || {};
  save.conquistas[id] = Date.now();
  save.crystals += c.premio;
  persist();
  try { nuvemEnviar(true); } catch (er) {}
  AudioSys.buy(); vibrate([30, 40, 60]);
  conqRender(); conqBadge(); refreshMenu();
}
function conqBadge() {
  const n = conqProntas();
  const b = $("conq-badge");
  if (b) { b.textContent = n; b.className = n ? "on" : ""; }
}
function conqRender() {
  const cx = $("conq-corpo");
  if (!cx) return;
  const feitas = CONQUISTAS.filter(c => conqEstado(c).pronto).length;
  $("conq-gems").textContent = fmt(save.crystals);
  cx.innerHTML =
    '<div class="conq-topo"><b>' + feitas + " de " + CONQUISTAS.length + "</b>" +
      '<span class="conq-barra"><i style="width:' +
      Math.round(feitas / CONQUISTAS.length * 100) + '%"></i></span></div>' +
    CONQUISTAS.map(c => {
      const e = conqEstado(c);
      const pc = Math.min(100, Math.round(e.valor / c.alvo * 100));
      return '<div class="conq-linha' + (e.pego ? " pego" : e.pronto ? " pronto" : "") + '">' +
        '<div class="conq-ic">' + (e.pego ? "✓" : e.pronto ? "★" : "◇") + "</div>" +
        '<div class="conq-txt"><b>' + escaparTexto(c.nome) + "</b>" +
          "<span>" + escaparTexto(c.desc) + "</span>" +
          (e.pronto ? "" : '<div class="conq-mini"><i style="width:' + pc + '%"></i></div>' +
            "<em>" + fmt(Math.min(e.valor, c.alvo)) + " / " + fmt(c.alvo) + "</em>") +
        "</div>" +
        '<div class="conq-fim">' +
          (e.pego ? '<span class="conq-ok">pego</span>'
                  : e.pronto ? '<button class="mis-btn" data-conq="' + c.id + '">◆' + fmt(c.premio) + "</button>"
                             : '<span class="gem">' + fmt(c.premio) + "</span>") +
        "</div></div>";
    }).join("");
  cx.querySelectorAll("[data-conq]").forEach(b =>
    b.addEventListener("click", () => conqPegar(b.getAttribute("data-conq"))));
}
function conqAbrir() { S.mode = "conquistas"; showScreen("conquistas"); conqRender(); }

/* ---------------------- perfil do piloto ---------------------- */
function tempoBonito(seg) {
  seg = Math.max(0, Math.round(seg || 0));
  const h = Math.floor(seg / 3600), m = Math.floor((seg % 3600) / 60);
  if (h) return h + "h" + String(m).padStart(2, "0");
  if (m) return m + " min";
  return seg + "s";
}
function perfilRender() {
  const cx = $("perf-corpo");
  if (!cx) return;
  const pr = precisao();
  const cx1 = (rot, val, cor) =>
    '<div class="perf-cx' + (cor ? " " + cor : "") + '"><b>' + val + "</b><span>" + rot + "</span></div>";
  const linha = (rot, val) =>
    '<div class="perf-linha"><span>' + rot + "</span><b>" + val + "</b></div>";
  cx.innerHTML =
    '<div class="perf-capa"><div class="perf-nome moldurado' +
      (function () { try { return classeDaMoldura(molduraAtual()); } catch (e) { return ""; } })() +
      '">' + escaparTexto(minhaTag()) +
      (temVip() ? ' <em class="perf-vip">👑 VIP</em>' : "") + "</div>" +
      '<div class="perf-sub">' + escaparTexto((rankDe(save.rank || 0) || {}).nome || "") +
      " · piloto desde " + (save.desde ? new Date(save.desde).toLocaleDateString("pt-BR") : "hoje") +
      "</div></div>" +
    '<div class="perf-grade">' +
      cx1("FASE", (save.best || 0) + "/" + TOTAL_FASES) +
      cx1("ESTRELAS", estrelasTotal(), "ouro") +
      cx1("ABATES", fmt(save.abates || 0)) +
      cx1("CHEFES", fmt(save.chefes || 0), "rosa") +
      cx1("MELHOR COMBO", fmt(save.melhorCombo || 0), "ouro") +
      cx1("TEMPO DE VOO", tempoBonito(save.tempoJogado)) +
    "</div>" +
    '<div class="card perf-lista">' +
      linha("Precisão dos tiros", pr === null ? "jogue mais um pouco" : pr + "%") +
      linha("Fases sem levar dano", fmt(save.fasesPerfeitas || 0)) +
      linha("Partidas jogadas", fmt(save.partidas || 0)) +
      linha("Vezes que caiu", fmt(save.mortes || 0)) +
      linha("Naves no hangar", (save.ships || []).length + " de " + SHIPS.length) +
      linha("Amuletos", (save.amulets || []).length) +
      linha("Ranqueada", (save.vitorias || 0) + "V · " + (save.derrotas || 0) + "D") +
      linha("Maior onda na arena", fmt(save.arenaOnda || 0)) +
      linha("Fases no cooperativo", fmt(save.coopFases || 0)) +
      linha("Missões cumpridas", fmt(save.missoesFeitas || 0)) +
      linha("Conquistas", CONQUISTAS.filter(c => conqEstado(c).pronto).length + " de " + CONQUISTAS.length) +
    "</div>" +
    '<button class="ghost-btn" id="perf-conq" style="width:100%">★ VER CONQUISTAS</button>';
  const b = $("perf-conq");
  if (b) b.addEventListener("click", () => conqAbrir());
}
function perfilAbrir() {
  S.mode = "perfil";
  showScreen("perfil");
  perfilRender();
  combosRender();
  moldurasRender();
  prestigioRender();
}

/* ---------------------- convite com prêmio ----------------------
   Cada piloto tem um código (o próprio gametag). Quem entra com o
   código de alguém ganha cristais, e quem convidou recebe também —
   pela caixa de presente, que já existe.                            */
const CONVITE_QUEM_ENTRA = 500;
const CONVITE_QUEM_CHAMA = 800;
function meuCodigo() {
  const t = String(minhaTag() || save.__name || "").trim();
  return t.toUpperCase().replace(/\s+/g, "");
}
async function conviteUsar(codigo) {
  codigo = String(codigo || "").trim();
  if (!codigo) return { ok: false, msg: "Escreva o código do amigo." };
  if (save.conviteUsado) return { ok: false, msg: "Você já usou um convite — é um por conta." };
  if ((save.best || 0) > 20) return { ok: false, msg: "O convite vale só para quem está começando (até a fase 20)." };
  if (nickSimples(codigo) === nickSimples(save.__name) || nickSimples(codigo) === nickSimples(minhaTag()))
    return { ok: false, msg: "Esse código é o seu." };
  if (!nuvemAtiva()) return { ok: false, msg: "Precisa de internet para conferir o código." };
  const achado = await acharPiloto(codigo);
  if (!achado) return { ok: false, msg: "Não achei esse código. Confira as letras com o seu amigo." };
  /* prêmio de quem entrou */
  save.conviteUsado = achado.id;
  save.crystals += CONVITE_QUEM_ENTRA;
  persist();
  /* prêmio de quem convidou, pela caixa de presente */
  try {
    const pend = (await nuvemReq("presentes/" + achado.id)) || {};
    pend.cristais = (pend.cristais || 0) + CONVITE_QUEM_CHAMA;
    pend.msg = (minhaTag() || "Um piloto") + " entrou com o seu convite!";
    pend.quando = Date.now();
    await nuvemReq("presentes/" + achado.id, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pend)
    });
  } catch (e) {}
  try { nuvemEnviar(true); } catch (e) {}
  AudioSys.buy(); vibrate([30, 40, 60]);
  return { ok: true, msg: "Boa! +" + fmt(CONVITE_QUEM_ENTRA) + " cristais para você e +" +
           fmt(CONVITE_QUEM_CHAMA) + " para " + (achado.p.nome || codigo) + "." };
}
function convRender() {
  const cx = $("conv-corpo");
  if (!cx) return;
  const cod = meuCodigo();
  const link = (location.origin + location.pathname).replace(/index\.html$/, "") + "?convite=" + encodeURIComponent(cod);
  cx.innerHTML =
    '<div class="conv-cartao"><span class="pag-rot">SEU CÓDIGO</span>' +
      "<b>" + escaparTexto(cod) + "</b>" +
      '<div class="pag-chave-btns">' +
        '<button class="pag-copiar" id="conv-copiar">COPIAR CÓDIGO</button>' +
        '<button class="pag-copiar fraco" id="conv-link">COPIAR CONVITE</button>' +
      "</div></div>" +
    '<p class="adm-note" style="margin:12px 0">Quando um amigo entrar com o seu código, ' +
      "ele ganha <b>" + fmt(CONVITE_QUEM_ENTRA) + " cristais</b> e você ganha <b>" +
      fmt(CONVITE_QUEM_CHAMA) + "</b>. Sem limite de amigos." +
      (save.convidados ? " Você já chamou <b>" + save.convidados + "</b>." : "") + "</p>" +
    (save.conviteUsado
      ? '<div class="card"><b>Você já usou um convite ✓</b></div>'
      : '<div class="card"><div class="aj-titulo">🎟 TENHO UM CÓDIGO</div>' +
        '<div class="adm-row"><input id="conv-campo" maxlength="24" placeholder="Código do amigo" autocomplete="off">' +
        '<button class="adm-btn gold" id="conv-usar">USAR</button></div>' +
        '<div class="adm-note" id="conv-aviso" style="margin-top:8px"></div></div>');

  const copiar = async (txt, btn, certo) => {
    try { await navigator.clipboard.writeText(txt); btn.textContent = certo; AudioSys.buy(); }
    catch (e) { btn.textContent = "Copie na mão: " + txt; }
  };
  $("conv-copiar").addEventListener("click", ev => copiar(cod, ev.currentTarget, "✓ COPIADO"));
  $("conv-link").addEventListener("click", ev => copiar(
    "Vem jogar Neon Nebula comigo! Use o meu código " + cod + ": " + link,
    ev.currentTarget, "✓ CONVITE COPIADO"));
  const bu = $("conv-usar");
  if (bu) bu.addEventListener("click", async ev => {
    const b = ev.currentTarget;
    b.disabled = true; b.textContent = "…";
    const r = await conviteUsar(($("conv-campo") || {}).value);
    b.disabled = false; b.textContent = "USAR";
    const av = $("conv-aviso");
    if (av) { av.textContent = r.msg; av.style.color = r.ok ? "var(--verde)" : "var(--danger)"; }
    if (r.ok) { setTimeout(() => { convRender(); refreshMenu(); }, 1400); }
    else AudioSys.deny();
  });
}
function convAbrir() { S.mode = "convite"; showScreen("convite"); convRender(); }
/* se abriu o jogo por um link de convite, já deixa o código escrito */
function conviteDoLink() {
  try {
    const m = /[?&]convite=([^&]+)/.exec(location.search);
    if (!m) return null;
    return decodeURIComponent(m[1]);
  } catch (e) { return null; }
}

/* ---------------------- foto da partida ----------------------
   Desenha um cartão com o resultado para mandar para os amigos.   */
function fotoDaPartida(titulo, linhas) {
  const c = document.createElement("canvas");
  c.width = 1080; c.height = 1080;
  const g = c.getContext("2d");
  /* fundo */
  const fundo = g.createLinearGradient(0, 0, 1080, 1080);
  fundo.addColorStop(0, "#0A1030"); fundo.addColorStop(0.55, "#140B33"); fundo.addColorStop(1, "#05070F");
  g.fillStyle = fundo; g.fillRect(0, 0, 1080, 1080);
  /* estrelas */
  const r = rngDe(97531);
  for (let i = 0; i < 150; i++) {
    const x = r() * 1080, y = r() * 1080, s = r() * 2.4 + 0.6;
    g.globalAlpha = 0.25 + r() * 0.6;
    g.fillStyle = "#CFE6FF"; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill();
  }
  g.globalAlpha = 1;
  /* halo */
  const halo = g.createRadialGradient(540, 430, 20, 540, 430, 460);
  halo.addColorStop(0, "rgba(94,230,255,.34)");
  halo.addColorStop(0.55, "rgba(150,110,255,.16)");
  halo.addColorStop(1, "rgba(94,230,255,0)");
  g.fillStyle = halo; g.fillRect(0, 0, 1080, 1080);
  /* nave */
  try { render3D(g, save.ship, 540, 400, 7, Math.PI * 0.22, 1080, 1080); } catch (e) {}
  /* textos */
  g.textAlign = "center";
  g.fillStyle = "#5EE6FF";
  g.font = "600 34px 'Chakra Petch', sans-serif";
  g.fillText("NEON NEBULA", 540, 96);
  g.fillStyle = "#FFFFFF";
  g.font = "700 64px 'Russo One', sans-serif";
  g.fillText(String(titulo).toUpperCase().slice(0, 24), 540, 700);
  g.font = "500 34px 'Chakra Petch', sans-serif";
  g.fillStyle = "#B9C6E4";
  linhas.slice(0, 4).forEach((t, i) => g.fillText(String(t).slice(0, 42), 540, 770 + i * 52));
  g.font = "500 28px 'Chakra Petch', sans-serif";
  g.fillStyle = "#FFC145";
  g.fillText("código " + meuCodigo() + " · venha jogar", 540, 1012);
  return c.toDataURL("image/png");
}
function fotoMostrar(titulo, linhas) {
  const url = fotoDaPartida(titulo, linhas);
  const cx = $("foto-caixa");
  if (!cx) return;
  cx.innerHTML =
    '<div class="foto-dentro">' +
      '<img src="' + url + '" alt="Resultado da partida">' +
      '<p class="adm-note">Segure na imagem para salvar ou compartilhar.</p>' +
      '<button class="big-btn" id="foto-fechar" style="width:100%">FECHAR</button>' +
    "</div>";
  cx.className = "on";
  $("foto-fechar").addEventListener("click", () => { cx.className = ""; cx.innerHTML = ""; });
  try {
    if (navigator.share && navigator.canShare) {
      /* onde o aparelho deixa, oferece o compartilhar de verdade */
      const b = document.createElement("button");
      b.className = "ghost-btn"; b.style.width = "100%"; b.style.marginTop = "9px";
      b.textContent = "COMPARTILHAR";
      b.addEventListener("click", async () => {
        try {
          const resp = await fetch(url); const blob = await resp.blob();
          const arq = new File([blob], "neon-nebula.png", { type: "image/png" });
          if (navigator.canShare({ files: [arq] })) await navigator.share({ files: [arq], text: "Neon Nebula" });
        } catch (e) {}
      });
      cx.querySelector(".foto-dentro").appendChild(b);
    }
  } catch (e) {}
}

/* ---------------------- ligação com o menu ---------------------- */
const bf = $("vic-foto");
if (bf) bf.addEventListener("click", () => {
  const est = (S.estrelasAgora || {}).estrelas || 1;
  fotoMostrar("Fase " + S.fase + " concluída", [
    faseNome(S.fase),
    "★".repeat(est) + "☆".repeat(3 - est) + "  ·  " + fmt(S.score) + " pontos",
    "combo máximo x" + (S.comboMax || 0),
    (save.best || 0) + " de " + TOTAL_FASES + " fases"
  ]);
});
/* ---- botões da v6.2 ---- */
$("btn-comparar").addEventListener("click", () => { AudioSys.gem(); navesAbrir(); });
$("btn-mapa").addEventListener("click", () => { AudioSys.gem(); mapaAbrir(); });
$("btn-treino").addEventListener("click", () => { AudioSys.resume(); treinoComecar(); });
$("btn-cla").addEventListener("click", () => { AudioSys.gem(); claAbrir(); });

/* ---- painel: números, erros, denúncias, manutenção e registro ---- */
$("adm-numeros-ler").addEventListener("click", async ev => {
  const b = ev.currentTarget;
  b.disabled = true; b.textContent = "LENDO…";
  try { admNumerosRender(await admNumeros()); } catch (e) {}
  b.disabled = false; b.textContent = "ATUALIZAR NÚMEROS";
});
$("adm-erros-ler").addEventListener("click", async ev => {
  const b = ev.currentTarget;
  b.disabled = true; b.textContent = "LENDO…";
  await admErrosCarregar();
  b.disabled = false; b.textContent = "VER ERROS";
});
$("adm-den-ler").addEventListener("click", async ev => {
  const b = ev.currentTarget;
  b.disabled = true; b.textContent = "LENDO…";
  await admDenunciasRender();
  b.disabled = false; b.textContent = "VER DENÚNCIAS";
});
$("adm-reemb-ler").addEventListener("click", async ev => {
  const b = ev.currentTarget;
  b.disabled = true; b.textContent = "LENDO…";
  await reembolsosRender();
  b.disabled = false; b.textContent = "VER REEMBOLSOS";
});
$("adm-reg-ler").addEventListener("click", async ev => {
  const b = ev.currentTarget;
  b.disabled = true; b.textContent = "LENDO…";
  await admRegistroRender();
  b.disabled = false; b.textContent = "VER REGISTRO";
});
$("teste-ligar").addEventListener("click", async ev => {
  const b = ev.currentTarget;
  b.disabled = true; b.textContent = "…";
  const ok = await testeFechadoLigar(($("teste-versao") || {}).value,
                                     ($("teste-nota") || {}).value,
                                     ($("teste-quem") || {}).value);
  b.disabled = false; b.textContent = "COLOCAR EM TESTE";
  const el = $("teste-estado");
  if (el) el.textContent = ok ? "Em teste. Só você e os nicks marcados veem o aviso." : "Não deu para gravar.";
});
$("teste-desligar").addEventListener("click", async () => {
  await nuvemSoltar("mundo/teste", { versao: "" });
  const el = $("teste-estado");
  if (el) el.textContent = "Teste desligado.";
  testeAplicar(null);
});
$("manut-ligar").addEventListener("click", async () => {
  const ok = await manutencaoLigar(true, ($("manut-recado") || {}).value);
  const el = $("manut-estado");
  if (el) { el.textContent = ok ? "Manutenção LIGADA para todo mundo." : "Não deu para gravar."; }
});
$("manut-desligar").addEventListener("click", async () => {
  const ok = await manutencaoLigar(false);
  const el = $("manut-estado");
  if (el) { el.textContent = ok ? "Manutenção desligada." : "Não deu para gravar."; }
});

/* ---- recuperar a conta na tela de entrada ---- */
$("btn-resgatar").addEventListener("click", () => {
  const cx = $("login-resgate");
  if (!cx) return;
  cx.style.display = cx.style.display === "block" ? "none" : "block";
  if (cx.dataset.pronto) return;
  cx.dataset.pronto = "1";
  cx.innerHTML =
    '<p class="adm-note" style="margin-bottom:8px">Escreva o nome da conta e o código de ' +
    "recuperação que aparece nos AJUSTES de quem está conectado.</p>" +
    '<div class="adm-row"><input id="resg-nome" maxlength="14" placeholder="Nome da conta" autocomplete="off"></div>' +
    '<div class="adm-row" style="margin-top:6px"><input id="resg-cod" maxlength="12" placeholder="XXXX-XXXX" autocomplete="off">' +
    '<button class="adm-btn gold" id="resg-ir">DESTRAVAR</button></div>' +
    '<div class="adm-note" id="resg-aviso" style="margin-top:8px"></div>';
  $("resg-ir").addEventListener("click", async ev => {
    const b = ev.currentTarget;
    b.disabled = true; b.textContent = "…";
    const r = await resgatarConta(($("resg-nome") || {}).value, ($("resg-cod") || {}).value);
    b.disabled = false; b.textContent = "DESTRAVAR";
    const av = $("resg-aviso");
    if (av) { av.textContent = r.msg; av.style.color = r.ok ? "var(--verde)" : "var(--danger)"; }
    if (r.ok) { try { renderLogin(); } catch (e) {} }
  });
});
/* o botão de emotes abre e fecha a listinha */
$("emote-abrir").addEventListener("click", ev => {
  ev.stopPropagation();
  const cx = $("emote-caixa");
  cx.classList.toggle("aberto");
  emotesRender();
});
/* últimos parceiros, na tela de amigos */
(function () {
  try {
    const antigo = amigosRender;
    amigosRender = function () {
      const r = antigo.apply(this, arguments);
      try { ultimosRender(); bloqueadosRender(); } catch (e) {}
      return r;
    };
  } catch (e) {}
})();
/* se abriu o jogo por um link de sala, entra direto */
async function entrarPeloLink() {
  const l = salaDoLink();
  if (!l || !l.codigo) return;
  try {
    alertaMenu("Entrando na sala " + l.codigo + "…");
    await mpEntrarSala(l.codigo, l.modo);
  } catch (e) {}
}
$("btn-bossrush").addEventListener("click", () => {
  AudioSys.resume();
  if ((save.best || 0) < 10) {
    S.banner = null;
    alertaMenu("Chegue à fase 10 para abrir a maratona de chefes.");
    return;
  }
  bossRushComecar();
});
/* um recado curto no menu, sem travar nada */
function alertaMenu(txt) {
  const el = $("cloud-status");
  if (!el) return;
  el.textContent = txt;
  el.style.color = "var(--amber)";
  clearTimeout(alertaMenu._t);
  alertaMenu._t = setTimeout(() => { el.textContent = ""; }, 4000);
}
/* a lanterna do APAGÃO segue a nave */
function lanternaSeguir() {
  if (!regraAtiva("escuro")) return;
  const el = $("lanterna");
  if (!el || !player) return;
  const r = canvas.getBoundingClientRect();
  el.style.setProperty("--lanterna-x", (r.left + player.x / DPR * (r.width / (W / DPR)) ) + "px");
  el.style.setProperty("--lanterna-y", (r.top + player.y / DPR * (r.height / (H / DPR))) + "px");
}
$("tree-zerar").addEventListener("click", () => {
  const nota = $("tree-zerar-nota");
  const gastos = ptsSpent();
  if (!gastos) { if (nota) nota.textContent = "A árvore já está vazia."; return; }
  if (!$("tree-zerar").dataset.confirma) {
    $("tree-zerar").dataset.confirma = "1";
    $("tree-zerar").textContent = "TEM CERTEZA? ◆ " + fmt(arvoreCustoZerar());
    if (nota) nota.textContent = "Os " + gastos + " pontos voltam e você escolhe tudo de novo.";
    return;
  }
  const r = arvoreZerar();
  $("tree-zerar").dataset.confirma = "";
  $("tree-zerar").textContent = "↻ REFAZER A ÁRVORE";
  if (nota) { nota.textContent = r.msg; nota.style.color = r.ok ? "var(--verde)" : "var(--danger)"; }
  if (r.ok) { renderTree(); porCristais("tree-gems"); }
});
/* o botão de pular a fase só aparece depois de 5 derrotas seguidas nela */
function pularRender() {
  const cx = $("pular-caixa");
  if (!cx) return;
  if (!podePular()) { cx.style.display = "none"; return; }
  const custo = pularCusto();
  const tem = save.crystals >= custo;
  cx.style.display = "block";
  cx.innerHTML =
    '<div class="card" style="margin-top:10px"><b style="font-size:.72rem">Essa fase está brava, né?</b>' +
    '<p class="adm-note" style="margin:6px 0 10px">Você caiu ' + (S.derrotasSeguidas || 0) +
    " vezes seguidas aqui. Dá para pular e seguir em frente — a fase fica guardada para você " +
    "voltar quando quiser.</p>" +
    '<button class="big-btn amber" id="pular-ir" style="width:100%"' + (tem ? "" : " disabled") +
    ">PULAR A FASE — ◆ " + fmt(custo) + "</button>" +
    (tem ? "" : '<div class="adm-note" style="margin-top:6px">Faltam ◆ ' + fmt(custo - save.crystals) + "</div>") +
    "</div>";
  const b2 = $("pular-ir");
  if (b2) b2.addEventListener("click", () => { if (pularFase()) cx.style.display = "none"; });
}
$("btn-perfil").addEventListener("click", () => { AudioSys.gem(); perfilAbrir(); });
$("btn-conquistas").addEventListener("click", () => { AudioSys.gem(); conqAbrir(); });
$("btn-convite").addEventListener("click", () => { AudioSys.gem(); convAbrir(); });


/* =====================================================================
   v6.2 — PROGRESSÃO
   fundir relíquias · conjuntos salvos · comparar naves · histórico do
   baú · falta pouco para... · reespecializar a árvore · pular a fase
   depois de apanhar muito · prestígio
   ===================================================================== */

/* ---------------------- fundir relíquias repetidas ----------------------
   Três iguais na mesma raridade viram uma da raridade de cima. É o que
   dá utilidade ao monte de amuleto comum que ninguém usa.             */
function fundirGrupos() {
  const grupos = {};
  for (const a of save.amulets) {
    if (a.rar >= 3) continue;                         // lendário não sobe mais
    if (save.equipped.indexOf(a.uid) >= 0) continue;  // o que está em uso não entra
    const k = a.type + ":" + a.rar;
    (grupos[k] = grupos[k] || []).push(a);
  }
  const prontos = [];
  for (const k in grupos) if (grupos[k].length >= 3) prontos.push({ chave: k, itens: grupos[k] });
  return prontos;
}
function fundir(chave) {
  const g = fundirGrupos().filter(x => x.chave === chave)[0];
  if (!g) return null;
  const tres = g.itens.slice(0, 3);
  const tipo = tres[0].type, rar = tres[0].rar;
  for (const a of tres) {
    const i = save.amulets.indexOf(a);
    if (i >= 0) save.amulets.splice(i, 1);
  }
  const novo = { uid: save.amuletSeq++, type: tipo, rar: rar + 1 };
  save.amulets.push(novo);
  persist(); calcStats();
  AudioSys.power(); vibrate([30, 40, 70]);
  return novo;
}
function fundirRender() {
  const cx = $("rel-fundir");
  if (!cx) return;
  const prontos = fundirGrupos();
  if (!prontos.length) { cx.style.display = "none"; return; }
  cx.style.display = "block";
  cx.innerHTML =
    '<div class="aj-titulo">⚗ FUNDIR REPETIDAS</div>' +
    '<p class="adm-note" style="margin-bottom:10px">Três iguais viram uma melhor. ' +
    "O que está equipado não entra.</p>" +
    prontos.map(g => {
      const a = g.itens[0];
      const d = amuletDef(a);
      return '<div class="fund-linha"><span class="fund-ic" style="color:' + RARS[a.rar].color + '">' +
        d.icon + "</span>" +
        '<div class="fund-txt"><b>' + escaparTexto(d.name) + "</b>" +
          "<span>3 " + RARS[a.rar].name.toLowerCase() + " → 1 " + RARS[a.rar + 1].name.toLowerCase() +
          " · você tem " + g.itens.length + "</span></div>" +
        '<button class="mis-btn" data-fundir="' + escaparTexto(g.chave) + '">FUNDIR</button></div>';
    }).join("");
  cx.querySelectorAll("[data-fundir]").forEach(b =>
    b.addEventListener("click", () => {
      const novo = fundir(b.getAttribute("data-fundir"));
      if (novo) {
        const d = amuletDef(novo);
        renderReliquias();
        const av = $("rel-fundir");
        if (av) av.insertAdjacentHTML("afterbegin",
          '<div class="fund-ok">Saiu: <b style="color:' + RARS[novo.rar].color + '">' +
          escaparTexto(d.name) + " (" + RARS[novo.rar].name + ")</b></div>");
      }
    }));
}

/* ---------------------- conjuntos salvos ----------------------
   Três conjuntos: nave + relíquias equipadas, trocados num toque.   */
/* liga o histórico no baú que já existia */
(function () {
  try {
    const antigo = rollAmulet;
    rollAmulet = function () {
      const a = antigo.apply(this, arguments);
      try { bauAnotar(a); } catch (e) {}
      return a;
    };
  } catch (e) {}
})();
function conjuntoSalvar(i) {
  save.conjuntos = save.conjuntos || [null, null, null];
  save.conjuntos[i] = {
    nave: save.ship,
    equipped: (save.equipped || []).slice(),
    arma: (save.weaponSel || {})[save.ship],
    quando: Date.now()
  };
  persist();
  AudioSys.buy(); vibrate(30);
  conjuntosRender();
}
function conjuntoUsar(i) {
  const c = (save.conjuntos || [])[i];
  if (!c) return;
  if ((save.ships || []).indexOf(c.nave) >= 0) save.ship = c.nave;
  save.equipped = (c.equipped || []).filter(uid => save.amulets.some(a => a.uid === uid));
  if (c.arma !== undefined) { save.weaponSel = save.weaponSel || {}; save.weaponSel[c.nave] = c.arma; }
  persist(); calcStats();
  AudioSys.power(); vibrate([25, 35, 45]);
  conjuntosRender();
  if (typeof renderHangar === "function") renderHangar();
}
function conjuntosRender() {
  const cx = $("hangar-conjuntos");
  if (!cx) return;
  save.conjuntos = save.conjuntos || [null, null, null];
  cx.innerHTML =
    '<div class="aj-titulo">🎒 CONJUNTOS</div>' +
    '<div class="conj-grade">' +
      save.conjuntos.map((c, i) => {
        const nome = c ? (SHIPS[c.nave] ? SHIPS[c.nave].name : "Nave") : "vazio";
        return '<div class="conj-cx' + (c ? " tem" : "") + '">' +
          "<b>" + (i + 1) + "</b><span>" + escaparTexto(nome) + "</span>" +
          (c ? "<em>" + (c.equipped || []).length + " relíquias</em>" : "<em>guarde aqui</em>") +
          '<div class="conj-btns">' +
            (c ? '<button class="conj-b usar" data-usar="' + i + '">USAR</button>' : "") +
            '<button class="conj-b" data-salvar="' + i + '">' + (c ? "TROCAR" : "SALVAR") + "</button>" +
          "</div></div>";
      }).join("") +
    "</div>";
  cx.querySelectorAll("[data-usar]").forEach(b =>
    b.addEventListener("click", () => conjuntoUsar(parseInt(b.getAttribute("data-usar"), 10))));
  cx.querySelectorAll("[data-salvar]").forEach(b =>
    b.addEventListener("click", () => conjuntoSalvar(parseInt(b.getAttribute("data-salvar"), 10))));
}

/* ---------------------- comparar as naves ----------------------
   Uma tabela com as 120: dá para ordenar e ver a sua do lado.      */
let navesOrdem = "dano";
function navesRender() {
  const cx = $("comp-corpo");
  if (!cx) return;
  const minha = save.ship;
  const lista = SHIPS.map((s2, i) => ({
    i: i, nome: s2.name,
    dano: Math.round((s2.baseDmg || 1) * 100) / 100,
    vida: s2.baseHp || 100,
    cadencia: Math.round((s2.baseRate || 1) * 100) / 100,
    preco: s2.price || 0,
    tem: (save.ships || []).indexOf(i) >= 0
  }));
  lista.sort((a, b) => {
    if (navesOrdem === "nome") return a.nome.localeCompare(b.nome);
    return (b[navesOrdem] || 0) - (a[navesOrdem] || 0);
  });
  const eu = lista.filter(x => x.i === minha)[0] || lista[0];
  const seta = c => navesOrdem === c ? " ▾" : "";
  cx.innerHTML =
    '<p class="adm-note" style="margin-bottom:10px">Comparando com a sua <b>' +
      escaparTexto(eu.nome) + "</b>. Verde é melhor que a sua, vermelho é pior.</p>" +
    '<div class="comp-abas">' +
      ['<button class="sub-aba' + (navesOrdem === "dano" ? " on" : "") + '" data-ord="dano">DANO' + seta("dano") + "</button>",
       '<button class="sub-aba' + (navesOrdem === "vida" ? " on" : "") + '" data-ord="vida">VIDA' + seta("vida") + "</button>",
       '<button class="sub-aba' + (navesOrdem === "cadencia" ? " on" : "") + '" data-ord="cadencia">CADÊNCIA' + seta("cadencia") + "</button>",
       '<button class="sub-aba' + (navesOrdem === "nome" ? " on" : "") + '" data-ord="nome">NOME</button>'].join("") +
    "</div>" +
    '<div class="comp-rolagem"><table class="comp-tab"><thead><tr>' +
      "<th>NAVE</th><th>DANO</th><th>VIDA</th><th>CAD.</th></tr></thead><tbody>" +
      lista.map(n => {
        const cor = v => v > 0 ? "melhor" : v < 0 ? "pior" : "";
        return "<tr" + (n.i === minha ? ' class="eu"' : n.tem ? ' class="tem"' : "") + ">" +
          "<td>" + (n.tem ? "" : "🔒 ") + escaparTexto(n.nome) + "</td>" +
          '<td class="' + cor(n.dano - eu.dano) + '">' + n.dano + "</td>" +
          '<td class="' + cor(n.vida - eu.vida) + '">' + n.vida + "</td>" +
          '<td class="' + cor(n.cadencia - eu.cadencia) + '">' + (Math.round(n.cadencia * 100) / 100) + "</td>" +
        "</tr>";
      }).join("") +
    "</tbody></table></div>";
  cx.querySelectorAll("[data-ord]").forEach(b =>
    b.addEventListener("click", () => { navesOrdem = b.getAttribute("data-ord"); navesRender(); }));
}
function navesAbrir() { S.mode = "comparar"; showScreen("comparar"); navesRender(); }

/* ---------------------- histórico do baú ---------------------- */
function bauAnotar(a) {
  save.bauHist = save.bauHist || [];
  const d = amuletDef(a);
  save.bauHist.unshift({ nome: d.name, rar: a.rar, quando: Date.now() });
  if (save.bauHist.length > 30) save.bauHist.length = 30;
}
function bauHistRender() {
  const cx = $("rel-historico");
  if (!cx) return;
  const h = save.bauHist || [];
  if (!h.length) { cx.style.display = "none"; return; }
  const conta = [0, 0, 0, 0];
  for (const x of h) conta[x.rar]++;
  cx.style.display = "block";
  cx.innerHTML =
    '<div class="aj-titulo">📜 O QUE SAIU DOS ÚLTIMOS BAÚS</div>' +
    '<div class="bau-resumo">' +
      RARS.map((r, i) => '<span style="color:' + r.color + '">' + conta[i] + " " + r.name.toLowerCase() + "</span>").join(" · ") +
    "</div>" +
    '<div class="bau-lista">' +
      h.slice(0, 12).map(x =>
        '<div class="bau-item"><span style="color:' + RARS[x.rar].color + '">◈</span>' +
        "<b>" + escaparTexto(x.nome) + "</b><em>" + RARS[x.rar].name + "</em></div>").join("") +
    "</div>";
}

/* ---------------------- falta pouco para... ----------------------
   Diz o que está mais perto de acontecer: é o motivo de jogar mais
   uma partida.                                                     */
function faltaPouco() {
  const opcoes = [];
  /* nave de cristal mais perto do seu bolso */
  try {
    for (let i = 0; i < SHIPS.length; i++) {
      if ((save.ships || []).indexOf(i) >= 0) continue;
      const preco = SHIPS[i].price || 0;
      if (!preco) continue;
      const falta = preco - save.crystals;
      if (falta > 0) opcoes.push({ falta: falta, txt: "◆ " + fmt(falta) + " para a nave " + SHIPS[i].name });
    }
  } catch (e) {}
  /* próxima conquista */
  for (const c of CONQUISTAS) {
    const e = conqEstado(c);
    if (e.pronto) continue;
    const falta = c.alvo - e.valor;
    opcoes.push({ falta: falta * 30, txt: fmt(falta) + " para a conquista “" + c.nome + "”" });
  }
  /* próximo baú */
  const b = precoDoBau() - save.crystals;
  if (b > 0) opcoes.push({ falta: b, txt: "◆ " + fmt(b) + " para abrir um baú estelar" });
  opcoes.sort((x, y) => x.falta - y.falta);
  return opcoes.slice(0, 3);
}
function faltaRender() {
  const cx = $("falta-pouco");
  if (!cx) return;
  const l = faltaPouco();
  if (!l.length) { cx.style.display = "none"; return; }
  cx.style.display = "block";
  cx.className = "falta";
  cx.innerHTML = "<b>FALTA POUCO</b>" + l.map(x => "<span>" + escaparTexto(x.txt) + "</span>").join("");
}

/* ---------------------- reespecializar a árvore ---------------------- */
function arvoreCustoZerar() {
  const gastos = ptsSpent();
  return Math.max(300, gastos * 120);
}
function arvoreZerar() {
  const custo = arvoreCustoZerar();
  if (save.crystals < custo) return { ok: false, msg: "Faltam ◆ " + fmt(custo - save.crystals) + "." };
  save.crystals -= custo;
  save.skills = {};
  persist(); calcStats();
  AudioSys.power(); vibrate([40, 50, 80]);
  return { ok: true, msg: "Árvore zerada. Os " + save.pts + " pontos voltaram." };
}

/* ---------------------- pular a fase depois de apanhar ---------------------- */
function pularCusto() { return 400 + (S.fase || 1) * 12; }
function podePular() { return (S.derrotasSeguidas || 0) >= 5; }
function pularFase() {
  const custo = pularCusto();
  if (save.crystals < custo) return false;
  save.crystals -= custo;
  save.best = Math.max(save.best || 0, S.fase);
  save.pts++;
  S.derrotasSeguidas = 0;
  persist(); calcStats();
  AudioSys.buy();
  goMenu();
  return true;
}

/* ---------------------- prestígio ----------------------
   Terminou as 270? Recomeça com um bônus que fica para sempre.     */
function prestigioPronto() { return (save.best || 0) >= TOTAL_FASES; }
function prestigioNivel() { return save.prestigio || 0; }
function prestigioBonus() { return prestigioNivel() * 10; }   // +10% por volta
function prestigioFazer() {
  if (!prestigioPronto()) return { ok: false, msg: "Termine as " + TOTAL_FASES + " fases primeiro." };
  save.prestigio = prestigioNivel() + 1;
  save.best = 0;
  save.estrelas = {};
  save.crystals += 5000;
  persist(); calcStats();
  AudioSys.victory(); vibrate([60, 60, 120]);
  return { ok: true, msg: "Volta " + save.prestigio + "! +" + prestigioBonus() +
           "% de dano e de cristais para sempre, e 5.000 de bônus." };
}
function prestigioRender() {
  const cx = $("perf-prestigio");
  if (!cx) return;
  if (!prestigioPronto() && !prestigioNivel()) { cx.style.display = "none"; return; }
  cx.style.display = "block";
  cx.className = "card";
  cx.innerHTML =
    '<div class="aj-titulo">♾ PRESTÍGIO</div>' +
    (prestigioNivel() ? "<p class=\"adm-note\">Você está na <b>volta " + prestigioNivel() +
      "</b>: +" + prestigioBonus() + "% de dano e de cristais para sempre.</p>" : "") +
    (prestigioPronto()
      ? '<p class="adm-note" style="margin:8px 0">Recomeçar as 270 fases guarda as naves, as relíquias e as ' +
        "conquistas — só o número da fase volta ao começo. Em troca, +10% de dano e de cristais " +
        "para sempre e 5.000 cristais.</p>" +
        '<button class="big-btn amber" id="prest-ir" style="width:100%">RECOMEÇAR A JORNADA</button>'
      : "");
  const b = $("prest-ir");
  if (b) b.addEventListener("click", () => {
    const r = prestigioFazer();
    perfilRender();
    const av = $("perf-prestigio");
    if (av) av.insertAdjacentHTML("beforeend", '<div class="fund-ok">' + escaparTexto(r.msg) + "</div>");
  });
}


/* =====================================================================
   v6.3 — MODOS E FASES COM CARA PRÓPRIA
   regras malucas · maratona de chefes · asteroides · fase secreta
   ===================================================================== */

/* ---------------------- regras malucas ----------------------
   A cada 10 fases (nas terminadas em 5) o jogo muda uma regra. Sempre
   a mesma regra para a mesma fase, para os amigos compararem.        */
const REGRAS = [
  { id: "gravidade", nome: "GRAVIDADE",  desc: "sua nave é puxada para baixo o tempo todo", premio: 1.4 },
  { id: "escuro",    nome: "APAGÃO",     desc: "só enxerga perto da nave", premio: 1.5 },
  { id: "turbo",     nome: "TURBO",      desc: "tudo 40% mais rápido, inclusive você", premio: 1.5 },
  { id: "fragil",    nome: "VIDRO",      desc: "um toque e acabou — mas paga o dobro", premio: 2.0 },
  { id: "enxame",    nome: "ENXAME",     desc: "o dobro de inimigos, cada um com metade da vida", premio: 1.4 },
  { id: "pesado",    nome: "CHUMBO",     desc: "inimigos com o dobro de vida e mais lentos", premio: 1.6 },
  { id: "rebote",    nome: "REBOTE",     desc: "os tiros inimigos quicam nas paredes", premio: 1.6 },
  { id: "asteroide", nome: "CINTURÃO",   desc: "campo de asteroides: dá para destruir e eles soltam cristal", premio: 1.3 }
];
function regraDaFase(fase) {
  /* as terminadas em 5 são de chefe (chefe é de 5 em 5): a regra maluca
     ia cair justo em cima delas, empilhando duas coisas difíceis. Ela
     mora nas terminadas em 8, que são de combate normal.              */
  if (!fase || fase % 10 !== 8) return null;
  const r = rngDe(((fase * 374761393) ^ 0x2f1b) >>> 0);
  return REGRAS[Math.floor(r() * REGRAS.length)];
}
function regraAtiva(id) {
  return !!(S.regra && S.regra.id === id);
}
function regraAplicar(fase) {
  S.regra = regraDaFase(fase);
  document.body.classList.toggle("escuro", regraAtiva("escuro"));
  if (!S.regra) return;
  S.banner = { text: "⚡ " + S.regra.nome, sub: S.regra.desc, t: 3.2 };
  try { AudioSys.bossAlert(); } catch (e) {}
}
/* quanto a fase paga a mais por causa da regra */
function regraPremio() { return S.regra ? S.regra.premio : 1; }

/* ---------------------- asteroides ----------------------
   Pedra que não atira: bloqueia o seu tiro, dá para quebrar e solta
   cristal. Serve à regra CINTURÃO e às fases de perseguição.        */
const ASTEROIDES = [];
function asteroideNovo() {
  const r = rand(16, 34);
  ASTEROIDES.push({
    x: rand(r, W - r), y: -r - 10, r: r,
    vy: rand(40, 95), vx: rand(-25, 25),
    hp: Math.round(r / 4), maxHp: Math.round(r / 4),
    ang: rand(0, 6.28), giro: rand(-1.2, 1.2),
    lados: Math.floor(rand(6, 9))
  });
}
function asteroidesPassar(dt) {
  if (regraAtiva("asteroide") && S.mode === "playing") {
    S.astTimer = (S.astTimer || 0) - dt;
    if (S.astTimer <= 0 && ASTEROIDES.length < 9) {
      S.astTimer = rand(0.7, 1.6);
      asteroideNovo();
    }
  }
  for (let i = ASTEROIDES.length - 1; i >= 0; i--) {
    const a = ASTEROIDES[i];
    a.y += a.vy * dt; a.x += a.vx * dt;
    a.ang += a.giro * dt;
    if (a.x < a.r || a.x > W - a.r) a.vx *= -1;
    if (a.y > H + a.r + 20) { ASTEROIDES.splice(i, 1); continue; }
    /* bate na nave */
    if (player.alive && dist2(a.x, a.y, player.x, player.y) < (a.r + player.r) * (a.r + player.r)) {
      hitPlayer();
      asteroideQuebrar(i);
      continue;
    }
    /* leva tiro */
    for (let j = bullets.length - 1; j >= 0; j--) {
      const b = bullets[j];
      if (dist2(b.x, b.y, a.x, a.y) < (a.r + b.r) * (a.r + b.r)) {
        bullets.splice(j, 1);
        a.hp--;
        destrocos(b.x, b.y, "#9FB0CC", 2);
        if (a.hp <= 0) { asteroideQuebrar(i); break; }
      }
    }
  }
}
function asteroideQuebrar(i) {
  const a = ASTEROIDES[i];
  if (!a) return;
  ASTEROIDES.splice(i, 1);
  explosion(a.x, a.y, "#9FB0CC", 14);
  destrocos(a.x, a.y, "#B9C6E4", 8);
  try { AudioSys.explode(); } catch (e) {}
  S.shake = Math.max(S.shake || 0, 4);
  /* pedra grande solta cristal */
  if (a.r > 22) { S.runGems = (S.runGems || 0) + 3; addText(a.x, a.y, "+3 ◆", "#FFC145"); }
}
function drawAsteroides() {
  if (!ASTEROIDES.length) return;
  ctx.save();
  for (const a of ASTEROIDES) {
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.ang);
    ctx.fillStyle = "#5A6478";
    ctx.strokeStyle = a.hp < a.maxHp ? "#FF8A8A" : "#9FB0CC";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let k = 0; k < a.lados; k++) {
      const ang = (k / a.lados) * TAU;
      const rr = a.r * (0.78 + ((k * 37) % 10) / 40);
      const x = Math.cos(ang) * rr, y = Math.sin(ang) * rr;
      if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

/* ---------------------- maratona de chefes ----------------------
   Cinco chefes em fila, sem ondas no meio. O prêmio cresce a cada um.  */
function bossRushComecar() {
  S.bossRush = { n: 0, total: 5, pontos: 0 };
  const fases = [];
  for (let f = 10; f <= TOTAL_FASES; f += 10) if (f <= Math.max(10, save.best || 10)) fases.push(f);
  S.bossRushFases = fases.length >= 5 ? embaralhar(fases).slice(0, 5) : [10, 20, 30, 40, 50];
  startGame(S.bossRushFases[0]);
  S.soChefe = true;
  S.waveIdx = S.nWaves;
  setupWave();
  S.banner = { text: "MARATONA DE CHEFES", sub: "5 chefes seguidos — sem descanso", t: 3 };
}
function embaralhar(v) {
  const a = v.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
/* chamada quando um chefe cai dentro da maratona */
function bossRushProximo() {
  if (!S.bossRush) return false;
  S.bossRush.n++;
  S.bossRush.pontos += S.score;
  if (S.bossRush.n >= S.bossRush.total) return bossRushTerminar();
  /* próximo chefe, sem sair da partida */
  const prox = S.bossRushFases[S.bossRush.n];
  S.fase = prox;
  S.nWaves = faseWaves(prox);
  S.waveIdx = S.nWaves;
  boss = null;
  enemyBullets.length = 0;
  bullets.length = 0;
  ASTEROIDES.length = 0;
  player.hp = Math.min(ST.maxHp, player.hp + ST.maxHp * 0.35);
  player.alive = true;
  player.invuln = 2;
  /* =================================================================
     ISTO AQUI É O QUE FALTAVA E DEIXAVA A TELA PRETA
     -----------------------------------------------------------------
     Quem chama esta função é o faseVictory, e a PRIMEIRA linha dele já
     pôs o jogo em "victory". Como aqui a gente volta para a luta sem
     passar pela tela de vitória, era preciso desfazer isso: sem o modo
     "playing" de volta, o laço para de atualizar e de desenhar — o
     jogo não travava, ele estava rodando atrás de uma tela que ninguém
     mandou aparecer.
     ================================================================= */
  S.mode = "playing";
  showScreen(null);
  try { Musica.tocar(S.fase, true); } catch (e) {}
  S.banner = { text: "CHEFE " + (S.bossRush.n + 1) + " DE " + S.bossRush.total,
               sub: "+35% de casco de volta", t: 2.2 };
  setupWave();
  updateHud();
  return true;
}
/* fim da maratona: mostra a tela de vitória de verdade, com o resultado */
function bossRushTerminar() {
  const r = S.bossRush;
  const premio = Math.round(800 + (r.pontos || 0) / 20);
  save.crystals += premio;
  if ((r.pontos || 0) > (save.bossRushRec || 0)) save.bossRushRec = r.pontos;
  persist();
  try { nuvemEnviar(true); } catch (e) {}
  S.bossRush = null;
  S.soChefe = false;
  S.mode = "victory";
  try { Musica.parar(); } catch (e) {}
  try { AudioSys.victory(); vibrate([60, 60, 120]); } catch (e) {}
  $("vic-title").textContent = "MARATONA VENCIDA";
  $("vic-fase").textContent = r.total + "/" + r.total;
  $("vic-score").textContent = fmt(r.pontos || 0);
  $("vic-gems").textContent = "+" + fmt(premio) + " cristais";
  $("vic-skill").style.display = "none";
  const va = $("vic-amulet");
  if (va) va.style.display = "none";
  const est = $("vic-estrelas");
  if (est) est.innerHTML = "";
  const nota = $("vic-estrelas-nota");
  if (nota) nota.textContent = r.total + " chefes seguidos, sem sair da partida";
  const resumo = $("vic-resumo");
  if (resumo) resumo.innerHTML = "";
  $("btn-next").style.display = "none";
  showScreen("victory");
  return true;
}

