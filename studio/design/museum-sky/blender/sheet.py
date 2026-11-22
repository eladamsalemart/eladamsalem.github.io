import sys
from PIL import Image
out=sys.argv[1]; fs=sys.argv[2:]
ims=[Image.open(f).convert('RGB') for f in fs]; h=600
ims=[i.resize((int(i.width*h/i.height),h)) for i in ims]
W=sum(i.width for i in ims); s=Image.new('RGB',(W,h)); x=0
for i in ims: s.paste(i,(x,0)); x+=i.width
s.save(out)
