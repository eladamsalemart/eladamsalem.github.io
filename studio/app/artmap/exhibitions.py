"""What's on at Israel's art places today, for the map: exhibitions (with their dates) and openings and gallery talks.

Run daily on the server ("Art map: exhibitions"), and by hand:
    python3 studio/app/artmap/exhibitions.py [--offline dir]   (dir: saved pages named by sources.tsv ids)

Where it reads from (sources.tsv): each art place's own website, the page where it lists what's on. One reader
fits most of them: a title, then its dates ("01.08.26 - 27.02.27", "10.06.2026 - 26.12.2026", "ננעלת בתאריך 31.10",
"פתיחה 8.10.2026 || נעילה 31.10.2026"). Lines that are courses, lectures, workshops or screenings are left out;
openings and gallery talks are kept as events. Every source's yield is written to exhibitions.health.json, so a
site that changes its pages shows up as a source that went quiet, not as a map that silently empties.

Manners: robots.txt is obeyed, one request per site every few seconds, a user agent that says who we are, and
only facts are kept (title, artists, dates, link back); no texts or images are copied.
"""
import argparse
import datetime as dt
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
import urllib.robotparser
from pathlib import Path
from urllib.parse import unquote, urlparse

HERE = Path(__file__).resolve().parent
APP = HERE.parent
OUT = APP / 'data' / 'art' / 'exhibitions.json'
HEALTH = APP / 'data' / 'art' / 'exhibitions.health.json'
UA = 'Mozilla/5.0 (compatible; OpenStudio-artmap/1.0; +https://eladamsalem.com/open-studio/)'

NOT_SHOW = re.compile(r'סדנ|הרצא|קורס|חוג|הקרנ|סרט|סיור|ילדים|משפחה|כרטיס|שעות|סגור|הרשמ|ניוזלטר|קונצרט|הופע|ג\'אז|ג׳אז|'
                      r'workshop|lecture|course|tour|screening|film|concert|ticket|closed|הבחירות|חניה|יום הולדת|halloween', re.I)
EVENT = re.compile(r'שיח גלריה|שיח אמן|פתיחת התערוכה|פתיחת תערוכה|פתיחה חגיגית|gallery talk|opening', re.I)
NAV = re.compile(r'^(תערוכות|תערוכה נוכחית|תערוכות נוכחיות|תערוכות רצות|לוח אירועים|אירועים|מידע נוסף|למאמר המלא|לכל התערוכות|'
                 r'אירועים מיוחדים|הרצאות|קורסים|ילדים ומשפחה|קולנוע|>|<|חדשות|exhibitions|current|more|read more)\s*/?$', re.I)

D = r'(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?'
# words that sit next to a date but are not a show's name
NOT_TITLE = re.compile(r'^ה?תערוכה (?:מוצגת|נפתחת|ננעלת|תיפתח|תינעל|פתוחה)\b|'
                       r'^(?:ה?תערוכ(?:ה|ות)(?: נוכחי(?:ת|ות)| ננעלת| נפתחת)?|the exhibition|exhibitions?|current(?: exhibitions?)?|now(?: on)?|on view|showroom|gallery|home|'
                       r'search|menu|dates?|תאריכים|תאריך|מועד|שעות(?: פתיחה)?|כתובת|address|more|לפרטים|קראו עוד|read more)\s*:?$|'
                       r'^(?:about|contact|support us|newsletter|join|shop|תמכו בנו|צרו קשר|אודות|הצטרפו|חנות)\s*$|'
                       r'^(?:(?:אירוע |טקס )?פתיחה|פתיחת|נעילה|שיח גלריה|שיח אמן|opening|closing|gallery talk|בהשתתפות|משתתפים|with|עם)\b|'
                       r'^(?:עוזר(?:ת)? )?(?:אוצר|אוצרת|אוצרות|אוצרים|curator|curated|assistant curator|עיצוב|צילום|photo)|'
                       r'כתובת:|\d+,\s*[^,]+\.?$', re.I)


# dates written in words, in English and Hebrew ("Jul 31 – Oct 31, 2026", "8 באוקטובר 2026"): turned into numbers
MONTHS = {'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
          'ינואר': 1, 'פברואר': 2, 'מרץ': 3, 'מרס': 3, 'אפריל': 4, 'מאי': 5, 'יוני': 6, 'יולי': 7, 'אוגוסט': 8, 'ספטמבר': 9,
          'אוקטובר': 10, 'נובמבר': 11, 'דצמבר': 12}
MON = r'(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept?|oct|nov|dec|' \
      r'[בל]?(?:ינואר|פברואר|מרץ|מרס|אפריל|מאי|יוני|יולי|אוגוסט|ספטמבר|אוקטובר|נובמבר|דצמבר))\.?'


def month(w):
    w = w.lower().rstrip('.')
    w = w[1:] if w[:1] in 'בל' and w[1:] in MONTHS else w
    return MONTHS.get(w) or MONTHS.get(w[:3])


fd = lambda d, m, y: f"{d}.{m}" + (f".{y}" if y else "")


def numeric_dates(line):
    """'Jul 31 – Oct 31, 2026' → '31.7.2026 – 31.10.2026'; '8–21 November 2026' → '8.11.2026 – 21.11.2026'."""
    if not re.search(MON, line, re.I):
        return line
    years = re.findall(r'\b(20\d\d)\b', line)
    y = years[-1] if years else ''
    # "8–21 November 2026": the first day takes the second's month
    line = re.sub(r'\b(\d{1,2})\s*[-–—]\s*(\d{1,2})\s+' + MON + r'(?:,?\s*(20\d\d))?',
                  lambda m: f"{fd(m[1], month(m[3]), m[4] or y)} – {fd(m[2], month(m[3]), m[4] or y)}", line, flags=re.I)
    # "Nov 8 – 21, 2026"
    line = re.sub(MON + r'\s+(\d{1,2})\s*[-–—]\s*(\d{1,2})(?:,?\s*(20\d\d))?\b',
                  lambda m: f"{fd(m[2], month(m[1]), m[4] or y)} – {fd(m[3], month(m[1]), m[4] or y)}", line, flags=re.I)
    line = re.sub(r'\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?' + MON + r'(?:,?\s*(20\d\d))?',
                  lambda m: fd(m[1], month(m[2]), m[3] or y), line, flags=re.I)
    line = re.sub(MON + r'\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(20\d\d))?\b',
                  lambda m: fd(m[2], month(m[1]), m[3] or y), line, flags=re.I)
    return line


def ymd(d, m, y, ref):
    d, m = int(d), int(m)
    if y:
        y = int(y)
        y = y + 2000 if y < 100 else y
    else:                                             # no year: the next such date from about a year back
        y = ref.year
        try:
            if dt.date(y, m, d) < ref - dt.timedelta(days=200):
                y += 1
        except ValueError:
            return None
    try:
        return dt.date(y, m, d)
    except ValueError:
        return None


def text_lines(page):
    t = re.sub(r'<(script|style|noscript|svg)[\s\S]*?</\1>', ' ', page, flags=re.I)
    t = re.sub(r'<br\s*/?>|</(p|div|li|h\d|a|span|td|tr|section|article)>', '\n', t, flags=re.I)
    t = html.unescape(re.sub(r'<[^>]+>', ' ', t))
    return [re.sub(r'\s+', ' ', x).strip() for x in t.split('\n') if x.strip()]


def clean_title(s):
    s = re.sub(r'\s*/\s*$', '', s).strip(' -–|·:←→')
    s = re.sub(r'^(תערוכה נוכחית|תערוכה|exhibition)\s*[:|]\s*', '', s, flags=re.I)
    return s.strip()


def split_artist(title):
    """"Artist | "Title"" or "Artist: Title" -> (title, [artist]) when it reads that way."""
    m = re.match(r'^([^|"“”]{3,40})\s*\|\s*["“”](.+?)["“”]$', title)
    if m and not re.search(r'\d', m.group(1)):
        return m.group(2).strip(), [m.group(1).strip()]
    return title, []


def extract_colon_list(lines, today):
    """Pages that list each show as "Title: Artist" over its curator, under one shared "פתיחה d || נעילה d" line."""
    m = next((re.search(r'פתיחה\D{0,4}' + D + r'.{0,12}?נעילה\D{0,4}' + D, l) for l in lines
              if re.search(r'פתיחה\D{0,4}' + D + r'.{0,12}?נעילה', l)), None)
    if not m:
        return []
    start, end = ymd(*m.groups()[:3], today), ymd(*m.groups()[3:6], today)
    if not end or end < today - dt.timedelta(days=1):
        return []
    out = []
    for i, line in enumerate(lines[:-1]):                # "Title: Artist", then "אוצר/ת: Curator"
        if ':' in line and len(line) < 120 and re.match(r'^(אוצר|אוצרת|אוצרים|curator)', lines[i + 1], re.I):
            parts = [p.strip() for p in line.split(':')]
            if parts[0] and not NAV.match(parts[0]):
                out.append({'title': parts[0], 'artists': [parts[1]] if len(parts) > 1 and parts[1] else [],
                            'start': start.isoformat() if start else None, 'end': end.isoformat()})
    return out


def extract(lines, today):
    """Exhibitions and events in a page's lines: [{title, artists, start, end}] and [{title, at}]."""
    shows, events = [], []
    lines = [numeric_dates(x) for x in lines]
    for i, line in enumerate(lines):
        if len(line) > 140:
            continue
        rng = re.search(D + r'\s*(?:-|–|—|עד)\s*(?:\S+,\s*)?' + D, line)
        close = re.search(r'(?:ננעלת|נעילה|נועלת|closes|until|^עד)\D{0,20}' + D, line, re.I)
        opens = re.search(r'(?:פתיחה|opening)\D{0,6}' + D, line, re.I)
        one = re.search(r'(?:^|\s|,)' + D + r'(?:,\s*(\d{1,2}:\d{2}))?\s*$', line)
        start = end = None
        if rng:
            start, end = ymd(*rng.groups()[:3], today), ymd(*rng.groups()[3:6], today)
        elif close:
            end = ymd(*close.groups()[:3], today)
            start = ymd(*opens.groups()[:3], today) if opens else None
        # the title: on the date's own line before it ("Summertime — Jul 31 – Oct 31"), else the nearest line above
        # that is not navigation, a date or a curator
        title = None
        m0 = rng or close
        pre = clean_title(line[:m0.start()]).strip(' —–-|,(') if m0 else ''
        pre = '' if re.fullmatch(r'(?:(?:יום\s+)?(?:ראשון|שני|שלישי|רביעי|חמישי|שישי|שבת|א|ב|ג|ד|ה|ו)\'?|mon|tue|wed|thu|fri|sat|sun)'
                                 r'[a-z]*\.?,?\s*(?:\d{1,2}:\d{2})?', pre, re.I) else pre
        if len(pre) >= 3 and not NOT_TITLE.search(pre) and not re.fullmatch(r'[\d./\s,:-]+', pre) and not re.search(r'(?:ננעלת|נעילה|נועלת|closes|until|עד|פתיחה|opening)\s*$', pre, re.I):
            title = pre
        for j in range(i - 1, max(-1, i - 4), -1):
            if title:
                break
            c = clean_title(lines[j])
            if not c or NAV.match(c) or NOT_TITLE.search(c) or re.fullmatch(r'[\d./\s,:-]+', c) or re.match(r'^(אוצר|אוצרת|curator|צילום)', c, re.I):
                continue
            title = c
            break
        if not title or len(title) < 2 or len(title) > 110:
            continue
        if not end and opens and re.fullmatch(r'(?:פתיחה|opening)\D{0,6}' + D + r'\s*', line, re.I) and not NOT_SHOW.search(title):
            start = ymd(*opens.groups()[:3], today)
            if start and today < start <= today + dt.timedelta(days=120):
                t, artists = split_artist(title)
                shows.append({'title': t, 'artists': artists, 'start': start.isoformat(), 'end': None})
            continue
        if end:
            if NOT_SHOW.search(title) or (start and (end - start).days > 1100) or end < today - dt.timedelta(days=1):
                continue
            if start and start > today + dt.timedelta(days=120):
                continue
            t, artists = split_artist(title)
            shows.append({'title': t, 'artists': artists, 'start': start.isoformat() if start else None, 'end': end.isoformat()})
        elif one and EVENT.search(title):
            at = ymd(*one.groups()[:3], today)
            if at and today <= at <= today + dt.timedelta(days=60):
                events.append({'title': title, 'date': at.isoformat(), 'time': one.group(4) or ''})
    # one show per title (a page lists the same show in more than one block)
    seen, out = set(), []
    for s in shows:
        if s['title'] not in seen:
            seen.add(s['title'])
            out.append(s)
    ev, seen = [], set()
    for e in events:
        if (e['title'], e['date']) not in seen:
            seen.add((e['title'], e['date']))
            ev.append(e)
    return out, ev


# --- fetching, with manners -----------------------------------------------------------------------------------
_robots, _last = {}, {}


def allowed(url):
    host = urlparse(url).scheme + '://' + urlparse(url).netloc
    if host not in _robots:
        rp = urllib.robotparser.RobotFileParser(host + '/robots.txt')
        try:
            req = urllib.request.Request(host + '/robots.txt', headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=20) as r:
                rp.parse(r.read().decode('utf-8', 'ignore').splitlines())
        except Exception:
            rp.parse([])                              # no robots.txt: allowed
        _robots[host] = rp
    return _robots[host].can_fetch(UA, url) and _robots[host].can_fetch('OpenStudio-artmap', url)


def fetch(url):
    host = urlparse(url).netloc
    wait = 5 - (time.time() - _last.get(host, 0))
    if wait > 0:
        time.sleep(wait)
    _last[host] = time.time()
    req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept-Language': 'he,en'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode('utf-8', 'ignore')


# --- a page that builds itself in the browser (most museums' sites now): read as a visitor's browser shows it ---
_browser = []


def render(url):
    """The page's text once a real browser has run it (Playwright's Chromium), one line per line on the screen.
    Links whose text the page cuts short ("…") are given their whole title from the link itself."""
    pg = open_page(url)
    try:
        text = pg.inner_text('body')
        cut = pg.eval_on_selector_all('a', "as => as.flatMap(a => a.innerText.split('\\n').filter(t => /…\\s*←?$/.test(t.trim())).map(t => [t.trim(), a.href]))")
    finally:
        pg.close()
    # a title the list cuts short ("…"): its whole name from the show's own page
    full = {}
    for t, href in cut[:12]:
        try:
            q = open_page(href)
            h1 = q.eval_on_selector('h1', 'e => e.innerText.trim()') if q.query_selector('h1') else ''
            q.close()
            if h1 and h1.startswith(t.rstrip('… ←')[:12]):
                full[t.rstrip('… ←')] = h1.split('\n')[0]
        except Exception:
            pass
    lines = [re.sub(r'\s+', ' ', x).strip() for x in text.split('\n') if x.strip()]
    return [full.get(x.rstrip('… ←'), x) for x in lines]


def open_page(url):
    """A page in the browser, loaded and given a moment to build itself (five seconds between pages of a site)."""
    from playwright.sync_api import sync_playwright        # installed in the workflow; optional elsewhere
    if not _browser:
        import glob
        pw = sync_playwright().start()
        exe = sorted(glob.glob('/opt/pw-browsers/chromium-*/chrome-linux*/chrome'))
        _browser.append(pw)
        _browser.append(pw.chromium.launch(executable_path=exe[-1] if exe and not os.environ.get('CI') else None))
    host = urlparse(url).netloc
    wait = 5 - (time.time() - _last.get(host, 0))
    if wait > 0:
        time.sleep(wait)
    _last[host] = time.time()
    pg = _browser[1].new_page(user_agent=UA, locale='he-IL')
    try:
        pg.goto(url, wait_until='load', timeout=45000)
        try:
            pg.wait_for_load_state('networkidle', timeout=8000)
        except Exception:
            pass
        pg.wait_for_timeout(1500)
    except Exception:
        pg.close()
        raise
    return pg


def render_links(url, pattern):
    """The shows on a page that lists what's on now, one link each (links whose path matches pattern): each show's
    title from a heading in or around its link (else the link's first line), its artists from the link's next line."""
    pg = open_page(url)
    try:
        items = pg.eval_on_selector_all('a', '''as => as.map(a => {
          const h = a.querySelector('h1,h2,h3,h4,h5');
          let box = a, head = h && h.innerText;
          for (let i = 0; !head && i < 4 && box.parentElement; i++) { box = box.parentElement; const x = box.querySelector('h1,h2,h3,h4,h5'); if (x && box.querySelectorAll('a[href]').length <= 4) head = x.innerText; }
          return { href: a.href, text: a.innerText.trim(), head: (head || '').trim() };
        })''')
    finally:
        pg.close()
    out, seen = [], set()
    for it in items:
        path = unquote(urlparse(it['href']).path)
        if not re.search(pattern, path) or it['href'] in seen:
            continue
        seen.add(it['href'])
        lines = [x.strip() for x in it['text'].split('\n') if x.strip()]
        generic = not lines or re.fullmatch(r'[←→<> ]*(קראו עוד|קרא עוד|לפרטים|read more|more)[←→<> ]*', lines[0], re.I)
        head = [x.strip() for x in it['head'].split('\n') if x.strip()]
        if head and len(head) > 1 and not lines[1:2]:
            lines = head
        title = clean_title(head[0] if head else '' if generic else lines[0])
        if not title:
            title = re.sub(r'[-_]+', ' ', path.rstrip('/').split('/')[-1]).replace(' :', ':').strip().capitalize()
        if NOT_SHOW.search(title) or len(title) > 110:
            continue
        artists = [a.strip() for a in lines[1].split(',')][:12] if len(lines) > 1 and not generic and len(lines[1]) < 160 and title != clean_title(lines[1]) else []
        out.append({'title': title, 'artists': artists, 'start': None, 'end': None})
    return out


CURRENT = re.compile(r'current|on.?view|now.?showing|נוכחי|עכשיו|מוצג', re.I)
LISTS = re.compile(r'exhibition|תערוכ', re.I)
PAST = re.compile(r'past|archive|previous|עבר|ארכיון|catalog|press|shop|artists?/', re.I)


def auto_read(place, today):
    """What's on at a place that has no source of its own: its website as a browser shows it, the home page and the
    page it links to for what's on now (else for exhibitions). Only shows with dates are kept: a place's site
    without dates says nothing sure about today."""
    site = re.sub(r'^http://', 'https://', place['website'].strip())
    if not site.startswith('http'):
        site = 'https://' + site
    if not allowed(site):
        return [], [], 'robots.txt says no'
    try:
        pg = open_page(site)
    except Exception:
        if not place['website'].startswith('http://'):
            raise
        pg = open_page(place['website'])                # a site still only on http
    try:
        lines = [re.sub(r'\s+', ' ', x).strip() for x in pg.inner_text('body').split('\n') if x.strip()]
        links = pg.eval_on_selector_all('a', 'as => as.map(a => [a.innerText.trim().slice(0, 60), a.href])')
        home = pg.url
    finally:
        pg.close()
    host = urlparse(home).netloc.replace('www.', '')
    score = lambda t, h: (3 if CURRENT.search(t) or CURRENT.search(h) else 1 if LISTS.search(t) or LISTS.search(urlparse(h).path) else 0)
    cands = sorted({h.split('#')[0]: score(t, h) for t, h in links
                    if urlparse(h).netloc.replace('www.', '') == host and not PAST.search(unquote(h)) and score(t, h)
                    and h.split('#')[0].rstrip('/') != home.split('#')[0].rstrip('/')}.items(), key=lambda x: -x[1])
    found, evs = extract(lines, today)
    found = merge(found, model_read(place, home, lines, today))
    if cands and allowed(cands[0][0]):
        q = open_page(cands[0][0])
        try:
            more = [re.sub(r'\s+', ' ', x).strip() for x in q.inner_text('body').split('\n') if x.strip()]
        finally:
            q.close()
        f2, e2 = extract(more, today)
        found = merge(merge(found, f2), model_read(place, cands[0][0], more, today))
        evs += e2
    return found, evs, 'ok' if found or evs else 'nothing found'


# --- a language model reads a page, for sites no rule reads well ------------------------------------------------
# Free by default: an open model (OLLAMA_MODEL, e.g. qwen2.5) run by Ollama on the workflow's own machine: no account,
# no key, no bill; slower, so pages go in parts, the lines near dates first, within a time budget (FREE_MINUTES).
# With ANTHROPIC_API_KEY set (a GitHub secret) Claude reads instead. Each page's text is sent once: the answer is kept against the
# text's hash (cache/model.json), so a page that hasn't changed since yesterday costs nothing. Every show the model
# returns is checked against the page: its title must be on it, and so must any date it gives.
MODEL = os.environ.get('ART_MODEL', 'claude-opus-5-5')
FREE_MODEL = os.environ.get('OLLAMA_MODEL', '')
FREE_URL = os.environ.get('OLLAMA_URL', 'http://127.0.0.1:11434') + '/api/chat'
FREE_MINUTES = float(os.environ.get('FREE_MINUTES', '70'))
FREE_PART = 5000                                             # characters of page per request (a small model's comfortable size)
_free = {'calls': 0, 'off': '', 'since': 0.0, 'secs': 0.0}
CACHE = HERE / 'cache' / 'model.json'
_cache = {}
SCHEMA = {
    'type': 'object', 'additionalProperties': False, 'required': ['shows'],
    'properties': {'shows': {'type': 'array', 'items': {
        'type': 'object', 'additionalProperties': False,
        'required': ['title', 'artists', 'start', 'end', 'on_now'],
        'properties': {
            'title': {'type': 'string', 'description': "the exhibition's title exactly as written on the page"},
            'artists': {'type': 'array', 'items': {'type': 'string'}, 'description': 'artists named for it on the page'},
            'start': {'type': ['string', 'null'], 'description': 'YYYY-MM-DD, only if the page gives it'},
            'end': {'type': ['string', 'null'], 'description': 'YYYY-MM-DD, only if the page gives it'},
            'on_now': {'type': 'boolean', 'description': 'the page presents it as on now (current), not past'},
        }}}},
}
PROMPT = """This is the text of a page from the website of {name}, an art venue in Israel. Today is {today}.
List the art exhibitions this venue shows that are on now or open within the next 60 days, as the page presents them.
Leave out past exhibitions, permanent collection displays, workshops, courses, tours, talks, concerts, films and shop items.
Write each title exactly as on the page (Hebrew stays Hebrew). Give start and end dates only when the page states them;
otherwise null. If the page lists no such exhibition, return an empty list.

<page url="{url}">
{text}
</page>"""


def free_model(place, url, text, today):
    """The open model on this machine (Ollama), the page in parts: the lines near a date or the word exhibition first.
    The shows of all parts together; None when the model is off or the time budget is spent."""
    if not FREE_MODEL or _free['off']:
        return None
    if not _free['since']:
        _free['since'] = time.time()
    ls = text.split('\n')
    near = set()
    for i, l in enumerate(ls):
        if re.search(D + r'|' + MON + r'|תערוכ|exhibit', numeric_dates(l), re.I):
            near.update(range(max(0, i - 4), min(len(ls), i + 3)))
    order = [ls[i] for i in sorted(near)] or ls
    parts, cur = [], ''
    for l in order:
        if len(cur) + len(l) + 1 > FREE_PART:
            parts.append(cur)
            cur = ''
        cur += l + '\n'
    parts = (parts + [cur])[:2]                              # two parts at most: past that it's an archive
    shows = []
    for part in parts:
        if time.time() - _free['since'] > FREE_MINUTES * 60:
            _free['off'] = f'time budget of {FREE_MINUTES:g} minutes used'
            return shows or None
        body = {'model': FREE_MODEL, 'stream': False, 'format': SCHEMA, 'options': {'temperature': 0, 'num_ctx': 8192},
                'messages': [{'role': 'user', 'content': PROMPT.format(name=place.get('name', ''), today=today.isoformat(), url=url, text=part)}]}
        req = urllib.request.Request(FREE_URL, data=json.dumps(body).encode(), method='POST', headers={'Content-Type': 'application/json'})
        t0 = time.time()
        _free['calls'] += 1
        try:
            with urllib.request.urlopen(req, timeout=600) as r:
                j = json.load(r)
            shows += json.loads(j['message']['content']).get('shows', [])
        except (ValueError, KeyError, TypeError) as e:
            print(f'free model: {url}: an answer not in the shape asked ({type(e).__name__})', file=sys.stderr)
        except Exception as e:
            _free['off'] = f'{type(e).__name__}: {e}'[:200]
            print(f'free model: {url}: {_free["off"]}', file=sys.stderr)
            return shows or None
        _free['secs'] += time.time() - t0
    return shows


def model_read(place, url, lines, today):
    """Shows on a page, read by a language model, each one checked against the page. [] when no model is at hand."""
    if not lines or not (os.environ.get('ANTHROPIC_API_KEY') or FREE_MODEL):
        return []
    import hashlib
    text = '\n'.join(lines)
    if len(text) > 60000:                                 # a page's visible text is rarely past this; the rest is menus
        text = text[:60000]
    who = MODEL if os.environ.get('ANTHROPIC_API_KEY') else FREE_MODEL
    key = hashlib.sha256((who + url + text).encode()).hexdigest()
    if not _cache and CACHE.exists():
        _cache.update(json.loads(CACHE.read_text()))
    if key in _cache:
        got = _cache[key]['shows']
    elif not os.environ.get('ANTHROPIC_API_KEY'):
        got = free_model(place, url, text, today)
        if got is None:
            return []
        _cache[key] = {'day': today.isoformat(), 'shows': got}
    else:
        import anthropic
        client = anthropic.Anthropic()
        try:
            r = client.beta.messages.create(
                model=MODEL, max_tokens=8000,
                betas=['server-side-fallback-2026-07-01'], fallbacks='default',
                output_config={'effort': 'low', 'format': {'type': 'json_schema', 'schema': SCHEMA}},
                messages=[{'role': 'user', 'content': PROMPT.format(name=place.get('name', ''), today=today.isoformat(), url=url, text=text)}])
        except anthropic.APIStatusError as e:
            print(f'model: {url}: {e.status_code}', file=sys.stderr)
            return []
        except anthropic.APIConnectionError:
            print(f'model: {url}: no connection', file=sys.stderr)
            return []
        if r.stop_reason != 'end_turn':
            print(f'model: {url}: stopped ({r.stop_reason})', file=sys.stderr)
            return []
        got = json.loads(next(b.text for b in r.content if b.type == 'text'))['shows']
        _cache[key] = {'day': today.isoformat(), 'shows': got}
    flat = re.sub(r'\s+', ' ', numeric_dates(text)).lower()
    out = []
    for x in got:
        t = clean_title(x.get('title', ''))
        if not t or len(t) > 110 or NOT_TITLE.search(t) or NOT_SHOW.search(t) or re.sub(r'\s+', ' ', t).lower() not in re.sub(r'\s+', ' ', text).lower():
            continue                                         # a title the page doesn't carry is not taken
        def sure(d):                                         # a date the page doesn't carry is dropped
            try:
                v = dt.date.fromisoformat(d) if d else None
            except ValueError:
                return None
            return v if v and re.search(rf'(?<!\d)0?{v.day}[./]0?{v.month}(?!\d)', flat) else None
        start, end = sure(x.get('start')), sure(x.get('end'))
        if end and end < today or start and start > today + dt.timedelta(days=60) or not (x.get('on_now') or start or end):
            continue
        out.append({'title': t, 'artists': [a for a in x.get('artists', []) if a and a in text][:12],
                    'start': start.isoformat() if start else None, 'end': end.isoformat() if end else None, 'by': 'model'})
    return out


def save_model_cache(today):
    if _cache:
        keep = {k: v for k, v in _cache.items() if v['day'] >= (today - dt.timedelta(days=45)).isoformat()}
        CACHE.parent.mkdir(exist_ok=True)
        CACHE.write_text(json.dumps(keep, ensure_ascii=False, separators=(',', ':')))


def merge(found, more):
    """Shows from two readings of a site, once each (by title)."""
    seen = {re.sub(r'\W+', '', x['title']).lower() for x in found}
    return found + [x for x in more if re.sub(r'\W+', '', x['title']).lower() not in seen]


def close_browser():
    if _browser:
        _browser[1].close()
        _browser[0].stop()


# --- openings and gallery talks from a public events listing (מה קורה), at places on the map ------------------
MAKORE = 'https://www.makore.co.il/browse/category/%D7%AA%D7%A2%D7%A8%D7%95%D7%9B%D7%94'
KEEP_EVENT = re.compile(r'פתיחת? (ה)?תערוכ|שיח גלריה|שיח אמן|מפגש עם האמנ|opening', re.I)


# a show named in a listing's tour, talk or opening ('סיור בתערוכה "התנועה"', 'תערוכה: מעבר לשדה הראייה')
NAMED = re.compile(r'(?:בתערוכה|בתערוכת|תערוכה|תערוכת|exhibition)\s*:?\s*["“”״„\'‘’]([^"“”״„\'‘’]{3,80})["“”״„\'‘’]|'
                   r'^(?:פתיחת\s+)?תערוכה\s*:\s*(.{3,80}?)(?:\s+[-–|]\s+.*)?$', re.I)


def makore_events(places, today, pages=15, shows=None):
    """Events at known places: openings and gallery talks only (tours, workshops and entry tickets left out).
    Shows named in any of the listing's items at those places go to `shows` (on now: the place runs a tour or talk in
    it in the coming weeks; an opening ahead: it opens that day)."""
    sys.path.insert(0, str(HERE))
    from places import norm
    keys = []
    for p in places.values():
        for n in (p.get('name_he'), p.get('name')):
            k = norm(n or '')
            if len(k) >= 4:
                keys.append((k, p['id']))
    out, seen = [], set()
    for i in range(1, pages + 1):
        url = MAKORE + (f'?pages={i}' if i > 1 else '')
        if not allowed(url):
            break
        try:
            page = fetch(url)
        except Exception:
            break
        for blob in re.findall(r'<script type="application/ld\+json">(.*?)</script>', page, re.S):
            try:
                graph = json.loads(blob).get('@graph', [])
            except ValueError:
                continue
            for g in graph:
                for it in g.get('itemListElement', []) if g.get('@type') == 'ItemList' else []:
                    e = it.get('item', {})
                    title, loc = e.get('name', ''), norm((e.get('location') or {}).get('name', ''))
                    if not loc:
                        continue
                    place = next((pid for k, pid in keys if re.search(r'(^|\s)' + re.escape(k) + r'(\s|$)', loc)), None)
                    when = (e.get('startDate') or '')[:16]
                    if not place or not when:
                        continue
                    d = dt.datetime.fromisoformat(when.replace('Z', '')) + dt.timedelta(hours=2)    # UTC to Israel (roughly)
                    m = NAMED.search(title.strip())
                    if shows is not None and m and today - dt.timedelta(days=1) <= d.date() <= today + dt.timedelta(days=30):
                        t = clean_title(m.group(1) or m.group(2))
                        if t and not NOT_TITLE.search(t) and not NOT_SHOW.search(t):
                            opening = re.search(r'פתיחת|פתיחה|opening', title, re.I) and d.date() > today
                            shows.append({'title': t, 'artists': [], 'start': d.date().isoformat() if opening else None, 'end': None,
                                          'place': place, 'url': e.get('url', ''), 'source': 'makore',
                                          'id': f"{place}:{re.sub(r'[^0-9a-zא-ת]+', '-', t.lower())[:50]}"})
                    if not KEEP_EVENT.search(title):
                        continue
                    if not (today <= d.date() <= today + dt.timedelta(days=45)) or (place, title, d.date()) in seen:
                        continue
                    seen.add((place, title, d.date()))
                    out.append({'title': re.sub(r'^\s*פתיחת תערוכה\s*:?\s*', 'Opening: ', title).strip(), 'date': d.date().isoformat(),
                                'time': d.strftime('%H:%M') if d.hour or d.minute else '', 'place': place, 'url': e.get('url', ''), 'source': 'makore'})
    return out


def load_sources():
    out = []
    for line in (HERE / 'sources.tsv').read_text(encoding='utf-8').splitlines():
        if line.strip() and not line.startswith('#'):
            sid, place, url, mode = (line.split('\t') + [''])[:4]
            out.append({'id': sid, 'place': place, 'url': url, 'mode': mode or 'generic'})
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--offline', help='read saved pages (<id>.html) from this folder instead of the web')
    ap.add_argument('--today')
    ap.add_argument('--only', help='these sources only (comma-separated ids), for a trial')
    ap.add_argument('--dry', action='store_true', help='print what was found; write nothing')
    ap.add_argument('--no-browser', action='store_true', help="don't read pages in a browser when the plain page has nothing")
    a = ap.parse_args()
    today = dt.date.fromisoformat(a.today) if a.today else dt.date.today()
    places = {p['id']: p for p in json.loads((APP / 'data' / 'art' / 'places.json').read_text())['places']} \
        if (APP / 'data' / 'art' / 'places.json').exists() else {}
    shows, events, health = [], [], []
    only = set(a.only.split(',')) if a.only else None
    for s in load_sources():
        if only is not None and s['id'] not in only:
            continue
        h = {'source': s['id'], 'place': s['place'], 'url': s['url']}
        if places and s['place'] not in places:
            h['status'] = 'place not on the map'
            health.append(h)
            continue
        try:
            if a.offline:
                page = (Path(a.offline) / f"{s['id']}.html").read_text(encoding='utf-8', errors='ignore')
            elif not allowed(s['url']):
                h['status'] = 'robots.txt says no'
                health.append(h)
                continue
            else:
                page = fetch(s['url'])
        except Exception as e:
            if a.offline or a.no_browser:
                h['status'] = f'unreachable: {type(e).__name__}'
                health.append(h)
                continue
            page = ''                                    # some sites turn away plain requests but not a browser
        lines = text_lines(page)
        found, evs = extract(lines, today)
        if s['mode'] == 'colon-list':
            found = extract_colon_list(lines, today)
        if s['mode'].startswith('links:') and not a.offline and not a.no_browser:
            try:
                found, h['read'] = render_links(s['url'], s['mode'][6:]), 'browser'
            except Exception as e:
                h['browser'] = type(e).__name__
        elif not found and not a.offline and not a.no_browser:
            # nothing in the page as sent: many sites build it in the browser, so read it as a browser shows it
            try:
                lines = render(s['url'])
                found, evs2 = extract(lines, today)
                evs = evs or evs2
                h['read'] = 'browser'
            except Exception as e:
                h['browser'] = type(e).__name__
        if not a.offline and s['place'] in places:
            found = merge(found, model_read(places[s['place']], s['url'], lines, today))
        for x in found:
            x.update(place=s['place'], url=s['url'], source=s['id'],
                     id=f"{s['place']}:{re.sub(r'[^0-9a-zא-ת]+', '-', x['title'].lower())[:50]}")
        for x in evs:
            x.update(place=s['place'], url=s['url'], source=s['id'])
        shows += found
        events += evs
        h.update(status='ok' if found or evs else 'nothing found' if page or 'read' in h else 'unreachable', shows=len(found), events=len(evs))
        health.append(h)
        print(f"{s['id']:<24} {h['status']:<14} {len(found)} shows, {len(evs)} events", file=sys.stderr)

    # every other place on the map with a website of its own
    if places and not a.offline and not a.no_browser and only is None:
        done = {s['place'] for s in load_sources()}
        for p in sorted((p for p in places.values() if p.get('website') and p['id'] not in done), key=lambda p: p['id']):
            h = {'source': f"site:{p['id']}", 'place': p['id'], 'url': p['website'], 'auto': True}
            try:
                found, evs, h['status'] = auto_read(p, today)
            except Exception as e:
                found, evs, h['status'] = [], [], f'unreachable: {type(e).__name__}'
            for x in found:
                x.update(place=p['id'], url=p['website'], source=h['source'],
                         id=f"{p['id']}:{re.sub(r'[^0-9a-zא-ת]+', '-', x['title'].lower())[:50]}")
            for x in evs:
                x.update(place=p['id'], url=p['website'], source=h['source'])
            shows += found
            events += evs
            h.update(shows=len(found), events=len(evs))
            health.append(h)
            print(f"{h['source']:<40} {h['status']:<14} {len(found)} shows", file=sys.stderr)

    close_browser()
    save_model_cache(today)
    if FREE_MODEL and not os.environ.get('ANTHROPIC_API_KEY'):
        health.append({'source': 'model', 'model': FREE_MODEL, 'calls': _free['calls'], 'seconds': round(_free['secs']), 'status': _free['off'] or 'ok'})
        print(f"free model ({FREE_MODEL}): {_free['calls']} calls, {_free['secs'] / max(1, _free['calls']):.0f} s each"
              f"{'; stopped: ' + _free['off'] if _free['off'] else ''}", file=sys.stderr)
    if places and not a.offline and only is None:
        try:
            named = []
            mk = makore_events(places, today, shows=named)
            events += mk
            have = {(x['place'], re.sub(r'\W+', '', x['title']).lower()) for x in shows}
            for x in named:                                  # a show the place's own site already gave is not repeated
                k = (x['place'], re.sub(r'\W+', '', x['title']).lower())
                if k not in have and not any(k[1] in h[1] or h[1] in k[1] for h in have if h[0] == k[0]):
                    have.add(k)
                    shows.append(x)
            health.append({'source': 'makore', 'place': '(many)', 'url': MAKORE, 'status': 'ok' if mk else 'nothing found', 'events': len(mk)})
            print(f'makore                   {len(mk)} openings and talks, {len(named)} shows named, at places on the map', file=sys.stderr)
        except Exception as e:
            health.append({'source': 'makore', 'status': f'failed: {type(e).__name__}'})

    # keep what was seen before (first seen), so a show doesn't flicker when one day's read fails
    prev = json.loads(OUT.read_text()) if OUT.exists() else {'shows': []}
    ok_sources = {h['source'] for h in health if h.get('status') == 'ok'}
    first = {x['id']: x.get('first_seen') for x in prev['shows']}
    for x in shows:
        x['first_seen'] = first.get(x['id']) or today.isoformat()
        x['last_seen'] = today.isoformat()
    # a source that failed today keeps yesterday's shows: until their end, or (a show listed with no dates, as "on
    # now") for two weeks after it was last seen
    fortnight = (today - dt.timedelta(days=14)).isoformat()
    kept = [x for x in prev['shows'] if x['source'] not in ok_sources
            and (x['end'] >= today.isoformat() if x['end'] else x.get('last_seen', x.get('first_seen', '')) >= fortnight)
            and x['id'] not in {y['id'] for y in shows}]
    shows += kept
    shows = [x for x in shows if not NOT_TITLE.search(x['title'])]     # yesterday's too, read before a rule was added
    OUT.parent.mkdir(parents=True, exist_ok=True)
    if a.dry:
        for x in shows:
            print(f"{x['source']:<22} {x.get('by', 'rule'):<6} {x['title'][:60]} | {x.get('start')} – {x.get('end')}")
        print(json.dumps([h for h in health if h['source'] == 'model'], ensure_ascii=False))
        return
    OUT.write_text(json.dumps({'updated': today.isoformat(), 'shows': shows, 'events': events},
                              ensure_ascii=False, separators=(',', ':')))
    HEALTH.write_text(json.dumps({'updated': today.isoformat(), 'sources': health}, ensure_ascii=False, indent=1))
    print(f'{len(shows)} shows ({len(kept)} kept from earlier reads), {len(events)} events; '
          f'{len(ok_sources)}/{len(health)} sources read', file=sys.stderr)


if __name__ == '__main__':
    main()
