// resolve.js — route + index (+ the route's document) → the props a page needs.
//
// The prerenderer and the browser both call buildData(), so a soft navigation
// lands on exactly the tree the prerendered HTML had. Nothing here reads a
// clock, storage or `window`.

export const needsDoc = (route) => route.name === 'post' || route.name === 'page';

export const docUrl = (route) =>
  (route.name === 'post' ? `/api/post/${encodeURIComponent(route.slug)}.json`
    : route.name === 'page' ? `/api/page/${encodeURIComponent(route.slug)}.json`
      : null);

const paginate = (items, page, per) => ({
  items: items.slice((page - 1) * per, page * per),
  pages: Math.max(1, Math.ceil(items.length / per)),
});

/**
 * @param route  from routes.js match()
 * @param index  the site index (posts as metadata, tags, series, archive, pages)
 * @param doc    the full post/page for routes that need one, else null
 */
export function buildData(route, index, doc = null) {
  const per = index.site.perPage || 8;
  const bySlug = (s) => index.posts.find((p) => p.slug === s);

  switch (route.name) {
    case 'index': {
      const { items, pages } = paginate(index.posts, route.page, per);
      if (route.page > pages && route.page !== 1) return null;
      return { posts: items, page: route.page, pages };
    }
    case 'post': {
      if (!doc) return null;
      return { post: doc };
    }
    case 'page': {
      if (!doc) return null;
      return { page: doc };
    }
    case 'tags':
      return { tags: index.tags };
    case 'tag': {
      const tag = index.tags.find((t) => t.slug === route.tag);
      if (!tag) return null;
      const all = tag.posts.map(bySlug).filter(Boolean);
      const { items, pages } = paginate(all, route.page, per);
      if (route.page > pages && route.page !== 1) return null;
      return { tag, posts: items, page: route.page, pages, total: all.length };
    }
    case 'seriesIndex':
      return { series: index.series };
    case 'series': {
      const series = index.series.find((s) => s.slug === route.series);
      if (!series) return null;
      return { series, posts: series.posts.map(bySlug).filter(Boolean) };
    }
    case 'archive': {
      const years = index.archive
        .filter((y) => route.year == null || y.year === route.year)
        .map((y) => ({ year: y.year, posts: y.posts.map(bySlug).filter(Boolean) }));
      if (!years.length) return null;
      return { years, total: years.reduce((n, y) => n + y.posts.length, 0), year: route.year };
    }
    case 'glossary':
      return { glossary: index.glossary || [] };
    case 'search':
      return { titles: index.posts.map((p) => [p.slug, p.title]) };
    case 'notfound':
      return {};
    default:
      return null;
  }
}
