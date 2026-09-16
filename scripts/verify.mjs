#!/usr/bin/env node
// verify.mjs — assertions against dist/. Runs in CI and fails the build.
//
// Each check exists because it caught something, or because its failure mode
// is silent: a prerender that quietly emitted an empty shell still looks fine
// in a browser, and a draft leaking into the sitemap is invisible until it is
// indexed.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import vm from 'node:vm';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = path.join(ROOT, 'dist');

let failed = 0;
let checks = 0;
const ok = (msg) => { checks++; process.stdout.write(`  \x1b[32m✓\x1b[0m ${msg}\n`); };
const bad = (msg) => { checks++; failed++; process.stdout.write(`  \x1b[31m✗\x1b[0m ${msg}\n`); };
const assert = (cond, msg) => (cond ? ok(msg) : bad(msg));
const section = (t) => process.stdout.write(`\n\x1b[1m${t}\x1b[0m\n`);

if (!existsSync(DIST)) { console.error('dist/ does not exist — run npm run build first'); process.exit(1); }

const read = (p) => readFileSync(path.join(DIST, p), 'utf8');
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  return e.isDirectory() ? walk(p) : [p];
});
const allFiles = walk(DIST).map((p) => path.relative(DIST, p));
const htmlFiles = allFiles.filter((f) => f.endsWith('.html'));

const index = JSON.parse(read('api/index.json'));
const site = index.site;

section('pages');
assert(htmlFiles.length >= 10, `${htmlFiles.length} HTML files emitted`);
for (const p of index.posts) {
  const f = `posts/${p.slug}/index.html`;
  if (!allFiles.includes(f)) { bad(`missing ${f}`); continue; }
  const html = read(f);
  const doc = JSON.parse(read(`api/post/${p.slug}.json`));
  const firstPara = doc.doc.blocks.find((b) => b.type === 'p');
  const probe = (firstPara?.segs || []).find((s) => s.t === 'text')?.text?.slice(0, 30);
  const problems = [];
  // the one check that proves prerendering actually ran, rather than shipping a shell
  if (probe && !html.includes(probe)) problems.push('body text not in HTML');
  if (!new RegExp(`<title>[^<]+</title>`).test(html)) problems.push('no title');
  if (!html.includes('og:image')) problems.push('no og:image');
  if (!html.includes('application/ld+json')) problems.push('no JSON-LD');
  if (!html.includes('<html lang="fa" dir="rtl">')) problems.push('not fa/rtl');
  const ld = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
  if (!ld) problems.push('JSON-LD unreadable');
  else {
    try {
      const j = JSON.parse(ld[1]);
      if (j['@type'] !== 'BlogPosting') problems.push(`@type is ${j['@type']}`);
      if (!j.datePublished) problems.push('no datePublished');
      if (j.inLanguage !== 'fa-IR') problems.push('inLanguage wrong');
    } catch { problems.push('JSON-LD does not parse'); }
  }
  assert(problems.length === 0, `posts/${p.slug}/ ${problems.length ? '— ' + problems.join(', ') : ''}`);
}
assert(existsSync(path.join(DIST, '404.html')), '404.html exists as a real file');
assert(read('404.html').includes('noindex'), '404 is noindex');

section('drafts');
const draftDir = path.join(DIST, 'draft');
const draftsShipped = existsSync(draftDir);
assert(process.env.INCLUDE_DRAFTS === '1' || !draftsShipped, 'no /draft/ directory in a normal build');
if (index.drafts?.length) {
  const leaked = index.drafts.filter((d) => read('sitemap.xml').includes(d.slug));
  assert(leaked.length === 0, 'no draft slug appears in sitemap.xml');
}

section('feeds');
for (const f of ['feed.xml', 'atom.xml', 'feed.json']) {
  assert(existsSync(path.join(DIST, f)), `${f} exists`);
}
const rss = read('feed.xml');
const atom = read('atom.xml');
const itemCount = (rss.match(/<item>/g) || []).length;
const entryCount = (atom.match(/<entry>/g) || []).length;
const expected = Math.min(index.posts.length, site.postsInFeed || 20);
assert(itemCount === expected, `RSS has ${itemCount} items (expected ${expected})`);
assert(entryCount === expected, `Atom has ${entryCount} entries`);
assert(!/<\?xml[\s\S]*<\?xml/.test(rss), 'RSS has one XML declaration');
assert((rss.match(/<channel>/g) || []).length === 1, 'RSS has one channel');
assert(/guid isPermaLink="true">https?:/.test(rss), 'RSS guids are absolute permalinks');
// a relative /media/ URL in a feed body resolves against the reader, not the site
const encoded = rss.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/g) || [];
const relative = encoded.filter((c) => /(?:src|href)="\/(?!\/)/.test(c));
assert(relative.length === 0, 'no relative URLs inside RSS content');
try { JSON.parse(read('feed.json')); ok('feed.json parses'); } catch { bad('feed.json does not parse'); }

section('sitemap & robots');
const sitemap = read('sitemap.xml');
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
assert(locs.length > 0, `sitemap lists ${locs.length} URLs`);
assert(locs.every((u) => u.startsWith(site.url)), 'every sitemap URL is absolute');
assert(!locs.some((u) => u.includes('/draft/')), 'sitemap has no drafts');
assert(!locs.some((u) => u.includes('/search/')), 'sitemap excludes /search/');
assert(new Set(locs).size === locs.length, 'no duplicate sitemap URLs');
assert(read('robots.txt').includes('Sitemap:'), 'robots.txt points at the sitemap');
assert(read('_headers').includes('/sw.js'), '_headers marks /sw.js no-cache');

section('internal links');
const emitted = new Set(allFiles.map((f) => '/' + f.replace(/index\.html$/, '')));
const missing = new Set();
for (const f of htmlFiles) {
  const html = read(f);
  const body = html.slice(html.indexOf('<div id="root">'));
  for (const m of body.matchAll(/href="(\/[^"#?]*)"/g)) {
    const href = decodeURIComponent(m[1]);
    const target = href.endsWith('/') ? href : `${href}`;
    if (emitted.has(target) || allFiles.includes(target.slice(1))) continue;
    missing.add(`${href}  (from ${f})`);
  }
}
assert(missing.size === 0, missing.size ? `dead internal links:\n      ${[...missing].join('\n      ')}` : 'every internal link resolves to an emitted file');

section('build-time only');
const jsFiles = allFiles.filter((f) => f.startsWith('assets/') && f.endsWith('.js'));
const jsBody = jsFiles.map(read).join('');
assert(!/\bshiki\b/i.test(jsBody), 'no shiki in the client bundle');
assert(!/katex/i.test(jsBody), 'no KaTeX in the client bundle');
const gz = jsFiles.reduce((n, f) => n + gzipSync(readFileSync(path.join(DIST, f))).length, 0);
assert(gz < 90 * 1024, `client JS is ${(gz / 1024).toFixed(1)} kB gzipped (budget 90 kB)`);

section('api');
assert(index.posts.length > 0, `index.json lists ${index.posts.length} posts`);
for (const p of index.posts) {
  if (!existsSync(path.join(DIST, `api/post/${p.slug}.json`))) bad(`api/post/${p.slug}.json missing`);
}
ok('every indexed post has an api/post JSON');
const searchIdx = JSON.parse(read('api/search.json'));
assert(searchIdx.length > 0, `search index has ${searchIdx.length} rows`);
const idxSlugs = new Set(index.posts.map((p) => p.slug));
assert(searchIdx.every((r) => idxSlugs.has(r.slug)), 'every search row points at a listed post');
const searchBytes = statSync(path.join(DIST, 'api/search.json')).size;
assert(searchBytes < 1024 * 1024,
  `search index is ${(searchBytes / 1024).toFixed(0)} kB`
  + (searchBytes >= 1024 * 1024 ? ' — shard it by year' : ''));

section('pwa');
assert(existsSync(path.join(DIST, 'sw.js')), 'sw.js emitted');
const sw = read('sw.js');
assert(!sw.includes('__' + 'VERSION__') && !sw.includes('__' + 'SHELL__'), 'sw.js placeholders substituted');
// A substituted worker that does not parse registers as a silent no-op: the
// site simply never works offline, and nothing anywhere reports it.
try { new vm.Script(sw); ok('sw.js is syntactically valid JavaScript'); }
catch (e) { bad(`sw.js does not parse: ${e.message}`); }
assert(/const VERSION = '[0-9a-f]{12}'/.test(sw), 'sw.js carries a real version hash');
assert(/const SHELL = \[/.test(sw), 'sw.js carries a real shell array');
assert(existsSync(path.join(DIST, 'manifest.webmanifest')), 'webmanifest emitted');
assert(existsSync(path.join(DIST, 'og/og-default.png')), 'default social card exists');

process.stdout.write(`\n${failed ? '\x1b[31m' : '\x1b[32m'}${checks - failed}/${checks} checks passed\x1b[0m\n`);
process.exit(failed ? 1 : 0);
