import type { Database } from '@tinyfold/core/infra';
import * as canvasPreviews from '../application/canvas-previews.js';
import * as canvases from '../application/canvases.js';
import * as documents from '../application/documents.js';
import * as projects from '../application/projects.js';
import * as schemas from '../application/schemas.js';
import * as tasks from '../application/tasks.js';
import { workspaceContext } from './context.js';
import { zlibImageData } from './png-image-data.js';

/** Also used by seed/QA and persistence tests; input is validated at every public entry point. */
export function createWorkspaceService(db: Database, clock = () => new Date()) {
  const ctx = workspaceContext(db, clock);
  return {
    listCanvases: (input: schemas.ListCanvasesInput = {}) =>
      canvases.listCanvases(ctx, schemas.ListCanvasesInput.parse(input)),
    getCanvas: (input: schemas.GetCanvasInput) => canvases.getCanvas(ctx, schemas.GetCanvasInput.parse(input)),
    createCanvas: (input: schemas.CreateCanvasInput) =>
      canvases.createCanvas(ctx, schemas.CreateCanvasInput.parse(input)),
    saveCanvas: (input: schemas.SaveCanvasInput) => canvases.saveCanvas(ctx, schemas.SaveCanvasInput.parse(input)),
    deleteCanvas: (input: schemas.DeleteCanvasInput) =>
      canvases.deleteCanvas(ctx, schemas.DeleteCanvasInput.parse(input)),
    restoreCanvas: (input: schemas.RestoreCanvasInput) =>
      canvases.restoreCanvas(ctx, schemas.RestoreCanvasInput.parse(input)),
    saveCanvasPreview: (input: schemas.SaveCanvasPreviewInput) =>
      canvasPreviews.saveCanvasPreview(ctx, zlibImageData, schemas.SaveCanvasPreviewInput.parse(input)),
    listProjects: (input: schemas.ListProjectsInput = {}) =>
      projects.listProjects(ctx, schemas.ListProjectsInput.parse(input)),
    createProject: (input: schemas.CreateProjectInput) =>
      projects.createProject(ctx, schemas.CreateProjectInput.parse(input)),
    updateProject: (input: schemas.UpdateProjectInput) =>
      projects.updateProject(ctx, schemas.UpdateProjectInput.parse(input)),
    listDocuments: (input: schemas.ListDocumentsInput = {}) =>
      documents.listDocuments(ctx, schemas.ListDocumentsInput.parse(input)),
    getDocument: (input: schemas.GetDocumentInput) => documents.getDocument(ctx, schemas.GetDocumentInput.parse(input)),
    createDocument: (input: schemas.CreateDocumentInput) =>
      documents.createDocument(ctx, schemas.CreateDocumentInput.parse(input)),
    saveDocument: (input: schemas.SaveDocumentInput) =>
      documents.saveDocument(ctx, schemas.SaveDocumentInput.parse(input)),
    deleteDocument: (input: schemas.DeleteDocumentInput) =>
      documents.deleteDocument(ctx, schemas.DeleteDocumentInput.parse(input)),
    restoreDocument: (input: schemas.RestoreDocumentInput) =>
      documents.restoreDocument(ctx, schemas.RestoreDocumentInput.parse(input)),
    listTasks: (input: schemas.ListTasksInput = {}) => tasks.listTasks(ctx, schemas.ListTasksInput.parse(input)),
    createTask: (input: schemas.CreateTaskInput) => tasks.createTask(ctx, schemas.CreateTaskInput.parse(input)),
    updateTask: (input: schemas.UpdateTaskInput) => tasks.updateTask(ctx, schemas.UpdateTaskInput.parse(input)),
    deleteTask: (input: schemas.DeleteTaskInput) => tasks.deleteTask(ctx, schemas.DeleteTaskInput.parse(input)),
    moveTask: (input: schemas.MoveTaskInput) => tasks.moveTask(ctx, schemas.MoveTaskInput.parse(input)),
  };
}
