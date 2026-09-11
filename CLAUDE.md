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
