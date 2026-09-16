// routes.mjs — every path the site emits. Prerender and sitemap read the same
// list, so a page can never exist without being in the sitemap (or vice versa).
import { href } from '../lib/routes.js';
import { buildData } from '../lib/resolve.js';
import { fullPost, fullPage } from './payloads.mjs';

export function buildRoutes(c, index) {
  const per = index.site.perPage || 8;
  const routes = [];
  const add = (route, doc = null, opts = {}) => {
    const data = buildData(route, index, doc);
    if (data === null) return;
    routes.push({ path: opts.path ?? pathOf(route), route, data, ...opts });
  };

  const pathOf = (r) => {
    switch (r.name) {
      case 'index': return href.index(r.page);
      case 'post': return r.draft ? href.draft(r.slug) : href.post(r.slug);
      case 'page': return href.page(r.slug);
      case 'tags': return href.tags();
      case 'tag': return href.tag(r.tag, r.page);
      case 'seriesIndex': return href.seriesIndex();
      case 'series': return href.series(r.series);
      case 'archive': return href.archive(r.year);
      case 'glossary': return href.glossary();
      case 'search': return href.search();
      default: return '/404.html';
    }
  };

  const indexPages = Math.max(1, Math.ceil(index.posts.length / per));
  for (let p = 1; p <= indexPages; p++) add({ name: 'index', page: p });

  for (const p of c.posts) add({ name: 'post', slug: p.slug }, fullPost(p));
  if (c.includeDrafts) {
    for (const p of c.drafts) add({ name: 'post', slug: p.slug, draft: true }, fullPost(p), { noindex: true });
  }

  for (const p of c.pages) add({ name: 'page', slug: p.slug }, fullPage(p));

  add({ name: 'tags' });
  for (const t of index.tags) {
    const n = Math.max(1, Math.ceil(t.posts.length / per));
    for (let p = 1; p <= n; p++) add({ name: 'tag', tag: t.slug, page: p });
  }

  if (index.series.length) {
    add({ name: 'seriesIndex' });
    for (const s of index.series) add({ name: 'series', series: s.slug });
  }

  add({ name: 'archive', year: null });
  for (const y of index.archive) add({ name: 'archive', year: y.year });

  if (index.glossary.length) add({ name: 'glossary' });
  add({ name: 'search' });

  // 404 is a real file, not an SPA fallback: Cloudflare serves it with a 404
  // status, so an unknown URL is an actual miss rather than a soft-200.
  routes.push({
    path: '/404.html',
    route: { name: 'notfound' },
    data: {},
    file: '404.html',
    noindex: true,
  });

  return routes;
}
