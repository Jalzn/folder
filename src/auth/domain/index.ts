import { DomainError } from '@tinyfold/core/domain';

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
