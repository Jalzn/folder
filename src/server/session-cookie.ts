export const sessionCookieName = 'tinyfold_session';
const flags = (secure: boolean) => ['Path=/', 'HttpOnly', 'SameSite=Strict', ...(secure ? ['Secure'] : [])];
export function sessionCookie(token: string, expiresAt: Date, now: Date, secure: boolean): string {
  return [
    `${sessionCookieName}=${token}`,
    ...flags(secure),
    `Max-Age=${Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000))}`,
  ].join('; ');
}
export function clearedSessionCookie(secure: boolean): string {
  return [`${sessionCookieName}=`, ...flags(secure), 'Max-Age=0'].join('; ');
}
