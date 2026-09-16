// enrich.mjs — turns a parsed BookML tree into one the browser can render
// without ever seeing shiki, KaTeX or a parser.
//
// Only two node types end up as raw HTML — `code` and `math` — and both are
// generated here from local files at build time. Everything else stays
// structured data that React renders as ordinary elements.

import { existsSync } from 'node:fs';
import path from 'node:path';
import { highlight } from './highlight.mjs';
import { renderMath } from './math.mjs';
import { imageSize } from './imagesize.mjs';

async function enrichSegs(segs, publicDir) {
  if (!segs) return segs;
  const out = [];
  for (const s of segs) {
    if (s.t === 'math') out.push({ t: 'mathHtml', html: renderMath(s.tex, { display: false }) });
    else if (s.segs) out.push({ ...s, segs: await enrichSegs(s.segs, publicDir) });
    else out.push(s);
  }
  return out;
}

export async function enrich(parsed, { publicDir, slug }) {
  const blocks = [];
  let codeLines = 0;

  for (const b of parsed.blocks) {
    if (b.type === 'code') {
      codeLines += b.code.split('\n').length;
      blocks.push({ type: 'code', lang: b.lang, html: await highlight(b.code, b.lang), text: b.code });
    } else if (b.type === 'math') {
      blocks.push({ type: 'math', html: renderMath(b.tex, { display: true }), tex: b.tex });
    } else if (b.type === 'figure') {
      const rel = b.src.replace(/^\//, '');
      const abs = path.join(publicDir, rel);
      const dim = existsSync(abs) ? imageSize(abs) : null;
      if (!dim && !/^https?:/.test(b.src)) {
        process.emitWarning(`figure not found for "${slug}": ${b.src}`);
      }
      blocks.push({ ...b, src: b.src.startsWith('/') || /^https?:/.test(b.src) ? b.src : `/${rel}`, ...(dim || {}) });
    } else if (b.type === 'table') {
      blocks.push({
        ...b,
        head: b.head ? await Promise.all(b.head.map((c) => enrichSegs(c, publicDir))) : null,
        rows: await Promise.all(b.rows.map((r) => Promise.all(r.map((c) => enrichSegs(c, publicDir))))),
      });
    } else if (b.type === 'list') {
      blocks.push({ ...b, items: await Promise.all(b.items.map((i) => enrichSegs(i, publicDir))) });
    } else if (b.segs) {
      blocks.push({ ...b, segs: await enrichSegs(b.segs, publicDir) });
    } else {
      blocks.push(b);
    }
  }

  return {
    epigraph: parsed.epigraph,
    blocks,
    footnotes: parsed.footnotes,
    codeLines,
  };
}
