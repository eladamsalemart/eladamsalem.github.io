// Open Studio Desk: the data layer. One interface, two bodies:
//   real  - Supabase (the same project, tables and rules as the phone app; an admin's session decides what is allowed)
//   mock  - ?guest : a small world in memory, made of the app's demo artists, so the screens can be tried and tested
//           without signing in. Nothing is sent anywhere and nothing is kept.
// The screens (desk.js) only talk to `api`.
const SUPABASE = 'https://hlpzqeosdavfuzjgpwhy.supabase.co';
const KEY = 'sb_publishable_VKboaeE8UE3iwVKhyr4FSA_faDO17fu';            // the publishable key: meant to be in the app
const REPO = 'eladamsalemart/eladamsalem.github.io';

// where the phone app lives next to this one (its rooms, its 3D viewer, its demo pictures)
export const APP = location.pathname.startsWith('/studio/') ? '/studio/app/' : '/open-studio/';
export const guest = new URLSearchParams(location.search).has('guest');
const abs = u => !u ? '' : /^(https?:|data:|blob:|\/)/.test(u) ? u : APP + u;
const gh = p => fetch(`https://api.github.com/repos/${REPO}/${p}`, { headers: { Accept: 'application/vnd.github+json' } }).then(r => r.ok ? r.json() : null).catch(() => null);

// --- real -------------------------------------------------------------------------------------------------------------
let cp = null;
const client = () => cp || (cp = new Promise((ok, no) => {
  if (window.supabase) return ok();
  const s = document.createElement('script');
  s.src = APP + 'vendor/supabase/supabase.js'; s.onload = ok; s.onerror = () => no(new Error('שירות ההתחברות לא נטען. בדוק חיבור.'));
  document.head.appendChild(s);
}).then(() => window.supabase.createClient(SUPABASE, KEY, { auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, storageKey: 'os-auth' } })));   // the same storage key as the phone app: signed in there, signed in here
const ok = ({ data, error }) => { if (error) throw error; return data; };

const real = {
  mode: 'real',
  async session() { const c = await client(); const { data } = await c.auth.getSession(); return data.session ? { email: data.session.user.email } : null; },
  async returnFromLink() {                                         // an email link that came back here (works only if the address is in Supabase's list)
    const q = new URLSearchParams(location.search); if (!q.has('token_hash')) return;
    const c = await client(); await c.auth.verifyOtp({ token_hash: q.get('token_hash'), type: q.get('type') || 'email' });
    history.replaceState(null, '', location.pathname + location.hash);
  },
  async sendCode(email) { const c = await client(); const { error } = await c.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: location.origin + location.pathname } }); if (error) throw error; },
  async verify(email, token) { const c = await client(); const { error } = await c.auth.verifyOtp({ email, token, type: 'email' }); if (error) throw error; },
  async signOut() { const c = await client(); await c.auth.signOut(); },
  async isAdmin() { const c = await client(); return !!ok(await c.rpc('is_admin')); },

  async queue() {
    const c = await client();
    const [waiting, fresh, withShows] = await Promise.all([
      c.from('artists').select('id, name, discipline, city, country, statement, note, instagram, link, created_at, sent_at').eq('status', 'pending').order('created_at').then(ok),
      c.from('works').select('id, title, year, medium, width, height, thumb, image, created_at, artist_id, artists(name, status)').is('reviewed_at', null).order('created_at', { ascending: false }).limit(300).then(ok),
      c.from('artists').select('id, name, exhibitions').then(ok)]);
    const ids = waiting.map(a => a.id);
    const aw = ids.length ? ok(await c.from('works').select('artist_id, thumb, image').in('artist_id', ids).limit(400)) : [];
    const groups = [];
    for (const w of fresh) { if (!(w.artists && w.artists.status === 'approved')) continue;       // a page not yet approved is looked over with the artist
      let g = groups.find(x => x.id === w.artist_id); if (!g) groups.push(g = { id: w.artist_id, name: w.artists.name, works: [] }); g.works.push(w); }
    const tours = withShows.flatMap(a => (a.exhibitions || []).filter(e => e.tour === 'requested' || e.tour === 'building').map(e => ({ uid: a.id, name: a.name, title: e.title, building: e.tour === 'building',
      photos: (e.photos || []).length, extra: (e.tourFiles || []).length, video: !!(e.video || (e.tourFiles || []).some(f => f.kind === 'video')), at: e.tourRequested || Date.now() })));
    return { waiting: waiting.map(a => ({ ...a, works: aw.filter(w => w.artist_id === a.id) })), groups, tours };
  },
  async approveArtist(id) {                                         // approving a page also settles its works (they were looked at with it)
    const c = await client();
    const pend = ok(await c.from('works').select('id').eq('artist_id', id).is('reviewed_at', null)).map(w => w.id);
    ok(await c.from('artists').update({ status: 'approved', note: null }).eq('id', id));
    if (pend.length) ok(await c.from('works').update({ reviewed_at: new Date().toISOString() }).in('id', pend));
    return pend;
  },
  async setArtist(id, status, note) { const c = await client(); ok(await c.from('artists').update({ status, note: note || null }).eq('id', id)); },
  async undoApprove(id, ids, note) { const c = await client(); ok(await c.from('artists').update({ status: 'pending', note: note || null }).eq('id', id)); if (ids.length) ok(await c.from('works').update({ reviewed_at: null }).in('id', ids)); },
  async reviewWorks(okIds, hideIds) {
    const c = await client(), now = new Date().toISOString();
    if (okIds.length) ok(await c.from('works').update({ reviewed_at: now, hidden: false }).in('id', okIds));
    if (hideIds.length) ok(await c.from('works').update({ reviewed_at: now, hidden: true }).in('id', hideIds));
  },
  async undoReview(ids) { const c = await client(); ok(await c.from('works').update({ reviewed_at: null, hidden: false }).in('id', ids)); },

  async artists() {
    const c = await client();
    const [rows, works] = await Promise.all([c.from('artists').select('*').order('created_at', { ascending: false }).then(ok), c.from('works').select('id, artist_id, title, year, medium, width, height, depth, thumb, image, kind, hidden, position').order('position').then(ok)]);
    return rows.map(a => ({ ...a, works: works.filter(w => w.artist_id === a.id) }));
  },
  async people() { const c = await client(); return ok(await c.from('profiles').select('first_name, last_name, role, country, provider, created_at').order('created_at', { ascending: false }).limit(500)); },

  async shows() { const c = await client(); return ok(await c.from('virtual_shows').select('*').order('created_at', { ascending: false })); },
  async show(id) { const c = await client(); return ok(await c.from('virtual_shows').select('*').eq('id', id).maybeSingle()); },
  async saveShow(row, id) { const c = await client(); return ok(await (id ? c.from('virtual_shows').update(row).eq('id', id) : c.from('virtual_shows').insert(row)).select().single()); },
  async setShowStatus(id, status) { const c = await client(); ok(await c.from('virtual_shows').update({ status }).eq('id', id)); },
  async deleteShow(id) { const c = await client(); ok(await c.from('virtual_shows').delete().eq('id', id)); },

  async health() { const [issues, runs] = await Promise.all([gh('issues?labels=app-health&state=open'), gh('actions/runs?per_page=40')]); return { issues, runs: runs && runs.workflow_runs }; },
  async requests() { const c = await client(); return ok(await c.from('change_requests').select('*').order('created_at', { ascending: false }).limit(30)); },
  async addRequest(body) { const c = await client(); ok(await c.from('change_requests').insert({ body })); },
};

// --- mock (?guest) ----------------------------------------------------------------------------------------------------
let W = null;                                                       // the mock world, built once from the app's demo data
const wait = (ms = 60) => new Promise(r => setTimeout(r, ms));
async function world() {
  if (W) return W;
  const d = await fetch(APP + 'data/demo/world.json').then(r => r.json());
  const day = n => new Date(Date.now() - n * 864e5).toISOString();
  const pick = d.artists.filter(a => d.works.some(w => w.artist === a.slug)).slice(0, 26);
  const artists = pick.map((a, i) => {
    const ws = d.works.filter(w => w.artist === a.slug).slice(0, 9);
    const status = i < 3 ? 'pending' : i === 3 ? 'changes' : i === 4 ? 'hidden' : 'approved';
    const id = 'a' + i;
    return { id, name: a.name, discipline: a.discipline, city: a.city, country: a.country, statement: a.statement, note: i === 3 ? 'Add sizes to your works, then we will put you live.' : null,
      instagram: i % 3 === 0 ? '@' + a.slug.replace(/-/g, '') : '', link: '', status, created_at: day(i < 3 ? 1 + i : 3 + i * 4), sent_at: status === 'pending' ? day(i + 1) : null,
      works: ws.map((w, j) => ({ id: `w${i}_${j}`, artist_id: id, title: w.title, year: w.year, medium: w.medium, width: w.size ? w.size[1] : null, height: w.size ? w.size[0] : null, depth: null, kind: 'work',
        image: abs(w.image), thumb: abs(w.image.replace(/\.jpg$/, '-s.jpg')), hidden: false, reviewed_at: status === 'approved' && j >= ws.length - 3 && i % 5 === 0 ? null : 'x', created_at: day(j) })) };
  });
  W = { artists, requests: [{ id: 1, body: 'Add a way to see who followed which artist.', status: 'open', created_at: day(2) }],
    shows: [
      { id: 's1', kind: 'curated', title: 'Quiet Rooms', curator: 'Elad Amsalem', room: 'long-hall', paint: 'bone', centre: 148, status: 'published', created_at: day(6), plinths: [],
        text: 'Interiors where nobody is home.\n\nA short walk through rooms that hold their breath.', works: artists[5].works.slice(0, 4).map(w => ({ id: w.id, title: w.title, image: w.image, thumb: w.thumb, width: w.width, height: w.height, artist: artists[5].name })) },
      { id: 's2', kind: 'curated', title: 'Night Studies', curator: 'Elad Amsalem', room: 'black-box', paint: '', centre: 148, status: 'draft', created_at: day(2), plinths: [], text: '', works: [] }],
    profiles: Array.from({ length: 42 }, (_, i) => ({ first_name: ['Noa', 'Dana', 'Omer', 'Lior', 'Maya', 'Yoav'][i % 6], last_name: ['Levi', 'Cohen', 'Katz', 'Mor'][i % 4], role: i % 4 === 0 ? 'artist' : i % 7 === 0 ? '' : 'lover',
      country: ['Israel', 'Israel', 'USA', 'Germany', 'France'][i % 5], provider: i % 3 ? 'email' : 'google', created_at: day(i * 0.7) })) };
  return W;
}
const strip = a => { const { works, ...r } = a; return r; };
const mock = {
  mode: 'mock',
  async session() { return { email: 'guest@demo' }; }, async returnFromLink() {}, async sendCode() {}, async verify() {}, async signOut() { location.search = ''; }, async isAdmin() { return true; },
  async queue() {
    const w = await world(); await wait();
    const waiting = w.artists.filter(a => a.status === 'pending').map(a => ({ ...strip(a), works: a.works }));
    const groups = [];
    for (const a of w.artists.filter(a => a.status === 'approved')) { const fresh = a.works.filter(x => x.reviewed_at === null); if (fresh.length) groups.push({ id: a.id, name: a.name, works: fresh }); }
    return { waiting, groups, tours: [{ uid: 'a9', name: w.artists[9].name, title: 'Studio Walk', building: false, photos: 12, extra: 2, video: true, at: Date.now() - 2 * 864e5 }] };
  },
  async approveArtist(id) { const w = await world(), a = w.artists.find(x => x.id === id); a.status = 'approved'; a.note = null; const ids = a.works.filter(x => x.reviewed_at === null).map(x => x.id); a.works.forEach(x => { if (x.reviewed_at === null) x.reviewed_at = 'x'; }); return ids; },
  async setArtist(id, status, note) { const a = (await world()).artists.find(x => x.id === id); a.status = status; a.note = note || null; },
  async undoApprove(id, ids, note) { const a = (await world()).artists.find(x => x.id === id); a.status = 'pending'; a.note = note || null; a.works.forEach(x => { if (ids.includes(x.id)) x.reviewed_at = null; }); },
  async reviewWorks(okIds, hideIds) { (await world()).artists.forEach(a => a.works.forEach(x => { if (okIds.includes(x.id)) { x.reviewed_at = 'x'; x.hidden = false; } if (hideIds.includes(x.id)) { x.reviewed_at = 'x'; x.hidden = true; } })); },
  async undoReview(ids) { (await world()).artists.forEach(a => a.works.forEach(x => { if (ids.includes(x.id)) { x.reviewed_at = null; x.hidden = false; } })); },
  async artists() { await wait(); return (await world()).artists; },
  async people() { await wait(); return (await world()).profiles; },
  async shows() { await wait(); return [...(await world()).shows]; },
  async show(id) { return (await world()).shows.find(s => s.id === id) || null; },
  async saveShow(row, id) {
    const w = await world(); await wait(120);
    if (id) { const s = w.shows.find(x => x.id === id); Object.assign(s, row); return s; }
    const s = { id: 's' + Date.now(), kind: 'curated', created_at: new Date().toISOString(), ...row }; w.shows.unshift(s); return s;
  },
  async setShowStatus(id, status) { (await world()).shows.find(x => x.id === id).status = status; },
  async deleteShow(id) { const w = await world(); w.shows = w.shows.filter(x => x.id !== id); },
  async health() {
    const t = n => new Date(Date.now() - n * 36e5).toISOString();
    return { issues: [], runs: [{ name: 'Open Studio app', status: 'completed', conclusion: 'success', created_at: t(3), html_url: '#' }, { name: 'Studio rooms', status: 'completed', conclusion: 'success', created_at: t(30), html_url: '#' },
      { name: 'Art map: exhibitions', status: 'completed', conclusion: 'failure', created_at: t(9), html_url: '#' }, { name: 'Supabase functions', status: 'completed', conclusion: 'success', created_at: t(70), html_url: '#' }] };
  },
  async requests() { return (await world()).requests; },
  async addRequest(body) { (await world()).requests.unshift({ id: Date.now(), body, status: 'open', created_at: new Date().toISOString() }); },
};

export const api = guest ? mock : real;
export { abs };
