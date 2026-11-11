# Paused 11.11.2026 ~05:40, resume Saturday 14.11.2026 19:00 (weekly usage renews)

The owner paused the three heavy workstreams because Fable 5.2 on them empties the 5-hour usage window in about 30 minutes.
Resume them on Saturday evening with the newest model, one helper at a time or two at most, committing and pushing each finished piece at once.

## Scope the owner fixed (11.11)
Only THREE room kinds are offered and perfected: `white-cube` (regular gallery), `concrete` (industrial concrete),
`glass-pavilion` (glass wall, works on one solid wall and on white freestanding partitions in the middle). Everything else,
including `apartment` and `black-box`, is archived (ACTIVE_KINDS in studio/app/space/synth.js), nothing deleted.
If the third is not the one he meant, he will say so.

## Where each workstream stands
Published on `studio` (and live) before the cut: ACTIVE_KINDS = the three kinds; covers ≤900 px again; On View room picker for
any number of kinds; Desk museum editor flow fixes + Playwright flow test (studio/desk/tests).
Unfinished work is saved as one local "WIP" commit on each helper's branch (NOT pushed, NOT verified):
- rooms: branch `night-rooms3`, worktree `.claude/worktrees/agent-aa1d10c7c55433bc0` (studio-rooms.yml, hang-editor.js, build_rooms.py, space.js, synth.js). Notes: rooms.md. Open: server bake of the three kinds, partitions hangable in glass-pavilion, white cube light/material, texture memory (186-307 MB a room), speed.
- artist: branch `night-artist2`, worktree `.claude/worktrees/agent-af0cb73b054165863` (artist.js, index.html, studio-page.js, tests/artist_journey.cjs). Notes: artist.md. Open: slowness, add/edit works polish, real-phone check.
- Desk + museum: branch `night-desk3`, worktree `.claude/worktrees/agent-a2c56c41460091a0c` (desk.js, museum.css, museum.js). Notes: desk.md. Open: keyboard/drag polish, the Street's passages, frame rate, real signed-in saves.
Review each WIP diff before merging it; if a worktree is gone, the branch still holds the commit.

## Rules that still hold
RULES.md here. Home's look is fixed. Never commit content/works.json. gh is not signed in; workflows are dispatched through
the owner's Chrome. GitHub's unauthenticated API: 60 requests an hour for the whole machine. Reports to the owner in Hebrew.
