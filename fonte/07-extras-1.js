
"use strict";
/* ---------- Desenho ---------- */
function pontosDaNave(sh) {
  return sh.ptsCustom || SHAPE_PTS[sh.shape] || SHAPE_PTS[0];
}
/* desenha as peças instaladas por cima do casco */
function desenharPecas(g, sh, k, cor) {
  const c = sh.def;
  if (!c || !c.pecas) return;
  const clara = "rgba(255,255,255,.55)";
  const escura = "#062033";
  const q = (id) => {
    const n = c.pecas[id];
    return (n === undefined || n === null) ? -1 : n;
  };
  const nivel = n => n / 29;

  // motor: chamas atrás, quanto melhor mais grossas
  let n = q("motor");
  if (n >= 0) {
    const w = (2.2 + nivel(n) * 3.4) * k, h = (5 + nivel(n) * 11) * k;
    g.fillStyle = "rgba(255,193,69,.85)";
    for (const dx of [-3.6 * k, 3.6 * k]) {
      g.beginPath();
      g.moveTo(dx - w / 2, 7 * k); g.lineTo(dx + w / 2, 7 * k);
      g.lineTo(dx, 7 * k + h); g.closePath(); g.fill();
    }
  }
  // asas / portas laterais
  n = q("dir");
  if (n >= 0) {
    const L = (5 + nivel(n) * 10) * k;
    g.fillStyle = cor; g.globalAlpha = 0.85;
    g.beginPath();
    g.moveTo(4 * k, -2 * k); g.lineTo(4 * k + L, 3 * k);
    g.lineTo(4 * k + L * 0.6, 7 * k); g.lineTo(4 * k, 5 * k);
    g.closePath(); g.fill(); g.globalAlpha = 1;
  }
  n = q("esq");
  if (n >= 0) {
    const L = (5 + nivel(n) * 10) * k;
    g.fillStyle = cor; g.globalAlpha = 0.85;
    g.beginPath();
    g.moveTo(-4 * k, -2 * k); g.lineTo(-4 * k - L, 3 * k);
    g.lineTo(-4 * k - L * 0.6, 7 * k); g.lineTo(-4 * k, 5 * k);
    g.closePath(); g.fill(); g.globalAlpha = 1;
  }
  // nariz
  n = q("frente");
  if (n >= 0) {
    const L = (3 + nivel(n) * 8) * k;
    g.fillStyle = clara;
    g.beginPath();
    g.moveTo(0, -12 * k - L); g.lineTo(1.8 * k, -11 * k);
    g.lineTo(-1.8 * k, -11 * k); g.closePath(); g.fill();
  }
  // cauda
  n = q("tras");
  if (n >= 0) {
    const L = (2.5 + nivel(n) * 6) * k;
    g.fillStyle = cor;
    for (const dx of [-2.6 * k, 2.6 * k]) {
      g.beginPath();
      g.moveTo(dx, 5 * k); g.lineTo(dx + (dx > 0 ? L : -L), 9 * k);
      g.lineTo(dx, 9 * k); g.closePath(); g.fill();
    }
  }
  // casco de baixo
  n = q("baixo");
  if (n >= 0) {
    g.fillStyle = "rgba(0,0,0,.35)";
    g.beginPath();
    g.ellipse(0, 5 * k, (3 + nivel(n) * 4) * k, (2 + nivel(n) * 3) * k, 0, 0, TAU);
    g.fill();
  }
  // armas: canos na frente
  n = q("armas");
  if (n >= 0) {
    const qtd = 1 + Math.floor(nivel(n) * 3);
    g.fillStyle = clara;
    for (let i = 0; i < qtd; i++) {
      const dx = (i - (qtd - 1) / 2) * 4.2 * k;
      g.fillRect(dx - 0.9 * k, -12 * k, 1.8 * k, (4 + nivel(n) * 5) * k);
    }
  }
  // armamento pesado: pilones sob as asas
  n = q("armamento");
  if (n >= 0) {
    g.fillStyle = "rgba(255,77,143,.9)";
    for (const dx of [-6.5 * k, 6.5 * k]) {
      g.fillRect(dx - 1.2 * k, -2 * k, 2.4 * k, (5 + nivel(n) * 5) * k);
    }
  }
  // bombas: bolinhas embaixo
  n = q("bombas");
  if (n >= 0) {
    const qtd = 2 + Math.floor(nivel(n) * 4);
    g.fillStyle = "#FFC145";
    for (let i = 0; i < qtd; i++) {
      const dx = (i - (qtd - 1) / 2) * 3.4 * k;
      g.beginPath(); g.arc(dx, 6.5 * k, (1 + nivel(n) * 1.1) * k, 0, TAU); g.fill();
    }
  }
  // defletor: anel em volta
  n = q("escudo");
  if (n >= 0) {
    g.strokeStyle = "rgba(77,232,255," + (0.3 + nivel(n) * 0.5) + ")";
    g.lineWidth = (0.8 + nivel(n) * 1.4) * k;
    g.beginPath(); g.arc(0, 0, (13 + nivel(n) * 4) * k, 0, TAU); g.stroke();
  }
  // sensor: antena em cima
  n = q("sensor");
  if (n >= 0) {
    g.strokeStyle = "rgba(195,77,255,.9)";
    g.lineWidth = 1 * k;
    g.beginPath(); g.moveTo(0, -6 * k); g.lineTo(0, (-10 - nivel(n) * 5) * k); g.stroke();
    g.fillStyle = "#C34DFF";
    g.beginPath(); g.arc(0, (-10 - nivel(n) * 5) * k, (0.9 + nivel(n) * 1.2) * k, 0, TAU); g.fill();
  }
  // cabine / teto
  n = q("teto");
  if (n >= 0) {
    g.fillStyle = "rgba(122,220,255," + (0.5 + nivel(n) * 0.4) + ")";
    g.beginPath();
    g.ellipse(0, -4 * k, (2.6 + nivel(n) * 1.6) * k, (5 + nivel(n) * 2.4) * k, 0, 0, TAU);
    g.fill();
  }
}

/* =====================================================================
   DESENHO DAS NAVES
   ---------------------------------------------------------------------
   Antes a nave era um recorte de uma cor só. Agora ela tem casco com
   luz em cima e sombra embaixo, uma quilha no meio, riscos de chapa,
   cabine de vidro com reflexo, luzes nas pontas das asas e o fogo do
   motor saindo atrás. Continua tudo desenhado na hora, sem imagem
   nenhuma para baixar — e o contorno é o mesmo de sempre, então cada
   uma das 113 naves continua com o formato dela.
   ===================================================================== */
function corMisturada(hue, luz, sat) {
  return "hsl(" + hue + "," + (sat === undefined ? 100 : sat) + "%," + luz + "%)";
}
/* retângulo de cantos redondos (usado no Trono Real) */
function caixaRedonda(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y);
  g.closePath();
}

/* ---------------------------------------------------------------------
   TRONO REAL — a privada do administrador, com o homem sentado dentro:
   coroa na cabeça, jornal na mão e o cheirinho subindo.
   --------------------------------------------------------------------- */
function desenharPrivada(g, k, detalhe) {
  const t = (typeof S !== "undefined" && S) ? S.time : 0;

  /* rastro: a descarga saindo por baixo */
  if (detalhe) {
    const mot = g.createLinearGradient(0, 16 * k, 0, 34 * k);
    mot.addColorStop(0, "rgba(155,212,107,.55)");
    mot.addColorStop(1, "rgba(155,212,107,0)");
    g.fillStyle = mot;
    g.beginPath();
    g.moveTo(-5 * k, 16 * k); g.lineTo(5 * k, 16 * k);
    g.lineTo(2 * k, 34 * k); g.lineTo(-2 * k, 34 * k);
    g.closePath(); g.fill();
  }

  g.shadowColor = "#9BD46B";
  g.shadowBlur = 14;
  /* caixa de descarga, atrás */
  const cx = g.createLinearGradient(0, 6 * k, 0, 20 * k);
  cx.addColorStop(0, "#FFFFFF"); cx.addColorStop(1, "#AEBFC7");
  g.fillStyle = cx;
  caixaRedonda(g, -13 * k, 6 * k, 26 * k, 14 * k, 3 * k); g.fill();
  /* vaso de porcelana */
  const vs = g.createLinearGradient(0, -20 * k, 0, 8 * k);
  vs.addColorStop(0, "#FFFFFF"); vs.addColorStop(0.55, "#E6EEF2"); vs.addColorStop(1, "#B4C3CA");
  g.fillStyle = vs;
  g.beginPath(); g.ellipse(0, -6 * k, 10 * k, 14 * k, 0, 0, TAU); g.fill();
  g.shadowBlur = 0;
  if (!detalhe) return;

  /* tampa do assento */
  g.strokeStyle = "#C6D5DC";
  g.lineWidth = Math.max(1, 2.4 * k);
  g.beginPath(); g.ellipse(0, -6 * k, 8.2 * k, 11.6 * k, 0, 0, TAU); g.stroke();
  /* água */
  const ag = g.createRadialGradient(0, -6 * k, 0, 0, -6 * k, 9 * k);
  ag.addColorStop(0, "#9FEBFF"); ag.addColorStop(1, "#276F94");
  g.fillStyle = ag;
  g.beginPath(); g.ellipse(0, -6 * k, 6.4 * k, 9.4 * k, 0, 0, TAU); g.fill();

  /* o homem sentado */
  g.fillStyle = "#2E6BB8";
  g.beginPath(); g.ellipse(0, -4 * k, 4.6 * k, 6 * k, 0, 0, TAU); g.fill();
  g.strokeStyle = "#F2C49B";
  g.lineWidth = Math.max(0.8, 1.7 * k);
  g.lineCap = "round";
  g.beginPath();
  g.moveTo(-4 * k, -4 * k); g.lineTo(-7 * k, -1 * k);
  g.moveTo(4 * k, -4 * k); g.lineTo(7 * k, -1 * k);
  g.stroke();
  /* jornal */
  g.fillStyle = "#EDE7D9";
  g.fillRect(-5 * k, -1.8 * k, 10 * k, 4.6 * k);
  g.strokeStyle = "rgba(0,0,0,.24)";
  g.lineWidth = Math.max(0.5, 0.5 * k);
  g.beginPath();
  for (let n = 1; n <= 3; n++) { const y = (-1.8 + n * 1.1) * k; g.moveTo(-4.2 * k, y); g.lineTo(4.2 * k, y); }
  g.stroke();
  /* cabeça, cabelo, olhos */
  g.fillStyle = "#F2C49B";
  g.beginPath(); g.arc(0, -11 * k, 3.4 * k, 0, TAU); g.fill();
  g.fillStyle = "#3A2A1B";
  g.beginPath(); g.arc(0, -11.6 * k, 3.4 * k, Math.PI, TAU); g.fill();
  g.fillStyle = "#14202A";
  g.beginPath();
  g.arc(-1.2 * k, -10.5 * k, Math.max(0.5, 0.6 * k), 0, TAU);
  g.arc(1.2 * k, -10.5 * k, Math.max(0.5, 0.6 * k), 0, TAU);
  g.fill();
  /* coroa: é o trono, afinal */
  g.fillStyle = "#FFC145";
  g.beginPath();
  g.moveTo(-3 * k, -13.8 * k); g.lineTo(-3 * k, -16.6 * k); g.lineTo(-1.5 * k, -15.2 * k);
  g.lineTo(0, -17.2 * k); g.lineTo(1.5 * k, -15.2 * k); g.lineTo(3 * k, -16.6 * k);
  g.lineTo(3 * k, -13.8 * k);
  g.closePath(); g.fill();
  /* botão de descarga */
  g.fillStyle = "#FFC145";
  g.beginPath(); g.arc(0, 12 * k, 2.2 * k, 0, TAU); g.fill();
  g.strokeStyle = "rgba(0,0,0,.2)";
  g.lineWidth = Math.max(0.5, 0.6 * k);
  g.stroke();
  /* o cheirinho subindo */
  g.strokeStyle = "rgba(155,212,107,.5)";
  g.lineWidth = Math.max(0.6, 0.9 * k);
  for (let n = 0; n < 3; n++) {
    const bx = (-4 + n * 4) * k;
    g.beginPath();
    for (let m = 0; m <= 6; m++) {
      const y = (-17 - m * 1.6) * k;
      const x = bx + Math.sin(t * 3 + m * 0.9 + n) * 1.5 * k;
      if (m === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  }
}

function drawShipSprite(g, idx, s2, opc) {
  const i2 = naveValida(idx);
  const sh = SHIPS[i2] || SHIPS[0];
  const k = s2 / 18;
  if (sh.privada) { desenharPrivada(g, k, !opc || opc.detalhe !== false); return; }
  const hue = shipHue(i2);
  const cor = shipColor(i2);
  const brilhoCor = shipGlowColor(i2);
  const pts = pontosDaNave(sh);
  const detalhe = !opc || opc.detalhe !== false;

  /* --- contorno do casco --- */
  const caminho = () => {
    g.beginPath();
    g.moveTo(pts[0][0] * k, pts[0][1] * k);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0] * k, pts[i][1] * k);
    g.closePath();
  };

  /* mede a nave para acertar os degradês e as pontas das asas */
  let minX = 99, maxX = -99, minY = 99, maxY = -99;
  for (const pt of pts) {
    if (pt[0] < minX) minX = pt[0];
    if (pt[0] > maxX) maxX = pt[0];
    if (pt[1] < minY) minY = pt[1];
    if (pt[1] > maxY) maxY = pt[1];
  }

  /* --- rastro do motor, atrás de tudo --- */
  if (detalhe) {
    const mot = g.createLinearGradient(0, maxY * k * 0.6, 0, (maxY + 13) * k);
    mot.addColorStop(0, "hsla(" + hue + ",100%,72%,.55)");
    mot.addColorStop(1, "hsla(" + hue + ",100%,72%,0)");
    g.fillStyle = mot;
    g.beginPath();
    g.moveTo(-3.4 * k, maxY * k * 0.55);
    g.lineTo(3.4 * k, maxY * k * 0.55);
    g.lineTo(1.5 * k, (maxY + 13) * k);
    g.lineTo(-1.5 * k, (maxY + 13) * k);
    g.closePath();
    g.fill();
  }

  /* --- casco: luz em cima, cor no meio, sombra embaixo --- */
  g.shadowColor = brilhoCor;
  g.shadowBlur = 14;
  const casco = g.createLinearGradient(0, minY * k, 0, maxY * k);
  casco.addColorStop(0, corMisturada(hue, 82));
  casco.addColorStop(0.42, cor);
  casco.addColorStop(1, corMisturada(hue, 34, 78));
  g.fillStyle = casco;
  caminho();
  g.fill();
  g.shadowBlur = 0;

  if (!detalhe) return;

  /* --- daqui para baixo tudo fica preso dentro do casco --- */
  g.save();
  caminho();
  g.clip();

  // quilha central mais clara, de ponta a ponta
  const quilha = g.createLinearGradient(-2.6 * k, 0, 2.6 * k, 0);
  quilha.addColorStop(0, "hsla(" + hue + ",100%,88%,0)");
  quilha.addColorStop(0.5, "hsla(" + hue + ",100%,92%,.42)");
  quilha.addColorStop(1, "hsla(" + hue + ",100%,88%,0)");
  g.fillStyle = quilha;
  g.fillRect(-2.6 * k, minY * k, 5.2 * k, (maxY - minY) * k);

  // riscos de chapa: três linhas finas mais escuras atravessando
  g.strokeStyle = "hsla(" + hue + ",70%,16%,.34)";
  g.lineWidth = Math.max(0.6, 0.9 * k);
  g.beginPath();
  for (let n = 1; n <= 3; n++) {
    const y = (minY + (maxY - minY) * (n / 4)) * k;
    g.moveTo(minX * k, y);
    g.lineTo(maxX * k, y);
  }
  g.stroke();

  // brilho de cima: uma faixa clara na metade de cima do casco
  const topo = g.createLinearGradient(0, minY * k, 0, (minY + (maxY - minY) * 0.45) * k);
  topo.addColorStop(0, "rgba(255,255,255,.30)");
  topo.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = topo;
  g.fillRect(minX * k, minY * k, (maxX - minX) * k, (maxY - minY) * 0.5 * k);

  g.restore();

  /* --- peças da nave montada pelo jogador --- */
  if (sh.criada) {
    desenharPecas(g, sh, k, cor);
    if (sh.def && sh.def.pecas && sh.def.pecas.teto !== undefined) { desenharLuzes(); return; }
  }

  /* --- cabine: vidro escuro, aro claro e um reflexo em cima --- */
  const cy = -4 * k, rx = 3.4 * k, ry = 6.5 * k;
  const vidro = g.createLinearGradient(0, cy - ry, 0, cy + ry);
  vidro.addColorStop(0, "#9FE8FF");
  vidro.addColorStop(0.34, "#12405C");
  vidro.addColorStop(1, "#04141F");
  g.fillStyle = vidro;
  g.beginPath(); g.ellipse(0, cy, rx, ry, 0, 0, TAU); g.fill();
  g.strokeStyle = "hsla(" + hue + ",100%,86%,.75)";
  g.lineWidth = Math.max(0.6, 0.8 * k);
  g.stroke();
  // reflexo do vidro
  g.fillStyle = "rgba(255,255,255,.45)";
  g.beginPath();
  g.ellipse(-rx * 0.34, cy - ry * 0.42, rx * 0.32, ry * 0.26, -0.4, 0, TAU);
  g.fill();

  desenharLuzes();

  /* luzinhas de navegação nas pontas das asas, piscando devagar */
  function desenharLuzes() {
    const bat = 0.55 + Math.sin((typeof S !== "undefined" ? S.time : 0) * 3.4) * 0.45;
    const pontas = [[minX, 0], [maxX, 0]];
    // acha a altura real de cada ponta lateral
    for (const pt of pts) {
      if (pt[0] === minX) pontas[0][1] = pt[1];
      if (pt[0] === maxX) pontas[1][1] = pt[1];
    }
    for (let n = 0; n < 2; n++) {
      const lx = pontas[n][0] * k * 0.9, ly = pontas[n][1] * k;
      g.fillStyle = n === 0 ? "rgba(255,110,140," + bat + ")" : "rgba(120,255,190," + bat + ")";
      g.beginPath(); g.arc(lx, ly, Math.max(0.9, 1.3 * k), 0, TAU); g.fill();
    }
  }
}

function drawShip() {
  if (!player.alive) return;
  if (mundoAtivo("fantasma")) {
    ctx.save();
    ctx.globalAlpha = 0.16;
  }
  const blinking = player.invuln > 0 && player.invis <= 0 && Math.floor(S.time * 12) % 2 === 0;
  if (blinking) return;

  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.tilt);

  if (player.invis > 0) {
    ctx.globalAlpha = 0.32 + Math.sin(S.time * 10) * 0.08;
    ctx.strokeStyle = "rgba(195,77,255,.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, player.r + 10, S.time * 3, S.time * 3 + Math.PI * 1.2);
    ctx.stroke();
  }

  if (player.shield > 0) {
    const a = player.shield < 1.5 ? (Math.sin(S.time * 20) * 0.25 + 0.45) : 0.55;
    ctx.strokeStyle = "rgba(255,193,69," + a + ")";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, player.r + 9, 0, TAU);
    ctx.stroke();
  }

  /* na arena a câmera afasta: a sua nave é desenhada um tico maior para
     você não perder ela de vista no meio de tanta gente */
  drawShipSprite(ctx, save.ship, naArena() ? 21 : 18);
  ctx.restore();
  ctx.globalAlpha = 1;

  if (S.dronePts && S.dronePts.length) {
    const c = shipColor(save.ship);
    for (const dp of S.dronePts) {
      ctx.save();
      ctx.translate(dp.x, dp.y);
      ctx.shadowColor = c; ctx.shadowBlur = 10;
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#04121C";
      ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }
  if (mundoAtivo("fantasma")) ctx.restore();
}

function drawEnemy(e) {
  // quem está fora da tela não precisa ser desenhado
  if (e.y < -70 || e.y > H + 70 || e.x < -70 || e.x > W + 70) return;
  const aceso = e.hitFlash > 0;
  const tipo = (e.type === "drone" || e.type === "striker") ? e.type : "asteroide";
  const ang = tipo === "drone" ? Math.sin(e.t * 3) * 0.2
            : tipo === "striker" ? 0 : e.t * 0.8;
  const f = figuraInimigo(tipo, e.r, aceso, e.modelo || 0);
  if (ang) carimbarGirado(f, e.x, e.y, ang);
  else carimbar(f, e.x, e.y);
  if (e.frozenT > 0 || e.slowT > 0) {
    ctx.strokeStyle = e.frozenT > 0 ? "rgba(200,240,255,.95)" : "rgba(160,220,255,.8)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 4, 0, TAU); ctx.stroke();
  }
}

/* ---------- Desenho dos 6 chefes ---------- */
/* =====================================================================
   CAMADA SINISTRA DOS CHEFES
   ---------------------------------------------------------------------
   Por cima de cada chefe entra uma pele viva: tentáculos que se mexem,
   uma coroa de olhos que acompanha o jogador, veias pulsando e baba
   escorrendo. Em fúria a coisa fica vermelha, os olhos dobram e a casca
   racha. É desenhado na hora (não dá para guardar como figura, porque se
   mexe), mas são poucos traços — não pesa.
   ===================================================================== */
function bossPeleViva(b) {
  if (!b || b.entering) return;
  const r = b.r || 40;
  const furia = !!b.furia;
  const t = b.t || 0;
  const corA = furia ? "#FF2A4A" : "#8CFF5A";
  const corB = furia ? "#FF7B4D" : "#C34DFF";
  ctx.save();
  ctx.translate(b.x, b.y);

  /* ---- tentáculos: vão ATRÁS do corpo, senão viram rabisco na frente ---- */
  ctx.save();
  ctx.globalCompositeOperation = "destination-over";
  const nTent = furia ? 12 : 9;
  ctx.strokeStyle = corB;
  ctx.globalAlpha = furia ? 0.9 : 0.7;
  ctx.lineCap = "round";
  for (let k = 0; k < nTent; k++) {
    const a = (k / nTent) * TAU + t * 0.2;
    const bal = Math.sin(t * 2.4 + k * 1.3) * 0.42;
    const comp = r * (furia ? 0.62 : 0.46) * (0.75 + ((k * 5) % 3) * 0.16);
    ctx.lineWidth = Math.max(2.4, r * 0.11);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7);
    ctx.quadraticCurveTo(
      Math.cos(a + bal * 0.5) * (r * 0.95 + comp * 0.5),
      Math.sin(a + bal * 0.5) * (r * 0.95 + comp * 0.5),
      Math.cos(a + bal) * (r * 0.95 + comp),
      Math.sin(a + bal) * (r * 0.95 + comp));
    ctx.stroke();
    // pontinha mais grossa, tipo ventosa
    ctx.fillStyle = corB;
    ctx.beginPath();
    ctx.arc(Math.cos(a + bal) * (r * 0.95 + comp), Math.sin(a + bal) * (r * 0.95 + comp),
            Math.max(1.4, r * 0.05), 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  /* ---- coroa de olhos no alto da cabeça, todos mirando o jogador ---- */
  /* chefe pequeno com sete olhos vira mingau: o número acompanha o tamanho */
  const nOlhos = r < 40 ? (furia ? 5 : 4) : (furia ? 7 : 5);
  const mira = player && player.alive
    ? Math.atan2(player.y - b.y, player.x - b.x) : Math.PI / 2;
  for (let k = 0; k < nOlhos; k++) {
    const f2 = nOlhos === 1 ? 0.5 : k / (nOlhos - 1);
    const a = Math.PI * (1.12 + f2 * 0.76);       // arco por cima
    const ox = Math.cos(a) * r * 0.68;
    const oy = Math.sin(a) * r * 0.46 - r * 0.04;
    const raio = Math.max(2.8, r * (furia ? 0.13 : 0.105));
    ctx.fillStyle = "rgba(8,4,12,.85)";
    ctx.beginPath(); ctx.arc(ox, oy, raio * 1.25, 0, TAU); ctx.fill();
    ctx.fillStyle = "#F6FFE8";
    ctx.beginPath(); ctx.ellipse(ox, oy, raio, raio * 0.9, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = corA;
    ctx.beginPath(); ctx.arc(ox, oy, raio * 0.68, 0, TAU); ctx.fill();
    ctx.save();
    ctx.translate(ox + Math.cos(mira) * raio * 0.24, oy + Math.sin(mira) * raio * 0.24);
    ctx.rotate(mira + Math.PI / 2);
    ctx.fillStyle = "#08040C";
    ctx.beginPath(); ctx.ellipse(0, 0, raio * 0.22, raio * 0.66, 0, 0, TAU); ctx.fill();
    ctx.restore();
    ctx.fillStyle = "rgba(255,255,255,.7)";
    ctx.beginPath(); ctx.arc(ox - raio * 0.32, oy - raio * 0.36, raio * 0.17, 0, TAU); ctx.fill();
  }

  /* ---- boca com dentes embaixo da cabeça ---- */
  const bocaY = r * 0.34;
  const abre = (furia ? 0.5 : 0.3) + Math.sin(t * (furia ? 6 : 2.4)) * 0.16;
  ctx.fillStyle = "rgba(8,4,12,.9)";
  ctx.beginPath();
  ctx.ellipse(0, bocaY, r * 0.42, r * 0.16 * (0.6 + abre), 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#FFF3E6";
  const nd = 6, larg = r * 0.38;
  ctx.beginPath();
  for (let k = 0; k < nd; k++) {
    const x0 = -larg + (k * larg * 2) / nd;
    const passo = (larg * 2) / nd;
    ctx.moveTo(x0, bocaY - r * 0.1 * (0.6 + abre));
    ctx.lineTo(x0 + passo / 2, bocaY - r * 0.01);
    ctx.lineTo(x0 + passo, bocaY - r * 0.1 * (0.6 + abre));
    ctx.moveTo(x0, bocaY + r * 0.1 * (0.6 + abre));
    ctx.lineTo(x0 + passo / 2, bocaY + r * 0.01);
    ctx.lineTo(x0 + passo, bocaY + r * 0.1 * (0.6 + abre));
  }
  ctx.fill();

  /* ---- veias pulsando na casca ---- */
  ctx.strokeStyle = furia ? "rgba(255,60,90,.8)" : "rgba(180,255,120,.45)";
  ctx.lineWidth = Math.max(1.2, r * 0.045);
  const pulso = 0.75 + Math.sin(t * (furia ? 9 : 4)) * 0.25;
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * TAU + 0.3;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2);
    ctx.quadraticCurveTo(Math.cos(a + 0.5) * r * 0.55, Math.sin(a + 0.5) * r * 0.55,
                         Math.cos(a) * r * 0.8 * pulso, Math.sin(a) * r * 0.8 * pulso);
    ctx.stroke();
  }

  /* ---- baba escorrendo da boca ---- */
  ctx.fillStyle = furia ? "rgba(255,110,130,.7)" : "rgba(170,255,130,.55)";
  for (let k = 0; k < 3; k++) {
    const bx = (k - 1) * r * 0.24;
    const comp = r * (0.2 + ((Math.sin(t * 1.7 + k * 2) + 1) / 2) * 0.34);
    ctx.beginPath();
    ctx.moveTo(bx - r * 0.045, bocaY + r * 0.1);
    ctx.lineTo(bx + r * 0.045, bocaY + r * 0.1);
    ctx.lineTo(bx, bocaY + r * 0.1 + comp);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.arc(bx, bocaY + r * 0.1 + comp, Math.max(1, r * 0.035), 0, TAU);
    ctx.fill();
  }

  /* em fúria, um halo que respira e rachaduras acesas */
  if (furia) {
    ctx.strokeStyle = "rgba(255,42,74," + (0.25 + Math.sin(t * 8) * 0.2) + ")";
    ctx.lineWidth = Math.max(2, r * 0.09);
    ctx.beginPath(); ctx.arc(0, 0, r * 1.12, 0, TAU); ctx.stroke();
    ctx.strokeStyle = "rgba(255,190,90,.8)";
    ctx.lineWidth = Math.max(1.2, r * 0.05);
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU + 0.7;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.15, Math.sin(a) * r * 0.15);
      ctx.lineTo(Math.cos(a + 0.22) * r * 0.55, Math.sin(a + 0.22) * r * 0.55);
      ctx.lineTo(Math.cos(a - 0.1) * r * 0.92, Math.sin(a - 0.1) * r * 0.92);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawBoss() {
  if (!boss) return;
  const flash = boss.hitFlash > 0;
  ctx.save();
  if (boss.kind === "olho") ctx.globalAlpha = boss.alpha === undefined ? 1 : boss.alpha;

  if (boss.kind === "ceifador") {
    ctx.save();
    ctx.translate(boss.x, boss.y);
    ctx.rotate(Math.sin(boss.t * 1.4) * 0.18);
    ctx.shadowColor = "#FF3B5C"; ctx.shadowBlur = 26;
    ctx.fillStyle = flash ? "#FFFFFF" : "#FF3B5C";
    ctx.beginPath();
    ctx.arc(0, 0, boss.r, Math.PI * 0.15, Math.PI * 1.85);
    ctx.arc(0, -boss.r * 0.28, boss.r * 0.74, Math.PI * 1.78, Math.PI * 0.22, true);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#2A0410";
    ctx.beginPath(); ctx.arc(0, boss.r * 0.35, boss.r * 0.22, 0, TAU); ctx.fill();
    ctx.fillStyle = flash ? "#FFFFFF" : "#FFC145";
    ctx.beginPath(); ctx.arc(0, boss.r * 0.35, boss.r * 0.1 * (0.8 + Math.sin(boss.t * 6) * 0.2), 0, TAU); ctx.fill();
    ctx.restore();
  } else if (boss.kind === "colosso") {
    ctx.save();
    ctx.translate(boss.x, boss.y);
    ctx.shadowColor = "#9FB0CC"; ctx.shadowBlur = 18;
    ctx.fillStyle = flash ? "#FFFFFF" : "#66788F";
    ctx.beginPath();
    ctx.moveTo(-96, 6); ctx.lineTo(-70, -26); ctx.lineTo(70, -26); ctx.lineTo(96, 6);
    ctx.lineTo(70, 26); ctx.lineTo(-70, 26);
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    // núcleo
    const coreOpen = boss.pods.length === 0;
    ctx.fillStyle = coreOpen ? (flash ? "#FFFFFF" : "#FF4D8F") : "#2B3346";
    ctx.beginPath(); ctx.arc(0, 0, 26, 0, TAU); ctx.fill();
    ctx.fillStyle = coreOpen ? "#FFC145" : "#404C66";
    ctx.beginPath(); ctx.arc(0, 0, 12 * (0.85 + Math.sin(boss.t * 5) * 0.15), 0, TAU); ctx.fill();
    // torres laterais
    for (const p of boss.pods) {
      ctx.save();
      ctx.translate(p.dx, 12);
      ctx.shadowColor = "#FF7B4D"; ctx.shadowBlur = 14;
      ctx.fillStyle = flash ? "#FFFFFF" : "#FF7B4D";
      ctx.beginPath(); ctx.arc(0, 0, 20, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#3A160A";
      ctx.fillRect(-4, 4, 8, 20);
      ctx.restore();
    }
    ctx.restore();
  } else if (boss.kind === "serpente") {
    for (let k = boss.segs; k >= 1; k--) {
      const node = boss.trail[k * 7];
      if (!node) continue;
      const rr = 17 - k * 0.6;
      ctx.save();
      ctx.translate(node.x, node.y);
      ctx.shadowColor = "#7B4DFF"; ctx.shadowBlur = 12;
      ctx.fillStyle = flash ? "#FFFFFF" : (k % 2 === 0 ? "#7B4DFF" : "#9E6BFF");
      ctx.beginPath(); ctx.arc(0, 0, rr, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(20,8,50,.8)";
      ctx.beginPath(); ctx.arc(0, 0, rr * 0.45, 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.save();
    ctx.translate(boss.x, boss.y);
    const hAng = boss.trail[3] ? Math.atan2(boss.y - boss.trail[3].y, boss.x - boss.trail[3].x) : 0;
    ctx.rotate(hAng + Math.PI / 2);
    ctx.shadowColor = "#7B4DFF"; ctx.shadowBlur = 20;
    ctx.fillStyle = flash ? "#FFFFFF" : "#7B4DFF";
    ctx.beginPath();
    ctx.moveTo(0, -26); ctx.lineTo(20, 6); ctx.lineTo(10, 22); ctx.lineTo(-10, 22); ctx.lineTo(-20, 6);
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#FFC145";
    ctx.beginPath(); ctx.arc(-8, 0, 3.5, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(8, 0, 3.5, 0, TAU); ctx.fill();
    ctx.fillStyle = "#2A0A3A";
    ctx.beginPath(); ctx.moveTo(-6, 14); ctx.lineTo(-2, 22); ctx.lineTo(-9, 22); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(6, 14); ctx.lineTo(9, 22); ctx.lineTo(2, 22); ctx.closePath(); ctx.fill();
    ctx.restore();
  } else if (boss.kind === "enxame") {
    ctx.save();
    ctx.translate(boss.x, boss.y);
    ctx.rotate(Math.sin(boss.t * 0.8) * 0.08);
    ctx.shadowColor = "#C34DFF"; ctx.shadowBlur = 24;
    ctx.fillStyle = flash ? "#FFFFFF" : "#C34DFF";
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * TAU + Math.PI / 6;
      if (k === 0) ctx.moveTo(Math.cos(a) * boss.r, Math.sin(a) * boss.r);
      else ctx.lineTo(Math.cos(a) * boss.r, Math.sin(a) * boss.r);
    }
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    // células da colmeia
    ctx.fillStyle = "#3A0A56";
    const cells = [[0, 0], [-18, -12], [18, -12], [-18, 12], [18, 12], [0, -22], [0, 22]];
    for (const c2 of cells) {
      const pulse = 0.8 + Math.sin(boss.t * 4 + c2[0]) * 0.2;
      ctx.beginPath(); ctx.arc(c2[0], c2[1], 7 * pulse, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = "#FF87B3";
    ctx.beginPath(); ctx.arc(0, 0, 5 + Math.sin(boss.t * 6) * 1.5, 0, TAU); ctx.fill();
    ctx.restore();
  } else if (boss.kind === "prisma") {
    // laser: aviso e feixe
    const bm = boss.beam;
    if (bm.phase === "tel") {
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255," + (0.25 + Math.sin(S.time * 30) * 0.2) + ")";
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(boss.x, boss.y);
      ctx.lineTo(boss.x + Math.cos(bm.ang) * (W + H), boss.y + Math.sin(bm.ang) * (W + H));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    } else if (bm.phase === "on") {
      ctx.save();
      ctx.shadowColor = "#B7F3FF"; ctx.shadowBlur = 24;
      ctx.strokeStyle = "rgba(183,243,255,.95)";
      ctx.lineWidth = 22;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(boss.x, boss.y);
      ctx.lineTo(boss.x + Math.cos(bm.ang) * (W + H), boss.y + Math.sin(bm.ang) * (W + H));
      ctx.stroke();
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    ctx.translate(boss.x, boss.y);
    ctx.rotate(boss.t * 0.9);
    ctx.shadowColor = "#B7F3FF"; ctx.shadowBlur = 26;
    ctx.fillStyle = flash ? "#FFFFFF" : "rgba(183,243,255,.9)";
    ctx.beginPath();
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * TAU - Math.PI / 2;
      if (k === 0) ctx.moveTo(Math.cos(a) * boss.r, Math.sin(a) * boss.r);
      else ctx.lineTo(Math.cos(a) * boss.r, Math.sin(a) * boss.r);
    }
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(6,20,40,.6)";
    ctx.lineWidth = 2;
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * TAU - Math.PI / 2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * boss.r, Math.sin(a) * boss.r); ctx.stroke();
    }
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath(); ctx.arc(0, 0, 7 + Math.sin(boss.t * 7) * 2, 0, TAU); ctx.fill();
    ctx.restore();
  } else if (boss.kind === "olho") {
    ctx.save();
    ctx.translate(boss.x, boss.y);
    ctx.shadowColor = "#FF5252"; ctx.shadowBlur = 26;
    ctx.fillStyle = flash ? "#FFFFFF" : "#E8EAF2";
    ctx.beginPath();
    ctx.ellipse(0, 0, boss.r + 14, boss.r * 0.72, 0, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    // íris segue o jogador
    const ia = player.alive ? Math.atan2(player.y - boss.y, player.x - boss.x) : Math.PI / 2;
    const ix = Math.cos(ia) * 12, iy = Math.sin(ia) * 8;
    ctx.fillStyle = "#FF5252";
    ctx.beginPath(); ctx.arc(ix, iy, boss.r * 0.42, 0, TAU); ctx.fill();
    ctx.fillStyle = "#2A0410";
    ctx.beginPath(); ctx.arc(ix, iy, boss.r * 0.2 * (0.8 + Math.sin(boss.t * 3) * 0.2), 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.85)";
    ctx.beginPath(); ctx.arc(ix - 5, iy - 5, 4, 0, TAU); ctx.fill();
    // pálpebras
    ctx.strokeStyle = "#7A1024";
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.ellipse(0, 0, boss.r + 14, boss.r * 0.72, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, boss.r + 14, boss.r * 0.72, 0, Math.PI * 0.08, Math.PI * 0.92); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  ctx.globalAlpha = 1;

  // a pele viva vai por cima de qualquer chefe
  if (qEnfeites() !== false) bossPeleViva(boss);
  bossDesenharAvisos();

  // congelado?
  if (boss.frozenT > 0) {
    ctx.strokeStyle = "rgba(200,240,255,.9)";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(boss.x, boss.y, boss.r + 22, 0, TAU); ctx.stroke();
  }

  // barra de vida + nome
  const bw = Math.min(W - 40, 320);
  const bx = (W - bw) / 2;
  const by = Math.max(64, H * 0.085) + 26;
  ctx.fillStyle = "rgba(10,18,40,.8)";
  ctx.fillRect(bx - 2, by - 2, bw + 4, 12);
  ctx.fillStyle = boss.furia ? "#FF2A4A" : "#FF4D8F";
  const vidaChefe = mpCoop() ? Math.max(0, boss.maxHp - MP.danoTotal) : bossHpLeft();
  const fracChefe = clamp(vidaChefe / boss.maxHp, 0, 1);
  ctx.fillRect(bx, by, bw * fracChefe, 8);
  ctx.strokeStyle = boss.furia ? "rgba(255,42,74,.9)" : "rgba(255,77,143,.5)";
  ctx.lineWidth = 1;
  ctx.strokeRect(bx - 2, by - 2, bw + 4, 12);
  /* três partes: dá para ver que você está ganhando, e onde a fúria começa */
  ctx.fillStyle = "rgba(4,8,20,.85)";
  ctx.fillRect(bx + bw / 3 - 1, by - 1, 2, 10);
  ctx.fillRect(bx + bw * 2 / 3 - 1, by - 1, 2, 10);
  ctx.fillStyle = "rgba(255,255,255,.45)";
  ctx.fillRect(bx + bw * 0.35 - 1, by - 1, 2, 10);
  /* quantas partes ainda faltam, em números grandes o bastante para ver */
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(234,242,255,.7)";
  ctx.font = "700 10px 'Chakra Petch',sans-serif";
  ctx.fillText("PARTE " + Math.max(1, Math.ceil(fracChefe * 3)) + "/3", bx + bw, by - 8);
  ctx.textAlign = "center";
  ctx.fillStyle = boss.furia ? "#FF6B84" : "rgba(234,242,255,.85)";
  ctx.font = "700 11px 'Chakra Petch',sans-serif";
  ctx.fillText(boss.bname.toUpperCase() + (boss.furia ? "  ⚠ EM FÚRIA" : ""), W / 2, by - 8);
}

/* =====================================================================
   PRÉ-AVISO DOS ATAQUES DO CHEFE
   ---------------------------------------------------------------------
   Uma linha vermelha aparece meio segundo antes do tiro sair, no lugar
   onde ele vai passar. Dificuldade justa é o jogador PODER desviar.
   ===================================================================== */
const AVISOS = [];
function avisarAtaque(x, y, tipo, dur) {
  AVISOS.push({ x: x, y: y, tipo: tipo || "linha", t: 0, dur: dur || 0.55 });
}
function avisosPassar(dt) {
  for (let i = AVISOS.length - 1; i >= 0; i--) {
    AVISOS[i].t += dt;
    if (AVISOS[i].t >= AVISOS[i].dur) AVISOS.splice(i, 1);
  }
}
function drawAvisos() {
  if (!AVISOS.length) return;
  ctx.save();
  for (const a of AVISOS) {
    const k = a.t / a.dur;
    const piscar = 0.25 + Math.abs(Math.sin(a.t * 18)) * 0.45;
    ctx.globalAlpha = piscar * (1 - k * 0.3);
    ctx.strokeStyle = "#FF4040";
    ctx.fillStyle = "rgba(255,64,64,.14)";
    ctx.lineWidth = 2;
    if (a.tipo === "circulo") {
      ctx.beginPath(); ctx.arc(a.x, a.y, a.r || 90, 0, TAU); ctx.fill(); ctx.stroke();
    } else if (a.tipo === "coluna") {
      ctx.fillRect(a.x - 26, 0, 52, H); ctx.strokeRect(a.x - 26, 0, 52, H);
    } else {
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(a.x, H); ctx.stroke();
    }
  }
  ctx.restore();
}

function drawPowerup(p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  const bob = Math.sin(p.t * 5) * 0.15 + 1;
  ctx.scale(bob, bob);
  if (p.type === "gem") {
    ctx.shadowColor = "#FFC145"; ctx.shadowBlur = 12;
    ctx.fillStyle = "#FFC145";
    ctx.beginPath();
    ctx.moveTo(0, -9); ctx.lineTo(7, 0); ctx.lineTo(0, 9); ctx.lineTo(-7, 0);
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,.5)";
    ctx.beginPath();
    ctx.moveTo(0, -9); ctx.lineTo(7, 0); ctx.lineTo(0, 0);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    return;
  }
  let color, letter;
  if (p.type === "weapon") { color = "#4DE8FF"; letter = "W"; }
  else if (p.type === "shield") { color = "#FFC145"; letter = "S"; }
  else { color = "#FF4D8F"; letter = "♥"; }
  ctx.shadowColor = color; ctx.shadowBlur = 14;
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = color;
  ctx.fillRect(-11, -11, 22, 22);
  ctx.rotate(-Math.PI / 4);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#04121C";
  ctx.font = "700 13px 'Chakra Petch',sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(letter, 0, 1);
  ctx.restore();
}

/* =====================================================================
   FIGURINHAS PRONTAS — o truque que faz o jogo rodar em celular fraco
   ---------------------------------------------------------------------
   Desenhar com brilho (shadowBlur) é a conta mais cara do jogo: o
   navegador refaz o borrão para CADA tiro e CADA inimigo, em TODO quadro.
   Com 300 tiros e 140 inimigos na tela isso são 440 borrões por quadro.

   Aqui cada forma é desenhada UMA VEZ, com o brilho e tudo, num
   quadrinho fora da tela. Depois é só carimbar essa imagem pronta —
   copiar uma imagem é dezenas de vezes mais barato que borrar de novo.
   O desenho na tela fica idêntico; muda só o preço.
   ===================================================================== */
const FIGURAS = new Map();
/* A figurinha é feita exatamente do tamanho que vai aparecer na tela
   (contando a densidade do aparelho e o afastamento da arena). Assim o
   carimbo é uma cópia 1 para 1 de pixels: o navegador não precisa
   esticar nem encolher nada, que é onde ia embora o tempo.            */
let FIG_ESC = 2;
let figurasFeitas = 0;
function figurasAjustar() {
  const novo = Math.max(1, Math.min(3, (DPR || 1) * (ZOOM || 1)));
  if (Math.abs(novo - FIG_ESC) > 0.01) { FIG_ESC = novo; FIGURAS.clear(); }
}

function figura(chave, meiaL, meiaA, pintar) {
  let f = FIGURAS.get(chave);
  if (f) return f;
  const e = FIG_ESC;
  const larg = Math.max(2, Math.ceil(meiaL * 2));
  const alt = Math.max(2, Math.ceil(meiaA * 2));
  const cv = document.createElement("canvas");
  cv.width = Math.ceil(larg * e);
  cv.height = Math.ceil(alt * e);
  const g = cv.getContext("2d");
  // (0,0) do desenho cai no meio do quadrinho
  g.setTransform(e, 0, 0, e, (larg / 2) * e, (alt / 2) * e);
  try { pintar(g); } catch (err) {}
  f = { cv: cv, mx: larg / 2, my: alt / 2 };
  FIGURAS.set(chave, f);
  figurasFeitas++;
  // trava de segurança: se algo gerar chaves demais, recomeça a coleção
  if (FIGURAS.size > 400) FIGURAS.clear();
  return f;
}
function carimbar(f, x, y) {
  ctx.drawImage(f.cv, x - f.mx, y - f.my, f.mx * 2, f.my * 2);
}
function carimbarGirado(f, x, y, ang) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.drawImage(f.cv, -f.mx, -f.my, f.mx * 2, f.my * 2);
  ctx.restore();
}

/* ---------- figurinhas dos tiros ---------- */
const FOLGA = 0.7;   // quanto do borrão realmente aparece
function figuraTiro(estilo, cor, brilho) {
  const B = 8;                                   // o mesmo borrão de antes
  let mx = 6, my = 12;
  if (estilo === "plasma") { mx = 6; my = 6; }
  else if (estilo === "laser") { mx = 2; my = 13; }
  else if (estilo === "vulcan") { mx = 2; my = 6; }
  else { mx = 2; my = 9; }
  return figura("t|" + estilo + "|" + cor + "|" + brilho, mx + B * FOLGA, my + B * FOLGA, g => {
    g.shadowColor = brilho;
    g.shadowBlur = B;
    g.fillStyle = cor;
    if (estilo === "plasma") { g.beginPath(); g.arc(0, 0, 6, 0, TAU); g.fill(); }
    else if (estilo === "laser") g.fillRect(-1.2, -13, 2.4, 20);
    else if (estilo === "vulcan") g.fillRect(-1.5, -6, 3, 9);
    else g.fillRect(-2, -9, 4, 14);
  });
}
function figuraTiroAliado(cor) {
  const B = 8;
  return figura("ta|" + cor, 1.8 + B * FOLGA, 7 + B * FOLGA, g => {
    g.shadowColor = cor; g.shadowBlur = B;
    g.fillStyle = cor;
    g.fillRect(-1.8, -7, 3.6, 11);
  });
}
/* ---------------------------------------------------------------------
   TIRO INIMIGO — antes era uma bolinha chapada; agora é uma gota de
   energia: rastro atrás, casca colorida, miolo branco quente e quatro
   fagulhas. Continua sendo uma figura guardada, então não custa nada a
   mais no meio da partida.
   --------------------------------------------------------------------- */
function figuraTiroInimigo(r, cor) {
  const B = 11;
  const rr = Math.max(1, Math.round(r * 2) / 2);
  const meia = rr * 2.6 + B * FOLGA;
  return figura("ti2|" + rr + "|" + cor, meia, meia, g => {
    // rastro que se abre para trás
    const rastro = g.createLinearGradient(0, rr * 2.4, 0, -rr);
    rastro.addColorStop(0, "rgba(255,255,255,0)");
    rastro.addColorStop(1, cor);
    g.globalAlpha = 0.5;
    g.fillStyle = rastro;
    g.beginPath();
    g.moveTo(-rr * 0.62, 0);
    g.quadraticCurveTo(0, rr * 2.6, rr * 0.62, 0);
    g.closePath(); g.fill();
    g.globalAlpha = 1;
    // corpo
    g.shadowColor = cor; g.shadowBlur = B;
    g.fillStyle = cor;
    g.beginPath(); g.ellipse(0, 0, rr, rr * 1.22, 0, 0, TAU); g.fill();
    // miolo quente
    g.shadowBlur = 0;
    const nucleo = g.createRadialGradient(0, -rr * 0.2, 0, 0, 0, rr);
    nucleo.addColorStop(0, "rgba(255,255,255,.95)");
    nucleo.addColorStop(0.55, "rgba(255,255,255,.45)");
    nucleo.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = nucleo;
    g.beginPath(); g.ellipse(0, -rr * 0.1, rr * 0.62, rr * 0.8, 0, 0, TAU); g.fill();
    // fagulhas nas pontas
    g.fillStyle = "rgba(255,255,255,.7)";
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU + 0.6;
      g.beginPath();
      g.arc(Math.cos(a) * rr * 1.35, Math.sin(a) * rr * 1.35, Math.max(0.6, rr * 0.16), 0, TAU);
      g.fill();
    }
  });
}
/* ---------- figurinhas dos inimigos ---------- */
/* =====================================================================
   BICHARADA ALIENÍGENA — três modelos para cada tipo de inimigo
   ---------------------------------------------------------------------
   Nada de naves: são criaturas. Cada tipo tem três cascos diferentes,
   sorteados com a mesma semente nos dois aparelhos. Tudo é desenhado uma
   vez e guardado como figura pronta, então nove modelos custam o mesmo
   que um no meio da partida.

   drone     — 1 olho-larva · 2 aranha de casco · 3 boca de dentes
   striker   — 1 vespa · 2 foice de carne · 3 cabeça de tentáculos
   asteroide — 1 casulo com bicho dentro · 2 carcaça de olho · 3 ninho de olhos
   ===================================================================== */
/* pupila fininha, o detalhe que deixa o olho sinistro */
function olhoAlien(g, x, y, raio, corIris, viraDeitado) {
  g.save();
  g.shadowBlur = 0;
  g.fillStyle = "#F6FFE8";
  g.beginPath(); g.ellipse(x, y, raio, raio * 0.86, 0, 0, TAU); g.fill();
  g.fillStyle = corIris || "#8CFF5A";
  g.beginPath(); g.ellipse(x, y, raio * 0.62, raio * 0.62, 0, 0, TAU); g.fill();
  g.fillStyle = "#08040C";
  if (viraDeitado) g.beginPath(), g.ellipse(x, y, raio * 0.62, raio * 0.16, 0, 0, TAU), g.fill();
  else g.beginPath(), g.ellipse(x, y, raio * 0.16, raio * 0.62, 0, 0, TAU), g.fill();
  g.fillStyle = "rgba(255,255,255,.75)";
  g.beginPath(); g.arc(x - raio * 0.3, y - raio * 0.34, raio * 0.16, 0, TAU); g.fill();
  g.restore();
}
/* fileira de dentes tortos ao longo de uma boca */
function dentesAlien(g, x, y, larg, altura, quantos, paraCima) {
  g.beginPath();
  const passo = (larg * 2) / quantos;
  for (let k = 0; k < quantos; k++) {
    const x0 = x - larg + k * passo;
    g.moveTo(x0, y);
    g.lineTo(x0 + passo / 2, y + (paraCima ? -altura : altura) * (k % 2 ? 0.6 : 1));
    g.lineTo(x0 + passo, y);
  }
  g.closePath();
  g.fill();
}
/* pernas e tentáculos que saem do corpo */
function pernasAlien(g, quantas, raio, comprimento, curva, grossura) {
  g.lineCap = "round";
  g.lineWidth = grossura;
  for (let k = 0; k < quantas; k++) {
    const a = (k / quantas) * TAU + 0.4;
    const x0 = Math.cos(a) * raio, y0 = Math.sin(a) * raio;
    const x1 = Math.cos(a) * (raio + comprimento * 0.55) + Math.cos(a + curva) * 5;
    const y1 = Math.sin(a) * (raio + comprimento * 0.55) + Math.sin(a + curva) * 5;
    const x2 = Math.cos(a + curva) * (raio + comprimento);
    const y2 = Math.sin(a + curva) * (raio + comprimento);
    g.beginPath();
    g.moveTo(x0, y0);
    g.quadraticCurveTo(x1, y1, x2, y2);
    g.stroke();
  }
}
function figuraInimigo(tipo, r, aceso, modelo) {
  const rr = Math.max(3, Math.round(r));
  const m = ((modelo | 0) % 3 + 3) % 3;
  const B = tipo === "asteroide" ? 14 : 12;
  const base = tipo === "drone" ? "#FF4D8F" : tipo === "striker" ? "#FF7B4D" : "#C34DFF";
  const cor = aceso ? "#FFFFFF" : base;
  const escuro = tipo === "drone" ? "#4A0620" : tipo === "striker" ? "#4A1A06" : "#2A0A3A";
  const gosma = tipo === "drone" ? "#FF9EC4" : tipo === "striker" ? "#FFC145" : "#E2A9FF";
  const meia = (tipo === "drone" ? 21 : tipo === "striker" ? 22 : rr + 8) + B * FOLGA;
  return figura("i|" + tipo + "|" + rr + "|" + m + "|" + (aceso ? 1 : 0), meia, meia, g => {
    g.shadowColor = base; g.shadowBlur = B;
    g.fillStyle = cor;
    g.strokeStyle = cor;

    if (tipo === "drone") {
      if (m === 0) {
        /* olho-larva: um bulbo com tentáculos escorrendo */
        g.lineWidth = 2.2;
        pernasAlien(g, 7, 8, 9, 0.5, 2.2);
        g.beginPath(); g.ellipse(0, -1, 11, 12, 0, 0, TAU); g.fill();
        g.shadowBlur = 0;
        g.fillStyle = escuro;
        g.beginPath(); g.ellipse(0, -1, 8.4, 9.2, 0, 0, TAU); g.fill();
        olhoAlien(g, 0, -1, 6.2, "#B7FF57");
      } else if (m === 1) {
        /* aranha de casco: seis patas e quatro olhinhos */
        g.lineWidth = 2;
        pernasAlien(g, 6, 7, 11, -0.7, 2);
        g.beginPath();
        g.moveTo(0, -11); g.lineTo(9, -3); g.lineTo(7, 9); g.lineTo(0, 13);
        g.lineTo(-7, 9); g.lineTo(-9, -3);
        g.closePath(); g.fill();
        g.shadowBlur = 0;
        g.fillStyle = escuro;
        g.beginPath(); g.ellipse(0, 1, 5.6, 7, 0, 0, TAU); g.fill();
        for (let k = 0; k < 4; k++) {
          olhoAlien(g, -3.4 + (k % 2) * 6.8, -3 + Math.floor(k / 2) * 5.4, 2.1, "#FFE066");
        }
      } else {
        /* boca: só dentes e uma goela */
        g.beginPath();
        g.moveTo(0, 13); g.lineTo(12, -2); g.lineTo(7, -11);
        g.lineTo(-7, -11); g.lineTo(-12, -2);
        g.closePath(); g.fill();
        g.shadowBlur = 0;
        g.fillStyle = escuro;
        g.beginPath(); g.ellipse(0, 1, 8, 6.4, 0, 0, TAU); g.fill();
        g.fillStyle = "#FFF3E6";
        dentesAlien(g, 0, -3.6, 7.4, 4.4, 5, false);
        dentesAlien(g, 0, 6.2, 7.4, 4.4, 5, true);
        g.fillStyle = gosma;
        g.beginPath(); g.arc(0, 1, 1.9, 0, TAU); g.fill();
      }

    } else if (tipo === "striker") {
      if (m === 0) {
        /* vespa: corpo em anéis, asas finas e um ferrão */
        g.save();
        g.globalAlpha = 0.4;
        g.beginPath(); g.ellipse(-9, -3, 8, 3.4, -0.6, 0, TAU); g.fill();
        g.beginPath(); g.ellipse(9, -3, 8, 3.4, 0.6, 0, TAU); g.fill();
        g.restore();
        g.beginPath(); g.ellipse(0, 1, 6.2, 13, 0, 0, TAU); g.fill();
        g.shadowBlur = 0;
        g.fillStyle = escuro;
        for (let k = 0; k < 3; k++) {
          g.beginPath(); g.ellipse(0, -2 + k * 5, 6 - k * 0.6, 1.5, 0, 0, TAU); g.fill();
        }
        g.fillStyle = cor;
        g.beginPath();
        g.moveTo(0, 19); g.lineTo(2.6, 12); g.lineTo(-2.6, 12);
        g.closePath(); g.fill();
        olhoAlien(g, -2.8, -8, 2.6, "#FF3B5C");
        olhoAlien(g, 2.8, -8, 2.6, "#FF3B5C");
      } else if (m === 1) {
        /* garra de carne: duas pinças abrindo, com boca no meio */
        g.lineWidth = 2.6;
        g.strokeStyle = cor;
        for (const lado of [-1, 1]) {
          g.beginPath();
          g.moveTo(lado * 3, -2);
          g.quadraticCurveTo(lado * 13, -6, lado * 10, -15);
          g.stroke();
          g.beginPath();
          g.moveTo(lado * 3, 2);
          g.quadraticCurveTo(lado * 14, 6, lado * 9, 14);
          g.stroke();
        }
        g.beginPath();
        g.moveTo(0, -13);
        g.quadraticCurveTo(8, -6, 6, 6);
        g.quadraticCurveTo(3, 17, 0, 19);
        g.quadraticCurveTo(-3, 17, -6, 6);
        g.quadraticCurveTo(-8, -6, 0, -13);
        g.closePath(); g.fill();
        g.shadowBlur = 0;
        g.fillStyle = escuro;
        g.beginPath(); g.ellipse(0, 0, 4.2, 7, 0, 0, TAU); g.fill();
        g.fillStyle = "#FFF3E6";
        dentesAlien(g, 0, -3.2, 3.6, 3, 3, false);
        dentesAlien(g, 0, 4.4, 3.6, 3, 3, true);
        olhoAlien(g, -3.6, -8.4, 2.2, "#B7FF57");
        olhoAlien(g, 3.6, -8.4, 2.2, "#B7FF57");
      } else {
        /* cabeça de tentáculos */
        g.lineWidth = 2.4;
        g.strokeStyle = cor;
        for (let k = 0; k < 5; k++) {
          const x0 = -8 + k * 4;
          g.beginPath();
          g.moveTo(x0, 5);
          g.quadraticCurveTo(x0 + (k % 2 ? 5 : -5), 12, x0 + (k % 2 ? 2 : -2), 19);
          g.stroke();
        }
        g.beginPath(); g.ellipse(0, -3, 10.5, 10, 0, 0, TAU); g.fill();
        g.shadowBlur = 0;
        g.fillStyle = escuro;
        g.beginPath(); g.ellipse(0, -2, 7.4, 6.8, 0, 0, TAU); g.fill();
        olhoAlien(g, 0, -3, 5.2, "#FFE066");
        g.fillStyle = "#FFF3E6";
        dentesAlien(g, 0, 4.4, 5.6, 3.2, 4, false);
      }

    } else {
      /* asteroide: os grandalhões */
      if (m === 0) {
        /* casulo: casca com veias e um bicho pulsando dentro */
        g.beginPath();
        g.ellipse(0, 0, rr * 0.82, rr, 0, 0, TAU); g.fill();
        g.shadowBlur = 0;
        g.strokeStyle = escuro;
        g.lineWidth = Math.max(2, rr * 0.13);
        for (let k = 0; k < 5; k++) {
          const fx = -0.8 + k * 0.4;
          g.beginPath();
          g.moveTo(fx * rr * 0.7, -rr * 0.95);
          g.quadraticCurveTo(fx * rr * 1.15, 0, fx * rr * 0.6, rr * 0.95);
          g.stroke();
        }
        g.strokeStyle = gosma;
        g.lineWidth = Math.max(1, rr * 0.055);
        for (let k = 0; k < 4; k++) {
          const a = 0.5 + k * 1.4;
          g.beginPath();
          g.moveTo(Math.cos(a) * rr * 0.25, Math.sin(a) * rr * 0.25);
          g.quadraticCurveTo(Math.cos(a + 0.6) * rr * 0.5, Math.sin(a + 0.6) * rr * 0.5,
                             Math.cos(a) * rr * 0.76, Math.sin(a) * rr * 0.76);
          g.stroke();
        }
        g.fillStyle = escuro;
        g.beginPath(); g.ellipse(0, 0, rr * 0.44, rr * 0.6, 0, 0, TAU); g.fill();
        g.fillStyle = gosma;
        g.beginPath(); g.ellipse(0, rr * 0.06, rr * 0.3, rr * 0.44, 0, 0, TAU); g.fill();
        olhoAlien(g, 0, 0, rr * 0.22, "#8CFF5A");
      } else if (m === 1) {
        /* carcaça: pedra viva com espinhos e um olho no meio */
        g.beginPath();
        for (let k = 0; k < 9; k++) {
          const a = (k / 9) * TAU;
          const raio = rr * (k % 2 === 0 ? 1.05 : 0.7);
          if (k === 0) g.moveTo(Math.cos(a) * raio, Math.sin(a) * raio);
          else g.lineTo(Math.cos(a) * raio, Math.sin(a) * raio);
        }
        g.closePath(); g.fill();
        g.shadowBlur = 0;
        g.lineWidth = Math.max(1.6, rr * 0.1);
        g.strokeStyle = escuro;
        pernasAlien(g, 5, rr * 0.9, rr * 0.42, 0.35, Math.max(1.6, rr * 0.1));
        g.fillStyle = escuro;
        g.beginPath(); g.arc(0, 0, rr * 0.5, 0, TAU); g.fill();
        olhoAlien(g, 0, 0, rr * 0.34, "#FF3B5C");
        g.fillStyle = "#FFF3E6";
        dentesAlien(g, 0, rr * 0.52, rr * 0.42, rr * 0.2, 4, false);
      } else {
        /* ninho: um monte de olhos amontoados */
        g.beginPath();
        for (let k = 0; k < 11; k++) {
          const a = (k / 11) * TAU;
          const raio = rr * (0.78 + ((k * 7) % 5) * 0.06);
          if (k === 0) g.moveTo(Math.cos(a) * raio, Math.sin(a) * raio);
          else g.lineTo(Math.cos(a) * raio, Math.sin(a) * raio);
        }
        g.closePath(); g.fill();
        g.shadowBlur = 0;
        g.fillStyle = escuro;
        g.beginPath(); g.arc(0, 0, rr * 0.66, 0, TAU); g.fill();
        const olhos = [[0, -rr * 0.3, 0.2], [-rr * 0.32, rr * 0.12, 0.16],
                       [rr * 0.3, rr * 0.1, 0.17], [0, rr * 0.36, 0.13],
                       [-rr * 0.14, -rr * 0.02, 0.12], [rr * 0.12, -rr * 0.06, 0.1]];
        for (const o of olhos) olhoAlien(g, o[0], o[1], rr * o[2], "#B7FF57");
      }
    }
  });
}

function drawBullet(b) {
  if (b.aliado) {                    // tiro de tanque, soldado ou helicóptero
    carimbar(figuraTiroAliado(b.aliado), b.x, b.y);
    return;
  }
  carimbar(figuraTiro(b.style || "reto", ST.bColor, ST.bGlow), b.x, b.y);
}

let dtDesenho = 0.016;
/* ---------------------------------------------------------------------
   Decoração dos eventos: cada evento tem o seu céu e as suas partículas.
   Tudo desenhado na hora, sem imagem nenhuma para baixar.
   --------------------------------------------------------------------- */
let decoP = [];
/* ---------- o que flutua no ar ----------
   Evento manda mais que setor: se tem festa rolando, cai confete; se não,
   cai o que for a cara do setor onde a fase acontece.                    */
function climaAgora() {
  const ev = eventoAtual();
  if (ev) return { tipo: ev.particula, cor: ev.cor, evento: true };
  if (S.mode !== "playing" && S.mode !== "paused") return null;
  const set = setorAtual();
  return set ? { tipo: set.flutua, cor: set.cor, evento: false } : null;
}
function decoAtualizar(dt) {
  const cl = climaAgora();
  if (!cl || !qEnfeites()) { if (decoP.length) decoP.length = 0; return; }
  const ev = { particula: cl.tipo };
  const alvo = Math.round((ev.particula === "codigo" ? 46 : 34) *
               (Q.nivel >= 2 ? 1 : 0.6) * (cl.evento ? 1 : 0.85));
  if (decoP.length > alvo) decoP.length = alvo;
  while (decoP.length < alvo) {
    decoP.push({ x: rand(0, W), y: rand(-H, H), v: rand(24, 120),
                 s: rand(1.4, 4.6), a: rand(0, TAU), giro: rand(-2, 2),
                 h: Math.floor(rand(0, 360)), txt: String.fromCharCode(48 + Math.floor(rand(0, 10))) });
  }
  for (const p of decoP) {
    p.a += p.giro * dt;
    if (ev.particula === "bolha" || ev.particula === "brasa" || ev.particula === "fumaca" ||
        ev.particula === "nevoa" || ev.particula === "anel" || ev.particula === "pulso") {
      p.y -= p.v * dt;
      p.x += Math.sin(p.a) * 18 * dt;
      if (p.y < -20) { p.y = H + 20; p.x = rand(0, W); }
    } else if (ev.particula === "aurora" || ev.particula === "arco" ||
               ev.particula === "redemoinho" || ev.particula === "vazio") {
      p.x += Math.cos(p.a) * 20 * dt;
      p.y += Math.sin(p.a * 0.6) * 12 * dt;
    } else {
      const rapido = ev.particula === "meteoro" ? 3.4
                   : ev.particula === "faulha" ? 2.2
                   : ev.particula === "faisca" ? 2.6
                   : ev.particula === "poeira" ? 0.5
                   : ev.particula === "risco" ? 0.35 : 1;
      p.y += p.v * dt * rapido;
      const lado = ev.particula === "neve" ? Math.sin(p.a) * 22
                 : ev.particula === "meteoro" ? -70
                 : ev.particula === "pedra" ? Math.sin(p.a) * 10
                 : ev.particula === "sucata" ? Math.sin(p.a * 0.4) * 8
                 : ev.particula === "destroco" ? Math.sin(p.a * 0.3) * 6 : 0;
      p.x += lado * dt;
      if (p.y > H + 24) { p.y = -20; p.x = rand(0, W); }
      if (p.x < -30) p.x = W + 20;
    }
  }
}
function decoDesenhar() {
  const cl = climaAgora();
  if (!cl || !decoP.length) return;
  const ev = { particula: cl.tipo, cor: cl.cor };
  const t = S.time;
  ctx.save();
  for (const p of decoP) {
    if (ev.particula === "neve") {
      ctx.fillStyle = "rgba(255,255,255," + (0.4 + (p.s / 6)) + ")";
      ctx.beginPath(); ctx.arc(p.x, p.y, p.s * 0.7, 0, TAU); ctx.fill();
    } else if (ev.particula === "morcego") {
      ctx.fillStyle = "rgba(20,10,26,.85)";
      const w = p.s * 3;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.quadraticCurveTo(p.x - w, p.y - Math.sin(t * 8 + p.a) * 5 - 4, p.x - w * 1.6, p.y + 2);
      ctx.quadraticCurveTo(p.x - w * 0.6, p.y + 3, p.x, p.y + 2);
      ctx.quadraticCurveTo(p.x + w * 0.6, p.y + 3, p.x + w * 1.6, p.y + 2);
      ctx.quadraticCurveTo(p.x + w, p.y - Math.sin(t * 8 + p.a) * 5 - 4, p.x, p.y);
      ctx.fill();
    } else if (ev.particula === "confete" || ev.particula === "arco") {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
      ctx.fillStyle = "hsl(" + ((p.h + t * 40) % 360) + ",90%,62%)";
      ctx.fillRect(-p.s, -p.s * 0.5, p.s * 2, p.s);
      ctx.restore();
    } else if (ev.particula === "ouro") {
      ctx.fillStyle = "rgba(255,193,69,.9)";
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
      ctx.beginPath();
      ctx.moveTo(0, -p.s * 1.4); ctx.lineTo(p.s, 0); ctx.lineTo(0, p.s * 1.4); ctx.lineTo(-p.s, 0);
      ctx.closePath(); ctx.fill(); ctx.restore();
    } else if (ev.particula === "meteoro") {
      const g2 = ctx.createLinearGradient(p.x, p.y, p.x + 22, p.y - 34);
      g2.addColorStop(0, "rgba(255,120,60,.9)");
      g2.addColorStop(1, "rgba(255,120,60,0)");
      ctx.strokeStyle = g2; ctx.lineWidth = p.s * 0.8;
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + 22, p.y - 34); ctx.stroke();
    } else if (ev.particula === "bolha") {
      ctx.strokeStyle = "rgba(160,230,255,.55)"; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.s * 1.5, 0, TAU); ctx.stroke();
    } else if (ev.particula === "brasa") {
      ctx.fillStyle = "rgba(255," + (100 + p.s * 20) + ",40,.8)";
      ctx.beginPath(); ctx.arc(p.x, p.y, p.s * 0.6, 0, TAU); ctx.fill();
    } else if (ev.particula === "fumaca") {
      ctx.fillStyle = "rgba(120,110,90,.18)";
      ctx.beginPath(); ctx.arc(p.x, p.y, p.s * 6, 0, TAU); ctx.fill();
    } else if (ev.particula === "codigo") {
      ctx.fillStyle = "rgba(124,247,192," + (0.25 + p.s / 8) + ")";
      ctx.font = "700 " + (8 + p.s * 2) + "px ui-monospace,monospace";
      ctx.fillText(p.txt, p.x, p.y);
      if (Math.random() < 0.04) p.txt = String.fromCharCode(48 + Math.floor(rand(0, 10)));
    } else if (ev.particula === "aurora") {
      const g3 = ctx.createLinearGradient(p.x - 60, p.y - 90, p.x + 60, p.y + 90);
      g3.addColorStop(0, "rgba(124,247,192,0)");
      g3.addColorStop(0.5, "rgba(124,247,192,.13)");
      g3.addColorStop(1, "rgba(77,232,255,0)");
      ctx.fillStyle = g3;
      ctx.fillRect(p.x - 60, 0, 120, H);
    } else if (ev.particula === "neon") {
      ctx.strokeStyle = "hsl(" + ((p.h + t * 120) % 360) + ",95%,62%)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(p.x, p.y - p.s * 6); ctx.lineTo(p.x, p.y + p.s * 6); ctx.stroke();

    /* ---------- o que flutua em cada setor ---------- */
    } else if (ev.particula === "poeira") {
      // Periferia: poeira de estrela, pontinhos claros descendo devagar
      ctx.fillStyle = "rgba(190,225,255," + (0.18 + p.s / 14) + ")";
      ctx.beginPath(); ctx.arc(p.x, p.y, p.s * 0.34, 0, TAU); ctx.fill();
    } else if (ev.particula === "pedra") {
      // Campo de Asteroides: pedrinhas irregulares girando
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
      ctx.fillStyle = "rgba(150,126,100,.5)";
      ctx.beginPath();
      const r0 = p.s * 1.5;
      ctx.moveTo(r0, 0);
      ctx.lineTo(r0 * 0.5, r0 * 0.8);
      ctx.lineTo(-r0 * 0.7, r0 * 0.5);
      ctx.lineTo(-r0, -r0 * 0.3);
      ctx.lineTo(-r0 * 0.2, -r0 * 0.9);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    } else if (ev.particula === "nevoa") {
      // Nebulosa Rosa: bolsões de névoa rosada
      const gn = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s * 22);
      gn.addColorStop(0, "rgba(255,110,170,.09)");
      gn.addColorStop(1, "rgba(255,110,170,0)");
      ctx.fillStyle = gn;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.s * 22, 0, TAU); ctx.fill();
    } else if (ev.particula === "vazio") {
      // Cinturão Escuro: manchas escuras que engolem a luz
      ctx.fillStyle = "rgba(2,3,8,.5)";
      ctx.beginPath(); ctx.arc(p.x, p.y, p.s * 9, 0, TAU); ctx.fill();
    } else if (ev.particula === "faisca") {
      // Tempestade Iônica: riscos elétricos curtos e tortos
      ctx.strokeStyle = "rgba(140,235,255," + (0.35 + p.s / 10) + ")";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + Math.cos(p.a) * 9, p.y + 11);
      ctx.lineTo(p.x + Math.cos(p.a) * 3, p.y + 22);
      ctx.stroke();
    } else if (ev.particula === "anel") {
      // Núcleo Profundo: anéis roxos que abrem e somem
      const fr = ((t * 0.5 + p.s) % 1);
      ctx.strokeStyle = "rgba(195,77,255," + (0.3 * (1 - fr)) + ")";
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(p.x, p.y, 6 + fr * 42, 0, TAU); ctx.stroke();
    } else if (ev.particula === "destroco") {
      // Cemitério de Naves: pedaços de casco boiando
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a * 0.3);
      ctx.fillStyle = "rgba(120,140,146,.42)";
      ctx.fillRect(-p.s * 2.4, -p.s * 0.7, p.s * 4.8, p.s * 1.4);
      ctx.fillStyle = "rgba(80,98,104,.5)";
      ctx.fillRect(-p.s * 0.7, -p.s * 1.8, p.s * 1.4, p.s * 3.6);
      ctx.restore();
    } else if (ev.particula === "gelo") {
      // Fenda Gelada: cristais de seis pontas
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
      ctx.strokeStyle = "rgba(190,240,255," + (0.3 + p.s / 12) + ")";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let k = 0; k < 3; k++) {
        const ang = (k / 3) * Math.PI;
        ctx.moveTo(-Math.cos(ang) * p.s * 2, -Math.sin(ang) * p.s * 2);
        ctx.lineTo(Math.cos(ang) * p.s * 2, Math.sin(ang) * p.s * 2);
      }
      ctx.stroke();
      ctx.restore();
    } else if (ev.particula === "redemoinho") {
      // Olho da Tempestade: rastros curvos verdes girando devagar
      ctx.strokeStyle = "rgba(91,240,176,.18)";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.s * 12, p.a, p.a + 1.5);
      ctx.stroke();
    } else if (ev.particula === "faulha") {
      // Forja Estelar: fagulhas douradas caindo com rastro
      const gg = ctx.createLinearGradient(p.x, p.y - 12, p.x, p.y + 3);
      gg.addColorStop(0, "rgba(255,193,69,0)");
      gg.addColorStop(1, "rgba(255,215,120,.85)");
      ctx.strokeStyle = gg;
      ctx.lineWidth = p.s * 0.5;
      ctx.beginPath(); ctx.moveTo(p.x, p.y - 12); ctx.lineTo(p.x, p.y + 3); ctx.stroke();
    } else if (ev.particula === "sucata") {
      // Mar de Destroços: chapas retangulares girando
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a * 0.5);
      ctx.strokeStyle = "rgba(157,182,232,.3)";
      ctx.lineWidth = 1.2;
      ctx.strokeRect(-p.s * 2, -p.s * 1.2, p.s * 4, p.s * 2.4);
      ctx.restore();
    } else if (ev.particula === "risco") {
      // Limiar do Vazio: riscos verticais quase apagados
      ctx.strokeStyle = "rgba(216,216,232,.09)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(p.x, p.y - p.s * 10); ctx.lineTo(p.x, p.y + p.s * 10); ctx.stroke();
    } else if (ev.particula === "pulso") {
      // Coração da Nebulosa: tudo pulsa junto, no mesmo compasso
      const bat = 0.5 + Math.sin(t * 2.4) * 0.5;
      const gp = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s * (10 + bat * 12));
      gp.addColorStop(0, "rgba(255,77,107," + (0.10 + bat * 0.12) + ")");
      gp.addColorStop(1, "rgba(255,77,107,0)");
      ctx.fillStyle = gp;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (10 + bat * 12), 0, TAU); ctx.fill();
    }
  }
  ctx.restore();
}

/* ---------- Fundo pronto ----------
   O céu de fundo (a cor de base e os dois brilhos grandes) era montado do
   zero em todo quadro: dois degradês criados e três telas inteiras
   pintadas, 60 vezes por segundo. Agora ele é desenhado uma vez só numa
   figura e depois é só copiar. Fica igual e sai de graça.               */
let fundoCv = null, fundoMarca = "";
function fundoRefazer() {
  fundoCv = null; fundoMarca = "";
}
function fundoPronto(ev) {
  /* o céu vem do setor da fase; um evento por cima manda mais que o setor */
  const set = (S.mode === "playing" || S.mode === "paused") ? setorAtual() : null;
  const ceu = ev ? ev.fundo : (set ? set.ceu : ["#060A18", "#0B1730"]);
  const bri = ev ? null : (set ? set.brilho : null);
  const marca = Math.round(W) + "x" + Math.round(H) + "|" + (ev ? ev.id : (set ? set.nome : "-")) +
                "|" + Q.nivel + "|" + Math.round(DPR * 100);
  if (fundoCv && fundoMarca === marca) return fundoCv;
  const e = Math.max(1, Math.min(2, DPR));
  const cv = document.createElement("canvas");
  cv.width = Math.max(1, Math.ceil(W * e));
  cv.height = Math.max(1, Math.ceil(H * e));
  const g = cv.getContext("2d");
  g.setTransform(e, 0, 0, e, 0, 0);
  g.fillStyle = ceu[0];
  g.fillRect(0, 0, W, H);
  const gf = g.createLinearGradient(0, 0, 0, H);
  gf.addColorStop(0, ceu[1]);
  gf.addColorStop(1, ceu[0]);
  g.fillStyle = gf;
  g.fillRect(0, 0, W, H);
  if (qFundoRico()) {
    const c1 = bri ? bri[0] : "rgba(255,77,143,0.07)";
    const c2 = bri ? bri[1] : "rgba(77,232,255,0.06)";
    const g1 = g.createRadialGradient(W * 0.75, H * 0.2, 0, W * 0.75, H * 0.2, H * 0.85);
    g1.addColorStop(0, c1);
    g1.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = g1;
    g.fillRect(0, 0, W, H);
    const g2 = g.createRadialGradient(W * 0.15, H * 0.72, 0, W * 0.15, H * 0.72, H * 0.75);
    g2.addColorStop(0, c2);
    g2.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = g2;
    g.fillRect(0, 0, W, H);
  }
  fundoCv = cv;
  fundoMarca = marca;
  return cv;
}

function draw() {
  figurasAjustar();
  const ev = eventoAtual();
  ctx.drawImage(fundoPronto(ev), 0, 0, W, H);
  if (ev && ev.id === "arcoiris") {
    ctx.fillStyle = "hsla(" + ((S.time * 40) % 360) + ",80%,50%,.12)";
    ctx.fillRect(0, 0, W, H);
  }
  if (ev && ev.id === "guerra" && Math.sin(S.time * 2.2) > 0.94) {
    ctx.fillStyle = "rgba(255,200,120,.10)";
    ctx.fillRect(0, 0, W, H);
  }
  // discoteca é travessura, vale com ou sem evento
  if (mundoAtivo("discoteca")) {
    ctx.fillStyle = "hsla(" + ((S.time * 320) % 360) + ",95%,55%,.16)";
    ctx.fillRect(0, 0, W, H);
  }

  drawNebulas();

  for (const st of stars) {
    ctx.globalAlpha = 0.25 + st.z * 0.75;
    ctx.fillStyle = "#EAF2FF";
    const s2 = 0.8 + st.z * 1.6;
    ctx.fillRect(st.x, st.y, s2, s2);
  }
  ctx.globalAlpha = 1;

  decoDesenhar();

  if (S.mode !== "playing" && S.mode !== "paused") return;

  ctx.save();
  // travessuras que mexem na tela inteira
  if (mundoAtivo("espelho")) { ctx.translate(W, 0); ctx.scale(-1, 1); }
  if (mundoAtivo("bebado")) {
    ctx.translate(W / 2, H / 2);
    ctx.rotate(Math.sin(S.time * 0.7) * 0.13);
    ctx.scale(1 + Math.sin(S.time * 1.1) * 0.04, 1 + Math.cos(S.time * 0.9) * 0.04);
    ctx.translate(-W / 2, -H / 2);
  }
  if (S.shake > 0.5) ctx.translate(rand(-S.shake, S.shake) * 0.5, rand(-S.shake, S.shake) * 0.5);

  // singularidade
  if (S.singu) {
    ctx.save();
    ctx.translate(S.singu.x, S.singu.y);
    ctx.strokeStyle = "rgba(195,77,255,.8)";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 24 + Math.sin(S.time * 12) * 6, 0, TAU); ctx.stroke();
    ctx.fillStyle = "#C34DFF";
    ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* poças de napalm (embaixo de tudo) */
  for (const f of fogo) {
    const a = clamp(f.t / 5, 0, 1);
    const g3 = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
    g3.addColorStop(0, (f.coco || f.acida) ? "rgba(155,212,107," + (0.42 * a) + ")"
                              : "rgba(255,193,69," + (0.42 * a) + ")");
    g3.addColorStop(1, (f.coco || f.acida) ? "rgba(120,150,60,0)" : "rgba(255,77,60,0)");
    ctx.fillStyle = g3;
    ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, TAU); ctx.fill();
  }

  /* buracos negros */
  for (const bn of buracos) {
    const halo = ctx.createRadialGradient(bn.x, bn.y, bn.r * 0.5, bn.x, bn.y, bn.r * 3.4);
    halo.addColorStop(0, "rgba(195,77,255,.55)");
    halo.addColorStop(1, "rgba(195,77,255,0)");
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(bn.x, bn.y, bn.r * 3.4, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.75)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(bn.x, bn.y, bn.r + Math.sin(bn.pulso * 6) * 3, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = "#06000E";
    ctx.beginPath(); ctx.arc(bn.x, bn.y, bn.r * 0.8, 0, TAU); ctx.fill();
  }

  /* voo rasante */
  if (rasante) {
    ctx.save();
    ctx.translate(rasante.x, rasante.y);
    ctx.rotate(rasante.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    drawShipSprite(ctx, save.ship, 20);
    ctx.restore();
  }

  /* tropas chamadas pelo Ômega-9 */
  if (aliados.length || obuses.length || laserOrbital) desenharAliados();

  for (const b of bullets) { if (b) drawBullet(b); }

  /* bombas (as do Trono Real caem marrons) */
  ctx.shadowBlur = 10;
  for (const b of bombas) {
    ctx.fillStyle = b.coco ? "#8C6239" : "#FFC145";
    ctx.shadowColor = b.coco ? "#C08B45" : "#FF9E4D";
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.beginPath();
    ctx.ellipse(0, 0, b.coco ? 6 : 4, b.coco ? 7 : 9, 0, 0, TAU);
    ctx.fill();
    if (b.coco) {
      ctx.beginPath(); ctx.ellipse(0, -4, 4, 4, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, -8, 2.4, 2.8, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  ctx.shadowBlur = 0;

  ctx.shadowColor = "#FFC145"; ctx.shadowBlur = 10;
  ctx.fillStyle = "#FFC145";
  for (const m of missilesArr) {
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(Math.atan2(m.vy, m.vx) + Math.PI / 2);
    ctx.fillRect(-3, -8, 6, 16);
    ctx.restore();
  }
  ctx.shadowBlur = 0;

  for (const b of enemyBullets) {
    if (!b) continue;
    if (b.y < -30 || b.y > H + 30 || b.x < -30 || b.x > W + 30) continue;
    const fig = figuraTiroInimigo(b.r, corTiroInimigo(b));
    // a gota aponta para onde o tiro vai, então o rastro fica certo
    if (b.vx || b.vy) carimbarGirado(fig, b.x, b.y, Math.atan2(b.vy, b.vx) - Math.PI / 2);
    else carimbar(fig, b.x, b.y);
  }

  /* o outro piloto (cooperativo ou duelo) */
  if (MP.sala) {
    for (const id in MP.outros) {
      const o = MP.outros[id];
      if (!o || o.x === undefined || o.vivo === false) continue;
      // suavização com previsão: usa a velocidade recente para adiantar
      if (o.px === undefined) { o.px = o.x; o.py = o.y; o.pts = o.ts || Date.now(); }
      if (o.x !== o.px || o.y !== o.py) {
        const agora = o.ts || Date.now();
        const dtms = Math.max(60, agora - (o.pts || agora));
        o.vx = (o.x - o.px) / dtms * 1000;
        o.vy = (o.y - o.py) / dtms * 1000;
        o.px = o.x; o.py = o.y; o.pts = agora;
      }
      const suave = mpPosicaoSuave(o);
      const atraso = clamp((Date.now() - (o.pts || Date.now())) / 1000, 0, 0.4);
      let alvoX = suave ? suave.x : o.x + (o.vx || 0) * atraso * 0.7;
      let alvoY = suave ? suave.y : o.y + (o.vy || 0) * atraso * 0.7;
      // duelo: a nave dele vem de cima, espelhada (veja a nota nos tiros)
      if (MP.modo === "pvp") { alvoX = W - alvoX; alvoY = H - alvoY; }
      // aproximação por tempo: liso mesmo se um quadro demorar
      const k = 1 - Math.pow(suave ? 0.000002 : 0.0006, dtDesenho);
      o.dx = o.dx === undefined ? alvoX : lerp(o.dx, alvoX, k);
      o.dy = o.dy === undefined ? alvoY : lerp(o.dy, alvoY, k);
      mpDesenharTirosDoOutro(o);
      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.translate(o.dx, o.dy);
      if (MP.modo === "pvp") ctx.rotate(Math.PI);   // o adversário vem de cima
      drawShipSprite(ctx, o.nave || 0, 17);
      ctx.restore();
      ctx.globalAlpha = 1;
      // nome e vida
      ctx.textAlign = "center";
      ctx.font = "700 10px 'Chakra Petch',sans-serif";
      ctx.fillStyle = MP.modo === "pvp" ? "#FF87B3" : "#7CF7C0";
      ctx.fillText(String(o.nome || "").slice(0, 12), o.dx, o.dy + (MP.modo === "pvp" ? 34 : -26));
      // tiros do outro
      ctx.fillStyle = MP.modo === "pvp" ? "#FF87B3" : "#9FF3C8";
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 6;
      if (o.sim) for (const b of o.sim) ctx.fillRect(b.x - 2, b.y - 7, 4, 12);
      ctx.shadowBlur = 0;
      // ultimate ou habilidade que ele acabou de soltar
      if (o.poder) {
        o.poder.t -= dtDesenho;
        if (o.poder.t <= 0) o.poder = null;
        else mpDesenharPoderDoOutro(o, o.dx, o.dy);
      }
    }
  }

  for (const e of enemies) drawEnemy(e);
  drawAsteroides();
  drawResgate();
  drawPortal();
  drawAvisos();
  drawBoss();
  for (const p of powerups) drawPowerup(p);
  drawShip();

  efxDesenhar();

  for (const p of particles) {
    if (p.y < -20 || p.y > H + 20) continue;
    ctx.globalAlpha = clamp(p.t / p.max, 0, 1);
    ctx.fillStyle = p.color;
    if (p.pedaco) {
      /* pedaço de casco: gira enquanto cai, como sucata de verdade */
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.ang || 0);
      ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
      ctx.restore();
    } else {
      ctx.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r);
    }
  }
  ctx.globalAlpha = 1;

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = "700 14px 'Chakra Petch',sans-serif";
  for (const t of texts) {
    ctx.globalAlpha = clamp(t.t, 0, 1);
    ctx.fillStyle = t.color;
    ctx.fillText(t.str, t.x, t.y);
  }
  ctx.globalAlpha = 1;

  if (S.furyT > 0) {
    ctx.fillStyle = "rgba(255,77,80," + (0.06 + Math.sin(S.time * 14) * 0.03) + ")";
    ctx.fillRect(0, 0, W, H);
  }
  if (S.superNova > 0) {
    const a = clamp(S.superNova / (S.superNovaMax || 1.1), 0, 1) * (S.superNovaForca || 1);
    ctx.fillStyle = "rgba(255,255,255," + (a * 0.85) + ")";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,193,69," + (a * 0.5) + ")";
    ctx.fillRect(0, 0, W, H);
  }

  if (S.banner) {
    const a = clamp(S.banner.t, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = S.banner.text.indexOf("CHEFE") >= 0 ? "#FF5252" : "#FFC145";
    const bannerSize = Math.round(clamp(W * 0.08, 26, 44));
    ctx.font = bannerSize + "px 'Russo One',sans-serif";
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 20;
    ctx.fillText(S.banner.text, W / 2, H * 0.4);
    ctx.shadowBlur = 0;
    if (S.banner.sub) {
      ctx.fillStyle = "#EAF2FF";
      ctx.font = "600 15px 'Chakra Petch',sans-serif";
      ctx.fillText(S.banner.sub, W / 2, H * 0.4 + 34);
    }
    ctx.globalAlpha = 1;
  }

  ctx.restore();

  // apagão: só um círculo em volta da nave fica visível
  if (mundoAtivo("escuro") && player.alive) {
    const raio = 130;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.arc(player.x, player.y, raio, 0, TAU, true);
    ctx.fillStyle = "rgba(2,4,10,.94)";
    ctx.fill();
    const gl = ctx.createRadialGradient(player.x, player.y, raio * 0.6, player.x, player.y, raio);
    gl.addColorStop(0, "rgba(2,4,10,0)");
    gl.addColorStop(1, "rgba(2,4,10,.94)");
    ctx.fillStyle = gl;
    ctx.beginPath(); ctx.arc(player.x, player.y, raio, 0, TAU); ctx.fill();
    ctx.restore();
  }
}

