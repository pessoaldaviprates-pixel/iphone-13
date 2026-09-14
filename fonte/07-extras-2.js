/* ---------- Loop ---------- */
let last = performance.now();
function loop(now) {
  try {
  return loopInterno(now);
  } catch (e) {
    mostrarErro(e && e.message, "laço do jogo");
    /* escolhe o nível de capricho antes do primeiro quadro */
try {
  const inicial = qChutePeloAparelho();
  if (inicial !== 2) qAplicar(inicial, "chute inicial");
  else { document.body.classList.remove("leve", "leve-max"); }
} catch (e) {}

requestAnimationFrame(loop);
  }
}
/* Fora da partida quase nada precisa acontecer por quadro. O canvas é
   apagado UMA vez ao sair do jogo (para não guardar a última cena atrás
   das telas) e depois fica quieto.                                    */
let canvasLimpo = false;
function menuOcioso(dt) {
  if (!canvasLimpo) {
    canvasLimpo = true;
    try { ctx.clearRect(0, 0, W, H); } catch (e) {}
    if (decoP.length) decoP.length = 0;
  }
  // a única coisa que ainda anda é o relógio das telas que animam sozinhas
  S.telaT = (S.telaT || 0) + dt;
}
function loopInterno(now) {
  fpsContar();
  let dt = (now - last) / 1000;
  const bruto = now - last;
  last = now;
  if (dt > 0.05) dt = 0.05;
  if (bruto > 0 && bruto < 400) qMedir(bruto);
  if (S.mode === "cutscene") {
    drawCutscene(dt);
  } else if (S.mode === "oficina") {
    if (ofAuto || !ofDragging) ofTheta += dt * (ofAuto ? 0.9 : 0);
    const cw = of3d.width / DPR, ch = of3d.height / DPR;
    render3D(ofCtx, save.ship, cw / 2, ch / 2 + 10, 5.6, ofTheta, cw, ch);
  } else if (S.mode !== "playing") {
    /* =================================================================
       MENU E DEMAIS TELAS: o jogo fica PARADO
       -----------------------------------------------------------------
       As telas cobrem a tela inteira e são opacas — mesmo assim o jogo
       continuava rodando atrás delas: a fase inteira sendo atualizada e
       desenhada 60 vezes por segundo, sem ninguém ver. Era isso que
       fazia o menu engasgar em celular fraco.
       Agora, fora da partida, o laço não atualiza nem desenha nada. O
       menu passa a ter o aparelho inteiro só para ele.
       ================================================================= */
    menuOcioso(dt);
  } else {
    canvasLimpo = false;
    update(dt * mundoRitmo());
    hudAgora();                 // escreve o painel uma vez por quadro
    decoAtualizar(dt);
    dtDesenho = dt;
    draw();
    /* enquanto joga, a posição vai pelo laço de desenho: mais constante.
       Com a ligação direta aberta o passo é de 33 ms (30 vezes por
       segundo) — não custa nada, porque não passa por servidor. Pela
       nuvem o passo continua o que a rede aguenta.                    */
    const passoRede = p2pAberto() ? 33 : REDE.intervalo;
    if (MP.sala && now - (MP.ultimoEnvio || 0) > passoRede) {
      MP.ultimoEnvio = now;
      mpEnviarPosicao();
    }
    // se acabei de atirar, vale mandar antes da hora: o tiro chega junto
    if (MP.sala && !p2pAberto() && (MP.serieEnviada || 0) < serieTiro - 5 &&
        now - (MP.ultimoEnvio || 0) > 45) {
      MP.ultimoEnvio = now;
      mpEnviarPosicao();
    }
    /* derrubei alguém no cooperativo: o aviso não espera o passo normal
       da rede. Sem a ligação direta era isto que fazia o inimigo morrer
       aqui e continuar vivo na tela do parceiro por meio segundo.    */
    if (MP.sala && !p2pAberto() && MP.modo !== "pvp" &&
        mpMeusAbates.length !== (MP.abatesEnviadosConta || 0) &&
        now - (MP.ultimoEnvio || 0) > 60) {
      MP.ultimoEnvio = now;
      MP.abatesEnviadosConta = mpMeusAbates.length;
      mpEnviarPosicao();
    }
    cenaPublicar();
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* ---------- Salvar na nuvem (versão publicada como Artifact) ---------- */
let artifactNS = null;
(function initCloud() {
  if (!(window.claude && typeof window.claude.use === "function")) return;
  window.claude.use("artifact").then(ns => {
    if (!ns) return;
    artifactNS = ns;
    $("cloud-btn").style.display = "block";
    let at = 0;
    try {
      const cloud = JSON.parse(document.getElementById("cloud-save").textContent);
      if (cloud && cloud.savedAt) at = cloud.savedAt;
    } catch (e) {}
    $("cloud-status").textContent = at
      ? "Nuvem: salvo em " + new Date(at).toLocaleString("pt-BR")
      : "Salve na nuvem para não perder o progresso.";
  }).catch(() => {});
})();
$("cloud-btn").addEventListener("click", async () => {
  if (!artifactNS) return;
  const btn = $("cloud-btn");
  const prev = btn.textContent;
  btn.disabled = true;
  btn.textContent = "SALVANDO…";
  try {
    const srcTag = document.getElementById("page-src");
    const b64 = srcTag ? srcTag.textContent.trim() : "";
    if (!b64 || b64.charAt(0) === "_") throw new Error("sem fonte");
    const bytes = atob(b64);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    const T = new TextDecoder().decode(arr);
    const PS_PRE = 'id="page-src">';
    const anchor = PS_PRE + "__PAGE" + "SRC__";
    const ai = T.indexOf(anchor);
    if (ai < 0) throw new Error("modelo inválido");
    let out = T.slice(0, ai + PS_PRE.length) + b64 + T.slice(ai + anchor.length);
    persist();
    const json = JSON.stringify(ROOT);
    const CS_OPEN = "<scr" + 'ipt type="application/json" id="cloud-save">';
    const CS_CLOSE = "</scr" + "ipt>";
    const c1 = out.indexOf(CS_OPEN);
    const c2 = c1 >= 0 ? out.indexOf(CS_CLOSE, c1) : -1;
    if (c1 < 0 || c2 < 0) throw new Error("modelo inválido");
    out = out.slice(0, c1 + CS_OPEN.length) + json + out.slice(c2);
    const doc = "<!doctype html>\n<html lang=\"pt-BR\"><head>" +
      "<meta charset=\"utf-8\">" +
      "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover\">" +
      "</he" + "ad><bo" + "dy style=\"margin:0\">" + out + "</bo" + "dy></ht" + "ml>";
    await artifactNS.publish(doc);
    btn.textContent = "SALVO ✓";
  } catch (e) {
    btn.textContent = prev;
    btn.disabled = false;
    $("cloud-status").textContent = "Não deu para salvar na nuvem agora. Tente de novo.";
  }
});

/* =====================================================================
   Ver a tela de outro jogador
   ---------------------------------------------------------------------
   Não dá para mandar vídeo por um banco de dados. Então o jogo manda um
   RESUMO da cena (posições da nave, dos inimigos, das balas e do chefe)
   umas 3 vezes por segundo, num texto curtinho. Quem está assistindo
   redesenha a cena na tela dele. Fica igual a ver o jogo da pessoa, e
   pesa quase nada.
   ===================================================================== */
/* ---------------------------------------------------------------------
   A tela só é transmitida enquanto ALGUÉM está olhando.
   Antes ela subia o tempo todo, gastando rede à toa. Agora quem abre o
   👁 deixa um pedido em pedidos/<id>; o jogo do outro lado escuta esse
   pedido (uma conexão minúscula) e só então começa a mandar a cena.
   Parou de olhar, para de transmitir sozinho em poucos segundos.
   --------------------------------------------------------------------- */
let cenaUltima = 0, cenaPedido = 0, cenaFechar = null;
function cenaEscutarPedidos() {
  if (cenaFechar || !nuvemAtiva() || !save.__name) return;
  cenaFechar = nuvemFluxo("pedidos/" + nuvemId(save.__name), d => {
    cenaPedido = (d && d.ver) || 0;
  }, () => {
    cenaRelogio = setInterval(async () => {
      const d = await nuvemReq("pedidos/" + nuvemId(save.__name));
      cenaPedido = (d && d.ver) || 0;
    }, 4000);
  });
}
let cenaRelogio = null;
function cenaPublicar() {
  if (!nuvemAtiva() || !save.__name || S.mode !== "playing") return;
  if (Date.now() - cenaPedido > 12000) return;      // ninguém olhando
  const agora = Date.now();
  const espera = MP.sala ? 700 : 400;
  if (agora - cenaUltima < espera) return;
  cenaUltima = agora;
  const q = n => Math.round(n);
  const ini = enemies.slice(0, 22)
    .map(e => q(e.x) + "," + q(e.y) + "," + q(e.r || 12)).join("|");
  const bal = bullets.slice(0, 18).map(b => q(b.x) + "," + q(b.y)).join("|");
  const inim = enemyBullets.slice(0, 26).map(b => q(b.x) + "," + q(b.y)).join("|");
  let chefe = "";
  if (boss) {
    const frac = boss.maxHp ? clamp(bossHpLeft() / boss.maxHp, 0, 1) : 0;
    chefe = q(boss.x) + "," + q(boss.y) + "," + Math.round(frac * 100) + "," +
            q(boss.r || 60) + "," + (boss.kind || "chefe");
  }
  const cab = [
    q(player.x), q(player.y), q(Math.max(0, player.hp)), q(ST ? ST.maxHp : 100),
    save.ship || 0, S.waveIdx || 0, S.nWaves || 0, S.fase || 0, S.score || 0,
    q(W), q(H), player.invis > 0 ? 1 : 0
  ].join(",");
  nuvemSoltar("cenas/" + nuvemId(save.__name),
    { q: [cab, ini, bal, inim, chefe].join(";"), t: agora, n: save.__name });
}

/* ----- lado de quem assiste ----- */
const AS = { fechar: null, cena: null, quem: null, raf: null, ultimo: 0 };
function assistirJogador(p) {
  AS.quem = p;
  AS.cena = null;
  AS.ultimo = 0;
  $("as-nome").textContent = p.nome;
  $("as-onde").textContent = p.onde || "…";
  $("as-aviso").style.display = "block";
  $("as-aviso").textContent = "Pedindo a tela de " + p.nome +
    "… (só aparece quando a pessoa estiver dentro de uma fase)";
  $("assistir").classList.add("on");
  // avisa que estou olhando, e vai renovando enquanto a janela estiver aberta
  nuvemSoltar("pedidos/" + p.id, { ver: Date.now(), por: save.__name || "adm" });
  if (AS.aviso) clearInterval(AS.aviso);
  AS.aviso = setInterval(() => {
    nuvemSoltar("pedidos/" + p.id, { ver: Date.now(), por: save.__name || "adm" });
  }, 5000);
  if (AS.fechar) AS.fechar();
  AS.fechar = nuvemFluxo("cenas/" + p.id, d => {
    if (!d || !d.q) return;
    AS.cena = asLer(d.q);
    AS.ultimo = Date.now();
    $("as-aviso").style.display = "none";
  }, () => {
    // sem fluxo: busca rápida
    AS.relogio = setInterval(async () => {
      const d = await nuvemReq("cenas/" + p.id);
      if (d && d.q) { AS.cena = asLer(d.q); AS.ultimo = Date.now(); $("as-aviso").style.display = "none"; }
    }, 400);
  });
  asLaco();
}
function fecharAssistir() {
  $("assistir").classList.remove("on");
  if (AS.aviso) { clearInterval(AS.aviso); AS.aviso = null; }
  if (AS.quem) nuvemReq("pedidos/" + AS.quem.id, { method: "DELETE" });
  if (AS.fechar) { AS.fechar(); AS.fechar = null; }
  if (AS.relogio) { clearInterval(AS.relogio); AS.relogio = null; }
  if (AS.raf) { cancelAnimationFrame(AS.raf); AS.raf = null; }
  AS.cena = null; AS.quem = null;
}
$("as-fechar").addEventListener("click", fecharAssistir);

function asLer(txt) {
  const p = String(txt).split(";");
  const c = (p[0] || "").split(",").map(Number);
  const pontos = t => !t ? [] : t.split("|").map(v => v.split(",").map(Number));
  return {
    x: c[0], y: c[1], hp: c[2], hpMax: c[3], nave: c[4],
    onda: c[5], nOndas: c[6], fase: c[7], pontos: c[8],
    W: c[9] || 390, H: c[10] || 844, invis: c[11] === 1,
    inimigos: pontos(p[1]), balas: pontos(p[2]), tiros: pontos(p[3]),
    chefe: p[4] ? (() => {
      const b = p[4].split(",");
      return { x: +b[0], y: +b[1], frac: (+b[2]) / 100, r: +b[3], tipo: b[4] };
    })() : null
  };
}
function asLaco() {
  const cv = $("as-tela");
  const g = cv.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cw = cv.clientWidth, ch = cv.clientHeight;
  if (cv.width !== Math.round(cw * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cw, ch);

  const c = AS.cena;
  const vivo = c && Date.now() - AS.ultimo < 3500;
  $("as-luz").classList.toggle("on", !!vivo);

  // fundo
  g.fillStyle = "#060A18";
  g.fillRect(0, 0, cw, ch);
  if (c) {
    // escala a tela da pessoa para caber na minha, sem distorcer
    const k = Math.min(cw / c.W, ch / c.H);
    const ox = (cw - c.W * k) / 2, oy = (ch - c.H * k) / 2;
    g.save();
    g.translate(ox, oy);
    g.scale(k, k);
    g.strokeStyle = "rgba(77,232,255,.18)";
    g.lineWidth = 2 / k;
    g.strokeRect(0, 0, c.W, c.H);

    // balas inimigas
    g.fillStyle = "#FF6B8A";
    for (const b of c.tiros) { g.beginPath(); g.arc(b[0], b[1], 4, 0, TAU); g.fill(); }
    // tiros do jogador
    g.fillStyle = "#7CF7C0";
    for (const b of c.balas) { g.fillRect(b[0] - 2, b[1] - 8, 4, 14); }
    // inimigos
    for (const e of c.inimigos) {
      g.fillStyle = "rgba(255,77,143,.85)";
      g.beginPath(); g.arc(e[0], e[1], e[2] || 12, 0, TAU); g.fill();
      g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 1.5 / k; g.stroke();
    }
    // chefe
    if (c.chefe) {
      g.fillStyle = "rgba(195,77,255,.5)";
      g.beginPath(); g.arc(c.chefe.x, c.chefe.y, c.chefe.r, 0, TAU); g.fill();
      g.strokeStyle = "#C34DFF"; g.lineWidth = 3 / k; g.stroke();
      const bw = c.W * 0.6, bx = (c.W - bw) / 2;
      g.fillStyle = "rgba(0,0,0,.55)"; g.fillRect(bx, 24, bw, 9);
      g.fillStyle = "#FF4D8F"; g.fillRect(bx, 24, bw * c.chefe.frac, 9);
    }
    // a nave da pessoa
    g.save();
    g.translate(c.x, c.y);
    g.globalAlpha = c.invis ? 0.4 : 1;
    try { drawShipSprite(g, naveValida(c.nave), 16); } catch (e) {
      g.fillStyle = "#4DE8FF"; g.beginPath(); g.arc(0, 0, 14, 0, TAU); g.fill();
    }
    g.restore();
    g.restore();

    const frac = clamp(c.hp / (c.hpMax || 1), 0, 1);
    $("as-hud").innerHTML =
      '<span class="as-chip">VIDA <b>' + Math.max(0, c.hp) + "/" + c.hpMax + "</b></span>" +
      '<span class="as-chip">FASE <b>' + c.fase + "</b></span>" +
      '<span class="as-chip">ONDA <b>' + c.onda + "/" + c.nOndas + "</b></span>" +
      '<span class="as-chip">PONTOS <b>' + fmt(c.pontos) + "</b></span>" +
      '<span class="as-chip">NAVE <b>' + escaparTexto((SHIPS[naveValida(c.nave)] || {}).name || "?") + "</b></span>" +
      '<span class="as-chip">' + (frac > 0 ? "" : "CAIU ") + (vivo ? "AO VIVO" : "PAUSADO") + "</span>";
  }
  if (!vivo && c) {
    $("as-aviso").style.display = "block";
    $("as-aviso").textContent = (AS.quem ? AS.quem.nome : "A pessoa") +
      " saiu da partida. A imagem volta quando ela entrar em uma fase.";
  }
  AS.raf = requestAnimationFrame(asLaco);
}

/* =====================================================================
   CAIXA DE SUGESTÕES
   ---------------------------------------------------------------------
   No fim de cada fase (ganhando ou perdendo) aparece um botão junto do
   "próxima fase" e do "menu". O que a pessoa escrever vai para o galho
   sugestoes/ da nuvem, com o nome, a fase em que estava e a versão do
   jogo — e o administrador lê tudo no painel.
   Se estiver sem internet na hora, a sugestão fica guardada no aparelho
   e sobe sozinha na próxima vez que abrir com rede.
   ===================================================================== */
const SUG_TIPOS = [
  { id: "ideia",   nome: "💡 IDEIA NOVA" },
  { id: "nave",    nome: "✈ NAVE" },
  { id: "fase",    nome: "▶ FASE / CHEFE" },
  { id: "erro",    nome: "🐞 ALGO QUEBRADO" },
  { id: "dificil", nome: "⚖ DIFICULDADE" },
  { id: "outro",   nome: "… OUTRO" }
];
let sugTipo = "ideia";

function abrirSugestao() {
  AudioSys.resume();
  sugTipo = "ideia";
  $("sg-texto").value = "";
  $("sg-conta").textContent = "0 / 500";
  $("sg-aviso").textContent = "";
  $("sg-aviso").className = "sg-aviso";
  $("sg-enviar").disabled = false;
  $("sg-enviar").textContent = "ENVIAR SUGESTÃO";
  sugRenderTipos();
  sugRenderMinhas();
  $("sugestao-box").classList.add("on");
  setTimeout(() => { try { $("sg-texto").focus(); } catch (e) {} }, 120);
}
function fecharSugestao() { $("sugestao-box").classList.remove("on"); }
function sugRenderTipos() {
  const cx = $("sg-tipos");
  cx.innerHTML = "";
  for (const t of SUG_TIPOS) {
    const b = document.createElement("button");
    b.className = "sg-tipo" + (sugTipo === t.id ? " on" : "");
    b.textContent = t.nome;
    b.addEventListener("click", () => { sugTipo = t.id; sugRenderTipos(); });
    cx.appendChild(b);
  }
}
function sugRenderMinhas() {
  const cx = $("sg-minhas");
  const minhas = (save.sugestoes || []).slice(-3).reverse();
  cx.innerHTML = "";
  if (!minhas.length) return;
  const t = document.createElement("div");
  t.className = "sg-minha";
  t.innerHTML = "<b>O QUE VOCÊ JÁ MANDOU</b>" +
    minhas.map(m => "• " + escaparTexto(String(m.texto).slice(0, 90))).join("<br>");
  cx.appendChild(t);
}
async function enviarSugestao() {
  const txt = ($("sg-texto").value || "").trim();
  const av = $("sg-aviso");
  if (txt.length < 4) {
    av.className = "sg-aviso erro";
    av.textContent = "Escreva um pouquinho mais para eu entender a ideia.";
    AudioSys.deny();
    return;
  }
  const sug = {
    nome: save.__name || "Piloto",
    texto: txt.slice(0, 500),
    tipo: sugTipo,
    fase: S.fase || 0,
    nave: (SHIPS[naveValida(save.ship)] || {}).name || "?",
    versao: VERSAO,
    quando: Date.now(),
    lida: false
  };
  save.sugestoes = (save.sugestoes || []).concat([{ texto: sug.texto, quando: sug.quando }]);
  if (save.sugestoes.length > 20) save.sugestoes = save.sugestoes.slice(-20);
  persist();

  $("sg-enviar").disabled = true;
  $("sg-enviar").textContent = "ENVIANDO…";
  const ok = await sugSubir(sug);
  if (ok) {
    av.className = "sg-aviso ok";
    av.textContent = "✓ Recebido! Obrigado — isso chega em quem faz o jogo.";
    AudioSys.victory();
    vibrate([30, 60, 30]);
    setTimeout(fecharSugestao, 1600);
  } else {
    // guarda para subir depois, quando houver internet
    save.sugPendentes = (save.sugPendentes || []).concat([sug]);
    persist();
    av.className = "sg-aviso ok";
    av.textContent = "✓ Guardada! Vai ser enviada assim que você abrir o jogo com internet.";
    AudioSys.buy();
    setTimeout(fecharSugestao, 2200);
  }
  $("sg-enviar").disabled = false;
  $("sg-enviar").textContent = "ENVIAR SUGESTÃO";
  sugRenderMinhas();
}
async function sugSubir(sug) {
  if (!nuvemAtiva()) return false;
  const id = "s" + sug.quando.toString(36) + Math.random().toString(36).slice(2, 6);
  try {
    const r = await fetch(NUVEM_URL.replace(/\/$/, "") + "/sugestoes/" + id + ".json", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sug)
    });
    return !!(r && r.ok);
  } catch (e) { return false; }
}
/* manda as que ficaram guardadas por falta de internet */
async function sugEnviarPendentes() {
  const fila = save.sugPendentes || [];
  if (!fila.length || !nuvemAtiva()) return;
  const sobraram = [];
  for (const sug of fila) {
    if (!await sugSubir(sug)) sobraram.push(sug);
  }
  save.sugPendentes = sobraram;
  persist();
}
$("btn-vic-sug").addEventListener("click", abrirSugestao);
$("btn-go-sug").addEventListener("click", abrirSugestao);
$("sg-fechar").addEventListener("click", fecharSugestao);
$("sg-enviar").addEventListener("click", enviarSugestao);
$("sg-texto").addEventListener("input", e => {
  $("sg-conta").textContent = (e.target.value || "").length + " / 500";
});
document.querySelector("#sugestao-box .sg-fundo").addEventListener("click", fecharSugestao);

/* ---------- Caixa de presente ---------- */
let presenteGuardado = null;
let recadoDoPresente = "";      // o que o administrador escreveu junto do presente

/* ---------------------------------------------------------------------
   O AVISO DE RETIRADA
   ---------------------------------------------------------------------
   O contrário da caixa de presente, e de propósito: aparece de uma vez,
   sem brilho, sem som de baú, sem "toque para abrir". A pessoa perdeu
   alguma coisa -- a tela tem que dizer isso e sair da frente, não fazer
   festa.                                                              */
function avisarRetirada(lista) {
  if (!lista || !lista.length) return;
  const cx = $("retirada-aviso"), box = $("retirada-itens");
  if (!cx || !box) return;
  box.innerHTML = lista.map(it =>
    '<div class="retirada-item"><b>' + (it.icone || "⚠") + "</b>" +
    "<span>" + escaparTexto(it.texto) + "</span></div>").join("");
  cx.classList.add("on");
  /* vibra curto e grave: é aviso, não prêmio */
  vibrate(60);
}
(function ligarRetirada() {
  const b = $("retirada-ok");
  if (b) b.addEventListener("click", () => $("retirada-aviso").classList.remove("on"));
})();

function mostrarCaixaPresente() {
  if (!presenteGuardado || !presenteGuardado.length) return;
  if (S.mode !== "menu") return;             // só no menu, nunca sobre o login
  const cx = $("caixa-presente");
  cx.classList.remove("aberta");
  // o recado escrito pelo administrador, quando ele mandou um
  const msg = $("cp-msg");
  if (msg) {
    if (recadoDoPresente) { msg.textContent = recadoDoPresente; msg.classList.add("on"); }
    else msg.classList.remove("on");
  }
  $("cp-itens").innerHTML = "";
  $("cp-ok").style.display = "none";
  $("cp-toque").textContent = "toque para abrir";
  cx.classList.add("on");
  AudioSys.tone(523, 0.12, "sine", 0.12);
  setTimeout(() => AudioSys.tone(659, 0.14, "sine", 0.12), 140);
  vibrate([30, 60, 30]);
}

function abrirCaixaPresente() {
  const cx = $("caixa-presente");
  if (cx.classList.contains("aberta")) return;
  cx.classList.add("aberta");
  AudioSys.chest();
  vibrate([40, 40, 80]);
  const lista = $("cp-itens");
  lista.innerHTML = "";
  (presenteGuardado || []).forEach((it, i) => {
    const el = document.createElement("div");
    el.className = "cp-item" + (it.ruim ? " ruim" : "");
    el.style.animationDelay = (0.35 + i * 0.12) + "s";
    el.innerHTML = "<b style=\"color:" + (it.ruim ? "var(--danger)" : "var(--amber)") + "\">" +
      it.icone + "</b><span>" + escaparTexto(it.texto) + "</span>";
    lista.appendChild(el);
  });
  setTimeout(() => { $("cp-ok").style.display = "inline-block"; },
             400 + (presenteGuardado || []).length * 120);
}

function fecharCaixaPresente() {
  $("caixa-presente").classList.remove("on");
  presenteGuardado = null;
  recadoDoPresente = "";
  refreshMenu();
}
$("cp-caixa").addEventListener("click", abrirCaixaPresente);
$("cp-toque").addEventListener("click", abrirCaixaPresente);
$("cp-ok").addEventListener("click", fecharCaixaPresente);

/* ---------- Rede de segurança: mostra o erro em vez de travar ---------- */
let ultimoErro = "";
function mostrarErro(msg, origem) {
  const texto = String(msg || "erro desconhecido") + (origem ? "\n(" + origem + ")" : "");
  if (texto === ultimoErro) return;          // não repete o mesmo erro
  ultimoErro = texto;
  const box = $("erro-box");
  if (!box) return;
  const info = [
    texto,
    "",
    "versão " + (typeof VERSAO !== "undefined" ? VERSAO : "?") +
      " · tela " + S.mode +
      " · nave " + (save && save.ship) +
      " · fase " + S.fase +
      (typeof MP !== "undefined" && MP.sala ? " · sala " + MP.sala + " (" + MP.modo + ")" : "")
  ].join("\n");
  $("erro-msg").textContent = info;
  box.classList.add("on");
  try { mandarErroParaONuvem(msg, origem); } catch (e) {}
  try { if (S.mode === "playing") togglePause(); } catch (e) {}
}
window.addEventListener("error", ev => {
  mostrarErro(ev.message, (ev.filename || "").split("/").pop() + ":" + ev.lineno);
});
window.addEventListener("unhandledrejection", ev => {
  mostrarErro((ev.reason && ev.reason.message) || ev.reason, "promessa");
});
$("erro-copiar").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText($("erro-msg").textContent); $("erro-copiar").textContent = "COPIADO!"; }
  catch (e) { const r = document.createRange(); r.selectNode($("erro-msg")); getSelection().removeAllRanges(); getSelection().addRange(r); }
});
$("erro-fechar").addEventListener("click", () => { $("erro-box").classList.remove("on"); ultimoErro = ""; });
$("erro-menu").addEventListener("click", () => {
  $("erro-box").classList.remove("on");
  ultimoErro = "";
  try { if (typeof MP !== "undefined" && MP.sala) mpSair(false); } catch (e) {}
  try { goMenu(); } catch (e) { location.reload(); }
});

/* protege o laço do jogo: um erro num quadro não derruba a partida */
function protegido(fn, nome) {
  return function () {
    try { return fn.apply(this, arguments); }
    catch (e) { mostrarErro(e && e.message, nome); }
  };
}

/* ---------- Relatório de novidades (sempre aberto no menu) ---------- */
const NOVIDADES = [
  { v: "9.0", itens: [
      "FOTO DE PERFIL: escolha uma imagem do aparelho. Ela é recortada no quadrado e encolhida para 96×96 no seu próprio celular antes de subir — uma foto de 4 MB vira 4 KB, e a lista de pilotos não pesa nada por causa disso",
      "FONTES DO NOME: nove jeitos de escrever o seu nome, duas de graça. Nenhuma baixa nada, então funcionam sem internet",
      "DUAS CORES SUAS no fundo do perfil, escolhidas em duas rodas de cor — uma em cima para a cor de cima, outra embaixo para a de baixo, com a faixa do meio mostrando o resultado. Vale com ou sem NeoNebula",
      "O perfil virou uma janela alta, montada por blocos: Sobre mim, Emblemas, Interesses, Atividade recente, Amigos em comum e Coleção. Você escolhe quais aparecem e em que ordem",
      "EMBLEMAS saem das conquistas que você já ganhou, e INTERESSES deixam você dizer o que gosta de jogar",
      "BRILHO DO AVATAR: anel girando, faíscas, batimento e órbita",
      "COR DO JOGO INTEIRO: troque o tom de destaque de todas as telas, não só do perfil. Mais toque de aviso e efeito de clique",
      "O GLITCH DO NOME ESTAVA ILEGÍVEL — as sombras coloridas ficavam coladas na letra e o nome era um borrão o tempo todo. Agora o nome fica limpo e a falha acontece de vez em quando, que é o que um glitch deveria ser",
      "O NEONEBULA saiu de dentro do perfil e foi para o alto da barra, com Bronze, Prata e Ouro à vista. Embaixo dele aparecem ofertas — e só quando existe alguma",
      "CASTIGO SOB MEDIDA para o dono do jogo: uma setinha no perfil de qualquer pessoa, e você escolhe o número e se são segundos, minutos, horas ou dias. Dá para tirar só a fala, só a voz, ou as duas"
    ] },
  { v: "8.9", itens: [
      "MENSAGEM CHEGAVA CORTADA. Tudo o que você escrevia com mais de 40 letras aparecia pela metade do outro lado — sem reticências, sem aviso, desde que a Estação existe. Consertado: agora vai inteiro",
      "A conversa ficou com cara de conversa: a sua fala de um lado, a dos outros do outro, cada uma no seu balão. E o que a pessoa falou ficou maior que o nome dela",
      "Digite @ e a lista de quem dá para marcar aparece sozinha. Setas para escolher, Enter para pôr o nome. Nada de acertar o apelido de cabeça",
      "Busca no topo da barra: acha canal, sala de voz e conversa sem rolar",
      "O seu cartão no canto de baixo ficou opaco — a lista passava por trás dele e o nome saía sujo",
      "SALAS DE VOZ COM DONO: 40 coisas para fazer, em quatro grupos (A SALA, AS PESSOAS, O SOM, AS REGRAS). Trancar, pôr senha, limite de gente, calar, tirar, banir, mover, fazer ajudante, modo palestra, fila para falar com ✋, entrar calado, fase mínima, tirar quem some, anotar tudo e mais",
      "Você é dono de TODAS as salas de voz, sempre — e a sala que estiver vazia fica de quem chegar primeiro, para ninguém ficar refém do engraçadinho",
      "SERVIDORES E GRUPOS SAÍRAM. Criar servidor abria uma janela e não gravava nada, e uma comunidade dividida em cantinhos vazios é pior que uma cheia. Agora é um chat global só: #geral, #trocas e #ajuda, mais as conversas de um para um",
      "Todo botão da Estação passou a ser apertado por um teste antes de cada versão. Botão que não faz nada agora reprova a publicação"
    ] },
  { v: "8.8", itens: [
      "CHEGOU A VOZ: as salas da Estação abrem de verdade. O som vai direto de um aparelho para o outro, sem passar por servidor nenhum",
      "Canal de voz de servidor entra na sala em vez de abrir conversa, e respeita a permissão de quem pode entrar",
      "LIGAR PARA UMA PESSOA: do cartão de perfil, e o telefone dela toca na conversa de vocês com um botão ATENDER",
      "A barra da voz fica sempre no pé da lateral: onde você está, quem está com você, 🎤 para se calar, 🎧 para não ouvir e ✕ para sair",
      "A bolinha verde acende com o SOM, não com o clique — dá para ver quem está falando",
      "Sair solta o microfone de verdade: a bolinha vermelha do navegador apaga junto",
      "Em rede de escola ou empresa a ligação direta às vezes não fecha. Quando não fechar, o jogo DIZ, em vez de ficar rodando para sempre"
    ] },
  { v: "8.7", itens: [
      "ENQUETES: o ＋ da barra de escrever cria uma pergunta com até cinco respostas. Todo mundo vota ali mesmo, e o resultado aparece na hora — mas só depois de você votar, para a barra não influenciar o seu voto",
      "Dá para escolher se cabe marcar mais de uma resposta e se a enquete fecha sozinha em 1 hora, 6 horas, 1 dia ou 7 dias. Quem criou pode fechar antes no botão",
      "@everyone avisa o canal inteiro e @here só quem está com o jogo aberto agora — e valem em português: @todos e @aqui fazem a mesma coisa",
      "Chamar todo mundo é alarme, então tem dono: no servidor, quem tem a permissão; no grupo, quem é dono ou moderador; nos canais da Estação, a equipe. Quem não pode recebe um aviso na hora, em vez de a mensagem sair sem o chamado",
      "Quem silenciou o canal continua silenciado mesmo com @everyone: silêncio que o alarme fura não é silêncio",
      "EVENTOS: marque dia, hora e lugar, diga EU VOU e veja quem mais vai. O 📅 do cabeçalho abre tudo o que está marcado naquele canal",
      "O jogo lembra você quinze minutos antes do evento que você disse que ia",
      "Quem estiver numa versão antiga do jogo ainda vê a enquete e o evento como texto, em vez de ver um buraco na conversa"
    ] },
  { v: "8.6", itens: [
      "SERVIDORES: crie o seu, com canais de texto e de voz, a partir de quatro modelos — ou entre num com um código de convite",
      "CARGOS E PERMISSÕES: 50 permissões em cinco famílias (servidor, moderação, texto, voz e comunidade), com cor e emoji em cada cargo",
      "Um cargo mais alto manda no mais baixo: ninguém mexe em quem está acima, nem entrega um cargo maior que o próprio",
      "MODERAÇÃO: expulsar, banir para sempre, e castigo de 1 a 6 horas — de castigo a pessoa continua vendo tudo, mas não fala nem entra na voz",
      "REGISTRO DE AUDITORIA: quem fez o quê e quando, e ninguém apaga",
      "CONVITES com prazo (30 min a nunca vence) e limite de usos, e o histórico de banimentos",
      "IMPULSOS: o NeoNebula dá 1 impulso no Bronze, 2 no Prata e 3 no Ouro. Dois impulsos sobem o servidor para o nível 1, sete para o 2 e catorze para o 3 — cada nível abre mais espaço de emoji e figurinha",
      "TAG DO SERVIDOR: até 5 letras, custa 3 impulsos. Quem adotar leva a tag do lado do nome em toda a Estação, e quem clicar nela vê o servidor numa janelinha",
      "EMOJIS E FIGURINHAS do servidor: o jogo redesenha tudo para 128×128 antes de guardar — um emoji de 256KB vira uns 8KB, senão a lista pesaria megabytes no celular de todo mundo",
      "Configurações do servidor com 15 abas: visão geral, moderação, registro, canais, cargos, membros, convites, banimentos, emojis, figurinhas, tag, impulsos, comunidade, segurança e avisos externos"
    ] },
  { v: "8.5", itens: [
      "CHEGOU O NEONEBULA: três níveis de assinatura (Bronze R$0,50 · Prata R$1 · Ouro R$3), cada um valendo 30 dias, com entrega automática assim que o Pix cai",
      "COR E EFEITO NO NOME: escolha entre 18 cores e os efeitos Neon, Pulso, Glitch e Arco-íris — e todo mundo vê no bate-papo",
      "PERFIL DE VERDADE: banner, bio, pronomes e um selo do seu nível. Clique no seu nome em QUALQUER lugar para abrir e editar — e tem botão de salvar, nada muda sem você mandar",
      "12 FUNDOS DE PERFIL (três de graça) e 8 rastros de nave (três de graça)",
      "MENSAGENS DIRETAS ganharam lugar próprio, com quem falou por último em cima e a última frase de cada conversa",
      "ESTOU AQUI, OU NÃO: Disponível, Ausente, Não perturbe e Invisível. O Ausente entra sozinho depois de 5 minutos parado, e o Invisível deixa você jogar sem aparecer para ninguém",
      "RECADO PERSONALIZADO com emoji e hora para sumir: “🔥 jogando a maratona”, some em 1 hora",
      "NO CELULAR a sua luzinha vira um celularzinho — assim quem te chama sabe que você pode demorar",
      "SILENCIAR canal, grupo ou conversa por 15 minutos, 1 hora, 8 horas, 24 horas ou até você religar",
      "A barra dos canais ficou sólida: estava transparente demais e o nome dos canais brigava com o fundo",
      "CORRIGIDO: no celular, a aba dos canais abria e não dava para fechar de volta. Agora fecha no ✕, tocando fora ou escolhendo um canal"
    ] },
  { v: "8.4", itens: [
      "CHEGOU A ESTAÇÃO: o bate-papo de toda a comunidade, dentro do jogo. Fica em AMIGOS › Estação",
      "Três canais abertos: #geral para conversa solta, #trocas para trocar e vender, #ajuda para dúvida e dica",
      "Conversa reservada com qualquer amigo, e é a MESMA conversa da tela de amigos — o que você escreve num lugar aparece no outro",
      "GRUPOS PRIVADOS: junte os amigos que quiser, dê um nome, e quem criou pode renomear, chamar mais gente, tirar e promover moderador",
      "Chame alguém escrevendo @nome: a mensagem acende para a pessoa, e você vê na hora quando é com você",
      "Emojis, horário, divisória por dia, e a conversa carrega o que veio antes quando você rola para cima",
      "Abre no meio da partida sem pausar nada: tem um botão flutuante durante o jogo, e no computador a tecla C abre e fecha",
      "Contador de mensagens novas nos canais, nos grupos e nas conversas",
      "Dá para BLOQUEAR (some e não te chama mais), SILENCIAR (só some, e a pessoa não sabe) e DENUNCIAR uma mensagem",
      "Trava contra enxurrada: quem tenta entupir o canal é segurado",
      "As salas de voz já aparecem na lista, desligadas — a chamada vem numa próxima versão",
      "CORRIGIDO: o filtro de palavrão censurava “cuidado”, “escuro” e “curioso”. Agora ele entende disfarce (p0rra, caraaalho) e deixa palavra inocente em paz"
    ] },
  { v: "8.3", itens: [
      "O PAINEL DO DONO no computador virou um painel de verdade: menu fixo à esquerda, os números em cima e a lista de jogadores do lado das ações — escolher e agir sem a tela pular. No celular continua como estava; o dele vem depois",
      "UMA LISTA DE JOGADORES, não duas. Eram dois cartões lendo o mesmo lugar, cada um com metade da informação",
      "QUATRO NÚMEROS no topo: quem está jogando agora (com um gráfico das últimas leituras), quantos pilotos existem, quantos vieram hoje e quantos ainda estão numa versão velha",
      "DAR VIROU UM TOQUE. Antes tudo ia para uma caixa e você tinha que ir a outra abinha, escrever um recado e enviar. Agora cai na conta na hora — e o pacote com recado virou uma escolha, não um pedágio",
      "TIRAR É NA HORA e nunca mais chega como presente. Chegava embrulhado, com som de baú: a pessoa abria a caixinha para descobrir que tinha perdido as naves. Agora é um aviso seco, sem festa",
      "CATÁLOGO NOVO: dá para dar QUALQUER coisa do jogo, item a item, por categoria — as 120 naves uma a uma, as exclusivas, 88 amuletos, habilidades, melhorias, peças, passes, VIP, molduras, ranks, emotes e cristais. Com busca",
      "As molduras do apelido agora podem ser DADAS pelo painel, além de conquistadas"
    ] },
  { v: "8.2", itens: [
      "O MENU FICOU SINCRONIZADO: tudo tem a mesma cara e mora onde você imagina. Tinha gente que não achava as coisas depois que os botões foram comprimidos",
      "JOGAR agora reúne TODOS os jeitos de jogar num lugar só: Jornada, Jogar com amigo, Ranqueada, Arena infinita, Maratona de chefes e Sala de treino",
      "Antes, “jogar com amigo” ficava numa porta chamada COM AMIGOS junto de “conversar com amigos” — duas coisas bem diferentes com o mesmo nome. Agora quem quer jogar aperta JOGAR, e pronto",
      "A porta AMIGOS ficou só com o que é de amigo mesmo: amigos, esquadrão, ranking e convidar",
      "E TEM BUSCA. Escreva “arena”, “chefe”, “duelo” ou “loja” lá em cima e a linha aparece na hora — dizendo em que porta ela mora, para da próxima vez você ir direto. Funciona sem acento e sem se importar com maiúscula",
      "A EXPLORAÇÃO ESPACIAL está guardada por enquanto, para a gente caprichar no menu primeiro. Nada foi apagado: ela volta inteira, com a cabine, o canhão e tudo"
    ] },
  { v: "8.1", itens: [
      "LIGAR A NAVE virou um toque. Antes eram dez chaves na ordem certa, e cada erro mandava um “antes de MOTORES, ligue BOMBAS”. Agora a nave já entra ligada, e o botão PARTIDA liga ou desliga tudo de uma vez",
      "Apertar uma chave solta acende sozinho o que ela precisa. A ordem é problema da nave, não seu — as dez chaves continuam ali para quem gosta do ritual",
      "OS RECADOS PARARAM DE TAPAR A JANELA: no máximo três, e cada um vive cinco segundos. Trocar a câmera, ligar o radar ou frear não mandam recado nenhum — o botão acende, a imagem muda, já se vê",
      "SETINHA EM CADA PAINEL: um toque no ▾ recolhe o painel até uma barrinha, e a cabine aparece inteira. Outro toque devolve os botões",
      "BOTÃO DE AÇÕES no canto de cima à direita: fechado é um raio pequeno; aberto, sete botões grandes com CANHÃO, MÍSSIL, MEGA BOOST, TURBO, ESCUDO+, ALVO e EMERGÊNCIA — o que se aperta com pressa, perto do polegar",
      "AGORA DÁ PARA ATIRAR. Os piratas atiravam desde o começo e você só podia fugir. O canhão acerta o que estiver na mira e recarrega rápido; o míssil perdoa mira torta, machuca três vezes mais e demora para voltar",
      "MEGA BOOST: empurra 3,6× por sete segundos e cobra caro no combustível. É a carta de fuga quando o casco está indo",
      "Os tiros aparecem — os seus e os deles. E o painel de cima ganhou ABATES, a conta de quantas naves você derrubou",
      "Apertar um botão não mexe mais no acelerador. O CANHÃO fica na metade direita da tela, que era a zona do acelerador: a nave acelerava sozinha a cada tiro"
    ] },
  { v: "8.0", itens: [
      "CORRIGIDO (grave): o celular não virava na EXPLORAÇÃO. A culpa era minha — o jogo estava trancado em retrato no manifesto, então o atalho da tela inicial nunca girava e o aviso “vire o aparelho” virava uma parede: o modo ficava inalcançável",
      "Agora só a exploração pede paisagem, e ela devolve o retrato ao sair. Os outros modos continuam em pé como sempre foram",
      "E o aviso deixou de ser parede: se o aparelho não virar em alguns segundos, ele explica onde fica a trava de rotação (no iPhone, arrastar do canto superior direito e desligar o cadeado) e oferece CONTINUAR EM PÉ",
      "Jogando em pé, a cabine se reorganiza: um painel de cada vez, na largura toda, com um seletor SISTEMAS · VOO · NAVE. Nada fica pequeno demais nem sai da tela — só aparece menos de cada vez",
      "Girando o aparelho depois, ela volta sozinha para os três painéis lado a lado",
      "Honesto sobre o iPhone: a Apple não deixa página nenhuma virar a tela sozinha. Se a sua rotação estiver travada, quem resolve é o cadeado do sistema — e é por isso que o aviso ensina onde ele fica, em vez de só mandar girar"
    ] },
  { v: "7.9", itens: [
      "EXPLORAÇÃO: a interface foi refeita inteira. Estava apertada — 49 botões minúsculos espremidos numa faixa colada no rodapé, parecendo planilha em vez de cabine",
      "Os botões ficaram GRANDES, com ícone, rótulo legível e uma luzinha de estado. Nenhum encosta no outro",
      "Os três painéis agora têm espaço de verdade entre eles e não colam nas bordas. E é justamente nesses vãos que o manche e os aceleradores aparecem — o espaço vazio não é sobra, é onde a cabine se mostra",
      "ABAS em vez de amontoado: VOO tem PRINCIPAL e AUXILIAR, NAVE tem GERAL, AVANÇADO e CÂMERAS. O que não se usa sempre sai da frente sem sumir do jogo",
      "Os painéis SE MEDEM: a altura da sua tela decide quantas linhas cabem, e o que não couber vira página com um passador ‹ 1/2 ›. Em tela menor aparecem MENOS botões — nunca botões menores",
      "As colunas também se medem pela largura, para o rótulo nunca cortar",
      "A CABINE GANHOU A TELA: os painéis ocupavam 70% da altura, agora ocupam 37%. Dá para ver o vidro, o espaço, os planetas e o console",
      "O HUD de voo virou uma faixa no topo, separada dos controles físicos: informação de um lado, botão do outro",
      "Cada câmera tem botão próprio agora (COCKPIT, FRONT, REAR, SIDE) em vez de um só que ciclava",
      "O acelerador virou um controle com área própria, maior, do lado da mão direita",
      "Nada de funcionalidade mudou: os 53 controles continuam existindo e todos continuam alcançáveis"
    ] },
  { v: "7.8", itens: [
      "EXPLORAÇÃO ESPACIAL substitui o modo de luta em 3D. Mesma porta no menu (MINHA NAVE), experiência nova: agora você pilota uma nave e explora o espaço, em vez de atirar em caças",
      "A NAVE COMEÇA DESLIGADA. Você liga em ordem: bateria, energia, computadores, navegação, combustível, bombas, comunicação, motores, estabilizadores e controles. Apertar fora de ordem não pune — a nave explica o que falta antes",
      "49 CONTROLES QUE FAZEM ALGUMA COISA, em três painéis: SISTEMAS, VOO e NAVE. Radar, scanner, sensores, escudo, mapa estelar, hiperpropulsão, atracar, pousar, decolar, autopiloto, turbo, freio, retro, oxigênio, gravidade, temperatura, diagnóstico, reparo, câmeras, farol, transmitir e mais",
      "OITO SISTEMAS SOLARES gerados por semente: estrela, planetas em órbita de verdade, luas girando, asteroides e, em alguns, uma estação para atracar (que enche o tanque e conserta a nave)",
      "OITO TIPOS DE PLANETA — rochoso, desértico, oceânico, congelado, vulcânico, com vegetação, alienígena e com tempestades. Escaneie para descobrir temperatura, gravidade, água e o que há de interessante lá",
      "HIPERPROPULSÃO com a sequência inteira: DESTINO, CÁLCULO, VERIFICAÇÃO, CARREGANDO, SALTO e CHEGADA — e as estrelas se esticam no salto",
      "ALIENÍGENAS com jeitos diferentes: pacíficos, comerciantes, exploradores, piratas e misteriosos. Eles falam com você pelo rádio; os piratas atiram",
      "COMBUSTÍVEL, ENERGIA, ESCUDO, CASCO, OXIGÊNIO E TEMPERATURA de verdade: cada sistema ligado consome, e quando o combustível acaba os motores apagam",
      "AVARIAS por sistema (motor, energia, escudos, sensores, comunicação, navegação, casco) que atrapalham mesmo — motor avariado puxa a nave para o lado. Dá para diagnosticar e reparar",
      "ACONTECIMENTOS: tempestade solar, chuva de micrometeoros, sinal misterioso, destroços, campo gravitacional, anomalia, sobrecarga e nave abandonada",
      "COMBUSTÍVEL INFINITO é uma opção: o botão FUEL MODE alterna entre normal e infinito, e vale só neste modo",
      "QUATRO CÂMERAS: cabine, externa frontal, externa traseira e lateral",
      "O MANCHE E OS DOIS ACELERADORES aparecem na cabine e se mexem: o manche com o seu dedo, os aceleradores conforme a potência",
      "PEDE O CELULAR DEITADO: a cabine tem três painéis lado a lado e em pé não cabe. O aviso mostra o aparelho girando e some sozinho quando você vira — e volta se você virar de novo. Isso vale SÓ neste modo; o resto do jogo continua em pé",
      "No computador: W e S para potência, C troca a câmera, T trava alvo, R escaneia, M abre o mapa e H salta",
      "Nada do resto do jogo mudou: fases, naves, loja, amigos, ranking e progressão continuam exatamente como estavam"
    ] },
  { v: "7.7", itens: [
      "CORRIGIDO (grave): o botão AJUSTES sumia do menu para quem tinha VIP perto de vencer. Desde a v7.4 o menu não rola, e o cartão a mais empurrava os botões para fora da tela — onde eram cortados em silêncio. Agora o menu se mede depois de desenhar: se não couber, ele guarda os cartões opcionais (que continuam nas portas PROGRESSO e LOJA), e se mesmo assim não couber ele volta a rolar. Botão fora do alcance do dedo nunca mais",
      "CABINE — ACERTAR FICOU POSSÍVEL: são 4 caças em vez de 7, nascem mais perto e na sua frente, o alvo do tiro é do tamanho da nave (não de um ponto) e eles atiram bem menos",
      "OS TIROS INIMIGOS DÁ PARA VER CHEGANDO: cada tiro agora é um núcleo forte com um rastro atrás, e voa mais devagar — dá tempo de desviar",
      "PAINEL DE HABILIDADES na cabine, com cinco: MIRA (os tiros perseguem o alvo travado), TRIPLO (três canos em leque), ESCUDO (nada te acerta), LENTO (o mundo anda devagar, o seu manche não) e ULT (queima tudo na sua frente)",
      "A MIRA é interruptor, não gasta e não recarrega: quem quer treinar pontaria deixa desligada, quem só quer voar e ver explosão liga. Com ela, um quadradinho verde mostra o alvo travado",
      "O MANCHE AGORA EXISTE DENTRO DA CABINE e se mexe junto com o seu dedo — com punho, gatilho vermelho e dois botões acesos",
      "CABINE MUITO MAIS VIVA: radar com cursor girando, escada de energia, 22 botões piscando em quatro ritmos, seis chavinhas, luzinhas no teto, costelas nos montantes e duas luzes de alerta que acendem sozinhas quando o casco cai de 40%",
      "OS CAÇAS INIMIGOS foram refeitos: bolha do piloto, asas em duas partes com aleta na ponta, canhões nas asas e chama nos motores",
      "Faíscas quando o tiro acerta, e uma chuva delas quando a nave explode",
      "O jogo 2D não mudou em nada: a conta de inimigos da cabine é outra, num arquivo separado"
    ] },
  { v: "7.6", itens: [
      "CABINE — PRIMEIRA PESSOA (começo): em MINHA NAVE tem uma linha nova, “Cabine · primeira pessoa”. Você pilota por dentro da nave, em 3D de verdade",
      "O manche é um dedo em qualquer lugar da tela: ele nasce onde você encostar, vai para qualquer direção (não só reto para os lados) e a nave inclina para dentro da curva sozinha. Solte e ela endireita",
      "Por dentro tem a moldura do vidro, o painel com os botões piscando, as duas telinhas e a ponta do manche. Lá fora, a nebulosa ao fundo, poeira riscando conforme você vira, e caças que giram para mirar em você e atiram",
      "Os botões de habilidade ficam menores na cabine, para não tapar o vidro",
      "É um COMEÇO e está honesto sobre isso: as habilidades ainda só acendem, as suas 120 naves ainda não estão em 3D e os chefes também não. O jogo normal continua igualzinho — a cabine é uma porta a mais, não uma troca",
      "Feito em WebGL escrito à mão, sem biblioteca nenhuma: o jogo continua sendo um arquivo só que funciona sem internet. Quem nunca abrir a cabine não paga nada por ela"
    ] },
  { v: "7.5", itens: [
      "CORRIGIDO: quem tem VIP não ficava dourado no ranking. O ranking já sabia desenhar o nome dourado com a coroa, mas o jogo nunca mandava para a nuvem quem era VIP — o desenho esperava uma informação que ninguém enviava. Agora quem paga aparece dourado para todo mundo",
      "CORRIGIDO: a moldura do apelido não decorava nada. Dava para escolher no perfil e ela ficava salva, mas não era usada em lugar nenhum: nem no seu nome no menu, nem no perfil, nem no ranking. Agora a moldura escolhida aparece nos três, e também para os outros jogadores",
      "As nove molduras continuam as mesmas (Bronze, Prata, Ouro, Caçador, Constelação, Duelista, Renascido, Criador) — o que mudou é que agora elas aparecem de verdade"
    ] },
  { v: "7.4", itens: [
      "O MENU CABE NA TELA: acabou a rolagem. Antes o conteúdo do menu dava mais de 1000 pixels numa tela de 568, e quem tinha celular pequeno via metade e precisava arrastar para achar o resto dos botões",
      "Os botões agora são do tamanho da sua tela. As quatro portas dividem entre si o espaço que sobra: em celular grande ficam folgadas, em pequeno encolhem juntas — e nunca abaixo de 44 pixels, que é o mínimo para o dedo acertar",
      "O cartão do piloto, os números, o presente do dia e o JOGAR também encolhem junto, em vez de empurrar o resto para fora da tela",
      "Em tela muito baixa (celular deitado, aparelho antigo) o que é enfeite sai primeiro para o que serve continuar cabendo",
      "CORRIGIDO: o resumo de missões e o \u201cfalta pouco\u201d continuavam desenhando no menu por cima do HOJE, repetindo a mesma informação e ocupando 131 pixels à toa desde a v7.0"
    ] },
  { v: "7.3", itens: [
      "O jogo está sendo preparado para a App Store e a Google Play. A versão que vier dessas lojas não vai ter a loja de dinheiro: a Apple e o Google exigem que compra dentro do app passe pelo pagamento deles, e a nossa é por Pix",
      "Nada do jogo muda por causa disso: cristais, naves, melhorias, fases e tudo o que se ganha jogando continuam iguais nas duas versões. A loja por Pix segue existindo aqui na web",
      "A política de privacidade foi reescrita para dizer a verdade sobre a parte online: o que sai do aparelho (apelido, progresso, conversas, denúncias), o que nunca sai, e como pedir para apagar tudo"
    ] },
  { v: "7.2", itens: [
      "AJUSTES agora tem um cartão VERSÃO: mostra em que versão você está, procura atualização na hora e tem o botão BAIXAR TUDO DE NOVO",
      "Isso é para quem joga pelo atalho da tela inicial. O celular guarda a página do atalho num canto separado do navegador e pode ficar entregando a mesma cópia por semanas — o botão joga esse guardado fora e pega a página do zero",
      "O seu progresso não fica nessa cópia guardada: ele fica na sua conta e na nuvem. Baixar tudo de novo não apaga nada do que você conquistou"
    ] },
  { v: "7.1", itens: [
      "CORRIGIDO (grave): o jogo não avisava que tinha saído versão nova e ficava preso na cópia velha para sempre. O aviso só olhava um arquivo (versao.json) que existe no repositório mas NÃO existe no link do jogo — lá a busca falhava e o jogo desistia calado. Dava para ficar várias versões atrás sem nunca ser avisado",
      "Agora o jogo pergunta para ele mesmo: pede o pedacinho final da própria página no servidor, lê o número da versão de lá e compara com a que está rodando. Não depende de arquivo nenhum, funciona em qualquer lugar, e são uns 40 KB em vez dos 3 MB da página inteira",
      "Quando acha versão nova, ele mostra o portão de sempre: limpa o cache, desliga o service worker e recarrega furando o cache. Depois de duas tentativas sem sucesso ele destrava e deixa você entrar assim mesmo",
      "O botão MANDAR TODO MUNDO ATUALIZAR, no painel, mandava a versão do próprio painel. Como o dono costuma ser o último a receber a atualização, a ordem nascia sem efeito (“atualize para a 6.5” para quem já estava na 6.5). Agora ela leva a versão que está no servidor"
    ] },
  { v: "7.0", itens: [
      "CORRIGIDO (grave): na MARATONA DE CHEFES, derrotar um chefe deixava a tela preta e o jogo parecia ter travado. Ele não travava: a vitória já tinha posto o jogo no modo “fim de fase” antes de voltar para a luta, então o jogo ficava rodando atrás de uma tela que ninguém mandou aparecer. Agora a maratona volta direto para o combate, com o painel no lugar, e quando os 5 chefes caem aparece uma tela de vitória de verdade com os pontos e o prêmio",
      "Conferi também os chefes de fora da maratona (fases 10, 20, 40, 80 e 120, os quatro tipos): todos terminavam certo, o problema era só da maratona. Tem um teste novo que derrota chefe de verdade e confere isso",
      "MENU COMPRIMIDO: eram 19 botões numa tela só. Agora são JOGAR e quatro portas grandes — MINHA NAVE, COM AMIGOS, PROGRESSO e LOJA. Nada sumiu: cada porta abre uma lista de linhas grandes com ícone, nome e uma frase dizendo o que é",
      "Cada porta mostra na hora o que está pedindo atenção: pontos de habilidade para gastar, pedido de amizade esperando, missão ou conquista pronta para pegar",
      "O que era três cartõezinhos soltos no menu (missões, falta pouco) virou uma linha só de HOJE",
      "A LOJA é a única porta que abre direto, porque tem uma coisa só dentro"
    ] },
  { v: "6.9", itens: [
      "ABERTURA: na primeiríssima vez que o jogo abre, uma apresentação de 4 segundos com a nave e o nome. Depois disso nunca mais aparece",
      "O FUNDO TEM FUNDO: manchas de nebulosa em três profundidades andando mais devagar que as estrelas. No modo leve elas nem são desenhadas",
      "MÚSICA POR BIOMA: cada faixa de 45 fases tem escala, andamento e timbre próprios — Nebulosa Azul, Campo de Asteroides, Colmeia Alienígena, Cinzas de Guerra, Vazio Profundo e Coração da Nebulosa. O nome do bioma aparece no cartão da fase",
      "CADA NAVE TEM UMA VIRTUDE que vale sem apertar nada: Casco Vivo, Bote, Garimpo, Anteparo, Leveza, Ritmo, Sorte e Teimosia. Aparece no hangar",
      "CHEFE DE DUPLA: a cada 40 fases no cooperativo o chefe fecha uma casca que só abre quando os DOIS acertam ao mesmo tempo",
      "PLACAR AO VIVO DA ARENA: os três primeiros aparecem no canto durante a partida, e o seu nome fica marcado",
      "FIM DE SEMANA NA ARENA: sábado e domingo a arena muda de regra sozinha — dano em dobro, sem escudo, enxame ou chuva de cristal",
      "SALA DE ESPERA: agora mostra o que o outro está fazendo (escolhendo nave, comprando melhoria, pronto) em vez de só “esperando”",
      "REEMBOLSOS no painel, com motivo, valor e total",
      "CORRIGIDO: tocar num piloto da lista da nuvem que tinha acabado de sair do ar quebrava a tela inteira do painel. Agora só avisa e segue",
      "CORRIGIDO (achado com dados): a 3ª estrela — passar a fase rápido — era IMPOSSÍVEL da fase 25 em diante. O alvo de tempo crescia devagar demais para o tamanho que a fase ganhava. Agora o alvo nasce do número de ondas da fase, então continua exigindo jogar rápido sem exigir o impossível. Tem um testes/curvas.py que põe a economia e a dificuldade numa tabela, e um teste que confere isso nas 270 fases"
    ] },
  { v: "6.8", itens: [
      "SALA DE TREINO (no hangar): alvos que voltam sozinhos, nada te machuca e o cronômetro corre — é onde se aprende a habilidade nova sem morrer tentando",
      "TESTAR A NAVE ANTES DE COMPRAR: a sala de treino aceita qualquer nave, e quando você sai a sua volta como estava",
      "COMBINAÇÕES DE HABILIDADES: duas habilidades usadas em menos de 1,6 segundo viram outra coisa — ONDA DE CHOQUE, CHUVA PARADA, FORTALEZA e ENXAME EXPLOSIVO. O perfil mostra as que você já descobriu e esconde as outras atrás de ? ? ?",
      "INIMIGOS QUE REAGEM: eles saem da linha do seu tiro em vez de virem em linha reta. Quanto mais alta a fase, melhor desviam — na fase 2 quase não desviam, na 120 desviam de verdade",
      "RETRATO DO CHEFE: quando ele entra, aparece um cartão com o nome e uma frase dele",
      "SAIR NO MEIO DA RANQUEADA TEM PREÇO: perde pontos de rank e fica alguns minutos fora da fila, crescendo a cada vez. Sem isso, quem está perdendo simplesmente fecha o jogo e o modo morre",
      "ORGANIZAÇÃO: o jogo virou uma pasta fonte/ com 22 pedaços de tamanho humano, montados num index.html só na hora de publicar. A conferência recusa publicar se os dois estiverem desencontrados"
    ] },
  { v: "6.7", itens: [
      "FASE DE FUGA (as terminadas em 3, da 13 em diante): a tela vira uma corrida de asteroides e o desafio é sobreviver 42 segundos sem bater — não tem inimigo para matar, só desvio",
      "FASE DE RESGATE (as terminadas em 7, da 27 em diante): uma nave aliada atravessa a tela devagar e não sabe se defender. Se ela cair, a fase acaba; se pousar, +350 cristais",
      "MAPA DA JORNADA: as 270 fases em blocos de dez, com ícone dizendo o que te espera em cada uma (☠ chefe, » fuga, ✚ resgate, ⚡ regra maluca) e as estrelas que você já pegou",
      "ESQUADRÕES: crie o seu com um nome, chame os amigos por um código e vejam as fases e as vitórias de todo mundo somadas numa lista só",
      "AJUSTADO: a regra maluca caía justo nas fases de chefe (que são de 5 em 5), empilhando duas coisas difíceis. Agora ela mora nas fases terminadas em 8"
    ] },
  { v: "6.6", itens: [
      "INGLÊS E ESPANHOL: o jogo inteiro muda de idioma nos AJUSTES. Na primeira vez ele já abre no idioma do seu celular",
      "São 360 frases traduzidas mais 19 moldes para as frases com número (“Fase 30 de 270” vira “Level 30 of 270”), cobrindo menu, fases, hangar, loja, missões, conquistas, perfil, multijogador, ranqueada, ajustes e as telas de fim",
      "O que ainda não foi traduzido continua aparecendo em português, em vez de sumir — e traduzir mais é só acrescentar uma linha na tabela",
      "Telas montadas na hora (missões, conquistas, loja) também são traduzidas assim que aparecem, sem precisar reabrir"
    ] },
  { v: "6.5", itens: [
      "A TRILHA SENTE O JOGO: a música cresce quando o chefe entra e em fúria, e recua quando você está quase morrendo",
      "TELA DE TROCA DE FASE com o nome da fase e uma dica de quem já jogou muito — 12 dicas diferentes",
      "RESUMO ANIMADO NA VITÓRIA: tempo, maior combo, precisão e quantas vezes você levou dano, subindo número por número",
      "MOLDURAS DO APELIDO: 9 molduras que você desbloqueia jogando (Bronze, Prata, Ouro, Caçador, Constelação, Duelista, Renascido) e escolhe no perfil",
      "COMPRAR PARA UM AMIGO: escreve o nick dele e o item vai para a conta dele, com aviso para os dois",
      "OFERTA DE ESTREIA: nas primeiras 24 horas de conta, VIP de 7 dias pela metade do preço, uma vez só",
      "AVISO DE VIP ACABANDO 3 dias antes, com o botão de renovar do lado",
      "COMPROVANTE DO PEDIDO e possibilidade de cancelar o que você desistiu",
      "SAVE EM DOIS LUGARES: além do armazenamento do site, o progresso vai para o banco do aparelho. Se o celular limpar os dados do site, o jogo devolve o save sozinho — e quando os dois brigam, vence o que tem MAIS progresso, não o mais recente (relógio de celular erra)",
      "ECONOMIA DE BATERIA: abaixo de 20% e fora da tomada, o jogo liga o modo leve sozinho",
      "AVISO DE PEDIDO PAGO para o dono: toca, vibra e mostra a faixa quando alguém diz que pagou",
      "TESTAR ANTES DE LIBERAR: dá para marcar uma versão como em teste e dizer quais contas veem",
      "TESTES AUTOMÁTICOS: o jogo agora tem uma pasta testes/ com 86 testes que abrem o jogo de verdade num navegador. Um comando só (./testar.sh) roda tudo e diz o que quebrou"
    ] },
  { v: "6.4", itens: [
      "TEMPORADAS NA RANQUEADA: cada mês é uma temporada. No fim, quem passou de Prata leva prêmio em cristais (800, 2.000 ou 4.000) e o elo encolhe para 45% em vez de zerar. O histórico das temporadas fica guardado",
      "FILA QUE ALARGA: a ranqueada começa procurando gente do seu nível e vai aceitando cada vez mais longe (150 → 350 → 700 → 1400 → qualquer um depois de 70s), para ninguém ficar preso esperando",
      "ANTI-TRAPAÇA: o jogo confere o resultado que veio do outro aparelho e, se for impossível (pontos ou abates rápidos demais, fase curta demais, elo fora do normal), a partida não conta e a suspeita vai para o painel",
      "DENUNCIAR E BLOQUEAR jogador: a denúncia cai no painel e quem você bloqueia não aparece mais na sua fila",
      "FILTRO DE NOME: ninguém mais consegue se chamar “Admin”, “Moderador” ou usar palavrão no nome. No chat, o palavrão vira ••• em vez de travar a conversa",
      "HISTÓRICO DAS PARTIDAS: as últimas 30 ranqueadas, com quem, resultado e quanto de elo",
      "CÓDIGO DE RECUPERAÇÃO: esqueceu o desenho da senha? Nos AJUSTES tem um código de 8 letras que destrava a conta, e na tela de entrada tem o botão ESQUECI O DESENHO DA SENHA",
      "PAINEL — NÚMEROS DO JOGO: quantos pilotos existem, quantos vieram hoje e na semana, a fase média, onde a maioria parou e quem ainda está na versão velha",
      "PAINEL — ERROS DOS JOGADORES: quando o jogo quebra no celular de alguém, o erro sobe (sem nada pessoal) e aparece agrupado por mensagem",
      "PAINEL — MANUTENÇÃO: um botão tira todo mundo do jogo com um recado, menos você, para publicar coisa grande em paz",
      "PAINEL — O QUE A EQUIPE FEZ: cada ação importante fica anotada com o nick de quem fez"
    ] },
  { v: "6.3", itens: [
      "REGRAS MALUCAS: toda fase terminada em 5 tem uma regra diferente — GRAVIDADE, APAGÃO (só enxerga perto da nave), TURBO, VIDRO (um toque e acabou, mas paga o dobro), ENXAME, CHUMBO, REBOTE e CINTURÃO. A regra é sempre a mesma para a mesma fase, e paga de 30% a 100% a mais",
      "ASTEROIDES: pedras que dá para quebrar a tiro, bloqueiam o seu tiro e as grandes soltam cristal",
      "MARATONA DE CHEFES: botão novo no menu — 5 chefes seguidos, sem ondas no meio, ganhando 35% de casco de volta entre um e outro. Tem recorde próprio",
      "SALA SECRETA: de vez em quando um portal abre no fim de uma onda; entrar leva a 18 segundos só de cristais",
      "COOPERATIVO — RECONECTAR: se a internet cair, o jogo avisa e tenta voltar sozinho por 30 segundos, em vez de derrubar a partida",
      "PING DO PARCEIRO no alto da tela, dizendo se está indo pela rede direta ou pela nuvem",
      "REVIVER O PARCEIRO: chegou perto de quem caiu e segurou 2,5 segundos, ele volta com 60% de casco",
      "EMOTES: seis botões rápidos (👍 ⚠ 🫵 🔥 🆘 😂) para conversar sem teclado",
      "CONVITE POR LINK: manda um link no WhatsApp e o amigo entra direto na sua sala, sem digitar código",
      "REVANCHE num toque no fim do duelo, e a lista de quem você jogou junto há pouco, com botão de adicionar como amigo"
    ] },
  { v: "6.2", itens: [
      "FUNDIR RELÍQUIAS: três repetidas iguais viram uma da raridade de cima, direto na tela de relíquias. O que está equipado não entra na fusão",
      "CONJUNTOS: três espaços no hangar guardam nave + relíquias + arma, e você troca tudo num toque",
      "COMPARAR TODAS AS NAVES: uma tabela com as 120, que dá para ordenar por dano, vida ou cadência, pintando de verde o que é melhor que a sua e de vermelho o que é pior",
      "O QUE SAIU DOS ÚLTIMOS BAÚS: histórico das últimas 12 relíquias com o resumo por raridade — nada de achar que o baú está roubando",
      "FALTA POUCO: o menu mostra as três coisas mais perto de acontecer (a nave que você quase pode comprar, a conquista que está quase lá)",
      "REFAZER A ÁRVORE: pagando cristais, todos os pontos de habilidade voltam e você escolhe tudo de novo",
      "PULAR A FASE: depois de cair 5 vezes seguidas na mesma fase, aparece a opção de pular pagando cristais — ninguém larga o jogo por causa de um muro",
      "PRESTÍGIO: terminou as 270? Dá para recomeçar a jornada guardando naves, relíquias e conquistas, e ganhar +10% de dano e de cristais PARA SEMPRE a cada volta, mais 5.000 cristais"
    ] },
  { v: "6.1", itens: [
      "TUTORIAL na primeira fase: quatro passos curtos que ensinam a pilotar, entender que a nave atira sozinha, desviar dos tiros rosa e usar a ultimate. Quem já jogou não vê",
      "CADA FASE TEM NOME: um cartão aparece no começo com o nome da fase e uma linha dizendo o que ela tem de perigoso",
      "CONQUISTAS: 25 medalhas com prêmio em cristais — de passar a fase 1 até derrubar 10.000 inimigos, juntar 100 estrelas ou ganhar 25 ranqueadas",
      "PERFIL DO PILOTO (o 👤 no cartão do menu): fase, estrelas, abates, chefes, melhor combo, tempo de voo, precisão dos tiros, fases sem levar dano e mais",
      "CONVIDAR AMIGO: você tem um código; quem entrar com ele ganha 500 cristais e você ganha 800, sem limite de amigos. O convite também vira link para mandar no WhatsApp",
      "FOTO DA PARTIDA: um botão na tela de vitória desenha um cartão com o seu resultado e o seu código, para mandar para os amigos",
      "COMBATE MAIS GOSTOSO: barra do chefe dividida em 3 partes, linha vermelha meio segundo antes do tiro do chefe, destroços girando quando a nave quebra, câmera lenta quando o chefe cai, borda vermelha e tremida ao levar dano, som diferente para cada tipo de inimigo e um toque quando a habilidade fica pronta"
    ] },
  { v: "6.0", itens: [
      "PRESENTE DO DIA: entrou, ganhou. São 7 dias em sequência, de 120 até 1.800 cristais mais um amuleto no dia 7. Faltou um dia, a sequência recomeça",
      "MISSÕES DO DIA: três por dia, iguais para todo mundo, trocando à meia-noite — derrubar inimigos, passar fases, matar chefe, fazer combo, jogar no cooperativo. Cada uma paga cristais",
      "ESTRELAS EM CADA FASE: 1 por passar, 2 se não levar nenhum dano, 3 se for rápido. Aparecem na tela de vitória e na lista de fases, e cada estrela nova paga 40 cristais",
      "COMBO: abates seguidos valem mais pontos, até +100%. O contador aparece no alto da tela e zera quando você toma dano",
      "TELA DE AJUSTES (⚙ no menu): volume da música e dos efeitos separados, sensibilidade do dedo, vibração, modo canhoto, modo daltônico, menos flashes e contador de quadros por segundo",
      "Tudo isso fica guardado no aparelho e vai junto para a nuvem"
    ] },
  { v: "5.9.2", itens: [
      "PRIVACIDADE DO PIX: a chave não fica mais dentro do jogo. Ela vive só no painel (LOJA → DADOS DO PIX) e na nuvem — quem baixa o arquivo do jogo não encontra nada",
      "Na tela de pagamento a chave aparece tapada (123.•••.•••-09) e o nome como no banco (Teste D. J.). Quem for pagar toca em COPIAR CHAVE (copia inteira) ou em MOSTRAR quando quiser conferir",
      "O código copia e cola também aparece tapado, e o COPIAR CÓDIGO PIX continua copiando ele inteirinho e certo",
      "Ao fechar a tela a chave volta a ficar escondida, então print e gravação de tela não vazam nada sem querer",
      "Se o Pix ainda não estiver ligado, quem tocar em COMPRAR vê um aviso e vai direto para o chat com o desenvolvedor, em vez de ver uma tela quebrada",
      "Dica no painel: dá para usar uma CHAVE ALEATÓRIA do banco em vez do CPF — recebe igual e não mostra nada sobre você"
    ] },
  { v: "5.9.1", itens: [
      "CORRIGIDO: o cabeçalho das telas (loja, hangar, ranking, painel, novidades…) estava por baixo do relógio e da bateria do celular, e a setinha de voltar ficava meio escondida. A pele nova da 5.8 tinha apagado o espaço da barra de status — agora todas as telas descem o quanto o aparelho pede",
      "Mesmo em celular que não avisa o tamanho do recorte (e no jogo instalado na tela inicial), agora sempre sobra um espaço mínimo em cima, então nada mais encosta na barra do sistema",
      "Menu um pouco menor: título, cartão do piloto, ladrilhos e botões mais compactos — cabe mais coisa na tela sem precisar rolar tanto"
    ] },
  { v: "5.9", itens: [
      "COMPRAR AGORA É PELO PIX: ao clicar em COMPRAR abre uma tela com a chave Pix, o nome do destinatário, o valor e o código copia-e-cola já pronto com o valor certo",
      "Botões de copiar a chave e copiar o código, para não errar digitando",
      "Depois de pagar é só tocar em JÁ PAGUEI: aparece \"Esperando o desenvolvedor te responder — leva em torno de 30 minutos a 1 hora\", e o pedido some da espera sozinho assim que for entregue (na hora, sem recarregar)",
      "ENVIAR PASS: aba nova no painel (LOJA) para procurar qualquer conta pelo nome e mandar VIP, passe, nave ou cristais na hora, sem depender de pedido",
      "Na aba PEDIDOS quem já pagou fica em cima, com o selo JÁ PAGOU e o nome da conta que comprou — um toque em ENTREGAR já solta o item e avisa o jogador",
      "DADOS DO PIX no painel: dá para trocar a chave, o tipo, o nome e a cidade do destinatário sem mexer no jogo — vale para todo mundo na hora",
      "MEUS PEDIDOS mostra em que pé está cada compra: esperando o pagamento, pago (aguardando entrega) ou entregue",
      "Aviso honesto: o jogo não consegue conferir o Pix sozinho (isso exige um servidor de pagamento). Tudo o que dá para automatizar está automatizado — o pedido, o aviso, a fila e a entrega em um toque; só a confirmação do dinheiro passa por mim"
    ] },
  { v: "5.8", itens: [
      "INTERFACE NOVA EM TUDO: vidro escuro sobre uma aurora que respira, um acento só (ciano → violeta) no jogo inteiro e o dourado guardado para o que vale dinheiro. Nada mudou no jogo — só a aparência",
      "Menu refeito: cada atalho virou uma linha com bolha de ícone, título e legenda; os números do piloto viraram uma faixa única; o nome do jogo ganhou degradê",
      "Botões com relevo de verdade (luz em cima, sombra colorida embaixo), campos com anel de foco, abas viraram pílulas deslizantes",
      "Fases, hangar, loja, ranqueada, sala, conversas, pausa e fim de fase: todos no mesmo material de vidro, com cantos mais macios",
      "HUD do jogo mais limpo: números alinhados, botões iguais, barra de vida com contorno",
      "ÍCONE NOVO do jogo: nave neon com o anel da nebulosa, legível até pequenininho",
      "Os recados técnicos (regras do Firebase, modo compatível) agora aparecem SÓ para a conta do dono; os outros jogadores veem o menu limpo",
      "CORRIGIDO: depois de colar as regras novas no Firebase, o jogo continuava no modo compatível. Agora ele reconfere sozinho de tempos em tempos, e tem o botão JÁ COLEI — CONFERIR AGORA"
    ] },
  { v: "5.7", itens: [
      "CORRIGIDO (grave): o modo online sumiu na 5.5 e na 5.6. O arquivo de configuração foi publicado com o endereço de TESTE em vez do endereço do banco de verdade — sem ele nada online aparece: nem ranking, nem arena, nem amigos, nem multijogador. O endereço certo está de volta",
      "Para não acontecer de novo: os testes não mexem mais no arquivo de configuração (agora eles apontam para o servidor de teste pela barra de endereço, e só endereço local é aceito), e tanto a conferência quanto o empacotador recusam publicar com o endereço de teste"
    ] },
  { v: "5.6", itens: [
      "MANDAR ATUALIZAR: no painel, na aba MUNDO, um botão tira todo mundo da versão velha — quem estiver atrasado limpa o cache e recarrega sozinho, quem já está na nova nem percebe",
      "O painel mostra quantos pilotos estão em cada versão, e cada jogador da lista tem o ⬇ para mandar só ele atualizar",
      "A versão de cada piloto aparece na lista: verde quem está em dia, amarelo quem está atrasado",
      "CORRIGIDO: o painel pedia a senha quase toda vez que você entrava. Sair da tela e voltar escondia o painel e mostrava a senha de novo, mesmo com você já conectado — agora volta direto",
      "O acesso do painel também fica guardado no banco do aparelho, então sobrevive quando o celular limpa o armazenamento do site sozinho"
    ] },
  { v: "5.5", itens: [
      "CORRIGIDO: adicionar amigo, o chat com os amigos e o chat comigo (o ⊙ da loja) não funcionavam para quem está com as regras antigas do Firebase — dava \"tente de novo\" e não enviava. Agora, se o Firebase recusar o galho novo, o jogo guarda a mesma coisa junto com a ficha do piloto, que toda regra antiga já libera. Funciona dos dois jeitos, sozinho",
      "CORRIGIDO: no cooperativo o inimigo que o parceiro matava continuava vivo na sua tela. A leitura de reserva (usada quando a rede não deixa o fluxo do Firebase passar) simplesmente não aplicava os abates — agora aplica, e o abate ainda sai antes da hora, sem esperar o passo da rede (medido: 103 ms pela nuvem)",
      "CORRIGIDO: no duelo e na ranqueada quem morria via a derrota e quem ganhava continuava jogando para sempre. O último pacote de posição do adversário (ainda vivo) ficava parado no servidor e ressuscitava ele a cada leitura. Agora a ficha de quem caiu vale mais que o pacote velho, e o fim chega na hora nos dois lados",
      "O jogo abre menos conexões ao mesmo tempo com o Firebase: passar do limite do navegador deixava gravações presas na fila"
    ] },
  { v: "5.4", itens: [
      "BOTÃO NOVO NO MENU: 🤝 JOGAR COM AMIGO. Não tinha botão nenhum para o multijogador — dava para chegar na jornada e no cooperativo só por dentro de outra tela",
      "MENU MUITO MAIS LEVE: fora da partida o jogo ficava rodando ATRÁS das telas, desenhando a fase inteira 60 vezes por segundo sem ninguém ver. Agora ele para de verdade — em celular fraco é a diferença entre menu travado e menu liso",
      "No modo leve o menu também desliga o céu que respira, a grade de linhas, o brilho do JOGAR e o brasão pulsando"
    ] },
  { v: "5.3", itens: [
      "ARENA MAIOR: só a arena afasta a câmera e mostra 56% mais campo — dá para ver a onda chegando de longe. Os botões encolhem junto, para não comerem a tela que você ganhou",
      "TIROS INIMIGOS NOVOS: viraram gotas de energia com rastro, miolo branco quente e fagulhas, apontando para onde vão",
      "OITO GOLPES SORTEADOS PARA OS CHEFES: teia de espinhos, chuva de praga, garras do vazio, chamado da colmeia, raio corrosivo, casca viva, bote e névoa ácida — os perigosos avisam antes, e em fúria vêm quase no dobro",
      "TODA HABILIDADE GANHOU O EFEITO DELA: retículo de mira, cruzes no chão onde a bomba cai, feixe de luz para as tropas, redemoinho, respingo, clarão e ondas de choque — dá para SABER o que aconteceu",
      "As habilidades das naves de administrador ficaram muito mais claras: a nuclear tem clarão e três ondas, as tropas descem num feixe, a artilharia marca o chão antes",
      "Naves um tico mais lentas (−8%), para mirar melhor sem perder a agilidade",
      "CORRIGIDO: no duelo você aparecia no lugar errado — cada um vê a própria nave embaixo, então o adversário agora aparece espelhado, vindo de cima",
      "CORRIGIDO: o outro jogador não via a sua ultimate nem as suas habilidades. Agora cada poder vira um clarão com o nome escrito por cima da sua nave, na hora",
      "CORRIGIDO: trocar de fase às vezes voltava pesado com a qualidade LEVE marcada, e apertar o mesmo botão não fazia nada. Agora reaplicar sempre funciona, e toda fase nova já começa com a sua escolha valendo",
      "CORRIGIDO: abrir a fila de habilidades derrubava os quadros. Ela mexia no estilo da página inteira quatro vezes por segundo; agora só quando muda de verdade, e no modo leve os botões perdem o brilho que custava caro"
    ] },
  { v: "5.2", itens: [
      "ABA JORNADA: uma campanha de 270 fases para CADA amizade. Com o amigo 1 vocês continuam de onde pararam; com o amigo 2 a jornada começa do zero, sem misturar nada",
      "Você escolhe o amigo, escolhe a fase (a próxima ou qualquer uma já vencida, para voltar e pegar cristais) e aperta CHAMAR E COMEÇAR",
      "A sala tem um número calculado pelos dois nicks: ninguém digita código, os dois caem juntos sozinhos",
      "MELHORIAS DA DUPLA: canhão, gatilho, casco, defletor, motor e garimpo, até o nível 8 — guardadas por amizade, então as do amigo 1 não valem com o amigo 2",
      "As melhorias agora valem de verdade no cooperativo: o modo justo passou a ser só do duelo e da ranqueada, onde os dois PRECISAM começar iguais",
      "CORRIGIDO: adicionar amigo não achava ninguém. O jogo procurava pelo nome EXATO — escrever em minúscula, sem acento ou com um espaço a mais já dava \"não achei\". Agora procura na lista de verdade, ignorando maiúscula, acento e espaço, e ainda acha pelo começo do nick e pela gametag"
    ] },
  { v: "5.1", itens: [
      "BICHARADA ALIENÍGENA: os inimigos deixaram de ser naves e viraram criaturas — TRÊS MODELOS DE CADA TIPO, nove ao todo, com olho de pupila fininha, dentes, tentáculos e casca com veias",
      "CHEFES MAIS DUROS: 27% mais casca e uma segunda etapa — abaixo de 35% de vida o bicho entra em FÚRIA e tudo nele fica 42% mais rápido",
      "Todo chefe ganhou pele viva: coroa de olhos que segue você, tentáculos se contorcendo atrás do corpo, boca de dentes com baba escorrendo e veias pulsando",
      "Na fúria a casca racha, o halo vermelho respira e a barra de vida avisa — com a marca de onde a fúria começa",
      "CORRIGIDO: a lista de regras do Firebase estava desatualizada. Faltavam os galhos da loja, dos amigos, das conversas, do suporte e do ao vivo — por isso aparecia \"as regras do banco estão bloqueando\"",
      "O aviso de nuvem bloqueada agora tem o botão 📋 COPIAR AS REGRAS CERTAS ali mesmo, e explica que as regras de teste do Firebase vencem em 30 dias"
    ] },
  { v: "5.0", itens: [
      "MULTIJOGADOR DE VOLTA, agora com LIGAÇÃO DIRETA: os dois celulares conversam entre si, sem servidor no meio. O atraso cai de 150–400 ms para 10–40 ms",
      "O inimigo morre na mesma hora nas duas telas: o abate sai na hora pelo canal com garantia de entrega, não espera o próximo pacote",
      "Mesma onda sempre: o anfitrião avisa a onda no instante em que ela começa, e o parceiro monta a mesma na hora",
      "Você vê os tiros da outra nave voando de verdade — eles chegam com velocidade e continuam o voo sozinhos",
      "Nave do parceiro sem tremer: interpolação com 55 ms de folga, o mesmo truque dos jogos de tiro online",
      "30 pacotes por segundo na ligação direta (antes eram 2 a 9 pela nuvem)",
      "Selinho na tela mostra se você está ⚡ DIRETO (com o ping) ou ☁ pela NUVEM",
      "Se a operadora não deixar a ligação direta, o jogo volta sozinho para a nuvem e continua jogável",
      "PÁGINA DO MULTIJOGADOR REFEITA: capas dos modos, explicação da rede e quatro abas",
      "ABA ESPECIAL DA RANQUEADA: brasão, barra para a próxima divisão, vitórias, derrotas, aproveitamento, quantos estão na fila agora e a escada das 10 divisões",
      "A ranqueada voltou ao menu também, e a busca funciona pelas duas telas"
    ] },
  { v: "4.9", itens: [
      "Na conta do dono os cristais aparecem como ∞ em vez de um número gigante — no menu, no hangar, nas melhorias, na árvore, nas relíquias, nas fases e na loja",
      "E o ∞ é de verdade: comprar não diminui nada, o saldo volta ao teto sozinho"
    ] },
  { v: "4.8", itens: [
      "A LISTA DE NOVIDADES estava parada na 3.9: agora tem tudo o que entrou da 4.0 até aqui",
      "A conta do dono (Cr1cket) entra com TUDO liberado sozinha: as 120 naves, as exclusivas, as da loja, peças e pinturas no máximo, todas as fases, a árvore inteira, os amuletos, VIP e os oito passes — e as habilidades de cada nave já no nível 10",
      "O portão de atualização deixou de poder prender alguém: se a versão nova não chegar depois de duas tentativas, aparece ENTRAR ASSIM MESMO"
    ] },
  { v: "4.7", itens: [
      "TRONO REAL: a privada voadora do administrador, com o homem sentado dentro, de coroa e jornal — e 8 habilidades de cocô, da bomba fedorenta à EXPLOSÃO INTESTINAL",
      "Todas as naves agora sobem as habilidades de nível com cristais: 10 níveis, +15% de força, −5% de recarga e +1% de dano por nível, com painel próprio no hangar",
      "ARENA EM TEMPO REAL: os tiros do outro jogador aparecem de verdade (vão com velocidade, não só com a posição) e a troca de dados ficou quase três vezes mais rápida",
      "No painel: botão para esconder qualquer jogador do placar, e para entregar a Ômega-9 e o Trono Real",
      "CORRIGIDO: as abas não deslizavam para o lado em nenhuma tela"
    ] },
  { v: "4.6", itens: [
      "A conta 7anoS entra sem senha nenhuma"
    ] },
  { v: "4.5", itens: [
      "A loja passou a ser em dinheiro de verdade, com planos a partir de R$ 0,50",
      "VIP por dias: 10, 30 ou para sempre, cada um com o seu preço",
      "Botão redondo dentro da loja para chamar o administrador e conversar na hora"
    ] },
  { v: "4.4", itens: [
      "O número da onda saiu de cima dos pontos e ganhou lugar próprio",
      "As habilidades podem ser guardadas com um toque: a tela fica livre para jogar",
      "Menos inimigos por onda, para as fases não virarem parede"
    ] },
  { v: "4.3", itens: [
      "14 SETORES com cara própria: cada área tem cor, clima e enfeites do tema dela",
      "Naves redesenhadas: casco com degradê, quilha, chapas, cabine de vidro e luzes de navegação",
      "Cada ultimate ganhou o efeito visual dela — onda, aura, domo, raios, fantasmas, gelo, garras e colmeia",
      "ABA AMIGOS: pedido de amizade, aceitar, recusar e conversa com cada um",
      "GAMETAG: o nome que os amigos veem, que dá para trocar uma vez por dia",
      "LOJA com VIP, passes e naves especiais — nenhuma mais forte que a Ômega-9"
    ] },
  { v: "4.2", itens: [
      "Otimização pesada para celular fraco, sem tirar nada do jogo: figuras desenhadas uma vez e reaproveitadas, grade de colisão e qualidade que se ajusta sozinha",
      "O jogo mede o próprio desempenho e baixa ou sobe os detalhes conforme o aparelho aguenta"
    ] },
  { v: "4.1", itens: [
      "As habilidades não saem mais da tela em nenhum celular: a fila se ajusta ao tamanho do aparelho",
      "A barra de vida ficou entre a nave e os botões, sem cobrir a nave",
      "INTERFACE INTEIRA REFEITA: senha, login, menu, todas as abas, as fases, o que aparece dentro da fase e os recados do administrador"
    ] },
  { v: "4.0", itens: [
      "PORTÃO DE ATUALIZAÇÃO: quando sai versão nova, dá para atualizar antes de entrar — e é obrigatório",
      "Mais inimigos por fase e arena maior, com mais espaço para jogar",
      "17 relíquias novas, 4 peças novas e 8 melhorias novas",
      "APOCALIPSE ÔMEGA: a habilidade infinita da nave nuclear, que liga o arsenal inteiro no automático até a fase acabar"
    ] },
  { v: "3.9", itens: [
      "Painel do administrador reorganizado em abas: Jogadores, Ações, Mundo, Sugestões, Equipe e Sistema — em vez de treze cartões numa rolagem só",
      "Dentro de AÇÕES tem abinhas próprias: DAR, TIRAR, INVENTÁRIO e CAIXA, com contador do que já está no pacote",
      "Dá para tirar alguém do painel de vez, e o jogo confere que sumiu mesmo antes de dizer que deu certo",
      "Continuar conectado: o jogo e o painel guardam quem você é neste aparelho, sem pedir senha toda hora"
    ] },
  { v: "3.8", itens: [
      "As caixinhas de permissão agora aparecem ANTES de adicionar a pessoa: dá para montar o acesso dela do zero, uma por uma",
      "CORRIGIDO: quando o Firebase recusava uma gravação, o painel dizia que tinha dado certo. Agora avisa o motivo e leva você até o teste"
    ] },
  { v: "3.7", itens: [
      "EQUIPE DO PAINEL: o dono pode dar acesso ao painel para outras pessoas, cada uma com o nick dela e uma chave própria",
      "As permissões são escolhidas uma a uma, como num servidor: o que não for liberado nem aparece na tela da pessoa",
      "Cargos prontos de um toque: Desenvolvedor, Moderador, Animador e Administrador — ou monte o seu",
      "Dá para pausar o acesso de alguém sem tirar da equipe, e trocar a chave quando quiser"
    ] },
  { v: "3.6", itens: [
      "O administrador agora escreve um RECADO dentro da caixa de presente — aparece junto com o que veio, tanto para um jogador quanto para todos",
      "PRESENTE PARA TODO MUNDO: a mesma caixa vai para todos os jogadores de uma vez, e quem criar conta depois também recebe enquanto estiver no prazo"
    ] },
  { v: "3.5", itens: [
      "CAIXA DE SUGESTÕES no fim de cada fase, junto do PRÓXIMA FASE e do MENU: escreva o que você quer ver no jogo e vai direto para quem faz",
      "Se você estiver sem internet na hora, a sugestão fica guardada e sobe sozinha depois",
      "A ranqueada e a oficina de criar naves saíram do menu por enquanto — nada foi perdido, elas voltam depois",
      "No painel: cartão com todas as sugestões, com botão de copiar tudo de uma vez"
    ] },
  { v: "3.4", itens: [
      "CORRIGIDO: a versão publicada estava sem nuvem nenhuma, então nada online funcionava nela — nem ranking, nem presentes, nem eventos, nem recados",
      "O painel ganhou um TESTE DA NUVEM que diz exatamente o que está travando e já mostra as regras prontas para copiar",
      "Quando uma gravação falha, o painel avisa em vez de dizer que deu certo"
    ] },
  { v: "3.3", itens: [
      "O administrador agora pode mandar recados que aparecem na tela de todo mundo na hora",
      "12 EVENTOS com música e decoração próprias: Natal com neve, Halloween com morcegos, Festa com confete, Chuva de Ouro, Apocalipse, Aurora, Rave Neon, Fundo do Mar, Vulcão, Código, Arco-íris e Zona de Guerra",
      "BOOSTS para todo mundo: pontos, cristais, dano, vida, cadência e sorte — com o multiplicador e as horas escolhidos na hora",
      "14 TRAVESSURAS: controle invertido, gravidade, gelo, tontura, apagão, espelho, inimigos gigantes ou minúsculos, câmera lenta, turbo, discoteca, chuva de inimigos, terremoto e nave fantasma",
      "Tudo tem hora para acabar e um selo no canto mostrando o que está valendo e quanto falta"
    ] },
  { v: "3.2", itens: [
      "O placar lá em cima parou de invadir a caixa de pontos e cristais: agora são três caixas separadas que nunca se encostam, em qualquer tamanho de tela",
      "As habilidades saíram do meio da tela e viraram uma fila em cima do botão de ultimate; se forem muitas, abre uma segunda fila ao lado"
    ] },
  { v: "3.1", itens: [
      "ÔMEGA-9 ARSENAL: a aeronave suprema, que só o administrador entrega. Não é um caça, é um posto de comando voador",
      "Ogiva nuclear que acaba com a onda inteira — sem limite, pode jogar quantas quiser",
      "Coluna de tanques, pelotão de fuzileiros e helicópteros que ficam lutando com você até o fim da fase",
      "Esquadrão de bombardeio, artilharia pesada e canhão orbital",
      "Operação Ômega: tudo isso ao mesmo tempo, numa tecla só"
    ] },
  { v: "3.0", itens: [
      "CORRIGIDO o travamento ao levar dano com a Nova de Choque: a habilidade limpava as balas no meio do laço do jogo e quebrava tudo",
      "A tela não arrasta mais: a página ficou presa e só rola onde tem de rolar",
      "Duas tabelas novas: quem chegou mais longe na ARENA e quem mais derrubou inimigos lá",
      "O cooperativo saiu do menu por enquanto (nada foi perdido, ele volta depois)",
      "No painel: botão TIRAR AGORA no inventário, que apaga o item da conta na hora e já mostra o resultado",
      "A transmissão de tela saiu do menu: agora só liga sozinha quando alguém está olhando de verdade"
    ] },
  { v: "2.9", itens: [
      "MÚSICA no jogo: cada uma das 270 fases tem a sua trilha, e os chefes têm um tema mais tenso. Dá para desligar no 🎵 do canto",
      "Cooperativo destravado: o jogo mandava 30 pedidos por segundo para a nuvem e entupia a conexão do celular. Agora vai tudo num pacote só e o ritmo se ajusta à sua internet",
      "Ranqueada agora puxa de verdade: a fila continua procurando mesmo se você voltar ao menu, e o duelo começa sozinho quando alguém aparecer",
      "Peças da oficina bem mais fracas: uma nave montada estava dando 4x o dano da melhor nave de fábrica",
      "Todas as naves montadas foram desfeitas e os cristais voltaram inteiros, para montar de novo com as regras certas"
    ] },
  { v: "2.8", itens: [
      "As contas do administrador saíram do ranking e das tabelas — a disputa agora é só entre os jogadores",
      "Naves montadas equilibradas: empilhar as peças mais caras rende cada vez menos, e peça blindada agora pesa e tira manobra. Quem quer uma fortaleza tem a fortaleza, só que ela não vai ser rápida também",
      "Mudar uma nave já montada cobra só a diferença — e devolve se ela ficar mais simples"
    ] },
  { v: "2.7", itens: [
      "CRIAR NAVE no hangar: escolha 1 de 100 formatos de casco e monte com 360 peças — nariz, cauda, portas, teto, casco de baixo, motor, armas, bombas, armamento pesado, defletor e sensor (30 de cada)",
      "Cooperativo consertado de vez: quando um derruba um inimigo, ele cai na tela dos DOIS, e agora dá para ver os tiros do parceiro",
      "Escolha FÁCIL, MÉDIO ou DIFÍCIL na tela de fases — no difícil vêm muito mais inimigos e o prêmio é bem maior",
      "As ondas ficaram mais longas e cheias conforme você avança: de 6 inimigos na fase 1 para mais de 60 lá no fim",
      "No painel: ver o inventário inteiro do jogador e tirar nave por nave, amuleto por amuleto, habilidade por habilidade, ou mexer nas melhorias"
    ] },
  { v: "2.6", itens: [
      "ARENA INFINITA: uma arena só para todo mundo, ondas sem fim, todos aliados. A onda continua de onde o último parou e o placar de inimigos e chefes derrubados soma o de todos",
      "RANQUEADA com busca de partida: o jogo acha alguém do seu nível sozinho, sem código",
      "Dá para ver a tela de quem está jogando: toque no 👁 na lista de amigos",
      "O online ficou MUITO mais rápido: o servidor agora avisa na hora em vez de o jogo ficar perguntando (20 ms em vez de meio segundo)",
      "No computador a nave segue o cursor sozinha e as habilidades saem nas teclas Q W E R T A S D F G, espaço e shift",
      "Menu novo, com a sua nave, o seu rank e a barra de progresso",
      "As novidades saíram do canto da tela e viraram esta aba",
      "Painel do administrador com a janela AO VIVO: quem está jogando agora, em que tela e com qual versão"
    ] },
  { v: "2.5", itens: [
      "Caixa de presente: o administrador manda vários itens de uma vez e você abre tudo junto",
      "O presente já entra na conta antes de você abrir a caixa — nada de bug",
      "A caixa só aparece dentro do menu, nunca por cima da tela de login",
      "Sua conta é a mesma em qualquer celular: o ranking não repete mais o seu nome",
      "Presentes chegam mesmo quando você entra de outro aparelho"
    ] },
  { v: "2.4", itens: [
      "Tela de login: entre com o nome da conta e a senha desenho",
      "A conta agora vai junto na nuvem — dá para entrar em outro celular",
      "O jogo se atualiza sozinho quando sai uma versão nova"
    ] },
  { v: "2.3", itens: [
      "Corrigido o travamento ao levar dano (naves de saves antigos)",
      "Saves com naves que não existem mais são consertados sozinhos",
      "Se algo der errado, aparece uma tela explicando em vez de travar"
    ] },
  { v: "2.2", itens: [
      "Cooperativo consertado: os dois enfrentam os MESMOS inimigos e o MESMO chefe, com o dano somado",
      "Movimento do parceiro bem mais liso (envio 4x mais rápido, com previsão)",
      "+150 fases no modo normal — agora são 270",
      "Este relatório de novidades no canto do menu"
    ] },
  { v: "2.1", itens: [
      "Inimigos que leem suas melhorias: mais defesa traz mais inimigos",
      "60 naves novas, cada uma com virtude e defeito (112 no total)",
      "10 ranks, de Bronze a Pilot Spirit",
      "Cooperativo com 200 fases próprias e tudo zerado no multijogador",
      "Painel ADM agora vale na hora, sem o jogador abrir o jogo"
    ] },
  { v: "2.0", itens: [
      "Senha desenho no login",
      "Vida própria por nave, conforme as melhorias",
      "Cooperativo e competitivo com salas por código",
      "Amigos e cinco tabelas de classificação"
    ] },
  { v: "1.7", itens: [
      "Maverick e B-2 Spirit, aeronaves exclusivas do administrador",
      "Buraco negro e Super Nova",
      "6 chefes diferentes"
    ] }
];
function renderNovidades() {
  const cx = $("nov-lista");
  if (!cx) return;
  $("nov-versao").textContent = "v" + VERSAO;
  cx.innerHTML = NOVIDADES.map((n, i) =>
    '<div class="nov-item' + (i === 0 ? " novo" : "") + '"><b>v' + n.v +
    (i === 0 ? '<span class="nov-selo">AGORA</span>' : "") + "</b><ul>" +
    n.itens.map(t => "<li>" + t + "</li>").join("") + "</ul></div>").join("");
}
/* marca no menu quando ainda não leram a versão nova */
function novidadesNovas() { return storageGet("nn_leu_versao", "") !== VERSAO; }
function abrirNovidades() {
  storageSet("nn_leu_versao", VERSAO);
  renderNovidades();
  S.mode = "novidades";
  showScreen("novidades");
  refreshMenu();
}

/* ---------- Versão do jogo ---------- */
const VERSAO = "9.0";
(function mostrarVersao() {
  const el = $("versao");
  if (el) el.textContent = "v" + VERSAO;
  renderNovidades();
})();

/* ---------- Atualização automática ----------
   Além do service worker, o jogo consulta um arquivo pequeno (versao.json)
   sem usar cache. Se a versão publicada for diferente da que está rodando,
   ele limpa o cache e recarrega — mesmo que o service worker esteja preso. */
let versaoNova = null;
let jaAtualizando = false;

function ugPasso(n, ok) {
  const el = $("ug-p" + n);
  if (el) el.classList.toggle("ok", !!ok);
}
/* Mostra o portao: dali em diante nao da para fazer nada sem atualizar.
   Durante a partida ele espera terminar, para nao apagar o progresso da
   fase no meio do caminho — assim que sair do jogo, o portao aparece.   */
function mostrarPortaoAtualizacao() {
  if (!versaoNova) return;
  const g = $("update-gate");
  if (!g) return;
  if (S && S.mode === "playing") return;   // termina a fase primeiro
  if (portaoLiberado === versaoNova.versao) return;   // ele escolheu entrar assim mesmo
  $("ug-ver").textContent = "VERSÃO " + versaoNova.versao;
  if (versaoNova.nota) $("ug-nota").textContent = versaoNova.nota;
  /* se já tentou duas vezes e voltou na mesma versão, o servidor ainda
     está entregando a antiga: abre a saída para não prender ninguém */
  if (tentativasDeAtualizar(versaoNova.versao) >= 2) {
    g.classList.add("travado");
    $("ug-nota").textContent =
      "A versão nova ainda não chegou neste aparelho. Tente atualizar de novo " +
      "ou entre assim mesmo e atualize mais tarde.";
  }
  g.classList.add("on");
}
/* conta quantas vezes já tentamos atualizar para uma mesma versão */
function tentativasDeAtualizar(v) {
  return parseInt(storageGet("nn_upd_tent_" + v, "0"), 10) || 0;
}
function anotarTentativa(v) {
  storageSet("nn_upd_tent_" + v, String(tentativasDeAtualizar(v) + 1));
}
let portaoLiberado = null;

async function limparTudoERecarregar() {
  if (jaAtualizando) return;
  jaAtualizando = true;
  if (versaoNova && versaoNova.versao) anotarTentativa(versaoNova.versao);
  const gate = $("update-gate");
  if (gate) {
    gate.classList.add("on", "indo");
    const b = $("ug-btn");
    if (b) { b.disabled = true; b.textContent = "ATUALIZANDO…"; }
  }
  $("atualiza-txt").textContent = "Atualizando…";
  ugPasso(1, true);
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) { try { await r.unregister(); } catch (e) {} }
    }
    if (window.caches) {
      const nomes = await caches.keys();
      for (const n of nomes) { try { await caches.delete(n); } catch (e) {} }
    }
  } catch (e) {}
  ugPasso(2, true);
  ugPasso(3, true);
  // recarrega furando o cache do navegador
  const u = new URL(location.href);
  u.searchParams.set("v", Date.now().toString(36));
  location.replace(u.toString());
}

/* ---------------------------------------------------------------------
   DE ONDE O JOGO DESCOBRE QUE SAIU VERSAO NOVA
   ---------------------------------------------------------------------
   Isto aqui já custou caro: a checagem só olhava o versao.json, um
   arquivo que existe no repositorio mas NAO existe no link do artifact.
   Lá a busca dava 404, a função desistia calada, e o aparelho ficava
   preso na cópia que baixou uma vez — sem aviso, sem botão, para
   sempre. Um jogador ficou quatro versões atrás sem o jogo nunca
   contar.

   Agora a fonte principal é a própria página no servidor: o jogo pede o
   PEDAÇO FINAL dela (onde mora o "const VERSAO") e compara com o número
   que está rodando. Não precisa de arquivo nenhum do lado do servidor:
   funciona no artifact, no GitHub Pages e em qualquer lugar que sirva o
   arquivo. São uns 80 KB, não os 3 MB da página inteira.

   O tamanho do pedaço é uma promessa que a ordem dos arquivos tem que
   cumprir: se o "const VERSAO" ficar mais longe do fim do que isto, o
   jogo para de enxergar a si mesmo e volta a ficar preso numa cópia
   velha, em silêncio. Aconteceu quando a cabine 3D entrou depois dele e
   empurrou o número para 41 KB do fim. Por isso o check.sh mede essa
   distância e recusa publicar se ela passar da conta.

   Se o servidor não entender o pedido de pedaço (alguns comprimem a
   resposta, e aí o pedaço não abre), uma vez por dia o jogo baixa a
   página inteira para não ficar cego. O versao.json continua valendo
   como segunda opinião para quem roda do repositório.
   --------------------------------------------------------------------- */
function versaoDoTexto(t) {
  const m = /const VERSAO = "([0-9][0-9.]*)"/.exec(t || "");
  return m ? m[1] : null;
}

async function versaoNoServidor() {
  /* endereço da própria página, sem as perguntas da barra de endereço e
     com um carimbo de hora para furar o cache do navegador */
  const u = new URL(location.href);
  u.search = "";
  u.hash = "";
  u.searchParams.set("_v", Date.now().toString(36));
  const alvo = u.toString();

  /* 1) só o fim do arquivo: barato o bastante para fazer sempre */
  try {
    const r = await fetch(alvo, { cache: "no-store", headers: { Range: "bytes=-80000" } });
    if (r.ok || r.status === 206) {
      const v = versaoDoTexto(await r.text());
      if (v) return v;
    }
  } catch (e) {}

  /* 2) o servidor não deu o pedaço. Baixa inteiro, mas só uma vez por dia */
  const DIA = 24 * 60 * 60 * 1000;
  const ultima = parseInt(storageGet("nn_ver_inteiro", "0"), 10) || 0;
  if (Date.now() - ultima < DIA) return null;
  try {
    storageSet("nn_ver_inteiro", String(Date.now()));
    const r2 = await fetch(alvo, { cache: "no-store" });
    if (!r2.ok) return null;
    return versaoDoTexto(await r2.text());
  } catch (e) {}
  return null;
}

async function checarVersao(automatico) {
  if (location.protocol === "file:") return;
  if (jaAtualizando) return;
  if (navigator.onLine === false) return;

  /* a página no servidor manda mais do que qualquer arquivo solto */
  try {
    const vs = await versaoNoServidor();
    if (vs && versaoNumero(vs) > versaoNumero(VERSAO)) {
      versaoNova = { versao: vs, nota: "Saiu a versão " + vs + "." };
      $("atualiza-txt").textContent = "Versão " + vs + " disponível";
      mostrarPortaoAtualizacao();
      if (S.mode === "playing") $("atualiza-box").classList.add("on");
      return;
    }
    if (vs && versaoNumero(vs) === versaoNumero(VERSAO)) {
      /* chegou: zera o contador de tentativas desta versão */
      try { storageSet("nn_upd_tent_" + vs, "0"); } catch (e) {}
    }
  } catch (e) {}

  try {
    const r = await fetch("versao.json?t=" + Date.now(), { cache: "no-store" });
    if (!r.ok) return;
    const d = await r.json();
    if (d && d.versao === VERSAO) {
      try { storageSet("nn_upd_tent_" + d.versao, "0"); } catch (e) {}
    }
    if (d && d.versao && versaoNumero(d.versao) > versaoNumero(VERSAO)) {
      versaoNova = d;
      $("atualiza-txt").textContent = "Versão " + d.versao + " disponível" +
        (d.nota ? " — " + d.nota : "");
      // fora de partida o portao sobe na hora: atualizar deixou de ser opcional
      mostrarPortaoAtualizacao();
      if (S.mode === "playing") $("atualiza-box").classList.add("on");
    }
  } catch (e) {}
}
$("atualiza-btn").addEventListener("click", limparTudoERecarregar);
$("ug-btn").addEventListener("click", limparTudoERecarregar);
$("ug-pular").addEventListener("click", () => {
  portaoLiberado = versaoNova ? versaoNova.versao : null;
  const g = $("update-gate");
  if (g) g.classList.remove("on", "travado");
  $("atualiza-box").classList.add("on");   // fica o avisinho discreto
});
/* se a versao nova chegou durante a partida, o portao aparece assim que
   o jogador voltar para o menu, a vitoria ou a derrota                  */
setInterval(() => {
  if (versaoNova && !jaAtualizando && S.mode !== "playing") mostrarPortaoAtualizacao();
}, 1200);

window.addEventListener("load", () => {
  setTimeout(() => checarVersao(true), 1500);
  setInterval(() => checarVersao(true), 10 * 60 * 1000);
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) checarVersao(true);
});

/* ---------- Service worker (offline + atualização automática) ---------- */
const podeUsarSW = "serviceWorker" in navigator &&
  (location.protocol === "https:" ||
   location.hostname === "localhost" || location.hostname === "127.0.0.1");
if (podeUsarSW) {
  window.addEventListener("load", () => {
    const jaTinhaControlador = !!navigator.serviceWorker.controller;
    let recarregando = false;

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      // só recarrega quando uma versão NOVA assume (não na primeira instalação)
      if (!jaTinhaControlador || recarregando) return;
      recarregando = true;
      window.location.reload();
    });

    navigator.serviceWorker.register("sw.js").then((reg) => {
      // pede a troca imediata se uma versão nova já estiver esperando
      if (reg.waiting) reg.waiting.postMessage("atualizar-agora");
      reg.addEventListener("updatefound", () => {
        const novo = reg.installing;
        if (!novo) return;
        novo.addEventListener("statechange", () => {
          if (novo.state === "installed" && navigator.serviceWorker.controller) {
            novo.postMessage("atualizar-agora");
          }
        });
      });
      // procura atualização ao abrir e a cada 30 minutos
      reg.update().catch(() => {});
      setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
    }).catch(() => {});
  });
}

/* ---------- Início ---------- */
/* se o piloto aberto agora é o dono, confere o brinde antes de tudo:
   pode ser um save antigo, de antes desta regra existir                */
try { if (save && darTudoAoDono(save.__name)) { persist(); calcStats(); } } catch (e) {}
renderLogin();
showScreen("login");

/* Quem deixou "continuar conectado" entra direto, sem desenhar a senha.
   Se o piloto tiver sumido do aparelho, cai na tela de entrada normal.   */
(function entrarDireto() {
  const nome = pilotoLembrado();
  if (!nome) return;
  if (!ROOT.profiles[nome]) { esquecerPiloto(); return; }
  try { entrarNoMenu(nome); } catch (e) { esquecerPiloto(); }
})();
