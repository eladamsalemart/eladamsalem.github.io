# The museum's CURATOR (a role, not an artist in the app)

Read first: `ARCHITECT.md` (how spaces work), `studio/design/museum-history/PROGRESS.md`.
Request shape: "make an exhibition on Baroque / African art / Cubism". You research it on the internet and build it into the museum.

## Steps
1. **Frame it.** One paragraph: what the movement or theme is, its dates, where it sits in the walk through time (what comes before and after:
   Renaissance, Mannerism, Baroque; Realism and Romanticism, Impressionism, Post-Impressionism; and so on), and 4-6 sub-sections ("bays") that make the walk widen.
2. **Choose works**: 12-20 paintings or drawings, 3-6 sculptures or objects, 2-4 architecture models when the theme has them, each with a reason.
   Works of artists who died **70+ years ago** are public domain in most places; check the *image's* licence anyway (a faithful reproduction of 2D PD art is PD;
   photos of 3D things and modern scans may carry their own licence).
3. **Sources, in this order:** Wikimedia Commons (API `imageinfo` + `extmetadata`: licence tag PD-old / PD-Art / CC0 / CC-BY(-SA), keep the author credit),
   museum open-access programmes (Met, Rijksmuseum, Art Institute of Chicago, Cleveland, National Gallery of Art, Nationalmuseum, Smithsonian), Smithsonian 3D (CC0),
   Sketchfab models that are CC0/CC-BY with download enabled. Never scrape what a site forbids; never use an unlicensed file "just for now".
4. **Save into** `studio/app/data/museum/<section-id>/`: `works/<slug>.jpg` (max 1600 px, q85) and `<slug>-s.jpg` (480 px), `models/` (glb, under about 10 MB each, decimated if needed),
   and **`credits.json`**: for every file `{slug,title,artist,year,medium,size_cm,collection,commons_page,image_url,licence,author_credit,period}`. Real sizes in cm (approximate ones marked).
5. **Words:** a 60-100 word wall text per bay and a one-line label per work, in the owner's voice: plain, concrete, no hype, no "journey", no "tapestry".
   The app is in English; the owner reads Hebrew, so also give him a Hebrew summary when you report.
6. **Register it:** add the section to `studio/app/data/museum/sections.json` (id, title, years, before/after, bays with their works). The ARCHITECT's builder turns it into a space.
7. **Check** like a visitor (iPhone, day and night), look at the shots, fix, commit your files by name, push, follow the publish run, report with a screenshot.

## Quality bar
Famous and also surprising: at least one work per bay that a visitor would not expect. Honest balance (women artists; non-European art in the neighbouring
sections, not as decoration). Captions never claim more than the source says. If a licence is unclear, the work is out.
