#!/bin/sh
# Confere a sintaxe do jogo inteiro e trava a publicação com endereço de teste.
AQUI="$(cd "$(dirname "$0")" && pwd)"
JOGO="$AQUI/.."

python3 -c "
import re, sys
h = open('$JOGO/index.html', encoding='utf-8').read()
open('$AQUI/_all.js', 'w', encoding='utf-8').write(
  '\n'.join(m.group(1) for m in re.finditer(r'<script>(.*?)</script>', h, re.S)))
"
node --check "$AQUI/_all.js" && echo "SINTAXE OK" || exit 1

# trava de segurança: o config.js NUNCA pode sair com o endereço de teste.
# Foi assim que a v5.5 subiu sem nuvem nenhuma.
if grep -q "127.0.0.1" "$JOGO/config.js"; then
  echo "PERIGO: config.js está com o endereço de TESTE. Restaure antes de publicar."
  exit 1
fi
# fonte/ e index.html precisam contar a mesma história
if [ -d "$JOGO/fonte" ]; then
  python3 "$AQUI/montar.py" --olhar > /tmp/nn_montar.txt 2>&1 || {
    cat /tmp/nn_montar.txt
    exit 1
  }
  echo "FONTE OK"
fi
python3 "$AQUI/confere_versao.py" || exit 1

echo "CONFIG OK"
