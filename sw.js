/* Neon Nebula — service worker
   Estratégia:
   - Arquivos do jogo (HTML/JS): rede primeiro, cache como reserva.
     Assim uma versão nova chega assim que você abre o jogo com internet,
     e ele continua funcionando offline com a última versão baixada.
   - Ícones, manifesto e fontes: cache primeiro (não mudam quase nunca).      */
const CACHE = "neon-nebula-v45";
const ASSETS = [
  "./",
  "./index.html",
  "./config.js",
  "./versao.json",
  "./manifest.json",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* o jogo pode pedir a troca imediata pela versão nova */
self.addEventListener("message", (event) => {
  if (event.data === "atualizar-agora") self.skipWaiting();
});

function ehArquivoDoJogo(req, url) {
  if (url.pathname.endsWith("versao.json")) return true;   // sempre da rede
  if (req.mode === "navigate") return true;
  if (url.origin !== location.origin) return false;
  return /\.(html|js)$/.test(url.pathname) || url.pathname.endsWith("/");
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  // não interfere nas chamadas da nuvem (Firebase e afins)
  if (url.origin !== location.origin &&
      url.hostname !== "fonts.googleapis.com" &&
      url.hostname !== "fonts.gstatic.com") return;

  if (ehArquivoDoJogo(event.request, url)) {
    // rede primeiro: sempre pega a versão mais nova quando há internet
    event.respondWith(
      fetch(event.request)
        .then((resp) => {
          if (resp && resp.ok) {
            const copia = resp.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copia));
          }
          return resp;
        })
        .catch(() => caches.match(event.request).then((c) => c || caches.match("./index.html")))
    );
    return;
  }

  // demais arquivos: cache primeiro
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((resp) => {
        if (resp && resp.ok) {
          const copia = resp.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copia));
        }
        return resp;
      }).catch(() => cached);
    })
  );
});
