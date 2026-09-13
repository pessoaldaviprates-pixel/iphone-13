/* servidor que imita a API REST do Firebase Realtime Database */
const http = require('http');
const db = {};
const inscritos = [];
function avisar(path) {
  const alvo = path.join('/');
  for (const i of inscritos) {
    // avisa quem escuta esse no ou um pai dele
    if (alvo === i.chave || alvo.indexOf(i.chave + '/') === 0 || i.chave === '') {
      const rel = i.chave === '' ? '/' + alvo : ('/' + alvo.slice(i.chave.length)).replace(/^\/\//, '/');
      try {
        i.res.write('event: put\ndata: ' +
          JSON.stringify({ path: rel === '/' ? '/' : rel, data: get(path) }) + '\n\n');
      } catch (e) {}
    } else if (i.chave.indexOf(alvo + '/') === 0 || alvo === '') {
      try {
        i.res.write('event: put\ndata: ' +
          JSON.stringify({ path: '/', data: get(i.chave.split('/').filter(Boolean)) }) + '\n\n');
      } catch (e) {}
    }
  }
}
function get(path) {
  let cur = db;
  for (const k of path) { if (cur == null) return null; cur = cur[k]; }
  return cur === undefined ? null : cur;
}
function put(path, val) {
  let cur = db;
  for (let i = 0; i < path.length - 1; i++) { cur[path[i]] = cur[path[i]] || {}; cur = cur[path[i]]; }
  cur[path[path.length - 1]] = val;
}
function del(path) {
  let cur = db;
  for (let i = 0; i < path.length - 1; i++) { if (!cur[path[i]]) return; cur = cur[path[i]]; }
  delete cur[path[path.length - 1]];
}
/* imita REGRAS ANTIGAS: com FB_BLOQUEAR="amigos,suporte" o servidor
   recusa gravacao nesses galhos, como o Firebase faria (401)          */
const BLOQUEADOS = (process.env.FB_BLOQUEAR || '').split(',').filter(Boolean);
function bloqueado(path) {
  return BLOQUEADOS.indexOf(path[0]) >= 0;
}
/* ---------------------------------------------------------------------
   CONSULTAS: orderBy="$key" com limitToLast / endAt / startAt
   ---------------------------------------------------------------------
   O Firebase de verdade sabe responder "as 40 ultimas chaves deste no".
   Este falso ignorava e devolvia o no INTEIRO -- entao a paginacao do
   bate-papo passava no teste sem nunca ter sido testada: qualquer numero
   de mensagens cabia, porque vinham todas. Agora ele obedece a consulta,
   e o teste passa a dizer a verdade.

   So o orderBy="$key" esta implementado, que e o unico que o jogo usa
   (ordenar por chave nao precisa de indice nas regras, e foi por isso
   que a chave de cada mensagem virou o relogio).                       */
function aplicarConsulta(dados, url) {
  const ordem = (url.searchParams.get('orderBy') || '').replace(/"/g, '');
  if (ordem !== '$key' || !dados || typeof dados !== 'object' || Array.isArray(dados)) return dados;
  let chaves = Object.keys(dados).sort();
  const tira = q => { const v = url.searchParams.get(q); return v === null ? null : v.replace(/"/g, ''); };
  const de = tira('startAt'), ate = tira('endAt');
  if (de !== null) chaves = chaves.filter(k => k >= de);
  if (ate !== null) chaves = chaves.filter(k => k <= ate);
  const ultimas = parseInt(url.searchParams.get('limitToLast') || '0', 10);
  const primeiras = parseInt(url.searchParams.get('limitToFirst') || '0', 10);
  if (ultimas > 0) chaves = chaves.slice(-ultimas);
  else if (primeiras > 0) chaves = chaves.slice(0, primeiras);
  const fora = {};
  for (const k of chaves) fora[k] = dados[k];
  return Object.keys(fora).length ? fora : null;
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const path = url.pathname.replace(/\.json$/, '').split('/').filter(Boolean);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (!/text\/event-stream/.test(req.headers.accept || '')) res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') { res.end(); return; }
  if (req.method === 'GET' && /text\/event-stream/.test(req.headers.accept || '')) {
    // imita o streaming do Firebase: manda o estado e depois cada mudanca
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.write('event: put\ndata: ' + JSON.stringify({ path: '/', data: aplicarConsulta(get(path), url) }) + '\n\n');
    const chave = path.join('/');
    /* a consulta fica guardada: quando algo muda, o que for empurrado
       tem que respeitar a mesma janela que o primeiro envio */
    const insc = { chave, res, url };
    inscritos.push(insc);
    const ka = setInterval(() => { try { res.write('event: keep-alive\ndata: null\n\n'); } catch(e){} }, 15000);
    req.on('close', () => { clearInterval(ka); const i = inscritos.indexOf(insc); if (i >= 0) inscritos.splice(i, 1); });
    return;
  }
  if (req.method === 'GET') {
    if (bloqueado(path)) { res.statusCode = 401; res.end('{"error":"Permission denied"}'); return; }
    res.end(JSON.stringify(aplicarConsulta(get(path), url))); return;
  }
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    if (bloqueado(path)) { res.statusCode = 401; res.end('{"error":"Permission denied"}'); return; }
    if (req.method === 'PUT') { put(path, JSON.parse(body || 'null')); avisar(path); res.end(body || 'null'); }
    else if (req.method === 'PATCH') { const o = JSON.parse(body || '{}'); for (const k in o) put(path.concat(k), o[k]); avisar(path); res.end(body || 'null'); }
    else if (req.method === 'DELETE') { del(path); avisar(path); res.end('null'); }
    else { res.statusCode = 405; res.end('null'); }
  });
}).listen(8099, () => console.log('fake firebase em http://127.0.0.1:8099'));
