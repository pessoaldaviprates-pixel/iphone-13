/* =====================================================================
   O PERFIL, PARTE 2 — fonte, foto, fundo de duas cores e castigo
   =====================================================================
   O que entra aqui e por quê:

   FONTES DO NOME. Todas são fontes que o aparelho JÁ TEM. Nenhuma baixa
   nada: o jogo precisa abrir sem internet, e uma fonte de enfeite que
   não carrega deixaria o nome da pessoa numa fonte aleatória, ou pior,
   invisível enquanto baixa.

   A FOTO NÃO MORA NA FICHA DO PILOTO. A ficha de todo mundo é lida de
   vinte em vinte segundos, inteira, para saber quem está online. Com a
   foto lá dentro, cem pilotos × 5 KB viraria meio mega a cada vinte
   segundos no celular de cada um. A foto mora em conversas/__fotos/<id>
   e só é buscada quando alguém abre o perfil — e fica guardada depois
   disso. Na ficha vai só um "tem foto: sim".

   "conversas/" de novo porque é galho velho, que toda regra antiga do
   Firebase já libera. Um "fotos/" novo seria recusado calado.

   O FUNDO DE DUAS CORES é escolhido em duas rodas de cor. Ele NÃO
   substitui os fundos prontos: quem não quer escolher continua tendo a
   lista. É mais uma opção, não uma troca.
   ===================================================================== */

/* =====================================================================
   1. AS FONTES DO NOME
   ---------------------------------------------------------------------
   Duas de graça. As outras são do NeoNebula, como o resto.
   ===================================================================== */
const NEO_FONTES = [
  { id: "padrao", nome: "Padrão", nivel: "nenhum",
    css: '"Chakra Petch","Segoe UI",system-ui,sans-serif' },
  { id: "bloco", nome: "Bloco", nivel: "nenhum",
    css: '"Russo One","Chakra Petch",sans-serif' },
  { id: "maquina", nome: "Máquina", nivel: "bronze",
    css: 'ui-monospace,"SF Mono",Menlo,Consolas,monospace', espaco: ".06em" },
  { id: "livro", nome: "Livro", nivel: "bronze",
    css: 'Georgia,"Times New Roman",serif' },
  { id: "redonda", nome: "Redonda", nivel: "bronze",
    css: '-apple-system,system-ui,"Segoe UI",Roboto,sans-serif' },
  { id: "larga", nome: "Larga", nivel: "prata",
    css: 'Impact,Haettenschweiler,"Arial Narrow Bold",sans-serif', espaco: ".04em" },
  { id: "estreita", nome: "Estreita", nivel: "prata",
    css: '"Arial Narrow","Helvetica Neue",Arial,sans-serif', espaco: ".08em" },
  { id: "manuscrita", nome: "Manuscrita", nivel: "ouro",
    css: '"Segoe Script","Bradley Hand",cursive' },
  { id: "antiga", nome: "Antiga", nivel: "ouro",
    css: '"Palatino Linotype","Book Antiqua",Palatino,serif', espaco: ".05em" }
];

function perfilFonteDoNome(p) {
  p = p || save;
  const perfil = Object.assign({}, PERFIL_PADRAO, (p && p.perfil) || {});
  const f = neoAchar(NEO_FONTES, perfil.fonte) || NEO_FONTES[0];
  return NEO_ORDEM[neoDe(p)] >= NEO_ORDEM[f.nivel] ? f : NEO_FONTES[0];
}

/* =====================================================================
   2. O FUNDO DE DUAS CORES
   ---------------------------------------------------------------------
   Guardado como dois números de matiz e dois de tonalidade, e não como
   "#RRGGBB": assim não há como escrever CSS dentro do campo. Cor de
   outro jogador entra na minha tela, e cor que vira estilo é um buraco
   por onde passa qualquer coisa.
   ===================================================================== */
function corDeHSL(matiz, tom) {
  const h = Math.max(0, Math.min(359, Math.round(matiz || 0)));
  const l = Math.max(8, Math.min(78, Math.round(tom === undefined ? 45 : tom)));
  return "hsl(" + h + " 72% " + l + "%)";
}
/* o fundo que vale AGORA: ou o de duas cores, ou um da lista */
function perfilFundoCSS(p) {
  p = p || save;
  const perfil = Object.assign({}, PERFIL_PADRAO, (p && p.perfil) || {});
  if (perfil.fundo === "meu" && NEO_ORDEM[neoDe(p)] >= NEO_ORDEM["nenhum"]) {
    return "linear-gradient(150deg," + corDeHSL(perfil.c1h, perfil.c1l) + "," +
           corDeHSL(perfil.c2h, perfil.c2l) + ")";
  }
  return perfilFundo(p).css;
}
/* o mesmo, para um perfil que veio da nuvem (de outra pessoa) */
function perfilFundoCSSDaNuvem(perfil, nivel) {
  perfil = perfil || {};
  if (perfil.fundo === "meu") {
    return "linear-gradient(150deg," + corDeHSL(perfil.c1h, perfil.c1l) + "," +
           corDeHSL(perfil.c2h, perfil.c2l) + ")";
  }
  const f = neoAchar(NEO_FUNDOS, perfil.fundo) || NEO_FUNDOS[0];
  return (NEO_ORDEM[nivel] >= NEO_ORDEM[f.nivel] ? f : NEO_FUNDOS[0]).css;
}

/* =====================================================================
   3. A RODA DE COR
   ---------------------------------------------------------------------
   Uma roda de matiz (conic-gradient, sem imagem e sem canvas) e uma
   barrinha de tonalidade embaixo. Duas delas cabem no cartão: uma na
   parte de cima, outra na de baixo — e nenhuma encosta no banner nem na
   bio, que foi o pedido.

   Funciona com o dedo E com o mouse: pointerdown/move/up é o mesmo
   caminho para os dois, e sem isso a roda seria só de computador.
   ===================================================================== */
function rodaHTML(id, matiz, tom, titulo) {
  return '<div class="pf-roda-cx" data-roda="' + id + '">' +
    '<div class="pf-roda-h">' + escaparTexto(titulo) + "</div>" +
    '<div class="pf-roda" id="roda-' + id + '">' +
      '<i class="pf-roda-dot" id="dot-' + id + '"></i>' +
      '<b class="pf-roda-meio" id="meio-' + id + '"></b>' +
    "</div>" +
    '<input class="pf-tom" type="range" min="12" max="72" value="' + (tom || 45) +
    '" id="tom-' + id + '" aria-label="Tonalidade">' +
  "</div>";
}

/* liga uma roda desenhada. aoMudar(matiz, tom) é chamado a cada mexida */
function rodaLigar(id, matiz, tom, aoMudar) {
  const roda = $("roda-" + id), dot = $("dot-" + id), meio = $("meio-" + id),
        barra = $("tom-" + id);
  if (!roda || !dot) return;
  let h = matiz || 0, l = parseInt((barra && barra.value) || tom || 45, 10);
  const pintar = () => {
    const r = roda.clientWidth / 2;
    const rad = (h - 90) * Math.PI / 180;
    dot.style.left = (r + Math.cos(rad) * (r - 11)) + "px";
    dot.style.top = (r + Math.sin(rad) * (r - 11)) + "px";
    dot.style.background = corDeHSL(h, l);
    if (meio) meio.style.background = corDeHSL(h, l);
    if (aoMudar) aoMudar(h, l);
  };
  const daPosicao = e => {
    const r = roda.getBoundingClientRect();
    const x = (e.clientX - r.left) - r.width / 2;
    const y = (e.clientY - r.top) - r.height / 2;
    h = Math.round((Math.atan2(y, x) * 180 / Math.PI + 90 + 360) % 360);
    pintar();
  };
  let pegou = false;
  roda.addEventListener("pointerdown", e => {
    pegou = true;
    /* segurar o ponteiro faz o arrasto continuar mesmo saindo da roda --
       sem isto, escorregar o dedo para fora congelava a cor no meio da
       escolha e parecia que a roda tinha travado */
    try { roda.setPointerCapture(e.pointerId); } catch (err) {}
    daPosicao(e);
    e.preventDefault();
  });
  roda.addEventListener("pointermove", e => { if (pegou) { daPosicao(e); e.preventDefault(); } });
  roda.addEventListener("pointerup", e => {
    pegou = false;
    try { roda.releasePointerCapture(e.pointerId); } catch (err) {}
  });
  roda.addEventListener("pointercancel", () => { pegou = false; });
  if (barra) barra.addEventListener("input", () => { l = parseInt(barra.value, 10); pintar(); });
  pintar();
}

/* =====================================================================
   4. A FOTO DE PERFIL
   ---------------------------------------------------------------------
   Encolhida no próprio aparelho antes de subir. Uma foto de celular tem
   4 MB; guardada assim, abrir a Estação baixaria a galeria de todo
   mundo. 96×96 em webp dá uns 4 KB, e é o tamanho em que a foto aparece.
   ===================================================================== */
const FOTO_LADO = 96;
const FOTO_TETO = 40000;          // 40 KB depois de encolher: já é folgado
const FOTOS = {};                 // uid -> dataURL, para não buscar duas vezes

function fotoCaminho(uid) { return "conversas/__fotos/" + uid; }

/* recorta no quadrado do meio e encolhe. Recortar ANTES de encolher
   evita a foto achatada: sem isso, um retrato vira um ovo. */
function fotoEncolher(arquivo) {
  return new Promise((ok, falhou) => {
    const leitor = new FileReader();
    leitor.onerror = () => falhou(new Error("nao deu para ler"));
    leitor.onload = () => {
      const img = new Image();
      img.onerror = () => falhou(new Error("isso nao e uma imagem"));
      img.onload = () => {
        const menor = Math.min(img.width, img.height);
        const c = document.createElement("canvas");
        c.width = c.height = FOTO_LADO;
        const x = c.getContext("2d");
        x.imageSmoothingQuality = "high";
        x.drawImage(img, (img.width - menor) / 2, (img.height - menor) / 2, menor, menor,
                    0, 0, FOTO_LADO, FOTO_LADO);
        let saida = "";
        /* webp é bem menor, mas nem todo navegador antigo sabe fazer.
           Quando não sabe, toDataURL devolve um png caladinho -- por isso
           a conferência do prefixo, e não um try/catch só. */
        try { saida = c.toDataURL("image/webp", 0.82); } catch (e) {}
        if (!saida || saida.indexOf("data:image/webp") !== 0) saida = c.toDataURL("image/jpeg", 0.8);
        ok(saida);
      };
      img.src = leitor.result;
    };
    leitor.readAsDataURL(arquivo);
  });
}

async function fotoGuardar(arquivo) {
  const eu = estEu();
  if (!eu) return false;
  if (!arquivo || !/^image\//.test(arquivo.type)) {
    estAvisar("Escolha uma imagem (JPG, PNG, GIF ou WEBP).");
    return false;
  }
  let dado;
  try { dado = await fotoEncolher(arquivo); }
  catch (e) { estAvisar("Não consegui abrir essa imagem."); return false; }
  if (dado.length > FOTO_TETO) { estAvisar("Essa imagem ficou grande demais."); return false; }
  const r = await nuvemSoltar(fotoCaminho(eu.id), dado);
  if (r === null) { estAvisar("Não deu para guardar a foto. Confira a internet."); return false; }
  FOTOS[eu.id] = dado;
  const p = perfilMeu();
  p.foto = 1;                   /* na ficha vai só a marca, nunca a foto */
  persist();
  try { nuvemEnviar(true); } catch (e) {}
  estAvisar("Foto trocada.");
  return true;
}

async function fotoApagar() {
  const eu = estEu();
  if (!eu) return false;
  await nuvemSoltar(fotoCaminho(eu.id), null, "DELETE");
  delete FOTOS[eu.id];
  const p = perfilMeu();
  p.foto = 0;
  persist();
  try { nuvemEnviar(true); } catch (e) {}
  estAvisar("Foto removida. Voltou a inicial.");
  return true;
}

/* busca a foto de alguém, uma vez só. Devolve "" se a pessoa não tem. */
async function fotoDe(uid) {
  if (!uid) return "";
  if (FOTOS[uid] !== undefined) return FOTOS[uid];
  FOTOS[uid] = "";                       // marca que já foi buscada
  const d = await nuvemReq(fotoCaminho(uid));
  /* só entra o que É uma foto encolhida por nós. Um "dado" com
     javascript: dentro viraria um buraco na tela de quem olhasse o
     perfil, e isso é escrito por outra pessoa. */
  FOTOS[uid] = (typeof d === "string" && /^data:image\/(webp|jpeg|png);base64,/.test(d) &&
                d.length < FOTO_TETO * 2) ? d : "";
  return FOTOS[uid];
}

/* o avatar de qualquer um: foto se tiver, senão a inicial de sempre */
function avatarHTML(uid, nome, classe) {
  const foto = FOTOS[uid];
  const ini = escaparTexto(estIni(nome || "?"));
  if (foto) {
    return '<span class="' + classe + ' com-foto" style="background-image:url(' +
           foto + ')"></span>';
  }
  return '<span class="' + classe + '">' + ini + "</span>";
}

/* =====================================================================
   5. OS CASTIGOS
   ---------------------------------------------------------------------
   Só o dono do jogo dá. A setinha nem aparece para mais ninguém.

   O tempo é escolhido em número + unidade (segundos, minutos ou horas),
   porque "1 hora ou 6 horas" não serve para tudo: às vezes o certo são
   trinta segundos para a pessoa respirar, e às vezes é uma semana.

   Mora em conversas/__castigos/<uid>, galho velho e liberado. Quem está
   de castigo lê o próprio castigo e obedece — é o mesmo desenho das
   ordens da sala de voz, com a mesma honestidade: organiza gente de
   boa-fé, não é cadeado.
   ===================================================================== */
const CASTIGO_UNIDADES = [
  { id: "s", nome: "Segundos", ms: 1000 },
  { id: "m", nome: "Minutos",  ms: 60000 },
  { id: "h", nome: "Horas",    ms: 3600000 },
  { id: "d", nome: "Dias",     ms: 86400000 }
];
const CASTIGO_TIPOS = [
  { id: "falar", nome: "Não pode falar",
    sobre: "continua vendo tudo, mas não escreve em canal nenhum" },
  { id: "voz",   nome: "Não entra na voz",
    sobre: "fica fora das salas de voz" },
  { id: "tudo",  nome: "Não fala e não entra na voz",
    sobre: "as duas coisas de uma vez" }
];
const CASTIGO_DE = {};              // uid -> castigo, do que já foi lido

function castigoCaminho(uid) { return "conversas/__castigos/" + uid; }
function souOChefe() {
  try { return ehDono(save.__name); } catch (e) { return false; }
}

async function castigoDar(uid, nome, quanto, unidade, tipo, motivo) {
  if (!souOChefe()) { estAvisar("Só o dono do jogo dá castigo."); return false; }
  const u = CASTIGO_UNIDADES.filter(x => x.id === unidade)[0] || CASTIGO_UNIDADES[1];
  const n = Math.max(1, Math.min(9999, parseInt(quanto, 10) || 1));
  const castigo = {
    ate: Date.now() + n * u.ms,
    tipo: CASTIGO_TIPOS.some(x => x.id === tipo) ? tipo : "falar",
    motivo: String(motivo || "").slice(0, 80),
    por: (estEu() || {}).tag || "o dono",
    quando: Date.now()
  };
  const r = await nuvemSoltar(castigoCaminho(uid), castigo);
  if (r === null) { estAvisar("Não deu para aplicar. Confira a internet."); return false; }
  CASTIGO_DE[uid] = castigo;
  estAvisar(nome + " ficou de castigo por " + n + " " + u.nome.toLowerCase() + ".");
  return true;
}

async function castigoTirar(uid, nome) {
  if (!souOChefe()) return false;
  await nuvemSoltar(castigoCaminho(uid), null, "DELETE");
  delete CASTIGO_DE[uid];
  estAvisar((nome || "O piloto") + " foi perdoado.");
  return true;
}

async function castigoOlhar(uid) {
  if (!uid) return null;
  const c = await nuvemReq(castigoCaminho(uid));
  if (c && c.ate > Date.now()) { CASTIGO_DE[uid] = c; return c; }
  delete CASTIGO_DE[uid];
  return null;
}

/* o meu castigo, de memória: quem pergunta é o caminho de falar, e ele
   não pode esperar a nuvem a cada tecla */
function castigoMeu() {
  const eu = estEu();
  if (!eu) return null;
  const c = CASTIGO_DE[eu.id];
  return c && c.ate > Date.now() ? c : null;
}
function castigadoDe(oque) {
  const c = castigoMeu();
  if (!c) return null;
  if (c.tipo === "tudo" || c.tipo === oque) return c;
  return null;
}
function castigoQuantoFalta(c) {
  const s = Math.max(0, Math.round((c.ate - Date.now()) / 1000));
  if (s < 60) return s + " segundos";
  if (s < 3600) return Math.ceil(s / 60) + " minutos";
  if (s < 86400) return Math.ceil(s / 3600) + " horas";
  return Math.ceil(s / 86400) + " dias";
}

/* a janelinha da setinha, só para o dono */
function castigoAbrir(uid, nome) {
  if (!souOChefe()) return;
  const jaTem = CASTIGO_DE[uid];
  estJanela("Castigo de " + nome,
    (jaTem ? '<p class="est-nota">Já está de castigo: <b>' +
       escaparLongo(castigoQuantoFalta(jaTem)) + "</b> restantes.</p>" +
       '<button class="est-jan-ok" id="cast-perdoa">PERDOAR AGORA</button>' +
       '<p class="est-nota" style="margin-top:14px">Ou troque o castigo:</p>' : "") +
    '<div class="cast-linha">' +
      '<input id="cast-n" type="number" min="1" max="9999" value="10" aria-label="Quanto tempo">' +
      '<div class="cast-uni" id="cast-uni">' + CASTIGO_UNIDADES.map((u, i) =>
        '<button class="cast-u' + (i === 1 ? " on" : "") + '" data-uni="' + u.id + '">' +
        u.nome + "</button>").join("") + "</div>" +
    "</div>" +
    '<div class="cast-tipos" id="cast-tipos">' + CASTIGO_TIPOS.map((t, i) =>
      '<button class="cast-t' + (i === 0 ? " on" : "") + '" data-tipo="' + t.id + '">' +
      "<strong>" + t.nome + "</strong><em>" + escaparLongo(t.sobre) + "</em></button>").join("") +
    "</div>" +
    '<input id="cast-motivo" maxlength="80" placeholder="Por quê? (a pessoa vê)" autocomplete="off">' +
    '<button class="est-jan-ok perigo" id="cast-ok">APLICAR O CASTIGO</button>',
    cx => {
      let uni = "m", tipo = "falar";
      cx.querySelectorAll("[data-uni]").forEach(b => b.addEventListener("click", () => {
        uni = b.getAttribute("data-uni");
        cx.querySelectorAll("[data-uni]").forEach(o => o.classList.toggle("on", o === b));
      }));
      cx.querySelectorAll("[data-tipo]").forEach(b => b.addEventListener("click", () => {
        tipo = b.getAttribute("data-tipo");
        cx.querySelectorAll("[data-tipo]").forEach(o => o.classList.toggle("on", o === b));
      }));
      const perdoa = $("cast-perdoa");
      if (perdoa) perdoa.addEventListener("click", async () => {
        await castigoTirar(uid, nome);
        estFecharJanela();
      });
      $("cast-ok").addEventListener("click", async () => {
        await castigoDar(uid, nome, $("cast-n").value, uni, tipo, $("cast-motivo").value);
        estFecharJanela();
      });
    });
}

/* de tempos em tempos eu confiro o MEU castigo: se alguém me castigou
   enquanto eu jogava, a próxima mensagem já não sai */
setInterval(() => {
  try {
    const eu = estEu();
    if (eu && nuvemAtiva()) castigoOlhar(eu.id);
  } catch (e) {}
}, 45000);

/* =====================================================================
   6. MAIS PERSONALIZAÇÃO
   ---------------------------------------------------------------------
   A referência pedia vinte e quatro coisas. Aqui estão as que dá para
   fazer DE VERDADE neste jogo, e cada uma reaproveita o que ele já tem
   em vez de inventar um sistema paralelo:

     · moldura do avatar   -> as MOLDURAS que o jogo já dá por mérito
     · emblemas            -> as CONQUISTAS que a pessoa já ganhou
     · brilho do avatar    -> o "avatar animado" da referência
     · interesses          -> cartõezinhos do que a pessoa gosta de jogar
     · atividade recente   -> o que o jogo já sabe: fase, abates, vitórias
     · amigos em comum     -> quem eu e ela temos em comum
     · tema do jogo        -> a cor de acento da tela inteira
     · som de aviso        -> qual toque a Estação usa
     · efeito de clique    -> o que acontece quando você aperta um botão
     · arrumar o perfil    -> escolher QUAIS blocos aparecem e em que ordem

   O QUE NÃO ESTÁ AQUI, E POR QUÊ (dizer é melhor que fingir):
     · mural de mídia e galeria: precisa de um lugar para guardar
       arquivo grande, e este jogo não tem nenhum
     · avatar 3D interativo: o motor 3D existe, mas carregar um boneco
       por perfil derrubaria o celular fraco que é o alvo do jogo
     · integração com outros aplicativos: cada uma é uma conta, uma
       chave e um servidor -- nada disso cabe num arquivo só
     · modo claro: o jogo inteiro é desenhado no escuro; um tema claro
       é refazer a folha de estilo, não trocar duas cores
   ===================================================================== */

/* o brilho em volta do avatar -- o "avatar animado" da referência */
const NEO_BRILHOS = [
  { id: "nenhum", nome: "Sem brilho",  nivel: "nenhum" },
  { id: "suave",  nome: "Suave",       nivel: "nenhum" },
  { id: "anel",   nome: "Anel girando",nivel: "bronze" },
  { id: "faisca", nome: "Faíscas",     nivel: "prata" },
  { id: "pulso",  nome: "Batimento",   nivel: "prata" },
  { id: "orbita", nome: "Órbita",      nivel: "ouro" }
];
/* a cor de acento do jogo inteiro -- o "tema global" da referência */
const NEO_TEMAS = [
  { id: "padrao",  nome: "Nebulosa",  nivel: "nenhum", cor: "#4DE8FF" },
  { id: "verde",   nome: "Plasma",    nivel: "bronze", cor: "#5BF0B0" },
  { id: "rosa",    nome: "Carmim",    nivel: "bronze", cor: "#FF4D8F" },
  { id: "ambar",   nome: "Solar",     nivel: "prata",  cor: "#FFC145" },
  { id: "violeta", nome: "Vazio",     nivel: "prata",  cor: "#C34DFF" },
  { id: "branco",  nome: "Estação",   nivel: "ouro",   cor: "#D8E8FF" }
];
/* o toque de aviso da Estação */
const NEO_TOQUES = [
  { id: "nenhum", nome: "Mudo",      nivel: "nenhum", nota: 0 },
  { id: "curto",  nome: "Bipe",      nivel: "nenhum", nota: 880 },
  { id: "duplo",  nome: "Dois bipes",nivel: "bronze", nota: 660 },
  { id: "grave",  nome: "Grave",     nivel: "prata",  nota: 330 },
  { id: "sino",   nome: "Sino",      nivel: "ouro",   nota: 1320 }
];
/* o que acontece ao apertar um botão */
const NEO_CLIQUES = [
  { id: "nenhum", nome: "Nada",        nivel: "nenhum" },
  { id: "afunda", nome: "Afunda",      nivel: "nenhum" },
  { id: "onda",   nome: "Onda",        nivel: "bronze" },
  { id: "brilha", nome: "Brilha",      nivel: "prata" },
  { id: "faisca", nome: "Solta faísca",nivel: "ouro" }
];
/* os cartõezinhos de interesse: o que a pessoa gosta de fazer no jogo */
const NEO_INTERESSES = [
  { id: "campanha", nome: "Campanha",  ic: "🚀" },
  { id: "ranque",   nome: "Ranqueada", ic: "🏆" },
  { id: "arena",    nome: "Arena",     ic: "⚔" },
  { id: "dupla",    nome: "Jogar em dupla", ic: "🤝" },
  { id: "chefes",   nome: "Caçar chefes",   ic: "👾" },
  { id: "colecao",  nome: "Colecionar naves", ic: "🛸" },
  { id: "trocas",   nome: "Trocar coisas",    ic: "💱" },
  { id: "conversa", nome: "Conversar",        ic: "💬" },
  { id: "ajudar",   nome: "Ajudar quem começou", ic: "🧭" },
  { id: "recorde",  nome: "Bater recorde",    ic: "📈" }
];
const INTERESSES_MAX = { nenhum: 2, bronze: 4, prata: 6, ouro: 8, ilimitado: 10 };

/* os blocos do perfil, e a ordem em que aparecem. O "layout modular" da
   referência é isto: a pessoa liga, desliga e arrasta. */
const PF_BLOCOS = [
  { id: "sobre",     nome: "Sobre mim",        sempre: true },
  { id: "emblemas",  nome: "Emblemas" },
  { id: "interesses",nome: "Interesses" },
  { id: "atividade", nome: "Atividade recente" },
  { id: "amigos",    nome: "Amigos em comum" },
  { id: "naves",     nome: "Naves e coleção" }
];
const PF_BLOCOS_PADRAO = ["sobre", "emblemas", "interesses", "atividade", "amigos", "naves"];

function perfilEscolha(lista, campo, p) {
  p = p || save;
  const perfil = Object.assign({}, PERFIL_PADRAO, (p && p.perfil) || {});
  const item = neoAchar(lista, perfil[campo]) || lista[0];
  return NEO_ORDEM[neoDe(p)] >= NEO_ORDEM[item.nivel] ? item : lista[0];
}
function perfilBrilho(p) { return perfilEscolha(NEO_BRILHOS, "brilho", p); }
function perfilTema(p)   { return perfilEscolha(NEO_TEMAS, "tema", p); }
function perfilToque(p)  { return perfilEscolha(NEO_TOQUES, "toque", p); }
function perfilClique(p) { return perfilEscolha(NEO_CLIQUES, "clique", p); }
function perfilInteresses(p) {
  p = p || save;
  const perfil = Object.assign({}, PERFIL_PADRAO, (p && p.perfil) || {});
  const teto = INTERESSES_MAX[neoDe(p)] || 2;
  return String(perfil.interesses || "").split(",")
    .filter(x => NEO_INTERESSES.some(i => i.id === x)).slice(0, teto);
}
function perfilBlocos(p) {
  p = p || save;
  const perfil = Object.assign({}, PERFIL_PADRAO, (p && p.perfil) || {});
  const guardado = String(perfil.blocos || "").split(",").filter(x =>
    PF_BLOCOS.some(b => b.id === x));
  return guardado.length ? guardado : PF_BLOCOS_PADRAO.slice();
}

/* O TEMA VALE NA TELA INTEIRA, e por isso mexe numa variável do CSS em
   vez de repintar botão por botão. Uma troca, tudo muda junto. */
function temaAplicar() {
  try {
    const t = perfilTema();
    const c = perfilClique();
    document.documentElement.style.setProperty("--cyan", t.cor);
    document.body.setAttribute("data-clique", c.id);
  } catch (e) {}
}

/* o toque de aviso: uma nota curta, feita na hora. Não é arquivo de som
   -- o jogo tem que caber num arquivo só e funcionar sem internet. */
function toqueTocar() {
  try {
    const t = perfilToque();
    if (!t.nota || AudioSys.muted || !AudioSys.ctx) return;
    const ctx = AudioSys.ctx;
    const quando = [0].concat(t.id === "duplo" ? [0.14] : []);
    for (const atraso of quando) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = t.id === "sino" ? "triangle" : "sine";
      o.frequency.setValueAtTime(t.nota, ctx.currentTime + atraso);
      g.gain.setValueAtTime(0, ctx.currentTime + atraso);
      g.gain.linearRampToValueAtTime(0.12, ctx.currentTime + atraso + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + atraso + 0.28);
      o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime + atraso); o.stop(ctx.currentTime + atraso + 0.3);
    }
  } catch (e) {}
}

/* os emblemas: as conquistas que a pessoa já pegou, as mais raras
   primeiro. Nada de inventar medalha nova -- ela já suou por estas. */
function perfilEmblemas(p) {
  p = p || save;
  const pegas = (p && p.conquistas) || {};
  return CONQUISTAS.filter(c => pegas[c.id])
    .sort((a, b) => (b.premio || 0) - (a.premio || 0));
}
/* o que a pessoa andou fazendo, do que o jogo já guarda */
function perfilAtividade(p) {
  p = p || save;
  const linhas = [];
  if (p.best) linhas.push({ ic: "🚀", txt: "Chegou à fase " + p.best });
  if (p.chefes) linhas.push({ ic: "👾", txt: p.chefes + " chefes derrotados" });
  if (p.vitorias) linhas.push({ ic: "🏆", txt: p.vitorias + " vitórias em duelo" });
  if (p.abates) linhas.push({ ic: "⚔", txt: fmt(p.abates) + " inimigos abatidos" });
  if (p.prestigio) linhas.push({ ic: "♾", txt: "Renasceu " + p.prestigio + "×" });
  return linhas.slice(0, 5);
}

/* =====================================================================
   7. AS OFERTAS
   ---------------------------------------------------------------------
   O cartãozinho que aparece embaixo do NeoNebula, na barra da Estação.

   Elas saem do que o jogo JÁ SABE sobre a pessoa, e não de uma lista
   fixa: oferecer "assine o Bronze" para quem tem Ouro, ou "pegue o
   presente do dia" para quem já pegou, é o tipo de aviso que a pessoa
   aprende a ignorar — e aí ela ignora também o que importa.

   Nenhuma oferta aparece sem ter o que fazer quando alguém toca nela.
   ===================================================================== */
function estOfertas() {
  const fora = [];
  const nv = neoNivel();
  try {
    /* o presente do dia, se ainda não foi pego hoje */
    if (typeof diariaPronta === "function" && diariaPronta()) {
      fora.push({ id: "diaria", ic: "🎁", nome: "Presente do dia",
                  sobre: "Está esperando você no menu", selo: "grátis" });
    }
  } catch (e) {}
  try {
    /* subir de nível: só para quem já assina, e só mostrando o de cima */
    if (nv === "bronze" || nv === "prata") {
      const proximo = nv === "bronze" ? neoInfo("prata") : neoInfo("ouro");
      if (proximo) {
        fora.push({ id: "subir", ic: proximo.selo, nome: "Subir para " + proximo.nome.replace("NEONEBULA ", ""),
                    sobre: "Mais cores, mais fontes e mais impulsos",
                    selo: "R$" + String(proximo.preco).replace(".", ",") });
      }
    }
  } catch (e) {}
  try {
    /* quem está quase renovando precisa saber ANTES de perder */
    const dias = neoDiasQueFaltam();
    if (nv !== "nenhum" && nv !== "ilimitado" && dias <= 5) {
      fora.push({ id: "renovar", ic: "⏳", nome: "Sua assinatura está acabando",
                  sobre: dias <= 0 ? "Acaba hoje" : "Faltam " + dias + (dias === 1 ? " dia" : " dias"),
                  selo: "renovar" });
    }
  } catch (e) {}
  try {
    /* o perfil vazio é a "oferta" mais útil de todas: é de graça e é o
       que faz a pessoa aparecer para os outros */
    const p = perfilMeu();
    if (!p.bio && !p.foto) {
      fora.push({ id: "perfil", ic: "🖼", nome: "Monte o seu perfil",
                  sobre: "Foto, cores e o que você gosta de jogar", selo: "grátis" });
    }
  } catch (e) {}
  return fora.slice(0, 3);
}

function estAbrirOferta(id) {
  if (id === "diaria") { estacaoFechar(); goMenu(); estAvisar(""); return; }
  if (id === "perfil") { estEditarPerfil(); return; }
  estAbrirNeo();
}

/* =====================================================================
   8. O CASTIGO FAZENDO EFEITO
   ---------------------------------------------------------------------
   Regra que só existe na tela de quem aplicou não é regra. Estas duas
   funções são perguntadas no caminho de falar e no de entrar na voz.
   ===================================================================== */
function castigoBarraFalar() {
  const c = castigadoDe("falar");
  if (!c) return null;
  return "Você está de castigo e não pode falar por mais " +
         castigoQuantoFalta(c) + (c.motivo ? " · " + c.motivo : "") + ".";
}
function castigoBarraVoz() {
  const c = castigadoDe("voz");
  if (!c) return null;
  return "Você está de castigo e não entra na voz por mais " +
         castigoQuantoFalta(c) + ".";
}

/* =====================================================================
   9. O QUE ACONTECE AO ABRIR O JOGO
   ---------------------------------------------------------------------
   A minha foto e o meu castigo são meus: não dá para esperar alguém
   abrir um perfil para descobrir os dois.
   ===================================================================== */
setTimeout(() => {
  try {
    temaAplicar();
    const eu = estEu();
    if (eu && nuvemAtiva()) { fotoDe(eu.id); castigoOlhar(eu.id); }
  } catch (e) {}
}, 3500);
