import type { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
export function mountSecurityHeaders(app: Hono) {
  app.use(
    '*',
    secureHeaders({
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
      referrerPolicy: 'no-referrer',
      xFrameOptions: 'DENY',
    }),
  );
}
