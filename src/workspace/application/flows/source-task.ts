import { AppError, type ModuleContext } from '#core/application';
import type { CivilDate, IsoInstant } from '#core/domain';
import type { DocumentBlock } from '#rich-text/domain';

/** The complete validated input is kept intact until the outer write fingerprints it. */
export interface SourceTaskInput {
  requestId: string;
  title: string;
  projectId?: string | null | undefined;
  columnId?: string | undefined;
  dueOn?: CivilDate | null | undefined;
  labelIds?: string[] | undefined;
  description?: DocumentBlock[] | undefined;
  source?:
    | {
        documentId: string;
        blockId?: string | null | undefined;
        excerpt: string;
        expectedVersion?: number | undefined;
      }
    | undefined;
}

export type SourceTaskRawInput = Omit<SourceTaskInput, 'dueOn' | 'description'> & {
  dueOn?: string | null | undefined;
  description?: unknown;
};

export interface SourceTaskAck {
  id: string;
  projectId: string;
  version: number;
  updatedAt: IsoInstant;
  revision: number;
}

export interface SourceTaskPorts {
  createSourceTask(input: SourceTaskInput): Promise<SourceTaskAck>;
}

/** Document validation, task creation and its source participate in one outer workspace write. */
export function createTaskFromDocument(ctx: ModuleContext<SourceTaskPorts>, input: SourceTaskInput) {
  if (!input.source) throw new AppError('VALIDATION', 'Escolha um trecho de documento para criar a tarefa.');
  return ctx.write('workspace.createTask', input, (ports) => ports.createSourceTask(input));
}
