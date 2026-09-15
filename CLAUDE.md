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
- **Um fluxo de cada vez, e ele FECHA ao sair.** A ESTAÇÃO
  (`fonte/09-estacao.js`) é um bate-papo com canais, grupos e conversas —
  a tentação é abrir um fluxo por canal para contar as não lidas. Seriam
  dez conexões, e passar de ~6 já travou as gravações do jogo uma vez.
  Regra: o fluxo do destino aberto, e só ele; trocar de destino fecha o
  anterior ANTES de abrir o novo; fechar a estação solta tudo. As não
  lidas saem de uma olhadinha de 20 em 20 segundos num nó pequeno
  (`conversas/__ultimas`), que custa uma conexão curta em vez de dez
  abertas. `test_estacao.js` conta os fluxos abertos e fechados e falha
  se sobrar mais de um.
- **Galho novo na nuvem é galho recusado.** A estação guarda tudo dentro
  de `conversas/` e `amigos/`, que as regras do banco já liberam desde a
  primeira versão de amigos. Um `chat/` novo seria recusado nas contas
  com regras antigas e o bate-papo morreria calado. Aproveitar o galho
  que já passa é feio no papel e certo na prática.
- **Encurtar o texto para achar palavrão come palavra inocente.** O
  filtro achatava as duas pontas — o que a pessoa escreveu E a palavra
  procurada. Com isso "porra" virava "pora" e o jogo censurava "porão".
  E como "cu" está na lista e a busca era por pedaço, "cuidado",
  "escuro" e "curioso" saíam tapados no chat de amigos desde sempre.
  Hoje quem se estica é a BUSCA (`c+a+r+a+l+h+o+`, que pega "caraaalho"),
  o texto não encolhe, e palavra de até três letras só vale inteira.
- **Voto não é mensagem nova.** A releitura de um canal decidia se algo
  mudou comparando quantas mensagens vieram e qual era a última. Funcionou
  enquanto tudo o que chegava era mensagem — mas um voto de enquete muda uma
  mensagem que já estava lá, sem mexer em nenhuma das duas coisas, e a
  enquete ficava congelada na tela de quem não votou até alguém falar. Hoje a
  comparação inclui os votos e o prazo. Regra: **quando um dado passa a poder
  mudar depois de criado, a conta do "mudou?" tem que passar a olhar para
  ele.**
- **Desenhar na hora e esperar a nuvem, sem remarcar depois.** O voto aparecia
  na tela antes de gravar (certo). Só que entre o clique e a resposta da nuvem
  chegava uma releitura do canal, que traz o estado de ANTES do voto — e a
  marca sumia sozinha um segundo depois de aparecer. Quem desenha antes tem
  que **reencontrar** o objeto depois do `await` (o de antes já foi jogado
  fora) e remarcar por cima do que voltou.
- **Duas passadas de troca marcam em cima da marca.** `@everyone` era
  destacado numa passada e, na passada seguinte, a regra de `@fulano` ainda
  enxergava o "@everyone" dentro do HTML recém-criado e marcava de novo. Uma
  passada só, com o caso especial decidido dentro dela.
- **A voz não pode gastar o fluxo.** O fluxo (SSE) é UM só e é da conversa. A
  sala de voz se vira com uma olhadinha curta de 1,2 em 1,2 segundo em
  `conversas/voz__<sala>` — um pedido que abre e fecha, igual às não lidas.
  `test_voz.js` guarda o caminho de cada fluxo aberto e falha se algum tiver
  `voz__` no nome.
- **Duas ofertas ao mesmo tempo derrubam a ligação.** Quando os dois lados de
  uma chamada oferecem juntos, as ofertas se cruzam e nada fecha. A saída
  barata é combinar a ordem antes, e não negociar depois: **quem tem o
  identificador menor faz a oferta**, sempre.
- **Gelo que chega cedo demais não se joga fora.** Os candidatos de rede (ICE)
  costumam chegar antes da oferta. Quem os descarta por "ainda não sei do que
  isso fala" perde justamente o caminho que faria a ligação fechar. Eles
  ficam guardados e são aplicados quando a descrição do outro lado chega.
- **Sair da sala tem que soltar o microfone.** Sem `track.stop()` a bolinha
  vermelha do navegador continua acesa depois de sair — e a pessoa acha, com
  razão, que o jogo continua ouvindo. O teste cobra isso pelo `readyState` da
  faixa, que só vira `"ended"` quando ela foi solta de verdade.
- **Teste que não fecha o navegador trava a bateria.** `test_social` passava
  e ficava pendurado para sempre: o processo do Chromium segurava o node
  acordado. Passar e não terminar é indistinguível de travar.
- **Escapador que também encurta.** `escaparTexto()` faz duas coisas: escapa
  HTML **e corta em 40 letras**. O corte é a regra do apelido, não do
  escapador — e a Estação inteira usou essa função no corpo das mensagens.
  Resultado: desde que o bate-papo existe, toda frase com mais de 40 letras
  chegava do outro lado pela metade, sem reticências e sem aviso. Ninguém
  percebeu porque "e ai" e "fechou" cabem. Texto de gente usa
  `escaparLongo()`; `escaparTexto()` é só para nick. Regra geral: **função
  que faz duas coisas vai ser chamada por quem só quer uma delas.**
  `test_botoes.js` manda uma mensagem de 116 letras e compara com o que
  aparece na tela.
- **Botão que abre janela para gravar em galho recusado.** O CRIAR SERVIDOR
  abria a janelinha bonitinha, aceitava o nome, e não gravava nada: o galho
  `servidores/` é novo e as regras antigas do Firebase recusavam calado. Para
  quem usa, "não está dando para criar servidores" — sem erro, sem pista.
  Guardado atrás de `SERVIDORES_LIGADOS`. **Antes de pôr um botão que grava
  num galho novo, confira se o galho passa.**
- **Botão que não faz nada é bug, e dá para testar isso.** `test_botoes.js`
  aperta CADA botão visível da Estação e cobra que algo mude: a tela, uma
  janela ou um aviso. A única exceção legítima é tocar no destino onde você
  já está — e ela está escrita no teste, com o motivo.
- **Campo que se redesenha rouba o próprio foco.** A busca da barra repinta a
  lista a cada tecla, e a lista contém o campo. Sem devolver o cursor (e a
  posição dele) depois de repintar, a pessoa digitava uma letra e a segunda
  ia para lugar nenhum.
- **Montar o `index.html` no meio da bateria estraga a bateria.** `montar.py`
  trunca e reescreve o arquivo; o teste que estiver carregando a página nesse
  instante lê um arquivo pela metade e falha com um erro que não existe
  (`novidadesNovas is not defined`). Já aconteceu duas vezes, e nas duas a
  falha parecia um bug de verdade. **Enquanto `testar.sh` roda, edite `fonte/`
  à vontade, mas não monte.**
- **Efeito que está sempre ligado não é efeito, é ruído.** O Glitch do nome
  ficava com duas sombras coloridas a 1,5px da letra — ou seja, coladas nela.
  Em tamanho pequeno elas invadiam o traço e o nome virava um borrão o tempo
  todo. O conserto não foi afastar as sombras: foi **tirá-las do descanso**.
  Agora o nome fica limpo 90% do tempo e desencontra forte por dois décimos de
  segundo. Vale para qualquer efeito: se acontece sempre, deixou de ser efeito.
- **Foto na ficha do piloto pesa para todo mundo.** A ficha de todos é lida
  inteira de vinte em vinte segundos, para saber quem está online. Uma foto de
  5 KB dentro dela vira meio mega a cada leitura numa comunidade de cem
  pessoas. A foto mora em `conversas/__fotos/<id>` e só é buscada quando
  alguém abre aquele perfil; na ficha vai só `foto: 1`. `test_perfil.js`
  falha se achar `data:image` na lista de pilotos.
- **Cor escolhida por outra pessoa não pode virar CSS.** O fundo de duas cores
  é guardado como quatro NÚMEROS (dois matizes, duas tonalidades), presos na
  faixa, e montado em `hsl()` na hora de desenhar. Guardar `"#RRGGBB"` (ou
  pior, o gradiente pronto) seria deixar um estranho escrever estilo dentro da
  minha tela.
- **O dono do jogo tem tudo de graça, e isso quebra teste de trava.** `neoDe()`
  devolve `ilimitado` para quem está em `DONOS`, de propósito — um save perdido
  não pode tirar o dono do próprio jogo. Logo, **o Cr1cket não serve para
  provar que a trava do NeoNebula trava**: esse teste precisa de um piloto
  comum.
- **A releitura do canal apagava a mensagem recém-enviada.** Ela traz as
  últimas 40 e jogava fora tudo o que não viesse nela e fosse mais novo que a
  última. Só que a leitura SAI antes da minha gravação e VOLTA depois dela:
  nessa janela a minha mensagem já não é "a caminho" (a nuvem respondeu OK) e
  ainda não está na resposta que estava no ar. Ela aparecia e sumia sozinha,
  voltando na releitura seguinte. Era isso que fazia a enquete recém-criada
  desaparecer entre um voto e outro. A regra virou `estJuntarMensagens()`, com
  nome: **segurar por uma rodada é barato, perder o que a pessoa escreveu
  não é.**
- **Teste de corrida que não corre não testa nada.** A primeira versão do
  teste desse bug forçava uma corrida artificial — e passava com o bug no
  lugar, porque a corrida forçada pegava outro caminho do código. Um teste de
  regressão só vale depois de você **desfazer o conserto e ver ele falhar**.
  Quando o comportamento for uma regra, dê nome à regra e teste a regra: não
  se precisa reproduzir corrida para conferir uma decisão.
- **Hash rápido não serve para sortear.** O robô de cada conta sai do
  `nuvemHash` (djb2) do identificador. Para textos quase iguais
  ("piloto1", "piloto2") ele devolve números quase iguais — e tirar o resto
  da divisão disso faz as cinco peças do robô andarem em fila indiana:
  2000 contas davam 232 robôs de 1500 possíveis. Somar dígitos do mesmo
  hash (a primeira tentativa) foi pior ainda: 30. O conserto é **espalhar
  os bits** antes de dividir (xor com deslocamento + multiplicação);
  depois disso, 1130 de 2000, que é o número teórico. Regra: **antes de
  usar um hash para escolher, pergunte se ele foi feito para espalhar ou
  só para ser rápido.**
- **Assertiva de um par só é frágil por construção.** O teste do robô
  comparava dois ids fixos e exigia que fossem diferentes. Com 1500
  combinações, dois quaisquer batem uma vez em 1500 — e o par que escolhi
  era um desses. Colisão ali não é bug, é aritmética. Quem prova
  espalhamento é um conjunto (273 distintos em 300), não um par.
- **Foto na ficha pesa; marca na ficha não.** A foto e o banner moram em
  `conversas/__fotos/` e `conversas/__banners/`, e na ficha do piloto vai
  só `foto: 1`. É essa marca que deixa o bate-papo saber **quem tem foto**
  sem pedir a de todo mundo: sem ela, a única forma seria tentar buscar a
  de cada um e ver quais voltam vazias — um pedido por pessoa, toda vez.
- **Lista de campos escrita à mão envelhece calada.** A ficha que sobe para
  a nuvem levava o perfil assim: `{bio, pronomes, cor, efeito, fundo, avatar}`.
  Seis campos escolhidos a dedo. Tudo o que entrou da v9.0 em diante — a
  foto, o banner, a fonte do nome, o ícone de estado, as duas cores, o
  ângulo, a textura, os interesses, os blocos — ficava salvo no aparelho e
  **nunca saía dele**. A pessoa personalizava o perfil inteiro e só ela via.
  "Troquei a foto e não aparece" e "o ícone de estado não funciona" eram a
  MESMA linha de código. Pior: o comentário logo acima dessa linha já
  contava que o VIP e a moldura tinham morrido por isso, e o erro foi
  repetido três campos abaixo do próprio aviso. O rascunho do editor tinha
  a mesma lista à mão, também desatualizada em cinco campos. Hoje os dois
  saem de `PERFIL_PADRAO` com um `for..in`. **Se existe uma lista de
  campos escrita à mão, ela já está errada — só ninguém percebeu ainda.**
- **Cache que guarda "não tem" nunca aprende que passou a ter.** `fotoDe()`
  buscava a foto de alguém uma vez e guardava. Guardava também o vazio: quem
  abrisse o perfil do pai antes de ele pôr foto ficava com `""` na memória e
  **nunca mais perguntava**. A foto existia, a ficha dizia que existia, e a
  tela ficava no robô até fechar e abrir o jogo. Um relógio ("pergunte de
  novo a cada 5 minutos") resolveria pela metade e custaria um pedido por
  pessoa para sempre. O certo era a marca: a ficha (já lida de 20 em 20
  segundos) passou a levar um NÚMERO que muda a cada troca, e o cache se
  rende quando o número muda. Zero pedido enquanto nada muda, um pedido no
  instante em que muda — e de graça resolve também o "trocou a foto que já
  tinha", que ninguém tinha percebido ainda.
- **Escolha salva e nunca lida é igual a escolha quebrada.** O ícone de
  estado tinha sete opções, tela de escolher, trava por nível e gravação
  certinha — e desenhava num lugar só, o cartão de perfil aberto. O toque de
  aviso tinha cinco sons e a única coisa que chamava `toqueTocar()` era a
  prévia da tela de escolha: o aviso avisava exatamente uma vez, no momento
  em que ninguém precisava. Para quem escolheu, os dois "não funcionam" — e
  está certo. **Ao acrescentar uma opção, a última pergunta não é "salvou?",
  é "quem LÊ isto?"** Se a resposta for "a tela que escolhe", não está
  pronto.
- **`:active` não é efeito num celular.** Os quatro efeitos de clique eram
  CSS preso ao `:active`, ou seja: só existiam enquanto o dedo estava
  encostado. Um toque dura uns 80ms e o que a pessoa vê é um pisca que some
  antes de ela olhar. E "onda" e "faísca" são, pelo nome, coisas que
  acontecem DEPOIS de soltar. Agora o toque põe uma classe que dura o tempo
  da animação, solta do dedo, e a onda nasce no ponto tocado — nascendo no
  meio ela parece um brilho ligando, e não uma onda.
- **Duas listas para uma pergunta são a confusão.** A aba "Arrumar" tinha
  uma lista dos blocos ligados (com ↑ ↓ ✕) e outra, embaixo, dos guardados
  (com "+ nome"). Desligar um bloco fazia ele sumir de um lugar e reaparecer
  noutro, com outro nome de botão. Hoje é uma lista só, cada linha com um
  interruptor: desligado, a linha fica apagada NO MESMO LUGAR. Regra: quando
  uma coisa some de um canto da tela, a pessoa tem que ver para onde ela
  foi.
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
