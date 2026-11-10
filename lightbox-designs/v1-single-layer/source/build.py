import sys, os, io, json
import cairosvg
from PIL import Image
from lib import W, H, finish, svg_path
import designs

OUT = sys.argv[1] if len(sys.argv) > 1 else "out"
ONLY = sys.argv[2].split(",") if len(sys.argv) > 2 else None
FULL = os.environ.get("FULL") == "1"
os.makedirs(OUT, exist_ok=True)

A4W, A4H = 210.0, 297.0
OX, OY = (A4W - W) / 2, 26.0


def heb(s):
    # cairo has no bidi: reverse Hebrew runs for display
    return s[::-1]


def design_svg(g, outline=False, scale_px=None):
    d = svg_path(g)
    if outline:
        body = f'<path d="{d}" fill="#ffffff" fill-rule="evenodd" stroke="#000" stroke-width="0.25"/>'
    else:
        body = f'<path d="{d}" fill="#111" fill-rule="evenodd"/>'
    wh = f'width="{scale_px*W}" height="{scale_px*H}"' if scale_px else f'width="{W}mm" height="{H}mm"'
    return (f'<svg xmlns="http://www.w3.org/2000/svg" {wh} viewBox="0 0 {W} {H}">'
            f'<rect width="{W}" height="{H}" fill="#fff"/>{body}</svg>')


def page_svg(g, num, title, outline=False):
    d = svg_path(g, OX, OY)
    if outline:
        body = f'<path d="{d}" fill="none" stroke="#000" stroke-width="0.3" fill-rule="evenodd"/>'
        # light grey shading of the parts that stay, to help pupils
        body = f'<path d="{d}" fill="#e6e6e6" fill-rule="evenodd"/>' + body
    else:
        body = f'<path d="{d}" fill="#111" fill-rule="evenodd"/>'
    marks = ""
    for (x, y) in ((OX, OY), (OX + W, OY), (OX, OY + H), (OX + W, OY + H)):
        sx = -1 if x == OX else 1
        sy = -1 if y == OY else 1
        marks += (f'<line x1="{x+sx*2}" y1="{y}" x2="{x+sx*8}" y2="{y}" stroke="#777" stroke-width="0.2"/>'
                  f'<line x1="{x}" y1="{y+sy*2}" x2="{x}" y2="{y+sy*8}" stroke="#777" stroke-width="0.2"/>')
    kind = "ךותיח יווק" if outline else "אלמ ןומיד"  # reversed: 'קווי חיתוך' / 'דימוי מלא'
    txt = (f'<text x="{A4W-OX}" y="{OY+H+11}" font-family="DejaVu Sans" font-size="6" text-anchor="end" fill="#222">'
           f'{heb(title)}  .{num}</text>'
           f'<text x="{OX}" y="{OY+H+11}" font-family="DejaVu Sans" font-size="3.4" fill="#666">'
           f'15.5 × 23.5 cm   ·   {kind}</text>'
           f'<text x="{A4W/2}" y="{OY+H+19}" font-family="DejaVu Sans" font-size="3" text-anchor="middle" fill="#888">'
           f'{heb("שחור = הנייר שנשאר  ·  לבן = נחתך והאור עובר")}</text>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{A4W}mm" height="{A4H}mm" viewBox="0 0 {A4W} {A4H}">'
            f'<rect width="{A4W}" height="{A4H}" fill="#fff"/>{body}{marks}{txt}</svg>')


reports = {}
thumbs = []
for i, (key, title, fn) in enumerate(designs.DESIGNS, 1):
    if ONLY and key not in ONLY and str(i) not in ONLY:
        continue
    g, rep = finish(fn())
    reports[f"{i:02d}-{key}"] = rep
    print(i, key, rep, flush=True)
    png = cairosvg.svg2png(bytestring=design_svg(g, scale_px=6).encode())
    with open(f"{OUT}/{i:02d}-{key}.png", "wb") as f:
        f.write(png)
    thumbs.append((i, title, Image.open(io.BytesIO(png)).convert("RGB")))
    if FULL:
        cairosvg.svg2pdf(bytestring=page_svg(g, i, title).encode(), write_to=f"{OUT}/{i:02d}-{key}-full.pdf")
        cairosvg.svg2pdf(bytestring=page_svg(g, i, title, outline=True).encode(),
                         write_to=f"{OUT}/{i:02d}-{key}-lines.pdf")
        with open(f"{OUT}/{i:02d}-{key}.svg", "w") as f:
            f.write(design_svg(g))

# contact sheet
if thumbs:
    cols = 6 if len(thumbs) > 12 else min(len(thumbs), 4)
    rows = (len(thumbs) + cols - 1) // cols
    tw, th = 310, int(310 * H / W)
    sheet = Image.new("RGB", (cols * (tw + 20) + 20, rows * (th + 20) + 20), "white")
    for k, (i, title, im) in enumerate(thumbs):
        im = im.resize((tw, th), Image.LANCZOS)
        sheet.paste(im, (20 + (k % cols) * (tw + 20), 20 + (k // cols) * (th + 20)))
    sheet.save(f"{OUT}/_sheet.png")
json.dump(reports, open(f"{OUT}/_report.json", "w"), indent=1)
