// bookml.js — Persian utilities + the post file format parser.
//
// The format is the book site's "BookML", extended for a technical weblog.
// Everything the book used is unchanged; the new markers are code fences,
// math, tables, lists, figures, callouts and inline emphasis/links.
//
//   @ سرسخن                    post epigraph (before the body; repeatable)
//   @@ منبع                    epigraph source
//   ## عنوان بخش               section heading (feeds the table of contents)
//   ### عنوان فرعی             sub-heading (also in the TOC)
//   > نقل‌قول                   quotation block; consecutive lines merge
//   ~ مصراع نخست | مصراع دوم   one beyt; consecutive ~ lines form one poem
//   ~~ حافظ                    poem attribution
//   ***                        ornament divider ٭ ٭ ٭
//   - مورد                     bullet list (consecutive lines)
//   ۱. مورد                    ordered list (any digits, Persian or Latin)
//   | a | b |                  table row; a |---|---| line marks the header
//   ```lang … ```              code block, highlighted at build time
//   $$ … $$                    display math, rendered at build time
//   !! نکته | متن              callout; kinds: نکته هشدار قضیه تعریف
//   ![alt](src "شرح")          figure with caption (alone on a line)
//
// Inline: [[the fragmentary]] Latin footnote · «اصطلاح»[[latin]] glossed term
//   · [[م: یادداشت]] author's note · **پررنگ** · *کج* · `کد` · $ریاضی$
//   · [متن](نشانی)

export const faDigits = (s) =>
  String(s).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);

export const ORDINALS = [
  'نخست','دوم','سوم','چهارم','پنجم','ششم','هفتم','هشتم','نهم','دهم',
  'یازدهم','دوازدهم','سیزدهم','چهاردهم','پانزدهم','شانزدهم','هفدهم',
  'هجدهم','نوزدهم','بیستم',
];

export const ABJAD = [
  'الف','ب','ج','د','ه','و','ز','ح','ط','ی','یا','یب','یج','ید','یه',
  'یو','یز','یح','یط','ک','کا','کب','کج','کد','که','کو','کز','کح','کط','ل',
];

export const CALLOUTS = {
  'نکته': 'note', 'هشدار': 'warn', 'قضیه': 'theorem',
  'تعریف': 'definition', 'مثال': 'example',
};

// Normalization for search and audio↔text matching. Persian punctuation
// (؛ ، ؟) lives inside U+0600–U+06FF and must be stripped explicitly.
export function normalize(w) {
  return w
    .replace(/[‌‏‎ـ]/g, '')
    .replace(/[ً-ٰٟ]/g, '')
    .replace(/[؀-ؠ٪-٭۔]/g, '')
    .replace(/[يى]/g, 'ی').replace(/ك/g, 'ک')
    .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ی')
    .replace(/[^؀-ۿ0-9a-zA-Z]/g, '')
    .toLowerCase();
}

// One alternation for every inline construct. Footnotes come first so that
// [[…]] is never mistaken for a […](…) link.
const INLINE_SRC = [
  /\[\[([^\]]+)\]\]/,                                   // 1 footnote
  /`([^`\n]+)`/,                                        // 2 inline code
  /\$([^$\n]+)\$/,                                      // 3 inline math
  /\*\*([^*\n]+)\*\*/,                                  // 4 strong
  /\*([^*\n]+)\*/,                                      // 5 emphasis
  /\[([^\]\n]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/,       // 6 text, 7 href, 8 title
].map((r) => r.source).join('|');

// Inline pass. Returns segments:
//   { t:'text', text } | { t:'note', kind, text, term } | { t:'code', text }
//   | { t:'math', tex } | { t:'strong'|'em', segs } | { t:'link', href, title, segs }
function parseInline(text, plainRef) {
  const out = [];
  let last = 0;
  let m;
  // A fresh regex per call: parseInline recurses for **strong**, *em* and link
  // text, and a shared /g/ object's lastIndex would be clobbered mid-scan.
  const re = new RegExp(INLINE_SRC, 'g');
  while ((m = re.exec(text))) {
    if (m[0] === '') { re.lastIndex += 1; continue; }
    const before = text.slice(last, m.index);
    if (before) { out.push({ t: 'text', text: before }); plainRef.s += before; }
    if (m[1] !== undefined) {
      const body = m[1].trim();
      if (/^م\s*:/.test(body)) {
        out.push({ t: 'note', kind: 'fa', text: body.replace(/^م\s*:/, '').trim(), term: null });
      } else {
        // pair the Latin with the Persian term it glosses: «term»[[latin]]
        const tm = plainRef.s.match(/«([^»]+)»[\s‌]*$/);
        out.push({ t: 'note', kind: 'latin', text: body, term: tm ? tm[1].trim() : null });
      }
    } else if (m[2] !== undefined) {
      out.push({ t: 'code', text: m[2] }); plainRef.s += m[2];
    } else if (m[3] !== undefined) {
      out.push({ t: 'math', tex: m[3], display: false });
    } else if (m[4] !== undefined) {
      out.push({ t: 'strong', segs: parseInline(m[4], plainRef) });
    } else if (m[5] !== undefined) {
      out.push({ t: 'em', segs: parseInline(m[5], plainRef) });
    } else if (m[6] !== undefined) {
      out.push({ t: 'link', href: m[7], title: m[8] || null, segs: parseInline(m[6], plainRef) });
    }
    last = re.lastIndex;
  }
  if (last < text.length) {
    const rest = text.slice(last);
    out.push({ t: 'text', text: rest });
    plainRef.s += rest;
  }
  return out;
}

const FIGURE_RE = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/;
const TABLE_SEP_RE = /^\|(?:\s*:?-{2,}:?\s*\|)+$/;

// Block pass. Returns { epigraph, blocks, footnotes } — footnotes collected
// in reading order and numbered from ۱ within the post.
export function parseBookML(source) {
  const lines = source.replace(/\r/g, '').split('\n');
  const blocks = [];
  const footnotes = [];
  const epigraph = { lines: [], source: null };

  const withNotes = (text, bi) => {
    const plainRef = { s: '' };
    return parseInline(text, plainRef).map(function tag(seg) {
      if (seg.segs) return { ...seg, segs: seg.segs.map(tag) };
      if (seg.t !== 'note') return seg;
      footnotes.push({
        kind: seg.kind, text: seg.text, term: seg.term,
        block: bi != null ? bi : blocks.length,
      });
      return { t: 'ref', n: footnotes.length };
    });
  };

  let para = [];
  let poem = null;
  let list = null;
  let table = null;
  let callout = null;
  let fence = null;    // { lang, lines }
  let math = null;     // string[]

  const flushPara = () => {
    if (para.length) { blocks.push({ type: 'p', segs: withNotes(para.join(' ')) }); para = []; }
  };
  const flushPoem = () => { if (poem) { blocks.push(poem); poem = null; } };
  const flushList = () => { if (list) { blocks.push(list); list = null; } };
  const flushTable = () => { if (table) { blocks.push(table); table = null; } };
  const flushCallout = () => { if (callout) { blocks.push(callout); callout = null; } };
  const flushAll = () => { flushPara(); flushPoem(); flushList(); flushTable(); flushCallout(); };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    // --- raw regions: nothing inside is interpreted ---
    if (fence) {
      if (trimmed === '```') {
        blocks.push({ type: 'code', lang: fence.lang, code: fence.lines.join('\n') });
        fence = null;
      } else fence.lines.push(raw);
      continue;
    }
    if (math) {
      if (trimmed === '$$') {
        blocks.push({ type: 'math', tex: math.join('\n'), display: true });
        math = null;
      } else math.push(raw);
      continue;
    }
    if (trimmed.startsWith('```')) { flushAll(); fence = { lang: trimmed.slice(3).trim() || 'text', lines: [] }; continue; }
    if (trimmed === '$$') { flushAll(); math = []; continue; }

    if (!trimmed) { flushAll(); continue; }

    if (trimmed.startsWith('@@')) { epigraph.source = trimmed.slice(2).trim(); continue; }
    if (trimmed.startsWith('@')) { epigraph.lines.push(trimmed.slice(1).trim()); continue; }

    if (trimmed === '***') { flushAll(); blocks.push({ type: 'divider' }); continue; }

    if (trimmed.startsWith('### ')) { flushAll(); blocks.push({ type: 'h3', text: trimmed.slice(4).trim() }); continue; }
    if (trimmed.startsWith('## ')) { flushAll(); blocks.push({ type: 'h2', text: trimmed.slice(3).trim() }); continue; }

    const fig = trimmed.match(FIGURE_RE);
    if (fig) {
      flushAll();
      blocks.push({ type: 'figure', alt: fig[1], src: fig[2], caption: fig[3] || null });
      continue;
    }

    if (trimmed.startsWith('!!')) {
      flushPara(); flushPoem(); flushList(); flushTable();
      const body = trimmed.slice(2).trim();
      const bar = body.indexOf('|');
      if (callout && bar < 0) {
        callout.segs.push({ t: 'text', text: ' ' }, ...withNotes(body, blocks.length));
      } else {
        flushCallout();
        const kindFa = bar >= 0 ? body.slice(0, bar).trim() : 'نکته';
        const text = bar >= 0 ? body.slice(bar + 1).trim() : body;
        callout = {
          type: 'callout', kindFa, kind: CALLOUTS[kindFa] || 'note',
          segs: withNotes(text),
        };
      }
      continue;
    }
    if (callout) flushCallout();

    if (TABLE_SEP_RE.test(trimmed)) {
      if (table && table.rows.length) { table.head = table.rows.shift(); }
      continue;
    }
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 2) {
      flushPara(); flushPoem(); flushList();
      if (!table) table = { type: 'table', head: null, rows: [] };
      const cells = trimmed.slice(1, -1).split('|').map((c) => withNotes(c.trim(), blocks.length));
      table.rows.push(cells);
      continue;
    }
    if (table) flushTable();

    const bullet = trimmed.match(/^[-•]\s+(.*)$/);
    const numbered = trimmed.match(/^[\d۰-۹]+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      flushPara(); flushPoem();
      const ordered = !!numbered;
      if (!list || list.ordered !== ordered) { flushList(); list = { type: 'list', ordered, items: [] }; }
      list.items.push(withNotes((bullet || numbered)[1], blocks.length));
      continue;
    }
    if (list) flushList();

    if (trimmed.startsWith('~~')) { if (poem) poem.poet = trimmed.slice(2).trim(); continue; }
    if (trimmed.startsWith('~')) {
      flushPara(); flushTable();
      if (!poem) poem = { type: 'poem', beyts: [], poet: null };
      const [a, b] = trimmed.slice(1).split('|').map((s) => (s || '').trim());
      poem.beyts.push([a, b || '']);
      continue;
    }

    if (trimmed.startsWith('> ') || trimmed === '>') {
      flushPara(); flushPoem(); flushList(); flushTable();
      const prev = blocks[blocks.length - 1];
      const text = trimmed.slice(1).trim();
      if (prev && prev.type === 'quote') prev.segs.push({ t: 'text', text: ' ' }, ...withNotes(text, blocks.length - 1));
      else blocks.push({ type: 'quote', segs: withNotes(text) });
      continue;
    }

    para.push(trimmed);
  }
  // unterminated regions still yield their content rather than vanishing
  if (fence) blocks.push({ type: 'code', lang: fence.lang, code: fence.lines.join('\n') });
  if (math) blocks.push({ type: 'math', tex: math.join('\n'), display: true });
  flushAll();

  return { epigraph: epigraph.lines.length ? epigraph : null, blocks, footnotes };
}

// Headings for the per-post table of contents, with their block index so the
// TOC can deep-link with the same #b-N anchors bookmarks and search use.
export function extractHeadings(parsed) {
  const off = parsed.epigraph ? 1 : 0;
  return parsed.blocks
    .map((b, i) => (b.type === 'h2' || b.type === 'h3' ? { text: b.text, level: b.type === 'h2' ? 2 : 3, bi: i + off } : null))
    .filter(Boolean);
}

const segText = (segs) => (segs || []).map(function walk(s) {
  if (s.t === 'text' || s.t === 'code') return s.text;
  if (s.segs) return s.segs.map(walk).join('');
  return '';
}).join('');

// Plain text of each top-level block, indexed to match the post page's DOM
// children (epigraph first when present, dividers counted).
export function blockTexts(parsed) {
  const rows = [];
  let bi = 0;
  if (parsed.epigraph) { rows.push({ bi, text: parsed.epigraph.lines.join(' ') }); bi += 1; }
  for (const b of parsed.blocks) {
    let t = '';
    if (b.type === 'p' || b.type === 'quote' || b.type === 'callout') t = segText(b.segs);
    else if (b.type === 'h2' || b.type === 'h3') t = b.text;
    else if (b.type === 'poem') t = b.beyts.map(([a, z]) => `${a} ${z}`).join(' ');
    else if (b.type === 'list') t = b.items.map(segText).join(' ');
    else if (b.type === 'table') t = [b.head || [], ...b.rows].map((r) => r.map(segText).join(' ')).join(' ');
    else if (b.type === 'figure') t = b.caption || b.alt || '';
    // code is searchable — normalize() keeps [a-z0-9], so `theorem` finds it.
    // Math is not: TeX source is noise to a reader searching for words.
    else if (b.type === 'code') t = b.code;
    t = t.replace(/\s+/g, ' ').trim();
    if (t) rows.push({ bi, text: t });
    bi += 1;
  }
  return rows;
}

// Whole-post plain text — used for reading time and the excerpt fallback.
export function plainText(parsed) {
  return blockTexts(parsed).map((r) => r.text).join('\n');
}
