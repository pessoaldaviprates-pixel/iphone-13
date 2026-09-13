
/* =====================================================================
   EXPLORAÇÃO ESPACIAL
   ---------------------------------------------------------------------
   Este arquivo é UM MODO do jogo, inteiro e isolado. Ele não é chamado
   por nenhuma outra parte, não mexe em save, fase, menu, loja, nuvem nem
   progressão. Ele desenha na sua própria tela (#screen-cabine) e escuta
   só ela. Sair daqui chama goMenu() e devolve o jogo exatamente como
   estava — o 2D nunca soube que isto existe.

   Por que WebGL escrito à mão: o jogo é um arquivo só que abre offline
   em celular fraco. Uma engine de 600 KB quebraria as duas coisas.

   Nada roda até alguém entrar: contexto, programas e malhas só nascem no
   primeiro exploracaoEntrar().
   ===================================================================== */
let EXPL_PRONTA = false, explLigada = false, explAPI = null;

/* ---------------------------------------------------------------------
   A CHAVE DA EXPLORAÇÃO
   ---------------------------------------------------------------------
   O jogador pediu para GUARDAR este modo enquanto arrumamos o menu --
   guardar, não jogar fora. Então nada foi apagado: o motor 3D, a
   cabine, os controles, o combate e os testes continuam todos aqui.

   Desligada, a linha some do menu (o botão fica display:none e a porta
   já pula o que está escondido) e o 3D nunca é montado, então não custa
   um byte de memória a quem não usa.

   Para religar: troque false por true. É tudo.                        */
const EXPLORACAO_LIGADA = false;


function explMontar() {
  const cv = $("tela3d");
  if (!cv) return null;
  const gl = cv.getContext("webgl2", { antialias: true, alpha: false, powerPreference: "high-performance" });
  if (!gl) return null;
  /* ---------------------------------------------------------------- contas
     Só o que precisa: matriz 4x4, perspectiva e giro em eixo local.     */
  const M = {
    id: () => new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]),
    mul(a, b) {                       // a * b, coluna-maior
      const o = new Float32Array(16);
      for (let c = 0; c < 4; c++) for (let l = 0; l < 4; l++) {
        o[c*4+l] = a[l]*b[c*4] + a[4+l]*b[c*4+1] + a[8+l]*b[c*4+2] + a[12+l]*b[c*4+3];
      }
      return o;
    },
    perspectiva(fov, prop, perto, longe) {
      const f = 1 / Math.tan(fov / 2), d = perto - longe;
      return new Float32Array([f/prop,0,0,0, 0,f,0,0, 0,0,(longe+perto)/d,-1, 0,0,2*longe*perto/d,0]);
    },
    giroX(r){const c=Math.cos(r),s=Math.sin(r);return new Float32Array([1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]);},
    giroY(r){const c=Math.cos(r),s=Math.sin(r);return new Float32Array([c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]);},
    giroZ(r){const c=Math.cos(r),s=Math.sin(r);return new Float32Array([c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1]);},
    mover(x,y,z){const o=M.id();o[12]=x;o[13]=y;o[14]=z;return o;},
    escala(s){const o=M.id();o[0]=o[5]=o[10]=s;return o;},
    /* o giro é ortonormal: a inversa é a transposta. Serve de matriz de
       câmera sem precisar inverter matriz de verdade. */
    transporGiro(m) {
      const o = M.id();
      o[0]=m[0]; o[1]=m[4]; o[2]=m[8];
      o[4]=m[1]; o[5]=m[5]; o[6]=m[9];
      o[8]=m[2]; o[9]=m[6]; o[10]=m[10];
      return o;
    },
    /* somando giros pequenos todo quadro, a matriz vai perdendo a forma e
       a nave começa a entortar sozinha. Isto conserta a cada quadro. */
    reendireitar(m) {
      const n = (a,b,c)=>{const k=Math.hypot(m[a],m[b],m[c])||1;m[a]/=k;m[b]/=k;m[c]/=k;};
      n(0,1,2); n(4,5,6);
      m[8]  = m[1]*m[6] - m[2]*m[5];
      m[9]  = m[2]*m[4] - m[0]*m[6];
      m[10] = m[0]*m[5] - m[1]*m[4];
      n(8,9,10);
    }
  };

  /* ------------------------------------------------------------- programas */
  function compilar(tipo, fonte) {
    const s = gl.createShader(tipo);
    gl.shaderSource(s, fonte); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function programa(vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, compilar(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compilar(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }

  /* Sólidos: luz difusa + uma luz de contorno que separa a nave do preto
     do espaço, e um canal de brilho próprio para o que precisa acender. */
  const progMalha = programa(`#version 300 es
  in vec3 aPos; in vec3 aNorm; in vec3 aCor; in vec2 aExtra;  // x=brilho proprio, y=indice de pisca
  uniform mat4 uVP, uModelo; uniform float uTempo, uAlerta;
  out vec3 vCor; out float vBrilho;
  void main(){
    vec4 mundo = uModelo * vec4(aPos,1.0);
    vec3 n = normalize(mat3(uModelo) * aNorm);
    vec3 luz = normalize(vec3(0.35,0.75,0.45));
    float dif = max(dot(n,luz),0.0);
    vec3 paraOlho = normalize(-mundo.xyz);
    float contorno = pow(1.0 - max(dot(n,paraOlho),0.0), 2.5);
    float b = aExtra.x;
    if (aExtra.y > 0.5) {                       // painel que pisca no seu ritmo
      b *= 0.45 + 0.55 * (0.5 + 0.5*sin(uTempo*(1.6+aExtra.y*0.7) + aExtra.y*2.1));
    }
    /* o indice 6 e a luz de alerta: apagada em voo normal, forte quando o
       casco cai. Quem manda nela e o uAlerta, de fora. */
    if (aExtra.y > 5.5) b *= uAlerta;
    vCor = aCor * (0.30 + 0.85*dif) + vec3(0.30,0.62,0.95)*contorno*0.42;
    vBrilho = b;
    gl_Position = uVP * mundo;
  }`, `#version 300 es
  precision highp float;
  in vec3 vCor; in float vBrilho; out vec4 cor;
  void main(){ cor = vec4(vCor + vCor*vBrilho*2.6, 1.0); }`);

  /* Riscos: poeira do espaço e tiros. Linhas somadas à luz que já está lá. */
  const progRisco = programa(`#version 300 es
  in vec3 aPos; in vec3 aCor; in float aForca;
  uniform mat4 uVP;
  out vec3 vCor; out float vForca;
  void main(){ vCor=aCor; vForca=aForca; gl_Position = uVP * vec4(aPos,1.0); }`,
  `#version 300 es
  precision highp float;
  in vec3 vCor; in float vForca; out vec4 cor;
  void main(){ cor = vec4(vCor*vForca, 1.0); }`);

  /* Fundo: a nebulosa. Um triangulo que cobre a tela e pinta a cor do céu
     conforme a direcao para onde cada pixel olha — sem textura, sem
     arquivo, e custa um desenho so. E o que tira o preto morto de trás. */
  const progFundo = programa(`#version 300 es
  out vec2 vXY;
  void main(){
    vec2 p = vec2((gl_VertexID<<1)&2, gl_VertexID&2);
    vXY = p*2.0-1.0;
    gl_Position = vec4(vXY,0.999,1.0);
  }`, `#version 300 es
  precision highp float;
  in vec2 vXY; out vec4 cor;
  uniform vec3 uDir, uDir2, uCima; uniform float uTan, uProp;
  /* uma mancha macia numa direcao do ceu */
  vec3 mancha(vec3 r, vec3 d, vec3 c, float largura){
    float t = max(dot(r, normalize(d)), 0.0);
    return c * pow(t, largura);
  }
  void main(){
    vec3 r = normalize(uDir + uDir2*(vXY.x*uTan*uProp) + uCima*(vXY.y*uTan));
    /* O espaço é ESCURO com nuvens, não um céu colorido. Numa tentativa
       anterior estas manchas ficaram fortes e largas e lavaram a tela
       inteira: virou um degradê sólido, as naves sumiram dentro dele e
       o preto do espaço acabou. Cor baixa e expoente alto deixam a
       mancha concentrada, dando profundidade sem roubar o fundo. */
    vec3 ceu = vec3(0.008,0.013,0.034);
    ceu += mancha(r, vec3( 0.55, 0.30,-0.78), vec3(0.055,0.135,0.240), 5.0);
    ceu += mancha(r, vec3(-0.70, 0.12,-0.70), vec3(0.130,0.048,0.200), 5.5);
    ceu += mancha(r, vec3( 0.10,-0.65,-0.75), vec3(0.140,0.035,0.095), 6.5);
    ceu += mancha(r, vec3(-0.20, 0.80, 0.55), vec3(0.032,0.090,0.135), 5.2);
    cor = vec4(ceu,1.0);
  }`);
  const uFundo = {
    dir: gl.getUniformLocation(progFundo,"uDir"),
    dir2: gl.getUniformLocation(progFundo,"uDir2"),
    cima: gl.getUniformLocation(progFundo,"uCima"),
    tan: gl.getUniformLocation(progFundo,"uTan"),
    prop: gl.getUniformLocation(progFundo,"uProp")
  };
  const vaoVazio = gl.createVertexArray();

  const uMalha = {
    vp: gl.getUniformLocation(progMalha,"uVP"),
    modelo: gl.getUniformLocation(progMalha,"uModelo"),
    tempo: gl.getUniformLocation(progMalha,"uTempo"),
    alerta: gl.getUniformLocation(progMalha,"uAlerta")
  };
  const uRisco = { vp: gl.getUniformLocation(progRisco,"uVP") };

  /* --------------------------------------------------------------- malhas
     Tudo gerado por código: nenhum arquivo de modelo para baixar.       */
  function Construtor() {
    const pos=[], norm=[], cor=[], extra=[], idx=[];
    return {
      /* um bloco: o tijolo de tudo aqui, do casco ao painel da cabine */
      bloco(cx,cy,cz, lx,ly,lz, c, brilho, pisca) {
        const b = brilho||0, pk = pisca||0;
        const F = [
          [[0,0,1],[[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]]],
          [[0,0,-1],[[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]]],
          [[1,0,0],[[1,-1,1],[1,-1,-1],[1,1,-1],[1,1,1]]],
          [[-1,0,0],[[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1]]],
          [[0,1,0],[[-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1]]],
          [[0,-1,0],[[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1]]]
        ];
        for (const [n,vs] of F) {
          const base = pos.length/3;
          for (const v of vs) {
            pos.push(cx+v[0]*lx, cy+v[1]*ly, cz+v[2]*lz);
            norm.push(n[0],n[1],n[2]); cor.push(c[0],c[1],c[2]); extra.push(b,pk);
          }
          idx.push(base,base+1,base+2, base,base+2,base+3);
        }
        return this;
      },
      /* uma pirâmide deitada: vira bico de nave e ponta de asa */
      bico(cx,cy,cz, comp, larg, alt, c, brilho) {
        const b=brilho||0, base=pos.length/3;
        const p=[[0,0,-comp],[-larg,-alt,0],[larg,-alt,0],[larg,alt,0],[-larg,alt,0]];
        const faces=[[0,1,2],[0,2,3],[0,3,4],[0,4,1],[1,4,3],[1,3,2]];
        for (const f of faces) {
          const a=p[f[0]], d=p[f[1]], e=p[f[2]];
          const u=[d[0]-a[0],d[1]-a[1],d[2]-a[2]], v=[e[0]-a[0],e[1]-a[1],e[2]-a[2]];
          let n=[u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]];
          const k=Math.hypot(n[0],n[1],n[2])||1; n=[n[0]/k,n[1]/k,n[2]/k];
          const bb=pos.length/3;
          for (const q of [a,d,e]) {
            pos.push(cx+q[0], cy+q[1], cz+q[2]);
            norm.push(n[0],n[1],n[2]); cor.push(c[0],c[1],c[2]); extra.push(b,0);
          }
          idx.push(bb,bb+1,bb+2);
        }
        return this;
      },
      pronto() {
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        const mandar = (dados, loc, tam) => {
          const b = gl.createBuffer();
          gl.bindBuffer(gl.ARRAY_BUFFER, b);
          gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(dados), gl.STATIC_DRAW);
          gl.enableVertexAttribArray(loc);
          gl.vertexAttribPointer(loc, tam, gl.FLOAT, false, 0, 0);
        };
        mandar(pos,  gl.getAttribLocation(progMalha,"aPos"),   3);
        mandar(norm, gl.getAttribLocation(progMalha,"aNorm"),  3);
        mandar(cor,  gl.getAttribLocation(progMalha,"aCor"),   3);
        mandar(extra,gl.getAttribLocation(progMalha,"aExtra"), 2);
        const ib = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
        gl.bindVertexArray(null);
        return { vao, n: idx.length };
      }
    };
  }


  /* -------------------------------------------------------------- riscos
     Poeira e tiros são linhas; um buffer só, reescrito a cada quadro.   */
  const riscoVao = gl.createVertexArray();
  const riscoPos = gl.createBuffer(), riscoCor = gl.createBuffer(), riscoForca = gl.createBuffer();
  const MAX_RISCOS = 2600;
  const bufPos = new Float32Array(MAX_RISCOS*6), bufCor = new Float32Array(MAX_RISCOS*6), bufForca = new Float32Array(MAX_RISCOS*2);
  (function () {
    gl.bindVertexArray(riscoVao);
    const liga=(buf,dados,loc,tam)=>{
      gl.bindBuffer(gl.ARRAY_BUFFER,buf);
      gl.bufferData(gl.ARRAY_BUFFER,dados,gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc,tam,gl.FLOAT,false,0,0);
    };
    liga(riscoPos,bufPos,gl.getAttribLocation(progRisco,"aPos"),3);
    liga(riscoCor,bufCor,gl.getAttribLocation(progRisco,"aCor"),3);
    liga(riscoForca,bufForca,gl.getAttribLocation(progRisco,"aForca"),1);
    gl.bindVertexArray(null);
  })();
  let nRiscos = 0;
  function risco(ax,ay,az, bx,by,bz, r,g2,b2, forca) {
    if (nRiscos >= MAX_RISCOS) return;
    const i=nRiscos*6, j=nRiscos*2;
    bufPos[i]=ax;bufPos[i+1]=ay;bufPos[i+2]=az;bufPos[i+3]=bx;bufPos[i+4]=by;bufPos[i+5]=bz;
    bufCor[i]=r;bufCor[i+1]=g2;bufCor[i+2]=b2;bufCor[i+3]=r;bufCor[i+4]=g2;bufCor[i+5]=b2;
    bufForca[j]=forca;bufForca[j+1]=forca*0.25;
    nRiscos++;
  }


  /* ---- esfera: é o que faz planeta, lua e estrela existirem ----
     Uma esfera por paralelos e meridianos. A cor varia por faixa de
     latitude com um ruído barato, o que já dá cara de mundo: continente,
     calota de gelo, mancha de tempestade. Sem textura, sem arquivo. */
  function esfera(cx, cy, cz, raio, cor, brilho, semente, faixas) {
    const NP = faixas || 14, NM = (faixas || 14) * 2;
    const c = Construtor();
    const rnd = (a, b) => {
      const x = Math.sin(a * 12.9898 + b * 78.233 + semente * 3.71) * 43758.5453;
      return x - Math.floor(x);
    };
    const pos = [], norm = [], cores = [], extra = [], idx = [];
    for (let i = 0; i <= NP; i++) {
      const fi = i / NP * Math.PI;
      for (let j = 0; j <= NM; j++) {
        const te = j / NM * Math.PI * 2;
        const x = Math.sin(fi) * Math.cos(te), y = Math.cos(fi), z = Math.sin(fi) * Math.sin(te);
        /* manchas: duas escalas de ruído somadas, uma larga e uma miúda */
        const n = rnd(Math.floor(i / 1.6), Math.floor(j / 1.6)) * 0.7 +
                  rnd(Math.floor(i / 4), Math.floor(j / 4)) * 0.5;
        const gelo = Math.pow(Math.abs(y), 6) * 0.8;          // calotas nos polos
        const k = 0.66 + n * 0.5;
        pos.push(cx + x * raio, cy + y * raio, cz + z * raio);
        norm.push(x, y, z);
        cores.push(Math.min(1, cor[0] * k + gelo), Math.min(1, cor[1] * k + gelo), Math.min(1, cor[2] * k + gelo));
        extra.push(brilho || 0, 0);
      }
    }
    for (let i = 0; i < NP; i++) {
      for (let j = 0; j < NM; j++) {
        const a = i * (NM + 1) + j, b = a + NM + 1;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    return { pos, norm, cores, extra, idx };
  }

  /* junta listas cruas num objeto que a placa entende */
  function malhaDe(d) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const mandar = (dados, loc, tam) => {
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(dados), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, tam, gl.FLOAT, false, 0, 0);
    };
    mandar(d.pos, gl.getAttribLocation(progMalha, "aPos"), 3);
    mandar(d.norm, gl.getAttribLocation(progMalha, "aNorm"), 3);
    mandar(d.cores, gl.getAttribLocation(progMalha, "aCor"), 3);
    mandar(d.extra, gl.getAttribLocation(progMalha, "aExtra"), 2);
    const ib = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(d.idx), gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    return { vao, n: d.idx.length };
  }

  /* ---- as oito caras de planeta ---- */
  const TIPOS = [
    { id: "rochoso",   nome: "Rochoso",    cor: [.42,.38,.34], pousavel: true  },
    { id: "deserto",   nome: "Desértico",  cor: [.72,.55,.30], pousavel: true  },
    { id: "oceano",    nome: "Oceânico",   cor: [.16,.38,.68], pousavel: true  },
    { id: "gelo",      nome: "Congelado",  cor: [.70,.82,.92], pousavel: true  },
    { id: "vulcanico", nome: "Vulcânico",  cor: [.52,.16,.12], pousavel: true,  brilho: .35 },
    { id: "vegetacao", nome: "Com vegetação", cor: [.22,.52,.26], pousavel: true },
    { id: "alien",     nome: "Alienígena", cor: [.44,.20,.56], pousavel: true,  brilho: .2 },
    { id: "tempestade",nome: "Com tempestades", cor: [.55,.50,.40], pousavel: false }
  ];

  /* uma malha de esfera por tipo, reaproveitada por todos os planetas
     daquele tipo -- 40 planetas na tela com 8 malhas, não 40 */
  const MALHA_PLANETA = {};
  for (const t of TIPOS) MALHA_PLANETA[t.id] = malhaDe(esfera(0,0,0, 1, t.cor, t.brilho||0, TIPOS.indexOf(t)+1, 16));
  const MALHA_LUA   = malhaDe(esfera(0,0,0, 1, [.58,.56,.54], 0, 9, 10));
  const MALHA_SOL   = malhaDe(esfera(0,0,0, 1, [1,.82,.45], 2.6, 11, 14));

  /* ------------------------------------------------------------ malhas
     A cabine: três painéis, console, manche, aceleradores. Construída em
     coordenadas de TELA (x e y de -1 a 1 são as bordas), porque em
     paisagem ou em retrato a proporção muda e uma cabine feita em metros
     cairia fora da vista. Cada peça ATRAVESSA a borda de propósito.   */
  const CABINE = (() => {
    const c = Construtor();
    const metal=[.085,.10,.155], quina=[.15,.19,.27], claro=[.26,.32,.45],
          escuro=[.04,.05,.09], borracha=[.06,.07,.10];

    /* ---- console central, embaixo ---- */
    c.bloco(0,-1.30,0.10, 1.85,0.58,0.34, metal, 0);
    c.bloco(0,-0.76,0.18, 1.85,0.045,0.26, quina, 0);
    c.bloco(0,-0.733,0.32, 1.45,0.010,0.02, [.22,.58,.88], 1.4);
    c.bloco(0,-0.88,0.19, 1.30,0.11,0.02, escuro, 0);        // rebaixo dos mostradores

    /* ---- painel esquerdo e direito, inclinados para dentro ---- */
    for (const lado of [-1, 1]) {
      c.bloco(lado*0.96,-0.50,0.20, 0.34,0.34,0.30, metal, 0);
      c.bloco(lado*0.96,-0.20,0.26, 0.32,0.02,0.24, quina, 0);
      c.bloco(lado*0.80,-0.42,0.33, 0.012,0.26,0.012, claro, 0.5);
    }

    /* ---- montantes do vidro ---- */
    c.bloco(-1.10,0.10,0.16, 0.30,1.30,0.26, metal, 0);
    c.bloco( 1.10,0.10,0.16, 0.30,1.30,0.26, metal, 0);
    c.bloco(-0.812,0.10,0.30, 0.024,1.05,0.02, claro, 0.40);
    c.bloco( 0.812,0.10,0.30, 0.024,1.05,0.02, claro, 0.40);
    for (let i = -2; i <= 3; i++) {
      c.bloco(-0.94, i*0.28, 0.26, 0.14,0.016,0.05, quina, 0);
      c.bloco( 0.94, i*0.28, 0.26, 0.14,0.016,0.05, quina, 0);
    }

    /* ---- arco de cima, com o painel de teto ---- */
    c.bloco(0,1.22,0.16, 1.50,0.30,0.26, metal, 0);
    c.bloco(0,0.905,0.30, 1.20,0.016,0.02, claro, 0.45);
    for (let i = -2; i <= 2; i++) {
      c.bloco(i*0.19,0.965,0.28, 0.030,0.012,0.020, [.40,.80,1], 0.9, 2+((i+2)%4));
    }

    /* ---- luzes de alerta (índice 6: só acendem quando algo vai mal) ---- */
    c.bloco( 0.34,-0.755,0.28, 0.034,0.014,0.026, [1,.22,.28], 1.0, 6);
    c.bloco(-0.34,-0.755,0.28, 0.034,0.014,0.026, [1,.22,.28], 1.0, 6);

    /* ---- o descanso de mão e a borda de borracha do console ---- */
    c.bloco(0,-0.815,0.42, 1.45,0.028,0.05, borracha, 0);
    return c.pronto();
  })();

  /* o manche: base no zero, para girar a partir da base como manche gira */
  const MANCHE3D = (() => {
    const c = Construtor();
    const escuro=[.045,.055,.09], quina=[.17,.21,.30], claro=[.30,.36,.50];
    c.bloco(0,0.07,0, 0.32,0.09,0.32, escuro, 0);
    c.bloco(0,0.30,0, 0.13,0.24,0.13, [.10,.12,.18], 0);      // fole
    c.bloco(0,0.62,0, 0.105,0.34,0.105, quina, 0);
    c.bloco(0,1.02,0, 0.25,0.17,0.21, escuro, 0);             // punho
    c.bloco(0,1.15,0.10, 0.085,0.05,0.06, [1,.30,.40], 1.6);  // gatilho
    c.bloco(-0.12,1.12,-0.04, 0.048,0.038,0.048, [.30,.90,1], 1.3, 2);
    c.bloco( 0.12,1.12,-0.04, 0.048,0.038,0.048, [1,.79,.38], 1.3, 3);
    c.bloco(0,1.22,-0.02, 0.07,0.035,0.07, claro, 0.6);       // chapéu de visão
    return c.pronto();
  })();

  /* os aceleradores: duas alavancas que correm para frente conforme a
     potência. Construídas com o pivô na base, iguais ao manche. */
  const ACELERADOR = (() => {
    const c = Construtor();
    const escuro=[.045,.055,.09], laranja=[1,.55,.18];
    c.bloco(0,0.06,0, 0.16,0.07,0.30, escuro, 0);
    c.bloco(0,0.42,0, 0.075,0.36,0.075, [.16,.19,.26], 0);
    c.bloco(0,0.76,0, 0.13,0.11,0.16, escuro, 0);
    c.bloco(0,0.80,0.10, 0.10,0.03,0.03, laranja, 1.3);
    return c.pronto();
  })();

  /* nave alienígena: casco chato, dois braços e um olho aceso no meio */
  const ALIEN = (() => {
    const c = Construtor();
    const casco=[.14,.20,.18], quina=[.26,.40,.34], olho=[.40,1,.55];
    c.bico(0,0,-0.10, 1.30, 0.34, 0.16, quina, 0);
    c.bloco(0,0,0.40, 0.42,0.16,0.52, casco, 0);
    c.bloco(0,0.04,0.14, 0.16,0.10,0.16, olho, 1.9);
    for (const lado of [-1,1]) {
      c.bloco(lado*0.78,0,0.34, 0.40,0.06,0.26, casco, 0);
      c.bloco(lado*1.18,0.02,0.22, 0.10,0.16,0.18, quina, 0);
      c.bloco(lado*0.30,0,0.94, 0.10,0.10,0.08, olho, 1.5);
    }
    return c.pronto();
  })();

  /* estação: um anel de módulos com luzes */
  const ESTACAO = (() => {
    const c = Construtor();
    const casco=[.30,.32,.38], quina=[.46,.48,.56], luz=[.35,.85,1];
    c.bloco(0,0,0, 0.30,1.30,0.30, casco, 0);            // torre central
    for (let i = 0; i < 8; i++) {
      const a = i/8*Math.PI*2, R = 1.5;
      c.bloco(Math.cos(a)*R, 0, Math.sin(a)*R, 0.42,0.24,0.42, casco, 0);
      c.bloco(Math.cos(a)*R, 0.28, Math.sin(a)*R, 0.10,0.05,0.10, luz, 1.6, 1+(i%4));
      c.bloco(Math.cos(a)*R*0.55, 0, Math.sin(a)*R*0.55, 0.34,0.07,0.34, quina, 0);
    }
    c.bloco(0,0.95,0, 0.55,0.16,0.55, quina, 0);
    c.bloco(0,1.12,0, 0.12,0.10,0.12, [1,.35,.35], 1.8, 5);   // farol
    return c.pronto();
  })();

  /* asteroide: um bloco irregular; vários giram em ritmos diferentes */
  const ASTEROIDE = (() => {
    const c = Construtor();
    const pedra=[.30,.27,.24], clara=[.40,.37,.33];
    c.bloco(0,0,0, 0.9,0.75,0.85, pedra, 0);
    c.bloco(0.5,0.3,-0.3, 0.45,0.40,0.42, clara, 0);
    c.bloco(-0.45,-0.3,0.35, 0.38,0.45,0.36, clara, 0);
    c.bloco(0.1,-0.55,0.2, 0.32,0.30,0.30, pedra, 0);
    return c.pronto();
  })();

  /* ------------------------------------------------------------- mundo
     Os sistemas solares são GERADOS por semente, não escritos à mão:
     cada um sempre nasce igual, então o mapa faz sentido entre visitas,
     mas nenhum deles ocupa espaço no arquivo.                         */
  const NOMES = ["Vega","Kepler","Órion","Cygnus","Lyra","Draco","Perseu","Hydra",
                 "Andrômeda","Sirius","Altair","Rigel","Antares","Deneb"];

  function sorte(s) {                    // um sorteio estável, por semente
    let x = s;
    return () => { x = (x * 1664525 + 1013904223) % 4294967296; return x / 4294967296; };
  }

  function gerarSistema(n) {
    const r = sorte(n * 7919 + 13);
    const nome = NOMES[n % NOMES.length] + " " + (Math.floor(n / NOMES.length) + 1);
    const sis = { n, nome, planetas: [], asteroides: [], estacao: null,
                  corEstrela: [1, 0.72 + r()*0.26, 0.30 + r()*0.40],
                  raioEstrela: 60 + r()*45, descoberto: false };
    const quantos = 2 + Math.floor(r() * 5);
    for (let i = 0; i < quantos; i++) {
      const tipo = TIPOS[Math.floor(r() * TIPOS.length)];
      const dist = 380 + i * (300 + r() * 260);
      const ang = r() * Math.PI * 2;
      const raio = 16 + r() * 34;
      const p = {
        tipo, nome: nome + " " + "IVXLC".charAt(i % 5).repeat(1) + (i + 1),
        raio, dist, ang, alt: (r() - 0.5) * 160,
        x:0, y:0, z:0, luas: [], escaneado: false,
        agua: Math.round(r()*100), atmosfera: Math.round(r()*100),
        gravidade: (0.3 + r()*2.2).toFixed(2), temp: Math.round(-180 + r()*420),
        interesse: ["ruínas antigas","minério raro","sinal de rádio","nada de especial",
                    "vida microbiana","campo magnético estranho"][Math.floor(r()*6)]
      };
      const nl = Math.floor(r() * 3);
      for (let j = 0; j < nl; j++) {
        p.luas.push({ raio: raio*(0.15+r()*0.2), dist: raio*(2.2+j*1.3+r()),
                      ang: r()*Math.PI*2, vel: 0.25+r()*0.5, x:0,y:0,z:0 });
      }
      sis.planetas.push(p);
    }
    for (let i = 0; i < 26; i++) {
      sis.asteroides.push({ x:(r()-.5)*2400, y:(r()-.5)*700, z:(r()-.5)*2400,
                            raio: 4+r()*16, giro: r()*6.28, vel: 0.2+r()*0.8 });
    }
    if (r() > 0.35) {
      const a = r()*Math.PI*2, d = 700 + r()*700;
      sis.estacao = { x: Math.cos(a)*d, y: (r()-.5)*120, z: Math.sin(a)*d,
                      nome: "Estação " + nome.split(" ")[0], giro: 0, atracado: false };
    }
    return sis;
  }

  const SISTEMAS = [];
  for (let i = 0; i < 8; i++) SISTEMAS.push(gerarSistema(i));

  /* ---------------------------------------------------------- a nave
     Tudo o que a nave é: o que está ligado, o que está gasto, o que
     está quebrado. Um lugar só, para nada ficar fora de sincronia.   */
  const N = {
    sistemaAtual: 0,
    pos: [0, 0, -1400], ori: M.id(),
    potencia: 0, velocidade: 0, giroX: 0, giroY: 0, giroZ: 0,

    /* ligados: a ordem importa e está na LIGAR_ORDEM */
    ligado: {},
    /* recursos */
    combustivel: 100, energia: 100, escudo: 100, casco: 100,
    oxigenio: 100, temperatura: 22,
    combustivelInfinito: false,

    /* saúde de cada sistema: 100 é inteiro, 0 é morto */
    dano: { motor:100, energia:100, escudos:100, sensores:100,
            comunicacao:100, navegacao:100, casco:100 },

    camera: 0,                  // 0 cabine · 1 frente · 2 trás · 3 lateral
    destino: null, turbo: 0,
    alvo: null, escaneando: 0,
    salto: null,                // a sequência da hiperpropulsão
    pousado: null,
    recados: [],                // o que a tela de comunicação mostra
    tempo: 0, avisos: [], tremor: 0,

    /* combate: os piratas atiravam e não havia como responder. Agora há. */
    tiros: [],                  // riscos de luz, os meus e os deles
    recargaTiro: 0, recargaMissil: 0, abatidas: 0, mega: 0
  };

  /* ------------------------------------------------------- ligar a nave
     Dez passos, em ordem -- mas a ordem é problema DA NAVE, não do
     jogador.

     Na primeira versão cada passo recusava se o anterior não estivesse
     ligado, e dizia "antes de MOTORES, ligue BOMBAS". Dez passos, dez
     recusas: virou adivinhação. Quem abre o modo quer voar, não decorar
     um encadeamento.

     Agora: a nave entra LIGADA, o botão PARTIDA liga ou desliga tudo de
     uma vez, e apertar um passo solto acende sozinho o que ele precisa.
     As chaves continuam existindo para quem gosta do ritual -- o que
     saiu foi o castigo, não o brinquedo.                              */
  const LIGAR_ORDEM = [
    { id:"bateria",       nome:"BATERIA",        precisa:null,           diz:"Bateria ligada. Há energia para acordar o resto." },
    { id:"energia",       nome:"ENERGIA",        precisa:"bateria",      diz:"Barramento energizado." },
    { id:"computadores",  nome:"COMPUTADORES",   precisa:"energia",      diz:"Computadores de bordo acordando." },
    { id:"navegacao",     nome:"NAVEGAÇÃO",      precisa:"computadores", diz:"Navegação pronta: o mapa estelar responde." },
    { id:"combustivel",   nome:"COMBUSTÍVEL",    precisa:"computadores", diz:"Tanques abertos." },
    { id:"bombas",        nome:"BOMBAS",         precisa:"combustivel",  diz:"Bombas pressurizando as linhas." },
    { id:"comunicacao",   nome:"COMUNICAÇÃO",    precisa:"computadores", diz:"Rádio no ar." },
    { id:"motores",       nome:"MOTORES",        precisa:"bombas",       diz:"Motores acesos. Dá para sair daqui." },
    { id:"estabilizadores",nome:"ESTABILIZADORES",precisa:"motores",     diz:"Estabilizadores firmes." },
    { id:"controles",     nome:"CONTROLES",      precisa:"estabilizadores", diz:"Controles liberados. Boa viagem, piloto." }
  ];
  const PASSO = {};
  for (const p of LIGAR_ORDEM) PASSO[p.id] = p;

  function ligarPasso(id, calado) {
    const p = PASSO[id];
    if (!p) return;
    if (N.ligado[id]) {                       // desligar volta atrás em cascata
      for (let i = LIGAR_ORDEM.length - 1; i >= 0; i--) {
        const q = LIGAR_ORDEM[i];
        if (q.id === id || dependeDe(q.id, id)) N.ligado[q.id] = false;
      }
      if (!calado) avisar(p.nome + " desligada.", "aviso");
      return;
    }
    /* o que falta, a nave liga sozinha: ninguém tem que adivinhar que
       MOTORES depende de BOMBAS que dependem de COMBUSTÍVEL */
    if (p.precisa && !N.ligado[p.precisa]) ligarPasso(p.precisa, true);
    N.ligado[id] = true;
    if (!calado) avisar(p.diz, "ok");
    try { AudioSys.gem(); } catch (e) {}
  }

  /* PARTIDA: um toque acende a nave inteira, na ordem certa, e diz uma
     frase só no fim. Dez avisos seguidos ninguém lê -- viram poluição. */
  function ligarTudo(semAlternar) {
    const faltam = LIGAR_ORDEM.filter(p => !N.ligado[p.id]);
    /* O BOTÃO alterna: apertar com tudo ligado desliga. A ENTRADA no
       modo, não: a nave fica ligada entre uma visita e outra, e sem
       este "semAlternar" voltar ao modo DESLIGARIA a nave em vez de
       ligá-la -- o contrário do que a entrada quer. */
    if (!faltam.length) { if (!semAlternar) desligarTudo(); return; }
    for (const p of LIGAR_ORDEM) N.ligado[p.id] = true;
    for (const id of ["radar","sensores","escudo","luz","oxigenio","suporte"]) ligadoCtrl[id] = true;
    avisar("Nave pronta. Boa viagem, piloto.", "ok");
    try { AudioSys.gem(); } catch (e) {}
    pintarControles();
  }
  function desligarTudo() {
    for (const p of LIGAR_ORDEM) N.ligado[p.id] = false;
    for (const c of CONTROLES) if (c.tipo === "chave") ligadoCtrl[c.id] = false;
    N.potencia = 0;
    avisar("Nave desligada.", "aviso");
    pintarControles();
  }
  function dependeDe(quem, de) {
    let p = PASSO[quem];
    while (p && p.precisa) { if (p.precisa === de) return true; p = PASSO[p.precisa]; }
    return false;
  }
  const naveViva = () => N.ligado.controles && N.ligado.motores;

  /* ------------------------------------------------------------ avisos
     Antes ficavam cinco na tela, para sempre, e a maioria era conversa
     fiada: "CÂMERA: cabine", "RADAR ligado", "Freando". Coisa que o
     próprio botão já mostra (o LED acende, a imagem muda) não precisa
     de recado -- só tapa a janela, que é o que tem de bonito aqui.

     Ficou assim: no máximo TRÊS, e cada um vive CINCO SEGUNDOS. Se
     depois de cinco segundos ainda importa, não era aviso, era painel.  */
  const AVISO_VIVE = 5;
  function avisar(texto, tipo) {
    N.avisos.unshift({ texto, tipo: tipo || "aviso", t: N.tempo });
    if (N.avisos.length > 3) N.avisos.pop();
    pintarAvisos();
  }
  /* chamado a cada quadro: tira os vencidos e só repinta quando some um */
  function envelhecerAvisos() {
    const antes = N.avisos.length;
    while (N.avisos.length && N.tempo - N.avisos[N.avisos.length-1].t > AVISO_VIVE) N.avisos.pop();
    if (N.avisos.length !== antes) pintarAvisos();
  }

  /* o módulo fala com o HUD por estas quatro portas; o HUD mora fora
     porque mexe no documento, e aqui dentro é só 3D e estado */
  function pintarControles() { try { explPintarControles(); } catch (e) {} }
  function pintarAvisos()    { try { explPintarAvisos(); } catch (e) {} }
  function pintarPainel()    { try { explPintarPainel(); } catch (e) {} }
  function abrirMapa()       { try { explAbrirMapa(); } catch (e) {} }

  /* ------------------------------------------------------- os controles
     Mais de 40, e cada um faz alguma coisa de verdade: liga, desliga,
     dispara uma sequência ou abre uma tela. Não há botão de enfeite --
     enfeite é a cabine em 3D atrás, que é onde enfeite deve morar.

     A lista é dado, não HTML: o painel se desenha a partir dela, e
     acrescentar um controle aqui já faz o botão existir.              */
  const CONTROLES = [
    /* ---- SISTEMAS (canto inferior esquerdo): dar vida à nave ----
       PARTIDA vem primeiro e ocupa a linha inteira porque é o que 99%
       das vezes se quer: ligar a nave e ir. As dez chaves embaixo são
       para quem gosta de ligar na mão. */
    { id:"ignicao",  rot:"PARTIDA",  ic:"⏻", g:"sis", pag:0, tipo:"botao", grande:true,
      faz:() => ligarTudo() },
    { id:"bateria",  rot:"BATTERY",  ic:"▣", g:"sis", pag:0, tipo:"chave", passo:"bateria" },
    { id:"energia",  rot:"POWER",    ic:"⚡", g:"sis", pag:0, tipo:"chave", passo:"energia" },
    { id:"computadores", rot:"COMPUTER", ic:"▤", g:"sis", pag:0, tipo:"chave", passo:"computadores" },
    { id:"combustivel", rot:"FUEL",  ic:"◧", g:"sis", pag:0, tipo:"chave", passo:"combustivel" },
    { id:"bombas",   rot:"FUEL PUMP",ic:"◍", g:"sis", pag:0, tipo:"chave", passo:"bombas" },
    { id:"motores",  rot:"ENGINE",   ic:"◈", g:"sis", pag:0, tipo:"chave", passo:"motores" },
    { id:"estabilizadores", rot:"STABILIZER", ic:"⊞", g:"sis", pag:0, tipo:"chave", passo:"estabilizadores" },
    { id:"navegacao",rot:"NAV",      ic:"✦", g:"sis", pag:0, tipo:"chave", passo:"navegacao" },
    { id:"comunicacao", rot:"COMMS", ic:"◇", g:"sis", pag:0, tipo:"chave", passo:"comunicacao" },
    { id:"controles",rot:"CONTROLS", ic:"◉", g:"sis", pag:0, tipo:"chave", passo:"controles" },

    /* ---- VOO (centro inferior): o painel mais usado, botões maiores ---- */
    { id:"radar",    rot:"RADAR",    ic:"◉", g:"voo", pag:0, tipo:"chave", precisa:"computadores" },
    { id:"scanner",  rot:"SCANNER",  ic:"⌁", g:"voo", pag:0, tipo:"chave", precisa:"computadores" },
    { id:"sensores", rot:"SENSORS",  ic:"⋈", g:"voo", pag:0, tipo:"chave", precisa:"computadores" },
    { id:"escudo",   rot:"SHIELD",   ic:"⬡", g:"voo", pag:0, tipo:"chave", precisa:"energia" },
    { id:"mapa",     rot:"STAR MAP", ic:"✧", g:"voo", pag:0, tipo:"botao", precisa:"navegacao",
      faz:() => abrirMapa() },
    { id:"hiper",    rot:"HYPERDRIVE", ic:"⟫", g:"voo", pag:0, tipo:"botao", precisa:"navegacao",
      faz:() => comecarSalto() },
    { id:"alvo",     rot:"TARGET",   ic:"⊕", g:"voo", pag:0, tipo:"botao", precisa:"sensores",
      faz:() => { travarAlvo(); } },
    { id:"escanear", rot:"SCAN",     ic:"◎", g:"voo", pag:0, tipo:"botao", precisa:"scanner",
      faz:() => escanearAlvo() },
    { id:"freio",    rot:"BRAKE",    ic:"⊟", g:"voo", pag:0, tipo:"botao", precisa:"motores",
      faz:() => { N.potencia = 0; } },
    { id:"re",       rot:"REVERSE",  ic:"◀", g:"voo", pag:0, tipo:"botao", precisa:"motores",
      faz:() => { N.potencia = -0.35; } },
    { id:"turbo",    rot:"BOOST",    ic:"▶", g:"voo", pag:0, tipo:"botao", precisa:"motores",
      faz:() => { if (gastar(6)) { N.potencia = 1; N.turbo = N.tempo + 4; } } },
    { id:"tiro",     rot:"CANHÃO",   ic:"✦", g:"voo", pag:0, tipo:"botao", precisa:"energia",
      faz:() => atirar(false) },
    { id:"missil",   rot:"MÍSSIL",   ic:"➤", g:"voo", pag:0, tipo:"botao", precisa:"energia",
      faz:() => atirar(true) },
    { id:"mega",     rot:"MEGA BOOST", ic:"⯅", g:"voo", pag:0, tipo:"botao", precisa:"motores",
      faz:() => megaBoost() },
    { id:"atracar",  rot:"DOCK",     ic:"⊡", g:"voo", pag:0, tipo:"botao", precisa:"navegacao",
      faz:() => atracar() },
    { id:"pousar",   rot:"LAND",     ic:"⇩", g:"voo", pag:0, tipo:"botao", grande:true, precisa:"navegacao",
      faz:() => pousar() },

    /* VOO · auxiliar: o que se usa de vez em quando não precisa roubar
       espaço do que se usa sempre */
    { id:"decolar",  rot:"TAKE OFF", ic:"⇧", g:"voo", pag:1, tipo:"botao", grande:true,
      faz:() => decolar() },
    { id:"escudoMais", rot:"SHIELD+", ic:"⬢", g:"voo", pag:1, tipo:"botao", precisa:"escudo",
      faz:() => { N.escudo = Math.min(100, N.escudo + 25); N.energia -= 14; } },
    { id:"carga",    rot:"WARP CHARGE", ic:"◑", g:"voo", pag:1, tipo:"chave", precisa:"navegacao" },
    { id:"piloto",   rot:"AUTOPILOT", ic:"⊛", g:"voo", pag:1, tipo:"chave", precisa:"navegacao" },

    /* ---- NAVE (canto inferior direito) · GERAL ---- */
    { id:"luz",      rot:"CABIN LIGHT", ic:"☀", g:"nave", pag:0, tipo:"chave", precisa:"energia" },
    { id:"oxigenio", rot:"OXYGEN",   ic:"◌", g:"nave", pag:0, tipo:"chave", precisa:"energia" },
    { id:"suporte",  rot:"LIFE SUPP",ic:"♥", g:"nave", pag:0, tipo:"chave", precisa:"energia" },
    { id:"temperatura", rot:"TEMP",  ic:"◭", g:"nave", pag:0, tipo:"chave", precisa:"energia" },
    { id:"gravidade",rot:"GRAVITY",  ic:"⊝", g:"nave", pag:0, tipo:"chave", precisa:"energia" },
    { id:"diagnostico", rot:"DIAGNOSTIC", ic:"⌸", g:"nave", pag:0, tipo:"botao", precisa:"computadores",
      faz:() => diagnosticar() },
    { id:"reparo",   rot:"REPAIR",   ic:"⚒", g:"nave", pag:0, tipo:"botao", precisa:"computadores",
      faz:() => reparar() },
    { id:"emergencia", rot:"EMERGENCY", ic:"✚", g:"nave", pag:0, tipo:"botao", precisa:"bateria",
      faz:() => { N.escudo = Math.min(100, N.escudo + 40); N.oxigenio = 100;
                  avisar("Sistema de emergência: escudo e oxigênio restaurados.", "ok"); } },

    /* NAVE · AVANÇADO */
    { id:"luzEmerg", rot:"EMERG LIGHT", ic:"⚠", g:"nave", pag:1, tipo:"chave", precisa:"bateria" },
    { id:"farol",    rot:"BEACON",   ic:"◈", g:"nave", pag:1, tipo:"chave", precisa:"comunicacao" },
    { id:"transmitir", rot:"TRANSMIT", ic:"◇", g:"nave", pag:1, tipo:"botao", precisa:"comunicacao",
      faz:() => transmitir() },
    { id:"porta",    rot:"DOOR",     ic:"⊓", g:"nave", pag:1, tipo:"chave", precisa:"energia" },
    { id:"cargaPorao", rot:"CARGO",  ic:"▥", g:"nave", pag:1, tipo:"chave", precisa:"energia" },
    { id:"furtivo",  rot:"STEALTH",  ic:"◐", g:"nave", pag:1, tipo:"chave", precisa:"energia" },
    { id:"combate",  rot:"COMBAT",   ic:"⚔", g:"nave", pag:1, tipo:"chave", precisa:"energia" },
    { id:"estado",   rot:"SHIP STATUS", ic:"▦", g:"nave", pag:1, tipo:"botao", precisa:"computadores",
      faz:() => estadoDaNave() },
    { id:"modoComb", rot:"FUEL MODE",ic:"∞", g:"nave", pag:1, tipo:"botao",
      faz:() => { N.combustivelInfinito = !N.combustivelInfinito;
                  avisar("Combustível: " + (N.combustivelInfinito ? "INFINITO" : "NORMAL"), "ok"); } },
    { id:"varreduraGrav", rot:"GRAV SCAN", ic:"⊙", g:"nave", pag:1, tipo:"botao", precisa:"sensores",
      faz:() => { const p = planetaMaisPerto();
                  avisar(p ? ("Gravidade em " + p.nome + ": " + p.gravidade + " g")
                           : "Nada com massa por perto.", "aviso"); } },
    { id:"varreduraPlan", rot:"PLANET SCAN", ic:"◍", g:"nave", pag:1, tipo:"botao", precisa:"scanner",
      faz:() => { const p = planetaMaisPerto(); if (p) { N.alvo = p; escanearAlvo(); }
                  else avisar("Nenhum planeta ao alcance.", "erro"); } },
    { id:"autoPouso",rot:"AUTO LAND",ic:"⇓", g:"nave", pag:1, tipo:"botao", precisa:"navegacao",
      faz:() => { const p = planetaMaisPerto(); if (p) { N.alvo = p; pousar(); } } },

    /* NAVE · CÂMERAS — cada uma tem botão próprio, em vez de um só que
       cicla: ciclar obriga a apertar quatro vezes para voltar */
    { id:"camCabine",rot:"COCKPIT",  ic:"⌂", g:"nave", pag:2, tipo:"botao", grande:true,
      faz:() => { N.camera = 0; } },
    { id:"camFrente",rot:"FRONT",    ic:"▲", g:"nave", pag:2, tipo:"botao", grande:true,
      faz:() => { N.camera = 1; } },
    { id:"camTras",  rot:"REAR",     ic:"▼", g:"nave", pag:2, tipo:"botao", grande:true,
      faz:() => { N.camera = 2; } },
    { id:"camLado",  rot:"SIDE",     ic:"▶", g:"nave", pag:2, tipo:"botao", grande:true,
      faz:() => { N.camera = 3; } },
    { id:"camera",   rot:"NEXT CAM", ic:"🎥", g:"nave", pag:2, tipo:"botao",
      faz:() => { N.camera = (N.camera + 1) % 4; } },
    { id:"cameraExt",rot:"EXT CAM",  ic:"⊙", g:"nave", pag:2, tipo:"botao",
      faz:() => { N.camera = N.camera === 0 ? 1 : 0; } }
  ];

  /* ------------------------------------------------- as ações rápidas
     O que se usa no meio de uma briga não pode estar dentro de uma aba
     de um painel no rodapé: na hora do aperto o dedo não procura, o
     dedo acerta. Estes sete moram num botão só, no canto de cima à
     direita, que abre e fecha -- perto do polegar de quem segura o
     aparelho deitado, e fora do caminho do resto.

     A lista é de IDs: os botões são os MESMOS controles, então nada
     fica com dois comportamentos para manter em sincronia.            */
  const RAPIDOS = ["tiro", "missil", "mega", "turbo", "escudoMais", "alvo", "emergencia"];

  /* as abas de cada painel: nome curto, porque aba comprida vira texto
     cortado justo onde o espaço é apertado */
  const ABAS = {
    sis: ["SISTEMAS"],
    voo: ["PRINCIPAL", "AUXILIAR"],
    nave: ["GERAL", "AVANÇADO", "CÂMERAS"]
  };
  const abaDe = { sis: 0, voo: 0, nave: 0 };

  /* gastar combustível num lugar só: assim o modo INFINITO é uma linha,
     e não um "if" espalhado por dez lugares onde um sempre escapa */
  function gastar(quanto) {
    if (N.combustivelInfinito) return true;
    if (N.combustivel < quanto) { avisar("Combustível insuficiente.", "erro"); return false; }
    N.combustivel -= quanto;
    return true;
  }

  const ligadoCtrl = {};
  function controlePode(c) {
    if (!c.precisa) return true;
    return N.ligado[c.precisa] || ligadoCtrl[c.precisa];
  }
  function apertar(id) {
    const c = CONTROLES.filter(x => x.id === id)[0];
    if (!c) return;
    if (c.passo) { ligarPasso(c.passo); pintarControles(); return; }
    /* Faltou o que este botão precisa? A nave liga sozinha e segue.
       Antes ela recusava e mandava um "ligue SENSORES antes" -- o
       jogador apertava dois botões para fazer uma coisa, e aprendia
       pelo erro uma ordem que a nave já conhecia. */
    if (!controlePode(c)) {
      if (PASSO[c.precisa]) ligarPasso(c.precisa, true);
      else ligadoCtrl[c.precisa] = true;
    }
    if (c.tipo === "chave") {
      /* nada de aviso: o LED do próprio botão acende. Recado para dizer
         o que o botão já mostra é recado a mais. */
      ligadoCtrl[c.id] = !ligadoCtrl[c.id];
    } else if (c.faz) {
      c.faz();
    }
    try { AudioSys.gem(); } catch (e) {}
    pintarControles();
  }

  /* ------------------------------------------------------------- ações */
  const sistema = () => SISTEMAS[N.sistemaAtual];

  function tudoPorPerto() {
    const s = sistema(), lista = [];
    lista.push({ tipo:"estrela", nome:"Estrela de " + s.nome.split(" ")[0],
                 x:0, y:0, z:0, raio:s.raioEstrela, ref:null });
    for (const p of s.planetas) {
      lista.push({ tipo:"planeta", nome:p.nome, x:p.x, y:p.y, z:p.z, raio:p.raio, ref:p });
      for (const l of p.luas) lista.push({ tipo:"lua", nome:"Lua de " + p.nome, x:l.x, y:l.y, z:l.z, raio:l.raio, ref:l });
    }
    if (s.estacao) lista.push({ tipo:"estacao", nome:s.estacao.nome,
                                x:s.estacao.x, y:s.estacao.y, z:s.estacao.z, raio:40, ref:s.estacao });
    for (const a of ALIENS) lista.push({ tipo:"nave", nome:a.nome, x:a.x, y:a.y, z:a.z, raio:8, ref:a });
    for (const a of s.asteroides) lista.push({ tipo:"asteroide", nome:"Asteroide", x:a.x, y:a.y, z:a.z, raio:a.raio, ref:a });
    return lista;
  }
  const distAte = o => Math.hypot(o.x-N.pos[0], o.y-N.pos[1], o.z-N.pos[2]);

  function travarAlvo() {
    const f = frente();
    let melhor = 0.90, achado = null;
    for (const o of tudoPorPerto()) {
      const dx=o.x-N.pos[0], dy=o.y-N.pos[1], dz=o.z-N.pos[2];
      const d = Math.hypot(dx,dy,dz) || 1;
      const alinhado = (dx*f[0]+dy*f[1]+dz*f[2])/d;
      if (alinhado > melhor) { melhor = alinhado; achado = o; }
    }
    N.alvo = achado;
    avisar(achado ? ("Alvo: " + achado.nome + " a " + Math.round(distAte(achado)) + " km")
                  : "Nada na mira para travar.", achado ? "ok" : "erro");
  }

  function escanearAlvo() {
    if (!N.alvo) travarAlvo();                  // um toque, não dois
    if (!N.alvo) return;
    if (N.dano.sensores < 30) { avisar("Sensores avariados demais para escanear.", "erro"); return; }
    N.escaneando = 2.2;
    const o = N.alvo;
    setTimeout(() => {
      if (o.tipo === "planeta" && o.ref) {
        o.ref.escaneado = true;
        avisar(o.nome + " — " + o.ref.tipo.nome + " · " + o.ref.temp + "°C · " +
               o.ref.gravidade + "g · água " + o.ref.agua + "% · " + o.ref.interesse, "ok");
      } else if (o.tipo === "nave") {
        avisar(o.nome + " — " + o.ref.jeito + ". " + o.ref.fala, "ok");
      } else {
        avisar(o.nome + " — " + o.tipo + ", raio " + Math.round(o.raio) + " km.", "ok");
      }
    }, 2200);
  }

  /* -------------------------------------------------------------- armas
     Os piratas atiravam desde a primeira versão e não havia como
     responder: dava para fugir e nada mais. Isso não é tensão, é
     impotência.

     A mira é a própria janela: acerta o que estiver ALINHADO com a
     frente da nave e ao alcance. Nada de pedir "trave o alvo primeiro"
     -- travar é para saber o nome, não para poder atirar.             */
  function alvoNaMira(alcance, precisao) {
    const f = frente();
    let melhor = precisao, achado = null;
    for (const a of ALIENS) {
      const dx=a.x-N.pos[0], dy=a.y-N.pos[1], dz=a.z-N.pos[2];
      const d = Math.hypot(dx,dy,dz) || 1;
      if (d > alcance) continue;
      const alinhado = (dx*f[0]+dy*f[1]+dz*f[2])/d;
      if (alinhado > melhor) { melhor = alinhado; achado = a; }
    }
    return achado;
  }

  /* um risco de luz que anda: o dano já foi resolvido no disparo, isto
     é só o que se vê. Fazer o dano viajar com o risco erraria em
     velocidade alta e o jogador não entenderia por quê. */
  function faisca(de, para, cor, forca) {
    N.tiros.push({ x:de[0], y:de[1], z:de[2],
                   ax:para[0]-de[0], ay:para[1]-de[1], az:para[2]-de[2],
                   t:0, cor, forca: forca || 1 });
    if (N.tiros.length > 40) N.tiros.shift();
  }

  function atirar(forte) {
    const recarga = forte ? "recargaMissil" : "recargaTiro";
    if (N[recarga] > 0) return;
    if (!N.ligado.energia) { avisar("Sem energia: as armas estão mudas.", "erro"); return; }
    const custo = forte ? 16 : 3;
    if (N.energia < custo) { avisar("Energia insuficiente para atirar.", "erro"); return; }
    N.energia -= custo;
    N[recarga] = forte ? 3.4 : 0.28;

    /* o míssil persegue: perdoa uma mira torta, e é por isso que é raro */
    const a = alvoNaMira(forte ? 1600 : 900, forte ? 0.90 : 0.982);
    const f = frente(), dr = direita();
    const boca = [N.pos[0]+dr[0]*3, N.pos[1]+dr[1]*3-1, N.pos[2]+dr[2]*3];
    try { AudioSys.gem(); } catch (e) {}

    if (!a) {
      /* errou: o risco sai reto e se perde no vazio. Ver o tiro passar
         longe ensina a mira melhor que qualquer recado escrito. */
      const longe = 700;
      faisca(boca, [N.pos[0]+f[0]*longe, N.pos[1]+f[1]*longe, N.pos[2]+f[2]*longe],
             forte ? [1,.6,.2] : [.45,1,.75], 0.8);
      return;
    }
    faisca(boca, [a.x,a.y,a.z], forte ? [1,.65,.25] : [.4,1,.8], forte ? 2.2 : 1.4);
    a.vida -= forte ? 58 : 17;
    N.tremor = Math.max(N.tremor, forte ? 0.5 : 0.16);
    if (a.vida <= 0) {
      N.abatidas++;
      avisar(a.nome + " abatida. " + N.abatidas + " no total.", "ok");
      if (N.alvo && N.alvo.ref === a) N.alvo = null;
      for (let i = 0; i < 16; i++) {      // estilhaços
        const r1 = () => (Math.random()-.5)*18;
        faisca([a.x,a.y,a.z], [a.x+r1(),a.y+r1(),a.z+r1()], [1,.7,.3], 1.6);
      }
      ALIENS.splice(ALIENS.indexOf(a), 1);
    }
  }

  /* MEGA BOOST: o turbo normal empurra 2,2x por 4s; este empurra 3,6x
     por 7s e cobra caro. É a carta de fuga quando o casco está indo. */
  function megaBoost() {
    if (!gastar(14)) return;
    N.potencia = 1;
    N.turbo = N.tempo + 7;
    N.mega = N.tempo + 7;
    avisar("MEGA BOOST!", "ok");
    N.tremor = 1;
  }

  const planetaMaisPerto = () => {
    let p = null, md = 1e9;
    for (const q of sistema().planetas) {
      const d = Math.hypot(q.x-N.pos[0], q.y-N.pos[1], q.z-N.pos[2]);
      if (d < md) { md = d; p = q; }
    }
    return md < 900 ? p : null;
  };

  function pousar() {
    const p = (N.alvo && N.alvo.tipo === "planeta") ? N.alvo.ref : planetaMaisPerto();
    if (!p) { avisar("Nenhum planeta perto o bastante.", "erro"); return; }
    if (!p.tipo.pousavel) { avisar(p.nome + " tem tempestades: não dá para pousar.", "erro"); return; }
    const d = Math.hypot(p.x-N.pos[0], p.y-N.pos[1], p.z-N.pos[2]);
    if (d > p.raio * 6) { avisar("Chegue mais perto de " + p.nome + " para pousar.", "erro"); return; }
    if (!gastar(4)) return;
    N.pousado = { planeta: p, t: 0 };
    N.potencia = 0;
    avisar("Pousando em " + p.nome + "…", "ok");
  }
  function decolar() {
    if (!N.pousado && !(sistema().estacao && sistema().estacao.atracado)) {
      avisar("A nave já está voando.", "aviso"); return;
    }
    if (!gastar(4)) return;
    if (N.pousado) { avisar("Decolando de " + N.pousado.planeta.nome + ".", "ok"); N.pousado = null; }
    if (sistema().estacao) sistema().estacao.atracado = false;
    N.potencia = 0.3;
  }
  function atracar() {
    const e = sistema().estacao;
    if (!e) { avisar("Não há estação neste sistema.", "erro"); return; }
    const d = Math.hypot(e.x-N.pos[0], e.y-N.pos[1], e.z-N.pos[2]);
    if (d > 260) { avisar("Aproxime-se da estação (" + Math.round(d) + " km).", "erro"); return; }
    e.atracado = true; N.potencia = 0;
    N.combustivel = 100; N.energia = 100; N.oxigenio = 100;
    for (const k in N.dano) N.dano[k] = Math.min(100, N.dano[k] + 45);
    avisar("Atracado em " + e.nome + ". Tanques cheios e avarias reparadas.", "ok");
  }

  /* ---- hiperpropulsão: DESTINO, CÁLCULO, VERIFICAÇÃO, CARGA, SALTO, CHEGADA ---- */
  const ETAPAS = ["DESTINO", "CÁLCULO", "VERIFICAÇÃO", "CARREGANDO", "SALTO", "CHEGADA"];
  function comecarSalto() {
    if (N.salto) { N.salto = null; avisar("Salto cancelado.", "aviso"); return; }
    if (N.destino == null) { avisar("Escolha um destino no mapa estelar.", "erro"); abrirMapa(); return; }
    if (N.dano.navegacao < 40) { avisar("Navegação avariada: salto negado.", "erro"); return; }
    if (!N.combustivelInfinito && N.combustivel < 25) {
      avisar("Salto precisa de 25% de combustível. Você tem " + Math.round(N.combustivel) + "%.", "erro");
      return;
    }
    N.salto = { etapa: 0, t: 0 };
    avisar("Sequência de salto iniciada.", "ok");
  }
  function passoSalto(dt) {
    if (!N.salto) return;
    const s = N.salto;
    s.t += dt;
    const duracao = [1.0, 1.6, 1.2, 2.6, 1.4, 0.9][s.etapa];
    if (s.t < duracao) return;
    s.t = 0; s.etapa++;
    if (s.etapa === 4) gastar(25);
    if (s.etapa >= ETAPAS.length) {
      N.sistemaAtual = N.destino;
      const s2 = sistema();
      s2.descoberto = true;
      N.pos = [0, 0, -(s2.raioEstrela * 12)];
      N.salto = null; N.destino = null;
      nascerAliens();
      avisar("Chegada: " + s2.nome + ".", "ok");
      return;
    }
    avisar("Salto: " + ETAPAS[s.etapa] + "…", "aviso");
  }

  /* ---- avarias, diagnóstico e reparo ---- */
  const NOME_SIS = { motor:"Motor", energia:"Energia", escudos:"Escudos", sensores:"Sensores",
                     comunicacao:"Comunicação", navegacao:"Navegação", casco:"Casco" };
  function avariar(qual, quanto) {
    N.dano[qual] = Math.max(0, N.dano[qual] - quanto);
    N.tremor = 1;
    avisar("AVARIA em " + NOME_SIS[qual] + " (" + Math.round(N.dano[qual]) + "%)", "erro");
  }
  function diagnosticar() {
    const ruins = Object.keys(N.dano).filter(k => N.dano[k] < 95);
    avisar(ruins.length ? ("Diagnóstico: " + ruins.map(k => NOME_SIS[k] + " " + Math.round(N.dano[k]) + "%").join(" · "))
                        : "Diagnóstico: todos os sistemas inteiros.", ruins.length ? "aviso" : "ok");
  }
  function reparar() {
    const pior = Object.keys(N.dano).sort((a,b) => N.dano[a]-N.dano[b])[0];
    if (N.dano[pior] >= 100) { avisar("Não há nada para reparar.", "aviso"); return; }
    if (N.energia < 12) { avisar("Energia insuficiente para reparar.", "erro"); return; }
    N.energia -= 12;
    N.dano[pior] = Math.min(100, N.dano[pior] + 30);
    avisar(NOME_SIS[pior] + " reparado para " + Math.round(N.dano[pior]) + "%.", "ok");
  }
  function estadoDaNave() {
    avisar("Casco " + Math.round(N.casco) + "% · escudo " + Math.round(N.escudo) +
           "% · energia " + Math.round(N.energia) + "% · combustível " +
           (N.combustivelInfinito ? "∞" : Math.round(N.combustivel) + "%"), "aviso");
  }
  function transmitir() {
    const perto = tudoPorPerto().filter(o => o.tipo === "nave" && distAte(o) < 900);
    if (!perto.length) { avisar("Ninguém responde. Só estática.", "aviso"); return; }
    const a = perto[0].ref;
    avisar(a.nome + ": \u201c" + a.resposta + "\u201d", "ok");
  }

  /* ---- alienígenas ---- */
  const JEITOS = [
    { jeito:"pacífico",    cor:[.35,.85,.55], fala:"Passagem livre, viajante.",   resposta:"Que os ventos solares te levem bem." },
    { jeito:"comerciante", cor:[.95,.75,.30], fala:"Tenho minério e peças.",      resposta:"Atraque comigo e fazemos negócio." },
    { jeito:"explorador",  cor:[.40,.75,1],   fala:"Também estou mapeando isto.", resposta:"Há ruínas no terceiro planeta." },
    { jeito:"pirata",      cor:[1,.30,.35],   fala:"Sua carga ou sua nave.",      resposta:"Tarde demais para conversa." },
    { jeito:"misterioso",  cor:[.75,.45,1],   fala:"…",                            resposta:"Você não deveria estar aqui." }
  ];
  const ALIENS = [];
  function nascerAliens() {
    ALIENS.length = 0;
    const r = sorte(N.sistemaAtual * 313 + 7);
    const quantos = 1 + Math.floor(r() * 3);
    for (let i = 0; i < quantos; i++) {
      const j = JEITOS[Math.floor(r() * JEITOS.length)];
      const a = r() * Math.PI * 2, d = 500 + r() * 900;
      ALIENS.push({
        nome: ["Kri'thul","Vorn","Seliah","Nômade","Ecos"][Math.floor(r()*5)] + "-" + (i+1),
        jeito: j.jeito, cor: j.cor, fala: j.fala, resposta: j.resposta,
        hostil: j.jeito === "pirata",
        x: Math.cos(a)*d, y: (r()-.5)*200, z: Math.sin(a)*d,
        giro: r()*6.28, recarga: 2 + r()*3, falou: false,
        vida: 100
      });
    }
  }
  nascerAliens();

  /* --------------------------------------------------------------- voo */
  function frente() { return [-N.ori[8], -N.ori[9], -N.ori[10]]; }
  function direita(){ return [ N.ori[0],  N.ori[1],  N.ori[2]]; }
  function cima()   { return [ N.ori[4],  N.ori[5],  N.ori[6]]; }

  /* o manche: um dedo em qualquer lugar da metade esquerda; a direita é
     do acelerador. Em PC, o mouse faz o manche e W/S o acelerador. */
  const manche = { ativo:false, id:null, ox:0, oy:0, x:0, y:0 };
  const acel = { ativo:false, id:null, oy:0 };

  function ondeToca(e) { return e.clientX < innerWidth * 0.55 ? "manche" : "acel"; }
  /* Dedo em botão é dedo em botão. Sem isto, apertar CANHÃO (que fica na
     metade direita) também arrastava o acelerador, e a nave acelerava
     sozinha a cada tiro. */
  function emBotao(e) {
    const alvo = e.target;
    return !!(alvo && alvo.closest &&
              alvo.closest("button, .ex-painel, .ex-rapido, .ex-sel, .ex-mapa, .ex-girar"));
  }
  function pegar(e) {
    if (emBotao(e)) return;
    const t = e.changedTouches ? e.changedTouches[0] : e;
    const id = t.identifier != null ? t.identifier : "mouse";
    if (ondeToca(t) === "manche") {
      if (manche.ativo) return;
      manche.ativo = true; manche.id = id;
      manche.ox = t.clientX; manche.oy = t.clientY; manche.x = 0; manche.y = 0;
      const el = $("c3-manche");
      el.style.left = t.clientX + "px"; el.style.top = t.clientY + "px";
      el.classList.add("on");
    } else {
      if (acel.ativo) return;
      acel.ativo = true; acel.id = id; acel.oy = t.clientY;
    }
  }
  function mover(e) {
    const lista = e.changedTouches ? e.changedTouches : [e];
    for (const t of lista) {
      const id = t.identifier != null ? t.identifier : "mouse";
      if (manche.ativo && id === manche.id) {
        let dx = t.clientX - manche.ox, dy = t.clientY - manche.oy;
        const d = Math.hypot(dx,dy), R = 58;
        if (d > R) { dx = dx/d*R; dy = dy/d*R; }
        manche.x = dx/R; manche.y = dy/R;
        $("c3-manche-u").style.transform = "translate(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px)";
      } else if (acel.ativo && id === acel.id) {
        const dy = acel.oy - t.clientY;
        N.potencia = Math.max(-0.4, Math.min(1, N.potencia + dy * 0.004));
        acel.oy = t.clientY;
      }
    }
  }
  function soltar(e) {
    const lista = e && e.changedTouches ? e.changedTouches : [e || {}];
    for (const t of lista) {
      const id = t && t.identifier != null ? t.identifier : "mouse";
      if (manche.ativo && (id === manche.id || !e)) {
        manche.ativo = false; manche.x = 0; manche.y = 0;
        $("c3-manche").classList.remove("on");
        $("c3-manche-u").style.transform = "translate(0,0)";
      }
      if (acel.ativo && (id === acel.id || !e)) acel.ativo = false;
    }
  }
  /* PC: teclado para potência, câmeras e as ações mais usadas */
  function tecla(e) {
    if (!explLigada) return;
    const k = e.key.toLowerCase();
    if (k === "w") N.potencia = Math.min(1, N.potencia + 0.1);
    else if (k === "s") N.potencia = Math.max(-0.4, N.potencia - 0.1);
    else if (k === "x") N.potencia = 0;
    else if (k === "c") apertar("camera");
    else if (k === "t") travarAlvo();
    else if (k === "r") escanearAlvo();
    else if (k === "m") abrirMapa();
    else if (k === "h") comecarSalto();
    else if (k === " ") atirar(false);
    else if (k === "f") atirar(true);
    else if (k === "b") megaBoost();
    else return;
    e.preventDefault();
  }

  function ligarControles() {
    const t = SCREENS.cabine;
    t.addEventListener("touchstart", pegar, {passive:true});
    t.addEventListener("touchmove", mover, {passive:true});
    t.addEventListener("touchend", soltar, {passive:true});
    t.addEventListener("touchcancel", soltar, {passive:true});
    t.addEventListener("mousedown", pegar);
    t.addEventListener("mousemove", mover);
    t.addEventListener("mouseup", soltar);
    addEventListener("keydown", tecla);
  }
  function desligarControles() {
    const t = SCREENS.cabine;
    for (const [n,f] of [["touchstart",pegar],["touchmove",mover],["touchend",soltar],
                         ["touchcancel",soltar],["mousedown",pegar],["mousemove",mover],["mouseup",soltar]]) {
      t.removeEventListener(n, f);
    }
    removeEventListener("keydown", tecla);
    soltar(null);
  }

  /* ------------------------------------------------------------- passo */
  let proximoEvento = 25;
  function passo(dt) {
    N.tempo += dt;
    if (N.salto) { passoSalto(dt); }

    /* os planetas andam nas órbitas, sempre -- o sistema é vivo mesmo
       com a nave desligada, e isso se vê pela janela */
    const s = sistema();
    for (const p of s.planetas) {
      p.ang += dt * (0.02 / (1 + p.dist/900));
      p.x = Math.cos(p.ang) * p.dist; p.z = Math.sin(p.ang) * p.dist; p.y = p.alt;
      for (const l of p.luas) {
        l.ang += dt * l.vel;
        l.x = p.x + Math.cos(l.ang)*l.dist; l.z = p.z + Math.sin(l.ang)*l.dist; l.y = p.y;
      }
    }
    for (const a of s.asteroides) a.giro += dt * a.vel;
    if (s.estacao) s.estacao.giro += dt * 0.12;

    /* pilotar só funciona com os controles liberados: é o que dá sentido
       à sequência de ligar. Antes disso a nave é um objeto parado. */
    const podeVoar = naveViva() && !N.pousado && !(s.estacao && s.estacao.atracado);
    if (podeVoar) {
      const perdaEstab = N.dano.motor < 50 ? 1.5 : 1;    // motor avariado puxa a nave
      const alvoX = -manche.y * 0.95, alvoY = -manche.x * 0.95, alvoZ = -manche.x * 0.7;
      const suave = 1 - Math.pow(0.0015, dt);
      N.giroX += (alvoX - N.giroX) * suave;
      N.giroY += (alvoY - N.giroY) * suave;
      N.giroZ += (alvoZ - N.giroZ) * suave;
      N.ori = M.mul(N.ori, M.giroX(N.giroX*dt*perdaEstab));
      N.ori = M.mul(N.ori, M.giroY(N.giroY*dt*perdaEstab));
      N.ori = M.mul(N.ori, M.giroZ(N.giroZ*dt));
      M.reendireitar(N.ori);

      const forca = (N.dano.motor/100) *
                    (N.mega && N.tempo < N.mega ? 3.6 : (N.turbo && N.tempo < N.turbo ? 2.2 : 1));
      const alvoVel = N.potencia * 240 * forca;
      N.velocidade += (alvoVel - N.velocidade) * (1 - Math.pow(0.08, dt));
      const f = frente();
      N.pos[0]+=f[0]*N.velocidade*dt; N.pos[1]+=f[1]*N.velocidade*dt; N.pos[2]+=f[2]*N.velocidade*dt;

      if (Math.abs(N.potencia) > 0.02) gastarPoucoAPouco(dt);
    } else {
      N.velocidade += (0 - N.velocidade) * (1 - Math.pow(0.2, dt));
    }

    /* energia, oxigênio e temperatura: cada sistema ligado cobra */
    let consumo = 0;
    for (const c of CONTROLES) if (c.tipo === "chave" && ligadoCtrl[c.id]) consumo += 0.35;
    for (const id in N.ligado) if (N.ligado[id]) consumo += 0.25;
    N.energia = Math.max(0, N.energia - consumo * dt * 0.28);
    if (N.energia <= 0 && N.ligado.bateria) { N.ligado.energia = false; }
    if (ligadoCtrl.oxigenio) N.oxigenio = Math.min(100, N.oxigenio + dt*3);
    else N.oxigenio = Math.max(0, N.oxigenio - dt*0.35);
    const alvoTemp = ligadoCtrl.temperatura ? 22 : (N.velocidade > 150 ? 68 : 6);
    N.temperatura += (alvoTemp - N.temperatura) * dt * 0.25;
    if (ligadoCtrl.escudo) N.escudo = Math.min(100, N.escudo + dt*1.4);

    /* pouso: uma descida curta, não um corte seco */
    if (N.pousado) { N.pousado.t = Math.min(1, N.pousado.t + dt*0.5); }

    if (N.recargaTiro > 0) N.recargaTiro -= dt;
    if (N.recargaMissil > 0) N.recargaMissil -= dt;
    /* os riscos de tiro vivem meio segundo: passado isso, saem da lista */
    for (const t of N.tiros) t.t += dt;
    while (N.tiros.length && N.tiros[0].t > 0.5) N.tiros.shift();

    /* alienígenas */
    for (const a of ALIENS) {
      let dx=N.pos[0]-a.x, dy=N.pos[1]-a.y, dz=N.pos[2]-a.z;
      const d = Math.hypot(dx,dy,dz)||1;
      a.giro += dt*0.5;
      const v = a.hostil ? (d > 60 ? 34 : -20) : (d < 400 ? -14 : 6);
      a.x += dx/d*v*dt; a.y += dy/d*v*dt; a.z += dz/d*v*dt;
      if (!a.falou && d < 700 && ligadoCtrl.sensores) {
        a.falou = true;
        avisar(a.nome + " (" + a.jeito + "): \u201c" + a.fala + "\u201d", a.hostil ? "erro" : "aviso");
      }
      if (a.hostil && d < 300) {
        a.recarga -= dt;
        if (a.recarga <= 0) {
          a.recarga = 3 + Math.random()*2;
          faisca([a.x,a.y,a.z], N.pos, [1,.28,.45], 1.6);
          if (ligadoCtrl.escudo && N.escudo > 0) { N.escudo = Math.max(0, N.escudo - 9); }
          else { N.casco = Math.max(0, N.casco - 6);
                 avariar(["motor","sensores","escudos","energia"][Math.floor(Math.random()*4)], 12); }
          N.tremor = 1;
          piscarDano();
        }
      }
    }

    /* acontecimentos: o espaço não fica só esperando você */
    proximoEvento -= dt;
    if (proximoEvento <= 0) { proximoEvento = 40 + Math.random()*50; acontecer(); }

    N.tremor = Math.max(0, N.tremor - dt*3);
    if (N.escaneando > 0) N.escaneando -= dt;
    envelhecerAvisos();
    pintarPainel();
  }

  function gastarPoucoAPouco(dt) {
    if (N.combustivelInfinito) return;
    N.combustivel = Math.max(0, N.combustivel - Math.abs(N.potencia)*dt*0.55);
    if (N.combustivel <= 0 && N.ligado.motores) {
      N.ligado.motores = false; N.ligado.estabilizadores = false; N.ligado.controles = false;
      avisar("COMBUSTÍVEL ACABOU. Motores apagaram.", "erro");
      pintarControles();
    }
  }

  const ACONTECIMENTOS = [
    () => { avisar("Tempestade solar: sensores embaralhados.", "erro"); avariar("sensores", 25); },
    () => { avisar("Chuva de micrometeoros!", "erro");
            if (ligadoCtrl.escudo) N.escudo = Math.max(0, N.escudo-18); else avariar("casco", 14); },
    () => { avisar("Sinal misterioso em frequência desconhecida.", "aviso"); },
    () => { avisar("Destroços de uma nave antiga à deriva.", "aviso"); },
    () => { avisar("Campo gravitacional puxando a nave.", "erro"); N.tremor = 1; },
    () => { avisar("Anomalia detectada: a leitura não faz sentido.", "aviso"); },
    () => { avisar("Sobrecarga no barramento.", "erro"); avariar("energia", 20); N.energia = Math.max(0, N.energia-15); },
    () => { avisar("Nave abandonada: peças aproveitáveis.", "ok");
            for (const k in N.dano) N.dano[k] = Math.min(100, N.dano[k]+10); }
  ];
  function acontecer() { ACONTECIMENTOS[Math.floor(Math.random()*ACONTECIMENTOS.length)](); }

  function piscarDano() {
    const d = $("c3-dano");
    if (!d) return;
    d.classList.add("on");
    setTimeout(() => d.classList.remove("on"), 110);
  }

  /* ------------------------------------------------------------ desenho */
  let larg = 0, alt = 0;
  function medir() {
    const r = Math.min(devicePixelRatio || 1, 2);   // acima de 2 só esquenta o aparelho
    larg = Math.floor(innerWidth*r); alt = Math.floor(innerHeight*r);
    cv.width = larg; cv.height = alt;
  }

  function desenhar() {
    gl.viewport(0,0,larg,alt);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.BLEND);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const FOV = 1.20, TAN = Math.tan(FOV/2), PROP = larg/alt;
    const proj = M.perspectiva(FOV, PROP, 0.5, 90000);
    const f = frente(), d = direita(), c = cima();

    /* ---- câmeras: a de cabine é a nave; as outras afastam e viram ---- */
    let camGiro = M.transporGiro(N.ori), olho = [N.pos[0], N.pos[1], N.pos[2]];
    const recuar = (vx,vy,vz,k) => { olho = [olho[0]+vx*k, olho[1]+vy*k, olho[2]+vz*k]; };
    if (N.camera === 1) recuar(f[0],f[1],f[2], 26);                       // frontal externa
    else if (N.camera === 2) {                                            // traseira
      recuar(f[0],f[1],f[2], -40); recuar(c[0],c[1],c[2], 8);
      camGiro = M.transporGiro(M.mul(N.ori, M.giroY(Math.PI)));
    } else if (N.camera === 3) {                                          // lateral
      recuar(d[0],d[1],d[2], 34); recuar(c[0],c[1],c[2], 6);
      camGiro = M.transporGiro(M.mul(N.ori, M.giroY(-Math.PI/2)));
    }
    const tr = N.tremor*0.010;
    const sacode = M.mul(M.giroX((Math.random()-.5)*tr), M.giroY((Math.random()-.5)*tr));
    const cam = M.mul(camGiro, M.mover(-olho[0],-olho[1],-olho[2]));
    const VP = M.mul(M.mul(proj, sacode), cam);

    /* ---- o céu ---- */
    gl.useProgram(progFundo);
    gl.uniform3f(uFundo.dir, f[0],f[1],f[2]);
    gl.uniform3f(uFundo.dir2, d[0],d[1],d[2]);
    gl.uniform3f(uFundo.cima, c[0],c[1],c[2]);
    gl.uniform1f(uFundo.tan, TAN);
    gl.uniform1f(uFundo.prop, PROP);
    gl.bindVertexArray(vaoVazio);
    gl.depthMask(false); gl.drawArrays(gl.TRIANGLES,0,3); gl.depthMask(true);

    /* ---- estrelas de fundo ---- */
    nRiscos = 0;
    for (const e of estrelas) risco(e.x,e.y,e.z, e.x*1.002,e.y*1.002,e.z*1.002, e.f,e.f*0.95,1, e.f);
    despejar(M.mul(M.mul(proj,sacode), camGiro));

    /* ---- o sistema solar ---- */
    const s = sistema();
    gl.useProgram(progMalha);
    gl.uniformMatrix4fv(uMalha.vp,false,VP);
    gl.uniform1f(uMalha.tempo,N.tempo);
    gl.uniform1f(uMalha.alerta, 0);

    const por = (malha, x,y,z, r, giroY) => {
      let mo = M.mover(x,y,z);
      if (giroY) mo = M.mul(mo, M.giroY(giroY));
      mo = M.mul(mo, M.escala(r));
      gl.uniformMatrix4fv(uMalha.modelo,false,mo);
      gl.bindVertexArray(malha.vao);
      gl.drawElements(gl.TRIANGLES,malha.n,gl.UNSIGNED_SHORT,0);
    };

    por(MALHA_SOL, 0,0,0, s.raioEstrela, N.tempo*0.02);
    for (const p of s.planetas) {
      por(MALHA_PLANETA[p.tipo.id], p.x,p.y,p.z, p.raio, N.tempo*0.05);
      for (const l of p.luas) por(MALHA_LUA, l.x,l.y,l.z, l.raio, N.tempo*0.1);
    }
    for (const a of s.asteroides) por(ASTEROIDE, a.x,a.y,a.z, a.raio, a.giro);
    if (s.estacao) por(ESTACAO, s.estacao.x,s.estacao.y,s.estacao.z, 26, s.estacao.giro);
    for (const a of ALIENS) {
      let dx=N.pos[0]-a.x, dy=N.pos[1]-a.y, dz=N.pos[2]-a.z;
      const dd=Math.hypot(dx,dy,dz)||1;
      let mo = M.mul(M.mover(a.x,a.y,a.z), M.giroY(Math.atan2(dx/dd, dz/dd)));
      mo = M.mul(mo, M.giroZ(Math.sin(a.giro)*0.2));
      mo = M.mul(mo, M.escala(7));
      gl.uniformMatrix4fv(uMalha.modelo,false,mo);
      gl.bindVertexArray(ALIEN.vao);
      gl.drawElements(gl.TRIANGLES,ALIEN.n,gl.UNSIGNED_SHORT,0);
    }

    /* ---- poeira: é o que dá noção de velocidade no vazio ---- */
    nRiscos = 0;
    const risca = Math.abs(N.velocidade)*0.06 + 0.4;
    for (const p of poeira) {
      let dx=p.x-N.pos[0], dy=p.y-N.pos[1], dz=p.z-N.pos[2];
      if (Math.hypot(dx,dy,dz) > 90) {
        const dist = 45+Math.random()*45, lx=(Math.random()-.5)*120, ly=(Math.random()-.5)*120;
        p.x = N.pos[0]+f[0]*dist+d[0]*lx+c[0]*ly;
        p.y = N.pos[1]+f[1]*dist+d[1]*lx+c[1]*ly;
        p.z = N.pos[2]+f[2]*dist+d[2]*lx+c[2]*ly;
      }
      risco(p.x,p.y,p.z, p.x-f[0]*risca, p.y-f[1]*risca, p.z-f[2]*risca, 0.40,0.62,0.92, 0.5);
    }
    /* os tiros: riscos grossos que somem em meio segundo */
    for (const t of N.tiros) {
      const k = 1 - t.t/0.5;
      risco(t.x, t.y, t.z, t.x+t.ax, t.y+t.ay, t.z+t.az,
            t.cor[0], t.cor[1], t.cor[2], t.forca*k);
    }

    /* no salto, as estrelas se esticam: é o efeito que diz "isto é rápido" */
    if (N.salto && N.salto.etapa >= 4) {
      for (const e of estrelas) {
        const k = 0.04 + N.salto.t*0.35;
        risco(e.x,e.y,e.z, e.x*(1-k), e.y*(1-k), e.z*(1-k), 0.6,0.85,1, 1.2);
      }
    }
    /* alvo travado: quatro cantos em volta */
    if (N.alvo) {
      const o = N.alvo, T = Math.max(o.raio*1.4, 14);
      for (const [sx,sy] of [[-1,-1],[1,-1],[1,1],[-1,1]]) {
        const px=o.x+d[0]*T*sx+c[0]*T*sy, py=o.y+d[1]*T*sx+c[1]*T*sy, pz=o.z+d[2]*T*sx+c[2]*T*sy;
        risco(px,py,pz, px-d[0]*T*sx*0.4, py-d[1]*T*sx*0.4, pz-d[2]*T*sx*0.4, 0.35,1,0.7, 1.1);
        risco(px,py,pz, px-c[0]*T*sy*0.4, py-c[1]*T*sy*0.4, pz-c[2]*T*sy*0.4, 0.35,1,0.7, 1.1);
      }
    }
    despejar(VP);

    /* ---- a cabine: só na câmera de dentro ---- */
    if (N.camera !== 0) return;
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.useProgram(progMalha);
    const balanco = M.mul(M.giroZ(N.giroZ*0.05), M.giroX(N.giroX*0.035));
    gl.uniformMatrix4fv(uMalha.vp,false,M.mul(M.mul(proj,sacode),balanco));
    gl.uniform1f(uMalha.tempo,N.tempo);
    /* a luz de alerta acende sozinha quando algo está ruim de verdade */
    const ruim = N.casco < 45 || N.escudo < 20 || N.energia < 15 ||
                 Object.keys(N.dano).some(k => N.dano[k] < 45);
    gl.uniform1f(uMalha.alerta, ruim ? 2.2 : 0);

    const D = 1.0, sx2 = TAN*PROP*D, sy2 = TAN*D;
    const molde = M.mul(M.mover(0,0,-D), new Float32Array([sx2,0,0,0, 0,sy2,0,0, 0,0,0.42,0, 0,0,0,1]));
    gl.uniformMatrix4fv(uMalha.modelo,false,molde);
    gl.bindVertexArray(CABINE.vao);
    gl.drawElements(gl.TRIANGLES,CABINE.n,gl.UNSIGNED_SHORT,0);

    /* manche e aceleradores: escala IGUAL nos três eixos, senão a escala
       esticada da cabine entortaria a peça girada */
    /* O manche e os aceleradores são postos nos VÃOS entre os painéis do
       HUD, não atrás deles: controle físico escondido debaixo de menu é
       a mesma coisa que não existir. Os vãos ficam em ±30% da largura,
       que é onde os painéis não chegam. */
    /* Grandes o bastante para aparecerem DE VERDADE nos vãos entre os
       painéis. Na primeira tentativa eles cabiam no vão mas eram tão
       pequenos que ninguém via -- controle físico que não se vê é a
       mesma coisa que não existir. */
    const tam = sy2*0.30;
    let mm = M.mover(-sx2*0.30, -sy2*1.06, -D + 0.21);
    mm = M.mul(mm, M.giroX(-manche.y*0.40));
    mm = M.mul(mm, M.giroZ(-manche.x*0.40));
    mm = M.mul(mm, M.escala(tam));
    gl.uniformMatrix4fv(uMalha.modelo,false,mm);
    gl.bindVertexArray(MANCHE3D.vao);
    gl.drawElements(gl.TRIANGLES,MANCHE3D.n,gl.UNSIGNED_SHORT,0);

    /* os dois aceleradores correm para a frente conforme a potência */
    for (const lado of [0, 1]) {
      let ma = M.mover(sx2*(0.27 + lado*0.085), -sy2*1.06, -D + 0.21);
      ma = M.mul(ma, M.giroX(-0.55 + N.potencia*0.85));
      ma = M.mul(ma, M.escala(tam*0.72));
      gl.uniformMatrix4fv(uMalha.modelo,false,ma);
      gl.bindVertexArray(ACELERADOR.vao);
      gl.drawElements(gl.TRIANGLES,ACELERADOR.n,gl.UNSIGNED_SHORT,0);
    }
    gl.bindVertexArray(null);
  }

  function despejar(vp) {
    gl.useProgram(progRisco);
    gl.uniformMatrix4fv(uRisco.vp,false,vp);
    gl.bindVertexArray(riscoVao);
    gl.bindBuffer(gl.ARRAY_BUFFER,riscoPos); gl.bufferSubData(gl.ARRAY_BUFFER,0,bufPos,0,nRiscos*6);
    gl.bindBuffer(gl.ARRAY_BUFFER,riscoCor); gl.bufferSubData(gl.ARRAY_BUFFER,0,bufCor,0,nRiscos*6);
    gl.bindBuffer(gl.ARRAY_BUFFER,riscoForca); gl.bufferSubData(gl.ARRAY_BUFFER,0,bufForca,0,nRiscos*2);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE); gl.depthMask(false);
    gl.drawArrays(gl.LINES,0,nRiscos*2);
    gl.depthMask(true); gl.disable(gl.BLEND);
    nRiscos = 0;
  }

  const poeira = [], estrelas = [];
  for (let i = 0; i < 420; i++) poeira.push({ x:(Math.random()-.5)*160, y:(Math.random()-.5)*160, z:(Math.random()-.5)*160 });
  for (let i = 0; i < 420; i++) {
    const a = Math.random()*Math.PI*2, b2 = Math.acos(2*Math.random()-1), r = 40000;
    estrelas.push({ x:r*Math.sin(b2)*Math.cos(a), y:r*Math.cos(b2), z:r*Math.sin(b2)*Math.sin(a),
                    f: 0.25+Math.random()*0.75 });
  }

  return { passo, desenhar, medir, ligar: ligarControles, desligar: desligarControles,
           N, CONTROLES, apertar, ligarPasso, SISTEMAS, sistema, travarAlvo, manche, ALIENS,
           atirar, ligarTudo, megaBoost, RAPIDOS,
           /* a mira acende quando o tiro VAI acertar: sem isto o jogador
              atira no vazio e não entende por que não acontece nada */
           miraQuente: () => !!alvoNaMira(900, 0.982),
           ligadosCtrl: ligadoCtrl, ABAS, abaDe,
           trocarAba: (g, i) => { abaDe[g] = i; pintarControles(); } };
}

/* =====================================================================
   O QUE FICA POR CIMA DO VIDRO
   Os controles são botões do documento, não geometria: dedo em botão de
   3 milímetros desenhado em 3D não acerta nunca. A cabine em 3D atrás é
   que dá a sensação de estar dentro; estes botões é que se usam.
   ===================================================================== */
/* ---------------------------------------------------------------------
   OS PAINÉIS SE MEDEM
   ---------------------------------------------------------------------
   A regra é: botão grande e espaçado sempre; quem cede é a QUANTIDADE
   visível, nunca o tamanho. Então aqui a altura disponível decide quantas
   linhas cabem, e o que sobra vira página, com um passador ‹ 1/2 ›.

   O limite de 42% da altura não é estética: acima disso os painéis comem
   a janela e o modo deixa de ser uma cabine para virar um controle
   remoto com um vídeo ao fundo.                                       */
const EX_PAGINA = {};                       // painel -> página dentro da aba
/* painel recolhido: fica só a barrinha com o nome e a setinha. A cabine
   em 3D é o que este modo tem de bonito, e painel que não se pode fechar
   é cortina pregada na janela. */
const EX_FECHADO = { sis:false, voo:false, nave:false };

function explPintarControles() {
  if (!explAPI) return;
  const A = explAPI;
  const caixas = { sis: $("c3-pesq"), voo: $("c3-pcen"), nave: $("c3-pdir") };
  const baixo = innerHeight < 460;
  const alturaBt = baixo ? 34 : 44;
  /* 36% da altura para os três painéis JUNTOS com as abas e o passador.
     Acima disso eles comem a janela e o modo deixa de ser uma cabine.
     O desconto de 58px é o que abas + passador + recheio ocupam. */
  const sobra = Math.min(innerHeight * 0.36, 230) - 58 - 20;   // -20: a barra da setinha
  const linhas = Math.max(2, Math.floor((sobra + 6) / (alturaBt + 6)));

  for (const g in caixas) {
    const cx = caixas[g];
    if (!cx) continue;
    const abas = A.ABAS[g], ativa = A.abaDe[g];
    /* A CLASSE SAI ANTES DA MEDIDA.
       Fechado o painel é "width:auto" -- estreito. Se a medida vier
       antes de tirar a classe, ele se mede fechado e reabre com uma
       coluna a menos: dois botões desaparecem no caminho de volta.
       Foi o que aconteceu, e o teste pegou. */
    const fechado = !!EX_FECHADO[g];
    cx.classList.toggle("fechado", fechado);
    /* as colunas saem da LARGURA do painel: cada botão precisa de uns
       66px para o rótulo não cortar. Em tela larga cabem três, em tela
       estreita duas -- e o botão nunca encolhe para caber mais um. */
    const largPainel = cx.clientWidth || 180;
    const colunas = g === "voo" ? 3 : Math.max(2, Math.min(3, Math.floor(largPainel / 66)));
    const porPag = linhas * colunas;

    const todos = A.CONTROLES.filter(c => c.g === g && (c.pag || 0) === ativa);
    /* o botão largo ocupa a linha inteira: conta como a linha toda */
    const paginas = [];
    let atual = [], peso = 0;
    for (const c of todos) {
      const custo = c.grande ? colunas : 1;
      if (peso + custo > porPag && atual.length) { paginas.push(atual); atual = []; peso = 0; }
      atual.push(c); peso += custo;
    }
    if (atual.length) paginas.push(atual);

    const chave = g + ":" + ativa;
    let pag = EX_PAGINA[chave] || 0;
    if (pag >= paginas.length) pag = EX_PAGINA[chave] = 0;

    /* a setinha vive numa barra própria com o nome do painel: assim ela
       existe igual nos três, aberta ou fechada, e fica sempre no mesmo
       lugar -- botão que muda de lugar o dedo não decora */
    const NOMES_G = { sis:"SISTEMAS", voo:"VOO", nave:"NAVE" };
    const barra = '<div class="ex-barra"><b>' + NOMES_G[g] + "</b>" +
      '<button class="ex-fecha" data-fecha="' + g + '" aria-label="' +
      (fechado ? "Abrir" : "Fechar") + ' painel ' + NOMES_G[g] + '">' +
      (fechado ? "▴" : "▾") + "</button></div>";

    if (fechado) {
      cx.innerHTML = barra;
      cx.querySelectorAll("[data-fecha]").forEach(b =>
        b.addEventListener("click", () => {
          EX_FECHADO[b.getAttribute("data-fecha")] = false;
          explPintarControles();
        }));
      continue;
    }

    const filaAbas = abas.length > 1
      ? '<div class="ex-abas">' + abas.map((nome, k) =>
          '<button class="ex-aba' + (k === ativa ? " on" : "") + '" data-aba="' + g + ":" + k + '">' +
          escaparTexto(nome) + "</button>").join("") + "</div>"
      : '<div class="ex-painel-h">' + escaparTexto(abas[0]) + "</div>";

    const passador = paginas.length > 1
      ? '<div class="ex-pag"><button class="ex-pag-b" data-pag="' + chave + ":-1" + '">‹</button>' +
        "<u>" + (pag+1) + "/" + paginas.length + "</u>" +
        '<button class="ex-pag-b" data-pag="' + chave + ":1" + '">›</button></div>'
      : "";

    cx.innerHTML = barra + filaAbas + '<div class="ex-bts" style="grid-template-columns:repeat(' +
      colunas + ',1fr)">' + (paginas[pag] || []).map(c => {
      const ligado = c.passo ? !!A.N.ligado[c.passo] : !!A.ligadosCtrl[c.id];
      const pode = !c.precisa || !!A.N.ligado[c.precisa] || !!A.ligadosCtrl[c.precisa];
      return '<button class="ex-bt' + (ligado ? " on" : "") + (pode ? "" : " travado") +
        (c.tipo === "botao" ? " acao" : "") + (c.grande ? " grande" : "") +
        '" style="min-height:' + alturaBt + 'px" data-ctrl="' + c.id + '">' +
        '<b class="ex-ic">' + c.ic + "</b>" +
        '<span>' + escaparTexto(c.rot) + "</span>" +
        '<i class="ex-led"></i></button>';
    }).join("") + "</div>" + passador;

    cx.querySelectorAll("[data-fecha]").forEach(b =>
      b.addEventListener("click", () => {
        EX_FECHADO[b.getAttribute("data-fecha")] = true;
        explPintarControles();
      }));
    cx.querySelectorAll("[data-ctrl]").forEach(b =>
      b.addEventListener("click", () => A.apertar(b.getAttribute("data-ctrl"))));
    cx.querySelectorAll("[data-aba]").forEach(b =>
      b.addEventListener("click", () => {
        const [gg, k] = b.getAttribute("data-aba").split(":");
        EX_PAGINA[gg + ":" + k] = 0;
        A.trocarAba(gg, parseInt(k, 10));
      }));
    cx.querySelectorAll("[data-pag]").forEach(b =>
      b.addEventListener("click", () => {
        const partes = b.getAttribute("data-pag").split(":");
        const ch = partes[0] + ":" + partes[1], passo = parseInt(partes[2], 10);
        const quantas = paginas.length;
        EX_PAGINA[ch] = ((EX_PAGINA[ch] || 0) + passo + quantas) % quantas;
        explPintarControles();
      }));
  }
}

/* ---------------------------------------------------------------------
   AS AÇÕES RÁPIDAS
   ---------------------------------------------------------------------
   Canhão, míssil, mega boost, turbo, escudo, alvo e emergência: é o que
   se aperta no meio de uma briga. Estavam espalhados em abas de painéis
   no rodapé, e no aperto ninguém acha.

   Agora moram num botão pequeno no canto de cima à direita: fechado é
   um raio, aberto é uma coluna de sete botões grandes. Fica aberto até
   o jogador fechar -- fechar sozinho depois de cada tiro seria pior que
   não ter.                                                             */
let EX_RAPIDO_ABERTO = false;
function explPintarRapido() {
  const cx = $("c3-rapido-cx"), bt = $("c3-rapido-b");
  if (!cx || !bt || !explAPI) return;
  const A = explAPI;
  cx.classList.toggle("on", EX_RAPIDO_ABERTO);
  bt.classList.toggle("on", EX_RAPIDO_ABERTO);
  bt.textContent = EX_RAPIDO_ABERTO ? "✕" : "⚡";
  if (!EX_RAPIDO_ABERTO) { cx.innerHTML = ""; return; }

  cx.innerHTML = A.RAPIDOS.map(id => {
    const c = A.CONTROLES.filter(x => x.id === id)[0];
    if (!c) return "";
    return '<button class="ex-rb" data-ctrl="' + id + '">' +
           '<b>' + c.ic + "</b><span>" + escaparTexto(c.rot) + "</span></button>";
  }).join("");
  cx.querySelectorAll("[data-ctrl]").forEach(b =>
    b.addEventListener("click", () => { A.apertar(b.getAttribute("data-ctrl")); explOlharRapido(); }));
  explOlharRapido();
}

/* a recarga aparece no botão. Só mexe em classe, nunca em innerHTML:
   isto roda a cada quadro e refazer HTML 60 vezes por segundo engasga
   celular fraco -- e engasgo em jogo de tiro é injustiça. */
function explOlharRapido() {
  const cx = $("c3-rapido-cx");
  if (!cx || !EX_RAPIDO_ABERTO || !explAPI) return;
  const N2 = explAPI.N;
  const espera = { tiro: N2.recargaTiro, missil: N2.recargaMissil };
  cx.querySelectorAll("[data-ctrl]").forEach(b => {
    const id = b.getAttribute("data-ctrl");
    b.classList.toggle("esfriando", (espera[id] || 0) > 0);
  });
}

function explLigadoCtrl() { return explAPI ? explAPI.ligadosCtrl : {}; }

function explPintarAvisos() {
  const cx = $("c3-avisos");
  if (!cx || !explAPI) return;
  cx.innerHTML = explAPI.N.avisos.map(a =>
    '<div class="ex-aviso ' + a.tipo + '">' + escaparTexto(a.texto).slice(0,90) + "</div>").join("");
}

function explPintarPainel() {
  if (!explAPI) return;
  const N2 = explAPI.N;
  const p = (id, v, sufixo) => { const e = $(id); if (e) e.textContent = v + (sufixo || ""); };
  p("c3-vel", Math.round(Math.abs(N2.velocidade)));
  p("c3-comb", N2.combustivelInfinito ? "∞" : Math.round(N2.combustivel) + "%");
  p("c3-ene", Math.round(N2.energia) + "%");
  p("c3-esc", Math.round(N2.escudo) + "%");
  p("c3-casco", Math.round(N2.casco) + "%");
  p("c3-oxi", Math.round(N2.oxigenio) + "%");
  p("c3-temp", Math.round(N2.temperatura) + "°C");
  p("c3-abates", N2.abatidas);
  const mira = $("c3-mira");
  if (mira) {
    let quente = false;
    try { quente = explAPI.miraQuente(); } catch (e) {}
    mira.classList.toggle("travada", quente);
  }
  explOlharRapido();
  p("c3-sistema", explAPI.sistema().nome);
  const b = $("c3-pot-b");
  if (b) b.style.height = Math.max(0, N2.potencia*100) + "%";
  const sl = $("c3-salto");
  if (sl) {
    if (N2.salto) { sl.style.display = "block"; sl.textContent = "SALTO · " + ETAPAS_TXT[N2.salto.etapa]; }
    else sl.style.display = "none";
  }
  explPintarRadar();
}
const ETAPAS_TXT = ["DESTINO","CÁLCULO","VERIFICAÇÃO","CARREGANDO","SALTO","CHEGADA"];

/* o radar: um círculo com o que está por perto, virado para onde a nave
   aponta. Mostrar distância sem direção não ajuda ninguém a chegar. */
function explPintarRadar() {
  const cx = $("c3-radar");
  if (!cx || !explAPI) return;
  const N2 = explAPI.N;
  if (!explLigadoCtrl().radar) { cx.innerHTML = '<u class="ex-off">RADAR OFF</u>'; return; }
  const s = explAPI.sistema();
  const objetos = [];
  const juntar = (nome, x, y, z, classe) => objetos.push({ nome, x, y, z, classe });
  juntar("★", 0,0,0, "sol");
  for (const pl of s.planetas) juntar("●", pl.x,pl.y,pl.z, "planeta");
  if (s.estacao) juntar("▣", s.estacao.x,s.estacao.y,s.estacao.z, "estacao");
  for (const a of explAPI.ALIENS) juntar("▲", a.x,a.y,a.z, a.hostil ? "hostil" : "nave");

  const fr = [-N2.ori[8],-N2.ori[9],-N2.ori[10]], di = [N2.ori[0],N2.ori[1],N2.ori[2]];
  const ALC = 2600;
  cx.innerHTML = objetos.map(o => {
    const dx=o.x-N2.pos[0], dy=o.y-N2.pos[1], dz=o.z-N2.pos[2];
    const dist = Math.hypot(dx,dy,dz);
    if (dist > ALC) return "";
    const ex = (dx*di[0]+dy*di[1]+dz*di[2]) / ALC;
    const ez = (dx*fr[0]+dy*fr[1]+dz*fr[2]) / ALC;
    const px = 50 + ex*46, py = 50 - ez*46;
    return '<i class="' + o.classe + '" style="left:' + px.toFixed(1) + '%;top:' + py.toFixed(1) + '%">' + o.nome + "</i>";
  }).join("") + '<u class="ex-alc">' + (ALC/1000).toFixed(1) + "k</u>";
}

/* ---- mapa estelar ---- */
function explAbrirMapa() {
  if (!explAPI) return;
  const cx = $("c3-mapa");
  if (!cx) return;
  const N2 = explAPI.N;
  cx.style.display = "flex";
  cx.innerHTML = '<div class="ex-mapa-cx"><div class="ex-mapa-h">MAPA ESTELAR</div>' +
    '<div class="ex-mapa-lista">' +
    explAPI.SISTEMAS.map((s, i) => {
      const aqui = i === N2.sistemaAtual;
      const dest = i === N2.destino;
      return '<button class="ex-sis' + (aqui ? " aqui" : "") + (dest ? " dest" : "") +
        '" data-sis="' + i + '"><b>' + escaparTexto(s.nome) + "</b>" +
        "<em>" + s.planetas.length + " planetas" + (s.estacao ? " · estação" : "") +
        (aqui ? " · VOCÊ ESTÁ AQUI" : (s.descoberto ? " · visitado" : " · não visitado")) +
        "</em></button>";
    }).join("") + "</div>" +
    '<div class="ex-mapa-pe"><button class="ex-mapa-bt" id="c3-mapa-ir">DEFINIR ROTA</button>' +
    '<button class="ex-mapa-bt" id="c3-mapa-x">FECHAR</button></div></div>';
  cx.querySelectorAll("[data-sis]").forEach(b =>
    b.addEventListener("click", () => {
      const i = parseInt(b.getAttribute("data-sis"), 10);
      if (i === N2.sistemaAtual) return;
      N2.destino = i;
      explAbrirMapa();
    }));
  $("c3-mapa-x").addEventListener("click", () => { cx.style.display = "none"; });
  $("c3-mapa-ir").addEventListener("click", () => {
    if (N2.destino == null) return;
    cx.style.display = "none";
    explAPI.N.avisos.unshift({ texto: "Rota definida para " + explAPI.SISTEMAS[N2.destino].nome +
      ". Aperte HYPERDRIVE.", tipo: "ok", t: 0 });
    explPintarAvisos();
  });
}

/* ---------------------------------------------------------------------
   O AVISO DE PAISAGEM
   A cabine tem três painéis lado a lado: em pé não cabe, e espremer
   viraria um amontoado. Então o modo PEDE o aparelho deitado e não
   deixa fechar o aviso -- deixar entrar em retrato seria entregar uma
   experiência ruim e fingir que está tudo bem.

   Isto vale SÓ neste modo: o resto do jogo continua em pé como sempre. */
let explRetratoAceito = false, explRelogioGirar = 0;
function explOlharOrientacao() {
  const av = $("c3-girar");
  if (!av) return;
  const retrato = innerHeight > innerWidth;
  const mostrar = retrato && explLigada && !explRetratoAceito;
  av.classList.toggle("on", mostrar);
  SCREENS.cabine.classList.toggle("retrato", retrato && explRetratoAceito);

  if (explRelogioGirar) { clearTimeout(explRelogioGirar); explRelogioGirar = 0; }
  const saida = $("c3-girar-saida");
  if (saida) saida.classList.remove("on");
  if (!mostrar) return;

  /* Se depois de alguns segundos o aparelho continua em pé, ele
     provavelmente NÃO VAI virar: ou a rotação está travada, ou é um
     iPhone (onde nenhuma página pode virar a tela). Insistir no mesmo
     aviso seria deixar o jogador do lado de fora de um modo inteiro --
     então aqui aparece a explicação e a saída. */
  explRelogioGirar = setTimeout(() => {
    if (!explLigada || innerHeight <= innerWidth) return;
    if (saida) saida.classList.add("on");
  }, 3500);
}


/* ---------------------------------------------------------------------
   VIRAR A TELA
   ---------------------------------------------------------------------
   O manifest.json trancava o jogo inteiro em retrato. Isso mantinha o
   resto do jogo em pé (que é o certo), mas fazia o atalho da tela
   inicial NUNCA virar -- e aí o aviso "vire o aparelho" virava uma
   parede: o modo ficava inalcançável para quem joga pelo atalho.

   Agora o manifesto libera, e quem manda na orientação é cada modo:
   este pede paisagem ao entrar e devolve retrato ao sair. Os outros
   modos continuam em pé porque o retrato é pedido de volta na saída e
   no começo do jogo.

   No iPhone a API screen.orientation.lock não existe -- a Apple não
   deixa página nenhuma virar a tela. Lá o que resolve é o aviso, e por
   isso ele explica a trava de rotação em vez de só mandar girar: mandar
   girar um aparelho travado não ajuda ninguém.                        */
function orientarPara(qual) {
  try {
    const o = screen.orientation;
    if (o && typeof o.lock === "function") {
      const p = o.lock(qual);
      if (p && p.catch) p.catch(() => {});   // recusado: o aviso assume
      return true;
    }
  } catch (e) {}
  return false;
}

/* ---------------------------------------------------------------------
   entrar e sair                                                        */
let explQuadro = 0, explAntes = 0;
function explLaco(agora) {
  if (!explLigada) return;
  let dt = (agora - explAntes) / 1000;
  explAntes = agora;
  if (dt > 0.05) dt = 0.05;        // voltando de segundo plano, não teleporta
  try { explAPI.passo(dt); explAPI.desenhar(); } catch (e) { explSair(); return; }
  explQuadro = requestAnimationFrame(explLaco);
}

function exploracaoEntrar() {
  if (!EXPL_PRONTA) {
    explAPI = explMontar();
    EXPL_PRONTA = true;
    if (!explAPI) { const a = $("c3-erro"); if (a) a.style.display = "flex"; }
  }
  S.mode = "cabine";
  showScreen("cabine");
  if (!explAPI) return;
  explLigada = true;
  explAPI.medir();
  explAPI.ligar();
  /* A nave entra LIGADA. Antes era dez chaves na ordem certa antes de a
     nave sair do lugar, e a primeira coisa que o modo fazia era um
     teste de paciência. Quem quiser o ritual aperta PARTIDA e desliga
     tudo -- a escolha ficou, a obrigação saiu. */
  explAPI.ligarTudo(true);
  explPintarControles();
  explPintarRapido();
  explPintarPainel();
  explPintarAvisos();
  orientarPara("landscape");
  explRetratoAceito = false;
  explOlharOrientacao();
  explAntes = performance.now();
  explQuadro = requestAnimationFrame(explLaco);
  try { AudioSys.resume(); } catch (e) {}
}

function explSair() {
  explLigada = false;
  if (explQuadro) cancelAnimationFrame(explQuadro);
  explQuadro = 0;
  if (explAPI) explAPI.desligar();
  const m = $("c3-mapa"); if (m) m.style.display = "none";
  /* devolve o aparelho ao retrato: os outros modos do jogo são em pé */
  orientarPara("portrait");
  explRetratoAceito = false;
  explOlharOrientacao();
  goMenu();
}

addEventListener("resize", () => {
  if (explLigada && explAPI) { explAPI.medir(); explPintarControles(); }
  explOlharOrientacao();
});
addEventListener("orientationchange", () => setTimeout(explOlharOrientacao, 220));

/* ---------------------------------------------------------------------
   os botões que abrem e fecham este modo                               */
(function ligarBotoesDaExploracao() {
  const b = $("btn-cabine");
  /* GUARDADA, não apagada. O modo inteiro continua aqui, testado e
     montado junto com o jogo; só não aparece no menu enquanto a chave
     estiver desligada. Religar é trocar false por true na linha do
     EXPLORACAO_LIGADA lá em cima -- e o botão volta para dentro da
     porta MINHA NAVE sozinho, porque quem esconde a linha é o próprio
     display:none deste botão. */
  if (!EXPLORACAO_LIGADA) {
    if (b) b.style.display = "none";
    return;
  }
  if (b) b.addEventListener("click", () => { try { AudioSys.resume(); } catch (e) {} exploracaoEntrar(); });
  const v = $("c3-voltar");
  if (v) v.addEventListener("click", explSair);
  const r = $("c3-rapido-b");
  if (r) r.addEventListener("click", () => {
    EX_RAPIDO_ABERTO = !EX_RAPIDO_ABERTO;
    explPintarRapido();
  });
})();

/* o jogador escolheu jogar em pé: a cabine se reorganiza em vez de
   barrar a entrada */
(function ligarSaidaDoRetrato() {
  const b = $("c3-ficar");
  if (b) b.addEventListener("click", () => {
    explRetratoAceito = true;
    /* o VOO começa aberto: é o painel que mais se usa, e abrir em
       nenhum deixaria a tela parecendo quebrada */
    const cen = $("c3-pcen");
    if (cen && !document.querySelector(".ex-painel.mostrar")) cen.classList.add("mostrar");
    explOlharOrientacao();
    if (explAPI) { explAPI.medir(); explPintarControles(); }
  });
  /* em pé só cabe um painel de cada vez: o seletor troca qual */
  document.querySelectorAll("[data-painel]").forEach(x =>
    x.addEventListener("click", () => {
      const g = x.getAttribute("data-painel");
      document.querySelectorAll("[data-painel]").forEach(y =>
        y.classList.toggle("on", y === x));
      for (const [id, gg] of [["c3-pesq","sis"],["c3-pcen","voo"],["c3-pdir","nave"]]) {
        const el = $(id);
        if (el) el.classList.toggle("mostrar", gg === g);
      }
    }));
})();
