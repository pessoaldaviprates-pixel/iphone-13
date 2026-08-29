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
- ✅ **Admin-Robô 🤖**: responde automaticamente (com indicador de "digitando…" e delay de 1s) a mensagens contendo "olá", "oi", "ajuda", "bom dia", "boa noite", "piada", "obrigado" e outras.
- ✅ **Comandos de barra**: `/ajuda`, `/dado`, `/moeda`, `/piada`, `/hora` e `/limpar`.
- ✅ **Persistência**: mensagens, servidores, canais, perfil e tema salvos no LocalStorage.
- ✅ **Mobile-friendly**: em telas pequenas as colunas de servidores/canais viram uma gaveta deslizante acessível pelo menu ☰.

### Edição total (estilo Discord de verdade)
- ✏️ **Mensagens**: edite (com marca de "editado"), apague e reaja com emojis às mensagens.
- 📝 **Canais**: crie, renomeie, mude a descrição e exclua canais de texto e de voz (botão + nas categorias e engrenagem em cada canal).
- 🏰 **Servidores**: crie, renomeie, troque o ícone (emoji ou **foto enviada**) e exclua servidores (clique no cabeçalho do servidor).
- 👤 **Perfil completo**: nome, **foto de perfil enviada** ou emoji, cor do banner, status (online/ausente/não perturbe/invisível), status personalizado e "sobre mim" — refletidos no painel, na lista de membros e nas suas mensagens.
- 🖼️ **Anexos de imagem**: o botão + envia fotos de verdade no chat (redimensionadas e salvas localmente), com visualizador em tela cheia.

### Personalização visual
- 🎨 **6 temas completos**: Cyberpunk (padrão), Meia-noite, Vazio Roxo, Matrix, Brasa e Gelo (claro).
- 🌈 **Cor de destaque livre**: 8 predefinidas + seletor de cor personalizado, aplicada em toda a interface.
- 🔠 **Tamanho da fonte** ajustável e **modo compacto** estilo IRC.
- 🔊 **Sons** de enviar/receber (WebAudio) com liga/desliga.

### Extras
- 🔍 Busca de mensagens no canal ativo.
- 🎧 Salas de voz simuladas: entre e saia, com barra de conexão e contagem de participantes.
- 🪪 Cartão de perfil ao clicar em qualquer membro.
- 👥 Botão para mostrar/ocultar a lista de membros.
- 💾 Aba "Dados" com restauração de padrões; migração automática dos dados da versão 1.

### Design
- Tema escuro profundo padrão: `#0b0f19` / `#111827` / `#1f2937`
- Destaque em azul/violeta neon `#6366f1` e verde online `#10b981`
- Efeito hover estilo Discord: ícones de servidor mudam de círculo para quadrado arredondado com brilho neon
