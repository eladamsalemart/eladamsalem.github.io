"""The same content for all ten directions: Sunday 1 November, an art lover in Tel Aviv who follows three artists."""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
APP = HERE.parent.parent / 'app'
W = json.loads((APP / 'data' / 'demo' / 'world.json').read_text())
A = '../../app/'
M = '../../../media/works/'
works = {w['slug']: w for w in W['works']}
people = {a['slug']: a for a in W['artists']}

ELAD_SAYS = 'There is a ritual energy in my paintings: a waystation between the material and the spiritual.'
ARTISTS = [
    {'name': 'Lia Morén', 'first': 'Lia', 'what': 'Painting', 'city': 'Haifa', 'img': A + people['lia-moren']['portrait'],
     'says': people['lia-moren']['statement'], 'news': 'Opens Low Tide tonight', 'c': '#5F93B0', 'work': A + works['low-tide']['image']},
    {'name': 'Maya Haddad', 'first': 'Maya', 'what': 'Works on paper', 'city': 'Jerusalem', 'img': A + people['maya-haddad']['portrait'],
     'says': people['maya-haddad']['statement'], 'news': 'Talk on Tuesday, 18:00', 'c': '#2B3440', 'work': A + works['breath-i']['image']},
    {'name': 'Elad Amsalem', 'first': 'Elad', 'what': 'Painting', 'city': 'Hof HaCarmel', 'img': M + 'img-0502-1780925650921.jpg',
     'says': ELAD_SAYS, 'news': 'Two new works', 'c': '#6E8B3D', 'work': M + 'img-1196-edit-1791725179214.jpg'},
]
SHOWS = [
    {'title': 'Low Tide', 'by': 'Lia Morén', 'where': 'Harbour Gallery', 'city': 'Haifa', 'when': 'Opens tonight, 20:00', 'short': 'Tonight', 'day': 'Sun', 'time': '20:00',
     'live': True, 'img': A + 'data/demo/shows/low-tide-haifa-1.jpg', 'work': A + works['low-tide']['image'], 'c': '#5F93B0', 'left': 45, 'of': 45},
    {'title': 'Ink, Breath', 'by': 'Maya Haddad', 'where': 'Musrara Lane Gallery', 'city': 'Jerusalem', 'when': 'Closes Wednesday', 'short': '3 days left', 'day': 'Tue', 'time': '18:00',
     'live': True, 'img': A + 'data/demo/shows/ink-breath-1.jpg', 'work': A + works['breath-i']['image'], 'c': '#2B3440', 'left': 3, 'of': 29},
    {'title': 'Slow Colour', 'by': 'Daniel Ostrovsky', 'where': 'Studio 5', 'city': 'Tel Aviv', 'when': 'Opens Tuesday, 19:00', 'short': 'Tue', 'day': 'Tue', 'time': '19:00',
     'live': False, 'img': A + 'data/demo/shows/slow-colour-1.jpg', 'work': A + works['slow-colour-i']['image'], 'c': '#C86A3A', 'left': None, 'of': None},
]
def _w(slug, artist):
    x = works[slug]
    return {'title': x['title'], 'artist': artist, 'year': x['year'], 'medium': x['medium'], 'size': x['size'], 'img': A + x['image']}
WORKS = [
    {'title': 'Together', 'artist': 'Elad Amsalem', 'year': '2026', 'medium': 'Oil on canvas', 'size': [90, 70], 'img': M + 'img-1196-edit-1791725179214.jpg'},
    _w('low-tide', 'Lia Morén'), _w('breath-i', 'Maya Haddad'), _w('orchard-at-noon', 'Lia Morén'),
    {'title': 'Sunflower', 'artist': 'Elad Amsalem', 'year': '2026', 'medium': 'Oil on canvas', 'size': [65, 60], 'img': M + 'img-0965-1782983816627.jpg'},
]
RECENT = [
    {'title': 'Signal / Noise', 'kind': 'Exhibition, online', 'ago': '2 min ago', 'act': 'Back to the fourth work', 'img': A + 'data/demo/works/signal-01.jpg', 'c': '#4A3A8C'},
    {'title': 'Together', 'kind': 'Elad Amsalem, 2026', 'ago': '1 hour ago', 'act': 'Look again', 'img': WORKS[0]['img'], 'c': '#6E8B3D'},
    {'title': 'Ritual', 'kind': 'A room in 3D', 'ago': 'Yesterday', 'act': 'Walk back in', 'img': M + 'jah-005-1780915457989.jpg', 'c': '#8A6A3C'},
]
# real: the art map's daily read, around Tel Aviv on 1 November
NEAR = [
    {'title': 'שנת אפס', 'place': 'Tel Aviv Museum of Art', 'far': '9 min walk', 'mins': 9, 'when': 'Closes Saturday', 'c': '#2F4FD0'},
    {'title': 'Chronicles', 'place': 'Braverman Gallery', 'far': '14 min walk', 'mins': 14, 'when': 'Closes Thursday', 'c': '#E9A23B'},
    {'title': 'אנדי, מת׳יו ורותי', 'place': 'CCA Tel Aviv', 'far': '1.9 km', 'mins': 24, 'when': 'Until 13 December', 'c': '#E2553B'},
]
TABS = [('Home', '<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>'), ('Artists', '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>'),
        ('Shows', '<rect x="3" y="4" width="18" height="14" rx="1"/><path d="M8 21h8M12 18v3"/><path d="m9 8 6 3-6 3z"/>'),
        ('Map', '<path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>'), ('Search', '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>')]
LOGO = '<svg class="mark" viewBox="0 0 132 132" aria-hidden="true"><rect x="8" y="8" width="116" height="116" rx="36" fill="#1F2A44"/><path d="M42 106 V62 a24 24 0 0 1 48 0 V106 Z" fill="#F5C9B8"/></svg>'
ARCH = '<svg class="arch" viewBox="0 0 48 64" aria-hidden="true"><path d="M2 62V24a22 22 0 0 1 44 0v38z"/></svg>'
