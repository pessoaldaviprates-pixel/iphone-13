# As 24 da referência — o que entrou, o que falta e o que não vai entrar

A segunda imagem de referência trazia 24 ideias de personalização de perfil.
Este arquivo existe para que ninguém (nem eu, daqui a três versões) precise
adivinhar o que já foi feito e por que o resto não foi.

## Está no jogo (v9.0)

| # | da imagem | onde está |
|---|---|---|
| 1 | Avatar animado | `NEO_BRILHOS` — suave, anel girando, faíscas, batimento, órbita |
| 2 | Banner animado | `NEO_FUNDOS` com `anima:true` (Fenda, Estrela Morta, Prisma, Buraco Negro) |
| 4 | Redação biográfica | bio de 140 letras, 300 com NeoNebula |
| 5 | Cores do perfil | duas rodas de cor + faixa de tonalidade, e o degradê é seu |
| 7 | Molduras do avatar | as `MOLDURAS` que o jogo já dava por mérito |
| 8 | Conquistas / emblemas | bloco EMBLEMAS, das `CONQUISTAS` que a pessoa já pegou |
| 9 | Cards de interesse | `NEO_INTERESSES`, 2 de graça e até 10 no Ouro |
| 11 | Linha do tempo | bloco ATIVIDADE RECENTE, do que o jogo já guarda |
| 12 | Feed de amigos | bloco AMIGOS EM COMUM |
| 14 | Molduras especiais | as de Ouro, presas por nível |
| 15 | Tema global do app | `NEO_TEMAS` — troca a cor de destaque da tela inteira |
| 16 | Som de notificação | `NEO_TOQUES` — notas feitas na hora, sem arquivo de som |
| 19 | Tipografia exclusiva | `NEO_FONTES`, nove fontes que o aparelho já tem |
| 20 | Efeitos de clique | `NEO_CLIQUES` — afunda, onda, brilha, faísca |
| 24 | Layout modular | aba ARRUMAR: quais blocos aparecem e em que ordem |

## Dá para fazer, e ainda não foi feito

| # | da imagem | o que falta decidir |
|---|---|---|
| 3 | Ícone de estado | o recado já aceita emoji; falta expor uma lista de ícones |
| 6 | Efeitos de reação | reagir numa mensagem com emoji — mexe na conversa, não no perfil |
| 21 | Tela de carregamento | dá para usar a foto do piloto; falta decidir se vale a pena |

## Não vai entrar, e o motivo

| # | da imagem | por quê |
|---|---|---|
| 10 | Mural de mídia / galeria | precisa de um lugar para guardar arquivo grande. O jogo tem Firebase de texto e mais nada. Guardar vídeo ali é caro e lento |
| 13 | Avatar 3D interativo | o motor 3D existe (`08-exploracao.js`), mas montar um boneco por perfil derruba o celular fraco, que é justamente o alvo do jogo |
| 17 | Perfil de grupo | os grupos foram guardados na v8.9. Perfil de grupo sem grupo é tela morta |
| 18 | Perfil "fan club" | mesma coisa: depende de servidores, que também saíram |
| 22 | Modo claro | o jogo inteiro é desenhado no escuro — contraste, brilhos, sombras. Um tema claro é refazer a folha de estilo, não trocar duas cores. Fazer pela metade deixaria telas ilegíveis |
| 23 | Integração com outros aplicativos | cada uma é uma conta, uma chave e um servidor. Nada disso cabe num arquivo só que funciona sem internet |

**A regra que decide:** entra o que funciona sem servidor novo, sem arquivo
grande e sem derrubar celular fraco. O resto é promessa, e promessa na tela é
pior que espaço vazio.
