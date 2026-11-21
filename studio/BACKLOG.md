# Open Studio: the one list (16–21.11.2026)

How we work from now (the owner asked, 21.11, to work in a more correct way and to save tokens):
1. **One list, this one.** Every request goes here first, grouped; nothing is built twice. A request is "done" only when it was checked
   (a test, a screenshot or the live site) and the line says what was NOT checked.
2. **Stages, not threads.** One stage at a time in one session; a second session only for work that touches other files
   (the museum has its own: studio/design/museum-sky, studio/agent). No parallel agents unless the work is independent research.
3. **Batch the checks.** Edit in groups, then one run of the journey test (`JOURNEY_NO_3D=1` for a quick one), one push, one live check.
4. **Short reports** to the owner (Hebrew): what is live, what is not checked, one question at most.
5. Quota: watch `get_usage` at the start of a stage; the weekly limit resets Saturday evening.

## Live and checked (by test or on the live site)
- Review chain for exhibitions: artist sends -> control room queue (with a walk-through) -> approve -> live; tested end to end with a test account.
- Control room: Exhibitions tab (hide/show, nothing deleted); Agent tab (cloud + owner's computer).
- One Elad Amsalem (the app account is an alias of the site artist); the arches hold real and virtual exhibitions; the order covers both.
- Artist's Edit page: virtual exhibitions block, real exhibitions in the app (owner's switch), status card, real cloud status.
- Hang editor: Add tray full screen, "Hanging N works" state, plan zoom buttons, Arrange panel (laser line, position, gaps), nudge arrows.
- Work page "At scale": white gallery wall, a person beside it; sculptures on a plinth.
- Home: films of virtual exhibitions (workflow "Virtual show films", made in the cloud, then published).

## Needs the owner
- `ANTHROPIC_API_KEY` in GitHub secrets (cloud agent), `claude /login` and `studio/agent/start-agent.cmd` on the computer, Tailscale for the phone (studio/agent/PHONE.md).
- Decision: the real-world-first direction on Home/Shows (ESSENCE.md) is not built yet.

## Next stages (in this order)
A. **Exhibition design screens, accessibility and simplicity** (the owner asked): the room/name/works page, the plan, the room view; a look at each with the
   owner's screenshots; one change per complaint. (Started: bigger labels, focus outlines, clearer wording.)
B. **Bring work in on one screen** and **a progress strip for the artist's journey** (proposals 5 and 6 of the six).
C. **Real exhibitions first** in the product (Home and Shows lead with exhibitions on now in real places).
D. **Museum** (its own session, studio/design/museum-sky): night shifts are scheduled by that session.
E. Not checked anywhere yet: a real iPhone (speed, memory); signing in by emailed link; "ask for changes" in the control room.
