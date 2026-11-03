import { randomUUID } from 'node:crypto';
import { type Database, writeTransaction } from '@tinyfold/core/infra';
import {
  type AccessTokenDeps,
  authenticateAccessToken,
  createAccessToken,
  listAccessTokens,
  revokeAccessToken,
} from '../application/access-tokens/index.js';
import { accessTokenRepository } from './access-token-repository.js';
import { accessTokenSecrets } from './access-token-secrets.js';

export interface AccessTokenOptions {
  clock?: () => Date;
  logError?: (error: unknown) => void;
}

/** Personal access tokens for agents such as Claude Code, bound to this database. */
export function createAccessTokens(db: Database, options: AccessTokenOptions = {}) {
  const deps: AccessTokenDeps = {
    store: accessTokenRepository(db),
    transaction: (work) => writeTransaction(db, (trx) => work(accessTokenRepository(trx))),
    secrets: accessTokenSecrets,
    id: randomUUID,
    now: options.clock ?? (() => new Date()),
    logError: options.logError ?? console.error,
  };
  return {
    list: () => listAccessTokens(deps),
    create: (input: { name: string }) => createAccessToken(deps, input),
    revoke: (input: { id: string }) => revokeAccessToken(deps, input),
    authenticate: (token: string | undefined) => authenticateAccessToken(deps, token),
  };
}

export type AccessTokenService = ReturnType<typeof createAccessTokens>;
