// (the Desk is published with every .js and .css file in this folder: see the Open Studio app workflow)
// Pavilions from tours, waiting for the owner: what the exhibition importer (studio/app/space/importer/import.cjs) made.
// A draft is only a file (data/museum/drafts/<slug>.json). Nothing of it is live until the owner presses "הוספה למוזיאון",
// which adds its plan entry to museum_plan (undo puts the plan back as it was). A draft that failed its gate has no button.
//   mountDrafts(el, { api, APP, toast, planOf, onChange })
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const CHECK = { tour_live: 'הסיור עבר את הבדיקות שלו', real_openings: 'פתחים אמיתיים (קשת / דלת)', free_place: 'מקום פנוי במוזיאון ומחובר לשבילים', jambs: 'עובי קיר מלא בפתחים, אין פתח חסום',
  text_flush: 'טקסט הקיר צמוד לקיר', works: 'העבודות בגודל ובמקום האמיתיים', px_per_m: 'חדות (פיקסלים למטר) לפחות כמו בסיור', floor_mirror: 'השתקפות הרצפה (הוכחה בצביעה)',
  phone_memory: 'זיכרון בטלפון מתחת לתקציב', side_by_side: 'השוואה לסיור מ-3 מבטים', no_errors: 'בלי שגיאות' };

const CSS = `.dr-card{border:1px solid #d9d4ca;border-radius:10px;padding:14px 16px;margin:10px 0;background:#fbfaf7}
.dr-card header{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:8px}
.dr-checks{list-style:none;margin:0 0 10px;padding:0;font-size:14px;line-height:1.45}
.dr-checks li{display:grid;grid-template-columns:18px 1fr;column-gap:6px}.dr-checks li small{grid-column:2;color:#6b665d;font-size:12px}
.dr-checks li.no>span{color:#b3261e}.dr-checks li.ok>span{color:#2e7d32}
.dr-sbs{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px}.dr-sbs img{width:100%;border-radius:6px;display:block}`;

export async function mountDrafts(el, { api, APP, toast = () => {}, planOf = p => p, onChange = () => {} }) {
  if (!document.getElementById('dr-css')) { const st = document.createElement('style'); st.id = 'dr-css'; st.textContent = CSS; document.head.appendChild(st); }
  const get = u => fetch(u, { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null);
  const ix = await get(APP + 'data/museum/drafts/index.json') || {};
  const drafts = (await Promise.all(Object.keys(ix).map(s => get(APP + `data/museum/drafts/${s}.json`)))).filter(Boolean);
  if (!drafts.length) { el.innerHTML = ''; el.hidden = true; return; }
  const plan = planOf(await api.plan().catch(() => null)), inPlan = d => (plan.spaces || []).some(s => s.tour === d.slug);
  el.hidden = false;
  el.innerHTML = `<h3>ביתנים מסיורים, מחכים לאישור</h3>` + drafts.map(d => {
    const ok = d.gate && d.gate.pass, live = inPlan(d);
    return `<article class="dr-card" data-slug="${esc(d.slug)}">
      <header><b dir="auto">${esc(d.title)}</b><span class="chip ${live ? 'ok' : ok ? '' : 'warn'}">${live ? 'במוזיאון' : ok ? 'עבר את הבדיקות: מחכה לך' : 'לא עבר: לא מוצע'}</span></header>
      <ul class="dr-checks">${(d.gate ? d.gate.checks : []).map(c => `<li class="${c.pass ? 'ok' : 'no'}"><span>${c.pass ? '✓' : '✗'}</span> ${esc(CHECK[c.id] || c.id)}<small dir="auto">${esc(c.he || c.why)}</small></li>`).join('')}</ul>
      ${(d.views || []).length ? `<div class="dr-sbs">${d.views.map((v, i) => `<a href="${APP}data/museum/drafts/${esc(d.slug)}/side-by-side-${i + 1}-${esc(v.id)}.jpg" target="_blank"><img loading="lazy" alt="" src="${APP}data/museum/drafts/${esc(d.slug)}/side-by-side-${i + 1}-${esc(v.id)}.jpg"></a>`).join('')}</div>` : ''}
      ${ok && !live ? `<button class="btn primary" data-add>הוספה למוזיאון</button>` : ''}
    </article>`; }).join('');
  for (const b of el.querySelectorAll('[data-add]')) b.onclick = async () => {
    const d = drafts.find(x => x.slug === b.closest('[data-slug]').dataset.slug); if (!d || !d.space) return;
    b.disabled = true;
    try {
      const prev = await api.plan().catch(() => null), P = JSON.parse(JSON.stringify(planOf(prev)));
      P.spaces = (P.spaces || []).filter(s => s.tour !== d.slug && s.id !== d.space.id).concat([{ ...d.space }]);
      await api.savePlan(P);
      toast(`נוסף למוזיאון: ${d.title}`, async () => { await api.savePlan(prev || planOf(null)); onChange(); mountDrafts(el, { api, APP, toast, planOf, onChange }); });
      onChange(); mountDrafts(el, { api, APP, toast, planOf, onChange });
    } catch (e) { b.disabled = false; toast('לא נשמר: ' + (e.message || e)); }
  };
}
