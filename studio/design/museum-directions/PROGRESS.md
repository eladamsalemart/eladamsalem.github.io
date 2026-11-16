# Museum directions: progress (started 16.11)

Task (lead session, for Elad): five or six distinct architectural DIRECTIONS for the museum, a Hebrew PDF (+ the HTML page it is made from) in this folder, due this evening
(~7 h budget). Each: name + idea paragraph, drawn plan, section / skylight logic, 3-4 renders (eye level + bird's eye), how it holds a changing programme, how it fits a phone,
pros/cons, what it takes in synth.js. Close with a comparison table and a recommendation. Status line to the lead every ~90 min. Send the PDF to Elad with SendUserFile.
Implementation of the museum is STOPPED (no more museum commits to the app) until the PDF is read; the rebuild is at night.

## Done
- [x] Stopped; notes of the unfinished one-building rebuild saved: `WIP-one-building-notes.md` (nothing was uncommitted).

## Plan
- [ ] Read `RESEARCH.md` (the lead commissions it in parallel) and the owner's wishes (below) -> `BRIEF.md` (one page)
- [ ] Sketch-model engine (three.js): rooms, walls with real window holes, skylights, vaults, glass, plinths, works; plan / section cut / bird's-eye / eye-level renders
- [ ] Six directions modelled and rendered (A-F)
- [ ] The Hebrew page `index.html`, the PDF, checked
- [ ] Send to Elad; report to the lead

## Owner's wishes (collected)
A real art museum BUILDING (walls, roof; no open-air houses, nothing in a park); start with ONE building, later wings, passing between buildings, a patio. A central hall with
coulisses and plinths with single works; exhibition spaces; sculpture on plinths indoors, paintings on walls. Many changing exhibitions: a strong base that expects change.
History sections (walk through time: Renaissance with Baroque neighbouring; Impressionism with Realism/Romanticism before; Cubism ...), public-domain works; solo shows; a
truly open walking space between exhibitions; the Renaissance wing widens and changes as you walk; small architecture maquettes; realistic look and real scale; daylight by the
visitor's hour; a slowly moving film on Home's tile; a tappable plan with a list that jumps to an exhibition; phone first (iPhone, performance).

## 16.11 (after the usage reset): REPLAN done as
- Five ideas modelled (`dir-1.js` ... `dir-5.js`, engine in `engine.js`, renders by `render.cjs`): 1 Growing Spiral, 2 House of Rooms (+ Soane panels, telescope), 3 Light Clock, 4 Under One Sky (recommended), 5 Plug-in Frame. The six first studies (`dir-A`..`dir-F`) are appendix A.
- Parts of the document written by Sonnet agents from `research/` and `OWNER-BRIEF.md`: `parts/part1.html` (owner's journey), `part2.html` (museums), `part3.html` (digital + our technology). Part 4 (ideas, comparison, recommendation) is `ideas.py` + `build_page.py`.
- Build: `python prep_imgs.py <renders> <first six renders>`, `python build_page.py`, then headless Chrome -> `museum-directions.pdf`.
- Nothing was published to the live museum.
