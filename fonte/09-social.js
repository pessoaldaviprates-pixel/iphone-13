/* =====================================================================
   ENQUETES, CHAMAR TODO MUNDO E EVENTOS
   =====================================================================
   Três coisas que vivem DENTRO da conversa, e não numa tela à parte:

     📊 enquete  — uma pergunta com até cinco respostas, votada ali mesmo
     📣 @everyone e @here — avisar o canal inteiro, ou só quem está online
     📅 evento   — dia, hora, lugar e quem vai

   ONDE MORAM NA NUVEM
   ---------------------------------------------------------------------
   A enquete é uma MENSAGEM, com os votos pendurados nela:

     conversas/<sala>/<k>            { tipo:"enquete", enq:{…} }
     conversas/<sala>/<k>/votos/<uid>  "0,2"

   Isso é de propósito: o voto chega pelo MESMO fluxo que já traz as
   mensagens. Se os votos morassem noutro galho, seria preciso um segundo
   fluxo para vê-los ao vivo — e dois fluxos para o mesmo assunto é
   exatamente o que uma vez travou as gravações do jogo.

   O evento mora em conversas/__eventos/<eid>, e não em servidores/.
   Feio no papel, certo na prática: "conversas/" é galho velho, que toda
   regra antiga do Firebase já libera. Um "eventos/" novo seria recusado
   calado nas contas que nunca atualizaram as regras, e ninguém
   descobriria por quê.

   TODA ENQUETE E TODO EVENTO TAMBÉM TÊM txt.
   Quem estiver numa versão velha do jogo não sabe desenhar o cartão —
   mas lê o txt e vê "📊 Qual a melhor nave?" em vez de ver a conversa
   com um buraco no meio. Degradar é melhor que sumir.
   ===================================================================== */

/* =====================================================================
   1. CHAMAR TODO MUNDO
   ---------------------------------------------------------------------
   @everyone acorda quem é do canal, esteja com o jogo aberto ou não.
   @here acorda só quem está online agora.

   Isto NÃO é enfeite de texto: é um alarme, e alarme na mão de todo
   mundo vira um canal que ninguém aguenta. Por isso passa por permissão
   — no servidor, "mencionarTodos"; nos canais da estação, quem manda
   recado no painel; no grupo, quem é dono ou moderador.

   E quando a pessoa não pode, o jogo NÃO manda a mensagem em silêncio
   sem o chamado: ele diz que não pode, porque mandar "@everyone o
   treino é agora" achando que avisou todo mundo, e não ter avisado
   ninguém, é pior do que não poder.
   ===================================================================== */
const CHAMADOS = [
  { id: "everyone", marca: "@everyone", nome: "todo mundo",
    sobre: "avisa quem é daqui, esteja com o jogo aberto ou não" },
  { id: "here", marca: "@here", nome: "quem está online agora",
    sobre: "avisa só quem está com o jogo aberto neste momento" }
];
const RE_CHAMADO = /@(everyone|here|todos|aqui)\b/i;

/* qual chamado o texto tem, se tiver. "todos" e "aqui" existem porque o
   jogo é em português e ninguém vai digitar "everyone" de primeira. */
function socialChamadoNoTexto(txt) {
  const g = RE_CHAMADO.exec(String(txt || ""));
  if (!g) return null;
  const q = g[1].toLowerCase();
  return (q === "everyone" || q === "todos") ? "everyone" : "here";
}

/* quem pode chamar todo mundo NESTE destino */
function socialPodeChamar(d) {
  d = d || EST.destino;
  if (!d) return false;
  if (d.tipo === "dm") return true;            // é uma pessoa só: não é alarme
  if (d.tipo === "srv") {
    try { return srvPode("mencionarTodos"); } catch (e) { return false; }
  }
  if (d.tipo === "grupo") {
    try { return estMeuNivel(d.id) >= EST_MOD; } catch (e) { return false; }
  }
  /* canais da estação: a casa é do jogo, então vale a equipe do painel */
  try { return pode("recados"); } catch (e) { return false; }
}

/* o chamado me acordou? @everyone sempre; @here só se eu estiver aqui.
   Quem silenciou o destino não é acordado por nenhum dos dois: silenciar
   tem que valer contra o alarme também, senão não vale nada. */
function socialChamouMim(m, eu) {
  if (!m || !eu || m.de === eu.id) return false;
  const q = socialChamadoNoTexto(m.txt);
  if (!q) return false;
  try { if (silenciado(estChave(EST.destino))) return false; } catch (e) {}
  if (q === "everyone") return true;
  try { return presencaAgora() !== "invisivel"; } catch (e) { return true; }
}

/* =====================================================================
   2. ENQUETES
   ===================================================================== */
const ENQ_MAX_OPCOES = 5;
const ENQ_PRAZOS = [
  { id: 0,        nome: "sem prazo" },
  { id: 3600000,  nome: "1 hora" },
  { id: 21600000, nome: "6 horas" },
  { id: 86400000, nome: "1 dia" },
  { id: 604800000,nome: "7 dias" }
];

function enqPodeCriar(d) {
  d = d || EST.destino;
  if (!d) return false;
  if (d.tipo === "srv") { try { return srvPode("criarEnquete"); } catch (e) { return false; } }
  return d.tipo === "canal" || d.tipo === "grupo" || d.tipo === "dm";
}
function enqPodeVotar(d) {
  d = d || EST.destino;
  if (!d) return false;
  if (d.tipo === "srv") { try { return srvPode("votar"); } catch (e) { return false; } }
  return true;
}
function enqAcabou(m) {
  return !!(m && m.enq && m.enq.ate && m.enq.ate < Date.now());
}
/* os votos vêm da nuvem como { uid: "0,2" }. Vira { uid: [0,2] } aqui, e
   em lugar nenhum mais: uma tradução só, no portão. */
function enqVotos(m) {
  const fora = {};
  const v = (m && m.votos) || {};
  for (const uid in v) {
    const lista = String(v[uid] || "").split(",")
      .map(x => parseInt(x, 10)).filter(x => x >= 0 && !isNaN(x));
    if (lista.length) fora[uid] = lista;
  }
  return fora;
}
function enqContar(m) {
  const votos = enqVotos(m);
  const n = ((m.enq && m.enq.o) || []).map(() => 0);
  let gente = 0;
  for (const uid in votos) {
    gente++;
    for (const i of votos[uid]) if (n[i] !== undefined) n[i]++;
  }
  return { n, gente };
}
function enqMeuVoto(m) {
  const eu = estEu();
  if (!eu) return [];
  return enqVotos(m)[eu.id] || [];
}

/* VOTAR É UMA GRAVAÇÃO SÓ, no meu próprio pedacinho.
   Se cada voto reescrevesse o objeto inteiro dos votos, duas pessoas
   votando no mesmo segundo apagariam uma à outra — e ninguém entenderia
   por que o número às vezes andava para trás. */
async function enqVotar(k, i) {
  const eu = estEu();
  const d = EST.destino;
  const m = EST.msgs.filter(x => x.k === k)[0];
  if (!eu || !d || !m || !m.enq) return false;
  if (enqAcabou(m)) { estAvisar("Esta enquete já fechou."); return false; }
  if (!enqPodeVotar(d)) { estAvisar("Você não pode votar aqui."); return false; }

  const antes = enqMeuVoto(m).slice();
  let meu = antes.slice();
  if (m.enq.multi) {
    const onde = meu.indexOf(i);
    if (onde >= 0) meu.splice(onde, 1); else meu.push(i);
  } else {
    meu = meu.length === 1 && meu[0] === i ? [] : [i];   // clicar de novo tira o voto
  }

  /* na tela antes da nuvem: enquete que demora a marcar parece quebrada
     e a pessoa clica três vezes */
  enqMarcarLocal(k, eu.id, meu);

  const cam = estCaminho(d);
  const r = await nuvemSoltar(cam + "/" + k + "/votos/" + eu.id,
                              meu.length ? meu.join(",") : null,
                              meu.length ? "PUT" : "DELETE");
  if (r === null) {
    /* devolve o voto que eu tinha antes: marca que não virou gravação é
       mentira na tela, e mentira na tela é pior que erro na tela */
    enqMarcarLocal(k, eu.id, antes);
    estAvisar("Não deu para votar. Confira a internet.");
    return false;
  }
  /* E MARCA DE NOVO DEPOIS DE GRAVAR. Entre o clique e a resposta da
     nuvem pode ter chegado uma releitura do canal, e ela traz a
     enquete como estava ANTES do meu voto -- a marca sumia sozinha um
     segundo depois de aparecer. Agora o meu voto é reaplicado por cima
     do que voltou, que é justamente a verdade mais nova que existe. */
  enqMarcarLocal(k, eu.id, meu);
  return true;
}

/* achar a mensagem AGORA (e não usar a de antes do await) e escrever o
   meu voto nela. Uma função só, porque quem esquecer de reencontrar a
   mensagem escreve num objeto que já foi jogado fora. */
function enqMarcarLocal(k, uid, meu) {
  const m = EST.msgs.filter(x => x.k === k)[0];
  if (!m) return;
  m.votos = m.votos || {};
  if (meu && meu.length) m.votos[uid] = meu.join(",");
  else delete m.votos[uid];
  estPintar();
}

/* fechar na mão, antes do prazo — só de quem criou ou de quem modera */
async function enqFechar(k) {
  const eu = estEu();
  const d = EST.destino;
  const m = EST.msgs.filter(x => x.k === k)[0];
  if (!eu || !d || !m || !m.enq) return false;
  const meu = m.de === eu.id;
  let mod = false;
  try { mod = d.tipo === "srv" ? srvPode("apagarMsg") : pode("recados"); } catch (e) {}
  if (!meu && !mod) { estAvisar("Só quem criou pode fechar."); return false; }
  const ate = Date.now();
  m.enq.ate = ate;
  estPintar();
  const r = await nuvemSoltar(estCaminho(d) + "/" + k + "/enq/ate", ate);
  /* de novo depois de gravar, pelo mesmo motivo do voto: uma releitura
     do canal pode ter chegado no meio e trazido a enquete aberta */
  const agora = EST.msgs.filter(x => x.k === k)[0];
  if (agora && agora.enq) { agora.enq.ate = ate; estPintar(); }
  if (r === null) estAvisar("Fechou aqui, mas a nuvem não respondeu.");
  return true;
}

function enqAbrirCriar() {
  const d = EST.destino;
  if (!enqPodeCriar(d)) { estAvisar("Você não pode criar enquete aqui."); return; }
  let n = 2;
  const campo = i =>
    '<input class="enq-op" id="enq-o' + i + '" maxlength="60" placeholder="Resposta ' +
    (i + 1) + '" autocomplete="off">';
  estJanela("Criar enquete",
    '<input id="enq-p" maxlength="120" placeholder="O que você quer perguntar?" autocomplete="off">' +
    '<div id="enq-ops">' + campo(0) + campo(1) + "</div>" +
    '<button class="est-jan-min" id="enq-mais">+ mais uma resposta</button>' +
    '<label class="enq-check"><input type="checkbox" id="enq-multi"> dá para marcar mais de uma</label>' +
    '<div class="enq-prazo" id="enq-prazo">' +
      ENQ_PRAZOS.map((p, i) => '<button class="enq-pz' + (i === 0 ? " on" : "") +
        '" data-pz="' + p.id + '">' + p.nome + "</button>").join("") + "</div>" +
    '<button class="est-jan-ok" id="enq-ok">CRIAR A ENQUETE</button>',
    cx => {
      let prazo = 0;
      cx.querySelectorAll("[data-pz]").forEach(b => b.addEventListener("click", () => {
        prazo = parseInt(b.getAttribute("data-pz"), 10) || 0;
        cx.querySelectorAll("[data-pz]").forEach(o => o.classList.toggle("on", o === b));
      }));
      $("enq-mais").addEventListener("click", () => {
        if (n >= ENQ_MAX_OPCOES) { estAvisar("Cinco respostas é o limite."); return; }
        $("enq-ops").insertAdjacentHTML("beforeend", campo(n));
        n++;
        if (n >= ENQ_MAX_OPCOES) $("enq-mais").style.display = "none";
      });
      $("enq-ok").addEventListener("click", async () => {
        const p = ($("enq-p").value || "").trim();
        const ops = [];
        for (let i = 0; i < n; i++) {
          const v = (($("enq-o" + i) || {}).value || "").trim();
          if (v) ops.push(v.slice(0, 60));
        }
        if (!p) { estAvisar("Falta a pergunta."); return; }
        if (ops.length < 2) { estAvisar("Precisa de pelo menos duas respostas."); return; }
        estFecharJanela();
        await enqCriar(p, ops, $("enq-multi").checked ? 1 : 0, prazo);
      });
      const pp = $("enq-p"); if (pp) pp.focus();
    });
}

async function enqCriar(pergunta, opcoes, multi, prazo) {
  return estEnviarCartao("📊 " + pergunta, {
    tipo: "enquete",
    enq: { p: String(pergunta).slice(0, 120),
           o: opcoes.slice(0, ENQ_MAX_OPCOES).map(x => String(x).slice(0, 60)),
           multi: multi ? 1 : 0,
           ate: prazo ? Date.now() + prazo : 0 }
  });
}

/* o cartão da enquete dentro da conversa */
function enqHTML(m, eu) {
  const e = m.enq || {};
  const ops = e.o || [];
  const { n, gente } = enqContar(m);
  const meu = enqMeuVoto(m);
  const fechada = enqAcabou(m);
  /* o resultado só aparece depois de eu votar (ou depois de fechar):
     ver a barra antes muda o voto de quem está em dúvida */
  const mostra = fechada || meu.length > 0;
  const maior = Math.max.apply(null, n.concat([0]));
  let h = '<div class="enq-cx' + (fechada ? " fim" : "") + '" data-enq="' + m.k + '">' +
    '<div class="enq-perg">' + escaparTexto(e.p || "") + "</div>";
  ops.forEach((txt, i) => {
    const marcado = meu.indexOf(i) >= 0;
    const parte = gente ? Math.round((n[i] / gente) * 100) : 0;
    h += '<button class="enq-b' + (marcado ? " eu" : "") +
         (mostra && n[i] === maior && maior > 0 ? " lider" : "") +
         '" data-voto="' + m.k + ':' + i + '"' + (fechada ? " disabled" : "") + ">" +
         '<span class="enq-barra" style="width:' + (mostra ? parte : 0) + '%"></span>' +
         '<span class="enq-marca">' + (marcado ? "✓" : (e.multi ? "▢" : "○")) + "</span>" +
         '<span class="enq-txt">' + escaparTexto(txt) + "</span>" +
         (mostra ? '<span class="enq-num">' + parte + "%</span>" : "") +
         "</button>";
  });
  h += '<div class="enq-pe">' +
       (gente ? gente + (gente === 1 ? " voto" : " votos") : "ninguém votou ainda") +
       (e.multi ? " · dá para marcar mais de uma" : "") +
       (fechada ? " · fechada"
                : (e.ate ? " · fecha " + estQuandoFalta(e.ate) : "")) +
       "</div>";
  if (!fechada && eu && m.de === eu.id)
    h += '<button class="enq-fechar" data-enqfim="' + m.k + '">fechar agora</button>';
  return h + "</div>";
}

/* =====================================================================
   3. EVENTOS
   ---------------------------------------------------------------------
   Um evento é dia, hora, lugar e uma lista de quem vai. Nasce como
   cartão na conversa e vive em conversas/__eventos/<eid>, para que a
   agenda continue existindo depois que o cartão sumiu do histórico.
   ===================================================================== */
const EV_CAMINHO = "conversas/__eventos";
const EV_LUGARES = [
  { id: "aqui",  nome: "Aqui no canal" },
  { id: "voz",   nome: "Numa sala de voz" },
  { id: "jogo",  nome: "Dentro do jogo" },
  { id: "fora",  nome: "Em outro lugar" }
];
const EV = { lista: {}, carregado: 0 };

function evPodeCriar(d) {
  d = d || EST.destino;
  if (!d) return false;
  if (d.tipo === "srv") {
    try { return srvPode("criarEvento") || srvPode("gerirEventos"); } catch (e) { return false; }
  }
  if (d.tipo === "grupo") { try { return estMeuNivel(d.id) >= EST_MOD; } catch (e) { return false; } }
  if (d.tipo === "canal") { try { return pode("eventos") || pode("recados"); } catch (e) { return false; } }
  return true;
}

async function evCarregar(forcar) {
  if (!forcar && Date.now() - EV.carregado < 15000) return EV.lista;
  const d = await nuvemReq(EV_CAMINHO);
  EV.lista = d || {};
  EV.carregado = Date.now();
  /* limpa o que já passou faz tempo: agenda que só cresce vira lixo que
     todo mundo baixa para nunca ler */
  const corte = Date.now() - 172800000;      // dois dias depois da hora
  for (const eid in EV.lista) {
    const e = EV.lista[eid];
    if (!e || !e.quando || e.quando < corte) {
      delete EV.lista[eid];
      nuvemSoltar(EV_CAMINHO + "/" + eid, null, "DELETE");
    }
  }
  return EV.lista;
}
function evDaqui(d) {
  d = d || EST.destino;
  const ch = estChave(d);
  return Object.keys(EV.lista)
    .map(eid => Object.assign({ eid }, EV.lista[eid]))
    .filter(e => e && e.onde === ch)
    .sort((a, b) => (a.quando || 0) - (b.quando || 0));
}
function evVou(e) {
  const eu = estEu();
  return !!(eu && e && e.vou && e.vou[eu.id]);
}
function evQuantos(e) { return Object.keys((e && e.vou) || {}).length; }

async function evMarcar(eid) {
  const eu = estEu();
  if (!eu) return false;
  const e = EV.lista[eid];
  if (!e) return false;
  const vai = !evVou(e);
  e.vou = e.vou || {};
  if (vai) e.vou[eu.id] = eu.tag; else delete e.vou[eu.id];
  estPintar();
  evPintarJanela();
  const r = await nuvemSoltar(EV_CAMINHO + "/" + eid + "/vou/" + eu.id,
                              vai ? eu.tag : null, vai ? "PUT" : "DELETE");
  if (r === null) estAvisar("Não deu para marcar. Confira a internet.");
  return r !== null;
}

async function evCancelar(eid) {
  const eu = estEu();
  const e = EV.lista[eid];
  if (!eu || !e) return false;
  let mod = false;
  try {
    mod = EST.destino && EST.destino.tipo === "srv" ? srvPode("gerirEventos") : pode("eventos");
  } catch (err) {}
  if (e.dono !== eu.id && !mod) { estAvisar("Só quem marcou pode cancelar."); return false; }
  delete EV.lista[eid];
  await nuvemSoltar(EV_CAMINHO + "/" + eid, null, "DELETE");
  evPintarJanela();
  estPintar();
  estAvisar("Evento cancelado.");
  return true;
}

/* quanto falta, em português de gente */
function estQuandoFalta(t) {
  const s = Math.round((t - Date.now()) / 1000);
  if (s <= 0) return "já";
  if (s < 60) return "em " + s + "s";
  if (s < 3600) return "em " + Math.round(s / 60) + " min";
  if (s < 86400) return "em " + Math.round(s / 3600) + "h";
  return "em " + Math.round(s / 86400) + " dias";
}
function evQuandoTexto(e) {
  if (!e || !e.quando) return "";
  const d = new Date(e.quando);
  const dia = estDia(e.quando);
  const hora = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  return dia + " às " + hora + " · " + estQuandoFalta(e.quando);
}

function evAbrirCriar() {
  const d = EST.destino;
  if (!evPodeCriar(d)) { estAvisar("Você não pode marcar evento aqui."); return; }
  /* a data já vem preenchida com daqui a uma hora, redonda: quase todo
     evento é "hoje mais tarde", e digitar data inteira no celular cansa */
  const base = new Date(Date.now() + 3600000);
  base.setMinutes(0, 0, 0);
  const dd = x => String(x).padStart(2, "0");
  const dataPadrao = base.getFullYear() + "-" + dd(base.getMonth() + 1) + "-" + dd(base.getDate());
  const horaPadrao = dd(base.getHours()) + ":" + dd(base.getMinutes());
  estJanela("Marcar evento",
    '<input id="ev-nome" maxlength="60" placeholder="Nome do evento" autocomplete="off">' +
    '<input id="ev-sobre" maxlength="140" placeholder="Sobre o que é (opcional)" autocomplete="off">' +
    '<div class="ev-quando">' +
      '<input type="date" id="ev-data" value="' + dataPadrao + '">' +
      '<input type="time" id="ev-hora" value="' + horaPadrao + '">' +
    "</div>" +
    '<div class="ev-lugares" id="ev-lugares">' +
      EV_LUGARES.map((l, i) => '<button class="ev-lg' + (i === 0 ? " on" : "") +
        '" data-lg="' + l.id + '">' + escaparTexto(l.nome) + "</button>").join("") + "</div>" +
    '<button class="est-jan-ok" id="ev-ok">MARCAR</button>',
    cx => {
      let lugar = "aqui";
      cx.querySelectorAll("[data-lg]").forEach(b => b.addEventListener("click", () => {
        lugar = b.getAttribute("data-lg");
        cx.querySelectorAll("[data-lg]").forEach(o => o.classList.toggle("on", o === b));
      }));
      $("ev-ok").addEventListener("click", async () => {
        const nome = ($("ev-nome").value || "").trim();
        if (!nome) { estAvisar("Falta o nome do evento."); return; }
        const quando = new Date(($("ev-data").value || "") + "T" + ($("ev-hora").value || "00:00")).getTime();
        if (!quando || isNaN(quando)) { estAvisar("Dia e hora não deram certo."); return; }
        if (quando < Date.now() - 60000) { estAvisar("Essa hora já passou."); return; }
        estFecharJanela();
        await evCriar(nome, ($("ev-sobre").value || "").trim(), quando, lugar);
      });
      const nn = $("ev-nome"); if (nn) nn.focus();
    });
}

async function evCriar(nome, sobre, quando, lugar) {
  const eu = estEu();
  const d = EST.destino;
  if (!eu || !d) return false;
  const eid = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const evento = { nome: String(nome).slice(0, 60), sobre: String(sobre || "").slice(0, 140),
                   quando, lugar: lugar || "aqui", onde: estChave(d),
                   ondeNome: d.nome || d.id, dono: eu.id, donoNome: eu.tag,
                   criado: Date.now(), vou: {} };
  evento.vou[eu.id] = eu.tag;                 // quem marca, vai
  const r = await nuvemSoltar(EV_CAMINHO + "/" + eid, evento);
  if (r === null) { estAvisar("Não deu para marcar o evento."); return false; }
  EV.lista[eid] = evento;
  /* o cartão no canal é o AVISO. O evento em si já está guardado: se a
     mensagem se perder na poda do canal, a agenda continua de pé. */
  await estEnviarCartao("📅 " + evento.nome + " — " + evQuandoTexto(evento),
                        { tipo: "evento", ev: { eid, nome: evento.nome, quando } });
  evPintarJanela();
  return true;
}

/* o cartão do evento na conversa. Lê o evento de verdade, não a cópia
   que ficou na mensagem: assim o número de quem vai está sempre certo. */
function evHTML(m) {
  const eid = (m.ev || {}).eid;
  const e = EV.lista[eid];
  if (!e) {
    return '<div class="ev-cx ido"><b>📅 ' + escaparTexto((m.ev || {}).nome || "Evento") +
           "</b><em>este evento foi cancelado ou já passou</em></div>";
  }
  const vou = evVou(e), n = evQuantos(e);
  const passou = e.quando < Date.now();
  const lg = EV_LUGARES.filter(x => x.id === e.lugar)[0];
  return '<div class="ev-cx' + (passou ? " ido" : "") + '" data-ev="' + eid + '">' +
    '<div class="ev-topo"><b>📅 ' + escaparTexto(e.nome) + "</b>" +
      '<span class="ev-quem">' + n + (n === 1 ? " vai" : " vão") + "</span></div>" +
    (e.sobre ? '<div class="ev-sobre">' + escaparTexto(e.sobre) + "</div>" : "") +
    '<div class="ev-meta">' + escaparTexto(evQuandoTexto(e)) +
      (lg ? " · " + escaparTexto(lg.nome) : "") + "</div>" +
    (passou ? '<div class="ev-meta">já aconteceu</div>'
            : '<button class="ev-vou' + (vou ? " on" : "") + '" data-evvou="' + eid + '">' +
              (vou ? "✓ EU VOU" : "EU VOU") + "</button>") +
    "</div>";
}

/* a agenda do destino: tudo o que está marcado aqui, num lugar só */
function evAbrirAgenda() {
  evCarregar(true).then(() => evPintarJanela(true));
  estJanela("Eventos", '<p class="est-nota">carregando…</p>');
}
function evPintarJanela(montarAgora) {
  const cx = $("est-janela");
  if (!cx || !cx.classList.contains("on")) return;
  const corpo = cx.querySelector(".est-jan-corpo");
  if (!corpo) return;
  if (!montarAgora && !corpo.querySelector("[data-agenda]") &&
      !corpo.querySelector(".est-nota")) return;
  const lista = evDaqui();
  let h = '<div data-agenda="1">';
  if (evPodeCriar()) h += '<button class="est-jan-ok" id="ev-novo">+ MARCAR EVENTO</button>';
  if (!lista.length) {
    h += '<p class="est-nota">Nada marcado por aqui ainda.' +
         (evPodeCriar() ? " Marque o primeiro." : "") + "</p>";
  }
  for (const e of lista) {
    const n = evQuantos(e), vou = evVou(e);
    const eu = estEu();
    h += '<div class="ev-item">' +
      '<div class="ev-topo"><b>' + escaparTexto(e.nome) + "</b>" +
        '<span class="ev-quem">' + n + (n === 1 ? " vai" : " vão") + "</span></div>" +
      '<div class="ev-meta">' + escaparTexto(evQuandoTexto(e)) + " · por " +
        escaparTexto(e.donoNome || "alguém") + "</div>" +
      (e.sobre ? '<div class="ev-sobre">' + escaparTexto(e.sobre) + "</div>" : "") +
      '<div class="ev-acoes">' +
        '<button class="ev-vou' + (vou ? " on" : "") + '" data-evvou="' + e.eid + '">' +
          (vou ? "✓ EU VOU" : "EU VOU") + "</button>" +
        (eu && e.dono === eu.id
          ? '<button class="ev-x" data-evx="' + e.eid + '">cancelar</button>' : "") +
      "</div></div>";
  }
  corpo.innerHTML = h + "</div>";
  const nv = $("ev-novo");
  if (nv) nv.addEventListener("click", () => { estFecharJanela(); evAbrirCriar(); });
  socialLigarCartoes(corpo);
}

/* =====================================================================
   4. O LEMBRETE
   ---------------------------------------------------------------------
   Marcar um evento e esquecer dele é o destino de todo evento marcado.
   A batida de vinte em vinte segundos da estação passa por aqui e avisa
   UMA VEZ, quinze minutos antes, só quem disse que vai.
   ===================================================================== */
const EV_AVISADOS = {};
function evLembrar() {
  const eu = estEu();
  if (!eu) return;
  const agora = Date.now();
  for (const eid in EV.lista) {
    const e = EV.lista[eid];
    if (!e || !e.quando || EV_AVISADOS[eid]) continue;
    if (!e.vou || !e.vou[eu.id]) continue;
    const falta = e.quando - agora;
    /* NÃO PERTURBE e destino silenciado valem também aqui: um lembrete
       que fura o silêncio é o mesmo que não ter silêncio */
    let posso = true;
    try { posso = podeIncomodar(e.onde || ""); } catch (err) {}
    if (falta > 0 && falta < 900000 && posso) {
      EV_AVISADOS[eid] = 1;
      estAvisar("📅 " + e.nome + " começa " + estQuandoFalta(e.quando));
    }
  }
}

/* =====================================================================
   5. O ENCAIXE NA CONVERSA
   ---------------------------------------------------------------------
   Uma função desenha o corpo de QUALQUER mensagem, e uma função liga os
   cliques de QUALQUER cartão. A conversa não precisa saber que enquete
   existe — ela pergunta aqui.
   ===================================================================== */
function estCorpoDaMensagem(m, eu) {
  if (m && m.tipo === "enquete" && m.enq) return enqHTML(m, eu);
  if (m && m.tipo === "evento" && m.ev) return evHTML(m);
  if (m && m.tipo === "chamada" && m.cham) return vozCartaoHTML(m, eu);
  return '<div class="est-txt">' + estTextoComMencoes(m.txt, eu) + "</div>";
}

function socialLigarCartoes(raiz) {
  if (!raiz) return;
  raiz.querySelectorAll("[data-voto]").forEach(b =>
    b.addEventListener("click", e => {
      e.stopPropagation();
      const p = b.getAttribute("data-voto").split(":");
      enqVotar(p[0], parseInt(p[1], 10));
    }));
  raiz.querySelectorAll("[data-enqfim]").forEach(b =>
    b.addEventListener("click", e => {
      e.stopPropagation();
      enqFechar(b.getAttribute("data-enqfim"));
    }));
  raiz.querySelectorAll("[data-evvou]").forEach(b =>
    b.addEventListener("click", e => {
      e.stopPropagation();
      evMarcar(b.getAttribute("data-evvou"));
    }));
  raiz.querySelectorAll("[data-evx]").forEach(b =>
    b.addEventListener("click", e => {
      e.stopPropagation();
      evCancelar(b.getAttribute("data-evx"));
    }));
  raiz.querySelectorAll("[data-atender]").forEach(b =>
    b.addEventListener("click", e => {
      e.stopPropagation();
      vozEntrar(b.getAttribute("data-atender"), "chamada");
    }));
}

/* o ＋ da barra de escrever: o que dá para mandar além de texto */
function socialAbrirMais() {
  const d = EST.destino;
  if (!d) return;
  let h = "";
  if (enqPodeCriar(d)) h += '<button class="est-jan-ok" data-mais="enquete">📊 Criar uma enquete</button>';
  if (evPodeCriar(d))  h += '<button class="est-jan-ok" data-mais="evento">📅 Marcar um evento</button>';
  h += '<button class="est-jan-ok" data-mais="agenda">🗓 Ver o que está marcado</button>';
  if (socialPodeChamar(d) && d.tipo !== "dm") {
    h += CHAMADOS.map(c =>
      '<button class="est-jan-ok" data-mais="' + c.id + '">' +
      (c.id === "everyone" ? "📣 " : "👋 ") + "Chamar " + escaparTexto(c.nome) +
      ' <em class="est-jan-sub">' + escaparTexto(c.marca) + " · " +
      escaparTexto(c.sobre) + "</em></button>").join("");
  }
  estJanela("O que você quer mandar?", h, cx =>
    cx.querySelectorAll("[data-mais]").forEach(b => b.addEventListener("click", () => {
      const q = b.getAttribute("data-mais");
      estFecharJanela();
      if (q === "enquete") enqAbrirCriar();
      else if (q === "evento") evAbrirCriar();
      else if (q === "agenda") evAbrirAgenda();
      else {
        const campo = $("est-campo");
        campo.value = "@" + q + " " + campo.value;
        campo.focus();
      }
    })));
}
