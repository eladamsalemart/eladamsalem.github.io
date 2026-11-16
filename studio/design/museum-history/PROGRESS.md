# The museum's history sections: progress (16.11 on)

Brief (the owner, 16.11, via the lead session): a real art museum that changes over time; history sections as walks through time
(Renaissance first; Impressionism and Post-Impressionism preceded by Realism and Romanticism; Cubism, Baroque ...), paintings of artists dead 70+ years
(public domain, a credits file), sculpture on plinths (3D), architecture as small models; a space that widens as you walk. Two agent roles in `studio/museum-agents/`.
Home's museum tile: a slow camera moving inside the real museum, from several angles.

## Done
- [x] Roles written: `studio/museum-agents/ARCHITECT.md`, `CURATOR.md`.
- [x] Assets: 19 public-domain paintings + 3 sculpture scans (David CC BY-SA, Pieta and Head CC0) in `studio/app/data/museum/renaissance/` with `credits.json`, `CREDITS.md`. No free architecture model exists: maquettes are our own simplified models (`space/props.js`).
- [x] The Renaissance wing: four bays that widen and rise (9 -> 12 -> 17 m wide, 4.4 -> 6.0 m high), registered in `studio/app/data/museum/sections.json`, built by `buildCluster` (door in the plaza's south edge). Wall texts, paintings at their real size, 'Next: Baroque' on the far wall.
- [x] Sculpture in 3D (`space/props.js`, glb loader) and three maquettes (Tempietto, Florence dome, Villa Rotonda)
- [x] Home tile: title 'Open All Night' (English, the owner's choice of language; the museum follows the visitor's clock and the lamps come on), no sentence under it; a film of the real museum (`space/museum_film.cjs` -> `data/museum/preview.mp4|webm|jpg`, five views through a day)
- [ ] Phone check day and night, push, report with a screenshot

## Not done / next
- Real Dürer set is in the app already (demo works) but not hung in the wing yet.
- More sections: Baroque (the wing's far wall says so), Realism/Romanticism, Impressionism, Cubism: use the CURATOR role, add to `sections.json`; a second section needs a free place on the ring (door position) and the overlap check.
- Giotto and Pontormo images are small on Commons (900-1000 px); sizes of three frescos are approximate.
- David's licence (ShareAlike) to be accepted by the owner; Donatello's David and any architecture scans: none found free.
- Phone speed not measured (the wing adds ~30 surfaces + 3 x 1.8 MB glb).
