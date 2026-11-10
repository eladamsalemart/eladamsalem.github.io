"""before-after.jpg: the first street, the new street, and a threshold, side by side (<= 900 px wide)."""
from pathlib import Path
from PIL import Image

D = Path(__file__).resolve().parent
ims = [Image.open(D / f).convert('RGB') for f in ('street-entrance-390.jpg', 'street-entrance-after.jpg', 'threshold-after.jpg')]
H = 700
ims = [i.resize((round(i.width * H / i.height), H)) for i in ims]
W = sum(i.width for i in ims) + 20
out = Image.new('RGB', (W, H), 'white')
x = 0
for i in ims:
    out.paste(i, (x, 0)); x += i.width + 10
k = min(1, 900 / W)
out.resize((round(W * k), round(H * k))).save(D / 'before-after.jpg', quality=85)
