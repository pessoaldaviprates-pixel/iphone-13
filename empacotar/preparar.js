/* Copia o jogo da raiz do repositório para empacotar/www/
   e prepara os assets de ícone/splash usados pelo @capacitor/assets. */
const fs = require("fs");
const path = require("path");

const raiz = path.join(__dirname, "..");
const www = path.join(__dirname, "www");
const assets = path.join(__dirname, "assets");

const ARQUIVOS = ["index.html", "config.js", "manifest.json", "icon.svg", "icon-192.png", "icon-512.png"];

fs.mkdirSync(www, { recursive: true });
fs.mkdirSync(assets, { recursive: true });

for (const f of ARQUIVOS) {
  const de = path.join(raiz, f);
  if (fs.existsSync(de)) {
    fs.copyFileSync(de, path.join(www, f));
    console.log("copiado:", f);
  }
}

// o app empacotado não usa service worker (o conteúdo já vem embutido)
const idx = path.join(www, "index.html");
let html = fs.readFileSync(idx, "utf8");
html = html.replace('<link rel="manifest" href="manifest.json">', "");
fs.writeFileSync(idx, html);

// ícone-mestre para gerar todos os tamanhos das lojas
const iconeMestre = path.join(raiz, "loja", "icones", "icon-1024-appstore.png");
if (fs.existsSync(iconeMestre)) {
  fs.copyFileSync(iconeMestre, path.join(assets, "icon.png"));
  fs.copyFileSync(iconeMestre, path.join(assets, "logo.png"));
  console.log("copiado: assets/icon.png (1024x1024)");
}

console.log("\nPronto. Agora rode:  npm run android   (ou)   npm run ios");
