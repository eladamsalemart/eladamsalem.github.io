# The outside of the glass wall: what makes it look real, and how to check it

Research for the Glass pavilion (12.11.2026). Every claim is marked `[verified: URL]` (read on that page today),
`[repo: file]` (read in this repository) or `[from knowledge]` (not re-checked today; treat as a lead).
Of the verified ones, the three.js docs and r170 sources, the Poly Haven API and licence, Lagarde, van Dongen, Twinmotion,
the Blender Artists thread and the two forum threads on Shapespark's dome and the projective skybox were read in full;
the others (WebKit bug, texture-memory and transmission threads, SwiftShader flags, pyiqa, Matterport paper, the
interior-mapping blog, web texture formats, Shapespark's white background) were read as search-result extracts only.
Nothing in the code was changed by this research.

## 0. What is wrong today, measured from the code

- The published room draws the outside as one JPEG (`win-wall-z0-0.jpg`, 4096x1317, 1.1 MB) on a plane 4 mm in front
  of the glass wall `[repo: studio/app/space/space.js, "window plates"]`.
- That picture is a perspective render from a camera on the **opposite wall, 2.25 m high (H/2), 8.95 m from the
  glass** `[repo: build_rooms.py, shoot() and WALLS]`. Consequences, all geometric, none a matter of taste:
  1. **Horizon in the wrong place.** The plate's horizon sits 2.25 m up the wall; the visitor's eye is at 1.6 m
     (`EYE = 1.6`). On screen the garden's horizon is `f*(0.65/Z)` above the true one: 228 px at 2 m from the glass,
     65 px at 7 m (f = 702 px for the walk FOV of 62 deg at 844 px high). The ground looks tilted up and it changes
     as one walks: the strongest "pasted picture" cue.
  2. **No parallax.** Every outside pixel is at the depth of the glass, so shrubs, trees and sky slide together with
     the mullions. At 4 m from the glass a 0.5 m side step moves all of it 88 px; a tree 20 m out should move 15 px.
  3. **Perspective baked for one viewpoint.** Turning the head does not turn the view; tree trunks converge to the
     bake camera's vanishing points, not the visitor's.
- A fix is in progress in the working tree (uncommitted): `addOutside()` in space.js replaces the plate with the
  killesberg_park panorama on a dome of 40 m whose lower half is laid on the ground plane (a ground-projected
  environment), from `data/rooms/_outside/garden-a.jpg` (3072x2335 for 180 x 137 deg). That is option (b) below. It
  solves 1 and 3 and gives ground parallax. What it still lacks is in section 2: **nothing upright near the glass**
  (everything above the horizon is at 40 m and moves as one), **photographed uprights smeared along the ground**, and
  **17 px per degree of texture against about 25 px per degree of screen** (780 device px across 31 deg), so the garden
  is magnified 1.5x and reads soft.
- Blender already holds a complete 3D garden for this room: lawn to the horizon, 7 shrubs at 3.5-9 m, 10 grass/fern
  clumps at 2.5-12 m, 4 trees at 9-26 m, haze, and the HDRI as the far distance `[repo: build_rooms.py,
  garden_outside()]`. **The best source for the outside is that scene, re-rendered in layers**: it is already lit,
  exposed and white-balanced exactly like the room.

## 1. The options, and what real viewers do

| | Technique | Turn head | Walk (parallax) | Cost on iPhone | Verdict here |
|---|---|---|---|---|---|
| a | Equirect panorama as `scene.background` or inverted sphere | right | none (all at infinity) | 1 texture | far layer only |
| b | Ground-projected panorama (GroundedSkybox) | right | ground only; uprights smear | 1 texture, ~16k tris | good base, not enough alone |
| c | Cards at several depths with alpha | right if placed in 3D | yes, in steps | 1 atlas, 10-20 quads | **the missing piece** |
| d | Real 3D geometry outside + sky dome | right | exact | terrace: tiny; real plants: MBs and 10^5 tris | terrace/low wall yes, 3D plants no |
| e | Cube map + box projection | right | right only for things on the box | 6 faces | wrong tool (it is for reflections) |
| f | Interior-mapping shader | right | boxes only | 1 shader | wrong shape for a garden |
| g | RGB-D panorama, mesh displaced by depth | right | exact until edges tear | 1 texture + depth, 20-60k tris | alternative to c for mid distance |

**(a) Panorama at infinity.** `scene.background = tex` with `tex.mapping = THREE.EquirectangularReflectionMapping`,
`tex.colorSpace = THREE.SRGBColorSpace`; rotate with `scene.backgroundRotation` ("The rotation of the background in
radians. Only influences environment maps assigned to Scene#background") `[verified: https://threejs.org/docs/pages/Scene.html]`.
Two facts from the r170 source that matter on a phone: an equirect background is first converted to a cube render
target of side `image.height` (a 4096x2048 JPEG becomes 6 x 2048^2 x 4 = 96 MB on top of the source), and a background
whose colour space is sRGB is drawn un-tone-mapped (`toneMapped = getTransfer(colorSpace) !== SRGBTransfer`)
`[verified: https://raw.githubusercontent.com/mrdoob/three.js/r170/src/renderers/webgl/WebGLCubeMaps.js and .../WebGLBackground.js]`.
So: **never use `scene.background` for a 4k panorama on iPhone; put it on your own mesh** (a sphere or cylinder
segment covering only what the glass can show), `MeshBasicMaterial({map, toneMapped:false, depthWrite:false})`.
Correct for rotation, no translation parallax at all: right for things beyond ~50 m and the sky, wrong for a garden
whose first shrub is 3.5 m away. Shapespark, the best-known lightmapped WebGL archviz viewer, does exactly this for
the outside: staff advise "If you have a 360 equirectangular panorama use a dome", a cylinder when the image does not
cover the full height, lightmap resolution 0 on it, and regular textures are clamped to 2048 while the sky takes "the
maximum resolution allowed" `[verified: https://forum.shapespark.com/t/sky-texture-change-over-change-of-view/1649]`.
Their scenes add modelled terraces and plants in front of it `[from knowledge]`.

**(b) Ground-projected panorama.** `import { GroundedSkybox } from 'three/addons/objects/GroundedSkybox.js'`;
`new GroundedSkybox(map, height, radius, resolution=128)`; "The height is how far the camera that took the photo was
above the ground. A larger value will magnify the downward part of the image"; "it is often helpful to set
skybox.position.y = height" `[verified: https://threejs.org/docs/pages/GroundedSkybox.html]`. In r170 it is a
`SphereGeometry(radius, 2*res, res)` turned inside out whose vertices below the horizon are pulled onto the plane
`y = -height`, with a smooth blend near the horizon, and `MeshBasicMaterial({map, depthWrite:false})`
`[verified: https://raw.githubusercontent.com/mrdoob/three.js/r170/examples/jsm/objects/GroundedSkybox.js]`; the
official example uses height 15, radius 100 and lifts it by `height - 0.01`
`[verified: https://raw.githubusercontent.com/mrdoob/three.js/r170/examples/webgl_materials_envmaps_groundprojected.html]`.
It is the three.js forum's standard answer to "skybox with parallax near the viewer"
`[verified: https://discourse.threejs.org/t/projective-skybox/47398]`. Unreal's HDRI Backdrop does the same
`[from knowledge]`. Its limits: (1) the mesh is fixed in the world and the camera walks inside it, so the ground has
true parallax, but **anything upright in the photograph near its camera (bench, hedge, trunk) is painted onto the
ground and stretches** as you move `[from knowledge]`; killesberg_park is tagged bench, bush, flower, stairs,
concrete `[verified: https://api.polyhaven.com/assets?t=hdris]`, so it has exactly such things; (2) everything above
the horizon is at one distance (the radius); (3) `height` must be the real camera height of the photograph (about
1.5-1.7 m for Poly Haven tripod shots `[from knowledge]`), otherwise paving joints are the wrong size. The in-progress
`addOutside()` is this technique written by hand (rays below the horizon meet the ground at `CAM = 1.6`).

**(c) Cards at several depths.** Upright quads with an alpha-cut picture of one plant each, standing at their true
places. For foliage the forum's advice is alpha **test**, not blending: no sorting, depth writes work
`[verified: https://discourse.threejs.org/t/whats-the-most-performant-way-to-make-grass/39774]`; `alphaToCoverage`
(with MSAA) softens the cut edge `[verified: https://discourse.threejs.org/t/alpha-test-vs-alpha-hash/44493]`.
Parallax comes in steps (one per card), which is what the eye needs: 3 depths read as "a space". A card seen more
than ~35 deg off its normal looks thin; fix by turning each card about the vertical axis to face the camera
(a 1-line `rotation.y = atan2(...)` per card per frame) or by crossing two cards `[from knowledge]`.

**(d) Real geometry.** Archviz practice: "the current trend is to make the outside also in 3D", "the objects near
the windows should be modelled", and with large windows "it is almost impossible to fake the outside view with
backplates" unless each shot has its own `[verified: https://blenderartists.org/t/interior-architecture-view-outside-windows/1101343]`.
For hard, flat things (terrace, kerb, low wall, planter boxes, a path) geometry is nearly free: a few boxes and a
tiling texture, exact from every point. Real 3D plants are not: Poly Haven's shrub_02 is 52,317 polygons, shrub_03
16,955, fern_02 6,232, and their 1k glTF packages are 1.1-1.6 MB each
`[verified: https://api.polyhaven.com/assets?t=models&c=plants and https://api.polyhaven.com/files/shrub_03]`.

**(e) Cube map + box projection.** Lagarde's parallax-corrected cubemap intersects the ray with "an approximation of
the geometry (we will call this geometry proxy) surrounding the local cubemap"; objects not on the proxy are in the
wrong place `[verified: https://seblagarde.wordpress.com/2012/09/29/image-based-lighting-approaches-and-parallax-corrected-cubemap/]`.
three.js has it only as community code for reflections (drei `useBoxProjectedEnv`, gists patching `onBeforeCompile`)
`[verified: https://drei.docs.pmnd.rs/misc/use-box-projected-env]`. A garden is not a box: this is (b) with a worse
proxy. Useful later only for the floor's reflection of the outside.

**(f) Interior mapping.** van Dongen 2008: "raycasting in the pixel shader is used to calculate the positions of
floors and walls behind the windows" `[verified: https://www.proun-game.com/Oogst3D/CODING/InteriorMapping/InteriorMapping.pdf]`.
Twinmotion's parallax windows are this: "a single plane and a texture", a 3x3 grid of ceiling, walls, floor plus
alpha prop layers with adjustable depth `[verified: https://dev.epicgames.com/documentation/twinmotion/an-overview-of-parallax-windows-in-twinmotion]`.
Made for looking **into** box rooms from outside. For looking out at a garden the "box" would be a ground plane,
a far wall and prop layers, which is (b) + (c) done in a shader; no gain over real quads, harder to inspect.

**(g) Panorama with depth.** Blender can render the garden from one point as colour + distance; the viewer displaces
a sphere mesh by the distance. Exact parallax for every pixel from one texture, but where a near leaf edge meets
the far sky the mesh stretches into "rubber sheets" as soon as the visitor leaves the capture point; the room is
14 m wide and the first shrubs 3.5 m out, so the tears would be wide `[from knowledge]`. Workable only split into
depth bands, which is (c) again. Matterport-type viewers avoid the problem by not allowing free walking: one hops
between captured panoramas, each a real photograph from that spot (the dataset has "a skybox per group of 18 images"
and a mesh used for transitions) `[verified: https://arxiv.org/pdf/1709.06158]`; so their windows always look right
and there is nothing to copy for a free-walk room.

**What is used in practice, in one line:** far = panorama on a dome (Shapespark, every archviz engine), ground =
real plane or ground projection, near = real geometry or cards. Nobody ships a single picture on the window plane
for a walkable room.

## 2. The recipe for this app

Four layers, from far to near. Total new download about 1.2-1.6 MB, 3 textures, under 60 draw-call-cheap meshes.

### 2.1 Layers

1. **Far: sky and distant trees on a fixed dome segment, radius 60 m.** Only the sector the glass can show
   (about 200 deg wide, from 8 deg below to 60 deg above the horizon). Centre it on the middle of the glass wall at
   eye height and leave it fixed in the world.
   - Source A (preferred): render it in Blender from that point with the room, the near plants (< 12 m) and the lawn
     hidden: `cam.type='PANO'`, `cam.panorama_type='EQUIRECTANGULAR'` with longitude/latitude limits, same view
     transform and exposure as the room `[from knowledge]`. The far trees at 14-26 m plus the HDRI behind them then
     come with the room's own light, haze and white balance.
   - Source B (no rebake): the Poly Haven panorama as now.
   - Size: 4096 x 1400 (20.5 px/deg), JPEG q80, **350-500 KB**; 4096 is the safe ceiling on iPhone (below).
2. **Ground: real planes.** (i) A terrace of the room's own terrazzo running 2.5 m past the glass at floor level
   (Blender's floor box already extends 2 m out `[repo: build_rooms.py glass_pavilion(): box('floor', -2, ...)]`,
   so this is true to the bake), ending in a 12 cm kerb; (ii) lawn or paving beyond, to 60 m, as a tiling 1024
   texture with `RepeatWrapping`, anisotropy 8, fading to the dome's colour at the far edge (vertex colours or a
   fog term); or keep the ground-projected photograph for 6 m and beyond, where its smear is small. The terrace is
   the single cheapest depth cue: floor joints that run out through the glass and keep their perspective.
3. **Mid: 8-12 plant cards at their true places**, 3 depth bands: grasses/ferns 2.5-5 m, shrubs 4-9 m, trees
   9-26 m, positions taken from `garden_outside()` so they match the shadows the bake already cast on the floor.
   Each card is rendered in Blender (the plant alone, film transparent, orthographic, same light) and packed in one
   **2048x2048 atlas with alpha** (WebP with alpha, or PNG): **400-700 KB**. Material:
   `MeshBasicMaterial({map, alphaTest:0.5, toneMapped:false, side:DoubleSide})`, `alphaToCoverage:true` when the
   context has MSAA; premultiply/bleed the colour under the alpha edge so mipmaps do not show a dark fringe
   `[from knowledge]`. Turn cards about Y toward the camera. One merged geometry per band = 3 draw calls.
4. **Near: the frame and the glass.** Mullions, head and sill as real black boxes (8 cm, every 2 m, as in Blender);
   they are the nearest reference against which everything outside moves. Add **one or two things within 1-3 m of
   the glass outside**: a low planter wall 45 cm high at 2.5 m, two tall grass cards behind it. Then the glass.

### 2.2 Glass, cheaply

Do not use `MeshPhysicalMaterial.transmission`: it adds a full extra render pass and is reported broken or very slow
on phones `[verified: https://discourse.threejs.org/t/meshtransmissionmaterial-poor-performances-urgent/68566 and
https://discourse.threejs.org/t/transmission-of-meshphysicalmaterial-doesnt-work-on-some-android-devices/28836]`.
One transparent quad per pane with a 12-line shader is enough:

```glsl
// fragment: vN = normal, vV = view dir (both world), uRefl = small blurred picture of the room (256-512 px)
float c = abs(dot(normalize(vN), normalize(vV)));
float F = 0.04 + 0.96 * pow(1.0 - c, 5.0);            // Schlick: 4% head-on, strong at grazing angles
vec3 r = reflect(-vV, vN);                              // look up the room behind the visitor
vec3 refl = texture2D(uRefl, r.xy * 0.5 + 0.5).rgb;     // (or the mirrored opposite wall's texture)
float dirt = texture2D(uSmudge, vUv * 3.0).r;           // faint, 128 px, tiling
gl_FragColor = vec4(refl * 0.9 + 0.03 * dirt, clamp(F * 0.9 + 0.02 * dirt, 0.0, 0.6));
```
`transparent:true, depthWrite:false`, drawn last. Head-on the garden is clear with a 4% ghost of the lit room;
toward the ends of the wall the room's reflection takes over, as on real glass. "It's necessary to have exterior
reflections. Without them, the window reads as a hole" `[verified: https://kristian-dixon.github.io//2025/02/27/InteriorMapping.html]`.
The in-progress flat sheen (opacity 0.055 everywhere) lacks the angle dependence that makes glass read as glass.

### 2.3 Assets (all CC0: "Our assets are all licensed as CC0... You do not need to give credit" `[verified: https://polyhaven.com/license]`)

Sizes and URLs from `[verified: https://api.polyhaven.com/files/<slug>]` today.

| Use | Asset | URL | Size |
|---|---|---|---|
| Far panorama (in use) | killesberg_park (overcast, low contrast, garden) tonemapped JPG, full res | https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/Tonemapped%20JPG/killesberg_park.jpg | 6.6 MB source |
| same, HDR for own tonemap | 4k / 2k | https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/4k/killesberg_park_4k.hdr , .../hdr/2k/killesberg_park_2k.hdr | 26.5 / 6.6 MB |
| Alternatives (open lawn, fewer near objects, smear less when ground-projected) | charolettenbrunn_park (lawn, partly cloudy, midday), quadrangle_cloudy (courtyard lawn, overcast), suburban_soccer_park (overcast lawn), roof_garden, symmetrical_garden_02 | https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/4k/charolettenbrunn_park_4k.hdr (others: same pattern) | 27 MB source |
| Lawn tile (already used in Blender) | leafy_grass diffuse 1k | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/leafy_grass/leafy_grass_diff_1k.jpg | 1.2 MB, re-encode 1024 q75 to ~250 KB |
| Paving for a terrace/path | concrete_pavers, patterned_paving diffuse 1k | https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/concrete_pavers/concrete_pavers_diff_1k.jpg , .../patterned_paving/patterned_paving_diff_1k.jpg | 758 / 884 KB, to ~200 KB |
| Plants to render into cards (never shipped as 3D) | shrub_02, shrub_03, fern_02, grass_medium_01/02, island_tree_01/02, jacaranda_tree (already in the Blender cache) ; shrub_sorrel_01, potted_plant_04 for near the glass | https://dl.polyhaven.org/file/ph-assets/Models/gltf/1k/shrub_03/shrub_03_1k.gltf (pattern) | cards atlas 400-700 KB |

Shipped targets: far 350-500 KB + cards 400-700 KB + ground 200-250 KB + glass reflection/smudge 40 KB =
**1.0-1.5 MB**, against 1.14 MB for today's plate (which goes away).

### 2.4 Tonemapping and matching the room

- Best: render far layer and cards **in the room's own Blender scene** (same world, strength, rotation
  `GARDEN_ROT=200`, view transform, exposure). Nothing to match afterwards, and the sun/sky direction agrees with the
  light on the floor. `[repo: build_rooms.py]`
- From an HDR by hand (pseudo-code, numpy/cv2 are already used by the pipeline `[repo: preview_film.py]`):
  ```python
  hdr = cv2.imread(p, cv2.IMREAD_UNCHANGED)[..., ::-1]            # linear RGB float
  hdr *= 0.18 / np.exp(np.mean(np.log(lum(hdr) + 1e-4)))           # expose: scene log-average to middle grey
  hdr *= 2 ** EV                                                   # EV = +0.5..+1.0: outside reads brighter than the room
  x = hdr * (1 + hdr / WHITE**2) / (1 + hdr)                       # extended Reinhard, WHITE ~ 6: sky keeps colour, no clip
  srgb = np.where(x <= .0031308, 12.92 * x, 1.055 * x ** (1 / 2.4) - .055)
  ```
  Save JPEG q80, 4:2:0, progressive. Poly Haven's ready "Tonemapped JPG" is a fair start but it is exposed for
  browsing, not for this room `[from knowledge]`.
- **Use today's plate as the colour target.** `win-wall-z0-0.jpg` is what Cycles saw through the glass with the
  room's exposure and white balance. Match the new layers to it with a Lab mean/std transfer (Reinhard colour
  transfer) computed separately on sky, foliage and ground masks; then check numerically (section 3, check 6).
- In the viewer: textures `SRGBColorSpace`, materials `toneMapped:false` like the rest of the baked room
  `[repo: space.js]`; no runtime exposure maths.
- Shapespark's note for the opposite look: a pure white outside needs an HDR sky brighter than 1.0; an LDR JPEG under
  tone mapping goes grey `[verified: https://forum.shapespark.com/t/bright-fully-white-background-a-short-guide/3257]`.
  Here the outside is un-tone-mapped sRGB, so what is in the JPEG is what is seen.

### 2.5 iPhone notes

- Texture memory is width x height x 4 x 1.33 with mipmaps whatever the JPEG's size on disk: 4096x1400 = 30 MB,
  2048^2 = 22 MB `[verified: https://discourse.threejs.org/t/three-scene-optimization-texture-size-calculation-in-gpu-compression-merge-meshes-what-the-limits/23972]`.
  The viewer already counts this (`inspect.memory()`); the new layers add about 60 MB and remove the plate's 29 MB.
- iOS Safari kills the page under memory pressure rather than at a published limit; reports name 4096^2 textures
  failing and advise 2048 as the safe size, power-of-two sizes, and KTX2 when memory is tight
  `[verified: https://bugs.webkit.org/show_bug.cgi?id=232357 and https://discourse.threejs.org/t/how-to-scale-down-a-rendered-texture-image/33143]`.
  Keep any side <= 4096, prefer two 2048-wide halves of the far band over one 4096 if a phone pass shows trouble.
  KTX2/ASTC would cut GPU memory about 4x `[verified: https://www.donmccurdy.com/2024/02/11/web-texture-formats/]`
  but adds a transcoder download; not needed at these sizes.
- Resolution budget: the phone shows 780 device px (ratio capped at 2 `[repo: space.js line 48]`) across 31 deg
  = 25 px/deg. The far band at 20 px/deg is 0.8 texel per pixel: acceptable because distance is soft in life; the
  cards (near) should be >= 1 texel per pixel at 4 m: a 2 m shrub = 190 px on screen, so 256 px of atlas each.
- Mipmaps on (trilinear) + anisotropy 4-8 on the ground; without them the lawn shimmers when walking.
- No `scene.background` equirect (96 MB cube conversion, see 1a). No transmission. No extra render passes.
- Cards use alpha test, so they stay in the opaque pass: no sorting cost, no overdraw blending.

## 3. Checking it automatically

Runs in the existing inspection (Playwright + headless Chromium; `inspect.place(at, to)` already puts the camera
anywhere `[repo: space.js, const inspect]`; cv2 and numpy are already dependencies). Software GL: Chromium's
documented flags are `--use-gl=angle --use-angle=swiftshader` and, for the WebGL fallback,
`--enable-unsafe-swiftshader`, which is becoming opt-in `[verified: https://chromium.googlesource.com/chromium/src/+/da170c2267b2201954efe1c8fa5d2d89ab09f7bf/docs/gpu/swiftshader.md]`;
assert a WebGL2 context exists before trusting any frame.

Shots: phone viewport rendered at 780x1688, pitch 0, looking straight at the glass, from `P0` = 4 m from the glass
at the room's middle, `P1` = P0 + 0.5 m sideways, `P2` = 2 m from the glass, `P3` = 7 m from it. Also the ID pass
(the viewer already draws one) with the outside as its own colour, to get the mask `M` of outside pixels and the
mask of mullions. Geometry for thresholds: f = 1404 px at this size; a point at depth Z moves `f*0.5/Z` px between
P0 and P1: glass plane (Z=4) 176 px, shrub 4 m out 88 px, tree 20 m out 29 px, dome at 60 m 11 px.

```python
def outside_checks(shot):                       # shot(pos) -> (rgb, ids)
    a, ida = shot(P0); b, idb = shot(P1)
    M = outside_mask(ida)
    k0, k1 = match(a, b, mask=M)                # ORB or SIFT + ratio test, or cv2.calcOpticalFlowPyrLK on good features
    d = k1 - k0; dx = np.abs(d[:, 0])
    glass = f * 0.5 / 4.0                       # what a picture on the wall would do

    # 1 parallax exists: far things move little
    far = dx[k0[:, 1] < cy - 0.08 * H]          # features above the horizon band
    assert np.percentile(far, 20) / glass <= 0.25        # flat plate: 1.0

    # 2 depth has layers above the horizon (catches "dome only"): near uprights AND far ones
    r = far / glass
    assert (r >= 0.35).mean() >= 0.08 and (r <= 0.15).mean() >= 0.20
    assert np.percentile(dx, 90) / max(np.percentile(dx, 10), 1) >= 3.0

    # 3 not a picture: no single homography explains the motion
    Hm, _ = cv2.findHomography(k0, k1, cv2.RANSAC, 3.0)
    err = np.linalg.norm(project(Hm, k0) - k1, axis=1)   # recompute, do not trust the returned mask
    assert (err < 3.0).mean() <= 0.70 and np.median(err) >= 2.0     # flat plate: ~1.0 and ~0.3

    # 4 horizon and scale from the ground: on a flat ground at eye height E, dx = 0.5 * (y - y_h) / (E - g)
    g = k0[:, 1] > cy + 0.03 * H                # ground features
    slope, icpt = np.polyfit(k0[g, 1], dx[g], 1)
    y_h = -icpt / slope
    assert abs(y_h - cy) <= 0.02 * H            # horizon at eye level (flat plate: slope 0, no horizon)
    assert 0.85 <= slope / (0.5 / (EYE - GROUND)) <= 1.15            # paving the right size

    # 5 horizon does not move when walking toward the glass
    for P in (P2, P3):
        assert abs(horizon_row(*shot(P)) - cy) <= 0.02 * H           # same fit, from a 0.5 m side step at P

    # 6 sharpness, exposure, colour (inside the mask, at P2 where the outside is largest)
    c, idc = shot(P2); O = c[outside_mask(idc)]; W = c[wall_mask(idc)]   # W: the lit white wall
    lap_o = cv2.Laplacian(gray(c), cv2.CV_64F)[outside_mask(idc)].var()
    lap_w = cv2.Laplacian(gray(c), cv2.CV_64F)[work_mask(idc)].var()     # a hung work: known sharp
    assert lap_o >= 0.35 * lap_w                           # not a blur
    assert (O.min(axis=1) >= 250).mean() <= 0.03           # sky not burnt out
    assert (O.max(axis=1) <= 12).mean() <= 0.02            # no black holes (missing texture/alpha fringe)
    L = lambda x: np.median(luma(x))
    assert 0.9 <= L(O) / L(W) <= 2.0                       # outside a little brighter than the wall, not a lightbox
    assert np.std(luma(O)) >= 28                            # has contrast: not hazed flat
    assert abs(lab(O_neutral)[..., 2].mean() - lab(W)[..., 2].mean()) <= 10   # paving vs wall: same white balance
    assert texels_per_pixel_at(P2) >= 0.7                  # analytic, from texture size and FOV
```

Thresholds 1-5 follow from the geometry above (flat plate fails all five by a wide margin; a dome-only fix passes
1, 3, 4, 5 and fails 2), so they need no tuning data. Thresholds in 6 are starting values `[from knowledge]`:
calibrate once on 10 real photographs of gardens through glass and on the current plate.

Further checks worth having:
- **7 Turning.** Rotate the camera 20 deg at P0: far features must move `f*tan(20 deg)` +-3% (they do on a dome;
  on a pasted picture they move like the wall, which is the same only at one distance).
- **8 Proof by putting the bug back** (the project's rule): run the checks against the published plate version, and
  against the dome with cards removed; the first must fail 1-5, the second must fail 2.
- **9 Learned quality score, advisory only.** `pip install pyiqa` runs on CPU and offers BRISQUE/NIQE (classical)
  and CLIP-IQA (0-1, higher better) `[verified: https://pypi.org/project/pyiqa and https://iqa-pytorch.readthedocs.io/en/stable/ModelCard.html]`;
  learned metrics fetch weights on first use, so cache them in the workflow `[from knowledge]`. Score the outside
  crop and require it within one standard deviation of a reference set of 10-20 real window photos; log it, do not
  gate on it. These metrics judge blur/noise/compression, **not** "does this look like a real garden", and none
  knows about parallax `[from knowledge]`. The geometric checks are the ones that catch what the owner sees.
- **10 Phone pass**: frame time with the outside in view under 4x CPU slowdown, `inspect.memory()` under the
  room's budget, textures arrived (`INSPECT_BLOCK=_outside` must fail the tour).

Human checklist (one cropped 390-wide shot per question, phone-sized browser, not `?inspect`):
1. Standing 2 m from the glass looking level: is the horizon at the height of my eyes, behind the far trees?
2. Side-step 1 m: do the mullions, the low wall, the shrubs and the far trees move by clearly different amounts?
3. Walk the whole wall: does any plant look like cardboard (thin, or sliding on the ground), any upright smeared?
4. Does the terrace continue the floor's joints and gloss through the glass, with no step in colour at the sill?
5. Is the light outside coming from the same side as the light patches on the room's floor?
6. Is the sky bright but still sky (a hint of cloud), the greens not neon, the outside no sharper than the room?
7. At a slanting angle along the wall: does the glass show the room faintly, more toward the far end?
8. Is anything within 3 m of the glass outside? (If not, the view reads as a poster however good it is.)
9. Turn 360 deg near the corner: no seam, no edge of the dome, no hole beside the last mullion.

## 4. What makes a window view look fake, and the cure

| Mistake | Why it reads as fake | Cure |
|---|---|---|
| Horizon not at eye height (today: 2.25 m vs 1.6 m) | ground seems tilted; changes with distance | panorama centred at eye height; check 4-5 |
| Perspective baked for one viewpoint | view does not turn with the head | dome/sphere, never a picture on the wall plane |
| No parallax | reads as a poster or a screen | ground plane + cards + something within 3 m; checks 1-3 |
| Nothing near the glass | no scale, no motion reference | terrace, kerb, low wall, tall grass at 1-3 m |
| Wrong scale (trees too big, paving joints wrong) | subconscious but strong | cards at true size from Blender; `height` = real camera height; check 4 slope |
| Uprights smeared on the ground (ground projection) | benches and trunks stretch when walking | choose an open-lawn panorama or render the far layer without near objects; uprights only as cards |
| Overexposed white, or the opposite: dim grey | lightbox / painted backdrop | outside median 1-2x the lit wall, under 3% clipped; match to the Cycles plate |
| Different white balance or light direction from the room | two photographs glued together | render layers in the room's scene, same HDRI rotation; check 6 |
| Uniformly blurred (low-res stretched) or sharper than the room | blur without depth logic | 20 px/deg far, >=1 texel/px near; haze grows with distance only |
| No reflection, no frame, no dirt on the glass | "the window reads as a hole" | Fresnel sheen with the room's reflection, mullions as geometry, faint smudge |
| Hard alpha edges, dark fringes on leaves | cut-out look | colour bleed under alpha, alphaToCoverage, mipmapped atlas |
| Flat cards seen edge-on | cardboard | turn about Y to the camera, or cross two cards |
| Seam where terrace meets floor, or dome edge visible | breaks the continuity | same terrazzo and gloss; dome sector wider than any view through the glass (check 9) |
| Static, dead-still garden | subtle | optional later: 1-2 cm vertex sway on near cards only while the camera is still (costs redraws; this viewer draws on demand, so probably leave out) |

## 5. Order of work suggested

1. Keep the in-progress dome + ground (it fixes horizon and turning). Set its radius to 60 m, add the checks 1-5
   and see check 2 fail: that is the proof the checks see what the owner sees.
2. Add terrace + kerb + low wall as geometry and the Fresnel glass.
3. Add the Blender card pass (plants alone, transparent film) and the far band without near plants; place cards.
4. Run checks, phone pass, the human checklist; then the server's run.
