// frontmatter.js — a deliberately small subset of YAML.
//
// A post file MAY open with a `---` fence. When line 1 is not exactly `---`
// there is no front-matter and the whole file is body — which is what lets the
// book site's existing chapter files parse here unchanged.
//
// Supported:
//   key: value            → string ("true"/"false" become booleans)
//   key: [a, b, c]        → array (no nesting, no quoting; commas split)
//   key: |                → block scalar (more-indented lines, dedented)
//   # comment             → ignored at the start of a line
//
// Everything else is left as a string. `lineOffset` is the body's first line
// number in the original file, so the content linter can report file:line.

const FENCE = '---';

const coerce = (v) => {
  if (v === 'true') return true;
  if (v === 'false') return false;
  // plain integers only — a bare ISO date must stay a string
  if (/^-?\d+$/.test(v)) return Number(v);
  if (v.startsWith('[') && v.endsWith(']')) {
    return v.slice(1, -1).split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  }
  return v.replace(/^["']|["']$/g, '');
};

export function parseFrontMatter(source) {
  const text = source.replace(/^﻿/, '').replace(/\r/g, '');
  const lines = text.split('\n');
  if (lines[0].trim() !== FENCE) return { meta: {}, body: text, lineOffset: 1 };

  const meta = {};
  let i = 1;
  let blockKey = null;
  let blockLines = null;

  for (; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (blockKey !== null) {
      // a block scalar runs until a line that is not blank and not indented
      if (trimmed === '' || /^\s/.test(line)) { blockLines.push(line); continue; }
      meta[blockKey] = dedent(blockLines);
      blockKey = null; blockLines = null;
    }

    if (trimmed === FENCE) { i++; break; }
    if (trimmed === '' || trimmed.startsWith('#')) continue;

    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    if (value === '|' || value === '>') { blockKey = key; blockLines = []; continue; }
    meta[key] = coerce(value);
  }
  if (blockKey !== null) meta[blockKey] = dedent(blockLines);

  return { meta, body: lines.slice(i).join('\n'), lineOffset: i + 1 };
}

function dedent(lines) {
  const body = lines.filter((l, idx) => l.trim() !== '' || idx > 0);
  while (body.length && body[body.length - 1].trim() === '') body.pop();
  const indents = body.filter((l) => l.trim()).map((l) => l.match(/^\s*/)[0].length);
  const min = indents.length ? Math.min(...indents) : 0;
  return body.map((l) => l.slice(min)).join('\n').trim();
}

// Known keys, used by scripts/lint-content.mjs to catch typos.
export const KNOWN_KEYS = [
  'title', 'slug', 'date', 'updated', 'tags', 'series', 'seriesPart',
  'summary', 'excerpt', 'cover', 'coverAlt', 'lang', 'draft', 'unlisted',
  'canonical', 'audio', 'cues', 'hatch',
];
