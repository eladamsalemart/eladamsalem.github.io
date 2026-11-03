# Handoff (3.11): what is open right now

From the cloud session that built the artists' studio, virtual exhibitions and the control room. Read CLAUDE.md first.
Reply to the owner in Hebrew.

## Why there is a local session now
The owner wants the work done on their own computer (Windows, computer name ELAD), not only told what to do.
Remote Control to a cloud session doesn't work there (the folders show as "not available" even on the latest app),
so this local session (Claude desktop app, Code, Local, folder Documents\EladAmsalem-Studio) does the computer part:
the browser (Claude in Chrome or Computer use) for accounts that need the owner's login. Stop only for sign-ins
and approvals; never ask for a key in the chat (secrets go in GitHub secrets).

## Open, in order
1. Instagram direct connection (owner's wish; free). The owner was in Meta Business Suite by mistake: the app is
   made at developers.facebook.com → My Apps → Create App → use case "Manage messaging & content on Instagram" →
   "API setup with Instagram login". Their Instagram (Elad Amsalem Art, 4.4K) is already professional and linked to
   a Facebook page. 3.11: the owner created the Meta app "Open Studio" by hand (use case Instagram, no business
   portfolio): Meta App ID 978863398102531. After the owner signed in again the agent's Chrome reached the
   dashboard and filled App settings → Basic (display name Open Studio, contact ooopenstudio@, privacy + data
   deletion URLs, domain eladamsalem.com, icon, category Lifestyle; saved and re-checked). New business portfolio
   "Open Studio" (id 1146130931285277, owner's choice, unverified: verification needed before App Review)
   connected to the app. Meta says "API setup with Instagram login is not available for newer apps": this app
   uses Unified login = Facebook Login for Business with a configuration (login variation, permissions) and a
   registered redirect URL, so an artist connects through Facebook and their Instagram must be professional and
   linked to a Page. No separate Instagram keys: INSTAGRAM_APP_ID = the Meta App ID, INSTAGRAM_APP_SECRET = the
   App secret in App settings → Basic. Built 3.11: function `instagram` (start/status/media/disconnect; Facebook's
   return lands on it, so it's deployed --no-verify-jwt and checks sign-ins itself), table `public.instagram_links`
   (RLS on, no policies: the function's service role only), "Connect Instagram" in #/studio/import (the export zip
   under it). Meta: use case permissions instagram_basic, pages_show_list, pages_read_engagement; FLfB configuration
   "Open Studio import" 28954169344235251 (user access token); redirect URI
   https://hlpzqeosdavfuzjgpwhy.supabase.co/functions/v1/instagram. The "Supabase functions" workflow copies the GitHub
   secrets INSTAGRAM_APP_ID/SECRET into the function's settings (`supabase secrets set --yes`); done 3.11, the
   function answers (401 without a sign-in). First test (owner, phone, 3.11 09:23): Facebook returned to the function
   twice (302) but no Page with instagram_business_account came back, so nothing was saved ('noaccount'); the owner
   says it "just returns to the app". Since then the function logs, on 'noaccount', the Pages Facebook gave and the
   granted permissions (`instagram noaccount` in function logs). Paused by the owner ("later"): next time, ask for
   screenshots of each Facebook screen, read that log, check the Page is chosen in the dialog and that the IG account
   is linked to the Page. Also fixed 3.11: the website field refused www.… on iPhone (type=url).
   Needed for the app: privacy policy https://eladamsalem.com/open-studio/privacy.html (names Instagram since 3.11),
   data deletion instructions https://eladamsalem.com/open-studio/data-deletion.html (live 3.11), icon (studio/design/google-brand-logo-120.png or the
   app icons), category. Put App ID / App Secret in GitHub secrets INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET. Then
   build "Connect Instagram" in studio-cloud.js / artist.js (#/studio/import) through a Supabase function holding
   the secret; app review for instagram_business_basic later (screencast, description). Until approved it works
   for testers only; the export zip keeps working for everyone.
2. Google brand verification: DONE 3.11 (Search Console file on `main`, Branding verified and published; the sign-in
   window says "to continue to Open Studio"). No logo uploaded (it would need Google's review); add later if wanted.
2b. Drive in Bring work in (3.11, built): "Choose from Google Drive" = Google Picker + GIS token (drive.file), files
   downloaded in the browser (studio-cloud.js prepareDrive/fromDrive); the folder link stays under it. Project
   open-studio-513508 is ooopenstudio@'s (in the owner's Chrome as authuser=1): Picker + Drive APIs on, browser key
   "Open Studio Drive picker (browser)" (Picker only; eladamsalem.com/*, localhost:8088/*), client 565397252258-9r716…
   already has origin https://eladamsalem.com. Owner tested it 3.11: works.
   Also 3.11: found works scroll into view on a phone; every studio page has "← Open Studio" back to the app. Step 1 is a Search
   Console HTML tag on https://eladamsalem.com/ (the site's root index.html is on `main`). Google sign-in itself is
   already in production (published 3.11).
3. Leftover: change_requests row with issue 3 (a test) still in the table, status filed; delete it.
4. Done 3.11 (owner's list): (a) the demo's made-up artists replaced by ten real public-domain artists (5 women, 5 men),
   six works each with real size/year/medium/collection (`studio/app/make_world.py`: Wikidata + Commons; galleries and
   shows stay made up and the artist page says so; demo studio = Berthe Morisot's; The Green Hour hangs real works
   beside Elad's; "Studio spaces" now refilms a virtual show when its works change). (b) Control room `#/admin` opens
   on an Overview: numbers, artists waiting, new works to look at (`works.reviewed_at`, `works.hidden`: Looks good /
   Hide; a work is live at once, a trigger keeps those two columns admin-only), latest people, and test accounts:
   sign up with `ooopenstudio+…@gmail.com` in a private window (code arrives in the app's inbox); the `admin-users`
   function lists and deletes only "+" accounts with all they made. (c) Virtual spaces: research in
   `studio/design/virtual-spaces/research.md` (market, three.js on iPhone, museum lighting numbers, ten room kinds,
   pipeline: Blender model + Cycles-baked lightmaps + live per-work light). `studio/app/space/rooms/build_rooms.py`
   builds the ten kinds x 3 variants in Blender; the "Studio rooms" workflow (by hand) renders them on GitHub into
   `studio/design/virtual-spaces/renders/` (rooms.json lists them). Next: the owner picks rooms from the renders; then
   stage 0 of the research's plan: bake one room (white cube) to GLB + lightmap, show it in space.js, A/B on an iPhone.
5. Also 3.11 (later): the control room is in Hebrew, right to left (the owner's wish; only owners see it), reached by
   a "Control room" button on the account page (is_admin). Its Overview has a preview: "סיור כמבקר/כאמן חדש" walks the
   way in with a pretend person in sessionStorage (`os-preview`: auth.js `previewing/startPreview/endPreview`, app.js
   `previewBar`, artist.js keeps a preview studio on the page only); any code is taken, nothing is sent or saved; the
   real "+" test accounts sit under it. The welcome screen's pictures pointed at the deleted made-up works: fixed.
   Rooms: two trial rounds fixed shared walls, fixtures that blocked their own spots, works that didn't fit, light
   levels; the summary PDF for the owner is made by `studio/design/virtual-spaces/make_summary.py` (Chrome headless).
6. Also 3.11: the owner's account (eladamsalem1@) deleted entirely at his request, to sign up again from the start
   (2 orphan files in storage works/bbd9e297…/). `handle_new_user` now makes eladamsalem1@ and ooopenstudio@ admins on
   sign-up, so deleting and re-joining keeps the control room. Import from a website now brings
   everything from an Open Studio site: works, about (statement, bio, portrait, discipline, city, instagram), CV and
   exhibitions with installation photos (import-media `more_of`; `artists.cv`, `artists.exhibitions` jsonb; studio
   profile shows the CV; the public page shows CV and past shows), then hangs up to 12 sized works in a first virtual
   exhibition (draft) with "Walk into your exhibition in 3D". Not done: photo-built tours for imported exhibitions (the
   server pipeline). The owner chose to KEEP the built-in Elad (site content and photo tours) visible: don't hide it.
7. Later 3.11 (owner's test of the import): sizes are read against the picture (the site writes some "a x b" height
   first, some width first); exhibitions come with their works (from the site's open-studio/data/studio.json) and their
   tour where live (Ritual: space slug 'ritual'); objects as works of kind 'object' (`works.kind`); a second import
   doesn't double. Every artist's page = Elad's design (About & CV at #/artist/<slug>/about, Objects). Review round
   trip: `artists.status` draft -> pending (sent) -> changes (admin note) -> approved; the artist sees their page at
   #/preview/me, an admin at #/preview/<id> (app.js `loadReview`, bar `reviewBar`, sessionStorage `os-review`); the
   guard lets an artist only send or take back. Owner's new account is 9d1b42f7-…, his page 'draft', data fixed by hand
   (19 sizes turned, exhibitions' works and the Ritual tour set, Pargod and Sliding Wall added).
   Rooms: final renders in studio/design/virtual-spaces/renders; summary PDF open-studio-summary-2026-11-03.pdf (also on
   the owner's Desktop, OPEN STUDIO folder). Next for rooms: the owner chooses; then stage 0 (bake one room for the app).
