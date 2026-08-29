# 🚀 Neon Nebula

Jogo de tiro espacial **completo para celular**, feito em HTML5 — sem dependências, sem build, sem anúncios. Funciona offline (PWA) e pode ser instalado na tela inicial do celular.

## Como jogar

- **Arraste o dedo** em qualquer lugar da tela para pilotar a nave (o tiro é automático)
- No computador: setas ou **WASD** para mover, **P**/Esc para pausar
- Sobreviva às ondas de inimigos — um **chefe** aparece a cada 5 ondas
- Pegue os cristais:
  - **W** (ciano) — melhora a arma (até tiro triplo)
  - **S** (âmbar) — escudo que absorve um golpe
  - **♥** (rosa) — vida extra
- O recorde fica salvo no aparelho

## Jogar agora

Abra o arquivo `index.html` em qualquer navegador — ou publique (abaixo) e abra o link no celular.

## Como publicar (grátis, em ~2 minutos)

### GitHub Pages
1. No GitHub, abra **Settings → Pages** deste repositório
2. Em **Source**, escolha **Deploy from a branch**, selecione a branch e a pasta **/ (root)** e salve
3. Em instantes o jogo estará no ar em `https://SEU-USUARIO.github.io/NOME-DO-REPO/`

### Outras opções
- **Netlify / Vercel**: arraste a pasta do projeto no painel — pronto
- **itch.io**: crie um projeto do tipo *HTML*, envie um `.zip` com todos os arquivos e marque `index.html` como principal

### Instalar como app no celular
Com o jogo publicado em um endereço `https`, abra-o no Chrome (Android) ou Safari (iPhone) e use **"Adicionar à tela inicial"**. Ele abre em tela cheia e funciona offline.

### Play Store (opcional)
O jogo já é um PWA válido (manifesto + service worker + ícones). Para gerar um app Android publicável na Play Store, use o [PWABuilder](https://www.pwabuilder.com/) ou [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) apontando para a URL publicada.

## Arquivos

| Arquivo | Função |
|---|---|
| `index.html` | O jogo inteiro (HTML + CSS + JavaScript) |
| `manifest.json` | Manifesto PWA (nome, ícones, tela cheia) |
| `sw.js` | Service worker — modo offline |
| `icon.svg`, `icon-192.png`, `icon-512.png` | Ícones do app |

Sons são sintetizados em tempo real com WebAudio — nenhum arquivo de áudio é necessário.
