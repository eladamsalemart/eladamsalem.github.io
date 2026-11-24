// The visitor robot's report: one HTML page (report.html) with the shots, the numbers, the flags and the change since the
// previous night; the night's numbers in history/<date>.json (no pictures); a short Hebrew summary for the lead session
// (summary.he.md). A shot is rewritten only when it changed (so the repository does not grow by a night of pictures
// when nothing moved).
const fs = require('fs'), path = require('path');
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pct = (a, b) => b ? (a - b) / b : 0;

async function writeReport(res, prev, { OUT, SHOTS, HIST, img }) {
  const flags = [];
  // one flag: red (broken, fix first) or yellow (worse than it should be); the space, the viewpoint, the value against its limit
  const F = (sev, space, view, check, text, value = null, threshold = null, shot = null) => flags.push({ sev, space, view, check, text, value, threshold, shot });
  // --- shots: write the ones that changed; measure the change against last night's picture
  const keep = new Set();
  const save = async (id, b64) => {
    const file = path.join(SHOTS, id + '.jpg'); keep.add(id + '.jpg'); let change = null;
    if (fs.existsSync(file)) { change = await img.evaluate(([a, c]) => window.diff(a, c), [fs.readFileSync(file).toString('base64'), b64]); if (change < 0.012) return { file: 'shots/' + id + '.jpg', change }; }
    fs.writeFileSync(file, Buffer.from(b64, 'base64')); return { file: 'shots/' + id + '.jpg', change };
  };
  for (const s of res.spaces) for (const v of s.views) { const r = await save(v.id, v.jpg); v.shot = r.file; v.change = r.change; delete v.jpg; }
  for (const p of res.pavilions) for (const r of p.rows) { r.shot = (await save(r.id, r.jpg)).file; delete r.jpg; }
  if (res.proof && res.proof.jpg) { res.proof.shot = (await save('proof', res.proof.jpg)).file; delete res.proof.jpg; }
  for (const f of fs.readdirSync(SHOTS)) if (!keep.has(f) && !(res.partial)) fs.unlinkSync(path.join(SHOTS, f));
  // --- the night's flags
  for (const s of res.spaces) {
    const W = s.key;
    if (s.fatal) F('red', W, null, 'did not open', s.fatal);
    if (s.load.ready > 120000) F('yellow', W, null, 'load', `ready after ${Math.round(s.load.ready / 1000)} s`, s.load.ready, 120000);
    if (s.camera && s.camera.bad) F('red', W, null, 'camera at open', `the first view's lens read ${s.camera.worstFov} deg (${s.camera.bad} samples out of range) before it settled`, s.camera.worstFov, '10..130');
    s.views.forEach((v, k) => {
      const vn = v.id.replace(W + '--', '');
      if (v.memory > res.budget.memory) F('red', W, vn, 'memory', `${v.memory} MB (budget ${res.budget.memory})`, v.memory, res.budget.memory, v.shot);
      if (k === 0 && v.calls > res.budget.calls) F('red', W, vn, 'draw calls', `${v.calls} at the start view (budget ${res.budget.calls})`, v.calls, res.budget.calls, v.shot);
      for (const w of v.sharp || []) if (w.ratio < res.limit.soft && w.d < res.limit.near) F('yellow', W, vn, 'sharpness', `"${w.title}" at ${w.d} m holds ${w.cur} px of ${w.src || '?'} (needs ${Math.min(w.src || 1e9, w.need)})`, w.ratio, res.limit.soft, v.shot);
    });
    for (const e of [...new Set(s.errors)]) F('red', W, null, 'console', e);
    for (const e of [...new Set(s.failed)]) F('red', W, null, 'request failed', e);
    for (const f of (s.physics && s.physics.flags) || []) F('red', W, null, f.check, `${f.what}: ${f.value}${f.src ? ' (' + f.src + ')' : ''}`, f.value);
  }
  for (const p of res.pavilions) for (const r of p.rows) for (const t of r.flags) F('yellow', 'museum', r.id.replace('pair-', 'pavilion-'), 'unlike its tour', t, { bright: r.bright, colour: r.colour, gloss: r.gloss }, { bright: res.limit.bright, colour: res.limit.colour, gloss: res.limit.gloss }, r.shot);
  if (res.proof) for (const r of res.proof.rows) if (!r.caught) F('red', 'robot', null, 'proof', `the "${r.check}" check did not catch its planted bug (${r.planted}): its results tonight cannot be trusted`);
  const key = f => [f.space, f.view, f.check, f.text].join('|'), where = f => [f.space, f.view].filter(Boolean).join(' · ');
  // --- against the previous night
  const diff = [];
  if (prev) {
    const pv = new Map(); for (const s of prev.spaces || []) for (const v of s.views || []) pv.set(v.id, v);
    const ps = new Map((prev.spaces || []).map(s => [s.key, s]));
    for (const s of res.spaces) {
      const o = ps.get(s.key);
      if (o && o.load && s.load.ready && pct(s.load.ready, o.load.ready) > 0.3 && s.load.ready - o.load.ready > 10000) diff.push({ reg: true, where: s.key, text: `ready ${Math.round(o.load.ready / 1000)} → ${Math.round(s.load.ready / 1000)} s` });
      if (o && o.load && s.load.first && pct(s.load.first, o.load.first) > 0.3 && s.load.first - o.load.first > 5000) diff.push({ reg: true, where: s.key, text: `first frame ${Math.round(o.load.first / 1000)} → ${Math.round(s.load.first / 1000)} s` });
      for (const v of s.views) {
        const w = pv.get(v.id); if (!w) { diff.push({ reg: false, where: v.id, text: 'a new viewpoint' }); continue; }
        if (v.memory - w.memory > 15 && pct(v.memory, w.memory) > 0.1) diff.push({ reg: true, where: v.id, text: `memory ${w.memory} → ${v.memory} MB` });
        if (pct(v.calls, w.calls) > 0.1 && v.calls - w.calls > 8) diff.push({ reg: true, where: v.id, text: `draw calls ${w.calls} → ${v.calls}` });
        if (w.frame && v.frame.median - w.frame.median > 10 && pct(v.frame.median, w.frame.median) > 0.3) diff.push({ reg: true, where: v.id, text: `frame ${w.frame.median} → ${v.frame.median} ms` });
        const lo = x => Math.min(1, ...(x.sharp || []).filter(q => q.d < 4).map(q => q.ratio));
        if (lo(w) - lo(v) > 0.15) diff.push({ reg: true, where: v.id, text: `sharpest-need work ${Math.round(lo(w) * 100)}% → ${Math.round(lo(v) * 100)}%` });
        if (v.change != null && v.change > 0.06) diff.push({ reg: false, where: v.id, text: `the picture changed (${Math.round(v.change * 100)}% of its pixels' range)` });
      }
    }
    const was = new Set((prev.flags || []).map(key));
    for (const f of flags) if (!was.has(key(f)) && f.check !== 'proof') diff.push({ reg: true, where: where(f), text: `new: ${f.check}: ${f.text}` });
    const now = new Set(flags.map(key));
    for (const f of prev.flags || []) if (!now.has(key(f))) diff.push({ reg: false, where: where(f), text: `gone: ${f.check}: ${f.text}` });
  }
  res.flags = flags; res.diff = diff; res.prev = prev ? prev.date : null;
  // --- files: latest.json (what the lead's morning review and the Desk read), history/<date>.json, trend.json, the page
  const slim = JSON.parse(JSON.stringify(res)); for (const s of slim.spaces) { delete s.info; if (s.physics && s.physics.counts) delete s.physics.counts.used; }
  const red = flags.filter(f => f.sev === 'red').length;
  slim.summary = { red, yellow: flags.length - red, regressions: diff.filter(d => d.reg).length, proved: res.proof ? res.proof.rows.filter(r => r.caught).length : null, checks: res.proof ? res.proof.rows.length : null,
    spaces: res.spaces.map(s => ({ space: s.key, status: flags.some(f => f.space === s.key && f.sev === 'red') ? 'red' : flags.some(f => f.space === s.key) ? 'yellow' : 'green',
      memory: Math.max(0, ...s.views.map(v => v.memory || 0)), calls: s.views[0] ? s.views[0].calls : null, ready: s.load.ready || null, first: s.load.first || null, frame: s.views.length ? Math.max(...s.views.map(v => (v.frame && v.frame.median) || 0)) : null })) };
  if (!res.partial) fs.writeFileSync(path.join(HIST, res.date + '.json'), JSON.stringify(slim));
  fs.writeFileSync(path.join(OUT, 'latest.json'), JSON.stringify(slim, null, 1));
  const tf = path.join(OUT, 'trend.json'); let trend = []; try { trend = JSON.parse(fs.readFileSync(tf, 'utf8')); } catch {}
  if (!res.partial) { trend = trend.filter(t => t.date !== res.date); trend.push({ date: res.date, ...slim.summary }); trend = trend.slice(-60); fs.writeFileSync(tf, JSON.stringify(trend)); }
  fs.writeFileSync(path.join(OUT, 'report.html'), page(res));
  const bad = flags.filter(f => f.sev === 'red'), warn = flags.filter(f => f.sev === 'yellow'), reg = diff.filter(d => d.reg);
  const proofOk = res.proof ? res.proof.rows.filter(r => r.caught).length + '/' + res.proof.rows.length : 'לא רץ';
  const views = res.spaces.reduce((n, s) => n + s.views.length, 0);
  const he = [`# רובוט המבקר — ${res.date}`, '',
    `- הלך ב-${res.spaces.length} חללים, ${views} נקודות מבט, ${Math.round(res.seconds / 60)} דקות (טלפון 390×844, האתר החי).`,
    `- דגלים: ${bad.length} חמורים, ${warn.length} אזהרות. נסיגות מול הלילה הקודם (${res.prev || 'אין'}): ${reg.length}.`,
    `- הוכחת הבדיקות (באג מושתל לכל בדיקה): ${proofOk} נתפסו.`,
    ...bad.slice(0, 6).map(f => `- ❗ ${where(f)} · ${f.check}: ${f.text}`),
    ...warn.slice(0, 4).map(f => `- ⚠ ${where(f)} · ${f.check}: ${f.text}`),
    ...reg.slice(0, 4).map(d => `- ↘ ${d.where}: ${d.text}`),
    '', 'הדוח: `studio/health/robot/report.html`; התוצאות: `studio/health/robot/latest.json`; ב-Desk: לשונית בדיקות לילה.'];
  fs.writeFileSync(path.join(OUT, 'summary.he.md'), he.join('\n') + '\n');
  return { line: `robot: ${res.spaces.length} spaces, ${views} views, ${bad.length} bad, ${warn.length} warnings, ${reg.length} regressions, proof ${proofOk}, ${res.seconds}s` };
}

function page(res) {
  const n = x => x == null ? '–' : x;
  const sev = { red: 'Red', yellow: 'Yellow' };
  const flagRows = res.flags.map(f => `<tr class="${f.sev}"><td><span class="tag ${f.sev}">${sev[f.sev]}</span></td><td>${esc([f.space, f.view].filter(Boolean).join(' · '))}</td><td>${esc(f.check)}</td><td>${esc(f.text)}</td></tr>`).join('');
  const diffRows = res.diff.map(d => `<li class="${d.reg ? 'reg' : ''}"><b>${esc(d.where)}</b> ${esc(d.text)}</li>`).join('');
  const space = s => {
    const ph = s.physics || { flags: [], counts: {} }, c = ph.counts || {};
    const cards = s.views.map((v, k) => {
      const soft = (v.sharp || []).filter(w => w.d < res.limit.near);
      const worst = soft.length ? soft.reduce((a, w) => w.ratio < a.ratio ? w : a) : null;
      const memBad = v.memory > res.budget.memory, callBad = k === 0 && v.calls > res.budget.calls;
      return `<figure class="shot"><a href="${esc(v.shot)}"><img loading="lazy" src="${esc(v.shot)}" alt="${esc(v.name)}" width="390" height="844"></a>
      <figcaption><b>${esc(v.name)}</b>
      <dl><dt>Memory</dt><dd class="${memBad ? 'over' : ''}">${n(v.memory)} MB</dd><dt>Calls</dt><dd class="${callBad ? 'over' : ''}">${n(v.calls)}</dd>
      <dt>Frame</dt><dd>${n(v.frame && v.frame.median)} ms <small>p95 ${n(v.frame && v.frame.p95)}</small></dd>
      <dt>Works near</dt><dd>${soft.length}${worst ? ` <small>least sharp ${Math.round(worst.ratio * 100)}%</small>` : ''}</dd>
      <dt>Errors</dt><dd class="${v.errors.length + v.failed.length ? 'over' : ''}">${v.errors.length + v.failed.length}</dd></dl>
      ${soft.length ? `<details><summary>Sharpness</summary><table class="mini"><tr><th>Work</th><th>m</th><th>px</th><th>src</th><th>need</th><th>px/m</th></tr>${soft.map(w => `<tr class="${w.ratio < res.limit.soft ? 'over' : ''}"><td>${esc(w.title)}</td><td>${w.d}</td><td>${w.cur}</td><td>${w.src || '?'}</td><td>${w.need}</td><td>${w.pxm}</td></tr>`).join('')}</table></details>` : ''}
      </figcaption></figure>`;
    }).join('');
    return `<section class="space"><h2>${esc(s.key === 'museum' ? 'The museum' : s.key)} <small>${esc(s.hash)}</small></h2>
    ${s.fatal ? `<p class="over">Did not open: ${esc(s.fatal)}</p>` : ''}
    ${s.camera && s.camera.bad ? `<p class="over">The camera opened broken: lens ${s.camera.worstFov}° (${s.camera.bad} samples), settled after ${(s.camera.settled / 1000).toFixed(1)} s</p>` : ''}
    <p class="facts">First frame <b>${n(s.load.first && (s.load.first / 1000).toFixed(1))} s</b> · ready <b>${n(s.load.ready && (s.load.ready / 1000).toFixed(1))} s</b> ·
    checked ${n(c.objects)} standing objects, ${n(c.texts)} wall texts, ${n(c.openings)} openings, ${n(c.textures)} textures · <b>${ph.flags.length}</b> physics flags</p>
    <div class="shots">${cards}</div></section>`;
  };
  const pav = res.pavilions.map(p => `<section class="space"><h2>Pavilion: ${esc(p.slug)} beside its tour</h2>
    <p class="facts">Found by its ${p.frame.works} works (frame error ${p.frame.error} m, turned ${p.frame.turn}°${p.frame.mirror < 0 ? ', mirrored' : ''}). Limits: brightness ±${Math.round(res.limit.bright * 100)}%, colour ${res.limit.colour} levels, surface detail (floor gloss or wall grain) x${res.limit.gloss.join('–')}.</p>
    ${p.rows.map(r => `<figure class="pair"><a href="${esc(r.shot)}"><img loading="lazy" src="${esc(r.shot)}" alt="${esc(r.name)}"></a><figcaption><b>${esc(r.name)}</b> brightness ${r.bright > 0 ? '+' : ''}${Math.round(r.bright * 100)}% · colour ${r.colour} · detail x${r.gloss} ${r.flags.length ? `<span class="tag warn">${esc(r.flags.join('; '))}</span>` : '<span class="tag ok">alike</span>'}</figcaption></figure>`).join('')}</section>`).join('');
  const proof = res.proof ? `<section class="space"><h2>Proof: a known bug of each kind, put in</h2><p class="facts">The museum opened again with every bug below planted at once. A check that does not catch its bug makes its results worthless, so this runs every night.</p>
    <table><tr><th>Check</th><th>Bug put in</th><th>Result</th></tr>${res.proof.rows.map(r => `<tr><td>${esc(r.check)}</td><td>${esc(r.planted)}${r.value != null ? ` <small>(${esc(r.value)})</small>` : ''}</td><td><span class="tag ${r.caught ? 'ok' : 'bad'}">${r.caught ? 'caught' : 'missed'}</span></td></tr>`).join('')}</table>
    ${res.proof.shot ? `<figure class="shot one"><img loading="lazy" src="${esc(res.proof.shot)}" alt="the planted view" width="390" height="844"><figcaption>The planted view</figcaption></figure>` : ''}</section>` : '';
  const bad = res.flags.filter(f => f.sev === 'red').length, warn = res.flags.length - bad, reg = res.diff.filter(d => d.reg).length;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Visitor robot</title>
<style>
:root{--bg:#f6f3ee;--fg:#1d1b18;--mute:#6d675e;--line:#ddd6cb;--card:#fff;--bad:#b3261e;--badbg:#fbe9e7;--warn:#8a5a00;--warnbg:#fff3d6;--ok:#1f6b3a;--okbg:#e3f3e8}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#16140f;--fg:#ece7de;--mute:#a39b8e;--line:#3a352d;--card:#211e18;--bad:#ff8a80;--badbg:#3b1d1a;--warn:#ffcc66;--warnbg:#3a2f14;--ok:#7fd69b;--okbg:#17321f}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.45 system-ui,-apple-system,sans-serif;padding:24px 16px 60px;max-width:1280px;margin-inline:auto}
h1{font:600 28px/1.1 Georgia,serif;margin:0 0 4px}h2{font:600 20px Georgia,serif;margin:0 0 6px}h2 small{font:13px system-ui;color:var(--mute)}
.lede{color:var(--mute);margin:0 0 18px}.kpis{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 22px}.kpi{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:10px 14px;min-width:120px}
.kpi b{display:block;font-size:24px;font-variant-numeric:tabular-nums}.kpi span{color:var(--mute);font-size:13px}
table{border-collapse:collapse;width:100%;background:var(--card);border:1px solid var(--line);border-radius:8px;overflow:hidden;font-size:14px}
td,th{padding:6px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}th{color:var(--mute);font-weight:500}
.tag{display:inline-block;padding:1px 8px;border-radius:99px;font-size:12px;font-weight:600}.tag.bad,.tag.red{background:var(--badbg);color:var(--bad)}.tag.warn,.tag.yellow{background:var(--warnbg);color:var(--warn)}.tag.ok{background:var(--okbg);color:var(--ok)}
.over{color:var(--bad);font-weight:600}section{margin:30px 0}.facts{color:var(--mute);margin:0 0 12px}
.shots{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px}.shot{margin:0;background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden}
.shot img{display:block;width:100%;height:auto;aspect-ratio:390/844;object-fit:cover;background:#000}.shot.one{max-width:240px;margin-top:12px}
figcaption{padding:8px 10px;font-size:13px}dl{display:grid;grid-template-columns:auto 1fr;gap:1px 8px;margin:6px 0 0}dt{color:var(--mute)}dd{margin:0;font-variant-numeric:tabular-nums}
.mini{font-size:12px;margin-top:6px}.mini td,.mini th{padding:2px 4px}.pair{margin:0 0 16px;background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden;max-width:820px}.pair img{display:block;width:100%;height:auto}
ul.diff{padding-left:18px}ul.diff li.reg{color:var(--bad)}details summary{cursor:pointer;color:var(--mute);margin-top:6px}
</style></head><body>
<h1>Visitor robot</h1><p class="lede">${esc(res.date)} · ${esc(res.base)} · a phone at 390×844 (DPR 1, touch), the museum at ${res.hour}:00 · ${Math.round(res.seconds / 60)} min · software GL on the server (swiftshader): frame times compare night to night, not with a real phone.</p>
<div class="kpis"><div class="kpi"><b>${bad}</b><span>red</span></div><div class="kpi"><b>${warn}</b><span>yellow</span></div><div class="kpi"><b>${reg}</b><span>regressions since ${esc(res.prev || '—')}</span></div>
<div class="kpi"><b>${res.proof ? res.proof.rows.filter(r => r.caught).length + '/' + res.proof.rows.length : '–'}</b><span>checks proved tonight</span></div><div class="kpi"><b>${res.budget.memory} MB · ${res.budget.calls}</b><span>budget (NIGHT.md)</span></div></div>
<section><h2>Flags</h2>${res.flags.length ? `<table><tr><th></th><th>Where</th><th>Check</th><th>What</th></tr>${flagRows}</table>` : '<p>None.</p>'}</section>
<section><h2>Since the previous night${res.prev ? ' (' + esc(res.prev) + ')' : ''}</h2>${res.prev ? (diffRows ? `<ul class="diff">${diffRows}</ul>` : '<p>No change.</p>') : '<p>The first night: nothing to compare with yet.</p>'}</section>
${res.spaces.map(space).join('')}${pav}${proof}
</body></html>`;
}
module.exports = { writeReport };
