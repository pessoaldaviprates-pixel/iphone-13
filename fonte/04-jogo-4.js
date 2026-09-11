/* =====================================================================
   PAINEL DE HABILIDADES — subir de nível gastando cristais
   ---------------------------------------------------------------------
   Vale para todas as naves. Mostra o que cada nível já rendeu e o que
   vai render no próximo, para dar para decidir antes de gastar.
   ===================================================================== */
function buildHabPanel(i) {
  const wrap = document.createElement("div");
  wrap.className = "hab-up";
  const lista = habsUpgrade(i);
  const soma = habNiveisDaNave(i);
  const cab = document.createElement("div");
  cab.className = "cab";
  cab.innerHTML = "<b>HABILIDADES (" + lista.length + ")</b>" +
    "<span>" + soma + "/" + (lista.length * HAB_MAX) + " níveis · +" + soma + "% de dano</span>";
  wrap.appendChild(cab);

  for (const h of lista) {
    const nv = habNivel(i, h.id);
    const row = document.createElement("div");
    row.className = "hab-linha";
    const ganho = h.basica
      ? (h.id === "poder" ? "+" + Math.round(nv * 10) + "% no poder da nave"
                          : "+" + Math.round(nv * 8) + "% de carga da ultimate")
      : "+" + Math.round(nv * 15) + "% de força" +
        (h.combo || !h.cd ? "" : " · recarga " + (Math.round(h.cd * (1 - 0.05 * nv) * 10) / 10) + "s");
    row.innerHTML =
      '<div class="ic">' + h.icone + '</div>' +
      '<div class="txt">' +
        '<div class="nm">' + escaparTexto(h.nome) +
          '<span class="nv' + (nv ? "" : " zero") + '">NÍVEL ' + nv + '/' + HAB_MAX + '</span></div>' +
        '<div class="ds">' + escaparLongo(h.desc || "") + '</div>' +
        '<div class="gn">' + ganho + '</div>' +
        '<div class="barra"><u style="width:' + Math.round((nv / HAB_MAX) * 100) + '%"></u></div>' +
      '</div>';
    const btn = document.createElement("button");
    btn.className = "buy-btn";
    if (nv >= HAB_MAX) {
      btn.classList.add("max");
      btn.textContent = "MÁX";
      btn.disabled = true;
    } else {
      const custo = custoHab(nv);
      btn.innerHTML = "◆ " + fmt(custo);
      btn.disabled = save.crystals < custo;
      btn.addEventListener("click", () => {
        AudioSys.resume();
        if (save.crystals < custo) { AudioSys.deny(); return; }
        save.crystals -= custo;
        if (!save.habNv) save.habNv = {};
        save.habNv[chaveHab(i, h.id)] = nv + 1;
        persist(); calcStats();
        AudioSys.buy(); vibrate(20);
        renderHangar(false);
        if (typeof renderHabBar === "function") renderHabBar(true);
      });
    }
    row.appendChild(btn);
    wrap.appendChild(row);
  }
  return wrap;
}

function buildPartsPanel(i) {
  const wrap = document.createElement("div");
  wrap.className = "parts";
  for (const part of PARTS) {
    const lvl = partLevel(i, part.id);
    const row = document.createElement("div");
    row.className = "part-row";
    const pips = [];
    for (let k = 0; k < PART_MAX; k++) pips.push('<span class="pip' + (k < lvl ? " on" : "") + '"></span>');
    row.innerHTML =
      '<div class="part-icon">' + part.icon + '</div>' +
      '<div class="part-info"><div class="part-name">' + part.name + '</div>' +
      '<div class="part-desc">' + part.desc + '</div>' +
      '<div class="pips">' + pips.join("") + '</div></div>';
    const btn = document.createElement("button");
    btn.className = "buy-btn";
    if (lvl >= PART_MAX) {
      btn.classList.add("max");
      btn.textContent = "MÁX";
      btn.disabled = true;
    } else {
      const cost = partCost(i, lvl);
      btn.textContent = "◆ " + fmt(cost);
      btn.disabled = save.crystals < cost;
      btn.addEventListener("click", () => {
        AudioSys.resume();
        if (save.crystals < cost) { AudioSys.deny(); return; }
        save.crystals -= cost;
        if (!save.parts[i]) save.parts[i] = {};
        save.parts[i][part.id] = lvl + 1;
        persist(); calcStats();
        AudioSys.buy(); vibrate(20);
        renderHangar(false);
      });
    }
    row.appendChild(btn);
    wrap.appendChild(row);
  }
  return wrap;
}

/* =====================================================================
   CONSTRUTOR DE NAVES — três passos: formato, peças e acabamento
   ===================================================================== */
const CN = { passo: 0, familia: 0, encaixe: "frente", def: null, editando: -1 };

function abrirConstrutor(editar) {
  CN.passo = 0;
  CN.familia = 0;
  CN.encaixe = "frente";
  CN.editando = (editar === undefined || editar === null) ? -1 : editar;
  if (CN.editando >= 0 && save.criadas[CN.editando]) {
    CN.def = JSON.parse(JSON.stringify(save.criadas[CN.editando]));
    CN.familia = Math.floor((CN.def.formato || 0) / 20);
  } else {
    CN.def = { formato: 0, pecas: {}, nome: "", hue: 190 };
  }
  S.mode = "construtor";
  $("cn-titulo").textContent = CN.editando >= 0 ? "MUDAR A NAVE" : "CRIAR NAVE";
  showScreen("construtor");
  cnRender();
}
function cnRender() {
  porCristais("cn-gems");
  // trilha dos passos
  const nomes = ["1 · FORMATO", "2 · PEÇAS", "3 · ACABAMENTO"];
  $("cn-passos").innerHTML = nomes.map((n, i) =>
    '<div class="cn-passo' + (i === CN.passo ? " on" : (i < CN.passo ? " feito" : "")) + '">' +
    n + "</div>").join("");
  $("cn-formatos").style.display = CN.passo === 0 ? "flex" : "none";
  $("cn-pecas").style.display    = CN.passo === 1 ? "flex" : "none";
  $("cn-final").style.display    = CN.passo === 2 ? "flex" : "none";
  $("cn-anterior").textContent = CN.passo === 0 ? "‹ SAIR" : "‹ VOLTAR";
  const custo = cnCustoAPagar();
  $("cn-proximo").textContent = CN.passo < 2 ? "CONTINUAR ›"
    : (CN.editando >= 0
        ? (custo > 0 ? "SALVAR · ◆ " + fmt(custo)
                     : (custo < 0 ? "SALVAR · devolve ◆ " + fmt(-custo) : "SALVAR MUDANÇAS"))
        : "CONSTRUIR · ◆ " + fmt(custo));
  if (CN.passo === 0) cnFormatos();
  if (CN.passo === 1) cnPecas();
  if (CN.passo === 2) cnFinal();
}

/* --- passo 1 --- */
function cnFormatos() {
  const fx = $("cn-familias");
  fx.innerHTML = "";
  FORMA_FAMILIAS.forEach((f, i) => {
    const b = document.createElement("button");
    b.className = "cn-filtro" + (CN.familia === i ? " on" : "");
    b.textContent = f.nome.toUpperCase();
    b.addEventListener("click", () => { CN.familia = i; cnFormatos(); });
    fx.appendChild(b);
  });
  const grade = $("cn-lista-formatos");
  grade.innerHTML = "";
  for (let i = CN.familia * 20; i < CN.familia * 20 + 20; i++) {
    const F = FORMATOS[i];
    const op = document.createElement("div");
    op.className = "cn-op" + (CN.def.formato === i ? " on" : "");
    const cv = document.createElement("canvas");
    cv.width = 112; cv.height = 112;
    const g = cv.getContext("2d");
    g.setTransform(2, 0, 0, 2, 56, 58);
    g.fillStyle = "hsl(" + (CN.def.hue || 190) + ",90%,62%)";
    g.shadowColor = g.fillStyle; g.shadowBlur = 12;
    g.beginPath();
    const k = 1.5;
    g.moveTo(F.pts[0][0] * k, F.pts[0][1] * k);
    for (let j = 1; j < F.pts.length; j++) g.lineTo(F.pts[j][0] * k, F.pts[j][1] * k);
    g.closePath(); g.fill();
    op.appendChild(cv);
    const nome = document.createElement("b");
    nome.textContent = F.nome;
    const meta = document.createElement("span");
    meta.textContent = "▲" + F.dmg.toFixed(1) + " ♥" + F.hp + " »" + F.agi.toFixed(2);
    const pr = document.createElement("i");
    pr.textContent = "◆ " + fmt(F.preco);
    op.appendChild(nome); op.appendChild(meta); op.appendChild(pr);
    op.addEventListener("click", () => {
      CN.def.formato = i;
      AudioSys.tone(680, 0.06, "sine", 0.1);
      cnFormatos();
    });
    grade.appendChild(op);
  }
}

/* --- passo 2 --- */
function cnDesenhar(idCanvas, escala) {
  const cv = $(idCanvas);
  if (!cv) return;
  const g = cv.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, cv.width, cv.height);
  const k = escala || 3.2;
  g.setTransform(k, 0, 0, k, cv.width / 2, cv.height / 2);
  const def = naveCriadaDef(CN.def);
  const cor = "hsl(" + (CN.def.hue || 190) + ",90%,62%)";
  g.shadowColor = cor; g.shadowBlur = 14;
  g.fillStyle = cor;
  g.beginPath();
  const pts = def.ptsCustom;
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.closePath(); g.fill();
  g.shadowBlur = 0;
  desenharPecas(g, def, 1, cor);
}
function cnStats(id) {
  const d = naveCriadaDef(CN.def);
  $(id).innerHTML =
    '<div class="cn-stat"><b>' + d.baseDmg.toFixed(2) + "</b><span>DANO</span></div>" +
    '<div class="cn-stat"><b>' + d.baseHp + "</b><span>VIDA</span></div>" +
    '<div class="cn-stat"><b>' + d.baseAgi.toFixed(2) + "</b><span>AGILIDADE</span></div>" +
    '<div class="cn-stat"><b>+' + Math.round((d.bonusCad || 0) * 100) + "%</b><span>CADÊNCIA</span></div>" +
    '<div class="cn-stat"><b>+' + Math.round((d.bonusGem || 0) * 100) + "%</b><span>CRISTAIS</span></div>" +
    '<div class="cn-stat"><b>' + (d.peso || 0) + "</b><span>PESO</span></div>" +
    '<div class="cn-stat"><b>◆ ' + fmt(custoDaNave(CN.def)) + "</b><span>CUSTO</span></div>";
}
function cnPecas() {
  cnDesenhar("cn-tela", 3.4);
  cnStats("cn-stats");
  const fx = $("cn-encaixes");
  fx.innerHTML = "";
  for (const e of ENCAIXES) {
    const b = document.createElement("button");
    b.className = "cn-filtro" + (CN.encaixe === e.id ? " on" : "");
    const posta = CN.def.pecas[e.id] !== undefined && CN.def.pecas[e.id] !== null;
    b.innerHTML = e.icone + " " + e.nome + (posta ? '<span class="pip">●</span>' : "");
    b.addEventListener("click", () => { CN.encaixe = e.id; cnPecas(); });
    fx.appendChild(b);
  }
  const grade = $("cn-lista-pecas");
  grade.innerHTML = "";
  const vazio = document.createElement("div");
  vazio.className = "cn-op nada" + (CN.def.pecas[CN.encaixe] === undefined ? " on" : "");
  vazio.innerHTML = "<b>SEM PEÇA</b>";
  vazio.addEventListener("click", () => {
    delete CN.def.pecas[CN.encaixe];
    AudioSys.tone(320, 0.06, "sine", 0.1);
    cnPecas();
  });
  grade.appendChild(vazio);
  PECAS[CN.encaixe].forEach((p, i) => {
    const op = document.createElement("div");
    op.className = "cn-op" + (CN.def.pecas[CN.encaixe] === i ? " on" : "");
    op.innerHTML = "<b>" + escaparTexto(p.nome) + "</b>" +
      "<span>" + pecaResumo(p) + "</span>" +
      "<i>◆ " + fmt(p.preco) + "</i>";
    op.addEventListener("click", () => {
      CN.def.pecas[CN.encaixe] = i;
      AudioSys.tone(700 + i * 6, 0.06, "sine", 0.1);
      cnPecas();
    });
    grade.appendChild(op);
  });
}

/* --- passo 3 --- */
function cnFinal() {
  cnDesenhar("cn-tela2", 4.4);
  cnStats("cn-stats2");
  const F = FORMATOS[CN.def.formato];
  const pecas = navePecas(CN.def);
  $("cn-nome").value = CN.def.nome || "";
  $("cn-cor").value = CN.def.hue === undefined ? 190 : CN.def.hue;
  const custo = cnCustoAPagar();
  $("cn-resumo").innerHTML =
    "Casco <b>" + escaparTexto(F.nome) + "</b> (" + F.familia + ") com <b>" +
    pecas.length + "</b> de 12 encaixes usados.<br>" +
    (pecas.length ? pecas.map(p => "• " + escaparTexto(p.nome)).join("<br>") : "• nenhuma peça instalada") +
    "<br><br>Peso <b>" + (naveCriadaDef(CN.def).peso || 0) + "</b> — peça blindada dá vida " +
    "mas tira manobra e cadência. Empilhar tudo rende cada vez menos: a partir " +
    "de certo ponto cada peça a mais quase não soma." +
    "<br><br>" +
    (CN.editando >= 0
      ? (custo > 0 ? "Diferença a pagar: <b>◆ " + fmt(custo) + "</b>"
                   : (custo < 0 ? "Você recebe de volta: <b>◆ " + fmt(-custo) + "</b>"
                                : "Sem custo: a nave ficou do mesmo valor."))
      : "Custo total: <b>◆ " + fmt(custo) + "</b>") +
    " — você tem ◆ " + cristaisTexto(save.crystals) +
    (save.crystals < custo && !cristaisInfinitos()
      ? '<br><span style="color:var(--danger)">Faltam ◆ ' + fmt(custo - save.crystals) + "</span>" : "");
}
$("cn-nome").addEventListener("input", e => { CN.def.nome = e.target.value.slice(0, 18); });
$("cn-cor").addEventListener("input", e => {
  CN.def.hue = parseInt(e.target.value, 10) || 0;
  cnDesenhar("cn-tela2", 4.4);
});
$("cn-anterior").addEventListener("click", () => {
  if (CN.passo === 0) { S.mode = "hangar"; renderHangar(); showScreen("hangar"); return; }
  CN.passo--;
  cnRender();
});
$("cn-proximo").addEventListener("click", () => {
  AudioSys.resume();
  if (CN.passo < 2) { CN.passo++; cnRender(); return; }
  cnConstruir();
});
/* o que falta pagar: numa nave nova é o preço cheio; numa mudança é só a
   diferença (e se ficar mais simples, devolve 60% do que sobrou)          */
function cnCustoAPagar() {
  const novo = custoDaNave(CN.def);
  if (CN.editando < 0 || !save.criadas || !save.criadas[CN.editando]) return novo;
  const antigo = custoDaNave(save.criadas[CN.editando]);
  const dif = novo - antigo;
  return dif >= 0 ? dif : Math.round(dif * 0.6);
}
function cnConstruir() {
  const custo = cnCustoAPagar();
  if (save.crystals < custo) {
    AudioSys.deny();
    $("cn-resumo").insertAdjacentHTML("afterbegin",
      '<div style="color:var(--danger);margin-bottom:8px">Cristais insuficientes.</div>');
    return;
  }
  if (!CN.def.nome) CN.def.nome = FORMATOS[CN.def.formato].nome + " " + ((save.criadas || []).length + 1);
  save.criadas = save.criadas || [];
  save.crystals -= custo;
  if (CN.editando >= 0) save.criadas[CN.editando] = CN.def;
  else save.criadas.push(CN.def);
  reconstruirNavesCriadas();
  const idx = NAVES_BASE + (CN.editando >= 0 ? CN.editando : save.criadas.length - 1);
  save.ship = idx;
  persist();
  calcStats();
  AudioSys.victory();
  vibrate([40, 60, 40]);
  S.mode = "hangar";
  renderHangar(true);
  showScreen("hangar");
}
function apagarNaveCriada(pos) {
  if (!save.criadas || !save.criadas[pos]) return;
  const devolve = Math.round(custoDaNave(save.criadas[pos]) * 0.6);
  save.criadas.splice(pos, 1);
  save.crystals += devolve;
  if (save.ship >= NAVES_BASE) save.ship = 0;
  reconstruirNavesCriadas();
  persist();
  calcStats();
  AudioSys.buy();
  renderHangar();
}
$("btn-criar-nave").addEventListener("click", () => {
  if (!CRIAR_NAVE_LIGADO) return;
  AudioSys.resume(); abrirConstrutor();
});

/* ---------- Oficina 3D ---------- */
const of3d = $("of3d");
const ofCtx = of3d.getContext("2d");
let ofTheta = 0.6, ofDragging = false, ofLastX = 0, ofAuto = true;

function openOficina() {
  S.mode = "oficina";
  renderOficina();
  showScreen("oficina");
  sizeOf3d();
}
function sizeOf3d() {
  const w = of3d.clientWidth || 300;
  of3d.width = Math.round(w * DPR);
  of3d.height = Math.round(230 * DPR);
  ofCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
of3d.addEventListener("pointerdown", e => {
  e.preventDefault();
  ofDragging = true; ofAuto = false; ofLastX = e.clientX;
  try { of3d.setPointerCapture(e.pointerId); } catch (err) {}
});
of3d.addEventListener("pointermove", e => {
  if (!ofDragging) return;
  ofTheta += (e.clientX - ofLastX) * 0.02;
  ofLastX = e.clientX;
});
of3d.addEventListener("pointerup", () => { ofDragging = false; });
of3d.addEventListener("pointercancel", () => { ofDragging = false; });

/* renderizador 3D: extrusão do contorno da nave, sombreado e ordenado */
function render3D(g, shipIdx, cx, cy, scale, theta, cw, ch) {
  g.clearRect(0, 0, cw, ch);
  const grad = g.createRadialGradient(cx, cy + 30, 10, cx, cy + 30, 130);
  grad.addColorStop(0, "rgba(77,232,255,.14)");
  grad.addColorStop(1, "rgba(77,232,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, cw, ch);

  const pts = pontosDaNave(SHIPS[naveValida(shipIdx)] || SHIPS[0]);
  const hue = shipHue(shipIdx);
  const n = pts.length;
  const thick = 4.5;
  const tilt = -0.85;
  const cosT = Math.cos(theta), sinT = Math.sin(theta);
  const cosX = Math.cos(tilt), sinX = Math.sin(tilt);
  function proj(x, h, z) {
    // gira no eixo vertical, depois inclina para a câmera
    const rx = x * cosT - z * sinT;
    const rz = x * sinT + z * cosT;
    const ry = h * cosX - rz * sinX;
    const rz2 = h * sinX + rz * cosX;
    return { x: cx + rx * scale, y: cy + ry * scale, z: rz2 };
  }
  const top = [], bot = [];
  for (const p of pts) {
    top.push(proj(p[0], -thick, p[1]));
    bot.push(proj(p[0] * 0.82, thick, p[1] * 0.82));
  }
  const faces = [];
  function addFace(v, lumBias) {
    let zSum = 0;
    for (const q of v) zSum += q.z;
    const ax = v[1].x - v[0].x, ay = v[1].y - v[0].y;
    const bx2 = v[2].x - v[0].x, by2 = v[2].y - v[0].y;
    const cross = ax * by2 - ay * bx2;
    const lum = clamp(0.42 + (cross > 0 ? 0.3 : -0.12) + lumBias + zSum * 0.001, 0.15, 1);
    faces.push({ v, z: zSum / v.length, lum });
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    addFace([top[i], top[j], bot[j], bot[i]], (Math.sin((i / n) * TAU + theta) * 0.22));
  }
  addFace(top.slice(), 0.28);
  addFace(bot.slice().reverse(), -0.15);
  faces.sort((a, b) => b.z - a.z);
  for (const f of faces) {
    g.beginPath();
    g.moveTo(f.v[0].x, f.v[0].y);
    for (let i = 1; i < f.v.length; i++) g.lineTo(f.v[i].x, f.v[i].y);
    g.closePath();
    const L = Math.round(22 + f.lum * 48);
    g.fillStyle = "hsl(" + hue + ",92%," + L + "%)";
    g.strokeStyle = "hsl(" + hue + ",92%," + Math.max(12, L - 14) + "%)";
    g.lineWidth = 1;
    g.fill();
    g.stroke();
  }
  // brilho do motor atrás
  const gl = proj(0, 0, 13);
  g.fillStyle = shipGlowColor(shipIdx);
  g.shadowColor = shipGlowColor(shipIdx);
  g.shadowBlur = 14;
  g.beginPath(); g.arc(gl.x, gl.y, 4, 0, TAU); g.fill();
  g.shadowBlur = 0;
}

function renderOficina() {
  const i = save.ship;
  const sh = SHIPS[i];
  porCristais("of-gems");
  $("of-title").textContent = "OFICINA — " + sh.name.toUpperCase();
  $("of-power").textContent = "PODER: " + sh.powerName + " — " + sh.powerDesc;
  const ult = ULTS[sh.power] || ULTS.dmg;
  $("of-ult").textContent = "ULTIMATE: " + ult.name + " — " + ult.desc;

  const paintRow = $("paint-row");
  paintRow.innerHTML = "";
  const ownedPaints = save.paints[i] || [];
  for (const h of PAINT_HUES) {
    const sw = document.createElement("button");
    sw.className = "swatch";
    sw.style.background = "hsl(" + h + ",100%,60%)";
    const isDefault = h === SHIPS[i].hue;
    const ownedH = isDefault || ownedPaints.indexOf(h) >= 0;
    if (ownedH) sw.classList.add("owned"); else sw.textContent = "◆" + PAINT_COST;
    if (shipHue(i) === h) sw.classList.add("sel");
    sw.addEventListener("click", () => {
      AudioSys.resume();
      if (!ownedH) {
        if (save.crystals < PAINT_COST) { AudioSys.deny(); return; }
        save.crystals -= PAINT_COST;
        if (!save.paints[i]) save.paints[i] = [];
        save.paints[i].push(h);
      }
      if (!save.custom[i]) save.custom[i] = {};
      save.custom[i].hue = h;
      persist(); calcStats();
      AudioSys.buy();
      renderOficina();
    });
    paintRow.appendChild(sw);
  }

  const glowRow = $("glow-row");
  glowRow.innerHTML = "";
  const ownedGlows = save.glows[i] || [];
  for (const h of PAINT_HUES.slice(0, 8)) {
    const sw = document.createElement("button");
    sw.className = "swatch";
    sw.style.background = "hsl(" + h + ",100%,60%)";
    const isDefault = h === SHIPS[i].hue;
    const ownedH = isDefault || ownedGlows.indexOf(h) >= 0;
    if (ownedH) sw.classList.add("owned"); else sw.textContent = "◆" + GLOW_COST;
    if (shipGlowHue(i) === h) sw.classList.add("sel");
    sw.addEventListener("click", () => {
      AudioSys.resume();
      if (!ownedH) {
        if (save.crystals < GLOW_COST) { AudioSys.deny(); return; }
        save.crystals -= GLOW_COST;
        if (!save.glows[i]) save.glows[i] = [];
        save.glows[i].push(h);
      }
      if (!save.custom[i]) save.custom[i] = {};
      save.custom[i].glow = h;
      persist(); calcStats();
      AudioSys.buy();
      renderOficina();
    });
    glowRow.appendChild(sw);
  }

  const wl = $("weap-list");
  wl.innerHTML = "";
  const ownedW = weaponsOf(i);
  for (const w of WEAPONS) {
    const has = w.id === "pulse" || ownedW.indexOf(w.id) >= 0;
    const isSel = curWeaponId() === w.id;
    const card = document.createElement("div");
    card.className = "weap-card" + (isSel ? " sel" : "");
    card.innerHTML =
      '<div class="weap-info"><div class="weap-name">' + w.name + '</div>' +
      '<div class="weap-desc">' + w.desc + '</div></div>';
    const btn = document.createElement("button");
    btn.className = "buy-btn";
    if (isSel) { btn.classList.add("max"); btn.textContent = "EQUIPADA"; btn.disabled = true; }
    else if (has) {
      btn.textContent = "EQUIPAR";
      btn.addEventListener("click", () => {
        AudioSys.resume();
        save.weaponSel[i] = w.id;
        persist(); calcStats();
        AudioSys.buy();
        renderOficina();
      });
    } else {
      const cost = weaponCost(i);
      btn.textContent = "◆ " + fmt(cost);
      btn.disabled = save.crystals < cost;
      btn.addEventListener("click", () => {
        AudioSys.resume();
        if (save.crystals < cost) { AudioSys.deny(); return; }
        save.crystals -= cost;
        if (!save.weapons[i]) save.weapons[i] = ["pulse"];
        save.weapons[i].push(w.id);
        save.weaponSel[i] = w.id;
        persist(); calcStats();
        AudioSys.buy(); vibrate(20);
        renderOficina();
      });
    }
    card.appendChild(btn);
    wl.appendChild(card);
  }
}
$("of-back").addEventListener("click", () => {
  S.mode = "hangar";
  renderHangar(true);
  showScreen("hangar");
});
$("btn-of-cut").addEventListener("click", () => { AudioSys.resume(); playCutscene(save.ship, "oficina"); });

/* ---------- Relíquias (amuletos) ---------- */
function renderReliquias() {
  porCristais("rel-gems");
  const bc = $("btn-chest");
  if (bc) bc.textContent = "ABRIR BAÚ ESTELAR — ◆ " + fmt(precoDoBau());
  const tit = $("rel-espacos");
  if (tit) tit.textContent = "AMULETOS EQUIPADOS (" + espacosDeReliquia() + " ESPAÇOS" +
    (temVip() ? " · VIP" : "") + ")";
  const slots = $("amu-slots");
  slots.innerHTML = "";
  for (let s2 = 0; s2 < espacosDeReliquia(); s2++) {
    const uid = save.equipped[s2];
    const a = uid ? save.amulets.find(x => x.uid === uid) : null;
    const el = document.createElement("button");
    el.className = "amu-slot" + (a ? " full" : "");
    if (a) {
      const d = amuletDef(a);
      el.style.borderColor = RARS[a.rar].color;
      el.innerHTML = '<span class="amu-ic" style="color:' + RARS[a.rar].color + '">' + d.icon + '</span>' +
        '<span class="amu-nm">' + d.name + '</span><span class="amu-hint">toque para remover</span>';
      el.addEventListener("click", () => {
        AudioSys.resume();
        save.equipped.splice(s2, 1);
        persist(); calcStats();
        renderReliquias();
      });
    } else {
      el.innerHTML = '<span class="amu-ic" style="color:var(--dim)">◇</span><span class="amu-hint">espaço livre</span>';
    }
    slots.appendChild(el);
  }

  /* coleção: mostra todos os tipos que existem e marca os que você já tem */
  const col = $("rel-colecao");
  if (col) {
    const meus = {};
    for (const a of save.amulets) meus[a.type] = true;
    const todos = AMULET_TYPES.map(t => ({ id: t.id, icon: t.icon, nome: t.name, lend: false }))
      .concat(AMULET_SPECIALS.map(t => ({ id: t.id, icon: t.icon, nome: t.name, lend: true })));
    const tem = todos.filter(t => meus[t.id]).length;
    col.innerHTML =
      '<div class="rel-col-topo"><span class="rel-col-h">COLEÇÃO</span>' +
      '<span class="rel-col-n">' + tem + " de " + todos.length + " relíquias</span></div>" +
      '<div class="rel-col-barra"><i style="width:' + Math.round(tem / todos.length * 100) + '%"></i></div>' +
      '<div class="rel-col-grade">' +
        todos.map(t => '<span class="rel-col-ic' + (t.lend ? " lend" : "") +
          (meus[t.id] ? " tem" : "") + '" title="' + escaparTexto(t.nome) +
          (meus[t.id] ? "" : " (ainda não achou)") + '">' + t.icon + "</span>").join("") +
      "</div>";
  }

  fundirRender();
  bauHistRender();
  const inv = $("amu-inv");
  inv.innerHTML = "";
  if (!save.amulets.length) {
    const d = document.createElement("div");
    d.className = "vazio";
    d.innerHTML = "<b>◈</b><strong>NENHUMA RELÍQUIA AINDA</strong>" +
      "<span>Abra um baú estelar aqui em cima ou derrote um chefe pela primeira vez.</span>";
    inv.appendChild(d);
  }
  const sorted = save.amulets.slice().sort((a, b) => b.rar - a.rar);
  for (const a of sorted) {
    const d = amuletDef(a);
    const equipped = save.equipped.indexOf(a.uid) >= 0;
    const card = document.createElement("div");
    card.className = "amu-card";
    if (equipped) card.style.borderColor = RARS[a.rar].color;
    card.innerHTML =
      '<div class="amu-ic" style="color:' + RARS[a.rar].color + '">' + d.icon + '</div>' +
      '<div class="amu-body"><div class="amu-name">' + d.name + '</div>' +
      '<div class="amu-fx">' + d.fxText + '</div>' +
      '<span class="rar rar-' + a.rar + '">' + RARS[a.rar].name + '</span></div>';
    const btns = document.createElement("div");
    btns.className = "amu-btns";
    const bEq = document.createElement("button");
    bEq.className = "buy-btn";
    if (equipped) {
      bEq.classList.add("max");
      bEq.textContent = "REMOVER";
      bEq.addEventListener("click", () => {
        AudioSys.resume();
        save.equipped = save.equipped.filter(u => u !== a.uid);
        persist(); calcStats();
        renderReliquias();
      });
    } else {
      bEq.textContent = "EQUIPAR";
      bEq.disabled = save.equipped.length >= espacosDeReliquia();
      bEq.addEventListener("click", () => {
        AudioSys.resume();
        if (save.equipped.length >= espacosDeReliquia()) { AudioSys.deny(); return; }
        save.equipped.push(a.uid);
        persist(); calcStats();
        AudioSys.buy();
        renderReliquias();
      });
    }
    const bSell = document.createElement("button");
    bSell.className = "buy-btn";
    bSell.textContent = "VENDER ◆" + SELL_VALUES[a.rar];
    bSell.addEventListener("click", () => {
      AudioSys.resume();
      save.crystals += SELL_VALUES[a.rar];
      save.amulets = save.amulets.filter(x => x.uid !== a.uid);
      save.equipped = save.equipped.filter(u => u !== a.uid);
      persist(); calcStats();
      AudioSys.gem();
      renderReliquias();
    });
    btns.appendChild(bEq); btns.appendChild(bSell);
    card.appendChild(btns);
    inv.appendChild(card);
  }
}
$("btn-chest").addEventListener("click", () => {
  AudioSys.resume();
  const custo = precoDoBau();
  if (save.crystals < custo) { AudioSys.deny(); return; }
  save.crystals -= custo;
  const a = rollAmulet();
  persist();
  AudioSys.chest();
  vibrate([30, 40, 30, 40, 80]);
  const d = amuletDef(a);
  const rev = $("amu-reveal");
  rev.style.display = "block";
  rev.style.borderColor = RARS[a.rar].color;
  rev.innerHTML =
    '<div class="amu-ic" style="color:' + RARS[a.rar].color + '">' + d.icon + '</div>' +
    '<div class="amu-name">' + d.name + '</div>' +
    '<div class="amu-fx">' + d.fxText + '</div>' +
    '<span class="rar rar-' + a.rar + '">' + RARS[a.rar].name + '</span>';
  renderReliquias();
});

/* =====================================================================
   MULTIJOGADOR — cooperativo e competitivo
   Sem servidor de jogo: os aparelhos conversam pelo mesmo banco da nuvem.
   Cada um manda a própria situação ~4x por segundo e lê a do outro.
   ===================================================================== */
const MP = {
  sala: null,      // código
  modo: null,      // "coop" | "pvp"
  host: false,
  eu: null,        // meu id dentro da sala
  outros: {},      // id -> estado do outro piloto
  loopRapido: null,   // posição (frequente e leve)
  loopLento: null,    // sala inteira (menos vezes)
  fase: 1,
  onda: 1,
  semente: 0,
  meuDano: 0,      // dano que EU dei no chefe (somado com o do parceiro)
  danoTotal: 0,
  jornadaChave: null,   // qual jornada em dupla está valendo
  fim: null
};
/* ---------------------------------------------------------------------
   O cooperativo e a ranqueada estão de volta, agora com a rede direta
   por baixo. A oficina de construção continua guardada.
   --------------------------------------------------------------------- */
const COOP_LIGADO = true;
const RANKED_LIGADO = true;
const CRIAR_NAVE_LIGADO = false;

function mpCoop() { return !!MP.sala && MP.modo === "coop"; }

/* =====================================================================
   JORNADA EM DUPLA — 270 fases para cada amizade
   ---------------------------------------------------------------------
   Cada dupla tem a jornada dela. Com o amigo 1 vocês continuam de onde
   pararam; com o amigo 2 começa tudo de novo na fase 1, com as melhorias
   próprias daquela dupla. Nada se mistura.

   A chave da jornada é o par de nicks em ordem alfabética, então os dois
   aparelhos chegam à MESMA chave sozinhos — cada um guarda a sua cópia,
   e a fase mais adiantada dos dois vale para a dupla.
   ===================================================================== */
const JORNADA_UP = [
  { id: "dano",     icone: "▲", nome: "Canhão da dupla", desc: "+7% de dano por nível",        base: 900,  passo: 1.55 },
  { id: "cadencia", icone: "≡", nome: "Gatilho leve",    desc: "+6% de cadência por nível",    base: 900,  passo: 1.55 },
  { id: "casco",    icone: "♥", nome: "Casco reforçado", desc: "+9% de vida por nível",        base: 1100, passo: 1.55 },
  { id: "escudo",   icone: "◎", nome: "Defletor duplo",  desc: "+10% de escudo por nível",     base: 1100, passo: 1.55 },
  { id: "motor",    icone: "»", nome: "Motor da dupla",  desc: "+6% de agilidade por nível",   base: 800,  passo: 1.55 },
  { id: "cristal",  icone: "◆", nome: "Garimpo",         desc: "+10% de cristais por nível",   base: 1300, passo: 1.6  }
];
const JORNADA_UP_MAX = 8;

function chaveDupla(a, b) {
  const x = nickSimples(a), y = nickSimples(b);
  return (x < y ? x + "|" + y : y + "|" + x);
}
function jornadaNova(nomeAmigo) {
  return { amigo: String(nomeAmigo || "Amigo"), fase: 1, maior: 1, jogadas: 0,
           cristais: 0, up: {}, quando: 0 };
}
function jornadaDe(nomeAmigo, criar) {
  if (!save.jornadas) save.jornadas = {};
  const k = chaveDupla(save.__name, nomeAmigo);
  if (!save.jornadas[k] && criar) save.jornadas[k] = jornadaNova(nomeAmigo);
  const j = save.jornadas[k];
  if (j) {
    j.amigo = j.amigo || String(nomeAmigo || "Amigo");
    j.up = j.up || {};
    j.maior = Math.max(1, j.maior || 1);
    j.fase = clamp(j.fase || 1, 1, TOTAL_FASES);
  }
  return j || null;
}
/* a jornada que está valendo agora (dentro da partida ou na tela dela) */
function jornadaAtual() {
  if (!MP.jornadaChave || !save.jornadas) return null;
  return save.jornadas[MP.jornadaChave] || null;
}
function jornadaNivel(j, id) {
  const v = j && j.up ? j.up[id] : 0;
  return (typeof v === "number" && v > 0) ? Math.min(JORNADA_UP_MAX, Math.floor(v)) : 0;
}
function jornadaCusto(up, nivel) {
  return Math.round(up.base * Math.pow(up.passo, nivel) / 50) * 50;
}
/* quanto cada melhoria da dupla rende na partida de agora */
function jornadaMult(id) {
  const j = jornadaAtual();
  if (!j) return 1;
  const n = jornadaNivel(j, id);
  if (!n) return 1;
  const passo = id === "casco" ? 0.09 : id === "escudo" ? 0.10
              : id === "cristal" ? 0.10 : id === "dano" ? 0.07 : 0.06;
  return 1 + passo * n;
}
/* código de sala que os dois calculam igual: ninguém precisa digitar */
function codigoDaDupla(chave) {
  let h = 5381;
  for (let i = 0; i < chave.length; i++) h = ((h << 5) + h + chave.charCodeAt(i)) >>> 0;
  return String(1000 + (h % 9000));
}

/* sorteio igual nos dois aparelhos: mesma semente, mesmos inimigos */
function rngDe(semente) {
  let x = semente >>> 0;
  return function () {
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17;
    x ^= x << 5;  x >>>= 0;
    return x / 4294967296;
  };
}
function sementeDaOnda(fase, onda) {
  return (parseInt(MP.sala || "0", 10) * 7919 + fase * 131 + onda * 17 + 1) >>> 0;
}
function mpAtivo() { return !!MP.sala && S.mode === "playing"; }
function mpMeuId() { return nuvemId(save.__name || "?") ; }
function mpCaminho() { return "salas/" + MP.sala; }

function codigoNovo() { return String(Math.floor(1000 + Math.random() * 9000)); }

async function mpCriarSala(modo) {
  if (!nuvemAtiva()) { avisoMulti("Ligue o modo online primeiro (config.js)."); return; }
  const codigo = codigoNovo();
  MP.sala = codigo; MP.modo = modo; MP.host = true; MP.eu = mpMeuId(); MP.outros = {}; MP.fim = null;
  MP.semOutroDesde = 0;
  calcStats();
  const sala = {
    modo, host: MP.eu, estado: "lobby", criada: Date.now(), fase: Math.max(1, save.best || 1),
    jogadores: {}
  };
  sala.jogadores[MP.eu] = mpMeuResumo(true);
  const ok = await nuvemReq(mpCaminho(), {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sala)
  });
  if (ok === null) { avisoMulti("Não deu para criar a sala."); MP.sala = null; return; }
  abrirSala();
}
/* cria a sala com um código escolhido (o da dupla), em vez de sorteado */
async function mpCriarSalaFixa(codigo, modo) {
  MP.sala = codigo; MP.modo = modo; MP.host = true; MP.eu = mpMeuId();
  MP.outros = {}; MP.fim = null; MP.semOutroDesde = 0;
  calcStats();
  const sala = {
    modo, host: MP.eu, estado: "lobby", criada: Date.now(),
    fase: MP.jornadaFase || Math.max(1, save.best || 1),
    jogadores: {}
  };
  sala.jogadores[MP.eu] = mpMeuResumo(true);
  const ok = await nuvemReq(mpCaminho(), {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sala)
  });
  if (ok === null) { avisoMulti("Não deu para abrir a sala."); MP.sala = null; return; }
  MP.fase = sala.fase;
  abrirSala();
}
async function mpEntrarSala(codigo, modo) {
  if (!nuvemAtiva()) { avisoMulti("Ligue o modo online primeiro (config.js)."); return; }
  codigo = String(codigo || "").trim();
  if (codigo.length !== 4) { avisoMulti("Digite os 4 números da sala."); return; }
  const sala = await nuvemReq("salas/" + codigo);
  if (!sala) { avisoMulti("Sala " + codigo + " não encontrada."); AudioSys.deny(); return; }
  if (modo && sala.modo !== modo) {
    avisoMulti("Essa sala é de " + (sala.modo === "pvp" ? "duelo" : "cooperativo") + ".");
    AudioSys.deny(); return;
  }
  MP.sala = codigo; MP.modo = sala.modo; MP.host = false; MP.eu = mpMeuId(); MP.outros = {}; MP.fim = null;
  MP.semOutroDesde = 0;
  calcStats();
  MP.fase = sala.fase || 1;
  await nuvemReq(mpCaminho() + "/jogadores/" + MP.eu, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(mpMeuResumo(true))
  });
  AudioSys.buy();
  abrirSala();
}
function mpMeuResumo(completo) {
  const r = {
    nome: save.__name || "Piloto",
    nave: save.ship,
    hpMax: ST ? ST.maxHp : 100,
    rank: save.rank || 0,
    ts: Date.now()
  };
  if (completo) { r.pronto = false; r.pontos = 0; r.vivo = true; r.hp = r.hpMax; }
  return r;
}
function avisoMulti(txt) {
  const el = $("sala-dica");
  if (el) el.textContent = txt;
  const el2 = $("multi-aviso");
  if (el2) el2.textContent = txt;
  admMsg ? null : null;
}

/* ----- tela da sala ----- */
function abrirSala() {
  S.mode = "sala";
  const jor = MP.jornadaChave ? (save.jornadas || {})[MP.jornadaChave] : null;
  $("sala-codigo").textContent = MP.sala;
  $("sala-titulo").textContent = MP.modo === "pvp" ? "DUELO"
    : jor ? "JORNADA" : "COOPERATIVO";
  $("sala-modo").textContent = jor
    ? "FASE " + (MP.jornadaFase || jor.fase || 1) + " · " + jor.amigo
    : (MP.host ? "VOCÊ CRIOU" : "CONVIDADO");
  $("sala-comecar").style.display = MP.host ? "block" : "none";
  showScreen("sala");
  mpIniciarLoop();
}
async function mpLerSala() {
  if (!MP.sala) return null;
  const sala = await nuvemReq(mpCaminho());
  if (!sala) return null;
  mpAplicarSala(sala);
  return sala;
}
function renderSala(sala) {
  mpMostrarConexao();
  const box = $("sala-jogadores");
  if (!box || S.mode !== "sala") return;
  const js = (sala && sala.jogadores) || {};
  box.innerHTML = "";
  const ids = Object.keys(js);
  for (const id of ids) {
    const j = js[id];
    const row = document.createElement("div");
    row.className = "jog-row";
    const cv = document.createElement("canvas");
    cv.className = "jog-thumb";
    cv.width = 72; cv.height = 72;
    const c2 = cv.getContext("2d");
    c2.setTransform(2, 0, 0, 2, 18, 20);
    drawShipSprite(c2, j.nave || 0, 12);
    const info = document.createElement("div");
    info.innerHTML = '<div class="jog-nome">' + escaparTexto(j.nome) +
      (id === MP.eu ? " (você)" : "") + "</div>" +
      '<div class="jog-meta">' + (SHIPS[j.nave] ? SHIPS[j.nave].name : "?") +
      " · " + (j.hpMax || 0) + " de vida" +
      (MP.modo === "pvp" ? " · " + nomeDoRank(j.rank || 0) : "") + "</div>";
    const tag = document.createElement("div");
    tag.className = "jog-tag";
    tag.textContent = id === (sala && sala.host) ? "ANFITRIÃO" : "PRONTO";
    row.appendChild(cv); row.appendChild(info); row.appendChild(tag);
    box.appendChild(row);
  }
  const dica = $("sala-dica");
  if (ids.length < 2) dica.textContent = "Passe o código " + MP.sala + " para o seu amigo entrar.";
  else if (MP.host) dica.textContent = "Todo mundo pronto! Toque em COMEÇAR.";
  else dica.textContent = "Esperando o anfitrião começar…";
}

/* ----- laço de sincronização ----- */
function mpIniciarLoop() {
  mpPararLoop();
  if (MP.modo === "arena") return;   // a arena tem o fluxo dela
  // no lobby o envio é por temporizador; em partida, pelo laço do jogo
  MP.loopRapido = setInterval(() => { if (S.mode === "sala") mpEnviarPosicao(); }, 400);

  // 1º: tenta o fluxo (o servidor empurra as mudanças na hora — sem atraso)
  MP.fluindo = false;
  MP.ultimoDesenho = 0;
  MP.fecharFluxo = nuvemFluxo(mpCaminho(), sala => {
    MP.fluindo = true;
    mpAplicarSala(sala);            // isto é barato e tem de ser sempre
    // já mexer na tela é caro: no máximo 10 vezes por segundo
    const t = performance.now();
    if (t - MP.ultimoDesenho < 100) return;
    MP.ultimoDesenho = t;
    if (S.mode === "sala") renderSala(sala);
    if (S.mode === "playing") {
      if (MP.modo === "pvp") mpChecarFimDuelo();
      else mpSincronizarCoop(sala);
    }
    mpAtualizarPlacar();
  }, () => { MP.fluindo = false; mpLigarReserva(); });

  // 2º: rede de segurança. Com o fluxo vivo ela quase não é usada.
  mpLigarReserva();
}
function mpLigarReserva() {
  if (MP.loopPos) clearInterval(MP.loopPos);
  if (MP.loopLento) clearInterval(MP.loopLento);
  MP.loopPos = setInterval(() => { if (!MP.fluindo) mpLerJogadores(); }, 170);
  MP.loopLento = setInterval(() => { mpTick(); }, MP.fluindo ? 2500 : 620);
}

/* leitura enxuta: só o nó dos jogadores, para o parceiro andar liso */
let mpLendoPos = false;
async function mpLerJogadores() {
  if (!MP.sala || mpLendoPos || S.mode !== "playing") return;
  mpLendoPos = true;
  try {
    const js = await nuvemReq(mpCaminho() + "/p");
    if (js) {
      MP.ultimoOk = Date.now();
      for (const id in js) {
        if (id === MP.eu) continue;
        const d = mpDesempacotar(js[id]);
        if (!d) continue;
        if (!MP.outros[id]) MP.outros[id] = {};
        Object.assign(MP.outros[id], d);
        mpGuardarPasso(MP.outros[id], d);
        /* ESTE caminho é o que roda quando o fluxo do Firebase não está
           disponível (rede que bloqueia streaming, por exemplo). Ele
           esquecia de aplicar os abates e os poderes: no cooperativo o
           inimigo que o parceiro matava simplesmente não morria aqui. */
        for (const pd of (d.poderes || [])) mpPoderRecebido(MP.outros[id], pd);
        if (d.abates && d.abates.length && MP.modo !== "pvp") mpAplicarAbates(d.abates);
        if (MP.modo === "pvp") mpChecarFimDuelo();
      }
      MP.ticks = (MP.ticks || 0) + 1;
    }
  } catch (e) {}
  mpLendoPos = false;
}
function mpPararLoop() {
  if (MP.loopRapido) clearInterval(MP.loopRapido);
  if (MP.loopPos) clearInterval(MP.loopPos);
  if (MP.loopLento) clearInterval(MP.loopLento);
  MP.loopRapido = MP.loopPos = MP.loopLento = null;
  if (MP.fecharFluxo) { MP.fecharFluxo(); MP.fecharFluxo = null; }
  MP.fluindo = false;
}

/* mescla o que veio da sala (do fluxo ou da leitura normal) */
function mpAplicarSala(sala) {
  if (!sala) return;
  if (sala.modo) MP.modo = sala.modo;
  MP.salaCache = sala;
  const estaticos = sala.jogadores || {};
  const moveis = sala.p || {};
  const vistos = {};
  for (const id in estaticos) {
    if (id === MP.eu) continue;
    vistos[id] = true;
    if (!MP.outros[id]) MP.outros[id] = {};
    Object.assign(MP.outros[id], estaticos[id]);
  }
  for (const id in moveis) {
    if (id === MP.eu) continue;
    const d = mpDesempacotar(moveis[id]);
    if (!d) continue;
    vistos[id] = true;
    if (!MP.outros[id]) MP.outros[id] = {};
    /* O pacote de posição fica parado no servidor quando a pessoa para de
       jogar. Se ela JÁ perdeu (a ficha dela diz vivo:false), o pacote
       velho não pode dizer que ela está viva de novo — era isto que
       deixava o vencedor jogando para sempre no duelo.               */
    const ficha = estaticos[id];
    if (ficha && (ficha.vivo === false || ficha.hp === 0)) { d.vivo = false; d.hp = 0; }
    Object.assign(MP.outros[id], d);
    mpGuardarPasso(MP.outros[id], d);
    for (const pd of (d.poderes || [])) mpPoderRecebido(MP.outros[id], pd);
    if (d.abates.length && MP.modo !== "pvp") mpAplicarAbates(d.abates);
    if (MP.modo === "pvp" && (d.vivo === false || d.hp <= 0) && S.mode === "playing") {
      mpChecarFimDuelo();
    }
  }
  for (const id in MP.outros) if (!vistos[id]) delete MP.outros[id];
  MP.ticks = (MP.ticks || 0) + 1;
  /* apareceu alguém na sala: já tenta a ligação direta, ainda no lobby,
     para a partida começar com o canal pronto                          */
  if (!p2pAberto() && !P2P.tentando && !P2P.desistiu) {
    const outro = Object.keys(MP.outros)[0];
    if (outro) p2pIniciar(outro);
  }
  if (sala.estado === "jogando" && S.mode === "sala") {
    MP.fase = sala.fase || 1;
    iniciarPartidaMultijogador();
  }
}

/* =====================================================================
   Cooperativo de verdade: o abate de um vale para os dois
   ---------------------------------------------------------------------
   Os inimigos já nasciam iguais nos dois aparelhos, mas cada um matava os
   seus. Por isso um terminava a onda antes do outro e ninguém via o
   ataque do parceiro. Agora:
     - cada inimigo tem um número de série igual nos dois (sid);
     - quando eu derrubo um, mando o número; o outro derruba o mesmo na
       hora, com explosão, sem esperar;
     - os tiros também são enviados, então dá para ver o parceiro atirando.
   ===================================================================== */
let mpAbatidos = {};     // sid -> já removido aqui
let mpMeusAbates = [];   // sid que EU derrubei nesta onda
let mpAbatesEnviados = 0;
let mpAbatesRecebidos = 0;   // total que veio do parceiro (para conferência)

function mpAvisarAbate(e) {
  if (!MP.sala || MP.modo === "pvp" || e.sid === undefined) return;
  if (mpAbatidos[e.sid]) return;
  mpAbatidos[e.sid] = 1;
  mpMeusAbates.push(e.sid);
  if (mpMeusAbates.length > 300) mpMeusAbates.splice(0, 150);
  /* na ligação direta o abate não espera o próximo pacote: sai agora,
     pelo canal com garantia de entrega. É por isso que o inimigo cai na
     mesma hora nas duas telas.                                        */
  p2pEnviar("k" + e.sid, true);
}
/* aplica os abates que o parceiro mandou */
function mpAplicarAbates(lista) {
  if (!lista || MP.modo === "pvp") return;
  for (const sidCru of lista) {
    const sid = +sidCru;
    if (mpAbatidos[sid]) continue;
    mpAbatidos[sid] = 1;
    mpAbatesRecebidos++;
    for (let i = enemies.length - 1; i >= 0; i--) {
      if (enemies[i].sid !== sid) continue;
      const e = enemies[i];
      explosion(e.x, e.y, e.type === "tank" ? "#FFC145" : "#FF4D8F", e.type === "tank" ? 20 : 11);
      AudioSys.explode();
      maybeDrop(e.x, e.y);
      enemies.splice(i, 1);
      break;
    }
  }
}
/* =====================================================================
   MOSTRAR OS PODERES PARA O OUTRO
   ---------------------------------------------------------------------
   Tiro já aparecia; ultimate e habilidade, não — quem estava do outro
   lado só via a nave parada e do nada tomava dano. Agora cada poder vira
   um recadinho (número de série, tipo e nome) que vai na hora pelo canal
   firme e também dentro do pacote normal, para funcionar até pela nuvem.
   Do outro lado ele vira clarão, anel e o nome escrito por cima da nave.
   ===================================================================== */
let mpPoderes = [];        // últimos poderes meus, para irem no pacote
let mpPoderSerie = 0;
function mpAvisarPoder(tipo, nome) {
  if (!MP.sala) return;
  mpPoderSerie++;
  const msg = mpPoderSerie + "," + String(tipo || "ult").replace(/[,;|]/g, "") + "," +
              String(nome || "").replace(/[,;|]/g, " ").slice(0, 26);
  mpPoderes.push(msg);
  if (mpPoderes.length > 5) mpPoderes.shift();
  p2pEnviar("x" + msg, true);
}
function mpPoderRecebido(o, msg) {
  if (!o || !msg) return;
  const v = String(msg).split(",");
  const serie = +v[0];
  if (!serie) return;
  if (!o.poderesVistos) o.poderesVistos = {};
  if (o.poderesVistos[serie]) return;
  o.poderesVistos[serie] = 1;
  o.poder = { tipo: v[1] || "ult", nome: v.slice(2).join(",") || "PODER", t: 1.8, max: 1.8 };
  try { AudioSys.ultFire(); } catch (e) {}
}
/* clarão do poder do outro, desenhado em volta da nave dele */
function mpDesenharPoderDoOutro(o, x, y) {
  if (!o || !o.poder || o.poder.t <= 0) return;
  const p = o.poder;
  const f = p.t / p.max;
  const cor = p.tipo === "ult" ? "255,193,69" : "124,247,192";
  ctx.save();
  ctx.globalAlpha = Math.min(1, f * 1.2);
  ctx.strokeStyle = "rgba(" + cor + ",.9)";
  ctx.lineWidth = 3;
  const r1 = 26 + (1 - f) * 90;
  ctx.beginPath(); ctx.arc(x, y, r1, 0, TAU); ctx.stroke();
  ctx.globalAlpha = Math.min(1, f * 0.7);
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(x, y, r1 * 0.62, 0, TAU); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.textAlign = "center";
  ctx.font = "800 11px 'Chakra Petch',sans-serif";
  ctx.fillStyle = "rgba(" + cor + "," + Math.min(1, f * 1.4) + ")";
  ctx.fillText(String(p.nome).toUpperCase(), x, y - 40 - (1 - f) * 16);
  ctx.restore();
}

/* mostra os tiros do parceiro voando na minha tela */
function mpDesenharTirosDoOutro(o) {
  if (!o || !o.tiros || !o.tiros.length) return;
  ctx.save();
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = MP.modo === "pvp" ? "#FF6B8A" : "#7CF7C0";
  ctx.shadowColor = ctx.fillStyle;
  ctx.shadowBlur = 8;
  for (const t of o.tiros) {
    const x = t[0], y = t[1];
    if (x === undefined) continue;
    ctx.fillRect(x - 2, y - 7, 4, 13);
  }
  ctx.restore();
  ctx.shadowBlur = 0;
}

/* ---------------------------------------------------------------------
   Envio da posição: uma LINHA de texto, não um objeto.
   Quanto menor o pacote, mais rápido ele sai do celular e chega no outro.
   Vai num galho separado (p/) para o fluxo avisar só o que mudou.
   --------------------------------------------------------------------- */
/* Tudo o que o outro precisa saber vai num pacote SÓ:
     posição ; tiros ; abates
   Antes eram três requisições separadas a cada 110 ms — trinta por
   segundo. No computador não dava para notar, mas no celular a conexão
   entupia e o jogo travava. Agora é uma requisição por vez, e só começa
   a próxima quando a anterior volta.                                     */
function mpEmpacotar() {
  const cab = [
    Math.round(player.x), Math.round(player.y),
    Math.max(0, Math.round(player.hp)),
    Math.round(ST ? ST.maxHp : 100),
    (player.alive && player.hp > 0) ? 1 : 0,
    Math.round(S.score || 0),
    Math.round(MP.meuDano || 0),
    S.waveIdx || 0,
    save.ship || 0,
    save.rank || 0,
    Date.now() % 100000000,
    (save.__name || "Piloto").replace(/[,;|]/g, " ")
  ].join(",");
  /* Os tiros iam só com a posição, então chegavam PARADOS no outro
     aparelho e sumiam no pacote seguinte. Agora vai também a velocidade
     e um número de série: o outro lado cria o tiro de verdade e ele voa
     sozinho entre um pacote e outro. Fica liso mesmo com a rede lenta. */
  const novos = [];
  for (let i = bullets.length - 1; i >= 0 && novos.length < 10; i--) {
    const b = bullets[i];
    if (!b || b.serie === undefined) continue;
    if (b.serie <= (MP.serieEnviada || 0)) break;
    novos.push(b);
  }
  if (novos.length) MP.serieEnviada = novos[0].serie;
  const tiros = novos.reverse().map(b =>
    b.serie + "," + Math.round(b.x) + "," + Math.round(b.y) + "," +
    Math.round(b.vx / 10) + "," + Math.round(b.vy / 10)).join("|");
  const abates = MP.modo === "pvp" ? "" : mpMeusAbates.slice(-120).join("|");
  const poderes = mpPoderes.join("|");
  return cab + ";" + tiros + ";" + abates + ";" + poderes;
}
function mpDesempacotar(linha) {
  const partes = String(linha).split(";");
  const t = (partes[0] || "").split(",");
  if (t.length < 12) return null;
  const d = {
    x: +t[0], y: +t[1], hp: +t[2], hpMax: +t[3], vivo: t[4] === "1",
    pontos: +t[5], dano: +t[6], onda: +t[7], nave: +t[8], rank: +t[9],
    ts: +t[10], nome: t.slice(11).join(",")
  };
  d.tiros = partes[1]
    ? partes[1].split("|").map(p => {
        const v = p.split(",").map(Number);
        return v.length >= 5
          ? { serie: v[0], x: v[1], y: v[2], vx: v[3] * 10, vy: v[4] * 10 }
          : { serie: 0, x: v[0], y: v[1], vx: 0, vy: -560 };   // pacote antigo
      })
    : [];
  d.abates = partes[2] ? partes[2].split("|") : [];
  d.poderes = partes[3] ? partes[3].split("|") : [];
  return d;
}
/* =====================================================================
   REDE DIRETA (P2P) — um celular falando com o outro, sem servidor
   ---------------------------------------------------------------------
   A nuvem passa a servir só para os dois se acharem (o aperto de mão).
   Feito isso, tudo o que importa no meio da partida — posição, tiros,
   abates e a troca de onda — vai DIRETO de um aparelho para o outro por
   WebRTC. Sem a viagem até o servidor e de volta, o atraso cai de
   150–400 ms para 10–40 ms, e é por isso que o abate aparece na hora
   nas duas telas.

   Dois canais:
     • rápido — sem reenvio e sem ordem: posição 30 vezes por segundo.
       Se um pacote se perder, o próximo já vem com a informação nova;
       reenviar o velho só atrasaria o resto.
     • firme  — com garantia de entrega: abates, onda, fase e fim. São
       poucos e não podem sumir.

   Se a operadora não deixar a ligação direta acontecer, nada quebra: o
   jogo continua pela nuvem, do jeito que sempre funcionou.
   ===================================================================== */
const P2P = {
  pc: null, rapido: null, firme: null,
  ligado: false, tentando: false, papel: null, parceiro: null,
  ping: 0, ultimoPing: 0, fecharSinal: null, gelosEnviados: 0,
  desdeTentativa: 0, desistiu: false, falhas: 0, recebidos: 0, enviados: 0
};
const P2P_GELO = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" }
  ]
};
function p2pTem() {
  return typeof RTCPeerConnection === "function" && !!MP.sala && MP.modo !== "arena";
}
function p2pAberto() {
  return !!(P2P.ligado && P2P.rapido && P2P.rapido.readyState === "open");
}
function p2pFirmeAberto() {
  return !!(P2P.firme && P2P.firme.readyState === "open");
}
function p2pInbox(id) { return mpCaminho() + "/sinal/" + id; }

/* quem começa a conversa é sempre o mesmo dos dois lados: o id menor.
   Assim os dois não mandam oferta ao mesmo tempo e se atrapalham.     */
function p2pEuChamo(idDoOutro) {
  return String(MP.eu) < String(idDoOutro);
}

function p2pFechar(silencioso) {
  try { if (P2P.fecharSinal) P2P.fecharSinal(); } catch (e) {}
  P2P.fecharSinal = null;
  try { if (P2P.rapido) P2P.rapido.close(); } catch (e) {}
  try { if (P2P.firme) P2P.firme.close(); } catch (e) {}
  try { if (P2P.pc) P2P.pc.close(); } catch (e) {}
  P2P.pc = P2P.rapido = P2P.firme = null;
  P2P.ligado = false; P2P.tentando = false; P2P.parceiro = null;
  P2P.gelosEnviados = 0; P2P.ping = 0;
  if (!silencioso) mpMostrarConexao();
}

function p2pPrepararCanais(canal, rapido) {
  canal.onopen = () => {
    if (rapido) {
      P2P.ligado = true;
      P2P.tentando = false;
      P2P.falhas = 0;
      P2P.desistiu = false;
      addTextSeguro("LIGAÇÃO DIRETA");
      mpMostrarConexao();
      p2pMedirPing();
    }
    /* assim que abre, o anfitrião conta em que onda está: o convidado
       entra na mesma hora, sem esperar a nuvem                      */
    if (!rapido && MP.host && S.mode === "playing") p2pMandarOnda();
  };
  canal.onclose = () => {
    if (rapido) { P2P.ligado = false; mpMostrarConexao(); }
  };
  canal.onmessage = (ev) => p2pReceber(ev.data);
}
function addTextSeguro(txt) {
  try { if (S.mode === "playing" && player && player.alive) addText(player.x, player.y - 40, txt, "#7CF7C0"); } catch (e) {}
}

async function p2pIniciar(idDoOutro) {
  if (!p2pTem() || P2P.tentando || p2pAberto() || P2P.desistiu) return;
  if (!idDoOutro) return;
  P2P.tentando = true;
  P2P.parceiro = idDoOutro;
  P2P.desdeTentativa = Date.now();
  try {
    const pc = new RTCPeerConnection(P2P_GELO);
    P2P.pc = pc;
    pc.onicecandidate = (ev) => {
      if (!ev.candidate) return;
      nuvemSoltar(p2pInbox(idDoOutro) + "/gelo/" + (P2P.gelosEnviados++),
                  { c: ev.candidate.candidate, m: ev.candidate.sdpMid,
                    i: ev.candidate.sdpMLineIndex, de: MP.eu });
    };
    pc.onconnectionstatechange = () => {
      const e = pc.connectionState;
      if (e === "failed" || e === "closed") {
        P2P.ligado = false;
        mpMostrarConexao();
        // uma nova tentativa daqui a pouco; depois de três, fica só na nuvem
        setTimeout(() => { if (MP.sala) p2pTentarDeNovo(); }, 1500);
      }
    };
    /* escuta a minha caixinha de recados na nuvem */
    P2P.fecharSinal = nuvemFluxo(p2pInbox(MP.eu), (caixa) => p2pCaixa(caixa),
      () => { p2pPuxarCaixa(); });
    p2pRelogioCaixa();

    if (p2pEuChamo(idDoOutro)) {
      P2P.papel = "chama";
      const rapido = pc.createDataChannel("r", { ordered: false, maxRetransmits: 0 });
      const firme  = pc.createDataChannel("f", { ordered: true });
      P2P.rapido = rapido; P2P.firme = firme;
      p2pPrepararCanais(rapido, true);
      p2pPrepararCanais(firme, false);
      const oferta = await pc.createOffer();
      await pc.setLocalDescription(oferta);
      await nuvemSoltar(p2pInbox(idDoOutro) + "/oferta",
                        { sdp: pc.localDescription.sdp, de: MP.eu, t: Date.now() });
    } else {
      P2P.papel = "atende";
      pc.ondatachannel = (ev) => {
        const c = ev.channel;
        if (c.label === "r") { P2P.rapido = c; p2pPrepararCanais(c, true); }
        else { P2P.firme = c; p2pPrepararCanais(c, false); }
      };
    }
  } catch (e) {
    P2P.tentando = false;
  }
}
function p2pTentarDeNovo() {
  const alvo = P2P.parceiro || Object.keys(MP.outros)[0];
  p2pFechar(true);
  P2P.falhas = (P2P.falhas || 0) + 1;
  if (P2P.falhas >= 3) { P2P.desistiu = true; mpMostrarConexao(); return; }
  if (alvo) p2pIniciar(alvo);
}

/* lê a caixinha: oferta, resposta e os candidatos de rede */
let p2pVistos = {};
async function p2pCaixa(caixa) {
  if (!caixa || !P2P.pc) return;
  const pc = P2P.pc;
  try {
    if (caixa.oferta && caixa.oferta.de !== MP.eu && !p2pVistos["o" + caixa.oferta.t]) {
      p2pVistos["o" + caixa.oferta.t] = 1;
      await pc.setRemoteDescription({ type: "offer", sdp: caixa.oferta.sdp });
      const resp = await pc.createAnswer();
      await pc.setLocalDescription(resp);
      await nuvemSoltar(p2pInbox(caixa.oferta.de) + "/resposta",
                        { sdp: pc.localDescription.sdp, de: MP.eu, t: Date.now() });
    }
    if (caixa.resposta && caixa.resposta.de !== MP.eu && !p2pVistos["r" + caixa.resposta.t]) {
      p2pVistos["r" + caixa.resposta.t] = 1;
      if (pc.signalingState === "have-local-offer") {
        await pc.setRemoteDescription({ type: "answer", sdp: caixa.resposta.sdp });
      }
    }
    if (caixa.gelo) {
      for (const k in caixa.gelo) {
        const g = caixa.gelo[k];
        if (!g || g.de === MP.eu || p2pVistos["g" + k]) continue;
        p2pVistos["g" + k] = 1;
        try {
          await pc.addIceCandidate({ candidate: g.c, sdpMid: g.m, sdpMLineIndex: g.i });
        } catch (e) {}
      }
    }
  } catch (e) {}
}
/* se o fluxo não estiver disponível, lê a caixinha de tempos em tempos */
let p2pRelogio = null;
function p2pRelogioCaixa() {
  if (p2pRelogio) clearInterval(p2pRelogio);
  p2pRelogio = setInterval(() => {
    if (!MP.sala) { clearInterval(p2pRelogio); p2pRelogio = null; return; }
    if (p2pAberto()) return;      // já ligou: não precisa mais ler
    p2pPuxarCaixa();
  }, 900);
}
async function p2pPuxarCaixa() {
  if (!MP.sala || !P2P.pc) return;
  try { const c = await nuvemReq(p2pInbox(MP.eu)); if (c) p2pCaixa(c); } catch (e) {}
}
function p2pLimparCaixa() {
  if (!MP.sala || !MP.eu) return;
  try { nuvemReq(p2pInbox(MP.eu), { method: "DELETE" }); } catch (e) {}
  p2pVistos = {};
}

/* ---------- conversa dentro do canal ---------- */
function p2pEnviar(txt, firme) {
  try {
    if (firme) {
      if (!p2pFirmeAberto()) return false;
      P2P.firme.send(txt);
    } else {
      if (!p2pAberto()) return false;
      P2P.rapido.send(txt);
    }
    P2P.enviados++;
    return true;
  } catch (e) { return false; }
}
function p2pReceber(txt) {
  if (typeof txt !== "string" || !txt.length) return;
  P2P.recebidos++;
  MP.ultimoOk = Date.now();
  const tipo = txt[0], corpo = txt.slice(1);
  if (tipo === "e") {                       // estado do outro piloto
    const d = mpDesempacotar(corpo);
    if (!d) return;
    const id = P2P.parceiro || "p2p";
    if (!MP.outros[id]) MP.outros[id] = {};
    Object.assign(MP.outros[id], d);
    mpGuardarPasso(MP.outros[id], d);
    for (const pd of (d.poderes || [])) mpPoderRecebido(MP.outros[id], pd);
    if (d.abates && d.abates.length && MP.modo !== "pvp") mpAplicarAbates(d.abates);
    // se o pacote diz que ele caiu, o duelo termina na hora
    if (MP.modo === "pvp" && (d.vivo === false || d.hp <= 0)) mpChecarFimDuelo();
    /* no cooperativo, marca a hora da queda para o parceiro poder reviver */
    const alvo = MP.outros[id];
    if (alvo && d.vivo === false && !alvo.caiuEm) alvo.caiuEm = Date.now();
    if (alvo && d.vivo !== false) alvo.caiuEm = 0;
    mpAtualizarPlacar();
  } else if (tipo === "x") {                // poder do outro (ult/habilidade)
    const id = P2P.parceiro || "p2p";
    if (!MP.outros[id]) MP.outros[id] = {};
    mpPoderRecebido(MP.outros[id], corpo);
  } else if (tipo === "m") {                // emote do parceiro
    emoteRecebido(corpo);
  } else if (tipo === "v") {                // o parceiro me levantou
    fuiRevivido();
  } else if (tipo === "k") {                // abates, na hora
    if (MP.modo !== "pvp") mpAplicarAbates(corpo.split("|"));
  } else if (tipo === "w") {                // onda e fase do anfitrião
    const v = corpo.split(",").map(Number);
    mpEntrarNaOnda(v[0], v[1]);
  } else if (tipo === "d") {                // dano no chefe
    const id = P2P.parceiro || "p2p";
    if (!MP.outros[id]) MP.outros[id] = {};
    MP.outros[id].dano = +corpo || 0;
  } else if (tipo === "p") {                // pediram ping
    p2pEnviar("o" + corpo, false);
  } else if (tipo === "o") {                // voltou o ping
    const t0 = +corpo;
    if (t0) {
      const ida = Math.max(1, Math.round(performance.now() - t0));
      P2P.ping = P2P.ping ? Math.round(P2P.ping * 0.7 + ida * 0.3) : ida;
      mpMostrarConexao();
    }
  } else if (tipo === "f") {                // o outro terminou
    const id = P2P.parceiro || "p2p";
    if (!MP.outros[id]) MP.outros[id] = {};
    MP.outros[id].vivo = false;
    MP.outros[id].hp = 0;
    // não espera o próximo tique: o duelo acaba agora nos dois lados
    if (MP.modo === "pvp") mpChecarFimDuelo();
  }
}
function p2pMedirPing() {
  if (!p2pAberto()) return;
  p2pEnviar("p" + Math.round(performance.now()), false);
  setTimeout(p2pMedirPing, 2000);
}
function p2pMandarOnda() {
  if (!MP.host) return;
  p2pEnviar("w" + (S.fase || 1) + "," + (S.waveIdx || 0), true);
}

/* ---------- o que aparece na tela sobre a ligação ---------- */
function mpMostrarConexao() {
  /* na sala de espera a mesma informação vira uma frase inteira */
  const sn = $("sala-net");
  if (sn && MP.sala) {
    sn.innerHTML = p2pAberto()
      ? "<b>⚡ Ligação direta pronta</b> — os dois aparelhos já estão conversando" +
        (P2P.ping ? " com " + P2P.ping + " ms de ida e volta." : ".")
      : (P2P.tentando && !P2P.desistiu
          ? "⇄ Ligando os dois aparelhos direto…"
          : "☁ A partida vai pela nuvem" +
            (P2P.desistiu ? " (a rede não deixou a ligação direta)." : ", esperando o outro piloto."));
  }
  const el = $("mp-conexao");
  if (!el) return;
  if (!MP.sala || S.mode !== "playing") { el.style.display = "none"; return; }
  el.style.display = "flex";
  if (p2pAberto()) {
    el.className = "mp-conexao direto";
    el.textContent = "⚡ DIRETO" + (P2P.ping ? " " + P2P.ping + "ms" : "");
  } else if (P2P.tentando && !P2P.desistiu) {
    el.className = "mp-conexao ligando";
    el.textContent = "⇄ ligando direto…";
  } else {
    el.className = "mp-conexao nuvem";
    el.textContent = "☁ NUVEM " + Math.round(REDE.ida) + "ms";
  }
}

let mpEnviando = false;
/* mede quanto a rede está demorando, para não empurrar mais do que ela leva */
const REDE = { ida: 120, intervalo: 110, ruim: 0 };
function redeAnotar(ms) {
  REDE.ida = REDE.ida * 0.7 + ms * 0.3;
  // manda no máximo tão rápido quanto a resposta volta
  /* na arena todo mundo voa junto na mesma tela: vale mandar mais vezes.
     No cooperativo e no duelo o ritmo continua o de antes.            */
  const piso = (typeof MP !== "undefined" && MP && MP.modo === "arena") ? 70 : 110;
  const teto = (typeof MP !== "undefined" && MP && MP.modo === "arena") ? 360 : 520;
  REDE.intervalo = clamp(Math.round(REDE.ida * 1.05), piso, teto);
  REDE.ruim = REDE.ida > 400 ? Math.min(5, REDE.ruim + 1) : Math.max(0, REDE.ruim - 1);
}
async function mpEnviarPosicao() {
  if (!MP.sala || mpEnviando) return;
  if (S.mode !== "playing" && S.mode !== "gameover" &&
      S.mode !== "paused" && S.mode !== "sala") return;
  /* ligação direta aberta: vai por ela e pronto. A nuvem só recebe uma
     batidinha de vez em quando, para a sala não parecer abandonada.   */
  if (p2pAberto() && S.mode === "playing") {
    p2pEnviar("e" + mpEmpacotar(), false);
    mpAbatesEnviados = mpMeusAbates.length;
    const agora = Date.now();
    if (agora - (MP.ultimaBatida || 0) > 3000) {
      MP.ultimaBatida = agora;
      const raiz = MP.modo === "arena" ? "arena" : mpCaminho();
      nuvemSoltar(raiz + "/p/" + MP.eu, mpEmpacotar());
    }
    return;
  }
  mpEnviando = true;
  const t0 = performance.now();
  try {
    if (S.mode === "sala") {
      await nuvemSoltar(mpCaminho() + "/jogadores/" + MP.eu, mpMeuResumo(true));
    } else {
      const raiz = MP.modo === "arena" ? "arena" : mpCaminho();
      await nuvemSoltar(raiz + "/p/" + MP.eu, mpEmpacotar());
      mpAbatesEnviados = mpMeusAbates.length;
    }
  } catch (e) {}
  redeAnotar(performance.now() - t0);
  mpEnviando = false;
}
async function mpTick() {
  if (!MP.sala) { mpPararLoop(); return; }
  if (S.mode === "sala") await mpEnviarPosicao();
  const sala = MP.fluindo ? MP.salaCache : await mpLerSala();
  if (S.mode === "sala") renderSala(sala);
  if (S.mode === "playing") {
    if (MP.modo === "pvp") mpChecarFimDuelo();
    else mpSincronizarCoop(sala);
  }
  mpAtualizarPlacar();
}

/* mantém os dois na mesma onda, na mesma fase e com o MESMO chefe */
function mpSincronizarCoop(sala) {
  if (!sala || !mpCoop()) return;
  // soma o dano de todos no chefe
  let total = MP.meuDano;
  for (const id in MP.outros) total += (MP.outros[id].dano || 0);
  MP.danoTotal = total;
  if (boss && !boss.entering) {
    const restante = boss.maxHp - total;
    if (restante <= 0 && bossHpLeft() > 0) {
      boss.hp = 0;
      if (boss.kind === "colosso") { boss.coreHp = 0; boss.pods = []; }
      bossDefeated();
    } else if (boss.kind !== "colosso") {
      boss.hp = Math.max(1, restante);
    }
  }
  // o anfitrião manda a onda; o convidado acompanha
  if (MP.host) {
    if (sala.onda !== S.waveIdx) {
      nuvemReq(mpCaminho() + "/onda", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(S.waveIdx)
      });
    }
    if (sala.fase !== S.fase) {
      nuvemReq(mpCaminho() + "/fase", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(S.fase)
      });
    }
  } else {
    if (sala.fase && sala.fase !== S.fase) {
      MP.fase = sala.fase;
      MP.meuDano = 0;
      startGame(sala.fase);
      return;
    }
    if (sala.onda && sala.onda !== S.waveIdx) {
      S.waveIdx = sala.onda;
      enemies = [];
      MP.meuDano = 0;
      setupWave();
    }
  }
}

/* =====================================================================
   Nave do parceiro sem tremer: guarda os últimos passos com a hora em
   que chegaram e desenha um tiquinho no passado, entre dois passos
   reais. É o mesmo truque dos jogos de tiro online: 55 ms de atraso
   proposital valem mais do que adivinhar onde ele está agora.
   ===================================================================== */
const MP_ATRASO = 55;   // ms de folga para interpolar
function mpGuardarPasso(o, d) {
  if (!o.buf) o.buf = [];
  o.buf.push({ t: performance.now(), x: d.x, y: d.y });
  if (o.buf.length > 16) o.buf.shift();
}
function mpPosicaoSuave(o) {
  const b = o.buf;
  if (!b || b.length < 2) return null;
  const alvo = performance.now() - MP_ATRASO;
  if (alvo <= b[0].t) return { x: b[0].x, y: b[0].y };
  for (let i = b.length - 1; i > 0; i--) {
    if (b[i - 1].t <= alvo && alvo <= b[i].t) {
      const f = (alvo - b[i - 1].t) / Math.max(1, b[i].t - b[i - 1].t);
      return { x: lerp(b[i - 1].x, b[i].x, f), y: lerp(b[i - 1].y, b[i].y, f) };
    }
  }
  const u = b[b.length - 1], a = b[b.length - 2];
  const dtms = Math.max(16, u.t - a.t);
  const adiante = clamp((alvo - u.t) / dtms, 0, 2.5);
  return { x: u.x + (u.x - a.x) * adiante, y: u.y + (u.y - a.y) * adiante };
}
/* o convidado entra na mesma onda e na mesma fase do anfitrião */
function mpEntrarNaOnda(fase, onda) {
  if (MP.host || MP.modo === "pvp" || !MP.sala) return;
  if (S.mode !== "playing") return;
  if (fase && fase !== S.fase) {
    MP.fase = fase; MP.meuDano = 0;
    startGame(fase);
    return;
  }
  if (onda !== undefined && onda !== null && onda !== S.waveIdx) {
    S.waveIdx = onda;
    enemies = [];
    MP.meuDano = 0;
    setupWave();
  }
}

function mpOutroPrincipal() {
  const ids = Object.keys(MP.outros);
  return ids.length ? MP.outros[ids[0]] : null;
}
function mpAtualizarPlacar() {
  /* na sala de espera, mostra o que cada um está fazendo */
  try { if (S.mode === "sala") salaEsperaRender(); } catch (e) {}
  mpMostrarConexao();
  const box = $("mp-placar");
  if (!box) return;
  const o = mpOutroPrincipal();
  if (!MP.sala || S.mode !== "playing" || !o) { box.style.display = "none"; return; }
  box.style.display = "flex";
  if (MP.modo === "pvp") {
    document.querySelector(".mp-barra").classList.remove("coop");
    $("mp-nome").textContent = "⚔ " + escaparTexto(o.nome);
    const frac = clamp((o.hp || 0) / (o.hpMax || 1), 0, 1);
    $("mp-hp").style.width = (frac * 100) + "%";
    $("mp-hp-txt").textContent = Math.max(0, o.hp || 0) + " / " + (o.hpMax || 0);
  } else {
    document.querySelector(".mp-barra").classList.add("coop");
    $("mp-nome").textContent = "🤝 " + escaparTexto(o.nome) + " · " + fmt(o.pontos || 0) + " pts";
    const frac = clamp((o.hp || 0) / (o.hpMax || 1), 0, 1);
    $("mp-hp").style.width = (frac * 100) + "%";
    $("mp-hp-txt").textContent = (o.vivo === false ? "caiu!" : Math.max(0, o.hp || 0) + " de vida");
  }
}

async function mpComecar() {
  if (!MP.host || !MP.sala) return;
  const fase = MP.modo === "pvp" ? 1
             : (MP.jornadaChave && MP.jornadaFase) ? MP.jornadaFase
             : Math.max(1, (save.coopBest || 0) + 1);
  await nuvemReq(mpCaminho() + "/estado", {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify("jogando")
  });
  await nuvemReq(mpCaminho() + "/fase", {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fase)
  });
  MP.fase = fase;
  iniciarPartidaMultijogador();
}
function iniciarPartidaMultijogador() {
  AudioSys.buy();
  startGame(MP.modo === "pvp" ? 1 : MP.fase);
  if (MP.modo === "pvp") {
    // duelo: sem inimigos, só os dois pilotos
    S.toSpawn = 0; enemies = []; boss = null;
    S.waveState = "fighting";
    S.duelo = true;
    S.banner = { text: "DUELO!", sub: "Vença o adversário", t: 2.2 };
  } else {
    S.duelo = false;
    S.banner = { text: "COOPERATIVO", sub: "Fase " + MP.fase, t: 2.2 };
  }
}
async function mpChecarFimDuelo() {
  if (MP.fim) return;
  const o = mpOutroPrincipal();
  if (!o) {
    // adversário sumiu: vitória por abandono depois de alguns segundos
    if (!MP.semOutroDesde) MP.semOutroDesde = Date.now();
    else if (Date.now() - MP.semOutroDesde > 9000 && player.alive) {
      MP.fim = "vitoria";
      finalizarDuelo("vitoria", { nome: "Adversário", rank: 0 });
    }
    return;
  }
  MP.semOutroDesde = 0;
  const perdi = player.hp <= 0 || !player.alive;
  const perdeu = (o.hp !== undefined && o.hp <= 0) || o.vivo === false;
  if (!perdi && !perdeu) return;
  MP.fim = perdi && !perdeu ? "derrota" : (perdeu && !perdi ? "vitoria" : "empate");
  finalizarDuelo(MP.fim, o);
}
function finalizarDuelo(resultado, oponente) {
  // pela ligação direta o adversário sabe na hora, sem esperar a nuvem
  if (resultado !== "vitoria") p2pEnviar("f" + resultado, true);
  /* e pela nuvem: grava o pacote de posição já com a nave caída, senão o
     último pacote (ainda vivo) seguiria valendo para o outro lado */
  if (MP.sala && resultado !== "vitoria") {
    try { nuvemSoltar(mpCaminho() + "/p/" + MP.eu, mpEmpacotar()); } catch (e) {}
  }
  // grava o meu estado final para o adversário conseguir ler o desfecho
  if (MP.sala) {
    const fim = mpMeuResumo(false);
    fim.x = Math.round(player.x); fim.y = Math.round(player.y);
    fim.vivo = resultado === "vitoria";
    fim.hp = resultado === "vitoria" ? Math.max(1, Math.round(player.hp)) : 0;
    fim.pontos = S.score;
    nuvemReq(mpCaminho() + "/jogadores/" + MP.eu, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fim)
    });
  }
  const ganho = resultado === "vitoria" ? 25 + Math.floor((oponente.rank || 0) / 100)
              : resultado === "derrota" ? -12 : 0;
  /* confere o que veio do outro aparelho antes de valer elo */
  let ganhoFinal = ganho;
  try {
    const seg = Math.max(1, (Date.now() - (S.inicioFase || Date.now())) / 1000);
    const dele = { pontos: oponente.pontos || 0, segundos: seg,
                   abates: oponente.abates || 0, elo: ganho };
    const conf = duelaValido({ pontos: S.score, segundos: seg, abates: save.abates || 0, elo: ganho }, dele);
    if (!conf.ok) {
      ganhoFinal = 0;
      anotarSuspeita(oponente.id || "?", oponente.nome || "", conf.dele, dele);
      S.banner = { text: "PARTIDA NÃO CONTOU", sub: "resultado fora do normal do outro lado", t: 3 };
    }
  } catch (e) {}
  save.rank = Math.max(0, (save.rank || 0) + ganhoFinal);
  if (resultado === "vitoria") save.vitorias = (save.vitorias || 0) + 1;
  if (resultado === "derrota") save.derrotas = (save.derrotas || 0) + 1;
  try {
    anotarPartida({ contra: oponente.nome || "Adversário", resultado: resultado,
                    elo: ganhoFinal, pontos: S.score });
  } catch (e) {}
  persist();
  nuvemEnviar(true);
  S.mode = "gameover";
  $("go-title").textContent = resultado === "vitoria" ? "VITÓRIA!" :
                              resultado === "derrota" ? "DERROTA" : "EMPATE";
  $("go-title").style.color = resultado === "vitoria" ? "var(--cyan)" : "var(--danger)";
  $("go-record").style.display = "none";
  $("go-gems").textContent = (ganhoFinal >= 0 ? "+" : "") + ganhoFinal + " pontos de rank · " +
    nomeDoRank(save.rank);
  $("go-fase").textContent = save.vitorias || 0;
  $("go-score").textContent = S.score;
  showScreen("over");
  try { revancheRender(MP.sala, MP.modo); } catch (e) {}
  // segura o registro por alguns segundos para o adversário conseguir ler o fim
  mpSair(false, true);
}
async function mpSair(voltarMenu, atraso) {
  /* saiu no meio de uma ranqueada que ainda estava rolando: tem preço */
  try {
    if (MP.sala && MP.modo === "pvp" && !MP.fim && S.mode === "playing") {
      const p = abandonoRegistrar();
      S.banner = { text: "VOCÊ SAIU NO MEIO", sub: "-" + p.perda + " de rank · " +
                   p.minutos + " min sem fila", t: 3.4 };
    }
  } catch (e) {}
  try {
    const o = mpOutroPrincipal();
    if (o && o.nome) anotarParceiro(o.nome, o.tag);
    if (MP.sala) S.ultimaSala = { codigo: MP.sala, modo: MP.modo };
  } catch (e) {}
  reconParar();
  emotesVisiveis(false);
  reconMostrar(null);
  if (MP.sala) {
    const caminho = mpCaminho() + "/jogadores/" + MP.eu;
    const movel = mpCaminho() + "/p/" + MP.eu;
    const limpar = () => {
      nuvemReq(caminho, { method: "DELETE" });
      nuvemReq(movel, { method: "DELETE" });
    };
    if (atraso) setTimeout(limpar, 7000); else limpar();
    if (MP.host) nuvemReq(mpCaminho() + "/estado", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify("fim")
    });
  }
  try { p2pLimparCaixa(); } catch (e) {}
  try { p2pFechar(true); } catch (e) {}
  P2P.falhas = 0; P2P.desistiu = false;
  mpPararLoop();
  MP.sala = null; MP.outros = {}; MP.modo = null; MP.host = false;
  MP.jornadaChave = null; MP.jornadaFase = 0;
  calcStats();
  $("mp-placar").style.display = "none";
  const cx = $("mp-conexao"); if (cx) cx.style.display = "none";
  if (voltarMenu !== false) { S.duelo = false; goMenu(); }
}

