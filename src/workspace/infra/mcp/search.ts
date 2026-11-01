import type { ReadingContext, SearchHit } from '../../application/reading/ports.js';
import { SearchInput } from '../../application/reading/schemas.js';
import { search } from '../../application/reading/search.js';
import { compactJson, fitItems, statusFields, textResult } from './format.js';
import { defineTool, readOnlyAnnotations } from './types.js';

const hitView = ({ projectId, projectName, projectArchived, updatedAt, titleRank: _rank, ...hit }: SearchHit) =>
  hit.type === 'task'
    ? {
        type: hit.type,
        id: hit.id,
        title: hit.title,
        ...statusFields(hit.status),
        projectId,
        projectName,
        projectArchived,
        updatedAt,
      }
    : {
        type: hit.type,
        id: hit.id,
        title: hit.title,
        projectId,
        projectName,
        projectArchived,
        updatedAt,
        pinned: hit.pinned,
        folder: hit.folder,
        excerpt: hit.excerpt,
      };

export const searchTool = (reading: ReadingContext) =>
  defineTool({
    name: 'search',
    title: 'Buscar no Tinyfold',
    description:
      'Busca documentos, desenhos e tarefas por palavras: todas precisam aparecer, em qualquer ordem, no título ' +
      'ou no texto, sem diferenciar caixa e acentos. Hífens separam palavras, e a pontuação em volta delas é ' +
      'ignorada. Itens com mais palavras no título vêm primeiro e, depois, ' +
      'os editados mais recentemente. Sem query, lista os itens editados mais recentemente. Documentos e desenhos ' +
      'trazem pinned, que diz se estão fixados no topo da lateral do projeto, e folder, a pasta em que estão, ou ' +
      'null na raiz do projeto; folderId limita a busca aos documentos e desenhos de uma pasta. Passe o ' +
      'nextCursor para ver a próxima página. Leia os itens com read_document, read_drawing ou read_task.',
    inputSchema: SearchInput,
    annotations: readOnlyAnnotations,
    async handler(input) {
      const page = await search(reading, input);
      const text = fitItems(page.items, (shown) =>
        compactJson({ items: shown.map(hitView), nextCursor: page.nextCursor(shown.length) }),
      );
      return textResult(text);
    },
  });
