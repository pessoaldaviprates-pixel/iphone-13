/* =====================================================================
   O DONO DA SALA DE VOZ — quarenta coisas que dá para fazer
   =====================================================================
   O dono do jogo é dono de TODAS as salas, sempre, sem precisar ter
   criado nenhuma. Foi pedido assim e faz sentido: a Estação é a casa do
   jogo, e quem cuida da casa precisa poder entrar em qualquer cômodo.
   Nas salas de servidor, quem manda continua sendo quem tem a permissão
   lá dentro.

   ONDE MORA NA NUVEM
   ---------------------------------------------------------------------
     conversas/voz__<sala>/regras        o que vale nesta sala
     conversas/voz__<sala>/banidos/<uid> quem não entra mais
     conversas/voz__<sala>/sinais/<uid>  as ordens, no mesmo caminho das
                                         ofertas de ligação

   As ordens pegam carona nos bilhetes que a voz já troca. Um galho novo
   só para isso seria mais uma coisa para as regras antigas do Firebase
   recusarem calado — e outra coisa para olhar de tempos em tempos.

   O QUE ISTO NÃO É
   ---------------------------------------------------------------------
   Quem obedece à ordem é o jogo de quem recebeu. Alguém decidido, com o
   navegador aberto no modo desenvolvedor, consegue ignorar um "calar".
   Isto aqui é para organizar uma sala cheia de gente de boa-fé, que é o
   caso de 99 em 100 — e não um cadeado. O cadeado de verdade só existe
   com um servidor de áudio no meio, que este jogo não tem e não vai ter
   sem custar dinheiro todo mês.
   ===================================================================== */

const VOZ_FAMILIAS = [
  { id: "sala",    nome: "A SALA",     ic: "🏠" },
  { id: "pessoas", nome: "AS PESSOAS", ic: "👥" },
  { id: "som",     nome: "O SOM",      ic: "🔊" },
  { id: "regras",  nome: "AS REGRAS",  ic: "📋" }
];

/* Quarenta. Cada uma é perguntada em algum lugar antes de deixar fazer,
   ou faz alguma coisa acontecer no aparelho de alguém. Nenhuma é
   enfeite de tela.

   tipo:
     liga   — uma chavinha (ligada/desligada)
     num    — um número, escolhido numa listinha
     txt    — um texto curto
     acao   — um botão que faz e acaba
     alvo   — um botão que precisa de uma pessoa escolhida antes */
const VOZ_PODERES = [
  /* ---- A SALA (10) ---- */
  { id: "nome",        g: "sala", tipo: "txt",  nome: "Renomear a sala",
    sobre: "o nome que todo mundo vê na barra", max: 24 },
  { id: "recado",      g: "sala", tipo: "txt",  nome: "Recado da sala",
    sobre: "aparece para quem entra", max: 80 },
  { id: "limite",      g: "sala", tipo: "num",  nome: "Quantos cabem",
    sobre: "acima disso a sala recusa", ops: [2, 4, 6, 8, 12, 20, 50] },
  { id: "trancada",    g: "sala", tipo: "liga", nome: "Trancar a sala",
    sobre: "quem está fica, mais ninguém entra" },
  { id: "senha",       g: "sala", tipo: "txt",  nome: "Senha para entrar",
    sobre: "vazio = sem senha", max: 16 },
  { id: "soAmigos",    g: "sala", tipo: "liga", nome: "Só amigos meus",
    sobre: "quem não é da sua lista não entra" },
  { id: "soConvidado", g: "sala", tipo: "liga", nome: "Só quem eu chamar",
    sobre: "ninguém entra sozinho" },
  { id: "esvaziar",    g: "sala", tipo: "acao", nome: "Tirar todo mundo",
    sobre: "a sala fica só com você" },
  { id: "fechar",      g: "sala", tipo: "acao", nome: "Fechar a sala",
    sobre: "tira todo mundo E tranca" },
  { id: "cor",         g: "sala", tipo: "num",  nome: "Cor da sala",
    sobre: "como ela aparece na barra", ops: [0, 1, 2, 3, 4, 5] },

  /* ---- AS PESSOAS (10) ---- */
  { id: "calar",       g: "pessoas", tipo: "alvo", nome: "Calar",
    sobre: "fecha o microfone de quem você escolheu" },
  { id: "descalar",    g: "pessoas", tipo: "alvo", nome: "Devolver o microfone",
    sobre: "desfaz o calar" },
  { id: "ensurdecer",  g: "pessoas", tipo: "alvo", nome: "Tirar o fone",
    sobre: "a pessoa para de ouvir a sala" },
  { id: "desensurdecer", g: "pessoas", tipo: "alvo", nome: "Devolver o fone",
    sobre: "desfaz o de cima" },
  { id: "tirar",       g: "pessoas", tipo: "alvo", nome: "Tirar da sala",
    sobre: "sai agora, mas pode voltar" },
  { id: "banir",       g: "pessoas", tipo: "alvo", nome: "Banir da sala",
    sobre: "sai e não volta mais" },
  { id: "desbanir",    g: "pessoas", tipo: "acao", nome: "Perdoar um banido",
    sobre: "escolhe da lista de banidos" },
  { id: "puxar",       g: "pessoas", tipo: "acao", nome: "Chamar alguém para cá",
    sobre: "convida um amigo para esta sala" },
  { id: "mover",       g: "pessoas", tipo: "alvo", nome: "Mover para outra sala",
    sobre: "manda a pessoa para a sala que você escolher" },
  { id: "ajudante",    g: "pessoas", tipo: "alvo", nome: "Fazer ajudante",
    sobre: "pode calar e tirar, mas não mexe nas regras" },

  /* ---- O SOM (10) ---- */
  { id: "volume",      g: "som", tipo: "alvo", nome: "Volume de uma pessoa",
    sobre: "só no SEU fone; ninguém mais é afetado" },
  { id: "calarTodos",  g: "som", tipo: "acao", nome: "Calar a sala inteira",
    sobre: "todo mundo menos você e os ajudantes" },
  { id: "soEuFalo",    g: "som", tipo: "liga", nome: "Modo palestra",
    sobre: "só você e os ajudantes falam" },
  { id: "fila",        g: "som", tipo: "liga", nome: "Fila para falar",
    sobre: "quem quer falar levanta a mão ✋" },
  { id: "darPalavra",  g: "som", tipo: "alvo", nome: "Dar a palavra",
    sobre: "libera o microfone de quem levantou a mão" },
  { id: "prioridade",  g: "som", tipo: "liga", nome: "Voz prioritária",
    sobre: "quando você fala, os outros abaixam" },
  { id: "entrarMudo",  g: "som", tipo: "liga", nome: "Entrar calado",
    sobre: "quem chega chega com o microfone fechado" },
  { id: "avisoSom",    g: "som", tipo: "liga", nome: "Aviso de entrada e saída",
    sobre: "um toque quando alguém chega ou sai" },
  { id: "semRuido",    g: "som", tipo: "liga", nome: "Cortar ruído de fundo",
    sobre: "ventilador, teclado, rua" },
  { id: "leve",        g: "som", tipo: "liga", nome: "Som leve",
    sobre: "gasta menos internet, em rede ruim" },

  /* ---- AS REGRAS (10) ---- */
  { id: "faseMin",     g: "regras", tipo: "num",  nome: "Fase mínima",
    sobre: "quem não chegou lá não entra", ops: [0, 5, 10, 25, 50, 100] },
  { id: "tempoFala",   g: "regras", tipo: "num",  nome: "Tempo de fala",
    sobre: "segundos seguidos por vez; 0 = sem limite", ops: [0, 15, 30, 60, 120] },
  { id: "tirarParado", g: "regras", tipo: "num",  nome: "Tirar quem some",
    sobre: "minutos calado até sair sozinho; 0 = nunca", ops: [0, 5, 10, 30, 60] },
  { id: "semPalavrao", g: "regras", tipo: "liga", nome: "Sem palavrão no nome",
    sobre: "quem tem nome feio não entra" },
  { id: "registro",    g: "regras", tipo: "liga", nome: "Anotar tudo",
    sobre: "quem entrou, saiu e o que você fez" },
  { id: "verRegistro", g: "regras", tipo: "acao", nome: "Ver o que ficou anotado",
    sobre: "a lista do que aconteceu aqui" },
  { id: "apelido",     g: "regras", tipo: "alvo", nome: "Apelido só desta sala",
    sobre: "o nome da pessoa aqui dentro" },
  { id: "convite",     g: "regras", tipo: "acao", nome: "Código de convite",
    sobre: "para chamar quem não é amigo" },
  { id: "transferir",  g: "regras", tipo: "alvo", nome: "Passar a sala",
    sobre: "outra pessoa vira dona" },
  { id: "sempreDono",  g: "regras", tipo: "liga", nome: "Sou sempre o dono",
    sobre: "você volta a ser dono toda vez que entrar" }
];

/* as cores que a sala pode ter, na ordem do número guardado */
const VOZ_CORES = ["#4DE8FF", "#23DC8C", "#FFC145", "#FF4D8F", "#C34DFF", "#7FB6FF"];

/* o que vale numa sala que ninguém mexeu ainda */
const VOZ_REGRAS_PADRAO = {
  limite: 8, trancada: 0, senha: "", soAmigos: 0, soConvidado: 0, cor: 0,
  soEuFalo: 0, fila: 0, prioridade: 0, entrarMudo: 0, avisoSom: 1,
  semRuido: 1, leve: 0, faseMin: 0, tempoFala: 0, tirarParado: 0,
  semPalavrao: 1, registro: 0, sempreDono: 1, nome: "", recado: ""
};

/* =====================================================================
   QUEM É DONO
   ---------------------------------------------------------------------
   Uma função só decide, e todo lugar pergunta a ela. Se cada tela
   fizesse a própria conta, um dia uma delas esqueceria de olhar o
   ajudante e o ajudante ficaria sem poder nenhum na metade dos botões.
   ===================================================================== */
function vozSouDonoDoJogo() {
  try { if (ehDono(save.__name)) return true; } catch (e) {}
  try { if (PERM.entrou && PERM.dono) return true; } catch (e) {}
  return false;
}
function vozSouDono(sala) {
  sala = sala || VOZ.sala;
  if (!sala) return false;
  /* O DONO DO JOGO É DONO DE TODAS. É o pedido, e é o que faz a Estação
     ter alguém para chamar quando a sala vira bagunça. */
  if (vozSouDonoDoJogo()) return true;
  /* numa sala de servidor quem manda é a permissão de lá */
  if (sala.indexOf("srv__") === 0) {
    try { return srvPode("vozCalarOutros") || srvPode("moverVoz"); } catch (e) { return false; }
  }
  const eu = estEu();
  return !!(eu && VOZ.regras && VOZ.regras.dono === eu.id);
}
/* o ajudante pode mexer nas pessoas, não nas regras */
function vozSouAjudante() {
  const eu = estEu();
  if (!eu) return false;
  return !!((VOZ.regras.ajudantes || {})[eu.id]);
}
function vozPodePoder(p) {
  if (vozSouDono()) return true;
  return p.g === "pessoas" && vozSouAjudante() &&
         ["calar", "descalar", "tirar", "mover"].indexOf(p.id) >= 0;
}

/* o valor de uma regra agora, com o padrão de reserva */
function vozRegra(id) {
  const v = (VOZ.regras || {})[id];
  return v === undefined ? VOZ_REGRAS_PADRAO[id] : v;
}

async function vozRegraDefinir(id, valor) {
  if (!VOZ.sala) return false;
  if (!vozSouDono()) { estAvisar("Só o dono da sala mexe nisso."); return false; }
  VOZ.regras[id] = valor;
  vozPintar();
  try { estPintarLado(); } catch (e) {}
  const r = await nuvemSoltar(vozCaminho(VOZ.sala) + "/regras/" + id, valor);
  if (r === null) { estAvisar("A nuvem não aceitou. Tente de novo."); return false; }
  vozAnotar("regra", id + " = " + valor);
  return true;
}

/* =====================================================================
   AS ORDENS
   ---------------------------------------------------------------------
   Uma ordem é um bilhete endereçado a UMA pessoa, no mesmo lugar onde as
   ofertas de ligação já passam. Quem recebe obedece e apaga.
   ===================================================================== */
async function vozOrdem(uid, ordem, valor) {
  if (!VOZ.sala || !uid) return false;
  const k = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const r = await nuvemSoltar(vozCaminho(VOZ.sala) + "/sinais/" + uid + "/" + k,
    { de: VOZ.eu, tipo: "ordem", ordem, dado: String(valor === undefined ? "" : valor),
      quando: Date.now() });
  return r !== null;
}

/* eu recebi uma ordem. Só obedeço a quem manda aqui -- senão qualquer um
   escreveria um bilhete de "sai da sala" para os outros. */
function vozObedecer(s) {
  const quem = s.de;
  const donoDaSala = (VOZ.regras || {}).dono;
  const ajudante = ((VOZ.regras || {}).ajudantes || {})[quem];
  const donoJogo = ((VOZ.dentro || {})[quem] || {}).donoJogo;
  if (quem !== donoDaSala && !ajudante && !donoJogo) return;

  const nome = ((VOZ.dentro || {})[quem] || {}).nome || "o dono";
  if (s.ordem === "calar")       { VOZ.mudo = true;  vozAplicarMudo(); vozAvisarQueEstou();
                                   estAvisar(nome + " fechou o seu microfone."); }
  else if (s.ordem === "descalar") { VOZ.mudo = false; vozAplicarMudo(); vozAvisarQueEstou();
                                   estAvisar(nome + " devolveu o seu microfone."); }
  else if (s.ordem === "ensurdecer") { VOZ.surdo = true; vozSurdoAplicar(); vozAvisarQueEstou();
                                   estAvisar(nome + " tirou o seu fone."); }
  else if (s.ordem === "desensurdecer") { VOZ.surdo = false; vozSurdoAplicar(); vozAvisarQueEstou();
                                   estAvisar(nome + " devolveu o seu fone."); }
  else if (s.ordem === "tirar")  { estAvisar(nome + " tirou você da sala."); vozSair(); }
  else if (s.ordem === "banir")  { estAvisar(nome + " baniu você desta sala."); vozSair(); }
  else if (s.ordem === "mover")  { estAvisar(nome + " moveu você de sala."); vozEntrar(s.dado); }
  else if (s.ordem === "puxar")  { vozConvitePerguntar(nome, s.dado); }
  else if (s.ordem === "palavra") { VOZ.mao = false; VOZ.mudo = false; vozAplicarMudo();
                                   vozAvisarQueEstou(); estAvisar("É a sua vez de falar."); }
  vozPintar();
}

/* ser puxado para uma sala não pode ser automático: entrar numa chamada
   sem querer, com o microfone aberto, é o pesadelo de todo mundo */
function vozConvitePerguntar(quem, sala) {
  estJanela("Chamaram você",
    '<p class="est-nota"><b>' + escaparTexto(quem) + "</b> está chamando você para " +
    "<b>" + escaparLongo(vozNomeDaSala(sala)) + "</b>.</p>" +
    '<button class="est-jan-ok" id="voz-aceito">ENTRAR NA SALA</button>' +
    '<button class="est-jan-ok" id="voz-nao">agora não</button>',
    () => {
      $("voz-aceito").addEventListener("click", () => { estFecharJanela(); vozEntrar(sala); });
      $("voz-nao").addEventListener("click", estFecharJanela);
    });
}

/* =====================================================================
   O REGISTRO
   ---------------------------------------------------------------------
   Só grava se o dono ligou. Anotar por padrão o que as pessoas fazem
   numa sala de voz seria o tipo de coisa que ninguém pediu e todo mundo
   detesta descobrir depois.
   ===================================================================== */
const VOZ_REGISTRO_TETO = 60;
function vozAnotar(tipo, txt) {
  if (!VOZ.sala || !vozRegra("registro")) return;
  const eu = estEu();
  const k = Date.now().toString(36) + Math.random().toString(36).slice(2, 4);
  nuvemSoltar(vozCaminho(VOZ.sala) + "/registro/" + k,
    { quem: eu ? eu.tag : "?", tipo, txt: String(txt).slice(0, 80), quando: Date.now() });
}

/* =====================================================================
   O QUE AS REGRAS FAZEM DE VERDADE
   ---------------------------------------------------------------------
   Regra que só existe na tela de ajustes não é regra. Cada uma destas é
   aplicada em algum momento real: na hora de entrar, na hora de falar,
   ou na batida de 1,2s.
   ===================================================================== */

/* na porta: pode entrar? Devolve null se pode, ou o motivo se não. */
async function vozPorteiro(sala) {
  if (vozSouDonoDoJogo()) return null;        // o dono do jogo entra em tudo
  const r = (await nuvemReq(vozCaminho(sala) + "/regras")) || {};
  const eu = estEu();
  const ban = (await nuvemReq(vozCaminho(sala) + "/banidos")) || {};
  if (eu && ban[eu.id]) return "Você foi banido desta sala.";
  if (r.trancada) return "Esta sala está trancada.";
  if (r.soAmigos && r.dono && eu) {
    const meus = (typeof AM !== "undefined" && AM.lista) || {};
    if (r.dono !== eu.id && !meus[r.dono]) return "Esta sala é só para os amigos de quem a abriu.";
  }
  if (r.faseMin) {
    let minha = 0;
    try { minha = save.best || 0; } catch (e) {}
    if (minha < r.faseMin) return "Esta sala é da fase " + r.faseMin + " para cima.";
  }
  if (r.semPalavrao && eu) {
    try { if (limparTexto(eu.tag) !== eu.tag) return "Seu nome não passa no filtro desta sala."; }
    catch (e) {}
  }
  if (r.senha) {
    const dita = prompt("Senha da sala:");
    if (String(dita || "").trim() !== r.senha) return "Senha errada.";
  }
  if (r.soConvidado && !VOZ.convidadoPara[sala]) return "Só entra quem for chamado.";
  return null;
}

/* depois de entrar: o que a sala impõe a mim */
function vozAplicarRegrasEmMim() {
  if (vozSouDono()) return;
  if (vozRegra("entrarMudo") && !VOZ.jaEntrei) { VOZ.mudo = true; vozAplicarMudo(); }
  /* modo palestra e fila calam quem não tem a palavra. O dono e os
     ajudantes ficam de fora -- alguém tem que poder falar. */
  if ((vozRegra("soEuFalo") || vozRegra("fila")) && !vozSouAjudante() && !VOZ.comPalavra) {
    if (!VOZ.mudo) { VOZ.mudo = true; vozAplicarMudo(); vozAvisarQueEstou(); }
  }
}

/* levantar a mão, quando a sala está em fila */
async function vozMao() {
  if (!VOZ.sala) return;
  VOZ.mao = !VOZ.mao;
  await nuvemSoltar(vozCaminho(VOZ.sala) + "/dentro/" + VOZ.eu + "/mao", VOZ.mao ? 1 : null,
                    VOZ.mao ? "PUT" : "DELETE");
  estAvisar(VOZ.mao ? "Você levantou a mão. Espere te darem a palavra."
                    : "Você abaixou a mão.");
  vozPintar();
}

/* o relógio de quem ficou calado tempo demais */
function vozOlharParados() {
  const min = vozRegra("tirarParado");
  if (!min || !vozSouDono()) return;      // quem tira é o dono, para não tirar duas vezes
  const limite = min * 60000;
  for (const uid in VOZ.dentro) {
    if (uid === VOZ.eu) continue;
    const f = VOZ.dentro[uid];
    const falou = VOZ.ultimaFala[uid] || f.quando || 0;
    if (Date.now() - falou > limite) {
      vozOrdem(uid, "tirar");
      vozAnotar("saiu", (f.nome || "piloto") + " saiu por ficar calado");
    }
  }
}

/* =====================================================================
   O PAINEL DO DONO
   ---------------------------------------------------------------------
   Quarenta coisas não cabem numa lista só sem virar um caça-palavras.
   Quatro famílias, uma de cada vez, e a pessoa escolhida no topo -- que
   é o que faz as dez de PESSOAS terem sentido sem repetir a lista de
   gente quatro vezes.
   ===================================================================== */
let vozAba = "sala";
let vozAlvo = "";

function vozAbrirPainel() {
  if (!VOZ.sala) { estAvisar("Entre numa sala primeiro."); return; }
  if (!vozSouDono() && !vozSouAjudante()) {
    estAvisar("Só o dono da sala abre isto.");
    return;
  }
  vozAba = vozSouDono() ? "sala" : "pessoas";
  estJanela("Sala: " + VOZ.nome, '<div id="voz-painel"></div>', () => vozPintarPainel());
}

function vozPintarPainel() {
  const cx = $("voz-painel");
  if (!cx) return;
  const podeFam = f => VOZ_PODERES.some(p => p.g === f.id && vozPodePoder(p));
  const fams = VOZ_FAMILIAS.filter(podeFam);
  if (!fams.some(f => f.id === vozAba)) vozAba = fams.length ? fams[0].id : "";

  let h = '<div class="voz-abas">' + fams.map(f =>
    '<button class="voz-aba' + (f.id === vozAba ? " on" : "") + '" data-vaba="' + f.id + '">' +
    f.ic + " " + f.nome + "</button>").join("") + "</div>";

  /* a pessoa escolhida vale para as dez de PESSOAS e para as de SOM que
     mexem em alguém: escolher uma vez e usar em todas é o que evita
     dez listas iguais na mesma tela */
  const precisaAlvo = VOZ_PODERES.some(p => p.g === vozAba && p.tipo === "alvo");
  if (precisaAlvo) {
    const gente = Object.keys(VOZ.dentro).filter(u => u !== VOZ.eu);
    h += '<div class="voz-quem-h">EM QUEM</div>';
    if (!gente.length) h += '<p class="est-nota">Você está sozinho na sala.</p>';
    h += '<div class="voz-alvos">' + gente.map(uid => {
      const f = VOZ.dentro[uid] || {};
      return '<button class="voz-alvo' + (uid === vozAlvo ? " on" : "") +
        '" data-valvo="' + uid + '"><b>' + escaparTexto(estIni(f.nome || "?")) + "</b>" +
        escaparTexto(f.nome || "piloto") + (f.mao ? " ✋" : "") + "</button>";
    }).join("") + "</div>";
  }

  h += '<div class="voz-poderes">';
  for (const p of VOZ_PODERES) {
    if (p.g !== vozAba || !vozPodePoder(p)) continue;
    h += '<div class="voz-poder"><div class="voz-poder-txt"><strong>' +
         escaparTexto(p.nome) + "</strong><em>" + escaparLongo(p.sobre) + "</em></div>";
    if (p.tipo === "liga") {
      h += '<button class="voz-chave' + (vozRegra(p.id) ? " on" : "") +
           '" data-vliga="' + p.id + '"><i></i></button>';
    } else if (p.tipo === "num") {
      h += '<div class="voz-nums">' + p.ops.map(o =>
        '<button class="voz-num' + (vozRegra(p.id) === o ? " on" : "") +
        '" data-vnum="' + p.id + '" data-v="' + o + '">' +
        (p.id === "cor" ? '<span class="voz-bola" style="background:' + VOZ_CORES[o] + '"></span>'
                        : (o === 0 ? "—" : o)) + "</button>").join("") + "</div>";
    } else if (p.tipo === "txt") {
      h += '<input class="voz-txt" data-vtxt="' + p.id + '" maxlength="' + (p.max || 40) +
           '" value="' + escaparTexto(String(vozRegra(p.id) || "")) + '" autocomplete="off">';
    } else {
      h += '<button class="voz-fazer" data-vacao="' + p.id + '">FAZER</button>';
    }
    h += "</div>";
  }
  h += "</div>";
  cx.innerHTML = h;

  cx.querySelectorAll("[data-vaba]").forEach(b => b.addEventListener("click", () => {
    vozAba = b.getAttribute("data-vaba"); vozPintarPainel();
  }));
  cx.querySelectorAll("[data-valvo]").forEach(b => b.addEventListener("click", () => {
    vozAlvo = b.getAttribute("data-valvo"); vozPintarPainel();
  }));
  cx.querySelectorAll("[data-vliga]").forEach(b => b.addEventListener("click", async () => {
    const id = b.getAttribute("data-vliga");
    await vozRegraDefinir(id, vozRegra(id) ? 0 : 1);
    vozPintarPainel();
  }));
  cx.querySelectorAll("[data-vnum]").forEach(b => b.addEventListener("click", async () => {
    await vozRegraDefinir(b.getAttribute("data-vnum"), parseInt(b.getAttribute("data-v"), 10));
    vozPintarPainel();
  }));
  cx.querySelectorAll("[data-vtxt]").forEach(el => el.addEventListener("change", async () => {
    await vozRegraDefinir(el.getAttribute("data-vtxt"), el.value.slice(0, 80));
  }));
  cx.querySelectorAll("[data-vacao]").forEach(b => b.addEventListener("click", () =>
    vozFazer(b.getAttribute("data-vacao"))));
}

/* as ações e as que precisam de alvo, num lugar só */
async function vozFazer(id) {
  const p = VOZ_PODERES.filter(x => x.id === id)[0];
  if (!p || !vozPodePoder(p)) { estAvisar("Você não pode isso aqui."); return; }
  const alvo = vozAlvo && VOZ.dentro[vozAlvo] ? vozAlvo : "";
  const nomeAlvo = alvo ? (VOZ.dentro[alvo].nome || "piloto") : "";
  if (p.tipo === "alvo" && !alvo) { estAvisar("Escolha uma pessoa primeiro."); return; }

  if (id === "calar" || id === "descalar" || id === "ensurdecer" ||
      id === "desensurdecer" || id === "tirar") {
    await vozOrdem(alvo, id);
    vozAnotar(id, nomeAlvo);
    estAvisar("Pronto: " + p.nome.toLowerCase() + " — " + nomeAlvo + ".");
    return;
  }
  if (id === "banir") {
    await nuvemSoltar(vozCaminho(VOZ.sala) + "/banidos/" + alvo, nomeAlvo);
    await vozOrdem(alvo, "banir");
    vozAnotar("banir", nomeAlvo);
    estAvisar(nomeAlvo + " foi banido desta sala.");
    return;
  }
  if (id === "desbanir") {
    const ban = (await nuvemReq(vozCaminho(VOZ.sala) + "/banidos")) || {};
    const ids = Object.keys(ban);
    if (!ids.length) { estAvisar("Ninguém banido aqui."); return; }
    estJanela("Perdoar", ids.map(u =>
      '<button class="est-jan-ok" data-perdoa="' + u + '">' + escaparTexto(ban[u]) + "</button>").join(""),
      cx => cx.querySelectorAll("[data-perdoa]").forEach(b => b.addEventListener("click", async () => {
        await nuvemSoltar(vozCaminho(VOZ.sala) + "/banidos/" + b.getAttribute("data-perdoa"),
                          null, "DELETE");
        estFecharJanela();
        estAvisar("Perdoado. Pode voltar.");
      })));
    return;
  }
  if (id === "mover") {
    estJanela("Mover " + nomeAlvo, EST_VOZ.filter(v => v.id !== VOZ.sala).map(v =>
      '<button class="est-jan-ok" data-mv="' + v.id + '">' + escaparTexto(v.nome) + "</button>").join(""),
      cx => cx.querySelectorAll("[data-mv]").forEach(b => b.addEventListener("click", async () => {
        await vozOrdem(alvo, "mover", b.getAttribute("data-mv"));
        vozAnotar("mover", nomeAlvo);
        estFecharJanela();
        estAvisar(nomeAlvo + " foi movido.");
      })));
    return;
  }
  if (id === "puxar") {
    const lista = (typeof AM !== "undefined" && AM.lista) || {};
    const ids = Object.keys(lista).filter(u => !VOZ.dentro[u]);
    if (!ids.length) { estAvisar("Todos os seus amigos já estão aqui (ou você não tem nenhum)."); return; }
    estJanela("Chamar para a sala", ids.map(u =>
      '<button class="est-jan-ok" data-px="' + u + '">' +
      escaparTexto(lista[u].tag || lista[u].nome) + "</button>").join(""),
      cx => cx.querySelectorAll("[data-px]").forEach(b => b.addEventListener("click", async () => {
        const u = b.getAttribute("data-px");
        /* o convite vale para o porteiro: sem isto, uma sala "só quem eu
           chamar" recusaria justamente quem foi chamado */
        await nuvemSoltar(vozCaminho(VOZ.sala) + "/convidados/" + u, Date.now());
        await vozOrdem(u, "puxar", VOZ.sala);
        estFecharJanela();
        estAvisar("Chamado. Agora é com a pessoa.");
      })));
    return;
  }
  if (id === "ajudante") {
    const tinha = (VOZ.regras.ajudantes || {})[alvo];
    VOZ.regras.ajudantes = VOZ.regras.ajudantes || {};
    if (tinha) delete VOZ.regras.ajudantes[alvo];
    else VOZ.regras.ajudantes[alvo] = nomeAlvo;
    await nuvemSoltar(vozCaminho(VOZ.sala) + "/regras/ajudantes/" + alvo,
                      tinha ? null : nomeAlvo, tinha ? "DELETE" : "PUT");
    vozAnotar("ajudante", nomeAlvo);
    estAvisar(tinha ? nomeAlvo + " não é mais ajudante." : nomeAlvo + " agora é ajudante.");
    vozPintarPainel();
    return;
  }
  if (id === "volume") {
    const par = VOZ.pares[alvo];
    if (!par) { estAvisar("Ainda não estou ligado com essa pessoa."); return; }
    estJanela("Volume de " + nomeAlvo,
      '<p class="est-nota">Isto vale só no SEU fone. Ninguém mais é afetado.</p>' +
      '<div class="voz-nums">' + [0, 25, 50, 75, 100, 150].map(v =>
        '<button class="voz-num' + (Math.round((par.audio.volume || 1) * 100) === v ? " on" : "") +
        '" data-vol="' + v + '">' + v + "%</button>").join("") + "</div>",
      cx => cx.querySelectorAll("[data-vol]").forEach(b => b.addEventListener("click", () => {
        const v = parseInt(b.getAttribute("data-vol"), 10) / 100;
        /* o navegador não passa de 1: acima disso é promessa falsa, e
           dizer isso é melhor que fingir que subiu */
        par.audio.volume = Math.min(1, v);
        estFecharJanela();
        estAvisar(v > 1 ? "No máximo que o navegador deixa." : "Volume de " + nomeAlvo + ": " + b.textContent);
      })));
    return;
  }
  if (id === "darPalavra") {
    await vozOrdem(alvo, "palavra");
    await nuvemSoltar(vozCaminho(VOZ.sala) + "/dentro/" + alvo + "/mao", null, "DELETE");
    estAvisar(nomeAlvo + " está com a palavra.");
    return;
  }
  if (id === "apelido") {
    const novo = prompt("Apelido de " + nomeAlvo + " nesta sala:", nomeAlvo);
    if (novo === null) return;
    await nuvemSoltar(vozCaminho(VOZ.sala) + "/dentro/" + alvo + "/nome",
                      String(novo).slice(0, 20) || nomeAlvo);
    estAvisar("Apelido trocado.");
    return;
  }
  if (id === "transferir") {
    await vozRegraDefinir("dono", alvo);
    vozAnotar("transferir", nomeAlvo);
    estAvisar("A sala agora é de " + nomeAlvo + ".");
    estFecharJanela();
    return;
  }
  if (id === "calarTodos") {
    let n = 0;
    for (const uid in VOZ.dentro) {
      if (uid === VOZ.eu || (VOZ.regras.ajudantes || {})[uid]) continue;
      await vozOrdem(uid, "calar");
      n++;
    }
    vozAnotar("calarTodos", n + " pessoas");
    estAvisar(n ? "Calei " + n + (n === 1 ? " pessoa." : " pessoas.") : "Não tinha ninguém para calar.");
    return;
  }
  if (id === "esvaziar" || id === "fechar") {
    let n = 0;
    for (const uid in VOZ.dentro) { if (uid === VOZ.eu) { continue; } await vozOrdem(uid, "tirar"); n++; }
    if (id === "fechar") await vozRegraDefinir("trancada", 1);
    vozAnotar(id, n + " pessoas");
    estAvisar(id === "fechar" ? "Sala esvaziada e trancada." : "Sala esvaziada.");
    estFecharJanela();
    return;
  }
  if (id === "convite") {
    /* o código é a própria sala: quem tem o código sabe o nome dela, e é
       isso que o porteiro precisa saber. Inventar um segundo código só
       para depois traduzi-lo de volta não compraria nada. */
    const cod = VOZ.sala.toUpperCase();
    estJanela("Convite da sala",
      '<p class="est-nota">Mande este código para quem você quer na sala. ' +
      "Ele entra por AMIGOS › ENTRAR NUMA SALA.</p>" +
      '<p class="voz-codigo">' + escaparTexto(cod) + "</p>" +
      '<button class="est-jan-ok" id="voz-copiar">COPIAR</button>',
      () => $("voz-copiar").addEventListener("click", () => {
        try { navigator.clipboard.writeText(cod); estAvisar("Copiado."); }
        catch (e) { estAvisar("Copie na mão: " + cod); }
      }));
    return;
  }
  if (id === "verRegistro") {
    const reg = (await nuvemReq(vozCaminho(VOZ.sala) + "/registro")) || {};
    const linhas = Object.keys(reg).sort().reverse().slice(0, VOZ_REGISTRO_TETO)
      .map(k => reg[k]);
    estJanela("O que aconteceu aqui",
      linhas.length
        ? linhas.map(l => '<div class="voz-reg"><b>' + escaparTexto(l.quem) + "</b> " +
            escaparTexto(l.tipo) + " · " + escaparLongo(l.txt) +
            '<em>' + estHora(l.quando) + "</em></div>").join("")
        : '<p class="est-nota">Nada anotado. Ligue “Anotar tudo” em AS REGRAS ' +
          "para começar a guardar.</p>");
    return;
  }
  estAvisar("Feito.");
}
