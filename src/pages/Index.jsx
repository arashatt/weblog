import { href } from '../lib/router.jsx';
import { Ornament, Crest } from '../components/Ornaments.jsx';
import PostCard from '../components/PostCard.jsx';
import Pagination from '../components/Pagination.jsx';
import { T } from '../lib/strings.js';

export default function Index({ site, data }) {
  const { posts, page, pages } = data;
  return (
    <>
      {page === 1 && (
        <section className="hero">
          <Crest size="lg" />
          <h1>{site.title}</h1>
          <p className="tagline">{site.tagline}</p>
          <Ornament />
        </section>
      )}
      {page > 1 && (
        <header className="page-head">
          <h1>{T.posts}</h1>
          <p className="lede">{T.page} {page}</p>
          <Ornament />
        </header>
      )}

      {posts.length === 0
        ? <p className="notice">{T.empty}</p>
        : (
          <div className="post-list">
            {posts.map((p, i) => <PostCard key={p.slug} post={p} lead={page === 1 && i === 0} />)}
          </div>
        )}

      <Pagination page={page} pages={pages} hrefFor={(n) => href.index(n)} />
    </>
  );
}
