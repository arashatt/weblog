// Search.jsx — the drawer's search box and the /search/ page share this.
//
// The index is fetched lazily on the first keystroke, never on boot: the book
// site prefetched every chapter to build it, which does not survive a weblog
// with a hundred posts.
import { useEffect, useRef, useState } from 'react';
import { indexRow, searchBlocks } from '../lib/search.js';
import { A, href } from '../lib/router.jsx';
import { T } from '../lib/strings.js';

let cache = null;
let inflight = null;

export function loadSearchIndex() {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetch('/api/search.json')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => { cache = rows.map(indexRow); return cache; })
      .catch(() => { cache = []; return cache; });
  }
  return inflight;
}

export default function Search({ titles, autoFocus = false, limit = 24, onNavigate }) {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState(null);
  const input = useRef(null);

  useEffect(() => { if (autoFocus) input.current?.focus(); }, [autoFocus]);
  useEffect(() => {
    if (q.trim().length < 2 || rows) return;
    let live = true;
    loadSearchIndex().then((r) => { if (live) setRows(r); });
    return () => { live = false; };
  }, [q, rows]);

  const results = rows && q.trim().length >= 2 ? searchBlocks(rows, q, limit) : [];

  return (
    <>
      <div className="searchbox">
        <span className="search-ic" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="11" cy="11" r="7" /><path d="M20 20 L16 16" strokeLinecap="round" />
          </svg>
        </span>
        <input ref={input} className="search-input" type="search" value={q} dir="auto"
               placeholder={T.searchPlaceholder} aria-label={T.search}
               onChange={(e) => setQ(e.target.value)} />
        {q && (
          <button className="search-clear" onClick={() => setQ('')} aria-label={T.clear}>×</button>
        )}
      </div>

      {q.trim().length >= 2 && (
        <div className="search-results">
          {!rows && <p className="notice" style={{ padding: '1rem 0' }}>…</p>}
          {rows && results.length === 0 && <p style={{ color: 'var(--quiet)' }}>{T.noResults}</p>}
          {results.map((r, i) => (
            <A key={i} className="result-row" href={`${href.post(r.slug)}#b-${r.bi}`} onClick={onNavigate}>
              <span className="result-post">{titles?.[r.slug] || r.slug}</span>
              <span className="result-snip">
                {r.before} <mark>{r.match}</mark> {r.after}
              </span>
            </A>
          ))}
        </div>
      )}
    </>
  );
}
