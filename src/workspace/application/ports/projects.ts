import type { Project } from '../../domain/project-models.js';

export interface ProjectRepository {
  /** Active projects in selector order, then, when asked, archived ones from the most recently archived. */
  listProjects(includeArchived: boolean): Promise<Project[]>;
  findProject(id: string): Promise<Project | undefined>;
  insertProject(project: Project): Promise<void>;
  saveProject(project: Project, expectedVersion: number): Promise<void>;
  /** Moves a project in the selector. The order is not an edit: version and dates stay. */
  setProjectPosition(id: string, position: number): Promise<void>;
}
