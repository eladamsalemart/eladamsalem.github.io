# 3D capture and web viewing of real indoor spaces (exhibitions) from phones — state of the art, Oct 2026

Scope note: research done 2026-10-28 with ~22 search/fetch calls. Primary sources (GitHub READMEs, vendor docs) were fetched where possible. Most pricing data comes from third-party comparison sites and conflicts; matterport.com could not be fetched from this environment (host blocked by the session's network allowlist), so Matterport figures are secondhand. Treat all prices as indicative and re-check the vendor pages before deciding.

## 1. Gaussian Splatting capture apps (2025–2026): quality, time, size, pricing, APIs

### Takeaway
Phone splat capture is mature and cheap (Scaniverse free and on-device; Polycam, KIRI, Teleport, Luma paid), and good enough for a small room *if* the operator walks the space slowly with hundreds of frames. It does not solve OPEN STUDIO's actual bottleneck (gallery staff sending only a handful of photos): every splat app assumes a dense video/photo sweep, not 6–20 stills.

### Cited Findings
- Phone apps (Scaniverse, Polycam, KIRI, LCC Scan) are rated "workable" for a small room if you walk slowly; result depends more on operator patience than on the handset. Scaniverse trains the splat on the phone itself, offline (about 90 s in one report). — [ar-go: Gaussian Splatting Capture Tools 2026](https://ar-go.co/blog/gaussian-splatting-capture-tools/)
- Scaniverse 4 puts Gaussian Splat mode at its centre; capture 1–3 min, training 3–10 min; quality judged on par with or slightly below Polycam/Luma. — [TT Lab 2026 deep dive](https://ttlab.hopto.org/blog/culture/2026-05-16-3d-gaussian-splatting-photogrammetry-2026-nerfstudio-postshot-luma-genie-polycam-apple-object-capture-realitycapture-deep-dive?lang=en) (blog, secondhand)
- Niantic Spatial relaunched Scaniverse in April 2026 as a web+mobile platform producing VPS maps, meshes and Gaussian splats; free tier for basic scanning, paid tiers add features such as 360-camera support; multiple users' scans can be merged into one cloud model. — [GeekWire](https://www.geekwire.com/2026/from-pokemon-go-to-physical-ai-niantic-spatial-unveils-its-global-3d-mapping-platform/); [Auganix](https://www.auganix.org/ar-news-nianctic-scaniverse-vps-2-0/); [Robotics 24/7](https://www.robotics247.com/article/niantic-spatial-launches-scaniverse-3d-space-capture-vps-2.0-virtual-positioning-platforms/technologies)
- Scaniverse "Classic" mode reportedly still allows unlimited on-device splat generation and mesh export for free; listed paid tiers Plus $20/mo and Pro $50/mo. — [SkyeBrowse: Polycam vs Scaniverse](https://www.skyebrowse.com/news/posts/polycam-vs-scaniverse) (competitor-run comparison site)
- USDZ output added to Scaniverse in July 2026. — [Wikipedia: Niantic Spatial](https://en.wikipedia.org/wiki/Niantic_Spatial) (lower confidence)
- Polycam has five capture modes including a Room Mode (LiDAR floor plans, USD/USDZ export); free tier restricts exports (GLTF only per one comparison). — [SkyeBrowse](https://www.skyebrowse.com/news/posts/polycam-vs-scaniverse)
- Polycam pricing conflicts across sources: Business $34/mo or $400/yr; Pro ~$26.99/mo; or Pro $11.99/mo with Team $59.99/mo. — [Polycam blog](https://poly.cam/blog/best-matterport-alternatives); [SkyeBrowse: Polycam vs Matterport](https://www.skyebrowse.com/news/posts/polycam-vs-matterport); [aisotools](https://aisotools.com/compare/luma-ai-vs-polycam)
- Luma AI removed its free tier in early 2026 (between 30 Jan and 8 Mar 2026 per one source); entry plan reportedly rose from $7.99 to $30/mo, Pro $90, Ultra $300 — these plans are oriented to Luma's generative video product. — [aitoolsbakery](https://aitoolsbakery.com/blog/luma-ai-pricing/); [checkthat.ai](https://checkthat.ai/brands/luma-ai/pricing)
- Varjo Teleport: ~$29.99–30/mo incl. 15 scans, 5 free scans to try, .ply export only with subscription; an enterprise tier at €69/mo (1–3 users) and €249/mo (4–15 users) is reported (date unclear). — [Radiance Fields](https://radiancefields.com/varjo-announces-full-release-of-radiance-field-vr-platform-teleport); [Road to VR](https://roadtovr.com/varjo-teleport-3d-model-scanning-app-release/); [MoguraVR](https://www.moguravr.com/?p=260499)
- A 2024 academic room capture with iPhone 12 Pro in Polycam used 430 images; ~15 min training on one GPU; still showed fogginess/artifacts in a cluttered room. — cited via [ar-go](https://ar-go.co/blog/gaussian-splatting-capture-tools/) / [mkhr.co.jp indoor 3DGS deep dive](https://mkhr.co.jp/posts/2026-02-15-3dgs-room-modeling-mobile-camera-2026)
- Phone camera does the work for a splat; iPhone LiDAR mainly helps scale and meshes. A 360 camera (~€550–850) is called the best tool for covering a whole room quickly; handheld LiDAR scanners start ~ $4,999. — [ar-go](https://ar-go.co/blog/gaussian-splatting-capture-tools/)
- Research specifically targets sparse/panorama-style indoor phone capture: LighthouseGS (panorama-style mobile captures, indoor structure priors), PanoPlane (plane-aware panoramic completion for sparse-view indoor 3DGS, 2026), 360-GS (layout-guided panoramic GS). — [LighthouseGS arXiv 2507.06109](https://arxiv.org/pdf/2507.06109); [PanoPlane arXiv 2605.14135](https://arxiv.org/pdf/2605.14135); [360-GS arXiv 2402.00763](https://arxiv.org/pdf/2402.00763)

### Inferences
- For OPEN STUDIO the realistic "adopt" option is to let a gallerist or volunteer record a walk-through in Scaniverse/Polycam (or a 360 camera) and ingest the export, rather than relying on ad-hoc photos. That changes the capture protocol, not the viewer.
- Planar-prior research (LighthouseGS, PanoPlane) matches OPEN STUDIO's existing approach (room geometry estimation + planar walls): gallery rooms are nearly ideal "Manhattan" boxes, so plane priors are the right lever for sparse capture.

### Gaps
- No primary-source pricing for KIRI Engine or Jawset Postshot (searches returned nothing); Postshot's licensing for commercial output not confirmed.
- Whether Luma's 3D capture (splat) app is still actively maintained in 2026 is unclear; search results only described its generative-video pricing.
- No public API pricing found for Polycam or Scaniverse; Niantic Spatial's developer platform exists but terms were not retrieved.
- "Apple's own" splat capture: no evidence found of a first-party Apple phone splat capture app (see section 3 for SHARP).
- No independent, quantitative quality test of phone splat apps on flat paintings.

## 2. Web viewers and formats; iPhone Safari performance and memory

### Takeaway
Spark (World Labs, MIT, three.js-native, v2.4.0 Oct 2026) is the natural fit for OPEN STUDIO's three.js viewer; PlayCanvas SOG with LOD streaming is the most mature answer to mobile memory. There is no authoritative published Safari/iOS memory ceiling for splats — it must be measured on device; anecdotal evidence says keep files well under ~100–200 MB and drop spherical harmonics.

### Cited Findings
- Spark: MIT licence, "built by World Labs", reads PLY (incl. compressed), SPZ, SPLAT, KSPLAT, SOG; claims "renders fast even on low-powered mobile devices" and targets 98%+ WebGL2 support; current version 2.4.0. No benchmarks published in README. — [GitHub sparkjsdev/spark](https://github.com/sparkjsdev/spark)
- Spark 2.4.0 (npm, 20 Oct 2026) added SPZ v4 reading. A small test found Spark 2.3.1 works with three.js WebGLRenderer but failed with WebGPURenderer; an SPZ v4 test hit an "Invalid gzip header" error (12k-point scene; not iPhone). — [DEV Community test](https://dev.to/alicia_lu/gaussian-splats-in-threejs-native-renderer-and-spark-tested-3fej)
- Spark fuses splats and meshes in the same three.js scene, supports real-time editing/skeletal animation. — [Radiance Fields: Spark](https://radiancefields.com/platforms/spark); [HN Show HN](https://news.ycombinator.com/item?id=44249565)
- PlayCanvas SuperSplat: <1M Gaussians → single .sog; ≥1M → LOD levels (count halved per level) with lod-meta.json + per-LOD .sog chunks; the viewer raises/lowers LOD with camera movement to stay within a memory budget, including on phones. — [PlayCanvas: Streaming & Performance](https://developer.playcanvas.com/user-manual/supersplat/streaming/); [Generating Streamed SOG](https://developer.playcanvas.com/user-manual/splat-transform/streamed-sog/)
- SOG stores per-Gaussian attributes as quantized WebP textures + meta.json; ~15–20× smaller than PLY (secondhand figure). A commenter cites ~1M Gaussians with full SH in ~14 MB. — [Iconem SOG reference](https://docs.3dtiled.iconem.com/docs/references/3dgs-splats/sog); [PlayCanvas blog: compressing splats](https://blog.playcanvas.com/compressing-gaussian-splats/); [HN](https://news.ycombinator.com/item?id=44249565)
- Anecdote: a large splat failed on mobile Safari; after setting SH bands to 0 and exporting compressed PLY (<60 MB) it loaded. — [PlayCanvas forum](https://forum.playcanvas.com/t/solved-large-3d-gaussian-splatting-file-doesnt-load-on-mobile/38758)
- Unverified claims: PLY fails above ~200 MB on iPhone 15 Pro Safari; SPZ loads 1.5 s vs SPLAT 2.1 s. — [polyvia3d formats](https://www.polyvia3d.com/formats/gaussian-splatting-formats) (unsourced methodology). A viewer comparison claims iPhone 14+ runs 4M-Gaussian scenes at 60 fps in Spark but mis-attributes Spark's authorship, so treat as unreliable. — [Swyvl viewer comparison](https://swyvl.io/blog/best-gaussian-splat-viewers/)

### Inferences
- If OPEN STUDIO adds splats, the safest path is: train with gsplat → convert with PlayCanvas splat-transform to SOG (or SPZ) → render with Spark inside the existing three.js viewer, keeping paintings as separate textured planes (section 5). Target <1M Gaussians / tens of MB per room for iPhone.
- The existing inspection's `phone` check should gain a memory/load-time budget for splat assets if adopted.

### Gaps
- No official WebKit/iOS memory limit for WebGL textures/buffers found; must be measured on a real iPhone.
- No independent benchmark of Spark vs SuperSplat vs mkkellogg GaussianSplats3D vs gsplat.js on iPhone Safari found. (mkkellogg GaussianSplats3D and gsplat.js were not researched in depth this round.)

## 3. Feed-forward / few-image reconstruction (6–20 photos) and generative fill

### Takeaway
Feed-forward models (VGGT, MapAnything, Pi3, MASt3R) can now recover cameras + dense geometry from a handful of unordered photos in seconds — exactly OPEN STUDIO's input — and export COLMAP for splat training. Only two are commercially usable: MapAnything's Apache checkpoint and VGGT-1B-Commercial (application form, no military use). They give geometry, not hallucinated unseen walls; filling unseen areas requires generative tools (World Labs Marble, commercial rights from Pro tier) which would invent content — risky for documenting a real exhibition.

### Cited Findings
- VGGT (CVPR 2025 Best Paper): reconstructs from "one, a few, or hundreds" of views, "typically in less than 1 second". Code licence changed 29 Jul 2025 to commercial-friendly (excluding military). Only the VGGT-1B-Commercial checkpoint may be used commercially; requires an application form (auto-approved, LLaMA-style). Original VGGT-1B stays non-commercial. May 2026 memory fix → 2–3× more frames per GPU; VGGT-Omega released 18 May 2026. — [GitHub facebookresearch/vggt](https://github.com/facebookresearch/vggt)
- MapAnything (Meta/CMU): code Apache 2.0; `facebook/map-anything` weights CC-BY-NC 4.0; `facebook/map-anything-apache` weights Apache 2.0 for commercial use. Accepts images plus optional intrinsics, depth, poses; memory-efficient mode up to 2000 views on 140 GB; exports COLMAP (cameras.bin, images.bin, points3D.bin) and GLB; README shows feeding the COLMAP output directly into gsplat. — [GitHub facebookresearch/map-anything](https://github.com/facebookresearch/map-anything)
- Pi3 (π³): code BSD-3-Clause, weights CC BY-NC 4.0 (non-commercial). — [awesome-3D-vision comparison](https://github.com/gmberton/awesome-3D-vision)
- DUSt3R/MASt3R weights: CC-BY-NC-SA 4.0, non-commercial; commercial product needs a separate agreement (Naver). — [chimitdorzhi.tech summary](https://chimitdorzhi.tech/en/ii-modeli/dust3r/) (secondary; consistent with Naver repos)
- Apple SHARP (single image → 3DGS .ply in <1 s): weights under Apple Machine Learning Research licence (apple-amlr), research-only, excludes commercial products. — [HF apple/Sharp](https://huggingface.co/apple/Sharp/commit/e154a2f6f486de478e485bfbb2fa5a29654e1566); [GitHub apple/ml-sharp](https://github.com/apple/ml-sharp); [Radiance Fields: single-image splatting 2026](https://radiancefields.com/single-image-gaussian-splatting-in-2026-%E2%80%94-triposplat-vs-sharp-vs-trellis)
- World Labs Marble: free plan ~4 worlds/month; Standard $20, Pro $35, Max $95/mo; commercial rights from Pro tier; World API billed via prepaid credits; multi-image input at Standard tier is reported but unconfirmed. — [Skywork: Marble pricing](https://skywork.ai/blog/ai-image/marble-ai-pricing-access); [aitoolsatlas](https://aitoolsatlas.ai/tools/world-labs/pricing); [Sacra: World Labs](https://sacra.com/c/world-labs/)

### Inferences
- Highest-leverage "build" option for OPEN STUDIO's 1-of-3 success rate: replace/augment the current pose+geometry stage with MapAnything-Apache (or VGGT-Commercial) to register sparse photos, then fit the room box and place artworks. This directly attacks the "partial coverage" failure because these models do not need overlapping feature tracks the way SfM does.
- Unseen regions should be filled with neutral procedural wall/floor (as OPEN STUDIO already does) rather than generative fill; generative fill on an exhibition record risks inventing artworks or architecture, a trust/legal issue with artists.
- Fast3R was not checked; licence must be verified before use.

### Gaps
- No published accuracy numbers specifically for 6–20 photos of a gallery room were found.
- Fast3R licence and VGGT-Omega licence not retrieved.
- Marble's exact handling of multi-image real-room reconstruction (fidelity vs invention) not documented in sources found.

## 4. Apple RoomPlan / Object Capture / LiDAR; Matterport; Polycam; 360 cameras

### Takeaway
RoomPlan (LiDAR iPhones) gives a parametric room model with built-in coaching UI and multi-room merge — a strong, free, on-device geometry source but needs a native app. Matterport remains the incumbent for gallery tours (iPhone + Insta360/Ricoh support) but costs scale per hosted space. A 360 camera is the fastest full-coverage capture for a gallery.

### Cited Findings
- RoomPlan: built-in coaching UI, real-time progress, dollhouse view, or fully custom scan guidance. — [Apple: RoomPlan](https://developer.apple.com/augmented-reality/roomplan)
- Multi-room capture and merging (StructureBuilder, relocalization via ARWorldMap) since WWDC23. — [WWDC23 session 10192](https://developer.apple.com/fr/videos/play/wwdc2023/10192/)
- iOS 26 RoomPlan developer reports of errors (worldTrackingFailure, exceedSceneSizeLimit); no official iOS 26 change found. — [Apple Developer Forums](https://origin-devforums.apple.com/forums/tags/room-plan)
- Matterport Capture launched on iOS first, expanded to iPhone cameras and LiDAR; Android GA works with Matterport cameras and six Insta360/Ricoh 360 cameras. Compatible list includes Insta360 ONE X/ONE R (360 module only)/ONE X2, Ricoh Theta Z1/V/SC2. — [Matterport blog: Android](https://matterport.com/blog/matterport-capture-app-android-officially-here); [Matterport: Insta360 ONE R](https://matterport.com/ja/blog/its-official-compatibility-insta360-one-r-coming); [ShopTalk transcript](https://www.wegetaroundnetwork.com/topic/13821/transcript-matterport-shoptalk-14-matterport-betas-for-android-and-ios/) (sources date from 2020–21)
- Matterport pricing (secondhand, conflicting): Starter ~$12/mo annual; Professional $58/mo, ~$69/mo, or $90–108/mo depending on source; extra hosting ~ $20/mo per active space in one source; pro capture sessions $300–1,500. — [sofabrain](https://sofabrain.com/learn/matterport-pricing/); [tourready](https://tourready.ai/compare/polycam-vs-matterport); [SkyeBrowse](https://www.skyebrowse.com/news/posts/polycam-vs-matterport)
- 360 camera = best for covering a whole room quickly (~€550–850). — [ar-go](https://ar-go.co/blog/gaussian-splatting-capture-tools/)

### Inferences
- A RoomPlan-based native capture (or exporting RoomPlan USDZ from Polycam Room Mode) could hand OPEN STUDIO exact wall planes, solving geometry without inference; it requires LiDAR iPhones (Pro models) and is not available to a PWA.
- Matterport's per-space hosting model is expensive for many short-lived exhibitions — a positioning gap for OPEN STUDIO.

### Gaps
- Matterport's official 2026 pricing page could not be fetched (network blocked); Matterport's own 2026 splat/AI features not verified.
- No data on what share of Israeli gallerists/artists own LiDAR iPhones.
- Apple Object Capture (object-level photogrammetry on Mac/iOS) not researched in depth; it is for objects, not rooms.

## 5. Guided capture UX (coverage feedback, AR overlays)

### Takeaway
Leaders use real-time coaching and explicit coverage rules: RoomPlan shows live progress and coaching; Zillow mandates fixed camera height (~5 ft) and at least one panorama per space. OPEN STUDIO's partial-coverage failures are a capture-protocol problem as much as an algorithm problem.

### Cited Findings
- RoomPlan provides built-in coaching UI and real-time scanning progress feedback; devs can customise guidance. — [Apple: RoomPlan](https://developer.apple.com/augmented-reality/roomplan)
- Zillow 3D Home capture guide (July 2024): consistent ~5 ft (60 in) camera height, every space must be captured, minimum one panorama per space, hidden spaces can be captured and hidden later. — [Zillow Capture Guide PDF](https://delivery.digitalassets.zillowgroup.com/api/public/content/CaptureGuide2023.pdf)
- Splat quality depends on walking slowly and operator patience. — [ar-go](https://ar-go.co/blog/gaussian-splatting-capture-tools/)

### Inferences
- A lightweight in-app shot list ("stand in each corner, shoot the opposite wall; one frontal shot per artwork; one doorway shot") with a per-wall checklist would likely raise the success rate more cheaply than new models; with VGGT/MapAnything running server-side, coverage could even be checked live after upload.

### Gaps
- Polycam, Luma and Matterport iPhone coaching UI details were not retrieved from primary sources this round.

## 6. Colour fidelity of artworks

### Takeaway
Splats and photogrammetry bake view-dependent glare and lighting into colour; museums solve this with controlled, cross-polarized lighting and dedicated high-res artwork imaging (e.g. Google Art Camera). OPEN STUDIO's approach — separate high-res artwork images composited onto planes — is aligned with professional practice and should be kept even if splats are adopted for the room.

### Cited Findings
- Cross-polarized photogrammetry removes reflections from glossy heritage objects (varnish/glaze speculars are polarized, diffuse returns unpolarized); a 2026 ISPRS museum workflow uses a polarized ring light plus lens polarizer for uniform, glare-free illumination. — [ISPRS 2026 paper](https://isprs-archives.copernicus.org/articles/XLIX-B2-2026/869/2026/); [ISPRS 2024 paper](https://isprs-archives.copernicus.org/articles/XLVIII-2-W8-2024/371/2024/)
- Gaussian splatting captures view-dependent effects (reflections etc.); one 2024 study says it reduces reflection artifacts; Magnopus found highly reflective/curved surfaces work poorly and recommends cross-polarized capture. — [ISPRS 2024](https://isprs-archives.copernicus.org/articles/XLVIII-2-W8-2024/371/2024/); [Magnopus: Allee Willis House](https://www.magnopus.com/blog/lessons-in-gaussian-splats-from-the-allee-willis-house)
- Sketchfab guidance on capturing reflective objects in 3D (polarizers, diffuse light). — [Sketchfab blog](https://sketchfab.com/blogs/community/capturing-reflective-objects-in-3d)
- Google Art Camera: robotic camera captures hundreds–thousands of close-ups, laser/sonar focus, stitched into a gigapixel image; a 1×1 m painting takes ~30 min; Google built 20 units lent free to museums (2016 data). — [PetaPixel](https://petapixel.com/2016/05/17/google-developed-gigapixel-camera-preserving-works-art/); [Engadget](https://www.engadget.com/2016-05-17-google-gigapixel-art-camera.html); [TechCrunch](https://techcrunch.com/?p=1323168)

### Inferences
- Recommended hybrid: room = splat or reconstructed box (atmosphere, light); artworks = artist-supplied or frontal high-res, colour-managed images on planes. This also gives artists control over how their work is represented.
- Glazed/glass-framed works will show reflections in any splat; masking artwork regions out of the splat and replacing with the plane avoids double images.

### Gaps
- No quantitative colour-accuracy (ΔE) comparison of splats vs photos for paintings found.
- Current status of the Art Camera loan program (post-2016) not verified.

## 7. Cloud GPU cost per scene

### Takeaway
Per-scene GPU cost is small: a room splat trains in roughly 10–30 min on one GPU, and A100/H100 rent for ~$1.4–4/h, so ~ $0.5–2 per scene in compute; feed-forward pose/geometry (VGGT/MapAnything) adds seconds.

### Cited Findings
- RunPod (Aug 2026): H100 PCIe $2.89/h, H100 SXM $2.99/h, A100 SXM $1.49/h Secure, $1.39/h Community; March 2026 roundup: H100 80GB $2.39/h Secure, $1.80–2.10/h Community. RunPod bills per minute. — [Spheron: RunPod vs Lambda 2026](https://www.spheron.network/blog/runpod-vs-lambda-labs-2026/); [Spheron: RunPod H100 pricing](https://www.spheron.network/blog/runpod-h100-pricing-2026/); [tech-insider](https://tech-insider.org/runpod-vs-lambda-vs-vast-ai-2026/)
- Lambda: H100 SXM $3.99–4.29/h (Aug 2026) vs ~$2.49/h (May 2026 roundup) — conflicting; A100 $1.99/h; hourly billing. — [Spheron](https://www.spheron.network/blog/runpod-vs-lambda-labs-2026/); [deploybase](https://deploybase.ai/articles/lambda-labs-gpu-pricing)
- gsplat: up to 4× less GPU memory and up to 15% less training time than the official implementation, same quality. — [GitHub nerfstudio-project/gsplat](https://github.com/nerfstudio-project/gsplat)
- Room training ~15 min on one GPU (430 images). — via [ar-go](https://ar-go.co/blog/gaussian-splatting-capture-tools/)
- VGGT reconstruction < 1 s per scene. — [VGGT GitHub](https://github.com/facebookresearch/vggt)

### Inferences
- The cost estimate (~$0.5–2/scene) is derived from the above, not a quoted figure. GitHub Actions runners (OPEN STUDIO's current server) have no GPU; a GPU step would need RunPod/Lambda/Modal or similar.

### Gaps
- No direct benchmark of per-scene training time on H100 vs A100 for an indoor gallery.

## 8. Art platforms using splats; licence status of key splat code

### Takeaway
Splat tours of art spaces exist mainly as one-off heritage/museum projects; no major gallery platform (Artland, Vortic) was found to use splats. Legally: the Inria reference code (and its CUDA rasterizer submodules) is non-commercial; gsplat (Apache 2.0), Spark (MIT), PlayCanvas tools are the commercial-safe stack.

### Cited Findings
- Inria `gaussian-splatting` licence: non-commercial (research/evaluation) only; commercial use needs prior written consent (stip-sophia.transfert@inria.fr); derivatives must keep the non-commercial limitation; diff-gaussian-rasterization submodule carries the same terms. — [ScanCode LicenseDB: gaussian-splatting-2024](https://scancode-licensedb.aboutcode.org/gaussian-splatting-2024.html); [diff-gaussian-rasterization LICENSE](https://dagshub.com/camenduru/diff-gaussian-rasterization/src/main/LICENSE.md)
- Even an MIT viewer requires separately considering how the PLY files were trained. — [UnityGaussianSplatting note](https://awesome.ecosyste.ms/projects/github.com%2Faras-p%2FUnityGaussianSplatting)
- gsplat licence: Apache 2.0; README says "inspired by" the Inria paper (no statement of included Inria code). — [GitHub gsplat](https://github.com/nerfstudio-project/gsplat)
- Spark: MIT. — [GitHub spark](https://github.com/sparkjsdev/spark)
- Splat use in museums/exhibitions: LWL Open-Air Museum Detmold installation (Unreal, mid-2026); a two-week Olympic "Clubhouse 26" exhibition preserved as a navigable splat; Virtual Museum of Geology Iași (Unity, open source); Grace Cathedral browser tour (July 2026). — [Volinga](https://web.volinga.ai/students-create-digital-museum-experience-with-gaussian-splatting/); [GitHub Virtual-Museum-of-Geology](https://github.com/aapopei/Virtual-Museum-of-Geology); [aitoolly: Grace Cathedral](https://aitoolly.com/ai-news/article/2026-07-20-immersive-gaussian-splat-tour-of-grace-cathedral-in-san-francisco-debuts-on-hacker-news); [utsubo guide](https://www.utsubo.com/blog/gaussian-splatting-guide)
- A museum virtual-tour provider offers a 3DGS preview alongside Matterport. — [mused.org](https://mused.org/about-virtual-tours)
- Vortic Curate: subscription for galleries; spaces captured photogrammetrically with high-res 3D scanning; artworks as 2D images or 3D scans inserted, then lighting added by Vortic's pipeline (2020-era). Artland: 3D exhibition views and guidance on scanning. V21 Artspace uses Matterport + CGI. — [Artnet](https://news.artnet.com/art-world/new-extended-reality-app-1812807); [madeinbed interview](https://madeinbed.co.uk/interviews/anindya-sen-in-conversation-with-nick-walter-ceo-of-vortic); [V21 Artspace](https://v21artspace.com/3d-virtual-exhibitions); [The Art Newspaper](https://www.theartnewspaper.com/2020/10/30/the-model-challenge-how-to-capture-art-in-3d-for-augmented-and-virtual-reality)

### Inferences
- Vortic's 2020 model (scan room + insert separate artwork images + relight) is structurally the same as OPEN STUDIO's — validation of the hybrid, and a reminder the differentiator must be phone-only capture speed and cost.
- Commercial-safe pipeline: MapAnything-Apache / VGGT-Commercial → gsplat (Apache) → splat-transform SOG → Spark (MIT). Avoid any Inria-derived rasterizer, MASt3R/DUSt3R/Pi3 default weights, and Apple SHARP in production.

### Gaps
- Whether Artland or Vortic currently (2026) use splats or Matterport could not be confirmed; Vortic's operating status unclear.
- No Sketchfab/Polycam gallery-of-exhibitions examples were retrieved with specifics.
- gsplat dependency tree not audited for Inria-licensed code.
