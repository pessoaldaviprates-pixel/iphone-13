/* ---------------------- fase secreta ----------------------
   Um portal raro aparece no fim de uma onda. Entrar leva a uma fase
   curtinha só de cristais.                                          */
function portalTalvez() {
  if (S.portal || S.naSecreta || S.bossRush) return;
  if (Math.random() > 0.06) return;            // 6% por onda terminada
  S.portal = { x: rand(60, W - 60), y: rand(H * 0.25, H * 0.5), t: 0, vivo: 9 };
  S.banner = { text: "✦ PORTAL ABERTO", sub: "entre nele antes de sumir", t: 2.4 };
  try { AudioSys.power(); } catch (e) {}
}
function portalPassar(dt) {
  if (!S.portal) return;
  S.portal.t += dt;
  S.portal.vivo -= dt;
  if (S.portal.vivo <= 0) { S.portal = null; return; }
  if (player.alive && dist2(player.x, player.y, S.portal.x, S.portal.y) < 46 * 46) {
    S.portal = null;
    secretaEntrar();
  }
}
function drawPortal() {
  if (!S.portal) return;
  const p = S.portal;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.t * 1.6);
  for (let k = 0; k < 3; k++) {
    ctx.globalAlpha = 0.5 + Math.sin(p.t * 4 + k) * 0.3;
    ctx.strokeStyle = k === 1 ? "#C34DFF" : "#5EE6FF";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 20 + k * 9, k * 1.4, k * 1.4 + 4.2);
    ctx.stroke();
  }
  ctx.restore();
}
function secretaEntrar() {
  S.naSecreta = true;
  S.secretaT = 18;
  S.secretaGemas = 0;
  enemies.length = 0; enemyBullets.length = 0; boss = null;
  ASTEROIDES.length = 0;
  S.banner = { text: "SALA SECRETA", sub: "18 segundos para juntar tudo", t: 2.6 };
  try { AudioSys.victory(); } catch (e) {}
  /* enche a tela de cristais */
  for (let i = 0; i < 40; i++) {
    powerups.push({ x: rand(30, W - 30), y: rand(60, H * 0.72), type: "gem",
                    t: 0, vy: rand(10, 30), r: 11 });
  }
}
function secretaPassar(dt) {
  if (!S.naSecreta) return;
  S.secretaT -= dt;
  if (S.secretaT <= 0) {
    S.naSecreta = false;
    S.banner = { text: "DE VOLTA", sub: "+" + fmt(S.secretaGemas || 0) + " cristais na mochila", t: 2.2 };
    powerups.length = 0;
  }
}


/* =====================================================================
   v6.4 — MULTIJOGADOR
   reconectar sozinho · ping do parceiro · convite por link · reviver o
   parceiro · emotes rápidos · revanche num toque · últimos jogadores
   ===================================================================== */

/* ---------------------- reconectar sozinho ----------------------
   A internet do celular cai o tempo todo. Antes disso derrubava a
   partida; agora o jogo avisa, tenta voltar sozinho por 30 segundos e
   só desiste se realmente não voltar.                                */
const RECON = { tentando: false, desde: 0, tentativas: 0, timer: null };
function conexaoCaiu() {
  return MP.sala && MP.ultimoOk && (Date.now() - MP.ultimoOk > 4000);
}
function reconMostrar(estado, texto) {
  const el = $("recon-faixa");
  if (!el) return;
  el.className = estado ? "on " + estado : "";
  el.textContent = texto || "";
}
function reconComecar() {
  if (RECON.tentando || !MP.sala) return;
  RECON.tentando = true;
  RECON.desde = Date.now();
  RECON.tentativas = 0;
  reconMostrar("aviso", "⚠ Conexão instável — tentando voltar…");
  try { AudioSys.deny(); } catch (e) {}
  RECON.timer = setInterval(reconTentar, 2000);
}
async function reconTentar() {
  if (!MP.sala) { reconParar(); return; }
  RECON.tentativas++;
  const passou = Date.now() - RECON.desde;
  if (passou > 30000) {
    reconMostrar("ruim", "Não deu para voltar. Saindo da sala…");
    setTimeout(() => { reconParar(); try { mpSair(true); } catch (e) {} }, 1800);
    return;
  }
  reconMostrar("aviso", "⚠ Tentando voltar… (" + Math.round((30000 - passou) / 1000) + "s)");
  try {
    /* uma leitura simples é o bastante para saber se a sala responde */
    const sala = await nuvemReq(mpCaminho() + "/estado");
    if (sala !== null && sala !== undefined) {
      MP.ultimoOk = Date.now();
      /* volta a anunciar a minha posição na sala */
      try { await mpEnviarPosicao(); } catch (e) {}
      try { p2pTentarDeNovo(); } catch (e) {}
      reconMostrar("bom", "✓ De volta!");
      setTimeout(() => reconMostrar(null), 1800);
      reconParar();
    }
  } catch (e) {}
}
function reconParar() {
  RECON.tentando = false;
  if (RECON.timer) clearInterval(RECON.timer);
  RECON.timer = null;
}
/* roda junto com o jogo: percebe a queda sem gastar rede */
function reconConferir() {
  if (!MP.sala || S.mode !== "playing") { if (RECON.tentando) reconParar(); return; }
  if (conexaoCaiu() && !RECON.tentando) reconComecar();
}

/* ---------------------- ping do parceiro ---------------------- */
function pingDoParceiro() {
  try {
    if (P2P.ligado && P2P.ping) return Math.round(P2P.ping);
    const o = mpOutroPrincipal && mpOutroPrincipal();
    if (o && o.ts) return Math.max(0, Math.round(Date.now() - o.ts));
  } catch (e) {}
  return null;
}
function pingRender() {
  const el = $("mp-ping");
  if (!el) return;
  if (!MP.sala || S.mode !== "playing") { el.className = ""; return; }
  const p = pingDoParceiro();
  if (p === null) { el.className = ""; return; }
  el.className = "on " + (p < 120 ? "bom" : p < 300 ? "meio" : "ruim");
  el.textContent = (P2P.ligado ? "direto " : "nuvem ") + p + " ms";
}

/* ---------------------- reviver o parceiro ----------------------
   No cooperativo, se o parceiro cair você tem 10 segundos para chegar
   perto e segurar. É o que faz as pessoas jogarem juntas de verdade. */
function parceiroCaido() {
  if (!mpCoop || !mpCoop()) return null;
  for (const id in MP.outros) {
    const o = MP.outros[id];
    if (o && o.vivo === false && (o.caiuEm || 0) > Date.now() - 12000) return o;
  }
  return null;
}
function reviverPassar(dt) {
  const o = parceiroCaido();
  const el = $("reviver-aviso");
  if (!o) {
    S.revivendo = 0;
    if (el) el.className = "";
    return;
  }
  const perto = player.alive && o.x !== undefined &&
                dist2(player.x, player.y, o.x, o.y) < 90 * 90;
  if (perto) {
    S.revivendo = (S.revivendo || 0) + dt;
    if (el) {
      el.className = "on";
      el.innerHTML = "<b>REVIVENDO…</b><span>segure perto do parceiro</span>" +
        '<div class="rev-barra"><i style="width:' + Math.min(100, S.revivendo / 2.5 * 100) + '%"></i></div>';
    }
    if (S.revivendo >= 2.5) {
      S.revivendo = 0;
      mpAvisarReviver(o);
      if (el) el.className = "";
    }
  } else {
    S.revivendo = Math.max(0, (S.revivendo || 0) - dt * 2);
    if (el) {
      el.className = "on longe";
      el.innerHTML = "<b>PARCEIRO CAIU</b><span>chegue perto para reviver</span>";
    }
  }
}
function mpAvisarReviver(o) {
  try {
    o.vivo = true; o.caiuEm = 0;
    mpAvisarPoder && mpAvisarPoder("reviver");
    p2pEnviar && p2pEnviar("v1", true);
    addText(player.x, player.y - 40, "PARCEIRO DE VOLTA!", "#63F5B5");
    AudioSys.power(); vibrate([40, 50, 90]);
  } catch (e) {}
}
/* quando o OUTRO me revive */
function fuiRevivido() {
  if (player.alive) return;
  player.alive = true;
  player.lives = Math.max(1, player.lives);
  player.hp = ST.maxHp * 0.6;
  player.invuln = 2.5;
  player.deadTimer = 0;
  addText(player.x, player.y - 40, "DE PÉ!", "#63F5B5");
  try { AudioSys.power(); vibrate([60, 40, 90]); } catch (e) {}
}

/* ---------------------- emotes rápidos ---------------------- */
const EMOTES = [
  { id: "ok",    txt: "👍", nome: "beleza" },
  { id: "cuida", txt: "⚠", nome: "cuidado" },
  { id: "vem",   txt: "🫵", nome: "vem cá" },
  { id: "boa",   txt: "🔥", nome: "boa!" },
  { id: "ajuda", txt: "🆘", nome: "socorro" },
  { id: "rir",   txt: "😂", nome: "kkkk" }
];
function emoteMandar(id) {
  const e = EMOTES.filter(x => x.id === id)[0];
  if (!e) return;
  emoteMostrar(e.txt, true);
  try {
    p2pEnviar && p2pEnviar("m" + id, true);
    if (MP.sala) nuvemSoltar(mpCaminho() + "/emote/" + MP.eu, { id: id, quando: Date.now() });
  } catch (er) {}
}
function emoteMostrar(txt, meu) {
  const cx = $("emote-bolhas");
  if (!cx) return;
  const b = document.createElement("div");
  b.className = "emote-bolha" + (meu ? " meu" : "");
  b.textContent = txt;
  cx.appendChild(b);
  setTimeout(() => { try { cx.removeChild(b); } catch (e) {} }, 2600);
  try { AudioSys.gem(); } catch (e) {}
}
function emoteRecebido(id) {
  const e = EMOTES.filter(x => x.id === id)[0];
  if (e) emoteMostrar(e.txt, false);
}
function emotesRender() {
  const cx = $("emote-btns");
  if (!cx) return;
  if (cx.dataset.pronto) return;
  cx.dataset.pronto = "1";
  cx.innerHTML = EMOTES.map(e =>
    '<button class="emote-b" data-emote="' + e.id + '" title="' + e.nome + '">' + e.txt + "</button>").join("");
  cx.querySelectorAll("[data-emote]").forEach(b =>
    b.addEventListener("click", ev => { ev.stopPropagation(); emoteMandar(b.getAttribute("data-emote")); }));
}
function emotesVisiveis(ligado) {
  const cx = $("emote-caixa");
  if (cx) cx.className = ligado ? "on" : "";
  if (ligado) emotesRender();
}

/* ---------------------- convite por link ---------------------- */
function linkDaSala(codigo, modo) {
  const base = (location.origin + location.pathname).replace(/index\.html$/, "");
  return base + "?sala=" + encodeURIComponent(codigo) + "&modo=" + (modo || "coop");
}
function salaDoLink() {
  try {
    const m = /[?&]sala=([^&]+)/.exec(location.search);
    if (!m) return null;
    const mo = /[?&]modo=([^&]+)/.exec(location.search);
    return { codigo: decodeURIComponent(m[1]), modo: mo ? decodeURIComponent(mo[1]) : "coop" };
  } catch (e) { return null; }
}
async function copiarConviteDaSala(codigo, modo, btn) {
  const txt = "Bora jogar Neon Nebula comigo! Entra aqui: " + linkDaSala(codigo, modo);
  try { await navigator.clipboard.writeText(txt); if (btn) btn.textContent = "✓ CONVITE COPIADO"; }
  catch (e) { if (btn) btn.textContent = "Copie: " + codigo; }
}

/* ---------------------- últimos com quem você jogou ---------------------- */
function anotarParceiro(nome, tag) {
  if (!nome) return;
  save.ultimos = save.ultimos || [];
  save.ultimos = save.ultimos.filter(x => nickSimples(x.nome) !== nickSimples(nome));
  save.ultimos.unshift({ nome: nome, tag: tag || nome, quando: Date.now() });
  if (save.ultimos.length > 8) save.ultimos.length = 8;
  persist();
}
function ultimosRender() {
  const cx = $("amigos-ultimos");
  if (!cx) return;
  const l = save.ultimos || [];
  if (!l.length) { cx.style.display = "none"; return; }
  cx.style.display = "block";
  cx.innerHTML =
    '<div class="aj-titulo">🕹 JOGOU COM ELES HÁ POUCO</div>' +
    l.map(u => '<div class="ult-linha"><b>' + escaparTexto(u.tag || u.nome) + "</b>" +
      '<button class="mis-btn" data-ult="' + escaparTexto(u.nome) + '">+ AMIGO</button></div>').join("");
  cx.querySelectorAll("[data-ult]").forEach(b =>
    b.addEventListener("click", async () => {
      b.disabled = true; b.textContent = "…";
      const r = await amigoPedir(b.getAttribute("data-ult"));
      b.textContent = r.ok ? "✓" : "erro";
    }));
}

/* ---------------------- revanche num toque ---------------------- */
function revancheRender(codigo, modo) {
  const cx = $("revanche-caixa");
  if (!cx) return;
  if (!codigo) { cx.className = ""; return; }
  cx.className = "on";
  cx.innerHTML =
    '<button class="big-btn" id="revanche-ir" style="width:100%">↻ REVANCHE</button>' +
    '<div class="adm-note" style="text-align:center;margin-top:6px">mesma sala, mesma dupla</div>';
  const b = $("revanche-ir");
  if (b) b.addEventListener("click", async () => {
    b.disabled = true; b.textContent = "ENTRANDO…";
    try { await mpEntrarSala(codigo, modo); } catch (e) {}
  });
}


/* =====================================================================
   v6.4 — RANQUEADA JUSTA
   temporadas · pareamento por elo que alarga · anti-trapaça · denunciar
   e bloquear · filtro de nome e de chat · histórico de partidas
   ===================================================================== */

/* ---------------------- temporadas ----------------------
   Cada temporada dura 30 dias, começando sempre no dia 1. No fim, quem
   passou de Prata leva prêmio e o elo encolhe em vez de zerar.        */
function temporadaAtual() {
  const d = new Date();
  return d.getFullYear() * 100 + (d.getMonth() + 1);
}
function temporadaNome(t) {
  const ano = Math.floor((t || temporadaAtual()) / 100);
  const mes = (t || temporadaAtual()) % 100;
  const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho",
                 "agosto", "setembro", "outubro", "novembro", "dezembro"];
  return (MESES[mes - 1] || "") + " de " + ano;
}
function diasQueFaltamNaTemporada() {
  const d = new Date();
  const fim = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return Math.max(0, Math.ceil((fim - d) / 86400000));
}
/* chamada quando o jogo abre e quando a ranqueada abre */
function temporadaConferir() {
  const t = temporadaAtual();
  if (!save.temporada) { save.temporada = t; persist(); return null; }
  if (save.temporada === t) return null;
  /* virou o mês: guarda o resultado e encolhe o elo */
  const eloAntes = save.rank || 0;
  const premio = eloAntes >= 1000 ? 4000 : eloAntes >= 600 ? 2000 : eloAntes >= 250 ? 800 : 0;
  save.historicoTemporadas = save.historicoTemporadas || [];
  save.historicoTemporadas.unshift({
    temporada: save.temporada, elo: eloAntes, rank: nomeDoRank(eloAntes),
    vitorias: save.vitorias || 0, derrotas: save.derrotas || 0, premio: premio
  });
  if (save.historicoTemporadas.length > 12) save.historicoTemporadas.length = 12;
  /* o elo cai pela metade da distância até o bronze, nunca zera */
  save.rank = Math.round(eloAntes * 0.45);
  save.vitorias = 0; save.derrotas = 0;
  save.crystals += premio;
  save.temporada = t;
  persist();
  try { nuvemEnviar(true); } catch (e) {}
  return { eloAntes: eloAntes, premio: premio, novoElo: save.rank };
}
function temporadaRender() {
  const cx = $("rk-temporada");
  if (!cx) return;
  const r = temporadaConferir();
  cx.innerHTML =
    '<div class="temp-topo"><b>TEMPORADA DE ' + temporadaNome().toUpperCase() + "</b>" +
      "<span>" + diasQueFaltamNaTemporada() + " dias para acabar</span></div>" +
    '<div class="temp-premios">' +
      '<span class="temp-p">Prata ◆ 800</span>' +
      '<span class="temp-p">Ouro ◆ 2.000</span>' +
      '<span class="temp-p ouro">Platina+ ◆ 4.000</span>' +
    "</div>" +
    (r ? '<div class="fund-ok">Temporada passada: ' + escaparTexto(nomeDoRank(r.eloAntes)) +
         " · prêmio ◆ " + fmt(r.premio) + "</div>" : "") +
    ((save.historicoTemporadas || []).length
      ? '<div class="temp-hist">' + save.historicoTemporadas.slice(0, 3).map(h =>
          "<span>" + escaparTexto(temporadaNome(h.temporada)) + ": " + escaparTexto(h.rank) +
          " · " + h.vitorias + "V " + h.derrotas + "D</span>").join("") + "</div>"
      : "");
}

/* ---------------------- pareamento que alarga ----------------------
   Começa procurando gente do seu nível e vai aceitando cada vez mais
   longe, para ninguém ficar preso na fila.                            */
function janelaDeElo(segundosNaFila) {
  const s = Math.max(0, segundosNaFila || 0);
  if (s < 10) return 150;
  if (s < 25) return 350;
  if (s < 45) return 700;
  if (s < 70) return 1400;
  return 99999;                     // depois de 70s, qualquer um serve
}

/* ---------------------- anti-trapaça ----------------------
   O jogo é do lado do jogador, então não dá para confiar em nada que
   venha de outro aparelho. Isto não resolve tudo: só barra o que é
   impossível de acontecer jogando de verdade.                        */
const LIMITES = {
  pontosPorSegundo: 900,     // acima disso é impossível
  abatesPorSegundo: 22,
  faseMinima: 8,             // uma fase não termina em menos que isso
  eloPorPartida: 60
};
function partidaSuspeita(dados) {
  const d = dados || {};
  const seg = Math.max(1, d.segundos || 0);
  const motivos = [];
  if ((d.pontos || 0) / seg > LIMITES.pontosPorSegundo) motivos.push("pontos rápidos demais");
  if ((d.abates || 0) / seg > LIMITES.abatesPorSegundo) motivos.push("abates rápidos demais");
  if (d.fase && seg < LIMITES.faseMinima) motivos.push("fase terminada rápido demais");
  if (Math.abs(d.elo || 0) > LIMITES.eloPorPartida) motivos.push("variação de elo fora do normal");
  return motivos;
}
/* guarda a suspeita para o painel, sem acusar ninguém na cara */
async function anotarSuspeita(idJogador, nome, motivos, dados) {
  try {
    await nuvemSoltar("suspeitas/" + idJogador + "/" + Date.now().toString(36), {
      nome: nome || "", motivos: motivos.join(", "), quando: Date.now(),
      pontos: dados.pontos || 0, segundos: dados.segundos || 0, abates: dados.abates || 0
    });
  } catch (e) {}
}
/* confere o resultado do duelo antes de valer elo */
function duelaValido(meuResumo, doOutro) {
  const m = partidaSuspeita(meuResumo);
  const o = partidaSuspeita(doOutro);
  return { ok: !o.length, meus: m, dele: o };
}

/* ---------------------- denunciar e bloquear ---------------------- */
async function denunciar(idJogador, nome, motivo) {
  if (!idJogador) return { ok: false, msg: "Não achei essa pessoa." };
  try {
    await nuvemSoltar("denuncias/" + idJogador + "/" + Date.now().toString(36), {
      de: save.__name || "", nome: nome || "", motivo: motivo || "sem motivo",
      quando: Date.now()
    });
    save.denunciei = save.denunciei || [];
    if (save.denunciei.indexOf(idJogador) < 0) save.denunciei.push(idJogador);
    persist();
    return { ok: true, msg: "Denúncia enviada. O desenvolvedor vai olhar." };
  } catch (e) {
    return { ok: false, msg: "Não deu para enviar agora." };
  }
}
function bloquear(idJogador, nome) {
  save.bloqueados = save.bloqueados || {};
  save.bloqueados[idJogador] = { nome: nome || "", quando: Date.now() };
  persist();
  return true;
}
function desbloquear(idJogador) {
  if (save.bloqueados) delete save.bloqueados[idJogador];
  persist();
}
function estaBloqueado(idJogador) {
  return !!(save.bloqueados || {})[idJogador];
}
function bloqueadosRender() {
  const cx = $("amigos-bloqueados");
  if (!cx) return;
  const b = save.bloqueados || {};
  const ids = Object.keys(b);
  if (!ids.length) { cx.style.display = "none"; return; }
  cx.style.display = "block";
  cx.innerHTML =
    '<div class="aj-titulo">🚫 BLOQUEADOS</div>' +
    ids.map(id => '<div class="ult-linha"><b>' + escaparTexto(b[id].nome || id) + "</b>" +
      '<button class="mis-btn" data-desbl="' + escaparTexto(id) + '">DESBLOQUEAR</button></div>').join("");
  cx.querySelectorAll("[data-desbl]").forEach(x =>
    x.addEventListener("click", () => { desbloquear(x.getAttribute("data-desbl")); bloqueadosRender(); }));
}

/* ---------------------- filtro de nome e de chat ----------------------
   Não é censura: é o mínimo para ninguém se passar por administrador
   nem escrever as piores palavras no chat que aparece para crianças.  */
const PALAVRAS_BARRADAS = [
  "adm", "admin", "administrador", "moderador", "staff", "suporte", "oficial",
  "neonnebula", "cr1cket"
];
const XINGAMENTOS = [
  "porra", "caralho", "puta", "merda", "viado", "viadinho", "corno", "buceta",
  "cu", "fdp", "arrombado", "otario", "otário", "retardado", "macaco", "preto nojento",
  "vagabunda", "piranha", "krl", "pqp", "vsf", "cuzao", "cuzão"
];
function textoSimples(t) {
  return String(t || "").toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}
function nomePermitido(nome) {
  const simples = textoSimples(nome);
  if (!simples) return { ok: false, msg: "Escolha um nome com letras." };
  if (simples.length < 2) return { ok: false, msg: "Nome curto demais." };
  for (const p of PALAVRAS_BARRADAS) {
    if (simples.indexOf(p) >= 0 && !contaDeDono(nome)) {
      return { ok: false, msg: "Esse nome parece de administrador. Escolha outro." };
    }
  }
  for (const x of XINGAMENTOS) {
    if (simples.indexOf(textoSimples(x)) >= 0) {
      return { ok: false, msg: "Esse nome tem palavrão. Escolha outro." };
    }
  }
  return { ok: true };
}
/* no chat não recusa a mensagem: troca a palavra por •••, que incomoda
   menos e não deixa a conversa travada */
function limparTexto(t) {
  let saida = String(t || "");
  for (const x of XINGAMENTOS) {
    const re = new RegExp(x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    saida = saida.replace(re, "•".repeat(Math.min(6, x.length)));
  }
  return saida;
}

/* ---------------------- histórico de partidas ---------------------- */
function anotarPartida(res) {
  save.historico = save.historico || [];
  save.historico.unshift({
    quando: Date.now(),
    contra: res.contra || "?",
    resultado: res.resultado || "",
    elo: res.elo || 0,
    pontos: res.pontos || 0
  });
  if (save.historico.length > 30) save.historico.length = 30;
  persist();
}
function historicoRender() {
  const cx = $("rk-historico");
  if (!cx) return;
  const h = save.historico || [];
  if (!h.length) { cx.style.display = "none"; return; }
  cx.style.display = "block";
  const v = h.filter(x => x.resultado === "vitoria").length;
  cx.innerHTML =
    '<div class="aj-titulo">📜 SUAS ÚLTIMAS PARTIDAS</div>' +
    '<div class="hist-resumo">' + v + "V · " + (h.length - v) + "D nas últimas " + h.length + "</div>" +
    h.slice(0, 10).map(x =>
      '<div class="hist-linha ' + escaparTexto(x.resultado) + '">' +
        "<b>" + (x.resultado === "vitoria" ? "VITÓRIA" : x.resultado === "derrota" ? "DERROTA" : "EMPATE") + "</b>" +
        "<span>vs " + escaparTexto(x.contra) + "</span>" +
        "<em>" + (x.elo >= 0 ? "+" : "") + x.elo + "</em>" +
      "</div>").join("");
}


/* =====================================================================
   v6.5 — CONTA E OPERAÇÃO
   recuperar conta · relatório de erros · números do jogo · denúncias no
   painel · modo manutenção · registro do que cada admin fez
   ===================================================================== */

/* ---------------------- recuperar a conta ----------------------
   A senha é um desenho; se a pessoa esquecer, antes não havia saída.
   Agora cada conta ganha um código de 8 letras, guardado no aparelho e
   na nuvem, que destrava o desenho de novo.                          */
function codigoNovo() {
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";   // sem I, O, 0, 1
  let c = "";
  for (let i = 0; i < 8; i++) c += letras[Math.floor(Math.random() * letras.length)];
  return c.slice(0, 4) + "-" + c.slice(4);
}
function meuCodigoDeResgate() {
  if (!save.resgate) {
    save.resgate = codigoNovo();
    persist();
    /* guarda também na nuvem, para valer de outro aparelho */
    try {
      const eu = meuIdNuvem();
      if (eu) nuvemJuntar("pilotos/" + eu, { resgate: save.resgate });
    } catch (e) {}
  }
  return save.resgate;
}
async function resgatarConta(nome, codigo) {
  nome = String(nome || "").trim();
  codigo = String(codigo || "").trim().toUpperCase();
  if (!nome || !codigo) return { ok: false, msg: "Escreva o nome e o código." };
  /* 1) conta que está neste aparelho */
  const local = ROOT.profiles[nome];
  if (local && local.resgate && local.resgate.toUpperCase() === codigo) {
    local.senha = null;
    persist();
    return { ok: true, msg: "Senha apagada. Entre e desenhe uma nova." };
  }
  /* 2) conta que está na nuvem */
  try {
    const achado = await acharPiloto(nome);
    if (achado && achado.p && achado.p.resgate &&
        String(achado.p.resgate).toUpperCase() === codigo) {
      if (local) { local.senha = null; persist(); return { ok: true, msg: "Senha apagada. Entre e desenhe uma nova." }; }
      return { ok: true, msg: "Código certo! Entre com esse nome neste aparelho para recuperar." };
    }
  } catch (e) {}
  return { ok: false, msg: "Nome ou código não conferem." };
}
function resgateRender() {
  const cx = $("aj-resgate");
  if (!cx) return;
  cx.innerHTML =
    '<div class="aj-titulo">🔑 CÓDIGO DE RECUPERAÇÃO</div>' +
    '<p class="adm-note" style="margin-bottom:10px">Se um dia você esquecer o desenho da senha, ' +
    "é este código que devolve a sua conta. Anote num lugar seguro — ele é só seu.</p>" +
    '<div class="conv-cartao"><b id="resgate-cod">' + escaparTexto(meuCodigoDeResgate()) + "</b>" +
      '<button class="pag-copiar" id="resgate-copiar">COPIAR CÓDIGO</button></div>';
  const b = $("resgate-copiar");
  if (b) b.addEventListener("click", async ev => {
    try {
      await navigator.clipboard.writeText("Neon Nebula — conta " + (save.__name || "") +
        " — código de recuperação " + meuCodigoDeResgate());
      ev.currentTarget.textContent = "✓ COPIADO";
    } catch (e) { ev.currentTarget.textContent = meuCodigoDeResgate(); }
  });
}

/* ---------------------- relatório de erros ----------------------
   O erro que estourava no celular do jogador morria lá. Agora ele sobe
   para a nuvem (sem nada pessoal) e aparece no painel.                */
async function mandarErroParaONuvem(texto, origem) {
  try {
    if (!nuvemAtiva()) return;
    const chave = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    await nuvemSoltar("erros/" + chave, {
      msg: String(texto || "").slice(0, 300),
      origem: String(origem || "").slice(0, 120),
      versao: typeof VERSAO !== "undefined" ? VERSAO : "?",
      tela: S.mode || "?",
      fase: S.fase || 0,
      nome: (save && save.__name) || "",
      aparelho: (navigator.userAgent || "").slice(0, 120),
      quando: Date.now()
    });
  } catch (e) {}
}
let admErros = {};
async function admErrosCarregar() {
  admErros = (await nuvemReq("erros")) || {};
  admErrosRender();
}
function admErrosRender() {
  const cx = $("adm-erros-lista");
  if (!cx) return;
  const chaves = Object.keys(admErros).sort((a, b) =>
    (admErros[b].quando || 0) - (admErros[a].quando || 0));
  if (!chaves.length) {
    cx.innerHTML = '<div class="adm-note">Nenhum erro reportado. Boa notícia.</div>';
    return;
  }
  /* agrupa por mensagem: 20 vezes o mesmo erro é UM problema */
  const grupos = {};
  for (const k of chaves) {
    const e = admErros[k];
    const chave = (e.msg || "").slice(0, 80);
    if (!grupos[chave]) grupos[chave] = { n: 0, ex: e, versoes: {} };
    grupos[chave].n++;
    grupos[chave].versoes[e.versao || "?"] = true;
  }
  cx.innerHTML = Object.keys(grupos).slice(0, 20).map(g => {
    const x = grupos[g];
    return '<div class="err-linha"><div class="err-topo"><b>' + escaparTexto(g) + "</b>" +
      '<em class="err-n">' + x.n + "×</em></div>" +
      '<div class="err-meta">' + escaparTexto(x.ex.origem || "") + " · versão " +
      Object.keys(x.versoes).join(", ") + " · tela " + escaparTexto(x.ex.tela || "?") +
      (x.ex.nome ? " · " + escaparTexto(x.ex.nome) : "") + "</div></div>";
  }).join("") +
  '<button class="adm-btn danger wide" id="adm-erros-limpar" style="margin-top:10px">APAGAR TUDO</button>';
  const b = $("adm-erros-limpar");
  if (b) b.addEventListener("click", async () => {
    await nuvemReq("erros", { method: "DELETE" });
    admErros = {};
    admErrosRender();
  });
}

/* ---------------------- números do jogo ----------------------
   Sem isto, toda decisão nossa sobre o jogo é palpite.               */
async function admNumeros() {
  const pilotos = (await nuvemReq("pilotos")) || {};
  const ids = Object.keys(pilotos);
  const agora = Date.now();
  const hoje = ids.filter(id => agora - ((pilotos[id] || {}).quando || 0) < 86400000);
  const semana = ids.filter(id => agora - ((pilotos[id] || {}).quando || 0) < 7 * 86400000);
  /* onde as pessoas param */
  const faixas = { "1-10": 0, "11-30": 0, "31-60": 0, "61-120": 0, "121-270": 0 };
  let somaFase = 0, comFase = 0, somaTempo = 0, comTempo = 0;
  for (const id of ids) {
    const p = pilotos[id] || {};
    const f = p.fase || p.best || 0;
    if (f > 0) {
      comFase++; somaFase += f;
      if (f <= 10) faixas["1-10"]++;
      else if (f <= 30) faixas["11-30"]++;
      else if (f <= 60) faixas["31-60"]++;
      else if (f <= 120) faixas["61-120"]++;
      else faixas["121-270"]++;
    }
    if (p.tempo) { comTempo++; somaTempo += p.tempo; }
  }
  /* versões */
  const versoes = {};
  for (const id of ids) {
    const v = (pilotos[id] || {}).versao || "?";
    versoes[v] = (versoes[v] || 0) + 1;
  }
  return {
    total: ids.length, hoje: hoje.length, semana: semana.length,
    faseMedia: comFase ? Math.round(somaFase / comFase) : 0,
    tempoMedio: comTempo ? Math.round(somaTempo / comTempo) : 0,
    faixas: faixas, versoes: versoes
  };
}
function admNumerosRender(n) {
  const cx = $("adm-numeros-corpo");
  if (!cx) return;
  const maior = Math.max(1, ...Object.keys(n.faixas).map(k => n.faixas[k]));
  cx.innerHTML =
    '<div class="perf-grade">' +
      '<div class="perf-cx"><b>' + fmt(n.total) + "</b><span>PILOTOS</span></div>" +
      '<div class="perf-cx ouro"><b>' + fmt(n.hoje) + "</b><span>HOJE</span></div>" +
      '<div class="perf-cx rosa"><b>' + fmt(n.semana) + "</b><span>NA SEMANA</span></div>" +
      '<div class="perf-cx"><b>' + n.faseMedia + "</b><span>FASE MÉDIA</span></div>" +
      '<div class="perf-cx"><b>' + Math.round(n.tempoMedio / 60) + "min</b><span>TEMPO MÉDIO</span></div>" +
      '<div class="perf-cx"><b>' + Object.keys(n.versoes).length + "</b><span>VERSÕES</span></div>" +
    "</div>" +
    '<div class="aj-titulo" style="margin-top:14px">ONDE AS PESSOAS ESTÃO</div>' +
    Object.keys(n.faixas).map(k =>
      '<div class="num-linha"><span>fase ' + k + "</span>" +
      '<div class="num-barra"><i style="width:' + Math.round(n.faixas[k] / maior * 100) + '%"></i></div>' +
      "<b>" + n.faixas[k] + "</b></div>").join("") +
    '<div class="aj-titulo" style="margin-top:14px">VERSÕES EM USO</div>' +
    Object.keys(n.versoes).sort().map(v =>
      '<div class="num-linha"><span>' + escaparTexto(v) + "</span>" +
      '<div class="num-barra"><i style="width:' + Math.round(n.versoes[v] / Math.max(1, n.total) * 100) +
      '%"></i></div><b>' + n.versoes[v] + "</b></div>").join("");
}

/* ---------------------- denúncias e suspeitas no painel ---------------------- */
async function admDenunciasRender() {
  const cx = $("adm-denuncias-lista");
  if (!cx) return;
  const den = (await nuvemReq("denuncias")) || {};
  const sus = (await nuvemReq("suspeitas")) || {};
  const linhas = [];
  for (const id in den) {
    for (const k in den[id]) {
      const d = den[id][k];
      linhas.push({ tipo: "denuncia", id: id, nome: d.nome || id, de: d.de || "",
                    txt: d.motivo || "", quando: d.quando || 0 });
    }
  }
  for (const id in sus) {
    for (const k in sus[id]) {
      const d = sus[id][k];
      linhas.push({ tipo: "suspeita", id: id, nome: d.nome || id, de: "o jogo",
                    txt: d.motivos || "", quando: d.quando || 0 });
    }
  }
  linhas.sort((a, b) => b.quando - a.quando);
  if (!linhas.length) {
    cx.innerHTML = '<div class="adm-note">Nada por aqui. Ninguém denunciado e nada suspeito.</div>';
    return;
  }
  cx.innerHTML = linhas.slice(0, 30).map(l =>
    '<div class="err-linha ' + l.tipo + '"><div class="err-topo">' +
      "<b>" + escaparTexto(l.nome) + "</b>" +
      '<em class="err-n">' + (l.tipo === "denuncia" ? "denúncia" : "suspeita") + "</em></div>" +
    '<div class="err-meta">' + escaparTexto(l.txt) +
      (l.de ? " · por " + escaparTexto(l.de) : "") + " · " + quandoTexto(l.quando) + "</div></div>").join("") +
  '<button class="adm-btn danger wide" id="adm-den-limpar" style="margin-top:10px">LIMPAR TUDO</button>';
  const b = $("adm-den-limpar");
  if (b) b.addEventListener("click", async () => {
    await nuvemReq("denuncias", { method: "DELETE" });
    await nuvemReq("suspeitas", { method: "DELETE" });
    admDenunciasRender();
  });
}
function quandoTexto(t) {
  if (!t) return "";
  const min = Math.floor((Date.now() - t) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return min + " min atrás";
  const h = Math.floor(min / 60);
  if (h < 24) return h + "h atrás";
  return Math.floor(h / 24) + " dias atrás";
}

/* ---------------------- modo manutenção ---------------------- */
async function manutencaoLigar(ligado, recado) {
  const ok = await nuvemSoltar("mundo/manutencao", ligado
    ? { ligado: true, recado: recado || "Estamos arrumando uma coisa. Volte em alguns minutos.",
        quando: Date.now() }
    : { ligado: false });
  admRegistrar(ligado ? "ligou a manutenção" : "desligou a manutenção");
  return ok !== null;
}
function manutencaoAplicar(m) {
  const el = $("manut-tela");
  if (!el) return;
  const ligado = !!(m && m.ligado) && !contaDeDono(save && save.__name);
  el.className = ligado ? "on" : "";
  if (ligado) {
    el.innerHTML = '<div class="manut-dentro"><div class="manut-ic">🛠</div>' +
      "<b>O jogo está em manutenção</b><span>" +
      escaparTexto((m && m.recado) || "Volte em alguns minutos.") + "</span>" +
      '<button class="ghost-btn" id="manut-tentar">TENTAR DE NOVO</button></div>';
    const b = $("manut-tentar");
    if (b) b.addEventListener("click", () => location.reload());
  }
}

/* ---------------------- registro do que cada admin fez ---------------------- */
async function admRegistrar(oque) {
  try {
    const quem = (PERM && PERM.nick) || (save && save.__name) || "?";
    await nuvemSoltar("registro/" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), {
      quem: quem, oque: String(oque || "").slice(0, 160), quando: Date.now()
    });
  } catch (e) {}
}
async function admRegistroRender() {
  const cx = $("adm-registro-lista");
  if (!cx) return;
  const r = (await nuvemReq("registro")) || {};
  const linhas = Object.keys(r).map(k => r[k]).sort((a, b) => (b.quando || 0) - (a.quando || 0));
  if (!linhas.length) {
    cx.innerHTML = '<div class="adm-note">Nada registrado ainda.</div>';
    return;
  }
  cx.innerHTML = linhas.slice(0, 40).map(l =>
    '<div class="reg-linha"><b>' + escaparTexto(l.quem || "?") + "</b>" +
    "<span>" + escaparTexto(l.oque || "") + "</span>" +
    "<em>" + quandoTexto(l.quando) + "</em></div>").join("");
}


/* =====================================================================
   v6.5 — APRESENTAÇÃO, LOJA E ECONOMIA
   trilha que reage · tela de carregamento com dica · resumo animado da
   vitória · molduras de apelido · presentear amigo · oferta do primeiro
   dia · aviso de VIP acabando · comprovante e cancelar pedido
   ===================================================================== */

/* ---------------------- trilha que reage ao jogo ----------------------
   A música já existia; o que faltava era ela SENTIR o que acontece.
   Agora o volume e o andamento sobem quando o chefe aparece e caem
   quando você está quase morrendo.                                    */
function musicaTensao() {
  try {
    if (!Musica.ganho || S.mode !== "playing") return;
    let alvo = 1;
    if (boss && !boss.entering) alvo = boss.furia ? 1.5 : 1.25;
    const vidaFrac = ST && ST.maxHp ? player.hp / ST.maxHp : 1;
    if (player.alive && vidaFrac < 0.3) alvo *= 0.65;    // quase morrendo: a trilha recua
    if (S.naSecreta) alvo = 0.7;
    const base = 0.16 * ajVol("volMus");
    const atual = Musica.ganho.gain.value;
    Musica.ganho.gain.value = atual + (base * alvo - atual) * 0.05;
  } catch (e) {}
}

/* ---------------------- dica na troca de fase ---------------------- */
const DICAS = [
  "O Enxame ignora escudo: mate os drones primeiro.",
  "Combo alto vale até o dobro de pontos — não pare de atirar.",
  "Passar a fase sem levar dano dá a segunda estrela.",
  "Na fase com APAGÃO, fique perto do centro: dá para ver mais.",
  "Relíquia repetida não é lixo: três iguais viram uma melhor.",
  "Guarde a ultimate para a segunda metade do chefe, quando ele fica em fúria.",
  "Convide um amigo pelo código: vocês dois ganham cristais.",
  "As naves pesadas soltam mais cristal. Mire nelas primeiro.",
  "No cooperativo dá para reviver o parceiro: chegue perto e segure.",
  "Se travar no celular, ligue o modo LEVE na tela de fases.",
  "Terminou as 270? O prestígio dá +10% de dano para sempre.",
  "A linha vermelha mostra onde o tiro do chefe vai passar."
];
function dicaDaVez() {
  return DICAS[Math.floor(Math.random() * DICAS.length)];
}
function carregandoMostrar(fase) {
  const el = $("carregando");
  if (!el) return;
  el.innerHTML =
    '<div class="carr-dentro">' +
      '<div class="carr-fase">FASE ' + fase + "</div>" +
      '<div class="carr-nome">' + escaparTexto(faseNome(fase)) + "</div>" +
      '<div class="carr-barra"><i></i></div>' +
      '<div class="carr-dica">💡 ' + escaparTexto(dicaDaVez()) + "</div>" +
    "</div>";
  el.className = "on";
  setTimeout(() => { el.className = ""; }, 900);
}

/* ---------------------- resumo animado da vitória ----------------------
   Os números sobem um a um, em vez de aparecerem prontos.            */
function contarAte(el, alvo, sufixo, ms) {
  if (!el) return;
  const t0 = performance.now();
  const dur = ms || 700;
  const passo = (agora) => {
    const k = Math.min(1, (agora - t0) / dur);
    const suave = 1 - Math.pow(1 - k, 3);
    el.textContent = fmt(Math.round(alvo * suave)) + (sufixo || "");
    if (k < 1) requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}
function vitoriaResumo(dados) {
  const cx = $("vic-resumo");
  if (!cx) return;
  const pr = dados.tiros > 10 ? Math.round(dados.acertos / dados.tiros * 100) : null;
  cx.innerHTML =
    '<div class="vres-linha"><span>Tempo</span><b id="vres-tempo">0</b></div>' +
    '<div class="vres-linha"><span>Maior combo</span><b id="vres-combo">0</b></div>' +
    (pr === null ? "" : '<div class="vres-linha"><span>Precisão</span><b id="vres-prec">0</b></div>') +
    '<div class="vres-linha"><span>Dano levado</span><b id="vres-dano">0</b></div>';
  setTimeout(() => contarAte($("vres-tempo"), Math.round(dados.segundos), "s"), 120);
  setTimeout(() => contarAte($("vres-combo"), dados.combo, "×"), 260);
  if (pr !== null) setTimeout(() => contarAte($("vres-prec"), pr, "%"), 400);
  setTimeout(() => contarAte($("vres-dano"), dados.dano, dados.dano === 1 ? " vez" : " vezes"), 540);
}

/* ---------------------- molduras de apelido ----------------------
   Cosmético puro, ganho por conquista: é status sem mexer no jogo.   */
const MOLDURAS = [
  { id: "nenhuma", nome: "Sem moldura", req: () => true },
  { id: "bronze",  nome: "Bronze",      req: () => (save.best || 0) >= 10 },
  { id: "prata",   nome: "Prata",       req: () => (save.best || 0) >= 60 },
  { id: "ouro",    nome: "Ouro",        req: () => (save.best || 0) >= 150 },
  { id: "chefe",   nome: "Caçador",     req: () => (save.chefes || 0) >= 25 },
  { id: "estrela", nome: "Constelação", req: () => estrelasTotal() >= 100 },
  { id: "duelo",   nome: "Duelista",    req: () => (save.vitorias || 0) >= 25 },
  { id: "prest",   nome: "Renascido",   req: () => (save.prestigio || 0) >= 1 },
  { id: "dono",    nome: "Criador",     req: () => contaDeDono(save.__name) }
];
function molduraAtual() { return save.moldura || "nenhuma"; }
/* Uma moldura pode ter sido GANHA (a condição bate) ou DADA pelo painel.
   As duas valem, e a conta é feita aqui para a tela de escolha, o painel
   e a nuvem nunca discordarem sobre o que a pessoa tem. */
function molduraLiberada(m) {
  if (!m) return false;
  if ((save.moldurasDadas || []).indexOf(m.id) >= 0) return true;
  try { return !!m.req(); } catch (e) { return false; }
}
/* A moldura de OUTRO jogador vem da nuvem, entao e texto que um estranho
   escreveu. Nunca entra num atributo de classe sem passar por aqui: so
   sai uma moldura que existe de verdade na lista, ou nada. */
function classeDaMoldura(id) {
  const ok = MOLDURAS.some(m => m.id === id && m.id !== "nenhuma");
  return ok ? " mold-" + id : "";
}
/* poe a moldura do proprio jogador num elemento da tela */
function vestirMoldura(el, id) {
  if (!el) return;
  MOLDURAS.forEach(m => el.classList.remove("mold-" + m.id));
  el.classList.add("moldurado");
  const c = classeDaMoldura(id === undefined ? molduraAtual() : id).trim();
  if (c) el.classList.add(c);
}
function molduraUsar(id) {
  const m = MOLDURAS.filter(x => x.id === id)[0];
  if (!m || !molduraLiberada(m)) return false;
  save.moldura = id;
  persist();
  try {
    nuvemEnviar(true);
    refreshMenu();
    vestirMoldura($("menu-hello"));
    vestirMoldura($("perf-nome"));
  } catch (e) {}
  return true;
}
function moldurasRender() {
  const cx = $("perf-molduras");
  if (!cx) return;
  cx.innerHTML =
    '<div class="aj-titulo">🖼 MOLDURA DO APELIDO</div>' +
    '<div class="mold-grade">' +
      MOLDURAS.map(m => {
        const tem = molduraLiberada(m);
        return '<button class="mold-cx mold-' + m.id + (molduraAtual() === m.id ? " on" : "") +
          (tem ? "" : " travada") + '" data-mold="' + m.id + '"' + (tem ? "" : " disabled") + ">" +
          "<span>" + escaparTexto(minhaTag()).slice(0, 8) + "</span>" +
          "<em>" + escaparTexto(m.nome) + "</em></button>";
      }).join("") +
    "</div>";
  cx.querySelectorAll("[data-mold]").forEach(b =>
    b.addEventListener("click", () => { if (molduraUsar(b.getAttribute("data-mold"))) moldurasRender(); }));
}

/* ---------------------- presentear um amigo ----------------------
   Comprar VIP ou passe para OUTRA conta. É o que mais vende em jogo
   de amigos — e usa a entrega que o painel já tinha.                 */
let PRESENTE_ALVO = null;
async function presenteProcurar(nome) {
  const achado = await acharPiloto(nome);
  if (!achado) return { ok: false, msg: "Não achei esse piloto." };
  PRESENTE_ALVO = { id: achado.id, nome: achado.p.nome || nome, tag: achado.p.tag };
  return { ok: true, msg: "Achei: " + PRESENTE_ALVO.nome };
}
function presentearNaLoja(item, nome, preco, extra) {
  if (!PRESENTE_ALVO) return false;
  abrirPagamento(item, nome + " (presente para " + PRESENTE_ALVO.nome + ")", preco,
                 Object.assign({}, extra, { presentePara: PRESENTE_ALVO.id,
                                            presenteNome: PRESENTE_ALVO.nome }));
  return true;
}
function presenteRender() {
  const cx = $("loja-presente");
  if (!cx) return;
  cx.innerHTML =
    '<div class="aj-titulo">🎁 COMPRAR PARA UM AMIGO</div>' +
    '<p class="adm-note" style="margin-bottom:9px">Escreva o nick de quem vai receber. ' +
    "Depois é só escolher o item de sempre: a entrega vai para a conta dele.</p>" +
    '<div class="adm-row"><input id="pres-nome" maxlength="16" placeholder="Nick do amigo" autocomplete="off">' +
    '<button class="adm-btn" id="pres-achar">PROCURAR</button></div>' +
    '<div class="adm-note" id="pres-aviso" style="margin-top:8px">' +
      (PRESENTE_ALVO ? "Comprando para <b>" + escaparTexto(PRESENTE_ALVO.nome) + "</b>" +
        ' · <a href="#" id="pres-limpar">comprar para mim</a>' : "") + "</div>";
  const b = $("pres-achar");
  if (b) b.addEventListener("click", async ev => {
    const bt = ev.currentTarget;
    bt.disabled = true; bt.textContent = "…";
    const r = await presenteProcurar(($("pres-nome") || {}).value);
    bt.disabled = false; bt.textContent = "PROCURAR";
    const av = $("pres-aviso");
    if (av) { av.textContent = r.msg; av.style.color = r.ok ? "var(--verde)" : "var(--danger)"; }
    if (r.ok) setTimeout(presenteRender, 900);
  });
  const l = $("pres-limpar");
  if (l) l.addEventListener("click", ev => { ev.preventDefault(); PRESENTE_ALVO = null; presenteRender(); });
}

/* ---------------------- oferta do primeiro dia ---------------------- */
function ofertaDoInicio() {
  if (!save.desde) return null;
  const horas = (Date.now() - save.desde) / 3600000;
  if (horas > 24 || save.ofertaUsada) return null;
  return { horasQueFaltam: Math.max(0, Math.round(24 - horas)),
           item: "vip:7", nome: "VIP de 7 dias (oferta de estreia)", preco: 0.50, de: 1.00,
           extra: { dias: 7 } };
}
function ofertaRender() {
  const cx = $("loja-oferta");
  if (!cx) return;
  const o = ofertaDoInicio();
  if (!o) { cx.style.display = "none"; return; }
  cx.style.display = "block";
  cx.className = "card oferta";
  cx.innerHTML =
    '<div class="of-selo">SÓ NO PRIMEIRO DIA</div>' +
    "<b>" + escaparTexto(o.nome) + "</b>" +
    '<div class="of-precos"><s>' + reais(o.de) + "</s><b>" + reais(o.preco) + "</b></div>" +
    '<div class="of-tempo">acaba em ' + o.horasQueFaltam + "h</div>" +
    '<button class="big-btn amber" id="of-comprar" style="width:100%;margin-top:10px">QUERO</button>';
  const b = $("of-comprar");
  if (b) b.addEventListener("click", () => {
    save.ofertaUsada = true; persist();
    abrirPagamento(o.item, o.nome, o.preco, o.extra);
  });
}

/* ---------------------- aviso de VIP acabando ---------------------- */
function vipAvisoRender() {
  const cx = $("vip-aviso");
  if (!cx) return;
  /* sem loja de dinheiro não há o que renovar: o aviso viraria propaganda
     de uma compra que o app nem oferece */
  if (!lojaDeDinheiroLigada()) { cx.style.display = "none"; return; }
  if (!temVip()) { cx.style.display = "none"; return; }
  const dias = vipDiasQueFaltam();
  if (dias > 3) { cx.style.display = "none"; return; }
  cx.style.display = "block";
  cx.className = "falta vip";
  cx.innerHTML = "<b>SEU VIP ESTÁ ACABANDO</b>" +
    "<span>" + (dias <= 0 ? "acaba hoje" : "faltam " + dias + (dias === 1 ? " dia" : " dias")) +
    " — renove para não perder os espaços de relíquia</span>" +
    '<button class="mis-btn" id="vip-renovar" style="margin-top:8px">RENOVAR</button>';
  const b = $("vip-renovar");
  if (b) b.addEventListener("click", () => { try { abrirLojaVip(); } catch (e) { goLoja && goLoja(); } });
}

/* ---------------------- comprovante e cancelar pedido ---------------------- */
function comprovante(pd) {
  return [
    "NEON NEBULA — COMPROVANTE",
    "pedido: " + (pd.chave || "?"),
    "item: " + (pd.itemNome || pd.item || "?"),
    "valor: " + reais(pd.preco || 0),
    "conta: " + (save.__name || "?"),
    "quando: " + new Date(pd.quando || Date.now()).toLocaleString("pt-BR"),
    "estado: " + (pd.estado || "esperando")
  ].join("\n");
}
async function pedidoCancelar(chave) {
  try {
    save.pedidos = (save.pedidos || []).filter(x => x.chave !== chave);
    persist();
    await pedidoJuntar(chave, { estado: "cancelado", canceladoEm: Date.now() });
    return true;
  } catch (e) { return false; }
}


/* =====================================================================
   v6.6 — O QUE SEGURA O JOGO DE PÉ
   save em dois lugares com resolução de conflito · economia de bateria
   · fila de pedidos que avisa · publicar em dois passos
   ===================================================================== */

/* ---------------------- save em dois lugares ----------------------
   Antes o progresso vivia no armazenamento do site, que o celular
   limpa sozinho quando quer. Agora ele também vai para o banco do
   aparelho (IndexedDB) e para a nuvem, e na hora de ler os três são
   comparados: vence quem tem mais progresso, não quem é mais novo —
   porque relógio de celular erra.                                     */
function pesoDoSave(p) {
  if (!p) return -1;
  return (p.best || 0) * 1000 +
         (p.crystals || 0) / 100 +
         (p.abates || 0) / 10 +
         ((p.ships || []).length) * 50 +
         (p.pts || 0) * 20;
}
function melhorSave(a, b) {
  const pa = pesoDoSave(a), pb = pesoDoSave(b);
  if (pa === pb) return (a && a.savedAt || 0) >= (b && b.savedAt || 0) ? a : b;
  return pa > pb ? a : b;
}
/* guarda uma cópia no banco do aparelho, além do armazenamento do site */
function copiaSegura() {
  try {
    if (!window.indexedDB || !ROOT) return;
    const req = indexedDB.open("neon_nebula_backup", 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("saves")) db.createObjectStore("saves");
    };
    req.onsuccess = () => {
      try {
        const db = req.result;
        const tx = db.transaction("saves", "readwrite");
        tx.objectStore("saves").put(JSON.stringify(ROOT), "root");
        tx.oncomplete = () => db.close();
      } catch (e) {}
    };
  } catch (e) {}
}
function lerCopiaSegura() {
  return new Promise(resolve => {
    try {
      if (!window.indexedDB) return resolve(null);
      const req = indexedDB.open("neon_nebula_backup", 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("saves")) db.createObjectStore("saves");
      };
      req.onsuccess = () => {
        try {
          const db = req.result;
          const tx = db.transaction("saves", "readonly");
          const g = tx.objectStore("saves").get("root");
          g.onsuccess = () => { db.close(); resolve(g.result ? JSON.parse(g.result) : null); };
          g.onerror = () => { db.close(); resolve(null); };
        } catch (e) { resolve(null); }
      };
      req.onerror = () => resolve(null);
    } catch (e) { resolve(null); }
  });
}
/* roda quando o jogo abre: se o armazenamento do site foi limpo, a
   cópia do banco do aparelho devolve tudo                             */
async function conferirCopia() {
  try {
    const copia = await lerCopiaSegura();
    if (!copia || !copia.profiles) return { usou: false };
    let mudou = false;
    for (const nome in copia.profiles) {
      const daCopia = copia.profiles[nome];
      const atual = ROOT.profiles[nome];
      const bom = melhorSave(atual, daCopia);
      if (bom === daCopia && bom !== atual) { ROOT.profiles[nome] = daCopia; mudou = true; }
    }
    if (mudou) { persist(); return { usou: true }; }
    return { usou: false };
  } catch (e) { return { usou: false, erro: String(e && e.message) }; }
}

/* ---------------------- economia de bateria ----------------------
   Com a bateria acabando, o jogo sozinho pisa no freio dos enfeites.  */
const BATERIA = { ligada: false, nivel: 1, carregando: true };
async function bateriaCuidar() {
  try {
    if (!navigator.getBattery) return;
    const b = await navigator.getBattery();
    const ver = () => {
      BATERIA.nivel = b.level;
      BATERIA.carregando = b.charging;
      const precisa = !b.charging && b.level <= 0.2;
      if (precisa !== BATERIA.ligada) {
        BATERIA.ligada = precisa;
        if (precisa) {
          try { qAplicar(0, "bateria baixa"); } catch (e) {}
          document.body.classList.add("leve");
          const el = $("cloud-status");
          if (el) el.textContent = "Bateria baixa: liguei o modo leve para durar mais.";
        }
      }
    };
    b.addEventListener("levelchange", ver);
    b.addEventListener("chargingchange", ver);
    ver();
  } catch (e) {}
}

/* ---------------------- fila de pedidos que avisa ----------------------
   O dono não fica olhando o painel o dia inteiro: quando alguém diz que
   pagou, o jogo toca, vibra e mostra uma faixa.                       */
let pedidosVistos = {};
function pedidoAvisar(quantos) {
  const el = $("pedido-faixa");
  if (!el) return;
  el.className = "on";
  el.innerHTML = "💰 <b>" + quantos + (quantos === 1 ? " pedido pago" : " pedidos pagos") +
    "</b> esperando entrega <i>ver</i>";
  const ir = el.querySelector("i");
  if (ir) ir.onclick = () => { el.className = ""; try { admIrPara("loja"); } catch (e) {} };
  try { AudioSys.buy(); vibrate([50, 60, 50, 60, 120]); } catch (e) {}
  setTimeout(() => { el.className = ""; }, 12000);
}
async function pedidosOlhar() {
  try {
    if (!contaDeDono(save && save.__name)) return;
    const pedidos = (await nuvemReq("loja_pedidos")) || {};
    let novos = 0;
    for (const k in pedidos) {
      const pd = pedidos[k];
      if (!pd || pd.estado !== "pago") continue;
      if (pedidosVistos[k]) continue;
      pedidosVistos[k] = true;
      novos++;
    }
    if (novos) pedidoAvisar(novos);
  } catch (e) {}
}

/* ---------------------- publicar em dois passos ----------------------
   A versão nova sai primeiro só para você e para quem você marcar como
   testador; quando estiver de pé, um botão libera para todo mundo.    */
async function testeFechadoLigar(versao, nota, testadores) {
  const ok = await nuvemSoltar("mundo/teste", {
    versao: versao, nota: nota || "",
    quem: (testadores || "").split(",").map(x => nickSimples(x)).filter(Boolean),
    quando: Date.now()
  });
  admRegistrar("ligou o teste fechado da versão " + versao);
  return ok !== null;
}
function souTestador(t) {
  try {
    if (contaDeDono(save && save.__name)) return true;
    const meu = nickSimples(save && save.__name);
    return !!(t && (t.quem || []).some(x => x === meu));
  } catch (e) { return false; }
}
function testeAplicar(t) {
  const el = $("teste-faixa");
  if (!el) return;
  if (!t || !t.versao || !souTestador(t)) { el.className = ""; return; }
  el.className = "on";
  el.innerHTML = "🧪 Você está testando a <b>versão " + escaparTexto(t.versao) + "</b>" +
    (t.nota ? " — " + escaparTexto(t.nota) : "");
}


/* =====================================================================
   v6.6 — INGLÊS E ESPANHOL
   ---------------------------------------------------------------------
   O jogo nasceu inteiro em português, com os textos escritos direto no
   meio do código — mais de mil pedaços espalhados. Reescrever tudo com
   chaves seria trocar o motor do carro andando.

   O caminho aqui é outro: a PRÓPRIA FRASE EM PORTUGUÊS é a chave. Uma
   tabela diz como cada frase fica em inglês e em espanhol, e um
   observador traduz o que aparece na tela assim que aparece — inclusive
   o que é montado na hora pelo jogo.

   Consequência boa: frase que ainda não está na tabela continua em
   português, e nada quebra. Traduzir mais é só acrescentar linhas.
   ===================================================================== */

const IDIOMAS = [
  { id: "pt", nome: "Português", bandeira: "🇧🇷" },
  { id: "en", nome: "English",   bandeira: "🇺🇸" },
  { id: "es", nome: "Español",   bandeira: "🇪🇸" }
];
let IDIOMA = "pt";

/* [português, inglês, espanhol] */
const FRASES = [
  /* ---------- menu e telas ---------- */
  ["NEON", "NEON", "NEON"],
  ["NEBULA", "NEBULA", "NEBULA"],
  ["▶ JOGAR", "▶ PLAY", "▶ JUGAR"],
  ["▶ CONTINUAR", "▶ CONTINUE", "▶ CONTINUAR"],
  ["▶ FASES", "▶ LEVELS", "▶ NIVELES"],
  ["CONTINUAR ›", "CONTINUE ›", "CONTINUAR ›"],
  ["MENU", "MENU", "MENÚ"],
  ["FASES", "LEVELS", "NIVELES"],
  ["FASE", "LEVEL", "NIVEL"],
  ["FASE 1", "LEVEL 1", "NIVEL 1"],
  ["Fase 0 de 270", "Level 0 of 270", "Nivel 0 de 270"],
  ["CRISTAIS", "CRYSTALS", "CRISTALES"],
  ["RECORDE", "BEST", "RÉCORD"],
  ["PONTOS", "SCORE", "PUNTOS"],
  ["ESTRELAS", "STARS", "ESTRELLAS"],
  ["HANGAR", "HANGAR", "HANGAR"],
  ["OFICINA", "WORKSHOP", "TALLER"],
  ["HABILIDADES", "SKILLS", "HABILIDADES"],
  ["RELÍQUIAS", "RELICS", "RELIQUIAS"],
  ["MELHORIAS", "UPGRADES", "MEJORAS"],
  ["⬡ MELHORIAS", "⬡ UPGRADES", "⬡ MEJORAS"],
  ["LOJA", "SHOP", "TIENDA"],
  ["AMIGOS", "FRIENDS", "AMIGOS"],
  ["👥 AMIGOS", "👥 FRIENDS", "👥 AMIGOS"],
  ["MEUS AMIGOS", "MY FRIENDS", "MIS AMIGOS"],
  ["RANKING", "LEADERBOARD", "CLASIFICACIÓN"],
  ["RANQUEADA", "RANKED", "CLASIFICATORIA"],
  ["🏆 RANQUEADA", "🏆 RANKED", "🏆 CLASIFICATORIA"],
  ["ARENA INFINITA", "ENDLESS ARENA", "ARENA INFINITA"],
  ["MARATONA DE CHEFES", "BOSS RUSH", "MARATÓN DE JEFES"],
  ["JOGAR COM AMIGO", "PLAY WITH A FRIEND", "JUGAR CON UN AMIGO"],
  ["JOGAR COM AMIGOS", "PLAY WITH FRIENDS", "JUGAR CON AMIGOS"],
  ["JOGAR JUNTO", "PLAY TOGETHER", "JUGAR JUNTOS"],
  ["JORNADA", "JOURNEY", "AVENTURA"],
  ["🚀 JORNADA", "🚀 JOURNEY", "🚀 AVENTURA"],
  ["JORNADA EM DUPLA", "CO-OP JOURNEY", "AVENTURA EN PAREJA"],
  ["NOVIDADES", "WHAT'S NEW", "NOVEDADES"],
  ["📋 NOVIDADES", "📋 WHAT'S NEW", "📋 NOVEDADES"],
  ["AJUSTES", "SETTINGS", "AJUSTES"],
  ["⚙ AJUSTES", "⚙ SETTINGS", "⚙ AJUSTES"],
  ["MISSÕES", "QUESTS", "MISIONES"],
  ["🎯 MISSÕES", "🎯 QUESTS", "🎯 MISIONES"],
  ["CONQUISTAS", "ACHIEVEMENTS", "LOGROS"],
  ["★ CONQUISTAS", "★ ACHIEVEMENTS", "★ LOGROS"],
  ["PERFIL", "PROFILE", "PERFIL"],
  ["CONVIDAR", "INVITE", "INVITAR"],
  ["🎟 CONVIDAR", "🎟 INVITE", "🎟 INVITAR"],
  ["COMPARAR NAVES", "COMPARE SHIPS", "COMPARAR NAVES"],
  ["📊 COMPARAR TODAS AS NAVES", "📊 COMPARE ALL SHIPS", "📊 COMPARAR TODAS LAS NAVES"],
  ["☁ SALVAR NA NUVEM", "☁ SAVE TO CLOUD", "☁ GUARDAR EN LA NUBE"],
  ["ONLINE", "ONLINE", "EN LÍNEA"],
  ["SALA", "ROOM", "SALA"],
  ["PAUSA", "PAUSE", "PAUSA"],
  ["Pausado", "Paused", "En pausa"],
  ["Pausar", "Pause", "Pausar"],
  ["pausa", "pause", "pausa"],
  ["Voltar", "Back", "Volver"],
  ["‹ VOLTAR", "‹ BACK", "‹ VOLVER"],
  ["VOLTAR AO MENU", "BACK TO MENU", "VOLVER AL MENÚ"],
  ["SAIR PARA O MENU", "QUIT TO MENU", "SALIR AL MENÚ"],
  ["Sair", "Leave", "Salir"],
  ["Fechar", "Close", "Cerrar"],
  ["CANCELAR", "CANCEL", "CANCELAR"],
  ["ATUALIZAR", "UPDATE", "ACTUALIZAR"],
  ["ENTRAR", "ENTER", "ENTRAR"],
  ["CRIAR", "CREATE", "CREAR"],
  ["Enviar", "Send", "Enviar"],
  ["ADICIONAR AMIGO", "ADD FRIEND", "AÑADIR AMIGO"],
  ["👤+ ADICIONAR", "👤+ ADD", "👤+ AÑADIR"],
  ["Trocar de piloto", "Switch pilot", "Cambiar de piloto"],
  ["Ver o meu perfil", "See my profile", "Ver mi perfil"],
  ["Piloto", "Pilot", "Piloto"],
  ["Amigo", "Friend", "Amigo"],
  ["Amigos", "Friends", "Amigos"],
  ["Item", "Item", "Objeto"],
  ["capa", "cloak", "capa"],
  ["habilidades", "skills", "habilidades"],
  ["ultimate", "ultimate", "definitiva"],
  ["ULT", "ULT", "ULT"],
  ["CAPA", "CLOAK", "CAPA"],
  ["toque para abrir", "tap to open", "toca para abrir"],
  ["Mostrar ou esconder as habilidades", "Show or hide skills", "Mostrar u ocultar las habilidades"],
  ["Música ligada/desligada", "Music on/off", "Música activada/desactivada"],
  ["Som ligado/desligado", "Sound on/off", "Sonido activado/desactivado"],

  /* ---------- entrar na conta ---------- */
  ["ENTRAR NA SUA CONTA", "SIGN IN", "ENTRA EN TU CUENTA"],
  ["CRIAR UMA CONTA NOVA", "CREATE A NEW ACCOUNT", "CREAR UNA CUENTA NUEVA"],
  ["Escolha um nome", "Choose a name", "Elige un nombre"],
  ["Nome da conta", "Account name", "Nombre de la cuenta"],
  ["Nome do piloto", "Pilot name", "Nombre del piloto"],
  ["NESTE APARELHO", "ON THIS DEVICE", "EN ESTE APARATO"],
  ["O PROGRESSO É SALVO POR CONTA ·", "PROGRESS IS SAVED PER ACCOUNT ·", "EL PROGRESO SE GUARDA POR CUENTA ·"],
  ["DESENHE SUA SENHA", "DRAW YOUR PASSWORD", "DIBUJA TU CONTRASEÑA"],
  ["Ligue pelo menos 4 pontos sem soltar o dedo.",
   "Connect at least 4 dots without lifting your finger.",
   "Une al menos 4 puntos sin levantar el dedo."],
  ["Digite o nome e depois desenhe a sua senha.",
   "Type the name, then draw your password.",
   "Escribe el nombre y luego dibuja tu contraseña."],
  ["Continuar conectado neste aparelho", "Stay signed in on this device", "Seguir conectado en este aparato"],
  ["Segurança", "Security", "Seguridad"],
  ["ESQUECI O DESENHO DA SENHA", "I FORGOT MY PASSWORD PATTERN", "OLVIDÉ EL DIBUJO DE LA CONTRASEÑA"],
  ["↻ REFAZER", "↻ REDO", "↻ REHACER"],

  /* ---------- fim de fase ---------- */
  ["Setor limpo", "Sector cleared", "Sector despejado"],
  ["FASE CONCLUÍDA", "LEVEL COMPLETE", "NIVEL COMPLETADO"],
  ["PRÓXIMA FASE ›", "NEXT LEVEL ›", "NIVEL SIGUIENTE ›"],
  ["Fim da missão", "Mission over", "Fin de la misión"],
  ["NAVE DESTRUÍDA", "SHIP DESTROYED", "NAVE DESTRUIDA"],
  ["↻ TENTAR DE NOVO", "↻ TRY AGAIN", "↻ INTENTAR DE NUEVO"],
  ["★ NOVO RECORDE!", "★ NEW BEST!", "★ ¡NUEVO RÉCORD!"],
  ["✦ +1 PONTO DE HABILIDADE", "✦ +1 SKILL POINT", "✦ +1 PUNTO DE HABILIDAD"],
  ["+0 cristais", "+0 crystals", "+0 cristales"],
  ["+0 cristais recuperados", "+0 crystals recovered", "+0 cristales recuperados"],
  ["📸 FOTO DA PARTIDA", "📸 MATCH PHOTO", "📸 FOTO DE LA PARTIDA"],
  ["PULAR ›", "SKIP ›", "SALTAR ›"],
  ["ONDA 1/3", "WAVE 1/3", "OLEADA 1/3"],
  ["Defesa do setor 7", "Sector 7 defense", "Defensa del sector 7"],

  /* ---------- hangar e oficina ---------- */
  ["ARMAMENTO", "WEAPON", "ARMAMENTO"],
  ["PINTURA DO CASCO", "HULL PAINT", "PINTURA DEL CASCO"],
  ["BRILHO DO MOTOR", "ENGINE GLOW", "BRILLO DEL MOTOR"],
  ["COR", "COLOR", "COLOR"],
  ["CRIAR NAVE", "BUILD A SHIP", "CREAR NAVE"],
  ["🛠 CRIAR MINHA NAVE", "🛠 BUILD MY OWN SHIP", "🛠 CREAR MI NAVE"],
  ["NOME DA NAVE", "SHIP NAME", "NOMBRE DE LA NAVE"],
  ["Como ela vai se chamar?", "What will it be called?", "¿Cómo se va a llamar?"],
  ["ARRASTE PARA GIRAR A NAVE EM 3D", "DRAG TO SPIN THE SHIP IN 3D", "ARRASTRA PARA GIRAR LA NAVE EN 3D"],
  ["▶ VER APRESENTAÇÃO DA NAVE", "▶ WATCH THE SHIP INTRO", "▶ VER LA PRESENTACIÓN DE LA NAVE"],
  ["AMULETOS EQUIPADOS", "EQUIPPED RELICS", "RELIQUIAS EQUIPADAS"],
  ["ABRIR BAÚ ESTELAR — ◆ 300", "OPEN STAR CHEST — ◆ 300", "ABRIR COFRE ESTELAR — ◆ 300"],
  ["Chefes derrotados pela primeira vez também deixam amuletos. Raridades: Comum, Raro, Épico e Lendário.",
   "Bosses you beat for the first time also drop relics. Rarities: Common, Rare, Epic and Legendary.",
   "Los jefes derrotados por primera vez también dejan reliquias. Rarezas: Común, Rara, Épica y Legendaria."],
  ["0 PONTOS DISPONÍVEIS", "0 POINTS AVAILABLE", "0 PUNTOS DISPONIBLES"],
  ["Cada fase concluída dá 1 ponto de habilidade.",
   "Each level you finish gives 1 skill point.",
   "Cada nivel completado da 1 punto de habilidad."],
  ["Toque em um nó", "Tap a node", "Toca un nodo"],
  ["↻ REFAZER A ÁRVORE", "↻ RESET THE TREE", "↻ REHACER EL ÁRBOL"],
  ["CAPRICHO DO DESENHO", "GRAPHICS QUALITY", "CALIDAD GRÁFICA"],
  ["O jogo escolhe sozinho o que o seu aparelho aguenta. Nada do jogo muda — só o capricho dos enfeites.",
   "The game picks what your device can handle. Nothing about gameplay changes — only how fancy it looks.",
   "El juego elige solo lo que tu aparato aguanta. Nada del juego cambia — solo lo bonito de los adornos."],

  /* ---------- multijogador ---------- */
  ["CRIAR SALA", "CREATE ROOM", "CREAR SALA"],
  ["CRIAR OU ENTRAR", "CREATE OR JOIN", "CREAR O ENTRAR"],
  ["CÓDIGO DA SALA", "ROOM CODE", "CÓDIGO DE LA SALA"],
  ["Código da sala", "Room code", "Código de la sala"],
  ["Código do duelo", "Duel code", "Código del duelo"],
  ["CHAMAR E COMEÇAR", "INVITE AND START", "INVITAR Y EMPEZAR"],
  ["COMEÇAR", "START", "EMPEZAR"],
  ["PILOTOS NA SALA", "PILOTS IN THE ROOM", "PILOTOS EN LA SALA"],
  ["Esperando o outro piloto entrar…", "Waiting for the other pilot…", "Esperando a que entre el otro piloto…"],
  ["Esperando a transmissão…", "Waiting for the stream…", "Esperando la transmisión…"],
  ["A partida está esperando por você.", "The match is waiting for you.", "La partida te está esperando."],
  ["conectando…", "connecting…", "conectando…"],
  ["🤝 SALA RÁPIDA", "🤝 QUICK ROOM", "🤝 SALA RÁPIDA"],
  ["⚔ DUELO", "⚔ DUEL", "⚔ DUELO"],
  ["DUELO PRIVADO", "PRIVATE DUEL", "DUELO PRIVADO"],
  ["CRIAR DUELO", "CREATE DUEL", "CREAR DUELO"],
  ["⚔ PROCURAR PARTIDA", "⚔ FIND A MATCH", "⚔ BUSCAR PARTIDA"],
  ["Procurando adversário…", "Looking for an opponent…", "Buscando rival…"],
  ["NA FILA AGORA", "IN QUEUE NOW", "EN LA COLA AHORA"],
  ["DIVISÕES", "DIVISIONS", "DIVISIONES"],
  ["VITÓRIAS", "WINS", "VICTORIAS"],
  ["DERROTAS", "LOSSES", "DERROTAS"],
  ["APROVEITAMENTO", "WIN RATE", "EFECTIVIDAD"],
  ["0 vitórias · 0 derrotas", "0 wins · 0 losses", "0 victorias · 0 derrotas"],
  ["0 pontos", "0 points", "0 puntos"],
  ["0 pontos de rank", "0 rank points", "0 puntos de rango"],
  ["BRONZE", "BRONZE", "BRONCE"],
  ["▲ BRONZE", "▲ BRONZE", "▲ BRONCE"],
  ["∞ ENTRAR NA ARENA", "∞ ENTER THE ARENA", "∞ ENTRAR EN LA ARENA"],
  ["A ARENA NUNCA ZERA", "THE ARENA NEVER RESETS", "LA ARENA NUNCA SE REINICIA"],
  ["QUEM ESTÁ NA ARENA AGORA", "WHO'S IN THE ARENA NOW", "QUIÉN ESTÁ EN LA ARENA AHORA"],
  ["JOGADORES ONLINE", "PLAYERS ONLINE", "JUGADORES EN LÍNEA"],
  ["⚙ MELHORIAS DA DUPLA", "⚙ CO-OP UPGRADES", "⚙ MEJORAS DE LA PAREJA"],
  ["O chefe soma o dano dos dois", "The boss takes damage from both of you", "El jefe suma el daño de los dos"],
  ["O inimigo cai na mesma hora nas duas telas", "Enemies drop at the same moment on both screens", "El enemigo cae al mismo tiempo en las dos pantallas"],
  ["Você vê os tiros e as habilidades do parceiro", "You see your partner's shots and skills", "Ves los disparos y las habilidades de tu compañero"],
  ["Ligação direta entre os dois celulares, sem servidor no meio",
   "Direct link between the two phones, no server in between",
   "Conexión directa entre los dos móviles, sin servidor en medio"],
  ["Mesma fase, mesma onda, mesmos inimigos. O abate de um vale para os dois e a pontuação soma.",
   "Same level, same wave, same enemies. A kill by one counts for both and the score adds up.",
   "Mismo nivel, misma oleada, mismos enemigos. La baja de uno cuenta para los dos y la puntuación se suma."],
  ["Quem cria vira o anfitrião: é o aparelho dele que manda a onda, então os dois nunca ficam em ondas diferentes.",
   "Whoever creates the room is the host: their device sets the wave, so you're never on different waves.",
   "Quien crea la sala es el anfitrión: su aparato manda la oleada, así que nunca estáis en oleadas distintas."],
  ["Um contra um, pelo código, com quem você quiser. Aqui os tiros do adversário machucam de verdade.",
   "One on one, by code, with whoever you want. Here the opponent's shots really hurt.",
   "Uno contra uno, por código, con quien quieras. Aquí los disparos del rival hacen daño de verdad."],
  ["Toque em um amigo para convidá-lo: o código da sala é copiado para você mandar por mensagem.",
   "Tap a friend to invite them: the room code is copied so you can send it in a message.",
   "Toca a un amigo para invitarlo: el código de la sala se copia para que lo mandes por mensaje."],
  ["Toque na fase em que vocês querem jogar. Dá para voltar em qualquer fase já vencida para pegar cristais.",
   "Tap the level you both want to play. You can go back to any level you've beaten to farm crystals.",
   "Toca el nivel en el que queréis jugar. Puedes volver a cualquier nivel ya superado para conseguir cristales."],
  ["Estas melhorias valem só nesta jornada, com este amigo. Com outro amigo, outras melhorias.",
   "These upgrades only apply to this journey, with this friend. With another friend, other upgrades.",
   "Estas mejoras valen solo en esta aventura, con este amigo. Con otro amigo, otras mejoras."],
  ["270 fases para cada amizade. O que vocês avançarem com um amigo fica com ele; com outro amigo, a jornada começa do zero — com as melhorias próprias daquela dupla.",
   "270 levels for each friendship. What you clear with one friend stays with them; with another friend the journey starts from zero — with that pair's own upgrades.",
   "270 niveles para cada amistad. Lo que avancéis con un amigo se queda con él; con otro amigo la aventura empieza de cero — con las mejoras propias de esa pareja."],
  ["Na arena tudo fica zerado, igual para todo mundo: valem só a sua nave e a sua mão. O que você derrubar entra na conta de todos.",
   "In the arena everything is reset, the same for everyone: only your ship and your hands count. Whatever you shoot down counts for everybody.",
   "En la arena todo está a cero, igual para todos: solo valen tu nave y tu mano. Lo que derribes cuenta para todos."],
  ["Uma só arena para todo mundo. Ondas sem fim, todos são aliados e ninguém atira em ninguém. A onda continua de onde o último parou — mesmo que você feche o jogo. A cada 5 ondas vem um chefe.",
   "One arena for everyone. Endless waves, everybody is an ally and nobody shoots anybody. The wave continues from where the last player left it — even if you close the game. Every 5 waves a boss shows up.",
   "Una sola arena para todos. Oleadas sin fin, todos son aliados y nadie dispara a nadie. La oleada sigue donde la dejó el último — aunque cierres el juego. Cada 5 oleadas llega un jefe."],
  ["Não precisa de código: o jogo acha alguém do seu nível sozinho. Tudo fica zerado dos dois lados, então vence quem jogar melhor. Ganhou, sobe pontos de rank; perdeu, desce um pouco. Quanto mais tempo na fila, mais longe do seu nível o jogo aceita — para ninguém ficar preso esperando.",
   "No code needed: the game finds someone at your level by itself. Everything is reset on both sides, so the better player wins. Win and your rank goes up; lose and it drops a little. The longer you wait in queue, the further from your level the game will accept — so nobody gets stuck waiting.",
   "No hace falta código: el juego encuentra a alguien de tu nivel solo. Todo empieza a cero en los dos lados, así que gana quien juegue mejor. Si ganas, subes puntos de rango; si pierdes, bajas un poco. Cuanto más esperas en la cola, más lejos de tu nivel acepta el juego — para que nadie se quede atascado."],
  ["Sem código: o jogo acha alguém do seu nível sozinho. Tudo começa zerado dos dois lados, então vence quem jogar melhor. Ganhou, sobe; perdeu, desce um pouco.",
   "No code: the game finds someone at your level by itself. Everything starts at zero on both sides, so the better player wins. Win and you go up; lose and you drop a little.",
   "Sin código: el juego encuentra a alguien de tu nivel solo. Todo empieza a cero en los dos lados, así que gana quien juegue mejor. Si ganas, subes; si pierdes, bajas un poco."],
  ["Duelo pelo código não mexe no seu rank de propósito: é para treinar com os amigos. Para valer pontos, use a aba",
   "A duel by code doesn't touch your rank on purpose: it's for practising with friends. To earn points, use the tab",
   "El duelo por código no toca tu rango a propósito: es para entrenar con amigos. Para que valga puntos, usa la pestaña"],

  /* ---------- loja e pagamento ---------- */
  ["PAGAMENTO", "PAYMENT", "PAGO"],
  ["Pagamento por", "Payment via", "Pago por"],
  ["· entrega assim que eu confirmar", "· delivered as soon as I confirm", "· entrega en cuanto lo confirme"],
  ["Falar com o administrador", "Talk to the developer", "Hablar con el desarrollador"],
  ["fala direto com quem faz o jogo", "talk straight to the person who makes the game", "habla directo con quien hace el juego"],
  ["PEGAR TUDO", "CLAIM ALL", "RECOGER TODO"],
  ["O ADMINISTRADOR ENVIOU", "THE DEVELOPER SENT YOU", "EL DESARROLLADOR TE ENVIÓ"],

  /* ---------- sugestões ---------- */
  ["💡 MANDAR UMA SUGESTÃO", "💡 SEND A SUGGESTION", "💡 MANDAR UNA SUGERENCIA"],
  ["💡 SUA SUGESTÃO", "💡 YOUR SUGGESTION", "💡 TU SUGERENCIA"],
  ["ENVIAR SUGESTÃO", "SEND SUGGESTION", "ENVIAR SUGERENCIA"],
  ["Escreva aqui a sua ideia…", "Write your idea here…", "Escribe aquí tu idea…"],
  ["Escreva sua mensagem…", "Write your message…", "Escribe tu mensaje…"],
  ["Escreva uma mensagem…", "Write a message…", "Escribe un mensaje…"],
  ["O que você gostaria de ver no jogo? Uma nave, uma fase, um chefe, uma habilidade, o que estiver quebrado — escreva do seu jeito. Isso vai direto para quem faz o jogo.",
   "What would you like to see in the game? A ship, a level, a boss, a skill, whatever is broken — write it your way. This goes straight to the person who makes the game.",
   "¿Qué te gustaría ver en el juego? Una nave, un nivel, un jefe, una habilidad, lo que esté roto — escríbelo a tu manera. Esto va directo a quien hace el juego."],

  /* ---------- atualização e erro ---------- */
  ["ATUALIZAÇÃO OBRIGATÓRIA", "UPDATE REQUIRED", "ACTUALIZACIÓN OBLIGATORIA"],
  ["ATUALIZAR AGORA", "UPDATE NOW", "ACTUALIZAR AHORA"],
  ["Nova versão disponível", "New version available", "Nueva versión disponible"],
  ["versão nova", "new version", "versión nueva"],
  ["Saiu uma versão nova do Neon Nebula. Para jogar, atualize agora — leva alguns segundos.",
   "A new version of Neon Nebula is out. To play, update now — it takes a few seconds.",
   "Salió una versión nueva de Neon Nebula. Para jugar, actualiza ahora — tarda unos segundos."],
  ["Seu progresso está salvo — nada se perde na atualização.",
   "Your progress is saved — nothing is lost in the update.",
   "Tu progreso está guardado — no se pierde nada al actualizar."],
  ["Baixar a versão nova", "Downloading the new version", "Descargando la versión nueva"],
  ["Limpar a versão antiga", "Clearing the old version", "Limpiando la versión antigua"],
  ["Abrir o jogo atualizado", "Opening the updated game", "Abriendo el juego actualizado"],
  ["CONTINUAR MESMO ASSIM", "CONTINUE ANYWAY", "CONTINUAR IGUALMENTE"],
  ["ENTRAR ASSIM MESMO", "ENTER ANYWAY", "ENTRAR IGUALMENTE"],
  ["⚠ OCORREU UM ERRO", "⚠ SOMETHING WENT WRONG", "⚠ OCURRIÓ UN ERROR"],
  ["COPIAR ERRO", "COPY THE ERROR", "COPIAR EL ERROR"],
  ["COPIAR CÓDIGO", "COPY CODE", "COPIAR CÓDIGO"],

  /* ---------- teclado do computador ---------- */
  ["MOUSE", "MOUSE", "RATÓN"],
  ["a nave segue o cursor", "the ship follows the cursor", "la nave sigue al cursor"],
  ["ESPAÇO", "SPACE", "ESPACIO"],
  ["ESC", "ESC", "ESC"],
  ["SHIFT", "SHIFT", "SHIFT"],
  ["⚡ MODO INVENCÍVEL", "⚡ GOD MODE", "⚡ MODO INVENCIBLE"],
  ["⚙ PAINEL ADM", "⚙ ADMIN PANEL", "⚙ PANEL DE ADMIN"],
  ["ADMINISTRADOR", "ADMINISTRATOR", "ADMINISTRADOR"],
  ["ACESSO RESTRITO", "RESTRICTED ACCESS", "ACCESO RESTRINGIDO"],
  ["jornada em dupla · duelo · ranqueada", "co-op journey · duel · ranked", "aventura en pareja · duelo · clasificatoria"],
  ["60 fps", "60 fps", "60 fps"],

  /* ---------- v6.0 a v6.5: coisas montadas na hora ---------- */
  ["🔊 SOM", "🔊 SOUND", "🔊 SONIDO"],
  ["Música", "Music", "Música"],
  ["Efeitos (tiros, explosões)", "Effects (shots, explosions)", "Efectos (disparos, explosiones)"],
  ["🎮 CONTROLE", "🎮 CONTROLS", "🎮 CONTROLES"],
  ["Sensibilidade do dedo", "Touch sensitivity", "Sensibilidad del dedo"],
  ["Vibração", "Vibration", "Vibración"],
  ["no acerto e no chefe", "on hits and on bosses", "al acertar y en los jefes"],
  ["Modo canhoto", "Left-handed mode", "Modo zurdo"],
  ["botões grandes à esquerda", "big buttons on the left", "botones grandes a la izquierda"],
  ["👁 VER MELHOR", "👁 SEE BETTER", "👁 VER MEJOR"],
  ["Modo daltônico", "Colorblind mode", "Modo daltónico"],
  ["tiro inimigo em âmbar e branco", "enemy shots in amber and white", "disparos enemigos en ámbar y blanco"],
  ["Menos flashes", "Fewer flashes", "Menos destellos"],
  ["para quem se incomoda com luz piscando", "for anyone bothered by flashing light", "para quien le molesta la luz parpadeante"],
  ["Mostrar quadros por segundo", "Show frames per second", "Mostrar fotogramas por segundo"],
  ["para saber se o celular aguenta", "to see if your phone can take it", "para saber si el móvil aguanta"],
  ["📱 DESEMPENHO", "📱 PERFORMANCE", "📱 RENDIMIENTO"],
  ["VOLTAR AO PADRÃO", "RESET TO DEFAULT", "VOLVER A LO NORMAL"],
  ["🔑 CÓDIGO DE RECUPERAÇÃO", "🔑 RECOVERY CODE", "🔑 CÓDIGO DE RECUPERACIÓN"],
  ["🌎 IDIOMA", "🌎 LANGUAGE", "🌎 IDIOMA"],
  ["PEGAR", "CLAIM", "RECOGER"],
  ["Presente de hoje pego ✓", "Today's gift claimed ✓", "Regalo de hoy recogido ✓"],
  ["🎯 MISSÕES DO DIA", "🎯 DAILY QUESTS", "🎯 MISIONES DEL DÍA"],
  ["em andamento", "in progress", "en curso"],
  ["✓ pego", "✓ claimed", "✓ recogido"],
  ["FALTA POUCO", "ALMOST THERE", "YA CASI"],
  ["⚗ FUNDIR REPETIDAS", "⚗ MERGE DUPLICATES", "⚗ FUSIONAR REPETIDAS"],
  ["FUNDIR", "MERGE", "FUSIONAR"],
  ["🎒 CONJUNTOS", "🎒 LOADOUTS", "🎒 EQUIPOS"],
  ["USAR", "USE", "USAR"],
  ["SALVAR", "SAVE", "GUARDAR"],
  ["TROCAR", "SWAP", "CAMBIAR"],
  ["vazio", "empty", "vacío"],
  ["guarde aqui", "save one here", "guarda aquí"],
  ["📜 O QUE SAIU DOS ÚLTIMOS BAÚS", "📜 WHAT CAME OUT OF THE LAST CHESTS", "📜 LO QUE SALIÓ DE LOS ÚLTIMOS COFRES"],
  ["♾ PRESTÍGIO", "♾ PRESTIGE", "♾ PRESTIGIO"],
  ["RECOMEÇAR A JORNADA", "RESTART THE JOURNEY", "REEMPEZAR LA AVENTURA"],
  ["🖼 MOLDURA DO APELIDO", "🖼 NAME FRAME", "🖼 MARCO DEL APODO"],
  ["Sem moldura", "No frame", "Sin marco"],
  ["Bronze", "Bronze", "Bronce"],
  ["Prata", "Silver", "Plata"],
  ["Ouro", "Gold", "Oro"],
  ["Caçador", "Hunter", "Cazador"],
  ["Constelação", "Constellation", "Constelación"],
  ["Duelista", "Duelist", "Duelista"],
  ["Renascido", "Reborn", "Renacido"],
  ["Criador", "Creator", "Creador"],
  ["🎁 COMPRAR PARA UM AMIGO", "🎁 BUY FOR A FRIEND", "🎁 COMPRAR PARA UN AMIGO"],
  ["PROCURAR", "SEARCH", "BUSCAR"],
  ["Nick do amigo", "Friend's nickname", "Apodo del amigo"],
  ["SÓ NO PRIMEIRO DIA", "FIRST DAY ONLY", "SOLO EL PRIMER DÍA"],
  ["QUERO", "I WANT IT", "LO QUIERO"],
  ["SEU VIP ESTÁ ACABANDO", "YOUR VIP IS RUNNING OUT", "TU VIP SE ESTÁ ACABANDO"],
  ["RENOVAR", "RENEW", "RENOVAR"],
  ["🕹 JOGOU COM ELES HÁ POUCO", "🕹 RECENTLY PLAYED WITH", "🕹 JUGASTE CON ELLOS HACE POCO"],
  ["+ AMIGO", "+ FRIEND", "+ AMIGO"],
  ["🚫 BLOQUEADOS", "🚫 BLOCKED", "🚫 BLOQUEADOS"],
  ["DESBLOQUEAR", "UNBLOCK", "DESBLOQUEAR"],
  ["↻ REVANCHE", "↻ REMATCH", "↻ REVANCHA"],
  ["mesma sala, mesma dupla", "same room, same pair", "misma sala, misma pareja"],
  ["📜 SUAS ÚLTIMAS PARTIDAS", "📜 YOUR LAST MATCHES", "📜 TUS ÚLTIMAS PARTIDAS"],
  ["VITÓRIA", "WIN", "VICTORIA"],
  ["DERROTA", "LOSS", "DERROTA"],
  ["EMPATE", "DRAW", "EMPATE"],
  ["PARCEIRO CAIU", "PARTNER IS DOWN", "TU COMPAÑERO CAYÓ"],
  ["chegue perto para reviver", "get close to revive them", "acércate para revivirlo"],
  ["REVIVENDO…", "REVIVING…", "REVIVIENDO…"],
  ["segure perto do parceiro", "hold near your partner", "quédate cerca de tu compañero"],
  ["DE PÉ!", "BACK UP!", "¡DE PIE!"],
  ["PARCEIRO DE VOLTA!", "PARTNER IS BACK!", "¡COMPAÑERO DE VUELTA!"],
  ["MISSÃO COMPLETA!", "QUEST COMPLETE!", "¡MISIÓN COMPLETA!"],
  ["combo perdido", "combo lost", "combo perdido"],
  ["Pronto. Agora é com você 🚀", "All set. It's on you now 🚀", "Listo. Ahora es cosa tuya 🚀"],
  ["PULAR", "SKIP", "SALTAR"],
  ["O jogo está em manutenção", "The game is under maintenance", "El juego está en mantenimiento"],
  ["TENTAR DE NOVO", "TRY AGAIN", "INTENTAR DE NUEVO"],
  ["SEU CÓDIGO", "YOUR CODE", "TU CÓDIGO"],
  ["COPIAR CONVITE", "COPY INVITE", "COPIAR INVITACIÓN"],
  ["🎟 TENHO UM CÓDIGO", "🎟 I HAVE A CODE", "🎟 TENGO UN CÓDIGO"],
  ["Código do amigo", "Friend's code", "Código del amigo"],
  ["Você já usou um convite ✓", "You already used an invite ✓", "Ya usaste una invitación ✓"],
  ["CHAVE PIX", "PIX KEY", "CLAVE PIX"],
  ["COPIAR CHAVE", "COPY KEY", "COPIAR CLAVE"],
  ["👁 MOSTRAR", "👁 SHOW", "👁 MOSTRAR"],
  ["🙈 ESCONDER", "🙈 HIDE", "🙈 OCULTAR"],
  ["Nome do destinatário", "Recipient name", "Nombre del destinatario"],
  ["Valor", "Amount", "Importe"],
  ["JÁ PAGUEI", "I'VE PAID", "YA PAGUÉ"],
  ["Esperando o desenvolvedor te responder", "Waiting for the developer to reply", "Esperando que el desarrollador responda"],
  ["Entregue!", "Delivered!", "¡Entregado!"],
  ["Pagamento indisponível agora", "Payment unavailable right now", "Pago no disponible ahora"],
  ["⊙ FALAR COM O DESENVOLVEDOR", "⊙ TALK TO THE DEVELOPER", "⊙ HABLAR CON EL DESARROLLADOR"],
  ["MARATONA VENCIDA!", "BOSS RUSH CLEARED!", "¡MARATÓN SUPERADA!"],
  ["SALA SECRETA", "SECRET ROOM", "SALA SECRETA"],
  ["✦ PORTAL ABERTO", "✦ PORTAL OPEN", "✦ PORTAL ABIERTO"],
  ["entre nele antes de sumir", "get in before it closes", "entra antes de que desaparezca"],
  ["DE VOLTA", "BACK", "DE VUELTA"],
  ["⚠ CHEFE ⚠", "⚠ BOSS ⚠", "⚠ JEFE ⚠"],
  ["Tempo", "Time", "Tiempo"],
  ["Maior combo", "Best combo", "Mejor combo"],
  ["Precisão", "Accuracy", "Precisión"],
  ["Dano levado", "Damage taken", "Daño recibido"],
  ["PILOTOS", "PILOTS", "PILOTOS"],
  ["ABATES", "KILLS", "BAJAS"],
  ["CHEFES", "BOSSES", "JEFES"],
  ["MELHOR COMBO", "BEST COMBO", "MEJOR COMBO"],
  ["TEMPO DE VOO", "FLIGHT TIME", "TIEMPO DE VUELO"],
  ["★ VER CONQUISTAS", "★ SEE ACHIEVEMENTS", "★ VER LOGROS"],
  ["Precisão dos tiros", "Shot accuracy", "Precisión de los disparos"],
  ["Fases sem levar dano", "Levels without taking damage", "Niveles sin recibir daño"],
  ["Partidas jogadas", "Matches played", "Partidas jugadas"],
  ["Vezes que caiu", "Times you went down", "Veces que caíste"],
  ["Naves no hangar", "Ships in the hangar", "Naves en el hangar"],
  ["Amuletos", "Relics", "Reliquias"],
  ["Maior onda na arena", "Best arena wave", "Mejor oleada en la arena"],
  ["Fases no cooperativo", "Co-op levels", "Niveles en cooperativo"],
  ["Missões cumpridas", "Quests completed", "Misiones cumplidas"],
  ["Conquistas", "Achievements", "Logros"],
  ["DANO", "DAMAGE", "DAÑO"],
  ["VIDA", "HEALTH", "VIDA"],
  ["CAD.", "RATE", "CAD."],
  ["NAVE", "SHIP", "NAVE"],
  ["NOME", "NAME", "NOMBRE"],
  ["CADÊNCIA", "FIRE RATE", "CADENCIA"],
  ["PRÓXIMA", "NEXT", "SIGUIENTE"],
  ["COMPLETO", "COMPLETE", "COMPLETO"],
  ["AQUI", "HERE", "AQUÍ"],
  ["CHEFE", "BOSS", "JEFE"],
  ["árvore", "skill tree", "árbol"],
  ["nenhuma", "none yet", "ninguna"],
  ["VIP e passes", "VIP and passes", "VIP y pases"],
  ["sem fim", "endless", "sin fin"],
  ["equipados", "equipped", "equipadas"],
  ["no total", "in total", "en total"],
  ["ponto", "point", "punto"],
  ["pontos", "points", "puntos"],
  ["Sem conexão com a nuvem agora.", "No connection to the cloud right now.", "Sin conexión con la nube ahora."],
  ["Entre com um piloto primeiro.", "Sign in with a pilot first.", "Entra con un piloto primero."],
  ["Escreva o nick do seu amigo.", "Type your friend's nickname.", "Escribe el apodo de tu amigo."],
  ["Esse é você mesmo.", "That's you.", "Ese eres tú."],
  ["Vocês já são amigos.", "You're already friends.", "Ya sois amigos."],
  ["O modo online está desligado neste aparelho.",
   "Online mode is off on this device.",
   "El modo en línea está apagado en este aparato."]
];

/* ---------------------------------------------------------------------
   Frases com número no meio não cabem numa tabela: "Fase 30 de 270" tem
   infinitas formas. Estas regras traduzem o MOLDE e devolvem os números
   no lugar certo.
   --------------------------------------------------------------------- */
const MOLDES = [
  { re: /^Fase (\d+) de (\d+)( · (\d+)%)?$/,
    en: m => "Level " + m[1] + " of " + m[2] + (m[3] ? " · " + m[4] + "%" : ""),
    es: m => "Nivel " + m[1] + " de " + m[2] + (m[3] ? " · " + m[4] + "%" : "") },
  { re: /^ONDA (\d+)\/(\d+)$/,
    en: m => "WAVE " + m[1] + "/" + m[2],
    es: m => "OLEADA " + m[1] + "/" + m[2] },
  { re: /^FASE (\d+)$/, en: m => "LEVEL " + m[1], es: m => "NIVEL " + m[1] },
  { re: /^FASE (\d+) CONCLUÍDA$/, en: m => "LEVEL " + m[1] + " COMPLETE", es: m => "NIVEL " + m[1] + " COMPLETADO" },
  { re: /^(\d+) ponto$/, en: m => m[1] + " point", es: m => m[1] + " punto" },
  { re: /^(\d+) pontos$/, en: m => m[1] + " points", es: m => m[1] + " puntos" },
  { re: /^(\d+)\/3 equipados · (\d+) no total$/,
    en: m => m[1] + "/3 equipped · " + m[2] + " in total",
    es: m => m[1] + "/3 equipadas · " + m[2] + " en total" },
  { re: /^\+([\d.]+) cristais$/, en: m => "+" + m[1] + " crystals", es: m => "+" + m[1] + " cristales" },
  { re: /^\+([\d.]+) cristais recuperados$/,
    en: m => "+" + m[1] + " crystals recovered",
    es: m => "+" + m[1] + " cristales recuperados" },
  { re: /^(\d+) vitórias · (\d+) derrotas$/,
    en: m => m[1] + " wins · " + m[2] + " losses",
    es: m => m[1] + " victorias · " + m[2] + " derrotas" },
  { re: /^(\d+) pontos de rank$/,
    en: m => m[1] + " rank points", es: m => m[1] + " puntos de rango" },
  { re: /^(\d+) na fila$/, en: m => m[1] + " in queue", es: m => m[1] + " en la cola" },
  { re: /^Derrube (\d+) inimigos$/,
    en: m => "Take down " + m[1] + " enemies", es: m => "Derriba " + m[1] + " enemigos" },
  { re: /^Passe (\d+) fases?$/,
    en: m => "Clear " + m[1] + " level" + (m[1] === "1" ? "" : "s"),
    es: m => "Supera " + m[1] + " nivel" + (m[1] === "1" ? "" : "es") },
  { re: /^Derrote (\d+) chefes?$/,
    en: m => "Defeat " + m[1] + " boss" + (m[1] === "1" ? "" : "es"),
    es: m => "Derrota " + m[1] + " jefe" + (m[1] === "1" ? "" : "s") },
  { re: /^Destrua (\d+) naves pesadas$/,
    en: m => "Destroy " + m[1] + " heavy ships", es: m => "Destruye " + m[1] + " naves pesadas" },
  { re: /^Jogue (\d+) fases? no cooperativo$/,
    en: m => "Play " + m[1] + " level" + (m[1] === "1" ? "" : "s") + " in co-op",
    es: m => "Juega " + m[1] + " nivel" + (m[1] === "1" ? "" : "es") + " en cooperativo" },
  { re: /^Faça um combo de (\d+) abates$/,
    en: m => "Get a combo of " + m[1] + " kills", es: m => "Haz un combo de " + m[1] + " bajas" },
  { re: /^Ganhe (\d+) estrelas? nas fases$/,
    en: m => "Earn " + m[1] + " star" + (m[1] === "1" ? "" : "s") + " in the levels",
    es: m => "Consigue " + m[1] + " estrella" + (m[1] === "1" ? "" : "s") + " en los niveles" }
];
function moldeTraduzir(txt) {
  for (const M of MOLDES) {
    const m = M.re.exec(txt);
    if (m) { const f = M[IDIOMA]; if (f) return f(m); }
  }
  return null;
}

/* tabela pronta para consulta rápida */
const DIC = { en: {}, es: {} };
for (const f of FRASES) {
  if (f[1]) DIC.en[f[0]] = f[1];
  if (f[2]) DIC.es[f[0]] = f[2];
}

/* T("frase em português") devolve a frase no idioma de agora */
function T(pt) {
  if (IDIOMA === "pt" || !pt) return pt;
  const d = DIC[IDIOMA];
  if (!d) return pt;
  const limpo = String(pt).trim();
  let traduzido = d[limpo];
  if (!traduzido) traduzido = moldeTraduzir(limpo);
  if (!traduzido) return pt;
  /* preserva os espaços que existiam em volta */
  return String(pt).replace(limpo, traduzido);
}

/* ---------------------------------------------------------------------
   O tradutor da tela: percorre o que apareceu e troca o texto. O texto
   original em português fica guardado, para dar sempre para voltar.
   --------------------------------------------------------------------- */
const ORIGINAIS = new WeakMap();
const ATRIBUTOS = ["placeholder", "aria-label", "title"];
let traduzindo = false;
let observador = null;

function traduzirNo(no) {
  if (no.nodeType === 3) {          /* texto */
    const pai = no.parentNode;
    if (pai && (pai.tagName === "SCRIPT" || pai.tagName === "STYLE")) return;
    let original = ORIGINAIS.get(no);
    if (original === undefined) { original = no.nodeValue; ORIGINAIS.set(no, original); }
    const novo = IDIOMA === "pt" ? original : T(original);
    if (no.nodeValue !== novo) no.nodeValue = novo;
    return;
  }
  if (no.nodeType !== 1) return;    /* só elementos daqui para baixo */
  for (const a of ATRIBUTOS) {
    if (!no.hasAttribute || !no.hasAttribute(a)) continue;
    const guardado = "data-pt-" + a;
    let original = no.getAttribute(guardado);
    if (original === null) { original = no.getAttribute(a); no.setAttribute(guardado, original); }
    const novo = IDIOMA === "pt" ? original : T(original);
    if (no.getAttribute(a) !== novo) no.setAttribute(a, novo);
  }
  for (let f = no.firstChild; f; f = f.nextSibling) traduzirNo(f);
}
function traduzirTela(raiz) {
  if (traduzindo) return;
  traduzindo = true;
  try { traduzirNo(raiz || document.body); } catch (e) {}
  traduzindo = false;
}
/* o jogo monta tela nova o tempo todo; o observador traduz o que nasce */
function idiomaObservar() {
  if (observador) observador.disconnect();
  if (IDIOMA === "pt") { observador = null; return; }
  observador = new MutationObserver(regs => {
    if (traduzindo) return;
    traduzindo = true;
    try {
      for (const r of regs) {
        if (r.type === "characterData") { traduzirNo(r.target); continue; }
        for (const n of r.addedNodes) traduzirNo(n);
      }
    } catch (e) {}
    traduzindo = false;
  });
  observador.observe(document.body, { childList: true, subtree: true, characterData: true });
}
function idiomaUsar(id) {
  if (!IDIOMAS.some(x => x.id === id)) return;
  IDIOMA = id;
  try { storageSet("nn_idioma", id); } catch (e) {}
  try { document.documentElement.lang = id === "pt" ? "pt-BR" : id; } catch (e) {}
  traduzirTela(document.body);
  idiomaObservar();
}
function idiomaCarregar() {
  let id = null;
  try { id = storageGet("nn_idioma", ""); } catch (e) {}
  if (!id) {
    /* primeira vez: segue o idioma do celular */
    const n = (navigator.language || "pt").toLowerCase();
    id = n.indexOf("es") === 0 ? "es" : n.indexOf("en") === 0 ? "en" : "pt";
  }
  IDIOMA = IDIOMAS.some(x => x.id === id) ? id : "pt";
  try { document.documentElement.lang = IDIOMA === "pt" ? "pt-BR" : IDIOMA; } catch (e) {}
  if (IDIOMA !== "pt") { traduzirTela(document.body); idiomaObservar(); }
}
/* o idioma é lido assim que a tabela existe — nunca antes */
setTimeout(() => { try { idiomaCarregar(); } catch (e) {} }, 0);
/* a abertura toca uma vez só, na primeiríssima abertura do jogo */
setTimeout(() => { try { aberturaTocar(); } catch (e) {} }, 300);
function idiomaRender() {
  const cx = $("aj-idioma");
  if (!cx) return;
  cx.innerHTML =
    '<div class="aj-titulo">🌎 IDIOMA</div>' +
    '<div class="idi-grade">' +
      IDIOMAS.map(l => '<button class="idi-cx' + (IDIOMA === l.id ? " on" : "") +
        '" data-idi="' + l.id + '"><b>' + l.bandeira + "</b><span>" + l.nome + "</span></button>").join("") +
    "</div>" +
    '<div class="adm-note" style="margin-top:8px">' +
      (IDIOMA === "pt" ? "O jogo está em português."
        : "Parte do jogo ainda aparece em português: o que não foi traduzido fica como está, " +
          "em vez de sumir.") + "</div>";
  cx.querySelectorAll("[data-idi]").forEach(b =>
    b.addEventListener("click", () => {
      idiomaUsar(b.getAttribute("data-idi"));
      ajRender();
      try { AudioSys.gem(); } catch (e) {}
    }));
}


