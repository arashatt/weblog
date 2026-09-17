// MagazineGrid.jsx — the editorial rhythm.
//
// Posts arrive in one flat reverse-chronological list; this decides how much
// room each one gets. The grid is six columns and every weight is a clean
// divisor of it — lead 6, feature 3, brief 2, line 6 — so a row either fills
// exactly or does not exist.
//
// That is the whole trick: rather than assigning weights per post and hoping
// they tile, we choose ROW SIZES first and derive the weight from the row. A
// short final row shrinks to whatever is left and takes the weight that fills
// it, so the page can never end on a half-empty band — the failure mode that
// makes most "magazine" grids look broken at awkward post counts.

import PostCard from './PostCard.jsx';

const COLUMNS = 6;
const WIDTH = { lead: 6, feature: 3, brief: 2, line: 6 };

// Rows of 1, 2 and 3 cards, cycling. The opening 1 is the lead story.
const ROW_PATTERN = [1, 2, 3, 2, 3];

const weightFor = (size, isFirst, allowLead) => {
  if (size === 2) return 'feature';
  if (size === 3) return 'brief';
  return isFirst && allowLead ? 'lead' : 'line';
};

/**
 * @param n           how many posts
 * @param allowLead   false on filtered views, where a full-bleed lead would
 *                    overstate a page that is already a subset
 * @returns one weight per post, in order
 */
export function layout(n, { allowLead = true } = {}) {
  if (n <= 0) return [];
  if (n === 1) return ['lead'];
  if (n === 2) return ['feature', 'feature'];

  const out = [];
  let i = 0;
  let row = allowLead ? 0 : 1;

  while (i < n) {
    const left = n - i;
    const size = Math.min(ROW_PATTERN[row % ROW_PATTERN.length], left);
    const weight = weightFor(size, i === 0, allowLead);
    for (let k = 0; k < size; k++) out.push(weight);
    i += size;
    row += 1;
  }
  return out;
}

export default function MagazineGrid({ posts, allowLead = true }) {
  const weights = layout(posts.length, { allowLead });

  // Mark the first card of each row so CSS can rule the band above it without
  // needing :nth-child arithmetic that breaks whenever the pattern changes.
  let filled = 0;
  return (
    // bleed-wide: the mosaic needs the wide column, not the reading measure —
    // six tracks inside 36rem would leave a brief about 90px across.
    <div className="mag bleed-wide">
      {posts.map((p, i) => {
        const w = weights[i];
        const startsRow = filled % COLUMNS === 0;
        filled += WIDTH[w];
        return (
          <div key={p.slug} className={`m-cell m-${w}${startsRow ? ' m-rowstart' : ''}`}>
            <PostCard post={p} variant={w} />
          </div>
        );
      })}
    </div>
  );
}
