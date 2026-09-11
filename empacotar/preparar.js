/* Copia o jogo da raiz do repositório para empacotar/www/
   e prepara os assets de ícone/splash usados pelo @capacitor/assets. */
const fs = require("fs");
const path = require("path");

const raiz = path.join(__dirname, "..");
const www = path.join(__dirname, "www");
const assets = path.join(__dirname, "assets");

const ARQUIVOS = ["index.html", "config.js", "versao.json", "manifest.json", "icon.svg", "icon-192.png", "icon-512.png"];

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

/* A Apple e o Google não deixam vender coisa do jogo por fora do pagamento
   deles. A nossa loja é por Pix: no navegador tudo bem, dentro do app baixado
   da loja é recusa na revisão. Esta marca desliga a loja de dinheiro (o jogo
   inteiro continua igual; só a compra com dinheiro sai).

   Se um dia o pagamento das lojas for implementado de verdade, é aqui que se
   volta atrás — e aí a loja precisa usar o sistema DELES, não o Pix. */
const MARCA = "<script>window.NN_EMPACOTADO = true;</script>\n";
/* procura a MARCA inteira, não a palavra: o próprio jogo cita
   NN_EMPACOTADO no código, e procurar só a palavra fazia o injetor
   achar que já tinha marcado e ir embora sem marcar nada. */
if (html.indexOf(MARCA.trim()) < 0) {
  const i = html.indexOf("<body>");
  if (i < 0) throw new Error("não achei <body> no index.html");
  html = html.slice(0, i + 6) + "\n" + MARCA + html.slice(i + 6);
  console.log("marcado: sem loja de dinheiro (regra das lojas)");
}
fs.writeFileSync(idx, html);

// ícone-mestre para gerar todos os tamanhos das lojas
const iconeMestre = path.join(raiz, "loja", "icones", "icon-1024-appstore.png");
if (fs.existsSync(iconeMestre)) {
  fs.copyFileSync(iconeMestre, path.join(assets, "icon.png"));
  fs.copyFileSync(iconeMestre, path.join(assets, "logo.png"));
  console.log("copiado: assets/icon.png (1024x1024)");
}

console.log("\nPronto. Agora rode:  npm run android   (ou)   npm run ios");
