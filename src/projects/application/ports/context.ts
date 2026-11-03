import type { ModuleContext } from '@tinyfold/core/application';
import type { CivilDate } from '@tinyfold/core/domain';
import type { FolderRepository } from './folders.js';
import type { ProjectRepository } from './projects.js';
export type ProjectsRepository = ProjectRepository &
  FolderRepository & {
    overdueCounts(today: CivilDate): Promise<Map<string, number>>;
  };
export interface ProjectsContext extends ModuleContext<ProjectsRepository> {
  calendar(): Promise<{ timeZone: string; today: CivilDate }>;
}
