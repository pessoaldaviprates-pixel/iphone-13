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
