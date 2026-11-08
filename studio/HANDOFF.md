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
8. Exhibitions, as an artist makes one (3.11 evening): the studio's exhibition page is two steps, "1 Your exhibition"
   (what visitors see) and "2 A walk-through tour (optional)" with a checklist, "Material for the tour only" (photos and
   a video in the private bucket `tour-material/<uid>/<exhibition>/`, ≤50 MB, never on the page: `tourFiles` in the
   exhibition) and "Ask for a tour" (`tour: 'requested'`, `tourRequested`); the control room's Overview lists the
   requests. NOT DONE: the server building those tours. The pipeline (space/pipeline, load_exhibition in works.py) reads
   content/*.json + data/studio.json only, and its inspection opens the public app; to do: a workflow that takes
   requested exhibitions from Supabase (secret key), downloads photos/video/works, builds and inspects, publishes the
   space and sets the exhibition's tour to live (space.slug) or 'more' with `tourNote`. Artist names: setup asks for
   English letters; the import replaces a non-Latin name with the site's.
9. Artist tours on the server (3.11 night, DONE): `space/artist_tours.py` + workflow "Artist tours" (every 3 h, or by
   hand with an exhibition id). The owner's rule: never miss a chance, so EVERY exhibition with photos or a video is
   tried, asked for or not (asked first, then never tried: `tourTried`); a pass is 'live' (space a-<uid8>-<title>),
   else 'more' with a plain `tourNote`; the studio offers "Ask for a tour" with any photo. Tried: Nature of Man and BFA,
   both 'more' (works missing from the photos, walls uncovered: a walk-through video would do it).
10. Rooms, realism round (3.11 night, owner: "they still look digital"): every material weathered (colour drift, sheen,
   AO grime), ambientCG smudges on floors, wall washers instead of one flat light, a level camera with shifted lens,
   white balance per room, lens vignette/bloom; real views through windows (Poly Haven HDRIs urban_street_03,
   killesberg_park, ninomaru_teien, kloofendal_overcast_puresky) with light portals; Ando formwork joints and tie holes;
   labels, sockets, sprinklers, exit signs, benches; the Japanese room's shoji open on a garden. Local test: Blender
   4.5.15 portable in C:\Users\elada\blender, `ROOMS_HDRI=2k` for speed. Research notes (assets, IES, web tech): the
   subagent's report is summarised in this item; IES not used yet (no free direct library found).
   4.11 night: architraves, thresholds, window boards and casement frames, dusty glass, floor sheen wipes, orange-peel plaster,
   plastered ceilings, rain runs on concrete/brick, tatami edging. Cost +35%/sample: samples x0.7 (loft x0.45, loft surfaces x0.5;
   it timed out at 5.5 h otherwise): keep jobs under 5 h. Details: studio/design/virtual-spaces/night-2026-11-04.md.
11. On View (owner's decision 3.11: every artist shows their exhibition now in one of the ten spaces, at the top of their
   page). "Studio rooms" with surfaces=yes also photographs each empty single-room variant's six surfaces (walls by a
   perspective camera framing the wall exactly, so windows show the view; floor/ceiling orthographic) into
   `studio/app/data/rooms/<slug>/` + `index.json` + `view.jpg` (cover); the app publishes after it. synth.js loads them
   as ROOMS (`baked`), hangs works with blocks for windows/glass/doors, adds spot pools; the studio tab On View
   (#/studio/onview: space, size, title, works, words; `virtual_shows.on_view`); app.js `onViewBlock` opens the artist's
   page with it. Multi-room variants and the round black box have no surfaces (not one rectangle). Later: GLB with
   baked lightmaps for full geometry (columns, vaults, furniture).
   9.11 night: the tab explains On View; each empty size is walked before it is chosen (`openSpace({choose})`); the hang editor
   `space/hang-editor.js` works inside the room (drag with snapping, line up, even spacing, undo, add/remove works, plinths S/M/L with
   objects at real size via `space/plinths.js`); `v.placements` {id:{wall,a,y}} in `virtual_shows.works`, `v.plinths` in the new
   `virtual_shows.plinths` column; `hang()` stays the default. Several connected rooms: NOT done, see studio/design/night-2026-11-09/onview.md.
