import { A, href } from '../lib/router.jsx';
import { T } from '../lib/strings.js';

export default function Related({ posts }) {
  if (!posts?.length) return null;
  return (
    <section>
      <h2 className="section-head">{T.related}</h2>
      <div className="related">
        {posts.map((p) => (
          <A key={p.slug} className="related-card" href={href.post(p.slug)}>
            <span className="rc-date">{p.date.fa}</span>
            <span className="rc-title">{p.title}</span>
          </A>
        ))}
      </div>
    </section>
  );
}
