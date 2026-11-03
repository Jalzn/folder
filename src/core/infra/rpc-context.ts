import type { Owner } from '../application/index.js';

export interface RequestSession {
  owner: Owner;
  sessionId: string;
}
export interface RequestContext {
  originAllowed: boolean;
  session: RequestSession | undefined;
  client: { ip: string; userAgent: string | undefined };
  cookies: { setSession(token: string, expiresAt: Date): void; clearSession(): void };
}
