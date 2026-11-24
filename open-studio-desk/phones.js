// טלפונים: real-phone data. How the 3D spaces (tours, virtual rooms, the museum) run on visitors' own devices, from
// public.phone_vitals (sent by the app at the end of each visit: studio/app/app.js osVitals; every visit of the owner and
// a quarter of the others; no personal data). Per space and kind of device: load time, frame time, memory, crashes, the
// worst five visits, and a red light when a space crosses a line. Same look as בדיקות לילה (nights.js). Hebrew.
import { db } from './data.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const DEV = { iphone: 'אייפון', ipad: 'אייפד', android: 'אנדרואיד', desktop: 'מחשב', other: 'אחר' };
// the lines (the same as public.phone_vitals_summary): first frame 6 s on an iPhone or iPad, 10 s elsewhere; a median frame
// of 50 ms; any crash or lost graphics context is red. Yellow: over 70% of a line, or a single frame over a second.
const LINE = { ff: d => (d === 'iphone' || d === 'ipad' ? 6000 : 10000), med: 50 };
const med = a => { const s = a.filter(v => v != null).sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };
const max = a => { const s = a.filter(v => v != null); return s.length ? Math.max(...s) : null; };
const sec = ms => ms == null ? '–' : (ms / 1000).toFixed(1) + ' שנ׳';
const ms = v => v == null ? '–' : Math.round(v) + ' מ״ש';
const ago = t => { const h = (Date.now() - new Date(t)) / 36e5; return h < 1 ? 'לפני פחות משעה' : h < 24 ? `לפני ${Math.floor(h)} שעות` : `לפני ${Math.floor(h / 24)} ימים`; };
const LIGHT = { red: 'אדום', yellow: 'צהוב', green: 'ירוק' };
const CSS = `.ph-lights{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}
.ph-sp{display:flex;gap:10px;align-items:flex-start;background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:12px}
.ph-l{flex:none;width:14px;height:14px;border-radius:50%;margin-top:4px}.ph-l.red{background:var(--bad)}.ph-l.yellow{background:#C99212}.ph-l.green{background:var(--ok)}
.ph-sp b{display:block}.ph-sp .muted{font-size:13px;display:block;font-variant-numeric:tabular-nums}.ph-sp .why{color:var(--bad);font-size:13px;display:block}
.ph-f{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:start;padding:10px 0;border-bottom:1px solid var(--line)}.ph-f:last-child{border-bottom:0}
.ph-f .d{font-size:13px;color:var(--muted);font-variant-numeric:tabular-nums}.ph-f .d bdi{direction:ltr}`;

const titles = async () => ({});      // (the space keys are the tours' own slugs, readable as they are)
const name = (k, T) => { if (k === 'museum') return 'המוזיאון'; const m = String(k).match(/^(tour|room):(.+)$/); return m ? `${m[1] === 'room' ? 'חדר וירטואלי' : 'סיור'} · ${T[m[2]] || m[2]}` : k; };

export async function phones(ctx) {
  ctx.page('phones', 'טלפונים', 'איך הסיורים והמוזיאון רצים אצל מבקרים אמיתיים, בטלפון שלהם: כל ביקור שלך ורבע מהשאר, בלי פרטים אישיים', '<div id="ph"><p class="muted">טוען…</p></div>');
  if (!document.getElementById('ph-css')) { const st = document.createElement('style'); st.id = 'ph-css'; st.textContent = CSS; document.head.append(st); }
  const el = document.getElementById('ph'), days = +(new URLSearchParams(location.search).get('days') || 60);
  let rows, T;
  try {
    const c = await db();
    const [r, t] = await Promise.all([c.from('phone_vitals').select('created_at,space,device,model,browser,screen_w,screen_h,dpr,first_frame_ms,frame_med_ms,frame_p95_ms,frame_worst_ms,heap_mb,tex_mb,context_lost,crashed,errors,seconds,owner,test')
      .gte('created_at', new Date(Date.now() - days * 864e5).toISOString()).order('created_at', { ascending: false }).limit(3000), titles()]);
    if (r.error) throw r.error; rows = r.data; T = t;
  } catch (e) { el.innerHTML = `<p class="status no">הנתונים לא נקראו (${esc(e.message || e)}).</p>`; return; }
  if (!rows.length) { el.innerHTML = '<p class="muted">עוד אין ביקורים. הם יגיעו מהביקור הראשון בסיור או במוזיאון.</p>'; return; }
  const groups = new Map();
  for (const r of rows) { const k = r.space + '|' + r.device; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); }
  const spaces = [...groups.entries()].map(([k, rs]) => {
    const [space, device] = k.split('|');
    const g = { space, device, n: rs.length, tests: rs.filter(r => r.test).length, ff: med(rs.map(r => r.first_frame_ms)), ffw: max(rs.map(r => r.first_frame_ms)),
      fm: med(rs.map(r => r.frame_med_ms)), fw: max(rs.map(r => r.frame_worst_ms)), tex: med(rs.map(r => r.tex_mb)), texw: max(rs.map(r => r.tex_mb)), heap: med(rs.map(r => r.heap_mb)),
      crash: rs.filter(r => r.crashed).length, lost: rs.filter(r => r.context_lost).length };
    const why = [], line = LINE.ff(device);
    if (g.ff != null && g.ff > line) why.push(`טעינה ${sec(g.ff)}, מעל ${line / 1000} שנ׳`);
    if (g.fm != null && g.fm > LINE.med) why.push(`פריים ${ms(g.fm)}, מעל ${LINE.med}`);
    if (g.crash) why.push(g.crash === 1 ? 'קריסה אחת' : `${g.crash} קריסות`);
    if (g.lost) why.push(g.lost === 1 ? 'הגרפיקה נפלה פעם אחת' : `הגרפיקה נפלה ${g.lost} פעמים`);
    g.why = why;
    g.light = why.length ? 'red' : (g.ff > 0.7 * line || g.fm > 0.7 * LINE.med || g.fw > 1000) ? 'yellow' : 'green';
    return g;
  }).sort((a, b) => ({ red: 0, yellow: 1, green: 2 }[a.light] - { red: 0, yellow: 1, green: 2 }[b.light]) || b.n - a.n);
  const red = spaces.filter(s => s.light === 'red'), yellow = spaces.filter(s => s.light === 'yellow').length, tests = rows.filter(r => r.test).length;
  const day = rows.filter(r => Date.now() - new Date(r.created_at) < 864e5).length, crashes = rows.filter(r => r.crashed || r.context_lost).length;
  const score = r => (r.crashed ? 1e9 : 0) + (r.context_lost ? 1e8 : 0) + (r.first_frame_ms || 0) + 20 * (r.frame_worst_ms || 0);
  const worst = rows.slice().sort((a, b) => score(b) - score(a)).slice(0, 5);
  const card = s => `<div class="ph-sp"><i class="ph-l ${s.light}" aria-label="${LIGHT[s.light]}"></i><div><b>${esc(name(s.space, T))}</b>
    <span class="muted">${DEV[s.device] || esc(s.device)} · ${s.n} ביקורים${s.tests ? ` (${s.tests} בדיקה)` : ''}</span>
    <span class="muted">טעינה ${sec(s.ff)} · הגרועה ${sec(s.ffw)}</span>
    <span class="muted">פריים ${ms(s.fm)} · הארוך ${ms(s.fw)}</span>
    <span class="muted">זיכרון גרפי ${s.tex ?? '–'} MB · עד ${s.texw ?? '–'}${s.heap != null ? ` · JS ${s.heap} MB` : ''}</span>
    ${s.why.length ? `<span class="why">${esc(s.why.join(' · '))}</span>` : ''}</div></div>`;
  const visit = r => `<div class="ph-f"><div><b>${esc(name(r.space, T))}</b> <span class="muted small">${DEV[r.device] || esc(r.device)} · ${ago(r.created_at)}</span>
    <div class="d"><bdi>${esc([r.model, r.browser, `${r.screen_w}×${r.screen_h} @${r.dpr}`].filter(Boolean).join(' · '))}</bdi> · טעינה ${sec(r.first_frame_ms)} · פריים ${ms(r.frame_med_ms)}, הארוך ${ms(r.frame_worst_ms)} · זיכרון ${r.tex_mb ?? '–'} MB${r.heap_mb != null ? `, JS ${r.heap_mb}` : ''} · ${r.seconds ?? '–'} שנ׳ בחלל${r.errors ? ` · ${r.errors} שגיאות סקריפט` : ''}</div></div>
    <span>${r.crashed ? '<span class="chip no">קרס</span>' : r.context_lost ? '<span class="chip no">הגרפיקה נפלה</span>' : ''}${r.test ? ' <span class="chip">בדיקה</span>' : ''}${r.owner ? ' <span class="chip">שלך</span>' : ''}</span></div>`;
  el.innerHTML = `<section class="sec"><div class="chips" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
      <span class="chip" style="color:var(--bad)">${red.length} אדום</span><span class="chip" style="color:var(--warn)">${yellow} צהוב</span>
      <span class="chip">${rows.length} ביקורים ב־${days} ימים</span><span class="chip">${day} ב־24 השעות האחרונות</span><span class="chip ${crashes ? 'no' : 'ok'}">${crashes} קריסות</span>${tests ? `<span class="chip">${tests} שורות בדיקה</span>` : ''}</div>
    <p class="muted small">טעינה: מהכניסה לחלל עד שהחדר מופיע (חציון). פריים: חציון זמן הפריים ב־20 השניות הראשונות (16 מ״ש זה חלק לגמרי). זיכרון: התמונות שהחדר מחזיק בזיכרון הגרפי. קריסה: הדף מת באמצע הביקור ונפתח מחדש. הנתונים נמחקים אחרי 60 יום.</p></section>
    <section class="sec"><h2>${red.length ? 'מה לתקן' : 'הכל בתוך הספים'}</h2>${red.length ? red.map(s => `<p class="status no">${esc(name(s.space, T))}, ${DEV[s.device] || esc(s.device)}: ${esc(s.why.join(' · '))}</p>`).join('') : '<p class="muted">אף חלל לא חצה סף.</p>'}</section>
    <section class="sec"><h2>כל חלל, לפי מכשיר</h2><div class="ph-lights">${spaces.map(card).join('')}</div></section>
    <section class="sec"><h2>חמשת הביקורים הגרועים</h2><div>${worst.map(visit).join('')}</div></section>`;
}
