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
- ✅ **Admin-Robô 🤖**: responde automaticamente (com indicador de "digitando…" e delay de 1s) a mensagens contendo "olá", "oi", "ajuda", "bom dia", "boa noite", "obrigado" e outras.
- ✅ **Persistência**: mensagens enviadas e servidores criados são salvos no LocalStorage e sobrevivem ao recarregamento da página.
- ✅ **Mobile-friendly**: em telas pequenas as colunas de servidores/canais viram uma gaveta deslizante acessível pelo menu ☰.

### Design
- Tema escuro profundo: `#0b0f19` / `#111827` / `#1f2937`
- Destaque em azul/violeta neon `#6366f1` e verde online `#10b981`
- Efeito hover estilo Discord: ícones de servidor mudam de círculo para quadrado arredondado com brilho neon
