"""What a walkable tour still needs, in plain words for the artist (English, like the app), next to each
space: data/spaces/<slug>.status.json. The artist's side of the app shows it on the exhibition's page.

    {"state": "live" | "building" | "not yet", "summary": "...", "items": [["ok"|"warn"|"no", "..."], ...]}
"""
import json
from .works import APP

OUT = APP / 'data' / 'spaces'


def _names(why):
    return why.split(': ', 1)[1] if ': ' in why else ''


def stage1(slug, checks, ex):
    """From the build's checks (name, value, passed, why)."""
    items = []
    listed = [w for w in ex['works'] if w['listed']]
    for name, v, ok, why in checks:
        if ok:
            continue
        t = _names(why)
        if name == 'works_placed':
            items.append(['no', f"{round(v * len(listed))} of {len(listed)} works were found in the installation photos. Wide photos that show the others, 2–3 works and a corner in each, would place them."])
        elif name == 'image_edge_px':
            items.append(['no', f"Images too small for the tour (at least 2000 px on the long side, 6000 is best): {t}."])
        elif name == 'size_vs_image':
            items.append(['no', f"Size missing, or not matching the work's image: {t}. Please check width and height."])
        elif name == 'size_vs_photos':
            items.append(['no', f"The photos show a different size than recorded: {t}. Please check the size, or the image (is it cropped?)."])
        elif name == 'walls_measured':
            items.append(['no', f"Only {int(v)} of the room's 4 walls could be measured. Photos of the other walls, with a work or a corner in them, are needed."])
        elif name == 'rms_px':
            items.append(['no', "The photos don't fit together precisely enough yet. More photos, overlapping each other, would fix it."])
        elif name == 'walls_seen':
            items.append(['no', f"Only {round(v * 100)}% of the walls are in the photos. Every wall should be in at least two photos."])
        else:
            items.append(['no', "The rebuilt room doesn't match the photos closely enough yet. More photos, or a short walk-through video, would help."])
    if items:
        write(slug, 'not yet', "A tour can't be built from what's here yet. This is what it needs:", items
              + [['warn', 'The surest way: a walk-through video. Phone sideways, slowly down the middle of the room and back, a minute or two, every wall in view; turn slowly at the ends, with a little floor and ceiling in view.']])
    else:
        write(slug, 'building', 'The room has been measured from the photos and is being checked view by view.', [['ok', 'Every work found, measured and matching the photos.']])


def stage2(slug, res, n):
    """From the inspection's checks (rule, passed, why)."""
    failed = [r for r, ok, _ in res if not ok]
    if not failed:
        write(slug, 'live', f'Live. The tour passed all {len(res)} checks, from {n} views inside it.',
              [['ok', 'Every work whole, sharp and in its own colours.'], ['ok', 'Walls and floor clean, no holes.'], ['ok', 'Every work hung on its wall, at its measured size.']])
    else:
        plain = {'opens': 'Something failed to load.', 'holes': 'A gap in the room.', 'work_whole': 'A work is hidden or cut.', 'work_sharp': 'A work looks soft or smeared.',
                 'work_near': 'A work loses its detail up close.', 'work_colour': "A work's colours are off.", 'ghost': 'A mark left on a wall.', 'blotch': 'A dark patch on a wall.',
                 'smear': 'A smeared patch on a wall.', 'floor': 'Stripes in the floor.', 'on_wall': 'A work not hanging right on its wall.', 'in_room': 'A work reaching past the floor or ceiling.',
                 'no_overlap': 'Works overlapping.'}
        write(slug, 'not yet', "The tour was built, but didn't pass its final check, so it isn't shown. We're working on it; nothing is needed from you.",
              [['no', plain.get(r, r)] for r in failed])


def write(slug, state, summary, items):
    json.dump({'state': state, 'summary': summary, 'items': items}, open(OUT / f'{slug}.status.json', 'w'), indent=1, ensure_ascii=False)
