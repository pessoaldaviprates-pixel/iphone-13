
"use strict";
/* quanto o mundo acelera ou segura o jogo (travessuras do administrador) */
function mundoRitmo() {
  let k = 1;
  if (mundoAtivo("turbo")) k *= 1.75;
  if (mundoAtivo("lesma")) k *= 0.55;
  return k;
}
function mundoSinalControle() { return mundoAtivo("invertido") ? -1 : 1; }

/* ---------- Atualização ---------- */
function update(dt) {
  /* regra TURBO: o relógio do jogo inteiro corre mais rápido */
  if (S.mode === "playing" && regraAtiva("turbo")) dt *= 1.4;
  // Ampulheta Rachada: enquanto o efeito dura, tudo anda em camera lenta
  if (S.mode === "playing" && (S.lentoT || 0) > 0) {
    S.lentoT = Math.max(0, S.lentoT - dt);
    dt *= 0.45;
  }
  S.time += dt;

  for (const st of stars) {
    st.y += (30 + st.z * 120) * dt * (S.mode === "playing" ? 1 : 0.4);
    if (st.y > H + 2) { st.y = -2; st.x = Math.random() * W; }
  }

  if (S.mode !== "playing") return;

  comboPassar(dt);
  tutoPassar(dt);
  avisosPassar(dt);
  pedacosPassar(dt);
  asteroidesPassar(dt);
  perseguicaoPassar(dt);
  resgatePassar(dt);
  treinoPassar(dt);
  inimigosDesviar(dt);
  lanternaSeguir();
  reconConferir();
  musicaTensao();
  reviverPassar(dt);
  if ((S.pingT = (S.pingT || 0) + dt) > 0.5) { S.pingT = 0; pingRender(); }
  portalPassar(dt);
  secretaPassar(dt);
  if (regraAtiva("gravidade") && player.alive) {
    player.ty = Math.min(limiteBaixo(), player.ty + 42 * dt);
  }
  if (S.doeuT > 0) {
    S.doeuT = Math.max(0, S.doeuT - dt);
    const d = $("doeu");
    if (d) d.style.opacity = (S.doeuT / 0.45) * 0.55;
  }
  habProntaConferir();
  save.tempoJogado = (save.tempoJogado || 0) + dt;

  if (S.banner) { S.banner.t -= dt; if (S.banner.t <= 0) S.banner = null; }
  if (S.shake > 0) S.shake = Math.max(0, S.shake - dt * 30);
  if (S.furyT > 0) S.furyT -= dt;
  if (S.hiveT > 0) S.hiveT -= dt;
  if (S.vulcanT > 0) S.vulcanT -= dt;
  if (S.turboT > 0) S.turboT -= dt;
  if (S.superNova > 0) S.superNova -= dt;
  if (S.chuvaFogo > 0) {
    S.chuvaFogo -= dt;
    S.chuvaT = (S.chuvaT || 0) - dt;
    if (S.chuvaT <= 0) {
      S.chuvaT = 0.12;
      bombas.push({ x: rand(20, W - 20), y: -10, vy: 260, t: 0, queda: true, raio: 70 });
    }
  }
  /* chuva marrom do Trono Real */
  if (S.chuvaCoco > 0) {
    S.chuvaCoco -= dt;
    S.cocoT = (S.cocoT || 0) - dt;
    if (S.cocoT <= 0) {
      S.cocoT = 0.14;
      bombas.push({ x: rand(20, W - 20), y: -10, vy: 240, t: 0, queda: true,
                    raio: S.cocoRaio || 66, coco: true });
    }
  }

  /* recargas das habilidades */
  let mudouCd = false;
  for (const k in habCd) {
    if (habCd[k] > 0) {
      habCd[k] = Math.max(0, habCd[k] - dt);
      mudouCd = true;
    }
  }
  if (mudouCd && Math.floor(S.time * 4) !== S.ultimoCdTick) {
    S.ultimoCdTick = Math.floor(S.time * 4);
    renderHabBar();
  }

  /* bombas */
  for (let i = bombas.length - 1; i >= 0; i--) {
    const b = bombas[i];
    if (b.queda) {
      b.y += b.vy * dt;
      if (b.y > H - 40 || enemies.some(e => dist2(b.x, b.y, e.x, e.y) < 900)) {
        danoEmArea(b.x, b.y, b.raio, 4 * ST.dmg, b.coco ? "#C08B45" : "#FF9E4D");
        AudioSys.explode();
        bombas.splice(i, 1);
      } else if (b.y > H + 20) { bombas.splice(i, 1); }
    } else {
      b.t -= dt;
      b.y += b.vy * dt;
      b.vy += 40 * dt;
      particles.push({ x: b.x, y: b.y, vx: 0, vy: 30, t: 0.2, max: 0.2,
                       color: b.coco ? "#8C6239" : "#FF9E4D", r: 2 });
      if (b.t <= 0) {
        danoEmArea(b.x, b.y, b.raio, 5 * ST.dmg, b.coco ? "#C08B45" : "#FF9E4D");
        AudioSys.explode();
        S.shake = Math.max(S.shake, 7);
        bombas.splice(i, 1);
      }
    }
  }

  /* buracos negros: puxam, ferem e, ao se tocarem, viram Super Nova */
  for (let i = buracos.length - 1; i >= 0; i--) {
    const bn = buracos[i];
    bn.t -= dt;
    bn.pulso += dt;
    if (bn.t <= 0) { buracos.splice(i, 1); continue; }
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      const d2 = dist2(bn.x, bn.y, e.x, e.y);
      if (d2 < 240 * 240) {
        const ang = Math.atan2(bn.y - e.y, bn.x - e.x);
        const forca = 300 * (1 - Math.sqrt(d2) / 240);
        e.x += Math.cos(ang) * forca * dt;
        e.y += Math.sin(ang) * forca * dt;
        if (d2 < bn.r * bn.r) damageEnemy(e, j, 6 * ST.dmg * dt, false);
      }
    }
    for (let k = enemyBullets.length - 1; k >= 0; k--) {
      const eb = enemyBullets[k];
      if (dist2(bn.x, bn.y, eb.x, eb.y) < bn.r * bn.r) enemyBullets.splice(k, 1);
    }
    if (boss && !boss.entering && dist2(bn.x, bn.y, boss.x, boss.y) < (bn.r + boss.r) * (bn.r + boss.r)) {
      const zs = bossZones();
      if (zs.length) damageBossZone(zs[zs.length - 1], 5 * ST.dmg * dt);
    }
    if (Math.random() < 0.7) {
      const a = Math.random() * TAU;
      particles.push({ x: bn.x + Math.cos(a) * 70, y: bn.y + Math.sin(a) * 70,
                       vx: -Math.cos(a) * 190, vy: -Math.sin(a) * 190,
                       t: 0.4, max: 0.4, color: "#C34DFF", r: 2.5 });
    }
  }
  // colisão entre dois buracos negros
  if (buracos.length >= 2) {
    let colidiu = null;
    for (let a = 0; a < buracos.length && !colidiu; a++) {
      for (let b2 = a + 1; b2 < buracos.length; b2++) {
        const A = buracos[a], B = buracos[b2];
        const lim = A.r + B.r + 26;
        if (dist2(A.x, A.y, B.x, B.y) < lim * lim) {
          colidiu = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
          break;
        }
        // eles se atraem, então acabam se encontrando
        const ang = Math.atan2(B.y - A.y, B.x - A.x);
        A.x += Math.cos(ang) * 55 * dt; A.y += Math.sin(ang) * 55 * dt;
        B.x -= Math.cos(ang) * 55 * dt; B.y -= Math.sin(ang) * 55 * dt;
      }
    }
    if (colidiu) superNova(colidiu.x, colidiu.y);
  }

  /* poças de napalm (e a névoa ácida do chefe, que é ao contrário) */
  for (let i = fogo.length - 1; i >= 0; i--) {
    const f = fogo[i];
    f.t -= dt;
    if (f.t <= 0) { fogo.splice(i, 1); continue; }
    if (f.acida) {
      // névoa do chefe: deixa VOCÊ lento enquanto estiver dentro dela
      if (player.alive && dist2(f.x, f.y, player.x, player.y) < f.r * f.r) {
        S.lentoT = Math.max(S.lentoT || 0, 0.35);
      }
      continue;
    }
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      if (dist2(f.x, f.y, e.x, e.y) < f.r * f.r) damageEnemy(e, j, 5 * ST.dmg * dt, false);
    }
    if (Math.random() < 0.5) {
      particles.push({ x: f.x + rand(-f.r, f.r), y: f.y + rand(-f.r * 0.5, f.r * 0.5),
                       vx: rand(-10, 10), vy: rand(-70, -30),
                       t: 0.5, max: 0.5, color: Math.random() < 0.5 ? "#FF7B4D" : "#FFC145", r: 3 });
    }
  }

  /* voo rasante */
  if (rasante) {
    rasante.t -= dt;
    rasante.x += rasante.dir * 900 * dt;
    danoEmArea(rasante.x, rasante.y, 70 * (rasante.forca || 1),
               9 * ST.dmg * dt * 10 * (rasante.forca || 1), "#FF7B4D");
    for (let k = 0; k < 2; k++) {
      particles.push({ x: rasante.x, y: rasante.y + rand(-14, 14),
                       vx: -rasante.dir * 200, vy: rand(-30, 30),
                       t: 0.35, max: 0.35, color: "#FFC145", r: 3 });
    }
    if (rasante.t <= 0 || rasante.x < -60 || rasante.x > W + 60) rasante = null;
  }

  /* rajada circular (ultimate Tempestade de Aço) */
  if (S.barrage) {
    S.barrage.timer -= dt;
    if (S.barrage.timer <= 0) {
      for (let k = 0; k < 24; k++) {
        const ang = (k / 24) * TAU + S.barrage.waves * 0.1;
        bullets.push({ x: player.x, y: player.y, vx: Math.cos(ang) * 430, vy: Math.sin(ang) * 430, r: 4, pierce: 0, style: ST.wStyle, fix: 1.2 });
      }
      S.barrage.waves--;
      S.barrage.timer = 0.16;
      if (S.barrage.waves <= 0) S.barrage = null;
    }
  }

  /* singularidade (ultimate Magnética) */
  if (S.singu) {
    S.singu.t -= dt;
    for (const e of enemies) {
      const ang = Math.atan2(S.singu.y - e.y, S.singu.x - e.x);
      e.x += Math.cos(ang) * 240 * dt;
      e.y += Math.sin(ang) * 240 * dt;
    }
    if (Math.random() < 0.6) {
      const a = Math.random() * TAU;
      particles.push({ x: S.singu.x + Math.cos(a) * 60, y: S.singu.y + Math.sin(a) * 60, vx: -Math.cos(a) * 120, vy: -Math.sin(a) * 120, t: 0.4, max: 0.4, color: "#C34DFF", r: 2.5 });
    }
    if (S.singu.t <= 0) {
      blastArea(S.singu.x, S.singu.y, 200, 6 * ST.dmg);
      explosion(S.singu.x, S.singu.y, "#C34DFF", 50, 380);
      S.shake = 16;
      AudioSys.bigBoom();
      S.singu = null;
    }
  }

  /* --- travessuras do administrador --- */
  if (mundoAtivo("gravidade")) player.ty = Math.min(H - player.r, player.ty + 150 * dt);
  if (mundoAtivo("gelo")) {
    player.tx = clamp(player.tx + (player.tx - player.x) * 1.8 * dt * 6, player.r, W - player.r);
    player.ty = clamp(player.ty + (player.ty - player.y) * 1.8 * dt * 6, player.r, limiteBaixo());
  }
  efxAtualizar(dt);
  if (mundoAtivo("tremor")) S.shake = Math.max(S.shake, 5);

  /* ---------- APOCALIPSE ÔMEGA ----------
     Uma vez ligado, ele não para: um relógio próprio vai soltando o
     arsenal inteiro em rodízio, sem recarga e sem contar usos, até a
     fase terminar. Cada passo tem o seu próprio ritmo para a tela não
     virar um borrão só — mas nunca fica um segundo parado.              */
  if (S.apocalipse) {
    S.apocT = (S.apocT || 0) + dt;
    player.invuln = Math.max(player.invuln, 0.4);   // nada encosta em você
    if (S.apocT >= 0.55) {
      S.apocT = 0;
      const passo = (S.apocPasso = (S.apocPasso || 0) + 1);
      // 1) ogiva a cada ~2,2s: limpa a onda inteira sem parar
      if (passo % 4 === 0) ogivaNuclear(true);
      // 2) artilharia sempre
      pedirArtilharia(6);
      // 3) bombardeio aéreo em rodízio
      if (passo % 3 === 0) bombardeioAereo(3);
      // 4) canhão orbital quando o anterior acaba
      if (!laserOrbital) canhaoOrbital();
      // 5) mantém a tropa cheia até o fim da fase
      const tanques = aliados.filter(a => a && a.tipo === "tanque").length;
      const soldados = aliados.filter(a => a && a.tipo === "soldado").length;
      const helis = aliados.filter(a => a && a.tipo === "heli").length;
      if (tanques < 6) chamarTropa("tanque", 6 - tanques);
      if (soldados < 10) chamarTropa("soldado", 10 - soldados);
      if (helis < 2) chamarTropa("heli", 2 - helis);
      // 6) a cada volta, cura e limpa a tela
      if (passo % 8 === 0) {
        player.hp = ST.maxHp;
        player.lives = ST.maxLives;
        player.shield = Math.max(player.shield, ST.shieldDur);
        limparTiros("APOCALIPSE");
        updateHud();
      }
      S.shake = Math.max(S.shake, 6);
    }
  }

  /* --- jogador --- */
  if (player.alive) {
    const kSpd = 340 * dt;
    if (keys.ArrowLeft || keys.a) player.tx -= kSpd;
    if (keys.ArrowRight || keys.d) player.tx += kSpd;
    if (keys.ArrowUp || keys.w) player.ty -= kSpd;
    if (keys.ArrowDown || keys.s) player.ty += kSpd;
    player.tx = clamp(player.tx, player.r, W - player.r);
    player.ty = clamp(player.ty, player.r, limiteBaixo());

    const ease = 1 - Math.pow(0.0001, dt) * (S.turboT > 0 ? 0.2 : 1);
    const oldX = player.x;
    player.x += (player.tx - player.x) * ease;
    player.y += (player.ty - player.y) * ease;
    player.tilt = clamp((player.x - oldX) * 0.9, -0.45, 0.45);

    if (player.invuln > 0) player.invuln -= dt;
    if (player.invis > 0) player.invis -= dt;
    if (player.cloakCd > 0) player.cloakCd -= dt;
    if (player.shield > 0) {
      player.shield -= dt;
      if (player.shield <= 0) player.noShieldTime = 0;
    } else if (ST.nanobots) {
      player.noShieldTime += dt;
      if (player.noShieldTime >= 20) {
        player.shield = ST.shieldDur * 0.6;
        addText(player.x, player.y - 30, "NANOBOTS", "#FFC145");
        AudioSys.power();
      }
    }

    player.fireTimer -= dt;
    if (player.fireTimer <= 0) {
      playerShoot();
      player.fireTimer = ST.fireInterval * (player.weapon === 3 ? 0.9 : 1) *
        (S.furyT > 0 ? 0.5 : 1) * (S.vulcanT > 0 ? 0.34 : 1);
    }
    if (ST.missiles) {
      player.missileTimer -= dt;
      if (player.missileTimer <= 0 && (enemies.length > 0 || boss)) {
        launchMissile();
        player.missileTimer = 1.2;
      }
    }

    /* drones: o da nave Enxame + os 4 extras da ultimate Colmeia */
    const droneCount = (ST.droneDmg > 0 ? 1 : 0) + (S.hiveT > 0 ? 4 : 0) + (ST.dronesExtra || 0);
    S.dronePts = [];
    if (droneCount > 0) {
      for (let k = 0; k < droneCount; k++) {
        const dAng = S.time * 2.4 + (k / Math.max(1, droneCount)) * TAU;
        S.dronePts.push({ x: player.x + Math.cos(dAng) * 44, y: player.y + Math.sin(dAng) * 44 });
      }
      player.droneX = S.dronePts[0].x; player.droneY = S.dronePts[0].y;
      player.droneFire -= dt;
      if (player.droneFire <= 0) {
        const src = S.dronePts[Math.floor(Math.random() * S.dronePts.length)];
        let target = null, best = Infinity;
        for (const e of enemies) {
          const d = dist2(src.x, src.y, e.x, e.y);
          if (d < best) { best = d; target = e; }
        }
        if (boss && !boss.entering) {
          const d = dist2(src.x, src.y, boss.x, boss.y);
          if (d < best) { best = d; target = boss; }
        }
        if (target) {
          const ang = Math.atan2(target.y - src.y, target.x - src.x);
          const dmgMul = Math.max(ST.droneDmg, S.hiveT > 0 ? 0.9 : 0);
          bullets.push({ x: src.x, y: src.y, vx: Math.cos(ang) * 480, vy: Math.sin(ang) * 480, r: 3, pierce: 0, style: "vulcan", fix: dmgMul });
          AudioSys.shoot();
          player.droneFire = 0.55 / Math.max(1, droneCount * 0.7);
        }
      }
    } else {
      S.dronePts = [];
    }

    if (Math.random() < 0.5) {
      particles.push({
        x: player.x + rand(-4, 4), y: player.y + player.r,
        vx: rand(-15, 15), vy: rand(120, 200),
        t: 0.3, max: 0.3, color: shipGlowColor(save.ship), r: rand(1, 2.5)
      });
    }
  } else {
    player.deadTimer -= dt;
    if (player.deadTimer <= 0) { gameOver(); return; }
  }

  /* botão da capa (atualização visual limitada) */
  S.uiTick += dt;
  if (S.uiTick > 0.25) {
    S.uiTick = 0;
    if (ST.cloak) {
      const cd = player.cloakCd;
      cloakBtn.disabled = cd > 0;
      cloakBtn.classList.toggle("ready", cd <= 0 && player.invis <= 0);
      cloakBtn.textContent = player.invis > 0 ? "ATIVA" : (cd > 0 ? Math.ceil(cd) + "s" : "CAPA");
    }
  }

  /* --- spawns da onda --- */
  if (S.duelo) { S.toSpawn = 0; }
  if (S.waveState === "spawning" && !waveIsBoss() && !S.duelo) {
    S.spawnTimer -= dt;
    // teto de gente ao mesmo tempo: a onda continua enorme, mas eles entram
    // conforme os da frente caem — ninguem trava e a tela nao vira sopa
    const TETO = 130;
    if (S.spawnTimer <= 0 && S.toSpawn > 0 && enemies.length < TETO) {
      // com onda grande eles entram em grupinhos, senao a fila nao acabava
      const lote = Math.min(S.toSpawn, TETO - enemies.length,
                            S.toSpawn > 60 ? 3 : S.toSpawn > 30 ? 2 : 1);
      for (let k = 0; k < lote; k++) { spawnEnemy(); S.toSpawn--; }
      S.spawnTimer = S.spawnInterval;
    }
    if (S.toSpawn <= 0) S.waveState = "fighting";
  }
  /* Selo do Juízo: assim que a onda tem gente na tela, um raio derruba o
     inimigo mais gordo (o de mais vida) e some.                          */
  if (S.juizoPendente && enemies.length >= 3) {
    S.juizoPendente = false;
    let alvo = null, ai = -1;
    for (let i = 0; i < enemies.length; i++) {
      if (!alvo || (enemies[i].hp || 0) > (alvo.hp || 0)) { alvo = enemies[i]; ai = i; }
    }
    if (alvo) {
      raios.push({ x: alvo.x, t: 0.45 });
      explosion(alvo.x, alvo.y, "#FFC145", 40, 340);
      addText(alvo.x, alvo.y - 30, "JUÍZO", "#FFC145");
      damageEnemy(alvo, ai, 999999, true);
      AudioSys.bigBoom();
      S.shake = Math.max(S.shake, 10);
    }
  }
  if (!S.duelo && S.waveState !== "done" &&
      ((waveIsBoss() && !boss) ||
       (!waveIsBoss() && S.waveState === "fighting" && enemies.length === 0))) {
    S.waveState = "done";
    S.interTimer = temPasse("pressa") ? 0.7 : 1.4;
  }
  if (S.waveState === "done") {
    S.interTimer -= dt;
    if (S.interTimer <= 0) {
      // Kit de Reparo: entre uma onda e outra, o casco volta um pouco
      if ((ST.reparoOnda || 0) > 0 && player.alive && player.hp < ST.maxHp) {
        const cura = Math.round(ST.maxHp * ST.reparoOnda);
        player.hp = Math.min(ST.maxHp, player.hp + cura);
        addText(player.x, player.y - 34, "+" + cura + " CASCO", "#7CF7C0");
        updateHud();
      }
      if (arenaModo()) { arenaProximaOnda(); return; }
      if (S.waveIdx >= S.nWaves) { faseVictory(); return; }
      S.waveIdx++;
      setupWave();
    }
  }

  /* --- balas do jogador --- */
  gradeMontar();
  for (let i = bullets.length - 1; i >= 0; i--) {
    if (i >= bullets.length) { i = bullets.length; continue; }
    const b = bullets[i];
    if (!b) continue;
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.y < -20 || b.y > H + 20 || b.x < -20 || b.x > W + 20) { bullets.splice(i, 1); continue; }

    let consumed = false;
    const alvo = inimigoEm(b.x, b.y, b.r);
    if (alvo) {
      const dm = b.fix ? { d: ST.dmg * b.fix, crit: false } : bulletDmg();
      if (ST.frost > 0) alvo.slowT = 2;
      damageEnemy(alvo, enemies.indexOf(alvo), dm.d, dm.crit);
      if (ST.blast > 0) blastArea(b.x, b.y, ST.blast, dm.d * 0.5);
      particles.push({ x: b.x, y: b.y, vx: rand(-40, 40), vy: rand(-80, -20), t: 0.2, max: 0.2, color: "#EAF2FF", r: 2 });
      contar("acertos");
      if (b.pierce > 0) { b.pierce--; }
      else { bullets.splice(i, 1); consumed = true; }
    }
    if (consumed) continue;

    if (boss && !boss.entering) {
      for (const z of bossZones()) {
        if (dist2(b.x, b.y, z.x, z.y) < (b.r + z.r) * (b.r + z.r)) {
          const dm = b.fix ? { d: ST.dmg * b.fix, crit: false } : bulletDmg();
          if (dm.crit) addText(b.x, b.y - 14, "CRÍTICO!", "#FFC145");
          damageBossZone(z, dm.d);
          if (ST.blast > 0) blastArea(b.x, b.y, ST.blast, dm.d * 0.5);
          particles.push({ x: b.x, y: b.y, vx: rand(-40, 40), vy: rand(-80, -20), t: 0.2, max: 0.2, color: "#EAF2FF", r: 2 });
          bullets.splice(i, 1);
          break;
        }
      }
    }
  }

  /* --- mísseis teleguiados --- */
  for (let i = missilesArr.length - 1; i >= 0; i--) {
    const m = missilesArr[i];
    m.t -= dt;
    if (m.t <= 0) { missilesArr.splice(i, 1); continue; }
    let target = null, best = Infinity;
    for (const e of enemies) {
      const d = dist2(m.x, m.y, e.x, e.y);
      if (d < best) { best = d; target = e; }
    }
    if (boss && !boss.entering) {
      const d = dist2(m.x, m.y, boss.x, boss.y);
      if (d < best) { best = d; target = boss; }
    }
    if (target) {
      const ang = Math.atan2(target.y - m.y, target.x - m.x);
      const sp = 420;
      m.vx += (Math.cos(ang) * sp - m.vx) * 4 * dt;
      m.vy += (Math.sin(ang) * sp - m.vy) * 4 * dt;
    }
    m.x += m.vx * dt; m.y += m.vy * dt;
    particles.push({ x: m.x, y: m.y, vx: 0, vy: 40, t: 0.18, max: 0.18, color: "#FFC145", r: 1.8 });
    if (m.x < -30 || m.x > W + 30 || m.y < -30 || m.y > H + 30) { missilesArr.splice(i, 1); continue; }

    let hitSomething = false;
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      if (dist2(m.x, m.y, e.x, e.y) < (m.r + e.r) * (m.r + e.r)) {
        damageEnemy(e, j, 3 * ST.dmg, false);
        hitSomething = true;
        break;
      }
    }
    if (!hitSomething && boss && !boss.entering) {
      for (const z of bossZones()) {
        if (dist2(m.x, m.y, z.x, z.y) < (m.r + z.r) * (m.r + z.r)) {
          damageBossZone(z, 3 * ST.dmg);
          hitSomething = true;
          break;
        }
      }
    }
    if (hitSomething) {
      if (m.pesado) {
        danoEmArea(m.x, m.y, 130, 16 * ST.dmg, "#FFC145");
        AudioSys.bigBoom();
        S.shake = Math.max(S.shake, 12);
      } else {
        explosion(m.x, m.y, "#FFC145", 10, 160);
        AudioSys.hit();
      }
      missilesArr.splice(i, 1);
    }
  }

  /* --- inimigos --- */
  const dl = Math.min(dLevel(), 60);
  for (let i = enemies.length - 1; i >= 0; i--) {
    if (i >= enemies.length) { i = enemies.length; continue; }
    const e = enemies[i];
    if (!e) continue;
    e.t += dt;
    if (e.hitFlash > 0) e.hitFlash -= dt;
    if (e.slowT > 0) e.slowT -= dt;
    if (e.frozenT > 0) e.frozenT -= dt;
    const slowF = e.frozenT > 0 ? 0.1 : (e.slowT > 0 && ST.frost > 0 ? (1 - ST.frost) : 1);
    e.y += e.speed * slowF * dt;
    e.x += Math.sin(e.t * 2.2) * e.amp * slowF * dt;
    e.x = clamp(e.x, e.r, W - e.r);

    if (e.y > H + 50) { enemies.splice(i, 1); continue; }

    e.fireTimer -= dt;
    if (e.fireTimer <= 0 && e.y > 0 && e.y < H * 0.75 && e.frozenT <= 0 && player.invis <= 0) {
      const Ax = adapt();
      if (e.type === "striker") {
        enemyShootAt(e.x, e.y + e.r, 240 + dl * 3, 0.08);
        e.fireTimer = rand(1.4, 2.6) / Ax.tiro;
      } else if (e.type === "tank") {
        for (let k = -1; k <= 1; k++) {
          const ang = Math.PI / 2 + k * 0.3;
          enemyBullets.push({ x: e.x, y: e.y + e.r, vx: Math.cos(ang) * 170, vy: Math.sin(ang) * 170, r: 5.5 });
        }
        e.fireTimer = rand(2.2, 3.4) / Ax.tiro;
      } else {
        enemyShootAt(e.x, e.y + e.r, 190 + dl * 2.5, 0.35);
        e.fireTimer = rand(2, 4) / Ax.tiro;
      }
    }

    if (player.alive && player.invuln <= 0 &&
        dist2(e.x, e.y, player.x, player.y) < (e.r + player.r - 4) * (e.r + player.r - 4)) {
      killEnemy(e);
      enemies.splice(i, 1);
      // hitPlayer pode limpar listas inteiras (Nova de Choque, Emergência)
      if (player.invis <= 0) hitPlayer();
      else addText(player.x, player.y - 26, "ABATIDO!", "#C34DFF");
    }
  }

  /* --- chefe --- */
  updateBoss(dt);

  /* --- tiros dos outros pilotos ---
     Vale para TODO modo com gente junto. Cada tiro recebido vira um
     projétil local que voa sozinho, então ele aparece bonito mesmo com
     a rede devagar. O número de série impede criar o mesmo tiro duas
     vezes quando o mesmo pacote chega repetido.
     No duelo o tiro machuca; na arena e no cooperativo é só enfeite,
     porque quem faz o dano de verdade é o dono do tiro.             */
  if (MP.sala && player.alive) {
    const duelo = MP.modo === "pvp";
    for (const id in MP.outros) {
      const o = MP.outros[id];
      if (!o || !o.tiros) continue;
      o.sim = o.sim || [];
      for (const t of o.tiros) {
        if (!t || typeof t !== "object") continue;
        if (t.serie <= (o.ultimaSerie || 0)) continue;
        o.ultimaSerie = t.serie;
        /* No duelo cada um joga na SUA tela, com a própria nave embaixo.
           Então o adversário tem de aparecer espelhado: o que para ele é
           embaixo-à-esquerda, para mim é em cima-à-direita. Sem isso ele
           aparecia no mesmo canto em que estava na tela dele — e os dois
           viam a briga trocada.                                        */
        o.sim.push(duelo
          ? { x: W - t.x, y: H - t.y, vx: -t.vx, vy: -t.vy, r: 5, t: 2.5 }
          : { x: t.x, y: t.y, vx: t.vx, vy: t.vy, r: 4, t: 1.8 });
      }
      if (o.sim.length > 70) o.sim = o.sim.slice(-70);
      if (!duelo) {
        // aliado: só anda e some, não bate em ninguém
        for (let i = o.sim.length - 1; i >= 0; i--) {
          const b = o.sim[i];
          if (!b) { o.sim.splice(i, 1); continue; }
          b.t -= dt;
          b.x += b.vx * dt; b.y += b.vy * dt;
          if (b.t <= 0 || b.y < -40 || b.y > H + 40) o.sim.splice(i, 1);
        }
        continue;
      }
      for (let i = o.sim.length - 1; i >= 0; i--) {
        if (i >= o.sim.length) { i = o.sim.length; continue; }
        const b = o.sim[i];
        if (!b) continue;
        b.t -= dt;
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.t <= 0 || b.y > H + 30 || b.y < -30) { o.sim.splice(i, 1); continue; }
        if (player.invuln <= 0 && player.invis <= 0 &&
            dist2(b.x, b.y, player.x, player.y) < (b.r + player.r) * (b.r + player.r)) {
          o.sim.splice(i, 1);
          hitPlayer();
        }
      }
    }
  }

  /* --- balas inimigas ---
     Cuidado: levar dano pode disparar a Nova de Choque ou o Sistema de
     Emergência, e os dois LIMPAM esta mesma lista no meio do laço. Por
     isso o índice é conferido a cada volta.                              */
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    if (i >= enemyBullets.length) { i = enemyBullets.length; continue; }
    const b = enemyBullets[i];
    if (!b) continue;
    if (b.homing) {
      b.life -= dt;
      if (b.life <= 0) { enemyBullets.splice(i, 1); continue; }
      if (player.alive && player.invis <= 0) {
        const ang = Math.atan2(player.y - b.y, player.x - b.x);
        const sp = 190;
        b.vx += (Math.cos(ang) * sp - b.vx) * 2.4 * dt;
        b.vy += (Math.sin(ang) * sp - b.vy) * 2.4 * dt;
      }
    }
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.y > H + 20 || b.y < -20 || b.x < -20 || b.x > W + 20) { enemyBullets.splice(i, 1); continue; }
    if (player.alive && player.invuln <= 0 && player.invis <= 0 &&
        dist2(b.x, b.y, player.x, player.y) < (b.r + player.r - 5) * (b.r + player.r - 5)) {
      enemyBullets.splice(i, 1);
      hitPlayer();
    }
  }

  /* --- tropas chamadas pelo Ômega-9 --- */
  if (aliados.length || obuses.length || laserOrbital) atualizarAliados(dt);

  /* --- power-ups --- */
  for (let i = powerups.length - 1; i >= 0; i--) {
    if (i >= powerups.length) { i = powerups.length; continue; }
    const p = powerups[i];
    if (!p) continue;
    p.t += dt;
    p.y += p.vy * dt;
    p.x += Math.sin(p.t * 3) * 20 * dt;
    if (ST.magnetR > 0 && player.alive) {
      const d = dist2(p.x, p.y, player.x, player.y);
      if (d < ST.magnetR * ST.magnetR) {
        const ang = Math.atan2(player.y - p.y, player.x - p.x);
        const pull = 340 * (1 - Math.sqrt(d) / ST.magnetR);
        p.x += Math.cos(ang) * pull * dt;
        p.y += Math.sin(ang) * pull * dt;
      }
    }
    if (p.y > H + 30) { powerups.splice(i, 1); continue; }
    if (player.alive && dist2(p.x, p.y, player.x, player.y) < (16 + player.r) * (16 + player.r)) {
      applyPowerup(p);
      powerups.splice(i, 1);
    }
  }

  /* --- partículas e textos --- */
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.t -= dt;
    if (p.t <= 0) { particles.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= 0.98; p.vy *= 0.98;
  }
  for (let i = texts.length - 1; i >= 0; i--) {
    const t = texts[i];
    t.t -= dt;
    t.y -= 40 * dt;
    if (t.t <= 0) texts.splice(i, 1);
  }
}
