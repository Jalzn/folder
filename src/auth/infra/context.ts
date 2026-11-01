import { randomUUID } from 'node:crypto';
import { type Database, writeTransaction } from '@tinyfold/core/infra';
import type { LoginThrottle } from '../application/ports.js';
import { authService } from '../application/service.js';
import { authRepository } from './repository.js';
import { createLoginThrottle, passwordHasher, sessionTokens } from './security.js';

export function createAuthService(
  db: Database,
  options: { clock?: () => Date; throttle?: LoginThrottle; warn?: (message: string) => void } = {},
) {
  return authService({
    read: authRepository(db),
    transaction: (work) => writeTransaction(db, (trx) => work(authRepository(trx))),
    password: passwordHasher,
    tokens: sessionTokens,
    id: randomUUID,
    now: options.clock ?? (() => new Date()),
    throttle: options.throttle ?? createLoginThrottle(),
    warn: options.warn ?? console.warn,
  });
}
