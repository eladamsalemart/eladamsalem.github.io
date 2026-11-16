# Museum realism roadmap (standing mandate, owner 16.11)

**Owner's rule:** every "תמשיך" = take the NEXT unchecked item here, finish it with proof (phone-sized shots, speed check), publish, tick it, write one line in the log below. The bar is "as realistic as a good architectural render, on an iPhone". Do not stop for weeks. Tell the owner in Hebrew when a tool or software is needed (the list at the bottom).

Source of the plan: `studio/design/museum-directions/research/04*` (top path: Blender-authored shell, Cycles lightmap bake, GLB with Meshopt/KTX2, PBR CC0 materials, sky + IBL, skylight atmospherics, floor reflections, tone mapping, portal culling, quality ladder).

## Done
- [x] One building generated from a description, soft light pools by hour, glass walls, sky and trees by hour (16.11)
- [x] Tappable plan with list and jump
- [x] Exhibition texts as plates on the OUTSIDE wall, tapped like a work, read large; source language (Hebrew RTL) (16.11)
- [x] Artist's own exhibition added with its original space: Ritual pavilion, arch picture, tap walks into the photographed tour (16.11)
- [x] Home film: a slow visitor's walk (16.11)

## Next, in order (one per "תמשיך")
1. [x] **Contact shadows / ambient occlusion baked into the floor** (16.11): soft dark around every house, pier, stand, pedestal and at the glass walls' foot. Still open from this item: the same soft dark at the foot of the walls INSIDE houses and under plinths (plinth floor shadow).
2. [ ] **Glass that looks like glass**: faint reflection of the room on the glass at grazing angles, slightly green edge tint, mullion thickness and shadow, a faint dirt/sheen gradient.
3. [ ] **Floor**: polished-concrete reflection of the light pools and the houses (cheap planar/blurred reflection), joint lines every 3 m, subtle wear; grass outside the pool not stair-stepped (check the green patch near the pool/east side).
4. [ ] **Sky + IBL**: PMREM environment from the hour's sky so every material gets the right ambient colour; tone mapping (ACES/AgX) and exposure by hour.
5. [ ] **Skylight atmospherics**: light shafts/dust under the soft oculi at low sun; glow around the brightest openings.
6. [ ] **PBR materials**: CC0 concrete, plaster, oak with normal/roughness maps (KTX2 compressed) replacing flat painted textures; wall plaster with subtle sheen.
7. [ ] **Real geometry for the details**: skirting, door frames with thickness and a shadow gap, ceiling coffers, window mullions as geometry not texture.
8. [ ] **Houses lit from their own light**: warm interior light bleeding out through the doorway onto the floor, door-colour glow already there; add soft shadow of the house onto the plaza floor.
9. [ ] **Blender-baked shell (lightmaps)** for the building: one GLB with UV2 lightmap per hour state (day / golden / night), loaded by a new `shell.js`. Needs Blender (see below).
10. [ ] **Performance ladder**: portal culling per house, texture streaming, stillness render (higher quality when standing), measured on a real iPhone.
11. [ ] **People and life** (wow): a few distant silhouettes walking, birds outside, water ripple in the pool, tree sway.
12. [ ] **Real photographic frames/labels/benches/plinths**: modelled museum furniture with PBR.
13. [ ] **Artist's original spaces as first-class**: repeat the Ritual method for the next artist exhibition (see "Adding an artist's original exhibition" below).

## Adding an artist's original exhibition (a recurring job, owner 16.11)
1. The exhibition has a tour (`data/spaces/<slug>.json`, built by "Studio spaces") and a text (`content/exhibitions.json`, in the source language; English too when there is).
2. Add a house to the plan (`SKY_PLAN.spaces` in `synth.js`, or the Desk's `museum_plan`): `{ id, type: 'house', slot: 5x, tour: '<slug>', door: [x, z], dir }` at a free place (check overlap against houses, wing, pool, piers: `scratchpad/lay3.js` method).
3. `enterStreet` in `app.js` builds the room from the exhibition (works, text, colour from its works) and the arch picture is `data/spaces/<slug>/preview.jpg`; a tap on the arch goes to `#/exhibition/<slug>/space`.
4. The text plate on the outside wall comes from `r.text` (array of paragraphs); a Hebrew text is shown RTL in the reader.

## Software / tools that would raise the bar (to ask the owner, in Hebrew)
- **Blender** (free): needed for item 9 (baked light). Without it items 1-8 are done in code.
- A real iPhone for speed checks (the owner's own phone, opening the museum while the agent reads the numbers from the app's debug line).
- Better photos of the real Ritual space (more angles) would make its portal and tour sharper.

## Log
- 16.11: items "Done" above; roadmap written.
- 16.11: step 1 (floor contact shadows in `buildSky`, painted before the sun pools; no runtime cost; memory unchanged at 433 MB estimate).
