// בדיקות לילה: what the visitor robot (studio/robot) found last night, walking the app as a phone. It reads the robot's own
// files from the repository (studio/health/robot/: latest.json, trend.json, shots/), which the "Visitor robot" workflow
// writes every night. Red first, then yellow, then each space as a traffic light; the pavilions beside their tours; the
// trend over the nights. Hebrew, as the Desk is the owner's; the robot's own details stay as it wrote them.
const RAW = new URLSearchParams(location.search).get('robot') || 'https://raw.githubusercontent.com/eladamsalemart/eladamsalem.github.io/studio/studio/health/robot/';      // (?robot=<folder url> reads another copy, to check the tab)
const PAGE = 'https://raw.githack.com/eladamsalemart/eladamsalem.github.io/studio/studio/health/robot/report.html';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const CHECK = { memory: 'זיכרון', 'draw calls': 'קריאות ציור', sharpness: 'חדות', console: 'שגיאת סקריפט', 'request failed': 'קובץ שלא הגיע', floating: 'מרחף מעל הרצפה',
  'text not flush': 'טקסט לא צמוד לקיר', 'opening blocked': 'פתח חסום', 'texture missing': 'טקסטורה חסרה', 'texture black': 'טקסטורה שחורה', 'unlike its tour': 'שונה מהסיור המקורי',
  'camera at open': 'מצלמה שבורה בפתיחה', 'did not open': 'לא נפתח', load: 'טעינה איטית', proof: 'בדיקה שלא הוכחה' };
const SPACE = k => k === 'museum' ? 'המוזיאון' : k === 'robot' ? 'הרובוט עצמו' : k;
const LIGHT = { red: 'אדום', yellow: 'צהוב', green: 'ירוק' };
const CSS = `.nt-lights{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}
.nt-sp{display:flex;gap:10px;align-items:flex-start;background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:12px}
.nt-l{flex:none;width:14px;height:14px;border-radius:50%;margin-top:4px}.nt-l.red{background:var(--bad)}.nt-l.yellow{background:#C99212}.nt-l.green{background:var(--ok)}
.nt-sp b{display:block}.nt-sp .muted{font-size:13px}
.nt-f{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:start;padding:10px 0;border-bottom:1px solid var(--line)}.nt-f:last-child{border-bottom:0}
.nt-f img{width:64px;height:138px;object-fit:cover;border-radius:8px;border:1px solid var(--line);background:#000}
.nt-f .d{font-size:13px;color:var(--muted);direction:ltr;text-align:right;word-break:break-word}
.nt-pairs{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px}.nt-pairs figure{margin:0;background:var(--card);border:1px solid var(--line);border-radius:var(--r);overflow:hidden}
.nt-pairs img{display:block;width:100%;height:auto}.nt-pairs figcaption{padding:8px 10px;font-size:13px}
.nt-tr{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}.nt-tr figure{margin:0;background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:10px 12px}
.nt-tr svg{display:block;width:100%;height:64px;direction:ltr}.nt-tr figcaption{display:flex;justify-content:space-between;font-size:13px;color:var(--muted)}.nt-tr figcaption b{color:var(--ink);font-variant-numeric:tabular-nums}`;

export async function nights(ctx) {
  ctx.page('nights', 'בדיקות לילה', 'רובוט שמבקר באפליקציה כל לילה כמו טלפון, ומודד מה שאתה היית מוצא בעצמך', '<div id="nt"><p class="muted">טוען את הלילה האחרון…</p></div>');
  if (!document.getElementById('nt-css')) { const st = document.createElement('style'); st.id = 'nt-css'; st.textContent = CSS; document.head.append(st); }
  const el = document.getElementById('nt'), bust = '?t=' + Math.floor(Date.now() / 300000);
  let last, trend = [];
  try { last = await fetch(RAW + 'latest.json' + bust).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }); }
  catch (e) { el.innerHTML = `<p class="status no">הרובוט עוד לא כתב לילה (${esc(e.message)}).</p>`; return; }
  try { trend = await fetch(RAW + 'trend.json' + bust).then(r => r.json()); } catch {}
  const S = last.summary || {}, flags = (last.flags || []).slice().sort((a, b) => (a.sev === 'red' ? 0 : 1) - (b.sev === 'red' ? 0 : 1));
  const shot = f => f ? RAW + f : '';
  const where = f => [SPACE(f.space), f.view].filter(Boolean).join(' · ');
  const flagRow = f => `<div class="nt-f">${f.shot ? `<a href="${esc(shot(f.shot))}" target="_blank" rel="noopener"><img loading="lazy" src="${esc(shot(f.shot))}" alt=""></a>` : '<span></span>'}
    <div><b>${esc(CHECK[f.check] || f.check)}</b> <span class="muted small">${esc(where(f))}</span><div class="d">${esc(f.text)}</div></div>
    <span class="chip ${f.sev === 'red' ? 'no' : ''}" style="${f.sev === 'red' ? 'color:var(--bad)' : 'color:var(--warn)'}">${LIGHT[f.sev]}</span></div>`;
  const lights = (S.spaces || []).map(s => `<div class="nt-sp"><i class="nt-l ${s.status}" aria-label="${LIGHT[s.status]}"></i><div><b>${esc(SPACE(s.space))}</b>
    <span class="muted">זיכרון <bdi>${s.memory} MB</bdi> · נטען ב-${s.ready ? Math.round(s.ready / 1000) : '–'} שנ׳${s.calls ? ' · ' + s.calls + ' קריאות' : ''}</span></div></div>`).join('');
  const pairs = (last.pavilions || []).flatMap(p => p.rows.map(r => `<figure><a href="${esc(shot(r.shot))}" target="_blank" rel="noopener"><img loading="lazy" src="${esc(shot(r.shot))}" alt=""></a>
    <figcaption><b>${esc(p.slug)}</b>: משמאל הסיור, מימין המוזיאון · בהירות ${r.bright > 0 ? '+' : ''}${Math.round(r.bright * 100)}% · צבע ${r.colour} · פירוט משטח (ברק או גרעיניות) x${r.gloss}
    ${r.flags.length ? `<span class="chip" style="color:var(--warn)">שונה</span>` : '<span class="chip ok">דומה</span>'}</figcaption></figure>`)).join('');
  // the trend: one small line per number, oldest on the left, the last night marked
  const line = (title, vals, unit, limit) => { const v = vals.map(x => x == null ? null : +x); const ok = v.filter(x => x != null); if (!ok.length) return '';
    const hi = Math.max(...ok, limit || 0) * 1.08 || 1, n = v.length, X = i => n === 1 ? 50 : 4 + i * 92 / (n - 1), Y = x => 60 - x / hi * 54;
    const pts = v.map((x, i) => x == null ? null : `${X(i).toFixed(1)},${Y(x).toFixed(1)}`).filter(Boolean).join(' ');
    return `<figure><svg viewBox="0 0 100 64" preserveAspectRatio="none" role="img" aria-label="${esc(title)}">${limit ? `<line x1="0" x2="100" y1="${Y(limit).toFixed(1)}" y2="${Y(limit).toFixed(1)}" stroke="var(--bad)" stroke-dasharray="2 2" stroke-width="0.6" vector-effect="non-scaling-stroke"/>` : ''}
      <polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2" vector-effect="non-scaling-stroke"/><circle cx="${X(n - 1)}" cy="${Y(v[n - 1] ?? 0)}" r="2.2" fill="var(--accent)"/></svg>
      <figcaption><span>${esc(title)}</span><b><bdi>${v[n - 1] ?? '–'}${unit}</bdi></b></figcaption></figure>`; };
  const sp = k => trend.map(t => ((t.spaces || []).find(s => s.space === k) || {}));
  const tr = trend.length ? [line('דגלים אדומים', trend.map(t => t.red), ''), line('דגלים צהובים', trend.map(t => t.yellow), ''),
    line('זיכרון במוזיאון', sp('museum').map(s => s.memory), ' MB', last.budget && last.budget.memory), line('המוזיאון נטען', sp('museum').map(s => s.ready && Math.round(s.ready / 1000)), ' שנ׳'),
    ...((S.spaces || []).filter(s => s.space !== 'museum').map(s => line(`זיכרון ב-${s.space}`, sp(s.space).map(x => x.memory), ' MB', last.budget && last.budget.memory)))].join('') : '';
  const age = Math.floor((Date.now() - new Date(last.date)) / 864e5);
  el.innerHTML = `<section class="sec"><div class="chips" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
      <span class="chip" style="color:var(--bad)">${S.red ?? 0} אדום</span><span class="chip" style="color:var(--warn)">${S.yellow ?? 0} צהוב</span>
      <span class="chip">${S.regressions ?? 0} נסיגות מול הלילה הקודם</span><span class="chip ${S.proved === S.checks ? 'ok' : ''}">${S.proved ?? '–'}/${S.checks ?? '–'} בדיקות הוכיחו שהן תופסות באג</span></div>
    <p class="muted small">הלילה של ${esc(new Date(last.date).toLocaleDateString('he-IL', { day: 'numeric', month: 'long' }))}${age > 1 ? ` (לפני ${age} ימים: הרובוט לא רץ מאז)` : ''} · ${Math.round((last.seconds || 0) / 60)} דקות · טלפון 390×844 · <a href="${PAGE}" target="_blank" rel="noopener">הדוח המלא ↗</a></p></section>
    <section class="sec"><h2>${flags.length ? 'מה לתקן' : 'הכל תקין'}</h2>${flags.length ? flags.map(flagRow).join('') : '<p class="muted">הרובוט לא מצא דבר הלילה.</p>'}</section>
    <section class="sec"><h2>כל חלל</h2><div class="nt-lights">${lights}</div></section>
    ${pairs ? `<section class="sec"><h2>הביתנים מול הסיור המקורי</h2><div class="nt-pairs">${pairs}</div></section>` : ''}
    ${tr ? `<section class="sec"><h2>לאורך הלילות</h2><div class="nt-tr">${tr}</div></section>` : ''}`;
}
