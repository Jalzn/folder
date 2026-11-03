import type { EventDraft, TransactionScope } from '#core/application';
import { defineModule } from '#core/application';
import type { CivilDate } from '#core/domain';
import { createEventChannel, type SqliteUnitOfWork } from '#core/infra';
import type { ProjectEvent } from '../application/contracts/events.js';
import type { ProjectsContext, ProjectsRepository } from '../application/ports/context.js';
import { projectApi, projectOperations } from './operations.js';
import { folderRepository } from './repository/folders.js';
import { projectRepository } from './repository/projects.js';

export interface ProjectsDependencies {
  unit: SqliteUnitOfWork;
  counts(scope: TransactionScope): {
    overdueCounts(today: CivilDate): Promise<Map<string, number>>;
    folderItemCounts(ids: string[]): Promise<Map<string, number>>;
  };
  calendar(): Promise<{ timeZone: string; today: CivilDate }>;
  clock?: () => Date;
  newId?: () => string;
  logError?: (error: unknown) => void;
}

function runtime(deps: ProjectsDependencies) {
  const { unit } = deps;
  const channel = createEventChannel<ProjectEvent>({ ...(deps.logError ? { logError: deps.logError } : {}) });
  function repository(scope: TransactionScope): ProjectsRepository {
    const projects = projectRepository(unit.connection(scope));
    const facts = deps.counts(scope);
    const folders = folderRepository(unit.connection(scope), (ids) => facts.folderItemCounts(ids));
    const emit = (draft: EventDraft<ProjectEvent>) => unit.emit(scope, channel, draft);
    const ports: ProjectsRepository = {
      ...projects,
      ...folders,
      overdueCounts: (today) => facts.overdueCounts(today),
      async insertProject(project) {
        await projects.insertProject(project);
        emit({ type: 'project.created', entityId: project.id, payload: { version: project.version } });
      },
      async saveProject(project, expectedVersion) {
        await projects.saveProject(project, expectedVersion);
        emit({ type: 'project.updated', entityId: project.id, payload: { version: project.version } });
      },
      async setProjectPosition(id, position) {
        await projects.setProjectPosition(id, position);
        emit({ type: 'project.reordered', entityId: id, payload: { position } });
      },
      async insertFolder(folder) {
        await folders.insertFolder(folder);
        emit({
          type: 'folder.created',
          entityId: folder.id,
          payload: { projectId: folder.projectId, version: folder.version },
        });
      },
      async saveFolder(folder, expectedVersion) {
        const previous = await folders.findFolder(folder.id);
        await folders.saveFolder(folder, expectedVersion);
        const type = folder.deletedAt ? 'folder.trashed' : previous?.deletedAt ? 'folder.restored' : 'folder.renamed';
        emit({ type, entityId: folder.id, payload: { projectId: folder.projectId, version: folder.version } });
      },
      async setFolderPosition(id, position) {
        await folders.setFolderPosition(id, position);
        emit({ type: 'folder.reordered', entityId: id, payload: { position } });
      },
    };
    return Object.fromEntries(
      Object.entries(ports).map(([name, fn]) => [
        name,
        (...args: unknown[]) => {
          unit.assertActive(scope);
          if (
            [
              'insertProject',
              'saveProject',
              'setProjectPosition',
              'insertFolder',
              'saveFolder',
              'setFolderPosition',
            ].includes(name)
          )
            unit.assertWritable(scope);
          return Reflect.apply(fn, ports, args);
        },
      ]),
    ) as unknown as ProjectsRepository;
  }
  const options = { ...(deps.clock ? { clock: deps.clock } : {}), ...(deps.newId ? { newId: deps.newId } : {}) };
  const context: ProjectsContext = { ...unit.context(repository, options), calendar: deps.calendar };
  const operations = projectOperations(context);
  return {
    channel,
    operations,
    participant(scope: TransactionScope) {
      const bound: ProjectsContext = {
        ...unit.participantContext(scope, repository, options),
        calendar: deps.calendar,
      };
      return {
        repository: repository(scope),
        context: bound,
        operations: projectOperations(bound),
        ...projectApi(projectOperations(bound)),
      };
    },
  };
}
const definition = defineModule({
  id: 'projects',
  setup: runtime,
  api: (state) => ({ ...projectApi(state.operations), events: state.channel.source }),
});

export class ProjectsModule extends definition.Module {}

export const projectsParticipant = (module: ProjectsModule, scope: TransactionScope) =>
  definition.stateOf(module).participant(scope);
export const projectsOperations = (module: ProjectsModule) => definition.stateOf(module).operations;
export const disposeProjects = (module: ProjectsModule) => definition.stateOf(module).channel.dispose();
