import type { AccessToken, AccessTokenDeps, AccessTokenRecord } from './ports.js';

export const accessTokenView = ({ id, name, prefix, createdAt, lastUsedAt }: AccessTokenRecord): AccessToken => ({
  id,
  name,
  prefix,
  createdAt,
  lastUsedAt,
});

export async function listAccessTokens(deps: AccessTokenDeps): Promise<AccessToken[]> {
  return (await deps.read.list()).map(accessTokenView);
}
