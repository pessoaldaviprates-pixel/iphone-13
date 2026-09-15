#!/usr/bin/env python3
"""Calcula o embaralhado (hash) da senha mestra do painel.

Uso:
    python3 testes/senha_adm.py

Ele PERGUNTA a senha, mostra o número, e não guarda nada em lugar nenhum.
Cole o número no `const ADM_MASTER` de fonte/04-jogo-1.js.

A senha por extenso não pode voltar para o código -- nem num comentário.
Era assim antes, e com a senha escrita do lado o embaralhado virava
enfeite. O `confere_seguranca.py` recusa publicar se ela voltar.

E lembre do tamanho disto: esta senha impede o acesso casual e nada mais.
Quem abrir as ferramentas do desenvolvedor passa por ela. A tranca de
verdade são as regras do Firebase (ITCH.md).
"""
import getpass
import sys


def admhash(t: str) -> str:
    """O mesmo admHash() do jogo: djb2 de 32 bits."""
    h = 5381
    for c in t:
        h = ((h << 5) + h + ord(c)) & 0xFFFFFFFF
    return format(h, "x")


OBVIAS = {"neonadmin", "admin", "123456", "senha", "password", "1234",
          "neonnebula", "nebula", "cr1cket", "dono", "master", "12345678"}

if __name__ == "__main__":
    # getpass não ecoa na tela: senha digitada fica fora do histórico e
    # fora do ombro de quem estiver do lado
    senha = getpass.getpass("Senha nova do painel (não aparece na tela): ")
    if not senha:
        print("nada digitado.")
        sys.exit(1)
    if senha.lower() in OBVIAS:
        print("\nessa é uma senha óbvia -- o confere_seguranca.py vai recusar.")
        print("escolha outra.")
        sys.exit(1)
    if len(senha) < 8:
        print("\nmenos de 8 letras. Este embaralhado é curto (32 bits): uma senha")
        print("curta é quebrada em segundos por quem tentar. Escolha uma maior.")
        sys.exit(1)
    print("\ncole isto em fonte/04-jogo-1.js:\n")
    print('const ADM_MASTER = "%s";' % admhash(senha))
    print("\ne NÃO escreva a senha num comentário do lado.")
