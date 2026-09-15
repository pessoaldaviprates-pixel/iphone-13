# Testes do Neon Nebula

Tudo aqui existe para responder uma pergunta só: **o jogo ainda funciona
depois da mudança que acabei de fazer?**

Cada teste abre o jogo de verdade num Chromium, mexe nele como um jogador
mexeria e imprime um JSON com o que encontrou. Se a lista `errs` não vier
vazia, é porque algo quebrou no console — e o teste falha.

## Rodar

```sh
cd testes
npm install            # só na primeira vez (baixa o Playwright)
./testar.sh            # os principais, ~10 minutos
./testar.sh tudo       # todos, bem mais demorado
./testar.sh test_v64   # só um
```

O Chromium já vem instalado no ambiente de desenvolvimento
(`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`). Fora dele, rode
`npx playwright install chromium` uma vez.

## O que é cada coisa

| arquivo | para que serve |
|---|---|
| `testar.sh` | roda a bateria inteira e diz o que falhou |
| `check.sh` | confere a sintaxe do jogo e trava publicação com endereço de teste |
| `fakefb.js` | um Firebase de mentira na porta 8099, para os testes não tocarem no banco de verdade |
| `comfb.sh` | sobe o Firebase falso, roda o que você pedir e derruba no fim |
| `comfb2.sh` | igual, mas fingindo que as regras antigas bloqueiam galhos novos |
| `build_artifact.py` | junta o jogo num arquivo único para publicar |
| `confere_privacidade.py` | procura dado pessoal no arquivo publicado antes de subir |
| `test_*.js` | os testes em si |

## Regra que não se quebra

Os testes **nunca** mexem em `config.js`. Eles apontam para o Firebase falso
pela barra de endereço (`?nuvem=http://127.0.0.1:8099`), e o jogo só aceita
endereço local por ali. Foi assim que a v5.5 subiu sem nuvem nenhuma: um
teste trocou o `config.js` e não devolveu. `check.sh` agora recusa publicar
se encontrar `127.0.0.1` lá.

## Testes por versão

- `test_v60` presente do dia, missões, estrelas, combo, ajustes
- `test_v61` tutorial, conquistas, perfil, convite, foto da partida
- `test_v62` pré-aviso do chefe, destroços, dano, câmera lenta
- `test_v63` fundir relíquias, conjuntos, comparar naves, prestígio
- `test_v64` regras malucas, asteroides, maratona de chefes, sala secreta
- `test_v65` reconectar, ping, reviver parceiro, emotes, revanche
- `test_v66` temporadas, fila por elo, anti-trapaça, denúncia, filtro
- `test_v67` recuperar conta, erros no painel, números, manutenção
- `test_v68` dica no carregamento, molduras, oferta, presentear amigo
- `test_v69` save em dois lugares, bateria, aviso de pedido, teste fechado
- `test_pix` chave Pix escondida, código copia e cola, entrega
- `test_v70` a `test_v72` o que veio depois: painel, loja, ranqueada
- `test_menu`, `test_menu2`, `test_menu3`, `test_menu4` o menu, as portas e a busca
- `test_painel` o painel do dono: uma lista só, dar num toque, tirar na hora
- `test_filas` as abas que rolam de lado, no mouse e no teclado
- `test_exploracao` a exploração guardada: some direito, e volta inteira
- `test_estacao` a Estação: canais, amigos, grupos, moderação e **um fluxo só**
- `test_social` enquetes, `@everyone`/`@here` e eventos
- `test_voz` a voz de verdade: dois navegadores com microfone de mentira,
  ligação fechando, mudo, surdo, chamada — e nenhum fluxo a mais
- `test_botoes` aperta CADA botão da Estação e cobra que ele faça alguma coisa
- `test_perfil` foto, fontes, duas cores, blocos, castigos e o NeoNebula exposto

## Dois hábitos que salvaram a bateria

**Espere a condição, não o relógio.** `waitForTimeout(2200)` é uma aposta:
passa num dia bom e falha num dia ruim, e aí ninguém sabe se o bug é do jogo
ou do relógio. Use `waitForFunction`.

**Limpe a nuvem falsa no começo, e feche o navegador no fim.** Sem a limpeza o
teste herda a rodada anterior e só passa na primeira vez. Sem o `b.close()`
ele passa e nunca termina, que na bateria é indistinguível de travar.

## E uma regra que custou duas baterias

**Não monte o `index.html` enquanto `testar.sh` estiver rodando.** O
`montar.py` trunca e reescreve o arquivo; o teste que estiver carregando a
página naquele instante lê um arquivo pela metade e falha com um erro que não
existe. Editar `fonte/` durante a bateria é seguro — montar não é.

**Não deixe um `fakefb` seu rodando ao chamar a bateria.** Cada teste sobe um
Firebase falso *limpo* na porta 8099. Se já houver um ali, o da bateria não
sobe, todos os testes dividem a mesma nuvem suja e dois ou três falham por
herdarem o que o teste anterior deixou — com erro que parece bug de verdade.
`pgrep -f 'node fakefb.js'` antes de começar resolve.


## Duas pessoas num teste = dois navegadores

Um teste que abre dois pilotos tem que dar um `newContext()` para **cada
um**, e não duas `newPage()` no mesmo contexto.

Duas páginas no mesmo contexto dividem a mesma fila de conexões. A
Estação segura UM fluxo (SSE) aberto por página; duas dessas mais as
leituras normais secavam a fila para o endereço do Firebase falso, e o
`estEnviar` ficava esperando um socket que nunca chegava — **para
sempre**, sem erro nenhum. O teste pendurava, e um teste pendurado é
indistinguível de um teste pensando.

Custou tempo de caça porque o mesmo código funciona com um piloto só e
funciona no jogo de verdade: lá cada pessoa tem o seu navegador, que é
exatamente o que um contexto separado imita.

## Um teste que pode travar tem que dizer onde travou

`test_avisos.js` guarda o nome da última etapa que passou e tem um
relógio que derruba tudo em 90s com essa etapa no texto do erro. Sem
isso, a única informação de um teste travado é "não terminou".
