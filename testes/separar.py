# -*- coding: utf-8 -*-
"""
separar.py — parte o index.html em pedaços editáveis dentro de fonte/

O jogo continua sendo UM arquivo só (o index.html é o que o navegador
abre, o que o service worker guarda e o que vira o artifact). O que muda
é onde a gente edita: em vez de um arquivo de 27 mil linhas, uma pasta
com pedaços de tamanho humano.

Regra de ouro: juntar os pedaços de volta tem de dar EXATAMENTE o
arquivo de onde eles saíram. O montar.py confere isso a cada montagem.

Roda uma vez só; depois disso quem manda é o montar.py.
"""
import io, os, re, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.join(AQUI, "..")
FONTE = os.path.join(RAIZ, "fonte")

texto = io.open(os.path.join(RAIZ, "index.html"), encoding="utf-8").read()

# ---------------------------------------------------------------- cortes
# Cada pedaço é (nome do arquivo, texto). A ordem da lista é a ordem da
# montagem. Nada é jogado fora: o que não é código vira "colagem".
partes = []


def corta(rotulo, inicio, fim):
    """guarda texto[inicio:fim] com este nome"""
    partes.append((rotulo, texto[inicio:fim]))


# 1) tudo até o <style>
i_style = texto.index("<style>") + len("<style>")
corta("00-cabeca.html", 0, i_style)

# 2) a folha de estilo
f_style = texto.index("\n</style>")
corta("01-estilo.css", i_style, f_style)

# 3) do </style> até o primeiro <script>
scripts = [(m.start(), m.end()) for m in re.finditer(r"<script>", texto)]
# só interessam os </script> que fecham um <script> sem atributo
fins = []
for ini, ini_fim in scripts:
    fins.append(texto.index("</script>", ini_fim))
assert len(scripts) == len(fins), "script aberto e fechado não batem"

corta("02-corpo.html", f_style, scripts[0][1])

# 4) cada bloco de código, partido em pedaços de no máximo ~2.500 linhas
#    nas fronteiras dos comentários de seção
NOMES = ["03-base", "04-jogo", "05-nuvem", "06-painel", "07-extras"]
for n, (ini, ini_fim) in enumerate(scripts):
    corpo = texto[ini_fim:fins[n]]
    linhas = corpo.split("\n")
    nome = NOMES[n] if n < len(NOMES) else "0%d-bloco" % (n + 3)
    if len(linhas) <= 2500:
        partes.append((nome + ".js", corpo))
    else:
        # procura linhas que começam uma seção, para cortar em lugar limpo
        cortes = [0]
        for k, l in enumerate(linhas):
            if k - cortes[-1] >= 1800 and (l.startswith("/* =") or l.startswith("/* ---")):
                cortes.append(k)
        cortes.append(len(linhas))
        for k in range(len(cortes) - 1):
            pedaco = "\n".join(linhas[cortes[k]:cortes[k + 1]])
            if k < len(cortes) - 2:
                pedaco += "\n"
            partes.append(("%s-%d.js" % (nome, k + 1), pedaco))
    # o que vem depois do </script> até o próximo <script> (ou o fim)
    prox = scripts[n + 1][1] if n + 1 < len(scripts) else len(texto)
    partes.append(("%s-fim.html" % nome, texto[fins[n]:prox]))

# ---------------------------------------------------------------- confere
junto = "".join(p[1] for p in partes)
if junto != texto:
    print("ERRO: juntar os pedaços não deu o arquivo original.")
    print("original:", len(texto), "· juntado:", len(junto))
    sys.exit(1)

# ---------------------------------------------------------------- escreve
os.makedirs(FONTE, exist_ok=True)
ordem = []
for nome, conteudo in partes:
    io.open(os.path.join(FONTE, nome), "w", encoding="utf-8").write(conteudo)
    ordem.append(nome)
io.open(os.path.join(FONTE, "ordem.txt"), "w", encoding="utf-8").write("\n".join(ordem) + "\n")

print("pedaços criados em fonte/:")
for nome in ordem:
    n = len(io.open(os.path.join(FONTE, nome), encoding="utf-8").read().split("\n"))
    print("  %-22s %5d linhas" % (nome, n))
print("\njuntando de volta dá exatamente o index.html original. ✓")
