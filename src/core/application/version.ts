import { AppError } from './errors.js';
export const versionConflict = () =>
  new AppError('VERSION_CONFLICT', 'Este item mudou em outro dispositivo. Atualize os dados antes de continuar.');
export function assertVersion(actual: number, expected: number): void {
  if (actual !== expected) throw versionConflict();
}
