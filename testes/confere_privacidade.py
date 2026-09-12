# -*- coding: utf-8 -*-
"""Recusa publicar o jogo se sobrou dado pessoal dentro dele.

POR QUE ELE PROCURA POR FORMATO, E NAO POR UM NUMERO GUARDADO
------------------------------------------------------------
A versao antiga tinha o CPF escrito aqui dentro, como alvo de busca. Ai
a limpeza do historico do git (git-filter-repo) trocou o numero por
"CPF-REMOVIDO" em TODO arquivo do repositorio -- inclusive neste. O
guarda passou a procurar a palavra "CPF-REMOVIDO" e aprovava qualquer
coisa, calado, parecendo que estava funcionando.

Guardar o segredo dentro do guarda sempre foi contraditorio: para
conferir que o CPF nao vazou, o arquivo precisava conter o CPF. Agora
ele procura pelo FORMATO de um CPF (com os digitos verificadores
batendo, para nao acusar qualquer sequencia de 11 numeros). Nao guarda
numero nenhum, e pega o CPF de qualquer pessoa, nao so o de um.
"""
import re, sys, base64, os

AQUI = os.path.dirname(os.path.abspath(__file__))
ARQUIVO = sys.argv[1] if len(sys.argv) > 1 else os.path.join(AQUI, "neon-nebula-artifact.html")

NOMES = ["Davi Prates", "DAVI PRATES", "davi prates"]


def cpf_valido(d):
    """digitos verificadores do CPF. Sem isto, qualquer sequencia de 11
       numeros dentro de um base64 viraria alarme falso."""
    if len(d) != 11 or d == d[0] * 11:
        return False
    for corte in (9, 10):
        soma = sum(int(d[i]) * (corte + 1 - i) for i in range(corte))
        dig = (soma * 10) % 11
        if dig == 10:
            dig = 0
        if dig != int(d[corte]):
            return False
    return True


def procurar(texto, onde):
    achados = []
    # com pontuacao: 000.000.000-00
    for m in re.finditer(r"\b(\d{3})\.(\d{3})\.(\d{3})-(\d{2})\b", texto):
        if cpf_valido("".join(m.groups())):
            achados.append((onde, "CPF com pontos", m.start()))
    # sem pontuacao: 11 digitos isolados
    for m in re.finditer(r"(?<!\d)(\d{11})(?!\d)", texto):
        if cpf_valido(m.group(1)):
            achados.append((onde, "CPF sem pontos", m.start()))
    for n in NOMES:
        i = texto.find(n)
        if i >= 0:
            achados.append((onde, "nome completo (" + n + ")", i))
    return achados


if not os.path.exists(ARQUIVO):
    print("NAO ACHEI:", ARQUIVO)
    raise SystemExit(2)

s = open(ARQUIVO, encoding="utf-8").read()
achados = procurar(s, "no texto")

# o artifact carrega uma copia de si mesmo em base64: precisa abrir e olhar dentro
blocos = re.findall(r"[A-Za-z0-9+/=]{5000,}", s)
print("arquivo:", os.path.basename(ARQUIVO), "-", len(s), "bytes,",
      len(blocos), "bloco(s) base64")
for j, blob in enumerate(blocos):
    try:
        dentro = base64.b64decode(blob + "===").decode("utf-8", "replace")
    except Exception as e:
        print("  bloco", j, "nao abriu:", e)
        continue
    print("  bloco", j, "->", len(dentro), "bytes")
    achados += procurar(dentro, "dentro do bloco base64 " + str(j))

if achados:
    print("\nRECUSADO - dado pessoal encontrado:")
    for onde, oque, pos in achados:
        trecho = (s if onde == "no texto" else "")[max(0, pos - 40):pos + 40]
        print("  *", oque, "-", onde, "(posicao", str(pos) + ")")
        if trecho:
            print("    ...", trecho.replace("\n", " "), "...")
    raise SystemExit(1)

print("\nlimpo: nenhum CPF e nenhum nome completo no arquivo publicado.")
