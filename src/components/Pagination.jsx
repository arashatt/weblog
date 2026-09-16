import { A } from '../lib/router.jsx';
import { faDigits } from '../lib/bookml.js';
import { T } from '../lib/strings.js';

// RTL reading order: "newer" sits on the right, "older" on the left. The flex
// container is already RTL, so newer-first in source is correct.
export default function Pagination({ page, pages, hrefFor }) {
  if (pages <= 1) return null;
  return (
    <nav className="pagination" aria-label={T.page}>
      {page > 1
        ? <A href={hrefFor(page - 1)} rel="prev">‹ {T.newer}</A>
        : <span />}
      <span className="pg-ind">{faDigits(page)} / {faDigits(pages)}</span>
      {page < pages
        ? <A href={hrefFor(page + 1)} rel="next">{T.older} ›</A>
        : <span />}
    </nav>
  );
}
