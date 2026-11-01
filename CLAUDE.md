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
  Email sign-in proved end to end on 1.11. Google, Apple, Facebook: not connected yet (need the owner's developer
  accounts); Instagram login doesn't exist for apps.
- The app's mailbox ooopenstudio@gmail.com: the Gmail connector (drafts, reading, labels). It is subscribed to
  galleries' newsletters (`studio/app/artmap/newsletters.json`); the daily read takes their openings and shows.
- Figma file `eLDsgYWEfoqx49oFQJ53c1` (Studio Paper variables and text styles, Home components, Home screen).
- GitHub secrets: `ART_MAIL_PASSWORD` (Gmail app password, for the daily read), `SUPABASE_SECRET_KEY`, `SUPABASE_ACCESS_TOKEN`,
  `ANTHROPIC_API_KEY` (empty: the free model, Ollama, reads instead).

**Workflows** — "Open Studio app" publishes `studio/app` to the site (after a push there, after "Art map: exhibitions"
and "Art map: places", or by hand); its copy step names every file, and a check fails it when the app loads one
that wasn't copied. "Art map: exhibitions" daily (sites, newsletters, Makore; parts by hand: `mail`, `links`).
"Art map: places" monthly. "Art map: newsletters" by hand (sign up, `only` to retry). "Studio spaces": 3D tours.

**The app now** — a new visitor signs up (`#/welcome`, `auth.js`), chooses artist or art lover (kept on the account,
user metadata `role`); an artist sees "Your studio is being built", an art lover the app. Shared links (show, artist,
work, place) open without an account; `?guest` and `?inspect` skip the gate for checks.

**Open** — the owner chooses a Home direction (`studio/design/home-concepts/`, PDF there; recommended: the wall),
then it is built; the artists' platform; Google/Apple/Facebook sign-in; the owner signs up by hand to the 13
newsletters behind a CAPTCHA (list in `newsletters.json`, status `captcha`/`asks for a phone`); the Ritual ceiling
(task #34 in the old list).
