// content.mjs — the single source of truth for every build artifact.
//
// Prerender, feeds, sitemap, the search index and the service-worker version
// all derive from loadContent(). Nothing else reads content/ directly, so the
// site can never disagree with itself about what is published.

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseFrontMatter } from '../lib/frontmatter.js';
import { parseBookML, extractHeadings, blockTexts, plainText } from '../lib/bookml.js';
import { describeDate } from '../lib/jalali.js';
import { readingTime, makeExcerpt, slugify, dropCapSafe, hashPick } from '../lib/format.js';
import { enrich } from './enrich.mjs';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const CONTENT = path.join(ROOT, 'content');
const PUBLIC = path.join(ROOT, 'public');

const walk = (dir) => (existsSync(dir)
  ? readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return e.isFile() && p.endsWith('.md') ? [p] : [];
  })
  : []);

class ContentError extends Error {}
const fail = (file, msg) => { throw new ContentError(`${path.relative(ROOT, file)}: ${msg}`); };

function readDoc(file) {
  const raw = readFileSync(file, 'utf8');
  const { meta, body, lineOffset } = parseFrontMatter(raw);
  return { file, meta, body, lineOffset, parsed: parseBookML(body) };
}

const asArray = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

function baseSlug(file, meta) {
  if (meta.slug) return String(meta.slug);
  const name = path.basename(file, '.md');
  const stripped = name.replace(/^\d{4}-\d{2}-\d{2}-/, '');
  return /^[\x20-\x7e]+$/.test(stripped) ? stripped : slugify(meta.title || stripped);
}

function fileDate(file, meta) {
  if (meta.date) return String(meta.date);
  const m = path.basename(file).match(/^(\d{4}-\d{2}-\d{2})-/);
  if (m) return m[1];
  return statSync(file).mtime.toISOString().slice(0, 10);
}

/**
 * @param {object} opts
 * @param {boolean} opts.includeDrafts  render drafts at /draft/<slug>/, noindex
 * @param {boolean} opts.includeFuture  publish posts dated after today
 * @param {string}  opts.today          ISO date, injected so builds are reproducible
 */
export async function loadContent(opts = {}) {
  const {
    includeDrafts = process.env.INCLUDE_DRAFTS === '1',
    includeFuture = process.env.PREVIEW === '1',
    today = process.env.BUILD_DATE || new Date().toISOString().slice(0, 10),
  } = opts;

  const siteFile = path.join(CONTENT, 'site.json');
  if (!existsSync(siteFile)) fail(siteFile, 'missing — the site cannot build without it');
  const site = JSON.parse(readFileSync(siteFile, 'utf8'));
  site.url = String(site.url || '').replace(/\/+$/, '');

  const seriesFile = path.join(CONTENT, 'series.json');
  const seriesMeta = existsSync(seriesFile) ? JSON.parse(readFileSync(seriesFile, 'utf8')) : {};

  // Persian tags transliterate to URL-safe but unreadable slugs (روش‌های صوری
  // → rvshhay-svry), so content/tags.json may name a better one per tag.
  const tagsFile = path.join(CONTENT, 'tags.json');
  const tagSlugs = existsSync(tagsFile) ? JSON.parse(readFileSync(tagsFile, 'utf8')) : {};
  const tagSlug = (t) => String(tagSlugs[t] || slugify(t));

  // ---- posts -------------------------------------------------------------
  const all = [];
  for (const file of walk(path.join(CONTENT, 'posts'))) {
    const doc = readDoc(file);
    if (!doc.meta.title) fail(file, 'front-matter is missing a title');

    const slug = baseSlug(file, doc.meta);
    const iso = fileDate(file, doc.meta);
    const date = describeDate(iso);
    if (!date) fail(file, `unparseable date "${iso}" — expected YYYY-MM-DD`);

    const doc2 = await enrich(doc.parsed, { publicDir: PUBLIC, slug });
    const plain = plainText(doc.parsed);
    const headings = extractHeadings(doc.parsed);

    const post = {
      slug,
      title: String(doc.meta.title),
      date,
      updated: doc.meta.updated ? describeDate(String(doc.meta.updated)) : null,
      tags: asArray(doc.meta.tags).map(String),
      tagLinks: asArray(doc.meta.tags).map((t) => ({ name: String(t), slug: String(tagSlugs[t] || slugify(t)) })),
      series: doc.meta.series ? String(doc.meta.series) : null,
      seriesPart: doc.meta.seriesPart != null ? Number(doc.meta.seriesPart) : null,
      summary: String(doc.meta.summary || doc.meta.excerpt || makeExcerpt(plain)),
      cover: doc.meta.cover ? String(doc.meta.cover) : null,
      coverAlt: doc.meta.coverAlt ? String(doc.meta.coverAlt) : null,
      lang: String(doc.meta.lang || site.lang || 'fa'),
      draft: doc.meta.draft === true,
      unlisted: doc.meta.unlisted === true,
      canonical: doc.meta.canonical ? String(doc.meta.canonical) : null,
      audio: doc.meta.audio || null,
      cues: doc.meta.cues || null,
      reading: readingTime(plain, { codeLines: doc2.codeLines }),
      headings,
      hasMath: doc2.blocks.some((b) => b.type === 'math'),
      hasCode: doc2.blocks.some((b) => b.type === 'code'),
      dropCap: dropCapSafe(plain),
      hatch: doc.meta.hatch != null ? Number(doc.meta.hatch) : hashPick(slug, 4),
      doc: doc2,
      // glossed terms «اصطلاح»[[latin]] feed the site-wide glossary
      glossary: doc.parsed.footnotes
        .filter((f) => f.kind === 'latin' && f.term)
        .map((f) => ({ latin: f.text, term: f.term, bi: f.block + (doc.parsed.epigraph ? 1 : 0) })),
      search: blockTexts(doc.parsed),
      file: path.relative(ROOT, file),
    };
    all.push(post);
  }

  const dupes = all.map((p) => p.slug).filter((s, i, a) => a.indexOf(s) !== i);
  if (dupes.length) throw new ContentError(`duplicate post slugs: ${[...new Set(dupes)].join(', ')}`);

  const drafts = all.filter((p) => p.draft);
  let posts = all.filter((p) => !p.draft);
  if (!includeFuture) {
    const future = posts.filter((p) => p.date.iso > today);
    posts = posts.filter((p) => p.date.iso <= today);
    for (const p of future) p.future = true;
  }
  posts.sort((a, b) => (a.date.iso < b.date.iso ? 1 : a.date.iso > b.date.iso ? -1 : a.slug < b.slug ? 1 : -1));

  // ---- tags, series, archive --------------------------------------------
  const listed = posts.filter((p) => !p.unlisted);

  const tagMap = new Map();
  for (const p of listed) {
    for (const t of p.tags) {
      const s = tagSlug(t);
      if (!tagMap.has(s)) tagMap.set(s, { slug: s, name: t, posts: [] });
      tagMap.get(s).posts.push(p.slug);
    }
  }
  const tags = [...tagMap.values()].sort((a, b) => b.posts.length - a.posts.length || a.name.localeCompare(b.name, 'fa'));

  const seriesMap = new Map();
  for (const p of listed) {
    if (!p.series) continue;
    if (!seriesMap.has(p.series)) {
      const meta = seriesMeta[p.series] || {};
      seriesMap.set(p.series, { slug: p.series, title: meta.title || p.series, description: meta.description || '', posts: [] });
    }
    seriesMap.get(p.series).posts.push(p);
  }
  for (const s of seriesMap.values()) {
    s.posts.sort((a, b) => (a.seriesPart ?? 1e9) - (b.seriesPart ?? 1e9) || (a.date.iso < b.date.iso ? -1 : 1));
    s.posts.forEach((p, i) => {
      p.seriesNav = {
        slug: s.slug,
        title: s.title,
        part: i + 1,
        total: s.posts.length,
        prev: i > 0 ? { slug: s.posts[i - 1].slug, title: s.posts[i - 1].title } : null,
        next: i < s.posts.length - 1 ? { slug: s.posts[i + 1].slug, title: s.posts[i + 1].title } : null,
      };
    });
    s.posts = s.posts.map((p) => p.slug);
  }
  const series = [...seriesMap.values()];
  for (const key of Object.keys(seriesMeta)) {
    if (!seriesMap.has(key)) process.emitWarning(`series "${key}" is declared in series.json but has no posts`);
  }

  const archiveMap = new Map();
  for (const p of listed) {
    const y = p.date.year;
    if (!archiveMap.has(y)) archiveMap.set(y, []);
    archiveMap.get(y).push(p.slug);
  }
  const archive = [...archiveMap.entries()].sort((a, b) => b[0] - a[0]).map(([year, slugs]) => ({ year, posts: slugs }));

  // ---- related: shared tags, then same series, then recency --------------
  for (const p of listed) {
    const scored = listed
      .filter((o) => o.slug !== p.slug)
      .map((o) => ({
        post: o,
        score: 2 * o.tags.filter((t) => p.tags.includes(t)).length + (o.series && o.series === p.series ? 3 : 0),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || (a.post.date.iso < b.post.date.iso ? 1 : -1));

    // A post with no tag or series overlap still gets a rail: the most recent
    // other posts, so the end of an article is never a dead end.
    const picked = [...scored.map((x) => x.post)];
    for (const o of listed) {
      if (picked.length >= 3) break;
      if (o.slug !== p.slug && !picked.some((q) => q.slug === o.slug)) picked.push(o);
    }
    p.related = picked.slice(0, 3)
      .map((o) => ({ slug: o.slug, title: o.title, summary: o.summary, date: o.date }));
  }

  // ---- standalone pages --------------------------------------------------
  const pages = [];
  for (const file of walk(path.join(CONTENT, 'pages'))) {
    const doc = readDoc(file);
    const slug = baseSlug(file, doc.meta);
    pages.push({
      slug,
      title: String(doc.meta.title || slug),
      summary: String(doc.meta.summary || makeExcerpt(plainText(doc.parsed))),
      lang: String(doc.meta.lang || site.lang || 'fa'),
      doc: await enrich(doc.parsed, { publicDir: PUBLIC, slug }),
      headings: extractHeadings(doc.parsed),
    });
  }

  // ---- glossary: merge duplicate Latin terms across the whole site -------
  const glossMap = new Map();
  for (const p of listed) {
    for (const g of p.glossary) {
      const key = g.latin.toLowerCase();
      if (!glossMap.has(key)) glossMap.set(key, { latin: g.latin, term: g.term, occurrences: [] });
      glossMap.get(key).occurrences.push({ slug: p.slug, title: p.title, bi: g.bi });
    }
  }
  const glossary = [...glossMap.values()].sort((a, b) => a.term.localeCompare(b.term, 'fa'));

  // ---- search index ------------------------------------------------------
  const searchIndex = listed.flatMap((p) => p.search.map((r) => ({ slug: p.slug, bi: r.bi, text: r.text })));

  return {
    site, posts, listed, drafts, pages, tags, series, archive, glossary, searchIndex,
    today, includeDrafts,
    byTag: (slug) => tagMap.get(slug),
    bySlug: Object.fromEntries([...posts, ...drafts].map((p) => [p.slug, p])),
  };
}

/** The metadata-only shape the client fetches for soft navigation. */
export const postMeta = (p) => ({
  slug: p.slug, title: p.title, date: p.date, updated: p.updated, tags: p.tags,
  tagLinks: p.tagLinks, related: p.related, seriesNav: p.seriesNav, headings: p.headings,
  series: p.series, seriesPart: p.seriesPart, summary: p.summary, cover: p.cover,
  coverAlt: p.coverAlt, lang: p.lang, reading: p.reading, hasMath: p.hasMath,
  hasCode: p.hasCode, hatch: p.hatch, draft: p.draft, unlisted: p.unlisted,
});
