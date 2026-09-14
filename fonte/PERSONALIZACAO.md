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


---

# A segunda lista (100+ recursos) — v9.1

Chegou depois uma lista de 100 itens. O mesmo critério de sempre decide:
**entra o que funciona sem servidor novo, sem arquivo grande e sem
derrubar celular fraco.**

## Entrou

| da lista | onde está |
|---|---|
| 1, 3, 4 | degradê de 2 cores no miolo, com ângulo (0–359) e formato reto/círculo/leque |
| 2 | movimento lento do degradê (`fluir`) |
| 5 | vidro fosco: desfoque e opacidade, com a cor aparecendo por trás |
| 6 | borda que brilha, tirada da cor **de baixo** do degradê — combina sozinha |
| 7 | textura por cima: pontos, linhas e ruído (sem arquivo de imagem) |
| 9 | as cores mudam com a hora do dia |
| 10 | oito combinações prontas |
| 11–20 | os robôs: 5 cabeças × 5 olhos × 4 antenas × 5 bocas × 3 detalhes |
| 21, 24, 27 | mini-avatar no chat, status no avatar, cresce ao passar o mouse |
| 31 | caixa de pronomes destacada |
| 32 | nove fontes para o nome |
| 36 | atividade recente (fase, chefes, vitórias, abates) |
| 46 | mural de emblemas, das conquistas já ganhas |
| 51–60 | temas de cor do jogo inteiro (6, presos por nível) |
| 61, 62, 69 | partículas: poeira, neve, chuva, brasas, estrelas |
| 63 | glitch no nome (consertado: agora é falha ocasional, não borrão permanente) |
| 71, 74, 76, 77, 80 | layout modular: quais blocos aparecem e em que ordem |
| 82, 88 | efeito de clique e toque de aviso escolhidos |
| 91, 95 | selo de assinante e tag de servidor ao lado do nome |

## Dá para fazer, e ainda não foi feito

| da lista | o que falta |
|---|---|
| 8 | brilho ao passar o cursor na bio |
| 33 | negrito, itálico e listas no texto da bio |
| 35 | caixa de citação |
| 37 | relógio com o fuso da pessoa |
| 39 | bio retrátil com "ver mais" |
| 64, 67, 68, 70 | mais efeitos: aurora, eletricidade, código caindo, batimento |
| 65, 66 | rastro do cursor e transição entre abas |
| 81, 85 | som ao abrir o perfil e ao passar o mouse |
| 84, 86 | reações animadas e mural de recados |
| 87 | vibração no celular ao tocar no cartão |
| 92, 98, 99 | data da assinatura, histórico de nomes, painel de presentes |
| 100 | exportar a combinação de cores para um amigo |

## Não vai entrar, e o motivo

| da lista | por quê |
|---|---|
| 41, 44, 45, 94 | Spotify, jogo ativo, redes sociais e transmissão: **cada um é uma conta de desenvolvedor, uma chave secreta e um servidor para guardar essa chave**. Nada disso cabe num arquivo só que abre sem internet — e pôr a chave dentro do jogo é entregá-la a quem abrir o código |
| 42, 43, 48 | carrossel de imagens, vídeo e feed de mídia: precisam de um lugar para guardar arquivo grande. O jogo tem um banco de **texto** |
| 47, 90 | áudio de boas-vindas e música de fundo: um áudio de 10 segundos é maior que a foto, o banner e o perfil inteiro juntos |
| 49 | estatísticas de mensagens e tempo em chamada: exigiria contar tudo o que todo mundo faz e guardar para sempre |
| 52, 57 | modo claro e pastel: o jogo inteiro é desenhado no escuro — contraste, brilhos, sombras. É refazer a folha de estilo, não trocar duas cores. Fazer pela metade deixa telas ilegíveis |
| 78, 79 | layouts "gamer" e "artístico": dependem de transmissão ao vivo e de galeria, que são os dois de cima |
| 93 | endereço próprio do perfil: precisa de um servidor respondendo naquele endereço |
| 96 | perfil diferente por servidor: os servidores foram guardados na v8.9 |

**Se algum desses virar prioridade, o caminho é assumir o custo:** um
servidor pequeno, com conta e contas para pagar todo mês. Enquanto o jogo
for um arquivo só, eles não entram.
