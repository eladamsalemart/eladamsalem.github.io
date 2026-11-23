# How Open Studio grew, what worked, and how its parts connect

Written 23.11 from the 1,255 commits and every message from the owner. `QUALITY.md` covers what went wrong. This file
covers what went right, and the map of the app. Read both before you start. Add a line here whenever a stage turns,
the owner approves something, or a new link between parts appears.

## Stages (November 2026)

1. **1–2.11 The shell.** Publish workflow, sign-in (email code, Google), the art map's daily reads, the App health
   stage. The owner chose Home "Daylight, by hand" from ten directions: a pencil hand, and a sky that follows the hour
   (`sky.js`, `mountHome` in `app.js`).
2. **2–3.11 Artists and virtual exhibitions.** `artist.js`, `studio-cloud.js`, media import, the control room
   (`admin.js`), and rooms drawn in `space/synth.js`. The owner signed up as a new artist and found the gaps himself.
   That led to real artists in the demo and ten reusable rooms. He loved Ritual's tour.
3. **3–9.11 Realism nights, On View, the hang editor in the room.** Rule from 8.11: the artist chooses the space first, then hangs.
4. **9–11.11 The Desk and the museum street.** The Desk (`studio/desk`), `museum_exhibitions` and `museum_slots`.
   Museum direction A, the street, chosen from five. Home fixed on 10.11. Rooms cut to three: White cube, Raw concrete,
   Glass pavilion.
5. **12–14.11 The editing chain and the review gate.** Plan view, standing walls at any angle, share pages, and
   `virtual_shows.status` with its guard trigger. Every show is approved before it goes live. VISION: real exhibitions first.
6. **14–17.11 The museum becomes one building.** "Under One Sky" (`SKY_PLAN`, `museum_plan`), Ritual's pavilion, and
   text plates. On 16.11 the owner restarted the sync work from zero, which became "one artist, one source, always through review".
7. **17–21.11 Night shifts and the full-chain test.** `NIGHT.md`, `museum-night-shift`, show films, the owner's own
   test of the hang editor, and `BACKLOG.md` as the single list. "Work more correctly and save tokens."
8. **21–23.11 Real vs virtual, and quality.** MY OPEN STUDIO (direction D, the round window), the orb on the map,
   wall text placed like a work, the Desk museum redesign (A+C), original-space pavilions, the tropical garden,
   `QUALITY.md`, and one "Open studio" session folder.

## What worked: do more of it

- **Research, then 3 to 5 real-looking options, then he picks.** It worked every time: Home (2.11), museum A (10.11),
  Under One Sky (16.11, "I love the new design"), the round window D (22.11), Desk A+C (22.11). Big looks are never
  guessed.
- **He tests it as a user, then hands over screenshots.** The best fixes came from his own walk-through, so walk it
  the same way before he does.
- **The full-chain test with a test account** (send, approve, see it everywhere) proved sync better than any single check.
- **Night shifts with a progress file and a heartbeat, on Sonnet, resuming by themselves.** He likes work that keeps
  going without him.
- **Fixed, approved things stay fixed:** Home (10.11), the three rooms, the circle between the two captions (22.11).
  Copy what he loved into new places, such as the round window on Home, the artist page and the map.
- **Short Hebrew reports and a choices popup.** He says "excellent" when the plan is clear and he can say "do it alone".

## How the parts connect

**Where things live**
- Virtual shows: the `virtual_shows` table (room, paint, works with `{wall,a,y}`, plinths, text, status, on_view).
  Demo shows: `data/virtual.json`.
- Real exhibitions: `artists.exhibitions` (jsonb) and `content/exhibitions.json`.
- The museum: `museum_exhibitions` (drafts), `museum_slots` (live), `museum_plan` (the building), and `app_hidden`.
- 3D tours: `data/spaces/<slug>.json` plus textures, film and poster.

**The artist's chain**
1. `artist.js` holds the state. `studio-cloud.js` `save` and `push` upsert `virtual_shows` and read the row back.
2. `space/hang-editor.js` `openHangEditor` edits the placements on top of `synth.js` `buildRoom` and `space.js` `openSpace`.
3. `setStatus` sends the show for review. `virtual_shows_guard` lets only an admin publish.
4. `admin.js` approves. The Desk (`desk/museum.js`, `exedit.js`, `data.js`) runs the museum: `saveSlot`, `savePlan`.

**Who reads it**
- `app.js` `communityData` (an explicit column list), then `showOf`, feeding Home `mountHome` (plus live
  `museum_slots`) and `artistPage`.
- `artmap.js` turns each artist into a `studio-<slug>` place.
- The museum: `enterStreet`, then `buildSky` in `synth.js`, with `props.js`, `outdoors.js` and `tropics.js`.

**The workflows**
- "Studio spaces": the pipeline build and inspection, phone pass included. It runs on content, pipeline, inspection or `space.js` changes.
- "Artist tours": every 3 h.
- "Virtual show films": every 2 h.
- "Open Studio app": publishes `studio/app` and `studio/desk`.
- "App health": runs after each publish.
- "Supabase migrations": additive only.

**A change in X must be checked in Y**
- `virtual_shows` shape: the migration, `rowToShow`, the select lists in `app.js` (`communityData`, `enterStreet`)
  and `admin.js`, `showOf`, and the Desk. Then walk the whole chain.
- `synth.js` or `space.js`: the hang editor, the artist preview, the Desk preview, the museum, the Home films, and
  every tour rebuilt by "Studio spaces". Run the inspection and the phone pass.
- A new file the app loads: add it to the copy step of "Open Studio app", or the publish check fails.
- A scheduled or by-hand workflow: change it on both `main` and `studio`.
- `app_hidden`: it changes what App health counts as broken.
- An exhibition shown in one place (Home, the map, the artist page, the museum, Shows): check all the others.

## Open threads (keep `BACKLOG.md` and `museum-sky/ROADMAP.md` as the lists)

- Museum: Ritual at the quality of its original, its arches and its wall text (in progress, 23.11). The tropical
  garden at about 15% of 100%. Roadmap items 9, 11, 13, 18 open; 15–17 partly done.
- Product: real exhibitions first on Home and Shows (stage C). Bring work in on one screen (B). Nothing checked yet
  on a real iPhone (E). The museum taking an artist's show as a linked copy.
- Waiting on the owner: `ANTHROPIC_API_KEY` for the control-room agent, the Meta developer app, newsletter sign-ups
  behind a CAPTCHA.
