// Open Studio: bring an artist's images in from where they already are.
//   POST { kind: 'site', url }   a website: the images on the page and on its gallery pages (same site, a few)
//   POST { kind: 'drive', url }  a Google Drive folder shared "anyone with the link": its images
//   GET  ?img=<url>              one image, passed through (the browser may not read another site's image itself)
// Only for signed-in people (the gateway checks the token). Never reaches private addresses.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const UA = 'Mozilla/5.0 (compatible; OpenStudioImport/1.0; +https://eladamsalem.com/open-studio/)';

function safe(u: string): URL | null {
  try {
    const x = new URL(u);
    if (!/^https?:$/.test(x.protocol)) return null;
    const h = x.hostname.toLowerCase();
    if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || /^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h) || h.includes(':') || /^\d+$/.test(h)) return null;
    return x;
  } catch { return null; }
}
async function get(u: URL, max = 6_000_000, accept = 'text/html,application/xhtml+xml'): Promise<Response | null> {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), 12000);
  try {
    const r = await fetch(u, { headers: { 'User-Agent': UA, Accept: accept }, redirect: 'follow', signal: c.signal });
    const n = +(r.headers.get('content-length') || 0);
    if (!r.ok || n > max) return null;
    return r;
  } catch { return null; } finally { clearTimeout(t); }
}
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#039;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d)).trim();
const attr = (tag: string, name: string) => { const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i')); return m ? decode(m[2] ?? m[3] ?? m[4] ?? '') : ''; };
const NOT_ART = /(logo|icon|favicon|sprite|avatar|badge|button|banner|placeholder|spinner|loader|pixel|tracking|emoji|arrow|social|facebook|instagram|twitter|whatsapp|payment|\.svg|\.gif|data:)/i;
const nameOf = (u: string) => decodeURIComponent(u.split('?')[0].split('/').pop() || '').replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').replace(/\b\d{6,}\b/g, '').trim();

// the biggest image a srcset offers
function best(srcset: string) {
  let top = '', w = 0;
  for (const part of srcset.split(',')) { const [u, d] = part.trim().split(/\s+/); const n = parseFloat(d || '1'); if (u && n >= w) { w = n; top = u; } }
  return top;
}
function images(html: string, base: URL) {
  const out = new Map<string, { image: string; title: string }>();
  const add = (u: string, title = '') => {
    if (!u || NOT_ART.test(u)) return;
    let abs: string; try { abs = new URL(u, base).href; } catch { return; }
    if (!/\.(jpe?g|png|webp|avif)(\?|$)/i.test(abs) && !/(googleusercontent|cdninstagram|wixstatic|squarespace-cdn|images\.|\/image\/|\/media\/)/i.test(abs)) return;
    const k = abs.replace(/[?#].*$/, '').replace(/[-_](\d{2,4}x\d{2,4}|scaled|small|thumb|medium)(?=\.\w+$)/i, '');
    if (!out.has(k) || (title && !out.get(k)!.title)) out.set(k, { image: abs, title: title || out.get(k)?.title || '' });
  };
  for (const m of html.matchAll(/<meta[^>]+>/gi)) if (/property\s*=\s*["']og:image/i.test(m[0])) add(attr(m[0], 'content'));
  // an image, its caption: alt, title, or the figure's caption
  for (const m of html.matchAll(/<figure[\s\S]*?<\/figure>|<img[^>]+>/gi)) {
    const block = m[0], img = block.match(/<img[^>]+>/i)?.[0] || '';
    if (!img) continue;
    const cap = block.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i)?.[1]?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ') || '';
    const u = best(attr(img, 'srcset') || attr(img, 'data-srcset')) || attr(img, 'data-src') || attr(img, 'data-lazy-src') || attr(img, 'src');
    add(u, decode(cap) || attr(img, 'alt') || attr(img, 'title'));
  }
  for (const m of html.matchAll(/<a[^>]+href\s*=\s*["']([^"']+\.(?:jpe?g|png|webp))["'][^>]*>/gi)) add(m[1], attr(m[0], 'title'));
  // sites drawn by a script (Wix and the like) keep their images' addresses in the page's data
  for (const m of html.replace(/\\\//g, '/').matchAll(/https?:\/\/[^\s"'<>()\\]+?\.(?:jpe?g|png|webp)(?:\?[^\s"'<>()\\]*)?/gi)) add(m[0]);
  return [...out.values()];
}
// pages of the same site that look like where the work is
function galleryLinks(html: string, base: URL) {
  const seen = new Set<string>();
  for (const m of html.matchAll(/<a[^>]+href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    let u: URL; try { u = new URL(m[1], base); } catch { continue; }
    if (u.hostname !== base.hostname || u.href === base.href) continue;
    if (/(work|portfolio|gallery|painting|series|project|archive|exhibition|collection|art|drawing|sculpture|עבודות|גלריה)/i.test(u.pathname + ' ' + m[2])) seen.add(u.href.replace(/#.*$/, ''));
    if (seen.size >= 8) break;
  }
  return [...seen];
}

// what a site's own platform lists, when it says: works with their details (an Open Studio site's
// content/works.json), WordPress's media library, Squarespace's and Shopify's catalogues
async function platform(base: URL): Promise<{ image: string; title: string; year?: string; size?: string; medium?: string }[]> {
  const tryJson = async (path: string) => { const u = safe(new URL(path, base).href); const r = u && await get(u, 6_000_000, 'application/json'); if (!r) return null; try { return await r.json(); } catch { return null; } };
  const os = await tryJson('/content/works.json');
  if (Array.isArray(os) && os.length && os[0].image) return os.map((w: any) => ({ image: new URL(w.image, base).href, title: w.title || '', year: String(w.year || ''), size: w.size || (String(w.description || '').match(/\d+(?:\.\d+)?\s*[x×X]\s*\d+(?:\.\d+)?/) || [''])[0], medium: String(w.description || '').split('\n')[0].trim() || w.tech || '' }));
  const wp = await tryJson('/wp-json/wp/v2/media?per_page=100&media_type=image');
  if (Array.isArray(wp) && wp.length) return wp.map((m: any) => ({ image: m.source_url, title: decode((m.title && m.title.rendered) || m.alt_text || '') }));
  const sq = await tryJson('/?format=json');
  const sqItems = sq && (sq.items || (sq.collection && sq.collection.items));
  if (Array.isArray(sqItems) && sqItems.length) return sqItems.filter((i: any) => i.assetUrl).map((i: any) => ({ image: i.assetUrl, title: i.title || '' }));
  const sh = await tryJson('/products.json?limit=250');
  if (sh && Array.isArray(sh.products) && sh.products.length) return sh.products.flatMap((p: any) => (p.images || []).slice(0, 1).map((im: any) => ({ image: im.src, title: p.title || '' })));
  return [];
}

async function site(url: string) {
  const start = safe(url.includes('://') ? url : `https://${url}`);
  if (!start) return { error: 'That address can’t be opened.' };
  const r = await get(start); if (!r) return { error: 'The site didn’t answer.' };
  const html = await r.text(), base = new URL(r.url || start.href);
  const listed = await platform(base);
  if (listed.length) return { source: base.hostname, title: decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || ''), pages: 1, items: listed.slice(0, 300) };
  const items = images(html, base), pages = galleryLinks(html, base);
  const more = await Promise.all(pages.map(async p => { const x = safe(p); const q = x && await get(x); return q ? images(await q.text(), new URL(q.url || p)) : []; }));
  const all = new Map<string, { image: string; title: string; page?: string }>();
  for (const it of [...items, ...more.flat()]) { const k = it.image.replace(/[?#].*$/, ''); if (!all.has(k)) all.set(k, it); }
  const title = decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
  return { source: base.hostname, title, pages: 1 + pages.length, items: [...all.values()].slice(0, 200).map(x => ({ ...x, title: x.title || nameOf(x.image) })) };
}

async function drive(url: string) {
  const id = url.match(/folders\/([\w-]{10,})/)?.[1] || url.match(/[?&]id=([\w-]{10,})/)?.[1];
  if (!id) return { error: 'That isn’t a Google Drive folder link.' };
  const r = await get(new URL(`https://drive.google.com/embeddedfolderview?id=${id}#grid`));
  if (!r) return { error: 'The folder couldn’t be opened: share it as “Anyone with the link”.' };
  const html = await r.text(), items = [];
  for (const m of html.matchAll(/<div class="flip-entry" id="entry-([\w-]+)"[\s\S]*?<div class="flip-entry-title">([\s\S]*?)<\/div>/g)) {
    const name = decode(m[2]);
    if (!/\.(jpe?g|png|webp|heic|tiff?)$/i.test(name)) continue;
    items.push({ image: `https://lh3.googleusercontent.com/d/${m[1]}=w2600`, title: name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').trim() });
  }
  if (!items.length) return { error: 'No images in that folder (or it isn’t shared as “Anyone with the link”).' };
  return { source: 'Google Drive', title: decode(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] || ''), items };
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const q = new URL(req.url).searchParams.get('img');
  if (req.method === 'GET' && q) {
    const u = safe(q); if (!u) return json({ error: 'bad address' }, 400);
    const r = await get(u, 25_000_000, 'image/avif,image/webp,image/jpeg,image/png,*/*;q=0.5');
    const type = r?.headers.get('content-type') || '';
    if (!r || !/^image\/(jpeg|png|webp|avif)/.test(type)) return json({ error: 'not an image' }, 415);
    return new Response(r.body, { headers: { ...CORS, 'Content-Type': type, 'Cache-Control': 'private, max-age=600' } });
  }
  if (req.method !== 'POST') return json({ error: 'POST { kind, url }' }, 405);
  const { kind, url } = await req.json().catch(() => ({}));
  if (typeof url !== 'string' || url.length > 2000) return json({ error: 'A link, please.' }, 400);
  const out = kind === 'drive' ? await drive(url) : await site(url);
  return json(out, 'error' in out ? 422 : 200);
});
