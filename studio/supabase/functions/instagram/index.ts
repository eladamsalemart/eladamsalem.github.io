// Open Studio: an artist connects their Instagram, and chooses posts to bring into their studio.
// Meta's app "Open Studio" (978863398102531) uses Facebook Login for Business: the artist signs in with Facebook and
// picks their Instagram (professional, linked to a Page); Open Studio may then read its posts (instagram_basic).
//   POST { action: 'start', back }   a signed-in artist: the address of Facebook's sign-in, to open
//   GET  ?code&state                 Facebook sends the artist back here; the key is kept, the artist goes back to the app
//   POST { action: 'status' }        connected or not, and as whom
//   POST { action: 'media' }         the posts' pictures, as the import page lists them ({ image, title, caption, year })
//   POST { action: 'disconnect' }    forget the key
// Deployed without the gateway's sign-in check (Facebook's return carries no sign-in): POSTs check it here.
// The key lives in public.instagram_links, which only this function (service role) reads.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const APP_ID = Deno.env.get('INSTAGRAM_APP_ID') || '';
const SECRET = Deno.env.get('INSTAGRAM_APP_SECRET') || '';
const CONFIG = Deno.env.get('INSTAGRAM_CONFIG_ID') || '';
const SB = Deno.env.get('SUPABASE_URL')!, ANON = Deno.env.get('SUPABASE_ANON_KEY')!, SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GRAPH = 'https://graph.facebook.com/v23.0';
const SELF = `${SB}/functions/v1/instagram`;
const APP = 'https://eladamsalem.com/open-studio/';
// where an artist may be sent back to: the live app, or a copy on this computer while it is being made
const backOk = (u: string) => /^https:\/\/eladamsalem\.com\/open-studio\/$|^http:\/\/(localhost|127\.0\.0\.1):\d+\/studio\/app\/$/.test(u);

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const home = (back: string, ig: string) => new Response(null, { status: 302, headers: { Location: `${back}?ig=${ig}#/studio/import` } });

// --- the state Facebook carries there and back: who asked, where to return, until when; signed with the app secret ---
const b64u = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function sign(s: string) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64u(new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(s))));
}
async function seal(o: object) { const p = b64u(new TextEncoder().encode(JSON.stringify(o))); return `${p}.${await sign(p)}`; }
async function open(state: string) {
  const [p, s] = state.split('.');
  if (!p || !s || s !== await sign(p)) return null;
  try { const o = JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '/'))); return o.e > Date.now() ? o : null; } catch { return null; }
}

// --- the database, as the service role --------------------------------------------------------------------------------
const db = (path: string, init: RequestInit = {}) => fetch(`${SB}/rest/v1/${path}`, { ...init,
  headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json', ...(init.headers || {}) } });
async function link(uid: string) {
  const r = await db(`instagram_links?user_id=eq.${uid}&select=ig_id,username,token,expires_at`);
  const [row] = r.ok ? await r.json() : [];
  return row || null;
}
async function who(req: Request) {
  const auth = req.headers.get('authorization') || '';
  if (!/^Bearer\s+\S+/.test(auth)) return null;
  const r = await fetch(`${SB}/auth/v1/user`, { headers: { apikey: ANON, Authorization: auth } });
  return r.ok ? (await r.json()).id as string : null;
}
const graph = async (path: string, params: Record<string, string>) => {
  const r = await fetch(`${GRAPH}/${path}?${new URLSearchParams(params)}`);
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.error) throw new Error(d.error?.message || `Facebook answered ${r.status}`);
  return d;
};

// Facebook's return: the code becomes a key (exchanged for one that lasts about 60 days), the Instagram account is found
async function callback(url: URL) {
  const st = await open(url.searchParams.get('state') || '');
  if (!st || !backOk(st.b)) return new Response('This link has expired. Go back to Open Studio and connect Instagram again.', { status: 400 });
  if (url.searchParams.get('error') || !url.searchParams.get('code')) return home(st.b, 'cancelled');
  try {
    const short = await graph('oauth/access_token', { client_id: APP_ID, client_secret: SECRET, redirect_uri: SELF, code: url.searchParams.get('code')! });
    const long = await graph('oauth/access_token', { grant_type: 'fb_exchange_token', client_id: APP_ID, client_secret: SECRET, fb_exchange_token: short.access_token }).catch(() => short);
    const token = long.access_token as string;
    const pages = await graph('me/accounts', { fields: 'name,instagram_business_account{id,username}', limit: '100', access_token: token });
    const ig = (pages.data || []).map((p: any) => p.instagram_business_account).find(Boolean);
    if (!ig) return home(st.b, 'noaccount');
    const r = await db('instagram_links', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify({
      user_id: st.u, ig_id: ig.id, username: ig.username || null, token,
      expires_at: long.expires_in ? new Date(Date.now() + long.expires_in * 1000).toISOString() : null, updated_at: new Date().toISOString() }) });
    if (!r.ok) throw new Error(`database ${r.status}`);
    return home(st.b, 'ok');
  } catch (e) { console.error('instagram callback', e); return home(st.b, 'error'); }
}

// the posts: every picture (a carousel's each), the caption's first line as its title, up to 200 posts
async function media(row: { ig_id: string; token: string }) {
  const items: { image: string; title: string; caption: string; year: string; link: string }[] = [];
  let after = '';
  for (let page = 0; page < 4; page++) {
    const d = await graph(`${row.ig_id}/media`, { fields: 'caption,media_type,media_url,permalink,timestamp,children{media_type,media_url}', limit: '50', access_token: row.token, ...(after ? { after } : {}) });
    for (const p of d.data || []) {
      const caption = String(p.caption || '').trim();
      const title = caption.split('\n')[0].split(/\s+[—–-]\s+|,\s|#/)[0].trim().slice(0, 80);
      const pics = p.media_type === 'CAROUSEL_ALBUM' ? (p.children?.data || []).filter((c: any) => c.media_type === 'IMAGE') : p.media_type === 'IMAGE' ? [p] : [];
      for (const c of pics) if (c.media_url) items.push({ image: c.media_url, title, caption, year: p.timestamp ? String(new Date(p.timestamp).getFullYear()) : '', link: p.permalink || '' });
    }
    after = d.paging?.next ? d.paging?.cursors?.after || '' : '';
    if (!after) break;
  }
  return items;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const url = new URL(req.url);
  if (req.method === 'GET') return url.searchParams.has('state') ? callback(url) : json({ error: 'POST { action }' }, 405);
  if (req.method !== 'POST') return json({ error: 'POST { action }' }, 405);
  if (!APP_ID || !SECRET) return json({ error: 'Instagram isn’t set up on the server yet.' }, 503);
  const uid = await who(req); if (!uid) return json({ error: 'Sign in first.' }, 401);
  const { action, back } = await req.json().catch(() => ({}));
  try {
    if (action === 'start') {
      if (!CONFIG) return json({ error: 'Instagram isn’t set up on the server yet.' }, 503);
      const b = typeof back === 'string' && backOk(back) ? back : APP;
      const state = await seal({ u: uid, b, e: Date.now() + 15 * 60_000 });
      return json({ url: `https://www.facebook.com/v23.0/dialog/oauth?${new URLSearchParams({ client_id: APP_ID, redirect_uri: SELF, config_id: CONFIG, response_type: 'code', state })}` });
    }
    const row = await link(uid);
    if (action === 'status') return json(row ? { connected: true, username: row.username } : { connected: false });
    if (action === 'disconnect') { await db(`instagram_links?user_id=eq.${uid}`, { method: 'DELETE' }); return json({ connected: false }); }
    if (action === 'media') {
      if (!row) return json({ error: 'Connect Instagram first.' }, 409);
      return json({ source: 'Instagram', username: row.username, items: await media(row) });
    }
    return json({ error: 'Unknown action.' }, 400);
  } catch (e) {
    console.error('instagram', action, e);
    const expired = /expired|session|validat|OAuth/i.test(String((e as Error).message));
    return json({ error: expired ? 'Instagram asks you to connect again.' : 'Instagram didn’t answer. Try again in a moment.', reconnect: expired }, 502);
  }
});
