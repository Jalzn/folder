import type { EventDraft, TransactionScope } from '#core/application';
import { defineModule } from '#core/application';
import { createEventChannel, type SqliteUnitOfWork } from '#core/infra';
import type { DocumentEvent } from '../application/contracts/events.js';
import { requireDocumentSource } from '../application/lookups.js';
import type { DocumentOrganization, DocumentSourceInput, DocumentsRepository } from '../application/ports.js';
import { documentApi, documentOperations } from './operations.js';
import { documentRepository } from './repository/documents.js';

export interface DocumentsDependencies {
  unit: SqliteUnitOfWork;
  organization(scope: TransactionScope): DocumentOrganization;
  clock?: () => Date;
  newId?: () => string;
  logError?: (error: unknown) => void;
}

function runtime(dependencies: DocumentsDependencies) {
  const { unit } = dependencies;
  const channel = createEventChannel<DocumentEvent>({
    ...(dependencies.logError ? { logError: dependencies.logError } : {}),
  });
  function repository(scope: TransactionScope): DocumentsRepository {
    const documents = documentRepository(unit.connection(scope));
    const emit = (draft: EventDraft<DocumentEvent>) => unit.emit(scope, channel, draft);
    const ports: DocumentsRepository = {
      ...documents,
      ...dependencies.organization(scope),
      async insertDocument(document) {
        await documents.insertDocument(document);
        emit({ type: 'document.created', entityId: document.id, payload: { version: document.version } });
      },
      async saveDocument(document, expectedVersion) {
        await documents.saveDocument(document, expectedVersion);
        emit({ type: 'document.saved', entityId: document.id, payload: { version: document.version } });
      },
      async trashDocument(input) {
        await documents.trashDocument(input);
        emit({ type: 'document.trashed', entityId: input.id, payload: { version: input.expectedVersion + 1 } });
      },
      async restoreDocument(input) {
        await documents.restoreDocument(input);
        emit({ type: 'document.restored', entityId: input.id, payload: { version: input.expectedVersion + 1 } });
      },
      async moveDocument(input) {
        await documents.moveDocument(input);
        emit({
          type: 'document.placementChanged',
          entityId: input.id,
          payload: { reason: 'project', version: input.expectedVersion + 1 },
        });
      },
      async placeDocument(input) {
        const previous = await documents.findDocumentPlacement(input.id);
        await documents.placeDocument(input);
        if (previous && (previous.folderId !== input.folderId || previous.pinnedAt !== input.pinnedAt))
          emit({ type: 'document.placementChanged', entityId: input.id, payload: { reason: 'folder' } });
      },
      async setDocumentPinnedAt(input) {
        const previous = await documents.findDocumentPlacement(input.id);
        await documents.setDocumentPinnedAt(input);
        if (previous && previous.pinnedAt !== input.pinnedAt)
          emit({ type: 'document.placementChanged', entityId: input.id, payload: { reason: 'pin' } });
      },
      async deleteDocumentRow(id) {
        const previous = await documents.findDocumentPlacement(id);
        await documents.deleteDocumentRow(id);
        if (previous) emit({ type: 'document.purged', entityId: id, payload: {} });
      },
    };
    const reads = new Set([
      'listDocuments',
      'findDocument',
      'findDocumentPlacement',
      'findDocumentsForOrigins',
      'findDocumentMetadataForOrigins',
      'findProject',
      'findFolder',
    ]);
    const guarded = Object.fromEntries(
      Object.entries(ports).map(([name, method]) => [
        name,
        (...args: unknown[]) => {
          if (reads.has(name)) unit.assertActive(scope);
          else unit.assertWritable(scope);
          return Reflect.apply(method, ports, args);
        },
      ]),
    ) as unknown as DocumentsRepository;
    return unit.bind(scope, guarded);
  }
  const options = {
    ...(dependencies.clock ? { clock: dependencies.clock } : {}),
    ...(dependencies.newId ? { newId: dependencies.newId } : {}),
  };
  const context = unit.context(repository, options);
  const operations = documentOperations(context);
  return {
    channel,
    context,
    operations,
    participant(scope: TransactionScope) {
      const bound = unit.participantContext(scope, repository, options);
      const scopedRepository = repository(scope);
      const scopedOperations = documentOperations(bound);
      return {
        repository: scopedRepository,
        context: bound,
        operations: scopedOperations,
        ...documentApi(scopedOperations, bound),
        requireSource: (input: DocumentSourceInput) => requireDocumentSource(scopedRepository, input),
      };
    },
  };
}

const definition = defineModule({
  id: 'documents',
  setup: runtime,
  api: (state) => ({ ...documentApi(state.operations, state.context), events: state.channel.source }),
});

export class DocumentsModule extends definition.Module {}

export const documentsParticipant = (module: DocumentsModule, scope: TransactionScope) =>
  definition.stateOf(module).participant(scope);
export const documentsOperations = (module: DocumentsModule) => definition.stateOf(module).operations;
export const disposeDocuments = (module: DocumentsModule) => definition.stateOf(module).channel.dispose();
