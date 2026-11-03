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
   secrets INSTAGRAM_APP_ID/SECRET into the function's settings: on the first deploy they weren't there (warning
   "missing"), so the function answers "isn't set up yet" until the owner adds them and the workflow is run again.
   Then: test end to end with the owner's account (artist, admin of the Meta app).
   Needed for the app: privacy policy https://eladamsalem.com/open-studio/privacy.html (names Instagram since 3.11),
   data deletion instructions https://eladamsalem.com/open-studio/data-deletion.html (live 3.11), icon (studio/design/google-brand-logo-120.png or the
   app icons), category. Put App ID / App Secret in GitHub secrets INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET. Then
   build "Connect Instagram" in studio-cloud.js / artist.js (#/studio/import) through a Supabase function holding
   the secret; app review for instagram_business_basic later (screencast, description). Until approved it works
   for testers only; the export zip keeps working for everyone.
2. Google brand verification (guide: studio/design/google-brand-verification-guide.pdf). Step 1 is a Search
   Console HTML tag on https://eladamsalem.com/ (the site's root index.html is on `main`). Google sign-in itself is
   already in production (published 3.11).
3. Leftover: change_requests row with issue 3 (a test) still in the table, status filed; delete it.
