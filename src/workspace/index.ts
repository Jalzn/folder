export type { Canvas, CanvasAck, CanvasElement, CanvasScene, CanvasSummary } from './domain/canvas.js';
export type {
  Document,
  DocumentAck,
  DocumentBlock,
  DocumentContent,
  DocumentSummary,
  Project,
  Task,
  TaskList,
  TaskSource,
  TaskStatus,
} from './domain/index.js';
export { workspaceModule } from './infra/module.js';
export { createWorkspaceRouter } from './infra/rpc.js';
export { createWorkspaceService } from './infra/service.js';
