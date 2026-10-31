import { AppError } from '@tinyfold/core/application';

/** A versioned UPDATE that matched no row lost a race with another device. */
export function expectUpdated(count: bigint): void {
  if (count !== 1n)
    throw new AppError('VERSION_CONFLICT', 'Este item mudou em outro dispositivo. Atualize antes de continuar.');
}
