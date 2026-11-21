# Real vs Virtual exhibitions in Open Studio: research

Scope: how products and the art world signal "physical" vs "digital" and present a walkable or online exhibition. Goal: a creative way (not a text chip) to present the artist's personal virtual show at the top of the artist page, and to make real and virtual exhibitions feel different.

## How to read the tags

- **[V]** = I fetched and read the page itself in this session. The source number points to the list at the end.
- **UNVERIFIED** = not read on a page. Either it came only from a search-result summary (named as such), or it is common knowledge, or it is my own design reasoning. All design proposals (sections c, d, e) are my opinion; the factual claims inside them carry tags.
- Pages I could not read at all (blocked, JS-only, or empty on fetch): Artsy viewing rooms, Vortic, Artsteps, Art Basel OVR, MoMA, Tate, Israel Museum site, Instagram help, Netflix/Spotify/Letterboxd UI, Eventbrite listing pages, Valve/Unity pages, Dekker PDF (binary, unreadable by the fetcher). Where I rely on them it is through search summaries and is marked UNVERIFIED. I did not invent UI I could not see: for Spotify, Letterboxd and Eventbrite card badges I found nothing verifiable and say so.

---

## A. Catalogue of techniques (32)

Columns: technique / where used / what it makes the user feel / evidence.

### A1. Words and labelling systems

| # | Technique | Where used | Feeling | Evidence |
|---|---|---|---|---|
| 1 | Verb-led entry call: "Explore", "Launch virtual tour", "Explore in 3D" | Google Arts & Culture cards; Louvre tour cards use the same "Launch virtual tour" button on every card | Invitation to act; functional, slightly app-like | [V S1, S3] |
| 2 | Spatial-threshold copy: "Step inside a gallery" (with "With Augmented Reality" as the subhead), "View the artist's work in a virtual gallery" | Google Arts & Culture "Pocket Gallery" card | Crossing into a place; the medium is named quietly in a subhead, not in a tag | [V S1] |
| 3 | A named series with edition numbers instead of a type tag ("Petite Galerie", season 6, 5th edition...) | Louvre virtual tours | The online thing has its own identity and continuity, like a programme, not a lesser copy | [V S3] |
| 4 | Separation by section/heading, not per-item badge: Louvre splits "Virtual tours" from "Louvre at home"; Rijksmuseum groups "At the Rijksmuseum" | Louvre online-tours page; Rijksmuseum What's on | Calm, editorial; the container tells you the format. Note: Rijksmuseum page does NOT label anything online/digital | [V S3, S5] |
| 5 | "At home" framing | Louvre "Enjoy the Louvre at home!"; Frieze AR "imagine artworks inside your home" (the headline puts "Home" in quote marks); OWW "from home" | Intimacy, no travel, private viewing | [V S3, S10, S27] |
| 6 | Experimental / lab labels: "Experiment", "Play", "Online Exhibit" tag | Google Arts & Culture | Curiosity, play; marks something as a novelty rather than a record | [V S1] |
| 7 | Product-tier naming: a dedicated "Vision" tab and titles labelled "Apple Immersive" | Apple TV app on Vision Pro | The format has its own shelf; you go to it deliberately | [V S21] |
| 8 | Format as a separate filter/product, not a badge: Eventbrite "Online" location creates a separate online event page; festival passes sold separately for online access | Eventbrite; SFFILM online badge | Clear logistics, but cold and transactional | UNVERIFIED (search summaries only for Eventbrite help and SFFILM) |
| 9 | Session-level time block labelled by format ("WEDNESDAY ONLINE", "THURSDAY IN-PERSON BADGE") | A film-festival schedule found in search | Practical, schedule-like | UNVERIFIED (search summary only) |
| 10 | Brand badge on corner of tile (small red N on originals), later removed because it was judged clutter | Netflix web | Shorthand of provenance; also shows how corner badges get ignored or become noise | [V S20] |
| 11 | Ring plus word on avatar ("colorful ring", the word "Live") | Instagram; YouTube added a similar ring | Urgency, "happening now"; shape + word together, not word alone | UNVERIFIED (Instagram wording from a search summary quoting the help page; the YouTube article page was read but only its headline loaded) |

### A2. Metaphors of entering

| # | Technique | Where used | Feeling | Evidence |
|---|---|---|---|---|
| 12 | Portal and doorway as the "other place" | Museum of Other Realities: reviewers' "portals to impossible scenery"; store copy "Step into a painting"; "a gallery you can visit from anywhere" | Wonder, leaving ordinary space | [V S4] |
| 13 | Door that previews the room behind it (red doors in Returnal expand to show a "mirage" of the next area) | Games | Anticipation; you see what you are about to enter | UNVERIFIED (search summary only) |
| 14 | Displacement transition (a portal that makes you feel you moved) vs seamless transition (duplicate geometry on both sides so the change is hidden) | Valve level-design docs | Choose deliberately: "I moved somewhere else" vs "no seam" | UNVERIFIED (search summary; the Valve page itself returned 403) |
| 15 | Light as guidance toward the exit/door | Unity level-design guide | You are drawn toward the opening without being told | UNVERIFIED (search summary only) |
| 16 | Threshold as rite of passage: separation, transition, incorporation; designers must balance ambiguity with wayfinding because empty in-between spaces feel eerie | Liminality (anthropology) | The pause at the door is where the feeling of "crossing" is made | [V S14] |
| 17 | Arch as ceremonial passage: Roman arches were "intended to be passed through, not around"; the arch in a church marks ordinary to sacred | Triumphal and church arches | Honour, entrance, importance | [V S15] |
| 18 | Round opening as walkway: the moon gate | Chinese gardens, Bermuda | A frame you step through into another scene; a different geometry from the arch | [V S24] |
| 19 | Portal in architecture as "an opening in a wall", often a grand entrance, regulated by doors and gates | Architecture | Control of who passes and when | [V S25] |

### A3. Representation and material

| # | Technique | Where used | Feeling | Evidence |
|---|---|---|---|---|
| 20 | Plan vs perspective: a floor plan is a diagrammatic, scaled, orthographic drawing (depth not shown); a perspectival 3D view is used to convey scale to non-experts | Architecture; Google's Gallery View also lets you click a floorplan | Plan = fact, measure, a place that exists. Perspective = experience, atmosphere | [V S32, S12] |
| 21 | Hand-drawn vs computer-generated rendering (watercolour, pencil, gouache vs 3D software to photoreal) | Architectural illustration | Hand-drawn = human, authored; CG = simulated, precise | [V S17] |
| 22 | Material memory (skeuomorphism): cues from paper or leather in a UI; costs are clutter, inconsistency, and limiting new interface ideas | iOS before 2013 | Familiarity, warmth | [V S16] |
| 23 | The "virtual white cube" as skeuomorphic copy of a gallery, criticised | Online-exhibition criticism | A virtual room that merely imitates a real one feels second-hand | UNVERIFIED (search summary of Dekker; PDF unreadable); close claim from Gat: most programmes "simply recreate offline structures" [V S29] |
| 24 | Faithful recreation vs creative platform: earlier digital museums were usually "a faithful recreation" of the real building, while OWW lets players build from modular blocks | Occupy White Walls and Birmingham | A virtual space that is its own thing feels like invention, not a substitute | [V S27] |
| 25 | Aura and "here and now": the uniqueness of a work comes from its authenticity and locale; even perfect reproduction lacks its unique existence in place and time | Benjamin; art theory | The real show can claim place and date as its aura; the virtual show cannot, so it needs a different promise | [V S13]; critics disagree whether a digital copy gets its own "here and now" (UNVERIFIED, search summary) |
| 26 | Virtual twin vs native virtual: a gallery that scans its room with a 360 camera to make a "virtual twin" so remote viewers can explore the full exhibition; viewing rooms framed as supplements to a physical show ("as real as possible") | Paradigm and OMR via Artsy | A twin is evidence of the real show; it is NOT what Open Studio's virtual shows are. The product must keep these two apart | [V S28] |

### A4. Time, type, colour, shape, motion

| # | Technique | Where used | Feeling | Evidence |
|---|---|---|---|---|
| 27 | Time grammar: real shows have dates and hours; web-only shows can "constantly expand"; online programmes can be "a growing continuum rather than a series of often very short exhibitions" | M Woods "Art Is Still Here"; web-only shows | Real = event with an end; virtual = always there, growing, "open all night" | [V S29, S30] |
| 28 | Type pairing: serif tied to print history and carved Roman letters; monospace tied to typewriters, terminals, code, aligned data | Typography | Serif = place, paper, inscription; mono = system, index, room number, "machine" voice | [V S31, S23] |
| 29 | Shape carries meaning (significance, state): Material says shape can communicate an element's significance, signal its current condition and draw attention | Material 3 shape guidance (only the summary loaded) | Shape is a legitimate carrier of state, not only decoration | [V S33] (thin source) |
| 30 | Warm physical vs cool luminous colour; backlit glow of a screen vs reflected light on paper | Common design practice | Warm = touched, held; cool glow = projected, transmitted | UNVERIFIED (my Wikipedia fetch on warm/cold colours returned 404) |
| 31 | Motion: still vs slow drift/breathing; any drift must respect the reduce-motion setting because panning and scaling large objects can trigger vestibular discomfort; replace with opacity changes | Web platform | Stillness = fixed in the world; drift = alive, not fixed | [V S22, S8] |
| 32 | Sound and haptics at the threshold: sound and context can shape a work online (Dvir's "Corona" pairs an artwork with a recorded poem); haptics should reinforce, never be the only cue | Gat essay; Apple HIG (not read) | A crossing you can hear and feel | Sound example [V S29]; haptic rules UNVERIFIED (Apple HIG page returned only its title) |

---

## B. Microcopy

Notes before the lists. NN/g advises short labels (about 2 to 4 words), verbs for actions, and avoiding vague, cute or branded wording for commands [V S19]. That applies to buttons. A caption or a heading is not a command, so it can be warmer, but the button that opens the room should stay plain ("Step inside" is fine; "Enter the dream" is not). All Hebrew is my own rendering, written to read naturally, not word for word. Have Elad (a native speaker) adjust it.

### B1. Twelve options for presenting the virtual tour

| # | English | Hebrew | Tone it sets |
|---|---|---|---|
| 1 | Step inside | היכנסו פנימה | Warm, simple invitation. Safe default for the button. |
| 2 | A show that exists only here | תערוכה שקיימת רק כאן | Rare, exclusive, proud. Turns "digital" into "unique". |
| 3 | Walk in. The lights are on. | היכנסו. האור דולק. | Hospitable, intimate, a bit theatrical. |
| 4 | Open all night | פתוח כל הלילה | Gentle humour, a place that never closes. Fits the dark theme. |
| 5 | Walk it on your phone | לטייל בתערוכה, מהטלפון | Plain and practical. Explains the how. |
| 6 | No address. Just a door. | אין כתובת. יש רק דלת. | Poetic, minimal. Names the difference from a real venue. |
| 7 | Hung by [Artist], room by room | נתלתה בידי [שם], חדר אחר חדר | Authorship. Stresses that the artist chose each placement. |
| 8 | A room built for these works | חדר שנבנה בשביל העבודות האלה | Craft, intention. Counters "it is just a gallery copy". |
| 9 | Eleven works. One room. No queue. | אחת-עשרה עבודות. חדר אחד. בלי תור. | Light, witty, concrete numbers. Use real counts only. |
| 10 | [Artist]'s personal show | התערוכה האישית של [שם] | Dignified, matches "the one show they want to present". |
| 11 | Enter the show · about 6 min on foot | כניסה לתערוכה · כ־6 דקות הליכה | Factual, sets expectations (mono for the second part). |
| 12 | Come as you are. Stay as long as you like. | בואו כמו שאתם. הישארו כמה שבא לכם. | Relaxed, hospitable, slow. Good for an empty state or first visit. |

### B2. Eight options for real exhibitions

| # | English | Hebrew | Tone it sets |
|---|---|---|---|
| 1 | On view at [Gallery] until 14 Dec | מוצגת ב[גלריה] עד 14.12 | Factual, museum-label. Time-bound. |
| 2 | Held at [Place], [City], 2023 | הוצגה ב[מקום], [עיר], 2023 | Archival, sober. Place and date as proof. |
| 3 | You had to be there. These are the photographs. | היה צריך להיות שם. אלה הצילומים. | Wistful, honest about being a record. |
| 4 | Hung for real: [Gallery], [City] | נתלתה באמת: [גלריה], [עיר] | Confident, a little wry. "For real" is the contrast. |
| 5 | Opening night, 6 pm. Bring a friend. | פתיחה בשעה 18:00. בואו עם חבר. | Social, warm, upcoming. |
| 6 | Installation views by [Photographer] | צילומי התערוכה: [צלם] | Credit line, gallery-world register. |
| 7 | On the wall, in daylight, at an address | על הקיר, באור יום, בכתובת אמיתית | Tactile and grounded; the opposite of "No address". |
| 8 | Closed. Kept here. | הסתיימה. נשמרת כאן. | Quiet, elegiac, for past shows. |

Pairing rule: if "No address. Just a door." is used for virtual, real shows should lean on address and date. The two voices should be opposites in grammar: place and date vs door and light.

---

## C. Why a text chip ("VIRTUAL EXHIBITION" / "REAL EXHIBITION") fails here

1. It is metadata, so it reads like admin. Small uppercase tracked chips are the generic web tag register. In a calm editorial serif app it speaks in a different voice from everything around it. Netflix removed its corner provenance badge and described the old design as cluttered [V S20]; the lesson is that badges become noise.
2. It flattens a core feature into a category. Virtual exhibitions are what the app is about, not one more tag in a filter. A chip says "type: virtual", so it files the feature next to "Painting" or "Sculpture".
3. The difference is read, not felt. The owner's brief is exactly this. A chip works only if someone reads it; shape, light, material and motion work before reading. Critics say online shows work best when they do something the physical show cannot, instead of copying its structures [V S29, S30]; a label does not do that.
4. It fights the arch. The arch is the shape of the exhibition card and carries the idea of a ceremonial entrance [V S15]. A rectangle chip stuck on top of a drawn arch contradicts the drawn language (pencil line vs UI plastic).
5. It treats the two kinds as one object with a flag. A real show is a place in time; a virtual show is a world. The honest presentation of a virtual show is a different object, not the same card with a different sticker. Contrast the OWW distinction between a "faithful recreation" and a creative platform [V S27] and the twin vs native distinction [V S28].
6. It repeats. A chip on every card is repetition; repeated tags get ignored (design reasoning, UNVERIFIED as a measured effect, though the Netflix removal supports it [V S20]).
7. It fails small, RTL and low-vision cases. Tiny uppercase text has weak contrast and hit area on a phone, and a left-aligned chip needs mirroring for Hebrew (UNVERIFIED, general practice).

What a chip still does right, and must not be lost: it gives a text alternative and an unambiguous name. NN/g found that icons without text are routinely misread, and recommends a visible text label even next to standard icons [V S18]. W3C says colour must not be the only way to convey information [V S6]. So the answer is not "no words". It is words that are part of the object (a caption on a wall label, a door sign, a stamp) plus at least two non-colour, non-text cues (shape, line quality, motion, texture).

---

## D. Ten raw design ideas (arch-based, dark, editorial; pencil arch; Studio Paper palette)

Each combines shape, material, motion, copy and placement. All motion has a static fallback under prefers-reduced-motion [V S22, S8].

**1. "The Open Door" (hero above the works).** The first thing on the artist page is one tall arch the width of the screen, taller than a normal card. Its pencil outline stays unclosed at the bottom by a few millimetres, as if the door is ajar. Inside the arch is a live crop of the 3D room, lit from within, drifting very slowly with a gyroscope parallax (a few pixels). The caption sits on a serif "wall label" under it: "A show that exists only here", then, in mono, "ROOM 01 · 11 WORKS · ~6 MIN". The only button is a plain "Step inside". Real exhibitions begin below under a thin rule and never get this treatment. Static fallback: the room image does not move.

**2. "Graphite vs light".** The pencil arch on real cards is drawn in graphite on paper: slight wobble, visible paper grain, a still photograph inside. The virtual exhibition's arch is the same arch drawn in a single clean luminous line (no wobble, no grain), with a thin soft bloom and a slightly cooler interior. Material alone tells the difference (touched vs transmitted). To avoid relying on colour, the line weight and quality also differ: real is a doubled pencil stroke, virtual is a single even stroke. On first view the pencil line can "draw itself" once; the luminous line fades up.

**3. "Plan and render".** Each real exhibition card carries a tiny hand-drawn floor-plan glyph in the corner (a rectangle of walls with ticks for works) because a plan is the language of a room that exists and can be measured [V S32]. A virtual card carries a one-point-perspective doorway glyph, because a perspective view is the language of experience [V S32]. No text needed; the glyph is also the alt-text anchor ("Floor plan, real exhibition at [Gallery]" / "Doorway, virtual exhibition").

**4. "Front door and archive" (placement idea).** Read the artist page as a building. At night the "front door" of the building is the virtual show, set at the very top above the works, with a small light above the lintel. Below it, the works are the "archive". Real exhibitions sit between them as a ledger of dated lines (place, year) in a serif list, like a wall of plaques. The page therefore reads top to bottom: door (virtual, now), plaques (real, past), works (objects). Caption: "No address. Just a door."

**5. "Aperture, not arch".** Shape language as the main separator: arches belong to real buildings (entrance, ceremony [V S15]); a circle or oculus belongs to the virtual show, like a moon gate, a round opening you step through into another scene [V S24]. The virtual hero is an arch with a round window cut into its crown, showing the room through the circle. Alternatively the whole hero is a full circle. Risk: it weakens the single arch identity of the app, so test it against idea 2, which keeps the arch.

**6. "Still vs breathing".** Real exhibition cards never move; they are fixed objects. Virtual exhibition media breathes: a 1 to 2 percent scale oscillation over about 20 seconds plus a slow light shift, only on the hero and only while visible. The copy says "Open all night" with a tiny dot that glows at a heartbeat rate. Reduce-motion users get a static image and a static dot. This keeps the difference felt without a label. Budget it so it stays on compositor properties (opacity and transform).

**7. "Ticket stub vs key".** Use the ticket vs portal metaphor on the card edge. Real cards have a perforated stub notch at the bottom edge (a ticket, something you carry to a place) and a printed date. Virtual cards have a small key-hole or door-handle notch cut in the arch base (an object that opens). Taps differ too: real opens the show page; virtual opens the room directly. Microcopy: real "Held at [Place], 2023", virtual "Step inside".

**8. "Wall label vs signage" (type as separator).** Real exhibitions use serif italics in the manner of a printed wall label: title, place, year, in warm paper tone. Virtual uses a serif headline plus a mono second line, because mono suits rooms, indexes and systems [V S23] while serif suits place and print [V S31]. "ROOM 01" in mono is the quiet signature of the virtual. No chip; it reads as part of the caption.

**9. "Day paper, night glass" (colour and light).** Real cards sit on warm Studio Paper tones with soft reflected-light shadows. Virtual cards use the dark ground with an inner cool glow, as if backlit. This is the weakest cue on its own (colour only) so it must always be paired with ideas 2, 3 or 8 to meet the non-colour rule [V S6]. Test with a greyscale screenshot: the cards must still be distinguishable.

**10. "Threshold ritual" (entry and exit).** Tapping "Step inside" does not cut to the room. Two leaves of the arch slide apart over about 600 ms (the pause is the liminal moment [V S14]), the screen holds a half-second of dark with the room tone fading up (sound off by default, with a visible speaker control), and a single light haptic fires on crossing; exit mirrors it. The door preview idea (seeing the room through the opening before you commit) is borrowed from game doors [UNVERIFIED, S: search summary on Returnal]. Haptics reinforce, never carry, the information, and the transition is a fade, not a slide, under reduced motion. A count such as "3 inside now" can sit under the arch only if it is real and the artist allows it; otherwise omit it.

---

## E. Accessibility notes

- Never colour alone [V S6]. Pair any warm/cool difference with a shape (arch vs aperture), a line quality (pencil vs light), a glyph (plan vs doorway) and a caption.
- Text alternatives [V S7]: give the hero an accessible name that says what it is and does ("Virtual exhibition: [Title], 11 works. Opens a walk-through"). Decorative arch lines are marked decorative; informative glyphs get a short alt. The 3D room needs a non-3D path: a plain list or grid of the same works with their alt text.
- Words stay [V S18]: the button text is plain and visible, even if the surrounding object is rich.
- Motion [V S22, S8]: every drift, draw-on and door animation has a static or opacity fallback under prefers-reduced-motion. Moving or scaling large objects can trigger vestibular discomfort [V S22]; a hero that drifts and a 3D room that the visitor walks through are the two highest-risk places, so offer a "static view" in the room.
- Sound and haptics: off by default or clearly controllable; both only reinforce visuals (Apple HIG guidance not read, so UNVERIFIED as a citation; the principle is conventional).
- RTL: arches are symmetric, which helps; the caption block, the mono room line and any corner glyph must mirror correctly in Hebrew.

---

## F. Eight most useful principles (summary)

1. **Make the object different, not the label.** A real show and a virtual show should be different kinds of thing on the page (different shape, material, motion), with words as part of the object. [C, D1, D2]
2. **A virtual show is not a copy of a real one.** Critics call the imitation "virtual white cube" skeuomorphic and ask online shows to work as their own medium [V S29; UNVERIFIED for Dekker]. Present it as a world that exists only here, not as a lesser version. OWW's "faithful recreation vs creative platform" is the same split [V S27].
3. **Real owns place and time; virtual owns presence and always.** Aura rests on locale and the unique here and now [V S13]. Real copy: address, date, in the room. Virtual copy: door, light, open all night, no queue. Time grammar differs too: dated vs continuous [V S29, S30].
4. **Use the entrance metaphor, and make the threshold felt.** Arches mean passage and ceremony [V S15], doorways and portals mean another place [V S4, S25], and the pause at the door is what makes the crossing real [V S14]. Spend the design effort on the moment of entering.
5. **Put it where it is the first thing seen.** Containers separate formats better than per-item tags (Louvre sections, Apple's "Vision" shelf) [V S3, S21]; a dedicated hero above the works makes the personal virtual show the front door of the page.
6. **Plan for the real, perspective for the virtual.** The plan is the language of rooms that exist and can be measured; the perspective view is the language of experience [V S32]. Pencil is human and authored [V S17]; a clean luminous line reads as projected (UNVERIFIED as a general claim; it is a proposal).
7. **Redundancy beats purity.** Any distinction must survive greyscale and screen readers: at least two non-colour cues plus a plain-text name and a text alternative [V S6, S7, S18].
8. **Motion and sound are seasoning, always optional.** Breathing and drifting motion tell "alive vs fixed", but must degrade to stillness under reduce-motion [V S22, S8]; sound and haptics reinforce only.

---

## Sources

Read on the page [V]:

- S1 Google Arts & Culture home: https://artsandculture.google.com/
- S2 KUNSTMATRIX (3D Exhibitions, Art.Spaces wording): https://www.kunstmatrix.com/en
- S3 Louvre Online tours: https://www.louvre.fr/en/online-tours
- S4 Steam, Museum of Other Realities: https://store.steampowered.com/app/613900/Museum_of_Other_Realities
- S5 Rijksmuseum What's on: https://www.rijksmuseum.nl/en/whats-on
- S6 W3C WCAG 2.2, Use of Color: https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html
- S7 W3C WCAG 2.2, Non-text Content: https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html
- S8 W3C WCAG 2.2, Animation from Interactions: https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
- S9 Airbnb help article 2783 (no online/in-person distinction in the text): https://www.airbnb.gy/help/article/2783/
- S10 Hyperallergic, Frieze 2020 (teaser only): https://hyperallergic.com/563349/frieze-2020-covid-19/
- S11 Wikipedia, Virtual museum: https://en.wikipedia.org/wiki/Virtual_museum
- S12 Wikipedia, Google Arts & Culture: https://en.wikipedia.org/wiki/Google_Arts_%26_Culture
- S13 Wikipedia, The Work of Art in the Age of Mechanical Reproduction: https://en.wikipedia.org/wiki/The_Work_of_Art_in_the_Age_of_Mechanical_Reproduction
- S14 Wikipedia, Liminality: https://en.wikipedia.org/wiki/Liminality
- S15 Wikipedia, Triumphal arch: https://en.wikipedia.org/wiki/Triumphal_arch
- S16 Wikipedia, Skeuomorph: https://en.wikipedia.org/wiki/Skeuomorph
- S17 Wikipedia, Architectural rendering: https://en.wikipedia.org/wiki/Architectural_rendering
- S18 NN/g, Icon usability: https://www.nngroup.com/articles/icon-usability/
- S19 NN/g, UI copy: https://www.nngroup.com/articles/ui-copy/
- S20 What's on Netflix, removal of the Original badge: https://www.whats-on-netflix.com/news/netflix-removes-netflix-original-branding-label-from-tiles-on-web/
- S21 Apple Vision Pro User Guide, immersive video and 3D movies: https://support.apple.com/guide/apple-vision-pro/tanc09caabb3/visionOS
- S22 MDN, prefers-reduced-motion: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
- S23 Wikipedia, Monospaced font: https://en.wikipedia.org/wiki/Monospaced_font
- S24 Wikipedia, Moon gate: https://en.wikipedia.org/wiki/Moon_gate
- S25 Wikipedia, Portal (architecture): https://en.wikipedia.org/wiki/Portal_(architecture)
- S26 Hyperallergic, Occupy White Walls (headline and subtitle only): https://hyperallergic.com/occupy-white-walls-game-lets-you-simulate-developing-your-own-blue-chip-gallery
- S27 Blooloop, Occupy White Walls and Birmingham Museums: https://blooloop.com/museum/in-depth/occupy-white-walls-birmingham-museums/
- S28 Artsy Partners, galleries and online presence: https://partners.artsy.net/articles/how-galleries-are-leveraging-artsy-to-grow-their-online-presence
- S29 Orit Gat, The Online Exhibition (e-flux): https://www.e-flux.com/criticism/325831/the-online-exhibition
- S30 Southwest Contemporary, on virtual exhibitions: https://southwestcontemporary.com/?p=24590
- S31 Wikipedia, Serif: https://en.wikipedia.org/wiki/Serif
- S32 Wikipedia, Floor plan: https://en.wikipedia.org/wiki/Floor_plan
- S33 Material Design 3, shape (summary only): https://m3.material.io/styles/shape/overview-principles

Used only through search-result summaries (not read on a page, so UNVERIFIED): Instagram help on the Live ring (https://help.Instagram.com/699289326902954); Eventbrite online-event help (https://www.eventbrite.com/support/articles/en_US/Multi_Group_How_To/how-to-set-up-an-online-only-event?lg=en_US); film-festival schedules and SFFILM online badge (https://sffilm.org/ht-faq/page/83); Valve level transitions (https://developer.valvesoftware.com/wiki/Level_Transitions); Unity level design (https://unity.com/blog/level-design-basics); Returnal red doors (https://www.gameskinny.com/tips/returnal-red-doors-explained-what-are-red-doors/); Dekker, world building online exhibitions (https://pure.uva.nl/ws/files/312321508/Dekker_World_build_ing_online_exhibitions.pdf); Artsy Online Exclusive guide (https://pages.artsy.net/rs/609-FDY-207/images/Artsy_The%20Gallery%27s%20Guide%20to%20Online%20Exclusive%20Shows%20.pdf); Israel Museum 360 tours and Google Arts walk (via search); Tate Warhol online tour (via search); Artsteps (https://artsteps.com, search summary only).

## Gaps worth closing later (by hand, in a real browser)

Artsy's live Viewing Room and Online Exclusive cards; Art Basel OVR; Vortic; Artsteps; Tate and MoMA online-exhibition pages; Israel Museum online section; Letterboxd, Spotify, Eventbrite card badges. These blocked or JS-only pages are the likeliest places to see an actual online/in-person tag in the wild, so screenshots of them would test claims 8, 9 and 11 above.
