# 📱 Como publicar o Neon Nebula na Google Play e na App Store

Guia prático, do zero até o app no ar. Tudo o que dá para adiantar já está
pronto neste repositório (ícones, banner, capturas, textos e política de
privacidade) — veja a seção [O que já está pronto](#o-que-já-está-pronto).

> As regras das lojas mudam de tempos em tempos. Os valores e exigências
> abaixo valem para 2026; confirme os detalhes no painel de cada loja na hora
> de enviar.

---

## Resumo rápido

|                        | Google Play | App Store |
|---|---|---|
| **Custo da conta**     | US$ 25, uma vez | US$ 99 por ano |
| **Precisa de Mac?**    | Não | **Sim** (Xcode) ou um serviço de build em nuvem |
| **Como empacotar**     | PWABuilder (mais fácil) ou Capacitor | Capacitor |
| **Formato do arquivo** | `.aab` (Android App Bundle) | `.ipa` enviado pelo Xcode |
| **Tempo de análise**   | de algumas horas a alguns dias | normalmente 24–48 h |
| **Pegadinha principal**| conta pessoal precisa de teste fechado antes da produção | regra 4.2: "app que é só um site" é rejeitado |

**Caminho mais rápido:** comece pela **Google Play** — é mais barato, não
precisa de Mac e a análise costuma ser mais tolerante. Depois, com o jogo já
rodando, parta para a App Store.

---

## Passo 0 — Publique o jogo na web (10 minutos)

Serve para três coisas: testar no celular, hospedar a **política de
privacidade** (as duas lojas exigem um link público) e permitir o caminho
mais fácil no Android (PWABuilder).

1. No GitHub, abra **Settings → Pages**
2. Em **Source**, escolha **Deploy from a branch**
3. Selecione a branch `claude/mobile-shooting-game-iiuvtq` (ou faça o merge na
   `main` e escolha ela) e a pasta **/ (root)**, depois salve
4. Em poucos minutos o jogo estará em
   `https://SEU-USUARIO.github.io/NOME-DO-REPO/`

A política de privacidade fica automaticamente em
`https://SEU-USUARIO.github.io/NOME-DO-REPO/loja/textos/politica-privacidade.md`
— mas o ideal é publicá-la como página HTML. Dica rápida: cole o conteúdo de
`loja/textos/politica-privacidade.md` num Gist público, num Google Docs
público, ou num arquivo `privacidade.html` na raiz do repositório.

> **Antes de enviar às lojas**, edite `loja/textos/politica-privacidade.md` e
> troque `SEU-EMAIL-AQUI@exemplo.com` pelo seu e-mail de contato real.

---

## Caminho A — Google Play

### A1. Criar a conta de desenvolvedor

1. Acesse [play.google.com/console](https://play.google.com/console)
2. Pague a taxa única de **US$ 25**
3. Escolha o tipo de conta:
   - **Pessoal** — mais simples, mas exige a fase de testes do passo A5
   - **Organização** — precisa de um número D-U-N-S da empresa; dispensa
     aquela exigência de testadores
4. Verifique sua identidade (documento com foto). Costuma levar de 1 a 3 dias.

### A2. Gerar o app Android

Escolha **uma** das duas opções.

#### Opção 1 — PWABuilder (a mais fácil, ~10 minutos)

Funciona porque o jogo já é um PWA completo (manifesto + service worker +
ícones). O app fica sendo uma "casca" que abre o seu site em tela cheia,
sem barra de navegador (tecnologia TWA).

1. Abra [pwabuilder.com](https://www.pwabuilder.com/)
2. Cole a URL do passo 0 e clique em **Start**
3. Clique em **Package for stores → Android → Generate Package**
4. Baixe o `.zip`. Dentro dele vêm:
   - `app-release-bundle.aab` — é este arquivo que você envia à Play
   - `signing.keystore` + `signing-key-info.txt` — **guarde para sempre**;
     sem essa chave você nunca mais consegue atualizar o app
   - `assetlinks.json`
5. Copie o `assetlinks.json` para a pasta `.well-known/` do seu site, de modo
   que ele fique acessível em
   `https://SEU-USUARIO.github.io/NOME-DO-REPO/.well-known/assetlinks.json`
   (crie a pasta `.well-known` na raiz do repositório). Sem isso, o app abre
   com a barra de endereço do navegador aparecendo.

   > O arquivo `.nojekyll` já está na raiz deste repositório justamente por
   > causa disso: sem ele, o GitHub Pages ignora pastas que começam com ponto
   > e o `assetlinks.json` daria 404.

> ⚠️ O app depende do site continuar no ar. Se você tirar o GitHub Pages do
> ar, o app para de abrir. Se isso te incomodar, use a Opção 2.

#### Opção 2 — Capacitor (app 100% offline, sem depender do site)

O jogo inteiro vai embutido dentro do app. É o mesmo caminho usado depois
para o iPhone, então vale aprender agora.

Você precisa de: [Node.js](https://nodejs.org) e
[Android Studio](https://developer.android.com/studio) instalados.

```bash
# na pasta do projeto
cd empacotar

# 1. troque com.seunome.neonnebula por um ID só seu, no capacitor.config.json
#    (ex.: com.davi.neonnebula — precisa ser único no mundo e nunca mudar)
npm install
npm run preparar          # copia o jogo para empacotar/www/
npx cap add android       # cria o projeto Android
npm run icones            # gera ícones e telas de abertura em todos os tamanhos
npm run android           # sincroniza e abre no Android Studio
```

No Android Studio:

1. Menu **Build → Generate Signed App Bundle / APK → Android App Bundle**
2. Em **Key store path**, clique em **Create new...** e crie sua chave de
   assinatura. **Guarde o arquivo `.jks` e as senhas para sempre** — é com
   ela que você assina todas as atualizações futuras
3. Escolha a variante **release** e conclua
4. O arquivo sai em `android/app/release/app-release.aab`

Ajuste recomendado em `android/app/src/main/AndroidManifest.xml`, para travar
o jogo na vertical — procure a linha da `MainActivity` e acrescente:

```xml
android:screenOrientation="portrait"
```

### A3. Criar o app no Play Console

1. **Criar app** → nome `Neon Nebula`, idioma padrão Português (Brasil),
   tipo **Jogo**, **Gratuito**
2. Preencha o **Painel de configuração** (o Console vai te guiando):
   - **Ficha da loja**: use os textos de
     [`loja/textos/descricao-play.txt`](loja/textos/descricao-play.txt)
   - **Ícone**: `loja/icones/icon-512-playstore.png`
   - **Gráfico de destaque**: `loja/banner/feature-graphic-1024x500.png`
   - **Capturas de telefone**: as 8 imagens de `loja/capturas/play/`
     (o mínimo são 2; use pelo menos 4)
   - **Classificação indicativa**: responda o questionário — violência de
     fantasia leve, sem sangue, sem conteúdo sexual, sem drogas
   - **Segurança dos dados**: marque **não coleta nenhum dado**
   - **Política de privacidade**: cole o link do passo 0
   - **Categoria**: Jogos → Arcade
   - **Público-alvo**: escolha as faixas etárias que quiser atingir

### A4. Enviar a versão

1. Vá em **Versões → Produção** (ou **Teste fechado**, veja A5)
2. **Criar nova versão** e envie o `.aab`
3. Aceite o **Play App Signing** (o Google guarda uma cópia da chave — é o
   recomendado, protege você se perder a sua)
4. Escreva as notas da versão (ex.: "Primeira versão: 120 fases, 50 naves,
   6 chefes e árvore de habilidades.")

### A5. A etapa que pega todo mundo: teste fechado

Se sua conta é **pessoal** (criada depois de novembro de 2023), o Google
exige, **antes** de liberar a produção:

- um **teste fechado** com pelo menos **12 testadores** inscritos
- mantidos por **14 dias seguidos**
- e depois um pedido de **acesso à produção**

Como fazer: crie a faixa **Teste fechado**, gere o link de participação e
mande para 12 pessoas (amigos, família, grupos de teste). Elas precisam
aceitar o convite e manter o app instalado durante as duas semanas.

> Contas de **organização** (com D-U-N-S) não passam por isso. Confira a regra
> atual no próprio Console, porque o Google já ajustou esses números.

### A6. Publicar

Depois de tudo verde, clique em **Enviar para revisão**. A primeira análise
costuma levar de algumas horas a até 7 dias. Você recebe e-mail com o
resultado, e o app aparece na loja em algumas horas depois da aprovação.

---

## Caminho B — App Store (iPhone)

### B1. O que você precisa antes

- **Conta paga**: [developer.apple.com/programs](https://developer.apple.com/programs/)
  — US$ 99 por ano
- **Um Mac com Xcode**. Não existe forma oficial de enviar um app à App Store
  sem macOS. Se você não tem um Mac, as saídas são:
  - **Codemagic** ou **Ionic Appflow** — fazem o build e o envio na nuvem
    (têm plano gratuito limitado)
  - **MacinCloud** — aluguel de Mac remoto por hora/mês
  - Pedir emprestado o Mac de alguém só para o envio

### B2. Gerar o app iOS

No Mac, com Node.js e Xcode instalados:

```bash
cd empacotar
npm install
npm run preparar
npx cap add ios
npm run icones
npm run ios          # abre o projeto no Xcode
```

No Xcode:

1. Selecione o projeto **App** → aba **Signing & Capabilities**
2. Marque **Automatically manage signing** e escolha sua conta (Team)
3. Confirme o **Bundle Identifier** (o mesmo `appId` do
   `capacitor.config.json`)
4. Em **General → Deployment Info**, deixe apenas **Portrait** marcado
5. Menu **Product → Archive**
6. Na janela **Organizer**, clique em **Distribute App → App Store Connect**

### B3. A regra 4.2 — leia antes de enviar

A Apple rejeita apps que são "apenas um site empacotado"
(*Guideline 4.2 — Minimum Functionality*). Um jogo completo, que roda offline
e guarda progresso, normalmente **passa** — mas vale reduzir o risco:

- ✅ **Use o Capacitor**, não uma casca que abre uma URL. O conteúdo tem que
  estar dentro do app
- ✅ Garanta que o jogo abre e funciona **em modo avião**
- ✅ Configure ícone e tela de abertura nativos (`npm run icones` faz isso)
- ✅ Trave a orientação em retrato e esconda a barra de status
- ❌ Não deixe nenhuma barra de navegador, botão "voltar" de browser ou link
  externo visível

Se mesmo assim vier uma rejeição por 4.2, responda no **Resolution Center**
explicando que é um jogo original, que funciona totalmente offline, com
progressão, 120 fases e conteúdo próprio — e não um site reempacotado. Isso
costuma resolver.

### B4. Ficha na App Store Connect

1. Em [appstoreconnect.apple.com](https://appstoreconnect.apple.com) →
   **Meus apps → +** → **Novo app**
2. Preencha com os textos de
   [`loja/textos/descricao-appstore.txt`](loja/textos/descricao-appstore.txt)
3. **Ícone**: `loja/icones/icon-1024-appstore.png` (1024×1024, sem
   transparência e sem cantos arredondados — a Apple aplica o arredondamento)
4. **Capturas**: as imagens de `loja/capturas/ios/` (1290×2796, tamanho de
   iPhone 6,7"). A Apple aceita esse conjunto para todos os iPhones
5. **Privacidade do app**: marque **"Dados não coletados"**
6. **Classificação etária**: violência de fantasia leve/infrequente
7. **Preço**: Gratuito
8. Cole o link da política de privacidade

### B5. Testar e enviar

1. Depois do **Archive**, o build aparece em **TestFlight** em alguns minutos
   (leva um tempo processando)
2. Instale pelo TestFlight no seu iPhone e jogue de verdade antes de enviar
3. Em **Distribuição → Enviar para análise**
4. A análise leva normalmente 24–48 horas

---

## O que já está pronto

Tudo isto já está neste repositório, é só usar:

| Arquivo | Para quê |
|---|---|
| `loja/icones/icon-512-playstore.png` | Ícone da ficha na Google Play |
| `loja/icones/icon-1024-appstore.png` | Ícone da App Store e mestre do Capacitor |
| `loja/icones/icon-1024-mascara.png` | Versão com cantos arredondados (uso na web) |
| `loja/banner/feature-graphic-1024x500.png` | Gráfico de destaque da Google Play (obrigatório) |
| `loja/capturas/play/*.png` (8 imagens, 1080×1920) | Capturas para a Google Play |
| `loja/capturas/ios/*.png` (8 imagens, 1290×2796) | Capturas para a App Store |
| `loja/textos/descricao-play.txt` | Nome, descrições, categoria e respostas dos questionários |
| `loja/textos/descricao-appstore.txt` | Nome, subtítulo, palavras-chave e descrição |
| `loja/textos/politica-privacidade.md` | Política de privacidade exigida pelas duas lojas |
| `empacotar/` | Projeto Capacitor pronto (só rodar `npm install`) |

As capturas foram tiradas do jogo rodando de verdade, nas resoluções que cada
loja pede. Se quiser trocar alguma, é só jogar no celular e usar a captura de
tela do próprio aparelho.

---

## Dúvidas comuns

**Preciso pagar para testar no meu celular?**
Não. Abra o link do passo 0 no navegador do celular e use "Adicionar à tela
inicial" — o jogo instala como app, em tela cheia e funcionando offline. Isso
já resolve para uso pessoal e para mandar para amigos.

**Perdi a chave de assinatura. E agora?**
Na Google Play, se você ativou o **Play App Signing**, o suporte consegue te
ajudar a redefinir a chave de upload. Sem isso, seria preciso publicar um app
novo, com outro ID. Guarde a chave em dois lugares diferentes.

**O botão "Salvar na nuvem" vai funcionar no app das lojas?**
Não — ele existe só na versão publicada como Artifact do Claude. No app, o
progresso é salvo no aparelho (localStorage + IndexedDB), que já é bem
resistente. Se quiser progresso sincronizado entre aparelhos, dá para ligar o
jogo num serviço gratuito como o Firebase depois.

**Posso vender o jogo ou colocar anúncios?**
Pode. Para cobrar, basta marcar como pago no painel (a Play exige uma conta de
pagamentos). Para anúncios, o caminho comum é o AdMob, que entra como um
plugin do Capacitor — e aí a política de privacidade precisa ser atualizada,
porque passaria a haver coleta de dados.

**O nome "Neon Nebula" pode estar ocupado?**
Pode. Pesquise nas duas lojas antes de decidir. Se estiver, dá para publicar
com um nome levemente diferente (ex.: "Neon Nebula: Setor 7") sem mudar nada
no jogo.
