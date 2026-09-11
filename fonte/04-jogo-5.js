/* =====================================================================
   RANQUEADA — achar partida sozinho, sem código
   ---------------------------------------------------------------------
   Cada um que aperta PROCURAR se anota em fila/<id> com o seu rank.
   Todo mundo lê a fila e escolhe o adversário de rank mais parecido.
   Para os dois não criarem sala ao mesmo tempo, quem tem o id MENOR cria
   e escreve o código na entrada do outro; o outro só entra. Sem sorteio,
   sem espera e sem duas salas.
   ===================================================================== */
const FILA = { procurando: false, relogio: null, desde: 0, fechar: null };

function rkAtualizarCartao() {
  const pts = save.rank || 0;
  $("rk-sim").textContent = simboloDoRank(pts);
  $("rk-sim").style.color = corDoRank(pts);
  $("rk-nome").textContent = nomeDoRank(pts);
  $("rk-nome").style.color = corDoRank(pts);
  $("rk-pts").textContent = fmt(pts) + " pontos de rank";
  const prox = proximoRank(pts);
  const atualMin = (RANKS.filter(r => pts >= r.min).pop() || RANKS[0]).min;
  if (prox) {
    const frac = clamp((pts - atualMin) / Math.max(1, prox.min - atualMin), 0, 1);
    $("rk-barra").style.width = (frac * 100) + "%";
    $("rk-prox").textContent = "Faltam " + fmt(prox.min - pts) + " para " + prox.sim + " " + prox.nome;
  } else {
    $("rk-barra").style.width = "100%";
    $("rk-prox").textContent = "Rank máximo alcançado";
  }
  const v = save.vitorias || 0, d = save.derrotas || 0;
  const tot = v + d;
  $("rk-placar").innerHTML =
    '<div><b style="color:#4CE07A">' + v + "</b><span>VITÓRIAS</span></div>" +
    '<div><b style="color:var(--danger)">' + d + "</b><span>DERROTAS</span></div>" +
    "<div><b>" + (tot ? Math.round(v / tot * 100) : 0) + "%</b><span>APROVEITAMENTO</span></div>";
}
function abrirRanked() {
  S.mode = "ranked";
  rkAtualizarCartao();
  try { temporadaRender(); historicoRender(); } catch (e) {}
  $("rk-busca").classList.remove("on");
  showScreen("ranked");
  rkContarFila();
}
async function rkContarFila() {
  const f = await nuvemReq("fila");
  const n = f ? Object.keys(f).filter(k => Date.now() - ((f[k] && f[k].ts) || 0) < 25000).length : 0;
  const el = $("ranked-fila");
  if (el) el.textContent = n ? n + " na fila" : "";
}

async function rkProcurar() {
  if (!nuvemAtiva()) return;
  AudioSys.resume();
  FILA.procurando = true;
  FILA.desde = Date.now();
  for (const id of ["rk-busca", "mrk-busca"]) {
    const el = $(id); if (el) el.classList.add("on");
  }
  for (const id of ["rk-procurar", "mrk-procurar"]) {
    const el = $(id); if (el) el.style.display = "none";
  }
  for (const id of ["rk-busca-txt", "mrk-busca-txt"]) {
    const el = $(id); if (el) el.textContent = "Procurando adversário…";
  }
  /* quem abandona fica um tempinho de fora da fila */
  const travada = filaTravada();
  if (travada > 0) {
    for (const id of ["rk-busca-txt", "mrk-busca-txt"]) {
      const el = $(id);
      if (el) el.textContent = "Você saiu no meio de um duelo. A fila volta em " +
        travada + " min.";
    }
    FILA.procurando = false;
    return;
  }
  mrkContarFila();
  const eu = mpMeuId();
  await nuvemSoltar("fila/" + eu, {
    nome: save.__name || "Piloto", rank: save.rank || 0, nave: save.ship, ts: Date.now()
  });
  if (FILA.relogio) clearInterval(FILA.relogio);
  FILA.relogio = setInterval(rkTentar, 1000);
  rkTentar();
  rkAtualizarFaixa();
}

/* ---------------------------------------------------------------------
   A fila continua rodando fora da tela da ranqueada.
   Antes, sair da tela cancelava a busca — então só dava partida se as
   duas pessoas apertassem PROCURAR quase no mesmo segundo, e na prática
   nunca puxava. Agora você aperta, volta para o menu, joga o que quiser,
   e quando alguém entrar na fila o duelo começa sozinho.
   --------------------------------------------------------------------- */
function rkAtualizarFaixa() {
  const el = $("fila-faixa");
  if (!el) return;
  el.classList.toggle("on", FILA.procurando);
  if (!FILA.procurando) return;
  const s2 = Math.round((Date.now() - FILA.desde) / 1000);
  el.innerHTML = "⚔ Procurando partida… <b>" + (s2 > 90 ? Math.floor(s2 / 60) + "min" : s2 + "s") +
    "</b>" + (FILA.naFila > 1 ? " · " + FILA.naFila + " na fila" : "") +
    ' <i id="fila-cancelar">cancelar</i>';
  const c = $("fila-cancelar");
  if (c) c.onclick = e => { e.stopPropagation(); rkPararBusca(true); AudioSys.deny(); };
}
async function rkTentar() {
  if (!FILA.procurando) return;
  const eu = mpMeuId();
  const fila = (await nuvemReq("fila")) || {};
  const minha = fila[eu];

  // alguém já me escolheu e criou a sala: é só entrar
  if (minha && minha.sala) {
    rkPararBusca(false);
    await nuvemReq("fila/" + eu, { method: "DELETE" });
    if (S.mode === "playing" || S.mode === "paused") return;   // não interrompe partida
    for (const id2 of ["rk-busca-txt", "mrk-busca-txt"]) {
      const el = $(id2); if (el) el.textContent = "Adversário encontrado!";
    }
    AudioSys.power();
    vibrate([60, 50, 100]);
    await mpEntrarSala(minha.sala, "pvp");
    return;
  }
  // me mantenho vivo na fila
  nuvemJuntar("fila/" + eu, { ts: Date.now() });

  const meuRank = save.rank || 0;
  const vivos = Object.keys(fila).filter(id => fila[id] && Date.now() - (fila[id].ts || 0) < 45000);
  FILA.naFila = vivos.length;
  const espera = (Date.now() - FILA.desde) / 1000;
  const janela = janelaDeElo(espera);
  const candidatos = vivos
    .filter(id => id !== eu && !fila[id].sala)
    .filter(id => !estaBloqueado(id))                       // não pareia com quem você bloqueou
    .filter(id => Math.abs((fila[id].rank || 0) - meuRank) <= janela)
    .sort((a, b) => Math.abs((fila[a].rank || 0) - meuRank) -
                    Math.abs((fila[b].rank || 0) - meuRank));
  if (S.mode === "ranked" || S.mode === "multi") {
    const txt = candidatos.length
      ? "Achei alguém! Preparando o duelo…"
      : "Procurando adversário… " + Math.round(espera) + "s" +
        (vivos.length > 1 ? " · " + vivos.length + " na fila" : " · você é o único na fila agora") +
        (janela < 99999 ? " · aceitando até " + janela + " de diferença" : " · aceitando qualquer nível");
    for (const id2 of ["rk-busca-txt", "mrk-busca-txt"]) {
      const el = $(id2); if (el) el.textContent = txt;
    }
    const nf = $("ranked-fila"); if (nf) nf.textContent = vivos.length + " na fila";
    const nf2 = $("mrk-fila"); if (nf2) nf2.textContent = vivos.length;
  }
  rkAtualizarFaixa();
  if (!candidatos.length) return;

  // só o de id menor cria a sala — assim nunca nascem duas
  const alvo = candidatos[0];
  if (eu > alvo) return;                 // o outro cria; eu espero o código
  /* a janela acima já cuida da diferença de nível */

  rkPararBusca(false);
  await mpCriarSala("pvp");
  if (!MP.sala) { rkProcurar(); return; }
  await nuvemJuntar("fila/" + alvo, { sala: MP.sala });
  await nuvemReq("fila/" + eu, { method: "DELETE" });
  $("sala-dica").textContent = "Adversário a caminho…";
  // o duelo começa sozinho assim que o outro entrar
  FILA.autoComecar = setInterval(() => {
    if (S.mode !== "sala") { clearInterval(FILA.autoComecar); return; }
    if (Object.keys(MP.outros).length >= 1) {
      clearInterval(FILA.autoComecar);
      mpComecar();
    }
  }, 400);
}
function rkPararBusca(limpar) {
  FILA.procurando = false;
  if (FILA.relogio) { clearInterval(FILA.relogio); FILA.relogio = null; }
  if (FILA.autoComecar) { clearInterval(FILA.autoComecar); FILA.autoComecar = null; }
  for (const id of ["rk-busca", "mrk-busca"]) {
    const el = $(id); if (el) el.classList.remove("on");
  }
  for (const id of ["rk-procurar", "mrk-procurar"]) {
    const el = $(id); if (el) el.style.display = "";
  }
  rkAtualizarFaixa();
  if (limpar) nuvemReq("fila/" + mpMeuId(), { method: "DELETE" });
}
$("btn-ranked").addEventListener("click", () => {
  if (!RANKED_LIGADO) return;
  AudioSys.resume(); abrirRanked();
});
$("rk-procurar").addEventListener("click", rkProcurar);
$("rk-cancelar").addEventListener("click", () => { rkPararBusca(true); AudioSys.deny(); });
$("pagar-voltar").addEventListener("click", () => { AudioSys.resume(); pagFechar(); });
$("jor-voltar").addEventListener("click", () => { AudioSys.resume(); abrirMulti("jornada"); });
$("jor-jogar").addEventListener("click", () => { AudioSys.resume(); jornadaJogar(); });
for (const b of document.querySelectorAll("#jor-abas .aba")) {
  b.addEventListener("click", () => { AudioSys.resume(); jornadaTrocarAba(b.dataset.jor); });
}
$("mrk-procurar").addEventListener("click", rkProcurar);
$("mrk-cancelar").addEventListener("click", () => { rkPararBusca(true); AudioSys.deny(); });

/* =====================================================================
   ARENA INFINITA
   ---------------------------------------------------------------------
   Uma arena só, para todo mundo, que nunca zera. Todos são aliados.
   Como não dá para o servidor mandar os inimigos, cada aparelho SORTEIA
   os mesmos inimigos a partir do número da onda: o sorteio é o mesmo em
   todo mundo, então ninguém precisa esperar a rede para jogar — por isso
   não trava nem fica lento. A rede só carrega três coisinhas:
     arena/onda   — a onda de agora (só sobe)
     arena/k/<id> — quantos inimigos e chefes CADA UM já derrubou
     arena/p/<id> — a posição da nave, para todos se verem
   O total mostrado é a soma de todo mundo, então nunca some nada e não
   existe briga de escrita entre os aparelhos.
   ===================================================================== */
const ARENA = {
  ligada: false, onda: 1, recorde: 1,
  meus: { i: 0, c: 0 },      // o que EU já derrubei nesta arena (acumulado)
  totais: { i: 0, c: 0 },
  gente: {}, fechar: null, envio: 0, sujo: false
};
function arenaModo() { return typeof MP !== "undefined" && MP && MP.modo === "arena"; }
function arenaCaminho() { return "arena"; }
function arenaOndaChefe(o) { return o % 5 === 0; }

function arenaAplicar(d) {
  if (!d) return;
  ARENA.onda = Math.max(1, d.onda || 1);
  ARENA.recorde = Math.max(ARENA.recorde, d.recorde || ARENA.onda);
  const k = d.k || {};
  let ti = 0, tc = 0;
  for (const id in k) { ti += (k[id] && k[id].i) || 0; tc += (k[id] && k[id].c) || 0; }
  ARENA.totais = { i: ti, c: tc };
  ARENA.gente = {};
  const est = d.jogadores || {}, mov = d.p || {};
  for (const id in est) ARENA.gente[id] = Object.assign({}, est[id]);
  for (const id in mov) {
    const o = mpDesempacotar(mov[id]);
    if (o) ARENA.gente[id] = Object.assign(ARENA.gente[id] || {}, o);
  }
  // durante a partida, os outros pilotos aparecem voando junto
  if (arenaModo()) {
    const vistos = {};
    for (const id in mov) {
      if (id === MP.eu) continue;
      const o = mpDesempacotar(mov[id]);
      if (!o) continue;
      vistos[id] = true;
      if (!MP.outros[id]) MP.outros[id] = {};
      Object.assign(MP.outros[id], o);
      mpGuardarPasso(MP.outros[id], o);   // naves lisas também na arena
      if (o.abates.length) mpAplicarAbates(o.abates);
    }
    for (const id in MP.outros) if (!vistos[id]) delete MP.outros[id];
    // alguém puxou a onda para a frente: acompanha na hora
    if (S.mode === "playing" && ARENA.onda > S.fase) arenaIrParaOnda(ARENA.onda);
  }
  const t = performance.now();
  if (t - (ARENA.ultimoDesenho || 0) < 120) return;
  ARENA.ultimoDesenho = t;
  arenaRenderTela();
  arenaRenderHud();
}
function arenaLigarFluxo() {
  if (ARENA.fechar) return;
  ARENA.fechar = nuvemFluxo(arenaCaminho(), arenaAplicar, () => {
    ARENA.relogio = setInterval(async () => {
      const d = await nuvemReq(arenaCaminho());
      arenaAplicar(d);
    }, 1200);
  });
}
function arenaDesligarFluxo() {
  if (ARENA.fechar) { ARENA.fechar(); ARENA.fechar = null; }
  if (ARENA.relogio) { clearInterval(ARENA.relogio); ARENA.relogio = null; }
}

async function abrirArena() {
  try { eventoArenaRender(); } catch (e) {}
  if (!nuvemAtiva()) return;
  S.mode = "arena";
  showScreen("arena");
  arenaLigarFluxo();
  const d = await nuvemReq(arenaCaminho());
  if (!d) {
    // primeira vez: cria a arena
    await nuvemSoltar(arenaCaminho() + "/onda", 1);
    await nuvemSoltar(arenaCaminho() + "/recorde", 1);
    ARENA.onda = 1;
  } else arenaAplicar(d);
  arenaRenderTela();
}
function arenaRenderTela() {
  if (S.mode !== "arena") return;
  const nums = $("arena-nums");
  if (!nums) return;
  nums.innerHTML =
    '<div class="arena-num destaque"><b>' + fmt(ARENA.onda) + "</b><span>ONDA DE AGORA</span></div>" +
    '<div class="arena-num"><b>' + fmt(ARENA.recorde) + "</b><span>MAIOR ONDA</span></div>" +
    '<div class="arena-num"><b>' + fmt(ARENA.totais.i) + "</b><span>INIMIGOS DERRUBADOS</span></div>" +
    '<div class="arena-num"><b>' + fmt(ARENA.totais.c) + "</b><span>CHEFES DERRUBADOS</span></div>";
  const box = $("arena-gente");
  const ids = Object.keys(ARENA.gente).filter(id => ARENA.gente[id] && ARENA.gente[id].nome);
  /* placar ao vivo dos três primeiros, que aparece DURANTE a partida */
  try {
    const meu = nuvemId(save.__name || "");
    arenaPlacarRender(ids.map(id => ({
      nome: ARENA.gente[id].nome, abates: ARENA.gente[id].abates || 0, eu: id === meu
    })).sort((x, y) => y.abates - x.abates));
  } catch (e) {}
  $("arena-online").textContent = ids.length + (ids.length === 1 ? " piloto" : " pilotos");
  box.innerHTML = "";
  if (!ids.length) {
    box.innerHTML = '<div class="adm-note">Ninguém agora. Entre e comece a onda ' + ARENA.onda + ".</div>";
    return;
  }
  for (const id of ids.slice(0, 20)) {
    const g = ARENA.gente[id];
    const row = document.createElement("div");
    row.className = "arena-p";
    const cv = document.createElement("canvas");
    cv.width = 68; cv.height = 68;
    const c2 = cv.getContext("2d");
    c2.setTransform(1.9, 0, 0, 1.9, 34, 36);
    try { drawShipSprite(c2, naveValida(g.nave || 0), 13); } catch (e) {}
    const n = document.createElement("div");
    n.className = "n";
    n.textContent = escaparTexto(g.nome) + (id === nuvemId(save.__name || "") ? " (você)" : "");
    const v = document.createElement("div");
    v.className = "v";
    v.textContent = g.hp !== undefined ? Math.max(0, g.hp) + " de vida" : "pronto";
    row.appendChild(cv); row.appendChild(n); row.appendChild(v);
    box.appendChild(row);
  }
}
function arenaRenderHud() {
  const el = $("arena-hud");
  if (!el) return;
  const mostra = arenaModo() && S.mode === "playing";
  el.classList.toggle("on", mostra);
  if (!mostra) return;
  el.innerHTML = "ONDA <b>" + fmt(S.fase) + "</b>" +
    "<i>☠ " + fmt(ARENA.totais.i) + "</i>" +
    "<i>👑 " + fmt(ARENA.totais.c) + "</i>" +
    "<i>👥 " + (Object.keys(MP.outros).length + 1) + "</i>";
}
function arenaAtualizarSelo() {
  const b = $("arena-badge");
  if (b) b.textContent = ARENA.onda > 1 ? "onda " + fmt(ARENA.onda) : "sem fim";
  const r = $("ranked-badge");
  if (r) r.textContent = simboloDoRank(save.rank || 0) + " " + (save.rank || 0);
}

async function arenaEntrar() {
  if (!nuvemAtiva()) return;
  AudioSys.resume();
  MP.sala = "arena"; MP.modo = "arena"; MP.host = false;
  MP.eu = mpMeuId(); MP.outros = {}; MP.fim = null; MP.meuDano = 0;
  ARENA.ligada = true;
  ajustarParaArena();   // arena afasta a câmera e encolhe os botões
  calcStats();
  // recupera o que eu já tinha derrubado nesta arena, para nunca diminuir
  const meu = await nuvemReq(arenaCaminho() + "/k/" + MP.eu);
  ARENA.meus = { i: (meu && meu.i) || 0, c: (meu && meu.c) || 0 };
  await nuvemSoltar(arenaCaminho() + "/jogadores/" + MP.eu, {
    nome: save.__name || "Piloto", nave: save.ship, rank: save.rank || 0, ts: Date.now()
  });
  const d = await nuvemReq(arenaCaminho());
  arenaAplicar(d);
  arenaLigarFluxo();
  arenaComecarOnda(Math.max(1, ARENA.onda));
}
function arenaComecarOnda(onda) {
  startGame(onda);
  S.banner = { text: "ARENA · ONDA " + onda, sub: "todo mundo é aliado", t: 2.2 };
  arenaRenderHud();
}
/* Pula para a onda que a arena está, sem parar o jogo.
   Antes isso apagava tudo de uma vez e dava a sensação de travada. Agora
   os seus tiros e os cristais que caíram continuam na tela, e os
   inimigos velhos somem numa explosãozinha em vez de sumir do nada.  */
function arenaIrParaOnda(onda) {
  if (!arenaModo() || S.mode !== "playing" || onda === S.fase) return;
  for (const e of enemies) {
    if (e && e.y > -20 && e.y < H + 20) explosion(e.x, e.y, "#C34DFF", 4, 120);
  }
  S.fase = onda;
  S.waveIdx = 1;
  S.nWaves = 1;
  enemies.length = 0;
  enemyBullets.length = 0;
  boss = null;
  MP.meuDano = 0;
  setupWave();
  S.banner = { text: "ONDA " + onda, sub: arenaOndaChefe(onda) ? "⚠ CHEFE" : "", t: 1.5 };
}
/* eu limpei a minha onda: soma o que derrubei e puxa a arena para a frente */
function arenaProximaOnda() {
  const prox = S.fase + 1;
  arenaSalvarPlacar(true);
  if (prox > ARENA.onda) {
    ARENA.onda = prox;
    nuvemSoltar(arenaCaminho() + "/onda", prox);
    if (prox > ARENA.recorde) {
      ARENA.recorde = prox;
      nuvemSoltar(arenaCaminho() + "/recorde", prox);
    }
  }
  save.arenaOnda = Math.max(save.arenaOnda || 0, S.fase);
  save.crystals += 6 + Math.round(S.fase * 1.5);
  persist();
  nuvemEnviar(false);
  arenaIrParaOnda(Math.max(prox, ARENA.onda));
}
/* conta um abate meu (some no total de todo mundo) */
function arenaContar(chefe) {
  if (!arenaModo()) return;
  if (chefe) { ARENA.meus.c++; save.arenaChefes = (save.arenaChefes || 0) + 1; }
  else { ARENA.meus.i++; save.arenaMortos = (save.arenaMortos || 0) + 1; }
  ARENA.sujo = true;
  arenaSalvarPlacar(false);
}
function arenaSalvarPlacar(agora) {
  if (!arenaModo() || !ARENA.sujo) return;
  const t = Date.now();
  if (!agora && t - ARENA.envio < 1500) return;   // junta os abates e manda de uma vez
  ARENA.envio = t;
  ARENA.sujo = false;
  nuvemSoltar(arenaCaminho() + "/k/" + MP.eu, { i: ARENA.meus.i, c: ARENA.meus.c });
}
function arenaSair() {
  arenaSalvarPlacar(true);
  if (MP.eu) {
    nuvemReq(arenaCaminho() + "/jogadores/" + MP.eu, { method: "DELETE" });
    nuvemReq(arenaCaminho() + "/p/" + MP.eu, { method: "DELETE" });
  }
  ARENA.ligada = false;
  MP.sala = null; MP.modo = null; MP.outros = {};
  ajustarParaArena();   // volta ao tamanho normal das fases
  calcStats();
  $("arena-hud").classList.remove("on");
  $("mp-placar").style.display = "none";
}
$("btn-arena").addEventListener("click", () => { AudioSys.resume(); abrirArena(); });
$("arena-entrar").addEventListener("click", arenaEntrar);

/* ----- telas e botões ----- */
function abrirMulti(aba) {
  S.mode = "multi";
  const c = $("aba-coop");
  if (c) c.style.display = COOP_LIGADO ? "" : "none";
  const r = $("aba-ranked");
  if (r) r.style.display = RANKED_LIGADO ? "" : "none";
  if (!COOP_LIGADO && (!aba || aba === "coop" || aba === "jornada")) aba = "amigos";
  if (!RANKED_LIGADO && aba === "ranked") aba = "pvp";
  trocarAbaMulti(aba || "jornada");
  atualizarPvpCartao();
  showScreen("multi");
}
/* =====================================================================
   TELAS DA JORNADA EM DUPLA
   ---------------------------------------------------------------------
   Aba nova no multijogador: uma lista com cada amigo e a jornada que
   vocês têm juntos. Toca no amigo, escolhe a fase (a próxima ou qualquer
   uma já vencida) ou compra melhorias que valem só naquela dupla, e
   aperta CHAMAR E COMEÇAR. A sala tem um número calculado a partir dos
   dois nicks, então ninguém precisa digitar código nenhum: os dois caem
   na mesma sala sozinhos.
   ===================================================================== */
const JOR = { amigo: null, chave: null, aba: "fases" };

/* junta os amigos de verdade (da nuvem) com os anotados neste aparelho */
function jornadaAmigos() {
  const nomes = [];
  const vistos = {};
  const por = (n) => {
    const k = nickSimples(n);
    if (!n || !k || vistos[k]) return;
    vistos[k] = 1; nomes.push(String(n));
  };
  try { for (const id in AM.lista) por(AM.lista[id].nome); } catch (e) {}
  for (const n of (save.amigos || [])) por(n);
  // quem já tem jornada aparece mesmo se saiu da lista
  for (const k in (save.jornadas || {})) {
    const j = save.jornadas[k];
    if (j && j.amigo) por(j.amigo);
  }
  return nomes;
}
function jornadaRenderLista() {
  const cx = $("jor-lista");
  if (!cx) return;
  const amigos = jornadaAmigos();
  cx.innerHTML = "";
  if (!amigos.length) {
    cx.innerHTML = '<div class="vazio"><b>👥</b><strong>NENHUM AMIGO AINDA</strong>' +
      '<span>Adicione alguém na aba AMIGOS para começar uma jornada. ' +
      'Cada amizade tem a jornada dela, com progresso e melhorias próprios.</span></div>';
    return;
  }
  for (const nome of amigos) {
    const j = jornadaDe(nome, false);
    const fase = j ? j.maior : 0;
    const pct = Math.round(Math.min(fase, TOTAL_FASES) / TOTAL_FASES * 100);
    const ups = j ? JORNADA_UP.reduce((t, u) => t + jornadaNivel(j, u.id), 0) : 0;
    const cartao = document.createElement("div");
    cartao.className = "jor-cartao" + (j ? "" : " nova");
    cartao.innerHTML =
      '<div class="jor-ic">' + (j ? "🚀" : "✦") + "</div>" +
      '<div class="jor-txt">' +
        '<b>' + escaparTexto(nome) + "</b>" +
        '<span>' + (j
          ? "Fase " + j.fase + " de " + TOTAL_FASES + " · maior: " + fase +
            (ups ? " · " + ups + " melhorias" : "")
          : "Jornada nova, começa na fase 1") + "</span>" +
        '<i class="jor-barra"><u style="width:' + pct + '%"></u></i>' +
      "</div>" +
      '<div class="jor-vai">' + (j ? "CONTINUAR" : "COMEÇAR") + "</div>";
    cartao.addEventListener("click", () => { AudioSys.resume(); abrirJornada(nome); });
    cx.appendChild(cartao);
  }
}

function abrirJornada(nome) {
  const j = jornadaDe(nome, true);
  JOR.amigo = nome;
  JOR.chave = chaveDupla(save.__name, nome);
  JOR.aba = "fases";
  j.quando = Date.now();
  persist();
  S.mode = "jornada";
  jornadaRender();
  showScreen("jornada");
}
function jornadaTrocarAba(a) {
  JOR.aba = a;
  for (const b of document.querySelectorAll("#jor-abas .aba")) {
    b.classList.toggle("on", b.dataset.jor === a);
  }
  $("jor-pane-fases").style.display = a === "fases" ? "block" : "none";
  $("jor-pane-up").style.display = a === "up" ? "block" : "none";
}
function jornadaRender() {
  const j = jornadaDe(JOR.amigo, true);
  if (!j) return;
  porCristais("jor-gems");
  $("jor-titulo").textContent = "COM " + String(JOR.amigo || "").toUpperCase().slice(0, 12);
  const pct = Math.round(Math.min(j.maior, TOTAL_FASES) / TOTAL_FASES * 100);
  $("jor-capa").innerHTML =
    '<div class="jor-capa-ic">🚀</div>' +
    '<div class="jor-capa-txt">' +
      "<b>" + escaparTexto(j.amigo) + "</b>" +
      "<span>Vocês estão na fase <b>" + j.fase + "</b> de " + TOTAL_FASES +
      " · " + pct + "% da jornada · " + (j.jogadas || 0) + " partidas juntos</span>" +
      '<i class="jor-barra"><u style="width:' + pct + '%"></u></i>' +
    "</div>";
  jornadaTrocarAba(JOR.aba);
  jornadaRenderFases(j);
  jornadaRenderUps(j);
  $("jor-dica").textContent = "A sala é a número " + codigoDaDupla(JOR.chave) +
    ". Peça para " + j.amigo + " abrir a mesma jornada: vocês caem juntos, sem digitar nada.";
}
function jornadaRenderFases(j) {
  const cx = $("jor-fases");
  if (!cx) return;
  cx.innerHTML = "";
  const feitas = Math.max(0, (j.maior || 1) - 1);
  const nSetores = Math.ceil(TOTAL_FASES / 20);
  for (let si = 0; si < nSetores; si++) {
    const de = si * 20 + 1, ate = Math.min(TOTAL_FASES, de + 19);
    if (de > j.maior) break;               // só mostra até onde a dupla chegou
    let prontas = 0;
    for (let f = de; f <= ate; f++) if (f <= feitas) prontas++;
    const total = ate - de + 1;
    const bloco = document.createElement("div");
    bloco.className = "setor-bloco";
    const cab = document.createElement("div");
    cab.className = "setor-cab" + (prontas === total ? " pronto" : "");
    cab.innerHTML =
      '<span class="setor-nome">' + (SECTOR_NAMES[si] || "SETOR " + (si + 1)) + "</span>" +
      '<span class="setor-barra"><i style="width:' + Math.round(prontas / total * 100) + '%"></i></span>' +
      '<span class="setor-cont">' + prontas + "/" + total + "</span>";
    bloco.appendChild(cab);
    const g = document.createElement("div");
    g.className = "fase-grid";
    for (let f = de; f <= ate; f++) {
      const b = document.createElement("button");
      b.className = "fase-btn";
      if (isBossFase(f)) b.classList.add("boss");
      if (f < j.maior) { b.classList.add("done"); b.innerHTML = f + "<small>★</small>"; }
      else if (f === j.maior) { b.classList.add("next"); b.innerHTML = f + "<small>" + (isBossFase(f) ? "CHEFE" : "AQUI") + "</small>"; }
      else { b.classList.add("locked"); b.textContent = f; }
      if (f === j.fase) b.classList.add("escolhida");
      if (f <= j.maior) {
        b.addEventListener("click", () => {
          AudioSys.resume();
          j.fase = f;
          persist();
          jornadaRender();
        });
      }
      g.appendChild(b);
    }
    bloco.appendChild(g);
    cx.appendChild(bloco);
  }
  requestAnimationFrame(() => {
    const alvo = cx.querySelector(".fase-btn.escolhida") || cx.querySelector(".fase-btn.next");
    if (alvo) alvo.scrollIntoView({ block: "center" });
  });
}
function jornadaRenderUps(j) {
  const cx = $("jor-ups");
  if (!cx) return;
  cx.innerHTML = "";
  for (const u of JORNADA_UP) {
    const nv = jornadaNivel(j, u.id);
    const row = document.createElement("div");
    row.className = "part-row";
    const pips = [];
    for (let k = 0; k < JORNADA_UP_MAX; k++) pips.push('<span class="pip' + (k < nv ? " on" : "") + '"></span>');
    row.innerHTML =
      '<div class="part-icon">' + u.icone + "</div>" +
      '<div class="part-info"><div class="part-name">' + u.nome + " · nível " + nv + "</div>" +
      '<div class="part-desc">' + u.desc + "</div>" +
      '<div class="pips">' + pips.join("") + "</div></div>";
    const btn = document.createElement("button");
    btn.className = "buy-btn";
    if (nv >= JORNADA_UP_MAX) {
      btn.classList.add("max"); btn.textContent = "MÁX"; btn.disabled = true;
    } else {
      const custo = jornadaCusto(u, nv);
      btn.textContent = "◆ " + fmt(custo);
      btn.disabled = save.crystals < custo;
      btn.addEventListener("click", () => {
        AudioSys.resume();
        if (save.crystals < custo) { AudioSys.deny(); return; }
        save.crystals -= custo;
        j.up[u.id] = nv + 1;
        persist(); calcStats();
        AudioSys.buy(); vibrate(20);
        jornadaRender();
      });
    }
    row.appendChild(btn);
    cx.appendChild(row);
  }
}
/* entra na sala da dupla: quem chegar primeiro cria, o outro entra */
async function jornadaJogar() {
  const j = jornadaDe(JOR.amigo, true);
  if (!j) return;
  if (!nuvemAtiva()) { avisoMulti("O modo online está desligado neste aparelho."); AudioSys.deny(); return; }
  const codigo = codigoDaDupla(JOR.chave);
  const bt = $("jor-jogar");
  bt.disabled = true;
  bt.textContent = "ABRINDO A SALA…";
  MP.jornadaChave = JOR.chave;
  MP.jornadaFase = j.fase;
  try {
    const sala = await nuvemReq("salas/" + codigo);
    const viva = sala && sala.criada && (Date.now() - sala.criada) < 3 * 3600000;
    if (viva && sala.modo === "coop") await mpEntrarSala(codigo, "coop");
    else await mpCriarSalaFixa(codigo, "coop");
    j.jogadas = (j.jogadas || 0) + 1;
    persist();
  } catch (e) {
    avisoMulti("Não deu para abrir a sala agora.");
  }
  bt.disabled = false;
  bt.textContent = "CHAMAR E COMEÇAR";
}

function trocarAbaMulti(aba) {
  for (const b of document.querySelectorAll("#multi-abas .aba")) {
    b.classList.toggle("on", b.dataset.modo === aba);
  }
  $("multi-jornada").style.display = aba === "jornada" ? "block" : "none";
  $("multi-coop").style.display = aba === "coop" ? "block" : "none";
  $("multi-pvp").style.display = aba === "pvp" ? "block" : "none";
  $("multi-ranked").style.display = aba === "ranked" ? "block" : "none";
  $("multi-amigos").style.display = aba === "amigos" ? "block" : "none";
  if (aba === "amigos") renderAmigos();
  if (aba === "jornada") jornadaRenderLista();
  if (aba === "ranked") mrkRender();
  mpNetTexto();
}
/* explica, na própria página, como a partida vai trafegar */
function mpNetTexto() {
  const txt = p2pTem() && typeof RTCPeerConnection === "function"
    ? "<b>⚡ Ligação direta</b> — os dois celulares conversam entre si, sem servidor no meio. " +
      "A nuvem só serve para vocês se acharem. Se a operadora não deixar, o jogo continua " +
      "pela nuvem sozinho, sem travar."
    : "Este aparelho não tem ligação direta: a partida vai pela nuvem.";
  for (const id of ["coop-net", "pvp-net"]) {
    const el = $(id);
    if (el) el.innerHTML = txt;
  }
}

/* ---------------------------------------------------------------------
   Aba da RANQUEADA dentro do multijogador: brasão, números da temporada,
   fila e a escada das divisões.
   --------------------------------------------------------------------- */
function mrkRender() {
  const pts = save.rank || 0;
  const r = rankDe(pts);
  $("mrk-sim").textContent = r.sim;
  $("mrk-sim").style.color = r.cor;
  $("mrk-nome").textContent = r.nome;
  $("mrk-nome").style.color = r.cor;
  $("mrk-pts").textContent = fmt(pts) + " pontos de rank";
  const prox = proximoRank(pts);
  const base = r.min, teto = prox ? prox.min : Math.max(pts, r.min + 1);
  const frac = prox ? clamp((pts - base) / Math.max(1, teto - base), 0, 1) : 1;
  $("mrk-barra").style.width = Math.round(frac * 100) + "%";
  $("mrk-prox").textContent = prox
    ? "Faltam " + fmt(prox.min - pts) + " para " + prox.sim + " " + prox.nome
    : "Rank máximo. Não tem para onde subir.";
  const v = save.vitorias || 0, d = save.derrotas || 0;
  $("mrk-vit").textContent = fmt(v);
  $("mrk-der").textContent = fmt(d);
  $("mrk-taxa").textContent = (v + d) ? Math.round((v / (v + d)) * 100) + "%" : "—";
  const esc = $("mrk-escada");
  esc.innerHTML = RANKS.map(x =>
    '<div class="rk-degrau' + (x.nome === r.nome ? " aqui" : "") + '">' +
      '<i style="color:' + x.cor + '">' + x.sim + "</i>" +
      "<b>" + x.nome + "</b><span>" + fmt(x.min) + " pts</span></div>").join("");
  mrkContarFila();
}
async function mrkContarFila() {
  const el = $("mrk-fila");
  if (!el) return;
  try {
    const f = await nuvemReq("fila");
    const n = f ? Object.keys(f).filter(k => Date.now() - ((f[k] && f[k].ts) || 0) < 25000).length : 0;
    el.textContent = n;
  } catch (e) { el.textContent = "0"; }
}
function atualizarPvpCartao() {
  const pts = save.rank || 0;
  $("pvp-meu-rank").textContent = simboloDoRank(pts) + " " + nomeDoRank(pts);
  const prox = proximoRank(pts);
  $("pvp-meus-pontos").title = prox ? "Faltam " + (prox.min - pts) + " para " + prox.nome : "Rank máximo!";
  $("pvp-meu-rank").style.color = corDoRank(pts);
  $("pvp-meus-pontos").textContent = pts;
  const prox2 = proximoRank(pts);
  $("pvp-meu-placar").textContent = (save.vitorias || 0) + " vitórias · " + (save.derrotas || 0) +
    " derrotas" + (prox2 ? " · faltam " + (prox2.min - pts) + " para " + prox2.sim + " " + prox2.nome : " · rank máximo");
}
async function renderAmigos() {
  const lista = $("amigos-lista");
  lista.innerHTML = "";
  const amigos = save.amigos || [];
  if (!amigos.length) {
    lista.innerHTML = '<div class="adm-note">Você ainda não adicionou ninguém. Use o campo acima ou a lista de jogadores online.</div>';
  }
  const online = await nuvemListar();
  const porNome = {};
  for (const o of online) porNome[o.nome] = o;
  for (const nome of amigos) {
    const o = porNome[nome];
    const linha = document.createElement("div");
    linha.className = "amigo-linha";
    const b = document.createElement("button");
    b.className = "profile-btn";
    const ativo = o && estaOnline(o);
    b.innerHTML = '<span class="profile-name">' + escaparTexto(nome) + "</span>" +
      '<span class="profile-meta">' +
        (ativo ? "🟢 " + escaparTexto(o.onde || "no jogo")
               : (o ? "⚫ fase " + (o.fase || 0) + " · visto " + tempoRelativo(o.atualizado)
                    : "sem dados")) +
      "</span>";
    b.addEventListener("click", () => { if (o) assistirJogador(o); });
    const olho = document.createElement("button");
    olho.className = "vivo-olho";
    olho.textContent = "👁";
    olho.title = "Ver a tela de " + nome;
    olho.disabled = !o;
    olho.addEventListener("click", () => { if (o) assistirJogador(o); });
    const x = document.createElement("button");
    x.className = "vivo-olho";
    x.textContent = "✕";
    x.title = "Remover " + nome;
    x.style.color = "var(--danger)";
    x.addEventListener("click", () => {
      save.amigos = (save.amigos || []).filter(y => y !== nome);
      persist();
      renderAmigos();
    });
    linha.appendChild(b); linha.appendChild(olho); linha.appendChild(x);
    lista.appendChild(linha);
  }
  const box = $("online-lista");
  box.innerHTML = "";
  const meu = save.__name;
  const outros = online.filter(o => o.nome !== meu).slice(0, 30);
  if (!outros.length) box.innerHTML = '<div class="adm-note">Ninguém online agora.</div>';
  for (const o of outros) {
    const linha = document.createElement("div");
    linha.className = "amigo-linha";
    const b = document.createElement("button");
    b.className = "profile-btn";
    const jaAmigo = (save.amigos || []).indexOf(o.nome) >= 0;
    b.innerHTML = '<span class="profile-name">' + escaparTexto(o.nome) +
        (estaOnline(o) ? ' <span style="color:#4CE07A">●</span>' : "") + "</span>" +
      '<span class="profile-meta">' + (jaAmigo ? "já é seu amigo · toque para ver a tela"
                                               : "👤+ adicionar") + "</span>";
    b.addEventListener("click", () => {
      if (jaAmigo) { assistirJogador(o); return; }
      save.amigos = save.amigos || [];
      save.amigos.push(o.nome);
      persist();
      AudioSys.buy();
      renderAmigos();
    });
    const olho = document.createElement("button");
    olho.className = "vivo-olho";
    olho.textContent = "👁";
    olho.title = "Ver a tela de " + o.nome;
    olho.addEventListener("click", () => assistirJogador(o));
    linha.appendChild(b); linha.appendChild(olho);
    box.appendChild(linha);
  }
}

/* o cooperativo está guardado: o botão do menu virou a aba AMIGOS.
   Estes ouvintes só existem se a tela do multijogador estiver na página. */
/* --- conversa com o administrador --- */
$("loja-adm").addEventListener("click", () => { AudioSys.resume(); suporteAbrir(); });
const btLojaAt = $("loja-atualizar");
if (btLojaAt) btLojaAt.addEventListener("click", () => admLojaCarregar());
const btLojaTudo = $("loja-ver-tudo");
if (btLojaTudo) btLojaTudo.addEventListener("click", () => {
  admLojaMostrarTudo = !admLojaMostrarTudo;
  btLojaTudo.textContent = admLojaMostrarTudo ? "SÓ OS QUE ESPERAM" : "MOSTRAR JÁ ENTREGUES";
  admLojaRender();
});
$("sup-voltar").addEventListener("click", () => {
  suporteDesligar();
  S.mode = "loja";
  renderLoja();
  showScreen("loja");
});
function mandarSuporte() {
  const el = $("sup-campo");
  const t = el.value;
  if (!t.trim()) return;
  el.value = "";
  suporteEnviar(t).then(ok => { if (!ok) el.value = t; });
}
$("sup-enviar").addEventListener("click", mandarSuporte);
$("sup-campo").addEventListener("keydown", e => { if (e.key === "Enter") mandarSuporte(); });

/* --- LOJA --- */
$("btn-loja").addEventListener("click", () => {
  if (!lojaDeDinheiroLigada()) return;   // trava por dentro também
  AudioSys.resume();
  S.mode = "loja";
  renderLoja();
  showScreen("loja");
});

/* --- aba AMIGOS --- */
$("btn-amigos").addEventListener("click", () => {
  AudioSys.resume();
  S.mode = "amigos";
  amAba = "lista";
  amigosRender();
  showScreen("amigos");
  amigosCarregar();
});
$("chat-voltar").addEventListener("click", () => {
  conversaDesligar();
  AM.conversaCom = null;
  S.mode = "amigos";
  amigosRender();
  showScreen("amigos");
});
function mandarDoChat() {
  const el = $("chat-campo");
  const txt = el.value;
  if (!txt.trim()) return;
  el.value = "";
  conversaEnviar(txt).then(ok => {
    if (!ok) { el.value = txt; }
  });
}
$("chat-enviar").addEventListener("click", mandarDoChat);
$("chat-campo").addEventListener("keydown", e => { if (e.key === "Enter") mandarDoChat(); });

const btMulti = $("btn-multi");
if (btMulti) btMulti.addEventListener("click", () => { AudioSys.resume(); abrirMulti("jornada"); });
const btMultiAm = $("btn-multi-amigos");
if (btMultiAm) btMultiAm.addEventListener("click", () => trocarAbaMulti("amigos"));
for (const b of document.querySelectorAll("#multi-abas .aba")) {
  b.addEventListener("click", () => trocarAbaMulti(b.dataset.modo));
}
$("coop-criar").addEventListener("click", () => {
  if (!COOP_LIGADO) { avisoMulti("O cooperativo está em manutenção."); AudioSys.deny(); return; }
  AudioSys.resume(); mpCriarSala("coop");
});
$("coop-entrar").addEventListener("click", () => {
  if (!COOP_LIGADO) { avisoMulti("O cooperativo está em manutenção."); AudioSys.deny(); return; }
  AudioSys.resume(); mpEntrarSala($("coop-codigo").value, "coop");
});
$("pvp-criar").addEventListener("click", () => { AudioSys.resume(); mpCriarSala("pvp"); });
$("pvp-entrar").addEventListener("click", () => { AudioSys.resume(); mpEntrarSala($("pvp-codigo").value, "pvp"); });
$("sala-comecar").addEventListener("click", () => { AudioSys.resume(); mpComecar(); });
$("sala-sair").addEventListener("click", () => { mpSair(true); });
$("sala-copiar").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(MP.sala); $("sala-dica").textContent = "Código copiado!"; }
  catch (e) { $("sala-dica").textContent = "Código: " + MP.sala; }
});
$("amigo-add").addEventListener("click", async () => {
  const el = $("amigo-nome");
  const nome = (el.value || "").trim();
  if (!nome) return;
  const av = $("multi-aviso") || $("sala-dica");
  /* usa o mesmo sistema da aba AMIGOS: pedido de verdade, que a pessoa
     aceita do lado dela — em vez de só anotar o nome neste aparelho  */
  const r = await amigoPedir(nome);
  if (r.ok) {
    save.amigos = save.amigos || [];
    if (save.amigos.indexOf(nome) < 0) save.amigos.push(nome);
    el.value = "";
    persist();
    AudioSys.buy();
  } else {
    AudioSys.deny();
  }
  avisoMulti(r.msg);
  renderAmigos();
});

/* ---------- Árvore de habilidades ---------- */
let selNode = null;
function nodeState(branch, tier) {
  if (save.skills[nodeId(branch, tier)]) return "owned";
  const prevOk = tier === 1 || save.skills[nodeId(branch, tier - 1)];
  if (prevOk && ptsAvailable() > 0) return "avail";
  return "locked";
}
function renderTree() {
  porCristais("tree-gems");
  const avail = ptsAvailable();
  $("tree-pts").textContent = avail + (avail === 1 ? " PONTO DISPONÍVEL" : " PONTOS DISPONÍVEIS") +
    " · " + ptsSpent() + "/120 HABILIDADES";
  const cols = $("tree-cols");
  cols.innerHTML = "";
  for (const br of BRANCHES) {
    const col = document.createElement("div");
    col.className = "tree-col";
    col.dataset.b = br.id;
    const head = document.createElement("div");
    head.className = "tree-col-head";
    head.style.color = br.color;
    head.textContent = br.name;
    col.appendChild(head);
    // quantos nós já pegou neste ramo, a barrinha e o bônus passivo
    const feitos = branchCount(br.id);
    const cont = document.createElement("div");
    cont.className = "tree-col-cont";
    cont.textContent = feitos + "/40";
    cont.style.color = feitos ? br.color : "";
    col.appendChild(cont);
    const barra = document.createElement("div");
    barra.className = "tree-col-barra";
    barra.innerHTML = '<i style="width:' + Math.round(feitos / 40 * 100) +
      '%;background:' + br.color + '"></i>';
    col.appendChild(barra);
    const pas = document.createElement("div");
    pas.className = "tree-col-pas";
    pas.textContent = "cada nó: " + br.passive;
    col.appendChild(pas);
    for (let t = 1; t <= 40; t++) {
      if (t > 1) {
        const link = document.createElement("div");
        link.className = "link" + (save.skills[nodeId(br.id, t)] || save.skills[nodeId(br.id, t - 1)] ? " on" : "");
        col.appendChild(link);
      }
      const nEl = document.createElement("button");
      const ms = MILESTONES[br.id][t];
      nEl.className = "node " + nodeState(br.id, t) + (ms ? " milestone" : "");
      nEl.textContent = ms ? "✦" : t;
      if (ms) { nEl.dataset.t = t; nEl.title = ms.name + " — " + ms.desc; }
      if (selNode && selNode.branch === br.id && selNode.tier === t) nEl.classList.add("sel");
      nEl.addEventListener("click", () => { selectNode(br.id, t); });
      col.appendChild(nEl);
    }
    cols.appendChild(col);
  }
  renderNodeDetail();
}
function nodeInfo(branch, tier) {
  const br = BRANCHES.find(b => b.id === branch);
  const ms = MILESTONES[branch][tier];
  if (ms) return { name: ms.name, desc: ms.desc + " (nó " + tier + " de " + br.name + ")" };
  return { name: br.name + " · Nó " + tier, desc: "Bônus passivo: " + br.passive };
}
function renderNodeDetail() {
  const btn = $("td-buy");
  if (!selNode) {
    $("td-name").textContent = "Toque em um nó";
    $("td-desc").textContent = "Cada fase concluída dá 1 ponto de habilidade.";
    btn.textContent = "—";
    btn.disabled = true;
    return;
  }
  const info = nodeInfo(selNode.branch, selNode.tier);
  const state = nodeState(selNode.branch, selNode.tier);
  $("td-name").textContent = info.name;
  $("td-desc").textContent = info.desc;
  if (state === "owned") { btn.textContent = "ATIVA"; btn.disabled = true; }
  else if (state === "avail") { btn.textContent = "DESBLOQUEAR · 1 PT"; btn.disabled = false; }
  else {
    const prevOk = selNode.tier === 1 || save.skills[nodeId(selNode.branch, selNode.tier - 1)];
    btn.textContent = prevOk ? "SEM PONTOS" : "BLOQUEADA";
    btn.disabled = true;
  }
}
function selectNode(branch, tier) {
  selNode = { branch, tier };
  renderTree();
}
$("td-buy").addEventListener("click", () => {
  if (!selNode) return;
  AudioSys.resume();
  if (nodeState(selNode.branch, selNode.tier) !== "avail") { AudioSys.deny(); return; }
  save.skills[nodeId(selNode.branch, selNode.tier)] = true;
  persist(); calcStats();
  AudioSys.skill();
  vibrate(25);
  renderTree();
});

/* ---------- Cutscene de apresentação da nave ---------- */
function playCutscene(shipIdx, back) {
  S.mode = "cutscene";
  S.cut = { ship: shipIdx, t: 0, back: back || "hangar" };
  showScreen("cut");
}
function endCutscene() {
  const back = S.cut ? S.cut.back : "hangar";
  S.cut = null;
  if (back === "oficina") { S.mode = "oficina"; renderOficina(); showScreen("oficina"); sizeOf3d(); }
  else { S.mode = "hangar"; renderHangar(true); showScreen("hangar"); }
}
cutSkip.addEventListener("click", () => { if (S.mode === "cutscene") endCutscene(); });

function drawCutscene(dt) {
  const c = S.cut;
  if (!c) return;
  c.t += dt;
  ctx.fillStyle = "#02040C";
  ctx.fillRect(0, 0, W, H);
  // túnel de hipervelocidade
  const warp = clamp(1.6 - c.t * 0.55, 0.15, 1.6);
  for (const st of stars) {
    st.y += (140 + st.z * 620) * dt * warp;
    if (st.y > H + 4) { st.y = -4; st.x = Math.random() * W; }
    ctx.globalAlpha = 0.3 + st.z * 0.7;
    ctx.fillStyle = "#9FD8FF";
    ctx.fillRect(st.x, st.y, 1 + st.z, 6 + st.z * 26 * warp);
  }
  ctx.globalAlpha = 1;

  const sh = SHIPS[c.ship];
  const ease = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const shipY = lerp(H + 160, H * 0.42, ease(c.t / 1.6));
  const theta = c.t * (2.6 - clamp(c.t, 0, 2) * 0.9);
  render3D(ctx, c.ship, W / 2, shipY, 5.2 + Math.min(c.t, 2) * 0.9, theta, 0, 0);

  ctx.textAlign = "center";
  if (c.t > 1.1) {
    ctx.globalAlpha = clamp((c.t - 1.1) * 2, 0, 1);
    ctx.fillStyle = "#EAF2FF";
    ctx.font = "600 11px 'Chakra Petch',sans-serif";
    ctx.fillText("NAVE " + (c.ship + 1) + " DE 50", W / 2, H * 0.16);
    const nameSize = Math.round(clamp(W * 0.1, 30, 52));
    ctx.font = nameSize + "px 'Russo One',sans-serif";
    ctx.fillStyle = shipColor(c.ship);
    ctx.shadowColor = shipColor(c.ship);
    ctx.shadowBlur = 24;
    ctx.fillText(sh.name.toUpperCase(), W / 2, H * 0.16 + nameSize + 8);
    ctx.shadowBlur = 0;
  }
  if (c.t > 1.9) {
    ctx.globalAlpha = clamp((c.t - 1.9) * 2, 0, 1);
    ctx.fillStyle = "#FFC145";
    ctx.font = "700 14px 'Chakra Petch',sans-serif";
    ctx.fillText(sh.powerName.toUpperCase() + " — " + sh.powerDesc, W / 2, H * 0.68);
  }
  if (c.t > 2.5) {
    ctx.globalAlpha = clamp((c.t - 2.5) * 2, 0, 1);
    ctx.fillStyle = "#4DE8FF";
    ctx.font = "700 13px 'Chakra Petch',sans-serif";
    ctx.fillText("ULTIMATE: " + (ULTS[sh.ultId] || ULTS[sh.power] || ULTS.dmg).name.toUpperCase(), W / 2, H * 0.68 + 26);
  }
  if (c.t > 3.1) {
    ctx.globalAlpha = clamp((c.t - 3.1) * 2, 0, 1);
    ctx.fillStyle = "rgba(234,242,255,.85)";
    ctx.font = "italic 600 13px 'Chakra Petch',sans-serif";
    ctx.fillText(CUT_QUOTES[sh.ultId] || CUT_QUOTES[sh.power] || CUT_QUOTES.dmg, W / 2, H * 0.68 + 52);
  }
  ctx.globalAlpha = 1;
  if (c.t > 5) endCutscene();
}
