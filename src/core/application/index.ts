export type ErrorCode =
  | 'VALIDATION'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN_ORIGIN'
  | 'NOT_FOUND'
  | 'VERSION_CONFLICT'
  | 'REQUEST_REUSED'
  | 'DOMAIN_RULE'
  | 'RATE_LIMITED';

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * An input schema's issue that carries a domain rule's sentence, already written for the person: the
 * RPC answers a validation error with it instead of the generic text.
 */
export const domainIssue = (message: string) => ({ code: 'custom' as const, message, params: { domainMessage: true } });

export interface Owner {
  name: string;
  installationId: string;
  /** The IANA time zone civil dates hold in; null until the first load sets the browser's. */
  timeZone: string | null;
}
