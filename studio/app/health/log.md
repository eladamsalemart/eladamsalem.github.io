# App health log

Each run of the scheduled session adds an entry (newest first). See PLAYBOOK.md.

## 2026-11-13: share links asked for pages that were not there

- Issue #8 again (since 03:33): three kinds of show page failed a request, `s/<slug>/index.html` (404 for Ritual, aborted for the others). Cause: the new Share links (43f67fb) asked the site, with a HEAD request, whether each show has a share page; a show without one was a failed request on every visit. Fixed: share_pages.py writes `share.json` (the pages that exist) and also a page for each real room (Ritual); app.js reads that list once and asks for nothing else. `studio/app/share.json` is an empty list for local runs. Checked on the live site after publish. No improvement tonight (the day's work was the artists' editor and the glass rooms).

## 2026-11-12: issue #8, a room's poster asked for under the wrong folder

- Issue #8 (since 11-10): Home asked for `data/spaces/ritual-elad-amsalem-2/preview.jpg`, 404. Cause: a second show with the same title gets the slug `…-2` and shares the room, but the walk row built the film/poster path from the show's slug, not the room's folder. Fixed in app.js `walkRow` (the room's own key, `data-space`). Local health.cjs passes with the fix; the run without the fix hung locally and was not completed, so the proof is the live site: failing before, checked again after publish. No improvement tonight.

## 2026-11-10: nothing to do

- Issue #7 closed itself (clean run after the 11-09 fix); no open issues or owner requests. health.cjs, check_home, check_app, deps.py pass on the live site (Home 17 ms frames). Last improvement 11-08, under 3 days ago: none tonight.

## 2026-11-09: issue #7, a tap target on Shows

- Issue #7 (opened 11-08 19:37): Shows' "On the map" link (`.nx-sh a.more`, new section header) was 82x18, missed by a finger at 44 px. Cause: the invisible touch-area list in index.html named `.sec-h a.more` but not `.nx-sh a.more`. Added it to both lists. Proof: with the fix health.cjs (local, phone) passes; without it, fails with the same message. Everything else passes on the live site; no improvement tonight (maplibre was 11-08).

## 2026-11-08: maplibre-gl 6.16.0 → 6.17.0

- Looked: no open issues or owner requests; App health green on every run since 11-04; health.cjs, check_home, check_app, deps.py pass on the live site (Home 2.2s, 17 ms frames). Four nightly runs had queued (11-05 to 11-08); this one run covers them.
- Improvement (last one was 11-02): maplibre-gl patch update, vendored (maplibre-gl.mjs, worker; CSS identical). Local health.cjs and check_app pass. Published (Open Studio app green); the live site serves 6.17.0 (after the 10-min cache) and health.cjs, check_home, check_app pass.
- Still available: three 0.187, supabase-js 2.119, playwright 1.65.

## 2026-11-04: nothing to do

- No open issues or owner requests; latest App health run green (earlier red ones on 11-03/04 were mid-publish, no issue left open). health.cjs, check_home, check_app, deps.py all pass on the live site (Home 2.4s, 17 ms frames). Last improvement under 3 days ago: none made. Notes: three, supabase-js, playwright updates still available.

## 2026-11-03: issue #5, the room's film "never played" once; check_home now says why

- Looked: issue #5 open (App health #11, 20:47: Home's check said the room's film never played; everything else
  passed). The other runs are green, and the newest publishes are checked. No owner requests.
- Measured, could not reproduce: on the live site the film plays every time (6 runs). It isn't a one-off server
  error: a 503 on the webm's first request falls back to the mp4, which plays, and a 503 mid-stream (the 2nd or 3rd
  range request) recovers. It isn't speed either: at 300 kbps it plays. The films are sound. Home's room is now
  Celebration (the virtual show, on now), not Ritual: 1080x1440, 38.8 dB, flicker 0.97. Not fixed by guessing.
- check_home.cjs said only "never played", and the run kept no picture of it. Now it says why (the video's state,
  what the host answered for each film file, or that Home took the video away because every source failed) and,
  in the App health run, saves home-film.png into the artifact. HOME_FAKE=<status>[@n|@*]:<regex> fakes the host
  to prove it: 404 on every film file fails with the reason and the picture; normal passes, locally and live.
- Seen on the way, for a next improvement: check_app.py checks the films of rooms in data/spaces/index.json only
  (Ritual), not the virtual rooms' (Celebration, The Green Hour), which Home now shows. Their measures pass today.
- No improvement tonight (one was made 2.11).

## 2026-11-02 (night, late): artists, virtual exhibitions, the control room (built in the main session)

- New to watch: virtual and curated shows and rooms, the studio's design screen, approved artists reaching the app
  (health.cjs); jszip (deps.py); the "Supabase functions" and "Owner requests" workflows; owner-request issues
  (PLAYBOOK 1b). Every check passes locally and on the server's publish.
- Fixed on the way: the app waited for the database before opening (+0.5 s on every page): now it opens at once.

## 2026-11-02 (night, later): every control is big enough for a finger (the owner approved)

- The touch area of every small control (map card buttons, kinds, follow, segments, chips, links in headings, the
  map's attribution) is now at least 44x44, drawn as an invisible ::after around it: nothing moves or changes look
  except the Shows "All" segment (37 → 46 px wide; it had overlapped "On now" by 1 px).
- The check: health.cjs now taps every control as a finger would (four points 21 px around its centre) and fails a
  page where one is missed. Before: most pages failed; after: every page passes. Pixel test, rule off vs on, same
  moment: 0 px on every page but Shows (the wider "All"); the place sheet differs only where the fixed tab bar lands
  in a full-page shot, which differs on vs on as well.

## 2026-11-02 (night): the first nightly run, and the first improvement

- Looked: no open `app-health` issue; the last runs of App health (#4), Open Studio app, Studio spaces and Art map:
  exhibitions are green. On the live site every check passes (health, Home, app, libraries: no known
  vulnerabilities). The screenshots (Home, Work, Map, the 3D room) look right.
- Improvement (accessibility): the Work page had no heading, so a screen reader had nothing to jump to. The work's
  title is now the page's `<h1>`, styled exactly as the bold title it replaces: the label is pixel-identical at
  390x844, light and dark. health.cjs: the note is there on the live site (before) and gone locally (after);
  every check passes locally.
- Still to improve: tap targets under 30 px (the map's place card has 14: a change of look, so for the owner),
  three 0.170 → 0.187, supabase-js 2.45 → 2.118, playwright 1.56 → 1.64.
- Setup proven end to end: this entry was pushed by the scheduled session.

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
