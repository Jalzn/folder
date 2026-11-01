import type { ReadingContext } from '../../application/reading/ports.js';
import { readTask } from '../../application/reading/read-task.js';
import { ReadTaskInput } from '../../application/reading/schemas.js';
import { READING_LIMITS } from '../../domain/reading-limits.js';
import { taskHeader, textResult } from './format.js';
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
      const parts: string[] = [];
      // Only line breaks are trimmed: a page cut mid-line keeps the space at its end.
      if (page.text.trim()) parts.push(page.text.replace(/\n+$/u, ''));
      if (page.count > 1) {
        const next = nextCursor && ` Continue com read_task ${JSON.stringify({ id: task.id, cursor: nextCursor })}.`;
        parts.push(`---\nPágina ${page.number} de ${page.count}.${next ?? ''}`);
      }
      if (page.number === 1) {
        // The header gets what the page and its footer leave of the result, up to its own budget.
        const room = READING_LIMITS.toolTextChars - parts.join('\n\n').length - '\n\n---\n\n'.length;
        const header = taskHeader(
          { task, today, empty: !page.text.trim() },
          Math.min(READING_LIMITS.task.headerChars, room),
        );
        parts.unshift(header, '---');
      }
      return textResult(parts.join('\n\n'));
    },
  });
