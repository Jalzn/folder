import type { AuthService } from '@tinyfold/auth';
import { AppError } from '@tinyfold/core/application';
import type { Hono } from 'hono';
import { cookieSession } from '../cookie-session.js';
import type { WorkspaceFiles } from '../workspace/index.js';

export interface CanvasPreviewRouteOptions {
  auth: AuthService;
  files: WorkspaceFiles;
  secureCookie: boolean;
  clock: () => Date;
}

/** Whether `If-None-Match` names the tag: a list, weak tags compared as strong, or `*`. */
function matches(ifNoneMatch: string | undefined, etag: string): boolean {
  if (!ifNoneMatch) return false;
  return ifNoneMatch.split(',').some((tag) => {
    const value = tag.trim();
    return value === '*' || value.replace(/^W\//u, '') === etag;
  });
}

const cacheHeaders = (etag: string) => ({
  ETag: etag,
  // Private to the session's browser, and revalidated on every use: never an older scene.
  'Cache-Control': 'private, no-cache',
  'X-Content-Type-Options': 'nosniff',
});

/**
 * GET /arquivos/desenhos/:id/previa.png: a live drawing's stored PNG preview, for the figures of a
 * document (stage 11, decisions 4 and 5). A same-origin read without side effects: it needs the
 * session cookie, as /rpc does, but no origin check, and never takes an MCP bearer. The ETag follows
 * the scene the image shows, with 304 for If-None-Match. A drawing in the trash, deleted, never there
 * or without a preview is 404; an ID that is no UUID is 400. Mounted before the SPA fallback.
 */
export function mountCanvasPreviewRoute(app: Hono, { auth, files, secureCookie, clock }: CanvasPreviewRouteOptions) {
  app.get('/arquivos/desenhos/:id/previa.png', async (c) => {
    const { session, setCookies } = await cookieSession(c, auth, clock(), secureCookie);
    for (const value of setCookies) c.header('Set-Cookie', value, { append: true });
    if (!session) {
      c.header('Cache-Control', 'no-store');
      return c.json({ message: 'Sua sessão terminou. Entre de novo.' }, 401);
    }
    let image: Awaited<ReturnType<WorkspaceFiles['canvasPreview']>>;
    try {
      image = await files.canvasPreview(c.req.param('id'));
    } catch (error) {
      if (error instanceof AppError && error.code === 'VALIDATION') {
        c.header('Cache-Control', 'no-store');
        return c.json({ message: error.message }, 400);
      }
      throw error;
    }
    if (!image) {
      c.header('Cache-Control', 'no-store');
      return c.json({ message: 'A prévia do desenho não está disponível.' }, 404);
    }
    if (matches(c.req.header('if-none-match'), image.etag)) return c.body(null, 304, cacheHeaders(image.etag));
    // The BLOB's bytes are a plain ArrayBuffer; the type only says better-sqlite3 could share one.
    return c.body(image.png as Uint8Array<ArrayBuffer>, 200, {
      'Content-Type': 'image/png',
      ...cacheHeaders(image.etag),
    });
  });
}
