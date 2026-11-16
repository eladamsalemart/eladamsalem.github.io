# Saved notes: the one-building rebuild that was stopped (16.11)

Nothing of this was built or published; the live museum is the Cluster + Renaissance wing (commit d9fe406). These are the design notes, so the night rebuild does not start from zero.

## Plan of the building (first idea, to be replaced by the chosen direction)
- Hall 42 x 18 m, 8 m high. North side: four exhibition rooms (centres 5.25, 15.75, 26.25, 36.75). South side: four rooms (4.6, 13.8, 28.2, 37.4) with the entrance gap (17.8-24.2) as a big window wall.
  Rooms keep the Desk's rules (8 x 6 m interior, porch 1.8 m, wall hang `s`/`y`), so the Desk does not change.
- Daylight: skylight panels in the hall ceiling (texture built from the hour: bright by day, dark blue at night), windows (holes with `sill`) in the south and west walls; a
  window looks out on a sky and the tree ring (`outdoors.js`), nothing else outside; no lamps.
- Heralds: 3 freestanding walls (coulisses) at angles, the first work of each exhibition on their faces; plinths with objects.
- Wings: a section is attached to a hall wall (`door: {wall: 'east', at: 0}`), its frame derived from the wall's direction (`o` out of the hall, `R = (-o1, o0)`); the existing
  section code (`synth.js`, search `history sections`) already works in that frame, only the hard-coded `R = [-1, 0]`, `o = [0, 1]` must become parameters.
  The wing opens from the hall through a 5 m x 4.6 m opening with its title painted on the hall wall; no facade, no outer skins. Windows in wing bays: on the right wall
  in the first 2.5 m from the far end (hang runs start at 3.4 m there).
- Spawn inside the hall at the south, looking north.

## Navigation: the tappable plan (design)
- `spec.directory = [{ title, kind: 'exhibition' | 'section' | 'hall', at: [x, z], look: [x, z] }]` built by the builder (a spot 2.5 m in front of the door or the first work, facing it).
- space.js: a tap on `.sv-map` (when `spec.directory` exists) opens an overlay `.sv-dir`: the plan large (clone of the map svg, same viewBox, labels at `mx(x), mz(z)`) and a list of buttons;
  a button calls `jump(at, look)` = `setMode('walk'); goFree(); walkTo = null; pos.set(x, EYE, z); tPos.copy(pos); aimFrom(pos, look)`, closes the overlay.
  Tapping the large plan itself walks to that point. The small map's own tap-on-a-work behaviour moves to the large plan. Touch targets at least 44 px; the list scrolls; closes on the Escape key and on a tap outside.
- The existing `inspect.place(at, to)` is the same movement (line ~1257 of space.js).

## Things learned while building the Cluster that apply to any direction
- `inspect.shot()` paints a magenta background to show holes; skipped when `spec.outdoors` (it would hide the sky).
- Photos for a film: the viewer is held to a 430 px column; `museum_film.cjs` removes the limit and draws each view once, wide.
- A GLB scan of a statue needs `computeVertexNormals()` and its own lights (`props.js`), the room's surfaces ignore lights.
- Public-domain images: Wikimedia Commons API `imageinfo` + `extmetadata`; models: SMK Open (CC0) scans are good; no free architecture models exist.
