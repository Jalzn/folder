import { z } from 'zod';
import { READING_LIMITS } from '../../domain/reading-limits.js';

/** Inputs of the agent read tools. The descriptions reach the agent through the tool schemas. */

const id = z.uuid();
const cursor = z.string().max(100).describe('O nextCursor da página anterior.');
const query = z.string().trim().min(1).max(300);

export const ListProjectsInput = z.object({
  includeArchived: z.boolean().default(false).describe('Inclui projetos arquivados.'),
});

export const SearchInput = z.object({
  query: query
    .optional()
    .describe(
      'Palavras a buscar, todas obrigatórias, sem diferenciar caixa e acentos. Sem ela, lista os itens recentes.',
    ),
  projectId: id.optional().describe('Limita a busca a um projeto.'),
  types: z
    .array(z.enum(['document', 'drawing', 'task']))
    .min(1)
    .max(3)
    .optional()
    .describe('Tipos de item. O padrão é todos.'),
  limit: z.number().int().min(1).max(READING_LIMITS.search.maxPageSize).default(READING_LIMITS.search.defaultPageSize),
  cursor: cursor.optional(),
});

export const ReadDocumentInput = z.object({
  id,
  cursor: cursor.optional().describe('O cursor indicado no fim da página anterior.'),
});

export const ReadDrawingInput = z
  .object({
    id,
    image: z.boolean().default(true).describe('Inclui a imagem PNG do desenho.'),
    structure: z.boolean().default(true).describe('Inclui a lista de elementos e ligações.'),
  })
  .refine((input) => input.image || input.structure, 'Peça a imagem, a estrutura ou as duas.');

export const ListTasksInput = z.object({
  projectId: id.optional().describe('Limita a um projeto.'),
  documentId: id.optional().describe('Só as tarefas criadas a partir deste documento.'),
  status: z
    .array(z.enum(['todo', 'doing', 'done']))
    .min(1)
    .max(3)
    .optional()
    .describe('Colunas: todo (A fazer), doing (Em andamento) e done (Concluído).'),
  query: query.optional().describe('Palavras que precisam aparecer no título, em qualquer ordem.'),
  limit: z.number().int().min(1).max(READING_LIMITS.tasks.maxPageSize).default(READING_LIMITS.tasks.defaultPageSize),
  cursor: cursor.optional(),
});

export const ReadTaskInput = z.object({ id });

export type ListProjectsInput = z.infer<typeof ListProjectsInput>;
export type SearchInput = z.infer<typeof SearchInput>;
export type ReadDocumentInput = z.infer<typeof ReadDocumentInput>;
export type ReadDrawingInput = z.infer<typeof ReadDrawingInput>;
export type ListTasksInput = z.infer<typeof ListTasksInput>;
export type ReadTaskInput = z.infer<typeof ReadTaskInput>;
