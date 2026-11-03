import { toIsoInstant } from '@tinyfold/core/domain';
import {
  ACCESS_TOKEN_SCOPE,
  accessTokenName,
  accessTokenPrefix,
  assertAccessTokenSlot,
} from '../../domain/access-token.js';
import { accessTokenView } from './list-access-tokens.js';
import type { AccessToken, AccessTokenDeps, AccessTokenRecord } from './ports.js';

export interface CreatedAccessToken {
  /** The only time the secret leaves the server. */
  token: string;
  accessToken: AccessToken;
}

/**
 * Not an idempotent write on purpose: the retry record would keep the secret in plain text for
 * 30 days. A lost response leaves an orphan token in the list, which the owner can revoke.
 */
export async function createAccessToken(deps: AccessTokenDeps, input: { name: string }): Promise<CreatedAccessToken> {
  const name = accessTokenName(input.name);
  const { token, digest } = deps.secrets.create();
  const record: AccessTokenRecord = {
    id: deps.id(),
    name,
    prefix: accessTokenPrefix(token),
    scope: ACCESS_TOKEN_SCOPE,
    createdAt: toIsoInstant(deps.now()),
    lastUsedAt: null,
  };
  await deps.transaction(async (repository) => {
    assertAccessTokenSlot(await repository.countActive());
    await repository.insert(record, digest);
  });
  return { token, accessToken: accessTokenView(record) };
}
