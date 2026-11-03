import { z } from 'zod';
import { SEARCH_ITEM_TYPES } from '../../domain/paging.js';
import { READING_LIMITS } from '../../domain/reading-limits.js';

/**
 * Inputs of the agent read tools. The descriptions reach the agent through the tool schemas, and so
 * do the validation messages, which are Portuguese here without changing Zod's process-wide locale.
 */
const pt = { error: z.locales.ptBR().localeError };

const id = z.uuid(pt);
const cursor = z.string(pt).max(100).describe('O nextCursor da página anterior.');
const query = z.string(pt).trim().min(1).max(300);
const flag = () => z.boolean(pt);
const pageSize = (max: number, fallback: number) => z.number(pt).int().min(1).max(max).default(fallback);

export const ListProjectsInput = z.object(
  {
    includeArchived: flag().default(false).describe('Inclui projetos arquivados.'),
    cursor: cursor.optional(),
  },
  pt,
);

export const SearchInput = z.object(
  {
    query: query
      .optional()
      .describe(
        'Palavras a buscar, todas obrigatórias, sem diferenciar caixa, acentos e a pontuação em volta. Sem ela, ' +
          'lista os itens recentes.',
      ),
    projectId: id.optional().describe('Limita a busca a um projeto.'),
    folderId: id.optional().describe('Limita a uma pasta; só documentos e desenhos.'),
    types: z
      .array(z.enum(SEARCH_ITEM_TYPES, pt), pt)
      .min(1)
      .max(SEARCH_ITEM_TYPES.length)
      .optional()
      .describe('Tipos de item. O padrão é todos.'),
    limit: pageSize(READING_LIMITS.search.maxPageSize, READING_LIMITS.search.defaultPageSize),
    cursor: cursor.optional(),
  },
  pt,
);

export const ReadDocumentInput = z.object(
  { id, cursor: cursor.optional().describe('O cursor indicado no fim da página anterior.') },
  pt,
);

export type ListProjectsInput = z.infer<typeof ListProjectsInput>;
export type SearchInput = z.infer<typeof SearchInput>;
export type ReadDocumentInput = z.infer<typeof ReadDocumentInput>;
