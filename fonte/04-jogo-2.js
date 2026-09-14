/* =====================================================================
   SUGESTÕES — o que os jogadores escreveram no fim das fases
   ===================================================================== */
let sugTodas = [];
function sugNomeTipo(id) {
  const t = SUG_TIPOS.find(x => x.id === id);
  return t ? t.nome.replace(/^\S+\s/, "") : "OUTRO";
}
async function admCarregarSugestoes() {
  const cx = $("sug-lista");
  cx.innerHTML = '<div class="adm-note">Buscando…</div>';
  const d = await nuvemReq("sugestoes");
  sugTodas = d ? Object.keys(d).map(id => Object.assign({ id: id }, d[id]))
                   .filter(x => x && x.texto)
                   .sort((a, b) => (b.quando || 0) - (a.quando || 0))
               : [];
  admRenderSugestoes();
}
function admRenderSugestoes() {
  try { renderAbasAdm(); } catch (e) {}
  const cx = $("sug-lista");
  const novas = sugTodas.filter(s2 => !s2.lida).length;
  $("sug-cont").textContent = sugTodas.length
    ? (novas ? novas + " nova" + (novas > 1 ? "s" : "") + " de " + sugTodas.length
             : sugTodas.length + " no total")
    : "";
  cx.innerHTML = "";
  if (!sugTodas.length) {
    cx.innerHTML = '<div class="adm-vazio"><b>💡</b>Nenhuma sugestão ainda.<br>' +
      "O botão aparece para os jogadores no fim de cada fase.</div>";
    return;
  }
  for (const sg of sugTodas.slice(0, 120)) {
    const d = document.createElement("div");
    d.className = "sug-item" + (sg.lida ? "" : " nova");
    d.innerHTML =
      '<div class="sug-cab">' +
        '<span class="quem">' + escaparTexto(sg.nome || "Piloto") + "</span>" +
        '<span class="tipo">' + escaparTexto(sugNomeTipo(sg.tipo)) + "</span>" +
        '<span class="quando">' + tempoRelativo(sg.quando) +
          " · fase " + (sg.fase || 0) + " · v" + escaparTexto(sg.versao || "?") + "</span>" +
      "</div>" +
      '<div class="sug-txt">' + escaparLongo(sg.texto) + "</div>";
    const acoes = document.createElement("div");
    acoes.className = "sug-acoes";
    const ler = document.createElement("button");
    ler.textContent = sg.lida ? "MARCAR COMO NOVA" : "MARCAR COMO LIDA";
    ler.addEventListener("click", async () => {
      sg.lida = !sg.lida;
      await nuvemReq("sugestoes/" + sg.id + "/lida", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sg.lida)
      });
      admRenderSugestoes();
    });
    const apagar = document.createElement("button");
    apagar.textContent = "APAGAR";
    apagar.style.color = "var(--danger)";
    apagar.addEventListener("click", async () => {
      await nuvemReq("sugestoes/" + sg.id, { method: "DELETE" });
      sugTodas = sugTodas.filter(x => x.id !== sg.id);
      admRenderSugestoes();
    });
    acoes.appendChild(ler); acoes.appendChild(apagar);
    d.appendChild(acoes);
    cx.appendChild(d);
  }
}
function sugTextoParaCopiar() {
  if (!sugTodas.length) return "Nenhuma sugestão ainda.";
  const dia = new Date().toLocaleDateString("pt-BR");
  return "SUGESTÕES DO NEON NEBULA — " + dia + " (" + sugTodas.length + " no total)\n\n" +
    sugTodas.map((s2, i) =>
      (i + 1) + ") " + (s2.nome || "Piloto") + " · " + sugNomeTipo(s2.tipo) +
      " · fase " + (s2.fase || 0) + " · v" + (s2.versao || "?") +
      " · " + new Date(s2.quando || 0).toLocaleString("pt-BR") +
      (s2.lida ? " · (já lida)" : " · NOVA") + "\n" + s2.texto
    ).join("\n\n");
}
$("sug-atualizar").addEventListener("click", admCarregarSugestoes);
$("sug-copiar").addEventListener("click", async () => {
  const txt = sugTextoParaCopiar();
  try {
    await navigator.clipboard.writeText(txt);
    admMsg("Copiado! Agora é só colar para o Claude.");
    $("sug-copiar").textContent = "✓ COPIADO";
    setTimeout(() => { $("sug-copiar").textContent = "📋 COPIAR TODAS"; }, 2500);
    AudioSys.buy();
  } catch (e) {
    const pre = document.createElement("div");
    pre.className = "diag-regras";
    pre.textContent = txt;
    $("sug-lista").prepend(pre);
    admMsg("Não deu para copiar sozinho — selecione o texto que apareceu.");
  }
});
$("sug-marcar").addEventListener("click", async () => {
  for (const sg of sugTodas) {
    if (sg.lida) continue;
    sg.lida = true;
    await nuvemReq("sugestoes/" + sg.id + "/lida", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: "true"
    });
  }
  admRenderSugestoes();
  admMsg("Todas marcadas como lidas");
});
$("sug-apagar-lidas").addEventListener("click", async () => {
  const lidas = sugTodas.filter(x => x.lida);
  if (!lidas.length) { admMsg("Não há sugestões lidas para apagar."); return; }
  for (const sg of lidas) await nuvemReq("sugestoes/" + sg.id, { method: "DELETE" });
  sugTodas = sugTodas.filter(x => !x.lida);
  admRenderSugestoes();
  admMsg(lidas.length + " sugestão(ões) apagada(s)");
});

/* =====================================================================
   TESTE DA NUVEM — diz o que está travando, em português
   ---------------------------------------------------------------------
   Quase sempre que "não acontece nada" é uma destas três coisas:
   1) o jogo está sem endereço de nuvem (config.js vazio);
   2) as regras do Firebase ainda não têm o galho novo (mundo, pedidos…),
      e aí a gravação é recusada em silêncio;
   3) a internet caiu.
   Este teste escreve e apaga uma marca em cada galho e mostra qual falhou.
   ===================================================================== */
/* Todos os galhos que o jogo usa HOJE. Faltando qualquer um destes nas
   regras, a parte que depende dele para de funcionar em silêncio — foi o
   que aconteceu com a loja, os amigos e o suporte, que nasceram depois da
   última vez que esta lista foi escrita.                                */
const REGRAS_NOS = ["pilotos", "presentes", "contas", "salas", "arena", "fila",
                    "cenas", "pedidos", "mundo", "sugestoes", "equipe",
                    "amigos", "conversas", "loja_pedidos", "suporte", "vivo"];

async function nuvemTestarNo(no) {
  const alvo = no + "/__teste";
  try {
    const r = await fetch(NUVEM_URL.replace(/\/$/, "") + "/" + alvo + ".json", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ t: Date.now() })
    });
    if (!r.ok) return { ok: false, cod: r.status };
    await fetch(NUVEM_URL.replace(/\/$/, "") + "/" + alvo + ".json", { method: "DELETE" });
    return { ok: true };
  } catch (e) { return { ok: false, cod: 0, erro: String(e && e.message) }; }
}

async function admTestarNuvem() {
  const cx = $("diag-lista");
  cx.innerHTML = '<div class="adm-note">Testando…</div>';
  const linhas = [];
  const add = (ok, nome, desc) => linhas.push({ ok, nome, desc });

  if (!nuvemAtiva()) {
    cx.innerHTML = "";
    const d = document.createElement("div");
    d.className = "diag-item ruim";
    d.innerHTML = "<b>✕</b><div><div class='n'>O modo online está desligado</div>" +
      "<div class='d'>Esta cópia do jogo está sem endereço de nuvem, então nada " +
      "online funciona: nem ranking, nem presentes, nem eventos, nem recados.<br><br>" +
      "Se você abriu pelo <b>link do Artifact antigo</b>, use a versão nova — ou " +
      "abra pelo endereço do GitHub Pages, que já vem com a nuvem ligada.</div></div>";
    cx.appendChild(d);
    return;
  }
  add(true, "Endereço da nuvem", NUVEM_URL);

  let bloqueados = [];
  for (const no of REGRAS_NOS) {
    const r = await nuvemTestarNo(no);
    if (r.ok) add(true, "Galho " + no, "gravação liberada");
    else {
      bloqueados.push(no);
      add(false, "Galho " + no,
        r.cod === 401 || r.cod === 403
          ? "as regras do Firebase estão recusando a gravação aqui"
          : (r.cod ? "o servidor respondeu " + r.cod : "não deu para alcançar (" + (r.erro || "sem rede") + ")"));
    }
  }

  cx.innerHTML = "";
  for (const l of linhas) {
    const d = document.createElement("div");
    d.className = "diag-item " + (l.ok ? "ok" : "ruim");
    d.innerHTML = "<b>" + (l.ok ? "✓" : "✕") + "</b><div><div class='n'>" +
      escaparTexto(l.nome) + "</div><div class='d'>" + escaparTexto(l.desc) + "</div></div>";
    cx.appendChild(d);
  }

  if (bloqueados.length) {
    const aviso = document.createElement("div");
    aviso.className = "diag-item ruim";
    aviso.innerHTML = "<b>⚠</b><div><div class='n'>Faltam regras no Firebase</div>" +
      "<div class='d'>Estes galhos estão bloqueados: <b>" + bloqueados.join(", ") + "</b>.<br>" +
      "Abra o Firebase → Realtime Database → aba <b>Regras</b>, cole o texto " +
      "abaixo por cima do que está lá e aperte <b>Publicar</b>. Depois volte aqui " +
      "e teste de novo.</div></div>";
    cx.appendChild(aviso);
    const pre = document.createElement("div");
    pre.className = "diag-regras";
    pre.textContent = admRegrasJSON();
    cx.appendChild(pre);
    const copiar = document.createElement("button");
    copiar.className = "adm-btn gold";
    copiar.style.marginTop = "10px";
    copiar.style.width = "100%";
    copiar.textContent = "📋 COPIAR AS REGRAS";
    copiar.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(admRegrasJSON());
        copiar.textContent = "✓ COPIADO — cole no Firebase";
      } catch (e) { copiar.textContent = "Selecione o texto acima e copie"; }
    });
    cx.appendChild(copiar);
    AudioSys.deny();
  } else {
    const bom = document.createElement("div");
    bom.className = "diag-item ok";
    bom.innerHTML = "<b>✓</b><div><div class='n'>Está tudo certo</div>" +
      "<div class='d'>Todos os galhos aceitam gravação. Os eventos, recados e " +
      "boosts devem funcionar normalmente.</div></div>";
    cx.appendChild(bom);
    AudioSys.buy();
  }
}
function admRegrasJSON() {
  const no = (dentro) => dentro
    ? '{\n      "$id": {\n        ".read": true,\n        ".write": true\n      }\n    }'
    : '{\n      ".read": true,\n      ".write": true\n    }';
  return '{\n  "rules": {\n' +
    '    "pilotos": {\n      ".read": true,\n      "$id": { ".write": true }\n    },\n' +
    '    "presentes": ' + no(true) + ',\n' +
    '    "contas": ' + no(true) + ',\n' +
    '    "salas": ' + no(true) + ',\n' +
    '    "cenas": ' + no(true) + ',\n' +
    '    "pedidos": ' + no(true) + ',\n' +
    '    "conversas": ' + no(true) + ',\n' +
    '    "arena": ' + no(false) + ',\n' +
    '    "fila": ' + no(false) + ',\n' +
    '    "mundo": ' + no(false) + ',\n' +
    '    "sugestoes": ' + no(false) + ',\n' +
    '    "equipe": ' + no(false) + ',\n' +
    '    "amigos": ' + no(false) + ',\n' +
    '    "loja_pedidos": ' + no(false) + ',\n' +
    '    "suporte": ' + no(false) + ',\n' +
    /* os servidores da Estação. Galho novo é galho recusado enquanto as
       regras antigas estiverem coladas lá — por isso ele entra aqui, e
       por isso o jogo avisa em vez de falhar calado quando é negado. */
    '    "servidores": ' + no(false) + ',\n' +
    '    "vivo": ' + no(false) + '\n' +
    '  }\n}';
}
$("diag-testar").addEventListener("click", admTestarNuvem);

/* =====================================================================
   MANDAR ATUALIZAR — tira todo mundo de uma versão velha
   ---------------------------------------------------------------------
   Escreve a ordem em mundo/att. Como todo jogo já escuta o nó mundo pelo
   fluxo, a ordem chega na hora: quem estiver numa versão anterior limpa
   o cache, desliga o service worker e recarrega sozinho.
   ===================================================================== */
async function attRender() {
  const el = $("att-versao");
  if (el) el.textContent = VERSAO;
  const est = $("att-estado");
  const lista = $("att-lista");
  if (!nuvemAtiva()) {
    if (est) est.textContent = "O modo online está desligado neste aparelho.";
    return;
  }
  const m = await nuvemReq("mundo/att");
  if (est) {
    est.textContent = m && m.versao
      ? "Ordem no ar: atualizar para a " + m.versao + " (mandada " + tempoRelativo(m.quando) + ")."
      : "Nenhuma ordem no ar.";
  }
  /* quem está em qual versão, direto da lista de pilotos */
  if (!lista) return;
  const pil = (await nuvemReq("pilotos")) || {};
  const contas = {};
  for (const id in pil) {
    const v = (pil[id] && pil[id].versao) || "?";
    (contas[v] = contas[v] || []).push(pil[id].nome || id);
  }
  const versoes = Object.keys(contas).sort((a, b) => versaoNumero(b) - versaoNumero(a));
  lista.innerHTML = versoes.length
    ? versoes.map(v => {
        const atual = versaoNumero(v) >= versaoNumero(VERSAO);
        return '<div class="att-linha' + (atual ? " ok" : "") + '">' +
          "<b>v" + escaparTexto(v) + "</b>" +
          "<span>" + contas[v].length + " piloto" + (contas[v].length === 1 ? "" : "s") + "</span>" +
          "<i>" + escaparTexto(contas[v].slice(0, 4).join(", ")) +
          (contas[v].length > 4 ? "…" : "") + "</i></div>";
      }).join("")
    : '<div class="adm-note">Ninguém apareceu na nuvem ainda.</div>';
}
$("att-todos").addEventListener("click", async () => {
  const b = $("att-todos");
  b.disabled = true; b.textContent = "MANDANDO…";
  /* A ordem tem que levar a versão que está NO SERVIDOR, não a que este
     painel está rodando. O dono costuma ser quem mais demora a receber
     a atualização (o celular dele guarda a página em cache), e mandar a
     própria versão velha fazia a ordem nascer sem efeito: todo mundo
     recebia "atualize para a 6.5" já estando na 6.5. */
  let alvo = VERSAO;
  try {
    const vs = await versaoNoServidor();
    if (vs && versaoNumero(vs) > versaoNumero(alvo)) alvo = vs;
  } catch (e) {}
  const ok = await nuvemSoltar("mundo/att", {
    versao: alvo, quando: Date.now(),
    nota: "O administrador mandou atualizar para a versão " + alvo + "."
  });
  b.disabled = false; b.textContent = "⬇ MANDAR TODO MUNDO ATUALIZAR";
  admMsg(ok === null ? "O Firebase recusou a gravação." :
         "Pronto: quem estiver abaixo da v" + alvo + " vai atualizar sozinho." +
         (alvo !== VERSAO ? " (Este aparelho também está atrasado: ele mesmo vai " +
          "atualizar agora.)" : ""));
  attRender();
});
$("att-limpar").addEventListener("click", async () => {
  await nuvemReq("mundo/att", { method: "DELETE" });
  admMsg("Ordem apagada.");
  attRender();
});

/* =====================================================================
   PAINEL DO MUNDO — recados, eventos, boosts e travessuras
   ---------------------------------------------------------------------
   Tudo escreve no mesmo nó mundo/ da nuvem, e como todo jogo escuta esse
   nó pelo fluxo, o efeito acende na hora no aparelho de todo mundo.
   Cada botão tem a sua caixinha de tempo (e de "quantas vezes mais"),
   então dá para regular na hora sem mexer em código.
   ===================================================================== */
const RECADOS_PRONTOS = [
  ["🎉 EVENTO COMEÇANDO AGORA!", "festa"],
  ["⚡ BOOST LIGADO — aproveitem!", "premio"],
  ["⚠ Manutenção em 5 minutos", "alerta"],
  ["🏆 Parabéns ao primeiro do ranking!", "premio"],
  ["😈 Boa sorte com o que vem aí…", "alerta"],
  ["🎁 Presentes a caminho!", "premio"],
  ["🔥 Quem chegar mais longe ganha prêmio", "festa"],
  ["👋 Bom jogo a todos!", "normal"]
];

function admSegundos(idTempo, idUnidade, padrao) {
  const n = Math.max(1, parseInt($(idTempo).value, 10) || padrao || 1);
  const u = idUnidade ? (parseInt($(idUnidade).value, 10) || 1) : 1;
  return n * u;
}
async function mundoEscrever(caminho, valor) {
  if (!nuvemAtiva()) {
    admMsg("O modo online está desligado nesta cópia — aperte TESTAR AGORA lá em cima.");
    AudioSys.deny();
    return null;
  }
  let resposta = null;
  try {
    resposta = await fetch(NUVEM_URL.replace(/\/$/, "") + "/mundo/" + caminho + ".json", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(valor)
    });
  } catch (e) {}
  if (!resposta || !resposta.ok) {
    const cod = resposta ? resposta.status : 0;
    admMsg(cod === 401 || cod === 403
      ? "⚠ O Firebase recusou: falta a regra do galho \"mundo\". Aperte TESTAR AGORA e copie as regras."
      : "⚠ Não deu para gravar na nuvem" + (cod ? " (erro " + cod + ")" : " — sem internet?"));
    AudioSys.deny();
    $("adm-diag").scrollIntoView({ block: "center", behavior: "smooth" });
    return null;
  }
  // acende na hora aqui também, sem esperar o fluxo dar a volta
  mundoAplicar(await nuvemReq("mundo"));
  admRenderMundo();
  return true;
}
async function mundoApagar(caminho) {
  await nuvemReq("mundo/" + caminho, { method: "DELETE" });
  mundoAplicar(await nuvemReq("mundo"));
  admRenderMundo();
}

/* ----- recados ----- */
async function admEnviarRecado(texto, tipo) {
  const t = (texto !== undefined ? texto : ($("msg-texto").value || "")).trim();
  if (!t) { admMsg("Escreva o recado primeiro."); AudioSys.deny(); return; }
  const seg = admSegundos("msg-tempo", null, 60);
  const ok = await mundoEscrever("aviso", {
    texto: t.slice(0, 160), tipo: tipo || $("msg-tipo").value || "normal",
    de: "ADMINISTRADOR", quando: Date.now(), ate: Date.now() + seg * 1000
  });
  if (!ok) return false;               // o aviso do erro já apareceu
  admMsg("Recado no ar por " + seg + "s");
  AudioSys.buy();
  return true;
}
function admRenderRecadosProntos() {
  const cx = $("msg-rapidas");
  if (!cx) return;
  cx.innerHTML = "";
  for (const [txt, tipo] of RECADOS_PRONTOS) {
    const b = document.createElement("button");
    b.className = "msg-rapida";
    b.textContent = txt;
    b.addEventListener("click", () => {
      $("msg-texto").value = txt;
      $("msg-tipo").value = tipo;
      admEnviarRecado(txt, tipo);
    });
    cx.appendChild(b);
  }
}

/* ----- eventos ----- */
function admRenderEventos() {
  const cx = $("lista-eventos");
  if (!cx) return;
  cx.innerHTML = "";
  const atual = eventoAtual();
  for (const ev of EVENTOS) {
    const b = document.createElement("button");
    b.className = "mundo-op" + (atual && atual.id === ev.id ? " ligado" : "");
    b.style.color = ev.cor;
    b.innerHTML = "<b>" + ev.icone + "</b><strong style=\"color:" + ev.cor + "\">" + ev.nome +
      "</strong><span>" + ev.desc + "</span>" +
      (atual && atual.id === ev.id ? '<span class="lig">NO AR</span>' : "");
    b.addEventListener("click", async () => {
      const seg = admSegundos("ev-tempo", "ev-un", 10);
      const ok = await mundoEscrever("evento",
        { id: ev.id, ate: Date.now() + seg * 1000, quando: Date.now() });
      if (!ok) return;
      await admEnviarRecado(ev.icone + " " + ev.nome + " COMEÇOU!", "festa");
      admMsg(ev.nome + " no ar por " + seg + "s");
      AudioSys.victory();
    });
    cx.appendChild(b);
  }
}

/* ----- boosts ----- */
function admRenderBoosts() {
  const cx = $("lista-boosts");
  if (!cx) return;
  cx.innerHTML = "";
  for (const bo of BOOSTS) {
    const ativo = mundoAtivo(bo.id);
    const div = document.createElement("div");
    div.className = "mundo-op" + (ativo ? " ligado" : "");
    div.style.color = bo.cor;
    div.innerHTML = "<b>" + bo.icone + "</b><strong style=\"color:" + bo.cor + "\">" + bo.nome +
      "</strong><span>" + bo.desc + "</span>" +
      (ativo ? '<span class="lig">' + (ativo.mult || 1) + "x</span>" : "");
    const linha = document.createElement("div");
    linha.className = "mult";
    const mult = document.createElement("input");
    mult.type = "number"; mult.min = "1"; mult.max = "999";
    mult.value = String(bo.padraoMult);
    mult.id = "bo-mult-" + bo.id;
    const x = document.createElement("span"); x.className = "x"; x.textContent = "x por";
    const hor = document.createElement("input");
    hor.type = "number"; hor.min = "1"; hor.value = String(bo.padraoTempo);
    hor.id = "bo-hora-" + bo.id;
    const un = document.createElement("span"); un.className = "x"; un.textContent = "h";
    linha.appendChild(mult); linha.appendChild(x); linha.appendChild(hor); linha.appendChild(un);
    for (const el of [mult, hor]) el.addEventListener("click", e => e.stopPropagation());
    div.appendChild(linha);
    const btn = document.createElement("button");
    btn.className = "adm-btn gold";
    btn.style.marginTop = "8px";
    btn.style.width = "100%";
    btn.textContent = ativo ? "RENOVAR" : "LIGAR";
    btn.addEventListener("click", async e => {
      e.stopPropagation();
      const m = Math.max(1, parseInt(mult.value, 10) || 2);
      const h = Math.max(0.1, parseFloat(hor.value) || 1);
      const ok = await mundoEscrever("efeitos/" + bo.id, { mult: m, ate: Date.now() + h * 3600000 });
      if (!ok) return;
      await admEnviarRecado("⚡ " + bo.nome + " x" + m + " ligado por " + h + "h!", "premio");
      admMsg(bo.nome + " x" + m + " por " + h + "h");
      AudioSys.power();
    });
    div.appendChild(btn);
    cx.appendChild(div);
  }
}

/* ----- travessuras ----- */
function admRenderTrolls() {
  const cx = $("lista-trolls");
  if (!cx) return;
  cx.innerHTML = "";
  for (const tr of TROLLS) {
    const ativo = mundoAtivo(tr.id);
    const b = document.createElement("button");
    b.className = "mundo-op" + (ativo ? " ligado" : "");
    b.style.color = tr.cor;
    b.innerHTML = "<b>" + tr.icone + "</b><strong style=\"color:" + tr.cor + "\">" + tr.nome +
      "</strong><span>" + tr.desc + "</span>" +
      (ativo ? '<span class="lig">' + tempoRestante(ativo.ate) + "</span>" : "");
    b.addEventListener("click", async () => {
      if (mundoAtivo(tr.id)) { await mundoApagar("efeitos/" + tr.id); admMsg(tr.nome + " desligado"); return; }
      const seg = admSegundos("tr-tempo", "tr-un", 60);
      const ok = await mundoEscrever("efeitos/" + tr.id, { ate: Date.now() + seg * 1000 });
      if (!ok) return;
      admMsg(tr.nome + " por " + seg + "s");
      AudioSys.deny();
    });
    cx.appendChild(b);
  }
}

/* ----- o que está valendo agora ----- */
function admRenderMundoAgora() {
  const cx = $("mundo-agora");
  if (!cx) return;
  mundoLimpar();
  cx.innerHTML = "";
  const cont = $("agora-cont");
  const linha = (icone, nome, ate, aoTirar, cor) => {
    const d = document.createElement("div");
    d.className = "mundo-item";
    d.innerHTML = '<b style="color:' + (cor || "var(--cyan)") + '">' + icone + "</b>" +
      '<span class="n">' + nome + '</span><span class="t">' + tempoRestante(ate) + "</span>";
    const x = document.createElement("button");
    x.textContent = "✕";
    x.addEventListener("click", aoTirar);
    d.appendChild(x);
    cx.appendChild(d);
  };
  let n = 0;
  if (MUNDO.aviso) {
    n++;
    linha("📢", "Recado: " + escaparTexto(String(MUNDO.aviso.texto).slice(0, 30)),
          MUNDO.aviso.ate, () => mundoApagar("aviso"), "var(--cyan)");
  }
  const ev = eventoAtual();
  if (ev) { n++; linha(ev.icone, ev.nome, MUNDO.evento.ate, () => mundoApagar("evento"), ev.cor); }
  for (const k in MUNDO.efeitos) {
    const bo = BOOSTS.find(x => x.id === k), tr = TROLLS.find(x => x.id === k);
    const def = bo || tr;
    if (!def) continue;
    n++;
    linha(def.icone, def.nome + (bo ? " x" + (MUNDO.efeitos[k].mult || 1) : ""),
          MUNDO.efeitos[k].ate, () => mundoApagar("efeitos/" + k), def.cor);
  }
  if (cont) cont.textContent = n ? n + (n === 1 ? " coisa ligada" : " coisas ligadas") : "";
  if (!n) {
    cx.innerHTML = '<div class="adm-vazio"><b>🌙</b>Nada ligado agora.<br>' +
      "O jogo está rodando no normal para todo mundo.</div>";
  }
}

function admRenderMundo() {
  try { renderPresenteGeral(); } catch (e) {}
  admRenderEventos();
  admRenderBoosts();
  admRenderTrolls();
  admRenderMundoAgora();
}

$("msg-enviar").addEventListener("click", () => admEnviarRecado());
$("msg-texto").addEventListener("keydown", e => { if (e.key === "Enter") admEnviarRecado(); });
$("msg-limpar").addEventListener("click", async () => {
  await mundoApagar("aviso");
  admMsg("Recado apagado");
});
$("ev-parar").addEventListener("click", async () => {
  await mundoApagar("evento");
  admMsg("Evento parado");
});
$("boost-parar").addEventListener("click", async () => {
  for (const bo of BOOSTS) await nuvemReq("mundo/efeitos/" + bo.id, { method: "DELETE" });
  mundoAplicar(await nuvemReq("mundo"));
  admRenderMundo();
  admMsg("Todos os boosts desligados");
});
$("boost-tudo").addEventListener("click", async () => {
  const ate = Date.now() + 3600000;
  let ok = true;
  for (const bo of BOOSTS) {
    if (!await mundoEscrever("efeitos/" + bo.id, { mult: 5, ate: ate })) { ok = false; break; }
  }
  if (!ok) return;
  await admEnviarRecado("⚡ TUDO 5x POR UMA HORA! Aproveitem!", "premio");
  admMsg("Todos os boosts em 5x por 1h");
  AudioSys.victory();
});
$("tr-parar").addEventListener("click", async () => {
  for (const tr of TROLLS) await nuvemReq("mundo/efeitos/" + tr.id, { method: "DELETE" });
  mundoAplicar(await nuvemReq("mundo"));
  admRenderMundo();
  admMsg("Travessuras desligadas");
});
$("tr-caos").addEventListener("click", async () => {
  const seg = admSegundos("tr-tempo", "tr-un", 60);
  const ate = Date.now() + seg * 1000;
  let ok = true;
  for (const tr of TROLLS) {
    if (tr.id === "lesma") continue;   // essa briga com o turbo
    if (!await mundoEscrever("efeitos/" + tr.id, { ate: ate })) { ok = false; break; }
  }
  if (!ok) return;
  await admEnviarRecado("🔥 MODO CAOS! Segurem-se!", "alerta");
  admMsg("Modo caos por " + seg + "s");
});

/* =====================================================================
   Janela AO VIVO — quem está com o jogo aberto, em que tela, desde
   quando e com qual versão. Usa o fluxo (push), então muda sozinha.
   ===================================================================== */
let vivoFechar = null, vivoDados = {}, vivoPausado = false, vivoRelogio = null;
let admRelogioMundo = null;

function tempoRelativo(ms) {
  if (!ms) return "—";
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 45) return "agora";
  if (s < 90) return "há 1 min";
  if (s < 3600) return "há " + Math.round(s / 60) + " min";
  if (s < 86400) return "há " + Math.round(s / 3600) + "h";
  return "há " + Math.round(s / 86400) + " dias";
}
function duracao(ms) {
  if (!ms) return "—";
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return s + "s";
  if (s < 3600) return Math.floor(s / 60) + " min";
  const h = Math.floor(s / 3600);
  return h + "h" + String(Math.floor((s % 3600) / 60)).padStart(2, "0");
}
function estaOnline(p) { return Date.now() - (p.atualizado || 0) < 70000; }

function vivoLigar() {
  vivoDesligar();
  vivoFechar = nuvemFluxo("pilotos", dados => {
    vivoDados = dados || {};
    if (!vivoPausado) vivoRender();
  }, () => {
    // sem fluxo: busca de tempo em tempo
    vivoRelogio = setInterval(async () => {
      if (vivoPausado) return;
      const d = await nuvemReq("pilotos");
      vivoDados = d || {};
      vivoRender();
    }, 5000);
  });
  // relógio só para atualizar os textos "há X min"
  if (!vivoRelogio) vivoRelogio = setInterval(() => { if (!vivoPausado) vivoRender(); }, 15000);
}
function vivoDesligar() {
  if (vivoFechar) { vivoFechar(); vivoFechar = null; }
  if (vivoRelogio) { clearInterval(vivoRelogio); vivoRelogio = null; }
}
/* ---------------------------------------------------------------------
   OS QUATRO NÚMEROS DO TOPO
   ---------------------------------------------------------------------
   Antes, para saber como o jogo ia, o dono tinha que apertar ATUALIZAR
   NÚMEROS lá embaixo e ler um relatório. Agora bate o olho: quantos
   estão jogando AGORA, quantos pilotos existem, quantos vieram hoje e
   quantos ainda estão numa versão velha -- que é o número que mais dói,
   porque é gente que não recebeu nenhum conserto.

   Sai da MESMA lista que a tabela: sem nova busca na nuvem e sem risco
   de o topo dizer uma coisa e a lista dizer outra.                     */
function admNumerosTopo(todos) {
  const cx = $("adm-topo-num");
  if (!cx) return;
  const agora = todos.filter(estaOnline).length;
  const dia = 86400000;
  const hoje = todos.filter(p => Date.now() - (p.atualizado || 0) < dia).length;
  const velha = todos.filter(p => versaoNumero(p.versao || "0") < versaoNumero(VERSAO)).length;
  const por = (id, v) => { const e = $(id); if (e) e.textContent = v; };
  por("num-agora", agora);
  por("num-pilotos", fmt(todos.length));
  por("num-pilotos-pe", agora ? agora + " com o jogo aberto" : "ninguém agora");
  por("num-hoje", fmt(hoje));
  por("num-hoje-pe", todos.length ? Math.round(hoje / todos.length * 100) + "% de quem existe" : "—");
  por("num-velha", fmt(velha));
  por("num-velha-pe", velha ? "não receberam os consertos" : "todos na " + VERSAO);
  const v = $("num-velha");
  if (v) v.style.color = velha ? "var(--magenta)" : "var(--verde)";

  /* barrinhas: as últimas 12 leituras de quantos estavam jogando. É o
     gráfico do cartão da referência, sem biblioteca nenhuma. */
  /* SEMPRE doze barras. A leitura nova entra pela direita e as que
     faltam ficam rasteiras à esquerda: o cartão tem a mesma cara desde
     o primeiro segundo, e a história vai empurrando. Começar com uma
     barra só deixava aquela barra ocupando o cartão inteiro, o que
     parece defeito em vez de "ainda não tenho história". */
  admHistorico.push(agora);
  while (admHistorico.length > 12) admHistorico.shift();
  while (admHistorico.length < 12) admHistorico.unshift(0);
  const alto = Math.max(1, ...admHistorico);
  const bar = $("num-barras");
  if (bar) {
    bar.innerHTML = admHistorico.map(n =>
      '<i style="height:' + Math.max(8, Math.round(n / alto * 100)) + '%"></i>').join("");
  }
}
let admHistorico = [];

function vivoRender() {
  const box = $("vivo-lista");
  if (!box) return;
  const todos = Object.keys(vivoDados)
    .map(id => Object.assign({ id }, vivoDados[id]))
    .filter(p => p && p.nome)
    .sort((a, b) => (estaOnline(b) ? 1 : 0) - (estaOnline(a) ? 1 : 0) ||
                    (b.atualizado || 0) - (a.atualizado || 0));
  /* esta lista é a ÚNICA lista de jogadores do painel. O resto do painel
     ainda pergunta por admNuvemLista, então ela sai daqui -- uma lista
     só, uma verdade só. */
  if (todos.length) admNuvemLista = todos;
  const busca = (($("adm-nuvem-busca") || {}).value || "").trim().toLowerCase();
  const lista = busca
    ? todos.filter(p => String(p.nome).toLowerCase().indexOf(busca) >= 0)
    : todos;
  const ligados = todos.filter(estaOnline).length;
  $("vivo-cont").textContent = ligados + " de " + todos.length + " com o jogo aberto";
  try { admNumerosTopo(todos); } catch (e) {}
  try { admLadoPeAtualizar(); } catch (e) {}
  box.innerHTML = "";
  if (!lista.length) {
    box.innerHTML = '<div class="adm-vazio"><b>👀</b>' +
      (todos.length ? "Nenhum jogador com esse nome."
                    : "Ninguém apareceu ainda.<br>As pessoas entram nesta lista assim que abrem o jogo com internet.") +
      "</div>";
    return;
  }
  for (const p of lista.slice(0, 60)) {
    const on = estaOnline(p);
    const jogando = on && /Jogando|Arena|Cooperativo|Ranqueada/.test(p.onde || "");
    const row = document.createElement("div");
    row.className = "vivo-row" + (on ? " on" : " off") + (jogando ? " jogando" : "") +
                    (admNuvemAlvo && admNuvemAlvo.id === p.id ? " sel" : "");
    const ver = String(p.versao || "?");
    const velha = ver !== VERSAO;
    const fora = ficaDeForaDoRanking(p);
    row.innerHTML =
      '<span class="vivo-luz"></span>' +
      '<div class="vivo-txt">' +
        '<div class="vivo-nome">' + escaparTexto(p.nome) +
          (fora ? ' <em class="selo-oculto">fora do placar</em>' : "") + "</div>" +
        '<div class="vivo-onde">' + escaparTexto(on ? (p.onde || "No jogo") : "Fechado") +
          " · " + (on ? "aberto há " + duracao(p.entrou) : "visto " + tempoRelativo(p.atualizado)) +
        "</div>" +
      "</div>" +
      '<span class="vivo-col vivo-fase">' + (p.fase || 0) + "</span>" +
      '<span class="vivo-col vivo-gem">◆ ' + fmt(p.cristais || 0) + "</span>" +
      '<span class="vivo-ver' + (velha ? " velha" : "") + '">v' + escaparTexto(ver) + "</span>";
    const olho = document.createElement("button");
    olho.className = "vivo-olho";
    olho.textContent = "👁";
    olho.title = "Ver a tela de " + p.nome;
    olho.addEventListener("click", e => { e.stopPropagation(); assistirJogador(p); });
    row.appendChild(olho);
    row.addEventListener("click", () => {
      admNuvemSelecionar(p);
      $("adm-nuvem-sel").scrollIntoView({ block: "center", behavior: "smooth" });
    });
    box.appendChild(row);
  }
}
$("vivo-atualizar").addEventListener("click", async () => {
  const d = await nuvemReq("pilotos");
  vivoDados = d || {};
  vivoRender();
  admMsg("Lista atualizada");
});
$("vivo-auto").addEventListener("click", () => {
  vivoPausado = !vivoPausado;
  $("vivo-auto").textContent = vivoPausado ? "▶ RETOMAR" : "⏸ PAUSAR";
  if (!vivoPausado) vivoRender();
});

/* ---- jogadores online (só aparece com a nuvem ligada) ---- */
let admNuvemLista = [];
let admNuvemAlvo = null;

async function admNuvemCarregar() {
  const achados = await nuvemListar();
  if (achados.length) admNuvemLista = achados;
  /* a lista viva desenha a partir de vivoDados; alimenta os dois para
     que o botão ATUALIZAR funcione mesmo antes de o fluxo abrir */
  for (const p of achados) if (p && p.id) vivoDados[p.id] = p;
  vivoRender();

  /* VAZIA NA PRIMEIRA OLHADA NÃO QUER DIZER VAZIA.
     O painel abre junto com o login, e quem acabou de entrar no jogo
     ainda está escrevendo o próprio registro na nuvem. Uma busca só
     pegava esse instante e mostrava "ninguém apareceu ainda" com gente
     online do outro lado -- e aí o dono fecha o painel achando que
     está tudo parado. Tenta de novo uma vez, sozinho. */
  if (!achados.length && !admRetentou) {
    admRetentou = true;
    setTimeout(() => { admRetentou = false; admNuvemCarregar(); }, 1500);
  }
}
let admRetentou = false;
/* Uma lista só: quem pedia admNuvemRender() agora repinta a lista viva.
   Manter duas telas da mesma coisa era o que fazia o painel parecer
   grande e confuso -- e obrigava a olhar em dois lugares para saber uma
   coisa só. */
function admNuvemRender() { vivoRender(); }

function admNuvemRenderAntigo() {
  const el = $("adm-nuvem-lista");
  if (!el) return;
  const busca = ($("adm-nuvem-busca").value || "").trim().toLowerCase();
  const lista = admNuvemLista.filter(p => !busca || String(p.nome).toLowerCase().indexOf(busca) >= 0);
  el.innerHTML = "";
  if (!lista.length) {
    const d = document.createElement("div");
    d.className = "adm-note";
    d.textContent = admNuvemLista.length ? "Nenhum jogador com esse nome." :
      "Nenhum jogador online ainda. Eles aparecem aqui ao abrir o jogo.";
    el.appendChild(d);
    return;
  }
  for (const p of lista.slice(0, 80)) {
    const b = document.createElement("button");
    const fora = ficaDeForaDoRanking(p);
    b.className = "profile-btn" + (admNuvemAlvo && admNuvemAlvo.id === p.id ? " sel" : "") +
                  (fora ? " oculto" : "");
    b.innerHTML = '<span class="profile-txt">' +
      '<span class="profile-name">' + escaparTexto(p.nome) +
        (fora ? ' <em class="selo-oculto">fora do placar</em>' : "") + "</span>" +
      '<span class="profile-meta">Fase ' + (p.fase || 0) + " · ◆ " + fmt(p.cristais || 0) +
      " · " + (p.naves || 1) + " naves" +
      (p.versao ? " · <b class='" +
        (versaoNumero(p.versao) >= versaoNumero(VERSAO) ? "v-ok" : "v-velha") +
        "'>v" + escaparTexto(p.versao) + "</b>" : "") +
      "</span></span>";
    b.addEventListener("click", () => { admNuvemSelecionar(p); });

    /* olho: tira e devolve ao placar sem precisar entrar em outra aba */
    const linha = document.createElement("div");
    linha.className = "adm-linha-jog";
    linha.appendChild(b);
    const fixo = OCULTOS_FIXOS.indexOf(String(p.nome).trim().toLowerCase()) >= 0;
    if (pode("verLista")) {
      const olho = document.createElement("button");
      olho.className = "olho-placar" + (fora ? " off" : "");
      olho.textContent = fixo ? "🔒" : (fora ? "🙈" : "👁");
      olho.disabled = !!fixo;
      olho.title = fixo ? "Conta do administrador: nunca entra nas tabelas."
                        : (fora ? "Está fora do placar. Toque para mostrar."
                                : "Aparece no placar. Toque para esconder.");
      olho.setAttribute("aria-label", olho.title);
      olho.addEventListener("click", async ev => {
        ev.stopPropagation();
        olho.disabled = true;
        const novo = !fora;
        await nuvemJuntar("pilotos/" + p.id, { oculto: novo });
        p.oculto = novo;
        cacheRanking = null;
        admMsg(p.nome + (novo ? " sumiu das tabelas" : " voltou para as tabelas"));
        AudioSys.buy();
        admNuvemCarregar();
        if (admNuvemAlvo && admNuvemAlvo.id === p.id) {
          admNuvemAlvo.oculto = novo;
          admNuvemAtualizarBotaoOcultar();
        }
      });
      linha.appendChild(olho);
    }
    /* mandar SÓ esta pessoa atualizar (aparece quando ela está atrasada) */
    if (pode("verLista") && p.versao && versaoNumero(p.versao) < versaoNumero(VERSAO)) {
      const att = document.createElement("button");
      att.className = "olho-placar off";
      att.textContent = "⬇";
      att.title = "Mandar " + p.nome + " atualizar (está na v" + p.versao + ")";
      att.setAttribute("aria-label", att.title);
      att.addEventListener("click", async ev => {
        ev.stopPropagation();
        att.disabled = true;
        const ok = await nuvemEnviarPresente(p.id, {
          atualizar: VERSAO,
          recado: "Atualização do jogo — vai levar alguns segundos."
        });
        admMsg(ok === null ? "Não deu para mandar agora."
                           : "Mandado! " + p.nome + " atualiza assim que abrir o jogo.");
        att.disabled = false;
        AudioSys.buy();
      });
      linha.appendChild(att);
    }
    el.appendChild(linha);
  }
}
async function admNuvemSelecionar(p) {
  /* a lista da nuvem muda embaixo do dedo: o piloto pode ter saído do
     ar entre desenhar a linha e você tocar nela. Sem isto a tela
     inteira do painel quebrava com "undefined". */
  if (!p || !p.id) {
    admMsg("Esse piloto saiu da lista. Atualize e tente de novo.");
    return;
  }
  if (admNuvemAlvo && admNuvemAlvo.id !== p.id) {
    caixaAdm = {};
    invConta = null;
    invMarcado = { naves: {}, amuletos: {}, hab: {}, pecas: {} };
    invNiveis = {};
    const ib = $("inv-box");
    if (ib) ib.innerHTML = '<div class="adm-note">Toque em VER TUDO para puxar o inventário desta conta.</div>';
  }
  admNuvemAlvo = p;
  $("adm-nuvem-sel").style.display = "block";
  $("adm-nuvem-alvo").textContent = "JOGADOR: " + String(p.nome).toUpperCase();
  const visto = p.atualizado ? new Date(p.atualizado).toLocaleString("pt-BR") : "—";
  $("adm-nuvem-stats").innerHTML = [
    ["CRISTAIS", fmt(p.cristais || 0)],
    ["FASE", (p.fase || 0) + "/" + TOTAL_FASES],
    ["NAVES", (p.naves || 1) + "/" + SHIPS.length],
    ["AMULETOS", p.amuletos || 0],
    ["RANK", simboloDoRank(p.rank || 0)],
    ["VERSÃO", "v" + (p.versao || "?")]
  ].map(d => '<div class="adm-stat"><b>' + d[1] + "</b><span>" + d[0] + "</span></div>").join("");
  $("adm-nuvem-pendente").innerHTML =
    (estaOnline(p) ? "🟢 <b>" + escaparTexto(p.onde || "No jogo") + "</b> · com o jogo aberto há " +
                     duracao(p.entrou)
                   : "⚫ Fechado · visto " + tempoRelativo(p.atualizado)) +
    "<br>Última vez: " + visto +
    ((p.versao && p.versao !== VERSAO) ? " · ⚠ está na v" + escaparTexto(p.versao) +
      " (a atual é a v" + VERSAO + ")" : "") +
    (ficaDeForaDoRanking(p) ? '<br><span style="color:var(--amber)">🙈 fora das tabelas</span>' : "");
  renderCaixaAdm();
  admNuvemAtualizarBotaoOcultar();
  admNuvemRender();
  admNuvemVerPendente();
  if (abaAdm === "acoes" || abaAdm === "jogadores") {
    abaAdm = "acoes";
    renderAbasAdm();
  }
}
async function admNuvemVerPendente() {
  if (!admNuvemAlvo) return;
  const g = await nuvemComandoPendente(admNuvemAlvo.id);
  const el = $("adm-nuvem-pendente");
  const antigo = el.querySelector(".pend");
  if (antigo) antigo.remove();
  if (!g) return;
  const itens = Object.keys(g).filter(k => k !== "quando");
  const aviso = document.createElement("div");
  aviso.className = "pend";
  aviso.style.color = "var(--amber)";
  aviso.textContent = "⏳ Caixa esperando: " + itens.join(", ");
  el.appendChild(aviso);
}
/* aplica o efeito também no registro público do jogador, para o ranking e a
   lista do painel mudarem na hora — sem esperar a pessoa abrir o jogo */
function admEfeitoImediato(p, g) {
  if (g.zerarTudo) {
    p.cristais = 0; p.fase = 0; p.naves = 1; p.amuletos = 0;
    p.habilidades = 0; p.recorde = 0; p.horas = 0;
    p.melhorTempo = null; p.rank = 0; p.vitorias = 0; p.derrotas = 0;
    return p;
  }
  if (g.tudo) {
    p.cristais = Math.max(p.cristais || 0, 999999);
    p.fase = TOTAL_FASES; p.naves = 50; p.habilidades = 120;
  }
  if (typeof g.setCristais === "number") p.cristais = Math.max(0, g.setCristais);
  if (g.cristais) p.cristais = Math.max(0, (p.cristais || 0) + g.cristais);
  if (typeof g.setFase === "number") p.fase = g.setFase;
  if (typeof g.setRank === "number") p.rank = Math.max(0, g.setRank);
  if (g.rank) p.rank = Math.max(0, (p.rank || 0) + g.rank);
  if (g.naves) p.naves = 50;
  if (g.fases) p.fase = TOTAL_FASES;
  if (g.habilidades) p.habilidades = 120;
  if (g.exclusiva !== undefined) p.naves = (p.naves || 1) + listaExclusivas(g.exclusiva).length;
  if (g.lendarios) p.amuletos = (p.amuletos || 0) + 3;
  if (g.tirarNaves) p.naves = 1;
  if (g.zerarFases) p.fase = 0;
  if (g.zerarHabilidades) p.habilidades = 0;
  if (g.zerarAmuletos) p.amuletos = 0;
  if (g.remNaves) p.naves = Math.max(1, (p.naves || 1) - g.remNaves.length);
  if (g.remAmuletos) p.amuletos = Math.max(0, (p.amuletos || 0) - g.remAmuletos.length);
  if (g.remHab) p.habilidades = Math.max(0, (p.habilidades || 0) - g.remHab.length);
  if (g.tirarCristais) p.cristais = Math.max(0, (p.cristais || 0) - g.tirarCristais);
  return p;
}

/* =====================================================================
   INVENTÁRIO DO JOGADOR
   ---------------------------------------------------------------------
   Puxa a conta inteira da nuvem e mostra tudo o que a pessoa tem: naves,
   amuletos, habilidades, melhorias e peças. Cada item tem um ✕ que joga
   a RETIRADA na caixa — aí é só enviar, como qualquer outro presente.
   ===================================================================== */
let invConta = null, invAba = "naves", invMarcado = { naves: {}, amuletos: {}, hab: {}, pecas: {} };
let invNiveis = {};

async function invCarregar() {
  if (!admNuvemAlvo) { admMsg("Escolha um jogador."); return; }
  const box = $("inv-box");
  box.innerHTML = '<div class="adm-note">Puxando o inventário…</div>';
  invConta = await contaBuscar(admNuvemAlvo.nome);
  invMarcado = { naves: {}, amuletos: {}, hab: {}, pecas: {} };
  invNiveis = {};
  if (!invConta || !invConta.save) {
    box.innerHTML = '<div class="adm-note">Esta conta ainda não subiu o inventário para a nuvem. ' +
      "Peça para a pessoa abrir o jogo uma vez com internet.</div>";
    return;
  }
  invRender();
}
function invSave() { return (invConta && invConta.save) || {}; }

function invRender() {
  const box = $("inv-box");
  const sv = invSave();
  box.innerHTML = "";

  const resumo = document.createElement("div");
  resumo.className = "inv-resumo";
  resumo.innerHTML =
    "<div><b>" + fmt(sv.crystals || 0) + "</b><span>CRISTAIS</span></div>" +
    "<div><b>" + ((sv.ships || []).length) + "</b><span>NAVES</span></div>" +
    "<div><b>" + ((sv.amulets || []).length) + "</b><span>AMULETOS</span></div>" +
    "<div><b>" + (Object.keys(sv.skills || {}).length) + "</b><span>HABILIDADES</span></div>";
  box.appendChild(resumo);

  const abas = document.createElement("div");
  abas.className = "inv-abas";
  const defs = [["naves", "✈ NAVES"], ["amuletos", "◈ AMULETOS"], ["hab", "✦ HABILIDADES"],
                ["melhorias", "⬡ MELHORIAS"], ["pecas", "⚙ PEÇAS"], ["cristais", "◆ CRISTAIS"]];
  for (const [id, txt] of defs) {
    const b = document.createElement("button");
    b.className = "inv-aba" + (invAba === id ? " on" : "");
    b.textContent = txt;
    b.addEventListener("click", () => { invAba = id; invRender(); });
    abas.appendChild(b);
  }
  box.appendChild(abas);

  const lista = document.createElement("div");
  lista.className = "inv-lista";
  box.appendChild(lista);

  const item = (conteudo, marcado, aoTocar, canvasNave) => {
    const row = document.createElement("div");
    row.className = "inv-item" + (marcado ? " marcado" : "");
    if (canvasNave !== undefined) {
      const cv = document.createElement("canvas");
      cv.width = 60; cv.height = 60;
      const c2 = cv.getContext("2d");
      c2.setTransform(1.7, 0, 0, 1.7, 30, 32);
      try { drawShipSprite(c2, naveValida(canvasNave), 12); } catch (e) {}
      row.appendChild(cv);
    }
    const t = document.createElement("div");
    t.className = "t";
    t.innerHTML = conteudo;
    row.appendChild(t);
    if (aoTocar) {
      const x = document.createElement("button");
      x.className = "inv-x" + (marcado ? " on" : "");
      x.textContent = marcado ? "✓" : "✕";
      x.title = "Tirar este item";
      x.addEventListener("click", aoTocar);
      row.appendChild(x);
    }
    lista.appendChild(row);
    return row;
  };

  if (invAba === "naves") {
    const ships = (sv.ships || []).slice().sort((a, b) => a - b);
    if (!ships.length) lista.innerHTML = '<div class="adm-note">Sem naves.</div>';
    for (const i of ships) {
      const nave = SHIPS[i];
      item("<b>" + escaparTexto(nave ? nave.name : "Nave " + i) + "</b><span>nº " + i +
           (i === sv.ship ? " · em uso" : "") + (naveExclusiva(i) ? " · exclusiva" : "") + "</span>",
        !!invMarcado.naves[i],
        () => { if (invMarcado.naves[i]) delete invMarcado.naves[i]; else invMarcado.naves[i] = 1; invRender(); },
        i);
    }
  } else if (invAba === "amuletos") {
    const am = sv.amulets || [];
    if (!am.length) lista.innerHTML = '<div class="adm-note">Sem amuletos.</div>';
    for (const a of am) {
      const d = amuletDef(a);
      const r = RARS[a.rar] || RARS[0];
      const eq = (sv.equipped || []).indexOf(a.uid) >= 0;
      item('<b style="color:' + r.color + '">' + escaparTexto(d.name) + "</b><span>" +
           escaparTexto(r.name) + (eq ? " · equipado" : "") + "</span>",
        !!invMarcado.amuletos[a.uid],
        () => { if (invMarcado.amuletos[a.uid]) delete invMarcado.amuletos[a.uid];
                else invMarcado.amuletos[a.uid] = 1; invRender(); });
    }
  } else if (invAba === "hab") {
    const ids = Object.keys(sv.skills || {});
    if (!ids.length) lista.innerHTML = '<div class="adm-note">Nenhuma habilidade liberada.</div>';
    for (const id of ids) {
      const ramo = BRANCHES.find(b => id.indexOf(b.id) === 0);
      const tier = parseInt(id.replace(/^[a-z]+/, ""), 10);
      const marco = ramo && MILESTONES[ramo.id] && MILESTONES[ramo.id][tier];
      item('<b style="color:' + (ramo ? ramo.color : "#fff") + '">' +
           (marco ? escaparTexto(marco.name) : "Nível " + tier) + "</b><span>" +
           (ramo ? ramo.name : id) + " · nó " + tier + "</span>",
        !!invMarcado.hab[id],
        () => { if (invMarcado.hab[id]) delete invMarcado.hab[id]; else invMarcado.hab[id] = 1; invRender(); });
    }
  } else if (invAba === "melhorias") {
    for (const u of UPGRADES) {
      const atual = (sv.upgrades || {})[u.id] || 0;
      const alvo = invNiveis[u.id] !== undefined ? invNiveis[u.id] : atual;
      const row = document.createElement("div");
      row.className = "inv-item" + (alvo !== atual ? " marcado" : "");
      row.innerHTML = '<div class="t"><b>' + u.icon + " " + escaparTexto(u.name) +
        "</b><span>tem " + atual + " de " + u.max + "</span></div>";
      const nv = document.createElement("div");
      nv.className = "inv-nivel";
      const menos = document.createElement("button"); menos.textContent = "−";
      const val = document.createElement("b"); val.textContent = alvo + "/" + u.max;
      const mais = document.createElement("button"); mais.textContent = "+";
      menos.addEventListener("click", () => {
        invNiveis[u.id] = Math.max(0, (invNiveis[u.id] !== undefined ? invNiveis[u.id] : atual) - 1);
        invRender();
      });
      mais.addEventListener("click", () => {
        invNiveis[u.id] = Math.min(u.max, (invNiveis[u.id] !== undefined ? invNiveis[u.id] : atual) + 1);
        invRender();
      });
      nv.appendChild(menos); nv.appendChild(val); nv.appendChild(mais);
      row.appendChild(nv);
      lista.appendChild(row);
    }
  } else if (invAba === "pecas") {
    const ids = Object.keys(sv.parts || {});
    if (!ids.length) lista.innerHTML = '<div class="adm-note">Nenhuma peça instalada.</div>';
    for (const i of ids) {
      const p = sv.parts[i] || {};
      const txt = PARTS.map(pt => pt.icon + (p[pt.id] || 0)).join("  ");
      item("<b>" + escaparTexto((SHIPS[i] || {}).name || "Nave " + i) + "</b><span>" + txt + "</span>",
        !!invMarcado.pecas[i],
        () => { if (invMarcado.pecas[i]) delete invMarcado.pecas[i]; else invMarcado.pecas[i] = 1; invRender(); },
        +i);
    }
  } else if (invAba === "cristais") {
    const row = document.createElement("div");
    row.className = "inv-item";
    row.innerHTML = '<div class="t"><b>◆ ' + fmt(sv.crystals || 0) +
      "</b><span>cristais na conta</span></div>";
    lista.appendChild(row);
    const linha = document.createElement("div");
    linha.className = "adm-row";
    linha.style.marginTop = "8px";
    linha.innerHTML = '<input id="inv-tirar-qtd" type="number" inputmode="numeric" placeholder="Quantos tirar" value="1000">';
    const bt = document.createElement("button");
    bt.className = "adm-btn danger";
    bt.textContent = "TIRAR";
    bt.addEventListener("click", async () => {
      const n = Math.max(0, parseInt($("inv-tirar-qtd").value, 10) || 0);
      if (!n) return;
      admMsg("Tirando…");
      await admNuvemPresente({ tirarCristais: n }, "Cristais retirados");
      await invCarregar();
      admMsg("Tirados ◆ " + fmt(n));
      AudioSys.buy();
    });
    linha.appendChild(bt);
    lista.appendChild(linha);
    const tudo = document.createElement("button");
    tudo.className = "adm-btn danger";
    tudo.style.marginTop = "8px";
    tudo.textContent = "TIRAR TODOS OS CRISTAIS";
    tudo.addEventListener("click", async () => {
      admMsg("Zerando…");
      await admNuvemPresente({ setCristais: 0 }, "Cristais zerados");
      await invCarregar();
      AudioSys.buy();
    });
    lista.appendChild(tudo);
  }

  if (invAba !== "cristais") {
    const n = invContarMarcados();
    const acoes = document.createElement("div");
    acoes.className = "inv-acoes";
    const agora = document.createElement("button");
    agora.className = "adm-btn danger";
    agora.textContent = n ? "✕ TIRAR AGORA (" + n + ")" : "✕ TIRAR AGORA";
    agora.disabled = !n;
    agora.addEventListener("click", invTirarAgora);
    const limpar = document.createElement("button");
    limpar.className = "adm-btn";
    limpar.textContent = "DESMARCAR";
    limpar.addEventListener("click", () => {
      invMarcado = { naves: {}, amuletos: {}, hab: {}, pecas: {} };
      invNiveis = {};
      invRender();
    });
    acoes.appendChild(agora); acoes.appendChild(limpar);
    box.appendChild(acoes);

    const dica = document.createElement("p");
    dica.className = "adm-note";
    dica.style.marginTop = "8px";
    /* o botão "pôr na caixa em vez de tirar agora" saiu daqui: tirar é
       sempre na hora, e ter as duas saídas era a própria confusão */
    dica.innerHTML = n
      ? "<b>" + n + "</b> item(ns) marcado(s). <b>TIRAR AGORA</b> apaga da conta na hora."
      : "Toque no <b>✕</b> de cada item para marcar o que quer tirar.";
    box.appendChild(dica);
  }
}
function invMontarRetirada() {
  const sv = invSave();
  const naves = Object.keys(invMarcado.naves).map(Number);
  const amuletos = Object.keys(invMarcado.amuletos).map(Number);
  const hab = Object.keys(invMarcado.hab);
  const pecas = Object.keys(invMarcado.pecas).map(Number);
  const ups = {};
  for (const u of UPGRADES) {
    const atual = (sv.upgrades || {})[u.id] || 0;
    if (invNiveis[u.id] !== undefined && invNiveis[u.id] !== atual) ups[u.id] = invNiveis[u.id];
  }
  const p = {};
  if (naves.length) p.remNaves = naves;
  if (amuletos.length) p.remAmuletos = amuletos;
  if (hab.length) p.remHab = hab;
  if (pecas.length) p.remPecas = pecas;
  if (Object.keys(ups).length) p.remUp = ups;
  return p;
}
function invContarMarcados() {
  const p = invMontarRetirada();
  return (p.remNaves || []).length + (p.remAmuletos || []).length +
         (p.remHab || []).length + (p.remPecas || []).length +
         Object.keys(p.remUp || {}).length;
}
/* tira na hora: monta, envia e recarrega o inventário — sem passar pela caixa */
async function invTirarAgora() {
  const p = invMontarRetirada();
  if (!invContarMarcados()) { admMsg("Marque o que quer tirar primeiro."); AudioSys.deny(); return; }
  admMsg("Tirando…");
  await admNuvemPresente(p, "Itens retirados");
  invMarcado = { naves: {}, amuletos: {}, hab: {}, pecas: {} };
  invNiveis = {};
  await invCarregar();
  admMsg("Pronto: os itens saíram da conta.");
  AudioSys.buy();
}
/* invMandarParaCaixa() foi embora: tirar coisa de alguém não é presente,
   então não passa mais pela caixa. O caminho é um só, o TIRAR AGORA. */
$("inv-abrir").addEventListener("click", invCarregar);

/* =====================================================================
   COMO O QUE VOCÊ TOCAR É ENTREGUE
   ---------------------------------------------------------------------
   Antes TUDO ia para a caixa: você tocava em DAR e nada visível
   acontecia -- o item ficava guardado esperando você ir até a abinha
   CAIXA, escrever um recado e enviar. Três telas para dar dez mil
   cristais, e a queixa foi exatamente essa: "tá muito complicado dar
   coisas".

   Agora o normal é NA HORA. O pacote continua existindo, porque
   presente com recado é outra coisa e vale a pena -- mas virou escolha,
   não pedágio.                                                        */
let admModo = "agora";                 // "agora" | "caixa"

function admModoRender() {
  const cx = $("adm-modo");
  if (!cx) return;
  cx.querySelectorAll("[data-modo]").forEach(b =>
    b.classList.toggle("on", b.getAttribute("data-modo") === admModo));
  const nota = $("dar-nota");
  if (nota) {
    nota.innerHTML = admModo === "agora"
      ? "Tudo o que você tocar aqui <b>cai na conta na hora</b>."
      : "Tudo o que você tocar aqui vai para a <b>caixa</b>. " +
        "Termine na abinha 📦 CAIXA: escreva o recado e envie.";
  }
}
(function ligarModo() {
  const cx = $("adm-modo");
  if (!cx) return;
  cx.querySelectorAll("[data-modo]").forEach(b =>
    b.addEventListener("click", () => {
      admModo = b.getAttribute("data-modo");
      admModoRender();
      renderCaixaAdm();
    }));
  admModoRender();
})();

/* O caminho ÚNICO de dar. Cada botão de DAR chama esta função e ela
   decide -- em vez de vinte botões cada um sabendo do modo, que é como
   um deles um dia ficaria para trás. */
function admDar(presente, msg) {
  if (admModo === "caixa") { porNaCaixa(presente, msg); return; }
  admNuvemPresente(presente, msg);
}

/* ----- caixa montada pelo administrador ----- */
let caixaAdm = {};
const CAIXA_ROTULOS = {
  cristais:    v => ["◆", (v > 0 ? "+" : "") + fmt(v) + " cristais", v < 0],
  setCristais: v => ["◆", "Definir cristais em " + fmt(v), v === 0],
  setFase:     v => ["▶", "Definir fase em " + v, false],
  setRank:     v => [simboloDoRank(v), "Rank " + nomeDoRank(v), false],
  naves:       () => ["✈", "Todas as naves", false],
  fases:       () => ["▶", "Todas as fases", false],
  habilidades: () => ["✦", "Todas as habilidades", false],
  melhorias:   () => ["⬡", "Melhorias e peças no máximo", false],
  lendarios:   () => ["◈", "3 amuletos lendários", false],
  tudo:        () => ["★", "TUDO desbloqueado", false],
  exclusiva:   v => ["★", "Aeronave" + (listaExclusivas(v).length > 1 ? "s " : " ") +
                          listaExclusivas(v).map(i => SHIPS[i].name).join(" e "), false],
  god:         v => ["⚡", v ? "Modo invencível ligado" : "Modo invencível desligado", !v],
  tirarNaves:  () => ["⚠", "Tirar todas as naves", true],
  zerarFases:  () => ["⚠", "Zerar as fases", true],
  zerarHabilidades: () => ["⚠", "Zerar as habilidades", true],
  zerarAmuletos:    () => ["⚠", "Tirar os amuletos", true],
  zerarTudo:   () => ["⚠", "ZERAR TODO o progresso", true],
  remNaves:    v => ["⚠", "Tirar " + v.length + " nave(s): " +
                          v.slice(0, 3).map(i => (SHIPS[i] || {}).name || i).join(", ") +
                          (v.length > 3 ? "…" : ""), true],
  remAmuletos: v => ["⚠", "Tirar " + v.length + " amuleto(s)", true],
  remHab:      v => ["⚠", "Tirar " + v.length + " habilidade(s)", true],
  remPecas:    v => ["⚠", "Tirar as peças de " + v.length + " nave(s)", true],
  remUp:       v => ["⚠", "Mexer em " + Object.keys(v).length + " melhoria(s)", true],
  tirarCristais: v => ["⚠", "Tirar " + fmt(v) + " cristais", true],
  limparNaves: () => ["🛠", "Desfazer as naves montadas (devolve os cristais)", true]
};
function renderCaixaAdm() {
  const box = $("caixa-itens");
  const chaves = Object.keys(caixaAdm);
  $("caixa-vazia").style.display = chaves.length ? "none" : "block";
  box.innerHTML = "";
  for (const k of chaves) {
    const f = CAIXA_ROTULOS[k];
    if (!f) continue;
    const [icone, texto, ruim] = f(caixaAdm[k]);
    const row = document.createElement("div");
    row.className = "caixa-item" + (ruim ? " ruim" : "");
    row.innerHTML = "<b>" + icone + "</b><span>" + texto + "</span>";
    const x = document.createElement("button");
    x.className = "caixa-x";
    x.textContent = "✕";
    x.addEventListener("click", () => { delete caixaAdm[k]; renderCaixaAdm(); });
    row.appendChild(x);
    box.appendChild(row);
  }
  $("caixa-enviar").textContent = chaves.length
    ? "📦 ENVIAR (" + chaves.length + ")" : "📦 ENVIAR A CAIXA";
  try { if (abaAdm === "acoes") renderSubAcoes(); } catch (e) {}
}
/* o que é RETIRADA nunca entra na caixa. Uma lista só, aqui, porque
   espalhar essa regra por vinte botões é garantir que um dia um deles
   escape e alguém receba uma caixinha de presente para descobrir que
   perdeu as naves. */
const CHAVES_DE_TIRAR = ["remNaves", "remAmuletos", "remHab", "remUp", "remPecas",
                         "tirarCristais", "tirarNaves", "zerarFases", "zerarHabilidades",
                         "zerarAmuletos", "zerarTudo", "limparNaves"];
function ehRetirada(presente) {
  if (!presente) return false;
  if (presente.setCristais === 0) return true;
  return CHAVES_DE_TIRAR.some(k => presente[k] !== undefined);
}

function porNaCaixa(presente, msg) {
  if (ehRetirada(presente)) {
    admMsg("Tirar é sempre na hora — não vai em pacote de presente.");
    try { AudioSys.deny(); } catch (e) {}
    return;
  }
  if (!admNuvemAlvo) { admMsg("Escolha um jogador online."); return; }
  for (const k in presente) {
    if (k === "cristais" && caixaAdm.cristais) caixaAdm.cristais += presente[k];
    else if (k === "exclusiva") {
      const juntas = listaExclusivas(caixaAdm.exclusiva).concat(listaExclusivas(presente[k]));
      caixaAdm.exclusiva = juntas.filter((v, i) => juntas.indexOf(v) === i);
    }
    else caixaAdm[k] = presente[k];
  }
  // itens que se anulam não convivem na mesma caixa
  const opostos = [["naves","tirarNaves"],["fases","zerarFases"],
                   ["habilidades","zerarHabilidades"],["lendarios","zerarAmuletos"],
                   ["cristais","setCristais"],["tudo","zerarTudo"]];
  for (const [a, b2] of opostos) {
    if (presente[a] !== undefined) delete caixaAdm[b2];
    if (presente[b2] !== undefined) delete caixaAdm[a];
  }
  if (caixaAdm.zerarTudo) caixaAdm = { zerarTudo: true };
  renderCaixaAdm();
  admMsg(msg + " → na caixa");
  AudioSys.tone(700, 0.07, "sine", 0.1);
}
/* ----- recado que vai dentro da caixa ----- */
const RECADOS_CAIXA = [
  "Obrigado por jogar! 🎁",
  "Presente de hoje, aproveite!",
  "Parabéns pelo progresso!",
  "Bom jogo! 🚀",
  "Um empurrãozinho para a próxima fase",
  "Você mereceu 💪",
  "Feliz aniversário! 🎂",
  "Desculpa pelo problema de ontem"
];
function renderRecadosCaixa() {
  const cx = $("caixa-prontos");
  if (!cx) return;
  cx.innerHTML = "";
  for (const t of RECADOS_CAIXA) {
    const b = document.createElement("button");
    b.className = "cx-pronto";
    b.textContent = t;
    b.addEventListener("click", () => { $("caixa-msg").value = t; });
    cx.appendChild(b);
  }
}
renderRecadosCaixa();
function recadoDaCaixa() { return ($("caixa-msg").value || "").trim().slice(0, 200); }

$("caixa-limpar").addEventListener("click", () => {
  caixaAdm = {};
  $("caixa-msg").value = "";
  renderCaixaAdm();
  admMsg("Caixa esvaziada");
});
$("caixa-enviar").addEventListener("click", async () => {
  if (!Object.keys(caixaAdm).length) { admMsg("A caixa está vazia."); AudioSys.deny(); return; }
  const pacote = Object.assign({}, caixaAdm);
  const msg = recadoDaCaixa();
  if (msg) pacote.msg = msg;
  caixaAdm = {};
  renderCaixaAdm();
  await admNuvemPresente(pacote, "Caixa enviada");
});

/* ----- a mesma caixa, para todos os jogadores de uma vez ----- */
let confirmaTodos = false;
$("caixa-todos").addEventListener("click", async () => {
  const chaves = Object.keys(caixaAdm);
  if (!chaves.length) { admMsg("Monte a caixa primeiro."); AudioSys.deny(); return; }
  if (caixaAdm.zerarTudo) {
    admMsg("Zerar todo mundo de uma vez não dá — faça um por um.");
    AudioSys.deny();
    return;
  }
  if (!confirmaTodos) {
    confirmaTodos = true;
    $("caixa-todos").textContent = "TOQUE DE NOVO PARA CONFIRMAR";
    admMsg("Isso vai para TODOS os jogadores. Toque de novo para confirmar.");
    setTimeout(() => {
      confirmaTodos = false;
      $("caixa-todos").textContent = "🌍 ENVIAR PARA TODO MUNDO";
    }, 5000);
    return;
  }
  confirmaTodos = false;
  $("caixa-todos").textContent = "🌍 ENVIAR PARA TODO MUNDO";

  const dias = Math.max(1, parseInt($("caixa-geral-dias").value, 10) || 7);
  const pacote = Object.assign({}, caixaAdm);
  const msg = recadoDaCaixa();
  if (msg) pacote.msg = msg;
  pacote.quando = Date.now();
  pacote.ate = Date.now() + dias * 86400000;

  admMsg("Enviando para todo mundo…");
  const ok = await mundoEscrever("geral", pacote);
  if (!ok) return;
  caixaAdm = {};
  $("caixa-msg").value = "";
  renderCaixaAdm();
  renderPresenteGeral();
  admMsg("Enviado para TODOS! Vale por " + dias + " dia(s).");
  AudioSys.victory();
});

function renderPresenteGeral() {
  const cx = $("cx-geral");
  if (!cx) return;
  const g = MUNDO.geral;
  if (!g || !g.quando || (g.ate && g.ate < Date.now())) { cx.innerHTML = ""; return; }
  const itens = Object.keys(g).filter(k => ["quando", "ate", "msg"].indexOf(k) < 0);
  const nomes = itens.map(k => {
    const f = CAIXA_ROTULOS[k];
    try { return f ? f(g[k])[1] : k; } catch (e) { return k; }
  });
  cx.innerHTML = '<div class="aviso">🌍 <b>Presente geral no ar</b> — ' +
    escaparTexto(nomes.join(", ")) + (g.msg ? '<br>✉ "' + escaparLongo(g.msg) + '"' : "") +
    "<br>Vale por mais <b>" + tempoRestante(g.ate) + "</b>. Quem abrir o jogo até lá recebe.</div>";
  const parar = document.createElement("button");
  parar.className = "adm-btn danger";
  parar.style.marginTop = "8px";
  parar.style.width = "100%";
  parar.textContent = "PARAR O PRESENTE GERAL";
  parar.addEventListener("click", async () => {
    await mundoApagar("geral");
    renderPresenteGeral();
    admMsg("Presente geral encerrado");
  });
  cx.appendChild(parar);
}

/* Aplica a mudança JÁ na conta guardada na nuvem.
   Sem isto, tirar um item só valia quando a pessoa abrisse o jogo — e no
   painel parecia que nada tinha acontecido, porque o inventário lido da
   nuvem continuava igual.                                                 */
async function admAplicarNaConta(nome, presente) {
  if (!nome) return false;
  const conta = await nuvemReq("contas/" + contaId(nome));
  if (!conta || !conta.save) return false;
  const copia = JSON.parse(JSON.stringify(conta.save));
  try { aplicarPresente(copia, presente); } catch (e) { return false; }
  conta.save = copia;
  conta.atualizado = Date.now();
  await nuvemReq("contas/" + contaId(nome), {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(conta)
  });
  if (invConta && invConta.nome === conta.nome) { invConta = conta; invRender(); }
  return true;
}

async function admNuvemPresente(presente, msg) {
  if (!admNuvemAlvo) { admMsg("Escolha um jogador online."); return; }
  admMsg("Enviando…");
  const ok = await nuvemEnviarPresente(admNuvemAlvo.id, presente);
  if (ok === null) { admMsg("Não deu para enviar. Confira a conexão."); AudioSys.deny(); return; }
  await admAplicarNaConta(admNuvemAlvo.nome, presente);
  // reflete na hora no registro público
  const atual = Object.assign({}, admNuvemAlvo);
  admEfeitoImediato(atual, presente);
  atual.atualizado = Date.now();
  delete atual.id;
  await nuvemReq("pilotos/" + admNuvemAlvo.id, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(atual)
  });
  Object.assign(admNuvemAlvo, atual);
  const i = admNuvemLista.findIndex(x => x.id === admNuvemAlvo.id);
  if (i >= 0) Object.assign(admNuvemLista[i], atual);
  admMsg(msg + " → " + admNuvemAlvo.nome);
  AudioSys.buy();
  vibrate(20);
  admNuvemSelecionar(admNuvemAlvo);
}
/* Ações destrutivas pedem dois toques e acontecem NA HORA.
   Antes iam para a caixa e chegavam embrulhadas de presente, o que é o
   contrário do que tirar significa. Os dois toques ficam: o perigo aqui
   é o dedo escorregar, não a demora. */
let admNuvemConfirmar = null;
function admNuvemPerigo(chave, presente, msg, aviso) {
  if (admNuvemConfirmar !== chave) {
    admNuvemConfirmar = chave;
    admMsg("Toque de novo para " + aviso + " AGORA.");
    setTimeout(() => { if (admNuvemConfirmar === chave) admNuvemConfirmar = null; }, 4000);
    return;
  }
  admNuvemConfirmar = null;
  admNuvemPresente(presente, msg);
}
$("adm-nuvem-load").addEventListener("click", admNuvemCarregar);
$("adm-nuvem-busca").addEventListener("input", vivoRender);
/* dar — o caminho é um só: admDar() decide entre a hora e o pacote */
$("adm-nuvem-dar").addEventListener("click", () =>
  admDar({ cristais: admNum("adm-nuvem-gem", 0) }, "Cristais"));
$("adm-nuvem-set").addEventListener("click", () =>
  admDar({ setCristais: Math.max(0, admNum("adm-nuvem-gem", 0)) }, "Definir cristais"));
$("adm-nuvem-fase-set").addEventListener("click", () =>
  admDar({ setFase: clamp(admNum("adm-nuvem-fase", 0), 0, TOTAL_FASES) }, "Definir fase"));
$("adm-nuvem-naves").addEventListener("click", () =>
  admDar({ naves: true }, "Naves"));
$("adm-nuvem-fases").addEventListener("click", () =>
  admDar({ fases: true }, "Fases"));
$("adm-nuvem-hab").addEventListener("click", () =>
  admDar({ habilidades: true }, "Habilidades"));
$("adm-nuvem-melhorias").addEventListener("click", () =>
  admDar({ melhorias: true }, "Melhorias"));
$("adm-nuvem-lend").addEventListener("click", () =>
  admDar({ lendarios: true }, "Lendários"));
$("adm-nuvem-tudo").addEventListener("click", () =>
  admDar({ tudo: true }, "Tudo"));
$("adm-nuvem-rank").addEventListener("click", () => {
  const v = parseInt($("adm-nuvem-rank-sel").value, 10) || 0;
  admDar({ setRank: v }, "Rank " + nomeDoRank(v));
});
$("adm-nuvem-maverick").addEventListener("click", () =>
  admDar({ exclusiva: MAVERICK }, "Maverick"));
$("adm-nuvem-b2").addEventListener("click", () =>
  admDar({ exclusiva: B2 }, "B-2 Spirit"));
$("adm-nuvem-omega").addEventListener("click", () =>
  admDar({ exclusiva: OMEGA }, "Ômega-9 Arsenal"));
$("adm-nuvem-privada").addEventListener("click", () =>
  admDar({ exclusiva: PRIVADA }, "Trono Real"));

/* tirar e zerar (dois toques) */
$("adm-nuvem-gem-zero").addEventListener("click", () =>
  admNuvemPerigo("gem", { setCristais: 0 }, "Cristais zerados", "zerar os cristais"));
$("adm-nuvem-naves-zero").addEventListener("click", () =>
  admNuvemPerigo("naves", { tirarNaves: true }, "Naves removidas", "tirar todas as naves"));
$("adm-nuvem-fases-zero").addEventListener("click", () =>
  admNuvemPerigo("fases", { zerarFases: true }, "Fases zeradas", "zerar as fases"));
$("adm-nuvem-hab-zero").addEventListener("click", () =>
  admNuvemPerigo("hab", { zerarHabilidades: true }, "Habilidades zeradas", "zerar as habilidades"));
$("adm-nuvem-amu-zero").addEventListener("click", () =>
  admNuvemPerigo("amu", { zerarAmuletos: true }, "Amuletos removidos", "tirar os amuletos"));
$("adm-nuvem-zerar").addEventListener("click", () =>
  admNuvemPerigo("tudo", { zerarTudo: true }, "Jogador zerado", "ZERAR TODO o progresso"));

/* outros */
$("adm-nuvem-god-on").addEventListener("click", () =>
  admDar({ god: true }, "Invencibilidade"));
$("adm-nuvem-god-off").addEventListener("click", () =>
  admDar({ god: false }, "Tirar invencibilidade"));
/* esconder (ou trazer de volta) um piloto das tabelas, sem apagar nada */
$("adm-nuvem-ocultar").addEventListener("click", async () => {
  if (!admNuvemAlvo) { admMsg("Escolha um jogador."); return; }
  const agora = !ficaDeForaDoRanking(admNuvemAlvo);
  const fixo = OCULTOS_FIXOS.indexOf(String(admNuvemAlvo.nome).trim().toLowerCase()) >= 0;
  if (fixo && !agora) {
    admMsg(admNuvemAlvo.nome + " é conta do administrador: fica sempre fora das tabelas.");
    AudioSys.deny();
    return;
  }
  await nuvemJuntar("pilotos/" + admNuvemAlvo.id, { oculto: agora });
  admNuvemAlvo.oculto = agora;
  admMsg(admNuvemAlvo.nome + (agora ? " não aparece mais nas tabelas" : " voltou para as tabelas"));
  AudioSys.buy();
  cacheRanking = null;
  admNuvemAtualizarBotaoOcultar();
  admNuvemCarregar();
});
function admNuvemAtualizarBotaoOcultar() {
  const b = $("adm-nuvem-ocultar");
  if (!b) return;
  const fixo = admNuvemAlvo &&
    OCULTOS_FIXOS.indexOf(String(admNuvemAlvo.nome).trim().toLowerCase()) >= 0;
  const fora = admNuvemAlvo ? ficaDeForaDoRanking(admNuvemAlvo) : false;
  b.disabled = !!fixo;
  b.textContent = fixo ? "🔒 SEMPRE FORA DAS TABELAS"
                       : (fora ? "👁 MOSTRAR NO RANKING" : "🙈 ESCONDER DO RANKING");
  b.classList.toggle("gold", fora && !fixo);
  b.title = fixo ? "Conta do administrador: nunca entra nas tabelas."
                 : "Tira ou devolve este piloto às tabelas do ranking.";
}
$("adm-nuvem-naves-criadas").addEventListener("click", () =>
  admNuvemPerigo("montadas", { limparNaves: true }, "Naves montadas desfeitas",
                 "desfazer as naves montadas"));
$("adm-nuvem-cancelar").addEventListener("click", async () => {
  if (!admNuvemAlvo) return;
  await nuvemCancelarComando(admNuvemAlvo.id);
  admMsg("Pendências canceladas → " + admNuvemAlvo.nome);
  AudioSys.buy();
  admNuvemVerPendente();
});
$("adm-nuvem-remover").addEventListener("click", async () => {
  if (!admNuvemAlvo) return;
  if (admNuvemConfirmar !== "remover") {
    admNuvemConfirmar = "remover";
    admMsg("Toque de novo para apagar " + admNuvemAlvo.nome + " do ranking.");
    setTimeout(() => { if (admNuvemConfirmar === "remover") admNuvemConfirmar = null; }, 4000);
    return;
  }
  admNuvemConfirmar = null;
  const nome = admNuvemAlvo.nome;
  await nuvemApagarDoRanking(admNuvemAlvo.id);
  admNuvemAlvo = null;
  $("adm-nuvem-sel").style.display = "none";
  admMsg(nome + " apagado do ranking");
  AudioSys.buy();
  admNuvemCarregar();
});

/* ---- ações rápidas ---- */
$("adm-tudo").addEventListener("click", () => admAct(admDesbloquearTudo, "Tudo desbloqueado"));
$("adm-god").addEventListener("click", () => admAct(p => { p.godMode = !p.godMode; },
  "Modo invencível alternado"));
$("adm-usar").addEventListener("click", () => {
  if (!admTarget) return;
  loginAs(admTarget);
  AudioSys.buy();
  S.mode = "menu";
  refreshMenu();
  showScreen("menu");
});

/* ---- cristais ---- */
$("adm-gem-add").addEventListener("click", () =>
  admAct(p => { p.crystals = Math.max(0, (p.crystals || 0) + admNum("adm-gem-val", 0)); },
    "Cristais adicionados"));
$("adm-gem-set").addEventListener("click", () =>
  admAct(p => { p.crystals = Math.max(0, admNum("adm-gem-val", 0)); }, "Cristais definidos"));
$("adm-gem-zero").addEventListener("click", () => admAct(p => { p.crystals = 0; }, "Cristais zerados"));
document.querySelectorAll("[data-gem]").forEach(b =>
  b.addEventListener("click", () => {
    const v = parseInt(b.dataset.gem, 10);
    admAct(p => { p.crystals = (p.crystals || 0) + v; }, "+" + fmt(v) + " cristais");
  }));

/* ---- progresso ---- */
$("adm-fase-set").addEventListener("click", () =>
  admAct(p => {
    p.best = clamp(admNum("adm-fase-val", 0), 0, TOTAL_FASES);
    p.pts = Math.max(p.pts || 0, p.best);
  }, "Fase definida"));
$("adm-pts-set").addEventListener("click", () =>
  admAct(p => { p.pts = Math.max(0, admNum("adm-pts-val", 0)); }, "Pontos definidos"));
$("adm-hi-set").addEventListener("click", () =>
  admAct(p => { p.hi = Math.max(0, admNum("adm-hi-val", 0)); }, "Recorde definido"));
function preencherRanks() {
  const sel = $("adm-rank-sel");
  if (sel && !sel.options.length) sel.innerHTML = RANKS.map(r =>
    '<option value="' + r.min + '">' + r.sim + " " + r.nome + " (" + r.min + " pts)</option>").join("");
  const sel2 = $("adm-nuvem-rank-sel");
  if (sel2 && !sel2.options.length) sel2.innerHTML = RANKS.map(r =>
    '<option value="' + r.min + '">' + r.sim + " " + r.nome + "</option>").join("");
}
$("adm-rank-set").addEventListener("click", () =>
  admAct(p => { p.rank = Math.max(0, admNum("adm-rank-val", 0)); }, "Rank definido"));
$("adm-rank-dar").addEventListener("click", () => {
  const v = parseInt($("adm-rank-sel").value, 10) || 0;
  admAct(p => { p.rank = v; }, "Rank " + nomeDoRank(v) + " entregue");
});
$("adm-rank-zero").addEventListener("click", () =>
  admAct(p => { p.rank = 0; p.vitorias = 0; p.derrotas = 0; }, "Rank zerado"));
$("adm-vitorias").addEventListener("click", () =>
  admAct(p => { p.vitorias = (p.vitorias || 0) + 10; }, "+10 vitórias"));
$("adm-coop-set").addEventListener("click", () =>
  admAct(p => { p.coopBest = clamp(admNum("adm-coop-val", 0), 0, FASES_COOP); }, "Cooperativo definido"));
$("adm-fases-all").addEventListener("click", () =>
  admAct(p => { p.best = TOTAL_FASES; p.pts = Math.max(p.pts || 0, TOTAL_FASES); }, "Todas as fases liberadas"));
$("adm-fases-zero").addEventListener("click", () =>
  admAct(p => { p.best = 0; }, "Fases zeradas"));

/* ---- naves e oficina ---- */
$("adm-ship-give").addEventListener("click", () => {
  const i = parseInt($("adm-ship-sel").value, 10) || 0;
  admAct(p => {
    if (p.ships.indexOf(i) < 0) p.ships.push(i);
    p.ship = i;
  }, "Nave " + SHIPS[i].name + " entregue");
});
$("adm-maverick").addEventListener("click", () =>
  admAct(p => {
    if (p.ships.indexOf(MAVERICK) < 0) p.ships.push(MAVERICK);
    p.ship = MAVERICK;
  }, "Maverick entregue"));
$("adm-b2").addEventListener("click", () =>
  admAct(p => {
    if (p.ships.indexOf(B2) < 0) p.ships.push(B2);
    p.ship = B2;
  }, "B-2 Spirit entregue"));
$("adm-omega").addEventListener("click", () =>
  admAct(p => {
    if (p.ships.indexOf(OMEGA) < 0) p.ships.push(OMEGA);
    p.ship = OMEGA;
  }, "Ômega-9 Arsenal entregue"));
$("adm-privada").addEventListener("click", () =>
  admAct(p => {
    if (p.ships.indexOf(PRIVADA) < 0) p.ships.push(PRIVADA);
    p.ship = PRIVADA;
  }, "Trono Real entregue"));
$("adm-ships-all").addEventListener("click", () =>
  admAct(p => { p.ships = []; for (let i = 0; i < MAVERICK; i++) p.ships.push(i); }, "Todas as naves"));
$("adm-ships-zero").addEventListener("click", () =>
  admAct(p => { p.ships = [0]; p.ship = 0; }, "Só a nave inicial"));
$("adm-parts-max").addEventListener("click", () =>
  admAct(p => {
    for (const i of p.ships) {
      p.parts[i] = p.parts[i] || {};
      for (const part of PARTS) p.parts[i][part.id] = PART_MAX;
    }
  }, "Peças no máximo"));
$("adm-shop-max").addEventListener("click", () =>
  admAct(p => { for (const u of UPGRADES) p.upgrades[u.id] = u.max; }, "Melhorias no máximo"));
$("adm-paint-all").addEventListener("click", () =>
  admAct(p => {
    for (let i = 0; i < 50; i++) {
      p.paints[i] = PAINT_HUES.slice();
      p.glows[i] = PAINT_HUES.slice();
      p.weapons[i] = WEAPONS.map(w => w.id);
    }
  }, "Pinturas e armas liberadas"));

/* ---- habilidades ---- */
$("adm-skills-all").addEventListener("click", () =>
  admAct(p => {
    p.skills = {};
    for (const b of ["atk", "def", "res"]) for (let t = 1; t <= 40; t++) p.skills[b + t] = true;
    p.pts = Math.max(p.pts || 0, 120);
  }, "120 habilidades desbloqueadas"));
$("adm-skills-zero").addEventListener("click", () =>
  admAct(p => { p.skills = {}; }, "Árvore limpa"));

/* ---- amuletos ---- */
$("adm-amu-give").addEventListener("click", () => {
  const tipo = $("adm-amu-tipo").value;
  const rar = parseInt($("adm-amu-rar").value, 10) || 0;
  admAct(p => admDarAmuleto(p, tipo, rar), "Amuleto entregue");
});
$("adm-amu-lend").addEventListener("click", () =>
  admAct(p => { for (const sp of AMULET_SPECIALS) admDarAmuleto(p, sp.id, 3); }, "3 lendários entregues"));
$("adm-amu-all").addEventListener("click", () =>
  admAct(p => { for (const t of AMULET_TYPES) admDarAmuleto(p, t.id, 2); }, "Um amuleto de cada"));
$("adm-amu-zero").addEventListener("click", () =>
  admAct(p => { p.amulets = []; p.equipped = []; }, "Amuletos apagados"));

/* ---- perfil ---- */
$("adm-rename-go").addEventListener("click", () => {
  const novo = ($("adm-rename").value || "").trim();
  if (!admTarget || !novo || novo === admTarget) return;
  if (ROOT.profiles[novo]) { admMsg("Já existe um piloto com esse nome."); AudioSys.deny(); return; }
  ROOT.profiles[novo] = ROOT.profiles[admTarget];
  ROOT.profiles[novo].__name = novo;
  delete ROOT.profiles[admTarget];
  if (ROOT.current === admTarget) ROOT.current = novo;
  if (save.__name === admTarget) { save = ROOT.profiles[novo]; }
  admTarget = novo;
  persist();
  AudioSys.buy();
  admSelect(novo);
  admMsg("Piloto renomeado para " + novo);
});
$("adm-dup").addEventListener("click", () => {
  const p = admAlvo();
  if (!p) return;
  let nome = admTarget + " (cópia)";
  let n = 2;
  while (ROOT.profiles[nome]) nome = admTarget + " (cópia " + n++ + ")";
  ROOT.profiles[nome] = mergeSave(JSON.parse(JSON.stringify(p)));
  persist();
  AudioSys.buy();
  admRenderPlayers();
  admMsg("Cópia criada: " + nome);
});
$("adm-reset").addEventListener("click", () => {
  if (admConfirmar !== "reset") {
    admConfirmar = "reset";
    admMsg("Toque de novo em ZERAR para confirmar.");
    setTimeout(() => { if (admConfirmar === "reset") admConfirmar = null; }, 4000);
    return;
  }
  admConfirmar = null;
  admAct(p => { Object.assign(p, defaultSave()); }, "Piloto zerado");
});
$("adm-del").addEventListener("click", () => {
  if (!admTarget) return;
  if (admConfirmar !== "del") {
    admConfirmar = "del";
    admMsg("Toque de novo em APAGAR para excluir " + admTarget + " de vez.");
    setTimeout(() => { if (admConfirmar === "del") admConfirmar = null; }, 4000);
    return;
  }
  admConfirmar = null;
  const nome = admTarget;
  delete ROOT.profiles[nome];
  if (ROOT.current === nome) ROOT.current = null;
  if (save.__name === nome) save = defaultSave();
  admTarget = null;
  $("adm-sel-box").style.display = "none";
  persist();
  admRenderPlayers();
  admMsg("Piloto " + nome + " apagado");
});

/* ---- todos os pilotos ---- */
$("adm-novo-go").addEventListener("click", () => {
  const nome = ($("adm-novo").value || "").trim();
  if (!nome) return;
  if (ROOT.profiles[nome]) { admMsg("Esse nome já existe."); AudioSys.deny(); return; }
  ROOT.profiles[nome] = defaultSave();
  ROOT.profiles[nome].savedAt = Date.now();
  persist();
  $("adm-novo").value = "";
  AudioSys.buy();
  admRenderPlayers();
  admSelect(nome);
  admMsg("Piloto " + nome + " criado");
});
$("adm-gem-todos").addEventListener("click", () => {
  let n = 0;
  for (const nome in ROOT.profiles) {
    ROOT.profiles[nome].crystals = (ROOT.profiles[nome].crystals || 0) + 10000;
    ROOT.profiles[nome].savedAt = Date.now();
    n++;
  }
  persist();
  calcStats();
  AudioSys.buy();
  admRenderPlayers();
  admRenderStats();
  admMsg("+10.000 cristais para " + n + " piloto" + (n === 1 ? "" : "s"));
});

/* ---- cópia de segurança ---- */
$("adm-export").addEventListener("click", () => {
  const p = admAlvo();
  if (!p) { admMsg("Selecione um piloto primeiro."); return; }
  $("adm-json").value = JSON.stringify({ tipo: "piloto", nome: admTarget, dados: p });
  admMsg("Save de " + admTarget + " exportado abaixo");
});
$("adm-export-tudo").addEventListener("click", () => {
  $("adm-json").value = JSON.stringify({ tipo: "tudo", dados: ROOT.profiles });
  admMsg("Todos os pilotos exportados abaixo");
});
$("adm-copy").addEventListener("click", async () => {
  const ta = $("adm-json");
  if (!ta.value) { admMsg("Exporte alguma coisa primeiro."); return; }
  try {
    await navigator.clipboard.writeText(ta.value);
    admMsg("Copiado!");
  } catch (e) {
    ta.select();
    admMsg("Selecionado — use copiar do teclado.");
  }
});
$("adm-import").addEventListener("click", () => {
  const txt = ($("adm-json").value || "").trim();
  if (!txt) { admMsg("Cole um save no campo de texto."); return; }
  let obj;
  try { obj = JSON.parse(txt); } catch (e) { admMsg("Esse texto não é um save válido."); AudioSys.deny(); return; }
  try {
    if (obj.tipo === "piloto" && obj.dados) {
      let nome = obj.nome || "Importado";
      let n = 2;
      while (ROOT.profiles[nome]) nome = (obj.nome || "Importado") + " " + n++;
      ROOT.profiles[nome] = mergeSave(obj.dados);
      ROOT.profiles[nome].savedAt = Date.now();
      persist();
      admRenderPlayers();
      admSelect(nome);
      admMsg("Piloto importado como " + nome);
    } else if (obj.tipo === "tudo" && obj.dados) {
      let n = 0;
      for (const nome in obj.dados) {
        ROOT.profiles[nome] = mergeSave(obj.dados[nome]);
        ROOT.profiles[nome].savedAt = Date.now();
        n++;
      }
      persist();
      admRenderPlayers();
      admMsg(n + " piloto" + (n === 1 ? "" : "s") + " importado" + (n === 1 ? "" : "s"));
    } else {
      admMsg("Save não reconhecido.");
      AudioSys.deny();
      return;
    }
    AudioSys.buy();
  } catch (e) {
    admMsg("Não foi possível importar esse save.");
    AudioSys.deny();
  }
});


/* =====================================================================
   O CATÁLOGO — DAR QUALQUER COISA, POR CATEGORIA
   ---------------------------------------------------------------------
   Até aqui o painel dava por atacado: "todas as naves", "3 lendários",
   "dar tudo". Ou tudo, ou nada. Não dava para dar UMA nave para quem
   ajudou, UM amuleto de prêmio, ou a moldura de Duelista para quem
   ganhou um campeonato — e é justamente isso que se quer dar.

   Aqui está tudo o que o jogo tem, separado por categoria e com busca.
   A lista não é escrita à mão: ela SAI das mesmas tabelas que o jogo
   usa (SHIPS, AMULET_TYPES, PASSES, MOLDURAS…). Nave nova que entrar no
   jogo aparece aqui sozinha — uma lista copiada a mão nasceria
   desatualizada no dia seguinte.
   ===================================================================== */
const CATEGORIAS = [
  { id: "naves", nome: "NAVES", ic: "✈", itens: () =>
      SHIPS.map((s, i) => ({ chave: "nave" + i, nome: s.name || ("Nave " + i), ic: "✈",
                             nota: "nave " + (i + 1), dar: { darNaves: [i] } })) },

  { id: "exclusivas", nome: "EXCLUSIVAS", ic: "★", itens: () =>
      [[MAVERICK, "Maverick"], [B2, "B-2 Spirit"], [OMEGA, "Ômega-9 Arsenal"], [PRIVADA, "Trono Real"]]
        .filter(x => SHIPS[x[0]])
        .map(x => ({ chave: "ex" + x[0], nome: x[1], ic: "★", ouro: true,
                     nota: "aeronave exclusiva", dar: { exclusiva: x[0] } })) },

  { id: "amuletos", nome: "AMULETOS", ic: "◈", itens: () => {
      const fora = [];
      /* os lendários vêm sempre no topo: são o que se dá de prêmio */
      for (const a of AMULET_SPECIALS)
        fora.push({ chave: "am" + a.id, nome: a.name, ic: a.icon, ouro: true,
                    nota: "lendário", dar: { darAmuletos: [{ tipo: a.id, rar: 3 }] } });
      /* os comuns, uma linha por raridade: dar um "de dano" sem escolher
         a raridade daria sempre o mais fraco, que não é presente */
      const RAR = ["comum", "raro", "épico", "lendário"];
      for (const t of AMULET_TYPES)
        for (let r = 0; r < 4; r++)
          fora.push({ chave: "am" + t.id + r, nome: t.name, ic: t.icon,
                      nota: RAR[r], dar: { darAmuletos: [{ tipo: t.id, rar: r }] } });
      return fora;
    } },

  { id: "habilidades", nome: "HABILIDADES", ic: "✦", itens: () => {
      const ramos = [["atk", "Ataque"], ["def", "Defesa"], ["res", "Resistência"]];
      const fora = [];
      for (const [id, nome] of ramos)
        for (const ate of [10, 20, 30, 40])
          fora.push({ chave: "hab" + id + ate, nome: nome + " até " + ate, ic: "✦",
                      nota: "abre os " + ate + " primeiros", dar: { darHab: { ramo: id, ate } } });
      fora.push({ chave: "habtudo", nome: "Todas as habilidades", ic: "✦", ouro: true,
                  nota: "os 120 pontos", dar: { habilidades: true } });
      return fora;
    } },

  { id: "melhorias", nome: "MELHORIAS", ic: "⬡", itens: () =>
      UPGRADES.map(u => ({ chave: "up" + u.id, nome: u.name || u.nome || u.id, ic: "⬡",
                           nota: "no máximo", dar: { darUp: { [u.id]: u.max } } }))
        .concat([{ chave: "uptudo", nome: "Tudo no máximo", ic: "⬡", ouro: true,
                   nota: "melhorias e peças", dar: { melhorias: true } }]) },

  { id: "pecas", nome: "PEÇAS", ic: "⚙", itens: () =>
      PARTS.map(pt => ({ chave: "pc" + pt.id, nome: pt.name, ic: pt.icon,
                         nota: "no máximo, em todas as naves",
                         dar: { darPecas: { parte: pt.id, nivel: PART_MAX } } })) },

  { id: "passes", nome: "PASSES", ic: "🎟", itens: () =>
      (typeof PASSES !== "undefined" ? PASSES : []).map(pa =>
        ({ chave: "pa" + pa.id, nome: pa.nome, ic: pa.icone, ouro: true,
           nota: pa.desc, dar: { compra: { passes: [pa.id] } } })) },

  { id: "vip", nome: "VIP", ic: "👑", itens: () =>
      [7, 15, 30, 90, 180, 365].map(d =>
        ({ chave: "vip" + d, nome: "VIP por " + d + " dias", ic: "👑", ouro: true,
           nota: d >= 365 ? "um ano" : d + " dias", dar: { compra: { vipDias: d } } })) },

  { id: "molduras", nome: "MOLDURAS", ic: "🖼", itens: () =>
      MOLDURAS.filter(m => m.id !== "nenhuma").map(m =>
        ({ chave: "mo" + m.id, nome: m.nome, ic: "🖼",
           nota: "moldura do apelido", dar: { darMolduras: [m.id] } })) },

  { id: "ranks", nome: "RANKS", ic: "🏅", itens: () =>
      RANKS.map((r, i) => ({ chave: "rk" + i, nome: r.nome, ic: r.sim,
                             nota: r.min + " pontos", dar: { setRank: r.min } })) },

  { id: "emotes", nome: "EMOTES", ic: "💬", itens: () =>
      (typeof EMOTES !== "undefined" ? EMOTES : []).map(e =>
        ({ chave: "em" + e.id, nome: e.nome, ic: e.txt,
           nota: "emote", dar: { darEmotes: [e.id] } })) },

  { id: "cristais", nome: "CRISTAIS", ic: "◆", itens: () =>
      [1000, 5000, 10000, 50000, 100000, 500000].map(n =>
        ({ chave: "cr" + n, nome: fmt(n) + " cristais", ic: "◆",
           nota: "soma ao que a pessoa já tem", dar: { cristais: n } })) }
];

let catAba = "naves";

function catRender() {
  const abas = $("cat-abas"), grade = $("cat-grade"), conta = $("cat-conta");
  if (!abas || !grade) return;

  abas.innerHTML = CATEGORIAS.map(c =>
    '<button class="cat-aba' + (c.id === catAba ? " on" : "") + '" data-cat="' + c.id + '">' +
    c.ic + " " + escaparTexto(c.nome) + "</button>").join("");
  abas.querySelectorAll("[data-cat]").forEach(b =>
    b.addEventListener("click", () => { catAba = b.getAttribute("data-cat"); catRender(); }));

  const cat = CATEGORIAS.filter(c => c.id === catAba)[0];
  if (!cat) return;
  let itens = [];
  try { itens = cat.itens() || []; } catch (e) { itens = []; }

  const q = semAcento(($("cat-busca") || {}).value || "").trim();
  if (q) itens = itens.filter(it =>
    semAcento(it.nome).indexOf(q) >= 0 || semAcento(it.nota || "").indexOf(q) >= 0);

  if (conta) {
    conta.textContent = itens.length
      ? itens.length + (itens.length === 1 ? " item" : " itens") +
        (admModo === "caixa" ? " · vão para a caixa" : " · caem na conta na hora")
      : "Nada com esse nome nesta categoria.";
  }

  /* 400 naves numa grade só travam celular fraco. Mostra 120 e deixa a
     busca fazer o resto -- que é o que a pessoa faz mesmo quando procura
     uma nave específica. */
  const CABE = 120;
  const mostra = itens.slice(0, CABE);
  grade.innerHTML = mostra.map((it, i) =>
    '<button class="cat-item' + (it.ouro ? " ouro" : "") + '" data-i="' + i + '">' +
    '<b>' + it.ic + "</b>" +
    '<span><strong>' + escaparTexto(it.nome) + "</strong>" +
    "<em>" + escaparTexto(it.nota || "") + "</em></span></button>").join("") +
    (itens.length > CABE
      ? '<p class="adm-note" style="grid-column:1/-1">Mostrando ' + CABE + " de " +
        itens.length + ". Use a busca para achar o resto.</p>"
      : "");

  grade.querySelectorAll("[data-i]").forEach(b =>
    b.addEventListener("click", () => {
      const it = mostra[parseInt(b.getAttribute("data-i"), 10)];
      if (!it) return;
      admDar(it.dar, it.nome);
    }));
}
(function ligarCatalogo() {
  const c = $("cat-busca");
  if (c) c.addEventListener("input", catRender);
})();
