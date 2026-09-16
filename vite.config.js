import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev-only: serve the same /api/*.json the prerenderer emits, straight from
// content/. Without this the dev server and the built site would disagree
// about where data comes from, which is exactly how drift starts.
function devContent() {
  let cache = null;
  return {
    name: 'weblog-dev-content',
    apply: 'serve',
    configureServer(server) {
      const load = async () => {
        if (cache) return cache;
        const { loadContent } = await server.ssrLoadModule('/src/build/content.mjs');
        cache = await loadContent({ includeDrafts: true });
        return cache;
      };
      server.watcher.add('content');
      server.watcher.on('all', (_e, file) => {
        if (String(file).includes('/content/')) {
          cache = null;
          server.ws.send({ type: 'full-reload' });
        }
      });

      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();
        try {
          const c = await load();
          const { buildIndex, apiPayloads } = await server.ssrLoadModule('/src/build/payloads.mjs');
          const index = buildIndex(c);
          const files = apiPayloads(c, index);
          const key = req.url.split('?')[0];
          const body = files[key];
          if (body === undefined) { res.statusCode = 404; return res.end('{}'); }
          res.setHeader('content-type', 'application/json; charset=utf-8');
          return res.end(body);
        } catch (err) {
          res.statusCode = 500;
          return res.end(JSON.stringify({ error: String(err && err.stack || err) }));
        }
      });
    },
  };
}

export default defineConfig({
  base: '/',
  plugins: [react(), devContent()],
  build: {
    outDir: 'dist',
    assetsInlineLimit: 2048,
  },
  esbuild: { legalComments: 'none' },
});
