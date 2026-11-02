// One art lover in Tel Aviv, Monday 2 November, who follows Lia Morén, Maya Haddad and Elad Amsalem.
// Near stars: what they used last. Further out: who and what they haven't met yet. The far shows are real
// (the art map's daily read); the artists Lia, Maya, Noa, Daniel and Tomer are the app's demo world.

export const LOCAL = location.pathname.startsWith('/studio/');
export const APP = LOCAL ? '/studio/app/' : '/open-studio/';
export const TOUR = `${APP}?guest#/exhibition/ritual/space`;
const I = k => `img/${k}.jpg`, IM = k => `img/${k}-m.jpg`;

// kind: artist · show · tour · place · work.  ring: 0 = used last, 1 = yours, 2 = not met yet
export const STARS = [
  { id: 'you', kind: 'you', ring: -1, name: 'You' },

  { id: 'signal', kind: 'show', ring: 0, name: 'Signal / Noise', sub: 'Tomer Lev · online', note: 'back to the fourth work', ago: '2 min ago', img: I('signal') },
  { id: 'lia', kind: 'artist', ring: 0, name: 'Lia Morén', sub: 'Painting · Haifa', note: 'her tide paintings go up tonight', ago: '1 hour ago', img: I('lia') },
  { id: 'ritual', kind: 'tour', ring: 0, name: 'Ritual', sub: 'Elad Amsalem · in 3D', note: 'you walked it yesterday', ago: 'Yesterday', img: I('ritual') },
  { id: 'harbour', kind: 'place', ring: 0, name: 'Harbour Gallery', sub: 'Gallery · Haifa', note: 'Low Tide opens here at 20:00', ago: 'Saturday', img: I('harbour') },
  { id: 'together', kind: 'work', ring: 0, name: 'Together', sub: 'Elad Amsalem, 2026', note: 'you looked at it twice', ago: 'Saturday', img: I('together') },

  { id: 'lowtide', kind: 'show', ring: 1, name: 'Low Tide', sub: 'Lia Morén · Harbour Gallery', note: 'tonight', img: I('low-tide') },
  { id: 'elad', kind: 'artist', ring: 1, name: 'Elad Amsalem', sub: 'Painting · Hof HaCarmel', note: 'two new works', img: I('elad') },
  { id: 'maya', kind: 'artist', ring: 1, name: 'Maya Haddad', sub: 'Works on paper · Jerusalem', note: 'talk on Tuesday', img: I('maya') },
  { id: 'ink', kind: 'show', ring: 1, name: 'Ink, Breath', sub: 'Maya Haddad · Musrara Lane', note: '3 days left', img: I('breath') },
  { id: 'tomer', kind: 'artist', ring: 1, name: 'Tomer Lev', sub: 'Digital · Tel Aviv', img: I('tomer') },

  { id: 'noa', kind: 'artist', ring: 2, name: 'Noa Ben-Ari', sub: 'Textiles · shows with Lia', note: 'you might know her work', img: I('noa') },
  { id: 'daniel', kind: 'artist', ring: 2, name: 'Daniel Ostrovsky', sub: 'Painting · Tel Aviv', img: I('daniel') },
  { id: 'patch', kind: 'show', ring: 2, name: 'Patchwork Weather', sub: 'Noa Ben-Ari · Rope Street', img: I('patchwork') },
  { id: 'slow', kind: 'show', ring: 2, name: 'Slow Colour', sub: 'Daniel Ostrovsky · Studio 5', note: 'opens Tuesday', img: I('slow-colour') },
  { id: 'nature', kind: 'tour', ring: 2, name: 'Nature of Man', sub: 'Elad Amsalem · in 3D' },
  { id: 'bfa', kind: 'tour', ring: 2, name: 'BFA graduate exhibition', sub: 'in 3D' },
  { id: 'near', place: 'gordon-gallery', kind: 'show', ring: 2, name: 'What Is Near Becomes Far', sub: 'Sharon Poliakine · Gordon Gallery', real: true },
  { id: 'chron', place: 'braverman-gallery', kind: 'show', ring: 2, name: 'Chronicles', sub: 'Braverman Gallery · 3 days left', real: true },
  { id: 'dotan', place: 'tel-aviv-museum-of-art', kind: 'show', ring: 2, name: 'אילנה דותן: חיי מדף', sub: 'Tel Aviv Museum of Art', real: true },
  { id: 'minerva', place: 'maya-gallery', kind: 'show', ring: 2, name: 'Now is the Time', sub: 'Minerva graduates · Maya Gallery', real: true },
  { id: 'brosh', place: 'cca-tel-aviv', kind: 'show', ring: 2, name: 'נרדין סרוג׳י: ברוש לבדו', sub: 'CCA Tel Aviv', real: true },
  { id: 'gordon', place: 'gordon-gallery', kind: 'place', ring: 2, name: 'Gordon Gallery', sub: 'Gallery · Tel Aviv', real: true },
  { id: 'tama', place: 'tel-aviv-museum-of-art', kind: 'place', ring: 2, name: 'Tel Aviv Museum of Art', sub: 'Museum', real: true },
  { id: 'cca', place: 'cca-tel-aviv', kind: 'place', ring: 2, name: 'CCA Tel Aviv', sub: 'Art centre', real: true },
];

// [a, b, how]: 'used' = you went from one to the other, 'tie' = they belong together, 'maybe' = might lead you there
export const TIES = [
  ['you', 'signal', 'used'], ['you', 'lia', 'used'], ['you', 'ritual', 'used'], ['you', 'harbour', 'used'], ['you', 'together', 'used'],
  ['signal', 'tomer', 'tie'], ['lia', 'lowtide', 'tie'], ['lowtide', 'harbour', 'tie'], ['ritual', 'elad', 'tie'], ['elad', 'together', 'tie'],
  ['maya', 'ink', 'tie'], ['you', 'maya', 'tie'], ['you', 'elad', 'tie'],
  ['lia', 'noa', 'maybe'], ['noa', 'patch', 'tie'], ['daniel', 'slow', 'tie'], ['elad', 'nature', 'maybe'], ['nature', 'bfa', 'maybe'],
  ['tomer', 'daniel', 'maybe'], ['maya', 'brosh', 'maybe'], ['near', 'gordon', 'tie'], ['dotan', 'tama', 'tie'], ['brosh', 'cca', 'tie'],
  ['chron', 'near', 'maybe'], ['minerva', 'dotan', 'maybe'], ['harbour', 'near', 'maybe'],
];

export const LIVE = { title: 'Ritual', by: 'Elad Amsalem', where: 'Jerusalem', note: 'you can walk in from here', img: IM('ritual') };

export const ARTISTS = [
  { name: 'Lia Morén', what: 'Painting · Haifa', img: I('lia'), now: 'Opens Low Tide tonight' },
  { name: 'Maya Haddad', what: 'Works on paper · Jerusalem', img: I('maya'), now: 'Talk on Tuesday, 18:00' },
  { name: 'Elad Amsalem', what: 'Painting · Hof HaCarmel', img: I('elad'), now: 'Two new works' },
];

export const THEIR_SHOWS = [
  { title: 'Low Tide', by: 'Lia Morén', where: 'Harbour Gallery, Haifa', when: 'Opens tonight, 20:00', short: 'Tonight', img: IM('harbour'), tour: false },
  { title: 'Ink, Breath', by: 'Maya Haddad', where: 'Musrara Lane Gallery, Jerusalem', when: 'Closes Wednesday', short: '3 days left', img: IM('ink-breath-room'), tour: false },
  { title: 'Ritual', by: 'Elad Amsalem', where: 'Jerusalem', when: 'Walk it in 3D', short: 'In 3D', img: IM('ritual'), tour: true },
];

// real: the art map's daily read, around Tel Aviv on 2 November
export const NEAR = [
  { place: 'gordon-gallery', title: 'What Is Near Becomes Far', by: 'Sharon Poliakine', where: 'Gordon Gallery', far: '12 min walk', when: 'Until Saturday', at: [32.050023, 34.765985] },
  { place: 'braverman-gallery', title: 'Chronicles', by: '', where: 'Braverman Gallery', far: '14 min walk', when: '3 days left', at: [32.05804, 34.763848] },
  { place: 'tel-aviv-museum-of-art', title: 'אילנה דותן: חיי מדף', by: '', where: 'Tel Aviv Museum of Art', far: '1.9 km', when: 'Until 28 November', at: [32.0775, 34.786667] },
  { place: 'maya-gallery', title: 'Now is the Time', by: 'Minerva graduates', where: 'Maya Gallery', far: '9 min walk', when: 'Until 21 November', at: [32.052071, 34.772881] },
];

export const TABS = [['Home', '<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>'], ['Artists', '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>'],
  ['Shows', '<rect x="3" y="4" width="18" height="14" rx="1"/><path d="M8 21h8M12 18v3"/><path d="m9 8 6 3-6 3z"/>'],
  ['Map', '<path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>'], ['Search', '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>']];
export const LOGO = '<svg viewBox="0 0 132 132" aria-hidden="true"><rect x="8" y="8" width="116" height="116" rx="36" fill="#1F2A44"/><path d="M42 106 V62 a24 24 0 0 1 48 0 V106 Z" fill="#F5C9B8"/></svg>';

// Where each star sits (x right, y down, z away from you), in the units of a phone 390 wide. You are in the middle;
// what you used last circles you; your artists and their shows sit just outside; the rest is deeper in the sky,
// a few of it faintly in view, the rest there when you step back.
export const PLACE = {
  you: [0, 0, 0],
  signal: [-30, -175, -40], ritual: [125, -75, 20], harbour: [100, 120, -30], together: [-55, 190, 10], lia: [-130, -5, 40],
  tomer: [-150, -245, 110], maya: [170, -215, 120], ink: [80, -285, 160], elad: [172, 55, 110], lowtide: [-160, 170, 120],
  noa: [-250, 80, 420], nature: [215, -20, 420], near: [-180, -330, 520], slow: [230, 310, 500],
  patch: [-520, 260, 520], daniel: [380, 330, 420], bfa: [560, -300, 640], chron: [-480, -380, 560], dotan: [260, -600, 520],
  minerva: [120, 640, 560], brosh: [-260, 600, 600], gordon: [-360, -700, 700], tama: [420, -760, 740], cca: [-560, 520, 760],
};
export const placeAll = st => st.forEach(s => { const p = PLACE[s.id] || [0, 0, 900]; s.x = p[0]; s.y = p[1]; s.z = p[2]; });
