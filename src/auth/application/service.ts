import type { AuthContext, AuthDependencies } from './ports.js';
import { authProfile } from './profile.js';

export { DEFAULT_TIME_ZONE } from './time-zone.js';

import { authenticate } from './authenticate.js';
import { changePassword } from './change-password.js';
import { ensureOwner } from './ensure-owner.js';
import { listSessions } from './list-sessions.js';
import { login } from './login.js';
import { logout } from './logout.js';
import { resetPassword } from './reset-password.js';
import { revokeOtherSessions } from './revoke-other-sessions.js';
import { revokeSession } from './revoke-session.js';
import { setTimeZone } from './set-time-zone.js';
import { timeZone } from './time-zone.js';
export function authService(deps: AuthDependencies) {
  const ctx: AuthContext = { ...deps, ...authProfile(deps) };
  return {
    ensureOwner: ensureOwner.bind(null, ctx),
    login: login.bind(null, ctx),
    authenticate: authenticate.bind(null, ctx),
    changePassword: changePassword.bind(null, ctx),
    resetPassword: resetPassword.bind(null, ctx),
    setTimeZone: setTimeZone.bind(null, ctx),
    timeZone: timeZone.bind(null, ctx),
    logout: logout.bind(null, ctx),
    listSessions: listSessions.bind(null, ctx),
    revokeSession: revokeSession.bind(null, ctx),
    revokeOtherSessions: revokeOtherSessions.bind(null, ctx),
  };
}
export type AuthService = ReturnType<typeof authService>;
