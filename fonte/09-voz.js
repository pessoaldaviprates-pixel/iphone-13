/* =====================================================================
   A VOZ — salas e chamadas de verdade
   =====================================================================
   Microfone do navegador (getUserMedia) e ligação direta entre os dois
   aparelhos (WebRTC). Sem servidor de áudio: a voz vai de celular para
   celular, e a nuvem só serve para os dois se acharem.

   COMO DOIS APARELHOS SE ACHAM
   ---------------------------------------------------------------------
   Cada um escreve um bilhete para o outro num galho da nuvem e lê os
   bilhetes endereçados a si:

     conversas/voz__<sala>/dentro/<uid>          quem está na sala
     conversas/voz__<sala>/sinais/<para>/<k>     os bilhetes

   POR QUE ISTO NÃO USA FLUXO (SSE)
   ---------------------------------------------------------------------
   Porque o fluxo é UM SÓ, e ele é da conversa. Passar de umas seis
   conexões abertas já travou as gravações do jogo uma vez, e uma sala
   de voz com fluxo próprio comeria justamente a que falta. Então a voz
   dá uma olhadinha curta a cada 1,2s: são pedidos que abrem e fecham,
   e é o mesmo desenho das não lidas.

   QUEM LIGA PARA QUEM
   ---------------------------------------------------------------------
   Sempre o de identificador MENOR faz a oferta. Sem essa regra os dois
   ofereceriam ao mesmo tempo, as ofertas se cruzariam e a ligação
   morreria no meio -- é um problema conhecido e a saída mais barata é
   combinar a ordem antes, em vez de negociar depois.

   O QUE ESTA VERSÃO NÃO FAZ
   ---------------------------------------------------------------------
   Não tem servidor de retransmissão (TURN). Em quase toda internet
   caseira e no 4G a ligação direta fecha com os servidores públicos de
   STUN; em algumas redes de escola e empresa, não fecha. Quando não
   fechar, o jogo DIZ isso em vez de ficar rodando para sempre.
   ===================================================================== */

const VOZ_SERVIDORES = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" }
];
const VOZ_OLHADA = 1200;      // de quanto em quanto tempo olho os bilhetes
const VOZ_BATIDA = 12000;     // de quanto em quanto tempo digo "ainda estou aqui"
const VOZ_SUMIU  = 40000;     // sem dar sinal por isso, saiu da sala
const VOZ_ESPERA = 20000;     // sem conectar nisso, desisto e aviso

const VOZ = {
  sala: null,        // em que sala estou
  nome: "",          // o nome dela, para mostrar
  eu: "",            // meu id
  meu: null,         // o meu áudio (MediaStream)
  pares: {},         // uid -> { pc, audio, stream, desde, estado }
  dentro: {},        // uid -> ficha de quem está na sala (da nuvem)
  mudo: false,       // meu microfone fechado
  surdo: false,      // não escuto ninguém (e isso também me cala)
  relogio: null,
  batida: null,
  medidor: null,
  falando: {},       // uid -> true enquanto sai som
  entrando: false
};

function vozCaminho(sala) { return "conversas/voz__" + sala; }
function vozTem() { return !!(navigator.mediaDevices && window.RTCPeerConnection); }
function vozNaSala() { return !!VOZ.sala; }

/* o nome bonito de uma sala, seja ela da estação, de um servidor ou de
   uma ligação de dois */
function vozNomeDaSala(sala) {
  const f = EST_VOZ.filter(v => v.id === sala)[0];
  if (f) return f.nome;
  if (sala.indexOf("srv__") === 0) {
    const p = sala.split("__");
    const c = SRV.aberto && SRV.aberto.sid === p[1] ? (SRV.canais || {})[p[2]] : null;
    return c ? c.nome : "canal de voz";
  }
  if (sala.indexOf("dm__") === 0) return "chamada";
  return sala;
}
function vozLimite(sala) {
  const f = EST_VOZ.filter(v => v.id === sala)[0];
  if (f) return f.limite;
  if (sala.indexOf("dm__") === 0) return 2;
  return 12;
}

/* =====================================================================
   ENTRAR E SAIR
   ===================================================================== */
async function vozEntrar(sala, comoChamada) {
  const eu = estEu();
  if (!eu) { estAvisar("Entre com um piloto primeiro."); return false; }
  if (!vozTem()) {
    estAvisar("Este navegador não deixa usar o microfone. Tente pelo Chrome ou pelo Safari.");
    return false;
  }
  if (VOZ.sala === sala) return true;
  if (VOZ.entrando) return false;
  /* uma sala de cada vez: sair ANTES de entrar, senão o microfone fica
     preso na sala velha e a pessoa aparece nos dois lugares */
  if (VOZ.sala) await vozSair();

  /* nos canais de voz de um servidor, quem manda é a permissão */
  if (sala.indexOf("srv__") === 0) {
    try {
      if (!srvPode("entrarVoz")) { estAvisar("Você não pode entrar na voz deste servidor."); return false; }
    } catch (e) {}
  }

  VOZ.entrando = true;
  estAvisar("Pedindo o microfone…");
  let fluxo = null;
  try {
    fluxo = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false
    });
  } catch (e) {
    VOZ.entrando = false;
    /* NÃO ADIANTA SÓ DIZER "deu erro": o motivo quase sempre é o mesmo,
       e é uma coisa que só a pessoa pode resolver */
    estAvisar(e && e.name === "NotAllowedError"
      ? "Você precisa permitir o microfone. Toque no cadeado da barra de endereço e libere."
      : "Não achei nenhum microfone neste aparelho.");
    return false;
  }

  /* a sala cheia recusa ANTES de a pessoa achar que entrou */
  const dentro = (await nuvemReq(vozCaminho(sala) + "/dentro")) || {};
  const vivos = Object.keys(dentro).filter(u => Date.now() - (dentro[u].quando || 0) < VOZ_SUMIU);
  if (vivos.length >= vozLimite(sala) && vivos.indexOf(eu.id) < 0) {
    fluxo.getTracks().forEach(t => t.stop());
    VOZ.entrando = false;
    estAvisar("Essa sala está cheia.");
    return false;
  }

  VOZ.sala = sala;
  VOZ.nome = comoChamada || vozNomeDaSala(sala);
  VOZ.eu = eu.id;
  VOZ.meu = fluxo;
  VOZ.pares = {};
  VOZ.dentro = dentro;
  VOZ.mudo = false;
  VOZ.surdo = false;
  vozAplicarMudo();

  await vozAvisarQueEstou();
  VOZ.relogio = setInterval(vozOlhar, VOZ_OLHADA);
  VOZ.batida = setInterval(vozAvisarQueEstou, VOZ_BATIDA);
  vozMedirVoz();
  VOZ.entrando = false;
  estAvisar("Você entrou em " + VOZ.nome + ".");
  vozPintar();
  try { estPintar(); } catch (e) {}
  vozOlhar();
  return true;
}

async function vozSair() {
  const sala = VOZ.sala;
  if (!sala) return;
  clearInterval(VOZ.relogio); VOZ.relogio = null;
  clearInterval(VOZ.batida); VOZ.batida = null;
  if (VOZ.medidor) { try { VOZ.medidor(); } catch (e) {} VOZ.medidor = null; }
  for (const uid in VOZ.pares) vozFechar(uid);
  /* SOLTAR O MICROFONE DE VERDADE. Sem os stop() a bolinha vermelha do
     navegador continua acesa depois de sair, e a pessoa acha -- com
     razão -- que o jogo continua ouvindo. */
  if (VOZ.meu) { VOZ.meu.getTracks().forEach(t => t.stop()); VOZ.meu = null; }
  VOZ.sala = null; VOZ.pares = {}; VOZ.dentro = {}; VOZ.falando = {};
  await nuvemSoltar(vozCaminho(sala) + "/dentro/" + VOZ.eu, null, "DELETE");
  await nuvemSoltar(vozCaminho(sala) + "/sinais/" + VOZ.eu, null, "DELETE");
  vozPintar();
  try { estPintar(); } catch (e) {}
}

function vozAvisarQueEstou() {
  const eu = estEu();
  if (!VOZ.sala || !eu) return Promise.resolve();
  return nuvemSoltar(vozCaminho(VOZ.sala) + "/dentro/" + eu.id, {
    nome: eu.tag, quando: Date.now(), mudo: VOZ.mudo ? 1 : 0, surdo: VOZ.surdo ? 1 : 0
  });
}

/* =====================================================================
   A OLHADINHA — quem está aqui, e o que mandaram para mim
   ---------------------------------------------------------------------
   Um pedido só traz as duas coisas. Ler em dois lugares custaria o
   dobro de conexões para saber a mesma coisa.
   ===================================================================== */
let vozOlhando = false;
async function vozOlhar() {
  const sala = VOZ.sala;
  if (!sala) return;
  /* UMA OLHADA DE CADA VEZ. Numa rede lenta a olhada demora mais que o
     relógio de 1,2s, e duas rodando juntas leriam os MESMOS bilhetes
     antes de o apagar chegar -- a negociação reiniciava sozinha e a
     ligação nunca fechava. */
  if (vozOlhando) return;
  vozOlhando = true;
  let tudo = null;
  try { tudo = await nuvemReq(vozCaminho(sala)); } finally { vozOlhando = false; }
  if (!VOZ.sala || VOZ.sala !== sala) return;      // saiu enquanto vinha
  const dentro = (tudo && tudo.dentro) || {};
  /* quando a GENTE da sala muda, a barra lateral também tem que mudar:
     ela mostra quem está em cada sala, e uma lista parada faz a pessoa
     entrar achando que vai encontrar alguém que já saiu */
  const antes = Object.keys(VOZ.dentro).sort().join(",");
  VOZ.dentro = dentro;
  const agora = Object.keys(dentro).sort().join(",");
  if (antes !== agora) { try { estPintarLado(); } catch (e) {} }

  /* 1. quem sumiu: fecha a ponte e para de tentar */
  for (const uid in VOZ.pares) {
    const f = dentro[uid];
    if (!f || Date.now() - (f.quando || 0) > VOZ_SUMIU) vozFechar(uid);
  }

  /* 2. quem chegou: quem tem o id menor faz a oferta */
  for (const uid in dentro) {
    if (uid === VOZ.eu) continue;
    if (Date.now() - (dentro[uid].quando || 0) > VOZ_SUMIU) continue;
    if (VOZ.pares[uid]) continue;
    if (VOZ.eu < uid) vozOferecer(uid);
    /* se o id dele é menor, a oferta vem dele: não fazer nada aqui é a
       decisão, e não um esquecimento */
  }

  /* 3. os bilhetes endereçados a mim */
  const meus = (tudo && tudo.sinais && tudo.sinais[VOZ.eu]) || {};
  const chaves = Object.keys(meus).sort();
  for (const k of chaves) {
    const s = meus[k];
    /* apaga ANTES de usar: se o mesmo bilhete for lido duas vezes a
       negociação reinicia sozinha e a ligação nunca fecha */
    nuvemSoltar(vozCaminho(sala) + "/sinais/" + VOZ.eu + "/" + k, null, "DELETE");
    if (s && s.de) await vozReceber(s);
  }

  /* 4. quem está demorando demais: avisa em vez de girar para sempre */
  for (const uid in VOZ.pares) {
    const p = VOZ.pares[uid];
    if (p.ligado || Date.now() - p.desde < VOZ_ESPERA) continue;
    p.ligado = true;                  // avisa uma vez só
    estAvisar("Não consegui ligar com " + ((dentro[uid] || {}).nome || "um piloto") +
              ". A rede de um dos dois está bloqueando a chamada direta.");
  }
  vozPintar();
}

function vozMandar(para, tipo, dado) {
  if (!VOZ.sala) return;
  const k = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return nuvemSoltar(vozCaminho(VOZ.sala) + "/sinais/" + para + "/" + k,
                     { de: VOZ.eu, tipo, dado, quando: Date.now() });
}

/* =====================================================================
   A PONTE ENTRE DOIS APARELHOS
   ===================================================================== */
function vozPonte(uid) {
  if (VOZ.pares[uid]) return VOZ.pares[uid];
  const pc = new RTCPeerConnection({ iceServers: VOZ_SERVIDORES });
  const audio = document.createElement("audio");
  audio.autoplay = true;
  audio.setAttribute("playsinline", "");    // sem isto o iPhone abre em tela cheia
  audio.muted = VOZ.surdo;
  audio.style.display = "none";
  document.body.appendChild(audio);

  const par = { pc, audio, desde: Date.now(), ligado: false, estado: "chamando", gelos: [] };
  VOZ.pares[uid] = par;

  if (VOZ.meu) VOZ.meu.getTracks().forEach(t => pc.addTrack(t, VOZ.meu));
  pc.ontrack = e => {
    par.stream = e.streams[0];
    audio.srcObject = e.streams[0];
    audio.play().catch(() => {});
    vozMedirDeleFalar(uid, e.streams[0]);
  };
  pc.onicecandidate = e => { if (e.candidate) vozMandar(uid, "gelo", JSON.stringify(e.candidate)); };
  pc.onconnectionstatechange = () => {
    par.estado = pc.connectionState;
    if (pc.connectionState === "connected") { par.ligado = true; vozPintar(); }
    /* "failed" é definitivo; "disconnected" às vezes volta sozinho, e
       fechar na primeira oscilação derrubaria ligação boa */
    if (pc.connectionState === "failed") vozFechar(uid);
    vozPintar();
  };
  return par;
}

async function vozOferecer(uid) {
  const par = vozPonte(uid);
  try {
    const oferta = await par.pc.createOffer({ offerToReceiveAudio: true });
    await par.pc.setLocalDescription(oferta);
    vozMandar(uid, "oferta", JSON.stringify(par.pc.localDescription));
  } catch (e) { vozFechar(uid); }
}

async function vozReceber(s) {
  const uid = s.de;
  try {
    if (s.tipo === "oferta") {
      const par = vozPonte(uid);
      await par.pc.setRemoteDescription(JSON.parse(s.dado));
      /* o gelo que chegou ANTES da oferta ficou guardado: aplicar agora,
         que é quando a ponte finalmente sabe do que ele fala */
      for (const g of par.gelos) { try { await par.pc.addIceCandidate(g); } catch (e) {} }
      par.gelos = [];
      const r = await par.pc.createAnswer();
      await par.pc.setLocalDescription(r);
      vozMandar(uid, "resposta", JSON.stringify(par.pc.localDescription));
    } else if (s.tipo === "resposta") {
      const par = VOZ.pares[uid];
      if (!par) return;
      await par.pc.setRemoteDescription(JSON.parse(s.dado));
      for (const g of par.gelos) { try { await par.pc.addIceCandidate(g); } catch (e) {} }
      par.gelos = [];
    } else if (s.tipo === "gelo") {
      const par = VOZ.pares[uid];
      if (!par) return;
      const c = JSON.parse(s.dado);
      /* GELO QUE CHEGA CEDO DEMAIS NÃO SE JOGA FORA.
         Ele costuma vir antes da oferta, e quem o descarta perde
         justamente o caminho que faria a ligação fechar. */
      if (!par.pc.remoteDescription || !par.pc.remoteDescription.type) par.gelos.push(c);
      else await par.pc.addIceCandidate(c);
    }
  } catch (e) { /* bilhete estragado: a próxima olhada tenta de novo */ }
}

function vozFechar(uid) {
  const par = VOZ.pares[uid];
  if (!par) return;
  try { par.pc.close(); } catch (e) {}
  if (par.audio && par.audio.parentNode) par.audio.parentNode.removeChild(par.audio);
  if (par.pararMedida) { try { par.pararMedida(); } catch (e) {} }
  delete VOZ.pares[uid];
  delete VOZ.falando[uid];
}

/* =====================================================================
   MUDO, SURDO E A BOLINHA DE QUEM ESTÁ FALANDO
   ===================================================================== */
function vozAplicarMudo() {
  if (!VOZ.meu) return;
  /* SURDO TAMBÉM CALA. É o combinado em todo aplicativo de voz, e faz
     sentido: quem não ouve ninguém não tem como saber se está
     atrapalhando. */
  const liga = !VOZ.mudo && !VOZ.surdo;
  VOZ.meu.getAudioTracks().forEach(t => { t.enabled = liga; });
}
function vozMudo() {
  if (!VOZ.sala) return;
  VOZ.mudo = !VOZ.mudo;
  vozAplicarMudo();
  vozAvisarQueEstou();
  vozPintar();
}
function vozSurdo() {
  if (!VOZ.sala) return;
  VOZ.surdo = !VOZ.surdo;
  for (const uid in VOZ.pares) VOZ.pares[uid].audio.muted = VOZ.surdo;
  vozAplicarMudo();
  vozAvisarQueEstou();
  vozPintar();
}

/* a bolinha acende com o som, não com o clique: é o que faz a sala
   parecer viva mesmo com todo mundo calado */
function vozMedirUm(uid, stream) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC || !stream) return null;
    const ctx = AudioSys.ctx && AudioSys.ctx.state !== "closed" ? AudioSys.ctx : new AC();
    /* contexto de áudio dormindo não mede nada: as amostras voltam todas
       em silêncio e a bolinha nunca acende */
    if (ctx.state === "suspended") { try { ctx.resume(); } catch (e) {} }
    const fonte = ctx.createMediaStreamSource(stream);
    const an = ctx.createAnalyser();
    an.fftSize = 512;
    fonte.connect(an);
    const dados = new Uint8Array(an.frequencyBinCount);
    let vivo = true;
    const bate = () => {
      if (!vivo) return;
      an.getByteTimeDomainData(dados);
      let pico = 0;
      for (let i = 0; i < dados.length; i++) pico = Math.max(pico, Math.abs(dados[i] - 128));
      const falando = pico > 8 && !(uid === VOZ.eu && (VOZ.mudo || VOZ.surdo));
      if (!!VOZ.falando[uid] !== falando) { VOZ.falando[uid] = falando; vozPintarLuzes(); }
      requestAnimationFrame(bate);
    };
    bate();
    return () => { vivo = false; try { fonte.disconnect(); } catch (e) {} };
  } catch (e) { return null; }
}
function vozMedirVoz() {
  if (VOZ.medidor) { try { VOZ.medidor(); } catch (e) {} }
  VOZ.medidor = vozMedirUm(VOZ.eu, VOZ.meu);
}
function vozMedirDeleFalar(uid, stream) {
  const par = VOZ.pares[uid];
  if (!par) return;
  if (par.pararMedida) { try { par.pararMedida(); } catch (e) {} }
  par.pararMedida = vozMedirUm(uid, stream);
}

/* =====================================================================
   LIGAR PARA UMA PESSOA
   ---------------------------------------------------------------------
   Uma chamada de dois é uma sala com nome combinado: as duas pontas
   chegam ao mesmo nome pela mesma conta, então não é preciso ninguém
   "criar" nada. O aviso de que o telefone está tocando é uma mensagem
   comum na conversa dos dois -- galho velho, regra velha, funciona.
   ===================================================================== */
function vozSalaDaConversa(a, b) { return "dm__" + salaDaConversa(a, b); }

async function vozLigar(id, nome) {
  const eu = estEu();
  if (!eu || !id) return false;
  const sala = vozSalaDaConversa(eu.id, id);
  const ok = await vozEntrar(sala, "chamada com " + (nome || "piloto"));
  if (!ok) return false;
  /* o toque: uma mensagem na conversa dos dois, que o outro lado
     reconhece e transforma em botão de ATENDER */
  const antes = EST.destino;
  EST.destino = { tipo: "dm", id, nome: nome || "piloto" };
  try {
    await estEnviarCartao("📞 " + eu.tag + " está te chamando",
                          { tipo: "chamada", cham: { sala, de: eu.id, quando: Date.now() } });
  } catch (e) {}
  EST.destino = antes;
  estAvisar("Chamando " + (nome || "") + "… é só ela atender.");
  return true;
}

/* o cartão de uma chamada dentro da conversa */
function vozCartaoHTML(m, eu) {
  const c = m.cham || {};
  const meu = eu && m.de === eu.id;
  const velha = Date.now() - (c.quando || 0) > 300000;     // cinco minutos
  const dentro = VOZ.sala === c.sala;
  return '<div class="voz-cartao' + (velha && !dentro ? " ido" : "") + '">' +
    "<b>📞 " + escaparTexto(meu ? "Você chamou" : (m.nome || "Piloto") + " te chamou") + "</b>" +
    (dentro ? '<em>vocês estão na chamada</em>'
            : (velha ? "<em>a chamada acabou</em>"
                     : '<button class="voz-atender" data-atender="' + escaparTexto(c.sala) +
                       '">ATENDER</button>')) +
    "</div>";
}

/* =====================================================================
   A BARRA DA VOZ
   ---------------------------------------------------------------------
   Fica no pé da barra lateral, como em todo aplicativo de voz, e mostra
   as três coisas que importam: onde estou, quem está comigo e como eu
   saio. Sair tem que estar SEMPRE à mão -- ficar preso numa sala com o
   microfone aberto é o pior que pode acontecer aqui.
   ===================================================================== */
function vozPintar() {
  const cx = $("est-voz-barra");
  if (!cx) return;
  if (!VOZ.sala) { cx.classList.remove("on"); cx.innerHTML = ""; return; }
  const quantos = Object.keys(VOZ.dentro).filter(u =>
    Date.now() - (VOZ.dentro[u].quando || 0) < VOZ_SUMIU).length;
  const ligados = Object.keys(VOZ.pares).filter(u => VOZ.pares[u].ligado).length;
  cx.classList.add("on");
  cx.innerHTML =
    '<div class="voz-topo"><b class="voz-luz' + (ligados || quantos < 2 ? " ok" : "") + '"></b>' +
      '<span class="voz-onde"><strong>' + escaparTexto(VOZ.nome) + "</strong>" +
      "<em>" + (quantos < 2 ? "só você por enquanto"
                            : quantos + " pilotos · " + ligados + " ligados") + "</em></span>" +
      '<button class="voz-b sai" id="voz-sair" aria-label="Sair da voz">✕</button></div>' +
    '<div class="voz-gente" id="voz-gente"></div>' +
    '<div class="voz-acoes">' +
      '<button class="voz-b' + (VOZ.mudo ? " off" : "") + '" id="voz-mudo">' +
        (VOZ.mudo ? "🔇 mudo" : "🎤 falando") + "</button>" +
      '<button class="voz-b' + (VOZ.surdo ? " off" : "") + '" id="voz-surdo">' +
        (VOZ.surdo ? "🔇 surdo" : "🎧 ouvindo") + "</button>" +
    "</div>";
  vozPintarLuzes();
  $("voz-sair").addEventListener("click", vozSair);
  $("voz-mudo").addEventListener("click", vozMudo);
  $("voz-surdo").addEventListener("click", vozSurdo);
}

function vozPintarLuzes() {
  const cx = $("voz-gente");
  if (!cx || !VOZ.sala) return;
  const eu = estEu();
  let h = "";
  const ids = Object.keys(VOZ.dentro)
    .filter(u => Date.now() - (VOZ.dentro[u].quando || 0) < VOZ_SUMIU);
  if (ids.indexOf(VOZ.eu) < 0) ids.unshift(VOZ.eu);
  for (const uid of ids) {
    const f = VOZ.dentro[uid] || {};
    const souEu = uid === VOZ.eu;
    const nome = souEu ? (eu ? eu.tag : "você") : (f.nome || "piloto");
    const calado = souEu ? (VOZ.mudo || VOZ.surdo) : (f.mudo || f.surdo);
    h += '<span class="voz-p' + (VOZ.falando[uid] ? " fala" : "") + (calado ? " mudo" : "") + '">' +
         '<b>' + escaparTexto(estIni(nome)) + "</b>" + escaparTexto(nome) +
         (calado ? " 🔇" : "") + "</span>";
  }
  cx.innerHTML = h;
}

/* =====================================================================
   OS ENCAIXES QUE A ESTAÇÃO JÁ CHAMAVA
   ---------------------------------------------------------------------
   Eram dois avisos de "ainda não está pronto". Agora fazem a coisa, e
   nada mais na estação precisou mudar de lugar -- foi para isso que o
   encaixe ficou pronto antes.
   ===================================================================== */
function estVozEntrar(sala) { vozEntrar(sala); }
function estLigarPara(id, nome) { vozLigar(id, nome); }
function estVozSair() { vozSair(); }

/* SAIR DA SALA QUANDO A PÁGINA FECHA.
   O `keepalive` é o que faz este pedido sair mesmo com a aba morrendo --
   um fetch normal seria cancelado no meio. Não é garantia: se o aparelho
   for desligado no tapa, ninguém apaga nada. Por isso o relógio existe:
   quem não dá sinal por VOZ_SUMIU some da sala de qualquer jeito. Este
   pedido só torna a saída imediata no caso comum, que é fechar a aba. */
addEventListener("pagehide", () => {
  if (!VOZ.sala) return;
  try {
    fetch((NUVEM_URL || "").replace(/\/$/, "") + "/" +
          vozCaminho(VOZ.sala) + "/dentro/" + VOZ.eu + ".json",
          { method: "DELETE", keepalive: true });
  } catch (e) {}
  if (VOZ.meu) { try { VOZ.meu.getTracks().forEach(t => t.stop()); } catch (e) {} }
});
