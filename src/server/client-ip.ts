import { getConnInfo } from '@hono/node-server/conninfo';
import type { Context } from 'hono';

/** The caller's address, taken from the last proxy hop only when the proxy is trusted. */
export function clientIp(c: Context, trustProxy: boolean): string {
  if (trustProxy) {
    const ip = c.req.header('x-forwarded-for')?.split(',').at(-1)?.trim();
    if (ip) return ip;
  }
  try {
    return getConnInfo(c).remote.address ?? 'unknown';
  } catch {
    return 'unknown';
  }
}
