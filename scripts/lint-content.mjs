#!/usr/bin/env node
// lint-content.mjs — catch the content mistakes that otherwise fail silently:
// a typo'd front-matter key is simply ignored, an unclosed fence swallows the
// rest of the post, and a link to a slug that does not exist 404s only in
// production.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontMatter, KNOWN_KEYS } from '../src/lib/frontmatter.js';
import { slugify } from '../src/lib/format.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const CONTENT = path.join(ROOT, 'content');
const PUBLIC = path.join(ROOT, 'public');

const walk = (d) => (existsSync(d) ? readdirSync(d, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(d, e.name);
  return e.isDirectory() ? walk(p) : (p.endsWith('.md') ? [p] : []);
}) : []);

// Levenshtein distance ≤ 1, to turn "tag:" into "did you mean tags?"
const near = (a, b) => {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0; let j = 0; let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (a.length < b.length) j++;
    else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
};

let errors = 0; let warnings = 0;
const err = (f, line, msg) => { errors++; console.log(`\x1b[31merror\x1b[0m   ${path.relative(ROOT, f)}:${line}  ${msg}`); };
const warn = (f, line, msg) => { warnings++; console.log(`\x1b[33mwarning\x1b[0m ${path.relative(ROOT, f)}:${line}  ${msg}`); };

const tagsFile = path.join(CONTENT, 'tags.json');
const tagMap = existsSync(tagsFile) ? JSON.parse(readFileSync(tagsFile, 'utf8')) : {};
const seriesFile = path.join(CONTENT, 'series.json');
const seriesMap = existsSync(seriesFile) ? JSON.parse(readFileSync(seriesFile, 'utf8')) : {};

const files = [...walk(path.join(CONTENT, 'posts')), ...walk(path.join(CONTENT, 'pages'))];
const slugs = new Set();

for (const file of files) {
  const raw = readFileSync(file, 'utf8');
  const { meta, body, lineOffset } = parseFrontMatter(raw);

  if (!meta.title) err(file, 1, 'front-matter has no title');
  for (const key of Object.keys(meta)) {
    if (KNOWN_KEYS.includes(key)) continue;
    const hint = KNOWN_KEYS.find((k) => near(key, k));
    warn(file, 1, `unknown front-matter key "${key}"${hint ? ` — did you mean "${hint}"?` : ''}`);
  }

  const base = path.basename(file, '.md').replace(/^\d{4}-\d{2}-\d{2}-/, '');
  const slug = meta.slug || (/^[\x20-\x7e]+$/.test(base) ? base : slugify(meta.title || base));
  if (slugs.has(slug)) err(file, 1, `duplicate slug "${slug}"`);
  slugs.add(slug);

  if (meta.date && !/^\d{4}-\d{2}-\d{2}$/.test(String(meta.date))) {
    err(file, 1, `date "${meta.date}" is not YYYY-MM-DD (Gregorian)`);
  }
  if (meta.series && !seriesMap[meta.series]) {
    warn(file, 1, `series "${meta.series}" is not declared in content/series.json`);
  }
  for (const t of [].concat(meta.tags || [])) {
    if (!tagMap[t]) warn(file, 1, `tag "${t}" has no slug in content/tags.json — URL will be "${slugify(t)}"`);
  }
  if (meta.cover && !existsSync(path.join(PUBLIC, String(meta.cover).replace(/^\//, '')))) {
    err(file, 1, `cover not found: ${meta.cover}`);
  }

  // unclosed regions swallow everything after them
  const lines = body.split('\n');
  let fence = null; let math = false;
  // [[ ]] is balanced per PARAGRAPH, not per line: the parser joins a
  // paragraph's lines before the inline pass, so a footnote may legitimately
  // wrap across several lines.
  let paraStart = lineOffset; let opens = 0; let closes = 0;
  const endPara = () => {
    if (opens !== closes) warn(file, paraStart, `unbalanced [[ ]] in the paragraph starting here (${opens} open, ${closes} close)`);
    opens = 0; closes = 0;
  };

  lines.forEach((l, i) => {
    const t = l.trim();
    const ln = lineOffset + i;
    if (fence) { if (t === '```') fence = null; return; }
    if (math) { if (t === '$$') math = false; return; }
    if (t.startsWith('```')) { endPara(); fence = ln; return; }
    if (t === '$$') { endPara(); math = true; return; }
    if (!t) { endPara(); paraStart = ln + 1; return; }
    if (opens === 0 && closes === 0) paraStart = ln;
    opens += (t.match(/\[\[/g) || []).length;
    closes += (t.match(/\]\]/g) || []).length;
    for (const m of t.matchAll(/\]\(([^)\s]+)\)/g)) {
      const href = m[1];
      if (href.startsWith('/posts/')) {
        const target = decodeURIComponent(href.replace(/^\/posts\/|\/$/g, ''));
        if (target && !slugs.has(target)) warn(file, ln, `link to /posts/${target}/ — no post has that slug`);
      }
    }
  });
  endPara();
  if (fence) err(file, fence, 'code fence is never closed');
  if (math) err(file, lineOffset, 'display-math $$ is never closed');
}

console.log(`\n${files.length} files — ${errors} error(s), ${warnings} warning(s)`);
process.exit(errors ? 1 : 0);
