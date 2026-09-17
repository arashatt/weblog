# دفترِ حاشیه — weblog

A Persian/RTL weblog: ink-on-paper typography with a vintage-engraving layer,
prerendered to static HTML at build time, with **no runtime dependencies beyond
React**. Syntax highlighting, mathematics, dates and the search index are all
computed during the build; the browser receives finished markup.

It grew out of [`arashatt/postmodernism`](https://github.com/arashatt/postmodernism),
a digital book reader, and keeps that project's design system, its BookML text
format, its three reading moods (روز / کاهی / شب) and its PWA — while adding
everything a weblog needs and the book did not have: posts, tags, series,
archive, feeds, sitemap, comments, per-page SEO and prerendering.

```sh
npm install
npm run dev            # http://localhost:5173 — drafts visible
npm run build          # → dist/
npm run verify         # assertions against dist/ (CI runs this)
npm run lint:content   # front-matter and markup checks
npm run new-post -- "عنوان نوشته"
```

---

## Where things live

```
content/                ← the only directory you edit to publish
├── site.json           title, tagline, author, url, perPage, giscus
├── series.json         series slug → { title, description }
├── tags.json           Persian tag → URL slug
├── posts/*.md          one file per post
└── pages/*.md          standalone pages (/about/ …)

public/
├── media/              post images, referenced as /media/…
├── engravings/         optional ornament overrides (see its README)
├── og/og-default.png   the fallback social card
└── icons/              PWA icons

src/
├── lib/                parser, router, formatting — shared by build and browser
├── build/              everything that runs only at build time
├── components/ pages/  the React app
└── styles/             tokens → base → chrome → post → code → engraving
```

`src/` never needs touching to publish. Add a file to `content/posts/`, push,
and CI rebuilds and deploys.

---

## Writing a post

A post is a plain UTF-8 text file: a front-matter block, then **BookML** — the
book site's markup, extended for a technical weblog.

```
---
title: چرا اثبات‌های ماشینی به درد می‌خورند
date: 2026-01-20                  # Gregorian; displayed as Jalali
tags: [روش‌های صوری, ایزابل]
series: formal-methods
seriesPart: 2
summary: یک بند برای فهرست، خوراک و کارت اجتماعی.
cover: /media/why-machine-proofs/plate.jpg
draft: false
---
```

Only `title` is required. `date` falls back to the filename's date prefix,
`summary` to the first paragraph, `slug` to the filename.

| key | meaning |
|---|---|
| `title` | required |
| `date` / `updated` | `YYYY-MM-DD`, Gregorian — Jalali is computed at build |
| `slug` | URL; defaults to the filename minus its date prefix |
| `tags` | inline array; URL slugs come from `content/tags.json` |
| `series` / `seriesPart` | key into `content/series.json`, and order within it |
| `summary` | feed and social-card text |
| `cover` / `coverAlt` | card artwork under `/media/` |
| `lang` | `fa` (default) or `en` — sets the article's own `lang`/`dir` |
| `draft` | excluded from the build entirely unless `INCLUDE_DRAFTS=1` |
| `unlisted` | published and crawlable, but out of indexes and feeds |
| `canonical` | if the piece was published elsewhere first |

### Block markup

| syntax | meaning |
|---|---|
| `@ متن` / `@@ منبع` | epigraph and its source (before the body) |
| `## عنوان` / `### عنوان` | headings — both feed the table of contents |
| `> متن` | quotation; consecutive lines merge into one block |
| `~ مصراع | مصراع` / `~~ شاعر` | a beyt, and the poem's attribution |
| `- مورد` / `۱. مورد` | bullet and ordered lists (Persian or Latin digits) |
| `\| a \| b \|` + `\|---\|---\|` | table |
| ` ```lang ` … ` ``` ` | code, highlighted at build time |
| `$$` … `$$` | display mathematics |
| `!! نکته \| متن` | callout — نکته، هشدار، قضیه، تعریف، مثال |
| `![alt](/media/x.png "شرح")` | figure with caption, alone on a line |
| `***` | ornament divider |

### Inline markup

`**پررنگ**` · `*کج*` · `` `کد` `` · `$ریاضی$` · `[متن](نشانی)`

Footnotes use double brackets. A Latin gloss preceded by a term in French
quotes also enters the site-wide glossary:

```
«امر قطعه‌وار»[[the fragmentary]]     → footnote + glossary entry
[[م: یادداشت نویسنده]]                → note, rendered «… ــ م.»
```

`content/posts/2026-09-05-shive-ye-neveshtan.md` uses every marker above and is
the best reference — it renders as a page you can compare against the source.

---

## How the build works

```
content/*.md
   ↓ parseFrontMatter + parseBookML            src/lib/
   ↓ enrich: shiki → HTML, KaTeX → MathML      src/build/enrich.mjs
   ↓ vite build  +  vite build --ssr
   ↓ renderToString per route                  src/build/prerender.mjs
dist/  HTML per URL · /api/*.json · feeds · sitemap · sw.js
```

Three consequences worth knowing:

**Nothing ships to the browser that could run at build time.** Shiki emits
three CSS variables per token (`--s-day`, `--s-sepia`, `--s-night`) and
`src/styles/code.css` picks one, so switching mood costs zero JavaScript.
KaTeX emits MathML, so mathematics costs no CSS and no web fonts. `npm run
verify` asserts that neither library appears in the bundle.

**Content changes need a rebuild.** The book site promised that after the first
deploy you never rebuilt for content. Prerendering ends that: a post's
`<title>`, `og:image` and JSON-LD have to exist in a file before a crawler asks
for it. CI rebuilds on every push, so publishing is still just committing a
file — but it is a build, not a file drop.

**Hydration is silent because render is pure.** Nothing in the render path
reads `localStorage`, `window` or a clock: settings start at their defaults on
both sides and arrive in an effect, dates are computed at build, and the theme
is applied by a small inline script in `<head>` that React never sees. If you
add a component, keep it that way — `npm run verify` and a look at the console
on `npm run preview` are the two things that catch a regression.

---

## Design

The palette, measure and typography come from the book site unchanged:
`--ink`, `--paper`, `--hairline`, `--quiet`, a 36→46rem measure, Amiri for
Persian, EB Garamond for Latin runs, IBM Plex Mono for code.

Listings use a **magazine grid** (`src/components/MagazineGrid.jsx`). Posts arrive
as one flat reverse-chronological list and the grid decides how much room each
gets: `lead` (full width), `feature` (half), `brief` (third) and `line` (a ruled
row with a dotted leader). Hierarchy comes from position, never from
front-matter, so the front page reshapes itself on every publish.

The grid is six columns and every weight divides into it — 6, 3, 2, 6 — so the
packer chooses *row sizes* first and derives each weight from its row. A short
final row shrinks to what is left and takes the weight that fills it, which is
why the page can never end on a half-empty band. A lead with no `cover:` becomes
a centred text lead rather than a wide field of texture, and plates take a fixed
height per weight so a cover and a monogram in the same row still line their
headlines up.

The engraving layer — `src/styles/engraving.css`, `components/Ornaments.jsx`,
`components/Frame.jsx` — adds aged-paper grain, double hairline frames, corner
flourishes, a crest, star dividers and the mezzotint card plates. It may only
ever *add*: delete those three files and the site falls back to bare book
typography with nothing broken. The «آرایه» toggle in the drawer is that
contract's runtime proof, and the readability escape hatch.

Two notes on Persian specifically. The drop cap is applied only when a post's
first letter is one that does not join forward (ا آ د ذ ر ز ژ و) — on a joining
letter it severs the word. And code, mathematics and Latin terms are each
`unicode-bidi: isolate`d, because an LTR island in an RTL paragraph reorders
without it.

Ornament artwork can be replaced with your own files — see
`public/engravings/README.md`.

---

## Deploying

`wrangler.json` targets Cloudflare Workers static assets, with
`not_found_handling: "404-page"` (every route is a real file now, so an unknown
URL must be a real 404, not a soft-200 shell) and `auto-trailing-slash`.

`wrangler` is a **declared devDependency**, not something `npx` fetches at deploy
time. That is deliberate: a deploy step that reaches out to the npm registry
fails whenever the build container's npm cache is cold or corrupt, which is a
confusing way to lose a green build. `npm run deploy` runs the local binary.

There are two ways to deploy and you want exactly one of them:

- **Cloudflare Workers Builds** (connect the repo in the Cloudflare dashboard):
  build command `npm run build`, deploy command `npm run deploy`. No secrets
  needed — Cloudflare already holds the credentials.
- **GitHub Actions** — `.github/workflows/deploy.yml` builds and verifies every
  push and pull request, and deploys `main`. Its deploy step skips itself
  unless these two repository secrets exist, so it stays dormant if you chose
  the option above:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Without them the build and verify jobs still run; only the deploy step is
skipped. `dist/` is plain static files, so any host works — set `site.url` in
`content/site.json` to the real origin first, since feeds, canonicals and
social cards are absolute.

### Comments

Comments are giscus, off by default. Enable Discussions on the repository,
install the [giscus app](https://github.com/apps/giscus), then fill in
`site.json`:

```json
"giscus": { "enabled": true, "repo": "arashatt/weblog",
            "repoId": "…", "category": "Comments", "categoryId": "…" }
```

`repoId` and `categoryId` come from [giscus.app](https://giscus.app). The
thread loads only when a reader asks for it, and the three theme files in
`public/giscus/` keep it inside the site's palette.

---

## License

Code MIT. Prose and images © آرش عطاری, all rights reserved.
