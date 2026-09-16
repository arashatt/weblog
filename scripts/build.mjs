#!/usr/bin/env node
// build.mjs — the whole production build, in order.
//
//   1. load and enrich content once   (shiki + KaTeX run here, and only here)
//   2. vite build            → dist/ client bundle + index.html template
//   3. vite build --ssr      → .ssr/entry-server.js
//   4. prerender every route → real HTML files + /api/*.json
//   5. feeds, sitemap, robots, _headers
//   6. sw.js, versioned against the content digest
import { execFileSync } from 'node:child_process';
import { rmSync, writeFileSync, mkdirSync, cpSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = path.join(ROOT, 'dist');
const SSR = path.join(ROOT, '.ssr');

const t0 = Date.now();
const step = (msg) => process.stdout.write(`\x1b[2m[build]\x1b[0m ${msg}\n`);
const vite = (args) => execFileSync('npx', ['vite', ...args], { cwd: ROOT, stdio: 'inherit' });

const { loadContent } = await import('../src/build/content.mjs');
const { disposeHighlighter } = await import('../src/build/highlight.mjs');
const { buildIndex, apiPayloads } = await import('../src/build/payloads.mjs');
const { buildRoutes } = await import('../src/build/routes.mjs');
const { prerender } = await import('../src/build/prerender.mjs');
const { buildFeeds } = await import('../src/build/feeds.mjs');
const { buildSitemap } = await import('../src/build/sitemap.mjs');
const { writeServiceWorker } = await import('../src/build/sw.mjs');

step('reading content…');
const content = await loadContent();
await disposeHighlighter();
const index = buildIndex(content);
step(`${content.posts.length} posts, ${content.drafts.length} drafts, ${index.tags.length} tags`
  + `${content.includeDrafts ? ' (drafts INCLUDED)' : ''}`);

rmSync(DIST, { recursive: true, force: true });
rmSync(SSR, { recursive: true, force: true });

step('building client…');
vite(['build']);

step('building ssr…');
vite(['build', '--ssr', 'src/entry-server.jsx', '--outDir', '.ssr']);

step('prerendering…');
const { render } = await import(path.join(SSR, 'entry-server.js'));
const routes = buildRoutes(content, index);
const apiFiles = apiPayloads(content, index);
const { written, digest } = prerender({ dist: DIST, routes, index, render, apiFiles });
step(`${routes.length} routes → ${written.length} files`);

step('feeds + sitemap…');
const { renderBody } = await import(path.join(SSR, 'entry-server.js'));
const feeds = buildFeeds(content, index, renderBody);
const maps = buildSitemap(routes, content, index);
for (const [name, body] of Object.entries({ ...feeds, ...maps })) {
  writeFileSync(path.join(DIST, name), body);
}

step('service worker…');
const { version } = writeServiceWorker({
  dist: DIST,
  srcSw: path.join(ROOT, 'src/sw.js'),
  contentDigest: digest,
});

// public/engravings is a documented drop-in folder; keep its README out of dist
const engravingsReadme = path.join(DIST, 'engravings/README.md');
if (existsSync(engravingsReadme)) rmSync(engravingsReadme);

rmSync(SSR, { recursive: true, force: true });
step(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s — sw ${version}`);
