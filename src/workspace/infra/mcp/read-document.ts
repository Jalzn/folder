import type { ReadingContext } from '../../application/reading/ports.js';
import { readDocument } from '../../application/reading/read-document.js';
import { ReadDocumentInput } from '../../application/reading/schemas.js';
import { documentHeader, textResult } from './format.js';
import { defineTool, readOnlyAnnotations } from './types.js';

export const readDocumentTool = (reading: ReadingContext) =>
  defineTool({
    name: 'read_document',
    title: 'Ler documento',
    description:
      'Lê um documento em Markdown, com projeto, versão e as tarefas criadas a partir dele. ' +
      'Documentos longos vêm em páginas; o fim de cada página diz como pedir a próxima.',
    inputSchema: ReadDocumentInput,
    annotations: readOnlyAnnotations,
    async handler(input) {
      const { document, originTasks, originTaskCount, page, nextCursor } = await readDocument(reading, input);
      const parts: string[] = [];
      if (page.number === 1)
        parts.push(documentHeader({ document, originTasks, originTaskCount, empty: !page.text.trim() }), '---');
      if (page.text.trim()) parts.push(page.text.trimEnd());
      if (page.count > 1) {
        const next =
          nextCursor && ` Continue com read_document ${JSON.stringify({ id: document.id, cursor: nextCursor })}.`;
        parts.push(`---\nPágina ${page.number} de ${page.count}.${next ?? ''}`);
      }
      return textResult(parts.join('\n\n'));
    },
  });
