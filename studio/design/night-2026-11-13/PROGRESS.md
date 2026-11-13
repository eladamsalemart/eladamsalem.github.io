# Night 13.11.2026: progress (kept current; a fresh session continues from here)

Owner's words (13.11, 00:30): work all night on Open Studio for artists: improve what's needed by his guidelines, and perfect
the THREE rooms (white-cube, concrete, glass-pavilion). The pause until Saturday is lifted for this. If usage runs out, a
scheduled task restarts the work when it returns.

Rules: studio/design/night-2026-11-11/RULES.md and RESUME-SATURDAY.md. One worker at a time, no parallel heavy helpers.
Commit and push every finished piece at once. While working, write `date +%s > .claude/night-heartbeat.txt` every 10-15 minutes
(a scheduled session that finds it younger than 25 minutes stops at once: someone is already working).

## Done tonight (all pushed to studio)
- Fonts served from studio/app/vendor/fonts.
- Rooms: night-rooms3 (74c7d05) merged; pavilion wings moved away from the way in, standing walls drawn smooth white (4b8b55d).
  The pavilion opens from its corner, looking along the glass (synth.js `start`).
- Hanging (956b59d, 0b37b6a): an empty room opens on the artist's works; a work never lands on glass (strict free-spot search,
  then the nearest wall that has room); the view turns to a work hung on another wall; Done stays in reach under the preview bar.
- Artist finishes from night-artist2 (1da98d9) merged. tests/artist_journey.cjs now hangs a first work and leaves; passes.
- Share links (43f67fb; workflow also on main 64e6ea4): share_pages.py writes s/<slug>/ and by/<slug>/ at every publish;
  Share button on the exhibition page; the artist's Share uses the share page when it exists.

- Hanging (13a4934): a work hung more than 5.5 m away is walked up to.
- Rooms (4881ed0): concrete-large lit brighter (slot 1900, ambient 80). Local quick renders (16 samples) show white-cube-large
  neutral, pavilion floor light terrazzo, concrete-large workable.
- Live share pages checked: /open-studio/s/celebration-virtual/ answers 200 with og:image.
- Morning report written: summary.md (update its rooms section once the bake is in the app).

## In progress
- Waiting for the "Studio rooms" bakes (b0dd235 running since 22:46 UTC, then the newest push) to finish and publish.

## Next, in order (for a restart session)
1. If the bake finished: open #/studio/onview at phone size, look at the three kinds in every size (white cube large must not be
   blue, pavilion floor grey, concrete large not dark). Fix what the photographs show; update summary.md.
2. If it has not finished: nothing to do; do not start a second worker. Stop.

## 13.11 07:50
Bake finished and published; renders checked (white cube neutral, pavilion floor light, concrete large a little dark but workable). summary.md updated. List done.

- Owner confirmed 13.11: the third room kind is glass-pavilion.
