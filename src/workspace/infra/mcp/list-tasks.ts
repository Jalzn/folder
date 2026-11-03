import { listTasks } from '../../application/reading/list-tasks.js';
import type { ReadingContext } from '../../application/reading/ports.js';
import type { TaskListing } from '../../application/reading/read-models.js';
import { ListTasksInput } from '../../application/reading/schemas.js';
import type { Column } from '../../domain/columns.js';
import { isOverdue } from '../../domain/task-dates.js';
import { compactJson, fitItems, textResult } from './format.js';
import { defineTool, readOnlyAnnotations } from './types.js';

const taskView = (today: string) => (task: TaskListing) => ({
  id: task.id,
  title: task.title,
  column: task.column,
  dueOn: task.dueOn,
  overdue: isOverdue(task.dueOn, today, task.column.isDone),
  labels: task.labels,
  checklist: task.checklist,
  completedAt: task.completedAt,
  projectId: task.projectId,
  projectName: task.projectName,
  projectArchived: task.projectArchived,
  updatedAt: task.updatedAt,
  source: task.source,
});

const columnView = (column: Column) => ({ id: column.id, name: column.name, isDone: column.isDone });

export const listTasksTool = (reading: ReadingContext) =>
  defineTool({
    name: 'list_tasks',
    title: 'Listar tarefas',
    description:
      'Lista tarefas na ordem do quadro: as colunas configuradas no Tinyfold, da esquerda para a direita, e cada ' +
      'coluna na sua ordem. O resultado traz a lista das colunas em columns, com isDone na de conclusão. Filtra por ' +
      'projeto, documento de origem, palavras do título e pelos nomes de colunas e etiquetas como aparecem no ' +
      'Tinyfold: vale qualquer uma das colunas, e a tarefa precisa ter todas as etiquetas. Cada tarefa traz a ' +
      'coluna, o prazo (dueOn), overdue, que diz se o prazo passou no fuso do dono fora da coluna de conclusão, as ' +
      'etiquetas, o progresso do checklist, completedAt e o documento de onde nasceu, com available false quando ' +
      'ele não está disponível: documentTitle null se ele está na lixeira, e documentId null, com o título que ele ' +
      'tinha, se foi excluído de vez. Passe o nextCursor para ver a próxima página; se o quadro mudar entre as ' +
      'páginas, liste de novo sem cursor.',
    inputSchema: ListTasksInput,
    annotations: readOnlyAnnotations,
    async handler(input) {
      const page = await listTasks(reading, input);
      const view = taskView(page.today);
      const columns = page.columns.map(columnView);
      const text = fitItems(page.items, (shown) =>
        compactJson({ columns, tasks: shown.map(view), nextCursor: page.nextCursor(shown.length) }),
      );
      return textResult(text);
    },
  });
