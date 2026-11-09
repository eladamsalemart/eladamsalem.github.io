"""Contact sheet of a PDF's pages for a quick look: python slides_peek.py onboarding-artists.pdf [first] [count] [cols] [width]"""
import sys, fitz
from PIL import Image
f = sys.argv[1]; a = int(sys.argv[2]) if len(sys.argv) > 2 else 0; n = int(sys.argv[3]) if len(sys.argv) > 3 else 6; cols = int(sys.argv[4]) if len(sys.argv) > 4 else 2; w = int(sys.argv[5]) if len(sys.argv) > 5 else 640
d = fitz.open(f); ims = []
for i in range(a, min(a + n, len(d))):
    p = d[i]; z = w / p.rect.width; pm = p.get_pixmap(matrix=fitz.Matrix(z, z)); ims.append(Image.frombytes('RGB', (pm.width, pm.height), pm.samples))
h = ims[0].height; rows = (len(ims) + cols - 1) // cols
s = Image.new('RGB', (w * cols, h * rows), 'white')
for k, im in enumerate(ims): s.paste(im, ((k % cols) * w, (k // cols) * h))
s.save('_peek.jpg', quality=72); print(len(d), 'pages')
