import type { BoardModule } from '#board';
import type { DrawingsModule } from '#drawings';
import type { WorkspaceModule } from '#workspace';
export interface AgentQueries {
  readDrawing: DrawingsModule['queries']['readForAgent'];
  readDocument: WorkspaceModule['queries']['readDocument'];
  readTask: BoardModule['queries']['tasks']['readForAgent'];
  listTasks: BoardModule['queries']['tasks']['listForAgent'];
  listProjects: WorkspaceModule['queries']['listProjectsForAgent'];
  search: WorkspaceModule['queries']['searchForAgent'];
}
