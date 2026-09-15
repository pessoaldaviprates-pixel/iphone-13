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
  busca: ""                 // o que está escrito na busca da barra
  /* a voz tem estado próprio (VOZ, em 09-voz.js): guardar uma cópia
     dela aqui só criaria dois lugares para a mesma verdade, e um deles
     ficaria desatualizado */
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
  /* canal de servidor: as mensagens ficam em conversas/, que é galho
     velho e liberado. Só o servidor em si mora no galho novo. */
  if (d.tipo === "srv" && d.canal) return srvSalaDoCanal(d.id, d.canal);
  return null;              // amigos e voz não são conversa: não têm caminho
}
/* a etiqueta curta que serve de chave dos não lidos e do localStorage */
function estChave(d) {
  if (!d) return "";
  return d.tipo === "srv" ? "srv:" + d.id + ":" + (d.canal || "") : d.tipo + ":" + d.id;
}

function estMesmoDestino(a, b) {
  return !!a && !!b && a.tipo === b.tipo && String(a.id) === String(b.id) &&
         String(a.canal || "") === String(b.canal || "");
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
    /* tipo/enq/ev/votos são o que faz uma enquete ou um evento serem
       mais que um texto. Vêm pelo MESMO fluxo das mensagens — inclusive
       os votos, que ficam pendurados na própria mensagem justamente
       para não precisarem de um segundo fluxo. */
    arr.push({ k, de: m.de, nome: m.nome, txt: m.txt, quando: m.quando || 0, mold: m.mold,
               tipo: m.tipo, enq: m.enq, ev: m.ev, votos: m.votos, cham: m.cham });
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

/* =====================================================================
   JUNTAR O QUE ESTÁ NA TELA COM O QUE A NUVEM ACABOU DE MANDAR
   ---------------------------------------------------------------------
   A releitura traz só as últimas 40 mensagens. Juntar isso com o que já
   está na tela tem três regras, e cada uma existe por um estrago:

   1. O QUE É MAIS VELHO QUE A RESPOSTA FICA. Quem rolou para cima
      carregou mensagens que a releitura nem tenta trazer; jogá-las fora
      apagaria o que a pessoa está lendo.

   2. O QUE ESTÁ A CAMINHO FICA. A minha mensagem aparece na tela antes
      de a nuvem responder. Uma releitura no meio disso a apagaria na
      cara de quem acabou de escrever.

   3. O QUE É MAIS NOVO QUE A RESPOSTA FICA. Esta é a que faltava, e a
      que mais doeu: a leitura SAI antes da minha gravação e VOLTA
      depois dela. Nessa janela a minha mensagem já não é "a caminho"
      (a nuvem respondeu OK) e ainda não está na resposta que estava no
      ar -- então ela aparecia e sumia sozinha um instante depois.
      Era isso que fazia a enquete recém-criada desaparecer entre um
      voto e outro.

   Se uma mensagem tiver sido apagada de verdade, a releitura seguinte
   traz a lista sem ela e aí sim ela sai: segurar por uma rodada é
   barato, perder o que a pessoa escreveu não é.

   Está numa função com nome, e não solta dentro do fluxo, porque é uma
   REGRA -- e regra dá para testar sem precisar reproduzir uma corrida.
   ===================================================================== */
function estJuntarMensagens(atuais, novas) {
  atuais = atuais || [];
  novas = novas || [];
  const chegou = {};
  for (const n of novas) chegou[n.k] = 1;
  const primeira = novas.length ? novas[0].k : "";
  const ultima = novas.length ? novas[novas.length - 1].k : "";
  const velhas = atuais.filter(m => !chegou[m.k] && (!novas.length || m.k < primeira));
  const recentes = atuais.filter(m => !chegou[m.k] &&
                                      (m.indo || !ultima || m.k > ultima));
  return velhas.concat(novas, recentes);
}

async function estAbrir(d) {
  if (!d) return;
  const eu = estEu();
  if (!eu) { estAvisar("Entre com um piloto para conversar."); return; }

  estDesligarFluxo();
  /* a tela de amigos não é conversa: não tem mensagem para ouvir, então
     não gasta o único fluxo que temos */
  if (d.tipo === "amigos" || d.tipo === "dms") {
    EST.destino = d;
    EST.msgs = [];
    await amigosCarregar();
    estOlharNovidades();
    if (d.tipo === "dms") await estLerPreviasDM();
    estPintar();
    return;
  }
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
    /* VOTO NÃO É MENSAGEM NOVA. Comparar só a quantidade e a última
       chave bastava enquanto tudo o que chegava era mensagem — mas o
       voto de uma enquete muda uma mensagem que já estava aqui, sem
       mudar nem o total nem a última. A enquete ficava parada na tela
       de quem não votou, e só destravava quando alguém falasse. */
    const impressao = a => a.map(m => m.k + ":" +
      (m.votos ? Object.keys(m.votos).sort().join("|") + "=" +
                 Object.keys(m.votos).sort().map(u => m.votos[u]).join("|") : "") +
      (m.enq && m.enq.ate ? ":" + m.enq.ate : "")).join(",");
    const daquiParaTras = EST.msgs.slice(-novas.length || -1);
    if (impressao(novas) === impressao(daquiParaTras)) return;
    EST.msgs = estJuntarMensagens(EST.msgs, novas);
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
  /* quanto dá para escrever depende do nível: é um dos benefícios */
  let teto = 300;
  try { teto = perfilLimiteMsg(); } catch (e) {}
  texto = String(texto || "").trim().slice(0, teto);
  if (!texto) return false;

  const veredito = estPodeFalar(texto);
  if (!veredito.ok) { estAvisar(veredito.motivo); return false; }
  texto = veredito.texto;

  /* CHAMAR TODO MUNDO É ALARME, E ALARME TEM DONO.
     Se a pessoa não pode, o jogo recusa a mensagem inteira em vez de
     mandar sem o chamado: escrever "@everyone o treino é agora" e sair
     achando que avisou o servidor, sem ter avisado ninguém, é pior do
     que ouvir que não pode. */
  try {
    const q = socialChamadoNoTexto(texto);
    if (q && !socialPodeChamar(d)) {
      estAvisar("Você não pode chamar todo mundo aqui. Tire o @" + q + " para enviar.");
      return false;
    }
  } catch (e) {}

  return estEnviarCartao(texto, null);
}

/* MANDAR UMA MENSAGEM QUE NÃO É SÓ TEXTO.
   Enquete e evento passam por aqui com um "extra" — o resto do caminho
   (aparecer na hora, gravar, podar, marcar lido) é o mesmo, e tem que
   continuar sendo: dois caminhos de envio virariam dois jeitos de
   errar. */
async function estEnviarCartao(texto, extra) {
  const eu = estEu();
  const d = EST.destino;
  if (!eu || !d) return false;
  const cam = estCaminho(d);
  if (!cam) return false;
  const chave = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const msg = Object.assign({ de: eu.id, nome: eu.tag, txt: texto,
                              quando: Date.now(), mold: eu.mold }, extra || {});

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
  /* O CASTIGO VEM ANTES DE TUDO. Antes do ritmo, antes do palavrão: de
     castigo a pessoa não fala, e dizer o motivo certo importa -- levar
     "calma, respira" quando o problema é outro faz a pessoa tentar de
     novo em vez de entender. */
  try {
    const barra = castigoBarraFalar();
    if (barra) return { ok: false, motivo: barra };
  } catch (e) {}
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
  /* a agenda pega carona nesta mesma batida: um evento que ninguém
     lembra de olhar não serve para nada, e abrir uma conexão só para
     lembrar dele seria gastar o que não temos */
  try { await evCarregar(); evLembrar(); } catch (e) {}
  estSeloGeral();
  if (EST.aberta) estPintar();
}
/* o selo no botão do menu: some quando não tem nada */
function estSeloGeral() {
  let n = 0;
  /* o que foi silenciado não entra na conta, e NÃO PERTURBE zera tudo:
     um número vermelho piscando é exatamente o tipo de interrupção que
     essas duas coisas existem para evitar */
  const conta = d => (podeIncomodar(estChave(d)) ? estNaoLidas(d) : 0);
  for (const c of EST_CANAIS) n += conta({ tipo: "canal", id: c.id });
  for (const gid in EST.grupos) n += conta({ tipo: "grupo", id: gid });
  try { for (const id in AM.lista) n += conta({ tipo: "dm", id }); } catch (e) {}
  const selo = $("est-selo");
  if (selo) { selo.textContent = n || ""; selo.classList.toggle("on", n > 0); }
  return n;
}

/* onde cada piloto está agora: online, em partida ou fora */
function estOndeEsta(id) {
  const eu = estEu();
  /* EU sei de mim na hora; a nuvem só é relida de 20 em 20 segundos, e
     trocar o próprio estado e não ver nada mudar parece defeito */
  if (eu && id === eu.id) {
    const agora = presencaAgora();
    const r = recadoMeu();
    const inf = presencaInfo(agora);
    return { cor: agora === "invisivel" ? "off" : agora, ic: inf.ic,
             cel: matchMedia("(max-width: 780px)").matches,
             txt: r ? ((r.emoji ? r.emoji + " " : "") + r.txt)
                    : (agora === "invisivel" ? "invisível (só você vê)" : inf.nome) };
  }
  const p = EST.pilotos[id];
  if (!p) return { cor: "off", txt: "fora do ar" };
  const on = Date.now() - (p.atualizado || 0) < 70000;
  if (!on) return { cor: "off", txt: "visto " + quandoTexto(p.atualizado || Date.now()) };
  /* o recado que a pessoa escreveu ganha da tela em que ela está: ela
     escreveu justamente para dizer outra coisa */
  const rec = p.recado && p.recado.txt && (!p.recado.ate || p.recado.ate > Date.now())
    ? (p.recado.emoji ? p.recado.emoji + " " : "") + String(p.recado.txt).slice(0, 60) : "";
  const pres = PRESENCAS.some(x => x.id === p.presenca) ? p.presenca : "online";
  const cel = p.aparelho === "celular";
  if (pres === "ocupado") return { cor: "ocupado", ic: "⊘", cel, txt: rec || "não perturbe" };
  if (pres === "ausente") return { cor: "ausente", ic: "☾", cel, txt: rec || "ausente" };
  const onde = String(p.onde || "");
  if (/Jogando|Arena|Cooperativo|Ranqueada|Maratona/i.test(onde))
    return { cor: "jogo", ic: "●", cel, txt: rec || "em partida" };
  return { cor: "on", ic: "●", cel, txt: rec || onde || "no jogo" };
}
/* a luzinha: pontinho, lua, bloqueado — ou um celularzinho, quando a
   pessoa está no telefone */
function estLuz(onde) {
  return '<i class="est-luz ' + onde.cor + (onde.cel ? " cel" : "") + '">' +
    (onde.cel ? "▯" : "") + "</i>";
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
  let s = escaparLongo(String(txt || ""));
  /* UMA PASSADA SÓ. Duas seriam o caminho curto para o bug: a primeira
     transformaria @everyone em HTML e a segunda ainda enxergaria o
     "@everyone" lá dentro, marcando de novo em cima da marca. */
  s = s.replace(/@([A-Za-z0-9_À-ÿ]{2,20})/g, (todo, nome) => {
    /* @everyone e @here acendem para todo mundo, não para quem tem esse
       nick -- eles são alarme, não apelido */
    if (/^(everyone|here|todos|aqui)$/i.test(nome))
      return '<b class="est-mencao eu todos">@' + nome + "</b>";
    const meu = eu && (nickSimples(nome) === nickSimples(eu.tag) ||
                       nickSimples(nome) === nickSimples(eu.nick));
    return '<b class="est-mencao' + (meu ? " eu" : "") + '">@' + nome + "</b>";
  });
  return s;
}
function estMeChamou(m, eu) {
  if (!eu || !m || !m.txt) return false;
  try { if (socialChamouMim(m, eu)) return true; } catch (e) {}
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
  /* A BUSCA É UM FILTRO, NÃO UMA SEGUNDA LISTA.
     Se ela montasse a própria lista, um dia acharia algo que a barra
     esconde e o toque cairia numa tela morta -- foi o que já aconteceu
     no menu do jogo. Aqui ela só decide quais linhas da MESMA barra
     continuam desenhadas. */
  const alvoBusca = semAcento(String(EST.busca || "").trim().toLowerCase());
  const casa = (nome, sub) => !alvoBusca ||
    semAcento(String(nome || "").toLowerCase()).indexOf(alvoBusca) >= 0 ||
    semAcento(String(sub || "").toLowerCase()).indexOf(alvoBusca) >= 0;
  /* procurando, os títulos de seção somem: "CANAIS DE TEXTO" sozinho,
     sem nenhum canal embaixo, faz a pessoa achar que a busca quebrou */
  const cabeca = (txt, extra) => alvoBusca ? "" :
    '<div class="est-grupo-h">' + txt + (extra || "") + "</div>";
  const linha = (d, nome, sub, ic, extra) => {
    if (!casa(nome, sub)) return "";
    const mudo = silenciado(estChave(d));
    const nova = mudo ? 0 : estNaoLidas(d);
    extra = (extra || "") + (mudo ? " mudo" : "");
    const aqui = estMesmoDestino(EST.destino, d);
    return '<button class="est-dest' + (aqui ? " on" : "") + (nova ? " nova" : "") +
      (extra || "") + '" data-dest="' + d.tipo + "|" + d.id + '">' +
      '<b class="est-dest-ic">' + ic + "</b>" +
      '<span class="est-dest-txt"><strong>' + escaparTexto(nome) + "</strong>" +
      (sub ? "<em>" + escaparLongo(sub) + "</em>" : "") + "</span>" +
      (nova ? '<i class="est-pip"></i>' : "") + "</button>";
  };

  let h = '<div class="est-serv"><b>' + escaparTexto(EST_SERVIDOR.nome.slice(0, 2)) + "</b>" +
          "<span><strong>" + escaparTexto(EST_SERVIDOR.nome) + "</strong>" +
          "<em>" + escaparLongo(EST_SERVIDOR.sobre) + "</em></span>" +
          /* o ✕ da gaveta: só aparece no celular, onde ela é gaveta mesmo.
             Tocar fora também fecha, mas botão que se vê ensina; véu
             invisível, não. */
          '<button class="est-lado-x" id="est-lado-x" aria-label="Fechar os canais">✕</button></div>';

  /* A BUSCA NO TOPO DA LISTA.
     Com canais, salas de voz, conversas e amigos na mesma barra, achar
     "aquela conversa com o Lucas" virava rolagem. A busca filtra a lista
     inteira de uma vez -- e é a MESMA lista, só com menos linhas: uma
     regra só decide o que aparece, como no menu do jogo. */
  h += '<div class="est-busca-cx">' +
       '<input id="est-busca" placeholder="Procurar canal ou pessoa" autocomplete="off" ' +
       'value="' + escaparTexto(EST.busca || "") + '">' +
       (EST.busca ? '<button class="est-busca-x" id="est-busca-x" aria-label="Limpar">✕</button>' : "") +
       "</div>";

  /* AMIGOS é um destino como qualquer outro -- é o que a divisão em
     "destinos" comprou: uma tela nova entra como mais uma linha, e nem a
     barra nem os não lidos precisaram saber o que ela é. */
  const pedidos = Object.keys((typeof AM !== "undefined" && AM.pedidos) || {}).length;
  /* =====================================================================
     O CARTÃO DO NEONEBULA, NO TOPO DE TUDO
     ---------------------------------------------------------------------
     Foi pedido que a assinatura ficasse exposta, e não escondida atrás
     de dois toques dentro do perfil. Ela fica aqui, acima de AMIGOS,
     porque este é o primeiro lugar onde o olho cai ao abrir a Estação.

     Para quem JÁ assina ele muda de cara: em vez de vender de novo, ele
     mostra o que a pessoa tem e quantos dias faltam. Continuar vendendo
     para quem já comprou é o jeito mais rápido de irritar quem pagou.
     ===================================================================== */
  if (!alvoBusca) {
    const nv = neoNivel();
    const meu = neoInfo(nv);
    const dias = neoDiasQueFaltam();
    h += '<button class="est-neo-cx' + (nv === "nenhum" ? "" : " tem") +
         '" id="est-neo-cartao">' +
      '<b class="est-neo-selo">' + (meu && meu.selo ? meu.selo : "✦") + "</b>" +
      '<span class="est-neo-txt"><strong>' +
        (nv === "nenhum" ? "NeoNebula"
                         : escaparTexto((meu && meu.nome) || "NeoNebula")) + "</strong>" +
        "<em>" + (nv === "nenhum"
          ? "Bronze R$0,50 · Prata R$1 · Ouro R$3"
          : (nv === "ilimitado" ? "Sem prazo" : dias + (dias === 1 ? " dia" : " dias") + " restantes")) +
        "</em></span>" +
      '<i class="est-neo-seta">›</i></button>';

    /* AS OFERTAS. Ficam logo abaixo, e só aparecem quando existe alguma:
       um cartão "nenhuma oferta agora" toda vez que se abre a Estação é
       ruído permanente em troca de nada. */
    const ofertas = estOfertas();
    if (ofertas.length) {
      h += '<div class="est-ofertas">' + ofertas.map(o =>
        '<button class="est-oferta" data-oferta="' + o.id + '">' +
        '<b>' + o.ic + "</b><span><strong>" + escaparTexto(o.nome) + "</strong>" +
        "<em>" + escaparLongo(o.sobre) + "</em></span>" +
        (o.selo ? '<i class="est-of-selo">' + escaparTexto(o.selo) + "</i>" : "") +
        "</button>").join("") + "</div>";
    }
  }

  if (casa("Amigos", "ver adicionar responder"))
  h += '<button class="est-dest est-amigos-b' +
       (EST.destino && EST.destino.tipo === "amigos" ? " on" : "") + '" data-dest="amigos|tudo">' +
       '<b class="est-dest-ic">👥</b><span class="est-dest-txt"><strong>Amigos</strong>' +
       "<em>ver, adicionar e responder</em></span>" +
       (pedidos ? '<i class="est-pip conta">' + pedidos + "</i>" : "") + "</button>";

  /* MENSAGENS DIRETAS tem lugar próprio, do lado de AMIGOS. Antes as
     conversas só existiam soltas lá embaixo da barra, misturadas com o
     resto: quem tinha três conversas abertas não tinha onde ver as três
     juntas, com quem falou por último em cima. */
  const naoLidasDM = Object.keys((typeof AM !== "undefined" && AM.lista) || {})
    .filter(x => estNaoLidas({ tipo: "dm", id: x })).length;
  if (casa("Mensagens diretas", "conversas privadas dm"))
  h += '<button class="est-dest est-dm-b' +
       (EST.destino && EST.destino.tipo === "dms" ? " on" : "") + '" data-dest="dms|tudo">' +
       '<b class="est-dest-ic">✉</b><span class="est-dest-txt"><strong>Mensagens diretas</strong>' +
       "<em>suas conversas de um para um</em></span>" +
       (naoLidasDM ? '<i class="est-pip conta">' + naoLidasDM + "</i>" : "") + "</button>";

  h += cabeca("CANAIS DE TEXTO");
  for (const c of EST_CANAIS)
    h += linha({ tipo: "canal", id: c.id }, c.nome, c.sobre, "#");

  /* AS SALAS DE VOZ, com quem está dentro logo abaixo do nome: é o que
     faz alguém entrar. Uma lista de salas vazias ninguém abre. */
  h += cabeca("SALAS DE VOZ");
  for (const v of EST_VOZ) {
    if (!casa(v.nome, "voz sala falar")) continue;
    const aqui = VOZ.sala === v.id;
    const gente = aqui ? Object.keys(VOZ.dentro).filter(u =>
      Date.now() - (VOZ.dentro[u].quando || 0) < VOZ_SUMIU) : [];
    h += '<button class="est-dest voz' + (aqui ? " on" : "") + '" data-voz="' + v.id + '">' +
         '<b class="est-dest-ic">🔊</b>' +
         '<span class="est-dest-txt"><strong>' + escaparTexto(v.nome) + "</strong>" +
         "<em>" + (aqui ? gente.length + " na sala" : "até " + v.limite + " pilotos") +
         "</em></span></button>";
    for (const uid of gente)
      h += '<span class="est-voz-quem' + (VOZ.falando[uid] ? " fala" : "") + '">' +
           escaparTexto((VOZ.dentro[uid] || {}).nome || "piloto") + "</span>";
  }

  /* OS SERVIDORES. Cada um com os canais dele logo abaixo, para não ser
     preciso entrar num lugar para descobrir o que tem dentro.

     GUARDADOS desde a v8.9 (ver SERVIDORES_LIGADOS em 09-servidores.js):
     desligados, a seção inteira não é desenhada -- nem o título, nem o
     +, nem o "nenhum servidor ainda". Esconder o botão e deixar o
     título seria pior que deixar tudo: a pessoa procuraria o + que não
     existe mais. */
  const sids = SERVIDORES_LIGADOS ? Object.keys(SRV.meus || {}) : [];
  if (SERVIDORES_LIGADOS) {
    h += cabeca("MEUS SERVIDORES",
         '<button class="est-mais" id="est-novo-srv" aria-label="Criar servidor">+</button>');
    if (!sids.length)
      h += '<p class="est-vazio-lado">Nenhum servidor. Toque no + para criar o seu ' +
           "ou entrar com um convite.</p>";
  }
  for (const sid of sids) {
    const sv = SRV.meus[sid];
    const aqui = EST.destino && EST.destino.tipo === "srv" && EST.destino.id === sid;
    h += '<button class="est-srv' + (aqui ? " on" : "") + '" data-srv="' + sid + '">' +
         '<b class="est-srv-ic">' + escaparTexto((sv.icone || sv.nome[0] || "S")) + "</b>" +
         '<span class="est-dest-txt"><strong>' + escaparTexto(sv.nome) + "</strong>" +
         (sv.tag ? '<em class="srv-tag pequena">' + escaparTexto(sv.tag) + "</em>" : "") +
         "</span></button>";
    if (aqui && SRV.aberto && SRV.aberto.sid === sid) {
      const cs = Object.keys(SRV.canais).sort((a, b) =>
        (SRV.canais[a].ordem || 0) - (SRV.canais[b].ordem || 0));
      for (const cid of cs) {
        const c = SRV.canais[cid];
        const d = { tipo: "srv", id: sid, canal: cid, nome: c.nome };
        const nova = estNaoLidas(d);
        /* CANAL DE VOZ NÃO ABRE CONVERSA: ele entra na sala. Um canal
           chamado "Hangar" com um alto-falante do lado que abrisse um
           campo de texto seria uma promessa quebrada no clique. */
        const salaVoz = "srv__" + sid + "__" + cid;
        if (c.tipo === "voz") {
          const naVoz = VOZ.sala === salaVoz;
          h += '<button class="est-dest est-canal-srv' + (naVoz ? " on" : "") +
               '" data-voz="' + salaVoz + '">' +
               '<b class="est-dest-ic">🔊</b>' +
               '<span class="est-dest-txt"><strong>' + escaparTexto(c.nome) + "</strong></span>" +
               "</button>";
          if (naVoz) for (const uid of Object.keys(VOZ.dentro))
            h += '<span class="est-voz-quem' + (VOZ.falando[uid] ? " fala" : "") + '">' +
                 escaparTexto((VOZ.dentro[uid] || {}).nome || "piloto") + "</span>";
          continue;
        }
        h += '<button class="est-dest est-canal-srv' +
             (EST.destino.canal === cid ? " on" : "") + (nova ? " nova" : "") +
             '" data-dest="srv|' + sid + "|" + cid + '">' +
             '<b class="est-dest-ic">#</b>' +
             '<span class="est-dest-txt"><strong>' + escaparTexto(c.nome) + "</strong></span>" +
             (nova ? '<i class="est-pip"></i>' : "") + "</button>";
      }
      h += '<button class="est-srv-cfg" data-cfg="' + sid + '">⚙ configurações</button>';
    }
  }

  /* OS GRUPOS saíram junto com os servidores, e pelo mesmo motivo: a
     conversa aqui é para ser global. Quem já está num grupo continua
     vendo o grupo -- tirar da tela uma conversa que existe seria perder
     mensagem de gente de verdade. O que sumiu foi o + de criar. */
  const gids = GRUPOS_LIGADOS ? Object.keys(EST.grupos) : [];
  if (GRUPOS_LIGADOS || Object.keys(EST.grupos).length) {
    h += cabeca("MEUS GRUPOS", GRUPOS_LIGADOS
           ? '<button class="est-mais" id="est-novo-grupo" aria-label="Criar grupo">+</button>'
           : "");
    if (GRUPOS_LIGADOS && !gids.length)
      h += '<p class="est-vazio-lado">Nenhum grupo ainda. Toque no + e chame a galera.</p>';
  }
  for (const gid of (GRUPOS_LIGADOS ? gids : Object.keys(EST.grupos))) {
    const g = EST.grupos[gid];
    const n = Object.keys(g.membros || {}).length;
    h += linha({ tipo: "grupo", id: gid }, g.nome, n + (n === 1 ? " pessoa" : " pessoas"), "◈");
  }

  h += cabeca("CONVERSAS",
       '<button class="est-mais" id="est-novo-amigo" aria-label="Adicionar amigo">+</button>');
  const amigos = Object.keys((typeof AM !== "undefined" && AM.lista) || {});
  if (!amigos.length && !alvoBusca)
    h += '<p class="est-vazio-lado">Você ainda não tem amigos aqui. Toque no + para chamar alguém pelo nick.</p>';
  /* online primeiro: é com quem dá para falar agora */
  amigos.sort((a, b) => {
    const pa = estOndeEsta(a).cor === "off" ? 1 : 0, pb = estOndeEsta(b).cor === "off" ? 1 : 0;
    return pa - pb;
  });
  for (const id of amigos) {
    const a = AM.lista[id];
    const onde = estOndeEsta(id);
    h += linha({ tipo: "dm", id }, a.tag || a.nome, onde.txt,
               estLuz(onde) + estIni(a.tag || a.nome),
               EST.bloq[id] ? " bloqueado" : "");
  }

  /* busca que não acha nada tem que DIZER que não achou. Uma barra vazia
     e muda parece uma tela quebrada. */
  if (alvoBusca && h.indexOf('class="est-dest') < 0)
    h += '<p class="est-vazio-lado">Nada com “' + escaparTexto(EST.busca) + '”.</p>';

  const ped = Object.keys((typeof AM !== "undefined" && AM.pedidos) || {}).length;
  if (ped && !alvoBusca) h += '<button class="est-pedidos" id="est-ver-pedidos">' + ped +
                (ped === 1 ? " pedido de amizade" : " pedidos de amizade") + " ›</button>";

  /* A BARRA DO PRÓPRIO PILOTO, colada embaixo: quem sou eu agora e como
     eu quero aparecer. É onde a mão procura, e é o que faltava para
     trocar de estado sem caçar em tela de ajustes. */
  const minha = estOndeEsta(eu.id);
  const vMeu = { nivel: neoNivel(), selo: neoSelo(), cor: perfilCorDoNome(),
                 efeito: perfilEfeitoDoNome() };
  /* A BARRA DA VOZ FICA ACIMA DA MINHA, sempre visível enquanto eu
     estiver numa sala: o botão de SAIR não pode depender de eu lembrar
     em que canal eu entrei. */
  h += '<div class="est-voz-barra" id="est-voz-barra"></div>';
  h += '<div class="est-eu">' +
       '<button class="est-eu-av' + avatarClasse(eu.id) + '" id="est-eu-perfil" ' +
       'aria-label="Meu perfil" ' + avatarEstilo(eu.id) + ">" +
       estLuz(minha) + avatarConteudo(eu.id, eu.tag) + "</button>" +
       '<button class="est-eu-txt" id="est-eu-status">' +
       '<strong class="' + perfilClasseDoNome(vMeu).trim() + '"' +
       (vMeu.cor ? ' style="' + perfilEstiloDoNome(vMeu) + '"' : "") + ">" +
       escaparTexto(eu.tag) + (vMeu.selo ? " " + vMeu.selo : "") + "</strong>" +
       "<em>" + escaparTexto(minha.txt) + "</em></button>" +
       '<button class="est-eu-b" id="est-eu-editar" aria-label="Editar perfil">✎</button>' +
       "</div>";

  cx.innerHTML = h;
  const bp = $("est-eu-perfil"), bs = $("est-eu-status"), be = $("est-eu-editar");
  if (bp) bp.addEventListener("click", () => estAbrirPerfil(eu.id));
  if (bs) bs.addEventListener("click", estAbrirStatus);
  if (be) be.addEventListener("click", estEditarPerfil);
  cx.querySelectorAll("[data-dest]").forEach(b =>
    b.addEventListener("click", () => {
      const [tipo, id, canal] = b.getAttribute("data-dest").split("|");
      const nome = b.querySelector("strong").textContent;
      estAbrir(canal ? { tipo, id, canal, nome } : { tipo, id, nome });
      $("estacao").classList.remove("lado-aberto");
    }));
  cx.querySelectorAll("[data-srv]").forEach(b =>
    b.addEventListener("click", async () => {
      const sid = b.getAttribute("data-srv");
      if (!(await srvAbrir(sid))) return;
      const primeiro = Object.keys(SRV.canais)
        .filter(c => SRV.canais[c].tipo === "texto")
        .sort((x, y) => (SRV.canais[x].ordem || 0) - (SRV.canais[y].ordem || 0))[0];
      estAbrir({ tipo: "srv", id: sid, canal: primeiro,
                 nome: primeiro ? SRV.canais[primeiro].nome : "servidor" });
    }));
  cx.querySelectorAll("[data-cfg]").forEach(b =>
    b.addEventListener("click", e => { e.stopPropagation(); srvAbrirConfig(b.getAttribute("data-cfg")); }));
  const ns = $("est-novo-srv");
  if (ns) ns.addEventListener("click", e => { e.stopPropagation(); srvAbrirCriar(); });
  /* tocar na sala em que já estou SAI dela: é o que a mão espera, e
     evita ter que achar o ✕ na barra de baixo */
  cx.querySelectorAll("[data-voz]").forEach(b =>
    b.addEventListener("click", () => {
      const sala = b.getAttribute("data-voz");
      if (VOZ.sala === sala) estVozSair(); else estVozEntrar(sala);
    }));
  const lo = $("est-lado");
  if (lo) { try { vozPintar(); } catch (e) {} }
  const ng = $("est-novo-grupo");
  if (ng) ng.addEventListener("click", e => { e.stopPropagation(); estAbrirCriarGrupo(); });
  const na = $("est-novo-amigo");
  if (na) na.addEventListener("click", e => { e.stopPropagation(); estAbrirAdicionar(); });
  const vp = $("est-ver-pedidos");
  if (vp) vp.addEventListener("click", () => estAbrirPedidos());
  const lx = $("est-lado-x");
  if (lx) lx.addEventListener("click", () => $("estacao").classList.remove("lado-aberto"));

  /* A BUSCA REDESENHA A BARRA a cada tecla, e a barra inclui o próprio
     campo. Sem devolver o cursor para dentro dele, a pessoa digitava uma
     letra e perdia o foco -- e aí a segunda letra ia para lugar nenhum. */
  const neoCx = $("est-neo-cartao");
  if (neoCx) neoCx.addEventListener("click", estAbrirNeo);
  cx.querySelectorAll("[data-oferta]").forEach(b =>
    b.addEventListener("click", () => estAbrirOferta(b.getAttribute("data-oferta"))));

  const campoBusca = $("est-busca");
  if (campoBusca) {
    campoBusca.addEventListener("input", () => {
      EST.busca = campoBusca.value;
      const onde = campoBusca.selectionStart;
      estPintarLado();
      const novo = $("est-busca");
      if (novo) { novo.focus(); try { novo.setSelectionRange(onde, onde); } catch (e) {} }
    });
    campoBusca.addEventListener("keydown", e => {
      if (e.key === "Escape") { e.stopPropagation(); EST.busca = ""; estPintarLado(); }
    });
  }
  const bx = $("est-busca-x");
  if (bx) bx.addEventListener("click", () => { EST.busca = ""; estPintarLado(); });
}

/* =====================================================================
   A TELA DE AMIGOS
   ---------------------------------------------------------------------
   As mesmas cinco abas que todo mundo já conhece de outros aplicativos:
   ONLINE, TODOS, PENDENTES, BLOQUEADOS e ADICIONAR. Não é invenção --
   é o arranjo que o seu amigo já sabe usar sem ninguém explicar, e
   copiar isso é respeitar o tempo de quem chega.

   Ela vive dentro do mesmo canto onde as conversas aparecem, porque é
   um DESTINO como os outros. Não precisou de tela nova no jogo.
   ===================================================================== */
const EST_ABAS_AMIGOS = [
  { id: "online",     nome: "Online" },
  { id: "tudo",       nome: "Todos" },
  { id: "pendentes",  nome: "Pendentes" },
  { id: "bloqueados", nome: "Bloqueados" }
];
let estAbaAmigos = "online";

function estLinhaDeAmigo(id, dados, acoes) {
  const onde = estOndeEsta(id);
  const nome = (dados && (dados.tag || dados.nome)) || "Piloto";
  return '<div class="est-amigo" data-amigo="' + id + '">' +
    '<span class="est-av">' + estLuz(onde) +
    escaparTexto(estIni(nome)) + "</span>" +
    '<span class="est-amigo-txt"><strong>' + escaparTexto(nome) + "</strong>" +
    "<em>" + escaparTexto(onde.txt) + "</em></span>" +
    '<span class="est-amigo-acoes">' + acoes + "</span></div>";
}

function estPintarAmigos() {
  const lista = $("est-msgs"), cab = $("est-cab");
  if (!lista || !cab) return;
  const amigos = (typeof AM !== "undefined" && AM.lista) || {};
  const pedidos = (typeof AM !== "undefined" && AM.pedidos) || {};
  const enviados = (typeof AM !== "undefined" && AM.enviados) || {};
  const nPend = Object.keys(pedidos).length + Object.keys(enviados).length;

  cab.innerHTML =
    '<button class="est-abrir-lado" id="est-abrir-lado" aria-label="Ver os canais">☰</button>' +
    '<div class="est-cab-txt"><strong>👥 Amigos</strong></div>' +
    '<div class="est-amigos-abas">' +
    EST_ABAS_AMIGOS.map(a => {
      const n = a.id === "pendentes" ? nPend
              : a.id === "bloqueados" ? Object.keys(EST.bloq).length : 0;
      return '<button class="est-aba-am' + (estAbaAmigos === a.id ? " on" : "") +
        '" data-abam="' + a.id + '">' + a.nome +
        (n ? '<i class="est-aba-n">' + n + "</i>" : "") + "</button>";
    }).join("") +
    '<button class="est-aba-am novo" data-abam="adicionar">Adicionar</button></div>';
  const al = $("est-abrir-lado");
  if (al) al.addEventListener("click", () => $("estacao").classList.toggle("lado-aberto"));
  cab.querySelectorAll("[data-abam]").forEach(b =>
    b.addEventListener("click", () => { estAbaAmigos = b.getAttribute("data-abam"); estPintar(); }));

  let h = "";
  const vazio = (ic, txt) => '<div class="est-vazio"><b>' + ic + "</b>" + txt + "</div>";

  if (estAbaAmigos === "adicionar") {
    h = '<div class="est-add"><h3>ADICIONAR AMIGO</h3>' +
        '<p class="est-nota">Escreva o nick do piloto, do jeito que ele aparece no jogo. ' +
        "Ele precisa aceitar antes de vocês virarem amigos.</p>" +
        '<div class="est-add-linha">' +
        '<input id="est-add-nome" maxlength="20" placeholder="nick do piloto" autocomplete="off">' +
        '<button id="est-add-b">MANDAR PEDIDO</button></div>' +
        '<p class="est-nota" id="est-add-resp"></p></div>';
  } else if (estAbaAmigos === "pendentes") {
    const rec = Object.keys(pedidos), env = Object.keys(enviados);
    if (!rec.length && !env.length) h = vazio("📭", "Nenhum pedido esperando.");
    else {
      if (rec.length) {
        h += '<div class="est-am-h">RECEBIDOS — ' + rec.length + "</div>";
        for (const id of rec) h += estLinhaDeAmigo(id, pedidos[id],
          '<button class="est-ac sim" data-sim="' + id + '" aria-label="Aceitar">✓</button>' +
          '<button class="est-ac nao" data-nao="' + id + '" aria-label="Recusar">✕</button>');
      }
      if (env.length) {
        h += '<div class="est-am-h">ENVIADOS — ' + env.length + "</div>";
        for (const id of env) h += estLinhaDeAmigo(id, enviados[id],
          '<button class="est-ac nao" data-cancela="' + id + '" aria-label="Cancelar">✕</button>');
      }
    }
  } else if (estAbaAmigos === "bloqueados") {
    const ids = Object.keys(EST.bloq);
    if (!ids.length) h = vazio("🛡", "Você não bloqueou ninguém.");
    else {
      h += '<div class="est-am-h">BLOQUEADOS — ' + ids.length + "</div>";
      for (const id of ids) h += estLinhaDeAmigo(id, amigos[id] || { nome: "Piloto" },
        '<button class="est-ac nao" data-desbloq="' + id + '">desbloquear</button>');
    }
  } else {
    let ids = Object.keys(amigos);
    if (estAbaAmigos === "online") ids = ids.filter(id => estOndeEsta(id).cor !== "off");
    ids.sort((a, b) => (estOndeEsta(a).cor === "off" ? 1 : 0) - (estOndeEsta(b).cor === "off" ? 1 : 0));
    if (!ids.length) {
      h = vazio("👋", estAbaAmigos === "online"
        ? "Ninguém online agora. Quem estiver com o jogo aberto aparece aqui."
        : "Você ainda não tem amigos. Vá em ADICIONAR e chame alguém pelo nick.");
    } else {
      h += '<div class="est-am-h">' +
           (estAbaAmigos === "online" ? "ONLINE AGORA" : "TODOS") + " — " + ids.length + "</div>";
      for (const id of ids) h += estLinhaDeAmigo(id, amigos[id],
        '<button class="est-ac" data-falar="' + id + '" aria-label="Conversar">💬</button>' +
        '<button class="est-ac" data-ligar="' + id + '" aria-label="Ligar">📞</button>' +
        '<button class="est-ac" data-mais="' + id + '" aria-label="Mais">⋯</button>');
    }
  }
  lista.innerHTML = h;

  const add = $("est-add-b");
  if (add) {
    const manda = async () => {
      const r = await amigoPedir($("est-add-nome").value);
      const el = $("est-add-resp");
      if (el) el.textContent = (r && r.msg) || "";
      if (r && r.ok) { $("est-add-nome").value = ""; await amigosCarregar(); }
    };
    add.addEventListener("click", manda);
    $("est-add-nome").addEventListener("keydown", e => { if (e.key === "Enter") manda(); });
  }
  const refaz = async () => { await amigosCarregar(); estPintar(); };
  lista.querySelectorAll("[data-sim]").forEach(b =>
    b.addEventListener("click", async () => { await amigoAceitar(b.getAttribute("data-sim")); refaz(); }));
  lista.querySelectorAll("[data-nao]").forEach(b =>
    b.addEventListener("click", async () => { await amigoRecusar(b.getAttribute("data-nao")); refaz(); }));
  lista.querySelectorAll("[data-cancela]").forEach(b =>
    b.addEventListener("click", async () => { await amigoRemover(b.getAttribute("data-cancela")); refaz(); }));
  lista.querySelectorAll("[data-desbloq]").forEach(b =>
    b.addEventListener("click", () => { estBloquear(b.getAttribute("data-desbloq")); estPintar(); }));
  lista.querySelectorAll("[data-falar]").forEach(b =>
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-falar");
      estAbrir({ tipo: "dm", id, nome: (amigos[id].tag || amigos[id].nome) });
    }));
  lista.querySelectorAll("[data-ligar]").forEach(b =>
    b.addEventListener("click", () => estLigarPara(b.getAttribute("data-ligar"),
      (amigos[b.getAttribute("data-ligar")] || {}).tag)));
  lista.querySelectorAll("[data-mais]").forEach(b =>
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-mais");
      const nome = (amigos[id].tag || amigos[id].nome);
      estJanela(nome,
        '<button class="est-jan-ok" data-o="falar">conversar</button>' +
        '<button class="est-jan-ok" data-o="mudo">' +
          (EST.mudo[id] ? "voltar a ver" : "silenciar") + "</button>" +
        '<button class="est-jan-ok" data-o="bloq">' +
          (EST.bloq[id] ? "desbloquear" : "bloquear") + "</button>" +
        '<button class="est-jan-ok perigo" data-o="tirar">desfazer amizade</button>',
        cx => cx.querySelectorAll("[data-o]").forEach(x => x.addEventListener("click", async () => {
          const q = x.getAttribute("data-o");
          estFecharJanela();
          if (q === "falar") estAbrir({ tipo: "dm", id, nome });
          else if (q === "mudo") { estSilenciar(id, nome); estPintar(); }
          else if (q === "bloq") { estBloquear(id, nome); estPintar(); }
          else { await amigoRemover(id); refaz(); }
        })));
    }));
}

/* =====================================================================
   MENSAGENS DIRETAS
   ---------------------------------------------------------------------
   A lista das conversas de um para um, com a última coisa que foi dita e
   quando — igual a qualquer aplicativo de mensagem. É o que faltava:
   antes as conversas só apareciam soltas na barra lateral, e quem tinha
   várias não tinha onde ver todas juntas, em ordem de quem falou por
   último.

   A PRÉVIA CUSTA UMA LEITURA POR CONVERSA, e é por isso que ela só
   acontece quando esta tela abre — não a cada quadro, não em segundo
   plano. Com dez amigos seriam dez buscas: fazer isso o tempo todo
   gastaria a internet de quem joga no 3G da mãe.
   ===================================================================== */
const EST_PREVIAS = {};
async function estLerPreviasDM() {
  const eu = estEu();
  if (!eu) return;
  const ids = Object.keys((typeof AM !== "undefined" && AM.lista) || {});
  for (const id of ids) {
    const bruto = await nuvemReq("conversas/" + salaDaConversa(eu.id, id),
                                 null, '?orderBy="$key"&limitToLast=1');
    const arr = estArrumar(bruto);
    EST_PREVIAS[id] = arr.length ? arr[arr.length - 1] : null;
  }
}

function estPintarDMs() {
  const lista = $("est-msgs"), cab = $("est-cab");
  if (!lista || !cab) return;
  const eu = estEu();
  const amigos = (typeof AM !== "undefined" && AM.lista) || {};
  cab.innerHTML =
    '<button class="est-abrir-lado" id="est-abrir-lado" aria-label="Ver os canais">☰</button>' +
    '<div class="est-cab-txt"><strong>✉ Mensagens diretas</strong>' +
    "<em>só você e a outra pessoa leem</em></div>";
  const al = $("est-abrir-lado");
  if (al) al.addEventListener("click", () => $("estacao").classList.toggle("lado-aberto"));

  /* quem falou por último vem primeiro, que é como a cabeça procura */
  const ids = Object.keys(amigos).sort((a, b) => {
    const qa = (EST_PREVIAS[a] && EST_PREVIAS[a].quando) || 0;
    const qb = (EST_PREVIAS[b] && EST_PREVIAS[b].quando) || 0;
    return qb - qa;
  });
  if (!ids.length) {
    lista.innerHTML = '<div class="est-vazio"><b>✉</b>Nenhuma conversa ainda. ' +
      "Vá em <b>Amigos</b>, chame alguém pelo nick e comece a falar.</div>";
    return;
  }
  lista.innerHTML = ids.map(id => {
    const a = amigos[id];
    const nome = a.tag || a.nome;
    const ult = EST_PREVIAS[id];
    const onde = estOndeEsta(id);
    const nova = estNaoLidas({ tipo: "dm", id });
    const quem = ult && eu && ult.de === eu.id ? "você: " : "";
    return '<button class="est-dm' + (nova ? " nova" : "") + '" data-dm="' + id + '">' +
      '<span class="est-av">' + estLuz(onde) +
      escaparTexto(estIni(nome)) + "</span>" +
      '<span class="est-dm-txt"><strong>' + escaparTexto(nome) + "</strong>" +
      "<em>" + (ult ? escaparLongo(quem + String(ult.txt).slice(0, 60))
                    : "vocês ainda não conversaram") + "</em></span>" +
      '<span class="est-dm-lado">' +
      (ult ? '<u>' + quandoTexto(ult.quando) + "</u>" : "") +
      (nova ? '<i class="est-pip"></i>' : "") + "</span></button>";
  }).join("");
  lista.querySelectorAll("[data-dm]").forEach(b =>
    b.addEventListener("click", () => {
      const id = b.getAttribute("data-dm");
      estAbrir({ tipo: "dm", id, nome: (amigos[id].tag || amigos[id].nome) });
    }));
}

/* ---------- a conversa ---------- */
function estPintarConversa(grudarNoFim) {
  if (EST.destino && EST.destino.tipo === "amigos") { estPintarAmigos(); return; }
  if (EST.destino && EST.destino.tipo === "dms") { estPintarDMs(); return; }
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
  const chaveSil = estChave(d);
  const silBt = '<button class="est-cab-b' + (silenciado(chaveSil) ? " mudo" : "") +
    '" data-acao="silenciar-aqui">' + (silenciado(chaveSil) ? "🔕 mudo" : "🔔 avisos") + "</button>";
  if (d.tipo === "canal") {
    const c = EST_CANAIS.filter(x => x.id === d.id)[0];
    sub = c ? c.sobre : "";
    acoes = silBt;
  } else if (d.tipo === "dm") {
    const onde = estOndeEsta(d.id);
    sub = onde.txt;
    acoes = silBt +
            '<button class="est-cab-b" data-acao="bloquear">' +
            (EST.bloq[d.id] ? "desbloquear" : "bloquear") + "</button>";
  } else if (d.tipo === "grupo") {
    const g = EST.grupos[d.id];
    const n = g ? Object.keys(g.membros || {}).length : 0;
    sub = n + (n === 1 ? " pessoa" : " pessoas");
    acoes = silBt + '<button class="est-cab-b" data-acao="membros">quem está</button>';
    if (estMeuNivel(d.id) >= EST_MOD)
      acoes += '<button class="est-cab-b" data-acao="renomear">renomear</button>';
    acoes += '<button class="est-cab-b sai" data-acao="sair">sair</button>';
  }
  /* a agenda fica no cabeçalho e não escondida no ＋: evento que só
     existe enquanto o cartão está na tela é evento que ninguém acha
     depois. Numa conversa de dois não faz sentido, então não aparece. */
  if (d.tipo !== "dm") acoes = '<button class="est-cab-b" data-acao="agenda">📅</button>' + acoes;
  cab.innerHTML =
    '<button class="est-abrir-lado" id="est-abrir-lado" aria-label="Ver os canais">☰</button>' +
    '<div class="est-cab-txt"><strong>' + (d.tipo === "canal" ? "#" : "") +
    escaparTexto(d.nome || d.id) + "</strong><em>" + escaparLongo(sub) + "</em></div>" +
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
      /* O NOME E O AVATAR ABREM O PERFIL — o de qualquer um, inclusive o
         meu. Foi o pedido: "eu mandei uma mensagem, eu posso clicar no
         meu perfil e editar". Então clicar em si mesmo abre a edição, e
         clicar em outro abre o cartão dele. */
      /* O MEU PERFIL VEM DE MIM, não da nuvem. A ficha de cada piloto só
         é relida de vinte em vinte segundos, então a minha própria
         mensagem saía sem cor até a próxima leitura — eu trocava a cor e
         não via nada acontecer. Para os outros a nuvem é a única fonte
         possível; para mim, ela é a fonte errada. */
      let v;
      if (eu && m.de === eu.id) {
        const minhaTag = srvMinhaTagInfo();
        v = { nivel: neoNivel(), selo: neoSelo(), cor: perfilCorDoNome(),
              efeito: perfilEfeitoDoNome(),
              tag: minhaTag ? minhaTag.tag : "", tagSid: minhaTag ? minhaTag.sid : "" };
      } else {
        const ficha = EST.pilotos[m.de] || {};
        v = perfilDaNuvem(ficha);
        v.tag = String(ficha.tagNome || "").slice(0, 5);
        v.tagSid = String(ficha.tagServidor || "");
      }
      /* MINI-AVATAR NO BATE-PAPO. Antes era a inicial do nome numa
         bolinha, e três "L" ficavam idênticos: você procurava a
         mensagem do L e achava três. Agora é a foto de quem falou, ou
         o robô da conta dele -- e cada conta tem um robô diferente. */
      h += '<button class="est-av est-abre-perfil' + avatarClasse(m.de) +
           (m.mold ? " moldurado mold-" + escaparTexto(m.mold) : "") +
           '" data-perfil="' + escaparTexto(m.de || "") + '" ' +
           avatarEstilo(m.de) + ">" +
           avatarConteudo(m.de, m.nome) + "</button>";
      h += '<div class="est-corpo"><div class="est-linha1">' +
           '<b class="est-nome est-abre-perfil' + perfilClasseDoNome(v) +
           '" data-perfil="' + escaparTexto(m.de || "") + '"' +
           (v.cor ? ' style="' + perfilEstiloDoNome(v) + '"' : "") + ">" +
           escaparTexto(m.nome || "Piloto") + "</b>" +
           (v.selo ? '<span class="est-selo-neo" title="NeoNebula ' + v.nivel + '">' +
                     v.selo + "</span>" : "") +
           /* a tag do servidor que a pessoa adotou. Clicar nela mostra o
              servidor numa janelinha, sem sair daqui. */
           (v.tag ? '<button class="srv-tag clicavel" data-espiar="' + escaparTexto(v.tagSid) +
                    '">' + escaparTexto(v.tag) + "</button>" : "") +
           '<span class="est-hora">' + estHora(m.quando) + "</span></div>";
    } else {
      h += '<span class="est-av vazio"></span><div class="est-corpo">';
    }
    /* o corpo pode ser texto, enquete ou evento -- quem sabe disso é o
       09-social.js, e a conversa só pergunta */
    h += estCorpoDaMensagem(m, eu) + "</div>";
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
  lista.querySelectorAll("[data-espiar]").forEach(b =>
    b.addEventListener("click", e => {
      e.stopPropagation();
      srvEspiar(b.getAttribute("data-espiar"));
    }));
  lista.querySelectorAll("[data-perfil]").forEach(b =>
    b.addEventListener("click", e => {
      e.stopPropagation();
      estAbrirPerfil(b.getAttribute("data-perfil"));
    }));
  try { socialLigarCartoes(lista); } catch (e) {}
  /* busca as fotos de quem está na tela e ainda não foi buscada. Depois
     de pintar, e não antes: a conversa aparece na hora e as caras
     chegam em seguida, em vez de a tela esperar a rede. */
  try { fotosDaConversa(); } catch (e) {}

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
  /* a barra de escrever some onde não há para quem escrever. Campo de
     texto que não manda para lugar nenhum é convite a digitar à toa. */
  const barra = document.querySelector(".est-barra");
  if (barra) barra.style.display =
    (EST.destino && (EST.destino.tipo === "amigos" || EST.destino.tipo === "dms")) ? "none" : "";
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
      return '<div class="est-pedido"><span class="est-av pequeno">' + estLuz(onde) +
        escaparTexto(estIni(m.nome)) + "</span>" +
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
  if (acao === "silenciar-aqui") { estAbrirSilenciar(estChave(d), d.nome || d.id); return; }
  if (acao === "agenda") { evAbrirAgenda(); return; }
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
    '<p class="est-citado">' + escaparLongo(String(m.txt).slice(0, 160)) + "</p>" +
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
   8. VOZ
   ---------------------------------------------------------------------
   A máquina toda (microfone, WebRTC, salas, chamadas) mora em
   fonte/09-voz.js, e é de lá que saem estVozEntrar, estLigarPara e
   estVozSair. Aqui ficou só o caminho na nuvem, que a estação usa para
   contar quem está em cada sala.

   O encaixe estava pronto desde a v7: quando a voz chegou, nem a barra
   lateral, nem os não lidos, nem a conta de fluxos precisaram mudar.
   ===================================================================== */
function estVozCaminho(sala) { return "conversas/voz__" + sala; }

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
  srvCarregarMeus().then(() => estPintar());

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
  const veu = $("est-veu");
  if (veu) veu.addEventListener("click", () => $("estacao").classList.remove("lado-aberto"));
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
    /* a lista do @ tem que ver a tecla ANTES do campo: com ela aberta,
       Enter escolhe o nome, e não manda a mensagem pela metade */
    try { if (arrobaTecla(e)) return; } catch (err) {}
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); }
  });
  if (campo) {
    const olhar = () => { try { arrobaOlhar(); } catch (err) {} };
    campo.addEventListener("input", olhar);
    /* clicar noutro ponto do texto muda de qual @ estamos falando */
    campo.addEventListener("click", olhar);
    campo.addEventListener("keyup", e => {
      if (/^Arrow(Left|Right)$/.test(e.key)) olhar();
    });
    campo.addEventListener("blur", () => setTimeout(() => {
      try { arrobaFechar(); } catch (err) {}
    }, 180));
  }

  /* o ＋: enquete, evento e chamar todo mundo */
  const mais = $("est-mais");
  if (mais) mais.addEventListener("click", e => { e.stopPropagation(); socialAbrirMais(); });

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

/* =====================================================================
   O CARTÃO DE PERFIL
   ---------------------------------------------------------------------
   Abre de QUALQUER lugar onde um nome ou um avatar apareça. Foi pedido
   que ele fosse mais completo: mais alto, com mais coisa para ver, e a
   foto de verdade em vez da inicial.

   Ele é MONTADO POR BLOCOS, na ordem que o dono do perfil escolheu.
   Isso é o "layout modular" da referência, e não é enfeite: cada pessoa
   mostra o que tem orgulho de mostrar. Quem não escolheu nada fica com
   a ordem de fábrica, que é a mais comum.
   ===================================================================== */
function pfBlocoHTML(id, dono, v, souEu) {
  if (id === "sobre") {
    return v.bio
      ? '<div class="pf-bl"><h4>Sobre mim</h4><p class="pf-bio">' +
        escaparLongo(v.bio) + "</p></div>"
      : '<div class="pf-bl"><h4>Sobre mim</h4><p class="pf-bio vazia">' +
        (souEu ? "Você ainda não escreveu nada sobre você."
               : "Esta pessoa ainda não escreveu nada.") + "</p></div>";
  }
  if (id === "emblemas") {
    const lista = perfilEmblemas(dono);
    if (!lista.length) return "";
    return '<div class="pf-bl"><h4>Emblemas <i>' + lista.length + "</i></h4>" +
      '<div class="pf-embs">' + lista.slice(0, 12).map(c =>
        '<span class="pf-emb" title="' + escaparTexto(c.nome) + '">' +
        '<b>★</b><em>' + escaparTexto(c.nome) + "</em></span>").join("") + "</div></div>";
  }
  if (id === "interesses") {
    const lista = souEu ? perfilInteresses() : (v.interesses || []);
    if (!lista.length) return "";
    return '<div class="pf-bl"><h4>Interesses</h4><div class="pf-ints">' +
      lista.map(x => {
        const it = NEO_INTERESSES.filter(i => i.id === x)[0];
        return it ? '<span class="pf-int">' + it.ic + " " + escaparTexto(it.nome) + "</span>" : "";
      }).join("") + "</div></div>";
  }
  if (id === "atividade") {
    const lista = perfilAtividade(dono);
    if (!lista.length) return "";
    return '<div class="pf-bl"><h4>Atividade recente</h4><div class="pf-ativ">' +
      lista.map(l => '<span class="pf-ativ-l"><b>' + l.ic + "</b>" +
        escaparLongo(l.txt) + "</span>").join("") + "</div></div>";
  }
  if (id === "amigos") {
    /* AMIGOS EM COMUM. No meu próprio perfil não faz sentido -- eu tenho
       todos em comum comigo mesmo. */
    if (souEu) return "";
    const meus = (typeof AM !== "undefined" && AM.lista) || {};
    const nomes = Object.keys(meus).map(u => (meus[u].tag || meus[u].nome)).slice(0, 6);
    if (!nomes.length) return "";
    return '<div class="pf-bl"><h4>Amigos em comum</h4><div class="pf-ints">' +
      nomes.map(n => '<span class="pf-int">' + escaparTexto(n) + "</span>").join("") +
      "</div></div>";
  }
  if (id === "naves") {
    const n = (dono && dono.naves) || (dono && dono.ships ? dono.ships.length : 0);
    const fase = (dono && dono.best) || 0;
    if (!n && !fase) return "";
    return '<div class="pf-bl"><h4>Coleção</h4><div class="pf-nums">' +
      '<span><b>' + fase + "</b>fase</span>" +
      '<span><b>' + (n || 1) + "</b>naves</span>" +
      '<span><b>' + ((dono && dono.prestigio) || 0) + "</b>renascimentos</span>" +
      "</div></div>";
  }
  return "";
}

function estAbrirPerfil(id) {
  const eu = estEu();
  if (!id || !eu) return;
  /* a foto e o castigo vêm da nuvem, então a janela abre primeiro e se
     completa depois: esperar a rede para desenhar deixaria o toque sem
     resposta por um segundo, e um segundo parado parece travado */
  Promise.all([fotoDe(id), bannerDe(id), castigoOlhar(id)]).then(() => estPintarPerfil(id));
  estPintarPerfil(id);
}

function estPintarPerfil(id) {
  const eu = estEu();
  if (!eu) return;
  const souEu = id === eu.id;
  const ficha = souEu ? save : (EST.pilotos[id] || {});
  const v = souEu
    ? { nivel: neoNivel(), selo: neoSelo(), cor: perfilCorDoNome(), efeito: perfilEfeitoDoNome(),
        fonte: perfilFonteDoNome(), brilho: perfilBrilho(),
        fundoCSS: perfilFundoDe(perfilMeu(), neoNivel(), id),
        anima: perfilFundo().anima, bio: perfilMeu().bio, pronomes: perfilMeu().pronomes,
        interesses: perfilInteresses(), blocos: perfilBlocos(),
        particula: perfilParticula().id, borda: perfilBorda().id,
        corTitulo: perfilCorTitulo(), estadoIc: perfilEstadoIc(), vidro: vidroDe(),
        gradiente: gradienteDe(perfilMeu(), neoNivel()),
        corBorda: gradienteCorSecundaria(perfilMeu()),
        textura: perfilTextura().id, fluir: perfilMeu().fluir }
    : perfilComExtras(ficha, id);
  const nome = souEu ? eu.tag : (ficha.nome || "Piloto");
  const onde = estOndeEsta(id);
  const info = neoInfo(v.nivel);
  const foto = FOTOS[id] || "";
  const castigo = CASTIGO_DE[id];
  const blocos = (v.blocos && v.blocos.length) ? v.blocos : PF_BLOCOS_PADRAO;

  /* o vidro fosco e a cor dos títulos viram variáveis no próprio
     cartão: uma troca, e todo bloco lá dentro segue junto. Escrever em
     cada bloco seria a mesma decisão espalhada em seis lugares. */
  const estiloCartao =
    "--pf-blur:" + v.vidro.desfoque + "px;" +
    "--pf-op:" + (v.vidro.opacidade / 100) + ";" +
    /* a borda que brilha sai da cor DE BAIXO do degradê: assim ela
       combina sozinha, sem a pessoa ter que escolher uma terceira cor
       que quase sempre ficaria fora do tom */
    "--pf-borda-cor:" + (v.corBorda || "rgba(120,200,255,.4)") + ";" +
    (v.corTitulo ? "--pf-tit:" + v.corTitulo + ";" : "");

  const cabeca =
    '<div class="pf-banner" style="background:' + (v.fundoCSS || (v.fundo && v.fundo.css)) + '"' +
      (v.anima || (v.fundo && v.fundo.anima) ? ' data-anima="1"' : "") + ">" +
      particulasHTML(v.particula) + "</div>" +
    '<div class="pf-topo">' +
      '<span class="pf-av pf-brilho-' + ((v.brilho && v.brilho.id) || "nenhum") +
        avatarClasse(id) + '" ' + avatarEstilo(id) + ">" +
        (v.estadoIc && v.estadoIc.ic
          ? '<i class="est-luz ic" title="' + escaparTexto(v.estadoIc.nome) + '">' +
            v.estadoIc.ic + "</i>"
          : estLuz(onde)) +
        avatarConteudo(id, nome) + "</span>" +
      '<div class="pf-nome-cx">' +
        '<b class="pf-nome' + perfilClasseDoNome(v) + '" style="' +
        perfilEstiloDoNome(v) + '">' + escaparTexto(nome) + "</b>" +
        (v.pronomes ? '<span class="pf-pron">' + escaparTexto(v.pronomes) + "</span>" : "") +
        '<span class="pf-onde">' + escaparLongo(onde.txt) + "</span>" +
      "</div>" +
      /* A SETINHA DO CASTIGO. Só aparece para o dono do jogo, e só no
         perfil dos outros -- dar castigo em si mesmo não existe. */
      (souOChefe() && !souEu
        ? '<button class="pf-castigo" data-p="castigo" aria-label="Dar castigo">▾</button>' : "") +
      (info && info.id !== "nenhum"
        ? '<span class="pf-neo" style="border-color:' + info.cor + ';color:' + info.cor + '">' +
          info.selo + " " + escaparTexto(info.nome.replace("NEONEBULA ", "")) + "</span>"
        : "") +
    "</div>" +
    (castigo
      ? '<div class="pf-castigado">🔇 De castigo: ' +
        escaparLongo(castigoQuantoFalta(castigo)) + " restantes" +
        (castigo.motivo ? " · " + escaparLongo(castigo.motivo) : "") + "</div>"
      : "");

  /* O MIOLO, com o degradê das duas cores por trás do vidro fosco.
     Ele é separado do banner de propósito: o banner é a capa e pode ser
     uma imagem; aqui é onde o texto mora, e é atrás do texto que a cor
     da pessoa aparece. */
  const corpo = '<div class="pf-miolo' + (v.fluir ? " fluindo" : "") +
    " pf-tex-" + (v.textura || "nenhuma") + '" style="background:' + v.gradiente + '">' +
    blocos.map(b => pfBlocoHTML(b, ficha, v, souEu)).join("") + "</div>";

  const acoes = souEu
    ? '<button class="est-jan-ok" data-p="editar">Editar meu perfil</button>' +
      '<button class="est-jan-ok" data-p="neo">' +
        (neoNivel() === "nenhum" ? "Conhecer o NeoNebula" : "Minha assinatura") + "</button>"
    : '<button class="est-jan-ok" data-p="falar">Conversar</button>' +
      '<button class="est-jan-ok" data-p="ligar">Ligar</button>' +
      '<button class="est-jan-ok" data-p="mudo">' +
        (EST.mudo[id] ? "Voltar a ver" : "Silenciar") + "</button>" +
      '<button class="est-jan-ok" data-p="bloq">' +
        (EST.bloq[id] ? "Desbloquear" : "Bloquear") + "</button>";

  estJanela(souEu ? "Meu perfil" : nome,
    '<div class="pf-cartao pf-borda-' + (v.borda || "linha") + '" style="' + estiloCartao + '">' +
    cabeca + corpo + acoes + "</div>", cx =>
    cx.querySelectorAll("[data-p]").forEach(b => b.addEventListener("click", () => {
      const q = b.getAttribute("data-p");
      if (q === "castigo") { castigoAbrir(id, nome); return; }
      estFecharJanela();
      if (q === "editar") estEditarPerfil();
      else if (q === "neo") estAbrirNeo();
      else if (q === "falar") estAbrir({ tipo: "dm", id, nome });
      else if (q === "ligar") vozLigar(id, nome);
      else if (q === "mudo") { estSilenciar(id, nome); estPintar(); }
      else if (q === "bloq") { estBloquear(id, nome); estPintar(); }
    })));
}

/* =====================================================================
   EDITAR, E SALVAR
   ---------------------------------------------------------------------
   Nada se aplica enquanto a pessoa mexe: ela escolhe, vê a prévia em
   cima, e só o SALVAR grava. Desistir tem que ser possível sem estrago.

   O editor é dividido em abas porque virou grande demais para uma
   rolagem só: com fonte, foto, fundo, duas rodas de cor, efeito,
   brilho, interesses, tema, toque, clique e a ordem dos blocos, uma
   lista corrida faria a pessoa rolar sem achar. Cada aba cabe na tela.
   ===================================================================== */
let estRascunho = null;
let pfAba = "quem";
const PF_ABAS = [
  { id: "quem",  nome: "Quem sou",   ic: "👤" },
  { id: "nome",  nome: "Meu nome",   ic: "✎" },
  { id: "fundo", nome: "Fundo",      ic: "🎨" },
  { id: "ar",    nome: "Atmosfera",  ic: "✨" },
  { id: "jogo",  nome: "O jogo",     ic: "🎮" },
  { id: "ordem", nome: "Arrumar",    ic: "☰" }
];

function estEditarPerfil() {
  const p = perfilMeu();
  estRascunho = {
    bio: p.bio, pronomes: p.pronomes, cor: p.cor, efeito: p.efeito,
    fundo: p.fundo, animacao: p.animacao, fonte: p.fonte, brilho: p.brilho,
    tema: p.tema, toque: p.toque, clique: p.clique,
    interesses: p.interesses, blocos: perfilBlocos().join(","),
    c1h: p.c1h, c1l: p.c1l, c2h: p.c2h, c2l: p.c2l,
    particula: p.particula, borda: p.borda, corTitulo: p.corTitulo,
    estadoIc: p.estadoIc, desfoque: p.desfoque, opacidade: p.opacidade,
    horaDoDia: p.horaDoDia
  };
  pfAba = "quem";
  estPintarEditor();
}

/* a prévia do cartão, igual em todas as abas: mexer e ver mudar na hora
   é o que faz a pessoa entender o que está escolhendo */
function pfPreviaHTML() {
  const r = estRascunho, eu = estEu();
  const corItem = neoAchar(NEO_CORES, r.cor);
  const efItem = neoAchar(NEO_EFEITOS, r.efeito);
  const fonte = neoAchar(NEO_FONTES, r.fonte) || NEO_FONTES[0];
  const fundoCSS = perfilFundoDe(r, neoNivel(), eu.id);
  const foto = FOTOS[eu.id] || "";
  let estilo = "";
  if (corItem) estilo += "color:" + corItem.cor + ";";
  estilo += "font-family:" + fonte.css + ";";
  if (fonte.espaco) estilo += "letter-spacing:" + fonte.espaco + ";";
  const grad = gradienteDe(r, neoNivel());
  return '<div class="pf-banner" style="background:' + fundoCSS + '">' +
    particulasHTML(r.particula) + "</div>" +
    '<div class="pf-miolo-previa' + (r.fluir ? " fluindo" : "") +
    " pf-tex-" + (r.textura || "nenhuma") + '" style="background:' + grad + '"></div>' +
    '<div class="pf-topo">' +
      '<span class="pf-av pf-brilho-' + (r.brilho || "nenhum") + avatarClasse(eu.id) +
      '" ' + avatarEstilo(eu.id) + ">" + avatarConteudo(eu.id, eu.tag) + "</span>" +
      '<div class="pf-nome-cx"><b class="pf-nome' +
        (efItem && efItem.id !== "nenhum" ? " neo-ef neo-" + efItem.id : "") +
        '" style="' + estilo + '">' + escaparTexto(eu.tag) + "</b>" +
        (r.pronomes ? '<span class="pf-pron">' + escaparTexto(r.pronomes) + "</span>" : "") +
      "</div></div>";
}

function estPintarEditor() {
  const r = estRascunho;
  const eu = estEu();
  if (!r || !eu) return;

  /* cada grade mostra TUDO, e o que está travado aparece com cadeado em
     vez de sumir: ver o que existe é metade do motivo de assinar */
  const grade = (lista, campo, desenha) =>
    '<div class="pf-grade">' + lista.map(it => {
      const livre = neoLiberado(it);
      return '<button class="pf-op' + (r[campo] === it.id ? " on" : "") +
        (livre ? "" : " travado") + '" data-campo="' + campo + '" data-id="' + it.id + '"' +
        (livre ? "" : ' title="Precisa do NeoNebula ' + it.nivel + '">') + ">" +
        desenha(it) + (livre ? "" : '<i class="pf-cad">🔒</i>') + "</button>";
    }).join("") + "</div>";

  let corpo = "";
  if (pfAba === "quem") {
    corpo =
      '<div class="pf-campo"><label>Sua foto</label>' +
      '<div class="pf-foto-linha">' +
        '<span class="pf-foto-previa' + avatarClasse(eu.id) + '" ' +
          avatarEstilo(eu.id) + ">" + avatarConteudo(eu.id, eu.tag) + "</span>" +
        '<div class="pf-foto-bts">' +
          '<button class="pf-bt" id="pf-foto">Escolher imagem</button>' +
          (FOTOS[eu.id] ? '<button class="pf-bt fraco" id="pf-foto-x">Tirar a foto</button>' : "") +
          '<input type="file" id="pf-arq" accept="image/*" hidden>' +
        "</div>" +
      "</div>" +
      '<p class="est-nota">A imagem é recortada no quadrado e encolhida para 96×96 aqui ' +
      "mesmo, no seu aparelho, antes de subir. Assim ela pesa uns 4 KB em vez de 4 MB.</p></div>" +

      '<div class="pf-campo"><label>Pronomes</label>' +
      '<input id="pf-pron" maxlength="20" value="' + escaparTexto(r.pronomes) +
      '" placeholder="ele/dele, ela/dela, elu/delu…" autocomplete="off"></div>' +

      '<div class="pf-campo"><label>Sobre mim ' +
      '<i id="pf-conta">' + (r.bio || "").length + "/" + perfilLimiteBio() + "</i></label>" +
      '<textarea id="pf-bio" maxlength="' + perfilLimiteBio() +
      '" rows="4" placeholder="Conte alguma coisa sua">' + escaparLongo(r.bio) + "</textarea>" +
      (neoTem("bronze") ? "" : '<p class="est-nota">Com o NeoNebula a bio vai a 300 letras.</p>') +
      "</div>" +

      '<div class="pf-campo"><label>Interesses <i>' +
        perfilInteresses({ perfil: { interesses: r.interesses }, neo: save.neo }).length +
        "/" + (INTERESSES_MAX[neoNivel()] || 2) + "</i></label>" +
      '<div class="pf-ints escolher">' + NEO_INTERESSES.map(it => {
        const tem = String(r.interesses || "").split(",").indexOf(it.id) >= 0;
        return '<button class="pf-int' + (tem ? " on" : "") + '" data-int="' + it.id + '">' +
               it.ic + " " + escaparTexto(it.nome) + "</button>";
      }).join("") + "</div></div>";

  } else if (pfAba === "nome") {
    corpo =
      '<div class="pf-campo"><label>Fonte do nome</label>' +
      grade(NEO_FONTES, "fonte", f =>
        '<span class="pf-fonte" style="font-family:' + f.css + '">Aa</span><em>' +
        escaparTexto(f.nome) + "</em>") + "</div>" +

      '<div class="pf-campo"><label>Cor do nome</label>' +
      grade(NEO_CORES, "cor", c =>
        '<span class="pf-bola" style="background:' + c.cor + '"></span><em>' +
        escaparTexto(c.nome) + "</em>") + "</div>" +

      '<div class="pf-campo"><label>Efeito do nome</label>' +
      grade(NEO_EFEITOS, "efeito", e =>
        '<span class="pf-ef neo-ef neo-' + e.id + '">' + escaparTexto(eu.tag).slice(0, 6) +
        "</span><em>" + escaparTexto(e.nome) + "</em>") + "</div>" +

      '<div class="pf-campo"><label>Brilho do avatar</label>' +
      grade(NEO_BRILHOS, "brilho", b =>
        '<span class="pf-av pequeno pf-brilho-' + b.id + '">' +
        escaparTexto(estIni(eu.tag)) + "</span><em>" + escaparTexto(b.nome) + "</em>") + "</div>";

  } else if (pfAba === "fundo") {
    /* AS DUAS RODAS, uma em cima e uma embaixo, como foi pedido: a de
       cima escolhe a cor onde o banner começa, a de baixo a cor onde ele
       termina. Nenhuma das duas encosta no banner nem na bio -- elas
       ficam entre os dois. */
    corpo =
      '<div class="pf-campo"><label>Duas cores suas</label>' +
      '<div class="pf-rodas">' +
        rodaHTML("c1", r.c1h, r.c1l, "Cor de cima") +
        '<span class="pf-faixa" id="pf-faixa" style="background:linear-gradient(180deg,' +
          corDeHSL(r.c1h, r.c1l) + "," + corDeHSL(r.c2h, r.c2l) + ')"></span>' +
        rodaHTML("c2", r.c2h, r.c2l, "Cor de baixo") +
      "</div>" +
      '<p class="est-nota">Mexa na roda para a cor e na barrinha para o tom. ' +
      "Estas duas cores pintam o MIOLO do seu perfil — a área da bio, dos " +
      "pronomes e dos emblemas. O banner é escolhido separado, logo abaixo.</p>" +

      '<div class="pf-prontos">' + NEO_PRONTOS.map(x =>
        '<button class="pf-pronto" data-pronto="' + x.id + '" title="' + escaparTexto(x.nome) +
        '" style="background:linear-gradient(150deg,' + corDeHSL(x.c1h, x.c1l) + "," +
        corDeHSL(x.c2h, x.c2l) + ')"></button>').join("") + "</div>" +

      '<div class="pf-barra-l"><span>Ângulo</span>' +
      '<input type="range" id="pf-ang" min="0" max="359" value="' + (r.angulo || 150) + '">' +
      '<b id="pf-ang-n">' + (r.angulo || 150) + "°</b></div>" +

      '<label class="enq-check"><input type="checkbox" id="pf-fluir"' +
      (r.fluir ? " checked" : "") + "> As cores se movem devagar</label>" +
      "</div>" +

      '<div class="pf-campo"><label>Formato do degradê</label>' +
      grade(NEO_FORMATOS, "formato", f =>
        '<span class="pf-mini" style="background:' +
        (f.id === "radial" ? "radial-gradient(circle,#4DE8FF,#2B0B4A)"
          : f.id === "conico" ? "conic-gradient(#4DE8FF,#C34DFF,#4DE8FF)"
          : "linear-gradient(150deg,#4DE8FF,#2B0B4A)") + '"></span><em>' +
        escaparTexto(f.nome) + "</em>") + "</div>" +

      '<div class="pf-campo"><label>Textura por cima</label>' +
      grade(NEO_TEXTURAS, "textura", x =>
        '<span class="pf-mini pf-tex-' + x.id + '" style="background:#2B3A5A;position:relative">' +
        "</span><em>" + escaparTexto(x.nome) + "</em>") + "</div>" +

      '<div class="pf-campo"><label>Ou uma imagem sua</label>' +
      '<div class="pf-foto-linha">' +
        '<span class="pf-banner-previa"' +
          (BANNERS[eu.id] ? ' style="background-image:url(' + BANNERS[eu.id] + ')"' : "") + ">" +
          (BANNERS[eu.id] ? "" : "sem imagem") + "</span>" +
        '<div class="pf-foto-bts">' +
          '<button class="pf-bt' + (r.fundo === "foto" ? " on" : "") + '" id="pf-banner">' +
          (BANNERS[eu.id] ? "Trocar a imagem" : "Escolher imagem") + "</button>" +
          (BANNERS[eu.id] ? '<button class="pf-bt fraco" id="pf-banner-x">Tirar a imagem</button>' : "") +
          '<input type="file" id="pf-barq" accept="image/*" hidden>' +
        "</div></div>" +
      '<p class="est-nota">Recortada e encolhida para 640×360 aqui no seu aparelho. ' +
      "Vídeo e GIF em alta não dão: um vídeo de três segundos é maior que o jogo inteiro.</p></div>" +

      '<label class="enq-check"><input type="checkbox" id="pf-hora"' +
      (r.horaDoDia ? " checked" : "") + "> As suas cores mudam com a hora do dia</label>" +

      '<div class="pf-campo"><label>Ou um fundo pronto</label>' +
      grade(NEO_FUNDOS, "fundo", f =>
        '<span class="pf-mini" style="background:' + f.css + '"></span><em>' +
        escaparTexto(f.nome) + "</em>") + "</div>";

  } else if (pfAba === "ar") {
    const vd = { desfoque: r.desfoque === undefined ? 10 : r.desfoque,
                 opacidade: r.opacidade === undefined ? 82 : r.opacidade };
    corpo =
      '<div class="pf-campo"><label>Partículas no fundo</label>' +
      grade(NEO_PARTICULAS, "particula", x =>
        '<span class="pf-mini escura">' + particulasHTML(x.id) + "</span><em>" +
        escaparTexto(x.nome) + "</em>") + "</div>" +

      /* VIDRO FOSCO: as duas barrinhas andam juntas de propósito. Painel
         transparente SEM desfoque põe o texto por cima da imagem e
         ninguém lê nada -- é o desfoque que torna a transparência
         possível, e por isso as duas moram no mesmo cartão. */
      '<div class="pf-campo"><label>Vidro fosco</label>' +
      '<div class="pf-barra-l"><span>Desfoque</span>' +
      '<input type="range" id="pf-blur" min="0" max="24" value="' + vd.desfoque + '">' +
      '<b id="pf-blur-n">' + vd.desfoque + "px</b></div>" +
      '<div class="pf-barra-l"><span>Opacidade</span>' +
      '<input type="range" id="pf-op" min="35" max="100" value="' + vd.opacidade + '">' +
      '<b id="pf-op-n">' + vd.opacidade + "%</b></div>" +
      '<p class="est-nota">Quanto mais transparente o painel, mais o fundo aparece ' +
      "por trás. O desfoque é o que mantém o texto legível.</p></div>" +

      '<div class="pf-campo"><label>Moldura das seções</label>' +
      grade(NEO_BORDAS, "borda", x =>
        '<span class="pf-mini borda-' + x.id + '"></span><em>' +
        escaparTexto(x.nome) + "</em>") + "</div>" +

      '<div class="pf-campo"><label>Cor dos títulos</label>' +
      grade(NEO_CORES, "corTitulo", c =>
        '<span class="pf-bola" style="background:' + c.cor + '"></span><em>' +
        escaparTexto(c.nome) + "</em>") + "</div>" +

      '<div class="pf-campo"><label>Ícone de estado</label>' +
      grade(NEO_ESTADOS, "estadoIc", x =>
        '<span class="pf-bola">' + (x.ic || "●") + "</span><em>" +
        escaparTexto(x.nome) + "</em>") +
      '<p class="est-nota">Aparece no canto do seu avatar, no lugar da bolinha colorida.</p>' +
      "</div>";

  } else if (pfAba === "jogo") {
    corpo =
      /* O TEMA VEM PRIMEIRO porque ele manda em tudo o que está embaixo:
         escolher o destaque antes de escolher o tema é escolher a cor da
         parede antes de saber a cor da casa. */
      '<div class="pf-campo"><label>Tema do jogo</label>' +
      grade(NEO_TEMAS_10, "tema10", t =>
        '<span class="pf-tema" style="' + temaAmostraCSS(t) + '">' +
        '<i style="background:' + temaAmostraDestaque(t) + '"></i></span><em>' +
        escaparTexto(t.nome) + "</em>") +
      /* a explicação fala do tema que está MARCADO no rascunho, não do
         que está salvo: quem toca em Cyberpunk quer ler sobre o
         Cyberpunk, e não sobre o tema que ele acabou de trocar */
      '<p class="est-nota">Muda o fundo, os cartões e as letras do jogo inteiro — ' +
      "não só desta tela. " +
      escaparLongo(temaAchar(r.tema10).sobre || "Você escolhe o fundo e o destaque.") +
      " Vale ao salvar.</p></div>" +

      '<div class="pf-campo"><label>Cor de destaque</label>' +
      grade(NEO_TEMAS, "tema", t =>
        '<span class="pf-bola" style="background:' +
        (t.cor || "linear-gradient(135deg,var(--cyan),var(--violet))") +
        '"></span><em>' + escaparTexto(t.nome) + "</em>") +
      '<p class="est-nota">Entra por cima do tema. Em “Do tema” fica a cor que o ' +
      "tema escolheu.</p></div>" +

      '<div class="pf-campo"><label>Rastro da nave</label>' +
      grade(NEO_ANIMACOES, "animacao", a =>
        '<span class="pf-rastro" style="background:' +
        (a.cor === "arco" ? "linear-gradient(90deg,#FF4D8F,#FFC145,#5BF0B0,#4DE8FF)"
                          : (a.cor || "rgba(255,255,255,.12)")) + '"></span><em>' +
        escaparTexto(a.nome) + "</em>") + "</div>" +

      '<div class="pf-campo"><label>Toque de aviso</label>' +
      grade(NEO_TOQUES, "toque", t =>
        '<span class="pf-bola" style="background:rgba(120,200,255,.25)">♪</span><em>' +
        escaparTexto(t.nome) + "</em>") + "</div>" +

      '<div class="pf-campo"><label>Efeito de clique</label>' +
      grade(NEO_CLIQUES, "clique", c =>
        '<span class="pf-bola" style="background:rgba(195,77,255,.25)">✦</span><em>' +
        escaparTexto(c.nome) + "</em>") + "</div>";

  } else {
    /* ARRUMAR: quais blocos aparecem e em que ordem. Subir e descer em
       botão, e não arrastando: arrastar numa lista dentro de uma janela
       que já rola briga com a rolagem, e no celular vira loteria. */
    const atuais = String(r.blocos || "").split(",").filter(Boolean);
    corpo = '<div class="pf-campo"><label>O que aparece no meu perfil</label>' +
      '<div class="pf-ordem">' + atuais.map((bid, i) => {
        const b = PF_BLOCOS.filter(x => x.id === bid)[0];
        if (!b) return "";
        return '<div class="pf-ord-l"><b>' + escaparTexto(b.nome) + "</b>" +
          '<button class="pf-ord-b" data-sobe="' + i + '" aria-label="Subir"' +
            (i === 0 ? " disabled" : "") + ">↑</button>" +
          '<button class="pf-ord-b" data-desce="' + i + '" aria-label="Descer"' +
            (i === atuais.length - 1 ? " disabled" : "") + ">↓</button>" +
          (b.sempre ? '<span class="pf-ord-fixo">sempre</span>'
                    : '<button class="pf-ord-b tira" data-tira="' + bid + '">✕</button>') +
          "</div>";
      }).join("") + "</div>" +
      (PF_BLOCOS.filter(b => atuais.indexOf(b.id) < 0).length
        ? '<label style="margin-top:12px">Guardados</label><div class="pf-ints">' +
          PF_BLOCOS.filter(b => atuais.indexOf(b.id) < 0).map(b =>
            '<button class="pf-int" data-poe="' + b.id + '">+ ' +
            escaparTexto(b.nome) + "</button>").join("") + "</div>"
        : "") + "</div>";
  }

  estJanela("Editar meu perfil",
    '<div class="pf-previa">' + pfPreviaHTML() + "</div>" +
    '<div class="pf-abas">' + PF_ABAS.map(a =>
      '<button class="pf-aba' + (a.id === pfAba ? " on" : "") + '" data-pfaba="' + a.id + '">' +
      a.ic + " " + a.nome + "</button>").join("") + "</div>" +
    '<div class="pf-corpo">' + corpo + "</div>" +
    '<div class="pf-pe">' +
      '<button class="est-jan-ok salvar" id="pf-salvar">Salvar</button>' +
      '<button class="est-jan-ok" id="pf-cancelar">Cancelar</button>' +
    "</div>",
    cx => {
      cx.querySelectorAll("[data-pfaba]").forEach(b => b.addEventListener("click", () => {
        pfAba = b.getAttribute("data-pfaba");
        estPintarEditor();
      }));
      cx.querySelectorAll("[data-campo]").forEach(b =>
        b.addEventListener("click", () => {
          if (b.classList.contains("travado")) {
            estAvisar("Isso é do NeoNebula. Toque em Meu perfil › assinatura para ver.");
            return;
          }
          const campo = b.getAttribute("data-campo");
          /* a cor do nome é a única que dá para TIRAR: tocar na que já
             está escolhida volta ao normal */
          estRascunho[campo] = (campo === "cor" && estRascunho.cor === b.getAttribute("data-id"))
            ? "" : b.getAttribute("data-id");
          if (campo === "toque") { estRascunho.toque = b.getAttribute("data-id"); }
          estPintarEditor();
          /* o toque de aviso tem que TOCAR na hora de escolher: escolher
             um som sem ouvir é escolher no escuro */
          if (campo === "toque") { const g = perfilToque; try { toqueDemo(estRascunho.toque); } catch (e) {} }
        }));
      /* as duas rodas */
      if (pfAba === "fundo") {
        const pintaFaixa = () => {
          const f = $("pf-faixa");
          if (f) f.style.background = "linear-gradient(180deg," +
            corDeHSL(estRascunho.c1h, estRascunho.c1l) + "," +
            corDeHSL(estRascunho.c2h, estRascunho.c2l) + ")";
        };
        rodaLigar("c1", r.c1h, r.c1l, (h, l) => {
          estRascunho.c1h = h; estRascunho.c1l = l; pintaFaixa(); pfAtualizarPrevia();
        });
        rodaLigar("c2", r.c2h, r.c2l, (h, l) => {
          estRascunho.c2h = h; estRascunho.c2l = l; pintaFaixa(); pfAtualizarPrevia();
        });
        const ang = $("pf-ang"), angN = $("pf-ang-n");
        if (ang) ang.addEventListener("input", () => {
          estRascunho.angulo = parseInt(ang.value, 10);
          if (angN) angN.textContent = ang.value + "°";
          pintaFaixa(); pfAtualizarPrevia();
        });
        const flui = $("pf-fluir");
        if (flui) flui.addEventListener("change", () => {
          estRascunho.fluir = flui.checked ? 1 : 0;
          pfAtualizarPrevia();
        });
        cx.querySelectorAll("[data-pronto]").forEach(b =>
          b.addEventListener("click", () => {
            const x = NEO_PRONTOS.filter(y => y.id === b.getAttribute("data-pronto"))[0];
            if (!x) return;
            estRascunho.c1h = x.c1h; estRascunho.c1l = x.c1l;
            estRascunho.c2h = x.c2h; estRascunho.c2l = x.c2l;
            estPintarEditor();
          }));
      }
      /* as barrinhas do vidro fosco: mexem a prévia na hora, sem
         repintar a aba inteira -- repintar faria o dedo perder a barra */
      const liga = (idBarra, idNum, campo, sufixo) => {
        const b = $(idBarra), n = $(idNum);
        if (!b) return;
        b.addEventListener("input", () => {
          estRascunho[campo] = parseInt(b.value, 10);
          if (n) n.textContent = b.value + sufixo;
          pfAtualizarPrevia();
        });
      };
      liga("pf-blur", "pf-blur-n", "desfoque", "px");
      liga("pf-op", "pf-op-n", "opacidade", "%");
      const hora = $("pf-hora");
      if (hora) hora.addEventListener("change", () => {
        estRascunho.horaDoDia = hora.checked ? 1 : 0;
        pfAtualizarPrevia();
      });
      /* o banner de imagem */
      const bban = $("pf-banner"), barq = $("pf-barq"), btira = $("pf-banner-x");
      if (bban && barq) {
        bban.addEventListener("click", () => barq.click());
        barq.addEventListener("change", async () => {
          if (!barq.files || !barq.files[0]) return;
          if (await bannerGuardar(barq.files[0])) {
            estRascunho.fundo = "foto";
            estPintarEditor();
          }
        });
      }
      if (btira) btira.addEventListener("click", async () => {
        await bannerApagar();
        if (estRascunho.fundo === "foto") estRascunho.fundo = "meu";
        estPintarEditor();
      });
      /* a foto */
      const bfoto = $("pf-foto"), arq = $("pf-arq"), tira = $("pf-foto-x");
      if (bfoto && arq) {
        bfoto.addEventListener("click", () => arq.click());
        arq.addEventListener("change", async () => {
          if (!arq.files || !arq.files[0]) return;
          if (await fotoGuardar(arq.files[0])) estPintarEditor();
        });
      }
      if (tira) tira.addEventListener("click", async () => {
        await fotoApagar();
        estPintarEditor();
      });
      /* os interesses */
      cx.querySelectorAll("[data-int]").forEach(b => b.addEventListener("click", () => {
        const id = b.getAttribute("data-int");
        const atual = String(estRascunho.interesses || "").split(",").filter(Boolean);
        const onde = atual.indexOf(id);
        const teto = INTERESSES_MAX[neoNivel()] || 2;
        if (onde >= 0) atual.splice(onde, 1);
        else if (atual.length >= teto) {
          estAvisar("Dá para escolher " + teto + ". Com o NeoNebula cabem mais.");
          return;
        } else atual.push(id);
        estRascunho.interesses = atual.join(",");
        estPintarEditor();
      }));
      /* arrumar a ordem */
      const mexer = (de, para) => {
        const l = String(estRascunho.blocos || "").split(",").filter(Boolean);
        if (para < 0 || para >= l.length) return;
        const x = l[de]; l[de] = l[para]; l[para] = x;
        estRascunho.blocos = l.join(",");
        estPintarEditor();
      };
      cx.querySelectorAll("[data-sobe]").forEach(b => b.addEventListener("click", () => {
        const i = parseInt(b.getAttribute("data-sobe"), 10); mexer(i, i - 1);
      }));
      cx.querySelectorAll("[data-desce]").forEach(b => b.addEventListener("click", () => {
        const i = parseInt(b.getAttribute("data-desce"), 10); mexer(i, i + 1);
      }));
      cx.querySelectorAll("[data-tira]").forEach(b => b.addEventListener("click", () => {
        estRascunho.blocos = String(estRascunho.blocos || "").split(",")
          .filter(x => x && x !== b.getAttribute("data-tira")).join(",");
        estPintarEditor();
      }));
      cx.querySelectorAll("[data-poe]").forEach(b => b.addEventListener("click", () => {
        const l = String(estRascunho.blocos || "").split(",").filter(Boolean);
        l.push(b.getAttribute("data-poe"));
        estRascunho.blocos = l.join(",");
        estPintarEditor();
      }));
      /* os textos */
      const bio = $("pf-bio"), conta = $("pf-conta");
      if (bio) bio.addEventListener("input", () => {
        estRascunho.bio = bio.value;
        if (conta) conta.textContent = bio.value.length + "/" + perfilLimiteBio();
      });
      const pron = $("pf-pron");
      if (pron) pron.addEventListener("input", () => {
        estRascunho.pronomes = pron.value;
        pfAtualizarPrevia();
      });
      $("pf-cancelar").addEventListener("click", () => { estRascunho = null; estFecharJanela(); });
      $("pf-salvar").addEventListener("click", () => {
        perfilSalvar(estRascunho);
        estRascunho = null;
        estFecharJanela();
        estAvisar("Perfil salvo.");
        temaAplicar();
        estPintar();
      });
    });
}

/* a prévia se repinta sozinha sem refazer a aba inteira: repintar tudo a
   cada grau da roda faria o dedo perder o arrasto no meio */
function pfAtualizarPrevia() {
  const cx = document.querySelector(".pf-previa");
  if (cx && estRascunho) cx.innerHTML = pfPreviaHTML();
}

/* toca o som escolhido na hora de escolher */
function toqueDemo(id) {
  const t = NEO_TOQUES.filter(x => x.id === id)[0];
  if (!t || !t.nota) return;
  const guardado = perfilMeu().toque;
  perfilMeu().toque = id;
  toqueTocar();
  perfilMeu().toque = guardado;
}

/* ---------- a loja do NeoNebula ---------- */
function estAbrirNeo() {
  const agora = neoNivel();
  const meu = neoInfo(agora);
  const dias = neoDiasQueFaltam();
  const cabeca = agora === "nenhum"
    ? '<p class="est-nota">Três níveis, cada um valendo 30 dias. O que você escolher ' +
      "aparece para todo mundo no bate-papo e no ranking.</p>"
    : '<div class="neo-meu" style="border-color:' + meu.cor + '"><b style="color:' + meu.cor +
      '">' + meu.selo + " " + escaparTexto(meu.nome) + "</b><span>" +
      (dias === Infinity ? "sem prazo para acabar" : "faltam " + dias + " dias") + "</span></div>";

  estJanela("NeoNebula",
    cabeca +
    NEO_NIVEIS.filter(n => !n.oculto).map(n =>
      '<div class="neo-cx" style="border-color:' + n.cor + '33">' +
        '<div class="neo-h"><b style="color:' + n.cor + '">' + n.selo + " " +
        escaparTexto(n.nome) + "</b>" +
        '<span class="neo-preco">' + reais(n.preco) + "<em>/30 dias</em></span></div>" +
        '<p class="neo-resumo">' + escaparTexto(n.resumo) + "</p>" +
        "<ul class=\"neo-lista\">" + n.beneficios.map(b =>
          "<li>" + escaparTexto(b) + "</li>").join("") + "</ul>" +
        '<button class="est-jan-ok" data-neo="' + n.id + '">' +
        (NEO_ORDEM[agora] >= NEO_ORDEM[n.id] ? "RENOVAR POR 30 DIAS" : "ASSINAR") + "</button>" +
      "</div>").join("") +
    '<p class="est-nota">O pagamento é por Pix e a entrega é automática: assim que ' +
    "cai, o nível entra na sua conta sozinho. Não é cobrança automática — quando os " +
    "30 dias acabarem, você escolhe se renova.</p>",
    cx => cx.querySelectorAll("[data-neo]").forEach(b =>
      b.addEventListener("click", () => {
        const n = neoInfo(b.getAttribute("data-neo"));
        if (!n) return;
        estFecharJanela();
        estacaoFechar();
        /* usa a MESMA tela de pagamento do resto da loja: uma só, para
           não haver dois jeitos de pagar que um dia divergem */
        abrirPagamento("neo_" + n.id, n.nome, n.preco,
                       { neo: { nivel: n.id, dias: n.dias } });
      })));
}

/* =====================================================================
   O SELETOR DE ESTADO
   ---------------------------------------------------------------------
   Quatro estados e um recado. O que muda de verdade em cada um está
   escrito embaixo do nome — porque "Não perturbe" só quer dizer alguma
   coisa se a pessoa souber que o som some.
   ===================================================================== */
function estAbrirStatus() {
  const agora = presencaEscolhida();
  const valendo = presencaAgora();
  const r = recadoMeu();
  estJanela("Como eu apareço",
    PRESENCAS.map(p =>
      '<button class="est-status' + (agora === p.id ? " on" : "") + '" data-pres="' + p.id + '">' +
      '<i style="color:' + p.cor + '">' + p.ic + "</i>" +
      "<span><strong>" + escaparTexto(p.nome) + "</strong>" +
      "<em>" + escaparLongo(p.sobre) + "</em></span>" +
      (agora === p.id ? '<b class="est-status-ok">✓</b>' : "") + "</button>").join("") +
    (valendo === "ausente" && agora === "online"
      ? '<p class="est-nota">Agora você está aparecendo como <b>ausente</b>, porque ficou ' +
        "uns minutos sem mexer. Toca em qualquer coisa e volta sozinho.</p>" : "") +

    '<div class="pf-campo" style="margin-top:14px"><label>RECADO</label>' +
    '<div class="est-add-linha">' +
    '<input id="est-rec-emoji" maxlength="2" value="' + escaparTexto((r && r.emoji) || "") +
    '" placeholder="🙂" style="flex:0 0 54px;text-align:center">' +
    '<input id="est-rec-txt" maxlength="60" value="' + escaparLongo((r && r.txt) || "") +
    '" placeholder="o que você está fazendo?"></div>' +
    '<label style="margin-top:9px">SUMIR DEPOIS DE</label>' +
    '<div class="est-prazos">' + PRESENCA_PRAZOS.map(pz =>
      '<button class="est-prazo" data-prazo="' + pz.id + '">' +
      escaparTexto(pz.nome) + "</button>").join("") + "</div>" +
    '<button class="est-jan-ok salvar" id="est-rec-salvar">SALVAR RECADO</button>' +
    (r ? '<button class="est-jan-ok" id="est-rec-tirar">tirar o recado</button>' : "") +
    "</div>",
    cx => {
      cx.querySelectorAll("[data-pres]").forEach(b =>
        b.addEventListener("click", () => {
          presencaTrocar(b.getAttribute("data-pres"));
          estFecharJanela();
          estAvisar("Agora você aparece como " +
                    presencaInfo(presencaEscolhida()).nome.toLowerCase() + ".");
        }));
      let prazo = "0";
      const pinta = () => cx.querySelectorAll("[data-prazo]").forEach(x =>
        x.classList.toggle("on", x.getAttribute("data-prazo") === prazo));
      cx.querySelectorAll("[data-prazo]").forEach(b =>
        b.addEventListener("click", () => { prazo = b.getAttribute("data-prazo"); pinta(); }));
      pinta();
      $("est-rec-salvar").addEventListener("click", () => {
        recadoDefinir($("est-rec-txt").value, prazo, $("est-rec-emoji").value);
        estFecharJanela();
        estPintar();
        estAvisar("Recado salvo.");
      });
      const tirar = $("est-rec-tirar");
      if (tirar) tirar.addEventListener("click", () => {
        recadoDefinir("");
        estFecharJanela();
        estPintar();
      });
    });
}

/* =====================================================================
   SILENCIAR UM CANAL, UM GRUPO OU A ESTAÇÃO INTEIRA
   ---------------------------------------------------------------------
   Por 15 minutos, 1 hora, 8 horas, 24 horas, ou até religar. Silenciado
   não avisa nem apita — mas continua tendo o pontinho, porque sumir com
   a conversa não é silenciar, é esconder.
   ===================================================================== */
function estAbrirSilenciar(chave, nome) {
  const ja = silenciado(chave);
  estJanela("Silenciar " + nome,
    '<p class="est-nota">Silenciado, isto para de te avisar e de apitar. ' +
    "As mensagens continuam chegando normalmente.</p>" +
    (ja ? '<button class="est-jan-ok salvar" id="est-sil-tirar">VOLTAR A AVISAR</button>' : "") +
    '<div class="est-prazos" style="margin-top:10px">' + SILENCIO_PRAZOS.map(pz =>
      '<button class="est-prazo" data-sil="' + pz.id + '">' +
      escaparTexto(pz.nome) + "</button>").join("") + "</div>",
    cx => {
      cx.querySelectorAll("[data-sil]").forEach(b =>
        b.addEventListener("click", () => {
          silenciar(chave, b.getAttribute("data-sil"));
          estFecharJanela();
          estPintar();
          estAvisar(nome + " silenciado.");
        }));
      const t = $("est-sil-tirar");
      if (t) t.addEventListener("click", () => {
        silenciar(chave, null);
        estFecharJanela();
        estPintar();
        estAvisar(nome + " volta a avisar.");
      });
    });
}
