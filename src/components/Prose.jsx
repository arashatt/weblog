// Prose.jsx — renders the enriched BookML tree.
//
// Exactly two node types arrive as HTML strings: `code` and `math`. Both are
// produced at build time by shiki and KaTeX from local files, never from user
// input. Everything else is structured data rendered as ordinary elements.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { faDigits } from '../lib/bookml.js';
import { T } from '../lib/strings.js';

/* ---------- inline segments ---------------------------------------------- */

function Segs({ segs, onNote }) {
  if (!segs) return null;
  return segs.map((s, i) => {
    switch (s.t) {
      case 'text':
        return s.text;
      case 'ref':
        return (
          <sup key={i} className="noteref" role="button" tabIndex={0}
               data-n={s.n}
               onClick={(e) => onNote?.(s.n, e.currentTarget)}
               onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNote?.(s.n, e.currentTarget); } }}>
            {faDigits(s.n)}
          </sup>
        );
      case 'code':
        return <code key={i} className="lr" dir="ltr">{s.text}</code>;
      case 'mathHtml':
        return <span key={i} dangerouslySetInnerHTML={{ __html: s.html }} />;
      case 'strong':
        return <strong key={i}><Segs segs={s.segs} onNote={onNote} /></strong>;
      case 'em':
        return <em key={i}><Segs segs={s.segs} onNote={onNote} /></em>;
      case 'link': {
        const external = /^[a-z]+:/i.test(s.href);
        return (
          <a key={i} href={s.href} title={s.title || undefined}
             {...(external ? { rel: 'noopener noreferrer', target: '_blank' } : {})}>
            <Segs segs={s.segs} onNote={onNote} />
          </a>
        );
      }
      default:
        return null;
    }
  });
}

/* ---------- blocks --------------------------------------------------------- */

function Block({ b, bi, lead, dropCap, onNote }) {
  const id = `b-${bi}`;
  switch (b.type) {
    case 'p':
      return (
        <p id={id} className={lead ? `lead${dropCap ? ' has-cap' : ''}` : undefined}>
          <Segs segs={b.segs} onNote={onNote} />
        </p>
      );
    case 'h2':
      return <h2 id={id} className="rule-under"><Segs segs={[{ t: 'text', text: b.text }]} /></h2>;
    case 'h3':
      return <h3 id={id}>{b.text}</h3>;
    case 'quote':
      return <blockquote id={id}><Segs segs={b.segs} onNote={onNote} /></blockquote>;
    case 'divider':
      return <div id={id} className="divider" role="presentation" aria-hidden="true">٭ ٭ ٭</div>;
    case 'poem':
      return (
        <div id={id} className="beyt-block">
          {b.beyts.map(([a, z], i) => (
            <div className="beyt" key={i}>
              <span className="mesra">{a}</span>
              <span className="mesra">{z}</span>
            </div>
          ))}
          {b.poet && <div className="poet">{b.poet}</div>}
        </div>
      );
    case 'list': {
      const Tag = b.ordered ? 'ol' : 'ul';
      return (
        <Tag id={id}>
          {b.items.map((segs, i) => <li key={i}><Segs segs={segs} onNote={onNote} /></li>)}
        </Tag>
      );
    }
    case 'table':
      return (
        <div id={id} className="table-wrap bleed-wide">
          <table>
            {b.head && (
              <thead>
                <tr>{b.head.map((c, i) => <th key={i} scope="col"><Segs segs={c} onNote={onNote} /></th>)}</tr>
              </thead>
            )}
            <tbody>
              {b.rows.map((r, i) => (
                <tr key={i}>{r.map((c, j) => <td key={j}><Segs segs={c} onNote={onNote} /></td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'code':
      return (
        <div id={id} className="code-block bleed-wide">
          {b.lang && b.lang !== 'text' && <span className="code-lang">{b.lang}</span>}
          <div dangerouslySetInnerHTML={{ __html: b.html }} />
        </div>
      );
    case 'math':
      return <div id={id} className="bleed-wide" dangerouslySetInnerHTML={{ __html: b.html }} />;
    case 'figure':
      return (
        <figure id={id} className="bleed-wide">
          <img src={b.src} alt={b.alt || ''} width={b.width || undefined} height={b.height || undefined}
               loading="lazy" decoding="async" />
          {b.caption && <figcaption>{b.caption}</figcaption>}
        </figure>
      );
    case 'callout':
      return (
        <aside id={id} className={`callout callout--${b.kind}`}>
          <span className="callout-kind">{b.kindFa}</span>
          <p><Segs segs={b.segs} onNote={onNote} /></p>
        </aside>
      );
    default:
      return null;
  }
}

/* ---------- footnote popover ------------------------------------------------ */

const EDGE = 10;   // breathing room between the popover and the viewport edge

function NotePop({ note, at, onClose }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc); };
  }, [onClose]);

  // Keep the popover inside the viewport. It is centred on its marker
  // (translateX(-50%)), so a marker near either edge would otherwise hang half
  // the box off-screen — and one low in the viewport would open below the fold.
  //
  // The box has to be MEASURED rather than predicted: its width depends on the
  // note's text, the reader's font scale and the active theme. useLayoutEffect
  // so the correction is committed before paint and nothing visibly jumps.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !at) return;
    const box = el.getBoundingClientRect();
    const half = box.width / 2;

    const lo = half + EDGE;
    const hi = window.innerWidth - half - EDGE;
    // lo > hi only if the box is wider than the viewport allows; centre it.
    const left = lo > hi ? window.innerWidth / 2 : Math.min(Math.max(at.left, lo), hi);

    const fitsBelow = at.below + box.height + EDGE <= window.innerHeight;
    const fitsAbove = at.above - box.height - EDGE >= 0;
    const top = fitsBelow || !fitsAbove ? at.below : at.above - box.height;

    setPos({ top, left });
  }, [at, note]);

  if (!note || !at) return null;
  // First paint uses the raw anchor; the layout effect above corrects it in the
  // same commit, so this value is never actually painted when it is wrong.
  const p = pos || { top: at.below, left: at.left };
  return (
    <div className="note-pop" ref={ref} role="note"
         style={{ top: `${p.top}px`, left: `${p.left}px` }}>
      {note.kind === 'latin'
        ? <span className="lr" dir="ltr">{note.text}</span>
        : <>{note.text} <span style={{ whiteSpace: 'nowrap' }}>ــ م.</span></>}
    </div>
  );
}

/* ---------- the renderer ----------------------------------------------------- */

export default function Prose({ doc, dropCap = false, showFootnotes = true, className = '' }) {
  const [pop, setPop] = useState(null);
  const off = doc.epigraph ? 1 : 0;

  const onNote = useCallback((n, el) => {
    setPop((prev) => {
      if (prev && prev.n === n) return null;
      const r = el.getBoundingClientRect();
      // Both candidate anchors, so NotePop can flip when there is no room below.
      return { n, at: { left: r.left + r.width / 2, below: r.bottom + 8, above: r.top - 8 } };
    });
  }, []);

  useEffect(() => {
    if (!pop) return undefined;
    const clear = () => setPop(null);
    window.addEventListener('scroll', clear, { passive: true });
    window.addEventListener('resize', clear);
    return () => { window.removeEventListener('scroll', clear); window.removeEventListener('resize', clear); };
  }, [pop]);

  // the first real paragraph carries the lead/drop-cap treatment
  const leadIndex = doc.blocks.findIndex((b) => b.type === 'p');

  return (
    <div className={`prose ${className}`}>
      {doc.epigraph && (
        <div className="epigraph" id="b-0">
          <div className="inner">
            {doc.epigraph.lines.map((l, i) => <div key={i}>{l}</div>)}
            {doc.epigraph.source && <div className="src">{doc.epigraph.source}</div>}
          </div>
        </div>
      )}

      {doc.blocks.map((b, i) => (
        <Block key={i} b={b} bi={i + off} lead={i === leadIndex} dropCap={dropCap} onNote={onNote} />
      ))}

      {showFootnotes && doc.footnotes.length > 0 && (
        <section className="footnotes" aria-label={T.footnotes}>
          <ol>
            {doc.footnotes.map((f, i) => (
              <li key={i} id={`fn-${i + 1}`} data-n={faDigits(i + 1)}>
                {f.kind === 'latin'
                  ? <span className="lr" dir="ltr">{f.text}</span>
                  : <>{f.text} <span style={{ whiteSpace: 'nowrap' }}>ــ م.</span></>}
              </li>
            ))}
          </ol>
        </section>
      )}

      {pop && <NotePop note={doc.footnotes[pop.n - 1]} at={pop.at} onClose={() => setPop(null)} />}
    </div>
  );
}
