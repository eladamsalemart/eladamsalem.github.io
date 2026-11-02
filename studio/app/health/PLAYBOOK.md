# App health: the playbook of the scheduled session

A Claude session starts on its own every night (a scheduled task on the owner's account). It keeps Open Studio
working on phones and makes its technology a little better each time. Read the project's `CLAUDE.md` first: its
rules hold here (Hebrew to the owner, phone first, never loosen a check, follow the server to the end).

## 1. Look (every night)

1. `git fetch` both branches; work on `studio` (workflows also go to `main`, as CLAUDE.md says).
2. Open issues labelled `app-health` (GitHub) and the last runs of "App health", "Open Studio app", "Studio spaces",
   "Art map: exhibitions". A red run or an open issue is the first job.
3. Run the checks yourself, on the live site:
   - `node studio/app/health/health.cjs https://eladamsalem.com/open-studio/ /tmp/health`
   - `node studio/app/check_home.cjs https://eladamsalem.com/open-studio/`
   - `python3 studio/app/check_app.py`, `python3 studio/app/health/deps.py`
   Look at the screenshots in `/tmp/health` yourself: a check that passes is not proof that it looks right.
4. Read `studio/app/health/log.md`. **Nothing broken, nothing published since the last entry, and an improvement made
   less than 3 days ago: write one line in the log and stop.**

## 1b. What the owner asked for

Open issues labelled `owner-request` are the owner's own words, from the control room (#/admin → Ask for a change).
Each is a task: do it this night if it is clear and small, check it on a phone like any change, say what you did on
the issue and close it (mark the request done: `update change_requests set status='done' where issue=<n>` through the
Supabase connector, if it is there). A request that changes the look, sign-in or data is the owner's word for it.
One that is large or unclear: ask on the issue and in the report, in Hebrew.

## 2. Fix what is broken (always first)

For each FAIL: find the cause (measure, don't guess), fix it, and prove it:
- the check passes on the fixed code, run locally (`python3 -m http.server 8765` at the repo root,
  `http://localhost:8765/studio/app/`), at phone size, light and dark;
- **put the bug back and see the check fail**, then restore the fix. If no check caught it, add or sharpen one
  first (in `health.cjs`, `check_home.cjs` or `check_app.py`), and prove it the same way.
- Push, follow "Open Studio app" to green, then run the checks on the live site again. The issue closes itself on the
  next clean "App health" run; say what you fixed in a comment on it.
A false alarm in a check is fixed in the check, narrowly (name exactly what is benign and why), never by loosening it.

## 3. Improve one thing (when nothing is broken, at most every 3 days)

Take **one** item, the most valuable, from:
- the NOTES of `health.cjs` (tap targets under 30 px, images without alt text, headings, slow pages);
- `deps.py` (a newer version of three, maplibre-gl, supabase-js, playwright): read the release notes for breaking
  changes, update, and check every page that uses it on a phone (the 3D room and the full space inspection for
  three: `PYTHONPATH=. python3 -m studio.app.space.pipeline --inspect <slug> --keep <dir>`; the map for maplibre;
  signing in for supabase-js, by the code, with the app's mailbox);
- speed (measure Home and the heaviest pages with a 4x CPU slowdown; a frame over 17 ms at rest is worth a look);
- the app's offline/installed behaviour, accessibility, and errors in the browser console.
Ship it only when every check passes before and after, on the live site too. If it can't be finished well, leave it
and write in the log why.

## Never, without the owner's word

- change how the app looks or what it says (design, copy, the order of a page): suggest it in the report instead;
- touch sign-in settings, Supabase's schema or data, secrets, money, the owner's accounts;
- delete content, rewrite history, force-push, or disable/skip/loosen a check;
- make more than one improvement in a run.

## 4. Write it down and tell the owner

Add an entry to `studio/app/health/log.md` (date; what was broken and how it was fixed; the improvement; what the
checks say now; anything that needs the owner) and commit it. Then a short report to the owner, **in Hebrew**: what
you found, what you fixed, what you improved, with the link; and plainly what needs them, if anything.
On a night with nothing to do, no report.
