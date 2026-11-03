// Open Studio: test accounts, for the control room. The people who run Open Studio try the app as someone new by
// signing up with a "+" address of the app's mailbox (ooopenstudio+t1@gmail.com: the code arrives in the same inbox).
//   POST { action: 'list' }          the test accounts: every account whose address has a "+"
//   POST { action: 'delete', id }    one of them, with all it made (profile, artist page, works, their images)
// Only for admins (public.is_admin, asked with the caller's own sign-in); only "+" addresses can be deleted here.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SB = Deno.env.get('SUPABASE_URL')!, ANON = Deno.env.get('SUPABASE_ANON_KEY')!, SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const svc = (path: string, init: RequestInit = {}) => fetch(`${SB}${path}`, { ...init, headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json', ...(init.headers || {}) } });
const isTest = (email: string) => /\+[^@]*@/.test(email || '');

async function admin(req: Request) {
  const auth = req.headers.get('authorization') || '';
  const r = await fetch(`${SB}/rest/v1/rpc/is_admin`, { method: 'POST', headers: { apikey: ANON, Authorization: auth, 'Content-Type': 'application/json' }, body: '{}' });
  return r.ok && (await r.json()) === true;
}

async function users() {
  const out = [];
  for (let page = 1; page < 20; page++) {
    const r = await svc(`/auth/v1/admin/users?page=${page}&per_page=200`);
    const d = await r.json(); const list = d.users || [];
    out.push(...list); if (list.length < 200) break;
  }
  return out;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST { action }' }, 405);
  if (!(await admin(req))) return json({ error: 'Only for the people who run Open Studio.' }, 403);
  const { action, id } = await req.json().catch(() => ({}));
  if (action === 'list') {
    const all = (await users()).filter((u: any) => isTest(u.email));
    const ids = all.map((u: any) => u.id).join(',');
    const [profiles, artists] = ids ? await Promise.all([
      svc(`/rest/v1/profiles?id=in.(${ids})&select=id,first_name,last_name,role`).then(r => r.json()),
      svc(`/rest/v1/artists?id=in.(${ids})&select=id,status`).then(r => r.json()),
    ]) : [[], []];
    return json({ accounts: all.map((u: any) => {
      const p = profiles.find((x: any) => x.id === u.id) || {}, a = artists.find((x: any) => x.id === u.id);
      return { id: u.id, email: u.email, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at, name: [p.first_name, p.last_name].filter(Boolean).join(' '), role: p.role || null, artist: a ? a.status : null };
    }).sort((a: any, b: any) => b.created_at.localeCompare(a.created_at)) });
  }
  if (action === 'delete') {
    const r = await svc(`/auth/v1/admin/users/${encodeURIComponent(id)}`);
    if (!r.ok) return json({ error: 'No such account.' }, 404);
    const u = await r.json();
    if (!isTest(u.email)) return json({ error: 'Only test accounts (an address with “+”) can be deleted here.' }, 400);
    // their images first (the bucket keeps a folder per account), then the rows, then the account
    const files = await svc(`/storage/v1/object/list/works`, { method: 'POST', body: JSON.stringify({ prefix: `${u.id}/`, limit: 1000 }) }).then(r => r.ok ? r.json() : []);
    if (files.length) await svc(`/storage/v1/object/works`, { method: 'DELETE', body: JSON.stringify({ prefixes: files.map((f: any) => `${u.id}/${f.name}`) }) });
    for (const t of ['virtual_shows?owner_id', 'works?artist_id', 'instagram_links?user_id', 'change_requests?by_user', 'artists?id', 'profiles?id'])
      await svc(`/rest/v1/${t}=eq.${u.id}`, { method: 'DELETE' });
    const d = await svc(`/auth/v1/admin/users/${u.id}`, { method: 'DELETE' });
    return d.ok ? json({ deleted: u.email }) : json({ error: 'The account couldn’t be deleted.' }, 502);
  }
  return json({ error: 'Unknown action.' }, 400);
});
