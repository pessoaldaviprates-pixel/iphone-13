
/* =====================================================================
   CABINE — o modo primeira pessoa
   ---------------------------------------------------------------------
   WebGL 2 escrito na mão, sem biblioteca nenhuma: o jogo é um arquivo só
   que precisa funcionar offline em celular fraco, e puxar uma engine de
   600 KB quebraria as duas coisas.

   Nada aqui roda até o jogador entrar. O contexto 3D, os programas e as
   malhas só nascem no primeiro cabineEntrar() -- quem nunca abrir a
   cabine não paga nada por ela, nem memória nem tempo de carga. E os
   controles escutam só a tela da cabine: se escutassem o documento, o
   arrasto no menu viraria manche.
   ===================================================================== */
let CABINE_PRONTA = false;
let cabineLigada = false;
let cabineAPI = null;

function cabineMontar() {
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
  uniform mat4 uVP, uModelo; uniform float uTempo;
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
    vec3 ceu = vec3(0.012,0.020,0.052);
    ceu += mancha(r, vec3( 0.55, 0.30,-0.78), vec3(0.17,0.46,0.78), 2.4);
    ceu += mancha(r, vec3(-0.70, 0.12,-0.70), vec3(0.44,0.16,0.68), 2.8);
    ceu += mancha(r, vec3( 0.10,-0.65,-0.75), vec3(0.48,0.12,0.34), 3.4);
    ceu += mancha(r, vec3(-0.20, 0.80, 0.55), vec3(0.10,0.32,0.48), 2.6);
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
    tempo: gl.getUniformLocation(progMalha,"uTempo")
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

  /* ---- o caça inimigo: casco escuro, detalhe magenta, motores acesos ---- */
  const CACA = (() => {
    const c = Construtor();
    const casco=[.16,.19,.28], quina=[.34,.38,.52], mag=[1,.30,.56], mot=[.45,.92,1];
    c.bico(0,0,-0.15, 1.45, 0.30, 0.22, quina, 0);       // bico
    c.bloco(0,0,0.45, 0.30,0.24,0.62, casco, 0);         // corpo
    c.bloco(0,0.20,0.62, 0.16,0.10,0.26, mag, 0.55);     // faixa acesa
    c.bloco(-0.86,0,0.40, 0.58,0.05,0.30, casco, 0);     // asa esquerda
    c.bloco( 0.86,0,0.40, 0.58,0.05,0.30, casco, 0);     // asa direita
    c.bloco(-1.34,0,0.30, 0.10,0.13,0.42, quina, 0);     // ponta esquerda
    c.bloco( 1.34,0,0.30, 0.10,0.13,0.42, quina, 0);     // ponta direita
    c.bloco(-0.30,0,1.08, 0.13,0.13,0.07, mot, 1.6);     // motor esquerdo
    c.bloco( 0.30,0,1.08, 0.13,0.13,0.07, mot, 1.6);     // motor direito
    c.bloco(0,0.34,0.30, 0.05,0.22,0.30, casco, 0);      // leme
    return c.pronto();
  })();

  /* ---- a cabine ----
     Construida em coordenadas de TELA: x e y de -1 a 1 sao as bordas do
     que voce enxerga, e z e profundidade para dentro. Na hora de desenhar
     ela e esticada conforme a proporcao do aparelho.

     Isso importa: num celular em pe o campo horizontal e estreito
     (a largura e menos da metade da altura). Construida em metros, como
     estava antes, as laterais e o painel caiam fora da vista e sobravam
     duas faixas no topo e embaixo. Assim ela emoldura certo em qualquer
     tela, do celular pequeno ao tablet deitado.                         */
  const CABINE = (() => {
    const c = Construtor();
    const metal=[.10,.12,.19], quina=[.17,.21,.30], claro=[.26,.32,.45];

    /* IMPORTANTE: x e y vao de -1 a 1 e sao as BORDAS da tela. Uma peca
       centrada em 1.4 fica inteira fora da vista -- foi o que aconteceu
       numa tentativa anterior e a cabine sumiu por completo, sobrando so
       o HUD. Cada peca aqui e posta para ATRAVESSAR a borda: parte dentro,
       formando a moldura, parte fora. */

    /* painel de baixo: uma faixa de uns 20% da altura */
    c.bloco(0,-1.34,0.10, 1.70,0.58,0.30, metal, 0);
    c.bloco(0,-0.80,0.16, 1.70,0.045,0.24, quina, 0);
    c.bloco(0,-0.773,0.30, 1.30,0.010,0.02, [.25,.62,.92], 1.6);

    /* botoes decorativos: duas fileiras, cada cor no seu ritmo */
    for (let i = 0; i < 9; i++) {
      const x = -0.62 + i*0.155;
      const cores = [[1,.30,.56],[.30,.92,.70],[1,.79,.38],[.30,.90,1]];
      c.bloco(x,-0.865,0.22, 0.028,0.014,0.028, cores[i%4], 1.8, 1+(i%4));
    }
    for (let i = 0; i < 5; i++) {
      c.bloco(-0.30+i*0.15,-0.945,0.26, 0.042,0.010,0.020, [.55,.66,.85], 0.5, 0);
    }
    /* duas telinhas */
    c.bloco(-0.56,-0.925,0.20, 0.20,0.045,0.02, [.14,.50,.72], 1.0, 2);
    c.bloco( 0.56,-0.925,0.20, 0.20,0.045,0.02, [.52,.26,.70], 1.0, 3);
    /* a ponta do manche entre as pernas */
    c.bloco(0,-1.10,0.46, 0.030,0.13,0.030, quina, 0.15);
    c.bloco(0,-0.985,0.46, 0.060,0.030,0.060, [.28,.88,1], 1.2);

    /* montantes: atravessam a borda de lado, deixando uma faixa dentro */
    c.bloco(-1.06,0,0.16, 0.30,1.30,0.26, metal, 0);
    c.bloco( 1.06,0,0.16, 0.30,1.30,0.26, metal, 0);
    c.bloco(-0.772,0,0.30, 0.026,1.05,0.02, claro, 0.45);
    c.bloco( 0.772,0,0.30, 0.026,1.05,0.02, claro, 0.45);

    /* arco de cima */
    c.bloco(0,1.20,0.16, 1.45,0.30,0.26, metal, 0);
    c.bloco(0,0.888,0.30, 1.15,0.016,0.02, claro, 0.5);

    /* dois montantes finos descendo do arco: dao escala ao vidro */
    c.bloco(-0.42,0.82,0.30, 0.014,0.10,0.012, quina, 0.10);
    c.bloco( 0.42,0.82,0.30, 0.014,0.10,0.012, quina, 0.10);

    return c.pronto();
  })();

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

  /* ------------------------------------------------------------- o mundo */
  const S = {
    ori: M.id(), pos: [0,0,0], vel: 46, tempo: 0,
    giroX: 0, giroY: 0, giroZ: 0,
    casco: 100, abates: 0, recuo: 0, tremor: 0
  };
  const inimigos = [], tiros = [], poeira = [], estrelas = [];

  for (let i = 0; i < 520; i++) {
    poeira.push({ x:(Math.random()-.5)*150, y:(Math.random()-.5)*150, z:(Math.random()-.5)*150 });
  }
  for (let i = 0; i < 380; i++) {
    const a = Math.random()*Math.PI*2, b = Math.acos(2*Math.random()-1), r = 900;
    estrelas.push({
      x: r*Math.sin(b)*Math.cos(a), y: r*Math.cos(b), z: r*Math.sin(b)*Math.sin(a),
      f: 0.25 + Math.random()*0.75
    });
  }

  function frente() { return [-S.ori[8], -S.ori[9], -S.ori[10]]; }
  function direita(){ return [ S.ori[0],  S.ori[1],  S.ori[2]]; }
  function cima()   { return [ S.ori[4],  S.ori[5],  S.ori[6]]; }

  function nascerInimigo() {
    const f = frente(), d = direita(), c = cima();
    const dist = 150 + Math.random()*130;
    const lx = (Math.random()-.5)*95, ly = (Math.random()-.5)*70;
    inimigos.push({
      x: S.pos[0] + f[0]*dist + d[0]*lx + c[0]*ly,
      y: S.pos[1] + f[1]*dist + d[1]*lx + c[1]*ly,
      z: S.pos[2] + f[2]*dist + d[2]*lx + c[2]*ly,
      vida: 3, recarga: 0.9 + Math.random()*1.4, giro: Math.random()*Math.PI*2, vida0: 3
    });
  }
  for (let i = 0; i < 7; i++) nascerInimigo();

  /* ------------------------------------------------------------- o manche
     Um dedo em qualquer lugar: onde encostar vira o centro, e o quanto
     você arrasta é o quanto a nave inclina. Direção livre — o par
     (horizontal, vertical) vira guinada e arfagem ao mesmo tempo, então
     dá para ir para qualquer canto, não só reto para os lados.        */
  const manche = { ativo:false, id:null, ox:0, oy:0, x:0, y:0 };
  const elManche = document.getElementById("c3-manche"), elMancheU = document.getElementById("c3-manche-u");
  const RAIO = 58;

  function pegar(e) {
    if (manche.ativo) return;
    const t = e.changedTouches ? e.changedTouches[0] : e;
    manche.ativo = true; manche.id = t.identifier != null ? t.identifier : "mouse";
    manche.ox = t.clientX; manche.oy = t.clientY; manche.x = 0; manche.y = 0;
    elManche.style.left = t.clientX + "px";
    elManche.style.top = t.clientY + "px";
    elManche.classList.add("on");
    document.getElementById("c3-dica").classList.add("some");
  }
  function mover(e) {
    if (!manche.ativo) return;
    const lista = e.changedTouches ? e.changedTouches : [e];
    for (const t of lista) {
      const id = t.identifier != null ? t.identifier : "mouse";
      if (id !== manche.id) continue;
      let dx = t.clientX - manche.ox, dy = t.clientY - manche.oy;
      const d = Math.hypot(dx,dy);
      if (d > RAIO) { dx = dx/d*RAIO; dy = dy/d*RAIO; }
      manche.x = dx/RAIO; manche.y = dy/RAIO;
      elMancheU.style.transform = "translate(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px)";
    }
  }
  function soltar() {
    manche.ativo = false; manche.x = 0; manche.y = 0;
    elManche.classList.remove("on");
    elMancheU.style.transform = "translate(0,0)";
  }
  /* Os controles so existem enquanto a cabine esta aberta. Deixar
       escutando o documento inteiro faria o arrasto do menu virar manche. */
    function ligarControles() {
      const t = SCREENS.cabine;
      t.addEventListener("touchstart", pegar, {passive:true});
      t.addEventListener("touchmove", mover, {passive:true});
      t.addEventListener("touchend", soltar, {passive:true});
      t.addEventListener("touchcancel", soltar, {passive:true});
      t.addEventListener("mousedown", pegar);
      t.addEventListener("mousemove", mover);
      t.addEventListener("mouseup", soltar);
    }
    function desligarControles() {
      const t = SCREENS.cabine;
      for (const [n,f] of [["touchstart",pegar],["touchmove",mover],["touchend",soltar],
                           ["touchcancel",soltar],["mousedown",pegar],["mousemove",mover],["mouseup",soltar]]) {
        t.removeEventListener(n, f);
      }
      soltar();
    }

  /* --------------------------------------------------------------- passo */
  let recargaTiro = 0;
  function passo(dt) {
    S.tempo += dt;

    /* a inclinação do manche vira velocidade de giro, com a nave demorando
       um instante para responder — sem isso o voo fica seco e sem peso */
    const alvoX = -manche.y * 1.15;              // arfagem: puxar sobe o bico
    const alvoY = -manche.x * 1.15;              // guinada
    const alvoZ = -manche.x * 0.85;              // a nave inclina para dentro da curva
    const suave = 1 - Math.pow(0.0012, dt);
    S.giroX += (alvoX - S.giroX) * suave;
    S.giroY += (alvoY - S.giroY) * suave;
    S.giroZ += (alvoZ - S.giroZ) * suave;

    S.ori = M.mul(S.ori, M.giroX(S.giroX*dt));
    S.ori = M.mul(S.ori, M.giroY(S.giroY*dt));
    S.ori = M.mul(S.ori, M.giroZ(S.giroZ*dt));
    M.reendireitar(S.ori);

    const f = frente();
    S.pos[0]+=f[0]*S.vel*dt; S.pos[1]+=f[1]*S.vel*dt; S.pos[2]+=f[2]*S.vel*dt;

    /* poeira: cada grão que fica para trás renasce à frente. É o que faz
       sentir velocidade e direção — sem ela o espaço vazio parece parado */
    for (const p of poeira) {
      let dx=p.x-S.pos[0], dy=p.y-S.pos[1], dz=p.z-S.pos[2];
      if (Math.hypot(dx,dy,dz) > 85) {
        const d2 = direita(), c2 = cima();
        const dist = 45 + Math.random()*40, lx=(Math.random()-.5)*110, ly=(Math.random()-.5)*110;
        p.x = S.pos[0]+f[0]*dist+d2[0]*lx+c2[0]*ly;
        p.y = S.pos[1]+f[1]*dist+d2[1]*lx+c2[1]*ly;
        p.z = S.pos[2]+f[2]*dist+d2[2]*lx+c2[2]*ly;
      }
    }

    /* canhões: automáticos, como no jogo 2D */
    recargaTiro -= dt;
    if (recargaTiro <= 0) {
      recargaTiro = 0.13;
      const d2 = direita(), c2 = cima();
      for (const lado of [-1, 1]) {
        tiros.push({
          x: S.pos[0]+d2[0]*lado*1.1+c2[0]*-0.45, y: S.pos[1]+d2[1]*lado*1.1+c2[1]*-0.45,
          z: S.pos[2]+d2[2]*lado*1.1+c2[2]*-0.45,
          dx: f[0], dy: f[1], dz: f[2], t: 1.7, meu: true
        });
      }
      S.recuo = 1;
    }
    S.recuo = Math.max(0, S.recuo - dt*6);
    S.tremor = Math.max(0, S.tremor - dt*3.4);

    /* inimigos: viram para você, se aproximam e atiram */
    for (let i = inimigos.length-1; i >= 0; i--) {
      const e = inimigos[i];
      let dx=S.pos[0]-e.x, dy=S.pos[1]-e.y, dz=S.pos[2]-e.z;
      const d = Math.hypot(dx,dy,dz) || 1;
      dx/=d; dy/=d; dz/=d;
      const v = d > 34 ? 26 : -16;                 // chega perto, depois passa reto
      e.x += dx*v*dt; e.y += dy*v*dt; e.z += dz*v*dt;
      e.giro += dt*0.7;
      e.recarga -= dt;
      if (e.recarga <= 0 && d < 150) {
        e.recarga = 1.5 + Math.random()*1.6;
        tiros.push({ x:e.x, y:e.y, z:e.z, dx:dx, dy:dy, dz:dz, t:2.6, meu:false });
      }
      if (d > 420) { inimigos.splice(i,1); nascerInimigo(); }
    }

    /* tiros */
    for (let i = tiros.length-1; i >= 0; i--) {
      const t = tiros[i];
      const v = t.meu ? 220 : 95;
      t.x += t.dx*v*dt; t.y += t.dy*v*dt; t.z += t.dz*v*dt;
      t.t -= dt;
      if (t.t <= 0) { tiros.splice(i,1); continue; }
      if (t.meu) {
        for (let j = inimigos.length-1; j >= 0; j--) {
          const e = inimigos[j];
          if (Math.hypot(t.x-e.x, t.y-e.y, t.z-e.z) < 3.2) {
            e.vida--; tiros.splice(i,1);
            if (e.vida <= 0) {
              inimigos.splice(j,1); nascerInimigo();
              S.abates++; document.getElementById("c3-abates").textContent = S.abates;
            }
            break;
          }
        }
      } else if (Math.hypot(t.x-S.pos[0], t.y-S.pos[1], t.z-S.pos[2]) < 2.6) {
        tiros.splice(i,1);
        S.casco = Math.max(0, S.casco - 7);
        S.tremor = 1;
        const dn = document.getElementById("c3-dano");
        dn.classList.add("on");
        setTimeout(()=>dn.classList.remove("on"), 90);
        const cx = document.getElementById("c3-cx-casco");
        document.getElementById("c3-casco").textContent = S.casco + "%";
        cx.classList.toggle("baixo", S.casco <= 35);
        if (S.casco <= 0) { S.casco = 100; document.getElementById("c3-casco").textContent = "100%"; cx.classList.remove("baixo"); }
      }
    }

    document.getElementById("c3-vel").textContent = Math.round(S.vel + manche.x*0 + 0);
    const m = document.getElementById("c3-mira");
    m.style.transform = "translate(-50%,-50%) scale(" + (1 + S.recuo*0.14).toFixed(3) + ")";
  }

  /* ------------------------------------------------------------- desenho */
  let larg=0, alt=0;
  function medir() {
    const r = Math.min(devicePixelRatio || 1, 2);   // 2 já basta: acima disso só esquenta o aparelho
    larg = Math.floor(innerWidth*r); alt = Math.floor(innerHeight*r);
    cv.width = larg; cv.height = alt;
  }


  function desenhar() {
    gl.viewport(0,0,larg,alt);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.BLEND);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const FOV = 1.22, TAN = Math.tan(FOV/2), PROP = larg/alt;
    const proj = M.perspectiva(FOV, PROP, 0.1, 2200);

    /* o ceu, antes de tudo */
    const f0 = frente(), d0 = direita(), c0 = cima();
    gl.useProgram(progFundo);
    gl.uniform3f(uFundo.dir, f0[0],f0[1],f0[2]);
    gl.uniform3f(uFundo.dir2, d0[0],d0[1],d0[2]);
    gl.uniform3f(uFundo.cima, c0[0],c0[1],c0[2]);
    gl.uniform1f(uFundo.tan, TAN);
    gl.uniform1f(uFundo.prop, PROP);
    gl.bindVertexArray(vaoVazio);
    gl.depthMask(false);
    gl.drawArrays(gl.TRIANGLES,0,3);
    gl.depthMask(true);
    /* tremor de dano: a câmera sacode um tico, não a cabine inteira */
    const tr = S.tremor*0.012;
    const camGiro = M.transporGiro(S.ori);
    const cam = M.mul(camGiro, M.mover(-S.pos[0],-S.pos[1],-S.pos[2]));
    const sacode = M.mul(M.giroX((Math.random()-.5)*tr), M.giroY((Math.random()-.5)*tr));
    const VP = M.mul(M.mul(proj, sacode), cam);

    /* ---- estrelas: giram com a cabeça, mas não se aproximam ---- */
    nRiscos = 0;
    const somenteGiro = M.mul(M.mul(proj,sacode), camGiro);
    for (const s of estrelas) risco(s.x,s.y,s.z, s.x*1.002,s.y*1.002,s.z*1.002, s.f,s.f*0.95,1, s.f);
    gl.useProgram(progRisco);
    gl.uniformMatrix4fv(uRisco.vp,false,somenteGiro);
    gl.bindVertexArray(riscoVao);
    gl.bindBuffer(gl.ARRAY_BUFFER,riscoPos); gl.bufferSubData(gl.ARRAY_BUFFER,0,bufPos,0,nRiscos*6);
    gl.bindBuffer(gl.ARRAY_BUFFER,riscoCor); gl.bufferSubData(gl.ARRAY_BUFFER,0,bufCor,0,nRiscos*6);
    gl.bindBuffer(gl.ARRAY_BUFFER,riscoForca); gl.bufferSubData(gl.ARRAY_BUFFER,0,bufForca,0,nRiscos*2);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE); gl.depthMask(false);
    gl.drawArrays(gl.LINES,0,nRiscos*2);
    gl.depthMask(true); gl.disable(gl.BLEND);

    /* ---- os caças ---- */
    gl.useProgram(progMalha);
    gl.uniformMatrix4fv(uMalha.vp,false,VP);
    gl.uniform1f(uMalha.tempo,S.tempo);
    gl.bindVertexArray(CACA.vao);
    for (const e of inimigos) {
      /* aponta o caça para você: é o "vêm mirando em você" */
      let dx=S.pos[0]-e.x, dy=S.pos[1]-e.y, dz=S.pos[2]-e.z;
      const d=Math.hypot(dx,dy,dz)||1;
      const guin = Math.atan2(dx/d, dz/d);
      const arf = Math.asin(Math.max(-1,Math.min(1,dy/d)));
      let mo = M.mul(M.mover(e.x,e.y,e.z), M.giroY(guin));
      mo = M.mul(mo, M.giroX(-arf));
      mo = M.mul(mo, M.giroZ(Math.sin(e.giro)*0.28));
      mo = M.mul(mo, M.escala(1.6));
      gl.uniformMatrix4fv(uMalha.modelo,false,mo);
      gl.drawElements(gl.TRIANGLES,CACA.n,gl.UNSIGNED_SHORT,0);
    }

    /* ---- poeira e tiros, somados à luz ---- */
    nRiscos = 0;
    const f = frente(), risca = S.vel*0.030;
    for (const p of poeira) {
      risco(p.x,p.y,p.z, p.x-f[0]*risca, p.y-f[1]*risca, p.z-f[2]*risca, 0.42,0.66,0.95, 0.55);
    }
    for (const t of tiros) {
      const c = t.meu ? [0.35,0.95,1] : [1,0.42,0.30];
      const L = t.meu ? 5.5 : 3.4;
      risco(t.x,t.y,t.z, t.x-t.dx*L, t.y-t.dy*L, t.z-t.dz*L, c[0],c[1],c[2], t.meu?1.25:1.05);
    }
    gl.useProgram(progRisco);
    gl.uniformMatrix4fv(uRisco.vp,false,VP);
    gl.bindVertexArray(riscoVao);
    gl.bindBuffer(gl.ARRAY_BUFFER,riscoPos); gl.bufferSubData(gl.ARRAY_BUFFER,0,bufPos,0,nRiscos*6);
    gl.bindBuffer(gl.ARRAY_BUFFER,riscoCor); gl.bufferSubData(gl.ARRAY_BUFFER,0,bufCor,0,nRiscos*6);
    gl.bindBuffer(gl.ARRAY_BUFFER,riscoForca); gl.bufferSubData(gl.ARRAY_BUFFER,0,bufForca,0,nRiscos*2);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE); gl.depthMask(false);
    gl.drawArrays(gl.LINES,0,nRiscos*2);
    gl.depthMask(true); gl.disable(gl.BLEND);

    /* ---- a cabine: presa na sua cabeça, desenhada por último ---- */
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.useProgram(progMalha);
    /* ela balança um tico contra a curva: é o peso do corpo na cadeira */
    const balanco = M.mul(M.giroZ(S.giroZ*0.05), M.giroX(S.giroX*0.035));
    gl.uniformMatrix4fv(uMalha.vp,false,M.mul(M.mul(proj,sacode),balanco));
    gl.uniform1f(uMalha.tempo,S.tempo);
    /* estica a cabine para as bordas dela baterem com as bordas da tela,
       seja qual for a proporcao do aparelho */
    const D = 1.0, sx = TAN*PROP*D, sy = TAN*D;
    const molde = M.mul(M.mover(0,0,-D), new Float32Array([sx,0,0,0, 0,sy,0,0, 0,0,0.42,0, 0,0,0,1]));
    gl.uniformMatrix4fv(uMalha.modelo,false,molde);
    gl.bindVertexArray(CABINE.vao);
    gl.drawElements(gl.TRIANGLES,CABINE.n,gl.UNSIGNED_SHORT,0);
    gl.bindVertexArray(null);
  }


  return {
    passo: passo,
    desenhar: desenhar,
    medir: medir,
    ligar: ligarControles,
    desligar: desligarControles,
    estado: S,
    manche: manche
  };
}

/* ---------------------------------------------------------------------
   entrar e sair                                                        */
let cabineQuadro = 0, cabineAntes = 0;
function cabineLaco(agora) {
  if (!cabineLigada) return;
  let dt = (agora - cabineAntes) / 1000;
  cabineAntes = agora;
  if (dt > 0.05) dt = 0.05;          // voltando de segundo plano, não teleporta
  try { cabineAPI.passo(dt); cabineAPI.desenhar(); } catch (e) { cabineSair(); return; }
  cabineQuadro = requestAnimationFrame(cabineLaco);
}

function cabineEntrar() {
  if (!CABINE_PRONTA) {
    cabineAPI = cabineMontar();
    CABINE_PRONTA = true;
    if (!cabineAPI) {
      const av = $("c3-erro");
      if (av) av.style.display = "flex";
    }
  }
  S.mode = "cabine";
  showScreen("cabine");
  if (!cabineAPI) return;            // sem WebGL: fica só o recado na tela
  cabineLigada = true;
  cabineAPI.medir();
  cabineAPI.ligar();
  cabineAntes = performance.now();
  cabineQuadro = requestAnimationFrame(cabineLaco);
  try { AudioSys.resume(); } catch (e) {}
}

function cabineSair() {
  cabineLigada = false;
  if (cabineQuadro) cancelAnimationFrame(cabineQuadro);
  cabineQuadro = 0;
  if (cabineAPI) cabineAPI.desligar();
  goMenu();
}

addEventListener("resize", () => { if (cabineLigada && cabineAPI) cabineAPI.medir(); });
/* o celular bloqueando a tela no meio do voo não pode deixar o laço solto */
document.addEventListener("visibilitychange", () => {
  if (document.hidden && cabineLigada) { cabineAntes = performance.now(); }
});

/* ---------------------------------------------------------------------
   os botões que abrem e fecham                                         */
(function ligarBotoesDaCabine() {
  const b = $("btn-cabine");
  if (b) b.addEventListener("click", () => { AudioSys.resume(); cabineEntrar(); });
  const v = $("c3-voltar");
  if (v) v.addEventListener("click", cabineSair);
  /* as três habilidades do protótipo por enquanto só acendem: o que elas
     fazem de verdade em 3D ainda vai ser desenhado, e prometer efeito que
     não existe é pior do que deixar claro que é um começo */
  document.querySelectorAll(".c3-hab").forEach(h => {
    h.addEventListener("click", () => {
      if (!h.classList.contains("pronta")) return;
      h.classList.remove("pronta");
      setTimeout(() => h.classList.add("pronta"), h.id === "c3-ult" ? 9000 : 4000);
    });
  });
})();
