const path = require('path');
const JOGO = 'file://' + path.join(__dirname, '..', 'index.html');
const { chromium } = require('playwright');
const fs = require('fs');
  'window.NN_CONFIG = { NUVEM_URL: "http://127.0.0.1:8099" };');
const URL = JOGO + '?nuvem=http://127.0.0.1:8099';
async function novoPiloto(page, nome, padrao) {
  await page.goto(URL); await page.waitForTimeout(900);
  await page.fill('#new-name', nome); await page.tap('#btn-new'); await page.waitForTimeout(350);
  for (let i = 0; i < 2; i++) {
    await page.evaluate(pts => { senhaEstado.seq = pts.slice(); senhaEstado.desenhando = true; senhaSoltar(); }, padrao);
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(500);
}
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const errs = []; const out = {};
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  p.on('pageerror', e => errs.push('ERRO: ' + e.message));
  await novoPiloto(p, 'Davi', [0,1,2,5]);

  // 1) BUG DA SENHA: nada sobra depois de entrar
  out.bugSenha = await p.evaluate(() => ({
    modo: S.mode,
    estadoLimpo: senhaEstado === null,
    telasVisiveis: Object.keys(SCREENS).filter(k => SCREENS[k].classList.contains('show'))
  }));

  // 2) frota nova
  out.frota = await p.evaluate(() => ({
    total: SHIPS.length, maverick: MAVERICK, b2: B2,
    nomeMav: SHIPS[MAVERICK].name, nomeB2: SHIPS[B2].name,
    exemplo: { nome: SHIPS[60].name, virtude: SHIPS[60].virtude, defeito: SHIPS[60].defeito },
    trocas: [...new Set(SHIPS.filter(s => s.troca).map(s => s.troca))]
  }));

  // 3) ranks
  out.ranks = await p.evaluate(() => RANKS.map(r => r.sim + ' ' + r.nome + ' @' + r.min));

  // 4) IA adaptativa: sem upgrades x com tudo no máximo
  out.ia = await p.evaluate(() => {
    const medir = () => { atualizarLeitura(); const a = adapt();
      return { leitura: Math.round(LEITURA.geral*100)/100, defesa: Math.round(LEITURA.defesa*100)/100,
               qtd: Math.round(a.quantidade*100)/100, vida: Math.round(a.vida*100)/100,
               tiro: Math.round(a.tiro*100)/100, dano: Math.round(a.dano*100)/100 }; };
    const zerado = medir();
    for (const u of UPGRADES) save.upgrades[u.id] = u.max;
    for (const bch of ['atk','def','res']) for (let t=1;t<=40;t++) save.skills[bch+t]=true;
    save.parts[save.ship] = { cannon:5, turbine:5, armor:5, engine:5, reactor:5 };
    calcStats();
    const cheio = medir();
    // só defesa no máximo
    for (const u of UPGRADES) save.upgrades[u.id] = 0;
    save.skills = {}; save.parts = {};
    save.upgrades.hull = 5; save.upgrades.shield = 5;
    calcStats();
    const soDefesa = medir();
    return { zerado, cheio, soDefesa };
  });
  // quantidade de inimigos numa onda real
  out.ondas = await p.evaluate(() => {
    const conta = () => { startGame(10); return S.toSpawn; };
    save.upgrades = { dmg:0, rate:0, hull:0, shield:0, speed:0, luck:0 }; save.skills={}; save.parts={};
    calcStats(); const semUp = conta();
    save.upgrades.hull = 5; save.upgrades.shield = 5; calcStats(); const comDefesa = conta();
    for (const u of UPGRADES) save.upgrades[u.id] = u.max; calcStats(); const tudo = conta();
    return { semUp, comDefesa, tudo };
  });

  // 5) modo justo no multijogador
  out.justo = await p.evaluate(() => {
    for (const u of UPGRADES) save.upgrades[u.id] = u.max;
    save.ship = 0; calcStats();
    const normal = { dano: Math.round(ST.dmg*100)/100, vida: ST.maxHp };
    MP.sala = '1234'; MP.modo = 'coop'; calcStats();
    const emSala = { dano: Math.round(ST.dmg*100)/100, vida: ST.maxHp, justo: modoJusto() };
    MP.sala = null; calcStats();
    return { normal, emSala };
  });

  // 6) 200 fases no cooperativo
  out.coop = await p.evaluate(() => {
    MP.sala = '1234'; MP.modo = 'coop';
    const r = { total: totalFasesDoModo(), ondasFase1: faseWaves(1), ondasFase200: faseWaves(200),
                chefe4: isBossFase(4), chefe5: isBossFase(5) };
    MP.sala = null; MP.modo = null;
    return Object.assign(r, { totalNormal: totalFasesDoModo() });
  });

  // 7) ADM: dar rank e efeito imediato na nuvem
  await p.evaluate(() => { save.upgrades = { dmg:0,rate:0,hull:0,shield:0,speed:0,luck:0 }; calcStats(); goMenu(); nuvemEnviar(true); });
  await p.waitForTimeout(1200);
  await p.tap('#btn-logout'); await p.waitForTimeout(300);
  await p.tap('#btn-goto-adm'); await p.waitForTimeout(300);
  await p.fill('#adm-nick','Cr1cket'); await p.fill('#adm-pass', 'neonadmin'); await p.tap('#btn-adm-enter'); await p.waitForTimeout(1400);
  await p.evaluate(() => admSelect('Davi')); await p.waitForTimeout(300);
  await p.selectOption('#adm-rank-sel', '4600');
  await p.tap('#adm-rank-dar'); await p.waitForTimeout(400);
  out.rankLocal = await p.evaluate(() => ({ rank: ROOT.profiles['Davi'].rank, nome: nomeDoRank(ROOT.profiles['Davi'].rank) }));
  // online: zerar e ver a lista mudar na hora
  await p.evaluate(() => {
    const alvo = admNuvemLista.find(x => x.nome === 'Davi');
    admNuvemSelecionar(alvo);
  });
  await p.waitForTimeout(500);
  const antesZerar = await p.evaluate(() => {
    const a = admNuvemLista.find(x => x.nome === 'Davi');
    return { cristais: a.cristais, fase: a.fase };
  });
  await p.evaluate(() => { admNuvemAlvo.__f = 1; });
  await p.evaluate(()=>{try{admIrPara('acoes','dar')}catch(e){}}); await p.waitForTimeout(300);
  await p.fill('#adm-nuvem-gem', '55555'); await p.tap('#adm-nuvem-set'); await p.waitForTimeout(900);
  const depoisDar = await p.evaluate(async () => {
    const nuvem = await nuvemReq('pilotos');
    const id = Object.keys(nuvem).find(k => nuvem[k].nome === 'Davi');
    return { naLista: admNuvemLista.find(x => x.nome === 'Davi').cristais, naNuvem: nuvem[id].cristais };
  });
  await p.tap('#adm-nuvem-zerar'); await p.waitForTimeout(300);
  await p.tap('#adm-nuvem-zerar'); await p.waitForTimeout(1000);
  const depoisZerar = await p.evaluate(async () => {
    const nuvem = await nuvemReq('pilotos');
    const id = Object.keys(nuvem).find(k => nuvem[k].nome === 'Davi');
    return { naLista: admNuvemLista.find(x => x.nome === 'Davi').cristais, naNuvem: nuvem[id].cristais, fase: nuvem[id].fase };
  });
  out.admImediato = { antesZerar, depoisDar, depoisZerar };
  await p.screenshot({ path: 'adm-v3.png', fullPage: true });

  console.log(JSON.stringify({ out, errs }, null, 1));
  await b.close();
  process.exit(errs.length ? 1 : 0);
})().catch(e => {
  console.error('FATAL', e.message.split('\n')[0]); process.exit(2);
});
