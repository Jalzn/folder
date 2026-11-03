import type { IsoInstant } from '../domain/instant.js';

declare const transactionScope: unique symbol;

/** A capability for one active transaction; it exposes no database operations. */
export interface TransactionScope {
  readonly [transactionScope]: true;
}

export interface UnitOfWork {
  read<T>(work: (scope: TransactionScope) => Promise<T>): Promise<T>;
  write<T>(operation: string, input: { requestId: string }, work: (scope: TransactionScope) => Promise<T>): Promise<T>;
  writeWithoutRequestRecord<T>(work: (scope: TransactionScope) => Promise<T>): Promise<T>;
}

/** Only the repository ports needed by a use case are delivered to its transaction callback. */
export interface ModuleContext<Repositories extends object> {
  now(): IsoInstant;
  newId(): string;
  read<T>(work: (repositories: Repositories) => Promise<T>): Promise<T>;
  write<T>(
    operation: string,
    input: { requestId: string },
    work: (repositories: Repositories) => Promise<T>,
  ): Promise<T>;
  writeWithoutRequestRecord<T>(work: (repositories: Repositories) => Promise<T>): Promise<T>;
}
