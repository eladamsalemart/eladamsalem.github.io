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
import re
import sys
import time
import urllib.request
import urllib.robotparser
from pathlib import Path
from urllib.parse import urlparse

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
    s = re.sub(r'\s*/\s*$', '', s).strip(' -–|·:')
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
    for i, line in enumerate(lines):
        if len(line) > 140:
            continue
        rng = re.search(D + r'\s*(?:-|–|—|עד)\s*(?:\S+,\s*)?' + D, line)
        close = re.search(r'(?:ננעלת|נעילה|נועלת|closes|until)\D{0,20}' + D, line, re.I)
        opens = re.search(r'(?:פתיחה|opening)\D{0,6}' + D, line, re.I)
        one = re.search(r'(?:^|\s|,)' + D + r'(?:,\s*(\d{1,2}:\d{2}))?\s*$', line)
        start = end = None
        if rng:
            start, end = ymd(*rng.groups()[:3], today), ymd(*rng.groups()[3:6], today)
        elif close:
            end = ymd(*close.groups()[:3], today)
            start = ymd(*opens.groups()[:3], today) if opens else None
        # the title: the nearest line above that is not navigation, a date or a curator
        title = None
        for j in range(i - 1, max(-1, i - 4), -1):
            c = clean_title(lines[j])
            if not c or NAV.match(c) or re.fullmatch(r'[\d./\s,:-]+', c) or re.match(r'^(אוצר|אוצרת|curator|צילום)', c, re.I):
                continue
            title = c
            break
        if not title or len(title) < 2 or len(title) > 110:
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
    a = ap.parse_args()
    today = dt.date.fromisoformat(a.today) if a.today else dt.date.today()
    places = {p['id']: p for p in json.loads((APP / 'data' / 'art' / 'places.json').read_text())['places']} \
        if (APP / 'data' / 'art' / 'places.json').exists() else {}
    shows, events, health = [], [], []
    for s in load_sources():
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
            h['status'] = f'unreachable: {type(e).__name__}'
            health.append(h)
            continue
        lines = text_lines(page)
        found, evs = extract(lines, today)
        if s['mode'] == 'colon-list':
            found = extract_colon_list(lines, today)
        for x in found:
            x.update(place=s['place'], url=s['url'], source=s['id'],
                     id=f"{s['place']}:{re.sub(r'[^0-9a-zא-ת]+', '-', x['title'].lower())[:50]}")
        for x in evs:
            x.update(place=s['place'], url=s['url'], source=s['id'])
        shows += found
        events += evs
        h.update(status='ok' if found or evs else 'nothing found', shows=len(found), events=len(evs))
        health.append(h)
        print(f"{s['id']:<24} {h['status']:<14} {len(found)} shows, {len(evs)} events", file=sys.stderr)

    # keep what was seen before (first seen), so a show doesn't flicker when one day's read fails
    prev = json.loads(OUT.read_text()) if OUT.exists() else {'shows': []}
    ok_sources = {h['source'] for h in health if h.get('status') == 'ok'}
    first = {x['id']: x.get('first_seen') for x in prev['shows']}
    for x in shows:
        x['first_seen'] = first.get(x['id']) or today.isoformat()
    kept = [x for x in prev['shows'] if x['source'] not in ok_sources and x['end'] >= today.isoformat()
            and x['id'] not in {y['id'] for y in shows}]
    shows += kept
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({'updated': today.isoformat(), 'shows': shows, 'events': events},
                              ensure_ascii=False, separators=(',', ':')))
    HEALTH.write_text(json.dumps({'updated': today.isoformat(), 'sources': health}, ensure_ascii=False, indent=1))
    print(f'{len(shows)} shows ({len(kept)} kept from earlier reads), {len(events)} events; '
          f'{len(ok_sources)}/{len(health)} sources read', file=sys.stderr)


if __name__ == '__main__':
    main()
