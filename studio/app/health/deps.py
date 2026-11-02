"""The app's outside code: what it runs on, how far behind it is, and whether any of it has a known security hole.

    python3 studio/app/health/deps.py [out.json]

A known vulnerability in a version the app ships is a FAIL (a bug, to fix now). A newer version is a NOTE: an update
is an improvement to make with care (the scheduled session takes one at a time, checks it on a phone, then ships it).
"""
import json
import os
import re
import sys
import urllib.request
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
ROOT = APP.parent.parent


def pinned():
    out = {}
    m = re.search(r'three@([\d.]+)', (APP / 'index.html').read_text())
    if m: out['three'] = m.group(1)
    m = re.search(r'"(\d+\.\d+\.\d+)"', (APP / 'vendor/maplibre/maplibre-gl.js').read_text()[:4000]) or re.search(r'v(\d+\.\d+\.\d+)', (APP / 'vendor/maplibre/maplibre-gl.js').read_text()[:400])
    if m: out['maplibre-gl'] = m.group(1)
    m = re.search(r'version="(2\.\d+\.\d+)"', (APP / 'vendor/supabase/supabase.js').read_text())
    if m: out['@supabase/supabase-js'] = m.group(1)
    for wf in (ROOT / '.github/workflows').glob('*.yml'):
        m = re.search(r'playwright@([\d.]+)', wf.read_text())
        if m: out['playwright'] = m.group(1)
    return out


def get(url, token=None):
    h = {'User-Agent': 'open-studio-health', 'Accept': 'application/json'}
    if token: h['Authorization'] = f'Bearer {token}'
    with urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=30) as r:
        return json.loads(r.read())


def main(dest=None):
    token = os.environ.get('GITHUB_TOKEN') or os.environ.get('GH_TOKEN')
    rows, fails, notes = [], [], []
    for name, have in pinned().items():
        row = {'name': name, 'have': have}
        try:
            latest = get(f'https://registry.npmjs.org/{name.replace("/", "%2F")}/latest')['version']
            row['latest'] = latest
            if tuple(map(int, latest.split('.')[:3])) > tuple(map(int, have.split('.')[:3])):
                notes.append(f'{name} {have} → {latest} available')
        except Exception as e:
            row['latest'] = f'unknown ({e.__class__.__name__})'
        try:   # GitHub's advisory database: anything known against this exact version
            adv = get(f'https://api.github.com/advisories?ecosystem=npm&affects={name}@{have}&per_page=20', token)
            row['advisories'] = [f"{a.get('severity')}: {a.get('summary')} ({a.get('ghsa_id')})" for a in adv]
            for a in row['advisories']:
                fails.append(f'{name} {have} has a known vulnerability: {a}')
        except Exception as e:
            row['advisories'] = f'unknown ({e.__class__.__name__})'
        rows.append(row)
    report = {'libraries': rows, 'fails': fails, 'notes': notes}
    if dest: Path(dest).write_text(json.dumps(report, indent=1))
    for r in rows: print(f"{r['name']:24} {r['have']:10} latest {r['latest']}")
    for f in fails: print('FAIL', f)
    for n in notes: print('NOTE', n)
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main(*sys.argv[1:2]))
