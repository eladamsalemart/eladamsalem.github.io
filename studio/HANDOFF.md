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
   a Facebook page. Needed for the app: privacy policy https://eladamsalem.com/open-studio/privacy.html, a data
   deletion URL (to build: a page or a Supabase function), icon (studio/design/google-brand-logo-120.png or the
   app icons), category. Put App ID / App Secret in GitHub secrets INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET. Then
   build "Connect Instagram" in studio-cloud.js / artist.js (#/studio/import) through a Supabase function holding
   the secret; app review for instagram_business_basic later (screencast, description). Until approved it works
   for testers only; the export zip keeps working for everyone.
2. Google brand verification (guide: studio/design/google-brand-verification-guide.pdf). Step 1 is a Search
   Console HTML tag on https://eladamsalem.com/ (the site's root index.html is on `main`). Google sign-in itself is
   already in production (published 3.11).
3. Leftover: change_requests row with issue 3 (a test) still in the table, status filed; delete it.
