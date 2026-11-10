"""One complete image per design (no frame): front = black, middle = grey, far = light grey, sun/moon/stars = pale."""
import sys, os, io, glob
import cairosvg
from PIL import Image
from shapely.geometry import box, MultiPolygon, Polygon
from lib import W, H, INNER, svg_path, U
import scenes3 as scenes

OUT = sys.argv[1] if len(sys.argv) > 1 else "out4"
ONLY = sys.argv[2].split(",") if len(sys.argv) > 2 else None
os.makedirs(OUT, exist_ok=True)
A4W, A4H = 210.0, 297.0
OX, OY = (A4W - W) / 2, 24.0
FULL = box(0, 0, W, H)


def clean(g):
    g = g.intersection(FULL).buffer(0.15, join_style=1).buffer(-0.15, join_style=1)
    polys = list(g.geoms) if isinstance(g, MultiPolygon) else [g]
    keep = []
    for p in polys:
        if p.is_empty or p.area < 1.0:
            continue
        keep.append(Polygon(p.exterior, [r for r in p.interiors if Polygon(r).area >= 2.0]))
    return U(keep)


def tones(n_mid):
    return ["#b4b4b4", "#7a7a7a"][-n_mid:] if n_mid <= 2 else ["#c4c4c4", "#9a9a9a", "#707070"][-n_mid:]


def layers_for(fn):
    raw = fn()
    back, mids, front = raw[0], raw[1:-1], raw[-1]
    lights = clean(INNER.difference(back))           # sun / moon / stars / cloud lines
    mids = [clean(m) for m in mids]
    front = clean(front)
    return lights, mids, front


def body(lights, mids, front, dx=0, dy=0):
    out = f'<path d="{svg_path(lights, dx, dy)}" fill="#dcdcdc" fill-rule="evenodd"/>' if not lights.is_empty else ""
    for g, c in zip(mids, tones(len(mids))):
        out += f'<path d="{svg_path(g, dx, dy)}" fill="{c}" fill-rule="evenodd"/>'
    out += f'<path d="{svg_path(front, dx, dy)}" fill="#111" fill-rule="evenodd"/>'
    return out


def heb(s):
    return s[::-1]


thumbs = []
for i, (key, title, fn) in enumerate(scenes.SCENES, 1):
    if ONLY and key not in ONLY and str(i) not in ONLY:
        continue
    lights, mids, front = layers_for(fn)
    marks = ""
    for (x, y) in ((OX, OY), (OX + W, OY), (OX, OY + H), (OX + W, OY + H)):
        sx = -1 if x == OX else 1
        sy = -1 if y == OY else 1
        marks += (f'<line x1="{x+sx*2}" y1="{y}" x2="{x+sx*7}" y2="{y}" stroke="#aaa" stroke-width="0.15"/>'
                  f'<line x1="{x}" y1="{y+sy*2}" x2="{x}" y2="{y+sy*7}" stroke="#aaa" stroke-width="0.15"/>')
    txt = (f'<text x="{A4W-OX}" y="{OY+H+11}" font-family="DejaVu Sans" font-size="6" text-anchor="end" fill="#222">{heb(title)}  .{i}</text>'
           f'<text x="{OX}" y="{OY+H+11}" font-family="DejaVu Sans" font-size="3.4" fill="#777">15.5 × 23.5 cm</text>')
    page = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{A4W}mm" height="{A4H}mm" viewBox="0 0 {A4W} {A4H}">'
            f'<rect width="{A4W}" height="{A4H}" fill="#fff"/>{body(lights, mids, front, OX, OY)}{marks}{txt}</svg>')
    cairosvg.svg2pdf(bytestring=page.encode(), write_to=f"{OUT}/{i:02d}-{key}.pdf")
    img = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}mm" height="{H}mm" viewBox="0 0 {W} {H}">'
           f'<rect width="{W}" height="{H}" fill="#fff"/>{body(lights, mids, front)}</svg>')
    open(f"{OUT}/{i:02d}-{key}.svg", "w").write(img)
    png = cairosvg.svg2png(bytestring=img.encode(), output_width=int(W * 12), output_height=int(H * 12))
    open(f"{OUT}/{i:02d}-{key}.png", "wb").write(png)
    thumbs.append(Image.open(io.BytesIO(png)).convert("RGB"))
    print(i, key, flush=True)

if thumbs:
    cols = 5
    rows = (len(thumbs) + cols - 1) // cols
    tw, th = 300, int(300 * H / W)
    sheet = Image.new("RGB", (cols * (tw + 24) + 24, rows * (th + 24) + 24), (225, 225, 225))
    for k, im in enumerate(thumbs):
        sheet.paste(im.resize((tw, th), Image.LANCZOS), (24 + (k % cols) * (tw + 24), 24 + (k // cols) * (th + 24)))
    sheet.save(f"{OUT}/_sheet.png")
    from pypdf import PdfWriter
    w = PdfWriter()
    for f in sorted(glob.glob(f"{OUT}/[0-9]*.pdf")):
        w.append(f)
    w.write(f"{OUT}/_all.pdf")
