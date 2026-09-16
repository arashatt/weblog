// routes.js — pure path ↔ route mapping, no React, no DOM.
//
// The same functions run in scripts/routes.mjs (to enumerate what to
// prerender), in entry-server.jsx (to render it) and in the browser (to
// navigate), so the three can never drift.

const trim = (p) => {
  const q = String(p).split(/[?#]/)[0];
  return q.replace(/\/+$/, '') || '/';
};
export { trim as trimPath };

/** pathname → { name, ...params } */
export function match(pathname) {
  let path;
  try { path = trim(decodeURI(pathname)); } catch { path = trim(pathname); }
  if (path === '/') return { name: 'index', page: 1 };

  const seg = path.slice(1).split('/');

  if (seg[0] === 'page' && seg.length === 2 && /^\d+$/.test(seg[1])) {
    return { name: 'index', page: Math.max(1, parseInt(seg[1], 10)) };
  }
  if (seg[0] === 'posts' && seg.length === 2) return { name: 'post', slug: seg[1] };
  if (seg[0] === 'draft' && seg.length === 2) return { name: 'post', slug: seg[1], draft: true };
  if (seg[0] === 'tags') {
    if (seg.length === 1) return { name: 'tags' };
    if (seg.length === 2) return { name: 'tag', tag: seg[1], page: 1 };
    if (seg.length === 4 && seg[2] === 'page') return { name: 'tag', tag: seg[1], page: +seg[3] || 1 };
  }
  if (seg[0] === 'series') {
    if (seg.length === 1) return { name: 'seriesIndex' };
    if (seg.length === 2) return { name: 'series', series: seg[1] };
  }
  if (seg[0] === 'archive') {
    if (seg.length === 1) return { name: 'archive', year: null };
    if (seg.length === 2 && /^\d+$/.test(seg[1])) return { name: 'archive', year: +seg[1] };
  }
  if (seg[0] === 'search' && seg.length === 1) return { name: 'search' };
  if (seg[0] === 'glossary' && seg.length === 1) return { name: 'glossary' };
  if (seg.length === 1 && seg[0]) return { name: 'page', slug: seg[0] };

  return { name: 'notfound' };
}

// Trailing slashes everywhere, so a relative asset inside a post resolves
// against the post's own directory rather than its parent.
export const href = {
  index: (page = 1) => (page > 1 ? `/page/${page}/` : '/'),
  post: (slug) => `/posts/${encodeURIComponent(slug)}/`,
  draft: (slug) => `/draft/${encodeURIComponent(slug)}/`,
  tags: () => '/tags/',
  tag: (slug, page = 1) => (page > 1
    ? `/tags/${encodeURIComponent(slug)}/page/${page}/`
    : `/tags/${encodeURIComponent(slug)}/`),
  seriesIndex: () => '/series/',
  series: (slug) => `/series/${encodeURIComponent(slug)}/`,
  archive: (year) => (year ? `/archive/${year}/` : '/archive/'),
  search: () => '/search/',
  glossary: () => '/glossary/',
  page: (slug) => `/${encodeURIComponent(slug)}/`,
};

/** Key a route for React reconciliation and data resolution. */
export const routeKey = (r) =>
  [r.name, r.slug, r.tag, r.series, r.year, r.page].filter((x) => x != null).join(':');

/** Where a route's prerendered file goes, relative to dist/. */
export const outFile = (path) =>
  (path === '/' ? 'index.html' : `${path.replace(/^\/|\/$/g, '')}/index.html`);
