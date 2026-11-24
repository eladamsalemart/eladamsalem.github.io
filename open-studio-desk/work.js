// עבודה: what each Open Studio session and helper is doing, what finished, and what waits for the owner. It reads a small
// file the sessions write themselves, studio/health/work.json ({ tasks: [{ task, session, id, state, updated, needs_owner }] },
// state: working | waiting | done | paused), from the repository's studio branch (locally: the file beside it). Waiting on
// the owner first, then working, paused, done. Same look as בדיקות לילה and טלפונים. Hebrew; the tasks stay as written.
import { api } from './data.js';
const SRC = new URLSearchParams(location.search).get('work') || (location.pathname.startsWith('/studio/') ? '/studio/health/work.json'
  : 'https://raw.githubusercontent.com/eladamsalemart/eladamsalem.github.io/studio/studio/health/work.json');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const STATE = { working: ['בעבודה', 'yellow'], waiting: ['מחכה', 'red'], paused: ['בהמתנה', 'grey'], done: ['הסתיים', 'green'] };
const ORDER = t => t.needs_owner && t.state !== 'done' ? 0 : { working: 1, waiting: 2, paused: 3, done: 4 }[t.state] ?? 5;
const ago = t => { if (!t) return ''; const h = (Date.now() - new Date(t)) / 36e5; return h < 1 ? 'לפני פחות משעה' : h < 24 ? `לפני ${Math.floor(h)} שעות` : `לפני ${Math.floor(h / 24)} ימים`; };
const CSS = `.wk-l{flex:none;width:14px;height:14px;border-radius:50%;margin-top:4px}.wk-l.red{background:var(--bad)}.wk-l.yellow{background:#C99212}.wk-l.green{background:var(--ok)}.wk-l.grey{background:var(--line)}
.wk-f{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:start;padding:10px 0;border-bottom:1px solid var(--line)}.wk-f:last-child{border-bottom:0}
.wk-f .d{font-size:13px;color:var(--muted)}.wk-f .d bdi{direction:ltr}.wk-f b{font-weight:500}`;

export async function work(ctx) {
  ctx.page('work', 'עבודה', 'המשימות שלך, שיחה עם הסוכן, ומה הסוכנים עושים עכשיו', '<div class="wk-grid"><div id="wk-tasks"></div><aside id="wk-chat" aria-label="שיחה עם הסוכן"></aside></div><section class="sec" style="margin-top:12px"><h2>מה הסוכנים עושים</h2><div id="wk"><p class="muted">טוען…</p></div></section>');
  if (!document.getElementById('wk-css')) { const st = document.createElement('style'); st.id = 'wk-css'; st.textContent = CSS + CSS2; document.head.append(st); }
  tasks(ctx); chat(ctx); agents();
}
async function agents() {
  const el = document.getElementById('wk');
  let j;
  try { j = await fetch(SRC + (SRC.includes('?') ? '&' : '?') + 't=' + Math.floor(Date.now() / 60000), { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  catch (e) { el.innerHTML = `<p class="status no">קובץ העבודה לא נקרא (${esc(e.message)}).</p>`; return; }
  const tasks = (j.tasks || []).slice().sort((a, b) => ORDER(a) - ORDER(b) || String(b.updated || '').localeCompare(String(a.updated || '')));
  const mine = tasks.filter(t => t.needs_owner && t.state !== 'done'), n = s => tasks.filter(t => t.state === s && !(t.needs_owner && t.state !== 'done')).length;
  const row = t => { const [label, light] = STATE[t.state] || [t.state, 'grey'];
    return `<div class="wk-f"><i class="wk-l ${t.needs_owner && t.state !== 'done' ? 'red' : light}" aria-hidden="true"></i>
      <div><b dir="auto">${esc(t.task)}</b><div class="d"><bdi>${esc(t.session || '')}</bdi>${t.updated ? ` · עודכן ${ago(t.updated)}` : ''}</div></div>
      <span class="chip ${t.needs_owner && t.state !== 'done' ? 'no' : t.state === 'done' ? 'ok' : ''}">${t.needs_owner && t.state !== 'done' ? 'מחכה לך' : label}</span></div>`; };
  const part = (title, list) => list.length ? `<section class="sec"><h2>${title}</h2><div>${list.map(row).join('')}</div></section>` : '';
  el.innerHTML = `<section class="sec"><div class="chips" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
      <span class="chip" style="color:var(--bad)">${mine.length} מחכים לך</span><span class="chip" style="color:var(--warn)">${n('working')} בעבודה</span>
      <span class="chip">${n('paused') + n('waiting')} בהמתנה</span><span class="chip ok">${n('done')} הסתיימו</span></div>
    <p class="muted small">כל סשן כותב כאן את השורה שלו כשהוא מתחיל, מסיים או צריך אותך${j.updated ? ` · עודכן לאחרונה ${ago(j.updated)}` : ''}.</p></section>
    ${part('מחכה לך', mine)}
    ${part('בעבודה', tasks.filter(t => t.state === 'working' && !mine.includes(t)))}
    ${part('בהמתנה', tasks.filter(t => (t.state === 'paused' || t.state === 'waiting') && !mine.includes(t)))}
    ${part('הסתיים', tasks.filter(t => t.state === 'done'))}`;
}

// --- the owner's tasks: work_items + work_notes (Supabase, admin only; in ?guest, in memory) ---------------------------------
const ST = { waiting_owner: 'מחכה לך', in_progress: 'בעבודה', planned: 'מתוכנן', new: 'חדש', done: 'הסתיים' };
const ST_ORDER = ['waiting_owner', 'in_progress', 'planned', 'new', 'done'];
const PR = { 1: 'דחוף', 2: 'רגיל', 3: 'אחר כך' };
const AREA = { museum: 'מוזיאון', art: 'אמנות', tours: 'סיורים', app: 'אפליקציה', other: 'אחר' };
const opts = (o, cur) => Object.entries(o).map(([k, v]) => `<option value="${k}"${String(k) === String(cur) ? ' selected' : ''}>${v}</option>`).join('');
const when = t => t ? new Date(t).toLocaleString('he-IL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
const CSS2 = `.wk-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(300px,380px);gap:24px;align-items:start}@media(max-width:900px){.wk-grid{grid-template-columns:1fr}}
.wk-new{display:grid;gap:10px;background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:14px}.wk-new .two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.wk-new select,.wk-it select{min-height:46px;border:1px solid var(--line);border-radius:12px;padding:0 10px;background:#fff;width:100%}
.wk-it{background:var(--card);border:1px solid var(--line);border-radius:12px;margin-bottom:8px}.wk-it>summary{display:flex;gap:10px;align-items:center;min-height:52px;padding:8px 14px;cursor:pointer;list-style:none}
.wk-it>summary::-webkit-details-marker{display:none}.wk-it>summary b{flex:1;min-width:0;font-weight:500}.wk-it[open]>summary{border-bottom:1px solid var(--line)}
.wk-p1{border-inline-start:4px solid var(--bad)}.wk-p2{border-inline-start:4px solid var(--line)}.wk-p3{border-inline-start:4px solid var(--soft)}
.wk-body{display:grid;gap:10px;padding:14px}.wk-body .two{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.wk-th{display:grid;gap:8px}.wk-n{padding:8px 12px;border-radius:12px;background:var(--soft);font-size:.92rem;white-space:pre-wrap}.wk-n small{display:block;color:var(--muted);font-size:.78rem;margin-bottom:2px}
.wk-n.lead{background:#E3EEE8;border-inline-start:4px solid var(--accent)}.wk-n.lead small{color:var(--accent);font-weight:600}
.wk-seen{font-size:.78rem;color:var(--accent)}.wk-unseen{font-size:.78rem;color:var(--muted)}
.wk-ch{position:sticky;top:12px;display:grid;grid-template-rows:auto minmax(260px,52vh) auto;gap:10px;background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:14px}
.wk-ch h2{font:500 1.15rem var(--serif);margin:0}.wk-lg{overflow:auto;display:grid;gap:8px;align-content:start;padding:2px}
.wk-m{padding:9px 12px;border-radius:12px;white-space:pre-wrap;font-size:.95rem;max-width:92%}.wk-m.me{background:var(--soft);justify-self:start}.wk-m.ai{background:#E3EEE8;justify-self:end}.wk-m.tool{font-size:.8rem;color:var(--muted);background:none;padding:0}
.wk-op{border:1px solid var(--accent);border-radius:12px;padding:10px 12px;background:#fff;display:grid;gap:6px;font-size:.9rem}.wk-op ul{margin:0;padding-inline-start:18px}.wk-op .acts{display:flex;gap:8px}.wk-op .acts .btn{min-height:40px;padding:0 14px}
.wk-ch form{display:grid;gap:8px}.wk-ch textarea{min-height:64px;border:1px solid var(--line);border-radius:12px;padding:10px 12px;resize:vertical;width:100%}`;

async function tasks(ctx) {
  const el = document.getElementById('wk-tasks'); let items = [], notes = []; const openIds = new Set(); window.__wkReload = null;
  const load = async () => { [items, notes] = await Promise.all([api.workItems(), api.workNotes()]); draw(); };
  const one = it => { const th = notes.filter(n => n.item_id === it.id);
    const seen = it.seen_by_lead_at ? `<span class="wk-seen">המפתח ראה · ${when(it.seen_by_lead_at)}</span>` : `<span class="wk-unseen">עוד לא נראה</span>`;
    return `<details class="wk-it wk-p${it.priority}" data-id="${it.id}"${openIds.has(it.id) ? ' open' : ''}><summary><b dir="auto">${esc(it.title)}</b>${seen}<span class="chip">${AREA[it.area] || ''}</span><span class="chip ${it.priority === 1 ? 'no' : ''}">${PR[it.priority]}</span></summary>
      <div class="wk-body"><label class="field">כותרת<input data-f="title" dir="auto" value="${esc(it.title)}"></label>
        <label class="field">פרטים<textarea data-f="details" dir="auto" rows="3">${esc(it.details)}</textarea></label>
        <div class="two"><label class="field">עדיפות<select data-f="priority">${opts(PR, it.priority)}</select></label><label class="field">סטטוס<select data-f="status">${opts(ST, it.status)}</select></label></div>
        <div><button class="btn" type="button" data-save>שמור שינויים</button></div>
        <div class="wk-th">${th.map(n => `<div class="wk-n ${n.author === 'lead' ? 'lead' : ''}"><small>${n.author === 'lead' ? 'תשובת המפתח הראשי' : 'אתה'} · ${when(n.created_at)}</small><span dir="auto">${esc(n.body)}</span></div>`).join('') || '<p class="muted small">אין עדיין הערות.</p>'}</div>
        <label class="field">הערה חדשה<textarea data-note dir="auto" rows="2" placeholder="כתוב למפתח הראשי על המשימה"></textarea></label>
        <div><button class="btn p" type="button" data-addnote>הוסף הערה</button></div></div></details>`; };
  const draw = () => {
    const sorted = items.slice().sort((a, b) => a.priority - b.priority || String(b.created_at).localeCompare(String(a.created_at)));
    el.innerHTML = `<section class="sec"><h2>משימה חדשה</h2><form class="wk-new" id="wk-form"><label class="field">כותרת<input id="wn-t" dir="auto" required maxlength="300" autocomplete="off"></label>
      <label class="field">פרטים<textarea id="wn-d" dir="auto" rows="3" placeholder="מה צריך להיות, ומתי זה נחשב גמור"></textarea></label>
      <div class="two"><label class="field">עדיפות<select id="wn-p">${opts(PR, 2)}</select></label><label class="field">תחום<select id="wn-a">${opts(AREA, 'other')}</select></label></div>
      <div><button class="btn p" type="submit">הוסף משימה</button></div></form></section>
      <section class="sec"><h2>המשימות שלך</h2>${ST_ORDER.map(s => { const l = sorted.filter(i => i.status === s); return l.length ? `<div><h3 class="small muted" style="margin:0 0 8px">${ST[s]} · ${l.length}</h3>${l.map(one).join('')}</div>` : ''; }).join('') || '<p class="muted">אין משימות עדיין. הוסף למעלה, או ספר לסוכן מה אתה רוצה.</p>'}</section>`;
    el.querySelectorAll('details.wk-it').forEach(d => d.addEventListener('toggle', () => { d.open ? openIds.add(d.dataset.id) : openIds.delete(d.dataset.id); }));
    el.querySelector('#wk-form').onsubmit = async e => { e.preventDefault(); const title = el.querySelector('#wn-t').value.trim(); if (!title) return;
      try { await api.addWorkItem({ title, details: el.querySelector('#wn-d').value.trim(), priority: +el.querySelector('#wn-p').value, area: el.querySelector('#wn-a').value, status: 'new' }); ctx.toast('המשימה נוספה'); await load(); } catch (er) { ctx.fail(er); } };
    el.querySelectorAll('details.wk-it').forEach(d => { const id = d.dataset.id, f = k => d.querySelector(`[data-f=${k}]`);
      d.querySelector('[data-save]').onclick = async () => { try { await api.saveWorkItem(id, { title: f('title').value.trim() || 'ללא כותרת', details: f('details').value, priority: +f('priority').value, status: f('status').value }); ctx.toast('נשמר'); await load(); } catch (er) { ctx.fail(er); } };
      d.querySelector('[data-addnote]').onclick = async () => { const b = d.querySelector('[data-note]').value.trim(); if (!b) return; try { await api.addWorkNote(id, b); await load(); } catch (er) { ctx.fail(er); } }; });
  };
  window.__wkReload = load;
  try { await load(); } catch (e) { el.innerHTML = `<p class="status no">המשימות לא נקראו (${esc(e.message || e)}). ייתכן שהטבלה עוד לא נוצרה.</p>`; }
}

// --- the agent: the local bridge (studio/agent/bridge.mjs), same token flow as the app's control room ----------------------
const BRIDGE = 'http://127.0.0.1:8799';
const lsGet = k => { try { return localStorage.getItem(k) || ''; } catch { return ''; } }, lsPut = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
const OFF = 'הסוכן כבוי: הפעל את studio\\agent\\start-agent.cmd במחשב';
const OPS = ['create', 'update', 'note'];
function parseOps(text) {
  const m = /```work-ops\s*([\s\S]*?)```/.exec(text); let ops = [];
  if (m) { try { const a = JSON.parse(m[1]); ops = (Array.isArray(a) ? a : []).filter(o => o && OPS.includes(o.op)); } catch {} }
  return { say: text.replace(/```work-ops[\s\S]*?(```|$)/g, '').trim(), ops };
}
const opLine = o => o.op === 'create' ? `משימה חדשה: ${o.title || ''}` : o.op === 'note' ? `הערה: ${o.body || ''}` : `עדכון משימה: ${[o.title && `כותרת "${o.title}"`, o.status && `סטטוס ${ST[o.status] || o.status}`, o.priority && `עדיפות ${PR[o.priority] || o.priority}`, o.details && 'פרטים'].filter(Boolean).join(', ')}`;
async function applyOps(ops) {
  const items = await api.workItems(), has = id => items.some(i => String(i.id) === String(id)); const now = new Date().toISOString(); let n = 0;
  for (const o of ops) {
    const pr = [1, 2, 3].includes(+o.priority) ? +o.priority : undefined, stt = ST[o.status] ? o.status : undefined, ar = AREA[o.area] ? o.area : undefined;
    if (o.op === 'create' && o.title) { await api.addWorkItem({ title: String(o.title).slice(0, 300), details: String(o.details || ''), priority: pr || 2, status: stt || 'planned', area: ar || 'other', created_by: 'lead', seen_by_lead_at: now }); n++; }
    else if (o.op === 'update' && has(o.id)) { const p = { seen_by_lead_at: now }; if (o.title) p.title = String(o.title).slice(0, 300); if (o.details != null) p.details = String(o.details); if (pr) p.priority = pr; if (stt) p.status = stt; if (ar) p.area = ar; await api.saveWorkItem(o.id, p); n++; }
    else if (o.op === 'note' && has(o.id) && o.body) { await api.addWorkNote(o.id, String(o.body).slice(0, 5000), 'lead'); await api.saveWorkItem(o.id, { seen_by_lead_at: now }); n++; }
  }
  return n;
}
function chat(ctx) {
  const el = document.getElementById('wk-chat'); let token = lsGet('os-agent-token'), session = '';
  try { session = sessionStorage.getItem('os-agent-session') || ''; } catch {}
  el.className = 'wk-ch';
  el.innerHTML = `<div><h2>שיחה עם הסוכן</h2><p class="muted small" id="wc-st" style="margin:4px 0 0">בודק חיבור…</p></div><div class="wk-lg" id="wc-log" aria-live="polite"></div>
    <div id="wc-bot"><form id="wc-f" hidden><textarea id="wc-t" dir="auto" aria-label="הודעה לסוכן" placeholder="ספר מה אתה רוצה, או שאל על המצב. Ctrl+Enter לשליחה"></textarea><div><button class="btn p" type="submit" id="wc-go">שלח</button></div></form><div id="wc-set"></div></div>`;
  const $ = s => el.querySelector(s), log = $('#wc-log'), st = $('#wc-st'), form = $('#wc-f'), txt = $('#wc-t'), go = $('#wc-go'), set = $('#wc-set');
  const add = (cls, t) => { const d = document.createElement('div'); d.className = 'wk-m ' + cls; d.textContent = t; log.appendChild(d); log.scrollTop = log.scrollHeight; return d; };
  const head = () => ({ authorization: `Bearer ${token}`, 'content-type': 'application/json' });
  const check = async () => {
    form.hidden = true; set.innerHTML = '';
    let r; try { r = await (await fetch(BRIDGE + '/status', { headers: head() })).json(); } catch { r = null; }
    if (!r) { st.textContent = OFF; st.style.color = 'var(--bad)'; return; }
    st.style.color = '';
    if (!r.authed) { st.textContent = 'מחובר למחשב. צריך להדביק את הקוד פעם אחת.';
      set.innerHTML = '<label class="field">הקוד שמודפס בחלון הסוכן (Token)<input id="wc-tok" dir="ltr" autocomplete="off"></label><div style="margin-top:8px"><button class="btn" type="button" id="wc-tokgo">שמור</button></div>';
      $('#wc-tokgo').onclick = () => { token = $('#wc-tok').value.trim(); lsPut('os-agent-token', token); check(); }; return; }
    st.textContent = r.mock ? 'מחובר (מצב בדיקה). הוא מציע שינויים במשימות, ואתה מאשר.' : 'מחובר. הוא מציע שינויים במשימות, ואתה מאשר.'; form.hidden = false;
  };
  const board = async () => { try { const l = (await api.workItems()).filter(i => i.status !== 'done').slice(0, 40); return `[לוח משימות פתוחות]\n${l.map(i => `${i.id} | ${i.title} | ${i.status} | ${i.priority}`).join('\n') || '(אין)'}\n[/לוח]\n`; } catch { return ''; } };
  const card = ops => { const c = document.createElement('div'); c.className = 'wk-op';
    c.innerHTML = `<b>הסוכן מציע לשנות את המשימות</b><ul>${ops.map(o => `<li dir="auto">${esc(opLine(o))}</li>`).join('')}</ul><div class="acts"><button class="btn p" type="button" data-y>אישור</button><button class="btn" type="button" data-n>ביטול</button></div>`;
    c.querySelector('[data-y]').onclick = async () => { c.querySelectorAll('button').forEach(b => b.disabled = true); try { const n = await applyOps(ops); c.innerHTML = `<b>אושר</b> · ${n} שינויים נרשמו`; ctx.toast('השינויים נרשמו'); window.__wkReload && window.__wkReload(); } catch (er) { c.querySelectorAll('button').forEach(b => b.disabled = false); ctx.fail(er); } };
    c.querySelector('[data-n]').onclick = () => { c.innerHTML = '<span class="muted">בוטל, לא נרשם כלום.</span>'; };
    log.appendChild(c); log.scrollTop = log.scrollHeight; };
  form.onsubmit = async e => {
    e.preventDefault(); const message = txt.value.trim(); if (!message) return;
    txt.value = ''; add('me', message); go.disabled = true; const ai = add('ai', '…'); let text = '';
    try {
      const res = await fetch(BRIDGE + '/ask', { method: 'POST', headers: head(), body: JSON.stringify({ message: (await board()) + message, session }) });
      if (!res.ok) throw new Error(res.status === 401 ? 'הקוד לא נכון' : `שגיאה ${res.status}`);
      const rd = res.body.getReader(), dec = new TextDecoder(); let buf = '';
      for (;;) {
        const { done, value } = await rd.read(); if (done) break; buf += dec.decode(value, { stream: true });
        let i; while ((i = buf.indexOf('\n')) >= 0) {
          const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!l) continue;
          let j; try { j = JSON.parse(l); } catch { continue; }
          if (j.t) { text += j.t; ai.textContent = parseOps(text).say || '…'; log.scrollTop = log.scrollHeight; }
          if (j.tool) add('tool', `עובד: ${j.tool}`);
          if (j.done) { if (j.session) { session = j.session; try { sessionStorage.setItem('os-agent-session', session); } catch {} } if (j.error) add('ai', `לא הצליח: ${j.error}`); }
        }
      }
      const { say, ops } = parseOps(text); if (!say) ai.remove(); else ai.textContent = say; if (ops.length) card(ops);
    } catch (er) { ai.textContent = er instanceof TypeError ? OFF : `לא הצליח: ${er.message}`; }
    go.disabled = false; txt.focus();
  };
  txt.onkeydown = e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) form.requestSubmit(); };
  check();
}
