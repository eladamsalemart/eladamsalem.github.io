"""A tour that is live stays live until a new build of it passes both stages.

Before a space is rebuilt, its published version is put aside; if the new build doesn't pass (stage 1 or
stage 2), the published version is put back, unchanged, and the report says so. Visitors only ever see a
tour that passed every check, and never lose one to a build that didn't."""
import json, shutil
from .works import APP

OUT = APP / 'data' / 'spaces'
KEEP = APP / 'space' / '.cache' / 'live'


def _files(slug, base):
    return [base / slug] + [base / f'{slug}{ext}' for ext in ('.json', '.status.json', '.report.md')]


def put_aside(slug):
    """Before building: keep the published version, if there is one."""
    spec = OUT / f'{slug}.json'
    if not spec.exists() or json.load(open(spec, encoding='utf-8')).get('quality') != 'published':
        return
    shutil.rmtree(KEEP / slug, ignore_errors=True); KEEP.mkdir(parents=True, exist_ok=True)
    for src, dst in zip(_files(slug, OUT), _files(slug, KEEP)):
        if src.is_dir(): shutil.copytree(src, dst)
        elif src.exists(): shutil.copy2(src, dst)


def settle(slug, log=print):
    """After both stages: if the new build isn't published but the old one was, the old one goes back."""
    spec = OUT / f'{slug}.json'
    new = json.load(open(spec, encoding='utf-8')) if spec.exists() else {}
    if (new.get('quality') == 'published' and (OUT / slug).is_dir()) or not (KEEP / f'{slug}.json').exists():
        shutil.rmtree(KEEP / slug, ignore_errors=True)
        for f in _files(slug, KEEP)[1:]: f.unlink(missing_ok=True)
        return False
    why = '; '.join(r.get('why', r.get('rule', '')) for r in new.get('inspection', []) if not r.get('passed')) or 'stage 1 did not pass'
    for src, dst in zip(_files(slug, KEEP), _files(slug, OUT)):
        if dst.is_dir(): shutil.rmtree(dst)
        elif dst.exists(): dst.unlink()
        if src.is_dir(): shutil.copytree(src, dst)
        elif src.exists(): shutil.copy2(src, dst)
    rep = OUT / f'{slug}.report.md'
    if rep.exists():
        txt = rep.read_text(encoding='utf-8').split('\n\n> **בנייה חדשה')[0]          # one note, the latest
        note = f"\n\n> **בנייה חדשה לא עברה את הבדיקה** ({why}). הגרסה שעברה את כל הבדיקות נשארת באוויר, בלי שינוי.\n"
        rep.write_text(txt + note, encoding='utf-8')
    log(f'{slug}: the new build did not pass ({why}); the live version stays')
    return True
