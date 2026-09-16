// entry-server.jsx — the server half of the prerender.
//
// render() is a pure function of (route, data, index): no storage, no window,
// no clock. Everything time-dependent was computed by content.mjs and baked
// into the data, which is exactly what keeps hydration silent.
import { renderToString, renderToStaticMarkup } from 'react-dom/server';
import App from './App.jsx';
import Prose from './components/Prose.jsx';
import { headFor } from './lib/seo.js';

export function render(route, data, index) {
  const html = renderToString(<App index={index} route={route} data={data} />);
  return { html, head: headFor(route, data || {}, index) };
}

/** Just the article body — what a feed reader wants, with no site chrome. */
export function renderBody(post) {
  return renderToStaticMarkup(<Prose doc={post.doc} dropCap={false} />);
}
