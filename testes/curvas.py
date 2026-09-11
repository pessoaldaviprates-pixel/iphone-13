# -*- coding: utf-8 -*-
"""
curvas.py — simula a economia e a dificuldade das 270 fases

Os itens 25 e 67 da lista pediam "revisar a curva com dados". Sem
jogador de verdade ainda, os dados que existem são os do próprio jogo:
quanto cada fase paga, quanto custa cada coisa e quantas ondas você
aguenta. Este arquivo põe isso numa tabela para a decisão não ser
palpite.

    python3 testes/curvas.py
"""
import io, os, re

AQUI = os.path.dirname(os.path.abspath(__file__))
JOGO = os.path.join(AQUI, "..")
fonte = io.open(os.path.join(JOGO, "index.html"), encoding="utf-8").read()

TOTAL = 270


def faseReward(f):
    return 20 + f * 4 + round(f * f * 0.05)


def faseWaves(f):
    return min(20, 3 + (f - 1) // 12)


# confere que a fórmula de preço daqui é a mesma do jogo
assert "Math.round(60 * Math.pow(1.16, i - 1) / 5) * 5" in fonte, \
    "o preço das naves mudou no jogo: ajuste este arquivo"


def precoNave(i):
    return 0 if i == 0 else round(60 * (1.16 ** (i - 1)) / 5) * 5

CHEST = 300

print("=" * 66)
print("ECONOMIA — quanto o jogador junta jogando limpo (sem VIP, sem baú)")
print("=" * 66)
acumulado = 0
marcos = [1, 10, 25, 50, 75, 100, 150, 200, 270]
linhas = []
for f in range(1, TOTAL + 1):
    acumulado += faseReward(f)
    if f in marcos:
        linhas.append((f, faseReward(f), acumulado))
print("%6s %10s %14s %28s" % ("fase", "paga", "acumulado", "dá para comprar"))
for f, paga, ac in linhas:
    # quantas naves da lista ele consegue com o que juntou
    naves = 0
    gasto = 0
    i = 1
    while i < 120:
        p = precoNave(i)
        if gasto + p > ac:
            break
        gasto += p
        naves += 1
        i += 1
    print("%6d %10s %14s   %d naves seguidas (ou %d baús)" %
          (f, "{:,}".format(paga).replace(",", "."),
           "{:,}".format(ac).replace(",", "."), naves, ac // CHEST))

print()
print("=" * 66)
print("DIFICULDADE — quantas ondas por fase e quanto tempo isso leva")
print("=" * 66)
print("%6s %8s %12s %14s" % ("fase", "ondas", "~segundos", "alvo da 3ª estrela"))
for f in marcos:
    ondas = faseWaves(f)
    # cada onda leva uns 14 segundos na média medida nos testes
    seg = ondas * 14
    alvo = round(faseWaves(f) * 16 + 20)
    marca = "  <-- apertado" if seg > alvo else ""
    print("%6d %8d %12d %14d%s" % (f, ondas, seg, alvo, marca))

print()
print("=" * 66)
print("O QUE OS NÚMEROS DIZEM")
print("=" * 66)
# onde o tempo da fase passa do alvo da estrela
primeiro_apertado = None
for f in range(1, TOTAL + 1):
    if faseWaves(f) * 14 > round(faseWaves(f) * 16 + 20):
        primeiro_apertado = f
        break
if primeiro_apertado:
    print("· A 3ª estrela fica impossível a partir da fase", primeiro_apertado, "—")
    print("  a fase cresce em ondas mais rápido do que o alvo de tempo cresce.")
else:
    print("· A 3ª estrela é alcançável em TODAS as 270 fases: o alvo agora nasce")
    print("  do número de ondas, então continua exigindo jogar rápido sem virar")
    print("  impossível.")
print()
total_naves = sum(precoNave(i) for i in range(1, 50))
print("· Comprar as 50 primeiras naves custa", "{:,}".format(total_naves).replace(",", "."),
      "cristais;")
print("  jogando as 270 fases uma vez o jogador junta",
      "{:,}".format(acumulado).replace(",", "."), "—",
      "sobra" if acumulado > total_naves else "falta",
      "{:,}".format(abs(acumulado - total_naves)).replace(",", "."))
print()
print("· Os baús (◆", CHEST, "cada) cabem", acumulado // CHEST,
      "vezes no que se junta na jornada inteira.")
