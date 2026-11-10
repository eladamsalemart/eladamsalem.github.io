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
  // the museum: exhibitions (drafts; admin only) and the street's eight slots (a live slot carries a copy of its exhibition: what visitors see)
  async exhibitions() { const c = await client(); return ok(await c.from('museum_exhibitions').select('*').order('updated_at', { ascending: false })); },
  async saveExhibition(row, id) {
    const c = await client(), body = { ...row, updated_at: new Date().toISOString() };
    return ok(await (id ? c.from('museum_exhibitions').update(body).eq('id', id) : c.from('museum_exhibitions').insert(body)).select().single());
  },
  async deleteExhibition(id) { const c = await client(); ok(await c.from('museum_exhibitions').delete().eq('id', id)); },
  async slots() { const c = await client(); return ok(await c.from('museum_slots').select('*').order('slot')); },
  async saveSlot(slot, patch) { const c = await client(); return ok(await c.from('museum_slots').upsert({ slot, ...patch, updated_at: new Date().toISOString() }).select().single()); },
  async clearSlot(slot) { const c = await client(); ok(await c.from('museum_slots').delete().eq('slot', slot)); },
  // the curator's colour for each exhibition's threshold in the museum street (public read; only an admin writes: RLS)
  async streetColours() { const c = await client(); return Object.fromEntries(ok(await c.from('museum_colours').select('slug,colour')).map(r => [r.slug, r.colour])); },
  async setStreetColour(slug, colour) { const c = await client(); if (colour) ok(await c.from('museum_colours').upsert({ slug, colour, updated_at: new Date().toISOString() })); else ok(await c.from('museum_colours').delete().eq('slug', slug)); },

  // conversations: a user sees only their own (RLS), an admin sees all. Nothing here sends an email.
  async conversations() {
    const c = await client(), cs = ok(await c.from('conversations').select('*').order('updated_at', { ascending: false }).limit(100));
    if (!cs.length) return [];
    const [ps, ms] = await Promise.all([c.from('profiles').select('id, first_name, last_name, role').in('id', [...new Set(cs.map(x => x.user_id))]).then(ok),
      c.from('messages').select('conversation_id, body, from_admin, created_at').in('conversation_id', cs.map(x => x.id)).order('created_at', { ascending: false }).limit(400).then(ok)]);
    return cs.map(x => { const p = ps.find(y => y.id === x.user_id) || {}; return { ...x, name: [p.first_name, p.last_name].filter(Boolean).join(' '), role: p.role, last: (ms.find(m => m.conversation_id === x.id) || {}).body }; });
  },
  async messages(id) { const c = await client(); return ok(await c.from('messages').select('*').eq('conversation_id', id).order('created_at')); },
  async reply(id, body) {
    const c = await client(), { data } = await c.auth.getUser();
    ok(await c.from('messages').insert({ conversation_id: id, sender_id: data.user.id, from_admin: true, body }));
    ok(await c.from('conversations').update({ status: 'answered', updated_at: new Date().toISOString() }).eq('id', id));
  },
  async setConversation(id, status) { const c = await client(); ok(await c.from('conversations').update({ status, updated_at: new Date().toISOString() }).eq('id', id)); },

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
      works: ws.map((w, j) => ({ id: `w${i}_${j}`, artist_id: id, title: w.title, year: w.year, medium: w.medium, width: w.size ? w.size[1] : null, height: w.size ? w.size[0] : null, depth: null, kind: i === 8 && j < 2 ? 'object' : 'work',
        image: abs(w.image), thumb: abs(w.image.replace(/\.jpg$/, '-s.jpg')), hidden: false, reviewed_at: status === 'approved' && j >= ws.length - 3 && i % 5 === 0 ? null : 'x', created_at: day(j) })) };
  });
  const msg = (n, from_admin, body) => ({ from_admin, body, created_at: day(n) });
  const convs = [
    { id: 'c1', name: 'Noa Levi', role: 'artist', subject: 'How do I add sizes to my works?', status: 'open', created_at: day(1), updated_at: day(0.2), msgs: [msg(1, false, 'Hi, I uploaded my works but I cannot find where to put the sizes. Can you point me?'), msg(0.2, false, 'Never mind the first part, I found the edit button. Is there a limit on the number of works?')] },
    { id: 'c2', name: 'Omer Katz', role: 'lover', subject: 'Following artists', status: 'answered', created_at: day(5), updated_at: day(4), msgs: [msg(5, false, 'Can I get a note when an artist I follow opens a show?'), msg(4, true, 'Not yet, but it is on our list. Thank you for asking.')] },
    { id: 'c3', name: 'Dana Mor', role: 'artist', subject: 'Request to remove a work', status: 'closed', created_at: day(12), updated_at: day(10), msgs: [msg(12, false, 'Please hide the blue triptych, it was sold.'), msg(10, true, 'Done, it is hidden.')] }];
  W = { convs, artists, requests: [{ id: 1, body: 'Add a way to see who followed which artist.', status: 'open', created_at: day(2) }],
    shows: [
      { id: 's1', kind: 'curated', title: 'Quiet Rooms', curator: 'Elad Amsalem', room: 'long-hall', paint: 'bone', centre: 148, status: 'published', created_at: day(6), plinths: [],
        text: 'Interiors where nobody is home.\n\nA short walk through rooms that hold their breath.', works: artists[5].works.slice(0, 4).map(w => ({ id: w.id, title: w.title, image: w.image, thumb: w.thumb, width: w.width, height: w.height, artist: artists[5].name })) },
      { id: 's3', kind: 'artist', owner_id: artists[6].id, title: 'Small Weather', status: 'published', created_at: day(9), room: 'white-cube', paint: '', centre: 150, plinths: [], text: '', works: artists[6].works.slice(0, 3).map(w => ({ id: w.id, title: w.title, image: w.image, thumb: w.thumb })) },
      { id: 's4', kind: 'artist', owner_id: artists[7].id, title: 'Before the Rain', status: 'draft', created_at: day(1), room: 'long-hall', paint: '', centre: 150, plinths: [], text: '', works: artists[7].works.slice(0, 5).map(w => ({ id: w.id, title: w.title, image: w.image, thumb: w.thumb })) },
      { id: 's2', kind: 'curated', title: 'Night Studies', curator: 'Elad Amsalem', room: 'black-box', paint: '', centre: 148, status: 'draft', created_at: day(2), plinths: [], text: '', works: [] }],
    profiles: Array.from({ length: 42 }, (_, i) => ({ first_name: ['Noa', 'Dana', 'Omer', 'Lior', 'Maya', 'Yoav'][i % 6], last_name: ['Levi', 'Cohen', 'Katz', 'Mor'][i % 4], role: i % 4 === 0 ? 'artist' : i % 7 === 0 ? '' : 'lover',
      country: ['Israel', 'Israel', 'USA', 'Germany', 'France'][i % 5], provider: i % 3 ? 'email' : 'google', created_at: day(i * 0.7) })) };
  return W;
}
const strip = a => { const { works, ...r } = a; return r; };
// the mock museum: three exhibitions made of the demo artists' works, two of them hung and in slots
let MU = null;
async function museum() {
  if (MU) return MU;
  const w = await world(), now = Date.now(), iso = n => new Date(now + n * 864e5).toISOString().slice(0, 10);
  const hang = (ws, start) => { let s = start; return ws.map((x, i) => { const wd = Math.max(30, Math.min(150, +x.width || 70)); const o = { id: x.id, title: x.title, artist: x.artist_name || '', year: x.year, medium: x.medium, kind: 'work', image: x.image, thumb: x.thumb, width: +x.width || 70, height: +x.height || 90, s: s + wd / 200, y: 1.5 }; s += wd / 100 + 0.7; return o; }); };
  const A = w.artists, nm = a => a.works.map(x => ({ ...x, artist_name: a.name }));
  const e1 = { id: 'x1', title: 'Quiet Rooms', curator: 'Elad Amsalem', text: 'Interiors where nobody is home.\n\nA short walk through rooms that hold their breath.', works: hang(nm(A[5]).slice(0, 5), 0.8), plinths: [] };
  const e2 = { id: 'x2', title: 'Small Weather', curator: 'Elad Amsalem', text: '', works: hang(nm(A[6]).slice(0, 4), 7), plinths: [] };
  const e3 = { id: 'x3', title: 'Night Studies', curator: 'Elad Amsalem', text: '', works: [], plinths: [] };
  for (const e of [e1, e2, e3]) { e.created_at = e.updated_at = new Date(now - 3 * 864e5).toISOString(); }
  const snap = e => ({ title: e.title, curator: e.curator, text: e.text, works: e.works, plinths: e.plinths, objects: {} });
  MU = { ex: [e1, e2, e3], slots: [
    { slot: 1, exhibition_id: 'x1', app_slug: null, live: true, from_date: null, to_date: null, colour: '#e3981c', content: snap(e1), published_at: new Date(now - 864e5).toISOString() },
    { slot: 2, exhibition_id: 'x2', app_slug: null, live: true, from_date: iso(20), to_date: iso(60), colour: null, content: snap(e2), published_at: new Date(now - 864e5).toISOString() },
    { slot: 3, exhibition_id: null, app_slug: 'celebration-virtual', live: true, from_date: null, to_date: null, colour: null, content: null, published_at: null }] };
  return MU;
}
let mockStreet = null;
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
  async exhibitions() { await wait(); return (await museum()).ex.map(x => ({ ...x })); },
  async saveExhibition(row, id) {
    const m = await museum(); await wait(120);
    if (id) { const x = m.ex.find(q => q.id === id); Object.assign(x, row, { updated_at: new Date().toISOString() }); return { ...x }; }
    const x = { id: 'x' + Date.now(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...row }; m.ex.unshift(x); return { ...x };
  },
  async deleteExhibition(id) { const m = await museum(); m.ex = m.ex.filter(x => x.id !== id); m.slots.forEach(s => { if (s.exhibition_id === id) s.exhibition_id = null; }); },
  async slots() { await wait(); return (await museum()).slots.map(s => ({ ...s })); },
  async saveSlot(slot, patch) {
    const m = await museum(); await wait(60); let s = m.slots.find(q => q.slot === slot);
    if (!s) m.slots.push(s = { slot, exhibition_id: null, app_slug: null, live: false, from_date: null, to_date: null, colour: null, content: null, published_at: null });
    Object.assign(s, patch); return { ...s };
  },
  async clearSlot(slot) { const m = await museum(); m.slots = m.slots.filter(s => s.slot !== slot); },
  async streetColours() { await wait(); return { ...(mockStreet || (mockStreet = {})) }; },
  async setStreetColour(slug, colour) { await wait(); mockStreet = mockStreet || {}; if (colour) mockStreet[slug] = colour; else delete mockStreet[slug]; },
  async conversations() { const w = await world(); await wait(); return w.convs.map(c => ({ ...c, last: c.msgs[c.msgs.length - 1].body })).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)); },
  async messages(id) { return [...(await world()).convs.find(c => c.id === id).msgs]; },
  async reply(id, body) { const c = (await world()).convs.find(x => x.id === id); c.msgs.push({ from_admin: true, body, created_at: new Date().toISOString() }); c.status = 'answered'; c.updated_at = new Date().toISOString(); },
  async setConversation(id, status) { (await world()).convs.find(c => c.id === id).status = status; },
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
