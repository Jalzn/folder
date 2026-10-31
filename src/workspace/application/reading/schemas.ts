import { z } from 'zod';
import { SEARCH_ITEM_TYPES } from '../../domain/paging.js';
import { READING_LIMITS } from '../../domain/reading-limits.js';
import { TASK_STATUSES, taskStatusLabels } from '../../domain/task-status.js';

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
const columnList = new Intl.ListFormat('pt-BR').format(
  TASK_STATUSES.map((status) => `${status} (${taskStatusLabels[status]})`),
);

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

export const ReadDrawingInput = z
  .object(
    {
      id,
      image: flag().default(true).describe('Inclui a imagem PNG do desenho.'),
      structure: flag().default(true).describe('Inclui a lista de elementos e ligações.'),
    },
    pt,
  )
  .refine((input) => input.image || input.structure, 'Peça a imagem, a estrutura ou as duas.');

export const ListTasksInput = z.object(
  {
    projectId: id.optional().describe('Limita a um projeto.'),
    documentId: id.optional().describe('Só as tarefas criadas a partir deste documento.'),
    status: z
      .array(z.enum(TASK_STATUSES, pt), pt)
      .min(1)
      .max(TASK_STATUSES.length)
      .optional()
      .describe(`Colunas: ${columnList}.`),
    query: query.optional().describe('Palavras que precisam aparecer no título, em qualquer ordem.'),
    limit: pageSize(READING_LIMITS.tasks.maxPageSize, READING_LIMITS.tasks.defaultPageSize),
    cursor: cursor.optional(),
  },
  pt,
);

export const ReadTaskInput = z.object({ id }, pt);

export type ListProjectsInput = z.infer<typeof ListProjectsInput>;
export type SearchInput = z.infer<typeof SearchInput>;
export type ReadDocumentInput = z.infer<typeof ReadDocumentInput>;
export type ReadDrawingInput = z.infer<typeof ReadDrawingInput>;
export type ListTasksInput = z.infer<typeof ListTasksInput>;
export type ReadTaskInput = z.infer<typeof ReadTaskInput>;
