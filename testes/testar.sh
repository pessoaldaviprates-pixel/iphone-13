#!/bin/sh
# =====================================================================
#  testar.sh — roda a bateria inteira de testes do Neon Nebula
#  ---------------------------------------------------------------------
#  Uso:
#     ./testar.sh            roda os testes principais (rápido)
#     ./testar.sh tudo       roda TODOS os testes que existem
#     ./testar.sh test_v60   roda só um
#
#  Cada teste sobe um Firebase falso limpo, abre o jogo no Chromium e
#  imprime um JSON. O teste falha se o processo sair diferente de zero
#  ou se a lista de erros do console não vier vazia.
# =====================================================================
cd "$(dirname "$0")" || exit 1

PRINCIPAIS="check test_v60 test_v61 test_v62 test_v63 test_v64 test_v65 \
test_v66 test_v67 test_v68 test_v69 test_v70 test_v71 test_v72 test_chefes test_menu2 test_versao test_app test_web test_menu3 test_menu4 test_painel test_vip test_exploracao test_idioma test_pix test_menu test_geral test_loja \
test_hab test_adm test_compra"

TODOS="check $(ls test_*.js 2>/dev/null | sed 's/\.js$//' | tr '\n' ' ')"

case "$1" in
  "")      LISTA="$PRINCIPAIS" ;;
  tudo)    LISTA="$TODOS" ;;
  *)       LISTA="$*" ;;
esac

FALHAS=""
PASSOU=0
COMECO=$(date +%s)

for t in $LISTA; do
  printf "%-16s " "$t"

  if [ "$t" = "check" ]; then
    if ./check.sh > /tmp/nn_saida.txt 2>&1; then
      echo "OK  (sintaxe e config)"
      PASSOU=$((PASSOU + 1))
    else
      echo "FALHOU"
      tail -3 /tmp/nn_saida.txt | sed 's/^/                 /'
      FALHAS="$FALHAS $t"
    fi
    continue
  fi

  if [ ! -f "$t.js" ]; then
    echo "não existe"
    FALHAS="$FALHAS $t"
    continue
  fi

  ./comfb.sh node "$t.js" > /tmp/nn_saida.txt 2>&1
  CODIGO=$?

  # a lista de erros do console tem de vir vazia
  SUJO=$(grep -oE '"err(s|ors|os)": \[[^]]+\]' /tmp/nn_saida.txt | head -1)

  if [ $CODIGO -ne 0 ]; then
    echo "FALHOU (saiu $CODIGO)"
    tail -4 /tmp/nn_saida.txt | sed 's/^/                 /'
    FALHAS="$FALHAS $t"
  elif [ -n "$SUJO" ]; then
    echo "FALHOU (erro no console)"
    echo "                 $SUJO"
    FALHAS="$FALHAS $t"
  else
    echo "OK"
    PASSOU=$((PASSOU + 1))
  fi
done

FIM=$(date +%s)
echo ""
echo "-------------------------------------------------"
echo "passaram: $PASSOU   tempo: $((FIM - COMECO))s"
if [ -n "$FALHAS" ]; then
  echo "FALHARAM:$FALHAS"
  exit 1
fi
echo "tudo certo."
exit 0
