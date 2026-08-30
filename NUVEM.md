# ☁️ Ligar o modo online (grátis, ~10 minutos)

Por padrão o jogo roda **só no aparelho de cada jogador** — por isso o piloto
que seu amigo criou não apareceu para você. Não é defeito: é que não existe
servidor nenhum no meio.

Este guia liga a camada online usando o **Firebase Realtime Database**, do
Google, no plano gratuito (não pede cartão). Com ela você passa a ter:

- 🏆 **Ranking online** — todos os jogadores aparecem no menu do jogo
- 👥 **Lista de jogadores no painel ADM** — com busca pelo nome
- 🎁 **Presentes à distância** — você envia cristais, naves, fases ou os
  amuletos lendários, e a pessoa recebe assim que abrir o jogo

---

## Passo 1 — Criar o banco de dados

1. Entre em [console.firebase.google.com](https://console.firebase.google.com)
   com sua conta Google
2. **Adicionar projeto** → dê um nome (ex.: `neon-nebula`) → pode desativar o
   Google Analytics → **Criar projeto**
3. No menu da esquerda: **Criar** → **Realtime Database** → **Criar banco**
4. Escolha o local (qualquer um; `us-central1` serve) e, quando perguntar
   sobre as regras, escolha **Iniciar no modo de teste** — vamos ajustar as
   regras direito no passo 3
5. Copie o endereço que aparece no topo, algo como:

   ```
   https://neon-nebula-default-rtdb.firebaseio.com
   ```

## Passo 2 — Colar o endereço no jogo

Abra o arquivo **`config.js`** (fica na raiz do repositório, tem só 15 linhas)
e cole o endereço entre as aspas:

```js
window.NN_CONFIG = {
  NUVEM_URL: "https://neon-nebula-default-rtdb.firebaseio.com"
};
```

Este é o **único** arquivo que você precisa editar. Dá para fazer direto pelo
site do GitHub: abra o `config.js`, toque no lápis ✏️, cole o endereço e
clique em **Commit changes**.

Em um ou dois minutos o GitHub Pages atualiza sozinho, e aí aparecem o botão
**🏆 RANKING ONLINE** no menu e a seção **JOGADORES ONLINE** no painel ADM.

## Passo 3 — Ajustar as regras de segurança

No Firebase, aba **Regras** do Realtime Database, cole isto e publique:

```json
{
  "rules": {
    "pilotos": {
      ".read": true,
      "$id": {
        ".write": true,
        ".validate": "newData.hasChildren(['nome']) && newData.child('nome').isString() && newData.child('nome').val().length <= 20"
      }
    },
    "presentes": {
      "$id": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

Isso limita o que pode ser gravado e evita que o banco vire depósito de
lixo. **Não deixe no "modo de teste" para sempre** — ele expira em 30 dias e,
até lá, aceita qualquer coisa.

---

## O que é enviado para a nuvem

Só o resumo do jogo, nada pessoal:

| Campo | Exemplo |
|---|---|
| apelido do piloto | `Joao` |
| fase alcançada | `37` |
| cristais | `18450` |
| naves, amuletos, habilidades | `12`, `5`, `37` |
| recorde de pontos | `24870` |

Não há e-mail, telefone, localização nem qualquer dado do aparelho — apenas
um código aleatório para diferenciar um celular do outro.

---

## Como usar no dia a dia

**Ver todos os jogadores:** menu → **🏆 RANKING ONLINE**. A lista vem ordenada
por fase e mostra você destacado.

**Dar coisas para alguém:** tela de login → **⚙ PAINEL ADM** → senha →
seção **JOGADORES ONLINE** → busque o nome → toque no jogador → escolha:

- campo livre de **cristais** + ENVIAR
- **TODAS AS NAVES** · **TODAS AS FASES** · **3 LENDÁRIOS** · **ENVIAR TUDO**

O presente fica guardado e é entregue quando a pessoa abrir o jogo — ela vê o
aviso *"🎁 Presente recebido"* no menu. Se você mandar vários presentes antes
de ela abrir, eles se somam (nenhum é perdido).

---

## Limites que você precisa saber

- **Não é à prova de trapaça.** O jogo roda no aparelho do jogador, então
  quem entender de código pode alterar o próprio save e o número sobe no
  ranking. Para um jogo entre amigos isso não costuma incomodar; travar de
  verdade exigiria validar as partidas num servidor.
- **O endereço do banco fica visível** no código do jogo. Isso é normal em
  aplicativos web do Firebase — a segurança vem das regras do passo 3, não
  de esconder o endereço.
- **A cota gratuita** do Firebase (1 GB de armazenamento e 10 GB de tráfego
  por mês) é muito mais do que este jogo consome: cada jogador grava algumas
  centenas de bytes.
- **Na versão publicada como Artifact do Claude** o modo online fica desligado
  automaticamente, porque aquela página bloqueia conexões externas. No
  GitHub Pages e no APK funciona normalmente.

---

## Se preferir não ligar nada

O jogo continua funcionando 100% offline, do jeito que está hoje. Sem
`NUVEM_URL` preenchido, nenhuma conexão é feita e o botão de ranking nem
aparece.
