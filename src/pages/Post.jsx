import { useEffect, useRef, useState } from 'react';
import { A, href } from '../lib/router.jsx';
import { Ornament } from '../components/Ornaments.jsx';
import Prose from '../components/Prose.jsx';
import Toc from '../components/Toc.jsx';
import Related from '../components/Related.jsx';
import ShareBar from '../components/ShareBar.jsx';
import Comments from '../components/Comments.jsx';
import { setPos, getMarks, addMark } from '../lib/store.js';
import { T } from '../lib/strings.js';

export default function Post({ site, data, settings }) {
  const post = data.post;
  const bodyRef = useRef(null);
  const [marked, setMarked] = useState(false);

  // Remember where the reader is. Runs only in the browser, after hydration,
  // so it can never influence the rendered tree.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return undefined;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const mid = window.innerHeight * 0.35;
        let best = null;
        for (const child of el.querySelectorAll('[id^="b-"]')) {
          const r = child.getBoundingClientRect();
          if (r.top <= mid) best = child; else break;
        }
        if (best) {
          setPos({
            slug: post.slug,
            bi: Number(best.id.slice(2)),
            snippet: (best.textContent || '').trim().slice(0, 80),
          });
        }
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, [post.slug]);

  // Reveal-on-scroll; a programmatic jump pre-reveals everything above the
  // target so no text is ever left hidden.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return undefined;
    const blocks = [...el.querySelectorAll('[id^="b-"]')];
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      blocks.forEach((b) => b.classList.add('in'));
      return undefined;
    }
    blocks.forEach((b) => b.classList.add('reveal'));
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      }
    }, { rootMargin: '0px 0px -8% 0px' });
    blocks.forEach((b) => io.observe(b));

    const hash = window.location.hash;
    if (hash.startsWith('#b-')) {
      const target = el.querySelector(hash.replace(/([:.])/g, '\\$1'));
      if (target) {
        const stop = blocks.indexOf(target);
        blocks.slice(0, stop + 1).forEach((b) => { b.classList.add('in'); io.unobserve(b); });
        requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
      }
    }
    return () => io.disconnect();
  }, [post.slug]);

  useEffect(() => { setMarked(getMarks().some((m) => m.slug === post.slug)); }, [post.slug]);

  const bookmark = () => {
    const el = bodyRef.current?.querySelector('[id^="b-"]');
    addMark({ slug: post.slug, bi: el ? Number(el.id.slice(2)) : 0, snippet: post.title });
    setMarked(true);
  };

  const s = post.seriesNav;

  return (
    <article className="post-layout" lang={post.lang} dir={post.lang === 'fa' ? 'rtl' : 'ltr'}>
      <header className="post-head">
        {s && (
          <div className="kicker">
            <A href={href.series(s.slug)}>{s.title}</A> ــ بخش {s.part} از {s.total}
          </div>
        )}
        <h1>{post.title}</h1>
        <div className="post-meta">
          <time dateTime={post.date.iso}>{post.date.fa}</time>
          <span className="dot" aria-hidden="true" />
          <span>{post.reading.fa}</span>
          {post.updated && <><span className="dot" aria-hidden="true" />
            <span>{T.updatedOn} {post.updated.fa}</span></>}
          {post.draft && <span className="badge">{T.draft}</span>}
        </div>
        <Ornament />
      </header>

      <Toc headings={post.headings} />

      <div ref={bodyRef} className="post-body">
        <Prose doc={post.doc} dropCap={post.dropCap} />
      </div>

      {post.tagLinks?.length > 0 && (
        <div className="post-tags">
          {post.tagLinks.map((t) => (
            <A key={t.slug} className="tag-chip" href={href.tag(t.slug)}>{t.name}</A>
          ))}
        </div>
      )}

      <ShareBar post={post} site={site} />

      <div className="share-bar" style={{ marginTop: '.6rem' }}>
        <button className={`pill${marked ? ' on' : ''}`} onClick={bookmark} disabled={marked}>
          {marked ? T.bookmarked : T.bookmark}
        </button>
      </div>

      {s && (s.prev || s.next) && (
        <nav className="post-nav" aria-label={T.series}>
          {s.next
            ? <A href={href.post(s.next.slug)}>
                <span className="nav-label">{T.nextInSeries}</span>{s.next.title}</A>
            : <span />}
          {s.prev
            ? <A href={href.post(s.prev.slug)} style={{ textAlign: 'end' }}>
                <span className="nav-label">{T.prevInSeries}</span>{s.prev.title}</A>
            : <span />}
        </nav>
      )}

      <Related posts={post.related} />

      <Comments site={site} term={post.slug} settings={settings} />
    </article>
  );
}
