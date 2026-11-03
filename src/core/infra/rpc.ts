import { ORPCError, os, ValidationError } from '@orpc/server';
import { AppError } from '../application/index.js';
import { DomainError } from '../domain/index.js';
import type { RequestContext } from './rpc-context.js';
import { toORPCError, validationMessage } from './rpc-errors.js';

export type { RequestContext, RequestSession } from './rpc-context.js';
export { httpStatusOf } from './rpc-errors.js';

const base = os.$context<RequestContext>();
export const originGuard = base.middleware(({ context, next }) => {
  if (!context.originAllowed)
    throw toORPCError(new AppError('FORBIDDEN_ORIGIN', 'A origem desta solicitação não é permitida.'));
  return next();
});
export const appErrors = base.middleware(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error instanceof AppError) throw toORPCError(error);
    if (error instanceof DomainError) throw toORPCError(new AppError('DOMAIN_RULE', error.message));
    if (error instanceof ORPCError && error.cause instanceof ValidationError)
      throw toORPCError(new AppError('VALIDATION', validationMessage(error.cause)));
    throw error;
  }
});
export const publicProcedure = base.use(originGuard).use(appErrors);
export const pub = publicProcedure;
export const authedProcedure = publicProcedure.use(({ context, next }) => {
  if (!context.session) throw toORPCError(new AppError('UNAUTHENTICATED', 'Sua sessão terminou. Entre de novo.'));
  return next({ context: { session: context.session } });
});
/** Converts the validated multipart file at the transport boundary. */
export const fileUpload = async (file: { arrayBuffer(): Promise<ArrayBuffer> }): Promise<Uint8Array<ArrayBuffer>> =>
  new Uint8Array(await file.arrayBuffer());
