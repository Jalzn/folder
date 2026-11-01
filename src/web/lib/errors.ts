/** An action the app itself refuses, with a message for the person; errorMessage shows it as it is. */
export class Refusal extends Error {
  readonly code = 'REFUSED';
}

/** A failure's code: the server's, inside `data`, or the error's own. */
export function errorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const value = error as { data?: { code?: string }; code?: string };
  return value.data?.code ?? value.code;
}

export function errorMessage(error: unknown): string {
  const code = errorCode(error);
  if (code === 'UNAUTHENTICATED' || code === 'UNAUTHORIZED')
    return 'Sua sessão expirou. Entre novamente para continuar.';
  if (code === 'VERSION_CONFLICT' || code === 'CONFLICT')
    return 'Este item mudou em outro dispositivo. Atualizamos os dados; confira e tente novamente.';
  if (error instanceof Error && code && !['INTERNAL_SERVER_ERROR', 'UNKNOWN'].includes(code)) return error.message;
  return 'Não foi possível conectar. Confira sua conexão e tente novamente.';
}
