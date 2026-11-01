"""The art places' newsletters, signed up to with the app's mailbox, so the daily read hears of openings and new shows
by mail (exhibitions.py, mail_read).

    python3 studio/app/artmap/newsletters.py            # look: which places have a signup, of what kind (writes nothing)
    python3 studio/app/artmap/newsletters.py --sign-up  # and sign up where it is plainly a newsletter form

Each place's own site, its home page and, when there is none there, the page its own newsletter link leads to. A form
is filled only when it is plainly a newsletter signup: an email field near the words newsletter / subscribe / ניוזלטר /
דיוור, no message box, no password, no CAPTCHA, no phone or other required detail beyond a name. It gets the app's
address and the name "Open Studio", and its required consent box is ticked (consent to receive the newsletter is the
point). A place signed up to before is not signed up to again. What happened at each place goes to newsletters.json.
"""
import argparse
import datetime as dt
import json
import os
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

HERE = Path(__file__).resolve().parent
APP = HERE.parent
OUT = HERE / 'newsletters.json'
EMAIL = 'ooopenstudio@gmail.com'
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36'
KW = r'newsletter|ניוזלטר|ניוזלטר|דיוור|רשימת (?:ה)?תפוצה|עדכונים|subscribe|sign ?up|הרשמ|הירשמ|הצטרפ|mailing list|stay (?:in touch|updated)|keep in touch'
THANKS = re.compile(r'thank|thanks|תודה|נרשמת|נרשמתם|הרשמתך|ההרשמה (?:בוצעה|התקבלה|הושלמה)|success|subscribed|almost finished|confirm|אישור|check your (?:e-?mail|inbox)', re.I)
ALREADY = re.compile(r'already (?:subscribed|a (?:list )?member)|כבר רשומ', re.I)

# in the page: every email field, with what's around it and what its form asks for
SCAN = r"""(kw) => {
  const KW = new RegExp(kw, 'i');
  const vis = e => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
  const fields = [...document.querySelectorAll('input[type=email], input[name*=mail i], input[id*=mail i], input[placeholder*=mail i], input[placeholder*=מייל], input[placeholder*=דוא]')]
    .filter(e => e.type !== 'hidden' && e.type !== 'checkbox' && e.type !== 'submit');
  const out = [];
  fields.forEach((e, n) => {
    let box = e.closest('form'), text = '';
    if (!box) { for (let k = 0, x = e; k < 5 && x; k++, x = x.parentElement) { box = x; if (x.querySelector('button, input[type=submit]') && x !== e.parentElement) break; } }
    // what the field is for: its form's own words and the heading just before the form; a field with no form, the
    // few boxes around it
    const f = e.closest('form');
    if (f) {
      let pre = '', s = f;
      for (let k = 0; k < 3 && !pre; k++) { let p = s.previousElementSibling; while (p && !pre) { pre = (p.innerText || '').trim().slice(0, 160); p = p.previousElementSibling; } s = s.parentElement; if (!s) break; }
      text = (pre + ' ' + (f.innerText || '')).slice(0, 500);
    } else {
      for (let k = 0, x = e; k < 4 && x; k++, x = x.parentElement) { text = (x.innerText || '').slice(0, 500); if (KW.test(text)) break; }
    }
    const inputs = [...box.querySelectorAll('input, textarea, select')].filter(x => x.type !== 'hidden' && x.type !== 'submit' && x.type !== 'button');
    e.setAttribute('data-os-email', String(n));
    out.push({
      n, visible: vis(e), form: !!e.closest('form'), action: (e.closest('form') || {}).action || '',
      text: text.replace(/\s+/g, ' ').trim().slice(0, 240),
      newsletter: KW.test(text) || KW.test(e.placeholder || '') || KW.test(e.name || '') || /newsletter|subscribe|mc-embedded|mailchimp/i.test((e.closest('form') || {}).className + ' ' + ((e.closest('form') || {}).action || '')),
      inputs: inputs.map(x => ({ tag: x.tagName.toLowerCase(), type: x.type, name: x.name || x.id || '', ph: x.placeholder || '', req: !!(x.required || x.getAttribute('aria-required') === 'true'), vis: vis(x),
                                 label: ((x.labels && x.labels[0] && x.labels[0].innerText) || '').replace(/\s+/g, ' ').slice(0, 80) })),
    });
  });
  const captcha = !!document.querySelector('iframe[src*=recaptcha], iframe[src*=hcaptcha], iframe[src*=turnstile], .g-recaptcha, .h-captcha, .cf-turnstile');
  const links = [...document.querySelectorAll('a[href]')].filter(a => (KW.test(a.innerText || '') && (a.innerText || '').length < 60) || /newsletter|subscribe|ניוזלטר|דיוור/i.test(decodeURIComponent(a.href)))
    .map(a => a.href).filter(h => /^https?:/.test(h) && !/facebook|instagram|twitter|x\.com|youtube|whatsapp|wa\.me|linkedin|tiktok/i.test(h));
  return { fields: out, captcha, links: [...new Set(links)].slice(0, 6), title: document.title };
}"""


def safe(f, captcha):
    """Why this form is not filled in, or '' when it plainly is a newsletter signup."""
    if not f['newsletter']:
        return 'not a newsletter'
    if not f['visible']:
        return 'hidden'
    if captcha:
        return 'captcha'
    ins = [x for x in f['inputs'] if x['vis']]
    if any(x['tag'] == 'textarea' for x in ins):
        return 'a message form'
    if any(x['type'] == 'password' for x in ins):
        return 'a login'
    if any(x['type'] in ('tel', 'number', 'date') and x['req'] for x in ins) or any(re.search(r'phone|tel|טלפון|נייד', x['name'] + x['ph'] + x['label'], re.I) and x['req'] for x in ins):
        return 'asks for a phone'
    if any(x['tag'] == 'select' and x['req'] for x in ins):
        return 'asks to choose'
    if len([x for x in ins if x['type'] not in ('checkbox', 'radio')]) > 4:
        return 'a long form'
    return ''


def fill(page, f):
    """Fill one newsletter form and send it; what the page says after."""
    email = page.locator(f'[data-os-email="{f["n"]}"]')
    box = email.locator('xpath=ancestor::form[1]') if f['form'] else email.locator('xpath=ancestor::*[.//button or .//input[@type="submit"]][1]')
    email.fill(EMAIL)
    for i in range(box.locator('input:visible').count()):
        x = box.locator('input:visible').nth(i)
        t = (x.get_attribute('type') or 'text').lower()
        key = ' '.join(filter(None, [x.get_attribute('name'), x.get_attribute('id'), x.get_attribute('placeholder')])).lower()
        if t in ('text', '') and not x.input_value():
            if re.search(r'last|lname|surname|משפחה', key):
                x.fill('Studio')
            elif re.search(r'name|fname|first|שם', key):
                x.fill('Open' if re.search(r'first|fname|פרטי', key) else 'Open Studio')
        elif t == 'checkbox' and not x.is_checked():
            req = x.get_attribute('required') is not None or x.get_attribute('aria-required') == 'true'
            near = (x.evaluate("e => (e.closest('label') || e.parentElement || {}).innerText || ''") or '')
            if req or re.search(r'agree|consent|מאשר|מסכים|מסכימ|לקבל|newsletter|ניוזלטר|דיוור|עדכונים|terms|תקנון|privacy|פרטיות', near, re.I):
                try:
                    x.check(timeout=3000)
                except Exception:
                    x.evaluate('e => { e.checked = true; e.dispatchEvent(new Event("change", {bubbles: true})); }')
    before = page.evaluate('document.body.innerText')
    btn = box.locator('button:visible, input[type=submit]:visible, [role=button]:visible')
    if btn.count():
        btn.last.click(timeout=8000)
    else:
        email.press('Enter')
    page.wait_for_timeout(6000)
    after = page.evaluate('document.body.innerText')
    new = after.replace(before, '') if before in after else after
    if ALREADY.search(new):
        return 'already subscribed', new
    if THANKS.search(new) or (email.count() and not email.input_value()) or not email.count():
        return 'signed up', new
    if re.search(r'error|invalid|שגיאה|לא תקין|required|חובה', new, re.I):
        return 'refused', new
    return 'sent (no answer seen)', new


def look(ctx, url, sign_up):
    page = ctx.new_page()
    try:
        page.goto(url, timeout=35000, wait_until='domcontentloaded')
        page.wait_for_timeout(3000)
        page.evaluate('window.scrollTo(0, document.body.scrollHeight)')
        page.wait_for_timeout(1500)
        got = page.evaluate(SCAN, KW)
        got['url'] = page.url
        for f in got['fields']:
            f['why_not'] = safe(f, got['captcha'])
        ok = [f for f in got['fields'] if not f['why_not']]
        if sign_up and ok:
            f = ok[0]
            try:
                got['result'], said = fill(page, f)
                got['said'] = re.sub(r'\s+', ' ', said).strip()[:300]
            except Exception as e:
                got['result'] = f'failed: {type(e).__name__}: {str(e).splitlines()[0][:100]}'
        return got
    except Exception as e:
        return {'url': url, 'error': f'{type(e).__name__}: {str(e).splitlines()[0][:120]}'}
    finally:
        page.close()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--sign-up', action='store_true')
    ap.add_argument('--only', help='these places only (comma-separated ids)')
    a = ap.parse_args()
    from playwright.sync_api import sync_playwright
    places = [p for p in json.loads((APP / 'data' / 'art' / 'places.json').read_text())['places'] if p.get('website') and p.get('status') != 'closed']
    if a.only:
        places = [p for p in places if p['id'] in a.only.split(',')]
    done = json.loads(OUT.read_text()) if OUT.exists() else {}
    today = dt.date.today().isoformat()
    with sync_playwright() as pw:
        b = pw.chromium.launch(executable_path=os.environ.get('PW_CHROMIUM') or None)
        ctx = b.new_context(viewport={'width': 1280, 'height': 900}, locale='he-IL', user_agent=UA)
        for p in places:
            prev = done.get(p['id'], {})
            if prev.get('status') in ('signed up', 'already subscribed', 'confirmed'):
                print(f"{p['id']:<44} {prev['status']} (on {prev.get('day')})")
                continue
            sign = a.sign_up
            r = look(ctx, p['website'], sign)
            if not any(not f['why_not'] for f in r.get('fields', [])) and r.get('links'):
                site = urlparse(r.get('url', p['website'])).netloc.replace('www.', '')
                link = next((h for h in r['links'] if urlparse(h).netloc.replace('www.', '') == site), r['links'][0])
                r2 = look(ctx, link, sign)
                r2['from'] = 'link'
                if any(not f['why_not'] for f in r2.get('fields', [])) or not r.get('fields'):
                    r = r2
            ok = [f for f in r.get('fields', []) if not f['why_not']]
            status = r.get('result') or ('can sign up' if ok else r.get('error') and 'site unreachable'
                                         or next((f['why_not'] for f in r.get('fields', []) if f['newsletter']), None)
                                         or ('a newsletter link, no form' if r.get('links') else 'no newsletter found'))
            rec = {'name': p['name'], 'site': p['website'], 'page': r.get('url'), 'status': status, 'day': today}
            if r.get('said'):
                rec['said'] = r['said']
            if r.get('links'):
                rec['links'] = r['links'][:3]
            if ok:
                rec['form'] = {'text': ok[0]['text'][:160], 'inputs': [f"{x['type']}:{x['name']}{'*' if x['req'] else ''}" for x in ok[0]['inputs'] if x['vis']]}
            done[p['id']] = rec
            print(f"{p['id']:<44} {status}", flush=True)
        b.close()
    if a.sign_up:
        OUT.write_text(json.dumps(done, ensure_ascii=False, indent=1))
    else:
        print(json.dumps(done, ensure_ascii=False, indent=1))
    n = {}
    for v in done.values():
        n[v['status']] = n.get(v['status'], 0) + 1
    print(json.dumps(n, ensure_ascii=False), file=sys.stderr)


if __name__ == '__main__':
    main()
