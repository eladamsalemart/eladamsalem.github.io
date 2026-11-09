"""Contact sheet of the renders: python sheet.py axon|int|int2 [keys] -> renders/_sheet.png (small, for looking)"""
import sys, os
from PIL import Image
h = os.path.dirname(os.path.abspath(__file__)); shot = sys.argv[1]; keys = sys.argv[2] if len(sys.argv) > 2 else 'ABCDE'
ims = [Image.open(f'{h}/renders/{k}-{s}.png') for k in keys for s in shot.split(',')]
for i in ims: i.thumbnail((520, 340))
sh = Image.new('RGB', (1560, 340 * ((len(ims) + 2) // 3)), 'white')
for n, i in enumerate(ims): sh.paste(i, ((n % 3) * 520, (n // 3) * 340))
sh.save(f'{h}/renders/_sheet.png')
