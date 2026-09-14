/* =====================================================================
   NEONEBULA E O PERFIL DO PILOTO
   =====================================================================
   Duas coisas que andam juntas: quem você é para os outros (o perfil) e
   o que a assinatura NeoNebula destrava nele.

   POR QUE ISTO MORA NUM ARQUIVO SÓ, E ANTES DA ESTAÇÃO
   ---------------------------------------------------------------------
   O perfil é usado em três lugares que não se conhecem: o bate-papo
   (que desenha o nome e o avatar), o ranking e a tela de perfil do jogo.
   Se cada um guardasse a própria ideia de "cor do nome", um dia
   apareceria dourado num lugar e branco no outro. Aqui é a única fonte.

   O QUE O NEONEBULA É, E O QUE ELE NÃO É
   ---------------------------------------------------------------------
   São três níveis que valem 30 dias cada. O pedido foi "por mês" — e é
   isso na prática, mas vendido como um passe de 30 dias, não como
   cobrança automática. O motivo é honesto: Pix não faz cobrança
   recorrente sem contrato de provedor de pagamento (que exige CNPJ e
   maior de idade). Fingir que renova sozinho seria mentir para quem
   paga; um passe que acaba e avisa é verdade.

   O nível ILIMITADO não se compra: é do dono do jogo, e vem de graça
   junto com a conta dele.
   ===================================================================== */

const NEO_NIVEIS = [
  {
    id: "bronze", nome: "NEONEBULA BRONZE", preco: 0.50, dias: 30,
    cor: "#C77B3F", selo: "✦",
    resumo: "o começo: cor no nome, bio maior e selo",
    beneficios: [
      "cor do nome no bate-papo (8 cores)",
      "selo de bronze do lado do seu nome",
      "bio de 300 letras em vez de 140",
      "6 fundos de perfil",
      "1 animação de nave exclusiva"
    ]
  },
  {
    id: "prata", nome: "NEONEBULA PRATA", preco: 1.00, dias: 30,
    cor: "#C8D4E8", selo: "✧",
    resumo: "o nome brilha, e o perfil ganha vida",
    beneficios: [
      "tudo do Bronze",
      "brilho no nome (o efeito NEON)",
      "16 cores de nome",
      "12 fundos de perfil, alguns em movimento",
      "3 animações de nave exclusivas",
      "emojis extras no bate-papo",
      "mensagem de 500 letras em vez de 300"
    ]
  },
  {
    id: "ouro", nome: "NEONEBULA OURO", preco: 3.00, dias: 30,
    cor: "#FFC145", selo: "★",
    resumo: "tudo, e o nome com efeito de verdade",
    beneficios: [
      "tudo do Prata",
      "efeitos de nome GLITCH e ARCO-ÍRIS",
      "todas as cores de nome",
      "todos os fundos de perfil",
      "todas as animações de nave",
      "sua entrada aparece no #geral",
      "prioridade quando você denunciar alguém"
    ]
  },
  {
    id: "ilimitado", nome: "NEONEBULA ILIMITADO", preco: 0, dias: 0,
    cor: "#C34DFF", selo: "♛", oculto: true,
    resumo: "a assinatura do dono: tudo, para sempre",
    beneficios: ["tudo do Ouro, sem prazo para acabar"]
  }
];
const NEO_ORDEM = { nenhum: 0, bronze: 1, prata: 2, ouro: 3, ilimitado: 4 };

function neoDe(p) {
  p = p || save;
  if (!p) return "nenhum";
  /* o dono tem ILIMITADO de graça, e isso não depende de nada guardado:
     se dependesse, um save perdido tiraria o dono do próprio jogo */
  try { if (contaDeDono(p.__name)) return "ilimitado"; } catch (e) {}
  const n = p.neo && p.neo.nivel;
  if (!n || n === "nenhum") return "nenhum";
  if (n === "ilimitado") return "ilimitado";
  if ((p.neo.ate || 0) < Date.now()) return "nenhum";      // passou do prazo
  return n;
}
function neoNivel() { return neoDe(save); }
function neoTem(minimo) { return NEO_ORDEM[neoNivel()] >= NEO_ORDEM[minimo || "bronze"]; }
function neoInfo(id) { return NEO_NIVEIS.filter(x => x.id === id)[0] || null; }
function neoDiasQueFaltam() {
  if (neoNivel() === "ilimitado") return Infinity;
  return Math.max(0, Math.ceil(((save.neo && save.neo.ate || 0) - Date.now()) / 86400000));
}
/* o selo que aparece do lado do nome, em qualquer lugar */
function neoSelo(nivel) {
  const i = neoInfo(nivel || neoNivel());
  return i && i.id !== "nenhum" ? i.selo : "";
}

/* dar o nível a uma conta. Um lugar só, porque a entrega automática, o
   painel e o presente do dono passam todos por aqui. */
function neoDar(p, nivel, dias) {
  if (!p) return;
  const info = neoInfo(nivel);
  if (!info) return;
  p.neo = p.neo || { nivel: "nenhum", ate: 0 };
  const agora = Date.now();
  /* subiu de nível: o prazo recomeça. Continuou no mesmo: soma.
     Somar dias de Bronze num Ouro seria rebaixar quem pagou mais. */
  const mesmo = p.neo.nivel === nivel && (p.neo.ate || 0) > agora;
  const base = mesmo ? p.neo.ate : agora;
  p.neo.nivel = nivel;
  p.neo.ate = nivel === "ilimitado" ? 0 : base + (dias || info.dias) * 86400000;
}

/* =====================================================================
   O PERFIL
   ---------------------------------------------------------------------
   Bio, pronomes, avatar, fundo, cor e efeito do nome. Tudo o que a
   pessoa escolhe sobre si mesma mora aqui, e sai daqui para o bate-papo,
   o ranking e a nuvem — um lugar só, uma verdade só.
   ===================================================================== */

/* As cores do nome. As primeiras oito são do Bronze para cima; o resto
   vai destravando. Quem não assina fica com a cor de sempre — que não é
   castigo, é o padrão bonito do jogo. */
const NEO_CORES = [
  { id: "cyan",    nome: "Ciano",    cor: "#4DE8FF", nivel: "bronze" },
  { id: "verde",   nome: "Verde",    cor: "#5BF0B0", nivel: "bronze" },
  { id: "magenta", nome: "Magenta",  cor: "#FF4D8F", nivel: "bronze" },
  { id: "ambar",   nome: "Âmbar",    cor: "#FFC145", nivel: "bronze" },
  { id: "violeta", nome: "Violeta",  cor: "#C34DFF", nivel: "bronze" },
  { id: "coral",   nome: "Coral",    cor: "#FF7B4D", nivel: "bronze" },
  { id: "gelo",    nome: "Gelo",     cor: "#C8D4E8", nivel: "bronze" },
  { id: "limao",   nome: "Limão",    cor: "#C8F94D", nivel: "bronze" },
  { id: "rosa",    nome: "Rosa",     cor: "#FFA8D8", nivel: "prata" },
  { id: "turquesa",nome: "Turquesa", cor: "#4DFFD5", nivel: "prata" },
  { id: "azul",    nome: "Azul",     cor: "#7FB6FF", nivel: "prata" },
  { id: "lilas",   nome: "Lilás",    cor: "#B9A6FF", nivel: "prata" },
  { id: "fogo",    nome: "Fogo",     cor: "#FF5A3C", nivel: "prata" },
  { id: "ouro",    nome: "Ouro",     cor: "#FFE066", nivel: "prata" },
  { id: "menta",   nome: "Menta",    cor: "#9BF7C4", nivel: "prata" },
  { id: "sangue",  nome: "Sangue",   cor: "#E03050", nivel: "prata" },
  { id: "branco",  nome: "Branco",   cor: "#FFFFFF", nivel: "ouro" },
  { id: "abismo",  nome: "Abismo",   cor: "#6B7BFF", nivel: "ouro" }
];
/* os efeitos do nome: o que faz a pessoa olhar duas vezes */
const NEO_EFEITOS = [
  { id: "nenhum", nome: "Sem efeito", nivel: "nenhum" },
  { id: "neon",   nome: "Neon",       nivel: "prata" },
  { id: "pulso",  nome: "Pulso",      nivel: "prata" },
  { id: "glitch", nome: "Glitch",     nivel: "ouro" },
  { id: "arco",   nome: "Arco-íris",  nivel: "ouro" }
];
/* os fundos do perfil. Os três primeiros são de graça — o pedido foi
   exatamente esse: alguns grátis, o resto do NeoNebula. */
const NEO_FUNDOS = [
  { id: "vazio",   nome: "Vazio",        nivel: "nenhum", css: "linear-gradient(160deg,#0A1428,#050813)" },
  { id: "nebulosa",nome: "Nebulosa",     nivel: "nenhum", css: "linear-gradient(140deg,#1B1040,#0A1428 60%,#050813)" },
  { id: "aurora",  nome: "Aurora",       nivel: "nenhum", css: "linear-gradient(120deg,#06263A,#0B3B45 50%,#071A2E)" },
  { id: "brasa",   nome: "Brasa",        nivel: "bronze", css: "linear-gradient(140deg,#3A1608,#1A0A10 60%,#0A0610)" },
  { id: "gelo2",   nome: "Geleira",      nivel: "bronze", css: "linear-gradient(150deg,#0E2E42,#123A52 55%,#071626)" },
  { id: "ferro",   nome: "Ferro-velho",  nivel: "bronze", css: "linear-gradient(160deg,#2A2E36,#14171E)" },
  { id: "roxo",    nome: "Vazio roxo",   nivel: "prata",  css: "linear-gradient(135deg,#2B0B4A,#120726 60%,#070312)" },
  { id: "mar",     nome: "Mar de Plasma",nivel: "prata",  css: "linear-gradient(130deg,#04304A,#0A5566 45%,#031C2B)" },
  { id: "fenda",   nome: "Fenda",        nivel: "prata",  css: "linear-gradient(105deg,#0A0618,#4A0F5C 50%,#0A0618)", anima: true },
  { id: "sol",     nome: "Estrela Morta",nivel: "prata",  css: "linear-gradient(140deg,#4A2A05,#7A4A08 40%,#1A0E02)", anima: true },
  { id: "prisma",  nome: "Prisma",       nivel: "ouro",   css: "linear-gradient(100deg,#4DE8FF,#C34DFF 40%,#FF4D8F 70%,#FFC145)", anima: true },
  { id: "buraco",  nome: "Buraco Negro", nivel: "ouro",   css: "radial-gradient(circle at 50% 45%,#000 18%,#2A1050 45%,#0A0618 75%)", anima: true }
];
/* as animações de nave: três de graça, como foi pedido */
const NEO_ANIMACOES = [
  { id: "nenhuma", nome: "Sem rastro",   nivel: "nenhum", cor: null },
  { id: "fogo",    nome: "Rastro de fogo", nivel: "nenhum", cor: "#FF7B4D" },
  { id: "gelo",    nome: "Rastro gelado",  nivel: "nenhum", cor: "#7FD4FF" },
  { id: "neon",    nome: "Rastro neon",    nivel: "bronze", cor: "#4DE8FF" },
  { id: "veneno",  nome: "Rastro tóxico",  nivel: "prata",  cor: "#9BF7C4" },
  { id: "sangue",  nome: "Rastro carmesim",nivel: "prata",  cor: "#FF4D6B" },
  { id: "arco",    nome: "Rastro arco-íris", nivel: "ouro", cor: "arco" },
  { id: "vazio",   nome: "Rastro do vazio",  nivel: "ouro", cor: "#C34DFF" }
];

const PERFIL_PADRAO = {
  bio: "", pronomes: "", cor: "", efeito: "nenhum",
  fundo: "vazio", animacao: "nenhuma", avatar: "",
  /* o que entrou na v9.0 (ver 09-perfil2.js). Tudo com um padrão, para
     que um perfil antigo, salvo antes disto existir, continue abrindo
     sem buraco nenhum. */
  fonte: "padrao", brilho: "nenhum", tema: "padrao", toque: "curto",
  clique: "afunda", interesses: "", blocos: "", foto: 0,
  c1h: 205, c1l: 30, c2h: 275, c2l: 22,
  /* o que entrou na v9.1 (ver 09-perfil3.js): fundo de imagem, vidro
     fosco, partículas, bordas de seção, cor dos títulos e ícone de
     estado. Tudo com padrão, para perfil antigo continuar abrindo. */
  banner: 0, horaDoDia: 0, particula: "nenhuma", borda: "linha",
  corTitulo: "", estadoIc: "bolinha", desfoque: 10, opacidade: 82,
  /* o degradê das duas cores saiu do banner e foi para o miolo do
     cartão (v9.1). Ângulo, formato, textura e movimento são dele. */
  angulo: 150, formato: "linear", textura: "nenhuma", fluir: 0
};
function perfilMeu() {
  save.perfil = Object.assign({}, PERFIL_PADRAO, save.perfil || {});
  return save.perfil;
}
/* posso usar isto? A regra é uma só, e vale para cor, efeito, fundo e
   animação — senão um dia o fundo checaria o nível e a cor não. */
function neoLiberado(item) {
  return NEO_ORDEM[neoNivel()] >= NEO_ORDEM[(item && item.nivel) || "nenhum"];
}
function neoAchar(lista, id) { return lista.filter(x => x.id === id)[0] || null; }

/* A cor e o efeito que valem AGORA — já filtrados pelo nível.
   Se a assinatura acabar, o nome volta ao normal sozinho em vez de
   continuar dourado de graça; e a escolha fica guardada, então
   renovando ela volta sem a pessoa ter que escolher de novo. */
function perfilCorDoNome(p) {
  p = p || save;
  const perfil = Object.assign({}, PERFIL_PADRAO, (p && p.perfil) || {});
  const c = neoAchar(NEO_CORES, perfil.cor);
  if (!c) return "";
  return NEO_ORDEM[neoDe(p)] >= NEO_ORDEM[c.nivel] ? c.cor : "";
}
function perfilEfeitoDoNome(p) {
  p = p || save;
  const perfil = Object.assign({}, PERFIL_PADRAO, (p && p.perfil) || {});
  const e = neoAchar(NEO_EFEITOS, perfil.efeito);
  if (!e || e.id === "nenhum") return "";
  return NEO_ORDEM[neoDe(p)] >= NEO_ORDEM[e.nivel] ? e.id : "";
}
function perfilFundo(p) {
  p = p || save;
  const perfil = Object.assign({}, PERFIL_PADRAO, (p && p.perfil) || {});
  const f = neoAchar(NEO_FUNDOS, perfil.fundo) || NEO_FUNDOS[0];
  return NEO_ORDEM[neoDe(p)] >= NEO_ORDEM[f.nivel] ? f : NEO_FUNDOS[0];
}
function perfilAnimacao(p) {
  p = p || save;
  const perfil = Object.assign({}, PERFIL_PADRAO, (p && p.perfil) || {});
  const a = neoAchar(NEO_ANIMACOES, perfil.animacao) || NEO_ANIMACOES[0];
  return NEO_ORDEM[neoDe(p)] >= NEO_ORDEM[a.nivel] ? a : NEO_ANIMACOES[0];
}
/* quantas letras a bio e a mensagem podem ter, por nível */
function perfilLimiteBio() { return neoTem("bronze") ? 300 : 140; }
function perfilLimiteMsg() { return neoTem("prata") ? 500 : 300; }

/* =====================================================================
   SALVAR
   ---------------------------------------------------------------------
   O pedido foi explícito: "vai ter que salvar". Então nada se aplica
   enquanto a pessoa mexe — ela escolhe, vê a prévia, e só o botão
   SALVAR grava. Assim dá para desistir sem estrago, que é o que a gente
   espera de um formulário.
   ===================================================================== */
function perfilSalvar(novo) {
  const p = perfilMeu();
  if (novo.bio !== undefined) p.bio = limparTexto(String(novo.bio).slice(0, perfilLimiteBio()));
  if (novo.pronomes !== undefined) p.pronomes = limparTexto(String(novo.pronomes).slice(0, 20));
  /* só entra o que o nível permite: sem isto, mexer no aparelho passaria
     uma cor de Ouro sem pagar, e ela apareceria para todo mundo */
  const guardaSe = (campo, lista) => {
    if (novo[campo] === undefined) return;
    const item = neoAchar(lista, novo[campo]);
    if (item && neoLiberado(item)) p[campo] = item.id;
  };
  guardaSe("cor", NEO_CORES);
  guardaSe("efeito", NEO_EFEITOS);
  guardaSe("fundo", NEO_FUNDOS);
  guardaSe("animacao", NEO_ANIMACOES);
  guardaSe("fonte", NEO_FONTES);
  guardaSe("brilho", NEO_BRILHOS);
  guardaSe("tema", NEO_TEMAS);
  guardaSe("toque", NEO_TOQUES);
  guardaSe("clique", NEO_CLIQUES);
  guardaSe("particula", NEO_PARTICULAS);
  guardaSe("borda", NEO_BORDAS);
  guardaSe("estadoIc", NEO_ESTADOS);
  guardaSe("formato", NEO_FORMATOS);
  guardaSe("textura", NEO_TEXTURAS);
  if (novo.fluir !== undefined) p.fluir = novo.fluir ? 1 : 0;
  /* a cor do título sai da MESMA lista de cores do nome: duas tabelas de
     cor um dia discordariam sobre o que é "violeta" */
  if (novo.corTitulo !== undefined) {
    const ct = neoAchar(NEO_CORES, novo.corTitulo);
    p.corTitulo = (ct && neoLiberado(ct)) ? ct.id : "";
  }
  if (novo.fundo === "foto") p.fundo = "foto";
  if (novo.horaDoDia !== undefined) p.horaDoDia = novo.horaDoDia ? 1 : 0;
  if (novo.avatar !== undefined) p.avatar = String(novo.avatar).slice(0, 12);
  /* O FUNDO DE DUAS CORES é o único que não vem de lista, então a guarda
     é outra: números, presos na faixa, nunca texto. Assim não existe
     jeito de escrever CSS aqui dentro. */
  if (novo.fundo === "meu") p.fundo = "meu";
  const numEntre = (v, min, max, reserva) => {
    const n = parseInt(v, 10);
    return isNaN(n) ? reserva : Math.max(min, Math.min(max, n));
  };
  if (novo.angulo !== undefined) p.angulo = numEntre(novo.angulo, 0, 359, p.angulo);
  if (novo.desfoque !== undefined) p.desfoque = numEntre(novo.desfoque, 0, 24, p.desfoque);
  if (novo.opacidade !== undefined) p.opacidade = numEntre(novo.opacidade, 35, 100, p.opacidade);
  if (novo.c1h !== undefined) p.c1h = numEntre(novo.c1h, 0, 359, p.c1h);
  if (novo.c2h !== undefined) p.c2h = numEntre(novo.c2h, 0, 359, p.c2h);
  if (novo.c1l !== undefined) p.c1l = numEntre(novo.c1l, 12, 72, p.c1l);
  if (novo.c2l !== undefined) p.c2l = numEntre(novo.c2l, 12, 72, p.c2l);
  /* interesses e blocos são listas de ids conhecidos, coladas por
     vírgula: o que não estiver na lista simplesmente não entra */
  if (novo.interesses !== undefined) {
    const teto = INTERESSES_MAX[neoNivel()] || 2;
    p.interesses = String(novo.interesses).split(",")
      .filter(x => NEO_INTERESSES.some(i => i.id === x)).slice(0, teto).join(",");
  }
  if (novo.blocos !== undefined) {
    p.blocos = String(novo.blocos).split(",")
      .filter(x => PF_BLOCOS.some(b => b.id === x)).join(",");
  }
  try { temaAplicar(); } catch (e) {}
  persist();
  try { nuvemEnviar(true); } catch (e) {}
  try { refreshMenu(); } catch (e) {}
  return p;
}

/* =====================================================================
   O QUE OS OUTROS VEEM
   ---------------------------------------------------------------------
   Os dados de outro jogador vêm da nuvem, ou seja: foram escritos por um
   estranho. Nada daqui entra na tela sem passar por escaparTexto, e a
   cor e o efeito só valem se forem de uma lista conhecida. Um "cor" com
   HTML dentro não vira nada.
   ===================================================================== */
function perfilDaNuvem(p) {
  const perfil = (p && p.perfil) || {};
  const nivelBruto = (p && p.neo) || "nenhum";
  const nivel = NEO_ORDEM[nivelBruto] !== undefined ? nivelBruto : "nenhum";
  const corItem = neoAchar(NEO_CORES, perfil.cor);
  const efItem = neoAchar(NEO_EFEITOS, perfil.efeito);
  const fundoItem = neoAchar(NEO_FUNDOS, perfil.fundo) || NEO_FUNDOS[0];
  const vale = item => item && NEO_ORDEM[nivel] >= NEO_ORDEM[item.nivel];
  /* o mesmo filtro para o que entrou na v9.0: fonte, brilho e
     interesses são de outra pessoa, então também só valem se estiverem
     numa lista que existe aqui */
  const daLista = (lista, id) => {
    const it = neoAchar(lista, id) || lista[0];
    return vale(it) ? it : lista[0];
  };
  return {
    nivel,
    selo: neoSelo(nivel),
    cor: vale(corItem) ? corItem.cor : "",
    efeito: vale(efItem) && efItem.id !== "nenhum" ? efItem.id : "",
    fundo: vale(fundoItem) ? fundoItem : NEO_FUNDOS[0],
    fundoCSS: perfilFundoCSSDaNuvem(perfil, nivel),
    fonte: daLista(NEO_FONTES, perfil.fonte),
    brilho: daLista(NEO_BRILHOS, perfil.brilho),
    temFoto: !!perfil.foto,
    interesses: String(perfil.interesses || "").split(",")
      .filter(x => NEO_INTERESSES.some(i => i.id === x)).slice(0, 10),
    blocos: String(perfil.blocos || "").split(",")
      .filter(x => PF_BLOCOS.some(b => b.id === x)),
    bio: String(perfil.bio || "").slice(0, 300),
    pronomes: String(perfil.pronomes || "").slice(0, 20)
  };
}
/* o pedacinho de estilo que pinta um nome, aqui e em qualquer lugar */
function perfilEstiloDoNome(v) {
  let e = "";
  if (v.cor) e += "color:" + v.cor + ";";
  /* a fonte vem de uma lista nossa, nunca do que a pessoa digitou:
     "font-family" aceita quase tudo, e "tudo" inclui coisa ruim */
  if (v.fonte && v.fonte.css) {
    e += "font-family:" + v.fonte.css + ";";
    if (v.fonte.espaco) e += "letter-spacing:" + v.fonte.espaco + ";";
  }
  return e;
}
function perfilClasseDoNome(v) {
  return v.efeito ? " neo-ef neo-" + v.efeito : "";
}

/* =====================================================================
   PRESENÇA: O QUE EU ESTOU FAZENDO, E O QUE OS OUTROS VEEM
   ---------------------------------------------------------------------
   Quatro estados, e cada um resolve um problema diferente de quem joga:

     ONLINE     estou aqui, pode falar comigo
     AUSENTE    saí um pouco (o jogo percebe sozinho, ver abaixo)
     OCUPADO    estou aqui mas NÃO me interrompa: sem som, sem pop-up
     INVISÍVEL  estou aqui e ninguém precisa saber

   O AUSENTE É AUTOMÁTICO porque ninguém lembra de marcar. Cinco minutos
   sem tocar em nada e ele entra sozinho; qualquer toque tira. Depender
   da pessoa lembrar é a mesma coisa que não existir.

   O INVISÍVEL é o único que MENTE para a nuvem: em vez de mandar "estou
   invisível" e torcer para o outro lado respeitar, ele manda um relógio
   velho — e todo mundo que ler vê "fora do ar", inclusive um curioso
   lendo o banco direto. Segredo que depende do outro lado ser educado
   não é segredo.

   NO CELULAR o pontinho vira um celularzinho, porque saber POR ONDE a
   pessoa está mudou o que você espera dela: quem está no telefone
   responde devagar, e isso evita cobrança à toa.
   ===================================================================== */
const PRESENCAS = [
  { id: "online",    nome: "Disponível",    cor: "#4CE07A", ic: "●",
    sobre: "todo mundo vê que você está aqui" },
  { id: "ausente",   nome: "Ausente",       cor: "#FFC145", ic: "☾",
    sobre: "entra sozinho depois de 5 minutos parado" },
  { id: "ocupado",   nome: "Não perturbe",  cor: "#FF4D6B", ic: "⊘",
    sobre: "sem som e sem aviso na tela" },
  { id: "invisivel", nome: "Invisível",     cor: "#7A8699", ic: "○",
    sobre: "você joga normal e aparece como fora do ar" }
];
const PRESENCA_PARADO = 5 * 60000;      // o que conta como "saiu um pouco"

function presencaEscolhida() {
  const p = (save && save.presenca) || "online";
  return PRESENCAS.some(x => x.id === p) ? p : "online";
}
function presencaInfo(id) { return PRESENCAS.filter(x => x.id === id)[0] || PRESENCAS[0]; }

/* a última vez que o dedo (ou o mouse) tocou em alguma coisa */
let presencaUltimoToque = Date.now();
function presencaAcordar() {
  const antes = presencaAgora();
  presencaUltimoToque = Date.now();
  /* estava ausente e voltou: a nuvem precisa saber já, senão o amigo
     continua vendo a luinha amarela de alguém que está bem ali */
  if (antes === "ausente") { try { nuvemEnviar(true); } catch (e) {} }
}
for (const ev of ["pointerdown", "keydown", "touchstart", "wheel"]) {
  addEventListener(ev, presencaAcordar, { passive: true });
}
/* trocar de aba conta como sair; voltar conta como acordar */
addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") presencaAcordar();
  else presencaUltimoToque = Date.now() - PRESENCA_PARADO;
});

/* o estado que vale AGORA: a escolha manda, menos quando a pessoa
   escolheu "disponível" e simplesmente parou */
function presencaAgora() {
  const escolhida = presencaEscolhida();
  if (escolhida !== "online") return escolhida;
  return (Date.now() - presencaUltimoToque > PRESENCA_PARADO) ? "ausente" : "online";
}
function presencaTrocar(id) {
  if (!PRESENCAS.some(x => x.id === id)) return;
  save.presenca = id;
  presencaUltimoToque = Date.now();
  persist();
  try { nuvemEnviar(true); } catch (e) {}
  try { estPintar(); } catch (e) {}
}

/* ---- o recado personalizado ----
   "Jogando a maratona", "voltando já", com emoji e com hora para sumir.
   O prazo importa: recado sem prazo fica meses dizendo "almoçando". */
const PRESENCA_PRAZOS = [
  { id: "0",   nome: "até eu tirar", ms: 0 },
  { id: "30m", nome: "30 minutos",   ms: 30 * 60000 },
  { id: "1h",  nome: "1 hora",       ms: 60 * 60000 },
  { id: "4h",  nome: "4 horas",      ms: 4 * 60 * 60000 },
  { id: "hoje",nome: "até o fim do dia", ms: -1 }
];
function recadoMeu() {
  const r = (save && save.recado) || null;
  if (!r || !r.txt) return null;
  if (r.ate && r.ate < Date.now()) { save.recado = null; persist(); return null; }
  return r;
}
function recadoDefinir(txt, prazoId, emoji) {
  txt = limparTexto(String(txt || "").trim().slice(0, 60));
  if (!txt) { save.recado = null; persist(); try { nuvemEnviar(true); } catch (e) {} return null; }
  const pz = PRESENCA_PRAZOS.filter(x => x.id === prazoId)[0] || PRESENCA_PRAZOS[0];
  let ate = 0;
  if (pz.ms > 0) ate = Date.now() + pz.ms;
  else if (pz.ms === -1) { const d = new Date(); d.setHours(23, 59, 59, 0); ate = d.getTime(); }
  save.recado = { txt, ate, emoji: String(emoji || "").slice(0, 4) };
  persist();
  try { nuvemEnviar(true); } catch (e) {}
  return save.recado;
}

/* ---- silenciar um canal, um grupo ou o servidor inteiro ----
   Por 15 min, 1 hora, 8 horas, 1 dia, ou até eu religar. Fica só neste
   aparelho de propósito: silenciar é sobre o MEU sossego agora, e
   carregar isso para o computador da escola seria surpresa ruim. */
const SILENCIO_PRAZOS = [
  { id: "15m", nome: "15 minutos", ms: 15 * 60000 },
  { id: "1h",  nome: "1 hora",     ms: 60 * 60000 },
  { id: "8h",  nome: "8 horas",    ms: 8 * 60 * 60000 },
  { id: "24h", nome: "24 horas",   ms: 24 * 60 * 60000 },
  { id: "sempre", nome: "até eu religar", ms: 0 }
];
let SILENCIADOS = {};
try { SILENCIADOS = JSON.parse(storageGet("nn_silencio", "{}")) || {}; } catch (e) { SILENCIADOS = {}; }
function silencioGuardar() {
  try { storageSet("nn_silencio", JSON.stringify(SILENCIADOS)); } catch (e) {}
}
function silenciado(chave) {
  const s = SILENCIADOS[chave];
  if (!s) return false;
  if (s.ate && s.ate < Date.now()) { delete SILENCIADOS[chave]; silencioGuardar(); return false; }
  return true;
}
function silenciar(chave, prazoId) {
  if (prazoId === null) { delete SILENCIADOS[chave]; silencioGuardar(); return false; }
  const pz = SILENCIO_PRAZOS.filter(x => x.id === prazoId)[0] || SILENCIO_PRAZOS[0];
  SILENCIADOS[chave] = { ate: pz.ms ? Date.now() + pz.ms : 0 };
  silencioGuardar();
  return true;
}

/* ---- NÃO PERTURBE de verdade ----
   Não adianta o ícone ficar vermelho e o jogo continuar apitando. Quem
   for tocar um som de aviso pergunta aqui primeiro. */
function podeIncomodar(chave) {
  if (presencaAgora() === "ocupado") return false;
  if (chave && silenciado(chave)) return false;
  return true;
}
