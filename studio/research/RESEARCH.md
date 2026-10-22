# Studio — Research Report

Elad Amsalem Studio · October 2026 · Working name: Studio

This report covers four questions:

1. What already exists that resembles the idea, and where the gap is.
2. What we can learn from what worked and what failed.
3. What quality of artwork documentation and 3D the platform can and should require.
4. What the market context says about launching without sales.

Sources are listed at the end. Where sources disagreed or were weak, it is said in the text.

---

## 1. The landscape

The idea combines five things: an artist-owned profile, an always-open digital exhibition, a following graph, discovery of physical shows by city, and curated editorial exhibitions. Every one of these exists somewhere. No product found combines them around the artist.

### 1.1 Marketplaces and databases (gallery-centric)

| Product | What it is | Relevance | Gap vs. Studio |
|---|---|---|---|
| **Artsy** | The largest online art marketplace and database. Works from 4,000+ galleries and auction houses in 100+ countries. The app lets you follow artists and galleries and notifies you about new works. Earlier versions had a City Guide. | Closest on the *following* model and on the structured artwork record (medium, dimensions, availability). | The profile is assembled from gallery listings. The artist doesn't own it. The aim is to sell. There is no exhibition space. |
| **Ocula** | A platform and magazine for contemporary art, a gallery network, and advisory services. It launched Viewing Rooms in 2020, which run for a limited time like a physical show. | Editorial quality. Its viewing rooms proved that "time-limited online exhibition" is a format people understand. | Built around galleries and collectors. Viewing rooms are sales tools. |
| **Saatchi Art, Singulart** | Marketplaces where artists sell directly. Singulart uses an admission committee of art professionals, who look at recognition (exhibitions, sales) and artistic quality. | Singulart shows a *curated-membership* model that artists accept. | Shops. Works appear as products with prices. Singulart is criticised by artists over a ~50% commission. |

### 1.2 3D / virtual exhibition tools

| Product | What it is | Relevance | Gap |
|---|---|---|---|
| **Artland** | An app with 3D tours of real gallery exhibitions, recorded on site by a professional team. Self-serve VR editor (upload JPGs, hang on a grid, "a show in 30 minutes"). Gallery tiers from about €10 to €375/month. Claims 3,500+ shows recorded in 3D. | The nearest thing to "a digital afterlife for physical shows". | The customer is the gallery, show by show. There is no artist network or following graph. Captured shows can't be edited afterwards. |
| **Kunstmatrix** | Berlin SaaS for building 3D virtual exhibitions, with AR and CRM. Plans are tiered by number of artworks and public exhibitions (Starter: 10 works, no public shows; Professional: 500 works, 50 shows). Launched KUNSTMATRIX.EDU in 2026. | Proves artists will build 3D shows themselves if the tool is simple. | A tool, not a destination. No audience, discovery, or profile. A reviewer notes that interest in 3D galleries peaked during lockdowns. |
| **Artsteps** | A free browser-based 3D gallery builder that also works on mobile and has VR support. It ranks well in 2026 software lists. | Free and accessible. | Reviewers call it "a mishmash of functions that almost work". Building a space is fiddly. No audience. |
| **Vortic** | XR platform for galleries (Vortic Collect AR app, Vortic VR on Quest), founded by Oliver Miro. | Showed that 3D-scanned works and VR viewing are technically possible. | Aimed at blue-chip galleries and collectors. Current status unclear; there was little news after early 2024. |
| **New Art City, Spatial, Oncyber** | Virtual exhibition toolkits, mostly for digital and NFT art. | Showed how far a free-form virtual space can go. | Digital-native work, not physical works. Spatial has moved toward live events. Oncyber's parent company was reportedly dissolved around the end of 2024. |
| **Matterport** | The standard tool for scanning real interiors, which museums used for tours during COVID. | Real-space capture. | Navigation jumps between fixed points. Generic real-estate look. |

### 1.3 Discovery of physical shows

| Product | What it is | Gap |
|---|---|---|
| **ArtRabbit** | Listings of contemporary exhibitions worldwide, with maps and self-guided walking tours. | Covers *where*, not *who*. No artist profile or portfolio. Users have asked for radius search. |
| **See Saw** | iPhone gallery guide for NY, LA, Berlin, London and Paris, with a map of current shows and press releases. | A one-person product. Reviews say it is comprehensive but sometimes out of date. Galleries only. |
| **Smartify, Bloomberg Connects** | Museum guides. Bloomberg Connects covers 1,000+ institutions in 300+ cities and is free to institutions because Bloomberg Philanthropies funds it. | Built around institutions, not living artists. Its funding model is relevant to us (see §4). |

### 1.4 Social and portfolio platforms

| Product | What it is | Gap |
|---|---|---|
| **Instagram** | Where most artists actually show work today. | An algorithmic feed. Square crops, no dimensions, no exhibition context. Meta's AI-training policy pushed artists away in 2024. |
| **Cara** | A social network and portfolio for artists. It grew from 40k to 650k users in one week (June 2024), later passing 1M. It filters AI images with Hive, integrates Glaze, and is run by volunteers on donations (a $96k server bill during the spike). | Proves demand. Artists will move for a platform that respects their work. It is still a feed, though, and mostly illustration and concept art, not exhibiting fine artists. |
| **Behance, ArtStation** | Portfolios for design and entertainment art. | Commercial creative work. |
| **Artwork Archive** | Inventory software and a portfolio site for artists, from about $6–8/month. | Back-office. No audience. |

### 1.5 The model we borrow: Spotify

- **The artist owns the profile.** Spotify for Artists is free. The artist edits the profile, sees statistics, and lists events (Spotify added virtual and physical event listings to profiles).
- **Three ways to be discovered:** editorial playlists, algorithmic recommendations, and fans following artists.
- **A warning:** Editorial influence fell once Spotify shifted toward algorithmic and paid placement (Discovery Mode, which is now the subject of a 2025 class action alleging pay-for-play). For Studio, *curation must stay editorial and never be paid*. Trust is the product.

### 1.6 The gap, in one sentence

Galleries have Artsy, Artland and Ocula. Museums have Bloomberg Connects. Illustrators have Cara. **The individual exhibiting artist has no home of their own that shows the work the way an exhibition does and that the audience can follow.**

---

## 2. Lessons

### 2.1 Why virtual exhibitions faded after 2020

No study shows that virtual exhibitions "failed". Interest clearly peaked during lockdowns, and reviewers now mention fatigue. The reasons the research does give:

- **Too passive.** Online tours "often suffer from being too passive and lack in-depth interactivity". Engagement depends on how the architectural space is represented, how the artifacts are represented, and how easy the tour is to use.
- **Bad navigation on phones.** Free walking with joysticks or WASD keys, slow loading, and dizziness.
- **They copied the gallery instead of improving on it.** You see the work smaller and worse than in a good photo.
- **No reason to come back.** The show was a one-off event and nobody followed anything.

**What this means for Studio:**

1. **The space must never be worse than a good photo.** Every work opens to a full-screen, deep-zoom view.
2. **Guided movement, not walking.** Tap to go to the next work, like skipping to the next track. Free look is optional.
3. **Mobile first, fast first.** A 2D "walkthrough" (a sequence of installation views) loads instantly. The 3D space loads progressively. VR is a bonus on Quest and Vision Pro, not the core.
4. **The reason to return is the artist.** Following, "new on view" notices and openings near you, not the space itself.
5. **Short shows.** About 6–20 works, roughly a 5–10 minute visit.

### 2.2 Curated membership works if it's transparent

Singulart, juried shows and residencies show that artists accept selection when the criteria are clear and the fee isn't predatory. Cara shows that a community grows fast when the platform takes the artists' side (no AI training, no AI images).

### 2.3 Editorial must stay editorial

From Spotify: once curation can be bought, it loses value for both audience and artists.

---

## 3. Quality: what the platform can show and what it should require

### 3.1 Benchmarks

- **Museum digitisation (FADGI / ISO 19264).** Quality is graded in "star" levels. Colour accuracy is measured as ΔE 2000 against a colour target. At the top levels the averages are around ΔE ≤ 2–3, but sources differ by edition, so check the current FADGI document before quoting numbers. Images must be shot square to the work (±1°), with no software de-skew. FADGI itself warns that 4-star is only for the most sophisticated setups.
- **Google Art Camera.** Gigapixel scans stitched from hundreds of robotic close-ups. A 1 m × 1 m painting takes about 30 minutes. This is the ceiling for deep zoom, not something to ask of artists.
- **Professional art reproduction practice.** Two or more lights at 45°, cross-polarisation (polarising film on the lights, a polariser on the lens) to remove glare from oil and varnish, custom white balance, a tripod, and a colour target. Trade-off: cross-polarisation can flatten impasto, so add a raking-light detail shot to show texture.

### 3.2 Proposed Studio standard: three levels

| Level | Who / when | 2D works (painting, drawing, print, photo) | 3D works (sculpture, ceramics, objects) | Video |
|---|---|---|---|---|
| **Accepted** (minimum to be approved) | Every work | Straight-on, cropped to the edge of the work, even light, no glare. ≥ 3,000 px on the long edge. sRGB with an embedded profile. Real dimensions, medium, year, and where the work is (city). | 4 views (front, back, two sides) on a neutral ground, ≥ 3,000 px. Dimensions and materials. | ≥ 1080p, H.264/ProRes master, stereo audio, duration, installation notes. |
| **Studio Standard** (the target; needed for the live exhibition) | Works shown in the 3D space | ≥ 6,000 px long edge. Colour-checked (ColorChecker in a reference frame). Cross-polarised for glossy surfaces. 16-bit TIFF or max-quality JPEG master. Plus 2 detail shots (one in raking light). | 36-frame turntable (10° steps), *or* a 3D capture: photogrammetry → glTF/USDZ mesh for AR, and/or Gaussian splat (SPZ) for photoreal viewing. Black surroundings and the piece raised off the table for glossy glazes. | 4K master, colour-graded, loudness-normalised. |
| **Archive / Museum** (optional, for key works) | Flagship works, institutions | Multi-shot stitched deep zoom (10,000–30,000 px) at FADGI-like colour accuracy, done by a reproduction photographer. | Laser or structured-light scan + photogrammetry texture. | Lossless master. |

**Installation views** of physical exhibitions are a separate media type: wide, level verticals, at least 3–6 per show, credited to the photographer. Your Jerusalem Artists' House photos (by Elad Sarig) are exactly this.

### 3.3 How the platform delivers it

- **Images:** AVIF with a JPEG fallback (AVIF has about 93% browser coverage in 2026). Deep-zoom tiles (IIIF-style) for every Studio Standard work. Display P3 where the master has it.
- **No HDR for artworks.** HDR and gain-map support across browsers is still inconsistent, with different standards from Apple and ISO. Artwork fidelity matters more than punch. Use SDR-accurate masters, and revisit later.
- **3D spaces:** three.js. Gaussian splats via Spark, which streams large splat scenes to phones and VR over WebGL2 and reads SPZ (about 90% smaller than PLY). three.js r186 also added native splat loading.
- **Meshes for AR:** glTF for the web and Android, USDZ for iOS AR Quick Look. Splats don't work in Quick Look, so a sculpture needs a mesh for AR.
- **VR:** WebXR. Meta Quest Browser has the strongest support. Vision Pro Safari supports immersive VR, but not AR. iPhone and Mac Safari have no WebXR. So VR is progressive enhancement only.
- **Real spaces:** a physical show can be captured as a Gaussian splat with a phone (for example Scaniverse, free and processed on the device). Splat tours allow continuous movement, unlike Matterport's jump-between-points model. This lets Studio give **every physical exhibition a digital afterlife** without Artland's on-site team.

### 3.4 Authenticity: "the work exists in the world"

Proposed checks, from light to strict:

1. **Required metadata:** dimensions, medium, year, current location (city), and edition for multiples.
2. **Studio photo:** one photo of the artist with the work, or the work in the studio. It is not shown publicly; reviewers use it.
3. **Automated screening:** AI-image detection (as Cara does with Hive), duplicate and reverse-image search, resolution and profile checks.
4. **Human review** by the curatorial team for every work.
5. **Optional:** C2PA Content Credentials. Leica, Sony and Nikon cameras now sign images, but no camera had passed C2PA conformance by 2026 and editing tools can break the chain. Use it as a trust badge, never a requirement.

---

## 4. Market context and the "no sales" decision

- Global art sales were **$59.6B in 2025** (+4%). **Online sales fell to $9.2B, 15% of the market, the lowest since 2019** (down from a 25% peak in 2020). Fairs grew to 35% of dealer sales. *(Art Basel & UBS Art Market Report 2026)*
- Online-only sales stay important for **new buyers**.

**What this means:** another place to *buy* art online isn't what's missing. Discovery and presence are, along with a path from a phone to a physical encounter. Launching without sales is a strength, not a compromise:

- It removes the conflict of interest. The curation is about the art, not about what sells.
- Artists who are represented by galleries can join without competing with their gallery.
- It keeps Studio closer to a museum or magazine than to a shop.

**Funding without sales (for later):**

- **Philanthropic or institutional funding.** Bloomberg Connects is free for institutions because a foundation funds it.
- **Cultural grants** for the pilot.
- **Paid tools for institutions** (galleries, festivals, art schools) to host exhibitions inside Studio.
- **An optional artist "Pro" tier** (for example professional capture and archive storage). This must never buy visibility.

Sales can come later as an *inquiry → gallery/artist* referral, not a checkout.

---

## 5. Your starting point (measured)

- **95 images** on eladamsalem.com. **Every one is capped at 2,000 px on the long edge.** None meets the proposed Studio Standard (6,000 px), and none meets the Accepted minimum (3,000 px) in the form it has on the site. Masters may exist on your drive or with the photographers.
- 86 of 95 have an embedded colour profile.
- Exhibition records exist with texts and installation views for *Ritual* (Jerusalem Artists' House, 2026), *Nature of Man* (Nulobaz, 2022) and the BFA show (Shenkar, 2019).
- Your work mixes media: oil, ink, ceramics, and frayed edges as "grounding wires". This supports treating medium as a **tag**, not a category that boxes the artist.

---

## Sources

- Artsy — https://www.artsy.net/ · App Store listing https://apps.apple.com/us/app/artsy-discover-buy-fine-art/id703796080 · Google Play https://play.google.com/store/apps/details?id=net.artsy.app
- Artland — https://partners.artland.com/what-is-artland-3d/ · https://magazine.artland.com/3dshowcases/ · https://www.artland.com/partners/vr · Artnet https://news.artnet.com/art-world/new-app-lets-users-explore-art-galleries-virtual-3d-never-leave-house-art-1494718
- Kunstmatrix — https://www.kunstmatrix.com/en/info/about · pricing FAQ https://www.kunstmatrix.com/en/info/faqs/what-are-the-pricing-details-for-the-3d-online-gallery · review https://creatoreconomytools.com/tool/kunstmatrix
- Artsteps / virtual galleries — https://uva.theopenscholar.com/vrc/virtual-galleries · https://zipdo.co/best/3d-virtual-art-gallery-software
- Vortic — https://www.theartnewspaper.com/review/vortic-collect-review · https://mirl.arthistory.ucsb.edu/?p=10619
- Ocula — https://ocula.com/magazine/art-news/ocula-launches-online-viewing-rooms/ · https://www.cbinsights.com/company/ocula
- Singulart — https://en.wikipedia.org/wiki/Singulart · https://www.onlinegallery.com/art-marketplaces/singulart
- New Art City https://newart.city/ · Spatial https://www.spatial.io/blog/spatial-virtual-nft-galleries · Oncyber status https://nostromophoto.com/best-3d-virtual-gallery-2026-review/
- ArtRabbit — https://play.google.com/store/apps/details?id=com.artrabbit.arnativeapp
- See Saw — https://apps.apple.com/us/app/see-saw-gallery-guide/id791643418 · https://www.surfacemag.com/articles/see-saw-literally-puts-galleries-on-the-map/
- Smartify — https://mymodernmet.com/cool-art-app-smartify/ · Bloomberg Connects https://bloombergconnects.org/faq · https://apps.apple.com/us/app/connects-arts-culture/id1476456847
- Cara — https://techcrunch.com/2024/06/06/a-social-app-for-creatives-cara-grew-from-40k-to-650k-users-in-a-week-because-artists-are-fed-up-with-metas-ai-policies/ · https://en.wikipedia.org/wiki/Cara_(app) · https://apps.apple.com/app/id6450934458
- Artwork Archive — https://www.capterra.com/p/169087/Artwork-Archive/
- Spotify — https://artists.spotify.com/en/blog/making-the-most-of-your-artist-profile-on-spotify · events https://techcrunch.com/?p=2046958 · editorial https://entertainment.slashdot.org/story/24/01/05/2152237/spotifys-editorial-playlists-are-losing-influence-amid-ai-expansion · Discovery Mode lawsuit https://newindustryfocus.com/articles/spotify-faces-class-action-lawsuit-alleging-pay-for-play-discovery-mode
- Virtual exhibition engagement — https://researchgate.net/publication/352906578 · https://today.usc.edu/virtual-art-museum-tours-exhibitions-after-covid-pandemic/
- FADGI — https://www.digitizationguidelines.gov/guidelines/FADGI%20Technical%20Guidelines%20for%20Digitizing%20Cultural%20Heritage%20Materials_3rd%20Edition_05092023.pdf · overview https://heritage-digitaltransitions.com/digitization-program-planning/overview-of-fadgi-metamorfoze-guidelines/
- Cross-polarisation — https://www.easy-oil-painting-techniques.org/photograph-art.html · https://danjohnsonart.co.uk/2021/06/05/the-life-changing-magic-of-cross-polarization/
- Ceramics / 360 — https://www.thephotoforum.com/threads/photographing-reflective-glass-ceramic-artwork.115009 · https://www.webrotate360.com/blog/2011/eliminate-reflections-in-your-360-product-photography-projects.aspx
- Google Art Camera — https://petapixel.com/2016/05/17/google-developed-gigapixel-camera-preserving-works-art/
- Gaussian splatting — https://www.utsubo.com/blog/gaussian-splatting-guide · https://ar-go.co/blog/gaussian-splatting-platforms/ · https://ics.media/en/entry/260917/ · Spark 2.0 https://x.com/sparkjsdev/status/2044090505982816449
- Photogrammetry vs splats — https://www.nature.com/articles/s40494-025-02063-5 · https://isprs-archives.copernicus.org/articles/XLIX-B2-2026/451/2026/isprs-archives-XLIX-B2-2026-451-2026.pdf · Matterport comparison https://www.thefuture3d.com/blog/gaussian-splatting-vs-matterport
- WebXR — https://threejsresources.com/webxr/browsers · https://www.testmuai.com/learning-hub/webxr-compatible-browsers/
- Image formats — https://blog.openreplay.com/jpeg-xl-vs-avif/ · https://bugs.webkit.org/show_bug.cgi?id=270981
- C2PA — https://en.wikipedia.org/wiki/Content_Credentials · https://www.digitalcameraworld.com/cameras/these-are-the-best-c2pa-cameras-that-add-content-credentials-to-your-images-for-every-photographer-tired-of-the-question-is-this-ai
- Getty AAT — https://www2.archivists.org/groups/standards-committee/art-architecture-thesaurus-aat
- Art market — https://www.artbasel.com/stories/the-art-basel-and-ubs-global-art-market-report-2026?lang=en

---

## 6. Infrastructure and running costs (added Oct 2026)

Public list prices (2026, third-party confirmations where the official page wasn't reachable):

- **Cloudflare R2:** $0.015/GB-month, Class A $4.50/M, Class B $0.36/M, **egress free**. Free tier: 10 GB, 1M A, 10M B. (filebase.com, mecanik.dev)
- **Cloudflare Images:** 5,000 transformations free, then $0.50 per 1,000. (developers.cloudflare.com/images/pricing)
- **Cloudflare Stream:** $5 per 1,000 minutes stored, $1 per 1,000 minutes delivered. Encoding and ingress are free. (developers.cloudflare.com/stream/pricing)
- **Mux:** storage from about $0.0024–0.003/min-month, 100k free delivery minutes, then about $0.0008–0.001/min. Sources differ.
- **Supabase Pro:** $25/month plus compute. Includes about 8 GB DB and 100 GB storage. Sources disagree on MAU and egress. Real small apps land at $35–75/month.
- **Mapbox:** 50,000 free web map loads/month, then about $5 per 1,000. The MapLibre renderer is free.
- **Hive AI-image detection:** about $6 per 1,000 images (one source says $3).
- **Apple Developer:** $99/year. **Google Play:** $25 once.
- **Online art sales (context):** $9.2B, 15% of the market (Art Basel & UBS 2026).

The cost model is in `cost_model.py`. Its main conclusion is that cloud costs stay small, from $0 for the pilot to about $1,800/month at 5,000 artists and 150,000 monthly users, as long as egress is free. People (curatorial review, a 3D artist, capture days) are the main cost.

### Realism of the space: sources

- Hanging height: a 57–60 in (145–152 cm) centre line is common gallery practice (several hanging guides; no primary museum standard found).
- Lighting: 100–200 lux for oil paintings and 30–50 lux for works on paper (conservation paper, doi:10.1093/ijlct/ctag077). 2700–3000 K and CRI ≥ 90 are typical in galleries (vendor sources).
- Tone mapping: Khronos PBR Neutral for true-to-life colour (khronos.org press release; supported in three.js).
- Light baking: Blender Cycles lightmaps into three.js via the second UV set (three.js forum).
- Splat sizes: SPZ is about 10× smaller than PLY (about 25 MB vs 250 MB for a rich scene). Memory, not download size, limits mobile (PlayCanvas forum). LoD streaming is in Spark 2.0 and Cesium 3D Tiles.

Additional sources:

- https://filebase.com/blog/cloudflare-r2-pricing-costs-savings-and-alternatives-in-2026/
- https://developers.cloudflare.com/stream/pricing/index.md
- https://developers.cloudflare.com/images/pricing/index.md
- https://www.mux.com/docs/pricing/video
- https://makerkit.dev/blog/md/saas/supabase-pricing
- https://agentdeals.dev/vendor/mapbox
- https://fast.io/resources/hive-moderation-ai-detector-review-2026/
- https://studio.adalo.com/blog/apple-developer-program-guide
- https://www.khronos.org/news/press/khronos-pbr-neutral-tone-mapper-released-for-true-to-life-color-rendering-of-3d-products
- https://discourse.threejs.org/t/how-to-setup-lightmap-bake-from-blender-to-gltf/34924
- https://scaniverse.com/spz
- https://forum.playcanvas.com/t/solved-large-3d-gaussian-splatting-file-doesnt-load-on-mobile/38758
- https://doi.org/10.1093/ijlct/ctag077
- https://www.austingallery.org/blog/how-high-to-hang-art
- https://blog.codercops.com/blog/progressive-web-apps-2026
