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
  const pv = previewing(); if (pv) return pv.user && pv.user.id ? pv.user : null;
  try { const u = JSON.parse(localStorage.getItem(USER_KEY)); return u && u.id ? u : null; } catch { return null; }
}

// --- the control room's preview: its owner walks the way in as someone new (a visitor, or an artist) ------------------
// A pretend person lives in this tab only (sessionStorage); no email goes out, any code is taken, nothing is saved, and
// the real account stays signed in underneath. app.js shows a bar to leave it.
const PV = 'os-preview';
export function previewing() { try { return JSON.parse(sessionStorage.getItem(PV)); } catch { return null; } }
export function startPreview(as) { profile = null; pending = { email: '' }; try { sessionStorage.setItem(PV, JSON.stringify({ as, user: null })); sessionStorage.removeItem('os-pending'); } catch {} }
export function endPreview() { try { sessionStorage.removeItem(PV); sessionStorage.removeItem('os-pending'); } catch {} }
function pretend(patch) {
  const pv = previewing(); if (!pv) return;
  pv.user = { ...(pv.user || { id: 'preview', email: '', provider: 'email', role: '', name: '', details: false }), ...patch };
  try { sessionStorage.setItem(PV, JSON.stringify(pv)); } catch {}
}
function keep(user, extra = {}) {
  try {
    if (!user) return localStorage.removeItem(USER_KEY);
    const was = account(), same = was && was.id === user.id ? was : {}, meta = user.user_metadata || {};
    localStorage.setItem(USER_KEY, JSON.stringify({ id: user.id, email: user.email || '', provider: (user.app_metadata || {}).provider || 'email',
      role: extra.role ?? same.role ?? meta.role ?? '', name: extra.name || same.name || meta.full_name || meta.name || '',
      details: extra.details ?? same.details }));
  } catch {}
}

// where a person goes once signed in: their details (email accounts; Google and Apple give the names), then
// who they are here, then the app. The profile row is theirs alone (row-level security in Supabase).
async function nextStep(c, user) {
  let p = null;
  try { const { data } = await c.from('profiles').select('*').eq('id', user.id).maybeSingle(); p = data; } catch (e) { console.warn(e); }
  const provider = (user.app_metadata || {}).provider || 'email';
  const details = provider !== 'email' || !!(p && p.first_name && p.last_name && p.age && p.country && p.gender);
  const role = (p && p.role) || (user.user_metadata || {}).role || '';
  keep(user, { details, role, name: p ? [p.first_name, p.last_name].filter(Boolean).join(' ') : '' });
  profile = p;
  return !details ? '#/welcome/details' : role ? '#/' : '#/welcome/role';
}
let profile = null;

// on opening the app, signed in: is anything still missing (an account from before the details step)?
export async function refresh() {
  try {
    const c = await client();
    const { data } = await c.auth.getSession();
    if (!data.session) { keep(null); return '#/welcome'; }
    return await nextStep(c, data.session.user);
  } catch (e) { console.warn(e); return null; }
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

// coming back from the email's link (?token_hash=...: works in any browser, on any device) or from a provider
// (?code=...: in the browser that asked): finish signing in, then on to the next step
export async function finishReturn() {
  const q = new URLSearchParams(location.search);
  if (!q.has('code') && !q.has('token_hash') && !q.has('error_description')) return false;
  let err = q.get('error_description'), next = '#/welcome/email';
  if (!err) {
    try {
      const c = await client();
      let user = null;
      if (q.has('token_hash')) {
        const { data, error } = await c.auth.verifyOtp({ token_hash: q.get('token_hash'), type: q.get('type') || 'email' });
        if (error) throw error;
        user = data.user;
      } else {
        const { data } = await c.auth.getSession();      // the client trades the code for a session as it starts
        user = data.session && data.session.user;
      }
      if (user) { keep(user); next = await nextStep(c, user); }
    } catch (e) { console.warn(e); }
    if (!account()) err = 'That link was already used, or a newer email replaced it. Type the code from your latest email, or ask for a new one.';
  } else next = '#/welcome';
  history.replaceState(null, '', APP_URL() + next);
  if (err) sessionStorage.setItem('os-auth-error', err);
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
const ART = ['data/demo/works/the-starry-night.jpg', 'data/demo/works/impression-sunrise.jpg', 'data/demo/works/the-cradle.jpg', 'data/demo/works/irises.jpg',
  'data/demo/works/the-great-wave-off-kanagawa.jpg', 'data/demo/works/the-ten-largest-no-3-youth.jpg', 'data/demo/works/the-blue-room.jpg'];
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
  const btn = (k, label) => k === 'email' || on[k] ? `<button type="button" class="wl-btn wl-${k}" data-provider="${k}">${ICONS[k]}<span>${label}</span></button>` : '';
  return shell(`
    <header class="wl-brand">${LOGO_MARK}<span>Open Studio</span></header>
    <figure class="wl-arch"><img src="${art.replace('.jpg', '-m.jpg')}" alt="" fetchpriority="high" decoding="async"></figure>
    <h1>Art, on view now</h1>
    <p class="wl-lede">The shows on today, the artists behind them, and their works at their real size.</p>
    ${err ? `<p class="wl-err" role="alert">${esc(err)}</p>` : ''}
    <div class="wl-btns">${btn('apple', 'Continue with Apple')}${btn('google', 'Continue with Google')}${btn('email', 'Continue with email')}</div>
    <p class="wl-fine">Only you see your details. <a href="privacy.html">Privacy</a></p>`, 'wl-welcome');
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
    <p class="wl-lede">We sent a link to <b>${esc(email)}</b>. Open it on this phone, or type the code from the email here.</p>
    <form class="wl-form" id="wlCode" novalidate>
      <label for="wl-code">Code from the email</label>
      <input id="wl-code" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]*" maxlength="8" placeholder="12345678">
      ${err ? `<p class="wl-err" role="alert">${esc(err)}</p>` : ''}
      <button type="submit" class="wl-go">Continue</button>
    </form>
    <button type="button" class="wl-link" id="wlResend" disabled>Send again in <span>60</span> s</button>`, 'wl-step');
}

// every country, by its two-letter code (ISO 3166-1); its name in English from the phone's own list
const COUNTRIES = ('AF AX AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BQ BA BW BR IO BN BG BF BI CV KH CM CA KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT VA HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR XK KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA GS SS ES LK SD SR SJ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB US UY UZ VU VE VN VG VI WF EH YE ZM ZW').split(' ');
const GENDERS = [['woman', 'Woman'], ['man', 'Man'], ['non-binary', 'Non-binary'], ['prefer-not', 'Prefer not to say']];
function countryOptions(chosen) {
  let names; try { names = new Intl.DisplayNames(['en'], { type: 'region' }); } catch { names = { of: c => c }; }
  const list = COUNTRIES.map(c => [c, names.of(c) || c]).sort((a, b) => a[1].localeCompare(b[1]));
  const opt = ([c, n]) => `<option value="${c}"${c === chosen ? ' selected' : ''}>${esc(n)}</option>`;
  return opt(['IL', names.of('IL') || 'Israel']) + '<option disabled>──────────</option>' + list.filter(([c]) => c !== 'IL').map(opt).join('');
}
function details(p, err, full) {
  p = p || {};
  return shell(`
    <h1>${full ? 'Your details' : 'What’s your name?'}</h1>
    <p class="wl-lede">${full ? 'So the artists and shows you see are the right ones. Only you can see this.' : 'As you would like to be called here.'}</p>
    <form class="wl-form wl-details" id="wlDetails" novalidate>
      <div class="wl-two"><span><label for="wl-first">First name</label><input id="wl-first" name="first" autocomplete="given-name" value="${esc(p.first_name || '')}" required></span>
        <span><label for="wl-last">Last name</label><input id="wl-last" name="last" autocomplete="family-name" value="${esc(p.last_name || '')}" required></span></div>
      ${full ? `<div class="wl-two"><span><label for="wl-age">Age</label><input id="wl-age" name="age" inputmode="numeric" pattern="[0-9]*" maxlength="3" value="${esc(p.age || '')}"></span>
        <span><label for="wl-country">Country you live in</label><select id="wl-country" name="country" autocomplete="country">${countryOptions(p.country || 'IL')}</select></span></div>
      <fieldset class="wl-gender"><legend>Gender</legend>${GENDERS.map(([v, t]) => `<label><input type="radio" name="gender" value="${v}"${p.gender === v ? ' checked' : ''}><span>${t}</span></label>`).join('')}</fieldset>` : ''}
      ${err ? `<p class="wl-err" role="alert">${esc(err)}</p>` : ''}
      <button type="submit" class="wl-go">Continue</button>
    </form>`, 'wl-step');
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

// --- the guide: a few cards right after "I make art" / "I love art", each with the real screen it talks about ---------
const GUIDES = {
  artist: { end: '#/studio', go: 'Open my studio', cards: [
    ['icons/guide/a1.jpg', 'Bring your work in', 'Photos from your phone, your website or a Drive folder. Choose many at once; titles and sizes come after.'],
    ['icons/guide/a2.jpg', 'Give each work its real size', 'Width and height in centimetres. Visitors see every work at its true scale, and a work needs its size to hang in a room.'],
    ['icons/guide/a3.jpg', 'Make an exhibition', 'A virtual exhibition is a room that exists only here: you choose a space and hang your works in it. A show you had in a real place goes under Past exhibitions, with its photos.'],
    ['icons/guide/a4.jpg', 'Hang on the plan', 'Tap a work to put it on a wall, then drag it where you want it. Add standing walls and plinths.'],
    ['icons/guide/a5.jpg', 'Walk in, then send it', 'Walk through as a visitor would. Open Studio looks at every new page and every exhibition before it goes live.'] ] },
  lover: { end: '#/', go: 'Start looking', cards: [
    ['icons/guide/l1.jpg', 'Follow the artists you like', 'Tap Follow on an artist\u2019s page. Their new works and exhibitions come to your Home.'],
    ['icons/guide/l2.jpg', 'Walk through exhibitions', 'Shows that are on now, and virtual ones you walk through in 3D, on your phone.'],
    ['icons/guide/l3.jpg', 'Find what\u2019s on near you', 'The map shows the galleries and museums with a show today. Tap a place for its hours and what hangs there.'],
    ['icons/guide/l4.jpg', 'Your Home remembers', 'The stars are what you opened last and the artists you follow. Pinch out to meet someone new.'] ] },
};
let gi = 0;
function guide(kind) {
  const g = GUIDES[kind], n = g.cards.length; gi = Math.max(0, Math.min(n - 1, gi));
  const [img, h, t] = g.cards[gi], last = gi === n - 1;
  return shell(`
    <header class="wl-brand">${LOGO_MARK}<span>Open Studio</span><button type="button" class="wl-link wl-skip" data-g="end"${last ? ' hidden' : ''}>Skip</button></header>
    <div class="wl-mid wl-guide" data-kind="${kind}">
      <figure class="wl-gf"><img src="${img}" alt="" width="480" height="677"></figure>
      <p class="wl-gn" aria-label="Step ${gi + 1} of ${n}">${g.cards.map((_, i) => `<i${i === gi ? ' class="on"' : ''}></i>`).join('')}</p>
      <h1>${h}</h1>
      <p class="wl-lede">${t}</p>
      <div class="wl-gb">${gi ? '<button type="button" class="wl-btn wl-gback" data-g="-1">Back</button>' : ''}<button type="button" class="wl-go" data-g="${last ? 'end' : '1'}">${last ? g.go : 'Next'}</button></div>
    </div>`, 'wl-pick');
}

function accountPage(u) {
  return shell(`
    <a class="wl-back" href="#/">← Home</a>
    <h1>Your account</h1>
    <dl class="wl-dl">${u.name ? `<div><dt>Name</dt><dd>${esc(u.name)}</dd></div>` : ''}<div><dt>Email</dt><dd>${esc(u.email || '—')}</dd></div><div><dt>Here as</dt><dd>${u.role === 'artist' ? 'An artist' : 'An art lover'}</dd></div></dl>
    <div class="wl-btns">
      <a class="wl-link" href="#/welcome/${u.role === 'artist' ? 'artist' : 'tour'}">How it works</a>
      <a class="wl-link" href="#/welcome/details">Change your details</a>
      ${u.role === 'artist' ? '<a class="wl-go" href="#/studio">Your studio</a>' : ''}<button type="button" class="wl-link" data-role="${u.role === 'artist' ? 'lover' : 'artist'}">${u.role === 'artist' ? 'I’m here as an art lover' : 'I make art'}</button>
      <button type="button" class="wl-go wl-out" data-signout>Sign out</button>
      <a class="wl-link" href="privacy.html">Privacy, and deleting your account</a>
    </div>`, 'wl-step');
}

// --- the flow -------------------------------------------------------------------------------------------------------
let pending = { email: '' };
try { pending = JSON.parse(sessionStorage.getItem('os-pending')) || pending; } catch {}
const savePending = () => { try { sessionStorage.setItem('os-pending', JSON.stringify(pending)); } catch {} };
const say = e => (e && e.message || String(e || '')).replace(/^AuthApiError:\s*/, '');
// what went wrong sending the email, in words a person can act on (Supabase's own mail sends a few an hour, for the
// whole app; a person may ask again after a minute)
const sendTrouble = e => {
  const m = say(e), code = e && (e.code || e.error_code) || '';
  if (code === 'over_email_send_rate_limit' || /email rate limit/i.test(m)) return 'An email can go out once a minute. Wait a minute, then ask again (or use the code from the last email).';
  if (/seconds|too many/i.test(m)) return 'An email just went to this address. Wait a minute, then ask again.';
  if (/not authorized|not allowed/i.test(m)) return 'Emails can\u2019t go to this address yet. Try the address you opened Supabase with.';
  return m || 'The email didn\u2019t go. Try again.';
};

export async function screen(hash, app, go) {
  const u = account();
  const err = sessionStorage.getItem('os-auth-error'); sessionStorage.removeItem('os-auth-error');
  const step = hash.replace(/^#\/(welcome|account)\/?/, m => m.includes('account') ? 'account' : '') || '';
  if (hash.startsWith('#/account')) {
    if (!u) return go('#/welcome');
    app.innerHTML = accountPage(u);
    // the people who run Open Studio find their control room here (the database answers who they are)
    if (!previewing()) client().then(c => c.rpc('is_admin')).then(({ data }) => {
      const b = app.querySelector('.wl-btns');
      if (data === true && b && location.hash.startsWith('#/account') && !b.querySelector('[href="#/admin"]')) b.insertAdjacentHTML('afterbegin', '<a class="wl-go" href="#/admin">Control room</a>');
    }).catch(() => {});
  } else if (step === 'email') app.innerHTML = emailForm(pending.email, err);
  else if (step === 'sent') { if (!pending.email) return go('#/welcome/email'); app.innerHTML = sent(pending.email, err); }
  else if (step === 'details') {
    if (!u) return go('#/welcome');
    app.innerHTML = details(profile, err, u.details === true);
    if (!profile) client().then(c => c.from('profiles').select('*').eq('id', u.id).maybeSingle()).then(({ data }) => {
      if (data && location.hash === '#/welcome/details' && !app.querySelector('#wl-first').value) { profile = data; app.innerHTML = details(data, '', u.details === true); wire(app, go); }
    }).catch(() => {});
  }
  else if (step === 'role') { if (!u) return go('#/welcome'); app.innerHTML = role(u); }
  else if (step === 'artist' || step === 'tour') { if (!u) return go('#/welcome'); app.innerHTML = guide(step === 'artist' ? 'artist' : 'lover'); }
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
    if (previewing()) { pretend({ email: 'someone@gmail.com', provider: k, name: 'Someone New', details: true }); return go('#/welcome/role'); }
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
      if (previewing()) { pending = { email, at: Date.now() }; savePending(); return go('#/welcome/sent'); }
      try {
        const c = await client();
        const { error } = await c.auth.signInWithOtp({ email, options: { emailRedirectTo: APP_URL(), shouldCreateUser: true } });
        if (error) throw error;
        pending = { email, at: Date.now() }; savePending();
        go('#/welcome/sent');
      } catch (e) {
        app.innerHTML = emailForm(email, sendTrouble(e));
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
      if (token.length < 6) { app.innerHTML = sent(pending.email, 'Type the whole code from the email.'); return wire(app, go); }
      const b = cf.querySelector('button'); busy(b, true, 'Checking…');
      if (previewing()) { pretend({ email: pending.email, provider: 'email', details: false, role: '' }); return go('#/welcome/details'); }
      try {
        const c = await client();
        const { data, error } = await c.auth.verifyOtp({ email: pending.email, token, type: 'email' });
        if (error) throw error;
        keep(data.user);
        go(await nextStep(c, data.user));
      } catch (e) { app.innerHTML = sent(pending.email, 'That code didn’t work. Check it, or ask for a new one.'); wire(app, go); }
    };
    const rs = app.querySelector('#wlResend');
    const left = () => Math.max(0, 60 - Math.round((Date.now() - (pending.at || 0)) / 1000));
    const tick = () => { if (!rs.isConnected) return; const s = left(); if (s) { rs.querySelector('span').textContent = s; setTimeout(tick, 1000); } else { rs.disabled = false; rs.textContent = 'Send the email again'; } };
    tick();
    rs.onclick = async () => {
      if (previewing()) { pending.at = Date.now(); savePending(); rs.disabled = true; rs.innerHTML = 'Sent. Send again in <span>60</span> s'; return tick(); }
      rs.disabled = true; rs.textContent = 'Sending…';
      try { const c = await client(); const { error } = await c.auth.signInWithOtp({ email: pending.email, options: { emailRedirectTo: APP_URL() } }); if (error) throw error;
        pending.at = Date.now(); savePending(); rs.innerHTML = 'Sent. Send again in <span>60</span> s'; tick();
      } catch (e) { rs.disabled = false; rs.textContent = sendTrouble(e); }
    };
  }
  const df = app.querySelector('#wlDetails');
  if (df) df.onsubmit = async ev => {
    ev.preventDefault();
    const f = new FormData(df), v = k => String(f.get(k) || '').trim();
    const full = !!df.querySelector('[name=age]'), p = { first_name: v('first'), last_name: v('last') };
    if (full) { p.age = v('age') ? parseInt(v('age'), 10) : null; p.country = v('country') || null; p.gender = v('gender') || null; }
    const bad = !p.first_name || !p.last_name ? 'Your first and last name, please.' : full && p.age != null && !(p.age >= 13 && p.age <= 120) ? 'Your age in years (13 or over).' : '';
    if (bad) { app.innerHTML = details(p, bad, full); return wire(app, go); }
    const b = df.querySelector('.wl-go'); busy(b, true, 'Saving…');
    if (previewing()) { profile = { ...p }; pretend({ details: true, name: `${p.first_name} ${p.last_name}` }); return go(account().role ? '#/' : '#/welcome/role'); }
    try {
      const c = await client(), u = account();
      const { error } = await c.from('profiles').upsert({ id: u.id, ...p });
      if (error) throw error;
      await c.auth.updateUser({ data: { full_name: `${p.first_name} ${p.last_name}` } }).catch(() => {});
      profile = { ...(profile || {}), ...p };
      const { data } = await c.auth.getUser();
      keep(data.user || { id: u.id, email: u.email }, { details: true, name: `${p.first_name} ${p.last_name}` });
      go(account().role ? '#/' : '#/welcome/role');
    } catch (e) { console.warn(e); app.innerHTML = details(p, 'That didn\u2019t save. Check the connection and try again.', full); wire(app, go); }
  };
  app.querySelectorAll('[data-role]').forEach(b => b.onclick = async () => {
    const r = b.dataset.role;
    b.setAttribute('aria-busy', 'true'); app.querySelectorAll('[data-role]').forEach(x => { x.disabled = true; });
    const u = account() || {};
    gi = 0;
    if (previewing()) { pretend({ role: r }); return go(r === 'artist' ? '#/welcome/artist' : '#/welcome/tour'); }
    try {
      const c = await client();
      const { data, error } = await c.auth.updateUser({ data: { role: r } });
      if (error) throw error;
      await c.from('profiles').upsert({ id: data.user.id, role: r });
      keep(data.user, { role: r });
    } catch (e) {                                          // kept on the phone meanwhile; saved to the account next time
      console.warn(e);
      try { localStorage.setItem(USER_KEY, JSON.stringify({ ...u, role: r })); } catch {}
    }
    go(r === 'artist' ? '#/welcome/artist' : '#/welcome/tour');
  });
  app.querySelectorAll('[data-g]').forEach(b => b.onclick = () => {      // the guide: next, back, or out of it
    const k = app.querySelector('.wl-guide').dataset.kind, g = b.dataset.g;
    if (g === 'end') { gi = 0; return go(GUIDES[k].end); }
    gi += +g; app.innerHTML = guide(k); wire(app, go); const h = app.querySelector('h1'); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
  });
  app.querySelectorAll('[data-browse]').forEach(a => a.onclick = () => { try { sessionStorage.setItem('os-browse', '1'); } catch {} });
  app.querySelectorAll('[data-signout]').forEach(b => b.onclick = async () => {
    if (previewing()) { endPreview(); return go('#/admin'); }
    b.disabled = true;
    try { const c = await client(); await c.auth.signOut(); } catch {}
    keep(null); try { sessionStorage.clear(); } catch {}
    go('#/welcome');
  });
}
