"""harness.html with the app's own CSS inlined (no fetch, so Chrome headless can screenshot it): writes harness-static.html."""
import re
html = open('../../../app/index.html', encoding='utf-8').read()
css = '\n'.join(re.findall(r'<style[^>]*>([\s\S]*?)</style>', html))
fonts = re.search(r'https://fonts\.googleapis\.com/css2[^"]*', html).group(0).replace('&amp;', '&')
h = open('harness.html', encoding='utf-8').read()
h = h[:h.index('const html = await')] + h[h.index('const { admin }'):]
h = h.replace('</head>', '<style>@import url("' + fonts + '");\n' + css + '</style></head>')
open('harness-static.html', 'w', encoding='utf-8').write(h)
