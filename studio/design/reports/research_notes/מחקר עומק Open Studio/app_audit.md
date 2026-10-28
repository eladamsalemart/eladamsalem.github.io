# OPEN STUDIO app audit: product, QA, UX, performance, accessibility, PWA, SEO, data and code health (hands-on, 2026-10-28)

Method: read-only. Live site measured at **https://eladamsalem.com/open-studio/** (the task brief's `eladamsalem.github.io/open-studio/` returns GitHub's 404 "Site not found": the repo's `CNAME` on `main` is `eladamsalem.com`, so the github.io address redirects nowhere useful). Source read on branch `studio` (`studio/app/`). Tools: Playwright Chromium (iPhone emulation 390×844, `isMobile`, `hasTouch`, `deviceScaleFactor: 3`, iOS Safari UA), axe-core 4.10.2 (WCAG 2 A/AA + 2.1 A/AA tags) on **all 149 reachable routes**, Lighthouse 12.2.1 mobile (home only), CDP throttling (150 ms RTT, 1.6 Mbit/s down, 4× CPU, i.e. Lighthouse's "Slow 4G" profile), offline emulation. Note that this is Chromium emulating an iPhone, not WebKit on a real iPhone: Safari-specific behaviour (WebGL memory limits, Add to Home Screen, `navigator.standalone`) is not proven by these runs.

Evidence lives in the scratch folder `/tmp/claude-0/-home-user-eladamsalem-github-io/b4a21524-d13a-59d4-b623-d70fcd9daca4/scratchpad/audit/` (called `AUDIT/` below): `AUDIT/shots/*.png` (viewport 1170×2532 and `*_full.png` full-page), `AUDIT/sheet1.png` (contact sheet of 12 routes), `AUDIT/audit_all.json` (per-route metrics + axe), `AUDIT/perf.json`, `AUDIT/lh__.json` (Lighthouse), `AUDIT/space_fast.txt`, scripts `discover.js`, `audit_all.js`, `perf.js`, `space.js`, `offline.js`, `kb.js`, `demo.js`. The scratch folder is temporary; copy anything the final report needs.

Source references are `file:line` on branch `studio`, relative to `studio/app/`.

## Ranked findings (summary for the fix backlog)

| # | Severity | Finding | Evidence |
|---|---|---|---|
| 1 | **Critical** | The Map page shows no map: every base-map tile is CARTO's "API KEY REQUIRED / carto.com/basemaps/apikey" placeholder. Pins float on a blank grey-white grid with diagonal watermarks. | `AUDIT/shots/map.png`, `AUDIT/shots/map_low-tide-haifa.png`, `AUDIT/tile.png` (a tile fetched with curl, HTTP 200, 256×256 watermark image); code `app.js:510` hot-links `https://{a-d}.basemaps.cartocdn.com/light_all/...` with no key |
| 2 | **Critical** (launch blocker, by design today) | The whole site is excluded from search engines: `<meta name="robots" content="noindex, nofollow">` on the only HTML page. Lighthouse SEO 58/100 ("is-crawlable" fail, "meta-description" fail). `sitemap.xml` has 0 `open-studio` URLs. | `index.html:6`; `AUDIT/lh__.json`; `curl https://eladamsalem.com/sitemap.xml \| grep -c open-studio` → 0 |
| 3 | **High** | No real onboarding for artists: the "For artists" studio (`#/studio`) is a prototype that keeps everything in the visitor's own browser (`localStorage`); the "Send me a sign-in link" button sends nothing. Only one real artist exists; adding another means a developer editing repo JSON and pushing. | `artist.js:5` ("A prototype: what an artist enters is kept in this browser (localStorage)"); `artist.js:315` ("In this prototype nothing is sent"); `data/studio.json` → `artists: 1`; `AUDIT/shots/studio.png` |
| 4 | **High** | Fictional demo content is mixed with the one real artist and is not labelled as demo on the public screens: home shows "ON VIEW NOW · LIA MORÉN · Low Tide · Harbour Gallery · 28 Oct — 12 Dec, 2026" (fictional), Shows says "OPENING TONIGHT · 20:00", Map lists galleries with walking times. The only hints are "NO. 01 · PROTOTYPE" under the logo and the word "made-up" deep on a demo artist page. Demo artists are pre-set as "Following". | `AUDIT/shots/home.png`, `AUDIT/shots/shows.png`, `AUDIT/shots/artists.png`; `data/demo/world.json` (`_note`: "fictional artists, galleries and shows"); text scan in `AUDIT/demo.js`: `#/`, `#/shows`, `#/map`, `#/exhibition/low-tide-haifa` contain no "demo/fictional/sample" word |
| 5 | **High** | Sharing a link shares nothing specific: routes are hash routes (`#/work/...`), the document has one static `<title>Open Studio</title>`, no meta description and no Open Graph/Twitter tags, and the title never changes on navigation. A WhatsApp/Instagram/iMessage preview of any work, artist or tour link is the same bare "Open Studio" card (link-preview crawlers never see the part after `#`). | `audit_all.json`: 149/149 routes have title "Open Studio", `metaDesc` null, `og` 0; no `document.title` assignment anywhere in `app.js`/`artist.js` (grep); `app.js:532-549` route table |
| 6 | **High** | The 3D tour is heavy for a phone on mobile data: the Ritual tour downloads **7.73 MB in 81 requests** (4.73 MB of it tour files, 47 files) and the original full-size work JPEGs (877 KB, 631 KB) instead of the thumbnails; the "Building the room…" overlay cleared after 8.2 s on an unthrottled connection (software WebGL). Under Slow 4G (150 ms RTT, 1.6 Mbit/s) the overlay cleared at **25.2 s** and downloads finished at **43.8 s**. | `AUDIT/space_fast.txt`; `AUDIT/shots/space_ritual.png`; folder sizes `data/spaces/ritual` 9.5 MB, `nature-of-man` 9.2 MB, `bfa-graduate-exhibition` 3.1 MB (du) |
| 7 | **High** | Slow Largest Contentful Paint on key pages under Slow 4G + 4× CPU: home LCP 8.1 s, exhibition 8.6 s, artist 6.8 s, work 6.2 s, shows 5.7 s (Google's "good" threshold is ≤ 2.5 s). Lighthouse mobile (its own simulated throttling) gives home Performance 79, LCP 4.5 s (score 0.36), "uses-responsive-images: potential savings 855 KiB", "modern-image-formats: 263 KiB". Cause: hero/cover images served at full size (`low-tide-haifa-1.jpg` 198 KB rather than the existing `-s.jpg`; artist hero `media/works/jah-005-*.jpg` 318 KB; work page `44-*.jpg` 678 KB). | `AUDIT/perf.json`; `AUDIT/lh__.json` |
| 8 | **Medium** | The install banner ("Get Open Studio · Tap Share, then 'Add to Home Screen'") is fixed above the tab bar on every page until dismissed, covering content (artist names on home, the work-detail buttons, the "Enter the space" description); its close "×" is 24×32 px (below the 44×44 pt Apple guideline). | every screenshot in `AUDIT/sheet1.png`; `app.js:719-740`; `audit_all.json` small-target list on every route: `{'t':'×','w':24,'h':32}` |
| 9 | **Medium** | Colour contrast fails WCAG 1.4.3 (AA, 4.5:1) in the Map's "On the walls" look and on the studio CTA: white on green `#1E9E57` 3.45:1 (map pins, 13 px), green on white 3.45:1, green headline "now" on `#E8E6E1` 2.76:1, "Send me a sign-in link" `#F6F1E7` on `#1E9E57` 3.06:1. 35 failing nodes on 7 routes; all other 142 routes passed every axe WCAG A/AA rule. | `audit_all.json` → `axeAgg.color-contrast` (routes 7, nodes 35); `index.html:445` (`--dot:#1E9E57`) |
| 10 | **Medium** | Two of three exhibitions have no tour, and the public page says so in internal language: Nature of Man ("8 of 15 works were found in the installation photos") and BFA ("3 of 8") are "not yet". All three exhibitions are `confirmed: false`, and the public exhibition page shows "Waiting for the artist to confirm". | `data/spaces/*.status.json`; `data/spaces/index.json` lists only `ritual`; `data/studio.json` (`"confirmed": false` ×3); `app.js:276` |
| 11 | **Medium** | Visual defect in the published Ritual tour on first view: the ceiling shows large angled light-grey slabs with streaks running across it (the opening view, phone viewport). The server inspection had passed it ("passed all 18 checks"). Worth a look by the tour owner; this audit did not compare it against the installation photos. | `AUDIT/shots/space_ritual.png` (top third); `data/spaces/ritual.status.json` |
| 12 | **Medium** | Tap targets: on average 3.6 interactive elements per route are under 44 px in one dimension; 16 under 24 px (the WCAG 2.2 AA 2.5.8 minimum) across all routes, e.g. the "maybe" works on the Ritual exhibition page (`Together` 51×17, `Flower` 39×17), "ALL 47 →" on the artist page (65×18), the "Open Studio" logo link (158×26). | `audit_all.json` (`small`, `small24`, `smallEx`) |
| 13 | **Medium** | Accessibility of the single-page app: the page title never changes, focus is left on `<body>` after a route change and nothing announces the new page (no `aria-live`), no skip link, and the tab bar is last in DOM order (a keyboard user tabs through the whole page to reach it). Focus outlines are visible (2 px solid) and tabs use `aria-current="page"`, which is good. | `AUDIT/kb.js` output; grep: no `aria-live`/`document.title` in `app.js`; tabs markup `<nav class="tabs" aria-label="Main">` |
| 14 | **Medium** | No RTL/Hebrew readiness: `lang="en"`, no `dir` handling anywhere, 0 occurrences of `rtl`/`dir=` in `index.html`, `app.js`, `artist.js`; CSS uses physical `left/right` 38 times vs logical `inline-*` properties 3 times; fonts loaded (Fraunces, IBM Plex Sans/Mono, Figtree) are Latin subsets, so Hebrew would fall back to system fonts. | `index.html:2` and grep counts |
| 15 | **Low** | iOS PWA polish: no `apple-touch-startup-image` (white flash on launch), manifest has no `id`, `screenshots` or `categories`; `apple-mobile-web-app-capable` is the legacy tag. Icons present and correct sizes (180, 192, 512, maskable 512). | `index.html:9-17`; `manifest.webmanifest`; PIL sizes |
| 16 | **Low** | Generated embed code inserts the exhibition title unescaped into an `iframe title="..."`: a title with a `"` breaks the artist's pasted HTML. (The rest of the HTML-from-template code consistently uses `esc()`.) | `artist.js:218` |
| 17 | **Low** | Data depends on the host site: the app fetches `/content/*.json` from the domain root, so it only works on eladamsalem.com and only for that one artist's site content. | `app.js:9-11` |
| 18 | **Low** | Full original files ship in the published tour folders even when unused at runtime, e.g. `data/spaces/ritual/works/woman-and-a-gun.png` 4.6 MB (the viewer loaded `*-small.webp`/jpg files; the PNG was not among the requests). | `du -ah data/spaces/ritual`; `AUDIT/space_fast.txt` top list |
| 19 | Info (pass) | No horizontal overflow on any of the 149 routes; no `<img>` without `alt`; no broken images; no console errors or failed requests from the app itself; unknown routes show a clean "This page doesn't exist. Back to Home"; offline works after one visit. | `audit_all.json`; `AUDIT/shots/artist_nobody.png`; offline run below |

## 1. Route walk on iPhone emulation (390×844, DPR 3)

### Takeaway
All 149 routes reachable by following links from home render without layout overflow, console errors or broken images. The visible problems are the blank/watermarked Map (critical), the persistent install banner covering content on every page, demo content presented as real, and a handful of small tap targets.

### Cited Findings
- Crawl from `#/` following every `#/` link reached 149 routes: home, artists, 6 artist pages, 6 artist archives + 15 year filters, shows, map + 5 map-focus routes, 5 places, search, 9+ exhibitions, ~95 work pages, 2 objects, about, `#/works` + 8 years, `#/studio` — [AUDIT/routes.json, AUDIT/discover.js]
- `scrollWidth > innerWidth` on 0 of 149 routes (no horizontal page scroll) — [AUDIT/audit_all.json]
- 0 images without an `alt` attribute; decorative/duplicate images use `alt=""` (e.g. 53 of 54 images on `#/artist/elad-amsalem`, where the title is printed next to each thumbnail); the work page's main image has an alt (`workCover` uses `w.title`) — [AUDIT/audit_all.json; app.js:177-188]
- Console/page errors from the app: none. The only warnings recorded ("Couldn't load preload assets") come from the injected axe-core script (stack points into the injected source), not the app — [AUDIT/audit_all.json `errs`]
- Unknown routes (`#/artist/nobody`, `#/work/nope`, `#/exhibition/nope`, `#/garbage`) show "This page doesn't exist. Back to Home". Minor: the 404 view keeps the "Artists" tab highlighted — [AUDIT/shots/artist_nobody.png, AUDIT/sheet1.png bottom-right]
- Map: CARTO base-map tiles return a "API KEY REQUIRED" watermark; the page title "On the walls now, near Tel Aviv" sits over an empty map with pins — [AUDIT/shots/map.png; AUDIT/tile.png; app.js:510]
- Install card shown on every route on a touch device until "×" is tapped (dismissal is remembered in localStorage `os-install-dismissed`) — [AUDIT/sheet1.png; app.js:719-740]
- Screenshots of each main route: `home.png`, `artists.png`, `artist_elad-amsalem.png`, `artist_lia-moren.png`, `artist_lia-moren_works.png`, `works.png`, `shows.png`, `map.png`, `map_low-tide-haifa.png`, `place_haifa.png`, `search.png`, `exhibition_ritual.png`, `exhibition_nature-of-man.png`, `work_ritual-2025.png`, `work_low-tide.png`, `work_static-bloom.png`, `object_pargod.png`, `about.png`, `studio.png`, `artist_nobody.png`, `space_ritual.png` (each also `_full.png`) — [AUDIT/shots/]

### Inferences
- The Map tab is one of five main tabs, so a fifth of the primary navigation currently looks broken to a first-time visitor. Switching to a provider with a free tier and a key (or self-hosted/static tiles) is the fix; this audit did not test alternatives.
- The install card is a good iOS pattern, but showing it on first page view before any value is seen, covering content, is likely to be dismissed reflexively.

### Gaps
- No real-device (WebKit/iOS Safari) run: Safari-only issues (100vh, WebGL context loss, memory on the 3D tour, standalone mode) are untested here.
- `#/artist/elad-amsalem/works` was not in the crawl (the artist page links to `#/works` instead), so it was not screenshotted separately; `#/works` was.

## 2. Performance

### Takeaway
App code is small (app.js 19 KB gzipped on the wire; total JS 19 KB per route before the 3D viewer), and first paint is fast (FCP 0.5–0.8 s throttled). The weight is images: 0.9–1.3 MB per content route, with full-size hero images driving LCP to 5.7–8.6 s on Slow 4G. The 3D tour is ~7.7 MB.

### Cited Findings
Per-route cold load, cache disabled, Slow 4G (150 ms RTT, 1.6 Mbit/s) + 4× CPU, service worker blocked — [AUDIT/perf.json]:

| Route | Requests | Total KB | Images KB | Fonts KB | JS KB | FCP ms | LCP ms | Network idle ms |
|---|---|---|---|---|---|---|---|---|
| `#/` home | 38 | 1257 | 1074 | 129 | 19 | 816 | 8116 | 9137 |
| `#/artist/elad-amsalem` | 30 | 1008 | 744 | 210 | 19 | 528 | 6828 | 7306 |
| `#/shows` | 28 | 920 | 726 | 140 | 19 | 552 | 5704 | 6931 |
| `#/map` | 24 | 185 | 68 | 63 | 19 | 536 | 2696 | 3838 |
| `#/exhibition/ritual` | 31 | 1281 | 1016 | 210 | 19 | 640 | 8564 | 9038 |
| `#/work/ritual-2025` | 20 | 884 | 700 | 129 | 19 | 540 | 6180 | 6648 |
| `#/search` | 18 | 186 | 2 | 129 | 19 | 528 | 2296 | 3895 |

- Largest single resources: work page `media/works/44-1780919907801.jpg` 678 KB; artist and exhibition hero `media/works/jah-005-*.jpg` 318 KB; home hero `data/demo/shows/low-tide-haifa-1.jpg` 198 KB (a 21 KB `-s.jpg` version exists and is used on the Map); thumbnails `thumbs/*.webp` up to 121 KB — [AUDIT/perf.json `top`]
- Every route also loads all data JSON up front (~23 KB on the wire: five `/content/*.json`, `studio.json`, `spaces/index.json` + each space JSON, `thumbs.json`, `demo/world.json`) — [app.js:7-23; AUDIT/perf.json `jsonKB`]
- Fonts: 4 Google font families (Fraunces with italics, IBM Plex Sans, IBM Plex Mono, Figtree), 63–210 KB per route — [index.html:21; AUDIT/perf.json `fontKB`]
- Lighthouse 12.2.1 mobile, home: Performance 79, Accessibility 100, Best Practices 100, SEO 58. FCP 1.8 s, LCP 4.5 s, TBT 180 ms, CLS 0.067, Speed Index 2.9 s, total 1,254 KiB; opportunities: responsive images 855 KiB, modern formats 263 KiB; also flagged `uses-long-cache-ttl` (GitHub Pages sends `cache-control: max-age=600`) and `unminified-javascript` — [AUDIT/lh__.json; `curl -I .../app.js`]
- Text assets are gzip-compressed by GitHub Pages (app.js 58,679 B → 18,358 B) — [curl with Accept-Encoding: gzip]
- 3D tour, Ritual, unthrottled, software WebGL (SwiftShader): 81 requests, 7.73 MB total, 4.73 MB from `data/spaces/ritual/` in 47 files, loading overlay cleared at 8.2 s, network idle 8.2 s; biggest files are the original work JPEGs from `/media/works/` (877 KB, 631 KB), then `works/flowers-3-small.webp` 372 KB and the installation photos `photos/0-4.jpg` ~365 KB each; no console errors — [AUDIT/space_fast.txt]
- 3D tour, Ritual, Slow 4G (150 ms RTT, 1.6 Mbit/s, no CPU throttle): same 81 requests / 7.73 MB; "Building the room…" overlay cleared at 25.2 s, network idle at 43.8 s — [AUDIT/space_4g.txt]
- A direct link to the space of an unpublished exhibition (`#/exhibition/bfa-graduate-exhibition/space`) falls back gracefully to the exhibition page (no stuck loader, no errors) — [AUDIT/space_fast.txt; AUDIT/shots/space_bfa-graduate-exhibition.png]
- Tour folder sizes on disk: ritual 9.5 MB, nature-of-man 9.2 MB, bfa-graduate-exhibition 3.1 MB; `ritual/works/woman-and-a-gun.png` 4.6 MB (not requested at runtime) — [du on data/spaces]

### Inferences
- Using the existing small versions (`-s.jpg`, `thumbs/*.webp`) for heroes and a ~1200 px version for the work page would likely bring LCP close to Lighthouse's target; the 855 KiB saving estimate supports that.
- A first-time visitor on a weak mobile connection waits ~25 s before seeing the room; on a good 4G link (~10 Mbit/s) the 7.73 MB is still ≈ 6 s of transfer. A progressive load (room first, works after) or a lighter first view would help first-time phone visitors most.

### Gaps
- Time to first interactive view on a real iPhone GPU is unmeasured (SwiftShader is CPU rendering and slower than a phone GPU for drawing, but the network part is representative).
- Lighthouse on hash routes failed (the `#` must not be URL-encoded; the run passed `%23` and hit a 404), so only home has a Lighthouse score.

## 3. Service worker, caching and offline

### Takeaway
Offline works well after one visit: the service worker serves the shell and data network-first and keeps images cache-first; every tested page rendered offline with zero broken images.

### Cited Findings
- `sw.js`: shell pre-cache (`index.html`, `app.js`, `artist.js`, `space/space.js`, manifest, icon); pages/scripts/JSON network-first with `cache: 'no-cache'` and cache fallback; images/fonts/jsdelivr (three.js) cache-first; videos bypass the SW; old caches deleted on activate; the publish workflow stamps the cache name with the commit (`open-studio-28455cc` live) — [sw.js:1-37; .github/workflows/open-studio-app.yml (the `sed -i "s/const VERSION...` step)]
- Live check: SW active with scope `/open-studio/`; after visiting home and one artist, the cache held 55 entries including all 10 data JSON files — [AUDIT/offline.js output]
- With the browser set offline, `#/`, `#/artist/elad-amsalem`, `#/shows`, `#/work/low-tide` all rendered full text with 0 broken images — [AUDIT/offline.js output; AUDIT/shots/offline_*.png]
- The image cache has no size limit or expiry (`keep()` stores every image ever seen, including 3D tour textures) — [sw.js:16-18, 26-30]

### Inferences
- A visitor who opens several tours will accumulate tens of MB in Cache Storage; iOS may evict it, which is safe but unbounded growth is worth capping.

### Gaps
- Offline behaviour of the 3D tour itself was not tested.

## 4. Accessibility (WCAG 2.1 AA, relevant to Israeli Standard 5568)

### Takeaway
Strong baseline: axe-core found one rule failing (colour contrast) on 7 of 149 routes, and Lighthouse Accessibility is 100 on home. The gaps are the ones automated tools miss in single-page apps: page titles, focus management, announcements, tap-target size, RTL.

### Cited Findings
- axe-core 4.10.2, tags wcag2a/2aa/21a/21aa, all 149 routes: only `color-contrast` (serious), 35 nodes on 7 routes (`#/map`, 5 `#/map/...` routes, `#/studio`). Ratios 3.45:1 (white on `#1E9E57`, 13 px), 2.76:1 (green "now" on `#E8E6E1`, 38 px), 3.06:1 (studio CTA, 14 px) — [AUDIT/audit_all.json]
- Lighthouse Accessibility: 100 (home) — [AUDIT/lh__.json]
- Keyboard: Tab order on home goes hero → artists → exhibitions in reading order, each with a visible 2 px solid outline (`:focus-visible{outline:2px solid var(--dot)}`) — [AUDIT/kb.js output; index.html (`:focus-visible` rule)]
- After navigating to `#/artists`, `document.activeElement` is `BODY` and `document.title` is still "Open Studio"; no `aria-live` region and no `focus()` call on route change exist in `app.js` (the only `focus()` is in the studio log dialog, `app.js:701`); no skip link; landmarks `header`, `main`, `nav` present — [AUDIT/kb.js; grep]
- Tab bar: `<nav class="tabs" aria-label="Main">` with `aria-current="page"` on the active tab; SVG icons `aria-hidden` and visible text labels — [AUDIT/kb.js]
- 3D viewer: controls carry aria-labels ("Walk: drag the knob to move", "Show a person for scale", "Floor plan: …", "Previous", "Next", "Play: go from work to work"), keyboard handlers exist (`keydown`/`keyup`), and a "Works" list mode offers a non-3D path through the works — [space/space.js:639-640, 858; grep of aria-label]
- Tap targets below 44 px in either dimension: average 3.6 per route; below 24 px: 16 occurrences in total (e.g. "maybe" work links 17 px tall on `#/exhibition/ritual`, "ALL 47 →" 18 px tall) — [AUDIT/audit_all.json]

### Inferences
- For IS 5568 (which follows WCAG 2.0/2.1 AA), the contrast failures, the unchanged page title (SC 2.4.2) and missing status announcements (SC 4.1.3) are the items an accessibility auditor would cite. An accessibility statement page (required for Israeli public-facing services) does not exist in the app.

### Gaps
- No screen-reader (VoiceOver) run. Zoom/reflow at 200%/400% not tested. Video captions (studio "live" clips are muted, `aria-hidden`) not assessed.

## 5. PWA and iOS readiness

### Takeaway
Installable and well configured for a prototype: manifest with name, standalone display, theme/background colours and 192/512/maskable icons; iOS meta tags and a 180 px touch icon; working service worker. Missing polish: iOS splash screens, manifest `id`/`screenshots`.

### Cited Findings
- Manifest: `name`/`short_name` "Open Studio", description, `start_url`/`scope` `./`, `display: standalone`, `orientation: portrait`, `background_color`/`theme_color` `#EFE9DD`, `lang: en`, icons 192 (any), 512 (any), 512 (maskable) — [manifest.webmanifest]
- Icon files verified: apple-touch-icon 180×180, icon-192 192×192, icon-512 512×512, maskable 512×512 — [PIL on icons/]
- iOS tags: `apple-mobile-web-app-capable`, `mobile-web-app-capable`, `apple-mobile-web-app-title`, status-bar style `default`, `viewport-fit=cover`, light/dark `theme-color` — [index.html:5, 9-17]
- No `apple-touch-startup-image` — [grep count 0 in index.html]
- Install prompt: Android `beforeinstallprompt` → Install button; iOS → instruction card; suppressed in standalone, iframes and non-touch devices — [app.js:719-740]

### Gaps
- Lighthouse 12 no longer has the "installable-manifest" audit, so installability was not machine-scored; a real iOS Add-to-Home-Screen test was not possible here.

## 6. SEO and sharing

### Takeaway
Today the app is invisible to search and produces identical, generic link previews for every page. That is acceptable for a private prototype but must change before any launch or social campaign, because the product's growth loop (artists sharing their works and tours) depends on rich previews.

### Cited Findings
- `<meta name="robots" content="noindex, nofollow">` — [index.html:6]
- `robots.txt` on eladamsalem.com allows `/` (disallows only `/admin/`, `/app/`, `/designs/`); `sitemap.xml` contains no `/open-studio/` URL — [curl robots.txt, sitemap.xml]
- One `<title>`, no meta description, 0 `og:` tags on all 149 routes; Lighthouse SEO 58 (fails: is-crawlable, meta-description) — [AUDIT/audit_all.json; AUDIT/lh__.json]
- All deep links are hash fragments (`#/work/<slug>`, `#/exhibition/<slug>/space`); the server only ever serves `index.html` — [app.js:532-549]

### Inferences
- Fix path (not tested): real paths with per-page static HTML stubs generated at publish time (the publish workflow already runs Python, `thumbs.py`), each carrying title, description and `og:image`, then booting the same app.

## 7. Data and content model: demo vs real, and what a real artist must do today

### Takeaway
One real artist (Elad Amsalem: 47 works, 3 exhibitions, 1 live 3D tour) sits beside a fictional "demo world" (5 artists, 32 works, 9 shows, 5 places, 6 gallery listings, 5 studio video clips). There is no self-service path: a real artist cannot get onto the app today without the developer.

### Cited Findings
- Real content: `/content/{settings,works,exhibitions,objects,cv}.json` of eladamsalem.com plus `data/studio.json` (1 artist with `source: "site"`, 3 exhibitions, all `confirmed: false`, work lists marked "a draft grouped by year until Elad confirms them") — [app.js:1-23; data/studio.json]
- Demo content: `data/demo/world.json` (`_note`: "Demo content: fictional artists, galleries and shows, with generated works, to see the app full. Dates are days from today.") — artists 5, works 32, shows 9, live 9, listings 6, places 5 — [data/demo/world.json]
- Demo dates are relative to today, so demo shows are always "opening tonight" — [world.json `_note`; AUDIT/shots/shows.png]
- 3D tours: built by the Python pipeline in `space/pipeline/` (match, solve, room, bake, inpaint, verify, inspect…) in the "Studio spaces" GitHub workflow from installation photos; published only if they pass inspection. Status today: Ritual live ("passed all 18 checks, from 139 views"), Nature of Man "not yet" (8 of 15 works found in the photos), BFA "not yet" (3 of 8) — [data/spaces/*.status.json; data/spaces/index.json]
- Artist side `#/studio`: email field + "Send me a sign-in link" (sends nothing), "Open the demo studio" (a made-up artist); what an artist enters is saved only in that browser's localStorage — [artist.js:5, 18-21, 128-130, 312-322; AUDIT/shots/studio.png]
- "Following" is stored per phone in localStorage (`os-following`) and starts pre-filled — [app.js:157-166; AUDIT/shots/artists.png]

### Inferences (honest assessment of onboarding a real artist today)
- Steps today: send the developer their works (images, titles, sizes, years) and exhibition installation photos; developer adds an artist record and content JSON in the repo (the content model assumes one artist's site content in `/content/`, so a second real artist needs a data-model change first), pushes to `studio`, waits for the "Studio spaces" workflow to build and inspect a tour, and for the publish workflow. No accounts, no upload, no editing, no consent/rights record, no back end.
- Visitors cannot tell the real artist from the fictional ones; for a public launch the demo world must be removed or clearly marked.

## 8. Code health and risks

### Takeaway
Small, readable, framework-free code (≈2,750 lines across four files) with consistent HTML escaping. Main risks are structural: no automated tests for the web app, global state, string-template rendering everywhere (safe only while every interpolation remembers `esc()`), and a localStorage "back end".

### Cited Findings
- Sizes: `app.js` 742 lines / 58.7 KB, `artist.js` 435 / 32.6 KB, `space/space.js` 1,067 / 76.1 KB, `index.html` 504 lines / 43.3 KB (all CSS inline), `preview.html` 12.7 MB (a baked preview with data inlined, not published) — [wc on studio/app]
- No build step, no minification, no bundler; three.js 0.170.0 from jsDelivr via import map — [index.html:22; Lighthouse `unminified-javascript`]
- `innerHTML` use: 12 in app.js, 5 in artist.js, 6 in space.js; rendering is template strings; an `esc()` helper (`app.js:29`, `artist.js:10`) is used on titles, names, captions, image URLs and alt text; slugs in hrefs come from `slugify()` (only `[\w-]`); one unescaped attribute found: `ex.title` in the generated iframe embed code — [grep; app.js:29, 177-188; artist.js:120, 160, 218]
- Inline `onerror="this.remove()"` attributes in map tiles (would block a strict Content-Security-Policy) — [app.js:510]
- Error handling: `loadData()` uses `Promise.all` on the five site JSONs with no catch, so one failed content file leaves a blank app; optional files (`thumbs.json`, `world.json`, `spaces/index.json`) do have `.catch` fallbacks — [app.js:9-22]
- Tests: no unit/e2e tests for the web app; the 3D pipeline has an inspection stage (`space/pipeline/inspect.py`, `verify.py`) that renders and checks tours in a phone viewport and gates publishing — [find studio -name "test*" → only a cached video; space/pipeline/ listing; CLAUDE.md]
- Hosting: GitHub Pages, `cache-control: max-age=600`, no server, no API, no analytics found in code — [curl -I; grep]

### Inferences
- Once user-generated content exists, a single missed `esc()` becomes stored XSS. Moving to DOM-building helpers or a tiny templating layer that escapes by default, plus a CSP, would remove that class of bug.
- The tour inspection is a real asset (closest thing to tests in the repo); the web app has nothing equivalent, so regressions like the Map tiles going blank were not caught.

## 9. First-time user experience (5-second test)

### Takeaway
A newcomer sees a strong, editorial look and a gallery room, but not what the app is for: the first screen says "Open Studio · NO. 01 · PROTOTYPE · ON VIEW NOW" and a show card, with no line explaining the value ("walk exhibitions from your phone", "follow artists"), and the install card arrives before any value is shown. The clearest value statement in the app ("Your studio, open to everyone…") is on the artists' screen, not the visitors' home.

### Cited Findings
- Home first viewport (390×844): logo + "NO. 01 · PROTOTYPE", "ON VIEW NOW", one large show card ("Low Tide", fictional), "Artists" heading with portraits half hidden behind the install card; tab bar Home/Artists/Shows/Map/Search — [AUDIT/shots/home.png]
- Home text, first 300 characters: "Open Studio NO. 01 · PROTOTYPE ON VIEW NOW LIA MORÉN Low Tide Harbour Gallery · 28 Oct — 12 Dec, 2026 Artists Elad Amsalem Painting Lia Morén Painting … + More artists coming soon Exhibitions …" — [AUDIT/demo.js output]
- The show card on home opens the exhibition page, not the 3D tour; the only live 3D tour (Ritual) needs Home → Elad → exhibition → "Enter the space" — [AUDIT/shots/exhibition_ritual.png; data/spaces/index.json]
- Value proposition text exists only at `#/studio`: "Your studio, open to everyone. Your works at their real size, your exhibitions as albums, and the shows themselves as rooms anyone can walk through, built from your installation photos." — [AUDIT/shots/studio.png]
- Search empty state is helpful ("Try 'Ritual', 'oil', 'Jerusalem'") — [AUDIT/shots/search.png]
- The 3D tour opens with a clear hint overlay ("Drag to look around · Joystick to walk · Tap the floor to go there") and Walk/Works/Photos modes — [AUDIT/shots/space_ritual.png]

### Inferences
- The product's distinctive feature (walkable rooms built from real installation photos) is three taps deep and only exists for one exhibition; the home screen leads with a fictional show rendered as a simple generated room, which undersells it.

### Gaps
- No user testing with real visitors; the 5-second judgement here is the auditor's reading of the screenshots, not measured comprehension.
