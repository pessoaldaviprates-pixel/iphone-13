/* =====================================================================
   OFICINA DE CONSTRUÇÃO — monte a sua própria aeronave
   ---------------------------------------------------------------------
   Primeiro escolhe-se o FORMATO do casco (são 100, gerados por família:
   caça, interceptador, asa voadora, bombardeiro e exóticos). Depois
   entram as peças, 30 opções em cada um dos 12 encaixes: nariz, cauda,
   asa direita, asa esquerda, teto, casco de baixo, motor, armas, bombas,
   armamento pesado, defletor e sensor.
   Cada peça muda o desenho E os atributos da nave.
   ===================================================================== */
const NAVES_BASE = SHIPS.length;   // daqui para a frente é tudo criado pelo jogador

/* ---------- 100 formatos de casco ---------- */
const FORMA_FAMILIAS = [
  { nome: "Caça",          base: "cacas" },
  { nome: "Interceptador", base: "inter" },
  { nome: "Asa Voadora",   base: "asa" },
  { nome: "Bombardeiro",   base: "bomba" },
  { nome: "Exótico",       base: "exo" }
];
const FORMA_NOMES = [
  "Lâmina","Adaga","Falcão","Vespa","Flecha","Presa","Garra","Raio","Lança","Punhal",
  "Corvo","Águia","Víbora","Escorpião","Cometa","Meteoro","Trovão","Tempestade","Miragem","Fantasma",
  "Sombra","Espectro","Titã","Colosso","Bastião","Muralha","Aríete","Martelo","Bigorna","Fornalha",
  "Cristal","Prisma","Estrela","Nova","Quasar","Pulsar","Órbita","Eclipse","Aurora","Zênite",
  "Serpente","Dragão","Grifo","Fênix","Quimera","Hidra","Basilisco","Manticora","Wyvern","Leviatã",
  "Ártico","Deserto","Tundra","Vulcão","Abismo","Recife","Cânion","Duna","Geleira","Savana",
  "Cobalto","Titânio","Grafite","Obsidiana","Ônix","Âmbar","Safira","Rubi","Esmeralda","Opala",
  "Alfa","Beta","Gama","Delta","Ômega","Sigma","Zeta","Kappa","Lambda","Teta",
  "Rondador","Vigia","Sentinela","Guardião","Caçador","Batedor","Errante","Nômade","Peregrino","Andarilho",
  "Ferrão","Espinho","Farpa","Estilhaço","Fragmento","Lasca","Agulha","Alfinete","Gancho","Anzol"
];
/* gera os pontos do casco: cada família tem 5 desenhos bem diferentes e
   cada desenho tem 4 proporções — 20 cascos distintos por família         */
function gerarForma(i) {
  const fam = Math.floor(i / 20);
  const tipo = Math.floor((i % 20) / 4);        // 0..4  — o desenho
  const v = i % 4;                              // 0..3  — a proporção
  const L = 1 + v * 0.16;                       // comprimento
  const G = 1 + (3 - v) * 0.13;                 // gordura
  const p = [];
  const P = (x, y) => p.push([x * G, y * L]);

  if (fam === 0) {                              /* ---- CAÇAS ---- */
    if (tipo === 0) {                           // delta puro
      P(0,-19); P(13,9); P(5,6); P(0,11); P(-5,6); P(-13,9);
    } else if (tipo === 1) {                     // asa em flecha com cauda dupla
      P(0,-18); P(4,-6); P(14,4); P(7,5); P(9,12); P(3,10);
      P(0,13); P(-3,10); P(-9,12); P(-7,5); P(-14,4); P(-4,-6);
    } else if (tipo === 2) {                     // canards na frente
      P(0,-20); P(3,-14); P(9,-11); P(4,-8); P(12,7); P(4,7);
      P(0,12); P(-4,7); P(-12,7); P(-4,-8); P(-9,-11); P(-3,-14);
    } else if (tipo === 3) {                     // asa dupla empilhada
      P(0,-17); P(6,-9); P(15,-1); P(8,1); P(13,9); P(4,8);
      P(0,12); P(-4,8); P(-13,9); P(-8,1); P(-15,-1); P(-6,-9);
    } else {                                     // corpo largo com bico curto
      P(0,-14); P(9,-9); P(12,2); P(8,10); P(3,7); P(0,12);
      P(-3,7); P(-8,10); P(-12,2); P(-9,-9);
    }
  } else if (fam === 1) {                       /* ---- INTERCEPTADORES ---- */
    if (tipo === 0) {                            // agulha
      P(0,-24); P(3,-8); P(6,8); P(2,7); P(0,13); P(-2,7); P(-6,8); P(-3,-8);
    } else if (tipo === 1) {                     // dardo com barbatanas baixas
      P(0,-22); P(3,-10); P(4,4); P(11,11); P(4,9); P(0,14);
      P(-4,9); P(-11,11); P(-4,4); P(-3,-10);
    } else if (tipo === 2) {                     // asa em X
      P(0,-21); P(9,-9); P(4,-2); P(11,10); P(3,6); P(0,12);
      P(-3,6); P(-11,10); P(-4,-2); P(-9,-9);
    } else if (tipo === 3) {                     // fuselagem em gota
      P(0,-23); P(5,-13); P(6,2); P(9,10); P(3,8); P(0,12);
      P(-3,8); P(-9,10); P(-6,2); P(-5,-13);
    } else {                                     // trirreator
      P(0,-22); P(4,-9); P(8,3); P(6,11); P(2,8); P(0,13);
      P(-2,8); P(-6,11); P(-8,3); P(-4,-9);
    }
  } else if (fam === 2) {                       /* ---- ASAS VOADORAS ---- */
    if (tipo === 0) {                            // W clássico (tipo B-2)
      P(0,-13); P(6,-7); P(20,4); P(11,4); P(8,10); P(4,4);
      P(0,9); P(-4,4); P(-8,10); P(-11,4); P(-20,4); P(-6,-7);
    } else if (tipo === 1) {                     // bumerangue
      P(0,-11); P(9,-6); P(21,7); P(12,5); P(0,2);
      P(-12,5); P(-21,7); P(-9,-6);
    } else if (tipo === 2) {                     // losango largo
      P(0,-15); P(17,1); P(9,4); P(0,11); P(-9,4); P(-17,1);
    } else if (tipo === 3) {                     // asa com ponta caída
      P(0,-12); P(7,-6); P(19,0); P(22,7); P(12,5); P(5,10);
      P(0,7); P(-5,10); P(-12,5); P(-22,7); P(-19,0); P(-7,-6);
    } else {                                     // meia-lua
      P(0,-14); P(11,-4); P(18,8); P(8,3); P(0,6); P(-8,3); P(-18,8); P(-11,-4);
    }
  } else if (fam === 3) {                       /* ---- BOMBARDEIROS ---- */
    if (tipo === 0) {                            // casco de tijolo
      P(0,-15); P(8,-11); P(11,-2); P(16,8); P(7,7); P(3,12);
      P(-3,12); P(-7,7); P(-16,8); P(-11,-2); P(-8,-11);
    } else if (tipo === 1) {                     // barriga larga
      P(0,-13); P(10,-6); P(13,4); P(9,12); P(0,15);
      P(-9,12); P(-13,4); P(-10,-6);
    } else if (tipo === 2) {                     // quatro motores
      P(0,-16); P(6,-10); P(18,-2); P(14,4); P(18,10); P(6,8);
      P(0,13); P(-6,8); P(-18,10); P(-14,4); P(-18,-2); P(-6,-10);
    } else if (tipo === 3) {                     // fortaleza
      P(0,-14); P(7,-12); P(12,-5); P(12,6); P(6,13); P(0,10);
      P(-6,13); P(-12,6); P(-12,-5); P(-7,-12);
    } else {                                     // cargueiro achatado
      P(0,-12); P(9,-9); P(15,0); P(15,7); P(5,11); P(0,8);
      P(-5,11); P(-15,7); P(-15,0); P(-9,-9);
    }
  } else {                                      /* ---- EXÓTICOS ---- */
    if (tipo === 0) {                            // garra
      P(0,-20); P(7,-6); P(16,-12); P(13,6); P(5,4); P(0,14);
      P(-5,4); P(-13,6); P(-16,-12); P(-7,-6);
    } else if (tipo === 1) {                     // cristal facetado
      P(0,-21); P(8,-10); P(6,2); P(10,11); P(0,16);
      P(-10,11); P(-6,2); P(-8,-10);
    } else if (tipo === 2) {                     // estrela de seis pontas
      P(0,-21); P(5,-8); P(17,-6); P(8,2); P(13,14); P(4,9);
      P(0,17); P(-4,9); P(-13,14); P(-8,2); P(-17,-6); P(-5,-8);
    } else if (tipo === 3) {                     // anel partido
      P(0,-17); P(12,-10); P(15,4); P(6,3); P(9,13); P(0,9);
      P(-9,13); P(-6,3); P(-15,4); P(-12,-10);
    } else {                                     // serpente
      P(0,-22); P(6,-14); P(3,-4); P(9,3); P(4,7); P(8,14);
      P(0,11); P(-8,14); P(-4,7); P(-9,3); P(-3,-4); P(-6,-14);
    }
  }
  return p.map(q => [Math.round(q[0] * 10) / 10, Math.round(q[1] * 10) / 10]);
}
const FORMATOS = [];
for (let i = 0; i < 100; i++) {
  const fam = FORMA_FAMILIAS[Math.floor(i / 20)];
  FORMATOS.push({
    id: i,
    nome: FORMA_NOMES[i] || ("Casco " + (i + 1)),
    familia: fam.nome,
    pts: gerarForma(i),
    // o formato já dá uma base: caças batem, bombardeiros aguentam
    dmg: 1 + (Math.floor(i / 20) === 0 ? 0.35 : Math.floor(i / 20) === 3 ? 0.5 : 0.2) + (i % 20) * 0.02,
    agi: 1 + (Math.floor(i / 20) === 1 ? 0.45 : Math.floor(i / 20) === 2 ? 0.25 : 0.05) + (i % 20) * 0.012,
    hp:  180 + (Math.floor(i / 20) === 3 ? 190 : Math.floor(i / 20) === 4 ? 90 : 40) + (i % 20) * 9,
    preco: 300 + i * 34
  });
}

/* ---------- 12 encaixes, 30 peças em cada ---------- */
const ENCAIXES = [
  { id: "frente",    nome: "NARIZ / FRENTE",   icone: "▲", raiz: "Nariz" },
  { id: "tras",      nome: "CAUDA / ATRÁS",    icone: "▼", raiz: "Cauda" },
  { id: "dir",       nome: "PORTA DIREITA",    icone: "▶", raiz: "Porta" },
  { id: "esq",       nome: "PORTA ESQUERDA",   icone: "◀", raiz: "Porta" },
  { id: "teto",      nome: "TETO / CABINE",    icone: "◓", raiz: "Cúpula" },
  { id: "baixo",     nome: "CASCO DE BAIXO",   icone: "◒", raiz: "Casco" },
  { id: "motor",     nome: "MOTOR",            icone: "»", raiz: "Motor" },
  { id: "armas",     nome: "ARMAS",            icone: "≣", raiz: "Canhão" },
  { id: "bombas",    nome: "BOMBAS",           icone: "◉", raiz: "Bomba" },
  { id: "armamento", nome: "ARMAMENTO PESADO", icone: "✦", raiz: "Lançador" },
  { id: "escudo",    nome: "DEFLETOR",         icone: "◎", raiz: "Defletor" },
  { id: "sensor",    nome: "SENSOR",           icone: "◈", raiz: "Sensor" }
];
const PECA_ADJ = [
  "Simples","Leve","Curto","Duplo","Reforçado","Rápido","Blindado","Afiado","Longo","Pesado",
  "Triplo","Térmico","Iônico","Plasma","Fóton","Quântico","Turbo","Cinético","Sônico","Magnético",
  "Prismático","Nêutron","Antimatéria","Gravitacional","Estelar","Solar","Lunar","Cometa","Nebular","Singular"
];
/* cada peça soma um pouco em cada coisa; quanto mais para o fim da lista,
   mais forte e mais cara                                                    */
function fazerPecas(enc, i2) {
  const lista = [];
  for (let n = 0; n < 30; n++) {
    const f = n / 29;                       // 0 a 1
    const peso = 1 + n * 0.06;
    const p = { id: enc.id + n, n, nome: enc.raiz + " " + PECA_ADJ[n],
                encaixe: enc.id, preco: Math.round(60 + Math.pow(n, 1.7) * 13 + i2 * 8) };
    const zerar = { dmg: 0, hp: 0, cad: 0, agi: 0, gem: 0 };
    Object.assign(p, zerar);
    if (enc.id === "frente")         { p.dmg = 0.02 + f * 0.22; p.agi = 0.01 + f * 0.06; }
    else if (enc.id === "tras")      { p.agi = 0.02 + f * 0.18; p.hp = Math.round(f * 30); }
    else if (enc.id === "dir" || enc.id === "esq") { p.agi = 0.02 + f * 0.10; p.hp = Math.round(8 + f * 45); }
    else if (enc.id === "teto")      { p.hp = Math.round(10 + f * 70); }
    else if (enc.id === "baixo")     { p.hp = Math.round(12 + f * 80); p.agi = -f * 0.05; }
    else if (enc.id === "motor")     { p.agi = 0.04 + f * 0.28; p.cad = f * 0.05; }
    else if (enc.id === "armas")     { p.dmg = 0.05 + f * 0.38; p.cad = 0.02 + f * 0.14; }
    else if (enc.id === "bombas")    { p.dmg = 0.08 + f * 0.50; p.agi = -f * 0.08; }
    else if (enc.id === "armamento") { p.dmg = 0.06 + f * 0.42; p.hp = Math.round(f * 25); }
    else if (enc.id === "escudo")    { p.hp = Math.round(15 + f * 100); p.agi = -f * 0.04; }
    else if (enc.id === "sensor")    { p.cad = 0.02 + f * 0.17; p.gem = 0.02 + f * 0.22; }
    p.dmg = Math.round(p.dmg * 100) / 100;
    p.agi = Math.round(p.agi * 100) / 100;
    p.cad = Math.round(p.cad * 100) / 100;
    p.gem = Math.round(p.gem * 100) / 100;
    p.peso = peso;
    lista.push(p);
  }
  return lista;
}
const PECAS = {};
ENCAIXES.forEach((e, i2) => { PECAS[e.id] = fazerPecas(e, i2); });

/* resumo em texto do que a peça faz */
function pecaResumo(p) {
  const t = [];
  if (p.dmg) t.push((p.dmg > 0 ? "+" : "") + Math.round(p.dmg * 100) + "% dano");
  if (p.hp)  t.push((p.hp > 0 ? "+" : "") + p.hp + " vida");
  if (p.cad) t.push((p.cad > 0 ? "+" : "") + Math.round(p.cad * 100) + "% cadência");
  if (p.agi) t.push((p.agi > 0 ? "+" : "") + Math.round(p.agi * 100) + "% agilidade");
  if (p.gem) t.push("+" + Math.round(p.gem * 100) + "% cristais");
  return t.join(" · ") || "só enfeite";
}

/* ---------- monta a definição de nave a partir do que foi escolhido ---------- */
function navePecas(c) {
  const saida = [];
  for (const e of ENCAIXES) {
    const n = c.pecas ? c.pecas[e.id] : undefined;
    if (n === undefined || n === null) continue;
    const p = PECAS[e.id][n];
    if (p) saida.push(p);
  }
  return saida;
}
/* ---------------------------------------------------------------------
   Equilíbrio das naves montadas
   ---------------------------------------------------------------------
   Empilhar as 12 peças mais caras deixava a nave com muito mais vida e
   dano do que qualquer nave de fábrica. Duas regras resolvem isso sem
   tirar a graça de montar:
     1) acima de um certo ponto, cada peça a mais rende bem menos;
     2) peça pesada custa manobra: quanto mais blindagem, mais devagar e
        mais lenta fica a nave.
   Quem quiser uma fortaleza tem a fortaleza — só que ela não vai ser
   rápida também.
   --------------------------------------------------------------------- */
function amaciar(v, teto, sobra) {
  return v <= teto ? v : teto + (v - teto) * sobra;
}
function naveCriadaDef(c) {
  const F = FORMATOS[c.formato] || FORMATOS[0];
  let dmg = F.dmg, agi = F.agi, hp = F.hp, cad = 0, gem = 0, peso = 0;
  for (const p of navePecas(c)) {
    dmg += p.dmg; agi += p.agi; hp += p.hp; cad += p.cad; gem += p.gem;
    peso += p.n + 1 + p.hp / 22;          // peça grande e blindada pesa mais
  }
  // 1) retorno decrescente
  hp  = Math.round(amaciar(hp,  430,  0.25));
  dmg = amaciar(dmg, 1.85, 0.25);
  agi = amaciar(agi, 1.28, 0.25);
  cad = amaciar(cad, 0.12, 0.28);
  gem = amaciar(gem, 0.12, 0.28);
  // 2) peso: blindagem cobra manobra
  peso = Math.round(peso);
  agi = agi / (1 + peso * 0.0013);
  cad = Math.max(0, cad - peso * 0.0006);
  // a ultimate sai do que a nave tem de mais forte
  const escolhas = [["dmg", dmg - 1], ["lives", hp / 400], ["rate", cad * 2.2],
                    ["gold", gem * 2.2], ["ghost", agi - 1]];
  escolhas.sort((a, b) => b[1] - a[1]);
  const ultId = escolhas[0][1] > 0 ? escolhas[0][0] : "dmg";
  /* O bônus de poder é um extra PEQUENO e fixo pela quantidade de peças.
     Antes ele saía do próprio dano da nave, então o dano contava duas
     vezes e uma nave montada chegava a 4x o DPS da melhor de fábrica.    */
  const nPecas = navePecas(c).length;
  return {
    name: c.nome || F.nome,
    price: 0, criada: true, def: c,
    hue: c.hue === undefined ? 190 : c.hue,
    shape: -1, ptsCustom: F.pts,
    power: ultId, powerName: "Feita por você",
    powerMag: Math.min(20, nPecas * 2),
    powerDesc: "Casco " + F.nome + " (" + F.familia + ") com " +
               navePecas(c).length + " peças instaladas",
    baseDmg: Math.round(dmg * 100) / 100,
    baseAgi: Math.round(Math.max(0.5, agi) * 100) / 100,
    baseHp: Math.round(hp),
    bonusCad: Math.round(cad * 100) / 100,
    bonusGem: Math.round(gem * 100) / 100,
    peso: peso
  };
}
function custoDaNave(c) {
  let total = (FORMATOS[c.formato] || FORMATOS[0]).preco;
  for (const p of navePecas(c)) total += p.preco;
  return total;
}
/* recoloca as naves criadas no fim da lista, sem mexer nas de fábrica */
function reconstruirNavesCriadas() {
  SHIPS.length = NAVES_BASE;
  const criadas = (save && save.criadas) || [];
  for (const c of criadas) SHIPS.push(naveCriadaDef(c));
  if (save && save.ship >= SHIPS.length) save.ship = 0;
}
function naveCriada(i) { return i >= NAVES_BASE; }

/* ---------------------------------------------------------------------
   Limpeza das naves montadas
   ---------------------------------------------------------------------
   As primeiras naves montadas saíram desequilibradas (o dano contava duas
   vezes). Em vez de deixar gente jogando com nave quebrada, todas são
   desmontadas de uma vez e os cristais voltam INTEIROS para a conta, para
   a pessoa montar de novo com as regras certas.
   O número da limpeza sobe se um dia precisar acontecer outra vez.
   --------------------------------------------------------------------- */
const LIMPEZA_NAVES = 2;
function limparNavesCriadas(p) {
  const lista = (p && p.criadas) || [];
  if (!lista.length) return 0;
  let volta = 0;
  for (const c of lista) { try { volta += custoDaNave(c); } catch (e) {} }
  p.criadas = [];
  p.crystals = (p.crystals || 0) + volta;
  if (p.ship >= NAVES_BASE) p.ship = 0;
  return volta;
}
let avisoLimpeza = 0;
function aplicarLimpezaDeNaves() {
  if (!save) return;
  if (save.limpezaNaves === LIMPEZA_NAVES) return;
  const volta = limparNavesCriadas(save);
  save.limpezaNaves = LIMPEZA_NAVES;
  if (volta > 0) avisoLimpeza = volta;
  persist();
}


/* ---------- Habilidades das aeronaves exclusivas ----------
   Cada uma tem botão próprio no jogo, com recarga independente.
   Todos os efeitos são apenas dentro do jogo: atingem inimigos, chefes e
   projéteis na tela, e nada fora dela.                                      */
const HABILIDADES = {};
HABILIDADES[MAVERICK] = [
  { id: "sidewinder", nome: "Sidewinder",     icone: "➤",  cd: 7,
    desc: "Dispara 6 mísseis teleguiados de uma vez" },
  { id: "vulcan",     nome: "Canhão Vulcan",  icone: "≣",  cd: 11,
    desc: "4s de cadência tripla" },
  { id: "posComb",    nome: "Pós-combustor",  icone: "»",  cd: 13,
    desc: "3s de velocidade dobrada e invencibilidade" },
  { id: "flares",     nome: "Sinalizadores",  icone: "✦",  cd: 9,
    desc: "Destrói todos os tiros inimigos da tela" },
  { id: "rasante",    nome: "Voo Rasante",    icone: "✈",  cd: 18,
    desc: "Investida que atravessa a tela ferindo tudo no caminho" }
];
HABILIDADES[B2] = [
  { id: "bombardeio", nome: "Bombardeio",      icone: "▼", cd: 9,
    desc: "Solta 8 bombas em linha, cada uma explodindo em área" },
  { id: "buraco",     nome: "Buraco Negro",    icone: "◉", cd: 14,
    desc: "Cria um buraco negro que puxa e fere; dois deles se tocando causam a Super Nova" },
  { id: "furtivo",    nome: "Modo Furtivo",    icone: "◍", cd: 20,
    desc: "5s invisível: os inimigos não te veem nem atiram" },
  { id: "cruzador",   nome: "Míssil Cruzador", icone: "➤", cd: 12,
    desc: "Míssil pesado que persegue e explode com força" },
  { id: "emp",        nome: "Pulso EMP",       icone: "⚡", cd: 16,
    desc: "Paralisa os inimigos por 4s e apaga os tiros da tela" },
  { id: "napalm",     nome: "Napalm",          icone: "≋", cd: 12,
    desc: "Faixa de fogo que queima os inimigos por 5s" },
  { id: "titanio",    nome: "Escudo de Titânio", icone: "◎", cd: 17,
    desc: "Escudo reforçado e 3s de invencibilidade" },
  { id: "escolta",    nome: "Drones de Escolta", icone: "◈", cd: 22,
    desc: "4 drones de combate lutam com você por 10s" },
  { id: "contra",     nome: "Contramedidas",   icone: "✧", cd: 10,
    desc: "Destrói os tiros inimigos e devolve o dano em volta" },
  { id: "supernova",  nome: "Super Nova",      icone: "☀", cd: 0, combo: true,
    desc: "Acontece sozinha quando dois buracos negros se encontram: clarão que varre inimigos e castiga o chefe" }
];
HABILIDADES[OMEGA] = [
  { id: "nuclear",   nome: "Ogiva Nuclear",       icone: "☢", cd: 0.8,
    desc: "Acaba com a onda inteira na hora. Sem limite: pode jogar quantas quiser" },
  { id: "tanques",   nome: "Coluna de Tanques",   icone: "▄", cd: 6,
    desc: "Chama 5 tanques que ficam lutando com você até o fim da fase" },
  { id: "esquadrao", nome: "Esquadrão de Bombardeio", icone: "✈", cd: 5,
    desc: "Três bombardeiros cruzam a tela largando bombas" },
  { id: "fuzileiros", nome: "Pelotão de Fuzileiros", icone: "웃", cd: 6,
    desc: "Desembarca 8 soldados que atiram sem parar até o fim da fase" },
  { id: "artilharia", nome: "Artilharia Pesada",  icone: "◎", cd: 7,
    desc: "Chuva de obuses marcados no chão, um atrás do outro" },
  { id: "orbital",   nome: "Canhão Orbital",      icone: "⌖", cd: 9,
    desc: "Raio do céu que varre a tela de um lado ao outro" },
  { id: "helicoptero", nome: "Helicópteros",      icone: "✥", cd: 8,
    desc: "Dois helicópteros de escolta metralham tudo até o fim da fase" },
  { id: "reparo",    nome: "Reparo de Campanha",  icone: "✚", cd: 12,
    desc: "Recupera toda a vida, o escudo e limpa os tiros da tela" },
  { id: "blindagem", nome: "Blindagem Ômega",     icone: "◘", cd: 14,
    desc: "8 segundos sem tomar dano nenhum" },
  { id: "operacao",  nome: "Operação Ômega",      icone: "★", cd: 18,
    desc: "Tudo de uma vez: nuclear, bombardeio, tanques, tropas e artilharia" },
  { id: "apocalipse", nome: "APOCALIPSE ÔMEGA",   icone: "∞", cd: 0, supremo: true,
    desc: "Liga o arsenal inteiro NO AUTOMÁTICO e não desliga mais: todas as habilidades disparando sem parar até a fase acabar. Sem recarga, sem limite." }
];

/* ---------- Habilidades da privada do administrador ---------- */
HABILIDADES[PRIVADA] = [
  { id: "bombaCoco", nome: "Bomba de Cocô",   icone: "💩", cd: 6,
    desc: "Larga 6 bombas fedorentas que explodem em área" },
  { id: "descarga",  nome: "Descarga Suprema", icone: "🌀", cd: 12,
    desc: "Jato de descarga que varre a tela inteira e leva os tiros embora" },
  { id: "gasLetal",  nome: "Gás Letal",       icone: "☁", cd: 10,
    desc: "Nuvem de gás que queima os inimigos por perto durante 6s" },
  { id: "papel",     nome: "Papel Higiênico", icone: "🧻", cd: 9,
    desc: "Enrola todo mundo: inimigos e chefe ficam parados por 4s" },
  { id: "tampa",     nome: "Escudo de Tampa", icone: "⭕", cd: 14,
    desc: "Baixa a tampa: escudo cheio e 4s sem tomar dano" },
  { id: "chuvaCoco", nome: "Chuva Marrom",    icone: "▼", cd: 13,
    desc: "Chove cocô do céu em cima de todo mundo por 5 segundos" },
  { id: "ralo",      nome: "Ralo sem Fundo",  icone: "🚽", cd: 16,
    desc: "Abre um ralo que puxa e engole os inimigos da tela" },
  { id: "intestinal", nome: "EXPLOSÃO INTESTINAL", icone: "☢", cd: 22,
    desc: "Solta tudo de uma vez: bombas, gás, papel, chuva marrom e descarga" }
];

function habilidadesDaNave() { return HABILIDADES[save.ship] || []; }

/* =====================================================================
   MELHORIA DE HABILIDADES — cada habilidade sobe de nível com cristais
   ---------------------------------------------------------------------
   Vale para TODAS as naves. As que têm habilidades próprias (com botão
   na tela) sobem uma por uma; as outras sobem o poder e a ultimate.
   Cada nível deixa a habilidade mais forte (+15%), recarrega mais
   rápido (−5%) e ainda dá +1% de dano para a nave. Custa caro de
   propósito: é a melhoria mais pesada do jogo.
   ===================================================================== */
const HAB_MAX = 10;
function custoHab(nivel) {
  return Math.round(2200 * Math.pow(1.62, nivel) / 50) * 50;
}
function habsUpgrade(i) {
  i = naveValida(i);
  const lista = HABILIDADES[i];
  if (lista && lista.length) return lista;
  const sh = SHIPS[i];
  const ult = ULTS[sh.ultId || sh.power] || { name: "Sobrecarga", desc: "descarrega tudo de uma vez" };
  return [
    { id: "poder", nome: sh.powerName, icone: "✦", desc: sh.powerDesc, basica: true },
    { id: "ult",   nome: ult.name,     icone: "★", desc: ult.desc,     basica: true }
  ];
}
function chaveHab(i, id) { return naveValida(i) + ":" + id; }
function habNivel(i, id) {
  if (!save.habNv) save.habNv = {};
  const v = save.habNv[chaveHab(i, id)];
  return (typeof v === "number" && v > 0) ? Math.min(HAB_MAX, Math.floor(v)) : 0;
}
function nivelAtivo(id) {
  try { return modoJusto() ? 0 : habNivel(save.ship, id); } catch (e) { return 0; }
}
/* quanto a habilidade em uso rende a mais, e quanto ela recarrega mais rápido */
function habForca(id)  { return 1 + 0.15 * nivelAtivo(id); }
function habRecarga(cd, id) { return cd * (1 - 0.05 * nivelAtivo(id)); }
function habNiveisDaNave(i) {
  let t = 0;
  for (const h of habsUpgrade(i)) t += habNivel(i, h.id);
  return t;
}
function habNiveisAtivos() {
  try { return modoJusto() ? 0 : habNiveisDaNave(save.ship); } catch (e) { return 0; }
}

function naveValida(i) {
  return (typeof i === "number" && i >= 0 && i < SHIPS.length) ? i : 0;
}
function shipHue(i) {
  i = naveValida(i);
  const c = save.custom ? save.custom[i] : null;
  return (c && typeof c.hue === "number") ? c.hue : SHIPS[i].hue;
}
function shipGlowHue(i) {
  i = naveValida(i);
  const c = save.custom ? save.custom[i] : null;
  return (c && typeof c.glow === "number") ? c.glow : shipHue(i);
}
function shipColor(i) { return "hsl(" + shipHue(i) + ",100%,66%)"; }
function shipGlowColor(i) { return "hsl(" + shipGlowHue(i) + ",100%,62%)"; }

/* contorno de cada formato (usado no 2D e na oficina 3D) */
const SHAPE_PTS = [
  [[0,-18],[11,10],[4,6],[0,12],[-4,6],[-11,10]],
  [[0,-16],[6,-2],[16,8],[5,7],[0,13],[-5,7],[-16,8],[-6,-2]],
  [[0,-20],[4,0],[9,12],[0,8],[-9,12],[-4,0]],
  [[0,-14],[10,-8],[13,10],[4,12],[0,9],[-4,12],[-13,10],[-10,-8]],
  [[0,-17],[8,-11],[13,-2],[12,11],[6,7],[0,12],[-6,7],[-12,11],[-13,-2],[-8,-11]],
  /* 5 — Maverick: caça de asa enflechada e cauda dupla */
  [[0,-21],[3,-12],[5,-7],[16,3],[16,7],[6,5],[5,10],[9,15],[4,15],[2,11],
   [0,15],[-2,11],[-4,15],[-9,15],[-5,10],[-6,5],[-16,7],[-16,3],[-5,-7],[-3,-12]],
  /* 6 — B-2 Spirit: asa voadora com bordo de fuga em W */
  [[0,-15],[6,-8],[19,5],[11,5],[8,11],[4,5],[0,10],[-4,5],[-8,11],[-11,5],[-19,5],[-6,-8]],
  /* 7 — Ômega-9: fortaleza voadora, casco largo com quatro pilones */
  [[0,-22],[4,-16],[7,-11],[10,-12],[11,-4],[21,-1],[22,5],[13,4],[12,10],[7,9],
   [6,15],[2,13],[0,17],[-2,13],[-6,15],[-7,9],[-12,10],[-13,4],[-22,5],[-21,-1],
   [-11,-4],[-10,-12],[-7,-11],[-4,-16]],
  /* 8 — Trono Real: privada vista de cima, tampa levantada e caixa atrás */
  [[0,-20],[6,-18],[9,-13],[10,-6],[9,1],[7,6],[9,8],[12,12],[13,17],[12,20],
   [-12,20],[-13,17],[-12,12],[-9,8],[-7,6],[-9,1],[-10,-6],[-9,-13],[-6,-18]]
];

/* peças de melhoria por nave */
const PARTS = [
  { id: "cannon",  icon: "▲", name: "Canhão",    desc: "+6% de dano por nível" },
  { id: "turbine", icon: "≡", name: "Turbina",   desc: "+5% de cadência por nível" },
  { id: "armor",   icon: "♥", name: "Blindagem", desc: "+1 vida máxima a cada 2 níveis" },
  { id: "engine",  icon: "»", name: "Motor",     desc: "+6% de agilidade por nível" },
  { id: "reactor", icon: "◆", name: "Reator",    desc: "+6% de cristais por nível" },
  /* --- peças novas --- */
  { id: "mira",    icon: "⌖", name: "Mira",      desc: "+5% de velocidade dos tiros por nível" },
  { id: "escudo",  icon: "◎", name: "Defletor",  desc: "+8% de duração do escudo por nível" },
  { id: "carga",   icon: "⚡", name: "Capacitor", desc: "+7% de carga da ultimate por nível" },
  { id: "estilha", icon: "✷", name: "Estilhaço", desc: "+7 de raio de explosão nos tiros por nível" }
];
const PART_MAX = 5;
function shipPartsOf(i) { return save.parts[i] || {}; }
function partLevel(i, id) { return shipPartsOf(i)[id] || 0; }
function partCost(shipIdx, lvl) {
  return Math.max(15, Math.round((18 + SHIPS[shipIdx].price * 0.05) * Math.pow(1.6, lvl)));
}
function shipOwned(i) { return i >= NAVES_BASE || save.ships.indexOf(i) >= 0; }

/* armamentos compráveis por nave */
const WEAPONS = [
  { id: "pulse",  name: "Pulso",  desc: "Canhão padrão, equilibrado",            dmg: 1,    rate: 1 },
  { id: "laser",  name: "Laser",  desc: "Feixes finos e velozes (+35% cadência)", dmg: 0.85, rate: 1.35 },
  { id: "plasma", name: "Plasma", desc: "Esferas pesadas (+65% dano, mais lento)", dmg: 1.65, rate: 0.65 },
  { id: "vulcan", name: "Vulcan", desc: "Metralhadora de agulhas (quase o dobro de tiros)", dmg: 0.6, rate: 1.9 }
];
function weaponCost(i) { return Math.round(120 + SHIPS[i].price * 0.4); }
function weaponsOf(i) { return save.weapons[i] || ["pulse"]; }
function curWeaponId() { return save.weaponSel[save.ship] || "pulse"; }

/* cores da oficina */
const PAINT_HUES = [190, 330, 45, 275, 140, 15, 210, 356, 90, 315, 60, 180];
const PAINT_COST = 100, GLOW_COST = 80;

/* ---------- Amuletos ---------- */
const RARS = [
  { name: "COMUM",    color: "#9FB0CC" },
  { name: "RARO",     color: "#4DE8FF" },
  { name: "ÉPICO",    color: "#C34DFF" },
  { name: "LENDÁRIO", color: "#FFC145" }
];
const AMULET_TYPES = [
  { id: "vida",    icon: "♥", name: "Amuleto de Vida",     vals: [1, 1, 2, 3],     fx: v => "+" + v + (v > 1 ? " vidas máximas" : " vida máxima") },
  { id: "escudo",  icon: "◎", name: "Amuleto de Escudo",   vals: [10, 18, 30, 45], fx: v => "+" + v + "% de duração do escudo" },
  { id: "dano",    icon: "▲", name: "Amuleto de Dano",     vals: [4, 8, 14, 22],   fx: v => "+" + v + "% de dano" },
  { id: "cadencia",icon: "≡", name: "Amuleto de Cadência", vals: [3, 6, 10, 16],   fx: v => "+" + v + "% de cadência de tiro" },
  { id: "cristal", icon: "◆", name: "Amuleto de Cristal",  vals: [6, 12, 20, 32],  fx: v => "+" + v + "% de cristais" },
  { id: "sorte",   icon: "✦", name: "Amuleto da Sorte",    vals: [10, 20, 35, 55], fx: v => "+" + v + "% de chance de itens caírem" },
  { id: "ima",     icon: "◈", name: "Amuleto Magnético",   vals: [60, 100, 150, 220], fx: v => "atrai itens num raio de " + v },
  { id: "motor",   icon: "»", name: "Amuleto do Vento",    vals: [3, 6, 10, 15],   fx: v => "+" + v + "% de agilidade" },
  /* --- relíquias novas --- */
  { id: "furia",   icon: "☲", name: "Amuleto da Fúria",    vals: [8, 15, 24, 36],  fx: v => "a ultimate carrega " + v + "% mais rápido" },
  { id: "gelo",    icon: "❆", name: "Amuleto Glacial",     vals: [8, 14, 22, 34],  fx: v => "seus tiros deixam os inimigos " + v + "% mais lentos" },
  { id: "brasa",   icon: "✷", name: "Amuleto de Brasa",    vals: [22, 38, 58, 84], fx: v => "seus tiros explodem num raio de " + v },
  { id: "sangue",  icon: "❥", name: "Amuleto de Sangue",   vals: [3, 6, 10, 15],   fx: v => v + "% de chance de ganhar vida ao destruir um inimigo" },
  { id: "muralha", icon: "▣", name: "Amuleto Muralha",     vals: [10, 18, 28, 42], fx: v => "+" + v + "% de casco (vida da nave)" },
  { id: "perfura", icon: "⌁", name: "Amuleto Perfurante",  vals: [1, 1, 2, 3],     fx: v => "seus tiros atravessam +" + v + (v > 1 ? " inimigos" : " inimigo") },
  { id: "eco",     icon: "◐", name: "Amuleto do Eco",      vals: [10, 18, 28, 42], fx: v => v + "% de chance de disparar um tiro extra" },
  { id: "guarda",  icon: "✜", name: "Amuleto da Guarda",   vals: [10, 18, 28, 40], fx: v => "+" + v + "% de tempo invencível ao tomar dano" },
  { id: "enxame",  icon: "❉", name: "Amuleto Enxame",      vals: [20, 35, 55, 80], fx: v => "um drone luta com você, com " + v + "% do seu dano" },
  { id: "prisma",  icon: "◇", name: "Amuleto Prisma",      vals: [4, 8, 13, 20],   fx: v => "+" + v + "% de dano E +" + v + "% de cadência" },
  { id: "veloz",   icon: "➤", name: "Amuleto Certeiro",    vals: [10, 18, 28, 42], fx: v => "seus tiros voam " + v + "% mais rápido" },
  { id: "avareza", icon: "❖", name: "Amuleto da Avareza",  vals: [5, 9, 14, 22],   fx: v => v + "% de chance de um inimigo soltar cristal em dobro" }
];
const AMULET_SPECIALS = [
  { id: "capa",  icon: "◍", name: "Capa da Invisibilidade", fx: () => "Botão CAPA: 4s invisível — os inimigos não te veem nem atiram, e você os destrói por contato (recarga 25s)" },
  { id: "fenix", icon: "❦", name: "Coração de Fênix",       fx: () => "+1 ressurreição por fase" },
  { id: "tempo", icon: "∞", name: "Núcleo Temporal",        fx: () => "A ultimate carrega 35% mais rápido" },
  /* --- lendárias novas --- */
  { id: "juizo",   icon: "⚖", name: "Selo do Juízo",        fx: () => "Ao começar cada onda, um raio cai e destrói o inimigo mais forte da tela" },
  { id: "espelho", icon: "◫", name: "Espelho Astral",       fx: () => "Uma cópia fantasma voa junto e repete os seus tiros com metade do dano" },
  { id: "ampulha", icon: "⧗", name: "Ampulheta Rachada",    fx: () => "Quando você perde uma vida, o tempo desacelera 3s e os tiros da tela somem" },
  { id: "coroa",   icon: "♛", name: "Coroa do Vazio",       fx: () => "+25% de dano, +25% de cristais e +1 vida — mas você tem 15% menos casco" },
  { id: "colmeia", icon: "❈", name: "Colmeia Viva",         fx: () => "Dois drones extras lutam com você a fase inteira" }
];
const CHEST_COST = 300;
/* o baú fica mais barato para quem é VIP ou tem o Passe do Colecionador */
function precoDoBau() {
  let p2 = CHEST_COST;
  if (typeof temVip === "function" && temVip()) p2 *= 0.7;
  if (typeof temPasse === "function" && temPasse("colecao")) p2 *= 0.6;
  return Math.max(50, Math.round(p2));
}
const SELL_VALUES = [40, 120, 400, 1500];
function amuletDef(a) {
  if (a.rar === 3) {
    const sp = AMULET_SPECIALS.find(s => s.id === a.type);
    if (sp) return { icon: sp.icon, name: sp.name, fxText: sp.fx() };
  }
  const t = AMULET_TYPES.find(t2 => t2.id === a.type);
  if (!t) return { icon: "?", name: "Amuleto", fxText: "" };
  return { icon: t.icon, name: t.name, fxText: t.fx(t.vals[a.rar]) };
}
function rollAmulet() {
  const r = Math.random();
  let rar = 0;
  if (r < 0.03) rar = 3; else if (r < 0.15) rar = 2; else if (r < 0.45) rar = 1;
  let type;
  if (rar === 3 && Math.random() < 0.55) {
    type = AMULET_SPECIALS[Math.floor(Math.random() * AMULET_SPECIALS.length)].id;
  } else {
    type = AMULET_TYPES[Math.floor(Math.random() * AMULET_TYPES.length)].id;
  }
  const a = { uid: save.amuletSeq++, type, rar };
  save.amulets.push(a);
  return a;
}
function equippedAmulets() {
  return save.equipped.map(uid => save.amulets.find(a => a.uid === uid)).filter(Boolean);
}

/* ---------- Árvore de habilidades ---------- */
const BRANCHES = [
  { id: "atk", name: "ATAQUE",  color: "#4DE8FF", passive: "+3% de dano" },
  { id: "def", name: "DEFESA",  color: "#FFC145", passive: "+2% de escudo e invencibilidade" },
  { id: "res", name: "RECURSOS", color: "#FF4D8F", passive: "+2% de cristais" }
];
const MILESTONES = {
  atk: {
    10: { name: "Tiro Lateral",        desc: "Dispara 2 projéteis diagonais extras" },
    20: { name: "Mísseis Teleguiados", desc: "Lança um míssil que persegue inimigos" },
    30: { name: "Golpe Crítico",       desc: "15% de chance de causar dano em dobro" },
    40: { name: "Perfuração",          desc: "Seus tiros atravessam 1 inimigo extra" }
  },
  def: {
    10: { name: "Escudo Inicial",      desc: "Começa cada fase com o escudo ativo" },
    20: { name: "Nanobots",            desc: "O escudo se regenera após 20s sem escudo" },
    30: { name: "Sistema de Emergência", desc: "Sobrevive à destruição 1 vez por fase" },
    40: { name: "Fortaleza",           desc: "+2 vidas máximas" }
  },
  res: {
    10: { name: "Ímã de Cristais",     desc: "Atrai cristais e power-ups próximos" },
    20: { name: "Sorte",               desc: "+60% de chance de inimigos soltarem itens" },
    30: { name: "Comerciante",         desc: "+50% de cristais ganhos" },
    40: { name: "Nova de Choque",      desc: "Ao ser atingido, limpa as balas inimigas e fere inimigos próximos" }
  }
};
function nodeId(branch, tier) { return branch + tier; }
function branchCount(branch) {
  let n = 0;
  for (let t = 1; t <= 40; t++) if (save.skills[nodeId(branch, t)]) n++;
  return n;
}
function hasSkill(branch, tier) { return !!save.skills[nodeId(branch, tier)]; }
function ptsSpent() { return Object.keys(save.skills).length; }
function ptsAvailable() { return Math.max(0, save.pts - ptsSpent()); }

/* ---------- Atributos efetivos ---------- */
let ST = null;
/* No cooperativo e no competitivo ninguém leva vantagem de loja: valem só
   a nave escolhida e a habilidade de quem joga. */
function modoJusto() {
  /* Só o COMPETITIVO zera tudo: no duelo e na ranqueada os dois têm de
     começar iguais, senão vence quem jogou mais e não quem joga melhor.
     No cooperativo, na jornada em dupla e na arena todo mundo está do
     mesmo lado — lá vale o que cada um construiu, e é por isso que as
     melhorias da dupla fazem diferença.
     (MP é criado num bloco posterior; a checagem tolera isso.)        */
  return typeof MP !== "undefined" && !!MP && !!MP.sala && MP.modo === "pvp";
}
/* a loja é montada num bloco posterior; estas duas aguentam ser
   chamadas antes disso sem quebrar o carregamento */
function vipLigado() { try { return temVip(); } catch (e) { return false; } }
function passeLigado(id) { try { return temPasse(id); } catch (e) { return false; } }
/* bônus permanente de quem já terminou as 270 fases (+10% por volta) */
function prestMult() {
  try { return 1 + (save.prestigio || 0) * 0.10; } catch (e) { return 1; }
}
function calcStats() {
  const justo = modoJusto();
  const ZERO = { dmg: 0, rate: 0, hull: 0, shield: 0, speed: 0, luck: 0,
                 mira: 0, crit: 0, ima: 0, reparo: 0, carga: 0, placa: 0, reserva: 0, estilha: 0 };
  const u = justo ? ZERO : Object.assign({}, ZERO, save.upgrades);
  const atk = justo ? 0 : branchCount("atk");
  const def = justo ? 0 : branchCount("def");
  const res = justo ? 0 : branchCount("res");
  const sh = SHIPS[naveValida(save.ship)] || SHIPS[0];
  const P = justo ? {} : shipPartsOf(save.ship);
  const wp = WEAPONS.find(w => w.id === curWeaponId()) || WEAPONS[0];
  /* o poder da nave cresce com o nível da habilidade "poder" */
  const nvPoder = justo ? 0 : habNivel(save.ship, "poder");
  const nvUlt   = justo ? 0 : habNivel(save.ship, "ult");
  const nvTudo  = justo ? 0 : habNiveisDaNave(save.ship);
  /* melhorias compradas dentro da jornada daquela dupla (só valem lá) */
  const jm = (id) => { try { return justo ? 1 : jornadaMult(id); } catch (e) { return 1; } };
  const pw = id => (sh.power === id ? sh.powerMag * (1 + 0.10 * nvPoder) : 0);
  const A = { vida: 0, escudo: 0, dano: 0, cadencia: 0, cristal: 0, sorte: 0, ima: 0, motor: 0,
              furia: 0, gelo: 0, brasa: 0, sangue: 0, muralha: 0, perfura: 0, eco: 0,
              guarda: 0, enxame: 0, prisma: 0, veloz: 0, avareza: 0,
              capa: false, fenix: false, tempo: false,
              juizo: false, espelho: false, ampulha: false, coroa: false, colmeia: false };
  const ESPECIAIS = AMULET_SPECIALS.map(x => x.id);
  for (const am of (justo ? [] : equippedAmulets())) {
    if (am.rar === 3 && ESPECIAIS.indexOf(am.type) >= 0) { A[am.type] = true; continue; }
    const t = AMULET_TYPES.find(t2 => t2.id === am.type);
    if (t) {
      const v = t.vals[am.rar];
      // os de raio pegam o maior, não somam
      if (am.type === "ima" || am.type === "brasa" || am.type === "enxame") A[am.type] = Math.max(A[am.type], v);
      else A[am.type] += v;
    }
  }
  ST = {
    dmg: (1 + 0.08 * u.dmg) * (1 + 0.03 * atk) * sh.baseDmg *
         (1 + 0.06 * (P.cannon || 0)) * (1 + pw("dmg") / 100) * wp.dmg *
         (1 + (A.dano + A.prisma) / 100) * (A.coroa ? 1.25 : 1) * (1 + 0.01 * nvTudo) *
         jm("dano") * mundoMult("dano") * prestMult(),
    fireInterval: 0.17 / ((1 + 0.05 * u.rate) * (1 + 0.05 * (P.turbine || 0)) *
                  (1 + pw("rate") / 100) * wp.rate * (1 + (A.cadencia + A.prisma) / 100) * (sh.baseRate || 1) *
                  (1 + (sh.bonusCad || 0)) * jm("cadencia") * mundoMult("cadencia")),
    maxHp: Math.max(40, Math.round(
      (80 + (sh.baseHp || 120)) *
      (1 + 0.12 * u.hull) * (1 + 0.08 * (P.armor || 0)) *
      (1 + 0.02 * def) * (1 + A.vida * 0.08) * (1 + A.muralha / 100) *
      (A.coroa ? 0.85 : 1) * jm("casco") * mundoMult("vida"))),
    maxLives: 3 + u.hull + (hasSkill("def", 40) ? 2 : 0) + Math.floor((P.armor || 0) / 2) +
              pw("lives") + A.vida + (A.coroa ? 1 : 0),
    shieldDur: (6 + 1.5 * u.shield) * (1 + 0.02 * def) * (1 + pw("ghost") / 100) *
               (1 + A.escudo / 100) * (1 + 0.08 * (P.escudo || 0)) * jm("escudo"),
    invulnDur: 2.2 * (1 + 0.02 * def) * (1 + pw("ghost") / 100) *
               (1 + A.guarda / 100) * (1 + 0.08 * u.placa),
    /* um tico mais lentos que antes (1.15 -> 1.06): a nave ficou menos
       escorregadia e dá para mirar melhor sem perder a agilidade   */
    speedK: 1.06 * (1 + 0.06 * u.speed) * sh.baseAgi * (1 + 0.06 * (P.engine || 0)) *
            (1 + A.motor / 100) * jm("motor"),
    crystalMult: (typeof passivaVale === "function" && passivaVale("cristal") ? 1.08 : 1) *
                 prestMult() * (1 + 0.10 * u.luck) * (1 + 0.02 * res) * (hasSkill("res", 30) ? 1.5 : 1) *
                 (1 + 0.06 * (P.reactor || 0)) * (1 + pw("gold") / 100) * (1 + A.cristal / 100) *
                 (sh.baseGem || 1) * (1 + (sh.bonusGem || 0)) * (A.coroa ? 1.25 : 1) *
                 (justo ? 1 : (vipLigado() ? 1.25 : 1)) * jm("cristal") * mundoMult("cristais"),
    dropMult: (hasSkill("res", 20) ? 1.6 : 1) * (1 + A.sorte / 100) * mundoMult("drop") *
              (justo ? 1 : (passeLigado("sorte") ? 1.4 : 1)),
    sideShot: hasSkill("atk", 10),
    missiles: hasSkill("atk", 20),
    critChance: (hasSkill("atk", 30) ? 0.15 : 0) + 0.03 * u.crit,
    pierce: (hasSkill("atk", 40) ? 1 : 0) + A.perfura,
    startShield: hasSkill("def", 10) || (!justo && passeLigado("escudo")),
    nanobots: hasSkill("def", 20),
    revive: (hasSkill("def", 30) ? 1 : 0) + (A.fenix ? 1 : 0) +
            (justo ? 0 : (passeLigado("renascer") ? 1 : 0)),
    nova: hasSkill("res", 40),
    magnetR: (!justo && passeLigado("ima")) ? 99999
             : Math.max(hasSkill("res", 10) ? 150 : 0, pw("magnet"), A.ima) + 35 * u.ima,
    vamp: pw("vamp") / 100 + A.sangue / 100 + 0.04 * u.reserva,
    frost: pw("frost") / 100 + A.gelo / 100,
    blast: Math.max(pw("blast"), A.brasa) + 9 * u.estilha + 7 * (P.estilha || 0),
    droneDmg: Math.max(pw("drone"), A.enxame / 100),
    dronesExtra: A.colmeia ? 2 : 0,
    ecoChance: A.eco / 100,
    balaVel: 1 + A.veloz / 100 + 0.07 * u.mira + 0.05 * (P.mira || 0),
    avareza: A.avareza / 100 + (justo ? 0 : (passeLigado("dobro") ? 0.15 : 0)),
    juizo: A.juizo,
    espelho: A.espelho,
    ampulha: A.ampulha,
    ultType: sh.ultId || sh.power,
    ultRate: (A.tempo ? 1.35 : 1) * (1 + A.furia / 100) *
             (1 + 0.08 * u.carga) * (1 + 0.07 * (P.carga || 0)) * (1 + 0.08 * nvUlt),
    ultForca: 1 + 0.12 * nvUlt,
    reparoOnda: 0.06 * u.reparo,
    cloak: A.capa,
    wStyle: wp.id,
    bColor: "hsl(" + shipHue(save.ship) + ",100%,78%)",
    bGlow: shipColor(save.ship)
  };
}
calcStats();

/* ---------- Áudio (sintetizado) ---------- */
const AudioSys = {
  ctx: null, master: null,
  muted: storageGet("nn_muted", "0") === "1",
  lastShot: 0,
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5 * ajVol("volEfe");
      this.master.connect(this.ctx.destination);
    } catch (e) { this.ctx = null; }
  },
  resume() {
    this.init();
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
  },
  setMuted(m) {
    this.muted = m;
    storageSet("nn_muted", m ? "1" : "0");
    if (this.master) this.master.gain.value = m ? 0 : 0.5 * ajVol("volEfe");
  },
  tone(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type || "square";
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(this.master);
    osc.start(t); osc.stop(t + dur + 0.02);
  },
  noise(dur, vol, freq) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = freq || 900;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter); filter.connect(g); g.connect(this.master);
    src.start(t);
  },
  shoot() {
    const now = performance.now();
    if (now - this.lastShot < 70) return;
    this.lastShot = now;
    this.tone(880, 0.08, "square", 0.05, 220);
  },
  hit()      { this.noise(0.15, 0.22, 1400); },
  explode()  { this.noise(0.4, 0.4, 700); this.tone(140, 0.35, "sawtooth", 0.15, 40); },
  bigBoom()  { this.noise(0.8, 0.5, 500); this.tone(90, 0.7, "sawtooth", 0.25, 30); },
  power()    { this.tone(523, 0.09, "square", 0.12); setTimeout(() => this.tone(659, 0.09, "square", 0.12), 90); setTimeout(() => this.tone(784, 0.14, "square", 0.12), 180); },
  gem()      { this.tone(1245, 0.07, "sine", 0.1, 1660); },
  hurt()     { this.tone(200, 0.3, "sawtooth", 0.2, 60); this.noise(0.25, 0.3, 800); },
  bossAlert(){ this.tone(110, 0.5, "sawtooth", 0.2, 220); setTimeout(() => this.tone(110, 0.5, "sawtooth", 0.2, 220), 550); },
  wave()     { this.tone(392, 0.1, "triangle", 0.15); setTimeout(() => this.tone(523, 0.16, "triangle", 0.15), 110); },
  buy()      { this.tone(659, 0.08, "square", 0.14); setTimeout(() => this.tone(880, 0.12, "square", 0.14), 90); },
  deny()     { this.tone(180, 0.18, "sawtooth", 0.14, 120); },
  victory()  { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.22, "triangle", 0.16), i * 140)); },
  skill()    { this.tone(784, 0.1, "sine", 0.15); setTimeout(() => this.tone(1046, 0.2, "sine", 0.15), 110); },
  ultReady() { this.tone(660, 0.12, "sine", 0.14, 990); setTimeout(() => this.tone(990, 0.18, "sine", 0.14), 130); },
  habPronta(){ this.tone(880, 0.06, "sine", 0.08); setTimeout(() => this.tone(1320, 0.09, "sine", 0.08), 70); },
  ultFire()  { this.noise(0.5, 0.4, 600); this.tone(120, 0.6, "sawtooth", 0.22, 480); },
  cloak()    { this.tone(700, 0.35, "sine", 0.14, 120); },
  chest()    { [392, 523, 659, 880, 1174].forEach((f, i) => setTimeout(() => this.tone(f, 0.14, "triangle", 0.13), i * 100)); },
  beamWarn() { this.tone(1500, 0.3, "sine", 0.08, 900); }
};

/* =====================================================================
   MÚSICA — uma trilha diferente para cada fase
   ---------------------------------------------------------------------
   Nada de arquivo de som: a música é tocada na hora pelo próprio jogo,
   como as outras vozes. Cada setor tem uma escala, um andamento e um
   jeito de tocar; dentro do setor, o número da fase muda a melodia, a
   linha do baixo e a batida. Assim cada uma das 270 fases tem a sua, sem
   pesar nada no download.
   As fases de chefe entram num tema mais tenso e mais rápido.
   ===================================================================== */
const ESCALAS = [
  [0, 2, 3, 5, 7, 8, 10],      // menor natural — sério
  [0, 2, 4, 7, 9],             // pentatônica maior — aberto
  [0, 3, 5, 6, 7, 10],         // blues — sujo
  [0, 1, 5, 7, 8],             // frígia — tenso
  [0, 2, 3, 5, 7, 9, 10],      // dórica — heroico
  [0, 2, 4, 6, 8, 10]          // tons inteiros — estranho, do vazio
];
const TIMBRES = ["square", "sawtooth", "triangle"];

const Musica = {
  ligada: storageGet("nn_musica", "1") === "1",
  tocando: false,
  timer: null,
  passo: 0,
  faseAtual: -1,
  ganho: null,
  plano: null,

  preparar() {
    if (!AudioSys.ctx || this.ganho) return;
    try {
      this.ganho = AudioSys.ctx.createGain();
      this.ganho.gain.value = 0.16 * ajVol("volMus");
      this.ganho.connect(AudioSys.master);
    } catch (e) { this.ganho = null; }
  },

  /* monta a trilha da fase: sempre a mesma para a mesma fase */
  montar(fase, chefe) {
    const r = rngDe(((fase * 2654435761) ^ 0x9e37) >>> 0);
    /* cada bioma tem escala, andamento e timbre próprios: dá para
       ouvir que você mudou de lugar, não só de fase */
    let bioma = null;
    try { bioma = biomaDaFase(fase); } catch (e) {}
    const setor = bioma ? bioma.escala : Math.floor((fase - 1) / 20) % ESCALAS.length;
    // quando o administrador liga um evento, a trilha dele manda na fase
    let ev = null;
    try { ev = eventoAtual(); } catch (e) {}
    const escala = ev ? ev.nota : ESCALAS[chefe ? 3 : setor];
    const raiz = ev ? 98 * Math.pow(2, ((fase * 3) % 12) / 12) / 2
                    : 110 * Math.pow(2, ((fase * 5) % 12) / 12) / 2;
    const bpm = ev ? ev.bpm + (chefe ? 14 : 0)
                   : Math.round(((chefe ? 132 : 96) + Math.floor(r() * 26) +
                       Math.min(28, Math.floor(fase / 12))) * (bioma ? bioma.andamento : 1));
    const timbre = ev ? ev.timbre
                      : (bioma ? bioma.timbre : TIMBRES[Math.floor(r() * TIMBRES.length)]);
    const compasso = 16;
    const melodia = [], baixo = [], batida = [];
    for (let i = 0; i < compasso; i++) {
      // melodia: pula alguns tempos para não virar metralhadora de notas
      melodia.push(r() < (chefe ? 0.78 : 0.6)
        ? escala[Math.floor(r() * escala.length)] + (r() < 0.3 ? 12 : 0) : null);
      baixo.push(i % 4 === 0 || (r() < 0.28)
        ? escala[Math.floor(r() * 3)] : null);
      batida.push(i % 4 === 0 ? "bumbo" : (i % 4 === 2 ? "caixa" : (r() < 0.35 ? "chimbal" : null)));
    }
    return { escala, raiz, bpm, timbre, melodia, baixo, batida, chefe, compasso };
  },

  nota(semitons, oitava) {
    return this.plano.raiz * Math.pow(2, semitons / 12) * Math.pow(2, oitava || 0);
  },

  vozes(freq, dur, tipo, vol) {
    if (!AudioSys.ctx || !this.ganho || AudioSys.muted) return;
    const t = AudioSys.ctx.currentTime;
    const osc = AudioSys.ctx.createOscillator();
    const g = AudioSys.ctx.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(this.ganho);
    osc.start(t); osc.stop(t + dur + 0.02);
  },
  percussao(tipo) {
    if (!AudioSys.ctx || !this.ganho || AudioSys.muted) return;
    const t = AudioSys.ctx.currentTime;
    if (tipo === "bumbo") {
      const osc = AudioSys.ctx.createOscillator();
      const g = AudioSys.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.16);
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      osc.connect(g); g.connect(this.ganho);
      osc.start(t); osc.stop(t + 0.22);
      return;
    }
    // caixa e chimbal: ruído curto
    const dur = tipo === "caixa" ? 0.13 : 0.05;
    const n = Math.floor(AudioSys.ctx.sampleRate * dur);
    const buf = AudioSys.ctx.createBuffer(1, n, AudioSys.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = AudioSys.ctx.createBufferSource();
    src.buffer = buf;
    const f = AudioSys.ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = tipo === "caixa" ? 1400 : 6000;
    const g = AudioSys.ctx.createGain();
    g.gain.value = tipo === "caixa" ? 0.22 : 0.09;
    src.connect(f); f.connect(g); g.connect(this.ganho);
    src.start(t);
  },

  tocar(fase, chefe) {
    if (!this.ligada) return;
    AudioSys.resume();
    this.preparar();
    if (!AudioSys.ctx || !this.ganho) return;
    const marca = fase * 2 + (chefe ? 1 : 0);
    if (this.tocando && this.faseAtual === marca) return;
    this.parar();
    this.faseAtual = marca;
    this.plano = this.montar(fase, chefe);
    this.passo = 0;
    this.tocando = true;
    const intervalo = 60000 / this.plano.bpm / 2;    // colcheias
    this.timer = setInterval(() => this.bater(), intervalo);
  },
  bater() {
    if (!this.tocando || AudioSys.muted) return;
    if (S.mode !== "playing") return;               // em pausa, silêncio
    const p = this.plano;
    const i = this.passo % p.compasso;
    const m = p.melodia[i];
    if (m !== null && m !== undefined) {
      this.vozes(this.nota(m, 2), 0.22, p.timbre, p.chefe ? 0.12 : 0.09);
    }
    const b = p.baixo[i];
    if (b !== null && b !== undefined) {
      this.vozes(this.nota(b, 0), 0.3, "triangle", 0.2);
    }
    const d = p.batida[i];
    if (d) this.percussao(d);
    this.passo++;
  },
  parar() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.tocando = false;
    this.faseAtual = -1;
  },
  alternar() {
    this.ligada = !this.ligada;
    storageSet("nn_musica", this.ligada ? "1" : "0");
    if (!this.ligada) this.parar();
    else if (S.mode === "playing") this.tocar(S.fase, isBossFase(S.fase));
    return this.ligada;
  }
};
