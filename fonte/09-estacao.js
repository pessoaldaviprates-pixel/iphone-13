/* =====================================================================
   A ESTAÇÃO — o bate-papo da comunidade, dentro do jogo
   =====================================================================
   Um lugar só onde todo mundo conversa: canais abertos da comunidade,
   conversa reservada com um amigo, e grupos privados. Abre por cima do
   jogo, sem parar nada.

   COMO ISTO ESTÁ ORGANIZADO (e por que em pedaços separados)
   ---------------------------------------------------------------------
   O pedido foi "modular para expandir sem refazer a base". Então cada
   parte só conhece a de baixo, e cada uma tem um trabalho só:

     1. IDENTIDADE   quem sou eu -- vem do jogo, e só de lá
     2. DESTINOS     os lugares onde dá para falar (canal, conversa,
                     grupo e, um dia, voz). Tudo é "um destino".
     3. TRANSPORTE   ler e escrever na nuvem. UM fluxo de cada vez.
     4. MODERAÇÃO    ritmo, palavrão, bloquear, silenciar, denunciar
     5. NÃO LIDAS    quem tem coisa nova para ler
     6. GRUPOS       criar, renomear, entrar, sair, promover
     7. TELA         o que se vê
     8. VOZ          o encaixe pronto, a chamada ainda não

   A parte 2 é a que faz a expansão ser barata: acrescentar um tipo novo
   de lugar (voz, canal de clã, canal só de VIP) é acrescentar uma linha
   numa lista e ensinar o TRANSPORTE a achar o caminho dele. Nada na
   tela precisa saber que tipo é.

   ONDE AS COISAS MORAM NA NUVEM
   ---------------------------------------------------------------------
     conversas/canal__<id>/<chave>        canal aberto da comunidade
     conversas/<par de ids>/<chave>       conversa reservada (a MESMA da
                                          tela de amigos: quem escreve
                                          aqui aparece lá, e o contrário)
     conversas/grupo__<gid>/info          nome, dono e membros do grupo
     conversas/grupo__<gid>/msgs/<chave>  as mensagens do grupo
     conversas/__ultimas/<destino>        o relógio da última mensagem
     amigos/<eu>/grupos/<gid>             os grupos de que eu participo
     amigos/<eu>/bloq/<id>                quem eu bloqueei
     amigos/<eu>/mudo/<id>                quem eu silenciei
     denuncias/<chave>                    o que foi denunciado

   POR QUE TUDO DENTRO DE "conversas/" E "amigos/"
   ---------------------------------------------------------------------
   Porque são os galhos que as regras do banco JÁ liberam -- o jogo
   escreve neles desde a primeira versão de amigos. Um galho novo
   ("chat/") seria recusado nas contas com regras antigas, e o bate-papo
   morreria calado para quem mais precisa dele. Aproveitar o que já
   passa é feio no papel e certo na prática.

   A CHAVE DE CADA MENSAGEM é o relógio em base 36 mais quatro letras ao
   acaso. Duas coisas saem disso de graça: a ordem alfabética das chaves
   é a ordem do tempo (então dá para pedir "as 40 últimas" ao banco sem
   índice nenhum), e duas pessoas escrevendo no mesmo milissegundo não se
   atropelam. É a mesma chave da conversa de amigos, de propósito: as
   duas telas leem a mesma coisa.
   ===================================================================== */

/* =====================================================================
   1. IDENTIDADE
   ---------------------------------------------------------------------
   O bate-papo NÃO tem cadastro, senha nem perfil. Quem você é aqui é
   quem você é no jogo, e ponto. Se um dia alguém quiser mudar o apelido
   ou a moldura, muda no jogo e isto acompanha sozinho -- ter dois
   lugares para editar a mesma coisa é como as duas ficam diferentes.
   ===================================================================== */
function estEu() {
  const id = (typeof meuIdNuvem === "function") ? meuIdNuvem() : null;
  if (!id) return null;
  let tag = "Piloto", mold = "nenhuma";
  try { tag = minhaTag(); } catch (e) {}
  try { mold = molduraAtual(); } catch (e) {}
  return { id, nick: save.__name || "", tag, mold, ini: estIni(tag) };
}
function estIni(nome) { return (String(nome || "?").trim()[0] || "?").toUpperCase(); }

/* =====================================================================
   2. DESTINOS
   ---------------------------------------------------------------------
   Um "destino" é qualquer lugar onde dá para falar. A tela não sabe a
   diferença entre um canal da comunidade e uma conversa reservada: os
   dois são {tipo, id, nome}, e o transporte é que sabe achar o caminho.

   É isto que deixa acrescentar coisa nova sem mexer no resto.
   ===================================================================== */

/* O SERVIDOR É UM SÓ e vem pronto do jogo: ninguém cria servidor, ninguém
   cria canal. Numa comunidade de um jogo só, deixar cada um abrir o
   próprio servidor espalha as pessoas em salas vazias -- o contrário do
   que um bate-papo de comunidade serve para fazer. */
const EST_SERVIDOR = { id: "neon", nome: "NEON NEBULA", sobre: "a estação de todo mundo" };

const EST_CANAIS = [
  { id: "geral",  nome: "geral",  sobre: "conversa solta com a comunidade" },
  { id: "trocas", nome: "trocas", sobre: "trocar, vender e procurar coisa" },
  { id: "ajuda",  nome: "ajuda",  sobre: "dúvida, problema e dica" }
];

/* AS SALAS DE VOZ JÁ EXISTEM COMO DADO, e é de propósito.
   A chamada em si (microfone, WebRTC) não está pronta -- mas a lista, o
   lugar dela na tela, o estado de quem está dentro e o caminho na nuvem
   estão todos aqui. Quando a voz chegar, ela preenche estVozEntrar() e
   mais nada muda: nem a barra lateral, nem os não lidos, nem a conta de
   fluxos. Deixar o encaixe pronto custa trinta linhas hoje e evita
   refazer a base depois. */
const EST_VOZ = [
  { id: "ponte",   nome: "Ponte de comando", limite: 8 },
  { id: "hangar",  nome: "Hangar",           limite: 8 },
  { id: "silencio",nome: "Silêncio",         limite: 4 }
];

/* o estado inteiro num lugar só, para nada ficar fora de sincronia */
const EST = {
  aberta: false,
  destino: null,            // {tipo, id, nome}
  msgs: [],                 // o que está na tela agora
  fluxo: null,              // O ÚNICO fluxo aberto (ver TRANSPORTE)
  fim: false,               // já cheguei no começo da conversa?
  carregando: false,
  grupos: {},               // gid -> {nome, dono, membros}
  pilotos: {},              // id -> ficha, para saber quem está online
  bloq: {}, mudo: {},       // moderação do lado de cá
  visto: {},                // destino -> relógio da última que eu li
  ultimas: {},              // destino -> relógio da última que existe
  ritmo: [],                // os relógios das minhas últimas mensagens
  relogio: null,            // a batida que atualiza online e não lidos
  aba: "canais",            // que parte da barra lateral está aberta
  voz: { sala: null, dentro: {}, mudo: false, surdo: false }
};

const EST_HIST = 40;        // quantas mensagens por vez

/* o endereço de um destino na nuvem. Um lugar só sabe disto. */
function estCaminho(d) {
  if (!d) return null;
  const eu = estEu();
  if (!eu) return null;
  if (d.tipo === "canal") return "conversas/canal__" + d.id;
  if (d.tipo === "dm")    return "conversas/" + salaDaConversa(eu.id, d.id);
  if (d.tipo === "grupo") return "conversas/grupo__" + d.id + "/msgs";
  return null;              // voz não tem mensagens (ainda)
}
/* a etiqueta curta que serve de chave dos não lidos e do localStorage */
function estChave(d) { return d ? d.tipo + ":" + d.id : ""; }

function estMesmoDestino(a, b) {
  return !!a && !!b && a.tipo === b.tipo && String(a.id) === String(b.id);
}

/* =====================================================================
   3. TRANSPORTE
   ---------------------------------------------------------------------
   UM FLUXO DE CADA VEZ. Esta é a regra mais importante do arquivo.

   O navegador só deixa umas seis conexões abertas por endereço, e o
   jogo já usa algumas (a lista de pilotos do painel, os avisos, a
   partida em dupla). Quando isso estourou uma vez, não foi o bate-papo
   que quebrou: foram as GRAVAÇÕES do jogo, calada e aleatoriamente.

   Então: ao abrir um destino, o fluxo anterior fecha ANTES de o novo
   abrir. Os outros destinos não ficam ouvindo -- eles descobrem que tem
   coisa nova por uma olhadinha de vinte em vinte segundos num lugar só
   (ver NÃO LIDAS), que custa uma conexão curta em vez de uma aberta.
   ===================================================================== */
function estDesligarFluxo() {
  if (!EST.fluxo) return;
  try {
    if (typeof EST.fluxo === "function") EST.fluxo();
    else clearInterval(EST.fluxo);
  } catch (e) {}
  EST.fluxo = null;
}

/* transforma o que veio da nuvem numa lista ordenada e limpa */
function estArrumar(d) {
  const arr = [];
  for (const k in (d || {})) {
    const m = d[k];
    if (!m || !m.txt) continue;
    arr.push({ k, de: m.de, nome: m.nome, txt: m.txt, quando: m.quando || 0, mold: m.mold });
  }
  arr.sort((a, b) => (a.quando - b.quando) || (a.k < b.k ? -1 : 1));
  return arr;
}

/* pede ao banco só as últimas mensagens. O orderBy="$key" não precisa de
   índice nenhum nas regras -- é o único jeito de paginar sem pedir para
   o dono mexer no banco, e foi por isso que a chave virou o relógio. */
async function estLer(d, antesDe) {
  const cam = estCaminho(d);
  if (!cam) return [];
  let q = '?orderBy="$key"&limitToLast=' + EST_HIST;
  if (antesDe) q = '?orderBy="$key"&endAt="' + antesDe + '"&limitToLast=' + (EST_HIST + 1);
  const bruto = await nuvemReq(cam, null, q);
  const arr = estArrumar(bruto);
  /* o endAt traz a própria mensagem de novo: tira, senão ela apareceria
     duas vezes toda vez que alguém rolasse para cima */
  return antesDe ? arr.filter(m => m.k !== antesDe) : arr;
}

async function estAbrir(d) {
  if (!d) return;
  const eu = estEu();
  if (!eu) { estAvisar("Entre com um piloto para conversar."); return; }

  estDesligarFluxo();
  EST.destino = d;
  EST.msgs = [];
  EST.fim = false;
  EST.carregando = true;
  estPintar();

  const carregou = await estLer(d);
  /* trocou de destino enquanto a resposta vinha? Joga fora: aplicar
     agora escreveria a conversa velha por cima da nova. */
  if (!estMesmoDestino(EST.destino, d)) return;
  EST.msgs = carregou;
  EST.fim = carregou.length < EST_HIST;
  EST.carregando = false;
  estMarcarLido(d);
  estPintar(true);

  const cam = estCaminho(d);
  if (!cam) return;
  const reler = async () => {
    const novas = await estLer(d);
    if (!estMesmoDestino(EST.destino, d)) return;
    const mudou = novas.length !== EST.msgs.length ||
                  (novas.length && EST.msgs.length &&
                   novas[novas.length - 1].k !== EST.msgs[EST.msgs.length - 1].k);
    if (!mudou) return;
    /* guarda o que já foi carregado para trás: reler traz só as últimas,
       e quem rolou para cima perderia o que estava lendo */
    const velhas = EST.msgs.filter(m => !novas.some(n => n.k === m.k) &&
                                        (!novas.length || m.k < novas[0].k));
    EST.msgs = velhas.concat(novas);
    estMarcarLido(d);
    estPintar(true);
  };
  EST.fluxo = nuvemFluxo(cam, reler,
    /* sem fluxo (regras antigas, rede ruim): uma olhadinha de tempos em
       tempos. Mais lento, mas funciona -- melhor que uma tela morta. */
    () => { EST.fluxo = setInterval(reler, 3000); },
    '?orderBy="$key"&limitToLast=' + EST_HIST);
}

/* rolar para cima carrega o que veio antes */
async function estMais() {
  if (EST.fim || EST.carregando || !EST.msgs.length) return;
  EST.carregando = true;
  estPintar();
  const d = EST.destino;
  const antigas = await estLer(d, EST.msgs[0].k);
  if (!estMesmoDestino(EST.destino, d)) return;
  EST.carregando = false;
  if (!antigas.length) { EST.fim = true; estPintar(); return; }
  EST.msgs = antigas.concat(EST.msgs);
  if (antigas.length < EST_HIST) EST.fim = true;
  estPintar();
}

async function estEnviar(texto) {
  const eu = estEu();
  const d = EST.destino;
  if (!eu || !d) return false;
  texto = String(texto || "").trim().slice(0, 300);
  if (!texto) return false;

  const veredito = estPodeFalar(texto);
  if (!veredito.ok) { estAvisar(veredito.motivo); return false; }
  texto = veredito.texto;

  const cam = estCaminho(d);
  if (!cam) return false;
  const chave = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const msg = { de: eu.id, nome: eu.tag, txt: texto, quando: Date.now(), mold: eu.mold };

  /* aparece na hora, antes de a nuvem responder: esperando o servidor a
     conversa parece travada, e num bate-papo isso é a diferença entre
     parecer vivo e parecer quebrado. Se falhar, some e avisa. */
  EST.msgs.push(Object.assign({ k: chave, indo: true }, msg));
  estPintar(true);

  const ok = await nuvemSoltar(cam + "/" + chave, msg);
  if (ok === null) {
    EST.msgs = EST.msgs.filter(m => m.k !== chave);
    estPintar(true);
    estAvisar("Não deu para enviar. Confira a internet.");
    return false;
  }
  const minha = EST.msgs.filter(m => m.k === chave)[0];
  if (minha) delete minha.indo;
  EST.ritmo.push(Date.now());
  nuvemSoltar("conversas/__ultimas/" + estChave(d), Date.now());
  estMarcarLido(d);
  estPintar(true);
  estPodar(d, cam);
  return true;
}

/* O CANAL NÃO PODE CRESCER PARA SEMPRE.
   Sem isto, o #geral de um ano pesa megabytes e cada reconexão puxa
   tudo. Quem escreve apaga uma velha de vez em quando -- de vez em
   quando, e não sempre, senão cada mensagem viraria duas gravações. */
const EST_TETO = 300;
async function estPodar(d, cam) {
  if (Math.random() > 0.08) return;
  const tudo = await nuvemReq(cam, null, '?orderBy="$key"&limitToLast=' + (EST_TETO + 40));
  const arr = estArrumar(tudo);
  if (arr.length <= EST_TETO) return;
  for (const m of arr.slice(0, arr.length - EST_TETO)) {
    nuvemSoltar(cam + "/" + m.k, null, "DELETE");
  }
}

/* =====================================================================
   4. MODERAÇÃO
   ---------------------------------------------------------------------
   Três coisas diferentes, e de propósito:

     BLOQUEAR   não vejo a pessoa e ela não me chama na conversa
     SILENCIAR  não vejo a pessoa, mas ela continua podendo me chamar
     DENUNCIAR  o dono fica sabendo

   Silenciar existe porque bloquear é forte demais para "esse aí só fala
   bobagem": castigo do tamanho da bagunça, senão ninguém usa nenhum dos
   dois.

   SEJA HONESTO SOBRE O QUE ISTO PROTEGE: o ritmo e o filtro rodam no
   aparelho de quem escreve. Seguram o dedo nervoso, o engraçadinho e o
   acidente -- que é a esmagadora maioria. Não seguram quem sabe mexer no
   navegador. Para isso só existe um lugar: as regras do banco de dados,
   que ficam do lado de lá e ninguém alcança. O que dá para fazer daqui
   está feito; o resto está escrito no NUVEM.md.
   ===================================================================== */

/* ---- ritmo: o anti-enxurrada ---- */
const EST_RITMO = { janela: 10000, maxNaJanela: 6, minEntre: 700, repetidas: 3 };
let estUltimas = [];

function estPodeFalar(texto) {
  const agora = Date.now();
  EST.ritmo = EST.ritmo.filter(t => agora - t < EST_RITMO.janela);

  if (EST.ritmo.length && agora - EST.ritmo[EST.ritmo.length - 1] < EST_RITMO.minEntre)
    return { ok: false, motivo: "Calma, respira. Manda uma de cada vez." };
  if (EST.ritmo.length >= EST_RITMO.maxNaJanela)
    return { ok: false, motivo: "Você mandou muita coisa rápido demais. Espere uns segundos." };

  /* a mesma frase três vezes seguidas é enxurrada mesmo sem ser rápida */
  const igual = String(texto).trim().toLowerCase();
  estUltimas.push(igual);
  if (estUltimas.length > EST_RITMO.repetidas) estUltimas.shift();
  if (estUltimas.length === EST_RITMO.repetidas && estUltimas.every(t => t === igual))
    return { ok: false, motivo: "Já entenderam. Escreva outra coisa." };

  return { ok: true, texto: estFiltrar(texto) };
}

/* ---- filtro de palavrão ----
   Mora em limparTexto(), junto da lista de palavras, e não aqui: ter
   dois filtros parecidos é ter um deles desatualizado. O de lá já sabe
   desfazer disfarce ("p0rra", "caraaalho") e não censura palavra
   inocente. */
function estFiltrar(texto) {
  try { return limparTexto(String(texto || "")); } catch (e) { return String(texto || ""); }
}

/* ---- bloquear, silenciar, denunciar ----
   Ficam na MINHA ficha na nuvem (amigos/<eu>/…), que é um galho que as
   regras já liberam, e assim a lista me acompanha em qualquer aparelho.
   Se não der para gravar, vale só neste aparelho -- pior, mas não
   impede ninguém de se livrar de um chato agora. */
function estCarregarModeracao() {
  try { EST.bloq = JSON.parse(storageGet("nn_est_bloq", "{}")) || {}; } catch (e) { EST.bloq = {}; }
  try { EST.mudo = JSON.parse(storageGet("nn_est_mudo", "{}")) || {}; } catch (e) { EST.mudo = {}; }
  const eu = estEu();
  if (!eu) return;
  nuvemReqC("amigos/" + eu.id + "/bloq").then(d => { if (d) { EST.bloq = d; estGuardarModeracao(); estPintar(); } });
  nuvemReqC("amigos/" + eu.id + "/mudo").then(d => { if (d) { EST.mudo = d; estGuardarModeracao(); estPintar(); } });
}
function estGuardarModeracao() {
  try {
    storageSet("nn_est_bloq", JSON.stringify(EST.bloq));
    storageSet("nn_est_mudo", JSON.stringify(EST.mudo));
  } catch (e) {}
}
function estBloquear(id, nome) {
  const eu = estEu(); if (!eu || id === eu.id) return;
  const tinha = !!EST.bloq[id];
  if (tinha) delete EST.bloq[id]; else EST.bloq[id] = 1;
  estGuardarModeracao();
  nuvemSoltarC("amigos/" + eu.id + "/bloq/" + id, tinha ? null : 1, tinha ? "DELETE" : "PUT");
  estAvisar(tinha ? (nome || "Piloto") + " desbloqueado." : (nome || "Piloto") + " bloqueado.");
  estPintar();
}
function estSilenciar(id, nome) {
  const eu = estEu(); if (!eu || id === eu.id) return;
  const tinha = !!EST.mudo[id];
  if (tinha) delete EST.mudo[id]; else EST.mudo[id] = 1;
  estGuardarModeracao();
  nuvemSoltarC("amigos/" + eu.id + "/mudo/" + id, tinha ? null : 1, tinha ? "DELETE" : "PUT");
  estAvisar(tinha ? "Você volta a ver " + (nome || "esse piloto") + "."
                  : (nome || "Esse piloto") + " silenciado — ele não sabe.");
  estPintar();
}
async function estDenunciar(m) {
  const eu = estEu(); if (!eu || !m) return;
  const chave = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const ok = await nuvemSoltar("denuncias/" + chave, {
    de: eu.id, deNome: eu.tag, sobre: m.de, sobreNome: m.nome,
    txt: String(m.txt || "").slice(0, 300), onde: estChave(EST.destino), quando: Date.now()
  });
  estAvisar(ok === null ? "Não deu para denunciar agora." : "Denunciado. O dono do jogo vai ver.");
}
/* uma mensagem só aparece se quem escreveu não estiver bloqueado nem
   silenciado. Uma regra só, num lugar só: se a tela e a lista de
   destinos perguntassem de formas diferentes, um dia divergiriam. */
function estMostraMensagem(m) {
  if (!m || !m.de) return true;
  return !EST.bloq[m.de] && !EST.mudo[m.de];
}

/* =====================================================================
   5. NÃO LIDAS
   ---------------------------------------------------------------------
   Sem abrir um fluxo por canal -- que é o que estouraria o limite de
   conexões do navegador e derrubaria as gravações do jogo.

   Quem escreve carimba o relógio em conversas/__ultimas/<destino>. Este
   lado lê esse nó pequeno de vinte em vinte segundos e compara com o que
   eu já vi. Uma conexão curta serve para TODOS os destinos de uma vez.
   ===================================================================== */
function estCarregarVistos() {
  try { EST.visto = JSON.parse(storageGet("nn_est_visto", "{}")) || {}; } catch (e) { EST.visto = {}; }
}
function estMarcarLido(d) {
  if (!d) return;
  EST.visto[estChave(d)] = Date.now();
  try { storageSet("nn_est_visto", JSON.stringify(EST.visto)); } catch (e) {}
  estSeloGeral();
}
function estNaoLidas(d) {
  const ch = estChave(d);
  const ultima = EST.ultimas[ch] || 0;
  const vi = EST.visto[ch] || 0;
  return ultima > vi ? 1 : 0;     // "tem coisa nova", não quantas
}
async function estOlharNovidades() {
  const d = await nuvemReq("conversas/__ultimas");
  if (d) EST.ultimas = d;
  const p = await nuvemReq("pilotos");
  if (p) EST.pilotos = p;
  estSeloGeral();
  if (EST.aberta) estPintar();
}
/* o selo no botão do menu: some quando não tem nada */
function estSeloGeral() {
  let n = 0;
  for (const c of EST_CANAIS) n += estNaoLidas({ tipo: "canal", id: c.id });
  for (const gid in EST.grupos) n += estNaoLidas({ tipo: "grupo", id: gid });
  try { for (const id in AM.lista) n += estNaoLidas({ tipo: "dm", id }); } catch (e) {}
  const selo = $("est-selo");
  if (selo) { selo.textContent = n || ""; selo.classList.toggle("on", n > 0); }
  return n;
}

/* onde cada piloto está agora: online, em partida ou fora */
function estOndeEsta(id) {
  const p = EST.pilotos[id];
  if (!p) return { cor: "off", txt: "fora do ar" };
  const on = Date.now() - (p.atualizado || 0) < 70000;
  if (!on) return { cor: "off", txt: "visto " + quandoTexto(p.atualizado || Date.now()) };
  const onde = String(p.onde || "");
  if (/Jogando|Arena|Cooperativo|Ranqueada|Maratona/i.test(onde))
    return { cor: "jogo", txt: "em partida" };
  return { cor: "on", txt: onde || "no jogo" };
}

/* =====================================================================
   6. GRUPOS
   ---------------------------------------------------------------------
   Um grupo é uma conversa com mais de duas pessoas e um dono. Os níveis
   são três e cabem num número: 2 dono, 1 moderador, 0 membro. Número em
   vez de lista de permissões porque hoje só existem três degraus -- e
   inventar um sistema de permissões para três degraus é construir a
   ponte antes do rio.

   Cada membro guarda o grupo na PRÓPRIA ficha (amigos/<id>/grupos/<gid>)
   porque não dá para listar "os grupos de que fulano participa" sem
   varrer todos os grupos do mundo. O nome ali é só para a barra lateral
   ter o que mostrar antes de a informação completa chegar.
   ===================================================================== */
const EST_DONO = 2, EST_MOD = 1;

async function estGruposCarregar() {
  const eu = estEu();
  if (!eu) return;
  const meus = await nuvemReqC("amigos/" + eu.id + "/grupos") || {};
  const fora = {};
  for (const gid in meus) {
    const info = await nuvemReq("conversas/grupo__" + gid + "/info");
    /* o grupo sumiu (o dono desfez) ou eu fui removido: some daqui
       também, senão a barra lateral mostra porta que não abre */
    if (!info || !info.membros || !info.membros[eu.id]) {
      nuvemSoltarC("amigos/" + eu.id + "/grupos/" + gid, null, "DELETE");
      continue;
    }
    fora[gid] = info;
  }
  EST.grupos = fora;
  estSeloGeral();
  if (EST.aberta) estPintar();
}

async function estGrupoCriar(nome, ids) {
  const eu = estEu();
  if (!eu) return null;
  nome = estFiltrar(String(nome || "").trim().slice(0, 40)) || "Grupo sem nome";
  const gid = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const membros = {};
  membros[eu.id] = { nome: eu.tag, nivel: EST_DONO };
  for (const id of (ids || [])) {
    if (id === eu.id) continue;
    const a = (AM.lista || {})[id];
    membros[id] = { nome: (a && (a.tag || a.nome)) || "Piloto", nivel: 0 };
  }
  const info = { nome, dono: eu.id, membros, criado: Date.now() };
  const ok = await nuvemSoltar("conversas/grupo__" + gid + "/info", info);
  if (ok === null) { estAvisar("Não deu para criar o grupo agora."); return null; }
  for (const id in membros) nuvemSoltarC("amigos/" + id + "/grupos/" + gid, { nome, quando: Date.now() });
  EST.grupos[gid] = info;
  estAvisar("Grupo " + nome + " criado.");
  return gid;
}

function estMeuNivel(gid) {
  const eu = estEu();
  const g = EST.grupos[gid];
  if (!eu || !g || !g.membros || !g.membros[eu.id]) return -1;
  return g.membros[eu.id].nivel || 0;
}
async function estGrupoSalvar(gid) {
  const g = EST.grupos[gid];
  if (!g) return false;
  return (await nuvemSoltar("conversas/grupo__" + gid + "/info", g)) !== null;
}
async function estGrupoRenomear(gid, nome) {
  if (estMeuNivel(gid) < EST_MOD) { estAvisar("Só o dono e os moderadores mudam o nome."); return; }
  nome = estFiltrar(String(nome || "").trim().slice(0, 40));
  if (!nome) return;
  EST.grupos[gid].nome = nome;
  await estGrupoSalvar(gid);
  for (const id in EST.grupos[gid].membros)
    nuvemSoltarC("amigos/" + id + "/grupos/" + gid, { nome, quando: Date.now() });
  if (EST.destino && EST.destino.tipo === "grupo" && EST.destino.id === gid) EST.destino.nome = nome;
  estAvisar("Agora o grupo se chama " + nome + ".");
  estPintar();
}
async function estGrupoAdicionar(gid, id) {
  if (estMeuNivel(gid) < EST_MOD) { estAvisar("Só o dono e os moderadores põem gente."); return; }
  const g = EST.grupos[gid];
  if (!g || g.membros[id]) return;
  const a = (AM.lista || {})[id];
  g.membros[id] = { nome: (a && (a.tag || a.nome)) || "Piloto", nivel: 0 };
  await estGrupoSalvar(gid);
  nuvemSoltarC("amigos/" + id + "/grupos/" + gid, { nome: g.nome, quando: Date.now() });
  estAvisar((g.membros[id].nome) + " entrou no grupo.");
  estPintar();
}
async function estGrupoRemover(gid, id) {
  const eu = estEu();
  const g = EST.grupos[gid];
  if (!g || !eu) return;
  const meu = estMeuNivel(gid);
  /* sair sozinho pode sempre; tirar os outros é coisa de moderador */
  if (id !== eu.id && meu < EST_MOD) { estAvisar("Só o dono e os moderadores tiram gente."); return; }
  if (id === g.dono && id !== eu.id) { estAvisar("O dono do grupo não pode ser tirado."); return; }
  const nome = (g.membros[id] || {}).nome || "Piloto";
  delete g.membros[id];
  nuvemSoltarC("amigos/" + id + "/grupos/" + gid, null, "DELETE");
  /* grupo sem ninguém não precisa existir */
  if (!Object.keys(g.membros).length) {
    await nuvemSoltar("conversas/grupo__" + gid, null, "DELETE");
    delete EST.grupos[gid];
  } else {
    /* saiu o dono: o cargo passa para alguém, senão o grupo fica sem
       quem mande e ninguém consegue mais renomear nem convidar */
    if (id === g.dono) {
      const proximo = Object.keys(g.membros).sort((a, b) =>
        (g.membros[b].nivel || 0) - (g.membros[a].nivel || 0))[0];
      g.dono = proximo;
      g.membros[proximo].nivel = EST_DONO;
    }
    await estGrupoSalvar(gid);
  }
  if (id === eu.id) {
    delete EST.grupos[gid];
    if (EST.destino && EST.destino.tipo === "grupo" && EST.destino.id === gid)
      estAbrir({ tipo: "canal", id: "geral", nome: "geral" });
    estAvisar("Você saiu do grupo.");
  } else estAvisar(nome + " saiu do grupo.");
  estPintar();
}
async function estGrupoPromover(gid, id) {
  const g = EST.grupos[gid];
  if (!g || estMeuNivel(gid) < EST_DONO) { estAvisar("Só o dono promove moderador."); return; }
  if (!g.membros[id] || id === g.dono) return;
  const virou = (g.membros[id].nivel || 0) < EST_MOD;
  g.membros[id].nivel = virou ? EST_MOD : 0;
  await estGrupoSalvar(gid);
  estAvisar(g.membros[id].nome + (virou ? " virou moderador." : " deixou de ser moderador."));
  estPintar();
}

/* =====================================================================
   7. A TELA
   ---------------------------------------------------------------------
   Três colunas no computador, uma de cada vez no celular: a barra dos
   destinos, a conversa, e (quando é grupo) quem está dentro.

   A ESTAÇÃO NÃO É UMA TELA DO JOGO -- é uma cortina por cima. Ela não
   mexe no S.mode nem chama showScreen(), e é isso que deixa abrir no
   meio de uma partida sem pausar nada: o jogo continua desenhando atrás.
   ===================================================================== */
function estAvisar(txt) {
  const el = $("est-aviso");
  if (!el) return;
  el.textContent = txt || "";
  el.classList.toggle("on", !!txt);
  clearTimeout(estAvisar._t);
  estAvisar._t = setTimeout(() => el.classList.remove("on"), 3500);
}

function estHora(t) {
  const d = new Date(t || Date.now());
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}
function estDia(t) {
  const d = new Date(t || Date.now()), h = new Date();
  const mesmo = d.toDateString() === h.toDateString();
  if (mesmo) return "hoje";
  const onte = new Date(h.getTime() - 86400000);
  if (d.toDateString() === onte.toDateString()) return "ontem";
  return d.toLocaleDateString("pt-BR");
}

/* @fulano vira destaque, e o meu nome acende.
   Escapa PRIMEIRO e só então põe as marcas: fazer ao contrário deixaria
   o texto de um estranho virar HTML dentro da minha tela. */
function estTextoComMencoes(txt, eu) {
  let s = escaparTexto(String(txt || ""));
  s = s.replace(/@([A-Za-z0-9_À-ÿ]{2,20})/g, (todo, nome) => {
    const meu = eu && (nickSimples(nome) === nickSimples(eu.tag) ||
                       nickSimples(nome) === nickSimples(eu.nick));
    return '<b class="est-mencao' + (meu ? " eu" : "") + '">@' + nome + "</b>";
  });
  return s;
}
function estMeChamou(m, eu) {
  if (!eu || !m || !m.txt) return false;
  const re = /@([A-Za-z0-9_À-ÿ]{2,20})/g;
  let g;
  while ((g = re.exec(m.txt))) {
    if (nickSimples(g[1]) === nickSimples(eu.tag) || nickSimples(g[1]) === nickSimples(eu.nick))
      return true;
  }
  return false;
}

/* ---------- a barra dos destinos ---------- */
function estPintarLado() {
  const cx = $("est-lado");
  if (!cx) return;
  const eu = estEu();
  const linha = (d, nome, sub, ic, extra) => {
    const nova = estNaoLidas(d);
    const aqui = estMesmoDestino(EST.destino, d);
    return '<button class="est-dest' + (aqui ? " on" : "") + (nova ? " nova" : "") +
      (extra || "") + '" data-dest="' + d.tipo + "|" + d.id + '">' +
      '<b class="est-dest-ic">' + ic + "</b>" +
      '<span class="est-dest-txt"><strong>' + escaparTexto(nome) + "</strong>" +
      (sub ? "<em>" + escaparTexto(sub) + "</em>" : "") + "</span>" +
      (nova ? '<i class="est-pip"></i>' : "") + "</button>";
  };

  let h = '<div class="est-serv"><b>' + escaparTexto(EST_SERVIDOR.nome.slice(0, 2)) + "</b>" +
          "<span><strong>" + escaparTexto(EST_SERVIDOR.nome) + "</strong>" +
          "<em>" + escaparTexto(EST_SERVIDOR.sobre) + "</em></span></div>";

  h += '<div class="est-grupo-h">CANAIS DE TEXTO</div>';
  for (const c of EST_CANAIS)
    h += linha({ tipo: "canal", id: c.id }, c.nome, c.sobre, "#");

  /* AS SALAS DE VOZ APARECEM DESLIGADAS, e isso é de propósito: some-las
     esconderia que elas vêm aí, e fingir que funcionam seria pior. */
  h += '<div class="est-grupo-h">SALAS DE VOZ <i>em breve</i></div>';
  for (const v of EST_VOZ)
    h += '<button class="est-dest voz" data-voz="' + v.id + '"><b class="est-dest-ic">🔊</b>' +
         '<span class="est-dest-txt"><strong>' + escaparTexto(v.nome) + "</strong>" +
         "<em>até " + v.limite + " pilotos</em></span></button>";

  const gids = Object.keys(EST.grupos);
  h += '<div class="est-grupo-h">MEUS GRUPOS' +
       '<button class="est-mais" id="est-novo-grupo" aria-label="Criar grupo">+</button></div>';
  if (!gids.length) h += '<p class="est-vazio-lado">Nenhum grupo ainda. Toque no + e chame a galera.</p>';
  for (const gid of gids) {
    const g = EST.grupos[gid];
    const n = Object.keys(g.membros || {}).length;
    h += linha({ tipo: "grupo", id: gid }, g.nome, n + (n === 1 ? " pessoa" : " pessoas"), "◈");
  }

  h += '<div class="est-grupo-h">CONVERSAS' +
       '<button class="est-mais" id="est-novo-amigo" aria-label="Adicionar amigo">+</button></div>';
  const amigos = Object.keys((typeof AM !== "undefined" && AM.lista) || {});
  if (!amigos.length) h += '<p class="est-vazio-lado">Você ainda não tem amigos aqui. Toque no + para chamar alguém pelo nick.</p>';
  /* online primeiro: é com quem dá para falar agora */
  amigos.sort((a, b) => {
    const pa = estOndeEsta(a).cor === "off" ? 1 : 0, pb = estOndeEsta(b).cor === "off" ? 1 : 0;
    return pa - pb;
  });
  for (const id of amigos) {
    const a = AM.lista[id];
    const onde = estOndeEsta(id);
    h += linha({ tipo: "dm", id }, a.tag || a.nome, onde.txt,
               '<i class="est-luz ' + onde.cor + '"></i>' + estIni(a.tag || a.nome),
               EST.bloq[id] ? " bloqueado" : "");
  }

  const ped = Object.keys((typeof AM !== "undefined" && AM.pedidos) || {}).length;
  if (ped) h += '<button class="est-pedidos" id="est-ver-pedidos">' + ped +
                (ped === 1 ? " pedido de amizade" : " pedidos de amizade") + " ›</button>";

  cx.innerHTML = h;
  cx.querySelectorAll("[data-dest]").forEach(b =>
    b.addEventListener("click", () => {
      const [tipo, id] = b.getAttribute("data-dest").split("|");
      const nome = b.querySelector("strong").textContent;
      estAbrir({ tipo, id, nome });
      $("estacao").classList.remove("lado-aberto");
    }));
  cx.querySelectorAll("[data-voz]").forEach(b =>
    b.addEventListener("click", () => estVozEntrar(b.getAttribute("data-voz"))));
  const ng = $("est-novo-grupo");
  if (ng) ng.addEventListener("click", e => { e.stopPropagation(); estAbrirCriarGrupo(); });
  const na = $("est-novo-amigo");
  if (na) na.addEventListener("click", e => { e.stopPropagation(); estAbrirAdicionar(); });
  const vp = $("est-ver-pedidos");
  if (vp) vp.addEventListener("click", () => estAbrirPedidos());
}

/* ---------- a conversa ---------- */
function estPintarConversa(grudarNoFim) {
  const lista = $("est-msgs"), cab = $("est-cab");
  if (!lista || !cab) return;
  const eu = estEu();
  const d = EST.destino;

  if (!d) {
    cab.innerHTML = "";
    lista.innerHTML = '<div class="est-vazio"><b>💬</b>Escolha um canal para começar.</div>';
    return;
  }

  /* cabeçalho: quem é, e o que dá para fazer aqui */
  let sub = "", acoes = "";
  if (d.tipo === "canal") {
    const c = EST_CANAIS.filter(x => x.id === d.id)[0];
    sub = c ? c.sobre : "";
  } else if (d.tipo === "dm") {
    const onde = estOndeEsta(d.id);
    sub = onde.txt;
    acoes = '<button class="est-cab-b" data-acao="bloquear">' +
            (EST.bloq[d.id] ? "desbloquear" : "bloquear") + "</button>" +
            '<button class="est-cab-b" data-acao="silenciar">' +
            (EST.mudo[d.id] ? "ouvir" : "silenciar") + "</button>";
  } else if (d.tipo === "grupo") {
    const g = EST.grupos[d.id];
    const n = g ? Object.keys(g.membros || {}).length : 0;
    sub = n + (n === 1 ? " pessoa" : " pessoas");
    acoes = '<button class="est-cab-b" data-acao="membros">quem está</button>';
    if (estMeuNivel(d.id) >= EST_MOD)
      acoes += '<button class="est-cab-b" data-acao="renomear">renomear</button>';
    acoes += '<button class="est-cab-b sai" data-acao="sair">sair</button>';
  }
  cab.innerHTML =
    '<button class="est-abrir-lado" id="est-abrir-lado" aria-label="Ver os canais">☰</button>' +
    '<div class="est-cab-txt"><strong>' + (d.tipo === "canal" ? "#" : "") +
    escaparTexto(d.nome || d.id) + "</strong><em>" + escaparTexto(sub) + "</em></div>" +
    '<div class="est-cab-acoes">' + acoes + "</div>";
  const al = $("est-abrir-lado");
  if (al) al.addEventListener("click", () => $("estacao").classList.toggle("lado-aberto"));
  cab.querySelectorAll("[data-acao]").forEach(b =>
    b.addEventListener("click", () => estAcaoDoCabecalho(b.getAttribute("data-acao"))));

  /* as mensagens */
  const perto = lista.scrollHeight - lista.scrollTop - lista.clientHeight < 90;
  const visiveis = EST.msgs.filter(estMostraMensagem);
  let h = "";
  if (EST.carregando) h += '<div class="est-carregando">carregando…</div>';
  else if (!EST.fim && EST.msgs.length)
    h += '<button class="est-mais-msg" id="est-mais-msg">ver o que veio antes</button>';
  else if (EST.fim && EST.msgs.length)
    h += '<div class="est-comeco">— aqui começa —</div>';

  if (!visiveis.length && !EST.carregando) {
    h += '<div class="est-vazio"><b>👋</b>' +
         (EST.msgs.length ? "Tudo aqui é de gente que você silenciou."
                          : "Ninguém falou nada ainda. Começa você.") + "</div>";
  }

  let diaAnterior = "", anterior = null;
  for (const m of visiveis) {
    const dia = estDia(m.quando);
    if (dia !== diaAnterior) {
      h += '<div class="est-dia"><span>' + escaparTexto(dia) + "</span></div>";
      diaAnterior = dia;
      anterior = null;
    }
    const meu = eu && m.de === eu.id;
    /* mensagens seguidas da mesma pessoa em menos de 5 min não repetem o
       nome nem o avatar: é o que deixa a conversa parecer conversa */
    const colado = anterior && anterior.de === m.de && (m.quando - anterior.quando) < 300000;
    const chamou = estMeChamou(m, eu);
    h += '<div class="est-msg' + (meu ? " meu" : "") + (colado ? " colado" : "") +
         (chamou ? " chamou" : "") + (m.indo ? " indo" : "") + '" data-k="' + m.k + '">';
    if (!colado) {
      h += '<span class="est-av' + (m.mold ? " moldurado mold-" + escaparTexto(m.mold) : "") + '">' +
           escaparTexto(estIni(m.nome)) + "</span>";
      h += '<div class="est-corpo"><div class="est-linha1">' +
           '<b class="est-nome">' + escaparTexto(m.nome || "Piloto") + "</b>" +
           '<span class="est-hora">' + estHora(m.quando) + "</span></div>";
    } else {
      h += '<span class="est-av vazio"></span><div class="est-corpo">';
    }
    h += '<div class="est-txt">' + estTextoComMencoes(m.txt, eu) + "</div></div>";
    if (!meu) h += '<button class="est-msg-b" data-menu="' + m.k + '" aria-label="Opções">⋯</button>';
    h += "</div>";
    anterior = m;
  }
  lista.innerHTML = h;

  const mm = $("est-mais-msg");
  if (mm) mm.addEventListener("click", estMais);
  lista.querySelectorAll("[data-menu]").forEach(b =>
    b.addEventListener("click", e => {
      e.stopPropagation();
      estMenuDaMensagem(b.getAttribute("data-menu"), b);
    }));

  if (grudarNoFim || perto) lista.scrollTop = lista.scrollHeight;
}

/* rolar até em cima carrega o que veio antes, sem botão */
function estLigarRolagem() {
  const lista = $("est-msgs");
  if (!lista || lista.__ligado) return;
  lista.__ligado = true;
  lista.addEventListener("scroll", () => {
    if (lista.scrollTop < 40) estMais();
  });
}

function estPintar(grudarNoFim) {
  if (!EST.aberta) return;
  estPintarLado();
  estPintarConversa(grudarNoFim);
  estLigarRolagem();
}

/* ---------- as janelinhas ---------- */
function estJanela(titulo, corpoHTML, aoMontar) {
  const cx = $("est-janela");
  if (!cx) return;
  cx.innerHTML =
    '<div class="est-jan-cx"><div class="est-jan-h">' + escaparTexto(titulo) +
    '<button class="est-jan-x" id="est-jan-x" aria-label="Fechar">✕</button></div>' +
    '<div class="est-jan-corpo">' + corpoHTML + "</div></div>";
  cx.classList.add("on");
  $("est-jan-x").addEventListener("click", estFecharJanela);
  cx.addEventListener("click", e => { if (e.target === cx) estFecharJanela(); });
  if (aoMontar) aoMontar(cx);
}
function estFecharJanela() {
  const cx = $("est-janela");
  if (cx) { cx.classList.remove("on"); cx.innerHTML = ""; }
}

/* criar grupo: escolhe amigos da lista e dá um nome */
function estAbrirCriarGrupo() {
  const amigos = Object.keys((AM.lista) || {});
  if (!amigos.length) {
    estJanela("Criar grupo", '<p class="est-nota">Você precisa de pelo menos um amigo para montar um grupo. ' +
      "Use o <b>+</b> em CONVERSAS para chamar alguém pelo nick.</p>");
    return;
  }
  estJanela("Criar grupo",
    '<input id="est-gnome" maxlength="40" placeholder="Nome do grupo" autocomplete="off">' +
    '<p class="est-nota">Escolha quem entra:</p><div class="est-escolha" id="est-gmembros">' +
    amigos.map(id => {
      const a = AM.lista[id];
      return '<label class="est-pessoa"><input type="checkbox" value="' + id + '">' +
        '<span class="est-av pequeno">' + escaparTexto(estIni(a.tag || a.nome)) + "</span>" +
        "<b>" + escaparTexto(a.tag || a.nome) + "</b></label>";
    }).join("") + "</div>" +
    '<button class="est-jan-ok" id="est-gcriar">CRIAR GRUPO</button>',
    () => {
      $("est-gcriar").addEventListener("click", async () => {
        const nome = $("est-gnome").value;
        const ids = [...document.querySelectorAll("#est-gmembros input:checked")].map(x => x.value);
        if (!ids.length) { estAvisar("Escolha pelo menos uma pessoa."); return; }
        const gid = await estGrupoCriar(nome, ids);
        estFecharJanela();
        if (gid) estAbrir({ tipo: "grupo", id: gid, nome: EST.grupos[gid].nome });
      });
    });
}

/* adicionar amigo: usa o mesmo caminho da tela de amigos, de propósito --
   duas formas de pedir amizade seriam duas formas de dar errado */
function estAbrirAdicionar() {
  estJanela("Chamar alguém",
    '<p class="est-nota">Escreva o nick do piloto, do jeito que ele aparece no jogo.</p>' +
    '<input id="est-anome" maxlength="20" placeholder="Nick do piloto" autocomplete="off">' +
    '<button class="est-jan-ok" id="est-aenviar">MANDAR PEDIDO</button>' +
    '<p class="est-nota" id="est-aresp"></p>',
    () => {
      const manda = async () => {
        const r = await amigoPedir($("est-anome").value);
        const el = $("est-aresp");
        if (el) el.textContent = (r && r.msg) || (r && r.ok ? "Pedido enviado." : "Não deu.");
        if (r && r.ok) { await amigosCarregar(); estPintar(); }
      };
      $("est-aenviar").addEventListener("click", manda);
      $("est-anome").addEventListener("keydown", e => { if (e.key === "Enter") manda(); });
    });
}

/* pedidos de amizade, sem sair da estação */
function estAbrirPedidos() {
  const ids = Object.keys((AM.pedidos) || {});
  estJanela("Pedidos de amizade",
    ids.length
      ? ids.map(id => {
          const a = AM.pedidos[id];
          return '<div class="est-pedido"><span class="est-av pequeno">' +
            escaparTexto(estIni(a.tag || a.nome)) + "</span>" +
            "<b>" + escaparTexto(a.tag || a.nome) + "</b>" +
            '<button class="est-sim" data-sim="' + id + '">aceitar</button>' +
            '<button class="est-nao" data-nao="' + id + '">recusar</button></div>';
        }).join("")
      : '<p class="est-nota">Nenhum pedido agora.</p>',
    cx => {
      cx.querySelectorAll("[data-sim]").forEach(b => b.addEventListener("click", async () => {
        await amigoAceitar(b.getAttribute("data-sim"));
        await amigosCarregar(); estFecharJanela(); estPintar();
      }));
      cx.querySelectorAll("[data-nao]").forEach(b => b.addEventListener("click", async () => {
        await amigoRecusar(b.getAttribute("data-nao"));
        await amigosCarregar(); estFecharJanela(); estPintar();
      }));
    });
}

/* quem está no grupo, e o que dá para fazer com cada um */
function estAbrirMembros(gid) {
  const g = EST.grupos[gid];
  if (!g) return;
  const meu = estMeuNivel(gid);
  const eu = estEu();
  const cargos = { 2: "dono", 1: "moderador", 0: "" };
  const amigosDeFora = Object.keys(AM.lista || {}).filter(id => !g.membros[id]);
  estJanela("Quem está em " + g.nome,
    Object.keys(g.membros).map(id => {
      const m = g.membros[id];
      const onde = estOndeEsta(id);
      return '<div class="est-pedido"><span class="est-av pequeno"><i class="est-luz ' + onde.cor +
        '"></i>' + escaparTexto(estIni(m.nome)) + "</span>" +
        "<b>" + escaparTexto(m.nome) + (cargos[m.nivel || 0] ? ' <em class="est-cargo">' +
        cargos[m.nivel || 0] + "</em>" : "") + "</b>" +
        (meu >= EST_DONO && id !== g.dono
          ? '<button class="est-sim" data-prom="' + id + '">' +
            ((m.nivel || 0) >= EST_MOD ? "rebaixar" : "promover") + "</button>" : "") +
        (meu >= EST_MOD && id !== g.dono && id !== (eu && eu.id)
          ? '<button class="est-nao" data-tira="' + id + '">tirar</button>' : "") +
        "</div>";
    }).join("") +
    (meu >= EST_MOD && amigosDeFora.length
      ? '<p class="est-nota">Chamar mais gente:</p><div class="est-escolha">' +
        amigosDeFora.map(id => '<button class="est-chamar" data-add="' + id + '">+ ' +
          escaparTexto((AM.lista[id].tag || AM.lista[id].nome)) + "</button>").join("") + "</div>"
      : ""),
    cx => {
      cx.querySelectorAll("[data-prom]").forEach(b => b.addEventListener("click", async () => {
        await estGrupoPromover(gid, b.getAttribute("data-prom")); estAbrirMembros(gid);
      }));
      cx.querySelectorAll("[data-tira]").forEach(b => b.addEventListener("click", async () => {
        await estGrupoRemover(gid, b.getAttribute("data-tira")); estAbrirMembros(gid);
      }));
      cx.querySelectorAll("[data-add]").forEach(b => b.addEventListener("click", async () => {
        await estGrupoAdicionar(gid, b.getAttribute("data-add")); estAbrirMembros(gid);
      }));
    });
}

function estAcaoDoCabecalho(acao) {
  const d = EST.destino;
  if (!d) return;
  if (acao === "bloquear") estBloquear(d.id, d.nome);
  else if (acao === "silenciar") estSilenciar(d.id, d.nome);
  else if (acao === "membros") estAbrirMembros(d.id);
  else if (acao === "renomear") {
    estJanela("Renomear grupo",
      '<input id="est-rnome" maxlength="40" value="' + escaparTexto(d.nome) + '" autocomplete="off">' +
      '<button class="est-jan-ok" id="est-rok">SALVAR</button>',
      () => $("est-rok").addEventListener("click", async () => {
        await estGrupoRenomear(d.id, $("est-rnome").value);
        estFecharJanela();
      }));
  } else if (acao === "sair") {
    const eu = estEu();
    estJanela("Sair do grupo",
      '<p class="est-nota">Você sai de <b>' + escaparTexto(d.nome) +
      "</b> e para de receber as mensagens. Dá para voltar se alguém te chamar de novo.</p>" +
      '<button class="est-jan-ok perigo" id="est-sok">SAIR DO GRUPO</button>',
      () => $("est-sok").addEventListener("click", async () => {
        await estGrupoRemover(d.id, eu.id);
        estFecharJanela();
      }));
  }
}

/* o menu de uma mensagem: responder, silenciar, bloquear, denunciar */
function estMenuDaMensagem(k, botao) {
  const m = EST.msgs.filter(x => x.k === k)[0];
  if (!m) return;
  estJanela(m.nome || "Piloto",
    '<p class="est-citado">' + escaparTexto(String(m.txt).slice(0, 160)) + "</p>" +
    '<button class="est-jan-ok" data-m="responder">responder chamando @' +
      escaparTexto(m.nome || "") + "</button>" +
    '<button class="est-jan-ok" data-m="silenciar">' +
      (EST.mudo[m.de] ? "voltar a ver" : "silenciar") + " " + escaparTexto(m.nome || "") + "</button>" +
    '<button class="est-jan-ok" data-m="bloquear">' +
      (EST.bloq[m.de] ? "desbloquear" : "bloquear") + "</button>" +
    '<button class="est-jan-ok perigo" data-m="denunciar">denunciar esta mensagem</button>',
    cx => cx.querySelectorAll("[data-m]").forEach(b => b.addEventListener("click", async () => {
      const q = b.getAttribute("data-m");
      if (q === "responder") {
        const campo = $("est-campo");
        campo.value = "@" + (m.nome || "") + " " + campo.value;
        campo.focus();
      } else if (q === "silenciar") estSilenciar(m.de, m.nome);
      else if (q === "bloquear") estBloquear(m.de, m.nome);
      else if (q === "denunciar") await estDenunciar(m);
      estFecharJanela();
    })));
}

/* =====================================================================
   8. VOZ — o encaixe, ainda sem a chamada
   ---------------------------------------------------------------------
   O que já existe: a lista de salas, o lugar delas na barra, o estado
   (em que sala estou, quem está dentro, meu microfone, meu fone) e o
   caminho na nuvem onde a presença vai morar.

   O que falta: pedir o microfone ao navegador e ligar as pontas com
   WebRTC, trocando as ofertas por conversas/voz__<sala>/sinais. Quando
   isso chegar, só esta função muda -- a barra lateral, os não lidos e a
   conta de fluxos continuam iguais.
   ===================================================================== */
function estVozCaminho(sala) { return "conversas/voz__" + sala; }
function estVozEntrar(sala) {
  const v = EST_VOZ.filter(x => x.id === sala)[0];
  estAvisar("A sala " + (v ? v.nome : sala) + " ainda não abriu — a voz vem numa próxima versão.");
}
function estVozSair() { EST.voz.sala = null; EST.voz.dentro = {}; }

/* =====================================================================
   ABRIR, FECHAR E LIGAR
   ---------------------------------------------------------------------
   A estação abre por cima do jogo e NÃO mexe no S.mode: numa partida o
   jogo continua rodando atrás. Fecha no ✕, no Esc, e abre/fecha na tecla
   C -- menos, é claro, quando o dedo está escrevendo alguma coisa.
   ===================================================================== */
function estacaoAbrir(destino) {
  const cx = $("estacao");
  if (!cx) return;
  const eu = estEu();
  if (!eu) { estAvisar("Entre com um piloto primeiro."); return; }
  EST.aberta = true;
  cx.classList.add("on");
  estCarregarVistos();
  estCarregarModeracao();
  try { AudioSys.resume(); } catch (e) {}

  /* a batida que mantém online e não lidos em dia. UMA, e só enquanto a
     estação está aberta: relógio rodando com a cortina fechada é bateria
     do celular indo embora à toa. */
  if (EST.relogio) clearInterval(EST.relogio);
  EST.relogio = setInterval(estOlharNovidades, 20000);
  estOlharNovidades();
  amigosCarregar().then(() => estPintar());
  estGruposCarregar();

  estPintar();
  estAbrir(destino || EST.destino || { tipo: "canal", id: "geral", nome: "geral" });
}
function estacaoFechar() {
  const cx = $("estacao");
  if (!cx) return;
  EST.aberta = false;
  cx.classList.remove("on");
  cx.classList.remove("lado-aberto");
  estFecharJanela();
  /* o fluxo FECHA ao sair. É o que devolve a conexão para o resto do
     jogo -- deixar aberto com a cortina fechada é exatamente o erro que
     já travou as gravações uma vez. */
  estDesligarFluxo();
  if (EST.relogio) { clearInterval(EST.relogio); EST.relogio = null; }
}
function estacaoAlternar() {
  if (EST.aberta) estacaoFechar(); else estacaoAbrir();
}

(function ligarEstacao() {
  const abrir = $("btn-estacao");
  if (abrir) abrir.addEventListener("click", () => estacaoAbrir());
  const x = $("est-fechar");
  if (x) x.addEventListener("click", estacaoFechar);
  const flutua = $("est-flutua");
  if (flutua) flutua.addEventListener("click", () => estacaoAbrir());

  const campo = $("est-campo"), manda = $("est-enviar");
  const enviar = async () => {
    const t = campo.value;
    campo.value = "";
    const ok = await estEnviar(t);
    if (!ok) campo.value = t;       // deu errado: devolve o que a pessoa escreveu
    campo.focus();
  };
  if (manda) manda.addEventListener("click", enviar);
  if (campo) campo.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); }
  });

  /* os emojis: uma mãozinha, não um teclado inteiro */
  const bt = $("est-emoji"), cx = $("est-emojis");
  const EMOJIS = ["😂","🔥","👍","❤️","😮","😢","😡","🎉","🚀","👾","⭐","💎",
                  "🛸","⚔️","🏆","😎","🤝","👀","💀","🤔","🙏","✨","🎯","🤣"];
  if (bt && cx) {
    cx.innerHTML = EMOJIS.map(e => '<button data-e="' + e + '">' + e + "</button>").join("");
    bt.addEventListener("click", e => { e.stopPropagation(); cx.classList.toggle("on"); });
    cx.querySelectorAll("[data-e]").forEach(b => b.addEventListener("click", () => {
      campo.value += b.getAttribute("data-e");
      cx.classList.remove("on");
      campo.focus();
    }));
    document.addEventListener("click", ev => {
      if (cx.classList.contains("on") && !cx.contains(ev.target) && ev.target !== bt)
        cx.classList.remove("on");
    });
  }

  addEventListener("keydown", e => {
    const escrevendo = document.activeElement &&
      /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
    if (e.key === "Escape" && EST.aberta) {
      if ($("est-janela").classList.contains("on")) estFecharJanela();
      else estacaoFechar();
      return;
    }
    if (escrevendo) return;
    if (e.key === "c" || e.key === "C") { estacaoAlternar(); e.preventDefault(); }
  });
})();

/* o selo do menu precisa de um número mesmo com a estação fechada: uma
   olhada devagar (dois minutos) basta, e não pesa. */
setInterval(() => { if (!EST.aberta && nuvemAtiva()) estOlharNovidades(); }, 120000);
setTimeout(() => { try { estCarregarVistos(); estOlharNovidades(); estGruposCarregar(); } catch (e) {} }, 4000);
