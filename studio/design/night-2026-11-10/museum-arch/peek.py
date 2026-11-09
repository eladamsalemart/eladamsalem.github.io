"""Contact sheet of the SVG plans and sections (for looking at them): python peek.py -> svg/peek.png"""
import os, subprocess
from geom import HERE
d = os.path.join(HERE, 'svg')
cells = ''.join(f'<div><img src="{k}-plan.svg"><img src="{k}-section.svg"></div>' for k in 'ABCDE')
open(os.path.join(d, 'peek.html'), 'w', encoding='utf-8').write(f'<html><body style="margin:0;display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;width:1500px;background:#fff;font-family:Heebo">{cells}<style>img{{width:100%;display:block;margin-bottom:4px}}</style></body></html>')
chrome = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
subprocess.run([chrome, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--window-size=1500,1500', f'--screenshot={os.path.join(d, "peek.png")}', os.path.join(d, 'peek.html')], capture_output=True)
print('ok')
