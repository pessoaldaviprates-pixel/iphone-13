# Publicar o Neon Nebula no itch.io

Duas coisas, nesta ordem: **as medidas** (que tamanho pôr na janela do
itch, e que imagens mandar) e **a segurança** (o que tem que ser feito
antes de o jogo ficar aberto para estranhos).

---

# 1. O tamanho da janela

O itch.io embute o jogo num quadro de tamanho **fixo**, que você digita
em *Edit game → Embed options → Viewport dimensions*.

Os números abaixo foram **medidos**, não chutados: o jogo foi aberto num
Chromium em dezesseis tamanhos, e em cada um foi conferido se alguma
coisa ficava fora do alcance do dedo, quantos cartões o menu precisou
esconder para caber, e se sobrava rolagem para os lados.

| tamanho | como fica | cartões escondidos |
|---|---|---|
| 320×480 | **rola** — cabe rolando, não de uma vez | 0 |
| 360×640 | cabe | 2 |
| 390×844 | cabe | 1 |
| 640×480 | **rola** | 0 |
| **800×600** | cabe | 1 |
| **960×600** | cabe · vira o formato de computador | 1 |
| 1024×768 | cabe | 2 |
| **1280×720** | cabe · com folga | 2 |
| 1366×768 | cabe | 2 |

Nenhum tamanho testado teve rolagem para os lados.

## O que recomendo, e por quê

**Ponha `1280 × 720`.**

- É o único da lista com folga de verdade, e é a proporção que o itch
  mostra bonito na página do jogo.
- **Acima de 900px de largura o jogo troca de formato sozinho**: a barra
  de três ícones sai de baixo e vira uma fileira na esquerda, com a lista
  de conversas, a conversa no meio e *Jogando agora* na direita. Quem
  abrir no computador merece esse formato. Abaixo de 900 ele fica no
  formato de celular mesmo num monitor grande.
- **Marque "Mobile friendly"** e **"Fullscreen button"** nas opções do
  itch. Quem abrir pelo celular passa a receber o formato de celular, que
  é o que o jogo faz melhor.

Se quiser um quadro menor na página, **960×600** funciona e mantém o
formato de computador. Menor que isso, prefira **800×600** — abaixo de
600px de altura o menu começa a rolar em vez de caber.

## "Cartões escondidos" não é problema

O menu tem cartões opcionais (o presente do dia, as missões) e ele mesmo
guarda os que não couberem, em vez de deixar botão fora do alcance do
dedo. Eles continuam acessíveis pelas portas do menu. É por isso que a
coluna existe na tabela: **cabe** e **cabe inteiro** não são a mesma
coisa, e você merecia ver os dois números.

---

# 2. As imagens

## O que você já tem

| arquivo | tamanho | peso |
|---|---|---|
| `icon-512.png` | 512×512 RGBA | 256 KB |
| `icon-192.png` | 192×192 RGBA | 47 KB |
| `icon.svg` | vetor | 4,7 KB |
| `index.html` (o jogo) | — | **1,99 MB** |

O jogo inteiro tem 1,99 MB num arquivo só. O itch aceita muito mais que
isso, então sobe numa boa.

## O que o itch pede

| onde | tamanho | obrigatório |
|---|---|---|
| **Capa** (cover image) | **630×500** | sim — é o que aparece na busca e nas listas |
| Capturas de tela | qualquer, mesma proporção entre si | não, mas vale muito |
| Banner do topo | 960×400 ou mais largo | não |

**A capa você ainda não tem.** O `icon-512.png` é quadrado (512×512) e a
capa é 630×500 — quase 5:4. Esticar o ícone quadrado para 630×500 deixa a
nave achatada. Duas saídas:

1. montar a capa com o ícone **no meio** e o fundo da nebulosa em volta,
   preenchendo os 630×500;
2. tirar uma captura do menu do jogo em 1280×720 e recortar o pedaço de
   630×500 que pega a marca NEON NEBULA e a nave.

Para as capturas de tela, abra o jogo em **1280×720** e fotografe: o
menu, uma fase, a Estação (que é o que diferencia o jogo) e a tela de
personalização do perfil.

---

# 3. Segurança — leia antes de publicar

Rode isto e conserte o que ele reclamar:

```sh
python3 testes/confere_seguranca.py
```

## A coisa mais importante desta página

O Neon Nebula é **um arquivo só que roda no navegador de quem joga**.
Isso quer dizer uma coisa que não tem volta: **tudo o que está no jogo
está nas mãos de quem abrir o jogo**. Um `Ctrl+U` mostra o código
inteiro, senhas embaralhadas incluídas.

Então nenhuma checagem que esteja dentro do jogo é uma tranca. Nem a
senha do painel, nem o `só o dono mexe nos canais`, nem o nível do
NeoNebula. Tudo isso é **arrumação**: serve para ninguém apertar sem
querer um botão que não é dele.

**A tranca de verdade são as regras do Firebase.** Elas rodam no servidor
do Google e ninguém contorna, nem com o console aberto.

## O que fazer, em ordem

### 1. Trocar a senha do painel (obrigatório)

Ela está na de fábrica, e a senha estava escrita num comentário do lado
do embaralhado — ou seja, entregue. O comentário já saiu; falta você
escolher uma senha:

```sh
python3 testes/senha_adm.py
```

Cole o número em `const ADM_MASTER`, em `fonte/04-jogo-1.js`. **Não
escreva a senha por extenso em lugar nenhum do código.**

### 2. Apertar as regras do Firebase (obrigatório)

As regras de hoje (`NUVEM.md`) deixam **qualquer pessoa ler e escrever
quase tudo**. Entre amigos isso passa. Num lugar público, não: dá para
apagar o ranking inteiro com um comando, sem nem abrir o jogo.

O ponto mais grave é o `contas`:

```json
"contas": { "$id": { ".read": true, ".write": true } }
```

Ali dentro ficam o **save inteiro e a senha embaralhada de cada
jogador**. Com `.read: true`, qualquer pessoa baixa tudo de todo mundo. E
a senha é um desenho de padrão embaralhado com um algoritmo curto: são
poucas combinações possíveis, e quem baixar a lista descobre os desenhos
em segundos.

O mínimo, antes de abrir para estranhos:

- `contas` → tirar o `.read: true`. Quem precisa ler a própria conta é o
  próprio dono dela, e isso pede **Firebase Authentication** — que é a
  única saída correta e é trabalho de verdade, não uma linha.
- `conversas/__canais` → só leitura para todo mundo. Hoje o `só o dono
  mexe nos canais` mora no jogo, e o jogo está no computador de quem
  joga.
- `pilotos`, `sugestoes`, `mundo` → pense num limite de tamanho, senão
  uma pessoa sozinha enche o banco.

### 3. Saiba o que continua frágil (e decida)

| o quê | o tamanho do problema |
|---|---|
| o dono é reconhecido pelo **nick** | qualquer pessoa cria uma conta chamada `cr1cket`. Quem barra é a senha do painel — que também está no arquivo |
| `CONTAS_SEM_SENHA = ["7anoS"]` | essa conta entra sem senha nenhuma. Num lugar público, qualquer um entra nela. **Tire antes de publicar** |
| senha dos jogadores | é um desenho, embaralhado com um algoritmo curto, num nó que hoje qualquer um lê. Protege contra um colega curioso, não contra alguém decidido |
| painel de administrador | contornável por quem abrir o console. As regras do Firebase são o que impede o estrago |

Nada disso impede de publicar um **jogo**. O que muda é a conta:
publicar num lugar público é aceitar que a parte online vai ser mexida
por gente que você não conhece. Se o ranking for vandalizado, é chato; se
a conta de alguém for invadida, é pior. Por isso o `contas` vem primeiro.

### 4. Se preferir publicar sem nuvem

Dá para subir no itch com o modo online **desligado** e manter o online
só na versão que você manda para os amigos:

```js
// config.js
window.NN_CONFIG = { NUVEM_URL: "" };
```

O jogo inteiro continua funcionando — fases, naves, progresso, tudo —
sem ranking, Estação, arena nem amigos. É a saída mais segura enquanto
as regras não estiverem apertadas, e leva trinta segundos.

---

# 4. A lista antes de apertar "publicar"

```sh
python3 testes/montar.py
./testes/check.sh
cd testes && ./testar.sh
python3 testes/confere_seguranca.py
python3 testes/confere_privacidade.py
```

- [ ] `config.js` aponta para o Firebase de verdade (ou está vazio)
- [ ] `ADM_MASTER` trocado, e a senha não está escrita em lugar nenhum
- [ ] `CONTAS_SEM_SENHA` vazio
- [ ] regras do Firebase apertadas (pelo menos o `contas`)
- [ ] no itch: `1280×720`, *Mobile friendly* e *Fullscreen button* marcados
- [ ] capa 630×500 enviada
- [ ] depois de publicar, **abra o link e confira o número da versão na
      tela** — publicar não é o mesmo que chegar
