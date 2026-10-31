import { listTasks } from '../../application/reading/list-tasks.js';
import type { ReadingContext, TaskListing } from '../../application/reading/ports.js';
import { ListTasksInput } from '../../application/reading/schemas.js';
import { compactJson, fitItems, statusFields, textResult } from './format.js';
import { defineTool, readOnlyAnnotations } from './types.js';

const taskView = (task: TaskListing) => ({
  id: task.id,
  title: task.title,
  ...statusFields(task.status),
  projectId: task.projectId,
  projectName: task.projectName,
  projectArchived: task.projectArchived,
  updatedAt: task.updatedAt,
  source: task.source,
});

export const listTasksTool = (reading: ReadingContext) =>
  defineTool({
    name: 'list_tasks',
    title: 'Listar tarefas',
    description:
      'Lista tarefas na ordem do quadro: A fazer, Em andamento e Concluído, cada coluna na sua ordem. ' +
      'Filtra por projeto, documento de origem, colunas e palavras do título. Cada tarefa traz o documento de onde nasceu, ' +
      'com documentTitle null e available false quando ele está na lixeira.',
    inputSchema: ListTasksInput,
    annotations: readOnlyAnnotations,
    async handler(input) {
      const page = await listTasks(reading, input);
      const text = fitItems(page.items, (shown) =>
        compactJson({ tasks: shown.map(taskView), nextCursor: page.nextCursor(shown.length) }),
      );
      return textResult(text);
    },
  });
