# fonte/ — onde o jogo é editado

O Neon Nebula roda como **um arquivo só** (`index.html`): é o que o navegador
abre, o que o service worker guarda para funcionar sem internet e o que vira o
artifact publicado. Só que 27 mil linhas num arquivo só não é lugar de
trabalhar.

Então: **edita-se aqui, monta-se depois.**

```sh
python3 testes/montar.py           # junta os pedaços e escreve o index.html
python3 testes/montar.py --olhar   # só avisa se estão desencontrados
```

O `testes/check.sh` já confere isso a cada rodada de testes: se o `index.html`
não for exatamente o que sai desta pasta, ele para e avisa.

## Os pedaços

| arquivo | o que tem dentro |
|---|---|
| `00-cabeca.html` | `<head>`, manifest, fontes |
| `01-estilo.css` | a folha de estilo inteira |
| `02-corpo.html` | todas as telas em HTML |
| `03-base-*.js` | estado, save, perfis, áudio, música |
| `04-jogo-*.js` | naves, habilidades, inimigos, chefes, o laço do jogo |
| `05-nuvem-*.js` | Firebase, multijogador, amigos, arena, ranqueada |
| `06-painel.js` | painel do administrador |
| `07-extras-*.js` | tudo da v6.0 em diante: missões, conquistas, idiomas… |
| `08-exploracao.js` | a exploração espacial, guardada atrás de `EXPLORACAO_LIGADA` |
| `09-perfil.js` | NeoNebula, perfil e presença |
| `09-servidores.js` | servidores: cargos, permissões, moderação, impulsos, tag |
| `09-estacao.js` | a Estação: canais, amigos, grupos, conversas |
| `09-social.js` | enquetes, @everyone/@here e eventos |
| `09-voz.js` | salas de voz e chamadas (microfone e WebRTC) |
| `ordem.txt` | a ordem em que os pedaços são colados |

**Peça nova entra ANTES do `07-extras-2.js`.** É lá que mora o
`const VERSAO`, e o aviso de versão nova funciona pedindo ao servidor só o
rabo da página e lendo o número de lá. Empurrar o `VERSAO` para longe do fim
cega essa checagem — já custou quatro versões uma vez. O `check.sh` mede essa
distância e recusa publicar se passar da conta.

## Se você editar o index.html direto

Acontece. Para trazer a mudança de volta para cá:

```sh
python3 testes/separar.py
```

Ele reparte o `index.html` atual e confere que juntar de novo dá exatamente o
mesmo arquivo. Nada se perde.
