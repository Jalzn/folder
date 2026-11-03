import type { Owner } from '@tinyfold/core/application';
import type { TokenSecrets } from './token-secrets.js';

export interface StoredOwner extends Owner {
  passwordHash: string;
  passwordChangedAt: string;
}
export interface StoredSession {
  id: string;
  digest: string;
  deviceLabel: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
}
export interface AuthRepository {
  owner(): Promise<StoredOwner | undefined>;
  createOwner(owner: StoredOwner): Promise<void>;
  updatePassword(hash: string, changedAt: string): Promise<void>;
  setTimeZone(timeZone: string): Promise<void>;
  session(digest: string): Promise<StoredSession | undefined>;
  createSession(session: StoredSession): Promise<void>;
  renewSession(id: string, usedAt: string, expiresAt: string): Promise<void>;
  deleteSession(id: string): Promise<void>;
  deleteSessionsExcept(id?: string): Promise<void>;
  listSessions(now: string): Promise<StoredSession[]>;
  deleteExpiredSessions(now: string): Promise<void>;
  /** Revokes every personal access token, as recovering a compromised account requires. */
  deleteAccessTokens(): Promise<void>;
}
export interface LoginThrottle {
  check(ip: string, now: number): void;
}
export interface AuthDependencies {
  /** Autocommit access; multi-step invariants use transaction. */
  store: AuthRepository;
  transaction<T>(work: (repo: AuthRepository) => Promise<T>): Promise<T>;
  password: { hash(value: string): Promise<string>; verify(value: string, encoded: string): Promise<boolean> };
  tokens: TokenSecrets;
  id(): string;
  now(): Date;
  throttle: LoginThrottle;
  /** Receives what the service works around but someone should repair, such as a bad stored zone. */
  warn(message: string): void;
}

export interface AuthContext extends AuthDependencies {
  profile(owner: StoredOwner): Owner;
  storedZone(owner: StoredOwner): string | null;
}
