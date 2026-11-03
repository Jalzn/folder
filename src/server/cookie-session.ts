import type { AuthService } from '@tinyfold/auth';
import type { RequestContext } from '@tinyfold/core/infra';
import type { Context } from 'hono';
import { getCookie } from 'hono/cookie';
import { clearedSessionCookie, sessionCookie, sessionCookieName } from './session-cookie.js';
/** Session resolution and renewal are identical for RPC and private files. */
export async function cookieSession(c: Context, auth: AuthService, now: Date, secureCookie: boolean) {
  const token = getCookie(c, sessionCookieName);
  const session = await auth.authenticate(token);
  const setCookies: string[] = [];
  const cookies: RequestContext['cookies'] = {
    setSession: (value, expiry) => setCookies.push(sessionCookie(value, expiry, now, secureCookie)),
    clearSession: () => setCookies.push(clearedSessionCookie(secureCookie)),
  };
  if (session?.renewed && token) cookies.setSession(token, session.expiresAt);
  if (token && !session) cookies.clearSession();
  return { session, cookies, setCookies };
}
