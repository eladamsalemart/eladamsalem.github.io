// Open Studio offline support. Pages, scripts and data come from the network first, so every push
// reaches the phone on the next open; images, space textures and libraries are kept once seen.
const VERSION = 'open-studio-f4dda62';
const SHELL = ['./', 'index.html', 'app.js', 'artist.js', 'space/space.js', 'manifest.webmanifest', 'icons/icon-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const keep = (req, res) => {
  if (res && (res.ok || res.type === 'opaque')) caches.open(VERSION).then(c => c.put(req, res));
};

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // videos are asked for in pieces (a phone plays them as they arrive): straight from the network
  if (/\.(mp4|webm|mov)$/i.test(url.pathname)) return;
  const lasting = /\.(png|jpe?g|webp|avif|gif|svg|woff2?|ttf)$/i.test(url.pathname)
    || url.hostname === 'cdn.jsdelivr.net' || url.hostname === 'fonts.gstatic.com';
  if (lasting) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => { keep(req, res.clone()); return res; })));
  } else {
    // the network first, and past the browser's own cache too (the site lets it keep files for minutes): a
    // new version shows on the next opening, not ten minutes later
    e.respondWith(fetch(req, { cache: 'no-cache' })
      .then(res => { keep(req, res.clone()); return res; })
      .catch(() => caches.match(req).then(hit => hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
  }
});
