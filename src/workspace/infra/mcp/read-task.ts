import type { ReadingContext } from '../../application/reading/ports.js';
import { readTask } from '../../application/reading/read-task.js';
import { ReadTaskInput } from '../../application/reading/schemas.js';
import { compactJson, statusFields, textResult } from './format.js';
import { defineTool, readOnlyAnnotations } from './types.js';

export const readTaskTool = (reading: ReadingContext) =>
  defineTool({
    name: 'read_task',
    title: 'Ler tarefa',
    description:
      'Lê uma tarefa com a origem completa: o documento, o bloco e o trecho de onde ela nasceu. ' +
      'available diz se o documento está disponível e blockAvailable se o trecho ainda está nele; ' +
      'o trecho capturado vem mesmo quando a origem não existe mais.',
    inputSchema: ReadTaskInput,
    annotations: readOnlyAnnotations,
    async handler(input) {
      const { status, source, ...task } = await readTask(reading, input);
      return textResult(
        compactJson({
          id: task.id,
          title: task.title,
          ...statusFields(status),
          projectId: task.projectId,
          projectName: task.projectName,
          projectArchived: task.projectArchived,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
          position: task.position,
          source: source && {
            documentId: source.documentId,
            documentTitle: source.documentTitle,
            blockId: source.blockId,
            excerpt: source.excerpt,
            available: source.available,
            blockAvailable: source.blockAvailable,
          },
        }),
      );
    },
  });
