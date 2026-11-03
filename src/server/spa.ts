import { serveStatic } from '@hono/node-server/serve-static';
import type { Hono } from 'hono';
export function mountSpa(app: Hono, webDir: string | undefined) {
  if (webDir) {
    app.use('*', async (c, next) => {
      await next();
      if (c.res.ok)
        c.header(
          'Cache-Control',
          c.req.path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
        );
    });
    app.use('*', serveStatic({ root: webDir }));
    app.get(
      '*',
      async (c, next) => (/\.[^/]+$/.test(c.req.path) ? c.notFound() : next()),
      serveStatic({ root: webDir, path: 'index.html' }),
    );
  }
}
