# Working on Open Studio

- Reply and summarise to the owner in Hebrew. App content stays in English.
- Studio lives on the `studio` branch; the app is published from it ("Open Studio app" workflow), and every
  exhibition's 3D tour is rebuilt and inspected on the server ("Studio spaces" workflow) whenever its
  content, the pipeline, the inspection or the viewer (`studio/app/space/space.js`) changes.

## The app is used on phones: a change is done only when it works there

Work happens on a computer, but visitors open the app on a phone (an iPhone first). Before saying a change
to a tour or the viewer is done:

1. Run the full inspection locally, with the phone pass:
   `PYTHONPATH=. python3 -m studio.app.space.pipeline --inspect <slug> --keep <dir>`
   It must pass every check (`phone`, `floor_seams`, `works_in_view` included). Never loosen a rule to make
   a tour pass; fix the tour.
2. Look at the shots yourself (the inspection's frames, and the place in question in a phone-sized
   browser, 390×844, `isMobile`, opened without `?inspect`, as a visitor opens it). A check that passes
   is not proof that it looks right.
3. When a bug reaches the owner that the inspection did not catch: fix the bug, then add or fix the check
   that should have caught it, and prove it does, by putting the bug back and seeing the inspection hold
   the tour back (`INSPECT_BLOCK=<pattern>` makes images fail to arrive on the phone).
4. Push, then follow the server's "Studio spaces" run to the end: the tour is done when the server's own
   inspection passes it, not when the local one does.
