
"use strict";
/* ---------- Estado da partida ---------- */
const S = {
  mode: "login",          // login | adm | menu | levels | shop | hangar | oficina | reliquias | tree | cutscene | playing | paused | victory | gameover
  fase: 1, nWaves: 3, waveIdx: 1,
  score: 0, runGems: 0, shake: 0, time: 0,
  banner: null,
  waveState: "spawning", toSpawn: 0, spawnTimer: 0, spawnInterval: 1, interTimer: 0,
  ultCharge: 0,
  furyT: 0, hiveT: 0,
  barrage: null,          // {waves, timer}
  singu: null,            // {x, y, t}
  cut: null,              // {ship, t, back}
  uiTick: 0
};

const player = {
  x: 0, y: 0, tx: 0, ty: 0, r: 16,
  lives: 3, weapon: 1,
  fireTimer: 0, missileTimer: 0, invuln: 0, shield: 0, noShieldTime: 0,
  revivesUsed: 0, invis: 0, cloakCd: 0,
  droneFire: 0, droneX: 0, droneY: 0,
  alive: true, deadTimer: 0, tilt: 0
};

let bullets = [], enemyBullets = [], enemies = [], missilesArr = [], powerups = [], particles = [], texts = [];
/* tropas chamadas pelo Ômega-9: tanques, soldados, aviões e helicópteros */
let aliados = [], obuses = [], laserOrbital = null;
let raios = [];   // clarões verticais do Selo do Juízo
let bombas = [], buracos = [], fogo = [], rasante = null;
let boss = null;
let stars = [];

function makeStars() {
  stars = [];
  const n = (typeof qEstrelas === "function") ? qEstrelas() : 90;
  for (let i = 0; i < n; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, z: Math.random() });
}
makeStars();

/* ---------- Parâmetros de fase ---------- */
const FASES_COOP = TOTAL_FASES;   // a jornada em dupla vai até o fim, igual ao solo
/* ---------------------------------------------------------------------
   Dificuldade
   Nos modos com outra gente (cooperativo, arena, ranqueada) todo mundo
   joga no MÉDIO, para ninguém levar vantagem.
   --------------------------------------------------------------------- */
const DIFICULDADES = [
  { id: "facil",   nome: "FÁCIL",   icone: "○",
    desc: "Menos inimigos e mais fracos. Bom para aprender as fases.",
    qtd: 0.7,  vida: 0.75, vel: 0.85, tiro: 0.75, ondas: 0.75, premio: 0.8, cor: "#7CF7C0" },
  { id: "medio",   nome: "MÉDIO",   icone: "◐",
    desc: "O jogo do jeito que foi feito. É o usado no online.",
    qtd: 1,    vida: 1,    vel: 1,    tiro: 1,    ondas: 1,    premio: 1,   cor: "#4DE8FF" },
  { id: "dificil", nome: "DIFÍCIL", icone: "●",
    desc: "Muito mais inimigos, mais duros e mais rápidos — e prêmio bem maior.",
    qtd: 1.45, vida: 1.35, vel: 1.15, tiro: 1.3,  ondas: 1.3,  premio: 1.6, cor: "#FF5252" }
];
function dificuldadeAtual() {
  if (typeof MP !== "undefined" && MP && MP.sala) return DIFICULDADES[1];   // online: todos iguais
  const id = (typeof save !== "undefined" && save && save.dificuldade) || "medio";
  return DIFICULDADES.find(d => d.id === id) || DIFICULDADES[1];
}

function totalFasesDoModo() {
  if (typeof MP !== "undefined" && MP && MP.modo === "arena") return 999999;   // sem fim
  return TOTAL_FASES;   // a jornada em dupla tem as mesmas 270 fases do solo
}
function faseWaves(f)  {
  if (typeof MP !== "undefined" && MP && MP.modo === "arena") return 1;
  const D = dificuldadeAtual();
  if (typeof MP !== "undefined" && MP && MP.modo === "coop") {
    return Math.min(24, 3 + Math.floor((f - 1) / 14));
  }
  // quanto mais fundo no jogo, mais ondas por fase (até 20)
  const base = 3 + Math.floor((f - 1) / 16);
  return Math.max(2, Math.min(20, Math.round(base * D.ondas)));
}
function isBossFase(f) {
  if (typeof MP !== "undefined" && MP && MP.modo === "coop") return f % 4 === 0;   // chefe a cada 4 fases
  return f % 5 === 0;
}
function faseReward(f) { return 20 + f * 4 + Math.round(f * f * 0.05); }
function dLevel()      { return S.fase + S.waveIdx; }

/* ---------- DOM ---------- */
const $ = id => document.getElementById(id);
const hud = $("hud");
const hudScore = $("hud-score"), hudGems = $("hud-gems"), hudFase = $("hud-fase"),
      hudFaseLabel = $("hud-fase-label"), hudLives = $("hud-lives");
const ultBtn = $("ult-btn"), cloakBtn = $("cloak-btn"), cutSkip = $("cut-skip");
const SCREENS = {
  login: $("screen-login"), adm: $("screen-adm"),
  menu: $("screen-menu"), levels: $("screen-levels"), shop: $("screen-shop"),
  hangar: $("screen-hangar"), oficina: $("screen-oficina"), reliquias: $("screen-reliquias"),
  amigos: $("screen-amigos"), chat: $("screen-chat"), loja: $("screen-loja"),
  suporte: $("screen-suporte"),
  tree: $("screen-tree"), rank: $("screen-rank"), senha: $("screen-senha"),
  multi: $("screen-multi"), sala: $("screen-sala"), jornada: $("screen-jornada"),
  pagar: $("screen-pagar"),
  novidades: $("screen-novidades"),
  ajustes: $("screen-ajustes"), missoes: $("screen-missoes"),
  perfil: $("screen-perfil"), conquistas: $("screen-conquistas"), convite: $("screen-convite"),
  comparar: $("screen-comparar"), mapa: $("screen-mapa"), cla: $("screen-cla"),
  arena: $("screen-arena"), ranked: $("screen-ranked"), construtor: $("screen-construtor"),
  pause: $("screen-pause"), victory: $("screen-victory"), over: $("screen-over")
};
function showScreen(name) {
  if (name !== "senha" && senhaEstado) senhaEstado = null;
  for (const k in SCREENS) SCREENS[k].classList.toggle("show", k === name);
  hud.style.display = (name === null) ? "grid" : "none";
  $("god-badge").style.display = (name === null && save.godMode) ? "block" : "none";
  if (name !== null) $("hab-bar").style.display = "none";
  const dica = $("pc-dica");
  if (dica) dica.style.display = (name === null && modoPC) ? "block" : "none";
  cutSkip.style.display = (name === "cut") ? "block" : "none";
  if (name === "cut") for (const k in SCREENS) SCREENS[k].classList.remove("show");
}
let hudOndasMarca = "";
let hudSujo = false;
/* marca que o painel mudou; quem escreve de verdade é o laço do jogo */
function updateHud() {
  if (S.mode === "playing") { hudSujo = true; return; }
  hudEscrever();
}
function hudAgora() {
  if (!hudSujo) return;
  hudSujo = false;
  hudEscrever();
}
function hudEscrever() {
  hudScore.textContent = fmt(S.score);
  hudGems.textContent = "◆ " + fmt(S.runGems);
  hudFaseLabel.textContent = "ONDA " + Math.min(S.waveIdx, S.nWaves) + "/" + S.nWaves;
  hudFase.textContent = arenaModo() ? "ARENA " + S.fase : "FASE " + S.fase;
  /* tracinhos das ondas: um por onda, o de agora aceso em dourado.
     Se a fase tiver ondas demais, mostra só as dez em volta da atual. */
  const cxOndas = $("hud-ondas");
  if (cxOndas) {
    const total = Math.max(1, S.nWaves);
    const atual = clamp(S.waveIdx, 1, total);
    const chefe = isBossFase(S.fase);
    const marca = total + "|" + atual + "|" + (chefe ? 1 : 0);
    if (marca !== hudOndasMarca) {
      hudOndasMarca = marca;
      let de = 1, ate = total;
      if (total > 10) { de = clamp(atual - 4, 1, total - 9); ate = de + 9; }
      let html = "";
      for (let k = de; k <= ate; k++) {
        const ehChefe = chefe && k === total;
        html += '<i class="' + (ehChefe ? "chefe " : "") +
                (k < atual ? "feita" : k === atual ? "agora" : "") + '"></i>';
      }
      cxOndas.innerHTML = html;
    }
  }
  hudLives.textContent = "♥".repeat(Math.max(0, player.lives));
  const hpEl = $("hud-hp-fill");
  if (hpEl && ST) {
    const frac = clamp(player.hp / ST.maxHp, 0, 1);
    hpEl.style.width = (frac * 100) + "%";
    hpEl.classList.toggle("baixo", frac < 0.35);
    $("hud-hp-txt").textContent = Math.max(0, Math.ceil(player.hp)) + " / " + ST.maxHp;
  }
}
function ultBtnSync() {
  const pct = Math.round(S.ultCharge * 100);
  const ready = S.ultCharge >= 1;
  ultBtn.classList.toggle("ready", ready);
  ultBtn.style.background = ready
    ? "conic-gradient(#4DE8FF 360deg, rgba(10,18,40,.7) 0deg)"
    : "conic-gradient(rgba(77,232,255,.85) " + (pct * 3.6) + "deg, rgba(10,18,40,.75) 0deg)";
  ultBtn.textContent = ready ? "ULT!" : pct + "%";
}
function addUlt(v) {
  if (S.mode !== "playing" || !player.alive) return;
  const was = S.ultCharge;
  S.ultCharge = clamp(S.ultCharge + v * ST.ultRate, 0, 1);
  if (S.ultCharge >= 1 && was < 1) AudioSys.ultReady();
  ultBtnSync();
}
let ultimaChecagemPresente = 0;
function checarPresentesPeriodicamente() {
  if (!nuvemAtiva() || !save.__name) return;
  // nada de aplicar presente na tela de login ou de senha
  if (S.mode === "login" || S.mode === "senha" || S.mode === "adm") return;
  const agora = Date.now();
  if (agora - ultimaChecagemPresente < 12000) return;
  ultimaChecagemPresente = agora;
  nuvemVerificarPresentes();
}
setInterval(checarPresentesPeriodicamente, 6000);

function refreshMenu() {
  try {
    diariaRender(); misBadge(); conqBadge(); faltaRender();
    vipAvisoRender();
    const br = $("br-rec");
    if (br) { br.textContent = save.bossRushRec ? fmt(save.bossRushRec) : ""; br.className = save.bossRushRec ? "on" : ""; }
  } catch (e) {}
  const h = $("menu-hello");
  h.childNodes[0] ? (h.childNodes[0].nodeValue = minhaTag()) : (h.textContent = minhaTag());
  document.querySelector(".piloto-cartao").classList.toggle("vip", temVip());
  // presente do VIP: uma vez por dia, ao abrir o menu
  try {
    const g = vipPresenteDoDia();
    if (g > 0) {
      const av = $("presente-aviso");
      if (av) {
        av.style.display = "block";
        av.textContent = "👑 Presente VIP do dia: +" + fmt(g) + " cristais!";
        setTimeout(() => { av.style.display = "none"; }, 8000);
      }
      AudioSys.buy();
    }
  } catch (e) {}
  const online = nuvemAtiva();
  $("menu-online").style.display = online ? "grid" : "none";
  $("menu-online-h").style.display = online ? "block" : "none";
  $("btn-ranked").style.display = RANKED_LIGADO ? "" : "none";
  nuvemMostrarStatus();
  porCristais("menu-gems");
  $("menu-progress").textContent = save.best + "/" + TOTAL_FASES;
  $("menu-hi").textContent = fmt(save.hi);

  // rank e barra de progresso das fases
  const pts = save.rank || 0;
  const r = $("menu-rank");
  r.textContent = simboloDoRank(pts) + " " + nomeDoRank(pts);
  r.style.color = corDoRank(pts);
  const frac = clamp((save.best || 0) / TOTAL_FASES, 0, 1);
  $("menu-barra").style.width = (frac * 100) + "%";
  $("menu-meta").textContent = "Fase " + (save.best || 0) + " de " + TOTAL_FASES +
    " · " + Math.round(frac * 100) + "%";

  // nave atual desenhada no cartão
  try {
    const cv = $("menu-nave");
    const c2 = cv.getContext("2d");
    c2.setTransform(1, 0, 0, 1, 0, 0);
    c2.clearRect(0, 0, cv.width, cv.height);
    c2.setTransform(2.2, 0, 0, 2.2, cv.width / 2, cv.height / 2 + 6);
    drawShipSprite(c2, naveValida(save.ship), 15);
  } catch (e) {}

  const avail = ptsAvailable();
  $("menu-pts-badge").textContent = avail > 0 ? avail + " ponto" + (avail > 1 ? "s" : "") : "árvore";
  $("menu-ship-badge").textContent = (SHIPS[naveValida(save.ship)] || SHIPS[0]).name;
  $("menu-amu-badge").textContent = save.amulets.length
    ? save.equipped.length + "/3 equipados · " + save.amulets.length + " no total"
    : "nenhuma";
  /* acerta a grade quando algum atalho está escondido */
  for (const g of document.querySelectorAll("#screen-menu .menu-grade")) {
    const vis = [...g.children].filter(e => getComputedStyle(e).display !== "none");
    g.classList.toggle("impar", vis.length % 2 === 1);
  }
  const lb = $("menu-loja-badge");
  if (lb) lb.textContent = temVip() ? "VIP · " + vipDiasQueFaltam() + "d" : "VIP e passes";
  const bl = $("btn-loja");
  if (bl) bl.classList.toggle("vip", temVip());
  const totalUp = UPGRADES.reduce((a, u) => a + u.max, 0);
  const meusUp = UPGRADES.reduce((a, u) => a + (save.upgrades[u.id] || 0), 0);
  $("menu-up-badge").textContent = meusUp + "/" + totalUp;

  /* ponto pulsante nos atalhos que têm algo esperando você:
     ponto de habilidade sobrando, melhoria que dá para comprar agora,
     nave nova ao alcance ou relíquia sem equipar.                      */
  const daParaComprar = UPGRADES.some(u =>
    (save.upgrades[u.id] || 0) < u.max && save.crystals >= upgradeCost(u, save.upgrades[u.id] || 0));
  const naveNova = SHIPS.some((sh, i) =>
    !shipOwned(i) && !naveExclusiva(i) && save.crystals >= sh.price);
  const reliquiaSolta = save.amulets.length > (save.equipped || []).length &&
    (save.equipped || []).length < espacosDeReliquia();
  const marca = (id, tem) => { const el = $(id); if (el) el.classList.toggle("tem", !!tem); };
  marca("btn-tree", avail > 0);
  marca("btn-shop", daParaComprar);
  marca("btn-hangar", naveNova);
  marca("btn-reliquias", reliquiaSolta);
  const nb = $("nov-badge");
  if (nb) nb.classList.toggle("on", novidadesNovas());
  if (typeof arenaAtualizarSelo === "function") arenaAtualizarSelo();
}
$("btn-mute").textContent = AudioSys.muted ? "✕" : "♪";

/* ---------- Login ---------- */
function renderLogin() {
  const list = $("profile-list");
  list.innerHTML = "";
  const names = Object.keys(ROOT.profiles);
  if (names.length === 0) {
    const hint = document.createElement("div");
    hint.className = "adm-note";
    hint.style.textAlign = "center";
    hint.textContent = "Crie o primeiro piloto abaixo para começar.";
    list.appendChild(hint);
  }
  for (const name of names) {
    const p = ROOT.profiles[name];
    const b = document.createElement("button");
    b.className = "profile-btn";
    const ini = (name.trim()[0] || "?").toUpperCase();
    b.innerHTML =
      '<span class="profile-ini">' + escaparTexto(ini) + '</span>' +
      '<span class="profile-txt">' +
        '<span class="profile-name">' + escaparTexto(name) + '</span>' +
        '<span class="profile-meta">Fase ' + (p.best || 0) + ' · ◆ ' + fmt(p.crystals || 0) + '</span>' +
      '</span>' +
      '<span class="profile-seta">›</span>';
    b.addEventListener("click", () => {
      AudioSys.resume();
      entrarComPiloto(name);
    });
    list.appendChild(b);
  }
}
function mostrarAvisoLimpeza() {
  if (!avisoLimpeza) return;
  const el = $("presente-aviso");
  if (!el) { avisoLimpeza = 0; return; }
  el.textContent = "🛠 As naves que você montou foram desmontadas: elas estavam " +
    "desequilibradas. Devolvemos ◆ " + fmt(avisoLimpeza) +
    " para você montar de novo com as regras certas.";
  el.style.display = "block";
  setTimeout(() => { el.style.display = "none"; }, 15000);
  avisoLimpeza = 0;
}
function entrarNoMenu(name) {
  loginAs(name);
  ligarBatimento();
  setTimeout(() => { try { sugEnviarPendentes(); } catch (e) {} }, 2500);
  try { mundoLigar(); } catch (e) {}
  try { cenaEscutarPedidos(); } catch (e) {}
  atualizarModoPC();
  S.mode = "menu";
  refreshMenu();
  showScreen("menu");
  nuvemEnviar(true);
  // aplica o que estiver esperando e abre a caixa já dentro do menu
  setTimeout(mostrarAvisoLimpeza, 500);
  nuvemVerificarPresentes().then(() => {
    if (presenteGuardado && presenteGuardado.length) setTimeout(mostrarCaixaPresente, 400);
  });
}
/* =====================================================================
   CONTAS SEM SENHA
   ---------------------------------------------------------------------
   Estas entram direto: não pedem para desenhar o padrão nem na criação
   nem na entrada, e nem sincronizando de outro aparelho. Serve para
   conta de teste ou emprestada, que passa de mão em mão.
   O nome não diferencia maiúscula de minúscula.
   ===================================================================== */
const CONTAS_SEM_SENHA = ["7anoS"];
function contaSemSenha(nome) {
  const n = String(nome || "").trim().toLowerCase();
  return CONTAS_SEM_SENHA.some(x => x.toLowerCase() === n);
}

function entrarComPiloto(name) {
  const p = ROOT.profiles[name];
  if (!p) return;
  // conta liberada: entra sem desenhar nada
  if (contaSemSenha(name)) { entrarNoMenu(name); return; }
  if (!p.senha) {
    // conta antiga: agora toda conta precisa de senha
    abrirSenha("criar", name, (ok, hash) => {
      if (!ok) return;
      p.senha = hash;
      p.savedAt = Date.now();
      persist();
      entrarNoMenu(name);
    });
    senhaEstado.migrar = true;
    senhaAtualizarTexto();
    return;
  }
  // se a pessoa marcou "continuar conectado" neste aparelho, entra direto
  if (pilotoLembrado() === name) { entrarNoMenu(name); return; }
  abrirSenha("verificar", name, () => {
    if (senhaLembrar()) lembrarPiloto(name);
    entrarNoMenu(name);
  });
}

/* ---------------------------------------------------------------------
   Continuar conectado no jogo: guarda só o nome do piloto neste
   aparelho, para não ter de desenhar a senha toda vez que abrir.
   Some ao tocar em TROCAR DE PILOTO.
   --------------------------------------------------------------------- */
function pilotoLembrado() { return storageGet("nn_lembrado", "") || ""; }
function lembrarPiloto(nome) { storageSet("nn_lembrado", nome || ""); }
function esquecerPiloto() { storageSet("nn_lembrado", ""); }
function senhaLembrar() {
  const c = $("senha-lembrar");
  return !c || c.checked;
}

function avisoLogin(txt, tipo) {
  const el = $("login-aviso");
  el.textContent = txt;
  el.className = "login-aviso" + (tipo ? " " + tipo : "");
}

/* Entrar pelo nome: procura primeiro neste aparelho, depois na nuvem.
   Assim dá para usar a mesma conta em qualquer celular.                   */
$("btn-entrar").addEventListener("click", async () => {
  AudioSys.resume();
  const nome = ($("login-nome").value || "").trim();
  if (!nome) { avisoLogin("Digite o nome da sua conta.", "erro"); return; }

  const local = ROOT.profiles[nome];
  if (local) { $("login-nome").value = ""; entrarComPiloto(nome); return; }

  /* conta liberada que ainda não existe neste aparelho: cria ou puxa da
     nuvem, sem pedir senha em momento nenhum */
  if (contaSemSenha(nome)) {
    if (nuvemAtiva()) {
      avisoLogin("Procurando a conta…");
      const c2 = await contaBuscar(nome);
      if (c2) {
        ROOT.profiles[c2.nome || nome] = mergeSave(c2.save || {});
        persist();
        $("login-nome").value = "";
        avisoLogin("Bem-vindo de volta!", "ok");
        entrarNoMenu(c2.nome || nome);
        return;
      }
    }
    ROOT.profiles[nome] = defaultSave();
    persist();
    $("login-nome").value = "";
    AudioSys.buy();
    entrarNoMenu(nome);
    return;
  }

  if (!nuvemAtiva()) {
    avisoLogin("Não existe conta com esse nome neste aparelho.", "erro");
    AudioSys.deny();
    return;
  }
  avisoLogin("Procurando a conta…");
  const conta = await contaBuscar(nome);
  if (!conta || !conta.senha) {
    avisoLogin("Conta não encontrada. Confira o nome ou crie uma nova.", "erro");
    AudioSys.deny();
    return;
  }
  avisoLogin("Conta encontrada! Desenhe a senha para entrar.", "ok");
  abrirSenha("verificar", conta.nome || nome, () => {});
  // a verificação é contra a senha guardada na nuvem
  senhaEstado.senhaEsperada = conta.senha;
  senhaEstado.aoTerminar = () => {
    ROOT.profiles[conta.nome || nome] = mergeSave(conta.save || {});
    ROOT.profiles[conta.nome || nome].senha = conta.senha;
    persist();
    $("login-nome").value = "";
    avisoLogin("Bem-vindo de volta!", "ok");
    if (senhaLembrar()) lembrarPiloto(conta.nome || nome);
    entrarNoMenu(conta.nome || nome);
  };
});
$("login-nome").addEventListener("keydown", e => { if (e.key === "Enter") $("btn-entrar").click(); });

$("btn-new").addEventListener("click", () => {
  AudioSys.resume();
  const name = $("new-name").value.trim();
  if (!name) return;
  if (ROOT.profiles[name]) { $("new-name").value = ""; return; }
  /* filtro: nada de se passar por administrador nem palavrão no nome */
  const filtro = nomePermitido(name);
  if (!filtro.ok) {
    const aviso = $("login-aviso") || $("new-name");
    if (aviso && aviso.tagName !== "INPUT") { aviso.textContent = filtro.msg; }
    else { $("new-name").value = ""; $("new-name").placeholder = filtro.msg; }
    AudioSys.deny();
    return;
  }
  // conta liberada: nasce sem senha e entra na hora
  if (contaSemSenha(name)) {
    ROOT.profiles[name] = defaultSave();
    $("new-name").value = "";
    AudioSys.buy();
    entrarNoMenu(name);
    return;
  }
  abrirSenha("criar", name, (ok, hash) => {
    if (!ok) return;
    ROOT.profiles[name] = defaultSave();
    ROOT.profiles[name].senha = hash;
    $("new-name").value = "";
    AudioSys.buy();
    lembrarPiloto(name);
    entrarNoMenu(name);
  });
});
$("btn-logout").addEventListener("click", () => {
  esquecerPiloto();
  persist();
  S.mode = "login";
  renderLogin();
  showScreen("login");
});

/* ---------- Senha desenho (padrão de 3x3) ----------
   O desenho vira uma sequência de pontos (ex.: 0-1-2-5-8) e é guardada
   embaralhada, nunca em texto puro.                                        */
const senhaCanvas = $("senha-canvas");
const senhaCtx2 = senhaCanvas.getContext("2d");
let senhaEstado = null;   // { modo, nome, primeira, aoTerminar, seq, desenhando, px, py }

function senhaHash(seq) { return admHash("nn|" + seq.join("-")); }

function abrirSenha(modo, nome, aoTerminar) {
  senhaEstado = { modo, nome, primeira: null, aoTerminar, seq: [], desenhando: false, px: 0, py: 0 };
  S.mode = "senha";
  // a opção de continuar conectado só faz sentido ao ENTRAR
  const linha = $("senha-lembrar-linha");
  if (linha) linha.style.display = (modo === "verificar") ? "flex" : "none";
  senhaAtualizarTexto();
  showScreen("senha");
  requestAnimationFrame(desenharSenha);
}
function senhaAtualizarTexto(erro) {
  const e = senhaEstado;
  if (!e) return;
  const tit = $("senha-titulo"), dica = $("senha-dica"), tag = $("senha-tag");
  dica.classList.toggle("erro", !!erro);
  if (erro) { dica.textContent = erro; return; }
  if (e.modo === "verificar") {
    tag.textContent = "Entrar";
    tit.textContent = "SENHA DE " + String(e.nome).toUpperCase();
    dica.textContent = "Desenhe a sua senha para entrar.";
  } else if (e.modo === "criar") {
    tag.textContent = e.migrar ? "Nova exigência" : "Nova conta";
    tit.textContent = "CRIE SUA SENHA";
    dica.textContent = e.migrar
      ? "Agora toda conta precisa de senha. Ligue pelo menos 4 pontos e guarde bem o desenho."
      : "Ligue pelo menos 4 pontos sem soltar o dedo.";
  } else {
    tag.textContent = "Confirmação";
    tit.textContent = "REPITA A SENHA";
    dica.textContent = "Desenhe o mesmo padrão de novo para confirmar.";
  }
  senhaPontinhos();
}
function senhaPontinhos() {
  const e = senhaEstado;
  const box = $("senha-pontos");
  box.innerHTML = "";
  const n = e ? e.seq.length : 0;
  for (let i = 0; i < Math.max(4, n); i++) {
    const d = document.createElement("span");
    d.className = "senha-pt" + (i < n ? " on" : "");
    box.appendChild(d);
  }
}
function senhaPos(i) {
  const col = i % 3, lin = Math.floor(i / 3);
  return { x: 120 + col * 180, y: 120 + lin * 180 };
}
function desenharSenha() {
  if (S.mode !== "senha" || !senhaEstado) return;
  const g = senhaCtx2, e = senhaEstado;
  g.clearRect(0, 0, 600, 600);
  g.lineCap = "round";
  g.lineJoin = "round";
  // linhas já feitas: um risco grosso de luz com um brilho por baixo
  if (e.seq.length > 1) {
    const traco = () => {
      g.beginPath();
      const p0 = senhaPos(e.seq[0]);
      g.moveTo(p0.x, p0.y);
      for (let k = 1; k < e.seq.length; k++) {
        const pk = senhaPos(e.seq[k]);
        g.lineTo(pk.x, pk.y);
      }
      g.stroke();
    };
    g.strokeStyle = "rgba(77,232,255,.22)";
    g.lineWidth = 22;
    traco();
    g.strokeStyle = "rgba(140,244,255,.95)";
    g.lineWidth = 8;
    traco();
  }
  g.lineWidth = 8;
  // linha até o dedo
  if (e.desenhando && e.seq.length) {
    const ul = senhaPos(e.seq[e.seq.length - 1]);
    g.strokeStyle = "rgba(77,232,255,.4)";
    g.beginPath();
    g.moveTo(ul.x, ul.y);
    g.lineTo(e.px, e.py);
    g.stroke();
  }
  // pontos: os apagados são discretos, o aceso ganha halo e miolo cheio
  const pulso = 1 + Math.sin(Date.now() / 260) * 0.06;
  for (let i = 0; i < 9; i++) {
    const pt = senhaPos(i);
    const aceso = e.seq.indexOf(i) >= 0;
    const ordem = e.seq.indexOf(i);
    if (aceso) {
      const gr = g.createRadialGradient(pt.x, pt.y, 4, pt.x, pt.y, 46);
      gr.addColorStop(0, "rgba(77,232,255,.42)");
      gr.addColorStop(1, "rgba(77,232,255,0)");
      g.fillStyle = gr;
      g.beginPath(); g.arc(pt.x, pt.y, 46, 0, TAU); g.fill();
    }
    g.beginPath();
    g.arc(pt.x, pt.y, (aceso ? 30 : 20) * (aceso ? pulso : 1), 0, TAU);
    g.fillStyle = aceso ? "rgba(77,232,255,.2)" : "rgba(237,243,255,.05)";
    g.fill();
    g.lineWidth = aceso ? 3.5 : 2.5;
    g.strokeStyle = aceso ? "#4DE8FF" : "rgba(237,243,255,.22)";
    g.stroke();
    g.beginPath();
    g.arc(pt.x, pt.y, aceso ? 12 : 5, 0, TAU);
    g.fillStyle = aceso ? "#DFFAFF" : "rgba(237,243,255,.28)";
    g.fill();
    // numerinho da ordem em que o ponto foi ligado
    if (ordem >= 0) {
      g.fillStyle = "#04121c";
      g.font = "bold 15px 'Chakra Petch',sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(String(ordem + 1), pt.x, pt.y + 1);
    }
  }
  requestAnimationFrame(desenharSenha);
}
function senhaPonteiro(ev) {
  const r = senhaCanvas.getBoundingClientRect();
  return {
    x: (ev.clientX - r.left) * (600 / r.width),
    y: (ev.clientY - r.top) * (600 / r.height)
  };
}
function senhaTestarPonto(x, y) {
  const e = senhaEstado;
  for (let i = 0; i < 9; i++) {
    const pt = senhaPos(i);
    if (dist2(x, y, pt.x, pt.y) < 62 * 62 && e.seq.indexOf(i) < 0) {
      e.seq.push(i);
      AudioSys.tone(520 + e.seq.length * 70, 0.05, "sine", 0.09);
      vibrate(10);
      senhaPontinhos();
      return;
    }
  }
}
senhaCanvas.addEventListener("pointerdown", ev => {
  if (!senhaEstado) return;
  ev.preventDefault();
  AudioSys.resume();
  senhaEstado.seq = [];
  senhaEstado.desenhando = true;
  const p2 = senhaPonteiro(ev);
  senhaEstado.px = p2.x; senhaEstado.py = p2.y;
  senhaTestarPonto(p2.x, p2.y);
  try { senhaCanvas.setPointerCapture(ev.pointerId); } catch (e) {}
});
senhaCanvas.addEventListener("pointermove", ev => {
  if (!senhaEstado || !senhaEstado.desenhando) return;
  ev.preventDefault();
  const p2 = senhaPonteiro(ev);
  senhaEstado.px = p2.x; senhaEstado.py = p2.y;
  senhaTestarPonto(p2.x, p2.y);
});
function senhaSoltar() {
  const e = senhaEstado;
  if (!e || !e.desenhando) return;
  e.desenhando = false;
  if (e.seq.length < 4) {
    e.seq = [];
    senhaAtualizarTexto("Use pelo menos 4 pontos.");
    AudioSys.deny();
    return;
  }
  const h = senhaHash(e.seq);
  if (e.modo === "verificar") {
    const perfil = ROOT.profiles[e.nome];
    const esperada = e.senhaEsperada || (perfil ? perfil.senha : null);
    if (esperada && esperada === h) {
      AudioSys.buy();
      senhaEstado = null;
      e.aoTerminar(true);
    } else {
      e.seq = [];
      senhaAtualizarTexto("Senha errada. Tente de novo.");
      AudioSys.deny();
      vibrate([60, 40, 60]);
    }
  } else if (e.modo === "criar") {
    e.primeira = h;
    e.modo = "confirmar";
    e.seq = [];
    senhaAtualizarTexto();
    AudioSys.tone(880, 0.12, "sine", 0.12);
  } else {
    if (h === e.primeira) {
      AudioSys.buy();
      const cb = e.aoTerminar;
      senhaEstado = null;
      cb(true, h);
    } else {
      e.modo = "criar";
      e.primeira = null;
      e.seq = [];
      senhaAtualizarTexto("Os desenhos não bateram. Comece de novo.");
      AudioSys.deny();
      vibrate([60, 40, 60]);
    }
  }
}
senhaCanvas.addEventListener("pointerup", senhaSoltar);
senhaCanvas.addEventListener("pointercancel", senhaSoltar);
$("senha-refazer").addEventListener("click", () => {
  if (!senhaEstado) return;
  senhaEstado.seq = [];
  if (senhaEstado.modo === "confirmar") { senhaEstado.modo = "criar"; senhaEstado.primeira = null; }
  senhaAtualizarTexto();
});
$("senha-voltar").addEventListener("click", () => {
  senhaEstado = null;
  S.mode = "login";
  renderLogin();
  showScreen("login");
});

/* ---------- Painel ADM ----------
   Segurança possível num jogo sem servidor: a senha mestre fica no código
   (embaralhada), o que impede o acesso casual. Quem souber abrir o código do
   navegador consegue contornar — não existe proteção real do lado do cliente.
   Para trocar a senha: abra o console do navegador, rode admHash("suasenha")
   e cole o resultado em ADM_MASTER abaixo.                                   */
const ADM_MASTER = "9db9df1e";   // senha padrão: neonadmin

/* =====================================================================
   EQUIPE E PERMISSÕES
   ---------------------------------------------------------------------
   O painel deixou de ser só do dono. Cada pessoa entra com o NICK dela
   e uma chave própria, e vê exatamente o que o dono liberou — o resto
   nem aparece na tela, igual a um servidor de Discord.
   Os donos estão fixos aqui embaixo e não dá para tirar nem mexer nas
   permissões deles pelo painel; eles entram com a senha mestra.
   ===================================================================== */
const DONOS = ["cr1cket", "cr1cket."];

const PERMISSOES = [
  { grupo: "SUGESTÕES", itens: [
    { id: "sugVer",    nome: "Ler as sugestões",         desc: "Ver tudo o que os jogadores mandaram" },
    { id: "sugMexer",  nome: "Marcar e apagar sugestões", desc: "Marcar como lida e apagar da lista" }
  ]},
  { grupo: "LOJA", itens: [
    { id: "lojaVer",   nome: "Ver os pedidos",           desc: "Ver quem pediu o quê e conversar" },
    { id: "lojaDar",   nome: "Entregar compras",         desc: "Entregar VIP, passe ou nave a quem pagou" }
  ]},
  { grupo: "JOGADORES", itens: [
    { id: "verLista",  nome: "Ver os jogadores",         desc: "Lista de quem existe e a janela AO VIVO" },
    { id: "assistir",  nome: "Assistir a tela",          desc: "Abrir o 👁 e ver a partida de alguém" },
    { id: "invVer",    nome: "Ver o inventário",         desc: "Abrir o inventário completo de uma conta" },
    { id: "invTirar",  nome: "Tirar itens",              desc: "Remover naves, amuletos, habilidades e cristais" },
    { id: "zerar",     nome: "Zerar jogador",            desc: "Apagar todo o progresso de alguém", perigo: true }
  ]},
  { grupo: "PRESENTES", itens: [
    { id: "darCoisas", nome: "Dar coisas",               desc: "Cristais, naves, fases, habilidades e amuletos" },
    { id: "darRaros",  nome: "Dar aeronaves exclusivas e ranks", desc: "Maverick, B-2, Ômega-9 e pontos de rank" },
    { id: "presGeral", nome: "Presente para todo mundo", desc: "Mandar a caixa para todos os jogadores" }
  ]},
  { grupo: "MUNDO", itens: [
    { id: "recados",   nome: "Recados no jogo",          desc: "Mandar mensagem para a tela de todos" },
    { id: "eventos",   nome: "Ligar eventos",            desc: "Natal, festa, apocalipse e os outros" },
    { id: "boosts",    nome: "Ligar boosts",             desc: "Multiplicar pontos, cristais, dano…" },
    { id: "trolls",    nome: "Travessuras",              desc: "Pegadinhas que valem para todo mundo", perigo: true }
  ]},
  { grupo: "SISTEMA", itens: [
    { id: "diag",      nome: "Teste da nuvem",           desc: "Ver o diagnóstico das regras" },
    { id: "backup",    nome: "Cópia de segurança",       desc: "Exportar e importar os pilotos deste aparelho" },
    { id: "equipe",    nome: "Mexer na equipe",          desc: "Adicionar e tirar gente do painel", perigo: true }
  ]}
];
const TODAS_PERMISSOES = PERMISSOES.reduce((a, g) => a.concat(g.itens.map(i => i.id)), []);

/* atalhos prontos, como os cargos de um servidor */
const CARGOS = [
  { id: "dev",   nome: "DESENVOLVEDOR", icone: "💻", cor: "#7CF7C0",
    desc: "Lê as sugestões e vê o diagnóstico. Não mexe em nada dos jogadores.",
    perms: ["sugVer", "sugMexer", "diag"] },
  { id: "mod",   nome: "MODERADOR", icone: "🛡", cor: "#4DE8FF",
    desc: "Vê os jogadores, assiste às partidas e dá coisas simples.",
    perms: ["sugVer", "verLista", "assistir", "invVer", "darCoisas", "recados", "diag"] },
  { id: "animador", nome: "ANIMADOR", icone: "🎉", cor: "#FF4D8F",
    desc: "Cuida da festa: recados, eventos e boosts para todo mundo.",
    perms: ["verLista", "recados", "eventos", "boosts", "presGeral", "diag"] },
  { id: "admin", nome: "ADMINISTRADOR", icone: "⚙", cor: "#FFC145",
    desc: "Quase tudo, menos mexer na equipe.",
    perms: TODAS_PERMISSOES.filter(p => p !== "equipe") },
  { id: "livre", nome: "PERSONALIZADO", icone: "✎", cor: "#C34DFF",
    desc: "Você escolhe uma por uma.", perms: [] }
];

/* quem está usando o painel agora */
const PERM = { nick: "", dono: false, cargo: "", permissoes: {}, entrou: false };
function ehDono(nick) { return DONOS.indexOf(String(nick).trim().toLowerCase()) >= 0; }
function pode(id) {
  if (!PERM.entrou) return false;
  if (PERM.dono) return true;
  return !!PERM.permissoes[id];
}
function chaveNova() {
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c = "";
  for (let i = 0; i < 6; i++) c += letras[Math.floor(Math.random() * letras.length)];
  return c;
}
function equipeId(nick) { return "e" + nuvemHash(String(nick).trim().toLowerCase()); }
async function equipeBuscar(nick) {
  if (!nuvemAtiva()) return null;
  return nuvemReq("equipe/" + equipeId(nick));
}
async function equipeListar() {
  if (!nuvemAtiva()) return [];
  const d = await nuvemReq("equipe");
  if (!d) return [];
  return Object.keys(d).map(id => Object.assign({ id: id }, d[id]))
                .filter(x => x && x.nome)
                .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
}
function admHash(t) {
  let h = 5381;
  for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) >>> 0;
  return h.toString(16);
}
window.admHash = admHash;

let admTarget = null;
let admConfirmar = null;

function admOpen() {
  S.mode = "adm";
  admTarget = null;
  /* Já entrei nesta sessão? Então vai direto para o painel. Antes ele
     escondia o painel e mostrava a senha de novo toda vez que você saía
     e voltava — daí a sensação de ter de digitar a toda hora.        */
  if (PERM.entrou) {
    showScreen("adm");
    try { abrirPainelComo(); } catch (e) {}
    return;
  }
  $("adm-pass").value = "";
  $("adm-search").value = "";
  admMsg("");
  $("adm-pass-row").style.display = "flex";
  $("adm-panel").style.display = "none";
  $("adm-sel-box").style.display = "none";
  $("adm-pass-note").textContent =
    "O dono entra com o nick e a senha mestra. Quem está na equipe entra " +
    "com o nick e a chave que o dono passou.";
  showScreen("adm");
  // se já ficou conectado neste aparelho, entra sozinho
  setTimeout(() => { try { admEntrarGuardado(); } catch (e) {} }, 150);
}
function admMsg(txt) {
  const el = $("adm-msg");
  el.textContent = txt;
  el.classList.toggle("on", !!txt);
}
function admAlvo() { return admTarget ? ROOT.profiles[admTarget] : null; }

/* aplica uma mudança no piloto selecionado */
function admAct(fn, msg) {
  const p = admAlvo();
  if (!p) { admMsg("Selecione um piloto primeiro."); return; }
  fn(p);
  p.savedAt = Date.now();
  persist();
  if (save.__name === admTarget) { save = ROOT.profiles[admTarget]; save.__name = admTarget; calcStats(); }
  admMsg(msg + " → " + admTarget);
  admRenderPlayers();
  admRenderStats();
  AudioSys.buy();
  vibrate(15);
}
function admNum(id, padrao) {
  const v = parseInt(($(id).value || "").replace(/[^0-9-]/g, ""), 10);
  return isNaN(v) ? padrao : v;
}

function admRenderPlayers() {
  const list = $("adm-players");
  const busca = ($("adm-search").value || "").trim().toLowerCase();
  list.innerHTML = "";
  const names = Object.keys(ROOT.profiles).filter(n => !busca || n.toLowerCase().indexOf(busca) >= 0);
  $("adm-count").textContent = Object.keys(ROOT.profiles).length + " piloto" +
    (Object.keys(ROOT.profiles).length === 1 ? "" : "s");
  if (!names.length) {
    const d = document.createElement("div");
    d.className = "adm-note";
    d.textContent = busca ? "Nenhum piloto com esse nome." : "Nenhum piloto criado ainda.";
    list.appendChild(d);
    return;
  }
  for (const name of names) {
    const p = ROOT.profiles[name];
    const b = document.createElement("button");
    b.className = "profile-btn" + (admTarget === name ? " sel" : "");
    b.innerHTML = '<span class="profile-name">' + name + (p.godMode ? " ⚡" : "") + "</span>" +
      '<span class="profile-meta">Fase ' + (p.best || 0) + " · ◆ " + fmt(p.crystals || 0) +
      " · " + (p.ships ? p.ships.length : 1) + " naves</span>";
    b.addEventListener("click", () => { admSelect(name); });
    list.appendChild(b);
  }
}
function admSelect(name) {
  admTarget = name;
  $("adm-sel-box").style.display = "block";
  $("adm-target").textContent = "PILOTO: " + name.toUpperCase();
  $("adm-rename").value = name;
  admMsg("");
  admRenderPlayers();
  admRenderStats();
}
function admRenderStats() {
  const p = admAlvo();
  if (!p) return;
  const dados = [
    ["CRISTAIS", fmt(p.crystals || 0)],
    ["FASE", (p.best || 0) + "/120"],
    ["NAVES", (p.ships ? p.ships.length : 1) + "/50"],
    ["AMULETOS", (p.amulets ? p.amulets.length : 0)],
    ["PONTOS", (p.pts || 0)],
    ["HABILID.", Object.keys(p.skills || {}).length + "/120"],
    ["RECORDE", fmt(p.hi || 0)],
    ["INVENCÍVEL", p.godMode ? "SIM" : "não"]
  ];
  $("adm-stats").innerHTML = dados.map(d =>
    '<div class="adm-stat"><b>' + d[1] + "</b><span>" + d[0] + "</span></div>").join("");
  $("adm-god").textContent = p.godMode ? "⚡ TIRAR INVENCÍVEL" : "⚡ MODO INVENCÍVEL";
}

/* preenche os seletores de nave e amuleto */
(function admPreencherSelects() {
  const sn = $("adm-ship-sel");
  sn.innerHTML = SHIPS.map((sh, i) =>
    '<option value="' + i + '">' + (i + 1) + ". " + sh.name + " — ◆" + fmt(sh.price) + "</option>").join("");
  const st = $("adm-amu-tipo");
  st.innerHTML = AMULET_TYPES.map(t => '<option value="' + t.id + '">' + t.name + "</option>").join("") +
    AMULET_SPECIALS.map(t => '<option value="' + t.id + '">' + t.name + " (lendário)</option>").join("");
  const sr = $("adm-amu-rar");
  sr.innerHTML = RARS.map((r, i) => '<option value="' + i + '"' + (i === 2 ? " selected" : "") + ">" + r.name + "</option>").join("");
})();

function admDarAmuleto(p, tipo, rar) {
  p.amuletSeq = p.amuletSeq || 1;
  p.amulets = p.amulets || [];
  const especial = AMULET_SPECIALS.some(a => a.id === tipo);
  p.amulets.push({ uid: p.amuletSeq++, type: tipo, rar: especial ? 3 : rar });
}
function admDesbloquearTudo(p) {
  p.crystals = Math.max(p.crystals || 0, 999999);
  p.best = TOTAL_FASES;
  p.pts = TOTAL_FASES;
  p.hi = Math.max(p.hi || 0, 100000);
  p.ships = [];
  for (let i = 0; i < MAVERICK; i++) p.ships.push(i);   // exclusivas ficam de fora
  p.skills = {};
  for (const b of ["atk", "def", "res"]) for (let t = 1; t <= 40; t++) p.skills[b + t] = true;
  for (const u of UPGRADES) p.upgrades[u.id] = u.max;
  p.parts = {};
  for (let i = 0; i < 50; i++) {
    p.parts[i] = {};
    for (const part of PARTS) p.parts[i][part.id] = PART_MAX;
    p.weapons[i] = WEAPONS.map(w => w.id);
    p.paints[i] = PAINT_HUES.slice();
    p.glows[i] = PAINT_HUES.slice();
  }
  p.amulets = [];
  p.amuletSeq = 1;
  for (const sp of AMULET_SPECIALS) admDarAmuleto(p, sp.id, 3);
  for (const t of AMULET_TYPES) admDarAmuleto(p, t.id, 3);
  p.equipped = p.amulets.slice(0, 3).map(a => a.uid);
}

/* ---- navegação e senha ---- */
$("btn-goto-adm").addEventListener("click", () => { AudioSys.resume(); admOpen(); });
$("btn-adm-back").addEventListener("click", () => {
  S.mode = "login";
  renderLogin();
  showScreen("login");
});
$("btn-adm-enter").addEventListener("click", async () => {
  AudioSys.resume();
  const nick = ($("adm-nick").value || "").trim();
  const chave = $("adm-pass").value;
  const nota = $("adm-pass-note");
  if (!nick) { nota.textContent = "Escreva o seu nick."; AudioSys.deny(); return; }
  if (!chave) { nota.textContent = "Falta a chave."; AudioSys.deny(); return; }

  const lembrar = $("adm-lembrar").checked;

  // 1) dono: nick da lista + senha mestra
  if (ehDono(nick)) {
    if (admHash(chave) !== ADM_MASTER) {
      nota.textContent = "Senha errada. Tente de novo.";
      $("adm-pass").value = "";
      AudioSys.deny(); vibrate(60);
      return;
    }
    PERM.nick = nick; PERM.dono = true; PERM.cargo = "DONO";
    PERM.permissoes = {}; PERM.entrou = true;
    if (lembrar) admLembrar(nick, chave); else admEsquecer();
    abrirPainelComo();
    return;
  }

  // 2) equipe: nick + chave própria, guardadas na nuvem
  if (!nuvemAtiva()) {
    nota.textContent = "A equipe só funciona com o modo online ligado.";
    AudioSys.deny();
    return;
  }
  nota.textContent = "Conferindo…";
  const m = await equipeBuscar(nick);
  if (!m || !m.chave || m.chave !== admHash("eq|" + chave.trim().toUpperCase())) {
    nota.textContent = "Nick ou chave não confere. Peça a chave para o dono.";
    $("adm-pass").value = "";
    AudioSys.deny(); vibrate(60);
    return;
  }
  if (m.bloqueado) {
    nota.textContent = "O seu acesso está pausado no momento.";
    AudioSys.deny();
    return;
  }
  PERM.nick = m.nome || nick;
  PERM.dono = false;
  PERM.cargo = (CARGOS.find(c => c.id === m.cargo) || {}).nome || "EQUIPE";
  PERM.permissoes = m.permissoes || {};
  PERM.entrou = true;
  if (lembrar) admLembrar(nick, chave); else admEsquecer();
  nuvemJuntar("equipe/" + equipeId(nick), { visto: Date.now() });
  abrirPainelComo();
});

/* ---------------------------------------------------------------------
   Continuar conectado: guarda o nick e a chave só neste aparelho, para
   não ter de digitar toda hora. O botão SAIR apaga.
   --------------------------------------------------------------------- */
function admLembrar(nick, chave) {
  const d = { nick: nick, chave: chave, quando: Date.now() };
  try { storageSet("nn_adm", JSON.stringify(d)); } catch (e) {}
  /* guarda também dentro do ROOT, que vai para o IndexedDB: em celular
     que limpa o armazenamento do site sozinho (o iPhone faz isso), o
     acesso do painel sobrevive e você não digita de novo.           */
  try { ROOT.adm = d; persist(); } catch (e) {}
}
function admEsquecer() {
  try { storageSet("nn_adm", ""); } catch (e) {}
  try { delete ROOT.adm; persist(); } catch (e) {}
}
function admGuardado() {
  try {
    const t = storageGet("nn_adm", "");
    if (t) {
      const d = JSON.parse(t);
      if (d && d.nick && d.chave) return d;
    }
  } catch (e) {}
  const r = ROOT && ROOT.adm;
  return (r && r.nick && r.chave) ? r : null;
}
/* entra sozinho quando já tem acesso guardado */
async function admEntrarGuardado() {
  const d = admGuardado();
  if (!d || PERM.entrou) return false;
  $("adm-nick").value = d.nick;
  $("adm-pass").value = d.chave;
  $("adm-lembrar").checked = true;
  $("adm-pass-note").textContent = "Entrando como " + d.nick + "…";
  $("btn-adm-enter").click();
  return true;
}
$("adm-pass").addEventListener("keydown", e => { if (e.key === "Enter") $("btn-adm-enter").click(); });
$("adm-nick").addEventListener("keydown", e => { if (e.key === "Enter") $("adm-pass").focus(); });
$("quem-sair").addEventListener("click", () => {
  admEsquecer();
  PERM.entrou = false; PERM.dono = false; PERM.permissoes = {};
  $("adm-abas").classList.remove("on");
  $("adm-panel").style.display = "none";
  $("adm-quem").style.display = "none";
  $("adm-pass-row").style.display = "";
  $("adm-pass").value = "";
  $("adm-pass-note").textContent = "";
});

/* ---------------------------------------------------------------------
   Abre o painel mostrando SÓ o que a pessoa pode. O que não foi
   liberado nem entra na tela — não fica cinza, some mesmo.
   --------------------------------------------------------------------- */
function abrirPainelComo() {
  $("adm-pass-row").style.display = "none";
  $("adm-panel").style.display = "block";
  $("adm-quem").style.display = "block";
  $("adm-nick").value = "";
  $("adm-pass").value = "";
  $("adm-pass-note").textContent = "";

  const cargo = PERM.dono ? { icone: "👑", nome: "DONO", cor: "#FFC145" }
                          : (CARGOS.find(c => c.nome === PERM.cargo) || { icone: "👤", cor: "#4DE8FF" });
  $("quem-ic").textContent = cargo.icone;
  $("quem-nome").textContent = PERM.nick;
  $("quem-cargo").textContent = PERM.dono ? "DONO · acesso total" : PERM.cargo;
  $("quem-cargo").style.color = cargo.cor || "var(--cyan)";
  const pp = $("quem-perms");
  pp.innerHTML = "";
  if (PERM.dono) {
    pp.innerHTML = "<span>tudo liberado</span>";
  } else {
    for (const g of PERMISSOES) for (const it of g.itens) {
      if (!PERM.permissoes[it.id]) continue;
      const e = document.createElement("span");
      e.textContent = it.nome;
      pp.appendChild(e);
    }
    if (!pp.children.length) pp.innerHTML = "<span>sem permissões ainda</span>";
  }

  preencherRanks();
  aplicarPermissoes();
  renderAbasAdm();
  if (pode("backup")) admRenderPlayers();
  admRenderRecadosProntos();
  admRenderMundo();
  if (!nuvemAtiva() && pode("diag")) admTestarNuvem();
  if (nuvemAtiva()) {
    if (pode("sugVer")) admCarregarSugestoes();
    mundoLigar();
    nuvemReq("mundo").then(d => { mundoAplicar(d); admRenderMundo(); });
    if (!admRelogioMundo) admRelogioMundo = setInterval(() => {
      if (S.mode === "adm") admRenderMundoAgora();
    }, 4000);
    if (pode("verLista")) { admNuvemCarregar(); vivoLigar(); }
    if (pode("equipe")) admRenderEquipe();
  }
  AudioSys.buy();
}

/* =====================================================================
   ABAS DO PAINEL
   ---------------------------------------------------------------------
   Eram treze cartões numa rolagem só. Agora cada assunto tem a sua aba,
   e dentro das AÇÕES tem abinhas próprias (dar, tirar, inventário e a
   caixa) para não ficar tudo amontoado.
   Uma aba só aparece se a pessoa tiver ao menos uma permissão dela.
   ===================================================================== */
/* =====================================================================
   PAINEL: PEDIDOS DA LOJA E CONVERSAS
   ---------------------------------------------------------------------
   ENTREGAR entrega de verdade: escreve na conta da pessoa pela mesma
   caixa de presente que já existe, então ela recebe assim que abrir o
   jogo, com a animação e tudo.
   ===================================================================== */
let admLojaPedidos = {};
let admLojaMostrarTudo = false;
let admSupConversas = {};
let admSupAberta = null;
let admSupMsgs = [];

async function admLojaCarregar() {
  if (!nuvemAtiva()) return;
  admLojaPedidos = (await nuvemReq("loja_pedidos")) || {};
  // junta os pedidos que ficaram na ficha de cada piloto (regras antigas)
  const pilLoja = (await nuvemReq("pilotos")) || {};
  for (const id in pilLoja) {
    const pl = pilLoja[id] && pilLoja[id]._loja;
    for (const k in (pl || {})) admLojaPedidos[k] = pl[k];
  }
  /* No modo compatível as conversas ficam dentro de pilotos/<id>/_sup,
     então o painel junta os dois lugares para não perder ninguém.   */
  const sup = (await nuvemReq("suporte")) || {};
  const pil = (await nuvemReq("pilotos")) || {};
  for (const id in pil) {
    if (pil[id] && pil[id]._sup) sup[id] = Object.assign({}, sup[id] || {}, pil[id]._sup);
  }
  admSupConversas = {};
  for (const id in sup) {
    const c = sup[id];
    if (!c) continue;
    let ultima = 0, quantas = 0;
    for (const k in (c.msgs || {})) {
      const m = c.msgs[k];
      if (!m) continue;
      quantas++;
      if ((m.quando || 0) > ultima) ultima = m.quando || 0;
    }
    admSupConversas[id] = {
      nome: (c.info && c.info.nome) || "?", tag: (c.info && c.info.tag) || "",
      nova: !!(c.info && c.info.novasAdm), ultima: ultima, quantas: quantas
    };
  }
  admLojaRender();
  admLojaSelo();
}

function admLojaSelo() {
  const esperando = Object.values(admLojaPedidos).filter(p2 => p2 && p2.estado === "esperando").length;
  const conversas = Object.values(admSupConversas).filter(c => c.nova).length;
  const aba = document.querySelector('.adm-aba[data-aba="loja"]');
  if (aba) {
    let b = aba.querySelector(".aba-selo");
    const n = esperando + conversas;
    if (n > 0) {
      if (!b) { b = document.createElement("i"); b.className = "aba-selo"; aba.appendChild(b); }
      b.textContent = String(n);
    } else if (b) b.remove();
  }
}

function admLojaRender() {
  const cx = $("adm-loja-lista");
  if (!cx) return;
  const abertos = { esperando: 1, pago: 1 };
  const todos = Object.entries(admLojaPedidos)
    .filter(([, p2]) => p2 && (admLojaMostrarTudo || abertos[p2.estado]))
    /* quem já avisou que pagou sobe para o topo: é o que precisa de você */
    .sort((a, b) => ((b[1].estado === "pago") - (a[1].estado === "pago")) ||
                    ((b[1].pagoEm || b[1].quando || 0) - (a[1].pagoEm || a[1].quando || 0)));
  cx.innerHTML = "";
  if (!todos.length) {
    cx.innerHTML = '<div class="vazio"><b>🧾</b><strong>NENHUM PEDIDO ESPERANDO</strong>' +
      "<span>Quando alguém pedir alguma coisa na loja, aparece aqui.</span></div>";
  }
  for (const [chave, pd] of todos) {
    const pago = pd.estado === "pago";
    const feito = !abertos[pd.estado];
    const el = document.createElement("div");
    el.className = "pd-linha" + (feito ? " feito" : "") + (pago ? " pago" : "");
    /* o nome da CONTA vem primeiro: é por ele que você acha o Pix */
    el.innerHTML =
      '<span class="pd-ic">' + (feito ? "✓" : pago ? "💰" : "🧾") + "</span>" +
      '<span class="pd-txt">' +
        '<span class="pd-item">' + escaparTexto(pd.nome || pd.tag || "?") +
          (pago ? ' <em class="pd-selo">JÁ PAGOU</em>' : "") + "</span>" +
        '<span class="pd-quem">' + escaparTexto(pd.itemNome) +
          (pd.tag && pd.tag !== pd.nome ? " · " + escaparTexto(pd.tag) : "") +
          " · " + quandoTexto(pd.pagoEm || pd.quando || Date.now()) + " atrás" +
          (feito ? " · " + pd.estado : "") + "</span></span>" +
      '<span class="pd-preco">' + reais(pd.preco || 0) + "</span>";
    if (!feito && pode("lojaDar")) {
      const acoes = document.createElement("span");
      acoes.className = "pd-acoes";
      const bOk = document.createElement("button");
      bOk.className = "adm-btn gold";
      bOk.textContent = "ENTREGAR";
      bOk.addEventListener("click", () => admEntregarPedido(chave, pd, bOk));
      const bNo = document.createElement("button");
      bNo.className = "adm-btn danger";
      bNo.textContent = "✕";
      bNo.addEventListener("click", async () => {
        await admPedidoJuntar(chave, pd, { estado: "recusado" });
        await admAvisarNaConversa(pd.de, "O pedido de " + pd.itemNome + " foi cancelado.");
        admLojaCarregar();
      });
      acoes.appendChild(bOk); acoes.appendChild(bNo);
      el.appendChild(acoes);
    }
    cx.appendChild(el);
  }
  admSupRender();
}

/* =====================================================================
   ENVIAR PASS — manda qualquer item da loja para uma conta
   ---------------------------------------------------------------------
   Não depende de pedido nenhum: escolhe a pessoa pelo nick, escolhe o
   item e ele cai na conta dela pela mesma caixa de presente de sempre.
   ===================================================================== */
let envAlvo = null;
function envMostrarAlvo(txt, bom) {
  const el = $("env-quem-nota");
  if (el) { el.textContent = txt; el.style.color = bom ? "var(--verde)" : "var(--danger)"; }
}
async function envProcurar() {
  const nome = ($("env-quem").value || "").trim();
  envAlvo = null;
  if (!nome) { envMostrarAlvo("Escreva o nick da conta.", false); return; }
  envMostrarAlvo("Procurando…", true);
  const achado = await acharPiloto(nome);
  if (!achado) { envMostrarAlvo("Não achei ninguém com esse nick.", false); return; }
  envAlvo = { id: achado.id, nome: achado.p.nome || nome };
  envMostrarAlvo("✓ " + envAlvo.nome + " — escolha o que mandar aqui embaixo.", true);
  AudioSys.buy();
}
async function envMandar(presente, texto, botao) {
  if (!envAlvo) { envMostrarAlvo("Escolha a conta primeiro (PROCURAR).", false); AudioSys.deny(); return; }
  if (botao) { botao.disabled = true; botao.dataset.txt = botao.textContent; botao.textContent = "ENVIANDO…"; }
  const ok = await entregarCompra(envAlvo.id, presente, texto);
  if (botao) { botao.disabled = false; botao.textContent = botao.dataset.txt || "ENVIAR"; }
  if (ok) {
    admMsg("Enviado para " + envAlvo.nome + ": " + texto);
    await admAvisarNaConversa(envAlvo.id, "Enviei para você: " + texto + ". Aproveite!");
    AudioSys.buy();
  } else {
    admMsg("Não deu para enviar agora.");
    AudioSys.deny();
  }
}
function envRender() {
  const vip = $("env-vip"), pas = $("env-passes"), nav = $("env-naves");
  if (!vip || vip.dataset.pronto) return;
  vip.dataset.pronto = "1";
  for (const pl of VIP_PLANOS) {
    const b = document.createElement("button");
    b.className = "adm-btn gold";
    b.textContent = pl.nome;
    b.addEventListener("click", () => envMandar({ vipDias: pl.dias }, "VIP " + pl.nome, b));
    vip.appendChild(b);
  }
  for (const ps of PASSES) {
    const b = document.createElement("button");
    b.className = "adm-btn";
    b.textContent = ps.icone + " " + ps.nome.replace("Passe do ", "").replace("Passe da ", "");
    b.addEventListener("click", () => envMandar(
      { passes: ps.pacote ? PASSES.filter(x => !x.pacote).map(x => x.id) : [ps.id] },
      ps.nome, b));
    pas.appendChild(b);
  }
  for (let i = 0; i < NAVES_LOJA.length; i++) {
    const sh = NAVES_LOJA[i];
    const b = document.createElement("button");
    b.className = "adm-btn";
    b.textContent = "✈ " + sh.name;
    b.addEventListener("click", () => envMandar({ naves: [NAVES_LOJA_DE + i] }, "Nave " + sh.name, b));
    nav.appendChild(b);
  }
}
$("env-achar").addEventListener("click", envProcurar);
$("env-quem").addEventListener("keydown", e => { if (e.key === "Enter") envProcurar(); });
$("env-cristais-ok").addEventListener("click", ev => {
  const n = Math.max(1, parseInt($("env-cristais").value, 10) || 0);
  envMandar({ cristais: n }, fmt(n) + " cristais", ev.currentTarget);
});

/* ---------- dados do Pix, editáveis pelo painel ---------- */
function pagAdmRender() {
  $("pag-chave-adm").value = PAG.chave || "";
  $("pag-tipo-adm").value = PAG.tipo || "";
  $("pag-nome-adm").value = PAG.nome || "";
  $("pag-cidade-adm").value = PAG.cidade || "";
  const el = $("pag-previa");
  if (!el) return;
  if (!PAG.chave) {
    el.innerHTML = "<b>O Pix ainda não está ligado.</b> Enquanto não tiver chave aqui, " +
      "quem tocar em COMPRAR vê um aviso e é mandado para o chat com você.";
    return;
  }
  el.innerHTML = "Na tela de quem compra aparece assim, escondido: <b>" +
    escaparTexto(pagEsconder(PAG.chave, PAG.tipo)) + "</b> · " +
    escaparTexto(pagEsconder(PAG.nome, "NOME")) +
    " — só quem for pagar toca em MOSTRAR ou copia direto." +
    (String(PAG.tipo || "").toUpperCase().indexOf("CPF") >= 0
      ? "<br><b class='aviso-cpf'>Dica:</b> com CPF, quem for pagar vê o seu número. " +
        "No app do seu banco dá para criar uma <b>chave aleatória</b> só para o jogo — " +
        "ela recebe igual e não conta nada sobre você."
      : "");
}
$("pag-salvar").addEventListener("click", async ev => {
  const b = ev.currentTarget;
  b.disabled = true; b.textContent = "SALVANDO…";
  const novo = {
    chave: ($("pag-chave-adm").value || "").trim(),
    tipo: ($("pag-tipo-adm").value || "CHAVE PIX").trim(),
    nome: ($("pag-nome-adm").value || "").trim(),
    cidade: ($("pag-cidade-adm").value || "").trim()
  };
  const ok = await nuvemSoltar("mundo/pagamento", novo);
  b.disabled = false; b.textContent = "SALVAR DADOS DO PIX";
  if (ok === null) { admMsg("O Firebase recusou a gravação."); return; }
  pagAplicar(novo);
  pagAdmRender();
  admMsg("Dados do Pix salvos. Já vale para todo mundo.");
  AudioSys.buy();
});

/* escreve no pedido esteja ele no galho novo ou dentro da ficha do piloto */
async function admPedidoJuntar(chave, pd, obj) {
  const r = await nuvemJuntar("loja_pedidos/" + chave, obj);
  if (r !== null) return r;
  return await nuvemJuntar("pilotos/" + (pd && pd.de) + "/_loja/" + chave, obj);
}

/* entrega usando a caixa de presente que já existe */
async function admEntregarPedido(chave, pd, botao) {
  if (botao) { botao.disabled = true; botao.textContent = "ENTREGANDO…"; }
  const presente = { cristais: 0 };
  let texto = pd.itemNome;
  if (String(pd.item).indexOf("vip") === 0) {
    presente.vipDias = pd.dias || 30;
  } else if (String(pd.item).indexOf("passe:") === 0) {
    const id = String(pd.item).slice(6);
    if (id === "tudo") presente.passes = PASSES.filter(x => !x.pacote).map(x => x.id);
    else presente.passes = [id];
  } else if (String(pd.item).indexOf("nave:") === 0) {
    presente.naves = [Number(String(pd.item).slice(5))];
  }
  /* comprou para um amigo: quem recebe é o amigo, e os dois são avisados */
  const paraQuem = pd.presentePara || pd.de;
  const ok = await entregarCompra(paraQuem, presente, texto);
  if (ok) {
    await admPedidoJuntar(chave, pd, { estado: "entregue", entregueEm: Date.now() });
    if (pd.presentePara && pd.presentePara !== pd.de) {
      await admAvisarNaConversa(pd.presentePara,
        "Presente! " + texto + " — mandado por " + (pd.nome || "um amigo") + " 🎁");
      await admAvisarNaConversa(pd.de, "Entregue! " + texto + " foi para " +
        (pd.presenteNome || "o seu amigo") + ". Obrigado 🙏");
    } else
    await admAvisarNaConversa(pd.de, "Entregue! " + texto + " já está na sua conta. Obrigado 🙏");
    admMsg("Entregue: " + texto);
  } else {
    admMsg("Não deu para entregar agora.");
  }
  if (botao) { botao.disabled = false; botao.textContent = "ENTREGAR"; }
  admLojaCarregar();
}

/* Escreve a compra na MESMA caixa de presente que o painel já usa, para
   a pessoa receber com a animação de sempre. Junta com o que estiver
   pendente, para não apagar um presente que ainda não foi retirado.   */
async function entregarCompra(idJogador, presente, texto) {
  const pendente = (await nuvemReq("presentes/" + idJogador)) || {};
  const novo = Object.assign({}, pendente);
  const c = Object.assign({ vipDias: 0, passes: [], naves: [] }, novo.compra || {});
  if (presente.vipDias) c.vipDias = (c.vipDias || 0) + presente.vipDias;
  for (const id of (presente.passes || [])) if (c.passes.indexOf(id) < 0) c.passes.push(id);
  for (const i of (presente.naves || [])) if (c.naves.indexOf(i) < 0) c.naves.push(i);
  novo.compra = c;
  novo.msg = "Obrigado pela compra! " + texto;
  novo.quando = Date.now();
  await nuvemReq("presentes/" + idJogador, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(novo)
  });
  const conf = await nuvemReq("presentes/" + idJogador);
  return !!(conf && conf.compra);
}

async function admAvisarNaConversa(idJogador, texto) {
  const chave = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  await nuvemSoltarC("suporte/" + idJogador + "/msgs/" + chave,
    { de: "adm", nome: "ADMINISTRADOR", txt: texto, quando: Date.now() });
  await nuvemJuntarC("suporte/" + idJogador + "/info", { novasJogador: true });
}

function admSupRender() {
  const cx = $("adm-sup-lista");
  if (!cx) return;
  cx.innerHTML = "";
  const ids = Object.keys(admSupConversas)
    .sort((a, b) => (admSupConversas[b].ultima || 0) - (admSupConversas[a].ultima || 0));
  if (!ids.length) {
    cx.innerHTML = '<div class="vazio"><b>💬</b><strong>NINGUÉM CHAMOU AINDA</strong>' +
      "<span>Quem tocar no ⊙ da loja aparece aqui.</span></div>";
    return;
  }
  for (const id of ids) {
    const c = admSupConversas[id];
    const el = document.createElement("div");
    el.className = "sup-linha" + (c.nova ? " nova" : "");
    el.innerHTML =
      '<span class="pd-ic">' + escaparTexto((c.tag || c.nome || "?")[0].toUpperCase()) + "</span>" +
      '<span class="pd-txt"><span class="pd-item">' + escaparTexto(c.tag || c.nome) + "</span>" +
      '<span class="pd-quem">' + c.quantas + " mensagem" + (c.quantas === 1 ? "" : "s") +
        (c.ultima ? " · " + quandoTexto(c.ultima) + " atrás" : "") + "</span></span>" +
      (c.nova ? '<span class="pedido-estado">nova</span>' : "");
    el.addEventListener("click", () => admAbrirConversa(id));
    cx.appendChild(el);
    if (admSupAberta === id) cx.appendChild(admCaixaConversa(id));
  }
}

async function admAbrirConversa(id) {
  if (admSupAberta === id) { admSupAberta = null; admSupRender(); return; }
  admSupAberta = id;
  admSupMsgs = [];
  admSupRender();
  const d = await nuvemReqC("suporte/" + id + "/msgs");
  const arr = [];
  for (const k in (d || {})) { const m = d[k]; if (m && m.txt) arr.push(m); }
  arr.sort((a, b) => (a.quando || 0) - (b.quando || 0));
  admSupMsgs = arr.slice(-60);
  await nuvemJuntarC("suporte/" + id + "/info", { novasAdm: false });
  if (admSupConversas[id]) admSupConversas[id].nova = false;
  admSupRender();
  admLojaSelo();
}

function admCaixaConversa(id) {
  const cx = document.createElement("div");
  const chat = document.createElement("div");
  chat.className = "adm-chat";
  if (!admSupMsgs.length) chat.innerHTML = '<div class="adm-note">Carregando…</div>';
  for (const m of admSupMsgs) {
    const d = new Date(m.quando || Date.now());
    const b = document.createElement("div");
    b.className = "chat-bolha" + (m.de === "adm" ? " minha" : "");
    b.innerHTML = '<span class="chat-msg">' + escaparLongo(m.txt) + "</span>" +
      '<span class="chat-hora">' + d.getHours() + ":" +
      String(d.getMinutes()).padStart(2, "0") + "</span>";
    chat.appendChild(b);
  }
  cx.appendChild(chat);
  setTimeout(() => { chat.scrollTop = chat.scrollHeight; }, 30);
  const linha = document.createElement("div");
  linha.className = "adm-resp";
  const inp = document.createElement("input");
  inp.placeholder = "Responder…";
  inp.maxLength = 300;
  const bt = document.createElement("button");
  bt.className = "adm-btn gold";
  bt.textContent = "ENVIAR";
  const manda = async () => {
    const t = inp.value.trim();
    if (!t) return;
    inp.value = "";
    admSupMsgs.push({ de: "adm", nome: "ADMINISTRADOR", txt: t, quando: Date.now() });
    admSupRender();
    await admAvisarNaConversa(id, t);
  };
  bt.addEventListener("click", manda);
  inp.addEventListener("keydown", e => { if (e.key === "Enter") manda(); });
  linha.appendChild(inp); linha.appendChild(bt);
  cx.appendChild(linha);
  return cx;
}

const ABAS_ADM = [
  { id: "jogadores", nome: "👤 JOGADORES", perms: ["verLista"],
    cartoes: ["adm-vivo", "adm-nuvem"] },
  { id: "acoes",     nome: "⚡ AÇÕES",     perms: ["darCoisas", "darRaros", "invVer", "invTirar", "zerar", "presGeral"],
    cartoes: ["adm-nuvem"] },
  { id: "mundo",     nome: "🌍 MUNDO",     perms: ["recados", "eventos", "boosts", "trolls"],
    cartoes: ["adm-agora", "adm-atualiza", "adm-mundo", "adm-eventos", "adm-boosts", "adm-trolls"] },
  { id: "sugestoes", nome: "💡 SUGESTÕES", perms: ["sugVer"],
    cartoes: ["adm-sug"] },
  { id: "loja",      nome: "🛒 LOJA",      perms: ["lojaVer", "lojaDar"],
    cartoes: ["adm-loja", "adm-enviar", "adm-pagamento"] },
  { id: "equipe",    nome: "👥 EQUIPE",    perms: ["equipe"],
    cartoes: ["adm-equipe"] },
  { id: "sistema",   nome: "🔧 SISTEMA",   perms: ["diag", "backup"],
    cartoes: ["adm-numeros", "adm-erros", "adm-denuncias", "adm-teste", "adm-manutencao",
              "adm-registro", "adm-reembolsos", "adm-diag", "adm-local",
              "adm-todos", "adm-backup"] }
];
let abaAdm = "";

const SUB_ACOES = [
  { id: "dar",    nome: "🎁 DAR",         pane: "pane-dar",   perms: ["darCoisas", "darRaros"] },
  { id: "tirar",  nome: "✕ TIRAR",        pane: "pane-tirar", perms: ["invTirar", "zerar"] },
  { id: "inv",    nome: "🎒 INVENTÁRIO",  pane: "pane-inv",   perms: ["invVer"] },
  { id: "caixa",  nome: "📦 CAIXA",       pane: "pane-caixa", perms: ["darCoisas", "darRaros", "invTirar", "presGeral"] }
];
let subAcao = "dar";

function abasLiberadas() { return ABAS_ADM.filter(a => a.perms.some(pode)); }
function subsLiberadas() { return SUB_ACOES.filter(a => a.perms.some(pode)); }

function renderAbasAdm() {
  const cx = $("adm-abas");
  const libs = abasLiberadas();
  if (!libs.length) { cx.classList.remove("on"); return; }
  cx.classList.add("on");
  if (!libs.some(a => a.id === abaAdm)) abaAdm = libs[0].id;
  cx.innerHTML = "";
  for (const a of libs) {
    const b = document.createElement("button");
    b.className = "adm-aba" + (abaAdm === a.id ? " on" : "");
    b.innerHTML = a.nome + (a.id === "sugestoes" && sugNovas() ? "<i>" + sugNovas() + "</i>" : "");
    b.addEventListener("click", () => {
      abaAdm = a.id;
      renderAbasAdm();
      try { cx.scrollIntoView({ block: "start", behavior: "smooth" }); } catch (e) {}
    });
    cx.appendChild(b);
  }
  mostrarAba();
}
function sugNovas() {
  return (typeof sugTodas !== "undefined" ? sugTodas : []).filter(x => !x.lida).length;
}

/* mostra só os cartões da aba escolhida */
let agoraNoTopo = false;
function mostrarAba() {
  if (abaAdm === "loja") {
    try { admLojaCarregar(); } catch (e) {}
    try { envRender(); pagAdmRender(); } catch (e) {}
  }
  if (abaAdm === "mundo") { try { attRender(); } catch (e) {} }
  // o resumo do que está no ar vem ANTES dos botões, não depois
  if (!agoraNoTopo) {
    const ag = $("adm-agora"), mu = $("adm-mundo");
    if (ag && mu && mu.parentNode) { mu.parentNode.insertBefore(ag, mu); agoraNoTopo = true; }
  }
  const todos = {};
  for (const a of ABAS_ADM) for (const c of a.cartoes) todos[c] = true;
  const atual = ABAS_ADM.find(a => a.id === abaAdm);
  for (const id in todos) {
    const el = $(id);
    if (!el) continue;
    const naAba = atual && atual.cartoes.indexOf(id) >= 0;
    el.style.display = (naAba && permiteCartao(id)) ? "block" : "none";
  }
  // o cartão de jogadores serve às duas abas, mas com caras diferentes
  const sel = $("adm-nuvem-sel");
  const lista = $("adm-nuvem-lista");
  const busca = $("adm-nuvem-busca");
  if (abaAdm === "acoes") {
    if (busca && busca.parentElement) busca.parentElement.style.display = "";
    if (lista) lista.style.display = "";
    if (sel) sel.style.display = admNuvemAlvo ? "block" : "none";
    const cab = document.querySelector("#adm-nuvem .adm-h");
    if (cab) cab.textContent = admNuvemAlvo ? "AÇÕES EM QUEM VOCÊ ESCOLHEU" : "ESCOLHA UM JOGADOR";
    renderSubAcoes();
  } else if (abaAdm === "jogadores") {
    if (sel) sel.style.display = "none";
    const cab = document.querySelector("#adm-nuvem .adm-h");
    if (cab) cab.textContent = "JOGADORES ONLINE";
  }
  const vazio = $("adm-vazio");
  if (vazio) vazio.style.display = abasLiberadas().length ? "none" : "block";
}
/* atalho para pular direto numa aba (e numa abinha) do painel */
function admIrPara(aba, sub) {
  if (aba) abaAdm = aba;
  if (sub) subAcao = sub;
  renderAbasAdm();
  if (abaAdm === "acoes") renderSubAcoes();
}
window.admIrPara = admIrPara;

function permiteCartao(id) {
  const p = CARTOES_PERM[id];
  if (!p) return true;
  return Array.isArray(p) ? p.some(pode) : pode(p);
}

function renderSubAcoes() {
  const cx = $("acao-abas");
  if (!cx) return;
  const libs = subsLiberadas();
  if (!libs.some(a => a.id === subAcao)) subAcao = libs.length ? libs[0].id : "";
  cx.innerHTML = "";
  for (const a of libs) {
    const b = document.createElement("button");
    b.className = "sub-aba" + (subAcao === a.id ? " on" : "");
    const n = a.id === "caixa" ? Object.keys(caixaAdm).length : 0;
    b.innerHTML = a.nome + (n ? '<span class="pip">' + n + "</span>" : "");
    b.addEventListener("click", () => { subAcao = a.id; renderSubAcoes(); });
    cx.appendChild(b);
  }
  for (const a of SUB_ACOES) {
    const p = $(a.pane);
    if (p) p.style.display = (a.id === subAcao && libs.some(x => x.id === a.id)) ? "block" : "none";
  }
}

/* cada cartão e cada botão só aparece se a permissão estiver ligada */
const CARTOES_PERM = {
  "adm-numeros":    "diag",
  "adm-erros":      "diag",
  "adm-denuncias":  "verLista",
  "adm-manutencao": "recados",
  "adm-teste":      "recados",
  "adm-registro":   "diag",
  "adm-reembolsos": "lojaDar",
  "adm-sug":     "sugVer",
  "adm-equipe":  "equipe",
  "adm-diag":    "diag",
  "adm-enviar":  "lojaDar",
  "adm-pagamento": "lojaDar",
  "adm-atualiza": "recados",
  "adm-mundo":   "recados",
  "adm-eventos": "eventos",
  "adm-boosts":  "boosts",
  "adm-trolls":  "trolls",
  "adm-agora":   ["recados", "eventos", "boosts", "trolls"],
  "adm-vivo":    "verLista",
  "adm-nuvem":   "verLista",
  "adm-local":   "backup",
  "adm-todos":   "backup",
  "adm-backup":  "backup"
};
const BOTOES_PERM = {
  "sug-marcar": "sugMexer", "sug-apagar-lidas": "sugMexer",
  "adm-nuvem-maverick": "darRaros", "adm-nuvem-b2": "darRaros",
  "adm-nuvem-omega": "darRaros", "adm-nuvem-rank": "darRaros",
  "adm-nuvem-zerar": "zerar", "adm-nuvem-remover": "zerar",
  "adm-nuvem-naves-criadas": "zerar",
  "adm-nuvem-gem-zero": "invTirar", "adm-nuvem-naves-zero": "invTirar",
  "adm-nuvem-fases-zero": "invTirar", "adm-nuvem-hab-zero": "invTirar",
  "adm-nuvem-amu-zero": "invTirar",
  "inv-abrir": "invVer",
  "caixa-todos": "presGeral", "caixa-geral-dias": "presGeral"
};
function aplicarPermissoes() {
  for (const id in CARTOES_PERM) {
    const el = $(id);
    if (!el) continue;
    el.style.display = permiteCartao(id) ? "block" : "none";
  }
  for (const id in BOTOES_PERM) {
    const el = $(id);
    if (el) el.style.display = pode(BOTOES_PERM[id]) ? "" : "none";
  }
  // dar coisas e presentes: se não pode dar nada, some a seção inteira
  const sel = $("adm-nuvem-sel");
  if (sel && !pode("darCoisas") && !pode("darRaros") && !pode("invVer") && !pode("zerar")) {
    sel.dataset.bloqueado = "1";
  } else if (sel) delete sel.dataset.bloqueado;
  // a linha de "vale por N dias" acompanha o botão de presente geral
  const dias = $("caixa-geral-dias");
  if (dias && dias.parentElement) {
    dias.parentElement.style.display = pode("presGeral") ? "" : "none";
  }
  const titGeral = document.querySelector("#adm-nuvem-sel .adm-h.gold + .adm-note + .mundo-linha");
  if (titGeral) titGeral.style.display = pode("presGeral") ? "" : "none";
}
$("adm-search").addEventListener("input", admRenderPlayers);

/* =====================================================================
   EQUIPE — o dono monta quem entra no painel e o que cada um enxerga
   ===================================================================== */
let eqCargoNovo = "dev";
let eqPermsNovo = {};      // o que vai ser marcado na hora de adicionar
let eqMembros = [];

function permsDoCargo(id) {
  const c = CARGOS.find(x => x.id === id);
  const p = {};
  if (c) for (const k of c.perms) p[k] = true;
  return p;
}
function renderCargosNovo() {
  const cx = $("eq-cargos");
  if (!cx) return;
  cx.innerHTML = "";
  for (const c of CARGOS) {
    const b = document.createElement("button");
    b.className = "eq-cargo" + (eqCargoNovo === c.id ? " on" : "");
    b.textContent = c.icone + " " + c.nome;
    b.title = c.desc;
    b.addEventListener("click", () => {
      eqCargoNovo = c.id;
      eqPermsNovo = permsDoCargo(c.id);   // o atalho já marca as caixinhas
      renderCargosNovo();
    });
    cx.appendChild(b);
  }
  const d = CARGOS.find(c => c.id === eqCargoNovo);
  const nota = document.createElement("div");
  nota.style.cssText = "width:100%;font-size:.62rem;color:var(--dim);margin-top:6px;line-height:1.45";
  nota.textContent = d ? d.desc : "";
  cx.appendChild(nota);
  renderPermsNovo();
}

/* as caixinhas ficam SEMPRE à mostra, para dar para montar o acesso da
   pessoa antes mesmo de adicionar — o cargo é só um atalho que marca
   várias de uma vez, e mexer numa delas vira "personalizado".            */
function renderPermsNovo() {
  const cx = $("eq-novo-perms");
  if (!cx) return;
  cx.innerHTML = "";
  const ligadas = Object.keys(eqPermsNovo).length;
  const cab = document.createElement("div");
  cab.className = "eq-novo-cab";
  cab.innerHTML = "<span>O QUE ELE VAI PODER FAZER · " + ligadas + " de " +
                  TODAS_PERMISSOES.length + "</span>";
  const limpar = document.createElement("button");
  limpar.textContent = "DESMARCAR TUDO";
  limpar.addEventListener("click", () => {
    eqPermsNovo = {};
    eqCargoNovo = "livre";
    renderCargosNovo();
  });
  cab.appendChild(limpar);
  cx.appendChild(cab);

  const grade = document.createElement("div");
  grade.className = "eq-perms";
  for (const g of PERMISSOES) {
    const t = document.createElement("div");
    t.className = "eq-grupo";
    t.textContent = g.grupo;
    grade.appendChild(t);
    for (const it of g.itens) {
      const on = !!eqPermsNovo[it.id];
      const b = document.createElement("button");
      b.className = "eq-p" + (on ? " on" : "") + (it.perigo ? " perigo" : "");
      b.title = it.desc;
      b.innerHTML = "<i>✓</i><span>" + it.nome + "</span>";
      b.addEventListener("click", () => {
        if (eqPermsNovo[it.id]) delete eqPermsNovo[it.id];
        else eqPermsNovo[it.id] = true;
        // se ficou diferente do atalho, passa a ser personalizado
        const doCargo = permsDoCargo(eqCargoNovo);
        const igual = Object.keys(doCargo).length === Object.keys(eqPermsNovo).length &&
                      Object.keys(doCargo).every(k => eqPermsNovo[k]);
        if (!igual) eqCargoNovo = "livre";
        renderCargosNovo();
      });
      grade.appendChild(b);
    }
  }
  cx.appendChild(grade);
}
eqPermsNovo = permsDoCargo("dev");
renderCargosNovo();

async function admRenderEquipe() {
  const cx = $("eq-lista");
  if (!cx) return;
  cx.innerHTML = '<div class="adm-note">Carregando…</div>';
  // confere se o galho aceita gravação antes de dizer que está vazio
  const teste = await nuvemTestarNo("equipe");
  if (!teste.ok) {
    cx.innerHTML = '<div class="diag-item ruim"><b>✕</b><div>' +
      "<div class='n'>O galho \"equipe\" está bloqueado</div>" +
      "<div class='d'>" + (teste.cod === 401 || teste.cod === 403
        ? "As regras do Firebase estão recusando. Aperte <b>TESTAR AGORA</b> no cartão do teste da nuvem, copie as regras e cole no Firebase."
        : "Não deu para alcançar a nuvem agora.") +
      " Enquanto isso não for resolvido, não dá para montar a equipe.</div></div></div>";
    return;
  }
  eqMembros = await equipeListar();
  cx.innerHTML = "";
  if (!eqMembros.length) {
    cx.innerHTML = '<div class="adm-note">Ninguém na equipe ainda. ' +
      "Escreva o nick lá em cima, escolha o que ele pode fazer e adicione.</div>";
    return;
  }
  for (const m of eqMembros) cx.appendChild(cartaoMembro(m));
}

function cartaoMembro(m) {
  const cargo = CARGOS.find(c => c.id === m.cargo) || CARGOS[4];
  const d = document.createElement("div");
  d.className = "eq-membro";

  const cab = document.createElement("div");
  cab.className = "eq-cab";
  cab.innerHTML = '<b style="color:' + cargo.cor + '">' + cargo.icone + "</b>" +
    '<div class="n"><strong>' + escaparTexto(m.nome) + "</strong>" +
    '<span style="color:' + cargo.cor + '">' + cargo.nome +
      (m.bloqueado ? " · PAUSADO" : "") +
      (m.visto ? " · entrou " + tempoRelativo(m.visto) : " · nunca entrou") +
    "</span></div>";
  d.appendChild(cab);

  const ch = document.createElement("div");
  ch.className = "eq-chave";
  ch.innerHTML = "<code>" + escaparTexto(m.chaveVisivel || "······") + "</code>";
  const copiar = document.createElement("button");
  copiar.textContent = "COPIAR";
  copiar.addEventListener("click", async () => {
    const txt = "Painel do Neon Nebula\nNick: " + m.nome + "\nChave: " + (m.chaveVisivel || "?");
    try { await navigator.clipboard.writeText(txt); copiar.textContent = "✓"; }
    catch (e) { copiar.textContent = m.chaveVisivel || "?"; }
    setTimeout(() => { copiar.textContent = "COPIAR"; }, 2000);
  });
  const nova = document.createElement("button");
  nova.textContent = "TROCAR";
  nova.addEventListener("click", async () => {
    const c = chaveNova();
    await nuvemJuntar("equipe/" + m.id, { chave: admHash("eq|" + c), chaveVisivel: c });
    admMsg("Chave nova de " + m.nome + ": " + c);
    admRenderEquipe();
  });
  ch.appendChild(copiar); ch.appendChild(nova);
  d.appendChild(ch);

  const grade = document.createElement("div");
  grade.className = "eq-perms";
  for (const g of PERMISSOES) {
    const t = document.createElement("div");
    t.className = "eq-grupo";
    t.textContent = g.grupo;
    grade.appendChild(t);
    for (const it of g.itens) {
      const ligada = !!(m.permissoes && m.permissoes[it.id]);
      const b = document.createElement("button");
      b.className = "eq-p" + (ligada ? " on" : "") + (it.perigo ? " perigo" : "");
      b.title = it.desc;
      b.innerHTML = "<i>✓</i><span>" + it.nome + "</span>";
      b.addEventListener("click", async () => {
        m.permissoes = m.permissoes || {};
        if (m.permissoes[it.id]) delete m.permissoes[it.id];
        else m.permissoes[it.id] = true;
        m.cargo = "livre";
        await nuvemSoltar("equipe/" + m.id + "/permissoes", m.permissoes);
        await nuvemSoltar("equipe/" + m.id + "/cargo", "livre");
        admRenderEquipe();
      });
      grade.appendChild(b);
    }
  }
  d.appendChild(grade);

  const acoes = document.createElement("div");
  acoes.className = "eq-acoes";
  for (const c of CARGOS.filter(x => x.id !== "livre")) {
    const b = document.createElement("button");
    b.textContent = c.icone;
    b.title = "Deixar como " + c.nome + ": " + c.desc;
    b.style.flex = "0 0 auto";
    b.style.minWidth = "40px";
    b.addEventListener("click", async () => {
      const p = {};
      for (const id of c.perms) p[id] = true;
      await nuvemSoltar("equipe/" + m.id + "/permissoes", p);
      await nuvemSoltar("equipe/" + m.id + "/cargo", c.id);
      admMsg(m.nome + " agora é " + c.nome);
      admRenderEquipe();
    });
    acoes.appendChild(b);
  }
  const pausar = document.createElement("button");
  pausar.textContent = m.bloqueado ? "LIBERAR" : "PAUSAR";
  pausar.addEventListener("click", async () => {
    await nuvemSoltar("equipe/" + m.id + "/bloqueado", !m.bloqueado);
    admMsg(m.nome + (m.bloqueado ? " liberado" : " pausado"));
    admRenderEquipe();
  });
  const tirar = document.createElement("button");
  tirar.textContent = "✕ TIRAR DO ADM";
  tirar.style.color = "var(--danger)";
  tirar.style.flex = "1 1 100%";
  tirar.title = "Apaga a pessoa da equipe de vez: a chave dela para de valer na hora.";
  let confirma = false;
  tirar.addEventListener("click", async () => {
    if (!confirma) {
      confirma = true;
      tirar.textContent = "TOQUE DE NOVO PARA TIRAR " + m.nome.toUpperCase();
      setTimeout(() => { confirma = false; tirar.textContent = "✕ TIRAR DO ADM"; }, 4000);
      return;
    }
    const r = await nuvemReq("equipe/" + m.id, { method: "DELETE" });
    // confere que sumiu mesmo, em vez de confiar
    const ainda = await nuvemReq("equipe/" + m.id);
    if (ainda) {
      admMsg("⚠ Não deu para tirar " + m.nome + ". Aperte TESTAR AGORA em SISTEMA.");
      AudioSys.deny();
      return;
    }
    admMsg(m.nome + " foi tirado do painel de vez. A chave dele não vale mais.");
    AudioSys.buy();
    admRenderEquipe();
  });
  acoes.appendChild(pausar); acoes.appendChild(tirar);
  d.appendChild(acoes);
  return d;
}

$("eq-add").addEventListener("click", async () => {
  const nick = ($("eq-nick").value || "").trim();
  if (!nick) { admMsg("Escreva o nick da pessoa."); AudioSys.deny(); return; }
  if (ehDono(nick)) { admMsg("Esse nick é de dono, já tem acesso total."); AudioSys.deny(); return; }
  if (!nuvemAtiva()) { admMsg("Precisa do modo online ligado."); AudioSys.deny(); return; }
  const ja = await equipeBuscar(nick);
  if (ja) { admMsg(nick + " já está na equipe."); AudioSys.deny(); return; }
  const cargo = CARGOS.find(c => c.id === eqCargoNovo) || CARGOS[0];
  const chave = chaveNova();
  const perms = Object.assign({}, eqPermsNovo);   // exatamente o que está marcado
  if (!Object.keys(perms).length) {
    admMsg("Marque pelo menos uma coisa que ele pode fazer.");
    AudioSys.deny();
    return;
  }
  const ok = await nuvemSoltar("equipe/" + equipeId(nick), {
    nome: nick, cargo: cargo.id, permissoes: perms,
    chave: admHash("eq|" + chave), chaveVisivel: chave,
    desde: Date.now(), porQuem: PERM.nick
  });
  if (ok === null) {
    admMsg(ultimoErroNuvem === 401 || ultimoErroNuvem === 403
      ? "⚠ O Firebase recusou: falta a regra do galho \"equipe\". Aperte TESTAR AGORA aqui embaixo e copie as regras."
      : "⚠ Não deu para gravar" + (ultimoErroNuvem ? " (erro " + ultimoErroNuvem + ")" : " — sem internet?"));
    AudioSys.deny();
    $("adm-diag").scrollIntoView({ block: "center", behavior: "smooth" });
    return;
  }
  $("eq-nick").value = "";
  admMsg(nick + " entrou como " + cargo.nome + " · chave " + chave +
         " · " + Object.keys(perms).length + " permissão(ões)");
  AudioSys.victory();
  admRenderEquipe();
});

