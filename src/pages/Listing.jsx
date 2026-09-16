// Listing.jsx — tags, tag, series index, series, archive, glossary and the
// standalone pages. They differ only in what they list, so they share a file.
import { A, href } from '../lib/router.jsx';
import { Ornament } from '../components/Ornaments.jsx';
import PostCard from '../components/PostCard.jsx';
import Pagination from '../components/Pagination.jsx';
import Prose from '../components/Prose.jsx';
import Frame from '../components/Frame.jsx';
import Search from '../components/Search.jsx';
import { faDigits } from '../lib/bookml.js';
import { T } from '../lib/strings.js';

const Head = ({ title, lede }) => (
  <header className="page-head">
    <h1>{title}</h1>
    {lede && <p className="lede">{lede}</p>}
    <Ornament />
  </header>
);

export function Tags({ data }) {
  return (
    <>
      <Head title={T.allTags} lede={`${faDigits(data.tags.length)} برچسب`} />
      <div className="tag-cloud">
        {data.tags.map((t) => (
          <A key={t.slug} href={href.tag(t.slug)}>
            {t.name}<span className="count">{faDigits(t.posts.length)}</span>
          </A>
        ))}
      </div>
    </>
  );
}

export function Tag({ data }) {
  return (
    <>
      <Head title={data.tag.name} lede={`${faDigits(data.total)} ${T.postsCount}`} />
      <div className="post-list">
        {data.posts.map((p) => <PostCard key={p.slug} post={p} />)}
      </div>
      <Pagination page={data.page} pages={data.pages} hrefFor={(n) => href.tag(data.tag.slug, n)} />
    </>
  );
}

export function SeriesIndex({ data }) {
  return (
    <>
      <Head title={T.series} />
      {data.series.map((s) => (
        <Frame as="article" className="series-card" key={s.slug}>
          <h2><A href={href.series(s.slug)}>{s.title}</A></h2>
          {s.description && <p>{s.description}</p>}
          <span className="count">{faDigits(s.posts.length)} {T.postsCount}</span>
        </Frame>
      ))}
    </>
  );
}

export function Series({ data }) {
  return (
    <>
      <Head title={data.series.title} lede={data.series.description} />
      <div className="post-list">
        {data.posts.map((p) => <PostCard key={p.slug} post={p} />)}
      </div>
    </>
  );
}

export function Archive({ data }) {
  return (
    <>
      <Head title={T.archive} lede={`${faDigits(data.total)} ${T.postsCount}`} />
      {data.years.map((y) => (
        <section className="archive-year" key={y.year}>
          <h2>{faDigits(y.year)}</h2>
          {y.posts.map((p) => (
            <A className="index-row" key={p.slug} href={href.post(p.slug)}>
              <span className="ir-title">{p.title}</span>
              <span className="leader" aria-hidden="true" />
              <span className="ir-date">{p.date.faShort}</span>
            </A>
          ))}
        </section>
      ))}
    </>
  );
}

export function Glossary({ data }) {
  return (
    <>
      <Head title={T.glossary}
            lede="اصطلاح‌هایی که در نوشته‌ها میان گیومهٔ فرانسوی آمده‌اند، با معادلِ لاتینشان." />
      <div className="glossary">
        {data.glossary.map((g) => (
          <div className="gloss-row" key={g.latin}>
            <div className="gloss-terms">
              <span className="gloss-fa">{g.term}</span>
              <span className="gloss-latin lr" dir="ltr">{g.latin}</span>
            </div>
            <div className="gloss-occ">
              {g.occurrences.map((o, i) => (
                <A key={i} href={`${href.post(o.slug)}#b-${o.bi}`}>{o.title}</A>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function SearchPage({ data }) {
  const titles = Object.fromEntries(data.titles);
  return (
    <>
      <Head title={T.search} />
      <div style={{ paddingBottom: '3rem' }}>
        <Search titles={titles} autoFocus limit={40} />
      </div>
    </>
  );
}

export function StandalonePage({ data }) {
  const p = data.page;
  return (
    <article className="post-layout" lang={p.lang} dir={p.lang === 'fa' ? 'rtl' : 'ltr'}>
      <header className="post-head">
        <h1>{p.title}</h1>
        <Ornament />
      </header>
      <div className="post-body"><Prose doc={p.doc} /></div>
    </article>
  );
}

export function NotFound() {
  return (
    <div className="notice">
      <h1>{T.notFound}</h1>
      <p>نشانی‌ای که دنبالش بودید در این دفتر نیست.</p>
      <A className="pill" href={href.index()}>{T.backHome}</A>
    </div>
  );
}
