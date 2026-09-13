# Neon Nebula

Jogo de nave em HTML5, feito para rodar bem em celular fraco e funcionar sem
internet. Sem framework, sem dependência: o que roda no navegador é um arquivo
só (`index.html`), com ~27 mil linhas.

## O que é cada coisa

| caminho | o que é |
|---|---|
| `index.html` | **o jogo** — é o que o navegador abre, o service worker guarda e vira o artifact. É montado, não editado à mão |
| `fonte/` | **onde se edita**: o mesmo jogo em 22 pedaços (ver `fonte/LEIAME.md`) |
| `config.js` | o endereço do Firebase. **Nunca** pode ser publicado apontando para teste |
| `sw.js` | service worker (jogo offline). O nome do cache sobe a cada versão |
| `versao.json` | versão publicada, lida pelo jogo para avisar que saiu coisa nova |
| `manifest.json`, `icon*` | instalação na tela inicial |
| `testes/` | a bateria de testes e as ferramentas (ver `testes/README.md`) |

## O ciclo de trabalho

```sh
# 1. edite os arquivos em fonte/
# 2. monte o index.html
python3 testes/montar.py

# 3. confira sintaxe, config e se fonte/ e index.html batem
./testes/check.sh

# 4. rode os testes (abrem o jogo de verdade num Chromium)
cd testes && ./testar.sh

# 5. só então publique
```

Se alguém editar o `index.html` direto (acontece), `python3 testes/separar.py`
traz a mudança de volta para `fonte/` e confere que nada se perdeu.

## Publicar uma versão

1. `const VERSAO` em `fonte/07-extras-2.js`. **Suba o segundo número**
   (7.0 → 7.1), não o terceiro: as cópias antigas comparam versão só até o
   segundo pedaço, e um 7.0.1 ficaria igual a 7.0 para elas — ou seja, a
   atualização nunca chegaria em quem mais precisa dela
2. entrada nova no topo de `NOVIDADES` (mesmo arquivo), escrita para o jogador —
   o que mudou para ele, não o que mudou no código
3. `versao.json`
4. nome do cache em `sw.js` (`neon-nebula-vNN`)
5. `python3 testes/montar.py && ./testes/check.sh && cd testes && ./testar.sh`
6. `python3 testes/build_artifact.py` gera o arquivo único
7. `python3 testes/confere_privacidade.py` recusa publicar com dado pessoal dentro
8. depois de publicar, **abra o jogo publicado e confira o número da versão na
   tela**. Publicar não é o mesmo que chegar: o aparelho de quem já jogou tem a
   página guardada

## Coisas que já custaram caro

- **`config.js` com endereço de teste.** A v5.5 e a v5.6 subiram assim e o jogo
  ficou sem nuvem nenhuma: sem ranking, sem arena, sem amigos. Por isso os
  testes não tocam mais no arquivo — eles apontam para o Firebase falso pela
  barra de endereço (`?nuvem=http://127.0.0.1:8099`, e só endereço local é
  aceito) — e `check.sh` recusa publicar se achar `127.0.0.1` lá.
- **Dado pessoal no código.** A chave Pix ficou dentro do jogo até a v5.9.2.
  Agora ela vive só no painel e na nuvem, e `confere_privacidade.py` confere o
  arquivo publicado antes de subir.
- **Duas conexões SSE para o mesmo assunto.** O navegador só deixa ~6 por
  domínio; passar disso travava as gravações. Um fluxo por assunto.
- **Regras antigas do Firebase.** Existe um modo compatível
  (`NUVEM_COMPAT`): se o galho novo for recusado, o mesmo dado vai para dentro
  da ficha do piloto, que toda regra antiga libera.
- **Aviso de versão que dependia de arquivo.** Até a v7.0 o jogo só descobria
  que tinha saído versão nova buscando `versao.json` — que existe no
  repositório mas **não existe no link do artifact**. Lá a busca dava 404 e a
  função desistia calada: dava para ficar quatro versões atrás sem o jogo
  nunca avisar, e foi o que aconteceu. Desde a v7.1 ele pede o pedaço final da
  própria página no servidor e lê o `const VERSAO` de lá, sem depender de
  arquivo nenhum. `testes/test_versao.js` prova isso servindo a página velha no
  GET e o rabo da nova no pedido de pedaço.
- **Ordem de atualizar nascia velha.** O botão do painel mandava a versão do
  próprio painel, e o dono é justamente quem mais demora a receber a
  atualização — a ordem saía "atualize para a 6.5" para quem já estava na 6.5.
  Agora ela leva a versão que está no servidor.
- **Atalho na tela inicial guarda a página num canto só dele.** No iPhone, um
  jogo aberto pelo atalho da tela de início tem um armazenamento separado do
  Safari e pode servir a mesma cópia por semanas — publicar não atravessa isso,
  e nem limpar o Safari resolve. Por isso AJUSTES tem o cartão VERSÃO com
  "BAIXAR TUDO DE NOVO" (`limparTudoERecarregar`), que é o jeito de o jogador
  sair de uma cópia velha sem apagar o atalho. Quando alguém disser "não
  atualizou", pergunte ANTES como ele abre o jogo: pelo cartão da conversa, por
  link, pelo atalho ou pelo app. O conserto é diferente em cada caso, e chutar
  faz perder rodada.
- **Guarda que guardava o segredo dentro de si.** O
  `confere_privacidade.py` tinha o CPF escrito dentro dele, como alvo de
  busca. Quando o histórico do git foi limpo, o `git-filter-repo` trocou o
  número em **todo** arquivo do repositório — inclusive no próprio guarda, que
  passou a procurar a palavra "CPF-REMOVIDO" e a aprovar qualquer coisa,
  calado. Hoje ele procura pelo **formato** de um CPF (com os dígitos
  verificadores batendo) e não guarda número nenhum. Regra geral: um guarda que
  precisa conter o segredo para conferir o segredo está errado de nascença.
- **`scrollHeight` da `.screen` mente.** A nebulosa de fundo
  (`.screen::before`) tem `inset:-25%`, entra na conta do `scrollHeight` e
  nunca rolou nada — ela é recortada. Medindo por ele, o menu "estoura 253px"
  quando na verdade sobram 14. Para saber se algo cabe, meça a borda de baixo
  do último elemento visível, que é o que o dedo alcança (`test_menu3.js`).
- **Arquivo novo depois do `const VERSAO` cega o jogo.** O aviso de versão
  funciona pedindo ao servidor só o pedaço final da página e lendo o
  `const VERSAO` de lá. Quando a cabine 3D entrou em `fonte/ordem.txt` DEPOIS
  do `07-extras-2.js`, o número foi parar a 41 KB do fim — fora do pedaço de
  40 KB que o jogo pedia — e a checagem morreu calada, reabrindo o bug que
  tinha custado quatro versões. **Peça nova entra ANTES do `07-extras-2.js`.**
  `testes/confere_versao.py` mede essa distância e o `check.sh` recusa
  publicar se ela passar da conta.
- **Dez recusas antes de voar.** A exploração pedia dez chaves na ordem
  certa e recusava cada uma fora de ordem com um "antes de MOTORES, ligue
  BOMBAS". Parecia ensinar; na prática era adivinhação, e o jogador disse
  que estava complicado demais. Desde a v8.1 a nave entra ligada, PARTIDA
  liga ou desliga tudo, e apertar uma chave solta acende sozinha a corrente
  de que ela depende. **Se o jogo sabe a ordem, ele obedece — não cobra.**
- **Medir o elemento antes de tirar a classe que o encolhia.** O painel
  recolhido é `width:auto`, ou seja estreito. `explPintarControles()` media
  `clientWidth` para decidir quantas colunas cabem, e media ANTES de tirar a
  classe `fechado`: ao reabrir, o painel se media fechado e voltava com uma
  coluna a menos — dois botões desapareciam no caminho. A classe sai antes
  da medida, sempre.
- **Botão que alterna usado na entrada.** `ligarTudo()` desliga se já está
  tudo ligado (é o que o botão PARTIDA quer). A nave guarda o estado entre
  visitas, então chamar a mesma função ao ENTRAR no modo desligava a nave na
  segunda visita. Entrada não alterna: ela garante o estado (`ligarTudo(true)`).
- **Dedo em botão também virava manche.** O toque era ouvido na tela inteira,
  e a metade direita é a zona do acelerador — apertar CANHÃO acelerava a nave
  a cada tiro. Quem pega o toque tem que perguntar antes se ele caiu num
  botão.
- **Comprimir sem uma busca é só esconder melhor.** A v7.0 trocou 19
  botões por quatro portas. Arrumou a tela e criou outro problema: quem
  não sabia onde as coisas ficavam passou a caçar porta por porta. A v8.2
  reagrupou pelo que a pessoa QUER fazer (JOGAR reúne jornada, dupla,
  ranqueada, arena, maratona e treino — antes "jogar com amigo" morava
  numa porta chamada COM AMIGOS junto de "conversar com amigos") e pôs uma
  busca no topo do menu. **Toda vez que esconder alguma coisa, dê também
  um jeito de procurá-la.**
- **Uma regra só decide o que aparece.** A porta e a busca chamam a mesma
  `portaItemVisivel()` e desenham pela mesma `portaLinhaHTML()`. Se fossem
  duas regras parecidas, um dia a busca acharia o que a porta esconde e o
  jogador cairia numa tela morta — é exatamente o que `test_menu4.js` e
  `test_exploracao.js` conferem com o modo guardado.
- **Guardar não é apagar.** A exploração espacial inteira (motor 3D,
  cabine, combate) está no jogo, desligada por `EXPLORACAO_LIGADA` em
  `fonte/08-exploracao.js`. Desligada, o botão fica `display:none`, a porta
  pula o que está escondido, a busca não acha e o 3D nunca é montado.
  Religar é trocar `false` por `true` — e `test_exploracao.js` cobra as
  duas metades: guardado, que some direito; ligado, que funciona inteiro.
- **Relógio de celular erra.** Na hora de escolher entre dois saves, vence o que
  tem MAIS progresso, não o mais recente.

## Como o jogo fala

Os textos são escritos para um jogador adolescente brasileiro: direto, sem
jargão, sem "otimização" nem "sincronização". Os comentários do código seguem a
mesma régua e explicam **por que**, não o que — sobretudo onde a solução parece
estranha à primeira vista.

Inglês e espanhol funcionam por tabela (`FRASES`) onde a **frase em português é
a chave**: o que não estiver traduzido continua aparecendo em português em vez
de sumir. Para traduzir mais, é só acrescentar linhas.
