# App health log

Each run of the scheduled session adds an entry (newest first). See PLAYBOOK.md.

## 2026-11-02: the stage is set up

- Built the checks: `health.cjs` (every kind of page as an iPhone sees it, Home's speed, the 3D room, the way in),
  `deps.py` (outside libraries: known vulnerabilities and newer versions), with `check_home.cjs` and `check_app.py`.
  The "App health" workflow runs them on the live site after every publish and every three days, and opens an
  `app-health` issue when something is broken.
- Its first run found a bug: the Works page was 392 px wide on a 390 px phone (the works grid's squares grew past
  their columns). Fixed (`.grid .im` may shrink); proven by putting the bug back, which the check caught.
- A false alarm fixed in the check: map tiles the map stops asking for when its view moves (ERR_ABORTED) are normal.
- To improve (from the first run): tap targets under 30 px on most pages (the map's place card has 14); the Work
  page has no heading for screen readers; newer versions of three (0.170 → 0.187), maplibre-gl (4.7 → 6.16),
  supabase-js (2.45 → 2.118), playwright (1.49 → 1.64). No known vulnerabilities.
