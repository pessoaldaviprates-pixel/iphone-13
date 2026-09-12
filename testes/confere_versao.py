# -*- coding: utf-8 -*-
"""Recusa publicar se o "const VERSAO" sair do pedaço final da página.

POR QUE ISTO EXISTE
-------------------
O jogo descobre que saiu versão nova pedindo ao servidor só o PEDAÇO
FINAL da própria página e lendo o `const VERSAO` de lá (Range:
bytes=-80000). É barato e funciona em qualquer lugar — mas é uma
promessa que a ordem dos arquivos em fonte/ tem que cumprir.

Quando a cabine 3D entrou em fonte/ordem.txt DEPOIS do 07-extras-2.js,
ela empurrou o número para 41 KB do fim, além do pedaço de 40 KB que o
jogo pedia na época. O jogo parou de enxergar a si mesmo e teria voltado
a ficar preso numa cópia velha — em silêncio, que é o pior jeito.

Uso:  python3 testes/confere_versao.py [arquivo] [limite]
"""
import re, sys, io, os

AQUI = os.path.dirname(os.path.abspath(__file__))
ARQ = sys.argv[1] if len(sys.argv) > 1 else os.path.join(AQUI, "..", "index.html")
LIMITE = int(sys.argv[2]) if len(sys.argv) > 2 else 80000   # o mesmo Range do versaoNoServidor
MARGEM = 8000                                               # não deixa encostar no limite

if not os.path.exists(ARQ):
    print("não achei:", ARQ)
    sys.exit(2)

b = io.open(ARQ, "rb").read()
m = list(re.finditer(rb'const VERSAO = "[0-9.]+"', b))
if not m:
    print("VERSAO: não achei o const VERSAO em", os.path.basename(ARQ))
    sys.exit(1)

d = len(b) - m[0].start()
if d > LIMITE - MARGEM:
    print("VERSAO LONGE DEMAIS DO FIM: %d bytes." % d)
    print("O jogo só busca os últimos %d, e a margem de segurança é %d." % (LIMITE, MARGEM))
    print("Conserto: mova o arquivo novo para ANTES de 07-extras-2.js em")
    print("fonte/ordem.txt — ou aumente o Range em versaoNoServidor E o")
    print("limite aqui, sempre os dois juntos.")
    sys.exit(1)

print("VERSAO OK (%d bytes do fim, cabe nos %d)" % (d, LIMITE))
