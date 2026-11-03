export interface TokenSecrets {
  /** A new random token; only its digest is stored. */
  create(): { token: string; digest: string };
  digest(token: string): string;
  isWellFormed(token: string): boolean;
}
