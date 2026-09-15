/* =====================================================================
   OS DEZ TEMAS — paletas inteiras, não uma cor trocada
   =====================================================================
   Antes existiam seis "temas" que só mexiam no --cyan, a cor de
   destaque. Eu contei isso como os dez temas da lista e estava errado:
   "Cyberpunk" e "Synthwave" não são um acento diferente, são o fundo, a
   tinta, as superfícies e as sombras inteiras.

   Agora cada tema troca DEZESSEIS variáveis. É por isso que dá para
   fazer um tema claro sem reescrever a folha de estilo: a folha inteira
   já lê tudo por variável — foi só o resto do jogo que nunca usou isso.

   AS REGRAS QUE TODO TEMA OBEDECE
   ---------------------------------------------------------------------
   1. A TINTA TEM QUE LER NO FUNDO. Um tema é bonito na tela de escolha
      e ilegível na conversa quando alguém escolhe uma tinta cinza em
      cima de um fundo cinza. Cada paleta aqui foi conferida para ter
      contraste de sobra entre --ink e --bg.
   2. AS QUATRO TINTAS DESCEM JUNTAS. --ink é o texto, --ink2 o
      secundário, --dim o apagado e --fraco o quase invisível. Se um
      tema clarear só a primeira, os outros três somem no fundo claro.
   3. AS SOMBRAS MUDAM COM O FUNDO. Sombra preta em tema claro vira
      sujeira; em tema escuro, é o que dá profundidade.

   O TEMA CLARO é o mais difícil e por isso é o mais conferido: no
   escuro, o "quase invisível" é branco com 30% e funciona; no claro,
   branco com 30% em cima de branco é NADA. Ele inverte as quatro
   tintas, e não só as duas primeiras.
   ===================================================================== */

const NEO_TEMAS_10 = [
  {
    id: "nebula", nome: "Dark Nebula", nivel: "nenhum", claro: false,
    sobre: "o de sempre: vidro escuro sobre aurora",
    /* ESTE TEM QUE SER, LETRA POR LETRA, A PELE QUE JÁ ESTÁ NO JOGO.
       Eu tinha copiado o :root de cima da folha e errei: o que vale é o
       segundo, lá no fim, que reescreve tudo. Um "tema de sempre" que
       muda a cara do jogo ao ser escolhido é o pior dos dez. */
    v: {
      "rgb-fundo": "6,10,24", "rgb-carta": "20,34,68",
      bg: "#03060F", bg2: "#060A18",
      sup1: "rgba(255,255,255,.045)", sup2: "rgba(255,255,255,.07)", sup3: "rgba(255,255,255,.1)",
      vidro: "rgba(8,13,30,.66)",
      ink: "#F2F6FF", ink2: "rgba(242,246,255,.76)",
      dim: "rgba(242,246,255,.54)", fraco: "rgba(242,246,255,.32)",
      cyan: "#5EE6FF", magenta: "#FF5C9D", amber: "#FFC861",
      violet: "#B57BFF", verde: "#63F5B5",
      line: "rgba(255,255,255,.1)", line2: "rgba(255,255,255,.2)"
    }
  },
  {
    id: "claro", nome: "Light Clean", nivel: "prata", claro: true,
    sobre: "claro de verdade, para jogar de dia",
    v: {
      "rgb-fundo": "255,255,255", "rgb-carta": "255,255,255",
      bg: "#EEF1F7", bg2: "#F7F9FC",
      /* NO ESCURO O CARTÃO É UM FILME BRANCO; NO CLARO ELE TEM QUE SER
         BRANCO DE VERDADE, senão fica igual à página. E o "item
         destacado" (sup3), que no escuro é o mais claro dos três, aqui
         inverte: no claro o que salta é o mais ESCURO. */
      sup1: "rgba(255,255,255,.78)", sup2: "rgba(255,255,255,.95)", sup3: "rgba(19,26,38,.07)",
      vidro: "rgba(255,255,255,.8)",
      ink: "#131A26", ink2: "rgba(19,26,38,.78)",
      dim: "rgba(19,26,38,.6)", fraco: "rgba(19,26,38,.4)",
      /* os acentos também descem: um ciano de neon em cima de branco é
         um borrão -- ele precisa ESCURECER para continuar sendo cor */
      cyan: "#0B6E93", magenta: "#B81E5A", amber: "#8A5C00",
      violet: "#63219A", verde: "#0E6B47",
      line: "rgba(19,26,38,.12)", line2: "rgba(19,26,38,.24)"
    }
  },
  {
    id: "cyber", nome: "Cyberpunk", nivel: "bronze", claro: false,
    sobre: "preto, amarelo e ciano",
    v: {
      "rgb-fundo": "7,9,12", "rgb-carta": "24,30,38",
      bg: "#07090C", bg2: "#0C1014",
      sup1: "rgba(255,255,255,.05)", sup2: "rgba(255,255,255,.085)", sup3: "rgba(255,255,255,.13)",
      vidro: "rgba(7,9,12,.72)",
      ink: "#F2F6F8", ink2: "rgba(242,246,248,.76)",
      dim: "rgba(242,246,248,.54)", fraco: "rgba(242,246,248,.32)",
      cyan: "#00F0FF", magenta: "#FF2E63", amber: "#F9E900",
      violet: "#B061FF", verde: "#00E5A0",
      line: "rgba(249,233,0,.18)", line2: "rgba(0,240,255,.34)"
    }
  },
  {
    id: "synth", nome: "Retrô Synthwave", nivel: "bronze", claro: false,
    sobre: "rosa neon em roxo escuro",
    v: {
      "rgb-fundo": "22,10,40", "rgb-carta": "48,22,82",
      bg: "#150A26", bg2: "#1D0E35",
      /* o filme das superfícies é ROSADO, e não branco: é o que faz o
         roxo parecer synthwave em vez de roxo com cartão cinza */
      sup1: "rgba(255,190,240,.07)", sup2: "rgba(255,190,240,.11)", sup3: "rgba(255,190,240,.16)",
      vidro: "rgba(26,12,46,.7)",
      ink: "#FFEAF7", ink2: "rgba(255,234,247,.78)",
      dim: "rgba(255,234,247,.56)", fraco: "rgba(255,234,247,.34)",
      cyan: "#2DE2E6", magenta: "#FF3CAC", amber: "#FFB84D",
      violet: "#C77DFF", verde: "#57F5C8",
      line: "rgba(255,60,172,.2)", line2: "rgba(255,60,172,.38)"
    }
  },
  {
    id: "mono", nome: "Monocromático", nivel: "bronze", claro: false,
    sobre: "cinza e branco, sem cor nenhuma",
    v: {
      "rgb-fundo": "13,15,18", "rgb-carta": "34,38,45",
      bg: "#0D0F12", bg2: "#14171B",
      sup1: "rgba(255,255,255,.05)", sup2: "rgba(255,255,255,.08)", sup3: "rgba(255,255,255,.12)",
      vidro: "rgba(13,15,18,.72)",
      ink: "#F2F4F6", ink2: "rgba(242,244,246,.76)",
      dim: "rgba(242,244,246,.54)", fraco: "rgba(242,244,246,.32)",
      /* num tema sem cor os acentos viram tons de cinza -- e não o MESMO
         cinza, senão some a diferença entre "atenção" e "perigo" */
      cyan: "#E4E8EE", magenta: "#9AA1AB", amber: "#C6CCD4",
      violet: "#868D9A", verde: "#AEB6C0",
      line: "rgba(255,255,255,.1)", line2: "rgba(255,255,255,.2)"
    }
  },
  {
    id: "oled", nome: "OLED Black", nivel: "prata", claro: false,
    sobre: "preto absoluto, gasta menos bateria em tela OLED",
    v: {
      /* preto de verdade: em tela OLED o pixel preto DESLIGA, e é daí
         que vem a economia. Um #050813 acende o pixel e não economiza
         nada -- por isso este tema não é "o escuro um pouco mais". */
      "rgb-fundo": "0,0,0", "rgb-carta": "18,18,22",
      bg: "#000000", bg2: "#000000",
      sup1: "rgba(255,255,255,.055)", sup2: "rgba(255,255,255,.09)", sup3: "rgba(255,255,255,.13)",
      vidro: "rgba(0,0,0,.82)",
      ink: "#EDEFF3", ink2: "rgba(237,239,243,.76)",
      dim: "rgba(237,239,243,.54)", fraco: "rgba(237,239,243,.32)",
      cyan: "#5EE6FF", magenta: "#FF5C9D", amber: "#FFC861",
      violet: "#B57BFF", verde: "#63F5B5",
      line: "rgba(255,255,255,.11)", line2: "rgba(255,255,255,.22)"
    }
  },
  {
    id: "pastel", nome: "Pastel Soft", nivel: "prata", claro: true,
    sobre: "cores suaves, tudo fosco",
    v: {
      "rgb-fundo": "255,255,255", "rgb-carta": "255,255,255",
      bg: "#EDE9F2", bg2: "#F5F2F9",
      sup1: "rgba(255,255,255,.8)", sup2: "rgba(255,255,255,.96)", sup3: "rgba(42,35,56,.07)",
      vidro: "rgba(252,250,255,.82)",
      ink: "#241D31", ink2: "rgba(36,29,49,.78)",
      dim: "rgba(36,29,49,.6)", fraco: "rgba(36,29,49,.4)",
      cyan: "#2F6D82", magenta: "#A34370", amber: "#835F1E",
      violet: "#634A93", verde: "#2F6E53",
      line: "rgba(36,29,49,.12)", line2: "rgba(36,29,49,.22)"
    }
  },
  {
    id: "musgo", nome: "Nature Moss", nivel: "bronze", claro: false,
    sobre: "verde escuro e tons de terra",
    v: {
      "rgb-fundo": "10,20,16", "rgb-carta": "26,46,36",
      bg: "#0A1410", bg2: "#0F1D16",
      sup1: "rgba(190,255,215,.055)", sup2: "rgba(190,255,215,.09)", sup3: "rgba(190,255,215,.13)",
      vidro: "rgba(10,20,16,.72)",
      ink: "#EAF3EC", ink2: "rgba(234,243,236,.77)",
      dim: "rgba(234,243,236,.55)", fraco: "rgba(234,243,236,.33)",
      cyan: "#8FE3B4", magenta: "#E09A6B", amber: "#E7C377",
      violet: "#B4CE8C", verde: "#6BD68E",
      line: "rgba(143,227,180,.14)", line2: "rgba(143,227,180,.28)"
    }
  },
  {
    id: "solar", nome: "Solar Gold", nivel: "ouro", claro: false,
    sobre: "dourado em fundo escuro",
    v: {
      "rgb-fundo": "15,11,5", "rgb-carta": "46,34,16",
      bg: "#0F0B05", bg2: "#17110A",
      sup1: "rgba(255,215,140,.06)", sup2: "rgba(255,215,140,.095)", sup3: "rgba(255,215,140,.14)",
      vidro: "rgba(15,11,5,.72)",
      ink: "#FCF3E2", ink2: "rgba(252,243,226,.78)",
      dim: "rgba(252,243,226,.56)", fraco: "rgba(252,243,226,.34)",
      cyan: "#FFD166", magenta: "#F4785A", amber: "#FFB627",
      violet: "#E8B36A", verde: "#DCCB5E",
      line: "rgba(255,182,39,.17)", line2: "rgba(255,182,39,.34)"
    }
  },
  {
    id: "meu", nome: "Do meu jeito", nivel: "ouro", claro: false,
    sobre: "você escolhe o fundo e o destaque",
    /* este não traz paleta: ele sai das cores que a pessoa já escolheu
       no perfil. Repetir as rodas de cor aqui seria pedir a mesma coisa
       duas vezes em telas diferentes. */
    doUsuario: true
  }
];

/* =====================================================================
   APLICAR
   ---------------------------------------------------------------------
   Escreve as variáveis na raiz do documento. Uma troca, e a folha de
   estilo inteira segue junto — inclusive as telas que ninguém lembrou de
   testar, porque nenhuma delas tem cor escrita na mão.
   ===================================================================== */
function temaAchar(id) {
  return NEO_TEMAS_10.filter(t => t.id === id)[0] || NEO_TEMAS_10[0];
}
function temaDoPerfil(p) {
  p = p || save;
  const perfil = Object.assign({}, PERFIL_PADRAO, (p && p.perfil) || {});
  const t = temaAchar(perfil.tema10);
  return NEO_ORDEM[neoDe(p)] >= NEO_ORDEM[t.nivel] ? t : NEO_TEMAS_10[0];
}

/* o tema "do meu jeito": fundo das duas cores da pessoa, escurecido, e
   o destaque na cor do nome dela */
function temaDoUsuario() {
  const p = perfilMeu();
  const fundo = corDeHSL(p.c2h, Math.max(4, Math.min(12, (Number(p.c2l) || 24) - 14)));
  const fundo2 = corDeHSL(p.c2h, Math.max(6, Math.min(16, (Number(p.c2l) || 24) - 10)));
  const acento = perfilCorDoNome() || "#4DE8FF";
  const base = NEO_TEMAS_10[0].v;
  return Object.assign({}, base, {
    bg: fundo, bg2: fundo2,
    sup1: corDeHSL(p.c1h, 14), sup2: corDeHSL(p.c1h, 18), sup3: corDeHSL(p.c1h, 24),
    cyan: acento
  });
}

function temaAplicar() {
  try {
    const t = temaDoPerfil();
    const v = t.doUsuario ? temaDoUsuario() : t.v;
    const raiz = document.documentElement;
    for (const k in v) raiz.style.setProperty("--" + k, v[k]);

    /* A COR DE DESTAQUE ENTRA DEPOIS DO TEMA, e é por isso que ela vem
       aqui embaixo e não junto: quem escolheu "Carmim" quer o destaque
       rosa em QUALQUER tema, inclusive num que chegou depois. Se fosse
       aplicada antes, o tema a apagaria. */
    let destaque = v.cor || v.cyan;
    try {
      const d = perfilTema();
      if (d && d.cor) destaque = d.cor;
    } catch (e) {}
    raiz.style.setProperty("--cyan", destaque);
    /* o brilho do destaque segue o destaque. Sem isto, o tema trocava a
       cor dos botões e o halo em volta deles continuava ciano -- o
       lugar exato onde um tema "quase certo" se entrega. */
    const [br, bg_, bb] = corParaRGB(destaque);
    raiz.style.setProperty("--brilho-cyan",
      "rgba(" + br + "," + bg_ + "," + bb + ",.5)");

    /* as sombras acompanham: sombra preta em tema claro vira sujeira */
    if (t.claro) {
      raiz.style.setProperty("--som-1", "0 2px 10px rgba(30,40,60,.10)");
      raiz.style.setProperty("--som-2", "0 8px 26px rgba(30,40,60,.14)");
      raiz.style.setProperty("--som-3", "0 18px 48px rgba(30,40,60,.18)");
      /* a luzinha de cima dos cartões é um risco BRANCO. Em cima de
         branco ela não existe -- no claro o que dá relevo é uma linha
         escura de baixo, então ela vira sombra interna. */
      raiz.style.setProperty("--luz", "inset 0 -1px 0 rgba(30,40,60,.10)");
      raiz.style.setProperty("--luz2", "inset 0 -1px 0 rgba(30,40,60,.16)");
      raiz.style.setProperty("--danger", "#C62828");
    } else {
      /* estes três são, ao pé da letra, os da pele que já está no jogo:
         escolher "Dark Nebula" não pode mudar a profundidade de nada */
      raiz.style.setProperty("--som-1", "0 1px 2px rgba(0,0,0,.4)");
      raiz.style.setProperty("--som-2", "0 10px 30px rgba(0,0,0,.45)");
      raiz.style.setProperty("--som-3", "0 24px 60px rgba(0,0,0,.6)");
      raiz.style.setProperty("--luz", "inset 0 1px 0 rgba(255,255,255,.14)");
      raiz.style.setProperty("--luz2", "inset 0 1px 0 rgba(255,255,255,.22)");
      raiz.style.setProperty("--danger", "#FF5C5C");
    }
    /* a marca no <body> é o gancho do CSS para os poucos lugares que
       precisam saber que o fundo virou claro -- a nebulosa que respira
       atrás das telas, por exemplo, é branca demais num fundo branco */
    document.body.classList.toggle("tema-claro", !!t.claro);
    document.body.setAttribute("data-tema", t.id);
    const c = perfilClique();
    document.body.setAttribute("data-clique", c.id);
  } catch (e) {}
}

/* =====================================================================
   A AMOSTRA NA TELA DE ESCOLHA
   ---------------------------------------------------------------------
   A bolinha de cor não serve para tema: o que muda é o FUNDO, e um tema
   claro e um escuro com o mesmo destaque dariam duas bolinhas iguais.
   A amostra é um quadradinho pintado com o fundo do tema e um pontinho
   do destaque em cima -- ou seja, o tema em miniatura.
   ===================================================================== */
function temaAmostraCSS(t) {
  const v = t.doUsuario ? temaDoUsuario() : t.v;
  return "background:linear-gradient(135deg," + v.bg + " 0%," + v.sup2 + " 100%);" +
         "border-color:" + v.line2;
}
function temaAmostraDestaque(t) {
  const v = t.doUsuario ? temaDoUsuario() : t.v;
  return v.cyan;
}

/* CONTRASTE DE VERDADE, e não no olho.
   A conta é a da W3C: luminância relativa de cada cor e a razão entre
   elas. Texto normal precisa de 4,5. É isto que impede um tema bonito
   na tela de escolha e ilegível na conversa. */
function corParaRGB(c) {
  c = String(c || "").trim();
  if (c[0] === "#") {
    const n = c.length === 4
      ? c.slice(1).split("").map(x => parseInt(x + x, 16))
      : [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
    return n;
  }
  const g = /rgba?\(([^)]+)\)/.exec(c);
  if (g) return g[1].split(",").slice(0, 3).map(x => parseFloat(x));
  return [0, 0, 0];
}
function luminancia(c) {
  const [r, g, b] = corParaRGB(c).map(v => {
    v = v / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contraste(a, b) {
  const la = luminancia(a), lb = luminancia(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
