import { href } from '../lib/router.jsx';
import { Ornament, Crest } from '../components/Ornaments.jsx';
import MagazineGrid from '../components/MagazineGrid.jsx';
import Pagination from '../components/Pagination.jsx';
import { T } from '../lib/strings.js';

export default function Index({ site, data }) {
  const { posts, page, pages } = data;
  return (
    <>
      {page === 1 ? (
        <section className="hero">
          <Crest size="lg" />
          <h1>{site.title}</h1>
          <p className="tagline">{site.tagline}</p>
          <Ornament />
        </section>
      ) : (
        <header className="page-head">
          <h1>{T.posts}</h1>
          <p className="lede">{T.page} {page}</p>
          <Ornament />
        </header>
      )}

      {posts.length === 0
        ? <p className="notice">{T.empty}</p>
        // Only the first page opens with a lead: a full-bleed top story on
        // page 4 would claim a prominence the position does not carry.
        : <MagazineGrid posts={posts} allowLead={page === 1} />}

      <Pagination page={page} pages={pages} hrefFor={(n) => href.index(n)} />
    </>
  );
}
