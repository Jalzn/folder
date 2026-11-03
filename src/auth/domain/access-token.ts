import type { IsoInstant } from '#core/domain';
import { DomainError } from '#core/domain';

/** Personal access tokens: `tf_mcp_` and 43 base64url characters (32 random bytes). */
export const ACCESS_TOKEN_PREFIX = 'tf_mcp_';
const accessTokenFormat = /^tf_mcp_[A-Za-z0-9_-]{43}$/;
/** Random characters kept after the prefix so the owner can recognize a token in the list. */
const visibleCharacters = 6;

export type AccessTokenScope = 'read';
export const ACCESS_TOKEN_SCOPE: AccessTokenScope = 'read';
export const DEFAULT_ACCESS_TOKEN_NAME = 'Claude Code';
export const MAX_ACTIVE_ACCESS_TOKENS = 10;
/** Recording every call would turn each read into a write; once a minute is enough for the Perfil. */
export const LAST_USE_INTERVAL_MS = 60_000;

export function isAccessTokenFormat(token: string): boolean {
  return accessTokenFormat.test(token);
}

export function accessTokenPrefix(token: string): string {
  return token.slice(0, ACCESS_TOKEN_PREFIX.length + visibleCharacters);
}

export function accessTokenName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 100)
    throw new DomainError('O nome do token precisa ter entre 1 e 100 caracteres.');
  return trimmed;
}

export function assertAccessTokenSlot(activeTokens: number): void {
  if (activeTokens >= MAX_ACTIVE_ACCESS_TOKENS)
    throw new DomainError(`Você já tem ${MAX_ACTIVE_ACCESS_TOKENS} tokens. Revogue um para gerar outro.`);
}

export function shouldRecordUse(lastUsedAt: IsoInstant | null, now: Date): boolean {
  return lastUsedAt === null || now.getTime() - Date.parse(lastUsedAt) >= LAST_USE_INTERVAL_MS;
}
