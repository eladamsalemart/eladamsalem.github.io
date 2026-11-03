# Open Studio virtual spaces: market, techniques, lighting practice, ten room types, recommended pipeline

Research date: 2026-11-03. Repo state at time of writing: `studio/app/space/synth.js` paints room textures on 2D canvases (with baked "light pools" via `pool()`), `studio/app/space/space.js` shows them in three.js r170 (`index.html` import map pins `three@0.170.0`) with `MeshBasicMaterial`, `toneMapped:false`, one `HemisphereLight`, a `Reflector` floor, `antialias:true`, pixel ratio capped at 2. There is a `studio/app/space/pipeline/` folder (bake.py, build.py, figure.py, inpaint.py) that I did not read; check it before starting, it may already hold part of an offline step.

Honesty notes. (1) I could not open most competitor products and look at them, so "how realistic" below is inferred from vendor descriptions, press and technique, not from my own eyes. Before deciding, spend an hour opening one public demo of each of the five products marked "check by eye" in the table. (2) Where a figure comes from a vendor blog or forum, I say so. (3) Where I give numbers that are my own arithmetic or engineering judgement, I mark them "calc" or "judgement". (4) Several search-result pages were thin; claims that I could not confirm are listed in section 7.

---

## 1. The market

### 1.1 Product table

| Product | Technique (as far as known) | Realism (inferred) | Mobile | Price model | Source |
|---|---|---|---|---|---|
| **Kunstmatrix** (DE) | Self-serve 3D exhibition builder; ready-made rooms; custom "digital twin" of a real gallery on quote | Clean, generic, "CG viewer" look. Check by eye. | Browser, mobile not documented | 4 tiers: Starter (0 public shows, 10 works), Basic (5 shows, 50 works), Regular (10 shows, 250 works), Professional (50 shows, 500 works). Older press: from about $12/month (2020, may be stale). Digital twin by quote | [FAQ](https://www.kunstmatrix.com/en/info/faqs/what-are-the-pricing-details-for-the-3d-online-gallery), [digital twin](https://kunstmatrix.com/en/node/301), [PetaPixel 2020](https://petapixel.com/2020/07/24/creating-a-virtual-photo-exhibition-in-the-time-of-covid) |
| **ArtPlacer** (US) | Mostly 2D room mock-ups (2,900+ "room mockups") plus virtual exhibitions and a presentation suite | Mock-up photo rooms look real (photographic backgrounds); the 3D exhibitions are secondary | Web | Professional $45/mo ($40 yearly), 250 works, 10 live exhibitions; Growth $89 ($77), 2,000 works, 50 exhibitions; Premium $169 ($144), 10,000 works, unlimited. Non-profit/student discounts | [ArtPlacer plans](https://help.artplacer.com/support/solutions/articles/65000190412-plans-for-galleries) |
| **Artsteps** (GR) | Browser 3D editor; free core product | Low-poly, "game-like" per reviews. Check by eye | Browser and app | Free core; paid "Private Space", custom 3D design and curation; no public price list found | [parse.gl listing](https://parse.gl/brands/artsteps-com), [Artsteps blog](https://blog.artsteps.com/artsteps-make-your-own-virtual-exhibitions-1cbdc3a36146) |
| **Exhibbit** (NZ, since 2009) | In-browser 3D gallery builder | Not documented; early-2010s WebGL look is likely | Browser | Subscription; one review says "from $10/month" (unverified) | [CB Insights](https://www.cbinsights.com/company/exhibbit), [Creativepool](https://creativepool.com/exhibbit-com) |
| **Vortic** (UK, built by Superbright) | Bespoke 3D viewing rooms, XR; used by Frieze and Victoria Miro | Purpose-built, designed rooms; realism not documented. Check by eye | "mobile, desktop and VR" | Not public; originally a subscription for galleries | [Frieze](https://www.frieze.com/article/explore-immersive-3d-viewing-rooms-frieze-partners-vortic), [Reality Atlas list](https://www.reality-atlas.com/blog/best-companies-virtual-art-galleries-vr-exhibitions), [Art Newspaper](https://theartnewspaper.com/news/miss-an-exhibition-at-tate-or-the-hayward-gallery-catch-up-on-shows-from-past-decade-on-new-digital-platform) |
| **V21 Artspace** (UK) | Three kinds: CGI-built gallery; Matterport laser-scan capture of a real show; photogrammetry/hybrid. 500+ shows since 2017 | Captured tours are photographic ("photorealistic accuracy" per V21); CGI galleries are bespoke | Browser on phone, tablet, desktop, VR | Quote only | [V21 3D exhibitions](https://v21artspace.com/3d-virtual-exhibitions), [V21 how to](https://v21artspace.com/how-to-create-a-virtual-exhibition) |
| **Matterport** (US) | 360 photo + depth capture, dollhouse and walk-through; now Gaussian-splat era | Photographic; fixed capture points, cannot swap the art | Good | Subscription ladder; sources conflict (about $10-14 Starter, about $69 Professional, about $300-355 Business). A Oct 2026 tracker says Starter was removed. Verify on the vendor page | [Matterport plans](https://matterport.com/plans), [PricingSaaS](https://pricingsaas.com/companies/matterport) |
| **Shapespark** (PL) | Real-time WebGL walk-through with **path-traced baked global illumination**, one-click bake on GPU or cloud CPUs, automatic lightmap UVs | The closest existing product to what is proposed in section 5. Archviz-grade interiors in a browser | "Lightweight, works even on a phone" | G2 lists per-user monthly tiers $19 / $49 / $99; free 30-day trial | [Shapespark](https://shapespark.com/), [G2](https://www.g2.com/products/shapespark/reviews) |
| **Emperia** (UK) | Unreal Engine 5 based "high-design" 3D stores and galleries, delivered in a browser; clients include Dior, Burberry, Harrods, Christie's | Top end of "designed" (brand spaces), bespoke | Mobile, desktop, tablet, VR | Enterprise | [Dealroom](https://app.dealroom.co/companies/emperia_1), [80.lv](https://80.lv/partners/emperia) |
| **Hauser & Wirth HWVR / ArtLab** | In-house VR modelling tool, "pixel by pixel" rather than 360 photos; converts the artwork database into 3D assets | Internal tool, 2020 | VR first | Not a product | [Art Newspaper 2020](https://www.theartnewspaper.com/2020/04/09/hauser-and-wirth-announces-new-art-and-technology-division-with-the-launch-of-a-custom-designed-virtual-reality-platform) |
| **David Zwirner Online Viewing Rooms** | Not a 3D room. Web pages with images, video walkthroughs, virtual catalogue. Zwirner launched them in 2017, first from a commercial gallery | Realism comes from filmed walk-throughs of the physical gallery | Excellent (it is a web page) | Not a product | [Ocula](https://ocula.com/art-galleries/david-zwirner/exhibitions/basel-online-viewing-room/), [Artnet](https://news.artnet.com/market/david-zwirner-platform-pariis-brussels-1858023) |
| **ExhVerse** (HK, July 2026) | Free browser 3D gallery builder, ready-made spaces | New; no evidence of quality | Browser | Free | [press release](https://www.mannpublications.com/mannabouttown/2026/07/06/exhverse-launches-a-free-online-art-gallery-platform-for-immersive-virtual-exhibitions/) |

I did not find Exhibbit, Artsteps or Kunstmatrix documenting any lighting technique. Treat their look as "textured boxes with simple lights" until you open a demo.

### 1.2 The technique families and where they stand

- **Baked lightmaps in a real-time viewer** (Shapespark; what is proposed here). Photoreal diffuse light, runs on phones, the art can still change. Weak at: moving shadows, glossy reflections (need extra tricks).
- **Captured reality (Matterport, photogrammetry, laser scan)** (V21 captured tours, Matterport). Photographic by construction. Weak at: the art is baked into the capture, fixed viewpoints, you can only show a show that physically existed.
- **Gaussian splats.** Real projects now exist: DPT Labs captured one gallery of the Montreal Museum of Fine Arts for web (PlayCanvas, SOGS v2), VR (Unity) and an installation ([DPT Labs](https://labs.dpt.co/article-3dgs.html)); a React Three Fiber walk-through of Laboratorio 31 in Bergamo from 525 photos ([Radiance Fields](https://radiancefields.com/gaussian-splatting-brings-art-exhibitions-online-with-yulei)); World Labs' Musee du Monde with paintings as portals ([World Labs](https://www.worldlabs.ai/musee-du-monde)); a peer-reviewed comparison of 3DGS vs 360 images for a museum ([ISPRS Annals 2025](https://isprs-annals.copernicus.org/articles/X-M-2-2025/185/2025/)). Mobile budget from one guide: 200-500k splats, 15-30 MB, 30-45 fps target; SOG about 15-20x smaller than PLY ([Utsubo guide](https://www.utsubo.com/blog/gaussian-splatting-guide)). Weak points confirmed by the Yulei write-up: lighting shifts, glass reflections and people produce floaters. A three.js forum answer reached the same conclusion for galleries: build the environment as meshes (collision, navigation), use splats for isolated exhibits only ([three.js forum](https://discourse.threejs.org/t/architecture-advice-needed-for-an-immersive-browser-based-historical-art-gallery/93714)). Verdict: right for "digital twin of a real show", wrong for an app where artists swap works in a designed room.
- **Pixel streaming (Unreal/Unity on a GPU server, video to the phone).** Best possible image, but one GPU instance per visitor; cost scales with concurrent viewers; latency and cellular drops hurt phones. Epic documents it over WebRTC ([Epic docs](https://dev.epicgames.com/documentation/en-us/unreal-engine/pixel-streaming-in-unreal-engine)); hosted examples exist ([Vagon](https://vagon.io/streams/experiences/art-gallery-museum)). I found no independent per-user cost; one forum user cited EUR 99/month hosted unlimited minutes, which is anecdotal. Not suitable as the default for a free visitor-facing product.
- **Unreal 5 compiled to browser.** Emperia is the visible example for brands. Large downloads and heavy GPU; not a fit for iPhone 60 fps for artist-made shows.
- **Plain WebGL with painted textures** (today's Open Studio, Artsteps, Kunstmatrix class). Fast, but reads "digital" because there is no real light transport: no contact shadow, no colour bleeding, no soft falloff.

### 1.3 What looks truly real, and why

In order, by my judgement of the techniques (not eyes-on): (1) captured tours (Matterport/V21) because they are photographs; (2) bespoke Unreal rooms (Emperia-class); (3) path-traced baked lightmaps in a browser (Shapespark-class); (4) everything else. Number 3 is the only one that is both cheap for the user and lets the art change, which is why it is the recommended base. The look that separates "real" from "digital" is, in order: soft indirect light and colour bleeding, contact shadows where wall meets floor and under frames, believable specular on floors, and a restrained tone curve. All four are doable with an offline bake plus a few runtime tricks.

Also notable: nobody in the table sells "lighting at the highest level" as a feature. That is an open position.

---

## 2. Techniques: photoreal three.js on an iPhone at 60 fps

### 2.1 Baked global illumination and lightmaps (the core)

**Workflow.** Model the room in Blender with real dimensions. Give every surface a second UV set (UV1 in three.js) with non-overlapping islands, uniform texel density, 4-8 px padding. Bake Cycles "Diffuse" with only Direct + Indirect enabled (no Color) so the map holds light, not paint; multiply by the albedo at runtime. A Blender artists thread describes exactly this ([Blender Artists](https://blenderartists.org/t/blender-cycles-lightmap-baking/1169571)). A V-Ray best-practice note (engine-neutral): dedicated second UV channel, single tile, bake in linear space, denoise only after noise is moderate, noise threshold about 0.005-0.01 ([NovEdge](https://novedge.com/blogs/design-news/v-ray-tip-v-ray-lightmap-baking-best-practices-for-real-time-engines)). Known trap: Cycles denoise on baked Combined passes produced black seams along UV seams in Blender 3.0+ ([Blender issue 97808](https://projects.blender.org/blender/blender/issues/97808)); test on your Blender version, or bake high samples and denoise in a separate step outside Blender (OIDN CLI).

**How three.js consumes it.** `MeshStandardMaterial.lightMap` needs a second UV set; set `texture.colorSpace = LinearSRGBColorSpace` for float maps; `lightMapIntensity` scales it ([three.js docs](https://threejs.org/docs/pages/MeshStandardMaterial.html)); pick the UV set with `texture.channel = 1`. I read the shader chunk (`lights_fragment_maps.glsl.js`): the lightmap texel times `lightMapIntensity` is **added to `irradiance`**, which is then multiplied by `BRDF_Lambert` (albedo/pi). Cycles' diffuse bake is radiance-per-albedo, i.e. irradiance/pi, so I expect you need `lightMapIntensity` near `pi` to match. That is my inference from the source, not a documented rule; calibrate visually with a grey card in the scene.

**glTF.** Core glTF has no lightmap slot. Options seen in the wild: put the lightmap in the AO slot at export and re-assign to `lightMap` in code; use a vendor extension (`MOZ_lightmap`, `EPIC_LightmapTextures`, `WEBGI_materials_lightmap`) ([Khronos glTF issue 947](https://github.com/KhronosGroup/glTF/issues/947), [PR 1017](https://github.com/KhronosGroup/glTF/pull/1017), [webgi docs](https://webgi.xyz/docs/api/classes/Asset_Management.GLTFMaterialsLightMapExtension)). Simplest for Open Studio: ship the lightmap as a separate KTX2 file named in the room's JSON, set `flipY=false` (a known glTF/three mismatch, [three.js forum](https://discourse.threejs.org/t/loading-lightmap-issue/18882.md)). Do not rely on glTF to carry it.

**Texel density (calc).** An 11 x 7 x 3.6 m room has about 284 m2 of surface. At 2048 x 2048 (4.19 M texels) with 70% atlas packing that is about 1 cm per texel; at 1024 x 1024 about 1.9 cm per texel. 2048 is plenty for a gallery room, and 1024 is acceptable for a soft-lit room. Long halls (18 x 6.5 x 5.2 m, about 450 m2) want 2 x 2048 or one 4096; budget memory first (2.3).

**HDR or not.** For a gallery, store the lightmap as 8-bit sRGB-encoded irradiance scaled into range (for example divide by 4, set `lightMapIntensity` back up). This keeps it compressible. Float EXR is 16-32 MB per 2048 map; unsuitable for phones. KTX2 HDR (UASTC HDR 4x4) exists in three r170 ([three.js forum](https://discourse.threejs.org/t/exr-conversion-to-ktx2-mac-system-rendering-exception/73950)) but had device bugs; Needle's FastHDR claims 2 MB at 2k for env maps ([Needle](https://cloud.needle.tools/hdris)). A Babylon forum thread found UASTC lightmaps looked worse than RGBD PNG and ETC1S was suggested ([Babylon forum](https://forum.babylonjs.com/t/lightmaps-as-ktx2-uastc-encoding/23944)). Plan: test ETC1S vs UASTC on a lightmap visually, because smooth gradients show block banding first.

**Directional lightmaps.** Unity's directional mode stores a second map of dominant light direction so normal maps respond to baked light, at about 2x memory ([Unity docs](https://docs.unity3d.com/Manual/Lightmaps-reference.html)). Not worth it in three.js now; use normal maps only on plaster/oak where the real-time spots supply the raking light.

### 2.2 HDR environment, tone mapping, colour management

- Renderer: `outputColorSpace = SRGBColorSpace` (already set). Textures: albedo `SRGBColorSpace`, normal/roughness/AO `NoColorSpace`.
- Tone mapping options in three.js: `ACESFilmic`, `AgX`, `Neutral`. In the shader chunk, AgX works in Rec.2020 with a log sigmoid and is derived from Filament/Blender; Neutral "compresses highlights and desaturates toward the peak" and links to model-viewer's page ([tonemapping chunk](https://raw.githubusercontent.com/mrdoob/three.js/dev/src/renderers/shaders/ShaderChunk/tonemapping_pars_fragment.glsl.js)).
- **Recommendation: `NeutralToneMapping`** (Khronos PBR Neutral). The Khronos release says it reproduces a product's base colour, hue and saturation under grey lighting, matches colours 1:1 up to a maximum and uses the remaining range for highlights, and that filmic mappers can wash out bright yellow, green and cyan ([Khronos](https://www.khronos.org/news/press/khronos-pbr-neutral-tone-mapper-released-for-true-to-life-color-rendering-of-3d-products)). For an app whose users are artists, colour trust beats cinematic contrast; the artwork must look like the artwork. Keep AgX as an option for the dark room types where highlight roll-off helps. Avoid ACES: it shifts hues, which artists will notice.
- **Art itself must not be tone-mapped into a different colour.** Keep artwork materials either (a) lit by a controlled light so that a mid-wall value maps near 1:1 under Neutral, or (b) `toneMapped:false` with a shaded overlay for the pool. Option (a) is more coherent; option (b) is what `space.js` does today for everything.
- Environment: a 512 x 256 grey-warm HDR (or a 256 px cubemap rendered from Blender at room centre) through `PMREMGenerator` for the roughness-correct reflections and ambient fill on sculptures and glossy floors. Free CC0 HDRIs: [Poly Haven](https://polyhaven.com/hdris); CC0 PBR texture sets: [ambientCG](https://ambientcg.com/).

### 2.3 PBR materials and the texture budget

Materials needed: poured concrete, lime plaster, painted drywall, white oak (wide plank), terrazzo, linen/felt wall covering, travertine/limestone, bamboo/shoji paper. For a phone: **1024 x 1024 tiling** albedo + normal + packed ORM (occlusion/roughness/metal), 3 textures per material, 4-6 materials per room. Reasons: one three.js forum answer on a browser art-gallery says keep textures below 2k, draw calls under 500, about 1.5-2 M triangles for mobile ([three.js forum](https://discourse.threejs.org/t/architecture-advice-needed-for-an-immersive-browser-based-historical-art-gallery/93714)); iOS Safari kills pages at an undocumented memory ceiling that can be as low as about 500 MiB, with WebGL and many textures the usual cause, and WebKit's own bug reports advise fewer or smaller textures ([WebKit 300782](https://bugs.webkit.org/show_bug.cgi?id=300782), [Unity forum](https://discussions.unity.com/t/webgl-deliver-for-all-platforms-including-iphones-930374/930374)).

Memory arithmetic (calc, with mipmaps +33%):

| Texture | Uncompressed RGBA8 | ASTC 6x6 (3.56 bpp) | ASTC 4x4 (8 bpp) |
|---|---|---|---|
| 1024 x 1024 | 5.6 MB | 0.6 MB | 1.4 MB |
| 2048 x 2048 | 22 MB | 2.5 MB | 5.6 MB |

A room with 5 materials x 3 maps at 1024 plus one 2048 lightmap: about 112 MB uncompressed (risky on iPhone), about 12 MB compressed to ASTC. This is the whole argument for KTX2. Judgement budget for a room: under 40 MB GPU texture memory, under 300 draw calls, under 600k triangles.

**KTX2.** `KTX2Loader` + `detectSupport(renderer)` picks the GPU format; Apple GPUs take ASTC (and ETC2), not BC7, so the transcoder outputs ASTC on iPhone ([three.js docs](https://threejs.org/docs/pages/KTX2Loader.html); the format-on-iOS statement is general knowledge, not on that page). Example: [webgl_loader_texture_ktx2](https://threejs.org/examples/webgl_loader_texture_ktx2.html). glTF-Transform's `optimize --texture-compress ktx2` uses UASTC for normal, occlusion and metallic-roughness and ETC1S for colour ([glTF-Transform](https://gltf-transform.dev/cli), [secondary summary](https://github.com/kzhsw/glTF-Transform)). ETC1S shows block artifacts more readily; UASTC is near-lossless but bigger ([Cesium forum](https://community.cesium.com/t/reality-tiler-for-3d-1-1-tiles-ktx2-textures-meshopt-input-formats/27787)). Needs the `ktx` CLI from [KTX-Software](https://github.com/KhronosGroup/KTX-Software) 4.4+.

**Geometry.** glTF + meshopt (`gltf-transform meshopt --level medium`); meshopt decodes faster than Draco on the main thread and keeps normals clean on flat architectural surfaces. A room mesh is small anyway (architecture, under 100k triangles), so geometry is not the bottleneck; textures are.

### 2.4 Ambient occlusion

Baked into the lightmap (Cycles gives true AO and contact darkening for free). Do not run screen-space AO on phones. GTAO and SAO exist as examples ([webgl_postprocessing_gtao](https://threejs.org/examples/webgl_postprocessing_gtao.html), [sao](https://threejs.org/examples/webgl_postprocessing_sao.html)) but each adds full-screen passes. A cheap runtime AO substitute for things not in the bake (frames, plinths, sculptures): a baked soft "blob" shadow texture on a quad under/behind the object.

### 2.5 Reflections

| Method | Cost | Look | Use |
|---|---|---|---|
| Baked into lightmap | none | diffuse only, no specular | always |
| `Reflector` planar mirror (already imported in space.js) | one extra scene render | a true mirror, no roughness/blur by default | only for polished floors, at 0.5 render scale, with a blurred, tinted overlay; skip in rooms with matte floors |
| Static cube/PMREM probe from Blender at room centre | near zero at runtime | blurred, believable for roughness 0.2-0.5, but parallax is wrong on flat floors | default for glossy-ish floors and sculpture bases |
| Box-projected (parallax-corrected) probe | near zero | fixes parallax; the official three.js example was removed in r132; community patches via `onBeforeCompile`; node-material helper `getParallaxCorrectNormal` exists in r184 | worth the effort for polished floors |
| SSR | high, scales badly on phones | great on desktop | no |

Sources: [forum on Reflector vs CubeCamera](https://discourse.threejs.org/t/cubecamera-inject-texture-to-planar-3d-object/18849), [forum on box projection](https://discourse.threejs.org/t/parallax-correction-from-environment-maps/32692), [r184 helper](https://app.unpkg.com/three@0.184.0/files/src/nodes/functions/material/getParallaxCorrectNormal.js). Examples: [webgl_mirror](https://threejs.org/examples/webgl_mirror.html), [webgl_lightprobe_cubecamera](https://threejs.org/examples/webgl_lightprobe_cubecamera.html).

### 2.6 Light probes

`LightProbe` (spherical harmonics) from the room's HDR gives soft directional ambient on **dynamic** objects (sculptures, people) so they sit in the room instead of looking pasted ([webgl_lightprobe](https://threejs.org/examples/webgl_lightprobe.html)). One probe per room is nearly free. (The current `dev` shader also contains a probe-grid path; I saw `getLightProbeGridIrradiance` in `lights_fragment_begin.glsl.js`, but it is not in r170 and I did not test it.)

### 2.7 Lighting the artwork itself (the hard requirement)

Requirement: works change, so their light cannot be baked into the room's lightmap. Options:

1. **Real `SpotLight` per work, no shadow.** Correct and simple. Cost: three.js forward rendering loops over every light for every lit fragment, and the light count is a shader compile-time constant. 10 spots on all walls is too slow on a phone. Mitigation: pool a **fixed small number (3-4)** of spotlights and re-aim them each frame at the works nearest the visitor; keep the count constant so the shader does not recompile. Fade in/out by intensity.
2. **`spotLight.map` (cookie).** The docs say the map modulates the light colour but **is disabled unless `castShadow` is true** ([SpotLight docs](https://threejs.org/docs/pages/SpotLight.html)), so a cookie costs a shadow pass. The shader chunk confirms the map is looked up with the shadow coordinate. If used, keep the shadow map at 256-512 and update it only when the layout changes (`renderer.shadowMap.autoUpdate=false; needsUpdate=true`). Anecdotally big shadow maps (8192) fail on iPhone; 1024 is the sane ceiling, PCFSoft is slower than basic PCF on mobile ([GitHub PR 8485](https://github.com/mrdoob/three.js/pull/8485), [forum](https://discourse.threejs.org/t/performance-drop-in-mobile-portrait-mode-android-chrome-firefox/2080)).
3. **IES profiles.** `IESLoader` (outputs a 180-wide half-float DataTexture normalised to the max candela) and `IESSpotLight` exist, but `IESSpotLight` works **only with `WebGPURenderer`** ([IESSpotLight docs](https://threejs.org/docs/pages/IESSpotLight.html), [IESLoader source](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/loaders/IESLoader.js), [webgpu_lights_ies_spotlight](https://threejs.org/examples/webgpu_lights_ies_spotlight.html)). Safari 26 shipped WebGPU on iOS 26 ([web.dev](https://web.dev/blog/webgpu-supported-major-browsers)), but a WebKit bug from Oct 2025 to Jan 2026 reports a WebGPU problem on iPhone 12 Pro Max / 13 Mini ([WebKit 301627](https://bugs.webkit.org/show_bug.cgi?id=301627)), so WebGPU is not the safe baseline in late 2026. For WebGL: use an IES file in Blender (Cycles reads IES) for the *baked* wall wash and ambient, and convert the same IES into a small radial **cookie / falloff texture** used by approach 2 or 4.
4. **Analytic pool decal (recommended for the "accent" light).** A quad on the wall, slightly proud of the surface, sized from the work's rectangle (so it follows when the work is resized or replaced), rendered with a tiny custom shader that evaluates the physical formula for a spot at a given position: `E = I(angle) * cos(theta) / d^2`, where `I(angle)` is sampled from a 1D texture made from an IES file (or a smooth cos^n curve), multiplied by the wall albedo. One draw call per work, no shadows, no light-count limit, resolution-independent, and it still reads correctly when the work changes because only the rectangle changes. This is my design suggestion, not an established three.js feature; it is standard decal + custom ShaderMaterial work. It does not light the painting itself, so also apply the same function as a light multiplier in the **artwork material** (a `onBeforeCompile` patch or a small ShaderMaterial for the picture plane). Reflection of the spot on varnish: add a tiny specular term (roughness 0.5-0.7 for canvas, 0.1 for glass) to the artwork shader.

The recommended mix: baked room (lightmap, includes wall wash and daylight) + analytic accent pools for all works + 2-3 pooled real spotlights **only** for sculptures and hero works that need real shading and shadows. Do not use `RectAreaLight` for this: no shadows, PBR materials only, needs `RectAreaLightUniformsLib` ([docs](https://threejs.org/docs/pages/RectAreaLight.html)).

### 2.8 Anti-aliasing and resolution

- `antialias:true` (MSAA) is the sensible choice. Apple GPUs are tile-based deferred renderers, which Apple says makes depth testing and blending cheaper and removes hidden surfaces before shading ([Apple archive](https://developer.apple.com/library/content/documentation/OpenGLES/Conceptual/OpenGLESHardwarePlatformGuide_iOS/OpenGLESPlatforms/OpenGLESPlatforms.html)); a secondary write-up says MSAA on A11 and later only pays the per-sample cost on edge pixels ([Blake Crosley](https://blakecrosley.com/blog/apple-silicon-tbdr)). I found no measured WebGL number, so benchmark.
- Lightmapped architecture has no high-frequency textures, so FXAA/TAA are unnecessary. Frame edges and plinth lines are where aliasing shows; MSAA handles those.
- Dynamic resolution (judgement): start at `min(devicePixelRatio, 2)`; if the 60-frame average exceeds 18 ms, step down to 1.5 then 1.25 (a hard floor of 1.0). Never downscale below 1.0 CSS pixels on a text-bearing view.
- Anisotropy 4 on floor and wall textures; anisotropy 16 is wasted on phones.

### 2.9 What actually fits in a frame on an iPhone (judgement, not measured)

Frame budget at 60 fps is 16.7 ms; leave about 6 ms for the browser and JS. Safe: one forward pass, 100-300 draw calls, 5-10 materials, lightmap + 3 PBR maps per surface, 3-4 dynamic lights without shadows, MSAA, tone mapping in the material shader. Risky: any full-screen post-process, a second scene render (Reflector) at full resolution, more than one shadow-casting light, 2k+ textures uncompressed. Utsubo's guide says phones from iPhone 12 handle optimised splats at 30-45 fps, which is a sign that 60 fps is a tight target for photoreal content; plan 60 fps on iPhone 13+ and a 30 fps lock on older devices ([Utsubo](https://www.utsubo.com/blog/gaussian-splatting-guide)).

### 2.10 Best realism per millisecond, in order of payoff

1. Baked GI lightmap with true soft shadows and colour bleed (about 0 ms, biggest jump).
2. Neutral tone mapping + correct exposure, linear workflow (0 ms).
3. Proper PBR materials with compressed 1024 maps and real roughness (about 0 ms extra).
4. Analytic accent pools and per-work contact shadow (about 1 ms for 10-20 works).
5. Static probe reflections on glossy floors, parallax-corrected (about 0 ms).
6. LightProbe on dynamic objects (about 0 ms).
7. Low-res planar Reflector only on mirror-polished floors (1-3 ms).
8. Skip: SSR, SSAO/GTAO, full-resolution Reflector, bloom, depth of field, real-time shadows on more than one light.

---

## 3. Real gallery lighting practice (numbers for a renderer)

### 3.1 Illuminance by sensitivity

| Class | Examples | Max illuminance on exhibit | Source |
|---|---|---|---|
| Highly sensitive | works on paper, watercolour, prints, photographs, textiles, dyed material | **50 lux** | [Texas Historical Commission](https://www.thc.texas.gov/public/upload/publications/Light%20Level%20Recommendations%202013.pdf) (50 lux; UV <= 75 microwatt/lumen max, ideal 0-10) ; Muller & Schmitz via [De Gruyter](https://bdt.degruyter.com/?p=18884) |
| Moderately sensitive | oil, tempera, acrylic on canvas or panel, wood, leather | **150 lux** (THC) to **200 lux** (WA Museum manual, the long-running "50/200 lux" rule) | [THC](https://www.thc.texas.gov/public/upload/publications/Light%20Level%20Recommendations%202013.pdf), [WA Museum manual](https://manual.museum.wa.gov.au/book/export/html/73/index.html), [UTS paper](https://opus.lib.uts.edu.au/handle/10453/123288) |
| Insensitive | stone, metal, ceramic, glass | not conservation-limited; design choice, 200-300 lux is common practice (low-authority source) | [Superior/other vendor guides, low authority] |

Annual exposure budgets (lux-hours per year): very sensitive about 50,000 ([CCAHA](https://ccaha.org/sites/default/files/attachments/2019-12/2019_Light%20Exposure%20for%20Artifacts%20on%20Exhibition_EZ.pdf)); Australian guidance 100,000 at 50 lux and 450,000 at 200 lux; CIE/IESNA oil painting ceilings 600 and 480 klx-h/year (Smithsonian-hosted study via search result). Museums are moving from lux to light dose ([CCA list](https://cool.culturalheritage.org/byform/mailing-lists/cdl/1995/0576.html)).

Visual note from the Canadian Conservation Institute: 50-200 lux is the typical museum range; the biggest jump in perceived pleasantness is between 50 and 100 lux and most of the gain at 600 lux is already reached by 200 lux ([CCI Technical Bulletin 36](https://www.canada.ca/en/conservation-institute/services/conservation-preservation-publications/technical-bulletins/led-lighting-museums.html)). That is why virtual rooms should *not* be bright: a real gallery is 100-200 lux on the wall, and the eye adapts. Render the wall at about 150 lux, the floor at 50-100 lux, and use exposure to make the wall read as a bright wall.

### 3.2 Colour quality and temperature

From CCI Technical Bulletin 36 (same URL as above):
- "Excellent": CRI >= 90, R9 >= 90, Duv between -0.003 and +0.003 (incandescent/halogen meet this).
- "Good, minimum for museums": CRI >= 90, R9 >= 50, Duv within +/-0.003. Energy Star 2017 (CRI >= 80) is not adequate.
- 3000 K is the practical default because most good LEDs exist there; CCT is preference, not quality; use the **same CCT throughout a space**; avoid LEDs at 2500-2900 K (that is where poor Duv occurred); LEDs above 4000 K averaged R9 around 20.
- Dimming at 1250 Hz or higher; flicker is perceptible up to 120 Hz.
- Violet-pump 415 nm LEDs can be good and help distinguish near-white paints; 405 nm LEDs are bad.
- Fitzwilliam Museum advises CRI >= 90 and treats 80 as "good" ([Fitzwilliam](https://conservation.fitzmuseum.cam.ac.uk/leds-part-1-seeing-things-in-a-new-light/); fetch was rate-limited, based on search summary).

**Numbers for the renderer.** Accent fixtures: 3000 K (RGB about 1.0, 0.78, 0.55 linear before normalisation; use a Planckian converter, do not hand-pick). Warm domestic: 2700 K. Gallery general/wall wash: 3000-3500 K. Daylight through north sky: 6500-7500 K with large uncertainty: sources for "north light" colour temperature range from about 5,500 K to 10,000 K ([Marla, Wet Canvas threads, via search](https://www.wetcanvas.com/forums/topic/painting-in-artificial-light/page/2)). Use 6500 K for overcast skylight and mix toward 5500 K for sun-touched rooms. Mixed daylight + 3000 K in the same room is realistic and gives the warm/cool contrast that sells the render.

### 3.3 Track spots: aiming and geometry

From the Canadian Conservation Institute Note 2/3 on track lighting ([CCI Notes](https://www.canada.ca/en/conservation-institute/services/conservation-preservation-publications/canadian-conservation-institute-notes/track-lighting.html)):
- Aim so the beam is **60 degrees to the horizontal**, equivalently **30 degrees from the vertical** (the "30-degree rule"). Because the wall normal is horizontal, the angle of incidence on a vertical wall is also 60 degrees, so illuminance at the picture centre is cos(60) = 50% of the on-axis value. The note tabulates the loss: 10 deg 1.5%, 20 deg 6%, 30 deg 13.4%, 40 deg 23.4%, 50 deg 35.7%, 60 deg 50%.
- Fixture offset from the wall: `D = (H - 160) x 0.577` cm, where H is the ceiling/track height and 160 cm is the eye height. For a 3.0 m ceiling D = 81 cm. For large wall objects add at least 30 cm. Double tracks 60-90 cm apart.
- Recess the lamp in the fixture to prevent direct glare. Steeper angles accentuate surface texture (raking light).
- Looser guidance elsewhere: 30-45 degrees is common in trade sources; for glazed works keep the fixture close to the wall to move the reflection out of sight ([Perfect Picture Lights](https://perfectpicturelights.com/blog/how-to-install-track-lighting-to-highlight-artwork), low authority).
- Beam angle (trade rule of thumb, low authority): narrow 8-20 degrees for small pieces, 20-30 degrees medium, >= 40 degrees general/wash. Practical for galleries: 15 / 24 / 36 / 60 degree optics.

**Worked example (calc).** Ceiling 3.6 m, painting centre at 1.6 m: CCI gives D = (360-160) x 0.577 = 115 cm offset, plus 30 cm for a large work = 145 cm. Fixture to centre distance d = sqrt(2.0^2 + 1.15^2) = 2.3 m. For 200 lux on a wall at 60 degrees incidence you need `I = E d^2 / cos60 = 200 x 5.29 / 0.5 = 2,116 cd` at the beam centre. Pool size on the wall at 2.3 m (full beam angle, then stretched by 1/cos60 = 2x vertically): 15 deg: 0.61 m wide, about 1.2 m tall; 24 deg: 0.98 x 1.96 m; 36 deg: 1.49 x 2.99 m; 60 deg: 2.66 m wide. Choose the optic so the pool is at least 20% wider than the work. In three.js units, `SpotLight.intensity` is in candela (docs), so the above value can be used directly, then set exposure so that 150-200 lux on albedo 0.8 white maps to about 0.8-0.85 display value (`L = E x rho / pi`, so 160 x 0.8 / pi is about 41 cd/m2; exposure about 0.02 in 1-unit-per-lux scene scale). Verify with a grey card.

### 3.4 Wall washers

From ERCO's Pantrac data sheet ([ERCO PDF](https://www.erco.com/cdn/downloaddata/2026_01/db/pep-full/famspecs/2_1033/pantrac-PANTRAC_1033_2-web.pdf)): mount the washer about **1/3 of the room height** from the wall; spacing between washers up to **1.5 x** the offset for uniform vertical illuminance. Another source says space them at <= 1.3 x the offset ([Architectural Products](https://www.arch-products.com/architectural-lighting/article/55092740/how-to-design-wall-wash-lighting-tips-for-perfect-vertical-illumination)). I did not find a source for a 2:1 uniformity ratio; aim for a smooth gradient with the brightest band at about 2/3 of wall height and a gentle fall-off toward the floor. This is what the baked lightmap should hold.

Accent-to-ambient ratio. Common practice is that accent light is several times the ambient, to make the work "pop"; I did not find a citable number here. A starting point (judgement): wall wash 100-150 lux, accent on key works 200 lux (paintings) or 300 lux (sculpture), floor ambient 30-60 lux.

### 3.5 Daylight

- **Skylights with diffusers / louvres.** Fondation Beyeler: glass roof of about 4,000 m2 with inclined opaque sun shading, a double-glazed roof, operable louvres, a glass ceiling and a perforated-metal second ceiling; north light in, east and west blocked. Arup states the outer fins have only **30% transmission**; the architects' office says **50%** of direct sun is filtered, so use 30-50% ([Arup](https://www.arup.com/projects/beyeler-foundation-museum), [RPBW](https://www.rpbw.com/project/beyeler-foundation-museum)). Gallery ends have floor-to-ceiling windows 6.8 m wide x 5 m high onto the park and lily ponds ([Fondation Beyeler](https://www.fondationbeyeler.ch/en/museum/architecture-and-nature)).
- **Menil**: roof "light leaves" of ferrocement, each about 130 x 90 cm in section and 25 mm thick, "drastically" reduce interior light; brief was light from above that follows weather and time ([Arup/ACSA](https://www.acsa-arch.org/proceedings/Technology%20Proceedings/ACSA.Tech.1999/ACSA.Tech.1999.11.pdf), [Arup Journal](https://arup.com/globalassets/downloads/arup-journal/the-arup-journal-1983-issue-1.pdf)).
- **Kimbell (Kahn)**: narrow Plexiglas skylights along each cycloid vault apex, with perforated wing-shaped aluminium reflectors beneath; measurements show large loss between skylight, reflector and vault, and the sunlit half of the vault is brighter than the shaded half ([Architecture Lab](https://www.architecturelab.net/kimbell-art-museum-louis-kahn/), [ACSA paper](https://es.scribd.com/document/312524578/ACSA-AM-86-20-pdf)). Piano's 2013 pavilion uses north-opening louvres and a polished anodised-aluminium reflector ([Architect Magazine](https://www.architectmagazine.com/?p=116466)).
- **Dia Beacon**: more than 34,000 sq ft of skylights; north-facing sawtooth light, even illumination ([Smarthistory](https://smarthistory.org/?p=88007), [Smithsonian](https://www.smithsonianmag.com/arts-culture/beacon-of-light-89019529/)).
- **Rothko Chapel**: 2020 skylight, 19 ft 7 in across, three diffusing layers, 280 individually angled aluminium blades ([Architect Magazine](https://www.architectmagazine.com/?p=356094), [Wikipedia](https://en.wikipedia.org/wiki/Rothko_Chapel)).
- **Chichu (Ando)**: daylight only, no artificial light in the galleries ([Benesse](https://www.benesse-artsite.jp/en/art/chichu.html)).
- **Kunsthaus Bregenz (Zumthor)**: light passes three layers (glass facade, double glazing, daylight ceiling) before reaching the rooms; floor heights 4.25, 4.25, 4.95 m ([KUB](https://www.kunsthaus-bregenz.at/en/architecture)).

For a renderer: model the skylight as an area emitter in the bake (Blender sun + sky or a large emission plane) with transmission 30-50%, plus the 3000 K track light as a separate lightmap if you want "day/evening" variants. Two lightmaps (daylight only, artificial only) multiplied by two intensity uniforms give a free time-of-day slider with no extra bake cost at runtime, at the price of a second texture.

---

## 4. Ten room types as references

Existing app rooms (from `synth.js`): White Gallery 11 x 7 x 3.6 m (concrete floor, track spots), Long Hall 18 x 6.5 x 5.2 m (oak, skylights, bone paint), The Vault 9 x 9 x 4.4 m (charcoal, stone, narrow spots). Types below keep those three as starting points and add seven. Dimensions marked "real" come from a source; "app" are my proposed room sizes (judgement).

Common for every room: floor-to-ceiling dims in metres, work-hang height 1.5-1.6 m centre (CCI uses 160 cm eye level), door 1.7-2.2 m.

### 1. Classic white cube
- **Real references:** David Zwirner 537 West 20th Street: 5,000 sq ft column-free gallery, 18'6" ceiling; 533 West 19th: three column-free spaces with 18 ft ceilings; the Selldorf-converted 19th Street buildings have new north-facing skylights ([Zwirner 19th Street](https://www.davidzwirner.com/galleries/new-york/19th-street), [Selldorf](https://www.selldorf.com/projects/david-zwirner-19th-street), [Commercial Observer](https://commercialobserver.com/2022/11/david-zwirner-takes-new-gallery-office-space-on-west-20th-street)). Gagosian: the same typology (I did not retrieve a source for specific dimensions).
- **Materials:** floor sealed concrete or pale ash/oak; walls smooth white plaster (matte, albedo about 0.8-0.85); ceiling white with a recessed track or daylight panels.
- **Light:** 3000 K LED track, 24/36 degree spots, plus wall washers; north skylights with diffuser at 30-50% transmission in the large rooms.
- **Mood:** neutral, commercial, confident. **Suits:** everything; large contemporary canvases, photography, sculpture on plinths.
- **Variants (app):** small project room 6 x 5 x 3.2 m; large hall 15 x 10 x 5.5 m with a skylight strip; enfilade of three rooms 9 x 7 x 4 m with 2 m doorways.

### 2. Industrial loft / converted warehouse
- **Real references:** Dia Beacon, former 1929 Nabisco box-printing factory, opened 2003, 34,000+ sq ft of skylights, north sawtooth light, Robert Irwin's Beacon Project ([Dia](https://www.diaart.org/exhibition/exhibitions-projects/robert-irwin-beacon-project-exhibition), [Smarthistory](https://smarthistory.org/?p=88007)). Hamburger Bahnhof Rieckhallen, former warehouses, almost 3,000 m2, described as 250 m long, reopened September 2024 ([SMB](https://www.smb.museum/en/whats-new/detail/the-rieckhallen-at-hamburger-bahnhof-rescued-as-an-exhibition-venue-for-contemporary-art/), [Berliner Zeitung](https://www.berliner-zeitung.de/article/287303)). I did not confirm roof type or date for Rieckhallen.
- **Materials:** floor polished or painted concrete or old timber; walls painted brick or plaster, columns (steel or cast), exposed roof trusses, sawtooth roof with north glazing.
- **Light:** even north skylight, few spots; large-scale installation lighting.
- **Mood:** monumental, quiet, workmanlike. **Suits:** large-scale painting, installation, minimal sculpture, series.
- **Variants:** 20 x 12 x 6 m loft with a column grid; long nave 40 x 10 x 7 m (phone memory warning: needs 2 lightmaps); two bays divided by a freestanding wall.

### 3. Skylit museum hall
- **Real references:** Kimbell Art Museum, Kahn's cycloid vaults with perforated reflectors; Menil Collection (ferrocement light leaves, about 30,000 sq ft of galleries); Fondation Beyeler (glass roof of about 4,000 m2, louvres, garden windows 6.8 x 5 m) (sources in 3.5).
- **Materials:** travertine or concrete walls (Kimbell: concrete and travertine, oak floors, from general knowledge), pale timber floor, white or limestone plaster, fabric-lined walls in places.
- **Light:** top light diffused by louvres or reflectors, no direct sun; 3000 K picture lights at night.
- **Mood:** calm, ennobling, museum. **Suits:** classical and modern painting, drawings with controlled light, sculpture under a skylight.
- **Variants:** single vaulted hall 20 x 8 x 6.5 m; skylit square 10 x 10 x 5.5 m; three vaults in a row 24 x 7 x 6 m.

### 4. Salon / historic enfilade
- **Real references:** Dulwich Picture Gallery (Soane, 1817): top-lit rooms in an enfilade with roof lanterns that diffuse natural top light and avoid glare ([Dulwich](https://www.dulwichpicturegallery.org.uk/about/our-architecture), [Soane Museum](https://www.soane.org/node/2639)). Isabella Stewart Gardner Museum: a glass-roofed courtyard in a Venetian-palace style, galleries on four levels, silk and velvet wall textiles, light mostly from windows ([Gardner](https://www.gardnermuseum.org/node/37306)). I found no source for the original wall colours of Dulwich or the Royal Academy; deep red, green and grey-blue walls with a white dado are typical salon practice (my general knowledge, unverified here).
- **Materials:** timber parquet; lower wall panelling/wainscot (about 0.9-1.0 m), painted or textile upper walls (deep red, bottle green, Prussian blue), cornice, picture rail; plaster ceiling with lantern.
- **Light:** lantern top light plus warm picture lights (2700-3000 K); lower illuminance (about 50-150 lux).
- **Mood:** intimate, authoritative, traditional. **Suits:** salon hangs of many small and medium paintings, portraits, prints.
- **Variants:** one salon 6 x 5 x 4.2 m; enfilade of three rooms 7 x 6 x 4.5 m with aligned doors; long gallery 16 x 5.5 x 5 m with lanterns.

### 5. Raw concrete / brutalist (Ando, Zumthor)
- **Real references:** Chichu Art Museum, Ando, daylight only, Monet room with white walls ([Benesse](https://www.benesse-artsite.jp/en/art/chichu.html)); Kunsthaus Bregenz, Zumthor, three daylight layers, 4.25/4.25/4.95 m floors, concrete walls ([KUB](https://www.kunsthaus-bregenz.at/en/architecture)); Punta della Dogana, Ando, a reinforced concrete cube inside old brick and exposed timber beams ([Pinault Collection](https://www.pinaultcollection.com/palazzograssi/en/node/625), [Wallpaper](https://www.wallpaper.com/art/punta-della-dogana-venice)).
- **Materials:** cast concrete walls with tie-hole grid and formwork joints, concrete or polished stone floors, concrete ceilings; steel/glass details.
- **Light:** daylight from slots or ceiling light planes; almost no fixtures; shifting contrast.
- **Mood:** serious, contemplative, severe. **Suits:** minimal painting, large photography, installation, a single sculpture.
- **Variants:** square room 8 x 8 x 4.25 m with a glass daylight ceiling; tall volume 8 x 8 x 6 m with a slot window; two-room sequence with a ramp or slit between.

### 6. Artist studio with north light
- **Real references:** North light is the classical studio and sawtooth-factory light because it avoids direct sun and gives steady, diffuse illumination ([Wikipedia, North light](https://en.wikipedia.org/wiki/North_light_(architecture))). In the southern hemisphere the same idea faces south.
- **Materials (app):** painted floorboards or scuffed concrete, white lime-washed brick or plasterboard, a tall north window or sawtooth skylight, trestle tables, flat files, works leaning on the wall.
- **Light:** north sky 6500-7500 K plus an artificial daylight fixture at 5000-5500 K, CRI >= 95 (sources disagree about north-sky colour temperature; see 3.2).
- **Mood:** working, intimate, honest. **Suits:** artists showing process, studio visits, unframed works, works in progress.
- **Variants:** small 5 x 4 x 3 m; large 10 x 7 x 5 m with sawtooth; studio plus adjoining white wall for hanging.

### 7. Domestic apartment / collector's home
- **Real references:** Isabella Stewart Gardner's house museum (above); the typology of a collector's home-gallery with picture rails and lamps. I did not research a specific modern domestic example here.
- **Materials:** oak herringbone or boards, painted walls (off-white, soft greys, warm earth), skirting, picture rail, rugs, furniture as scale cues.
- **Light:** window daylight from one side, 2700 K lamps and picture lights; low (100-150 lux), warm and uneven on purpose.
- **Mood:** private, warm, "can I live with this". **Suits:** sales to collectors and interior designers, small and medium works, ceramic and sculpture on furniture.
- **Variants:** studio flat 5 x 4.5 x 2.8 m; living room + hall 7 x 5 x 3 m; townhouse with two rooms and a stairwell.

### 8. Black box / dark room
- **Real references:** Tate Modern Tanks, former oil tanks converted by Herzog & de Meuron: two dark circular raw-concrete spaces, the first permanent museum galleries for live art, performance, installation and video ([Art Newspaper](https://theartnewspaper.com/2012/07/01/get-tanked-at-the-tate-first-permanent-museum-galleries-devoted-to-installation-and-live-art-open-at-bankside), [Domus](https://www.domusweb.it/en/news/2012/07/24/herzog--de-meuron-tate-tanks.amp.html), [Tate](https://www.tate.org.uk/visit/tate-modern/tanks)). Existing app room "The Vault" is a related dark type.
- **Materials:** matte black or charcoal absorbent surfaces, dark floor.
- **Light:** almost none; narrow spots (8-15 degrees) or the light of screens; 20-50 lux for light-sensitive works.
- **Mood:** focused, immersive. **Suits:** video, projection, light-sensitive works on paper, photographs, glass.
- **Variants:** 8 x 6 x 3.5 m cell; 14 x 10 x 5 m hall with three projection walls; circular 12 m diameter (Tanks-like).
- **Rendering note:** cheapest room to render; lightmaps are tiny, black materials hide texture memory. Video textures cost bandwidth; limit to one at a time.

### 9. Glass pavilion with garden
- **Real references:** Neue Nationalgalerie (Mies): roof about 64.8-65 m square on eight steel columns, glass walls set back about 7.2 m, interior height about 8.4 m (single source for the last two), upper hall 2,683 m2 ([Dominik Gehl](https://dominikgehl.com/germany/berlin/neue-nationalgalerie), [Structurae](https://structurae.net/structures/20008445), [Divisare](https://divisare.com/projects/297030-ludwig-mies-van-der-rohe-rory-gardiner-neue-nationalgalerie)); Fondation Beyeler's garden-facing galleries (above).
- **Materials:** black steel frame, floor-to-ceiling glass, granite floor, white or grey free-standing walls, a garden outside.
- **Light:** daylight from all sides; strong change over the day; reflections in the glass at night.
- **Mood:** open, airy, modern. **Suits:** sculpture, large-scale outdoors-facing works, installations.
- **Variants:** small pavilion 10 x 8 x 4 m with one glass wall; large 24 x 16 x 5 m glass hall; gallery with a glass end wall facing a pond.
- **Rendering note:** hard on phones: glass reflections need an outside sky box and transmission faked as emissive; the garden is a flat billboard or a low-resolution panorama. No real-time refraction.

### 10. Japanese wood-and-paper room
- **Real references:** Nezu Museum (Kengo Kuma, 2009): bamboo cladding, sandstone floors, a pitched ceramic-tile roof with steel eaves, a garden with four tea houses, a two-storey glass wall to the garden ([Architectural Record](https://architecturalrecord.com/articles/8241-nezu-museum), [GLT](https://www.gltjp.com/en/directory/item/12909/)).
- **Materials:** pale cedar or cypress, tatami or low stone floor, shoji (translucent paper), tokonoma alcove, bamboo ceilings, matte plaster.
- **Light:** diffused window light through paper (transmission about 30-40%, my estimate), low 2700-3000 K fixtures, quiet shadow.
- **Mood:** still, meditative, crafted. **Suits:** ceramics, scrolls, ink painting, small sculpture, craft objects, prints.
- **Variants:** 4.5-mat tea room (about 2.7 x 2.7 x 2.5 m); gallery 9 x 6 x 3.2 m with a tokonoma wall; passage along an engawa to a garden.

### Not selected, with reason
- **Cloister / stone vault / chapel** (Rothko Chapel, Cloisters): beautiful but narrow in what it suits; add as an 11th later (Rothko Chapel: octagon, 280-blade skylight). Stone vault mostly overlaps with the Vault.
- **Outdoor courtyard:** needs sky/sun and weather, expensive, and bad for the conservation story.
- **Artist-specific "found" spaces** (churches, shops): better as custom builds.

### Mapping to the current three rooms
White Gallery -> type 1; Long Hall -> type 3 (skylight) with oak; The Vault -> type 8 or 5. So seven new rooms are needed.

---

## 5. Recommended pipeline

### 5.1 The bet

Offline: model, bake, compress. Browser: load a tiny package, add the art, add a few cheap, correct lights. This is Shapespark's proven approach (baked path tracing, delivered in a browser, runs on a phone) specialised for art, with the advantage that Open Studio owns the viewer and so can add accurate per-work lighting.

### 5.2 Offline (once per room, automated)

1. **Model in Blender** at real dimensions with correct proportions (Section 4). Name an empty for every artwork slot (`wall_N_slot_k`) with width/height custom properties; export them as nodes in the GLB (the three.js forum answer recommends exactly this: named empties plus `userData`).
2. **Materials**: Principled BSDF using CC0 sets (Poly Haven/ambientCG) at 1K.
3. **Lights** in Blender mirroring real fixtures: area lights for wall washers; spot lights with IES files (Cycles reads IES) for baked accent in the default hang if wanted; sun + sky or an emission plane through the skylight with 30-50% transmission; a 6500 K sky and 3000 K fixtures.
4. **Lightmap UV** with a script (smart UV or Blender UV packing), 4-8 px margin, texel density 1.0-1.5 cm.
5. **Bake** Cycles Diffuse Direct+Indirect, 512-1024 samples for 2048 maps, OIDN denoise outside the bake to avoid seams; bake 2 maps if you want a day/night slider.
6. **Export** a GLB (geometry, UV0, UV1, PBR materials), with `gltf-transform optimize` (meshopt, KTX2 on textures, resize to 1024), and write the lightmap as separate KTX2 (ETC1S if it shows no banding, otherwise UASTC).
7. **Probe**: render a 256 x 256 cubemap (or a small equirect) at room centre; also compute SH coefficients for the `LightProbe`.
8. **IES -> small 1D falloff texture** per fixture type (from IESLoader-style data) for the pool shader.

Automation: Blender headless (`blender -b -P bake.py`) on the owner's PC or a cloud GPU box; the existing `studio/app/space/pipeline/` may already be heading this way (not read). Cycles bake of a 2048 map with 1,000 samples is on the order of minutes on a consumer GPU (judgement); the first room will take days of look-dev, later rooms hours.

### 5.3 In the browser (every visit)

1. Load `room.glb` (about 0.2-0.6 MB geometry after meshopt), PBR KTX2 textures, lightmap KTX2, probe.
2. Renderer: WebGL2, `antialias:true`, `outputColorSpace=SRGB`, `toneMapping=NeutralToneMapping`, exposure from the room JSON, dynamic pixel ratio (2.4 above).
3. Materials: `MeshStandardMaterial` with `lightMap` (channel 1), `lightMapIntensity` about pi (calibrate), no scene lights needed for the architecture itself.
4. Artwork: planes at the empties; `MeshStandardMaterial` or a small custom shader that applies the pool function; frame as a thin box with a baked soft shadow decal.
5. Accent: analytic pool decals (2.7 option 4), plus 2-3 pooled `SpotLight`s for sculptures; `LightProbe` for dynamic objects.
6. Floors: probe reflection by default; `Reflector` only for polished rooms at half-resolution.
7. Adaptive quality: frame-time monitor lowers pixel ratio, then disables the Reflector, then caps at 30 fps.
8. Fallback: if the device is old or WebGL fails, show the current canvas-painted room (keep `synth.js` as the fallback tier; it is what "works everywhere" today).

### 5.4 File sizes (estimates; verify with a real room)

| Item | Size |
|---|---|
| Geometry (GLB, meshopt) | 0.2-0.6 MB |
| PBR textures (5 materials x 3 at 1024, KTX2 ETC1S/UASTC mix) | 1.5-4 MB |
| Lightmap 2048 KTX2 | 0.5-1 MB (ETC1S), 3-5 MB (UASTC) |
| Probe cubemap + SH | 0.1-0.5 MB |
| **Total per room** | **about 3-8 MB** |
| GPU memory after transcoding | about 12-30 MB |

Compare: an optimised mobile Gaussian-splat scene is 15-30 MB for one gallery (Utsubo), and a raw splat PLY is 50-500 MB.

### 5.5 Costs and time (judgement)

- Ten rooms x 3 variants = 30 bakes. At about a day of artist time per new room and 2 hours per variant, plan 4-6 weeks of focused work for a first set of 10 good rooms, with one room (the white cube) done to the final standard first as the benchmark.
- Hosting: static files on a CDN; no server GPU.
- Licences: use CC0 textures and HDRIs; keep a record.

### 5.6 Risks

1. **iOS memory kills.** Mitigation: ASTC via KTX2, 1K textures, a hard budget per room, load only one room at a time, dispose on leave. Test on a real iPhone 12 and 15.
2. **Lightmap quality in compression.** Banding in ETC1S; mitigation: test UASTC, or 8-bit sRGB plus dithering.
3. **Lightmap seams and denoise artefacts.** Known Blender issue; mitigation: padding, separate OIDN pass.
4. **glTF cannot carry lightmaps.** Mitigation: sidecar KTX2 and JSON; do not wait for a standard.
5. **Calibration** of `lightMapIntensity` and exposure (my pi inference). Mitigation: grey card in every scene.
6. **Dynamic accent consistency**: analytic pools can disagree with the baked wash if exposure drifts. Mitigation: bake the wash with the same photometry, test with a white test wall.
7. **Glass pavilion and mirror floors** are the least phone-friendly types. Mitigation: fake with probes and flat panoramas; ship them last.
8. **Bake workflow bus factor.** Mitigation: script it, check the scripts in, store the .blend files and room JSON with the repo; keep the pipeline reproducible.
9. **three.js version drift.** The app pins r170 from a CDN. Neutral tone mapping and KTX2 are available at r170; IESSpotLight is WebGPU-only; WebGPU on iOS 26 had open bugs. Stay on WebGL2 and plan a tested upgrade.
10. **Expectation gap.** Even a well-baked room will not match Matterport photos or Unreal ray tracing. The honest claim is "the most realistic interactive gallery you can walk on a phone, with correct gallery lighting", not "indistinguishable from photographs".

### 5.7 Staged plan

Stage 0 (1-2 days): one room, the white cube 11 x 7 x 3.6, baked with real fixtures, Neutral tone mapping, loaded next to the old room on an iPhone for an A/B screenshot. This single comparison decides if the approach is right. Stage 1: add pools, contact shadows, probe, adaptive quality. Stage 2: build the remaining nine types, hardest last (glass, black box with video). Stage 3: optional R&D: a "digital twin" option via Gaussian splat or Matterport import for real galleries.

---

## 6. Sources by topic (all URLs opened or returned by search in this session)

Market: [Reality Atlas](https://www.reality-atlas.com/blog/best-companies-virtual-art-galleries-vr-exhibitions), [Kunstmatrix FAQ](https://www.kunstmatrix.com/en/info/faqs/what-are-the-pricing-details-for-the-3d-online-gallery), [ArtPlacer plans](https://help.artplacer.com/support/solutions/articles/65000190412-plans-for-galleries), [Shapespark](https://shapespark.com/), [G2 Shapespark](https://www.g2.com/products/shapespark/reviews), [V21 Artspace](https://v21artspace.com/3d-virtual-exhibitions), [Frieze x Vortic](https://www.frieze.com/article/explore-immersive-3d-viewing-rooms-frieze-partners-vortic), [Hauser & Wirth HWVR](https://www.theartnewspaper.com/2020/04/09/hauser-and-wirth-announces-new-art-and-technology-division-with-the-launch-of-a-custom-designed-virtual-reality-platform), [Emperia (Dealroom)](https://app.dealroom.co/companies/emperia_1), [Matterport plans](https://matterport.com/plans), [PricingSaaS Matterport](https://pricingsaas.com/companies/matterport), [DPT Labs 3DGS](https://labs.dpt.co/article-3dgs.html), [Radiance Fields / Yulei](https://radiancefields.com/gaussian-splatting-brings-art-exhibitions-online-with-yulei), [Utsubo 3DGS guide](https://www.utsubo.com/blog/gaussian-splatting-guide), [World Labs Musee du Monde](https://www.worldlabs.ai/musee-du-monde), [ISPRS 2025](https://isprs-annals.copernicus.org/articles/X-M-2-2025/185/2025/), [three.js forum gallery architecture](https://discourse.threejs.org/t/architecture-advice-needed-for-an-immersive-browser-based-historical-art-gallery/93714), [Epic Pixel Streaming](https://dev.epicgames.com/documentation/en-us/unreal-engine/pixel-streaming-in-unreal-engine).

Techniques: [MeshStandardMaterial docs](https://threejs.org/docs/pages/MeshStandardMaterial.html), [SpotLight docs](https://threejs.org/docs/pages/SpotLight.html), [KTX2Loader docs](https://threejs.org/docs/pages/KTX2Loader.html), [tone mapping chunk](https://raw.githubusercontent.com/mrdoob/three.js/dev/src/renderers/shaders/ShaderChunk/tonemapping_pars_fragment.glsl.js), [lightmap chunk](https://raw.githubusercontent.com/mrdoob/three.js/dev/src/renderers/shaders/ShaderChunk/lights_fragment_maps.glsl.js), [IESLoader source](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/loaders/IESLoader.js), [IESSpotLight docs](https://threejs.org/docs/pages/IESSpotLight.html), [RectAreaLight docs](https://threejs.org/docs/pages/RectAreaLight.html), [Khronos PBR Neutral](https://www.khronos.org/news/press/khronos-pbr-neutral-tone-mapper-released-for-true-to-life-color-rendering-of-3d-products), [PBR Neutral repo](https://github.com/KhronosGroup/ToneMapping/tree/main/PBR_Neutral), [glTF-Transform CLI](https://gltf-transform.dev/cli), [KTX-Software](https://github.com/KhronosGroup/KTX-Software), [WebGPU in major browsers](https://web.dev/blog/webgpu-supported-major-browsers), [WebKit bug 301627](https://bugs.webkit.org/show_bug.cgi?id=301627), [WebKit bug 300782](https://bugs.webkit.org/show_bug.cgi?id=300782), [Blender denoise seam bug](https://projects.blender.org/blender/blender/issues/97808), [Blender Artists lightmap thread](https://blenderartists.org/t/blender-cycles-lightmap-baking/1169571), [three.js box projection thread](https://discourse.threejs.org/t/parallax-correction-from-environment-maps/32692), [three.js examples: spotlight](https://threejs.org/examples/webgl_lights_spotlight.html), [rectarealight](https://threejs.org/examples/webgl_lights_rectarealight.html), [lightprobe](https://threejs.org/examples/webgl_lightprobe.html), [tonemapping](https://threejs.org/examples/webgl_tonemapping.html), [gtao](https://threejs.org/examples/webgl_postprocessing_gtao.html), [mirror](https://threejs.org/examples/webgl_mirror.html), [ktx2 loader](https://threejs.org/examples/webgl_loader_texture_ktx2.html), [gltf compressed](https://threejs.org/examples/webgl_loader_gltf_compressed.html), [progressive LOD](https://threejs.org/examples/webgl_loader_gltf_progressive_lod.html), [Poly Haven](https://polyhaven.com/hdris), [ambientCG](https://ambientcg.com/).

Lighting practice: [CCI Technical Bulletin 36, LEDs](https://www.canada.ca/en/conservation-institute/services/conservation-preservation-publications/technical-bulletins/led-lighting-museums.html), [CCI Note 2/3 track lighting](https://www.canada.ca/en/conservation-institute/services/conservation-preservation-publications/canadian-conservation-institute-notes/track-lighting.html), [Texas THC light levels](https://www.thc.texas.gov/public/upload/publications/Light%20Level%20Recommendations%202013.pdf), [CCAHA light exposure](https://ccaha.org/sites/default/files/attachments/2019-12/2019_Light%20Exposure%20for%20Artifacts%20on%20Exhibition_EZ.pdf), [WA Museum manual](https://manual.museum.wa.gov.au/book/export/html/73/index.html), [UTS paper on 50/200 lux](https://opus.lib.uts.edu.au/handle/10453/123288), [CIBSE LG8](https://www.cibse.org/knowledge-research/knowledge-portal/lg8-archived-lighting-for-museums-and-art-galleries-2015-pdf/), [ERCO Pantrac wall washers](https://www.erco.com/cdn/downloaddata/2026_01/db/pep-full/famspecs/2_1033/pantrac-PANTRAC_1033_2-web.pdf), [Architectural Products wall washing](https://www.arch-products.com/architectural-lighting/article/55092740/how-to-design-wall-wash-lighting-tips-for-perfect-vertical-illumination), [Fitzwilliam LED](https://conservation.fitzmuseum.cam.ac.uk/leds-part-1-seeing-things-in-a-new-light/).

Spaces: [Zwirner 19th St](https://www.davidzwirner.com/galleries/new-york/19th-street), [Selldorf](https://www.selldorf.com/projects/david-zwirner-19th-street), [Commercial Observer](https://commercialobserver.com/2022/11/david-zwirner-takes-new-gallery-office-space-on-west-20th-street), [Dia Beacon](https://www.diaart.org/exhibition/exhibitions-projects/robert-irwin-beacon-project-exhibition), [Smarthistory Beacon](https://smarthistory.org/?p=88007), [SMB Rieckhallen](https://www.smb.museum/en/whats-new/detail/the-rieckhallen-at-hamburger-bahnhof-rescued-as-an-exhibition-venue-for-contemporary-art/), [Kimbell (Architecture Lab)](https://www.architecturelab.net/kimbell-art-museum-louis-kahn/), [Architect Magazine, Kimbell Piano](https://www.architectmagazine.com/?p=116466), [Menil (ACSA)](https://www.acsa-arch.org/proceedings/Technology%20Proceedings/ACSA.Tech.1999/ACSA.Tech.1999.11.pdf), [Beyeler (Arup)](https://www.arup.com/projects/beyeler-foundation-museum), [Beyeler (RPBW)](https://www.rpbw.com/project/beyeler-foundation-museum), [Dulwich](https://www.dulwichpicturegallery.org.uk/about/our-architecture), [Gardner](https://www.gardnermuseum.org/node/37306), [Chichu](https://www.benesse-artsite.jp/en/art/chichu.html), [Kunsthaus Bregenz](https://www.kunsthaus-bregenz.at/en/architecture), [Punta della Dogana](https://www.pinaultcollection.com/palazzograssi/en/node/625), [Tate Tanks](https://www.tate.org.uk/visit/tate-modern/tanks), [Domus Tanks](https://www.domusweb.it/en/news/2012/07/24/herzog--de-meuron-tate-tanks.amp.html), [Neue Nationalgalerie (Gehl)](https://dominikgehl.com/germany/berlin/neue-nationalgalerie), [Structurae NNG](https://structurae.net/structures/20008445), [Nezu (Arch Record)](https://architecturalrecord.com/articles/8241-nezu-museum), [Rothko Chapel (Architect)](https://www.architectmagazine.com/?p=356094), [North light (Wikipedia)](https://en.wikipedia.org/wiki/North_light_(architecture)).

---

## 7. What I could not confirm

- Per-product realism for Kunstmatrix, Artsteps, Exhibbit, Vortic (no technical documentation found; judge by eye).
- Current Artsteps and Vortic prices; Matterport plan structure (sources conflict).
- Any measured iPhone benchmark for MSAA, KTX2 transcode time, Reflector cost or lightmapped scenes. All "ms" claims above are judgement and must be profiled on real devices.
- Whether `lightMapIntensity` of about pi is right (derived from reading the shader, not tested).
- Dimensions for Gagosian rooms, Tate Tanks, Dulwich rooms, Royal Academy wall colours, Hamburger Bahnhof roof type; Kimbell floor material.
- CIE/IES RP-30 text itself (paywalled; lux values come from secondary conservation sources).
- Accent-to-ambient ratio, wall-washer 2:1 uniformity (no source found).
