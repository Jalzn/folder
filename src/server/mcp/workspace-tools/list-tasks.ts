import type { TaskListing } from '@tinyfold/board/contracts';
import { ListTasksForAgentInput as ListTasksInput } from '@tinyfold/board/contracts';
import type { Column } from '@tinyfold/board/domain';
import { isOverdue } from '@tinyfold/board/domain';
import type { CivilDate } from '@tinyfold/core/domain';
import { keysetJsonResult } from './paged-result.js';
import type { AgentQueries } from './queries.js';
import { defineTool, readOnlyAnnotations } from './types.js';

const taskView = (today: CivilDate) => (task: TaskListing) => ({
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

export const listTasksTool = (queries: AgentQueries) =>
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
      const page = await queries.listTasks(input);
      const view = taskView(page.today);
      const columns = page.columns.map(columnView);
      return keysetJsonResult(page.items, (shown) => ({
        columns,
        tasks: shown.map(view),
        nextCursor: page.nextCursor(shown.length),
      }));
    },
  });
