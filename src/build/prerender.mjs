// prerender.mjs — render every route to a real file on disk.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { outFile } from '../lib/routes.js';

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const metaTag = (m) => (m.property
  ? `<meta property="${esc(m.property)}" content="${esc(m.content)}" />`
  : `<meta name="${esc(m.name)}" content="${esc(m.content)}" />`);

const linkTag = (l) => `<link rel="${esc(l.rel)}"${l.type ? ` type="${esc(l.type)}"` : ''}${l.title ? ` title="${esc(l.title)}"` : ''} href="${esc(l.href)}" />`;

// A JSON <script> rather than `window.__DATA__ = {...}`: the only escape the
// parser needs is </script>, so there is no way to break out of it.
const dataTag = (payload) =>
  `<script type="application/json" id="__DATA__">${
    JSON.stringify(payload).replace(/</g, '\\u003c').replace(/\u2028|\u2029/g, (c) => (c === '\u2028' ? '\\u2028' : '\\u2029'))
  }</script>`;

export function prerender({ dist, routes, index, render, apiFiles }) {
  const template = readFileSync(path.join(dist, 'index.html'), 'utf8');
  const written = [];

  const write = (rel, body) => {
    const abs = path.join(dist, rel);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, body);
    written.push(rel);
  };

  for (const r of routes) {
    const { html, head } = render(r.route, r.data, index);
    const page = template
      .replace('<!--head:title-->', esc(head.title))
      .replace('<!--head:meta-->', head.metas.map(metaTag).join('\n  '))
      .replace('<!--head:links-->', head.links.map(linkTag).join('\n  ')
        + `\n  <script type="application/ld+json">${JSON.stringify(head.jsonld).replace(/</g, '\\u003c')}</script>`)
      .replace('<!--app-->', html)
      .replace('<!--head:data-->', dataTag({ index, route: r.route, data: r.data }));

    write(r.file || outFile(r.path), page);
  }

  for (const [url, body] of Object.entries(apiFiles)) {
    write(url.replace(/^\//, ''), body);
  }

  const digest = createHash('sha256').update(apiFiles['/api/index.json']).digest('hex').slice(0, 16);
  return { written, digest };
}
