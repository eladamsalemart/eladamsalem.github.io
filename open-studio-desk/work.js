// עבודה: what each Open Studio session and helper is doing, what finished, and what waits for the owner. It reads a small
// file the sessions write themselves, studio/health/work.json ({ tasks: [{ task, session, id, state, updated, needs_owner }] },
// state: working | waiting | done | paused), from the repository's studio branch (locally: the file beside it). Waiting on
// the owner first, then working, paused, done. Same look as בדיקות לילה and טלפונים. Hebrew; the tasks stay as written.
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
  ctx.page('work', 'עבודה', 'מה כל סשן ועוזר עושה עכשיו, מה הסתיים ומה מחכה לך', '<div id="wk"><p class="muted">טוען…</p></div>');
  if (!document.getElementById('wk-css')) { const st = document.createElement('style'); st.id = 'wk-css'; st.textContent = CSS; document.head.append(st); }
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
