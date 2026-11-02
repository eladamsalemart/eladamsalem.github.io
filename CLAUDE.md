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

5. The app itself is checked before it publishes (`studio/app/check_app.py`, in the "Open Studio app" workflow).
   A screenshot taken with an outside service stubbed out (map tiles, fonts) proves nothing about that service:
   the map once showed only "API KEY REQUIRED" watermarks on phones while local shots, with stubbed tiles, looked right.

## Design

- For any UI work, use the design skills in `.claude/skills` (sources in `.claude/skills/SOURCES.md`): `impeccable`
  (shape, critique, audit, polish; the app is mostly an Operate surface, exhibitions and tours are Experience),
  `design-taste-frontend` (taste-skill; its app run for app screens), and Emil Kowalski's (`emil-design-eng`, and the
  animation skills: `animate`, `review-animations`, `improve-animations`, `animation-performance`).
- Keep the app's own world: Studio Paper, the atlas map, the opening-night look. A skill's advice never replaces it
  without the owner's word.
- Look at it with Playwright as an iPhone (the `playwright` MCP in `.mcp.json`, or a script), and check it with the
  owner in Figma when a design is to be agreed first (Figma connector, from claude.ai).

## Where things stand (keep this up to date: every new session starts from it)

**Working with the owner.** A startup; the owner's time goes to the product. Do what the tools allow without asking
(the owner said so); ask only for what needs their own login or money. Never ask for a key in the chat: secrets go in
GitHub secrets or the environment's settings. Report briefly, in Hebrew.

**Accounts and what reaches them from a session**
- GitHub `eladamsalemart/eladamsalem.github.io`: code on `studio`, the live site on `main` (eladamsalem.com/open-studio/).
  Workflows that run on a schedule or by hand are read from `main`: a change to one goes to both branches.
- Supabase project `open studio`, ref `hlpzqeosdavfuzjgpwhy` (region ap-northeast-2), publishable key in
  `studio/app/auth.js`. The Supabase connector reaches the database, SQL, migrations, logs and edge functions. The
  sign-in settings (URLs, SMTP, email templates, providers, rate limits): the "Supabase settings" workflow, through
  the management API (secret `SUPABASE_ACCESS_TOKEN`): set them in `studio/supabase/auth.json`, run it with `apply`;
  `show` writes what is set now to `studio/supabase/auth.live.json` (no passwords or keys).
  Set: Site URL `https://eladamsalem.com/open-studio/`, redirect `https://eladamsalem.com/open-studio/**`, custom SMTP
  through the app's Gmail, 30 emails an hour, the code (`{{ .Token }}`, 6 digits) in Confirm signup and Magic Link.
  Both sign-in emails are Open Studio's own (the code in the subject, a token_hash link that works in any browser).
  Email sign-in proved end to end on 1.11, on the live site, by link and by code. Google: on since 2.11 (Google Cloud project open-studio-513508, its client in GOOGLE_CLIENT_ID/SECRET; the
  button reaches Google's sign-in). The consent screen was still in Testing (only test users) until its Branding page
  (home page, privacy.html, authorized domains) is filled and the app published. Apple: not wanted (the owner said Google is enough); Facebook: no; Instagram login doesn't exist for apps.
- The app's mailbox ooopenstudio@gmail.com: the Gmail connector (drafts, reading, labels). It is subscribed to
  galleries' newsletters (`studio/app/artmap/newsletters.json`); the daily read takes their openings and shows.
- Figma file `eLDsgYWEfoqx49oFQJ53c1` (Studio Paper variables and text styles, Home components, Home screen).
- GitHub secrets: `ART_MAIL_PASSWORD` (Gmail app password, for the daily read), `SUPABASE_SECRET_KEY`, `SUPABASE_ACCESS_TOKEN`,
  `ANTHROPIC_API_KEY` (empty: the free model, Ollama, reads instead).

**Workflows** — "Open Studio app" publishes `studio/app` to the site (after a push there, after "Art map: exhibitions"
and "Art map: places", or by hand); its copy step names every file, and a check fails it when the app loads one
that wasn't copied. "Art map: exhibitions" daily (sites, newsletters, Makore; parts by hand: `mail`, `links`).
"Art map: places" monthly. "Art map: newsletters" by hand (sign up, `only` to retry). "Studio spaces": 3D tours.

**The app now** — a new visitor signs up (`#/welcome`, `auth.js`): with email (a 6-digit code), then a details step
(`#/welcome/details`: first and last name, age, country, gender), or with Google/Apple (the name comes from the account,
no details step). Then artist or art lover; an artist sees "Your studio is being built", an art lover the app. Each
account has a row in `public.profiles` (RLS: own row only; a trigger on `auth.users` creates it and fills the name from
Google/Apple). Google and Apple buttons show only when Supabase has them on: the "Supabase settings" workflow switches
them on when the GitHub secrets `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` and `APPLE_SERVICES_ID`/`APPLE_TEAM_ID`/
`APPLE_KEY_ID`/`APPLE_P8` exist (it re-applies monthly: Apple's secret lives six months). Shared links (show, artist,
work, place) open without an account; `?guest` and `?inspect` skip the gate for checks.
Home (2.11) is "Daylight, by hand", the owner's choice: a pastel sky that follows the hour, drawn over in a fine pencil
(no title, no "you", no legend). Near stars: what this phone opened last (`os-recent`), tied as the trail you took;
then your artists (`os-following`) and their shows; far out (pinch, or a double tap): artists and 3D rooms you haven't
met and the shows on now near you (`data/art`). Under it: Walk in now (a short film of the room turning, `data/spaces/<slug>/preview.mp4|webm|jpg`, made by
`space/preview.cjs` and by the Studio spaces workflow for a new or rebuilt room; Step inside opens the real room), your artists, their
shows, On now near you (a drawn map of the nearest places with a show today). Code: `home()`/`mountHome()` in app.js,
the engine `sky.js`, styles `.hs` in index.html. The design source and its variations: `studio/design/home-sky/`.
Speed on a phone (2.11, the owner found Home very slow): measure with a 4x CPU slowdown before calling it done. A live
WebGL room in a frame, a sky redrawn every frame at rest, and SVG filters (feTurbulence) on moving elements together
gave 2 fps; now 60 (sky.js draws only while something moves, ties on a canvas, washes as one masked image).
`check_home.cjs` opens Home as a phone in the publish workflow (stars, room, near you, no script error).
Handwriting rule (the owner's): the pencil hand (`.lh`, 'Waiting for the Sunrise') marks only what is live now: a
show on or opening, its last days, tonight's events, the studio's notes. Everything else stays in type.

**Open** — Home: from the ten (`studio/design/home-ten/`) the owner liked the constellation (not its black) and the
artist's hand, and asked for Home as a sky of what they used last (near), with who and what they haven't met further
out (pinch to step back), a live tour you can step into on Home, then the map, shows on now, your artists; pastels.
Four working directions: `studio/design/home-sky/` (shared engine `sky.js`, page `home.js`), live at
eladamsalem.com/open-studio-lab/home/ (a copy on `main`, folder `open-studio-lab/home`), PDF there. The owner chose the
daylight sky with tracing paper's pencil, and no Wander (gestures live on Home): that is `day.html` (`day.js`, `day.css`),
with three variations (`day-graphite`, `day-watercolour`, `day-paper`), page `daylight.html`, PDF
`open-studio-daylight-by-hand.pdf`. Home is built (see The app now); next: carry its look across the app's energy (the owner likes the artist page, the map, exhibitions and tours as they are); the artists' platform; publishing the Google consent screen (Branding, then Audience, Publish app); the owner signs up by hand to the 13
newsletters behind a CAPTCHA (list in `newsletters.json`, status `captcha`/`asks for a phone`); the Ritual ceiling
(task #34 in the old list).
