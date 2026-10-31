import type { AccessTokenScope } from '../../domain/access-token.js';

/** What the owner sees in the Perfil. The secret is shown once on creation and never stored. */
export interface AccessToken {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
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
  touch(id: string, usedAt: string): Promise<void>;
  delete(id: string): Promise<void>;
  deleteAll(): Promise<void>;
}

export interface AccessTokenSecrets {
  /** A new random token; only its digest is stored. */
  create(): { token: string; digest: string };
  digest(token: string): string;
  isWellFormed(token: string): boolean;
}

export interface AccessTokenDeps {
  read: AccessTokenRepository;
  transaction<T>(work: (repository: AccessTokenRepository) => Promise<T>): Promise<T>;
  secrets: AccessTokenSecrets;
  id(): string;
  now(): Date;
  /** Receives failures that must not interrupt the request, such as recording the last use. */
  logError(error: unknown): void;
}
