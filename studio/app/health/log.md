# App health log

Each run of the scheduled session adds an entry (newest first). See PLAYBOOK.md.

## 2026-11-02 (evening): the stage's own two faults, fixed

- Run #2 closed issue #1 with "All checks pass again" and an empty report: its browser had not installed, so
  nothing was checked. The workflow now treats "could not run" as broken (it comments, never closes).
- Run #3 found everything clean but one request: the room's film answered 503 once, right after the publish; it
  answers 200 every time since. A server error is now asked again a few seconds later: a hiccup becomes a note, an
  error that stays is broken; a 404 is broken at once. Proven with HEALTH_FAKE (503 once on the film: a note; 404:
  broken; on a script: broken, since the page really breaks).
- The browser workflows run on Ubuntu 24.04: GitHub's runners moved to 26.04, where playwright 1.56.1 can't
  install (the publish check stopped a publish there; nothing broken reached the site).

## 2026-11-02 (later): the first issue, fixed

- The first server run of "App health" opened issue #1: two known vulnerabilities, which the local run had missed
  (the container's proxy blocks GitHub's advisory API, and `deps.py` took "couldn't ask" for "nothing known").
  The check is fixed: it asks OSV first (reachable from anywhere), GitHub second, and says so when it can't ask.
- maplibre-gl 4.7.1, CRITICAL (GHSA-jrc7-96c5-q579, XSS in DOM.sanitize; the app doesn't call it, but the attribution
  HTML goes through it): updated to 6.16.0, which is a module now (vendor/maplibre/maplibre-gl.mjs and its worker;
  artmap.js imports it). The map compared before and after at three places (area, a place up close in 3D, Haifa):
  the same; no errors. One difference: v6 keeps only the tiles in view, so "where you are" is named from fewer
  neighbourhood labels (the map's tiles carry them from zoom 14 only); it now also looks again each time the map
  has loaded more. Every check passes (app, Home, every page).
- playwright 1.49.1, HIGH (GHSA-7mvr-c777-76hp, browser download without verifying SSL; CI only): pinned to 1.56.1,
  the version every local check and tour inspection already ran on, in the three workflows.
- Left to improve: three 0.170 → 0.187, supabase-js 2.45 → 2.118, playwright → 1.64; tap targets; the Work page's
  heading.

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
