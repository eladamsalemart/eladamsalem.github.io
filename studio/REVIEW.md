# Studio — Self-review log

The proposal went through two critical review rounds after the first draft (v1). Each round looks for weak assumptions, contradictions, and things that would fail in reality. Every finding lists what changed.

## Round 1 — feasibility and quality (v1 → v2)

| # | Finding | Change |
|---|---|---|
| 1 | **The quality bar blocked the pilot.** v1 required 6,000 px, colour-checked images for any work in the 3D space. All 95 of Elad's current images are 2,000 px, so not one work could hang. Few artists can produce 6,000 px without a professional. | Hanging in a space needs **4,000 px**, straight-on, colour-managed. 6,000 px plus a colour target earns the **Studio Standard** badge and full deep zoom. Added **Studio capture days**: professional reproduction sessions per city, which turn the barrier into a service and a community event. |
| 2 | **Sizes weren't enforced.** 17 of 47 of Elad's works have a stated size that doesn't match the photo, 7 have two sizes, 1 has none, and the order switches between h × w and w × h. | Size is a **hard gate** at upload: the photo's aspect ratio must match the stated size within 6%. One convention everywhere, **H × W × D in cm**, as in museums. The 3D space only hangs verified sizes. |
| 3 | **The review console contradicted the standard.** It approved a 2,000 px work. | Fixed the mock-up. Below-standard works are returned with the reason. |
| 4 | **Colour in 3D is not reference colour.** Spotlights and tone mapping change how a work looks. | Added a **True colour** toggle (even, flat light) in the space. The work page stays the colour reference. |
| 5 | **Human review of every work doesn't scale linearly.** At 5,000 artists, it is about 2 full-time reviewers. | Kept the rule (every work approved by a person), and added **trust tiers**: artists with a clean record get a lighter, faster review, never an automatic one. The cost is budgeted (people, not cloud, are the main cost). |
| 6 | **"Active artist" excluded people unfairly.** A rule of "exhibited in the last 3 years" shuts out self-taught artists and those between shows. | Two routes in: *exhibition history* or *portfolio review by the committee*. Plus an open call attached to each Issue. |
| 7 | **Security.** v1 showed where each work is. | Public location is **country/city only**, never an address. The studio photo is visible to reviewers only. |
| 8 | **Rights and AI.** Not addressed in v1. | Terms: the artist keeps all rights, there is **no AI training** on Studio content, and full-resolution files are never downloadable (deep zoom is served as tiles). |
| 9 | **Accessibility.** The 3D space had no alternative. | Every show has the 2D walkthrough, alt text, keyboard navigation (← →), and reduced-motion support. |

## Round 2 — product and launch (v2 → v3)

| # | Finding | Change |
|---|---|---|
| 1 | **Cold start.** A platform of approved artists with no audience. | The growth loop is the artist's own link: each **On View link replaces the artist's link-in-bio**. Artists bring their audience, as musicians share Spotify links. Launch city by city, starting in Tel Aviv with 20 invited artists. |
| 2 | **Where do physical shows come from?** v1 assumed a listings database. | Artists add their own shows (as Spotify artists list concerts). Each listing is checked like a work. Venue submissions come later. |
| 3 | **The pilot was too big.** v1 Phase 1 included City and Issues. | **Phase 1 = one artist (Elad), web only, one space, follow by e-mail.** City, Issues and accounts move to Phase 2–3. |
| 4 | **Realism had no owner.** The prototype space is procedural. A production space needs modelling and light baking. | Spaces are modelled and baked in Blender (lightmaps, KTX2 textures) by a 3D artist, as a budget line with the quote left open. Captured real shows (Gaussian splats) are the second source of spaces. |
| 5 | **No way to tell if the pilot works.** | Added pilot goals, stated as hypotheses to test, not facts: median visit length, follow rate from a visit, and artist satisfaction. |
| 6 | **The name.** "Studio" is generic and can't be owned (domain, trademark, search). | Marked as a decision needed before any brand work. Shortlist in the deck. |
| 7 | **Mixed-media works** (e.g. *Woman and a gun*: oil on canvas and ceramics). | A work can have up to 2 kinds plus a free materials line. Medium stays a tag for filtering, never the structure. |
| 8 | **Cost numbers needed their assumptions shown.** | `research/cost_model.py` states every assumption as a constant, and the deck shows the assumptions next to the totals. |
