// PostCard.jsx — one post in a listing, as an engraved plate in a double frame.
import { A, href } from '../lib/router.jsx';
import { T } from '../lib/strings.js';
import Frame from './Frame.jsx';

function Plate({ post }) {
  // No cover → a procedural monogram on the same hatch field, so cards read as
  // individual without a drop of colour entering the palette.
  if (!post.cover) {
    const letter = (post.title || '؟').trim()[0];
    return (
      <div className="plate plate--monogram" data-hatch={post.hatch} aria-hidden="true">
        <span className="mono-letter">{letter}</span>
      </div>
    );
  }
  return (
    <div className="plate" data-hatch={post.hatch}>
      <img src={post.cover} alt={post.coverAlt || ''} loading="lazy" decoding="async" />
    </div>
  );
}

export default function PostCard({ post, lead = false }) {
  return (
    <Frame as="article" className={`post-card${lead ? ' post-card--lead' : ''}`}>
      <Plate post={post} />
      <h2>
        <A href={post.draft ? href.draft(post.slug) : href.post(post.slug)}>{post.title}</A>
      </h2>
      <div className="card-meta">
        <time dateTime={post.date.iso}>{post.date.fa}</time>
        <span className="dot" aria-hidden="true" />
        <span>{post.reading.fa}</span>
        {post.draft && <span className="badge">{T.draft}</span>}
      </div>
      <p className="summary">{post.summary}</p>
      {post.tagLinks?.length > 0 && (
        <div className="card-foot">
          {post.tagLinks.map((t) => (
            <A key={t.slug} className="tag-chip" href={href.tag(t.slug)}>{t.name}</A>
          ))}
        </div>
      )}
    </Frame>
  );
}
