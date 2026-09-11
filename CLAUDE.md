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

1. `const VERSAO` em `fonte/07-extras-2.js`
2. entrada nova no topo de `NOVIDADES` (mesmo arquivo), escrita para o jogador —
   o que mudou para ele, não o que mudou no código
3. `versao.json`
4. nome do cache em `sw.js` (`neon-nebula-vNN`)
5. `python3 testes/montar.py && ./testes/check.sh && cd testes && ./testar.sh`
6. `python3 testes/build_artifact.py` gera o arquivo único
7. `python3 testes/confere_privacidade.py` recusa publicar com dado pessoal dentro

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
