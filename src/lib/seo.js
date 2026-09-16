// seo.js — the <head> for a route: title, meta, canonical, feed links, JSON-LD.
// Pure, and computed at build time, so a crawler sees the real thing in the
// HTML it is served rather than after running a bundle.

import { href } from './routes.js';
import { T } from './strings.js';

const abs = (site, path) => `${site.url}${path}`;

export function headFor(route, data, index) {
  const site = index.site;
  const d = { type: 'website', noindex: false, image: site.ogImage || '/og/og-default.png' };

  switch (route.name) {
    case 'index':
      d.title = route.page > 1 ? `${site.title} ــ ${T.page} ${route.page}` : site.title;
      d.description = site.description;
      d.path = href.index(route.page);
      break;
    case 'post': {
      const p = data.post;
      d.title = `${p.title} ــ ${site.title}`;
      d.description = p.summary;
      d.path = route.draft ? href.draft(p.slug) : href.post(p.slug);
      d.type = 'article';
      d.noindex = !!(p.draft || route.draft);
      if (p.cover) d.image = p.cover;
      d.article = p;
      d.canonical = p.canonical || null;
      break;
    }
    case 'page': {
      const p = data.page;
      d.title = `${p.title} ــ ${site.title}`;
      d.description = p.summary;
      d.path = href.page(p.slug);
      break;
    }
    case 'tags':
      d.title = `${T.allTags} ــ ${site.title}`;
      d.description = `همهٔ برچسب‌های ${site.title}`;
      d.path = href.tags();
      break;
    case 'tag':
      d.title = `${data.tag.name} ــ ${site.title}`;
      d.description = `نوشته‌های برچسب‌خوردهٔ «${data.tag.name}» در ${site.title}`;
      d.path = href.tag(data.tag.slug, route.page);
      break;
    case 'seriesIndex':
      d.title = `${T.series} ــ ${site.title}`;
      d.description = `مجموعه‌های ${site.title}`;
      d.path = href.seriesIndex();
      break;
    case 'series':
      d.title = `${data.series.title} ــ ${site.title}`;
      d.description = data.series.description || `مجموعهٔ «${data.series.title}»`;
      d.path = href.series(data.series.slug);
      break;
    case 'archive':
      d.title = `${T.archive}${route.year ? ` ${route.year}` : ''} ــ ${site.title}`;
      d.description = `بایگانی نوشته‌های ${site.title}`;
      d.path = href.archive(route.year);
      break;
    case 'glossary':
      d.title = `${T.glossary} ــ ${site.title}`;
      d.description = `واژه‌نامهٔ اصطلاح‌های ${site.title}`;
      d.path = href.glossary();
      break;
    case 'search':
      d.title = `${T.search} ــ ${site.title}`;
      d.description = `جست‌وجو در نوشته‌های ${site.title}`;
      d.path = href.search();
      d.noindex = true;
      break;
    default:
      d.title = `${T.notFound} ــ ${site.title}`;
      d.description = site.description;
      d.path = '/404.html';
      d.noindex = true;
  }

  const url = d.canonical || abs(site, d.path);
  const image = /^https?:/.test(d.image) ? d.image : abs(site, d.image);

  const metas = [
    { name: 'description', content: d.description },
    { property: 'og:type', content: d.type },
    { property: 'og:title', content: d.title },
    { property: 'og:description', content: d.description },
    { property: 'og:url', content: url },
    { property: 'og:image', content: image },
    { property: 'og:site_name', content: site.title },
    { property: 'og:locale', content: 'fa_IR' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: d.title },
    { name: 'twitter:description', content: d.description },
    { name: 'twitter:image', content: image },
  ];
  if (d.noindex) metas.push({ name: 'robots', content: 'noindex,nofollow' });
  if (d.article) {
    metas.push({ property: 'article:published_time', content: d.article.date.iso });
    if (d.article.updated) metas.push({ property: 'article:modified_time', content: d.article.updated.iso });
    for (const t of d.article.tags || []) metas.push({ property: 'article:tag', content: t });
  }

  const links = [
    { rel: 'canonical', href: url },
    { rel: 'alternate', type: 'application/rss+xml', title: `${site.title} ــ RSS`, href: abs(site, '/feed.xml') },
    { rel: 'alternate', type: 'application/atom+xml', title: `${site.title} ــ Atom`, href: abs(site, '/atom.xml') },
    { rel: 'alternate', type: 'application/feed+json', title: `${site.title} ــ JSON`, href: abs(site, '/feed.json') },
  ];

  const author = { '@type': 'Person', name: site.author.name, url: site.author.url };
  const jsonld = d.article
    ? {
      '@context': 'https://schema.org', '@type': 'BlogPosting',
      headline: d.article.title, description: d.article.summary,
      datePublished: d.article.date.iso,
      dateModified: (d.article.updated || d.article.date).iso,
      author, publisher: { '@type': 'Person', name: site.author.name },
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      inLanguage: 'fa-IR', image,
      keywords: (d.article.tags || []).join(', '),
      wordCount: d.article.reading?.words,
    }
    : {
      '@context': 'https://schema.org', '@type': 'Blog',
      name: site.title, description: site.description, url: abs(site, '/'),
      author, inLanguage: 'fa-IR',
    };

  return { title: d.title, description: d.description, url, image, metas, links, jsonld, noindex: d.noindex };
}
