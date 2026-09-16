// main.jsx — hydrate what the prerender wrote, or mount fresh in dev.
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App.jsx';
import { match } from './lib/router.jsx';
import { buildData, needsDoc, docUrl } from './lib/resolve.js';
import { registerServiceWorker } from './lib/pwa.js';
import './styles/index.css';

const el = document.getElementById('root');

function readInline() {
  const tag = document.getElementById('__DATA__');
  if (!tag) return null;
  try { return JSON.parse(tag.textContent); } catch { return null; }
}

async function boot() {
  const inline = readInline();

  if (inline && el.childElementCount > 0) {
    // Prerendered: the tree on screen already matches these props exactly.
    hydrateRoot(el, <App index={inline.index} route={inline.route} data={inline.data} />);
  } else {
    // Dev server, or a page served without prerendering: fetch and mount.
    const index = inline?.index || await fetch('/api/index.json').then((r) => r.json());
    const route = match(window.location.pathname);
    const doc = needsDoc(route)
      ? await fetch(docUrl(route)).then((r) => (r.ok ? r.json() : null)).catch(() => null)
      : null;
    createRoot(el).render(<App index={index} route={route} data={buildData(route, index, doc)} />);
  }

  if (import.meta.env.PROD) registerServiceWorker();
}

boot();
