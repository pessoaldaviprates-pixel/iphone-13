#!/bin/sh
cd "$(dirname "$0")"
FB_BLOQUEAR="amigos,conversas,suporte,loja_pedidos" node fakefb.js > fakefb2.log 2>&1 &
FB=$!
sleep 2
"$@"
CODE=$?
kill $FB 2>/dev/null
exit $CODE
