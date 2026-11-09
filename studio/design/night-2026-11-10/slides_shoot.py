"""Real screenshots of the app as an iPhone (390x844) through Chrome DevTools, for the three slide PDFs.
    python studio/design/night-2026-11-10/slides_shoot.py   (needs: python -m http.server 8194 from the repo root; pip install websocket-client pillow)
Shots go to slides-shots/.  A palette is a dict of CSS variables put on <body> after the page has drawn."""
import os, sys, json, time, subprocess, pathlib, base64, io, urllib.request
import websocket
from PIL import Image
HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / 'slides-shots'; OUT.mkdir(exist_ok=True)
PORT = int(os.environ.get('SLIDES_PORT', 8194)); BASE = f'http://localhost:{PORT}/studio/app/index.html'
CHROME = next(p for p in (r'C:\Program Files\Google\Chrome\Application\chrome.exe', r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe') if os.path.exists(p))


class Tab:
    def __init__(self, dbg):
        tabs = json.load(urllib.request.urlopen(f'http://127.0.0.1:{dbg}/json'))
        self.ws = websocket.create_connection([t for t in tabs if t['type'] == 'page'][0]['webSocketDebuggerUrl'], timeout=60, suppress_origin=True)
        self.i = 0

    def call(self, method, **params):
        self.i += 1
        self.ws.send(json.dumps({'id': self.i, 'method': method, 'params': params}))
        while True:
            m = json.loads(self.ws.recv())
            if m.get('id') == self.i:
                return m.get('result', {})

    def js(self, code):
        r = self.call('Runtime.evaluate', expression=code, awaitPromise=True, returnByValue=True)
        return r.get('result', {}).get('value')


def start():
    dbg = 9300 + os.getpid() % 500
    p = subprocess.Popen([CHROME, '--headless=new', '--disable-gpu', f'--remote-debugging-port={dbg}',
                          '--user-data-dir=' + str(pathlib.Path(os.environ.get('TEMP', '.')) / f'slides-chrome-{dbg}'),
                          '--hide-scrollbars', '--no-first-run', 'about:blank'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(40):
        try:
            urllib.request.urlopen(f'http://127.0.0.1:{dbg}/json'); break
        except Exception:
            time.sleep(.5)
    t = Tab(dbg)
    t.call('Emulation.setDeviceMetricsOverride', width=390, height=844, deviceScaleFactor=2, mobile=True)
    t.call('Emulation.setTouchEmulationEnabled', enabled=True)
    t.call('Page.enable'); t.call('Runtime.enable')
    return p, t


def shoot(t, name, hash_, before='', palette=None, wait=3.0, drop_look=False, scroll=0, pre=''):
    if pre:
        t.call('Page.navigate', url=f'{BASE}?guest'); time.sleep(2); t.js(pre)
    t.call('Page.navigate', url='about:blank'); time.sleep(.4)
    t.call('Page.navigate', url=f'{BASE}?guest{hash_}')
    time.sleep(wait)
    t.js("document.querySelectorAll('.install').forEach(e=>e.remove())")
    if before:
        t.js(before); time.sleep(1.8)
    if scroll:
        t.js(f'window.scrollTo(0,{scroll})'); time.sleep(.5)
    if palette:
        t.js('(()=>{const b=document.body; if(%s)delete b.dataset.look; for(const [k,v] of Object.entries(%s)) if(k[0]=="-") b.style.setProperty(k,v,"important"); document.documentElement.style.background=%s;})()'
             % ('true' if drop_look else 'false', json.dumps(palette), json.dumps(palette.get('--wall', '#fff'))))
        css = palette.get('_css')
        if css: t.js('(()=>{const e=document.createElement("style");e.textContent=%s;document.head.appendChild(e)})()' % json.dumps(css))
        time.sleep(.6)
    r = t.call('Page.captureScreenshot', format='png', captureBeyondViewport=False)
    im = Image.open(io.BytesIO(base64.b64decode(r['data']))).convert('RGB')
    im.save(OUT / f'{name}.jpg', quality=80)
    return im


if __name__ == '__main__':
    p, t = start()
    try:
        for n, h in [('home', '#/'), ('artist', '#/artist/vincent-van-gogh'), ('shows', '#/shows'), ('map', '#/map'), ('artists', '#/artists')]:
            shoot(t, n, h); print(n)
    finally:
        p.terminate()
