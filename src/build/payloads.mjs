// payloads.mjs — the JSON the browser actually receives.
//
// Shared by the dev middleware and the prerenderer, so the dev server and the
// built site can never disagree about the shape of the data.

/** What a listing needs: everything PostCard renders, and nothing else. */
export const cardMeta = (p) => ({
  slug: p.slug,
  title: p.title,
  date: p.date,
  tags: p.tags,
  tagLinks: p.tagLinks,
  summary: p.summary,
  cover: p.cover,
  coverAlt: p.coverAlt,
  reading: p.reading,
  hatch: p.hatch,
  draft: p.draft,
  series: p.series,
  seriesPart: p.seriesPart,
});

/** What the post page needs: the card fields plus the document itself. */
export const fullPost = (p) => ({
  ...cardMeta(p),
  updated: p.updated,
  lang: p.lang,
  canonical: p.canonical,
  dropCap: p.dropCap,
  hasMath: p.hasMath,
  hasCode: p.hasCode,
  headings: p.headings,
  related: p.related,
  seriesNav: p.seriesNav || null,
  doc: p.doc,
});

export const fullPage = (p) => ({
  slug: p.slug, title: p.title, summary: p.summary, lang: p.lang,
  headings: p.headings, doc: p.doc,
});

/** The site index: every listing renders from this one object. */
export function buildIndex(c) {
  const listed = c.listed.map(cardMeta);
  const drafts = c.includeDrafts ? c.drafts.map(cardMeta) : [];
  return {
    site: c.site,
    posts: listed,
    drafts,
    tags: c.tags.map((t) => ({ slug: t.slug, name: t.name, posts: t.posts })),
    series: c.series.map((s) => ({ slug: s.slug, title: s.title, description: s.description, posts: s.posts })),
    archive: c.archive,
    glossary: c.glossary,
    glossaryCount: c.glossary.length,
    pages: c.pages.map((p) => ({ slug: p.slug, title: p.title })),
  };
}

/** path → JSON string, for every file under /api/. */
export function apiPayloads(c, index) {
  const out = { '/api/index.json': JSON.stringify(index) };
  for (const p of [...c.posts, ...(c.includeDrafts ? c.drafts : [])]) {
    out[`/api/post/${p.slug}.json`] = JSON.stringify(fullPost(p));
  }
  for (const p of c.pages) {
    out[`/api/page/${p.slug}.json`] = JSON.stringify(fullPage(p));
  }
  out['/api/search.json'] = JSON.stringify(c.searchIndex);
  return out;
}
