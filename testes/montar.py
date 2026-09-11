# -*- coding: utf-8 -*-
"""
montar.py — junta os pedaços de fonte/ e escreve o index.html

    python3 testes/montar.py           monta
    python3 testes/montar.py --olhar   só diz se está desencontrado

Por que existe: o jogo roda como UM arquivo (é o que o navegador abre, o
que o service worker guarda e o que vira o artifact), mas 27 mil linhas
num arquivo só não é lugar de trabalhar. Então edita-se em fonte/ e
monta-se aqui.

Se alguém editar o index.html direto por engano, o --olhar avisa antes
que o trabalho se perca.
"""
import io, os, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.join(AQUI, "..")
FONTE = os.path.join(RAIZ, "fonte")
ALVO = os.path.join(RAIZ, "index.html")

if not os.path.isdir(FONTE):
    print("fonte/ não existe. Rode testes/separar.py uma vez.")
    sys.exit(1)

ordem = [l.strip() for l in
         io.open(os.path.join(FONTE, "ordem.txt"), encoding="utf-8").read().split("\n")
         if l.strip()]

pedacos = []
for nome in ordem:
    caminho = os.path.join(FONTE, nome)
    if not os.path.exists(caminho):
        print("faltando:", nome)
        sys.exit(1)
    pedacos.append(io.open(caminho, encoding="utf-8").read())

novo = "".join(pedacos)
atual = io.open(ALVO, encoding="utf-8").read() if os.path.exists(ALVO) else ""

if "--olhar" in sys.argv:
    if novo == atual:
        print("fonte/ e index.html estão iguais. ✓")
        sys.exit(0)
    print("DESENCONTRADO: o index.html não é o que sai de fonte/.")
    print("  fonte/:", len(novo), "caracteres · index.html:", len(atual))
    print("  Se você editou o index.html direto, rode testes/separar.py")
    print("  para trazer a mudança de volta para fonte/.")
    sys.exit(1)

if novo == atual:
    print("nada mudou.")
    sys.exit(0)

io.open(ALVO, "w", encoding="utf-8").write(novo)
print("index.html montado a partir de", len(ordem), "pedaços ·",
      len(novo.split("\n")), "linhas")
