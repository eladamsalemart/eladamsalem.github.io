// The artist's studio, kept in Open Studio's database (Supabase) for a real artist's account: their page (artists),
// their works (works, images in the "works" storage bucket, in a folder of their own) and the exhibitions they design
// (virtual_shows). Row-level security lets each artist write only their own; a page is shown to visitors once
// Open Studio approves it. artist.js keeps the same shape of studio (S) for the demo, in the browser.
import { client } from './auth.js';

const FN = 'https://hlpzqeosdavfuzjgpwhy.supabase.co/functions/v1/import-media';
const slugify = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'artist';

export async function session() {
  const c = await client();
  const { data } = await c.auth.getSession();
  return data.session ? { c, user: data.session.user, token: data.session.access_token } : null;
}

const rowToWork = r => ({ id: r.id, title: r.title, year: r.year || '', medium: r.medium || '', width: r.width ?? '', height: r.height ?? '', depth: r.depth ?? '',
  image: r.image, thumb: r.thumb || r.image, source: r.source || '', framed: 'no', check: { W: 2000, H: 2000, long: 2000, mean: 120, clipped: 0, sharp: 0.5, backdrop: false } });
const rowToShow = r => ({ id: r.id, title: r.title, room: r.room, paint: r.paint || '', centre: r.centre, text: r.text || '', status: r.status, slug: r.slug,
  works: (r.works || []).map(w => w.id) });

// the studio as the database has it, or null when this account has no page yet
export async function load() {
  const s = await session(); if (!s) return null;
  const { c, user } = s;
  const { data: a } = await c.from('artists').select('*').eq('id', user.id).maybeSingle();
  if (!a) return null;
  const [{ data: works }, { data: shows }] = await Promise.all([
    c.from('works').select('*').eq('artist_id', user.id).order('position'),
    c.from('virtual_shows').select('*').eq('owner_id', user.id).eq('kind', 'artist').order('created_at', { ascending: false }),
  ]);
  const S = { cloud: true, status: a.status, note: a.note || '', slug: a.slug,
    artist: { name: a.name, discipline: a.discipline || '', city: a.city || '', photo: a.photo || '', statement: a.statement || '', bio: a.bio || '', link: a.link || '', instagram: a.instagram || '', cover: '' },
    works: (works || []).map(rowToWork), exhibitions: [], virtual: (shows || []).map(rowToShow) };
  last = JSON.stringify(S);
  return S;
}
let last = '';

// a new artist's page: their name, from the account; waiting for Open Studio's approval
export async function create(fields) {
  const { c, user } = await session();
  let slug = slugify(fields.name);
  for (let i = 2; i < 50; i++) {
    const { error } = await c.from('artists').insert({ id: user.id, slug, name: fields.name, discipline: fields.discipline || null, city: fields.city || null, country: fields.country || null, instagram: fields.instagram || null, link: fields.link || null });
    if (!error) return load();
    if (!/duplicate|unique/i.test(error.message) || /artists_pkey/.test(error.message)) throw error;
    slug = `${slugify(fields.name)}-${i}`;
  }
  throw new Error('No free address for this name');
}

// --- images: brought to a sensible size in the browser, then kept in the artist's own folder ------------------------
async function shrink(blob, long, q = 0.88) {
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error('not an image')); i.src = url; });
    const k = Math.min(1, long / Math.max(img.naturalWidth, img.naturalHeight));
    const cv = document.createElement('canvas'); cv.width = Math.round(img.naturalWidth * k); cv.height = Math.round(img.naturalHeight * k);
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    return { blob: await new Promise(ok => cv.toBlob(ok, 'image/jpeg', q)), w: img.naturalWidth, h: img.naturalHeight };
  } finally { URL.revokeObjectURL(url); }
}
export async function upload(blob) {
  const { c, user } = await session();
  const id = crypto.randomUUID(), [full, small] = await Promise.all([shrink(blob, 2600), shrink(blob, 640, 0.82)]);
  const put = async (b, name) => {
    const path = `${user.id}/${name}`;
    const { error } = await c.storage.from('works').upload(path, b, { contentType: 'image/jpeg', upsert: false });
    if (error) throw error;
    return c.storage.from('works').getPublicUrl(path).data.publicUrl;
  };
  const [image, thumb] = await Promise.all([put(full.blob, `${id}.jpg`), put(small.blob, `${id}-s.jpg`)]);
  return { image, thumb, w: full.w, h: full.h };
}
const isLocal = u => /^(data|blob):/.test(u || '');
const toBlob = async u => (await fetch(u)).blob();

// --- saving: what changed since the last save goes to the database --------------------------------------------------
let saving = Promise.resolve();
export function save(S) { saving = saving.then(() => push(S)).catch(e => { console.error(e); window.dispatchEvent(new CustomEvent('studio-save-failed', { detail: e.message })); }); return saving; }
async function push(S) {
  const { c, user } = await session();
  const was = last ? JSON.parse(last) : { artist: {}, works: [], virtual: [] };
  const a = S.artist;
  if (JSON.stringify(a) !== JSON.stringify(was.artist)) {
    if (isLocal(a.photo)) a.photo = (await upload(await toBlob(a.photo))).thumb;
    const { error } = await c.from('artists').update({ name: a.name, discipline: a.discipline || null, city: a.city || null, statement: a.statement || null, bio: a.bio || null, photo: a.photo || null, link: a.link || null }).eq('id', user.id);
    if (error) throw error;
  }
  // works: new and changed ones written (images uploaded first), removed ones deleted, the order kept
  const old = new Map(was.works.map(w => [w.id, JSON.stringify(w)]));
  for (const [i, w] of S.works.entries()) {
    if (!/^[0-9a-f-]{36}$/.test(w.id)) w.id = crypto.randomUUID();
    if (old.get(w.id) === JSON.stringify(w) && i === was.works.findIndex(x => x.id === w.id)) continue;
    if (isLocal(w.image) || isLocal(w.thumb)) Object.assign(w, await upload(await toBlob(isLocal(w.image) ? w.image : w.thumb)));
    const row = { id: w.id, artist_id: user.id, title: w.title || 'Untitled', year: w.year || null, medium: w.medium || null, width: +w.width || null, height: +w.height || null,
      depth: +w.depth || null, image: w.image, thumb: w.thumb || null, source: w.source || null, position: i };
    const { error } = await c.from('works').upsert(row);
    if (error) throw error;
  }
  const gone = was.works.filter(w => !S.works.some(x => x.id === w.id)).map(w => w.id);
  if (gone.length) { const { error } = await c.from('works').delete().in('id', gone); if (error) throw error; }
  // exhibitions designed here: the works go with them as they are now (title, image, size), so a show reads alone
  for (const v of S.virtual || []) {
    if (!/^[0-9a-f-]{36}$/.test(v.id)) v.id = crypto.randomUUID();
    const prev = (was.virtual || []).find(x => x.id === v.id);
    if (prev && JSON.stringify(prev) === JSON.stringify(v)) continue;
    const works = v.works.map(id => S.works.find(w => w.id === id)).filter(Boolean)
      .map(w => ({ id: w.id, title: w.title, image: w.image, thumb: w.thumb, width: +w.width || null, height: +w.height || null, year: w.year, medium: w.medium }));
    const { error } = await c.from('virtual_shows').upsert({ id: v.id, owner_id: user.id, kind: 'artist', title: v.title || 'Untitled', room: v.room, paint: v.paint || null,
      centre: +v.centre || 150, text: v.text || null, works, status: v.status === 'published' ? 'published' : 'draft', slug: v.slug || null });
    if (error) throw error;
  }
  const goneV = (was.virtual || []).filter(v => !(S.virtual || []).some(x => x.id === v.id)).map(v => v.id);
  if (goneV.length) { const { error } = await c.from('virtual_shows').delete().in('id', goneV); if (error) throw error; }
  last = JSON.stringify(S);
}

// --- bringing work in -------------------------------------------------------------------------------------------------
// a website or a shared Drive folder, read by Open Studio's server function (a browser may not read another site)
export async function find(kind, url) {
  const { token } = await session();
  const r = await fetch(FN, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, url }) });
  const d = await r.json().catch(() => ({ error: 'The import service didn’t answer.' }));
  if (!r.ok || d.error) throw new Error(d.error || 'That didn’t work.');
  return d;
}
// an image from elsewhere, passed through the same function
export async function fetchImage(url) {
  const { token } = await session();
  const r = await fetch(`${FN}?img=${encodeURIComponent(url)}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error('The image couldn’t be fetched');
  return r.blob();
}
// Instagram: the artist's own export ("Download your information", JSON). Its posts list each image and caption.
export async function fromInstagramZip(file) {
  if (!window.JSZip) await new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'vendor/jszip/jszip.min.js'; s.onload = ok; s.onerror = no; document.head.append(s); });
  const zip = await window.JSZip.loadAsync(file);
  const fix = s => { try { return decodeURIComponent(escape(s)); } catch { return s; } };        // (its text is double-encoded)
  const items = [], seen = new Set();
  const lists = Object.keys(zip.files).filter(n => /posts_\d+\.json$|content\/posts.*\.json$/i.test(n));
  for (const n of lists) {
    let data; try { data = JSON.parse(await zip.files[n].async('string')); } catch { continue; }
    for (const post of Array.isArray(data) ? data : data.ig_posts || []) {
      const caption = fix(post.title || (post.media && post.media[0] && post.media[0].title) || '');
      for (const m of post.media || []) {
        if (!/\.(jpe?g|png|webp|heic)$/i.test(m.uri || '') || seen.has(m.uri)) continue;
        seen.add(m.uri);
        const f = zip.file(m.uri) || zip.file(Object.keys(zip.files).find(k => k.endsWith(m.uri)) || '');
        if (f) items.push({ title: caption.split('\n')[0].split(/\s+[—–-]\s+|,\s/)[0].slice(0, 80), caption, size: (caption.match(/\d+(?:\.\d+)?\s*[x×X]\s*\d+(?:\.\d+)?/) || [''])[0], year: m.creation_timestamp ? String(new Date(m.creation_timestamp * 1000).getFullYear()) : '', blob: f, source: 'instagram' });
      }
    }
  }
  // an export without the posts list (or in its HTML form): every image in its posts folder
  if (!items.length) for (const n of Object.keys(zip.files).filter(k => /media\/posts\/.+\.(jpe?g|png|webp)$/i.test(k))) items.push({ title: '', caption: '', blob: zip.file(n), source: 'instagram' });
  for (const it of items) { const b = await it.blob.async('blob'); it.blob = b; it.preview = URL.createObjectURL(b); }
  return items;
}
