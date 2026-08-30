# 🚀 Neon Nebula

Jogo de tiro espacial **completo para celular**, feito em HTML5 — sem dependências, sem build, sem anúncios. Funciona offline (PWA) e pode ser instalado na tela inicial do celular.

## Como jogar

- Na abertura, **crie seu piloto** (tela de login) — cada piloto tem o próprio progresso salvo
- **Arraste o dedo** em qualquer lugar da tela para pilotar a nave (o tiro é automático)
- No computador: setas ou **WASD** para mover, **P**/Esc para pausar, **X** para a ultimate, **C** para a capa
- **120 fases** divididas em 6 setores, com **chefe a cada 5 fases** (cada vez mais fortes)
- O botão redondo **ULT** (canto inferior direito) carrega conforme você destrói inimigos: cada nave tem uma **ultimate diferente**
- Inimigos soltam **cristais ◆** e itens:
  - **W** (ciano) — melhora a arma (até tiro triplo)
  - **S** (âmbar) — escudo
  - **♥** (rosa) — vida extra
- Todo o progresso (fases, cristais, naves, pinturas, amuletos, habilidades e recorde) fica salvo por piloto

## Loja de melhorias

Gaste cristais em 6 melhorias permanentes, cada uma com vários níveis: **Canhões** (dano), **Cadência** (velocidade de tiro), **Casco** (vidas), **Escudo** (duração), **Motores** (agilidade) e **Coletor** (mais cristais). Você começa cada fase já mais forte.

## Hangar — 50 naves

São **50 naves**, cada uma com um **poder próprio** e preço crescente (da Vaga-Lume grátis até a Infinito). Os poderes se repetem em versões cada vez mais fortes: Devastadora (+dano), Rajada (+cadência), Blindada (+vidas), Dourada (+cristais), Fantasma (+escudo), Vampira (vida ao matar), Congelante (deixa inimigos lentos), Explosiva (dano em área), Enxame (drone de combate) e Magnética (atrai itens).

Cada nave ainda pode ser **tunada com 5 peças** (estilo jogo de carro), cada uma com 5 níveis: **Canhão**, **Turbina**, **Blindagem**, **Motor** e **Reator** — as peças são por nave, então vale a pena equipar a sua favorita.

Toda nave tem uma **cutscene de apresentação** (nave girando em 3D, nome, poder, ultimate e uma frase), que toca ao comprá-la e pode ser revista no hangar.

## Ultimates — uma para cada nave

O botão **ULT** carrega ao destruir inimigos e cada família de nave tem a sua:

| Ultimate | O que faz |
|---|---|
| **Fúria Total** | 5s de dano triplo e cadência dobrada |
| **Tempestade de Aço** | 3 rajadas circulares de tiros |
| **Bastião** | Escudo cheio, 6s invencível e limpa as balas |
| **Chuva Dourada** | Faz chover 14 cristais |
| **Dobra Fantasma** | 5s invisível |
| **Ceifar Almas** | Fere todos na tela e rouba vida |
| **Zero Absoluto** | Congela tudo por 4s |
| **Nova Estelar** | Explosão gigante que limpa balas |
| **Colmeia** | 4 drones extras por 8s |
| **Singularidade** | Puxa os inimigos e colapsa |

## Oficina 3D

No hangar, a nave em uso abre a **Oficina**: um visualizador **3D de verdade** (arraste para girar) onde você pode, pagando com cristais:

- **Pintar o casco** — 12 cores (◆100 cada)
- **Trocar o brilho do motor** — 8 cores (◆80 cada)
- **Editar o armamento** — Pulso (padrão), **Laser** (+35% cadência), **Plasma** (+65% dano) e **Vulcan** (quase o dobro de tiros); o preço acompanha o valor da nave

## Chefes — 6 inimigos totalmente diferentes

Nada de "bolas": cada chefe tem forma, ataque e ponto fraco próprios, e eles se revezam a cada 5 fases.

| Chefe | Como luta |
|---|---|
| **Ceifador Carmesim** | Foice que avança em investidas na sua direção e solta leques de tiros |
| **Colosso de Ferro** | Nave-fortaleza: destrua as **duas torres** antes de o núcleo ficar vulnerável |
| **Serpente do Vazio** | Cobra de 9 segmentos que serpenteia pela tela — todo o corpo é alvo |
| **Rainha do Enxame** | Colmeia que gera drones e dispara espirais duplas |
| **Prisma Eterno** | Cristal giratório com **laser gigante**: a linha tracejada avisa antes de disparar |
| **Olho do Abismo** | Teleporta pela tela, a íris te acompanha e lança orbes teleguiadas |

## Amuletos e relíquias

Na tela **Relíquias** você equipa até **3 amuletos** ao mesmo tempo. Eles caem ao derrotar um chefe pela primeira vez ou saem do **Baú Estelar** (◆300), em 4 raridades — Comum, Raro, Épico e **Lendário**.

- Amuletos normais dão buffs: vida, escudo, dano, cadência, cristais, sorte, ímã e agilidade
- Amuletos **lendários** especiais:
  - **Capa da Invisibilidade** — botão CAPA: 4s invisível, os inimigos não te veem nem atiram, e você os destrói por contato (recarga de 25s)
  - **Coração de Fênix** — uma ressurreição extra por fase
  - **Núcleo Temporal** — a ultimate carrega 35% mais rápido
- Amuletos repetidos podem ser **vendidos** por cristais

## Painel de administrador

Na tela de login há o botão **⚙ PAINEL ADM**. No primeiro acesso, a senha que você digitar vira a senha do administrador (fica gravada no save). Lá dentro dá para **puxar qualquer jogador pelo nome** e conceder:

- +10.000 cristais · +25 pontos de habilidade
- Todas as 50 naves · Todas as 120 fases
- A Capa da Invisibilidade lendária
- Zerar o jogador (com confirmação em dois toques)

> O painel é **local**: administra os pilotos salvos neste jogo (aparelho + save da nuvem), já que o jogo não usa servidor.

## Onde o progresso é salvo (banco de dados)

O banco de dados guarda **todos os pilotos** (`perfil → progresso`) e salva em **três camadas**; na hora de carregar, o perfil com data mais recente vence:

1. **localStorage** — salvamento instantâneo a cada ação
2. **IndexedDB** — banco de dados local do navegador, mais durável (se o localStorage for apagado, o jogo restaura daqui)
3. **Nuvem** *(versão publicada como Artifact do Claude)* — o botão **☁ Salvar na nuvem** no menu grava todos os perfis dentro da própria página publicada, então eles acompanham o link em qualquer aparelho

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

### Instalar como app no celular (sem loja e sem servidor)
Com o jogo publicado em um endereço `https`, abra-o no Chrome (Android) ou Safari (iPhone) e use **"Adicionar à tela inicial"**. Ele abre em tela cheia e funciona offline.

O repositório ainda gera um **APK do Android sozinho**: crie uma tag (`git tag v1.0.0 && git push origin v1.0.0`) e o GitHub Actions compila e publica o instalador em *Releases*. O passo a passo completo está em **[INSTALAR.md](INSTALAR.md)**, e a página `baixar.html` já serve de página de instalação para compartilhar.

### Google Play e App Store
Há um guia completo, passo a passo, em **[PUBLICAR.md](PUBLICAR.md)** — com os dois caminhos de empacotamento (PWABuilder e Capacitor), custos, exigências de cada loja e as armadilhas comuns.

Os materiais obrigatórios já estão prontos na pasta [`loja/`](loja/): ícones nos formatos certos, gráfico de destaque, 8 capturas de tela em cada resolução exigida, os textos da ficha e a política de privacidade. O projeto Capacitor para gerar os apps está em [`empacotar/`](empacotar/).

## Arquivos

| Arquivo | Função |
|---|---|
| `index.html` | O jogo inteiro (HTML + CSS + JavaScript) |
| `manifest.json` | Manifesto PWA (nome, ícones, tela cheia) |
| `sw.js` | Service worker — modo offline |
| `icon.svg`, `icon-192.png`, `icon-512.png` | Ícones do app |
| `INSTALAR.md` | Como distribuir de graça, sem loja e sem servidor |
| `baixar.html` | Página de instalação para compartilhar com os jogadores |
| `.github/workflows/apk.yml` | Robô que compila o APK do Android automaticamente |
| `PUBLICAR.md` | Guia de publicação na Google Play e na App Store |
| `loja/` | Ícones, banner, capturas e textos prontos para as lojas |
| `empacotar/` | Projeto Capacitor para gerar os apps Android e iOS |

Sons são sintetizados em tempo real com WebAudio — nenhum arquivo de áudio é necessário.
