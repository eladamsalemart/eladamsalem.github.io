# Studio — Proposal v3

Elad Amsalem Studio · October 2026 · Working name: Studio. This version has been through two review rounds; see `REVIEW.md`.

## 1. Vision

**Studio is the home of working artists. Every approved artist is always on view.**

It is built like Spotify: the artist owns a profile, people follow artists, exhibitions are albums and works are tracks. It is shown like an exhibition: each artist always has one live show, hung at real scale in a real-feeling space, of works that physically exist.

### Principles

1. **Always on view.** Every artist has one live show at all times. Earlier shows move to the archive.
2. **Real works, real sizes.** Every work exists physically and is documented to a standard. Its size is checked against its photo.
3. **Curated, not crowded.** Artists are admitted by application, and every work is approved by a person.
4. **Screen to room.** Following leads to openings, and the City view leads to real shows.
5. **For the art.** No sales, no ads, no paid reach. Curation is editorial and is never sold.

## 2. Decisions made (Oct 2026)

- Only active, approved artists can join. Every work is approved.
- No sales at launch.
- English, for an international audience.
- Medium is secondary: a tag and a filter, not the structure.

## 3. The app

The app has five tabs: **Home** (Following), **Discover**, **City**, **Issues**, and **You**.

| Part | What it does |
|---|---|
| Artist profile | On view → Exhibitions → Works → Archive by year → In person → About and CV |
| Exhibition | Title, text, curator, venue and dates, works, installation views. Entered as a 3D space or a 2D walkthrough. |
| Work | Wall label (title, year, medium, H × W × D cm, red dot if sold, country), deep zoom, *At scale* view next to a 175 cm figure, AR on your wall, detail shots |
| On view: space | Guided 3D: tap to go to the next work, drag to look around, True colour toggle, dimensions, scale figure. VR on Quest and Vision Pro. |
| On view: walkthrough | The same show as a fast 2D sequence, always available |
| City | Map plus list of Studio artists showing in person, by dates, with filters (following, opening this week, medium) |
| Issues | Studio-curated group shows, published like magazine issues |
| Studio for Artists | Apply, upload with automatic checks, exhibition builder on a wall drawn to scale, honest statistics |
| Review console | A queue sorted by the machine checks. A person approves, returns with a reason, or declines. |

## 4. Membership and approval

**Apply (draft criteria, to be finalised):**

- **Route A, exhibition history:** at least one public exhibition in the last 36 months.
- **Route B, portfolio:** a committee reviews the body of work.
- **Both routes need:**
  - 10–20 works documented at the *Accepted* level
  - a statement (≤ 300 words) and a CV
  - a studio photo, seen only by reviewers
- **Review:** a committee of 3, with a decision target of 21 days and reapplication after 6 months.

**Every work goes through:**

1. **Automatic checks:**
   - resolution
   - colour profile
   - size against the photo's aspect ratio (within 6%)
   - required fields
   - AI-image screening
   - duplicate or reverse-image search
2. **Curator review**, with a target of 72 hours. The work is approved, returned with a fix, or declined.
3. **Trust tiers:** artists with a clean record get a lighter review, never an automatic one.

## 5. Quality standard

| Level | 2D works | 3D works | Video | Unlocks |
|---|---|---|---|---|
| **Accepted** | ≥ 3,000 px, straight-on, cropped to the edge, no glare, sRGB/P3 embedded, H × W × D cm | 4 views ≥ 3,000 px, neutral ground | ≥ 1080p master | Profile, archive, walkthrough |
| **On view** | ≥ 4,000 px, colour-managed, even light | 8 views, or a turntable | ≥ 1080p, graded | Hanging in a 3D space |
| **Studio Standard** | ≥ 6,000 px, colour target (ΔE00 average ≤ 3 target), cross-polarised for gloss, 2 detail shots incl. raking light | 36-frame turntable, or 3D capture (glTF/USDZ mesh for AR + SPZ splat) | 4K, loudness-normalised | Badge, full deep zoom, Issues |
| **Archive** (optional) | Stitched 10,000–30,000 px, FADGI-like colour | Scan + photogrammetry | Lossless | Institutions |

**Installation views** are a separate media type: at least 3–6 per show, level verticals, and the photographer credited.

## 6. The space

The space follows these rules:

- **Scale:** 1 unit = 1 m. Every work hangs at its verified size. Canvas depth is 3.5 cm by default.
- **Hanging:** centre line 145 cm. Works over 2 m tall hang 30 cm off the floor.
- **Viewing:** eye height 160 cm, viewing distance about 1.5 × the work's longest side.
- **Lighting:** track spots at 30° from vertical, 3000–3500 K. Oils at about 100–200 lux, works on paper at 30–50 lux.
- **Colour:** Khronos PBR Neutral tone mapping, and a True colour toggle.
- **Labels:** wall labels at 145 cm, to the right of the work.

**Library v1:**

| Space | Size | Notes |
|---|---|---|
| White Cube | 16 × 10 × 4.5 m | |
| Long Gallery | 30 × 8 × 5 m | skylight |
| Project Space | 10 × 8 × 3.2 m | raw concrete |
| Salon | 6 × 5 × 2.9 m | domestic; for small works |

The library is modelled and light-baked in Blender, with KTX2 textures. **Captured shows:** a physical exhibition captured as a Gaussian splat (SPZ, streamed with Spark).

**Performance:**

- ≤ 15 MB to first view.
- Works stream from 1k to 4k.
- 60 fps target on recent phones.
- The walkthrough as the fallback.
- WebXR as an enhancement.

## 7. Technology

| Layer | Choice | Why |
|---|---|---|
| App | Web app / PWA first (installable), native wrappers (Expo) when iOS push matters | One codebase. Android takes PWAs via TWA. iOS web push only works for installed PWAs. |
| 3D | three.js + Spark (splats) + glTF/KTX2, WebXR | Open, mobile-capable |
| Data, auth | Supabase (Postgres, auth, row-level security) | Small-team friendly |
| Files | Cloudflare R2 + CDN, with masters backed up to a second provider | Zero egress fees. Images are heavy. |
| Images | Derivatives and deep-zoom tiles generated at upload (AVIF + JPEG) | Predictable cost, no per-view transforms |
| Video | Cloudflare Stream (or Mux) | Adaptive streaming, per-minute pricing |
| Maps | Mapbox free tier, then MapLibre + self-hosted tiles | Avoid per-load costs at scale |
| AI screening | Hive (about $6 per 1,000 images) | Used by Cara |

## 8. Running it: storage, traffic, cost

Assumptions (see `research/cost_model.py`):

- **Storage:** 40 works per artist, 25% of them 3D. That comes to about **5.8 GB per artist**, doubled for backup.
- **Traffic:** 8 visits per user per month, 30% of visits in 3D (about 35 MB each), the rest 2D (about 5 MB each).

| Stage | Artists | Monthly users | Storage | Traffic/month | Cloud cost/month |
|---|---|---|---|---|---|
| Pilot | 1 | 500 | 12 GB | 0.05 TB | ≈ $0 (free tiers) |
| Invited | 20 | 3,000 | 0.23 TB | 0.3 TB | ≈ $50 |
| Growth | 500 | 20,000 | 5.7 TB | 2.1 TB | ≈ $250 |
| Scale | 5,000 | 150,000 | 57 TB | 16 TB | ≈ $1,800 (≈ $3,000 if staying on Mapbox) |

**Fixed costs:**

- Apple Developer: $99/year.
- Google Play: $25 once.
- Domain: a few dollars per year.
- AI screening: about $1 (pilot) to $3,600 (scale) one-off for the back catalogue.

On AWS S3, bandwidth alone would add about $200/month at Growth and $1,500/month at Scale. That is why R2 is chosen.

**The real cost is people:** curatorial review (about 3 minutes per work, about 1 FTE at Growth, about 2 at Scale), the 3D artist for spaces, and capture days.

## 9. What it needs from you (Elad)

1. **Your masters.** Find the original, full-resolution files of your works. The site only has 2,000 px versions.
2. **A re-shoot of the Ritual works** (about 13) to *On view* level or better: a reproduction photographer, or a setup with 2 lights at 45°, polarising film plus a lens polariser, a colour target, and a tripod. Get 2–3 quotes.
3. **Clean data:** H × W × D in cm for every work. The 17 mismatches, 7 double sizes and 1 missing size are listed in the deck.
4. **Installation views** of Ritual (JAH, photo Elad Sarig), with permission to use them.
5. **Accounts:** a domain, Cloudflare, Supabase, GitHub (you already have this), and later Apple and Google developer accounts.
6. **A name** for the platform.
7. **10–20 artists** for Phase 2, across media: painting, photography, ceramics, sculpture, video.
8. **Time:** about 2 hours a week for decisions and review during the pilot.

Hardware and internet: any modern computer is enough. Uploading about 3 GB of masters takes around 20 minutes at 20 Mbps upload. A phone with a LiDAR or recent camera is enough to try splat capture (Scaniverse).

## 10. Roadmap

| Phase | Scope | Exit when |
|---|---|---|
| 0 · now | Vision, research, prototype, this deck | Name chosen, pilot scope agreed |
| 1 · Pilot | Elad only. Web. Profile, archive, one show in the White Cube, walkthrough, work pages, follow by e-mail. | The show is live with re-shot works, and real visitors have tested it |
| 2 · Invited | 20 artists in Tel Aviv. Apply, upload checks, builder, review console, accounts, 4 spaces. | 20 shows live. Review takes under 72 hours. |
| 3 · City | City, physical shows, notifications, captured shows | Two cities |
| 4 · Issues and apps | Issues No. 01, native apps, institutions | — |

**Pilot goals** (hypotheses to test, not facts):

- median visit ≥ 3 minutes
- ≥ 10% of visitors follow
- artists would recommend it

## 11. Risks

| Risk | Mitigation |
|---|---|
| Virtual-gallery fatigue | Short, guided shows, the 2D walkthrough, following as the reason to return |
| Cold start | The artist's link as the loop, a city-by-city launch |
| Documentation burden | Capture days, clear levels, instant feedback at upload |
| Review load | Trust tiers, a budget for reviewers |
| Platform dependency | Masters backed up to a second provider, open formats (glTF, SPZ, IIIF-style tiles) |
| Generic name | Decide before brand work |
