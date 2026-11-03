import type { IsoInstant } from '#core/domain';
import type { AccessTokenScope } from '../../domain/access-token.js';
import type { TokenSecrets } from '../token-secrets.js';

/** What the owner sees in the Perfil. The secret is shown once on creation and never stored. */
export interface AccessToken {
  id: string;
  name: string;
  prefix: string;
  createdAt: IsoInstant;
  lastUsedAt: IsoInstant | null;
}

export interface AccessTokenRecord extends AccessToken {
  scope: AccessTokenScope;
}

export interface AccessTokenRepository {
  insert(token: AccessTokenRecord, digest: string): Promise<void>;
  findByDigest(digest: string): Promise<AccessTokenRecord | undefined>;
  /** Newest first. */
  list(): Promise<AccessTokenRecord[]>;
  countActive(): Promise<number>;
  touch(id: string, usedAt: IsoInstant): Promise<void>;
  delete(id: string): Promise<void>;
  /** Used by the terminal password reset, in its own transaction. */
  deleteAll(): Promise<void>;
}

export type AccessTokenSecrets = TokenSecrets;

export interface AccessTokenDeps {
  /** Autocommit access; multi-step invariants use transaction. */
  store: AccessTokenRepository;
  transaction<T>(work: (repository: AccessTokenRepository) => Promise<T>): Promise<T>;
  secrets: AccessTokenSecrets;
  id(): string;
  now(): Date;
  /** Receives failures that must not interrupt the request, such as recording the last use. */
  logError(error: unknown): void;
}
