"""Zet de single-file build om naar een reviewpagina voor een privé Artifact.
Gebruik: python3 tools/preview.py apps/web/dist-single/index.html <uit.html>
Het Artifact voegt zelf doctype/head/body toe; daarom alleen title, meta, styles, body en scripts."""
import re, sys
src, out = sys.argv[1], sys.argv[2]
h = open(src, encoding='utf-8').read()
title = re.search(r'<title>.*?</title>', h, re.S).group(0)
metas = [m for m in re.findall(r'<meta [^>]*>', h) if 'theme-color' in m or 'description' in m]
styles = re.findall(r'<style[^>]*>.*?</style>', h, re.S)
scripts = re.findall(r'<script[^>]*>.*?</script>', h, re.S)
body = re.search(r'<body[^>]*>(.*)</body>', h, re.S).group(1)
body = re.sub(r'<script[^>]*>.*?</script>', '', body, flags=re.S)
page = '\n'.join([title, *metas, *styles, body.strip(), *scripts])
open(out, 'w', encoding='utf-8').write(page)
print(f'{out}: {len(page)/1e6:.2f} MB')
