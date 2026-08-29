# 🛡️ GuildChat

Aplicativo web completo, responsivo e funcional em português, inspirado na estrutura e interface de comunidades do Discord — com visual gamer/tech/cyberpunk em dark mode profundo.

## 🚀 Como usar

Basta abrir o arquivo **`index.html`** em qualquer navegador moderno. Não é necessário servidor, build ou dependências — tudo (HTML, CSS e JavaScript) está em um único arquivo autocontido.

## ✨ Funcionalidades

### Layout em 4 colunas (template Discord)
- **Servidores** — barra vertical com ícones redondos, 3 servidores padrão (🎮 Gamer Zone, 💻 Programação, 📚 Estudos) e botão **+** que abre um modal para criar novos servidores (com escolha de nome e emoji).
- **Canais** — nome do servidor ativo no topo, canais de texto (`#`) e canais de voz (`🔊`) com contagem de usuários conectados.
- **Chat** — cabeçalho com nome e descrição do canal, área de mensagens com avatar, nome, horário e texto, e barra de digitação arredondada com botão de anexo (mock) e envio.
- **Membros** — lista de usuários online (círculo verde) e offline, visível apenas em telas grandes.

### Interatividade
- ✅ **Chat funcional**: envie mensagens com Enter ou pelo botão, com rolagem automática para o final.
- ✅ **Troca de canais**: cada canal carrega suas próprias mensagens fictícias.
- ✅ **Admin-Robô 🤖**: responde automaticamente (com indicador de "digitando…" e delay de 1s) a mensagens contendo "olá", "oi", "ajuda", "bom dia", "boa noite", "piada", "obrigado", a menções a @Admin-Robô e outras.
- ✅ **Comandos de barra**: `/ajuda`, `/dado`, `/moeda`, `/8ball`, `/piada`, `/hora`, `/nivel` e `/limpar`.
- ✅ **Persistência**: mensagens, servidores, canais, perfil e tema salvos no LocalStorage.
- ✅ **Mobile-friendly**: em telas pequenas as colunas de servidores/canais viram uma gaveta deslizante acessível pelo menu ☰.

### Chat avançado (3.0)
- ↩️ **Responder mensagens**: citação acima da mensagem e clique para pular até a original (com destaque).
- 📌 **Fixar mensagens**: painel de fixadas no cabeçalho do canal.
- ✍️ **Formatação Markdown**: `**negrito**`, `*itálico*`, `` `código` ``, `~~riscado~~`, `||spoiler||` (clique para revelar) e links clicáveis.
- 🏷️ **Menções @nome** com autocomplete ao digitar `@` — clique na menção abre o cartão do membro.
- 🗓️ **Separadores de data** e **agrupamento de mensagens** consecutivas do mesmo autor, como no Discord real.
- 🖱️ **Menu de contexto** (clique direito): responder, reagir, fixar, copiar, editar e apagar.
- 💬 **Vida simulada**: membros fictícios conversam sozinhos de tempos em tempos (com "digitando…"), gerando marcações de **não lido** nos canais e badge vermelho nos servidores (desligável nas configurações).

### Produtividade
- ⌨️ **Ctrl+K**: busca rápida de canais em todos os servidores (↑↓ + Enter).
- ⌨️ **Alt+↑/↓**: navega entre canais do servidor atual.
- 🖼️ **Arrastar e soltar** ou **colar (Ctrl+V)** imagens direto no chat.
- ⬇️ Botão flutuante "ir para o fim" quando você rola para cima; contador de caracteres perto do limite.
- 💾 **Backup**: exporte/importe todos os seus dados em JSON pela aba Dados.

### Gamificação
- 🆙 **XP e níveis**: ganhe XP por mensagem, acompanhe a barra de progresso no seu cartão de perfil e com `/nivel`.
- 🏅 **11 conquistas** desbloqueáveis (primeira mensagem, tagarela, arquiteto, decorador, fotogênico, explorador e mais), exibidas no seu perfil.

### Edição total (estilo Discord de verdade)
- ✏️ **Mensagens**: edite (com marca de "editado"), apague e reaja com emojis às mensagens.
- 📝 **Canais**: crie, renomeie, mude a descrição e exclua canais de texto e de voz (botão + nas categorias e engrenagem em cada canal).
- 🏰 **Servidores**: crie, renomeie, troque o ícone (emoji ou **foto enviada**) e exclua servidores (clique no cabeçalho do servidor).
- 👤 **Perfil completo**: nome, **foto de perfil enviada** ou emoji, cor do banner, status (online/ausente/não perturbe/invisível), status personalizado e "sobre mim" — refletidos no painel, na lista de membros e nas suas mensagens.
- 🖼️ **Anexos de imagem**: o botão + envia fotos de verdade no chat (redimensionadas e salvas localmente), com visualizador em tela cheia.

### Personalização visual
- 🎨 **8 temas completos**: Cyberpunk (padrão), Meia-noite, Vazio Roxo, Synthwave, Matrix, Oceano, Brasa e Gelo (claro).
- 🌈 **Cor de destaque livre**: 8 predefinidas + seletor de cor personalizado, aplicada em toda a interface.
- 🔠 **Tamanho da fonte** ajustável e **modo compacto** estilo IRC.
- 🔊 **Sons** de enviar/receber (WebAudio) com liga/desliga.

### Extras
- 🛬 Modal de boas-vindas com dicas rápidas na primeira visita.
- 😄 Mensagens só de emoji aparecem em tamanho gigante, como no Discord.
- 🔔 O título da aba mostra a contagem de canais não lidos, ex: "(2) GuildChat".
- 🤖 O Admin-Robô às vezes reage às suas mensagens com 👍🔥😂💯.
- 🔍 Busca de mensagens no canal ativo.
- 🎧 Salas de voz simuladas: entre e saia, com barra de conexão e contagem de participantes.
- 🪪 Cartão de perfil ao clicar em qualquer membro.
- 👥 Botão para mostrar/ocultar a lista de membros.
- 💾 Aba "Dados" com restauração de padrões; migração automática dos dados da versão 1.

### Design
- Tema escuro profundo padrão: `#0b0f19` / `#111827` / `#1f2937`
- Destaque em azul/violeta neon `#6366f1` e verde online `#10b981`
- Efeito hover estilo Discord: ícones de servidor mudam de círculo para quadrado arredondado com brilho neon
