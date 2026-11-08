"""Looks at each page of options.html as it will print (A4 content width), into one contact sheet _pages.png.  python verify_pages.py"""
import pathlib, re
from PIL import Image
from render_mocks import shot
HERE = pathlib.Path(__file__).resolve().parent
html = (HERE / 'options.html').read_text(encoding='utf-8')
css = re.search(r'<style>([\s\S]*?)</style>', html).group(1)
pages = re.findall(r'<section class="page[\s\S]*?</section>', html)
ims = []
for i, p in enumerate(pages):
    f = HERE / f'_pg{i}.html'
    f.write_text(f'<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><style>{css}body{{width:695px;margin:0 auto;padding:6px}}</style></head><body>{p}</body></html>', encoding='utf-8')
    out = HERE / f'_pg{i}.png'
    shot(f.as_uri(), out, 720, 1080)
    ims.append(Image.open(out).resize((360, 540)))
    f.unlink(); out.unlink()
cols = 6
sheet = Image.new('RGB', (cols * 360, ((len(ims) + cols - 1) // cols) * 540), 'white')
for i, im in enumerate(ims): sheet.paste(im, ((i % cols) * 360, (i // cols) * 540))
sheet.save(HERE / '_pages.png')
print(len(ims), 'pages')
