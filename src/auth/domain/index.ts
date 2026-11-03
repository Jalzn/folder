import { DomainError, visibleText } from '@tinyfold/core/domain';

export * from './access-token.js';

export const sessionLifetimeMs = 30 * 86_400_000;
export const renewalIntervalMs = 86_400_000;

export const PASSWORD_LIMITS = { min: 12, max: 256 } as const;

export function validatePassword(password: string): void {
  if (password.length < PASSWORD_LIMITS.min || password.length > PASSWORD_LIMITS.max)
    throw new DomainError('A senha precisa ter entre 12 e 256 caracteres.');
}

export function deviceLabel(userAgent: string | undefined): string {
  const ua = userAgent ?? '';
  const browser = deviceMatch(
    ua,
    [
      [/Edg\//, 'Edge'],
      [/Firefox\//, 'Firefox'],
      [/Chrome\//, 'Chrome'],
      [/Safari\//, 'Safari'],
    ],
    'Navegador',
  );
  const system = deviceMatch(
    ua,
    [
      [/Android/, 'Android'],
      [/iPhone|iPad/, 'iOS'],
      [/Windows/, 'Windows'],
      [/Macintosh/, 'macOS'],
      [/Linux/, 'Linux'],
    ],
    'Dispositivo',
  );
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

const deviceMatch = (ua: string, table: readonly (readonly [RegExp, string])[], fallback: string): string =>
  table.find(([pattern]) => pattern.test(ua))?.[1] ?? fallback;
export const isOffset = (timeZone: string): boolean => /^\s*[+-]/u.test(timeZone);
