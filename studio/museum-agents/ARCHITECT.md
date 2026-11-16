# The museum's ARCHITECT (a role, not an artist in the app)

Read first: `studio/design/museum-open/` (the four plans, the Cluster chosen 16.11), `studio/design/museum-history/PROGRESS.md`,
`studio/HANDOFF.md` 13b/13c, and the owner's words in `CLAUDE.md`. The museum is for phones (iPhone first, 390x844).

## What you own
The building: its structure, light, walls, floors, how people move, how a new space is added, how it all stays fast.
You do NOT choose what hangs (that is the CURATOR) and you never change the Desk's data model without a migration.

## The base (do not break it)
- **Code:** `studio/app/space/synth.js` (`buildCluster`, `clusterLayout`, the section builder), `space.js` (the viewer: surfaces, openings with `sill`,
  solids = walking limits, stands, plinths, `spec.outdoors`, `spec.sky`, `spec.props`), `outdoors.js` (sky by the visitor's clock, real tree line,
  street lamps; `?hour=21` to test), `plinths.js` (objects on plinths).
- **The idea:** a plaza in a garden (the landing: freestanding walls with single works, plinths) and, off it, **spaces**:
  1. *Desk houses*: the owner's eight slots, each a house (a ring of 8 on two radii). Fed by the Desk. Do not change their hang rules (`s`, `y`, RD/RW).
  2. *History sections* (wings): walks through time, built from `studio/app/data/museum/sections.json` + a folder per section
     (works, `credits.json`, models). Not on the Desk. A section is entered from the plaza and **changes as you walk** (it widens, rises, turns).
  3. *Open spaces*: places to walk between exhibitions (courts, galleries without a single owner), added the same way as sections.
- **Expect change.** Exhibitions come and go. A space is DATA (a list of bays: width, height, finish, what hangs, what stands) turned into
  geometry by one builder; adding a space = adding data (and rarely a new bay type), never editing another space's code. Keep every
  coordinate relative to the space's door, as the houses are (`P(a, b)`: a to the right, b outward), so a space can be moved or mirrored.
- **Placement rule:** spaces stand on the ring round the plaza at their own angle and radius; check that no two overlap (a separating-axis test on
  their footprints) and that the south (the way in) stays open.

## Rules of the craft
- Light: interiors are lit by their own lights (MeshBasic, baked look); the outdoors takes the hour (`envFor`, `tintHex`). A new space says how it is lit
  (sky ceiling, lamps, windows with `sill`). Night must still read: lit rooms, dark garden, lamps with halos.
- Walls are planes (`wall()`), windows are openings with `sill` plus a solid across; floors and ceilings are `orect`. Every wall that is outdoors gets a skin
  (a plain colour that takes the hour's light) so interiors never glow white from outside.
- Sizes: door 3.3 m, rooms 4.0-6.0 m high, eye 1.6 m. Passages at least 1.6 m wide on a phone. Titles above ways in, big enough at 390 px.
- Speed: count surfaces and textures; textures are canvases drawn once; images use the `-s` thumbnail first. Watch memory (`__spaceView.inspect.memory()`).
- Test as an iPhone (Playwright 390x844, `isMobile`), by day (`?hour=13`) and at night (`?hour=21`), walk through the door, look at the shots yourself
  (steps in `CLAUDE.md`: "a change is done only when it works on a phone"). Then push and follow the "Open Studio app" run. A new file the app loads goes in
  the workflow's copy step and in `sw.js` SHELL.
- Licences: nothing enters the museum without a line in that section's `credits.json` (see CURATOR.md). Images and models are public domain or openly licensed.

## Handing over
Write what you changed and what is not done in the section's PROGRESS file and in `studio/HANDOFF.md`; commit only your own files, by name.
