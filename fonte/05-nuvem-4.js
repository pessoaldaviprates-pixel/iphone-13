/* ---------- Inimigos comuns ---------- */
function pickEnemyType(R) {
  const dl = dLevel();
  const roll = (R || Math.random)();
  if (dl >= 8 && roll < 0.2) return "tank";
  if (dl >= 4 && roll < 0.5) return "striker";
  return "drone";
}
let serieDaOnda = 0;
function spawnEnemy(forceType) {
  const R = S.rng || Math.random;
  const rr = (a, b) => a + R() * (b - a);
  const type = forceType || pickEnemyType(R);
  const f = S.fase;
  const spd = Math.min(f * 2, 130);
  const e = {
    type,
    sid: serieDaOnda++,     // mesmo número nos dois aparelhos, para o abate valer nos dois
    /* três modelos de casco por tipo, sorteados com a MESMA semente nos
       dois aparelhos: no cooperativo os dois veem o mesmo bicho         */
    modelo: Math.floor(R() * 3) % 3,
    x: rr(30, W - 30), y: -40,
    t: rr(0, TAU),
    fireTimer: rr(1, 2.5),
    hitFlash: 0, slowT: 0, frozenT: 0
  };
  const A = adapt();
  if (type === "drone") {
    e.r = 15; e.hp = 1 + Math.floor(f / 8); e.speed = rr(55, 80) + spd * 0.5;
    e.amp = rr(30, 70); e.score = 10;
  } else if (type === "striker") {
    e.r = 14; e.hp = 2 + Math.floor(f / 7); e.speed = rr(95, 125) + spd * 0.5;
    e.amp = rr(10, 30); e.score = 25;
  } else {
    e.r = 24; e.hp = 5 + Math.floor(f / 5) * 2; e.speed = rr(30, 42);
    e.amp = rr(5, 15); e.score = 40;
  }
  if (mundoAtivo("gigante")) { e.r = Math.round(e.r * 2.1); e.hp = Math.round(e.hp * 1.6); }
  if (mundoAtivo("mini")) { e.r = Math.max(5, Math.round(e.r * 0.45)); e.speed *= 1.35; }
  const D = dificuldadeAtual();
  e.hp = Math.max(1, Math.round(e.hp * A.vida * D.vida));
  e.speed *= A.velocidade * D.vel;
  e.score = Math.round(e.score * (1 + (A.vida - 1) * 0.6) * D.premio);   // mais duro, mais pontos
  enemies.push(e);
  return e;
}

/* ---------- Chefes: 6 tipos únicos ---------- */
const BOSS_KINDS = ["ceifador", "colosso", "serpente", "enxame", "prisma", "olho"];
const BOSS_NAMES = {
  ceifador: "Ceifador Carmesim",
  colosso:  "Colosso de Ferro",
  serpente: "Serpente do Vazio",
  enxame:   "Rainha do Enxame",
  prisma:   "Prisma Eterno",
  olho:     "Olho do Abismo"
};
function spawnBoss() {
  const idx = Math.floor(S.fase / 5) - 1;
  const kind = BOSS_KINDS[((idx % 6) + 6) % 6];
  /* chefe mais duro: mais casca e uma segunda etapa de fúria quando a
     vida cai. Não é só número maior — é uma luta que muda no meio.   */
  const hp = 78 + S.fase * 19;
  boss = {
    kind, bname: BOSS_NAMES[kind],
    hp, maxHp: hp,
    x: W / 2, y: -120, r: 46,
    t: 0, entering: true, hitFlash: 0, frozenT: 0,
    fireTimer: 1.4, burstTimer: 3
  };
  if (kind === "ceifador") {
    boss.r = 44; boss.dashT = 4; boss.sweepT = 5;
  } else if (kind === "colosso") {
    boss.r = 36;
    boss.coreHp = Math.round(hp * 0.4);
    boss.pods = [
      { dx: -70, hp: Math.round(hp * 0.3), fireT: 1.4 },
      { dx: 70,  hp: Math.round(hp * 0.3), fireT: 2.2 }
    ];
    boss.colT = 2;
  } else if (kind === "serpente") {
    boss.r = 24; boss.trail = []; boss.segs = 9;
  } else if (kind === "enxame") {
    boss.r = 46; boss.spawnT = 2.2; boss.spiral = 0; boss.spiralT = 0.22;
  } else if (kind === "prisma") {
    boss.r = 42; boss.beam = { phase: "idle", t: 1.4, ang: Math.PI / 2 }; boss.cornerT = 2.2;
  } else if (kind === "olho") {
    boss.r = 40; boss.tele = { phase: "vis", t: 2.6 }; boss.alpha = 1; boss.orbT = 2.8;
  }
}
function bossHpLeft() {
  if (!boss) return 0;
  if (boss.kind === "colosso") {
    let s2 = boss.coreHp;
    for (const p of boss.pods) s2 += p.hp;
    return s2;
  }
  return boss.hp;
}
function bossZones() {
  if (!boss || boss.entering) return [];
  if (boss.kind === "colosso") {
    const z = [];
    for (const p of boss.pods) z.push({ x: boss.x + p.dx, y: boss.y + 12, r: 22, pod: p });
    z.push({ x: boss.x, y: boss.y, r: 34, core: true });
    return z;
  }
  if (boss.kind === "serpente") {
    const z = [{ x: boss.x, y: boss.y, r: 24 }];
    for (let k = 1; k <= boss.segs; k++) {
      const node = boss.trail[k * 7];
      if (node) z.push({ x: node.x, y: node.y, r: 17 - k * 0.6 });
    }
    return z;
  }
  if (boss.kind === "olho" && boss.tele.phase !== "vis") return [];
  return [{ x: boss.x, y: boss.y, r: boss.r }];
}
function damageBossZone(z, d) {
  boss.hitFlash = 0.06;
  addUlt(0.004);
  // CASCA VIVA: enquanto está de pé, o chefe segura mais da metade do dano
  if (boss.casca > 0) d *= 0.45;
  if (z.pod) {
    z.pod.hp -= d;
    if (z.pod.hp <= 0) {
      explosion(z.x, z.y, "#FFC145", 30, 260);
      AudioSys.explode();
      boss.pods = boss.pods.filter(p => p !== z.pod);
      if (boss.pods.length === 0) addText(boss.x, boss.y - 50, "NÚCLEO EXPOSTO!", "#FFC145");
    }
  } else if (boss.kind === "colosso") {
    if (boss.pods.length > 0) { addText(z.x, z.y - 30, "IMUNE", "#9FB0CC"); return; }
    boss.coreHp -= d;
    if (mpCoop()) MP.meuDano += d;
  } else if (mpCoop()) {
    // no cooperativo o dano dos dois é somado no mesmo chefe
    MP.meuDano += d;
    boss.hp = Math.max(0, boss.maxHp - (MP.danoTotal + d));
  } else {
    boss.hp -= d;
  }
  if (bossHpLeft() <= 0 && !mpCoop()) bossDefeated();
}
function damageBossAny(d) {
  if (!boss || boss.entering) return;
  const zs = bossZones();
  if (!zs.length) return;
  damageBossZone(zs[0].pod ? zs[0] : zs[zs.length - 1], d);
}
function bossCanAct() {
  return boss && !boss.entering && boss.frozenT <= 0;
}
/* =====================================================================
   PODERES DO CHEFE — oito golpes que qualquer chefe pode soltar
   ---------------------------------------------------------------------
   Além do jeito de lutar de cada um, todo chefe tira um golpe da manga de
   tempos em tempos, sorteado na hora. Assim a mesma luta nunca sai igual
   duas vezes. Os perigosos avisam antes (marca no chão ou faixa na tela),
   para dar sempre para desviar — é difícil, não é injusto.
   Em fúria os golpes vêm quase no dobro da frequência.
   ===================================================================== */
const BOSS_PODERES = [
  { id: "teia",    nome: "TEIA DE ESPINHOS",  aviso: false },
  { id: "praga",   nome: "CHUVA DE PRAGA",    aviso: true  },
  { id: "garras",  nome: "GARRAS DO VAZIO",   aviso: true  },
  { id: "chamado", nome: "CHAMADO DA COLMEIA",aviso: false },
  { id: "raio",    nome: "RAIO CORROSIVO",    aviso: true  },
  { id: "casca",   nome: "CASCA VIVA",        aviso: false },
  { id: "bote",    nome: "BOTE",              aviso: true  },
  { id: "nevoa",   nome: "NÉVOA ÁCIDA",       aviso: false }
];
let bossMarcas = [];   // avisos no chão antes do golpe

function bossSortearPoder() {
  if (!boss) return;
  const p = BOSS_PODERES[Math.floor(Math.random() * BOSS_PODERES.length)];
  boss.poderAtual = p.id;
  boss.poderNome = p.nome;
  if (p.aviso) {
    boss.aviso = 0.9;                 // quase um segundo de aviso
    S.banner = { text: "⚠ " + p.nome, sub: "desvia!", t: 1.1 };
  } else {
    bossSoltarPoder(p.id);
  }
}
function bossSoltarPoder(id) {
  if (!boss) return;
  const forte = boss.furia ? 1.4 : 1;
  const vel = 190 + S.fase * 1.1;
  if (id === "teia") {
    const n = Math.round(16 * forte);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU + Math.random() * 0.3;
      enemyBullets.push({ x: boss.x, y: boss.y, vx: Math.cos(a) * vel * 0.7,
                          vy: Math.sin(a) * vel * 0.7, r: 5, dano: adapt().dano });
    }
    AudioSys.explode();
  } else if (id === "praga") {
    const n = Math.round(9 * forte);
    for (let k = 0; k < n; k++) {
      const x = rand(20, W - 20);
      enemyBullets.push({ x, y: -20 - k * 26, vx: rand(-25, 25), vy: vel * 0.85,
                          r: 6, dano: adapt().dano });
    }
  } else if (id === "garras") {
    // duas faixas que varrem a tela na diagonal
    for (const lado of [-1, 1]) {
      for (let k = 0; k < 14; k++) {
        const t = k / 14;
        enemyBullets.push({
          x: lado < 0 ? -20 : W + 20, y: H * (0.2 + t * 0.5),
          vx: lado * (vel * 1.15), vy: -18 + t * 30, r: 5, dano: adapt().dano
        });
      }
    }
  } else if (id === "chamado") {
    const n = Math.round(4 * forte);
    for (let k = 0; k < n; k++) {
      const e = spawnEnemy(Math.random() < 0.5 ? "drone" : "striker");
      if (e) { e.x = boss.x + rand(-70, 70); e.y = boss.y + rand(10, 40); }
    }
    addText(boss.x, boss.y - 40, "CHAMADO", "#C34DFF");
  } else if (id === "raio") {
    boss.raio = { x: boss.alvoX === undefined ? player.x : boss.alvoX, t: 0.9, larg: 34 * forte };
  } else if (id === "casca") {
    boss.casca = 4.5;
    addText(boss.x, boss.y - 44, "CASCA VIVA", "#8CFF5A");
  } else if (id === "bote") {
    boss.bote = { x: clamp(player.x, 50, W - 50), y: clamp(player.y - 40, 120, H * 0.7), t: 0.75 };
  } else if (id === "nevoa") {
    for (let k = 0; k < 5; k++) {
      fogo.push({ x: player.x + rand(-90, 90), y: player.y + rand(-90, 40),
                  r: 60, t: 4.5, acida: true });
    }
    addText(boss.x, boss.y - 40, "NÉVOA ÁCIDA", "#9BD46B");
  }
}
/* roda todo quadro: conta o tempo, mostra o aviso e resolve o golpe */
/* Vale para TODO tipo de chefe: seja qual for o relógio que ele usa para
   atirar, meio segundo antes a linha vermelha aparece no caminho do tiro.
   É o que transforma "morri sem ver" em "eu que não desviei".          */
const BOSS_RELOGIOS = ["fireTimer", "burstTimer", "colT", "poderT", "raioT", "dashCd", "cuspeT"];
function bossAvisarTiro() {
  if (!boss || boss.entering) return;
  /* cada tipo de chefe usa um relógio diferente para atirar; olhamos
     todos e usamos o que estiver mais perto de estourar */
  let t = 99;
  for (const campo of BOSS_RELOGIOS) {
    const v = boss[campo];
    if (typeof v === "number" && v > 0) t = Math.min(t, v);
  }
  if (t > 0 && t < 0.45) {
    if (!boss.avisou) {
      boss.avisou = true;
      avisarAtaque(boss.x, boss.y + (boss.r || 40), "linha", t + 0.08);
    }
  } else if (t > 0.6) {
    boss.avisou = false;
  }
}
function bossPoderes(dt) {
  if (!boss || boss.entering) return;
  if (boss.casca > 0) boss.casca -= dt;
  // marca do raio no chão, antes de descer
  if (boss.raio) {
    boss.raio.t -= dt;
    if (boss.raio.t <= 0) {
      // o raio desce: fere quem estiver na faixa
      if (player.alive && Math.abs(player.x - boss.raio.x) < boss.raio.larg) hitPlayer();
      explosion(boss.raio.x, H * 0.6, "#8CFF5A", 26, 300);
      S.shake = Math.max(S.shake, 14);
      AudioSys.bigBoom();
      boss.raio = null;
    }
  }
  if (boss.bote) {
    boss.bote.t -= dt;
    boss.x += (boss.bote.x - boss.x) * 7 * dt;
    boss.y += (boss.bote.y - boss.y) * 7 * dt;
    if (player.alive && dist2(boss.x, boss.y, player.x, player.y) < (boss.r + player.r) * (boss.r + player.r)) {
      hitPlayer();
      boss.bote = null;
    } else if (boss.bote.t <= 0) boss.bote = null;
  }
  if (boss.aviso > 0) {
    boss.aviso -= dt;
    if (boss.aviso <= 0) bossSoltarPoder(boss.poderAtual);
    return;
  }
  boss.poderT = (boss.poderT === undefined ? 4.5 : boss.poderT) - dt;
  if (boss.poderT <= 0) {
    boss.poderT = (boss.furia ? 3.2 : 5.6) + Math.random() * 2.2;
    bossSortearPoder();
  }
}
/* desenha os avisos: faixa do raio e mira do bote */
function bossDesenharAvisos() {
  if (!boss) return;
  if (boss.raio) {
    const f = clamp(boss.raio.t / 0.9, 0, 1);
    const g2 = ctx.createLinearGradient(0, 0, 0, H);
    g2.addColorStop(0, "rgba(140,255,90," + (0.28 * (1 - f) + 0.12) + ")");
    g2.addColorStop(1, "rgba(140,255,90,0)");
    ctx.fillStyle = g2;
    ctx.fillRect(boss.raio.x - boss.raio.larg, 0, boss.raio.larg * 2, H);
    ctx.strokeStyle = "rgba(140,255,90,.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(boss.raio.x, 0); ctx.lineTo(boss.raio.x, H);
    ctx.stroke();
  }
  if (boss.casca > 0) {
    ctx.strokeStyle = "rgba(140,255,90," + (0.35 + Math.sin(boss.t * 9) * 0.2) + ")";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(boss.x, boss.y, boss.r + 14, 0, TAU); ctx.stroke();
  }
}

function bossCanFire() {
  return bossCanAct() && player.alive && player.invis <= 0;
}

function updateBoss(dt) {
  if (!boss) return;
  /* ---- FÚRIA ----
     Abaixo de 35% da vida o bicho entra em transe: tudo nele acelera de
     uma vez (anda, mira e atira 42% mais rápido), a casca racha e os
     olhos acendem. É a segunda etapa da luta.                        */
  if (!boss.furia && !boss.entering && bossHpLeft() > 0 &&
      bossHpLeft() <= boss.maxHp * 0.35) {
    boss.furia = true;
    boss.hitFlash = 0.5;
    S.shake = Math.max(S.shake, 18);
    S.banner = { text: "⚠ " + String(boss.bname || "CHEFE").toUpperCase() + " EM FÚRIA",
                 sub: "a casca rachou — ele ficou mais rápido", t: 2.4 };
    try { AudioSys.bossAlert(); } catch (e) {}
    vibrate([70, 50, 120]);
  }
  if (boss.furia) dt *= 1.42;
  boss.t += dt;
  if (boss.hitFlash > 0) boss.hitFlash -= dt;
  bossPoderes(dt);          // os oito golpes sorteados
  bossAvisarTiro();         // a linha vermelha meio segundo antes do tiro
  cascaDuplaPassar(dt);     // o chefe que só cai em dupla
  if (boss.frozenT > 0) { boss.frozenT -= dt; return; }
  const targetY = Math.max(120, H * 0.17);
  if (boss.entering) {
    boss.y += 70 * dt;
    if (boss.y >= targetY) boss.entering = false;
    return;
  }
  const k = boss.kind;
  if (k === "ceifador") {
    if (boss.dashing) {
      boss.x += (boss.dashTo - boss.x) * 6 * dt;
      boss.dashing = (Math.abs(boss.dashTo - boss.x) > 8);
    } else {
      boss.x = W / 2 + Math.sin(boss.t * 1.1) * (W / 2 - 60);
      boss.dashT -= dt;
      if (boss.dashT <= 0 && player.alive) {
        boss.dashing = true;
        boss.dashTo = clamp(player.x, 60, W - 60);
        boss.dashT = 4;
      }
    }
    boss.y = targetY + Math.sin(boss.t * 2.2) * 16;
    boss.fireTimer -= dt;
    if (boss.fireTimer > 0 && boss.fireTimer < 0.5 && !boss.avisou) {
      boss.avisou = true;
      avisarAtaque(boss.x, boss.y + boss.r, "linha", boss.fireTimer + 0.1);
    }
    if (boss.fireTimer <= 0 && bossCanFire()) {
      boss.avisou = false;
      for (let s2 = -1; s2 <= 1; s2++) enemyShootAt(boss.x + s2 * 18, boss.y + 28, 250 + S.fase * 1.2, 0.1 + Math.abs(s2) * 0.12);
      boss.fireTimer = 1.5;
    }
    boss.sweepT -= dt;
    if (boss.sweepT <= 0 && bossCanFire()) {
      for (let s2 = 0; s2 < 9; s2++) {
        const ang = Math.PI * 0.25 + (s2 / 8) * Math.PI * 0.5;
        enemyBullets.push({ x: boss.x, y: boss.y + 20, vx: Math.cos(ang) * 190, vy: Math.sin(ang) * 190, r: 5 });
      }
      boss.sweepT = 5;
    }
  } else if (k === "colosso") {
    boss.x = W / 2 + Math.sin(boss.t * 0.5) * Math.min(70, W * 0.12);
    boss.y = targetY;
    for (const p of boss.pods) {
      p.fireT -= dt;
      if (p.fireT <= 0 && bossCanFire()) {
        enemyShootAt(boss.x + p.dx, boss.y + 30, 240 + S.fase, 0.05);
        p.fireT = 1.7;
      }
    }
    boss.colT -= dt;
    if (boss.colT <= 0 && bossCanFire()) {
      for (let c2 = 0; c2 < 3; c2++) {
        const lx = rand(30, W - 30);
        enemyBullets.push({ x: lx, y: boss.y + 20, vx: 0, vy: 230, r: 6 });
        enemyBullets.push({ x: lx, y: boss.y - 10, vx: 0, vy: 230, r: 6 });
      }
      boss.colT = boss.pods.length ? 2.1 : 1.3;
    }
  } else if (k === "serpente") {
    boss.x = W / 2 + Math.sin(boss.t * 0.9) * (W / 2 - 50);
    boss.y = targetY + 20 + Math.sin(boss.t * 1.7) * 74;
    boss.trail.unshift({ x: boss.x, y: boss.y });
    if (boss.trail.length > boss.segs * 7 + 8) boss.trail.pop();
    boss.fireTimer -= dt;
    if (boss.fireTimer > 0 && boss.fireTimer < 0.5 && !boss.avisou) {
      boss.avisou = true;
      avisarAtaque(boss.x, boss.y + boss.r, "linha", boss.fireTimer + 0.1);
    }
    if (boss.fireTimer <= 0 && bossCanFire()) {
      boss.avisou = false;
      enemyShootAt(boss.x, boss.y + 14, 260 + S.fase, 0.07);
      enemyShootAt(boss.x, boss.y + 14, 200 + S.fase, 0.3);
      boss.fireTimer = 1.25;
    }
  } else if (k === "enxame") {
    boss.x = W / 2 + Math.sin(boss.t * 0.7) * (W / 2 - boss.r - 20);
    boss.y = targetY + Math.sin(boss.t * 1.4) * 14;
    boss.spawnT -= dt;
    if (boss.spawnT <= 0 && bossCanAct() && enemies.length < 8) {
      const e = spawnEnemy("drone");
      e.x = boss.x; e.y = boss.y + 30;
      explosion(boss.x, boss.y + 30, "#C34DFF", 8, 120);
      boss.spawnT = 2.6;
    }
    boss.spiralT -= dt;
    if (boss.spiralT <= 0 && bossCanFire()) {
      boss.spiral += 0.55;
      enemyBullets.push({ x: boss.x, y: boss.y, vx: Math.cos(boss.spiral) * 165, vy: Math.sin(boss.spiral) * 165, r: 5 });
      enemyBullets.push({ x: boss.x, y: boss.y, vx: Math.cos(boss.spiral + Math.PI) * 165, vy: Math.sin(boss.spiral + Math.PI) * 165, r: 5 });
      boss.spiralT = 0.22;
    }
  } else if (k === "prisma") {
    boss.x = W / 2 + Math.sin(boss.t * 0.4) * Math.min(90, W * 0.16);
    boss.y = targetY;
    const bm = boss.beam;
    bm.t -= dt;
    if (bm.phase === "idle" && bm.t <= 0) {
      bm.phase = "tel";
      bm.t = 0.8;
      bm.ang = player.alive ? Math.atan2(player.y - boss.y, player.x - boss.x) : Math.PI / 2;
      AudioSys.beamWarn();
    } else if (bm.phase === "tel" && bm.t <= 0) {
      if (bossCanFire()) { bm.phase = "on"; bm.t = 0.65; AudioSys.ultFire(); }
      else { bm.phase = "idle"; bm.t = 1.4; }
    } else if (bm.phase === "on") {
      if (bm.t <= 0) { bm.phase = "idle"; bm.t = 1.6; }
      else if (player.alive && player.invuln <= 0 && player.invis <= 0) {
        // distância do jogador até o raio do laser
        const dx = player.x - boss.x, dy = player.y - boss.y;
        const proj2 = dx * Math.cos(bm.ang) + dy * Math.sin(bm.ang);
        if (proj2 > 0) {
          const px = boss.x + Math.cos(bm.ang) * proj2, py = boss.y + Math.sin(bm.ang) * proj2;
          if (dist2(player.x, player.y, px, py) < (14 + player.r - 4) * (14 + player.r - 4)) hitPlayer();
        }
      }
    }
    boss.cornerT -= dt;
    if (boss.cornerT <= 0 && bossCanFire()) {
      for (let c2 = 0; c2 < 3; c2++) {
        const va = boss.t * 0.9 + (c2 / 3) * TAU;
        enemyShootAt(boss.x + Math.cos(va) * boss.r, boss.y + Math.sin(va) * boss.r, 220 + S.fase, 0.25);
      }
      boss.cornerT = 2.2;
    }
  } else if (k === "olho") {
    const tl = boss.tele;
    tl.t -= dt;
    if (tl.phase === "vis") {
      boss.alpha = 1;
      boss.y = targetY + Math.sin(boss.t * 1.2) * 12;
      boss.orbT -= dt;
      if (boss.orbT <= 0 && bossCanFire()) {
        enemyBullets.push({ x: boss.x, y: boss.y, vx: 0, vy: 120, r: 7, homing: true, life: 4.2 });
        boss.orbT = 2.8;
      }
      if (tl.t <= 0) { tl.phase = "out"; tl.t = 0.35; }
    } else if (tl.phase === "out") {
      boss.alpha = Math.max(0, tl.t / 0.35);
      if (tl.t <= 0) {
        boss.x = rand(70, W - 70);
        boss.y = rand(110, H * 0.4);
        tl.phase = "in"; tl.t = 0.35;
      }
    } else if (tl.phase === "in") {
      boss.alpha = 1 - Math.max(0, tl.t / 0.35);
      if (tl.t <= 0) {
        tl.phase = "vis"; tl.t = 2.6;
        if (bossCanFire()) {
          for (let s2 = 0; s2 < 10; s2++) {
            const ang = (s2 / 10) * TAU;
            enemyBullets.push({ x: boss.x, y: boss.y, vx: Math.cos(ang) * 155, vy: Math.sin(ang) * 155, r: 5 });
          }
        }
      }
    }
  }
  // contato com o jogador
  if (player.alive && player.invuln <= 0 && player.invis <= 0) {
    for (const z of bossZones()) {
      if (dist2(z.x, z.y, player.x, player.y) < (z.r + player.r - 6) * (z.r + player.r - 6)) { hitPlayer(); break; }
    }
  }
}

function bossDefeated() {
  if (!boss) return;
  arenaContar(true);
  const bonus = 500 + S.fase * 20;
  S.score += bonus;
  addText(boss.x, boss.y, "+" + bonus, "#FFC145");
  explosion(boss.x, boss.y, "#FF4D8F", 60, 340);
  explosion(boss.x, boss.y, "#FFC145", 40, 260);
  AudioSys.bigBoom();
  vibrate([80, 50, 120]);
  S.shake = 18;
  powerups.push({ x: boss.x - 24, y: boss.y, type: "gem", vy: 70, t: 0 });
  powerups.push({ x: boss.x, y: boss.y, type: "gem", vy: 70, t: 0.4 });
  powerups.push({ x: boss.x + 24, y: boss.y, type: "gem", vy: 70, t: 0.8 });
  boss = null;
  updateHud();
}

/* ---------- Tiros ---------- */
function bulletDmg() {
  const base = ST.dmg * (S.furyT > 0 ? 3 : 1);
  if (ST.critChance > 0 && Math.random() < ST.critChance) return { d: base * 2, crit: true };
  return { d: base, crit: false };
}
let serieTiro = 0;
function playerShoot() {
  contar("tiros");
  const x = player.x, y = player.y - player.r - 2;
  const vk = ST.balaVel || 1;          // Amuleto Certeiro: bala mais rápida
  const spd = -560 * vk;
  const style = ST.wStyle;
  const br = style === "plasma" ? 6 : style === "vulcan" ? 2.5 : style === "laser" ? 3 : 4;
  const mk = (bx, by, vx, vy) => bullets.push({
    x: bx, y: by, vx, vy, r: br, pierce: ST.pierce, style, serie: ++serieTiro });
  if (player.weapon === 1) mk(x, y, 0, spd);
  else if (player.weapon === 2) { mk(x - 9, y, 0, spd); mk(x + 9, y, 0, spd); }
  else { mk(x, y, 0, spd); mk(x - 10, y + 6, -110 * vk, spd); mk(x + 10, y + 6, 110 * vk, spd); }
  if (ST.sideShot) { mk(x - 12, y + 10, -300 * vk, spd * 0.75); mk(x + 12, y + 10, 300 * vk, spd * 0.75); }
  // Amuleto do Eco: às vezes sai um tiro de brinde
  if (ST.ecoChance > 0 && Math.random() < ST.ecoChance) mk(x + rand(-8, 8), y + 8, rand(-40, 40), spd);
  // Espelho Astral: a cópia fantasma repete o disparo com metade do dano
  if (ST.espelho) {
    const ex = W - player.x;
    bullets.push({ x: ex, y, vx: 0, vy: spd, r: br, pierce: ST.pierce, style, fix: 0.5, aliado: "#C34DFF" });
  }
  AudioSys.shoot();
}
function launchMissile() {
  missilesArr.push({ x: player.x, y: player.y - 10, vx: rand(-60, 60), vy: -240, t: 3, r: 5 });
}
function enemyShootAt(sx, sy, speed, spread) {
  if (!player.alive || player.invis > 0) return;
  const A = adapt();
  // prevê para onde o jogador está indo (quanto mais ágil ele for, melhor a mira)
  const dt2 = Math.min(0.85, Math.hypot(player.x - sx, player.y - sy) / Math.max(60, speed));
  const alvoX = player.x + (player.tx - player.x) * A.previsao * dt2 * 3.2;
  const alvoY = player.y + (player.ty - player.y) * A.previsao * dt2 * 3.2;
  let ang = Math.atan2(alvoY - sy, alvoX - sx);
  if (spread) ang += rand(-spread, spread) * (1 - A.previsao * 0.4);
  const D = dificuldadeAtual();
  enemyBullets.push({
    x: sx, y: sy,
    vx: Math.cos(ang) * speed * (1 + (A.tiro - 1) * 0.5) * D.vel,
    vy: Math.sin(ang) * speed * (1 + (A.tiro - 1) * 0.5) * D.vel,
    r: 5, dano: A.dano * D.tiro
  });
}

/* ---------- Drops ---------- */
function gemValue() { return Math.max(1, Math.round(1 + S.fase * 0.2)); }
function maybeDrop(x, y) {
  const roll = Math.random();
  const m = ST.dropMult;
  if (roll < 0.22) { powerups.push({ x, y, type: "gem", vy: 80, t: 0 }); return; }
  const r2 = Math.random();
  let type = null;
  if (r2 < 0.05 * m) type = "weapon";
  else if (r2 < 0.085 * m) type = "shield";
  else if (r2 < 0.10 * m && player.lives < ST.maxLives) type = "life";
  if (type) powerups.push({ x, y, type, vy: 70, t: 0 });
}
function applyPowerup(p) {
  if (p.type === "gem") {
    // Amuleto da Avareza: de vez em quando o cristal vale o dobro
    const dobro = (ST.avareza || 0) > 0 && Math.random() < ST.avareza;
    const v = gemValue() * (dobro ? 2 : 1);
    S.runGems += v;
    if (dobro) addText(p.x, p.y - 16, "EM DOBRO!", "#FFC145");
    AudioSys.gem();
    addText(p.x, p.y, "◆" + v, "#FFC145");
    updateHud();
    return;
  }
  AudioSys.power();
  vibrate(30);
  if (p.type === "weapon") {
    if (player.weapon < 3) { player.weapon++; addText(p.x, p.y, "ARMA +", "#4DE8FF"); }
    else { S.score += 150; addText(p.x, p.y, "+150", "#4DE8FF"); }
  } else if (p.type === "shield") {
    player.shield = ST.shieldDur;
    addText(p.x, p.y, "ESCUDO!", "#FFC145");
  } else if (p.type === "life") {
    player.lives = Math.min(ST.maxLives, player.lives + 1);
    addText(p.x, p.y, "VIDA +1", "#FF4D8F");
  }
  updateHud();
}

/* ---------- Efeitos ---------- */
function addText(x, y, str, color) { texts.push({ x, y, str, color, t: 1 }); }
const TETO_PART = () => Q.nivel >= 2 ? 420 : Q.nivel === 1 ? 240 : 130;
function explosion(x, y, color, n, force) {
  n = Math.max(1, Math.round(n * qParticulas()));
  // teto: as mais velhas saem para as novas entrarem, sem estourar a conta
  const sobra = particles.length + n - TETO_PART();
  if (sobra > 0) particles.splice(0, sobra);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, s2 = rand(40, force || 220);
    particles.push({ x, y, vx: Math.cos(a) * s2, vy: Math.sin(a) * s2, t: rand(0.3, 0.8), max: 0.8, color, r: rand(1.5, 4) });
  }
}
/* =====================================================================
   GRADE DE VIZINHANÇA — a segunda conta que trava celular fraco
   ---------------------------------------------------------------------
   Sem ela, cada tiro precisa ser comparado com CADA inimigo. Com 300
   tiros e 140 inimigos na tela são 42 mil contas por quadro, 60 vezes
   por segundo. A grade parte a arena em quadrados e anota quem está em
   cada um; o tiro só olha o quadrado onde ele está e os vizinhos, o que
   derruba isso para umas poucas dezenas de contas. O resultado do jogo
   é exatamente o mesmo — só o caminho até ele ficou curto.
   ===================================================================== */
const GRADE_LADO = 96;
let gradeCols = 0, gradeLins = 0;
let gradeCel = [];
let gradeValida = false;

function gradeMontar() {
  gradeCols = Math.max(1, Math.ceil(W / GRADE_LADO));
  gradeLins = Math.max(1, Math.ceil(H / GRADE_LADO));
  const n = gradeCols * gradeLins;
  if (gradeCel.length !== n) {
    gradeCel = new Array(n);
    for (let i = 0; i < n; i++) gradeCel[i] = [];
  } else {
    for (let i = 0; i < n; i++) gradeCel[i].length = 0;
  }
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    if (!e) continue;
    let cx = (e.x / GRADE_LADO) | 0, cy = (e.y / GRADE_LADO) | 0;
    if (cx < 0) cx = 0; else if (cx >= gradeCols) cx = gradeCols - 1;
    if (cy < 0) cy = 0; else if (cy >= gradeLins) cy = gradeLins - 1;
    gradeCel[cy * gradeCols + cx].push(e);
  }
  gradeValida = true;
}
/* Devolve o primeiro inimigo que encosta em (x,y) com esse raio, ou null.
   Se a grade estiver velha (alguém morreu), cai na busca simples: assim
   nunca erra, no pior caso só fica igual ao que era antes.              */
function inimigoEm(x, y, raio) {
  if (!gradeValida || !enemies.length) {
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      if (!e) continue;
      const rr = raio + e.r;
      if (dist2(x, y, e.x, e.y) < rr * rr) return e;
    }
    return null;
  }
  const alcance = raio + 40;                    // o maior inimigo tem raio ~50
  let c0 = ((x - alcance) / GRADE_LADO) | 0, c1 = ((x + alcance) / GRADE_LADO) | 0;
  let l0 = ((y - alcance) / GRADE_LADO) | 0, l1 = ((y + alcance) / GRADE_LADO) | 0;
  if (c0 < 0) c0 = 0; if (c1 >= gradeCols) c1 = gradeCols - 1;
  if (l0 < 0) l0 = 0; if (l1 >= gradeLins) l1 = gradeLins - 1;
  for (let l = l0; l <= l1; l++) {
    const base = l * gradeCols;
    for (let c = c0; c <= c1; c++) {
      const cel = gradeCel[base + c];
      for (let k = 0; k < cel.length; k++) {
        const e = cel[k];
        const rr = raio + e.r;
        if (dist2(x, y, e.x, e.y) < rr * rr) return e;
      }
    }
  }
  return null;
}

function damageEnemy(e, idx, dmg, crit) {
  // o índice pode ter mudado desde que quem chamou o pegou: confere
  if (enemies[idx] !== e) {
    idx = enemies.indexOf(e);
    if (idx < 0) return false;                  // já foi destruído
  }
  e.hp -= dmg;
  e.hitFlash = 0.08;
  AudioSys.hit();
  if (crit) addText(e.x, e.y - 14, "CRÍTICO!", "#FFC145");
  if (e.hp <= 0) {
    killEnemy(e);
    enemies.splice(idx, 1);
    gradeValida = false;      // a grade envelheceu; ela é refeita no quadro seguinte
    return true;
  }
  return false;
}
/* pedaços que sobram quando uma nave quebra */
function destrocos(x, y, cor, quantos) {
  const n = (typeof Q !== "undefined" && Q.nivel === 0) ? Math.ceil(quantos / 3) : quantos;
  for (let i = 0; i < n; i++) {
    particles.push({
      x: x, y: y,
      vx: rand(-150, 150), vy: rand(-170, 60),
      t: 0.75, max: 0.75, color: cor, r: rand(2, 5), pedaco: true,
      giro: rand(-8, 8), ang: rand(0, 6.28)
    });
  }
}
function killEnemy(e) {
  contar("abates");
  destrocos(e.x, e.y, e.type === "tank" ? "#FFC145" : "#FF7AA8", e.type === "tank" ? 10 : 6);
  somDoInimigo(e);
  comboMais();
  misProgresso("matar", 1);
  if (e.type === "tank") misProgresso("tanque", 1);
  S.score += Math.round(e.score * mundoMult("pontos") * comboMult());
  arenaContar(false);
  mpAvisarAbate(e);
  explosion(e.x, e.y, e.type === "tank" ? "#FFC145" : "#FF4D8F", e.type === "tank" ? 26 : 14);
  AudioSys.explode();
  S.shake = Math.max(S.shake, e.type === "tank" ? 6 : 3);
  maybeDrop(e.x, e.y);
  addText(e.x, e.y, "+" + e.score, "#EAF2FF");
  addUlt(e.type === "tank" ? 0.1 : 0.06);
  if (ST.vamp > 0 && player.alive && player.lives < ST.maxLives && Math.random() < ST.vamp) {
    player.lives++;
    addText(player.x, player.y - 30, "+1 VIDA", "#FF4D8F");
    AudioSys.power();
  }
  updateHud();
}
/* cada inimigo cai com um som diferente: dá para reconhecer sem olhar */
function somDoInimigo(e) {
  try {
    const t = e && e.type;
    if (t === "tank") { AudioSys.tone(90, 0.34, "sawtooth", 0.18, 40); AudioSys.noise(0.3, 0.3, 480); }
    else if (t === "zig") AudioSys.tone(520, 0.11, "triangle", 0.1, 180);
    else if (t === "shooter") AudioSys.tone(330, 0.13, "square", 0.1, 120);
    else AudioSys.tone(240, 0.1, "square", 0.09, 90);
  } catch (er) {}
}
/* os pedaços caem e giram; as faíscas normais seguem como antes */
function pedacosPassar(dt) {
  for (const p of particles) {
    if (!p.pedaco) continue;
    p.vy += 420 * dt;
    p.ang = (p.ang || 0) + (p.giro || 0) * dt;
  }
}
function blastArea(x, y, radius, dmg) {
  explosion(x, y, "#FF9E4D", 8, 140);
  for (let j = enemies.length - 1; j >= 0; j--) {
    const e = enemies[j];
    if (dist2(x, y, e.x, e.y) < radius * radius) {
      if (ST.frost > 0) e.slowT = 2;
      damageEnemy(e, j, dmg, false);
    }
  }
}
function novaBlast() {
  enemyBullets.length = 0;
  blastArea(player.x, player.y, 180, 3 * ST.dmg);
  explosion(player.x, player.y, "#C34DFF", 34, 300);
  addText(player.x, player.y - 40, "NOVA DE CHOQUE", "#C34DFF");
}
/* toca um "tec" no momento em que uma habilidade sai da recarga, para
   você jogar olhando a tela e não os botões */
let habProntasAntes = -1;
function habProntaConferir() {
  try {
    if (S.mode !== "playing") return;
    const bar = document.getElementById("hab-bar");
    if (!bar) return;
    const n = bar.querySelectorAll(".hab-btn.pronta").length;
    if (habProntasAntes >= 0 && n > habProntasAntes) AudioSys.habPronta();
    habProntasAntes = n;
  } catch (e) {}
}
/* meio segundo de câmera lenta: usado quando o chefe cai e quando você
   escapa por um triz. Reaproveita o S.lentoT que a Ampulheta já usava. */
function camLenta(seg) {
  S.lentoT = Math.max(S.lentoT || 0, seg);
}
function hitPlayer() {
  if (player.invuln > 0 || !player.alive || player.invis > 0) return;
  if (save.godMode) { player.invuln = 0.3; return; }
  S.danoLevado = (S.danoLevado || 0) + 1;
  S.doeuT = 0.45;
  /* regra VIDRO: um toque e acabou */
  if (regraAtiva("fragil")) { player.lives = 1; player.hp = 1; }
  S.shake = Math.max(S.shake || 0, 9);
  comboZera();
  if (ST.nova) novaBlast();
  if (player.shield > 0) {
    player.shield = 0;
    player.noShieldTime = 0;
    player.invuln = 1.2;
    explosion(player.x, player.y, "#FFC145", 18);
    AudioSys.hit();
    vibrate(40);
    addText(player.x, player.y - 30, "ESCUDO QUEBROU", "#FFC145");
    return;
  }
  // o dano tira vida da nave; ao zerar, perde um coração
  const dano = (55 + S.fase * 1.5) * clamp(1 + (LEITURA.geral || 0) * 0.3, 1, 1.3);
  if (!isFinite(player.hp)) player.hp = ST.maxHp;   // segurança
  player.hp -= dano;
  addText(player.x, player.y - 26, "-" + Math.round(dano), "#FF5252");
  if (player.hp > 0) {
    player.invuln = ST.invulnDur * 0.55;
    AudioSys.hit();
    vibrate(35);
    S.shake = Math.max(S.shake || 0, 9);
    explosion(player.x, player.y, shipColor(save.ship), 12);
    updateHud();
    return;
  }
  player.hp = ST.maxHp;
  player.lives--;
  // Ampulheta Rachada: perdeu uma vida -> o tempo desacelera e a tela limpa
  if (ST.ampulha) {
    S.lentoT = 3;
    limparTiros("TEMPO RACHADO");
    addText(player.x, player.y - 46, "AMPULHETA", "#C34DFF");
  }
  updateHud();
  AudioSys.hurt();
  vibrate([60, 40, 60]);
  S.shake = 12;
  explosion(player.x, player.y, shipColor(save.ship), 30);
  if (player.lives <= 0 && MP.sala && MP.modo === "pvp") {
    player.alive = false;
    player.hp = 0;
    updateHud();
    mpChecarFimDuelo();
    return;
  }
  if (player.lives <= 0) {
    if (player.revivesUsed < ST.revive) {
      player.revivesUsed++;
      player.lives = 1;
      player.invuln = 3;
      enemyBullets.length = 0;
      addText(player.x, player.y - 40, "SISTEMA DE EMERGÊNCIA", "#FFC145");
      AudioSys.power();
      updateHud();
      return;
    }
    player.alive = false;
    player.deadTimer = 1.6;
    AudioSys.bigBoom();
    explosion(player.x, player.y, shipColor(save.ship), 60, 320);
    explosion(player.x, player.y, "#FF4D8F", 30, 200);
  } else {
    player.invuln = ST.invulnDur;
    player.weapon = Math.max(1, player.weapon - 1);
  }
}

/* ---------- Recompensas ---------- */
function bankRunGems(mult) {
  const gained = Math.round(S.runGems * ST.crystalMult * (mult === undefined ? 1 : mult));
  save.crystals += gained;
  S.runGems = 0;
  if (S.score > save.hi) save.hi = S.score;
  persist();
  return gained;
}
function faseVictory() {
  S.mode = "victory";
  try { Musica.parar(); } catch (e) {}
  const coop = typeof MP !== "undefined" && MP && MP.modo === "coop";
  /* jornada em dupla: o progresso é daquela amizade, não do jogo todo */
  const jor = coop ? jornadaAtual() : null;
  const first = jor ? (S.fase >= (jor.maior || 1))
              : coop ? (S.fase > (save.coopBest || 0)) : (S.fase > save.best);
  if (first) {
    if (jor) {
      jor.maior = Math.max(jor.maior || 1, Math.min(TOTAL_FASES, S.fase + 1));
      jor.fase = Math.min(TOTAL_FASES, S.fase + 1);
      jor.quando = Date.now();
      save.coopBest = Math.max(save.coopBest || 0, S.fase);
    } else if (coop) { save.coopBest = S.fase; }
    else { save.best = S.fase; save.pts++; }
  } else if (jor) {
    jor.fase = Math.min(TOTAL_FASES, Math.max(jor.fase || 1, S.fase + 1));
  }
  // melhor tempo da fase
  const dur = S.inicioFase ? (Date.now() - S.inicioFase) / 1000 : 0;
  if (dur > 3) {
    save.tempos = save.tempos || {};
    const antes = save.tempos[S.fase];
    if (!antes || dur < antes) save.tempos[S.fase] = Math.round(dur * 10) / 10;
  }
  const base = Math.round(faseReward(S.fase) * (first ? 1 : 0.3) * ST.crystalMult *
                          dificuldadeAtual().premio * regraPremio());
  const gems = bankRunGems(1);
  const scoreBonus = Math.floor(S.score / 100);
  save.crystals += base + scoreBonus;
  let amuletMsg = null;
  if (isBossFase(S.fase) && first) {
    const a = rollAmulet();
    const d = amuletDef(a);
    amuletMsg = "◈ AMULETO ENCONTRADO: " + d.name + " (" + RARS[a.rar].name + ")";
  }
  camLenta(0.8);
  if (S.bossRush && bossRushProximo()) return;
  S.derrotasSeguidas = 0;
  misProgresso("fase", 1);
  if (isBossFase(S.fase)) { misProgresso("chefe", 1); contar("chefes"); }
  if (coop) { misProgresso("amigo", 1); contar("coopFases"); }
  if (!S.danoLevado) contar("fasesPerfeitas");
  if ((S.comboMax || 0) > (save.melhorCombo || 0)) save.melhorCombo = S.comboMax;
  estrelasDaFase(S.fase, dur, S.danoLevado === 0);
  persist();
  AudioSys.victory();
  vibrate([40, 60, 40, 60, 120]);
  if ((S.comboMax || 0) > 0) misProgresso("combo", S.comboMax);
  vitoriaEstrelas();
  try {
    vitoriaResumo({
      segundos: dur, combo: S.comboMax || 0, dano: S.danoLevado || 0,
      tiros: save.tiros || 0, acertos: save.acertos || 0
    });
  } catch (e) {}
  $("vic-title").textContent = "FASE " + S.fase + " CONCLUÍDA";
  $("vic-fase").textContent = S.fase + "/" + totalFasesDoModo();
  $("vic-score").textContent = S.score;
  $("vic-gems").textContent = "+" + fmt(base + gems + scoreBonus) + " cristais";
  $("vic-skill").style.display = first ? "block" : "none";
  const va = $("vic-amulet");
  if (amuletMsg) { va.textContent = amuletMsg; va.style.display = "block"; }
  else va.style.display = "none";
  $("btn-next").style.display = S.fase >= totalFasesDoModo() ? "none" : "inline-block";
  showScreen("victory");
  nuvemEnviar(true);
}
function gameOver() {
  contar("mortes");
  S.derrotasSeguidas = (S.faseDaDerrota === S.fase ? (S.derrotasSeguidas || 0) : 0) + 1;
  S.faseDaDerrota = S.fase;
  setTimeout(() => { try { pularRender(); } catch (e) {} }, 60);
  if (MP.sala && MP.modo === "pvp" && !MP.fim) {
    MP.fim = "derrota";
    finalizarDuelo("derrota", mpOutroPrincipal() || { nome: "Adversário", rank: 0 });
    return;
  }
  S.mode = "gameover";
  try { Musica.parar(); } catch (e) {}
  if (arenaModo()) arenaSalvarPlacar(true);
  const isRecord = S.score > save.hi && S.score > 0;
  const gems = bankRunGems(temPasse("veterano") ? 1 : 0.5);
  $("go-score").textContent = S.score;
  $("go-fase").textContent = S.fase;
  $("go-gems").textContent = "+" + fmt(gems) + " cristais recuperados";
  $("go-record").style.display = isRecord ? "block" : "none";
  showScreen("over");
  nuvemEnviar(false);
}
