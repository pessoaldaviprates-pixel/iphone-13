/* =====================================================================
   v6.7 — FASES COM OUTRA CARA
   perseguição · resgate · mapa da jornada com ramos · clãs
   ===================================================================== */

/* ---------------------- fase de perseguição ----------------------
   A tela corre e você foge: em vez de limpar ondas, é sobreviver até o
   fim sem bater em nada. Entra nas fases terminadas em 3.             */
function faseDePerseguicao(fase) { return fase % 10 === 3 && fase > 10; }
function perseguicaoComecar() {
  S.fuga = { t: 0, dur: 42, vel: 1 };
  S.banner = { text: "FUGA", sub: "sobreviva 42 segundos — não pare de desviar", t: 3 };
  try { AudioSys.bossAlert(); } catch (e) {}
}
function perseguicaoPassar(dt) {
  if (!S.fuga) return;
  S.fuga.t += dt;
  S.fuga.vel = 1 + S.fuga.t / 42;             /* acelera sem parar */
  /* pedra atrás de pedra, cada vez mais rápido */
  S.fuga.spawn = (S.fuga.spawn || 0) - dt;
  if (S.fuga.spawn <= 0) {
    S.fuga.spawn = Math.max(0.18, 0.75 - S.fuga.t * 0.012);
    const a = asteroideNovo();
    const ult = ASTEROIDES[ASTEROIDES.length - 1];
    if (ult) { ult.vy *= 1.6 * S.fuga.vel; ult.hp = 99; ult.maxHp = 99; }
  }
  /* a barra do tempo que falta */
  const el = $("fuga-barra");
  if (el) {
    el.className = "on";
    el.innerHTML = '<b>FUGA</b><div class="fuga-i"><i style="width:' +
      Math.min(100, Math.round(S.fuga.t / S.fuga.dur * 100)) + '%"></i></div><span>' +
      Math.max(0, Math.ceil(S.fuga.dur - S.fuga.t)) + "s</span>";
  }
  if (S.fuga.t >= S.fuga.dur) {
    S.fuga = null;
    ASTEROIDES.length = 0;
    if (el) el.className = "";
    S.banner = { text: "VOCÊ ESCAPOU!", sub: "", t: 2.4 };
    faseVictory();
  }
}

/* ---------------------- fase de resgate ----------------------
   Uma nave aliada atravessa a tela devagar e não sabe se defender. Se
   ela cair, a fase acaba. Muda tudo: você para de caçar e passa a
   proteger.                                                          */
function faseDeResgate(fase) { return fase % 10 === 7 && fase > 20; }
function resgateComecar() {
  S.resgate = {
    x: W * 0.5, y: -40, hp: 100, maxHp: 100,
    alvoY: chaoDaArena() - 80, t: 0
  };
  S.banner = { text: "RESGATE", sub: "proteja a nave aliada até ela pousar", t: 3 };
}
function resgatePassar(dt) {
  const r = S.resgate;
  if (!r) return;
  r.t += dt;
  r.y += 16 * dt;                                  /* desce devagar */
  r.x += Math.sin(r.t * 0.7) * 22 * dt;
  /* tiro inimigo que encosta nela machuca */
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const b = enemyBullets[i];
    if (dist2(b.x, b.y, r.x, r.y) < 26 * 26) {
      enemyBullets.splice(i, 1);
      r.hp -= 6;
      explosion(r.x, r.y, "#63F5B5", 6);
      S.shake = Math.max(S.shake || 0, 3);
    }
  }
  const el = $("resgate-barra");
  if (el) {
    el.className = "on" + (r.hp < 35 ? " perigo" : "");
    el.innerHTML = '<b>NAVE ALIADA</b><div class="fuga-i"><i style="width:' +
      Math.max(0, Math.round(r.hp / r.maxHp * 100)) + '%"></i></div>';
  }
  if (r.hp <= 0) {
    S.resgate = null;
    if (el) el.className = "";
    explosion(r.x, r.y, "#FF5252", 40, 200);
    S.banner = { text: "A NAVE ALIADA CAIU", sub: "a fase acabou", t: 3 };
    try { AudioSys.bigBoom(); } catch (e) {}
    gameOver();
    return;
  }
  if (r.y >= r.alvoY) {
    S.resgate = null;
    if (el) el.className = "";
    save.crystals += 350;
    S.banner = { text: "ALIADO SALVO!", sub: "+350 cristais", t: 2.6 };
    try { AudioSys.victory(); } catch (e) {}
    faseVictory();
  }
}
function drawResgate() {
  const r = S.resgate;
  if (!r) return;
  ctx.save();
  ctx.translate(r.x, r.y);
  /* casco simples e claramente aliado: verde, com escudo piscando */
  ctx.fillStyle = "#63F5B5";
  ctx.beginPath();
  ctx.moveTo(0, -16); ctx.lineTo(14, 10); ctx.lineTo(0, 4); ctx.lineTo(-14, 10);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(99,245,181," + (0.35 + Math.sin(r.t * 4) * 0.2) + ")";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, 24, 0, TAU); ctx.stroke();
  ctx.restore();
}

/* ---------------------- mapa da jornada com ramos ----------------------
   A lista reta de 270 fases não conta história nenhuma. O mapa mostra o
   caminho em blocos de 10, com os desvios que existem (fase de fuga,
   de resgate, regra maluca e chefe) marcados por ícone.               */
function tipoDaFase(f) {
  if (isBossFase(f)) return { id: "chefe", ic: "☠", nome: "Chefe" };
  if (faseDePerseguicao(f)) return { id: "fuga", ic: "»", nome: "Fuga" };
  if (faseDeResgate(f)) return { id: "resgate", ic: "✚", nome: "Resgate" };
  if (regraDaFase(f)) return { id: "regra", ic: "⚡", nome: regraDaFase(f).nome };
  return { id: "normal", ic: "", nome: "Combate" };
}
function mapaRender() {
  const cx = $("mapa-corpo");
  if (!cx) return;
  const feitas = Math.min(save.best || 0, TOTAL_FASES);
  const blocos = [];
  for (let de = 1; de <= TOTAL_FASES; de += 10) {
    const ate = Math.min(TOTAL_FASES, de + 9);
    const prontas = Math.max(0, Math.min(ate, feitas) - de + 1);
    blocos.push({ de, ate, prontas, total: ate - de + 1 });
  }
  cx.innerHTML =
    '<p class="adm-note" style="margin-bottom:12px">Cada dez fases tem uma fuga, um ' +
    "resgate, uma regra maluca e um chefe. O ícone diz o que te espera.</p>" +
    blocos.map(b => {
      const aberto = b.de <= feitas + 1;
      return '<div class="mapa-bloco' + (aberto ? "" : " trancado") + '">' +
        '<div class="mapa-cab"><b>' + b.de + "–" + b.ate + "</b>" +
          "<span>" + b.prontas + "/" + b.total + "</span></div>" +
        '<div class="mapa-fases">' +
          Array.from({ length: b.total }, (_, i) => {
            const f = b.de + i;
            const t = tipoDaFase(f);
            const est = (save.estrelas || {})[f] || 0;
            return '<button class="mapa-f ' + t.id + (f <= feitas ? " feita" : "") +
              (f === feitas + 1 ? " agora" : "") + (f > feitas + 1 ? " trancada" : "") +
              '" data-fase="' + f + '" title="' + escaparTexto(t.nome) + '">' +
              "<b>" + f + "</b>" + (t.ic ? "<i>" + t.ic + "</i>" : "") +
              (est ? '<em>' + "★".repeat(est) + "</em>" : "") + "</button>";
          }).join("") +
        "</div></div>";
    }).join("");
  cx.querySelectorAll("[data-fase]").forEach(b =>
    b.addEventListener("click", () => {
      const f = parseInt(b.getAttribute("data-fase"), 10);
      if (f > (save.best || 0) + 1) return;
      AudioSys.resume();
      startGame(f);
    }));
}
function mapaAbrir() { S.mode = "mapa"; showScreen("mapa"); mapaRender(); }

/* ---------------------- clãs ----------------------
   Um esquadrão com nome, entrada por código e ranking somado. É o que
   segura grupo de amigos no jogo.                                     */
async function claCriar(nome) {
  nome = String(nome || "").trim().slice(0, 18);
  if (!nome) return { ok: false, msg: "Escreva o nome do esquadrão." };
  const f = nomePermitido(nome);
  if (!f.ok) return { ok: false, msg: f.msg };
  const codigo = nickSimples(nome).slice(0, 10) + Math.floor(Math.random() * 90 + 10);
  const eu = meuIdNuvem();
  if (!eu) return { ok: false, msg: "Entre com um piloto primeiro." };
  const ok = await nuvemSoltar("clas/" + codigo, {
    nome: nome, dono: eu, donoNome: save.__name || "", criado: Date.now(),
    membros: { [eu]: { nome: save.__name || "", tag: minhaTag(), desde: Date.now() } }
  });
  if (ok === null) return { ok: false, msg: "Não deu para criar agora." };
  save.cla = codigo;
  persist();
  try { nuvemEnviar(true); } catch (e) {}
  return { ok: true, msg: "Esquadrão criado! Código: " + codigo, codigo: codigo };
}
async function claEntrar(codigo) {
  codigo = String(codigo || "").trim().toLowerCase();
  if (!codigo) return { ok: false, msg: "Escreva o código do esquadrão." };
  const c = await nuvemReq("clas/" + codigo);
  if (!c) return { ok: false, msg: "Não achei esse esquadrão." };
  const eu = meuIdNuvem();
  const ok = await nuvemSoltar("clas/" + codigo + "/membros/" + eu, {
    nome: save.__name || "", tag: minhaTag(), desde: Date.now()
  });
  if (ok === null) return { ok: false, msg: "Não deu para entrar agora." };
  save.cla = codigo;
  persist();
  try { nuvemEnviar(true); } catch (e) {}
  return { ok: true, msg: "Você entrou no " + (c.nome || codigo) + "!" };
}
async function claSair() {
  if (!save.cla) return;
  try { await nuvemReq("clas/" + save.cla + "/membros/" + meuIdNuvem(), { method: "DELETE" }); } catch (e) {}
  save.cla = null;
  persist();
}
async function claRender() {
  const cx = $("cla-corpo");
  if (!cx) return;
  if (!save.cla) {
    cx.innerHTML =
      '<p class="adm-note" style="margin-bottom:12px">Um esquadrão junta os seus amigos numa ' +
      "lista só, com o total de fases e de vitórias de todo mundo somado.</p>" +
      '<div class="card"><div class="aj-titulo">✦ CRIAR UM ESQUADRÃO</div>' +
        '<div class="adm-row"><input id="cla-nome" maxlength="18" placeholder="Nome do esquadrão" autocomplete="off">' +
        '<button class="adm-btn gold" id="cla-criar">CRIAR</button></div></div>' +
      '<div class="card"><div class="aj-titulo">🔑 ENTRAR COM CÓDIGO</div>' +
        '<div class="adm-row"><input id="cla-codigo" maxlength="14" placeholder="Código" autocomplete="off">' +
        '<button class="adm-btn" id="cla-entrar">ENTRAR</button></div></div>' +
      '<div class="adm-note" id="cla-aviso" style="margin-top:10px"></div>';
    const aviso = t => { const a = $("cla-aviso"); if (a) a.textContent = t; };
    $("cla-criar").addEventListener("click", async ev => {
      ev.currentTarget.disabled = true;
      const r = await claCriar(($("cla-nome") || {}).value);
      aviso(r.msg);
      if (r.ok) setTimeout(claRender, 900); else ev.currentTarget.disabled = false;
    });
    $("cla-entrar").addEventListener("click", async ev => {
      ev.currentTarget.disabled = true;
      const r = await claEntrar(($("cla-codigo") || {}).value);
      aviso(r.msg);
      if (r.ok) setTimeout(claRender, 900); else ev.currentTarget.disabled = false;
    });
    return;
  }
  cx.innerHTML = '<div class="adm-note">Carregando o esquadrão…</div>';
  const c = await nuvemReq("clas/" + save.cla);
  if (!c) { save.cla = null; persist(); claRender(); return; }
  const ids = Object.keys(c.membros || {});
  /* pega a ficha de cada um para somar fases e vitórias */
  const pilotos = (await nuvemReq("pilotos")) || {};
  const linhas = ids.map(id => {
    const m = c.membros[id] || {};
    const p = pilotos[id] || {};
    return { nome: m.tag || m.nome || id, fase: p.fase || p.best || 0,
             vit: p.vitorias || 0, dono: id === c.dono };
  }).sort((a, b) => b.fase - a.fase);
  const somaFases = linhas.reduce((a, x) => a + x.fase, 0);
  const somaVit = linhas.reduce((a, x) => a + x.vit, 0);
  cx.innerHTML =
    '<div class="cla-capa"><b>' + escaparTexto(c.nome || save.cla) + "</b>" +
      "<span>código <b>" + escaparTexto(save.cla) + "</b> · " + linhas.length +
      (linhas.length === 1 ? " piloto" : " pilotos") + "</span></div>" +
    '<div class="perf-grade">' +
      '<div class="perf-cx"><b>' + fmt(somaFases) + "</b><span>FASES SOMADAS</span></div>" +
      '<div class="perf-cx ouro"><b>' + fmt(somaVit) + "</b><span>VITÓRIAS</span></div>" +
      '<div class="perf-cx rosa"><b>' + linhas.length + "</b><span>PILOTOS</span></div>" +
    "</div>" +
    '<div class="card" style="margin-top:12px"><div class="aj-titulo">👥 ESQUADRÃO</div>' +
      linhas.map((l, i) => '<div class="cla-linha"><em>' + (i + 1) + "</em>" +
        "<b>" + escaparTexto(l.nome) + (l.dono ? " 👑" : "") + "</b>" +
        "<span>fase " + l.fase + " · " + l.vit + "V</span></div>").join("") +
    "</div>" +
    '<button class="ghost-btn" id="cla-copiar" style="width:100%;margin-top:10px">COPIAR CÓDIGO PARA CHAMAR</button>' +
    '<button class="ghost-btn" id="cla-sair" style="width:100%;margin-top:8px">SAIR DO ESQUADRÃO</button>';
  $("cla-copiar").addEventListener("click", async ev => {
    try {
      await navigator.clipboard.writeText("Entra no meu esquadrão no Neon Nebula! Código: " + save.cla);
      ev.currentTarget.textContent = "✓ COPIADO";
    } catch (e) { ev.currentTarget.textContent = save.cla; }
  });
  $("cla-sair").addEventListener("click", async () => { await claSair(); claRender(); });
}
function claAbrir() { S.mode = "cla"; showScreen("cla"); claRender(); }


/* =====================================================================
   v6.8 — OS ÚLTIMOS DA LISTA
   sala de treino · testar a nave antes de comprar · combinações de
   habilidades · inimigos que reagem · retrato do chefe · sair no meio
   do duelo tem preço
   ===================================================================== */

/* ---------------------- sala de treino ----------------------
   Alvos parados, cronômetro e nenhuma pressão: é onde se aprende a
   habilidade nova sem morrer tentando.                               */
function treinoComecar(naveTeste) {
  const antes = save.ship;
  if (naveTeste !== undefined && naveTeste !== null) {
    S.treinoNaveAntes = antes;
    save.ship = naveTeste;
    calcStats();
  } else {
    S.treinoNaveAntes = null;
  }
  S.treino = { t: 0, acertos: 0, alvos: 0 };
  startGame(1);
  S.treino = { t: 0, acertos: 0, alvos: 0 };
  enemies.length = 0;
  S.toSpawn = 0;
  S.waveState = "treino";
  S.banner = { text: "SALA DE TREINO", sub: "os alvos voltam sozinhos · nada te machuca", t: 3 };
  save.godMode = true;
  S.treinoGod = true;
  treinoAlvos();
}
function treinoAlvos() {
  for (let i = 0; i < 6; i++) {
    const e = spawnEnemy("grunt");
    if (!e && enemies.length) continue;
  }
  /* põe os alvos parados, em fila, na parte de cima */
  enemies.forEach((e, i) => {
    e.x = W * (0.15 + (i % 3) * 0.35);
    e.y = H * (0.18 + Math.floor(i / 3) * 0.13);
    e.vx = 0; e.vy = 0;
    e.hp = 6; e.maxHp = 6;
    e.treino = true;
  });
}
function treinoPassar(dt) {
  if (!S.treino) return;
  S.treino.t += dt;
  /* alvo que cai volta depois de um segundo */
  if (enemies.length < 6) {
    S.treino.repor = (S.treino.repor || 0) - dt;
    if (S.treino.repor <= 0) { S.treino.repor = 1; treinoAlvos(); }
  }
  const el = $("treino-barra");
  if (el) {
    el.className = "on";
    el.innerHTML = "<b>TREINO</b><span>" + Math.floor(S.treino.t) + "s · " +
      (save.abates || 0) + " abates no total</span>" +
      '<i id="treino-sair">sair</i>';
    const sair = el.querySelector("#treino-sair");
    if (sair) sair.onclick = () => treinoSair();
  }
}
function treinoSair() {
  S.treino = null;
  if (S.treinoGod) { save.godMode = false; S.treinoGod = false; }
  if (S.treinoNaveAntes !== null && S.treinoNaveAntes !== undefined) {
    save.ship = S.treinoNaveAntes;
    S.treinoNaveAntes = null;
    calcStats();
  }
  const el = $("treino-barra");
  if (el) el.className = "";
  goMenu();
}

/* ---------------------- combinações de habilidades ----------------------
   Duas habilidades usadas quase juntas fazem uma terceira coisa. É o
   tipo de segredo que o jogador conta para o amigo.                   */
const COMBOS_HAB = [
  { a: "escudo", b: "explosao", nome: "ONDA DE CHOQUE",
    efeito: () => { limparTiros("ONDA DE CHOQUE"); blastArea(player.x, player.y, 240, 6 * ST.dmg); } },
  { a: "tempo",  b: "tiro",     nome: "CHUVA PARADA",
    efeito: () => { S.lentoT = Math.max(S.lentoT || 0, 3.5); S.furyT = Math.max(S.furyT || 0, 4); } },
  { a: "cura",   b: "escudo",   nome: "FORTALEZA",
    efeito: () => { player.hp = ST.maxHp; player.shield = ST.shieldDur * 1.5; player.invuln = 2; } },
  { a: "drone",  b: "explosao", nome: "ENXAME EXPLOSIVO",
    efeito: () => { S.hiveT = Math.max(S.hiveT || 0, 8); blastArea(player.x, player.y, 180, 4 * ST.dmg); } }
];
let ultimaHab = { id: null, quando: 0 };
function comboHabTentar(id) {
  const agora = Date.now();
  const anterior = ultimaHab;
  ultimaHab = { id: id, quando: agora };
  if (!anterior.id || agora - anterior.quando > 1600) return null;
  for (const c of COMBOS_HAB) {
    const bate = (c.a === anterior.id && c.b === id) || (c.b === anterior.id && c.a === id);
    if (!bate) continue;
    try {
      c.efeito();
      S.banner = { text: "✦ " + c.nome, sub: "combinação de habilidades", t: 2.2 };
      addText(player.x, player.y - 50, c.nome, "#C34DFF");
      AudioSys.ultFire(); vibrate([50, 40, 90]);
      save.combosFeitos = (save.combosFeitos || 0) + 1;
      if (!save.combosVistos) save.combosVistos = {};
      save.combosVistos[c.nome] = true;
      persist();
    } catch (e) {}
    ultimaHab = { id: null, quando: 0 };
    return c;
  }
  return null;
}
function combosRender() {
  const cx = $("perf-combos");
  if (!cx) return;
  const vistos = save.combosVistos || {};
  cx.innerHTML =
    '<div class="aj-titulo">✦ COMBINAÇÕES DE HABILIDADES</div>' +
    '<p class="adm-note" style="margin-bottom:9px">Use duas habilidades em menos de 1,6 segundo ' +
    "e elas viram outra coisa. Descubra sozinho — ou espie aqui o que já achou.</p>" +
    COMBOS_HAB.map(c => {
      const achou = vistos[c.nome];
      return '<div class="combo-linha' + (achou ? " achou" : "") + '">' +
        "<b>" + (achou ? escaparTexto(c.nome) : "? ? ?") + "</b>" +
        "<span>" + (achou ? escaparTexto(c.a) + " + " + escaparTexto(c.b) : "ainda não descoberta") +
        "</span></div>";
    }).join("");
}

/* ---------------------- inimigos que reagem ----------------------
   Antes eles vinham em linha reta, sempre. Agora desviam quando o seu
   tiro vem na direção deles — dá para "empurrar" a formação.          */
function inimigosDesviar(dt) {
  if (S.mode !== "playing" || !bullets.length) return;
  const nivel = Math.min(1, (S.fase || 1) / 120);      /* fase alta, desvio melhor */
  if (nivel <= 0.05) return;
  for (const e of enemies) {
    if (!e || e.treino || e.tipoChefe) continue;
    let perigo = null;
    for (const b of bullets) {
      /* ameaça é o tiro que está ABAIXO dele e subindo na sua direção */
      if (b.y < e.y || b.y > e.y + 320) continue;
      if (Math.abs(b.x - e.x) > e.r + 16) continue;
      perigo = b; break;
    }
    if (!perigo) continue;
    const lado = (e.x < perigo.x) ? -1 : 1;
    e.x += lado * 120 * nivel * dt;
    e.x = clamp(e.x, e.r, W - e.r);
  }
}

/* ---------------------- retrato do chefe ---------------------- */
function chefeApresentar(nome, frase) {
  const el = $("chefe-cartao");
  if (!el) return;
  el.innerHTML =
    '<div class="ch-dentro"><div class="ch-ic">☠</div>' +
    "<b>" + escaparTexto(nome || "CHEFE") + "</b>" +
    "<span>" + escaparTexto(frase || "") + "</span></div>";
  el.className = "on";
  clearTimeout(chefeApresentar._t);
  chefeApresentar._t = setTimeout(() => { el.className = ""; }, 2600);
}
const FRASES_CHEFE = [
  "“Vocês não deviam ter vindo até aqui.”",
  "“A nebulosa é nossa desde antes de vocês.”",
  "“Mais um casco para a pilha.”",
  "“Eu já vi naves melhores virarem poeira.”",
  "“Não há para onde correr aqui em cima.”",
  "“O silêncio depois de você vai ser bom.”"
];
function fraseDoChefe(fase) {
  const r = rngDe(((fase * 1103515245) ^ 0x7ab) >>> 0);
  return FRASES_CHEFE[Math.floor(r() * FRASES_CHEFE.length)];
}

/* ---------------------- sair no meio do duelo tem preço ----------------------
   Sem isto, quem está perdendo simplesmente fecha o jogo — e o modo
   morre. A punição é pequena e explicada.                            */
function abandonoRegistrar() {
  save.abandonos = (save.abandonos || 0) + 1;
  save.abandonoEm = Date.now();
  /* perde o elo que ganharia, e fica um tempo sem poder entrar na fila */
  const perda = Math.min(20, 8 + (save.abandonos || 0) * 2);
  save.rank = Math.max(0, (save.rank || 0) - perda);
  save.filaTravadaAte = Date.now() + Math.min(10, save.abandonos) * 60000;
  persist();
  try { nuvemEnviar(true); } catch (e) {}
  return { perda: perda, minutos: Math.min(10, save.abandonos) };
}
function filaTravada() {
  const ate = save.filaTravadaAte || 0;
  if (Date.now() >= ate) return 0;
  return Math.ceil((ate - Date.now()) / 60000);
}


/* =====================================================================
   v6.9 — OS DOZE QUE FALTAVAM
   abertura · fundo com profundidade · música por bioma · passiva de cada
   nave · chefe de dupla · placar ao vivo da arena · evento de fim de
   semana · sala de espera · reembolso
   ===================================================================== */

/* ---------------------- abertura de 4 segundos ----------------------
   Só na primeiríssima vez que o jogo abre naquele aparelho. Depois
   disso, ninguém quer esperar uma abertura.                           */
function aberturaPrecisa() {
  try { return storageGet("nn_abertura", "") !== "1"; } catch (e) { return false; }
}
function aberturaTocar(depois) {
  const el = $("abertura");
  if (!el || !aberturaPrecisa()) { if (depois) depois(); return; }
  try { storageSet("nn_abertura", "1"); } catch (e) {}
  el.innerHTML =
    '<div class="ab-nave"><canvas id="ab-canvas" width="240" height="240"></canvas></div>' +
    '<div class="ab-marca"><b>NEON</b><em>NEBULA</em></div>' +
    '<div class="ab-linha"></div>' +
    '<button class="ab-pular" id="ab-pular">PULAR</button>';
  el.className = "on";
  /* a nave atravessa a tela desenhada no canvas, sem imagem nenhuma */
  try {
    const c = $("ab-canvas").getContext("2d");
    let t = 0;
    const anda = () => {
      t += 1 / 60;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, 240, 240);
      c.setTransform(2.4, 0, 0, 2.4, 120, 120);
      c.rotate(Math.sin(t * 1.5) * 0.12);
      try { drawShipSprite(c, naveValida(save && save.ship ? save.ship : 0), 18); } catch (e) {}
      if (el.className.indexOf("on") >= 0 && t < 4) requestAnimationFrame(anda);
    };
    anda();
  } catch (e) {}
  const fim = () => {
    el.className = "";
    el.innerHTML = "";
    if (depois) depois();
  };
  const b = $("ab-pular");
  if (b) b.addEventListener("click", fim);
  setTimeout(fim, 4000);
}

/* ---------------------- fundo com profundidade ----------------------
   As estrelas já existiam, todas no mesmo plano. Agora são três planos
   que andam em velocidades diferentes: o fundo parece ter fundo.      */
const NEBULAS = [];
function nebulasMontar() {
  NEBULAS.length = 0;
  const r = rngDe(20260911);
  for (let i = 0; i < 5; i++) {
    NEBULAS.push({
      x: r() * W, y: r() * H,
      raio: 120 + r() * 220,
      cor: ["94,230,255", "181,123,255", "255,92,157"][Math.floor(r() * 3)],
      z: 0.06 + r() * 0.1,
      alfa: 0.05 + r() * 0.07
    });
  }
}
function nebulasPassar(dt) {
  const k = S.mode === "playing" ? 1 : 0.3;
  for (const n of NEBULAS) {
    n.y += n.z * 26 * dt * k;
    if (n.y - n.raio > H) { n.y = -n.raio; n.x = Math.random() * W; }
  }
}
function drawNebulas() {
  if (!NEBULAS.length) nebulasMontar();
  if (typeof Q !== "undefined" && Q.nivel === 0) return;   /* no leve, nem desenha */
  ctx.save();
  for (const n of NEBULAS) {
    const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.raio);
    g.addColorStop(0, "rgba(" + n.cor + "," + n.alfa + ")");
    g.addColorStop(1, "rgba(" + n.cor + ",0)");
    ctx.fillStyle = g;
    ctx.fillRect(n.x - n.raio, n.y - n.raio, n.raio * 2, n.raio * 2);
  }
  ctx.restore();
}

/* ---------------------- música por bioma ----------------------
   A trilha já mudava de escala a cada 20 fases. Agora cada faixa de 45
   fases tem um bioma com nome, cor e andamento próprios — dá para
   sentir que você mudou de lugar.                                     */
const BIOMAS = [
  { ate: 45,  nome: "Nebulosa Azul",     escala: 0, andamento: 1.0,  timbre: "triangle" },
  { ate: 90,  nome: "Campo de Asteroides", escala: 2, andamento: 1.12, timbre: "square" },
  { ate: 135, nome: "Colmeia Alienígena", escala: 4, andamento: 0.92, timbre: "sawtooth" },
  { ate: 180, nome: "Cinzas de Guerra",  escala: 1, andamento: 1.2,  timbre: "square" },
  { ate: 225, nome: "Vazio Profundo",    escala: 6, andamento: 0.8,  timbre: "triangle" },
  { ate: 999, nome: "Coração da Nebulosa", escala: 3, andamento: 1.3, timbre: "sawtooth" }
];
function biomaDaFase(f) {
  for (const b of BIOMAS) if (f <= b.ate) return b;
  return BIOMAS[BIOMAS.length - 1];
}

/* ---------------------- passiva de cada nave ----------------------
   Cada nave ganha uma virtude que vale sem apertar nada. É o que dá
   personalidade para as que ninguém escolhia.                         */
const PASSIVAS = [
  { id: "recupera", nome: "Casco Vivo",   desc: "recupera 1% de casco a cada onda" },
  { id: "primeiro", nome: "Bote",         desc: "o primeiro tiro de cada onda dá o dobro de dano" },
  { id: "cristal",  nome: "Garimpo",      desc: "+8% de cristais" },
  { id: "escudo",   nome: "Anteparo",     desc: "começa cada fase com escudo" },
  { id: "agil",     nome: "Leveza",       desc: "+10% de agilidade quando está com pouca vida" },
  { id: "combo",    nome: "Ritmo",        desc: "o combo demora mais para esfriar" },
  { id: "sorte",    nome: "Sorte",        desc: "+12% de chance de item cair" },
  { id: "teimoso",  nome: "Teimosia",     desc: "sobrevive com 1 de casco uma vez por fase" }
];
function passivaDaNave(i) {
  return PASSIVAS[i % PASSIVAS.length];
}
/* aplicada onde faz diferença, sem mexer no resto do jogo */
function passivaVale(id) {
  try { return passivaDaNave(naveValida(save.ship)).id === id; } catch (e) { return false; }
}

/* ---------------------- chefe que só cai em dupla ----------------------
   Ele fecha uma casca que só abre quando os DOIS acertam ao mesmo
   tempo. Sozinho dá para machucar, mas não dá para derrubar.          */
function chefeDeDuplaPrecisa(fase) {
  return mpCoop && mpCoop() && fase % 40 === 0;
}
function cascaDuplaPassar(dt) {
  if (!boss || !boss.cascaDupla) return;
  boss.cascaT = (boss.cascaT || 0) - dt;
  if (boss.cascaT <= 0) {
    boss.cascaT = 7;
    boss.cascaAberta = false;
    boss.cascaPedido = Date.now();
    S.banner = { text: "CASCA FECHADA", sub: "os dois precisam acertar juntos", t: 2.4 };
  }
  /* abriu se os dois acertaram nos últimos 1,2 segundos */
  const meu = (S.ultimoAcerto || 0) > Date.now() - 1200;
  const dele = (MP.ultimoAcerteDele || 0) > Date.now() - 1200;
  if (!boss.cascaAberta && meu && dele) {
    boss.cascaAberta = true;
    boss.cascaT = 6;
    S.banner = { text: "CASCA ABERTA!", sub: "agora sim — mandem tudo", t: 2 };
    try { AudioSys.power(); } catch (e) {}
  }
}

/* ---------------------- placar ao vivo da arena ---------------------- */
function arenaPlacarRender(lista) {
  const el = $("arena-placar");
  if (!el) return;
  if (!lista || !lista.length || S.mode !== "playing") { el.className = ""; return; }
  const tres = lista.slice(0, 3);
  el.className = "on";
  el.innerHTML = tres.map((p, i) =>
    '<div class="ap-linha' + (p.eu ? " eu" : "") + '"><em>' + ["🥇", "🥈", "🥉"][i] + "</em>" +
    "<b>" + escaparTexto(p.nome || "?") + "</b><span>" + fmt(p.abates || 0) + "</span></div>").join("");
}

/* ---------------------- evento de fim de semana na arena ----------------------
   Sábado e domingo a arena muda de regra sozinha, sem ninguém apertar
   nada. Dá motivo para voltar no fim de semana.                       */
const EVENTOS_ARENA = [
  { id: "dano2",   nome: "DANO EM DOBRO",   desc: "todo mundo bate o dobro", dano: 2, vida: 1 },
  { id: "vidro",   nome: "SEM ESCUDO",      desc: "ninguém tem escudo, o dobro de cristais", dano: 1, vida: 1, gem: 2 },
  { id: "enxame",  nome: "ENXAME",          desc: "o dobro de inimigos, com metade da vida", qtd: 2, vida: 0.5 },
  { id: "cristal", nome: "CHUVA DE CRISTAL", desc: "cristais em dobro", gem: 2, dano: 1, vida: 1 }
];
function eventoDaArena() {
  const d = new Date();
  const dia = d.getDay();                   /* 0 domingo, 6 sábado */
  if (dia !== 0 && dia !== 6) return null;
  /* o mesmo evento o fim de semana inteiro, igual para todo mundo */
  const semana = Math.floor(d.getTime() / (7 * 86400000));
  return EVENTOS_ARENA[semana % EVENTOS_ARENA.length];
}
function eventoArenaRender() {
  const cx = $("arena-evento");
  if (!cx) return;
  const e = eventoDaArena();
  if (!e) { cx.style.display = "none"; return; }
  cx.style.display = "block";
  cx.className = "card oferta";
  cx.innerHTML = '<div class="of-selo">FIM DE SEMANA NA ARENA</div>' +
    "<b>" + escaparTexto(e.nome) + "</b>" +
    '<div class="adm-note" style="margin-top:4px">' + escaparTexto(e.desc) + "</div>";
}

/* ---------------------- sala de espera que mostra o que o outro faz ---------------------- */
function salaEstadoTexto(o) {
  if (!o) return "entrando…";
  if (o.pronto) return "pronto!";
  if (o.tela === "hangar") return "escolhendo nave";
  if (o.tela === "shop" || o.tela === "loja") return "comprando melhoria";
  if (o.tela === "levels") return "olhando as fases";
  if (o.tela === "sala") return "esperando você";
  return "no menu";
}
function salaEsperaRender() {
  const cx = $("sala-estado");
  if (!cx) return;
  const ids = Object.keys(MP.outros || {});
  if (!MP.sala || !ids.length) { cx.style.display = "none"; return; }
  cx.style.display = "block";
  cx.innerHTML = ids.map(id => {
    const o = MP.outros[id] || {};
    return '<div class="sala-linha"><b>' + escaparTexto(o.nome || "Piloto") + "</b>" +
      "<span>" + escaparTexto(salaEstadoTexto(o)) + "</span></div>";
  }).join("");
}

/* ---------------------- reembolso registrado ---------------------- */
async function reembolsar(chave, pd, motivo) {
  try {
    await admPedidoJuntar(chave, pd, {
      estado: "reembolsado", reembolsoEm: Date.now(), motivo: motivo || ""
    });
    await nuvemSoltar("reembolsos/" + chave, {
      nome: pd.nome || "", item: pd.itemNome || "", preco: pd.preco || 0,
      motivo: motivo || "", quando: Date.now(), por: (PERM && PERM.nick) || ""
    });
    await admAvisarNaConversa(pd.de, "Seu pedido de " + (pd.itemNome || "") +
      " foi cancelado e o valor devolvido. " + (motivo ? "Motivo: " + motivo : ""));
    admRegistrar("reembolsou " + (pd.itemNome || "") + " de " + (pd.nome || ""));
    return true;
  } catch (e) { return false; }
}
async function reembolsosRender() {
  const cx = $("adm-reembolsos-lista");
  if (!cx) return;
  const r = (await nuvemReq("reembolsos")) || {};
  const linhas = Object.keys(r).map(k => r[k]).sort((a, b) => (b.quando || 0) - (a.quando || 0));
  const total = linhas.reduce((a, x) => a + (x.preco || 0), 0);
  if (!linhas.length) {
    cx.innerHTML = '<div class="adm-note">Nenhum reembolso até agora.</div>';
    return;
  }
  cx.innerHTML =
    '<div class="adm-note" style="margin-bottom:8px">' + linhas.length + " reembolso" +
      (linhas.length === 1 ? "" : "s") + " · " + reais(total) + " no total</div>" +
    linhas.slice(0, 20).map(l =>
      '<div class="reg-linha"><b>' + escaparTexto(l.nome || "?") + "</b>" +
      "<span>" + escaparTexto(l.item || "") + " · " + reais(l.preco || 0) +
      (l.motivo ? " · " + escaparTexto(l.motivo) : "") + "</span>" +
      "<em>" + quandoTexto(l.quando) + "</em></div>").join("");
}


/* =====================================================================
   v7.0 — O MENU COMPRIMIDO
   ---------------------------------------------------------------------
   O menu tinha 19 botões numa tela só. Ninguém acha nada assim: o olho
   passa por cima de tudo e não pousa em lugar nenhum.

   Agora o menu tem JOGAR e QUATRO PORTAS. Cada porta abre uma lista de
   linhas grandes, com ícone, nome e uma frase dizendo o que é. Nada
   sumiu: as portas apertam os MESMOS botões de antes, que continuam no
   HTML (escondidos). Quem já sabia onde as coisas ficavam não perde
   nada; quem não sabia agora tem só quatro escolhas de cada vez.
   ===================================================================== */

const PORTAS = [
  {
    id: "nave", nome: "MINHA NAVE", icone: "▲", cor: "cyan",
    nota: () => {
      try {
        const n = (SHIPS[naveValida(save.ship)] || {}).name || "";
        const pts = ptsAvailable();
        return n + (pts ? " · " + pts + " ponto" + (pts > 1 ? "s" : "") + " para gastar" : "");
      } catch (e) { return "nave, melhorias e relíquias"; }
    },
    /* quantas coisas estão pedindo atenção aqui dentro */
    pip: () => { try { return ptsAvailable(); } catch (e) { return 0; } },
    itens: [
      { botao: "btn-hangar",    icone: "▲", nome: "Hangar",       nota: "trocar de nave, pintar, armar" },
      { botao: "btn-shop",      icone: "⬡", nome: "Melhorias",    nota: "dano, casco, escudo, sorte" },
      { botao: "btn-tree",      icone: "✦", nome: "Habilidades",  nota: "a árvore de pontos" },
      { botao: "btn-reliquias", icone: "◈", nome: "Relíquias",    nota: "amuletos e baús" },
      { botao: "btn-comparar",  icone: "📊", nome: "Comparar naves", nota: "as 120 lado a lado", ondeEsta: "hangar" },
      { botao: "btn-treino",    icone: "🎯", nome: "Sala de treino", nota: "alvos parados, nada machuca", ondeEsta: "hangar" }
    ]
  },
  {
    id: "online", nome: "COM AMIGOS", icone: "🤝", cor: "verde",
    nota: () => {
      try {
        const n = Object.keys((typeof AM !== "undefined" && AM.lista) || {}).length;
        return n ? n + (n === 1 ? " amigo" : " amigos") + " · dupla, duelo e arena"
                 : "jogar junto, duelo e ranqueada";
      } catch (e) { return "jogar junto, duelo e ranqueada"; }
    },
    pip: () => {
      try { return Object.keys((AM && AM.pedidos) || {}).length; } catch (e) { return 0; }
    },
    itens: [
      { botao: "btn-multi",    icone: "🤝", nome: "Jogar com amigo", nota: "jornada em dupla, duelo, sala" },
      { botao: "btn-ranked",   icone: "⚔", nome: "Ranqueada",       nota: "o jogo acha alguém do seu nível" },
      { botao: "btn-arena",    icone: "∞", nome: "Arena infinita",  nota: "uma arena para todo mundo" },
      { botao: "btn-bossrush", icone: "☠", nome: "Maratona de chefes", nota: "5 chefes seguidos" },
      { botao: "btn-amigos",   icone: "👥", nome: "Amigos",          nota: "conversar e adicionar" },
      { botao: "btn-cla",      icone: "✦", nome: "Esquadrão",       nota: "o seu time, com ranking somado" },
      { botao: "btn-convite",  icone: "🎟", nome: "Convidar",        nota: "cristais para os dois" },
      { botao: "btn-rank",     icone: "🏆", nome: "Ranking",         nota: "quem está na frente" }
    ]
  },
  {
    id: "progresso", nome: "PROGRESSO", icone: "🗺", cor: "roxo",
    nota: () => {
      try { return (save.best || 0) + " de " + TOTAL_FASES + " fases · " + estrelasTotal() + " estrelas"; }
      catch (e) { return "mapa, missões e conquistas"; }
    },
    pip: () => {
      try { return misProntas() + conqProntas(); } catch (e) { return 0; }
    },
    itens: [
      { botao: "btn-mapa",       icone: "🗺", nome: "Mapa da jornada", nota: "as 270 fases e o que tem nelas" },
      { botao: "btn-missoes",    icone: "🎯", nome: "Missões do dia",  nota: "três por dia, com prêmio" },
      { botao: "btn-conquistas", icone: "★", nome: "Conquistas",      nota: "25 medalhas" },
      { botao: "btn-perfil",     icone: "👤", nome: "Meu perfil",      nota: "os seus números e molduras" },
      { botao: "btn-novidades",  icone: "📋", nome: "Novidades",       nota: "o que mudou no jogo" }
    ]
  },
  {
    id: "loja", nome: "LOJA", icone: "👑", cor: "ouro",
    nota: () => {
      try {
        return temVip() ? "VIP por mais " + vipDiasQueFaltam() + " dias" : "VIP, passes e naves exclusivas";
      } catch (e) { return "VIP, passes e naves"; }
    },
    pip: () => 0,
    /* a loja é uma porta de um item só: abre direto */
    direto: "btn-loja"
  }
];

let portaAberta = null;

function portaRender() {
  const cx = $("menu-portas");
  if (!cx) return;
  cx.innerHTML = PORTAS.map(p => {
    let nota = "", pip = 0;
    try { nota = p.nota(); } catch (e) {}
    try { pip = p.pip ? p.pip() : 0; } catch (e) {}
    return '<button class="porta ' + p.cor + '" data-porta="' + p.id + '">' +
      '<b class="porta-ic">' + p.icone + "</b>" +
      '<span class="porta-txt"><strong>' + escaparTexto(p.nome) + "</strong>" +
      "<em>" + escaparTexto(nota) + "</em></span>" +
      (pip > 0 ? '<i class="porta-pip">' + pip + "</i>" : "") +
      "</button>";
  }).join("");
  cx.querySelectorAll("[data-porta]").forEach(b =>
    b.addEventListener("click", () => portaAbrir(b.getAttribute("data-porta"))));
}

function portaAbrir(id) {
  const p = PORTAS.filter(x => x.id === id)[0];
  if (!p) return;
  try { AudioSys.gem(); } catch (e) {}
  /* porta de um item só não faz o jogador tocar duas vezes */
  if (p.direto) {
    const b = $(p.direto);
    if (b) b.click();
    return;
  }
  portaAberta = p;
  S.mode = "porta";
  showScreen("porta");
  portaCorpoRender();
}

function portaCorpoRender() {
  const p = portaAberta;
  if (!p) return;
  const tit = $("porta-titulo");
  if (tit) tit.textContent = p.nome;
  const cx = $("porta-corpo");
  if (!cx) return;
  const visivel = it => {
    const b = $(it.botao);
    if (!b) return false;
    /* respeita quem o jogo já escondia (atalho travado, sem permissão) */
    const estilo = b.getAttribute("style") || "";
    if (estilo.indexOf("display: none") >= 0 || estilo.indexOf("display:none") >= 0) return false;
    return true;
  };
  const itens = p.itens.filter(visivel);
  cx.innerHTML = itens.map(it => {
    const b = $(it.botao);
    /* o selo que o jogo já escreve no botão antigo continua valendo */
    let selo = "";
    try {
      const i = b.querySelector("i");
      const t = i && i.textContent ? i.textContent.trim() : "";
      /* selo e aviso curto: um numero, um recorde, um "NOVO". Alguns botoes
         antigos usam o mesmo <i> para escrever um subtitulo inteiro, e isso
         nao cabe na linha nem faz falta: a linha ja tem a frase dela. */
      if (t && t.length <= 14) selo = t;
    } catch (e) {}
    return '<button class="porta-linha" data-ir="' + it.botao + '">' +
      '<b class="porta-ic pequeno">' + it.icone + "</b>" +
      '<span class="porta-txt"><strong>' + escaparTexto(it.nome) + "</strong>" +
      "<em>" + escaparTexto(it.nota) + "</em></span>" +
      (selo ? '<i class="porta-selo">' + escaparTexto(selo) + "</i>" : "") +
      '<span class="porta-seta">›</span></button>';
  }).join("") +
  (p.id === "nave" ? '<p class="adm-note" style="margin-top:12px">Tudo o que mexe na sua nave ' +
    "está aqui dentro — era isso que enchia o menu de botão.</p>" : "");
  cx.querySelectorAll("[data-ir]").forEach(b =>
    b.addEventListener("click", () => {
      const alvo = $(b.getAttribute("data-ir"));
      if (alvo) alvo.click();
    }));
}

/* o "hoje" junta o que era três cartões soltos no menu */
function hojeRender() {
  const cx = $("menu-hoje");
  if (!cx) return;
  const linhas = [];
  try {
    const m = misEstado();
    const feitas = m.itens.filter(it => it.feito >= it.alvo).length;
    linhas.push({
      ic: "🎯", txt: feitas + " de " + m.itens.length + " missões do dia",
      destaque: misProntas() > 0,
      extra: misProntas() ? "tem prêmio para pegar" : "",
      vai: () => misAbrir()
    });
  } catch (e) {}
  try {
    const f = faltaPouco();
    if (f.length) linhas.push({ ic: "◆", txt: f[0].txt, extra: "", vai: null });
  } catch (e) {}
  if (!linhas.length) { cx.style.display = "none"; return; }
  cx.style.display = "block";
  cx.className = "hoje";
  cx.innerHTML = linhas.map((l, i) =>
    '<div class="hoje-linha' + (l.destaque ? " tem" : "") + '" data-hoje="' + i + '">' +
    "<b>" + l.ic + "</b><span>" + escaparTexto(l.txt) +
    (l.extra ? " — <em>" + escaparTexto(l.extra) + "</em>" : "") + "</span></div>").join("");
  cx.querySelectorAll("[data-hoje]").forEach(el => {
    const l = linhas[parseInt(el.getAttribute("data-hoje"), 10)];
    if (l && l.vai) el.addEventListener("click", l.vai);
  });
}


document.querySelectorAll("[data-back]").forEach(b => b.addEventListener("click", () => { goMenu(); }));
function goMenu() {
  try { Musica.parar(); } catch (e) {}
  try { conversaDesligar(); AM.conversaCom = null; } catch (e) {}
  if (arenaModo()) arenaSair();
  if (S.mode !== "arena") arenaDesligarFluxo();
  S.mode = "menu";
  refreshMenu();
  showScreen("menu");
  if (presenteGuardado && presenteGuardado.length) setTimeout(mostrarCaixaPresente, 350);
}
$("btn-resume").addEventListener("click", () => togglePause());
$("btn-pause").addEventListener("click", () => togglePause());
$("hab-abrir").addEventListener("click", e => { e.stopPropagation(); habAlternar(); });
$("btn-quit").addEventListener("click", () => {
  bankRunGems(0.5);
  if (arenaModo()) arenaSair();
  else if (MP.sala) mpSair(false);
  S.duelo = false;
  goMenu();
});
$("btn-retry").addEventListener("click", () => {
  AudioSys.resume();
  if (arenaModo()) { arenaComecarOnda(Math.max(1, ARENA.onda)); return; }
  startGame(S.fase);
});
$("btn-next").addEventListener("click", () => { AudioSys.resume(); startGame(Math.min(S.fase + 1, TOTAL_FASES)); });
$("btn-vic-shop").addEventListener("click", () => { S.mode = "shop"; renderShop(); showScreen("shop"); });
$("btn-go-shop").addEventListener("click", () => { S.mode = "shop"; renderShop(); showScreen("shop"); });
$("btn-vic-menu").addEventListener("click", goMenu);
$("btn-go-menu").addEventListener("click", goMenu);
$("btn-mute").addEventListener("click", () => {
  AudioSys.resume();
  AudioSys.setMuted(!AudioSys.muted);
  $("btn-mute").textContent = AudioSys.muted ? "✕" : "♪";
});
$("btn-musica").addEventListener("click", () => {
  AudioSys.resume();
  const lig = Musica.alternar();
  $("btn-musica").textContent = lig ? "🎵" : "🎜";
  $("btn-musica").style.opacity = lig ? "1" : "0.45";
});
$("btn-musica").textContent = Musica.ligada ? "🎵" : "🎜";
$("btn-musica").style.opacity = Musica.ligada ? "1" : "0.45";
function togglePause() {
  if (S.mode === "playing") {
    S.mode = "paused";
    try { qMostrarNoPainel(); } catch (e) {}
    showScreen("pause");
  }
  else if (S.mode === "paused") { S.mode = "playing"; showScreen(null); last = performance.now(); }
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (S.mode === "playing") togglePause();
    persist();
  }
});

/* ---------- Ultimate e Capa ---------- */
function tryUlt() {
  if (S.mode !== "playing" || !player.alive || S.ultCharge < 1) return;
  activateUlt();
}
function tryCloak() {
  if (S.mode !== "playing" || !player.alive || !ST.cloak || player.cloakCd > 0) return;
  player.invis = 4;
  player.cloakCd = 25;
  AudioSys.cloak();
  vibrate(30);
  addText(player.x, player.y - 34, "INVISÍVEL", "#C34DFF");
}
ultBtn.addEventListener("click", tryUlt);
cloakBtn.addEventListener("click", tryCloak);

/* =====================================================================
   EFEITOS DOS PODERES
   ---------------------------------------------------------------------
   Cada ultimate ganhou a sua própria assinatura na tela: cúpula de
   escudo, onda de choque, feixes de ouro, cópias fantasmas, floração de
   gelo... Antes quase todas faziam a mesma coisa visualmente e só
   mudava o texto. Agora dá para saber qual poder está rolando só de
   olhar. Tudo desenhado na hora, com o custo controlado pelo modo leve.
   ===================================================================== */
let EFX = [];
function efeito(tipo, dur, extra) {
  EFX.push(Object.assign({ tipo: tipo, t: dur, max: dur }, extra || {}));
  if (EFX.length > 22) EFX.splice(0, EFX.length - 22);
}
function efxAtualizar(dt) {
  for (let i = EFX.length - 1; i >= 0; i--) {
    const e = EFX[i];
    e.t -= dt;
    if (e.t <= 0) EFX.splice(i, 1);
  }
}
function efxDesenhar() {
  if (!EFX.length) return;
  const leve = Q.nivel === 0;
  for (const e of EFX) {
    const f = clamp(e.t / e.max, 0, 1);       // 1 no começo, 0 no fim
    const px = player.x, py = player.y;
    if (e.tipo === "onda") {
      // anel que abre a partir de um ponto
      const r = (1 - f) * (e.r || 340);
      ctx.strokeStyle = (e.cor || "rgba(255,158,77,") + (f * 0.85) + ")";
      ctx.lineWidth = 3 + f * 9;
      ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, TAU); ctx.stroke();
      if (!leve) {
        ctx.strokeStyle = (e.cor || "rgba(255,158,77,") + (f * 0.3) + ")";
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(e.x, e.y, r * 0.72, 0, TAU); ctx.stroke();
      }
    } else if (e.tipo === "aura") {
      // dois anéis girando colados na nave
      for (let k = 0; k < (leve ? 1 : 2); k++) {
        const rr = 26 + k * 11 + Math.sin(S.time * 7 + k) * 3;
        ctx.strokeStyle = (e.cor || "rgba(255,80,80,") + (f * (0.7 - k * 0.25)) + ")";
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(px, py, rr, S.time * (3 + k * 2), S.time * (3 + k * 2) + 4.2);
        ctx.stroke();
      }
    } else if (e.tipo === "domo") {
      // cúpula hexagonal do escudo
      const r = 40 + Math.sin(S.time * 4) * 2;
      const g2 = ctx.createRadialGradient(px, py, r * 0.5, px, py, r);
      g2.addColorStop(0, "rgba(255,193,69,0)");
      g2.addColorStop(1, "rgba(255,193,69," + (f * 0.3) + ")");
      ctx.fillStyle = g2;
      ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(255,214,120," + (f * 0.85) + ")";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let k = 0; k <= 6; k++) {
        const a = (k / 6) * TAU + S.time * 0.6;
        const x2 = px + Math.cos(a) * r, y2 = py + Math.sin(a) * r;
        if (k === 0) ctx.moveTo(x2, y2); else ctx.lineTo(x2, y2);
      }
      ctx.stroke();
    } else if (e.tipo === "raios") {
      // feixes de luz descendo do alto
      const n = leve ? 4 : 8;
      for (let k = 0; k < n; k++) {
        const x2 = ((k + 0.5) / n) * W + Math.sin(S.time * 1.6 + k) * 12;
        const g3 = ctx.createLinearGradient(x2, 0, x2, H * 0.85);
        g3.addColorStop(0, (e.cor || "rgba(255,193,69,") + (f * 0.34) + ")");
        g3.addColorStop(1, (e.cor || "rgba(255,193,69,") + "0)");
        ctx.fillStyle = g3;
        ctx.fillRect(x2 - 13, 0, 26, H * 0.85);
      }
    } else if (e.tipo === "fantasmas") {
      // cópias da nave atrás de você
      e.rastro = e.rastro || [];
      e.rastro.push({ x: px, y: py });
      if (e.rastro.length > 14) e.rastro.shift();
      for (let k = 0; k < e.rastro.length; k += (leve ? 4 : 2)) {
        const r2 = e.rastro[k];
        ctx.globalAlpha = f * 0.16 * (k / e.rastro.length);
        ctx.save(); ctx.translate(r2.x, r2.y);
        drawShipSprite(ctx, save.ship, 16, { detalhe: false });
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    } else if (e.tipo === "gelo") {
      // floração de gelo nas bordas
      ctx.strokeStyle = "rgba(190,240,255," + (f * 0.5) + ")";
      ctx.lineWidth = 2;
      const n = leve ? 8 : 16;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * TAU;
        const x0 = W / 2 + Math.cos(a) * W * 0.62;
        const y0 = H / 2 + Math.sin(a) * H * 0.55;
        const cresc = (1 - f) * 26;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0 - Math.cos(a) * cresc, y0 - Math.sin(a) * cresc);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(150,220,255," + (f * 0.09) + ")";
      ctx.fillRect(0, 0, W, H);
    } else if (e.tipo === "garras") {
      // linhas que puxam a vida dos inimigos até você
      ctx.strokeStyle = "rgba(255,77,143," + (f * 0.65) + ")";
      ctx.lineWidth = 2;
      for (const en of enemies) {
        ctx.beginPath();
        ctx.moveTo(en.x, en.y);
        const mx = (en.x + px) / 2 + Math.sin(S.time * 6 + en.x) * 22;
        ctx.quadraticCurveTo(mx, (en.y + py) / 2, px, py);
        ctx.stroke();
      }
    } else if (e.tipo === "colmeia") {
      // grade de favos pulsando em volta
      ctx.strokeStyle = "rgba(77,232,255," + (f * 0.34) + ")";
      ctx.lineWidth = 1.4;
      const r = 34 + (1 - f) * 40;
      for (let k = 0; k < (leve ? 3 : 6); k++) {
        const a = (k / 6) * TAU + S.time;
        const x2 = px + Math.cos(a) * r, y2 = py + Math.sin(a) * r;
        ctx.beginPath();
        for (let j = 0; j <= 6; j++) {
          const a2 = (j / 6) * TAU;
          const hx = x2 + Math.cos(a2) * 11, hy = y2 + Math.sin(a2) * 11;
          if (j === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
        }
        ctx.stroke();
      }
    } else if (e.tipo === "risca") {
      // riscos de velocidade
      ctx.strokeStyle = "rgba(255,255,255," + (f * 0.3) + ")";
      ctx.lineWidth = 2;
      const n = leve ? 8 : 18;
      for (let k = 0; k < n; k++) {
        const x2 = ((k * 137) % 100) / 100 * W;
        const y2 = ((k * 271 + S.time * 900) % (H + 200)) - 100;
        ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2, y2 + 60); ctx.stroke();
      }

    /* =================================================================
       EFEITOS NOVOS — para dar para SABER o que cada poder fez
       ================================================================= */
    } else if (e.tipo === "flash") {
      // clarão que toma a tela e some (nuclear, EMP, sinalizadores)
      ctx.fillStyle = (e.cor || "rgba(255,255,255,") + (f * f * 0.55) + ")";
      ctx.fillRect(0, 0, W, H);
    } else if (e.tipo === "choque") {
      // três anéis grossos saindo do ponto, um atrás do outro
      for (let k = 0; k < 3; k++) {
        const at = clamp((1 - f) * 1.35 - k * 0.16, 0, 1);
        if (at <= 0) continue;
        ctx.strokeStyle = (e.cor || "rgba(255,193,69,") + ((1 - at) * 0.9) + ")";
        ctx.lineWidth = 10 - k * 2.6;
        ctx.beginPath();
        ctx.arc(e.x === undefined ? px : e.x, e.y === undefined ? py : e.y,
                at * (e.r || 420), 0, TAU);
        ctx.stroke();
      }
    } else if (e.tipo === "mira") {
      // retículo em cima de cada inimigo: mostra quem foi marcado
      const cor = e.cor || "rgba(255,193,69,";
      ctx.strokeStyle = cor + (f * 0.9) + ")";
      ctx.lineWidth = 1.6;
      let n = 0;
      for (const en of enemies) {
        if (leve && (n++ % 2)) continue;
        const r = en.r + 8 + (1 - f) * 6;
        ctx.beginPath(); ctx.arc(en.x, en.y, r, 0, TAU); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(en.x - r - 5, en.y); ctx.lineTo(en.x - r + 3, en.y);
        ctx.moveTo(en.x + r - 3, en.y); ctx.lineTo(en.x + r + 5, en.y);
        ctx.moveTo(en.x, en.y - r - 5); ctx.lineTo(en.x, en.y - r + 3);
        ctx.moveTo(en.x, en.y + r - 3); ctx.lineTo(en.x, en.y + r + 5);
        ctx.stroke();
      }
      if (boss && !boss.entering) {
        const r = boss.r + 16 + (1 - f) * 8;
        ctx.beginPath(); ctx.arc(boss.x, boss.y, r, 0, TAU); ctx.stroke();
      }
    } else if (e.tipo === "cruz") {
      // cruzes no chão onde a bomba vai cair
      const cor = e.cor || "rgba(255,120,60,";
      e.pontos = e.pontos || (function () {
        const ps = [];
        const n = e.n || 8;
        for (let k = 0; k < n; k++) ps.push({ x: rand(30, W - 30), y: rand(H * 0.18, H * 0.75) });
        return ps;
      })();
      ctx.strokeStyle = cor + (f * 0.9) + ")";
      ctx.lineWidth = 2;
      for (const pt of e.pontos) {
        const r = 16 + Math.sin(S.time * 12 + pt.x) * 3;
        ctx.beginPath(); ctx.arc(pt.x, pt.y, r * (0.5 + f * 0.7), 0, TAU); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pt.x - r, pt.y); ctx.lineTo(pt.x + r, pt.y);
        ctx.moveTo(pt.x, pt.y - r); ctx.lineTo(pt.x, pt.y + r);
        ctx.stroke();
      }
    } else if (e.tipo === "feixe") {
      // coluna de luz descendo do céu num ponto (tropas, canhão orbital)
      const x2 = e.x === undefined ? px : e.x;
      const larg = (e.larg || 34) * (0.6 + f * 0.6);
      const g4 = ctx.createLinearGradient(x2, 0, x2, H);
      g4.addColorStop(0, (e.cor || "rgba(255,193,69,") + (f * 0.55) + ")");
      g4.addColorStop(1, (e.cor || "rgba(255,193,69,") + "0)");
      ctx.fillStyle = g4;
      ctx.fillRect(x2 - larg, 0, larg * 2, H);
      ctx.strokeStyle = (e.cor || "rgba(255,193,69,") + (f * 0.9) + ")";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x2, 0); ctx.lineTo(x2, H); ctx.stroke();
    } else if (e.tipo === "redemoinho") {
      // espiral que gira (descarga, ralo, buraco)
      const x2 = e.x === undefined ? px : e.x, y2 = e.y === undefined ? py : e.y;
      ctx.strokeStyle = (e.cor || "rgba(95,214,255,") + (f * 0.8) + ")";
      ctx.lineWidth = 3;
      const voltas = leve ? 2 : 3.5;
      ctx.beginPath();
      for (let a = 0; a < voltas * TAU; a += 0.22) {
        const r = (a / (voltas * TAU)) * (e.r || 120) * (1.1 - f * 0.4);
        const an = a + S.time * 5 * (e.giro || 1);
        const xx = x2 + Math.cos(an) * r, yy = y2 + Math.sin(an) * r;
        if (a === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
      }
      ctx.stroke();
    } else if (e.tipo === "respingo") {
      // borrifadas para todos os lados (napalm, gás, cocô)
      e.gotas = e.gotas || (function () {
        const gs = [];
        const n = leve ? 10 : 20;
        for (let k = 0; k < n; k++) {
          const a = (k / n) * TAU + rand(-0.2, 0.2);
          gs.push({ a, d: rand(0.4, 1), r: rand(3, 9) });
        }
        return gs;
      })();
      const x2 = e.x === undefined ? px : e.x, y2 = e.y === undefined ? py : e.y;
      ctx.fillStyle = (e.cor || "rgba(192,139,69,") + (f * 0.85) + ")";
      for (const g5 of e.gotas) {
        const d = (1 - f) * (e.r || 150) * g5.d;
        ctx.beginPath();
        ctx.arc(x2 + Math.cos(g5.a) * d, y2 + Math.sin(g5.a) * d, g5.r * f, 0, TAU);
        ctx.fill();
      }
    } else if (e.tipo === "alvo") {
      // anel que fecha em volta da nave (reparo, escudo, blindagem)
      const cor = e.cor || "rgba(124,247,192,";
      for (let k = 0; k < 2; k++) {
        const r = (f * 130 + 26) - k * 10;
        ctx.strokeStyle = cor + (((1 - f) * 0.9) - k * 0.25) + ")";
        ctx.lineWidth = 3 - k;
        ctx.beginPath(); ctx.arc(px, py, Math.max(4, r), 0, TAU); ctx.stroke();
      }
    }
  }
}

function activateUlt() {
  const type = ST.ultType;
  const ult = ULTS[type];
  const UF = ST.ultForca || 1;   // o nível da ultimate no hangar deixa ela mais forte
  try { mpAvisarPoder("ult", ult && ult.name); } catch (e) {}
  S.ultCharge = 0;
  ultBtnSync();
  AudioSys.ultFire();
  vibrate([60, 40, 100]);
  S.banner = { text: ult.name.toUpperCase() + "!", sub: "", t: 1.6 };
  S.shake = Math.max(S.shake, 10);
  if (type === "dmg") {
    S.furyT = 5 * UF;
    efeito("aura", 5 * UF, { cor: "rgba(255,80,80," });
    efeito("choque", 0.8, { r: 300, cor: "rgba(255,80,80," });
    efeito("onda", 0.7, { x: player.x, y: player.y, r: 260, cor: "rgba(255,80,80," });
  } else if (type === "rate") {
    S.barrage = { waves: Math.round(3 * UF), timer: 0 };
    efeito("onda", 0.6, { x: player.x, y: player.y, r: 300, cor: "rgba(77,232,255," });
    efeito("aura", 1.6, { cor: "rgba(77,232,255," });
  } else if (type === "lives") {
    player.shield = ST.shieldDur * 1.2 * UF;
    player.invuln = Math.max(player.invuln, 6 * UF);
    enemyBullets.length = 0;
    efeito("domo", 6 * UF);
    efeito("alvo", 0.9, { cor: "rgba(255,214,120," });
  } else if (type === "gold") {
    const nGem = Math.round(14 * UF);
    for (let k = 0; k < nGem; k++) {
      powerups.push({ x: rand(24, W - 24), y: rand(-260, -20), type: "gem", vy: rand(150, 220), t: rand(0, 2) });
    }
    efeito("raios", 2.6, { cor: "rgba(255,193,69," });
  } else if (type === "ghost") {
    player.invis = 5 * UF;
    efeito("fantasmas", 5 * UF);
  } else if (type === "vamp") {
    for (let j = enemies.length - 1; j >= 0; j--) damageEnemy(enemies[j], j, 6 * ST.dmg * UF, false);
    damageBossAny(10 * ST.dmg * UF);
    explosion(player.x, player.y, "#FF4D8F", 40, 320);
    efeito("garras", 0.9);
    efeito("flash", 0.28, { cor: "rgba(255,77,143," });
  } else if (type === "frost") {
    for (const e of enemies) e.frozenT = 4 * UF;
    if (boss) boss.frozenT = 4 * UF;
    efeito("gelo", 4 * UF);
    efeito("flash", 0.3, { cor: "rgba(190,240,255," });
    efeito("mira", 1.0, { cor: "rgba(190,240,255," });
  } else if (type === "blast") {
    blastArea(player.x, player.y - 120, 340 * UF, 8 * ST.dmg * UF);
    damageBossAny(8 * ST.dmg * UF);
    enemyBullets = [];
    explosion(player.x, player.y - 120, "#FF9E4D", 70, 420);
    efeito("onda", 1.1, { x: player.x, y: player.y - 120, r: 460, cor: "rgba(255,158,77," });
    efeito("flash", 0.34, { cor: "rgba(255,200,120," });
    efeito("choque", 1.0, { x: player.x, y: player.y - 120, r: 520, cor: "rgba(255,158,77," });
    S.shake = 20;
  } else if (type === "drone") {
    S.hiveT = 8 * UF;
    efeito("colmeia", 8 * UF);
  } else if (type === "magnet") {
    S.singu = { x: player.x, y: Math.max(150, player.y - 260), t: 2.5 * UF };
    efeito("redemoinho", 1.6, { x: player.x, y: Math.max(150, player.y - 260),
                                r: 170, cor: "rgba(195,77,255," });
  } else if (type === "maverick") {
    // três passagens rasantes seguidas
    rasante = { x: -40, y: Math.max(120, player.y - 200), dir: 1, t: 1.4 };
    setTimeout(() => { if (S.mode === "playing") rasante = { x: W + 40, y: H * 0.45, dir: -1, t: 1.4 }; }, 500);
    setTimeout(() => { if (S.mode === "playing") rasante = { x: -40, y: player.y - 60, dir: 1, t: 1.4 }; }, 1000);
    player.invuln = Math.max(player.invuln, 2.5);
    efeito("risca", 2.4);
  } else if (type === "b2") {
    S.chuvaFogo = 6 * UF;
    S.chuvaT = 0;
    player.invuln = Math.max(player.invuln, 1.5);
  } else if (type === "omega") {
    // a ultimate do Ômega-9 é a operação inteira
    try { EFEITOS.operacao(); } catch (e) {}
  } else if (type === "privada") {
    // a ultimate do Trono Real é a explosão intestinal
    try { EFEITOS.intestinal(); } catch (e) {}
  }
}

/* ---------- Habilidades das aeronaves exclusivas ---------- */
let habCd = {};   // id -> segundos restantes de recarga

function danoEmArea(x, y, raio, dano, cor) {
  explosion(x, y, cor || "#FF9E4D", 14, 240);
  for (let j = enemies.length - 1; j >= 0; j--) {
    const e = enemies[j];
    if (dist2(x, y, e.x, e.y) < raio * raio) damageEnemy(e, j, dano, false);
  }
  if (boss && !boss.entering) {
    for (const z of bossZones()) {
      if (dist2(x, y, z.x, z.y) < (raio + z.r) * (raio + z.r)) { damageBossZone(z, dano); break; }
    }
  }
}
function limparTiros(msg) {
  const n = enemyBullets.length;
  for (const b of enemyBullets) {
    if (!b) continue;
    particles.push({ x: b.x, y: b.y, vx: rand(-60, 60), vy: rand(-60, 60),
                     t: 0.3, max: 0.3, color: "#9FF3FF", r: 2.5 });
  }
  enemyBullets.length = 0;
  if (msg) addText(player.x, player.y - 34, msg, "#4DE8FF");
  return n;
}
function superNova(x, y) {
  S.superNova = 1.1;
  S.shake = 26;
  AudioSys.bigBoom();
  setTimeout(() => AudioSys.bigBoom(), 220);
  vibrate([90, 60, 140]);
  explosion(x, y, "#FFFFFF", 70, 520);
  explosion(x, y, "#FFC145", 60, 420);
  explosion(x, y, "#FF4D8F", 50, 360);
  enemyBullets.length = 0;
  buracos.length = 0;
  // varre os inimigos da tela e castiga o chefe (efeito só de jogo)
  for (let j = enemies.length - 1; j >= 0; j--) damageEnemy(enemies[j], j, 99999, false);
  if (boss && !boss.entering) {
    const zs = bossZones();
    for (const z of zs) damageBossZone(z, 40 * ST.dmg);
  }
  addText(W / 2, H * 0.42, "SUPER NOVA!", "#FFC145");
}

/* força da habilidade que está sendo usada agora (sobe com o nível) */
let FH = 1;
const EFEITOS = {
  /* ----- Maverick ----- */
  sidewinder() {
    const qtd = Math.round(6 * FH);
    for (let k = 0; k < qtd; k++) {
      missilesArr.push({ x: player.x + rand(-16, 16), y: player.y - 8,
                         vx: rand(-180, 180), vy: -260, t: 3.2, r: 5 * FH });
    }
    efeito("mira", 1.1, { cor: "rgba(255,193,69," });
    addText(player.x, player.y - 34, "SIDEWINDER", "#FFC145");
  },
  vulcan() { S.vulcanT = 4 * FH;
    efeito("aura", 4 * FH, { cor: "rgba(77,232,255," }); addText(player.x, player.y - 34, "VULCAN", "#4DE8FF"); },
  posComb() {
    S.turboT = 3 * FH;
    player.invuln = Math.max(player.invuln, 3 * FH);
    efeito("risca", 3 * FH);
    efeito("alvo", 0.6, { cor: "rgba(255,123,77," });
    addText(player.x, player.y - 34, "PÓS-COMBUSTOR", "#FF7B4D");
  },
  flares() {
    const n = limparTiros("SINALIZADORES");
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * TAU;
      particles.push({ x: player.x, y: player.y, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260,
                       t: 0.6, max: 0.6, color: "#FFC145", r: 3 });
    }
    if (n) S.score += n * 5;
    efeito("flash", 0.35, { cor: "rgba(255,214,120," });
    efeito("choque", 0.7, { r: 320, cor: "rgba(255,193,69," });
  },
  rasante() {
    rasante = { x: player.x, y: player.y, dir: player.x < W / 2 ? 1 : -1, t: 1.1, forca: FH };
    efeito("risca", 1.3);
    player.invuln = Math.max(player.invuln, 1.3 * FH);
    addText(player.x, player.y - 34, "VOO RASANTE", "#FF7B4D");
  },

  /* ----- Ômega-9 Arsenal ----- */
  nuclear()    {
    efeito("flash", 0.5, { cor: "rgba(255,238,180," });
    efeito("choque", 1.1, { r: 560, cor: "rgba(255,193,69," });
    ogivaNuclear();
  },
  tanques()    {
    efeito("feixe", 0.9, { x: player.x, larg: 60, cor: "rgba(124,247,192," });
    chamarTropa("tanque", Math.round(5 * FH));
  },
  esquadrao()  {
    efeito("cruz", 1.2, { n: 9, cor: "rgba(255,158,77," });
    bombardeioAereo(Math.round(3 * FH));
  },
  fuzileiros() {
    efeito("feixe", 0.9, { x: player.x, larg: 46, cor: "rgba(255,193,69," });
    chamarTropa("soldado", Math.round(8 * FH));
  },
  artilharia() {
    efeito("cruz", 1.4, { n: Math.round(9 * FH), cor: "rgba(255,120,60," });
    pedirArtilharia(Math.round(9 * FH));
  },
  orbital()    {
    efeito("feixe", 1.2, { x: W / 2, larg: 90, cor: "rgba(160,240,255," });
    canhaoOrbital();
  },
  helicoptero(){
    efeito("feixe", 0.8, { x: player.x, larg: 40, cor: "rgba(200,220,255," });
    chamarTropa("heli", Math.round(2 * FH));
  },
  reparo() {
    player.lives = ST.maxLives;
    player.hp = ST.maxHp;
    player.shield = Math.max(player.shield, ST.shieldDur);
    limparTiros("REPARO DE CAMPANHA");
    efeito("alvo", 1.1, { cor: "rgba(124,247,192," });
    updateHud();
  },
  blindagem() {
    player.invuln = Math.max(player.invuln, 8 * FH);
    efeito("domo", 8 * FH);
    efeito("alvo", 0.8, { cor: "rgba(255,193,69," });
    addText(player.x, player.y - 40, "BLINDAGEM ÔMEGA", "#FFC145");
  },
  apocalipse() {
    if (S.apocalipse) {   // já ligado: não faz nada, ele não desliga
      addText(player.x, player.y - 46, "JÁ ESTÁ ROLANDO", "#FF4D8F");
      return;
    }
    S.apocalipse = true;
    S.apocT = 0;
    S.apocPasso = 0;
    S.banner = { text: "☢ APOCALIPSE ÔMEGA ☢", sub: "arsenal solto até o fim da fase", t: 3.4 };
    efeito("flash", 0.6, { cor: "rgba(255,220,150," });
    efeito("choque", 1.4, { r: 620, cor: "rgba(255,77,143," });
    efeito("feixe", 1.4, { x: W / 2, larg: 110, cor: "rgba(255,193,69," });
    S.shake = 26;
    AudioSys.bigBoom();
    vibrate([90, 60, 90, 60, 160]);
    // já começa com tudo em campo
    chamarTropa("tanque", 6);
    chamarTropa("soldado", 10);
    chamarTropa("heli", 2);
    canhaoOrbital();
    player.invuln = Math.max(player.invuln, 6);
    renderHabBar(true);
  },
  operacao() {
    S.banner = { text: "OPERAÇÃO ÔMEGA", sub: "arsenal completo", t: 2.4 };
    efeito("flash", 0.45, { cor: "rgba(255,220,150," });
    efeito("choque", 1.2, { r: 520, cor: "rgba(255,193,69," });
    ogivaNuclear();
    bombardeioAereo(3);
    chamarTropa("tanque", 5);
    chamarTropa("soldado", 8);
    chamarTropa("heli", 2);
    pedirArtilharia(12);
    canhaoOrbital();
    player.invuln = Math.max(player.invuln, 5);
  },

  /* ----- B-2 Spirit ----- */
  bombardeio() {
    const nb = Math.round(8 * FH);
    for (let k = 0; k < nb; k++) {
      bombas.push({ x: player.x + (k - (nb - 1) / 2) * 26, y: player.y - 12,
                    vy: -30 - k * 6, t: 0.35 + k * 0.06, raio: 78 * FH });
    }
    efeito("cruz", 1.0, { n: 8, cor: "rgba(255,158,77," });
    addText(player.x, player.y - 34, "BOMBARDEIO", "#FF9E4D");
  },
  buraco() {
    buracos.push({ x: player.x + rand(-40, 40), y: Math.max(120, player.y - 240),
                   r: 30 * FH, t: 7 * FH, pulso: 0 });
    efeito("redemoinho", 1.4, { x: player.x, y: Math.max(120, player.y - 240),
                                r: 130, cor: "rgba(195,77,255," });
    addText(player.x, player.y - 34, "BURACO NEGRO", "#C34DFF");
  },
  furtivo() { player.invis = 5 * FH; AudioSys.cloak();
    efeito("fantasmas", 5 * FH); addText(player.x, player.y - 34, "FURTIVO", "#C34DFF"); },
  cruzador() {
    missilesArr.push({ x: player.x, y: player.y - 10, vx: 0, vy: -300, t: 4, r: 10, pesado: true });
    efeito("mira", 1.0, { cor: "rgba(255,193,69," });
    addText(player.x, player.y - 34, "MÍSSIL CRUZADOR", "#FFC145");
  },
  emp() {
    limparTiros("EMP");
    for (const e of enemies) e.frozenT = Math.max(e.frozenT || 0, 4 * FH);
    if (boss) boss.frozenT = Math.max(boss.frozenT || 0, 4 * FH);
    efeito("flash", 0.4, { cor: "rgba(150,220,255," });
    efeito("choque", 0.9, { r: 480, cor: "rgba(77,232,255," });
    for (let k = 0; k < 3; k++) {
      setTimeout(() => AudioSys.tone(180 + k * 120, 0.18, "square", 0.12, 60), k * 90);
    }
  },
  napalm() {
    const nf = Math.round(7 * FH);
    for (let k = 0; k < nf; k++) {
      fogo.push({ x: rand(30, W - 30), y: rand(H * 0.12, H * 0.62), r: 46 * FH, t: 5 });
    }
    efeito("respingo", 0.9, { r: 200, cor: "rgba(255,123,77," });
    addText(player.x, player.y - 34, "NAPALM", "#FF7B4D");
  },
  titanio() {
    player.shield = ST.shieldDur * 1.5 * FH;
    player.invuln = Math.max(player.invuln, 3 * FH);
    efeito("domo", 3 * FH);
    efeito("alvo", 0.8, { cor: "rgba(255,193,69," });
    addText(player.x, player.y - 34, "ESCUDO DE TITÂNIO", "#FFC145");
  },
  escolta() {
    S.hiveT = Math.max(S.hiveT, 10 * FH);
    efeito("colmeia", 10 * FH);
    addText(player.x, player.y - 34, "ESCOLTA", "#4DE8FF");
  },
  contra() {
    const n = limparTiros("CONTRAMEDIDAS");
    danoEmArea(player.x, player.y, 200 * FH, (2 + n * 0.4) * ST.dmg * FH, "#4DE8FF");
    efeito("choque", 0.7, { r: 240 * FH, cor: "rgba(77,232,255," });
  },

  /* ----- Trono Real: o arsenal de cocô ----- */
  bombaCoco() {
    const n = Math.round(6 * FH);
    for (let k = 0; k < n; k++) {
      bombas.push({ x: player.x + rand(-70, 70), y: player.y - 10,
                    vy: -55 - k * 8, t: 0.4 + k * 0.07, raio: 74 * FH, coco: true });
    }
    AudioSys.explode();
    efeito("respingo", 0.9, { r: 180, cor: "rgba(140,98,57," });
    addText(player.x, player.y - 34, "BOMBA DE COCÔ 💩", "#C08B45");
  },
  descarga() {
    const n = limparTiros("DESCARGA");
    danoEmArea(W / 2, H / 2, Math.max(W, H), (6 + n * 0.3) * ST.dmg * FH, "#7CE8FF");
    for (let k = 0; k < 46; k++) {
      const a = (k / 46) * TAU * 2;
      particles.push({ x: player.x, y: player.y,
                       vx: Math.cos(a) * (150 + k * 7), vy: Math.sin(a) * (150 + k * 7),
                       t: 0.8, max: 0.8, color: k % 3 ? "#5FD6FF" : "#C08B45", r: 3 });
    }
    S.shake = Math.max(S.shake, 12);
    AudioSys.bigBoom();
    efeito("redemoinho", 1.3, { r: 220, cor: "rgba(95,214,255," });
    efeito("choque", 0.8, { r: 460, cor: "rgba(95,214,255," });
    addText(player.x, player.y - 34, "DESCARGA SUPREMA 🌀", "#5FD6FF");
  },
  gasLetal() {
    const n = Math.round(5 * FH);
    for (let k = 0; k < n; k++) {
      fogo.push({ x: player.x + rand(-100, 100), y: player.y + rand(-140, 40),
                  r: 56 * FH, t: 6, coco: true });
    }
    efeito("respingo", 1.1, { r: 190, cor: "rgba(155,212,107," });
    addText(player.x, player.y - 34, "GÁS LETAL ☁", "#9BD46B");
  },
  papel() {
    for (const e of enemies) e.frozenT = Math.max(e.frozenT || 0, 4 * FH);
    if (boss) boss.frozenT = Math.max(boss.frozenT || 0, 4 * FH);
    limparTiros("PAPEL HIGIÊNICO");
    efeito("mira", 1.2, { cor: "rgba(240,240,240," });
    addText(player.x, player.y - 34, "PAPEL HIGIÊNICO 🧻", "#EFEFEF");
  },
  tampa() {
    player.shield = ST.shieldDur * 1.5 * FH;
    player.invuln = Math.max(player.invuln, 4 * FH);
    efeito("domo", 4 * FH);
    efeito("alvo", 0.8, { cor: "rgba(240,240,240," });
    addText(player.x, player.y - 34, "TAMPA FECHADA", "#EFEFEF");
  },
  chuvaCoco() {
    S.chuvaCoco = Math.max(S.chuvaCoco || 0, 5 * FH);
    S.cocoT = 0;
    S.cocoRaio = 66 * FH;
    efeito("cruz", 1.6, { n: 10, cor: "rgba(192,139,69," });
    addText(player.x, player.y - 40, "CHUVA MARROM", "#C08B45");
  },
  ralo() {
    buracos.push({ x: player.x + rand(-30, 30), y: Math.max(140, player.y - 250),
                   r: 34 * FH, t: 8 * FH, pulso: 0, coco: true });
    efeito("redemoinho", 1.6, { x: player.x, y: Math.max(140, player.y - 250),
                                r: 150, giro: -1, cor: "rgba(140,98,57," });
    addText(player.x, player.y - 34, "RALO SEM FUNDO 🚽", "#8C6239");
  },
  intestinal() {
    S.banner = { text: "💩 EXPLOSÃO INTESTINAL 💩", sub: "todo o arsenal do trono", t: 2.6 };
    efeito("flash", 0.5, { cor: "rgba(190,150,90," });
    efeito("choque", 1.3, { r: 560, cor: "rgba(155,212,107," });
    S.shake = Math.max(S.shake, 22);
    EFEITOS.bombaCoco();
    EFEITOS.gasLetal();
    EFEITOS.papel();
    EFEITOS.chuvaCoco();
    EFEITOS.descarga();
    EFEITOS.ralo();
    player.invuln = Math.max(player.invuln, 4 * FH);
    vibrate([80, 50, 80, 50, 140]);
  }
};

function usarHabilidade(h) {
  if (S.mode !== "playing" || !player.alive || h.combo) return;
  if ((habCd[h.id] || 0) > 0) return;
  const fn = EFEITOS[h.id];
  if (!fn) return;
  try { comboHabTentar(h.id); } catch (e) {}
  FH = habForca(h.id);           // quanto o nível dela deixa mais forte
  try { mpAvisarPoder("hab", h.nome); } catch (e) {}
  fn();
  FH = 1;
  habCd[h.id] = habRecarga(h.cd, h.id);   // o supremo tem cd 0: pode apertar sempre
  AudioSys.ultFire();
  vibrate(25);
  renderHabBar();
}

/* ---------- Espaço dos controles de baixo ----------
   Um lugar só decide quanto da tela os botões ocupam: a barra de
   habilidades se ajusta para caber, e o jogo usa a mesma conta para saber
   até onde a nave e as tropas podem descer. Assim nada fica escondido
   atrás de botão nem sai da tela, em qualquer celular.                   */
let habAltura = 0;       // altura em px de tela da fila de habilidades
const CONSOLE_BASE = 94; // ult/capa embaixo (66px + folga)
/* a fila pode ficar guardada: em tela pequena ela cobria meia partida */
let habGuardada = storageGet("nn_hab_guardada", "0") === "1";
function habAlternar() {
  habGuardada = !habGuardada;
  storageSet("nn_hab_guardada", habGuardada ? "1" : "0");
  renderHabBar(true);
  AudioSys.tone(habGuardada ? 420 : 620, 0.05, "sine", 0.1);
}

function ajustarBarraHab(quantas) {
  const bar = $("hab-bar");
  if (!bar) return;
  if (!quantas) { habAltura = 0; return; }
  if (habGuardada) { habAltura = 0; return; }
  const larg = Math.max(200, window.innerWidth - 16);
  const alt = window.innerHeight;
  let gap = alt < 620 ? 5 : 6;
  let tam = alt < 620 ? 38 : larg < 360 ? 40 : 44;
  if (naArena()) tam = Math.round(tam * 0.82);   // arena: botão menor, mais jogo
  let porLinha = 1, linhas = 1;
  // encolhe até caber em no máximo duas filas
  for (let volta = 0; volta < 8; volta++) {
    porLinha = Math.max(1, Math.floor((larg + gap) / (tam + gap)));
    linhas = Math.ceil(quantas / porLinha);
    if (linhas <= 2 || tam <= 28) break;
    tam -= 3;
  }
  // se mesmo assim passar de duas filas, aperta o espaçamento
  if (linhas > 2) { gap = 4; porLinha = Math.max(1, Math.floor((larg + gap) / (tam + gap)));
                    linhas = Math.ceil(quantas / porLinha); }
  /* Escrever variável de CSS obriga o navegador a recalcular o estilo da
     página inteira. Isto aqui roda quatro vezes por segundo, e a página é
     grande: em celular fraco dava para sentir a queda com a fila aberta.
     Agora só escreve quando o valor muda de verdade.                   */
  if (bar.dataset.tam !== String(tam)) {
    bar.dataset.tam = String(tam);
    bar.style.setProperty("--hab-tam", tam + "px");
  }
  if (bar.dataset.gap !== String(gap)) {
    bar.dataset.gap = String(gap);
    bar.style.setProperty("--hab-gap", gap + "px");
    bar.style.setProperty("--console-base", CONSOLE_BASE + "px");
  }
  habAltura = linhas * (tam + gap) + 6;
}
/* posiciona a vida e o botão de guardar conforme o espaço em uso */
let rodapeUltimo = -1;
function ajustarRodape(quantas) {
  const raiz = document.documentElement;
  // mesma economia da barra: só mexe no CSS quando a altura muda
  if (rodapeUltimo !== habAltura) {
    rodapeUltimo = habAltura;
    raiz.style.setProperty("--vida-base", (CONSOLE_BASE + habAltura + 6) + "px");
    raiz.style.setProperty("--abrir-base", (CONSOLE_BASE + habAltura + 4) + "px");
  }
  const bt = $("hab-abrir");
  if (bt) {
    bt.classList.toggle("on", quantas > 0 && S.mode === "playing");
    bt.classList.toggle("guardada", habGuardada);
    const n = bt.querySelector("i");
    if (n) n.textContent = String(quantas);
  }
  const vd = $("hud-vida");
  if (vd) vd.classList.toggle("on", S.mode === "playing" || S.mode === "paused");
}
/* altura, em pixels de tela, tomada pelos controles de baixo.
   Inclui a faixa de vida, que fica entre a nave e os botões — assim a
   barrinha nunca cobre a nave. Com a fila guardada sobra a tela quase
   inteira para jogar.                                                */
const ALTURA_VIDA = 44;
function alturaConsole() {
  return CONSOLE_BASE + habAltura + ALTURA_VIDA;
}
/* mesma coisa, já convertida para a medida da arena */
function chaoDaArena() { return H - pxY(alturaConsole()); }
/* até onde a nave pode descer sem sumir atrás dos botões */
function limiteBaixo() {
  return Math.max(H * 0.45, chaoDaArena() - player.r);
}

function renderHabBar(forcar) {
  const bar = $("hab-bar");
  if (!bar) return;
  const lista = habilidadesDaNave();
  if (!lista.length || S.mode !== "playing") {
    bar.style.display = "none";
    habAltura = 0;
    ajustarRodape(0);
    return;
  }
  bar.style.display = habGuardada ? "none" : "flex";
  bar.classList.toggle("fechada", habGuardada);
  ajustarBarraHab(lista.length);
  ajustarRodape(lista.length);
  if (habGuardada) return;
  const marca = save.ship + "|" + (modoPC ? "pc" : "t");
  if (forcar || bar.dataset.nave !== marca) {
    bar.dataset.nave = marca;
    bar.innerHTML = "";
    let n = 0;
    for (const h of lista) {
      const b = document.createElement("button");
      b.className = "hab-btn" + (h.combo ? " combo" : "") + (h.supremo ? " supremo" : "");
      b.dataset.id = h.id;
      const tecla = h.combo ? null : TECLAS_HAB[n++];
      const nv = nivelAtivo(h.id);
      b.title = h.nome + (nv ? " (nível " + nv + ")" : "") + " — " + h.desc +
        (tecla && modoPC ? "  [" + tecla.toUpperCase() + "]" : "");
      b.innerHTML = '<span class="ic">' + h.icone + "</span>" +
        (nv ? '<span class="hab-nv">' + nv + "</span>" : "") +
        (tecla && modoPC ? '<span class="hab-tecla">' + tecla.toUpperCase() + "</span>" : "");
      if (!h.combo) b.addEventListener("click", () => usarHabilidade(h));
      bar.appendChild(b);
    }
  }
  for (const h of lista) {
    const b = bar.querySelector('[data-id="' + h.id + '"]');
    if (!b) continue;
    const cd = habCd[h.id] || 0;
    b.classList.toggle("pronta", !h.combo && cd <= 0);
    if (h.supremo) b.classList.toggle("ligado", !!S.apocalipse);
    let capa = b.querySelector(".hab-cd");
    if (cd > 0) {
      if (!capa) {
        capa = document.createElement("span");
        capa.className = "hab-cd";
        b.appendChild(capa);
      }
      capa.textContent = Math.ceil(cd);
    } else if (capa) {
      capa.remove();
    }
  }
}

/* =====================================================================
   ARSENAL DO ÔMEGA-9 — tropas, bombardeios e ogivas
   ---------------------------------------------------------------------
   As tropas chamadas atiram sozinhas: os tiros delas entram na mesma
   lista de tiros do jogador (com força própria), então acertam inimigos
   e chefes igual. Tanques, soldados e helicópteros ficam até o fim da
   fase; os bombardeiros passam e vão embora.
   ===================================================================== */
function alvoMaisProximo(x, y) {
  let melhor = null, d = Infinity;
  for (const e of enemies) {
    if (!e) continue;
    const dd = dist2(x, y, e.x, e.y);
    if (dd < d) { d = dd; melhor = e; }
  }
  if (!melhor && boss && !boss.entering) return { x: boss.x, y: boss.y };
  return melhor;
}
function tiroAliado(x, y, alvo, forca, cor, vel) {
  const ang = alvo ? Math.atan2(alvo.y - y, alvo.x - x) : -Math.PI / 2;
  const v = vel || 560;
  bullets.push({
    x, y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v,
    r: 4, fix: forca, pierce: 0, aliado: cor || "#7CF7C0"
  });
}
function chamarTropa(tipo, quantos) {
  const nomes = { tanque: "TANQUES A POSTOS", soldado: "PELOTÃO DESEMBARCADO",
                  heli: "HELICÓPTEROS EM APOIO" };
  for (let i = 0; i < quantos; i++) {
    const chao = chaoDaArena() - 34;   // logo acima dos botões de baixo
    if (tipo === "tanque") {
      aliados.push({ tipo, x: (W / (quantos + 1)) * (i + 1) + rand(-14, 14),
                     y: chao - rand(0, 22), vx: rand(-18, 18),
                     t: 0, cd: rand(0.2, 0.7), vida: 999 });
    } else if (tipo === "soldado") {
      aliados.push({ tipo, x: (W / (quantos + 1)) * (i + 1) + rand(-18, 18),
                     y: chao + 20 + rand(0, 16), vx: rand(-26, 26),
                     t: 0, cd: rand(0.1, 0.5), vida: 999 });
    } else if (tipo === "heli") {
      aliados.push({ tipo, x: i === 0 ? 46 : W - 46, y: H * 0.42 + rand(-30, 30),
                     ang: i === 0 ? 0 : Math.PI, raio: 54, t: rand(0, 3),
                     cd: rand(0.1, 0.4), vida: 999 });
    }
  }
  if (aliados.length > 60) aliados.splice(0, aliados.length - 60);
  addText(player.x, player.y - 40, nomes[tipo] || "REFORÇO", "#7CF7C0");
  AudioSys.power();
}
function bombardeioAereo(quantos) {
  for (let i = 0; i < quantos; i++) {
    aliados.push({ tipo: "aviao", x: -60 - i * 130, y: 70 + i * 46,
                   vx: 320, t: 0, cd: 0.22, vida: 1, fim: 14 });
  }
  addText(player.x, player.y - 40, "ESQUADRÃO A CAMINHO", "#4DE8FF");
  AudioSys.bossAlert();
}
/* suave = ogiva disparada em série pelo Apocalipse: mesmo estrago, mas com
   clarão curto e sem a vibração toda — senão a tela vive branca.        */
function ogivaNuclear(suave) {
  S.superNova = suave ? 0.32 : 1.2;
  S.superNovaMax = suave ? 0.32 : 1.2;
  S.superNovaForca = suave ? 0.4 : 1;
  S.shake = suave ? 14 : 30;
  AudioSys.bigBoom();
  if (!suave) setTimeout(() => AudioSys.bigBoom(), 260);
  vibrate(suave ? 40 : [120, 70, 180]);
  explosion(W / 2, H * 0.45, "#FFFFFF", 90, 620);
  explosion(W / 2, H * 0.45, "#FFC145", 70, 500);
  explosion(W / 2, H * 0.45, "#FF7B4D", 60, 420);
  enemyBullets.length = 0;
  // varre a onda inteira
  for (let j = enemies.length - 1; j >= 0; j--) damageEnemy(enemies[j], j, 999999, false);
  S.toSpawn = 0;
  if (boss && !boss.entering) {
    for (const z of bossZones()) damageBossZone(z, 60 * ST.dmg);
  }
  addText(player.x, player.y - 46, "☢ OGIVA NUCLEAR", "#FFC145");
}
function pedirArtilharia(quantos) {
  for (let i = 0; i < quantos; i++) {
    obuses.push({ x: rand(40, W - 40), y: rand(70, H * 0.62),
                  t: 0.75 + i * 0.16, r: 62 });
  }
  addText(player.x, player.y - 40, "ARTILHARIA CHAMADA", "#FFC145");
  AudioSys.beamWarn();
}
function canhaoOrbital() {
  laserOrbital = { x: 20, dir: 1, t: 2.6, largura: 34 };
  AudioSys.beamWarn();
  addText(player.x, player.y - 40, "CANHÃO ORBITAL", "#C34DFF");
}

function atualizarAliados(dt) {
  /* --- tropas --- */
  for (let i = aliados.length - 1; i >= 0; i--) {
    if (i >= aliados.length) { i = aliados.length; continue; }
    const a = aliados[i];
    if (!a) continue;
    a.t += dt;
    a.cd -= dt;
    if (a.tipo === "aviao") {
      a.x += a.vx * dt;
      if (a.cd <= 0 && a.x > 0 && a.x < W) {
        a.cd = 0.22;
        // solta bombas que explodem em área
        blastArea(a.x, a.y + 40, 58, 3.2 * ST.dmg);
        explosion(a.x, a.y + 40, "#FFC145", 12, 180);
      }
      if (a.x > W + 80) { aliados.splice(i, 1); continue; }
    } else if (a.tipo === "heli") {
      a.ang += dt * 0.8;
      a.x = clamp(W / 2 + Math.cos(a.ang) * (W * 0.34), 30, W - 30);
      a.y = H * 0.42 + Math.sin(a.ang * 1.6) * 40;
      if (a.cd <= 0) {
        a.cd = 0.16;
        const alvo = alvoMaisProximo(a.x, a.y);
        if (alvo) tiroAliado(a.x, a.y + 8, alvo, 1.1, "#4DE8FF", 620);
      }
    } else {
      // tanques e soldados patrulham a base da tela
      a.x += a.vx * dt;
      if (a.x < 24 || a.x > W - 24) a.vx *= -1;
      if (a.cd <= 0) {
        const alvo = alvoMaisProximo(a.x, a.y);
        if (alvo) {
          if (a.tipo === "tanque") {
            a.cd = 0.55;
            tiroAliado(a.x, a.y - 12, alvo, 2.4, "#FFC145", 520);
            explosion(a.x, a.y - 14, "#FFC145", 3, 90);
          } else {
            a.cd = 0.3;
            tiroAliado(a.x, a.y - 8, alvo, 0.7, "#7CF7C0", 600);
          }
        } else a.cd = 0.3;
      }
    }
  }
  /* --- obuses da artilharia --- */
  for (let i = obuses.length - 1; i >= 0; i--) {
    const o = obuses[i];
    if (!o) continue;
    o.t -= dt;
    if (o.t <= 0) {
      explosion(o.x, o.y, "#FFC145", 26, 300);
      explosion(o.x, o.y, "#FF7B4D", 18, 220);
      blastArea(o.x, o.y, o.r, 7 * ST.dmg);
      S.shake = Math.max(S.shake, 9);
      AudioSys.explode();
      obuses.splice(i, 1);
    }
  }
  /* --- canhão orbital --- */
  if (laserOrbital) {
    const L = laserOrbital;
    L.t -= dt;
    L.x += L.dir * (W / 2.2) * dt;
    if (L.x > W - 10) { L.x = W - 10; L.dir = -1; }
    if (L.x < 10) { L.x = 10; L.dir = 1; }
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      if (!e) continue;
      if (Math.abs(e.x - L.x) < L.largura / 2 + e.r) damageEnemy(e, j, 26 * ST.dmg * dt, false);
    }
    if (boss && !boss.entering && Math.abs(boss.x - L.x) < L.largura / 2 + boss.r) {
      const zs = bossZones();
      if (zs.length) damageBossZone(zs[zs.length - 1], 18 * ST.dmg * dt);
    }
    for (let k = enemyBullets.length - 1; k >= 0; k--) {
      const b = enemyBullets[k];
      if (b && Math.abs(b.x - L.x) < L.largura / 2) enemyBullets.splice(k, 1);
    }
    if (L.t <= 0) laserOrbital = null;
  }
  /* --- clarões do Selo do Juízo --- */
  for (let i = raios.length - 1; i >= 0; i--) {
    const r = raios[i];
    if (!r) { raios.splice(i, 1); continue; }
    r.t -= dt;
    if (r.t <= 0) raios.splice(i, 1);
  }
}

function desenharAliados() {
  /* clarão vertical do Selo do Juízo */
  for (const r of raios) {
    if (!r) continue;
    const a = clamp(r.t / 0.45, 0, 1);
    const g = ctx.createLinearGradient(r.x - 26, 0, r.x + 26, 0);
    g.addColorStop(0, "rgba(255,193,69,0)");
    g.addColorStop(0.5, "rgba(255,255,255," + (a * 0.85) + ")");
    g.addColorStop(1, "rgba(255,193,69,0)");
    ctx.fillStyle = g;
    ctx.fillRect(r.x - 26, 0, 52, H);
  }
  /* obuses marcados no chão antes de cair */
  for (const o of obuses) {
    if (!o) continue;
    const p = clamp(1 - o.t / 0.9, 0, 1);
    ctx.strokeStyle = "rgba(255,193,69," + (0.35 + p * 0.5) + ")";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(o.x, o.y, o.r * (0.35 + p * 0.65), 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(o.x - 9, o.y); ctx.lineTo(o.x + 9, o.y);
    ctx.moveTo(o.x, o.y - 9); ctx.lineTo(o.x, o.y + 9); ctx.stroke();
  }
  /* canhão orbital */
  if (laserOrbital) {
    const L = laserOrbital;
    const g = ctx.createLinearGradient(L.x - L.largura, 0, L.x + L.largura, 0);
    g.addColorStop(0, "rgba(195,77,255,0)");
    g.addColorStop(0.5, "rgba(230,180,255,.85)");
    g.addColorStop(1, "rgba(195,77,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(L.x - L.largura, 0, L.largura * 2, H);
    ctx.fillStyle = "rgba(255,255,255,.9)";
    ctx.fillRect(L.x - 2, 0, 4, H);
  }
  /* tropas */
  for (const a of aliados) {
    if (!a) continue;
    ctx.save();
    ctx.translate(a.x, a.y);
    if (a.tipo === "tanque") {
      ctx.fillStyle = "#5C7A4A";
      ctx.fillRect(-13, -6, 26, 12);
      ctx.fillStyle = "#3E5633";
      ctx.fillRect(-15, 3, 30, 5);
      ctx.fillStyle = "#7A9A63";
      ctx.fillRect(-6, -12, 12, 8);
      ctx.fillRect(-1.6, -22, 3.2, 12);
      ctx.fillStyle = "rgba(124,247,192,.85)";
      ctx.fillRect(-13, -9, 4, 2);
    } else if (a.tipo === "soldado") {
      ctx.fillStyle = "#6E8A55";
      ctx.beginPath(); ctx.arc(0, -7, 3.2, 0, TAU); ctx.fill();
      ctx.fillRect(-2.4, -4, 4.8, 8);
      ctx.fillStyle = "#3E5633";
      ctx.fillRect(-3.6, 4, 2.4, 4);
      ctx.fillRect(1.2, 4, 2.4, 4);
      ctx.fillStyle = "#EAF2FF";
      ctx.fillRect(2, -3, 7, 1.6);
    } else if (a.tipo === "aviao") {
      ctx.fillStyle = "#8FA9C4";
      ctx.beginPath();
      ctx.moveTo(16, 0); ctx.lineTo(-6, -5); ctx.lineTo(-14, -2);
      ctx.lineTo(-14, 2); ctx.lineTo(-6, 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#C7D8E8";
      ctx.fillRect(-4, -13, 5, 26);
      ctx.fillStyle = "rgba(77,232,255,.6)";
      ctx.fillRect(-18, -1.5, 6, 3);
    } else if (a.tipo === "heli") {
      ctx.fillStyle = "#4A6B7A";
      ctx.beginPath(); ctx.ellipse(0, 0, 12, 6, 0, 0, TAU); ctx.fill();
      ctx.fillRect(-18, -1.5, 10, 3);
      const r = a.t * 22;
      ctx.strokeStyle = "rgba(234,242,255,.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(r) * 20, Math.sin(r) * 5 - 8);
      ctx.lineTo(-Math.cos(r) * 20, -Math.sin(r) * 5 - 8);
      ctx.stroke();
    }
    ctx.restore();
  }
}

/* ---------- Início de fase ---------- */
function startGame(fase) {
  calcStats();
  /* a fase nova remonta o cenário com a qualidade que está valendo:
     sem isso ela às vezes voltava pesada com LEVE marcado na tela */
  try { qReaplicar(); } catch (e) {}
  S.mode = "playing";
  try { Musica.tocar(fase, isBossFase(fase) || arenaOndaChefe(fase)); } catch (e) {}
  S.fase = clamp(fase, 1, totalFasesDoModo());
  S.nWaves = faseWaves(S.fase);
  S.waveIdx = 1;
  S.score = 0; S.runGems = 0; S.shake = 0; S.time = 0;
  S.ultCharge = 0; S.furyT = 0; S.hiveT = 0; S.barrage = null; S.singu = null;
  // o Apocalipse vale só até a fase acabar: cada fase nova comeca zerada
  S.apocalipse = false; S.apocT = 0; S.apocPasso = 0; S.lentoT = 0; S.juizoPendente = false;
  EFX.length = 0;
  S.inicioFase = Date.now();
  S.danoLevado = 0; S.combo = 0; S.comboT = 0; S.comboMax = 0;
  contar("partidas");
  if (!save.desde) save.desde = Date.now();
  ASTEROIDES.length = 0;
  S.portal = null; S.naSecreta = false; S.astTimer = 0;
  if (!S.bossRush) { S.soChefe = false; }
  S.fuga = null; S.resgate = null;
  regraAplicar(S.fase);
  carregandoMostrar(S.fase);
  faseCartao(S.fase);
  if (tutoPrecisa()) tutoComecar();
  MP.meuDano = 0; MP.danoTotal = 0;
  player.lives = ST.maxLives;
  player.hp = ST.maxHp;
  player.weapon = 1;
  player.invuln = 2;
  player.shield = ST.startShield ? ST.shieldDur : 0;
  player.noShieldTime = 0;
  player.revivesUsed = 0;
  player.invis = 0; player.cloakCd = 0;
  player.alive = true; player.deadTimer = 0;
  player.fireTimer = 0; player.missileTimer = 0;
  player.droneFire = 0;
  player.x = player.tx = W / 2;
  player.y = player.ty = chaoDaArena() - pxY(18);
  player.droneX = player.x; player.droneY = player.y;
  bullets = []; enemyBullets = []; enemies = []; missilesArr = []; powerups = []; particles = []; texts = [];
  aliados = []; obuses = []; laserOrbital = null; raios = [];
  bombas = []; buracos = []; fogo = []; rasante = null;
  S.chuvaCoco = 0;
  habCd = {};
  boss = null;
  dragging = false; dragId = null;
  setupWave();
  updateHud();
  emotesVisiveis(!!MP.sala);
  try { revancheRender(null); } catch (e) {}
  ultBtn.style.display = "flex";
  ultBtnSync();
  $("hab-bar").dataset.nave = "";
  renderHabBar();
  cloakBtn.style.display = ST.cloak ? "flex" : "none";
  cloakBtn.disabled = false;
  cloakBtn.classList.add("ready");
  showScreen(null);
}

function waveIsBoss() {
  if (typeof MP !== "undefined" && MP && MP.modo === "arena") return arenaOndaChefe(S.fase);
  return isBossFase(S.fase) && S.waveIdx === S.nWaves;
}

function setupWave() {
  atualizarLeitura();
  /* anfitrião: conta a onda nova pela ligação direta antes de tudo, para
     o parceiro montar a mesma onda no mesmo instante */
  try { if (MP.sala && MP.host && mpCoop()) p2pMandarOnda(); } catch (e) {}
  // no cooperativo os dois aparelhos sorteiam a MESMA onda
  S.rng = (typeof MP !== "undefined" && MP && MP.modo === "arena")
    ? rngDe((S.fase * 2654435761) >>> 0)
    : (mpCoop() ? rngDe(sementeDaOnda(S.fase, S.waveIdx)) : Math.random);
  S.waveState = "spawning";
  serieDaOnda = 0;
  mpAbatidos = {};
  mpMeusAbates = [];
  /* fases com outra cara: em vez da onda de sempre, o desafio é outro */
  if (!S.bossRush && S.waveIdx === 1 && faseDePerseguicao(S.fase)) {
    S.toSpawn = 0;
    perseguicaoComecar();
    updateHud();
    return;
  }
  if (!S.bossRush && S.waveIdx === 1 && faseDeResgate(S.fase)) {
    resgateComecar();
  }
  if (waveIsBoss()) {
    S.toSpawn = 0;
    try { Musica.tocar(S.fase, true); } catch (e) {}   // tema do chefe
    spawnBoss();
    S.banner = { text: "⚠ CHEFE ⚠", sub: boss.bname, t: 2.6 };
    try { chefeApresentar(boss.bname, fraseDoChefe(S.fase)); } catch (e) {}
    AudioSys.bossAlert();
  } else {
    const dl = dLevel();
    const A = adapt();
    const D = dificuldadeAtual();
    // a onda engorda até o fim do jogo e não empaca no meio: 9 inimigos na
    // primeira fase, ~100 lá na 270 — e no difícil passa bem disso. A arena
    // maior comporta: quanto mais larga a tela, mais gente cabe sem amontoar.
    const espaco = clamp((W * H) / (430 * 800), 0.9, 1.4);
    const base = (7 + Math.round(Math.pow(dl, 0.76) * 0.95)) * espaco;
    S.toSpawn = Math.max(3, Math.round(base * A.quantidade * D.qtd *
                (mundoAtivo("chuvisco") ? 2.4 : 1) * (regraAtiva("enxame") ? 2 : 1)));
    S.spawnTimer = 0.5;
    S.juizoPendente = !!ST.juizo;   // Selo do Juízo: cai no primeiro segundo da onda
    // a onda também dura mais: eles entram em fila, não todos de uma vez
    S.spawnInterval = clamp(1.05 - dl * 0.004, 0.34, 1.05) / (A.velocidade * D.vel);
    S.banner = { text: "ONDA " + S.waveIdx + "/" + S.nWaves, sub: S.waveIdx === 1 ? "FASE " + S.fase : "", t: 1.6 };
    if (S.waveIdx !== 1) { AudioSys.wave(); portalTalvez(); }
  }
  updateHud();
}

/* ---------- Inteligência adaptativa dos inimigos ----------
   Os inimigos "olham" como o jogador está montado e reagem:
   - defesa alta  -> vêm em maior quantidade e atiram mais
   - dano alto    -> ficam mais resistentes
   - cadência alta-> se espalham e desviam mais
   - agilidade alta-> miram prevendo o movimento
   O ataque deles cresce, mas sempre abaixo do que o jogador consegue: cada
   fator tem teto, e a soma é limitada para nunca virar impossível.          */
function leituraDoJogador() {
  const u = save.upgrades || {};
  const P = shipPartsOf(save.ship);
  const sh = SHIPS[save.ship] || SHIPS[0];
  const amu = equippedAmulets();
  const somaAmu = k => amu.reduce((t, a) => {
    const tp = AMULET_TYPES.find(x => x.id === a.type);
    return t + (tp && a.type === k ? tp.vals[a.rar] : 0);
  }, 0);

  // 0..1 em cada eixo
  const defesa = clamp(
    (u.hull || 0) / 5 * 0.35 + (u.shield || 0) / 5 * 0.2 +
    (P.armor || 0) / PART_MAX * 0.15 + branchCount("def") / 40 * 0.2 +
    Math.min(somaAmu("vida") / 3, 1) * 0.1, 0, 1);
  const ataque = clamp(
    (u.dmg || 0) / 15 * 0.4 + (P.cannon || 0) / PART_MAX * 0.15 +
    branchCount("atk") / 40 * 0.25 + (sh.baseDmg - 1) / 2 * 0.2, 0, 1);
  const cadencia = clamp(
    (u.rate || 0) / 10 * 0.5 + (P.turbine || 0) / PART_MAX * 0.25 +
    Math.min(somaAmu("cadencia") / 20, 1) * 0.25, 0, 1);
  const agilidade = clamp(
    (u.speed || 0) / 8 * 0.5 + (P.engine || 0) / PART_MAX * 0.3 +
    (sh.baseAgi - 1) / 0.5 * 0.2, 0, 1);
  const geral = clamp((defesa + ataque + cadencia + agilidade) / 4, 0, 1);
  return { defesa, ataque, cadencia, agilidade, geral };
}

let LEITURA = { defesa: 0, ataque: 0, cadencia: 0, agilidade: 0, geral: 0 };
function atualizarLeitura() {
  LEITURA = modoJusto() ? { defesa: 0, ataque: 0, cadencia: 0, agilidade: 0, geral: 0 }
                        : leituraDoJogador();
}

/* multiplicadores usados ao criar e mover inimigos */
function adapt() {
  const L = LEITURA;
  return {
    // defesa alta do jogador -> mais inimigos na tela
    quantidade: 1 + L.defesa * 0.9 + L.geral * 0.3,
    // dano alto -> inimigos mais resistentes (teto de +85%)
    vida: 1 + L.ataque * 0.85,
    // cadência alta -> eles se espalham e chegam mais rápido
    velocidade: 1 + L.cadencia * 0.35 + L.geral * 0.1,
    // eles atiram mais, mas o dano por tiro sobe pouco (teto de +30%)
    tiro: 1 + L.geral * 0.45,
    dano: 1 + L.geral * 0.3,
    // agilidade alta -> eles miram prevendo para onde você vai
    previsao: L.agilidade
  };
}

