// Daylight sky, by hand: the page and the sky's marks, shared by the chosen direction and its variations.
import { home } from './home.js';
import { placeAll } from './data.js';
import { rnd } from './sky.js';

const NS = 'http://www.w3.org/2000/svg';
const heb = s => /[֐-׿]/.test(s) ? ' dir="rtl"' : '';

// the pencil and the water: a little roughness on every drawn line, a soft bleed on every wash
document.body.insertAdjacentHTML('afterbegin', `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <filter id="pencil"><feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="1" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2"/></filter>
  <filter id="wc" x="-30%" y="-30%" width="160%" height="160%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="8" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="16"/></filter></svg>`);

// a pencil circle, gone round a little more than once, never quite closed
export const ring = (i, r = 50) => { const a = rnd(i) * 6; let d = ''; for (let k = 0; k <= 30; k++) { const t = a + k / 26 * Math.PI * 2, rr = r + Math.sin(k * 0.9 + i) * 1.6 + k * .05; d += `${k ? 'L' : 'M'}${(50 + Math.cos(t) * rr).toFixed(1)} ${(50 + Math.sin(t) * rr).toFixed(1)}`; } return `<svg class="ring" viewBox="0 0 100 100" aria-hidden="true"><path d="${d}"/></svg>`; };
const seed = s => s.id.length * 7 + s.id.charCodeAt(0);
export const label = s => `<span class="lab"><b${heb(s.name)}>${s.name}</b>${s.sub ? `<small>${s.sub}</small>` : ''}${s.note ? `<span class="hand">${s.note}</span>` : ''}</span>`;
export const you = `<span class="me"><svg viewBox="0 0 74 48"><path d="M8 26c2-15 52-21 58-6 5 13-42 23-55 11-6-6 1-15 13-17"/></svg>you</span>`;
export const node = s => s.kind === 'you' ? you
  : `<span class="wash"></span><span class="st"${s.img ? ` style="background-image:url(${s.img})"` : ''}></span>${s.ring === 0 ? ring(seed(s)) : ''}${label(s)}`;

// the sky follows the hour: dawn peach, noon blue, evening rose, night lilac (never black)
export const SKIES = [[5, '#F9D9C9,#F4DCE6 38%,#DCDDF4 70%,#CFE2F2'], [11, '#CFE6F5,#DDE3F7 40%,#EEE0F1 75%,#F8E6DF'], [16, '#F8D3C6,#F2C9D8 40%,#D9CDEF 72%,#C9D4F0'], [20, '#D3CCEE,#C7CFEE 45%,#D9D2F0 75%,#EBDDF0']];
export function hourSky(skies = SKIES) {
  const H = new Date().getHours(), sk = [...skies].reverse().find(([h]) => H >= h) || skies[skies.length - 1];
  document.documentElement.style.setProperty('--sky', `linear-gradient(180deg,${sk[1]} 100%)`);
}

const motes = Array.from({ length: 70 }, (_, i) => ({ x: (rnd(i + 1) - .5) * 1900, y: (rnd(i + 51) - .5) * 2300, z: (rnd(i + 101) - .5) * 1900, r: 0.6 + rnd(i + 151) * 1.6 }));
export function dust(g, project) {
  if (!g._dust) { g._dust = motes.map(() => { const c = document.createElementNS(NS, 'circle'); g.append(c); return c; }); g.classList.add('dust'); }
  motes.forEach((m, i) => { const q = project(m), c = g._dust[i]; if (q.behind) { c.setAttribute('r', 0); return; }
    c.setAttribute('cx', q.x.toFixed(1)); c.setAttribute('cy', q.y.toFixed(1)); c.setAttribute('r', Math.min(3, m.r * q.k).toFixed(2)); c.setAttribute('opacity', Math.min(.9, .25 + q.k * .6).toFixed(2)); });
}

// the arch drawn round the room you can walk into, in pencil, not quite on its line
const sketchArch = tour => {
  const w = tour.clientWidth, h = tour.clientHeight, r = w / 2;
  const path = (dx, dy, s) => `M${4 + dx} ${h - 2 + dy}L${3 + dx} ${r + dy}A${r - 3 + s} ${r - 3 + s} 0 0 1 ${w - 3 + dx} ${r - 2 + dy}L${w - 4 + dx} ${h - 6 + dy}`;
  let wrap = tour.parentElement;
  if (!wrap.classList.contains('tour-wrap')) { wrap = document.createElement('div'); wrap.className = 'tour-wrap'; tour.before(wrap); wrap.append(tour); }
  wrap.insertAdjacentHTML('beforeend', `<svg class="sketch-arch" viewBox="-9 -9 ${w + 16} ${h + 15}" aria-hidden="true"><path d="${path(-8, -9, 9)}"/><path d="${path(4, -3, 3)}" opacity=".5"/></svg>`);
};

export function day(v = {}) {
  hourSky(v.skies);
  home({
    tourShape: v.tourShape || 'arch', wander: false,
    copy: { title: 'Your sky, today', hand: 'the closest stars are where you were last', hint: 'drag to turn · pinch or tap twice to go further', live: 'Walk in now', end: 'that’s your sky for today', ...v.copy },
    legend: v.legend === false ? null : [['artist', 'Artists'], ['show', 'Shows'], ['tour', 'In 3D'], ['place', 'Places']],
    sky: {
      cam: { D: 560, pitch: 0 }, F: 560, cy: 0.57, limits: { yaw: 0.8, pitch: 0.45, Dmin: 300, Dmax: 1500 }, intro: 1.9, zoomEase: .05, farZoom: 1.9,
      farFrom: 560, fogStart: 60, fogRange: 1500, minOp: .1, labelAt: 0.7, bigAt: 0.86, maxScale: 1.3, bow: 0.1, ink: 1.25, pickLift: 90,
      layout: placeAll, node: v.node || node,
      extra(g, project, cam, t, size) { dust(g, project); if (v.extra) v.extra(g, project, cam, t, size); },
      ...v.sky,
    },
    after(app, S) {
      const tour = app.querySelector('.tour');
      if ((v.tourShape || 'arch') === 'arch' && v.sketchArch !== false) { const draw = () => { const old = app.querySelector('.sketch-arch'); if (old) old.remove(); sketchArch(tour); }; draw(); addEventListener('resize', draw); }
      if (v.after) v.after(app, S);
    },
  });
}
