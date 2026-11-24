# The art-view agent: the museum and the art, as real and as sharp as possible

**The owner's order (24.11):** his top priority is the visitor's experience in the museum and the experience of
looking at art. The museum should feel real and special. Every work should be seen at its best quality and
resolution wherever it hangs: in the pavilions, and just as much in the museum's own halls, where art is spread
around. He loved the pavilion solution, where resolution rises once you are inside. The whole museum should feel the same.

This agent works on that alone, in short runs. Each run makes one measured improvement. The agent improves itself:
after every run it writes what it learned below, and the next run starts from that.

## Read first, every run
1. `studio/QUALITY.md` and `studio/GROWTH.md`.
2. This file: the queue and LEARNINGS.
3. The visitor robot's latest result, if it exists (`studio/health/robot/latest.json`): its flags on sharpness, px/m
   and art.
4. `git log --oneline -15 origin/studio`. Don't redo or collide with work that just landed. Other sessions own
   files: museum-night owns the works loader in `space.js`, texture-opt owns the image copies, and the museum session
   owns the layout.

## How a run works
1. Pick the top item in the QUEUE that isn't done, or a red robot flag about art if one is newer.
2. Measure it first, as a phone: 390×844, DPR 1, isMobile, hasTouch, opened as a visitor (no `?inspect`, or with
   `&phone=1`). Write down the number: px/m at 1 m from the work, texture px uploaded to the GPU, frame time, memory
   (budget 460 MB).
3. Make one change, the smallest one that moves the number.
4. Prove it by its mechanism, not by one screenshot (QUALITY: "a screenshot can lie"). Make a before/after
   side-by-side at 390 wide. Check that memory stays under budget. `tests/pad_mirror.cjs` and museum_live must still pass.
5. Push to `studio`:
   - commit only your own files, never `content/works.json`;
   - never switch branches;
   - `git pull -q --no-rebase origin studio && git push -q origin HEAD:studio`.
   A `space.js` change triggers "Studio spaces". Follow it to the end in the next run.
6. Update this file: tick the queue, and add 1–3 lines to LEARNINGS (what worked, what didn't, numbers, traps).
   Add a QUALITY rule if a check should have caught something.
7. Report in one short line to the main Open Studio session (SendMessage to the session titled "STUDIO OPEN SYUDIO
   NEW", the lead; find it with ListAgents). Never write to the owner directly. Then archive this run's session
   (`archive_session` with "self").

Stop early, without starting new work, if the weekly usage is above 85%. Write where you stopped.

## QUEUE (the lead keeps it ordered; add items you discover at the bottom)
0. [ ] **The way in: first frame on 4G.** Live on a throttled 4G phone (9 Mbps, 150 ms, cold cache) the museum's
   first frame takes 14.2 s, and before texopt it took 26.4 s (24.11). A visitor gives up long before that. Find what
   blocks the first frame (scripts, geometry, the first textures, fonts, the sky), and show a real first view fast,
   then stream the rest. Target: under 5 s on 4G, with nothing visibly worse. Measure it the same way (texopt's 4G
   setup) before and after, and check the Desk's טלפונים tab for real visits.
1. [ ] **Hall art at pavilion quality.** Make sure works hung or standing in the museum's own halls and spaces get
   the same near-first full resolution as inside pavilions. Measure px/m at 1 m for 5 hall works against a pavilion
   work. Fix any gap.
2. [ ] **Oblique sharpness.** Anisotropic filtering at the GPU's maximum on works, walls and floors, plus correct
   mipmaps. Works seen from the side must not blur. Prove it with a 45° shot before and after.
3. [ ] **Gallery light per work.** Each work lit like a gallery spot: a soft pool on the wall, no flat look, colour
   true (dE against the source under 2). It must be cheap on phones: a baked or projected light, not a shadow map per work.
4. [ ] **Look closer.** A tap on a work opens a full-screen viewer with deep zoom into the original photo (tiles at
   full resolution, pinch to zoom), with title, size and medium. Leaving it returns to the same spot.
5. [ ] **The works' surface.** Canvas or paper texture and edge depth, and frames or no frames as the artist has
   them. Subtle and real, never a plastic sheen.
6. [ ] **Museum life and special moments**, in line with ROADMAP: light that changes with the hour, soft sound on
   request, the transitions between exhibitions. Only after 1–5.

## LEARNINGS (newest first; keep short, prune what no longer helps)
- 24.11 runs stopped before work: weekly usage 95%, then 100% (>85%). Nothing measured or changed; queue item 0 (4G first frame) is still next. Resumes after the weekly reset (28.11 ~19:00).
- 24.11 (from the work so far): memory is saved where the visitor isn't looking. Far works are held small and get
  full size on approach, at most 2 at a time. Measure as a real phone: `?inspect` without `&phone=1` turns phone mode
  off and doubles memory. A frame loop that returns early while the visitor stands still blocked the full-size swap
  (fixed in a5a3cff), so test standing still too. Ritual's walls at the tour's 200 px/m (0b470c4).
