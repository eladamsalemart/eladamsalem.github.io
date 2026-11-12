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

## In progress
- Waiting for the "Studio rooms" bakes (b0dd235, then 4b8b55d) to finish; then look at the three kinds at phone size
  (scratchpad rooms.sh, or just open #/onview) and at the pavilion's floor (should be grey terrazzo, not brown).

## Next, in order
1. Check the live share page: https://eladamsalem.com/open-studio/s/celebration-virtual/ (200, og:image present).
2. Rooms after the bake: fix what the photographs show.
3. Hebrew morning report: studio/design/night-2026-11-13/summary.md.
