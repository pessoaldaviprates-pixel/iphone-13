/* =====================================================================
   AMIGOS — pedidos, lista e conversa
   ---------------------------------------------------------------------
   Como é guardado na nuvem:
     amigos/<meuId>/lista/<id>   -> {nome, tag, desde}
     amigos/<meuId>/pedidos/<id> -> {nome, tag, quando}   (quem me chamou)
     conversas/<sala>/<chave>    -> {de, nome, txt, quando}
   A sala da conversa é o par de ids em ordem, então os dois chegam no
   mesmo lugar sem combinar nada antes.
   ===================================================================== */
const AM = {
  lista: {},        // meus amigos
  pedidos: {},      // quem me chamou e eu ainda não respondi
  enviados: {},     // quem eu chamei
  conversaCom: null,
  mensagens: [],
  fluxo: null,      // desliga o ouvido da conversa aberta
  fluxoAvisos: null,
  naoLidas: {},
  ultimaVista: {}
};

function meuIdNuvem() { return save.__name ? nuvemId(save.__name) : null; }
function salaDaConversa(a, b) { return [a, b].sort().join("__"); }

/* a gametag é o nome que aparece para os outros; se não tiver, usa o nick */
function minhaTag() { return (save.tag && save.tag.trim()) || save.__name || "Piloto"; }

async function amigosCarregar() {
  const eu = meuIdNuvem();
  if (!eu || !nuvemAtiva()) return;
  const d = await nuvemReqC("amigos/" + eu);
  AM.lista = (d && d.lista) || {};
  AM.pedidos = (d && d.pedidos) || {};
  AM.enviados = (d && d.enviados) || {};
  amigosRender();
  amigosSelo();
}

/* manda um pedido: escreve na caixa de pedidos do outro e na minha de enviados */
/* ---------------------------------------------------------------------
   Achar gente pelo nick, do jeito que as pessoas escrevem
   ---------------------------------------------------------------------
   O endereço de cada piloto na nuvem é um número tirado do nome EXATO.
   Só que ninguém digita o nome exato: escreve tudo minúsculo, esquece o
   acento, deixa um espaço no fim. Aí a conta dava outro número e o jogo
   dizia "não achei ninguém" mesmo com o nick certo.
   Agora, se o caminho direto não achar, o jogo baixa a lista de pilotos
   e procura de verdade: sem acento, sem maiúscula, sem espaço — e
   também pela gametag.
   --------------------------------------------------------------------- */
function nickSimples(t) {
  let x = String(t == null ? "" : t);
  try { x = x.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); } catch (e) {}
  return x.toLowerCase().replace(/\s+/g, "");
}
async function acharPiloto(nome) {
  const alvo = nickSimples(nome);
  if (!alvo) return null;
  // 1) caminho direto: funciona quando a pessoa escreveu igualzinho
  const direto = await nuvemReq("pilotos/" + nuvemId(String(nome).trim()));
  if (direto && direto.nome) return { id: nuvemId(String(nome).trim()), p: direto };
  // 2) procura na lista inteira, ignorando maiúscula, acento e espaço
  const todos = await nuvemReq("pilotos");
  if (!todos) return null;
  let parecido = null;
  for (const id in todos) {
    const p = todos[id];
    if (!p || !p.nome) continue;
    if (nickSimples(p.nome) === alvo || nickSimples(p.tag) === alvo) return { id, p };
    if (!parecido && nickSimples(p.nome).indexOf(alvo) === 0) parecido = { id, p };
  }
  return parecido;   // "Mav" acha "Maverick", se não houver igual
}

async function amigoPedir(nome) {
  const eu = meuIdNuvem();
  if (!eu) return { ok: false, msg: "Entre com um piloto primeiro." };
  nome = String(nome || "").trim();
  if (!nome) return { ok: false, msg: "Escreva o nick do seu amigo." };
  if (nickSimples(nome) === nickSimples(save.__name))
    return { ok: false, msg: "Esse é você mesmo." };
  if (!nuvemAtiva()) return { ok: false, msg: "O modo online está desligado neste aparelho." };
  // confere se a pessoa existe, do jeito que você escreveu ou parecido
  const achado = await acharPiloto(nome);
  if (!achado) {
    return { ok: false, msg: "Não achei ninguém com esse nick. Confira se ele já " +
             "abriu o jogo com internet pelo menos uma vez — é o que coloca o nome na lista." };
  }
  const id = achado.id;
  const p = achado.p;
  if (id === eu) return { ok: false, msg: "Esse é você mesmo." };
  if (AM.lista[id]) return { ok: false, msg: "Vocês já são amigos." };
  if (AM.enviados[id]) return { ok: false, msg: "Você já chamou essa pessoa. Espere ela aceitar." };
  if (AM.pedidos[id]) { await amigoAceitar(id); return { ok: true, msg: "Vocês já são amigos!" }; }
  const meuCartao = { nome: save.__name, tag: minhaTag(), quando: Date.now() };
  const ok1 = await nuvemSoltarC("amigos/" + id + "/pedidos/" + eu, meuCartao);
  if (ok1 === null) {
    return { ok: false, msg: "O Firebase recusou a gravação. Abra o painel → " +
             "TESTE DA NUVEM e cole as regras (o botão copia prontas)." };
  }
  await nuvemSoltarC("amigos/" + eu + "/enviados/" + id,
                    { nome: p.nome || nome, tag: p.tag || p.nome || nome, quando: Date.now() });
  AM.enviados[id] = { nome: p.nome || nome };
  amigosRender();
  return { ok: true, msg: "Pedido enviado para " + (p.nome || nome) + "." };
}

async function amigoAceitar(id) {
  const eu = meuIdNuvem();
  if (!eu) return;
  const ped = AM.pedidos[id];
  if (!ped) return;
  const agora = Date.now();
  await nuvemSoltarC("amigos/" + eu + "/lista/" + id,
                    { nome: ped.nome, tag: ped.tag || ped.nome, desde: agora });
  await nuvemSoltarC("amigos/" + id + "/lista/" + eu,
                    { nome: save.__name, tag: minhaTag(), desde: agora });
  await nuvemSoltarC("amigos/" + eu + "/pedidos/" + id, null, "DELETE");
  await nuvemSoltarC("amigos/" + id + "/enviados/" + eu, null, "DELETE");
  AM.lista[id] = { nome: ped.nome, tag: ped.tag || ped.nome, desde: agora };
  delete AM.pedidos[id];
  amigosRender();
  amigosSelo();
  AudioSys.buy();
}

async function amigoRecusar(id) {
  const eu = meuIdNuvem();
  if (!eu) return;
  await nuvemSoltarC("amigos/" + eu + "/pedidos/" + id, null, "DELETE");
  await nuvemSoltarC("amigos/" + id + "/enviados/" + eu, null, "DELETE");
  delete AM.pedidos[id];
  amigosRender();
  amigosSelo();
}

async function amigoRemover(id) {
  const eu = meuIdNuvem();
  if (!eu) return;
  await nuvemSoltarC("amigos/" + eu + "/lista/" + id, null, "DELETE");
  await nuvemSoltarC("amigos/" + id + "/lista/" + eu, null, "DELETE");
  delete AM.lista[id];
  amigosRender();
}

/* ---------- conversa ---------- */
async function conversaAbrir(id) {
  const eu = meuIdNuvem();
  if (!eu) return;
  AM.conversaCom = id;
  AM.mensagens = [];
  AM.naoLidas[id] = 0;
  guardarVistas();
  const sala = salaDaConversa(eu, id);
  conversaDesligar();
  // primeiro o que já existe, depois fica ouvindo o que chegar
  const ler = () => conversaLer(eu, sala).then(conversaAplicar);
  conversaAplicar(await conversaLer(eu, sala));
  /* um fluxo só: no modo compatível ele escuta a minha própria ficha,
     que é onde as mensagens caem quando as regras são antigas       */
  AM.fluxo = nuvemFluxo(
    NUVEM_COMPAT ? "pilotos/" + eu + "/_cv/" + sala : "conversas/" + sala,
    ler, () => { AM.fluxo = setInterval(ler, 2500); });

  chatRender();
}
/* junta o que está no galho novo com o que ficou na ficha do piloto */
async function conversaLer(eu, sala) {
  const a = await nuvemReq("conversas/" + sala);
  const b = await nuvemReq("pilotos/" + eu + "/_cv/" + sala);
  if (!b) return a;
  if (!a) { compatLigar(); return b; }
  return Object.assign({}, a, b);
}
function conversaAplicar(d) {
  const arr = [];
  for (const k in (d || {})) {
    const m = d[k];
    if (m && m.txt) arr.push({ k: k, de: m.de, nome: m.nome, txt: m.txt, quando: m.quando || 0 });
  }
  arr.sort((a, b) => a.quando - b.quando);
  const eraTantas = AM.mensagens.length;
  AM.mensagens = arr.slice(-120);
  chatRender(AM.mensagens.length !== eraTantas);
}
function conversaDesligar() {
  if (AM.fluxo) {
    try { if (typeof AM.fluxo === "function") AM.fluxo(); else clearInterval(AM.fluxo); } catch (e) {}
    AM.fluxo = null;
  }
}
async function conversaEnviar(texto) {
  const eu = meuIdNuvem();
  const alvo = AM.conversaCom;
  texto = limparTexto(String(texto || "").trim().slice(0, 200));
  if (!eu || !alvo || !texto) return false;
  const sala = salaDaConversa(eu, alvo);
  const chave = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const msg = { de: eu, nome: minhaTag(), txt: texto, quando: Date.now() };
  let ok = NUVEM_COMPAT ? null : await nuvemSoltar("conversas/" + sala + "/" + chave, msg);
  if (ok === null) {
    /* regras antigas: a mensagem vai para a ficha dos DOIS pilotos, que
       toda regra já libera. Cada um lê a própria cópia.               */
    const a = await nuvemSoltar("pilotos/" + eu + "/_cv/" + sala + "/" + chave, msg);
    const b = await nuvemSoltar("pilotos/" + alvo + "/_cv/" + sala + "/" + chave, msg);
    ok = (a !== null || b !== null) ? a || b : null;
    if (ok !== null) compatLigar();
  }
  if (ok === null) return false;
  AM.mensagens.push({ k: chave, de: eu, nome: minhaTag(), txt: texto, quando: Date.now() });
  chatRender(true);
  // limpa conversa muito longa para não crescer sem fim
  if (AM.mensagens.length > 120) {
    const velha = AM.mensagens[0];
    if (velha && velha.k) {
      nuvemSoltar("conversas/" + sala + "/" + velha.k, null, "DELETE");
      nuvemSoltar("pilotos/" + eu + "/_cv/" + sala + "/" + velha.k, null, "DELETE");
    }
  }
  return true;
}

/* ---------- avisos de mensagem nova ---------- */
function guardarVistas() {
  try { storageSet("nn_chat_visto", JSON.stringify(AM.ultimaVista)); } catch (e) {}
}
try { AM.ultimaVista = JSON.parse(storageGet("nn_chat_visto", "{}")) || {}; } catch (e) { AM.ultimaVista = {}; }

async function amigosChecarNovidades() {
  const eu = meuIdNuvem();
  if (!eu || !nuvemAtiva() || S.mode === "playing") return;
  const d = await nuvemReqC("amigos/" + eu);
  const pedidosAntes = Object.keys(AM.pedidos).length;
  AM.lista = (d && d.lista) || {};
  AM.pedidos = (d && d.pedidos) || {};
  AM.enviados = (d && d.enviados) || {};
  if (Object.keys(AM.pedidos).length > pedidosAntes) AudioSys.power();
  // conta mensagem não lida de cada amigo
  for (const id in AM.lista) {
    const sala = salaDaConversa(eu, id);
    const c = await conversaLer(eu, sala);
    let novas = 0, ultima = 0;
    for (const k in (c || {})) {
      const m = c[k];
      if (!m || m.de === eu) continue;
      if ((m.quando || 0) > (AM.ultimaVista[id] || 0)) novas++;
      if ((m.quando || 0) > ultima) ultima = m.quando || 0;
    }
    AM.naoLidas[id] = novas;
    AM.ultimoDe = ultima;
  }
  amigosSelo();
  if (S.mode === "amigos") amigosRender();
}
setInterval(amigosChecarNovidades, 15000);

function amigosSelo() {
  const n = Object.keys(AM.pedidos).length +
            Object.values(AM.naoLidas).reduce((a, x) => a + (x || 0), 0);
  const b = $("amigos-selo");
  if (b) {
    b.textContent = n > 0 ? String(n) : "";
    b.style.display = n > 0 ? "" : "none";
  }
  const t = $("btn-amigos");
  if (t) t.classList.toggle("tem", n > 0);
}

/* ---------- desenho da tela de amigos ---------- */
let amAba = "lista";
const AM_ABAS = [
  { id: "lista",   nome: "MEUS AMIGOS" },
  { id: "pedidos", nome: "PEDIDOS" },
  { id: "achar",   nome: "ADICIONAR" },
  { id: "tag",     nome: "MINHA TAG" }
];

function iniDe(nome) { return (String(nome || "?").trim()[0] || "?").toUpperCase(); }
function quandoTexto(t) {
  const s2 = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s2 < 60) return "agora";
  if (s2 < 3600) return Math.floor(s2 / 60) + " min";
  if (s2 < 86400) return Math.floor(s2 / 3600) + " h";
  return Math.floor(s2 / 86400) + " d";
}

function amigosRender() {
  const abas = $("am-abas");
  if (!abas) return;
  abas.innerHTML = "";
  for (const a of AM_ABAS) {
    const b = document.createElement("button");
    b.className = "aba" + (amAba === a.id ? " on" : "");
    let n = a.id === "pedidos" ? Object.keys(AM.pedidos).length
          : a.id === "lista" ? Object.keys(AM.lista).length : 0;
    b.textContent = a.nome + (n ? " " + n : "");
    if (a.id === "pedidos" && n) b.classList.add("chama");
    b.addEventListener("click", () => { amAba = a.id; amigosRender(); });
    abas.appendChild(b);
  }
  const cx = $("am-corpo");
  cx.innerHTML = "";
  $("am-conta").textContent = Object.keys(AM.lista).length
    ? Object.keys(AM.lista).length + " amigo" + (Object.keys(AM.lista).length === 1 ? "" : "s") : "";

  if (!nuvemAtiva()) {
    cx.innerHTML = '<div class="vazio"><b>☁</b><strong>SEM CONEXÃO</strong>' +
      "<span>Os amigos moram na nuvem. Confira o endereço no arquivo config.js.</span></div>";
    return;
  }
  if (amAba === "lista") return amigosAbaLista(cx);
  if (amAba === "pedidos") return amigosAbaPedidos(cx);
  if (amAba === "achar") return amigosAbaAchar(cx);
  return amigosAbaTag(cx);
}

function amigosAbaLista(cx) {
  const ids = Object.keys(AM.lista);
  if (!ids.length) {
    cx.innerHTML = '<div class="vazio"><b>👥</b><strong>NENHUM AMIGO AINDA</strong>' +
      "<span>Vá em ADICIONAR, escreva o nick de alguém e mande o pedido.</span></div>";
    return;
  }
  const lista = document.createElement("div");
  lista.className = "am-lista";
  ids.sort((a, b) => (AM.naoLidas[b] || 0) - (AM.naoLidas[a] || 0));
  for (const id of ids) {
    const a = AM.lista[id];
    const novas = AM.naoLidas[id] || 0;
    const linha = document.createElement("div");
    linha.className = "am-linha";
    linha.innerHTML =
      '<span class="am-ini">' + escaparTexto(iniDe(a.tag || a.nome)) + "</span>" +
      '<span class="am-txt">' +
        '<span class="am-nome">' + escaparTexto(a.tag || a.nome) + "</span>" +
        '<span class="am-meta">' + escaparTexto("@" + (a.nome || "")) + "</span>" +
      "</span>";
    const bChat = document.createElement("button");
    bChat.className = "am-acao" + (novas ? " tem" : "");
    bChat.innerHTML = "💬" + (novas ? '<i>' + novas + "</i>" : "");
    bChat.setAttribute("aria-label", "Conversar com " + (a.tag || a.nome));
    bChat.addEventListener("click", () => abrirChat(id));
    const bX = document.createElement("button");
    bX.className = "am-acao apagar";
    bX.textContent = "✕";
    bX.setAttribute("aria-label", "Remover amigo");
    let conf = false;
    bX.addEventListener("click", () => {
      if (!conf) { conf = true; bX.textContent = "?"; setTimeout(() => { conf = false; bX.textContent = "✕"; }, 2600); return; }
      amigoRemover(id);
    });
    linha.appendChild(bChat);
    linha.appendChild(bX);
    lista.appendChild(linha);
  }
  cx.appendChild(lista);
}

function amigosAbaPedidos(cx) {
  const ids = Object.keys(AM.pedidos);
  const env = Object.keys(AM.enviados);
  if (!ids.length && !env.length) {
    cx.innerHTML = '<div class="vazio"><b>✉</b><strong>NENHUM PEDIDO</strong>' +
      "<span>Quando alguém te chamar para ser amigo, aparece aqui.</span></div>";
    return;
  }
  if (ids.length) {
    const h = document.createElement("div");
    h.className = "am-h";
    h.textContent = "TE CHAMARAM";
    cx.appendChild(h);
    const lista = document.createElement("div");
    lista.className = "am-lista";
    for (const id of ids) {
      const a = AM.pedidos[id];
      const linha = document.createElement("div");
      linha.className = "am-linha";
      linha.innerHTML =
        '<span class="am-ini">' + escaparTexto(iniDe(a.tag || a.nome)) + "</span>" +
        '<span class="am-txt"><span class="am-nome">' + escaparTexto(a.tag || a.nome) + "</span>" +
        '<span class="am-meta">' + escaparTexto("@" + (a.nome || "")) + " · " + quandoTexto(a.quando || Date.now()) + "</span></span>";
      const sim = document.createElement("button");
      sim.className = "am-acao sim";
      sim.textContent = "✓";
      sim.setAttribute("aria-label", "Aceitar");
      sim.addEventListener("click", () => amigoAceitar(id));
      const nao = document.createElement("button");
      nao.className = "am-acao apagar";
      nao.textContent = "✕";
      nao.setAttribute("aria-label", "Recusar");
      nao.addEventListener("click", () => amigoRecusar(id));
      linha.appendChild(sim); linha.appendChild(nao);
      lista.appendChild(linha);
    }
    cx.appendChild(lista);
  }
  if (env.length) {
    const h = document.createElement("div");
    h.className = "am-h";
    h.textContent = "VOCÊ CHAMOU · ESPERANDO";
    cx.appendChild(h);
    const lista = document.createElement("div");
    lista.className = "am-lista";
    for (const id of env) {
      const a = AM.enviados[id];
      const linha = document.createElement("div");
      linha.className = "am-linha esperando";
      linha.innerHTML =
        '<span class="am-ini">' + escaparTexto(iniDe(a.nome)) + "</span>" +
        '<span class="am-txt"><span class="am-nome">' + escaparTexto(a.nome) + "</span>" +
        '<span class="am-meta">esperando responder</span></span>';
      lista.appendChild(linha);
    }
    cx.appendChild(lista);
  }
}

function amigosAbaAchar(cx) {
  cx.innerHTML =
    '<div class="am-cartao">' +
      '<div class="am-h" style="margin:0 0 9px">CHAMAR UM AMIGO</div>' +
      '<p class="am-nota">Escreva o nick da conta Neon da pessoa. Ela recebe o pedido e decide se aceita.</p>' +
      '<div class="am-busca"><input id="am-nick" maxlength="14" placeholder="Nick do amigo" autocomplete="off" autocapitalize="off">' +
      '<button class="ghost-btn" id="am-chamar">CHAMAR</button></div>' +
      '<div class="am-aviso" id="am-aviso"></div>' +
    "</div>" +
    '<div class="am-cartao">' +
      '<div class="am-h" style="margin:0 0 9px">O SEU NICK</div>' +
      '<p class="am-nota">É este que os seus amigos precisam escrever para te achar.</p>' +
      '<div class="am-meu">' + escaparTexto(save.__name || "—") + "</div>" +
    "</div>";
  $("am-chamar").addEventListener("click", async () => {
    const el = $("am-nick"), av = $("am-aviso");
    av.className = "am-aviso";
    av.textContent = "Procurando…";
    const r = await amigoPedir(el.value);
    av.className = "am-aviso " + (r.ok ? "ok" : "erro");
    av.textContent = r.msg;
    if (r.ok) { el.value = ""; AudioSys.buy(); }
  });
}

/* ---------- gametag: só troca uma vez por dia ---------- */
const DIA = 24 * 60 * 60 * 1000;
function podeTrocarTag() {
  const ult = save.tagQuando || 0;
  return Date.now() - ult >= DIA;
}
function faltaParaTrocar() {
  const falta = DIA - (Date.now() - (save.tagQuando || 0));
  const h = Math.floor(falta / 3600000);
  const m = Math.floor((falta % 3600000) / 60000);
  return h > 0 ? h + "h" + String(m).padStart(2, "0") : m + " min";
}
function amigosAbaTag(cx) {
  const pode = podeTrocarTag();
  cx.innerHTML =
    '<div class="am-cartao">' +
      '<div class="tag-mostra"><span class="tag-ini">' + escaparTexto(iniDe(minhaTag())) + "</span>" +
      '<span class="tag-nome" id="tag-atual">' + escaparTexto(minhaTag()) + "</span></div>" +
      '<p class="am-nota">A sua gametag é o nome que os seus amigos veem no chat e no ranking. ' +
        "O nick da conta continua o mesmo — a tag é só a aparência.</p>" +
      '<input id="tag-campo" maxlength="16" placeholder="Sua gametag" autocomplete="off" value="' +
        escaparTexto(save.tag || "") + '"' + (pode ? "" : " disabled") + ">" +
      '<div class="tag-regras">Até 16 letras · sem espaço no começo · troca uma vez por dia</div>' +
      '<button class="big-btn" id="tag-salvar" style="width:100%"' + (pode ? "" : " disabled") + ">" +
        (pode ? "SALVAR GAMETAG" : "PODE TROCAR EM " + faltaParaTrocar()) + "</button>" +
      '<div class="am-aviso" id="tag-aviso"></div>' +
    "</div>";
  if (!pode) return;
  $("tag-salvar").addEventListener("click", async () => {
    const el = $("tag-campo"), av = $("tag-aviso");
    const nova = String(el.value || "").trim().slice(0, 16);
    av.className = "am-aviso";
    if (nova.length < 3) { av.className = "am-aviso erro"; av.textContent = "A gametag precisa de pelo menos 3 letras."; return; }
    if (!/^[\wÀ-ÿ .\-]+$/.test(nova)) { av.className = "am-aviso erro"; av.textContent = "Use só letras, números, ponto e traço."; return; }
    save.tag = nova;
    save.tagQuando = Date.now();
    persist();
    // avisa os amigos da tag nova
    const eu = meuIdNuvem();
    if (eu) {
      nuvemJuntar("pilotos/" + eu, { tag: nova });
      for (const id in AM.lista) nuvemJuntar("amigos/" + id + "/lista/" + eu, { tag: nova });
    }
    AudioSys.buy();
    av.className = "am-aviso ok";
    av.textContent = "Pronto! Você poderá trocar de novo amanhã.";
    setTimeout(amigosRender, 900);
  });
}

/* ---------- tela da conversa ---------- */
function abrirChat(id) {
  const a = AM.lista[id];
  if (!a) return;
  S.mode = "chat";
  $("chat-nome").textContent = a.tag || a.nome;
  $("chat-ini").textContent = iniDe(a.tag || a.nome);
  $("chat-onde").textContent = "carregando…";
  $("chat-lista").innerHTML = '<div class="vazio"><b>💬</b><strong>ABRINDO</strong></div>';
  showScreen("chat");
  conversaAbrir(id);
  // mostra onde o amigo está, se ele deixou registrado
  nuvemReq("pilotos/" + id).then(p => {
    if (!p) { $("chat-onde").textContent = "—"; return; }
    const on = p.visto && (Date.now() - p.visto < 90000);
    $("chat-onde").textContent = on ? "🟢 " + (p.onde || "no jogo")
                                    : "fase " + (p.fase || 0);
  });
}
function chatRender(rolar) {
  const cx = $("chat-lista");
  if (!cx || S.mode !== "chat") return;
  const eu = meuIdNuvem();
  if (!AM.mensagens.length) {
    cx.innerHTML = '<div class="vazio"><b>💬</b><strong>CONVERSA NOVA</strong>' +
      "<span>Diga um oi. As mensagens ficam guardadas para os dois.</span></div>";
    return;
  }
  cx.innerHTML = "";
  let diaAnterior = "";
  for (const m of AM.mensagens) {
    const d = new Date(m.quando || Date.now());
    const dia = d.toLocaleDateString("pt-BR");
    if (dia !== diaAnterior) {
      diaAnterior = dia;
      const sep = document.createElement("div");
      sep.className = "chat-dia";
      sep.textContent = dia === new Date().toLocaleDateString("pt-BR") ? "hoje" : dia;
      cx.appendChild(sep);
    }
    const b = document.createElement("div");
    b.className = "chat-bolha" + (m.de === eu ? " minha" : "");
    b.innerHTML = '<span class="chat-msg">' + escaparLongo(m.txt) + "</span>" +
                  '<span class="chat-hora">' +
                  d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0") + "</span>";
    cx.appendChild(b);
  }
  if (rolar !== false) cx.scrollTop = cx.scrollHeight;
  if (AM.conversaCom) {
    AM.ultimaVista[AM.conversaCom] = Date.now();
    AM.naoLidas[AM.conversaCom] = 0;
    guardarVistas();
    amigosSelo();
  }
}

/* =====================================================================
   LOJA — VIP, passes e naves especiais
   ---------------------------------------------------------------------
   Tudo se compra com CRISTAIS, que é o dinheiro que já existe no jogo.
   Nada aqui cobra dinheiro de verdade: para isso seria preciso ligar um
   meio de pagamento (Google Play, App Store, Stripe), que uma página web
   sozinha não faz. A loja está pronta caso você queira ligar um dia.
   ===================================================================== */
/* ---------- preços em dinheiro de verdade ----------
   Enquanto não existe uma forma de pagamento ligada, comprar é PEDIR:
   o jogador escolhe, o pedido chega no painel, vocês combinam o
   pagamento pelo chat e você entrega com um toque.                  */
function reais(v) {
  return "R$ " + v.toFixed(2).replace(".", ",");
}
const VIP_PLANOS = [
  { dias: 10,  preco: 0.50, nome: "10 DIAS",  selo: "" },
  { dias: 30,  preco: 1.00, nome: "30 DIAS",  selo: "MAIS PEDIDO" },
  { dias: 90,  preco: 2.50, nome: "3 MESES",  selo: "ECONOMIZA 17%" },
  { dias: 365, preco: 7.00, nome: "1 ANO",    selo: "MELHOR PREÇO" }
];
const VIP_VANTAGENS = [
  "+25% de cristais em tudo que você ganha",
  "Um espaço extra de relíquia (4 no total)",
  "Presente de cristais toda vez que você entra num dia novo",
  "Seu nome fica dourado no ranking e no chat",
  "Baú estelar 30% mais barato"
];

const PASSES = [
  { id: "ima",     nome: "Passe do Ímã",        icone: "◈", preco: 0.50,
    desc: "Todo cristal e item da tela vem sozinho até você. Nunca mais perde nada." },
  { id: "escudo",  nome: "Passe do Escudo",     icone: "◎", preco: 0.50,
    desc: "Você começa toda fase já com o escudo ligado." },
  { id: "dobro",   nome: "Passe do Dobro",      icone: "◆", preco: 1.00,
    desc: "15% de chance de cada cristal valer o dobro." },
  { id: "renascer",nome: "Passe do Renascer",   icone: "❦", preco: 1.50,
    desc: "+1 ressurreição por fase, além das que você já tiver." },
  { id: "sorte",   nome: "Passe da Sorte",      icone: "✦", preco: 1.00,
    desc: "+40% de chance de cair arma, escudo e vida." },
  { id: "veterano",nome: "Passe do Veterano",   icone: "★", preco: 1.00,
    desc: "Perdeu a fase? Você fica com todos os cristais em vez de metade." },
  { id: "colecao", nome: "Passe do Colecionador",icone:"◇", preco: 1.00,
    desc: "Baú estelar 40% mais barato e nunca repete a mesma relíquia duas vezes seguidas." },
  { id: "pressa",  nome: "Passe da Pressa",     icone: "»", preco: 0.50,
    desc: "Pula a apresentação das naves e a espera entre as ondas fica pela metade." },
  { id: "tudo",    nome: "Pacote Completo",     icone: "★", preco: 5.00, pacote: true,
    desc: "Os oito passes de uma vez, com desconto. Sai mais barato que comprar separado." }
];

function temVip() {
  return (save.vipAte || 0) > Date.now();
}
function vipDiasQueFaltam() {
  return Math.max(0, Math.ceil(((save.vipAte || 0) - Date.now()) / 86400000));
}
function temPasse(id) { return !!(save.passes && save.passes[id]); }
function espacosDeReliquia() { return temVip() ? 4 : 3; }

/* presente diário do VIP */
function vipPresenteDoDia() {
  if (!temVip()) return 0;
  const hoje = new Date().toDateString();
  if (save.vipDia === hoje) return 0;
  save.vipDia = hoje;
  const ganho = 5000 + Math.round((save.best || 0) * 60);
  save.crystals += ganho;
  persist();
  return ganho;
}

/* =====================================================================
   PEDIDOS DA LOJA E LINHA DIRETA COM O ADM
   ---------------------------------------------------------------------
   Na nuvem:
     loja_pedidos/<chave> -> {de, nome, tag, item, itemNome, preco,
                              quando, estado: "esperando"|"entregue"|"recusado"}
     suporte/<idJogador>/msgs/<chave> -> {de:"jogador"|"adm", nome, txt, quando}
     suporte/<idJogador>/info -> {nome, tag, visto, novasAdm, novasJogador}
   ===================================================================== */
async function pedirNaLoja(item, itemNome, preco, extra) {
  /* quando é presente, o pedido guarda para quem vai */
  const eu = meuIdNuvem();
  if (!eu) return { ok: false, msg: "Entre com um piloto primeiro." };
  if (!nuvemAtiva()) return { ok: false, msg: "Sem conexão com a nuvem agora." };
  const chave = eu + "_" + Date.now().toString(36);
  const pacote = Object.assign({
    de: eu, nome: save.__name || "", tag: minhaTag(),
    item: item, itemNome: itemNome, preco: preco,
    quando: Date.now(), estado: "esperando", versao: VERSAO
  }, extra || {});
  /* pedido da loja também aguenta regra antiga: se o galho novo recusar,
     ele fica na ficha do piloto e o painel junta os dois na hora de ler */
  let ok = NUVEM_COMPAT ? null : await nuvemSoltar("loja_pedidos/" + chave, pacote);
  if (ok === null) {
    ok = await nuvemSoltar("pilotos/" + meuIdNuvem() + "/_loja/" + chave, pacote);
    if (ok !== null) compatLigar();
  }
  if (ok === null) return { ok: false, msg: "Não deu para enviar. Tente de novo." };
  save.pedidos = save.pedidos || [];
  pacote.chave = chave;
  save.pedidos.push({ chave: chave, itemNome: itemNome, preco: preco,
                      quando: Date.now(), estado: "esperando" });
  if (save.pedidos.length > 30) save.pedidos.shift();
  persist();
  // avisa você na conversa, para não passar batido
  await suporteEnviar("Pedi na loja: " + itemNome + " — " + reais(preco), true);
  return { ok: true, chave: chave,
           msg: "Pedido enviado! Agora é só falar comigo no ⊙ aqui embaixo." };
}

/* =====================================================================
   PAGAMENTO POR PIX — tela de compra, código copia-e-cola e acompanhamento
   ---------------------------------------------------------------------
   O jogo não fala com banco nenhum (para isso seria preciso contratar um
   provedor de pagamento e guardar chaves secretas, o que um arquivo HTML
   solto não pode fazer com segurança). O que dá para automatizar de
   verdade, e está aqui, é TODO o resto:

     1. o jogador toca no preço e cai numa tela com a chave Pix, o nome de
        quem recebe e o valor certinho;
     2. o jogo monta o código Pix "copia e cola" (o padrão do Banco
        Central) já com o valor e um número de pedido — um toque copia;
     3. ele aperta JÁ PAGUEI e o pedido muda de estado sozinho;
     4. o painel recebe o pedido marcado como PAGO, com o nome da conta;
     5. um toque em ENTREGAR manda o item pela caixa de presente, o
        jogador recebe na hora e o pedido vira ENTREGUE sozinho.

   Só a conferência do dinheiro na conta é olho humano.
   ===================================================================== */
/* Os dados do Pix NÃO ficam no código do jogo: o dono põe pelo painel
   (LOJA → DADOS DO PIX) e eles ficam só na nuvem. Assim a chave não vai
   junto no arquivo, no repositório nem em quem baixa o jogo.           */
const PAG_PADRAO = {
  chave: "",
  tipo: "CHAVE PIX",
  nome: "",
  cidade: "SAO PAULO"
};
let PAG = Object.assign({}, PAG_PADRAO);
let pagMostrarChave = false;   /* a chave começa escondida na tela */
/* deixa só as pontas à mostra: 123.•••.•••-09, ma•••@email, ...9821 */
function pagEsconder(chave, tipo) {
  const c = String(chave || "");
  if (!c) return "";
  const t = String(tipo || "").toUpperCase();
  if (t === "NOME") {
    /* como o banco faz: primeiro nome inteiro, o resto só a inicial */
    const p = c.trim().split(/\s+/);
    return p.map((x, i) => i === 0 ? x : (x.charAt(0).toUpperCase() + ".")).join(" ");
  }
  if (t.indexOf("MAIL") >= 0 || c.indexOf("@") > 0) {
    const i = c.indexOf("@");
    return c.slice(0, Math.min(2, i)) + "•••" + c.slice(i);
  }
  const so = c.replace(/[^0-9A-Za-z]/g, "");
  if (so.length <= 6) return c.slice(0, 2) + "•••";
  /* mantém o formato (pontos e traço) e troca o miolo por bolinhas */
  let n = 0;
  const total = so.length;
  return c.split("").map(ch => {
    if (!/[0-9A-Za-z]/.test(ch)) return ch;
    n++;
    return (n <= 3 || n > total - 2) ? ch : "•";
  }).join("");
}
function pagAplicar(d) {
  if (!d) return;
  PAG = Object.assign({}, PAG_PADRAO, d);
}
/* o copia e cola também carrega a chave dentro: mostra só as pontas */
function pagCodigoTapado(codigo) {
  const c = String(codigo || "");
  if (c.length < 40) return c;
  return c.slice(0, 20) + " •••••••••••••••••••••• " + c.slice(-12);
}
/* ---- código Pix copia e cola (BR Code / EMV do Banco Central) ---- */
function pixCampo(id, valor) {
  const v = String(valor);
  return id + String(v.length).padStart(2, "0") + v;
}
/* CRC-16/CCITT-FALSE, que é o que o padrão do Pix pede */
function pixCRC(txt) {
  let crc = 0xFFFF;
  for (let i = 0; i < txt.length; i++) {
    crc ^= (txt.charCodeAt(i) & 0xFF) << 8;
    for (let b = 0; b < 8; b++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}
/* tira acento e o que o padrão não aceita */
function pixTexto(t, max) {
  let x = String(t || "");
  try { x = x.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); } catch (e) {}
  return x.replace(/[^A-Za-z0-9 .-]/g, "").trim().slice(0, max).toUpperCase();
}
function pixCodigo(valor, txid) {
  const chave = String(PAG.chave || "").replace(/[^0-9A-Za-z@.\-+]/g, "");
  const conta = pixCampo("00", "br.gov.bcb.pix") + pixCampo("01", chave);
  const id = pixTexto(txid || "NEON", 25).replace(/[^A-Z0-9]/g, "") || "NEON";
  let p =
    pixCampo("00", "01") +
    pixCampo("26", conta) +
    pixCampo("52", "0000") +
    pixCampo("53", "986") +
    pixCampo("54", Number(valor).toFixed(2)) +
    pixCampo("58", "BR") +
    pixCampo("59", pixTexto(PAG.nome, 25) || "RECEBEDOR") +
    pixCampo("60", pixTexto(PAG.cidade, 15) || "BRASIL") +
    pixCampo("62", pixCampo("05", id));
  p += "6304";
  return p + pixCRC(p);
}

/* ---------- estado da compra que está acontecendo agora ---------- */
const COMPRA = { item: null, nome: "", preco: 0, extra: null, chave: null, estado: null, fluxo: null };

function abrirPagamento(item, nome, preco, extra) {
  COMPRA.item = item; COMPRA.nome = nome; COMPRA.preco = preco; COMPRA.extra = extra || null;
  COMPRA.presentePara = (extra && extra.presentePara) || null;
  COMPRA.presenteNome = (extra && extra.presenteNome) || null;
  COMPRA.chave = null; COMPRA.estado = null;
  S.mode = "pagar";
  showScreen("pagar");
  pagRender();
}
function pagFechar() {
  pagMostrarChave = false;
  if (COMPRA.fluxo) { try { COMPRA.fluxo(); } catch (e) {} COMPRA.fluxo = null; }
  S.mode = "loja";
  showScreen("loja");
  renderLoja();
}
function pagRender() {
  const cx = $("pagar-corpo");
  if (!cx) return;
  const codigo = pixCodigo(COMPRA.preco, "NEON" + (COMPRA.chave || "").replace(/[^0-9a-z]/gi, "").slice(-12));
  $("pagar-item").textContent = COMPRA.nome || "";
  $("pagar-valor").textContent = reais(COMPRA.preco || 0);

  if (COMPRA.estado === "pago") {
    cx.innerHTML =
      '<div class="pag-espera">' +
        '<div class="pag-relogio">⏳</div>' +
        "<b>Esperando o desenvolvedor te responder</b>" +
        "<span>Leva em torno de <b>30 minutos a 1 hora</b>. Assim que eu confirmar o " +
        "pagamento, o item cai na sua conta sozinho — pode fechar o jogo, não perde nada.</span>" +
        '<div class="pag-passos">' +
          '<i class="ok">✓ pedido feito</i><i class="ok">✓ você avisou que pagou</i>' +
          '<i class="agora">⏳ conferindo o pagamento</i><i>◻ entrega automática</i>' +
        "</div>" +
        '<div class="pag-tempo" id="pag-tempo"></div>' +
      "</div>" +
      '<button class="ghost-btn" id="pag-falar" style="width:100%;margin-top:12px">⊙ FALAR COM O DESENVOLVEDOR</button>';
    const bf = $("pag-falar");
    if (bf) bf.addEventListener("click", () => { pagFechar(); suporteAbrir(); });
    pagTempo();
    return;
  }
  if (COMPRA.estado === "entregue") {
    cx.innerHTML =
      '<div class="pag-espera pronto">' +
        '<div class="pag-relogio">🎁</div>' +
        "<b>Entregue!</b><span>" + escaparLongo(COMPRA.nome) +
        " já está na sua conta. Obrigado!</span></div>";
    return;
  }

  /* sem chave configurada não dá para pagar: manda falar comigo */
  if (!PAG.chave) {
    cx.innerHTML =
      '<div class="pag-espera">' +
        '<div class="pag-relogio">🔒</div>' +
        "<b>Pagamento indisponível agora</b>" +
        "<span>O desenvolvedor ainda não ligou o Pix" + (contaDeDono(save && save.__name) ?
          " — ligue no <b>Painel → LOJA → DADOS DO PIX</b>" : "") +
        ". Fale comigo pelo chat que eu resolvo na hora.</span>" +
      "</div>" +
      '<button class="big-btn" id="pag-falar2" style="width:100%;margin-top:12px">⊙ FALAR COM O DESENVOLVEDOR</button>' +
      '<button class="ghost-btn" id="pag-cancelar" style="width:100%;margin-top:9px">VOLTAR</button>';
    const f2 = $("pag-falar2");
    if (f2) f2.addEventListener("click", () => { pagFechar(); suporteAbrir(); });
    $("pag-cancelar").addEventListener("click", pagFechar);
    return;
  }

  cx.innerHTML =
    '<div class="pag-chave">' +
      '<span class="pag-rot">CHAVE PIX (' + escaparTexto(PAG.tipo || "CHAVE PIX") + ")</span>" +
      '<b id="pag-chave-txt">' +
        escaparTexto(pagMostrarChave ? PAG.chave : pagEsconder(PAG.chave, PAG.tipo)) + "</b>" +
      '<div class="pag-chave-btns">' +
        '<button class="pag-copiar" id="pag-copiar-chave">COPIAR CHAVE</button>' +
        '<button class="pag-copiar fraco" id="pag-ver-chave">' +
          (pagMostrarChave ? "🙈 ESCONDER" : "👁 MOSTRAR") + "</button>" +
      "</div>" +
    "</div>" +
    '<div class="pag-linha"><span>Nome do destinatário</span><b>' +
      escaparTexto(pagMostrarChave ? PAG.nome : pagEsconder(PAG.nome, "NOME")) + "</b></div>" +
    '<div class="pag-linha"><span>Valor</span><b class="pag-preco">' + reais(COMPRA.preco) + "</b></div>" +
    '<div class="pag-linha"><span>Item</span><b>' + escaparLongo(COMPRA.nome) + "</b></div>" +
    '<div class="pag-copiacola">' +
      '<span class="pag-rot">PIX COPIA E COLA — já vem com o valor</span>' +
      '<textarea readonly id="pag-codigo" rows="3">' +
        escaparHtml(pagMostrarChave ? codigo : pagCodigoTapado(codigo)) + "</textarea>" +
      '<button class="adm-btn gold wide" id="pag-copiar-codigo">📋 COPIAR CÓDIGO PIX</button>' +
    "</div>" +
    '<p class="adm-note" style="margin-top:12px">Abra o app do banco, escolha <b>Pix copia e cola</b>, ' +
    "cole o código e confirme. Depois volte aqui e toque em <b>JÁ PAGUEI</b>.</p>" +
    '<button class="big-btn" id="pag-paguei" style="width:100%;margin-top:12px">JÁ PAGUEI</button>' +
    '<button class="ghost-btn" id="pag-cancelar" style="width:100%;margin-top:9px">CANCELAR</button>';

  const copiar = async (txt, btn, certo) => {
    try { await navigator.clipboard.writeText(txt); btn.textContent = certo; AudioSys.buy(); }
    catch (e) { btn.textContent = "Selecione e copie na mão"; }
  };
  $("pag-copiar-chave").addEventListener("click", ev =>
    copiar(PAG.chave, ev.currentTarget, "✓ CHAVE COPIADA"));
  $("pag-ver-chave").addEventListener("click", () => { pagMostrarChave = !pagMostrarChave; pagRender(); });
  $("pag-copiar-codigo").addEventListener("click", ev =>
    copiar(codigo, ev.currentTarget, "✓ CÓDIGO COPIADO — cole no banco"));
  $("pag-cancelar").addEventListener("click", pagFechar);
  $("pag-paguei").addEventListener("click", async ev => {
    const b = ev.currentTarget;
    b.disabled = true; b.textContent = "AVISANDO…";
    const r = await pagConfirmarPagamento();
    b.disabled = false; b.textContent = "JÁ PAGUEI";
    if (!r.ok) { lojaAviso(r.msg, false); AudioSys.deny(); return; }
    AudioSys.buy(); vibrate([40, 60, 40]);
    COMPRA.estado = "pago";
    pagRender();
    pagOuvirPedido();
  });
}
function pagTempo() {
  const el = $("pag-tempo");
  if (!el || COMPRA.estado !== "pago") return;
  const desde = COMPRA.quando || Date.now();
  const min = Math.floor((Date.now() - desde) / 60000);
  el.textContent = min < 1 ? "avisado agora mesmo"
    : "avisado há " + (min < 60 ? min + " min" : Math.floor(min / 60) + "h" + (min % 60) + "min");
  clearTimeout(pagTempo._t);
  pagTempo._t = setTimeout(pagTempo, 20000);
}
/* manda o pedido e já marca que a pessoa avisou o pagamento */
async function pagConfirmarPagamento() {
  if (!COMPRA.chave) {
    const r = await pedirNaLoja(COMPRA.item, COMPRA.nome, COMPRA.preco, COMPRA.extra);
    if (!r.ok) return r;
    COMPRA.chave = r.chave;
  }
  COMPRA.quando = Date.now();
  await pedidoJuntar(COMPRA.chave, { estado: "pago", pagoEm: Date.now() });
  await suporteEnviar("Paguei o Pix de " + COMPRA.nome + " — " + reais(COMPRA.preco) +
                      ". Pode conferir?", true);
  return { ok: true };
}
/* escreve num pedido, no galho certo ou no compatível */
async function pedidoJuntar(chave, obj) {
  const eu = meuIdNuvem();
  let ok = NUVEM_COMPAT ? null : await nuvemJuntar("loja_pedidos/" + chave, obj);
  if (ok === null) ok = await nuvemJuntar("pilotos/" + eu + "/_loja/" + chave, obj);
  return ok;
}
/* fica de olho: quando o painel entregar, a tela muda sozinha */
function pagOuvirPedido() {
  if (COMPRA.fluxo) { try { COMPRA.fluxo(); } catch (e) {} }
  const eu = meuIdNuvem();
  const caminho = (NUVEM_COMPAT ? "pilotos/" + eu + "/_loja/" : "loja_pedidos/") + COMPRA.chave;
  const olhar = async () => {
    const d = await nuvemReq(caminho);
    if (d && d.estado === "entregue" && COMPRA.estado !== "entregue") {
      COMPRA.estado = "entregue";
      AudioSys.power(); vibrate([60, 50, 120]);
      pagRender();
    }
  };
  COMPRA.fluxo = nuvemFluxo(caminho, olhar, () => {
    const t = setInterval(olhar, 8000);
    COMPRA.fluxo = () => clearInterval(t);
  });
}

/* ---------- conversa do jogador com o administrador ---------- */
const SUP = { msgs: [], fluxo: null, naoLidas: 0 };
function supCaminho() {
  const eu = meuIdNuvem();
  return eu ? "suporte/" + eu : null;
}
async function suporteEnviar(texto, automatico) {
  const c = supCaminho();
  texto = String(texto || "").trim().slice(0, 300);
  if (!c || !texto) return false;
  const chave = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const ok = await nuvemSoltarC(c + "/msgs/" + chave, {
    de: "jogador", nome: minhaTag(), txt: texto, quando: Date.now(), auto: !!automatico
  });
  if (ok === null) return false;
  await nuvemJuntarC(c + "/info", {
    nome: save.__name || "", tag: minhaTag(), visto: Date.now(), novasAdm: true
  });
  SUP.msgs.push({ de: "jogador", nome: minhaTag(), txt: texto, quando: Date.now() });
  supRender(true);
  return true;
}
function supAplicar(d) {
  const arr = [];
  for (const k in ((d && d.msgs) || {})) {
    const m = d.msgs[k];
    if (m && m.txt) arr.push({ k: k, de: m.de, nome: m.nome, txt: m.txt, quando: m.quando || 0 });
  }
  arr.sort((a, b) => a.quando - b.quando);
  SUP.msgs = arr.slice(-80);
  supRender(true);
}
async function suporteAbrir() {
  const c = supCaminho();
  if (!c) return;
  S.mode = "suporte";
  showScreen("suporte");
  supRender();
  if (!nuvemAtiva()) return;
  const d = await nuvemReqC(c);
  supAplicar(d);
  nuvemJuntarC(c + "/info", { novasJogador: false });
  SUP.naoLidas = 0;
  supSelo();
  suporteDesligar();
  SUP.fluxo = nuvemFluxoC(c, () => { nuvemReqC(c).then(supAplicar); },
    () => { SUP.fluxo = setInterval(() => nuvemReqC(c).then(supAplicar), 3000); });
}
function suporteDesligar() {
  if (SUP.fluxo) {
    try { if (typeof SUP.fluxo === "function") SUP.fluxo(); else clearInterval(SUP.fluxo); } catch (e) {}
    SUP.fluxo = null;
  }
}
function supRender(rolar) {
  const cx = $("sup-lista");
  if (!cx || S.mode !== "suporte") return;
  if (!SUP.msgs.length) {
    cx.innerHTML = '<div class="vazio"><b>⊙</b><strong>FALE COMIGO</strong>' +
      "<span>Dúvida sobre a loja, pagamento ou qualquer problema no jogo — " +
      "escreve aqui embaixo que eu respondo.</span></div>";
    return;
  }
  cx.innerHTML = "";
  let dia = "";
  for (const m of SUP.msgs) {
    const d = new Date(m.quando || Date.now());
    const dd = d.toLocaleDateString("pt-BR");
    if (dd !== dia) {
      dia = dd;
      const sep = document.createElement("div");
      sep.className = "chat-dia";
      sep.textContent = dd === new Date().toLocaleDateString("pt-BR") ? "hoje" : dd;
      cx.appendChild(sep);
    }
    const b = document.createElement("div");
    b.className = "chat-bolha" + (m.de === "jogador" ? " minha" : " doadm");
    b.innerHTML = (m.de === "adm" ? '<span class="chat-de">ADMINISTRADOR</span>' : "") +
      '<span class="chat-msg">' + escaparLongo(m.txt) + "</span>" +
      '<span class="chat-hora">' + d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0") + "</span>";
    cx.appendChild(b);
  }
  if (rolar !== false) cx.scrollTop = cx.scrollHeight;
}
function supSelo() {
  const b = $("loja-adm-selo");
  if (b) {
    b.textContent = SUP.naoLidas > 0 ? String(SUP.naoLidas) : "";
    b.style.display = SUP.naoLidas > 0 ? "" : "none";
  }
}
/* de tempos em tempos confere se você respondeu */
async function supChecar() {
  const c = supCaminho();
  if (!c || !nuvemAtiva() || S.mode === "playing" || S.mode === "suporte") return;
  const d = await nuvemReq(c + "/info");
  if (d && d.novasJogador) {
    SUP.naoLidas = 1;
    supSelo();
    const bt = $("loja-adm");
    if (bt) bt.classList.add("chamando");
  }
}
setInterval(supChecar, 20000);

let lojaAba = "vip";
const LOJA_ABAS = [
  { id: "vip",    nome: "👑 VIP" },
  { id: "passes", nome: "🎟 PASSES" },
  { id: "naves",  nome: "✈ NAVES" },
  { id: "pedidos", nome: "🧾 MEUS PEDIDOS" },
  { id: "trocas", nome: "♻ TROCAS" }
];

function renderLoja() {
  try { ofertaRender(); presenteRender(); } catch (e) {}
  porCristais("loja-gems");
  const abas = $("loja-abas");
  abas.innerHTML = "";
  for (const a of LOJA_ABAS) {
    const b = document.createElement("button");
    b.className = "aba" + (lojaAba === a.id ? " on" : "");
    b.textContent = a.nome;
    b.addEventListener("click", () => { lojaAba = a.id; renderLoja(); });
    abas.appendChild(b);
  }
  const cx = $("loja-corpo");
  cx.innerHTML = "";
  if (lojaAba !== "trocas") {
    const av = document.createElement("div");
    av.className = "loja-como";
    av.innerHTML = "<b>Como comprar:</b> toque no preço e abre a tela do <b>Pix</b> " +
      "com a chave, o nome de quem recebe e o código copia e cola. Pague no seu banco, " +
      "volte e toque em <b>JÁ PAGUEI</b> — a entrega chega sozinha na sua conta.";
    cx.appendChild(av);
  }
  if (lojaAba === "vip") return lojaVip(cx);
  if (lojaAba === "passes") return lojaPasses(cx);
  if (lojaAba === "naves") return lojaNaves(cx);
  if (lojaAba === "pedidos") return lojaMeusPedidos(cx);
  return lojaTrocas(cx);
}

/* botão de pedir: manda o pedido e mostra o que fazer em seguida */
function botaoPedir(item, nome, preco, extra, classe) {
  const b = document.createElement("button");
  b.className = classe || "buy-btn";
  b.innerHTML = '<span class="bp-preco">' + reais(preco) + "</span>";
  /* agora o preço abre a TELA DE PAGAMENTO: chave Pix, nome de quem
     recebe, valor e o código copia e cola já prontos */
  b.addEventListener("click", () => {
    AudioSys.resume(); AudioSys.buy(); vibrate(20);
    abrirPagamento(item, nome, preco, extra);
  });
  return b;
}
function lojaAviso(msg, bom) {
  const el = $("loja-aviso");
  if (!el) return;
  el.textContent = msg;
  el.className = "loja-aviso on " + (bom ? "bom" : "ruim");
  clearTimeout(lojaAviso._t);
  lojaAviso._t = setTimeout(() => { el.className = "loja-aviso"; }, 7000);
}

function lojaVip(cx) {
  const tem = temVip();
  const cartao = document.createElement("div");
  cartao.className = "vip-cartao" + (tem ? " ligado" : "");
  cartao.innerHTML =
    '<div class="vip-coroa">👑</div>' +
    '<div class="vip-tit">NEON VIP</div>' +
    '<div class="vip-sub">' + (tem
      ? "Ativo · faltam " + vipDiasQueFaltam() + " dia" + (vipDiasQueFaltam() === 1 ? "" : "s")
      : "Escolha quantos dias você quer") + "</div>" +
    '<div class="vip-lista">' +
      VIP_VANTAGENS.map(v => '<div class="vip-item"><b>✦</b><span>' + v + "</span></div>").join("") +
    "</div>";
  const planos = document.createElement("div");
  planos.className = "planos";
  for (const pl of VIP_PLANOS) {
    const c = document.createElement("div");
    c.className = "plano" + (pl.selo ? " marcado" : "");
    c.innerHTML =
      (pl.selo ? '<div class="plano-selo">' + pl.selo + "</div>" : "") +
      '<div class="plano-dias">' + pl.nome + "</div>" +
      '<div class="plano-preco">' + reais(pl.preco) + "</div>" +
      '<div class="plano-porDia">' + reais(pl.preco / pl.dias * 30) + " por mês</div>";
    c.appendChild(botaoPedir("vip" + pl.dias,
      "VIP de " + pl.nome.toLowerCase(), pl.preco, { dias: pl.dias }, "buy-btn plano-btn"));
    planos.appendChild(c);
  }
  cartao.appendChild(planos);
  cx.appendChild(cartao);
}

function lojaPasses(cx) {
  const nota = document.createElement("p");
  nota.className = "loja-nota";
  nota.textContent = "Os passes são para sempre: comprou uma vez, vale em toda partida, em qualquer nave.";
  cx.appendChild(nota);
  const lista = document.createElement("div");
  lista.className = "loja-lista";
  for (const pa of PASSES) {
    const tem = temPasse(pa.id);
    const card = document.createElement("div");
    card.className = "loja-card" + (tem ? " meu" : "");
    card.innerHTML =
      '<div class="loja-ic">' + pa.icone + "</div>" +
      '<div class="loja-info"><div class="loja-nome">' + pa.nome + "</div>" +
      '<div class="loja-desc">' + pa.desc + "</div></div>";
    if (tem) {
      const b = document.createElement("button");
      b.className = "buy-btn max";
      b.textContent = "SEU";
      b.disabled = true;
      card.appendChild(b);
    } else {
      card.appendChild(botaoPedir("passe:" + pa.id, pa.nome, pa.preco));
    }
    lista.appendChild(card);
  }
  cx.appendChild(lista);
}

function lojaNaves(cx) {
  const nota = document.createElement("p");
  nota.className = "loja-nota";
  nota.textContent = "Naves fortes, com poder próprio. Nenhuma chega perto da Ômega-9 — essa continua só sua.";
  cx.appendChild(nota);
  const lista = document.createElement("div");
  lista.className = "loja-lista";
  for (let i = NAVES_LOJA_DE; i < NAVES_LOJA_ATE; i++) {
    const sh = SHIPS[i];
    const tenho = shipOwned(i);
    const card = document.createElement("div");
    card.className = "loja-card nave" + (tenho ? " meu" : "");
    const cv = document.createElement("canvas");
    cv.className = "loja-nave";
    cv.width = 108; cv.height = 108;
    const g = cv.getContext("2d");
    g.setTransform(2, 0, 0, 2, 54, 56);
    drawShipSprite(g, i, 19);
    const info = document.createElement("div");
    info.className = "loja-info";
    info.innerHTML =
      '<div class="loja-nome">' + escaparTexto(sh.name) + "</div>" +
      '<div class="loja-desc"><b style="color:var(--amber)">' + sh.powerName + "</b> — " + sh.powerDesc + "</div>" +
      '<div class="loja-num">' +
        '<span>dano <b>' + sh.baseDmg.toFixed(1) + "</b></span>" +
        '<span>casco <b>' + sh.baseHp + "</b></span>" +
        '<span>agilidade <b>' + sh.baseAgi.toFixed(2) + "</b></span>" +
        '<span>cristais <b>' + sh.baseGem.toFixed(2) + "x</b></span></div>";
    card.appendChild(cv); card.appendChild(info);
    if (tenho) {
      const b = document.createElement("button");
      b.className = "buy-btn";
      if (save.ship === i) { b.classList.add("max"); b.textContent = "EM USO"; b.disabled = true; }
      else { b.textContent = "USAR"; b.addEventListener("click", () => {
        save.ship = i; persist(); calcStats(); AudioSys.buy(); renderLoja(); }); }
      card.appendChild(b);
    } else {
      card.appendChild(botaoPedir("nave:" + i, sh.name, sh.price, { nave: i }));
    }
    lista.appendChild(card);
  }
  cx.appendChild(lista);
}

function lojaMeusPedidos(cx) {
  const nota = document.createElement("p");
  nota.className = "loja-nota";
  nota.textContent = "Tudo que você já pediu, com o andamento de cada um.";
  cx.appendChild(nota);
  const meus = (save.pedidos || []).slice().reverse();
  // busca o estado de cada pedido na nuvem, para o cartão ficar certo
  lojaEstadosDosPedidos(meus);
  if (!meus.length) {
    cx.innerHTML += '<div class="vazio"><b>🧾</b><strong>NENHUM PEDIDO AINDA</strong>' +
      "<span>Escolha o que quiser nas outras abas e toque no preço.</span></div>";
    return;
  }
  const lista = document.createElement("div");
  lista.className = "loja-lista";
  for (const pd of meus) {
    const est = pd.estado || "esperando";
    const c = document.createElement("div");
    c.className = "loja-card pedido-" + est;
    c.dataset.chave = pd.chave || "";
    const explica =
      est === "entregue" ? "entregue — já está na sua conta"
      : est === "recusado" ? "cancelado"
      : est === "pago" ? "Esperando o desenvolvedor te responder — leva em torno de 30 min a 1h"
      : "esperando o pagamento";
    c.innerHTML =
      '<div class="loja-ic">' + (est === "entregue" ? "🎁" : est === "pago" ? "⏳" : "🧾") + "</div>" +
      '<div class="loja-info">' +
      '<div class="loja-nome">' + escaparTexto(pd.itemNome) + "</div>" +
      '<div class="loja-desc">' + reais(pd.preco) + " · " + quandoTexto(pd.quando) + " atrás</div>" +
      '<div class="pedido-linha">' + explica + "</div></div>" +
      '<span class="pedido-estado ' + est + '">' + est + "</span>";
    lista.appendChild(c);
  }
  cx.appendChild(lista);
  const b = document.createElement("button");
  b.className = "ghost-btn";
  b.style.cssText = "width:100%;max-width:520px;margin:14px auto 0;display:block";
  b.textContent = "⊙ FALAR COM O ADMINISTRADOR";
  b.addEventListener("click", suporteAbrir);
  cx.appendChild(b);
}

/* pergunta à nuvem como está cada pedido e redesenha quando muda */
let lojaEstadosLendo = false;
async function lojaEstadosDosPedidos(meus) {
  if (lojaEstadosLendo || !nuvemAtiva() || !meus.length) return;
  lojaEstadosLendo = true;
  try {
    const eu = meuIdNuvem();
    const novos = NUVEM_COMPAT
      ? (await nuvemReq("pilotos/" + eu + "/_loja")) || {}
      : (await nuvemReq("loja_pedidos")) || {};
    let mudou = false;
    for (const pd of (save.pedidos || [])) {
      const d = novos[pd.chave];
      if (d && d.estado && d.estado !== pd.estado) { pd.estado = d.estado; mudou = true; }
    }
    if (mudou) { persist(); if (S.mode === "loja" && lojaAba === "pedidos") renderLoja(); }
  } catch (e) {}
  lojaEstadosLendo = false;
}

function lojaTrocas(cx) {
  const nota = document.createElement("p");
  nota.className = "loja-nota";
  nota.textContent = "Coisas paradas viram cristais.";
  cx.appendChild(nota);
  const lista = document.createElement("div");
  lista.className = "loja-lista";

  /* vender naves compradas que você não usa */
  const repetidas = save.ships.filter(i => i !== save.ship && i !== 0 && !naveExclusiva(i));
  const valeTudo = repetidas.reduce((a, i) => a + Math.round((SHIPS[i] || {}).price * 0.4 || 0), 0);
  const c1 = document.createElement("div");
  c1.className = "loja-card";
  c1.innerHTML = '<div class="loja-ic">✈</div><div class="loja-info">' +
    '<div class="loja-nome">Vender naves paradas</div>' +
    '<div class="loja-desc">' + (repetidas.length
      ? repetidas.length + " nave" + (repetidas.length === 1 ? "" : "s") + " que você não está usando, por 40% do preço."
      : "Você não tem nave parada para vender.") + "</div></div>";
  const b1 = document.createElement("button");
  b1.className = "buy-btn";
  b1.textContent = repetidas.length ? "◆ " + fmt(valeTudo) : "—";
  b1.disabled = !repetidas.length;
  let conf1 = false;
  b1.addEventListener("click", () => {
    if (!conf1) { conf1 = true; b1.textContent = "TOQUE DE NOVO"; setTimeout(() => { conf1 = false; renderLoja(); }, 3000); return; }
    save.ships = save.ships.filter(i => !repetidas.includes(i));
    save.crystals += valeTudo;
    persist(); AudioSys.buy(); renderLoja();
  });
  c1.appendChild(b1);
  lista.appendChild(c1);

  /* trocar pontos por cristais */
  const pontos = save.hi || 0;
  const vale = Math.round(pontos * 0.5);
  const c2 = document.createElement("div");
  c2.className = "loja-card";
  c2.innerHTML = '<div class="loja-ic">✧</div><div class="loja-info">' +
    '<div class="loja-nome">Trocar o seu recorde</div>' +
    '<div class="loja-desc">Transforma o seu recorde de pontos em cristais, uma vez. O recorde continua no ranking.</div></div>';
  const b2 = document.createElement("button");
  b2.className = "buy-btn";
  const jaTrocou = !!save.trocouRecorde;
  b2.textContent = jaTrocou ? "JÁ FOI" : "◆ " + fmt(vale);
  b2.disabled = jaTrocou || vale <= 0;
  b2.addEventListener("click", () => {
    save.crystals += vale;
    save.trocouRecorde = true;
    persist(); AudioSys.buy(); renderLoja();
  });
  c2.appendChild(b2);
  lista.appendChild(c2);

  cx.appendChild(lista);
}

/* ---------- Seleção de fases ---------- */
/* =====================================================================
   OS 14 SETORES, CADA UM COM A SUA CARA
   ---------------------------------------------------------------------
   O nome do setor deixou de ser só um texto: cada um tem a sua cor de
   céu, o seu brilho, o que flutua no ar e o clima da música. Voar da
   Periferia até o Coração da Nebulosa passa por 14 lugares diferentes.
   ===================================================================== */
const SETORES = [
  { nome: "PERIFERIA", icone: "✦", cor: "#4DE8FF",
    conta: "A borda do setor 7. Céu limpo, poeira de estrela e pouca coisa no caminho.",
    ceu: ["#060A18", "#0B1730"], brilho: ["rgba(77,232,255,.10)", "rgba(120,160,255,.06)"],
    flutua: "poeira", ritmo: 1 },
  { nome: "CAMPO DE ASTEROIDES", icone: "◍", cor: "#C6A98A",
    conta: "Pedra girando de todo lado. O céu fica marrom de tanta poeira.",
    ceu: ["#0C0A06", "#241B10"], brilho: ["rgba(198,169,138,.12)", "rgba(255,180,110,.05)"],
    flutua: "pedra", ritmo: 1 },
  { nome: "NEBULOSA ROSA", icone: "❁", cor: "#FF4D8F",
    conta: "Um berçário de estrelas. Bonito, rosado, e cheio de gente escondida na névoa.",
    ceu: ["#160617", "#3A0B33"], brilho: ["rgba(255,77,143,.16)", "rgba(195,77,255,.09)"],
    flutua: "nevoa", ritmo: 1 },
  { nome: "CINTURÃO ESCURO", icone: "◐", cor: "#6E7FA8",
    conta: "Onde a luz não chega. Você enxerga pouco e ouve muito.",
    ceu: ["#03040A", "#0A0D18"], brilho: ["rgba(110,127,168,.07)", "rgba(60,80,140,.05)"],
    flutua: "vazio", ritmo: 0.9 },
  { nome: "TEMPESTADE IÔNICA", icone: "⚡", cor: "#7BE8FF",
    conta: "Raios cortando o céu o tempo todo. A eletricidade deixa tudo azulado.",
    ceu: ["#040D1C", "#0C2946"], brilho: ["rgba(123,232,255,.16)", "rgba(80,160,255,.09)"],
    flutua: "faisca", ritmo: 1.1 },
  { nome: "NÚCLEO PROFUNDO", icone: "◉", cor: "#C34DFF",
    conta: "O miolo do sistema. Pressão alta, luz roxa e nada de amigo por perto.",
    ceu: ["#0B0418", "#231043"], brilho: ["rgba(195,77,255,.15)", "rgba(120,60,255,.08)"],
    flutua: "anel", ritmo: 1 },
  { nome: "CEMITÉRIO DE NAVES", icone: "☠", cor: "#8FA3A8",
    conta: "Cascos velhos boiando. Tudo que veio antes de você parou aqui.",
    ceu: ["#070B0D", "#141E22"], brilho: ["rgba(143,163,168,.09)", "rgba(90,120,130,.06)"],
    flutua: "destroco", ritmo: 0.95 },
  { nome: "ANEL DE PLASMA", icone: "◎", cor: "#FF8A4D",
    conta: "Um anel de fogo em volta da estrela. Quente, laranja e barulhento.",
    ceu: ["#180702", "#40160A"], brilho: ["rgba(255,138,77,.18)", "rgba(255,80,40,.10)"],
    flutua: "brasa", ritmo: 1.15 },
  { nome: "FENDA GELADA", icone: "❆", cor: "#A8E8FF",
    conta: "Uma rachadura congelada no espaço. Cristal de gelo até onde a vista alcança.",
    ceu: ["#04121C", "#0D2E42"], brilho: ["rgba(168,232,255,.15)", "rgba(120,200,255,.08)"],
    flutua: "gelo", ritmo: 0.92 },
  { nome: "OLHO DA TEMPESTADE", icone: "◌", cor: "#5BF0B0",
    conta: "O centro parado de um redemoinho enorme. Calmo demais para ser bom.",
    ceu: ["#02100C", "#0A2E24"], brilho: ["rgba(91,240,176,.15)", "rgba(60,200,180,.08)"],
    flutua: "redemoinho", ritmo: 1 },
  { nome: "FORJA ESTELAR", icone: "✷", cor: "#FFC145",
    conta: "Onde as estrelas nascem. Ouro derretido pingando do céu.",
    ceu: ["#180F02", "#43290A"], brilho: ["rgba(255,193,69,.18)", "rgba(255,140,40,.09)"],
    flutua: "faulha", ritmo: 1.1 },
  { nome: "MAR DE DESTROÇOS", icone: "▨", cor: "#9DB6E8",
    conta: "Sucata de mil batalhas girando devagar. Dá para se esconder atrás dela.",
    ceu: ["#060A14", "#131C33"], brilho: ["rgba(157,182,232,.10)", "rgba(100,130,200,.06)"],
    flutua: "sucata", ritmo: 0.95 },
  { nome: "LIMIAR DO VAZIO", icone: "○", cor: "#D8D8E8",
    conta: "A última fronteira antes do nada. O céu quase não tem cor.",
    ceu: ["#010104", "#0A0A12"], brilho: ["rgba(216,216,232,.06)", "rgba(160,160,200,.04)"],
    flutua: "risco", ritmo: 0.88 },
  { nome: "CORAÇÃO DA NEBULOSA", icone: "❤", cor: "#FF4D6B",
    conta: "O fim da viagem. Tudo pulsa junto, como um coração muito grande.",
    ceu: ["#1A0410", "#4A0A24"], brilho: ["rgba(255,77,107,.20)", "rgba(255,140,60,.10)"],
    flutua: "pulso", ritmo: 1.05 }
];
const SECTOR_NAMES = SETORES.map((s2, i) => "SETOR " + (i + 1) + " — " + s2.nome);
/* de que setor é uma fase (1 a 14) */
function setorDaFase(f) {
  return SETORES[clamp(Math.floor((f - 1) / 20), 0, SETORES.length - 1)] || SETORES[0];
}
function setorAtual() {
  if (typeof MP !== "undefined" && MP && MP.modo === "arena") {
    return SETORES[clamp(Math.floor((S.fase - 1) / 20), 0, SETORES.length - 1)];
  }
  return setorDaFase(S.fase);
}
function renderDificuldade() {
  const cx = $("dif-linha");
  if (!cx) return;
  const atual = (save.dificuldade || "medio");
  cx.innerHTML = "";
  for (const d of DIFICULDADES) {
    const b = document.createElement("button");
    b.className = "dif-btn" + (d.id === atual ? " on" : "");
    b.style.borderColor = d.id === atual ? d.cor : "";
    b.innerHTML = '<b style="color:' + d.cor + '">' + d.icone + "</b><span>" + d.nome + "</span>";
    b.title = d.desc;
    b.addEventListener("click", () => {
      save.dificuldade = d.id;
      persist();
      AudioSys.buy();
      renderDificuldade();
      renderLevels();
    });
    cx.appendChild(b);
  }
}
function renderLevels() {
  porCristais("levels-gems");
  renderDificuldade();
  const grid = $("fase-grid");
  grid.innerHTML = "";
  const D = dificuldadeAtual();
  const proxima = Math.min(TOTAL_FASES, (save.best || 0) + 1);

  /* três caixinhas no topo: onde você parou, quanto já fez e quantos chefes */
  const feitas = Math.min(save.best || 0, TOTAL_FASES);
  let chefesFeitos = 0, chefesTotal = 0;
  for (let f = 1; f <= TOTAL_FASES; f++) {
    if (isBossFase(f)) { chefesTotal++; if (f <= feitas) chefesFeitos++; }
  }
  const resumo = document.createElement("div");
  resumo.className = "fase-resumo";
  resumo.innerHTML =
    '<div class="fase-res-cx ouro"><b>' + proxima + '</b><span>PRÓXIMA</span></div>' +
    '<div class="fase-res-cx"><b>' + Math.round(feitas / TOTAL_FASES * 100) + '%</b><span>COMPLETO</span></div>' +
    '<div class="fase-res-cx rosa"><b>' + chefesFeitos + '/' + chefesTotal + '</b><span>CHEFES</span></div>' +
    '<div class="fase-res-cx ouro"><b>' + estrelasTotal() + '</b><span>ESTRELAS</span></div>';
  grid.appendChild(resumo);

  const nota = document.createElement("div");
  nota.className = "dif-nota";
  nota.textContent = D.desc + "  ·  " + faseWaves(Math.max(1, save.best || 1)) +
    " ondas na sua fase · prêmio " + (D.premio >= 1 ? "+" : "") +
    Math.round((D.premio - 1) * 100) + "%";
  grid.appendChild(nota);

  /* cada setor vira um bloco com nome, barra de progresso e as suas fases */
  const nSetores = Math.ceil(TOTAL_FASES / 20);
  for (let si = 0; si < nSetores; si++) {
    const de = si * 20 + 1;
    const ate = Math.min(TOTAL_FASES, de + 19);
    let prontas = 0;
    for (let f = de; f <= ate; f++) if (f <= feitas) prontas++;
    const total = ate - de + 1;
    const trancado = de > feitas + 1;

    const bloco = document.createElement("div");
    bloco.className = "setor-bloco";
    const cab = document.createElement("div");
    cab.className = "setor-cab" + (prontas === total ? " pronto" : "") + (trancado ? " trancado" : "");
    cab.innerHTML =
      '<span class="setor-nome">' + (SECTOR_NAMES[si] || "SETOR " + (si + 1)) + '</span>' +
      '<span class="setor-barra"><i style="width:' + Math.round(prontas / total * 100) + '%"></i></span>' +
      '<span class="setor-cont">' + prontas + '/' + total + '</span>';
    bloco.appendChild(cab);

    const g = document.createElement("div");
    g.className = "fase-grid";
    for (let f = de; f <= ate; f++) {
      const b = document.createElement("button");
      b.className = "fase-btn";
      if (isBossFase(f)) b.classList.add("boss");
      if (f <= save.best) {
        b.classList.add("done");
        /* mostra as estrelas conquistadas na fase, não um ★ fixo */
        const est = (save.estrelas && save.estrelas[f]) || 1;
        b.innerHTML = f + '<small class="fase-est">' +
          "★★★".slice(0, est) + '<em>' + "★★★".slice(est) + "</em></small>";
      } else if (f === save.best + 1) {
        b.classList.add("next");
        b.innerHTML = f + "<small>" + (isBossFase(f) ? "CHEFE" : "AQUI") + "</small>";
      } else {
        b.classList.add("locked");
        b.textContent = f;
      }
      b.addEventListener("click", () => { AudioSys.resume(); startGame(f); });
      g.appendChild(b);
    }
    bloco.appendChild(g);
    grid.appendChild(bloco);
  }
  requestAnimationFrame(() => {
    const next = grid.querySelector(".fase-btn.next");
    if (next) next.scrollIntoView({ block: "center" });
  });
}

/* ---------- Loja ---------- */
function renderShop() {
  porCristais("shop-gems");
  const list = $("shop-list");
  list.innerHTML = "";
  for (const u of UPGRADES) {
    const lvl = save.upgrades[u.id] || 0;
    const card = document.createElement("div");
    const noMax = lvl >= u.max;
    const daPara = !noMax && save.crystals >= upgradeCost(u, lvl);
    card.className = "shop-card" + (noMax ? " cheio" : daPara ? " pode" : "");
    const pips = [];
    for (let i = 0; i < u.max; i++) pips.push('<span class="pip' + (i < lvl ? " on" : "") + '"></span>');
    card.innerHTML =
      '<div class="shop-icon">' + u.icon + '</div>' +
      '<div class="shop-info">' +
        '<div class="shop-name">' + u.name + '</div>' +
        '<div class="shop-desc">' + u.desc + '</div>' +
        '<div class="pips">' + pips.join("") + '</div>' +
      '</div>';
    const btn = document.createElement("button");
    btn.className = "buy-btn";
    if (lvl >= u.max) {
      btn.classList.add("max");
      btn.textContent = "MÁX";
      btn.disabled = true;
    } else {
      const cost = upgradeCost(u, lvl);
      btn.textContent = "◆ " + fmt(cost);
      btn.disabled = save.crystals < cost;
      btn.addEventListener("click", () => {
        AudioSys.resume();
        if (save.crystals < cost) { AudioSys.deny(); return; }
        save.crystals -= cost;
        save.upgrades[u.id]++;
        persist(); calcStats();
        AudioSys.buy(); vibrate(20);
        renderShop();
      });
    }
    card.appendChild(btn);
    list.appendChild(card);
  }
}

/* ---------- Hangar ---------- */
/* filtro escolhido na barra de cima (nao entra no save: e so da sessao) */
let hangarFiltro = "todas";
const HANGAR_FILTROS = [
  { id: "todas",  nome: "TODAS" },
  { id: "minhas", nome: "NO HANGAR" },
  { id: "venda",  nome: "À VENDA" },
  { id: "poder",  nome: "MAIS FORTES" }
];
/* nota de 0 a 1 de cada atributo, so para desenhar as barrinhas */
function forcaDaNave(i) {
  const sh = SHIPS[i] || SHIPS[0];
  const P = shipPartsOf(i);
  return {
    dano: clamp((sh.baseDmg * (1 + 0.06 * (P.cannon || 0)) - 0.8) / 2.6, 0.05, 1),
    cad:  clamp(((sh.baseRate || 1) * (1 + 0.05 * (P.turbine || 0)) - 0.7) / 1.5, 0.05, 1),
    casco: clamp(((sh.baseHp || 120) * (1 + 0.08 * (P.armor || 0))) / 420, 0.05, 1),
    agi:  clamp(((sh.baseAgi || 1) * (1 + 0.06 * (P.engine || 0)) - 0.7) / 1.1, 0.05, 1)
  };
}
function renderHangarAtual() {
  /* mostra a virtude que a nave tem sem apertar nada */
  try {
    const pv = $("hangar-passiva");
    if (pv) {
      const pa = passivaDaNave(naveValida(save.ship));
      pv.innerHTML = '<b>✦ ' + escaparTexto(pa.nome) + "</b><span>" +
                     escaparTexto(pa.desc) + "</span>";
    }
  } catch (e) {}
  const cx = $("hangar-atual");
  if (!cx) return;
  const i = naveValida(save.ship);
  const sh = SHIPS[i];
  const f = forcaDaNave(i);
  cx.innerHTML =
    '<canvas class="ha-nave" id="ha-canvas" width="128" height="128"></canvas>' +
    '<div class="ha-txt">' +
      '<div class="ha-rot">EM USO AGORA</div>' +
      '<div class="ha-nome">' + escaparTexto(sh.name) + '</div>' +
      '<div class="ha-barras">' +
        '<div class="ha-b"><span>DANO</span><i><u style="width:' + Math.round(f.dano * 100) + '%"></u></i></div>' +
        '<div class="ha-b q"><span>TIRO</span><i><u style="width:' + Math.round(f.cad * 100) + '%"></u></i></div>' +
        '<div class="ha-b v"><span>CASCO</span><i><u style="width:' + Math.round(f.casco * 100) + '%"></u></i></div>' +
        '<div class="ha-b g"><span>ÁGIL</span><i><u style="width:' + Math.round(f.agi * 100) + '%"></u></i></div>' +
      '</div>' +
    '</div>';
  const cv = $("ha-canvas");
  if (cv) {
    const c = cv.getContext("2d");
    c.setTransform(2, 0, 0, 2, 64, 68);
    drawShipSprite(c, i, 19);
  }
}
function renderHangarFiltros() {
  const cx = $("hangar-filtros");
  if (!cx) return;
  cx.innerHTML = "";
  for (const f of HANGAR_FILTROS) {
    const b = document.createElement("button");
    b.className = "hf-btn" + (hangarFiltro === f.id ? " on" : "");
    b.textContent = f.nome;
    b.addEventListener("click", () => {
      hangarFiltro = f.id;
      AudioSys.buy();
      renderHangar();
    });
    cx.appendChild(b);
  }
}
function renderHangar(scrollToSel) {
  try { conjuntosRender(); } catch (e) {}
  porCristais("hangar-gems");
  document.querySelector(".hangar-topo").style.display = CRIAR_NAVE_LIGADO ? "" : "none";
  renderHangarAtual();
  renderHangarFiltros();
  const list = $("ship-list");
  list.innerHTML = "";

  /* monta a ordem conforme o filtro escolhido */
  let ordem = [];
  for (let i = 0; i < SHIPS.length; i++) ordem.push(i);
  if (hangarFiltro === "minhas") ordem = ordem.filter(i => shipOwned(i));
  else if (hangarFiltro === "venda") ordem = ordem.filter(i => !shipOwned(i) && !naveExclusiva(i));
  else if (hangarFiltro === "poder") {
    ordem.sort((a, b) => {
      const fa = forcaDaNave(a), fb = forcaDaNave(b);
      return (fb.dano + fb.cad + fb.casco + fb.agi) - (fa.dano + fa.cad + fa.casco + fa.agi);
    });
  }
  if (!ordem.length) {
    const v = document.createElement("div");
    v.className = "vazio";
    v.innerHTML = "<b>✈</b><strong>NADA POR AQUI</strong><span>" +
      (hangarFiltro === "venda"
        ? "Você já tem todas as naves que estão à venda. Bom trabalho!"
        : "Nenhuma nave nesse filtro.") + "</span>";
    list.appendChild(v);
    return;
  }

  for (const i of ordem) {
    const sh = SHIPS[i];
    const owned = shipOwned(i);
    const selected = save.ship === i;
    const card = document.createElement("div");
    card.className = "ship-card" + (selected ? " sel" : "") + (owned ? "" : " tranc");
    card.style.setProperty("--faixa", shipColor(i));
    const top = document.createElement("div");
    top.className = "ship-top";

    const thumb = document.createElement("canvas");
    thumb.className = "ship-thumb";
    thumb.width = 112; thumb.height = 112;
    const tctx = thumb.getContext("2d");
    tctx.setTransform(2, 0, 0, 2, 56, 60);
    drawShipSprite(tctx, i, 16);

    const ult = ULTS[sh.ultId || sh.power] || { name: "Sobrecarga" };
    const exc = naveExclusiva(i);
    const feita = naveCriada(i);
    const habs = HABILIDADES[i] ? HABILIDADES[i].length : 0;
    const info = document.createElement("div");
    info.className = "ship-info";
    info.innerHTML =
      '<div class="ship-name">' + (i + 1) + '. ' + escaparTexto(sh.name) +
        (exc ? ' <span style="color:var(--amber);font-size:.62rem">★ EXCLUSIVA</span>' : '') +
        (feita ? ' <span style="color:var(--violet);font-size:.62rem">🛠 SUA</span>' : '') + '</div>' +
      '<div class="ship-power"><b>' + sh.powerName + '</b> — ' +
        (sh.troca
          /* verde e vermelho pela VARIÁVEL, e não pelo hexa: um
             verde-menta some no tema claro, e a cor escrita aqui dentro
             não obedece a tema nenhum */
          ? '<span style="color:var(--verde)">' + sh.virtude + '</span>, mas <span style="color:var(--danger)">' + sh.defeito + '</span>'
          : sh.powerDesc) + '</div>' +
      '<div class="ship-ult">ULT: ' + ult.name +
        (habs ? ' · ' + habs + ' habilidades' : '') + '</div>' +
      '<div class="ship-tag" style="color:' +
        (selected ? "var(--cyan)" : owned ? "var(--amber)" : "var(--dim)") + '">' +
        (selected ? "EM USO" : owned ? (feita ? "MONTADA POR VOCÊ" : "NO HANGAR")
         : exc ? "SÓ O ADMINISTRADOR ENTREGA" : "◆ " + fmt(sh.price)) + '</div>';

    const btn = document.createElement("button");
    btn.className = "buy-btn";
    if (selected) {
      btn.classList.add("max");
      btn.textContent = "EM USO";
      btn.disabled = true;
    } else if (owned) {
      btn.textContent = "USAR";
      btn.addEventListener("click", () => {
        AudioSys.resume();
        save.ship = i;
        persist(); calcStats();
        AudioSys.buy();
        playCutscene(i, "hangar");   // apresentação de 5 segundos
      });
    } else if (exc) {
      btn.textContent = "★";
      btn.disabled = true;
    } else {
      btn.textContent = "◆ " + fmt(sh.price);
      btn.disabled = save.crystals < sh.price;
      btn.addEventListener("click", () => {
        AudioSys.resume();
        if (save.crystals < sh.price) { AudioSys.deny(); return; }
        save.crystals -= sh.price;
        save.ships.push(i);
        save.ship = i;
        persist(); calcStats();
        AudioSys.buy(); vibrate(25);
        playCutscene(i, "hangar");
      });
    }

    top.appendChild(thumb); top.appendChild(info); top.appendChild(btn);
    card.appendChild(top);
    // quatro barrinhas de comparacao rapida entre as naves
    const fz = forcaDaNave(i);
    const mini = document.createElement("div");
    mini.className = "ship-mini";
    mini.title = "dano · cadência · casco · agilidade";
    mini.innerHTML =
      '<i><u style="width:' + Math.round(fz.dano * 100) + '%;background:var(--cyan)"></u></i>' +
      '<i><u style="width:' + Math.round(fz.cad * 100) + '%;background:var(--amber)"></u></i>' +
      '<i><u style="width:' + Math.round(fz.casco * 100) + '%;background:var(--magenta)"></u></i>' +
      '<i><u style="width:' + Math.round(fz.agi * 100) + '%;background:var(--violet)"></u></i>';
    card.appendChild(mini);
    if (selected) {
      const tools = document.createElement("div");
      tools.className = "ship-tools";
      const bOf = document.createElement("button");
      bOf.className = "ghost-btn";
      bOf.textContent = "🔧 OFICINA 3D";
      bOf.addEventListener("click", () => { AudioSys.resume(); openOficina(); });
      if (feita) {
        const pos = i - NAVES_BASE;
        const bEd = document.createElement("button");
        bEd.className = "ghost-btn";
        bEd.textContent = "🛠 MUDAR";
        bEd.addEventListener("click", () => { AudioSys.resume(); abrirConstrutor(pos); });
        const bDel = document.createElement("button");
        bDel.className = "ghost-btn";
        bDel.style.color = "var(--danger)";
        bDel.textContent = "✕ DESMONTAR";
        let confirma = false;
        bDel.addEventListener("click", () => {
          if (!confirma) {
            confirma = true;
            bDel.textContent = "TOQUE DE NOVO";
            setTimeout(() => { confirma = false; bDel.textContent = "✕ DESMONTAR"; }, 3000);
            return;
          }
          apagarNaveCriada(pos);
        });
        tools.appendChild(bEd);
        tools.appendChild(bDel);
      }
      const bCut = document.createElement("button");
      bCut.className = "ghost-btn";
      bCut.textContent = "▶ APRESENTAÇÃO";
      bCut.addEventListener("click", () => { AudioSys.resume(); playCutscene(save.ship, "hangar"); });
      tools.appendChild(bOf); tools.appendChild(bCut);
      card.appendChild(tools);
      card.appendChild(buildHabPanel(i));
      card.appendChild(buildPartsPanel(i));
    }
    list.appendChild(card);
  }
  if (scrollToSel) {
    requestAnimationFrame(() => {
      const sel = list.querySelector(".ship-card.sel");
      if (sel) sel.scrollIntoView({ block: "center" });
    });
  }
}

/* =====================================================================
   O DONO JÁ ENTRA COM TUDO
   ---------------------------------------------------------------------
   A conta do dono (a mesma lista do painel: Cr1cket) não precisa comprar
   nada nem esperar presente. Toda vez que ela entra, o jogo confere e
   deixa tudo liberado: as 120 naves, as exclusivas, as da loja, as peças
   e pinturas no máximo, todas as habilidades da árvore, as habilidades
   de cada nave no nível 10, todas as fases, VIP e os oito passes.
   É idempotente: entrar de novo não duplica nada.
   ===================================================================== */
const DONO_BRINDE = 1;      // sobe quando entrar coisa nova para o dono
const CRISTAIS_DONO = 999999999;
/* Na conta do dono os cristais não acabam nunca, então em vez de um
   número gigante o jogo mostra o sinal de infinito. */
function cristaisInfinitos() {
  try { return contaDeDono(save && save.__name); } catch (e) { return false; }
}
function cristaisTexto(n) {
  return cristaisInfinitos() ? "∞" : fmt(n);
}
/* escreve o saldo numa pílula da tela e marca quando é o infinito, para
   o símbolo aparecer no tamanho certo em vez de virar um risquinho */
function porCristais(id) {
  const el = $(id);
  if (!el) return;
  el.textContent = cristaisTexto(save.crystals);
  el.classList.toggle("infinito", cristaisInfinitos());
}
function contaDeDono(nome) {
  try { return ehDono(String(nome == null ? "" : nome).trim()); } catch (e) { return false; }
}
function darTudoAoDono(nome) {
  const alvo = nome === undefined ? (save && save.__name) : nome;
  if (!contaDeDono(alvo)) return false;
  const p = save;
  if (!p) return false;

  /* cristais, fases e pontos */
  p.crystals = CRISTAIS_DONO;
  p.best = TOTAL_FASES;
  p.pts = Math.max(p.pts || 0, TOTAL_FASES);
  p.hi = Math.max(p.hi || 0, 100000);

  /* todas as naves da lista, exclusivas e da loja no meio */
  const tem = {};
  for (const i of (p.ships || [])) tem[i] = 1;
  const todas = [];
  for (let i = 0; i < NAVES_BASE; i++) { todas.push(i); tem[i] = 1; }
  p.ships = todas;

  /* árvore de habilidades inteira */
  p.skills = p.skills || {};
  for (const b of ["atk", "def", "res"]) for (let t = 1; t <= 40; t++) p.skills[b + t] = true;

  /* melhorias da loja no máximo */
  p.upgrades = p.upgrades || {};
  for (const u of UPGRADES) p.upgrades[u.id] = u.max;

  /* peças, armas, pinturas e brilhos de todas as naves */
  p.parts = p.parts || {}; p.weapons = p.weapons || {};
  p.paints = p.paints || {}; p.glows = p.glows || {};
  for (let i = 0; i < NAVES_BASE; i++) {
    p.parts[i] = p.parts[i] || {};
    for (const part of PARTS) p.parts[i][part.id] = PART_MAX;
    p.weapons[i] = WEAPONS.map(w => w.id);
    p.paints[i] = PAINT_HUES.slice();
    p.glows[i] = PAINT_HUES.slice();
  }

  /* as habilidades de cada nave já no nível máximo */
  p.habNv = p.habNv || {};
  for (let i = 0; i < NAVES_BASE; i++) {
    for (const h of habsUpgrade(i)) p.habNv[chaveHab(i, h.id)] = HAB_MAX;
  }

  /* VIP e os passes, sem prazo */
  p.vipAte = Math.max(p.vipAte || 0, Date.now() + 36500 * 86400000);
  p.passes = p.passes || {};
  for (const pa of PASSES) p.passes[pa.id] = true;

  /* amuletos: uma vez só, para não encher o inventário a cada login */
  if (p.donoBrinde !== DONO_BRINDE) {
    try {
      for (const sp of AMULET_SPECIALS) admDarAmuleto(p, sp.id, 3);
      for (const t of AMULET_TYPES) admDarAmuleto(p, t.id, 3);
      if (!p.equipped || !p.equipped.length) {
        p.equipped = (p.amulets || []).slice(0, 3).map(a => a.uid);
      }
    } catch (e) {}
    p.donoBrinde = DONO_BRINDE;
  }
  return true;
}

