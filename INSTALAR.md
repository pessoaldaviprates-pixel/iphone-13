# 📥 Instalar sem loja e sem servidor

Dá para todo mundo jogar **de graça**, sem Play Store, sem App Store e sem
pagar hospedagem. São três caminhos — todos usam só o GitHub.

---

## 1. Ligue o GitHub Pages (grátis, 2 minutos)

O GitHub hospeda o jogo de graça para repositórios públicos. Não existe
servidor para comprar.

1. No GitHub, abra **Settings → Pages**
2. Em **Source**, escolha **Deploy from a branch**
3. Selecione a branch `claude/mobile-shooting-game-iiuvtq` (ou faça o merge na
   `main` e escolha ela) e a pasta **/ (root)**, depois **Save**
4. Em alguns minutos o jogo estará em:

   - Jogo: `https://SEU-USUARIO.github.io/NOME-DO-REPO/`
   - **Página de instalação (mande esta para os amigos):**
     `https://SEU-USUARIO.github.io/NOME-DO-REPO/baixar.html`

A página `baixar.html` mostra sozinha as instruções certas para quem abrir —
Android ou iPhone — e já monta o link do APK automaticamente.

---

## 2. iPhone e Android: instalar direto do navegador (PWA)

Este é o caminho mais simples, e vale para os dois sistemas:

**iPhone / iPad** — abra a página no **Safari** → botão **Compartilhar** →
**Adicionar à Tela de Início**.

**Android** — abra no **Chrome** → menu **⋮** → **Instalar aplicativo**.

O jogo vira um app de verdade: ícone na tela inicial, abre em tela cheia (sem
barra de navegador) e **funciona sem internet**, porque o service worker
guarda tudo no aparelho na primeira abertura.

> No iPhone, essa é a **única** forma gratuita de instalar sem a App Store — e
> funciona muito bem. Não precisa de conta de desenvolvedor nem pagar nada.

---

## 3. Android: gerar o APK pelo próprio Git

O repositório tem um robô (GitHub Actions) que compila o APK sozinho, de
graça, na nuvem do GitHub. Você não precisa de Android Studio, nem de PC
potente, nem de conta de desenvolvedor.

### Gerar uma versão

**Opção A — publicando uma versão (recomendado):**

```bash
git tag v1.0.0
git push origin v1.0.0
```

Em ~5 minutos o APK aparece em **Releases**, pronto para baixar:
`https://github.com/SEU-USUARIO/NOME-DO-REPO/releases/latest`

**Opção B — só para testar:** abra a aba **Actions** do repositório, escolha
**Gerar APK do Neon Nebula** e clique em **Run workflow**. O APK sai como
arquivo anexo na própria execução.

### Instalar no celular

1. Baixe o `neon-nebula.apk` pelo celular
2. Toque no arquivo
3. Se aparecer o aviso de "fontes desconhecidas", toque em
   **Configurações → Permitir desta fonte** e volte
4. O jogo instala como um app normal

### Assinatura: leia se for distribuir de verdade

Sem configuração, o robô gera um **APK de debug**. Ele instala e joga
normalmente, mas cada compilação usa uma assinatura diferente — então, para
instalar uma versão nova, a pessoa precisa desinstalar a antiga.

Para resolver (e permitir atualizar por cima), crie **uma vez** a sua chave e
guarde-a nos Secrets do GitHub:

```bash
# 1. crie a chave (guarde o arquivo e as senhas em lugar seguro!)
keytool -genkey -v -keystore chave.jks -keyalg RSA -keysize 2048 \
        -validity 10000 -alias neonnebula

# 2. converta para texto
base64 -w0 chave.jks > chave.txt     # no macOS: base64 -i chave.jks -o chave.txt
```

Depois, em **Settings → Secrets and variables → Actions → New repository
secret**, crie estes quatro:

| Nome do secret | Valor |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | todo o conteúdo de `chave.txt` |
| `ANDROID_KEYSTORE_PASSWORD` | a senha do keystore |
| `ANDROID_KEY_ALIAS` | `neonnebula` |
| `ANDROID_KEY_PASSWORD` | a senha da chave |

Com os secrets configurados, o robô passa a gerar um **APK de release
assinado** — o mesmo formato que você usaria na Play Store, mas distribuído
por fora dela.

> ⚠️ **Nunca** coloque o arquivo `chave.jks` dentro do repositório. Ele fica
> só no seu computador e nos Secrets (que são criptografados).

---

## 4. Sem nada disso: mande o arquivo

O jogo inteiro é **um único arquivo HTML**. Dá para mandar o `index.html` por
WhatsApp, e-mail ou pendrive — a pessoa abre no navegador e joga. Nesse modo
não tem ícone na tela inicial, mas funciona.

---

## E o iPhone, tem APK?

Não existe equivalente ao APK no iPhone: a Apple só permite instalar apps
fora da App Store por meio de contas de desenvolvedor (pagas) ou de
ferramentas como AltStore, em que o app **expira a cada 7 dias**.

Por isso, para iPhone, o caminho gratuito e definitivo é o **item 2**:
Safari → Compartilhar → Adicionar à Tela de Início. O resultado é praticamente
idêntico a um app instalado.

---

## Resumo

| Caminho | Android | iPhone | Custo |
|---|---|---|---|
| GitHub Pages + Adicionar à tela inicial | ✅ | ✅ | grátis |
| APK gerado pelo GitHub Actions | ✅ | ❌ | grátis |
| Mandar o `index.html` | ✅ | ✅ | grátis |
| Google Play / App Store (veja [PUBLICAR.md](PUBLICAR.md)) | ✅ | ✅ | US$ 25 / US$ 99 ao ano |
