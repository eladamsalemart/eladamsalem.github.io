# The exhibition importer: a real exhibition's tour → a museum pavilion (draft)

One command does what Ritual took many rounds of hand work to reach (commits 2d3afa0 → e068c33, 16–24.11).
It makes no AI calls. Everything it decides is measured from the tour (`data/spaces/<slug>.json`) and the
museum's geometry (`synth.buildSky`). The result is a **draft**. Nothing goes live until the owner approves it on the Desk.

    node studio/app/space/importer/import.cjs <slug>          (ROOT=<folder to serve>, PORT=8231, KEEP=1)

Output: `studio/app/data/museum/drafts/<slug>.json` (the plan entry, the gate's verdict and reasons, the measures)
and `studio/app/data/museum/drafts/<slug>/` (the side-by-sides and the report `report.md`).

## What Ritual taught (the steps, in the order they had to be learned)

| # | Step | Ritual commit | Rule in QUALITY |
|---|------|---------------|-----------------|
| 1 | The tour itself passed its own build and inspection (`<slug>.status.json` state `live`) | 6a5dd45 | Realism, measured |
| 2 | The pavilion is the tour's **own room**, not a house with a poster arch | 2d3afa0, e0f80f6 | Keeps its own architecture |
| 3 | The way in goes **through a real opening**: arches first, then the widest doorway (sill 0, ≥ 2.1 m high, ≥ 0.9 m wide) | 9ae36c4 | No entry through a painting |
| 4 | **Every** walkable opening of that wall leads into the museum, none stays a photo of what was behind it | 1149624 | No blocked or strange opening |
| 5 | One wall, one thickness: the plaster skin (T = 0.22 m) is cut to the same shapes (arch as arch), both jambs and the head at full depth, and the collision gaps match | 3c42677, c9719b0 | Full-thickness jambs |
| 6 | The wall text is flush on the skin of the door wall, in a solid run with a margin, never across an opening | 1149624 | Text flush on a wall |
| 7 | Walls at the tour's px/m on phones too (2048 px cap: a 14 m wall ≥ the tour's 200 px/m) | 1149624 | px/m measured |
| 8 | Works at their measured size and place, first image at the tour's 1024 px | 42a1876 | Works at real size |
| 9 | The floor tile repeated at its true px/m (333 for Ritual), never baked blurred; the light maps carried over | 42a1876, 3f07d37 | Textures ≥ the tour |
| 10 | The floor's gloss: a mirror made only while inside, at y 0.026, **proved** by tinting it red and reading the floor's pixels | ac8032a, e068c33 | A screenshot can lie |
| 11 | Phone memory under budget, at the start view and inside the room (460 MB, NIGHT.md) | 1e48d0b | Memory saved where the visitor isn't |
| 12 | A free place in the plan: no overlap with houses, the wing, the pool, piers, stands, plinths; reachable from the way in | (by hand, `lay3.js`) | Every opening leads somewhere |

The pavilion code that builds steps 2–10 is already general (`buildOriginal` in `synth.js`, any `house` with `tour`).
The importer is the part that was done by hand each time: choosing the place, checking the result, and
proving it. It does not change `synth.js`.

## What the importer does

1. **Read the tour.** Its walls, openings (arch or doorway, width, height, rise), works (centre, size), floor
   (texture, tile, px/m), light maps, floor reflection, status.
2. **Find a free place.** It builds the museum as it is now (the live `museum_plan`, read only), takes its collision
   walls and plinths, and tries every door position on a 0.5 m grid in four directions. A place is free when the
   pavilion's footprint, with a 1.2 m margin, is inside the hall (1.5 m from the glass), touches no wall, pier, pool,
   stand or plinth, and keeps clear of the entrance and the start view. It is then linked when **each** of its
   real openings opens onto floor from which the visitor's start can be reached (a walk on a 0.5 m grid). It picks the
   free, linked place with the shortest walk from the entrance.
3. **Write the draft**: `{ id, type: 'house', slot, tour, door, dir }` plus everything measured. It writes
   nothing to the database and nothing to `SKY_PLAN`.

## The gate (runs before the draft is offered; each line passes or says why not)

- `tour_live`: the tour passed its own checks (`status.json` state `live`).
- `real_openings`: the room has at least one walkable real opening. A door the importer would have to invent fails.
- `jambs`: in the built pavilion, every opening in the skin has depth ≥ T (0.22 m), keeps its shape (arch ↔ arch), lines
  up with the room's opening within 2 cm, and has a collision gap the same width. No solid crosses a walk-through line
  1 m inside to 1.5 m outside (`no blocked opening`).
- `text_flush`: the text plate lies on the skin's plane (≤ 1 cm), faces outwards, stays inside a solid run with ≥ 0.25 m
  margins, and overlaps no opening.
- `px_per_m`: for every wall, the floor tile and the works, the museum's px/m on a phone (measured on the GPU textures,
  `inspect.textures()`) is at or above the tour's.
- `floor_mirror`: inside the pavilion its floor mirror is on, and tinting it red turns the floor's pixels red (gain > 8),
  as `tests/pad_mirror.cjs` does for Ritual.
- `phone_memory`: `inspect.memory()` ≤ 460 MB at the start view and inside the pavilion (390×844, isMobile).
- `side_by_side`: three views (from the way in, from the middle at the longest wall, from the far end back to the
  openings), each rendered in the tour and in the museum from the same place, saved as one picture per view. The
  gate fails if a museum view shows holes (magenta) or the works seen in the tour are missing in the museum.

A draft that fails is still written, with `gate.pass: false` and its reasons, so the Desk can show why.

## Approval

The Desk lists `data/museum/drafts/index.json`. A draft that passed shows its side-by-sides and an
"Add to the museum" button, which adds its `space` to `museum_plan` (with undo, like every plan edit). A draft that
failed shows its reasons and no button. Until the owner presses the button, the pavilion exists only in the draft file.
