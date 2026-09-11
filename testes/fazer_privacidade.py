# -*- coding: utf-8 -*-
"""Transforma loja/textos/politica-privacidade.md numa pagina que abre no
navegador. As duas lojas exigem um LINK que qualquer um consiga abrir, e
markdown cru no GitHub Pages desce como texto sem formatacao nenhuma."""
import io, os, re, html

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.join(AQUI, "..")
MD = os.path.join(RAIZ, "loja", "textos", "politica-privacidade.md")
SAIDA = os.path.join(RAIZ, "privacidade.html")

texto = io.open(MD, encoding="utf-8").read()


def linha(s):
    """negrito, italico e codigo — o suficiente para este texto"""
    s = html.escape(s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"(?<!\*)\*([^*]+?)\*(?!\*)", r"<em>\1</em>", s)
    s = re.sub(r"`(.+?)`", r"<code>\1</code>", s)
    s = re.sub(r"_(.+?)_", r"<em>\1</em>", s)
    return s


corpo, lista = [], False
for bruta in texto.split("\n"):
    l = bruta.rstrip()
    if l.startswith("- "):
        if not lista:
            corpo.append("<ul>")
            lista = True
        corpo.append("<li>" + linha(l[2:]) + "</li>")
        continue
    if lista:
        corpo.append("</ul>")
        lista = False
    if not l.strip():
        continue
    if l.startswith("## "):
        corpo.append("<h2>" + linha(l[3:]) + "</h2>")
    elif l.startswith("# "):
        corpo.append("<h1>" + linha(l[2:]) + "</h1>")
    else:
        corpo.append("<p>" + linha(l) + "</p>")
if lista:
    corpo.append("</ul>")

PAGINA = """<!doctype html>
<html lang="pt-BR"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Política de Privacidade — Neon Nebula</title>
<style>
  :root{color-scheme:dark}
  *{box-sizing:border-box}
  body{
    margin:0;padding:28px 20px 64px;background:#050813;color:#EDF3FF;
    font:16px/1.65 "Segoe UI",system-ui,-apple-system,sans-serif;
  }
  main{max-width:44rem;margin:0 auto}
  h1{font-size:1.6rem;line-height:1.25;margin:0 0 6px;color:#4DE8FF}
  h2{font-size:1.05rem;margin:30px 0 8px;color:#FFC145;
     border-bottom:1px solid rgba(120,200,255,.2);padding-bottom:6px}
  p{margin:0 0 12px;color:rgba(237,243,255,.86)}
  ul{margin:0 0 14px;padding-left:22px;color:rgba(237,243,255,.86)}
  li{margin-bottom:6px}
  strong{color:#EDF3FF}
  em{color:rgba(237,243,255,.6);font-style:normal}
  code{background:rgba(255,255,255,.08);padding:1px 5px;border-radius:5px;font-size:.9em}
  a{color:#4DE8FF}
  .voltar{display:inline-block;margin-top:34px;padding:11px 20px;border-radius:12px;
    background:rgba(77,232,255,.12);border:1px solid rgba(77,232,255,.35);
    color:#4DE8FF;text-decoration:none;font-weight:600}
</style>
</head><body><main>
%s
<a class="voltar" href="./">‹ Voltar para o jogo</a>
</main></body></html>
"""

io.open(SAIDA, "w", encoding="utf-8").write(PAGINA % "\n".join(corpo))
print("privacidade.html gerado:", len(io.open(SAIDA, encoding="utf-8").read()), "bytes")
