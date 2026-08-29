# 🚀 Neon Nebula

Jogo de tiro espacial **completo para celular**, feito em HTML5 — sem dependências, sem build, sem anúncios. Funciona offline (PWA) e pode ser instalado na tela inicial do celular.

## Como jogar

- **Arraste o dedo** em qualquer lugar da tela para pilotar a nave (o tiro é automático)
- No computador: setas ou **WASD** para mover, **P**/Esc para pausar
- **120 fases** divididas em 6 setores, com **chefe a cada 5 fases** (cada vez mais fortes)
- Inimigos soltam **cristais ◆** e itens:
  - **W** (ciano) — melhora a arma (até tiro triplo)
  - **S** (âmbar) — escudo
  - **♥** (rosa) — vida extra
- Todo o progresso (fases, cristais, melhorias, habilidades e recorde) fica salvo no aparelho

## Loja de melhorias

Gaste cristais em 6 melhorias permanentes, cada uma com vários níveis: **Canhões** (dano), **Cadência** (velocidade de tiro), **Casco** (vidas), **Escudo** (duração), **Motores** (agilidade) e **Coletor** (mais cristais). Você começa cada fase já mais forte.

## Hangar — 50 naves

São **50 naves**, cada uma com um **poder próprio** e preço crescente (da Vaga-Lume grátis até a Infinito). Os poderes se repetem em versões cada vez mais fortes: Devastadora (+dano), Rajada (+cadência), Blindada (+vidas), Dourada (+cristais), Fantasma (+escudo), Vampira (vida ao matar), Congelante (deixa inimigos lentos), Explosiva (dano em área), Enxame (drone de combate) e Magnética (atrai itens).

Cada nave ainda pode ser **tunada com 5 peças** (estilo jogo de carro), cada uma com 5 níveis: **Canhão**, **Turbina**, **Blindagem**, **Motor** e **Reator** — as peças são por nave, então vale a pena equipar a sua favorita.

## Onde o progresso é salvo (banco de dados)

O jogo salva em **três camadas**, e a mais recente vence:

1. **localStorage** — salvamento instantâneo a cada ação
2. **IndexedDB** — banco de dados local do navegador, mais durável (se o localStorage for apagado, o jogo restaura daqui)
3. **Nuvem** *(versão publicada como Artifact do Claude)* — o botão **☁ Salvar na nuvem** no menu grava o progresso dentro da própria página publicada, então ele acompanha o link em qualquer aparelho

## Árvore de habilidades

Cada fase concluída dá **1 ponto de habilidade** — são **120 nós** em 3 ramos (Ataque, Defesa e Recursos), desbloqueados em sequência. A cada 10 nós de um ramo há uma habilidade especial:

| Ramo | Habilidades especiais |
|---|---|
| **Ataque** | Tiro Lateral · Mísseis Teleguiados · Golpe Crítico · Perfuração |
| **Defesa** | Escudo Inicial · Nanobots · Sistema de Emergência · Fortaleza |
| **Recursos** | Ímã de Cristais · Sorte · Comerciante · Nova de Choque |

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
