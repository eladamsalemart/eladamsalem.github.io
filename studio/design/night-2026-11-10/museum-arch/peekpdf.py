"""Looking at the PDF: python peekpdf.py <first> <last> [zoom] -> renders pages as one contact sheet (peek-pdf.png)."""
import sys, os, pymupdf
from PIL import Image
here = os.path.dirname(os.path.abspath(__file__))
doc = pymupdf.open(os.path.join(here, '..', 'museum-architecture.pdf'))
a, b = int(sys.argv[1]), int(sys.argv[2]); z = float(sys.argv[3]) if len(sys.argv) > 3 else 0.55
ims = []
for i in range(a - 1, min(b, len(doc))):
    pix = doc[i].get_pixmap(matrix=pymupdf.Matrix(z, z)); ims.append(Image.frombytes('RGB', (pix.width, pix.height), pix.samples))
cols = min(len(ims), 3); rows = (len(ims) + cols - 1) // cols; w, h = ims[0].size
sheet = Image.new('RGB', (w * cols, h * rows), 'white')
for i, im in enumerate(ims): sheet.paste(im, ((i % cols) * w, (i // cols) * h))
sheet.save(os.path.join(here, 'peek-pdf.png')); print(len(doc), 'pages', sheet.size)
