import { ORPCError, os, ValidationError } from '@orpc/server';
import { AppError, type ErrorCode, type Owner } from '../application/index.js';
import { DomainError } from '../domain/index.js';
import type { Database } from './db.js';

export interface RequestSession {
  owner: Owner;
  sessionId: string;
  token: string;
}
export interface RequestContext {
  db: Database;
  now: Date;
  originAllowed: boolean;
  session: RequestSession | undefined;
  client: { ip: string; userAgent: string | undefined };
  cookies: { setSession(token: string, expiresAt: Date): void; clearSession(): void };
}

const statuses: Record<ErrorCode, [string, number]> = {
  VALIDATION: ['BAD_REQUEST', 400],
  UNAUTHENTICATED: ['UNAUTHORIZED', 401],
  FORBIDDEN_ORIGIN: ['FORBIDDEN', 403],
  NOT_FOUND: ['NOT_FOUND', 404],
  VERSION_CONFLICT: ['CONFLICT', 409],
  REQUEST_REUSED: ['CONFLICT', 409],
  DOMAIN_RULE: ['UNPROCESSABLE_CONTENT', 422],
  RATE_LIMITED: ['TOO_MANY_REQUESTS', 429],
};
export function toORPCError(error: AppError) {
  const [code, status] = statuses[error.code];
  return new ORPCError(code, { status, message: error.message, data: { code: error.code } });
}
const base = os.$context<RequestContext>();
export const pub = base.use(async ({ context, next }) => {
  if (!context.originAllowed)
    throw toORPCError(new AppError('FORBIDDEN_ORIGIN', 'A origem desta solicitação não é permitida.'));
  try {
    return await next();
  } catch (error) {
    if (error instanceof AppError) throw toORPCError(error);
    if (error instanceof DomainError)
      throw toORPCError(new AppError(error.conflict ? 'VERSION_CONFLICT' : 'DOMAIN_RULE', error.message));
    if (error instanceof ORPCError && error.cause instanceof ValidationError)
      throw toORPCError(new AppError('VALIDATION', 'Revise os dados enviados e tente de novo.'));
    throw error;
  }
});
export const authedProcedure = pub.use(({ context, next }) => {
  if (!context.session) throw toORPCError(new AppError('UNAUTHENTICATED', 'Sua sessão terminou. Entre de novo.'));
  return next({ context: { session: context.session } });
});
export const authed = authedProcedure;
