// feeds.mjs — RSS 2.0, Atom 1.0 and JSON Feed 1.1.
//
// Feeds carry the full post body, with every URL absolute: a reader that
// fetched /feed.xml has no base to resolve /media/… against.

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const cdata = (s) => `<![CDATA[${String(s).replace(/\]\]>/g, ']]&gt;')}]]>`;

const absolutize = (html, base) =>
  String(html)
    .replace(/(\s(?:href|src))="\/([^"]*)"/g, `$1="${base}/$2"`)
    .replace(/(\s(?:href|src))='\/([^']*)'/g, `$1='${base}/$2'`);

const rfc822 = (iso) => new Date(`${iso}T09:00:00Z`).toUTCString();
const rfc3339 = (iso) => `${iso}T09:00:00Z`;

export function buildFeeds(c, index, renderBody) {
  const site = index.site;
  const base = site.url;
  const items = c.listed.slice(0, site.postsInFeed || 20);
  const updated = items[0]?.date.iso || c.today;
  const author = site.author;

  const body = (p) => absolutize(renderBody(p), base);

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${esc(site.title)}</title>
    <link>${esc(base)}/</link>
    <description>${esc(site.description)}</description>
    <language>fa-IR</language>
    <lastBuildDate>${rfc822(updated)}</lastBuildDate>
    <generator>weblog</generator>
    <atom:link href="${esc(base)}/feed.xml" rel="self" type="application/rss+xml"/>
${items.map((p) => `    <item>
      <title>${esc(p.title)}</title>
      <link>${esc(base)}/posts/${encodeURIComponent(p.slug)}/</link>
      <guid isPermaLink="true">${esc(base)}/posts/${encodeURIComponent(p.slug)}/</guid>
      <pubDate>${rfc822(p.date.iso)}</pubDate>
      <dc:creator>${esc(author.name)}</dc:creator>
${p.tags.map((t) => `      <category>${esc(t)}</category>`).join('\n')}
      <description>${esc(p.summary)}</description>
      <content:encoded>${cdata(body(p))}</content:encoded>
    </item>`).join('\n')}
  </channel>
</rss>
`;

  const atom = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="fa-IR">
  <title>${esc(site.title)}</title>
  <subtitle>${esc(site.description)}</subtitle>
  <link href="${esc(base)}/atom.xml" rel="self" type="application/atom+xml"/>
  <link href="${esc(base)}/" rel="alternate" type="text/html"/>
  <id>${esc(base)}/</id>
  <updated>${rfc3339(updated)}</updated>
  <author><name>${esc(author.name)}</name>${author.url ? `<uri>${esc(author.url)}</uri>` : ''}</author>
${items.map((p) => `  <entry>
    <title>${esc(p.title)}</title>
    <link href="${esc(base)}/posts/${encodeURIComponent(p.slug)}/" rel="alternate" type="text/html"/>
    <id>${esc(base)}/posts/${encodeURIComponent(p.slug)}/</id>
    <published>${rfc3339(p.date.iso)}</published>
    <updated>${rfc3339((p.updated || p.date).iso)}</updated>
${p.tags.map((t) => `    <category term="${esc(t)}"/>`).join('\n')}
    <summary>${esc(p.summary)}</summary>
    <content type="html">${esc(body(p))}</content>
  </entry>`).join('\n')}
</feed>
`;

  const json = JSON.stringify({
    version: 'https://jsonfeed.org/version/1.1',
    title: site.title,
    home_page_url: `${base}/`,
    feed_url: `${base}/feed.json`,
    description: site.description,
    language: 'fa-IR',
    authors: [{ name: author.name, url: author.url }],
    items: items.map((p) => ({
      id: `${base}/posts/${encodeURIComponent(p.slug)}/`,
      url: `${base}/posts/${encodeURIComponent(p.slug)}/`,
      title: p.title,
      summary: p.summary,
      content_html: body(p),
      date_published: rfc3339(p.date.iso),
      date_modified: rfc3339((p.updated || p.date).iso),
      tags: p.tags,
      image: p.cover ? `${base}${p.cover}` : undefined,
    })),
  }, null, 2);

  return { 'feed.xml': rss, 'atom.xml': atom, 'feed.json': json };
}
