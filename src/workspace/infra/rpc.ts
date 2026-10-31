import { authedProcedure, type Database } from '@tinyfold/core/infra';
import { z } from 'zod';
import * as schemas from '../application/schemas.js';
import { createWorkspaceService } from './service.js';

export function createWorkspaceRouter(db: Database) {
  const service = createWorkspaceService(db);
  return {
    listCanvases: authedProcedure.input(schemas.ListCanvasesInput).handler(({ input }) => service.listCanvases(input)),
    getCanvas: authedProcedure.input(schemas.GetCanvasInput).handler(({ input }) => service.getCanvas(input)),
    createCanvas: authedProcedure.input(schemas.CreateCanvasInput).handler(({ input }) => service.createCanvas(input)),
    saveCanvas: authedProcedure.input(schemas.SaveCanvasInput).handler(({ input }) => service.saveCanvas(input)),
    deleteCanvas: authedProcedure.input(schemas.DeleteCanvasInput).handler(({ input }) => service.deleteCanvas(input)),
    restoreCanvas: authedProcedure
      .input(schemas.RestoreCanvasInput)
      .handler(({ input }) => service.restoreCanvas(input)),
    // The browser sends the PNG as a multipart File, within the /rpc body limit.
    saveCanvasPreview: authedProcedure
      .input(schemas.SaveCanvasPreviewInput.extend({ png: z.file() }))
      .handler(async ({ input }) =>
        service.saveCanvasPreview({ ...input, png: new Uint8Array(await input.png.arrayBuffer()) }),
      ),
    listProjects: authedProcedure.input(schemas.ListProjectsInput).handler(({ input }) => service.listProjects(input)),
    createProject: authedProcedure
      .input(schemas.CreateProjectInput)
      .handler(({ input }) => service.createProject(input)),
    updateProject: authedProcedure
      .input(schemas.UpdateProjectInput)
      .handler(({ input }) => service.updateProject(input)),
    listDocuments: authedProcedure
      .input(schemas.ListDocumentsInput)
      .handler(({ input }) => service.listDocuments(input)),
    getDocument: authedProcedure.input(schemas.GetDocumentInput).handler(({ input }) => service.getDocument(input)),
    createDocument: authedProcedure
      .input(schemas.CreateDocumentInput)
      .handler(({ input }) => service.createDocument(input)),
    saveDocument: authedProcedure.input(schemas.SaveDocumentInput).handler(({ input }) => service.saveDocument(input)),
    deleteDocument: authedProcedure
      .input(schemas.DeleteDocumentInput)
      .handler(({ input }) => service.deleteDocument(input)),
    restoreDocument: authedProcedure
      .input(schemas.RestoreDocumentInput)
      .handler(({ input }) => service.restoreDocument(input)),
    listTasks: authedProcedure.input(schemas.ListTasksInput).handler(({ input }) => service.listTasks(input)),
    createTask: authedProcedure.input(schemas.CreateTaskInput).handler(({ input }) => service.createTask(input)),
    updateTask: authedProcedure.input(schemas.UpdateTaskInput).handler(({ input }) => service.updateTask(input)),
    deleteTask: authedProcedure.input(schemas.DeleteTaskInput).handler(({ input }) => service.deleteTask(input)),
    moveTask: authedProcedure.input(schemas.MoveTaskInput).handler(({ input }) => service.moveTask(input)),
  };
}
