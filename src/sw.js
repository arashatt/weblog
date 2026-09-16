// sw.js — offline support for a prerendered site.
//
// The book site served its single app shell for every navigation. That rule is
// exactly wrong here: each URL now has its own prerendered HTML carrying its
// own <title> and social card, so navigations are cached per URL instead.
//
// The two placeholders below are substituted by src/build/sw.mjs at build
// time. Do not name them anywhere else in this file — the substitution is a
// plain string replace, and a mention inside a comment gets replaced too,
// which splices a multi-line JSON array into a // comment.

const VERSION = '__VERSION__';
const SHELL = __SHELL__;

const SHELL_CACHE = `weblog-shell-${VERSION}`;
const PAGE_CACHE = 'weblog-pages';
const DATA_CACHE = 'weblog-data';

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(SHELL_CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith('weblog-shell-') && k !== SHELL_CACHE)
          .map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'skip-waiting') self.skipWaiting();
});

const cacheFirst = async (req, cacheName) => {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
};

const staleWhileRevalidate = async (req, cacheName) => {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const net = fetch(req).then((res) => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => null);
  return hit || net || fetch(req);
};

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  // Google Fonts: cache-first, they are immutable in practice
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(cacheFirst(request, DATA_CACHE));
    return;
  }
  if (!sameOrigin) return;

  // hashed build output never changes under its name
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/media/')) {
    e.respondWith(staleWhileRevalidate(request, DATA_CACHE));
    return;
  }

  // Navigations: network first so a fresh build wins, then this URL's own
  // cached page, then the offline notice. Never another page's HTML.
  if (request.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const res = await fetch(request);
        if (res.ok) {
          const cache = await caches.open(PAGE_CACHE);
          cache.put(request, res.clone());
        }
        return res;
      } catch {
        const cache = await caches.open(PAGE_CACHE);
        const hit = await cache.match(request) || await cache.match(new URL('/', self.location).href);
        if (hit) return hit;
        return new Response(
          '<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8">'
          + '<title>بی‌اینترنت</title>'
          + '<body style="font-family:serif;text-align:center;padding:4rem 1.5rem;line-height:2">'
          + '<p>این صفحه هنوز ذخیره نشده و اینترنت در دسترس نیست.</p>'
          + '<p><a href="/">بازگشت به خانه</a></p>',
          { headers: { 'content-type': 'text/html; charset=utf-8' }, status: 503 },
        );
      }
    })());
  }
});
