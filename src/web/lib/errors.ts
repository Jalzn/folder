/** An action the app itself refuses, with a message for the person; errorMessage shows it as it is. */
export class Refusal extends Error {
  readonly code = 'REFUSED';
}
