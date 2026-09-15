
"use strict";
/* =====================================================================
   NEON NEBULA — campanha de 120 fases
   50 naves · ultimates · chefes únicos · amuletos · oficina 3D
   perfis de piloto (login) · painel ADM · save em 3 camadas
   ===================================================================== */

/* ---------- Canvas ---------- */
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
let W = 0, H = 0, DPR = 1;

/* =====================================================================
   AJUSTE AUTOMÁTICO AO APARELHO ("modo leve")
   ---------------------------------------------------------------------
   Celular fraco não perde NADA do jogo: as mesmas fases, os mesmos
   inimigos, as mesmas habilidades. O que muda é só o capricho do
   desenho — quantos pixels são pintados e quantos enfeites rodam ao
   mesmo tempo. O jogo mede sozinho quantos quadros está conseguindo e
   escolhe o nível; se o aparelho der conta, ele volta ao capricho cheio.

   nível 2 = tudo ligado   ·   1 = médio   ·   0 = leve
   ===================================================================== */
const Q = {
  nivel: 2,
  tempos: [],
  janela: 0,
  bons: 0,
  subidas: 0,
  travado: false,      // o jogador pode fixar um nível pelo menu de pausa
  ultimaTroca: 0
};
function qDPR()        { return Q.nivel >= 2 ? 2 : Q.nivel === 1 ? 1.5 : 1; }
function qParticulas() { return Q.nivel >= 2 ? 1 : Q.nivel === 1 ? 0.6 : 0.32; }
function qEstrelas()   { return Q.nivel >= 2 ? 90 : Q.nivel === 1 ? 60 : 36; }
function qEnfeites()   { return Q.nivel >= 1; }     // fumaça, chuva, decoração de evento
function qFundoRico()  { return Q.nivel >= 1; }     // brilhos grandes do fundo

/* chute inicial pelo que o aparelho conta de si mesmo, para não começar
   engasgando nos dois primeiros segundos */
function qChutePeloAparelho() {
  let n = 2;
  try {
    const nucleos = navigator.hardwareConcurrency || 4;
    const memoria = navigator.deviceMemory || 4;
    const pixels = (window.innerWidth * (window.devicePixelRatio || 1)) *
                   (window.innerHeight * (window.devicePixelRatio || 1));
    if (nucleos <= 4 || memoria <= 3) n = 1;
    if (nucleos <= 2 || memoria <= 2) n = 0;
    // tela grande e densa com pouco processador pesa mais
    if (pixels > 2600000 && nucleos <= 6) n = Math.min(n, 1);
  } catch (e) {}
  const guardado = storageGet("nn_qual", "");
  if (guardado === "0" || guardado === "1" || guardado === "2") {
    n = Number(guardado);
    Q.travado = storageGet("nn_qual_fixo", "0") === "1";
  }
  return n;
}
/* Antes, escolher a mesma qualidade não fazia nada ("if igual, return").
   Só que ao trocar de fase o cenário é remontado, e às vezes ele voltava
   pesado mesmo com LEVE marcado: o botão certo já estava aceso, apertar
   nele não adiantava, e a pessoa tinha de ir no AUTOMÁTICO e voltar.
   Agora reaplicar é sempre permitido — refaz fundo, estrelas e figuras. */
function qAplicar(novo, porQue) {
  novo = clamp(novo, 0, 2);
  const mesmo = (novo === Q.nivel);
  Q.nivel = novo;
  Q.ultimaTroca = Date.now();
  Q.tempos.length = 0;
  Q.bons = 0;
  if (!mesmo) storageSet("nn_qual", String(novo));
  document.body.classList.toggle("leve", novo <= 1);
  document.body.classList.toggle("leve-max", novo === 0);
  try { resize(); } catch (e) {}
  try { figurasAjustar(); } catch (e) {}
  try { fundoRefazer(); } catch (e) {}
  try { makeStars(); } catch (e) {}
  try { qMostrarNoPainel(); } catch (e) {}
}
/* olha os últimos quadros e decide se precisa aliviar ou pode caprichar */
const Q_NOMES = [
  { id: 0, nome: "LEVE",     dica: "para celular mais simples: menos enfeites, mais quadros por segundo" },
  { id: 1, nome: "MÉDIO",    dica: "meio-termo entre bonito e leve" },
  { id: 2, nome: "CAPRICHADO", dica: "tudo ligado, para aparelho que aguenta" }
];
/* remonta o cenário com a qualidade que está valendo (usado a cada fase) */
function qReaplicar() {
  try { qAplicar(Q.nivel, "fase nova"); } catch (e) {}
}
function qMostrarNoPainel() {
  const cx = $("qual-linha");
  if (!cx) return;
  cx.innerHTML = "";
  const auto = document.createElement("button");
  auto.className = "qual-btn" + (Q.travado ? "" : " on");
  auto.textContent = "AUTOMÁTICO";
  auto.addEventListener("click", () => {
    Q.travado = false;
    storageSet("nn_qual_fixo", "0");
    Q.tempos.length = 0; Q.bons = 0; Q.subidas = 0;
    qMostrarNoPainel();
    qNota("O jogo volta a escolher sozinho conforme o seu aparelho.");
  });
  cx.appendChild(auto);
  for (const n of Q_NOMES) {
    const b = document.createElement("button");
    b.className = "qual-btn" + (Q.travado && Q.nivel === n.id ? " on" : "");
    b.textContent = n.nome;
    b.addEventListener("click", () => {
      Q.travado = true;
      storageSet("nn_qual_fixo", "1");
      qAplicar(n.id, "escolha do jogador");
      qMostrarNoPainel();
      qNota(n.dica);
    });
    cx.appendChild(b);
  }
}
function qNota(t) {
  const el = $("qual-nota");
  if (el) el.textContent = t;
}
/* A janela fecha por TEMPO (1,2 s) e não por quantidade de quadros: num
   aparelho bem devagar, esperar 70 quadros levaria uns 12 segundos de
   jogo ruim antes de reagir. Assim ele alivia em cerca de um segundo. */
function qMedir(ms) {
  if (Q.travado) return;
  if (S.mode !== "playing") { Q.tempos.length = 0; Q.janela = 0; return; }
  Q.tempos.push(ms);
  Q.janela = (Q.janela || 0) + ms;
  if ((Q.janela < 1200 && Q.tempos.length < 80) || Q.tempos.length < 8) return;
  Q.janela = 0;
  Q.tempos.sort((a, b) => a - b);
  const meio = Q.tempos[Q.tempos.length >> 1];
  Q.tempos.length = 0;
  if (Date.now() - Q.ultimaTroca < 900) return;   // deixa a troca assentar
  if (meio > 23 && Q.nivel > 0) {            // menos de ~43 quadros por segundo
    Q.bons = 0;
    qAplicar(Q.nivel - 1, "engasgando");
  } else if (meio < 16.9 && Q.nivel < 2 && Q.subidas < 2) {
    Q.bons++;
    if (Q.bons >= 6) { Q.subidas++; qAplicar(Q.nivel + 1, "sobrando"); }
  } else if (meio < 20) {
    Q.bons = 0;
  }
}

/* ---------- Arena maior ----------
   O campo de batalha e desenhado um pouco "afastado": tudo fica levemente
   menor na tela e, em troca, W e H passam a valer mais. Como o jogo inteiro
   mede as posicoes em W/H, a arena cresce de verdade — cabe mais inimigo,
   sobra mais espaco para desviar — sem mexer em nenhuma outra conta.
   Em tela pequena o afastamento e menor, para a nave nao virar formiga.  */
let ZOOM = 1;
/* A ARENA INFINITA afasta mais que as fases: lá voam todos os jogadores
   juntos, com onda atrás de onda, e ver mais longe é o que deixa dar para
   desviar. Só a arena — as fases continuam do tamanho de sempre.       */
function naArena() {
  try { return !!(MP && MP.modo === "arena"); } catch (e) { return false; }
}
function zoomDaTela(lp) {
  // celular estreito afasta menos; tablet e PC afastam mais
  let z = lp < 380 ? 0.94 : lp < 460 ? 0.90 : lp < 760 ? 0.87 : 0.84;
  if (naArena()) z *= 0.8;      // arena: mais campo de visão
  return z;
}
/* converte um ponto da tela (dedo/mouse) para a coordenada da arena */
function pxX(v) { return v / ZOOM; }
function pxY(v) { return v / ZOOM; }

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, qDPR());
  const lp = window.innerWidth;
  ZOOM = zoomDaTela(lp);
  W = lp / ZOOM;
  H = window.innerHeight / ZOOM;
  canvas.width = Math.round(lp * DPR);
  canvas.height = Math.round(window.innerHeight * DPR);
  ctx.setTransform(DPR * ZOOM, 0, 0, DPR * ZOOM, 0, 0);
  /* Se a arena afastou, os botões também encolhem: eles tomariam um
     pedaço grande demais de uma tela que agora mostra mais jogo.     */
  const escala = naArena() ? 0.82 : 1;
  const raiz = document.documentElement;
  if (raiz.dataset.uiEscala !== String(escala)) {
    raiz.dataset.uiEscala = String(escala);
    raiz.style.setProperty("--ui-escala", String(escala));
  }
  document.body.classList.toggle("na-arena", naArena());
}
/* chamado quando entra e quando sai da arena, para a tela se ajustar */
function ajustarParaArena() {
  try {
    resize();
    figurasAjustar();
    fundoRefazer();
    makeStars();
    renderHabBar(true);
  } catch (e) {}
}
resize();
window.addEventListener("resize", () => {
  resize();
  try { figurasAjustar(); } catch (e) {}
  try { fundoRefazer(); } catch (e) {}
  try { renderHabBar(true); } catch (e) {}
});
window.addEventListener("orientationchange", () => setTimeout(resize, 250));

/* ---------- Utilidades ---------- */
const TAU = Math.PI * 2;
const TOTAL_FASES = 270;   // 120 originais + 150 novas
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
const lerp = (a, b, t) => a + (b - a) * t;

function storageGet(key, fallback) {
  try { const v = localStorage.getItem(key); return v === null ? fallback : v; }
  catch (e) { return fallback; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, value); } catch (e) {}
}
function vibrate(ms) {
  try { if (typeof AJ !== "undefined" && AJ && AJ.vibrar === false) return; } catch (e) {}
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {}
}
function fmt(n) { try { return n.toLocaleString("pt-BR"); } catch (e) { return String(n); } }

/* ---------- Banco de dados: perfis de piloto ----------
   ROOT = { savedAt, current, adminPass, profiles: {nome -> save} }
   Camadas (a mais nova por piloto vence):
   1. localStorage   2. IndexedDB   3. save na nuvem embutido na página */
const ROOT_KEY = "nn_root1";
function defaultSave() {
  return {
    savedAt: 0,
    crystals: 0, best: 0, hi: 0, pts: 0,
    pedidos: [],             // o que eu pedi na loja
    tag: "",                 // gametag: o nome que os amigos veem
    tagQuando: 0,            // quando trocou pela última vez (uma vez por dia)
    vipAte: 0,               // até quando o VIP vale
    vipDia: "",              // último dia em que pegou o presente do VIP
    passes: {},              // passes comprados, valem para sempre
    trocouRecorde: false,
    upgrades: { dmg: 0, rate: 0, hull: 0, shield: 0, speed: 0, luck: 0,
                mira: 0, crit: 0, ima: 0, reparo: 0, carga: 0, placa: 0, reserva: 0, estilha: 0 },
    skills: {},
    ships: [0], ship: 0, parts: {},
    custom: {},              // nave -> {hue, glow}
    paints: {},              // nave -> [matizes compradas]
    glows: {},               // nave -> [matizes compradas]
    weapons: {},             // nave -> [armas liberadas]
    weaponSel: {},           // nave -> arma equipada
    amulets: [],             // {uid, type, rar}
    amuletSeq: 1,
    equipped: [],            // uids equipados (até 3)
    godMode: false,          // ligado pelo painel ADM
    senha: null,             // senha desenho (embaralhada)
    tempoJogado: 0,          // segundos dentro de partidas
    tempos: {},              // fase -> melhor tempo em segundos
    rank: 0, vitorias: 0, derrotas: 0,   // modo competitivo
    coopBest: 0,                         // progresso do cooperativo (200 fases)
    arenaMortos: 0,          // inimigos que você derrubou na arena infinita
    arenaChefes: 0,          // chefes que você derrubou na arena infinita
    dificuldade: "medio",    // facil | medio | dificil (o online é sempre médio)
    criadas: [],             // naves montadas por você na oficina de construção
    limpezaNaves: 0,         // número da última limpeza de naves aplicada
    sugestoes: [],           // resumo do que você já sugeriu
    sugPendentes: [],        // sugestões esperando internet para subir
    presenteGeralVisto: 0,   // data do último presente geral que você já pegou
    arenaOnda: 0,            // maior onda que você alcançou na arena
    transmitir: true,        // deixa os amigos verem a sua tela
    controle: "auto",        // auto | pc | toque
    amigos: [],              // apelidos dos amigos
    habNv: {},               // nível das habilidades: "nave:habilidade" -> nível
    estrelas: {},            // fase -> quantas estrelas (1 passou, 2 sem dano, 3 rápido)
    conquistas: {},          // id da conquista -> quando foi pega
    conjuntos: [null, null, null],  // três conjuntos de nave + relíquias
    bauHist: [],             // o que saiu dos últimos baús
    prestigio: 0,            // quantas vezes já terminou as 270 fases
    bossRushRec: 0,          // recorde na maratona de chefes
    ultimos: [],             // últimos parceiros de partida
    abates: 0, tiros: 0, acertos: 0, chefes: 0, mortes: 0, partidas: 0,
    fasesPerfeitas: 0, melhorCombo: 0, coopFases: 0, missoesFeitas: 0, maiorSeq: 0,
    tutorialFeito: false,    // já viu o tutorial da primeira fase
    conviteUsado: null,      // de quem foi o convite que usei
    temporada: 0,            // temporada da ranqueada que está valendo
    resgate: null,           // código que devolve a conta se esquecer a senha
    moldura: "nenhuma",      // moldura do apelido
    cla: null,               // código do esquadrão
    combosVistos: {},        // combinações de habilidades já descobertas
    combosFeitos: 0,
    abandonos: 0,            // duelos abandonados no meio
    filaTravadaAte: 0,       // até quando fica fora da fila
    ofertaUsada: false,      // já pegou a oferta do primeiro dia
    historico: [],           // últimas partidas da ranqueada
    historicoTemporadas: [], // como você terminou cada temporada
    bloqueados: {},          // quem você bloqueou
    denunciei: [],           // quem você já denunciou
    convidados: 0,           // quantos entraram com o meu código
    desde: 0,                // quando este piloto voou pela primeira vez
    diaria: { dia: "", seq: 0 },   // presente do dia e a sequência de dias
    missoes: { dia: "", itens: [] },  // as três missões do dia
    jornadas: {}             // campanha em dupla: "nick|nick" -> {fase, up, ...}
  };
}
function mergeSave(parsed) {
  const s = Object.assign(defaultSave(), parsed || {});
  const d = defaultSave();
  s.upgrades = Object.assign(d.upgrades, (parsed && parsed.upgrades) || {});
  s.passes = (parsed && parsed.passes) || {};
  s.skills = (parsed && parsed.skills) || {};
  s.ships = (parsed && Array.isArray(parsed.ships) && parsed.ships.length) ? parsed.ships : [0];
  s.parts = (parsed && parsed.parts) || {};
  s.habNv = (parsed && parsed.habNv) || {};
  s.estrelas = (parsed && parsed.estrelas) || {};
  s.conquistas = (parsed && parsed.conquistas) || {};
  s.conjuntos = (parsed && Array.isArray(parsed.conjuntos)) ? parsed.conjuntos : [null, null, null];
  s.bloqueados = (parsed && parsed.bloqueados) || {};
  s.historico = (parsed && Array.isArray(parsed.historico)) ? parsed.historico : [];
  s.historicoTemporadas = (parsed && Array.isArray(parsed.historicoTemporadas)) ? parsed.historicoTemporadas : [];
  s.bauHist = (parsed && Array.isArray(parsed.bauHist)) ? parsed.bauHist : [];
  s.diaria = (parsed && parsed.diaria) || { dia: "", seq: 0 };
  s.missoes = (parsed && parsed.missoes) || { dia: "", itens: [] };
  s.jornadas = (parsed && parsed.jornadas) || {};
  s.custom = (parsed && parsed.custom) || {};
  s.paints = (parsed && parsed.paints) || {};
  s.glows = (parsed && parsed.glows) || {};
  s.weapons = (parsed && parsed.weapons) || {};
  s.weaponSel = (parsed && parsed.weaponSel) || {};
  s.amulets = (parsed && Array.isArray(parsed.amulets)) ? parsed.amulets : [];
  s.equipped = (parsed && Array.isArray(parsed.equipped)) ? parsed.equipped.slice(0, 4) : [];
  // conserta saves antigos: naves que não existem mais, ou fora da lista.
  // A frota pode ainda não ter sido montada quando o save é lido, então o
  // limite é obtido com cuidado — sem isso o perfil inteiro deixa de carregar.
  let totalNaves = 9999;
  try { if (SHIPS && SHIPS.length) totalNaves = SHIPS.length; } catch (e) {}
  s.ships = s.ships.filter(i => typeof i === "number" && i >= 0 && i < totalNaves);
  if (!s.ships.length) s.ships = [0];
  if (typeof s.ship !== "number" || s.ships.indexOf(s.ship) < 0) s.ship = s.ships[0];
  return s;
}
function defaultRoot() { return { savedAt: 0, current: null, adminPass: null, profiles: {} }; }
function mergeRoot(base, extra) {
  if (!extra) return base;
  // save da nuvem no formato antigo (sem perfis): vira o piloto "Jogador 1"
  if (!extra.profiles && typeof extra.crystals === "number") {
    extra = { savedAt: extra.savedAt || 0, profiles: { "Jogador 1": extra } };
  }
  if (!extra.profiles) return base;
  for (const name in extra.profiles) {
    const a = base.profiles[name], b = extra.profiles[name];
    if (!a || (b && (b.savedAt || 0) > (a.savedAt || 0))) base.profiles[name] = mergeSave(b);
  }
  if (!base.adminPass && extra.adminPass) base.adminPass = extra.adminPass;
  if (!base.adm && extra.adm) base.adm = extra.adm;   // acesso do painel guardado
  if (!base.current && extra.current) base.current = extra.current;
  return base;
}
let ROOT = defaultRoot();
let save = defaultSave();   // perfil ativo (referência dentro de ROOT.profiles)

(function loadRoot() {
  try {
    const raw = storageGet(ROOT_KEY, null);
    if (raw) {
      const parsed = JSON.parse(raw);
      ROOT = Object.assign(defaultRoot(), parsed);
      ROOT.profiles = {};
      for (const name in (parsed.profiles || {})) ROOT.profiles[name] = mergeSave(parsed.profiles[name]);
    }
  } catch (e) { ROOT = defaultRoot(); }
  // migração dos saves antigos (jogo sem login)
  if (Object.keys(ROOT.profiles).length === 0) {
    const old = storageGet("nn_save3", null) || storageGet("nn_save2", null);
    if (old) {
      try { ROOT.profiles["Jogador 1"] = mergeSave(JSON.parse(old)); ROOT.current = "Jogador 1"; } catch (e) {}
    }
  }
  // save embutido na nuvem (página publicada como Artifact)
  try {
    const tag = document.getElementById("cloud-save");
    const cloud = tag ? JSON.parse(tag.textContent) : null;
    if (cloud) mergeRoot(ROOT, cloud);
  } catch (e) {}
})();

let idb = null;
function idbPut() {
  if (!idb) return;
  try { idb.transaction("kv", "readwrite").objectStore("kv").put(JSON.stringify(ROOT), "root"); } catch (e) {}
}
try {
  const idbReq = indexedDB.open("neon-nebula-db", 2);
  idbReq.onupgradeneeded = e => {
    const db = e.target.result;
    if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
  };
  idbReq.onsuccess = e => {
    idb = e.target.result;
    try {
      const get = idb.transaction("kv").objectStore("kv").get("root");
      get.onsuccess = () => {
        try {
          const parsed = get.result ? JSON.parse(get.result) : null;
          if (parsed) {
            mergeRoot(ROOT, parsed);
            if (save && save.__name) save = ROOT.profiles[save.__name] || save;
            if (S.mode === "login") renderLogin();
            if (S.mode === "menu") { calcStats(); refreshMenu(); }
          }
          idbPut();
        } catch (err) {}
      };
    } catch (err) {}
  };
} catch (e) {}

let copiaMarca = 0;
function persist() {
  /* a cópia no banco do aparelho não precisa ser a cada gravação */
  try {
    if (Date.now() - copiaMarca > 20000) { copiaMarca = Date.now(); setTimeout(copiaSegura, 30); }
  } catch (e) {}
  /* dono: o saldo volta ao teto a cada gravação, então comprar nunca
     diminui nada — é o que o sinal de infinito promete na tela */
  try {
    if (typeof cristaisInfinitos === "function" && cristaisInfinitos()) {
      save.crystals = CRISTAIS_DONO;
    }
  } catch (e) {}
  save.savedAt = Date.now();
  ROOT.savedAt = save.savedAt;
  storageSet(ROOT_KEY, JSON.stringify(ROOT));
  idbPut();
}
window.addEventListener("pagehide", () => { storageSet(ROOT_KEY, JSON.stringify(ROOT)); });

function loginAs(name) {
  if (!ROOT.profiles[name]) ROOT.profiles[name] = defaultSave();
  ROOT.current = name;
  save = ROOT.profiles[name];
  save.__name = name;
  try { aplicarLimpezaDeNaves(); } catch (e) {}
  // as naves que este piloto montou entram no fim da lista
  try { reconstruirNavesCriadas(); } catch (e) {}
  // a conta do dono já entra com tudo liberado
  try { darTudoAoDono(name); } catch (e) {}
  persist();
  calcStats();
}

/* =====================================================================
   NUVEM (opcional) — deixa os pilotos de todo mundo aparecerem para você
   ---------------------------------------------------------------------
   Sem preencher nada, o jogo funciona exatamente como antes, só no
   aparelho. Para ligar o modo online, crie um Realtime Database gratuito
   no Firebase e cole o endereço dele em NUVEM_URL, no arquivo config.js
   (é o único arquivo que você precisa editar). Passo a passo: NUVEM.md.
   ===================================================================== */
/* Endereço da nuvem. Vem do config.js — e, só para teste, dá para apontar
   para um servidor LOCAL pela barra de endereço (?nuvem=http://127.0.0.1:...).
   Só endereço local é aceito: assim ninguém consegue mandar um link que
   desvia o jogo de outra pessoa para um banco estranho.                */
const NUVEM_URL = (function () {
  const doArquivo = (window.NN_CONFIG && window.NN_CONFIG.NUVEM_URL) || "";
  try {
    const q = new URLSearchParams(location.search).get("nuvem");
    if (q && /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(q.replace(/\/$/, ""))) {
      return q.replace(/\/$/, "");
    }
  } catch (e) {}
  return doArquivo;
})();

function nuvemAtiva() { return typeof NUVEM_URL === "string" && NUVEM_URL.indexOf("http") === 0; }

function nuvemHash(t) {
  let h = 5381;
  for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) >>> 0;
  return h.toString(16);
}
function nuvemAparelho() {
  let id = storageGet("nn_device", null);
  if (!id) {
    id = "d" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    storageSet("nn_device", id);
  }
  return id;
}
/* O identificador do piloto na nuvem vem SÓ do nome da conta.
   Assim a mesma conta é a mesma pessoa em qualquer celular: o ranking não
   duplica e os presentes do administrador chegam mesmo se você entrar de
   outro aparelho.                                                          */
function nuvemId(nome) { return "p" + nuvemHash(nome); }
/* formato antigo (preso ao aparelho) — só para limpar registros repetidos */
function nuvemIdAntigo(nome) { return nuvemAparelho() + "_" + nuvemHash(nome); }
let nuvemLimpou = {};
async function nuvemLimparAntigo(nome) {
  if (!nome || nuvemLimpou[nome]) return;
  nuvemLimpou[nome] = true;
  const antigo = nuvemIdAntigo(nome);
  if (antigo === nuvemId(nome)) return;
  const p = await nuvemReq("pilotos/" + antigo);
  if (p) await nuvemReq("pilotos/" + antigo, { method: "DELETE" });
}

let nuvemStatus = "?";   // "?" ainda não testado | "ok" | "erro"
let nuvemErroDetalhe = "";
/* O "consulta" é o que vem depois do .json: ?orderBy="$key"&limitToLast=40.
   Sem ele, pedir um canal de bate-papo traria a conversa INTEIRA a cada
   olhada -- e um canal de comunidade cresce para sempre. Com ele, pede-se
   só a janela que vai aparecer na tela. */
async function nuvemReq(caminho, opcoes, consulta) {
  if (!nuvemAtiva()) return null;
  try {
    const r = await fetch(NUVEM_URL.replace(/\/$/, "") + "/" + caminho + ".json" + (consulta || ""),
                          opcoes || {});
    if (!r.ok) {
      nuvemStatus = "erro";
      nuvemErroDetalhe = (r.status === 401 || r.status === 403)
        ? "as regras do banco estão bloqueando (passo 3 do NUVEM.md)"
        : "o servidor respondeu " + r.status;
      nuvemMostrarStatus();
      return null;
    }
    nuvemStatus = "ok";
    nuvemMostrarStatus();
    const txt = await r.text();
    return txt && txt !== "null" ? JSON.parse(txt) : null;
  } catch (e) {
    nuvemStatus = "erro";
    nuvemErroDetalhe = "não foi possível alcançar o endereço";
    nuvemMostrarStatus();
    return null;
  }
}

/* =====================================================================
   Protocolo rápido: fluxo (streaming) em vez de ficar perguntando
   ---------------------------------------------------------------------
   O Realtime Database sabe EMPURRAR as mudanças pela mesma porta HTTPS
   (text/event-stream). Em vez de pedir a sala 6 vezes por segundo, a
   gente abre UMA conexão e o servidor avisa na hora que algo mudou.
   Isso tira o atraso do multijogador e gasta muito menos rede.
   Se o aparelho ou a rede não aceitarem, cai sozinho no modo antigo
   (perguntar de tempo em tempo), então nunca fica sem funcionar.
   ===================================================================== */
function nuvemTemFluxo() {
  return typeof ReadableStream === "function" &&
         typeof TextDecoder === "function" &&
         typeof AbortController === "function";
}

/* aplica um evento do fluxo sobre um objeto local, seguindo o caminho */
function fluxoAplicar(raiz, caminho, dados, mesclar) {
  const partes = String(caminho || "/").split("/").filter(Boolean);
  if (!partes.length) {
    if (!mesclar) return dados === null ? {} : dados;
    if (dados && typeof dados === "object") Object.assign(raiz, dados);
    return raiz;
  }
  let cur = raiz;
  for (let i = 0; i < partes.length - 1; i++) {
    if (typeof cur[partes[i]] !== "object" || cur[partes[i]] === null) cur[partes[i]] = {};
    cur = cur[partes[i]];
  }
  const ultimo = partes[partes.length - 1];
  if (dados === null) delete cur[ultimo];
  else if (mesclar && typeof cur[ultimo] === "object" && cur[ultimo] &&
           typeof dados === "object") Object.assign(cur[ultimo], dados);
  else cur[ultimo] = dados;
  return raiz;
}

/* abre o fluxo de um caminho. aoMudar(objetoCompleto) roda a cada novidade.
   devolve uma função para fechar.                                          */
/* "consulta" igual à do nuvemReq: o fluxo passa a empurrar só a janela
   pedida. Um canal de comunidade com mil mensagens mandaria as mil a
   cada reconexão sem isso. */
function nuvemFluxo(caminho, aoMudar, aoFalhar, consulta) {
  if (!nuvemAtiva() || !nuvemTemFluxo()) { if (aoFalhar) aoFalhar(); return () => {}; }
  let parado = false;
  let ctrl = null;
  let estado = {};
  let tentativas = 0;

  async function conectar() {
    if (parado) return;
    ctrl = new AbortController();
    try {
      const r = await fetch(NUVEM_URL.replace(/\/$/, "") + "/" + caminho + ".json" + (consulta || ""),
        { headers: { Accept: "text/event-stream" }, signal: ctrl.signal });
      if (!r.ok || !r.body) throw new Error("sem fluxo");
      nuvemStatus = "ok";
      tentativas = 0;
      const leitor = r.body.getReader();
      const dec = new TextDecoder();
      let buf = "", evento = "";
      while (!parado) {
        const { value, done } = await leitor.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let corte;
        while ((corte = buf.indexOf("\n")) >= 0) {
          const linha = buf.slice(0, corte).replace(/\r$/, "");
          buf = buf.slice(corte + 1);
          if (linha.indexOf("event:") === 0) { evento = linha.slice(6).trim(); continue; }
          if (linha.indexOf("data:") !== 0) continue;
          const cru = linha.slice(5).trim();
          if (evento !== "put" && evento !== "patch") continue;
          let pacote = null;
          try { pacote = JSON.parse(cru); } catch (e) { continue; }
          if (!pacote) continue;
          estado = fluxoAplicar(estado, pacote.path, pacote.data, evento === "patch") || {};
          try { aoMudar(estado); } catch (e) {}
        }
      }
    } catch (e) {
      if (parado) return;
      tentativas++;
      if (tentativas === 1 && aoFalhar) aoFalhar();   // avisa para ligar a reserva
      // tenta de novo, com espera crescente e limitada
      setTimeout(conectar, Math.min(400 * tentativas, 4000));
      return;
    }
    if (!parado) setTimeout(conectar, 300);
  }
  conectar();
  return () => { parado = true; try { ctrl && ctrl.abort(); } catch (e) {} };
}

/* escrita leve: não mexe no aviso de status nem espera resposta.
   Usada no meio da partida, onde o que importa é sair rápido.             */
/* Escrita leve. Devolve a resposta quando deu certo e NULL quando não deu
   — inclusive quando o Firebase recusa por falta de regra (401/403).
   Antes ela devolvia a resposta mesmo em caso de recusa, então quem
   checava "=== null" achava que tinha funcionado.                        */
let ultimoErroNuvem = 0;
function nuvemSoltar(caminho, valor, metodo) {
  if (!nuvemAtiva()) return Promise.resolve(null);
  return fetch(NUVEM_URL.replace(/\/$/, "") + "/" + caminho + ".json", {
    method: metodo || "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(valor)
  }).then(r => {
    if (r && r.ok) return r;
    ultimoErroNuvem = (r && r.status) || 0;
    return null;
  }).catch(() => { ultimoErroNuvem = 0; return null; });
}
function nuvemJuntar(caminho, obj) { return nuvemSoltar(caminho, obj, "PATCH"); }

/* =====================================================================
   MODO COMPATÍVEL — para quem está com as regras antigas do Firebase
   ---------------------------------------------------------------------
   Os galhos amigos/, conversas/, suporte/ e loja_pedidos/ nasceram
   depois, e só existem nas regras da versão 5.1 para cá. Quem ainda não
   colou as regras novas via o pedido de amizade e o chat falharem com
   "tente de novo" — e não tinha como o jogo adivinhar isso.
   Agora ele tenta o galho certo e, se o Firebase recusar, guarda a MESMA
   informação dentro de pilotos/<id>, que toda regra antiga já libera
   (é o galho do ranking, sem ele nada online funcionaria).
   Assim a amizade e o chat funcionam de qualquer jeito, e continuam
   funcionando sozinhos quando as regras novas forem coladas.
   ===================================================================== */
let NUVEM_COMPAT = storageGet("nn_compat", "0") === "1";
let compatProximoTeste = 0;
function compatLigar() {
  if (NUVEM_COMPAT) return;
  NUVEM_COMPAT = true;
  storageSet("nn_compat", "1");
}
function compatDesligar() {
  if (!NUVEM_COMPAT) return;
  NUVEM_COMPAT = false;
  storageSet("nn_compat", "0");
  try { nuvemMostrarStatus(); } catch (e) {}
}
/* Colou as regras novas? O jogo precisa PERCEBER isso sozinho.
   De tempos em tempos ele tenta escrever uma marquinha no galho novo; se
   passar, o modo compatível se desliga e tudo volta ao lugar certo.   */
async function compatConferir(forcar) {
  if (!nuvemAtiva()) return false;
  if (!forcar && Date.now() < compatProximoTeste) return false;
  compatProximoTeste = Date.now() + 5 * 60000;
  const alvo = "amigos/__teste/" + (meuIdNuvem() || "x");
  const ok = await nuvemSoltar(alvo, { t: Date.now() });
  if (ok === null) return false;
  nuvemReq(alvo, { method: "DELETE" });
  compatDesligar();
  return true;
}
/* traduz um caminho novo para o lugar equivalente dentro de pilotos/ */
function compatDe(caminho) {
  const c = String(caminho || "");
  let m = /^amigos\/([^/]+)(\/.*)?$/.exec(c);
  if (m) return "pilotos/" + m[1] + "/_am" + (m[2] || "");
  m = /^suporte\/([^/]+)(\/.*)?$/.exec(c);
  if (m) return "pilotos/" + m[1] + "/_sup" + (m[2] || "");
  m = /^loja_pedidos\/([^/]+)(\/.*)?$/.exec(c);
  if (m) return "pilotos/" + m[1] + "/_loja" + (m[2] || "");
  return null;
}
/* escreve tentando o galho certo e caindo para o compatível */
async function nuvemSoltarC(caminho, valor, metodo) {
  const alt = compatDe(caminho);
  // no modo compatível, de vez em quando testa se as regras novas chegaram
  if (NUVEM_COMPAT) { try { await compatConferir(false); } catch (e) {} }
  if (!NUVEM_COMPAT) {
    const r = await nuvemSoltar(caminho, valor, metodo);
    if (r !== null) return r;
    if (!alt) return null;
  }
  if (!alt) return null;
  const r2 = await nuvemSoltar(alt, valor, metodo);
  if (r2 !== null) compatLigar();
  return r2;
}
function nuvemJuntarC(caminho, obj) { return nuvemSoltarC(caminho, obj, "PATCH"); }
/* lê dos dois lugares e junta, para não perder o que ficou no antigo */
async function nuvemReqC(caminho) {
  const alt = compatDe(caminho);
  const a = await nuvemReq(caminho);
  if (!alt) return a;
  const b = await nuvemReq(alt);
  if (!b) return a;
  if (!a) { compatLigar(); return b; }
  const junto = Object.assign({}, a);
  for (const k in b) {
    if (junto[k] && typeof junto[k] === "object" && typeof b[k] === "object") {
      junto[k] = Object.assign({}, junto[k], b[k]);
    } else junto[k] = b[k];
  }
  return junto;
}
/* Fluxo do galho certo — ou do compatível, quando é esse que vale.
   UM stream só de propósito: o navegador deixa poucas conexões abertas
   ao mesmo tempo com o mesmo servidor (seis, no padrão). Abrir dois por
   assunto estoura o limite e as gravações ficam presas na fila. */
function nuvemFluxoC(caminho, aoMudar, aoFalhar) {
  const alt = compatDe(caminho);
  return nuvemFluxo(NUVEM_COMPAT && alt ? alt : caminho, aoMudar, aoFalhar);
}

function nuvemMostrarStatus() {
  const el = $("nuvem-status");
  if (!el) return;
  if (!nuvemAtiva()) { el.style.display = "none"; return; }
  /* Recado técnico é assunto do dono. Para os outros jogadores o menu
     fica limpo: eles não têm o que fazer com regra de Firebase.      */
  let souDono = false;
  try { souDono = contaDeDono(save && save.__name); } catch (e) {}
  if (!souDono) {
    if (nuvemStatus === "erro") {
      el.style.display = "block";
      el.className = "nuvem-erro";
      el.textContent = "☁ Sem conexão com a nuvem agora — o online volta sozinho.";
    } else {
      el.style.display = "none";
    }
    return;
  }
  el.style.display = "block";
  if (nuvemStatus === "ok" && NUVEM_COMPAT) {
    /* está funcionando, mas pelo caminho de compatibilidade: vale avisar
       sem assustar, com o botão que resolve ali do lado                */
    el.className = "nuvem-ok";
    el.innerHTML = "☁ Modo online ligado <b>(modo compatível)</b>" +
      "<div class='nuvem-dica'>As regras do seu Firebase são de antes da " +
      "versão 5.1, então amizades e conversas ficam guardadas junto com a " +
      "ficha do piloto. Funciona assim mesmo — mas colando as regras novas " +
      "fica mais organizado.</div>" +
      "<button class='nuvem-btn' id='nuvem-copiar'>📋 COPIAR AS REGRAS NOVAS</button>" +
      "<button class='nuvem-btn' id='nuvem-reconferir'>✓ JÁ COLEI — CONFERIR AGORA</button>";
    const br = $("nuvem-reconferir");
    if (br) br.addEventListener("click", async () => {
      br.textContent = "Conferindo…";
      const ok = await compatConferir(true);
      br.textContent = ok ? "✓ Pronto! As regras novas estão valendo."
                          : "Ainda recusando. Confira se publicou no Firebase.";
      if (ok) setTimeout(nuvemMostrarStatus, 1500);
    });
    const bt2 = $("nuvem-copiar");
    if (bt2) bt2.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(admRegrasJSON());
        bt2.textContent = "✓ COPIADO — cole no Firebase e publique";
      } catch (e) { bt2.textContent = "Abra o painel → TESTE DA NUVEM"; }
    });
  } else if (nuvemStatus === "ok") {
    el.className = "nuvem-ok";
    el.textContent = "☁ Modo online ligado";
  } else if (nuvemStatus === "erro") {
    el.className = "nuvem-erro";
    /* Quando o Firebase recusa, quase sempre é uma destas duas: as regras
       de teste venceram (elas valem 30 dias e depois fecham sozinhas) ou
       falta um galho novo na lista. As duas se resolvem colando as regras
       de novo, então o aviso já traz o botão que copia o texto pronto. */
    const bloqueio = nuvemErroDetalhe.indexOf("regras") >= 0;
    el.innerHTML = "☁ <b>Sem conexão com a nuvem</b> — " + escaparLongo(nuvemErroDetalhe) + "." +
      (bloqueio
        ? "<div class='nuvem-dica'>Isso acontece quando as regras de teste do Firebase " +
          "vencem (elas duram 30 dias) ou quando falta um galho novo na lista. " +
          "Copie as regras abaixo, cole em <b>Firebase → Realtime Database → Regras</b> " +
          "e aperte Publicar.</div>" +
          "<button class='nuvem-btn' id='nuvem-copiar'>📋 COPIAR AS REGRAS CERTAS</button>"
        : "<div class='nuvem-dica'>Confira o endereço no arquivo config.js e a internet do aparelho.</div>");
    const bt = $("nuvem-copiar");
    if (bt) bt.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(admRegrasJSON());
        bt.textContent = "✓ COPIADO — cole no Firebase e publique";
      } catch (e) {
        bt.textContent = "Não deu para copiar: abra o painel → TESTE DA NUVEM";
      }
    });
  } else {
    el.className = "nuvem-ok";
    el.textContent = "☁ Conectando…";
  }
}

/* envia o resumo do piloto atual (só apelido e números do jogo) */
let nuvemUltimoEnvio = 0;
async function nuvemEnviar(forcar) {
  if (!nuvemAtiva() || !save.__name) return;
  const agora = Date.now();
  if (!forcar && agora - nuvemUltimoEnvio < 15000) return;
  nuvemUltimoEnvio = agora;
  const resumo = {
    nome: save.__name,
    versao: VERSAO,
    entrou: sessaoComecou,
    onde: ondeEstou(),
    fase: save.best || 0,
    cristais: save.crystals || 0,
    naves: save.ships ? save.ships.length : 1,
    amuletos: save.amulets ? save.amulets.length : 0,
    habilidades: Object.keys(save.skills || {}).length,
    recorde: save.hi || 0,
    horas: Math.round((save.tempoJogado || 0) / 36) / 100,
    melhorTempo: melhorTempoDoJogador(),
    rank: save.rank || 0,
    vitorias: save.vitorias || 0,
    derrotas: save.derrotas || 0,
    arenaOnda: save.arenaOnda || 0,
    arenaMortos: save.arenaMortos || 0,
    arenaChefes: save.arenaChefes || 0,
    /* O ranking ja sabia desenhar o nome dourado com coroa para quem tem
       VIP, e a moldura escolhida no perfil ja ficava salva -- mas nenhum
       dos dois saia daqui. O desenho esperava um dado que ninguem
       enviava, entao o VIP de quem pagou nunca aparecia para os outros e
       a moldura nao decorava nada. */
    vip: (function () { try { return !!temVip(); } catch (e) { return false; } })(),
    moldura: (function () { try { return molduraAtual(); } catch (e) { return "nenhuma"; } })(),
    /* O PERFIL TEM QUE SAIR DAQUI, senão ele decora só a própria tela.
       Foi exatamente o que já aconteceu com o VIP e com a moldura: o
       desenho esperava um dado que ninguém enviava, e quem pagou não
       aparecia diferente para mais ninguém. Vai o NÍVEL e o que a pessoa
       escolheu — quem lê decide o que vale, porque o nível pode ter
       acabado no caminho. */
    neo: (function () { try { return neoNivel(); } catch (e) { return "nenhum"; } })(),
    perfil: (function () {
      try {
        /* VAI O PERFIL INTEIRO, e não seis campos escolhidos a dedo.
           Aqui estavam listados bio, pronomes, cor, efeito, fundo e
           avatar. Tudo o que entrou depois -- a foto, o banner, a fonte
           do nome, o ícone de estado, as duas cores, o ângulo, a
           textura, os interesses, os blocos -- ficava salvo no aparelho
           e NUNCA saía dele. Quer dizer: a pessoa personalizava o perfil
           e só ela via. "Troquei a foto e não aparece" e "o ícone de
           estado não funciona" eram a mesma linha de código.

           É o mesmo erro que o comentário logo acima já descrevia sobre
           o VIP e a moldura, cometido de novo três campos depois. Por
           isso agora a lista não existe: o que está no PERFIL_PADRAO vai,
           e quem acrescentar um campo lá não precisa lembrar de nada.

           Cabe: são uns trinta campos curtos (ids de uma palavra e
           números pequenos), e a bio -- a única coisa comprida -- já
           viajava aqui desde sempre. A FOTO continua fora: o que vai é a
           marca dela, que é um número. */
        const p = perfilMeu();
        const fora = {};
        for (const k in PERFIL_PADRAO) {
          const v = p[k];
          if (v === undefined || v === null || v === "") continue;   // vazio não ocupa lugar
          fora[k] = v;
        }
        return fora;
      } catch (e) { return null; }
    })(),
    /* PRESENÇA. O "onde" já dizia em que tela a pessoa está; isto diz se
       ela quer ser incomodada. Vai também por qual aparelho, porque
       saber que alguém está no celular muda o que você espera: quem está
       no telefone responde devagar, e isso evita cobrança à toa. */
    presenca: (function () { try { return presencaAgora(); } catch (e) { return "online"; } })(),
    aparelho: (function () {
      try { return matchMedia("(max-width: 780px)").matches ? "celular" : "computador"; }
      catch (e) { return "computador"; }
    })(),
    recado: (function () { try { return recadoMeu(); } catch (e) { return null; } })(),
    /* a tag do servidor adotado viaja junto: é ela que aparece do lado do
       nome para todo mundo, e o "sid" é o que faz clicar nela abrir o
       servidor certo */
    tagServidor: save.tagServidor || "",
    tagNome: (function () {
      try { const t = srvMinhaTagInfo(); return t ? t.tag : ""; } catch (e) { return ""; }
    })(),
    /* O INVISÍVEL MENTE O RELÓGIO, e é de propósito.
       Mandar "estou invisível" e torcer para o outro lado respeitar não
       é esconder: qualquer um lendo o banco direto veria a pessoa ali.
       Mandando um relógio velho, ela fica fora do ar para TODO MUNDO --
       para o jogo, para o ranking e para quem for curioso. Segredo que
       depende da boa educação alheia não é segredo. */
    atualizado: (function () {
      try { return presencaAgora() === "invisivel" ? agora - 600000 : agora; }
      catch (e) { return agora; }
    })()
  };
  await nuvemReq("pilotos/" + nuvemId(save.__name), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(resumo)
  });
  nuvemLimparAntigo(save.__name);
  contaEnviar(forcar);
}

/* ---------------------------------------------------------------------
   Telemetria leve: em que tela a pessoa está, desde quando e com que
   versão. É o que alimenta a janela AO VIVO do painel do administrador.
   --------------------------------------------------------------------- */
const sessaoComecou = Date.now();
function ondeEstou() {
  const m = S && S.mode;
  if (m === "playing") {
    if (MP && MP.modo === "arena") return "Arena · onda " + (S.waveIdx || 1);
    if (MP && MP.modo === "pvp") return "Ranqueada";
    if (MP && MP.sala) return "Cooperativo · fase " + (S.fase || 1);
    return "Jogando a fase " + (S.fase || 1);
  }
  const nomes = {
    menu: "No menu", shop: "Nas melhorias", hangar: "No hangar",
    oficina: "Na oficina 3D", reliquias: "Nas relíquias", tree: "Na árvore",
    levels: "Escolhendo a fase", rank: "Vendo o ranking", multi: "Procurando gente",
    sala: "Numa sala", novidades: "Lendo as novidades", paused: "Em pausa",
    victory: "Terminou a fase", gameover: "Perdeu a fase", cutscene: "Na apresentação",
    login: "Na tela de entrada", senha: "Digitando a senha", adm: "No painel"
  };
  return nomes[m] || "No jogo";
}

/* bate o ponto de vez em quando, para o painel saber quem está ativo */
let batimentoTimer = null;
function ligarBatimento() {
  if (batimentoTimer) clearInterval(batimentoTimer);
  batimentoTimer = setInterval(() => {
    if (!nuvemAtiva() || !save.__name) return;
    nuvemJuntar("pilotos/" + nuvemId(save.__name), {
      tag: save.tag || "",
      onde: ondeEstou(), atualizado: Date.now(), versao: VERSAO
    });
  }, 20000);
}

/* menor tempo entre todas as fases concluídas, para a tabela de velocidade */
function melhorTempoDoJogador() {
  const t = save.tempos || {};
  let melhor = null, fase = 0;
  for (const f in t) {
    if (melhor === null || t[f] < melhor) { melhor = t[f]; fase = parseInt(f, 10); }
  }
  return melhor === null ? null : { s: melhor, fase };
}

/* ---------- Contas na nuvem ----------
   Guarda o progresso completo ligado ao nome e à senha desenho, para dar
   para entrar na mesma conta em outro celular.                            */
function contaId(nome) { return nuvemHash(String(nome).trim().toLowerCase()); }

let ultimoEnvioConta = 0;
async function contaEnviar(forcar) {
  if (!nuvemAtiva() || !save.__name) return;
  // toda conta precisa de senha para subir, menos as liberadas
  if (!save.senha && !contaSemSenha(save.__name)) return;
  const agora = Date.now();
  if (!forcar && agora - ultimoEnvioConta < 25000) return;
  ultimoEnvioConta = agora;
  const copia = JSON.parse(JSON.stringify(save));
  delete copia.__name;
  await nuvemReq("contas/" + contaId(save.__name), {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome: save.__name, senha: save.senha || "",
                           semSenha: !save.senha, save: copia, atualizado: agora })
  });
}
async function contaBuscar(nome) {
  if (!nuvemAtiva()) return null;
  return nuvemReq("contas/" + contaId(nome));
}

/* ---------------------------------------------------------------------
   Contas que não entram no ranking nem nas tabelas.
   São as contas do administrador: elas têm tudo liberado, então
   apareceriam sempre em primeiro e estragariam a disputa. Continuam
   aparecendo normalmente no painel e na lista de jogadores online.
   O administrador pode esconder ou trazer de volta qualquer piloto pelo
   painel — o que fica guardado no campo "oculto" do registro.
   --------------------------------------------------------------------- */
const OCULTOS_FIXOS = ["cr1cket", "administrador", "adm", "admin"];
function ficaDeForaDoRanking(p) {
  if (!p || !p.nome) return true;
  if (p.oculto) return true;
  return OCULTOS_FIXOS.indexOf(String(p.nome).trim().toLowerCase()) >= 0;
}

async function nuvemListar() {
  const dados = await nuvemReq("pilotos");
  if (!dados) return [];
  return Object.keys(dados).map(id => Object.assign({ id }, dados[id]))
    .filter(p => p && p.nome)
    .sort((a, b) => (b.fase - a.fase) || (b.recorde - a.recorde));
}

async function nuvemEnviarPresente(id, presente) {
  // junta com um presente que ainda não foi retirado, para não sobrescrever
  const pendente = (await nuvemReq("presentes/" + id)) || {};
  const novo = Object.assign({}, pendente);
  // cristais: somam, a menos que venha um valor absoluto
  if (presente.cristais) {
    novo.cristais = (novo.cristais || 0) + presente.cristais;
    delete novo.setCristais;
  }
  if (typeof presente.setCristais === "number") {
    novo.setCristais = presente.setCristais;
    delete novo.cristais;
  }
  if (typeof presente.setFase === "number") {
    novo.setFase = presente.setFase;
    delete novo.fases;
    delete novo.zerarFases;
  }
  // pares que se anulam: o último enviado vence
  const opostos = [["naves", "tirarNaves"], ["fases", "zerarFases"],
                   ["habilidades", "zerarHabilidades"], ["lendarios", "zerarAmuletos"]];
  for (const [dar, tirar] of opostos) {
    if (presente[dar]) { novo[dar] = true; delete novo[tirar]; }
    if (presente[tirar]) { novo[tirar] = true; delete novo[dar]; }
  }
  if (presente.tudo) { novo.tudo = true; delete novo.zerarTudo; }
  if (presente.melhorias) novo.melhorias = true;
  for (const k of ["remNaves", "remAmuletos", "remHab", "remPecas"]) {
    if (presente[k] !== undefined) {
      const juntas = (novo[k] || []).concat(presente[k] || []);
      novo[k] = juntas.filter((v, i) => juntas.indexOf(v) === i);
    }
  }
  if (presente.msg) novo.msg = String(presente.msg).slice(0, 200);
  if (presente.remUp !== undefined) novo.remUp = Object.assign(novo.remUp || {}, presente.remUp);
  if (presente.tirarCristais) novo.tirarCristais = (novo.tirarCristais || 0) + presente.tirarCristais;
  if (presente.exclusiva !== undefined) {
    const juntas = listaExclusivas(novo.exclusiva).concat(listaExclusivas(presente.exclusiva));
    novo.exclusiva = juntas.filter((v, i) => juntas.indexOf(v) === i);
  }
  if (typeof presente.setRank === "number") novo.setRank = presente.setRank;
  if (typeof presente.god === "boolean") novo.god = presente.god;
  if (presente.zerarTudo) {
    // zerar apaga qualquer coisa pendente
    for (const k in novo) delete novo[k];
    novo.zerarTudo = true;
  }
  novo.quando = Date.now();
  return nuvemReq("presentes/" + id, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(novo)
  });
}

/* aplica um comando enviado pelo administrador; devolve
   { texto, tirou } para o jogador saber o que aconteceu */
async function nuvemApagarDoRanking(id) {
  return nuvemReq("pilotos/" + id, { method: "DELETE" });
}
async function nuvemCancelarComando(id) {
  return nuvemReq("presentes/" + id, { method: "DELETE" });
}
async function nuvemComandoPendente(id) {
  return nuvemReq("presentes/" + id);
}

/* ---------------------------------------------------------------------
   PRESENTE É PRESENTE; RETIRADA É RETIRADA
   ---------------------------------------------------------------------
   Os dois vinham pelo mesmo cano e saíam na mesma caixinha de presente:
   a pessoa via a caixa brilhar, o som de baú, e abria para descobrir
   que tinha PERDIDO as naves. É de rir, mas do lado de lá não tem graça
   nenhuma -- e foi por isso que o dono pediu para tirar na hora.

   Agora saem separados: o que dá vai na caixa; o que tira vira um
   recado seco, sem festa, sem som de prêmio. Quem administra decide o
   que acontece, mas quem joga merece saber o que foi, sem deboche.    */
function aplicarPresente(p, g) {
  const partes = [];
  const itens = [];              // o que GANHOU -> a caixa de presente
  const tirados = [];            // o que PERDEU -> um recado seco
  let tirou = false;
  const anota = (icone, texto, ruim) =>
    (ruim ? tirados : itens).push({ icone, texto, ruim: !!ruim });

  /* compra entregue pela loja: VIP com dias, passes e naves */
  if (g.compra) {
    const c = g.compra;
    if (c.vipDias) {
      const base = Math.max(Date.now(), p.vipAte || 0);
      p.vipAte = base + c.vipDias * 86400000;
      p.vipDia = "";
      partes.push("VIP por " + c.vipDias + " dias");
      anota("👑", "VIP por " + c.vipDias + " dias");
    }
    if (c.passes && c.passes.length) {
      p.passes = p.passes || {};
      for (const id of c.passes) {
        p.passes[id] = true;
        const pa = (typeof PASSES !== "undefined") ? PASSES.find(x => x.id === id) : null;
        anota(pa ? pa.icone : "🎟", pa ? pa.nome : "Passe");
      }
      partes.push(c.passes.length + " passe" + (c.passes.length === 1 ? "" : "s"));
    }
    if (c.naves && c.naves.length) {
      p.ships = p.ships || [0];
      for (const i of c.naves) {
        if (p.ships.indexOf(i) < 0) p.ships.push(i);
        anota("✈", (SHIPS[i] || {}).name || "Nave");
      }
      p.ship = c.naves[c.naves.length - 1];
      partes.push(c.naves.length + " nave" + (c.naves.length === 1 ? "" : "s"));
    }
    /* ENTREGA AUTOMÁTICA DO NEONEBULA.
       Assim que o pagamento é confirmado, o nível cai na conta pelo mesmo
       cano de todo o resto — sem ninguém mexer à mão, e sem um segundo
       jeito de entregar que um dia ficaria diferente deste. */
    if (c.neo) {
      try {
        neoDar(p, c.neo.nivel, c.neo.dias);
        const info = neoInfo(c.neo.nivel);
        partes.push(info ? info.nome : "NeoNebula");
        anota(info ? info.selo : "✦", (info ? info.nome : "NeoNebula") +
              (c.neo.dias ? " por " + c.neo.dias + " dias" : ""));
      } catch (e) {}
    }
  }

  // 1) o que zera vem primeiro
  if (g.zerarTudo) {
    const nome = p.__name;
    Object.assign(p, defaultSave());
    if (nome) p.__name = nome;
    partes.push("progresso zerado");
    anota("⚠", "Seu progresso foi zerado", true);
    tirou = true;
  }

  // 2) o que dá tudo
  if (g.tudo) { admDesbloquearTudo(p); partes.push("tudo desbloqueado"); anota("★", "TUDO desbloqueado"); }

  /* ordem de atualizar mandada só para esta pessoa */
  if (g.atualizar) {
    partes.push("atualização");
    anota("⬇", "O jogo vai se atualizar agora");
    setTimeout(() => {
      try {
        versaoNova = { versao: g.atualizar === true ? VERSAO : String(g.atualizar),
                       nota: "O administrador mandou atualizar o seu jogo." };
        mostrarPortaoAtualizacao();
        if (S.mode !== "playing") setTimeout(() => limparTudoERecarregar(), 1500);
      } catch (e) {}
    }, 2500);
  }

  // 3) valores
  if (typeof g.setCristais === "number") {
    p.crystals = Math.max(0, g.setCristais);
    partes.push("cristais definidos em " + fmt(p.crystals));
    anota("◆", "Cristais definidos em " + fmt(p.crystals), g.setCristais === 0);
    if (g.setCristais === 0) tirou = true;
  }
  if (g.cristais) {
    p.crystals = Math.max(0, (p.crystals || 0) + g.cristais);
    partes.push((g.cristais > 0 ? "+" : "") + fmt(g.cristais) + " cristais");
    anota("◆", (g.cristais > 0 ? "+" : "") + fmt(g.cristais) + " cristais", g.cristais < 0);
    if (g.cristais < 0) tirou = true;
  }
  if (typeof g.setFase === "number") {
    p.best = clamp(g.setFase, 0, TOTAL_FASES);
    p.pts = Math.max(p.pts || 0, p.best);
    partes.push("fase definida em " + p.best);
    anota("▶", "Fase definida em " + p.best);
  }

  // 4) o que dá
  if (g.naves) {
    p.ships = [];
    for (let i = 0; i < MAVERICK; i++) p.ships.push(i);
    partes.push("todas as naves");
    anota("✈", "Todas as naves liberadas");
  }
  if (g.fases) {
    p.best = TOTAL_FASES;
    p.pts = Math.max(p.pts || 0, TOTAL_FASES);
    partes.push("todas as fases");
    anota("▶", "Todas as fases liberadas");
  }
  if (g.habilidades) {
    p.skills = {};
    for (const b of ["atk", "def", "res"]) for (let t = 1; t <= 40; t++) p.skills[b + t] = true;
    p.pts = Math.max(p.pts || 0, 120);
    partes.push("todas as habilidades");
    anota("✦", "Todas as habilidades");
  }
  if (g.lendarios) {
    for (const sp of AMULET_SPECIALS) admDarAmuleto(p, sp.id, 3);
    partes.push("amuletos lendários");
    anota("◈", "3 amuletos lendários");
  }
  if (typeof g.setRank === "number") {
    p.rank = Math.max(0, g.setRank);
    partes.push("rank " + nomeDoRank(p.rank));
    anota(simboloDoRank(p.rank), "Rank " + nomeDoRank(p.rank));
  }
  for (const ex of listaExclusivas(g.exclusiva)) {
    if (p.ships.indexOf(ex) < 0) p.ships.push(ex);
    p.ship = ex;
    partes.push("aeronave " + SHIPS[ex].name);
    anota("★", "Aeronave exclusiva " + SHIPS[ex].name);
  }
  /* ------------------------------------------------------------------
     O QUE O CATÁLOGO DÁ, ITEM A ITEM
     Antes só existia o atacado ("todas as naves", "3 lendários"). Estes
     são os presentes escolhidos a dedo: uma nave, um amuleto, uma
     moldura. É o que dá para dar de prêmio sem estragar o progresso da
     pessoa entregando o jogo inteiro de uma vez.
     ------------------------------------------------------------------ */
  if (g.darNaves && g.darNaves.length) {
    p.ships = p.ships || [0];
    const nomes = [];
    for (const i of g.darNaves) {
      const n = +i;
      if (!SHIPS[n]) continue;
      if (p.ships.indexOf(n) < 0) p.ships.push(n);
      nomes.push((SHIPS[n] || {}).name || ("Nave " + n));
    }
    if (nomes.length) {
      partes.push(nomes.join(", "));
      anota("✈", nomes.length === 1 ? nomes[0] : nomes.length + " naves");
    }
  }
  if (g.darAmuletos && g.darAmuletos.length) {
    for (const a of g.darAmuletos) {
      const tipo = a && a.tipo ? a.tipo : a;
      const rar = a && typeof a.rar === "number" ? a.rar : 3;
      admDarAmuleto(p, tipo, rar);
      const esp = AMULET_SPECIALS.filter(x => x.id === tipo)[0];
      const com = AMULET_TYPES.filter(x => x.id === tipo)[0];
      const alvo = esp || com;
      anota(alvo ? (alvo.icon) : "◈", alvo ? (esp ? alvo.name : alvo.name +
            " (" + ["comum", "raro", "épico", "lendário"][rar] + ")") : "Amuleto");
    }
    partes.push(g.darAmuletos.length + " amuleto(s)");
  }
  if (g.darHab && g.darHab.ramo) {
    p.skills = p.skills || {};
    const ate = Math.max(1, Math.min(40, g.darHab.ate | 0));
    for (let t = 1; t <= ate; t++) p.skills[g.darHab.ramo + t] = true;
    p.pts = Math.max(p.pts || 0, ate);
    partes.push("habilidades até " + ate);
    anota("✦", "Habilidades abertas até o nível " + ate);
  }
  if (g.darUp) {
    p.upgrades = p.upgrades || {};
    for (const k in g.darUp) {
      const u = UPGRADES.filter(x => x.id === k)[0];
      if (!u) continue;
      p.upgrades[k] = Math.max(0, Math.min(u.max, g.darUp[k] | 0));
    }
    partes.push("melhorias");
    anota("⬡", "Melhorias melhoradas");
  }
  if (g.darPecas && g.darPecas.parte) {
    p.parts = p.parts || {};
    const nivel = Math.max(0, Math.min(PART_MAX, g.darPecas.nivel | 0));
    for (const i of (p.ships || [0])) {
      p.parts[i] = p.parts[i] || {};
      p.parts[i][g.darPecas.parte] = nivel;
    }
    const pc = PARTS.filter(x => x.id === g.darPecas.parte)[0];
    partes.push("peça " + (pc ? pc.name : g.darPecas.parte));
    anota(pc ? pc.icon : "⚙", (pc ? pc.name : "Peça") + " no nível " + nivel + " em todas as naves");
  }
  if (g.darMolduras && g.darMolduras.length) {
    /* a moldura normalmente se ganha cumprindo uma condição. Dada pelo
       painel, ela entra numa lista de liberadas -- senão o jogo olharia
       a condição, veria que não bate e a devolveria travada. */
    p.moldurasDadas = p.moldurasDadas || [];
    const nomes = [];
    for (const id of g.darMolduras) {
      const m = MOLDURAS.filter(x => x.id === id)[0];
      if (!m || m.id === "nenhuma") continue;
      if (p.moldurasDadas.indexOf(id) < 0) p.moldurasDadas.push(id);
      nomes.push(m.nome);
    }
    if (nomes.length) {
      partes.push("moldura " + nomes.join(", "));
      anota("🖼", "Moldura " + nomes.join(", "));
    }
  }
  if (g.darEmotes && g.darEmotes.length) {
    p.emotes = p.emotes || [];
    for (const id of g.darEmotes) if (p.emotes.indexOf(id) < 0) p.emotes.push(id);
    partes.push(g.darEmotes.length + " emote(s)");
    anota("💬", g.darEmotes.length + " emote(s)");
  }

  // remoções escolhidas uma a uma pelo administrador
  if (g.remNaves && g.remNaves.length) {
    const fora = {};
    for (const i of g.remNaves) fora[+i] = 1;
    p.ships = (p.ships || [0]).filter(i => !fora[i]);
    if (!p.ships.length) p.ships = [0];
    if (fora[p.ship]) p.ship = p.ships[0];
    partes.push("naves retiradas");
    anota("⚠", g.remNaves.length + " nave(s) retirada(s)", true);
    tirou = true;
  }
  if (g.remAmuletos && g.remAmuletos.length) {
    const fora = {};
    for (const u of g.remAmuletos) fora[+u] = 1;
    p.amulets = (p.amulets || []).filter(a => !fora[a.uid]);
    p.equipped = (p.equipped || []).filter(u => !fora[u]);
    partes.push("amuletos retirados");
    anota("⚠", g.remAmuletos.length + " amuleto(s) retirado(s)", true);
    tirou = true;
  }
  if (g.remHab && g.remHab.length) {
    for (const id of g.remHab) delete p.skills[id];
    partes.push("habilidades retiradas");
    anota("⚠", g.remHab.length + " habilidade(s) retirada(s)", true);
    tirou = true;
  }
  if (g.remUp) {
    for (const k in g.remUp) {
      if (p.upgrades[k] !== undefined) p.upgrades[k] = Math.max(0, g.remUp[k] | 0);
    }
    partes.push("melhorias ajustadas");
    anota("⚠", "Melhorias ajustadas pelo administrador", true);
    tirou = true;
  }
  if (g.tirarCristais) {
    p.crystals = Math.max(0, (p.crystals || 0) - g.tirarCristais);
    partes.push(fmt(g.tirarCristais) + " cristais retirados");
    anota("⚠", "− " + fmt(g.tirarCristais) + " cristais", true);
    tirou = true;
  }
  if (g.limparNaves) {
    const volta = limparNavesCriadas(p);
    partes.push("naves montadas desfeitas");
    anota("🛠", "Suas naves montadas foram desfeitas (voltaram ◆ " + fmt(volta) + ")", true);
    tirou = true;
  }
  if (g.remPecas && g.remPecas.length) {
    for (const i of g.remPecas) delete p.parts[i];
    partes.push("peças retiradas");
    anota("⚠", "Peças retiradas de " + g.remPecas.length + " nave(s)", true);
    tirou = true;
  }

  if (g.melhorias) {
    for (const u of UPGRADES) p.upgrades[u.id] = u.max;
    for (const i of p.ships) {
      p.parts[i] = p.parts[i] || {};
      for (const part of PARTS) p.parts[i][part.id] = PART_MAX;
    }
    partes.push("melhorias e peças no máximo");
    anota("⬡", "Melhorias e peças no máximo");
  }

  // 5) o que tira
  if (g.tirarNaves) {
    p.ships = [0];
    p.ship = 0;
    partes.push("naves removidas");
    anota("⚠", "Suas naves foram removidas", true);
    tirou = true;
  }
  if (g.zerarFases) { p.best = 0; partes.push("fases zeradas"); anota("⚠", "Fases zeradas", true); tirou = true; }
  if (g.zerarHabilidades) { p.skills = {}; partes.push("habilidades zeradas"); anota("⚠", "Habilidades zeradas", true); tirou = true; }
  if (g.zerarAmuletos) {
    p.amulets = [];
    p.equipped = [];
    partes.push("amuletos removidos");
    anota("⚠", "Amuletos removidos", true);
    tirou = true;
  }
  if (typeof g.god === "boolean") {
    p.god = undefined;
    p.godMode = g.god;
    partes.push(g.god ? "modo invencível ligado" : "modo invencível desligado");
    anota("⚡", g.god ? "Modo invencível ligado" : "Modo invencível desligado", !g.god);
  }

  if (p.ships.indexOf(p.ship) < 0) p.ship = p.ships[0];
  return { texto: partes.join(", "), tirou, itens, tirados };
}

/* o presente pode trazer uma aeronave exclusiva ou várias */
function listaExclusivas(v) {
  const bruto = Array.isArray(v) ? v : (typeof v === "number" ? [v] : []);
  const saida = [];
  for (const i of bruto) {
    const n = parseInt(i, 10);
    if (SHIPS[n] && saida.indexOf(n) < 0) saida.push(n);
  }
  return saida;
}

/* verifica se chegou presente do administrador */
async function nuvemVerificarPresentes() {
  if (!nuvemAtiva() || !save.__name) return;
  const id = nuvemId(save.__name);
  const g = await nuvemReq("presentes/" + id);
  if (!g) return;
  const r = aplicarPresente(save, g);
  await nuvemReq("presentes/" + id, { method: "DELETE" });
  persist();
  calcStats();
  if (S.mode === "menu") refreshMenu();

  // guarda para abrir a caixa quando estiver no menu (nunca sobre o login)
  if (g.msg) recadoDoPresente = String(g.msg).slice(0, 200);
  if (r.itens && r.itens.length) {
    presenteGuardado = (presenteGuardado || []).concat(r.itens);
    if (S.mode === "menu") mostrarCaixaPresente();
  }
  /* o que foi TIRADO não entra na caixa: vira um aviso seco, sem som de
     prêmio e sem embrulho. Ninguém deve abrir um presente para
     descobrir que perdeu alguma coisa. */
  if (r.tirados && r.tirados.length) avisarRetirada(r.tirados);
  // se chegou no meio de uma partida, apenas uma faixa discreta:
  // a caixa fica guardada e abre quando a pessoa voltar ao menu
  if (S.mode === "playing" && r.itens && r.itens.length) {
    AudioSys.power();
    vibrate([40, 60, 40]);
    const faixa = $("presente-jogo");
    if (faixa) {
      faixa.textContent = (r.tirou ? "\u26A0 O administrador alterou seu progresso" :
                                     "\uD83C\uDF81 O administrador enviou uma caixa \u2014 abra no menu");
      faixa.classList.add("on");
      setTimeout(() => faixa.classList.remove("on"), 7000);
    }
    addText(player.x, player.y - 44, r.tirou ? "ADMIN" : "PRESENTE!", r.tirou ? "#FF5252" : "#FFC145");
  }
  nuvemEnviar(true);
}

/* =====================================================================
   MUNDO — o que o administrador liga para todo mundo ao mesmo tempo
   ---------------------------------------------------------------------
   Um só nó na nuvem (mundo/) guarda o que está valendo agora: o aviso na
   tela, os multiplicadores, as travessuras e o evento com música e
   decoração. Todo jogo escuta esse nó pelo fluxo, então quando você
   aperta o botão aqui, acende na hora no aparelho de todo mundo.
   Cada coisa tem hora para acabar (campo "ate"), então nada fica ligado
   para sempre por esquecimento.
   ===================================================================== */
const MUNDO = { aviso: null, efeitos: {}, evento: null, geral: null, fechar: null, relogio: null };

/* ---- catálogo: o que dá para ligar ---- */
const BOOSTS = [
  { id: "pontos",   nome: "PONTOS",      icone: "★", cor: "#4DE8FF",
    desc: "Multiplica os pontos de todo mundo", unidade: "h", padraoTempo: 2, padraoMult: 2 },
  { id: "cristais", nome: "CRISTAIS",    icone: "◆", cor: "#FFC145",
    desc: "Multiplica os cristais ganhos", unidade: "h", padraoTempo: 2, padraoMult: 3 },
  { id: "dano",     nome: "DANO",        icone: "▲", cor: "#FF4D8F",
    desc: "Multiplica o dano das naves", unidade: "h", padraoTempo: 1, padraoMult: 2 },
  { id: "vida",     nome: "VIDA",        icone: "♥", cor: "#7CF7C0",
    desc: "Multiplica a vida máxima", unidade: "h", padraoTempo: 1, padraoMult: 2 },
  { id: "cadencia", nome: "CADÊNCIA",    icone: "≣", cor: "#C34DFF",
    desc: "Multiplica a velocidade de tiro", unidade: "h", padraoTempo: 1, padraoMult: 2 },
  { id: "drop",     nome: "SORTE",       icone: "✦", cor: "#FFD97A",
    desc: "Multiplica a chance de itens caírem", unidade: "h", padraoTempo: 2, padraoMult: 3 }
];

const TROLLS = [
  { id: "invertido", nome: "CONTROLE INVERTIDO", icone: "⇄", cor: "#FF5252",
    desc: "A nave anda ao contrário do dedo" },
  { id: "gravidade", nome: "GRAVIDADE",          icone: "⇩", cor: "#FF9E4D",
    desc: "A nave é puxada para baixo sem parar" },
  { id: "gelo",      nome: "CHÃO DE GELO",       icone: "❄", cor: "#4DE8FF",
    desc: "A nave escorrega e demora a parar" },
  { id: "bebado",    nome: "TONTURA",            icone: "@", cor: "#C34DFF",
    desc: "A tela balança e gira devagar" },
  { id: "escuro",    nome: "APAGÃO",             icone: "◐", cor: "#8899AA",
    desc: "Só dá para ver um círculo em volta da nave" },
  { id: "espelho",   nome: "ESPELHO",            icone: "◫", cor: "#FF4D8F",
    desc: "A tela inteira fica espelhada" },
  { id: "gigante",   nome: "INIMIGOS GIGANTES",  icone: "⬤", cor: "#FF5252",
    desc: "Os inimigos ficam enormes" },
  { id: "mini",      nome: "INIMIGOS MINÚSCULOS", icone: "·", cor: "#7CF7C0",
    desc: "Os inimigos ficam pequenininhos e difíceis de acertar" },
  { id: "turbo",     nome: "TUDO ACELERADO",     icone: "»", cor: "#FFC145",
    desc: "O jogo inteiro roda mais rápido" },
  { id: "lesma",     nome: "CÂMERA LENTA",       icone: "«", cor: "#8899AA",
    desc: "O jogo inteiro roda devagar" },
  { id: "discoteca", nome: "DISCOTECA",          icone: "◉", cor: "#C34DFF",
    desc: "As cores da tela piscam sem parar" },
  { id: "chuvisco",  nome: "CHUVA DE INIMIGOS",  icone: "☂", cor: "#FF5252",
    desc: "Nasce muito mais inimigo do que o normal" },
  { id: "tremor",    nome: "TERREMOTO",          icone: "≈", cor: "#FF9E4D",
    desc: "A tela treme o tempo todo" },
  { id: "fantasma",  nome: "NAVE FANTASMA",      icone: "◍", cor: "#8899AA",
    desc: "A própria nave fica quase invisível para o dono" }
];

const EVENTOS = [
  { id: "natal",      nome: "NATAL",           icone: "🎄", cor: "#FF5252",
    desc: "Neve caindo, cores de Natal e música de sino",
    fundo: ["#0A1A2E", "#12304A"], nota: [0, 4, 7, 12], bpm: 92, timbre: "sine",
    particula: "neve", brilho: "rgba(255,255,255,.75)" },
  { id: "halloween",  nome: "HALLOWEEN",       icone: "🎃", cor: "#FF9E4D",
    desc: "Céu roxo, morcegos e música arrepiante",
    fundo: ["#1A0A22", "#2E1038"], nota: [0, 1, 6, 8], bpm: 76, timbre: "sawtooth",
    particula: "morcego", brilho: "rgba(255,158,77,.6)" },
  { id: "festa",      nome: "FESTA",           icone: "🎉", cor: "#FF4D8F",
    desc: "Luzes de discoteca, confete e música dançante",
    fundo: ["#22062E", "#3A0A4A"], nota: [0, 3, 5, 7, 10], bpm: 138, timbre: "square",
    particula: "confete", brilho: "rgba(255,77,143,.7)" },
  { id: "ouro",       nome: "CHUVA DE OURO",   icone: "💰", cor: "#FFC145",
    desc: "Tudo dourado, cristais caindo do céu e fanfarra",
    fundo: ["#2A1E04", "#40300A"], nota: [0, 4, 7, 9], bpm: 118, timbre: "triangle",
    particula: "ouro", brilho: "rgba(255,193,69,.8)" },
  { id: "apocalipse", nome: "APOCALIPSE",      icone: "☄", cor: "#FF5252",
    desc: "Céu vermelho, meteoros e música de guerra",
    fundo: ["#2A0808", "#4A1010"], nota: [0, 1, 5, 6], bpm: 148, timbre: "sawtooth",
    particula: "meteoro", brilho: "rgba(255,82,82,.7)" },
  { id: "aurora",     nome: "AURORA",          icone: "🌌", cor: "#7CF7C0",
    desc: "Aurora boreal no céu e música calma",
    fundo: ["#04182A", "#0A2E3A"], nota: [0, 2, 4, 7, 9], bpm: 68, timbre: "sine",
    particula: "aurora", brilho: "rgba(124,247,192,.55)" },
  { id: "neon",       nome: "RAVE NEON",       icone: "⚡", cor: "#C34DFF",
    desc: "Neon piscando e batida pesada",
    fundo: ["#12042A", "#26064A"], nota: [0, 3, 7, 10], bpm: 160, timbre: "square",
    particula: "neon", brilho: "rgba(195,77,255,.75)" },
  { id: "oceano",     nome: "FUNDO DO MAR",    icone: "🌊", cor: "#4DE8FF",
    desc: "Bolhas subindo, tudo azul e música tranquila",
    fundo: ["#04162A", "#062A44"], nota: [0, 2, 5, 7], bpm: 74, timbre: "sine",
    particula: "bolha", brilho: "rgba(77,232,255,.55)" },
  { id: "vulcao",     nome: "VULCÃO",          icone: "🌋", cor: "#FF7B4D",
    desc: "Brasas subindo e música pesada",
    fundo: ["#2A0E04", "#44180A"], nota: [0, 3, 6, 8], bpm: 128, timbre: "sawtooth",
    particula: "brasa", brilho: "rgba(255,123,77,.7)" },
  { id: "matrix",     nome: "CÓDIGO",          icone: "▤", cor: "#7CF7C0",
    desc: "Chuva de código verde e música eletrônica",
    fundo: ["#02160C", "#042A14"], nota: [0, 2, 3, 7], bpm: 132, timbre: "square",
    particula: "codigo", brilho: "rgba(124,247,192,.7)" },
  { id: "arcoiris",   nome: "ARCO-ÍRIS",       icone: "🌈", cor: "#FF4D8F",
    desc: "O céu troca de cor devagar, tudo colorido",
    fundo: ["#1A0A2A", "#2A0A3A"], nota: [0, 4, 7, 11], bpm: 104, timbre: "triangle",
    particula: "arco", brilho: "rgba(255,255,255,.5)" },
  { id: "guerra",     nome: "ZONA DE GUERRA",  icone: "💥", cor: "#FF9E4D",
    desc: "Sirene, fumaça e clarões ao longe",
    fundo: ["#1A1206", "#2E2008"], nota: [0, 1, 3, 6], bpm: 112, timbre: "sawtooth",
    particula: "fumaca", brilho: "rgba(255,158,77,.5)" }
];

function mundoAtivo(tipo) {
  const e = MUNDO.efeitos[tipo];
  return e && e.ate > Date.now() ? e : null;
}
function mundoMult(tipo) {
  const e = mundoAtivo(tipo);
  return e ? (e.mult || 1) : 1;
}
function eventoAtual() {
  if (!MUNDO.evento || MUNDO.evento.ate <= Date.now()) return null;
  return EVENTOS.find(e => e.id === MUNDO.evento.id) || null;
}
function mundoLimpar() {
  const agora = Date.now();
  for (const k in MUNDO.efeitos) if (!MUNDO.efeitos[k] || MUNDO.efeitos[k].ate <= agora) delete MUNDO.efeitos[k];
  if (MUNDO.aviso && MUNDO.aviso.ate <= agora) MUNDO.aviso = null;
  if (MUNDO.evento && MUNDO.evento.ate <= agora) MUNDO.evento = null;
}

/* ---------------------------------------------------------------------
   Presente para TODO MUNDO
   ---------------------------------------------------------------------
   Em vez de escrever na caixa de cada jogador (o que só alcançaria quem
   já apareceu na lista), o pacote fica num lugar só, em mundo/geral.
   Cada jogo pega uma única vez, guardando a data do que já recebeu — e
   quem criar a conta depois também pega, enquanto o presente estiver no
   prazo. Uma escrita só, e ninguém fica de fora.
   --------------------------------------------------------------------- */
async function checarPresenteGeral(d) {
  const g = d && d.geral;
  if (!g || !g.quando) return;
  if (g.ate && g.ate < Date.now()) return;             // fora do prazo
  if ((save.presenteGeralVisto || 0) >= g.quando) return;   // já peguei este
  save.presenteGeralVisto = g.quando;
  const r = aplicarPresente(save, g);
  persist();
  calcStats();
  if (S.mode === "menu") refreshMenu();
  if (g.msg) recadoDoPresente = String(g.msg).slice(0, 200);
  if (r.itens && r.itens.length) {
    presenteGuardado = (presenteGuardado || []).concat(r.itens);
    if (S.mode === "menu") setTimeout(mostrarCaixaPresente, 400);
  }
  if (r.tirados && r.tirados.length) avisarRetirada(r.tirados);
  nuvemEnviar(true);
}

/* =====================================================================
   ATUALIZAÇÃO MANDADA PELO PAINEL
   ---------------------------------------------------------------------
   Tem gente que fica presa numa versão velha: o celular guardou a página
   e a pessoa nunca fecha o jogo. O administrador agora aperta um botão e
   TODO MUNDO que estiver numa versão anterior limpa o cache e recarrega
   sozinho. Quem já está na versão nova nem percebe.
   ===================================================================== */
/* ---------------------------------------------------------------------
   VENDER DINHEIRO DE VERDADE DENTRO DO APP DAS LOJAS
   ---------------------------------------------------------------------
   A Apple e o Google não deixam vender coisa do jogo (VIP, passe, nave)
   por fora do sistema de pagamento deles. O nosso Pix é exatamente isso:
   no navegador tudo bem, mas dentro do app baixado da loja é motivo de
   recusa na revisão — e de remoção se passar batido.

   Por isso o empacotador escreve window.NN_EMPACOTADO = true na cópia
   que vira app, e aqui a loja de dinheiro some. O que se ganha jogando
   (cristais, naves, melhorias) continua igual: só a parte de comprar
   com dinheiro fica de fora.
   --------------------------------------------------------------------- */
function lojaDeDinheiroLigada() {
  return !(typeof window !== "undefined" && window.NN_EMPACOTADO === true);
}

function versaoNumero(v) {
  /* Lê os TRÊS pedaços (7.1.2), não só dois. Enquanto lia dois, "7.0.1"
     e "7.0" davam o mesmo número e um conserto pequeno nunca chegava a
     ninguém: o jogo achava que já estava em dia. Por isso também as
     versões que precisam alcançar aparelhos antigos sobem o segundo
     número (7.0 → 7.1), que as cópias velhas sabem comparar. */
  const p2 = String(v || "0").split(".");
  return (parseInt(p2[0], 10) || 0) * 1000000 +
         (parseInt(p2[1], 10) || 0) * 1000 +
         (parseInt(p2[2], 10) || 0);
}
function obedecerOrdemDeAtualizar(att) {
  if (!att || !att.versao) return;
  if (versaoNumero(att.versao) <= versaoNumero(VERSAO)) return;   // já estou igual ou à frente
  const marca = "att" + att.versao + "|" + (att.quando || 0);
  if (storageGet("nn_att_feita", "") === marca) return;           // já obedeci a esta
  storageSet("nn_att_feita", marca);
  versaoNova = { versao: att.versao, nota: att.nota ||
                 "O administrador mandou atualizar. Vai levar alguns segundos." };
  mostrarPortaoAtualizacao();
  // fora de partida, atualiza sozinho logo em seguida
  if (S.mode !== "playing") setTimeout(() => { try { limparTudoERecarregar(); } catch (e) {} }, 1200);
}

function mundoAplicar(d) {
  try { obedecerOrdemDeAtualizar(d && d.att); } catch (e) {}
  try { pagAplicar(d && d.pagamento); } catch (e) {}
  try { manutencaoAplicar(d && d.manutencao); } catch (e) {}
  try { testeAplicar(d && d.teste); } catch (e) {}
  try { checarPresenteGeral(d); } catch (e) {}
  MUNDO.geral = (d && d.geral) || null;
  MUNDO.aviso = (d && d.aviso) || null;
  MUNDO.efeitos = (d && d.efeitos) || {};
  MUNDO.evento = (d && d.evento) || null;
  mundoLimpar();
  try { calcStats(); } catch (e) {}
  mundoMostrarAviso();
  mundoSelo();
  mundoTrocarMusica();
}
function mundoLigar() {
  if (MUNDO.fechar || !nuvemAtiva()) return;
  MUNDO.fechar = nuvemFluxo("mundo", mundoAplicar, () => {
    MUNDO.relogio = setInterval(async () => {
      mundoAplicar(await nuvemReq("mundo"));
    }, 8000);
  });
  // relógio só para apagar o que venceu
  setInterval(() => {
    const antes = Object.keys(MUNDO.efeitos).length + (MUNDO.evento ? 1 : 0);
    mundoLimpar();
    if (Object.keys(MUNDO.efeitos).length + (MUNDO.evento ? 1 : 0) !== antes) {
      try { calcStats(); } catch (e) {}
      mundoMostrarAviso();
      mundoTrocarMusica();
    }
    mundoSelo();
  }, 3000);
}
let avisoUltimo = "";
function mundoMostrarAviso() {
  const el = $("aviso-global");
  if (!el) return;
  const a = MUNDO.aviso;
  if (!a || !a.texto) {
    el.classList.remove("on");
    document.body.classList.remove("tem-aviso");
    avisoUltimo = "";
    return;
  }
  document.body.classList.add("tem-aviso");
  el.className = "on " + (a.tipo || "normal");
  el.innerHTML = '<b>' + (a.de ? escaparTexto(a.de) : "ADMINISTRADOR") + "</b>" +
                 "<span>" + escaparLongo(a.texto) + "</span>";
  /* desce o recado até logo abaixo do painel de cima, para nunca cobrir
     a fase, a vida e os botões — em qualquer tamanho de tela            */
  try {
    const hud = $("hud");
    let topo = 16;
    if (hud && getComputedStyle(hud).display !== "none") {
      let maior = 0;
      hud.querySelectorAll(".hud-col,.hud-btns").forEach(c => {
        const r = c.getBoundingClientRect();
        if (r.height && r.bottom > maior) maior = r.bottom;
      });
      if (maior) topo = maior + 12;
    } else {
      topo = 16 + (parseInt(getComputedStyle(document.documentElement)
        .getPropertyValue("--topo")) || 0);
    }
    el.style.top = Math.round(topo) + "px";
  } catch (e) {}
  if (a.texto + a.quando !== avisoUltimo) {
    avisoUltimo = a.texto + a.quando;
    try { AudioSys.power(); vibrate([30, 50, 30]); } catch (e) {}
  }
}
function tempoRestante(ate) {
  const s2 = Math.max(0, Math.round((ate - Date.now()) / 1000));
  if (s2 >= 3600) return Math.floor(s2 / 3600) + "h" + String(Math.floor((s2 % 3600) / 60)).padStart(2, "0");
  if (s2 >= 60) return Math.floor(s2 / 60) + "min";
  return s2 + "s";
}
function mundoSelo() {
  const el = $("evento-selo");
  if (!el) return;
  const ev = eventoAtual();
  const ativos = Object.keys(MUNDO.efeitos);
  if (!ev && !ativos.length) { el.classList.remove("on"); return; }
  el.classList.add("on");
  let txt = "";
  if (ev) txt += "<b>" + ev.icone + "</b>" + ev.nome + "<i>" + tempoRestante(MUNDO.evento.ate) + "</i>";
  for (const k of ativos.slice(0, 4)) {
    const bo = BOOSTS.find(b => b.id === k);
    const tr = TROLLS.find(t => t.id === k);
    const e = MUNDO.efeitos[k];
    if (bo) txt += (txt ? " · " : "") + '<span style="color:' + bo.cor + '">' + bo.icone +
                   " " + (e.mult || 1) + "x</span>";
    else if (tr) txt += (txt ? " · " : "") + '<span style="color:' + tr.cor + '">' + tr.icone + "</span>";
  }
  el.innerHTML = txt;
}

function mundoTrocarMusica() {
  const ev = eventoAtual();
  const id = ev ? ev.id : "";
  if (Musica.eventoAtual === id) return;
  Musica.eventoAtual = id;
  Musica.parar();
  if (S.mode === "playing") {
    try { Musica.tocar(S.fase, isBossFase(S.fase)); } catch (e) {}
  }
}

/* ---------- Loja de melhorias ---------- */
const UPGRADES = [
  { id: "dmg",    icon: "▲", name: "Canhões",   desc: "+8% de dano por nível",                max: 15, base: 25 },
  { id: "rate",   icon: "≡", name: "Cadência",  desc: "+5% de velocidade de tiro por nível",  max: 10, base: 30 },
  { id: "hull",   icon: "♥", name: "Casco",     desc: "+1 vida máxima por nível",             max: 5,  base: 60 },
  { id: "shield", icon: "◎", name: "Escudo",    desc: "+1,5s de duração do escudo por nível", max: 5,  base: 40 },
  { id: "speed",  icon: "»", name: "Motores",   desc: "+6% de agilidade da nave por nível",   max: 8,  base: 35 },
  { id: "luck",   icon: "◆", name: "Coletor",   desc: "+10% de cristais ganhos por nível",    max: 10, base: 50 },
  /* --- melhorias novas --- */
  { id: "mira",   icon: "⌖", name: "Mira Assistida", desc: "+7% de velocidade dos seus tiros por nível", max: 8,  base: 45 },
  { id: "crit",   icon: "✧", name: "Núcleo Crítico", desc: "+3% de chance de dano em dobro por nível",   max: 10, base: 70 },
  { id: "ima",    icon: "◈", name: "Ímã de Carga",   desc: "+35 de alcance para atrair itens por nível", max: 6,  base: 40 },
  { id: "reparo", icon: "✚", name: "Kit de Reparo",  desc: "recupera 6% do casco a cada onda vencida",   max: 5,  base: 80 },
  { id: "carga",  icon: "⚡", name: "Capacitor",      desc: "+8% de carga da ultimate por nível",         max: 8,  base: 65 },
  { id: "placa",  icon: "▣", name: "Placa Reativa",  desc: "+8% de tempo invencível ao levar dano",      max: 6,  base: 55 },
  { id: "reserva",icon: "❥", name: "Tanque Reserva", desc: "+4% de chance de ganhar vida ao abater",     max: 6,  base: 90 },
  { id: "estilha",icon: "✷", name: "Estilhaço",      desc: "+9 de raio de explosão nos seus tiros",      max: 8,  base: 60 }
];
function upgradeCost(u, lvl) { return Math.round(u.base * Math.pow(1.4, lvl)); }

/* ---------- 50 naves ---------- */
const SHIP_NAMES = [
  "Vaga-Lume","Pardal","Andorinha","Falcão","Gavião","Corvo","Águia","Harpia","Fênix","Quimera",
  "Víbora","Naja","Jararaca","Píton","Basilisco","Mamba","Cascavel","Sucuri","Hidra","Dragão",
  "Brisa","Rajada","Vendaval","Ciclone","Tufão","Furacão","Tormenta","Relâmpago","Trovão","Tempestade",
  "Faísca","Chama","Fornalha","Labareda","Vulcão","Meteoro","Cometa","Estrela-Cadente","Supernova","Quasar",
  "Espectro","Miragem","Eclipse","Penumbra","Aurora","Zênite","Horizonte","Singularidade","Vazio","Infinito"
];
const SHIP_HUES = [190, 330, 45, 275, 140, 15, 210, 356, 90, 315];
const POWERS = [
  { id: "dmg",    name: "Devastadora", mag: i => Math.round(10 + i * 1.2),  desc: m => "+" + m + "% de dano" },
  { id: "rate",   name: "Rajada",      mag: i => Math.round(8 + i),         desc: m => "+" + m + "% de cadência de tiro" },
  { id: "lives",  name: "Blindada",    mag: i => 1 + Math.floor(i / 16),    desc: m => "+" + m + (m > 1 ? " vidas máximas" : " vida máxima") },
  { id: "gold",   name: "Dourada",     mag: i => Math.round(12 + i * 1.5),  desc: m => "+" + m + "% de cristais" },
  { id: "ghost",  name: "Fantasma",    mag: i => Math.round(15 + i * 1.5),  desc: m => "+" + m + "% de duração de escudo e invencibilidade" },
  { id: "vamp",   name: "Vampira",     mag: i => Math.round(4 + i * 0.5),   desc: m => m + "% de chance de +1 vida ao destruir inimigos" },
  { id: "frost",  name: "Congelante",  mag: i => Math.round(20 + i * 0.6),  desc: m => "tiros deixam inimigos " + m + "% mais lentos" },
  { id: "blast",  name: "Explosiva",   mag: i => Math.round(40 + i * 1.2),  desc: m => "tiros explodem, ferindo inimigos próximos (raio " + m + ")" },
  { id: "drone",  name: "Enxame",      mag: i => Math.round((0.8 + i * 0.05) * 100) / 100, desc: m => "drone de combate com " + Math.round(m * 100) + "% do seu dano" },
  { id: "magnet", name: "Magnética",   mag: i => Math.round(130 + i * 3),   desc: m => "atrai cristais e itens de longe (raio " + m + ")" }
];
/* ultimate de cada família de poder (a força escala com a nave) */
const ULTS = {
  dmg:    { name: "Fúria Total",        desc: "5s de dano triplo e cadência dobrada" },
  rate:   { name: "Tempestade de Aço",  desc: "3 rajadas circulares de tiros em todas as direções" },
  lives:  { name: "Bastião",            desc: "Escudo cheio, 6s de invencibilidade e limpa as balas inimigas" },
  gold:   { name: "Chuva Dourada",      desc: "Faz chover 14 cristais na tela" },
  ghost:  { name: "Dobra Fantasma",     desc: "5s invisível: ninguém te vê, ninguém atira" },
  vamp:   { name: "Ceifar Almas",       desc: "Fere todos os inimigos da tela e rouba vida" },
  frost:  { name: "Zero Absoluto",      desc: "Congela todos os inimigos e o chefe por 4s" },
  blast:  { name: "Nova Estelar",       desc: "Explosão gigante que limpa balas e devasta a área" },
  drone:  { name: "Colmeia",            desc: "4 drones extras lutam com você por 8s" },
  magnet: { name: "Singularidade",      desc: "Puxa os inimigos para um ponto e o colapsa" },
  maverick: { name: "Ataque Supersônico", desc: "Voo rasante que atravessa a tela destruindo tudo na passagem" },
  b2:       { name: "Apocalipse",         desc: "Chuva de fogo sobre toda a tela por 6 segundos" },
  omega:    { name: "Operação Ômega",     desc: "Nuclear, bombardeio, tanques e tropas ao mesmo tempo" },
  privada:  { name: "Explosão Intestinal", desc: "Solta tudo de uma vez: bombas de cocô, gás, chuva marrom e descarga" }
};
const CUT_QUOTES = {
  omega:  "“Eu não vim lutar sozinho. Eu vim com o exército inteiro.”",
  dmg:    "“Aperto o gatilho e o universo abre caminho.”",
  rate:   "“Mil tiros por minuto. Nenhum desperdiçado.”",
  lives:  "“Podem vir. Eu aguento tudo.”",
  gold:   "“Cada estrela tem um preço. Eu cobro.”",
  ghost:  "“Você não pode acertar o que não pode ver.”",
  vamp:   "“A vida deles agora é minha.”",
  frost:  "“No vácuo, até o fogo congela.”",
  blast:  "“Eu não abro portas. Eu abro crateras.”",
  drone:  "“Nunca voo sozinha. Nunca.”",
  magnet: "“Tudo o que brilha vem até mim.”",
  maverick: "“Não existe segundo lugar. Existe o primeiro e existe o resto.”",
  b2:       "“Eles nunca me veem chegar. Só veem a cratera.”",
  privada:  "“Sentado no trono, mando no universo. Puxa a descarga.”"
};
const SHIPS = [];
for (let i = 0; i < 50; i++) {
  const p = POWERS[i % 10];
  const m = p.mag(i);
  SHIPS.push({
    name: SHIP_NAMES[i],
    price: i === 0 ? 0 : Math.round(60 * Math.pow(1.16, i - 1) / 5) * 5,
    hue: SHIP_HUES[i % 10],
    shape: Math.floor(i / 10),
    power: p.id,
    powerName: p.name,
    powerMag: m,
    powerDesc: p.desc(m),
    baseDmg: 1 + i * 0.01,
    baseAgi: 1 + i * 0.008,
    baseHp: 100 + i * 4
  });
}
/* ---------- Frota de troca: 60 naves com virtude e defeito ----------
   Cada uma é forte em alguma coisa e fraca em outra, para nenhuma ser a
   melhor em tudo.                                                          */
const NOMES_TROCA = [
  "Adaga","Alabarda","Alfanje","Aríete","Azagaia","Balista","Bastarda","Bordão",
  "Catapulta","Cimitarra","Clava","Escaramuça","Espadim","Estilete","Falange","Florete",
  "Funda","Gládio","Guilhotina","Katana","Lança","Maça","Malho","Marreta",
  "Montante","Punhal","Rapieira","Sabre","Tridente","Zarabatana",
  "Alcatraz","Albatroz","Bem-te-vi","Carcará","Codorna","Cormorão","Curió","Gaivota",
  "Garça","Grifo","Íbis","Jaçanã","Maritaca","Pelicano","Pica-pau","Quero-quero",
  "Rolinha","Sabiá","Tucano","Urubu",
  "Ártemis","Astréia","Bóreas","Cronos","Éolo","Hélios","Íris","Nêmesis","Perseu","Selene"
];
const TROCAS = [
  { id: "canhao",      nome: "Canhoneira",   bom: "+55% de dano",      ruim: "−30% de cadência",
    dmg: 1.55, agi: 1.0,  hp: 1.0,  rate: 0.70, gem: 1.0 },
  { id: "leve",        nome: "Leve",         bom: "+45% de agilidade", ruim: "−35% de vida",
    dmg: 1.0,  agi: 1.45, hp: 0.65, rate: 1.0,  gem: 1.0 },
  { id: "fortaleza",   nome: "Fortaleza",    bom: "+80% de vida",      ruim: "−30% de agilidade",
    dmg: 1.0,  agi: 0.70, hp: 1.80, rate: 1.0,  gem: 1.0 },
  { id: "metralha",    nome: "Metralhadora", bom: "+70% de cadência",  ruim: "−35% de dano",
    dmg: 0.65, agi: 1.0,  hp: 1.0,  rate: 1.70, gem: 1.0 },
  { id: "saqueadora",  nome: "Saqueadora",   bom: "+60% de cristais",  ruim: "−25% de vida",
    dmg: 1.0,  agi: 1.0,  hp: 0.75, rate: 1.0,  gem: 1.60 },
  { id: "equilibrada", nome: "Equilibrada",  bom: "+20% em tudo",      ruim: "−20% de cristais",
    dmg: 1.20, agi: 1.20, hp: 1.20, rate: 1.20, gem: 0.80 }
];
for (let k = 0; k < 60; k++) {
  const t = TROCAS[k % TROCAS.length];
  const p0 = POWERS[k % 10];
  const grau = 1 + k / 90;
  SHIPS.push({
    name: NOMES_TROCA[k % NOMES_TROCA.length],
    price: Math.round(1200 * Math.pow(1.14, k) / 10) * 10,
    hue: (k * 47) % 360,
    shape: k % 5,
    power: p0.id,
    powerName: t.nome,
    powerMag: p0.mag(20 + k),
    powerDesc: t.bom + ", mas " + t.ruim,
    troca: t.id, virtude: t.bom, defeito: t.ruim,
    baseDmg: 1.15 * t.dmg * grau,
    baseAgi: 1.05 * t.agi,
    baseHp: Math.round((150 + k * 6) * t.hp),
    baseRate: t.rate,
    baseGem: t.gem
  });
}

/* ---------- Aeronaves exclusivas (só o administrador entrega) ---------- */
const MAVERICK = SHIPS.length, B2 = SHIPS.length + 1;
SHIPS.push({
  name: "Maverick", price: 0, exclusiva: true,
  hue: 15, shape: 5,
  power: "dmg", ultId: "maverick",
  powerName: "Caça de Elite", powerMag: 85,
  powerDesc: "+85% de dano, com 5 habilidades de combate próprias",
  baseDmg: 2.2, baseAgi: 1.45, baseHp: 460
});
SHIPS.push({
  name: "B-2 Spirit", price: 0, exclusiva: true,
  hue: 265, shape: 6,
  power: "blast", ultId: "b2",
  powerName: "Bombardeiro Furtivo", powerMag: 90,
  powerDesc: "tiros explodem num raio de 90, com 10 habilidades de bombardeio",
  baseDmg: 3.0, baseAgi: 1.2, baseHp: 620
});
/* =====================================================================
   ÔMEGA-9 ARSENAL — a aeronave suprema, só o administrador entrega
   ---------------------------------------------------------------------
   Não é um caça: é um posto de comando voador. Quem pilota não luta
   sozinho — chama exércitos. Ogivas nucleares sem limite de uso, coluna
   de tanques que fica até o fim da fase, esquadrão de bombardeio,
   pelotão de fuzileiros, artilharia e um canhão orbital.
   ===================================================================== */
const OMEGA = SHIPS.length;
SHIPS.push({
  name: "Ômega-9 Arsenal", price: 0, exclusiva: true, suprema: true,
  hue: 45, shape: 7,
  power: "dmg", ultId: "omega",
  powerName: "Comando Supremo", powerMag: 150,
  powerDesc: "+150% de dano e um arsenal inteiro às ordens: nuclear sem limite, tanques, bombardeio e tropas",
  baseDmg: 4.4, baseAgi: 1.6, baseHp: 980, baseRate: 1.35, baseGem: 1.5
});

/* =====================================================================
   TRONO REAL — a privada voadora do administrador
   ---------------------------------------------------------------------
   É uma privada de porcelana com um homem sentado dentro, jornal na mão
   e coroa na cabeça. Luta com o que tem: bomba de cocô, jato de
   descarga, gás, papel higiênico e, quando aperta, a EXPLOSÃO
   INTESTINAL. Forte, engraçada — e ainda assim abaixo da Ômega-9.
   ===================================================================== */
const PRIVADA = SHIPS.length;
SHIPS.push({
  name: "Trono Real", price: 0, exclusiva: true, privada: true,
  hue: 96, shape: 8,
  power: "gold", ultId: "privada",
  powerName: "Descarga Suprema", powerMag: 120,
  powerDesc: "+120% de cristais e 8 habilidades de cocô: bombas, gás, papel e a explosão intestinal",
  baseDmg: 3.2, baseAgi: 1.35, baseHp: 760, baseRate: 1.15, baseGem: 2
});

/* =====================================================================
   NAVES ESPECIAIS DA LOJA
   ---------------------------------------------------------------------
   São fortes, mas NENHUMA chega perto da Ômega-9. A regra está escrita
   em código logo abaixo (tetoDaLoja) e conferida quando o jogo abre:
   se alguma passar do teto, ela é rebaixada sozinha. Assim a sua nave
   continua sendo a mais forte do jogo, aconteça o que acontecer.
   ===================================================================== */
const NAVES_LOJA_DE = SHIPS.length;
const NAVES_LOJA = [
  { name: "Centelha VIP", hue: 190, shape: 5, preco: 1.00, vip: true,
    power: "rate", ultId: "rate", powerName: "Rajada Prateada", powerMag: 40,
    powerDesc: "+40% de cadência e tiros que atravessam um inimigo",
    baseDmg: 2.2, baseAgi: 1.35, baseHp: 420, baseRate: 1.30, baseGem: 1.20 },
  { name: "Aurora Real", hue: 285, shape: 4, preco: 1.50, vip: true,
    power: "ghost", ultId: "ghost", powerName: "Manto de Aurora", powerMag: 60,
    powerDesc: "+60% de escudo e invencibilidade, e some por 2s ao levar dano",
    baseDmg: 2.0, baseAgi: 1.42, baseHp: 520, baseRate: 1.12, baseGem: 1.25 },
  { name: "Titã de Bronze", hue: 32, shape: 6, preco: 2.00, vip: true,
    power: "lives", ultId: "lives", powerName: "Casco de Bronze", powerMag: 3,
    powerDesc: "+3 vidas máximas e um escudo que volta sozinho",
    baseDmg: 1.9, baseAgi: 1.05, baseHp: 640, baseRate: 1.00, baseGem: 1.15 },
  { name: "Lâmina Carmim", hue: 350, shape: 5, preco: 2.50, vip: true,
    power: "dmg", ultId: "dmg", powerName: "Corte Carmim", powerMag: 85,
    powerDesc: "+85% de dano; quanto menos vida você tem, mais forte fica",
    baseDmg: 2.9, baseAgi: 1.30, baseHp: 380, baseRate: 1.10, baseGem: 1.10 },
  { name: "Guardiã Esmeralda", hue: 150, shape: 6, preco: 3.00, vip: true,
    power: "drone", ultId: "drone", powerName: "Enxame Esmeralda", powerMag: 0.9,
    powerDesc: "Dois drones fixos que atiram com 90% do seu dano",
    baseDmg: 2.3, baseAgi: 1.25, baseHp: 560, baseRate: 1.15, baseGem: 1.30 },
  { name: "Coroa de Platina", hue: 210, shape: 7, preco: 5.00, vip: true,
    power: "gold", ultId: "gold", powerName: "Toque de Platina", powerMag: 90,
    powerDesc: "+90% de cristais e todo item cai atraído para você",
    baseDmg: 2.6, baseAgi: 1.38, baseHp: 600, baseRate: 1.22, baseGem: 1.90 }
];
/* o teto: nenhuma nave da loja passa de 68% da Ômega em nada */
function tetoDaLoja() {
  const o = SHIPS[OMEGA];
  return { baseDmg: o.baseDmg * 0.68, baseHp: Math.round(o.baseHp * 0.68),
           baseAgi: o.baseAgi * 0.92, baseRate: o.baseRate * 0.98,
           baseGem: o.baseGem * 1.30, powerMag: 100 };
}
for (const n of NAVES_LOJA) {
  const t = tetoDaLoja();
  n.baseDmg = Math.min(n.baseDmg, t.baseDmg);
  n.baseHp = Math.min(n.baseHp, t.baseHp);
  n.baseAgi = Math.min(n.baseAgi, t.baseAgi);
  n.baseRate = Math.min(n.baseRate, t.baseRate);
  n.baseGem = Math.min(n.baseGem, t.baseGem);
  if (n.power !== "drone") n.powerMag = Math.min(n.powerMag, t.powerMag);
  n.price = n.preco;
  n.daLoja = true;
  SHIPS.push(n);
}
const NAVES_LOJA_ATE = SHIPS.length;
function naveDaLoja(i) { return i >= NAVES_LOJA_DE && i < NAVES_LOJA_ATE; }
/* confere de novo com o jogo montado: a Ômega tem que ganhar em tudo */
function conferirTeto() {
  const o = SHIPS[OMEGA];
  const falhas = [];
  for (let i = NAVES_LOJA_DE; i < NAVES_LOJA_ATE; i++) {
    const n = SHIPS[i];
    if (n.baseDmg >= o.baseDmg) falhas.push(n.name + " dano");
    if (n.baseHp >= o.baseHp) falhas.push(n.name + " casco");
    if (n.baseAgi > o.baseAgi) falhas.push(n.name + " agilidade");
  }
  return falhas;
}

function naveExclusiva(i) { return !!(SHIPS[i] && SHIPS[i].exclusiva); }
function naveSuprema(i) { return !!(SHIPS[i] && SHIPS[i].suprema); }

