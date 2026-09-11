"""Confere se sobrou algum dado pessoal no arquivo publicado do jogo."""
import re, base64

ALVOS = ["CPF-REMOVIDO", "CPF-REMOVIDO", "Davi Prates", "DAVI PRATES"]

s = open("neon-nebula-artifact.html", encoding="utf-8").read()
print("== no texto do arquivo ==")
for a in ALVOS:
    print("  ", a, "->", a in s)

i = s.find("561")
print("contexto do '561':", repr(s[max(0, i - 70):i + 70]) if i >= 0 else "nenhum")

m = re.findall(r"[A-Za-z0-9+/=]{5000,}", s)
print("blocos base64 encontrados:", len(m))
for j, blob in enumerate(m):
    try:
        src = base64.b64decode(blob + "===").decode("utf-8", "replace")
    except Exception as e:
        print("  bloco", j, "nao decodificou:", e)
        continue
    print("  bloco", j, "tamanho", len(src))
    for a in ALVOS:
        if a in src:
            print("     ACHOU:", a)
    else:
        pass
print("fim")
