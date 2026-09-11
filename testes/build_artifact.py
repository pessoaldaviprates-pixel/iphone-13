import re, base64, os
AQUI = os.path.dirname(os.path.abspath(__file__))
JOGO = os.path.join(AQUI, '..')

html = open(os.path.join(JOGO, 'index.html')).read()
head = re.search(r'<head>(.*?)</head>', html, re.S).group(1)
body = re.search(r'<body>(.*?)</body>', html, re.S).group(1)

keep = ['<title>Neon Nebula</title>']
for m in re.finditer(r'<link[^>]*(?:fonts\.googleapis|fonts\.gstatic)[^>]*>', head):
    keep.append(m.group(0))
keep.append(re.search(r'<style>.*?</style>', head, re.S).group(0))
# remove o registro do service worker (não existe sw.js no domínio do artifact)
body = re.sub(r'/\* -+ Service worker.*?\n}\n', '', body, flags=re.S)

content = '\n'.join(keep) + body
# No artifact (arquivo unico) nao existe config.js para buscar, entao o
# conteudo dele entra INLINE. Sem isto o jogo publicado ficava sem nuvem:
# nada de ranking, presentes, arena, eventos nem recados do administrador.
import re as _re
cfg = open(os.path.join(JOGO, 'config.js'), encoding='utf-8').read()
url = (_re.search(r'NUVEM_URL\s*:\s*["\']([^"\']*)["\']', cfg) or [None, ''])[1]
assert url.startswith('http'), 'config.js sem NUVEM_URL valido: ' + repr(url)
# TRAVA: o endereco de teste nunca pode ser publicado. Foi assim que a
# v5.5 e a v5.6 subiram sem nuvem nenhuma.
assert '127.0.0.1' not in url and 'localhost' not in url, \
    'PERIGO: config.js esta com o endereco de TESTE (' + url + '). Restaure antes de publicar.'
inline = '<script>window.NN_CONFIG = { NUVEM_URL: "' + url + '" };</script>\n'
assert '<script src="config.js"></script>\n' in content
content = content.replace('<script src="config.js"></script>\n', inline)
assert 'navigator.serviceWorker.register' not in content
assert '<script src="config.js">' not in content
assert 'NN_CONFIG = { NUVEM_URL: "http' in content
print('nuvem embutida no artifact:', url)

# quine: coloca o marcador na tag page-src e depois troca pelo base64 do próprio texto
anchor_empty = 'id="page-src"></script>'
assert content.count(anchor_empty) == 1
T = content.replace(anchor_empty, 'id="page-src">__PAGESRC__</script>', 1)
b64 = base64.b64encode(T.encode('utf-8')).decode('ascii')
final = T.replace('id="page-src">__PAGESRC__', 'id="page-src">' + b64, 1)

# preserva um save da nuvem existente (progresso salvo pelos jogadores)
import os
SAVE = '/tmp/cloud_save.json'
if os.path.exists(SAVE):
    save_json = open(SAVE, encoding='utf-8').read().strip()
    abre = '<script type="application/json" id="cloud-save">'
    fecha = '</script>'
    i = final.index(abre)
    j = final.index(fecha, i)
    final = final[:i + len(abre)] + save_json + final[j:]
    print('save da nuvem preservado:', len(save_json), 'bytes')

open(os.path.join(AQUI, 'neon-nebula-artifact.html'), 'w').write(final)
print('artifact built:', len(final), 'bytes (b64 src:', len(b64), ')')
