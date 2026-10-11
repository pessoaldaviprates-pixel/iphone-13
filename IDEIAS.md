# 300 coisas para melhorar o Neon Nebula

Lista para riscar. A ordem importa: a primeira seção é o que muda o
jogo hoje; o resto está agrupado por assunto, não por urgência.

---

## A. As dez primeiras (se só der tempo disto, faça isto)

1. Levar os commits da branch para o `main` — o GitHub Pages serve o
   `main`, e ele está na v8.4. Nada das últimas cinco versões está no ar.
2. Trocar o `ADM_MASTER` em `fonte/04-jogo-1.js`.
3. Esvaziar o `CONTAS_SEM_SENHA` — hoje a conta `7anoS` entra sem senha.
4. Tirar o `.read: true` do `contas` nas regras do Firebase. Hoje
   qualquer pessoa baixa o save e a senha de todo mundo.
5. Decidir o que fazer com `fonte/09-extras2.js`: 418 linhas que não
   estão no `ordem.txt`, ou seja, não existem no jogo.
6. Mesma decisão para a exploração espacial (2.007 linhas desligadas).
7. Mesma decisão para os servidores (1.454 linhas desligadas).
8. Capa 630×500 para o itch.io.
9. Abrir o jogo publicado e conferir o número da versão na tela.
10. Um teste que falhe quando o nome do cache do `sw.js` ficar atrás da
    `VERSAO` — foi o que deixou passar cinco versões sem ninguém ver.

---

## B. Segurança

11. Firebase Authentication anônima: cada piloto com um id que ele não
    escolhe e não consegue forjar.
12. Regra `contas/$id`: só o dono lê e escreve.
13. Limite de tamanho no `pilotos`.
14. Limite de tamanho no `sugestoes`.
15. Limite de tamanho no `mundo`.
16. Limite de tamanho por mensagem na Estação.
17. Limite de mensagens por minuto — na regra do servidor, não no jogo.
18. `conversas/__canais`: leitura para todos, escrita só para o dono.
19. Parar de reconhecer o dono pelo nick. Hoje qualquer um cria `cr1cket`.
20. A senha do jogador é um desenho curto: aumentar o espaço de
    combinações (mais pontos, ou a ordem contando).
21. Trocar o embaralhado da senha por algo lento de propósito.
22. Nunca mandar a senha embaralhada de volta para o jogo.
23. Errou cinco vezes, espera um tempo antes de tentar de novo.
24. Botão "sair de todos os aparelhos".
25. O painel do dono não devia existir no código de quem não é dono.
26. Varrer `console.log` que mostre dado de jogador.
27. Rodar o `confere_seguranca.py` dentro do `check.sh`.
28. Teste que falha se um `.read: true` novo aparecer nas regras.
29. Botão de denunciar mensagem.
30. Lista de bloqueados por pessoa.
31. Apagar a conta: o jogador pede e some de verdade.
32. Página de privacidade dizendo o que fica guardado, onde e por quanto
    tempo.

---

## C. O que já está torto por dentro

33. `fonte/09-extras2.js` fora do `ordem.txt`: código que ninguém roda.
34. 2.007 linhas de exploração desligada.
35. 1.454 linhas de servidores desligados.
36. `index.html` com ~2 MB num arquivo só: a primeira abertura no 4G dói.
37. Separar o 3D num arquivo que só baixe quando a exploração abrir.
38. `02-corpo.html`: 1.847 linhas de HTML escrito à mão.
39. Os `05-nuvem-*` somam 7.300 linhas. Dividir por assunto.
40. Procurar outras listas de campos escritas à mão — o bug do perfil
    (seis campos a dedo) pode estar repetido em outro lugar.
41. Teste que falha quando alguém escreve uma lista de campos à mão.
42. Varrer de novo todas as chamadas de `escaparTexto` contra
    `escaparLongo`.
43. Nomes em inglês misturados com português (`save.best`, `naveValida`).
    Escolher um e padronizar.
44. `storageGet` espalhado: uma porta só para o armazenamento.
45. Tratar `localStorage` cheio — no iPhone ele estoura e o save some.
46. Pôr um número de versão dentro do save, e saber migrar.
47. Guardar duas cópias do save, para o dia em que a gravação parar no meio.
48. Exportar o save para um arquivo.
49. Importar o save de um arquivo.
50. `NUVEM_COMPAT` decidido em dois lugares: deixar uma decisão só.
51. Os `try/catch` vazios engolem erro. Pelo menos contar quantos houve.
52. Uma tela "o que deu errado" que o jogador consiga me mandar.
53. Anotar no CSS que a nebulosa tem `inset:-25%` — ela já enganou medida
    uma vez e vai enganar de novo.
54. Apagar `shot_v69.js`, `probe2.js` e `curvas.py` se não servem mais.

---

## D. Os primeiros 60 segundos

55. Deixar jogar antes de pedir nome e senha.
56. Uma fase 1 que ensine sem texto nenhum.
57. Mostrar o controle com uma mão desenhada, uma vez só.
58. Não pedir nada da internet na primeira abertura.
59. Perguntar "tem conta?" só depois da primeira vitória.
60. Um nome sugerido já preenchido.
61. A tela de carregamento dizendo o que está baixando.
62. Medir o tempo da primeira abertura no 4G e mostrar.
63. A música começa baixa, não no volume cheio.
64. Pegar o idioma do celular sem perguntar.
65. Salvar o progresso ao terminar a primeira fase, não ao sair.
66. Um "CONTINUAR" grande no topo, com o nome da fase onde parou.
67. Morreu três vezes na mesma fase: oferecer ajuda (não baixar sozinho).
68. Ao terminar a fase, dizer em uma linha o que ganhou.
69. O menu abre no topo, nunca rolado.
70. Não mostrar a loja na primeira sessão.
71. Presente do dia só a partir do segundo dia.
72. Fazer a primeira conquista sair rápido, de propósito.

---

## E. Fases e combate

73. Medir quantas das 270 fases são parecidas demais entre si.
74. Dar nome aos setores em vez de só numerar.
75. Um chefe a cada dez fases, cada um com um padrão que os outros não têm.
76. Chefes com segunda fase: com pouca vida, muda de ataque.
77. Inimigo que foge e volta.
78. Inimigo que protege outro.
79. Inimigo que só morre pelas costas.
80. Um tipo que obriga a parar de atirar.
81. Asteroides que quebram e viram estilhaço.
82. Corrente que empurra a nave.
83. Fase escura, com lanterna.
84. Fase com espelho: o tiro reflete.
85. Fase de fuga: a tela empurra para a frente.
86. Fase sem tiro, só desviar.
87. Fase com algo para proteger.
88. Destroços de chefe que ficam atrapalhando.
89. Medir os "quase morri" para o jogo se calibrar sozinho.
90. Dificuldade escolhida à mão, além da automática.
91. Modo ferro: morreu, volta ao começo. Com medalha própria.
92. Repetir fase com objetivo extra ("sem levar dano").
93. Três estrelas por fase, com o critério escrito na tela.
94. Mostrar o recorde da fase antes de entrar.
95. Fantasma: a sombra da sua melhor tentativa correndo junto.
96. Cronômetro visível para quem gosta de speedrun.
97. Ranking por fase, não só o geral.
98. Replay de três segundos da morte.
99. O tiro do chefe fica vermelho um instante antes de sair.
100. Tremor de tela regulável.
101. Número de dano subindo quando acerta.
102. Combo: matar em sequência vale mais.
103. Algumas naves recuperam vida matando.
104. Bomba de tela com recarga.
105. Um segundo botão de habilidade.
106. Desenhar uma vez as zonas do toque — a metade direita acelera e
     ninguém sabe disso.
107. Mira assistida regulável.
108. Pausa de verdade: congela e o menu é grande.

---

## F. Naves e equipamento

109. Medir quais das 120 naves as pessoas realmente usam.
110. Cortar as repetidas, ou dar personalidade a cada uma.
111. Cada nave com uma habilidade que só ela tem.
112. Ver a nave voando antes de comprar.
113. Comparar naves com barras, não com tabela.
114. Favoritar naves.
115. Pintar a nave com as cores do perfil.
116. Adesivos na nave.
117. Escolher o rastro.
118. Som de tiro diferente por nave.
119. Relíquias: dizer o que fazem com número, não com texto bonito.
120. Ver as relíquias equipadas durante a fase.
121. Conjunto: três relíquias do mesmo tipo dão um bônus.
122. Árvore de habilidades: mostrar o caminho até o que eu quero.
123. Desfazer um ponto gasto, uma vez por dia.
124. Salvar duas montagens de árvore e trocar entre elas.
125. Melhorias: mostrar quanto falta para a próxima.
126. Quando falta pouco, dizer em quantas fases chega.
127. Avisar dentro da fase quando sobrou ponto para gastar.
128. Separar de verdade o que custa dinheiro do que custa cristal.
129. Nunca abrir a loja no meio de uma fase.
130. Uma tela só dizendo tudo o que o VIP dá.
131. Passe de temporada com data de fim visível.
132. Nave emprestada por um dia, para experimentar antes.

---

## G. Progressão e prêmios

133. Vinte missões diárias sorteadas, em vez de sempre as mesmas três.
134. Uma missão semanal maior.
135. Missão de esquadrão.
136. Dobrar as 25 conquistas — é pouco para 270 fases.
137. Conquista escondida, que só aparece quando sai.
138. Mostrar a conquista no instante em que sai, não depois no menu.
139. Presente do dia com sequência: sete dias dá algo bom.
140. Não castigar quem perdeu um dia.
141. Uma tela dizendo onde se ganha cristal.
142. Se der, uma moeda só — hoje tem cristal, ponto e estrela.
143. Caixa com chance: mostrar a chance, sempre.
144. Nenhuma caixa paga com chance escondida.
145. Nível do piloto separado do progresso das fases.
146. Título ao lado do nome, ganho por conquista.
147. Moldura ganha por conquista, não só comprada.
148. Resumo da semana: "você passou 12 fases".
149. Voltou depois de sumir: tela de "o que mudou enquanto você não estava".
150. Perdeu a sequência: um perdão por mês.
151. Ranking semanal que zera, para quem entrou agora ter chance.
152. Ranking de amigos separado do mundial.
153. Ranking de esquadrão.
154. Ranking por estado.

---

## H. Estação e social

155. Busca dentro da conversa.
156. Responder citando uma mensagem.
157. Reagir com emoji.
158. Editar a própria mensagem.
159. Apagar a própria mensagem.
160. Marcar mensagem como importante.
161. Fixar mensagem no topo do canal.
162. Ver quem leu.
163. "Está escrevendo…".
164. Mandar imagem, com limite de tamanho avisado antes.
165. Mandar áudio curto.
166. Mandar o replay de uma fase.
167. Convidar para jogar direto do chat.
168. Abrir o perfil tocando no avatar.
169. Apelido diferente por servidor.
170. Cargo com cor no nome.
171. Silenciar canal.
172. Silenciar pessoa.
173. Avisar só quando me marcam.
174. Notificação de verdade com o jogo fechado.
175. Mostrar melhor as não lidas por canal (o dado já existe em
     `conversas/__ultimas`).
176. Ordenar as conversas pela última mensagem.
177. Arquivar conversa.
178. Grupo com nome e foto.
179. Sair do grupo.
180. Convite por link para grupo.
181. Enquete de escolha múltipla.
182. Enquete anônima.
183. Evento com lembrete.
184. Voz: mostrar quem está falando agora.
185. Voz: silenciar alguém só para mim.
186. Voz: empurrar para falar.
187. Voz: um aviso claro na tela de que o microfone está aberto.
188. Filtro de palavrão com lista própria por servidor.
189. Modo lento num canal cheio: uma mensagem a cada X segundos.
190. Moderador pode apagar mensagem.
191. Histórico do que o moderador apagou.
192. Denunciar com motivo.
193. Bloquear alguém esconde também as mensagens antigas dele.
194. Um canal só de "procurando dupla".

---

## I. Perfil e personalização

195. Ver o perfil de qualquer pessoa, não só de amigo.
196. O cartão do perfil virar imagem para compartilhar.
197. Cortar a foto dentro do jogo.
198. Avisar o limite de tamanho da foto antes, não depois.
199. Banner animado para quem tem NeoNebula.
200. Arrastar os blocos do perfil para ordenar.
201. Bloco "minhas naves favoritas".
202. Bloco "últimas fases".
203. Bloco de texto livre.
204. Deixar o jogador salvar um tema dele, além dos dez.
205. Tema que acompanha o claro/escuro do celular.
206. Tema que muda por horário.
207. Prévia do tema antes de aplicar.
208. Escolher o som junto com o efeito de clique.
209. Ícone de estado: mostrar no chat, na lista e no ranking — hoje só
     aparece no cartão aberto.
210. Toque de aviso: tocar quando chega mensagem, que é para isso que
     ele existe.
211. Conferir se a fonte do nome aparece em todo lugar onde o nome aparece.
212. Procurar gente pelo mesmo interesse.
213. Pronomes visíveis onde o nome aparece.
214. Um botão "ver como os outros me veem".

---

## J. Interface no celular

215. A barra de três ícones lembrando onde eu estava.
216. Toque longo em cada ícone abre um atalho.
217. Voltar com o gesto do sistema.
218. Nenhum botão com menos de 44px.
219. Respeitar a área segura de baixo (o risco do iPhone).
220. O teclado não pode cobrir o campo que estou digitando.
221. Inércia na rolagem das listas longas.
222. A busca do menu lembrando a última busca por alguns segundos.
223. Atalho para a última fase jogada.
224. Decidir se trava em pé ao girar o celular.
225. Botões importantes na metade de baixo: uma mão só alcança.
226. Modo canhoto.
227. Vibração nos acertos, e um jeito de desligar.
228. Menos texto nas telas pequenas — sem esconder botão.
229. Janelas que fecham arrastando para baixo.
230. Nunca abrir janela dentro de janela.
231. Confirmar antes de sair da fase.
232. Avisar que está sem internet uma vez, sem travar nada.
233. Carregar imagem só quando ela aparece na tela.
234. Testar em 320px de largura: ali ainda rola em vez de caber.

---

## K. Interface no computador

235. Teclado: WASD e setas.
236. Atalhos de 1 a 9 para as habilidades.
237. Mouse: a nave mira onde eu clico.
238. Atalho de teclado para a barra lateral.
239. Janela do chat redimensionável.
240. Tela cheia por botão e por F11.
241. Em 1920×1080, as colunas ocupando o espaço em vez de sobrar preto.
242. Em monitor ultrawide, limitar a largura do conteúdo.
243. Hover em tudo que é clicável.
244. Cursor diferente dentro da fase.
245. Colar imagem no chat com Ctrl+V.
246. Tab andando entre os campos na ordem certa.

---

## L. Celular fraco

247. Medir os quadros por segundo num aparelho de 2018.
248. Modo leve que liga sozinho quando o aparelho não dá conta.
249. Menos partículas quando o quadro cai.
250. Reaproveitar objetos em vez de criar e jogar fora.
251. Contar quantas sombras e brilhos de CSS existem — cada um custa.
252. Listar onde se usa `backdrop-filter`: é o mais caro de todos.
253. Parar a nebulosa de fundo quando a aba sai da frente.
254. Parar a animação do menu quando a janela não está na frente.
255. Não desenhar o que está fora da tela.
256. Imagens em `webp`, com `png` de reserva.
257. Medir o tempo até o primeiro desenho com os 2 MB de `index.html`.
258. Baixar as fontes do Google e guardar junto, em vez de buscar.
259. Medir a memória depois de vinte minutos jogando.
260. Conferir se sobra `setInterval` ligado ao sair de uma tela.
261. Um teste que falhe se o jogo ficar mais lento que na versão anterior.
262. Medir quanta bateria dez minutos de jogo gastam.

---

## M. Quem joga diferente de mim

263. Tamanho de letra regulável.
264. Modo para quem não distingue vermelho de verde.
265. Medir o contraste dentro das fases, como já se mede nos temas.
266. Leitor de tela funcionando nos botões do menu.
267. Reduzir movimento, para quem enjoa.
268. Desligar o tremor de tela.
269. Legenda nos sons que importam.
270. Tempo de reação maior, como opção.
271. Jogar com um toque só.
272. Pausar sozinho quando sai do app.
273. Avisar antes de qualquer luz piscando forte.
274. Completar o inglês e o espanhol — hoje estão pela metade.

---

## N. Som

275. Música diferente por setor.
276. Música de chefe.
277. Volume separado: música, efeito e voz.
278. Não cortar a música do celular sem avisar.
279. Um som de vitória que dê vontade de ganhar de novo.
280. Silenciar tudo com um toque no topo.
281. Conferir os sons curtos demais, que somem no alto-falante do celular.
282. Um som para cada coisa importante, e nenhum para o resto.

---

## O. Offline, instalar e atualizar

283. Conferir o aviso de versão nova a cada peça nova que entra.
284. Um botão "procurar atualização" que o jogador aperta.
285. Dizer em uma linha o que mudou, quando atualiza.
286. Deixar o cartão VERSÃO mais fácil de achar em AJUSTES.
287. Offline: dizer o que não vai funcionar, em vez de falhar calado.
288. O que foi feito offline sobe quando a internet voltar.
289. O botão do `baixar.html` funcionando no Android.
290. Instalar do zero num iPhone de verdade, e ver dar certo.

---

## P. Testes e ferramentas

291. Renomear os `test_vNN` pelo que eles testam de verdade.
292. Rodar a bateria sozinha a cada push.
293. Rodar os 114 testes em paralelo.
294. Teste que falhe se o cache do `sw.js` ficar atrás da `VERSAO`.
295. Teste que meça o tempo até o jogo abrir.
296. Teste que abra o jogo em seis tamanhos e cobre que nada fique fora
     do alcance do dedo.
297. `check.sh` recusando publicar com `console.log` sobrando.
298. Um comando só para publicar: montar, conferir, testar e subir.
299. O `CLAUDE.md` está virando um livro. Separar "o que é cada coisa" de
     "o que já custou caro".
300. Continuar escrevendo no `CLAUDE.md` toda vez que um bug custar uma
     rodada. É o que tem funcionado melhor neste projeto.
