import { DomainError, visibleText } from '@tinyfold/core/domain';

export * from './access-token.js';

export const sessionLifetimeMs = 30 * 86_400_000;
export const renewalIntervalMs = 86_400_000;

export function validatePassword(password: string): void {
  if (password.length < 12 || password.length > 256)
    throw new DomainError('A senha precisa ter entre 12 e 256 caracteres.');
}

export function deviceLabel(userAgent: string | undefined): string {
  const ua = userAgent ?? '';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Firefox\//.test(ua)
      ? 'Firefox'
      : /Chrome\//.test(ua)
        ? 'Chrome'
        : /Safari\//.test(ua)
          ? 'Safari'
          : 'Navegador';
  const system = /Android/.test(ua)
    ? 'Android'
    : /iPhone|iPad/.test(ua)
      ? 'iOS'
      : /Windows/.test(ua)
        ? 'Windows'
        : /Macintosh/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : 'Dispositivo';
  return `${browser} · ${system}`;
}

/** The owner's name: at most 100 characters (code points), without what draws nothing. */
export const OWNER_NAME_CHARS = 100;

/**
 * The owner's name as stored: visible text only (visibleText, the rule of the workspace's names and
 * titles), cut at OWNER_NAME_CHARS code points so that no emoji is split, and "Você" when nothing is left.
 */
export function ownerName(raw: string): string {
  return visibleText(Array.from(visibleText(raw)).slice(0, OWNER_NAME_CHARS).join('')) || 'Você';
}
