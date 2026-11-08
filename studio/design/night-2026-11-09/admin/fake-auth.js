// A fake of auth.js + the database, in memory, with the real row shapes (for looking at the control room offline).
const IMG = n => `../../../app/data/demo/works/${n}-s.jpg`;
const ago = d => new Date(Date.now() - d * 864e5).toISOString();
const db = {
  artists: [
    { id: 'a1', name: 'Maya Lieberman', discipline: 'Painter', city: 'Tel Aviv', country: 'Israel', status: 'pending', created_at: ago(9), sent_at: ago(2), instagram: '@maya.paints', link: 'https://example.com', note: null,
      statement: 'Oil on linen, rooms seen through windows: what stays in a house after the people leave.', exhibitions: [{ title: 'Rooms Left Behind', tour: 'requested', photos: [1, 2, 3, 4], tourFiles: [{ kind: 'video' }, { kind: 'photo' }], tourRequested: Date.now() - 3 * 864e5 }] },
    { id: 'a2', name: 'Yosef Haim', discipline: 'Printmaker', city: 'Haifa', country: 'Israel', status: 'pending', created_at: ago(7), sent_at: ago(5), note: null, statement: 'Woodblock prints of the port, in the evening, by hand.', exhibitions: [] },
    { id: 'a3', name: 'Liat Ben-Ami', discipline: 'Painter', city: 'Jerusalem', country: 'Israel', status: 'approved', created_at: ago(20), sent_at: ago(18), note: null, statement: 'Flowers and fields.', exhibitions: [] },
    { id: 'a4', name: 'Omer Katz', discipline: 'Painter', city: 'Berlin', country: 'Germany', status: 'changes', created_at: ago(14), sent_at: ago(10), note: 'Add sizes to your works', statement: 'Peasants and potatoes.', exhibitions: [] },
    { id: 'a5', name: 'Tamar Golan', discipline: 'Ceramics', city: 'Tel Hai', country: 'Israel', status: 'hidden', created_at: ago(30), note: null, statement: '', exhibitions: [] },
    { id: 'a6', name: 'Dror Peretz', discipline: 'Photographer', city: 'Eilat', country: 'Israel', status: 'draft', created_at: ago(3), note: null, statement: '', exhibitions: [] },
  ],
  works: [],
  profiles: [],
  virtual_shows: [{ id: 's1', kind: 'curated', title: 'The Green Hour', room: 'long-hall', works: [], status: 'draft', created_at: ago(2) }],
  change_requests: [{ id: 1, body: 'Show artists a counter of their page views', created_at: ago(4), status: 'filed', issue: 12 }, { id: 2, body: 'Dark mode for the control room', created_at: ago(1), status: 'open' }],
};
const mk = (id, artist, title, img, sized, status) => db.works.push({ id, title, year: '1888', medium: 'Oil on canvas', width: sized ? 40 : null, height: sized ? 50 : null, thumb: IMG(img), image: IMG(img), created_at: ago(1), artist_id: artist, reviewed_at: status || null, hidden: false });
['the-blue-room', 'the-open-window', 'bedroom-in-arles', 'the-cup-of-tea', 'in-a-park', 'woman-in-the-garden'].forEach((n, i) => mk('w1' + i, 'a1', n.replace(/-/g, ' '), n, true));
['the-great-wave-off-kanagawa', 'sundai-edo', 'steep-street-in-moonlight', 'the-port-at-lorient'].forEach((n, i) => mk('w2' + i, 'a2', n.replace(/-/g, ' '), n, true));
['irises', 'sunflowers', 'wheatfield-with-crows', 'the-starry-night', 'joy-of-life', 'the-bathers'].forEach((n, i) => mk('w3' + i, 'a3', n.replace(/-/g, ' '), n, i !== 3));
['the-potato-eaters', 'old-peasant-woman', 'the-magpie'].forEach((n, i) => mk('w4' + i, 'a4', n.replace(/-/g, ' '), n, true));
const first = ['Dana', 'Tom', 'Noa', 'Ben', 'Lior', 'Yael', 'Amir', 'Sara'], last = ['Shapira', 'Weiss', 'Levi', 'Carter', 'Ohana', 'Katz'];
for (let i = 0; i < 40; i++) db.profiles.push({ first_name: first[i % 8], last_name: last[i % 6], role: i % 5 === 0 ? 'artist' : 'lover', country: ['Israel', 'USA', 'UK', 'Germany'][i % 4], provider: i % 3 ? 'email' : 'google', created_at: ago(i * 0.7) });

class Q {
  constructor(t) { this.t = t; this.f = []; this.op = 'select'; this.v = null; this.head = false; this.lim = 1e9; this.ord = null; this.one = false; this.cols = '*'; }
  select(cols, o) { if (this.op === 'select') { this.cols = cols; this.head = !!(o && o.head); this.count = !!(o && o.count); } return this; }
  update(v) { this.op = 'update'; this.v = v; return this; } insert(v) { this.op = 'insert'; this.v = v; return this; } delete() { this.op = 'delete'; return this; }
  eq(k, v) { this.f.push(r => r[k] === v); return this; } is(k, v) { this.f.push(r => (r[k] ?? null) === v); return this; } in(k, vs) { this.f.push(r => vs.includes(r[k])); return this; }
  order(k, o) { this.ord = [k, !(o && o.ascending === false)]; return this; } limit(n) { this.lim = n; return this; } single() { this.one = true; return this; } maybeSingle() { this.one = true; return this; }
  then(res, rej) { return Promise.resolve(this.run()).then(res, rej); }
  run() {
    const T = db[this.t] || []; let rows = T.filter(r => this.f.every(f => f(r)));
    if (this.op === 'update') { rows.forEach(r => Object.assign(r, this.v)); return { data: rows, error: null }; }
    if (this.op === 'insert') { const r = { id: 'n' + Math.random().toString(36).slice(2, 6), created_at: ago(0), ...this.v }; T.push(r); return { data: this.one ? r : [r], error: null }; }
    if (this.op === 'delete') { db[this.t] = T.filter(r => !rows.includes(r)); return { data: null, error: null }; }
    if (this.ord) { const [k, asc] = this.ord; rows = [...rows].sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * (asc ? 1 : -1)); }
    rows = rows.slice(0, this.lim).map(r => this.t === 'works' && /artists\(/.test(this.cols) ? { ...r, artists: db.artists.find(a => a.id === r.artist_id) } : r);
    if (this.head) return { count: rows.length, data: null, error: null };
    return { data: this.one ? rows[0] || null : rows, error: null };
  }
}
const sb = { from: t => new Q(t), rpc: async () => ({ data: true }), auth: { getSession: async () => ({ data: { session: { access_token: 'x', user: { id: 'me' } } } }) } };
export const client = async () => sb;
export const startPreview = () => {};

// the outside world: the admin-users function and GitHub
const realFetch = window.fetch.bind(window);
window.fetch = (u, o) => {
  u = String(u);
  const j = d => Promise.resolve(new Response(JSON.stringify(d), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  if (u.includes('admin-users')) return j({ accounts: [{ id: 't1', email: 'ooopenstudio+t110912@gmail.com', name: 'Test Person', role: 'artist', artist: 'pending', created_at: ago(1) }] });
  if (u.includes('/issues')) return j([]);
  if (u.includes('/actions/runs')) return j({ workflow_runs: ['Open Studio app', 'App health', 'Studio spaces', 'Art map: exhibitions', 'Owner requests'].map((name, i) => ({ name, status: 'completed', conclusion: i === 2 ? 'failure' : 'success', created_at: ago(i * 0.4), html_url: 'https://github.com' })) });
  return realFetch(u, o);
};
