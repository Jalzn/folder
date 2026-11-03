import { z } from 'zod';
import { authedProcedure, pub } from '#core/infra';
import type { AuthService } from '../application/service.js';
import { PASSWORD_LIMITS } from '../domain/index.js';
import type { AccessTokenService } from './access-tokens.js';

export function createAuthRouter(auth: AuthService, accessTokens: AccessTokenService) {
  return {
    login: pub
      .input(z.object({ password: z.string().min(1).max(PASSWORD_LIMITS.max) }))
      .handler(async ({ input, context }) => {
        const result = await auth.login(input, context.client);
        context.cookies.setSession(result.token, result.expiresAt);
        return { owner: result.owner };
      }),
    session: authedProcedure.handler(({ context }) => ({
      owner: context.session.owner,
      sessionId: context.session.sessionId,
    })),
    logout: authedProcedure.handler(async ({ context }) => {
      const result = await auth.logout(context.session.sessionId);
      context.cookies.clearSession();
      return result;
    }),
    changePassword: authedProcedure
      .input(
        z.object({
          currentPassword: z.string().max(PASSWORD_LIMITS.max),
          newPassword: z.string().min(PASSWORD_LIMITS.min).max(PASSWORD_LIMITS.max),
        }),
      )
      .handler(({ input, context }) => auth.changePassword(context.session.sessionId, input)),
    listSessions: authedProcedure.handler(({ context }) => auth.listSessions(context.session.sessionId)),
    /** The owner's time zone; repeatable, with no requestId. */
    setTimeZone: authedProcedure
      .input(z.object({ timeZone: z.string().min(1).max(64) }))
      .handler(({ input }) => auth.setTimeZone(input.timeZone)),
    revokeSession: authedProcedure
      .input(z.object({ sessionId: z.uuid() }))
      .handler(({ input, context }) => auth.revokeSession(context.session.sessionId, input.sessionId)),
    revokeOtherSessions: authedProcedure.handler(({ context }) => auth.revokeOtherSessions(context.session.sessionId)),
    listAccessTokens: authedProcedure.handler(() => accessTokens.list()),
    createAccessToken: authedProcedure
      .input(z.object({ name: z.string().max(300) }))
      .handler(({ input }) => accessTokens.create(input)),
    revokeAccessToken: authedProcedure
      .input(z.object({ id: z.uuid() }))
      .handler(({ input }) => accessTokens.revoke(input)),
  };
}
