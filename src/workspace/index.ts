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
} from './domain/index.js';
export { type CanvasPreviewImage, createWorkspaceFiles, type WorkspaceFiles } from './infra/files.js';
export { type AgentTool, type AgentToolResult, createWorkspaceTools } from './infra/mcp/index.js';
export { workspaceModule } from './infra/module.js';
export { createWorkspaceRouter } from './infra/rpc.js';
export { createWorkspaceService, type WorkspaceService } from './infra/service.js';
