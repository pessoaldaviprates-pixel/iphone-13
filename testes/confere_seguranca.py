#!/usr/bin/env python3
"""Confere o que NÃO pode ir para um lugar público (itch.io, GitHub Pages).

Por que este guarda existe, e o que ele não consegue fazer
----------------------------------------------------------
O Neon Nebula é um arquivo só que roda no navegador de quem joga. Isso
quer dizer uma coisa que não tem volta: **tudo o que está no jogo está
nas mãos de quem abrir o jogo**. Não existe segredo dentro de um arquivo
que você entrega. Um `Ctrl+U` mostra o código inteiro.

Então este guarda não tenta esconder segredo — isso seria a mesma
armadilha do `confere_privacidade.py`, que um dia guardou o CPF dentro
de si mesmo para poder procurá-lo. Ele procura as coisas que **não
deveriam estar ali de jeito nenhum**:

  1. a senha mestra do painel ainda na de fábrica
  2. a senha escrita por extenso num comentário, do lado do hash
  3. o endereço da nuvem apontando para o Firebase de teste
  4. chave de API de serviço pago dentro do arquivo

O item 2 é o mais bobo e o mais grave: o hash não precisa ser quebrado
se a senha está escrita ao lado dele.

O QUE ELE NÃO RESOLVE, e você precisa saber: o painel de administrador
é conferido pelo próprio navegador de quem entra. Quem abrir as
ferramentas do desenvolvedor passa por ele. A única tranca de verdade
está nas REGRAS DO FIREBASE, que rodam no servidor do Google e ninguém
contorna. Veja o NUVEM.md e o ITCH.md.
"""
import re
import sys
import pathlib

RAIZ = pathlib.Path(__file__).resolve().parent.parent

# a senha de fábrica, em djb2 — o mesmo admHash() do jogo
def djb2(t: str) -> str:
    h = 5381
    for c in t:
        h = ((h << 5) + h + ord(c)) & 0xFFFFFFFF
    return format(h, "x")

# Não guardamos nenhuma senha aqui dentro: calculamos o hash das senhas
# ÓBVIAS na hora e comparamos. Um guarda que precisa conter o segredo
# para conferir o segredo está errado de nascença (CLAUDE.md).
OBVIAS = ["neonadmin", "admin", "123456", "senha", "password", "1234",
          "neonnebula", "nebula", "cr1cket", "dono", "master"]

problemas = []
avisos = []


def confere(caminho: pathlib.Path):
    if not caminho.exists():
        avisos.append(f"{caminho.name} não existe — nada a conferir")
        return
    txt = caminho.read_text(encoding="utf-8", errors="replace")
    nome = caminho.name

    # 1. a senha mestra ainda é uma senha óbvia?
    m = re.search(r'ADM_MASTER\s*=\s*"([0-9a-f]+)"', txt)
    if m:
        atual = m.group(1)
        for senha in OBVIAS:
            if djb2(senha) == atual:
                problemas.append(
                    f"{nome}: a senha mestra do painel é uma senha óbvia. "
                    f"Qualquer pessoa entra no painel de administrador. "
                    f"Troque o ADM_MASTER (veja o ITCH.md)."
                )
                break

    # 2. a senha escrita por extenso ao lado do hash
    for linha in txt.splitlines():
        if "ADM_MASTER" in linha and re.search(r"(//|/\*).*senha", linha, re.I):
            problemas.append(
                f"{nome}: a senha do painel está escrita num comentário ao lado "
                f"do hash. Não adianta guardar o hash e entregar a senha: "
                f"«{linha.strip()[:70]}»"
            )

    # 3. nuvem de teste — SÓ no config.js.
    # No index.html o 127.0.0.1 aparece de propósito: é o suporte a
    # `?nuvem=http://127.0.0.1:8099`, que os testes usam justamente para
    # NÃO precisarem editar o config.js (foi assim que a v5.5 e a v5.6
    # subiram sem nuvem nenhuma). Reclamar dele ali seria o guarda
    # brigando com o conserto de um bug antigo.
    if nome == "config.js" and ("127.0.0.1" in txt or "localhost" in txt):
        problemas.append(f"{nome}: aponta para o Firebase de TESTE. "
                         "Publicar assim deixa o jogo sem nuvem nenhuma.")

    # 4. chaves de serviço pago
    for padrao, oquee in [
        (r"AIza[0-9A-Za-z_\-]{30,}", "chave de API do Google"),
        (r"sk_live_[0-9A-Za-z]{10,}", "chave do Stripe"),
        (r"gh[pousr]_[0-9A-Za-z]{20,}", "token do GitHub"),
        (r"xox[baprs]-[0-9A-Za-z\-]{10,}", "token do Slack"),
    ]:
        if re.search(padrao, txt):
            problemas.append(f"{nome}: parece ter {oquee} dentro do arquivo.")

    # 5. avisos: coisas que não impedem publicar mas você tem que saber
    if re.search(r'DONOS\s*=\s*\[', txt):
        d = re.search(r'DONOS\s*=\s*\[([^\]]*)\]', txt)
        quantos = len([x for x in (d.group(1) if d else "").split(",") if x.strip()])
        avisos.append(
            f"{nome}: o dono é reconhecido só pelo NICK ({quantos} na lista). "
            "Num lugar público, qualquer pessoa pode criar uma conta com esse "
            "nick. Quem barra de verdade é a senha mestra + as regras do Firebase."
        )
    if re.search(r'CONTAS_SEM_SENHA\s*=\s*\[\s*"', txt):
        avisos.append(
            f"{nome}: existe conta que entra SEM SENHA (CONTAS_SEM_SENHA). "
            "Em lugar público, qualquer um entra nela."
        )


for alvo in ["index.html", "neon-nebula-artifact.html", "config.js"]:
    confere(RAIZ / alvo)

print("=" * 66)
print("CONFERÊNCIA DE SEGURANÇA PARA PUBLICAR")
print("=" * 66)

if avisos:
    print("\nAVISOS (não impedem publicar, mas saiba disto):")
    for a in avisos:
        print("  ! " + a)

if problemas:
    print("\nPROBLEMAS:")
    for p in problemas:
        print("  ✗ " + p)
    print("\nrecusado: conserte os problemas acima antes de publicar.")
    sys.exit(1)

print("\nok: nenhuma senha óbvia, nenhum endereço de teste, nenhuma chave de serviço.")
print("Lembre: a tranca de verdade são as regras do Firebase (NUVEM.md).")
sys.exit(0)
