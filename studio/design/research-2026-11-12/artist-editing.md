# The artist's editor: research and a proposed flow (12.11.2026)

Scope: how an artist on a phone fills their page (profile, works, texts, exhibitions, one On View room) with the
least friction. About 45 searches and page reads. Every claim is marked:

- **[verified: URL]** the page was read in this pass, or the fact came back in a search result quoting that page.
- **[search: URL]** the search engine's summary of that page said so; the page itself was not opened (or refused: 403).
- **[from knowledge]** not checked in this pass. Treat as a lead, not a fact.

What could not be verified is listed at the end (section I). No code was changed.

---

## 0. The ten findings that matter most

1. **Nobody good asks for metadata before the image is in.** Images first, then a per-item details step, then save
   all. Artwork Archive, ArtCloud and Artlogic all do it in this order. [verified, see A]
2. **Prefill, then let the artist correct.** ArtCloud prefills Title from the file name and Date from the current
   year; Artlogic can split a file name ("Pablo Picasso, Untitled, 1953") into fields; Squarespace reads the image's
   embedded title, description and tags. [verified, see A]
3. **"Use for All" is the single biggest time saver** for a series: one value (medium, year, units) applied to every
   item in the batch (ArtCloud). Artsy does the same idea as "templates" (reuse a work's details; add only title,
   images, inventory ID). [verified, see A]
4. **A half-done batch must survive.** Artwork Archive keeps "Incomplete Bulk Uploads" you can reopen; Saatchi has
   "Save & Exit" at the end of every section, which leaves a draft. [verified / search, see A]
5. **Required fields are very few.** Artsy's bulk import requires only artist, title, year, price; Artsper requires
   main image, title, price (dimensions only for sculpture); description is optional everywhere. [verified, see A]
6. **Undo beats "Are you sure?"** NN/g: "go to great lengths to provide undo"; Apple: no alerts for common, undoable
   actions even when destructive. The editor today uses the browser's `confirm()` twice. [verified, see D]
7. **Swipe is for delete only, never the only way, and always with undo or a visible Delete.** [verified, see D]
8. **A full-screen mode needs a title that names its task, one obvious way out, and a save-or-discard question only
   when work would be lost** (Apple, Modality). [verified, see C]
9. **Checklists: short ones get finished.** Userpilot's benchmark: average completion 19.2%, median 10.1% across 188
   companies. A head start raises completion (34% vs 19% in the Nunes and Dreze study). [search, see E]
10. **Type: 16-17 px body, never under 16 px in an input, 11-12 px floor for captions.** The editor is already at
    17 px body and 16 px inputs; what makes it feel oversized is the 38 px hero, 220 px drop zones and one field per
    row, not the body size. [verified numbers, see F; the diagnosis is from reading `index.html`]

---

## A. After the upload: getting metadata and text in with the least friction

### A1. What each product does

**ArtCloud (artists' accounts), the closest model to copy.**
Bulk Add → "Add Multiple Items" → drop or pick several images → one screen with a row per image. Fields, in this
order: **Title** (prefilled with the file name, editable), **Artist**, **Medium** (pick an existing one or create),
**Date Created** (defaults to the current year), then **Price, dimensions, units**. A **"Use for All"** button
applies one value to every item in the batch. **Done** creates the records; the rest is filled later, one by one or
by batch edit. The first image added to a record becomes its cover; images drag to reorder.
[verified: https://help.artlogic.net/connect/add-inventory-to-artcloud-artists]
[search: https://help.artcloud.com/knowledge/inventory-record-overview]

**Artwork Archive.**
Artwork → Pieces → Bulk Actions → Bulk Upload → choose a source (My Files, Web Address, Google Drive, Dropbox) →
up to **20 images**, each becomes a Piece → a blue button "Next: Enter Piece Details" → basic fields per piece, with
an **"Additional Fields"** disclosure for the rest → one button **"Save all # Pieces"** (the count is in the label).
Progress is kept once you press Next; unfinished batches are listed under **"Incomplete Bulk Uploads"** with the
start date and number of images, and reopen with images and typed details intact. Extra images of a piece are added
later on its record (up to 30). Bulk Edit is a separate tool: pick pieces with filters, then change a field for all.
[verified: https://help.artworkarchive.com/en/articles/7153746-how-to-bulk-upload-artwork-manually]
[search: https://help.artworkarchive.com/en/articles/6362947-how-to-bulk-edit-pieces]
The exact names of the per-piece fields are not in the article (see I).

**Artlogic.**
Artworks → New record → "Upload and create Multiple" → optional tick **"Extract fields from filename"** (fields
separated by commas in the file name, e.g. `Pablo Picasso, Untitled, 1953`) → Upload images → fill the available
fields → Save records → "View new records in list".
[verified: https://support.artlogic.net/hc/en-gb/articles/360013028819-Bulk-upload-Artwork-records]

**Artsy CMS (galleries).**
- Bulk import, up to 100 works: required columns are **artist name, title, year, price**; year may be a range; price
  is digits only and the currency comes from account settings; anything missing is filled in a **review step**;
  images are matched by file name; "2+ images and artist bios are recommended before publishing".
  [search: https://partners.artsy.net/product-updates/bulk-import-launch]
- Bulk edit: "Filter and select", **up to 50 works**, **one field per batch** (Availability, Location, Price
  Display and more), plus one-tap quick actions (publish, unpublish, add to a show).
  [verified: https://partners.artsy.net/product-updates/bulk-edit-launch]
- Templates: make a template from an existing work; it prefills the "key details"; you "add only what's unique,
  like title, images, and inventory ID". Meant for "multiple works from the same artist or series".
  [verified: https://partners.artsy.net/product-updates/artwork-templates-create-listings-faster]
- Artsy also scores each listing's completeness ("Listing Scores").
  [search: https://partners.artsy.net/product-updates/listing-scores-boost-your-artworks-visibility]

**Saatchi Art (a selling flow, so longer than ours should be).**
Step 1: **Artwork Title**, then **Primary and Additional Images**. Step 2: category, subject, year, and **5 to 12
keywords** (required). Then description, then prints, then a **review page** from which you can go back and edit
before publishing. **"Save & Exit"** at the end of any completed section leaves a draft that is not on the profile.
Image rules: JPEG, RGB, at least 1200 x 1500 px, under 50 MB. The statement is capped at 200 words.
[search: https://support.saatchiart.com/hc/en-us/articles/48922156110363 (the page refused a direct read, 403)]
[search: https://support.saatchiart.com/hc/en-us/articles/17737130295963]

**Artsper.**
Order: 1 Artist, 2 Photos (main image required; at least 2 images except prints and photographs; under 10 MB;
600 px minimum), 3 "Required information": **title** (no quotation marks, no year, no artist name), **price**,
**dimensions** (required for sculpture), 4 "Presentation" (optional): **description, ideally 100 to 250 words**,
5 delivery. [verified: https://intercom.help/artsper-support/en/articles/9014484-how-do-i-add-a-new-artwork]

**Rise Art.**
Artworks → Add Artwork → **main image and Original / Limited Edition** (cannot be changed later) → details
(materials, dimensions, price, signature, stock) → packaging → Add Artwork → Submit for Approval.
[verified: https://help.seller.riseart.com/article/151-how-to-upload-artworks]

**Singulart.** No public step-by-step for the upload form was found; the help centre covers plans and shipping.
[search: https://www.singulart.com/landing/en/singulart-artists-subscription-help-center] Not verified beyond that.

**Squarespace.**
Titles, descriptions and click-through links are edited per image; there is no native bulk edit (a third-party
plugin exists). **Image Metadata Importing** autofills Title, Description and Tags from the metadata already inside
the file. [search: https://support.squarespace.com/hc/en-us/articles/206543407]
[search: https://newsroom.squarespace.com/blog/image-metadata-importing]

**Behance.**
"Share Your Work" → add files, embeds or text as modules; caption and Reorder sit in each module's edit menu;
**projects do not auto-save** (the help page tells people to save from time to time), which is the thing not to copy.
[search: https://help.behance.net/hc/en-us/articles/204483684-Guide-Create-Publish-A-Project]

**Adobe Portfolio.** "Add caption" per image in a Photo Grid; captions double as alt text; they show on hover and
their style can't be changed. [search: https://community.adobe.com/questions-606/image-captions-photo-grid-in-adobe-portfolio-576975]

**Etsy (Seller app).** Listings → (+) Create; core fields are photos, title (140 characters max), category,
description, price, tags; up to 10 photos and 1 video. Etsy's optional AI tool **suggests** a title from the current
title, the first photo and the description; it is a suggestion the seller accepts, not an automatic write.
[search: https://www.etsy.com/seller-handbook/article/1347574487014]

**Shopify (mobile app).** Product descriptions can be generated, revised or expanded by Shopify Magic from the
mobile app; the entry point is an icon on the description field itself.
[search: https://www.shopify.com/blog/ai-product-descriptions]
Field order on the mobile product screen (media at the top, then title, description, price) is [from knowledge].

**Instagram composer.** Pick photos (the multi-select icon) → edit → one last screen with the caption; alt text
is under **Advanced Settings → Write Alt Text** on that last screen.
[search: https://help.instagram.com/iphone-app/503708446705527]
The caption field sits beside a small thumbnail of the picture, and one caption serves the whole carousel
[from knowledge].

**Apple Photos.** Open the photo, swipe up (or tap Info), type in "Add a Caption", Done. The text field lives
directly under the picture, in the same view, with no separate form.
[search: https://iphonelife.com/content/how-to-add-captions-to-iphone-photos]
Google Photos: a swipe-up caption could not be confirmed in this pass [from knowledge: it has one].

### A2. The pattern they share

| Question | What the best ones do |
|---|---|
| When is metadata asked? | **After** the images are in, as step two of the same flow. Never before. |
| Where is the text field? | Beside or directly under a thumbnail of that image, so the artist always sees which work they are describing (NN/g says the same of contextual actions: "in view of the content it affects"). |
| Field order | Title → (Artist) → Medium → Year → Dimensions + units → Price. Description comes last and is optional. |
| Required | Image and title. Price only where selling. Dimensions only for sculpture (Artsper). |
| Defaults | Title from file name; year = this year; units and currency from the account; medium from a list of the artist's own earlier values. |
| Apply to all | One button per field ("Use for All"), or a template made from an earlier work. |
| Per-item progress | The count in the save button ("Save all 12 Pieces"); a completeness score per listing (Artsy). |
| Leaving half way | A resumable draft ("Incomplete Bulk Uploads", "Save & Exit"). |
| The rest of the fields | Behind "Additional Fields", or on the single record later. |
| Bulk edit later | Select many → change one field → apply (Artsy: 50 at a time, one field per batch). |

### A3. What this means for Open Studio

Open Studio's importer already says "You choose what comes in, and fix titles and sizes after, on your page"
(`artist.js`, importer). The gap is the "after": there is no step that walks the artist through the works they just
brought in. Proposed: a **"Name your works" pass** right after any upload or import (section H, screen 2b).
One work per screen, the picture on top, four fields under it, Next. Size matters more here than anywhere else,
because works without a size are left out of the 3D room (the importer's own message says so).

---

## B. Writing the bio and the statement on a phone

- **Length guidance, stated as words, shown as a quiet counter.** Saatchi caps the statement at 200 words; general
  guidance is 100 to 300 words for a statement and 100 to 150 for a short bio; Artsper asks 100 to 250 words for a
  work's description. Bios are usually third person, statements first person.
  [search: https://canvas.saatchiart.com/?p=72512] [verified: Artsper link above]
  [search: https://guildhouse.org.au/artist-toolkits/artist-statements/]
- **Prompts instead of a blank box.** Three questions, each a tap that drops a starter line into the field: "What
  do you make, and from what?", "What keeps coming back in the work?", "Where do you work?". [from knowledge:
  the pattern is used by LinkedIn's About and by dating-app prompts; not checked in this pass]
- **AI as a suggestion, never as the author.** Etsy suggests a title from the first photo and the existing text,
  and the seller accepts or ignores it; Shopify puts the generate button on the field and offers "revise" and
  "expand" on text the merchant already wrote. For artists, "tidy what I wrote" is safer than "write it for me":
  the statement is their voice. This needs the owner's word (it costs money per call and touches tone).
  [search: Etsy and Shopify links above]
- **Save as you type, and say so.** A long text typed with thumbs must not depend on a Save button. Primer's rule
  is to start from explicit saving for forms and never mix the two patterns in one form; so the text screen should
  be all-autosave (a small "Saved" by the title), with no Save button on it, and the short field forms all-explicit
  or all-autosave, not half and half. [verified: https://primer.style/ui-patterns/saving]
  GitLab's design notes add: on mobile, show the confirmation where the keyboard doesn't cover it (under the top
  bar). [search: https://gitlab.com/gitlab-org/gitlab-design/issues/121]
- **Preview is one tap away and returns to the same place.** "See it on your page" opens the public page scrolled
  to the text; Back returns to the editor with the cursor where it was. [from knowledge]
- **Dictation and paste.** Most artists already have a statement somewhere. Offer "Paste" as the first action when
  the field is empty; the iOS keyboard's microphone works in any `textarea` without extra code. [from knowledge]
- **One field per screen for long text.** A full-height `textarea` that grows, title in the top bar, Done at the
  top right (the keyboard covers the bottom). [from knowledge; consistent with Apple's Modality guidance in C]
- **Labels above the field, never inside it.** Baymard found inline (placeholder) labels cause "severe flow and
  typing issues"; people delete their text to see the label again. Labels go above. The editor already does this.
  [search: https://baymard.com/blog/mobile-forms-avoid-inline-labels]
  [search: https://baymard.com/blog/mobile-form-usability-label-position]

---

## C. Going between the 3D room and the lists and forms

**What the guidance says**

- A full-screen modal style suits "a multistep task like marking up a document or editing a photo".
  **"Always give people an obvious way to dismiss a modal view"**: on iOS people expect a button in the top bar,
  or a swipe down. **"Make it easy to identify a modal view's task"** with a title that names it.
  **"When necessary, help people avoid data loss by getting confirmation before closing"**: Apple's example is an
  action sheet with a save option. **"Avoid creating a modal experience that feels like an app within your app"**:
  one path through, and no button that could be mistaken for the one that closes it. **One modal at a time.**
  [verified: https://developer.apple.com/design/human-interface-guidelines/modality]
- NN/g on modes: the active mode must be clearly visible, with **"at least two visual indicators"**; mode slips
  happen when the system does not show its state; a feature that exists only inside one mode is harder to find.
  [verified: https://www.nngroup.com/articles/modes/]
- Matterport, when it moved editing to phones, put Add / Edit / Delete on one **Action Bar that stays in the same
  place** for tags, labels, measurements and views.
  [search: https://matterport.com/blog/edit-your-spaces-anywhere-any-device]
- Kunstmatrix's order is the same as ours should be: upload the art → create the exhibition and pick the room
  (filter rooms, choose wall colour) → place the works in the "exhibition manager" → publish as the last step,
  with "unlist" to keep it private. ArtPlacer: choose space → upload → arrange → publish with a link.
  [search: https://www.kunstmatrix.com/en/info/tutorials/creating-a-virtual-exhibition]
  [search: https://help.artplacer.com/support/solutions/articles/65000185235]

**Rules for Open Studio, derived from the above**

1. **The room is a place you enter and leave, with one door.** Top-left: "← On View" (the name of where Back goes,
   not a bare arrow). Top-right: "Done". Nothing else in the top bar. [Apple: obvious dismissal; no look-alike buttons]
2. **Two signs that you are editing**, not visiting: the top bar reads "Hanging · <title>", and the bottom action
   bar is present. A visitor's view has neither. [NN/g: two indicators]
3. **The room saves as you go.** Every placement is written at once (the code already calls `keep()` and `save()`),
   so Done never loses anything and there is no Cancel. Offer **Undo** for the last move instead. The save-or-discard
   sheet is then needed only if a save failed. [Apple: confirm only when content would be lost]
4. **Each state has its own address** so the browser's Back, a reload and a shared link all work:
   `#/studio/onview` (the summary), `#/studio/onview/space`, `#/studio/onview/hang`, `#/studio/onview/walk`.
   Today the room and the form share one route and the steps are scroll targets (`OV_STEPS` in `artist.js`), which
   is why Back feels unpredictable. [from knowledge + reading the code]
5. **Come back to where you were.** Leaving to fix a work's size and returning must land on the same wall, same
   work. Keep `{route, scrollY, selected work, camera}` per screen in `sessionStorage`. [from knowledge]
6. **Fix a missing size without leaving the room.** A work with no size shows in a tray "Needs a size"; tapping it
   opens a small sheet (height, width, cm) over the room; saving hangs it. One sheet, closed before anything else
   opens. [Apple: one modal at a time, short and narrow]
7. **The page never traps the scroll.** While the room is open the page behind does not scroll; pinch and drag
   belong to the room; the top bar stays outside the canvas so it is always reachable. [from knowledge]

---

## D. Adding and deleting comfortably

**Guidance**

- NN/g, confirmation dialogs: use them "before committing to actions with serious consequences"; **"go to great
  lengths to provide undo"**; "if you warn people too much, they stop paying attention"; name the thing
  ("Delete 'Blue Field, 2021'?"), and label the buttons with the outcome ("Delete work" / "Keep work"), not Yes/No.
  [verified: https://www.nngroup.com/articles/confirmation-dialog/]
- Apple, alerts: **"Avoid displaying alerts for common, undoable actions, even when they're destructive"**; show
  one for an **uncommon destructive action that can't be undone**; give it a Cancel button and the destructive
  style. In an action sheet the destructive button goes at the top.
  [search: https://developer.apple.com/design/human-interface-guidelines/alerts]
  [search: https://developer.apple.com/design/human-interface-guidelines/action-sheets]
- NN/g, swipe: "Lack of signifiers makes it unclear where the contextual swipe can be used"; "Burying key actions
  behind a contextual swipe prevents users from discovering them"; people expect swipe to reveal **destructive**
  actions and nothing else; keep the content in view; require a visible Delete tap after the swipe, or give a
  prominent undo; keep the gesture's meaning the same everywhere; don't let it fight page-level swipes.
  [verified: https://www.nngroup.com/articles/contextual-swipe/]
- Material snackbar with an Undo action: the page could not be read in this pass. Its guidance (4 to 10 seconds,
  one at a time, above the bottom bar) is [from knowledge].
- WCAG 2.2, 2.5.7 Dragging Movements (AA): anything done by dragging must also work with single taps. For a
  reorder list: tap to select, then up / down controls, or a "move to position" menu.
  [verified: https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html]

**Rules for Open Studio**

| Action | Rule |
|---|---|
| Add | One "+" in the same place on every list (bottom, thumb reach), labelled by what it adds: "Add works", "Add an exhibition". A new item opens already in edit, cursor in Title. |
| Delete one work, text or photo | No dialog. Remove at once, show "Removed 'Title'. **Undo**" for about 7 seconds above the bottom bar, and keep the item restorable until the next visit (soft delete). |
| Delete an exhibition or the On View room | Still no browser `confirm()`. Same undo bar (the On View page already does this with `ovGone`; extend the same code to exhibitions and virtual shows, `artist.js` lines 802 and 840). |
| Delete many | Select mode → "Delete 6" → one sheet naming the count, with "Delete 6 works" / "Keep them". This is the one place a confirmation is right: it is rare and large. |
| Delete the account or the whole page | A real alert, destructive style, typed word. Rare and not undoable. |
| Swipe | Left swipe on a list row reveals **Delete** only. Never the only way: the same Delete is in the work's own screen and in the "…" menu. |
| Multi-select | Long-press a thumbnail, or tap "Select" in the top bar. Bottom bar turns into: Set medium · Set year · Add to exhibition · Delete. Count in the title ("6 selected"). |
| Reorder | Drag by a handle, and for every item a "Move up / Move down / Move to top" menu (WCAG 2.5.7). |

---

## E. Staged setup and checklists

- **Completion is low unless the list is short and useful.** Userpilot, 188 companies: average checklist completion
  **19.2%**, median **10.1%**; by industry 12.5% to 24.5%.
  [search: https://userpilot.com/blog/?p=197841]
- **Fewer steps, more finishers.** One post (412,000 users, 38 products; sampling unclear, treat as weak): 3 to 5
  steps complete at 67%, 6 to 9 at 38%, 10+ at 18%. Product tours, from a vendor's own data: 1 to 2 steps 73%,
  9+ steps 8%. [search: https://visionary-marketing.co.uk/blog/customer-onboarding-statistics-2026]
  [search: https://www.indiehackers.com/post/onboarding-benchmarks-from-real-data-across-464-saas-products-median-tour-completion-is-29-6288651c93]
- **A head start works.** Nunes and Dreze (2006, Journal of Consumer Research 32(4)): a loyalty card with 2 of 10
  stamps already given was redeemed by **34%**, against **19%** for an empty 8-stamp card; the work required was the
  same. Too obvious a head start weakens it. [search: https://coglode.com/nuggets/endowed-progress-effect]
- **Completion is not the goal.** Several sources warn that simpler flows raise completion without raising real
  use. The step that matters is the one that predicts the artist coming back: for us, a page that is public with
  works that have sizes. [search: same Visionary Marketing page]
- **Let people leave.** Saatchi's "Save & Exit" at every section and Artwork Archive's resumable batches are the
  selling platforms' version of "skip for now". [links in A]
- Artwork Archive publishes a "getting started checklist" in its help centre rather than forcing a wizard.
  [search: https://help.artworkarchive.com/en/articles/7792762-getting-started-checklist-for-collectors]

**For Open Studio:** five stages, the first already ticked ("Your account", done at sign-up: the head start);
each stage is done at a **low bar** (Profile: name + portrait; Works: 3 works with titles; Texts: any text;
Exhibitions: optional, marked so; On View: a room published). Every stage has "Skip for now" except none are
forced. The page can go public after stage 2. A quiet mark when a stage closes (the pencil tick, since it is
"live now" in the owner's handwriting rule only at that moment), no confetti. The existing `st-todo` rows and
`readiness()` checks in `artist.js` are the start of this.

---

## F. Type scale and density

### The numbers

**Apple HIG, iOS, Dynamic Type at Large (the default).** Default text 17 pt, minimum 11 pt.
[verified: https://developer.apple.com/design/human-interface-guidelines/typography]

| Style | Size / leading (pt) | Weight |
|---|---|---|
| Large Title | 34 / 41 | Regular |
| Title 1 | 28 / 34 | Regular |
| Title 2 | 22 / 28 | Regular |
| Title 3 | 20 / 25 | Regular |
| Headline | 17 / 22 | Semibold |
| Body | 17 / 22 | Regular |
| Callout | 16 / 21 | Regular |
| Subhead | 15 / 20 | Regular |
| Footnote | 13 / 18 | Regular |
| Caption 1 | 12 / 16 | Regular |
| Caption 2 | 11 / 13 | Regular |

Apple adds: with a custom font in a thin weight, go larger than these.

**Material 3.** Body Large 16/24 (400), Title Medium 16/24 (500), Label Large 14/20 (500).
[search: https://material-web.dev/theming/typography]
The rest of the table is [from knowledge]: Headline L/M/S 32/40, 28/36, 24/32; Title L 22/28, S 14/20;
Body M 14/20, S 12/16; Label M 12/16, S 11/16; Display L 57/64.

**Shopify Polaris.** bodyMd **13 px**, bodyLg 14 px (a desktop admin's density; no separate mobile token).
[search: https://polaris.shopify.com/components/typography/text]

**Atlassian.** Tokens in rem; the smallest size is **12 px**, "avoid using except for fine print"; headings no more
than twice the body size and never smaller than it. Body 14 px default, body large 16/24 [search, third-party list;
the default 14 px is from knowledge]. [search: https://atlassian.design/foundations/typography]

**GitHub Primer.** Body medium **14 px** (line height about 1.43), body large 16 px, title medium 20 px, title
large 32 px (600). [search: https://primer.style/product/primitives/typography]

**Reading the five together:** desktop work tools sit at 13 to 14 px; phone systems sit at 16 to 17 px. On a phone
the body must be 16 to 17. iOS Safari zooms the page when an input's text is under 16 px [from knowledge], so
inputs stay at 16 or more. Touch: WCAG AA asks 24 x 24 CSS px, the app's own rule is 44 x 44 and stays.

### What the editor has now (read from `studio/app/index.html`)

Body 17 px; small 13 px (16 in "lite"); inputs 16 px; `.st-h1` 26 px, 38 px in the hero; section h2 19 to 20 px;
flags 11 px mono capitals; drop zone 220 px tall; add tile 4:3.

So the body size is right. "Oversized" comes from: a 38 px serif title on a working screen, 220 px drop zones,
one field per row for fields that are two characters long (year, height, width), full-width buttons stacked two
high, and section headers at 19 to 20 px above every group.

### Recommended scale for the editor (serif display, sans UI)

| Role | Face | Size / line | Notes |
|---|---|---|---|
| Screen title (top bar) | sans, 600 | 17 / 22 | Like iOS Headline. The serif leaves the working screens' top bar. |
| Stage title (hub, once per screen) | serif | 26 / 30 | One per screen at most. Drop the 38 px hero in the editor. |
| Section label | sans, 600 | 13 / 18, sentence case | Replaces 19 to 20 px h2 inside forms. |
| Body, list titles | sans | 17 / 24 | As now. |
| Input text | sans | 17 / 24 (never under 16) | |
| Field label | sans | 13 / 18, muted | Above the field. |
| Secondary line in a row | sans | 15 / 20, muted | |
| Help, counters, flags | sans or mono | 12 / 16 | Floor. Nothing smaller than 12 in the editor (11 only for the mono flag). |
| Long text being written (bio, statement) | serif | 18 / 28 | The artist sees it as visitors will. |

Density: rows 56 px with a 44 px thumbnail (72 px rows for works, 56 px thumbnail); fields 48 px tall; 12 px
between fields, 24 px between groups; 16 px side gutter; short fields share a row (Year | Height | Width | Depth |
cm). One primary button per screen, 48 px, pinned above the keyboard-safe bottom. All of this is a proposal for
the owner: the editor's look is design, and Studio Paper stays.

---

## G. Accessibility (WCAG 2.2 AA) and Hebrew in mixed fields

**WCAG 2.2 points that touch this editor**

- **2.5.8 Target Size (Minimum), AA:** 24 x 24 CSS px, or enough spacing that a 24 px circle on each small target
  touches no other; inline links in a sentence are exempt. The app's 44 px rule already exceeds it.
  [verified: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html]
- **2.5.7 Dragging Movements, AA:** reorder and hanging by drag need a tap alternative (select, then move
  controls). This applies to reordering works and to placing works on a wall.
  [verified: https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html]
- **2.4.11 Focus Not Obscured (Minimum), AA:** a focused field must not be fully hidden by a sticky top bar or a
  pinned bottom button. Use `scroll-padding` so focus scrolls clear of both bars.
  [verified: https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html]
  The on-screen keyboard is the system's, so the criterion does not cover it; in practice scroll the focused field
  into the visible viewport (`visualViewport`) [from knowledge].
- **3.3.7 Redundant Entry, A:** don't ask again for what was already given in the same process (name from sign-up
  goes into the profile; medium typed once is offered again). **3.3.8 Accessible Authentication, AA:** already met
  by the emailed code and Google. **3.2.6 Consistent Help, A:** if "Ask for help" exists, it sits in the same
  place on every editor screen. [from knowledge: the criteria exist in WCAG 2.2; pages not opened in this pass]
- Also, from WCAG 2.1 and still required [from knowledge]: every image the artist uploads needs a text
  alternative (default it to "Title, year, medium" so nobody has to write one); errors are announced in text next
  to the field, not by colour alone; an undo bar must not disappear before a screen-reader user can reach it
  (keep the item restorable from a "Recently removed" row as well); status messages ("Saved") use `role="status"`;
  text contrast 4.5:1 (check the muted 13 px labels on Studio Paper); nothing breaks at 200% text size; motion
  respects `prefers-reduced-motion`.
- Primer notes that toasts have accessibility problems and avoids them on github.com. If the undo bar is used,
  it must take focus order sensibly and have a second way to undo. [verified: Primer saving page]

**Hebrew and mixed-direction input**

- Put **`dir="auto"`** on every free-text `input` and `textarea`. A single-line field then takes its direction
  from the first strong character, so a Hebrew title in an English screen reads right to left. In a `textarea`
  "base direction is assigned to each paragraph independently", so a Hebrew paragraph followed by an English one
  both come out right. [verified: https://www.w3.org/International/questions/qa-html-dir]
- **Where the text is shown back**, wrap each user-written string in `<bdi>` or give its container `dir="auto"`,
  so a Hebrew title does not reorder the English around it ("Title · 2021 · oil on canvas").
- **Set direction in markup, not CSS**: "Do not use CSS to apply base direction in HTML pages". Use logical
  properties (`text-align: start`, `padding-inline`, `margin-inline`) so layout follows. The app already uses
  `padding-inline` and `padding-block`.
- Auto-detection fails for a line that starts in one script and is mostly the other; that is acceptable, and the
  `dirname` attribute can send the chosen direction with the form if it ever needs storing.
- Numbers-only values ("120 x 80") have no strong character; browsers disagree about their alignment. So the
  number fields (year, sizes, price) are `dir="ltr"` always, with `inputmode="numeric"` or `"decimal"`.
- Keyboard hints per field [from knowledge]: Title `autocapitalize="words"`, `enterkeyhint="next"`; statement
  `autocapitalize="sentences"`; year `inputmode="numeric"` `maxlength=4`; sizes `inputmode="decimal"`;
  `autocomplete="off"` on titles; never `autocorrect` on names. Baymard recommends input-specific touch keyboards.
  [search: https://baymard.com/blog/mobile-checkout]
- Store, per text, nothing about language. If a second-language version is ever wanted, it is a second field, not
  a toggle on the first. [from knowledge]

---

## H. Proposed information architecture and flow

### H1. The shape

One hub, five stages, each stage one list and one item screen. The room is the only full-screen mode.

```
#/studio                      Hub: your page, as a checklist of five stages + "See my page"
  #/studio/profile            1 Profile
  #/studio/works              2 Works: grid
     #/studio/works/add         2a sources (photos, website, Drive, Instagram zip)
     #/studio/works/name        2b "Name your works" pass (after any import)
     #/studio/work/<id>         2c one work
  #/studio/texts              3 Texts: list
     #/studio/text/<key>        3a one text, full screen
  #/studio/exhibitions        4 Exhibitions: list
     #/studio/exhibition/<id>   4a one exhibition
  #/studio/onview             5 On View: summary
     #/studio/onview/space      5a choose the room
     #/studio/onview/hang       5b the room, editing (full screen)
     #/studio/onview/walk       5c the room, as a visitor sees it
```

Today's top nav has four pills (Your page, On View, Exhibitions and tours, Bring work in). In the proposal,
"Bring work in" becomes the Add action inside Works (2a), not a top-level place, and Profile and Texts get their
own stages instead of living on "Your page".

Rules that hold on every screen:

- **Top bar:** "← <name of the parent>" on the left, the screen's title in the middle (17 px), at most one text
  action on the right (Done, Select, Skip). Back always goes to the parent in the tree above, never "wherever you
  came from", except from a cross-link, where it returns to the screen that sent you (see H3).
- **One primary button** per screen, pinned at the bottom above the safe area; it moves above the keyboard.
- **Saving:** field forms save on leaving each field and on Back, with "Saved" under the top bar; no Save button,
  no "unsaved changes" question. (Primer: one pattern per form.)
- **Deleting:** immediate with Undo; no `confirm()`.
- **Stage strip** under the top bar on the five stage screens only: `1 Profile · 2 Works · 3 Texts · 4 Exhibitions
  · 5 On View`, the current one marked with `aria-current`, done ones ticked. Tapping one goes there. It scrolls
  sideways; it is not shown on item screens or in the room.

### H2. Screen by screen

**Hub, `#/studio`**
- On it: portrait and name (small), the public state ("Your page is public" / "Only you can see it yet"), five
  rows, each "Stage name, one line of what is there or what is missing, a tick or an arrow". Below: "See my page".
- Primary action: **Continue: <the first unfinished stage>**. When all are done: **See my page**.
- Text entry: none.
- Back: "← Open Studio" to the app's Home.
- Links: each row to its stage. Opening `#/studio` after a break shows "Pick up where you left: <screen>" as the
  first row (from the saved last route).

**1 Profile, `#/studio/profile`**
- On it: portrait (tap to change: camera or library), First name, Last name (prefilled from sign-up), City,
  Country, one line "What you make" (e.g. "Painter"), links (website, Instagram).
- Primary action: **Next: Works**.
- Text entry: short fields here, in place. The bio is not here; a row "Your bio: 0 words. Write it" links to 3a.
- Back: "← Studio".
- Links: bio row → Texts; "See my page".

**2 Works, `#/studio/works`**
- On it: a 3-column grid of the works, newest first, grouped by year as now. Each tile carries a small mark when
  something is missing ("no title", "no size"). A filter chip row: All · Needs details (n) · In On View.
  Top right: **Select**.
- Primary action: **Add works** (opens 2a).
- Text entry: none on the grid.
- Back: "← Studio".
- Links: tap a tile → 2c. The chip "Needs details (n)" → 2b for just those. After Select: Set medium · Set year ·
  Add to exhibition · Hang in On View · Delete.

**2a Add works, `#/studio/works/add`** (a sheet over the grid, not a page)
- On it: four rows: From this phone · From a website · From a Drive folder · From an Instagram export.
- Primary action: the row you tap. "From this phone" opens the system picker at once.
- Back: swipe down or "Cancel".
- Links: when the images arrive → 2b, automatically.

**2b Name your works, `#/studio/works/name`** (the pass that is missing today)
- On it: one work per screen. Top bar: "3 of 12" and **Done** (leave any time; everything typed is kept). The
  image fills the upper 40% (tap to zoom). Under it, in this order:
  1. **Title** (prefilled from the import's caption or the file name when it looks like words; cursor here)
  2. **Year** | **Height** | **Width** | **Depth** | cm (one row; year defaults to the last one typed, else this
     year; depth optional)
  3. **Medium** (chips of the artist's own earlier mediums, plus a free field)
  4. "More: price, edition, a note about the work" (collapsed)
  Above the keyboard, a strip: **Same as the last one** (copies medium, year and size from the previous work) and,
  on medium and year, **Use for all 12**.
- Primary action: **Next** (the last one reads **Done: see your works**). The return key's hint is "next" and
  moves through the fields, then to the next work.
- Text entry: here, under the picture it describes.
- Back: "← Works" keeps everything; the unfinished ones stay under "Needs details".
- Links: Done → the grid. If no work is hung yet, the grid then shows one line: "Hang these in a room" → 5.
- Skipping is allowed on every work ("Skip"), since nothing is required but the image; a work without a size is
  told plainly "won't hang in the 3D room until it has a size".

**2c One work, `#/studio/work/<id>`**
- On it: the image (with "Replace" and "Add a detail photo"), the same four groups as 2b, then "Shown in:
  <exhibitions>, On View wall 2" as links, then Delete at the very bottom in plain text.
- Primary action: none pinned; it saves by itself. Top right: **Done**.
- Text entry: in place.
- Back: "← Works", or "← On View" when opened from the room (see H3).
- Links: previous / next work by swiping sideways on the image; "See it on my page".

**3 Texts, `#/studio/texts`**
- On it: three rows: **Short bio** (for the top of the page; about 60 words), **Statement** (about 200 words),
  **CV** (exhibitions, education, prizes: a list, not prose). Each row shows its first line and a word count, or
  "Not written yet".
- Primary action: **Write your <first empty one>**.
- Back: "← Studio".
- Links: each row → 3a. The CV row offers "Fill from your exhibitions" (takes stage 4's list).

**3a One text, `#/studio/text/<key>`**
- On it: nothing but the text, in the page's serif at 18/28, `dir="auto"`. When empty: three prompt chips and
  "Paste". A quiet counter at the bottom ("84 words · about 200 reads well"). "Saved" under the top bar.
- Primary action: **Done** (top right, because the keyboard covers the bottom).
- Text entry: the whole screen.
- Back: "← Texts"; nothing is lost.
- Links: "See it on my page" (opens the page at that text; Back returns here with the cursor where it was).

**4 Exhibitions, `#/studio/exhibitions`** (marked "optional" on the hub)
- On it: past shows, newest first: cover, title, venue · year, and a flag when it has a 3D tour.
- Primary action: **Add an exhibition**.
- Back: "← Studio".
- Links: a row → 4a.

**4a One exhibition, `#/studio/exhibition/<id>`**
- On it: Title, Venue, City, Year (one row for city and year), Solo / Group, then **Photos** (add many at once;
  the first is the cover; reorder by drag or by "Move up / down"), then "About the exhibition" as a row that opens
  the same full-screen text screen as 3a, then "Works in this show" (pick from the grid in Select mode).
- Primary action: **Add photos** while there are none; after that none pinned.
- Text entry: short fields in place; the long text in the full-screen writer.
- Back: "← Exhibitions".
- Links: "Works in this show" → the Works grid in pick mode, returning here. The tour, where there is one.

**5 On View, `#/studio/onview`** (the summary; calm, no canvas running)
- On it: a still of the room (or its film), the title, "9 works hung · 2 need a size", the state (Draft /
  Published), and four rows that are the four steps: **Room** (White Cube, medium) · **Title and your words** ·
  **Hanging** · **Publish**. Each shows what is set.
- Primary action: changes with the state: **Choose a room** → **Hang your works** → **Walk through it** →
  **Publish** → **See it on my page**.
- Text entry: the title is edited in place; "In your words" opens the full-screen writer.
- Back: "← Studio".
- Links: Room → 5a; Hanging → 5b; "2 need a size" → the size sheet for those two, one after the other.

**5a Choose the room, `#/studio/onview/space`**
- On it: the rooms as large cards with their size in metres and how many works they hold; a size switch
  (small / medium / large) per room; the wall paint.
- Primary action: **Use this room**.
- Back: "← On View" without changing anything.
- Links: "Look inside" opens 5c for that room, empty.

**5b The room, editing, `#/studio/onview/hang`** (the only full-screen mode)
- On it: the room. Top bar: "← On View" · "Hanging · <title>" · **Done**. Bottom action bar, always in the same
  place: **Works** (a tray of thumbnails: hung, not hung, needs a size) · **Rehang for me** · **Undo** · **Walk**.
  Tapping a hung work selects it: Move left / Move right / To another wall / Take down (tap alternatives to
  dragging).
- Primary action: **Done**.
- Text entry: none, except the size sheet for a work that has no size.
- Back: "← On View"; the same as Done, since every move is saved.
- Links: tap-and-hold a work → "Edit this work" → 2c, whose Back reads "← On View" and returns to the same wall.

**5c Walk, `#/studio/onview/walk`**
- On it: the room exactly as a visitor gets it, with one bar on top: "← Keep editing" · "This is what visitors
  see" · **Publish** (or "Published ✓").
- Primary action: **Publish**.
- Back: "← Keep editing" to 5b, or to the summary if entered from there.

### H3. How the stages link (the "linked" the owner asked for)

- **Forward:** every stage's primary button names the next stage. Nothing forces the order.
- **Sideways, with a way back:** a cross-link carries where it came from (`?from=onview`), and the target's Back
  reads the sender's name. Three of these matter: room → one work → room; exhibition → pick works → exhibition;
  profile → bio → profile.
- **Missing things are links, not messages:** "2 need a size" opens those two; "No portrait" opens the picker;
  "Not written yet" opens the writer.
- **Resume:** the last editor route, scroll position and selection are remembered per phone; the hub offers them
  first.
- **The public page is always one tap away** and always comes back to the same editor screen.

### H4. Twenty improvements, ranked (benefit first, then cost)

Effort: S under a day, M one to three days, L more. Every one of these that changes how a screen looks is a design
change and needs the owner's word before it is built.

| # | Improvement | Expected benefit | Effort |
|---|---|---|---|
| 1 | **"Name your works" pass** after every upload or import: one work per screen, image on top, Title → Year/size → Medium, Next (2b) | The biggest gap today. Turns "fix it later" into two minutes; more works get sizes, so more hang in the room | M |
| 2 | **Prefill**: title from caption or file name, year from the last typed or this year, medium as chips of earlier values | Fewer keystrokes per work, roughly halves typing for a series (ArtCloud, Artlogic, Squarespace do this) | S |
| 3 | **"Same as the last one" and "Use for all"** for medium, year, size | A series of 12 becomes one entry plus 12 titles | S |
| 4 | **Split On View into addressable steps** (`/onview`, `/space`, `/hang`, `/walk`) with a calm summary first | Back and reload become predictable; the room stops competing with a form on one long page | M |
| 5 | **Top bar rule**: "← <parent's name>", title, one action; drop the four-pill nav for a hub and stage strip | People always know where Back goes; "staged" becomes visible | M |
| 6 | **Undo instead of `confirm()`** for exhibitions and virtual shows (lines 802, 840), and for works and photos; soft delete | Deleting stops being frightening and stops interrupting (NN/g, Apple) | S |
| 7 | **Autosave everywhere in the editor, with "Saved"** under the top bar; no mixed Save buttons | Nothing typed on a phone is ever lost; no "did it save?" | M |
| 8 | **Editor type and density pass**: 17 px sans screen titles, no 38 px hero, section labels 13 px, short fields on one row, 56 to 72 px rows, drop zone to a button | Directly answers "oversized": about twice as much fits per screen with the same body size | M |
| 9 | **Hub as a five-stage checklist**, first stage pre-ticked, low bars, Exhibitions marked optional, "Continue: <next>" | A clear next step every time; the head-start effect (34% vs 19%) | M |
| 10 | **Fix a missing size inside the room** (a sheet over the canvas) and "n need a size" as a link | Removes the worst round trip in the product: room → page → work → back | M |
| 11 | **Cross-links that return**: room → work → room; exhibition → pick works → exhibition (`?from=`) | "Linked" as the owner means it: no dead ends, no lost place | S |
| 12 | **Full-screen writer** for bio, statement and exhibition text: serif 18/28, prompts when empty, Paste, word guide, Done at the top | Writing with thumbs becomes bearable; texts get written | M |
| 13 | **Resume where you left** (route, scroll, selection per phone) and "Pick up where you left" on the hub | Short phone sessions add up instead of restarting | S |
| 14 | **Select mode on the works grid**: set medium, set year, add to exhibition, hang, delete (one field per action, like Artsy) | Corrections to many works in one go | M |
| 15 | **"Needs details (n)" filter and a small mark on incomplete tiles** | The artist sees what is missing without opening each work | S |
| 16 | **`dir="auto"` on every text field and `<bdi>` where titles are shown**; numbers forced LTR; right `inputmode`, `enterkeyhint`, `autocapitalize` per field | Hebrew titles and statements display correctly; the right keyboard every time | S |
| 17 | **Tap alternatives to every drag** (reorder photos and works; move a hung work left/right/to another wall) | WCAG 2.5.7; also easier for everyone on a small screen | M |
| 18 | **Resumable imports**: an interrupted import or naming pass reappears as "12 works waiting for names" | No batch is lost to a phone call (Artwork Archive's "Incomplete Bulk Uploads") | S |
| 19 | **Default alt text** for every work ("Title, year, medium"), editable under More; `scroll-padding` so a focused field clears the bars; `role="status"` on "Saved" | WCAG 1.1.1, 2.4.11, 4.1.3 without asking the artist for anything | S |
| 20 | **AI help for the texts as a suggestion** ("tidy what I wrote", "shorten to 60 words"), and a suggested title from the picture | Helps artists who freeze at a blank box; needs the owner's decision (cost per call, tone, the free model's quality) | L |

Suggested first build, if the owner agrees: 1, 2, 3, 6, 11, 16 (the naming pass and its helpers, undo, return
links, Hebrew input). They are the least design and the most comfort. Then 4, 5, 8, 9 together, as one design the
owner sees in Figma first.

---

## I. What this pass could not verify

- **Saatchi Art's upload article** refused a direct read (403). Its steps come from the search engine's summary
  of that article, not from the page. Medium, dimensions and price fields were not confirmed.
- **Singulart**: no public documentation of the upload form was found.
- **Artwork Archive and Artlogic**: the articles describe the steps but do not list the per-item fields or say
  which are required.
- **Bluethumb** refused a read (403); not used.
- **Instagram's composer layout, Shopify's mobile field order, Google Photos' caption**: from knowledge, apart
  from the Instagram alt-text path.
- **Material 3**: the snackbar guidance page returned no text; the full type table is from knowledge, with three
  rows confirmed by search.
- **Atlassian's 14 px default body** and **Polaris's behaviour on small screens**: not confirmed.
- **Onboarding numbers**: Userpilot's figures came through a search summary; the step-count figures are from a
  post whose sampling is unclear. The Nunes and Dreze numbers are from secondary summaries of the paper.
- **WCAG 3.3.7, 3.3.8, 3.2.6**: cited from knowledge; only 2.5.8, 2.5.7 and 2.4.11 were read.
- **No screen was looked at.** The diagnosis of the current editor comes from reading `artist.js` routes and the
  `.st` styles in `index.html`, not from opening it as an iPhone. Before any of H is built, the current editor
  should be walked through at 390 x 844 and the "oversized" places measured.
- Cargo and Format were not researched.
