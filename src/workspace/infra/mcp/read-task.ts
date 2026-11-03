import type { ReadingContext } from '../../application/reading/ports.js';
import { readTask } from '../../application/reading/read-task.js';
import { ReadTaskInput } from '../../application/reading/schemas.js';
import { READING_LIMITS } from '../../domain/reading-limits.js';
import { taskHeader } from './headers.js';
import { pagedMarkdownResult } from './paged-result.js';
import { defineTool, readOnlyAnnotations } from './types.js';

export const readTaskTool = (reading: ReadingContext) =>
  defineTool({
    name: 'read_task',
    title: 'Ler tarefa',
    description:
      'Lê uma tarefa em Markdown: projeto, coluna, prazo, etiquetas, checklist, conclusão e a origem completa, ' +
      'com o documento, o bloco e o trecho de onde ela nasceu, e depois a descrição. O trecho capturado vem ' +
      'mesmo quando a origem não existe mais. Datas de prazo valem no fuso do dono do Tinyfold. Descrições ' +
      'longas vêm em páginas; o fim de cada página diz como pedir a próxima. Recebe o ID de um link ' +
      'tinyfold:task/<id> de read_document.',
    inputSchema: ReadTaskInput,
    annotations: readOnlyAnnotations,
    async handler(input) {
      const { task, today, page, nextCursor } = await readTask(reading, input);
      return pagedMarkdownResult({
        page,
        nextCursor,
        id: task.id,
        tool: 'read_task',
        headerChars: READING_LIMITS.task.headerChars,
        header: (empty, room) => taskHeader({ task, today, empty }, room),
      });
    },
  });
