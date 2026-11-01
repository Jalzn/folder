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

export interface Owner {
  name: string;
  installationId: string;
  /** The IANA time zone civil dates hold in; null until the first load sets the browser's. */
  timeZone: string | null;
}
