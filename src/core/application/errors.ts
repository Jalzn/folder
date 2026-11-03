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

const domainMessages = new Set<string>();

/**
 * A sentence an input schema shows the person when one of its checks fails, written for them in
 * Portuguese, as in `z.string().min(1, domainMessage('Escreva um título.'))`. The RPC answers a
 * validation error with the first such sentence, and with its generic text when there is none: Zod's
 * own messages are written for developers.
 */
export function domainMessage(message: string): string {
  domainMessages.add(message);
  return message;
}

/** An issue that carries a sentence of the domain's validators, which varies with the content checked. */
export const domainIssue = (message: string) => ({ code: 'custom' as const, message, params: { domainMessage: true } });

/** Whether a schema issue carries a sentence for the person, from domainMessage or domainIssue. */
export function isDomainIssue(issue: { readonly message: string }): boolean {
  const { params } = issue as { params?: { domainMessage?: unknown } };
  return params?.domainMessage === true || domainMessages.has(issue.message);
}

export interface Owner {
  name: string;
  installationId: string;
  /** The IANA time zone civil dates hold in; null until the first load sets the browser's. */
  timeZone: string | null;
}
