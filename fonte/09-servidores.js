/* =====================================================================
   SERVIDORES — comunidades dentro da Estação
   =====================================================================
   Cada um pode criar o seu, com canais, cargos, convites, moderação e
   registro de tudo o que acontece.

   ONDE MORA NA NUVEM
   ---------------------------------------------------------------------
     servidores/<sid>/info        nome, dono, tag, impulsos, comunidade
     servidores/<sid>/membros/<uid>
     servidores/<sid>/cargos/<rid>
     servidores/<sid>/canais/<cid>
     servidores/<sid>/convites/<codigo>
     servidores/<sid>/banidos/<uid>
     servidores/<sid>/auditoria/<k>
     servidores/<sid>/emojis/<eid>
     conversas/srv__<sid>__<cid>  as mensagens de cada canal
     amigos/<uid>/servidores/<sid> os meus servidores, para eu achar

   "servidores/" É UM GALHO NOVO, e galho novo é galho recusado enquanto
   as regras antigas estiverem coladas no Firebase. Por isso duas coisas:
   ele entra no gerador de regras do painel, e toda escrita que voltar
   negada AVISA, em vez de sumir calada. Já perdemos versões inteiras
   para erro que não fala.

   AS MENSAGENS CONTINUAM EM "conversas/", que é galho velho e liberado:
   assim, mesmo com as regras antigas, o que já funciona continua
   funcionando e só o servidor em si fica de fora.
   ===================================================================== */

/* =====================================================================
   GUARDADO, NÃO APAGADO
   ---------------------------------------------------------------------
   Os servidores estão desligados. Foi decisão do dono do jogo: criar
   servidor virou uma segunda casa vazia ao lado da Estação, e quem
   entrava não achava ninguém lá dentro. A comunidade é uma só, e é o
   chat global — #geral, #trocas, #ajuda — que a enche.

   E havia um motivo técnico junto: "servidores/" é galho NOVO no banco,
   e as contas com as regras antigas do Firebase recusavam a gravação. O
   botão CRIAR existia, a janela abria, e nada acontecia. Um botão que
   não faz nada é pior que um botão que não existe.

   Desligado assim: o + some da barra, a seção inteira não é desenhada,
   e nada do que está aqui é montado. Religar é trocar false por true --
   o sistema inteiro (cargos, 50 permissões, moderação, impulsos, tag)
   continua aqui, inteiro, esperando.
   ===================================================================== */
const SERVIDORES_LIGADOS = false;

/* Os grupos privados saíram junto, e pelo mesmo motivo: a conversa é
   para ser global. Quem quer falar com uma pessoa tem a conversa
   reservada; quem quer falar com todo mundo tem os canais. */
const GRUPOS_LIGADOS = false;

/* =====================================================================
   AS PERMISSÕES
   ---------------------------------------------------------------------
   Cinquenta, em cinco famílias de dez. Não é enfeite: cada uma é
   perguntada em algum lugar do código antes de deixar fazer.

   ADMINISTRADOR vale por todas, e isso é de propósito — sem um curinga,
   o dono precisaria marcar cinquenta caixas para o primeiro moderador, e
   ia marcar errado.
   ===================================================================== */
const PERMS = [
  /* ---- servidor (10) ---- */
  { id: "admin",        g: "servidor", nome: "Administrador", sobre: "vale por todas as outras" },
  { id: "gerirServidor",g: "servidor", nome: "Gerenciar o servidor", sobre: "nome, ícone, descrição" },
  { id: "gerirCargos",  g: "servidor", nome: "Gerenciar cargos", sobre: "criar, apagar e dar cargos" },
  { id: "gerirCanais",  g: "servidor", nome: "Gerenciar canais", sobre: "criar, apagar e renomear" },
  { id: "gerirEmojis",  g: "servidor", nome: "Gerenciar emojis", sobre: "emojis e figurinhas" },
  { id: "gerirConvites",g: "servidor", nome: "Gerenciar convites", sobre: "ver e apagar convites" },
  { id: "gerirApelidos",g: "servidor", nome: "Gerenciar apelidos", sobre: "mudar o apelido dos outros" },
  { id: "verAuditoria", g: "servidor", nome: "Ver o registro", sobre: "tudo o que aconteceu" },
  { id: "gerirWebhooks",g: "servidor", nome: "Gerenciar avisos externos", sobre: "mandar para fora" },
  { id: "gerirEventos", g: "servidor", nome: "Gerenciar eventos", sobre: "criar e cancelar eventos" },

  /* ---- moderação (10) ---- */
  { id: "expulsar",     g: "moderacao", nome: "Expulsar membros", sobre: "tira, mas pode voltar" },
  { id: "banir",        g: "moderacao", nome: "Banir membros", sobre: "tira e não volta" },
  { id: "castigar",     g: "moderacao", nome: "Dar castigo", sobre: "de 1 a 6 horas sem falar" },
  { id: "apagarMsg",    g: "moderacao", nome: "Apagar mensagens", sobre: "de qualquer pessoa" },
  { id: "fixarMsg",     g: "moderacao", nome: "Fixar mensagens", sobre: "deixar no topo do canal" },
  { id: "verDenuncias", g: "moderacao", nome: "Ver denúncias", sobre: "o que foi denunciado aqui" },
  { id: "moverVoz",     g: "moderacao", nome: "Mover na voz", sobre: "puxar para outra sala" },
  { id: "calarVoz",     g: "moderacao", nome: "Calar na voz", sobre: "tirar o microfone de alguém" },
  { id: "surdoVoz",     g: "moderacao", nome: "Ensurdecer na voz", sobre: "tirar o fone de alguém" },
  { id: "gerirTriagem", g: "moderacao", nome: "Gerenciar a entrada", sobre: "regras e aprovação" },

  /* ---- canais de texto (10) ---- */
  { id: "verCanal",     g: "texto", nome: "Ver o canal", sobre: "sem isto o canal nem aparece" },
  { id: "falar",        g: "texto", nome: "Enviar mensagens", sobre: "escrever no canal" },
  { id: "falarThread",  g: "texto", nome: "Falar em tópicos", sobre: "responder num fio" },
  { id: "criarThread",  g: "texto", nome: "Criar tópicos", sobre: "abrir um fio de conversa" },
  { id: "anexar",       g: "texto", nome: "Enviar imagens", sobre: "mandar figura no canal" },
  { id: "links",        g: "texto", nome: "Enviar links", sobre: "endereços clicáveis" },
  { id: "reagir",       g: "texto", nome: "Reagir", sobre: "pôr emoji numa mensagem" },
  { id: "emojiDeFora",  g: "texto", nome: "Usar emoji de fora", sobre: "de outro servidor" },
  { id: "mencionarTodos", g: "texto", nome: "Mencionar @todos", sobre: "avisar o servidor inteiro" },
  { id: "verHistorico", g: "texto", nome: "Ler o que veio antes", sobre: "rolar para cima" },

  /* ---- canais de voz (10) ---- */
  { id: "entrarVoz",    g: "voz", nome: "Entrar na voz", sobre: "sentar na sala" },
  { id: "vozFalar",     g: "voz", nome: "Falar", sobre: "abrir o microfone" },
  { id: "vozVideo",     g: "voz", nome: "Ligar a câmera", sobre: "aparecer na sala" },
  { id: "vozTela",      g: "voz", nome: "Mostrar a tela", sobre: "transmitir o que você vê" },
  { id: "vozAtivar",    g: "voz", nome: "Falar sem apertar", sobre: "microfone sempre aberto" },
  { id: "vozPrioridade",g: "voz", nome: "Voz prioritária", sobre: "abaixa os outros quando fala" },
  { id: "vozPuxar",     g: "voz", nome: "Puxar para a sala", sobre: "trazer alguém para cá" },
  { id: "vozCalarOutros", g: "voz", nome: "Calar os outros", sobre: "fechar microfone alheio" },
  { id: "vozEntrarCheio", g: "voz", nome: "Entrar em sala cheia", sobre: "furar o limite" },
  { id: "vozSons",      g: "voz", nome: "Usar os sons", sobre: "tocar efeito na sala" },

  /* ---- comunidade (10) ---- */
  { id: "criarEnquete", g: "comunidade", nome: "Criar enquetes", sobre: "perguntar e contar votos" },
  { id: "votar",        g: "comunidade", nome: "Votar", sobre: "responder enquete" },
  { id: "criarEvento",  g: "comunidade", nome: "Criar eventos", sobre: "marcar dia e hora" },
  { id: "seguirCanal",  g: "comunidade", nome: "Seguir canais", sobre: "receber avisos de outro" },
  { id: "usarComandos", g: "comunidade", nome: "Usar comandos", sobre: "os atalhos com /" },
  { id: "meuApelido",   g: "comunidade", nome: "Mudar o próprio apelido", sobre: "só o seu" },
  { id: "verMembros",   g: "comunidade", nome: "Ver a lista de membros", sobre: "quem está aqui" },
  { id: "convidar",     g: "comunidade", nome: "Criar convites", sobre: "chamar gente de fora" },
  { id: "impulsionar",  g: "comunidade", nome: "Dar impulso", sobre: "subir o nível do servidor" },
  { id: "usarTag",      g: "comunidade", nome: "Adotar a tag", sobre: "usar a tag deste servidor" }
];
const PERM_FAMILIAS = [
  { id: "servidor",   nome: "SERVIDOR",   ic: "⚙" },
  { id: "moderacao",  nome: "MODERAÇÃO",  ic: "🛡" },
  { id: "texto",      nome: "CANAIS DE TEXTO", ic: "#" },
  { id: "voz",        nome: "CANAIS DE VOZ",   ic: "🔊" },
  { id: "comunidade", nome: "COMUNIDADE", ic: "👥" }
];
/* o que todo mundo já pode fazer ao entrar: conversar. Um servidor onde
   o membro novo não pode falar é um servidor que parece quebrado. */
const PERMS_PADRAO = ["verCanal", "falar", "falarThread", "reagir", "verHistorico",
                      "entrarVoz", "vozFalar", "vozAtivar", "votar", "verMembros",
                      "meuApelido", "convidar", "criarThread", "links", "usarComandos"];

/* =====================================================================
   IMPULSOS
   ---------------------------------------------------------------------
   Cada assinatura dá impulsos para a pessoa aplicar onde quiser:
   Bronze 1, Prata 2, Ouro 3. O dono do jogo (ilimitado) tem 3 também —
   dar infinito esvaziaria o sentido de subir de nível.

   Os impulsos NÃO somem quando a assinatura acaba: eles voltam para a
   pessoa. Tirar um nível do servidor porque alguém esqueceu de renovar
   castigaria a comunidade inteira por causa de um.
   ===================================================================== */
const IMPULSOS_POR_NIVEL = { nenhum: 0, bronze: 1, prata: 2, ouro: 3, ilimitado: 3 };
const NIVEIS_SERVIDOR = [
  { nivel: 0, precisa: 0,  nome: "Sem impulso",
    ganhos: ["5 espaços de figurinhas", "emojis: 20 espaços"] },
  { nivel: 1, precisa: 2,  nome: "Nível 1",
    ganhos: ["+50 espaços de emoji (70)", "+2 figurinhas (7)", "áudio melhor na voz"] },
  { nivel: 2, precisa: 7,  nome: "Nível 2",
    ganhos: ["+50 espaços de emoji (120)", "+5 figurinhas (12)", "banner do servidor",
             "convite com endereço próprio"] },
  { nivel: 3, precisa: 14, nome: "Nível 3",
    ganhos: ["+100 espaços de emoji (220)", "+7 figurinhas (19)", "áudio de estúdio",
             "fundo de convite animado"] }
];
const TAG_CUSTA = 3;          // impulsos para o servidor poder ter tag

function impulsosQueTenho() {
  const total = IMPULSOS_POR_NIVEL[neoNivel()] || 0;
  const usados = Object.keys((save.impulsos || {})).length;
  return { total, usados, livres: Math.max(0, total - usados) };
}
function nivelDoServidor(info) {
  const n = (info && info.impulsos) || 0;
  let fora = NIVEIS_SERVIDOR[0];
  for (const x of NIVEIS_SERVIDOR) if (n >= x.precisa) fora = x;
  return fora;
}
function espacosDeEmoji(info) { return [20, 70, 120, 220][nivelDoServidor(info).nivel]; }
function espacosDeFigurinha(info) { return [5, 7, 12, 19][nivelDoServidor(info).nivel]; }

/* =====================================================================
   O ESTADO
   ===================================================================== */
const SRV = {
  meus: {},          // sid -> info resumida, para a barra lateral
  aberto: null,      // o servidor em que estou agora (info completa)
  membros: {},       // uid -> ficha, do servidor aberto
  cargos: {},        // rid -> cargo, do servidor aberto
  canais: {},        // cid -> canal, do servidor aberto
  auditoria: [],
  aba: "visao"
};

function srvCaminho(sid, resto) { return "servidores/" + sid + (resto ? "/" + resto : ""); }
function srvSalaDoCanal(sid, cid) { return "conversas/srv__" + sid + "__" + cid; }

/* toda escrita passa por aqui, e é aqui que o galho recusado FALA.
   Sem isto, um servidor criado com as regras antigas simplesmente não
   existiria e ninguém saberia por quê. */
async function srvEscrever(caminho, valor, metodo) {
  const r = await nuvemSoltar(caminho, valor, metodo);
  if (r === null) {
    try {
      estAvisar("A nuvem recusou. O dono precisa liberar o galho “servidores” " +
                "nas regras do Firebase (painel › SISTEMA › regras).");
    } catch (e) {}
  }
  return r;
}

/* =====================================================================
   QUEM PODE O QUÊ
   ---------------------------------------------------------------------
   A conta é sempre a mesma: o dono pode tudo; quem tem ADMINISTRADOR
   pode tudo; senão, junta as permissões de todos os cargos da pessoa e
   vê se a que se procura está lá.

   Uma função só decide, e todo lugar do código pergunta a ela. Se cada
   tela fizesse a própria conta, um dia uma delas esqueceria de olhar o
   castigo e a pessoa castigada falaria por ali.
   ===================================================================== */
function srvMinhaFicha(sid) {
  const eu = estEu();
  if (!eu) return null;
  return (SRV.membros || {})[eu.id] || null;
}
function srvCastigado(ficha) {
  return !!(ficha && ficha.castigoAte && ficha.castigoAte > Date.now());
}
function srvPode(perm, uid) {
  const info = SRV.aberto;
  if (!info) return false;
  const eu = estEu();
  const quem = uid || (eu && eu.id);
  if (!quem) return false;
  if (info.dono === quem) return true;                 // o dono pode tudo, sempre
  const ficha = (SRV.membros || {})[quem];
  if (!ficha) return false;
  /* CASTIGADO não fala, não reage e não entra na voz -- mas continua
     vendo, porque castigo é ficar de fora da conversa, não ser expulso */
  if (srvCastigado(ficha) &&
      ["falar", "falarThread", "criarThread", "reagir", "anexar", "vozFalar",
       "criarEnquete", "votar", "mencionarTodos"].indexOf(perm) >= 0) return false;
  /* O CARGO BASE VALE PARA TODO MUNDO, e não fica na ficha de ninguém.
     Sem isto, só quem tivesse um cargo explícito poderia falar -- ou
     seja, ninguém, porque o membro novo entra sem cargo nenhum. O
     servidor nascia mudo e parecia quebrado. */
  const meus = (ficha.cargos || []).slice();
  for (const rid in (SRV.cargos || {})) {
    if (SRV.cargos[rid] && SRV.cargos[rid].base && meus.indexOf(rid) < 0) meus.push(rid);
  }
  for (const rid of meus) {
    const c = (SRV.cargos || {})[rid];
    if (!c || !c.perms) continue;
    if (c.perms.admin) return true;
    if (c.perms[perm]) return true;
  }
  return false;
}
/* a ordem dos cargos manda: ninguém mexe em quem está acima dele. Sem
   isto, um moderador banaria o outro moderador e o dono viraria refém
   da própria equipe. */
function srvAltura(uid) {
  const info = SRV.aberto;
  if (!info) return -1;
  if (info.dono === uid) return 9999;
  const ficha = (SRV.membros || {})[uid];
  if (!ficha) return -1;
  let alto = 0;
  for (const rid of (ficha.cargos || [])) {
    const c = (SRV.cargos || {})[rid];
    if (c && (c.ordem || 0) > alto) alto = c.ordem || 0;
  }
  return alto;
}
function srvPodeMexerEm(uid) {
  const eu = estEu();
  if (!eu || uid === eu.id) return false;
  return srvAltura(eu.id) > srvAltura(uid);
}

/* =====================================================================
   O REGISTRO DE AUDITORIA
   ---------------------------------------------------------------------
   Quem fez, o quê, com quem e quando. Escrito no momento da ação, nunca
   depois: registro que alguém preenche "quando lembrar" não serve para
   nada. E ninguém apaga — o histórico só cresce e vai cortando o mais
   velho, porque um registro que o moderador pode limpar não é registro.
   ===================================================================== */
const AUDITORIA_TETO = 200;
async function srvRegistrar(sid, acao, alvoNome, detalhe) {
  const eu = estEu();
  if (!eu || !sid) return;
  const k = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  await srvEscrever(srvCaminho(sid, "auditoria/" + k), {
    quem: eu.id, quemNome: eu.tag, acao,
    alvo: alvoNome || "", detalhe: detalhe || "", quando: Date.now()
  });
}
const AUDITORIA_TEXTO = {
  criou: "criou o servidor", entrou: "entrou", saiu: "saiu",
  expulsou: "expulsou", baniu: "baniu", desbaniu: "tirou o banimento de",
  castigou: "deu castigo a", tirouCastigo: "tirou o castigo de",
  cargoCriou: "criou o cargo", cargoApagou: "apagou o cargo", cargoDeu: "deu cargo a",
  cargoTirou: "tirou cargo de", canalCriou: "criou o canal", canalApagou: "apagou o canal",
  canalEditou: "mudou o canal", conviteCriou: "criou um convite",
  conviteApagou: "apagou um convite", emojiAdd: "adicionou o emoji",
  emojiTirou: "apagou o emoji", impulso: "deu um impulso", impulsoTirou: "tirou um impulso",
  tag: "mudou a tag para", servidorEditou: "mudou as configurações",
  comunidadeLigou: "ligou o modo comunidade", comunidadeDesligou: "desligou o modo comunidade",
  denuncia: "recebeu uma denúncia sobre"
};

/* =====================================================================
   CRIAR, ENTRAR E SAIR
   ===================================================================== */
const SRV_MODELOS = [
  { id: "livre",  nome: "Do zero", ic: "✦",
    canais: [["geral", "texto"], ["Sala de voz", "voz"]] },
  { id: "jogo",   nome: "Jogatina", ic: "🎮",
    canais: [["geral", "texto"], ["estrategias", "texto"], ["procurando-dupla", "texto"],
             ["Sala 1", "voz"], ["Sala 2", "voz"]] },
  { id: "amigos", nome: "Só os amigos", ic: "🤝",
    canais: [["geral", "texto"], ["zoeira", "texto"], ["Sala", "voz"]] },
  { id: "clube",  nome: "Comunidade", ic: "🌍",
    canais: [["avisos", "texto"], ["regras", "texto"], ["geral", "texto"],
             ["ajuda", "texto"], ["Palco", "voz"]] }
];

async function srvCriar(nome, modeloId, publico) {
  const eu = estEu();
  if (!eu) return null;
  nome = limparTexto(String(nome || "").trim().slice(0, 40)) || "Servidor sem nome";
  const modelo = SRV_MODELOS.filter(x => x.id === modeloId)[0] || SRV_MODELOS[0];
  const sid = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  const info = {
    nome, dono: eu.id, donoNome: eu.tag, criado: Date.now(),
    icone: nome.trim()[0] ? nome.trim()[0].toUpperCase() : "S",
    descricao: "", publico: !!publico, impulsos: 0, tag: "",
    comunidade: { ligada: false, canalRegras: "", canalAvisos: "", idioma: "pt" },
    config: { ausentesMin: 0, canalAusentes: "", verificacao: "nenhuma",
              modChaveExigida: false, lento: 0 }
  };
  if ((await srvEscrever(srvCaminho(sid, "info"), info)) === null) return null;

  /* o cargo de todo mundo nasce junto: sem ele, ninguém poderia falar */
  const perms = {};
  for (const p of PERMS_PADRAO) perms[p] = true;
  await srvEscrever(srvCaminho(sid, "cargos/todos"),
    { nome: "membro", cor: "", emoji: "", ordem: 0, perms, separado: false, base: true });

  let ordem = 0;
  for (const [cn, tipo] of modelo.canais) {
    const cid = "c" + (ordem++) + Math.random().toString(36).slice(2, 5);
    await srvEscrever(srvCaminho(sid, "canais/" + cid),
      { nome: cn, tipo, ordem, topico: "", lento: 0, perms: {} });
  }
  await srvEscrever(srvCaminho(sid, "membros/" + eu.id),
    { nome: eu.tag, cargos: [], entrou: Date.now(), apelido: "" });
  await nuvemSoltarC("amigos/" + eu.id + "/servidores/" + sid, { nome, quando: Date.now() });
  await srvRegistrar(sid, "criou", nome);
  SRV.meus[sid] = { nome, quando: Date.now() };
  return sid;
}

async function srvCarregarMeus() {
  const eu = estEu();
  if (!eu) return;
  const meus = (await nuvemReqC("amigos/" + eu.id + "/servidores")) || {};
  const fora = {};
  for (const sid in meus) {
    const info = await nuvemReq(srvCaminho(sid, "info"));
    /* o servidor sumiu ou eu fui tirado: some daqui também, senão a
       barra mostra porta que não abre */
    if (!info) { nuvemSoltarC("amigos/" + eu.id + "/servidores/" + sid, null, "DELETE"); continue; }
    const souMembro = await nuvemReq(srvCaminho(sid, "membros/" + eu.id));
    if (!souMembro) { nuvemSoltarC("amigos/" + eu.id + "/servidores/" + sid, null, "DELETE"); continue; }
    fora[sid] = { nome: info.nome, icone: info.icone, tag: info.tag, impulsos: info.impulsos || 0 };
  }
  SRV.meus = fora;
}

async function srvAbrir(sid) {
  const info = await nuvemReq(srvCaminho(sid, "info"));
  if (!info) { estAvisar("Este servidor não existe mais."); return false; }
  SRV.aberto = Object.assign({ sid }, info);
  SRV.membros = (await nuvemReq(srvCaminho(sid, "membros"))) || {};
  SRV.cargos  = (await nuvemReq(srvCaminho(sid, "cargos"))) || {};
  SRV.canais  = (await nuvemReq(srvCaminho(sid, "canais"))) || {};
  return true;
}

/* ---- convites ---- */
const CONVITE_PRAZOS = [
  { id: "30m", nome: "30 minutos", ms: 30 * 60000 },
  { id: "6h",  nome: "6 horas",    ms: 6 * 60 * 60000 },
  { id: "1d",  nome: "1 dia",      ms: 24 * 60 * 60000 },
  { id: "7d",  nome: "7 dias",     ms: 7 * 24 * 60 * 60000 },
  { id: "never", nome: "nunca vence", ms: 0 }
];
const CONVITE_USOS = [
  { id: "0", nome: "sem limite", n: 0 }, { id: "1", nome: "1 uso", n: 1 },
  { id: "5", nome: "5 usos", n: 5 }, { id: "25", nome: "25 usos", n: 25 }
];
async function srvCriarConvite(sid, canalId, prazoId, usosId) {
  const eu = estEu();
  if (!eu) return null;
  const pz = CONVITE_PRAZOS.filter(x => x.id === prazoId)[0] || CONVITE_PRAZOS[2];
  const us = CONVITE_USOS.filter(x => x.id === usosId)[0] || CONVITE_USOS[0];
  /* código curto, em letras que não se confundem: sem O nem 0, sem I nem 1.
     Quem digita errado um convite acha que o servidor não existe. */
  const letras = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let codigo = "";
  for (let i = 0; i < 6; i++) codigo += letras[Math.floor(Math.random() * letras.length)];
  const conv = { sid, por: eu.id, porNome: eu.tag, canal: canalId || "",
                 criado: Date.now(), ate: pz.ms ? Date.now() + pz.ms : 0,
                 maxUsos: us.n, usos: 0 };
  if ((await srvEscrever(srvCaminho(sid, "convites/" + codigo), conv)) === null) return null;
  /* um índice pequeno de código -> servidor, para entrar sabendo só o
     código. Sem ele seria preciso varrer todos os servidores do mundo. */
  await srvEscrever("servidores/__codigos/" + codigo, { sid, ate: conv.ate });
  await srvRegistrar(sid, "conviteCriou", codigo, pz.nome);
  return codigo;
}

async function srvEntrarPorConvite(codigo) {
  const eu = estEu();
  if (!eu) return { ok: false, msg: "Entre com um piloto primeiro." };
  codigo = String(codigo || "").trim().toUpperCase().slice(0, 8);
  if (!codigo) return { ok: false, msg: "Escreva o código do convite." };
  const ind = await nuvemReq("servidores/__codigos/" + codigo);
  if (!ind || !ind.sid) return { ok: false, msg: "Não achei esse convite." };
  const conv = await nuvemReq(srvCaminho(ind.sid, "convites/" + codigo));
  if (!conv) return { ok: false, msg: "Esse convite não existe mais." };
  if (conv.ate && conv.ate < Date.now()) return { ok: false, msg: "Esse convite venceu." };
  if (conv.maxUsos && (conv.usos || 0) >= conv.maxUsos)
    return { ok: false, msg: "Esse convite já foi usado o máximo de vezes." };

  const banido = await nuvemReq(srvCaminho(ind.sid, "banidos/" + eu.id));
  if (banido) return { ok: false, msg: "Você está banido desse servidor." };
  const info = await nuvemReq(srvCaminho(ind.sid, "info"));
  if (!info) return { ok: false, msg: "Esse servidor não existe mais." };

  const ja = await nuvemReq(srvCaminho(ind.sid, "membros/" + eu.id));
  if (!ja) {
    await srvEscrever(srvCaminho(ind.sid, "membros/" + eu.id),
      { nome: eu.tag, cargos: [], entrou: Date.now(), apelido: "" });
    await srvEscrever(srvCaminho(ind.sid, "convites/" + codigo + "/usos"), (conv.usos || 0) + 1);
    await srvRegistrar(ind.sid, "entrou", eu.tag);
  }
  await nuvemSoltarC("amigos/" + eu.id + "/servidores/" + ind.sid,
                     { nome: info.nome, quando: Date.now() });
  SRV.meus[ind.sid] = { nome: info.nome, icone: info.icone, tag: info.tag };
  return { ok: true, sid: ind.sid, nome: info.nome, msg: "Você entrou em " + info.nome + "." };
}

async function srvSair(sid) {
  const eu = estEu();
  if (!eu) return;
  const info = SRV.aberto && SRV.aberto.sid === sid ? SRV.aberto
             : await nuvemReq(srvCaminho(sid, "info"));
  if (info && info.dono === eu.id) {
    estAvisar("O dono não sai do próprio servidor — apague ou passe a dono para outro.");
    return false;
  }
  await srvRegistrar(sid, "saiu", eu.tag);
  await srvEscrever(srvCaminho(sid, "membros/" + eu.id), null, "DELETE");
  await nuvemSoltarC("amigos/" + eu.id + "/servidores/" + sid, null, "DELETE");
  delete SRV.meus[sid];
  if (SRV.aberto && SRV.aberto.sid === sid) SRV.aberto = null;
  return true;
}

/* =====================================================================
   MODERAÇÃO
   ===================================================================== */
const CASTIGOS = [
  { id: "1h", nome: "1 hora",  ms: 60 * 60000 },
  { id: "2h", nome: "2 horas", ms: 2 * 60 * 60000 },
  { id: "3h", nome: "3 horas", ms: 3 * 60 * 60000 },
  { id: "6h", nome: "6 horas", ms: 6 * 60 * 60000 }
];
async function srvExpulsar(sid, uid, nome) {
  if (!srvPode("expulsar")) { estAvisar("Você não pode expulsar."); return false; }
  if (!srvPodeMexerEm(uid)) { estAvisar("Essa pessoa está acima de você."); return false; }
  await srvEscrever(srvCaminho(sid, "membros/" + uid), null, "DELETE");
  await nuvemSoltarC("amigos/" + uid + "/servidores/" + sid, null, "DELETE");
  delete SRV.membros[uid];
  await srvRegistrar(sid, "expulsou", nome);
  return true;
}
async function srvBanir(sid, uid, nome, motivo) {
  if (!srvPode("banir")) { estAvisar("Você não pode banir."); return false; }
  if (!srvPodeMexerEm(uid)) { estAvisar("Essa pessoa está acima de você."); return false; }
  const eu = estEu();
  await srvEscrever(srvCaminho(sid, "banidos/" + uid), {
    nome: nome || "", por: eu.id, porNome: eu.tag,
    motivo: limparTexto(String(motivo || "").slice(0, 120)), quando: Date.now()
  });
  await srvEscrever(srvCaminho(sid, "membros/" + uid), null, "DELETE");
  await nuvemSoltarC("amigos/" + uid + "/servidores/" + sid, null, "DELETE");
  delete SRV.membros[uid];
  await srvRegistrar(sid, "baniu", nome, motivo || "");
  return true;
}
async function srvDesbanir(sid, uid, nome) {
  if (!srvPode("banir")) return false;
  await srvEscrever(srvCaminho(sid, "banidos/" + uid), null, "DELETE");
  await srvRegistrar(sid, "desbaniu", nome);
  return true;
}
async function srvCastigar(sid, uid, nome, castigoId) {
  if (!srvPode("castigar")) { estAvisar("Você não pode dar castigo."); return false; }
  if (!srvPodeMexerEm(uid)) { estAvisar("Essa pessoa está acima de você."); return false; }
  const c = CASTIGOS.filter(x => x.id === castigoId)[0];
  const ate = c ? Date.now() + c.ms : 0;
  await srvEscrever(srvCaminho(sid, "membros/" + uid + "/castigoAte"), ate);
  if (SRV.membros[uid]) SRV.membros[uid].castigoAte = ate;
  await srvRegistrar(sid, c ? "castigou" : "tirouCastigo", nome, c ? c.nome : "");
  return true;
}

/* =====================================================================
   CARGOS
   ===================================================================== */
async function srvCargoCriar(sid, nome, cor, emoji) {
  if (!srvPode("gerirCargos")) { estAvisar("Você não pode mexer nos cargos."); return null; }
  const rid = "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 4);
  const ordens = Object.keys(SRV.cargos).map(k => SRV.cargos[k].ordem || 0);
  const cargo = {
    nome: limparTexto(String(nome || "").trim().slice(0, 24)) || "cargo novo",
    cor: /^#[0-9a-fA-F]{6}$/.test(cor || "") ? cor : "",
    emoji: String(emoji || "").slice(0, 4),
    ordem: (ordens.length ? Math.max.apply(null, ordens) : 0) + 1,
    perms: {}, separado: false
  };
  if ((await srvEscrever(srvCaminho(sid, "cargos/" + rid), cargo)) === null) return null;
  SRV.cargos[rid] = cargo;
  await srvRegistrar(sid, "cargoCriou", cargo.nome);
  return rid;
}
async function srvCargoSalvar(sid, rid) {
  if (!srvPode("gerirCargos")) return false;
  const c = SRV.cargos[rid];
  if (!c) return false;
  return (await srvEscrever(srvCaminho(sid, "cargos/" + rid), c)) !== null;
}
async function srvCargoApagar(sid, rid) {
  if (!srvPode("gerirCargos")) return false;
  const c = SRV.cargos[rid];
  if (!c || c.base) { estAvisar("O cargo de membro não pode ser apagado."); return false; }
  await srvEscrever(srvCaminho(sid, "cargos/" + rid), null, "DELETE");
  /* tira o cargo de quem tinha: cargo apagado que fica preso na ficha
     vira permissão fantasma que ninguém consegue enxergar nem remover */
  for (const uid in SRV.membros) {
    const f = SRV.membros[uid];
    if (f.cargos && f.cargos.indexOf(rid) >= 0) {
      f.cargos = f.cargos.filter(x => x !== rid);
      await srvEscrever(srvCaminho(sid, "membros/" + uid + "/cargos"), f.cargos);
    }
  }
  await srvRegistrar(sid, "cargoApagou", c.nome);
  delete SRV.cargos[rid];
  return true;
}
async function srvDarCargo(sid, uid, rid, dar) {
  if (!srvPode("gerirCargos")) { estAvisar("Você não pode dar cargos."); return false; }
  const c = SRV.cargos[rid];
  const eu = estEu();
  /* ninguém entrega um cargo mais alto do que o próprio: é assim que um
     moderador viraria dono em dois toques */
  if (c && eu && SRV.aberto.dono !== eu.id && (c.ordem || 0) >= srvAltura(eu.id)) {
    estAvisar("Esse cargo está acima do seu.");
    return false;
  }
  const f = SRV.membros[uid];
  if (!f) return false;
  f.cargos = f.cargos || [];
  if (dar) { if (f.cargos.indexOf(rid) < 0) f.cargos.push(rid); }
  else f.cargos = f.cargos.filter(x => x !== rid);
  await srvEscrever(srvCaminho(sid, "membros/" + uid + "/cargos"), f.cargos);
  await srvRegistrar(sid, dar ? "cargoDeu" : "cargoTirou", f.nome, c ? c.nome : "");
  return true;
}

/* =====================================================================
   IMPULSOS E TAG
   ===================================================================== */
async function srvImpulsionar(sid, dar) {
  const eu = estEu();
  if (!eu) return false;
  save.impulsos = save.impulsos || {};
  const meus = impulsosQueTenho();
  const jaDei = !!save.impulsos[sid];
  if (dar && !jaDei && meus.livres <= 0) {
    estAvisar(meus.total
      ? "Seus " + meus.total + " impulsos já estão em outros servidores."
      : "Impulso vem com o NeoNebula: Bronze 1, Prata 2, Ouro 3.");
    return false;
  }
  const info = SRV.aberto && SRV.aberto.sid === sid ? SRV.aberto
             : await nuvemReq(srvCaminho(sid, "info"));
  if (!info) return false;
  const n = Math.max(0, (info.impulsos || 0) + (dar ? 1 : -1));
  if ((await srvEscrever(srvCaminho(sid, "info/impulsos"), n)) === null) return false;
  if (dar) save.impulsos[sid] = Date.now(); else delete save.impulsos[sid];
  persist();
  if (SRV.aberto && SRV.aberto.sid === sid) SRV.aberto.impulsos = n;
  if (SRV.meus[sid]) SRV.meus[sid].impulsos = n;
  await srvRegistrar(sid, dar ? "impulso" : "impulsoTirou", info.nome, n + " no total");
  return true;
}

async function srvDefinirTag(sid, tag) {
  if (!srvPode("gerirServidor")) { estAvisar("Você não pode mexer nisso."); return false; }
  const info = SRV.aberto;
  if (!info) return false;
  if ((info.impulsos || 0) < TAG_CUSTA) {
    estAvisar("A tag precisa de " + TAG_CUSTA + " impulsos. O servidor tem " +
              (info.impulsos || 0) + ".");
    return false;
  }
  /* cinco letras, só letras e números: tag com espaço ou símbolo colada
     no nome de alguém vira bagunça de leitura */
  tag = String(tag || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
  if ((await srvEscrever(srvCaminho(sid, "info/tag"), tag)) === null) return false;
  info.tag = tag;
  if (SRV.meus[sid]) SRV.meus[sid].tag = tag;
  await srvRegistrar(sid, "tag", tag);
  return true;
}
/* adotar a tag de um servidor: ela passa a aparecer do lado do meu nome
   em TODA a Estação, e clicar nela mostra o servidor numa janelinha */
function srvAdotarTag(sid) {
  save.tagServidor = sid || "";
  persist();
  try { nuvemEnviar(true); } catch (e) {}
  return save.tagServidor;
}
function srvMinhaTagInfo() {
  const sid = save.tagServidor;
  if (!sid) return null;
  const s = SRV.meus[sid];
  if (!s || !s.tag) return null;
  return { sid, tag: s.tag, nome: s.nome };
}

/* =====================================================================
   A TELA DOS SERVIDORES
   ---------------------------------------------------------------------
   Entram na Estação como mais um tipo de DESTINO — igual aos canais, às
   conversas e aos grupos. Foi para isto que a divisão em destinos
   existe: uma coisa inteiramente nova entrou sem a barra lateral, os
   não lidos ou a conta de fluxos precisarem saber o que ela é.
   ===================================================================== */

/* ---- criar ---- */
function srvAbrirCriar() {
  estJanela("Criar servidor",
    '<p class="est-nota">Um lugar seu, com os canais e as regras que você quiser.</p>' +
    '<input id="srv-nome" maxlength="40" placeholder="nome do servidor" autocomplete="off">' +
    '<p class="est-nota">Comece com um modelo:</p>' +
    '<div class="srv-modelos">' + SRV_MODELOS.map(m =>
      '<button class="srv-modelo" data-mod="' + m.id + '"><b>' + m.ic + "</b>" +
      "<span>" + escaparTexto(m.nome) + "</span><em>" + m.canais.length + " canais</em></button>"
    ).join("") + "</div>" +
    '<label class="srv-check"><input type="checkbox" id="srv-publico">' +
    "<span>deixar público (qualquer um acha e entra)</span></label>" +
    '<button class="est-jan-ok salvar" id="srv-criar">CRIAR</button>' +
    '<p class="est-nota" style="margin-top:14px">Já tem um convite?</p>' +
    '<div class="est-add-linha"><input id="srv-cod" maxlength="8" placeholder="código" ' +
    'autocomplete="off" style="text-transform:uppercase">' +
    '<button id="srv-entrar">ENTRAR</button></div>' +
    '<p class="est-nota" id="srv-resp"></p>',
    cx => {
      let modelo = "livre";
      const pinta = () => cx.querySelectorAll("[data-mod]").forEach(x =>
        x.classList.toggle("on", x.getAttribute("data-mod") === modelo));
      cx.querySelectorAll("[data-mod]").forEach(b =>
        b.addEventListener("click", () => { modelo = b.getAttribute("data-mod"); pinta(); }));
      pinta();
      $("srv-criar").addEventListener("click", async () => {
        const sid = await srvCriar($("srv-nome").value, modelo, $("srv-publico").checked);
        if (!sid) return;
        estFecharJanela();
        await srvCarregarMeus();
        await srvAbrir(sid);
        const primeiro = Object.keys(SRV.canais).filter(c => SRV.canais[c].tipo === "texto")[0];
        estAbrir({ tipo: "srv", id: sid, canal: primeiro,
                   nome: SRV.canais[primeiro] ? SRV.canais[primeiro].nome : "geral" });
      });
      const entrar = async () => {
        const r = await srvEntrarPorConvite($("srv-cod").value);
        $("srv-resp").textContent = r.msg;
        if (!r.ok) return;
        estFecharJanela();
        await srvCarregarMeus();
        await srvAbrir(r.sid);
        const primeiro = Object.keys(SRV.canais).filter(c => SRV.canais[c].tipo === "texto")[0];
        estAbrir({ tipo: "srv", id: r.sid, canal: primeiro,
                   nome: SRV.canais[primeiro] ? SRV.canais[primeiro].nome : "geral" });
      };
      $("srv-entrar").addEventListener("click", entrar);
      $("srv-cod").addEventListener("keydown", e => { if (e.key === "Enter") entrar(); });
    });
}

/* ---- a janelinha da tag: clicar numa tag mostra o servidor inteiro
   sem sair de onde você está ---- */
async function srvEspiar(sid) {
  const info = await nuvemReq(srvCaminho(sid, "info"));
  if (!info) { estAvisar("Esse servidor não existe mais."); return; }
  const membros = (await nuvemReq(srvCaminho(sid, "membros"))) || {};
  const canais = (await nuvemReq(srvCaminho(sid, "canais"))) || {};
  const nv = nivelDoServidor(info);
  const eu = estEu();
  const jaSou = eu && membros[eu.id];
  estJanela(info.nome,
    '<div class="srv-espia">' +
      '<div class="srv-espia-ic">' + escaparTexto(info.icone || "S") + "</div>" +
      "<div><b>" + escaparTexto(info.nome) + "</b>" +
      (info.tag ? '<span class="srv-tag">' + escaparTexto(info.tag) + "</span>" : "") +
      "<em>" + Object.keys(membros).length + " membros · " +
      Object.keys(canais).length + " canais · " + nv.nome + "</em></div></div>" +
    (info.descricao ? '<p class="pf-bio">' + escaparTexto(info.descricao) + "</p>" : "") +
    '<div class="srv-espia-canais">' + Object.keys(canais).slice(0, 8).map(cid =>
      '<span class="srv-mini-canal">' + (canais[cid].tipo === "voz" ? "🔊" : "#") + " " +
      escaparTexto(canais[cid].nome) + "</span>").join("") + "</div>" +
    (jaSou
      ? '<button class="est-jan-ok salvar" data-e="ir">IR PARA O SERVIDOR</button>'
      : (info.publico
          ? '<button class="est-jan-ok salvar" data-e="entrar">ENTRAR</button>'
          : '<p class="est-nota">Este servidor é privado — só entra com convite.</p>')),
    cx => cx.querySelectorAll("[data-e]").forEach(b => b.addEventListener("click", async () => {
      const q = b.getAttribute("data-e");
      estFecharJanela();
      if (q === "entrar") {
        await srvEscrever(srvCaminho(sid, "membros/" + eu.id),
          { nome: eu.tag, cargos: [], entrou: Date.now(), apelido: "" });
        await nuvemSoltarC("amigos/" + eu.id + "/servidores/" + sid,
                           { nome: info.nome, quando: Date.now() });
        await srvRegistrar(sid, "entrou", eu.tag);
        await srvCarregarMeus();
      }
      await srvAbrir(sid);
      const primeiro = Object.keys(SRV.canais).filter(c => SRV.canais[c].tipo === "texto")[0];
      estAbrir({ tipo: "srv", id: sid, canal: primeiro,
                 nome: SRV.canais[primeiro] ? SRV.canais[primeiro].nome : "geral" });
    })));
}

/* =====================================================================
   AS CONFIGURAÇÕES DO SERVIDOR
   ---------------------------------------------------------------------
   Catorze abas. Cada uma só aparece para quem tem a permissão dela: um
   painel cheio de botão cinza que você não pode apertar é pior que um
   painel curto — passa a impressão de que o jogo está te escondendo
   coisa, quando na verdade você é que não é moderador.
   ===================================================================== */
const SRV_ABAS = [
  { id: "visao",     nome: "Visão geral",   perm: "gerirServidor" },
  { id: "moderacao", nome: "Moderação",     perm: "gerirTriagem" },
  { id: "auditoria", nome: "Registro",      perm: "verAuditoria" },
  { id: "canais",    nome: "Canais",        perm: "gerirCanais" },
  { id: "cargos",    nome: "Cargos",        perm: "gerirCargos" },
  { id: "membros",   nome: "Membros",       perm: "verMembros" },
  { id: "convites",  nome: "Convites",      perm: "gerirConvites" },
  { id: "banidos",   nome: "Banimentos",    perm: "banir" },
  { id: "emoji",     nome: "Emojis",        perm: "gerirEmojis" },
  { id: "figu",      nome: "Figurinhas",    perm: "gerirEmojis" },
  { id: "tag",       nome: "Tag",           perm: "gerirServidor" },
  { id: "impulsos",  nome: "Impulsos",      perm: null },
  { id: "comunidade",nome: "Comunidade",    perm: "gerirServidor" },
  { id: "seguranca", nome: "Segurança",     perm: "gerirServidor" },
  { id: "externo",   nome: "Avisos externos", perm: "gerirWebhooks" }
];

async function srvAbrirConfig(sid, aba) {
  if (!SRV.aberto || SRV.aberto.sid !== sid) {
    if (!(await srvAbrir(sid))) return;
  }
  SRV.aba = aba || "visao";
  srvPintarConfig();
}

function srvPintarConfig() {
  const info = SRV.aberto;
  if (!info) return;
  const libs = SRV_ABAS.filter(a => !a.perm || srvPode(a.perm));
  if (!libs.some(a => a.id === SRV.aba)) SRV.aba = libs.length ? libs[0].id : "";
  const corpo = srvCorpoDaAba(SRV.aba);
  estJanela("⚙ " + info.nome,
    '<div class="srv-abas">' + libs.map(a =>
      '<button class="srv-aba' + (SRV.aba === a.id ? " on" : "") + '" data-sa="' + a.id + '">' +
      escaparTexto(a.nome) + "</button>").join("") + "</div>" +
    '<div class="srv-corpo" id="srv-corpo">' + corpo.html + "</div>",
    cx => {
      cx.querySelectorAll("[data-sa]").forEach(b =>
        b.addEventListener("click", () => { SRV.aba = b.getAttribute("data-sa"); srvPintarConfig(); }));
      if (corpo.ligar) corpo.ligar(cx);
    });
}

/* cada aba devolve o html e o que ligar depois — assim uma não precisa
   saber nada das outras */
function srvCorpoDaAba(aba) {
  const info = SRV.aberto;
  const sid = info.sid;
  const salvarInfo = async (campo, valor) => {
    info[campo] = valor;
    await srvEscrever(srvCaminho(sid, "info/" + campo), valor);
    await srvRegistrar(sid, "servidorEditou", info.nome, campo);
  };

  if (aba === "visao") return {
    html:
      '<div class="pf-campo"><label>NOME</label>' +
      '<input id="sv-nome" maxlength="40" value="' + escaparTexto(info.nome) + '"></div>' +
      '<div class="pf-campo"><label>DESCRIÇÃO</label>' +
      '<textarea id="sv-desc" maxlength="200" rows="3" placeholder="do que é este servidor?">' +
      escaparTexto(info.descricao || "") + "</textarea></div>" +
      '<div class="pf-campo"><label>CANAL DE AUSENTES</label>' +
      '<p class="est-nota">Quem ficar parado numa sala de voz é levado para cá, ' +
      "em vez de ocupar lugar sem falar.</p>" +
      '<select id="sv-afk"><option value="">nenhum</option>' +
      Object.keys(SRV.canais).filter(c => SRV.canais[c].tipo === "voz").map(c =>
        '<option value="' + c + '"' +
        ((info.config || {}).canalAusentes === c ? " selected" : "") + ">" +
        escaparTexto(SRV.canais[c].nome) + "</option>").join("") + "</select>" +
      '<select id="sv-afkmin" style="margin-top:7px">' +
      [0, 5, 15, 30, 60].map(m => '<option value="' + m + '"' +
        ((info.config || {}).ausentesMin === m ? " selected" : "") + ">" +
        (m ? "depois de " + m + " min parado" : "desligado") + "</option>").join("") + "</select></div>" +
      '<button class="est-jan-ok salvar" id="sv-salvar">SALVAR</button>',
    ligar: () => $("sv-salvar").addEventListener("click", async () => {
      await salvarInfo("nome", limparTexto($("sv-nome").value.slice(0, 40)));
      await salvarInfo("descricao", limparTexto($("sv-desc").value.slice(0, 200)));
      const cfg = Object.assign({}, info.config || {},
        { canalAusentes: $("sv-afk").value, ausentesMin: parseInt($("sv-afkmin").value, 10) || 0 });
      await salvarInfo("config", cfg);
      estAvisar("Salvo.");
      srvPintarConfig();
    })
  };

  if (aba === "moderacao") return {
    html:
      '<div class="pf-campo"><label>QUEM PODE FALAR ASSIM QUE ENTRA</label>' +
      '<p class="est-nota">Um filtro na porta segura a maior parte da bagunça ' +
      "antes dela começar.</p>" +
      ["nenhuma", "conta", "tempo", "regras"].map(v => {
        const txt = { nenhuma: "todo mundo, na hora",
                      conta: "só quem já jogou (tem fase passada)",
                      tempo: "só depois de 10 minutos no servidor",
                      regras: "só depois de aceitar as regras" }[v];
        return '<label class="srv-check"><input type="radio" name="sv-ver" value="' + v + '"' +
          ((info.config || {}).verificacao === v ? " checked" : "") + "><span>" + txt + "</span></label>";
      }).join("") + "</div>" +
      '<div class="pf-campo"><label>MODO LENTO NOS CANAIS</label>' +
      '<select id="sv-lento">' + [0, 5, 15, 30, 60].map(n =>
        '<option value="' + n + '"' + ((info.config || {}).lento === n ? " selected" : "") + ">" +
        (n ? "uma mensagem a cada " + n + "s" : "sem limite") + "</option>").join("") + "</select></div>" +
      '<button class="est-jan-ok salvar" id="sv-salvar">SALVAR</button>',
    ligar: cx => $("sv-salvar").addEventListener("click", async () => {
      const marcado = cx.querySelector('[name="sv-ver"]:checked');
      const cfg = Object.assign({}, info.config || {}, {
        verificacao: marcado ? marcado.value : "nenhuma",
        lento: parseInt($("sv-lento").value, 10) || 0
      });
      await salvarInfo("config", cfg);
      estAvisar("Salvo.");
    })
  };

  if (aba === "auditoria") return {
    html: '<p class="est-nota">Tudo o que aconteceu aqui, do mais novo para o mais velho. ' +
          "Ninguém apaga: registro que o moderador pode limpar não é registro.</p>" +
          '<div id="sv-aud"><p class="est-nota">carregando…</p></div>',
    ligar: async () => {
      const d = (await nuvemReq(srvCaminho(sid, "auditoria"))) || {};
      const arr = Object.keys(d).map(k => d[k]).filter(x => x && x.quando)
        .sort((a, b) => b.quando - a.quando).slice(0, 100);
      $("sv-aud").innerHTML = arr.length ? arr.map(x =>
        '<div class="sv-aud-l"><b>' + escaparTexto(x.quemNome || "?") + "</b> " +
        escaparTexto(AUDITORIA_TEXTO[x.acao] || x.acao) + " " +
        "<i>" + escaparTexto(x.alvo || "") + "</i>" +
        (x.detalhe ? " <u>" + escaparTexto(x.detalhe) + "</u>" : "") +
        "<em>" + quandoTexto(x.quando) + "</em></div>").join("")
        : '<p class="est-nota">Nada aconteceu ainda.</p>';
    }
  };

  if (aba === "canais") return {
    html:
      Object.keys(SRV.canais).sort((a, b) => (SRV.canais[a].ordem || 0) - (SRV.canais[b].ordem || 0))
        .map(cid => {
          const c = SRV.canais[cid];
          return '<div class="sv-linha"><b>' + (c.tipo === "voz" ? "🔊" : "#") + " " +
            escaparTexto(c.nome) + "</b>" +
            '<span class="sv-linha-acoes">' +
            '<button class="est-ac" data-cedit="' + cid + '">editar</button>' +
            '<button class="est-ac nao" data-cdel="' + cid + '">✕</button></span></div>';
        }).join("") +
      '<div class="est-add-linha" style="margin-top:12px">' +
      '<input id="sv-cnovo" maxlength="24" placeholder="nome do canal novo">' +
      '<select id="sv-ctipo" style="flex:0 0 96px"><option value="texto">texto</option>' +
      '<option value="voz">voz</option></select>' +
      '<button id="sv-cadd">CRIAR</button></div>',
    ligar: cx => {
      $("sv-cadd").addEventListener("click", async () => {
        const nome = limparTexto($("sv-cnovo").value.trim().slice(0, 24));
        if (!nome) return;
        const cid = "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 4);
        const ordem = Object.keys(SRV.canais).length + 1;
        const c = { nome, tipo: $("sv-ctipo").value, ordem, topico: "", lento: 0, perms: {} };
        if ((await srvEscrever(srvCaminho(sid, "canais/" + cid), c)) === null) return;
        SRV.canais[cid] = c;
        await srvRegistrar(sid, "canalCriou", nome);
        srvPintarConfig();
      });
      cx.querySelectorAll("[data-cdel]").forEach(b => b.addEventListener("click", async () => {
        const cid = b.getAttribute("data-cdel");
        const nome = SRV.canais[cid].nome;
        await srvEscrever(srvCaminho(sid, "canais/" + cid), null, "DELETE");
        delete SRV.canais[cid];
        await srvRegistrar(sid, "canalApagou", nome);
        srvPintarConfig();
      }));
      cx.querySelectorAll("[data-cedit]").forEach(b => b.addEventListener("click", () =>
        srvEditarCanal(sid, b.getAttribute("data-cedit"))));
    }
  };

  if (aba === "cargos") return {
    html:
      '<p class="est-nota">Um cargo mais alto manda no mais baixo. Ninguém mexe em quem ' +
      "está acima dele, nem entrega um cargo maior que o próprio.</p>" +
      Object.keys(SRV.cargos).sort((a, b) => (SRV.cargos[b].ordem || 0) - (SRV.cargos[a].ordem || 0))
        .map(rid => {
          const c = SRV.cargos[rid];
          const n = Object.keys(SRV.membros).filter(u =>
            (SRV.membros[u].cargos || []).indexOf(rid) >= 0).length;
          return '<div class="sv-linha"><b style="' + (c.cor ? "color:" + c.cor : "") + '">' +
            escaparTexto(c.emoji || "") + " " + escaparTexto(c.nome) + "</b>" +
            '<em class="sv-linha-n">' + n + "</em>" +
            '<span class="sv-linha-acoes">' +
            '<button class="est-ac" data-redit="' + rid + '">permissões</button>' +
            (c.base ? "" : '<button class="est-ac nao" data-rdel="' + rid + '">✕</button>') +
            "</span></div>";
        }).join("") +
      '<div class="est-add-linha" style="margin-top:12px">' +
      '<input id="sv-rnovo" maxlength="24" placeholder="nome do cargo">' +
      '<input id="sv-remoji" maxlength="2" placeholder="🏅" style="flex:0 0 54px;text-align:center">' +
      '<input id="sv-rcor" type="color" value="#4DE8FF" style="flex:0 0 46px;padding:2px">' +
      '<button id="sv-radd">CRIAR</button></div>',
    ligar: cx => {
      $("sv-radd").addEventListener("click", async () => {
        const rid = await srvCargoCriar(sid, $("sv-rnovo").value, $("sv-rcor").value,
                                        $("sv-remoji").value);
        if (rid) srvPintarConfig();
      });
      cx.querySelectorAll("[data-rdel]").forEach(b => b.addEventListener("click", async () => {
        if (await srvCargoApagar(sid, b.getAttribute("data-rdel"))) srvPintarConfig();
      }));
      cx.querySelectorAll("[data-redit]").forEach(b => b.addEventListener("click", () =>
        srvEditarCargo(sid, b.getAttribute("data-redit"))));
    }
  };

  if (aba === "membros") return {
    html: Object.keys(SRV.membros).map(uid => {
      const m = SRV.membros[uid];
      const castigo = srvCastigado(m);
      const cargos = (m.cargos || []).map(r => SRV.cargos[r]).filter(Boolean);
      return '<div class="sv-linha"><b>' + escaparTexto(m.nome || "Piloto") +
        (info.dono === uid ? ' <em class="est-cargo">dono</em>' : "") +
        (castigo ? ' <em class="est-cargo" style="color:var(--magenta)">de castigo</em>' : "") +
        "</b>" +
        '<span class="sv-cargos">' + cargos.map(c =>
          '<i style="' + (c.cor ? "color:" + c.cor : "") + '">' +
          escaparTexto(c.emoji || "") + escaparTexto(c.nome) + "</i>").join("") + "</span>" +
        '<span class="sv-linha-acoes">' +
        '<button class="est-ac" data-mger="' + uid + '">⋯</button></span></div>';
    }).join(""),
    ligar: cx => cx.querySelectorAll("[data-mger]").forEach(b =>
      b.addEventListener("click", () => srvGerirMembro(sid, b.getAttribute("data-mger"))))
  };

  if (aba === "convites") return {
    html: '<div id="sv-conv"><p class="est-nota">carregando…</p></div>' +
      '<div class="pf-campo" style="margin-top:12px"><label>CRIAR CONVITE</label>' +
      '<select id="sv-ccanal">' + Object.keys(SRV.canais)
        .filter(c => SRV.canais[c].tipo === "texto").map(c =>
        '<option value="' + c + '">vai cair em #' + escaparTexto(SRV.canais[c].nome) +
        "</option>").join("") + "</select>" +
      '<div class="est-prazos" style="margin-top:8px">' + CONVITE_PRAZOS.map(p =>
        '<button class="est-prazo" data-cpz="' + p.id + '">' + p.nome + "</button>").join("") + "</div>" +
      '<div class="est-prazos" style="margin-top:6px">' + CONVITE_USOS.map(u =>
        '<button class="est-prazo" data-cus="' + u.id + '">' + u.nome + "</button>").join("") + "</div>" +
      '<button class="est-jan-ok salvar" id="sv-cgerar">GERAR CONVITE</button></div>',
    ligar: async cx => {
      let pz = "1d", us = "0";
      const pinta = () => {
        cx.querySelectorAll("[data-cpz]").forEach(x => x.classList.toggle("on", x.getAttribute("data-cpz") === pz));
        cx.querySelectorAll("[data-cus]").forEach(x => x.classList.toggle("on", x.getAttribute("data-cus") === us));
      };
      cx.querySelectorAll("[data-cpz]").forEach(b => b.addEventListener("click", () => { pz = b.getAttribute("data-cpz"); pinta(); }));
      cx.querySelectorAll("[data-cus]").forEach(b => b.addEventListener("click", () => { us = b.getAttribute("data-cus"); pinta(); }));
      pinta();
      $("sv-cgerar").addEventListener("click", async () => {
        const cod = await srvCriarConvite(sid, $("sv-ccanal").value, pz, us);
        if (cod) { estAvisar("Convite criado: " + cod); srvPintarConfig(); }
      });
      const d = (await nuvemReq(srvCaminho(sid, "convites"))) || {};
      const ks = Object.keys(d);
      $("sv-conv").innerHTML = ks.length ? ks.map(k => {
        const c = d[k];
        const venceu = c.ate && c.ate < Date.now();
        return '<div class="sv-linha"><b class="sv-cod">' + escaparTexto(k) + "</b>" +
          "<em>" + (venceu ? "venceu" : (c.ate ? "vence " + quandoTexto(c.ate) : "não vence")) +
          " · " + (c.usos || 0) + (c.maxUsos ? "/" + c.maxUsos : "") + " usos</em>" +
          '<span class="sv-linha-acoes"><button class="est-ac nao" data-cvd="' + k +
          '">✕</button></span></div>';
      }).join("") : '<p class="est-nota">Nenhum convite agora.</p>';
      $("sv-conv").querySelectorAll("[data-cvd]").forEach(b =>
        b.addEventListener("click", async () => {
          const k = b.getAttribute("data-cvd");
          await srvEscrever(srvCaminho(sid, "convites/" + k), null, "DELETE");
          await srvEscrever("servidores/__codigos/" + k, null, "DELETE");
          await srvRegistrar(sid, "conviteApagou", k);
          srvPintarConfig();
        }));
    }
  };

  if (aba === "banidos") return {
    html: '<div id="sv-ban"><p class="est-nota">carregando…</p></div>',
    ligar: async () => {
      const d = (await nuvemReq(srvCaminho(sid, "banidos"))) || {};
      const ks = Object.keys(d);
      $("sv-ban").innerHTML = ks.length ? ks.map(uid => {
        const b = d[uid];
        return '<div class="sv-linha"><b>' + escaparTexto(b.nome || uid) + "</b>" +
          "<em>por " + escaparTexto(b.porNome || "?") + " · " + quandoTexto(b.quando) +
          (b.motivo ? " · " + escaparTexto(b.motivo) : "") + "</em>" +
          '<span class="sv-linha-acoes"><button class="est-ac" data-desb="' + uid +
          '">tirar</button></span></div>';
      }).join("") : '<p class="est-nota">Ninguém foi banido.</p>';
      $("sv-ban").querySelectorAll("[data-desb]").forEach(b =>
        b.addEventListener("click", async () => {
          const uid = b.getAttribute("data-desb");
          await srvDesbanir(sid, uid, (d[uid] || {}).nome);
          srvPintarConfig();
        }));
    }
  };

  if (aba === "impulsos") {
    const meus = impulsosQueTenho();
    const nv = nivelDoServidor(info);
    const eu = estEu();
    const dei = !!(save.impulsos || {})[sid];
    return {
      html:
        '<div class="srv-nivel"><b>' + nv.nome + "</b><span>" + (info.impulsos || 0) +
        " impulsos</span></div>" +
        '<div class="srv-barra-nv">' + NIVEIS_SERVIDOR.map(x =>
          '<i class="' + ((info.impulsos || 0) >= x.precisa ? "on" : "") + '"></i>').join("") + "</div>" +
        NIVEIS_SERVIDOR.map(x =>
          '<div class="srv-nv-cx' + (nv.nivel === x.nivel ? " on" : "") + '">' +
          "<b>" + x.nome + (x.precisa ? " · " + x.precisa + " impulsos" : "") + "</b><ul>" +
          x.ganhos.map(g => "<li>" + escaparTexto(g) + "</li>").join("") + "</ul></div>").join("") +
        '<p class="est-nota">Você tem <b>' + meus.total + "</b> impulso(s) pelo NeoNebula " +
        "(Bronze 1, Prata 2, Ouro 3) e " + meus.livres + " livre(s).</p>" +
        '<button class="est-jan-ok' + (dei ? "" : " salvar") + '" id="sv-imp">' +
        (dei ? "TIRAR MEU IMPULSO DAQUI" : "DAR UM IMPULSO") + "</button>",
      ligar: () => $("sv-imp").addEventListener("click", async () => {
        if (await srvImpulsionar(sid, !dei)) srvPintarConfig();
      })
    };
  }

  if (aba === "tag") return {
    html:
      '<p class="est-nota">A tag aparece do lado do nome de quem adotar, em toda a ' +
      "Estação — e quem clicar nela vê o seu servidor numa janelinha. Custa <b>" +
      TAG_CUSTA + " impulsos</b>; o servidor tem " + (info.impulsos || 0) + ".</p>" +
      '<div class="pf-campo"><label>TAG (até 5 letras)</label>' +
      '<input id="sv-tag" maxlength="5" value="' + escaparTexto(info.tag || "") +
      '" placeholder="NEON" style="text-transform:uppercase;text-align:center;' +
      'font-family:\'Russo One\',sans-serif;letter-spacing:.2em"></div>' +
      '<button class="est-jan-ok salvar" id="sv-tagsalvar"' +
      ((info.impulsos || 0) < TAG_CUSTA ? " disabled" : "") + ">SALVAR TAG</button>" +
      (info.tag ? '<button class="est-jan-ok" id="sv-tagadotar">' +
        (save.tagServidor === sid ? "PARAR DE USAR ESTA TAG" : "USAR ESTA TAG NO MEU NOME") +
        "</button>" : ""),
    ligar: () => {
      $("sv-tagsalvar").addEventListener("click", async () => {
        if (await srvDefinirTag(sid, $("sv-tag").value)) { estAvisar("Tag salva."); srvPintarConfig(); }
      });
      const ad = $("sv-tagadotar");
      if (ad) ad.addEventListener("click", () => {
        srvAdotarTag(save.tagServidor === sid ? "" : sid);
        srvPintarConfig();
        estPintar();
      });
    }
  };

  if (aba === "comunidade") {
    const com = info.comunidade || {};
    return {
      html:
        '<p class="est-nota">O modo comunidade liga a tela de regras e o canal de avisos ' +
        "que só os moderadores escrevem.</p>" +
        '<label class="srv-check"><input type="checkbox" id="sv-com"' +
        (com.ligada ? " checked" : "") + "><span>ligar o modo comunidade</span></label>" +
        '<div class="pf-campo" style="margin-top:10px"><label>CANAL DE REGRAS</label>' +
        '<select id="sv-regras"><option value="">nenhum</option>' +
        Object.keys(SRV.canais).filter(c => SRV.canais[c].tipo === "texto").map(c =>
          '<option value="' + c + '"' + (com.canalRegras === c ? " selected" : "") + ">#" +
          escaparTexto(SRV.canais[c].nome) + "</option>").join("") + "</select></div>" +
        '<div class="pf-campo"><label>CANAL DE AVISOS (só moderadores escrevem)</label>' +
        '<select id="sv-avisos"><option value="">nenhum</option>' +
        Object.keys(SRV.canais).filter(c => SRV.canais[c].tipo === "texto").map(c =>
          '<option value="' + c + '"' + (com.canalAvisos === c ? " selected" : "") + ">#" +
          escaparTexto(SRV.canais[c].nome) + "</option>").join("") + "</select></div>" +
        '<div class="pf-campo"><label>IDIOMA PRINCIPAL</label>' +
        '<select id="sv-idioma">' + [["pt", "Português"], ["en", "Inglês"], ["es", "Espanhol"]]
          .map(x => '<option value="' + x[0] + '"' + (com.idioma === x[0] ? " selected" : "") +
          ">" + x[1] + "</option>").join("") + "</select></div>" +
        '<button class="est-jan-ok salvar" id="sv-salvar">SALVAR</button>',
      ligar: () => $("sv-salvar").addEventListener("click", async () => {
        const ligada = $("sv-com").checked;
        const novo = { ligada, canalRegras: $("sv-regras").value,
                       canalAvisos: $("sv-avisos").value, idioma: $("sv-idioma").value };
        info.comunidade = novo;
        await srvEscrever(srvCaminho(sid, "info/comunidade"), novo);
        await srvRegistrar(sid, ligada ? "comunidadeLigou" : "comunidadeDesligou", info.nome);
        estAvisar("Salvo.");
      })
    };
  }

  if (aba === "seguranca") return {
    html:
      '<p class="est-nota">Aqui não existe autenticação em dois fatores de verdade: ' +
      "o jogo entra com o desenho da senha, sem e-mail nem telefone. O que dá para " +
      "fazer, e é honesto chamar pelo nome, é uma <b>chave de moderador</b>: " +
      "uma segunda senha, só sua, pedida antes de banir, expulsar ou apagar canal.</p>" +
      '<label class="srv-check"><input type="checkbox" id="sv-chave"' +
      ((info.config || {}).modChaveExigida ? " checked" : "") +
      "><span>pedir a chave antes das ações pesadas</span></label>" +
      '<button class="est-jan-ok salvar" id="sv-salvar">SALVAR</button>',
    ligar: () => $("sv-salvar").addEventListener("click", async () => {
      const cfg = Object.assign({}, info.config || {}, { modChaveExigida: $("sv-chave").checked });
      await salvarInfo("config", cfg);
      estAvisar("Salvo.");
    })
  };

  if (aba === "externo") return {
    html:
      '<p class="est-nota">Um webhook de verdade é um endereço que RECEBE pedidos de fora. ' +
      "Isso precisa de um servidor escutando, e o jogo é um arquivo numa página — " +
      "ele não tem como receber nada.</p>" +
      '<p class="est-nota">O que dá para fazer é o contrário, e é útil: o servidor MANDA ' +
      "o que acontece aqui para um endereço seu (um webhook do Discord, por exemplo). " +
      "Assim você acompanha de fora sem abrir o jogo.</p>" +
      '<div class="pf-campo"><label>MANDAR PARA</label>' +
      '<input id="sv-hook" maxlength="200" placeholder="https://…" value="' +
      escaparTexto((info.config || {}).webhook || "") + '"></div>' +
      '<button class="est-jan-ok salvar" id="sv-salvar">SALVAR</button>',
    ligar: () => $("sv-salvar").addEventListener("click", async () => {
      const u = String($("sv-hook").value || "").trim();
      /* só https, e nada de endereço interno: um endereço qualquer aqui
         viraria o jogo fazendo pedido para onde o dono não quis */
      if (u && !/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}\//i.test(u)) {
        estAvisar("Endereço inválido. Precisa começar com https://");
        return;
      }
      const cfg = Object.assign({}, info.config || {}, { webhook: u });
      await salvarInfo("config", cfg);
      estAvisar("Salvo.");
    })
  };

  if (aba === "emoji" || aba === "figu") return srvAbaEmoji(sid, info, aba);
  return { html: '<p class="est-nota">Nada aqui ainda.</p>' };
}

/* ---- editar um canal ---- */
function srvEditarCanal(sid, cid) {
  const c = SRV.canais[cid];
  if (!c) return;
  estJanela("Canal " + (c.tipo === "voz" ? "🔊" : "#") + " " + c.nome,
    '<div class="pf-campo"><label>NOME</label>' +
    '<input id="sc-nome" maxlength="24" value="' + escaparTexto(c.nome) + '"></div>' +
    '<div class="pf-campo"><label>ASSUNTO</label>' +
    '<input id="sc-top" maxlength="80" value="' + escaparTexto(c.topico || "") +
    '" placeholder="do que se fala aqui"></div>' +
    (c.tipo === "texto"
      ? '<div class="pf-campo"><label>MODO LENTO</label><select id="sc-lento">' +
        [0, 5, 15, 30, 60].map(n => '<option value="' + n + '"' +
          ((c.lento || 0) === n ? " selected" : "") + ">" +
          (n ? "uma a cada " + n + "s" : "sem limite") + "</option>").join("") + "</select></div>"
      : "") +
    '<div class="pf-campo"><label>QUEM PODE ENTRAR AQUI</label>' +
    '<p class="est-nota">Sem nenhum marcado, o canal é de todos. Marcando cargos, ' +
    "só eles veem.</p>" +
    Object.keys(SRV.cargos).map(rid => {
      const cg = SRV.cargos[rid];
      return '<label class="srv-check"><input type="checkbox" data-cperm="' + rid + '"' +
        ((c.perms || {})[rid] ? " checked" : "") + '><span style="' +
        (cg.cor ? "color:" + cg.cor : "") + '">' + escaparTexto(cg.emoji || "") + " " +
        escaparTexto(cg.nome) + "</span></label>";
    }).join("") + "</div>" +
    '<button class="est-jan-ok salvar" id="sc-salvar">SALVAR</button>',
    cx => $("sc-salvar").addEventListener("click", async () => {
      c.nome = limparTexto($("sc-nome").value.trim().slice(0, 24)) || c.nome;
      c.topico = limparTexto($("sc-top").value.slice(0, 80));
      const lt = $("sc-lento");
      if (lt) c.lento = parseInt(lt.value, 10) || 0;
      const perms = {};
      cx.querySelectorAll("[data-cperm]").forEach(x => {
        if (x.checked) perms[x.getAttribute("data-cperm")] = true;
      });
      c.perms = perms;
      await srvEscrever(srvCaminho(sid, "canais/" + cid), c);
      await srvRegistrar(sid, "canalEditou", c.nome);
      estFecharJanela();
      srvPintarConfig();
    }));
}

/* ---- editar um cargo: as 50 permissões ---- */
function srvEditarCargo(sid, rid) {
  const c = SRV.cargos[rid];
  if (!c) return;
  c.perms = c.perms || {};
  estJanela("Cargo " + c.nome,
    '<div class="pf-campo"><label>NOME</label>' +
    '<div class="est-add-linha">' +
    '<input id="sr-emoji" maxlength="2" value="' + escaparTexto(c.emoji || "") +
    '" style="flex:0 0 54px;text-align:center">' +
    '<input id="sr-nome" maxlength="24" value="' + escaparTexto(c.nome) + '">' +
    '<input id="sr-cor" type="color" value="' + (c.cor || "#4DE8FF") +
    '" style="flex:0 0 46px;padding:2px"></div></div>' +
    '<label class="srv-check"><input type="checkbox" id="sr-sep"' +
    (c.separado ? " checked" : "") + "><span>mostrar separado na lista de membros</span></label>" +
    PERM_FAMILIAS.map(f =>
      '<div class="pf-campo"><label>' + f.ic + " " + f.nome + "</label>" +
      PERMS.filter(p => p.g === f.id).map(p =>
        '<label class="srv-perm"><input type="checkbox" data-perm="' + p.id + '"' +
        (c.perms[p.id] ? " checked" : "") + "><span><b>" + escaparTexto(p.nome) + "</b>" +
        "<em>" + escaparTexto(p.sobre) + "</em></span></label>").join("") + "</div>").join("") +
    '<button class="est-jan-ok salvar" id="sr-salvar">SALVAR</button>',
    cx => $("sr-salvar").addEventListener("click", async () => {
      c.nome = limparTexto($("sr-nome").value.trim().slice(0, 24)) || c.nome;
      c.emoji = $("sr-emoji").value.slice(0, 4);
      c.cor = $("sr-cor").value;
      c.separado = $("sr-sep").checked;
      const perms = {};
      cx.querySelectorAll("[data-perm]").forEach(x => {
        if (x.checked) perms[x.getAttribute("data-perm")] = true;
      });
      c.perms = perms;
      await srvCargoSalvar(sid, rid);
      estFecharJanela();
      srvPintarConfig();
    }));
}

/* ---- o que dá para fazer com um membro ---- */
function srvGerirMembro(sid, uid) {
  const m = SRV.membros[uid];
  const info = SRV.aberto;
  if (!m || !info) return;
  const souDono = info.dono === uid;
  const posso = srvPodeMexerEm(uid);
  estJanela(m.nome || "Piloto",
    (souDono ? '<p class="est-nota">É o dono do servidor.</p>' : "") +
    (!posso && !souDono ? '<p class="est-nota">Essa pessoa está no mesmo nível ou acima ' +
      "do seu — você não pode moderá-la.</p>" : "") +
    '<div class="pf-campo"><label>CARGOS</label>' +
    Object.keys(SRV.cargos).sort((a, b) => (SRV.cargos[b].ordem || 0) - (SRV.cargos[a].ordem || 0))
      .map(rid => {
        const c = SRV.cargos[rid];
        if (c.base) return "";
        return '<label class="srv-check"><input type="checkbox" data-mc="' + rid + '"' +
          ((m.cargos || []).indexOf(rid) >= 0 ? " checked" : "") +
          (srvPode("gerirCargos") ? "" : " disabled") + '><span style="' +
          (c.cor ? "color:" + c.cor : "") + '">' + escaparTexto(c.emoji || "") + " " +
          escaparTexto(c.nome) + "</span></label>";
      }).join("") + "</div>" +
    (posso && srvPode("castigar")
      ? '<div class="pf-campo"><label>CASTIGO</label>' +
        '<p class="est-nota">De castigo a pessoa continua vendo tudo, mas não fala, ' +
        "não reage e não entra na voz.</p>" +
        '<div class="est-prazos">' + CASTIGOS.map(c =>
          '<button class="est-prazo" data-cast="' + c.id + '">' + c.nome + "</button>").join("") +
        (srvCastigado(m) ? '<button class="est-prazo on" data-cast="0">tirar o castigo</button>' : "") +
        "</div></div>" : "") +
    (posso && srvPode("expulsar")
      ? '<button class="est-jan-ok" data-m="expulsar">EXPULSAR</button>' : "") +
    (posso && srvPode("banir")
      ? '<button class="est-jan-ok perigo" data-m="banir">BANIR PARA SEMPRE</button>' : ""),
    cx => {
      cx.querySelectorAll("[data-mc]").forEach(b => b.addEventListener("change", async () => {
        await srvDarCargo(sid, uid, b.getAttribute("data-mc"), b.checked);
      }));
      cx.querySelectorAll("[data-cast]").forEach(b => b.addEventListener("click", async () => {
        const v = b.getAttribute("data-cast");
        await srvCastigar(sid, uid, m.nome, v === "0" ? null : v);
        estFecharJanela();
        srvPintarConfig();
      }));
      cx.querySelectorAll("[data-m]").forEach(b => b.addEventListener("click", async () => {
        const q = b.getAttribute("data-m");
        if (q === "expulsar") await srvExpulsar(sid, uid, m.nome);
        else await srvBanir(sid, uid, m.nome, "");
        estFecharJanela();
        srvPintarConfig();
      }));
    });
}

/* =====================================================================
   EMOJIS E FIGURINHAS
   ---------------------------------------------------------------------
   O ARQUIVO É REDESENHADO ANTES DE SER GUARDADO, e é isto que faz a
   coisa toda caber.

   Guardar o arquivo como veio seria o fim: um PNG de 256KB vira uns
   350KB depois de virar texto, e cinquenta emojis assim são 17 megabytes
   que TODO jogador baixaria toda sessão — no jogo que foi feito para
   rodar em celular fraco e no 3G da mãe.

   Redesenhado para 128×128 em WebP, o mesmo emoji fica em uns 8KB. Os
   mesmos cinquenta viram 400KB. É a diferença entre existir e não.

   Por isso o limite de 256KB é só a porta de entrada: o que entra no
   banco é sempre o desenho pequeno.
   ===================================================================== */
const EMOJI_TIPOS = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"];
const EMOJI_MAX_ENTRADA = 256 * 1024;
const FIGU_MAX_ENTRADA = 512 * 1024;

function srvEncolher(arquivo, lado) {
  return new Promise((ok, falha) => {
    const leitor = new FileReader();
    leitor.onerror = () => falha(new Error("não deu para ler"));
    leitor.onload = () => {
      const img = new Image();
      img.onerror = () => falha(new Error("não é uma imagem"));
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = c.height = lado;
        const x = c.getContext("2d");
        /* encaixa sem espremer: a parte que sobra é cortada, porque emoji
           esticado fica feio e ninguém entende o que era */
        const menor = Math.min(img.width, img.height);
        x.drawImage(img, (img.width - menor) / 2, (img.height - menor) / 2, menor, menor,
                    0, 0, lado, lado);
        let saida = "";
        try { saida = c.toDataURL("image/webp", 0.86); } catch (e) {}
        if (!saida || saida.indexOf("data:image/webp") !== 0) saida = c.toDataURL("image/png");
        ok(saida);
      };
      img.src = leitor.result;
    };
    leitor.readAsDataURL(arquivo);
  });
}

function srvAbaEmoji(sid, info, aba) {
  const figu = aba === "figu";
  const no = figu ? "figurinhas" : "emojis";
  const espacos = figu ? espacosDeFigurinha(info) : espacosDeEmoji(info);
  const lado = figu ? 160 : 128;
  const maxEntrada = figu ? FIGU_MAX_ENTRADA : EMOJI_MAX_ENTRADA;
  return {
    html:
      '<p class="est-nota">' +
      (figu ? "Figurinhas são maiores e ficam sozinhas na mensagem. "
            : "Emojis entram no meio do texto, como :nome:. ") +
      "Aceita JPEG, PNG, GIF, WebP e AVIF, até " + Math.round(maxEntrada / 1024) + "KB. " +
      "O jogo redesenha tudo para " + lado + "×" + lado +
      " antes de guardar, senão a lista pesaria megabytes no celular de todo mundo.</p>" +
      '<div class="srv-nivel"><b>' + nivelDoServidor(info).nome + "</b>" +
      '<span id="sv-emcont">— de ' + espacos + " espaços</span></div>" +
      '<div class="srv-emojis" id="sv-emlista"><p class="est-nota">carregando…</p></div>' +
      '<label class="est-jan-ok salvar" for="sv-emarq" style="display:block;text-align:center">' +
      "ESCOLHER ARQUIVO</label>" +
      '<input type="file" id="sv-emarq" accept="' + EMOJI_TIPOS.join(",") +
      '" style="display:none">' +
      '<div class="est-add-linha"><input id="sv-emnome" maxlength="16" ' +
      'placeholder="nome (sem espaço)"></div>' +
      '<p class="est-nota" id="sv-emresp"></p>',
    ligar: async () => {
      const lista = (await nuvemReq(srvCaminho(sid, no))) || {};
      const ks = Object.keys(lista);
      const cont = $("sv-emcont");
      if (cont) cont.textContent = ks.length + " de " + espacos + " espaços";
      $("sv-emlista").innerHTML = ks.length ? ks.map(k =>
        '<div class="srv-emoji"><img src="' + escaparTexto(lista[k].img) + '" alt="">' +
        "<em>:" + escaparTexto(lista[k].nome) + ":</em>" +
        '<button class="est-ac nao" data-emdel="' + k + '">✕</button></div>').join("")
        : '<p class="est-nota">Nenhum ainda.</p>';
      $("sv-emlista").querySelectorAll("[data-emdel]").forEach(b =>
        b.addEventListener("click", async () => {
          const k = b.getAttribute("data-emdel");
          await srvEscrever(srvCaminho(sid, no + "/" + k), null, "DELETE");
          await srvRegistrar(sid, "emojiTirou", (lista[k] || {}).nome || k);
          srvPintarConfig();
        }));

      $("sv-emarq").addEventListener("change", async ev => {
        const arq = ev.target.files && ev.target.files[0];
        const resp = $("sv-emresp");
        if (!arq) return;
        if (EMOJI_TIPOS.indexOf(arq.type) < 0) {
          resp.textContent = "Esse tipo de arquivo não serve. Use JPEG, PNG, GIF, WebP ou AVIF.";
          return;
        }
        if (arq.size > maxEntrada) {
          resp.textContent = "O arquivo tem " + Math.round(arq.size / 1024) +
            "KB e o limite é " + Math.round(maxEntrada / 1024) + "KB.";
          return;
        }
        if (ks.length >= espacos) {
          resp.textContent = "Os " + espacos + " espaços estão cheios. " +
            "Impulsos sobem o nível e abrem mais.";
          return;
        }
        let nome = String($("sv-emnome").value || arq.name.replace(/\.[^.]+$/, ""))
          .toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 16);
        if (!nome) { resp.textContent = "Dê um nome ao emoji."; return; }
        resp.textContent = "redesenhando…";
        let img = "";
        try { img = await srvEncolher(arq, lado); }
        catch (e) { resp.textContent = "Não deu para ler essa imagem."; return; }
        const k = "e" + Date.now().toString(36) + Math.random().toString(36).slice(2, 4);
        const eu = estEu();
        const r = await srvEscrever(srvCaminho(sid, no + "/" + k),
          { nome, img, por: eu ? eu.id : "", quando: Date.now() });
        if (r === null) { resp.textContent = "A nuvem recusou."; return; }
        await srvRegistrar(sid, "emojiAdd", nome, Math.round(img.length / 1024) + "KB");
        resp.textContent = "Pronto! Ficou com " + Math.round(img.length / 1024) + "KB.";
        srvPintarConfig();
      });
    }
  };
}
