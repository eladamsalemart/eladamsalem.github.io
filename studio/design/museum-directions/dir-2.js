// 2. The House of Rooms (בית החדרים): a brick monolith with a dozen rooms of very different height, proportion and light, entered in a sequence with turns (Kolumba; Chipperfield's
// "house of rooms" at Kunsthaus Zurich; Soane's house-museum). From outside, a modest block; inside, a chain of rooms longer than the block seems able to hold (Soane's house; House of Leaves).
// Two digital-native rooms: the Picture Room whose hanging panels open like pages (Soane), tripling the hanging wall of one room; and a telescope gallery of portals that shrink, so that
// the Renaissance wing looks longer than it is (forced perspective). Built on the first study of the chambers (dir-F.js).
import { build as chambers } from './dir-F.js';
import { REN } from './engine.js';
export function build(E) {
  const cfg = chambers(E);
  // the Soane panels in the tall room: three panels hinged on the east wall, open at different angles, a picture on each face
  const hinges = [[21.7, 4.4, 38], [21.7, 8.6, 84], [21.7, 12.8, 128]], pics = [['raphael-school-of-athens', 'botticelli-primavera'], ['michelangelo-creation-of-adam', 'giorgione-the-tempest'], ['leonardo-mona-lisa', 'titian-venus-of-urbino']];
  hinges.forEach(([hx, hz, deg], i) => {
    const f = deg * Math.PI / 180, d = [-Math.sin(f), Math.cos(f)], L = 3.2, c = [hx + d[0] * L / 2, hz + d[1] * L / 2], ry = -Math.atan2(d[1], d[0]);
    E.box(c[0], 2.1, c[1], L, 4.2, 0.1, 'white', ry);
    const wl = { a: [hx, hz], b: [hx + d[0] * L, hz + d[1] * L], t: 0.1, y0: 0, h: 4.2 };
    E.art(wl, L / 2, 1, 1.9, 2.1, pics[i][0], 2.0, REN); E.art(wl, L / 2, -1, 1.5, 2.0, pics[i][1], 2.0, REN);
  });
  // the telescope: three portals across the long gallery, each smaller than the one before
  E.wall([30, 2], [30, 10], { h: 4.6, t: 0.3, gaps: [[1.2, 6.8, 4.2]] }); E.wall([38, 2], [38, 10], { h: 4.6, t: 0.3, gaps: [[2.0, 6.0, 3.7]] }); E.wall([46, 2], [46, 10], { h: 4.6, t: 0.3, gaps: [[2.8, 5.2, 3.2]] });
  E.plinth(52, 6, { obj: 4, h: 1.0 });
  cfg.labels.push([16, 5, 'חדר התמונות: לוחות נפתחים'], [38, 11.2, 'טלסקופ: שלושה פתחים'] );
  cfg.views.e1 = { eye: [30.2, 1.6, 31.6], look: [26, 3.6, 19.5], fov: 70 };
  cfg.views.e2 = { eye: [14.2, 1.6, 8.4], look: [21.5, 2.2, 8.6], fov: 70 };
  cfg.views.e3 = { eye: [23.4, 1.6, 6], look: [53, 1.8, 6], fov: 60 };
  cfg.section.labels.push([16, 6.5, 'לוחות נפתחים']);
  return cfg;
}
