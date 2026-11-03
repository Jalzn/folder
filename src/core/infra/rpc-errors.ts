import { ORPCError, type ValidationError } from '@orpc/server';
import { type AppError, type ErrorCode, isDomainIssue } from '../application/index.js';

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
/** The first sentence for the person the input schema carried (isDomainIssue), or the generic text. */
export function validationMessage(error: ValidationError): string {
  return error.issues.find(isDomainIssue)?.message ?? 'Revise os dados enviados e tente de novo.';
}
export const httpStatusOf = (code: ErrorCode): number => statuses[code][1];
