// Open Studio's way in: sign up or sign in (email, or Google, Apple, Facebook once each is connected in Supabase),
// then say who you are here: an artist or an art lover. The account lives in Supabase (auth only; the role is kept on
// the account itself, in its user metadata). This phone remembers who is signed in (os-user) so the app can open at
// once; Supabase's own session (os-auth) is what proves it.
const SUPABASE = 'https://hlpzqeosdavfuzjgpwhy.supabase.co';
const KEY = 'sb_publishable_VKboaeE8UE3iwVKhyr4FSA_faDO17fu';            // the publishable key: meant to be in the app
const USER_KEY = 'os-user';
const APP_URL = () => location.origin + location.pathname;

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// --- who is signed in, on this phone ---------------------------------------------------------------------------------
export function account() {
  try { const u = JSON.parse(localStorage.getItem(USER_KEY)); return u && u.id ? u : null; } catch { return null; }
}
function keep(user) {
  try {
    if (!user) localStorage.removeItem(USER_KEY);
    else localStorage.setItem(USER_KEY, JSON.stringify({ id: user.id, email: user.email || '', role: (user.user_metadata || {}).role || '',
      name: (user.user_metadata || {}).full_name || (user.user_metadata || {}).name || '' }));
  } catch {}
}

let ready = null;
export function client() {
  if (!ready) ready = new Promise((ok, no) => {
    if (window.supabase) return ok();
    const s = document.createElement('script');
    s.src = 'vendor/supabase/supabase.js'; s.onload = ok; s.onerror = () => no(new Error('The sign-in service didn’t load. Check the connection.'));
    document.head.appendChild(s);
  }).then(() => {
    const c = window.supabase.createClient(SUPABASE, KEY, { auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, storageKey: 'os-auth' } });
    c.auth.onAuthStateChange((ev, session) => { if (ev === 'SIGNED_OUT') keep(null); else if (session) keep(session.user); });
    return c;
  });
  return ready;
}

// coming back from an email link or a provider (?code=...): finish signing in, then on to the next step
export async function finishReturn() {
  const q = new URLSearchParams(location.search);
  if (!q.has('code') && !q.has('error_description')) return false;
  const err = q.get('error_description');
  let next = '#/welcome';
  if (!err) {
    try {
      const c = await client();
      const { data } = await c.auth.getSession();        // the client trades the code for a session as it starts
      if (data.session) { keep(data.session.user); next = account().role ? '#/' : '#/welcome/role'; }
    } catch (e) { console.warn(e); }
  }
  history.replaceState(null, '', APP_URL() + next);
  if (err || !account()) sessionStorage.setItem('os-auth-error', err || 'That link has expired or was already used. Ask for a new one.');
  return true;
}

let providers = null;
async function enabled() {
  if (providers) return providers;
  try {
    const r = await fetch(`${SUPABASE}/auth/v1/settings`, { headers: { apikey: KEY } });
    providers = (await r.json()).external || {};
  } catch { providers = { email: true }; }
  return providers;
}

// --- the screens ----------------------------------------------------------------------------------------------------
// works that fill their picture to the edge (the others are photographed with their paper or canvas around them)
const ART = ['data/demo/works/low-tide.jpg', 'data/demo/works/late-garden.jpg', 'data/demo/works/two-rooms.jpg', 'data/demo/works/orchard-at-noon.jpg',
  'data/demo/works/blue-room.jpg', 'data/demo/works/static-bloom.jpg', 'data/demo/works/noise-garden.jpg'];
const LOGO_MARK = '<svg viewBox="0 0 132 132" aria-hidden="true"><rect x="8" y="8" width="116" height="116" rx="36" fill="#1F2A44"/><path d="M42 106 V62 a24 24 0 0 1 48 0 V106 Z" fill="#F5C9B8"/></svg>';
const ICONS = {
  google: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.9A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7H2.1a11 11 0 0 0 0 10l3.7-2.9z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7l3.7 2.9C6.7 7.3 9.1 5.4 12 5.4z"/></svg>',
  apple: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.4 12.6c0-2.4 2-3.5 2-3.6a4.3 4.3 0 0 0-3.4-1.8c-1.4-.2-2.8.8-3.5.8s-1.8-.8-3-.8a4.5 4.5 0 0 0-3.8 2.3c-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3s1.6-.7 3-.7 1.8.7 3 .7 2-1.1 2.8-2.3a10 10 0 0 0 1.3-2.6 4 4 0 0 1-2.5-3.6zM14.1 5.5A4 4 0 0 0 15 2.6a4.1 4.1 0 0 0-2.7 1.4 3.9 3.9 0 0 0-1 2.8 3.4 3.4 0 0 0 2.8-1.3z"/></svg>',
  facebook: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M14 22v-8h2.7l.4-3.2H14V8.8c0-.9.3-1.6 1.6-1.6h1.7V4.4a22 22 0 0 0-2.5-.1c-2.5 0-4.2 1.5-4.2 4.3v2.3H7.9V14h2.7v8z"/></svg>',
  email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>',
};

function shell(inner, cls = '') {
  return `<div class="wl ${cls}">${inner}</div>`;
}

function welcome(on, err) {
  const art = ART[new Date().getDate() % ART.length];
  const btn = (k, label) => {
    const live = k === 'email' || on[k];
    return `<button type="button" class="wl-btn wl-${k}" data-provider="${k}"${live ? '' : ' disabled aria-describedby="wl-soon"'}>${ICONS[k]}<span>${label}</span>${live ? '' : '<i>Soon</i>'}</button>`;
  };
  return shell(`
    <header class="wl-brand">${LOGO_MARK}<span>Open Studio</span></header>
    <figure class="wl-arch"><img src="${art}" alt=""></figure>
    <h1>Art, on view now</h1>
    <p class="wl-lede">The shows on today, the artists behind them, and their works at their real size.</p>
    ${err ? `<p class="wl-err" role="alert">${esc(err)}</p>` : ''}
    <div class="wl-btns">${btn('google', 'Continue with Google')}${btn('apple', 'Continue with Apple')}${btn('facebook', 'Continue with Facebook')}${btn('email', 'Continue with email')}</div>
    <p class="wl-fine" id="wl-soon">${['google', 'apple', 'facebook'].some(k => !on[k]) ? 'Google, Apple and Facebook are being connected. Email works now.' : ''}</p>`, 'wl-welcome');
}

function emailForm(prefill, err) {
  return shell(`
    <a class="wl-back" href="#/welcome">← Back</a>
    <h1>Your email</h1>
    <p class="wl-lede">We'll send you a link and a code. No password to remember.</p>
    <form class="wl-form" id="wlEmail" novalidate>
      <label for="wl-email">Email</label>
      <input id="wl-email" name="email" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" required value="${esc(prefill)}" placeholder="you@example.com">
      ${err ? `<p class="wl-err" role="alert">${esc(err)}</p>` : ''}
      <button type="submit" class="wl-go">Send me a link</button>
    </form>`, 'wl-step');
}

function sent(email, err) {
  return shell(`
    <a class="wl-back" href="#/welcome/email">← Use another email</a>
    <div class="wl-env" aria-hidden="true">${ICONS.email}</div>
    <h1>Check your email</h1>
    <p class="wl-lede">We sent a link to <b>${esc(email)}</b>. Open it on this phone, or type the 6-digit code from the email here.</p>
    <form class="wl-form" id="wlCode" novalidate>
      <label for="wl-code">Code from the email</label>
      <input id="wl-code" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]*" maxlength="8" placeholder="123456">
      ${err ? `<p class="wl-err" role="alert">${esc(err)}</p>` : ''}
      <button type="submit" class="wl-go">Continue</button>
    </form>
    <button type="button" class="wl-link" id="wlResend" disabled>Send again in <span>60</span> s</button>`, 'wl-step');
}

function role(u) {
  return shell(`
    <header class="wl-brand">${LOGO_MARK}<span>Open Studio</span></header>
    <div class="wl-mid">
      <h1>Who are you here?</h1>
      <p class="wl-lede">${u && u.email ? `Signed in as ${esc(u.email)}. ` : ''}You can change this later.</p>
      <div class="wl-roles">
        <button type="button" class="wl-role wl-artist" data-role="artist"><span class="wl-ra" aria-hidden="true"></span><b>I make art</b><span>Artist · open your studio, show your works at their real size</span></button>
        <button type="button" class="wl-role wl-lover" data-role="lover"><span class="wl-ra" aria-hidden="true"></span><b>I love art</b><span>Art lover · follow artists, find what's on, walk shows in 3D</span></button>
      </div>
    </div>`, 'wl-pick');
}

function artistSoon(u) {
  return shell(`
    <header class="wl-brand">${LOGO_MARK}<span>Open Studio</span></header>
    <div class="wl-mid">
      <figure class="wl-arch wl-arch-sm wl-empty" aria-hidden="true"></figure>
      <h1>Your studio is being built</h1>
      <p class="wl-lede">The artists' side of Open Studio is what we make next. We'll write to ${u && u.email ? `<b>${esc(u.email)}</b>` : 'you'} the day it opens.</p>
      <div class="wl-btns">
        <a class="wl-go" href="#/" data-browse>Look around meanwhile</a>
        <button type="button" class="wl-link" data-role="lover">I'm here as an art lover</button>
        <button type="button" class="wl-link" data-signout>Sign out</button>
      </div>
    </div>`, 'wl-pick');
}

function accountPage(u) {
  return shell(`
    <a class="wl-back" href="#/">← Home</a>
    <h1>Your account</h1>
    <dl class="wl-dl"><div><dt>Email</dt><dd>${esc(u.email || '—')}</dd></div><div><dt>Here as</dt><dd>${u.role === 'artist' ? 'An artist' : 'An art lover'}</dd></div></dl>
    <div class="wl-btns">
      <button type="button" class="wl-link" data-role="${u.role === 'artist' ? 'lover' : 'artist'}">${u.role === 'artist' ? 'I’m here as an art lover' : 'I make art'}</button>
      <button type="button" class="wl-go wl-out" data-signout>Sign out</button>
    </div>`, 'wl-step');
}

// --- the flow -------------------------------------------------------------------------------------------------------
let pending = { email: '' };
try { pending = JSON.parse(sessionStorage.getItem('os-pending')) || pending; } catch {}
const savePending = () => { try { sessionStorage.setItem('os-pending', JSON.stringify(pending)); } catch {} };
const say = e => (e && e.message || String(e || '')).replace(/^AuthApiError:\s*/, '');

export async function screen(hash, app, go) {
  const u = account();
  const err = sessionStorage.getItem('os-auth-error'); sessionStorage.removeItem('os-auth-error');
  const step = hash.replace(/^#\/(welcome|account)\/?/, m => m.includes('account') ? 'account' : '') || '';
  if (hash.startsWith('#/account')) {
    if (!u) return go('#/welcome');
    app.innerHTML = accountPage(u);
  } else if (step === 'email') app.innerHTML = emailForm(pending.email, err);
  else if (step === 'sent') { if (!pending.email) return go('#/welcome/email'); app.innerHTML = sent(pending.email, err); }
  else if (step === 'role') { if (!u) return go('#/welcome'); app.innerHTML = role(u); }
  else if (step === 'artist') app.innerHTML = artistSoon(u);
  else {
    if (u && u.role) return go('#/');
    app.innerHTML = welcome({ email: true }, err);
    enabled().then(on => { if (location.hash === hash || (!location.hash.startsWith('#/welcome/') && hash === '#/welcome')) { const f = app.querySelector('.wl-welcome'); if (f) { app.innerHTML = welcome(on, err); wire(app, go); } } });
  }
  document.title = (app.querySelector('h1') || {}).textContent ? `${app.querySelector('h1').textContent} · Open Studio` : 'Open Studio';
  wire(app, go);
}

function busy(b, on, label) {
  if (!b) return;
  if (on) { b.dataset.label = b.textContent; b.textContent = label; b.disabled = true; b.setAttribute('aria-busy', 'true'); }
  else { b.textContent = b.dataset.label || b.textContent; b.disabled = false; b.removeAttribute('aria-busy'); }
}

function wire(app, go) {
  app.querySelectorAll('[data-provider]').forEach(b => b.onclick = async () => {
    const k = b.dataset.provider;
    if (k === 'email') return go('#/welcome/email');
    busy(b, true, 'Opening…');
    try {
      const c = await client();
      const { error } = await c.auth.signInWithOAuth({ provider: k, options: { redirectTo: APP_URL() } });
      if (error) throw error;
    } catch (e) { busy(b, false); sessionStorage.setItem('os-auth-error', say(e)); go('#/welcome', true); }
  });
  const ef = app.querySelector('#wlEmail');
  if (ef) {
    const input = ef.querySelector('input');
    setTimeout(() => input.focus(), 50);
    ef.onsubmit = async ev => {
      ev.preventDefault();
      const email = input.value.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { app.innerHTML = emailForm(email, 'That doesn’t look like an email address.'); return wire(app, go); }
      const b = ef.querySelector('button'); busy(b, true, 'Sending…');
      try {
        const c = await client();
        const { error } = await c.auth.signInWithOtp({ email, options: { emailRedirectTo: APP_URL(), shouldCreateUser: true } });
        if (error) throw error;
        pending = { email, at: Date.now() }; savePending();
        go('#/welcome/sent');
      } catch (e) {
        app.innerHTML = emailForm(email, /rate|seconds|too many/i.test(say(e)) ? 'Too many emails just now. Wait a minute and try again.' : say(e) || 'The email didn’t go. Try again.');
        wire(app, go);
      }
    };
  }
  const cf = app.querySelector('#wlCode');
  if (cf) {
    const input = cf.querySelector('input');
    cf.onsubmit = async ev => {
      ev.preventDefault();
      const token = input.value.replace(/\D/g, '');
      if (token.length < 6) { app.innerHTML = sent(pending.email, 'The code has 6 digits.'); return wire(app, go); }
      const b = cf.querySelector('button'); busy(b, true, 'Checking…');
      try {
        const c = await client();
        const { data, error } = await c.auth.verifyOtp({ email: pending.email, token, type: 'email' });
        if (error) throw error;
        keep(data.user);
        go(account().role ? '#/' : '#/welcome/role');
      } catch (e) { app.innerHTML = sent(pending.email, 'That code didn’t work. Check it, or ask for a new one.'); wire(app, go); }
    };
    const rs = app.querySelector('#wlResend');
    const left = () => Math.max(0, 60 - Math.round((Date.now() - (pending.at || 0)) / 1000));
    const tick = () => { if (!rs.isConnected) return; const s = left(); if (s) { rs.querySelector('span').textContent = s; setTimeout(tick, 1000); } else { rs.disabled = false; rs.textContent = 'Send the email again'; } };
    tick();
    rs.onclick = async () => {
      rs.disabled = true; rs.textContent = 'Sending…';
      try { const c = await client(); const { error } = await c.auth.signInWithOtp({ email: pending.email, options: { emailRedirectTo: APP_URL() } }); if (error) throw error;
        pending.at = Date.now(); savePending(); rs.innerHTML = 'Sent. Send again in <span>60</span> s'; tick();
      } catch (e) { rs.disabled = false; rs.textContent = /rate|seconds/i.test(say(e)) ? 'Wait a minute, then try again' : 'Didn’t go. Try again'; }
    };
  }
  app.querySelectorAll('[data-role]').forEach(b => b.onclick = async () => {
    const r = b.dataset.role;
    b.setAttribute('aria-busy', 'true'); app.querySelectorAll('[data-role]').forEach(x => { x.disabled = true; });
    const u = account() || {};
    try {
      const c = await client();
      const { data, error } = await c.auth.updateUser({ data: { role: r } });
      if (error) throw error;
      keep(data.user);
    } catch (e) {                                          // kept on the phone meanwhile; saved to the account next time
      console.warn(e);
      try { localStorage.setItem(USER_KEY, JSON.stringify({ ...u, role: r })); } catch {}
    }
    go(r === 'artist' ? '#/welcome/artist' : '#/');
  });
  app.querySelectorAll('[data-browse]').forEach(a => a.onclick = () => { try { sessionStorage.setItem('os-browse', '1'); } catch {} });
  app.querySelectorAll('[data-signout]').forEach(b => b.onclick = async () => {
    b.disabled = true;
    try { const c = await client(); await c.auth.signOut(); } catch {}
    keep(null); try { sessionStorage.clear(); } catch {}
    go('#/welcome');
  });
}
