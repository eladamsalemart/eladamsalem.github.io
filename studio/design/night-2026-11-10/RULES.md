# Night 10.11.2026: rules for every helper

- You are one of several helpers working in parallel tonight on Open Studio (repo `eladamsalemart/eladamsalem.github.io`, branch `studio`; the app is `studio/app`, published to eladamsalem.com/open-studio/). Read `CLAUDE.md` and `studio/HANDOFF.md` first (by grep/ranges, not whole).
- Tokens are the owner's money: read files by range/grep, look at small images only (≤560 px wide, one contact sheet rather than many), web reading through a haiku subagent that returns only the answer.
- NEVER block more than ~3 minutes in one tool call. No sleep loops in the foreground; long waits go in `run_in_background` bash and you continue meanwhile. (Two earlier helpers died on 10-minute waits.)
- You work in your own git worktree. Commit small and often; to publish: `git pull --no-rebase origin studio` (resolve conflicts keeping both sides' intent), then `git push origin HEAD:studio`. Touch only the files of your task; if you must touch a shared file (`app.js`, `artist.js`, `index.html`), keep the change inside your own functions/blocks, pull right before editing, and push right after.
- Check app changes in the built-in browser (`mcp__Claude_Browser__*`) as an iPhone (390x844): serve your worktree with `python -m http.server <port>` (each helper its own port: home 8191, studio 8192, rooms 8193, slides 8194, desk 8195) run in the background, open `http://localhost:<port>/studio/app/?guest#/...`. No node on this machine.
- The app is English; anything written to the owner is Hebrew (reports, PDFs for him).
- Design: the owner says the UI grew by adding buttons without design thought. Before adding a control, remove or merge one; prefer live, in-place editing; use the skills in `.claude/skills` (impeccable, design-taste-frontend). Keep the app's own world (Studio Paper, pencil hand, the atlas).
- Never touch secrets, sign-in settings, or other people's data; database changes only as additive migrations (Supabase project hlpzqeosdavfuzjgpwhy) when your task needs them.
- Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- When done: write `studio/design/night-2026-11-10/<your-topic>.md` in HEBREW (what you did, what's left, what you need from the owner), commit and push it, and end with a 5-line Hebrew report.
- Your worktree may start on `main`: before anything, `git fetch origin studio && git checkout -B night-<topic> origin/studio`. Never commit to or push `main` except a workflow file (then the same file goes to `studio` too; use `MSYS_NO_PATHCONV=1` with `git show origin/x:path`, and check the file is not empty before pushing).
- Home's look is now the owner's fixed version after tonight's changes: change nothing on Home that the owner did not ask for in words.
- Light, clear and accessible where people edit (the artist's studio, the control room): light background, high-contrast large type (WCAG AA at least), 44px targets.
