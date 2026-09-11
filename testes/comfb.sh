#!/bin/sh
# sobe o firebase falso, roda o que for pedido e derruba no fim
cd "$(dirname "$0")"
node fakefb.js > fakefb.log 2>&1 &
FB=$!
sleep 2
for x in pilotos presentes contas salas arena fila cenas pedidos mundo sugestoes equipe vivo; do
  curl -s -X DELETE "http://127.0.0.1:8099/$x.json" > /dev/null
done
"$@"
CODE=$?
kill $FB 2>/dev/null
exit $CODE
