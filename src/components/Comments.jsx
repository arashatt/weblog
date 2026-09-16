// Comments.jsx — giscus, behind a button.
//
// Click-to-load keeps a third-party script off ~95% of page views: no layout
// shift, no request until someone actually wants the thread. The theme follows
// روز/کاهی/شب by postMessage, the way giscus expects.
import { useEffect, useRef, useState } from 'react';
import { T } from '../lib/strings.js';
import { resolveTheme } from '../lib/store.js';

const giscusTheme = (theme) => ({
  day: 'light', sepia: 'light_high_contrast', night: 'dark_dimmed',
}[theme] || 'light');

export default function Comments({ site, term, settings }) {
  const cfg = site.giscus;
  const box = useRef(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (!on || !box.current || box.current.childElementCount) return;
    const s = document.createElement('script');
    s.src = 'https://giscus.app/client.js';
    s.async = true;
    s.crossOrigin = 'anonymous';
    Object.entries({
      'data-repo': cfg.repo,
      'data-repo-id': cfg.repoId,
      'data-category': cfg.category,
      'data-category-id': cfg.categoryId,
      'data-mapping': 'specific',
      'data-term': term,
      'data-reactions-enabled': '1',
      'data-emit-metadata': '0',
      'data-input-position': 'top',
      'data-theme': giscusTheme(resolveTheme(settings.theme)),
      'data-lang': 'fa',
      'data-loading': 'lazy',
    }).forEach(([k, v]) => s.setAttribute(k, v));
    box.current.appendChild(s);
  }, [on, cfg, term, settings.theme]);

  // theme changes reach the already-loaded iframe without reloading it
  useEffect(() => {
    if (!on) return;
    const frame = document.querySelector('iframe.giscus-frame');
    frame?.contentWindow?.postMessage(
      { giscus: { setConfig: { theme: giscusTheme(resolveTheme(settings.theme)) } } },
      'https://giscus.app',
    );
  }, [settings.theme, on]);

  if (!cfg?.enabled || !cfg.repoId || !cfg.categoryId) return null;

  return (
    <section className="comments">
      <h2 className="section-head">{T.comments}</h2>
      {!on
        ? <div className="comments-cta"><button className="pill" onClick={() => setOn(true)}>{T.loadComments}</button></div>
        : <div ref={box} />}
    </section>
  );
}
