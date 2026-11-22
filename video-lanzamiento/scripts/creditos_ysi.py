# Genera CREDITOS-y-si.md con las fotos de Wikimedia Commons usadas en «¿Y si cada paso…?».
# Uso: python3 scripts/creditos_ysi.py <seleccion.json> <v2b.json>
import json, sys, re, subprocess, time, html, os
usadas = set(os.listdir('public/yasi/f'))
fuentes = {}
for path in sys.argv[1:]:
    for k, v in json.load(open(path)).items():
        nombre = (v.get('local') or k) + '.jpg' if 'local' not in v else v['local']
        fuentes[v['file'] if v['file'].startswith('File:') else 'File:' + v['file']] = v | {'nombre': k}
UA = 'Mozilla/5.0 (X11; Linux x86_64) Chrome/124'
filas = []
for f, v in fuentes.items():
    local = [u for u in usadas if u.startswith(v['nombre'])] or [u for u in usadas if v.get('alias') and u.startswith(v['alias'])]
    if not local:
        continue
    aut = v.get('autor') or ''
    if not aut:
        p = subprocess.run(['curl', '-s', '-m', '40', '-A', UA, 'https://commons.wikimedia.org/wiki/' + f], capture_output=True, text=True).stdout
        a = re.search(r'fileinfotpl(?:_|&#95;)aut".*?</td>\s*<td[^>]*>(.*?)</td>', p, re.S)
        aut = html.unescape(re.sub(r'\s+', ' ', re.sub('<[^>]+>', '', a.group(1))).strip())[:80] if a else 'ver la página'
        time.sleep(2)
    filas.append((local[0], f, aut.replace('|', '/'), ', '.join(v['lic'])))
L = ['# Créditos de «¿Y si cada paso…?»', '',
     '## Fotos de Wikimedia Commons',
     'Todas permiten uso comercial. Las CC BY y CC BY-SA piden citar autor y licencia: pegar estas líneas en la descripción de la publicación o en la web.',
     'Las CC BY-SA además piden que, si se publica la foto modificada por separado, se comparta con la misma licencia.', '',
     '| Archivo | Foto original | Autor | Licencia |', '|---|---|---|---|']
for local, f, aut, lic in sorted(filas):
    L.append(f'| `{local}` | [{html.unescape(f[5:]).replace("_", " ")}](https://commons.wikimedia.org/wiki/{f}) | {aut} | {lic} |')
L += ['', '## Otros materiales',
      '- Videos de Mixkit (licencia libre de Mixkit, uso comercial sin atribución): pies, zapatillas y corredores (`public/yasi/v/m*.mp4`).',
      '- Pexels 3999620 (pasos en primera persona, licencia libre).',
      '- Tomas de Tarija del video «Tarija Bolivia 4K» (YouTube, con permiso del autor).',
      '- Fotos de Tarija enviadas por Camina.',
      '- Grabaciones y capturas de la app con datos de ejemplo; logos de los 8 comercios de Camina (con su autorización).',
      '- Música y efectos originales, generados por código (`scripts/ysi_sonido.py`).']
open('CREDITOS-y-si.md', 'w').write('\n'.join(L) + '\n')
print(len(filas), 'fotos con crédito')
