import { AppError } from '@tinyfold/core/application';
import type { NavigationReader } from './ports.js';

/** The project a navigation query is about must exist, archived or not. */
export async function requireProject(reader: NavigationReader, projectId: string): Promise<void> {
  if (!(await reader.hasProject(projectId))) throw new AppError('NOT_FOUND', 'O projeto não foi encontrado.');
}
