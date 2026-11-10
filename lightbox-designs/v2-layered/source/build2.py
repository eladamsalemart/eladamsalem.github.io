import sys, os, io, json
import numpy as np
import cairosvg
from PIL import Image, ImageFilter, ImageDraw
from lib import W, H, finish, svg_path
import scenes

OUT = sys.argv[1] if len(sys.argv) > 1 else "out2"
ONLY = sys.argv[2].split(",") if len(sys.argv) > 2 else None
FULL = os.environ.get("FULL") == "1"
os.makedirs(OUT, exist_ok=True)
A4W, A4H = 210.0, 297.0
OX, OY = (A4W - W) / 2, 24.0
PX = 4  # px per mm for previews

LAYER_NAMES = {1: "אחורית", 2: "שנייה", 3: "שלישית", 4: "רביעית", 5: "חמישית"}


def heb(s):
    return s[::-1]


def mask(g, scale=PX):
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W*scale}" height="{H*scale}" viewBox="0 0 {W} {H}">'
           f'<rect width="{W}" height="{H}" fill="#fff"/><path d="{svg_path(g)}" fill="#000" fill-rule="evenodd"/></svg>')
    im = Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg.encode()))).convert("L")
    return (np.asarray(im) < 128).astype(np.float32)


def composite(masks):
    h, w = masks[0].shape
    yy, xx = np.mgrid[0:h, 0:w]
    cx, cy = w / 2, h * 0.45
    d = np.sqrt(((xx - cx) / w) ** 2 + ((yy - cy) / h) ** 2)
    glow = np.clip(1.05 - d * 0.9, 0.55, 1.0)
    base = np.stack([255 * glow, 220 * glow, 160 * glow ** 1.3], -1) * 1.25
    light = np.ones((h, w), np.float32)
    n = len(masks)
    for i, m in enumerate(masks):
        light *= (1 - 0.5 * m)
        # soft shadow cast by this layer onto the layers behind it
        sh = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(5))
        sh = np.asarray(sh).astype(np.float32) / 255
        sh = np.roll(np.roll(sh, 4, 0), 3, 1)
        light *= (1 - 0.18 * sh * (1 - m))
    img = base * light[..., None]
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))


def layer_png(g, scale=3):
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W*scale}" height="{H*scale}" viewBox="0 0 {W} {H}">'
           f'<rect width="{W}" height="{H}" fill="#fff"/><path d="{svg_path(g)}" fill="#111" fill-rule="evenodd"/></svg>')
    return Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg.encode()))).convert("RGB")


def page_svg(g, num, title, li, n, outline=False):
    d = svg_path(g, OX, OY)
    if outline:
        body = f'<path d="{d}" fill="#e4e4e4" fill-rule="evenodd"/><path d="{d}" fill="none" stroke="#000" stroke-width="0.3"/>'
    else:
        body = f'<path d="{d}" fill="#111" fill-rule="evenodd"/>'
    marks = ""
    for (x, y) in ((OX, OY), (OX + W, OY), (OX, OY + H), (OX + W, OY + H)):
        sx = -1 if x == OX else 1
        sy = -1 if y == OY else 1
        marks += (f'<line x1="{x+sx*2}" y1="{y}" x2="{x+sx*8}" y2="{y}" stroke="#777" stroke-width="0.2"/>'
                  f'<line x1="{x}" y1="{y+sy*2}" x2="{x}" y2="{y+sy*8}" stroke="#777" stroke-width="0.2"/>')
    pos = "אחורית – הכי קרובה לאור" if li == 1 else ("קדמית – הכי קרובה לצופה" if li == n else "אמצעית")
    txt = (f'<text x="{A4W-OX}" y="{OY+H+10}" font-family="DejaVu Sans" font-size="6" text-anchor="end" fill="#222">'
           f'{heb(title)}  .{num}</text>'
           f'<text x="{A4W-OX}" y="{OY+H+17}" font-family="DejaVu Sans" font-size="4.2" text-anchor="end" fill="#444">'
           f'{heb(pos)}  ·  {n} {heb("מתוך")} {li} {heb("שכבה")}</text>'
           f'<text x="{OX}" y="{OY+H+10}" font-family="DejaVu Sans" font-size="3.4" fill="#666">15.5 × 23.5 cm</text>'
           f'<text x="{A4W/2}" y="{OY+H+25}" font-family="DejaVu Sans" font-size="3" text-anchor="middle" fill="#888">'
           f'{heb("שחור = הנייר שנשאר  ·  לבן = נחתך והאור עובר")}</text>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{A4W}mm" height="{A4H}mm" viewBox="0 0 {A4W} {A4H}">'
            f'<rect width="{A4W}" height="{A4H}" fill="#fff"/>{body}{marks}{txt}</svg>')


reports = {}
composites = []
for i, (key, title, fn) in enumerate(scenes.SCENES, 1):
    if ONLY and key not in ONLY and str(i) not in ONLY:
        continue
    raw = fn()
    layers, reps = [], []
    for g in raw:
        f, rep = finish(g)
        layers.append(f)
        reps.append(rep)
    reports[f"{i:02d}-{key}"] = reps
    bad = [(k + 1, r["islands"]) for k, r in enumerate(reps) if r["islands"]]
    print(i, key, "ISLANDS:" if bad else "ok", bad if bad else "", flush=True)
    masks = [mask(g) for g in layers]
    comp = composite(masks)
    comp.save(f"{OUT}/{i:02d}-{key}-preview.png")
    # layer strip: composite + each layer
    lp = [layer_png(g, 3) for g in layers]
    tw = lp[0].width
    cw = int(comp.width * lp[0].height / comp.height)
    strip = Image.new("RGB", (cw + (tw + 16) * len(lp) + 16, lp[0].height + 2 * 16), "white")
    strip.paste(comp.resize((cw, lp[0].height)), (0, 16))
    for k, im in enumerate(lp):
        strip.paste(im, (cw + 16 + k * (tw + 16), 16))
    strip.save(f"{OUT}/{i:02d}-{key}-layers.png")
    composites.append((i, title, comp))
    if FULL:
        n = len(layers)
        for k, g in enumerate(layers, 1):
            cairosvg.svg2pdf(bytestring=page_svg(g, i, title, k, n).encode(), write_to=f"{OUT}/{i:02d}-{key}-L{k}-full.pdf")
            cairosvg.svg2pdf(bytestring=page_svg(g, i, title, k, n, outline=True).encode(), write_to=f"{OUT}/{i:02d}-{key}-L{k}-lines.pdf")
            with open(f"{OUT}/{i:02d}-{key}-L{k}.svg", "w") as fh:
                fh.write(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}mm" height="{H}mm" viewBox="0 0 {W} {H}">'
                         f'<path d="{svg_path(g)}" fill="#000" fill-rule="evenodd"/></svg>')

if composites:
    cols = 5 if len(composites) > 8 else len(composites)
    rows = (len(composites) + cols - 1) // cols
    tw, th = 300, int(300 * H / W)
    sheet = Image.new("RGB", (cols * (tw + 16) + 16, rows * (th + 16) + 16), (30, 26, 22))
    for k, (i, title, im) in enumerate(composites):
        sheet.paste(im.resize((tw, th), Image.LANCZOS), (16 + (k % cols) * (tw + 16), 16 + (k // cols) * (th + 16)))
    sheet.save(f"{OUT}/_sheet.png")
json.dump(reports, open(f"{OUT}/_report.json", "w"), indent=1)
