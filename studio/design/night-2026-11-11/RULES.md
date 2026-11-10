# Night 11.11.2026: rules for every helper

- Same as studio/design/night-2026-11-10/RULES.md (read it), plus:
- Tools now on this machine (no admin): put them on PATH in every bash call:
  `export PATH=/c/Users/elada/tools/node:/c/Users/elada/tools/npm-global:/c/Users/elada/tools/gh/bin:$PATH`
  node/npm, npx, gltf-transform, lhci (Lighthouse CI), playwright (run `npx playwright install chromium` once if you need it),
  gh (NOT signed in — do not try to sign in; the owner is away), Blender 4.5 portable at C:\Users\elada\tools\blender\blender.exe (may still be downloading; CPU only, i5 laptop: small test bakes only).
- GitHub's unauthenticated API allows 60 requests/hour for the whole machine, shared by all helpers: poll Actions at most once every 10 minutes, never in tight loops. Last night a helper burned the limit.
- Dispatch or cancel workflows through Claude in Chrome (the owner's signed-in Chrome). If a page freezes, close the tab and open a new one; give up after 3 tries and note it.
- Work until ~07:00 Israel time. Loop: look → fix → verify. Don't stop early after a first pass.
- Report to the owner in Hebrew in your topic .md file here; final 5-line Hebrew report.
