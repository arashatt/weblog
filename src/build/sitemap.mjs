// sitemap.mjs — sitemap.xml, robots.txt and _headers, from the same route list
// the prerenderer used, so the three can never fall out of step.

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

export function buildSitemap(routes, c, index) {
  const base = index.site.url;
  const lastmod = (r) => {
    if (r.route.name === 'post') return (r.data.post.updated || r.data.post.date).iso;
    return c.listed[0]?.date.iso || c.today;
  };

  const urls = routes
    .filter((r) => !r.noindex && r.route.name !== 'search')
    .map((r) => `  <url>
    <loc>${esc(base + r.path)}</loc>
    <lastmod>${lastmod(r)}</lastmod>
    <changefreq>${r.route.name === 'post' ? 'yearly' : 'weekly'}</changefreq>
    <priority>${r.route.name === 'post' ? '0.8' : r.path === '/' ? '1.0' : '0.5'}</priority>
  </url>`).join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  const robots = `User-agent: *
Allow: /
Disallow: /draft/
Disallow: /search/

Sitemap: ${base}/sitemap.xml
`;

  // /sw.js must never be cached, or the update pill can never fire again.
  const headers = `/assets/*
  Cache-Control: public, max-age=31536000, immutable

/media/*
  Cache-Control: public, max-age=604800

/sw.js
  Cache-Control: no-cache

/api/*
  Cache-Control: public, max-age=0, must-revalidate

/*
  Cache-Control: public, max-age=0, must-revalidate
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
`;

  return { 'sitemap.xml': sitemap, 'robots.txt': robots, _headers: headers };
}
