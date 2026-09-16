// sw.mjs — emit dist/sw.js with the shell list and a content-derived version.
//
// The book site emitted this from a Vite plugin in generateBundle, before any
// page existed. Here it runs after prerender, so the version can include the
// posts digest: a content-only change bumps it and readers get the update pill,
// which a bundle-only hash could never notice.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const STATIC_SHELL = [
  '/', '/manifest.webmanifest',
  '/icons/icon.svg', '/icons/icon-192.png', '/icons/icon-512.png',
  '/icons/maskable-192.png', '/icons/maskable-512.png', '/icons/apple-touch-icon.png',
  '/api/index.json',
];

export function writeServiceWorker({ dist, srcSw, contentDigest }) {
  const assetsDir = path.join(dist, 'assets');
  const hashed = existsSync(assetsDir)
    ? readdirSync(assetsDir).filter((f) => !f.endsWith('.map')).sort().map((f) => `/assets/${f}`)
    : [];
  const shell = [...STATIC_SHELL.filter((p) => p === '/' || p.startsWith('/api/') || existsSync(path.join(dist, p.slice(1)))), ...hashed];

  const source = readFileSync(srcSw, 'utf8');
  const version = createHash('sha256')
    .update(source).update(shell.join('\n')).update(contentDigest)
    .digest('hex').slice(0, 12);

  writeFileSync(
    path.join(dist, 'sw.js'),
    // replaceAll, not replace: both placeholders are also named in sw.js's own
    // header comment, and a first-occurrence replace would substitute the
    // comment and leave the real constants intact.
    source.replaceAll('__VERSION__', version).replaceAll('__SHELL__', JSON.stringify(shell, null, 2)),
  );
  return { version, shell };
}
