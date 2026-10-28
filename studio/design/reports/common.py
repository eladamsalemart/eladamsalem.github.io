import re
"""Shared look for the two department reports (business, product): A4 portrait, Hebrew, the Open Studio paper style."""

LOGO = '<svg viewBox="0 0 132 132" width="30" height="30"><rect x="8" y="8" width="116" height="116" rx="36" fill="#1F2A44"/><path d="M42 106 V62 a24 24 0 0 1 48 0 V106 Z" fill="#F5C9B8"/></svg>'

CSS = '''@page{size:A4;margin:0}
*{box-sizing:border-box}
body{margin:0;font-family:'Assistant',sans-serif;color:#1B1A17;font-size:11.6pt;line-height:1.52;background:#fff}
.page{width:210mm;height:297mm;padding:15mm 15mm 13mm;position:relative;overflow:hidden;page-break-after:always;background:#fff}
.page.paper{background:#EFE9DD}.page.ink{background:#1B1A17;color:#F6F1E7}
h1{font-family:'Frank Ruhl Libre',serif;font-weight:500;font-size:34pt;line-height:1.05;margin:0 0 4mm}
h2{font-family:'Frank Ruhl Libre',serif;font-weight:500;font-size:24pt;line-height:1.12;margin:0}
h3{font-size:13pt;margin:5mm 0 1.6mm}
h4{font-size:11.6pt;margin:2.5mm 0 .8mm}
p{margin:1.2mm 0}ul,ol{margin:1mm 0;padding-right:5mm}li{margin:.7mm 0}
.k{font-family:'IBM Plex Mono',monospace;font-size:8.6pt;letter-spacing:.12em;color:#5E594F;text-transform:uppercase}
.ink .k{color:#BDB6A8}
.head{border-bottom:1.5px solid #1B1A17;padding-bottom:2.5mm;margin-bottom:4.5mm;display:flex;justify-content:space-between;align-items:flex-end;gap:6mm}
.head .dept{font-family:'IBM Plex Mono',monospace;font-size:7pt;color:#8F877A;letter-spacing:.08em;white-space:nowrap}
.foot{position:absolute;bottom:6mm;left:15mm;right:15mm;display:flex;justify-content:space-between;font-family:'IBM Plex Mono',monospace;font-size:6.8pt;color:#8F877A}
.lead{font-size:13.6pt;line-height:1.45}
.big{font-family:'Frank Ruhl Libre',serif;font-size:17pt;line-height:1.35}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:7mm}.cols3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5mm}
.box{background:#EFE9DD;padding:3mm 4mm;margin:2.5mm 0}.box.g{background:#E3EDE7}.box.r{background:#F4E4DD}.box.yel{background:#F3EBD3}
.box h4:first-child,.box h3:first-child{margin-top:0}
.card{border:1px solid #CFC7B6;padding:3mm 3.5mm}
.num{font-family:'Frank Ruhl Libre',serif;font-size:30pt;line-height:1;color:#2F6B4F}
.stat{display:grid;gap:.5mm}.stat span{font-size:9.8pt;color:#5E594F}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:4mm;margin:3mm 0}
table{width:100%;border-collapse:collapse;font-size:10pt;margin:2.5mm 0}
th,td{border-bottom:1px solid #CFC7B6;padding:2mm 1.6mm;text-align:right;vertical-align:top}
th{font-weight:700;border-bottom:1.5px solid #1B1A17;font-size:9.8pt}
td.c,th.c{text-align:center}
.y{color:#2F6B4F;font-weight:700}.n{color:#A3503F;font-weight:700}.m{color:#8F7340;font-weight:700}
.tag{display:inline-block;font-family:'IBM Plex Mono',monospace;font-size:8.2pt;padding:.3mm 1.6mm;border:1px solid #1B1A17;margin-left:1mm}
.tag.g{border-color:#2F6B4F;color:#2F6B4F}.tag.r{border-color:#A3503F;color:#A3503F}.tag.y{border-color:#8F7340;color:#8F7340}
.ltr{direction:ltr;unicode-bidi:embed}
.src{font-size:8.2pt;color:#5E594F}
.est{font-size:8.4pt;color:#8F7340}
.bars{display:grid;gap:1.6mm;margin:2mm 0}
.bar{display:grid;grid-template-columns:52mm 1fr 18mm;align-items:center;gap:2.5mm;font-size:10pt}
.bar i{display:block;height:6mm;background:#2F6B4F;border-radius:0 1mm 1mm 0}
.bar i.l{background:#9DB8A8}.bar b{font-weight:600;text-align:left;direction:ltr}
.quote{border-right:3px solid #2F6B4F;padding:1.5mm 5mm;margin:4mm 0;font-family:'Frank Ruhl Libre',serif;font-size:15pt;line-height:1.4}
.steps{counter-reset:s;display:grid;gap:3mm}
.step{display:grid;grid-template-columns:9mm 1fr;gap:2mm;align-items:start}
.step:before{counter-increment:s;content:counter(s);font-family:'Frank Ruhl Libre',serif;font-size:19pt;color:#2F6B4F;line-height:1}
.roles{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm}
.role{border:1px solid #CFC7B6;padding:3mm 3.5mm;font-size:9.8pt}.role b{display:block;font-size:11pt}
.map{position:relative;height:96mm;border:1px solid #CFC7B6;background:#FBF8F2;margin:2mm 0}
.map .ax{position:absolute;font-family:'IBM Plex Mono',monospace;font-size:6.8pt;color:#5E594F}
.map .dot{position:absolute;transform:translate(50%,-50%);font-size:9.6pt;font-weight:600;white-space:nowrap;display:flex;align-items:center;gap:1.2mm}
.map .dot:before{content:"";width:3mm;height:3mm;border-radius:50%;background:#8F877A;display:block}
.map .dot.us:before{background:#2F6B4F;width:4.2mm;height:4.2mm}
.map .dot.us{color:#2F6B4F;font-size:9pt}
.cover h1{font-size:40pt;margin-top:30mm}
.cover .logo{display:flex;align-items:center;gap:2.5mm;direction:ltr;justify-content:flex-end;font-family:'Figtree',sans-serif;font-weight:700;font-size:15pt}
.toc li{margin:1.4mm 0;font-size:10.5pt}
.tl{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-top:2px solid #1B1A17;margin:3mm 0}
.tl>div{padding:3mm 3mm 0;border-left:1px dashed #CFC7B6;font-size:10pt}.tl>div:last-child{border-left:0}
.tl b{display:block;font-size:11.4pt;margin-bottom:1mm}.tl .k{display:block;margin-bottom:1mm}
.sm{font-size:10.4pt}
.xs{font-size:9.4pt;line-height:1.45}
.cv{display:inline-block;font-family:'IBM Plex Mono',monospace;font-size:6.6pt;letter-spacing:.02em;padding:0 1.1mm;border:1px solid #8F877A;color:#5E594F;margin-right:1mm;vertical-align:1px;white-space:nowrap}
.cv.v{border-color:#2F6B4F;color:#2F6B4F}.cv.e{border-color:#8F7340;color:#8F7340}
.phones{display:flex;gap:3mm;justify-content:flex-start;margin:2.5mm 0}
.phones figure{margin:0;flex:1;text-align:center}.phones img{width:100%;border:1px solid #CFC7B6;border-radius:2.5mm;display:block}
.phones figcaption{font-size:8.6pt;color:#5E594F;margin-top:1mm}
.mono{font-family:'IBM Plex Mono',monospace;font-size:8.4pt;direction:ltr;text-align:left;background:#1B1A17;color:#F6F1E7;padding:2.5mm 3.5mm;white-space:pre-wrap;line-height:1.5}
.two{display:grid;grid-template-columns:1.25fr 1fr;gap:6mm;align-items:start}
.chk li{list-style:none;position:relative}.chk{padding-right:5mm}.chk li:before{content:"☐";position:absolute;right:-5mm;color:#2F6B4F}
table.tight td,table.tight th{padding:1.3mm 1.4mm}'''

FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@500;700&family=Assistant:wght@400;600;700&family=Figtree:wght@700&family=IBM+Plex+Mono:wght@500&display=swap">'


def doc(title, pages, dept, date='אוקטובר 2026'):
    out = []
    for i, (kicker, heading, body, cls) in enumerate(pages):
        if cls == 'raw':
            out.append(body)
            continue
        out.append(f'''<section class="page {cls}"><div class="head"><div><div class="k">{kicker}</div><h2>{heading}</h2></div><div class="dept">{dept}</div></div>
{body}<div class="foot"><span>Open Studio · {dept}</span><span>{date} · עמוד {i + 1}</span></div></section>''')
    # numeric ranges ("1,750–2,500") keep their order inside Hebrew text
    body = re.sub(r'(?<![\w-])([$₪]?\d[\d,.]*[KMB%$]?)\s?–\s?([$₪]?\d[\d,.]*[KMB%$]?)', r'<bdi dir="ltr">\1–\2</bdi>', ''.join(out))
    return f'''<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>{title}</title>{FONTS}<style>{CSS}</style></head><body>{body}</body></html>'''


def g(k):
    """certainty tag: v verified, s secondary, e estimate"""
    return {'v': '<span class="cv v">מאומת</span>', 's': '<span class="cv">משני</span>', 'e': '<span class="cv e">הערכה</span>'}[k]


def bars(rows, unit='%', maxv=None):
    """Single-series horizontal bars, one hue: label, value (light=True for a reference row)."""
    m = maxv or max(r[1] for r in rows)
    return '<div class="bars">' + ''.join(
        f'<div class="bar"><span>{r[0]}</span><i class="{"l" if len(r) > 2 and r[2] else ""}" style="width:{max(1.5, r[1] / m * 100):.1f}%"></i><b>{r[1]:,}{unit}</b></div>' for r in rows) + '</div>'
