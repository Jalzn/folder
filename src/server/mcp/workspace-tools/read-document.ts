import { READING_LIMITS, ReadDocumentInput } from '#workspace/contracts';
import { documentHeader } from './headers.js';
import { pagedMarkdownResult } from './paged-result.js';
import type { AgentQueries } from './queries.js';
import { defineTool, readOnlyAnnotations } from './types.js';

export const readDocumentTool = (queries: AgentQueries) =>
  defineTool({
    name: 'read_document',
    title: 'Ler documento',
    description:
      'Lê um documento em Markdown, com projeto, versão e as tarefas criadas a partir dele. ' +
      'Documentos longos vêm em páginas; o fim de cada página diz como pedir a próxima. Tarefas e desenhos ' +
      'incorporados aparecem como links tinyfold:task/<id> e tinyfold:drawing/<id>; leia-os com read_task e ' +
      'read_drawing, que recebem esses IDs. [Item indisponível] é um item na lixeira ou excluído.',
    inputSchema: ReadDocumentInput,
    annotations: readOnlyAnnotations,
    async handler(input) {
      const { document, originTasks, originTaskCount, page, nextCursor } = await queries.readDocument(input);
      return pagedMarkdownResult({
        page,
        nextCursor,
        id: document.id,
        tool: 'read_document',
        headerChars: READING_LIMITS.document.headerChars,
        header: (empty, room) => documentHeader({ document, originTasks, originTaskCount, empty }, room),
      });
    },
  });
