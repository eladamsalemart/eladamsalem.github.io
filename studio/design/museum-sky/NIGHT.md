# The museum's night shift (owner's standing order, 21.11.2026)

**First, every run: read `studio/QUALITY.md` and `studio/GROWTH.md`** (the owner's standard, 23.11). Nothing reaches the owner or `studio` until it passes its "Before calling anything done" list. When he corrects something new, add it there as a rule.

**What Elad asked for:** every night from 22:00 to 08:00 (Israel time) the museum technology keeps improving by itself, as long as the app is in development: code, looks, design, textures,
the virtual exhibition spaces, everything defined in `ROADMAP.md` and in the queue below. A new definition from Elad is added to the QUEUE and gets worked on the same night. With no new word
from him the shift picks its own next step (rules below). If the daily quota runs out, the shift teaches itself to come back (the retry rule). It must spend as few tokens as it can, because Elad
runs out of his weekly quota around Wednesday and has other work in the same quota. Efficient and professional, not busy.

Run by the scheduled task `museum-night-shift` (local time every hour at :11 from 22:11 to 07:11; a run exits at once when the heartbeat is fresh, so each hour is a cheap check and a dead run is resumed within the hour). Each run is a fresh session with no memory: this file and `ROADMAP.md` are its memory. Reply and log in Hebrew; code, commits and app text stay English.

## 1. Start of every run (spend almost nothing if there is nothing to do)
1. Read `night-state.json` (next to this file). `heartbeat` newer than 45 minutes: another run is working, EXIT at once. Outside 22:00-08:00 local time: EXIT (unless Elad is talking to you).
2. Write the heartbeat `{ "heartbeat": <now>, "run": <id> }` now and every ~15 minutes of work, and a final one with `"done": true` when you stop.
3. Budget gate with `mcp__ccd_session_mgmt__get_usage` (needs ToolSearch select first):
   - weekly used >= 60%: STOP for the night (the rest is Elad's daytime). In the last 24 h before the weekly reset (`resetsAt`) the gate is 85% (use it or lose it).
   - 5-hour window >= 70%: stop now and use the retry rule.
   - Remember the weekly percent at the start; stop this night when it has risen by 5 points (8 in the last 24 h before the reset), or at 08:00.
4. Read `ROADMAP.md` (the unchecked items), the QUEUE below, `night-log.md` (the last 15 lines). Nothing else is read whole.

## 2. What to work on, in this order
1. The QUEUE below (Elad's own additions), oldest first.
2. The next unchecked item of `ROADMAP.md`.
3. If both are empty: audit once, cheaply: render the reference (`blender/hall_reference.py`, ~50 s) and the app from the same view (`blender/` README line in the script header; the app shot via `inspect.shot`), look at the difference, write the 3 biggest gaps as new ROADMAP items, start the first. Also allowed: a recurring job Elad named (adding an artist's original exhibition: ROADMAP "Adding an artist's original exhibition").
4. Never: Home's look (fixed), sign-in, Supabase data or secrets, anything outside the museum technology, deleting Elad's data, other sessions' uncommitted files. Anything that needs Elad's own login or money goes to "Needs Elad" in the log, not guessed.

## 3. How to work lean (tokens are Elad's money)
- One session, Sonnet-class work, no subagents, no parallel sessions. One ROADMAP item per run is plenty; two at most.
- Read files by `grep`/line range, never whole big files (`synth.js` and `space.js` are huge). Patch with small scripts or Edit; long heredocs break, write helper files with the Write tool.
- Pictures last: measure with `inspect.stats()`, `museum_live.cjs` and a number first, then ONE cropped phone-size contact sheet (several views joined by ffmpeg into one image) per question, at most 2 looks per item.
- Re-use the helpers in `studio/design/museum-sky/blender/` and the scripts named in `ROADMAP.md`; the local server is `python -m http.server 8199` from the repo root (start it if not running, in the background).
- No polling loops, no sleeping. Long jobs (film re-render, Blender) go in the background once and are collected once.

## 4. Quality gates before every push (a change is done only when all hold)
1. `node studio/app/tests/museum_live.cjs http://localhost:8199/studio/app/` prints "all 12 checks pass" (run it twice if it fails once: it has known timing flakiness on software GL; a second failure is a real bug).
2. Looked at as a phone (390x844, device scale 2) AND at device scale 1 (desktops: a green-floor bug lived only there), day and, if lighting changed, 21:00.
3. Memory/draw calls not worse (`inspect.stats()`, `inspect.memory()`): calls <= 260 at the start view, memory estimate <= 460.
4. Commit only your own files, `git fetch` + `git merge origin/studio` if the push is rejected (never stash, reset or switch branch), push to `studio`. End the commit message with the Co-Authored-By line from the harness.
5. Tick `ROADMAP.md` (what is done, what stays open), add one line to `night-log.md`.

## 5. The retry rule (when the quota ends or a run dies)
- If the 5-hour window is above 95% or a tool says the limit is reached: create a ONE-TIME scheduled task (`create_scheduled_task`, `fireAt` = the window's `resetsAt` + 3 minutes, only if that is before 08:00 local) named `museum-night-resume-<date>` with the same prompt as `museum-night-shift`, then write `"done": true` and stop.
- The hourly triggers (22:11-07:11) also act as a safety net (Elad 22.11: every night, teach yourself to come back after the quota resets while he sleeps): a later trigger sees a stale heartbeat and continues.
- Never use a poll or a sleep to wait for a reset.

## 6. Morning note
At the end of the last run of the night (or when you stop for the budget) write at the TOP of `night-log.md` a Hebrew summary of at most 6 lines: what was done (commit ids), what was checked and how, what was NOT checked (live site, real iPhone), what is open, what Needs Elad. Do not mail anyone (the owner's rule: mails go only to ooopenstudio@ and this is not worth one). When Elad opens a session, he reads the note, and the session starts from it.

## 7. QUEUE (Elad's additions: add a line "date, what, who said it"; remove when done and move to ROADMAP "Done")
- 21.11: the standing mandate as a whole: keep improving realism of the museum and the exhibition spaces in code, looks, design and textures, with the Blender path-traced reference as the quality target.
- 21.11 (Elad): (a) WALKING SPEED is too slow for a hall this big: first thing, cheap: raise it for the museum (a run mode, a faster joystick curve, a tap-to-walk that is quicker over long distances; `WALK` in space.js; keep the tour rooms as they are), check on a phone-size view and that nobody walks through walls. (b) Walls: real thickness (reveals at doors, window and opening depths, wall-top caps), realistic walls. (c) Better textures for walls and floor (plaster, concrete, terrazzo, oak: detail, normal-like shading, variation). (d) Higher resolution for the sculptures and the architectural models (the Renaissance wing's GLBs and maquettes: textures, smooth normals, LOD so phones stay fast). (e) In general a more realistic feel in every area. Roadmap items 14-18 carry these.
- 22.11 evening (Elad, VERY IMPORTANT, FIRST tonight; the tropical outside comes right after it): an exhibition that was already DESIGNED is shown in the museum IN ITS OWN SPACE, never re-hung. When the Desk puts an exhibition into a pavilion (or adds it with its original space):
  - an artist's VIRTUAL show (e.g. Nana, `show-<id8>`, a `virtual_shows` row): the pavilion is that show's chosen virtual room (`room`, `paint`, `centre`), with every work where the artist hung it (`placements`: wall, a, y) and its plinths, exactly as in `#/exhibition/<slug>/space`; built in place inside the museum (preferred) or, if a room cannot fit a pavilion, the pavilion is a doorway that walks straight into that room and back out to the museum;
  - a REAL exhibition (e.g. Ritual): its photographed/measured original space (`data/spaces/<slug>.json`, its surfaces and works at their measured places), the same: in place, or a doorway into it and back;
  - the Desk must NOT lay paintings out by itself for these (today `walk()`/buildSky hang `works` evenly round an 8 x 6 room: that path stays only for the museum's own Desk exhibitions and demo shows). The Desk preview and the app must give the same result. The plan editor shows such a pavilion with its real footprint if it is built in place.
  - the owner's direction: in future almost every exhibition will be one designed before and shown in its original space; the numbered pavilions matter less. Design the code for that (a pavilion = "a space of type X with its own description"), not as a special case.
  - check: Nana and Ritual put into pavilions on the Desk (guest + live data), walk in from the museum, works where they were designed, walk back out; phone 390x844 and DPR 1; museum_live 12/12; calls/memory budget.
- (DONE 22.11 night 4 for ritual + virtual rooms: `r.original` in synth.js `buildOriginal`; open: memory budget, room-size overlaps, wings' text) 22.11 night (Elad, with a phone screenshot; part of the same FIRST item as ROADMAP 20): the original-space house today shows an arched PICTURE of the room on the wall with the words "Walk into the original space" and a tap walks in: Elad says it looks bad ("the strange thing"). REPLACE IT. A pavilion must look like a real, realistic building from outside (a square pavilion is fine), and the moment the visitor walks up to it and steps through its door they are simply INSIDE the original design, with no picture, no arch-poster, no label, no tap, no route change: the inside is exactly the original space (its walls, floor, ceiling, light, works at their measured places). Build the original space in place inside the pavilion volume (or, if it cannot fit, stream it in and swap the view seamlessly at the threshold, with the pavilion's doorway lining up so no jump is seen) and walking out returns to the museum at the same door. Remove the poster arch and `r.enter` hotspot path for these. The outside of the pavilion: real materials, door, glazing, light, shadow, matching the museum's realism target. Same checks as ROADMAP 20 (phone 390x844, DPR 1, museum_live, budget).
- 22.11 evening (Elad, asked SEVERAL times, do it with the item above): EVERY exhibition in the museum comes with its TEXT: inside the exhibition itself and on the wall at the entrance beside its door (the readable plate with the reader overlay exists for some houses: make it universal: Desk exhibitions, real ones, artists' virtual ones (their `text`), demo shows, the themed wings (each bay's text), original-space houses). A show with no text shows its title, artist and dates. Check every pavilion and wing on the live data has a plate, and that it is readable on a phone.
- 22.11 (Elad, FIRST PRIORITY TONIGHT, before ROADMAP 15-18): the museum's OUTSIDE (plants, trees, lawn, ground, pool surround, what is seen through the glass) looks about 15% realistic to him; the aim is 100%, and the mood should be more TROPICAL (palms, banana and monstera leaves, ferns, big-leaf understorey, hanging vines, humid light, warm haze, wet stone, water). Work from the Blender reference (`blender/hall_reference.py`) and look at it as a phone and at device scale 1. Budget for phones stays (calls <= 260, memory <= 460): use impostor cards/instancing, baked foliage atlases, not geometry. ROADMAP item 19.
- 22.11 (Elad, done by the day session): walking is fast in the hall and a stroll inside exhibition rooms and the wing (`spec.slow` in synth.js, `inSlow` in space.js).
- 21.11 (open from earlier): add real artists' exhibitions with their original spaces whenever one exists (Ritual is done; method in ROADMAP).

## 7b. Planned nights (21.11; a plan, not a promise: the budget gate decides; re-order when Elad says so)
0. FIRST (cheap, tonight if the budget allows): ROADMAP 14, walking speed. Then 15-18 are slotted in after night 3, alternating with the Blender steps (a night on 15 or 16, a night on the Blender shell).
1. ROADMAP 9, part 1: author the hall in Blender from the plan (walls, ceiling, details, UV2), bake day light (AO + sun + sky) to lightmaps, export one GLB; measure size and memory.
2. ROADMAP 9, part 2: `shell.js`: load the GLB behind `?shell` next to the current building, compare with the reference render, keep the old path as fallback.
3. ROADMAP 9, part 3: three baked states (day, golden hour, night) and the blend by hour; remove what the shell replaces (floor/sun-pool painting) only when the shell is equal or better on a phone.
4. ROADMAP 1 + 6 leftovers: foot-of-wall shadows inside houses and under plinths; plaster and pale/concrete house floors with detail maps.
5. ROADMAP 7: ceiling coffers, door frames with depth, mullions as geometry (only if the shell did not already give them).
6. ROADMAP 11: eco mode (15 fps, only while the plaza is on screen), then pool ripple, tree sway, distant figures.
7. ROADMAP 5, 8, 12 leftovers: dust motes and glow, warm light bleeding out of the doorways, frames, labels, plinth detail.
Whenever a night is cheap or a step is blocked, take a leftover from the list above. ROADMAP 13 and the real-iPhone measurement wait for Elad (a next exhibition to add; his phone).

## 8. What this needs from Elad
- The computer on and not asleep during the night (scheduled tasks run only while the Claude app is open; a missed one runs at the next launch). Windows: Settings > Power: never sleep while plugged in.
- Scheduled runs should not stop at permission prompts: the permission mode of the task sessions must allow git, node, python, ffmpeg and blender without asking (the same as the app-health runs).
- The existing weekly rhythm (reset Saturday evening) is used by the budget gate; if he wants less or more night spending, he says "תחסוך" or "תשקיע יותר" and the numbers in section 1 change.
