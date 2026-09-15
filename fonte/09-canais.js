/* =====================================================================
   MANDAR NO CANAL — e só o dono manda
   =====================================================================
   O pedido: "As permissões para editar os canais etc é só para o
   cr1cket e o Cr1cket."

   Antes disto os canais não tinham edição NENHUMA. O único botão do
   cabeçalho era "🔔 avisos", que é uma escolha pessoal de quem está
   olhando, não moderação. Num chat com os amigos isso passa; num chat
   público — que é o que o itch.io vai trazer — não passa: não havia como
   apagar o que um estranho escrevesse.

   O QUE O DONO GANHA
     apagar qualquer mensagem do canal
     mudar o nome e a descrição
     fixar um aviso no topo, que todo mundo vê ao entrar
     trancar o canal (só leitura)
     modo devagar (um tanto de segundos entre mensagens)

   ONDE ISTO MORA: `conversas/__canais/<id>`. Dentro de `conversas/`, que
   é galho velho e que as regras antigas do Firebase já liberam. Um
   `canais/` novo seria recusado calado nas contas antigas e a moderação
   morreria sem dizer nada — foi assim que o CRIAR SERVIDOR morreu.

   =====================================================================
   O AVISO QUE IMPORTA, E QUE NÃO DÁ PARA CONSERTAR AQUI
   ---------------------------------------------------------------------
   Esta checagem roda no NAVEGADOR DE QUEM ESTÁ JOGANDO. Ela decide o que
   aparece na tela — e só isso. Quem abrir as ferramentas do
   desenvolvedor e chamar a função na mão passa por ela, porque o código
   está no computador dele, não no meu.

   Então o que está aqui é ARRUMAÇÃO, não tranca: serve para ninguém
   apertar sem querer um botão que não é dele. A tranca de verdade são as
   REGRAS DO FIREBASE, que rodam no servidor do Google e ninguém
   contorna. Está escrito no NUVEM.md e no ITCH.md como deixar
   `conversas/__canais` só de leitura para todo mundo.

   Dizer isto por escrito é parte do trabalho: um botão escondido que
   parece uma tranca é pior que nenhum botão, porque a gente para de
   olhar para o lado que importa.
   ===================================================================== */

/* =====================================================================
   1. QUEM MANDA
   ---------------------------------------------------------------------
   Uma pergunta, um lugar. `contaDeDono()` já existe e já compara em
   minúsculas (`ehDono` faz `.trim().toLowerCase()`), então "cr1cket",
   "Cr1cket" e "CR1CKET" são a mesma pessoa — que foi exatamente o que
   o pedido dizia.
   ===================================================================== */
function canalSouDono() {
  try { return contaDeDono(save && save.__name); } catch (e) { return false; }
}

/* =====================================================================
   2. O QUE ESTÁ COMBINADO EM CADA CANAL
   ===================================================================== */
const CANAIS = {};              // id -> {titulo, sobre, fixado, trancado, devagar}
const CANAL_LETRAS = 120;       // do aviso fixado
const CANAL_DEVAGAR_MAX = 300;  // segundos

function canalCaminho(id) { return "conversas/__canais/" + id; }

function canalDe(id) {
  return CANAIS[id] || {};
}

async function canalCarregar(id) {
  if (!id) return {};
  try {
    const d = await nuvemReq(canalCaminho(id));
    /* isto foi escrito por outra pessoa (o dono, mas ainda assim vem da
       nuvem): nada entra na tela sem passar pelo escapador, e os números
       são presos na faixa em vez de aceitos como vieram */
    CANAIS[id] = {
      titulo: String((d && d.titulo) || "").slice(0, 24),
      sobre: String((d && d.sobre) || "").slice(0, 80),
      fixado: String((d && d.fixado) || "").slice(0, CANAL_LETRAS),
      trancado: !!(d && d.trancado),
      devagar: Math.max(0, Math.min(CANAL_DEVAGAR_MAX, parseInt((d && d.devagar) || 0, 10) || 0))
    };
  } catch (e) { CANAIS[id] = CANAIS[id] || {}; }
  return CANAIS[id];
}

async function canalGuardar(id, mudanca) {
  if (!canalSouDono()) { estAvisar("Só o dono do jogo mexe nos canais."); return false; }
  const atual = Object.assign({}, canalDe(id), mudanca);
  const limpo = {
    titulo: limparTexto(String(atual.titulo || "").slice(0, 24)),
    sobre: limparTexto(String(atual.sobre || "").slice(0, 80)),
    fixado: limparTexto(String(atual.fixado || "").slice(0, CANAL_LETRAS)),
    trancado: !!atual.trancado,
    devagar: Math.max(0, Math.min(CANAL_DEVAGAR_MAX, parseInt(atual.devagar, 10) || 0))
  };
  CANAIS[id] = limpo;
  /* REPINTAR AQUI, e não em quem chama. O dono mudava o aviso fixado e
     não via nada até a próxima mensagem chegar -- ele tinha que
     acreditar que funcionou. Quem guarda é quem sabe que mudou. */
  try { if (EST.aberta) estPintar(true); } catch (e) {}
  const r = await nuvemSoltar(canalCaminho(id), limpo);
  if (r === null) {
    estAvisar("Não deu para guardar. A nuvem recusou ou a internet caiu.");
    return false;
  }
  return true;
}

/* o nome e a descrição que aparecem: o que o dono escreveu ganha do que
   está fixo no código, e o fixo é a rede de segurança quando não há nada */
function canalTitulo(id) {
  const c = canalDe(id);
  const base = EST_CANAIS.filter(x => x.id === id)[0];
  return c.titulo || (base ? base.nome : id);
}
function canalSobre(id) {
  const c = canalDe(id);
  const base = EST_CANAIS.filter(x => x.id === id)[0];
  return c.sobre || (base ? base.sobre : "");
}

/* =====================================================================
   3. AS REGRAS QUE O CANAL IMPÕE A QUEM ESCREVE
   ---------------------------------------------------------------------
   O dono passa por cima das duas: quem tranca o canal precisa poder
   escrever nele para dizer por que trancou.
   ===================================================================== */
const canalUltimaFala = {};     // id -> quando falei a última vez aqui

function canalPodeFalar(d) {
  if (!d || d.tipo !== "canal") return { ok: true };
  const c = canalDe(d.id);
  if (canalSouDono()) return { ok: true };
  if (c.trancado)
    return { ok: false, motivo: "Este canal está trancado. Só dá para ler." };
  if (c.devagar) {
    const passou = Date.now() - (canalUltimaFala[d.id] || 0);
    const falta = Math.ceil((c.devagar * 1000 - passou) / 1000);
    if (falta > 0)
      return { ok: false, motivo: "Modo devagar: espere " + falta +
               (falta === 1 ? " segundo" : " segundos") + " para falar de novo." };
  }
  return { ok: true };
}

function canalMarcarFala(d) {
  if (d && d.tipo === "canal") canalUltimaFala[d.id] = Date.now();
}

/* =====================================================================
   4. APAGAR MENSAGEM
   ---------------------------------------------------------------------
   O dono apaga qualquer uma; qualquer pessoa apaga a PRÓPRIA. Apagar a
   própria não é moderação, é arrependimento — e negar isso só faz a
   pessoa pedir para alguém apagar por ela.
   ===================================================================== */
function canalPodeApagar(m) {
  if (!m) return false;
  if (canalSouDono()) return true;
  try { const eu = estEu(); return !!(eu && m.de === eu.id); } catch (e) { return false; }
}

async function canalApagar(m) {
  const d = EST.destino;
  if (!d || !m || !canalPodeApagar(m)) return false;
  const cam = estCaminho(d);
  if (!cam) return false;
  /* some da tela na hora, e some da nuvem depois: esperar a rede para
     tirar da tela o que a pessoa acabou de mandar apagar é a hora em que
     ela clica de novo achando que não funcionou */
  EST.msgs = (EST.msgs || []).filter(x => x.k !== m.k);
  estPintar(true);
  const r = await nuvemSoltar(cam + "/" + m.k, null, "DELETE");
  if (r === null) { estAvisar("Não deu para apagar na nuvem."); return false; }
  return true;
}

/* =====================================================================
   5. O PAINEL DO CANAL
   ===================================================================== */
function canalPainelHTML(id) {
  const c = canalDe(id);
  return '<p class="est-nota">O que você mudar aqui todo mundo vê. ' +
    "Só você tem este botão.</p>" +
    '<div class="pf-campo"><label>Nome do canal</label>' +
    '<input id="cn-titulo" maxlength="24" value="' + escaparTexto(canalTitulo(id)) + '"></div>' +
    '<div class="pf-campo"><label>Descrição</label>' +
    '<input id="cn-sobre" maxlength="80" value="' + escaparTexto(canalSobre(id)) + '"></div>' +
    '<div class="pf-campo"><label>Aviso fixado no topo</label>' +
    '<input id="cn-fixado" maxlength="' + CANAL_LETRAS +
    '" placeholder="deixe vazio para tirar o aviso" value="' +
    escaparTexto(c.fixado || "") + '">' +
    '<p class="est-nota">Aparece para todo mundo, acima das mensagens.</p></div>' +
    '<label class="enq-check"><input type="checkbox" id="cn-trancado"' +
    (c.trancado ? " checked" : "") + "> Trancar o canal (só leitura)</label>" +
    '<div class="pf-campo"><label>Modo devagar</label>' +
    '<div class="pf-barra-l"><span>Espera</span>' +
    '<input type="range" id="cn-devagar" min="0" max="' + CANAL_DEVAGAR_MAX +
    '" step="5" value="' + (c.devagar || 0) + '">' +
    '<b id="cn-devagar-n">' + (c.devagar ? c.devagar + "s" : "desligado") + "</b></div>" +
    '<p class="est-nota">Quanto cada pessoa espera entre uma mensagem e outra. ' +
    "Você não espera.</p></div>" +
    '<button class="est-bt" id="cn-salvar">Salvar</button>';
}

function canalAbrirPainel(id) {
  if (!canalSouDono()) { estAvisar("Só o dono do jogo mexe nos canais."); return; }
  estJanela("Canal #" + canalTitulo(id), canalPainelHTML(id), () => {
    const dev = $("cn-devagar"), devN = $("cn-devagar-n");
    if (dev) dev.addEventListener("input", () => {
      if (devN) devN.textContent = dev.value === "0" ? "desligado" : dev.value + "s";
    });
    const bt = $("cn-salvar");
    if (bt) bt.addEventListener("click", async () => {
      bt.disabled = true;
      const ok = await canalGuardar(id, {
        titulo: ($("cn-titulo") || {}).value || "",
        sobre: ($("cn-sobre") || {}).value || "",
        fixado: ($("cn-fixado") || {}).value || "",
        trancado: !!($("cn-trancado") || {}).checked,
        devagar: parseInt(($("cn-devagar") || {}).value || 0, 10)
      });
      bt.disabled = false;
      if (ok) { estFecharJanela(); estAvisar("Canal salvo."); estPintar(true); }
    });
  });
}

/* o aviso fixado, desenhado acima das mensagens */
function canalFixadoHTML(id) {
  const c = canalDe(id);
  if (!c.fixado) return "";
  return '<div class="cn-fixado"><b>📌</b><span>' + escaparLongo(c.fixado) + "</span></div>";
}
