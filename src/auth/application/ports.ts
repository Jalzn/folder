import type { Owner } from '#core/application';
import type { IsoInstant } from '#core/domain';
import type { TokenSecrets } from './token-secrets.js';

export interface StoredOwner extends Owner {
  passwordHash: string;
  passwordChangedAt: IsoInstant;
}
export interface StoredSession {
  id: string;
  digest: string;
  deviceLabel: string;
  createdAt: IsoInstant;
  lastUsedAt: IsoInstant;
  expiresAt: IsoInstant;
}
export interface AuthRepository {
  owner(): Promise<StoredOwner | undefined>;
  createOwner(owner: StoredOwner): Promise<void>;
  updatePassword(hash: string, changedAt: IsoInstant): Promise<void>;
  setTimeZone(timeZone: string): Promise<void>;
  session(digest: string): Promise<StoredSession | undefined>;
  createSession(session: StoredSession): Promise<void>;
  renewSession(id: string, usedAt: IsoInstant, expiresAt: IsoInstant): Promise<void>;
  deleteSession(id: string): Promise<void>;
  deleteSessionsExcept(id?: string): Promise<void>;
  listSessions(now: IsoInstant): Promise<StoredSession[]>;
  deleteExpiredSessions(now: IsoInstant): Promise<void>;
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
