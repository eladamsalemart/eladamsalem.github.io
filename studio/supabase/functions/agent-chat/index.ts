// Open Studio's agent in the cloud: the owner talks with it in the control room (from the phone too), in Hebrew. It knows the app, its
// vision and its rules, asks questions and sharpens, and when a change is clear it files it as a precise request (public.change_requests),
// which the "Owner requests" workflow turns into an issue for the Claude sessions that build. It does not edit code itself.
//   POST { messages: [{ role: 'user' | 'assistant', content: string }, ...] }  ->  { reply, filed: [string] }
// Only for admins (public.is_admin, asked with the caller's own sign-in). The key: the function secret ANTHROPIC_API_KEY
// (set by the "Supabase functions" workflow from the GitHub secret of that name).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SB = Deno.env.get('SUPABASE_URL')!, ANON = Deno.env.get('SUPABASE_ANON_KEY')!, KEY = Deno.env.get('ANTHROPIC_API_KEY') || '';
const MODEL = 'claude-sonnet-5-5';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const SYSTEM = `You are Open Studio's own agent, talking with its owner, Elad Amsalem (an artist who is building the app), in the app's control room, often by voice and from his phone.
Answer in Hebrew, short and plain, no jargon, and ask ONE short clarifying question when something is unclear before you conclude. Never invent facts about the app: if you do not know, say so.

What Open Studio is: an app that opens the art world to artists and art lovers. An artist makes a page (works, About, CV), real past exhibitions, and virtual exhibitions (a room drawn in the app, works hung on its walls, walked on the phone). Art lovers discover artists and exhibitions, above all REAL exhibitions in the world (not an endless grid of images), through the map, Shows and Home. Money comes from artists, art schools and galleries, never from art lovers. Art is shown with respect: no likes, no feed, no training on the works.
How it works: every artist page and every virtual exhibition is approved by the owner in the control room before it goes live (send for review -> the control room queue -> approve; he can walk through a waiting exhibition). The control room is for the computer. The museum is edited ONLY on the Desk (on the computer): add and remove its exhibitions and spaces; it is one building ("Under One Sky": a central hall under skylights, spaces for exhibitions, history sections such as the Renaissance, sculpture, a tappable plan with a list of exhibitions). Artists edit their own exhibitions on their own pages; the museum may take a copy of an artist's exhibition, the original stays the artist's. Nothing is ever deleted on a whim: things are hidden and can come back.
Your job: talk about the app: ideas, problems, changes and improvements. When he asks for a change, sharpen it (what exactly, where, for whom, what should happen) and then, when it is clear, call the tool submit_request with a complete, self-contained Hebrew-or-English brief that a developer who has never seen this conversation can build from (include the screens, the expected behaviour, and what must not change). Tell him honestly that you do not edit the code yourself: the request goes to the Claude sessions that build it, and he can see the result in the app. Never file a request he has not confirmed ("should I file this?" first, unless he clearly said to do it). Home's look is fixed unless he asks in words. Do not ask him for passwords or keys.`;

const TOOLS = [{
  name: 'submit_request',
  description: 'File a clear, confirmed change or improvement request for the developers (Claude sessions). The text must be self-contained.',
  input_schema: { type: 'object', properties: { title: { type: 'string', description: 'One short line' }, details: { type: 'string', description: 'The full brief: what, where, expected behaviour, what must not change' } }, required: ['title', 'details'] },
}];

async function admin(req: Request) {
  const auth = req.headers.get('authorization') || '';
  const r = await fetch(`${SB}/rest/v1/rpc/is_admin`, { method: 'POST', headers: { apikey: ANON, Authorization: auth, 'Content-Type': 'application/json' }, body: '{}' });
  return r.ok && (await r.json()) === true;
}

async function claude(messages: unknown[]) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: { 'x-api-key': KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: 1500, system: SYSTEM, tools: TOOLS, messages }),
  });
  if (!r.ok) throw new Error(`The model answered ${r.status}`);
  return r.json();
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'POST { messages }' }, 405);
  if (!(await admin(req))) return json({ error: 'Only for the people who run Open Studio.' }, 403);
  if (!KEY) return json({ error: 'no_key' }, 503);
  const body = await req.json().catch(() => ({}));
  const history = (Array.isArray(body.messages) ? body.messages : []).slice(-20)
    .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 6000) }));
  if (!history.length || history[history.length - 1].role !== 'user') return json({ error: 'The last message must be the owner’s.' }, 400);
  const auth = req.headers.get('authorization') || '', filed: string[] = [];
  try {
    const msgs: any[] = [...history];
    for (let i = 0; i < 3; i++) {
      const out = await claude(msgs);
      const uses = (out.content || []).filter((c: any) => c.type === 'tool_use');
      if (!uses.length) return json({ reply: (out.content || []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n').trim(), filed });
      msgs.push({ role: 'assistant', content: out.content });
      const results = [];
      for (const u of uses) {
        const t = String(u.input?.title || '').slice(0, 200), d = String(u.input?.details || '').slice(0, 8000);
        const r = await fetch(`${SB}/rest/v1/change_requests`, { method: 'POST', headers: { apikey: ANON, Authorization: auth, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ body: `[agent] ${t}\n\n${d}` }) });
        if (r.ok) filed.push(t);
        results.push({ type: 'tool_result', tool_use_id: u.id, content: r.ok ? 'Filed. The developers will see it.' : 'Could not be filed.' });
      }
      msgs.push({ role: 'user', content: results });
    }
    return json({ reply: 'נרשם.', filed });
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 502);
  }
});
