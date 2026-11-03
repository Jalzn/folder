import { z } from 'zod';
import { COLUMN_LIMITS } from '../../domain/columns.js';
import { LABEL_LIMITS } from '../../domain/labels.js';
import { READING_LIMITS } from '../../domain/reading-limits.js';

/**
 * Inputs of the agent read tools. The descriptions reach the agent through the tool schemas, and so
 * do the validation messages, which are Portuguese here without changing Zod's process-wide locale.
 */
const pt = { error: z.locales.ptBR().localeError };

const id = z.uuid(pt);
const cursor = z.string(pt).max(100).describe('O nextCursor da página anterior.');
const query = z.string(pt).trim().min(1).max(300);
const pageSize = (max: number, fallback: number) => z.number(pt).int().min(1).max(max).default(fallback);

export const ListTasksInput = z.object(
  {
    projectId: id.optional().describe('Limita a um projeto.'),
    documentId: id.optional().describe('Só as tarefas criadas a partir deste documento.'),
    columns: z
      .array(z.string(pt).trim().min(1).max(COLUMN_LIMITS.nameChars), pt)
      .min(1)
      .max(COLUMN_LIMITS.active)
      .optional()
      .describe('Nomes de colunas, como aparecem no Tinyfold; vale qualquer uma delas.'),
    labels: z
      .array(z.string(pt).trim().min(1).max(LABEL_LIMITS.nameChars), pt)
      .min(1)
      .max(10)
      .optional()
      .describe('Nomes de etiquetas, como aparecem no Tinyfold; a tarefa precisa ter todas.'),
    query: query.optional().describe('Palavras que precisam aparecer no título, em qualquer ordem.'),
    limit: pageSize(READING_LIMITS.tasks.maxPageSize, READING_LIMITS.tasks.defaultPageSize),
    cursor: cursor.optional(),
  },
  pt,
);

export const ReadTaskInput = z.object(
  { id, cursor: cursor.optional().describe('O cursor indicado no fim da página anterior.') },
  pt,
);

export type ListTasksInput = z.infer<typeof ListTasksInput>;
export type ReadTaskInput = z.infer<typeof ReadTaskInput>;
