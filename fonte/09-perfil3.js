/* =====================================================================
   O PERFIL, PARTE 3 — fundo, atmosfera e identidade
   =====================================================================
   O pedido foi "personalização total". Isto é o que dá para fazer de
   verdade num jogo que roda num arquivo só, abre sem internet e tem que
   andar em celular fraco — e o que NÃO dá está escrito no fim, com o
   motivo, porque promessa na tela é pior que espaço vazio.

   O QUE ENTRA
     · banner de imagem própria, encolhido no aparelho antes de subir
     · vidro fosco: desfoque e opacidade dos painéis, para o fundo
       aparecer por trás sem comer o texto
     · partículas flutuando por cima do fundo
     · gradiente que muda com a HORA do dia
     · avatar animado (GIF pequeno), molduras de seção, cor dos títulos
     · ícone de estado no lugar da bolinha

   ONDE MORA NA NUVEM
     conversas/__banners/<uid>   a imagem de fundo, buscada só quando
                                 alguém abre aquele perfil

   Mesma regra da foto, e pelo mesmo motivo: a ficha de todo mundo é
   lida inteira de vinte em vinte segundos. Imagem lá dentro faria cada
   celular baixar a galeria da comunidade toda, sem parar.
   ===================================================================== */

/* =====================================================================
   1. O BANNER DE IMAGEM
   ---------------------------------------------------------------------
   640×360 é o tamanho em que ele aparece, e é o tamanho em que ele é
   guardado. Subir a foto original de 4000px para depois encolher na
   tela é pagar cem vezes a mesma banda para ver a mesma coisa.
   ===================================================================== */
const BANNER_L = 640, BANNER_A = 360;
const BANNER_TETO = 90000;        // 90 KB depois de encolher
const BANNERS = {};               // uid -> dataURL, para não buscar duas vezes

function bannerCaminho(uid) { return "conversas/__banners/" + uid; }

/* recorta na proporção do banner e encolhe. Recortar ANTES de encolher
   evita a imagem esticada: sem isso, uma foto em pé vira um borrão. */
function bannerEncolher(arquivo) {
  return new Promise((ok, falhou) => {
    const leitor = new FileReader();
    leitor.onerror = () => falhou(new Error("nao deu para ler"));
    leitor.onload = () => {
      const img = new Image();
      img.onerror = () => falhou(new Error("isso nao e uma imagem"));
      img.onload = () => {
        const alvo = BANNER_L / BANNER_A;
        const dela = img.width / img.height;
        let lc = img.width, ac = img.height;
        if (dela > alvo) lc = img.height * alvo; else ac = img.width / alvo;
        const c = document.createElement("canvas");
        c.width = BANNER_L; c.height = BANNER_A;
        const x = c.getContext("2d");
        x.imageSmoothingQuality = "high";
        x.drawImage(img, (img.width - lc) / 2, (img.height - ac) / 2, lc, ac,
                    0, 0, BANNER_L, BANNER_A);
        let saida = "";
        try { saida = c.toDataURL("image/webp", 0.72); } catch (e) {}
        if (!saida || saida.indexOf("data:image/webp") !== 0) saida = c.toDataURL("image/jpeg", 0.72);
        ok(saida);
      };
      img.src = leitor.result;
    };
    leitor.readAsDataURL(arquivo);
  });
}

async function bannerGuardar(arquivo) {
  const eu = estEu();
  if (!eu) return false;
  if (!arquivo || !/^image\//.test(arquivo.type)) {
    estAvisar("Escolha uma imagem (JPG, PNG, GIF ou WEBP).");
    return false;
  }
  let dado;
  try { dado = await bannerEncolher(arquivo); }
  catch (e) { estAvisar("Não consegui abrir essa imagem."); return false; }
  if (dado.length > BANNER_TETO) { estAvisar("Essa imagem ficou grande demais."); return false; }
  const r = await nuvemSoltar(bannerCaminho(eu.id), dado);
  if (r === null) { estAvisar("Não deu para guardar o banner. Confira a internet."); return false; }
  BANNERS[eu.id] = dado;
  BANNERS_MARCA[eu.id] = marcaNova();
  const p = perfilMeu();
  p.banner = BANNERS_MARCA[eu.id];   /* número que muda, e não um "1" */
  p.fundo = "foto";               /* escolher a imagem já é usar a imagem */
  persist();
  try { nuvemEnviar(true); } catch (e) {}
  estAvisar("Banner trocado.");
  return true;
}

async function bannerApagar() {
  const eu = estEu();
  if (!eu) return false;
  await nuvemSoltar(bannerCaminho(eu.id), null, "DELETE");
  delete BANNERS[eu.id];
  delete BANNERS_MARCA[eu.id];
  const p = perfilMeu();
  p.banner = 0;
  if (p.fundo === "foto") p.fundo = "meu";
  persist();
  try { nuvemEnviar(true); } catch (e) {}
  estAvisar("Banner removido.");
  return true;
}

/* mesma história da foto (ver 09-perfil2.js): o cache guardava "esta
   pessoa não tem banner" para sempre, e a capa nova nunca chegava em
   quem já tinha olhado o perfil uma vez. A marca da ficha é um número
   que muda, e o cache se rende a ela. */
const BANNERS_MARCA = {};
async function bannerDe(uid, forcar) {
  if (!uid) return "";
  if (!forcar && !imagemPrecisaBuscar(BANNERS, BANNERS_MARCA, uid, "banner"))
    return BANNERS[uid] || "";
  const marca = marcaDaFicha(uid, "banner");
  BANNERS_MARCA[uid] = marca;
  if (BANNERS[uid] === undefined) BANNERS[uid] = "";
  if (marca === 0 && !forcar && BANNERS_MARCA[uid] !== undefined && jaPerguntei["b:" + uid]) {
    BANNERS[uid] = ""; return "";
  }
  jaPerguntei["b:" + uid] = 1;
  const d = await nuvemReq(bannerCaminho(uid));
  /* só entra o que É uma imagem encolhida por nós. Isto foi escrito por
     outra pessoa, e "url(qualquer coisa)" vira um buraco na minha tela */
  BANNERS[uid] = (typeof d === "string" && /^data:image\/(webp|jpeg|png|gif);base64,/.test(d) &&
                  d.length < BANNER_TETO * 2) ? d : "";
  return BANNERS[uid];
}

/* =====================================================================
   2. O GRADIENTE QUE SEGUE A HORA
   ---------------------------------------------------------------------
   Amanhecer, dia, entardecer e noite. É o mesmo par de cores que a
   pessoa escolheu, girado e clareado conforme a hora — e não quatro
   paletas fixas: assim a escolha dela continua sendo dela, e o fundo só
   respira junto com o relógio.
   ===================================================================== */
const HORAS_DO_DIA = [
  { id: "madrugada", nome: "Madrugada", de: 0,  ate: 5,  giro: -20, luz: -12 },
  { id: "manha",     nome: "Manhã",     de: 6,  ate: 11, giro: 15,  luz: 10 },
  { id: "tarde",     nome: "Tarde",     de: 12, ate: 17, giro: 0,   luz: 6 },
  { id: "noite",     nome: "Noite",     de: 18, ate: 23, giro: -10, luz: -6 }
];
function horaDeAgora() {
  const h = new Date().getHours();
  return HORAS_DO_DIA.filter(x => h >= x.de && h <= x.ate)[0] || HORAS_DO_DIA[3];
}

/* =====================================================================
   3. AS PARTÍCULAS
   ---------------------------------------------------------------------
   Feitas em CSS, e não em canvas. Um canvas por perfil aberto seria mais
   um laço de desenho rodando junto com o jogo, e o alvo aqui é celular
   fraco. Doze pontinhos com animação de CSS custam quase nada e a placa
   de vídeo faz sozinha.
   ===================================================================== */
const NEO_PARTICULAS = [
  { id: "nenhuma", nome: "Nenhuma",       nivel: "nenhum" },
  { id: "poeira",  nome: "Poeira cósmica",nivel: "nenhum" },
  { id: "neve",    nome: "Neve",          nivel: "bronze" },
  { id: "chuva",   nome: "Chuva neon",    nivel: "bronze" },
  { id: "brasa",   nome: "Brasas",        nivel: "prata" },
  { id: "estrela", nome: "Estrelas",      nivel: "ouro" }
];
/* quantas partículas desenhar: mais que isso vira sujeira, e menos não
   se vê. Doze foi o número que pareceu chuva sem parecer estática. */
const PARTICULAS_N = 12;
function particulasHTML(id) {
  if (!id || id === "nenhuma") return "";
  let h = '<div class="pf-part pf-part-' + id + '" aria-hidden="true">';
  for (let i = 0; i < PARTICULAS_N; i++) {
    /* posição e ritmo fixos por índice, e não sorteados: sorteado muda a
       cada repintura e a chuva "pula" toda vez que a tela se redesenha */
    const x = (i * 37) % 100;
    const atraso = (i * 0.63) % 4;
    const dur = 3.2 + ((i * 7) % 26) / 10;
    h += '<i style="left:' + x + "%;animation-delay:" + atraso.toFixed(2) +
         "s;animation-duration:" + dur.toFixed(2) + 's"></i>';
  }
  return h + "</div>";
}

/* =====================================================================
   4. VIDRO FOSCO
   ---------------------------------------------------------------------
   Desfoque e opacidade dos painéis, para o fundo escolhido aparecer por
   trás. Os dois vão juntos de propósito: painel transparente SEM
   desfoque deixa o texto por cima da imagem e ninguém lê nada. O
   desfoque é o que faz a transparência ser possível.
   ===================================================================== */
const VIDRO_PADRAO = { desfoque: 10, opacidade: 82 };
function vidroDe(p) {
  p = p || save;
  const perfil = Object.assign({}, PERFIL_PADRAO, (p && p.perfil) || {});
  return {
    desfoque: Math.max(0, Math.min(24, parseInt(perfil.desfoque, 10) || VIDRO_PADRAO.desfoque)),
    opacidade: Math.max(35, Math.min(100, parseInt(perfil.opacidade, 10) || VIDRO_PADRAO.opacidade))
  };
}

/* =====================================================================
   5. MOLDURAS DE SEÇÃO, CORES DOS TÍTULOS E ÍCONE DE ESTADO
   ===================================================================== */
const NEO_BORDAS = [
  { id: "nenhuma", nome: "Sem borda",  nivel: "nenhum" },
  { id: "linha",   nome: "Linha fina", nivel: "nenhum" },
  { id: "neon",    nome: "Neon",       nivel: "bronze" },
  { id: "pixel",   nome: "Pixel",      nivel: "bronze" },
  { id: "brilho",  nome: "Brilho",     nivel: "prata" },
  { id: "fita",    nome: "Fita lateral", nivel: "ouro" }
];
/* os ícones de estado, no lugar da bolinha colorida */
const NEO_ESTADOS = [
  { id: "bolinha", nome: "Bolinha",    nivel: "nenhum", ic: "" },
  { id: "jogo",    nome: "Jogando",    nivel: "nenhum", ic: "🎮" },
  { id: "musica",  nome: "Ouvindo",    nivel: "bronze", ic: "🎧" },
  { id: "estudo",  nome: "Estudando",  nivel: "bronze", ic: "📚" },
  { id: "sono",    nome: "Dormindo",   nivel: "prata",  ic: "😴" },
  { id: "foguete", nome: "Em missão",  nivel: "prata",  ic: "🚀" },
  { id: "coroa",   nome: "Coroa",      nivel: "ouro",   ic: "👑" }
];

function perfilParticula(p) { return perfilEscolha(NEO_PARTICULAS, "particula", p); }
function perfilBorda(p)     { return perfilEscolha(NEO_BORDAS, "borda", p); }
function perfilEstadoIc(p)  { return perfilEscolha(NEO_ESTADOS, "estadoIc", p); }

/* a cor dos títulos das seções. Vem da mesma lista de cores do nome --
   uma lista só, para não existirem duas tabelas de cor que um dia
   discordam sobre o que é "violeta". */
function perfilCorTitulo(p) {
  p = p || save;
  const perfil = Object.assign({}, PERFIL_PADRAO, (p && p.perfil) || {});
  const c = neoAchar(NEO_CORES, perfil.corTitulo);
  if (!c) return "";
  return NEO_ORDEM[neoDe(p)] >= NEO_ORDEM[c.nivel] ? c.cor : "";
}

/* =====================================================================
   6. O FUNDO, AGORA COM TRÊS CAMINHOS
   ---------------------------------------------------------------------
   "foto" (a imagem que a pessoa subiu), "meu" (as duas cores dela) ou um
   da lista pronta. Uma função só decide, e ela devolve o pedaço de
   estilo — nunca HTML, nunca texto que veio de outra pessoa.
   ===================================================================== */
function perfilFundoDe(perfil, nivel, uid) {
  perfil = perfil || {};
  if (perfil.fundo === "foto" && BANNERS[uid]) {
    return "url(" + BANNERS[uid] + ") center/cover";
  }
  if (perfil.fundo === "meu") {
    let h1 = perfil.c1h, l1 = perfil.c1l, h2 = perfil.c2h, l2 = perfil.c2l;
    if (perfil.horaDoDia) {
      const q = horaDeAgora();
      h1 = (Number(h1 || 0) + q.giro + 360) % 360;
      h2 = (Number(h2 || 0) + q.giro + 360) % 360;
      l1 = Number(l1 || 30) + q.luz;
      l2 = Number(l2 || 25) + q.luz;
    }
    return "linear-gradient(150deg," + corDeHSL(h1, l1) + "," + corDeHSL(h2, l2) + ")";
  }
  const f = neoAchar(NEO_FUNDOS, perfil.fundo) || NEO_FUNDOS[0];
  return (NEO_ORDEM[nivel] >= NEO_ORDEM[f.nivel] ? f : NEO_FUNDOS[0]).css;
}

/* =====================================================================
   O QUE NÃO ESTÁ AQUI, E POR QUÊ
   ---------------------------------------------------------------------
   · VÍDEO DE FUNDO e GIF de fundo em HD: um vídeo de 3 segundos em
     qualidade decente passa de 1 MB. O jogo inteiro tem 4 MB e precisa
     caber na memória de um celular fraco junto com a partida rodando.
     Um vídeo por perfil aberto derruba o aparelho que é o alvo do jogo.
   · MURAL DE MÍDIA e galeria de fotos: precisa de um lugar para guardar
     arquivo grande. Este jogo tem um banco de TEXTO e mais nada; guardar
     imagem ali é caro, lento, e estoura o limite bem rápido.
   · REPRODUTOR DE SPOTIFY: precisa de uma conta de desenvolvedor, de uma
     chave secreta e de um servidor para segurar essa chave. Nada disso
     cabe num arquivo só que funciona sem internet -- e pôr a chave
     dentro do jogo seria entregá-la a quem abrisse o código.
   · ÁUDIO PRÓPRIO de apresentação: mesmo problema do vídeo. Um áudio de
     10 segundos é maior que a foto, o banner e o perfil inteiro juntos.

   O que dava para aproveitar dessas ideias FOI aproveitado: som ao abrir
   o perfil (feito na hora, sem arquivo), efeito ao passar o mouse, e o
   banner de imagem encolhido.
   ===================================================================== */

/* o perfil de OUTRA pessoa, já com o que entrou na v9.1 junto. É uma
   casca fina em volta de perfilDaNuvem: a limpeza continua sendo dela,
   e aqui só se acrescenta o que ela ainda não sabia devolver. */
function perfilComExtras(ficha, uid) {
  const v = perfilDaNuvem(ficha);
  const perfil = (ficha && ficha.perfil) || {};
  const daLista = (lista, id) => {
    const it = neoAchar(lista, id) || lista[0];
    return NEO_ORDEM[v.nivel] >= NEO_ORDEM[it.nivel] ? it : lista[0];
  };
  v.fundoCSS = perfilFundoDe(perfil, v.nivel, uid);
  v.particula = daLista(NEO_PARTICULAS, perfil.particula).id;
  v.borda = daLista(NEO_BORDAS, perfil.borda).id;
  v.estadoIc = daLista(NEO_ESTADOS, perfil.estadoIc);
  const ct = neoAchar(NEO_CORES, perfil.corTitulo);
  v.corTitulo = (ct && NEO_ORDEM[v.nivel] >= NEO_ORDEM[ct.nivel]) ? ct.cor : "";
  /* o vidro é da pessoa, mas preso na faixa: um desfoque de 900px
     vindo da nuvem travaria a tela de quem abrisse o perfil */
  v.vidro = {
    desfoque: Math.max(0, Math.min(24, parseInt(perfil.desfoque, 10) || VIDRO_PADRAO.desfoque)),
    opacidade: Math.max(35, Math.min(100, parseInt(perfil.opacidade, 10) || VIDRO_PADRAO.opacidade))
  };
  return perfilExtrasGradiente(v, perfil);
}

/* =====================================================================
   7. O DEGRADÊ DO CONTAINER INTERNO
   ---------------------------------------------------------------------
   Foi pedido que o degradê de duas cores saísse do banner e fosse para
   o miolo do cartão — a área que envolve bio, pronomes, interesses,
   emblemas e conexões. É a decisão certa: o banner é a "capa" e pode ser
   uma imagem; o miolo é onde o texto mora, e é ali que a cor da pessoa
   aparece por trás do vidro fosco.

   Com isso, as duas coisas passam a ser independentes:
     · banner  -> imagem própria ou um fundo pronto da lista
     · miolo   -> as DUAS CORES dela, com ângulo, formato e movimento

   O ângulo, o formato e a animação são números e ids de lista, nunca
   texto: isto é lido do perfil de outra pessoa, e texto que vira estilo
   é buraco.
   ===================================================================== */
const NEO_FORMATOS = [
  { id: "linear", nome: "Reto",    nivel: "nenhum" },
  { id: "radial", nome: "Círculo", nivel: "nenhum" },
  { id: "conico", nome: "Leque",   nivel: "prata" }
];
const NEO_TEXTURAS = [
  { id: "nenhuma", nome: "Lisa",        nivel: "nenhum" },
  { id: "pontos",  nome: "Grade de pontos", nivel: "nenhum" },
  { id: "linhas",  nome: "Linhas",      nivel: "bronze" },
  { id: "ruido",   nome: "Ruído",       nivel: "prata" }
];
/* combinações prontas, para quem não quer girar duas rodas */
const NEO_PRONTOS = [
  { id: "nebulosa", nome: "Nebulosa", c1h: 275, c1l: 30, c2h: 205, c2l: 24 },
  { id: "brasa",    nome: "Brasa",    c1h: 18,  c1l: 34, c2h: 340, c2l: 22 },
  { id: "floresta", nome: "Floresta", c1h: 150, c1l: 26, c2h: 190, c2l: 20 },
  { id: "aurora",   nome: "Aurora",   c1h: 165, c1l: 32, c2h: 265, c2l: 26 },
  { id: "areia",    nome: "Areia",    c1h: 38,  c1l: 36, c2h: 12,  c2l: 24 },
  { id: "gelo",     nome: "Gelo",     c1h: 196, c1l: 38, c2h: 220, c2l: 22 },
  { id: "vinho",    nome: "Vinho",    c1h: 340, c1l: 28, c2h: 285, c2l: 18 },
  { id: "carvao",   nome: "Carvão",   c1h: 220, c1l: 16, c2h: 220, c2l: 10 }
];

function perfilFormato(p) { return perfilEscolha(NEO_FORMATOS, "formato", p); }
function perfilTextura(p) { return perfilEscolha(NEO_TEXTURAS, "textura", p); }

/* o degradê do miolo, a partir de um perfil qualquer (meu ou da nuvem) */
function gradienteDe(perfil, nivel) {
  perfil = perfil || {};
  let h1 = perfil.c1h, l1 = perfil.c1l, h2 = perfil.c2h, l2 = perfil.c2l;
  if (perfil.horaDoDia) {
    const q = horaDeAgora();
    h1 = (Number(h1 || 0) + q.giro + 360) % 360;
    h2 = (Number(h2 || 0) + q.giro + 360) % 360;
    l1 = Number(l1 || 30) + q.luz;
    l2 = Number(l2 || 25) + q.luz;
  }
  const a = corDeHSL(h1, l1), b = corDeHSL(h2, l2);
  const ang = Math.max(0, Math.min(359, Math.round(Number(perfil.angulo)) || 150));
  const f = neoAchar(NEO_FORMATOS, perfil.formato) || NEO_FORMATOS[0];
  const vale = NEO_ORDEM[nivel || "nenhum"] >= NEO_ORDEM[f.nivel] ? f : NEO_FORMATOS[0];
  if (vale.id === "radial") return "radial-gradient(circle at 50% 35%," + a + "," + b + ")";
  if (vale.id === "conico") return "conic-gradient(from " + ang + "deg," + a + "," + b + "," + a + ")";
  return "linear-gradient(" + ang + "deg," + a + "," + b + ")";
}
/* a cor de baixo sozinha: é dela que sai a borda que brilha */
function gradienteCorSecundaria(perfil) {
  perfil = perfil || {};
  return corDeHSL(perfil.c2h, perfil.c2l);
}

/* o que o cartão de outra pessoa precisa saber do degradê do miolo */
function perfilExtrasGradiente(v, perfil) {
  const daLista = (lista, id) => {
    const it = neoAchar(lista, id) || lista[0];
    return NEO_ORDEM[v.nivel] >= NEO_ORDEM[it.nivel] ? it : lista[0];
  };
  v.gradiente = gradienteDe(perfil, v.nivel);
  v.corBorda = gradienteCorSecundaria(perfil);
  v.textura = daLista(NEO_TEXTURAS, perfil.textura).id;
  v.fluir = perfil.fluir ? 1 : 0;
  return v;
}
