// PostCard.jsx — one post in a listing, at one of four editorial weights.
//
//   lead     full width, framed, big plate — the front page's top story
//   feature  half width, framed, medium plate
//   brief    third width, unframed under a rule, small plate
//   line     full width, a ruled row with a dotted leader — no plate at all
//
// The weight is chosen by MagazineGrid, never by the post: hierarchy comes
// from position on the page, so the front page reshapes itself on every
// publish without anyone editing front-matter.

import { A, href } from '../lib/router.jsx';
import { T } from '../lib/strings.js';
import Frame from './Frame.jsx';

function Plate({ post, variant }) {
  if (!post.cover) {
    // A lead with no cover gets no plate at all. At full width the monogram
    // band becomes a 350px field of texture carrying one letter — a magazine
    // sets a text lead in type, so this one does too.
    if (variant === 'lead') return null;
    // At smaller weights the band still earns its place: it anchors the card
    // in the grid, and the hatch angle (hashed from the slug) keeps cards
    // distinguishable without a drop of colour entering the palette.
    const letter = (post.title || '؟').trim()[0];
    return (
      <div className={`plate plate--monogram plate--${variant}`} data-hatch={post.hatch} aria-hidden="true">
        <span className="mono-letter">{letter}</span>
      </div>
    );
  }
  return (
    <div className={`plate plate--${variant}`} data-hatch={post.hatch}>
      <img src={post.cover} alt={post.coverAlt || ''}
           loading={variant === 'lead' ? 'eager' : 'lazy'} decoding="async" />
    </div>
  );
}

// The line above a headline: the series it belongs to, else its first tag.
function Kicker({ post }) {
  const title = post.seriesNav?.title || post.seriesTitle;
  const tag = post.tagLinks?.[0];
  if (post.series && title) return <A className="kicker" href={href.series(post.series)}>{title}</A>;
  if (tag) return <A className="kicker" href={href.tag(tag.slug)}>{tag.name}</A>;
  return null;
}

function Meta({ post }) {
  return (
    <div className="card-meta">
      <time dateTime={post.date.iso}>{post.date.fa}</time>
      <span className="dot" aria-hidden="true" />
      <span>{post.reading.fa}</span>
      {post.draft && <span className="badge">{T.draft}</span>}
    </div>
  );
}

export default function PostCard({ post, variant = 'feature' }) {
  const to = post.draft ? href.draft(post.slug) : href.post(post.slug);

  // A ruled row: kicker, headline, dotted leader, date. No plate — at this
  // weight an image would compete with the headlines above it.
  if (variant === 'line') {
    return (
      <article className="post-card post-card--line">
        <A className="line-main" href={to}>
          <span className="line-title">{post.title}</span>
        </A>
        <span className="leader" aria-hidden="true" />
        <span className="line-meta">
          {post.tagLinks?.[0] && <span className="line-tag">{post.tagLinks[0].name}</span>}
          <time dateTime={post.date.iso}>{post.date.faShort}</time>
        </span>
      </article>
    );
  }

  const framed = variant === 'lead' || variant === 'feature';
  const Wrap = framed ? Frame : 'article';
  const wrapProps = framed ? { as: 'article' } : {};
  // A lead with no cover runs as a text lead; the class says so explicitly
  // rather than leaving the stylesheet to infer it from a missing child.
  const textLead = variant === 'lead' && !post.cover;

  return (
    <Wrap {...wrapProps}
          className={`post-card post-card--${variant}${textLead ? ' post-card--textlead' : ''}`}>
      <Plate post={post} variant={variant} />
      <Kicker post={post} />
      <h2><A href={to}>{post.title}</A></h2>
      <Meta post={post} />
      {variant !== 'brief' && <p className="summary">{post.summary}</p>}
      {variant === 'lead' && post.tagLinks?.length > 0 && (
        <div className="card-foot">
          {post.tagLinks.map((t) => (
            <A key={t.slug} className="tag-chip" href={href.tag(t.slug)}>{t.name}</A>
          ))}
        </div>
      )}
    </Wrap>
  );
}
