// One Home, four ways of drawing it. Each direction gives the sky its own layout and marks; the page around it is
// the same: the sky first, then the show you can walk into now, your artists, their shows, and what's on near you.
import { STARS, TIES, LIVE, ARTISTS, THEIR_SHOWS, NEAR, TABS, LOGO, APP, TOUR } from './data.js';
import { sky } from './sky.js';

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const he = s => /[֐-׿]/.test(s) ? ` dir="rtl" lang="he"` : '';
const KIND = { artist: 'Artist', show: 'Show', tour: 'In 3D', place: 'Place', work: 'Work' };

export function home(d) {
  const app = document.getElementById('app');
  const c = d.copy;
  app.innerHTML = `
    <header class="top"><a class="brand" href="./">${LOGO}<span>Open Studio</span></a><span class="day">Mon 2 Nov</span><span class="me" aria-label="Your account">N</span></header>
    <section class="hero" aria-label="Your art world">
      <div class="hello">${c.title ? `<h1>${c.title}</h1>` : `<h1 class="vh">Your art world</h1>`}${c.hand ? `<p class="hand">${c.hand}</p>` : ''}
        ${d.legend ? `<ul class="legend" aria-label="What the marks mean">${d.legend.map(([k, t]) => `<li><i class="lg lg-${k}"></i>${t}</li>`).join('')}</ul>` : ''}</div>
      <div id="sky" class="skybox"></div>
      <div class="sky-ui"><span class="hint">${c.hint || 'Drag to turn · pinch to see further'}</span>
        ${d.wander === false ? '' : `<button type="button" class="wander" aria-pressed="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg><span>Wander</span></button>`}</div>
      <div class="pick" hidden aria-live="polite"></div>
    </section>

    <section class="live" aria-labelledby="h-live">
      <div class="sec-h"><h2 id="h-live">${c.live || 'Walk in now'}</h2><span class="hand side">${esc(LIVE.note)}</span></div>
      <div class="tour" data-shape="${d.tourShape || 'rect'}">
        <img class="tour-poster" src="${LIVE.img}" alt="">
        <iframe title="Ritual, a walkable 3D room" tabindex="-1" allow="xr-spatial-tracking; gyroscope; accelerometer"></iframe>
        <span class="livepill"><i></i>Live now</span>
        <div class="tour-cap"><b>${esc(LIVE.title)}</b><span>${esc(LIVE.by)} · ${esc(LIVE.where)}</span></div>
        <button type="button" class="step">Step inside</button>
        <button type="button" class="tour-x" hidden>← Back to Home</button>
      </div>
    </section>

    <section class="artists" aria-labelledby="h-artists">
      <div class="sec-h"><h2 id="h-artists">${c.artists || 'Your artists'}</h2><a class="more" href="${APP}?guest#/artists">All</a></div>
      <ul class="ppl">${ARTISTS.map(a => `<li><img src="${a.img}" alt="" width="64" height="64"><b>${esc(a.name)}</b><span class="what">${esc(a.what)}</span><span class="hand now">${esc(a.now)}</span></li>`).join('')}</ul>
    </section>

    <section class="theirs" aria-labelledby="h-theirs">
      <div class="sec-h"><h2 id="h-theirs">${c.theirs || 'Their shows, on now'}</h2></div>
      <ul class="shows">${THEIR_SHOWS.map(s => `<li class="${s.tour ? 'has-tour' : ''}"><img src="${s.img}" alt="" loading="lazy"><div><span class="when">${esc(s.short)}</span><b>${esc(s.title)}</b><span>${esc(s.by)}</span><span class="m">${esc(s.where)}</span></div></li>`).join('')}</ul>
    </section>

    <section class="near" aria-labelledby="h-near">
      <div class="sec-h"><h2 id="h-near">${c.near || 'On now, near you'}</h2></div>
      <a class="map" href="${APP}?guest#/map"><img src="img/map-m.jpg" alt="The art map around you in Tel Aviv" loading="lazy"><span>Open the map</span></a>
      <ul class="list">${NEAR.map(s => `<li><a href="${APP}?guest#/map/place/${s.place}"><b${he(s.title)}>${esc(s.title)}</b><span>${esc([s.by, s.where].filter(Boolean).join(' · '))}</span><span class="m">${esc(s.when)} · ${esc(s.far)}</span></a></li>`).join('')}</ul>
    </section>
    <p class="end hand">${c.end || 'that’s today'}</p>
    <nav class="tabs" aria-label="Main">${TABS.map(([t, p], i) => `<a href="${i ? APP + '?guest#/' + t.toLowerCase() : './'}"${i ? '' : ' aria-current="page"'}><svg viewBox="0 0 24 24" aria-hidden="true">${p}</svg><span>${t}</span></a>`).join('')}</nav>`;

  // --- the sky ---
  const pick = app.querySelector('.pick');
  const S = sky(app.querySelector('#sky'), {
    stars: STARS, ties: TIES, ...d.sky,
    onChoose(s) {
      app.querySelector('.hero').classList.toggle('picking', !!s);
      if (!s) { pick.hidden = true; return; }
      const go = s.kind === 'tour' && s.id === 'ritual' ? `<button type="button" class="go" data-walk>Walk in</button>`
        : s.place ? `<a class="go" href="${APP}?guest#/map/place/${s.place}">On the map</a>` : '';
      pick.innerHTML = `${s.img ? `<img src="${s.img}" alt="">` : `<i class="dot k-${s.kind}"></i>`}<div><span class="k">${KIND[s.kind]}${s.ago ? ` · ${esc(s.ago)}` : ''}</span><b${he(s.name)}>${esc(s.name)}</b><span>${esc(s.sub)}</span>${s.note ? `<span class="hand">${esc(s.note)}</span>` : ''}</div>${go}<button type="button" class="x" aria-label="Close">×</button>`;
      pick.hidden = false;
      pick.querySelector('.x').onclick = () => { pick.hidden = true; S.clear(); app.querySelector('.hero').classList.remove('picking'); };
      const w = pick.querySelector('[data-walk]'); if (w) w.onclick = () => enter();
    },
  });
  window.__sky = S;                                        // for the checks
  const wb = app.querySelector('.wander');
  if (wb) wb.onclick = () => { const on = wb.getAttribute('aria-pressed') !== 'true'; wb.setAttribute('aria-pressed', on); wb.querySelector('span').textContent = on ? 'Done' : 'Wander'; S.wander(on); app.querySelector('.hero').classList.toggle('wandering', on); };

  // --- the room you can walk into, live on Home: the real 3D tour, turning slowly until you step inside ---
  const tour = app.querySelector('.tour'), frame = tour.querySelector('iframe');
  let view = null, sweep = 0, t0 = 0, base = null, inside = false;
  const HIDE = '.sv-top,.sv-modes,.sv-map,.sv-joy,.sv-hint,.sv-card,.sv-dot,.sv-loading{display:none!important}';
  const chrome = show => {
    const doc = frame.contentDocument; if (!doc) return;
    let st = doc.getElementById('home-hide'); if (!st) { st = doc.createElement('style'); st.id = 'home-hide'; doc.head.append(st); }
    st.textContent = show ? '.sv-x,.sv-t{display:none!important}' : HIDE;
  };
  const turn = now => {
    if (!view || inside) return;
    if (!t0) t0 = now;
    const a = Math.sin((now - t0) / 1000 * 0.16) * 0.55, [lx, ly, lz] = base.look, [px, py, pz] = base.pos;
    const dx = lx - px, dz = lz - pz, ca = Math.cos(a), sa = Math.sin(a);
    try { view.inspect.place(base.pos, [px + dx * ca - dz * sa, ly, pz + dx * sa + dz * ca]); } catch {}
    sweep = requestAnimationFrame(turn);
  };
  const wait = () => {
    const v = frame.contentWindow && frame.contentWindow.__spaceView;
    if (!v || !v.inspect) return setTimeout(wait, 400);
    view = v; chrome(false);
    setTimeout(() => { base = view.inspect.where(); tour.classList.add('ready'); if (!matchMedia('(prefers-reduced-motion: reduce)').matches) sweep = requestAnimationFrame(turn); }, 900);
  };
  new IntersectionObserver(([e], io) => { if (e.isIntersecting) { io.disconnect(); frame.src = TOUR; frame.addEventListener('load', () => { chrome(false); wait(); }, { once: true }); } }, { rootMargin: '700px 0px' }).observe(tour);
  function enter() {
    tour.scrollIntoView({ block: 'center' });
    inside = true; cancelAnimationFrame(sweep); tour.classList.add('inside'); chrome(true);
    frame.tabIndex = 0; tour.querySelector('.tour-x').hidden = false; document.documentElement.classList.add('lock');
    setTimeout(() => frame.focus(), 50);
  }
  tour.querySelector('.step').onclick = enter;
  tour.querySelector('.tour-x').onclick = () => {
    inside = false; tour.classList.remove('inside'); chrome(false); frame.tabIndex = -1;
    tour.querySelector('.tour-x').hidden = true; document.documentElement.classList.remove('lock');
    if (view) { base = view.inspect.where(); t0 = 0; sweep = requestAnimationFrame(turn); }
  };
  if (d.after) d.after(app, S);
}
