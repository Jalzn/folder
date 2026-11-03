import { BoardModule } from '#board';
import { boardOperations, boardParticipant, disposeBoard } from '#board/composition';
import { CreateTaskInput } from '#board/contracts';
import type { Operation, TransactionScope } from '#core/application';
import { createUnitOfWork, type Database } from '#core/infra';
import { DocumentsModule } from '#documents';
import { disposeDocuments, documentsOperations, documentsParticipant } from '#documents/composition';
import { DrawingsModule } from '#drawings';
import { disposeDrawings, drawingsOperations, drawingsParticipant } from '#drawings/composition';
import { previewShowsStoredScene } from '#drawings/domain';
import { ProjectsModule } from '#projects';
import { disposeProjects, projectsOperations, projectsParticipant } from '#projects/composition';
import { WorkspaceModule } from '#workspace';
import {
  calendarOf,
  disposeWorkspace,
  flowReader,
  navigationReader,
  type TimeZoneSource,
  utc,
  type WorkspaceFlowPorts,
  workspaceOperationsFrom,
  workspaceReader,
  workspaceSourceTaskOperation,
} from '#workspace/composition';

export type { Operation };
export function composeWorkspace(
  db: Database,
  {
    clock = () => new Date(),
    mutationClock = clock,
    timeZone = utc,
    logError = console.error,
  }: {
    clock?: () => Date;
    mutationClock?: () => Date;
    timeZone?: TimeZoneSource;
    logError?: (error: unknown) => void;
  } = {},
) {
  const unit = createUnitOfWork(db, { clock, mutationClock, logError });
  const calendar = calendarOf(clock, timeZone);
  const projects = new ProjectsModule({
    unit,
    clock,
    calendar,
    logError,
    counts: (scope) => ({
      overdueCounts: (today) => boardParticipant(board, scope).repository.overdueCounts(today),
      folderItemCounts: (ids) => flowReader(unit.connection(scope)).folderItemCounts(ids),
    }),
  });
  const organization = (scope: TransactionScope) => projectsParticipant(projects, scope).repository;
  const documents = new DocumentsModule({ unit, clock, logError, organization });
  const drawings = new DrawingsModule({ unit, clock, logError, organization });
  const board = new BoardModule({
    unit,
    clock,
    calendar,
    logError,
    external: (scope) => ({
      findProject: (id) => organization(scope).findProject(id),
      projectsByIds: (ids) => organization(scope).findProjectsByIds(ids),
      documentsByIds: async (ids, options) => {
        const repository = documentsParticipant(documents, scope).repository;
        if (options?.content === false)
          return [...(await repository.findDocumentMetadataForOrigins(ids)).values()].map((fact) => ({
            ...fact,
            content: [],
            plainText: '',
          }));
        return [...(await repository.findDocumentsForOrigins(ids)).values()];
      },
      resolveTaskSource: (source) => documentsParticipant(documents, scope).requireSource(source),
    }),
  });
  const ports = (scope: TransactionScope): WorkspaceFlowPorts => {
    const project = organization(scope);
    const document = documentsParticipant(documents, scope).repository;
    const drawing = drawingsParticipant(drawings, scope).repository;
    const tasks = boardParticipant(board, scope).repository;
    const reads = flowReader(unit.connection(scope));
    return {
      findProject: project.findProject,
      findFolder: project.findFolder,
      activeFolders: project.activeFolders,
      saveFolder: project.saveFolder,
      setFolderPosition: project.setFolderPosition,
      itemsInFolder: reads.itemsInFolder,
      findItem: reads.findItem,
      pinnedInScope: reads.pinnedInScope,
      findDocument: document.findDocument,
      findCanvas: drawing.findCanvas,
      findTask: tasks.findTask,
      keepTitleInSources: tasks.keepTitleInSources,
      deleteDocumentRow: document.deleteDocumentRow,
      deleteCanvasRow: drawing.deleteCanvasRow,
      deleteTaskRow: tasks.deleteTaskRow,
      bumpRevision: tasks.bumpRevision,
      placeItem: ({ type, ...input }) =>
        type === 'document' ? document.placeDocument(input) : drawing.placeCanvas(input),
      trashItem: ({ type, ...input }) =>
        type === 'document' ? document.trashDocument(input) : drawing.trashCanvas(input),
      restoreItem: ({ type, ...input }) =>
        type === 'document' ? document.restoreDocument(input) : drawing.restoreCanvas(input),
      moveItem: ({ type, ...input }) =>
        type === 'document' ? document.moveDocument(input) : drawing.moveCanvas(input),
      setPinnedAt: ({ type, ...input }) =>
        type === 'document' ? document.setDocumentPinnedAt(input) : drawing.setCanvasPinnedAt(input),
    };
  };
  const reading = {
    calendar,
    read: <T>(work: (reader: ReturnType<typeof workspaceReader>) => Promise<T>) =>
      unit.read((scope) => work(unit.bind(scope, workspaceReader(unit.connection(scope), previewShowsStoredScene)))),
  };
  const navigation = {
    calendar,
    read: <T>(work: (reader: ReturnType<typeof navigationReader>) => Promise<T>) =>
      unit.read((scope) => work(unit.bind(scope, navigationReader(unit.connection(scope))))),
  };
  const workspace = new WorkspaceModule({
    unit,
    clock,
    logError,
    calendar,
    ports,
    reading,
    navigation,
    sourceTaskInput: CreateTaskInput,
    sourceTask: (scope, input) => boardParticipant(board, scope).operations.createTask.run(input),
  });
  const boardOps = boardOperations(board);
  const operations = {
    ...workspaceOperationsFrom(workspace),
    ...projectsOperations(projects),
    ...documentsOperations(documents),
    ...drawingsOperations(drawings),
    ...boardOps,
    createTask: {
      ...boardOps.createTask,
      run: (input: Parameters<typeof boardOps.createTask.run>[0]) =>
        input.source ? workspaceSourceTaskOperation(workspace).run(input) : boardOps.createTask.run(input),
    },
  };
  return {
    operations,
    modules: { projects, documents, drawings, board, workspace },
    unit,
    reading,
    navigation,
    dispose() {
      disposeProjects(projects);
      disposeDocuments(documents);
      disposeDrawings(drawings);
      disposeBoard(board);
      disposeWorkspace(workspace);
    },
  };
}
export function workspaceOperations(
  db: Database,
  clock = () => new Date(),
  timeZone: TimeZoneSource = utc,
  mutationClock = clock,
) {
  return composeWorkspace(db, { clock, timeZone, mutationClock }).operations;
}
export type WorkspaceOperations = ReturnType<typeof workspaceOperations>;
